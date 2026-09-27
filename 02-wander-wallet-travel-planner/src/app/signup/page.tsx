"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Lock, Mail, User, AlertCircle } from "lucide-react";

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [travelStyle, setTravelStyle] = useState("BALANCED");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, travelStyle }),
      });

      const data = await res.json();
      if (data.success) {
        router.push("/trips");
      } else {
        setError(data.error || "Failed to create account");
      }
    } catch (err) {
      console.error(err);
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen dot-grid-paper flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <Link href="/" className="inline-flex items-center gap-2 group mb-4">
          <div className="w-12 h-12 rounded-full bg-[#172A3A] text-[#FFF9F0] flex items-center justify-center font-serif font-bold text-2xl shadow-sm">
            W
          </div>
        </Link>
        <h2 className="font-serif text-3xl font-bold text-[#172A3A] tracking-tight">
          Join Wander Wallet
        </h2>
        <p className="mt-2 text-xs text-[#746D65]">
          Create your traveler account to coordinate budgets and split expenses
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="bg-[#FFF9F0] border border-[#D8C9B5] py-8 px-6 sm:px-10 rounded-2xl shadow-sm space-y-6">
          {error && (
            <div className="p-3 rounded-lg bg-[#FDF0EB] border border-[#E9BFB2] text-[#C85C3A] text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSignup} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-[#746D65] uppercase tracking-wider mb-1">
                Full Name
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-[#746D65] absolute left-3 top-3" />
                <input
                  type="text"
                  required
                  placeholder="e.g. Maya Iyer"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-[#D8C9B5] bg-[#FFF9F0] text-sm text-[#292726] focus:outline-none focus:ring-2 focus:ring-[#172A3A]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#746D65] uppercase tracking-wider mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#746D65] absolute left-3 top-3" />
                <input
                  type="email"
                  required
                  placeholder="maya@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-[#D8C9B5] bg-[#FFF9F0] text-sm text-[#292726] focus:outline-none focus:ring-2 focus:ring-[#172A3A]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#746D65] uppercase tracking-wider mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#746D65] absolute left-3 top-3" />
                <input
                  type="password"
                  required
                  placeholder="At least 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-[#D8C9B5] bg-[#FFF9F0] text-sm text-[#292726] focus:outline-none focus:ring-2 focus:ring-[#172A3A]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#746D65] uppercase tracking-wider mb-1">
                Travel Style
              </label>
              <select
                value={travelStyle}
                onChange={(e) => setTravelStyle(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border border-[#D8C9B5] bg-[#FFF9F0] text-sm text-[#292726] focus:outline-none focus:ring-2 focus:ring-[#172A3A]"
              >
                <option value="BACKPACKER">Backpacker</option>
                <option value="BALANCED">Balanced Explorer</option>
                <option value="COMFORT">Comfort & Style</option>
                <option value="PREMIUM">Premium / Luxury</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#172A3A] hover:bg-[#233d52] text-[#FFF9F0] py-3 rounded-lg text-sm font-bold transition-all shadow mt-2"
            >
              {loading ? "Creating Account..." : "Create Account →"}
            </button>
          </form>

          <div className="text-center text-xs text-[#746D65] pt-4 border-t border-[#D8C9B5]">
            <span>Already have an account? </span>
            <Link href="/login" className="font-bold text-[#172A3A] hover:underline">
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
