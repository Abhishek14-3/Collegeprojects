import {
  evaluateCategoryCapsAndBreaches,
  deriveDefaultCategoryCaps,
  DEFAULT_CAP_RATIOS,
} from "../src/lib/budget/caps";
import { FrankfurterCurrencyProvider } from "../src/lib/providers/currency/frankfurter";

export async function runCategoryCapsTests() {
  console.log("\n🧪 Running Wander Wallet — Category Caps & Breach Alert Test Suite\n");
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

  // TEST 1: Default cap derivation uses exact integer decimal minor units
  const totalBudgetMinor = BigInt(6000000); // ₹60,000 in paise
  const defaultCaps = deriveDefaultCategoryCaps(totalBudgetMinor);

  assert(defaultCaps.FOOD === BigInt(1200000), "Default FOOD cap is 20% (₹12,000.00 = 1200000 paise)");
  assert(defaultCaps.STAY === BigInt(2100000), "Default STAY cap is 35% (₹21,000.00 = 2100000 paise)");
  assert(defaultCaps.TRANSPORT === BigInt(1500000), "Default TRANSPORT cap is 25% (₹15,000.00 = 1500000 paise)");
  assert(defaultCaps.ACTIVITIES === BigInt(900000), "Default ACTIVITIES cap is 15% (₹9,000.00 = 900000 paise)");

  // TEST 2: Under-cap expenses produce OK status and no breach alerts
  const underExpenses = [
    {
      category: "FOOD",
      amountMinor: BigInt(500000), // ₹5,000.00
      convertedAmountMinor: BigInt(500000),
      currency: "INR",
    },
    {
      category: "STAY",
      amountMinor: BigInt(1500000), // ₹15,000.00
      convertedAmountMinor: BigInt(1500000),
      currency: "INR",
    },
  ];

  const underRes = evaluateCategoryCapsAndBreaches({
    totalBudgetMinor,
    categoryCaps: defaultCaps,
    expenses: underExpenses,
    currency: "INR",
    alertThresholdPct: 80,
  });

  assert(underRes.hasBreach === false, "No breaches when spend is under caps");
  const foodSummary = underRes.categorySummaries.find((c) => c.category === "FOOD");
  assert(foodSummary?.status === "OK", "Food category status is OK under threshold");
  assert(foodSummary?.spentMinor === BigInt(500000), "Food spent minor is accurate");
  assert(foodSummary?.remainingMinor === BigInt(700000), "Remaining food headroom is accurate (₹7,000)");

  // TEST 3: Warning threshold alert when spend crosses 80%
  const warnExpenses = [
    {
      category: "FOOD",
      amountMinor: BigInt(1000000), // ₹10,000.00 on ₹12,000 cap = 83.33%
      convertedAmountMinor: BigInt(1000000),
      currency: "INR",
    },
  ];

  const warnRes = evaluateCategoryCapsAndBreaches({
    totalBudgetMinor,
    categoryCaps: defaultCaps,
    expenses: warnExpenses,
    currency: "INR",
    alertThresholdPct: 80,
  });

  assert(warnRes.hasWarning === true, "Warning flag set when category spend crosses threshold (80%)");
  const warnAlert = warnRes.activeAlerts.find((a) => a.category === "FOOD");
  assert(warnAlert?.level === "WARNING", "Alert level is WARNING");
  assert(warnAlert?.thresholdPct === 80, "Alert threshold matches configured 80%");

  // TEST 4: Category Cap Breach Alert with accurate overshoot calculation
  // Food cap is ₹12,000 (1200000 paise). Spend is ₹14,500 (1450000 paise). Overshoot is ₹2,500 (250000 paise).
  const breachExpenses = [
    {
      category: "FOOD",
      amountMinor: BigInt(1450000),
      convertedAmountMinor: BigInt(1450000),
      currency: "INR",
    },
  ];

  const breachRes = evaluateCategoryCapsAndBreaches({
    totalBudgetMinor,
    categoryCaps: defaultCaps,
    expenses: breachExpenses,
    currency: "INR",
    alertThresholdPct: 80,
  });

  assert(breachRes.hasBreach === true, "Breach detected when spend exceeds cap");
  const foodBreachAlert = breachRes.activeAlerts.find((a) => a.category === "FOOD");
  assert(foodBreachAlert !== undefined, "Active breach alert generated for FOOD");
  assert(foodBreachAlert?.level === "BREACH", "Alert level is BREACH");
  assert(foodBreachAlert?.capMinor === BigInt(1200000), "Alert contains exact capMinor (₹12,000)");
  assert(foodBreachAlert?.currentSpendMinor === BigInt(1450000), "Alert contains exact currentSpendMinor (₹14,500)");
  assert(foodBreachAlert?.overshootMinor === BigInt(250000), "Alert contains exact overshootMinor (+₹2,500)");

  // TEST 5: Total trip budget breach alert
  const totalBreachExpenses = [
    {
      category: "STAY",
      amountMinor: BigInt(6500000), // ₹65,000 on a ₹60,000 total trip budget
      convertedAmountMinor: BigInt(6500000),
      currency: "INR",
    },
  ];

  const totalBreachRes = evaluateCategoryCapsAndBreaches({
    totalBudgetMinor,
    categoryCaps: defaultCaps,
    expenses: totalBreachExpenses,
    currency: "INR",
    alertThresholdPct: 80,
  });

  const totalAlert = totalBreachRes.activeAlerts.find((a) => a.scope === "TOTAL");
  assert(totalAlert !== undefined, "Trip total budget breach generates a TOTAL alert");
  assert(totalAlert?.overshootMinor === BigInt(500000), "Total overshoot is exactly ₹5,000 (500000 paise)");

  // TEST 6: Foreign-Currency Expense Conversion via FX rate & Dual-Accounting
  // $120.00 USD dinner converted via fx rate 86.55 = ₹10,386.00 (1038600 paise)
  const fxProvider = new FrankfurterCurrencyProvider();
  const fxRate = await fxProvider.getRate("USD", "INR");
  assert(fxRate.rate > 80, "USD to INR FX rate is valid (>80)");

  const usdAmountMinor = BigInt(12000); // $120.00 USD
  const convertedPaise = BigInt(Math.round(Number(usdAmountMinor) * fxRate.rate));

  const foreignExpenses = [
    {
      category: "FOOD",
      amountMinor: BigInt(360000), // ₹3,600 INR existing local expense
      convertedAmountMinor: BigInt(360000),
      currency: "INR",
    },
    {
      category: "FOOD",
      amountMinor: usdAmountMinor, // $120.00 USD foreign expense
      convertedAmountMinor: convertedPaise,
      currency: "USD",
      exchangeRate: fxRate.rate,
    },
  ];

  const foreignRes = evaluateCategoryCapsAndBreaches({
    totalBudgetMinor,
    categoryCaps: defaultCaps,
    expenses: foreignExpenses,
    currency: "INR",
    alertThresholdPct: 80,
  });

  const expectedTotalFoodMinor = BigInt(360000) + convertedPaise;
  const foodAfterFx = foreignRes.categorySummaries.find((c) => c.category === "FOOD");
  assert(foodAfterFx?.spentMinor === expectedTotalFoodMinor, "Foreign expense counted accurately in home currency against category cap");
  assert(foreignRes.totalSpendMinor === expectedTotalFoodMinor, "Foreign expense counted accurately in home currency against total trip budget");
  assert(foreignRes.hasBreach === true, "Foreign expense conversion triggers Food cap breach (₹13,986 > ₹12,000 cap)");

  console.log(`\n========================================`);
  console.log(`Category Caps Results: ${passed} passed, ${failed} failed`);
  console.log(`========================================\n`);

  if (failed > 0) {
    throw new Error(`${failed} Category Caps tests failed!`);
  }
}

if (require.main === module) {
  runCategoryCapsTests().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
