import { NextRequest, NextResponse } from "next/server";
import { dbStore, StoreExpense } from "@/lib/db/store";
import { prisma } from "@/lib/db/prisma";
import { getCurrentSession } from "@/lib/auth/session";
import { serializeBigInt } from "@/lib/utils/json";
import { calculateExpenseSplit, SplitMethod } from "@/lib/expenses/engine";
import { currencyProvider } from "@/lib/providers";

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

    const expenses = dbStore.getExpensesByTrip(tripId);
    const members = dbStore.getMembersByTrip(tripId);
    const memberMap = new Map(members.map((m) => [m.id, m]));

    // Enrich expenses with member details
    const enrichedExpenses = expenses.map((exp) => {
      const payer = memberMap.get(exp.payerId);
      const participantsWithDetails = exp.participants.map((p) => {
        const mem = memberMap.get(p.memberId);
        return {
          ...p,
          memberName: mem?.name || "Unknown Member",
          memberAvatar: mem?.avatarUrl || null,
        };
      });

      return {
        ...exp,
        payerName: payer?.name || "Unknown Payer",
        payerAvatar: payer?.avatarUrl || null,
        participants: participantsWithDetails,
      };
    });

    // Compute Category and Spend Summaries
    const categoryTotals: Record<string, bigint> = {};
    let totalSpendMinor = BigInt(0);
    let sharedSpendMinor = BigInt(0);
    let personalSpendMinor = BigInt(0);

    for (const exp of expenses) {
      totalSpendMinor += exp.convertedAmountMinor;
      categoryTotals[exp.category] = (categoryTotals[exp.category] || BigInt(0)) + exp.convertedAmountMinor;

      if (exp.isPersonal) {
        personalSpendMinor += exp.convertedAmountMinor;
      } else {
        sharedSpendMinor += exp.convertedAmountMinor;
      }
    }

    return NextResponse.json(
      serializeBigInt({
        success: true,
        tripId,
        expenses: enrichedExpenses,
        summary: {
          totalSpendMinor,
          sharedSpendMinor,
          personalSpendMinor,
          categoryTotals,
          expenseCount: expenses.length,
        },
      })
    );
  } catch (error: any) {
    console.error("Error fetching expenses:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch expenses" },
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
    const trip = dbStore.getTrip(tripId);

    if (!trip) {
      return NextResponse.json(
        { success: false, error: "Trip not found" },
        { status: 404 }
      );
    }

    const body = await req.json();
    const {
      payerId,
      title,
      category,
      amountMinor,
      currency = trip.currency || "INR",
      date = new Date().toISOString(),
      splitMethod = "EQUAL",
      participants = [],
      isPersonal = false,
      receiptUrl,
      itemizedDetails,
    } = body;

    // 1. Validate mandatory fields
    if (!title || !title.trim()) {
      return NextResponse.json(
        { success: false, error: "Description/title is required" },
        { status: 400 }
      );
    }

    if (!payerId) {
      return NextResponse.json(
        { success: false, error: "Payer is required" },
        { status: 400 }
      );
    }

    const totalAmount = BigInt(amountMinor || 0);
    if (totalAmount <= BigInt(0)) {
      return NextResponse.json(
        { success: false, error: "Amount must be a positive number greater than zero" },
        { status: 400 }
      );
    }

    // 2. Validate trip members
    const tripMembers = dbStore.getMembersByTrip(tripId);
    const validMemberIds = new Set(tripMembers.map((m) => m.id));

    if (!validMemberIds.has(payerId)) {
      return NextResponse.json(
        { success: false, error: "Payer is not a member of this trip" },
        { status: 400 }
      );
    }

    // Default participants to all trip members if empty
    const rawParticipantList =
      Array.isArray(participants) && participants.length > 0
        ? participants
        : tripMembers.map((m) => ({ memberId: m.id }));

    for (const p of rawParticipantList) {
      if (!validMemberIds.has(p.memberId)) {
        return NextResponse.json(
          { success: false, error: `Participant ID ${p.memberId} is not a valid trip member` },
          { status: 400 }
        );
      }
    }

    // 3. Currency conversion if expense currency differs from base
    let exchangeRate = 1.0;
    let convertedAmountMinor = totalAmount;

    if (currency.toUpperCase() !== trip.currency.toUpperCase()) {
      try {
        const rateInfo = await currencyProvider.getRate(currency.toUpperCase(), trip.currency.toUpperCase());
        exchangeRate = rateInfo.rate;
        convertedAmountMinor = BigInt(Math.round(Number(totalAmount) * exchangeRate));
      } catch (err) {
        console.warn("Currency conversion failed, falling back to 1.0", err);
      }
    }

    // 4. Deterministic split calculation using minor units
    const splitResult = calculateExpenseSplit({
      totalAmountMinor: convertedAmountMinor,
      splitMethod: splitMethod as SplitMethod,
      participants: rawParticipantList.map((p) => ({
        memberId: p.memberId,
        exactAmountMinor: p.exactAmountMinor !== undefined ? BigInt(p.exactAmountMinor) : undefined,
        percentage: p.percentage !== undefined ? Number(p.percentage) : undefined,
        customAmountMinor: p.customAmountMinor !== undefined ? BigInt(p.customAmountMinor) : undefined,
      })),
    });

    if (!splitResult.isValid) {
      return NextResponse.json(
        { success: false, error: splitResult.errorMessage || "Invalid expense split calculation" },
        { status: 400 }
      );
    }

    // 5. Create expense record
    const expenseId = `exp-${Date.now()}`;
    const newExpense: StoreExpense = {
      id: expenseId,
      tripId,
      payerId,
      title: title.trim(),
      category: category || "OTHER",
      amountMinor: totalAmount,
      currency: currency.toUpperCase(),
      convertedAmountMinor,
      baseCurrency: trip.currency,
      exchangeRate,
      date,
      splitMethod: splitMethod as any,
      receiptUrl: receiptUrl || null,
      isPersonal: Boolean(isPersonal),
      isSettled: false,
      createdAt: new Date().toISOString(),
      itemizedDetails: itemizedDetails || null,
      participants: splitResult.participants.map((p, idx) => ({
        id: `ep-${Date.now()}-${idx}`,
        expenseId,
        memberId: p.memberId,
        shareAmountMinor: p.amountMinor,
        percentage: p.percentage,
      })),
    };

    dbStore.addExpense(newExpense);

    // Persist to Supabase via Prisma (triggers Supabase Realtime WebSocket broadcast)
    try {
      await prisma.expense.create({
        data: {
          id: expenseId,
          tripId,
          payerId,
          title: title.trim(),
          category: (category && ["STAY", "TRANSPORT", "FOOD", "ACTIVITIES", "LOCAL_TRAVEL", "BUFFER", "SHOPPING", "OTHER"].includes(category)) ? category : "OTHER",
          amountMinor: totalAmount,
          currency: currency.toUpperCase(),
          convertedAmountMinor,
          baseCurrency: trip.currency,
          exchangeRate,
          date: new Date(date),
          receiptUrl: receiptUrl || null,
          participants: {
            create: splitResult.participants.map((p) => ({
              memberId: p.memberId,
              shareAmountMinor: p.amountMinor,
            })),
          },
        },
      });
    } catch (dbErr) {
      console.warn("[Prisma] Expense persistence note:", dbErr);
    }

    // Notify trip owner / payer
    const payerMember = tripMembers.find((m) => m.id === payerId);
    dbStore.addNotification({
      id: `notif-${Date.now()}`,
      userId: trip.createdById,
      tripId,
      type: "EXPENSE_ADDED",
      title: "New Expense Added",
      message: `${payerMember?.name || "A member"} added "${title}" (${trip.currency || "INR"} ${(Number(convertedAmountMinor) / 100).toLocaleString("en-IN")}) split among ${splitResult.participants.length} travelers.`,
      isRead: false,
      createdAt: new Date().toISOString(),
    });

    // 6. Check for Category Cap or Total Trip Budget breach after recording this expense
    const { evaluateCategoryCapsAndBreaches, deriveDefaultCategoryCaps } = await import("@/lib/budget/caps");
    const allExpenses = dbStore.getExpensesByTrip(tripId);
    const activeCaps = trip.categoryCaps || deriveDefaultCategoryCaps(trip.groupBudgetMinor);
    const capsResult = evaluateCategoryCapsAndBreaches({
      totalBudgetMinor: trip.groupBudgetMinor,
      categoryCaps: activeCaps,
      expenses: allExpenses,
      currency: trip.currency || "INR",
      alertThresholdPct: trip.alertThresholdPct || 80,
    });

    // If newly breached, also fire a high-visibility in-app notification
    if (capsResult.activeAlerts.length > 0) {
      for (const alert of capsResult.activeAlerts.filter((a) => a.level === "BREACH")) {
        dbStore.addNotification({
          id: `notif-breach-${Date.now()}-${alert.scope}-${alert.category || "total"}`,
          userId: trip.createdById,
          tripId,
          type: "BUDGET_WARNING",
          title: `Budget Breach: ${alert.categoryLabel || "Trip Total"}`,
          message: alert.message,
          isRead: false,
          createdAt: new Date().toISOString(),
        });
      }
    }

    return NextResponse.json(
      serializeBigInt({
        success: true,
        expense: newExpense,
        capsEvaluation: capsResult,
        activeAlerts: capsResult.activeAlerts,
        message: "Expense recorded successfully",
      }),
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Error creating expense:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create expense" },
      { status: 500 }
    );
  }
}
