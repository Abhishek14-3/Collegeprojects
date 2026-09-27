import { NextRequest, NextResponse } from "next/server";
import { dbStore, StorePayment } from "@/lib/db/store";
import { serializeBigInt } from "@/lib/utils/json";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; paymentId: string }> }
) {
  try {
    const { id: tripId, paymentId } = await params;
    const body = await req.json();

    const { isPaid, paymentReference } = body;

    const updates: Partial<StorePayment> = {};
    if (isPaid !== undefined) {
      updates.isPaid = Boolean(isPaid);
      if (isPaid) {
        updates.paidAt = new Date().toISOString();
      }
    }
    if (paymentReference) {
      updates.paymentReference = paymentReference;
    }

    const updated = dbStore.updatePayment(paymentId, updates);
    if (!updated) {
      return NextResponse.json(
        { success: false, error: "Payment record not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      serializeBigInt({
        success: true,
        payment: updated,
        message: "Payment status updated successfully",
      })
    );
  } catch (error: any) {
    console.error("Error updating payment:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update payment" },
      { status: 500 }
    );
  }
}
