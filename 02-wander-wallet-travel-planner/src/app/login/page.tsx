"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Lock, Mail, AlertCircle } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("rahul@wanderwallet.app");
  const [password, setPassword] = useState("password123");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (data.success) {
        router.push("/trips");
      } else {
        setError(data.error || "Login failed");
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
          Sign In to Wander Wallet
        </h2>
        <p className="mt-2 text-xs text-[#746D65]">
          Coordinated group budgets, shared expenses and settlement ledger
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

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-[#746D65] uppercase tracking-wider mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#746D65] absolute left-3 top-3" />
                <input
                  type="email"
                  required
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
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-[#D8C9B5] bg-[#FFF9F0] text-sm text-[#292726] focus:outline-none focus:ring-2 focus:ring-[#172A3A]"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#172A3A] hover:bg-[#233d52] text-[#FFF9F0] py-3 rounded-lg text-sm font-bold transition-all shadow mt-2"
            >
              {loading ? "Signing in..." : "Sign In →"}
            </button>
          </form>

          <div className="text-center text-xs text-[#746D65] pt-4 border-t border-[#D8C9B5]">
            <span>Don't have an account yet? </span>
            <Link href="/signup" className="font-bold text-[#172A3A] hover:underline">
              Create an account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
