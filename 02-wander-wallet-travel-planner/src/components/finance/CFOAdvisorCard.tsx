"use client";

import React, { useState } from "react";
import {
  ShieldAlert,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  Users,
  Coins,
  Send,
  CheckCircle2,
  Flame,
} from "lucide-react";
import { CFOAdvisorReport } from "@/lib/expenses/cfo";

interface CFOAdvisorCardProps {
  report: CFOAdvisorReport | null;
  tripId: string;
  onRefresh?: () => void;
}

export function CFOAdvisorCard({ report, tripId, onRefresh }: CFOAdvisorCardProps) {
  const [nudgeSent, setNudgeSent] = useState<Record<string, boolean>>({});
  const [isNudging, setIsNudging] = useState<string | null>(null);

  if (!report) {
    return (
      <div className="bg-[#FFF9F0] border border-[#D8C9B5] rounded-2xl p-6 flex items-center justify-center text-xs text-[#746D65] animate-pulse">
        Evaluating group financial velocity & cash flow health...
      </div>
    );
  }

  const {
    healthScore,
    healthGrade,
    healthSummary,
    burnRate,
    cashFlowBurden,
    categoryHealth,
    recommendations,
  } = report;

  // Grade color tokens strictly adhering to Navy, Ochre, Terracotta, Charcoal
  const gradeStyles = {
    EXCELLENT: {
      bg: "bg-[#FFF9F0] border-[#D8C9B5] text-[#172A3A]",
      badge: "bg-[#EAE1D3] text-[#172A3A] border-[#D8C9B5]",
      ring: "text-[#172A3A]",
      bar: "bg-[#172A3A]",
    },
    HEALTHY: {
      bg: "bg-[#FFF9F0] border-[#D8C9B5] text-[#172A3A]",
      badge: "bg-[#F7EEDB] text-[#8C5D1E] border-[#D49A55]",
      ring: "text-[#D49A55]",
      bar: "bg-[#D49A55]",
    },
    CAUTION: {
      bg: "bg-[#FFF9F0] border-[#D8C9B5] text-[#C85C3A]",
      badge: "bg-[#FDF0EB] text-[#C85C3A] border-[#E9BFB2]",
      ring: "text-[#C85C3A]",
      bar: "bg-[#C85C3A]",
    },
    CRITICAL: {
      bg: "bg-[#FFF9F0] border-[#D8C9B5] text-[#B53434]",
      badge: "bg-[#FBEBEB] text-[#B53434] border-[#E8A5A5]",
      ring: "text-[#B53434]",
      bar: "bg-[#B53434]",
    },
  }[healthGrade];

  async function handleSendNudge(recId: string, title: string, description: string) {
    try {
      setIsNudging(recId);
      const res = await fetch(`/api/trips/${tripId}/cfo`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          actionType: "NUDGE",
          title,
          message: description,
        }),
      });

      if (res.ok) {
        setNudgeSent((prev) => ({ ...prev, [recId]: true }));
        onRefresh?.();
      }
    } catch (err) {
      console.error("Failed to send nudge:", err);
    } finally {
      setIsNudging(null);
    }
  }

  const actualBurnRs = Math.round(Number(burnRate.actualDailyBurnMinor) / 100);
  const plannedBurnRs = Math.round(Number(burnRate.plannedDailyBurnMinor) / 100);

  // Circular gauge circumference for r=38: 2 * Math.PI * 38 ≈ 238.76
  const gaugeCircumference = 238.76;
  const strokeOffset = gaugeCircumference - (Math.min(100, Math.max(0, healthScore)) / 100) * gaugeCircumference;
  const strokeColor =
    healthGrade === "EXCELLENT"
      ? "#172A3A"
      : healthGrade === "HEALTHY"
      ? "#D49A55"
      : healthGrade === "CAUTION"
      ? "#C85C3A"
      : "#B53434";

  return (
    <div className="bg-[#FFF9F0] rounded-2xl p-6 sm:p-8 shadow-sm border border-[#D8C9B5] space-y-6">
      {/* Header with Health Score & CFO Badge */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-6 border-b border-[#D8C9B5]/70">
        <div className="space-y-1.5 max-w-xl">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-[#172A3A] text-[#FFF9F0] shadow-sm">
              Group CFO Ledger
            </span>
            <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border shadow-xs ${gradeStyles.badge}`}>
              {healthGrade} HEALTH
            </span>
          </div>
          <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#172A3A] tracking-tight">
            Financial Velocity & Ledger Guardian
          </h2>
          <p className="text-xs sm:text-sm text-[#746D65] leading-relaxed">{healthSummary}</p>
        </div>

        {/* Circular SVG Health Gauge */}
        <div className="flex items-center gap-4 self-start sm:self-auto bg-[#FFF9F0] border border-[#D8C9B5] px-5 py-3.5 rounded-xl shadow-xs">
          <div className="relative w-20 h-20 flex items-center justify-center">
            <svg className="w-20 h-20 -rotate-90 transform" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="38"
                className="stroke-[#EAE1D3]"
                strokeWidth="7"
                fill="transparent"
              />
              <circle
                cx="50"
                cy="50"
                r="38"
                stroke={strokeColor}
                strokeWidth="7"
                strokeDasharray={gaugeCircumference}
                strokeDashoffset={strokeOffset}
                strokeLinecap="round"
                fill="transparent"
                style={{ transition: "stroke-dashoffset 1s ease-in-out" }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="font-serif text-2xl font-bold text-[#172A3A] leading-none">
                {healthScore}
              </span>
              <span className="text-[9px] uppercase font-bold text-[#746D65] mt-0.5">/ 100</span>
            </div>
          </div>

          <div className="text-left space-y-1">
            <div className="flex items-center gap-1.5">
              {healthScore >= 70 ? (
                <ShieldCheck className="w-4 h-4 text-[#172A3A]" />
              ) : (
                <ShieldAlert className="w-4 h-4 text-[#C85C3A]" />
              )}
              <span className="text-xs font-bold text-[#172A3A]">{healthGrade} Pacing</span>
            </div>
            <p className="text-[11px] text-[#746D65] max-w-[130px] leading-tight">
              {healthScore >= 80 ? "Zero budget strain detected" : "Active velocity advisory in effect"}
            </p>
          </div>
        </div>
      </div>

      {/* Strategic Briefing Callout */}
      {report.cfoAIBriefing && (
        <div className="bg-[#F9F4EC] border border-[#D8C9B5] rounded-xl p-4.5 flex items-start gap-3.5">
          <div className="w-8 h-8 rounded-lg bg-[#172A3A] text-[#FFF9F0] flex items-center justify-center flex-shrink-0 mt-0.5">
            <Coins className="w-4 h-4 text-[#D49A55]" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#172A3A] flex items-center gap-1.5">
                CFO Strategic Ledger Briefing
              </span>
              <span className="px-2 py-0.5 bg-[#EAE1D3] text-[#746D65] text-[9px] rounded-full font-mono font-semibold border border-[#D8C9B5]">
                DISPATCH
              </span>
            </div>
            <p className="text-xs sm:text-[13px] text-[#292726] italic leading-relaxed font-serif">
              &ldquo;{report.cfoAIBriefing}&rdquo;
            </p>
          </div>
        </div>
      )}

      {/* 2-Column Metrics: Burn Rate Velocity vs Payer Burden */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Metric 1: Burn Rate Velocity */}
        <div className="rounded-xl p-5 space-y-4 border border-[#D8C9B5] bg-[#FFF9F0]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-[#C85C3A]/10 text-[#C85C3A] flex items-center justify-center">
                <Flame className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold uppercase tracking-wider text-[#172A3A]">
                Spend Velocity & Burn
              </span>
            </div>
            <span className="text-[11px] font-mono font-medium px-2 py-0.5 rounded-full bg-[#EAE1D3] text-[#746D65]">
              Day {burnRate.daysElapsed} of {burnRate.daysTotal}
            </span>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-[#746D65] font-medium">Budget Consumed</span>
              <span className="font-bold text-[#172A3A] font-mono">{burnRate.budgetUtilizationPercentage}%</span>
            </div>
            {/* Progress comparison bar */}
            <div className="w-full bg-[#EAE1D3] h-2.5 rounded-full overflow-hidden flex shadow-inner">
              <div
                className={`h-full ${gradeStyles.bar} transition-all duration-500 rounded-full`}
                style={{ width: `${Math.min(100, burnRate.budgetUtilizationPercentage)}%` }}
              />
            </div>
            <div className="flex justify-between text-[11px] text-[#746D65]">
              <span>Timeline: {burnRate.progressPercentage}% elapsed</span>
              <span className="font-semibold text-[#172A3A]">{burnRate.pacingStatusText}</span>
            </div>
          </div>

          <div className="pt-3 border-t border-[#D8C9B5]/60 grid grid-cols-2 gap-3 text-xs">
            <div className="bg-[#FFF9F0] p-2.5 rounded-lg border border-[#D8C9B5]/60">
              <span className="text-[10px] uppercase font-bold text-[#746D65] block">Current Daily Burn</span>
              <span className="font-serif font-bold text-base text-[#172A3A] block mt-0.5">
                ₹{actualBurnRs.toLocaleString("en-IN")}<span className="text-xs font-sans text-[#746D65]">/day</span>
              </span>
            </div>
            <div className="bg-[#FFF9F0] p-2.5 rounded-lg border border-[#D8C9B5]/60">
              <span className="text-[10px] uppercase font-bold text-[#746D65] block">Planned Target Burn</span>
              <span className="font-serif font-bold text-base text-[#746D65] block mt-0.5">
                ₹{plannedBurnRs.toLocaleString("en-IN")}<span className="text-xs font-sans text-[#746D65]">/day</span>
              </span>
            </div>
          </div>
        </div>

        {/* Metric 2: Cash Flow Concentration & Payer Burden */}
        <div className="rounded-xl p-5 space-y-4 border border-[#D8C9B5] bg-[#FFF9F0]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-[#D49A55]/15 text-[#D49A55] flex items-center justify-center">
                <Coins className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold uppercase tracking-wider text-[#172A3A]">
                Payer Float Risk
              </span>
            </div>
            <span
              className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase border shadow-2xs ${
                cashFlowBurden.concentrationRisk === "HIGH"
                  ? "bg-[#FBEBEB] text-[#B53434] border-[#E8A5A5]"
                  : cashFlowBurden.concentrationRisk === "MODERATE"
                  ? "bg-[#FDF0EB] text-[#C85C3A] border-[#E9BFB2]"
                  : "bg-[#EAE1D3] text-[#172A3A] border-[#D8C9B5]"
              }`}
            >
              {cashFlowBurden.concentrationRisk} Risk
            </span>
          </div>

          {/* Top Payer Callout */}
          <div className="text-xs space-y-1">
            <p className="text-[#746D65] leading-relaxed">
              <strong className="text-[#172A3A] font-semibold">{cashFlowBurden.topPayerName}</strong> has shouldered{" "}
              <strong className="text-[#C85C3A] font-semibold">{cashFlowBurden.topPayerPercentage}%</strong> of all upfront group payments.
            </p>
          </div>

          {/* Mini Payer Stack Bar */}
          <div className="w-full bg-[#EAE1D3] h-3 rounded-full overflow-hidden flex shadow-inner">
            {cashFlowBurden.payerBreakdown.map((p, idx) => {
              const colors = ["bg-[#172A3A]", "bg-[#C85C3A]", "bg-[#D49A55]", "#746D65", "bg-[#233d52]"];
              if (p.percentageOfTotal <= 0) return null;
              return (
                <div
                  key={p.memberId}
                  className={`h-full ${colors[idx % colors.length]}`}
                  style={{ width: `${p.percentageOfTotal}%` }}
                  title={`${p.name}: ${p.percentageOfTotal}%`}
                />
              );
            })}
          </div>

          {/* Top 3 Payers Pill Legend */}
          <div className="flex flex-wrap gap-2 pt-1 text-[11px]">
            {cashFlowBurden.payerBreakdown.slice(0, 3).map((p) => (
              <span key={p.memberId} className="bg-[#FFF9F0] border border-[#D8C9B5] px-2.5 py-0.5 rounded-full text-[#746D65] font-medium">
                {p.name.split(" ")[0]}: <span className="font-bold text-[#172A3A]">{Math.round(p.percentageOfTotal)}%</span>
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Actionable CFO Recommendations */}
      <div className="space-y-3 pt-2">
        <h3 className="text-xs font-bold uppercase tracking-wider text-[#746D65] flex items-center gap-1.5">
          Proactive CFO Directives
        </h3>

        <div className="space-y-3">
          {recommendations.map((rec) => {
            const isSent = nudgeSent[rec.id];
            const isPending = isNudging === rec.id;

            return (
              <div
                key={rec.id}
                className="rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border border-[#D8C9B5] bg-[#FFF9F0]"
              >
                <div className="space-y-1.5 max-w-xl text-left">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider border shadow-2xs ${
                        rec.priority === "HIGH"
                          ? "bg-[#FBEBEB] text-[#B53434] border-[#E8A5A5]"
                          : rec.priority === "MEDIUM"
                          ? "bg-[#FDF0EB] text-[#C85C3A] border-[#E9BFB2]"
                          : "bg-[#EAE1D3] text-[#172A3A] border-[#D8C9B5]"
                      }`}
                    >
                      {rec.priority} Priority
                    </span>
                    <h4 className="font-serif font-bold text-sm text-[#172A3A]">{rec.title}</h4>
                  </div>
                  <p className="text-xs text-[#746D65] leading-relaxed">{rec.description}</p>
                </div>

                {rec.actionLabel && (
                  <div className="flex-shrink-0">
                    {isSent ? (
                      <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#EAE1D3] text-[#172A3A] text-xs font-semibold border border-[#D8C9B5]">
                        <CheckCircle2 className="w-4 h-4 text-[#172A3A]" />
                        Nudge Sent ✓
                      </span>
                    ) : (
                      <button
                        onClick={() => handleSendNudge(rec.id, rec.title, rec.description)}
                        disabled={isPending}
                        className="bg-[#172A3A] hover:bg-[#233d52] text-[#FFF9F0] px-4.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 shadow-sm transition-all active:scale-95 disabled:opacity-50"
                      >
                        {isPending ? (
                          <span>Sending...</span>
                        ) : (
                          <>
                            <span>{rec.actionLabel}</span>
                            <Send className="w-3.5 h-3.5 text-[#D49A55]" />
                          </>
                        )}
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
export default CFOAdvisorCard;
