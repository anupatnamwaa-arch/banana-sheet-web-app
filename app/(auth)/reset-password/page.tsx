"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      setError("รหัสผ่านไม่ตรงกัน");
      return;
    }
    if (password.length < 6) {
      setError("รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร");
      return;
    }
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      router.push("/overview");
      router.refresh();
    }
  }

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-semibold tracking-tight">ตั้งรหัสผ่านใหม่</h1>
        <p className="mt-2 text-sm text-fg-muted">
          กรอกรหัสผ่านใหม่ที่ต้องการใช้
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-3">
          <input
            type="password"
            placeholder="รหัสผ่านใหม่"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            className="w-full rounded-2xl border border-[var(--glass-border)] bg-[var(--bg-elevated)] px-4 py-3 text-sm outline-none"
          />
          <input
            type="password"
            placeholder="ยืนยันรหัสผ่าน"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            className="w-full rounded-2xl border border-[var(--glass-border)] bg-[var(--bg-elevated)] px-4 py-3 text-sm outline-none"
          />
          {error && <p className="text-xs text-[var(--negative)]">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-2xl bg-accent py-3 text-sm font-semibold text-black disabled:opacity-50"
          >
            {loading ? "กำลังบันทึก…" : "บันทึกรหัสผ่านใหม่"}
          </button>
        </form>
      </div>
    </main>
  );
}
