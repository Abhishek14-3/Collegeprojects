import { NextRequest, NextResponse } from "next/server";
import { dbStore } from "@/lib/db/store";
import { prisma } from "@/lib/db/prisma";
import { runComparativeSpendAnalysis } from "@/lib/ai/comparative-analysis";
import { serializeBigInt } from "@/lib/utils/json";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: tripId } = await params;

    let trip: any = null;
    let members: any[] = [];
    let expenses: any[] = [];

    try {
      const dbTrip = await prisma.trip.findUnique({
        where: { id: tripId },
        include: { members: true, expenses: true },
      });
      if (dbTrip) {
        trip = dbTrip;
        members = dbTrip.members;
        expenses = dbTrip.expenses;
      }
    } catch (e) {
      console.warn("[Prisma comparative fetch fallback]:", e);
    }

    if (!trip) {
      trip = dbStore.getTrip(tripId);
      if (!trip) {
        return NextResponse.json(
          { success: false, error: "Trip not found" },
          { status: 404 }
        );
      }
      members = dbStore.getMembersByTrip(tripId);
      expenses = dbStore.getExpensesByTrip(tripId);
    }

    const report = await runComparativeSpendAnalysis({
      trip: {
        id: trip.id,
        title: trip.title,
        destination: trip.destination,
        currency: trip.currency || "INR",
        groupBudgetMinor: trip.groupBudgetMinor,
        initialBudgetMinor: trip.initialBudgetMinor,
        extraBudgetMinor: trip.extraBudgetMinor,
        categoryCaps: trip.categoryCaps,
        numberOfDays: trip.numberOfDays,
        numberOfTravelers: trip.numberOfTravelers,
      },
      members: members.map((m) => ({
        id: m.id,
        name: m.name || (m as any).inviteName || "Traveler",
        avatarUrl: m.avatarUrl,
        plannedContributionMinor: m.plannedContributionMinor,
        actualContributionMinor: m.actualContributionMinor,
      })),
      expenses: expenses.map((e) => ({
        id: e.id,
        title: e.title,
        category: e.category,
        amountMinor: e.amountMinor,
        convertedAmountMinor: e.convertedAmountMinor || e.amountMinor,
        currency: e.currency || "INR",
        payerId: e.payerId,
        date: e.date,
        itemizedDetails: e.itemizedDetails || null,
        participants: e.participants?.map((p: any) => ({
          memberId: p.memberId,
          shareAmountMinor: p.shareAmountMinor,
        })),
      })),
    });

    return NextResponse.json(
      serializeBigInt({
        success: true,
        tripId,
        report,
      })
    );
  } catch (error: any) {
    console.error("Comparative spend analysis error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to run comparative spend analysis" },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: tripId } = await params;
    const body = await req.json();
    const { action = "QUERY", prompt, extraAmountMinor } = body;

    let trip = dbStore.getTrip(tripId);
    if (!trip) {
      return NextResponse.json(
        { success: false, error: "Trip not found" },
        { status: 404 }
      );
    }

    // Handle Adding Extra Budget Top-Up
    if (action === "ADD_EXTRA_BUDGET") {
      const topUpMinor = BigInt(extraAmountMinor || "0");
      if (topUpMinor <= BigInt(0)) {
        return NextResponse.json(
          { success: false, error: "Top-up amount must be greater than zero." },
          { status: 400 }
        );
      }

      const updatedTrip = dbStore.addExtraBudget(tripId, topUpMinor);
      if (updatedTrip) {
        trip = updatedTrip;
      }

      // Add a notification for group visibility
      const topUpRs = Math.round(Number(topUpMinor) / 100);
      dbStore.addNotification({
        id: `notif-topup-${Date.now()}`,
        userId: trip.createdById,
        tripId,
        type: "TRIP_UPDATE",
        title: `Extra Budget Added: +₹${topUpRs.toLocaleString("en-IN")}`,
        message: `Group kitty has been topped up by ₹${topUpRs.toLocaleString("en-IN")}. Updated total budget: ₹${(Number(trip.groupBudgetMinor) / 100).toLocaleString("en-IN")}.`,
        isRead: false,
        createdAt: new Date().toISOString(),
      });
    }

    const members = dbStore.getMembersByTrip(tripId);
    const expenses = dbStore.getExpensesByTrip(tripId);

    // Re-run analysis with prompt (if provided) and updated budget
    const report = await runComparativeSpendAnalysis({
      trip: {
        id: trip.id,
        title: trip.title,
        destination: trip.destination,
        currency: trip.currency || "INR",
        groupBudgetMinor: trip.groupBudgetMinor,
        initialBudgetMinor: trip.initialBudgetMinor,
        extraBudgetMinor: trip.extraBudgetMinor,
        categoryCaps: trip.categoryCaps,
        numberOfDays: trip.numberOfDays,
        numberOfTravelers: trip.numberOfTravelers,
      },
      members: members.map((m) => ({
        id: m.id,
        name: m.name || (m as any).inviteName || "Traveler",
        avatarUrl: m.avatarUrl,
        plannedContributionMinor: m.plannedContributionMinor,
        actualContributionMinor: m.actualContributionMinor,
      })),
      expenses: expenses.map((e) => ({
        id: e.id,
        title: e.title,
        category: e.category,
        amountMinor: e.amountMinor,
        convertedAmountMinor: e.convertedAmountMinor || e.amountMinor,
        currency: e.currency || "INR",
        payerId: e.payerId,
        date: e.date,
        itemizedDetails: e.itemizedDetails || null,
        participants: e.participants?.map((p: any) => ({
          memberId: p.memberId,
          shareAmountMinor: p.shareAmountMinor,
        })),
      })),
      userQuery: prompt || null,
    });

    return NextResponse.json(
      serializeBigInt({
        success: true,
        tripId,
        report,
        message:
          action === "ADD_EXTRA_BUDGET"
            ? "Extra budget successfully added and re-evaluated."
            : "Query answered by Trip GPT.",
      })
    );
  } catch (error: any) {
    console.error("Comparative analysis query error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to process comparative analysis query" },
      { status: 500 }
    );
  }
}
