"use client";

import React, { useState, useEffect, useRef } from "react";
import QRCode from "qrcode";
import {
  QrCode,
  Copy,
  Check,
  Share2,
  Download,
  Users,
  MessageCircle,
  Send,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  X,
} from "lucide-react";

interface TripInviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  tripId: string;
  tripTitle: string;
  destination: string;
  membersCount: number;
  currency?: string;
  onManualInvite?: (name: string, email: string, role: string, plannedAmount: string) => Promise<void>;
}

export function TripInviteModal({
  isOpen,
  onClose,
  tripId,
  tripTitle,
  destination,
  membersCount,
  currency = "INR",
  onManualInvite,
}: TripInviteModalProps) {
  const [activeTab, setActiveTab] = useState<"qr" | "manual">("qr");
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [manualName, setManualName] = useState("");
  const [manualEmail, setManualEmail] = useState("");
  const [manualRole, setManualRole] = useState("MEMBER");
  const [manualPlannedAmount, setManualPlannedAmount] = useState("10000");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Compute join URL
  const origin = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
  const joinUrl = `${origin}/trips/join/${tripId}`;
  const inviteCode = `WW-${tripId.slice(-6).toUpperCase()}`;

  // Generate QR Code data URL
  useEffect(() => {
    if (!isOpen || !tripId) return;

    QRCode.toDataURL(joinUrl, {
      width: 320,
      margin: 2,
      color: {
        dark: "#172A3A", // Midnight Navy
        light: "#FFF9F0", // Soft Ivory
      },
      errorCorrectionLevel: "H",
    })
      .then((url) => setQrDataUrl(url))
      .catch((err) => console.error("QR Code generation error:", err));
  }, [isOpen, tripId, joinUrl]);

  if (!isOpen) return null;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(joinUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleDownloadQR = () => {
    if (!qrDataUrl) return;
    const a = document.createElement("a");
    a.href = qrDataUrl;
    a.download = `WanderWallet-Invite-${tripTitle.replace(/\s+/g, "_")}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const shareText = encodeURIComponent(
    `✈️ Hey! Join our "${tripTitle}" trip workspace on Wander Wallet to coordinate plans and split expenses together:\n${joinUrl}`
  );
  const whatsappUrl = `https://api.whatsapp.com/send?text=${shareText}`;
  const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(joinUrl)}&text=${encodeURIComponent(`Join our ${tripTitle} trip on Wander Wallet!`)}`;

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onManualInvite || !manualName.trim()) return;
    try {
      setIsSubmitting(true);
      await onManualInvite(manualName, manualEmail, manualRole, manualPlannedAmount);
      setManualName("");
      setManualEmail("");
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
      <div className="bg-[#F5EEE3] border border-[#D8C9B5] rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl relative my-8">
        {/* Header Ribbon */}
        <div className="bg-[#172A3A] px-6 py-5 text-[#FFF9F0] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[#C85C3A] text-white flex items-center justify-center font-bold shadow-xs">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-mono font-bold tracking-widest text-[#D49A55] uppercase block">
                Official Trip Pass & Invite
              </span>
              <h3 className="font-serif text-xl font-bold text-[#FFF9F0] leading-tight">
                Invite Travelers
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#FFF9F0]/10 hover:bg-[#FFF9F0]/20 flex items-center justify-center text-[#FFF9F0] transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="px-6 pt-5 pb-2 flex items-center gap-2 border-b border-[#D8C9B5]/60 bg-[#F5EEE3]">
          <button
            onClick={() => setActiveTab("qr")}
            className={`px-4 py-2 rounded-lg text-xs font-bold font-mono transition flex items-center gap-1.5 ${
              activeTab === "qr"
                ? "bg-[#172A3A] text-[#FFF9F0] shadow-xs"
                : "bg-[#FFF9F0] text-[#746D65] border border-[#D8C9B5] hover:text-[#172A3A]"
            }`}
          >
            <QrCode className="w-3.5 h-3.5" />
            <span>Instant QR Code & Share</span>
          </button>
          <button
            onClick={() => setActiveTab("manual")}
            className={`px-4 py-2 rounded-lg text-xs font-bold font-mono transition flex items-center gap-1.5 ${
              activeTab === "manual"
                ? "bg-[#172A3A] text-[#FFF9F0] shadow-xs"
                : "bg-[#FFF9F0] text-[#746D65] border border-[#D8C9B5] hover:text-[#172A3A]"
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Manual Email Entry</span>
          </button>
        </div>

        {/* TAB 1: INSTANT QR CODE (DEFAULT) */}
        {activeTab === "qr" && (
          <div className="p-6 sm:p-8 space-y-6">
            {/* Trip Info Card */}
            <div className="p-3.5 bg-[#FFF9F0] border border-[#D8C9B5] rounded-xl flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono uppercase text-[#746D65] font-bold block">
                  Target Destination
                </span>
                <h4 className="font-serif text-sm font-bold text-[#172A3A] truncate max-w-[260px]">
                  {tripTitle} ({destination})
                </h4>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-mono uppercase text-[#746D65] font-bold block">
                  Code
                </span>
                <span className="font-mono text-xs font-bold text-[#C85C3A] bg-[#C85C3A]/10 px-2 py-0.5 rounded border border-[#C85C3A]/20">
                  {inviteCode}
                </span>
              </div>
            </div>

            {/* Passport QR Ticket Box */}
            <div className="bg-[#FFF9F0] border-2 border-dashed border-[#C85C3A]/40 rounded-2xl p-6 text-center space-y-4 shadow-xs relative">
              <div className="inline-block p-3.5 bg-white border border-[#D8C9B5] rounded-2xl shadow-sm">
                {qrDataUrl ? (
                  <img
                    src={qrDataUrl}
                    alt="Trip Invite QR Code"
                    className="w-48 h-48 mx-auto rounded-lg object-contain"
                  />
                ) : (
                  <div className="w-48 h-48 flex items-center justify-center text-xs text-[#746D65] font-mono">
                    Generating scannable QR pass...
                  </div>
                )}
              </div>

              <div>
                <p className="text-xs font-bold text-[#172A3A]">
                  Point camera to scan & join trip instantly
                </p>
                <p className="text-[11px] text-[#746D65] mt-0.5">
                  Friends don't need passwords — they enter their name and start splitting.
                </p>
              </div>

              {/* Fast Copy Link Box */}
              <div className="flex items-center gap-2 pt-2">
                <div className="flex-1 bg-[#F5EEE3] border border-[#D8C9B5] rounded-lg px-3 py-2 text-left truncate text-xs font-mono text-[#172A3A]">
                  {joinUrl}
                </div>
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 shrink-0 ${
                    copied
                      ? "bg-[#D49A55] text-white"
                      : "bg-[#172A3A] hover:bg-[#233d52] text-white shadow-xs"
                  }`}
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Link</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Direct Social Share Buttons */}
            <div className="space-y-2.5">
              <span className="text-[11px] font-mono uppercase font-bold text-[#746D65] block">
                1-Click Direct Share
              </span>
              <div className="grid grid-cols-2 gap-3">
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-[#25D366]/15 hover:bg-[#25D366]/25 border border-[#25D366]/40 text-[#128C7E] font-bold text-xs transition"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Share on WhatsApp</span>
                </a>
                <a
                  href={telegramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-[#0088cc]/15 hover:bg-[#0088cc]/25 border border-[#0088cc]/40 text-[#0088cc] font-bold text-xs transition"
                >
                  <Send className="w-4 h-4" />
                  <span>Telegram</span>
                </a>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="pt-4 border-t border-[#D8C9B5] flex items-center justify-between text-xs text-[#746D65]">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-[#D49A55]" />
                <span>{membersCount} travelers in workspace</span>
              </div>
              <button
                type="button"
                onClick={handleDownloadQR}
                className="inline-flex items-center gap-1 text-xs font-bold text-[#172A3A] hover:text-[#C85C3A] transition"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Save QR Image</span>
              </button>
            </div>
          </div>
        )}

        {/* TAB 2: MANUAL FORM (FALLBACK) */}
        {activeTab === "manual" && (
          <form onSubmit={handleManualSubmit} className="p-6 sm:p-8 space-y-4">
            <div>
              <label className="block text-xs font-bold text-[#746D65] uppercase tracking-wider mb-1">
                Full Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Maya Patel"
                value={manualName}
                onChange={(e) => setManualName(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-[#D8C9B5] bg-[#FFF9F0] text-sm text-[#292726] focus:outline-none focus:border-[#172A3A]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#746D65] uppercase tracking-wider mb-1">
                Email Address (Optional)
              </label>
              <input
                type="email"
                placeholder="maya@example.com"
                value={manualEmail}
                onChange={(e) => setManualEmail(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-[#D8C9B5] bg-[#FFF9F0] text-sm text-[#292726] focus:outline-none focus:border-[#172A3A]"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-[#746D65] uppercase tracking-wider mb-1">
                  Role
                </label>
                <select
                  value={manualRole}
                  onChange={(e) => setManualRole(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-[#D8C9B5] bg-[#FFF9F0] text-sm text-[#292726] focus:outline-none focus:border-[#172A3A]"
                >
                  <option value="MEMBER">Member (Can split)</option>
                  <option value="ORGANIZER">Organizer</option>
                  <option value="VIEWER">Viewer</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#746D65] uppercase tracking-wider mb-1">
                  Budget Share ({currency})
                </label>
                <input
                  type="number"
                  placeholder="10000"
                  value={manualPlannedAmount}
                  onChange={(e) => setManualPlannedAmount(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-[#D8C9B5] bg-[#FFF9F0] text-sm text-[#292726] focus:outline-none focus:border-[#172A3A]"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-[#D8C9B5] flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setActiveTab("qr")}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-[#746D65] hover:text-[#172A3A]"
              >
                ← Back to QR Code
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="bg-[#172A3A] hover:bg-[#233d52] text-white px-6 py-2.5 rounded-xl text-xs font-bold transition shadow-xs disabled:opacity-50"
              >
                {isSubmitting ? "Adding Traveler..." : "Add to Trip"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
