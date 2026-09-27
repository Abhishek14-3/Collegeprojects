"use client";

import React from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "accent" | "sand" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
  icon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export function Button({
  children,
  className,
  variant = "primary",
  size = "md",
  isLoading = false,
  disabled,
  icon,
  rightIcon,
  ...props
}: ButtonProps) {
  const baseStyles =
    "inline-flex items-center justify-center font-sans font-medium transition-all duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed select-none active:scale-[0.98]";

  const variantStyles = {
    // Midnight Navy - primary navigation, budget totals & definitive structure
    primary:
      "bg-[#172A3A] text-[#FFF9F0] hover:bg-[#233d52] focus:ring-[#172A3A] shadow-sm",
    // Terracotta - primary CTA & conversion buttons (Plan Your Trip, Next, Confirm)
    accent:
      "bg-[#C85C3A] text-[#FFF9F0] hover:bg-[#b34f2f] focus:ring-[#C85C3A] shadow-sm",
    // Soft Ivory / Sand - subtle editorial secondary
    sand:
      "bg-[#FFF9F0] text-[#172A3A] hover:bg-[#EAE1D3] focus:ring-[#D49A55] border border-[#D8C9B5]",
    // Clean Outline - 1px warm taupe border
    outline:
      "border border-[#172A3A] text-[#172A3A] bg-transparent hover:bg-[#172A3A]/5 focus:ring-[#172A3A]",
    // Ghost
    ghost:
      "text-[#292726] hover:bg-[#EAE1D3]/50 focus:ring-[#172A3A]",
    // Danger
    danger:
      "bg-[#B53434] text-[#FFF9F0] hover:bg-[#962626] focus:ring-[#B53434]",
  };

  const sizeStyles = {
    sm: "text-xs px-3 py-1.5 rounded-md gap-1.5",
    md: "text-sm px-5 py-2.5 rounded-lg gap-2",
    lg: "text-base px-6 py-3 rounded-lg gap-2.5 font-semibold",
  };

  return (
    <button
      className={twMerge(
        clsx(baseStyles, variantStyles[variant], sizeStyles[size], className)
      )}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : (
        icon
      )}
      {children}
      {!isLoading && rightIcon}
    </button>
  );
}
