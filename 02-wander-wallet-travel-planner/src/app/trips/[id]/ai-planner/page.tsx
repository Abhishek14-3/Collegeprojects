"use client";

import { use } from "react";
import { AIPlannerWorkspace } from "@/components/planner/AIPlannerWorkspace";

export default function TripAIPlannerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const tripId = resolvedParams.id;

  return <AIPlannerWorkspace initialTripId={tripId} />;
}

