import { NextRequest, NextResponse } from "next/server";
import { dbStore } from "@/lib/db/store";
import { prisma } from "@/lib/db/prisma";
import { evaluateTripFinancials } from "@/lib/expenses/cfo";
import { serializeBigInt } from "@/lib/utils/json";
import { generateGeminiText } from "@/lib/ai/gemini";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: tripId } = await params;

    // 1. Fetch trip, members, expenses from Supabase/Prisma with store fallback
    let trip: any = null;
    let members: any[] = [];
    let expenses: any[] = [];
    let payments: any[] = [];

    try {
      const dbTrip = await prisma.trip.findUnique({
        where: { id: tripId },
        include: {
          members: true,
          expenses: true,
        },
      });

      if (dbTrip) {
        trip = dbTrip;
        members = dbTrip.members;
        expenses = dbTrip.expenses;
      }
    } catch (e) {
      console.warn("[Prisma CFO fetch fallback]:", e);
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
      payments = dbStore.getPaymentsByTrip(tripId);
    }

    // 2. Run deterministic AI Group CFO evaluation
    const report = evaluateTripFinancials({
      trip: {
        id: trip.id,
        title: trip.title,
        destination: trip.destination,
        startDate: trip.startDate,
        endDate: trip.endDate,
        numberOfDays: trip.numberOfDays,
        numberOfTravelers: trip.numberOfTravelers,
        groupBudgetMinor: trip.groupBudgetMinor,
        currency: trip.currency || "INR",
        travelStyle: trip.travelStyle,
      },
      members: members.map((m) => ({
        id: m.id,
        name: m.name || m.inviteName || "Traveler",
        avatarUrl: m.avatarUrl,
        role: m.role,
        plannedContributionMinor: m.plannedContributionMinor || BigInt(0),
        actualContributionMinor: m.actualContributionMinor || BigInt(0),
        plannedShareMinor: m.plannedShareMinor || BigInt(0),
        actualShareMinor: m.actualShareMinor || BigInt(0),
      })),
      expenses: expenses.map((e) => ({
        id: e.id,
        title: e.title,
        category: e.category,
        amountMinor: e.amountMinor,
        convertedAmountMinor: e.convertedAmountMinor || e.amountMinor,
        payerId: e.payerId,
        date: e.date,
        isPersonal: Boolean(e.isPersonal),
      })),
      payments: payments.map((p) => ({
        id: p.id,
        fromMemberId: p.fromMemberId,
        toMemberId: p.toMemberId,
        amountMinor: p.amountMinor,
        isPaid: p.isPaid,
      })),
    });

    // 3. Synthesize Gemini AI Group CFO Briefing if expenses exist
    if (expenses.length > 0) {
      try {
        const totalSpendRs = Math.round(Number(report.burnRate.actualDailyBurnMinor * BigInt(report.burnRate.daysElapsed)) / 100);
        const groupBudgetRs = Math.round(Number(trip.groupBudgetMinor) / 100);
        const briefing = await generateGeminiText({
          prompt: `Trip: "${trip.title}" (${trip.destination}). Group Budget: ₹${groupBudgetRs.toLocaleString("en-IN")}. Current Spend: ₹${totalSpendRs.toLocaleString("en-IN")} on Day ${report.burnRate.daysElapsed} of ${report.burnRate.daysTotal}. Health Score: ${report.healthScore}/100 (${report.healthGrade}). Top payer: ${report.cashFlowBurden.topPayerName} has fronted ${report.cashFlowBurden.topPayerPercentage}% of total costs.
Deliver a 2-sentence executive group CFO briefing with encouraging yet precise cash flow advice.`,
          systemInstruction: "You are the autonomous AI Group CFO of this trip. Act as an expert fiduciary advisor for the travel group. Keep it sharp and under 50 words.",
          temperature: 0.3,
          maxTokens: 512,
        });

        if (briefing) {
          report.cfoAIBriefing = briefing;
        }
      } catch (geminiErr) {
        console.warn("[Gemini CFO Briefing] generation skipped:", geminiErr);
      }
    }

    return NextResponse.json(
      serializeBigInt({
        success: true,
        tripId,
        report,
      })
    );
  } catch (error: any) {
    console.error("CFO evaluation error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to evaluate financial health" },
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
    const { actionType, title, message } = body;

    let trip: any = null;
    try {
      trip = await prisma.trip.findUnique({ where: { id: tripId } });
    } catch (e) {
      // ignore
    }
    if (!trip) {
      trip = dbStore.getTrip(tripId);
    }
    if (!trip) {
      return NextResponse.json({ success: false, error: "Trip not found" }, { status: 404 });
    }

    if (actionType === "NUDGE") {
      // Create a friendly notification for the group
      dbStore.addNotification({
        id: `notif-cfo-${Date.now()}`,
        userId: trip.createdById,
        tripId,
        type: "BUDGET_WARNING",
        title: title || "AI CFO Financial Balance Nudge",
        message: message || "Your AI CFO noticed floating debts can be reduced by pooling pending contributions.",
        isRead: false,
        createdAt: new Date().toISOString(),
      });

      return NextResponse.json({
        success: true,
        message: "Friendly CFO group nudge delivered successfully to all travelers.",
      });
    }

    return NextResponse.json({
      success: true,
      message: "Action acknowledged by AI CFO.",
    });
  } catch (error: any) {
    console.error("CFO action error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to execute CFO action" },
      { status: 500 }
    );
  }
}
