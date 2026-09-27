"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Users,
  User,
  Heart,
  Baby,
  Briefcase,
  Compass,
  ArrowRight,
  CheckCircle2,
  Palmtree,
  Mountain,
  Utensils,
  Landmark,
  Camera,
  Moon,
  ShoppingBag,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { StampBadge } from "@/components/ui/Badge";

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);

  // Step 1: Traveler Type
  const [travelerType, setTravelerType] = useState<string>("GROUP");

  // Step 2: Travel Style & Interests
  const [travelStyle, setTravelStyle] = useState<string>("BALANCED");
  const [currency, setCurrency] = useState<string>("INR");
  const [interests, setInterests] = useState<string[]>([
    "Beach",
    "Food",
    "Adventure",
    "Culture",
  ]);

  const toggleInterest = (interest: string) => {
    if (interests.includes(interest)) {
      setInterests(interests.filter((i) => i !== interest));
    } else {
      setInterests([...interests, interest]);
    }
  };

  const handleNext = () => {
    if (step < 3) {
      setStep(step + 1);
    } else {
      router.push("/trips/new");
    }
  };

  return (
    <div className="min-h-screen dot-grid-paper flex flex-col justify-between p-4 sm:p-8 relative text-[#292726]">
      {/* Top Header */}
      <div className="max-w-4xl mx-auto w-full flex items-center justify-between py-4 border-b border-[#D8C9B5]">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-[#172A3A] flex items-center justify-center text-white">
            <Compass className="w-4 h-4 text-[#D49A55]" />
          </div>
          <span className="font-serif text-lg font-bold text-[#172A3A]">
            Wander Wallet
          </span>
        </Link>

        {/* Stepper indicators */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 font-mono text-xs font-semibold">
            <span
              className={`w-6 h-6 rounded-full flex items-center justify-center transition ${
                step === 1
                  ? "bg-[#C85C3A] text-white"
                  : step > 1
                  ? "bg-[#172A3A] text-white"
                  : "bg-[#EAE1D3] text-[#746D65]"
              }`}
            >
              01
            </span>
            <div className="w-6 h-0.5 bg-[#D8C9B5]" />
            <span
              className={`w-6 h-6 rounded-full flex items-center justify-center transition ${
                step === 2
                  ? "bg-[#C85C3A] text-white"
                  : step > 2
                  ? "bg-[#172A3A] text-white"
                  : "bg-[#EAE1D3] text-[#746D65]"
              }`}
            >
              02
            </span>
            <div className="w-6 h-0.5 bg-[#D8C9B5]" />
            <span
              className={`w-6 h-6 rounded-full flex items-center justify-center transition ${
                step === 3
                  ? "bg-[#C85C3A] text-white"
                  : "bg-[#EAE1D3] text-[#746D65]"
              }`}
            >
              03
            </span>
          </div>

          <button
            type="button"
            onClick={() => router.push("/trips/new")}
            className="text-xs font-semibold text-[#746D65] hover:text-[#172A3A] ml-2"
          >
            Skip
          </button>
        </div>
      </div>

      {/* Main Container */}
      <div className="max-w-3xl mx-auto w-full py-8 my-auto">
        {step === 1 && (
          <div className="space-y-8 animate-fadeIn">
            <div>
              <StampBadge className="mb-2">Step 01</StampBadge>
              <h1 className="font-serif text-3xl sm:text-4xl font-bold text-[#172A3A] tracking-tight">
                What kind of traveller are you?
              </h1>
              <p className="text-sm text-[#746D65] mt-2">
                Help us create the perfect realistic travel budget and plan for your journeys.
              </p>
            </div>

            {/* Travel types grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                {
                  id: "SOLO",
                  title: "Solo Traveler",
                  desc: "Explore at my own pace with complete freedom",
                  icon: <User className="w-5 h-5 text-[#172A3A]" />,
                },
                {
                  id: "GROUP",
                  title: "Group Traveler",
                  desc: "I travel with friends or family (2 to 20+ people)",
                  icon: <Users className="w-5 h-5 text-[#C85C3A]" />,
                  badge: "Popular",
                },
                {
                  id: "COUPLE",
                  title: "Couple Traveler",
                  desc: "Romantic getaways and shared memories for two",
                  icon: <Heart className="w-5 h-5 text-[#C85C3A]" />,
                },
                {
                  id: "FAMILY",
                  title: "Family Traveler",
                  desc: "Comfort, kids activities, and multi-gen friendly stays",
                  icon: <Baby className="w-5 h-5 text-[#D49A55]" />,
                },
                {
                  id: "BUSINESS",
                  title: "Business & Bleisure",
                  desc: "Work + travel with dedicated desk and connectivity",
                  icon: <Briefcase className="w-5 h-5 text-[#746D65]" />,
                },
              ].map((type) => {
                const isSelected = travelerType === type.id;

                return (
                  <div
                    key={type.id}
                    onClick={() => setTravelerType(type.id)}
                    className={`p-5 rounded-xl border-2 transition-all cursor-pointer text-left flex items-start gap-4 ${
                      isSelected
                        ? "bg-[#FFF9F0] border-[#C85C3A] shadow-md ring-1 ring-[#C85C3A]"
                        : "bg-[#FFF9F0]/80 border-[#D8C9B5] hover:border-[#172A3A] hover:bg-[#FFF9F0]"
                    }`}
                  >
                    <div
                      className={`p-2.5 rounded-lg ${
                        isSelected ? "bg-[#FDF0EB]" : "bg-[#EAE1D3]/50"
                      }`}
                    >
                      {type.icon}
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h3 className="font-serif font-bold text-base text-[#292726]">
                          {type.title}
                        </h3>
                        {type.badge && (
                          <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-[#FDF0EB] text-[#C85C3A]">
                            {type.badge}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[#746D65] mt-1">{type.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-[#D8C9B5]">
              <span className="font-hand text-lg text-[#746D65]">
                Different Travellers. Same Freedom.
              </span>
              <Button
                variant="accent"
                onClick={handleNext}
                rightIcon={<ArrowRight className="w-4 h-4" />}
              >
                Next
              </Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-8 animate-fadeIn">
            <div>
              <StampBadge className="mb-2">Step 02</StampBadge>
              <h1 className="font-serif text-3xl sm:text-4xl font-bold text-[#172A3A] tracking-tight">
                Your Travel Style & Interests
              </h1>
              <p className="text-sm text-[#746D65] mt-2">
                We use these to calibrate realistic accommodation, transit, and experiences.
              </p>
            </div>

            {/* Travel Style Selection */}
            <div className="space-y-3 text-left">
              <label className="text-xs font-semibold uppercase tracking-wider text-[#746D65]">
                Budget Tier & Travel Pace
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { id: "BACKPACKER", label: "Backpacker", desc: "Hostels, trains & local food" },
                  { id: "BALANCED", label: "Balanced", desc: "Private stays & smart splurges" },
                  { id: "COMFORT", label: "Comfort", desc: "Resorts, flights & top cafes" },
                  { id: "PREMIUM", label: "Premium", desc: "Luxury villas & private transfers" },
                ].map((style) => (
                  <button
                    key={style.id}
                    type="button"
                    onClick={() => setTravelStyle(style.id)}
                    className={`p-3.5 rounded-lg border text-left transition ${
                      travelStyle === style.id
                        ? "bg-[#172A3A] text-[#FFF9F0] border-[#0f1d28] shadow-sm"
                        : "bg-[#FFF9F0] text-[#292726] border-[#D8C9B5] hover:border-[#172A3A]"
                    }`}
                  >
                    <span className="block font-serif font-bold text-sm">
                      {style.label}
                    </span>
                    <span
                      className={`block text-[11px] mt-1 ${
                        travelStyle === style.id ? "text-[#EAE1D3]" : "text-[#746D65]"
                      }`}
                    >
                      {style.desc}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Interests Chips */}
            <div className="space-y-3 text-left">
              <label className="text-xs font-semibold uppercase tracking-wider text-[#746D65]">
                Interests & Experiences (Select all that apply)
              </label>
              <div className="flex flex-wrap gap-2.5">
                {[
                  { name: "Beach", icon: <Palmtree className="w-3.5 h-3.5" /> },
                  { name: "Adventure", icon: <Compass className="w-3.5 h-3.5" /> },
                  { name: "Food", icon: <Utensils className="w-3.5 h-3.5" /> },
                  { name: "Culture", icon: <Landmark className="w-3.5 h-3.5" /> },
                  { name: "Nature", icon: <Mountain className="w-3.5 h-3.5" /> },
                  { name: "Photography", icon: <Camera className="w-3.5 h-3.5" /> },
                  { name: "Nightlife", icon: <Moon className="w-3.5 h-3.5" /> },
                  { name: "Shopping", icon: <ShoppingBag className="w-3.5 h-3.5" /> },
                ].map((item) => {
                  const isChecked = interests.includes(item.name);
                  return (
                    <button
                      key={item.name}
                      type="button"
                      onClick={() => toggleInterest(item.name)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition ${
                        isChecked
                          ? "bg-[#C85C3A] text-white border-[#b34f2f] shadow-sm"
                          : "bg-[#FFF9F0] text-[#746D65] border-[#D8C9B5] hover:border-[#172A3A]"
                      }`}
                    >
                      {item.icon}
                      {item.name}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-[#D8C9B5]">
              <Button variant="outline" onClick={() => setStep(1)}>
                Back
              </Button>
              <Button
                variant="accent"
                onClick={handleNext}
                rightIcon={<ArrowRight className="w-4 h-4" />}
              >
                Next
              </Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-8 animate-fadeIn text-left">
            <div>
              <StampBadge className="mb-2">Step 03</StampBadge>
              <h1 className="font-serif text-3xl sm:text-4xl font-bold text-[#172A3A] tracking-tight">
                You’re all set to travel smarter.
              </h1>
              <p className="text-sm text-[#746D65] mt-2">
                Wander Wallet builds complete itineraries around your real budget.
              </p>
            </div>

            <div className="bg-[#FFF9F0] border border-[#D8C9B5] rounded-xl p-6 space-y-4 shadow-sm">
              <h3 className="font-serif font-bold text-lg text-[#172A3A]">
                Here is what happens next:
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  {
                    title: "1. Tell us your numbers",
                    desc: "Enter your starting point, destination, dates, and total group budget.",
                  },
                  {
                    title: "2. We research real options",
                    desc: "Compare flights, trains, stays, and verified activities with live prices.",
                  },
                  {
                    title: "3. Budget Reality Check",
                    desc: "Continuously check if your trip fits your budget before booking.",
                  },
                  {
                    title: "4. Day-by-Day Itinerary",
                    desc: "Optimized route map, clustered activities, and meal allocations.",
                  },
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-[#FFF9F0] border border-[#D8C9B5]">
                    <CheckCircle2 className="w-4 h-4 text-[#172A3A] flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="font-serif font-bold text-sm text-[#292726] block">
                        {item.title}
                      </span>
                      <span className="text-xs text-[#746D65] mt-0.5 block">
                        {item.desc}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-[#D8C9B5]">
              <Button variant="outline" onClick={() => setStep(2)}>
                Back
              </Button>
              <Button
                variant="accent"
                size="lg"
                onClick={handleNext}
                rightIcon={<ArrowRight className="w-4 h-4" />}
              >
                Plan Your First Trip →
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Footer Travel Note */}
      <div className="text-center py-4 text-xs text-[#746D65] font-sans">
        Wander Wallet • Budget-First Group Travel Platform
      </div>
    </div>
  );
}
