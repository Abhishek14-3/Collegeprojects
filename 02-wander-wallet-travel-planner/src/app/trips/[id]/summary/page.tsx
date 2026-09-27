"use client";

import { useEffect, useState, use, useMemo } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Printer,
  Download,
  Sparkles,
  MapPin,
  Calendar,
  Users,
  DollarSign,
  CheckCircle,
  Receipt,
  User,
  Share2,
  Copy,
  Check,
  CreditCard,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";
import { GeneratedItineraryDay } from "@/lib/itinerary/engine";

export default function TripSummaryJournalPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const tripId = resolvedParams.id;

  const [trip, setTrip] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [itineraryDays, setItineraryDays] = useState<GeneratedItineraryDay[]>([]);
  const [settlementPlan, setSettlementPlan] = useState<any>(null);
  const [selectedMemberId, setSelectedMemberId] = useState<string>("ALL");
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSummaryData();
  }, [tripId]);

  async function loadSummaryData() {
    try {
      setLoading(true);
      const [tripRes, itinRes, settleRes] = await Promise.all([
        fetch(`/api/trips/${tripId}`),
        fetch(`/api/trips/${tripId}/itinerary`),
        fetch(`/api/trips/${tripId}/settlement`),
      ]);

      const tripData = await tripRes.json();
      const itinData = await itinRes.json();
      const settleData = await settleRes.json();

      if (tripData.success) {
        setTrip(tripData.trip);
        setMembers(tripData.members || []);
        setExpenses(tripData.expenses || []);
      }
      if (itinData.success && itinData.itinerary?.days) {
        setItineraryDays(itinData.itinerary.days);
      }
      if (settleData.success && settleData.settlement) {
        setSettlementPlan(settleData.settlement);
      }
    } catch (err) {
      console.error("Error loading summary:", err);
    } finally {
      setLoading(false);
    }
  }

  function handlePrintPDF() {
    window.print();
  }

  // Find currently selected member details
  const activeMember = useMemo(() => {
    if (selectedMemberId === "ALL") return null;
    return members.find((m) => m.id === selectedMemberId);
  }, [selectedMemberId, members]);

  // Find balance and settlement info for active member
  const activeMemberBalance = useMemo(() => {
    if (!activeMember || !settlementPlan?.memberBalances) return null;
    return settlementPlan.memberBalances.find((b: any) => b.memberId === activeMember.id);
  }, [activeMember, settlementPlan]);

  // Filter expenses that this specific member participated in
  const memberExpenses = useMemo(() => {
    if (!activeMember) return [];
    return expenses.filter((e) => {
      // Participated if explicitly in participants array or if equal split across all
      if (e.participants && e.participants.length > 0) {
        return e.participants.some((p: any) => p.memberId === activeMember.id);
      }
      return true; // default all members
    }).map((e) => {
      let memberShareRs = 0;
      let splitDescription = "Group Equal Split";

      if (e.participants && e.participants.length > 0) {
        const p = e.participants.find((part: any) => part.memberId === activeMember.id);
        if (p) {
          memberShareRs = Number(p.shareAmountMinor) / 100;
          if (e.participants.length === 1) {
            splitDescription = "Individual (100%)";
          } else if (e.participants.length < members.length) {
            splitDescription = `Subset Split (${e.participants.length} members)`;
          } else {
            splitDescription = `Equal Split (${members.length} members)`;
          }
        }
      } else {
        const totalExpRs = Number(e.convertedAmountMinor || e.amountMinor) / 100;
        memberShareRs = members.length > 0 ? totalExpRs / members.length : totalExpRs;
        splitDescription = `Equal Split (${members.length} members)`;
      }

      const totalBillRs = Number(e.convertedAmountMinor || e.amountMinor) / 100;
      const isPayer = e.payerId === activeMember.id;

      return {
        id: e.id,
        title: e.title,
        category: e.category,
        date: e.date ? new Date(e.date).toISOString().split("T")[0] : "Trip Date",
        totalBillRs,
        memberShareRs,
        splitDescription,
        isPayer,
      };
    });
  }, [activeMember, expenses, members]);

  // Transfers involving the active member
  const memberTransfers = useMemo(() => {
    if (!activeMember || !settlementPlan?.transactions) return [];
    return settlementPlan.transactions.filter(
      (t: any) => t.fromMemberId === activeMember.id || t.toMemberId === activeMember.id
    );
  }, [activeMember, settlementPlan]);

  // Shareable Summary Text for WhatsApp / Telegram
  function handleCopyShareText() {
    let text = "";
    if (selectedMemberId === "ALL") {
      const totalBudgetRs = Number(trip?.groupBudgetMinor || 0) / 100;
      const totalSpendRs = expenses.reduce((sum, e) => sum + Number(e.convertedAmountMinor || 0), 0) / 100;
      text = `✈️ *Wander Wallet — Full Trip Audit Report*\n` +
        `📍 *Trip:* ${trip?.title} (${trip?.destination})\n` +
        `📅 *Dates:* ${trip?.startDate} to ${trip?.endDate} (${trip?.numberOfDays} Days)\n` +
        `👥 *Travelers:* ${members.length} Members\n` +
        `💰 *Total Budget:* ₹${totalBudgetRs.toLocaleString("en-IN")}\n` +
        `💸 *Total Group Spend:* ₹${totalSpendRs.toLocaleString("en-IN")}\n` +
        `🎉 *Savings Remaining:* ₹${Math.max(0, totalBudgetRs - totalSpendRs).toLocaleString("en-IN")}\n\n` +
        `*Member Balances Summary:*\n` +
        (settlementPlan?.memberBalances || []).map((b: any) => {
          const netRs = Number(b.netBalanceMinor) / 100;
          return `• ${b.name}: Paid ₹${(Number(b.paidMinor) / 100).toLocaleString("en-IN")} | Share ₹${(Number(b.shareMinor) / 100).toLocaleString("en-IN")} | ${netRs >= 0 ? `Receives ₹${netRs.toLocaleString("en-IN")}` : `Owes ₹${(-netRs).toLocaleString("en-IN")}`}`;
        }).join("\n") +
        `\n\nGenerated by Wander Wallet Verified Travel Ledger`;
    } else if (activeMember && activeMemberBalance) {
      const paidRs = Number(activeMemberBalance.paidMinor) / 100;
      const shareRs = Number(activeMemberBalance.shareMinor) / 100;
      const netRs = Number(activeMemberBalance.netBalanceMinor) / 100;
      text = `🧾 *Wander Wallet — Individual Expense Statement*\n` +
        `👤 *Traveler:* ${activeMember.name} (${activeMember.role})\n` +
        `📍 *Trip:* ${trip?.title} (${trip?.destination})\n` +
        `💰 *Paid Upfront:* ₹${paidRs.toLocaleString("en-IN")}\n` +
        `🍽️ *Fair Consumption Share:* ₹${shareRs.toLocaleString("en-IN")}\n` +
        `⚖️ *Net Position:* ${netRs >= 0 ? `To Receive ₹${netRs.toLocaleString("en-IN")} refund` : `Needs to Pay ₹${(-netRs).toLocaleString("en-IN")}`}\n\n` +
        `*Settlement Actions:*\n` +
        (memberTransfers.length > 0
          ? memberTransfers.map((t: any) => {
              const amtRs = Number(t.amountMinor) / 100;
              return t.fromMemberId === activeMember.id
                ? `👉 Pay ₹${amtRs.toLocaleString("en-IN")} to ${t.toMemberName} (UPI)`
                : `👈 Collect ₹${amtRs.toLocaleString("en-IN")} from ${t.fromMemberName}`;
            }).join("\n")
          : `• Fully Settled! Zero pending debts.`) +
        `\n\nGenerated by Wander Wallet Verified Travel Ledger`;
    }

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5EFE3] flex items-center justify-center">
        <div className="text-center font-serif text-xl text-[#163F38] flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-[#C9A35B] animate-spin" />
          <span>Generating Audit Report & Individual PDF Statements...</span>
        </div>
      </div>
    );
  }

  const totalBudgetRs = Number(trip?.groupBudgetMinor || 0) / 100;
  const totalSpendRs = expenses.reduce((sum, e) => sum + Number(e.convertedAmountMinor || 0), 0) / 100;
  const savedAmountRs = Math.max(0, totalBudgetRs - totalSpendRs);

  return (
    <div className="min-h-screen bg-[#F5EFE3] text-[#2C2C2C] py-8 px-4 sm:px-6 lg:px-8 print:p-0 print:bg-white">
      {/* Top Non-Printable Controls & Member Filter Bar */}
      <div className="max-w-4xl mx-auto mb-8 space-y-4 print:hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <Link
            href={`/trips/${tripId}`}
            className="inline-flex items-center gap-2 text-sm font-semibold text-[#163F38] hover:text-[#C95B3D] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Trip Workspace</span>
          </Link>

          <div className="flex items-center gap-3">
            <button
              onClick={handleCopyShareText}
              className="bg-[#FCF9F2] hover:bg-[#EAE2CE] text-[#163F38] border border-[#DCCFBC] px-4 py-2.5 rounded-full text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-[#8A7B68]" />}
              <span>{copied ? "Copied to Clipboard!" : "Copy Shareable Text"}</span>
            </button>

            <button
              onClick={handlePrintPDF}
              className="bg-[#163F38] hover:bg-[#1f534a] text-[#F5EFE3] px-5 py-2.5 rounded-full text-xs font-bold transition-all shadow flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              <span>
                {selectedMemberId === "ALL"
                  ? "Download Full Trip PDF"
                  : `Download ${activeMember?.name}'s Statement PDF`}
              </span>
            </button>
          </div>
        </div>

        {/* Member Selector Filter Pills */}
        <div className="bg-[#FCF9F2] border border-[#E3D9C3] rounded-2xl p-3 flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-[#7A6C58] mr-2 flex items-center gap-1">
            <User className="w-3.5 h-3.5" />
            Report Mode:
          </span>

          <button
            onClick={() => setSelectedMemberId("ALL")}
            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
              selectedMemberId === "ALL"
                ? "bg-[#163F38] text-[#F5EFE3] shadow"
                : "bg-white text-[#5F625B] border border-[#DCCFBC] hover:bg-[#F5EFE3]"
            }`}
          >
            Full Group Audit (All Members)
          </button>

          {members.map((m) => (
            <button
              key={m.id}
              onClick={() => setSelectedMemberId(m.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all ${
                selectedMemberId === m.id
                  ? "bg-[#C95B3D] text-white shadow font-bold"
                  : "bg-white text-[#5F625B] border border-[#DCCFBC] hover:bg-[#F5EFE3]"
              }`}
            >
              <span>{m.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* VIEW A: FULL GROUP COMPREHENSIVE FINANCIAL AUDIT REPORT */}
      {/* ========================================================================= */}
      {selectedMemberId === "ALL" && (
        <article className="max-w-4xl mx-auto bg-[#FDFBF7] border-2 border-[#E0D5BE] rounded-3xl p-8 sm:p-12 shadow-md print:shadow-none print:border-none print:p-4 space-y-8">
          {/* Header & Verified Seal */}
          <div className="relative pb-6 border-b-2 border-[#E6DEC9] flex flex-col sm:flex-row sm:items-start justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#EAE2CE] text-[#6B5E4C] text-[11px] font-bold uppercase tracking-widest mb-3">
                <Sparkles className="w-3.5 h-3.5 text-[#C9A35B]" />
                <span>Wander Wallet Edition • Group Financial Audit</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-serif font-bold text-[#163F38] tracking-tight">
                {trip?.title}
              </h1>
              <p className="text-xs text-[#7A6C58] mt-2 flex flex-wrap items-center gap-2 font-medium">
                <MapPin className="w-4 h-4 text-[#C95B3D]" />
                <span>{trip?.destination}</span>
                <span>•</span>
                <Calendar className="w-4 h-4 text-[#163F38]" />
                <span>{trip?.startDate} to {trip?.endDate}</span>
                <span>•</span>
                <Users className="w-4 h-4 text-[#7A6C58]" />
                <span>{members.length} Travelers</span>
              </p>
            </div>

            {/* Vintage Postal Stamp Seal */}
            <div className="w-28 h-28 border-4 border-dashed border-[#C95B3D]/60 rounded-2xl flex flex-col items-center justify-center p-2 text-center rotate-2 shrink-0 bg-[#F5EFE3]/50">
              <span className="text-[10px] uppercase font-bold tracking-wider text-[#C95B3D]">OFFICIAL AUDIT</span>
              <span className="font-serif font-bold text-xs text-[#163F38] leading-tight mt-0.5">WANDER WALLET</span>
              <span className="text-[9px] text-[#7A6C58] mt-1">{trip?.numberOfDays || 5} DAYS</span>
            </div>
          </div>

          {/* Key Financial Totals */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-5 bg-[#EFE9DC]/60 border border-[#E0D5BE] rounded-2xl">
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-[#8A7B68] block">Group Budget</span>
              <span className="font-serif text-2xl font-bold text-[#163F38]">
                ₹{totalBudgetRs.toLocaleString("en-IN")}
              </span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-[#8A7B68] block">Total Actual Spend</span>
              <span className="font-serif text-2xl font-bold text-[#C95B3D]">
                ₹{totalSpendRs.toLocaleString("en-IN")}
              </span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-[#8A7B68] block">Surplus Savings</span>
              <span className="font-serif text-2xl font-bold text-emerald-800">
                ₹{savedAmountRs.toLocaleString("en-IN")}
              </span>
            </div>
          </div>

          {/* Member Expenditure & Balance Audit Table */}
          <div className="space-y-4">
            <h2 className="font-serif text-2xl font-bold text-[#163F38]">Individual Member Net Balances</h2>
            <div className="overflow-x-auto rounded-2xl border border-[#EDE4D1] bg-white">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#FCF9F2] border-b border-[#EDE4D1] text-[#7A6C58] font-bold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="p-3">Traveler</th>
                    <th className="p-3">Role</th>
                    <th className="p-3 text-right">Paid Upfront</th>
                    <th className="p-3 text-right">Fair Share Owed</th>
                    <th className="p-3 text-right">Net Balance Position</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EDE4D1]/60">
                  {(settlementPlan?.memberBalances || []).map((b: any) => {
                    const paidRs = Number(b.paidMinor) / 100;
                    const shareRs = Number(b.shareMinor) / 100;
                    const netRs = Number(b.netBalanceMinor) / 100;

                    return (
                      <tr key={b.memberId} className="hover:bg-[#FCF9F2]/50 transition-colors">
                        <td className="p-3 font-semibold text-[#163F38] flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-[#163F38] text-[#F5EFE3] flex items-center justify-center text-[10px] font-bold">
                            {b.name[0]}
                          </div>
                          <span>{b.name}</span>
                        </td>
                        <td className="p-3 text-[#7A6C58]">{b.role || "Member"}</td>
                        <td className="p-3 text-right font-serif text-[#163F38]">₹{paidRs.toLocaleString("en-IN")}</td>
                        <td className="p-3 text-right font-serif text-[#5F625B]">₹{shareRs.toLocaleString("en-IN")}</td>
                        <td className="p-3 text-right font-semibold">
                          {netRs > 0 ? (
                            <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                              Receives ₹{netRs.toLocaleString("en-IN")}
                            </span>
                          ) : netRs < 0 ? (
                            <span className="text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                              Owes ₹{(-netRs).toLocaleString("en-IN")}
                            </span>
                          ) : (
                            <span className="text-neutral-500 bg-neutral-100 px-2 py-0.5 rounded-full">
                              Settled (₹0.00)
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Minimal Settlement Direct Transfers Matrix */}
          <div className="space-y-4">
            <h2 className="font-serif text-2xl font-bold text-[#163F38] flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-[#C9A35B]" />
              <span>Greedy Simplified Debt Settlements</span>
            </h2>
            <p className="text-xs text-[#7A6C58]">
              Circular group debts have been calculated with the zero-drift settlement engine into minimal direct payments:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {(settlementPlan?.transactions || []).map((t: any) => {
                const amtRs = Number(t.amountMinor) / 100;
                return (
                  <div
                    key={t.id}
                    className="p-3.5 bg-white border border-[#EDE4D1] rounded-2xl flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[#C95B3D]">{t.fromMemberName}</span>
                      <ArrowRight className="w-3.5 h-3.5 text-[#8A7B68]" />
                      <span className="font-bold text-[#163F38]">{t.toMemberName}</span>
                    </div>
                    <span className="font-serif font-bold text-sm text-[#163F38]">
                      ₹{amtRs.toLocaleString("en-IN")}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Complete Itemized Expenses Ledger */}
          <div className="space-y-4">
            <h2 className="font-serif text-2xl font-bold text-[#163F38] flex items-center gap-2">
              <Receipt className="w-5 h-5 text-[#C9A35B]" />
              <span>Full Itemized Expenses Registry</span>
            </h2>

            <div className="overflow-x-auto rounded-2xl border border-[#EDE4D1] bg-white">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#FCF9F2] border-b border-[#EDE4D1] text-[#7A6C58] font-bold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="p-3">Date</th>
                    <th className="p-3">Item / Merchant</th>
                    <th className="p-3">Category</th>
                    <th className="p-3">Paid By</th>
                    <th className="p-3 text-right">Total Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EDE4D1]/60">
                  {expenses.map((e) => {
                    const payer = members.find((m) => m.id === e.payerId);
                    const amtRs = Number(e.convertedAmountMinor || e.amountMinor) / 100;
                    return (
                      <tr key={e.id} className="hover:bg-[#FCF9F2]/40">
                        <td className="p-3 text-[#7A6C58]">
                          {e.date ? new Date(e.date).toISOString().split("T")[0] : "—"}
                        </td>
                        <td className="p-3 font-semibold text-[#163F38]">{e.title}</td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded-full text-[10px] bg-[#EAE2CE] text-[#5A5040] font-bold uppercase">
                            {e.category}
                          </span>
                        </td>
                        <td className="p-3 text-[#5F625B]">{payer?.name || "Traveler"}</td>
                        <td className="p-3 text-right font-serif font-bold text-[#163F38]">
                          ₹{amtRs.toLocaleString("en-IN")}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Footer Journal Sign-off */}
          <div className="pt-6 border-t-2 border-[#E6DEC9] text-center text-xs text-[#8A7B68]">
            <p className="font-serif italic text-sm text-[#5A5040] mb-1">
              “Every rupee tracked, every member balanced. No debts left behind.”
            </p>
            <p>Generated by Wander Wallet • Verified Deterministic Travel Ledger</p>
          </div>
        </article>
      )}

      {/* ========================================================================= */}
      {/* VIEW B: INDIVIDUAL MEMBER EXPENDITURE STATEMENT & SETTLEMENT INVOICE */}
      {/* ========================================================================= */}
      {selectedMemberId !== "ALL" && activeMember && activeMemberBalance && (
        <article className="max-w-4xl mx-auto bg-[#FDFBF7] border-2 border-[#E0D5BE] rounded-3xl p-8 sm:p-12 shadow-md print:shadow-none print:border-none print:p-4 space-y-8">
          {/* Header */}
          <div className="pb-6 border-b-2 border-[#E6DEC9] flex flex-col sm:flex-row sm:items-start justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#EAE2CE] text-[#6B5E4C] text-[11px] font-bold uppercase tracking-widest mb-3">
                <User className="w-3.5 h-3.5 text-[#C95B3D]" />
                <span>Individual Travel Statement & Expense Audit</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-serif font-bold text-[#163F38]">
                {activeMember.name}
              </h1>
              <p className="text-xs text-[#7A6C58] mt-1">
                Role: <strong>{activeMember.role || "Traveler"}</strong> • Trip: <strong>{trip?.title}</strong> ({trip?.destination})
              </p>
            </div>

            {/* Verification Badge */}
            <div className="w-28 h-28 border-4 border-dashed border-[#163F38]/60 rounded-2xl flex flex-col items-center justify-center p-2 text-center rotate-[-1deg] shrink-0 bg-[#F5EFE3]/50">
              <ShieldCheck className="w-6 h-6 text-emerald-600 mb-0.5" />
              <span className="text-[10px] uppercase font-bold tracking-wider text-[#163F38]">SETTLEMENT</span>
              <span className="font-serif font-bold text-[10px] text-[#7A6C58] mt-0.5">MEMBER PASS</span>
            </div>
          </div>

          {/* Member Personal Financial Summary Box */}
          {(() => {
            const paidRs = Number(activeMemberBalance.paidMinor) / 100;
            const shareRs = Number(activeMemberBalance.shareMinor) / 100;
            const netRs = Number(activeMemberBalance.netBalanceMinor) / 100;

            return (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-5 bg-[#EFE9DC]/60 border border-[#E0D5BE] rounded-2xl">
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-[#8A7B68] block">
                    Paid Out of Pocket
                  </span>
                  <span className="font-serif text-2xl font-bold text-[#163F38]">
                    ₹{paidRs.toLocaleString("en-IN")}
                  </span>
                  <span className="text-[10px] text-[#7A6C58] block mt-0.5">Bills paid upfront by {activeMember.name}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-[#8A7B68] block">
                    Actual Share Consumed
                  </span>
                  <span className="font-serif text-2xl font-bold text-[#C95B3D]">
                    ₹{shareRs.toLocaleString("en-IN")}
                  </span>
                  <span className="text-[10px] text-[#7A6C58] block mt-0.5">Total portion of meals & activities</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-[#8A7B68] block">
                    Net Settlement Position
                  </span>
                  <span
                    className={`font-serif text-2xl font-bold block ${
                      netRs > 0 ? "text-emerald-800" : netRs < 0 ? "text-rose-800" : "text-neutral-700"
                    }`}
                  >
                    {netRs > 0
                      ? `+₹${netRs.toLocaleString("en-IN")}`
                      : netRs < 0
                      ? `-₹${(-netRs).toLocaleString("en-IN")}`
                      : "₹0.00"}
                  </span>
                  <span className="text-[10px] text-[#7A6C58] block mt-0.5">
                    {netRs > 0
                      ? "To be received back from group"
                      : netRs < 0
                      ? "To pay towards final settlement"
                      : "Account completely settled"}
                  </span>
                </div>
              </div>
            );
          })()}

          {/* Direct Settlement Action Instructions for this Member */}
          <div className="space-y-3">
            <h2 className="font-serif text-xl font-bold text-[#163F38] flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-[#C9A35B]" />
              <span>Direct Payment Instructions for {activeMember.name}</span>
            </h2>

            {memberTransfers.length > 0 ? (
              <div className="space-y-2">
                {memberTransfers.map((t: any) => {
                  const amtRs = Number(t.amountMinor) / 100;
                  const isPaying = t.fromMemberId === activeMember.id;

                  return (
                    <div
                      key={t.id}
                      className={`p-4 rounded-2xl border flex items-center justify-between text-xs ${
                        isPaying
                          ? "bg-rose-50/70 border-rose-200 text-rose-900"
                          : "bg-emerald-50/70 border-emerald-200 text-emerald-900"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs ${
                            isPaying ? "bg-rose-600 text-white" : "bg-emerald-600 text-white"
                          }`}
                        >
                          {isPaying ? "↑" : "↓"}
                        </div>
                        <div>
                          <p className="font-bold">
                            {isPaying
                              ? `Pay ₹${amtRs.toLocaleString("en-IN")} to ${t.toMemberName}`
                              : `Receive ₹${amtRs.toLocaleString("en-IN")} from ${t.fromMemberName}`}
                          </p>
                          <span className="text-[11px] opacity-80">
                            Recommended method: UPI / Instant Bank Transfer
                          </span>
                        </div>
                      </div>
                      <span className="font-serif font-extrabold text-base">
                        ₹{amtRs.toLocaleString("en-IN")}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-800 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                <span>Zero pending debts! {activeMember.name}'s account is fully balanced and settled.</span>
              </div>
            )}
          </div>

          {/* Itemized Bills & Activity Claims for This Member */}
          <div className="space-y-3">
            <h2 className="font-serif text-xl font-bold text-[#163F38] flex items-center gap-2">
              <Receipt className="w-5 h-5 text-[#C9A35B]" />
              <span>Itemized Expenses Involving {activeMember.name}</span>
            </h2>
            <p className="text-xs text-[#7A6C58]">
              Every expense, group meal, or subset bill where {activeMember.name} consumed items or contributed funds:
            </p>

            <div className="overflow-x-auto rounded-2xl border border-[#EDE4D1] bg-white">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#FCF9F2] border-b border-[#EDE4D1] text-[#7A6C58] font-bold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="p-3">Date</th>
                    <th className="p-3">Bill / Item</th>
                    <th className="p-3">Split Logic</th>
                    <th className="p-3 text-right">Printed Bill</th>
                    <th className="p-3 text-right">Your Share</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EDE4D1]/60">
                  {memberExpenses.map((exp) => (
                    <tr key={exp.id} className="hover:bg-[#FCF9F2]/40">
                      <td className="p-3 text-[#7A6C58]">{exp.date}</td>
                      <td className="p-3">
                        <span className="font-semibold text-[#163F38] block">{exp.title}</span>
                        {exp.isPayer && (
                          <span className="text-[10px] text-emerald-700 font-medium">★ You paid this upfront</span>
                        )}
                      </td>
                      <td className="p-3">
                        <span className="text-[10px] bg-[#EAE2CE] text-[#5A5040] px-2 py-0.5 rounded-full font-bold">
                          {exp.splitDescription}
                        </span>
                      </td>
                      <td className="p-3 text-right text-[#7A6C58] font-serif">
                        ₹{exp.totalBillRs.toLocaleString("en-IN")}
                      </td>
                      <td className="p-3 text-right font-serif font-bold text-[#163F38]">
                        ₹{exp.memberShareRs.toLocaleString("en-IN")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Member Sign-Off */}
          <div className="pt-6 border-t-2 border-[#E6DEC9] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#8A7B68]">
            <p>Certified Official Statement for {activeMember.name} • Wander Wallet Ledger</p>
            <p className="font-serif italic text-sm text-[#163F38]">Thank you for traveling together!</p>
          </div>
        </article>
      )}
    </div>
  );
}
