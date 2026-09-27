"use client";

import React, { forwardRef } from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, leftIcon, rightIcon, className, id, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

    return (
      <div className="w-full flex flex-col gap-1.5 text-left">
        {label && (
          <label
            htmlFor={inputId}
            className="text-xs font-semibold tracking-wide uppercase text-[#746D65]"
          >
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {leftIcon && (
            <div className="absolute left-3.5 text-[#746D65] pointer-events-none">
              {leftIcon}
            </div>
          )}
          <input
            id={inputId}
            ref={ref}
            className={twMerge(
              clsx(
                "w-full bg-[#FFF9F0] border border-[#D8C9B5] text-[#292726] placeholder-[#968E85] text-sm rounded-lg px-3.5 py-2.5 transition-colors focus:outline-none focus:ring-2 focus:ring-[#172A3A] focus:border-transparent disabled:bg-[#EAE1D3]/30 disabled:text-[#968E85]",
                leftIcon && "pl-10",
                rightIcon && "pr-10",
                error && "border-[#B53434] focus:ring-[#B53434]",
                className
              )
            )}
            {...props}
          />
          {rightIcon && (
            <div className="absolute right-3.5 text-[#746D65]">{rightIcon}</div>
          )}
        </div>
        {error && <span className="text-xs text-[#B53434]">{error}</span>}
        {hint && !error && <span className="text-xs text-[#968E85]">{hint}</span>}
      </div>
    );
  }
);

Input.displayName = "Input";
