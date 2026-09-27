"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Compass,
  MapPin,
  Wallet,
  User,
  PlusCircle,
  Menu,
  X,
  Home,
  Briefcase,
} from "lucide-react";
import { Button } from "../ui/Button";

export function GlobalNavbar() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { label: "Home", href: "/" },
    { label: "Trips", href: "/trips" },
    { label: "Plan a Trip", href: "/trips/new" },
    { label: "Explore", href: "/explore" },
    { label: "AI Planner", href: "/ai-planner" },
  ];

  const isActive = (href: string) => {
    if (href === "/" && pathname !== "/") return false;
    return pathname?.startsWith(href);
  };

  return (
    <>
      <header className="sticky top-0 z-50 bg-[#F5EEE3]/95 backdrop-blur-md border-b border-[#D8C9B5]/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
          {/* Logo Brand */}
          <Link href="/" className="flex items-center gap-2.5 group">
            {/* Emblem Circle */}
            <div className="w-9 h-9 rounded-full bg-[#172A3A] flex items-center justify-center text-[#FFF9F0] shadow-sm transition-transform group-hover:scale-105">
              <Compass className="w-5 h-5 text-[#D49A55]" />
            </div>
            <div className="flex flex-col">
              <span className="font-serif text-xl font-bold tracking-tight text-[#172A3A] group-hover:text-[#233d52]">
                Wander Wallet
              </span>
              <span className="text-[10px] tracking-widest uppercase text-[#746D65] -mt-1 font-sans">
                One Budget • Real Trips
              </span>
            </div>
          </Link>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`text-sm font-medium transition-colors font-sans py-1 relative ${
                  isActive(link.href)
                    ? "text-[#172A3A] font-semibold after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-[#C85C3A]"
                    : "text-[#746D65] hover:text-[#172A3A]"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Right Action Cluster */}
          <div className="hidden sm:flex items-center gap-3">
            <Link href="/trips/new">
              <Button
                variant="primary"
                size="sm"
                rightIcon={<span className="text-sm font-sans">→</span>}
              >
                Plan a Trip
              </Button>
            </Link>

            <Link
              href="/profile"
              className="w-8 h-8 rounded-full border border-[#D8C9B5] bg-[#FFF9F0] flex items-center justify-center text-[#172A3A] hover:bg-[#EAE1D3] transition"
              aria-label="User Profile"
            >
              <User className="w-4 h-4" />
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <div className="flex md:hidden items-center gap-2">
            <Link href="/trips/new">
              <Button variant="accent" size="sm">
                Plan
              </Button>
            </Link>
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-[#172A3A] rounded-md focus:outline-none"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden border-b border-[#D8C9B5] bg-[#FFF9F0] px-4 pt-3 pb-5 space-y-2">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`block px-3 py-2 rounded-md text-sm font-medium ${
                  isActive(link.href)
                    ? "bg-[#EAE1D3]/60 text-[#172A3A] font-semibold"
                    : "text-[#746D65] hover:bg-[#FFF9F0]"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>
        )}
      </header>

      {/* Mobile Sticky Bottom Navigation */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#FFF9F0] border-t border-[#D8C9B5] px-2 py-1.5 flex items-center justify-around shadow-lg">
        <Link
          href="/"
          className={`flex flex-col items-center p-1 text-[10px] font-medium ${
            pathname === "/" ? "text-[#C85C3A] font-bold" : "text-[#746D65]"
          }`}
        >
          <Home className="w-4 h-4 mb-0.5" />
          Home
        </Link>
        <Link
          href="/trips"
          className={`flex flex-col items-center p-1 text-[10px] font-medium ${
            pathname?.startsWith("/trips") && pathname !== "/trips/new"
              ? "text-[#C85C3A] font-bold"
              : "text-[#746D65]"
          }`}
        >
          <Briefcase className="w-4 h-4 mb-0.5" />
          Trips
        </Link>
        <Link
          href="/trips/new"
          className="flex flex-col items-center p-1 -mt-4 text-[10px] font-semibold text-[#FFF9F0]"
        >
          <div className="w-10 h-10 rounded-full bg-[#C85C3A] flex items-center justify-center shadow-md">
            <PlusCircle className="w-5 h-5 text-[#FFF9F0]" />
          </div>
          <span className="text-[#C85C3A] mt-0.5 font-bold">Plan</span>
        </Link>
        <Link
          href="/explore"
          className={`flex flex-col items-center p-1 text-[10px] font-medium ${
            pathname?.startsWith("/explore") ? "text-[#C85C3A] font-bold" : "text-[#746D65]"
          }`}
        >
          <Compass className="w-4 h-4 mb-0.5" />
          Explore
        </Link>
        <Link
          href="/profile"
          className={`flex flex-col items-center p-1 text-[10px] font-medium ${
            pathname?.startsWith("/profile") ? "text-[#C85C3A] font-bold" : "text-[#746D65]"
          }`}
        >
          <User className="w-4 h-4 mb-0.5" />
          Profile
        </Link>
      </nav>
    </>
  );
}

export function TripSubNav({
  tripId,
  activeTab,
  onTabChange,
}: {
  tripId: string;
  activeTab: string;
  onTabChange?: (tab: string) => void;
}) {
  const tabs = [
    { id: "overview", label: "Overview" },
    { id: "itinerary", label: "Itinerary" },
    { id: "budget", label: "Budget" },
    { id: "stay", label: "Stay" },
    { id: "transport", label: "Transport" },
    { id: "activities", label: "Activities" },
    { id: "food", label: "Food" },
    { id: "map", label: "Map" },
    { id: "group", label: "Group Split" },
    { id: "summary", label: "Summary" },
  ];

  return (
    <div className="w-full bg-[#FFF9F0] border-b border-[#D8C9B5] overflow-x-auto scrollbar-none">
      <div className="max-w-7xl mx-auto px-4 flex items-center gap-1 sm:gap-2 h-12">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => onTabChange?.(tab.id)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md whitespace-nowrap transition ${
              activeTab === tab.id
                ? "bg-[#172A3A] text-[#FFF9F0] shadow-sm"
                : "text-[#746D65] hover:text-[#172A3A] hover:bg-[#EAE1D3]/50"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  );
}
