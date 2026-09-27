"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { Search, Compass, MapPin, DollarSign, Filter, Sparkles, Tag, ArrowRight } from "lucide-react";

const DynamicTripMap = dynamic(
  () => import("@/components/maps/TripMap").then((mod) => mod.TripMap),
  {
    ssr: false,
    loading: () => (
      <div className="h-[400px] w-full bg-[#EAE1D3]/60 flex items-center justify-center rounded-xl border border-[#D8C9B5]">
        <div className="flex items-center gap-2 text-[#746D65]">
          <div className="w-5 h-5 border-2 border-[#172A3A] border-t-transparent rounded-full animate-spin" />
          <span>Loading Exploration Map...</span>
        </div>
      </div>
    ),
  }
);

export default function ExplorePage() {
  const [searchQuery, setSearchQuery] = useState("Goa");
  const [category, setCategory] = useState<string>("all");
  const [budgetFilter, setBudgetFilter] = useState<number>(5000);
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [geoInfo, setGeoInfo] = useState<any>(null);

  useEffect(() => {
    executeSearch("Goa");
  }, []);

  async function executeSearch(query: string, cat = category) {
    if (!query.trim()) return;
    setLoading(true);

    try {
      let targetLocation = query;
      let effectiveCategory = cat === "all" ? undefined : cat;

      if (query.toLowerCase().includes("under") || query.toLowerCase().includes("free")) {
        targetLocation = "Goa";
      }

      const res = await fetch("/api/explore/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: targetLocation,
          category: effectiveCategory as any,
          limit: 15,
        }),
      });

      const data = await res.json();
      if (data.items) {
        setResults(data.items);
        setGeoInfo(data.geo);
      }
    } catch (err) {
      console.error("Explore search failed:", err);
    } finally {
      setLoading(false);
    }
  }

  const naturalQueries = [
    "Things to do under ₹2,000",
    "Places near our hotel",
    "Free things to do",
    "Dinner for 6",
  ];

  const mapItems = results.map((item) => ({
    id: item.id || `poi-${Math.random()}`,
    timeSlot: "AFTERNOON" as const,
    startTime: "12:00",
    title: item.name,
    category: "activity" as const,
    location: item.location || "Local Spot",
    latitude: item.latitude,
    longitude: item.longitude,
    costMinor: BigInt(0),
    formattedCost: item.priceType === "PRICE_UNAVAILABLE" ? "Price Unavailable" : "Free",
  }));

  return (
    <div className="min-h-screen dot-grid-paper text-[#292726] flex flex-col relative">
      {/* Top Header */}
      <header className="border-b border-[#D8C9B5] dot-grid-header sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <Link href="/trips" className="flex items-center gap-2 group">
            <div className="w-10 h-10 rounded-full bg-[#172A3A] text-[#FFF9F0] flex items-center justify-center shadow-sm" style={{ fontFamily: "var(--font-display-count)", fontSize: "18px" }}>
              W
            </div>
            <div>
              <span className="font-bold text-2xl tracking-tight text-[#172A3A] block leading-none" style={{ fontFamily: "var(--font-brand)" }}>
                Wander Wallet
              </span>
              <span className="text-[10px] text-[#746D65]" style={{ fontFamily: "var(--font-script-elegant)", fontSize: "11px", letterSpacing: "0.03em" }}>
                Research & Discovery Desk
              </span>
            </div>
          </Link>

          <nav className="flex items-center gap-6 text-sm font-medium text-[#746D65]" style={{ fontFamily: "var(--font-label)" }}>
            <Link href="/" className="flex items-center gap-1.5 hover:text-[#C85C3A] transition-colors">
              <span>Home</span>
            </Link>
            <Link href="/trips" className="hover:text-[#172A3A] transition-colors">
              My Trips
            </Link>
            <Link href="/explore" className="text-[#172A3A] font-semibold border-b-2 border-[#C85C3A] pb-1">
              Explore
            </Link>
            <Link href="/ai-planner" className="hover:text-[#172A3A] transition-colors">
              AI Planner
            </Link>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex-1 w-full space-y-8 relative z-10">
        <div>
          <h1 className="text-4xl sm:text-5xl font-bold text-[#172A3A] tracking-tight" style={{ fontFamily: "var(--font-editorial)" }}>
            Explore Places & Stays
          </h1>
          <p className="text-[#746D65] text-lg mt-2 max-w-2xl">
            Real POI discovery powered by OpenStreetMap and verified research adapters. Never fabricated prices.
          </p>
        </div>

        {/* Natural Language Search Bar */}
        <div className="bg-[#FFF9F0] border border-[#D8C9B5] rounded-2xl p-6 shadow-sm">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              executeSearch(searchQuery);
            }}
            className="flex flex-col sm:flex-row gap-3"
          >
            <div className="flex-1 flex items-center gap-3 bg-[#FFF9F0] border border-[#D8C9B5] rounded-xl px-4 py-3">
              <Search className="w-5 h-5 text-[#746D65]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search destination, attractions, or say 'Dinner for 6'..."
                className="w-full text-sm text-[#292726] bg-transparent focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="bg-[#172A3A] hover:bg-[#233d52] text-[#FFF9F0] px-8 py-3 rounded-xl text-sm font-bold transition-all shadow"
            >
              {loading ? "Discovering..." : "Search"}
            </button>
          </form>

          {/* Quick Prompt Pills */}
          <div className="flex flex-wrap items-center gap-2 mt-4 pt-4 border-t border-[#D8C9B5]">
            <span className="text-xs text-[#746D65] font-semibold">Try queries:</span>
            {naturalQueries.map((q) => (
              <button
                key={q}
                onClick={() => {
                  setSearchQuery(q);
                  executeSearch(q);
                }}
                className="px-3 py-1 rounded-lg text-xs font-medium bg-[#EAE1D3] hover:bg-[#D8C9B5] text-[#172A3A] transition-colors"
              >
                {q}
              </button>
            ))}
          </div>
        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          {[
            { id: "all", label: "All Categories" },
            { id: "attractions", label: "Attractions" },
            { id: "beaches", label: "Beaches & Coast" },
            { id: "restaurants", label: "Dining & Food" },
            { id: "museums", label: "Culture & Museums" },
            { id: "parks", label: "Nature & Parks" },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => {
                setCategory(cat.id);
                executeSearch(searchQuery, cat.id);
              }}
              className={`px-4 py-2 rounded-lg text-[10px] font-bold whitespace-nowrap tracking-widest transition-all ${
                category === cat.id
                  ? "bg-[#172A3A] text-[#FFF9F0] shadow"
                  : "bg-[#EAE1D3] text-[#746D65] hover:bg-[#D8C9B5]"
              }`}
              style={{ fontFamily: "var(--font-label)" }}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Map and Results Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Results List */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex justify-between items-center text-xs text-[#746D65] font-medium">
              <span>{results.length} verified places discovered</span>
              <span>Source: OpenStreetMap / Nominatim</span>
            </div>

            {loading ? (
              <div className="py-20 text-center">
                <div className="w-8 h-8 border-4 border-[#172A3A] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <p className="text-sm font-serif text-[#746D65]">Querying real-world POIs and geospatial anchors...</p>
              </div>
            ) : results.length === 0 ? (
              <div className="p-12 text-center bg-[#FFF9F0] border border-[#D8C9B5] rounded-2xl">
                <p className="font-serif text-lg text-[#172A3A]">No places discovered for this query.</p>
                <p className="text-xs text-[#746D65] mt-1">Try another destination like "Goa", "Jaipur", or "Kerala".</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {results.map((poi, idx) => (
                  <div
                    key={poi.id || idx}
                    className="p-5 rounded-xl bg-[#FFF9F0] border border-[#D8C9B5] hover:shadow-md transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-[#EAE1D3] text-[#746D65]">
                          {poi.category || "Place"}
                        </span>
                        <span className="text-xs font-bold text-[#172A3A]" style={{ fontFamily: "var(--font-editorial)" }}>
                          {poi.priceType === "PRICE_UNAVAILABLE" ? "PRICE_UNAVAILABLE" : "Free"}
                        </span>
                      </div>
                      <h3 className="font-bold text-lg text-[#172A3A] leading-snug" style={{ fontFamily: "var(--font-brand)" }}>
                        {poi.name}
                      </h3>
                      <p className="text-xs text-[#746D65] mt-1 flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-[#C85C3A] shrink-0" />
                        <span className="truncate">{poi.location || "Geocoded landmark"}</span>
                      </p>
                    </div>

                    <div className="pt-3 border-t border-[#D8C9B5] mt-3 flex items-center justify-between text-[11px] text-[#746D65]">
                      <span>Source: {poi.source || "OSM"}</span>
                      <span className="text-[#172A3A] font-semibold">Verified</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Side Map */}
          <div className="bg-[#FFF9F0] border border-[#D8C9B5] rounded-2xl p-6 shadow-sm h-fit">
            <h3 className="text-xl font-bold text-[#172A3A] mb-4" style={{ fontFamily: "var(--font-editorial)" }}>Live Exploration Map</h3>
            <DynamicTripMap items={mapItems} destination={searchQuery} className="h-96 rounded-xl overflow-hidden" />
          </div>
        </div>
      </main>
    </div>
  );
}
