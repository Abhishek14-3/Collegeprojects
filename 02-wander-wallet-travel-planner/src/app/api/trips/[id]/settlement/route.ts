import { NextRequest, NextResponse } from "next/server";
import { dbStore } from "@/lib/db/store";
import { serializeBigInt } from "@/lib/utils/json";
import { calculateMemberBalances } from "@/lib/expenses/engine";
import { calculateSimplifiedSettlements } from "@/lib/settlement/engine";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: tripId } = await params;
    const trip = dbStore.getTrip(tripId);

    if (!trip) {
      return NextResponse.json(
        { success: false, error: "Trip not found" },
        { status: 404 }
      );
    }

    const members = dbStore.getMembersByTrip(tripId);
    const expenses = dbStore.getExpensesByTrip(tripId);
    const payments = dbStore.getPaymentsByTrip(tripId);

    // 1. Calculate net balances per member
    const balances = calculateMemberBalances(members, expenses, payments);

    // 2. Calculate simplified min-cash-flow settlement plan
    const settlementPlan = calculateSimplifiedSettlements(
      tripId,
      balances,
      payments,
      trip.currency || "INR"
    );

    return NextResponse.json(
      serializeBigInt({
        success: true,
        settlement: settlementPlan,
        recordedPayments: payments,
      })
    );
  } catch (error: any) {
    console.error("Error calculating settlement:", error);
    return NextResponse.json(
      { success: false, error: "Failed to calculate settlement" },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Recalculates and confirms settlement state
  return GET(req, { params });
}
