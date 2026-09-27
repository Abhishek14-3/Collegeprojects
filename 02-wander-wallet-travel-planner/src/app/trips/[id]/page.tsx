"use client";

import { useEffect, useState, use, useMemo } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import {
  Users,
  CreditCard,
  Calendar,
  Compass,
  DollarSign,
  PieChart,
  MapPin,
  CheckCircle,
  Clock,
  Sparkles,
  ArrowRight,
  Plus,
  Trash2,
  FileText,
  Upload,
  AlertCircle,
  Share2,
  TrendingUp,
  Check,
  Receipt,
  QrCode,
  Zap,
} from "lucide-react";

import { DayTimeline } from "@/components/itinerary/DayTimeline";
import { BudgetDonutChart } from "@/components/charts/BudgetDonutChart";
import { GeneratedItineraryDay, GeneratedItineraryItem } from "@/lib/itinerary/engine";
import { allocateBudget } from "@/lib/budget/engine";
import { useTripRealtime } from "@/lib/supabase/useTripRealtime";
import { CFOAdvisorCard } from "@/components/finance/CFOAdvisorCard";
import { CFOAdvisorReport } from "@/lib/expenses/cfo";
import { SmartBillDock } from "@/components/expenses/SmartBillDock";
import { ItemizedClaimModal } from "@/components/expenses/ItemizedClaimModal";
import { ExpenseSplitChatModal } from "@/components/expenses/ExpenseSplitChatModal";
import { ContextualTripAIPanel } from "@/components/planner/ContextualTripAIPanel";
import { TripInviteModal } from "@/components/trips/TripInviteModal";
import { UPISettlementModal } from "@/components/settlement/UPISettlementModal";
import { ExtractedReceiptData } from "@/app/api/ocr/scan/route";
import { getDestinationPlaces, getDestinationTransitHubs } from "@/lib/maps/destination-places";
import { getBaseCoordsForDestination } from "@/lib/maps/geocoding";
import {
  evaluateCategoryCapsAndBreaches,
  deriveDefaultCategoryCaps,
  BreachAlert,
  CapsEvaluationResult,
} from "@/lib/budget/caps";
import { CategoryBreachBanner } from "@/components/budget/CategoryBreachBanner";
import { CategoryCapsLedger } from "@/components/budget/CategoryCapsLedger";
import { AIComparativeAnalysisCard } from "@/components/budget/AIComparativeAnalysisCard";

// Dynamically import TripMap to prevent SSR leaflet window issues
const DynamicTripMap = dynamic(
  () => import("@/components/maps/TripMap").then((mod) => mod.TripMap),
  {
    ssr: false,
    loading: () => (
      <div className="h-[450px] w-full bg-[#EAE2CE]/60 flex items-center justify-center rounded-2xl border border-[#DCCFBC]">
        <div className="flex items-center gap-2 text-[#7A6C58]">
          <div className="w-5 h-5 border-2 border-[#163F38] border-t-transparent rounded-full animate-spin" />
          <span>Loading Interactive Map...</span>
        </div>
      </div>
    ),
  }
);

interface Member {
  id: string;
  name: string;
  email?: string;
  avatarUrl?: string;
  role: "OWNER" | "ORGANIZER" | "MEMBER" | "VIEWER";
  plannedContributionMinor: string | number;
  actualContributionMinor: string | number;
  plannedShareMinor: string | number;
  actualShareMinor: string | number;
  totalPaidMinor?: string | number;
  totalOwedMinor?: string | number;
  netBalanceMinor?: string | number;
  contributionRemainingMinor?: string | number;
}

interface ExpenseParticipant {
  id: string;
  memberId: string;
  memberName?: string;
  memberAvatar?: string;
  shareAmountMinor: string | number;
  percentage: number;
}

interface Expense {
  id: string;
  payerId: string;
  payerName?: string;
  payerAvatar?: string;
  title: string;
  category: "STAY" | "TRANSPORT" | "FOOD" | "ACTIVITIES" | "LOCAL_TRAVEL" | "SHOPPING" | "OTHER";
  amountMinor: string | number;
  currency: string;
  convertedAmountMinor: string | number;
  baseCurrency: string;
  date: string;
  splitMethod: "EQUAL" | "EXACT" | "PERCENTAGE" | "CUSTOM";
  isPersonal: boolean;
  participants: ExpenseParticipant[];
  receiptUrl?: string | null;
}

interface SettlementTx {
  id: string;
  fromMemberId: string;
  fromMemberName: string;
  toMemberId: string;
  toMemberName: string;
  amountMinor: string | number;
  formattedAmount: string;
  currency: string;
  isPaid: boolean;
  paidAt?: string | null;
  paymentReference?: string | null;
}

interface TripData {
  id: string;
  title: string;
  destination: string;
  startingLocation: string;
  startDate: string;
  endDate: string;
  numberOfDays: number;
  numberOfTravelers: number;
  groupBudgetMinor: string | number;
  currency: string;
  categoryCaps?: Record<string, string | number>;
  alertThresholdPct?: number;
  travelStyle: string;
  interests: string[];
  status: string;
  heroImageUrl?: string;
}

export type WorkspaceMode = "plan" | "money" | "crew";

