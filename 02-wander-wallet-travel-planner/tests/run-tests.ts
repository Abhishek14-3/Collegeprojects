import assert from "node:assert/strict";

// Providers & Engines
import { FrankfurterCurrencyProvider } from "../src/lib/providers/currency/frankfurter.js";
import { AmadeusTransportProvider } from "../src/lib/providers/transport/amadeus.js";
import { OsmTransitProvider } from "../src/lib/providers/transport/transit.js";
import { BookingAccommodationProvider } from "../src/lib/providers/accommodation/booking.js";
import { OsmAccommodationProvider } from "../src/lib/providers/accommodation/osm-stays.js";
import { OsmActivitiesProvider } from "../src/lib/providers/activities/osm-activities.js";
import { researchTrip } from "../src/lib/providers/aggregator.js";
import {
  allocateBudget,
  checkBudgetFeasibility,
  simulatePlanChange,
  toMinorUnits,
  formatCurrency,
} from "../src/lib/budget/engine.js";
import { runCFOTests } from "./cfo.test";
import { runOcrItemizedTests } from "./ocr-itemized.test";
import { runCategoryCapsTests } from "./category-caps.test";
import { runComparativeAnalysisTests } from "./comparative-analysis.test";
import { runExpenseChatTests } from "./nlp-expense-chat.test";
import { runUPIAndActualizeTests } from "./upi-actualize.test";

let passedCount = 0;
let failedCount = 0;

async function runTest(name: string, fn: () => Promise<void> | void) {
  try {
    await fn();
    console.log(`  ✓ ${name}`);
    passedCount++;
  } catch (err: any) {
    console.error(`  ✗ ${name}`);
    console.error(`    Error: ${err.message}`);
    failedCount++;
  }
}

