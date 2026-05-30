"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      setSent(true);
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-semibold tracking-tight">ลืมรหัสผ่าน</h1>
        <p className="mt-2 text-sm text-fg-muted">
          กรอกอีเมลที่ใช้สมัคร เราจะส่งลิงก์รีเซ็ตรหัสผ่านให้
        </p>

        {sent ? (
          <div className="mt-8 space-y-4">
            <div className="glass rounded-2xl p-4 text-sm text-center">
              <p className="font-medium">ส่งอีเมลแล้ว ✉️</p>
              <p className="mt-1 text-fg-muted">กรุณาตรวจสอบอีเมล {email}</p>
            </div>
            <Link
              href="/login"
              className="block w-full rounded-2xl border border-[var(--glass-border)] py-3 text-center text-sm font-medium"
            >
              กลับหน้าเข้าสู่ระบบ
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-8 space-y-3">
            <input
              type="email"
              placeholder="อีเมล"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-2xl border border-[var(--glass-border)] bg-[var(--bg-elevated)] px-4 py-3 text-sm outline-none"
            />
            {error && <p className="text-xs text-[var(--negative)]">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-2xl bg-accent py-3 text-sm font-semibold text-black disabled:opacity-50"
            >
              {loading ? "กำลังส่ง…" : "ส่งลิงก์รีเซ็ต"}
            </button>
            <Link
              href="/login"
              className="block w-full rounded-2xl border border-[var(--glass-border)] py-3 text-center text-sm font-medium"
            >
              กลับ
            </Link>
          </form>
        )}
      </div>
    </main>
  );
}
