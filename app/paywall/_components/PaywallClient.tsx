// app/paywall/_components/PaywallClient.tsx
"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { motion } from "framer-motion";
import {
  ChevronLeft,
  Sparkles,
  Check,
  Copy,
  Upload,
  Image as ImageIcon,
  AlertTriangle,
  Loader2,
  Ticket,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useT } from "@/lib/i18n/LanguageProvider";
import { redeemPromoCode, submitPaymentSlip } from "@/app/actions/paywall";

interface Props {
  userId: string;
  userEmail: string;
  initialIsPro: boolean;
  initialPlanType: string | null;
  initialExpiresAt: string | null;
  initialPendingSlip: { id: string; plan_type: string; status: string; created_at: string } | null;
}

export function PaywallClient({
  userId,
  userEmail,
  initialIsPro,
  initialPlanType,
  initialExpiresAt,
  initialPendingSlip,
}: Props) {
  const t = useT();
  const router = useRouter();

  // Pricing & plans
  const [selectedPlan, setSelectedPlan] = useState<"yearly" | "monthly">("yearly");

  // Promo code states
  const [promoCode, setPromoCode] = useState("");
  const [promoLoading, setPromoLoading] = useState(false);
  const [promoError, setPromoError] = useState<string | null>(null);
  const [promoSuccess, setPromoSuccess] = useState<string | null>(null);

  // Slip upload states
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [slipLoading, setSlipLoading] = useState(false);
  const [slipError, setSlipError] = useState<string | null>(null);
  const [slipSuccess, setSlipSuccess] = useState<string | null>(null);
  const [pendingSlip, setPendingSlip] = useState(initialPendingSlip);

  // Clipboard copy feedback
  const [copiedPromptPayId, setCopiedPromptPayId] = useState(false);
  const [copiedAmount, setCopiedAmount] = useState(false);

  // PromptPay configuration
  const promptPayId = process.env.NEXT_PUBLIC_PROMPTPAY_ID || "0830491029";
  const amount = selectedPlan === "yearly" ? 399 : 39;
  const qrCodeUrl = `https://promptpay.io/${promptPayId}/${amount}.png`;

  // Drag and drop setup
  const onDrop = useCallback(async (files: File[]) => {
    const f = files[0];
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) {
      setSlipError(t.paywall.uploadFileTooLarge);
      return;
    }
    setFile(f);
    setPreviewUrl(URL.createObjectURL(f));
    setSlipError(null);
  }, [t]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/*": [".png", ".jpg", ".jpeg", ".webp"] },
    multiple: false,
  });

  // Action: Promo Code Redemption
  async function handleRedeemPromo() {
    if (!promoCode.trim()) return;
    setPromoLoading(true);
    setPromoError(null);
    setPromoSuccess(null);
    try {
      const res = await redeemPromoCode(promoCode);
      if (res.success) {
        setPromoSuccess(t.paywall.promoSuccess);
        setTimeout(() => {
          router.push("/overview");
          router.refresh();
        }, 1500);
      }
    } catch (err) {
      setPromoError(err instanceof Error ? err.message : t.paywall.promoError);
    } finally {
      setPromoLoading(false);
    }
  }

  // Action: Slip Upload Submit
  async function handleUploadSlip() {
    if (!file) return;
    setSlipLoading(true);
    setSlipError(null);
    setSlipSuccess(null);
    try {
      const supabase = createClient();
      const ext = file.name.split(".").pop() ?? "jpg";
      const filename = `${Date.now()}_slip.${ext}`;
      const storagePath = `${userId}/${filename}`;

      // Upload file to the storage bucket
      const { error: uploadErr } = await supabase.storage
        .from("payment-slips")
        .upload(storagePath, file, { contentType: file.type });

      if (uploadErr) throw new Error(uploadErr.message);

      // Trigger the server action to save record and notify the Telegram bot
      const res = await submitPaymentSlip(selectedPlan, storagePath);
      if (res.success) {
        setSlipSuccess(t.paywall.slipSuccess);
        setPendingSlip({
          id: res.slipId,
          plan_type: selectedPlan,
          status: "pending",
          created_at: new Date().toISOString(),
        });
        setFile(null);
        setPreviewUrl(null);
      }
    } catch (err) {
      setSlipError(err instanceof Error ? err.message : t.paywall.slipError);
    } finally {
      setSlipLoading(false);
    }
  }

  function handleCopyPromptPayId() {
    navigator.clipboard.writeText(promptPayId);
    setCopiedPromptPayId(true);
    setTimeout(() => setCopiedPromptPayId(false), 2000);
  }

  function handleCopyAmount() {
    navigator.clipboard.writeText(amount.toString());
    setCopiedAmount(true);
    setTimeout(() => setCopiedAmount(false), 2000);
  }

  return (
    <main className="flex min-h-dvh flex-col bg-[var(--bg)] px-4 py-8 md:px-8 max-w-4xl mx-auto space-y-6">
      {/* 🟢 Navigation Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/settings"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--bg-elevated)] border border-[var(--glass-border)] text-fg transition-opacity hover:opacity-90 active:scale-95"
          aria-label={t.paywall.backBtn}
        >
          <ChevronLeft size={20} />
        </Link>
        <div>
          <h1 className="text-xl font-bold tracking-tight">{t.paywall.title}</h1>
          <p className="text-xs text-fg-muted">{t.paywall.subtitle}</p>
        </div>
      </div>

      {/* Already Active Pro Info */}
      {initialIsPro && (
        <div className="rounded-[var(--radius-card)] bg-accent/10 border border-accent/30 p-5 text-center space-y-2">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-accent/20 text-accent">
            <Sparkles size={24} />
          </div>
          <h2 className="text-lg font-bold text-accent">Banana Sheet Pro Active</h2>
          <p className="text-sm text-fg-muted max-w-md mx-auto">
            You are currently upgraded to Pro. Active plan:{" "}
            <strong>
              {initialPlanType === "lifetime"
                ? "Lifetime"
                : initialPlanType === "yearly"
                ? "Yearly"
                : "Monthly"}
            </strong>
            {initialExpiresAt && ` (Expires on ${new Date(initialExpiresAt).toLocaleDateString()})`}
          </p>
        </div>
      )}

      {/* 🔴 Paywall Checkout Area */}
      {!initialIsPro && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
          {/* LEFT COLUMN: Gated Features list & Plan Picker */}
          <div className="space-y-6">
            {/* Interactive Plans */}
            <div className="space-y-3">
              {/* Plan 1: Yearly */}
              <button
                type="button"
                onClick={() => setSelectedPlan("yearly")}
                className={`relative w-full rounded-[var(--radius-card)] border p-5 text-left transition-all active:scale-[0.99] cursor-pointer ${
                  selectedPlan === "yearly"
                    ? "border-accent bg-accent/5 ring-1 ring-accent"
                    : "border-[var(--glass-border)] bg-[var(--bg-elevated)] hover:border-[var(--glass-border)]/80"
                }`}
              >
                <div className="absolute top-4 right-4 rounded-full bg-accent px-2.5 py-0.5 text-[10px] font-bold text-black uppercase tracking-wider">
                  {t.paywall.bestValue}
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`flex h-5 w-5 items-center justify-center rounded-full border ${
                      selectedPlan === "yearly"
                        ? "border-accent text-accent"
                        : "border-fg-muted"
                    }`}
                  >
                    {selectedPlan === "yearly" && <span className="h-2.5 w-2.5 rounded-full bg-accent" />}
                  </span>
                  <div>
                    <h3 className="font-bold text-base">{t.paywall.yearlyPlan}</h3>
                    <p className="text-xs text-fg-muted mt-0.5">{t.paywall.yearlyUnit}</p>
                  </div>
                </div>
                <p className="mt-4 font-mono text-2xl font-bold text-accent">
                  {t.paywall.yearlyPrice}
                </p>
              </button>

              {/* Plan 2: Monthly */}
              <button
                type="button"
                onClick={() => setSelectedPlan("monthly")}
                className={`w-full rounded-[var(--radius-card)] border p-5 text-left transition-all active:scale-[0.99] cursor-pointer ${
                  selectedPlan === "monthly"
                    ? "border-accent bg-accent/5 ring-1 ring-accent"
                    : "border-[var(--glass-border)] bg-[var(--bg-elevated)] hover:border-[var(--glass-border)]/80"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`flex h-5 w-5 items-center justify-center rounded-full border ${
                      selectedPlan === "monthly"
                        ? "border-accent text-accent"
                        : "border-fg-muted"
                    }`}
                  >
                    {selectedPlan === "monthly" && <span className="h-2.5 w-2.5 rounded-full bg-accent" />}
                  </span>
                  <div>
                    <h3 className="font-bold text-base">{t.paywall.monthlyPlan}</h3>
                    <p className="text-xs text-fg-muted mt-0.5">{t.paywall.monthlyUnit}</p>
                  </div>
                </div>
                <p className="mt-4 font-mono text-2xl font-bold text-accent">
                  {t.paywall.monthlyPrice}
                </p>
              </button>
            </div>

            {/* Premium Features List */}
            <div className="rounded-[var(--radius-card)] bg-[var(--bg-elevated)] border border-[var(--glass-border)] p-5 space-y-4">
              <h3 className="font-bold text-sm text-fg uppercase tracking-wide">
                {t.paywall.featuresTitle}
              </h3>
              <ul className="space-y-3 text-sm text-fg-muted">
                {t.paywall.featuresList.map((feature: string, idx: number) => (
                  <li key={idx} className="flex items-start gap-2.5">
                    <span className="shrink-0 text-accent font-semibold">✓</span>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* RIGHT COLUMN: Payment QR and Slip Upload */}
          <div className="space-y-6">
            {/* Dynamic PromptPay QR */}
            <div className="rounded-[var(--radius-card)] bg-[var(--bg-elevated)] border border-[var(--glass-border)] p-6 flex flex-col items-center text-center space-y-4 shadow-md">
              <h3 className="font-bold text-sm uppercase tracking-wide text-accent flex items-center gap-1.5">
                💳 {t.paywall.promptpayTitle}
              </h3>
              <p className="text-xs text-fg-muted">
                {t.paywall.promptpayInstruction}
              </p>

              {/* Gorgeous QR image display with a premium glass border frame */}
              <div className="relative rounded-2xl overflow-hidden bg-white p-4 border border-[var(--glass-border)] shadow-inner">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={qrCodeUrl}
                  alt="PromptPay QR Code"
                  className="h-44 w-44 object-contain"
                />
              </div>

              {/* Interactive payment data details */}
              <div className="w-full space-y-2 text-sm pt-2">
                {/* PromptPay ID copy */}
                <div className="flex items-center justify-between rounded-xl bg-[var(--bg)] px-3 py-2.5 border border-[var(--glass-border)]/50">
                  <div className="text-left">
                    <p className="text-[10px] text-fg-muted uppercase font-bold tracking-wide">PromptPay ID</p>
                    <p className="font-mono text-sm font-semibold">{promptPayId}</p>
                  </div>
                  <button
                    onClick={handleCopyPromptPayId}
                    className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--bg-elevated)] hover:bg-[var(--glass-bg)] active:scale-95 transition-all text-fg"
                  >
                    {copiedPromptPayId ? <Check size={14} className="text-accent" /> : <Copy size={14} />}
                  </button>
                </div>

                {/* Amount copy */}
                <div className="flex items-center justify-between rounded-xl bg-[var(--bg)] px-3 py-2.5 border border-[var(--glass-border)]/50">
                  <div className="text-left">
                    <p className="text-[10px] text-fg-muted uppercase font-bold tracking-wide">Amount (THB)</p>
                    <p className="font-mono text-base font-bold text-accent">฿{amount}.00</p>
                  </div>
                  <button
                    onClick={handleCopyAmount}
                    className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--bg-elevated)] hover:bg-[var(--glass-bg)] active:scale-95 transition-all text-fg"
                  >
                    {copiedAmount ? <Check size={14} className="text-accent" /> : <Copy size={14} />}
                  </button>
                </div>
              </div>
            </div>

            {/* Slip Upload Card */}
            <div className="rounded-[var(--radius-card)] bg-[var(--bg-elevated)] border border-[var(--glass-border)] p-6 space-y-4">
              <h3 className="font-bold text-sm uppercase tracking-wide text-fg">
                📸 {t.paywall.uploadTitle}
              </h3>

              {/* Status display if a slip is currently pending or rejected */}
              {pendingSlip && pendingSlip.status === "pending" && (
                <div className="rounded-xl bg-accent/15 border border-accent/25 p-4 text-center space-y-2">
                  <p className="text-sm font-semibold text-accent flex items-center justify-center gap-1.5">
                    🕒 {t.paywall.pendingSlipTitle}
                  </p>
                  <p className="text-xs text-fg-muted leading-relaxed">
                    {t.paywall.pendingSlipDesc}
                  </p>
                </div>
              )}

              {pendingSlip && pendingSlip.status === "rejected" && (
                <div className="rounded-xl bg-negative/10 border border-negative/25 p-4 text-center space-y-2">
                  <p className="text-sm font-semibold text-negative flex items-center justify-center gap-1.5">
                    ⚠️ {t.paywall.rejectedSlipTitle}
                  </p>
                  <p className="text-xs text-fg-muted leading-relaxed">
                    {t.paywall.rejectedSlipDesc}
                  </p>
                </div>
              )}

              {/* Upload Success Alert */}
              {slipSuccess && (
                <div className="rounded-xl bg-accent/10 border border-accent/25 p-4 text-xs text-accent text-center">
                  {slipSuccess}
                </div>
              )}

              {/* Main drag & drop file target area */}
              {(!pendingSlip || pendingSlip.status === "rejected") && !slipSuccess && (
                <>
                  <div
                    {...getRootProps()}
                    className={`cursor-pointer rounded-2xl border-2 border-dashed p-6 text-center transition-all ${
                      isDragActive
                        ? "border-accent bg-accent/5"
                        : "border-[var(--glass-border)] hover:border-[var(--glass-border)]/80"
                    }`}
                  >
                    <input {...getInputProps()} />
                    {previewUrl ? (
                      <div className="relative mx-auto h-32 w-24 overflow-hidden rounded-xl border border-[var(--glass-border)]">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={previewUrl}
                          alt="Transfer slip preview"
                          className="h-full w-full object-cover"
                        />
                      </div>
                    ) : (
                      <>
                        <Upload size={24} className="mx-auto mb-2 text-fg-muted" />
                        <p className="text-xs font-semibold">{t.paywall.uploadInstruction}</p>
                      </>
                    )}
                  </div>

                  {slipError && (
                    <div className="flex gap-2 rounded-xl bg-negative/10 p-3 text-xs text-negative">
                      <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                      <span>{slipError}</span>
                    </div>
                  )}

                  {file && (
                    <button
                      onClick={handleUploadSlip}
                      disabled={slipLoading}
                      className="w-full flex items-center justify-center gap-2 rounded-xl bg-accent py-3 text-sm font-semibold text-black hover:opacity-90 active:scale-[0.99] disabled:opacity-50 transition-all cursor-pointer"
                    >
                      {slipLoading && <Loader2 size={16} className="animate-spin" />}
                      {slipLoading ? t.paywall.submitLoading.split(" & ")[0] : t.paywall.submitBtn}
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 🏷️ DISCOUNT CODE DRAWER / CARD */}
      {!initialIsPro && (
        <div className="rounded-[var(--radius-card)] bg-[var(--bg-elevated)] border border-[var(--glass-border)] p-6 space-y-4 max-w-lg mx-auto w-full">
          <h3 className="font-bold text-sm uppercase tracking-wide text-fg flex items-center gap-1.5">
            <Ticket size={16} className="text-accent" />
            {t.paywall.promoTitle}
          </h3>

          <div className="flex gap-3">
            <input
              type="text"
              placeholder={t.paywall.promoPlaceholder}
              value={promoCode}
              onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
              disabled={promoLoading || !!promoSuccess}
              className="flex-1 rounded-xl border border-[var(--glass-border)] bg-[var(--bg)] px-4 py-2.5 text-sm outline-none transition-colors focus:border-accent disabled:opacity-50 font-mono"
            />
            <button
              onClick={handleRedeemPromo}
              disabled={promoLoading || !promoCode.trim() || !!promoSuccess}
              className="rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-black hover:opacity-90 active:scale-95 disabled:opacity-50 transition-all cursor-pointer flex items-center gap-2"
            >
              {promoLoading && <Loader2 size={14} className="animate-spin" />}
              {promoLoading ? t.paywall.promoLoading : t.paywall.promoBtn}
            </button>
          </div>

          {/* Success / Error feedbacks */}
          {promoError && (
            <div className="flex gap-2 rounded-xl bg-negative/10 p-3 text-xs text-negative">
              <AlertTriangle size={14} className="shrink-0 mt-0.5" />
              <span>{promoError}</span>
            </div>
          )}

          {promoSuccess && (
            <div className="rounded-xl bg-accent/15 border border-accent/25 p-3 text-xs text-accent text-center font-medium">
              {promoSuccess}
            </div>
          )}
        </div>
      )}
    </main>
  );
}
