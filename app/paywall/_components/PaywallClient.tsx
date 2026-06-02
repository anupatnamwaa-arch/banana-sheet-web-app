"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import {
  AlertTriangle,
  Check,
  ChevronLeft,
  Copy,
  Loader2,
  Sparkles,
  Ticket,
  Upload,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AtelierCard,
  AtelierShell,
  BananaGuide,
  type BananaGuidePose,
} from "@/app/_components/atelier";
import { redeemPromoCode, submitPaymentSlip } from "@/app/actions/paywall";
import { createClient } from "@/lib/supabase/client";
import { useT } from "@/lib/i18n/LanguageProvider";

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
  initialIsPro,
  initialPlanType,
  initialExpiresAt,
  initialPendingSlip,
}: Props) {
  const t = useT();
  const router = useRouter();
  const [selectedPlan, setSelectedPlan] = useState<"yearly" | "monthly">("yearly");
  const [promoCode, setPromoCode] = useState("");
  const [promoLoading, setPromoLoading] = useState(false);
  const [promoError, setPromoError] = useState<string | null>(null);
  const [promoSuccess, setPromoSuccess] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [slipLoading, setSlipLoading] = useState(false);
  const [slipError, setSlipError] = useState<string | null>(null);
  const [slipSuccess, setSlipSuccess] = useState<string | null>(null);
  const [pendingSlip, setPendingSlip] = useState(initialPendingSlip);
  const [copiedPromptPayId, setCopiedPromptPayId] = useState(false);
  const [copiedAmount, setCopiedAmount] = useState(false);
  const promptPayId = process.env.NEXT_PUBLIC_PROMPTPAY_ID || "0830491029";
  const amount = selectedPlan === "yearly" ? 399 : 39;
  const qrCodeUrl = `https://promptpay.io/${promptPayId}/${amount}.png`;
  const guidePose: BananaGuidePose = initialIsPro || promoSuccess ? "celebrate" : pendingSlip?.status === "pending" ? "waiting" : pendingSlip?.status === "rejected" ? "retry" : "helpful";

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
      const { error: uploadErr } = await supabase.storage
        .from("payment-slips")
        .upload(storagePath, file, { contentType: file.type });
      if (uploadErr) throw new Error(uploadErr.message);
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

  const planCard = (plan: "yearly" | "monthly") => {
    const selected = selectedPlan === plan;
    return (
      <button
        type="button"
        onClick={() => setSelectedPlan(plan)}
        className={`relative w-full rounded-2xl border p-5 text-left transition-all active:scale-[0.99] ${
          selected
            ? "border-accent bg-accent/10 ring-1 ring-accent"
            : "border-[var(--atelier-line)] bg-[var(--atelier-paper)] hover:border-[var(--atelier-olive)]"
        }`}
      >
        {plan === "yearly" && (
          <span className="absolute right-4 top-4 rounded-full bg-accent px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-black">
            {t.paywall.bestValue}
          </span>
        )}
        <span className="flex items-center gap-3">
          <span className={`flex h-5 w-5 items-center justify-center rounded-full border ${selected ? "border-accent" : "border-[var(--atelier-olive)]"}`}>
            {selected && <span className="h-2.5 w-2.5 rounded-full bg-accent" />}
          </span>
          <span>
            <span className="block text-base font-bold">{plan === "yearly" ? t.paywall.yearlyPlan : t.paywall.monthlyPlan}</span>
            <span className="mt-0.5 block text-xs text-fg-muted">{plan === "yearly" ? t.paywall.yearlyUnit : t.paywall.monthlyUnit}</span>
          </span>
        </span>
        <span className="mt-4 block font-mono text-2xl font-bold text-accent">{plan === "yearly" ? t.paywall.yearlyPrice : t.paywall.monthlyPrice}</span>
      </button>
    );
  };

  return (
    <AtelierShell contentClassName="max-w-6xl">
      <header className="mb-6 flex items-center gap-4">
        <Link href="/settings" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[var(--atelier-line)] bg-[var(--atelier-surface)] transition-opacity hover:opacity-80" aria-label={t.paywall.backBtn}>
          <ChevronLeft size={20} />
        </Link>
        <div>
          <h1 className="text-xl font-bold tracking-tight">{t.paywall.title}</h1>
          <p className="text-xs text-fg-muted">{t.paywall.subtitle}</p>
        </div>
      </header>

      {initialIsPro ? (
        <AtelierCard className="atelier-card-arrive mx-auto max-w-2xl p-6 text-center">
          <BananaGuide pose={guidePose} className="mx-auto mb-2 h-28 w-28" />
          <Sparkles size={24} className="mx-auto text-accent" />
          <h2 className="mt-2 text-lg font-bold text-accent">Banana Sheet Pro Active</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-fg-muted">
            You are currently upgraded to Pro. Active plan:{" "}
            <strong>{initialPlanType === "lifetime" ? "Lifetime" : initialPlanType === "yearly" ? "Yearly" : "Monthly"}</strong>
            {initialExpiresAt && ` (Expires on ${new Date(initialExpiresAt).toLocaleDateString()})`}
          </p>
        </AtelierCard>
      ) : (
        <>
          <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,0.94fr)_minmax(22rem,1.06fr)]">
            <div className="space-y-6">
              <AtelierCard className="atelier-card-arrive p-6">
                <div className="flex items-center gap-4">
                  <BananaGuide pose={guidePose} className="h-28 w-28 shrink-0" />
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--atelier-olive)]">Banana Atelier</p>
                    <h2 className="mt-2 text-xl font-bold">{t.paywall.title}</h2>
                    <p className="mt-2 text-sm text-fg-muted">{t.paywall.subtitle}</p>
                  </div>
                </div>
              </AtelierCard>
              <div className="space-y-3">{planCard("yearly")}{planCard("monthly")}</div>
              <AtelierCard className="p-5">
                <h3 className="text-sm font-bold uppercase tracking-wide">{t.paywall.featuresTitle}</h3>
                <ul className="mt-4 space-y-3 text-sm text-fg-muted">
                  {t.paywall.featuresList.map((feature: string) => <li key={feature} className="flex items-start gap-2.5"><Check size={16} className="mt-0.5 shrink-0 text-accent" /><span>{feature}</span></li>)}
                </ul>
              </AtelierCard>
            </div>

            <div className="space-y-6">
              <AtelierCard className="flex flex-col items-center space-y-4 p-6 text-center">
                <h3 className="text-sm font-bold uppercase tracking-wide text-accent">{t.paywall.promptpayTitle}</h3>
                <p className="text-xs text-fg-muted">{t.paywall.promptpayInstruction}</p>
                <div className="overflow-hidden rounded-2xl border border-[var(--atelier-line)] bg-white p-4">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={qrCodeUrl} alt="PromptPay QR Code" className="h-44 w-44 object-contain" />
                </div>
                <div className="w-full space-y-2 pt-2 text-sm">
                  <div className="flex items-center justify-between rounded-xl border border-[var(--atelier-line)] bg-[var(--atelier-paper)] px-3 py-2.5">
                    <div className="text-left"><p className="text-[10px] font-bold uppercase tracking-wide text-fg-muted">PromptPay ID</p><p className="font-mono text-sm font-semibold">{promptPayId}</p></div>
                    <button type="button" onClick={handleCopyPromptPayId} aria-label="Copy PromptPay ID" className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--atelier-surface)] transition-opacity hover:opacity-80">{copiedPromptPayId ? <Check size={14} className="text-accent" /> : <Copy size={14} />}</button>
                  </div>
                  <div className="flex items-center justify-between rounded-xl border border-[var(--atelier-line)] bg-[var(--atelier-paper)] px-3 py-2.5">
                    <div className="text-left"><p className="text-[10px] font-bold uppercase tracking-wide text-fg-muted">Amount (THB)</p><p className="font-mono text-base font-bold text-accent">{amount}.00 THB</p></div>
                    <button type="button" onClick={handleCopyAmount} aria-label="Copy amount" className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--atelier-surface)] transition-opacity hover:opacity-80">{copiedAmount ? <Check size={14} className="text-accent" /> : <Copy size={14} />}</button>
                  </div>
                </div>
              </AtelierCard>

              <AtelierCard className="space-y-4 p-6">
                <h3 className="text-sm font-bold uppercase tracking-wide">{t.paywall.uploadTitle}</h3>
                {pendingSlip?.status === "pending" && <div aria-live="polite" className="rounded-xl border border-accent/25 bg-accent/15 p-4 text-center"><p className="text-sm font-semibold text-accent">{t.paywall.pendingSlipTitle}</p><p className="mt-2 text-xs leading-relaxed text-fg-muted">{t.paywall.pendingSlipDesc}</p></div>}
                {pendingSlip?.status === "rejected" && <div role="alert" className="rounded-xl border border-negative/25 bg-negative/10 p-4 text-center"><p className="text-sm font-semibold text-negative">{t.paywall.rejectedSlipTitle}</p><p className="mt-2 text-xs leading-relaxed text-fg-muted">{t.paywall.rejectedSlipDesc}</p></div>}
                {slipSuccess && <div aria-live="polite" className="rounded-xl border border-accent/25 bg-accent/10 p-4 text-center text-xs text-accent">{slipSuccess}</div>}
                {(!pendingSlip || pendingSlip.status === "rejected") && !slipSuccess && <>
                  <div {...getRootProps()} className={`cursor-pointer rounded-2xl border-2 border-dashed p-6 text-center transition-colors ${isDragActive ? "border-accent bg-accent/5" : "border-[var(--atelier-line)] hover:border-[var(--atelier-olive)]"}`}>
                    <input {...getInputProps()} />
                    {previewUrl ? (
                      <div className="mx-auto h-32 w-24 overflow-hidden rounded-xl border border-[var(--atelier-line)]">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={previewUrl} alt="Transfer slip preview" className="h-full w-full object-cover" />
                      </div>
                    ) : <><Upload size={24} className="mx-auto mb-2 text-fg-muted" /><p className="text-xs font-semibold">{t.paywall.uploadInstruction}</p></>}
                  </div>
                  {slipError && <div role="alert" className="flex gap-2 rounded-xl bg-negative/10 p-3 text-xs text-negative"><AlertTriangle size={14} className="mt-0.5 shrink-0" /><span>{slipError}</span></div>}
                  {file && <button type="button" onClick={handleUploadSlip} disabled={slipLoading} className="flex w-full items-center justify-center gap-2 rounded-xl bg-accent py-3 text-sm font-semibold text-black transition-opacity hover:opacity-90 disabled:opacity-50">{slipLoading && <Loader2 size={16} className="animate-spin" />}{slipLoading ? t.paywall.submitLoading.split(" & ")[0] : t.paywall.submitBtn}</button>}
                </>}
              </AtelierCard>
            </div>
          </div>

          <AtelierCard className="mx-auto mt-6 w-full max-w-lg space-y-4 p-6">
            <h3 className="flex items-center gap-1.5 text-sm font-bold uppercase tracking-wide"><Ticket size={16} className="text-accent" />{t.paywall.promoTitle}</h3>
            <div className="flex gap-3">
              <input type="text" placeholder={t.paywall.promoPlaceholder} value={promoCode} onChange={(event) => setPromoCode(event.target.value.toUpperCase())} disabled={promoLoading || !!promoSuccess} className="min-w-0 flex-1 rounded-xl border border-[var(--atelier-line)] bg-[var(--atelier-paper)] px-4 py-2.5 font-mono text-sm outline-none transition-colors focus:border-accent disabled:opacity-50" />
              <button type="button" onClick={handleRedeemPromo} disabled={promoLoading || !promoCode.trim() || !!promoSuccess} className="flex items-center gap-2 rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-black transition-opacity hover:opacity-90 disabled:opacity-50">{promoLoading && <Loader2 size={14} className="animate-spin" />}{promoLoading ? t.paywall.promoLoading : t.paywall.promoBtn}</button>
            </div>
            {promoError && <div role="alert" className="flex gap-2 rounded-xl bg-negative/10 p-3 text-xs text-negative"><AlertTriangle size={14} className="mt-0.5 shrink-0" /><span>{promoError}</span></div>}
            {promoSuccess && <div aria-live="polite" className="rounded-xl border border-accent/25 bg-accent/15 p-3 text-center text-xs font-medium text-accent">{promoSuccess}</div>}
          </AtelierCard>
        </>
      )}
    </AtelierShell>
  );
}
