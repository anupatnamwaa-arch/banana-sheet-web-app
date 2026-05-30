// app/(dashboard)/settings/_components/ApiKeySection.tsx
"use client";

import { useState } from "react";
import { Copy, Check, RefreshCw, AlertTriangle } from "lucide-react";
import { regenerateApiKey } from "@/app/actions/profile";

interface Props {
  initialKey: string | null;
}

/** Show first 8 + "···" + last 4 chars of a UUID */
function maskKey(key: string): string {
  if (key.length < 12) return key;
  return `${key.slice(0, 8)}···${key.slice(-4)}`;
}

export function ApiKeySection({ initialKey }: Props) {
  const [key, setKey] = useState<string | null>(initialKey);
  const [copied, setCopied] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [justRegenerated, setJustRegenerated] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canCopy = typeof navigator !== "undefined" && !!navigator.clipboard;

  async function handleCopy() {
    if (!key || !canCopy) return;
    try {
      await navigator.clipboard.writeText(key);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // silently ignore — clipboard permission denied
    }
  }

  async function handleRegenerate() {
    setRegenerating(true);
    setError(null);
    try {
      const newKey = await regenerateApiKey();
      setKey(newKey);
      setJustRegenerated(true);
      setTimeout(() => setJustRegenerated(false), 1500);
    } catch (e) {
      setError(e instanceof Error ? e.message : "สร้างใหม่ไม่สำเร็จ");
    } finally {
      setRegenerating(false);
    }
  }

  const inputClass =
    "w-full rounded-xl border border-[var(--glass-border)] bg-[var(--bg-elevated)] px-3 py-2.5 font-mono text-sm outline-none";

  return (
    <div className="glass p-5 space-y-3">
      <p className="text-sm font-medium text-fg-muted">API Key (สำหรับ Shortcut)</p>

      {/* Key display */}
      <div className="flex items-center gap-2">
        <div className={`${inputClass} flex-1 truncate select-all`} title={key ?? ""}>
          {key ? maskKey(key) : "—"}
        </div>

        {key && canCopy && (
          <button
            onClick={handleCopy}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[var(--glass-border)] transition-colors"
            title="คัดลอก Key"
          >
            {copied ? (
              <Check size={16} className="text-[var(--positive)]" />
            ) : (
              <Copy size={16} className="text-fg-muted" />
            )}
          </button>
        )}
      </div>

      {copied && (
        <p className="text-xs text-[var(--positive)]">✓ คัดลอกแล้ว</p>
      )}

      {justRegenerated && (
        <p className="text-xs text-[var(--positive)]">✓ สร้างใหม่แล้ว</p>
      )}

      {error && (
        <div className="flex gap-2 rounded-xl bg-[var(--negative)]/10 p-3 text-xs text-[var(--negative)]">
          <AlertTriangle size={14} className="mt-0.5 shrink-0" />
          {error}
        </div>
      )}

      {/* Regenerate */}
      <button
        onClick={handleRegenerate}
        disabled={regenerating}
        className="flex items-center gap-2 rounded-xl border border-[var(--glass-border)] px-3 py-2 text-xs font-medium text-fg-muted transition-opacity disabled:opacity-50"
      >
        <RefreshCw size={14} className={regenerating ? "animate-spin" : ""} />
        {regenerating ? "กำลังสร้าง…" : "สร้าง Key ใหม่"}
      </button>

      {/* Warning */}
      <p className="text-xs text-fg-muted">
        ⚠ ห้ามแชร์ Key นี้ — ใครมี Key สามารถเพิ่มรายการได้
      </p>
    </div>
  );
}
