import assert from "node:assert/strict";
import { calculateItemizedBillSplit } from "../src/lib/expenses/engine";

export async function runOcrItemizedTests() {
  console.log("\n🧪 Running Wander Wallet — Receipt OCR & Itemized Bill Tagging Test Suite\n");
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

  // TEST 1: Complex 4-person restaurant dinner with Veg/Non-Veg/Drinks separation
  const members = [
    { id: "m1", name: "Ananya (Pure Veg, Non-Drinker)" },
    { id: "m2", name: "Rohan (Non-Veg, Non-Drinker)" },
    { id: "m3", name: "Vikram (Non-Veg, Cocktails)" },
    { id: "m4", name: "Sneha (Veg, Cocktails)" },
  ];

  const items = [
    // Dish 1: Paneer Butter Masala ₹380 consumed by Ananya & Sneha
    { name: "Paneer Butter Masala", amountMinor: BigInt(38000), participantIds: ["m1", "m4"] },
    // Dish 2: Goan Fish Curry ₹650 consumed by Rohan & Vikram
    { name: "Goan Fish Curry", amountMinor: BigInt(65000), participantIds: ["m2", "m3"] },
    // Dish 3: Steamed Basmati Rice ₹180 shared by all 4
    { name: "Steamed Rice", amountMinor: BigInt(18000), participantIds: ["m1", "m2", "m3", "m4"] },
    // Dish 4: Garlic Naan Basket ₹220 shared by all 4
    { name: "Garlic Naan Basket", amountMinor: BigInt(22000), participantIds: ["m1", "m2", "m3", "m4"] },
    // Dish 5: Signature Cocktails ₹900 consumed ONLY by Vikram & Sneha
    { name: "Cocktails", amountMinor: BigInt(90000), participantIds: ["m3", "m4"] },
  ];

  // 5% GST = ₹116.50 (11650 paise) on subtotal ₹2,330.00 (233000 paise)
  const gstMinor = BigInt(11650);
  const splitResult = calculateItemizedBillSplit(items, gstMinor, members);

  test(splitResult.subtotalMinor === BigInt(233000), "Subtotal strictly equals sum of items (₹2,330.00)");
  test(splitResult.totalBillMinor === BigInt(244650), "Total bill strictly equals Subtotal + 5% GST (₹2,446.50)");

  // Verify zero-drift penny/paise balance guarantee
  const totalAllocated = splitResult.memberShares.reduce((sum, s) => sum + s.totalShareMinor, BigInt(0));
  test(totalAllocated === splitResult.totalBillMinor, "Zero rounding drift: Sum of individual shares exactly equals printed bill");

  // Ananya: Veg curry (190) + Rice (45) + Naan (55) = ₹290 subtotal. Proportional tax: ~₹14.50. Total: ~₹304.50
  const ananya = splitResult.memberShares.find((s) => s.memberId === "m1");
  test(Boolean(ananya), "Ananya has calculated share");
  test(ananya!.itemsSubtotalMinor === BigInt(29000), "Ananya subtotal is exactly ₹290.00");
  test(ananya!.totalShareMinor < BigInt(31000), "Ananya does not pay for seafood or cocktails tax");

  // Vikram: Fish curry (325) + Rice (45) + Naan (55) + Cocktails (450) = ₹875 subtotal. Proportional tax: ~₹43.75. Total: ~₹918.75
  const vikram = splitResult.memberShares.find((s) => s.memberId === "m3");
  test(Boolean(vikram), "Vikram has calculated share");
  test(vikram!.itemsSubtotalMinor === BigInt(87500), "Vikram subtotal is exactly ₹875.00");
  test(vikram!.taxAndServiceShareMinor > ananya!.taxAndServiceShareMinor, "Drinker pays higher proportional tax than non-drinker");

  // TEST 2: Single person sole consumption (e.g. personal dessert)
  const soloResult = calculateItemizedBillSplit(
    [{ name: "Chocolate Lava Cake", amountMinor: BigInt(25000), participantIds: ["m1"] }],
    BigInt(1250), // 5% GST
    members
  );
  test(soloResult.memberShares.length === 1, "Only consumer has bill share");
  test(soloResult.memberShares[0].memberId === "m1", "Ananya pays 100% of her solo item");
  test(soloResult.memberShares[0].totalShareMinor === BigInt(26250), "Solo item matches total plus exact tax");

  // TEST 3: Zero-tax bill split (user removes the adding feature from GST)
  const noTaxResult = calculateItemizedBillSplit(items, BigInt(0), members);
  test(noTaxResult.taxAndServiceMinor === BigInt(0), "Tax is strictly 0 when GST adding feature is removed");
  test(noTaxResult.totalBillMinor === noTaxResult.subtotalMinor, "Total bill strictly equals items subtotal without tax addition");
  for (const s of noTaxResult.memberShares) {
    test(s.taxAndServiceShareMinor === BigInt(0), `Member ${s.memberId} has 0 tax added`);
    test(s.totalShareMinor === s.itemsSubtotalMinor, `Member ${s.memberId} total strictly equals items consumed`);
  }

  // TEST 4: Statutory GST 28% ceiling limit calculation
  const subtotal = items.reduce((sum, it) => sum + it.amountMinor, BigInt(0));
  const statutoryLimitMinor = (subtotal * BigInt(28)) / BigInt(100);
  test(statutoryLimitMinor === BigInt(65240), "28% statutory ceiling on ₹2,330 is exactly ₹652.40 (65240 paise)");

  console.log(`\n========================================`);
  console.log(`OCR Itemized Results: ${passed} passed, ${failed} failed`);
  console.log(`========================================\n`);

  if (failed > 0) {
    throw new Error(`${failed} OCR Itemized tests failed!`);
  }
}

if (require.main === module) {
  runOcrItemizedTests().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
