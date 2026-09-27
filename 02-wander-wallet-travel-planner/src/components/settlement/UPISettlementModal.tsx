"use client";

import React, { useState, useEffect } from "react";
import QRCode from "qrcode";
import {
  QrCode,
  X,
  Copy,
  Check,
  ExternalLink,
  ArrowRight,
  Edit2,
  CheckCircle2,
} from "lucide-react";

export interface SettlementTxData {
  id: string;
  fromMemberId: string;
  fromMemberName: string;
  toMemberId: string;
  toMemberName: string;
  amountMinor: string | number;
  formattedAmount: string;
  currency: string;
  isPaid: boolean;
  paidAt?: string | null;
  paymentReference?: string | null;
}

export interface UPISettlementModalProps {
  isOpen: boolean;
  onClose: () => void;
  tx: SettlementTxData | null;
  tripTitle?: string;
  recipientAvatar?: string;
  recipientEmail?: string;
  onConfirmSettled: (reference: string) => Promise<void>;
}

export function UPISettlementModal({
  isOpen,
  onClose,
  tx,
  tripTitle = "Wander Wallet",
  recipientEmail,
  onConfirmSettled,
}: UPISettlementModalProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [upiId, setUpiId] = useState<string>("");
  const [isEditingUpi, setIsEditingUpi] = useState<boolean>(false);
  const [customUpiInput, setCustomUpiInput] = useState<string>("");
  const [copiedUpi, setCopiedUpi] = useState<boolean>(false);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [paymentRef, setPaymentRef] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);

  // Compute default UPI ID when tx changes
  useEffect(() => {
    if (!tx) return;

    // Build default UPI handle from recipient name
    const cleanName = tx.toMemberName
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]/g, "");
    
    // Check if recipient has email that can derive handle
    let defaultUpi = `${cleanName}@okaxis`;
    if (recipientEmail && recipientEmail.includes("@")) {
      const emailPrefix = recipientEmail.split("@")[0].replace(/[^a-z0-9]/g, "");
      if (emailPrefix) defaultUpi = `${emailPrefix}@upi`;
    }

    setUpiId(defaultUpi);
    setCustomUpiInput(defaultUpi);
    setPaymentRef(`UPI-${Math.floor(100000 + Math.random() * 900000)}`);
  }, [tx, recipientEmail]);

  // Construct official UPI Deep Link string
  const amountInRupees = tx ? (Number(tx.amountMinor) / 100).toFixed(2) : "0.00";
  const upiDeepLink = tx && upiId
    ? `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(
        tx.toMemberName
      )}&am=${amountInRupees}&cu=INR&tn=${encodeURIComponent(
        `WanderWallet: ${tripTitle} Settlement`
      )}`
    : "";

  // Generate QR Code when UPI deep link changes
  useEffect(() => {
    if (!upiDeepLink) return;

    let isMounted = true;
    QRCode.toDataURL(upiDeepLink, {
      errorCorrectionLevel: "H",
      margin: 2,
      width: 320,
      color: {
        dark: "#163F38",
        light: "#FFFFFF",
      },
    })
      .then((url) => {
        if (isMounted) setQrDataUrl(url);
      })
      .catch((err) => {
        console.error("Failed to generate UPI QR code:", err);
      });

    return () => {
      isMounted = false;
    };
  }, [upiDeepLink]);

  if (!isOpen || !tx) return null;

  const handleCopyUpi = async () => {
    try {
      await navigator.clipboard.writeText(upiId);
      setCopiedUpi(true);
      setTimeout(() => setCopiedUpi(false), 2000);
    } catch {
      // fallback
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(upiDeepLink);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      // fallback
    }
  };

  const handleSaveCustomUpi = () => {
    if (customUpiInput && customUpiInput.includes("@")) {
      setUpiId(customUpiInput.trim());
      setIsEditingUpi(false);
      setErrorNotice(null);
    } else {
      setErrorNotice("Please enter a valid UPI ID (e.g. name@okaxis or name@upi)");
    }
  };

  const handleConfirm = async () => {
    try {
      setIsSubmitting(true);
      setErrorNotice(null);
      await onConfirmSettled(paymentRef || `UPI-${Math.floor(100000 + Math.random() * 900000)}`);
      onClose();
    } catch (e: any) {
      setErrorNotice(e?.message || "Failed to confirm payment settlement");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-[#FCF9F2] border-2 border-[#163F38]/20 rounded-3xl max-w-md w-full shadow-2xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
        {/* Header Banner */}
        <div className="bg-gradient-to-r from-[#163F38] via-[#1d5249] to-[#123630] p-6 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all cursor-pointer"
            title="Close modal"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-2 text-[11px] font-bold tracking-wider uppercase text-[#C9A35B]">
            <QrCode className="w-4 h-4" />
            <span>Instant Scan-and-Pay UPI</span>
          </div>

          <div className="mt-3 flex items-center justify-between">
            <div>
              <h3 className="font-serif text-2xl font-bold tracking-tight text-[#FCF9F2]">
                Debt Settlement
              </h3>
              <p className="text-xs text-white/80 mt-0.5">
                Scan with any Indian UPI app to clear group debt
              </p>
            </div>

            <div className="text-right">
              <span className="text-[10px] text-white/70 block uppercase font-medium">
                Amount to Pay
              </span>
              <span className="font-serif text-2xl font-bold text-[#C9A35B]">
                {tx.formattedAmount}
              </span>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Transfer Route Badge */}
          <div className="p-3.5 rounded-2xl bg-white border border-[#DCCFBC] shadow-2xs flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-[#163F38] text-white font-bold flex items-center justify-center text-xs">
                {tx.fromMemberName[0]}
              </div>
              <div>
                <span className="text-[10px] text-[#8A7B68] block">Payer</span>
                <span className="font-bold text-[#163F38]">{tx.fromMemberName}</span>
              </div>
            </div>

            <div className="flex flex-col items-center">
              <span className="text-[10px] font-mono font-bold text-[#C95B3D]">pays</span>
              <ArrowRight className="w-4 h-4 text-[#C95B3D]" />
            </div>

            <div className="flex items-center gap-2 text-right">
              <div>
                <span className="text-[10px] text-[#8A7B68] block">Receiver</span>
                <span className="font-bold text-[#163F38]">{tx.toMemberName}</span>
              </div>
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#C95B3D] to-[#b04f30] text-white font-bold flex items-center justify-center text-xs">
                {tx.toMemberName[0]}
              </div>
            </div>
          </div>

          {/* QR Code Presentation Box */}
          <div className="bg-white rounded-2xl p-5 border-2 border-dashed border-[#163F38]/30 shadow-inner flex flex-col items-center justify-center text-center">
            {qrDataUrl ? (
              <div className="relative group">
                <img
                  src={qrDataUrl}
                  alt={`UPI QR code for ${tx.toMemberName}`}
                  className="w-56 h-56 rounded-xl shadow-md border border-[#DCCFBC]"
                />
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-10 h-10 rounded-full bg-white shadow-md border-2 border-[#163F38] flex items-center justify-center">
                    <span className="text-xs font-bold font-serif text-[#163F38]">₹ UPI</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="w-56 h-56 rounded-xl bg-[#F5EFE3] flex items-center justify-center animate-pulse">
                <span className="text-xs text-[#7A6C58]">Generating QR code...</span>
              </div>
            )}

            {/* UPI App Icons Row */}
            <div className="mt-3 flex items-center justify-center gap-2 text-[10px] font-bold text-[#7A6C58] flex-wrap">
              <span className="px-2 py-0.5 rounded bg-[#F5EFE3] border border-[#DCCFBC]">GPay</span>
              <span className="px-2 py-0.5 rounded bg-[#F5EFE3] border border-[#DCCFBC]">PhonePe</span>
              <span className="px-2 py-0.5 rounded bg-[#F5EFE3] border border-[#DCCFBC]">Paytm</span>
              <span className="px-2 py-0.5 rounded bg-[#F5EFE3] border border-[#DCCFBC]">BHIM</span>
              <span className="px-2 py-0.5 rounded bg-[#F5EFE3] border border-[#DCCFBC]">Cred</span>
            </div>
          </div>

          {/* UPI ID Details & Quick Copy */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-[#5A5040] uppercase tracking-wider text-[11px]">
                Receiver UPI VPA
              </span>
              {!isEditingUpi && (
                <button
                  type="button"
                  onClick={() => setIsEditingUpi(true)}
                  className="text-[11px] font-bold text-[#163F38] hover:text-[#C95B3D] flex items-center gap-1 cursor-pointer"
                >
                  <Edit2 className="w-3 h-3" />
                  <span>Edit UPI ID</span>
                </button>
              )}
            </div>

            {isEditingUpi ? (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={customUpiInput}
                  onChange={(e) => setCustomUpiInput(e.target.value)}
                  placeholder="e.g. rahul@okaxis"
                  className="flex-1 px-3 py-1.5 rounded-xl border border-[#DCCFBC] bg-white text-xs font-mono font-bold focus:ring-2 focus:ring-[#163F38] focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleSaveCustomUpi}
                  className="px-3 py-1.5 rounded-xl bg-[#163F38] text-white text-xs font-bold hover:bg-[#1f534a] cursor-pointer"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditingUpi(false)}
                  className="px-2.5 py-1.5 rounded-xl bg-[#EAE2CE] text-[#5A5040] text-xs font-bold hover:bg-[#E0D5BE] cursor-pointer"
                >
                  ✕
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-white border border-[#DCCFBC] shadow-2xs">
                <span className="font-mono text-xs font-bold text-[#163F38] truncate">{upiId}</span>
                <button
                  type="button"
                  onClick={handleCopyUpi}
                  className="text-xs font-bold text-[#163F38] hover:text-[#C95B3D] flex items-center gap-1 shrink-0 ml-2 cursor-pointer"
                >
                  {copiedUpi ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-emerald-700">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Quick Action Toolbar */}
          <div className="grid grid-cols-2 gap-2.5">
            <a
              href={upiDeepLink}
              target="_blank"
              rel="noreferrer"
              className="py-2.5 px-3 rounded-xl bg-[#163F38] hover:bg-[#1f534a] text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs hover:scale-105 active:scale-95 transition-all"
            >
              <ExternalLink className="w-3.5 h-3.5 text-[#C9A35B]" />
              <span>Open in UPI App</span>
            </a>

            <button
              type="button"
              onClick={handleCopyLink}
              className="py-2.5 px-3 rounded-xl bg-white hover:bg-[#F5EFE3] text-[#163F38] border border-[#DCCFBC] text-xs font-bold flex items-center justify-center gap-1.5 shadow-2xs hover:scale-105 active:scale-95 transition-all cursor-pointer"
            >
              {copiedLink ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-700">Link Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-[#C95B3D]" />
                  <span>Copy UPI Link</span>
                </>
              )}
            </button>
          </div>

          {/* Settle Up Confirmation Section */}
          <div className="pt-4 border-t border-[#DCCFBC]/70 space-y-3">
            <div>
              <label className="block text-[11px] font-bold text-[#5A5040] uppercase tracking-wider mb-1">
                Payment Reference / UTR (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. UPI-984321 / GPay Ref"
                value={paymentRef}
                onChange={(e) => setPaymentRef(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-[#DCCFBC] bg-white text-xs font-mono font-medium focus:ring-2 focus:ring-[#163F38] focus:outline-none"
              />
            </div>

            {errorNotice && (
              <p className="text-xs text-rose-700 bg-rose-50 p-2 rounded-xl border border-rose-200">
                {errorNotice}
              </p>
            )}

            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleConfirm}
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-[#C95B3D] to-[#b04f30] hover:from-[#b04f30] hover:to-[#9e2a2b] text-white text-xs font-bold flex items-center justify-center gap-2 shadow-md hover:scale-[1.02] active:scale-95 transition-all cursor-pointer disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4 text-white" />
              <span>{isSubmitting ? "Recording Settlement..." : "Confirm Paid & Clear Debt"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
