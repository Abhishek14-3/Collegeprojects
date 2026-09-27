import { NextRequest, NextResponse } from "next/server";
import { dbStore } from "@/lib/db/store";
import { serializeBigInt } from "@/lib/utils/json";
import { generateItinerary } from "@/lib/itinerary/engine";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: tripId } = await params;
    let trip = dbStore.getTrip(tripId);

    if (!trip) {
      try {
        const { prisma } = await import("@/lib/db/prisma");
        const dbTrip = await prisma.trip.findUnique({ where: { id: tripId } });
        if (dbTrip) {
          trip = dbTrip as any;
        }
      } catch (e) {
        console.warn("[Prisma itinerary trip fetch note]:", e);
      }
    }

    if (!trip) {
      return NextResponse.json(
        { success: false, error: "Trip not found" },
        { status: 404 }
      );
    }

    // Generate dynamic itinerary using the trip's parameters
    const itinerary = generateItinerary({
      tripId,
      destination: trip.destination,
      startDate: trip.startDate,
      numberOfDays: trip.numberOfDays,
      travelers: trip.numberOfTravelers,
      selectedActivities: [],
    });

    return NextResponse.json(
      serializeBigInt({
        success: true,
        tripId,
        itinerary,
      })
    );
  } catch (error: any) {
    console.error("Error generating itinerary:", error);
    return NextResponse.json(
      { success: false, error: "Failed to generate itinerary" },
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
    let trip = dbStore.getTrip(tripId);

    if (!trip) {
      try {
        const { prisma } = await import("@/lib/db/prisma");
        const dbTrip = await prisma.trip.findUnique({ where: { id: tripId } });
        if (dbTrip) {
          trip = dbTrip as any;
        }
      } catch (e) {
        console.warn("[Prisma itinerary trip fetch note]:", e);
      }
    }

    if (!trip) {
      return NextResponse.json(
        { success: false, error: "Trip not found" },
        { status: 404 }
      );
    }

    const body = await req.json();
    const {
      numberOfDays = trip.numberOfDays,
      selectedTransport,
      selectedStay,
      selectedActivities = [],
    } = body;

    const itinerary = generateItinerary({
      tripId,
      destination: trip.destination,
      startDate: trip.startDate,
      numberOfDays: Number(numberOfDays),
      travelers: trip.numberOfTravelers,
      selectedTransport,
      selectedStay,
      selectedActivities,
    });

    return NextResponse.json(
      serializeBigInt({
        success: true,
        tripId,
        itinerary,
        message: "Itinerary generated successfully",
      })
    );
  } catch (error: any) {
    console.error("Error regenerating itinerary:", error);
    return NextResponse.json(
      { success: false, error: "Failed to regenerate itinerary" },
      { status: 500 }
    );
  }
}
