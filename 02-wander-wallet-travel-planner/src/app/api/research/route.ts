import { NextRequest, NextResponse } from "next/server";
import { unifiedTravelEngine } from "@/lib/providers/research/travel-engine";
import { serializeBigInt } from "@/lib/utils/json";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const destination = body.destination || "Goa, India";
    const origin = body.origin || "Bengaluru";
    const travelers = Number(body.travelerCount || body.travelers || 1);
    const travelStyle = body.travelStyle || "BALANCED";
    const departureDate = body.departureDate || new Date().toISOString().split("T")[0];
    const returnDate = body.returnDate || new Date(Date.now() + 5 * 86400000).toISOString().split("T")[0];

    const [transports, stays, activities] = await Promise.all([
      unifiedTravelEngine.searchTransport({
        origin,
        destination,
        date: departureDate,
        travelers,
        travelerCount: travelers,
      }),
      unifiedTravelEngine.searchStays({
        destination,
        checkInDate: departureDate,
        checkOutDate: returnDate,
        travelers,
        travelerCount: travelers,
        travelStyle,
      }),
      unifiedTravelEngine.searchActivities({
        destination,
        interests: body.interests || ["Sightseeing", "Adventure", "Food", "Culture"],
        travelers,
        travelerCount: travelers,
        travelStyle,
      }),
    ]);

    return NextResponse.json(
      serializeBigInt({
        success: true,
        destination,
        origin,
        transport: transports,
        stays: stays,
        accommodation: stays,
        activities: activities,
      }),
      { status: 200 }
    );
  } catch (err: any) {
    console.error("[API /api/research] Unexpected error:", err);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to complete research",
        message: err?.message || "Internal server error during travel research aggregation",
      },
      { status: 500 }
    );
  }
}