async function main() {
  console.log("\n🧪 Running Wander Wallet — Step 1 Provider & Budget Test Suite\n");

  // =========================================================================
  // Test 1: Provider returns valid result with required transparency fields
  // =========================================================================
  await runTest("1. Provider returns valid result with all transparency fields", async () => {
    const transit = new OsmTransitProvider();
    const res = await transit.searchTransport({
      origin: "Bengaluru",
      destination: "Goa",
      travelerCount: 4,
    });

    assert.equal(res.available, true);
    assert.ok(res.items.length > 0, "Should discover transit hubs");

    for (const item of res.items) {
      assert.ok(item.id, "Every item must have an id");
      assert.ok(item.name, "Every item must have a name");
      assert.equal(item.category, "transport");
      assert.ok(item.location, "Every item must have a location");
      assert.ok(item.currency, "Every item must have a currency");
      assert.ok(item.priceType, "Every item must have a priceType");
      assert.ok(item.provider, "Every item must have a provider name");
      assert.ok(item.retrievedAt, "Every item must have a retrievedAt timestamp");
      assert.ok(item.source, "Every item must have a source name");
      assert.ok("availability" in item, "Every item must have an availability field");
      assert.ok("metadata" in item, "Every item must have a metadata field");
    }
  });

  // =========================================================================
  // Test 2: Provider returns no price (PRICE_UNAVAILABLE) when price is unknown
  // =========================================================================
  await runTest("2. Provider returns PRICE_UNAVAILABLE when price cannot be verified", async () => {
    const transit = new OsmTransitProvider();
    const res = await transit.searchTransport({
      origin: "Bengaluru",
      destination: "Goa",
      travelerCount: 2,
    });

    const unpricedItem = res.items.find((i) => i.priceType === "PRICE_UNAVAILABLE");
    assert.ok(unpricedItem, "Should have items marked as PRICE_UNAVAILABLE");
    assert.equal(unpricedItem.price, null, "price must be null when unavailable");
    assert.equal(unpricedItem.priceMinor, null, "priceMinor must be null when unavailable");
    assert.equal(unpricedItem.priceType, "PRICE_UNAVAILABLE");
    assert.ok(
      Boolean(unpricedItem.priceFormatted && unpricedItem.priceFormatted.toLowerCase().includes("unavailable")),
      "Formatted label must indicate price is unavailable"
    );
  });

  // =========================================================================
  // Test 3: Provider is unavailable when credentials are missing
  // =========================================================================
  await runTest("3. Provider handles missing credentials gracefully without throwing", async () => {
    const amadeus = new AmadeusTransportProvider();
    const booking = new BookingAccommodationProvider();

    // With blank env vars, providers must report available=false and explain why
    const amadeusRes = await amadeus.searchTransport({
      origin: "BLR",
      destination: "GOI",
      departureDate: "2026-02-15",
      travelerCount: 2,
    });

    assert.equal(amadeusRes.available, false);
    assert.ok(
      amadeusRes.unavailableReason?.includes("credentials") ||
        amadeusRes.unavailableReason?.includes("AMADEUS"),
      "Must clearly communicate missing credentials"
    );
    assert.equal(amadeusRes.items.length, 0);

    const bookingRes = await booking.searchStays({
      destination: "Goa",
      checkInDate: "2026-02-15",
      checkOutDate: "2026-02-20",
      travelerCount: 2,
    });

    assert.equal(bookingRes.available, false);
    assert.ok(
      bookingRes.unavailableReason?.includes("BOOKING_API_KEY") ||
        bookingRes.unavailableReason?.includes("credentials"),
      "Must clearly communicate missing Booking API key"
    );
    assert.equal(bookingRes.items.length, 0);
  });

  // =========================================================================
  // Test 4: Provider catches errors gracefully
  // =========================================================================
  await runTest("4. Provider catches network/parsing errors without crashing", async () => {
    const osmStays = new OsmAccommodationProvider();

    // Query an invalid/empty destination
    const res = await osmStays.searchStays({
      destination: "   ",
      checkInDate: "2026-02-15",
      checkOutDate: "2026-02-20",
      travelerCount: 2,
    });

    assert.equal(res.available, false);
    assert.ok(res.unavailableReason, "Must provide explanation of why search could not proceed");
    assert.deepEqual(res.items, []);
  });

  // =========================================================================
  // Test 5: Research aggregator handles partial failure and returns metadata
  // =========================================================================
  await runTest("5. Research aggregator handles partial failure and records metadata", async () => {
    const result = await researchTrip({
      origin: "Bengaluru",
      destination: "Goa",
      departureDate: "2026-02-15",
      returnDate: "2026-02-20",
      travelerCount: 4,
      travelStyle: "BALANCED",
      targetCurrency: "INR",
    });

    assert.ok(result.destination, "Must return destination geocoding");
    assert.ok(Array.isArray(result.transport), "Must return transport array");
    assert.ok(Array.isArray(result.accommodation), "Must return accommodation array");
    assert.ok(Array.isArray(result.activities), "Must return activities array");
    assert.ok(Array.isArray(result.places), "Must return places array");
    assert.ok(result.currency, "Must return currency rate");

    assert.ok(result.metadata.researchedAt, "Must include research timestamp");
    assert.ok(Array.isArray(result.metadata.providersUsed), "Must list providers used");
    assert.ok(Array.isArray(result.metadata.unavailableProviders), "Must list unavailable providers");
    assert.equal(typeof result.metadata.unpricedCount, "number");
  });

  // =========================================================================
  // Test 6: Budget engine handles selected research results with minor arithmetic
  // =========================================================================
  await runTest("6. Budget engine handles research results and unpriced items safely", async () => {
    const groupBudgetMinor = toMinorUnits(60000); // ₹60,000 = 6,000,000 paise
    const travelers = 6;

    // 1. Deterministic allocation
    const allocations = allocateBudget(groupBudgetMinor, travelers);
    assert.equal(allocations.length, 6, "Must allocate across all 6 categories");

    const sumAllocated = allocations.reduce((acc, cat) => acc + cat.allocatedMinor, BigInt(0));
    assert.equal(sumAllocated, groupBudgetMinor, "Allocations must equal group budget exactly");

    // 2. Feasibility check with selected spend
    const transportCostMinor = BigInt(792000); // ₹7,920
    const stayCostMinor = BigInt(1520000); // ₹15,200
    const activitiesCostMinor = BigInt(660000); // ₹6,600
    const foodEstimateMinor = BigInt(5) * BigInt(travelers) * BigInt(60000); // ₹18,000
    const localTravelMinor = BigInt(450000); // ₹4,500

    const totalSpend =
      transportCostMinor + stayCostMinor + activitiesCostMinor + foodEstimateMinor + localTravelMinor;

    const feasibility = checkBudgetFeasibility(groupBudgetMinor, totalSpend);
    assert.equal(feasibility.isFeasible, true);
    assert.equal(feasibility.status, "UNDER_BUDGET");
    assert.equal(feasibility.remainingMinor, groupBudgetMinor - totalSpend);

    // 3. Plan change simulation
    const simulation = simulatePlanChange(totalSpend, groupBudgetMinor, BigInt(500000));
    assert.equal(simulation.isWithinBudget, true);
    assert.equal(simulation.newTotalSpendMinor, totalSpend + BigInt(500000));
  });

  // =========================================================================
  // Test 7: Currency conversion works deterministically
  // =========================================================================
  await runTest("7. Currency conversion works and is deterministic", async () => {
    const currency = new FrankfurterCurrencyProvider();

    // Self currency conversion is always 1.0
    const selfRate = await currency.getRate("INR", "INR");
    assert.equal(selfRate.rate, 1.0);

    // Deterministic minor arithmetic conversion
    const conversion = await currency.convert(BigInt(10000), "USD", "INR"); // $100.00
    assert.ok(conversion.convertedMinor > BigInt(0));
    assert.ok(conversion.rate > 0);
    assert.ok(conversion.retrievedAt);
    assert.ok(conversion.provider);
  });

  // =========================================================================
  // Test 8: Price safety - NO fake price is generated
  // =========================================================================
  await runTest("8. Price Safety: No fake prices generated for unverified items", async () => {
    const transit = new OsmTransitProvider();
    const res = await transit.searchTransport({
      origin: "Bengaluru",
      destination: "Goa",
      travelerCount: 2,
    });

    for (const item of res.items) {
      if (item.priceType === "PRICE_UNAVAILABLE") {
        assert.equal(
          item.price,
          null,
          `Item ${item.name} is PRICE_UNAVAILABLE but has price !== null`
        );
        assert.equal(
          item.priceMinor,
          null,
          `Item ${item.name} is PRICE_UNAVAILABLE but has priceMinor !== null`
        );
      }
    }
  });

  // =========================================================================
  // Test 9: Equal split with odd paise remainder distribution
  // =========================================================================
  await runTest("9. Equal split: remainder paise are absorbed without rounding drift", async () => {
    const { calculateExpenseSplit } = await import("../src/lib/expenses/engine.js");
    // ₹100.00 (10000 paise) among 3 members -> 3334, 3333, 3333 = 10000 exactly
    const result = calculateExpenseSplit({
      totalAmountMinor: BigInt(10000),
      splitMethod: "EQUAL",
      participants: [{ memberId: "m1" }, { memberId: "m2" }, { memberId: "m3" }],
    });

    assert.equal(result.isValid, true);
    assert.equal(result.participants.length, 3);
    const sum = result.participants.reduce((acc, p) => acc + p.amountMinor, BigInt(0));
    assert.equal(sum, BigInt(10000));
    assert.equal(result.participants[0].amountMinor, BigInt(3334));
    assert.equal(result.participants[1].amountMinor, BigInt(3333));
    assert.equal(result.participants[2].amountMinor, BigInt(3333));
  });

  // =========================================================================
  // Test 10: Percentage split validation (100% passes, non-100% fails)
  // =========================================================================
  await runTest("10. Percentage split: strictly validates 100% total", async () => {
    const { calculateExpenseSplit } = await import("../src/lib/expenses/engine.js");
    // Valid 50% + 30% + 20% on ₹3,000 (300000 paise)
    const valid = calculateExpenseSplit({
      totalAmountMinor: BigInt(300000),
      splitMethod: "PERCENTAGE",
      participants: [
        { memberId: "m1", percentage: 50 },
        { memberId: "m2", percentage: 30 },
        { memberId: "m3", percentage: 20 },
      ],
    });
    assert.equal(valid.isValid, true);
    const sum = valid.participants.reduce((acc, p) => acc + p.amountMinor, BigInt(0));
    assert.equal(sum, BigInt(300000));
    assert.equal(valid.participants[0].amountMinor, BigInt(150000));
    assert.equal(valid.participants[1].amountMinor, BigInt(90000));
    assert.equal(valid.participants[2].amountMinor, BigInt(60000));

    // Invalid: sum to 90%
    const invalid = calculateExpenseSplit({
      totalAmountMinor: BigInt(300000),
      splitMethod: "PERCENTAGE",
      participants: [
        { memberId: "m1", percentage: 50 },
        { memberId: "m2", percentage: 40 },
      ],
    });
    assert.equal(invalid.isValid, false);
  });

  // =========================================================================
  // Test 11: Exact and Custom split validation
  // =========================================================================
  await runTest("11. Exact & Custom split: validates exact match to total", async () => {
    const { calculateExpenseSplit } = await import("../src/lib/expenses/engine.js");
    // Valid exact split: ₹1,500 + ₹1,000 + ₹500 = ₹3,000
    const valid = calculateExpenseSplit({
      totalAmountMinor: BigInt(300000),
      splitMethod: "EXACT",
      participants: [
        { memberId: "m1", exactAmountMinor: BigInt(150000) },
        { memberId: "m2", exactAmountMinor: BigInt(100000) },
        { memberId: "m3", exactAmountMinor: BigInt(50000) },
      ],
    });
    assert.equal(valid.isValid, true);

    // Invalid exact split: sums to ₹2,800 instead of ₹3,000
    const invalid = calculateExpenseSplit({
      totalAmountMinor: BigInt(300000),
      splitMethod: "EXACT",
      participants: [
        { memberId: "m1", exactAmountMinor: BigInt(150000) },
        { memberId: "m2", exactAmountMinor: BigInt(130000) },
      ],
    });
    assert.equal(invalid.isValid, false);
  });

  // =========================================================================
  // Test 12: Zero & Negative amount rejection
  // =========================================================================
  await runTest("12. Financial safety: rejects zero and negative amounts", async () => {
    const { calculateExpenseSplit } = await import("../src/lib/expenses/engine.js");
    const zeroRes = calculateExpenseSplit({
      totalAmountMinor: BigInt(0),
      splitMethod: "EQUAL",
      participants: [{ memberId: "m1" }],
    });
    assert.equal(zeroRes.isValid, false);

    const negRes = calculateExpenseSplit({
      totalAmountMinor: BigInt(-5000),
      splitMethod: "EQUAL",
      participants: [{ memberId: "m1" }],
    });
    assert.equal(negRes.isValid, false);
  });

  // =========================================================================
  // Test 13: Member Balances calculation
  // =========================================================================
  await runTest("13. Balances calculation: net balance across all members sums to 0", async () => {
    const { calculateMemberBalances } = await import("../src/lib/expenses/engine.js");
    const mockMembers: any[] = [
      { id: "m1", name: "Alice", role: "OWNER" },
      { id: "m2", name: "Bob", role: "MEMBER" },
      { id: "m3", name: "Charlie", role: "MEMBER" },
    ];

    const mockExpenses: any[] = [
      {
        id: "e1",
        payerId: "m1",
        convertedAmountMinor: BigInt(300000), // ₹3,000 paid by Alice
        isPersonal: false,
        participants: [
          { memberId: "m1", shareAmountMinor: BigInt(100000) },
          { memberId: "m2", shareAmountMinor: BigInt(100000) },
          { memberId: "m3", shareAmountMinor: BigInt(100000) },
        ],
      },
    ];

    const balances = calculateMemberBalances(mockMembers, mockExpenses, []);
    assert.equal(balances.length, 3);

    // Alice paid ₹3,000, owes ₹1,000 -> net +₹2,000
    const alice = balances.find((b) => b.memberId === "m1");
    assert.equal(alice?.netBalanceMinor, BigInt(200000));

    // Bob paid 0, owes ₹1,000 -> net -₹1,000
    const bob = balances.find((b) => b.memberId === "m2");
    assert.equal(bob?.netBalanceMinor, BigInt(-100000));

    // Net sum must be 0
    const totalNet = balances.reduce((sum, b) => sum + b.netBalanceMinor, BigInt(0));
    assert.equal(totalNet, BigInt(0));
  });

  // =========================================================================
  // Test 14: Settlement Debt Simplification (Minimum Cash Flow)
  // =========================================================================
  await runTest("14. Settlement Engine: simplifies circular debts into minimal direct transfers", async () => {
    const { calculateSimplifiedSettlements } = await import("../src/lib/settlement/engine.js");
    const mockBalances: any[] = [
      { memberId: "m1", name: "Alice", netBalanceMinor: BigInt(200000) }, // should receive ₹2,000
      { memberId: "m2", name: "Bob", netBalanceMinor: BigInt(-120000) }, // owes ₹1,200
      { memberId: "m3", name: "Charlie", netBalanceMinor: BigInt(-80000) }, // owes ₹800
    ];

    const plan = calculateSimplifiedSettlements("trip-test", mockBalances, [], "INR");
    assert.equal(plan.transactions.length, 2);

    // Bob pays Alice ₹1,200
    const bobToAlice = plan.transactions.find((t) => t.fromMemberId === "m2" && t.toMemberId === "m1");
    assert.ok(bobToAlice);
    assert.equal(bobToAlice?.amountMinor, BigInt(120000));

    // Charlie pays Alice ₹800
    const charlieToAlice = plan.transactions.find((t) => t.fromMemberId === "m3" && t.toMemberId === "m1");
    assert.ok(charlieToAlice);
    assert.equal(charlieToAlice?.amountMinor, BigInt(80000));

    assert.equal(plan.totalSettlementMinor, BigInt(200000));
  });

  // =========================================================================
  // Test 15: Dynamic Itinerary Engine for arbitrary days
  // =========================================================================
  await runTest("15. Dynamic Itinerary: supports 1-day, 3-day, 7-day, and 10-day trip planning", async () => {
    const { generateItinerary } = await import("../src/lib/itinerary/engine.js");

    const durations = [1, 3, 7, 10];
    for (const d of durations) {
      const itin = generateItinerary({
        tripId: `trip-${d}`,
        destination: "Goa, India",
        startDate: "2026-02-01",
        numberOfDays: d,
        travelers: 4,
        selectedActivities: [],
      });

      assert.equal(itin.numberOfDays, d);
      assert.equal(itin.days.length, d, `Expected ${d} days in generated itinerary`);
      assert.ok(itin.totalItineraryCostMinor > BigInt(0), "Itinerary cost should be greater than 0");
      for (const day of itin.days) {
        assert.ok(day.items.length >= 3, `Day ${day.dayNumber} should have at least 3 scheduled items`);
      }
    }
  });

  // =========================================================================
  // Test 16: Multi-Currency expense conversion validation
  // =========================================================================
  await runTest("16. Multi-Currency: converts foreign expenses to trip base currency", async () => {
    const { FrankfurterCurrencyProvider } = await import("../src/lib/providers/currency/frankfurter.js");
    const currencyProvider = new FrankfurterCurrencyProvider();
    const rateRes = await currencyProvider.getRate("EUR", "INR");

    assert.equal(rateRes.fromCurrency, "EUR");
    assert.equal(rateRes.toCurrency, "INR");
    assert.ok(rateRes.rate > 50, "EUR to INR rate should be realistic");

    // 100 EUR in paise = 10000 paise * rate
    const eurPaise = BigInt(10000);
    const convertedPaise = BigInt(Math.round(Number(eurPaise) * rateRes.rate));
    assert.ok(convertedPaise > BigInt(500000), "100 EUR should convert to > ₹5,000 in paise");
  });

  // =========================================================================
  // Test 17: Itemized Restaurant Bill Splitting (Veg vs Non-Veg / Drinkers)
  // =========================================================================
  await runTest("17. Itemized Bill Split: accurately separates Veg, Non-Veg, Drinks with proportional tax", async () => {
    const { calculateItemizedBillSplit } = await import("../src/lib/expenses/engine.js");
    const mockMembers = [
      { id: "m1", name: "Alice (Veg, No Alcohol)" },
      { id: "m2", name: "Bob (Veg, Drinks)" },
      { id: "m3", name: "Charlie (Non-Veg, Drinks)" },
      { id: "m4", name: "Dave (Non-Veg, No Alcohol)" },
    ];

    const items = [
      // Veg Paneer Tikka ₹400 shared by Alice and Bob
      { name: "Paneer Tikka", amountMinor: BigInt(40000), participantIds: ["m1", "m2"] },
      // Non-veg Prawns ₹800 shared by Charlie and Dave
      { name: "Butter Garlic Prawns", amountMinor: BigInt(80000), participantIds: ["m3", "m4"] },
      // Cocktails ₹600 shared by Bob and Charlie
      { name: "Cocktails", amountMinor: BigInt(60000), participantIds: ["m2", "m3"] },
      // Garlic Naan & Rice ₹200 shared by all 4
      { name: "Naan & Rice", amountMinor: BigInt(20000), participantIds: ["m1", "m2", "m3", "m4"] },
    ];

    // Total food = ₹2,000 (200000 paise). 5% GST = ₹100 (10000 paise). Grand Total = ₹2,100 (210000 paise)
    const result = calculateItemizedBillSplit(items, BigInt(10000), mockMembers);

    assert.equal(result.totalBillMinor, BigInt(210000));
    assert.equal(result.subtotalMinor, BigInt(200000));

    // Verify sum of individual shares exactly equals grand total ₹2,100.00
    const totalAllocated = result.memberShares.reduce((sum, ms) => sum + ms.totalShareMinor, BigInt(0));
    assert.equal(totalAllocated, BigInt(210000));

    // Alice only ate Veg (₹200 paneer + ₹50 naan = ₹250) + proportional tax (5% of ₹250 = ₹12.50 -> ₹262.50)
    const aliceShare = result.memberShares.find((m) => m.memberId === "m1");
    assert.ok(aliceShare);
    assert.equal(aliceShare.itemsSubtotalMinor, BigInt(25000)); // ₹250.00
    assert.ok(aliceShare.totalShareMinor < BigInt(30000), "Alice should only pay for her veg food and low proportional tax");

    // Charlie ate seafood and drank cocktails (₹400 prawns + ₹300 drinks + ₹50 naan = ₹750) + higher tax
    const charlieShare = result.memberShares.find((m) => m.memberId === "m3");
    assert.ok(charlieShare);
    assert.equal(charlieShare.itemsSubtotalMinor, BigInt(75000)); // ₹750.00
    assert.ok(charlieShare.totalShareMinor > BigInt(75000));
  });

  // =========================================================================
  // Test 18: The AI Group CFO — Financial Health Scoring & Velocity Intelligence
  // =========================================================================
  await runTest("18. The AI Group CFO: Health Score, Burn Rate Velocity & Concentration Risk", async () => {
    await runCFOTests();
  });

  // =========================================================================
  // Test 19: Receipt OCR & Itemized Bill Tagging — Zero-Drift Proportional Tax
  // =========================================================================
  await runTest("19. Receipt OCR & Itemized Bill Tagging: zero-drift proportional GST & dish tagging", async () => {
    await runOcrItemizedTests();
  });

  // =========================================================================
  // Test 20: Subset Member Splitting — Only 2 of N members buy, others owe 0
  // =========================================================================
  await runTest("20. Subset Splitting: Only participating members incur debt; non-participants owe 0", async () => {
    const { calculateExpenseSplit, calculateMemberBalances } = await import("../src/lib/expenses/engine.js");

    const members = [
      { id: "m1", name: "Alice" },
      { id: "m2", name: "Bob" },
      { id: "m3", name: "Charlie" },
      { id: "m4", name: "Dave" },
    ];

    // Expense 1: Whole group villa ₹4,000 paid by Alice for all 4 members
    const villaSplit = calculateExpenseSplit({
      totalAmountMinor: BigInt(400000), // ₹4,000
      splitMethod: "EQUAL",
      participants: members.map((m) => ({ memberId: m.id })),
    });
    assert.equal(villaSplit.shares.length, 4);
    assert.equal(villaSplit.shares[0].amountMinor, BigInt(100000)); // ₹1,000 each

    // Expense 2: Only Bob & Charlie go for scuba diving ₹2,000 paid by Bob (Alice & Dave excluded!)
    const scubaSplit = calculateExpenseSplit({
      totalAmountMinor: BigInt(200000), // ₹2,000
      splitMethod: "EQUAL",
      participants: [{ memberId: "m2" }, { memberId: "m3" }],
    });
    assert.equal(scubaSplit.shares.length, 2);
    assert.equal(scubaSplit.shares[0].amountMinor, BigInt(100000)); // ₹1,000 each for Bob & Charlie

    // Form expense list
    const expenses = [
      {
        id: "exp-1",
        payerId: "m1",
        convertedAmountMinor: BigInt(400000),
        isPersonal: false,
        shares: villaSplit.shares,
      },
      {
        id: "exp-2",
        payerId: "m2",
        convertedAmountMinor: BigInt(200000),
        isPersonal: false,
        shares: scubaSplit.shares,
      },
    ];

    const balances = calculateMemberBalances(members, expenses, []);
    const bAlice = balances.find((b) => b.memberId === "m1")!;
    const bBob = balances.find((b) => b.memberId === "m2")!;
    const bCharlie = balances.find((b) => b.memberId === "m3")!;
    const bDave = balances.find((b) => b.memberId === "m4")!;

    // Alice paid ₹4,000 for villa, only consumed ₹1,000 share -> gets back ₹3,000 (+300000)
    assert.equal(bAlice.netBalanceMinor, BigInt(300000));

    // Bob paid ₹2,000 for scuba, consumed ₹1,000 villa + ₹1,000 scuba = ₹2,000 -> perfectly even (0)
    assert.equal(bBob.netBalanceMinor, BigInt(0));

    // Charlie consumed ₹1,000 villa + ₹1,000 scuba, paid ₹0 -> owes ₹2,000 (-200000)
    assert.equal(bCharlie.netBalanceMinor, BigInt(-200000));

    // Dave only consumed ₹1,000 villa, scuba did NOT touch him at all -> owes only ₹1,000 (-100000)
    assert.equal(bDave.netBalanceMinor, BigInt(-100000));

    // Invariant: sum of net balances must equal 0
    const netSum = balances.reduce((sum, b) => sum + b.netBalanceMinor, BigInt(0));
    assert.equal(netSum, BigInt(0));
  });

  // =========================================================================
  // Test 21: Category Caps & Breach Alert
  // =========================================================================
  await runTest("21. Category Caps & Breach Alert: decimal arithmetic, FX conversion, dual cap & total accounting", async () => {
    await runCategoryCapsTests();
  });

  // =========================================================================
  // Test 22: AI Comparative Spend & OCR Analysis
  // =========================================================================
  await runTest("22. AI Comparative Spend & OCR Analysis: NLP summary, OCR dish driver attribution, and extra budget top-up", async () => {
    await runComparativeAnalysisTests();
  });

  // =========================================================================
  // Test 23: NLP Conversational Expense Chat & Bill Splitter
  // =========================================================================
  await runTest("23. NLP Expense Chat & Bill Splitter: human language parsing, payer detection, and zero-remainder splits", async () => {
    const chatResults = await runExpenseChatTests();
    assert.equal(chatResults.failed, 0, "All NLP expense chat assertions must pass");
  });

  // =========================================================================
  // Test 24: Live UPI Payment QR & Itinerary One-Tap Actualize
  // =========================================================================
  await runTest("24. Live UPI Payment QR & Itinerary One-Tap Actualize: standard UPI links, base64 PNG rendering, category mapping & nominal fallback", async () => {
    await runUPIAndActualizeTests();
  });

  console.log(`\n========================================`);
  console.log(`Results: ${passedCount} passed, ${failedCount} failed`);
  console.log(`========================================\n`);

  if (failedCount > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Test runner crashed:", err);
  process.exit(1);
});
