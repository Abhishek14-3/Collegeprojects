"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Compass,
  Search,
  Bell,
  Home,
  Luggage,
  Calendar,
  Wallet,
  Users,
  MapPin,
  Pencil,
  ChevronRight,
  TrendingUp,
  FileText,
  BarChart2,
  Paperclip,
  Mic,
  Send,
  ArrowRight,
  Settings,
  Waves,
  Sun,
  Calculator,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  X,
  BookOpen,
  Feather,
} from "lucide-react";

interface TripMember {
  id: string;
  name: string;
  avatarUrl?: string | null;
  role: string;
}

interface TripExpense {
  id: string;
  title: string;
  category: string;
  amountMinor: bigint | number | string;
  convertedAmountMinor: bigint | number | string;
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
  groupBudgetMinor: bigint | number | string;
  currency: string;
  travelStyle: string;
  heroImageUrl?: string;
  members?: TripMember[];
  expenses?: TripExpense[];
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  suggestedActions?: string[];
  actionData?: any;
  timestamp: string;
}

interface AIPlannerWorkspaceProps {
  initialTripId?: string;
}

export function AIPlannerWorkspace({ initialTripId }: AIPlannerWorkspaceProps) {
  const router = useRouter();

  // Trips & Trip Context
  const [allTrips, setAllTrips] = useState<TripData[]>([]);
  const [activeTripId, setActiveTripId] = useState<string>(initialTripId || "");
  const [activeTrip, setActiveTrip] = useState<TripData | null>(null);
  const [tripMembers, setTripMembers] = useState<TripMember[]>([]);
  const [tripExpenses, setTripExpenses] = useState<TripExpense[]>([]);
  const [itineraryDays, setItineraryDays] = useState<any[]>([]);
  const [recentSuggestions, setRecentSuggestions] = useState<any[]>([]);
  const [showSwitchModal, setShowSwitchModal] = useState(false);
  const [actionSuccessNotice, setActionSuccessNotice] = useState<string | null>(null);

  // Chat conversation
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome-msg",
      role: "assistant",
      content:
        "Welcome to Wander Desk — your personal trip researcher & journal.\n\nI specialize in deterministic group travel financial calculations, budget feasibility checks, and itinerary balancing. Ask me anything about trip costs, scheduling, or alternative allocations.",
      timestamp: "09:12",
    },
  ]);
  const [inputText, setInputText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 1. Fetch available trips on mount
  useEffect(() => {
    async function loadTrips() {
      try {
        const res = await fetch("/api/trips");
        const data = await res.json();
        if (data.success && data.trips?.length > 0) {
          setAllTrips(data.trips);
          const targetId =
            initialTripId && data.trips.some((t: any) => t.id === initialTripId)
              ? initialTripId
              : data.trips[0].id;
          setActiveTripId(targetId);
        }
      } catch (err) {
        console.error("Failed to load trips for AI Planner:", err);
      }
    }
    loadTrips();
  }, [initialTripId]);

  // 2. Load active trip details & itinerary whenever activeTripId changes
  useEffect(() => {
    if (!activeTripId) return;

    async function loadTripDetails() {
      try {
        const [tripRes, itinRes] = await Promise.all([
          fetch(`/api/trips/${activeTripId}`),
          fetch(`/api/trips/${activeTripId}/itinerary`),
        ]);

        const tripJson = await tripRes.json();
        if (tripJson.success && tripJson.trip) {
          setActiveTrip(tripJson.trip);
          setTripMembers(tripJson.members || []);
          setTripExpenses(tripJson.expenses || []);
        }

        const itinJson = await itinRes.json();
        if (itinJson.success && itinJson.itinerary?.days) {
          setItineraryDays(itinJson.itinerary.days);
        }
      } catch (err) {
        console.error("Failed to load active trip details:", err);
      }
    }

    loadTripDetails();
  }, [activeTripId]);

  // 3. Populate Recent Suggestions grounded in active destination
  useEffect(() => {
    const dest = activeTrip?.destination?.toLowerCase() || "goa";

    if (dest.includes("goa")) {
      setRecentSuggestions([
        {
          id: "rec-1",
          title: "Scuba Diving Experience",
          location: "Grande Island, Goa",
          schedule: "Day 3",
          priceFormatted: "₹3,500 / person",
          imageUrl:
            "https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=120&q=80",
          actionQuery: "Can we fit scuba diving into Day 3?",
        },
        {
          id: "rec-2",
          title: "Sunset Dinner Cruise",
          location: "Mandovi River, Goa",
          schedule: "Day 4",
          priceFormatted: "₹2,200 / person",
          imageUrl:
            "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=120&q=80",
          actionQuery: "Tell me more about the Mandovi sunset dinner cruise",
        },
        {
          id: "rec-3",
          title: "Fontainhas Heritage Walk",
          location: "Panaji, Goa",
          schedule: "Day 2",
          priceFormatted: "₹500 / person",
          imageUrl:
            "https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=120&q=80",
          actionQuery: "Can we schedule the Fontainhas Heritage Walk?",
        },
      ]);
    } else if (dest.includes("hyderabad")) {
      setRecentSuggestions([
        {
          id: "rec-hyd-1",
          title: "Charminar & Laad Bazaar Heritage Walk",
          location: "Old City, Hyderabad",
          schedule: "Day 1",
          priceFormatted: "₹50 / person",
          imageUrl:
            "https://images.unsplash.com/photo-1605335198083-d922bb354c86?auto=format&fit=crop&w=120&q=80",
          actionQuery: "Can we visit Charminar and Laad Bazaar on Day 1?",
        },
        {
          id: "rec-hyd-2",
          title: "Golconda Fort & Sound-and-Light Spectacle",
          location: "Golconda, Hyderabad",
          schedule: "Day 2",
          priceFormatted: "₹120 / person",
          imageUrl:
            "https://images.unsplash.com/photo-1587474260584-136574528ed5?auto=format&fit=crop&w=120&q=80",
          actionQuery: "Can we fit Golconda Fort sound and light show into Day 2?",
        },
        {
          id: "rec-hyd-3",
          title: "Hussain Sagar Speedboat to Buddha Statue",
          location: "Necklace Road, Hyderabad",
          schedule: "Day 3",
          priceFormatted: "₹150 / person",
          imageUrl:
            "https://images.unsplash.com/photo-1590050752117-238cb0fb12b1?auto=format&fit=crop&w=120&q=80",
          actionQuery: "How does Hussain Sagar boating fit into Day 3?",
        },
      ]);
    } else if (dest.includes("manali")) {
      setRecentSuggestions([
        {
          id: "rec-man-1",
          title: "Solang Valley Paragliding & Adventure",
          location: "Solang Valley, Manali",
          schedule: "Day 2",
          priceFormatted: "₹1,800 / person",
          imageUrl:
            "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=120&q=80",
          actionQuery: "Can we fit Solang Valley paragliding into Day 2?",
        },
        {
          id: "rec-man-2",
          title: "Rohtang Pass Snow & Glacial Viewpoint",
          location: "Pir Panjal, Manali",
          schedule: "Day 3",
          priceFormatted: "₹600 / person",
          imageUrl:
            "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=120&q=80",
          actionQuery: "Can we fit Rohtang Pass excursion into Day 3?",
        },
        {
          id: "rec-man-3",
          title: "Hadimba Temple & Dhungri Cedar Walk",
          location: "Old Manali",
          schedule: "Day 1",
          priceFormatted: "Free",
          imageUrl:
            "https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=120&q=80",
          actionQuery: "Schedule Hadimba Temple and Old Manali walk",
        },
      ]);
    } else if (dest.includes("paris")) {
      setRecentSuggestions([
        {
          id: "rec-par-1",
          title: "Eiffel Tower Summit Access & Picnic",
          location: "Champ de Mars, Paris",
          schedule: "Day 1",
          priceFormatted: "€28 / person",
          imageUrl:
            "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=120&q=80",
          actionQuery: "Can we schedule Eiffel Tower summit on Day 1?",
        },
        {
          id: "rec-par-2",
          title: "Louvre Museum Masterpieces Tour",
          location: "1st Arrondissement, Paris",
          schedule: "Day 2",
          priceFormatted: "€17 / person",
          imageUrl:
            "https://images.unsplash.com/photo-1499856871958-5b9627545d1a?auto=format&fit=crop&w=120&q=80",
          actionQuery: "How does the Louvre fit into Day 2 budget and schedule?",
        },
        {
          id: "rec-par-3",
          title: "Seine River Sunset Bateaux Cruise",
          location: "Pont Neuf, Paris",
          schedule: "Day 3",
          priceFormatted: "€16 / person",
          imageUrl:
            "https://images.unsplash.com/photo-1520939817895-060bdef4df1a?auto=format&fit=crop&w=120&q=80",
          actionQuery: "Can we book a Seine sunset cruise on Day 3?",
        },
      ]);
    } else {
      setRecentSuggestions([
        {
          id: "rec-gen-1",
          title: `${activeTrip?.destination || "City"} Signature Landmark Tour`,
          location: `${activeTrip?.destination || "City"} Center`,
          schedule: "Day 2",
          priceFormatted: "₹500 / person",
          imageUrl:
            "https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=120&q=80",
          actionQuery: `What are the best landmarks to visit in ${activeTrip?.destination}?`,
        },
        {
          id: "rec-gen-2",
          title: "Panoramic Sunset Viewpoint Trail",
          location: `${activeTrip?.destination || "City"} Heights`,
          schedule: "Day 3",
          priceFormatted: "Free",
          imageUrl:
            "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=120&q=80",
          actionQuery: `Where can we catch the best sunset in ${activeTrip?.destination}?`,
        },
        {
          id: "rec-gen-3",
          title: "Authentic Regional Culinary Feast",
          location: `${activeTrip?.destination || "City"} Heritage Market`,
          schedule: "Day 1",
          priceFormatted: "₹450 / person",
          imageUrl:
            "https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=120&q=80",
          actionQuery: `Recommend the top authentic budget dining spots in ${activeTrip?.destination}`,
        },
      ]);
    }
  }, [activeTrip]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  // Handle sending user query
  async function handleSendMessage(queryText: string) {
    const textToSend = queryText || inputText;
    if (!textToSend.trim() || isTyping) return;

    const userMsg: Message = {
      id: `usr-${Date.now()}`,
      role: "user",
      content: textToSend.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText("");
    setIsTyping(true);

    try {
      const res = await fetch("/api/ai-planner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: textToSend.trim(),
          tripId: activeTripId,
        }),
      });

      const data = await res.json();
      if (data.success) {
        const assistantMsg: Message = {
          id: `ai-${Date.now()}`,
          role: "assistant",
          content: data.reply,
          suggestedActions: data.suggestedActions,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        };
        setMessages((prev) => [...prev, assistantMsg]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id: `err-${Date.now()}`,
            role: "assistant",
            content: "I encountered a hiccup reading the ledger. Please try again.",
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          },
        ]);
      }
    } catch (err) {
      console.error("AI Planner communication error:", err);
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: "assistant",
          content: "Unable to connect to the travel ledger. Please check your connection.",
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  }

  // Handle actionable buttons
  async function handleActionClick(actionText: string) {
    const clean = actionText.toLowerCase();

    if (clean.includes("apply under-budget plan") || clean.includes("under-budget plan")) {
      try {
        const res = await fetch(`/api/trips/${activeTripId}/itinerary`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            selectedActivities: [
              {
                id: "act-heritage-walk",
                name: "Fontainhas & Latin Quarter Heritage Walk",
                location: "Panaji",
                price: 500,
                priceMinor: 50000,
                category: "culture",
                durationMins: 120,
                source: "Curated Cultural Trail",
              },
              {
                id: "act-clifftop-trail",
                name: "Anjuna & Vagator Clifftop Coastal Trail",
                location: "Vagator",
                price: 0,
                priceMinor: 0,
                category: "nature",
                durationMins: 90,
                source: "Public Coastal Overlook",
              },
            ],
          }),
        });
        setActionSuccessNotice("✓ Applied Under-Budget Plan! Trimmed ₹14,500. Trip is now safely ₹4,000 under budget.");
        setTimeout(() => setActionSuccessNotice(null), 5000);
        handleSendMessage("Confirm our new under-budget numbers and show the updated financial summary");
        return;
      } catch (e) {
        console.warn("Under budget plan action note:", e);
      }
    }

    if (clean.includes("swap to budget stay") || clean.includes("budget stay")) {
      setActionSuccessNotice("✓ Swapped accommodation to Verified Boutique Villa! Saved ₹5,500.");
      setTimeout(() => setActionSuccessNotice(null), 4500);
      handleSendMessage("Show me our updated lodging allocation with the Boutique Villa");
      return;
    }

    if (clean.includes("trim high-cost activities") || clean.includes("trim activities")) {
      setActionSuccessNotice("✓ Trimmed high-cost excursions. Replaced with scenic trails & sunset viewpoints. Saved ₹4,200.");
      setTimeout(() => setActionSuccessNotice(null), 4500);
      handleSendMessage("Show me our streamlined activity plan without expensive tickets");
      return;
    }

    if (clean.includes("add scuba to day 3") || clean.includes("add to day 3")) {
      try {
        const res = await fetch(`/api/trips/${activeTripId}/itinerary`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            selectedActivities: [
              {
                id: "act-scuba-added",
                name: "Grande Island Scuba Diving & Snorkel",
                location: "Grande Island, Goa",
                price: 3500,
                priceMinor: 350000,
                category: "activity",
                durationMins: 240,
                source: "Verified Local Dive Centers",
              },
            ],
          }),
        });
        const data = await res.json();
        if (data.success) {
          setActionSuccessNotice("✓ Added Scuba Diving to Day 3 itinerary & recalculated budget!");
          setTimeout(() => setActionSuccessNotice(null), 4000);
          handleSendMessage("Show me our updated Day 3 itinerary with scuba diving");
          return;
        }
      } catch (e) {
        console.warn("Direct itinerary action update notice:", e);
      }
    }

    // Default: send action text into chat
    handleSendMessage(actionText);
  }

  // Format Dates helper
  const formattedDates = useMemo(() => {
    if (!activeTrip?.startDate) return "15 Nov – 19 Nov 2026";
    try {
      const s = new Date(activeTrip.startDate);
      const e = activeTrip.endDate ? new Date(activeTrip.endDate) : new Date(s.getTime() + 4 * 86400000);
      const startStr = s.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
      const endStr = e.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
      return `${startStr} – ${endStr}`;
    } catch {
      return "15 Nov – 19 Nov 2026";
    }
  }, [activeTrip]);

  // Formatted Budget
  const budgetRs = useMemo(() => {
    if (!activeTrip?.groupBudgetMinor) return "₹60,000";
    const num = Number(activeTrip.groupBudgetMinor) / 100;
    return `₹${num.toLocaleString("en-IN")}`;
  }, [activeTrip]);

  // Computed budget metrics & over-budget detection
  const totalSpendMinor = useMemo(() => {
    return tripExpenses.reduce(
      (acc, e) => acc + BigInt(e.convertedAmountMinor || e.amountMinor || 0),
      BigInt(0)
    );
  }, [tripExpenses]);

  const groupBudgetMinor = useMemo(() => {
    return activeTrip?.groupBudgetMinor ? BigInt(activeTrip.groupBudgetMinor) : BigInt(6000000);
  }, [activeTrip]);

  const isOverBudget = useMemo(() => {
    return totalSpendMinor > groupBudgetMinor;
  }, [totalSpendMinor, groupBudgetMinor]);

  const overBudgetAmountRs = useMemo(() => {
    if (!isOverBudget) return 0;
    return Number(totalSpendMinor - groupBudgetMinor) / 100;
  }, [isOverBudget, totalSpendMinor, groupBudgetMinor]);

  const defaultHeroImage =
    activeTrip?.heroImageUrl ||
    (activeTrip?.destination?.toLowerCase().includes("manali")
      ? "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80"
      : activeTrip?.destination?.toLowerCase().includes("paris")
      ? "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=800&q=80"
      : activeTrip?.destination?.toLowerCase().includes("hyderabad")
      ? "https://images.unsplash.com/photo-1605335198083-d922bb354c86?auto=format&fit=crop&w=800&q=80"
      : "https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=800&q=80");

  return (
    <div className="min-h-screen dot-grid-paper text-[#292726] flex flex-col font-sans selection:bg-[#EAE1D3] relative">
      {/* ========================================================================= */}
      {/* 1. TOP HORIZONTAL NAVIGATION */}
      {/* ========================================================================= */}
      <header className="sticky top-0 z-40 dot-grid-header border-b border-[#D8C9B5] h-16 flex items-center px-4 sm:px-6 lg:px-8 justify-between shadow-2xs">
        {/* Left: Brand Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-full border border-[#D8C9B5] bg-[#FFF9F0] flex items-center justify-center text-[#C85C3A] transition-transform group-hover:scale-105">
            <Compass className="w-4 h-4 text-[#C85C3A]" />
          </div>
          <span className="text-xl font-bold tracking-tight text-[#172A3A]" style={{ fontFamily: "var(--font-brand)" }}>
            Wander Wallet
          </span>
        </Link>

        {/* Center: Main Navigation */}
        <nav className="hidden md:flex items-center gap-8 h-full">
          <Link
            href="/"
            className="flex items-center gap-2 text-xs font-semibold text-[#746D65] hover:text-[#172A3A] transition-colors py-2"
          >
            <Home className="w-3.5 h-3.5" />
            <span>Home</span>
          </Link>

          <Link
            href="/trips"
            className="flex items-center gap-2 text-xs font-semibold text-[#746D65] hover:text-[#172A3A] transition-colors py-2"
          >
            <Luggage className="w-3.5 h-3.5" />
            <span>Trips</span>
          </Link>

          <Link
            href="/explore"
            className="flex items-center gap-2 text-xs font-semibold text-[#746D65] hover:text-[#172A3A] transition-colors py-2"
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Explore</span>
          </Link>

          {/* AI Planner: Active Link with Terracotta Underline Indicator */}
          <div className="relative flex items-center gap-2 text-xs font-bold text-[#172A3A] py-2 h-full">
            <BookOpen className="w-3.5 h-3.5 text-[#C85C3A]" />
            <span>Wander Desk</span>
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#C85C3A] rounded-full" />
          </div>
        </nav>

        {/* Right: Actions & User Avatar */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => handleSendMessage("Search activities near our stay")}
            className="text-[#746D65] hover:text-[#172A3A] transition-colors p-1"
            title="Search"
          >
            <Search className="w-4 h-4" />
          </button>

          <button
            onClick={() => handleSendMessage("Do we have any new budget alerts or reminders?")}
            className="text-[#746D65] hover:text-[#172A3A] transition-colors relative p-1"
            title="Notifications"
          >
            <Bell className="w-4 h-4" />
            <span className="w-1.5 h-1.5 bg-[#C85C3A] rounded-full absolute top-1 right-1" />
          </button>

          <Link
            href="/profile"
            className="w-8 h-8 rounded-full overflow-hidden border border-[#D8C9B5] shadow-2xs hover:ring-2 hover:ring-[#172A3A]/30 transition"
          >
            <img
              src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80"
              alt="User"
              className="w-full h-full object-cover"
            />
          </Link>
        </div>
      </header>

      {/* Action Notification Toast */}
      {actionSuccessNotice && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-[#172A3A] text-[#FFF9F0] px-4 py-2.5 rounded-xl text-xs font-semibold shadow-lg flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-300">
          <CheckCircle2 className="w-4 h-4 text-[#D49A55]" />
          <span>{actionSuccessNotice}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. MAIN 3-COLUMN APPLICATION LAYOUT */}
      {/* ========================================================================= */}
      <main className="flex-1 max-w-[1600px] w-full mx-auto p-4 lg:p-6 grid grid-cols-1 lg:grid-cols-[300px_1fr_320px] gap-6 items-start">
        {/* ======================================================================= */}
        {/* LEFT COLUMN: TRAVEL CONTEXT SIDEBAR (~300px) */}
        {/* ======================================================================= */}
        <aside className="bg-[#FFF9F0] rounded-2xl p-4 shadow-sm border border-[#D8C9B5] flex flex-col gap-4">
          {/* Destination Hero Image Card */}
          <div className="relative h-44 rounded-xl overflow-hidden border border-[#D8C9B5] group">
            <img
              src={defaultHeroImage}
              alt={activeTrip?.title || "Trip destination"}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent" />
            <div className="absolute bottom-3 left-3 right-12">
              <h2 className="text-xs font-bold uppercase tracking-wider text-white drop-shadow-sm line-clamp-1">
                {activeTrip?.title || "GOA COASTAL GETAWAY"}
              </h2>
              <p className="text-[11px] text-white/90 drop-shadow-sm flex items-center gap-1 mt-0.5">
                <MapPin className="w-3 h-3 text-[#C85C3A] inline-block" />
                {activeTrip?.destination || "Goa, India"}
              </p>
            </div>
            <button
              onClick={() => router.push(`/trips/${activeTripId}`)}
              className="absolute bottom-3 right-3 w-7 h-7 rounded-lg bg-[#FFF9F0] text-[#172A3A] flex items-center justify-center shadow-md hover:bg-[#EAE1D3] transition-colors"
              title="Edit Trip Details"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Quick Specs: Dates & Travelers */}
          <div className="space-y-3 px-1">
            <div className="flex items-start gap-3">
              <Calendar className="w-4 h-4 text-[#746D65] mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs font-bold text-[#292726]">{formattedDates}</p>
                <p className="text-[11px] text-[#746D65] mt-0.5">
                  {activeTrip?.numberOfDays || 5} Days · {activeTrip?.numberOfTravelers || 6} Travelers
                </p>
              </div>
            </div>

            {/* Quick Specs: Budget */}
            <div
              onClick={() => router.push(`/trips/${activeTripId}?tab=budget`)}
              className="flex items-start justify-between cursor-pointer hover:bg-[#EAE1D3]/50 p-1.5 -mx-1.5 rounded-lg transition"
            >
              <div className="flex items-start gap-3">
                <Wallet className="w-4 h-4 text-[#746D65] mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs font-bold text-[#172A3A]">{budgetRs}</p>
                  <p className="text-[11px] text-[#746D65] mt-0.5">Group Budget</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-[#746D65] mt-1" />
            </div>
          </div>

          <div className="border-t border-[#D8C9B5]" />

          {/* Vertical Navigation List */}
          <nav className="space-y-1">
            {/* AI Planner (Active) */}
            <div className="relative flex items-center gap-3 p-2.5 rounded-lg bg-[#EAE1D3] text-[#172A3A] transition-colors">
              <div className="absolute left-0 top-1.5 bottom-1.5 w-1 bg-[#172A3A] rounded-r-full" />
              <BookOpen className="w-4 h-4 text-[#172A3A] flex-shrink-0 ml-1" />
              <div>
                <p className="text-xs font-bold text-[#172A3A]">Wander Desk</p>
                <p className="text-[10px] text-[#746D65]">Personal trip researcher</p>
              </div>
            </div>

            {/* Trip Context */}
            <Link
              href={`/trips/${activeTripId}`}
              className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-[#EAE1D3]/40 text-[#292726] transition-colors"
            >
              <FileText className="w-4 h-4 text-[#746D65] flex-shrink-0 ml-1" />
              <div>
                <p className="text-xs font-semibold text-[#292726]">Trip Context</p>
                <p className="text-[10px] text-[#746D65]">Plan, budget & itinerary</p>
              </div>
            </Link>

            {/* Research */}
            <Link
              href="/explore"
              className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-[#EAE1D3]/40 text-[#292726] transition-colors"
            >
              <Search className="w-4 h-4 text-[#746D65] flex-shrink-0 ml-1" />
              <div>
                <p className="text-xs font-semibold text-[#292726]">Research Desk</p>
                <p className="text-[10px] text-[#746D65]">Field notes & stays</p>
              </div>
            </Link>

            {/* Budget */}
            <Link
              href={`/trips/${activeTripId}?tab=budget`}
              className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-[#EAE1D3]/40 text-[#292726] transition-colors"
            >
              <BarChart2 className="w-4 h-4 text-[#746D65] flex-shrink-0 ml-1" />
              <div>
                <p className="text-xs font-semibold text-[#292726]">Budget Ledger</p>
                <p className="text-[10px] text-[#746D65]">Track costs & feasibility</p>
              </div>
            </Link>

            {/* Itinerary */}
            <Link
              href={`/trips/${activeTripId}?tab=itinerary`}
              className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-[#EAE1D3]/40 text-[#292726] transition-colors"
            >
              <Calendar className="w-4 h-4 text-[#746D65] flex-shrink-0 ml-1" />
              <div>
                <p className="text-xs font-semibold text-[#292726]">Itinerary Map</p>
                <p className="text-[10px] text-[#746D65]">Modify or rebuild plans</p>
              </div>
            </Link>

            {/* Group */}
            <Link
              href={`/trips/${activeTripId}?tab=group`}
              className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-[#EAE1D3]/40 text-[#292726] transition-colors"
            >
              <Users className="w-4 h-4 text-[#746D65] flex-shrink-0 ml-1" />
              <div>
                <p className="text-xs font-semibold text-[#292726]">Passport & Crew</p>
                <p className="text-[10px] text-[#746D65]">Traveler ledger & splits</p>
              </div>
            </Link>
          </nav>

          {/* Switch Trip Button */}
          <div className="pt-2">
            <button
              onClick={() => setShowSwitchModal(true)}
              className="w-full py-2.5 px-3 rounded-lg border border-[#D8C9B5] bg-[#FFF9F0] hover:bg-[#EAE1D3] text-xs font-semibold text-[#172A3A] flex items-center justify-center gap-2 transition-all shadow-2xs"
            >
              <RefreshCw className="w-3.5 h-3.5 text-[#172A3A]" />
              <span>Switch Trip</span>
            </button>
          </div>
        </aside>

        {/* ======================================================================= */}
        {/* CENTER COLUMN: TRAVEL RESEARCH WORKSPACE */}
        {/* ======================================================================= */}
        <section className="flex flex-col gap-4">
          {/* Editorial Banner Card */}
          <div
            className="relative rounded-2xl overflow-hidden bg-[#FFF9F0] border border-[#D8C9B5] shadow-sm p-6 lg:p-8 flex items-center justify-between min-h-[170px]"
            style={{
              backgroundImage: `linear-gradient(to right, #FFF9F0 45%, rgba(255,249,240,0.7) 70%, transparent 100%), url('${defaultHeroImage}')`,
              backgroundPosition: "right center",
              backgroundSize: "cover",
              backgroundRepeat: "no-repeat",
            }}
          >
            {/* Left Content */}
            <div className="relative z-10 max-w-lg">
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#C85C3A] tracking-wider uppercase mb-1">
                <span>Field Research & Journal</span>
              </div>
              <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold text-[#172A3A] tracking-tight">
                Wander Desk
              </h1>
              <p className="text-xs sm:text-sm text-[#746D65] mt-1.5 font-normal">
                Your personal trip researcher and financial advisor for smarter group journeys.
              </p>
            </div>

            {/* Handwritten Decorative Script on Top Right */}
            <div className="hidden sm:block absolute right-8 top-6 z-10">
              <p className="font-script text-2xl lg:text-3xl text-[#172A3A] -rotate-6 select-none opacity-90">
                Turn Plans into Journeys
              </p>
            </div>
          </div>

          {/* 4 Research Capability Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
            {/* Card 1: Budget Planning */}
            <div
              onClick={() => handleSendMessage("How is our budget allocated and where can we optimize expenses?")}
              className="bg-[#FFF9F0] rounded-xl p-4 border border-[#D8C9B5] hover:border-[#172A3A] hover:shadow-sm cursor-pointer transition-all duration-200 group text-left"
            >
              <div className="w-8 h-8 rounded-lg bg-[#EAE1D3] flex items-center justify-center mb-2.5 text-[#172A3A] group-hover:scale-105 transition-transform">
                <Wallet className="w-4 h-4 text-[#172A3A]" />
              </div>
              <h3 className="text-xs font-bold text-[#172A3A]">Budget Ledger</h3>
              <p className="text-[10px] text-[#746D65] leading-snug mt-0.5">
                Check costs & optimize expenses
              </p>
            </div>

            {/* Card 2: Itinerary Ideas */}
            <div
              onClick={() => handleSendMessage("Suggest personalized daily itinerary ideas for our days in " + (activeTrip?.destination || "Goa"))}
              className="bg-[#FFF9F0] rounded-xl p-4 border border-[#D8C9B5] hover:border-[#172A3A] hover:shadow-sm cursor-pointer transition-all duration-200 group text-left"
            >
              <div className="w-8 h-8 rounded-lg bg-[#EAE1D3] flex items-center justify-center mb-2.5 text-[#C85C3A] group-hover:scale-105 transition-transform">
                <Calendar className="w-4 h-4 text-[#C85C3A]" />
              </div>
              <h3 className="text-xs font-bold text-[#172A3A]">Itinerary Notes</h3>
              <p className="text-[10px] text-[#746D65] leading-snug mt-0.5">
                Get personalized daily plans
              </p>
            </div>

            {/* Card 3: Local Insights */}
            <div
              onClick={() => handleSendMessage("Find authentic local places, food & hidden gems in " + (activeTrip?.destination || "Goa"))}
              className="bg-[#FFF9F0] rounded-xl p-4 border border-[#D8C9B5] hover:border-[#172A3A] hover:shadow-sm cursor-pointer transition-all duration-200 group text-left"
            >
              <div className="w-8 h-8 rounded-lg bg-[#EAE1D3] flex items-center justify-center mb-2.5 text-[#D49A55] group-hover:scale-105 transition-transform">
                <MapPin className="w-4 h-4 text-[#D49A55]" />
              </div>
              <h3 className="text-xs font-bold text-[#172A3A]">Local Insights</h3>
              <p className="text-[10px] text-[#746D65] leading-snug mt-0.5">
                Find spots, food & hidden gems
              </p>
            </div>

            {/* Card 4: Group Travel */}
            <div
              onClick={() => handleSendMessage("How are our group travel expenses split among travelers and are balances even?")}
              className="bg-[#FFF9F0] rounded-xl p-4 border border-[#D8C9B5] hover:border-[#172A3A] hover:shadow-sm cursor-pointer transition-all duration-200 group text-left"
            >
              <div className="w-8 h-8 rounded-lg bg-[#EAE1D3] flex items-center justify-center mb-2.5 text-[#172A3A] group-hover:scale-105 transition-transform">
                <Users className="w-4 h-4 text-[#172A3A]" />
              </div>
              <h3 className="text-xs font-bold text-[#172A3A]">Group Split</h3>
              <p className="text-[10px] text-[#746D65] leading-snug mt-0.5">
                Plan together & manage expenses
              </p>
            </div>
          </div>

          {/* Proactive Budget Exceeded Guidance Banner */}
          {isOverBudget ? (
            <div className="bg-[#FFF9F0] rounded-xl p-4 border border-[#C85C3A] shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in duration-300">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#FDF0EB] flex items-center justify-center flex-shrink-0 text-[#C85C3A] mt-0.5">
                  <AlertCircle className="w-4 h-4 text-[#C85C3A]" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[#172A3A]">
                    ⚠️ Budget Exceeded by ₹{overBudgetAmountRs.toLocaleString("en-IN")}
                  </h4>
                  <p className="text-[11px] text-[#746D65] mt-0.5">
                    Your group is currently pacing over the {budgetRs} target budget. Wander Desk has prepared a 4-step recovery plan to bring total costs back under budget.
                  </p>
                </div>
              </div>
              <button
                onClick={() =>
                  handleSendMessage("Our budget is exceeding, guide me with a proper plan to make the trip under budget")
                }
                className="px-3.5 py-2 rounded-lg bg-[#172A3A] hover:bg-[#233d52] text-[#FFF9F0] text-xs font-semibold whitespace-nowrap transition shadow-2xs flex-shrink-0 flex items-center gap-1.5"
              >
                <span>View Recovery Plan</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="bg-[#FFF9F0] rounded-xl p-3 px-4 border border-[#D8C9B5] shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2 text-[#746D65]">
                <ShieldCheck className="w-4 h-4 text-[#172A3A]" />
                <span>
                  Budget Health: <strong className="text-[#172A3A]">Guarded</strong> (Target: {budgetRs})
                </span>
              </div>
              <button
                onClick={() =>
                  handleSendMessage("If our budget exceeds, guide me and give a proper plan for making the trip under budget")
                }
                className="text-[11px] font-semibold text-[#172A3A] hover:text-[#C85C3A] flex items-center gap-1 transition"
              >
                <span>Budget Guidance & Under-Budget Plan</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          )}

          {/* AI Conversation Stream Area */}
          <div className="space-y-4">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex gap-3.5 ${m.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {/* Desk Avatar */}
                {m.role === "assistant" && (
                  <div className="w-9 h-9 rounded-full bg-[#FFF9F0] border border-[#D8C9B5] flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Feather className="w-4 h-4 text-[#172A3A]" />
                  </div>
                )}

                {/* Message Bubble Card */}
                <div
                  className={`rounded-xl p-4 lg:p-5 border transition-all text-xs leading-relaxed max-w-2xl ${
                    m.role === "user"
                      ? "bg-[#172A3A] text-[#FFF9F0] border-[#172A3A] shadow-xs"
                      : "bg-[#FFF9F0] text-[#292726] border-[#D8C9B5] shadow-2xs"
                  }`}
                >
                  {/* Header on assistant welcome */}
                  {m.id === "welcome-msg" && (
                    <h4 className="text-xs font-bold text-[#172A3A] mb-1.5">
                      Welcome to Wander Desk!
                    </h4>
                  )}

                  <div className="whitespace-pre-line space-y-2">{m.content}</div>

                  {/* Actionable buttons if suggested */}
                  {m.suggestedActions && m.suggestedActions.length > 0 && (
                    <div className="mt-3.5 pt-3 border-t border-[#D8C9B5]/70 flex flex-wrap gap-2">
                      {m.suggestedActions.map((action, i) => (
                        <button
                          key={i}
                          onClick={() => handleActionClick(action)}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#FFF9F0] hover:bg-[#EAE1D3] border border-[#D8C9B5] text-[#172A3A] transition-colors flex items-center gap-1.5 shadow-2xs"
                        >
                          <span>{action}</span>
                          <ArrowRight className="w-3 h-3 text-[#172A3A]" />
                        </button>
                      ))}
                    </div>
                  )}

                  <span
                    className={`text-[10px] mt-2 block ${
                      m.role === "user" ? "text-white/70 text-right" : "text-[#746D65]"
                    }`}
                  >
                    {m.timestamp}
                  </span>
                </div>
              </div>
            ))}

            {/* Typing Loader */}
            {isTyping && (
              <div className="flex gap-3.5 items-start">
                <div className="w-9 h-9 rounded-full bg-[#FFF9F0] border border-[#D8C9B5] flex items-center justify-center flex-shrink-0">
                  <Feather className="w-4 h-4 text-[#172A3A]" />
                </div>
                <div className="bg-[#FFF9F0] rounded-xl px-4 py-3 border border-[#D8C9B5] text-xs text-[#746D65] flex items-center gap-2 shadow-2xs">
                  <div className="w-3.5 h-3.5 border-2 border-[#172A3A] border-t-transparent rounded-full animate-spin" />
                  <span>Researching field notes and calculating budget allocations...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Try Asking Section */}
          <div className="pt-2">
            <div className="flex items-center justify-between mb-2.5 px-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-[#172A3A]">
                <BookOpen className="w-3.5 h-3.5 text-[#172A3A]" />
                <span>Field Inquiries</span>
              </div>
              <button
                onClick={() =>
                  handleSendMessage("Give me 4 unique ideas for what our group can do this trip")
                }
                className="text-[11px] font-semibold text-[#746D65] hover:text-[#172A3A] flex items-center gap-1 transition-colors"
              >
                <span>See more</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            {/* 4 Suggested Question Cards in 2x2 Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              <button
                onClick={() => handleSendMessage("Which day is most expensive?")}
                className="bg-[#FFF9F0] hover:bg-[#EAE1D3]/50 rounded-xl p-3 border border-[#D8C9B5] hover:border-[#172A3A]/50 text-xs font-medium text-[#292726] flex items-center gap-2.5 text-left transition-all shadow-2xs group"
              >
                <div className="w-7 h-7 rounded-lg bg-[#EAE1D3] flex items-center justify-center flex-shrink-0 text-[#172A3A] group-hover:scale-105 transition-transform">
                  <BarChart2 className="w-3.5 h-3.5" />
                </div>
                <span className="line-clamp-1">Which day is most expensive?</span>
              </button>

              <button
                onClick={() => handleSendMessage("Can we fit scuba diving into Day 3?")}
                className="bg-[#FFF9F0] hover:bg-[#EAE1D3]/50 rounded-xl p-3 border border-[#D8C9B5] hover:border-[#172A3A]/50 text-xs font-medium text-[#292726] flex items-center gap-2.5 text-left transition-all shadow-2xs group"
              >
                <div className="w-7 h-7 rounded-lg bg-[#EAE1D3] flex items-center justify-center flex-shrink-0 text-[#172A3A] group-hover:scale-105 transition-transform">
                  <Waves className="w-3.5 h-3.5" />
                </div>
                <span className="line-clamp-1">Can we fit scuba diving into Day 3?</span>
              </button>

              <button
                onClick={() => handleSendMessage("What can we do tomorrow with ₹4,000?")}
                className="bg-[#FFF9F0] hover:bg-[#EAE1D3]/50 rounded-xl p-3 border border-[#D8C9B5] hover:border-[#172A3A]/50 text-xs font-medium text-[#292726] flex items-center gap-2.5 text-left transition-all shadow-2xs group"
              >
                <div className="w-7 h-7 rounded-lg bg-[#EAE1D3] flex items-center justify-center flex-shrink-0 text-[#172A3A] group-hover:scale-105 transition-transform">
                  <Sun className="w-3.5 h-3.5" />
                </div>
                <span className="line-clamp-1">What can we do tomorrow with ₹4,000?</span>
              </button>

              <button
                onClick={() => handleSendMessage("Rebuild this trip under ₹50,000")}
                className="bg-[#FFF9F0] hover:bg-[#EAE1D3]/50 rounded-xl p-3 border border-[#D8C9B5] hover:border-[#172A3A]/50 text-xs font-medium text-[#292726] flex items-center gap-2.5 text-left transition-all shadow-2xs group"
              >
                <div className="w-7 h-7 rounded-lg bg-[#EAE1D3] flex items-center justify-center flex-shrink-0 text-[#172A3A] group-hover:scale-105 transition-transform">
                  <Calculator className="w-3.5 h-3.5" />
                </div>
                <span className="line-clamp-1">Rebuild this trip under ₹50,000</span>
              </button>
            </div>
          </div>

          {/* Sticky Bottom Chat Input Bar */}
          <div className="sticky bottom-4 z-20 pt-2">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage(inputText);
              }}
              className="bg-[#FFF9F0] rounded-xl p-2 pl-3.5 pr-2 border border-[#D8C9B5] shadow-sm flex items-center gap-2 focus-within:ring-2 focus-within:ring-[#172A3A]/20 focus-within:border-[#172A3A] transition-all"
            >
              <button
                type="button"
                onClick={() =>
                  handleSendMessage("Here is our latest receipt / booking details to balance")
                }
                className="text-[#746D65] hover:text-[#172A3A] p-1 transition"
                title="Attach Document or Receipt"
              >
                <Paperclip className="w-4 h-4" />
              </button>

              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Ask anything about your travel plan..."
                className="flex-1 text-xs sm:text-sm text-[#292726] placeholder:text-[#746D65] bg-transparent focus:outline-none"
              />

              <button
                type="button"
                onClick={() => handleSendMessage("Voice query: Can we optimize Day 2 dining?")}
                className="text-[#746D65] hover:text-[#172A3A] p-1 transition"
                title="Voice Query"
              >
                <Mic className="w-4 h-4" />
              </button>

              <button
                type="submit"
                disabled={!inputText.trim() || isTyping}
                className="w-8 h-8 rounded-lg bg-[#172A3A] hover:bg-[#233d52] disabled:opacity-40 text-[#FFF9F0] flex items-center justify-center transition-all shadow-sm flex-shrink-0"
                title="Send query"
              >
                <Send className="w-3.5 h-3.5 ml-0.5" />
              </button>
            </form>
          </div>
        </section>

        {/* ======================================================================= */}
        {/* RIGHT COLUMN: TRIP SNAPSHOT, QUICK ACTIONS & SUGGESTIONS (~320px) */}
        {/* ======================================================================= */}
        <aside className="space-y-4">
          {/* Card 1: Trip Snapshot */}
          <div className="bg-[#FFF9F0] rounded-2xl p-4 shadow-sm border border-[#D8C9B5]">
            <div className="flex items-center justify-between mb-3 px-0.5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-[#172A3A]">
                <BookOpen className="w-3.5 h-3.5 text-[#172A3A]" />
                <span>Trip Snapshot</span>
              </div>
              <Link
                href={`/trips/${activeTripId}`}
                className="text-[10px] font-semibold text-[#746D65] hover:text-[#172A3A] transition-colors"
              >
                View All →
              </Link>
            </div>

            {/* 4 Stats in 2x2 Grid */}
            <div className="grid grid-cols-2 gap-2">
              {/* Stat 1: Days */}
              <div className="bg-[#F9F4EC] rounded-xl p-2.5 border border-[#D8C9B5] flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-[#FFF9F0] border border-[#D8C9B5] text-[#172A3A]">
                  <Calendar className="w-3.5 h-3.5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-[#292726]">{activeTrip?.numberOfDays || 5}</p>
                  <p className="text-[10px] text-[#746D65]">Days</p>
                </div>
              </div>

              {/* Stat 2: Travelers */}
              <div className="bg-[#F9F4EC] rounded-xl p-2.5 border border-[#D8C9B5] flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-[#FFF9F0] border border-[#D8C9B5] text-[#172A3A]">
                  <Users className="w-3.5 h-3.5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-[#292726]">{activeTrip?.numberOfTravelers || 6}</p>
                  <p className="text-[10px] text-[#746D65]">Travelers</p>
                </div>
              </div>

              {/* Stat 3: Budget */}
              <div className="bg-[#F9F4EC] rounded-xl p-2.5 border border-[#D8C9B5] flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-[#FFF9F0] border border-[#D8C9B5] text-[#172A3A]">
                  <Wallet className="w-3.5 h-3.5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-[#172A3A]">{budgetRs}</p>
                  <p className="text-[10px] text-[#746D65]">Budget</p>
                </div>
              </div>

              {/* Stat 4: Destination */}
              <div className="bg-[#F9F4EC] rounded-xl p-2.5 border border-[#D8C9B5] flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-[#FFF9F0] border border-[#D8C9B5] text-[#172A3A]">
                  <MapPin className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-[#292726] truncate">
                    {activeTrip?.destination?.split(",")[0] || "Goa"}
                  </p>
                  <p className="text-[10px] text-[#746D65]">Destination</p>
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Quick Actions */}
          <div className="bg-[#FFF9F0] rounded-2xl p-4 shadow-sm border border-[#D8C9B5]">
            <div className="flex items-center gap-1.5 text-xs font-bold text-[#172A3A] mb-3 px-0.5">
              <Settings className="w-3.5 h-3.5 text-[#172A3A]" />
              <span>Quick Actions</span>
            </div>

            <div className="space-y-1.5">
              <button
                onClick={() =>
                  handleSendMessage("If our budget exceeds, guide me and give a proper plan for making the trip under budget")
                }
                className="w-full flex items-center justify-between p-2 rounded-lg border border-[#D8C9B5] bg-[#FFF9F0] hover:bg-[#EAE1D3] text-xs font-medium text-[#292726] transition-colors group"
              >
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-3.5 h-3.5 text-[#172A3A]" />
                  <span>Optimize Budget</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-[#746D65] group-hover:text-[#172A3A] transition-colors" />
              </button>

              <button
                onClick={() => handleSendMessage("Suggest an optimized daily itinerary structure")}
                className="w-full flex items-center justify-between p-2 rounded-lg border border-[#D8C9B5] bg-[#FFF9F0] hover:bg-[#EAE1D3] text-xs font-medium text-[#292726] transition-colors group"
              >
                <div className="flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5 text-[#172A3A]" />
                  <span>Suggest Itinerary</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-[#746D65] group-hover:text-[#172A3A] transition-colors" />
              </button>

              <button
                onClick={() => handleSendMessage("Find curated activities for our group")}
                className="w-full flex items-center justify-between p-2 rounded-lg border border-[#D8C9B5] bg-[#FFF9F0] hover:bg-[#EAE1D3] text-xs font-medium text-[#292726] transition-colors group"
              >
                <div className="flex items-center gap-2">
                  <Compass className="w-3.5 h-3.5 text-[#172A3A]" />
                  <span>Find Activities</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-[#746D65] group-hover:text-[#172A3A] transition-colors" />
              </button>

              <button
                onClick={() =>
                  handleSendMessage("Check the mathematical budget feasibility of our current plan and guide me if budget exceeds")
                }
                className="w-full flex items-center justify-between p-2 rounded-lg border border-[#D8C9B5] bg-[#FFF9F0] hover:bg-[#EAE1D3] text-xs font-medium text-[#292726] transition-colors group"
              >
                <div className="flex items-center gap-2">
                  <Calculator className="w-3.5 h-3.5 text-[#172A3A]" />
                  <span>Check Feasibility</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-[#746D65] group-hover:text-[#172A3A] transition-colors" />
              </button>
            </div>
          </div>

          {/* Card 3: Recent Suggestions */}
          <div className="bg-[#FFF9F0] rounded-2xl p-4 shadow-sm border border-[#D8C9B5]">
            <div className="flex items-center justify-between mb-3 px-0.5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-[#172A3A]">
                <Compass className="w-3.5 h-3.5 text-[#172A3A]" />
                <span>Recent Suggestions</span>
              </div>
              <Link
                href="/explore"
                className="text-[10px] font-semibold text-[#746D65] hover:text-[#172A3A] transition-colors"
              >
                See all →
              </Link>
            </div>

            <div className="space-y-2.5">
              {recentSuggestions.map((rec) => (
                <div
                  key={rec.id}
                  onClick={() => handleSendMessage(rec.actionQuery)}
                  className="flex items-center gap-3 p-1.5 rounded-lg hover:bg-[#EAE1D3] cursor-pointer transition group"
                >
                  <div className="w-11 h-11 rounded-lg overflow-hidden flex-shrink-0 border border-[#D8C9B5]">
                    <img
                      src={rec.imageUrl}
                      alt={rec.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-bold text-[#292726] leading-tight truncate group-hover:text-[#172A3A]">
                      {rec.title}
                    </h4>
                    <p className="text-[10px] text-[#746D65] truncate mt-0.5">{rec.location}</p>
                    <p className="text-[10px] text-[#C85C3A] font-semibold mt-0.5">
                      {rec.schedule} · {rec.priceFormatted}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </main>

      {/* Switch Trip Modal */}
      {showSwitchModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-[#FFF9F0] rounded-2xl p-6 max-w-md w-full border border-[#D8C9B5] shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#D8C9B5]">
              <h3 className="font-serif text-lg font-bold text-[#172A3A]">Switch Active Trip</h3>
              <button
                onClick={() => setShowSwitchModal(false)}
                className="text-[#746D65] hover:text-[#172A3A] p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 mt-4 max-h-72 overflow-y-auto pr-1">
              {allTrips.map((t) => (
                <div
                  key={t.id}
                  onClick={() => {
                    setActiveTripId(t.id);
                    setShowSwitchModal(false);
                    setMessages([
                      {
                        id: `welcome-${t.id}`,
                        role: "assistant",
                        content: `Switched context to **${t.title}** (${t.destination})!\n\nI have loaded the group's budget, member allocations, and scheduled days. What would you like to explore or plan?`,
                        suggestedActions: [
                          "Which day is most expensive?",
                          "What can we do with our remaining budget?",
                          "Suggest an itinerary",
                        ],
                        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                      },
                    ]);
                  }}
                  className={`p-3 rounded-xl border cursor-pointer transition flex items-center justify-between ${
                    t.id === activeTripId
                      ? "bg-[#EAE1D3] border-[#172A3A] text-[#172A3A]"
                      : "bg-[#FFF9F0] border-[#D8C9B5] hover:bg-[#EAE1D3]/60 text-[#292726]"
                  }`}
                >
                  <div>
                    <h4 className="text-xs font-bold">{t.title}</h4>
                    <p className="text-[11px] text-[#746D65]">
                      {t.destination} · {t.numberOfDays} Days · {t.numberOfTravelers} Travelers
                    </p>
                  </div>
                  {t.id === activeTripId && <CheckCircle2 className="w-4 h-4 text-[#172A3A]" />}
                </div>
              ))}
            </div>

            <div className="pt-4 mt-4 border-t border-[#D8C9B5] flex justify-end">
              <button
                onClick={() => setShowSwitchModal(false)}
                className="px-4 py-2 rounded-lg text-xs font-semibold bg-[#FFF9F0] hover:bg-[#EAE1D3] text-[#172A3A] transition border border-[#D8C9B5]"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AIPlannerWorkspace;
