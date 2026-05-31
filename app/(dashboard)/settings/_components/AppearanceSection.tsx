"use client";

import { useEffect, useState } from "react";
import { SettingsSection } from "./SettingsSection";
import { useT } from "@/lib/i18n/LanguageProvider";

type Theme = "dark" | "light" | "system";

function applyTheme(theme: Theme) {
  const resolved =
    theme === "system"
      ? window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark"
      : theme;
  document.documentElement.setAttribute("data-theme", resolved);
  localStorage.setItem("bs-theme", theme);
}

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!on)}
      className={`h-6 w-11 rounded-full p-0.5 transition-colors ${
        on ? "bg-accent" : "bg-[var(--glass-border)]"
      }`}
      aria-pressed={on}
    >
      <span
        className={`block h-5 w-5 rounded-full bg-white shadow transition-transform ${
          on ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </button>
  );
}

export function AppearanceSection() {
  const t = useT();
  const themes: { id: Theme; label: string; emoji: string }[] = [
    { id: "dark", label: t.settings.themeDark, emoji: "🌙" },
    { id: "light", label: t.settings.themeLight, emoji: "🍌" },
    { id: "system", label: t.settings.themeSystem, emoji: "📱" },
  ];
  const [theme, setTheme] = useState<Theme>("dark");
  const [hideBalance, setHideBalance] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTheme((localStorage.getItem("bs-theme") as Theme | null) ?? "dark");
    setHideBalance(localStorage.getItem("bs-hide-balance") === "true");
  }, []);

  function selectTheme(t: Theme) {
    setTheme(t);
    applyTheme(t);
  }

  function toggleHide(v: boolean) {
    setHideBalance(v);
    localStorage.setItem("bs-hide-balance", String(v));
    if (v) {
      document.documentElement.classList.add("hide-balance");
    } else {
      document.documentElement.classList.remove("hide-balance");
    }
  }

  return (
    <SettingsSection title={t.settings.sectionAppearance}>
      {/* Theme picker */}
      <div className="px-4 py-3.5">
        <div className="mb-3 flex items-center gap-3">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[var(--glass-bg)] text-base">
            🎨
          </span>
          <p className="text-sm font-medium">{t.settings.themeTitle}</p>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {themes.map((themeOption) => (
            <button
              key={themeOption.id}
              type="button"
              onClick={() => selectTheme(themeOption.id)}
              className={`flex flex-col items-center gap-1 rounded-2xl border py-3 text-xs font-medium transition-all ${
                theme === themeOption.id
                  ? "border-accent bg-accent/10 text-accent"
                  : "border-[var(--glass-border)] text-fg-muted"
              }`}
            >
              <span className="text-xl">{themeOption.emoji}</span>
              <span>{themeOption.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Accent color — placeholder */}
      <div className="flex items-center gap-3 px-4 py-3.5">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[var(--glass-bg)] text-base">
          🎨
        </span>
        <div className="flex-1">
          <p className="text-sm font-medium">{t.settings.accentColor}</p>
          <p className="mt-0.5 text-xs text-fg-muted">{t.settings.accentColorValue}</p>
        </div>
        <span className="h-5 w-5 rounded-full bg-accent" />
      </div>

      {/* Hide balance toggle */}
      <div className="flex items-center gap-3 px-4 py-3.5">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[var(--glass-bg)] text-base">
          🙈
        </span>
        <div className="flex-1">
          <p className="text-sm font-medium">{t.settings.hideBalance}</p>
          <p className="mt-0.5 text-xs text-fg-muted">{t.settings.hideBalanceDesc}</p>
        </div>
        <Toggle on={hideBalance} onChange={toggleHide} />
      </div>
    </SettingsSection>
  );
}
