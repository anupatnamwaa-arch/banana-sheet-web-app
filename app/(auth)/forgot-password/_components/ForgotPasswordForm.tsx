"use client";

import { useState } from "react";
import Link from "next/link";
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
    <main className="flex min-h-dvh flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-semibold tracking-tight">{dict.forgotTitle}</h1>
        <p className="mt-2 text-sm text-fg-muted">{dict.forgotDesc}</p>
        {sent ? (
          <div className="mt-8 space-y-4">
            <div className="glass rounded-2xl p-4 text-center text-sm">
              <p className="font-medium">{dict.forgotSuccess}</p>
              <p className="mt-1 text-fg-muted">
                {locale === "en" ? `Check ${email} for the link.` : `กรุณาตรวจสอบอีเมล ${email}`}
              </p>
            </div>
            <Link href="/login" className="block w-full rounded-2xl border border-[var(--glass-border)] py-3 text-center text-sm font-medium">
              {dict.backToLogin}
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-8 space-y-3">
            <input type="email" placeholder={dict.emailPlaceholder} value={email} onChange={(event) => setEmail(event.target.value)} required className="w-full rounded-2xl border border-[var(--glass-border)] bg-[var(--bg-elevated)] px-4 py-3 text-sm outline-none" />
            {error && <p className="text-xs text-[var(--negative)]">{error}</p>}
            <button type="submit" disabled={loading} className="w-full rounded-2xl bg-accent py-3 text-sm font-semibold text-black disabled:opacity-50">
              {loading ? common.loading : dict.forgotSubmit}
            </button>
            <Link href="/login" className="block w-full rounded-2xl border border-[var(--glass-border)] py-3 text-center text-sm font-medium">
              {common.back}
            </Link>
          </form>
        )}
      </div>
    </main>
  );
}
