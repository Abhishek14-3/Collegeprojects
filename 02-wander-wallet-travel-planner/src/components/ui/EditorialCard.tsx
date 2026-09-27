"use client";

import React from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export interface EditorialCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  variant?: "white" | "sand" | "cream";
  interactive?: boolean;
}

export function EditorialCard({
  children,
  className,
  variant = "white",
  interactive = false,
  ...props
}: EditorialCardProps) {
  const variantStyles = {
    white: "bg-[#FFF9F0] border-[#D8C9B5]",
    sand: "bg-[#FFF9F0] border-[#D8C9B5]",
    cream: "bg-[#F5EEE3] border-[#D8C9B5]",
  };

  return (
    <div
      className={twMerge(
        clsx(
          "rounded-xl border p-5 shadow-[0_2px_8px_-2px_rgba(23,42,58,0.06)] transition-all duration-200 text-left",
          variantStyles[variant],
          interactive &&
            "hover:border-[#172A3A] hover:shadow-[0_4px_16px_-4px_rgba(23,42,58,0.12)] cursor-pointer hover:-translate-y-0.5",
          className
        )
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function PolaroidCard({
  imageUrl,
  caption,
  rotation = "rotate-1",
  className,
}: {
  imageUrl: string;
  caption?: string;
  rotation?: string;
  className?: string;
}) {
  return (
    <div
      className={twMerge(
        clsx(
          "bg-[#FFF9F0] p-3 pb-4 rounded shadow-md border border-[#D8C9B5] inline-block max-w-[240px] transition-transform hover:rotate-0 hover:scale-105 duration-300",
          rotation,
          className
        )
      )}
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded bg-[#EAE1D3]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageUrl}
          alt={caption || "Travel snapshot"}
          className="w-full h-full object-cover"
        />
      </div>
      {caption && (
        <p className="mt-2 text-center text-xs font-hand text-[#746D65] tracking-wide">
          {caption}
        </p>
      )}
    </div>
  );
}
