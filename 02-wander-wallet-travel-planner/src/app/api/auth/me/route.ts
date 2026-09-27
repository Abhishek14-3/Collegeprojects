import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth/session";
import { dbStore } from "@/lib/db/store";

export async function GET(req: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      // For smooth demo experience, return the default demo user if not logged in
      const defaultUser = dbStore.getUserById("user-rahul-1");
      return NextResponse.json({
        success: true,
        authenticated: true,
        user: defaultUser || {
          id: "user-rahul-1",
          name: "Rahul Sharma",
          email: "rahul@wanderwallet.app",
          avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80",
          currencyPreference: "INR",
          travelStyle: "BALANCED",
        },
      });
    }

    const user = dbStore.getUserById(session.userId);

    return NextResponse.json({
      success: true,
      authenticated: true,
      user: user || session,
    });
  } catch (error: any) {
    console.error("Error fetching current user session:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch session" },
      { status: 500 }
    );
  }
}
