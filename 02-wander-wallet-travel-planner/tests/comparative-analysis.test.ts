import assert from "node:assert/strict";
import { runComparativeSpendAnalysis } from "../src/lib/ai/comparative-analysis";

export async function runComparativeAnalysisTests() {
  console.log("\n🧪 Running Wander Wallet — AI Comparative Spend & OCR Analysis Test Suite\n");
  let passed = 0;
  let failed = 0;

  function test(condition: boolean, testName: string) {
    if (condition) {
      console.log(`  ✓ ${testName}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${testName}`);
      failed++;
    }
  }

  // Set up mock trip with fixed initial budget ₹60,000 and Food Cap ₹12,000
  const trip = {
    id: "trip-test-comparative",
    title: "Goa Coastal Getaway",
    destination: "Goa, India",
    currency: "INR",
    groupBudgetMinor: BigInt(6000000), // ₹60,000
    initialBudgetMinor: BigInt(6000000),
    extraBudgetMinor: BigInt(0),
    categoryCaps: {
      FOOD: BigInt(1200000),      // ₹12,000
      STAY: BigInt(2100000),      // ₹21,000
      TRANSPORT: BigInt(1500000), // ₹15,000
      ACTIVITIES: BigInt(900000), // ₹9,000
    },
    numberOfDays: 5,
    numberOfTravelers: 4,
  };

  const members = [
    { id: "m1", name: "Rahul" },
    { id: "m2", name: "Ananya" },
    { id: "m3", name: "Vikram" },
    { id: "m4", name: "Sneha" },
  ];

  // Expenses including OCR itemized dinner bills
  const expenses = [
    {
      id: "exp-stay",
      title: "Casa de Praia Villa",
      category: "STAY",
      amountMinor: BigInt(1520000), // ₹15,200 (under ₹21,000 cap)
      convertedAmountMinor: BigInt(1520000),
      currency: "INR",
      payerId: "m1",
      date: "2026-01-20T14:00:00Z",
      participants: members.map((m) => ({ memberId: m.id, shareAmountMinor: BigInt(380000) })),
    },
    {
      id: "exp-dinner-ocr",
      title: "Fisherman's Wharf Seafood & Drinks",
      category: "FOOD",
      amountMinor: BigInt(360000), // ₹3,600
      convertedAmountMinor: BigInt(360000),
      currency: "INR",
      payerId: "m2",
      date: "2026-01-21T21:00:00Z",
      itemizedDetails: {
        merchant: "Fisherman's Wharf",
        items: [
          { name: "Butter Garlic Tiger Prawns", quantity: 2, amountMinor: 140000, participantNames: ["Rahul", "Vikram", "Sneha"] },
          { name: "Kingfish Rava Fry", quantity: 1, amountMinor: 95000, participantNames: ["Rahul", "Ananya"] },
          { name: "Local Feni Cocktails", quantity: 4, amountMinor: 60000, participantNames: ["Vikram", "Sneha"] },
        ],
      },
      participants: members.map((m) => ({ memberId: m.id, shareAmountMinor: BigInt(90000) })),
    },
    {
      id: "exp-beachclub-usd-ocr",
      title: "Beach Club Imported Wine & Seafood (USD Bill)",
      category: "FOOD",
      amountMinor: BigInt(12000), // $120.00 USD
      convertedAmountMinor: BigInt(1038600), // ₹10,386.00 at fx rate 86.55
      currency: "USD",
      payerId: "m4",
      date: "2026-01-22T20:00:00Z",
      itemizedDetails: {
        merchant: "Curlies Bay View Lounge",
        items: [
          { name: "Imported Sauvignon Blanc Wine", quantity: 1, amountMinor: 389500, participantNames: ["Rahul", "Sneha"] },
          { name: "Grilled Rock Lobster Platter", quantity: 1, amountMinor: 432800, participantNames: ["Rahul", "Vikram", "Sneha"] },
          { name: "Woodfired Truffle Calamari", quantity: 2, amountMinor: 155800, participantNames: ["All"] },
        ],
      },
      participants: members.map((m) => ({ memberId: m.id, shareAmountMinor: BigInt(259650) })),
    },
  ];

  // TEST 1: Initial comparative evaluation detects Food cap breach
  const res1 = await runComparativeSpendAnalysis({
    trip,
    members,
    expenses,
  });

  test(res1.hasBreach === true, "Comparative analysis detects budget cap breach");
  const foodComp = res1.graphs.categoryComparison.find((c) => c.category === "FOOD");
  test(foodComp?.status === "BREACHED", "Food category status is strictly BREACHED");

  // ₹3,600 + ₹10,386 = ₹13,986 spent vs ₹12,000 cap = +₹1,986 overshoot (198600 paise)
  test(foodComp?.actualSpendMinor === BigInt(1398600), "Food actual spend minor is exactly ₹13,986.00 (1398600 paise)");
  test(foodComp?.overshootMinor === BigInt(198600), "Food overshoot minor is exactly ₹1,986.00 (198600 paise)");
  test(foodComp?.headroomMinor === BigInt(0), "Headroom is 0 when category is breached");

  // TEST 2: Stay category has headroom and is under cap
  const stayComp = res1.graphs.categoryComparison.find((c) => c.category === "STAY");
  test(stayComp?.status === "UNDER_CAP", "Stay category is under cap");
  test(stayComp?.headroomMinor === BigInt(580000), "Stay headroom is ₹5,800.00 (580000 paise)");

  // TEST 3: OCR itemized extraction and overspend driver tagging
  test(res1.graphs.ocrItemDrivers.length >= 6, "Extracted all OCR line items from both receipts");
  const lobsterItem = res1.graphs.ocrItemDrivers.find((i) => i.name.includes("Lobster"));
  test(lobsterItem !== undefined, "Extracted Grilled Rock Lobster Platter OCR line item");
  test(lobsterItem?.isOverspendDriver === true, "High-value Lobster platter tagged as key overspend driver");
  test(lobsterItem?.percentageOfCategory !== undefined && lobsterItem.percentageOfCategory > 25, "Calculated percentage of category correctly (>25%)");

  const wineItem = res1.graphs.ocrItemDrivers.find((i) => i.name.includes("Wine"));
  test(wineItem !== undefined, "Extracted Imported Sauvignon Blanc Wine OCR line item");
  test(wineItem?.isOverspendDriver === true, "Imported wine item tagged as key overspend driver");

  // TEST 4: NLP Executive Summary & Recovery Plan
  test(res1.executiveSummary.length > 20, "Synthesized NLP executive comparative summary");
  test(res1.ocrLineItemNarrative.length > 20, "Synthesized OCR line item narrative");
  test(res1.recoveryRecommendations.length >= 1, "Generated actionable recovery recommendations");

  const topUpRec = res1.recoveryRecommendations.find((r) => r.actionType === "TOP_UP");
  test(topUpRec !== undefined, "Generated Top-Up budget kitty recommendation");
  test(topUpRec?.suggestedAmountMinor === BigInt(198600), "Top-up recommendation suggests exact overshoot amount (+₹1,986)");

  // TEST 5: Adding Extra Budget Top-Up
  const tripWithExtraBudget = {
    ...trip,
    extraBudgetMinor: BigInt(500000), // +₹5,000 extra budget added
    groupBudgetMinor: BigInt(6500000), // ₹65,000 total kitty
  };

  const res2 = await runComparativeSpendAnalysis({
    trip: tripWithExtraBudget,
    members,
    expenses,
    userQuery: "How does our extra budget cushion the dining overspend?",
  });

  test(res2.graphs.budgetEvolution.extraBudgetMinor === BigInt(500000), "Evolution records extra budget minor correctly");
  test(res2.graphs.budgetEvolution.totalEffectiveBudgetMinor === BigInt(6500000), "Total effective budget expanded to ₹65,000");
  test(res2.customAnswer !== null && res2.customAnswer !== undefined, "Generated custom answer for user query");

  // TEST 6: Member balance attribution from OCR shares
  test(res1.graphs.memberBreakdown.length === 4, "Breakdown includes all 4 trip members");
  const sneha = res1.graphs.memberBreakdown.find((m) => m.name === "Sneha");
  test(sneha !== undefined, "Sneha member data present");
  test(sneha?.totalPaidMinor === BigInt(1038600), "Sneha paid ₹10,386 upfront in USD");

  console.log(`\n========================================`);
  console.log(`Comparative Analysis Results: ${passed} passed, ${failed} failed`);
  console.log(`========================================\n`);

  if (failed > 0) {
    throw new Error(`${failed} Comparative Analysis tests failed!`);
  }
}

if (require.main === module) {
  runComparativeAnalysisTests().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
