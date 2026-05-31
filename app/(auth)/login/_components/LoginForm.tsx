"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import type { Dictionary } from "@/lib/i18n";

export function LoginForm({ dict }: { dict: Dictionary["auth"] }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      router.push("/overview");
      router.refresh();
    }
  }

  async function handleSignUp() {
    if (!email || !password) { setError(dict.errorRequiredFields); return; }
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) { setError(error.message); setLoading(false); }
    else { setError(dict.signUpSuccess); setLoading(false); }
  }

  return (
    <form onSubmit={handleLogin} className="mt-8 space-y-3">
      <input
        type="email"
        placeholder={dict.emailPlaceholder}
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        className="w-full rounded-2xl border border-[var(--glass-border)] bg-[var(--bg-elevated)] px-4 py-3 text-sm outline-none"
      />
      <input
        type="password"
        placeholder={dict.passwordPlaceholder}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
        className="w-full rounded-2xl border border-[var(--glass-border)] bg-[var(--bg-elevated)] px-4 py-3 text-sm outline-none"
      />
      {error && <p className="text-xs text-[var(--negative)]">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-2xl bg-accent py-3 text-sm font-semibold text-black disabled:opacity-50"
      >
        {loading ? dict.loginLoading : dict.loginButton}
      </button>
      <button
        type="button"
        onClick={handleSignUp}
        disabled={loading}
        className="w-full rounded-2xl border border-[var(--glass-border)] py-3 text-sm font-medium disabled:opacity-50"
      >
        {dict.signUp}
      </button>
      <div className="text-center">
        <a href="/forgot-password" className="text-xs text-fg-muted hover:text-fg transition-colors">
          {dict.forgotPassword}
        </a>
      </div>
    </form>
  );
}