export default function TripWorkspacePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const tripId = resolvedParams.id;

  const [activeMode, setActiveMode] = useState<WorkspaceMode>("plan");
  const [planSubView, setPlanSubView] = useState<"itinerary" | "map" | "places">("itinerary");
  const [placesCategoryFilter, setPlacesCategoryFilter] = useState<"all" | "stay" | "transport" | "activities" | "food">("all");

  // Backward-compatible navigation bridge
  function navigateToTab(tab: string) {
    if (["expenses", "budget", "cfo", "money"].includes(tab)) {
      setActiveMode("money");
    } else if (["group", "settlement", "crew"].includes(tab)) {
      setActiveMode("crew");
    } else {
      setActiveMode("plan");
      if (tab === "map") setPlanSubView("map");
      else if (["stay", "transport", "activities", "food"].includes(tab)) setPlanSubView("places");
      else setPlanSubView("itinerary");
    }
  }

  const setActiveTab = navigateToTab;

  const [trip, setTrip] = useState<TripData | null>(null);
  const [cfoReport, setCfoReport] = useState<CFOAdvisorReport | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [settlementPlan, setSettlementPlan] = useState<{
    transactions: SettlementTx[];
    totalSettlementMinor: string | number;
    isFullySettled: boolean;
    settlementProgressPercent: number;
  } | null>(null);

  const [itineraryDays, setItineraryDays] = useState<GeneratedItineraryDay[]>([]);
  const [selectedItineraryDayIndex, setSelectedItineraryDayIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showPayModal, setShowPayModal] = useState<SettlementTx | null>(null);
  const [selectedUpiTx, setSelectedUpiTx] = useState<SettlementTx | null>(null);
  const [actualizedItemIds, setActualizedItemIds] = useState<string[]>([]);
  const [isActualizingId, setIsActualizingId] = useState<string | null>(null);
  const [actualizeToast, setActualizeToast] = useState<{ title: string; amount: string } | null>(null);
  const [scannedReceipt, setScannedReceipt] = useState<ExtractedReceiptData | null>(null);
  const [showSmartBillDock, setShowSmartBillDock] = useState(false);
  const [showItemizedClaimModal, setShowItemizedClaimModal] = useState(false);
  const [showExpenseChatModal, setShowExpenseChatModal] = useState(false);
  const [showAIPanel, setShowAIPanel] = useState(false);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrNotice, setOcrNotice] = useState<string | null>(null);
  const [dismissedAlertIds, setDismissedAlertIds] = useState<string[]>([]);
  const [heroWeather, setHeroWeather] = useState<{
    city: string;
    temp: number;
    feelsLike: number;
    condition: string;
    description: string;
    iconUrl: string;
    humidity: number;
    windSpeedKmH: number;
  } | null>(null);

  // New Expense Form State
  const [newExpenseTitle, setNewExpenseTitle] = useState("");
  const [newExpenseAmount, setNewExpenseAmount] = useState("");
  const [newExpenseCurrency, setNewExpenseCurrency] = useState("INR");
  const [newExpenseCategory, setNewExpenseCategory] = useState<Expense["category"]>("FOOD");
  const [newExpensePayer, setNewExpensePayer] = useState("");
  const [newExpenseSplitMethod, setNewExpenseSplitMethod] = useState<Expense["splitMethod"]>("EQUAL");
  const [equalParticipants, setEqualParticipants] = useState<string[]>([]);
  const [newExpenseIsPersonal, setNewExpenseIsPersonal] = useState(false);
  const [customShares, setCustomShares] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);

  // Payment Reference Form State
  const [payReference, setPayReference] = useState("");

  // Invite Member Form State
  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<Member["role"]>("MEMBER");
  const [invitePlannedAmount, setInvitePlannedAmount] = useState("10000");

  useEffect(() => {
    // Check url search params for initial tab
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      const tabParam = urlParams.get("tab");
      if (tabParam) {
        navigateToTab(tabParam);
      }
    }
    loadWorkspace();
  }, [tripId]);

  // Connect to Supabase Realtime WebSocket channel for instant multi-user synchronization
  useTripRealtime({
    tripId,
    onAnyChange: () => {
      refreshWorkspaceSilently();
    },
  });

  async function refreshWorkspaceSilently() {
    try {
      const [tripRes, itinRes, settleRes, cfoRes] = await Promise.all([
        fetch(`/api/trips/${tripId}`),
        fetch(`/api/trips/${tripId}/itinerary`),
        fetch(`/api/trips/${tripId}/settlement`),
        fetch(`/api/trips/${tripId}/cfo`),
      ]);
      const [tripJson, itinJson, settleJson, cfoJson] = await Promise.all([
        tripRes.json(),
        itinRes.json(),
        settleRes.json(),
        cfoRes.json(),
      ]);

      if (tripJson.success) {
        setTrip(tripJson.trip);
        setMembers(tripJson.members || []);
        setExpenses(tripJson.expenses || []);
      }
      if (itinJson.success && itinJson.itinerary?.days) {
        setItineraryDays(itinJson.itinerary.days);
      }
      if (settleJson.success && settleJson.settlement) {
        setSettlementPlan(settleJson.settlement);
      }
      if (cfoJson.success && cfoJson.report) {
        setCfoReport(cfoJson.report);
      }
    } catch (e) {
      console.warn("Silent realtime refresh failed:", e);
    }
  }

  async function loadWorkspace() {
    try {
      setLoading(true);
      // Fetch trip details & stats
      const tripRes = await fetch(`/api/trips/${tripId}`);
      if (!tripRes.ok) {
        console.warn(`Failed to fetch trip ${tripId}: HTTP ${tripRes.status}`);
        return;
      }
      const tripJson = await tripRes.json();

      if (tripJson.success) {
        setTrip(tripJson.trip);
        setMembers(tripJson.members || []);
        setExpenses(tripJson.expenses || []);
        if (tripJson.members?.length > 0 && !newExpensePayer) {
          setNewExpensePayer(tripJson.members[0].id);
        }
        if (tripJson.members?.length > 0) {
          setEqualParticipants(tripJson.members.map((m: any) => m.id));
        }
        if (tripJson.trip?.destination) {
          fetch(`/api/weather?city=${encodeURIComponent(tripJson.trip.destination)}`)
            .then((r) => (r.ok ? r.json() : null))
            .then((w) => {
              if (w) setHeroWeather(w);
            })
            .catch((e) => console.warn("Weather fetch error:", e));
        }
      }

      // Fetch dynamic itinerary
      try {
        const itinRes = await fetch(`/api/trips/${tripId}/itinerary`);
        if (itinRes.ok) {
          const itinJson = await itinRes.json();
          if (itinJson.success && itinJson.itinerary?.days) {
            setItineraryDays(itinJson.itinerary.days);
          }
        } else {
          console.warn(`Itinerary endpoint returned HTTP ${itinRes.status}`);
        }
      } catch (err) {
        console.warn("Error fetching itinerary:", err);
      }

      // Fetch settlement calculation
      try {
        const settleRes = await fetch(`/api/trips/${tripId}/settlement`);
        if (settleRes.ok) {
          const settleJson = await settleRes.json();
          if (settleJson.success && settleJson.settlement) {
            setSettlementPlan(settleJson.settlement);
          }
        }
      } catch (err) {
        console.warn("Error fetching settlement:", err);
      }

      // Fetch AI CFO Report
      try {
        const cfoRes = await fetch(`/api/trips/${tripId}/cfo`);
        if (cfoRes.ok) {
          const cfoJson = await cfoRes.json();
          if (cfoJson.success && cfoJson.report) {
            setCfoReport(cfoJson.report);
          }
        }
      } catch (err) {
        console.warn("Failed to load CFO report:", err);
      }
    } catch (err) {
      console.error("Error loading trip workspace:", err);
    } finally {
      setLoading(false);
    }
  }

  // Handle OCR receipt scan upload
  async function handleReceiptUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setOcrLoading(true);
      setOcrNotice(null);
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
        setShowExpenseModal(false);
        setShowSmartBillDock(true);
        setOcrNotice(
          `Scanned "${ext.merchant}" (₹${(ext.totalMinor / 100).toLocaleString("en-IN")}) with ${ext.items.length} items.`
        );
      } else {
        setFormError(data.error || "Failed to parse receipt");
      }
    } catch (err) {
      console.error("Receipt upload error:", err);
      setFormError("Receipt scan failed. Please enter details manually.");
    } finally {
      setOcrLoading(false);
      e.target.value = "";
    }
  }

  // Submit New Expense
  async function handleCreateExpense(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    const amountNum = parseFloat(newExpenseAmount);
    if (!newExpenseTitle.trim()) {
      setFormError("Expense description is required.");
      return;
    }
    if (isNaN(amountNum) || amountNum <= 0) {
      setFormError("Amount must be greater than zero.");
      return;
    }
    if (!newExpensePayer) {
      setFormError("Please select the member who paid.");
      return;
    }

    const amountMinor = Math.round(amountNum * 100);

    // Build participants array based on split method
    let participantsPayload: any[] = [];

    if (newExpenseSplitMethod === "EQUAL") {
      const selected = equalParticipants.length > 0 ? equalParticipants : members.map((m) => m.id);
      if (selected.length === 0) {
        setFormError("Please select at least one traveler to split this expense.");
        return;
      }
      participantsPayload = selected.map((id) => ({ memberId: id }));
    } else if (newExpenseSplitMethod === "PERCENTAGE") {
      let sumPct = 0;
      participantsPayload = members.map((m) => {
        const pct = parseFloat(customShares[m.id] || "0");
        sumPct += pct;
        return { memberId: m.id, percentage: pct };
      });
      if (Math.abs(sumPct - 100) > 0.05) {
        setFormError(`Sum of percentages must equal 100%. Currently equals ${sumPct.toFixed(1)}%.`);
        return;
      }
    } else if (newExpenseSplitMethod === "EXACT" || newExpenseSplitMethod === "CUSTOM") {
      let sumExactMinor = 0;
      participantsPayload = members.map((m) => {
        const val = parseFloat(customShares[m.id] || "0");
        const valMinor = Math.round(val * 100);
        sumExactMinor += valMinor;
        return {
          memberId: m.id,
          exactAmountMinor: valMinor,
          customAmountMinor: valMinor,
        };
      });
      if (sumExactMinor !== amountMinor) {
        setFormError(
          `Sum of shares (₹${(sumExactMinor / 100).toLocaleString("en-IN")}) must equal total expense (₹${amountNum.toLocaleString("en-IN")}).`
        );
        return;
      }
    }

    try {
      const res = await fetch(`/api/trips/${tripId}/expenses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newExpenseTitle,
          amountMinor,
          payerId: newExpensePayer,
          category: newExpenseCategory,
          splitMethod: newExpenseSplitMethod,
          isPersonal: newExpenseIsPersonal,
          participants: participantsPayload,
          currency: newExpenseCurrency || trip?.currency || "INR",
        }),
      });

      const data = await res.json();
      if (!data.success) {
        setFormError(data.error || "Failed to create expense.");
        return;
      }

      // Reset and close
      setShowExpenseModal(false);
      setNewExpenseTitle("");
      setNewExpenseAmount("");
      setCustomShares({});
      setOcrNotice(null);
      await loadWorkspace();
    } catch (err) {
      console.error("Failed to add expense:", err);
      setFormError("Server error while saving expense.");
    }
  }

  // Delete Expense
  async function handleDeleteExpense(expenseId: string) {
    if (!confirm("Are you sure you want to delete this expense?")) return;
    try {
      await fetch(`/api/trips/${tripId}/expenses/${expenseId}`, { method: "DELETE" });
      await loadWorkspace();
    } catch (err) {
      console.error("Failed to delete expense:", err);
    }
  }

  // Submit Invite Member
  async function handleInviteMember(e: React.FormEvent) {
    e.preventDefault();
    if (!inviteName.trim()) return;

    try {
      const plannedMinor = Math.round((parseFloat(invitePlannedAmount) || 0) * 100);
      const res = await fetch(`/api/trips/${tripId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: inviteName,
          email: inviteEmail || null,
          role: inviteRole,
          plannedContributionMinor: plannedMinor,
          actualContributionMinor: plannedMinor,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setShowInviteModal(false);
        setInviteName("");
        setInviteEmail("");
        await loadWorkspace();
      }
    } catch (err) {
      console.error("Failed to invite member:", err);
    }
  }

  // Mark Settlement Payment as Paid
  async function handleMarkPaid() {
    if (!showPayModal) return;
    try {
      const res = await fetch(`/api/trips/${tripId}/settlement/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fromMemberId: showPayModal.fromMemberId,
          toMemberId: showPayModal.toMemberId,
          amountMinor: showPayModal.amountMinor,
          currency: showPayModal.currency,
          paymentReference: payReference || `UPI-${Math.floor(100000 + Math.random() * 900000)}`,
          isPaid: true,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setShowPayModal(null);
        setPayReference("");
        await loadWorkspace();
      }
    } catch (err) {
      console.error("Payment recording failed:", err);
    }
  }

  // Handle Mark Paid via Live UPI Settlement Modal
  async function handleMarkPaidFromUpi(reference: string) {
    const targetTx = selectedUpiTx || showPayModal;
    if (!targetTx) return;
    try {
      const res = await fetch(`/api/trips/${tripId}/settlement/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fromMemberId: targetTx.fromMemberId,
          toMemberId: targetTx.toMemberId,
          amountMinor: targetTx.amountMinor,
          currency: targetTx.currency,
          paymentReference: reference || `UPI-${Math.floor(100000 + Math.random() * 900000)}`,
          isPaid: true,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setSelectedUpiTx(null);
        setShowPayModal(null);
        await refreshWorkspaceSilently();
      }
    } catch (err) {
      console.error("Payment recording failed:", err);
    }
  }

  // One-Tap Itinerary Slot Actualization into Shared Group Expense
  async function handleActualizeItineraryItem(item: GeneratedItineraryItem, day: GeneratedItineraryDay) {
    if (!trip || members.length === 0) return;
    try {
      setIsActualizingId(item.id);

      // Determine amount in minor paise
      let amountMinor = item.costMinor;
      if (amountMinor <= BigInt(0)) {
        // Sensible default for unpriced / PRICE_UNAVAILABLE items: ₹500 (50,000 paise)
        amountMinor = BigInt(50000);
      }

      // Map category string to Expense category enum
      const catMap: Record<string, Expense["category"]> = {
        food: "FOOD",
        transport: "TRANSPORT",
        stay: "STAY",
        activity: "ACTIVITIES",
        local: "ACTIVITIES",
      };
      const mappedCategory = catMap[item.category] || "ACTIVITIES";

      const res = await fetch(`/api/trips/${tripId}/expenses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          payerId: members[0].id,
          title: item.title,
          category: mappedCategory,
          amountMinor: amountMinor.toString(),
          currency: trip.currency || "INR",
          date: day.date ? `${day.date}T12:00:00Z` : new Date().toISOString(),
          splitMethod: "EQUAL",
          participants: members.map((m) => m.id),
          isPersonal: false,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setActualizedItemIds((prev) => [...prev, item.id, item.title]);
        const formattedAmount = `₹${(Number(amountMinor) / 100).toLocaleString("en-IN")}`;
        setActualizeToast({ title: item.title, amount: formattedAmount });
        setTimeout(() => setActualizeToast(null), 4000);
        await refreshWorkspaceSilently();
      }
    } catch (err) {
      console.error("Failed to actualize itinerary item:", err);
    } finally {
      setIsActualizingId(null);
    }
  }

  // Date string formatter helper
  function formatTripDate(str: string | undefined): string {
    if (!str) return "";
    const clean = str.split("T")[0];
    try {
      const parts = clean.split("-");
      if (parts.length === 3) {
        const y = Number(parts[0]);
        const m = Number(parts[1]);
        const d = Number(parts[2]);
        if (y && m && d) {
          const date = new Date(Date.UTC(y, m - 1, d));
          return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
        }
      }
    } catch {}
    return clean;
  }

  // Computed Financials
  const totalBudgetRs = Number(trip?.groupBudgetMinor || 0) / 100;
  const totalSpendRs = expenses.reduce((sum, e) => sum + Number(e.convertedAmountMinor || 0), 0) / 100;
  const remainingBudgetRs = totalBudgetRs - totalSpendRs;
  const budgetUtilizationPct = totalBudgetRs > 0 ? Math.min(100, Math.round((totalSpendRs / totalBudgetRs) * 100)) : 0;

  // Realtime Category Caps Evaluation & Breach Alerts
  const capsEvaluation: CapsEvaluationResult = useMemo(() => {
    if (!trip) {
      return {
        totalBudgetMinor: BigInt(0),
        totalBudgetFormatted: "₹0.00",
        totalSpendMinor: BigInt(0),
        totalSpendFormatted: "₹0.00",
        totalRemainingMinor: BigInt(0),
        totalRemainingFormatted: "₹0.00",
        totalOvershootMinor: BigInt(0),
        totalOvershootFormatted: "₹0.00",
        totalUtilizationPct: 0,
        totalStatus: "OK",
        categorySummaries: [],
        activeAlerts: [],
        hasBreach: false,
        hasWarning: false,
      };
    }

    const budgetBig = BigInt(trip.groupBudgetMinor || 0);
    const activeCaps = trip.categoryCaps || deriveDefaultCategoryCaps(budgetBig);

    return evaluateCategoryCapsAndBreaches({
      totalBudgetMinor: budgetBig,
      categoryCaps: activeCaps as any,
      expenses,
      currency: trip.currency || "INR",
      alertThresholdPct: trip.alertThresholdPct || 80,
    });
  }, [trip, expenses]);

  // Update Category Caps & Threshold handler
  async function handleUpdateCaps(newCaps: Record<string, bigint>, threshold: number) {
    try {
      const capsPayload: Record<string, string> = {};
      for (const [k, v] of Object.entries(newCaps)) {
        capsPayload[k] = v.toString();
      }

      const res = await fetch(`/api/trips/${tripId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categoryCaps: capsPayload,
          alertThresholdPct: threshold,
        }),
      });

      const data = await res.json();
      if (data.success && data.trip) {
        setTrip(data.trip);
        refreshWorkspaceSilently();
      }
    } catch (err) {
      console.error("Failed to update category caps:", err);
    }
  }

  // Destination context & verified landmark pins
  const destCoords = trip?.destination ? getBaseCoordsForDestination(trip.destination) : [15.4989, 73.8278];
  const curatedPlaces = trip?.destination ? getDestinationPlaces(trip.destination, destCoords[0], destCoords[1]) : [];
  const destinationHubs = trip?.destination ? getDestinationTransitHubs(trip.destination, destCoords[0], destCoords[1]) : null;

  // Flattened Map items from itinerary, enriched with destination landmarks if stops are sparse
  const itineraryStops = itineraryDays.flatMap((d) => d.items);
  const mapItems = itineraryStops.length >= 3 
    ? itineraryStops 
    : [
        ...itineraryStops,
        ...curatedPlaces.map((p, idx) => ({
          id: `curated-map-${idx}`,
          timeSlot: "AFTERNOON" as const,
          startTime: "12:00",
          title: p.name,
          category: (p.category === "food" ? "food" : "activity") as any,
          location: `${p.name}, ${trip?.destination || "Destination"}`,
          latitude: p.latitude,
          longitude: p.longitude,
          costMinor: p.costMinor,
          formattedCost: p.formattedCost,
          notes: p.description,
          durationMinutes: p.durationMins,
        })),
      ];

  // Category Spend Breakdowns
  const categoryTotals: Record<string, number> = {
    STAY: 0,
    TRANSPORT: 0,
    FOOD: 0,
    ACTIVITIES: 0,
    LOCAL_TRAVEL: 0,
    SHOPPING: 0,
    OTHER: 0,
  };
  expenses.forEach((e) => {
    categoryTotals[e.category] = (categoryTotals[e.category] || 0) + Number(e.convertedAmountMinor || 0) / 100;
  });

  if (loading && !trip) {
    return (
      <div className="min-h-screen dot-grid-paper flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-[#163F38] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <h2 className="font-serif text-2xl font-bold text-[#163F38]">Loading Trip Workspace...</h2>
          <p className="text-sm text-[#7A6C58] mt-1">Verifying itinerary, shared expenses and settlement ledger</p>
        </div>
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="min-h-screen dot-grid-paper flex items-center justify-center p-6">
        <div className="bg-[#EFE9DC] border border-[#D5C7AD] p-10 rounded-3xl text-center max-w-md">
          <h2 className="font-serif text-2xl font-bold text-[#163F38]">Trip Not Found</h2>
          <p className="text-sm text-[#7A6C58] mt-2 mb-6">
            The trip you are looking for does not exist or may have been deleted.
          </p>
          <Link
            href="/trips"
            className="bg-[#163F38] text-[#F5EFE3] px-6 py-2.5 rounded-full text-sm font-semibold"
          >
            Back to All Trips
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen dot-grid-paper text-[#2C2C2C] flex flex-col ambient-glow relative overflow-x-hidden">
      {/* Top Workspace Header */}
      <header className="dot-grid-header border-b border-[#E5D8C5] sticky top-0 z-40 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/trips"
              className="w-9 h-9 rounded-full bg-white hover:bg-[#E85D04] hover:text-white flex items-center justify-center text-[#1E1A17] border border-[#E5D8C5] transition-all shadow-2xs"
              title="Back to trips"
            >
              <ArrowRight className="w-4 h-4 rotate-180" />
            </Link>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="font-serif font-bold text-xl sm:text-2xl text-[#1E1A17] tracking-tight">
                  {trip.title}
                </h1>
                <span className="hidden sm:inline-block px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#FFECD1] text-[#C44900] border border-[#FCD5A3] shadow-2xs">
                  {trip.destination}
                </span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-300 shadow-2xs" title="Synchronized live with Supabase Realtime WebSocket">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Live Sync
                </span>
              </div>
              <p className="text-xs text-[#797169] mt-0.5">
                {formatTripDate(trip.startDate)} – {formatTripDate(trip.endDate)} • {trip.numberOfDays} Days • {members.length} Travelers
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setShowSmartBillDock(true)}
              className="bg-[#E85D04] hover:bg-[#C44900] text-white px-4 py-2 rounded-full text-xs font-bold flex items-center gap-2 shadow-sm hover:shadow-md transition-all hover:scale-105 active:scale-95 cursor-pointer"
            >
              <Receipt className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">⚡ Smart Bill Dock</span>
              <span className="sm:hidden">⚡ Bill Dock</span>
            </button>

            <button
              onClick={() => setShowInviteModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-full border border-[#E5D8C5] bg-white hover:border-[#E85D04] hover:text-[#E85D04] text-xs font-semibold text-[#1E1A17] transition-all shadow-2xs hover:scale-105 active:scale-95 cursor-pointer"
            >
              <QrCode className="w-3.5 h-3.5 text-[#E85D04]" />
              <span className="hidden sm:inline">Invite Pass</span>
            </button>

            <button
              onClick={() => setShowAIPanel(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-full border border-[#E5D8C5] bg-white hover:border-[#E85D04] hover:text-[#E85D04] text-xs font-semibold text-[#1E1A17] transition-all shadow-2xs hover:scale-105 active:scale-95 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#F48C06]" />
              <span>AI Companion</span>
            </button>

            <Link
              href={`/trips/${tripId}/summary`}
              className="hidden md:flex items-center gap-1.5 px-3.5 py-2 rounded-full border border-[#E5D8C5] bg-white hover:border-[#E85D04] hover:text-[#E85D04] text-xs font-semibold text-[#1E1A17] transition-all shadow-2xs"
            >
              <FileText className="w-3.5 h-3.5 text-[#797169]" />
              <span>Summary</span>
            </Link>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 3 FLUID MODES SEGMENTED CONTROLLER */}
        {/* ========================================================================= */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="grid grid-cols-3 gap-2.5 bg-[#F3ECE0] p-1.5 rounded-2xl border border-[#E5D8C5] shadow-inner">
            {/* Mode 1: Plan & Schedule */}
            <button
              onClick={() => setActiveMode("plan")}
              className={`flex items-center justify-center sm:justify-start gap-2.5 p-2.5 sm:p-3 rounded-xl transition-all cursor-pointer text-left ${
                activeMode === "plan"
                  ? "bg-[#E85D04] text-white shadow-md ring-1 ring-orange-400/40 scale-[1.01]"
                  : "bg-white/80 hover:bg-white text-[#797169] hover:text-[#1E1A17] border border-transparent hover:border-[#E5D8C5] shadow-2xs"
              }`}
            >
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                  activeMode === "plan" ? "bg-white/20 text-white" : "bg-[#F3ECE0] text-[#797169]"
                }`}
              >
                <Compass className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1 hidden sm:block">
                <div className="flex items-center gap-1.5">
                  <span className="font-serif font-bold text-xs sm:text-sm truncate">Plan & Schedule</span>
                  {activeMode === "plan" && <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse shrink-0" />}
                </div>
                <span className={`text-[10px] block truncate ${activeMode === "plan" ? "text-white/85" : "text-[#797169]"}`}>
                  Map · Itinerary · Places
                </span>
              </div>
              <span className="sm:hidden font-serif font-bold text-xs truncate">Plan</span>
            </button>

            {/* Mode 2: Money & Splits */}
            <button
              onClick={() => setActiveMode("money")}
              className={`flex items-center justify-center sm:justify-start gap-2.5 p-2.5 sm:p-3 rounded-xl transition-all cursor-pointer text-left ${
                activeMode === "money"
                  ? "bg-[#E85D04] text-white shadow-md ring-1 ring-orange-400/40 scale-[1.01]"
                  : "bg-white/80 hover:bg-white text-[#797169] hover:text-[#1E1A17] border border-transparent hover:border-[#E5D8C5] shadow-2xs"
              }`}
            >
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                  activeMode === "money" ? "bg-white/20 text-white" : "bg-[#F3ECE0] text-[#797169]"
                }`}
              >
                <Receipt className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1 hidden sm:block">
                <div className="flex items-center gap-1.5">
                  <span className="font-serif font-bold text-xs sm:text-sm truncate">Money & Splits</span>
                  {activeMode === "money" && <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse shrink-0" />}
                </div>
                <span className={`text-[10px] block truncate ${activeMode === "money" ? "text-white/85" : "text-[#797169]"}`}>
                  Ledger · Smart Dock · Who-Owes-Whom
                </span>
              </div>
              <span className="sm:hidden font-serif font-bold text-xs truncate">Money</span>
            </button>

            {/* Mode 3: Crew & Settlement */}
            <button
              onClick={() => setActiveMode("crew")}
              className={`flex items-center justify-center sm:justify-start gap-2.5 p-2.5 sm:p-3 rounded-xl transition-all cursor-pointer text-left ${
                activeMode === "crew"
                  ? "bg-[#E85D04] text-white shadow-md ring-1 ring-orange-400/40 scale-[1.01]"
                  : "bg-white/80 hover:bg-white text-[#797169] hover:text-[#1E1A17] border border-transparent hover:border-[#E5D8C5] shadow-2xs"
              }`}
            >
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                  activeMode === "crew" ? "bg-white/20 text-white" : "bg-[#F3ECE0] text-[#797169]"
                }`}
              >
                <Users className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1 hidden sm:block">
                <div className="flex items-center gap-1.5">
                  <span className="font-serif font-bold text-xs sm:text-sm truncate">Crew & Settlement</span>
                  {activeMode === "crew" && <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse shrink-0" />}
                </div>
                <span className={`text-[10px] block truncate ${activeMode === "crew" ? "text-white/85" : "text-[#797169]"}`}>
                  Travelers · UPI Debt · PDF Journal
                </span>
              </div>
              <span className="sm:hidden font-serif font-bold text-xs truncate">Crew</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Workspace Workspace Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Visible, Dismissible Category Caps & Total Budget Breach Alert Banner */}
        <CategoryBreachBanner
          alerts={capsEvaluation.activeAlerts}
          dismissedAlertIds={dismissedAlertIds}
          onDismiss={(alertId) => setDismissedAlertIds((prev) => [...prev, alertId])}
          onNavigateToBudget={() => {
            setActiveTab("budget");
            setTimeout(() => {
              const el = document.getElementById("ai-comparative-analysis");
              if (el) el.scrollIntoView({ behavior: "smooth" });
            }, 100);
          }}
        />

                {/* ========================================================================= */}
        {/* MODE 1: PLAN & SCHEDULE (Map + Itinerary + Places) */}
        {/* ========================================================================= */}
        {activeMode === "plan" && (
          <div className="space-y-8">
            {/* Hero Card Banner */}
            <div className="relative rounded-3xl overflow-hidden shadow-xl min-h-[280px] sm:min-h-[320px] w-full bg-[#163F38] border border-white/10">
              <img
                src={
                  trip.heroImageUrl ||
                  "https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=1400&q=85"
                }
                alt={trip.title}
                className="w-full h-full object-cover absolute inset-0 mix-blend-overlay opacity-60"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0f2c27] via-[#163F38]/70 to-[#0f2c27]/30" />

              <div className="relative p-6 sm:p-8 flex flex-col justify-between h-full min-h-[280px] sm:min-h-[320px] text-white">
                {/* Top Floating Chips in Hero */}
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className="px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider bg-white/15 backdrop-blur-md text-white border border-white/20 shadow-sm flex items-center gap-1.5">
                      <Compass className="w-3.5 h-3.5 text-[#C9A35B]" />
                      <span>{trip.travelStyle} • {trip.destination}</span>
                    </span>
                    <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#C9A35B]/20 backdrop-blur-md text-[#FCF9F2] border border-[#C9A35B]/30 shadow-2xs">
                      {heroWeather?.iconUrl ? (
                        <img src={heroWeather.iconUrl} alt={heroWeather.condition} className="w-4 h-4 -my-0.5" />
                      ) : (
                        <span>🌤️</span>
                      )}
                      <span>
                        {heroWeather
                          ? `${heroWeather.temp}°C ${heroWeather.description}`
                          : `Live Weather • ${trip.destination}`}
                      </span>
                    </span>
                  </div>

                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 backdrop-blur-md text-emerald-300 border border-emerald-500/30">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                    Day 2 of {trip.numberOfDays} Active
                  </span>
                </div>

                {/* Bottom Content in Hero */}
                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 pt-8">
                  <div className="space-y-2">
                    <h2 className="font-serif text-3xl sm:text-5xl font-bold tracking-tight text-[#FCF9F2] drop-shadow-sm">
                      {trip.title}
                    </h2>
                    <p className="text-white/85 text-xs sm:text-sm font-medium">
                      {formatTripDate(trip.startDate)} – {formatTripDate(trip.endDate)} • {trip.numberOfDays} Days Journey
                    </p>

                    {/* Member Avatar Stack in Hero */}
                    <div className="flex items-center gap-3 pt-2">
                      <div className="flex items-center -space-x-2">
                        {members.slice(0, 5).map((m) => (
                          <img
                            key={m.id}
                            src={
                              m.avatarUrl ||
                              "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80"
                            }
                            alt={m.name}
                            title={m.name}
                            className="w-7 h-7 rounded-full object-cover border-2 border-[#163F38] shadow-xs"
                          />
                        ))}
                      </div>
                      <span className="text-xs text-white/80">
                        {members.length} travelers connected
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 self-start sm:self-auto flex-wrap">
                    <button
                      onClick={() => setPlanSubView("itinerary")}
                      className={`px-4 py-2 rounded-full text-xs font-bold transition-all shadow-md cursor-pointer ${
                        planSubView === "itinerary"
                          ? "bg-[#C9A35B] text-[#163F38]"
                          : "bg-white/20 text-white hover:bg-white/30 backdrop-blur-sm"
                      }`}
                    >
                      📅 Schedule
                    </button>
                    <button
                      onClick={() => setPlanSubView("map")}
                      className={`px-4 py-2 rounded-full text-xs font-bold transition-all shadow-md cursor-pointer ${
                        planSubView === "map"
                          ? "bg-[#C9A35B] text-[#163F38]"
                          : "bg-white/20 text-white hover:bg-white/30 backdrop-blur-sm"
                      }`}
                    >
                      🗺️ Map
                    </button>
                    <button
                      onClick={() => setPlanSubView("places")}
                      className={`px-4 py-2 rounded-full text-xs font-bold transition-all shadow-md cursor-pointer ${
                        planSubView === "places"
                          ? "bg-[#C9A35B] text-[#163F38]"
                          : "bg-white/20 text-white hover:bg-white/30 backdrop-blur-sm"
                      }`}
                    >
                      📍 Places & POIs
                    </button>
                    <button
                      onClick={() => setActiveMode("money")}
                      className="bg-gradient-to-r from-[#C95B3D] to-[#b04f30] text-white hover:from-[#b04f30] hover:to-[#9e2a2b] px-4 py-2 rounded-full text-xs font-bold transition-all shadow-lg hover:scale-105 active:scale-95 cursor-pointer"
                    >
                      Manage Spend →
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Plan Sub-Navigation Tabs */}
            <div className="flex items-center justify-between border-b border-[#DCCFBC]/60 pb-3 flex-wrap gap-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPlanSubView("itinerary")}
                  className={`px-4 py-2 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    planSubView === "itinerary"
                      ? "bg-[#163F38] text-[#FCF9F2] shadow-sm"
                      : "bg-[#FCF9F2] text-[#5A5040] hover:bg-[#EAE2CE] border border-[#DCCFBC]"
                  }`}
                >
                  <Calendar className="w-3.5 h-3.5 text-[#C9A35B]" />
                  <span>Daily Itinerary ({itineraryDays.length} Days)</span>
                </button>
                <button
                  onClick={() => setPlanSubView("map")}
                  className={`px-4 py-2 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    planSubView === "map"
                      ? "bg-[#163F38] text-[#FCF9F2] shadow-sm"
                      : "bg-[#FCF9F2] text-[#5A5040] hover:bg-[#EAE2CE] border border-[#DCCFBC]"
                  }`}
                >
                  <MapPin className="w-3.5 h-3.5 text-[#C9A35B]" />
                  <span>Interactive Map</span>
                </button>
                <button
                  onClick={() => setPlanSubView("places")}
                  className={`px-4 py-2 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    planSubView === "places"
                      ? "bg-[#163F38] text-[#FCF9F2] shadow-sm"
                      : "bg-[#FCF9F2] text-[#5A5040] hover:bg-[#EAE2CE] border border-[#DCCFBC]"
                  }`}
                >
                  <Compass className="w-3.5 h-3.5 text-[#C9A35B]" />
                  <span>Explore Places & POIs</span>
                </button>
              </div>

              {planSubView === "itinerary" && (
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                  {itineraryDays.map((d, idx) => (
                    <button
                      key={d.dayNumber}
                      onClick={() => setSelectedItineraryDayIndex(idx)}
                      className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                        selectedItineraryDayIndex === idx
                          ? "bg-[#C95B3D] text-white shadow-xs"
                          : "bg-[#EAE2CE]/80 text-[#5A5040] hover:bg-[#E0D5BE]"
                      }`}
                    >
                      Day {d.dayNumber}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* SubView 1: Itinerary */}
            {planSubView === "itinerary" && (
              <div className="space-y-6">
                {itineraryDays.length > 0 && itineraryDays[selectedItineraryDayIndex] ? (
                  <div className="bg-[#FBF8F2] border border-[#E3D9C3] rounded-3xl p-6 sm:p-8 shadow-sm">
                    <DayTimeline
                      day={itineraryDays[selectedItineraryDayIndex]}
                      onActualizeItem={handleActualizeItineraryItem}
                      actualizedItemIds={actualizedItemIds}
                      isActualizingId={isActualizingId}
                    />
                  </div>
                ) : (
                  <div className="text-center py-12 text-[#7A6C58] bg-[#FBF8F2] rounded-3xl border border-[#DCCFBC]">
                    <Compass className="w-10 h-10 mx-auto mb-2 opacity-40" />
                    <p className="font-serif text-lg font-bold text-[#163F38]">Generating itinerary...</p>
                  </div>
                )}
              </div>
            )}

            {/* SubView 2: Interactive Map */}
            {planSubView === "map" && (
              <div className="space-y-6">
                <div className="glass-card-interactive border border-[#DCCFBC]/60 rounded-3xl p-6 shadow-sm bg-[#FCF9F2]/90">
                  <DynamicTripMap items={mapItems} destination={trip.destination} className="h-[580px] rounded-2xl overflow-hidden shadow-inner" />
                </div>
              </div>
            )}

            {/* SubView 3: Places (Stays + Transit + Activities + Food) */}
            {planSubView === "places" && (
              <div className="space-y-8">
                {/* Category Filter Pills */}
                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                  {[
                    { id: "all", label: "All Curated POIs" },
                    { id: "stay", label: "🏡 Lodging & Stays" },
                    { id: "transport", label: "🚆 Transit & Mobility" },
                    { id: "activities", label: "🏄 Activities & Sights" },
                    { id: "food", label: "🍲 Dining & Cuisine" },
                  ].map((filter) => (
                    <button
                      key={filter.id}
                      onClick={() => setPlacesCategoryFilter(filter.id as any)}
                      className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                        placesCategoryFilter === filter.id
                          ? "bg-[#163F38] text-white shadow-xs"
                          : "bg-[#FCF9F2] text-[#5A5040] hover:bg-[#EAE2CE] border border-[#DCCFBC]"
                      }`}
                    >
                      {filter.label}
                    </button>
                  ))}
                </div>

                {/* Stays Section */}
                {(placesCategoryFilter === "all" || placesCategoryFilter === "stay") && (
                  <div className="space-y-4">
                    <h3 className="font-serif text-2xl font-bold text-[#163F38]">Lodging & Stays</h3>
                    <div className="bg-[#FBF8F2] border border-[#E3D9C3] rounded-3xl p-6 sm:p-8 shadow-sm">
                      <div className="flex flex-col md:flex-row gap-6">
                        <img
                          src="https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=600&q=80"
                          alt="Casa de Praia Villa"
                          className="w-full md:w-72 h-48 rounded-2xl object-cover"
                        />
                        <div className="flex-1 flex flex-col justify-between">
                          <div>
                            <div className="flex items-center justify-between">
                              <span className="text-xs uppercase font-bold text-[#C95B3D] tracking-wider">Booked Homestay</span>
                              <span className="font-serif font-bold text-xl text-[#163F38]">₹15,200 Total</span>
                            </div>
                            <h4 className="font-serif text-2xl font-bold text-[#163F38] mt-1">Casa de Praia Villa</h4>
                            <p className="text-xs text-[#7A6C58] mt-1">Anjuna Beach Road, North Goa, 403509</p>

                            <div className="flex flex-wrap gap-2 mt-4">
                              {["Private Pool", "WiFi", "Air Conditioning", "6 Guests", "3 Bedrooms", "Kitchen"].map((amenity) => (
                                <span key={amenity} className="px-3 py-1 rounded-full text-[11px] bg-[#EAE2CE] text-[#5A5040] font-medium">
                                  {amenity}
                                </span>
                              ))}
                            </div>
                          </div>

                          <div className="flex items-center justify-between text-xs text-[#7A6C58] pt-4 border-t border-[#EDE4D1] mt-4">
                            <span>Check-in: {trip.startDate} (14:00)</span>
                            <span>Check-out: {trip.endDate} (11:00)</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Transit Section */}
                {(placesCategoryFilter === "all" || placesCategoryFilter === "transport") && (
                  <div className="space-y-4">
                    <h3 className="font-serif text-2xl font-bold text-[#163F38]">Transit & Local Mobility</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="bg-[#FBF8F2] border border-[#E3D9C3] rounded-3xl p-6 shadow-sm">
                        <div className="flex justify-between items-start mb-3">
                          <span className="text-xs uppercase font-bold text-[#163F38] tracking-wider">Arrival Route</span>
                          <span className="font-serif font-bold text-[#163F38]">Verified Route</span>
                        </div>
                        <h4 className="font-serif text-xl font-bold text-[#163F38]">
                          {destinationHubs ? destinationHubs.airport.split("(")[0].trim() : "Airport / Terminal Transfer"}
                        </h4>
                        <p className="text-xs text-[#7A6C58] mt-1">
                          {destinationHubs?.airport.split("-")[0].trim() || "Arrival Hub"} → {trip?.destination || "Destination"}
                        </p>
                        <div className="text-xs text-[#5A5040] mt-4 space-y-1">
                          <div>• Rail Connection: {destinationHubs?.trainStation || "Central Station"}</div>
                          <div>• Bus Terminal: {destinationHubs?.busTerminal || "Intercity Terminal"}</div>
                        </div>
                      </div>

                      <div className="bg-[#FBF8F2] border border-[#E3D9C3] rounded-3xl p-6 shadow-sm">
                        <div className="flex justify-between items-start mb-3">
                          <span className="text-xs uppercase font-bold text-[#163F38] tracking-wider">Local Mobility</span>
                          <span className="font-serif font-bold text-[#163F38]">On-Demand</span>
                        </div>
                        <h4 className="font-serif text-xl font-bold text-[#163F38]">
                          {trip?.destination?.toLowerCase().includes("manali")
                            ? "4x4 Mountain Cab & Bike Rentals"
                            : trip?.destination?.toLowerCase().includes("paris")
                            ? "Metro Navigo & Vélib' Passes"
                            : "Ride-Hail, Auto & Local Transit"}
                        </h4>
                        <p className="text-xs text-[#7A6C58] mt-1">{trip?.destination || "City"} Mobility Hub</p>
                        <div className="text-xs text-[#5A5040] mt-4 space-y-1">
                          <div>• Direct connection between stays and iconic sightseeing points</div>
                          <div>• Group-friendly split travel options available</div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Activities Section */}
                {(placesCategoryFilter === "all" || placesCategoryFilter === "activities") && (
                  <div className="space-y-4">
                    <h3 className="font-serif text-2xl font-bold text-[#163F38]">Curated Activities in {trip?.destination || "Destination"}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {curatedPlaces.filter((p) => p.category !== "food").slice(0, 6).map((act) => (
                        <div key={act.id} className="bg-[#FBF8F2] border border-[#E3D9C3] rounded-3xl p-6 shadow-sm flex flex-col justify-between">
                          <div>
                            <div className="flex justify-between items-center mb-2">
                              <span className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full bg-[#EAE2CE] text-[#5A5040]">
                                {act.category}
                              </span>
                              <span className="font-serif font-bold text-[#163F38]">{act.formattedCost}</span>
                            </div>
                            <h4 className="font-serif text-xl font-bold text-[#163F38]">{act.name}</h4>
                            <p className="text-xs text-[#7A6C58] mt-1">Duration: {Math.floor(act.durationMins / 60)}h {act.durationMins % 60 > 0 ? (act.durationMins % 60) + "m" : ""}</p>
                            <p className="text-xs text-[#5F625B] mt-2">{act.description}</p>
                          </div>
                          {act.highlights && act.highlights.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mt-4 pt-3 border-t border-[#E3D9C3]/50">
                              {act.highlights.map((h, i) => (
                                <span key={i} className="text-[10px] bg-[#FCF9F2] border border-[#DCCFBC] px-2 py-0.5 rounded text-[#163F38]">
                                  ✓ {h}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Food & Dining Section */}
                {(placesCategoryFilter === "all" || placesCategoryFilter === "food") && (
                  <div className="space-y-4">
                    <h3 className="font-serif text-2xl font-bold text-[#163F38]">Dining & Regional Specialties</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {trip?.destination?.toLowerCase().includes("hyderabad") ? (
                        [
                          { name: "Bawarchi / Paradise Heritage", cuisine: "Authentic Nizami Dum Biryani & Kebabs", price: "₹₹" },
                          { name: "Nimrah Café & Bakery", cuisine: "Irani Chai & Osmania Biscuits at Charminar", price: "₹" },
                          { name: "Shah Ghouse / Shadab", cuisine: "Haleem, Mutton Biryani & Double ka Meetha", price: "₹₹" },
                        ].map((res) => (
                          <div key={res.name} className="bg-[#FBF8F2] border border-[#E3D9C3] rounded-3xl p-6 shadow-sm">
                            <span className="text-xs font-bold text-[#C95B3D]">{res.price}</span>
                            <h4 className="font-serif text-xl font-bold text-[#163F38] mt-1">{res.name}</h4>
                            <p className="text-xs text-[#7A6C58] mt-1">{res.cuisine}</p>
                          </div>
                        ))
                      ) : trip?.destination?.toLowerCase().includes("manali") ? (
                        [
                          { name: "Café 1947 Riverside", cuisine: "Wood-fired Pizza & River Trout", price: "₹₹" },
                          { name: "The Lazy Dog Lounge", cuisine: "Mountain Bistro & Crafted Drinks", price: "₹₹₹" },
                          { name: "Mall Road Siddu & Momos", cuisine: "Authentic Himachali Siddu with Ghee", price: "₹" },
                        ].map((res) => (
                          <div key={res.name} className="bg-[#FBF8F2] border border-[#E3D9C3] rounded-3xl p-6 shadow-sm">
                            <span className="text-xs font-bold text-[#C95B3D]">{res.price}</span>
                            <h4 className="font-serif text-xl font-bold text-[#163F38] mt-1">{res.name}</h4>
                            <p className="text-xs text-[#7A6C58] mt-1">{res.cuisine}</p>
                          </div>
                        ))
                      ) : trip?.destination?.toLowerCase().includes("paris") ? (
                        [
                          { name: "Le Bistrot Paul Bert", cuisine: "Classic French Bistro & Steak Frites", price: "€€€" },
                          { name: "Café de Flore", cuisine: "Historic Boulevard Café & Hot Chocolate", price: "€€" },
                          { name: "Du Pain et des Idées", cuisine: "Artisan Bakery & Fresh Croissants", price: "€" },
                        ].map((res) => (
                          <div key={res.name} className="bg-[#FBF8F2] border border-[#E3D9C3] rounded-3xl p-6 shadow-sm">
                            <span className="text-xs font-bold text-[#C95B3D]">{res.price}</span>
                            <h4 className="font-serif text-xl font-bold text-[#163F38] mt-1">{res.name}</h4>
                            <p className="text-xs text-[#7A6C58] mt-1">{res.cuisine}</p>
                          </div>
                        ))
                      ) : (
                        [
                          { name: `${trip?.destination || "City"} Heritage Bistro`, cuisine: "Signature Regional Delicacies", price: "₹₹" },
                          { name: `${trip?.destination || "City"} Garden Courtyard`, cuisine: "Farm-to-Table Fresh Regional Cuisine", price: "₹₹₹" },
                          { name: `${trip?.destination || "City"} Artisan Street Stalls`, cuisine: "Local Street Food & Hot Teas", price: "₹" },
                        ].map((res) => (
                          <div key={res.name} className="bg-[#FBF8F2] border border-[#E3D9C3] rounded-3xl p-6 shadow-sm">
                            <span className="text-xs font-bold text-[#C95B3D]">{res.price}</span>
                            <h4 className="font-serif text-xl font-bold text-[#163F38] mt-1">{res.name}</h4>
                            <p className="text-xs text-[#7A6C58] mt-1">{res.cuisine}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* MODE 2: MONEY & SPLITS (Ledger + NLP Chat + OCR + Who-Owes-Whom) */}
        {/* ========================================================================= */}
        {activeMode === "money" && (
          <div className="space-y-8">
            {/* Header with Quick Action Controls */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="font-serif text-3xl font-bold text-[#1E1A17]">Money & Splits Workspace</h2>
                <p className="text-sm text-[#797169] mt-1">
                  Deterministic splits with integer paise zero-drift remainder absorption, AI bill extraction, and live balances.
                </p>
              </div>

              <div className="flex items-center gap-2.5 self-start sm:self-auto flex-wrap">
                <button
                  onClick={() => setShowExpenseModal(true)}
                  className="bg-[#E85D04] hover:bg-[#C44900] text-white px-5 py-2.5 rounded-full text-xs font-bold flex items-center gap-2 shadow-sm hover:shadow-md hover:scale-105 active:scale-95 transition-all cursor-pointer"
                >
                  <Plus className="w-4 h-4 text-white" />
                  <span>+ Add Expense</span>
                </button>

                <button
                  onClick={() => setShowSmartBillDock(true)}
                  className="bg-[#FFECD1] hover:bg-[#ffe1b5] text-[#C44900] border border-[#FCD5A3] px-4 py-2.5 rounded-full text-xs font-bold flex items-center gap-2 shadow-2xs hover:scale-105 active:scale-95 transition-all cursor-pointer"
                >
                  <Receipt className="w-4 h-4 text-[#E85D04]" />
                  <span>⚡ Smart Bill Dock</span>
                </button>

                <button
                  onClick={() => setShowExpenseChatModal(true)}
                  className="bg-white hover:bg-[#FAF6EE] text-[#1E1A17] border border-[#E5D8C5] px-4 py-2.5 rounded-full text-xs font-semibold flex items-center gap-2 shadow-2xs hover:border-[#E85D04] hover:text-[#E85D04] hover:scale-105 active:scale-95 transition-all cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-[#F48C06]" />
                  <span>AI Split Chat</span>
                </button>

                <label className="cursor-pointer bg-white hover:bg-[#FAF6EE] text-[#1E1A17] border border-[#E5D8C5] px-4 py-2.5 rounded-full text-xs font-semibold flex items-center gap-2 shadow-2xs hover:border-[#E85D04] hover:text-[#E85D04] hover:scale-105 active:scale-95 transition-all">
                  <Upload className="w-3.5 h-3.5 text-[#E85D04]" />
                  <span>Scan Bill</span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,application/pdf"
                    onChange={handleReceiptUpload}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            {/* Quick Spend Summary Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-white rounded-2xl p-5 border border-[#E5D8C5] shadow-[0_4px_20px_-4px_rgba(30,26,23,0.05)] hover:border-[#E85D04]/40 transition-all">
                <span className="text-[11px] font-bold text-[#797169] uppercase tracking-wider block mb-1">
                  Total Spend
                </span>
                <div className="text-2xl sm:text-3xl font-bold font-sans tracking-tight text-[#1E1A17] tabular-nums">
                  <span className="text-lg font-semibold text-[#797169] mr-0.5">₹</span>
                  {totalSpendRs.toLocaleString("en-IN")}
                </div>
                <span className="text-[11px] text-[#797169] block mt-1">
                  {budgetUtilizationPct}% of ₹{totalBudgetRs.toLocaleString("en-IN")}
                </span>
              </div>
              <div className="bg-white rounded-2xl p-5 border border-[#E5D8C5] shadow-[0_4px_20px_-4px_rgba(30,26,23,0.05)] hover:border-[#E85D04]/40 transition-all">
                <span className="text-[11px] font-bold text-[#797169] uppercase tracking-wider block mb-1">
                  Shared Spend
                </span>
                <div className="text-2xl sm:text-3xl font-bold font-sans tracking-tight text-[#1E1A17] tabular-nums">
                  <span className="text-lg font-semibold text-[#797169] mr-0.5">₹</span>
                  {(expenses.filter(e => !e.isPersonal).reduce((s, e) => s + Number(e.convertedAmountMinor), 0) / 100).toLocaleString("en-IN")}
                </div>
                <span className="text-[11px] text-[#2D6A4F] block mt-1 font-semibold">
                  Auto-settled in group
                </span>
              </div>
              <div className="bg-white rounded-2xl p-5 border border-[#E5D8C5] shadow-[0_4px_20px_-4px_rgba(30,26,23,0.05)] hover:border-[#E85D04]/40 transition-all">
                <span className="text-[11px] font-bold text-[#797169] uppercase tracking-wider block mb-1">
                  Personal Spend
                </span>
                <div className="text-2xl sm:text-3xl font-bold font-sans tracking-tight text-[#797169] tabular-nums">
                  <span className="text-lg font-semibold text-[#797169] mr-0.5">₹</span>
                  {(expenses.filter(e => e.isPersonal).reduce((s, e) => s + Number(e.convertedAmountMinor), 0) / 100).toLocaleString("en-IN")}
                </div>
                <span className="text-[11px] text-[#C44900] block mt-1 font-semibold">
                  Zero group debt
                </span>
              </div>
              <div className="bg-white rounded-2xl p-5 border border-[#E5D8C5] shadow-[0_4px_20px_-4px_rgba(30,26,23,0.05)] hover:border-[#E85D04]/40 transition-all">
                <span className="text-[11px] font-bold text-[#797169] uppercase tracking-wider block mb-1">
                  Transactions
                </span>
                <div className="text-2xl sm:text-3xl font-bold font-sans tracking-tight text-[#1E1A17] tabular-nums">
                  {expenses.length}
                </div>
                <span className="text-[11px] text-[#797169] block mt-1">
                  {settlementPlan?.transactions.length || 0} transfers pending
                </span>
              </div>
            </div>

            {/* AI CFO Advisor Card */}
            <CFOAdvisorCard
              report={cfoReport}
              tripId={tripId}
              onRefresh={refreshWorkspaceSilently}
            />

            {/* Category Caps & Thresholds Ledger */}
            <CategoryCapsLedger
              tripId={tripId}
              currency={trip.currency || "INR"}
              totalBudgetMinor={capsEvaluation.totalBudgetMinor}
              totalSpendMinor={capsEvaluation.totalSpendMinor}
              categories={capsEvaluation.categorySummaries}
              alertThresholdPct={trip.alertThresholdPct || 80}
              onUpdateCaps={handleUpdateCaps}
            />

            {/* AI Comparative Budget & OCR Spend Analysis Card */}
            <div id="ai-comparative-analysis">
              <AIComparativeAnalysisCard
                tripId={tripId}
                currency={trip.currency || "INR"}
                onBudgetUpdated={refreshWorkspaceSilently}
              />
            </div>

            {/* Category Allocations & Health */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 bg-[#FBF8F2] border border-[#E3D9C3] rounded-3xl p-6 sm:p-8 shadow-sm">
                <h3 className="font-serif text-xl font-bold text-[#163F38] mb-6">Category Allocations</h3>
                <BudgetDonutChart
                  totalBudgetMinor={BigInt(trip.groupBudgetMinor)}
                  travelers={trip.numberOfTravelers}
                  numberOfDays={trip.numberOfDays}
                  plannedSpendMinor={BigInt(Math.round(totalSpendRs * 100))}
                  categories={allocateBudget(BigInt(trip.groupBudgetMinor), trip.numberOfTravelers)}
                />
              </div>

              {/* Budget Health Card */}
              <div className="bg-[#EFE9DC] border border-[#E0D5BE] rounded-3xl p-6 sm:p-8 shadow-sm flex flex-col justify-between">
                <div>
                  <span className="text-xs uppercase font-bold text-[#8A7B68] tracking-wider">Health Status</span>
                  <h3 className="font-serif text-2xl font-bold text-[#163F38] mt-1 mb-4">
                    {budgetUtilizationPct > 85 ? "Approaching Limit" : "Balanced & On-Track"}
                  </h3>
                  <p className="text-xs text-[#6B5E4C] leading-relaxed mb-6">
                    Wander Wallet ensures your group does not exceed the ₹{totalBudgetRs.toLocaleString("en-IN")} allowance. All splits are calculated server-side in integer paise.
                  </p>

                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-xs mb-1 font-semibold text-[#5A5040]">
                        <span>Budget Used</span>
                        <span>{budgetUtilizationPct}%</span>
                      </div>
                      <div className="w-full bg-[#E0D5BE] h-3 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            budgetUtilizationPct > 85 ? "bg-[#C95B3D]" : "bg-[#163F38]"
                          }`}
                          style={{ width: `${budgetUtilizationPct}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-6 border-t border-[#D5C7AD] mt-6">
                  <Link
                    href={`/trips/${tripId}/ai-planner`}
                    className="w-full bg-[#163F38] hover:bg-[#1f534a] text-[#F5EFE3] py-3 rounded-2xl text-center text-xs font-bold block shadow-sm"
                  >
                    Simulate Plan Changes in AI →
                  </Link>
                </div>
              </div>
            </div>

            {/* Expenses Transactions List */}
            <div className="glass-card-interactive rounded-3xl p-6 sm:p-8 shadow-sm border border-[#DCCFBC]/60 bg-[#FCF9F2]/90">
              <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
                <div>
                  <h3 className="font-serif text-xl font-bold text-[#163F38]">Recent Transactions</h3>
                  <p className="text-xs text-[#7A6C58]">Every receipt verified and allocated across travelers</p>
                </div>
                <button
                  onClick={() => setShowSmartBillDock(true)}
                  className="text-xs font-bold text-[#163F38] hover:text-[#C95B3D] flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Receipt className="w-3.5 h-3.5 text-[#C95B3D]" />
                  <span>Scan or Speak New Bill →</span>
                </button>
              </div>

              {expenses.length === 0 ? (
                <div className="text-center py-12 text-[#7A6C58]">
                  <CreditCard className="w-10 h-10 mx-auto mb-2 opacity-40" />
                  <p className="font-serif text-lg">No expenses recorded yet.</p>
                  <p className="text-xs mt-1">Tap <strong>"⚡ Smart Bill Dock"</strong> to scan a bill or speak your split naturally.</p>
                  <button
                    onClick={() => setShowSmartBillDock(true)}
                    className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#163F38] text-white text-xs font-bold hover:bg-[#1c5c52] transition-all shadow-xs hover:scale-105 cursor-pointer"
                  >
                    <Receipt className="w-3.5 h-3.5 text-[#C9A35B]" />
                    <span>Launch Smart Bill Dock</span>
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-[#EDE4D1]">
                  {expenses.map((exp) => {
                    const amountRs = Number(exp.convertedAmountMinor || 0) / 100;
                    return (
                      <div key={exp.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-2xl bg-[#EAE2CE] flex items-center justify-center text-[#163F38] font-bold text-sm shrink-0">
                            {exp.category[0]}
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="font-serif font-bold text-base text-[#163F38]">{exp.title}</h4>
                              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#EAE2CE] text-[#5A5040]">
                                {exp.splitMethod}
                              </span>
                              {exp.isPersonal && (
                                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#E0D5BE] text-[#7A6C58]">
                                  Personal
                                </span>
                              )}
                              {exp.receiptUrl && (
                                <a
                                  href={exp.receiptUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-[10px] font-bold text-[#163F38] bg-[#E5ECE9] hover:bg-[#D5E3DE] px-2 py-0.5 rounded-full flex items-center gap-1 transition-colors"
                                  title="View Receipt"
                                >
                                  <span>📎 Receipt</span>
                                </a>
                              )}
                            </div>
                            <p className="text-xs text-[#7A6C58] mt-0.5">
                              Paid by <span className="font-semibold text-[#163F38]">{exp.payerName || "A Member"}</span> • Split among {exp.participants.length} travelers • {exp.date?.split("T")[0]}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between sm:justify-end gap-4">
                          <div className="text-right">
                            <span className="font-serif font-bold text-lg text-[#163F38]">
                              ₹{amountRs.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                            </span>
                            <span className="text-[10px] text-[#8A7B68] block">
                              {exp.currency !== "INR" ? `(${exp.currency} converted)` : "Base INR"}
                            </span>
                          </div>

                          <button
                            onClick={() => handleDeleteExpense(exp.id)}
                            className="p-2 rounded-full hover:bg-[#F0E5D3] text-[#8A7B68] hover:text-[#C95B3D] transition-colors cursor-pointer"
                            title="Delete Expense"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Live Who-Owes-Whom Balance Ledger */}
            <div className="glass-card-interactive rounded-3xl p-6 sm:p-8 shadow-sm border border-[#DCCFBC]/60 bg-[#FCF9F2]/90 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#DCCFBC]/50">
                <div>
                  <h3 className="font-serif text-xl font-bold text-[#163F38]">Live Who-Owes-Whom Ledger</h3>
                  <p className="text-xs text-[#7A6C58]">Real-time balance breakdown derived from all logged group expenses</p>
                </div>
                <button
                  onClick={() => setActiveMode("crew")}
                  className="text-xs font-bold text-[#163F38] hover:text-[#C95B3D] flex items-center gap-1 transition cursor-pointer"
                >
                  <span>Settle Up with Crew →</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {members.map((m) => {
                  const net = Number(m.netBalanceMinor || 0) / 100;
                  const totalPaid = Number(m.totalPaidMinor || 0) / 100;
                  const totalOwed = Number(m.totalOwedMinor || 0) / 100;

                  return (
                    <div key={m.id} className="p-4 rounded-2xl bg-white border border-[#DCCFBC] shadow-2xs space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-[#163F38] text-white text-xs font-bold flex items-center justify-center">
                            {m.name.charAt(0)}
                          </div>
                          <div>
                            <span className="text-xs font-bold text-[#163F38] block">{m.name}</span>
                            <span className="text-[10px] text-[#8A7B68] block">{m.role}</span>
                          </div>
                        </div>

                        <span
                          className={`text-xs font-mono font-bold px-2 py-0.5 rounded-full border ${
                            net > 0
                              ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                              : net < 0
                              ? "bg-rose-50 text-rose-800 border-rose-300"
                              : "bg-[#EAE2CE]/60 text-[#7A6C58] border-[#DCCFBC]"
                          }`}
                        >
                          {net > 0 ? `+₹${net.toLocaleString("en-IN")}` : net < 0 ? `-₹${Math.abs(net).toLocaleString("en-IN")}` : "Settled"}
                        </span>
                      </div>

                      <div className="flex justify-between text-[11px] text-[#5A5040] pt-1 border-t border-[#EAE2CE]/70">
                        <span>Paid: ₹{totalPaid.toLocaleString("en-IN")}</span>
                        <span>Share: ₹{totalOwed.toLocaleString("en-IN")}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* MODE 3: CREW & SETTLEMENT (Travelers + UPI Debt Settlement + PDF Journal) */}
        {/* ========================================================================= */}
        {activeMode === "crew" && (
          <div className="space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="font-serif text-3xl font-bold text-[#163F38]">Crew & Settlement Hub</h2>
                <p className="text-sm text-[#7A6C58] mt-1">
                  Manage travelers, shared expense ground rules, greedy minimal cash-flow debt simplification, and final PDF travel journals.
                </p>
              </div>

              <button
                onClick={() => setShowInviteModal(true)}
                className="bg-[#172A3A] hover:bg-[#233d52] text-[#FFF9F0] px-5 py-2.5 rounded-full text-xs font-semibold flex items-center gap-2 shadow-md hover:scale-105 active:scale-95 transition-all self-start sm:self-auto cursor-pointer"
              >
                <QrCode className="w-4 h-4 text-[#D49A55]" />
                <span>Invite Travelers & QR Pass</span>
              </button>
            </div>

            {/* Upfront Shared vs. Personal Expense Rules Banner */}
            <div className="rounded-3xl p-6 sm:p-7 border-2 border-[#163F38]/20 bg-gradient-to-r from-[#FFFDF8] via-[#F7F2E7] to-[#FFFDF8] shadow-sm space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-2xl bg-[#163F38] text-white flex items-center justify-center font-bold text-sm shadow-xs">
                  ⚖️
                </div>
                <div>
                  <h3 className="font-serif text-lg font-bold text-[#163F38]">Upfront Group Rules: Shared vs. Personal Expenses</h3>
                  <p className="text-xs text-[#7A6C58]">Agreed upfront so every traveler knows what is pooled and what stays personal</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                <div className="p-4 rounded-2xl bg-white border border-[#DCCFBC] shadow-2xs space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[#163F38]">Shared Group Expenses (Auto-Settled)</h4>
                  </div>
                  <p className="text-xs text-[#5F625B] leading-relaxed">
                    Common villa/hotel stay, group road-trips/cabs, shared dining courses, grocery pool, and all-group activities. Split deterministically using chosen method (Equal, Exact, Percentage, or OCR itemized) and automatically added to the who-owes-whom ledger.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-white border border-[#DCCFBC] shadow-2xs space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0" />
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[#8C5D1E]">Personal Expenses (Zero Group Debt)</h4>
                  </div>
                  <p className="text-xs text-[#5F625B] leading-relaxed">
                    Individual souvenirs, solo room upgrades, personal shopping, and solo snacks. Flagged as <em>&quot;Personal Expense&quot;</em> during entry so they track against budget caps but never incur debt on other travelers.
                  </p>
                </div>
              </div>
            </div>

            {/* Pooled Contribution Summary Card */}
            <div className="glass-card-interactive rounded-3xl p-6 sm:p-8 shadow-sm border border-[#DCCFBC]/60 bg-[#FCF9F2]/90">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                <div>
                  <span className="text-xs uppercase font-bold text-[#8A7B68] tracking-wider">Group Budget</span>
                  <div className="font-serif text-3xl sm:text-4xl font-bold text-[#163F38] mt-1">
                    ₹{totalBudgetRs.toLocaleString("en-IN")}
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-6 text-sm">
                  <div>
                    <span className="text-xs text-[#8A7B68] block">Planned Total</span>
                    <span className="font-serif font-bold text-[#163F38]">₹{totalBudgetRs.toLocaleString("en-IN")}</span>
                  </div>
                  <div>
                    <span className="text-xs text-[#8A7B68] block">Contributed to Pool</span>
                    <span className="font-serif font-bold text-[#163F38]">
                      ₹{members.reduce((sum, m) => sum + Number(m.actualContributionMinor || 0), 0) / 100}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-[#8A7B68] block">Remaining to Pool</span>
                    <span className="font-serif font-bold text-[#C95B3D]">
                      ₹{Math.max(0, totalBudgetRs - (members.reduce((sum, m) => sum + Number(m.actualContributionMinor || 0), 0) / 100)).toLocaleString("en-IN")}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Travelers Directory Cards Grid */}
            <div className="space-y-4">
              <h3 className="font-serif text-xl font-bold text-[#163F38]">Travelers Directory ({members.length})</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {members.map((m) => {
                  const plannedRs = Number(m.plannedContributionMinor || 0) / 100;
                  const actualRs = Number(m.actualContributionMinor || 0) / 100;
                  const remainingPoolRs = plannedRs - actualRs;
                  const net = Number(m.netBalanceMinor || 0) / 100;

                  return (
                    <div
                      key={m.id}
                      className="glass-card-interactive rounded-3xl p-6 shadow-sm border border-[#DCCFBC]/60 bg-[#FCF9F2]/90 flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center gap-3 mb-4">
                          <img
                            src={
                              m.avatarUrl ||
                              "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80"
                            }
                            alt={m.name}
                            className="w-12 h-12 rounded-full object-cover border-2 border-[#163F38]/20 shadow-xs"
                          />
                          <div>
                            <h4 className="font-serif text-lg font-bold text-[#163F38]">{m.name}</h4>
                            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#EAE2CE]/70 text-[#5F625B] border border-[#DCCFBC]/50">
                              {m.role}
                            </span>
                          </div>
                        </div>

                        <div className="space-y-2 text-xs border-t border-b border-[#DCCFBC]/50 py-3 my-3">
                          <div className="flex justify-between">
                            <span className="text-[#5F625B]">Planned Contribution</span>
                            <span className="font-serif font-bold text-[#163F38]">₹{plannedRs.toLocaleString("en-IN")}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-[#5F625B]">Contributed</span>
                            <span className="font-serif font-bold text-[#163F38]">₹{actualRs.toLocaleString("en-IN")}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-[#5F625B]">Pool Remaining</span>
                            <span className="font-serif font-bold text-[#C95B3D]">
                              ₹{remainingPoolRs > 0 ? remainingPoolRs.toLocaleString("en-IN") : "0"}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="pt-2 flex items-center justify-between">
                        <span className="text-xs text-[#7A6C58]">Current Balance</span>
                        <span
                          className={`text-xs font-mono font-bold px-2.5 py-0.5 rounded-full border shadow-2xs ${
                            net > 0
                              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                              : net < 0
                              ? "bg-rose-50 text-rose-800 border-rose-200"
                              : "bg-[#EAE2CE]/60 text-[#7A6C58] border-[#DCCFBC]/50"
                          }`}
                        >
                          {net > 0 ? `+₹${net.toLocaleString("en-IN")}` : net < 0 ? `-₹${Math.abs(net).toLocaleString("en-IN")}` : "Settled"}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Deterministic UPI Debt Settlement Flow */}
            <div className="space-y-6">
              <div>
                <h3 className="font-serif text-2xl font-bold text-[#163F38]">Deterministic UPI Debt Settlement</h3>
                <p className="text-sm text-[#7A6C58] mt-1">
                  Minimal cash flow graph algorithm reducing mutual group debts to the absolute minimum direct UPI transfers.
                </p>
              </div>

              {/* Settlement Progress Card */}
              <div className="glass-card-interactive rounded-3xl p-6 sm:p-8 shadow-sm border border-[#DCCFBC]/60 bg-[#FCF9F2]/90">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                  <div>
                    <span className="text-xs uppercase font-bold text-[#8A7B68] tracking-wider">Settlement Ledger</span>
                    <div className="font-serif text-3xl font-bold text-[#163F38] mt-1">
                      {settlementPlan?.isFullySettled ? "All Debts Settled!" : "Outstanding Transfers"}
                    </div>
                  </div>

                  <div className="w-full sm:w-64 space-y-1.5">
                    <div className="flex justify-between text-xs font-bold text-[#5F625B]">
                      <span>Progress</span>
                      <span className="font-mono text-[#163F38]">{settlementPlan?.settlementProgressPercent ?? 0}%</span>
                    </div>
                    <div className="w-full bg-[#EAE2CE]/80 h-3 rounded-full overflow-hidden shadow-inner">
                      <div
                        className="bg-gradient-to-r from-[#163F38] to-[#225a50] h-full rounded-full transition-all duration-500"
                        style={{ width: `${settlementPlan?.settlementProgressPercent ?? 0}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Recommended Payments Flow */}
              <div className="glass-card-interactive rounded-3xl p-6 sm:p-8 shadow-sm border border-[#DCCFBC]/60 bg-[#FCF9F2]/90">
                <h4 className="font-serif text-xl font-bold text-[#163F38] mb-6">Recommended Payments</h4>

                {(!settlementPlan?.transactions || settlementPlan.transactions.length === 0) ? (
                  <div className="text-center py-12 text-[#7A6C58]">
                    <CheckCircle className="w-10 h-10 text-[#163F38] mx-auto mb-2" />
                    <p className="font-serif text-lg font-bold text-[#163F38]">No settlement debts outstanding</p>
                    <p className="text-xs mt-1">All members are completely even.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {settlementPlan.transactions.map((tx) => (
                      <div
                        key={tx.id}
                        className="p-5 rounded-2xl border border-[#DCCFBC]/60 bg-[#FCF9F2] hover:border-[#163F38]/40 hover:shadow-md transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#163F38] to-[#225a50] text-[#FCF9F2] flex items-center justify-center font-bold text-xs shadow-2xs">
                            {tx.fromMemberName[0]}
                          </div>
                          <div>
                            <div className="text-sm font-bold text-[#163F38] flex items-center gap-2">
                              <span>{tx.fromMemberName}</span>
                              <ArrowRight className="w-3.5 h-3.5 text-[#C95B3D]" />
                              <span>{tx.toMemberName}</span>
                            </div>
                            <span className="text-[11px] text-[#7A6C58]">
                              {tx.isPaid ? `Paid (Ref: ${tx.paymentReference || 'Direct'})` : "Pending direct transfer"}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between sm:justify-end gap-4">
                          <span className="font-serif font-bold text-xl text-[#163F38]">
                            {tx.formattedAmount}
                          </span>

                          {tx.isPaid ? (
                            <span className="px-4 py-1.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1.5 shadow-2xs">
                              <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Settled</span>
                            </span>
                          ) : (
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => setSelectedUpiTx(tx)}
                                className="bg-[#163F38] hover:bg-[#1f534a] text-white px-3.5 py-1.5 rounded-full text-xs font-bold transition-all shadow-xs hover:scale-105 active:scale-95 cursor-pointer flex items-center gap-1.5 border border-white/20"
                                title="Open Live UPI QR Code to Scan & Pay"
                              >
                                <QrCode className="w-3.5 h-3.5 text-[#C9A35B]" />
                                <span>Scan UPI QR</span>
                              </button>

                              <button
                                onClick={() => setSelectedUpiTx(tx)}
                                className="bg-gradient-to-r from-[#C95B3D] to-[#b04f30] hover:from-[#b04f30] hover:to-[#9e2a2b] text-white px-4 py-1.5 rounded-full text-xs font-bold transition-all shadow-sm hover:scale-105 active:scale-95 cursor-pointer"
                              >
                                Settle
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Closing Action Card: PDF Travel Journal Export */}
            <div className="rounded-3xl p-6 sm:p-8 border-2 border-[#163F38]/20 bg-gradient-to-r from-[#163F38] via-[#1c5c52] to-[#123630] text-white shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-6">
              <div className="space-y-1.5">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-white text-[11px] font-bold tracking-wider uppercase border border-white/20">
                  <FileText className="w-3.5 h-3.5 text-[#C9A35B]" />
                  <span>Closing Action: Trip Archival</span>
                </div>
                <h3 className="font-serif text-2xl font-bold">Export PDF Travel Journal & Settlement Summary</h3>
                <p className="text-xs text-[#EAE2CE]/80 max-w-xl leading-relaxed">
                  Generate your permanent PDF travel journal containing complete day-by-day itineraries, group member share certificates, receipt breakdown proofs, and final debt clearance signatures.
                </p>
              </div>

              <Link
                href={`/trips/${tripId}/summary`}
                className="bg-gradient-to-r from-[#C95B3D] to-[#b04f30] hover:from-[#b04f30] hover:to-[#9e2a2b] text-white px-6 py-3.5 rounded-full text-xs font-bold transition-all shadow-md hover:scale-105 active:scale-95 shrink-0 flex items-center gap-2 cursor-pointer"
              >
                <FileText className="w-4 h-4 text-white" />
                <span>Export PDF Travel Journal</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        )}
      </main>

      {/* ========================================================================= */}
      {/* MODAL: ADD EXPENSE */}
      {/* ========================================================================= */}
      {showExpenseModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#F5EFE3] border border-[#DCCFBC] rounded-3xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 sm:p-8 shadow-2xl">
            <div className="flex justify-between items-center pb-4 border-b border-[#E0D5BE] mb-6">
              <div>
                <h3 className="font-serif text-2xl font-bold text-[#163F38]">Add Trip Expense</h3>
                <p className="text-xs text-[#7A6C58] mt-0.5">Calculates integer minor-unit splits deterministically</p>
              </div>
              <button
                onClick={() => setShowExpenseModal(false)}
                className="w-8 h-8 rounded-full bg-[#EAE2CE] flex items-center justify-center text-[#5A5040] hover:text-[#163F38]"
              >
                ✕
              </button>
            </div>

            {formError && (
              <div className="mb-4 p-3 rounded-2xl bg-red-100 border border-red-300 text-red-800 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            {/* Receipt OCR Scanner Box */}
            <div className="mb-6 p-4 rounded-2xl border-2 border-dashed border-[#D5C7AD] bg-[#EFE9DC]/60 text-center">
              <label className="cursor-pointer block">
                <Upload className="w-6 h-6 mx-auto mb-1 text-[#163F38]" />
                <span className="text-xs font-bold text-[#163F38] block">Scan Receipt (OCR)</span>
                <span className="text-[10px] text-[#8A7B68] block">Supports JPG, PNG, WEBP, PDF</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                  onChange={handleReceiptUpload}
                  className="hidden"
                />
              </label>
              {ocrLoading && <p className="text-xs text-[#163F38] mt-2 font-medium animate-pulse">Scanning receipt details...</p>}
              {ocrNotice && <p className="text-xs text-[#163F38] mt-2 font-medium bg-emerald-100 p-2 rounded-xl border border-emerald-300">{ocrNotice}</p>}
            </div>

            <form onSubmit={handleCreateExpense} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#5A5040] uppercase tracking-wider mb-1">
                  Description / Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Seafood Shack Dinner, Villa Deposit"
                  value={newExpenseTitle}
                  onChange={(e) => setNewExpenseTitle(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-[#D5C7AD] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#163F38]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-1">
                  <label className="block text-xs font-bold text-[#5A5040] uppercase tracking-wider mb-1">
                    Currency *
                  </label>
                  <select
                    value={newExpenseCurrency}
                    onChange={(e) => setNewExpenseCurrency(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-[#D5C7AD] bg-white text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#163F38]"
                  >
                    <option value="INR">INR (₹)</option>
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="GBP">GBP (£)</option>
                    <option value="AED">AED (AED)</option>
                    <option value="SGD">SGD (S$)</option>
                    <option value="THB">THB (฿)</option>
                    <option value="JPY">JPY (¥)</option>
                  </select>
                </div>

                <div className="sm:col-span-1">
                  <label className="block text-xs font-bold text-[#5A5040] uppercase tracking-wider mb-1">
                    Amount ({newExpenseCurrency}) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder={newExpenseCurrency === "USD" ? "120" : "3000"}
                    value={newExpenseAmount}
                    onChange={(e) => setNewExpenseAmount(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-[#D5C7AD] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#163F38]"
                  />
                </div>

                <div className="sm:col-span-1">
                  <label className="block text-xs font-bold text-[#5A5040] uppercase tracking-wider mb-1">
                    Category *
                  </label>
                  <select
                    value={newExpenseCategory}
                    onChange={(e) => setNewExpenseCategory(e.target.value as any)}
                    className="w-full px-3 py-2.5 rounded-xl border border-[#D5C7AD] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#163F38]"
                  >
                    <option value="FOOD">Food & Dining</option>
                    <option value="STAY">Stay & Lodging</option>
                    <option value="TRANSPORT">Transit & Travel</option>
                    <option value="ACTIVITIES">Activities & Tours</option>
                    <option value="LOCAL_TRAVEL">Local Travel</option>
                    <option value="SHOPPING">Shopping</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
              </div>

              {/* Live FX conversion callout if foreign currency selected */}
              {newExpenseCurrency.toUpperCase() !== (trip?.currency || "INR").toUpperCase() && parseFloat(newExpenseAmount || "0") > 0 && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold uppercase text-[10px] bg-amber-200/80 px-2 py-0.5 rounded">FX Rate</span>
                    <span>
                      {newExpenseCurrency} {parseFloat(newExpenseAmount).toFixed(2)} converts to home currency ({trip?.currency || "INR"}) via live fx_rates
                    </span>
                  </div>
                  <span className="font-mono font-bold text-sm text-[#163F38]">
                    {newExpenseCurrency === "USD"
                      ? `~₹${(parseFloat(newExpenseAmount) * 86.55).toFixed(2)}`
                      : newExpenseCurrency === "EUR"
                      ? `~₹${(parseFloat(newExpenseAmount) * 93.40).toFixed(2)}`
                      : "Live fx rate applied"}
                  </span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-[#5A5040] uppercase tracking-wider mb-1">
                  Payer *
                </label>
                <select
                  value={newExpensePayer}
                  onChange={(e) => setNewExpensePayer(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-[#D5C7AD] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#163F38]"
                >
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.role})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#5A5040] uppercase tracking-wider mb-1">
                  Split Method
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {(["EQUAL", "PERCENTAGE", "EXACT", "CUSTOM"] as const).map((method) => (
                    <button
                      type="button"
                      key={method}
                      onClick={() => setNewExpenseSplitMethod(method)}
                      className={`py-2 rounded-xl text-xs font-bold transition-all ${
                        newExpenseSplitMethod === method
                          ? "bg-[#163F38] text-[#F5EFE3] shadow"
                          : "bg-[#EAE2CE] text-[#5A5040] hover:bg-[#E0D5BE]"
                      }`}
                    >
                      {method}
                    </button>
                  ))}
                </div>
              </div>

              {/* Dynamic split participant inputs if EQUAL (subset selector) or custom/exact/percentage */}
              {newExpenseSplitMethod === "EQUAL" && (
                <div className="p-4 rounded-2xl bg-[#EFE9DC] border border-[#D5C7AD] space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#5A5040] uppercase tracking-wider">
                      Split Between ({equalParticipants.length} of {members.length}):
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setEqualParticipants(members.map((m) => m.id))}
                        className="text-[11px] font-bold text-[#163F38] hover:underline"
                      >
                        All
                      </button>
                      <span className="text-xs text-[#8A7B68]">•</span>
                      <button
                        type="button"
                        onClick={() => setEqualParticipants([])}
                        className="text-[11px] font-bold text-[#C95B3D] hover:underline"
                      >
                        Clear
                      </button>
                    </div>
                  </div>

                  {parseFloat(newExpenseAmount || "0") > 0 && equalParticipants.length > 0 && (
                    <div className="text-xs font-semibold text-[#163F38] bg-[#E3D9C3] px-3 py-1.5 rounded-xl flex items-center justify-between">
                      <span>Per Person Share:</span>
                      <span className="font-serif font-bold text-sm">
                        ₹{(parseFloat(newExpenseAmount) / equalParticipants.length).toFixed(2)}
                      </span>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    {members.map((m) => {
                      const isSelected = equalParticipants.includes(m.id);
                      return (
                        <button
                          type="button"
                          key={m.id}
                          onClick={() => {
                            if (isSelected) {
                              setEqualParticipants(equalParticipants.filter((id) => id !== m.id));
                            } else {
                              setEqualParticipants([...equalParticipants, m.id]);
                            }
                          }}
                          className={`p-2.5 rounded-xl border text-left text-xs font-semibold transition-all flex items-center justify-between ${
                            isSelected
                              ? "bg-[#163F38] text-[#F5EFE3] border-[#0C2A25] shadow-xs"
                              : "bg-white text-[#7A6C58] border-[#D5C7AD] hover:bg-[#F5EFE3]"
                          }`}
                        >
                          <span className="truncate">{m.name}</span>
                          <div
                            className={`w-3.5 h-3.5 rounded-full flex items-center justify-center border ${
                              isSelected
                                ? "bg-[#38E54D] border-[#38E54D]"
                                : "border-[#C4B79D]"
                            }`}
                          >
                            {isSelected && <Check className="w-2.5 h-2.5 text-[#163F38]" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {newExpenseSplitMethod !== "EQUAL" && (
                <div className="p-4 rounded-2xl bg-[#EFE9DC] border border-[#D5C7AD] space-y-2">
                  <span className="text-xs font-bold text-[#5A5040] block mb-2">
                    {newExpenseSplitMethod === "PERCENTAGE"
                      ? "Enter Percentage per Traveler (must sum to 100%):"
                      : "Enter Exact Amount per Traveler (must sum to total):"}
                  </span>
                  {members.map((m) => (
                    <div key={m.id} className="flex items-center justify-between gap-4 text-xs">
                      <span className="font-semibold text-[#163F38]">{m.name}</span>
                      <input
                        type="number"
                        placeholder={newExpenseSplitMethod === "PERCENTAGE" ? "33.3" : "1000"}
                        value={customShares[m.id] || ""}
                        onChange={(e) =>
                          setCustomShares({ ...customShares, [m.id]: e.target.value })
                        }
                        className="w-24 px-2 py-1 rounded-lg border border-[#D5C7AD] bg-white text-right"
                      />
                    </div>
                  ))}
                </div>
              )}

              <div className="pt-4 border-t border-[#E0D5BE] flex items-center justify-between">
                <label className="flex items-center gap-2 text-xs font-medium text-[#5A5040]">
                  <input
                    type="checkbox"
                    checked={newExpenseIsPersonal}
                    onChange={(e) => setNewExpenseIsPersonal(e.target.checked)}
                    className="rounded text-[#163F38] focus:ring-[#163F38]"
                  />
                  <span>Personal expense (exclude from group settlement)</span>
                </label>

                <button
                  type="submit"
                  className="bg-[#163F38] hover:bg-[#1f534a] text-[#F5EFE3] px-6 py-2.5 rounded-full text-xs font-bold transition-all shadow"
                >
                  Record Expense
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: INVITE MEMBER (QR CODE + SHARING) */}
      {/* ========================================================================= */}
      {trip && (
        <TripInviteModal
          isOpen={showInviteModal}
          onClose={() => setShowInviteModal(false)}
          tripId={tripId}
          tripTitle={trip.title}
          destination={trip.destination}
          membersCount={members.length}
          currency={trip.currency || "INR"}
          onManualInvite={async (name, email, role, plannedAmount) => {
            const plannedMinor = BigInt(Math.round(Number(plannedAmount || 10000) * 100)).toString();
            const res = await fetch(`/api/trips/${tripId}/members`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                name,
                email: email || undefined,
                role,
                plannedContributionMinor: plannedMinor,
              }),
            });
            const data = await res.json();
            if (data.success) {
              refreshWorkspaceSilently();
            }
          }}
        />
      )}

      {/* ========================================================================= */}
      {/* MODAL: LIVE UPI PAYMENT QR CODE & SETTLEMENT */}
      {/* ========================================================================= */}
      {(selectedUpiTx || showPayModal) && (
        <UPISettlementModal
          isOpen={Boolean(selectedUpiTx || showPayModal)}
          onClose={() => {
            setSelectedUpiTx(null);
            setShowPayModal(null);
          }}
          tx={selectedUpiTx || showPayModal}
          tripTitle={trip?.title}
          recipientEmail={members.find((m) => m.id === (selectedUpiTx || showPayModal)?.toMemberId)?.email}
          onConfirmSettled={handleMarkPaidFromUpi}
        />
      )}

      {/* Floating One-Tap Actualize Success Toast */}
      {actualizeToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#163F38] text-white px-5 py-3.5 rounded-2xl shadow-2xl border border-white/20 flex items-center gap-3 animate-in fade-in slide-in-from-bottom-5">
          <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
            <Zap className="w-4 h-4 text-[#C9A35B]" />
          </div>
          <div>
            <div className="text-xs font-bold text-white flex items-center gap-1.5">
              <span>Actualized to Shared Ledger</span>
              <span className="text-[#C9A35B]">({actualizeToast.amount})</span>
            </div>
            <div className="text-[11px] text-white/80 truncate max-w-xs">
              {actualizeToast.title}
            </div>
          </div>
        </div>
      )}
      {/* ========================================================================= */}
      {/* UNIFIED SMART BILL DOCK (OCR + NLP CONVERSATIONAL SPLIT) */}
      {/* ========================================================================= */}
      {showSmartBillDock && trip && (
        <SmartBillDock
          isOpen={showSmartBillDock}
          onClose={() => {
            setShowSmartBillDock(false);
            setScannedReceipt(null);
          }}
          tripId={tripId}
          tripTitle={trip.title}
          destination={trip.destination}
          currency={trip.currency || "INR"}
          members={members}
          initialReceiptData={scannedReceipt}
          onExpenseRecorded={() => {
            refreshWorkspaceSilently();
          }}
        />
      )}

      {/* ========================================================================= */}
      {/* MODAL: ITEMIZED BILL CLAIM & SPLIT (OCR) */}
      {/* ========================================================================= */}
      {showItemizedClaimModal && scannedReceipt && (
        <ItemizedClaimModal
          isOpen={showItemizedClaimModal}
          onClose={() => {
            setShowItemizedClaimModal(false);
            setScannedReceipt(null);
          }}
          tripId={tripId}
          members={members}
          receiptData={scannedReceipt}
          onSuccess={() => {
            refreshWorkspaceSilently();
          }}
          onSwitchToChat={() => {
            setShowItemizedClaimModal(false);
            setShowSmartBillDock(true);
          }}
        />
      )}

      {/* ========================================================================= */}
      {/* MODAL: CONVERSATIONAL AI BILL SPLIT & EXPENSE CHAT (NLP) */}
      {/* ========================================================================= */}
      {showExpenseChatModal && trip && (
        <ExpenseSplitChatModal
          isOpen={showExpenseChatModal}
          onClose={() => setShowExpenseChatModal(false)}
          tripId={tripId}
          tripTitle={trip.title}
          destination={trip.destination}
          currency={trip.currency || "INR"}
          members={members}
          initialReceiptData={scannedReceipt}
          onExpenseRecorded={() => {
            refreshWorkspaceSilently();
          }}
        />
      )}

      {/* ========================================================================= */}
      {/* PERSISTENT CONTEXTUAL AI ASSISTANT (HYBRID SIDE PANEL) */}
      {/* ========================================================================= */}
      {trip && (
        <>
          <ContextualTripAIPanel
            isOpen={showAIPanel}
            onClose={() => setShowAIPanel(false)}
            tripId={tripId}
            tripTitle={trip.title}
            destination={trip.destination}
            currency={trip.currency || "INR"}
            activeTab={activeMode}
            members={members}
            onExpenseRecorded={() => {
              refreshWorkspaceSilently();
            }}
            onNavigateTab={(t) => navigateToTab(t)}
          />

          {!showAIPanel && (
            <button
              onClick={() => setShowAIPanel(true)}
              className="fixed bottom-6 right-6 z-40 bg-[#1E1A17] hover:bg-[#E85D04] text-white px-5 py-3 rounded-full shadow-2xl flex items-center gap-2.5 font-bold text-xs hover:scale-105 active:scale-95 transition-all border border-[#E5D8C5]/30 cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-[#F48C06]" />
              <span>AI Companion</span>
              <span className="text-[10px] bg-white/15 px-2.5 py-0.5 rounded-full uppercase tracking-wider font-semibold">
                {activeMode}
              </span>
            </button>
          )}
        </>
      )}
    </div>
  );
}
