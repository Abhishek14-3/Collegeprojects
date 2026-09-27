"use client";

import React, { useState, useMemo } from "react";
import {
  X,
  Receipt,
  Check,
  Users,
  Percent,
  AlertCircle,
  ExternalLink,
  DollarSign,
  Utensils,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { calculateItemizedBillSplit } from "@/lib/expenses/engine";
import { ExtractedReceiptData } from "@/app/api/ocr/scan/route";

export interface TripMemberInfo {
  id: string;
  name: string;
  avatarUrl?: string | null;
  role?: string;
}

export interface ItemizedClaimModalProps {
  isOpen: boolean;
  onClose: () => void;
  tripId: string;
  members: TripMemberInfo[];
  receiptData: ExtractedReceiptData;
  onSuccess: () => void;
  onSwitchToChat?: () => void;
}

export function ItemizedClaimModal({
  isOpen,
  onClose,
  tripId,
  members,
  receiptData,
  onSuccess,
  onSwitchToChat,
}: ItemizedClaimModalProps) {
  if (!isOpen) return null;

  // Form states initialized with extracted OCR data
  const [merchant, setMerchant] = useState(receiptData.merchant || "Group Dining & Bill");
  const [category, setCategory] = useState(receiptData.suggestedCategory || "FOOD");
  const [payerId, setPayerId] = useState(members[0]?.id || "");
  const [taxMinorInput, setTaxMinorInput] = useState(
    (receiptData.taxMinor / 100).toString()
  );

  // Line item participants state: map item.id -> array of memberIds
  const [itemClaimants, setItemClaimants] = useState<Record<string, string[]>>(() => {
    const initial: Record<string, string[]> = {};
    for (const item of receiptData.items) {
      // Default: all members assigned to each item unless specified
      initial[item.id] = members.map((m) => m.id);
    }
    return initial;
  });

  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Toggle member claim on an item
  function toggleClaimant(itemId: string, memberId: string) {
    setItemClaimants((prev) => {
      const current = prev[itemId] || [];
      const exists = current.includes(memberId);
      const updated = exists ? current.filter((id) => id !== memberId) : [...current, memberId];
      return { ...prev, [itemId]: updated };
    });
  }

  // Assign all members to an item
  function selectAll(itemId: string) {
    setItemClaimants((prev) => ({
      ...prev,
      [itemId]: members.map((m) => m.id),
    }));
  }

  // Clear all claimants on an item
  function clearAll(itemId: string) {
    setItemClaimants((prev) => ({
      ...prev,
      [itemId]: [],
    }));
  }

  // Maximum allowed tax limit (Statutory 28% GST ceiling based on items subtotal)
  const maxTaxLimitMinor = useMemo(() => {
    const subtotal = receiptData.items.reduce((sum, it) => sum + BigInt(it.amountMinor), BigInt(0));
    return (subtotal * BigInt(28)) / BigInt(100);
  }, [receiptData.items]);

  const maxTaxLimitRs = useMemo(() => {
    return Number(maxTaxLimitMinor) / 100;
  }, [maxTaxLimitMinor]);

  // Parse tax input safely with strict limit enforcement
  const parsedTaxMinor = useMemo(() => {
    const val = parseFloat(taxMinorInput);
    if (isNaN(val) || val <= 0) return BigInt(0);
    const parsed = BigInt(Math.round(val * 100));
    return parsed > maxTaxLimitMinor ? maxTaxLimitMinor : parsed;
  }, [taxMinorInput, maxTaxLimitMinor]);

  // Real-time calculation using deterministic engine
  const calculationResult = useMemo(() => {
    const engineItems = receiptData.items.map((it) => ({
      name: it.name,
      amountMinor: BigInt(it.amountMinor),
      participantIds: itemClaimants[it.id] || [],
    }));

    return calculateItemizedBillSplit(
      engineItems,
      parsedTaxMinor,
      members.map((m) => ({ id: m.id, name: m.name }))
    );
  }, [receiptData.items, itemClaimants, parsedTaxMinor, members]);

  // Unclaimed items check
  const unclaimedItemsCount = useMemo(() => {
    return receiptData.items.filter((it) => (itemClaimants[it.id]?.length || 0) === 0).length;
  }, [receiptData.items, itemClaimants]);

  // Handle Submission
  async function handleSubmit() {
    try {
      setSaving(true);
      setErrorMsg(null);

      if (!payerId) {
        setErrorMsg("Please select who paid this bill upfront.");
        return;
      }

      if (unclaimedItemsCount > 0) {
        setErrorMsg(
          `${unclaimedItemsCount} item(s) have no one assigned. Please assign all dishes before saving.`
        );
        return;
      }

      if (parseFloat(taxMinorInput) > maxTaxLimitRs) {
        setErrorMsg(
          `Tax amount exceeds the statutory GST limit of 28% (₹${maxTaxLimitRs.toFixed(2)}). Please adjust or remove tax.`
        );
        return;
      }

      const totalBillMinor = calculationResult.totalBillMinor;

      // Prepare custom participants share list
      const participants = members.map((m) => {
        const share = calculationResult.memberShares.find((s) => s.memberId === m.id);
        const amount = share?.totalShareMinor || BigInt(0);
        return {
          memberId: m.id,
          customAmountMinor: amount.toString(),
        };
      });

      const res = await fetch(`/api/trips/${tripId}/expenses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          payerId,
          title: merchant,
          category,
          amountMinor: totalBillMinor.toString(),
          currency: receiptData.currency || "INR",
          splitMethod: "CUSTOM",
          participants,
          receiptUrl: receiptData.receiptUrl,
          itemizedDetails: {
            merchant,
            subtotalMinor: Number(calculationResult.subtotalMinor),
            taxMinor: Number(parsedTaxMinor),
            items: receiptData.items.map((it) => {
              const claimantIds = itemClaimants[it.id] || [];
              const claimantNames = claimantIds.map((cid) => {
                const mem = members.find((m) => m.id === cid);
                return mem?.name || cid;
              });
              return {
                name: it.name,
                quantity: it.quantity,
                amountMinor: it.amountMinor,
                participantIds: claimantIds,
                participantNames: claimantNames,
              };
            }),
          },
        }),
      });

      const json = await res.json();
      if (!json.success) {
        setErrorMsg(json.error || "Failed to record itemized expense.");
        return;
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || "An unexpected error occurred while saving.");
    } finally {
      setSaving(false);
    }
  }

  const grandTotalRs = Number(calculationResult.totalBillMinor) / 100;
  const foodSubtotalRs = Number(calculationResult.subtotalMinor) / 100;
  const taxRs = Number(calculationResult.taxAndServiceMinor) / 100;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-[#FFF9F0] border border-[#D8C9B5] w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] my-auto animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-[#172A3A] text-[#FFF9F0] px-6 py-4 flex items-center justify-between border-b border-[#0f1d28]">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#FFF9F0]/15 rounded-xl">
              <Receipt className="w-5 h-5 text-[#D49A55]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-serif text-lg font-bold text-[#FFF9F0]">Itemized Bill Claim & Split</h3>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-[#C85C3A] text-white">
                  OCR Verified
                </span>
              </div>
              <p className="text-xs text-[#FFF9F0]/80">
                Claim who ate or used each item. Tax & tips are proportionally split with zero paise drift.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-[#FFF9F0]/70 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {errorMsg && (
            <div className="p-3.5 bg-[#C85C3A]/10 border border-[#C85C3A]/30 rounded-xl flex items-center gap-2 text-[#C85C3A] text-xs font-semibold">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Switch to AI Chat Banner */}
          {onSwitchToChat && (
            <div className="flex items-center justify-between p-3.5 bg-gradient-to-r from-[#163F38]/10 via-[#C9A35B]/15 to-[#163F38]/10 border border-[#163F38]/20 rounded-2xl">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-[#163F38] text-white flex items-center justify-center shrink-0">
                  <Sparkles className="w-4 h-4 text-[#C9A35B]" />
                </div>
                <div>
                  <p className="text-xs font-bold text-[#163F38]">Prefer explaining this bill in everyday words?</p>
                  <p className="text-[11px] text-[#7A6C58]">Use AI Split Chat to explain who ordered what instead of checking individual boxes</p>
                </div>
              </div>
              <button
                type="button"
                onClick={onSwitchToChat}
                className="bg-[#163F38] hover:bg-[#1f534a] text-white px-3.5 py-1.5 rounded-full text-xs font-bold transition-all shadow-xs shrink-0 flex items-center gap-1.5 hover:scale-105 cursor-pointer"
              >
                <span>Split with AI Chat</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Top Metadata Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-[#EAE1D3] p-4 rounded-xl border border-[#D8C9B5]">
            <div>
              <label className="text-[10px] font-bold text-[#746D65] uppercase tracking-wider block mb-1">
                Merchant / Description
              </label>
              <input
                type="text"
                value={merchant}
                onChange={(e) => setMerchant(e.target.value)}
                className="w-full bg-[#FFF9F0] border border-[#D8C9B5] rounded-lg px-3 py-1.5 text-xs font-semibold text-[#172A3A] focus:outline-none focus:border-[#172A3A]"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-[#746D65] uppercase tracking-wider block mb-1">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
                className="w-full bg-[#FFF9F0] border border-[#D8C9B5] rounded-lg px-3 py-1.5 text-xs font-semibold text-[#172A3A] focus:outline-none focus:border-[#172A3A]"
              >
                <option value="FOOD">Food & Dining</option>
                <option value="TRANSPORT">Transport</option>
                <option value="ACTIVITIES">Activities</option>
                <option value="STAY">Accommodations</option>
                <option value="SHOPPING">Shopping</option>
                <option value="OTHER">Other</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] font-bold text-[#746D65] uppercase tracking-wider block mb-1">
                Who Paid The Bill?
              </label>
              <select
                value={payerId}
                onChange={(e) => setPayerId(e.target.value)}
                className="w-full bg-[#FFF9F0] border border-[#D8C9B5] rounded-lg px-3 py-1.5 text-xs font-bold text-[#172A3A] focus:outline-none focus:border-[#172A3A]"
              >
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Receipt Image Preview Banner if available */}
          {receiptData.receiptUrl && (
            <div className="flex items-center justify-between p-3 bg-[#EAE1D3] border border-[#D8C9B5] rounded-xl">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-[#172A3A]">📎 Storage Receipt Photo:</span>
                <span className="text-xs text-[#746D65] truncate max-w-xs">{receiptData.fileName}</span>
              </div>
              <a
                href={receiptData.receiptUrl}
                target="_blank"
                rel="noreferrer"
                className="text-xs font-bold text-[#172A3A] hover:text-[#C85C3A] flex items-center gap-1"
              >
                <span>View Receipt Image</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          )}

          {/* Line Items Claiming Table */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-serif text-base font-bold text-[#172A3A] flex items-center gap-2">
                <span>Extracted Line Items ({receiptData.items.length})</span>
                {unclaimedItemsCount > 0 && (
                  <span className="text-xs font-semibold text-[#C85C3A] bg-[#C85C3A]/10 px-2 py-0.5 rounded-full">
                    {unclaimedItemsCount} unclaimed
                  </span>
                )}
              </h4>
              <span className="text-xs text-[#746D65]">Click traveler names to tag consumers</span>
            </div>

            <div className="space-y-2.5">
              {receiptData.items.map((item) => {
                const claimants = itemClaimants[item.id] || [];
                const itemRs = item.amountMinor / 100;
                const perHeadRs = claimants.length > 0 ? (itemRs / claimants.length).toFixed(2) : "0.00";

                return (
                  <div
                    key={item.id}
                    className={`p-3.5 rounded-xl border transition-all ${
                      claimants.length === 0
                        ? "bg-[#FDF0EB] border-[#E9BFB2]"
                        : "bg-[#FFF9F0] border-[#D8C9B5] hover:border-[#172A3A]/40"
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      {/* Item Info */}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold text-[#172A3A]">{item.name}</span>
                          {(item.quantity > 1 || item.unit || item.rateMinor) && (
                            <span className="text-[10px] font-bold text-[#746D65] bg-[#EAE1D3] px-2 py-0.5 rounded border border-[#D8C9B5]/50">
                              {item.quantity} {item.unit || "Qty"}
                              {item.rateMinor ? ` @ ₹${(item.rateMinor / 100).toLocaleString("en-IN", { minimumFractionDigits: 2 })}` : ""}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="font-serif text-sm font-bold text-[#172A3A]">
                            ₹{itemRs.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </span>
                          {claimants.length > 0 && (
                            <span className="text-[11px] text-[#746D65]">
                              (₹{perHeadRs} each across {claimants.length})
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Member Tagging Chips */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {members.map((m) => {
                          const isClaimed = claimants.includes(m.id);
                          return (
                            <button
                              key={m.id}
                              type="button"
                              onClick={() => toggleClaimant(item.id, m.id)}
                              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-all ${
                                isClaimed
                                  ? "bg-[#172A3A] text-[#FFF9F0] shadow-xs"
                                  : "bg-[#EAE1D3] text-[#746D65] hover:bg-[#D8C9B5]"
                              }`}
                            >
                              <div
                                className={`w-2 h-2 rounded-full ${
                                  isClaimed ? "bg-[#D49A55]" : "bg-[#968E85]"
                                }`}
                              />
                              <span>{m.name.split(" ")[0]}</span>
                            </button>
                          );
                        })}

                        {/* Quick Selection Buttons */}
                        <div className="flex items-center gap-1 pl-1 border-l border-[#D8C9B5] ml-1">
                          <button
                            type="button"
                            onClick={() => selectAll(item.id)}
                            className="text-[10px] text-[#172A3A] hover:underline font-bold px-1"
                          >
                            All
                          </button>
                          <span className="text-[10px] text-[#D8C9B5]">•</span>
                          <button
                            type="button"
                            onClick={() => clearAll(item.id)}
                            className="text-[10px] text-[#C85C3A] hover:underline font-bold px-1"
                          >
                            Clear
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Tax & GST Proportional Configuration with Limit & Remove Feature */}
          <div className="bg-[#EAE1D3] border border-[#D8C9B5] p-4 rounded-xl space-y-2.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-[#172A3A] flex items-center gap-1.5">
                    <Percent className="w-3.5 h-3.5 text-[#C85C3A]" />
                    <span>GST, VAT & Service Charge</span>
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                    Max 28% Cap
                  </span>
                </div>
                <p className="text-[11px] text-[#746D65] mt-0.5">
                  Proportionally distributed across travelers based on itemized consumption.
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {/* Remove Tax / Zero GST Option */}
                <button
                  type="button"
                  onClick={() => setTaxMinorInput("0")}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all border ${
                    parsedTaxMinor === BigInt(0)
                      ? "bg-[#172A3A] text-white border-[#172A3A] shadow-xs"
                      : "bg-[#FFF9F0] text-[#746D65] border-[#D8C9B5] hover:bg-[#D8C9B5]"
                  }`}
                  title="Remove tax from this bill"
                >
                  Remove Tax (₹0)
                </button>

                {/* Reset to OCR Extracted Tax Option */}
                {receiptData.taxMinor > 0 && (
                  <button
                    type="button"
                    onClick={() => setTaxMinorInput((receiptData.taxMinor / 100).toString())}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all border ${
                      Math.abs(Number(taxMinorInput) - receiptData.taxMinor / 100) < 0.01
                        ? "bg-[#172A3A] text-white border-[#172A3A] shadow-xs"
                        : "bg-[#FFF9F0] text-[#746D65] border-[#D8C9B5] hover:bg-[#D8C9B5]"
                    }`}
                    title="Use OCR verified tax"
                  >
                    OCR Tax (₹{(receiptData.taxMinor / 100).toFixed(2)})
                  </button>
                )}

                {/* Input with Hard Cap Limit */}
                <div className="flex items-center gap-1 pl-1">
                  <span className="text-xs font-bold text-[#172A3A]">₹</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max={maxTaxLimitRs}
                    value={taxMinorInput}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      if (!isNaN(val) && val > maxTaxLimitRs) {
                        setTaxMinorInput(maxTaxLimitRs.toString());
                      } else {
                        setTaxMinorInput(e.target.value);
                      }
                    }}
                    className="w-24 bg-[#FFF9F0] border border-[#D8C9B5] rounded-lg px-2.5 py-1 text-xs font-bold text-[#172A3A] text-right focus:outline-none focus:border-[#172A3A]"
                  />
                </div>
              </div>
            </div>

            {/* Limit Details & Status Bar */}
            <div className="flex items-center justify-between text-[11px] text-[#746D65] pt-1.5 border-t border-[#D8C9B5]/60 flex-wrap gap-1">
              <span>
                Statutory GST Cap: <strong>28% of items</strong> (Limit: ₹{maxTaxLimitRs.toFixed(2)})
              </span>
              {parsedTaxMinor === BigInt(0) ? (
                <span className="text-emerald-700 font-bold text-[10px]">
                  ✓ Tax removed • Splitting purely on consumed items
                </span>
              ) : parseFloat(taxMinorInput) >= maxTaxLimitRs ? (
                <span className="text-rose-700 font-bold text-[10px]">
                  ⚠️ Clamped to statutory 28% limit
                </span>
              ) : (
                <span className="text-[#172A3A] font-semibold text-[10px]">
                  Effective Rate: {foodSubtotalRs > 0 ? ((Number(parsedTaxMinor) / (foodSubtotalRs * 100)) * 100).toFixed(1) : 0}%
                </span>
              )}
            </div>
          </div>

          {/* Live Calculated Member Shares */}
          <div>
            <h4 className="font-serif text-base font-bold text-[#172A3A] mb-2 flex items-center justify-between">
              <span>Fair Share Ledger Summary</span>
              <span className="text-xs font-normal text-[#746D65]">
                Absorbs paise remainders with exact precision
              </span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {calculationResult.memberShares.map((ms) => {
                const mem = members.find((m) => m.id === ms.memberId);
                const subRs = Number(ms.itemsSubtotalMinor) / 100;
                const taxPartRs = Number(ms.taxAndServiceShareMinor) / 100;
                const totalRs = Number(ms.totalShareMinor) / 100;

                return (
                  <div
                    key={ms.memberId}
                    className="bg-[#FFF9F0] border border-[#D8C9B5] p-3.5 rounded-xl flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-bold text-[#172A3A]">{mem?.name}</span>
                        <span className="font-serif text-sm font-bold text-[#172A3A]">
                          ₹{totalRs.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </span>
                      </div>

                      <div className="text-[11px] text-[#746D65] space-y-0.5">
                        <div className="flex justify-between">
                          <span>Items:</span>
                          <span>₹{subRs.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Proportional Tax:</span>
                          <span>₹{taxPartRs.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-2 pt-2 border-t border-[#EAE1D3] text-[10px] text-[#746D65] truncate">
                      {ms.consumedItems.length > 0
                        ? ms.consumedItems.join(", ")
                        : "No dishes claimed"}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="bg-[#EAE1D3] px-6 py-4 border-t border-[#D8C9B5] flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-4 text-xs font-semibold text-[#172A3A]">
            <div>
              <span className="text-[#746D65]">Subtotal:</span> ₹{foodSubtotalRs.toFixed(2)}
            </div>
            <div>
              <span className="text-[#746D65]">Tax:</span> ₹{taxRs.toFixed(2)}
            </div>
            <div className="font-serif text-sm font-bold text-[#172A3A]">
              <span className="text-[#746D65] font-sans text-xs font-normal">Grand Total: </span>
              ₹{grandTotalRs.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="flex-1 sm:flex-none px-4 py-2 rounded-lg border border-[#D8C9B5] text-xs font-bold text-[#746D65] hover:bg-[#D8C9B5] transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={saving || unclaimedItemsCount > 0}
              className="flex-1 sm:flex-none px-6 py-2 rounded-lg bg-[#172A3A] hover:bg-[#233d52] text-[#FFF9F0] text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {saving ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Recording Expense...</span>
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Confirm & Save Itemized Split</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
