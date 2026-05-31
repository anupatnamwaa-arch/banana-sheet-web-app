"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { updateSavingsTarget } from "@/app/actions/profile";
import { useT } from "@/lib/i18n/LanguageProvider";

interface Props {
  initialTarget: number;
}

export function SavingsTargetSection({ initialTarget }: Props) {
  const t = useT();
  const [value, setValue] = useState(initialTarget);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const result = await updateSavingsTarget(value);
      setValue(result);
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    } catch (e) {
      setError(e instanceof Error ? e.message : t.settings.savingsTargetError);
    } finally {
      setSaving(false);
    }
  }

  const dirty = value !== initialTarget;

  return (
    <div className="glass p-5 space-y-3">
      <p className="text-sm font-medium text-fg-muted">{t.settings.savingsTargetLabel}</p>
      <p className="text-xs text-fg-muted">
        {t.settings.savingsTargetHint}
      </p>

      <div className="flex items-center gap-3">
        <input
          type="range"
          min={0}
          max={100}
          step={1}
          value={value}
          onChange={(e) => setValue(Number(e.target.value))}
          className="flex-1 accent-[var(--accent)]"
        />
        <span className="w-14 shrink-0 text-right text-lg font-bold tabular-nums text-blue-400">
          {value}%
        </span>
      </div>

      {error && <p className="text-xs text-[var(--negative)]">{error}</p>}

      <button
        onClick={handleSave}
        disabled={saving || !dirty}
        className="flex items-center gap-2 rounded-xl border border-[var(--glass-border)] px-3 py-2 text-xs font-medium text-fg-muted transition-opacity disabled:opacity-50"
      >
        {saved ? <Check size={14} className="text-[var(--positive)]" /> : null}
        {saving ? t.settings.savingsTargetSaving : saved ? t.settings.savingsTargetSaved : t.settings.savingsTargetSave}
      </button>
    </div>
  );
}
