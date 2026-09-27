"use client";

import React, { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Calendar,
  MapPin,
  Users,
  Compass,
  Check,
  ChevronRight,
  ArrowRight,
  ArrowLeft,
  AlertTriangle,
  Sparkles,
  Bed,
  Bus,
  Plane,
  Train,
  Car,
  Filter,
  Star,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Share2,
  Download,
  Loader2,
  FolderOpen,
  RotateCcw,
  Moon,
  Search,
  Pencil,
  X,
  User,
  Heart,
  Coins,
  Shield,
  Map as MapIcon,
  Backpack,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { NumberStepper } from "@/components/ui/NumberStepper";
import { Badge, StampBadge } from "@/components/ui/Badge";
import { EditorialCard, PolaroidCard } from "@/components/ui/EditorialCard";
import { BudgetDonutChart } from "@/components/charts/BudgetDonutChart";
import { DayTimeline } from "@/components/itinerary/DayTimeline";
import { TripMap } from "@/components/maps/TripMap";
import {
  formatCurrency,
  toMinorUnits,
  allocateBudget,
  checkBudgetFeasibility,
  DEFAULT_BUDGET_RATIOS,
  CATEGORY_LABELS,
  CategoryAllocation,
} from "@/lib/budget/engine";
import { generateItinerary, GeneratedItinerary, GeneratedItineraryItem } from "@/lib/itinerary/engine";
import {
  TransportOptionItem,
  AccommodationOptionItem,
  ActivityOptionItem,
} from "@/lib/providers";

export default function PlanTripFlowPage() {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);

  // Workflow Stages:
  // 1: Trip Details -> 2: Research Options -> 3: Budget Reality & Allocation -> 4: Day-by-Day Itinerary
  const [currentStage, setCurrentStage] = useState<number>(1);

  // Form State
  const [destination, setDestination] = useState("");
  const [startingLocation, setStartingLocation] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [travelers, setTravelers] = useState(1);
  const [currency, setCurrency] = useState<string>("INR");
  const [groupBudgetNumber, setGroupBudgetNumber] = useState<number | "">(60000);
  const [travelStyle, setTravelStyle] = useState("BALANCED");
  const [selectedPopularDest, setSelectedPopularDest] = useState<string>("Bali");
  const [showSavedModal, setShowSavedModal] = useState(false);
  const [savedTrips, setSavedTrips] = useState<any[]>([]);

  // Currency Symbol helper
  const currencySymbol = useMemo(() => {
    switch (currency) {
      case "USD":
        return "$";
      case "EUR":
        return "€";
      case "GBP":
        return "£";
      case "THB":
        return "฿";
      case "JPY":
        return "¥";
      case "AED":
        return "AED ";
      default:
        return "₹";
    }
  }, [currency]);

  // Load user currency preference and saved trips on mount
  useEffect(() => {
    // 1. Instant check from localStorage
    const localCurr = typeof window !== "undefined" ? localStorage.getItem("wander_user_currency") : null;
    if (localCurr) {
      setCurrency(localCurr);
      if (["USD", "EUR", "GBP"].includes(localCurr)) {
        setGroupBudgetNumber(1500);
      }
    }

    // 2. Fetch user profile preferences from server
    fetch("/api/user/profile")
      .then((res) => res.json())
      .then((data) => {
        if (data.profile?.currencyPreference) {
          const pref = data.profile.currencyPreference;
          setCurrency(pref);
          if (["USD", "EUR", "GBP"].includes(pref) && (groupBudgetNumber === 60000 || !groupBudgetNumber)) {
            setGroupBudgetNumber(1500);
          }
        }
        if (data.profile?.travelStyle) {
          setTravelStyle(data.profile.travelStyle);
        }
        if (data.profile?.homeCity && !startingLocation) {
          setStartingLocation(data.profile.homeCity.split(",")[0]);
        }
      })
      .catch((e) => console.warn("Profile fetch note:", e));

    // 3. Fetch existing saved trips
    fetch("/api/trips")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.trips) {
          setSavedTrips(data.trips);
        }
      })
      .catch((e) => console.warn("Saved trips fetch note:", e));
  }, []);

  // Exchange rate for foreign currency conversion in research desk
  const [exchangeRate, setExchangeRate] = useState<number>(1.0);

  useEffect(() => {
    if (currency.toUpperCase() === "INR") {
      setExchangeRate(1.0);
      return;
    }
    fetch(`/api/currency/rates?from=INR&to=${currency.toUpperCase()}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.rate && typeof data.rate === "number") {
          setExchangeRate(data.rate);
        }
      })
      .catch((err) => console.warn("Exchange rate fetch in research:", err));
  }, [currency]);

  // Format currency dynamically with live exchange rate conversion for research cards
  const formatDynamicCost = (
    amountMinor: bigint | number | null | undefined,
    fallbackText?: string
  ): string => {
    if (amountMinor == null) {
      if (fallbackText) {
        const numMatch = fallbackText.match(/\d[0-9,]*/);
        if (numMatch && currency.toUpperCase() !== "INR") {
          const rawNum = Number(numMatch[0].replace(/,/g, ""));
          const converted = Math.round(rawNum * exchangeRate);
          return formatCurrency(BigInt(converted * 100), currency);
        }
        return fallbackText;
      }
      return formatCurrency(BigInt(0), currency);
    }

    const minorNum = typeof amountMinor === "bigint" ? Number(amountMinor) : Number(amountMinor);
    if (currency.toUpperCase() === "INR") {
      return formatCurrency(amountMinor, "INR");
    }

    const convertedMinor = BigInt(Math.round(minorNum * exchangeRate));
    return formatCurrency(convertedMinor, currency);
  };

  // Compute number of days
  const numberOfDays = useMemo(() => {
    if (!startDate || !endDate) return 0;
    const s = new Date(startDate);
    const e = new Date(endDate);
    const diff = Math.ceil((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 1;
  }, [startDate, endDate]);

  const groupBudgetMinor = useMemo(() => {
    const defaultBudget = ["USD", "EUR", "GBP"].includes(currency) ? 1500 : 60000;
    const num = typeof groupBudgetNumber === "number" ? groupBudgetNumber : defaultBudget;
    return toMinorUnits(num);
  }, [groupBudgetNumber, currency]);

  // Handle Popular Destination Pick
  const handleSelectPopular = (dest: string) => {
    setSelectedPopularDest(dest);
    setDestination(dest);
    if (!startingLocation) {
      setStartingLocation("Bengaluru");
    }
    if (!startDate) {
      const today = new Date();
      const nextMonth = new Date(today.getTime() + 30 * 86400000);
      const endDays = new Date(nextMonth.getTime() + 5 * 86400000);
      setStartDate(nextMonth.toISOString().split("T")[0]);
      setEndDate(endDays.toISOString().split("T")[0]);
    }
  };

  // Handle Load from Saved Trip
  const handleLoadSavedTrip = (t: any) => {
    setDestination(t.destination || t.title);
    setStartingLocation(t.startingLocation || "Bengaluru");
    if (t.startDate) setStartDate(new Date(t.startDate).toISOString().split("T")[0]);
    if (t.endDate) setEndDate(new Date(t.endDate).toISOString().split("T")[0]);
    if (t.numberOfTravelers) setTravelers(t.numberOfTravelers);
    if (t.groupBudgetMinor) setGroupBudgetNumber(Number(t.groupBudgetMinor) / 100);
    if (t.travelStyle) setTravelStyle(t.travelStyle);
    setShowSavedModal(false);
  };

  // Reset Form
  const handleResetForm = () => {
    setDestination("");
    setStartingLocation("");
    setStartDate("");
    setEndDate("");
    setTravelers(1);
    setGroupBudgetNumber(60000);
    setTravelStyle("BALANCED");
    setSelectedPopularDest("");
  };

  // Research Selections
  const [selectedTransportId, setSelectedTransportId] = useState<string>("tr-tr-1");
  const [selectedStayId, setSelectedStayId] = useState<string>("stay-1");
  const [selectedActivityIds, setSelectedActivityIds] = useState<string[]>([
    "act-2",
    "act-4",
  ]);

  // Selected Day in Itinerary Stage
  const [selectedDayNumber, setSelectedDayNumber] = useState<number>(1);

  // Budget Allocation Ratios State
  const [categoryRatios, setCategoryRatios] = useState<Record<string, number>>(DEFAULT_BUDGET_RATIOS);

  // Research Options loaded from Travel Engine
  const [transportOptions, setTransportOptions] = useState<TransportOptionItem[]>([]);
  const [stayOptions, setStayOptions] = useState<AccommodationOptionItem[]>([]);
  const [activityOptions, setActivityOptions] = useState<ActivityOptionItem[]>([]);
  const [isResearchLoading, setIsResearchLoading] = useState(false);

  // Normalizers for JSON data from API
  const normalizeTransport = (item: any): TransportOptionItem => ({
    ...item,
    priceMinor: item.priceMinor != null ? BigInt(item.priceMinor) : null,
    totalCostMinor: item.totalCostMinor != null ? BigInt(item.totalCostMinor) : null,
    perPersonCostMinor: item.perPersonCostMinor != null ? BigInt(item.perPersonCostMinor) : null,
  });

  const normalizeStay = (item: any): AccommodationOptionItem => ({
    ...item,
    priceMinor: item.priceMinor != null ? BigInt(item.priceMinor) : null,
    pricePerNightMinor: item.pricePerNightMinor != null ? BigInt(item.pricePerNightMinor) : null,
    totalStayCostMinor: item.totalStayCostMinor != null ? BigInt(item.totalStayCostMinor) : null,
  });

  const normalizeActivity = (item: any): ActivityOptionItem => ({
    ...item,
    priceMinor: item.priceMinor != null ? BigInt(item.priceMinor) : null,
    pricePerPersonMinor: item.pricePerPersonMinor != null ? BigInt(item.pricePerPersonMinor) : null,
    totalGroupCostMinor: item.totalGroupCostMinor != null ? BigInt(item.totalGroupCostMinor) : null,
  });

  // Proceed to Research
  const handleProceedToResearch = async () => {
    const destToUse = destination.trim() || selectedPopularDest || "Goa, India";
    const startLocToUse = startingLocation.trim() || "Bengaluru";
    const sDate = startDate || new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0];
    const eDate = endDate || new Date(Date.now() + 35 * 86400000).toISOString().split("T")[0];

    setDestination(destToUse);
    setStartingLocation(startLocToUse);
    setStartDate(sDate);
    setEndDate(eDate);

    setIsResearchLoading(true);
    setCurrentStage(2);

    try {
      const res = await fetch("/api/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          origin: startLocToUse,
          destination: destToUse,
          departureDate: sDate,
          returnDate: eDate,
          travelerCount: travelers || 1,
          travelStyle,
          interests: ["Sightseeing", "Adventure", "Culture", "Food"],
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const transports: TransportOptionItem[] = (data.transport || []).map(normalizeTransport);
        const stays: AccommodationOptionItem[] = (data.stays || data.accommodation || []).map(normalizeStay);
        const activities: ActivityOptionItem[] = (data.activities || []).map(normalizeActivity);

        setTransportOptions(transports);
        setStayOptions(stays);
        setActivityOptions(activities);
        if (transports[0]) setSelectedTransportId(transports[0].id);
        if (stays[0]) setSelectedStayId(stays[0].id);
        if (activities.length > 0) {
          setSelectedActivityIds(activities.slice(0, 2).map((a) => a.id));
        }
      }
    } catch (err) {
      console.error("Research API fetch error:", err);
    } finally {
      setIsResearchLoading(false);
    }
  };

  // Save Trip handler
  const handleSaveTrip = async () => {
    setIsSaving(true);
    try {
      const cleanCity = (destination || "Trip").split(",")[0].trim();
      const res = await fetch("/api/trips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: `${cleanCity} Vacation Plan`,
          destination: destination || "Goa, India",
          startingLocation: startingLocation || "Bengaluru",
          startDate: startDate || new Date().toISOString().split("T")[0],
          endDate: endDate || new Date(Date.now() + 5 * 86400000).toISOString().split("T")[0],
          numberOfDays: numberOfDays || 5,
          numberOfTravelers: travelers || 1,
          groupBudgetMinor: groupBudgetMinor.toString(),
          currency: currency || "INR",
          categoryCaps: categoryAllocations.reduce((acc, cat) => {
            acc[cat.category] = cat.allocatedMinor.toString();
            return acc;
          }, {} as Record<string, string>),
          alertThresholdPct: 80,
          travelStyle,
          interests: ["Sightseeing", "Food", "Culture"],
        }),
      });
      const data = await res.json();
      if (data.success && data.trip?.id) {
        router.push(`/trips/${data.trip.id}`);
      } else {
        router.push("/trips");
      }
    } catch (e) {
      console.error("Save error:", e);
      router.push("/trips");
    } finally {
      setIsSaving(false);
    }
  };

  const [activityCategoryFilter, setActivityCategoryFilter] = useState<string>("All");

  // Selected Option Objects
  const selectedTransport = useMemo(
    () => transportOptions.find((t) => t.id === selectedTransportId),
    [transportOptions, selectedTransportId]
  );

  const selectedStay = useMemo(
    () => stayOptions.find((s) => s.id === selectedStayId),
    [stayOptions, selectedStayId]
  );

  const selectedActivities = useMemo(
    () => activityOptions.filter((a) => selectedActivityIds.includes(a.id)),
    [activityOptions, selectedActivityIds]
  );

  const selectedActivitiesCostMinor = useMemo(() => {
    return selectedActivities.reduce(
      (sum, a) => sum + (a.totalGroupCostMinor ?? BigInt(0)),
      BigInt(0)
    );
  }, [selectedActivities]);

  // Filtered Activities by selected category
  const filteredActivities = useMemo(() => {
    if (activityCategoryFilter === "All") return activityOptions;
    return activityOptions.filter((a) => {
      const cat = `${a.activityCategory || ""} ${a.name} ${a.description || ""}`.toLowerCase();
      const filter = activityCategoryFilter.toLowerCase();
      if (filter === "nature") return /nature|waterfall|trek|trail|lake|park|jungle|mount|hill|volcano/i.test(cat);
      if (filter === "culture") return /culture|temple|heritage|palace|history|art|museum|tradition|shrine/i.test(cat);
      if (filter === "food") return /food|culinary|dining|cafe|street|market|taste|cooking|dinner|coffee/i.test(cat);
      if (filter === "adventure") return /adventure|water|surf|raft|dive|safari|zipline|scuba|boat|kayak|atv/i.test(cat);
      if (filter === "beaches") return /beach|coast|island|ocean|bay|cove|coral|sunset|sand/i.test(cat);
      return cat.includes(filter);
    });
  }, [activityOptions, activityCategoryFilter]);

  // Calculate Real Expected Spend from selected items
  const totalPlannedSpendMinor = useMemo(() => {
    const transportCost = selectedTransport?.totalCostMinor ?? BigInt(792000);
    const stayCost = selectedStay?.totalStayCostMinor ?? BigInt(1520000);
    const activitiesCost = selectedActivitiesCostMinor;
    const days = numberOfDays || 5;
    const trav = travelers || 1;
    const foodEstimateMinor = BigInt(days) * BigInt(trav) * BigInt(60000);
    const localTravelEstimateMinor = BigInt(450000);

    return transportCost + stayCost + activitiesCost + foodEstimateMinor + localTravelEstimateMinor;
  }, [selectedTransport, selectedStay, selectedActivitiesCostMinor, numberOfDays, travelers]);

  // Remaining budget
  const remainingBudgetMinor = useMemo(() => {
    return groupBudgetMinor - totalPlannedSpendMinor;
  }, [groupBudgetMinor, totalPlannedSpendMinor]);

  // Map research items for live map anchor
  const mapResearchItems: GeneratedItineraryItem[] = useMemo(() => {
    const result: GeneratedItineraryItem[] = [];
    if (selectedStay) {
      result.push({
        id: selectedStay.id,
        timeSlot: "AFTERNOON",
        startTime: "14:00",
        title: selectedStay.name,
        category: "stay",
        location: selectedStay.location,
        latitude: selectedStay.latitude,
        longitude: selectedStay.longitude,
        costMinor: selectedStay.totalStayCostMinor || BigInt(0),
        formattedCost: selectedStay.priceFormatted || "₹14,000",
        notes: selectedStay.description || "Primary Researched Stay",
      });
    }
    selectedActivities.forEach((act, idx) => {
      result.push({
        id: act.id,
        timeSlot: idx % 2 === 0 ? "MORNING" : "AFTERNOON",
        startTime: idx % 2 === 0 ? "09:30" : "15:00",
        title: act.name,
        category: "activity",
        location: act.location,
        latitude: act.latitude,
        longitude: act.longitude,
        costMinor: act.totalGroupCostMinor || BigInt(0),
        formattedCost: act.priceFormatted || "₹600",
        notes: act.description || act.activityCategory || "Handpicked Experience",
      });
    });
    return result;
  }, [selectedStay, selectedActivities]);

  // Feasibility Check
  const feasibility = useMemo(
    () => checkBudgetFeasibility(groupBudgetMinor, totalPlannedSpendMinor),
    [groupBudgetMinor, totalPlannedSpendMinor]
  );

  // Dynamic Category Allocations
  const categoryAllocations: CategoryAllocation[] = useMemo(() => {
    return allocateBudget(groupBudgetMinor, travelers || 1, categoryRatios);
  }, [groupBudgetMinor, travelers, categoryRatios]);

  // Generated Itinerary
  const itinerary: GeneratedItinerary = useMemo(() => {
    return generateItinerary({
      tripId: "trip-custom-2026",
      destination: destination || "Goa, India",
      startDate: startDate || new Date().toISOString().split("T")[0],
      numberOfDays: numberOfDays || 5,
      travelers: travelers || 1,
      selectedTransport,
      selectedStay,
      selectedActivities,
    });
  }, [
    destination,
    startDate,
    numberOfDays,
    travelers,
    selectedTransport,
    selectedStay,
    selectedActivities,
  ]);

  const activeDay = useMemo(() => {
    return (
      itinerary.days.find((d) => d.dayNumber === selectedDayNumber) ||
      itinerary.days[0]
    );
  }, [itinerary, selectedDayNumber]);

  const toggleActivitySelection = (id: string) => {
    if (selectedActivityIds.includes(id)) {
      setSelectedActivityIds(selectedActivityIds.filter((item) => item !== id));
    } else {
      setSelectedActivityIds([...selectedActivityIds, id]);
    }
  };

  const handleRatioChange = (category: string, newPercentage: number) => {
    const updated = { ...categoryRatios, [category]: newPercentage };
    setCategoryRatios(updated);
  };

  return (
    <div className="min-h-screen dot-grid-paper text-[#1E2927] flex flex-col font-sans selection:bg-[#EAE2CE] overflow-x-hidden relative">
      {/* ========================================================================= */}
      {/* 1. TOP HORIZONTAL NAVIGATION (Plan a Trip is Active) */}
      {/* ========================================================================= */}
      <header className="sticky top-0 z-50 dot-grid-header border-b border-[#EAE3D6] h-[68px] flex items-center">
        <div className="max-w-[1320px] w-full mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          {/* LEFT: Logo & Brand */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-full bg-[#123F39] border border-[#DCCFBC]/80 flex items-center justify-center text-[#FCF9F2] shadow-2xs transition-transform group-hover:scale-105">
              <Compass className="w-4 h-4 text-[#C95B3D]" />
            </div>
            <div className="flex flex-col">
              <span className="font-serif text-lg font-bold tracking-tight text-[#123F39] leading-tight">
                Wander Wallet
              </span>
              <span className="text-[9px] font-sans font-semibold tracking-widest uppercase text-[#5A6B64] -mt-0.5">
                ONE BUDGET • REAL TRIPS
              </span>
            </div>
          </Link>

          {/* CENTER: Navigation Links */}
          <nav className="hidden md:flex items-center gap-8 h-full">
            <Link
              href="/"
              className="flex items-center gap-1.5 text-xs font-semibold text-[#5A6B64] hover:text-[#123F39] transition-colors py-2"
            >
              <Compass className="w-3.5 h-3.5" />
              <span>Home</span>
            </Link>

            <Link
              href="/trips"
              className="flex items-center gap-1.5 text-xs font-semibold text-[#5A6B64] hover:text-[#123F39] transition-colors py-2"
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Trips</span>
            </Link>

            {/* Plan a Trip: Active Link with Map Icon and Terracotta Underline */}
            <div className="relative flex items-center gap-1.5 text-xs font-bold text-[#C95B3D] py-2 h-full">
              <MapIcon className="w-3.5 h-3.5 text-[#C95B3D]" />
              <span>Plan a Trip</span>
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#C95B3D] rounded-full" />
            </div>

            <Link
              href="/explore"
              className="flex items-center gap-1.5 text-xs font-semibold text-[#5A6B64] hover:text-[#123F39] transition-colors py-2"
            >
              <Search className="w-3.5 h-3.5" />
              <span>Explore</span>
            </Link>

            <Link
              href="/ai-planner"
              className="flex items-center gap-1.5 text-xs font-semibold text-[#5A6B64] hover:text-[#123F39] transition-colors py-2"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#5A6B64]" />
              <span>AI Planner</span>
            </Link>
          </nav>

          {/* RIGHT: Primary Action & Profile */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                if (currentStage > 1) setCurrentStage(1);
              }}
              className="px-4 py-2 rounded-xl bg-[#C95B3D] hover:bg-[#BF5233] text-white text-xs font-semibold transition-all shadow-2xs hover:shadow-xs flex items-center gap-1.5"
            >
              <span>Plan a Trip</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>

            <Link
              href="/profile"
              className="w-8 h-8 rounded-full border border-[#DCCFBC] bg-[#FCF9F2] flex items-center justify-center text-[#5A6B64] hover:text-[#123F39] hover:border-[#123F39]/40 transition shadow-2xs"
              title="User Account"
            >
              <User className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* 2. HORIZONTAL STEPPER NAVIGATION BAR (Exact Reference Styling) */}
      {/* ========================================================================= */}
      <div className="max-w-[1320px] w-full mx-auto px-4 sm:px-6 lg:px-8 pt-5">
        <div className="bg-[#FCF9F2] rounded-2xl sm:rounded-3xl border border-[#EAE3D6] p-2.5 sm:p-3 shadow-2xs flex flex-wrap items-center justify-between gap-3">
          {/* Stepper items */}
          <div className="flex items-center gap-2 sm:gap-4 overflow-x-auto flex-1 min-w-0">
            {/* Step 1: Trip Details */}
            <button
              onClick={() => setCurrentStage(1)}
              className={`flex items-center gap-2.5 p-1.5 sm:px-3 rounded-xl transition ${
                currentStage === 1 ? "bg-[#FAF0EB]/60" : "hover:bg-[#FCF9F2]"
              }`}
            >
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                  currentStage === 1
                    ? "bg-[#C95B3D] text-white"
                    : currentStage > 1
                    ? "bg-[#123F39] text-white"
                    : "bg-[#EAE3D6] text-[#7A8A85]"
                }`}
                style={{ fontFamily: "var(--font-display-count)", fontSize: "11px" }}
              >
                01
              </div>
              <div className="text-left">
                <span
                  className={`text-xs font-bold block leading-tight ${
                    currentStage === 1 ? "text-[#C95B3D]" : "text-[#123F39]"
                  }`}
                >
                  Trip Details
                </span>
                <span className="text-[10px] text-[#7A8A85] hidden sm:block">Where & When</span>
              </div>
            </button>

            <span className="text-[#DCCFBC] text-xs">→</span>

            {/* Step 2: Research Options */}
            <button
              onClick={() => {
                if (currentStage >= 2 || destination) handleProceedToResearch();
              }}
              className={`flex items-center gap-2.5 p-1.5 sm:px-3 rounded-xl transition ${
                currentStage === 2 ? "bg-[#FAF0EB]/60" : "hover:bg-[#FCF9F2]"
              }`}
            >
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                  currentStage === 2
                    ? "bg-[#C95B3D] text-white"
                    : currentStage > 2
                    ? "bg-[#123F39] text-white"
                    : "bg-[#EAE3D6] text-[#7A8A85]"
                }`}
                style={{ fontFamily: "var(--font-display-count)", fontSize: "11px" }}
              >
                02
              </div>
              <div className="text-left">
                <span
                  className={`text-xs font-bold block leading-tight ${
                    currentStage === 2 ? "text-[#C95B3D]" : "text-[#1E2927]"
                  }`}
                >
                  Research Options
                </span>
                <span className="text-[10px] text-[#7A8A85] hidden sm:block">
                  Stays, Activities, Transport
                </span>
              </div>
            </button>

            <span className="text-[#DCCFBC] text-xs">→</span>

            {/* Step 3: Budget Reality & Allocation */}
            <button
              onClick={() => {
                if (currentStage >= 2) setCurrentStage(3);
              }}
              className={`flex items-center gap-2.5 p-1.5 sm:px-3 rounded-xl transition ${
                currentStage === 3 ? "bg-[#FAF0EB]/60" : "hover:bg-[#FCF9F2]"
              }`}
            >
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                  currentStage === 3
                    ? "bg-[#C95B3D] text-white"
                    : currentStage > 3
                    ? "bg-[#123F39] text-white"
                    : "bg-[#EAE3D6] text-[#7A8A85]"
                }`}
                style={{ fontFamily: "var(--font-display-count)", fontSize: "11px" }}
              >
                03
              </div>
              <div className="text-left">
                <span
                  className={`text-xs font-bold block leading-tight ${
                    currentStage === 3 ? "text-[#C95B3D]" : "text-[#1E2927]"
                  }`}
                >
                  Budget Reality & Allocation
                </span>
                <span className="text-[10px] text-[#7A8A85] hidden sm:block">
                  Costs & Feasibility
                </span>
              </div>
            </button>

            <span className="text-[#DCCFBC] text-xs">→</span>

            {/* Step 4: Day-by-Day Itinerary */}
            <button
              onClick={() => {
                if (currentStage >= 3) setCurrentStage(4);
              }}
              className={`flex items-center gap-2.5 p-1.5 sm:px-3 rounded-xl transition ${
                currentStage === 4 ? "bg-[#FAF0EB]/60" : "hover:bg-[#FCF9F2]"
              }`}
            >
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                  currentStage === 4
                    ? "bg-[#C95B3D] text-white"
                    : "bg-[#EAE3D6] text-[#7A8A85]"
                }`}
                style={{ fontFamily: "var(--font-display-count)", fontSize: "11px" }}
              >
                04
              </div>
              <div className="text-left">
                <span
                  className={`text-xs font-bold block leading-tight ${
                    currentStage === 4 ? "text-[#C95B3D]" : "text-[#1E2927]"
                  }`}
                >
                  Day-by-Day Itinerary
                </span>
                <span className="text-[10px] text-[#7A8A85] hidden sm:block">Finalize Plan</span>
              </div>
            </button>
          </div>

          {/* Right: Group Budget Capsule */}
          <div className="flex items-center gap-2 bg-[#FCF9F2] border border-[#EAE3D6] py-1.5 px-3 rounded-xl">
            <Users className="w-4 h-4 text-[#C95B3D]" />
            <div className="text-left">
              <span className="text-[9px] uppercase tracking-wider text-[#7A8A85] block font-bold">
                Group Budget ({currency})
              </span>
              <span className="font-serif font-bold text-xs sm:text-sm text-[#123F39]">
                {currencySymbol}
                {typeof groupBudgetNumber === "number"
                  ? groupBudgetNumber.toLocaleString()
                  : ["USD", "EUR", "GBP"].includes(currency)
                  ? "1,500"
                  : "60,000"}
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                const nextVal = prompt(`Enter Group Budget in ${currency}:`, String(groupBudgetNumber || (["USD", "EUR", "GBP"].includes(currency) ? 1500 : 60000)));
                if (nextVal && !isNaN(Number(nextVal))) setGroupBudgetNumber(Number(nextVal));
              }}
              className="w-6 h-6 rounded-lg bg-white border border-[#DCCFBC] flex items-center justify-center text-[#5A6B64] hover:text-[#123F39] hover:border-[#123F39] transition ml-1"
              title="Edit Budget"
            >
              <Pencil className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. HERO SECTION (CREATE A NEW TRIP + ALPINE LAKE COLLAGE) */}
      {/* ========================================================================= */}
      {currentStage === 1 && (
        <section className="max-w-[1320px] w-full mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Left Hero Statement */}
            <div className="lg:col-span-6 space-y-4 text-left">
              <span className="border border-[#C95B3D] text-[#C95B3D] px-2.5 py-1 rounded-sm text-[10px] font-bold uppercase tracking-wider inline-block">
                CREATE A NEW TRIP
              </span>

              <h1 className="font-serif text-4xl sm:text-5xl lg:text-[54px] font-bold text-[#123F39] tracking-tight leading-[1.08]">
                Turn your ideas into <br />
                <span className="text-[#123F39]">a complete plan</span>
                <span className="text-[#C95B3D]">.</span>
              </h1>

              <p className="text-xs sm:text-sm text-[#4A5B55] leading-relaxed max-w-md font-normal">
                Enter your destinations, headcount, dates, and total budget. We'll research
                realistic options and build your trip around it.
              </p>

              {/* 4 Micro Benefits Icons */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-[#FAF0EB] flex items-center justify-center flex-shrink-0 text-[#C95B3D]">
                    <Compass className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <h4 className="text-[11px] font-bold text-[#123F39] leading-tight">Real plans</h4>
                    <p className="text-[9px] text-[#7A8A85]">from real data</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-[#FAF0EB] flex items-center justify-center flex-shrink-0 text-[#C95B3D]">
                    <Coins className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <h4 className="text-[11px] font-bold text-[#123F39] leading-tight">Actual costs</h4>
                    <p className="text-[9px] text-[#7A8A85]">not estimates</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-[#FAF0EB] flex items-center justify-center flex-shrink-0 text-[#C95B3D]">
                    <Users className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <h4 className="text-[11px] font-bold text-[#123F39] leading-tight">Plan together</h4>
                    <p className="text-[9px] text-[#7A8A85]">with your people</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-[#FAF0EB] flex items-center justify-center flex-shrink-0 text-[#C95B3D]">
                    <ShieldCheck className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <h4 className="text-[11px] font-bold text-[#123F39] leading-tight">No overthinking</h4>
                    <p className="text-[9px] text-[#7A8A85]">just good trips</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Hero Visual Collage */}
            <div className="lg:col-span-6 relative min-h-[300px] sm:min-h-[340px] flex items-center justify-end">
              {/* Main Scenic Alpine Lake Photo */}
              <div className="relative w-full sm:w-[92%] h-[240px] sm:h-[280px] rounded-3xl overflow-hidden border border-[#DCCFBC] shadow-md bg-[#EAE2CE]">
                <img
                  src="https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80"
                  alt="Scenic Alpine Mountain Lake"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent pointer-events-none" />
              </div>

              {/* Polaroid 1 (Top left tilted -8°): Discover new places */}
              <div className="hidden sm:block absolute -top-4 left-6 z-20 -rotate-8 hover:-rotate-4 transition-transform duration-300">
                <div className="bg-white p-2 pb-3 rounded-md shadow-xl border border-[#EAE3D6] max-w-[140px]">
                  <div className="aspect-[4/3] overflow-hidden rounded-xs bg-[#EAE2CE]">
                    <img
                      src="https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&w=400&q=80"
                      alt="Alpine Village"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <p className="font-script text-xs text-center text-[#1E2927] mt-1.5 select-none">
                    Discover new places
                  </p>
                </div>
              </div>

              {/* Polaroid 2 (Bottom center tilted +4°): Plan together */}
              <div className="hidden sm:block absolute -bottom-6 left-32 z-20 rotate-4 hover:rotate-1 transition-transform duration-300">
                <div className="bg-white p-2 pb-3 rounded-md shadow-xl border border-[#EAE3D6] max-w-[145px]">
                  <div className="aspect-[4/3] overflow-hidden rounded-xs bg-[#EAE2CE]">
                    <img
                      src="https://images.unsplash.com/photo-1551632811-561732d1e306?auto=format&fit=crop&w=400&q=80"
                      alt="Hikers Planning Together"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <p className="font-script text-xs text-center text-[#1E2927] mt-1.5 select-none">
                    Plan together
                  </p>
                </div>
              </div>

              {/* Torn Travel Paper Checklist on Far Right */}
              <div className="hidden md:block absolute -right-2 top-8 z-30 opacity-95 select-none pointer-events-none">
                <div className="bg-[#FAF4EB] p-3.5 pr-4 pl-3 border-l-2 border-dashed border-[#DCCFBC] shadow-sm transform rotate-3">
                  <div className="w-8 h-4 border-b border-[#C95B3D] mb-2 -rotate-12" />
                  <p className="font-script text-xs text-[#123F39] leading-relaxed">
                    ✓ New Places <br />
                    ✓ Local Food <br />
                    ✓ Adventures <br />
                    ✓ Great Company
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ========================================================================= */}
      {/* 4. MAIN WORKSPACE (STAGE 1: TRIP DETAILS FORM + PREVIEW & WHAT'S NEXT) */}
      {/* ========================================================================= */}
      <main className="flex-1 max-w-[1320px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-4 pb-16">
        {currentStage === 1 && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* ----------------------------------------------------------------- */}
            {/* LEFT COLUMN: THE "TRIP DETAILS" FORM CARD (~65%) */}
            {/* ----------------------------------------------------------------- */}
            <div className="lg:col-span-8 bg-white rounded-3xl p-6 sm:p-8 border border-[#EAE3D6] shadow-sm space-y-6 text-left">
              {/* Header with Folded Map icon & Load from Saved Trip */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#EAE3D6] gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-[#FAF0EB] border border-[#EAE3D6] flex items-center justify-center text-[#C95B3D] flex-shrink-0">
                    <MapIcon className="w-5 h-5 text-[#C95B3D]" />
                  </div>
                  <div>
                    <h2 className="font-serif font-bold text-xl text-[#123F39] tracking-tight">
                      Trip Details
                    </h2>
                    <p className="text-xs text-[#5A6B64]">
                      Tell us the basics and we'll do the research for you.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowSavedModal(true)}
                  className="px-3.5 py-1.5 rounded-full border border-[#DCCFBC] bg-[#FCF9F2] hover:bg-[#F2ECE0] text-[#123F39] text-xs font-semibold flex items-center gap-2 transition shadow-2xs self-start sm:self-auto"
                >
                  <FolderOpen className="w-3.5 h-3.5 text-[#C95B3D]" />
                  <span>Load from Saved Trip</span>
                </button>
              </div>

              {/* Field 1: Destination & Starting From (2 Columns) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Destination Input */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#1E2927] block">Destination</label>
                  <div className="relative flex items-center">
                    <MapPin className="w-4 h-4 text-[#C95B3D] absolute left-3.5 pointer-events-none" />
                    <input
                      type="text"
                      value={destination}
                      onChange={(e) => setDestination(e.target.value)}
                      placeholder="Where do you want to go?"
                      className="w-full pl-10 pr-9 py-2.5 rounded-xl border border-[#DCCFBC] bg-[#FCF9F2]/40 text-xs sm:text-sm text-[#1E2927] placeholder:text-[#8A9995] focus:outline-none focus:ring-2 focus:ring-[#123F39]/20 focus:border-[#123F39] transition"
                    />
                    {destination && (
                      <button
                        type="button"
                        onClick={() => setDestination("")}
                        className="absolute right-3 text-[#8A9995] hover:text-[#123F39]"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Popular Destinations Pills */}
                  <div className="pt-1.5">
                    <span className="text-[10px] text-[#7A8A85] font-semibold block mb-1.5">
                      Popular destinations
                    </span>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {[
                        "Bali",
                        "Thailand",
                        "Singapore",
                        "Vietnam",
                        "Dubai",
                        "Sri Lanka",
                        "Europe",
                      ].map((item) => (
                        <button
                          key={item}
                          type="button"
                          onClick={() => handleSelectPopular(item)}
                          className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition ${
                            destination.toLowerCase().includes(item.toLowerCase()) ||
                            selectedPopularDest === item
                              ? "bg-[#FAF0EB] text-[#C95B3D] border border-[#C95B3D]"
                              : "bg-[#FCF9F2] text-[#5A6B64] border border-[#EAE3D6] hover:border-[#123F39]"
                          }`}
                        >
                          {item}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => handleSelectPopular("Goa, India")}
                        className="w-6 h-6 rounded-full bg-[#FCF9F2] border border-[#EAE3D6] text-xs text-[#5A6B64] flex items-center justify-center hover:border-[#123F39]"
                      >
                        ›
                      </button>
                    </div>
                  </div>
                </div>

                {/* Starting From Input */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#1E2927] block">Starting From</label>
                  <div className="relative flex items-center">
                    <Plane className="w-4 h-4 text-[#5A6B64] absolute left-3.5 pointer-events-none -rotate-45" />
                    <input
                      type="text"
                      value={startingLocation}
                      onChange={(e) => setStartingLocation(e.target.value)}
                      placeholder="Your city or airport"
                      className="w-full pl-10 pr-9 py-2.5 rounded-xl border border-[#DCCFBC] bg-[#FCF9F2]/40 text-xs sm:text-sm text-[#1E2927] placeholder:text-[#8A9995] focus:outline-none focus:ring-2 focus:ring-[#123F39]/20 focus:border-[#123F39] transition"
                    />
                    {startingLocation && (
                      <button
                        type="button"
                        onClick={() => setStartingLocation("")}
                        className="absolute right-3 text-[#8A9995] hover:text-[#123F39]"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <p className="text-[10px] text-[#7A8A85] pt-0.5">
                    We'll scan flight, train, road, and bus routes from here.
                  </p>
                </div>
              </div>

              {/* Field 2: Dates & Duration (3 Columns) */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-[#EAE3D6]/70">
                {/* Start Date */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#1E2927] block">Start Date</label>
                  <div className="relative flex items-center">
                    <Calendar className="w-4 h-4 text-[#5A6B64] absolute left-3.5 pointer-events-none" />
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-[#DCCFBC] bg-[#FCF9F2]/40 text-xs sm:text-sm text-[#1E2927] focus:outline-none focus:ring-2 focus:ring-[#123F39]/20 focus:border-[#123F39] transition"
                    />
                  </div>
                </div>

                {/* End Date */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#1E2927] block">End Date</label>
                  <div className="relative flex items-center">
                    <Calendar className="w-4 h-4 text-[#5A6B64] absolute left-3.5 pointer-events-none" />
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-[#DCCFBC] bg-[#FCF9F2]/40 text-xs sm:text-sm text-[#1E2927] focus:outline-none focus:ring-2 focus:ring-[#123F39]/20 focus:border-[#123F39] transition"
                    />
                  </div>
                </div>

                {/* Duration */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#1E2927] block">Duration</label>
                  <div className="flex items-center gap-2 pl-3 pr-4 py-2.5 rounded-xl border border-[#DCCFBC] bg-[#FCF9F2]/60 text-xs sm:text-sm text-[#123F39] font-semibold">
                    <Moon className="w-4 h-4 text-[#5A6B64]" />
                    <span>
                      {numberOfDays > 0 ? `${numberOfDays} Days · ${numberOfDays - 1} Nights` : "Auto calculate"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Field 3: Total Group Budget & Number of Travelers (2 Columns) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-[#EAE3D6]/70">
                {/* Total Group Budget & Currency Selector */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-[#1E2927] block">
                      Total Group Budget ({currency})
                    </label>
                    <select
                      value={currency}
                      onChange={(e) => {
                        const newCurr = e.target.value;
                        setCurrency(newCurr);
                        if (typeof window !== "undefined") {
                          localStorage.setItem("wander_user_currency", newCurr);
                        }
                      }}
                      className="text-[10px] font-bold px-2 py-0.5 rounded-md border border-[#DCCFBC] bg-[#FFF9F0] text-[#172A3A] focus:outline-none"
                    >
                      <option value="INR">INR (₹)</option>
                      <option value="USD">USD ($)</option>
                      <option value="EUR">EUR (€)</option>
                      <option value="GBP">GBP (£)</option>
                      <option value="THB">THB (฿)</option>
                      <option value="JPY">JPY (¥)</option>
                      <option value="AED">AED</option>
                    </select>
                  </div>
                  <div className="relative flex items-center">
                    <span className="absolute left-3.5 text-sm font-bold text-[#172A3A]">{currencySymbol}</span>
                    <input
                      type="number"
                      value={groupBudgetNumber}
                      onChange={(e) =>
                        setGroupBudgetNumber(e.target.value ? Number(e.target.value) : "")
                      }
                      placeholder={["USD", "EUR", "GBP"].includes(currency) ? "1500" : "60000"}
                      className="w-full pl-8 pr-4 py-2.5 rounded-xl border border-[#DCCFBC] bg-[#FCF9F2]/40 text-xs sm:text-sm text-[#1E2927] placeholder:text-[#8A9995] font-semibold focus:outline-none focus:ring-2 focus:ring-[#123F39]/20 focus:border-[#123F39] transition"
                    />
                  </div>
                  <p className="text-[10px] text-[#7A8A85]">We'll plan within your chosen {currency} budget</p>
                </div>

                {/* Number of Travelers */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#1E2927] block">
                    Number of Travelers
                  </label>
                  <div className="flex items-center justify-between rounded-xl border border-[#DCCFBC] bg-[#FCF9F2]/40 p-1">
                    <button
                      type="button"
                      onClick={() => setTravelers((prev) => Math.max(1, prev - 1))}
                      className="w-9 h-9 rounded-lg bg-white border border-[#DCCFBC] flex items-center justify-center text-sm font-bold text-[#123F39] hover:bg-[#FCF9F2] transition"
                    >
                      −
                    </button>
                    <span className="text-xs sm:text-sm font-bold text-[#123F39]">
                      {travelers} {travelers === 1 ? "traveler" : "travelers"}
                    </span>
                    <button
                      type="button"
                      onClick={() => setTravelers((prev) => prev + 1)}
                      className="w-9 h-9 rounded-lg bg-[#123F39] text-white flex items-center justify-center text-sm font-bold hover:bg-[#1A4F44] transition"
                    >
                      +
                    </button>
                  </div>
                  <p className="text-[10px] text-[#7A8A85]">
                    Share per traveler: {formatCurrency(Math.round(Number(groupBudgetMinor) / (travelers || 1)), currency)}
                  </p>
                </div>
              </div>

              {/* Field 4: Travel Style Selector (4 Cards) */}
              <div className="space-y-2 pt-2 border-t border-[#EAE3D6]/70">
                <label className="text-xs font-bold text-[#1E2927] block">Travel Style</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {/* Backpacker */}
                  <div
                    onClick={() => setTravelStyle("BACKPACKER")}
                    className={`p-3 rounded-2xl border cursor-pointer transition ${
                      travelStyle === "BACKPACKER"
                        ? "bg-[#FAF0EB] border-[#C95B3D] shadow-2xs"
                        : "bg-[#FCF9F2]/40 border-[#EAE3D6] hover:bg-[#FCF9F2]"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Backpack className="w-4 h-4 text-[#C95B3D]" />
                      <span className="text-xs font-bold text-[#123F39]">Backpacker</span>
                    </div>
                    <p className="text-[10px] text-[#5A6B64]">Budget friendly</p>
                  </div>

                  {/* Balanced (Selected default) */}
                  <div
                    onClick={() => setTravelStyle("BALANCED")}
                    className={`p-3 rounded-2xl border cursor-pointer transition ${
                      travelStyle === "BALANCED"
                        ? "bg-[#FAF0EB] border-[#C95B3D] shadow-2xs"
                        : "bg-[#FCF9F2]/40 border-[#EAE3D6] hover:bg-[#FCF9F2]"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Users className="w-4 h-4 text-[#C95B3D]" />
                      <span className="text-xs font-bold text-[#123F39]">Balanced</span>
                    </div>
                    <p className="text-[10px] text-[#5A6B64]">Comfort + value</p>
                  </div>

                  {/* Comfort */}
                  <div
                    onClick={() => setTravelStyle("COMFORT")}
                    className={`p-3 rounded-2xl border cursor-pointer transition ${
                      travelStyle === "COMFORT"
                        ? "bg-[#FAF0EB] border-[#C95B3D] shadow-2xs"
                        : "bg-[#FCF9F2]/40 border-[#EAE3D6] hover:bg-[#FCF9F2]"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Car className="w-4 h-4 text-[#C95B3D]" />
                      <span className="text-xs font-bold text-[#123F39]">Comfort</span>
                    </div>
                    <p className="text-[10px] text-[#5A6B64]">Relaxed & easy</p>
                  </div>

                  {/* Premium */}
                  <div
                    onClick={() => setTravelStyle("PREMIUM")}
                    className={`p-3 rounded-2xl border cursor-pointer transition ${
                      travelStyle === "PREMIUM"
                        ? "bg-[#FAF0EB] border-[#C95B3D] shadow-2xs"
                        : "bg-[#FCF9F2]/40 border-[#EAE3D6] hover:bg-[#FCF9F2]"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Star className="w-4 h-4 text-[#C95B3D]" />
                      <span className="text-xs font-bold text-[#123F39]">Premium</span>
                    </div>
                    <p className="text-[10px] text-[#5A6B64]">Luxury experience</p>
                  </div>
                </div>
              </div>

              {/* Bottom Card Footer with Handwritten Script & CTA */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pt-5 border-t border-[#EAE3D6] gap-4">
                <div className="relative">
                  <p className="text-xl text-[#123F39] select-none" style={{ fontFamily: "var(--font-script-elegant)" }}>
                    Real plans. Real costs. No overthinking.
                  </p>
                  <div className="w-20 h-0.5 bg-[#C95B3D]/80 rounded-full mt-0.5 ml-4" />
                </div>

                <button
                  type="button"
                  onClick={handleProceedToResearch}
                  disabled={isResearchLoading}
                  className="px-6 py-3 rounded-xl bg-[#C95B3D] hover:bg-[#BF5233] text-white text-xs sm:text-sm font-semibold transition-all shadow-xs hover:shadow-md flex items-center justify-center gap-2"
                >
                  {isResearchLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Scanning Live Options...</span>
                    </>
                  ) : (
                    <>
                      <Search className="w-4 h-4" />
                      <span>Research Live Options</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* ----------------------------------------------------------------- */}
            {/* RIGHT COLUMN: TRIP PREVIEW & WHAT'S NEXT CARDS (~35%) */}
            {/* ----------------------------------------------------------------- */}
            <div className="lg:col-span-4 space-y-6">
              {/* Card 1: Trip Preview */}
              <div className="bg-white rounded-3xl p-5 border border-[#EAE3D6] shadow-sm text-left">
                <div className="flex items-center justify-between pb-3 border-b border-[#EAE3D6]">
                  <h3 className="font-serif font-bold text-base text-[#123F39]">Trip Preview</h3>
                  <button
                    type="button"
                    onClick={handleResetForm}
                    className="text-[11px] font-semibold text-[#5A6B64] hover:text-[#C95B3D] flex items-center gap-1 transition"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Reset</span>
                  </button>
                </div>

                <div className="pt-4 flex items-start gap-4">
                  {/* Illustrated Peach Card with Airplane route */}
                  <div className="w-24 h-24 rounded-2xl bg-[#FAF0EB] border border-[#EAE3D6] flex-shrink-0 flex items-center justify-center relative overflow-hidden p-2">
                    <svg viewBox="0 0 100 100" className="w-full h-full text-[#C95B3D]">
                      <path
                        d="M15 75 C 30 40, 70 30, 85 25"
                        fill="none"
                        stroke="#C95B3D"
                        strokeWidth="2"
                        strokeDasharray="4 4"
                      />
                      <circle cx="15" cy="75" r="4" fill="#123F39" />
                      <circle cx="85" cy="25" r="4" fill="#C95B3D" />
                      <path
                        d="M 50 45 L 56 42 L 53 48 Z"
                        fill="#C95B3D"
                        transform="rotate(-20 50 45)"
                      />
                    </svg>
                  </div>

                  {/* Preview Status & Details */}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-serif font-bold text-sm text-[#123F39] truncate">
                      {destination || "Not planned yet"}
                    </h4>
                    <p className="text-[11px] text-[#5A6B64] leading-relaxed mt-1">
                      {destination && startDate
                        ? `${startingLocation ? `${startingLocation} ➔ ` : ""}${destination} for ${travelers} ${
                            travelers === 1 ? "traveler" : "travelers"
                          } (${numberOfDays} days)`
                        : "Your destination, dates and group details will appear here once you fill the form."}
                    </p>
                    {destination && (
                      <div className="mt-2.5 inline-block px-2.5 py-1 rounded-lg bg-[#FAF0EB] text-[#C95B3D] text-[10px] font-bold">
                        Target Budget: ₹
                        {(Number(groupBudgetNumber) || 60000).toLocaleString("en-IN")}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Card 1.5: Instant 31/20/18/14/9/8% Budget Allocation Draft Breakdown */}
              <div className="bg-white rounded-3xl p-5 border border-[#EAE3D6] shadow-sm text-left space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-[#EAE3D6]">
                  <div>
                    <h3 className="font-serif font-bold text-base text-[#123F39]">Draft Budget Allocation</h3>
                    <p className="text-[10px] text-[#7A8A85]">Automated 31/20/18/14/9/8% baseline model</p>
                  </div>
                  <span className="text-[10px] font-bold uppercase bg-[#123F39]/10 text-[#123F39] px-2 py-0.5 rounded-full">
                    Instant Preview
                  </span>
                </div>

                <div className="space-y-2 pt-1 text-xs">
                  {categoryAllocations.map((cat) => {
                    return (
                      <div key={cat.category} className="space-y-1">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-semibold text-[#123F39]">
                            {CATEGORY_LABELS[cat.category] || cat.category}
                          </span>
                          <span className="font-mono font-bold text-[#123F39]">
                            {cat.formattedAmount} <span className="text-[10px] text-[#7A8A85]">({cat.percentage}%)</span>
                          </span>
                        </div>
                        <div className="w-full bg-[#EAE3D6]/70 h-1.5 rounded-full overflow-hidden">
                          <div
                            className="bg-gradient-to-r from-[#123F39] to-[#C95B3D] h-full rounded-full"
                            style={{ width: `${cat.percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>

                <p className="text-[10px] text-[#7A8A85] italic pt-1 border-t border-[#EAE3D6]">
                  * Calibrated from real travel spending data across lodging (31%), dining (20%), transit (18%), activities (14%), local (9%), and buffer (8%).
                </p>
              </div>

              {/* Card 2: What's Next? (Timeline) */}
              <div className="bg-white rounded-3xl p-5 border border-[#EAE3D6] shadow-sm text-left">
                <h3 className="font-serif font-bold text-base text-[#123F39] pb-3 border-b border-[#EAE3D6]">
                  What's Next?
                </h3>

                <div className="relative pt-4 space-y-4">
                  {/* Step 1 */}
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-[#C95B3D] text-white flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                      1
                    </div>
                    <p className="text-xs text-[#5A6B64] leading-relaxed">
                      We'll research the best stays, activities and transport options for your dates.
                    </p>
                  </div>

                  {/* Step 2 */}
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-[#EAE3D6] text-[#5A6B64] flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                      2
                    </div>
                    <p className="text-xs text-[#5A6B64] leading-relaxed">
                      You'll see real prices, compare options and adjust your budget.
                    </p>
                  </div>

                  {/* Step 3 */}
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-[#EAE3D6] text-[#5A6B64] flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                      3
                    </div>
                    <p className="text-xs text-[#5A6B64] leading-relaxed">
                      Build your day-by-day itinerary and finalize your trip.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================
            STAGE 2: TRAVEL RESEARCH DESK / FIELD NOTES LAYOUT
           ======================================================== */}
        {currentStage === 2 && (
          <div className="space-y-10 animate-fadeIn text-left pb-12">
            {/* 1. EDITORIAL PAGE HEADER */}
            <div className="border-b border-[#D8C9B5] pb-8 pt-2">
              <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
                <div>
                  <div className="flex items-center gap-3 mb-2.5">
                    <span className="font-mono text-[11px] font-bold uppercase tracking-widest text-[#C85C3A] bg-[#FFF9F0] border border-[#D8C9B5] px-2.5 py-1 rounded-sm shadow-2xs">
                      Field Notes & Live Desk
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#172A3A] bg-[#D49A55]/20 border border-[#D49A55]/30 px-2.5 py-0.5 rounded-full">
                      <span className="w-2 h-2 rounded-full bg-[#172A3A] animate-pulse" />
                      LIVE RESEARCH · {transportOptions.length + stayOptions.length + activityOptions.length} sources checked
                    </span>
                  </div>

                  <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold text-[#172A3A] tracking-tight leading-tight">
                    RESEARCH YOUR TRIP
                  </h1>
                  <p className="text-sm sm:text-base text-[#746D65] mt-1.5 font-normal">
                    Compare real transport, stays and experiences before building your itinerary in {currency}.
                  </p>

                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-3.5 pt-3 border-t border-[#D8C9B5]/60">
                    <span className="font-serif text-lg sm:text-xl font-bold text-[#C85C3A]">
                      {startingLocation || "Bengaluru"} → {destination || "Bali"}
                    </span>
                    <span className="text-xs text-[#D8C9B5]">|</span>
                    <span className="text-xs font-semibold text-[#746D65]">
                      {numberOfDays || 5} days · {travelers} {travelers === 1 ? "traveler" : "travelers"} · {formatCurrency(groupBudgetMinor, currency)} budget
                    </span>
                  </div>
                </div>

                {/* Quick Action in Header */}
                <div className="flex items-center gap-3 shrink-0">
                  <Button variant="sand" onClick={() => setCurrentStage(1)} icon={<ArrowLeft className="w-4 h-4" />}>
                    Edit Details
                  </Button>
                  <Button
                    variant="accent"
                    onClick={() => setCurrentStage(3)}
                    rightIcon={<ArrowRight className="w-4 h-4" />}
                  >
                    Reality Check & Allocate →
                  </Button>
                </div>
              </div>

              {/* 2. TRIP RESEARCH JOURNEY STRIP */}
              <div className="mt-8 pt-6 border-t border-[#D8C9B5]/70">
                <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 relative">
                  {/* Step 1: START */}
                  <div className="bg-[#FFF9F0] border border-[#D8C9B5] rounded-lg p-3 relative shadow-2xs">
                    <span className="text-[10px] font-mono font-bold tracking-wider uppercase text-[#C85C3A] block">
                      01. START
                    </span>
                    <h4 className="font-serif text-xs font-bold text-[#172A3A] mt-0.5 truncate">
                      {startingLocation || "Origin Hub"}
                    </h4>
                    <span className="text-[10px] text-[#746D65] font-mono block mt-0.5 truncate">
                      Departure Point
                    </span>
                  </div>

                  {/* Step 2: TRANSPORT */}
                  <div className="bg-[#FFF9F0] border border-[#D8C9B5] rounded-lg p-3 relative shadow-2xs">
                    <span className="text-[10px] font-mono font-bold tracking-wider uppercase text-[#C85C3A] block">
                      02. TRANSPORT
                    </span>
                    <h4 className="font-serif text-xs font-bold text-[#172A3A] mt-0.5 truncate">
                      {selectedTransport ? selectedTransport.operator : "Select flight / transit"}
                    </h4>
                    <span className="text-[10px] text-[#746D65] font-mono block mt-0.5 truncate">
                      {selectedTransport?.totalCostMinor ? formatDynamicCost(selectedTransport.totalCostMinor) : "Awaiting choice"}
                    </span>
                  </div>

                  {/* Step 3: STAY */}
                  <div className="bg-[#FFF9F0] border border-[#D8C9B5] rounded-lg p-3 relative shadow-2xs">
                    <span className="text-[10px] font-mono font-bold tracking-wider uppercase text-[#C85C3A] block">
                      03. STAY
                    </span>
                    <h4 className="font-serif text-xs font-bold text-[#172A3A] mt-0.5 truncate">
                      {selectedStay ? selectedStay.name : "Select accommodation"}
                    </h4>
                    <span className="text-[10px] text-[#746D65] font-mono block mt-0.5 truncate">
                      {selectedStay?.totalStayCostMinor ? formatDynamicCost(selectedStay.totalStayCostMinor) : "Awaiting choice"}
                    </span>
                  </div>

                  {/* Step 4: EXPERIENCES */}
                  <div className="bg-[#FFF9F0] border border-[#D8C9B5] rounded-lg p-3 relative shadow-2xs">
                    <span className="text-[10px] font-mono font-bold tracking-wider uppercase text-[#C85C3A] block">
                      04. EXPERIENCES
                    </span>
                    <h4 className="font-serif text-xs font-bold text-[#172A3A] mt-0.5 truncate">
                      {selectedActivities.length > 0 ? `${selectedActivities.length} Places Selected` : "Select activities"}
                    </h4>
                    <span className="text-[10px] text-[#746D65] font-mono block mt-0.5 truncate">
                      {formatDynamicCost(selectedActivitiesCostMinor)} total
                    </span>
                  </div>

                  {/* Step 5: TRIP PLAN */}
                  <div className="bg-[#172A3A] border border-[#172A3A] rounded-lg p-3 relative shadow-2xs text-[#FFF9F0]">
                    <span className="text-[10px] font-mono font-bold tracking-wider uppercase text-[#D49A55] block">
                      05. TRIP PLAN
                    </span>
                    <h4 className="font-serif text-xs font-bold text-[#FFF9F0] mt-0.5 truncate">
                      Budget & Timeline
                    </h4>
                    <span className="text-[10px] text-[#FFF9F0]/80 font-mono block mt-0.5">
                      Ready to Allocate
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* AI Research Progress Notice */}
            {isResearchLoading && (
              <div className="p-6 bg-[#FFF9F0] border border-[#D8C9B5] rounded-2xl flex items-center gap-4 shadow-sm animate-pulse">
                <Loader2 className="w-6 h-6 text-[#C85C3A] animate-spin shrink-0" />
                <div>
                  <h4 className="text-sm font-bold text-[#172A3A]">
                    Synthesizing real flight routes, boutique stays & experiences with Gemini AI...
                  </h4>
                  <p className="text-xs text-[#746D65] mt-0.5">
                    Querying live transit networks and verified local coordinates for {destination} in {currency}.
                  </p>
                </div>
              </div>
            )}

            {/* 3. MAIN FIELD RESEARCH DESK: LEFT CONTENT (60%) + RIGHT ANCHOR (40%) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* ========================================================
                  LEFT COLUMN: RESEARCH FIELD NOTES & CARDS (~60%)
                 ======================================================== */}
              <div className="lg:col-span-7 space-y-12">
                {/* ----------------------------------------------------
                    SECTION 1 — ✈ TRANSPORT RESEARCH SLIPS
                   ---------------------------------------------------- */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-[#D8C9B5] pb-2.5">
                    <h2 className="font-serif font-bold text-xl sm:text-2xl text-[#172A3A] flex items-center gap-2">
                      <Plane className="w-5 h-5 text-[#C85C3A]" />
                      <span>✈ TRANSPORT</span>
                    </h2>
                    <span className="text-[11px] font-mono uppercase font-bold text-[#C85C3A] bg-[#FFF9F0] border border-[#D8C9B5] px-2.5 py-0.5 rounded-sm shadow-2xs">
                      Select 1
                    </span>
                  </div>

                  <p className="text-xs text-[#746D65] font-mono">
                    Official flight and intercity routes with live fare benchmarks in {currency}.
                  </p>

                  <div className="space-y-3.5">
                    {transportOptions.map((item) => {
                      const isSelected = selectedTransportId === item.id;
                      const isFlight = item.transportType === "FLIGHT";
                      const isTrain = item.transportType === "TRAIN";

                      return (
                        <div
                          key={item.id}
                          onClick={() => setSelectedTransportId(item.id)}
                          className={`group relative rounded-xl border p-4.5 cursor-pointer transition-all duration-200 ${
                            isSelected
                              ? "bg-[#FFF9F0] border-[#C85C3A] ring-1 ring-[#C85C3A] shadow-sm"
                              : "bg-[#FFF9F0]/70 border-[#D8C9B5] hover:border-[#172A3A] hover:bg-white"
                          }`}
                        >
                          {/* Top Header Row */}
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#172A3A] bg-[#EAE2CE]/70 px-2 py-0.5 rounded">
                                {isFlight ? "✈ Direct / Connect Flight" : isTrain ? "🚅 Express Train" : "🚗 Road / Transfer"}
                              </span>
                              <span className="text-xs font-bold text-[#172A3A]">
                                {item.operator}
                              </span>
                              {item.durationMins > 0 && (
                                <span className="text-[11px] text-[#746D65] font-mono">
                                  · {Math.floor(item.durationMins / 60)}h {item.durationMins % 60 ? `${item.durationMins % 60}m` : ""}
                                </span>
                              )}
                            </div>

                            {/* Selected Badge */}
                            {isSelected ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#C85C3A] bg-[#C85C3A]/10 border border-[#C85C3A]/30 px-2.5 py-0.5 rounded-full">
                                <Check className="w-3 h-3 stroke-[3]" />
                                SELECTED
                              </span>
                            ) : (
                              <span className="text-[11px] text-[#746D65] group-hover:text-[#172A3A] font-mono">
                                Click to select
                              </span>
                            )}
                          </div>

                          {/* Route Line Drawing */}
                          <div className="my-3 py-2 px-3 bg-[#F5EEE3]/80 border border-[#D8C9B5]/60 rounded-md">
                            <div className="flex items-center justify-between text-xs font-mono text-[#172A3A]">
                              <span className="font-bold truncate max-w-[40%]">
                                {item.departurePoint || startingLocation || "Origin"}
                              </span>
                              <div className="flex-1 mx-3 flex items-center justify-center relative">
                                <div className="w-full border-t border-dashed border-[#172A3A]/40" />
                                <Plane className="w-3.5 h-3.5 text-[#C85C3A] absolute bg-[#F5EEE3] px-0.5" />
                              </div>
                              <span className="font-bold truncate max-w-[40%] text-right">
                                {item.arrivalPoint || destination || "Destination"}
                              </span>
                            </div>
                          </div>

                          {/* Price & Provider Verification Row */}
                          <div className="flex items-baseline justify-between pt-2 border-t border-[#D8C9B5]/60">
                            <div className="flex items-center gap-2 text-[10px] text-[#746D65] font-mono">
                              <span className="text-[#172A3A] font-semibold">✓ Verified Fare</span>
                              <span>·</span>
                              <span>{item.source || "International Airline Network"}</span>
                            </div>

                            <div className="text-right">
                              <span className="font-serif text-base font-bold text-[#C85C3A]">
                                {formatDynamicCost(item.totalCostMinor, item.priceFormatted)}
                              </span>
                              {item.perPersonCostMinor && (
                                <span className="text-[11px] text-[#746D65] font-mono block">
                                  {formatDynamicCost(item.perPersonCostMinor)}/person
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* ----------------------------------------------------
                    SECTION 2 — ⌂ STAYS EDITORIAL GALLERY
                   ---------------------------------------------------- */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-[#D8C9B5] pb-2.5">
                    <h2 className="font-serif font-bold text-xl sm:text-2xl text-[#172A3A] flex items-center gap-2">
                      <Bed className="w-5 h-5 text-[#C85C3A]" />
                      <span>⌂ STAYS</span>
                    </h2>
                    <span className="text-[11px] font-mono uppercase font-bold text-[#C85C3A] bg-[#FFF9F0] border border-[#D8C9B5] px-2.5 py-0.5 rounded-sm shadow-2xs">
                      Select 1
                    </span>
                  </div>

                  <p className="text-xs text-[#746D65] font-mono">
                    Handpicked boutique resorts, villas, and verified accommodations in {currency}.
                  </p>

                  {/* Primary Selected Stay Hero Card */}
                  {selectedStay && (
                    <div className="bg-[#FFF9F0] border-2 border-[#C85C3A] rounded-2xl overflow-hidden shadow-sm transition-all duration-200">
                      <div className="grid grid-cols-1 md:grid-cols-12">
                        {/* Large Photo on Left / Top */}
                        <div className="md:col-span-6 relative h-56 md:h-auto bg-[#172A3A]/5 overflow-hidden">
                          <img
                            src={selectedStay.imageUrl || "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=900&auto=format&fit=crop&q=80"}
                            alt={selectedStay.name}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute top-3 left-3 bg-[#C85C3A] text-white text-[10px] font-mono font-bold uppercase tracking-wider px-2.5 py-1 rounded-sm shadow-sm flex items-center gap-1">
                            <Check className="w-3 h-3 stroke-[3]" />
                            PRIMARY SELECTED STAY
                          </div>
                          <div className="absolute bottom-3 left-3 flex items-center gap-1 bg-black/70 backdrop-blur-xs text-white text-xs font-bold px-2 py-0.5 rounded-md">
                            <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                            <span>{selectedStay.rating || 4.8} / 5</span>
                          </div>
                        </div>

                        {/* Stay Details on Right */}
                        <div className="md:col-span-6 p-5 flex flex-col justify-between">
                          <div>
                            <span className="text-[10px] font-mono uppercase font-bold text-[#746D65] tracking-wider block">
                              Featured Accommodation
                            </span>
                            <h3 className="font-serif text-lg font-bold text-[#172A3A] mt-1">
                              {selectedStay.name}
                            </h3>
                            <p className="text-xs text-[#746D65] mt-1 flex items-center gap-1">
                              <MapPin className="w-3.5 h-3.5 text-[#C85C3A] shrink-0" />
                              <span className="truncate">{selectedStay.location}</span>
                            </p>

                            {selectedStay.amenities && selectedStay.amenities.length > 0 && (
                              <div className="flex flex-wrap gap-1.5 mt-3">
                                {selectedStay.amenities.slice(0, 4).map((amenity, idx) => (
                                  <span
                                    key={idx}
                                    className="text-[10px] font-mono bg-[#F5EEE3] text-[#172A3A] px-2 py-0.5 rounded border border-[#D8C9B5]/60"
                                  >
                                    {amenity}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>

                          <div className="pt-4 mt-4 border-t border-[#D8C9B5]/60 flex items-baseline justify-between">
                            <div>
                              <span className="font-serif text-lg font-bold text-[#C85C3A]">
                                {formatDynamicCost(selectedStay.totalStayCostMinor, selectedStay.priceFormatted)}
                              </span>
                              {selectedStay.pricePerNightMinor && (
                                <span className="text-[11px] text-[#746D65] font-mono block">
                                  {formatDynamicCost(selectedStay.pricePerNightMinor)} / night
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] font-mono text-[#172A3A] bg-[#D49A55]/20 px-2 py-0.5 rounded">
                              ✓ Free cancellation
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Secondary Stays (Smaller Research Cards in Horizontal Grid) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                    {stayOptions
                      .filter((s) => s.id !== selectedStayId)
                      .slice(0, 4)
                      .map((item, idx) => (
                        <div
                          key={item.id}
                          onClick={() => setSelectedStayId(item.id)}
                          className="group bg-[#FFF9F0] border border-[#D8C9B5] rounded-xl overflow-hidden cursor-pointer hover:border-[#172A3A] hover:shadow-xs transition duration-200 flex flex-col justify-between"
                        >
                          <div className={`relative ${idx % 2 === 0 ? "h-32" : "h-36"} w-full bg-[#172A3A]/5 overflow-hidden`}>
                            <img
                              src={item.imageUrl || "https://images.unsplash.com/photo-1540541338287-41700207dee6?w=600&auto=format&fit=crop&q=80"}
                              alt={item.name}
                              className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                            />
                            <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-xs text-white text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1">
                              <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                              <span>{item.rating || 4.7}</span>
                            </div>
                          </div>

                          <div className="p-3.5 flex flex-col justify-between flex-1">
                            <div>
                              <h4 className="font-serif text-xs font-bold text-[#172A3A] line-clamp-1 group-hover:text-[#C85C3A] transition">
                                {item.name}
                              </h4>
                              <p className="text-[11px] text-[#746D65] mt-0.5 line-clamp-1">
                                {item.location}
                              </p>
                            </div>

                            <div className="flex items-baseline justify-between mt-3 pt-2 border-t border-[#D8C9B5]/60">
                              <span className="font-serif text-xs font-bold text-[#C85C3A]">
                                {formatDynamicCost(item.totalStayCostMinor, item.priceFormatted)}
                              </span>
                              <span className="text-[10px] font-mono text-[#746D65] group-hover:text-[#172A3A] font-semibold">
                                Select Stay →
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>

                {/* ----------------------------------------------------
                    SECTION 3 — ◉ PLACES & ACTIVITIES ASYMMETRIC GALLERY
                   ---------------------------------------------------- */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-[#D8C9B5] pb-2.5">
                    <h2 className="font-serif font-bold text-xl sm:text-2xl text-[#172A3A] flex items-center gap-2">
                      <Compass className="w-5 h-5 text-[#C85C3A]" />
                      <span>◉ PLACES & ACTIVITIES</span>
                    </h2>
                    <span className="text-[11px] font-mono uppercase font-bold text-[#172A3A] bg-[#FFF9F0] border border-[#D8C9B5] px-2.5 py-0.5 rounded-sm shadow-2xs">
                      Multi-select ({selectedActivityIds.length} added)
                    </span>
                  </div>

                  {/* Category Filter Pills */}
                  <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
                    {["All", "Nature", "Culture", "Food", "Adventure", "Beaches"].map((category) => {
                      const isActive = activityCategoryFilter === category;
                      return (
                        <button
                          key={category}
                          type="button"
                          onClick={() => setActivityCategoryFilter(category)}
                          className={`px-3 py-1 rounded-full text-xs font-mono font-medium transition cursor-pointer shrink-0 ${
                            isActive
                              ? "bg-[#C85C3A] text-white shadow-2xs"
                              : "bg-[#FFF9F0] border border-[#D8C9B5] text-[#746D65] hover:border-[#172A3A] hover:text-[#172A3A]"
                          }`}
                        >
                          {category}
                        </button>
                      );
                    })}
                  </div>

                  {/* Asymmetric / Masonry Discovery Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                    {filteredActivities.map((item, idx) => {
                      const isSelected = selectedActivityIds.includes(item.id);
                      // Editorial rhythm: vary card image height based on index
                      const imgHeight = idx % 3 === 0 ? "h-44" : idx % 3 === 1 ? "h-32" : "h-36";

                      return (
                        <div
                          key={item.id}
                          onClick={() => toggleActivitySelection(item.id)}
                          className={`group rounded-xl border overflow-hidden cursor-pointer transition-all duration-200 flex flex-col justify-between ${
                            isSelected
                              ? "bg-[#FFF9F0] border-[#C85C3A] ring-1 ring-[#C85C3A] shadow-sm"
                              : "bg-[#FFF9F0]/80 border-[#D8C9B5] hover:border-[#172A3A] hover:bg-white"
                          }`}
                        >
                          {/* Image Container */}
                          <div className={`relative ${imgHeight} w-full bg-[#172A3A]/5 overflow-hidden`}>
                            <img
                              src={item.imageUrl || "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600&auto=format&fit=crop&q=80"}
                              alt={item.name}
                              className="w-full h-full object-cover transition duration-300 group-hover:scale-105"
                              loading="lazy"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

                            {/* Add / Added Selection Button */}
                            <button
                              type="button"
                              className={`absolute top-2.5 right-2.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold shadow-sm flex items-center gap-1 transition ${
                                isSelected ? "bg-[#C85C3A] text-white" : "bg-black/60 backdrop-blur-xs text-white hover:bg-black/80"
                              }`}
                            >
                              {isSelected ? (
                                <>
                                  <Check className="w-3 h-3 stroke-[3]" />
                                  <span>Added</span>
                                </>
                              ) : (
                                <span>+ Add to Trip</span>
                              )}
                            </button>

                            {/* Category Badge */}
                            <div className="absolute bottom-2 left-2.5 bg-[#172A3A]/80 backdrop-blur-xs text-white text-[10px] font-mono px-2 py-0.5 rounded">
                              {item.activityCategory || "Sightseeing"}
                            </div>
                          </div>

                          {/* Activity Content */}
                          <div className="p-3.5 flex flex-col justify-between flex-1">
                            <div>
                              <h4 className="font-serif text-xs font-bold text-[#172A3A] line-clamp-1 group-hover:text-[#C85C3A] transition">
                                {item.name}
                              </h4>
                              <p className="text-[11px] text-[#746D65] mt-0.5 line-clamp-1 flex items-center gap-1">
                                <MapPin className="w-3 h-3 text-[#C85C3A] shrink-0" />
                                <span>{item.location}</span>
                              </p>
                            </div>

                            <div className="flex items-baseline justify-between mt-3 pt-2.5 border-t border-[#D8C9B5]/60">
                              <span className="font-serif text-xs font-bold text-[#C85C3A]">
                                {formatDynamicCost(item.totalGroupCostMinor, item.priceFormatted)}
                              </span>
                              {item.pricePerPersonMinor && (
                                <span className="text-[10px] text-[#746D65] font-mono">
                                  {formatDynamicCost(item.pricePerPersonMinor)}/person
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* ========================================================
                  RIGHT COLUMN: LIVE MAP & SELECTED TRIP SUMMARY (~40%)
                 ======================================================== */}
              <div className="lg:col-span-5 sticky top-24 space-y-6">
                {/* 1. LIVE MAP VISUAL ANCHOR */}
                <div className="bg-[#FFF9F0] border border-[#D8C9B5] rounded-2xl overflow-hidden shadow-sm">
                  <div className="p-4 border-b border-[#D8C9B5] bg-[#F5EEE3]/70 flex items-center justify-between">
                    <div>
                      <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-[#C85C3A] block">
                        Visual Anchor
                      </span>
                      <h3 className="font-serif font-bold text-base text-[#172A3A] flex items-center gap-2">
                        <MapIcon className="w-4 h-4 text-[#172A3A]" />
                        <span>FIELD MAP & PINPOINTS</span>
                      </h3>
                    </div>
                    <span className="text-[11px] font-mono text-[#746D65]">
                      {destination}
                    </span>
                  </div>

                  {/* Leaflet Interactive Live Map with Pins */}
                  <div className="relative">
                    <TripMap
                      items={mapResearchItems}
                      destination={destination}
                      className="h-[360px] w-full"
                    />
                  </div>

                  <div className="p-3 bg-[#FFF9F0] border-t border-[#D8C9B5] text-[11px] text-[#746D65] font-mono flex items-center justify-between">
                    <span>Pins: {mapResearchItems.length} locations plotted</span>
                    <span className="text-[#172A3A] font-bold">Live OpenStreetMap + OWM</span>
                  </div>
                </div>

                {/* 2. SELECTED TRIP SUMMARY (FIELD LEDGER) */}
                <div className="bg-[#FFF9F0] border border-[#D8C9B5] rounded-2xl p-6 shadow-sm relative overflow-hidden">
                  {/* Top Vintage Stamp */}
                  <div className="flex items-center justify-between border-b border-[#D8C9B5] pb-3 mb-4">
                    <div>
                      <span className="text-[10px] font-mono uppercase font-bold tracking-widest text-[#C85C3A] block">
                        Research Ledger
                      </span>
                      <h3 className="font-serif text-xl font-bold text-[#172A3A]">
                        YOUR RESEARCH
                      </h3>
                    </div>
                    <span className="font-mono text-[10px] uppercase font-bold bg-[#EAE2CE] text-[#172A3A] px-2 py-0.5 rounded">
                      Step 2 of 4
                    </span>
                  </div>

                  {/* Summary Line Items */}
                  <div className="space-y-3 font-mono text-xs text-[#172A3A]">
                    <div className="flex justify-between items-center pb-2 border-b border-[#D8C9B5]/40">
                      <span className="flex items-center gap-1.5 text-[#746D65]">
                        <Plane className="w-3.5 h-3.5 text-[#C85C3A]" />
                        <span>Transport:</span>
                      </span>
                      <span className="font-bold">
                        {selectedTransport?.totalCostMinor
                          ? formatDynamicCost(selectedTransport.totalCostMinor)
                          : formatDynamicCost(null, selectedTransport?.priceFormatted || "₹0")}
                      </span>
                    </div>

                    <div className="flex justify-between items-center pb-2 border-b border-[#D8C9B5]/40">
                      <span className="flex items-center gap-1.5 text-[#746D65]">
                        <Bed className="w-3.5 h-3.5 text-[#C85C3A]" />
                        <span>Stay:</span>
                      </span>
                      <span className="font-bold">
                        {selectedStay?.totalStayCostMinor
                          ? formatDynamicCost(selectedStay.totalStayCostMinor)
                          : formatDynamicCost(null, selectedStay?.priceFormatted || "₹0")}
                      </span>
                    </div>

                    <div className="flex justify-between items-center pb-2 border-b border-[#D8C9B5]/40">
                      <span className="flex items-center gap-1.5 text-[#746D65]">
                        <Compass className="w-3.5 h-3.5 text-[#C85C3A]" />
                        <span>Activities ({selectedActivities.length}):</span>
                      </span>
                      <span className="font-bold">
                        {formatDynamicCost(selectedActivitiesCostMinor)}
                      </span>
                    </div>

                    {/* Total Planned Cost */}
                    <div className="flex justify-between items-baseline pt-2 pb-1 border-t border-[#172A3A]/20">
                      <span className="font-serif text-sm font-bold text-[#172A3A]">
                        Estimated Total:
                      </span>
                      <span className="font-serif text-xl font-bold text-[#C85C3A]">
                        {formatDynamicCost(totalPlannedSpendMinor)}
                      </span>
                    </div>

                    {/* Budget Variance */}
                    <div className="p-3 rounded-lg bg-[#F5EEE3] border border-[#D8C9B5] space-y-1 mt-3">
                      <div className="flex justify-between text-[11px]">
                        <span className="text-[#746D65]">Group Budget:</span>
                        <span className="font-bold text-[#172A3A]">{formatCurrency(groupBudgetMinor, currency)}</span>
                      </div>
                      <div className="flex justify-between text-[11px]">
                        <span className="text-[#746D65]">Remaining Budget:</span>
                        <span className={`font-bold ${remainingBudgetMinor >= BigInt(0) ? "text-[#172A3A]" : "text-[#C85C3A]"}`}>
                          {remainingBudgetMinor >= BigInt(0)
                            ? `${formatDynamicCost(remainingBudgetMinor)} surplus`
                            : `${formatDynamicCost(-remainingBudgetMinor)} over budget`}
                        </span>
                      </div>
                    </div>

                    {/* Status Pill */}
                    <div className={`p-2.5 rounded-lg text-center text-xs font-semibold mt-3 ${
                      feasibility.isFeasible
                        ? "bg-[#D49A55]/15 text-[#172A3A] border border-[#D49A55]/40"
                        : "bg-[#C85C3A]/10 text-[#C85C3A] border border-[#C85C3A]/30"
                    }`}>
                      {feasibility.isFeasible ? "✓ Within Planned Budget Target" : "⚠️ Exceeds Budget — Rebalancing in Step 3"}
                    </div>
                  </div>

                  {/* Primary CTA Button */}
                  <div className="mt-6 space-y-2">
                    <Button
                      variant="accent"
                      className="w-full justify-center py-3 text-sm font-bold shadow-xs"
                      onClick={() => setCurrentStage(3)}
                      rightIcon={<ArrowRight className="w-4 h-4" />}
                    >
                      Reality Check & Allocate →
                    </Button>
                    <Button
                      variant="sand"
                      className="w-full justify-center text-xs"
                      onClick={() => setCurrentStage(1)}
                    >
                      ← Modify Details
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================
            STAGE 3: REALITY CHECK & ALLOCATION
           ======================================================== */}
        {currentStage === 3 && (
          <div className="space-y-8 animate-fadeIn text-left">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <StampBadge className="mb-2">Stage 3</StampBadge>
                <h1 className="font-serif text-3xl sm:text-4xl font-bold text-[#172A3A] tracking-tight">
                  Budget Reality Check & Allocation
                </h1>
                <p className="text-sm text-[#746D65] mt-1">
                  Rebalance expense categories to ensure your trip is 100% financially viable in {currency}.
                </p>
              </div>

              <Button variant="accent" onClick={() => setCurrentStage(4)}>
                Generate Itinerary →
              </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              <div className="lg:col-span-7 bg-[#FFF9F0] border border-[#D8C9B5] rounded-2xl p-6 shadow-2xs space-y-4">
                <h3 className="font-serif font-bold text-base text-[#172A3A]">
                  Category Budget Allocations ({currency})
                </h3>
                {categoryAllocations.map((cat) => (
                  <div key={cat.category} className="space-y-1">
                    <div className="flex justify-between text-xs font-semibold text-[#172A3A]">
                      <span>{cat.category}</span>
                      <span>{formatCurrency(cat.allocatedMinor, currency)} ({cat.percentage}%)</span>
                    </div>
                    <input
                      type="range"
                      min={5}
                      max={60}
                      value={cat.percentage}
                      onChange={(e) => handleRatioChange(cat.category, Number(e.target.value))}
                      className="w-full accent-[#C85C3A]"
                    />
                  </div>
                ))}
              </div>

              <div className="lg:col-span-5 bg-[#FFF9F0] border border-[#D8C9B5] rounded-2xl p-6 shadow-2xs text-center">
                <h3 className="font-serif font-bold text-base text-[#172A3A] mb-4">
                  Feasibility Verdict
                </h3>
                <div
                  className={`p-4 rounded-xl border text-sm font-semibold ${
                    feasibility.isFeasible
                      ? "bg-[#D49A55]/15 border-[#D49A55] text-[#172A3A]"
                      : "bg-[#FDF0EB] border-[#C85C3A] text-[#C85C3A]"
                  }`}
                >
                  {feasibility.isFeasible ? "✓ Plan is Financially Feasible!" : "⚠️ Pacing Above Budget"}
                </div>
                <p className="text-xs text-[#746D65] mt-3">
                  Planned: {formatCurrency(totalPlannedSpendMinor, currency)} / Target: {formatCurrency(groupBudgetMinor, currency)}
                </p>
              </div>
            </div>

            <div className="flex justify-between pt-4 border-t border-[#D8C9B5]">
              <Button variant="sand" onClick={() => setCurrentStage(2)}>
                ← Back to Research
              </Button>
              <Button variant="accent" onClick={() => setCurrentStage(4)}>
                Finalize Day-by-Day Plan →
              </Button>
            </div>
          </div>
        )}

        {/* ========================================================
            STAGE 4: DAY-BY-DAY ITINERARY & FINALIZE
           ======================================================== */}
        {currentStage === 4 && (
          <div className="space-y-8 animate-fadeIn text-left">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <StampBadge className="mb-2">Final Stage</StampBadge>
                <h1 className="font-serif text-3xl sm:text-4xl font-bold text-[#163F38] tracking-tight">
                  Your Day-by-Day Itinerary
                </h1>
                <p className="text-sm text-[#5F625B] mt-1">
                  Balanced schedule with travel times and authentic spots.
                </p>
              </div>

              <Button
                variant="accent"
                onClick={handleSaveTrip}
                disabled={isSaving}
              >
                {isSaving ? "Saving to Database..." : "Save & Open Workspace →"}
              </Button>
            </div>

            {/* Days Tabs */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2">
              {itinerary.days.map((d) => (
                <button
                  key={d.dayNumber}
                  onClick={() => setSelectedDayNumber(d.dayNumber)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                    selectedDayNumber === d.dayNumber
                      ? "bg-[#163F38] text-white"
                      : "bg-white border border-[#DCCFBC] text-[#5F625B] hover:border-[#163F38]"
                  }`}
                >
                  Day {d.dayNumber}: {d.title}
                </button>
              ))}
            </div>

            {/* Active Day Timeline */}
            <div className="bg-white rounded-2xl p-6 border border-[#DCCFBC] shadow-sm">
              <h3 className="font-serif font-bold text-lg text-[#163F38] mb-2">
                Day {activeDay.dayNumber} — {activeDay.theme}
              </h3>
              <div className="space-y-3 mt-4">
                {activeDay.items.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl border border-[#EAE3D6] bg-[#FCF9F2]/30 flex items-center justify-between"
                  >
                    <div>
                      <span className="text-[11px] font-bold text-[#C95B3D]">{item.timeSlot}</span>
                      <h4 className="text-xs font-bold text-[#163F38]">{item.title}</h4>
                      <p className="text-[11px] text-[#5F625B]">{item.notes || item.location}</p>
                    </div>
                    <span className="text-xs font-bold text-[#163F38]">{item.formattedCost}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-between pt-4 border-t border-[#DCCFBC]">
              <Button variant="sand" onClick={() => setCurrentStage(3)}>
                ← Back to Allocation
              </Button>
              <Button variant="accent" onClick={handleSaveTrip} disabled={isSaving}>
                {isSaving ? "Saving to Workspace..." : "Confirm & Save Trip →"}
              </Button>
            </div>
          </div>
        )}
      </main>

      {/* Modal: Load from Saved Trip */}
      {showSavedModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full border border-[#DCCFBC] shadow-2xl relative text-left">
            <div className="flex items-center justify-between pb-3 border-b border-[#EAE3D6]">
              <div className="flex items-center gap-2">
                <FolderOpen className="w-4 h-4 text-[#C95B3D]" />
                <h3 className="font-serif text-lg font-bold text-[#123F39]">
                  Load from Saved Trip
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowSavedModal(false)}
                className="text-[#7A8A85] hover:text-[#123F39] p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2.5 mt-4 max-h-72 overflow-y-auto pr-1">
              {savedTrips.length > 0 ? (
                savedTrips.map((t) => (
                  <div
                    key={t.id}
                    onClick={() => handleLoadSavedTrip(t)}
                    className="p-3 rounded-2xl border border-[#EAE3D6] hover:bg-[#FCF9F2] hover:border-[#123F39]/40 cursor-pointer transition flex items-center justify-between group"
                  >
                    <div>
                      <h4 className="text-xs font-bold text-[#123F39] group-hover:text-[#C95B3D]">
                        {t.title}
                      </h4>
                      <p className="text-[11px] text-[#5A6B64]">
                        {t.destination} • {t.numberOfDays} Days • {t.numberOfTravelers} Travelers
                      </p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-[#7A8A85] group-hover:text-[#123F39] transition-transform group-hover:translate-x-1" />
                  </div>
                ))
              ) : (
                <div className="text-xs text-[#5A6B64] text-center py-6">
                  No saved trips found. Pick from popular destinations on the form!
                </div>
              )}
            </div>

            <div className="pt-4 mt-4 border-t border-[#EAE3D6] flex justify-end">
              <button
                type="button"
                onClick={() => setShowSavedModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#FCF9F2] text-[#123F39] hover:bg-[#F2ECE0] transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
