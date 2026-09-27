import { evaluateTripFinancials } from "../src/lib/expenses/cfo";

export async function runCFOTests() {
  console.log("\n🧪 Running Wander Wallet — The AI Group CFO Test Suite\n");
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(`  ✓ ${testName}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${testName}`);
      failed++;
    }
  }

  // TEST 1: Healthy trip with normal burn rate and balanced payers
  const healthyReport = evaluateTripFinancials({
    trip: {
      id: "test-trip-1",
      title: "Pondicherry Beach Getaway",
      destination: "Puducherry, India",
      groupBudgetMinor: BigInt(10000000), // ₹1,00,000
      startDate: new Date(Date.now() - 2 * 24 * 3600 * 1000), // Day 2 of 5
      endDate: new Date(Date.now() + 3 * 24 * 3600 * 1000),
      numberOfDays: 5,
      numberOfTravelers: 3,
      currency: "INR",
    },
    members: [
      {
        id: "m1",
        name: "Alice",
        role: "OWNER",
        plannedContributionMinor: BigInt(3333300),
        actualContributionMinor: BigInt(1000000),
        plannedShareMinor: BigInt(3333300),
        actualShareMinor: BigInt(1000000),
      },
      {
        id: "m2",
        name: "Bob",
        role: "MEMBER",
        plannedContributionMinor: BigInt(3333300),
        actualContributionMinor: BigInt(1200000),
        plannedShareMinor: BigInt(3333300),
        actualShareMinor: BigInt(1000000),
      },
      {
        id: "m3",
        name: "Charlie",
        role: "MEMBER",
        plannedContributionMinor: BigInt(3333400),
        actualContributionMinor: BigInt(800000),
        plannedShareMinor: BigInt(3333400),
        actualShareMinor: BigInt(1000000),
      },
    ],
    expenses: [
      {
        id: "e1",
        title: "French Bakery Brunch",
        category: "FOOD",
        amountMinor: BigInt(1000000), // ₹10,000 paid by Alice
        convertedAmountMinor: BigInt(1000000),
        payerId: "m1",
        date: new Date(),
      },
      {
        id: "e2",
        title: "Beachside Villa",
        category: "STAY",
        amountMinor: BigInt(1200000), // ₹12,000 paid by Bob
        convertedAmountMinor: BigInt(1200000),
        payerId: "m2",
        date: new Date(),
      },
      {
        id: "e3",
        title: "Rental Scooters & Fuel",
        category: "TRANSPORT",
        amountMinor: BigInt(800000), // ₹8,000 paid by Charlie
        convertedAmountMinor: BigInt(800000),
        payerId: "m3",
        date: new Date(),
      },
    ],
  });

  assert(healthyReport.healthScore >= 80, "Health score is high (>=80) for balanced, on-budget trip");
  assert(healthyReport.healthGrade === "EXCELLENT" || healthyReport.healthGrade === "HEALTHY", "Health grade is EXCELLENT or HEALTHY");
  assert(healthyReport.cashFlowBurden.concentrationRisk === "LOW", "No concentration risk when payers are distributed");
  assert(healthyReport.recommendations.length >= 1, "Produces at least one proactive nudge or recommendation");

  // TEST 2: Overspending trip with single payer float burden
  const stressedReport = evaluateTripFinancials({
    trip: {
      id: "test-trip-2",
      title: "Goa Weekend Trip",
      destination: "Goa, India",
      groupBudgetMinor: BigInt(5000000), // ₹50,000 budget
      startDate: new Date(Date.now() - 1 * 24 * 3600 * 1000), // Day 1 of 5
      endDate: new Date(Date.now() + 4 * 24 * 3600 * 1000),
      numberOfDays: 5,
      numberOfTravelers: 3,
      currency: "INR",
    },
    members: [
      {
        id: "m1",
        name: "Priya",
        role: "OWNER",
        plannedContributionMinor: BigInt(1666600),
        actualContributionMinor: BigInt(4500000),
        plannedShareMinor: BigInt(1666600),
        actualShareMinor: BigInt(1500000),
      },
      {
        id: "m2",
        name: "Rohan",
        role: "MEMBER",
        plannedContributionMinor: BigInt(1666600),
        actualContributionMinor: BigInt(0),
        plannedShareMinor: BigInt(1666600),
        actualShareMinor: BigInt(1500000),
      },
      {
        id: "m3",
        name: "Karan",
        role: "MEMBER",
        plannedContributionMinor: BigInt(1666800),
        actualContributionMinor: BigInt(0),
        plannedShareMinor: BigInt(1666800),
        actualShareMinor: BigInt(1500000),
      },
    ],
    expenses: [
      {
        id: "e1",
        title: "Day 1 Luxury Resort & Beach Club",
        category: "FOOD",
        amountMinor: BigInt(4500000), // ₹45,000 paid ONLY by Priya on Day 1! (90% of trip budget)
        convertedAmountMinor: BigInt(4500000),
        payerId: "m1",
        date: new Date(),
      },
    ],
  });

  assert(stressedReport.healthScore < 60, "Health score drops below 60 on high burn + payer burden");
  assert(stressedReport.burnRate.isPacingAhead === true, "Burn velocity accurately flagged as pacing ahead");
  assert(stressedReport.cashFlowBurden.concentrationRisk === "HIGH", "Flags HIGH concentration risk when 1 person pays > 60%");
  assert(stressedReport.cashFlowBurden.topPayerPercentage === 100, "Calculates top payer percentage accurately (100%)");

  const floatNudge = stressedReport.recommendations.find((r) => r.type === "CASH_FLOW_NUDGE");
  assert(Boolean(floatNudge), "Generates cash flow nudge for the group to relieve single-payer burden");

  // TEST 3: Zero expense trip (early planning stage)
  const emptyReport = evaluateTripFinancials({
    trip: {
      id: "test-trip-3",
      title: "Himachal Trek",
      destination: "Manali, India",
      groupBudgetMinor: BigInt(5000000),
      startDate: new Date(Date.now() + 5 * 24 * 3600 * 1000),
      endDate: new Date(Date.now() + 10 * 24 * 3600 * 1000),
      numberOfDays: 5,
      numberOfTravelers: 2,
      currency: "INR",
    },
    members: [
      {
        id: "m1",
        name: "Aarav",
        role: "OWNER",
        plannedContributionMinor: BigInt(2500000),
        actualContributionMinor: BigInt(0),
        plannedShareMinor: BigInt(2500000),
        actualShareMinor: BigInt(0),
      },
    ],
    expenses: [],
  });

  assert(emptyReport.healthScore === 100, "Clean 100 health score when trip has zero expenses logged");
  assert(emptyReport.burnRate.actualDailyBurnMinor === BigInt(0), "0 actual daily burn minor units");

  console.log(`\n========================================`);
  console.log(`CFO Results: ${passed} passed, ${failed} failed`);
  console.log(`========================================\n`);

  if (failed > 0) {
    throw new Error(`${failed} CFO tests failed!`);
  }
}

if (require.main === module) {
  runCFOTests().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
