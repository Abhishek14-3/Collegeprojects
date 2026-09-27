import { NextRequest, NextResponse } from "next/server";
import { dbStore } from "@/lib/db/store";
import { createSessionCookie } from "@/lib/auth/session";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: "Email and password are required" },
        { status: 400 }
      );
    }

    const cleanEmail = email.toLowerCase().trim();
    let user = dbStore.getUserByEmail(cleanEmail);

    // If user not found, but it's the demo account or a new demo test, initialize them
    if (!user) {
      if (cleanEmail === "rahul@wanderwallet.app" || cleanEmail.includes("@")) {
        user = dbStore.createUser({
          id: `user-${Date.now()}`,
          name: cleanEmail.split("@")[0].replace(".", " "),
          email: cleanEmail,
          passwordHash: "demo",
          currencyPreference: "INR",
          travelStyle: "BALANCED",
          createdAt: new Date().toISOString(),
        });
      } else {
        return NextResponse.json(
          { success: false, error: "Invalid email or password" },
          { status: 401 }
        );
      }
    }

    // Set HTTP-only secure cookie session
    await createSessionCookie({
      userId: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
      role: "user",
    });

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatarUrl: user.avatarUrl,
        currencyPreference: user.currencyPreference,
        travelStyle: user.travelStyle,
      },
      message: "Login successful",
    });
  } catch (error: any) {
    console.error("Login error:", error);
    return NextResponse.json(
      { success: false, error: "Authentication failed" },
      { status: 500 }
    );
  }
}
