import { NextRequest, NextResponse } from "next/server";
import { destroySessionCookie, getCurrentSession } from "@/lib/auth/session";

export async function POST(req: NextRequest) {
  try {
    await destroySessionCookie();
    return NextResponse.json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (error: any) {
    console.error("Logout error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to log out" },
      { status: 500 }
    );
  }
}
