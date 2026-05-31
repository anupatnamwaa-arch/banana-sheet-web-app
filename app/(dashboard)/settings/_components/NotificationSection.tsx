"use client";

import { useEffect, useState } from "react";
import { SettingsSection } from "./SettingsSection";

const NOTIF_KEYS = [
  { key: "notif-daily",   icon: "⏰", label: "เตือนบันทึกรายวัน",         sublabel: "ทุกวัน 21:00" },
  { key: "notif-budget",  icon: "⚠️", label: "เตือนใกล้เกินงบ",           sublabel: "เมื่อใช้ไปเกิน 80%" },
  { key: "notif-debt",    icon: "💳", label: "เตือนครบกำหนดชำระหนี้",     sublabel: "3 วันก่อนครบกำหนด" },
  { key: "notif-weekly",  icon: "📊", label: "สรุปรายสัปดาห์",            sublabel: "ทุกวันอาทิตย์" },
];

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
  const [values, setValues] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const stored: Record<string, boolean> = {};
    for (const n of NOTIF_KEYS) {
      stored[n.key] = localStorage.getItem(n.key) === "true";
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setValues(stored);
  }, []);

  function toggle(key: string, v: boolean) {
    setValues((prev) => ({ ...prev, [key]: v }));
    localStorage.setItem(key, String(v));
  }

  return (
    <SettingsSection title="การแจ้งเตือน">
      {NOTIF_KEYS.map((n) => (
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
