import { NextRequest, NextResponse } from "next/server";
import { dbStore } from "@/lib/db/store";
import { createSessionCookie } from "@/lib/auth/session";
import { hashPassword } from "@/lib/auth/password";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, password, travelStyle = "BALANCED", currencyPreference = "INR" } = body;

    if (!name || !email || !password) {
      return NextResponse.json(
        { success: false, error: "Name, email, and password are required" },
        { status: 400 }
      );
    }

    const cleanEmail = email.toLowerCase().trim();
    const existing = dbStore.getUserByEmail(cleanEmail);
    if (existing) {
      return NextResponse.json(
        { success: false, error: "An account with this email already exists" },
        { status: 409 }
      );
    }

    const passwordHash = await hashPassword(password);
    const userId = `user-${Date.now()}`;

    const newUser = dbStore.createUser({
      id: userId,
      name: name.trim(),
      email: cleanEmail,
      passwordHash,
      currencyPreference,
      travelStyle,
      avatarUrl: `https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80`,
      createdAt: new Date().toISOString(),
    });

    await createSessionCookie({
      userId: newUser.id,
      email: newUser.email,
      name: newUser.name,
      avatarUrl: newUser.avatarUrl,
      role: "user",
    });

    return NextResponse.json(
      {
        success: true,
        user: {
          id: newUser.id,
          name: newUser.name,
          email: newUser.email,
          avatarUrl: newUser.avatarUrl,
          currencyPreference: newUser.currencyPreference,
          travelStyle: newUser.travelStyle,
        },
        message: "Account created successfully",
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Signup error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create account" },
      { status: 500 }
    );
  }
}
