"use client";

import React, { useState } from "react";
import { formatCurrency, CategoryAllocation } from "@/lib/budget/engine";

export interface BudgetDonutChartProps {
  totalBudgetMinor: bigint;
  categories: CategoryAllocation[];
  travelers?: number;
  numberOfDays?: number;
  plannedSpendMinor?: bigint;
  currency?: string;
  onCategoryHover?: (category: CategoryAllocation | null) => void;
}

export function BudgetDonutChart({
  totalBudgetMinor,
  categories,
  travelers = 6,
  numberOfDays = 5,
  plannedSpendMinor,
  currency = "INR",
}: BudgetDonutChartProps) {
  const [activeCategory, setActiveCategory] = useState<CategoryAllocation | null>(null);
  const [viewMode, setViewMode] = useState<"TOTAL" | "PER_PERSON">("TOTAL");

  const planned = plannedSpendMinor ?? totalBudgetMinor;
  const remaining = totalBudgetMinor - planned;
  const perPersonTotal = travelers > 0 ? totalBudgetMinor / BigInt(travelers) : totalBudgetMinor;
  const perDayGroup = numberOfDays > 0 ? totalBudgetMinor / BigInt(numberOfDays) : totalBudgetMinor;

  // Compute SVG arcs
  const size = 260;
  const strokeWidth = 38;
  const radius = (size - strokeWidth) / 2;
  const center = size / 2;
  const circumference = 2 * Math.PI * radius;

  let accumulatedPercent = 0;

  return (
    <div className="w-full flex flex-col gap-6">
      {/* Header with Mode Toggle */}
      <div className="flex items-center justify-between pb-2 border-b border-[#D8C9B5]/70">
        <div>
          <h3 className="font-serif text-xl font-bold text-[#172A3A]">Your Budget Ledger</h3>
          <p className="text-xs text-[#746D65]">A clear financial ledger of where your travel funds go.</p>
        </div>

        {/* View Toggle */}
        <div className="flex items-center bg-[#EAE1D3]/60 p-0.5 rounded-lg border border-[#D8C9B5]">
          <button
            type="button"
            onClick={() => setViewMode("TOTAL")}
            className={`px-3 py-1 text-xs font-semibold rounded-md transition ${
              viewMode === "TOTAL"
                ? "bg-[#172A3A] text-[#FFF9F0] shadow-sm"
                : "text-[#746D65] hover:text-[#172A3A]"
            }`}
          >
            Total
          </button>
          <button
            type="button"
            onClick={() => setViewMode("PER_PERSON")}
            className={`px-3 py-1 text-xs font-semibold rounded-md transition ${
              viewMode === "PER_PERSON"
                ? "bg-[#172A3A] text-[#FFF9F0] shadow-sm"
                : "text-[#746D65] hover:text-[#172A3A]"
            }`}
          >
            Per Person
          </button>
        </div>
      </div>

      {/* Main Visual Row: Donut + Legend */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
        {/* SVG Donut */}
        <div className="md:col-span-5 flex flex-col items-center justify-center relative">
          <svg
            width={size}
            height={size}
            viewBox={`0 0 ${size} ${size}`}
            className="transform -rotate-90"
          >
            {categories.map((cat) => {
              const strokeDasharray = `${(cat.percentage / 100) * circumference} ${circumference}`;
              const strokeDashoffset = -((accumulatedPercent / 100) * circumference);
              accumulatedPercent += cat.percentage;

              const isHovered = activeCategory?.category === cat.category;

              return (
                <circle
                  key={cat.category}
                  cx={center}
                  cy={center}
                  r={radius}
                  fill="transparent"
                  stroke={cat.color}
                  strokeWidth={isHovered ? strokeWidth + 6 : strokeWidth}
                  strokeDasharray={strokeDasharray}
                  strokeDashoffset={strokeDashoffset}
                  className="transition-all duration-300 cursor-pointer"
                  onMouseEnter={() => setActiveCategory(cat)}
                  onMouseLeave={() => setActiveCategory(null)}
                />
              );
            })}
          </svg>

          {/* Center Content */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-4">
            <span className="font-serif text-2xl font-bold text-[#172A3A] tracking-tight">
              {activeCategory
                ? formatCurrency(
                    viewMode === "TOTAL"
                      ? activeCategory.allocatedMinor
                      : activeCategory.perPersonMinor,
                    currency
                  )
                : formatCurrency(
                    viewMode === "TOTAL" ? totalBudgetMinor : perPersonTotal,
                    currency
                  )}
            </span>
            <span className="text-[11px] font-medium uppercase tracking-wider text-[#746D65] mt-0.5">
              {activeCategory
                ? `${activeCategory.label} (${activeCategory.percentage}%)`
                : viewMode === "TOTAL"
                ? "Total Budget"
                : "Per Person Budget"}
            </span>
          </div>
        </div>

        {/* Legend / Category Breakdown Table */}
        <div className="md:col-span-7 flex flex-col gap-2.5">
          {categories.map((cat) => {
            const isHovered = activeCategory?.category === cat.category;
            const displayAmount =
              viewMode === "TOTAL" ? cat.allocatedMinor : cat.perPersonMinor;

            return (
              <div
                key={cat.category}
                onMouseEnter={() => setActiveCategory(cat)}
                onMouseLeave={() => setActiveCategory(null)}
                className={`flex items-center justify-between p-2.5 rounded-lg border transition cursor-pointer ${
                  isHovered
                    ? "bg-[#FFF9F0] border-[#172A3A] shadow-sm translate-x-1"
                    : "bg-[#FFF9F0] border-[#D8C9B5]/80 hover:bg-[#FFF9F0]"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: cat.color }}
                  />
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold text-[#292726]">
                      {cat.label}
                    </span>
                    <span className="text-[11px] text-[#746D65]">
                      {cat.percentage}% of overall trip
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="font-serif font-bold text-sm text-[#172A3A]">
                    {formatCurrency(displayAmount, currency)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Metrics Row (Financial travel notebook) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-[#D8C9B5]/70">
        <div className="bg-[#FFF9F0] p-3 rounded-lg border border-[#D8C9B5] text-center">
          <span className="text-[11px] uppercase tracking-wide font-medium text-[#746D65] block">
            Per Person
          </span>
          <span className="font-serif font-bold text-base text-[#172A3A] mt-1 block">
            {formatCurrency(perPersonTotal, currency)}
          </span>
        </div>

        <div className="bg-[#FFF9F0] p-3 rounded-lg border border-[#D8C9B5] text-center">
          <span className="text-[11px] uppercase tracking-wide font-medium text-[#746D65] block">
            Per Day (Group)
          </span>
          <span className="font-serif font-bold text-base text-[#172A3A] mt-1 block">
            {formatCurrency(perDayGroup, currency)}
          </span>
        </div>

        <div className="bg-[#FFF9F0] p-3 rounded-lg border border-[#D8C9B5] text-center">
          <span className="text-[11px] uppercase tracking-wide font-medium text-[#746D65] block">
            Spent / Planned
          </span>
          <span className="font-serif font-bold text-base text-[#C85C3A] mt-1 block">
            {formatCurrency(planned, currency)}
          </span>
        </div>

        <div className="bg-[#FFF9F0] p-3 rounded-lg border border-[#D8C9B5] text-center">
          <span className="text-[11px] uppercase tracking-wide font-medium text-[#D49A55] block">
            Remaining Buffer
          </span>
          <span className="font-serif font-bold text-base text-[#172A3A] mt-1 block">
            {formatCurrency(remaining, currency)}
          </span>
        </div>
      </div>
    </div>
  );
}
