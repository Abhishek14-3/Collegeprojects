"use client";

import React from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export interface BadgeProps {
  children: React.ReactNode;
  variant?: "ochre" | "gold" | "terracotta" | "navy" | "forest" | "sand" | "outline" | "sage";
  size?: "sm" | "md";
  className?: string;
  icon?: React.ReactNode;
}

export function Badge({
  children,
  variant = "sand",
  size = "sm",
  className,
  icon,
}: BadgeProps) {
  const variantStyles = {
    // Ochre - Premium highlights & coordinates
    ochre: "bg-[#F7EEDB] text-[#8C5D1E] border border-[#D49A55]",
    gold: "bg-[#F7EEDB] text-[#8C5D1E] border border-[#D49A55]",
    // Terracotta - Urgent / spending / interactive highlight
    terracotta: "bg-[#FDF0EB] text-[#C85C3A] border border-[#E9BFB2]",
    // Navy - Primary structure & passport stamps
    navy: "bg-[#172A3A] text-[#FFF9F0] border border-[#0f1d28]",
    forest: "bg-[#172A3A] text-[#FFF9F0] border border-[#0f1d28]",
    // Sand - Editorial Neutral
    sand: "bg-[#EAE1D3] text-[#292726] border border-[#D8C9B5]",
    // Outline
    outline: "border border-[#D8C9B5] text-[#746D65] bg-transparent",
    // Sage alias mapped to Ochre (NO GREEN)
    sage: "bg-[#F7EEDB] text-[#8C5D1E] border border-[#D49A55]",
  };

  const sizeStyles = {
    sm: "text-[11px] px-2 py-0.5 rounded-full font-medium tracking-wide",
    md: "text-xs px-2.5 py-1 rounded-full font-medium tracking-wide",
  };

  return (
    <span
      className={twMerge(
        clsx(
          "inline-flex items-center gap-1 font-sans select-none",
          variantStyles[variant],
          sizeStyles[size],
          className
        )
      )}
    >
      {icon}
      {children}
    </span>
  );
}

export function StampBadge({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={twMerge(
        clsx(
          "inline-flex items-center px-2 py-0.5 border border-dashed border-[#C85C3A] text-[#C85C3A] bg-[#FFF9F0] rounded text-[10px] uppercase tracking-wider font-semibold font-sans select-none",
          className
        )
      )}
    >
      {children}
    </span>
  );
}
