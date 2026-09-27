"use client";

import React, { useState, useEffect } from "react";
import {
  Sparkles,
  TrendingUp,
  AlertTriangle,
  Receipt,
  PlusCircle,
  MessageSquare,
  ArrowRight,
  ShieldAlert,
  CheckCircle2,
  DollarSign,
  ChevronRight,
  RefreshCw,
  Sliders,
  Users,
  PieChart,
} from "lucide-react";

export interface CategoryComparisonData {
  category: string;
  displayName: string;
  fixedCapMinor: string | number | bigint;
  actualSpendMinor: string | number | bigint;
  overshootMinor: string | number | bigint;
  headroomMinor: string | number | bigint;
  utilizationPct: number;
  status: "UNDER_CAP" | "WARNING" | "BREACHED";
}

export interface OCRLineItemSummary {
  name: string;
  quantity: number;
  amountMinor: string | number | bigint;
  formattedAmount: string;
  category: string;
  participantNames: string[];
  percentageOfCategory: number;
  isOverspendDriver: boolean;
}

export interface BudgetEvolutionData {
  initialBudgetMinor: string | number | bigint;
  extraBudgetMinor: string | number | bigint;
  totalEffectiveBudgetMinor: string | number | bigint;
  currentSpendMinor: string | number | bigint;
  projectedFinalSpendMinor: string | number | bigint;
  netDeficitOrSurplusMinor: string | number | bigint;
  isDeficit: boolean;
}

export interface ComparativeAnalysisReport {
  tripId: string;
  tripTitle: string;
  currency: string;
  generatedAt: string;
  executiveSummary: string;
  ocrLineItemNarrative: string;
  splitAndPayerNarrative: string;
  recoveryRecommendations: Array<{
    title: string;
    description: string;
    actionType: "REALLOCATE" | "TOP_UP" | "SPLIT_SETTLE" | "CURTAIL";
    suggestedAmountMinor?: string | number | bigint;
  }>;
  customAnswer?: string | null;
  graphs: {
    categoryComparison: CategoryComparisonData[];
    ocrItemDrivers: OCRLineItemSummary[];
    budgetEvolution: BudgetEvolutionData;
    memberBreakdown: Array<{
      memberId: string;
      name: string;
      totalPaidMinor: string | number | bigint;
      totalConsumedMinor: string | number | bigint;
      netBalanceMinor: string | number | bigint;
    }>;
  };
  hasBreach: boolean;
  totalOvershootMinor: string | number | bigint;
  recommendedExtraBudgetMinor: string | number | bigint;
}

interface AIComparativeAnalysisCardProps {
  tripId: string;
  currency?: string;
  onBudgetUpdated?: () => void;
}

