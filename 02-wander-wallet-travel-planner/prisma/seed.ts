import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding Supabase PostgreSQL database...");

  // 1. Create or upsert Demo User Rahul Sharma
  const user = await prisma.user.upsert({
    where: { email: "rahul@wanderwallet.app" },
    update: {},
    create: {
      id: "user-rahul-1",
      email: "rahul@wanderwallet.app",
      name: "Rahul Sharma",
      passwordHash: "$2a$12$e8yQxU9n1nKjK.U9QZ8P2e4UqvGkP3nQ/f.4F3oYgVp3Hq0xH1m8m", // password123
      avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80",
      preferredCurrency: "INR",
      travelStyle: "BALANCED",
      travelerType: "GROUP",
      isOnboarded: true,
      interests: ["Beach", "Adventure", "Culture", "Food"],
    },
  });

  console.log("Created user:", user.name);

  // 2. Create or upsert Trip
  const tripId = "trip-goa-2026";
  const trip = await prisma.trip.upsert({
    where: { id: tripId },
    update: {},
    create: {
      id: tripId,
      title: "Goa Coastal Getaway",
      destination: "Goa, India",
      startingLocation: "Bengaluru",
      startDate: new Date("2026-01-20"),
      endDate: new Date("2026-01-25"),
      numberOfDays: 5,
      numberOfTravelers: 6,
      groupBudgetMinor: BigInt(6000000), // ₹60,000 in paise
      currency: "INR",
      travelStyle: "BALANCED",
      interests: ["Beach", "Adventure", "Culture", "Food"],
      status: "PLANNING",
      heroImageUrl: "https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=1200&q=85",
      createdById: user.id,
    },
  });

  console.log("Created trip:", trip.title);

  // 3. Create Members
  const membersData = [
    {
      id: "mem-1",
      userId: user.id,
      inviteName: "Rahul Sharma (You)",
      inviteEmail: "rahul@wanderwallet.app",
      avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80",
      role: "OWNER" as const,
      plannedContributionMinor: BigInt(1000000), // ₹10,000
      actualContributionMinor: BigInt(1000000),
      plannedShareMinor: BigInt(1000000),
      actualShareMinor: BigInt(950000),
    },
    {
      id: "mem-2",
      inviteName: "Ananya Iyer",
      inviteEmail: "ananya@wanderwallet.app",
      avatarUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80",
      role: "ORGANIZER" as const,
      plannedContributionMinor: BigInt(1000000),
      actualContributionMinor: BigInt(800000),
      plannedShareMinor: BigInt(1000000),
      actualShareMinor: BigInt(950000),
    },
    {
      id: "mem-3",
      inviteName: "Vikram Malhotra",
      inviteEmail: "vikram@wanderwallet.app",
      avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80",
      role: "MEMBER" as const,
      plannedContributionMinor: BigInt(1000000),
      actualContributionMinor: BigInt(1000000),
      plannedShareMinor: BigInt(1000000),
      actualShareMinor: BigInt(1000000),
    },
    {
      id: "mem-4",
      inviteName: "Sneha Patel",
      inviteEmail: "sneha@wanderwallet.app",
      avatarUrl: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=200&q=80",
      role: "MEMBER" as const,
      plannedContributionMinor: BigInt(1000000),
      actualContributionMinor: BigInt(1000000),
      plannedShareMinor: BigInt(1000000),
      actualShareMinor: BigInt(950000),
    },
    {
      id: "mem-5",
      inviteName: "Arjun Reddy",
      inviteEmail: "arjun@wanderwallet.app",
      avatarUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80",
      role: "MEMBER" as const,
      plannedContributionMinor: BigInt(1000000),
      actualContributionMinor: BigInt(700000),
      plannedShareMinor: BigInt(1000000),
      actualShareMinor: BigInt(950000),
    },
    {
      id: "mem-6",
      inviteName: "Priya Nair",
      inviteEmail: "priya@wanderwallet.app",
      avatarUrl: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=200&q=80",
      role: "MEMBER" as const,
      plannedContributionMinor: BigInt(1000000),
      actualContributionMinor: BigInt(1000000),
      plannedShareMinor: BigInt(1000000),
      actualShareMinor: BigInt(950000),
    },
  ];

  for (const m of membersData) {
    await prisma.tripMember.upsert({
      where: { id: m.id },
      update: {},
      create: {
        id: m.id,
        tripId,
        userId: m.userId,
        inviteName: m.inviteName,
        inviteEmail: m.inviteEmail,
        avatarUrl: m.avatarUrl,
        role: m.role,
        plannedContributionMinor: m.plannedContributionMinor,
        actualContributionMinor: m.actualContributionMinor,
        plannedShareMinor: m.plannedShareMinor,
        actualShareMinor: m.actualShareMinor,
      },
    });
  }

  console.log("Created 6 trip members");

  // 4. Create Budget
  const budget = await prisma.budget.upsert({
    where: { tripId },
    update: {},
    create: {
      tripId,
      totalBudgetMinor: BigInt(6000000), // ₹60,000
      plannedSpendMinor: BigInt(5700000),
      actualSpendMinor: BigInt(2600000),
      currency: "INR",
      bufferAmountMinor: BigInt(480000),
      categories: {
        create: [
          { category: "STAY", allocatedMinor: BigInt(1860000), percentage: 31.0, actualSpentMinor: BigInt(1520000) },
          { category: "TRANSPORT", allocatedMinor: BigInt(1200000), percentage: 20.0, actualSpentMinor: BigInt(240000) },
          { category: "FOOD", allocatedMinor: BigInt(1080000), percentage: 18.0, actualSpentMinor: BigInt(360000) },
          { category: "ACTIVITIES", allocatedMinor: BigInt(840000), percentage: 14.0, actualSpentMinor: BigInt(480000) },
          { category: "LOCAL_TRAVEL", allocatedMinor: BigInt(540000), percentage: 9.0, actualSpentMinor: BigInt(0) },
          { category: "BUFFER", allocatedMinor: BigInt(480000), percentage: 8.0, actualSpentMinor: BigInt(0) },
        ],
      },
    },
  });

  console.log("Created budget and categories");

  // 5. Create Expenses
  const exp1 = await prisma.expense.upsert({
    where: { id: "exp-1" },
    update: {},
    create: {
      id: "exp-1",
      tripId,
      payerId: "mem-1",
      title: "Casa de Praia Villa (Advance Deposit)",
      category: "STAY",
      amountMinor: BigInt(1520000), // ₹15,200
      currency: "INR",
      convertedAmountMinor: BigInt(1520000),
      baseCurrency: "INR",
      exchangeRate: 1.0,
      date: new Date("2026-01-20T14:00:00Z"),
      participants: {
        create: membersData.map((m, idx) => ({
          memberId: m.id,
          shareAmountMinor: idx === 0 ? BigInt(253335) : BigInt(253333),
        })),
      },
    },
  });

  const exp2 = await prisma.expense.upsert({
    where: { id: "exp-2" },
    update: {},
    create: {
      id: "exp-2",
      tripId,
      payerId: "mem-2",
      title: "Calangute Seafood Feast & Drinks",
      category: "FOOD",
      amountMinor: BigInt(360000), // ₹3,600
      currency: "INR",
      convertedAmountMinor: BigInt(360000),
      baseCurrency: "INR",
      exchangeRate: 1.0,
      date: new Date("2026-01-21T21:00:00Z"),
      participants: {
        create: membersData.map((m) => ({
          memberId: m.id,
          shareAmountMinor: BigInt(60000),
        })),
      },
    },
  });

  const exp3 = await prisma.expense.upsert({
    where: { id: "exp-3" },
    update: {},
    create: {
      id: "exp-3",
      tripId,
      payerId: "mem-3",
      title: "Airport to Villa AC Tempo Traveler",
      category: "TRANSPORT",
      amountMinor: BigInt(240000), // ₹2,400
      currency: "INR",
      convertedAmountMinor: BigInt(240000),
      baseCurrency: "INR",
      exchangeRate: 1.0,
      date: new Date("2026-01-20T11:00:00Z"),
      participants: {
        create: membersData.map((m) => ({
          memberId: m.id,
          shareAmountMinor: BigInt(40000),
        })),
      },
    },
  });

  console.log("Created shared expenses in Supabase");
  console.log("Supabase seeding complete!");
}

main()
  .catch((e) => {
    console.error("Error seeding database:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
