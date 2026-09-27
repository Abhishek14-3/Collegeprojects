"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { AIPlannerWorkspace } from "@/components/planner/AIPlannerWorkspace";

function AIPlannerContent() {
  const searchParams = useSearchParams();
  const tripId = searchParams.get("tripId") || undefined;

  return <AIPlannerWorkspace initialTripId={tripId} />;
}

export default function GlobalAIPlannerPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen dot-grid-paper flex items-center justify-center text-xs text-[#746D65]">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-[#172A3A] border-t-transparent rounded-full animate-spin" />
            <span>Loading Wander Desk...</span>
          </div>
        </div>
      }
    >
      <AIPlannerContent />
    </Suspense>
  );
}