export function AIComparativeAnalysisCard({
  tripId,
  currency = "INR",
  onBudgetUpdated,
}: AIComparativeAnalysisCardProps) {
  const [report, setReport] = useState<ComparativeAnalysisReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [querying, setQuerying] = useState(false);
  const [customPrompt, setCustomPrompt] = useState("");
  const [chatHistory, setChatHistory] = useState<Array<{ role: "user" | "gpt"; text: string }>>([]);

  // Extra Budget Top-Up State
  const [showTopUpModal, setShowTopUpModal] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState("5000");
  const [addingBudget, setAddingBudget] = useState(false);

  // Active view tab: "GRAPHS" | "OCR_DRIVERS" | "CHAT"
  const [activeTab, setActiveTab] = useState<"GRAPHS" | "OCR_DRIVERS" | "CHAT">("GRAPHS");

  const sym = currency === "INR" ? "₹" : "$";

  const fetchReport = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/trips/${tripId}/comparative-analysis`);
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.report) {
          setReport(json.report);
        }
      } else {
        console.warn(`Comparative analysis endpoint returned HTTP ${res.status}`);
      }
    } catch (err) {
      console.error("Failed to fetch comparative analysis:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [tripId]);

  const handleSendPrompt = async (promptToSend?: string) => {
    const text = (promptToSend || customPrompt).trim();
    if (!text) return;

    setChatHistory((prev) => [...prev, { role: "user", text }]);
    setCustomPrompt("");
    setQuerying(true);

    try {
      const res = await fetch(`/api/trips/${tripId}/comparative-analysis`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "QUERY", prompt: text }),
      });
      const json = await res.json();
      if (json.success && json.report) {
        setReport(json.report);
        const answer =
          json.report.customAnswer ||
          json.report.executiveSummary ||
          "Analysis updated based on your prompt.";
        setChatHistory((prev) => [...prev, { role: "gpt", text: answer }]);
      }
    } catch (err) {
      console.error("Failed to query Trip GPT:", err);
      setChatHistory((prev) => [
        ...prev,
        { role: "gpt", text: "Sorry, I had trouble evaluating that question. Please try again." },
      ]);
    } finally {
      setQuerying(false);
    }
  };

  const handleAddExtraBudget = async () => {
    const amt = parseFloat(topUpAmount);
    if (isNaN(amt) || amt <= 0) return;

    try {
      setAddingBudget(true);
      const minor = Math.round(amt * 100).toString();
      const res = await fetch(`/api/trips/${tripId}/comparative-analysis`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "ADD_EXTRA_BUDGET", extraAmountMinor: minor }),
      });
      const json = await res.json();
      if (json.success && json.report) {
        setReport(json.report);
        setShowTopUpModal(false);
        setChatHistory((prev) => [
          ...prev,
          {
            role: "gpt",
            text: `Added +${sym}${amt.toLocaleString("en-IN")} extra budget to the trip! Visual graphs and category headroom have been re-calibrated.`,
          },
        ]);
        if (onBudgetUpdated) onBudgetUpdated();
      }
    } catch (err) {
      console.error("Failed to add extra budget:", err);
    } finally {
      setAddingBudget(false);
    }
  };

  if (loading && !report) {
    return (
      <div className="bg-[#FFFDF9] rounded-2xl border border-[#E7DFD5] p-8 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-[#163F38] border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-semibold text-[#163F38]">
            Synthesizing AI Comparative Budget & OCR Spend Analysis...
          </p>
        </div>
      </div>
    );
  }

  if (!report) return null;

  const { graphs, executiveSummary, ocrLineItemNarrative, recoveryRecommendations } = report;
  const initialRs = Math.round(Number(graphs.budgetEvolution.initialBudgetMinor) / 100);
  const extraRs = Math.round(Number(graphs.budgetEvolution.extraBudgetMinor) / 100);
  const currentSpendRs = Math.round(Number(graphs.budgetEvolution.currentSpendMinor) / 100);
  const totalBudgetRs = Math.round(Number(graphs.budgetEvolution.totalEffectiveBudgetMinor) / 100);

  return (
    <div id="ai-comparative-analysis" className="bg-[#FFFDF9] rounded-2xl border border-[#E7DFD5] shadow-md overflow-hidden transition-all">
      {/* Top Banner Header */}
      <div className="bg-gradient-to-r from-[#163F38] to-[#20554C] px-6 py-5 text-white flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20">
            <Sparkles className="w-5 h-5 text-amber-300 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-serif text-lg font-bold tracking-wide">
                Trip GPT • Comparative Budget & OCR Spend Analyst
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-amber-400/20 text-amber-300 border border-amber-400/30">
                NLP Active
              </span>
            </div>
            <p className="text-xs text-white/80 mt-0.5">
              Comparative analysis of fixed plan vs. actual OCR bills & spend overshoots
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setShowTopUpModal(true)}
            className="px-3.5 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-[#163F38] text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Add Extra Budget</span>
          </button>

          <button
            type="button"
            onClick={fetchReport}
            title="Refresh Analysis"
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors border border-white/15"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Evolution Summary Bar */}
      <div className="bg-[#F8F4EE] border-b border-[#E7DFD5] px-6 py-3.5 flex flex-wrap items-center justify-between gap-4 text-xs">
        <div className="flex items-center gap-4">
          <div>
            <span className="text-[#746D65] block font-medium text-[11px]">Fixed Baseline</span>
            <span className="font-bold text-[#172A3A] text-sm">
              {sym}{initialRs.toLocaleString("en-IN")}
            </span>
          </div>
          <ArrowRight className="w-3.5 h-3.5 text-[#B8ADA0]" />
          <div>
            <span className="text-[#746D65] block font-medium text-[11px]">Extra Added</span>
            <span className="font-bold text-emerald-700 text-sm">
              +{sym}{extraRs.toLocaleString("en-IN")}
            </span>
          </div>
          <ArrowRight className="w-3.5 h-3.5 text-[#B8ADA0]" />
          <div>
            <span className="text-[#746D65] block font-medium text-[11px]">Total Kitty</span>
            <span className="font-bold text-[#172A3A] text-sm">
              {sym}{totalBudgetRs.toLocaleString("en-IN")}
            </span>
          </div>
          <div className="h-6 w-[1px] bg-[#D8C9B5] mx-1 hidden sm:block" />
          <div>
            <span className="text-[#746D65] block font-medium text-[11px]">Actual Spend</span>
            <span className={`font-bold text-sm ${currentSpendRs > totalBudgetRs ? "text-rose-600" : "text-[#163F38]"}`}>
              {sym}{currentSpendRs.toLocaleString("en-IN")}
            </span>
          </div>
        </div>

        {report.hasBreach ? (
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold">
            <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
            <span>
              Cap Overshoot: +{sym}
              {Math.round(Number(report.totalOvershootMinor) / 100).toLocaleString("en-IN")}
            </span>
          </div>
        ) : (
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Budget On Track</span>
          </div>
        )}
      </div>

      {/* Tab Switcher */}
      <div className="px-6 pt-4 border-b border-[#E7DFD5] flex items-center gap-3">
        <button
          type="button"
          onClick={() => setActiveTab("GRAPHS")}
          className={`pb-3 text-xs font-bold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === "GRAPHS"
              ? "border-[#163F38] text-[#163F38]"
              : "border-transparent text-[#746D65] hover:text-[#172A3A]"
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>Comparative Budget Graphs</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("OCR_DRIVERS")}
          className={`pb-3 text-xs font-bold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === "OCR_DRIVERS"
              ? "border-[#163F38] text-[#163F38]"
              : "border-transparent text-[#746D65] hover:text-[#172A3A]"
          }`}
        >
          <Receipt className="w-4 h-4" />
          <span>OCR Bill & Dish Drivers ({graphs.ocrItemDrivers.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("CHAT")}
          className={`pb-3 text-xs font-bold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === "CHAT"
              ? "border-[#163F38] text-[#163F38]"
              : "border-transparent text-[#746D65] hover:text-[#172A3A]"
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          <span>Ask Trip GPT (Q&A)</span>
        </button>
      </div>

      {/* Main Content Area */}
      <div className="p-6">
        {/* TAB 1: COMPARATIVE GRAPHS */}
        {activeTab === "GRAPHS" && (
          <div className="space-y-6">
            {/* Natural Language Executive Briefing */}
            <div className="p-4 rounded-xl bg-gradient-to-br from-amber-50/70 to-emerald-50/50 border border-[#E7DFD5] text-xs space-y-2">
              <div className="flex items-center gap-2 font-bold text-[#163F38]">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span>Executive NLP Comparative Summary:</span>
              </div>
              <p className="text-[#3E3A35] leading-relaxed font-sans">{executiveSummary}</p>
              {ocrLineItemNarrative && (
                <p className="text-[#746D65] text-[11px] leading-relaxed pt-1 border-t border-[#E7DFD5]">
                  <strong className="text-[#172A3A]">OCR Bill Insight:</strong> {ocrLineItemNarrative}
                </p>
              )}
            </div>

            {/* Visual Comparative Graph: Fixed Cap vs Actual Spend */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#746D65]">
                  Comparative Category Spend vs. Fixed Caps (with Overshoot Alerts)
                </h4>
                <div className="flex items-center gap-4 text-[11px]">
                  <span className="flex items-center gap-1 text-[#746D65]">
                    <span className="w-2.5 h-2.5 rounded-sm bg-[#D8C9B5] inline-block" /> Fixed Cap
                  </span>
                  <span className="flex items-center gap-1 text-emerald-700">
                    <span className="w-2.5 h-2.5 rounded-sm bg-[#163F38] inline-block" /> Actual Spend
                  </span>
                  <span className="flex items-center gap-1 text-rose-600 font-semibold">
                    <span className="w-2.5 h-2.5 rounded-sm bg-rose-500 inline-block" /> Breach Overshoot
                  </span>
                </div>
              </div>

              <div className="space-y-4 bg-[#F8F4EE] p-4 rounded-xl border border-[#E7DFD5]">
                {graphs.categoryComparison.map((cat) => {
                  const cap = Number(cat.fixedCapMinor) / 100;
                  const spend = Number(cat.actualSpendMinor) / 100;
                  const overshoot = Number(cat.overshootMinor) / 100;
                  const headroom = Number(cat.headroomMinor) / 100;

                  // Maximum scale representation
                  const maxVal = Math.max(cap, spend, 1);
                  const spendWidthPct = Math.min(100, Math.round((spend / maxVal) * 100));
                  const isBreached = cat.status === "BREACHED";

                  return (
                    <div key={cat.category} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs font-bold">
                        <div className="flex items-center gap-2">
                          <span className="text-[#172A3A] font-semibold">{cat.displayName}</span>
                          {isBreached ? (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-700 border border-rose-300">
                              BREACHED (+{sym}{overshoot.toLocaleString("en-IN")})
                            </span>
                          ) : cat.status === "WARNING" ? (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                              WARNING ({cat.utilizationPct}%)
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-100 text-emerald-800 border border-emerald-200">
                              Headroom: {sym}{headroom.toLocaleString("en-IN")}
                            </span>
                          )}
                        </div>
                        <div className="text-[#746D65] font-sans text-xs">
                          <strong className={isBreached ? "text-rose-600" : "text-[#163F38]"}>
                            {sym}{spend.toLocaleString("en-IN")}
                          </strong>
                          <span className="text-[#B8ADA0] mx-1">/</span>
                          <span>{sym}{cap.toLocaleString("en-IN")}</span>
                        </div>
                      </div>

                      {/* Bar graph visualization */}
                      <div className="h-4 bg-[#EAE1D3] rounded-md overflow-hidden relative flex">
                        {/* Under Cap or On Target Bar */}
                        <div
                          style={{
                            width: `${isBreached ? Math.round((cap / spend) * 100) : spendWidthPct}%`,
                          }}
                          className={`h-full transition-all duration-500 ${
                            isBreached
                              ? "bg-[#163F38]"
                              : cat.status === "WARNING"
                              ? "bg-amber-600"
                              : "bg-[#163F38]"
                          }`}
                        />
                        {/* Red Overshoot Segment if Breached */}
                        {isBreached && (
                          <div
                            style={{
                              width: `${100 - Math.round((cap / spend) * 100)}%`,
                            }}
                            className="h-full bg-rose-500 animate-pulse transition-all duration-500"
                          />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Smart Recovery & Reallocation Plan */}
            {recoveryRecommendations.length > 0 && (
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#746D65] mb-2.5">
                  AI Recommended Recovery & Rebalancing Plan
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {recoveryRecommendations.map((rec, i) => (
                    <div
                      key={i}
                      className="p-3.5 rounded-xl border border-[#E7DFD5] bg-white flex flex-col justify-between gap-2 shadow-xs hover:border-[#163F38] transition-colors"
                    >
                      <div>
                        <div className="flex items-center gap-1.5 text-xs font-bold text-[#163F38]">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span>{rec.title}</span>
                        </div>
                        <p className="text-xs text-[#746D65] mt-1 leading-relaxed">
                          {rec.description}
                        </p>
                      </div>

                      {rec.actionType === "TOP_UP" && (
                        <button
                          type="button"
                          onClick={() => {
                            if (rec.suggestedAmountMinor) {
                              setTopUpAmount((Number(rec.suggestedAmountMinor) / 100).toString());
                            }
                            setShowTopUpModal(true);
                          }}
                          className="self-start text-[11px] font-bold text-[#163F38] hover:text-[#20554C] flex items-center gap-1 mt-1 underline"
                        >
                          Execute Top-Up Now →
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: OCR DISH & LINE-ITEM DRIVERS */}
        {activeTab === "OCR_DRIVERS" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-[#172A3A]">
                  OCR Extracted Items & Bill Attribution
                </h4>
                <p className="text-xs text-[#746D65] mt-0.5">
                  Individual dishes, beverages, and taxes extracted from scanned receipts driving the variance
                </p>
              </div>
              <span className="text-xs font-bold text-[#163F38] bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                {graphs.ocrItemDrivers.length} Items Identified
              </span>
            </div>

            <div className="overflow-hidden border border-[#E7DFD5] rounded-xl bg-white">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F8F4EE] border-b border-[#E7DFD5] text-[#746D65] font-bold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-2.5 px-4">Line Item / Dish</th>
                    <th className="py-2.5 px-3">Category</th>
                    <th className="py-2.5 px-3">Amount</th>
                    <th className="py-2.5 px-3">Claimants / Split</th>
                    <th className="py-2.5 px-3 text-right">Impact</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E7DFD5]">
                  {graphs.ocrItemDrivers.map((item, idx) => (
                    <tr key={idx} className="hover:bg-[#FFFDF9] transition-colors">
                      <td className="py-2.5 px-4 font-semibold text-[#172A3A]">
                        <div className="flex items-center gap-2">
                          {item.isOverspendDriver && (
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
                          )}
                          <span>{item.name}</span>
                          {item.quantity > 1 && (
                            <span className="text-[10px] text-[#746D65]">({item.quantity}x)</span>
                          )}
                        </div>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#F8F4EE] text-[#746D65] border border-[#E7DFD5]">
                          {item.category}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-bold text-[#163F38]">
                        {item.formattedAmount}
                      </td>
                      <td className="py-2.5 px-3 text-[#746D65]">
                        <span className="text-[11px] truncate max-w-[160px] inline-block">
                          {item.participantNames.join(", ")}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        {item.isOverspendDriver ? (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-700 border border-rose-300">
                            Key Driver ({item.percentageOfCategory}%)
                          </span>
                        ) : (
                          <span className="text-[11px] text-[#746D65]">
                            {item.percentageOfCategory}%
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: ASK TRIP GPT (INTERACTIVE CONSOLE) */}
        {activeTab === "CHAT" && (
          <div className="space-y-4">
            <div className="p-3 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl text-xs text-[#163F38] flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                Ask Trip GPT anything about your budget overshoot, who paid for what in OCR bills, or how to rebalance.
              </span>
            </div>

            {/* Quick Prompt Chips */}
            <div className="flex flex-wrap gap-2">
              {[
                "Why did Food exceed its cap?",
                "Summarize our OCR seafood & drinks bill",
                "Who has fronted the highest overshoot?",
                "How much extra budget do we need to finish the trip?",
              ].map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => handleSendPrompt(chip)}
                  disabled={querying}
                  className="px-2.5 py-1 rounded-lg bg-[#F8F4EE] hover:bg-[#EAE1D3] text-[#172A3A] text-[11px] font-semibold transition-colors border border-[#D8C9B5] disabled:opacity-50"
                >
                  💬 {chip}
                </button>
              ))}
            </div>

            {/* Chat Messages */}
            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
              {chatHistory.length === 0 ? (
                <div className="p-4 rounded-xl border border-dashed border-[#D8C9B5] text-center text-xs text-[#746D65]">
                  Click a question above or type your own prompt below to chat with your Trip Budget GPT.
                </div>
              ) : (
                chatHistory.map((msg, i) => (
                  <div
                    key={i}
                    className={`p-3 rounded-xl text-xs leading-relaxed ${
                      msg.role === "user"
                        ? "bg-[#163F38] text-white ml-8 font-medium"
                        : "bg-[#F8F4EE] text-[#172A3A] border border-[#E7DFD5] mr-8 font-sans"
                    }`}
                  >
                    <div className="text-[10px] font-bold opacity-75 mb-1 uppercase tracking-wider">
                      {msg.role === "user" ? "You" : "Trip GPT"}
                    </div>
                    {msg.text}
                  </div>
                ))
              )}
              {querying && (
                <div className="p-3 rounded-xl bg-[#F8F4EE] border border-[#E7DFD5] text-xs text-[#746D65] flex items-center gap-2">
                  <div className="w-3.5 h-3.5 border-2 border-[#163F38] border-t-transparent rounded-full animate-spin" />
                  <span>Trip GPT is analyzing expenses, OCR line items & category variances...</span>
                </div>
              )}
            </div>

            {/* Input Bar */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendPrompt();
              }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                placeholder="Ask Trip GPT (e.g. 'Can we afford jet skiing tomorrow?')..."
                className="flex-1 px-4 py-2.5 rounded-xl border border-[#D8C9B5] bg-white text-xs text-[#172A3A] focus:outline-none focus:ring-2 focus:ring-[#163F38]"
              />
              <button
                type="submit"
                disabled={querying || !customPrompt.trim()}
                className="px-4 py-2.5 rounded-xl bg-[#163F38] hover:bg-[#20554C] text-white text-xs font-bold transition-all disabled:opacity-50 flex items-center gap-1.5"
              >
                <span>Ask</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        )}
      </div>

      {/* MODAL: ADD EXTRA BUDGET TOP-UP */}
      {showTopUpModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#FFFDF9] rounded-2xl border border-[#D8C9B5] shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#E7DFD5] pb-3">
              <div className="flex items-center gap-2">
                <PlusCircle className="w-5 h-5 text-emerald-700" />
                <h4 className="font-serif font-bold text-base text-[#172A3A]">
                  Add Extra Budget (Kitty Top-Up)
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setShowTopUpModal(false)}
                className="text-[#746D65] hover:text-[#172A3A] text-sm"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-[#746D65] leading-relaxed">
              When group spending exceeds the fixed initial caps, topping up the pooled kitty expands your baseline and rebalances category headroom.
            </p>

            <div>
              <label className="block text-xs font-bold text-[#172A3A] mb-1.5">
                Top-Up Amount ({currency})
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-2.5 text-sm font-bold text-[#746D65]">
                  {sym}
                </span>
                <input
                  type="number"
                  min="1"
                  step="100"
                  value={topUpAmount}
                  onChange={(e) => setTopUpAmount(e.target.value)}
                  className="w-full pl-8 pr-4 py-2 rounded-xl border border-[#D8C9B5] text-sm font-bold text-[#172A3A] bg-white focus:outline-none focus:ring-2 focus:ring-[#163F38]"
                />
              </div>

              {/* Quick Select Buttons */}
              <div className="flex items-center gap-2 mt-2">
                {["2000", "5000", "10000", "15000"].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setTopUpAmount(val)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all border ${
                      topUpAmount === val
                        ? "bg-[#163F38] text-white border-[#163F38]"
                        : "bg-[#F8F4EE] text-[#746D65] border-[#D8C9B5] hover:bg-[#EAE1D3]"
                    }`}
                  >
                    +{sym}{parseInt(val).toLocaleString("en-IN")}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-xs text-emerald-800">
              <span className="font-bold">After Top-Up:</span> Total group kitty will increase from{" "}
              <strong>{sym}{totalBudgetRs.toLocaleString("en-IN")}</strong> to{" "}
              <strong>
                {sym}
                {(totalBudgetRs + (parseFloat(topUpAmount) || 0)).toLocaleString("en-IN")}
              </strong>.
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E7DFD5]">
              <button
                type="button"
                onClick={() => setShowTopUpModal(false)}
                disabled={addingBudget}
                className="px-4 py-2 rounded-xl border border-[#D8C9B5] text-xs font-bold text-[#746D65] hover:bg-[#EAE1D3] transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAddExtraBudget}
                disabled={addingBudget || !topUpAmount || parseFloat(topUpAmount) <= 0}
                className="px-5 py-2 rounded-xl bg-[#163F38] hover:bg-[#20554C] text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 disabled:opacity-50"
              >
                {addingBudget ? (
                  <>
                    <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Topping Up...</span>
                  </>
                ) : (
                  <>
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>Confirm Extra Budget</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
