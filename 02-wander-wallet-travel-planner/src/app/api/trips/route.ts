import { NextRequest, NextResponse } from "next/server";
import { dbStore } from "@/lib/db/store";
import { getCurrentSession } from "@/lib/auth/session";
import { serializeBigInt } from "@/lib/utils/json";

export async function GET(req: NextRequest) {
  try {
    const session = await getCurrentSession();
    const trips = dbStore.getAllTrips();

    // Enhance each trip with basic summary statistics
    const enhancedTrips = trips.map((trip) => {
      const members = dbStore.getMembersByTrip(trip.id);
      const expenses = dbStore.getExpensesByTrip(trip.id);
      const totalSpendMinor = expenses.reduce((sum, e) => sum + e.convertedAmountMinor, BigInt(0));

      return {
        ...trip,
        membersCount: members.length,
        totalSpendMinor,
        remainingBudgetMinor: trip.groupBudgetMinor - totalSpendMinor,
        members: members.slice(0, 5),
      };
    });

    return NextResponse.json(serializeBigInt({
      success: true,
      trips: enhancedTrips,
      currentUser: session,
    }));
  } catch (error: any) {
    console.error("Error fetching trips:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch trips" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getCurrentSession();
    const body = await req.json();

    const {
      title,
      destination,
      startingLocation,
      startDate,
      endDate,
      numberOfDays,
      numberOfTravelers,
      groupBudgetMinor,
      currency = "INR",
      travelStyle = "BALANCED",
      interests = [],
      heroImageUrl,
      categoryCaps,
      alertThresholdPct = 80,
    } = body;

    if (!title || !destination || !startDate || !endDate) {
      return NextResponse.json(
        { success: false, error: "Missing required trip fields (title, destination, dates)" },
        { status: 400 }
      );
    }

    const tripId = `trip-${Date.now()}`;
    const budgetBig = BigInt(groupBudgetMinor || 5000000);
    const travelersCount = Number(numberOfTravelers) || 1;

    let parsedCaps: Record<string, bigint> | undefined;
    if (categoryCaps && typeof categoryCaps === "object") {
      parsedCaps = {};
      for (const [k, v] of Object.entries(categoryCaps)) {
        parsedCaps[k.toUpperCase()] = BigInt(v as any);
      }
    } else {
      const { deriveDefaultCategoryCaps } = await import("@/lib/budget/caps");
      parsedCaps = deriveDefaultCategoryCaps(budgetBig);
    }

    const newTrip = dbStore.createTrip({
      id: tripId,
      title,
      destination,
      startingLocation: startingLocation || "Bengaluru",
      startDate,
      endDate,
      numberOfDays: Number(numberOfDays) || 5,
      numberOfTravelers: travelersCount,
      groupBudgetMinor: budgetBig,
      currency,
      categoryCaps: parsedCaps,
      alertThresholdPct: Number(alertThresholdPct) || 80,
      travelStyle: travelStyle as any,
      interests: Array.isArray(interests) ? interests : ["Beach", "Culture"],
      status: "PLANNING",
      heroImageUrl:
        heroImageUrl ||
        "https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=1200&q=85",
      createdById: session?.userId || "user-rahul-1",
    });

    // Automatically add the creator as the OWNER member
    const ownerPlanned = budgetBig / BigInt(Math.max(1, travelersCount));
    dbStore.addMember({
      id: `mem-${Date.now()}-1`,
      tripId,
      userId: session?.userId || "user-rahul-1",
      name: session?.name || "Trip Host",
      email: session?.email || "host@wanderwallet.app",
      avatarUrl: session?.avatarUrl || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80",
      role: "OWNER",
      plannedContributionMinor: ownerPlanned,
      actualContributionMinor: ownerPlanned,
      plannedShareMinor: ownerPlanned,
      actualShareMinor: BigInt(0),
      joinedAt: new Date().toISOString(),
    });

    return NextResponse.json(
      serializeBigInt({
        success: true,
        trip: newTrip,
        message: "Trip created successfully",
      }),
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Error creating trip:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create trip" },
      { status: 500 }
    );
  }
}
