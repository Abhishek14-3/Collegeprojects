"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  User,
  DollarSign,
  Compass,
  Bell,
  Shield,
  MapPin,
  CheckCircle,
  Camera,
  Upload,
  Sparkles,
  Check,
  RefreshCw,
  Image as ImageIcon,
} from "lucide-react";

const CURATED_TRAVEL_AVATARS = [
  {
    url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80",
    label: "Coastal Explorer",
  },
  {
    url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80",
    label: "Mountain Trekker",
  },
  {
    url: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=300&q=80",
    label: "Culture Wanderer",
  },
  {
    url: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=300&q=80",
    label: "Backpacker",
  },
  {
    url: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=300&q=80",
    label: "Island Hopper",
  },
  {
    url: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=300&q=80",
    label: "City Navigator",
  },
  {
    url: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=300&q=80",
    label: "Foodie Traveler",
  },
  {
    url: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=300&q=80",
    label: "Expedition Guide",
  },
  {
    url: "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=300&q=80",
    label: "Sunset Chaser",
  },
  {
    url: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=300&q=80",
    label: "Safari Scout",
  },
];

export default function ProfilePage() {
  const [profile, setProfile] = useState<any>({
    name: "Rahul Sharma",
    email: "rahul@wanderwallet.app",
    avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80",
    currencyPreference: "INR",
    travelStyle: "BALANCED",
    homeCity: "Bengaluru, India",
    bio: "Coastal explorer, sunset chaser, group trip coordinator.",
  });
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showCustomUrlInput, setShowCustomUrlInput] = useState(false);
  const [customUrl, setCustomUrl] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Check localStorage first for instant hydration
    const localCurr = typeof window !== "undefined" ? localStorage.getItem("wander_user_currency") : null;
    const localAvatar = typeof window !== "undefined" ? localStorage.getItem("wander_user_avatar") : null;
    
    if (localCurr || localAvatar) {
      setProfile((prev: any) => ({
        ...prev,
        currencyPreference: localCurr || prev.currencyPreference,
        avatarUrl: localAvatar || prev.avatarUrl,
      }));
    }

    fetch("/api/user/profile")
      .then((res) => res.json())
      .then((data) => {
        if (data.profile) {
          setProfile(data.profile);
          if (data.profile.currencyPreference && typeof window !== "undefined") {
            localStorage.setItem("wander_user_currency", data.profile.currencyPreference);
          }
          if (data.profile.avatarUrl && typeof window !== "undefined") {
            localStorage.setItem("wander_user_avatar", data.profile.avatarUrl);
          }
        }
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  // Handle local file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check size limit (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert("File size exceeds 5MB. Please choose a smaller image.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        setProfile((prev: any) => ({ ...prev, avatarUrl: dataUrl }));
        if (typeof window !== "undefined") {
          localStorage.setItem("wander_user_avatar", dataUrl);
        }
      }
    };
    reader.readAsDataURL(file);
  };

  // Handle preset avatar selection
  const handleSelectPreset = (url: string) => {
    setProfile((prev: any) => ({ ...prev, avatarUrl: url }));
    if (typeof window !== "undefined") {
      localStorage.setItem("wander_user_avatar", url);
    }
  };

  // Handle custom URL submit
  const handleApplyCustomUrl = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customUrl.trim()) return;
    setProfile((prev: any) => ({ ...prev, avatarUrl: customUrl.trim() }));
    if (typeof window !== "undefined") {
      localStorage.setItem("wander_user_avatar", customUrl.trim());
    }
    setShowCustomUrlInput(false);
    setCustomUrl("");
  };

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    try {
      if (profile.currencyPreference && typeof window !== "undefined") {
        localStorage.setItem("wander_user_currency", profile.currencyPreference);
      }
      if (profile.avatarUrl && typeof window !== "undefined") {
        localStorage.setItem("wander_user_avatar", profile.avatarUrl);
      }
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile),
      });
      const data = await res.json();
      if (data.success) {
        setSavedSuccess(true);
        setTimeout(() => setSavedSuccess(false), 3000);
      }
    } catch (err) {
      console.error(err);
    }
  }

  const currentAvatar =
    profile.avatarUrl ||
    "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80";

  return (
    <div className="min-h-screen dot-grid-paper text-[#292726] flex flex-col relative">
      <header className="border-b border-[#D8C9B5] dot-grid-header sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link
            href="/trips"
            className="flex items-center gap-2 text-xs font-bold text-[#172A3A] hover:text-[#C85C3A] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Trips</span>
          </Link>
          <h1 className="font-serif font-bold text-lg text-[#172A3A]">Traveler Profile & Settings</h1>
          <div className="w-16" />
        </div>
      </header>

      <main className="max-w-4xl w-full mx-auto px-4 py-10 flex-1 space-y-8">
        <div>
          <h2 className="font-serif text-3xl font-bold text-[#172A3A]">Profile & Travel Preferences</h2>
          <p className="text-sm text-[#746D65] mt-1">
            Personalize your profile photo, default currency, travel style, and group trip preferences.
          </p>
        </div>

        {savedSuccess && (
          <div className="p-4 rounded-xl bg-[#FFF9F0] border border-[#D8C9B5] text-[#172A3A] text-xs font-semibold flex items-center gap-2 animate-fadeIn">
            <CheckCircle className="w-4 h-4 text-[#D49A55]" />
            <span>Profile & preferences saved successfully!</span>
          </div>
        )}

        <form onSubmit={handleSave} className="bg-[#FFF9F0] border border-[#D8C9B5] rounded-2xl p-6 sm:p-8 shadow-sm space-y-8">
          {/* ========================================================================= */}
          {/* 1. PROFILE PICTURE MANAGEMENT SECTION */}
          {/* ========================================================================= */}
          <div className="pb-8 border-b border-[#D8C9B5] space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center gap-6">
              {/* Main Avatar Preview with Camera Trigger */}
              <div className="relative group self-start shrink-0">
                <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full overflow-hidden border-3 border-[#172A3A] shadow-md bg-[#F5EEE3]">
                  <img
                    src={currentAvatar}
                    alt={profile.name || "Profile Photo"}
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                  />
                </div>

                {/* Camera Click Overlay */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-[#C85C3A] text-white flex items-center justify-center shadow-md hover:bg-[#b04f30] hover:scale-110 transition cursor-pointer"
                  title="Upload New Photo"
                >
                  <Camera className="w-4 h-4" />
                </button>
              </div>

              {/* Upload & Management Actions */}
              <div className="flex-1 space-y-2.5">
                <div className="flex items-center gap-2">
                  <h3 className="font-serif font-bold text-xl text-[#172A3A]">{profile.name}</h3>
                  <span className="text-[10px] font-mono font-bold bg-[#EAE2CE] text-[#172A3A] px-2 py-0.5 rounded border border-[#D8C9B5]/60">
                    Coordinator
                  </span>
                </div>
                <p className="text-xs text-[#746D65]">{profile.email}</p>

                <div className="flex flex-wrap items-center gap-2.5 pt-1">
                  {/* Hidden File Input */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    onChange={handleFileUpload}
                    className="hidden"
                  />

                  {/* Upload Photo Button */}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#172A3A] hover:bg-[#233d52] text-[#FFF9F0] text-xs font-semibold shadow-xs transition"
                  >
                    <Upload className="w-3.5 h-3.5 text-[#D49A55]" />
                    <span>Upload Photo</span>
                  </button>

                  {/* Paste URL Button */}
                  <button
                    type="button"
                    onClick={() => setShowCustomUrlInput(!showCustomUrlInput)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#F5EEE3] hover:bg-[#EAE1D3] text-[#172A3A] border border-[#D8C9B5] text-xs font-semibold transition"
                  >
                    <ImageIcon className="w-3.5 h-3.5 text-[#746D65]" />
                    <span>Paste Image Link</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Custom URL Input Accordion */}
            {showCustomUrlInput && (
              <div className="p-3.5 bg-[#F5EEE3] border border-[#D8C9B5] rounded-xl flex items-center gap-2 animate-fadeIn">
                <input
                  type="url"
                  placeholder="https://images.unsplash.com/... or any photo URL"
                  value={customUrl}
                  onChange={(e) => setCustomUrl(e.target.value)}
                  className="flex-1 px-3 py-1.5 rounded-lg border border-[#D8C9B5] bg-[#FFF9F0] text-xs text-[#172A3A] focus:outline-none focus:border-[#172A3A]"
                />
                <button
                  type="button"
                  onClick={handleApplyCustomUrl}
                  className="px-3 py-1.5 rounded-lg bg-[#C85C3A] text-white text-xs font-bold hover:bg-[#b04f30] transition"
                >
                  Apply
                </button>
                <button
                  type="button"
                  onClick={() => setShowCustomUrlInput(false)}
                  className="px-2 py-1.5 text-xs text-[#746D65] hover:text-[#172A3A]"
                >
                  Cancel
                </button>
              </div>
            )}

            {/* Curated Traveler Avatars Carousel / Grid */}
            <div className="space-y-2 pt-2">
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#746D65] block">
                Or choose from Travel Persona Avatars
              </span>
              <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-none">
                {CURATED_TRAVEL_AVATARS.map((avatar, idx) => {
                  const isSelected = profile.avatarUrl === avatar.url;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSelectPreset(avatar.url)}
                      className={`relative rounded-full p-0.5 shrink-0 transition-all cursor-pointer group flex flex-col items-center ${
                        isSelected ? "ring-3 ring-[#C85C3A] scale-110" : "opacity-75 hover:opacity-100 hover:scale-105"
                      }`}
                      title={avatar.label}
                    >
                      <img
                        src={avatar.url}
                        alt={avatar.label}
                        className="w-12 h-12 rounded-full object-cover border border-[#D8C9B5]"
                      />
                      {isSelected && (
                        <div className="absolute -bottom-1 -right-1 bg-[#C85C3A] text-white rounded-full p-0.5 shadow-sm">
                          <Check className="w-3 h-3 stroke-[3]" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* 2. GENERAL PROFILE DETAILS */}
          {/* ========================================================================= */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#746D65] uppercase tracking-wider mb-1 font-mono">
                Display Name
              </label>
              <input
                type="text"
                value={profile.name || ""}
                onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                className="w-full px-4 py-2.5 rounded-lg border border-[#D8C9B5] bg-[#FFF9F0] text-sm text-[#292726] focus:outline-none focus:border-[#172A3A]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#746D65] uppercase tracking-wider mb-1 font-mono">
                Home City
              </label>
              <input
                type="text"
                value={profile.homeCity || ""}
                onChange={(e) => setProfile({ ...profile, homeCity: e.target.value })}
                className="w-full px-4 py-2.5 rounded-lg border border-[#D8C9B5] bg-[#FFF9F0] text-sm text-[#292726] focus:outline-none focus:border-[#172A3A]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#746D65] uppercase tracking-wider mb-1 font-mono">
                Default Currency Preference
              </label>
              <select
                value={profile.currencyPreference || "INR"}
                onChange={(e) => setProfile({ ...profile, currencyPreference: e.target.value })}
                className="w-full px-4 py-2.5 rounded-lg border border-[#D8C9B5] bg-[#FFF9F0] text-sm text-[#292726] focus:outline-none focus:border-[#172A3A]"
              >
                <option value="INR">INR (₹) - Indian Rupee</option>
                <option value="USD">USD ($) - US Dollar</option>
                <option value="EUR">EUR (€) - Euro</option>
                <option value="GBP">GBP (£) - British Pound</option>
                <option value="AED">AED - UAE Dirham</option>
                <option value="THB">THB (฿) - Thai Baht</option>
                <option value="JPY">JPY (¥) - Japanese Yen</option>
                <option value="SGD">SGD ($) - Singapore Dollar</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#746D65] uppercase tracking-wider mb-1 font-mono">
                Travel Style
              </label>
              <select
                value={profile.travelStyle || "BALANCED"}
                onChange={(e) => setProfile({ ...profile, travelStyle: e.target.value })}
                className="w-full px-4 py-2.5 rounded-lg border border-[#D8C9B5] bg-[#FFF9F0] text-sm text-[#292726] focus:outline-none focus:border-[#172A3A]"
              >
                <option value="BACKPACKER">Backpacker (Hostels, local transit, street dining)</option>
                <option value="BALANCED">Balanced (Comfort stays, verified shacks, curated sights)</option>
                <option value="COMFORT">Comfort (Boutique private villas, private cabs)</option>
                <option value="PREMIUM">Premium (Luxury beach resorts, gourmet dining)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#746D65] uppercase tracking-wider mb-1 font-mono">
              Short Bio / Travel Notes
            </label>
            <textarea
              rows={3}
              value={profile.bio || ""}
              onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
              className="w-full px-4 py-2.5 rounded-lg border border-[#D8C9B5] bg-[#FFF9F0] text-sm text-[#292726] focus:outline-none focus:border-[#172A3A]"
            />
          </div>

          <div className="pt-4 border-t border-[#D8C9B5] flex justify-end">
            <button
              type="submit"
              className="bg-[#172A3A] hover:bg-[#233d52] text-[#FFF9F0] px-8 py-3 rounded-xl text-xs font-bold shadow transition-all cursor-pointer"
            >
              Save Profile & Photo
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
