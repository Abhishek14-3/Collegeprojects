import { NextRequest, NextResponse } from "next/server";
import { dbStore, StorePayment } from "@/lib/db/store";
import { serializeBigInt } from "@/lib/utils/json";

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
      fromMemberId,
      toMemberId,
      amountMinor,
      currency = trip.currency || "INR",
      paymentReference,
      isPaid = true,
    } = body;

    if (!fromMemberId || !toMemberId) {
      return NextResponse.json(
        { success: false, error: "Both sender and recipient member IDs are required" },
        { status: 400 }
      );
    }

    if (fromMemberId === toMemberId) {
      return NextResponse.json(
        { success: false, error: "Cannot record payment to oneself" },
        { status: 400 }
      );
    }

    const amount = BigInt(amountMinor || 0);
    if (amount <= BigInt(0)) {
      return NextResponse.json(
        { success: false, error: "Payment amount must be greater than zero" },
        { status: 400 }
      );
    }

    const paymentId = `pay-${Date.now()}`;
    const payment: StorePayment = {
      id: paymentId,
      settlementId: `settle-${tripId}`,
      fromMemberId,
      toMemberId,
      amountMinor: amount,
      currency,
      isPaid,
      paidAt: isPaid ? new Date().toISOString() : null,
      paymentReference: paymentReference || `UPI-${Math.floor(100000 + Math.random() * 900000)}`,
    };

    dbStore.addPayment(payment);

    // Get member names for notification
    const members = dbStore.getMembersByTrip(tripId);
    const fromMember = members.find((m) => m.id === fromMemberId);
    const toMember = members.find((m) => m.id === toMemberId);

    dbStore.addNotification({
      id: `notif-${Date.now()}`,
      userId: trip.createdById,
      tripId,
      type: "SETTLEMENT_PENDING",
      title: "Settlement Payment Recorded",
      message: `${fromMember?.name || "A member"} paid ₹${(Number(amount) / 100).toLocaleString("en-IN")} to ${toMember?.name || "a member"} (Ref: ${payment.paymentReference}).`,
      isRead: false,
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json(
      serializeBigInt({
        success: true,
        payment,
        message: "Settlement payment recorded successfully",
      }),
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Error recording settlement payment:", error);
    return NextResponse.json(
      { success: false, error: "Failed to record payment" },
      { status: 500 }
    );
  }
}
