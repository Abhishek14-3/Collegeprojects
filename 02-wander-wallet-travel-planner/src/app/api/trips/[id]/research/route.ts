import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { researchTrip } from "@/lib/providers/aggregator";
import { prisma } from "@/lib/db/prisma";
import { serializeBigInt } from "@/lib/utils/json";

const researchParamsSchema = z.object({
  destination: z.string().min(2),
  origin: z.string().optional().default("Bengaluru"),
  departureDate: z.string(),
  returnDate: z.string().optional(),
  travelerCount: z.number().int().min(1).default(1),
  travelStyle: z.string().optional().default("BALANCED"),
  interests: z.array(z.string()).default([]),
  targetCurrency: z.string().default("INR"),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: tripId } = await params;
    const body = await req.json().catch(() => ({}));
    const parsed = researchParamsSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid research parameters", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const result = await researchTrip(parsed.data);

    // Persist to Prisma if DB is reachable
    try {
      const recordsToCreate = [
        ...result.transport.map((t) => ({
          tripId,
          category: "transport",
          name: t.name,
          location: t.location,
          priceMinor: t.totalCostMinor,
          currency: t.currency,
          priceType: t.priceType,
          rating: t.rating,
          reviewCount: t.reviewCount,
          source: t.source,
          sourceUrl: t.sourceUrl,
          provider: t.provider,
          retrievedAt: new Date(t.retrievedAt),
          availability: t.availability,
          travelTimeMins: t.durationMins,
          metadataJson: JSON.stringify(t.metadata || {}),
        })),
        ...result.accommodation.map((s) => ({
          tripId,
          category: "stay",
          name: s.name,
          location: s.location,
          priceMinor: s.totalStayCostMinor,
          currency: s.currency,
          priceType: s.priceType,
          rating: s.rating,
          reviewCount: s.reviewCount,
          source: s.source,
          sourceUrl: s.sourceUrl,
          provider: s.provider,
          retrievedAt: new Date(s.retrievedAt),
          availability: s.availability,
          metadataJson: JSON.stringify(s.metadata || {}),
        })),
        ...result.activities.map((a) => ({
          tripId,
          category: "activity",
          name: a.name,
          location: a.location,
          priceMinor: a.totalGroupCostMinor,
          currency: a.currency,
          priceType: a.priceType,
          rating: a.rating,
          reviewCount: a.reviewCount,
          source: a.source,
          sourceUrl: a.sourceUrl,
          provider: a.provider,
          retrievedAt: new Date(a.retrievedAt),
          travelTimeMins: a.durationMins,
          metadataJson: JSON.stringify(a.metadata || {}),
        })),
      ];

      // Attempt upserting research results in background
      await prisma.researchResult.createMany({
        data: recordsToCreate,
        skipDuplicates: true,
      });
    } catch (dbErr) {
      // Database might be offline in development; proceed gracefully with live result
      console.warn("[API /api/trips/[id]/research] Could not persist to database:", dbErr);
    }

    return NextResponse.json(serializeBigInt(result), { status: 200 });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Failed to research trip", message: err?.message },
      { status: 500 }
    );
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: tripId } = await params;

    try {
      const records = await prisma.researchResult.findMany({
        where: { tripId },
        orderBy: { retrievedAt: "desc" },
      });

      return NextResponse.json(serializeBigInt(records), { status: 200 });
    } catch {
      // DB offline fallback
      return NextResponse.json([], { status: 200 });
    }
  } catch (err: any) {
    return NextResponse.json(
      { error: "Failed to retrieve research results", message: err?.message },
      { status: 500 }
    );
  }
}
