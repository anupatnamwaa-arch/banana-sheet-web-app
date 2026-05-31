"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { saveEmergencyGoal } from "@/app/actions/profile";
import { useT } from "@/lib/i18n/LanguageProvider";

interface Props {
  initialMonths: number;
}

export function EmergencyGoalSection({ initialMonths }: Props) {
  const t = useT();
  const [value, setValue] = useState(initialMonths);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dirty = value !== initialMonths;

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const result = await saveEmergencyGoal(value);
      setValue(result);
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    } catch (e) {
      setError(e instanceof Error ? e.message : t.settings.emergencyGoalError);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="glass p-5 space-y-3">
      <div className="flex items-center gap-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[var(--glass-bg)] text-base">
          🛡️
        </span>
        <p className="text-sm font-medium text-fg-muted">{t.settings.emergencyGoalLabel}</p>
      </div>
      <p className="text-xs text-fg-muted">{t.settings.emergencyGoalHint}</p>

      <div className="flex items-center gap-3">
        <input
          type="range"
          min={1}
          max={24}
          step={1}
          value={value}
          onChange={(e) => setValue(Number(e.target.value))}
          className="flex-1 accent-[var(--accent)]"
        />
        <span className="w-20 shrink-0 text-right text-lg font-bold tabular-nums text-blue-400">
          {value} {t.settings.emergencyGoalMonthsSuffix}
        </span>
      </div>

      {error && <p className="text-xs text-[var(--negative)]">{error}</p>}

      <button
        onClick={handleSave}
        disabled={saving || !dirty}
        className="flex items-center gap-2 rounded-xl border border-[var(--glass-border)] px-3 py-2 text-xs font-medium text-fg-muted transition-opacity disabled:opacity-50"
      >
        {saved ? <Check size={14} className="text-[var(--positive)]" /> : null}
        {saving ? t.settings.emergencyGoalSaving
         : saved ? t.settings.emergencyGoalSaved
         : t.settings.emergencyGoalSave}
      </button>
    </div>
  );
}
