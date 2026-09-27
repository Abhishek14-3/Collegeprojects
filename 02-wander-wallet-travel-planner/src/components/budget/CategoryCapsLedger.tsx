"use client";

import React, { useState } from "react";
import { ShieldAlert, ShieldCheck, Settings, Check, AlertTriangle, Coins } from "lucide-react";
import { CategorySpendSummary, CapCategory } from "@/lib/budget/caps";

interface CategoryCapsLedgerProps {
  tripId: string;
  currency: string;
  totalBudgetMinor: bigint;
  totalSpendMinor: bigint;
  categories: CategorySpendSummary[];
  alertThresholdPct: number;
  onUpdateCaps?: (newCaps: Record<string, bigint>, threshold: number) => Promise<void>;
}

export function CategoryCapsLedger({
  tripId,
  currency,
  totalBudgetMinor,
  totalSpendMinor,
  categories,
  alertThresholdPct,
  onUpdateCaps,
}: CategoryCapsLedgerProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editedThreshold, setEditedThreshold] = useState<number>(alertThresholdPct || 80);
  const [editedCaps, setEditedCaps] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    for (const c of categories) {
      init[c.category] = (Number(c.capMinor) / 100).toString();
    }
    return init;
  });

  const totalCapAssignedMinor = Object.values(editedCaps).reduce(
    (sum, val) => sum + BigInt(Math.round((parseFloat(val) || 0) * 100)),
    BigInt(0)
  );

  async function handleSave() {
    if (!onUpdateCaps) return;
    try {
      setIsSaving(true);
      const capsPayload: Record<string, bigint> = {};
      for (const [k, v] of Object.entries(editedCaps)) {
        capsPayload[k] = BigInt(Math.round((parseFloat(v) || 0) * 100));
      }
      await onUpdateCaps(capsPayload, editedThreshold);
      setIsEditing(false);
    } catch (err) {
      console.error("Failed to save category caps:", err);
    } finally {
      setIsSaving(false);
    }
  }

  const symbol = currency === "USD" ? "$" : currency === "EUR" ? "€" : currency === "GBP" ? "£" : "₹";

  return (
    <div className="bg-[#FFF9F0] border border-[#D8C9B5] rounded-3xl p-6 sm:p-8 shadow-sm space-y-6 text-[#172A3A]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#D8C9B5]/70">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-[#172A3A] text-[#FFF9F0]">
              Mandatory Guardrails
            </span>
            <span className="text-xs font-bold text-[#746D65]">
              Alert Threshold: {alertThresholdPct}%
            </span>
          </div>
          <h3 className="font-serif text-2xl font-bold text-[#172A3A] mt-1">
            Category Caps & Threshold Ledger
          </h3>
          <p className="text-xs text-[#746D65] mt-0.5">
            Individual spending limits for Food, Stay, Transport, and Activities on top of the overall trip total.
          </p>
        </div>

        {onUpdateCaps && (
          <div>
            {isEditing ? (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-3 py-1.5 rounded-full text-xs font-semibold bg-[#EAE1D3] text-[#746D65] hover:bg-[#D8C9B5] transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={isSaving}
                  className="px-4 py-1.5 rounded-full text-xs font-bold bg-[#172A3A] text-[#FFF9F0] hover:bg-[#233d52] shadow-sm transition flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{isSaving ? "Saving..." : "Save Caps"}</span>
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="px-3.5 py-1.5 rounded-full text-xs font-bold border border-[#D8C9B5] hover:border-[#172A3A] text-[#172A3A] bg-white transition flex items-center gap-1.5 shadow-2xs"
              >
                <Settings className="w-3.5 h-3.5 text-[#C85C3A]" />
                <span>Configure Caps & Thresholds</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Threshold Configurator Mode */}
      {isEditing && (
        <div className="p-4 rounded-2xl bg-[#F5EEE3] border border-[#D8C9B5] space-y-3 animate-in fade-in duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-[#172A3A] block">
                Breach Warning Threshold
              </span>
              <p className="text-[11px] text-[#746D65]">
                Raises an amber warning banner before a full 100% budget cap overshoot.
              </p>
            </div>
            <div className="flex items-center gap-2">
              {[70, 80, 90, 100].map((th) => (
                <button
                  key={th}
                  type="button"
                  onClick={() => setEditedThreshold(th)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                    editedThreshold === th
                      ? "bg-[#172A3A] text-white shadow-xs"
                      : "bg-white border border-[#D8C9B5] text-[#746D65] hover:border-[#172A3A]"
                  }`}
                >
                  {th}%
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 4 Core Category Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {categories.map((cat) => {
          const isBreach = cat.status === "BREACH";
          const isWarn = cat.status === "WARNING";

          return (
            <div
              key={cat.category}
              className={`rounded-2xl p-5 border transition-all duration-200 shadow-2xs ${
                isBreach
                  ? "bg-[#FFF5F5] border-[#E8A5A5]"
                  : isWarn
                  ? "bg-[#FFFBF0] border-[#F2D69B]"
                  : "bg-white border-[#D8C9B5]/80"
              }`}
            >
              <div className="flex items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-base font-bold text-[#172A3A]">{cat.label}</span>
                  {isBreach ? (
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-[#C81E1E] text-white">
                      BREACHED
                    </span>
                  ) : isWarn ? (
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-[#D97706] text-white">
                      NEAR CAP
                    </span>
                  ) : (
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                      ON TRACK
                    </span>
                  )}
                </div>

                {isEditing ? (
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-bold text-[#746D65]">{symbol}</span>
                    <input
                      type="number"
                      step="1"
                      value={editedCaps[cat.category] || ""}
                      onChange={(e) =>
                        setEditedCaps({ ...editedCaps, [cat.category]: e.target.value })
                      }
                      className="w-24 px-2 py-1 text-xs font-mono font-bold rounded-lg border border-[#D8C9B5] bg-white text-right focus:outline-none focus:ring-1 focus:ring-[#172A3A]"
                    />
                  </div>
                ) : (
                  <span className="font-serif font-bold text-sm text-[#172A3A]">
                    Cap: {cat.capFormatted}
                  </span>
                )}
              </div>

              {/* Progress Bar */}
              <div className="space-y-1.5 mb-3">
                <div className="w-full bg-[#EAE1D3] h-2.5 rounded-full overflow-hidden shadow-inner">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      isBreach
                        ? "bg-[#C81E1E]"
                        : isWarn
                        ? "bg-[#D97706]"
                        : "bg-[#172A3A]"
                    }`}
                    style={{ width: `${Math.min(100, cat.utilizationPct)}%` }}
                  />
                </div>

                <div className="flex justify-between text-[11px] font-mono">
                  <span className="text-[#746D65]">
                    Spend: <strong className="text-[#172A3A]">{cat.spentFormatted}</strong>
                  </span>
                  <span
                    className={`font-bold ${
                      isBreach ? "text-[#C81E1E]" : isWarn ? "text-[#D97706]" : "text-[#746D65]"
                    }`}
                  >
                    {cat.utilizationPct}%
                  </span>
                </div>
              </div>

              {/* Status Footer */}
              <div className="pt-2 border-t border-[#D8C9B5]/50 flex items-center justify-between text-xs">
                {isBreach ? (
                  <div className="flex items-center gap-1.5 text-[#C81E1E] font-semibold text-[11px]">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    <span>Overshoot by +{cat.overshootFormatted}</span>
                  </div>
                ) : (
                  <span className="text-[#746D65] text-[11px]">
                    Headroom: <strong className="text-emerald-700">{cat.remainingFormatted}</strong>
                  </span>
                )}

                <span className="text-[10px] text-[#746D65] uppercase font-mono">
                  Fx Normalized
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
export default CategoryCapsLedger;
