import { NextRequest, NextResponse } from "next/server";
import { dbStore } from "@/lib/db/store";
import { prisma } from "@/lib/db/prisma";
import { getCurrentSession } from "@/lib/auth/session";
import { serializeBigInt } from "@/lib/utils/json";
import { calculateMemberBalances } from "@/lib/expenses/engine";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    let trip: any = null;
    let members: any[] = [];
    let expenses: any[] = [];
    let payments: any[] = [];

    try {
      const dbTrip = await prisma.trip.findUnique({
        where: { id },
        include: {
          members: true,
          expenses: {
            include: {
              participants: true,
            },
          },
        },
      });

      if (dbTrip) {
        trip = dbTrip;
        members = dbTrip.members.map((m) => ({
          ...m,
          plannedContributionMinor: m.plannedContributionMinor || BigInt(0),
          actualContributionMinor: m.actualContributionMinor || BigInt(0),
          plannedShareMinor: m.plannedShareMinor || BigInt(0),
          actualShareMinor: m.actualShareMinor || BigInt(0),
        }));
        expenses = dbTrip.expenses.map((e) => ({
          ...e,
          amountMinor: e.amountMinor,
          convertedAmountMinor: e.convertedAmountMinor || e.amountMinor,
          date: e.date.toISOString(),
          participants: e.participants.map((p) => ({
            id: p.id,
            memberId: p.memberId,
            shareAmountMinor: p.shareAmountMinor,
          })),
        }));
      }
    } catch (e) {
      console.warn("[Prisma trip fetch note]:", e);
    }

    if (!trip) {
      trip = dbStore.getTrip(id);
      if (!trip) {
        return NextResponse.json(
          { success: false, error: "Trip not found" },
          { status: 404 }
        );
      }
      members = dbStore.getMembersByTrip(id);
      expenses = dbStore.getExpensesByTrip(id);
      payments = dbStore.getPaymentsByTrip(id);
    }

    // Compute live financial totals server-side
    const totalSpendMinor = expenses.reduce((sum, e) => sum + e.convertedAmountMinor, BigInt(0));
    const remainingBudgetMinor = trip.groupBudgetMinor - totalSpendMinor;
    const budgetUtilizationPct =
      trip.groupBudgetMinor > BigInt(0)
        ? Number((totalSpendMinor * BigInt(10000)) / trip.groupBudgetMinor) / 100
        : 0;

    // Category breakdown
    const categoryTotals: Record<string, bigint> = {
      STAY: BigInt(0),
      TRANSPORT: BigInt(0),
      FOOD: BigInt(0),
      ACTIVITIES: BigInt(0),
      LOCAL_TRAVEL: BigInt(0),
      SHOPPING: BigInt(0),
      OTHER: BigInt(0),
    };

    let sharedSpendMinor = BigInt(0);
    let personalSpendMinor = BigInt(0);

    for (const exp of expenses) {
      if (categoryTotals[exp.category] !== undefined) {
        categoryTotals[exp.category] += exp.convertedAmountMinor;
      } else {
        categoryTotals["OTHER"] += exp.convertedAmountMinor;
      }

      if (exp.isPersonal) {
        personalSpendMinor += exp.convertedAmountMinor;
      } else {
        sharedSpendMinor += exp.convertedAmountMinor;
      }
    }

    // Dynamic Member Balances using deterministic engine
    const memberBalances = calculateMemberBalances(members, expenses, payments);

    // Compute Category Caps & Breach Alerts
    const { evaluateCategoryCapsAndBreaches, deriveDefaultCategoryCaps } = await import("@/lib/budget/caps");
    const activeCaps = trip.categoryCaps || deriveDefaultCategoryCaps(trip.groupBudgetMinor);
    const capsEvaluation = evaluateCategoryCapsAndBreaches({
      totalBudgetMinor: trip.groupBudgetMinor,
      categoryCaps: activeCaps,
      expenses,
      currency: trip.currency || "INR",
      alertThresholdPct: trip.alertThresholdPct || 80,
    });

    return NextResponse.json(
      serializeBigInt({
        success: true,
        trip: {
          ...trip,
          categoryCaps: activeCaps,
          alertThresholdPct: trip.alertThresholdPct || 80,
        },
        members,
        expenses,
        payments,
        stats: {
          totalBudgetMinor: trip.groupBudgetMinor,
          totalSpendMinor,
          remainingBudgetMinor,
          budgetUtilizationPct,
          sharedSpendMinor,
          personalSpendMinor,
          categoryTotals,
          memberBalances,
          capsEvaluation,
        },
      })
    );
  } catch (error: any) {
    console.error("Error fetching trip:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch trip details" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();

    const existingTrip = dbStore.getTrip(id);
    if (!existingTrip) {
      return NextResponse.json(
        { success: false, error: "Trip not found" },
        { status: 404 }
      );
    }

    const updates: any = {};
    if (body.title) updates.title = body.title;
    if (body.destination) updates.destination = body.destination;
    if (body.startDate) updates.startDate = body.startDate;
    if (body.endDate) updates.endDate = body.endDate;
    if (body.groupBudgetMinor !== undefined) updates.groupBudgetMinor = BigInt(body.groupBudgetMinor);
    if (body.numberOfTravelers !== undefined) updates.numberOfTravelers = Number(body.numberOfTravelers);
    if (body.travelStyle) updates.travelStyle = body.travelStyle;
    if (body.status) updates.status = body.status;
    if (body.alertThresholdPct !== undefined) updates.alertThresholdPct = Number(body.alertThresholdPct);
    if (body.categoryCaps !== undefined && typeof body.categoryCaps === "object") {
      const capsObj: Record<string, bigint> = {};
      for (const [k, v] of Object.entries(body.categoryCaps)) {
        capsObj[k.toUpperCase()] = BigInt(v as any);
      }
      updates.categoryCaps = capsObj;
    }

    const updated = dbStore.trips.set(id, {
      ...existingTrip,
      ...updates,
      updatedAt: new Date().toISOString(),
    });

    return NextResponse.json(
      serializeBigInt({
        success: true,
        trip: dbStore.getTrip(id),
        message: "Trip updated successfully",
      })
    );
  } catch (error: any) {
    console.error("Error updating trip:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update trip" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    try {
      await prisma.trip.delete({ where: { id } });
    } catch (dbErr) {
      console.warn("[Prisma] Trip delete note:", dbErr);
    }

    const deleted = dbStore.deleteTrip(id);
    if (!deleted) {
      return NextResponse.json(
        { success: false, error: "Trip not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Trip plan cancelled and removed successfully",
    });
  } catch (error: any) {
    console.error("Error deleting trip:", error);
    return NextResponse.json(
      { success: false, error: "Failed to cancel trip plan" },
      { status: 500 }
    );
  }
}
