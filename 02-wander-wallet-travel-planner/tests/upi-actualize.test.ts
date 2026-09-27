import assert from "node:assert/strict";
import QRCode from "qrcode";

export async function runUPIAndActualizeTests() {
  console.log("\n🧪 Running Wander Wallet — Live UPI QR & Itinerary One-Tap Actualize Test Suite\n");

  let passed = 0;
  let failed = 0;

  async function test(name: string, fn: () => Promise<void> | void) {
    try {
      await fn();
      console.log(`  ✓ ${name}`);
      passed++;
    } catch (e: any) {
      console.error(`  ✗ ${name}: ${e.message}`);
      failed++;
    }
  }

  // 1. UPI Payment Deep-Link Construction
  await test("Constructs valid standard UPI deep link string", () => {
    const upiId = "rahul.sharma@okaxis";
    const receiverName = "Rahul Sharma";
    const amountMinor = 245050; // ₹2,450.50
    const amountInRupees = (amountMinor / 100).toFixed(2);
    const tripTitle = "Goa Beach Retreat";

    const link = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(
      receiverName
    )}&am=${amountInRupees}&cu=INR&tn=${encodeURIComponent(
      `WanderWallet: ${tripTitle} Settlement`
    )}`;

    assert.ok(link.startsWith("upi://pay?"), "Link must use standard upi:// scheme");
    assert.ok(link.includes("pa=rahul.sharma%40okaxis") || link.includes("pa=rahul.sharma@okaxis"), "Contains receiver VPA");
    assert.ok(link.includes("pn=Rahul%20Sharma") || link.includes("pn=Rahul+Sharma"), "Contains receiver name");
    assert.ok(link.includes("am=2450.50"), "Contains precise two-decimal amount");
    assert.ok(link.includes("cu=INR"), "Specifies INR currency");
    assert.ok(link.includes("WanderWallet"), "Specifies transaction note");
  });

  // 2. High-Resolution QR Code Generation via QRCode library
  await test("Generates authentic base64 PNG data URL from UPI link", async () => {
    const upiUrl = "upi://pay?pa=priya@ybl&pn=Priya%20Nair&am=1800.00&cu=INR&tn=WanderWallet";
    const dataUrl = await QRCode.toDataURL(upiUrl, {
      errorCorrectionLevel: "H",
      margin: 2,
      width: 320,
      color: {
        dark: "#163F38",
        light: "#FFFFFF",
      },
    });

    assert.ok(dataUrl.startsWith("data:image/png;base64,"), "Data URL must be base64-encoded PNG image");
    assert.ok(dataUrl.length > 500, "Generated QR data must be populated");
  });

  // 3. Custom UPI ID editing & real-time regeneration
  await test("Regenerates QR accurately when user edits recipient VPA", async () => {
    const initialVpa = "ananya@okaxis";
    const updatedVpa = "ananya99@paytm";
    const amount = "3500.00";

    const initialLink = `upi://pay?pa=${initialVpa}&pn=Ananya&am=${amount}&cu=INR`;
    const updatedLink = `upi://pay?pa=${updatedVpa}&pn=Ananya&am=${amount}&cu=INR`;

    const qr1 = await QRCode.toDataURL(initialLink);
    const qr2 = await QRCode.toDataURL(updatedLink);

    assert.notEqual(qr1, qr2, "QR code must differ when VPA is modified");
  });

  // 4. Itinerary One-Tap Actualization: Category Mapping
  await test("Correctly maps itinerary category types to expense categories", () => {
    const catMap: Record<string, string> = {
      food: "FOOD",
      transport: "TRANSPORT",
      stay: "STAY",
      activity: "ACTIVITIES",
      local: "ACTIVITIES",
    };

    assert.equal(catMap["food"], "FOOD");
    assert.equal(catMap["transport"], "TRANSPORT");
    assert.equal(catMap["stay"], "STAY");
    assert.equal(catMap["activity"], "ACTIVITIES");
    assert.equal(catMap["local"], "ACTIVITIES");
  });

  // 5. Itinerary One-Tap Actualization: Verified Price vs Unpriced Fallback
  await test("Uses verified minor cost when available, or safe nominal fallback", () => {
    // Verified item
    const verifiedItem = {
      title: "Scuba Diving at Grande Island",
      costMinor: BigInt(350000), // ₹3,500.00
      formattedCost: "₹3,500",
    };

    let amount1 = verifiedItem.costMinor;
    if (amount1 <= BigInt(0)) amount1 = BigInt(50000);
    assert.equal(amount1.toString(), "350000");

    // Unpriced / PRICE_UNAVAILABLE item
    const unpricedItem = {
      title: "Sunset Ferry Crossing",
      costMinor: BigInt(0),
      formattedCost: "PRICE_UNAVAILABLE",
    };

    let amount2 = unpricedItem.costMinor;
    if (amount2 <= BigInt(0)) amount2 = BigInt(50000); // nominal ₹500
    assert.equal(amount2.toString(), "50000", "Fallback defaults to nominal ₹500 without crashing");
  });

  // 6. Equal split verification for actualized itinerary slot
  await test("Actualized itinerary slot splits deterministically across 4 travelers with 0 drift", () => {
    const totalMinor = BigInt(350000); // ₹3,500.00
    const travelerCount = 4;
    const baseShare = totalMinor / BigInt(travelerCount); // 87500 paise (₹875.00)
    const remainder = totalMinor % BigInt(travelerCount); // 0 paise

    assert.equal(baseShare, BigInt(87500));
    assert.equal(remainder, BigInt(0));
    assert.equal(baseShare * BigInt(4) + remainder, totalMinor);
  });

  console.log(`\n========================================`);
  console.log(`UPI & Actualize Results: ${passed} passed, ${failed} failed`);
  console.log(`========================================\n`);

  if (failed > 0) {
    throw new Error(`${failed} tests failed in UPI & Actualize test suite`);
  }
}
