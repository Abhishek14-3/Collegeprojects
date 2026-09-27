import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth/session";
import { dbStore } from "@/lib/db/store";

export async function GET(req: NextRequest) {
  try {
    const session = await getCurrentSession();
    const userId = session?.userId || "user-rahul-1";
    const notifications = dbStore.getNotifications(userId);

    return NextResponse.json({
      success: true,
      notifications,
      unreadCount: notifications.filter((n) => !n.isRead).length,
    });
  } catch (error: any) {
    console.error("Error fetching notifications:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch notifications" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getCurrentSession();
    const userId = session?.userId || "user-rahul-1";
    const body = await req.json();
    const { notificationId, markAllRead } = body;

    const list = dbStore.notifications.get(userId) || [];

    if (markAllRead) {
      for (const n of list) {
        n.isRead = true;
      }
    } else if (notificationId) {
      const found = list.find((n) => n.id === notificationId);
      if (found) found.isRead = true;
    }

    return NextResponse.json({
      success: true,
      message: "Notifications updated successfully",
      unreadCount: list.filter((n) => !n.isRead).length,
    });
  } catch (error: any) {
    console.error("Error updating notifications:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update notifications" },
      { status: 500 }
    );
  }
}
