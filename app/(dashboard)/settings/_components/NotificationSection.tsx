"use client";

import { useEffect, useState } from "react";
import { SettingsSection } from "./SettingsSection";
import { useT } from "@/lib/i18n/LanguageProvider";

const NOTIF_KEYS = ["notif-daily", "notif-budget", "notif-debt", "notif-weekly"] as const;

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!on)}
      className={`h-6 w-11 shrink-0 rounded-full p-0.5 transition-colors ${
        on ? "bg-accent" : "bg-[var(--glass-border)]"
      }`}
    >
      <span
        className={`block h-5 w-5 rounded-full bg-white shadow transition-transform ${
          on ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </button>
  );
}

export function NotificationSection() {
  const t = useT();
  const [values, setValues] = useState<Record<string, boolean>>({});
  const notifications = [
    { key: "notif-daily", icon: "⏰", label: t.settings.notifDailyLabel, sublabel: t.settings.notifDailySub },
    { key: "notif-budget", icon: "⚠️", label: t.settings.notifBudgetLabel, sublabel: t.settings.notifBudgetSub },
    { key: "notif-debt", icon: "💳", label: t.settings.notifLiabilityLabel, sublabel: t.settings.notifLiabilitySub },
    { key: "notif-weekly", icon: "📊", label: t.settings.notifWeeklyLabel, sublabel: t.settings.notifWeeklySub },
  ];

  useEffect(() => {
    const stored: Record<string, boolean> = {};
    for (const key of NOTIF_KEYS) {
      stored[key] = localStorage.getItem(key) === "true";
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setValues(stored);
  }, []);

  function toggle(key: string, v: boolean) {
    setValues((prev) => ({ ...prev, [key]: v }));
    localStorage.setItem(key, String(v));
  }

  return (
    <SettingsSection title={t.settings.sectionNotifications}>
      {notifications.map((n) => (
        <div key={n.key} className="flex items-center gap-3 px-4 py-3.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[var(--glass-bg)] text-base">
            {n.icon}
          </span>
          <div className="flex-1">
            <p className="text-sm font-medium">{n.label}</p>
            <p className="mt-0.5 text-xs text-fg-muted">{n.sublabel}</p>
          </div>
          <Toggle
            on={values[n.key] ?? false}
            onChange={(v) => toggle(n.key, v)}
          />
        </div>
      ))}
    </SettingsSection>
  );
}
