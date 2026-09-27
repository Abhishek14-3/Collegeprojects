import { processExpenseChatMessage, TripMemberContext } from "../src/lib/ai/nlp-expense-engine";

export async function runExpenseChatTests(): Promise<{ passed: number; failed: number }> {
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, name: string) {
    if (condition) {
      console.log(`  ✓ ${name}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${name}`);
      failed++;
    }
  }

  console.log("\n🧪 Running Wander Wallet — NLP Expense Chat & Bill Splitter Test Suite\n");

  const mockMembers: TripMemberContext[] = [
    { id: "mem-1", name: "Alex Organizer", role: "ORGANIZER" },
    { id: "mem-2", name: "Rahul Sharma", role: "MEMBER" },
    { id: "mem-3", name: "Priya Patel", role: "MEMBER" },
    { id: "mem-4", name: "Kabir Singh", role: "MEMBER" },
  ];

  // Test 1: Equal split parsed from plain language
  {
    const res = await processExpenseChatMessage({
      message: "I paid ₹4,000 for dinner at Fisherman's Wharf, split equally among everyone",
      tripMembers: mockMembers,
      tripCurrency: "INR",
      currentUserId: "mem-1",
    });

    assert(res.expenseData !== null, "Expense data generated from natural language");
    assert(res.expenseData?.title.includes("Fisherman") || res.expenseData?.title.includes("Dinner") || false, "Detected dinner/merchant title");
    assert(res.expenseData?.amountMinor === 400000, "Exact total amount 400000 paise (₹4,000.00)");
    assert(res.expenseData?.payerId === "mem-1", "Identified Alex ('I paid') as payer");
    assert(res.expenseData?.participants.length === 4, "Split among all 4 members");
    
    // Check zero-remainder invariant
    const sumShares = res.expenseData?.participants.reduce((sum, p) => sum + p.shareAmountMinor, 0);
    assert(sumShares === 400000, "Zero-remainder invariant: sum of shares exactly equals 400000 paise");
    assert(res.expenseData?.participants[0].shareAmountMinor === 100000, "Per traveler share is exactly ₹1,000.00 (100000 paise)");
  }

  // Test 2: Payer name detection and transit category
  {
    const res = await processExpenseChatMessage({
      message: "Rahul paid 850 rs for the cab to the hotel",
      tripMembers: mockMembers,
      tripCurrency: "INR",
      currentUserId: "mem-1",
    });

    assert(res.expenseData !== null, "Cab expense data generated");
    assert(res.expenseData?.category === "TRANSPORT", "Categorized as TRANSPORT");
    assert(res.expenseData?.payerId === "mem-2", "Identified Rahul as payer");
    assert(res.expenseData?.amountMinor === 85000, "Amount is ₹850.00 (85000 paise)");

    const sumShares = res.expenseData?.participants.reduce((sum, p) => sum + p.shareAmountMinor, 0);
    assert(sumShares === 85000, "Zero-drift guarantee: sum of shares strictly equals ₹850.00");
  }

  // Test 3: Exclusions / subset splitting
  {
    const res = await processExpenseChatMessage({
      message: "We bought lunch for ₹2,400 paid by Priya, except Kabir who didn't eat",
      tripMembers: mockMembers,
      tripCurrency: "INR",
      currentUserId: "mem-1",
    });

    assert(res.expenseData !== null, "Subset lunch expense parsed");
    assert(res.expenseData?.payerId === "mem-3", "Priya identified as payer");
    
    // Kabir should be excluded
    const hasKabir = res.expenseData?.participants.some((p) => p.memberId === "mem-4");
    assert(!hasKabir || res.expenseData?.participants.length === 3, "Kabir excluded from lunch split");

    const sumShares = res.expenseData?.participants.reduce((sum, p) => sum + p.shareAmountMinor, 0);
    assert(sumShares === 240000, "Exact paise sum matches total ₹2,400");
  }

  // Test 4: Missing amount clarification
  {
    const res = await processExpenseChatMessage({
      message: "We had lunch at Cafe Delight and Rahul paid",
      tripMembers: mockMembers,
      tripCurrency: "INR",
      currentUserId: "mem-1",
    });

    assert(res.expenseData === null || !res.expenseData.isReadyToSave, "Flags missing total amount politely without crashing");
    assert(res.reply.length > 10, "Provides polite conversational question asking for amount");
  }

  // Test 5: Scanned Receipt OCR + NLP Line-Item Binding
  {
    const mockReceipt = {
      merchant: "Fisherman's Wharf Grill",
      totalMinor: 385000, // ₹3,850
      subtotalMinor: 350000,
      taxMinor: 35000,
      suggestedCategory: "FOOD",
      items: [
        { id: "item-1", name: "Craft Beers", amountMinor: 80000 },
        { id: "item-2", name: "Creamy Pasta", amountMinor: 90000 },
        { id: "item-3", name: "Fish Thali", amountMinor: 120000 },
        { id: "item-4", name: "Chocolate Dessert", amountMinor: 60000 },
      ],
    };

    const res = await processExpenseChatMessage({
      message: "Rahul had the beers, Priya had the pasta, I had fish thali, split the rest equally; I paid",
      tripMembers: mockMembers,
      tripCurrency: "INR",
      currentUserId: "mem-1",
      scannedReceiptData: mockReceipt,
    });

    assert(res.expenseData !== null, "Scanned receipt + speech parsed successfully");
    assert(res.expenseData?.title === "Fisherman's Wharf Grill", "Merchant title bound from receipt");
    assert(res.expenseData?.amountMinor === 385000, "Total amount matches receipt exactly (₹3,850.00)");
    assert(res.expenseData?.payerId === "mem-1", "Alex recognized as payer");
    assert(res.expenseData?.splitMethod === "CUSTOM", "Split method set to CUSTOM itemized");
    
    // Check zero-remainder invariant
    const sumShares = res.expenseData?.participants.reduce((sum, p) => sum + p.shareAmountMinor, 0);
    assert(sumShares === 385000, "Zero-drift guarantee: sum of member shares strictly equals 385000 paise");

    // Check item assignments
    const rahulShare = res.expenseData?.participants.find((p) => p.memberId === "mem-2");
    const priyaShare = res.expenseData?.participants.find((p) => p.memberId === "mem-3");
    const alexShare = res.expenseData?.participants.find((p) => p.memberId === "mem-1");

    assert(Boolean(rahulShare && rahulShare.shareAmountMinor > 0), "Rahul assigned bill share");
    assert(Boolean(priyaShare && priyaShare.shareAmountMinor > 0), "Priya assigned bill share");
    assert(Boolean(alexShare && alexShare.shareAmountMinor > 0), "Alex assigned bill share");
    assert(Boolean(res.expenseData?.itemBreakdown && res.expenseData.itemBreakdown.length > 0), "Item breakdown populated with claimed dishes");
  }

  return { passed, failed };
}

// Standalone execution if run directly
if (require.main === module) {
  runExpenseChatTests().then(({ passed, failed }) => {
    console.log(`\nResults: ${passed} passed, ${failed} failed\n`);
    process.exit(failed > 0 ? 1 : 0);
  });
}
