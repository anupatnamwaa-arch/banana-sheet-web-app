"use client";

import { useState } from "react";
import Link from "next/link";
import {
  AtelierBrand,
  AtelierCard,
  AtelierShell,
  BananaGuide,
} from "@/app/_components/atelier";
import { createClient } from "@/lib/supabase/client";
import type { Dictionary } from "@/lib/i18n";

interface Props {
  dict: Dictionary["auth"];
  common: Dictionary["common"];
  locale: string;
}

export function ForgotPasswordForm({ dict, common, locale }: Props) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) setError(error.message);
    else setSent(true);
    setLoading(false);
  }

  return (
    <AtelierShell contentClassName="flex min-h-[calc(100dvh-3rem)] max-w-md items-center justify-center">
      <AtelierCard className="atelier-card-arrive w-full px-6 py-7 text-center sm:px-8 sm:py-8">
        <AtelierBrand subtitle={dict.forgotDesc} />
        <BananaGuide pose={sent ? "celebrate" : "helpful"} className="mx-auto mt-4 h-24 w-24" />
        <h2 className="mt-2 text-xl font-bold tracking-tight">{dict.forgotTitle}</h2>
        {sent ? (
          <div className="mt-5 space-y-4">
            <div aria-live="polite" className="rounded-2xl border border-accent/30 bg-accent/10 p-4 text-center text-sm">
              <p className="font-semibold">{dict.forgotSuccess}</p>
              <p className="mt-1 text-fg-muted">
                {locale === "en" ? `Check ${email} for the link.` : `กรุณาตรวจสอบอีเมล ${email}`}
              </p>
            </div>
            <Link href="/login" className="block w-full rounded-2xl border border-[var(--atelier-line)] py-3 text-center text-sm font-semibold">
              {dict.backToLogin}
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-5 space-y-3 text-left">
            <label className="sr-only" htmlFor="forgot-email">
              {dict.emailPlaceholder}
            </label>
            <input id="forgot-email" type="email" placeholder={dict.emailPlaceholder} value={email} onChange={(event) => setEmail(event.target.value)} required className="w-full rounded-2xl border border-[var(--atelier-line)] bg-[var(--atelier-surface-strong)] px-4 py-3 text-sm outline-none transition-colors focus:border-accent" />
            {error && <p role="alert" className="text-xs text-negative">{error}</p>}
            <button type="submit" disabled={loading} className="w-full rounded-2xl bg-accent py-3 text-sm font-bold text-black disabled:opacity-50">
              {loading ? common.loading : dict.forgotSubmit}
            </button>
            <Link href="/login" className="block w-full rounded-2xl border border-[var(--atelier-line)] py-3 text-center text-sm font-semibold">
              {common.back}
            </Link>
          </form>
        )}
      </AtelierCard>
    </AtelierShell>
  );
}
