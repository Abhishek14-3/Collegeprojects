import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth/session";
import { dbStore, StoreUser } from "@/lib/db/store";

export async function GET(req: NextRequest) {
  try {
    const session = await getCurrentSession();
    const userId = session?.userId || "user-rahul-1";
    const user = dbStore.getUserById(userId) || dbStore.getUserById("user-rahul-1");

    return NextResponse.json({
      success: true,
      profile: user,
    });
  } catch (error: any) {
    console.error("Error fetching user profile:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch profile" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getCurrentSession();
    const userId = session?.userId || "user-rahul-1";
    const body = await req.json();

    const updates: Partial<StoreUser> = {};
    if (body.name) updates.name = body.name.trim();
    if (body.avatarUrl !== undefined) updates.avatarUrl = body.avatarUrl;
    if (body.currencyPreference) updates.currencyPreference = body.currencyPreference;
    if (body.travelStyle) updates.travelStyle = body.travelStyle;
    if (body.homeCity !== undefined) updates.homeCity = body.homeCity;
    if (body.bio !== undefined) updates.bio = body.bio;

    const updated = dbStore.updateUser(userId, updates);

    return NextResponse.json({
      success: true,
      profile: updated || { ...updates, id: userId },
      message: "Profile updated successfully",
    });
  } catch (error: any) {
    console.error("Error updating profile:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update profile" },
      { status: 500 }
    );
  }
}
