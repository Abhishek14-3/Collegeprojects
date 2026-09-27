"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Trash2, AlertTriangle, X, CheckCircle2, Loader2, Calendar, MapPin, Compass, QrCode, Share2 } from "lucide-react";
import { formatCurrency } from "@/lib/budget/engine";
import { TripInviteModal } from "@/components/trips/TripInviteModal";

interface TripSummary {
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
  travelStyle: string;
  interests: string[];
  status: string;
  heroImageUrl?: string;
  membersCount: number;
  totalSpendMinor: string | number;
  remainingBudgetMinor: string | number;
  members: Array<{
    id: string;
    name: string;
    avatarUrl?: string;
    role: string;
  }>;
}

export default function TripsDashboardPage() {
  const [trips, setTrips] = useState<TripSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"ALL" | "PLANNING" | "ACTIVE" | "COMPLETED">("ALL");
  const [planToCancel, setPlanToCancel] = useState<TripSummary | null>(null);
  const [inviteModalTrip, setInviteModalTrip] = useState<TripSummary | null>(null);
  const [canceling, setCanceling] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [userCurrency, setUserCurrency] = useState<string>("INR");
  const [exchangeRate, setExchangeRate] = useState<number>(1.0);

  useEffect(() => {
    // 1. Fetch user currency preference from localStorage and profile
    const localCurr = typeof window !== "undefined" ? localStorage.getItem("wander_user_currency") : null;
    if (localCurr) {
      setUserCurrency(localCurr);
    }

    fetch("/api/user/profile")
      .then((res) => res.json())
      .then((data) => {
        if (data.profile?.currencyPreference) {
          setUserCurrency(data.profile.currencyPreference);
          if (typeof window !== "undefined") {
            localStorage.setItem("wander_user_currency", data.profile.currencyPreference);
          }
        }
      })
      .catch((e) => console.warn("Profile fetch note:", e));

    fetchTrips();
  }, []);

  useEffect(() => {
    if (userCurrency.toUpperCase() === "INR") {
      setExchangeRate(1.0);
      return;
    }
    fetch(`/api/currency/rates?from=INR&to=${userCurrency.toUpperCase()}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.rate && typeof data.rate === "number") {
          setExchangeRate(data.rate);
        }
      })
      .catch((err) => console.warn("Exchange rate fetch on trips page:", err));
  }, [userCurrency]);

  const formatTripMoney = (
    minorAmount: string | number | undefined | null,
    tripCurrency?: string
  ): string => {
    const minor = Number(minorAmount || 0);
    const curr = tripCurrency || userCurrency || "INR";
    if (curr.toUpperCase() === "INR") {
      return formatCurrency(BigInt(minor), "INR");
    }
    const convertedMinor = BigInt(Math.round(minor * exchangeRate));
    return formatCurrency(convertedMinor, curr);
  };

  async function fetchTrips() {
    try {
      setLoading(true);
      const res = await fetch("/api/trips");
      const data = await res.json();
      if (data.success && data.trips) {
        setTrips(data.trips);
      }
    } catch (err) {
      console.error("Failed to load trips:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirmCancelPlan() {
    if (!planToCancel) return;
    try {
      setCanceling(true);
      const res = await fetch(`/api/trips/${planToCancel.id}`, {
        method: "DELETE",
      });
      const data = await res.json();

      if (data.success) {
        setTrips((prev) => prev.filter((t) => t.id !== planToCancel.id));
        setToastMessage(`Plan "${planToCancel.title}" has been cancelled.`);
        setPlanToCancel(null);
        setTimeout(() => setToastMessage(null), 4000);
      } else {
        alert(data.error || "Failed to cancel trip plan. Please try again.");
      }
    } catch (err) {
      console.error("Error cancelling plan:", err);
      alert("Error connecting to server. Please try again.");
    } finally {
      setCanceling(false);
    }
  }

  const filteredTrips = trips.filter((t) => {
    if (filter === "ALL") return true;
    return t.status === filter;
  });

  const totalBudgetManaged = trips.reduce(
    (sum, t) => sum + Number(t.groupBudgetMinor || 0),
    0
  );
  const totalSpend = trips.reduce(
    (sum, t) => sum + Number(t.totalSpendMinor || 0),
    0
  );

  return (
    <div className="min-h-screen dot-grid-paper text-[#292726] relative">
      {/* Top Navigation */}
      <header className="border-b border-[#D8C9B5] dot-grid-header sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="w-10 h-10 rounded-full bg-[#172A3A] text-[#FFF9F0] flex items-center justify-center shadow-sm group-hover:bg-[#233d52] transition-colors" style={{ fontFamily: "var(--font-display-count)", fontSize: "18px" }}>
                W
              </div>
              <div>
                <span className="font-bold text-2xl tracking-tight text-[#172A3A] block leading-none" style={{ fontFamily: "var(--font-brand)" }}>
                  Wander Wallet
                </span>
                <span className="text-[10px] uppercase tracking-widest text-[#746D65]" style={{ fontFamily: "var(--font-script-elegant)", fontSize: "11px", textTransform: "none", letterSpacing: "0.04em" }}>
                  Group Travel Workspace
                </span>
              </div>
            </Link>
          </div>

          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-[#746D65]" style={{ fontFamily: "var(--font-label)" }}>
            <Link href="/" className="flex items-center gap-1.5 hover:text-[#172A3A] transition-colors group">
              <span>Home</span>
            </Link>
            <Link href="/trips" className="text-[#172A3A] font-semibold border-b-2 border-[#C85C3A] pb-1">
              My Trips
            </Link>
            <Link href="/explore" className="hover:text-[#172A3A] transition-colors">
              Explore
            </Link>
            <Link href="/ai-planner" className="hover:text-[#172A3A] transition-colors">
              AI Planner
            </Link>
            <Link href="/profile" className="hover:text-[#172A3A] transition-colors">
              Profile
            </Link>
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href="/trips/new"
              className="bg-[#172A3A] hover:bg-[#233d52] text-[#FFF9F0] px-4 py-2.5 rounded-lg text-sm font-medium transition-all shadow-sm flex items-center gap-2"
            >
              <span>+ Plan New Trip</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Editorial Heading */}
        <div className="mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#EAE1D3] text-[#746D65] text-[10px] font-semibold uppercase tracking-widest mb-3" style={{ fontFamily: "var(--font-label)" }}>
            <span>Passports Ready</span>
            <span>•</span>
            <span>{trips.length} Active Journeys</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold text-[#172A3A] tracking-tight" style={{ fontFamily: "var(--font-editorial)" }}>
            Travel Workspaces
          </h1>
          <p className="mt-2 text-[#746D65] text-lg max-w-2xl">
            Coordinated group travel with shared budgets, real-time expenses, and deterministic settlements.
          </p>
        </div>

        {/* High-Level Overview Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-10">
          <div className="bg-[#FFF9F0] border border-[#D8C9B5] rounded-xl p-6 shadow-sm">
            <div className="text-[10px] uppercase tracking-widest text-[#746D65] font-semibold mb-1" style={{ fontFamily: "var(--font-label)" }}>
              Total Budget Managed
            </div>
            <div className="text-3xl font-bold text-[#172A3A]" style={{ fontFamily: "var(--font-display-count)" }}>
              {formatTripMoney(totalBudgetManaged, userCurrency)}
            </div>
            <div className="text-xs text-[#746D65] mt-2 flex items-center gap-1">
              <span>Across {trips.length} group trips</span>
            </div>
          </div>

          <div className="bg-[#FFF9F0] border border-[#D8C9B5] rounded-xl p-6 shadow-sm">
            <div className="text-[10px] uppercase tracking-widest text-[#746D65] font-semibold mb-1" style={{ fontFamily: "var(--font-label)" }}>
              Tracked Spend
            </div>
            <div className="text-3xl font-bold text-[#C85C3A]" style={{ fontFamily: "var(--font-display-count)" }}>
              {formatTripMoney(totalSpend, userCurrency)}
            </div>
            <div className="text-xs text-[#746D65] mt-2">
              {totalBudgetManaged > 0
                ? `${Math.round((totalSpend / totalBudgetManaged) * 100)}% of total pooled budget`
                : "No active spend"}
            </div>
          </div>

          <div className="bg-[#FFF9F0] border border-[#D8C9B5] rounded-xl p-6 shadow-sm">
            <div className="text-xs uppercase tracking-wider text-[#746D65] font-semibold mb-1">
              Wander Desk Intelligence
            </div>
            <div className="text-sm text-[#292726] mt-1 mb-2 font-medium">
              Deterministic travel calculations & itinerary reasoning
            </div>
            <Link
              href="/ai-planner"
              className="inline-flex items-center text-xs font-semibold text-[#172A3A] hover:text-[#C85C3A] transition-colors"
            >
              <span>Consult Wander Desk</span>
              <span className="ml-1">→</span>
            </Link>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center justify-between border-b border-[#D8C9B5] pb-4 mb-8">
          <div className="flex items-center gap-2">
            {(["ALL", "PLANNING", "ACTIVE", "COMPLETED"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setFilter(tab)}
                className={`px-4 py-2 rounded-lg text-[10px] font-semibold tracking-widest transition-all ${
                  filter === tab
                    ? "bg-[#172A3A] text-[#FFF9F0] shadow-sm"
                    : "bg-[#EAE1D3] text-[#746D65] hover:bg-[#D8C9B5]"
                }`}
                style={{ fontFamily: "var(--font-label)" }}
              >
                {tab === "ALL" ? "All Trips" : tab.charAt(0) + tab.slice(1).toLowerCase()}
              </button>
            ))}
          </div>

          <div className="text-xs text-[#746D65] font-medium hidden sm:block">
            Showing {filteredTrips.length} {filteredTrips.length === 1 ? "journey" : "journeys"}
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="py-20 text-center">
            <div className="inline-block w-8 h-8 border-4 border-[#172A3A]/20 border-t-[#172A3A] rounded-full animate-spin mb-4" />
            <p className="text-[#746D65] font-serif text-lg">Fetching your journeys...</p>
          </div>
        )}

        {/* Empty State */}
        {!loading && filteredTrips.length === 0 && (
          <div className="bg-[#FFF9F0] border-2 border-dashed border-[#D8C9B5] rounded-2xl p-12 text-center max-w-xl mx-auto my-12">
            <div className="w-16 h-16 rounded-full bg-[#EAE1D3] flex items-center justify-center mx-auto mb-4 text-2xl">
              🗺️
            </div>
            <h3 className="font-serif text-2xl font-bold text-[#172A3A]">No trips found</h3>
            <p className="text-[#746D65] text-sm mt-2 mb-6">
              Create your first shared trip to research verified stays, calculate group splits, and settle debts cleanly.
            </p>
            <Link
              href="/trips/new"
              className="inline-flex items-center gap-2 bg-[#172A3A] hover:bg-[#233d52] text-[#FFF9F0] px-6 py-3 rounded-lg text-sm font-semibold transition-all shadow"
            >
              <span>Start Planning</span>
              <span>→</span>
            </Link>
          </div>
        )}

        {/* Trips Grid */}
        {!loading && filteredTrips.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredTrips.map((trip) => {
              const budgetMinor = Number(trip.groupBudgetMinor || 0);
              const spendMinor = Number(trip.totalSpendMinor || 0);
              const percentUsed = budgetMinor > 0 ? Math.min(100, Math.round((spendMinor / budgetMinor) * 100)) : 0;
              const cardCurrency = trip.currency || userCurrency || "INR";

              return (
                <div
                  key={trip.id}
                  className="bg-[#FFF9F0] border border-[#D8C9B5] rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col group"
                >
                  {/* Hero Card Visual */}
                  <div className="relative h-48 w-full bg-[#EAE1D3] overflow-hidden">
                    {trip.heroImageUrl ? (
                      <img
                        src={trip.heroImageUrl}
                        alt={trip.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center font-serif text-3xl text-[#746D65]">
                        {trip.destination}
                      </div>
                    )}

                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20" />

                    {/* Status Badge */}
                    <div className="absolute top-4 left-4">
                      <span className="px-3 py-1 rounded-md text-[11px] font-semibold tracking-wider uppercase bg-[#FFF9F0]/95 text-[#172A3A] shadow-sm">
                        {trip.status}
                      </span>
                    </div>

                    {/* Duration Badge */}
                    <div className="absolute top-4 right-4">
                      <span className="px-3 py-1 rounded-md text-[11px] font-semibold bg-[#172A3A]/80 text-[#FFF9F0]">
                        {trip.numberOfDays} Days • {trip.numberOfTravelers} Travelers
                      </span>
                    </div>

                    {/* Card Title & Destination */}
                    <div className="absolute bottom-4 left-4 right-4 text-white">
                      <h2 className="font-bold text-xl leading-snug drop-shadow-sm" style={{ fontFamily: "var(--font-brand)" }}>
                        {trip.title}
                      </h2>
                      <p className="text-xs text-white/90 drop-shadow-sm flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3.5 h-3.5 text-[#D49A55]" />
                        <span>{trip.destination}</span>
                      </p>
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="p-6 flex-1 flex flex-col justify-between">
                    <div>
                      {/* Dates and Travel Style */}
                      <div className="flex items-center justify-between text-xs text-[#746D65] mb-4 pb-3 border-b border-[#D8C9B5]">
                        <span>{trip.startDate} to {trip.endDate}</span>
                        <span className="font-semibold text-[#172A3A]">{trip.travelStyle}</span>
                      </div>

                      {/* Budget Gauge */}
                      <div className="mb-5">
                        <div className="flex justify-between items-baseline text-xs mb-1.5">
                          <span className="font-semibold text-[#292726]">Spend Progress</span>
                          <span className="font-serif font-bold text-[#172A3A]">
                            {formatTripMoney(spendMinor, cardCurrency)} / {formatTripMoney(budgetMinor, cardCurrency)}
                          </span>
                        </div>
                        <div className="w-full bg-[#EAE1D3] h-2.5 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              percentUsed > 90 ? "bg-[#C85C3A]" : "bg-[#172A3A]"
                            }`}
                            style={{ width: `${percentUsed}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-[11px] text-[#746D65] mt-1">
                          <span>{percentUsed}% spent</span>
                          <span>{formatTripMoney(Math.max(0, budgetMinor - spendMinor), cardCurrency)} left</span>
                        </div>
                      </div>

                      {/* Travelers Stack */}
                      <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center -space-x-2">
                          {(trip.members || []).slice(0, 4).map((m, idx) => (
                            <img
                              key={m.id || idx}
                              src={m.avatarUrl || `https://images.unsplash.com/photo-${1534528741775 + idx}?auto=format&fit=crop&w=100&q=80`}
                              alt={m.name}
                              className="w-7 h-7 rounded-full border-2 border-[#FFF9F0] object-cover"
                              title={m.name}
                            />
                          ))}
                          {trip.membersCount > 4 && (
                            <div className="w-7 h-7 rounded-full bg-[#EAE1D3] border-2 border-[#FFF9F0] flex items-center justify-center text-[10px] font-bold text-[#292726]">
                              +{trip.membersCount - 4}
                            </div>
                          )}
                        </div>
                        <span className="text-xs font-medium text-[#746D65]">
                          {trip.membersCount} {trip.membersCount === 1 ? "Traveler" : "Travelers"}
                        </span>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="pt-2 flex flex-col gap-2">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/trips/${trip.id}`}
                          className="flex-1 bg-[#172A3A] hover:bg-[#233d52] text-[#FFF9F0] py-2.5 rounded-lg text-center text-sm font-semibold transition-all shadow-sm block"
                        >
                          Open Workspace →
                        </Link>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            setInviteModalTrip(trip);
                          }}
                          className="px-3 py-2.5 rounded-lg border border-[#D8C9B5] hover:border-[#172A3A] text-[#172A3A] bg-[#FFF9F0] hover:bg-[#F5EEE3] transition-all text-xs font-semibold flex items-center gap-1.5 shrink-0"
                          title="Invite travelers with QR code"
                        >
                          <QrCode className="w-3.5 h-3.5 text-[#C85C3A]" />
                          <span>QR Invite</span>
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            setPlanToCancel(trip);
                          }}
                          className="p-2.5 rounded-lg border border-[#D8C9B5] hover:border-[#C85C3A] text-[#746D65] hover:text-[#C85C3A] hover:bg-[#C85C3A]/10 transition-all shrink-0"
                          title="Cancel this trip plan"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-[#C85C3A]" />
                        </button>
                      </div>

                      {/* Quick Links */}
                      <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[#D8C9B5] text-[11px] text-center text-[#746D65]">
                        <Link href={`/trips/${trip.id}?tab=itinerary`} className="hover:text-[#172A3A] py-1">
                          Itinerary
                        </Link>
                        <Link href={`/trips/${trip.id}?tab=expenses`} className="hover:text-[#172A3A] py-1 border-x border-[#D8C9B5]">
                          Expenses
                        </Link>
                        <Link href={`/trips/${trip.id}?tab=settlement`} className="hover:text-[#172A3A] py-1">
                          Settlement
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#172A3A] text-[#FFF9F0] px-5 py-3 rounded-xl shadow-xl flex items-center gap-3 border border-[#D8C9B5]/40 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <CheckCircle2 className="w-5 h-5 text-[#D49A55]" />
          <span className="text-sm font-medium">{toastMessage}</span>
          <button
            onClick={() => setToastMessage(null)}
            className="text-[#FFF9F0]/70 hover:text-[#FFF9F0] p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Cancel Plan Confirmation Modal */}
      {planToCancel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#FFF9F0] border border-[#D8C9B5] rounded-2xl p-6 sm:p-8 max-w-md w-full shadow-2xl relative text-[#172A3A]">
            <button
              onClick={() => !canceling && setPlanToCancel(null)}
              className="absolute top-5 right-5 text-[#746D65] hover:text-[#172A3A] p-1 rounded-full hover:bg-[#EAE1D3] transition-colors"
              disabled={canceling}
            >
              <X className="w-5 h-5" />
            </button>

            {/* Warning Icon Badge */}
            <div className="w-12 h-12 rounded-xl bg-[#FDF0EB] text-[#C85C3A] flex items-center justify-center mb-4">
              <AlertTriangle className="w-6 h-6 text-[#C85C3A]" />
            </div>

            <h3 className="text-2xl font-bold text-[#172A3A] tracking-tight" style={{ fontFamily: "var(--font-brand)" }}>
              Cancel Trip Plan?
            </h3>
            
            <p className="text-sm text-[#746D65] mt-2 leading-relaxed">
              Are you sure you want to cancel and remove{" "}
              <strong className="text-[#172A3A]">"{planToCancel.title}"</strong>?
            </p>

            <div className="my-4 p-3.5 rounded-xl bg-[#F5EEE3] border border-[#D8C9B5] text-xs text-[#746D65] space-y-1.5">
              <div className="flex items-center gap-2 text-[#172A3A] font-medium">
                <MapPin className="w-3.5 h-3.5 text-[#C85C3A]" />
                <span>{planToCancel.destination}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5 text-[#172A3A]" />
                <span>{planToCancel.startDate} to {planToCancel.endDate} ({planToCancel.numberOfDays} days)</span>
              </div>
              <div className="text-[11px] text-[#746D65] pt-1">
                All associated itineraries, budgets, and workspace notes will be removed.
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={() => setPlanToCancel(null)}
                disabled={canceling}
                className="px-5 py-2.5 rounded-lg border border-[#D8C9B5] hover:bg-[#EAE1D3] text-sm font-semibold text-[#172A3A] transition-all disabled:opacity-50"
              >
                Keep Plan
              </button>

              <button
                type="button"
                onClick={handleConfirmCancelPlan}
                disabled={canceling}
                className="px-5 py-2.5 rounded-lg bg-[#C85C3A] hover:bg-[#b34f2f] text-[#FFF9F0] text-sm font-semibold transition-all shadow hover:shadow-md flex items-center gap-2 disabled:opacity-50"
              >
                {canceling ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Cancelling...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Yes, Cancel Plan</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Trip Invite Modal (QR Code & Instant Share) */}
      {inviteModalTrip && (
        <TripInviteModal
          isOpen={!!inviteModalTrip}
          onClose={() => setInviteModalTrip(null)}
          tripId={inviteModalTrip.id}
          tripTitle={inviteModalTrip.title}
          destination={inviteModalTrip.destination}
          membersCount={inviteModalTrip.membersCount || 1}
          currency={inviteModalTrip.currency || userCurrency || "INR"}
          onManualInvite={async (name, email, role, plannedAmount) => {
            const plannedMinor = BigInt(Math.round(Number(plannedAmount || 10000) * 100)).toString();
            await fetch(`/api/trips/${inviteModalTrip.id}/members`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                name,
                email: email || undefined,
                role,
                plannedContributionMinor: plannedMinor,
              }),
            });
            fetchTrips();
          }}
        />
      )}
    </div>
  );
}
