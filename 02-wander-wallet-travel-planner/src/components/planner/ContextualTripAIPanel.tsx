"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  Sparkles,
  Maximize2,
  X,
  Send,
  Users,
  Compass,
  CreditCard,
  CheckCircle,
  ArrowRight,
  MapPin,
  Calendar,
  Utensils,
  Car,
  Home,
  Check,
  RefreshCw,
  FileText,
  AlertCircle,
  Paperclip,
} from "lucide-react";
import { ParsedExpenseData, TripMemberContext } from "@/lib/ai/nlp-expense-engine";

export interface ContextualTripAIPanelProps {
  isOpen: boolean;
  onClose: () => void;
  tripId: string;
  tripTitle: string;
  destination: string;
  currency: string;
  activeTab: string;
  members: TripMemberContext[];
  onExpenseRecorded?: () => void;
  onNavigateTab?: (tab: string) => void;
}

export function ContextualTripAIPanel({
  isOpen,
  onClose,
  tripId,
  tripTitle,
  destination,
  currency,
  activeTab,
  members,
  onExpenseRecorded,
  onNavigateTab,
}: ContextualTripAIPanelProps) {
  const [messages, setMessages] = useState<
    Array<{
      role: "assistant" | "user";
      content: string;
      expenseData?: ParsedExpenseData | null;
      actionUrl?: string;
      actionLabel?: string;
    }>
  >([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [recordedMap, setRecordedMap] = useState<Record<string, boolean>>({});
  const [recordingId, setRecordingId] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Derive active workflow phase based on current tab
  const activePhase = React.useMemo(() => {
    if (["itinerary", "stay", "transport", "activities", "map"].includes(activeTab)) {
      return { id: "plan", label: "Plan & Explore", icon: Compass, color: "text-purple-700 bg-purple-100" };
    }
    if (activeTab === "group") {
      return { id: "members", label: "Invite Members", icon: Users, color: "text-teal-700 bg-teal-100" };
    }
    if (activeTab === "expenses") {
      return { id: "expenses", label: "Track Expenses", icon: CreditCard, color: "text-emerald-700 bg-emerald-100" };
    }
    if (activeTab === "settlement") {
      return { id: "settle", label: "Settle & Export", icon: CheckCircle, color: "text-amber-800 bg-amber-100" };
    }
    return { id: "general", label: "Trip Intelligence", icon: Sparkles, color: "text-[#163F38] bg-[#EAE2CE]" };
  }, [activeTab]);

  // Seed contextual prompt on tab change if empty
  useEffect(() => {
    if (!isOpen) return;

    if (messages.length === 0) {
      let welcomeContent = `Hi! I'm your persistent **AI Travel Companion** for **${destination}**.`;

      if (activePhase.id === "plan") {
        welcomeContent += `\n\nYou're currently in **Plan & Explore**. I can suggest hidden gems, optimize your morning/afternoon/evening itinerary, and check unverified items with the \`PRICE_UNAVAILABLE\` tag.`;
      } else if (activePhase.id === "members") {
        welcomeContent += `\n\nYou're in **Invite Members**. I can help explain group contribution shares, fair division formulas, and the difference between shared vs. personal expenses.`;
      } else if (activePhase.id === "expenses") {
        welcomeContent += `\n\nYou're in **Track Expenses**. Tell me about any bill in everyday language (e.g. *"I spent ₹3,200 on dinner, split equal"*), and I'll calculate the shares and let you log it right here!`;
      } else if (activePhase.id === "settle") {
        welcomeContent += `\n\nYou're in **Settle & Export**. I can review the greedy debt collapse algorithm, verify who pays whom, or help export your PDF travel journal.`;
      }

      setMessages([{ role: "assistant", content: welcomeContent }]);
    }
  }, [isOpen, destination, activePhase.id, messages.length]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  if (!isOpen) return null;

  async function handleSend(customText?: string) {
    const textToSend = (customText || input).trim();
    if (!textToSend) return;

    const newHistory = [...messages, { role: "user" as const, content: textToSend }];
    setMessages(newHistory);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch(`/api/trips/${tripId}/expense-chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: textToSend,
          conversationHistory: newHistory,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: data.reply,
            expenseData: data.expenseData,
          },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: `⚠️ ${data.error || "Could not process request."}`,
          },
        ]);
      }
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Network error while connecting to travel intelligence.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  // Record an expense directly from side panel
  async function handleRecordExpense(msgIdx: number, exp: ParsedExpenseData) {
    try {
      setRecordingId(`side-${msgIdx}`);
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
      };

      const res = await fetch(`/api/trips/${tripId}/expenses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success) {
        setRecordedMap((prev) => ({ ...prev, [`side-${msgIdx}`]: true }));
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: `✅ Recorded **${exp.title}** (${exp.formattedTotal}) to your ledger! Live balances recalculated.`,
          },
        ]);
        if (onExpenseRecorded) onExpenseRecorded();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setRecordingId(null);
    }
  }

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-[440px] bg-[#FCF9F2] border-l border-[#DCCFBC] shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
      {/* Top Header */}
      <div className="p-4 border-b border-[#DCCFBC] bg-gradient-to-r from-[#FFFDF9] to-[#F5EFE3] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#163F38] to-[#1c5c52] flex items-center justify-center text-white shadow-xs">
            <Sparkles className="w-4 h-4 text-[#C9A35B]" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="font-serif font-bold text-sm text-[#163F38]">AI Travel Companion</h3>
              <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full ${activePhase.color}`}>
                {activePhase.label}
              </span>
            </div>
            <p className="text-[10px] text-[#7A6C58] truncate max-w-[220px]">
              {destination} • Live Context
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {/* Expand to Full Screen CTA */}
          <Link
            href={`/ai-planner?tripId=${tripId}`}
            title="Expand to Full Screen Itinerary Planner"
            className="p-1.5 rounded-lg text-[#5A5040] hover:text-[#163F38] hover:bg-[#EAE2CE] transition"
          >
            <Maximize2 className="w-4 h-4" />
          </Link>

          <button
            onClick={onClose}
            title="Close Assistant"
            className="p-1.5 rounded-lg text-[#5A5040] hover:text-[#163F38] hover:bg-[#EAE2CE] transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Contextual Quick Actions Pill Bar */}
      <div className="px-4 py-2 bg-[#F3ECE0] border-b border-[#E7DECD] flex items-center gap-2 overflow-x-auto no-scrollbar shrink-0">
        <span className="text-[10px] uppercase font-bold text-[#8A7B68] shrink-0">Suggestions:</span>
        {activePhase.id === "plan" && (
          <>
            <button
              onClick={() => handleSend("Suggest a 3-day morning, afternoon and evening itinerary")}
              className="text-[11px] font-medium bg-white hover:bg-[#163F38] hover:text-white px-2.5 py-0.5 rounded-full border border-[#D5C7AD] text-[#163F38] shrink-0 transition"
            >
              Day-by-Day Flow
            </button>
            <button
              onClick={() => handleSend("Which spots have unverified prices that need booking?")}
              className="text-[11px] font-medium bg-white hover:bg-[#163F38] hover:text-white px-2.5 py-0.5 rounded-full border border-[#D5C7AD] text-[#163F38] shrink-0 transition"
            >
              Check Prices
            </button>
          </>
        )}
        {activePhase.id === "expenses" && (
          <>
            <button
              onClick={() => handleSend("Split dinner ₹2400 equally among all travelers")}
              className="text-[11px] font-medium bg-white hover:bg-[#163F38] hover:text-white px-2.5 py-0.5 rounded-full border border-[#D5C7AD] text-[#163F38] shrink-0 transition"
            >
              Dinner ₹2,400 Split
            </button>
            <button
              onClick={() => handleSend("Cab ₹650 paid by Me for everyone")}
              className="text-[11px] font-medium bg-white hover:bg-[#163F38] hover:text-white px-2.5 py-0.5 rounded-full border border-[#D5C7AD] text-[#163F38] shrink-0 transition"
            >
              Cab ₹650
            </button>
          </>
        )}
        {activePhase.id === "members" && (
          <>
            <button
              onClick={() => handleSend("What are the rules for shared vs personal expenses in our trip?")}
              className="text-[11px] font-medium bg-white hover:bg-[#163F38] hover:text-white px-2.5 py-0.5 rounded-full border border-[#D5C7AD] text-[#163F38] shrink-0 transition"
            >
              Shared vs Personal Rules
            </button>
            <button
              onClick={() => handleSend("Show pool funding status")}
              className="text-[11px] font-medium bg-white hover:bg-[#163F38] hover:text-white px-2.5 py-0.5 rounded-full border border-[#D5C7AD] text-[#163F38] shrink-0 transition"
            >
              Funding Status
            </button>
          </>
        )}
        {activePhase.id === "settle" && (
          <>
            <button
              onClick={() => handleSend("Explain the simplified debts and who owes whom")}
              className="text-[11px] font-medium bg-white hover:bg-[#163F38] hover:text-white px-2.5 py-0.5 rounded-full border border-[#D5C7AD] text-[#163F38] shrink-0 transition"
            >
              Who Owes Whom
            </button>
            <Link
              href={`/trips/${tripId}/summary`}
              className="text-[11px] font-medium bg-[#163F38] text-white px-2.5 py-0.5 rounded-full shrink-0 flex items-center gap-1 shadow-2xs"
            >
              <span>Export PDF Journal</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </>
        )}
      </div>

      {/* Messages Feed */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
        {messages.map((msg, idx) => {
          const isUser = msg.role === "user";
          const exp = msg.expenseData;
          const isRecorded = recordedMap[`side-${idx}`];
          const isRecording = recordingId === `side-${idx}`;

          return (
            <div key={idx} className={`flex flex-col ${isUser ? "items-end" : "items-start"} space-y-2`}>
              <div
                className={`max-w-[90%] rounded-2xl p-3 leading-relaxed ${
                  isUser
                    ? "bg-[#C95B3D] text-white rounded-br-xs"
                    : "bg-white border border-[#DCCFBC] text-[#2C241B] rounded-bl-xs shadow-xs"
                }`}
              >
                <div className="whitespace-pre-wrap">{msg.content}</div>
              </div>

              {/* Expense Card if generated */}
              {exp && exp.amountMinor > 0 && (
                <div className="w-full max-w-[92%] rounded-2xl bg-white border-2 border-[#163F38]/20 p-3.5 shadow-sm space-y-2.5">
                  <div className="flex items-start justify-between gap-2 border-b border-[#EAE2CE] pb-2">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#8A7B68] block">
                        {exp.category} • Paid by {exp.payerName}
                      </span>
                      <h4 className="font-serif font-bold text-sm text-[#163F38]">{exp.title}</h4>
                    </div>
                    <span className="font-serif font-bold text-base text-[#163F38]">
                      {exp.formattedTotal}
                    </span>
                  </div>

                  <div className="space-y-1">
                    {exp.participants.map((p) => (
                      <div key={p.memberId} className="flex justify-between text-[11px] text-[#5A5040]">
                        <span>{p.memberName}</span>
                        <span className="font-semibold text-[#163F38]">{p.formattedShare}</span>
                      </div>
                    ))}
                  </div>

                  <div className="pt-2 border-t border-[#EAE2CE] flex items-center justify-between">
                    {isRecorded ? (
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Check className="w-3 h-3" />
                        <span>Logged to Ledger</span>
                      </span>
                    ) : (
                      <button
                        onClick={() => handleRecordExpense(idx, exp)}
                        disabled={isRecording}
                        className="bg-[#163F38] hover:bg-[#11322d] text-white px-3 py-1 rounded-full text-[10px] font-bold flex items-center gap-1 shadow-2xs"
                      >
                        {isRecording ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                        <span>Confirm & Log</span>
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {loading && (
          <div className="flex items-center gap-2 text-xs text-[#7A6C58]">
            <Sparkles className="w-3.5 h-3.5 text-[#C9A35B] animate-spin" />
            <span>Analyzing trip context...</span>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Input Bar */}
      <div className="p-3 bg-white border-t border-[#DCCFBC] flex items-center gap-2 shrink-0">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder="Ask AI or type an expense to split..."
          className="flex-1 px-3.5 py-2 rounded-xl bg-[#F8F4EA] border border-[#D5C7AD] text-xs text-[#2C241B] placeholder-[#9A8B77] focus:outline-none focus:ring-2 focus:ring-[#163F38]"
        />
        <button
          onClick={() => handleSend()}
          disabled={loading || !input.trim()}
          className="w-8 h-8 rounded-xl bg-[#163F38] hover:bg-[#11322d] text-white flex items-center justify-center shrink-0 disabled:opacity-40"
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
