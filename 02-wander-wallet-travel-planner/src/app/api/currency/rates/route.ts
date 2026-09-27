import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { currencyProvider } from "@/lib/providers/currency/frankfurter";

const currencyQuerySchema = z.object({
  from: z.string().min(3).max(3).default("USD"),
  to: z.string().min(3).max(3).default("INR"),
});

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const fromParam = (searchParams.get("from") || "USD").toUpperCase();
    const toParam = (searchParams.get("to") || "INR").toUpperCase();

    const parsed = currencyQuerySchema.safeParse({ from: fromParam, to: toParam });

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid currency codes", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const rate = await currencyProvider.getRate(parsed.data.from, parsed.data.to);

    return NextResponse.json(rate, {
      status: 200,
      headers: {
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Failed to retrieve currency exchange rate", message: err?.message },
      { status: 500 }
    );
  }
}
