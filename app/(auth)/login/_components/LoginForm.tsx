"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export function LoginForm() {
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
    if (!email || !password) { setError("กรุณากรอกอีเมลและรหัสผ่าน"); return; }
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) { setError(error.message); setLoading(false); }
    else { setError("ส่งอีเมลยืนยันแล้ว — หรือเข้าสู่ระบบได้เลยถ้าปิด email confirmation"); setLoading(false); }
  }

  return (
    <form onSubmit={handleLogin} className="mt-8 space-y-3">
      <input
        type="email"
        placeholder="อีเมล"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        className="w-full rounded-2xl border border-[var(--glass-border)] bg-[var(--bg-elevated)] px-4 py-3 text-sm outline-none"
      />
      <input
        type="password"
        placeholder="รหัสผ่าน"
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
        {loading ? "กำลังเข้าสู่ระบบ…" : "เข้าสู่ระบบ"}
      </button>
      <button
        type="button"
        onClick={handleSignUp}
        disabled={loading}
        className="w-full rounded-2xl border border-[var(--glass-border)] py-3 text-sm font-medium disabled:opacity-50"
      >
        สมัครใหม่
      </button>
      <div className="text-center">
        <a href="/forgot-password" className="text-xs text-fg-muted hover:text-fg transition-colors">
          ลืมรหัสผ่าน?
        </a>
      </div>
    </form>
  );
}
