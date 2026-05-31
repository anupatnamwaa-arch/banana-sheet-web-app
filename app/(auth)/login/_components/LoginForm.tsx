"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import type { Dictionary } from "@/lib/i18n";

export function LoginForm({ dict }: { dict: Dictionary["auth"] }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // Keep PWA users logged in: auto-heal session cookies from localStorage on mount
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        router.push("/overview");
        router.refresh();
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if ((event === "SIGNED_IN" || event === "TOKEN_REFRESHED") && session) {
        router.push("/overview");
        router.refresh();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [router]);

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

  async function handleGoogleLogin() {
    setLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) {
        setError(error.message);
        setLoading(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Google authentication failed");
      setLoading(false);
    }
  }

  return (
    <div className="mt-8 space-y-3">
      {/* Premium Google Sign-In Button */}
      <button
        type="button"
        onClick={handleGoogleLogin}
        disabled={loading}
        className="flex w-full items-center justify-center gap-3 rounded-2xl border border-[var(--glass-border)] bg-[var(--bg-elevated)] py-3 text-sm font-semibold transition-all hover:bg-[var(--glass-bg)] active:scale-[0.98] disabled:opacity-50 cursor-pointer shadow-sm"
      >
        <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" width="24" height="24" xmlns="http://www.w3.org/2000/svg">
          <path d="M21.35,11.1H12v2.7h5.38c-0.24,1.28 -0.96,2.37 -2.04,3.1v2.57h3.3c1.93,-1.78 3.04,-4.4 3.04,-7.37C21.68,11.83 21.56,11.45 21.35,11.1z" fill="#4285F4" />
          <path d="M12,20.9c2.5,0 4.6,-0.83 6.13,-2.26l-3.3,-2.57c-0.91,0.61 -2.08,0.98 -3.3,0.98c-2.42,0 -4.47,-1.64 -5.2,-3.84H3v2.66C4.52,18.91 8.01,20.9 12,20.9z" fill="#34A853" />
          <path d="M6.8,13.22c-0.18,-0.55 -0.29,-1.13 -0.29,-1.72s0.1,-1.17 0.29,-1.72V7.12H3C2.36,8.4 2,9.88 2,11.5s0.36,3.1 1,4.38L6.8,13.22z" fill="#FBBC05" />
          <path d="M12,5.38c1.36,0 2.58,0.47 3.54,1.38l2.65,-2.65C16.6,2.6 14.5,1.7 12,1.7C8.01,1.7 4.52,3.69 3,6.72l3.8,2.96C7.53,7.48 9.58,5.38 12,5.38z" fill="#EA4335" />
        </svg>
        {loading ? dict.googleSigningIn : dict.googleSignIn}
      </button>

      {/* Elegant visual divider */}
      <div className="relative py-3 flex items-center justify-center">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-[var(--glass-border)] opacity-40"></div>
        </div>
        <span className="relative bg-[var(--bg-elevated)] px-4 text-xs font-semibold tracking-wide text-fg-muted uppercase">
          {dict.googleSignIn ? (dict.googleSignIn.includes("Google") ? "or" : "หรือ") : "or"}
        </span>
      </div>

      <form onSubmit={handleLogin} className="space-y-3">
        <input
          type="email"
          placeholder={dict.emailPlaceholder}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full rounded-2xl border border-[var(--glass-border)] bg-[var(--bg-elevated)] px-4 py-3 text-sm outline-none transition-colors focus:border-accent"
        />
        <input
          type="password"
          placeholder={dict.passwordPlaceholder}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="w-full rounded-2xl border border-[var(--glass-border)] bg-[var(--bg-elevated)] px-4 py-3 text-sm outline-none transition-colors focus:border-accent"
        />
        {error && <p className="text-xs text-[var(--negative)]">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-2xl bg-accent py-3 text-sm font-semibold text-black disabled:opacity-50 cursor-pointer"
        >
          {loading ? dict.loginLoading : dict.loginButton}
        </button>
        <button
          type="button"
          onClick={handleSignUp}
          disabled={loading}
          className="w-full rounded-2xl border border-[var(--glass-border)] py-3 text-sm font-medium disabled:opacity-50 cursor-pointer"
        >
          {dict.signUp}
        </button>
        <div className="text-center pt-1">
          <a href="/forgot-password" className="text-xs text-fg-muted hover:text-fg transition-colors">
            {dict.forgotPassword}
          </a>
        </div>
      </form>
    </div>
  );
}
