import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Enabling Supabase Realtime replication on public tables...");

  const tables = [
    "trips",
    "trip_members",
    "expenses",
    "expense_participants",
    "settlements",
    "settlement_payments",
    "itineraries",
    "itinerary_days",
    "itinerary_items",
    "notifications",
  ];

  for (const table of tables) {
    try {
      await prisma.$executeRawUnsafe(`
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_publication_tables 
            WHERE pubname = 'supabase_realtime' AND tablename = '${table}'
          ) THEN
            ALTER PUBLICATION supabase_realtime ADD TABLE "${table}";
          END IF;
        END $$;
      `);
      console.log(`✓ Realtime enabled for: ${table}`);
    } catch (err: any) {
      console.warn(`Could not add ${table} to supabase_realtime:`, err.message);
    }
  }

  console.log("Supabase Realtime configuration complete!");
}

main()
  .catch((e) => {
    console.error("Error setting up Realtime:", e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
