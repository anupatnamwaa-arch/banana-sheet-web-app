"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Dictionary } from "@/lib/i18n";

interface Props {
  dict: Dictionary["auth"];
  common: Dictionary["common"];
  locale: string;
}

export function ResetPasswordForm({ dict, common, locale }: Props) {
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
    <main className="flex min-h-dvh flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-semibold tracking-tight">{dict.resetTitle}</h1>
        <p className="mt-2 text-sm text-fg-muted">
          {dict.resetSubtitle}
        </p>
        <form onSubmit={handleSubmit} className="mt-8 space-y-3">
          <input type="password" placeholder={dict.newPasswordPlaceholder} value={password} onChange={(event) => setPassword(event.target.value)} required minLength={6} className="w-full rounded-2xl border border-[var(--glass-border)] bg-[var(--bg-elevated)] px-4 py-3 text-sm outline-none" />
          <input type="password" placeholder={dict.confirmPasswordPlaceholder} value={confirm} onChange={(event) => setConfirm(event.target.value)} required className="w-full rounded-2xl border border-[var(--glass-border)] bg-[var(--bg-elevated)] px-4 py-3 text-sm outline-none" />
          {error && <p className="text-xs text-[var(--negative)]">{error}</p>}
          <button type="submit" disabled={loading} className="w-full rounded-2xl bg-accent py-3 text-sm font-semibold text-black disabled:opacity-50">
            {loading ? common.loading : dict.resetSubmit}
          </button>
        </form>
      </div>
    </main>
  );
}
