"use client";

import React from "react";
import { Minus, Plus } from "lucide-react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export interface NumberStepperProps {
  label?: string;
  value: number;
  min?: number;
  max?: number;
  onChange: (val: number) => void;
  className?: string;
  suffix?: string;
}

export function NumberStepper({
  label,
  value,
  min = 1,
  max = 50,
  onChange,
  className,
  suffix = "travelers",
}: NumberStepperProps) {
  const handleDecrement = () => {
    if (value > min) onChange(value - 1);
  };

  const handleIncrement = () => {
    if (value < max) onChange(value + 1);
  };

  return (
    <div className={twMerge(clsx("flex flex-col gap-1.5 text-left", className))}>
      {label && (
        <label className="text-xs font-semibold tracking-wide uppercase text-[#746D65]">
          {label}
        </label>
      )}
      <div className="flex items-center bg-[#FFF9F0] border border-[#D8C9B5] rounded-lg p-1 w-full max-w-[200px] justify-between">
        <button
          type="button"
          onClick={handleDecrement}
          disabled={value <= min}
          aria-label="Decrease"
          className="w-8 h-8 flex items-center justify-center rounded-md bg-[#EAE1D3]/50 text-[#172A3A] hover:bg-[#EAE1D3] transition disabled:opacity-30 disabled:cursor-not-allowed active:scale-95"
        >
          <Minus className="w-3.5 h-3.5" />
        </button>

        <span className="font-semibold text-sm text-[#292726] px-3 font-sans">
          {value} {suffix && <span className="font-normal text-xs text-[#746D65]">{suffix}</span>}
        </span>

        <button
          type="button"
          onClick={handleIncrement}
          disabled={value >= max}
          aria-label="Increase"
          className="w-8 h-8 flex items-center justify-center rounded-md bg-[#172A3A] text-[#FFF9F0] hover:bg-[#233d52] transition disabled:opacity-30 disabled:cursor-not-allowed active:scale-95"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
