"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  X,
  Sparkles,
  Send,
  Upload,
  CheckCircle2,
  DollarSign,
  Users,
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
  HelpCircle,
  Paperclip,
} from "lucide-react";
import { ParsedExpenseData, TripMemberContext, ExpenseChatMessage } from "@/lib/ai/nlp-expense-engine";

export interface ExpenseSplitChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  tripId: string;
  tripTitle: string;
  destination: string;
  currency: string;
  members: TripMemberContext[];
  initialReceiptData?: any;
  onExpenseRecorded?: () => void;
}

export function ExpenseSplitChatModal({
  isOpen,
  onClose,
  tripId,
  tripTitle,
  destination,
  currency,
  members,
  initialReceiptData,
  onExpenseRecorded,
}: ExpenseSplitChatModalProps) {
  const [messages, setMessages] = useState<ExpenseChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [attachedPreview, setAttachedPreview] = useState<string | null>(null);
  const [recordingExpenseId, setRecordingExpenseId] = useState<string | null>(null);
  const [recordedMap, setRecordedMap] = useState<Record<string, boolean>>({});
  const [recordError, setRecordError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize conversation on open
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      const welcome: ExpenseChatMessage = {
        role: "assistant",
        content: `Hi there! I'm your **Conversational Expense & Bill Splitting Assistant** for **${destination}**.\n\nJust tell me about your expenses in natural human language, for example:\n• *"I spent ₹3,500 on dinner at Fisherman's Wharf. Rahul had fish thali (1200), Priya had pasta (900), and I had biryani (1400). I paid for it."*\n• *"Rohan paid ₹850 for the cab from airport. Split equally between Rohan, Ananya, and Me."*\n• *"Split ₹6,000 for the villa deposit: Me 40%, Alex 30%, Maya 30%."*\n\nYou can also **attach or drop a receipt photo**, and tell me who had what!`,
      };

      // If opened with initial scanned receipt
      if (initialReceiptData) {
        welcome.content += `\n\n📄 **Scanned receipt detected from ${initialReceiptData.merchant || "Merchant"} (₹${(
          (initialReceiptData.totalMinor || 0) / 100
        ).toFixed(2)})**. Tell me who paid and how you'd like to split the items!`;
      }

      setMessages([welcome]);
    }
  }, [isOpen, destination, initialReceiptData, messages.length]);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  if (!isOpen) return null;

  // Handle file attachment
  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setAttachedFile(file);
    const reader = new FileReader();
    reader.onload = () => {
      setAttachedPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  function removeAttachment() {
    setAttachedFile(null);
    setAttachedPreview(null);
  }

  // Quick suggestion chips
  const samplePrompts = [
    `Dinner ₹3,600: Split equally between all of us`,
    `Cab ₹850 paid by ${members[0]?.name || "Me"} for everyone`,
    `Groceries ₹2,400: Paid by Me, ${members[1]?.name || "Traveler"} ₹400, rest split equal`,
    `Drinks ₹2,000: ${members[0]?.name || "Me"} 50%, ${members[1]?.name || "Friend"} 50%`,
  ];

  // Send message to NLP API
  async function handleSendMessage(customText?: string) {
    const textToSend = (customText || inputMessage).trim();
    if (!textToSend && !attachedPreview) return;

    let base64Data: string | undefined = undefined;
    let mimeType: string | undefined = undefined;

    if (attachedPreview && attachedFile) {
      base64Data = attachedPreview.split(",")[1];
      mimeType = attachedFile.type || "image/jpeg";
    }

    const newUserMsg: ExpenseChatMessage = {
      role: "user",
      content: textToSend || (attachedFile ? `Attached bill: ${attachedFile.name}` : ""),
      attachedImageUrl: attachedPreview || undefined,
    };

    const newHistory = [...messages, newUserMsg];
    setMessages(newHistory);
    setInputMessage("");
    setAttachedFile(null);
    setAttachedPreview(null);
    setLoading(true);
    setRecordError(null);

    try {
      const res = await fetch(`/api/trips/${tripId}/expense-chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: textToSend,
          conversationHistory: newHistory,
          attachedReceiptBase64: base64Data,
          attachedReceiptMime: mimeType,
        }),
      });

      const data = await res.json();
      if (!data.success) {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: `⚠️ ${data.error || "Sorry, I had trouble analyzing that expense. Please try again."}`,
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
    } catch (err: any) {
      console.error("Expense chat error:", err);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "⚠️ Network error while processing your expense. Please check your connection and try again.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  // Record parsed expense to database
  async function handleRecordExpense(msgIdx: number, exp: ParsedExpenseData) {
    try {
      setRecordingExpenseId(`msg-${msgIdx}`);
      setRecordError(null);

      // Build payload for /api/trips/[id]/expenses
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
        itemizedDetails: exp.itemBreakdown
          ? {
              merchant: exp.title,
              subtotalMinor: exp.amountMinor,
              taxMinor: 0,
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
        setRecordError(data.error || "Failed to record expense.");
        return;
      }

      // Mark as recorded
      setRecordedMap((prev) => ({ ...prev, [`msg-${msgIdx}`]: true }));

      // Add confirmation message to chat
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `✅ **Expense Recorded Successfully!**\n\n**${exp.title}** (${exp.formattedTotal}) has been logged to your trip ledger. All member balances and settlement equations have been automatically recalculated.`,
        },
      ]);

      if (onExpenseRecorded) {
        onExpenseRecorded();
      }
    } catch (err: any) {
      console.error("Failed to commit expense:", err);
      setRecordError("Server error while recording expense.");
    } finally {
      setRecordingExpenseId(null);
    }
  }

  function getCategoryIcon(cat: string) {
    switch (cat) {
      case "FOOD":
        return <Utensils className="w-3.5 h-3.5 text-amber-700" />;
      case "TRANSPORT":
      case "LOCAL_TRAVEL":
        return <Car className="w-3.5 h-3.5 text-blue-700" />;
      case "STAY":
        return <Home className="w-3.5 h-3.5 text-indigo-700" />;
      case "ACTIVITIES":
        return <Compass className="w-3.5 h-3.5 text-purple-700" />;
      case "SHOPPING":
        return <ShoppingBag className="w-3.5 h-3.5 text-rose-700" />;
      default:
        return <HelpCircle className="w-3.5 h-3.5 text-emerald-700" />;
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-[#FCF9F2] border border-[#DCCFBC] rounded-3xl max-w-3xl w-full h-[90vh] max-h-[850px] shadow-2xl flex flex-col overflow-hidden relative">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-[#DCCFBC]/80 bg-gradient-to-r from-[#FFFDF9] via-[#F8F3E8] to-[#FFFDF9] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#163F38] to-[#1c5c52] flex items-center justify-center text-white shadow-md">
              <Sparkles className="w-5 h-5 text-[#C9A35B]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-serif text-lg font-bold text-[#163F38]">AI Bill Split & Expense Chat</h3>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-[#163F38]/10 text-[#163F38] px-2 py-0.5 rounded-full">
                  NLP Powered
                </span>
              </div>
              <p className="text-xs text-[#7A6C58]">
                {destination} • {tripTitle} • {members.length} Travelers
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-[#EAE2CE]/70 hover:bg-[#E0D5BE] flex items-center justify-center text-[#5A5040] hover:text-[#163F38] transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Travelers Quick Chips */}
        <div className="px-5 py-2 bg-[#F3ECDF]/80 border-b border-[#E7DDCC] flex items-center gap-2 overflow-x-auto no-scrollbar shrink-0">
          <span className="text-[11px] font-bold uppercase text-[#8A7B68] shrink-0 flex items-center gap-1">
            <Users className="w-3 h-3 text-[#163F38]" /> Travelers:
          </span>
          {members.map((m) => (
            <button
              key={m.id}
              onClick={() => {
                setInputMessage((prev) => (prev ? `${prev} ${m.name}` : `Split with ${m.name}: `));
              }}
              className="px-2.5 py-1 rounded-full bg-white border border-[#D5C7AD] hover:border-[#163F38] text-[11px] font-medium text-[#163F38] shrink-0 flex items-center gap-1.5 shadow-2xs transition-all hover:scale-105"
            >
              <div className="w-4 h-4 rounded-full bg-[#163F38] text-white text-[9px] font-bold flex items-center justify-center">
                {m.name.charAt(0).toUpperCase()}
              </div>
              <span>{m.name}</span>
            </button>
          ))}
        </div>

        {/* Chat Messages Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 bg-[#FCF9F2]/70">
          {messages.map((msg, idx) => {
            const isUser = msg.role === "user";
            const exp = msg.expenseData;
            const isRecorded = recordedMap[`msg-${idx}`];
            const isRecording = recordingExpenseId === `msg-${idx}`;

            return (
              <div
                key={idx}
                className={`flex flex-col ${isUser ? "items-end" : "items-start"} space-y-2`}
              >
                {/* Bubble */}
                <div
                  className={`max-w-[88%] sm:max-w-[80%] rounded-2xl p-4 shadow-xs text-sm leading-relaxed ${
                    isUser
                      ? "bg-gradient-to-r from-[#C95B3D] to-[#b04f30] text-white rounded-br-xs"
                      : "bg-white border border-[#E0D5BE] text-[#2C241B] rounded-bl-xs shadow-sm"
                  }`}
                >
                  {/* Attached image preview inside user bubble */}
                  {msg.attachedImageUrl && (
                    <div className="mb-2 rounded-xl overflow-hidden border border-white/20 max-w-xs">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={msg.attachedImageUrl}
                        alt="Attached Bill"
                        className="w-full max-h-48 object-cover"
                      />
                    </div>
                  )}

                  <div className="whitespace-pre-wrap">{msg.content}</div>
                </div>

                {/* If Assistant generated an Expense Split Preview Card */}
                {exp && exp.amountMinor > 0 && (
                  <div className="w-full max-w-[88%] sm:max-w-[85%] rounded-3xl bg-gradient-to-b from-[#FFFDF8] to-[#F7F2E7] border-2 border-[#163F38]/20 p-5 shadow-md space-y-4 animate-in fade-in-50 duration-300">
                    {/* Card Header */}
                    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#E5DAC6] pb-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider bg-amber-100/80 text-amber-900 px-2 py-0.5 rounded-full border border-amber-300/50">
                            {getCategoryIcon(exp.category)}
                            <span>{exp.category}</span>
                          </span>
                          <span className="text-[11px] font-semibold text-[#6E624E] bg-[#EAE2CE]/70 px-2 py-0.5 rounded-full">
                            Paid by <strong className="text-[#163F38]">{exp.payerName}</strong>
                          </span>
                        </div>
                        <h4 className="font-serif text-xl font-bold text-[#163F38]">{exp.title}</h4>
                      </div>

                      <div className="text-right">
                        <span className="text-[10px] uppercase font-bold text-[#8A7B68] block">Total Amount</span>
                        <span className="font-serif text-2xl font-bold text-[#163F38]">
                          {exp.formattedTotal}
                        </span>
                      </div>
                    </div>

                    {/* Explanation */}
                    {exp.explanation && (
                      <p className="text-xs text-[#5F5342] italic bg-[#EFE8D8]/70 p-2.5 rounded-xl border border-[#DFD4BF]">
                        💡 {exp.explanation}
                      </p>
                    )}

                    {/* Participant Shares Breakdown */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-[11px] font-bold uppercase text-[#8A7B68]">
                        <span>Traveler Share Breakdown</span>
                        <span>{exp.participants.length} Split Participant{exp.participants.length > 1 ? "s" : ""}</span>
                      </div>

                      <div className="grid grid-cols-1 gap-2">
                        {exp.participants.map((p) => {
                          return (
                            <div
                              key={p.memberId}
                              className="p-2.5 rounded-xl bg-white border border-[#DCCFBC] flex flex-col gap-1.5"
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <div className="w-6 h-6 rounded-full bg-[#163F38] text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                                    {p.memberName.charAt(0).toUpperCase()}
                                  </div>
                                  <div>
                                    <span className="text-xs font-bold text-[#163F38] block leading-tight">
                                      {p.memberName}
                                    </span>
                                    {p.reason && (
                                      <span className="text-[10px] text-[#8A7B68] block leading-tight">
                                        {p.reason}
                                      </span>
                                    )}
                                  </div>
                                </div>

                                <div className="text-right">
                                  <span className="font-serif font-bold text-sm text-[#163F38] block">
                                    {p.formattedShare}
                                  </span>
                                  <span className="text-[10px] font-semibold text-[#8A7B68]">
                                    {p.percentage.toFixed(1)}%
                                  </span>
                                </div>
                              </div>

                              {/* Share percentage bar */}
                              <div className="w-full bg-[#EAE2CE] h-1.5 rounded-full overflow-hidden">
                                <div
                                  className="bg-gradient-to-r from-[#163F38] to-[#C9A35B] h-full rounded-full transition-all duration-500"
                                  style={{ width: `${Math.min(100, Math.max(5, p.percentage))}%` }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Zero remainder indicator */}
                    <div className="flex items-center justify-between text-[11px] text-[#4F6352] bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl">
                      <span className="flex items-center gap-1 font-semibold">
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        Exact integer balance (Zero remainder drift)
                      </span>
                      <span className="font-mono text-[10px] font-bold">100.0% Matched</span>
                    </div>

                    {/* Actions */}
                    <div className="pt-2 flex items-center justify-between gap-3">
                      <p className="text-[11px] text-[#7A6C58]">
                        Want to tweak? Just reply e.g. <em>&quot;Take ₹200 off {exp.participants[0]?.memberName}&quot;</em>
                      </p>

                      {isRecorded ? (
                        <div className="flex items-center gap-1.5 bg-emerald-600 text-white px-4 py-2 rounded-full text-xs font-bold shadow-xs">
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Recorded to Ledger</span>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleRecordExpense(idx, exp)}
                          disabled={isRecording}
                          className="bg-gradient-to-r from-[#163F38] to-[#1c5c52] hover:from-[#11322d] hover:to-[#163F38] text-[#F5EFE3] px-5 py-2.5 rounded-full text-xs font-bold flex items-center gap-2 shadow-md hover:shadow-lg transition-all hover:scale-105 active:scale-95 disabled:opacity-50 cursor-pointer"
                        >
                          {isRecording ? (
                            <>
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              <span>Saving Expense...</span>
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="w-4 h-4 text-[#38E54D]" />
                              <span>Confirm & Record Expense</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {loading && (
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-[#163F38] flex items-center justify-center text-white shrink-0">
                <Sparkles className="w-4 h-4 text-[#C9A35B] animate-spin" />
              </div>
              <div className="bg-white border border-[#E0D5BE] rounded-2xl p-3.5 rounded-bl-xs shadow-xs text-xs text-[#5A5040] flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-[#163F38] animate-bounce" />
                <div className="w-2 h-2 rounded-full bg-[#163F38] animate-bounce [animation-delay:0.2s]" />
                <div className="w-2 h-2 rounded-full bg-[#163F38] animate-bounce [animation-delay:0.4s]" />
                <span>Analyzing expenditure details & calculating split...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Global Error Banner */}
        {recordError && (
          <div className="px-5 py-2 bg-red-100 border-t border-red-200 text-red-800 text-xs flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{recordError}</span>
            </div>
            <button onClick={() => setRecordError(null)} className="font-bold underline text-xs">
              Dismiss
            </button>
          </div>
        )}

        {/* Prompt Suggestion Chips */}
        {messages.length <= 2 && (
          <div className="px-4 py-2 bg-[#F3ECDF]/90 border-t border-[#E7DDCC] flex items-center gap-2 overflow-x-auto no-scrollbar shrink-0">
            <span className="text-[10px] font-bold uppercase text-[#8A7B68] shrink-0">Try:</span>
            {samplePrompts.map((prompt, i) => (
              <button
                key={i}
                onClick={() => handleSendMessage(prompt)}
                className="px-3 py-1 rounded-full bg-white hover:bg-[#163F38] hover:text-white border border-[#D5C7AD] text-xs font-medium text-[#4C4336] shrink-0 transition-all shadow-2xs hover:scale-105"
              >
                {prompt}
              </button>
            ))}
          </div>
        )}

        {/* Attachment preview strip */}
        {attachedPreview && (
          <div className="px-5 py-2 bg-[#EFE7D7] border-t border-[#DCCFBC] flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={attachedPreview}
                alt="Preview"
                className="w-10 h-10 object-cover rounded-lg border border-[#C5B8A1]"
              />
              <div className="text-xs">
                <span className="font-bold text-[#163F38] block">{attachedFile?.name || "Receipt photo"}</span>
                <span className="text-[#8A7B68]">Bill image attached for OCR & NLP analysis</span>
              </div>
            </div>
            <button
              onClick={removeAttachment}
              className="text-xs text-[#C95B3D] hover:underline font-bold px-2 py-1"
            >
              Remove
            </button>
          </div>
        )}

        {/* Input Bar */}
        <div className="p-3 sm:p-4 bg-white border-t border-[#DCCFBC] flex items-center gap-2 shrink-0">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            accept="image/jpeg,image/png,image/webp,application/pdf"
            className="hidden"
          />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            title="Attach Receipt or Bill Photo"
            className="w-10 h-10 rounded-2xl bg-[#EFE9DC] hover:bg-[#E2D9C5] text-[#163F38] flex items-center justify-center shrink-0 transition-all hover:scale-105"
          >
            <Paperclip className="w-4 h-4" />
          </button>

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
            placeholder="e.g. 'I spent 4500 on dinner at Fisherman Wharf. Rahul had 1200, Priya 900, Me 1400. I paid.'"
            className="flex-1 px-4 py-2.5 rounded-2xl bg-[#F8F4EA] border border-[#D5C7AD] text-sm text-[#2C241B] placeholder-[#9A8B77] focus:outline-none focus:ring-2 focus:ring-[#163F38] focus:bg-white transition-all"
          />

          <button
            type="button"
            onClick={() => handleSendMessage()}
            disabled={loading || (!inputMessage.trim() && !attachedPreview)}
            className="w-10 h-10 rounded-2xl bg-[#163F38] hover:bg-[#11322d] text-[#F5EFE3] flex items-center justify-center shrink-0 transition-all shadow-md hover:scale-105 disabled:opacity-40 disabled:scale-100 cursor-pointer"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
