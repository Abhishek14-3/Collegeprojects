import { NextRequest, NextResponse } from "next/server";
import { dbStore, StoreExpense } from "@/lib/db/store";
import { prisma } from "@/lib/db/prisma";
import { serializeBigInt } from "@/lib/utils/json";
import { calculateExpenseSplit, SplitMethod } from "@/lib/expenses/engine";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; expenseId: string }> }
) {
  try {
    const { id: tripId, expenseId } = await params;
    const expense = dbStore.getExpense(expenseId);

    if (!expense || expense.tripId !== tripId) {
      return NextResponse.json(
        { success: false, error: "Expense not found" },
        { status: 404 }
      );
    }

    const members = dbStore.getMembersByTrip(tripId);
    const memberMap = new Map(members.map((m) => [m.id, m]));
    const payer = memberMap.get(expense.payerId);

    return NextResponse.json(
      serializeBigInt({
        success: true,
        expense: {
          ...expense,
          payerName: payer?.name || "Unknown Payer",
          payerAvatar: payer?.avatarUrl || null,
          participants: expense.participants.map((p) => ({
            ...p,
            memberName: memberMap.get(p.memberId)?.name || "Unknown Member",
            memberAvatar: memberMap.get(p.memberId)?.avatarUrl || null,
          })),
        },
      })
    );
  } catch (error: any) {
    console.error("Error fetching expense:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch expense" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; expenseId: string }> }
) {
  try {
    const { id: tripId, expenseId } = await params;
    const existing = dbStore.getExpense(expenseId);

    if (!existing || existing.tripId !== tripId) {
      return NextResponse.json(
        { success: false, error: "Expense not found" },
        { status: 404 }
      );
    }

    const body = await req.json();
    const {
      title,
      category,
      amountMinor,
      payerId,
      date,
      splitMethod = existing.splitMethod,
      participants,
      isPersonal,
      isSettled,
    } = body;

    const updates: Partial<StoreExpense> = {};
    if (title) updates.title = title.trim();
    if (category) updates.category = category;
    if (date) updates.date = date;
    if (payerId) updates.payerId = payerId;
    if (isPersonal !== undefined) updates.isPersonal = Boolean(isPersonal);
    if (isSettled !== undefined) updates.isSettled = Boolean(isSettled);

    // If amount or participants or split method change, recalculate split
    if (amountMinor !== undefined || participants !== undefined || splitMethod !== existing.splitMethod) {
      const newAmount = amountMinor !== undefined ? BigInt(amountMinor) : existing.convertedAmountMinor;
      const rawParticipants = participants || existing.participants.map((p) => ({ memberId: p.memberId }));

      const splitResult = calculateExpenseSplit({
        totalAmountMinor: newAmount,
        splitMethod: splitMethod as SplitMethod,
        participants: rawParticipants.map((p: any) => ({
          memberId: p.memberId,
          exactAmountMinor: p.exactAmountMinor !== undefined ? BigInt(p.exactAmountMinor) : undefined,
          percentage: p.percentage !== undefined ? Number(p.percentage) : undefined,
          customAmountMinor: p.customAmountMinor !== undefined ? BigInt(p.customAmountMinor) : undefined,
        })),
      });

      if (!splitResult.isValid) {
        return NextResponse.json(
          { success: false, error: splitResult.errorMessage || "Invalid split update" },
          { status: 400 }
        );
      }

      updates.amountMinor = newAmount;
      updates.convertedAmountMinor = newAmount;
      updates.splitMethod = splitMethod;
      updates.participants = splitResult.participants.map((p, idx) => ({
        id: `ep-${Date.now()}-${idx}`,
        expenseId,
        memberId: p.memberId,
        shareAmountMinor: p.amountMinor,
        percentage: p.percentage,
      }));
    }

    const updated = dbStore.updateExpense(expenseId, updates);

    return NextResponse.json(
      serializeBigInt({
        success: true,
        expense: updated,
        message: "Expense updated successfully",
      })
    );
  } catch (error: any) {
    console.error("Error updating expense:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update expense" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; expenseId: string }> }
) {
  try {
    const { id: tripId, expenseId } = await params;
    const existing = dbStore.getExpense(expenseId);

    if (!existing || existing.tripId !== tripId) {
      return NextResponse.json(
        { success: false, error: "Expense not found" },
        { status: 404 }
      );
    }

    dbStore.deleteExpense(expenseId);

    try {
      await prisma.expense.delete({ where: { id: expenseId } });
    } catch (e) {
      console.warn("[Prisma] Expense delete note:", e);
    }

    return NextResponse.json({
      success: true,
      message: "Expense deleted successfully",
    });
  } catch (error: any) {
    console.error("Error deleting expense:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete expense" },
      { status: 500 }
    );
  }
}
