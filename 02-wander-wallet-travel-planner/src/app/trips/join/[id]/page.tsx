"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  MapPin,
  Calendar,
  Users,
  CheckCircle,
  ArrowRight,
  Shield,
  Sparkles,
  Plane,
  Compass,
  Loader2,
} from "lucide-react";
import { formatCurrency } from "@/lib/budget/engine";

const PRESET_AVATARS = [
  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80",
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80",
  "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80",
  "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80",
  "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=200&q=80",
  "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=200&q=80",
  "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=200&q=80",
  "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=200&q=80",
];

export default function JoinTripPage() {
  const params = useParams();
  const tripId = typeof params?.id === "string" ? params.id : "";
  const router = useRouter();

  const [trip, setTrip] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [name, setName] = useState("");
  const [selectedAvatar, setSelectedAvatar] = useState(PRESET_AVATARS[0]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!tripId) return;

    fetch(`/api/trips/${tripId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.trip) {
          setTrip(data.trip);
        } else {
          setError("Trip not found or link has expired.");
        }
      })
      .catch((err) => {
        console.error("Error fetching trip:", err);
        setError("Failed to load trip invitation.");
      })
      .finally(() => setLoading(false));
  }, [tripId]);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Please enter your name to join.");
      return;
    }

    try {
      setJoining(true);
      setError(null);

      const res = await fetch(`/api/trips/${tripId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          avatarUrl: selectedAvatar,
          role: "MEMBER",
        }),
      });

      const data = await res.json();
      if (data.success) {
        // Save current traveler session identifier for direct recognition
        if (typeof window !== "undefined") {
          localStorage.setItem(`wander_member_${tripId}`, name.trim());
        }
        router.push(`/trips/${tripId}`);
      } else {
        setError(data.error || "Failed to join trip. Please try again.");
      }
    } catch (err) {
      console.error(err);
      setError("Connection error. Please try again.");
    } finally {
      setJoining(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen dot-grid-paper flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <Loader2 className="w-8 h-8 text-[#C85C3A] animate-spin mx-auto" />
          <p className="font-serif text-lg text-[#172A3A]">Opening Travel Pass...</p>
        </div>
      </div>
    );
  }

  if (error && !trip) {
    return (
      <div className="min-h-screen dot-grid-paper flex items-center justify-center p-4">
        <div className="bg-[#FFF9F0] border border-[#D8C9B5] rounded-3xl p-8 max-w-md w-full text-center space-y-4 shadow-md">
          <div className="w-12 h-12 rounded-full bg-[#C85C3A]/10 text-[#C85C3A] flex items-center justify-center mx-auto text-xl font-bold">
            !
          </div>
          <h2 className="font-serif text-2xl font-bold text-[#172A3A]">Trip Invitation</h2>
          <p className="text-xs text-[#746D65]">{error}</p>
          <Link
            href="/trips"
            className="inline-block bg-[#172A3A] text-white px-6 py-2.5 rounded-xl text-xs font-bold"
          >
            Go to My Trips
          </Link>
        </div>
      </div>
    );
  }

  const budgetMinor = trip?.groupBudgetMinor ? BigInt(trip.groupBudgetMinor) : BigInt(0);
  const currency = trip?.currency || "INR";

  return (
    <div className="min-h-screen dot-grid-paper text-[#292726] flex flex-col justify-center items-center p-4 sm:p-6 relative">
      {/* Brand Header */}
      <div className="text-center mb-6">
        <Link href="/" className="inline-flex items-center gap-2 group">
          <div className="w-9 h-9 rounded-full bg-[#172A3A] text-[#FFF9F0] flex items-center justify-center shadow-xs font-bold text-sm">
            W
          </div>
          <span className="font-bold text-xl tracking-tight text-[#172A3A]" style={{ fontFamily: "var(--font-brand)" }}>
            Wander Wallet
          </span>
        </Link>
      </div>

      {/* Main Passport Join Card */}
      <div className="bg-[#FFF9F0] border-2 border-[#D8C9B5] rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl relative">
        {/* Top Hero Banner */}
        <div className="relative h-44 bg-[#172A3A] p-6 text-white flex flex-col justify-between overflow-hidden">
          {trip?.heroImageUrl && (
            <img
              src={trip.heroImageUrl}
              alt={trip.title}
              className="absolute inset-0 w-full h-full object-cover opacity-40 mix-blend-overlay"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#172A3A] via-[#172A3A]/60 to-transparent" />

          <div className="relative z-10 flex items-center justify-between">
            <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#D49A55] bg-[#FFF9F0]/10 px-2.5 py-1 rounded-sm backdrop-blur-xs border border-[#D49A55]/30">
              Trip Invitation
            </span>
            <span className="text-xs font-mono text-[#FFF9F0]/80">
              {trip?.numberOfDays || 5} Days Trip
            </span>
          </div>

          <div className="relative z-10">
            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#FFF9F0] leading-tight drop-shadow-sm">
              {trip?.title || "Vacation Plan"}
            </h1>
            <p className="text-xs text-[#D49A55] flex items-center gap-1 mt-1 font-mono">
              <MapPin className="w-3.5 h-3.5" />
              <span>{trip?.destination || "Destination"}</span>
              <span className="mx-1 text-[#FFF9F0]/40">·</span>
              <span>{trip?.startDate}</span>
            </p>
          </div>
        </div>

        {/* Form Body */}
        <div className="p-6 sm:p-8 space-y-6">
          {/* Group Overview Bar */}
          <div className="p-3.5 bg-[#F5EEE3] border border-[#D8C9B5] rounded-xl flex items-center justify-between text-xs font-mono">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-[#C85C3A]" />
              <span className="font-bold text-[#172A3A]">
                {trip?.members?.length || 1} Travelers already joined
              </span>
            </div>
            <span className="text-[#746D65]">
              {formatCurrency(budgetMinor, currency)} budget
            </span>
          </div>

          <form onSubmit={handleJoin} className="space-y-5">
            {error && (
              <div className="p-3 bg-[#C85C3A]/10 border border-[#C85C3A]/30 rounded-xl text-xs text-[#C85C3A] font-semibold">
                {error}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-[#746D65] uppercase tracking-wider mb-1.5 font-mono">
                Your Name *
              </label>
              <input
                type="text"
                required
                autoFocus
                placeholder="e.g. Maya Patel"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-[#D8C9B5] bg-white text-base text-[#172A3A] font-medium placeholder-[#746D65]/50 focus:outline-none focus:border-[#172A3A] focus:ring-1 focus:ring-[#172A3A]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#746D65] uppercase tracking-wider mb-2 font-mono">
                Choose Traveler Avatar
              </label>
              <div className="flex items-center gap-2.5 overflow-x-auto pb-2 scrollbar-none">
                {PRESET_AVATARS.map((avatar, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setSelectedAvatar(avatar)}
                    className={`relative rounded-full p-0.5 shrink-0 transition-transform ${
                      selectedAvatar === avatar
                        ? "ring-3 ring-[#C85C3A] scale-110"
                        : "opacity-70 hover:opacity-100"
                    }`}
                  >
                    <img
                      src={avatar}
                      alt={`Avatar ${idx}`}
                      className="w-10 h-10 rounded-full object-cover border border-[#D8C9B5]"
                    />
                    {selectedAvatar === avatar && (
                      <div className="absolute -bottom-1 -right-1 bg-[#C85C3A] text-white rounded-full p-0.5">
                        <CheckCircle className="w-3 h-3" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={joining}
                className="w-full py-3.5 px-6 rounded-2xl bg-[#172A3A] hover:bg-[#233d52] text-[#FFF9F0] text-sm font-bold transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {joining ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Joining Workspace...</span>
                  </>
                ) : (
                  <>
                    <span>Join Trip & Start Splitting</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Value Prop Footer */}
          <div className="border-t border-[#D8C9B5] pt-4 grid grid-cols-2 gap-3 text-[11px] text-[#746D65] font-mono">
            <div className="flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-[#D49A55] shrink-0" />
              <span>Real-time Expense Split</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#D49A55] shrink-0" />
              <span>No Password Required</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
