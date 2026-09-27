"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Compass,
  ArrowRight,
  Play,
  Users,
  Wallet,
  Calendar,
  MapPin,
  Check,
  Plane,
  X,
  Receipt,
  User,
  Search,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Map,
  Clock,
  Coins,
} from "lucide-react";

// Featured destinations for dynamic interactive hero and inspiration showcase
const HERO_DESTINATIONS = [
  {
    id: "amalfi",
    num: "01",
    name: "Amalfi Coast",
    country: "Italy",
    coordinates: "40.6333° N, 14.6029° E",
    days: "5 Days",
    people: "4 People",
    budget: "₹72,000",
    tag: "Coastal Cliff & Sea",
    imageUrl:
      "https://images.unsplash.com/photo-1533105079780-92b9be482077?auto=format&fit=crop&w=1400&q=85",
    description: "Cliffside pastel villages overlooking the Mediterranean azure waters.",
  },
  {
    id: "kyoto",
    num: "02",
    name: "Kyoto",
    country: "Japan",
    coordinates: "35.0116° N, 135.7681° E",
    days: "6 Days",
    people: "4 People",
    budget: "₹85,000",
    tag: "Temples & Bamboo Groves",
    imageUrl:
      "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=1400&q=85",
    description: "Historic wooden machiya, tranquil Zen stone gardens, and autumn foliage.",
  },
  {
    id: "bali",
    num: "03",
    name: "Bali",
    country: "Indonesia",
    coordinates: "8.3405° S, 115.0920° E",
    days: "7 Days",
    people: "6 People",
    budget: "₹65,000",
    tag: "Volcanic Terraces & Ocean",
    imageUrl:
      "https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&w=1400&q=85",
    description: "Lush green rice terraces, sacred sea temples, and sunset ocean shores.",
  },
];

const CURATED_REAL_TRIPS = [
  {
    id: "manali",
    title: "Manali Alpine Escape",
    destination: "Manali",
    region: "Himachal Pradesh, India",
    days: "5 Days · 4 People",
    budget: "₹45,000",
    tag: "Mountains & Treks",
    imageUrl:
      "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1000&q=85",
    notes: "Pine forests, high mountain passes & riverside campfires.",
  },
  {
    id: "hyderabad",
    title: "Hyderabad Heritage Tour",
    destination: "Hyderabad",
    region: "Telangana, India",
    days: "4 Days · 6 People",
    budget: "₹38,000",
    tag: "Culture & Culinary",
    imageUrl:
      "https://images.unsplash.com/photo-1596176530529-78163a4f7af2?auto=format&fit=crop&w=800&q=80",
    notes: "Charminar night walks, Nizami biryani & Golconda stone fortresses.",
  },
  {
    id: "paris",
    title: "Paris Cultural Journey",
    destination: "Paris",
    region: "Île-de-France, France",
    days: "6 Days · 4 People",
    budget: "€4,800",
    tag: "Museums & Architecture",
    imageUrl:
      "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=800&q=80",
    notes: "Louvre galleries, Seine riverboats & sidewalk brasseries.",
  },
  {
    id: "goa",
    title: "Goa Coastal Getaway",
    destination: "Goa",
    region: "Goa, India",
    days: "5 Days · 6 People",
    budget: "₹60,000",
    tag: "Beaches & Water Sports",
    imageUrl:
      "https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=800&q=80",
    notes: "Golden sand coves, heritage Portuguese villas & sunset cruises.",
  },
];

