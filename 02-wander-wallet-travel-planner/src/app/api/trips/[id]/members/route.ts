import { NextRequest, NextResponse } from "next/server";
import { dbStore, StoreMember } from "@/lib/db/store";
import { prisma } from "@/lib/db/prisma";
import { getCurrentSession } from "@/lib/auth/session";
import { serializeBigInt } from "@/lib/utils/json";
import { calculateMemberBalances } from "@/lib/expenses/engine";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: tripId } = await params;
    let trip: any = null;
    let members: any[] = [];
    let expenses: any[] = [];
    let payments: any[] = [];

    try {
      const dbTrip = await prisma.trip.findUnique({
        where: { id: tripId },
        include: {
          members: true,
          expenses: {
            include: {
              participants: true,
            },
          },
        },
      });

      if (dbTrip) {
        trip = dbTrip;
        members = dbTrip.members.map((m) => ({
          ...m,
          plannedContributionMinor: m.plannedContributionMinor || BigInt(0),
          actualContributionMinor: m.actualContributionMinor || BigInt(0),
          plannedShareMinor: m.plannedShareMinor || BigInt(0),
          actualShareMinor: m.actualShareMinor || BigInt(0),
        }));
        expenses = dbTrip.expenses.map((e) => ({
          ...e,
          amountMinor: e.amountMinor,
          convertedAmountMinor: e.convertedAmountMinor || e.amountMinor,
          participants: e.participants.map((p) => ({
            id: p.id,
            memberId: p.memberId,
            shareAmountMinor: p.shareAmountMinor,
          })),
        }));
      }
    } catch (e) {
      console.warn("[Prisma member fetch note]:", e);
    }

    if (!trip) {
      trip = dbStore.getTrip(tripId);
      if (!trip) {
        return NextResponse.json(
          { success: false, error: "Trip not found" },
          { status: 404 }
        );
      }
      members = dbStore.getMembersByTrip(tripId);
      expenses = dbStore.getExpensesByTrip(tripId);
      payments = dbStore.getPaymentsByTrip(tripId);
    }

    // Calculate dynamic member balances and spent shares
    const balances = calculateMemberBalances(members, expenses, payments);
    const balanceMap = new Map(balances.map((b) => [b.memberId, b]));

    const enrichedMembers = members.map((m) => {
      const b = balanceMap.get(m.id);
      return {
        ...m,
        totalPaidMinor: b ? b.totalPaidMinor : BigInt(0),
        totalOwedMinor: b ? b.totalOwedMinor : BigInt(0),
        netBalanceMinor: b ? b.netBalanceMinor : BigInt(0),
        contributionRemainingMinor: m.plannedContributionMinor - m.actualContributionMinor,
      };
    });

    const totalPlannedContributions = members.reduce(
      (sum, m) => sum + m.plannedContributionMinor,
      BigInt(0)
    );
    const totalActualContributions = members.reduce(
      (sum, m) => sum + m.actualContributionMinor,
      BigInt(0)
    );

    return NextResponse.json(
      serializeBigInt({
        success: true,
        tripId,
        groupBudgetMinor: trip.groupBudgetMinor,
        totalPlannedContributions,
        totalActualContributions,
        remainingToPoolMinor: trip.groupBudgetMinor - totalActualContributions,
        members: enrichedMembers,
      })
    );
  } catch (error: any) {
    console.error("Error fetching group members:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch members" },
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
    const trip = dbStore.getTrip(tripId);

    if (!trip) {
      return NextResponse.json(
        { success: false, error: "Trip not found" },
        { status: 404 }
      );
    }

    const body = await req.json();
    const {
      name,
      email,
      role = "MEMBER",
      plannedContributionMinor,
      actualContributionMinor,
      avatarUrl,
    } = body;

    if (!name) {
      return NextResponse.json(
        { success: false, error: "Member name is required" },
        { status: 400 }
      );
    }

    const memberId = `mem-${Date.now()}`;
    const plannedMinor = plannedContributionMinor !== undefined ? BigInt(plannedContributionMinor) : BigInt(1000000);
    const actualMinor = actualContributionMinor !== undefined ? BigInt(actualContributionMinor) : BigInt(0);

    const newMember: StoreMember = {
      id: memberId,
      tripId,
      name,
      email: email || null,
      avatarUrl:
        avatarUrl ||
        `https://images.unsplash.com/photo-${1534528741775 + (dbStore.getMembersByTrip(tripId).length % 10)}?auto=format&fit=crop&w=200&q=80`,
      role: role as any,
      plannedContributionMinor: plannedMinor,
      actualContributionMinor: actualMinor,
      plannedShareMinor: plannedMinor,
      actualShareMinor: BigInt(0),
      joinedAt: new Date().toISOString(),
    };

    dbStore.addMember(newMember);

    // Persist to Supabase / Prisma
    try {
      await prisma.tripMember.create({
        data: {
          id: memberId,
          tripId,
          inviteName: name,
          role: role as any,
          plannedContributionMinor: plannedMinor,
          actualContributionMinor: actualMinor,
          plannedShareMinor: plannedMinor,
          actualShareMinor: BigInt(0),
        },
      });
    } catch (dbErr) {
      console.warn("[Prisma] Member persistence note:", dbErr);
    }

    // Add a notification for trip host
    dbStore.addNotification({
      id: `notif-${Date.now()}`,
      userId: trip.createdById,
      tripId,
      type: "MEMBER_JOINED",
      title: "New Traveler Joined",
      message: `${name} has joined ${trip.title} with planned contribution ₹${(Number(plannedMinor) / 100).toLocaleString("en-IN")}.`,
      isRead: false,
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json(
      serializeBigInt({
        success: true,
        member: newMember,
        message: "Member added successfully",
      }),
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Error adding member:", error);
    return NextResponse.json(
      { success: false, error: "Failed to add member" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: tripId } = await params;
    const body = await req.json();
    const { memberId, role, plannedContributionMinor, actualContributionMinor, name } = body;

    if (!memberId) {
      return NextResponse.json(
        { success: false, error: "Member ID is required" },
        { status: 400 }
      );
    }

    const updates: Partial<StoreMember> = {};
    if (role) updates.role = role;
    if (name) updates.name = name;
    if (plannedContributionMinor !== undefined) updates.plannedContributionMinor = BigInt(plannedContributionMinor);
    if (actualContributionMinor !== undefined) updates.actualContributionMinor = BigInt(actualContributionMinor);

    const updated = dbStore.updateMember(memberId, updates);
    if (!updated) {
      return NextResponse.json(
        { success: false, error: "Member not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      serializeBigInt({
        success: true,
        member: updated,
        message: "Member updated successfully",
      })
    );
  } catch (error: any) {
    console.error("Error updating member:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update member" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: tripId } = await params;
    const { searchParams } = new URL(req.url);
    const memberId = searchParams.get("memberId");

    if (!memberId) {
      return NextResponse.json(
        { success: false, error: "Member ID is required" },
        { status: 400 }
      );
    }

    const members = dbStore.getMembersByTrip(tripId);
    const targetMember = members.find((m) => m.id === memberId);

    if (!targetMember) {
      return NextResponse.json(
        { success: false, error: "Member not found" },
        { status: 404 }
      );
    }

    if (targetMember.role === "OWNER") {
      return NextResponse.json(
        { success: false, error: "Cannot remove the trip owner" },
        { status: 400 }
      );
    }

    dbStore.removeMember(memberId);

    return NextResponse.json({
      success: true,
      message: "Member removed successfully",
    });
  } catch (error: any) {
    console.error("Error removing member:", error);
    return NextResponse.json(
      { success: false, error: "Failed to remove member" },
      { status: 500 }
    );
  }
}
