"use client";

import React from "react";
import { AlertTriangle, AlertCircle, X, ChevronRight, TrendingUp } from "lucide-react";
import { BreachAlert } from "@/lib/budget/caps";

interface CategoryBreachBannerProps {
  alerts: BreachAlert[];
  dismissedAlertIds: string[];
  onDismiss: (alertId: string) => void;
  onNavigateToBudget?: () => void;
}

export function CategoryBreachBanner({
  alerts,
  dismissedAlertIds,
  onDismiss,
  onNavigateToBudget,
}: CategoryBreachBannerProps) {
  const visibleAlerts = alerts.filter((a) => !dismissedAlertIds.includes(a.id));

  if (visibleAlerts.length === 0) return null;

  return (
    <div className="space-y-3 mb-6 animate-in slide-in-from-top-3 duration-300">
      {visibleAlerts.map((alert) => {
        const isBreach = alert.level === "BREACH";

        return (
          <div
            key={alert.id}
            className={`rounded-2xl p-4 sm:p-5 border transition-all duration-200 shadow-md ${
              isBreach
                ? "bg-gradient-to-r from-[#FDE8E8] via-[#FFF0F0] to-[#FDE8E8] border-[#E8A5A5] text-[#9B1C1C]"
                : "bg-gradient-to-r from-[#FFF8E7] via-[#FFFDF5] to-[#FFF8E7] border-[#F2D69B] text-[#92400E]"
            }`}
          >
            <div className="flex items-start justify-between gap-4">
              {/* Icon & Title */}
              <div className="flex items-start gap-3 flex-1">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 shadow-xs ${
                    isBreach
                      ? "bg-[#C81E1E] text-white"
                      : "bg-[#D97706] text-white"
                  }`}
                >
                  {isBreach ? (
                    <AlertTriangle className="w-5 h-5 stroke-[2.5]" />
                  ) : (
                    <AlertCircle className="w-5 h-5 stroke-[2.5]" />
                  )}
                </div>

                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`text-[10px] font-mono font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                        isBreach
                          ? "bg-[#9B1C1C] text-white"
                          : "bg-[#92400E] text-white"
                      }`}
                    >
                      {isBreach ? "CAP OVERSPEND BREACH" : "THRESHOLD ALERT"}
                    </span>

                    <h4 className="font-serif font-bold text-base text-[#172A3A]">
                      {alert.scope === "TOTAL"
                        ? "Trip Total Budget Exceeded"
                        : `${alert.categoryLabel} Budget Cap Exceeded`}
                    </h4>
                  </div>

                  {/* Breach Detail Pills */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1.5 pb-1">
                    <div className="bg-white/80 backdrop-blur-xs p-2 rounded-xl border border-black/5 shadow-2xs">
                      <span className="text-[10px] uppercase font-bold text-[#746D65] block">
                        Assigned Cap
                      </span>
                      <span className="font-serif font-bold text-sm text-[#172A3A]">
                        {alert.capFormatted}
                      </span>
                    </div>

                    <div className="bg-white/80 backdrop-blur-xs p-2 rounded-xl border border-black/5 shadow-2xs">
                      <span className="text-[10px] uppercase font-bold text-[#746D65] block">
                        Current Spend
                      </span>
                      <span className="font-serif font-bold text-sm text-[#172A3A]">
                        {alert.currentSpendFormatted}
                      </span>
                    </div>

                    <div className="bg-white/80 backdrop-blur-xs p-2 rounded-xl border border-black/5 shadow-2xs">
                      <span className="text-[10px] uppercase font-bold text-[#746D65] block">
                        {isBreach ? "Overshoot Deficit" : "Remaining"}
                      </span>
                      <span
                        className={`font-serif font-bold text-sm ${
                          isBreach ? "text-[#C81E1E]" : "text-emerald-700"
                        }`}
                      >
                        {isBreach ? `+${alert.overshootFormatted}` : "Under Cap"}
                      </span>
                    </div>

                    <div className="bg-white/80 backdrop-blur-xs p-2 rounded-xl border border-black/5 shadow-2xs">
                      <span className="text-[10px] uppercase font-bold text-[#746D65] block">
                        Cap Utilization
                      </span>
                      <span
                        className={`font-serif font-bold text-sm ${
                          isBreach ? "text-[#C81E1E]" : "text-[#D97706]"
                        }`}
                      >
                        {alert.utilizationPct}%
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-[#4A453E] leading-relaxed">
                    {alert.message}
                  </p>
                </div>
              </div>

              {/* Action & Dismiss */}
              <div className="flex items-center gap-2 flex-shrink-0">
                {onNavigateToBudget && (
                  <button
                    onClick={onNavigateToBudget}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold bg-[#163F38] hover:bg-[#20554C] text-white shadow-xs transition-all active:scale-95"
                  >
                    <TrendingUp className="w-3.5 h-3.5 text-amber-300" />
                    <span>Trip GPT Analysis & Graphs</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => onDismiss(alert.id)}
                  className="w-8 h-8 rounded-full bg-white/80 hover:bg-white text-[#746D65] hover:text-[#172A3A] border border-black/10 flex items-center justify-center transition-all shadow-2xs"
                  title="Dismiss alert"
                  aria-label="Dismiss alert"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
export default CategoryBreachBanner;
