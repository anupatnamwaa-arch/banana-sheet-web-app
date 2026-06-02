"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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

export function ResetPasswordForm({ dict, common }: Props) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (password !== confirm) {
      setError(dict.passwordMismatch);
      return;
    }
    if (password.length < 6) {
      setError(dict.passwordTooShort);
      return;
    }
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }
    router.push("/overview");
    router.refresh();
  }

  return (
    <AtelierShell contentClassName="flex min-h-[calc(100dvh-3rem)] max-w-md items-center justify-center">
      <AtelierCard className="atelier-card-arrive w-full px-6 py-7 text-center sm:px-8 sm:py-8">
        <AtelierBrand subtitle={dict.resetSubtitle} />
        <BananaGuide pose="helpful" className="mx-auto mt-4 h-24 w-24" />
        <h2 className="mt-2 text-xl font-bold tracking-tight">{dict.resetTitle}</h2>
        <form onSubmit={handleSubmit} className="mt-5 space-y-3 text-left">
          <label className="sr-only" htmlFor="new-password">
            {dict.newPasswordPlaceholder}
          </label>
          <input id="new-password" type="password" placeholder={dict.newPasswordPlaceholder} value={password} onChange={(event) => setPassword(event.target.value)} required minLength={6} className="w-full rounded-2xl border border-[var(--atelier-line)] bg-[var(--atelier-surface-strong)] px-4 py-3 text-sm outline-none transition-colors focus:border-accent" />
          <label className="sr-only" htmlFor="confirm-password">
            {dict.confirmPasswordPlaceholder}
          </label>
          <input id="confirm-password" type="password" placeholder={dict.confirmPasswordPlaceholder} value={confirm} onChange={(event) => setConfirm(event.target.value)} required className="w-full rounded-2xl border border-[var(--atelier-line)] bg-[var(--atelier-surface-strong)] px-4 py-3 text-sm outline-none transition-colors focus:border-accent" />
          {error && <p role="alert" className="text-xs text-negative">{error}</p>}
          <button type="submit" disabled={loading} className="w-full rounded-2xl bg-accent py-3 text-sm font-bold text-black disabled:opacity-50">
            {loading ? common.loading : dict.resetSubmit}
          </button>
        </form>
      </AtelierCard>
    </AtelierShell>
  );
}
