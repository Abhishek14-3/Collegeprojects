"use client";

import React from "react";
import { Clock, MapPin, DollarSign, Utensils, Compass, Bus, Bed, Zap, CheckCircle } from "lucide-react";
import { GeneratedItineraryDay, GeneratedItineraryItem } from "@/lib/itinerary/engine";

export interface DayTimelineProps {
  day: GeneratedItineraryDay;
  onItemClick?: (item: GeneratedItineraryItem) => void;
  selectedItemId?: string;
  onActualizeItem?: (item: GeneratedItineraryItem, day: GeneratedItineraryDay) => void;
  actualizedItemIds?: string[];
  isActualizingId?: string | null;
}

export function DayTimeline({
  day,
  onItemClick,
  selectedItemId,
  onActualizeItem,
  actualizedItemIds,
  isActualizingId,
}: DayTimelineProps) {
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "food":
        return <Utensils className="w-3.5 h-3.5 text-[#C85C3A]" />;
      case "activity":
        return <Compass className="w-3.5 h-3.5 text-[#D49A55]" />;
      case "transport":
        return <Bus className="w-3.5 h-3.5 text-[#172A3A]" />;
      case "stay":
        return <Bed className="w-3.5 h-3.5 text-[#172A3A]" />;
      default:
        return <Clock className="w-3.5 h-3.5 text-[#746D65]" />;
    }
  };

  return (
    <div className="w-full flex flex-col gap-6">
      {/* Day Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-[#D8C9B5]/70">
        <div>
          <div className="flex items-center gap-3">
            <h3 className="font-serif text-2xl font-bold text-[#172A3A]">
              Day {day.dayNumber}: {day.title}
            </h3>
            {day.theme && (
              <span className="font-hand text-lg text-[#C85C3A] tracking-wide hidden md:inline">
                ~ {day.theme}
              </span>
            )}
          </div>
          <span className="text-xs text-[#746D65] font-medium">{day.date}</span>
        </div>

        {/* Day Total Badge */}
        <div className="flex items-center gap-2 bg-[#FFF9F0] border border-[#D8C9B5] px-4 py-1.5 rounded-lg self-start sm:self-auto">
          <span className="text-xs uppercase tracking-wider font-semibold text-[#746D65]">
            Day Total:
          </span>
          <span className="font-serif text-base font-bold text-[#172A3A]">
            {day.formattedDayTotal}
          </span>
        </div>
      </div>

      {/* Timeline items list */}
      <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-[#172A3A]">
        {day.items.map((item) => {
          const isSelected = selectedItemId === item.id;

          return (
            <div
              key={item.id}
              onClick={() => onItemClick?.(item)}
              className={`relative group cursor-pointer transition-all duration-200 ${
                isSelected ? "scale-[1.01]" : ""
              }`}
            >
              {/* Bullet circle on timeline rail */}
              <div
                className={`absolute -left-6 top-1.5 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                  isSelected
                    ? "bg-[#C85C3A] border-[#172A3A] text-white"
                    : "bg-[#FFF9F0] border-[#C85C3A] group-hover:border-[#172A3A]"
                }`}
              >
                <div className="w-1.5 h-1.5 rounded-full bg-[#C85C3A]" />
              </div>

              {/* Item Card */}
              <div
                className={`p-4 rounded-xl border transition-all text-left ${
                  isSelected
                    ? "bg-[#FFF9F0] border-[#172A3A] shadow-md ring-1 ring-[#172A3A]"
                    : "bg-[#FFF9F0] border-[#D8C9B5] hover:border-[#172A3A]/60 hover:shadow-sm"
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  {/* Left info */}
                  <div className="flex flex-col gap-1">
                    {/* Timestamp & Tag */}
                    <div className="flex items-center gap-2 text-xs font-semibold text-[#746D65]">
                      <span className="font-mono text-[#172A3A] bg-[#EAE1D3]/70 px-2 py-0.5 rounded">
                        {item.startTime} {item.endTime ? `– ${item.endTime}` : ""}
                      </span>
                      {item.timeSlot && (
                        <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-[#163F38]/10 text-[#163F38] border border-[#163F38]/20">
                          {item.timeSlot}
                        </span>
                      )}
                      <span className="flex items-center gap-1 uppercase tracking-wider text-[10px]">
                        {getCategoryIcon(item.category)}
                        {item.category}
                      </span>
                    </div>

                    {/* Title */}
                    <h4 className="font-serif font-bold text-base text-[#292726] mt-0.5">
                      {item.title}
                    </h4>

                    {/* Location */}
                    {item.location && (
                      <div className="flex items-center gap-1 text-xs text-[#746D65]">
                        <MapPin className="w-3.5 h-3.5 text-[#C85C3A] flex-shrink-0" />
                        <span>{item.location}</span>
                      </div>
                    )}

                    {/* Notes */}
                    {item.notes && (
                      <p className="text-xs text-[#746D65] italic mt-1">{item.notes}</p>
                    )}
                  </div>

                  {/* Cost Pill & One-Tap Actualize Action */}
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    {item.costMinor > BigInt(0) && !item.formattedCost.includes("PRICE_UNAVAILABLE") ? (
                      <span className="text-xs font-serif font-bold px-2.5 py-1 rounded-md border bg-[#F7EEDB] text-[#8C5D1E] border-[#D49A55]">
                        {item.formattedCost}
                      </span>
                    ) : (
                      <span
                        className="text-[10px] font-mono font-bold px-2.5 py-1 rounded-md border bg-amber-50 text-amber-900 border-amber-300 shadow-2xs"
                        title="Live price unavailable from provider — will not be guessed"
                      >
                        PRICE_UNAVAILABLE
                      </span>
                    )}

                    {/* Actualized vs One-Tap Actualize CTA */}
                    {actualizedItemIds && (actualizedItemIds.includes(item.id) || actualizedItemIds.includes(item.title)) ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-2xs">
                        <CheckCircle className="w-3 h-3 text-emerald-600" />
                        <span>In Ledger</span>
                      </span>
                    ) : onActualizeItem ? (
                      <button
                        type="button"
                        disabled={isActualizingId === item.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          onActualizeItem(item, day);
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-[#163F38] to-[#23584e] hover:from-[#11322d] hover:to-[#163F38] text-white text-[11px] font-bold shadow-2xs hover:shadow-xs hover:scale-105 active:scale-95 transition-all cursor-pointer border border-white/20 disabled:opacity-60"
                        title="One-Tap log this scheduled activity as a shared group expense"
                      >
                        <Zap className={`w-3 h-3 text-[#C9A35B] ${isActualizingId === item.id ? "animate-spin" : ""}`} />
                        <span>{isActualizingId === item.id ? "Logging..." : "⚡ Actualize"}</span>
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
