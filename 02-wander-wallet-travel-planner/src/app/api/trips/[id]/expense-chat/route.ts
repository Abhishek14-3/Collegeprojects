import { NextRequest, NextResponse } from "next/server";
import { dbStore } from "@/lib/db/store";
import { prisma } from "@/lib/db/prisma";
import { getCurrentSession } from "@/lib/auth/session";
import { processExpenseChatMessage, TripMemberContext } from "@/lib/ai/nlp-expense-engine";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: tripId } = await params;

    // 1. Fetch trip and members
    let trip: any = null;
    let members: TripMemberContext[] = [];

    try {
      const dbTrip = await prisma.trip.findUnique({
        where: { id: tripId },
        include: {
          members: true,
        },
      });

      if (dbTrip) {
        trip = dbTrip;
        members = dbTrip.members.map((m: any) => ({
          id: m.id,
          name: m.inviteName || m.name || "Member",
          role: m.role,
          avatarUrl: m.avatarUrl || null,
        }));
      }
    } catch (e) {
      console.warn("[Prisma expense-chat fetch note]:", e);
    }

    if (!trip) {
      trip = dbStore.getTrip(tripId);
      if (!trip) {
        return NextResponse.json(
          { success: false, error: "Trip not found" },
          { status: 404 }
        );
      }
      const storeMembers = dbStore.getMembersByTrip(tripId);
      members = storeMembers.map((m) => ({
        id: m.id,
        name: m.name,
        role: m.role,
        avatarUrl: m.avatarUrl || null,
      }));
    }

    // 2. Identify session / current user if available
    let currentUserId: string | undefined = undefined;
    try {
      const session = await getCurrentSession();
      if (session?.userId) {
        const found = members.find((m) => m.id === session.userId || (m as any).userId === session.userId);
        if (found) currentUserId = found.id;
      }
    } catch {
      // Non-blocking
    }

    // Fallback: organizer or first member
    if (!currentUserId && members.length > 0) {
      const organizer = members.find((m) => m.role === "ORGANIZER" || m.role === "OWNER");
      currentUserId = organizer?.id || members[0]?.id;
    }

    // 3. Parse request payload
    const body = await req.json();
    const {
      message,
      conversationHistory = [],
      attachedReceiptBase64,
      attachedReceiptMime,
      scannedReceiptData,
    } = body;

    if (!message && !attachedReceiptBase64 && !scannedReceiptData) {
      return NextResponse.json(
        { success: false, error: "Message, attached receipt, or scanned receipt data is required." },
        { status: 400 }
      );
    }

    // 4. Process with NLP Engine
    const result = await processExpenseChatMessage({
      message: message || "",
      conversationHistory,
      tripMembers: members,
      tripCurrency: trip.currency || "INR",
      currentUserId,
      attachedReceiptBase64,
      attachedReceiptMime,
      scannedReceiptData,
    });

    return NextResponse.json({
      success: true,
      reply: result.reply,
      expenseData: result.expenseData,
      tripMembers: members,
    });
  } catch (err: any) {
    console.error("[Expense Chat Route Error]:", err);
    return NextResponse.json(
      { success: false, error: err?.message || "Failed to process expense chat." },
      { status: 500 }
    );
  }
}