export default function HomePage() {
  const router = useRouter();
  const [activeTrip, setActiveTrip] = useState<any>(null);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [navSearch, setNavSearch] = useState("");
  const [selectedHeroIndex, setSelectedHeroIndex] = useState(0);
  const [activeCuratedIndex, setActiveCuratedIndex] = useState(0);

  // Real-time live statistics from active database
  const [realStats, setRealStats] = useState({
    tripsCount: 0,
    travelersCount: 0,
    destinationsCount: 0,
    totalBudgetFormatted: "₹0",
  });

  // Quick Plan Form States
  const [formDestination, setFormDestination] = useState("");
  const [formDates, setFormDates] = useState("Next Month");
  const [formTravelers, setFormTravelers] = useState("4 Travelers");
  const [formBudget, setFormBudget] = useState("50000");

  // Fetch real trip data and compute live real-time metrics
  useEffect(() => {
    fetch("/api/trips")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.trips) {
          const trips = data.trips;
          if (trips.length > 0) {
            setActiveTrip(trips[0]);
          }

          const tripsCount = trips.length;
          const travelersCount = trips.reduce(
            (acc: number, t: any) => acc + (Number(t.numberOfTravelers) || Number(t.membersCount) || 1),
            0
          );
          const uniqueDests = new Set(trips.map((t: any) => (t.destination || "").trim().toLowerCase()).filter(Boolean)).size;
          const totalBudgetMinor = trips.reduce(
            (acc: bigint, t: any) => acc + BigInt(t.groupBudgetMinor || 0),
            BigInt(0)
          );
          const totalBudgetRupees = Number(totalBudgetMinor) / 100;

          const formattedBudget =
            totalBudgetRupees >= 100000
              ? `₹${(totalBudgetRupees / 100000).toFixed(1)}L`
              : totalBudgetRupees > 0
              ? `₹${totalBudgetRupees.toLocaleString("en-IN")}`
              : "₹0";

          setRealStats({
            tripsCount,
            travelersCount,
            destinationsCount: uniqueDests,
            totalBudgetFormatted: formattedBudget,
          });
        }
      })
      .catch((err) => console.warn("Homepage trip context load:", err));
  }, []);

  const activeHero = HERO_DESTINATIONS[selectedHeroIndex];
  const primaryTrip = CURATED_REAL_TRIPS[activeCuratedIndex];
  const secondaryTrips = CURATED_REAL_TRIPS.filter((_, idx) => idx !== activeCuratedIndex);

  const handleNavSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (navSearch.trim()) {
      router.push(`/explore?query=${encodeURIComponent(navSearch.trim())}`);
    }
  };

  const handleQuickPlan = (e: React.FormEvent) => {
    e.preventDefault();
    const dest = formDestination.trim() || "Goa";
    const travelers = parseInt(formTravelers) || 4;
    const budget = parseInt(formBudget) || 50000;
    router.push(`/trips/new?destination=${encodeURIComponent(dest)}&travelers=${travelers}&budget=${budget}`);
  };

  const nextCuratedTrip = () => {
    setActiveCuratedIndex((prev) => (prev + 1) % CURATED_REAL_TRIPS.length);
  };

  const prevCuratedTrip = () => {
    setActiveCuratedIndex((prev) => (prev - 1 + CURATED_REAL_TRIPS.length) % CURATED_REAL_TRIPS.length);
  };

  const scrollToHowItWorks = (e: React.MouseEvent) => {
    e.preventDefault();
    const target = document.getElementById("how-it-works");
    if (target) {
      target.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div
      className="min-h-screen text-[#292726] flex flex-col font-sans selection:bg-[#EAE1D3] overflow-x-hidden relative"
      style={{
        backgroundColor: "#F5EEE3",
        backgroundImage: `
          url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='250' height='250'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='250' height='250' filter='url(%23n)' opacity='0.02'/%3E%3C/svg%3E"),
          radial-gradient(circle, #CDBDA6 1.2px, transparent 1.2px)
        `,
        backgroundSize: "250px 250px, 28px 28px",
        backgroundAttachment: "local",
      }}
    >
      {/* Editorial Decorative Watermarks */}
      <span aria-hidden="true" className="pointer-events-none select-none fixed top-24 right-8 z-0 opacity-[0.10]">
        <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="24" cy="24" r="22" stroke="#172A3A" strokeWidth="0.8" strokeDasharray="2.5 3.5" />
          <circle cx="24" cy="24" r="3" fill="#172A3A" opacity="0.5" />
          <line x1="24" y1="2" x2="24" y2="46" stroke="#172A3A" strokeWidth="0.7" strokeDasharray="1 4" />
          <line x1="2" y1="24" x2="46" y2="24" stroke="#172A3A" strokeWidth="0.7" strokeDasharray="1 4" />
          <polygon points="24,3 22,19 24,24 26,19" fill="#172A3A" opacity="0.5" />
          <polygon points="24,45 22,29 24,24 26,29" fill="#C85C3A" opacity="0.4" />
        </svg>
      </span>

      {/* ========================================================================= */}
      {/* 1. TOP NAVIGATION */}
      {/* ========================================================================= */}
      <header className="sticky top-0 z-50 bg-[#F5EEE3]/96 backdrop-blur-md border-b border-[#D8C9B5] h-[68px] flex items-center">
        <div className="max-w-[1380px] w-full mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
          {/* LEFT: Logo / Emblem & Wordmark */}
          <Link href="/" className="flex items-center gap-2.5 group flex-shrink-0">
            <div className="w-8 h-8 rounded-full bg-[#172A3A] border border-[#D8C9B5] flex items-center justify-center text-[#FFF9F0] shadow-2xs transition-transform group-hover:scale-105">
              <Compass className="w-4 h-4 text-[#D49A55]" />
            </div>
            <div className="flex flex-col">
              <span
                className="text-lg font-bold tracking-tight text-[#172A3A] leading-tight"
                style={{ fontFamily: "var(--font-brand)" }}
              >
                WANDER WALLET
              </span>
              <span
                className="text-[10px] text-[#746D65] -mt-0.5 tracking-wide"
                style={{ fontFamily: "var(--font-script-elegant)" }}
              >
                One Budget · Real Trips
              </span>
            </div>
          </Link>

          {/* CENTER: Navigation Links */}
          <nav className="hidden md:flex items-center gap-7 h-full">
            <div className="relative flex flex-col items-center justify-center py-2 h-full">
              <Link
                href="/"
                className="text-xs font-bold text-[#172A3A] hover:text-[#172A3A] transition-colors"
              >
                Home
              </Link>
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#C85C3A] rounded-full" />
            </div>

            <Link
              href="/trips"
              className="text-xs font-semibold text-[#746D65] hover:text-[#172A3A] transition-colors py-2"
            >
              Trips
            </Link>

            <Link
              href="/explore"
              className="text-xs font-semibold text-[#746D65] hover:text-[#172A3A] transition-colors py-2"
            >
              Explore
            </Link>

            <Link
              href="/ai-planner"
              className="text-xs font-semibold text-[#746D65] hover:text-[#172A3A] transition-colors py-2"
            >
              AI Planner
            </Link>

            <Link
              href="/trips/new"
              className="text-xs font-semibold text-[#746D65] hover:text-[#172A3A] transition-colors py-2"
            >
              Plan a Trip
            </Link>
          </nav>

          {/* RIGHT: Search + Plan a Trip Button + Profile */}
          <div className="flex items-center gap-3">
            {/* Search Input Field */}
            <form onSubmit={handleNavSearch} className="hidden lg:flex items-center relative">
              <input
                type="text"
                value={navSearch}
                onChange={(e) => setNavSearch(e.target.value)}
                placeholder="Search destinations..."
                className="w-44 xl:w-52 h-8.5 pl-8 pr-3 text-xs bg-[#FFF9F0] border border-[#D8C9B5] rounded-lg text-[#292726] placeholder-[#746D65]/70 focus:outline-hidden focus:border-[#172A3A] transition"
              />
              <Search className="w-3.5 h-3.5 text-[#746D65] absolute left-2.5 pointer-events-none" />
            </form>

            <Link
              href="/trips/new"
              className="px-3.5 sm:px-4 py-2 rounded-lg bg-[#172A3A] hover:bg-[#233d52] text-[#FFF9F0] text-xs font-semibold transition-all shadow-2xs hover:shadow-xs flex items-center gap-1.5"
            >
              <span>Plan a Trip</span>
              <ArrowRight className="w-3.5 h-3.5 text-[#D49A55]" />
            </Link>

            <Link
              href="/profile"
              className="w-8 h-8 rounded-full border border-[#D8C9B5] bg-[#FFF9F0] flex items-center justify-center text-[#746D65] hover:text-[#172A3A] hover:border-[#172A3A] transition shadow-2xs"
              title="User Account"
            >
              <User className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* 2. HERO SECTION — TWO-COLUMN ASYMMETRIC EDITORIAL */}
      {/* ========================================================================= */}
      <section className="relative overflow-hidden pt-8 pb-14 sm:pt-10 sm:pb-16">
        <div className="max-w-[1280px] w-full mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
            {/* ----------------------------------------------------------------- */}
            {/* LEFT HERO: Editorial Heading, Pitch, Actions & Live Real-Time Stats (~45%) */}
            {/* ----------------------------------------------------------------- */}
            <div className="lg:col-span-5 space-y-6 text-left">
              {/* Small Uppercase Editorial Label */}
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#C85C3A]">
                  PLAN · SPLIT · EXPLORE
                </span>
              </div>

              {/* Large Editorial Serif Heading */}
              <h1
                className="text-5xl sm:text-6xl xl:text-[70px] font-bold tracking-tight text-[#172A3A] leading-[0.96]"
                style={{ fontFamily: "var(--font-editorial)" }}
              >
                Your people.
                <br />
                Your places.
                <br />
                <span className="text-[#C85C3A]">One budget.</span>
              </h1>

              {/* Supporting Editorial Description */}
              <p className="text-sm sm:text-base text-[#292726] leading-relaxed max-w-[480px] font-normal">
                Turn travel dreams into real trips — with smarter planning, shared expenses and memories that last.
              </p>

              {/* Hero Buttons */}
              <div className="flex flex-wrap items-center gap-3.5 pt-1">
                <Link
                  href="/trips/new"
                  className="px-6 py-3 rounded-lg bg-[#C85C3A] hover:bg-[#b34f2f] text-[#FFF9F0] text-xs sm:text-sm font-semibold transition-all shadow-xs hover:shadow-md flex items-center gap-2 group"
                >
                  <span>Plan Your Trip</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </Link>

                <a
                  href="#how-it-works"
                  onClick={scrollToHowItWorks}
                  className="px-5 py-3 rounded-lg bg-transparent hover:bg-[#FFF9F0] border border-[#D8C9B5] text-[#172A3A] text-xs sm:text-sm font-semibold transition-all flex items-center gap-2 group cursor-pointer"
                >
                  <div className="w-4 h-4 rounded-full bg-[#172A3A] flex items-center justify-center text-[#FFF9F0]">
                    <Play className="w-2.5 h-2.5 fill-current ml-0.5" />
                  </div>
                  <span>See How It Works</span>
                </a>
              </div>

              {/* Real-Time Live Statistics Row (Direct from active DB) */}
              <div className="pt-6 border-t border-[#D8C9B5] grid grid-cols-4 gap-2 text-left">
                <div className="space-y-0.5">
                  <span className="font-serif font-bold text-lg sm:text-xl text-[#C85C3A] block leading-tight">
                    {realStats.tripsCount}
                  </span>
                  <span className="text-[10px] sm:text-[11px] text-[#746D65] font-medium block">
                    Trips Planned
                  </span>
                </div>

                <div className="space-y-0.5 border-l border-[#D8C9B5] pl-3">
                  <span className="font-serif font-bold text-lg sm:text-xl text-[#C85C3A] block leading-tight">
                    {realStats.travelersCount}
                  </span>
                  <span className="text-[10px] sm:text-[11px] text-[#746D65] font-medium block">
                    Travelers Active
                  </span>
                </div>

                <div className="space-y-0.5 border-l border-[#D8C9B5] pl-3">
                  <span className="font-serif font-bold text-lg sm:text-xl text-[#C85C3A] block leading-tight">
                    {realStats.destinationsCount}
                  </span>
                  <span className="text-[10px] sm:text-[11px] text-[#746D65] font-medium block">
                    Destinations
                  </span>
                </div>

                <div className="space-y-0.5 border-l border-[#D8C9B5] pl-3">
                  <span className="font-serif font-bold text-lg sm:text-xl text-[#C85C3A] block leading-tight">
                    {realStats.totalBudgetFormatted}
                  </span>
                  <span className="text-[10px] sm:text-[11px] text-[#746D65] font-medium block">
                    Budget Tracked
                  </span>
                </div>
              </div>
            </div>

            {/* ----------------------------------------------------------------- */}
            {/* RIGHT HERO: Balanced Cinematic Photography + Snapshot + Selector (~55%) */}
            {/* ----------------------------------------------------------------- */}
            <div className="lg:col-span-7 relative flex items-center justify-center">
              <div className="relative w-full grid grid-cols-1 md:grid-cols-12 gap-3.5 items-center">
                {/* Main Landscape Photograph (Balanced Normal Scale) */}
                <div className="md:col-span-10 relative h-[360px] sm:h-[430px] lg:h-[450px] rounded-2xl overflow-hidden shadow-md border border-[#D8C9B5] bg-[#EAE1D3] group">
                  <img
                    src={activeHero.imageUrl}
                    alt={activeHero.name}
                    className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-700"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-black/10 pointer-events-none" />

                  {/* Floating Trip Information Card Overlapping Upper-Left */}
                  <div className="absolute top-4 left-4 sm:top-5 sm:left-5 z-20 bg-[#FFF9F0] px-4 py-3 rounded-xl border border-[#D8C9B5] shadow-md flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[#172A3A] flex items-center justify-center text-[#D49A55] flex-shrink-0">
                      <MapPin className="w-4 h-4" />
                    </div>
                    <div className="text-left">
                      <div className="flex items-center gap-1.5">
                        <span className="font-serif font-bold text-sm text-[#172A3A]">
                          {activeHero.name}
                        </span>
                        <span className="text-[10px] text-[#746D65]">· {activeHero.country}</span>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-[#746D65] mt-0.5">
                        <span>{activeHero.days}</span>
                        <span>•</span>
                        <span>{activeHero.people}</span>
                        <span>•</span>
                        <span className="font-serif font-bold text-[#C85C3A]">
                          {activeHero.budget}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Handwritten Editorial Micro-Annotation */}
                  <div className="absolute bottom-4 left-5 z-20 select-none">
                    <span
                      className="text-xs sm:text-sm text-[#FFF9F0] drop-shadow-md italic tracking-wide"
                      style={{ fontFamily: "var(--font-editorial)" }}
                    >
                      “Same Budget. Different Stories.”
                    </span>
                    <span className="block text-[9px] text-[#FFF9F0]/80 tracking-widest uppercase font-mono mt-0.5">
                      {activeHero.coordinates}
                    </span>
                  </div>

                  {/* Terracotta Route Overlay Graphic */}
                  <div className="absolute bottom-4 right-4 z-20 pointer-events-none opacity-85">
                    <svg width="120" height="40" viewBox="0 0 120 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path
                        d="M10 30 Q45 5 80 20 T110 12"
                        stroke="#C85C3A"
                        strokeWidth="2"
                        strokeDasharray="3 4"
                      />
                      <circle cx="10" cy="30" r="3" fill="#172A3A" />
                      <circle cx="80" cy="20" r="3" fill="#C85C3A" />
                      <circle cx="110" cy="12" r="4" fill="#D49A55" />
                    </svg>
                  </div>
                </div>

                {/* Right Edge: Vertical Numbered Destination Selector */}
                <div className="md:col-span-2 flex md:flex-col gap-2 justify-between">
                  {HERO_DESTINATIONS.map((dest, idx) => {
                    const isActive = selectedHeroIndex === idx;
                    return (
                      <button
                        key={dest.id}
                        onClick={() => setSelectedHeroIndex(idx)}
                        className={`p-2.5 rounded-xl border text-left transition-all flex md:flex-col justify-between items-start gap-1 flex-1 ${
                          isActive
                            ? "bg-[#FFF9F0] border-[#C85C3A] shadow-xs"
                            : "bg-[#FFF9F0]/75 border-[#D8C9B5] hover:border-[#172A3A]/40"
                        }`}
                      >
                        <div className="flex items-center justify-between w-full">
                          <span
                            className={`font-serif text-xs font-bold ${
                              isActive ? "text-[#C85C3A]" : "text-[#172A3A]"
                            }`}
                          >
                            {dest.num}
                          </span>
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isActive ? "bg-[#C85C3A]" : "bg-[#D8C9B5]"
                            }`}
                          />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-[#172A3A] leading-tight line-clamp-1">
                            {dest.name}
                          </p>
                          <p className="text-[10px] text-[#746D65]">{dest.country}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 3. HOW WANDER WALLET WORKS — CONNECTED 4-STEP TRAVEL JOURNAL ROUTE */}
      {/* ========================================================================= */}
      <section id="how-it-works" className="py-16 sm:py-20 border-t border-[#D8C9B5] bg-[#F5EEE3]">
        <div className="max-w-[1320px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left Header Column */}
            <div className="lg:col-span-4 space-y-3">
              <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#C85C3A] block">
                HOW IT WORKS
              </span>
              <h2
                className="text-3xl sm:text-4xl lg:text-[42px] font-bold text-[#172A3A] leading-[1.08]"
                style={{ fontFamily: "var(--font-editorial)" }}
              >
                From ideas
                <br />
                to itineraries
              </h2>
              <p className="text-xs sm:text-sm text-[#746D65] leading-relaxed max-w-sm">
                Wander Wallet crafts your journey around real budget limits — connecting research, group consensus, and
                debt settlement into one clean ledger.
              </p>
            </div>

            {/* Right Connected Steps Column */}
            <div className="lg:col-span-8 relative">
              {/* Connecting Terracotta Route Line */}
              <div className="hidden md:block absolute top-7 left-8 right-8 h-0.5 border-t-2 border-dashed border-[#D8C9B5] z-0" />

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 relative z-10">
                {/* Step 01 */}
                <div className="bg-[#FFF9F0] rounded-xl p-5 border border-[#D8C9B5] shadow-2xs hover:border-[#172A3A] transition-all flex flex-col justify-between group">
                  <div>
                    <div className="w-10 h-10 rounded-full bg-[#172A3A] border border-[#D8C9B5] flex items-center justify-center text-[#FFF9F0] font-serif font-bold text-sm mb-3.5 group-hover:bg-[#C85C3A] transition-colors">
                      01
                    </div>
                    <div className="flex items-center gap-1.5 text-[#172A3A] mb-1">
                      <Wallet className="w-3.5 h-3.5 text-[#C85C3A]" />
                      <h3 className="font-serif font-bold text-sm text-[#172A3A]">Set Your Budget</h3>
                    </div>
                    <p className="text-[11px] text-[#746D65] leading-relaxed">
                      Choose a total budget, add your people, and tell us your travel style.
                    </p>
                  </div>
                </div>

                {/* Step 02 */}
                <div className="bg-[#FFF9F0] rounded-xl p-5 border border-[#D8C9B5] shadow-2xs hover:border-[#172A3A] transition-all flex flex-col justify-between group">
                  <div>
                    <div className="w-10 h-10 rounded-full bg-[#172A3A] border border-[#D8C9B5] flex items-center justify-center text-[#FFF9F0] font-serif font-bold text-sm mb-3.5 group-hover:bg-[#C85C3A] transition-colors">
                      02
                    </div>
                    <div className="flex items-center gap-1.5 text-[#172A3A] mb-1">
                      <Compass className="w-3.5 h-3.5 text-[#D49A55]" />
                      <h3 className="font-serif font-bold text-sm text-[#172A3A]">Build Your Trip</h3>
                    </div>
                    <p className="text-[11px] text-[#746D65] leading-relaxed">
                      Get curated transport, stays and experiences that fit your budget.
                    </p>
                  </div>
                </div>

                {/* Step 03 */}
                <div className="bg-[#FFF9F0] rounded-xl p-5 border border-[#D8C9B5] shadow-2xs hover:border-[#172A3A] transition-all flex flex-col justify-between group">
                  <div>
                    <div className="w-10 h-10 rounded-full bg-[#172A3A] border border-[#D8C9B5] flex items-center justify-center text-[#FFF9F0] font-serif font-bold text-sm mb-3.5 group-hover:bg-[#C85C3A] transition-colors">
                      03
                    </div>
                    <div className="flex items-center gap-1.5 text-[#172A3A] mb-1">
                      <Users className="w-3.5 h-3.5 text-[#172A3A]" />
                      <h3 className="font-serif font-bold text-sm text-[#172A3A]">Plan Together</h3>
                    </div>
                    <p className="text-[11px] text-[#746D65] leading-relaxed">
                      Discuss, tweak and finalise with your group in one place.
                    </p>
                  </div>
                </div>

                {/* Step 04 */}
                <div className="bg-[#FFF9F0] rounded-xl p-5 border border-[#D8C9B5] shadow-2xs hover:border-[#172A3A] transition-all flex flex-col justify-between group">
                  <div>
                    <div className="w-10 h-10 rounded-full bg-[#172A3A] border border-[#D8C9B5] flex items-center justify-center text-[#FFF9F0] font-serif font-bold text-sm mb-3.5 group-hover:bg-[#C85C3A] transition-colors">
                      04
                    </div>
                    <div className="flex items-center gap-1.5 text-[#172A3A] mb-1">
                      <Receipt className="w-3.5 h-3.5 text-[#C85C3A]" />
                      <h3 className="font-serif font-bold text-sm text-[#172A3A]">Track & Settle</h3>
                    </div>
                    <p className="text-[11px] text-[#746D65] leading-relaxed">
                      Keep expenses clear and settle fairly after the trip.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 4. REAL TRIPS / REAL BUDGETS — ASYMMETRIC EDITORIAL SHOWCASE */}
      {/* ========================================================================= */}
      <section className="py-16 sm:py-20 border-t border-[#D8C9B5] bg-[#F5EEE3]">
        <div className="max-w-[1320px] mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          {/* Header Row: Editorial Heading Left, Carousel Controls Right */}
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div className="space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#C85C3A] block">
                CURATED EXPERIENCES
              </span>
              <h2
                className="text-2xl sm:text-3xl lg:text-4xl font-bold text-[#172A3A]"
                style={{ fontFamily: "var(--font-editorial)" }}
              >
                Real Trips Planned Around <span className="text-[#C85C3A]">Real Budgets</span>
              </h2>
              <p className="text-xs sm:text-sm text-[#746D65]">
                See how real travellers turned their budgets into incredible journeys.
              </p>
            </div>

            <div className="flex items-center gap-4">
              <Link
                href="/explore"
                className="text-xs font-bold text-[#C85C3A] hover:text-[#b34f2f] flex items-center gap-1 transition"
              >
                <span>Explore All Destinations</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>

              {/* Prev / Next Circular Navigation Buttons */}
              <div className="flex items-center gap-1.5">
                <button
                  onClick={prevCuratedTrip}
                  className="w-8 h-8 rounded-full border border-[#D8C9B5] bg-[#FFF9F0] flex items-center justify-center text-[#172A3A] hover:border-[#C85C3A] hover:text-[#C85C3A] transition shadow-2xs"
                  aria-label="Previous destination"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={nextCuratedTrip}
                  className="w-8 h-8 rounded-full border border-[#D8C9B5] bg-[#FFF9F0] flex items-center justify-center text-[#172A3A] hover:border-[#C85C3A] hover:text-[#C85C3A] transition shadow-2xs"
                  aria-label="Next destination"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Asymmetrical Layout: Dominant Primary Card (60%) + Secondary Stack (40%) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Primary Dominant Destination Card (approx 58%) */}
            <div className="lg:col-span-7 bg-[#FFF9F0] rounded-2xl overflow-hidden border border-[#D8C9B5] shadow-xs flex flex-col group">
              <div className="relative h-[260px] sm:h-[340px] overflow-hidden bg-[#EAE1D3]">
                <img
                  src={primaryTrip.imageUrl}
                  alt={primaryTrip.title}
                  className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent pointer-events-none" />

                <div className="absolute top-4 left-4 px-2.5 py-1 rounded-md bg-[#172A3A]/90 text-[10px] font-semibold text-[#FFF9F0] uppercase tracking-wider">
                  {primaryTrip.tag}
                </div>

                <div className="absolute bottom-4 left-4 right-4 text-[#FFF9F0] flex items-end justify-between">
                  <div>
                    <h3
                      className="font-serif font-bold text-xl sm:text-2xl text-[#FFF9F0]"
                      style={{ fontFamily: "var(--font-editorial)" }}
                    >
                      {primaryTrip.title}
                    </h3>
                    <p className="text-xs text-[#FFF9F0]/80 flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3.5 h-3.5 text-[#D49A55]" />
                      <span>{primaryTrip.region}</span>
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] uppercase tracking-wider text-[#FFF9F0]/70 block">
                      {primaryTrip.days}
                    </span>
                    <span className="font-serif font-bold text-lg text-[#FFF9F0]">{primaryTrip.budget}</span>
                  </div>
                </div>
              </div>

              <div className="p-5 flex items-center justify-between gap-4">
                <p className="text-xs text-[#746D65] leading-relaxed italic">“{primaryTrip.notes}”</p>
                <Link
                  href={`/trips/new?destination=${encodeURIComponent(primaryTrip.destination)}`}
                  className="px-4 py-2 rounded-lg bg-[#172A3A] hover:bg-[#233d52] text-[#FFF9F0] text-xs font-semibold flex-shrink-0 transition flex items-center gap-1.5"
                >
                  <span>Plan This Trip</span>
                  <ArrowRight className="w-3.5 h-3.5 text-[#D49A55]" />
                </Link>
              </div>
            </div>

            {/* Secondary Destinations Stack (approx 42%) */}
            <div className="lg:col-span-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-4">
              {secondaryTrips.slice(0, 2).map((secTrip) => (
                <div
                  key={secTrip.id}
                  className="bg-[#FFF9F0] rounded-xl overflow-hidden border border-[#D8C9B5] shadow-2xs hover:border-[#172A3A] transition-all flex flex-col sm:flex-row group"
                >
                  <div className="relative sm:w-44 h-36 sm:h-auto overflow-hidden bg-[#EAE1D3] flex-shrink-0">
                    <img
                      src={secTrip.imageUrl}
                      alt={secTrip.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                  <div className="p-4 flex-1 flex flex-col justify-between">
                    <div>
                      <span className="text-[9px] font-bold uppercase tracking-wider text-[#C85C3A] block">
                        {secTrip.tag}
                      </span>
                      <h4 className="font-serif font-bold text-sm text-[#172A3A] mt-0.5 group-hover:text-[#C85C3A] transition-colors">
                        {secTrip.title}
                      </h4>
                      <p className="text-[11px] text-[#746D65] mt-0.5 flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-[#D49A55]" />
                        <span>{secTrip.region}</span>
                      </p>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-[#D8C9B5] flex items-center justify-between">
                      <span className="text-[10px] text-[#746D65]">{secTrip.days}</span>
                      <div className="flex items-center gap-2">
                        <span className="font-serif font-bold text-xs text-[#172A3A]">{secTrip.budget}</span>
                        <Link
                          href={`/trips/new?destination=${encodeURIComponent(secTrip.destination)}`}
                          className="w-6 h-6 rounded-full bg-[#172A3A] flex items-center justify-center text-[#FFF9F0] hover:bg-[#C85C3A] transition"
                        >
                          <ArrowRight className="w-3 h-3" />
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 5. FINAL "PLAN LESS. WANDER BETTER." CTA BANNER WITH INTEGRATED FORM */}
      {/* ========================================================================= */}
      <section className="py-14 sm:py-20 border-t border-[#D8C9B5]">
        <div className="max-w-[1320px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative rounded-2xl overflow-hidden border border-[#D8C9B5] shadow-lg bg-[#172A3A]">
            {/* Cinematic Sunset Travel Background */}
            <img
              src="https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&w=1600&q=85"
              alt="Scenic Sunset Travel Journey"
              className="absolute inset-0 w-full h-full object-cover opacity-35 mix-blend-luminosity"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[#172A3A]/95 via-[#172A3A]/85 to-[#172A3A]/70 pointer-events-none" />

            <div className="relative z-10 p-6 sm:p-10 lg:p-12 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              {/* Left CTA Text */}
              <div className="lg:col-span-5 space-y-3 text-left">
                <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#D49A55] block">
                  READY FOR YOUR NEXT JOURNEY?
                </span>
                <h2
                  className="text-4xl sm:text-5xl font-bold text-[#FFF9F0] leading-[1.05]"
                  style={{ fontFamily: "var(--font-editorial)" }}
                >
                  Plan less.
                  <br />
                  <span className="text-[#C85C3A]">Wander better.</span>
                </h2>
                <p className="text-xs sm:text-sm text-[#F5EEE3]/80 leading-relaxed max-w-sm">
                  Start your collaborative travel plan in minutes with automatic budget calculations and itinerary
                  suggestions.
                </p>
              </div>

              {/* Right Horizontal Planning Form */}
              <div className="lg:col-span-7">
                <form
                  onSubmit={handleQuickPlan}
                  className="bg-[#FFF9F0] p-4 sm:p-5 rounded-xl border border-[#D8C9B5] shadow-md grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-left"
                >
                  {/* Where */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-[#746D65] block">
                      Where?
                    </label>
                    <input
                      type="text"
                      value={formDestination}
                      onChange={(e) => setFormDestination(e.target.value)}
                      placeholder="e.g. Manali, Goa, Kyoto"
                      className="w-full h-9 px-2.5 text-xs bg-[#F5EEE3] border border-[#D8C9B5] rounded-md text-[#292726] placeholder-[#746D65]/70 focus:outline-hidden focus:border-[#172A3A]"
                    />
                  </div>

                  {/* When */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-[#746D65] block">
                      When?
                    </label>
                    <select
                      value={formDates}
                      onChange={(e) => setFormDates(e.target.value)}
                      className="w-full h-9 px-2 text-xs bg-[#F5EEE3] border border-[#D8C9B5] rounded-md text-[#292726] focus:outline-hidden focus:border-[#172A3A]"
                    >
                      <option value="This Weekend">This Weekend</option>
                      <option value="Next Month">Next Month</option>
                      <option value="Flexible Dates">Flexible Dates</option>
                    </select>
                  </div>

                  {/* How Many */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-[#746D65] block">
                      How many?
                    </label>
                    <select
                      value={formTravelers}
                      onChange={(e) => setFormTravelers(e.target.value)}
                      className="w-full h-9 px-2 text-xs bg-[#F5EEE3] border border-[#D8C9B5] rounded-md text-[#292726] focus:outline-hidden focus:border-[#172A3A]"
                    >
                      <option value="2 Travelers">2 Travelers</option>
                      <option value="4 Travelers">4 Travelers</option>
                      <option value="6 Travelers">6 Travelers</option>
                      <option value="8+ Travelers">8+ Travelers</option>
                    </select>
                  </div>

                  {/* Budget */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-[#746D65] block">
                      Budget (₹)
                    </label>
                    <input
                      type="number"
                      value={formBudget}
                      onChange={(e) => setFormBudget(e.target.value)}
                      placeholder="50000"
                      className="w-full h-9 px-2.5 text-xs bg-[#F5EEE3] border border-[#D8C9B5] rounded-md text-[#292726] placeholder-[#746D65]/70 focus:outline-hidden focus:border-[#172A3A]"
                    />
                  </div>

                  {/* Submit Button (Full Width in bottom or spanning) */}
                  <div className="sm:col-span-2 lg:col-span-4 pt-1">
                    <button
                      type="submit"
                      className="w-full py-2.5 px-4 rounded-lg bg-[#C85C3A] hover:bg-[#b34f2f] text-[#FFF9F0] text-xs font-semibold transition-all shadow-xs flex items-center justify-center gap-2 group"
                    >
                      <span>Start Planning</span>
                      <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 6. FOOTER — MIDNIGHT NAVY WITH CREAM TEXT */}
      {/* ========================================================================= */}
      <footer className="bg-[#172A3A] text-[#F5EEE3] py-10 border-t border-[#0f1d28]">
        <div className="max-w-[1320px] mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-[#D49A55]">
              <Compass className="w-4 h-4 text-[#D49A55]" />
            </div>
            <div>
              <span
                className="text-base font-bold tracking-tight text-[#FFF9F0] block"
                style={{ fontFamily: "var(--font-brand)" }}
              >
                WANDER WALLET
              </span>
              <span
                className="text-[10px] text-[#F5EEE3]/70 -mt-1 block"
                style={{ fontFamily: "var(--font-script-elegant)" }}
              >
                One Budget · Real Trips
              </span>
            </div>
          </div>

          <div className="flex items-center gap-6 text-xs text-[#F5EEE3]/80">
            <Link href="/" className="hover:text-[#FFF9F0] transition">
              Home
            </Link>
            <Link href="/trips" className="hover:text-[#FFF9F0] transition">
              Trips
            </Link>
            <Link href="/explore" className="hover:text-[#FFF9F0] transition">
              Explore
            </Link>
            <Link href="/ai-planner" className="hover:text-[#FFF9F0] transition">
              AI Planner
            </Link>
            <Link href="/trips/new" className="hover:text-[#FFF9F0] transition">
              Plan a Trip
            </Link>
          </div>

          <p className="text-[11px] text-[#F5EEE3]/60">
            © {new Date().getFullYear()} Wander Wallet. All rights reserved.
          </p>
        </div>
      </footer>

      {/* Video / Walkthrough Modal */}
      {showVideoModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-[#FFF9F0] rounded-2xl p-6 max-w-lg w-full border border-[#D8C9B5] shadow-2xl relative">
            <button
              onClick={() => setShowVideoModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-full text-[#746D65] hover:text-[#172A3A] hover:bg-[#EAE1D3] transition"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 mb-3">
              <Compass className="w-4 h-4 text-[#C85C3A]" />
              <h3 className="font-serif text-lg font-bold text-[#172A3A]">How Wander Wallet Works</h3>
            </div>
            <p className="text-xs text-[#746D65] leading-relaxed mb-4">
              Watch how Wander Wallet combines budget constraints, verified travel research, day-by-day itineraries,
              receipt OCR, and autonomous debt simplification.
            </p>
            <div className="aspect-video rounded-xl overflow-hidden bg-[#FFF9F0] border border-[#D8C9B5] flex flex-col items-center justify-center text-center p-6 space-y-2">
              <Play className="w-10 h-10 text-[#C85C3A] fill-current" />
              <p className="font-serif font-bold text-sm text-[#172A3A]">Interactive Product Walkthrough</p>
              <p className="text-[11px] text-[#746D65] max-w-xs">
                From budget lock-in to final UPI settlement — one shared financial truth.
              </p>
            </div>
            <div className="mt-5 flex justify-end">
              <Link
                href="/trips/new"
                onClick={() => setShowVideoModal(false)}
                className="px-4 py-2 rounded-lg bg-[#C85C3A] text-[#FFF9F0] text-xs font-semibold hover:bg-[#b34f2f] transition"
              >
                Start Your First Trip →
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
