"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  X,
  Sparkles,
  Send,
  Upload,
  CheckCircle2,
  AlertCircle,
  Receipt,
  Check,
  ArrowRight,
  RefreshCw,
  Utensils,
  Car,
  Home,
  Compass,
  ShoppingBag,
  Mic,
  MicOff,
  ChevronDown,
  ChevronUp,
  FileText,
  Layers,
  Percent,
  Users,
  DollarSign,
  Plus,
  Trash2,
  SlidersHorizontal,
} from "lucide-react";
import {
  ParsedExpenseData,
  TripMemberContext,
  ExpenseChatMessage,
} from "@/lib/ai/nlp-expense-engine";
import { ExtractedReceiptData, ExtractedBillItem } from "@/app/api/ocr/scan/route";

export interface SmartBillDockProps {
  isOpen: boolean;
  onClose: () => void;
  tripId: string;
  tripTitle: string;
  destination: string;
  currency: string;
  members: TripMemberContext[];
  initialReceiptData?: ExtractedReceiptData | null;
  onExpenseRecorded?: () => void;
}

export function SmartBillDock({
  isOpen,
  onClose,
  tripId,
  tripTitle,
  destination,
  currency,
  members,
  initialReceiptData,
  onExpenseRecorded,
}: SmartBillDockProps) {
  // Mode: "conversational" (default) or "visual-matrix"
  const [activeMode, setActiveMode] = useState<"conversational" | "visual-matrix">("conversational");

  // Receipt state
  const [scannedReceipt, setScannedReceipt] = useState<ExtractedReceiptData | null>(initialReceiptData || null);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrError, setOcrError] = useState<string | null>(null);
  const [showItemsDrawer, setShowItemsDrawer] = useState(false);
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  // Chat conversation state
  const [messages, setMessages] = useState<ExpenseChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [recordingExpenseId, setRecordingExpenseId] = useState<string | null>(null);
  const [recordedMap, setRecordedMap] = useState<Record<string, boolean>>({});
  const [recordError, setRecordError] = useState<string | null>(null);

  // Voice speech-to-text state
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const speechRecognitionRef = useRef<any>(null);

  // Visual matrix state (for manual checkbox toggling fallback)
  const [itemClaimants, setItemClaimants] = useState<Record<string, string[]>>({});
  const [visualPayerId, setVisualPayerId] = useState<string>(members[0]?.id || "");
  const [visualCategory, setVisualCategory] = useState<string>("FOOD");

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 1. Initialize Web Speech Recognition
  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        setSpeechSupported(true);
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.lang = "en-IN"; // Supports Indian English / Hinglish natural speech

        recognition.onresult = (event: any) => {
          let transcript = "";
          for (let i = event.resultIndex; i < event.results.length; i++) {
            transcript += event.results[i][0].transcript;
          }
          setInputMessage(transcript);
        };

        recognition.onerror = (event: any) => {
          console.warn("[SmartBillDock] Speech recognition error:", event.error);
          setIsListening(false);
        };

        recognition.onend = () => {
          setIsListening(false);
        };

        speechRecognitionRef.current = recognition;
      }
    }
  }, []);

  // Toggle voice recognition
  function toggleSpeechListening() {
    if (!speechSupported || !speechRecognitionRef.current) {
      alert("Speech recognition is not supported in this browser. Please use Chrome, Edge, or Safari.");
      return;
    }

    if (isListening) {
      speechRecognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        speechRecognitionRef.current.start();
        setIsListening(true);
      } catch (err) {
        console.warn("[SmartBillDock] Error starting speech recognition:", err);
      }
    }
  }

  // 2. Sync initial receipt
  useEffect(() => {
    if (initialReceiptData) {
      setScannedReceipt(initialReceiptData);
      initVisualClaimants(initialReceiptData);
    }
  }, [initialReceiptData]);

  // 3. Initialize conversation on open
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      const welcome: ExpenseChatMessage = {
        role: "assistant",
        content: `👋 **Welcome to the Unified Smart Bill Dock!**\n\nDrop any bill receipt above or tap the **microphone** to speak who had what in everyday natural human language.\n\n*Example:* **"Rahul had the beers, Priya had the pasta, I had fish thali, split the rest equally; I paid"**`,
      };

      if (scannedReceipt) {
        welcome.content += `\n\n📄 **Active Bill:** ${scannedReceipt.merchant} (₹${(
          scannedReceipt.totalMinor / 100
        ).toFixed(2)}) with ${scannedReceipt.items.length} items extracted. Tell me who had what!`;
      }

      setMessages([welcome]);
    }
  }, [isOpen, destination, scannedReceipt, messages.length]);

  // Initialize visual claimants mapping
  function initVisualClaimants(receipt: ExtractedReceiptData) {
    const map: Record<string, string[]> = {};
    for (const item of receipt.items) {
      // Default: all members assigned to each item unless specified
      map[item.id] = members.map((m) => m.id);
    }
    setItemClaimants(map);
    setVisualCategory(receipt.suggestedCategory || "FOOD");
  }

  // Scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  if (!isOpen) return null;

  // 4. Handle Receipt Upload & OCR Scan
  async function handleReceiptUpload(file: File) {
    if (!file) return;

    try {
      setOcrLoading(true);
      setOcrError(null);

      const formData = new FormData();
      formData.append("file", file);
      formData.append("tripId", tripId);

      const res = await fetch("/api/ocr/scan", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (data.success && data.extractedData) {
        const ext: ExtractedReceiptData = data.extractedData;
        setScannedReceipt(ext);
        initVisualClaimants(ext);

        // Add assistant notification in conversation
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: `📄 **Receipt Scanned Successfully!**\n\nMerchant: **${ext.merchant}**\nTotal: **${ext.formattedTotal}** (${ext.items.length} line items extracted)\n\nNow, simply **speak into the mic** or type who had what!`,
          },
        ]);
      } else {
        setOcrError(data.error || "Failed to scan receipt. Please enter details manually.");
      }
    } catch (err: any) {
      console.error("[SmartBillDock] Receipt upload error:", err);
      setOcrError("Network error while scanning receipt. You can still type details manually.");
    } finally {
      setOcrLoading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  // Drag and drop handlers
  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setIsDraggingOver(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    setIsDraggingOver(false);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDraggingOver(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleReceiptUpload(files[0]);
    }
  }

  // Clear scanned receipt
  function handleClearReceipt() {
    setScannedReceipt(null);
    setItemClaimants({});
    setShowItemsDrawer(false);
  }

  // 5. Send message to NLP Expense API
  async function handleSendMessage(customText?: string) {
    const textToSend = (customText || inputMessage).trim();
    if (!textToSend && !scannedReceipt) return;

    if (isListening && speechRecognitionRef.current) {
      speechRecognitionRef.current.stop();
      setIsListening(false);
    }

    const newHistory: ExpenseChatMessage[] = [
      ...messages,
      {
        role: "user",
        content: textToSend || `Analyze extracted receipt from ${scannedReceipt?.merchant}`,
      },
    ];

    setMessages(newHistory);
    setInputMessage("");
    setLoading(true);

    try {
      const res = await fetch(`/api/trips/${tripId}/expense-chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: textToSend,
          conversationHistory: newHistory.slice(-5),
          scannedReceiptData: scannedReceipt,
        }),
      });

      const data = await res.json();
      if (!data.success) {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: `⚠️ ${data.error || "I had trouble processing that expense. Could you clarify who paid and what the total was?"}`,
          },
        ]);
        return;
      }

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.reply,
          expenseData: data.expenseData,
        },
      ]);
    } catch (err) {
      console.error("[SmartBillDock] NLP Chat error:", err);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "⚠️ Network connection error. Please try again.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  // 6. Record Expense to Trip Ledger
  async function handleRecordExpense(exp: ParsedExpenseData, msgIdx: number) {
    try {
      setRecordingExpenseId(`msg-${msgIdx}`);
      setRecordError(null);

      const payload = {
        title: exp.title,
        amountMinor: exp.amountMinor.toString(),
        payerId: exp.payerId,
        category: exp.category,
        currency: exp.currency || currency || "INR",
        splitMethod: exp.splitMethod,
        isPersonal: exp.isPersonal,
        participants: exp.participants.map((p) => ({
          memberId: p.memberId,
          customAmountMinor: p.shareAmountMinor.toString(),
          exactAmountMinor: p.shareAmountMinor.toString(),
          percentage: p.percentage,
        })),
        receiptUrl: scannedReceipt?.receiptUrl || undefined,
        itemizedDetails: exp.itemBreakdown
          ? {
              merchant: exp.title,
              subtotalMinor: exp.amountMinor,
              taxMinor: scannedReceipt?.taxMinor || 0,
              items: exp.itemBreakdown.map((item) => ({
                name: item.item,
                quantity: 1,
                amountMinor: item.amountMinor,
                participantNames: item.consumedBy,
              })),
            }
          : undefined,
      };

      const res = await fetch(`/api/trips/${tripId}/expenses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!data.success) {
        setRecordError(data.error || "Failed to commit expense to ledger.");
        return;
      }

      // Mark as recorded
      setRecordedMap((prev) => ({ ...prev, [`msg-${msgIdx}`]: true }));

      // Add success message
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `🎉 **Expense Successfully Recorded to Group Ledger!**\n\n**${exp.title}** (${exp.formattedTotal}) has been logged. All member debt settlements and who-owes-whom equations have been automatically recalculated.`,
        },
      ]);

      if (onExpenseRecorded) {
        onExpenseRecorded();
      }
    } catch (err) {
      console.error("[SmartBillDock] Error committing expense:", err);
      setRecordError("Failed to record expense. Please try again.");
    } finally {
      setRecordingExpenseId(null);
    }
  }

  // 7. Visual Item Matrix Claim Toggle
  function toggleItemClaimant(itemId: string, memberId: string) {
    setItemClaimants((prev) => {
      const current = prev[itemId] || [];
      const exists = current.includes(memberId);
      const updated = exists ? current.filter((id) => id !== memberId) : [...current, memberId];
      return { ...prev, [itemId]: updated };
    });
  }

  // Commit Visual Matrix Split
  async function handleRecordVisualMatrix() {
    if (!scannedReceipt) return;

    try {
      setLoading(true);
      setRecordError(null);

      // Calculate shares from checkboxes
      const memberSubtotals: Record<string, number> = {};
      for (const m of members) memberSubtotals[m.id] = 0;

      const itemBreakdownList: { item: string; amountMinor: number; consumedBy: string[] }[] = [];

      for (const item of scannedReceipt.items) {
        const claimants = itemClaimants[item.id] || [];
        if (claimants.length === 0) continue;

        const perClaimant = Math.floor(item.amountMinor / claimants.length);
        let rem = item.amountMinor - perClaimant * claimants.length;

        for (let i = 0; i < claimants.length; i++) {
          const mId = claimants[i];
          memberSubtotals[mId] = (memberSubtotals[mId] || 0) + perClaimant + (i === 0 ? rem : 0);
        }

        const consumedNames = claimants
          .map((id) => members.find((m) => m.id === id)?.name || "Member")
          .filter(Boolean);

        itemBreakdownList.push({
          item: item.name,
          amountMinor: item.amountMinor,
          consumedBy: consumedNames,
        });
      }

      const totalSub = Object.values(memberSubtotals).reduce((s, v) => s + v, 0) || 1;
      const taxMinor = scannedReceipt.taxMinor || 0;
      const totalAmountMinor = scannedReceipt.totalMinor;

      let runningAllocated = 0;
      const participantsPayload: any[] = [];

      for (const m of members) {
        const mSub = memberSubtotals[m.id] || 0;
        const propTax = Math.round((mSub / totalSub) * taxMinor);
        const mShare = mSub + propTax;
        runningAllocated += mShare;

        participantsPayload.push({
          memberId: m.id,
          shareAmountMinor: mShare,
          customAmountMinor: mShare.toString(),
          exactAmountMinor: mShare.toString(),
          percentage: Number(((mShare / totalAmountMinor) * 100).toFixed(1)),
        });
      }

      // Zero-drift absorption on largest share
      const diff = totalAmountMinor - runningAllocated;
      if (diff !== 0 && participantsPayload.length > 0) {
        participantsPayload.sort((a, b) => b.shareAmountMinor - a.shareAmountMinor);
        participantsPayload[0].shareAmountMinor += diff;
        participantsPayload[0].customAmountMinor = participantsPayload[0].shareAmountMinor.toString();
        participantsPayload[0].exactAmountMinor = participantsPayload[0].shareAmountMinor.toString();
      }

      const payload = {
        title: scannedReceipt.merchant || "Group Dining Bill",
        amountMinor: totalAmountMinor.toString(),
        payerId: visualPayerId || members[0]?.id,
        category: visualCategory || "FOOD",
        currency: scannedReceipt.currency || currency || "INR",
        splitMethod: "CUSTOM",
        isPersonal: false,
        participants: participantsPayload,
        receiptUrl: scannedReceipt.receiptUrl || undefined,
        itemizedDetails: {
          merchant: scannedReceipt.merchant,
          subtotalMinor: scannedReceipt.subtotalMinor,
          taxMinor: scannedReceipt.taxMinor,
          items: itemBreakdownList.map((ib) => ({
            name: ib.item,
            quantity: 1,
            amountMinor: ib.amountMinor,
            participantNames: ib.consumedBy,
          })),
        },
      };

      const res = await fetch(`/api/trips/${tripId}/expenses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!data.success) {
        setRecordError(data.error || "Failed to commit visual split.");
        return;
      }

      if (onExpenseRecorded) {
        onExpenseRecorded();
      }

      // Switch to conversation and show success
      setActiveMode("conversational");
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `🎉 **Itemized Split Committed to Ledger!**\n\n**${payload.title}** (₹${(
            totalAmountMinor / 100
          ).toFixed(2)}) was recorded using your visual dish claims.`,
        },
      ]);
    } catch (err) {
      console.error("[SmartBillDock] Error saving visual split:", err);
      setRecordError("Failed to commit split. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  // Suggestion chips
  const sampleSuggestions = [
    `Rahul had the beers, Priya had pasta, I had fish thali, split the rest; I paid`,
    `Split everything equally, paid by me`,
    `Exclude Kabir, divide between Rohan and Priya`,
    `I paid 60%, Ananya 40%`,
  ];

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs animate-fadeIn">
      {/* Sliding Drawer Container */}
      <div className="w-full sm:max-w-2xl h-full bg-[#FCF9F2] shadow-2xl flex flex-col border-l border-[#DCCFBC] animate-slideLeft transition-all">
        {/* ========================================================================= */}
        {/* DOCK HEADER */}
        {/* ========================================================================= */}
        <div className="bg-gradient-to-r from-[#163F38] via-[#1b4b43] to-[#163F38] text-[#FCF9F2] px-6 py-4.5 flex items-center justify-between border-b border-[#25574f] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#C95B3D] to-[#C9A35B] flex items-center justify-center text-white shadow-md">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-serif text-lg font-bold text-[#FCF9F2] tracking-wide">
                  Smart Bill Dock
                </h2>
                <span className="text-[10px] bg-[#C9A35B]/20 text-[#E0D5BE] border border-[#C9A35B]/40 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                  OCR + NLP
                </span>
              </div>
              <p className="text-xs text-[#DCCFBC]/80 mt-0.5">
                Drop receipt · Speak who had what · Instant zero-drift split
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Mode Switcher */}
            {scannedReceipt && (
              <div className="flex bg-white/10 rounded-full p-0.5 border border-white/20 text-xs">
                <button
                  onClick={() => setActiveMode("conversational")}
                  className={`px-3 py-1 rounded-full font-semibold transition-all ${
                    activeMode === "conversational"
                      ? "bg-[#C9A35B] text-[#163F38] shadow"
                      : "text-white/80 hover:text-white"
                  }`}
                >
                  Chat & Voice
                </button>
                <button
                  onClick={() => setActiveMode("visual-matrix")}
                  className={`px-3 py-1 rounded-full font-semibold transition-all ${
                    activeMode === "visual-matrix"
                      ? "bg-[#C9A35B] text-[#163F38] shadow"
                      : "text-white/80 hover:text-white"
                  }`}
                >
                  Visual Claims
                </button>
              </div>
            )}

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* TOP DOCK ZONE: RECEIPT DROP & OCR STATUS */}
        {/* ========================================================================= */}
        <div className="bg-[#F5EFE3] px-6 py-4 border-b border-[#E0D5BE] shrink-0">
          {!scannedReceipt ? (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-4.5 text-center transition-all cursor-pointer ${
                isDraggingOver
                  ? "border-[#163F38] bg-[#163F38]/10 scale-[1.01]"
                  : "border-[#DCCFBC] hover:border-[#163F38]/60 bg-white/60 hover:bg-white"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,application/pdf"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleReceiptUpload(f);
                }}
              />

              {ocrLoading ? (
                <div className="flex flex-col items-center justify-center py-2">
                  <div className="relative w-12 h-12 flex items-center justify-center">
                    <RefreshCw className="w-7 h-7 text-[#163F38] animate-spin" />
                    <Sparkles className="w-3.5 h-3.5 text-[#C9A35B] absolute top-1 right-1 animate-pulse" />
                  </div>
                  <span className="text-xs font-bold text-[#163F38] mt-2">
                    Running Gemini Vision OCR...
                  </span>
                  <span className="text-[11px] text-[#7A6C58]">
                    Extracting line items, taxes & total amount
                  </span>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-4">
                  <div className="w-11 h-11 rounded-xl bg-[#163F38]/10 flex items-center justify-center text-[#163F38] shrink-0">
                    <Upload className="w-5 h-5 text-[#163F38]" />
                  </div>
                  <div className="text-left">
                    <span className="text-xs font-bold text-[#163F38] block">
                      Drop Receipt Photo or Tap to Browse
                    </span>
                    <span className="text-[11px] text-[#7A6C58]">
                      Supports JPG, PNG, WEBP, PDF · Instant itemized extraction
                    </span>
                  </div>
                  <span className="ml-auto text-[11px] font-bold text-[#C95B3D] bg-[#C95B3D]/10 px-3 py-1.5 rounded-full uppercase tracking-wider shrink-0">
                    Scan Bill
                  </span>
                </div>
              )}

              {ocrError && (
                <div className="mt-2 text-left bg-red-50 border border-red-200 text-red-700 px-3 py-1.5 rounded-xl text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{ocrError}</span>
                </div>
              )}
            </div>
          ) : (
            /* Scanned Receipt HUD Card */
            <div className="bg-white rounded-2xl border border-[#DCCFBC] p-3.5 shadow-2xs">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-[#163F38]/10 flex items-center justify-center text-[#163F38] shrink-0">
                    <FileText className="w-4.5 h-4.5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-[#163F38] truncate block">
                        {scannedReceipt.merchant || "Extracted Receipt"}
                      </span>
                      <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full shrink-0">
                        OCR Verified
                      </span>
                    </div>
                    <span className="text-[11px] text-[#7A6C58] block">
                      {scannedReceipt.items.length} items extracted · Tax ₹{(scannedReceipt.taxMinor / 100).toFixed(2)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <div className="text-right">
                    <span className="font-serif text-sm font-bold text-[#163F38] block">
                      ₹{(scannedReceipt.totalMinor / 100).toLocaleString("en-IN", {
                        minimumFractionDigits: 2,
                      })}
                    </span>
                  </div>

                  <button
                    onClick={() => setShowItemsDrawer(!showItemsDrawer)}
                    className="p-1.5 rounded-lg hover:bg-[#F5EFE3] text-[#7A6C58] transition-all"
                    title="Toggle Items List"
                  >
                    {showItemsDrawer ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>

                  <button
                    onClick={handleClearReceipt}
                    className="p-1.5 rounded-lg hover:bg-red-50 text-red-600 transition-all"
                    title="Remove Receipt"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Expandable Line Items Drawer */}
              {showItemsDrawer && (
                <div className="mt-3 pt-3 border-t border-[#E0D5BE] space-y-1.5 max-h-40 overflow-y-auto pr-1">
                  <span className="text-[10px] font-bold text-[#8A7B68] uppercase tracking-wider block mb-1">
                    Extracted Line Items ({scannedReceipt.items.length})
                  </span>
                  {scannedReceipt.items.map((item, idx) => (
                    <div
                      key={item.id || idx}
                      className="flex items-center justify-between text-xs py-1 px-2 rounded-lg bg-[#FCF9F2] border border-[#E0D5BE]/60"
                    >
                      <span className="font-medium text-[#163F38] truncate pr-2">
                        {item.quantity > 1 ? `${item.quantity}x ` : ""}
                        {item.name}
                      </span>
                      <span className="font-semibold text-[#163F38] shrink-0">
                        ₹{(item.amountMinor / 100).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ========================================================================= */}
        {/* MODE 1: CONVERSATIONAL VOICE & NLP SPLIT ENGINE (HERO) */}
        {/* ========================================================================= */}
        {activeMode === "conversational" && (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Messages Feed */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex flex-col ${
                    msg.role === "user" ? "items-end" : "items-start"
                  }`}
                >
                  <div
                    className={`max-w-[88%] rounded-2xl px-4.5 py-3 text-xs leading-relaxed shadow-2xs ${
                      msg.role === "user"
                        ? "bg-[#163F38] text-[#FCF9F2] rounded-br-xs"
                        : "bg-white text-[#2C241B] border border-[#DCCFBC] rounded-bl-xs"
                    }`}
                  >
                    {/* Message Text with simple Markdown formatting */}
                    <div className="whitespace-pre-line space-y-1.5">
                      {msg.content.split("\n").map((line, lIdx) => {
                        const isBold = line.startsWith("**") && line.endsWith("**");
                        return (
                          <p key={lIdx} className={isBold ? "font-bold text-[#163F38]" : ""}>
                            {line.replace(/\*\*/g, "")}
                          </p>
                        );
                      })}
                    </div>

                    {/* Interactive Split Confirmation Card */}
                    {msg.expenseData && msg.expenseData.isReadyToSave && (
                      <div className="mt-3.5 pt-3.5 border-t border-[#DCCFBC]/60 space-y-3">
                        <div className="bg-[#FCF9F2] rounded-xl p-3.5 border border-[#C9A35B]/40 space-y-2.5">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-serif font-bold text-sm text-[#163F38]">
                              {msg.expenseData.title}
                            </span>
                            <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full">
                              {msg.expenseData.formattedTotal}
                            </span>
                          </div>

                          <div className="flex items-center justify-between text-[11px] text-[#7A6C58]">
                            <span>
                              Paid by: <strong className="text-[#163F38]">{msg.expenseData.payerName}</strong>
                            </span>
                            <span className="bg-[#163F38]/10 text-[#163F38] font-bold px-2 py-0.5 rounded-md">
                              {msg.expenseData.category}
                            </span>
                          </div>

                          {/* Member Share Allocations */}
                          <div className="space-y-1.5 pt-1">
                            <span className="text-[10px] font-bold text-[#8A7B68] uppercase tracking-wider block">
                              Calculated Member Shares
                            </span>
                            {msg.expenseData.participants.map((p) => (
                              <div
                                key={p.memberId}
                                className="flex items-center justify-between text-xs py-1 px-2.5 rounded-lg bg-white border border-[#E0D5BE]"
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <div className="w-5 h-5 rounded-full bg-[#163F38] text-white flex items-center justify-center text-[10px] font-bold shrink-0">
                                    {p.memberName.charAt(0)}
                                  </div>
                                  <span className="font-medium text-[#163F38] truncate">
                                    {p.memberName}
                                  </span>
                                </div>
                                <div className="text-right shrink-0">
                                  <span className="font-bold text-[#163F38] block">
                                    {p.formattedShare}
                                  </span>
                                  {p.percentage && (
                                    <span className="text-[10px] text-[#7A6C58]">
                                      {p.percentage}%
                                    </span>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>

                          {/* Zero-drift verification badge */}
                          <div className="flex items-center gap-1.5 text-[10px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-1 rounded-md">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            <span>Zero-Remainder Guaranteed: Sum of shares strictly equals total bill</span>
                          </div>
                        </div>

                        {/* Record to Ledger CTA Button */}
                        {recordedMap[`msg-${idx}`] ? (
                          <div className="flex items-center justify-center gap-2 py-2 bg-emerald-100 text-emerald-800 rounded-xl text-xs font-bold">
                            <Check className="w-4 h-4" />
                            <span>Recorded to Group Ledger</span>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleRecordExpense(msg.expenseData!, idx)}
                            disabled={recordingExpenseId === `msg-${idx}`}
                            className="w-full bg-gradient-to-r from-[#163F38] via-[#1f534a] to-[#C95B3D] hover:from-[#11322d] hover:to-[#b04f30] text-[#FCF9F2] py-2.5 rounded-xl text-xs font-bold shadow-md hover:shadow-lg flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                          >
                            {recordingExpenseId === `msg-${idx}` ? (
                              <>
                                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                <span>Recording to Ledger...</span>
                              </>
                            ) : (
                              <>
                                <Check className="w-4 h-4 text-[#C9A35B]" />
                                <span>Confirm & Record to Ledger ({msg.expenseData.formattedTotal})</span>
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {loading && (
                <div className="flex items-center gap-2 text-xs text-[#7A6C58] bg-white border border-[#DCCFBC] px-4 py-2.5 rounded-2xl w-fit shadow-2xs animate-pulse">
                  <Sparkles className="w-4 h-4 text-[#C9A35B] animate-spin" />
                  <span>Parsing instructions & allocating items...</span>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Quick Suggestion Prompts */}
            <div className="px-6 py-2 bg-[#F5EFE3]/80 border-t border-[#E0D5BE] overflow-x-auto whitespace-nowrap space-x-2">
              <span className="text-[10px] font-bold text-[#8A7B68] uppercase tracking-wider inline-block mr-1">
                Suggestions:
              </span>
              {sampleSuggestions.map((prompt, pIdx) => (
                <button
                  key={pIdx}
                  onClick={() => handleSendMessage(prompt)}
                  className="inline-block text-[11px] bg-white hover:bg-[#FCF9F2] text-[#163F38] border border-[#DCCFBC] hover:border-[#163F38]/40 px-3 py-1 rounded-full shadow-2xs transition-all cursor-pointer"
                >
                  {prompt}
                </button>
              ))}
            </div>

            {/* Input Bar with Voice Microphone */}
            <div className="bg-white p-4 border-t border-[#E0D5BE]">
              {recordError && (
                <div className="mb-2 bg-red-50 border border-red-200 text-red-700 px-3 py-1.5 rounded-xl text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{recordError}</span>
                </div>
              )}

              {/* Active Voice Listening Visualizer */}
              {isListening && (
                <div className="mb-2 flex items-center justify-between bg-red-50 border border-red-200 text-red-700 px-3.5 py-2 rounded-xl text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-ping" />
                    <span className="font-bold">Listening... speak who had what</span>
                  </div>
                  <button
                    onClick={toggleSpeechListening}
                    className="text-[11px] font-bold text-red-800 underline cursor-pointer"
                  >
                    Done Speaking
                  </button>
                </div>
              )}

              <div className="flex items-center gap-2">
                <div className="flex-1 relative">
                  <input
                    type="text"
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    placeholder={
                      isListening
                        ? "Listening to speech..."
                        : scannedReceipt
                        ? "Speak or type who had what..."
                        : "Describe expense or drop receipt..."
                    }
                    className="w-full bg-[#FCF9F2] border border-[#DCCFBC] focus:border-[#163F38] focus:ring-1 focus:ring-[#163F38] rounded-xl px-4 py-2.5 text-xs text-[#2C241B] placeholder-[#8A7B68] outline-none transition-all pr-10"
                  />
                </div>

                {/* Voice Microphone Button */}
                <button
                  onClick={toggleSpeechListening}
                  title={isListening ? "Stop Listening" : "Speak who had what"}
                  className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                    isListening
                      ? "bg-red-600 text-white animate-pulse shadow-md"
                      : "bg-[#FCF9F2] hover:bg-[#F5EFE3] text-[#163F38] border border-[#DCCFBC]"
                  }`}
                >
                  {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </button>

                {/* Send Button */}
                <button
                  onClick={() => handleSendMessage()}
                  disabled={loading || (!inputMessage.trim() && !scannedReceipt)}
                  className="w-9 h-9 rounded-xl bg-[#163F38] hover:bg-[#1f534a] text-white flex items-center justify-center transition-all cursor-pointer disabled:opacity-40 shadow-sm"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* MODE 2: VISUAL ITEM MATRIX (CLICK-TO-CLAIM FALLBACK) */}
        {/* ========================================================================= */}
        {activeMode === "visual-matrix" && scannedReceipt && (
          <div className="flex-1 flex flex-col overflow-hidden p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-[#163F38]">Visual Line-Item Matrix</h3>
                <p className="text-xs text-[#7A6C58]">
                  Click member tags on dishes to allocate shares manually
                </p>
              </div>

              {/* Payer selector */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-[#7A6C58] font-medium">Payer:</span>
                <select
                  value={visualPayerId}
                  onChange={(e) => setVisualPayerId(e.target.value)}
                  className="bg-white border border-[#DCCFBC] text-xs font-bold text-[#163F38] rounded-lg px-2.5 py-1 outline-none"
                >
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Items Table */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {scannedReceipt.items.map((item) => {
                const claimants = itemClaimants[item.id] || [];
                return (
                  <div
                    key={item.id}
                    className="bg-white rounded-xl border border-[#DCCFBC] p-3 shadow-2xs space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-[#163F38]">
                        {item.quantity > 1 ? `${item.quantity}x ` : ""}
                        {item.name}
                      </span>
                      <span className="font-serif font-bold text-xs text-[#163F38]">
                        ₹{(item.amountMinor / 100).toFixed(2)}
                      </span>
                    </div>

                    {/* Member Claim Pills */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      {members.map((m) => {
                        const isClaimed = claimants.includes(m.id);
                        return (
                          <button
                            key={m.id}
                            onClick={() => toggleItemClaimant(item.id, m.id)}
                            className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border transition-all cursor-pointer ${
                              isClaimed
                                ? "bg-[#163F38] text-white border-[#163F38] shadow-xs"
                                : "bg-[#FCF9F2] text-[#7A6C58] border-[#DCCFBC] hover:border-[#163F38]/40"
                            }`}
                          >
                            {m.name.split(" ")[0]}
                            {isClaimed && <Check className="w-3 h-3 inline ml-1" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Bottom Commit Action for Visual Matrix */}
            <div className="pt-3 border-t border-[#DCCFBC]">
              <button
                onClick={handleRecordVisualMatrix}
                disabled={loading}
                className="w-full bg-[#163F38] hover:bg-[#1f534a] text-white py-3 rounded-xl text-xs font-bold shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                {loading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Check className="w-4 h-4 text-[#C9A35B]" />
                    <span>Commit Visual Split to Ledger (₹{(scannedReceipt.totalMinor / 100).toFixed(2)})</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
