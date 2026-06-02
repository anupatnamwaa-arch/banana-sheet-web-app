"use client";

import { useEffect, useState } from "react";

type StoredTheme = "dark" | "light" | "system";
type ResolvedTheme = Exclude<StoredTheme, "system">;

const resolveTheme = (theme: StoredTheme): ResolvedTheme => {
  if (theme !== "system") {
    return theme;
  }

  return window.matchMedia("(prefers-color-scheme: light)").matches
    ? "light"
    : "dark";
};

const isStoredTheme = (theme: string | null): theme is StoredTheme =>
  theme === "dark" || theme === "light" || theme === "system";

export function ThemeToggle() {
  const [theme, setTheme] = useState<ResolvedTheme>("light");

  useEffect(() => {
    const storedTheme = localStorage.getItem("bs-theme");
    const nextTheme = resolveTheme(isStoredTheme(storedTheme) ? storedTheme : "light");

    document.documentElement.setAttribute("data-theme", nextTheme);
    queueMicrotask(() => setTheme(nextTheme));
  }, []);

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";

    localStorage.setItem("bs-theme", next);
    document.documentElement.setAttribute("data-theme", next);
    setTheme(next);
  };

  const label = theme === "dark" ? "Switch to light theme" : "Switch to dark theme";

  return (
    <button
      aria-label={label}
      className="atelier-theme-toggle"
      onClick={toggleTheme}
      title={label}
      type="button"
    >
      {theme === "dark" ? (
        <svg aria-hidden="true" viewBox="0 0 24 24">
          <path d="M12 3v2m0 14v2m9-9h-2M5 12H3m15.36-6.36-1.42 1.42M7.06 16.94l-1.42 1.42m12.72 0-1.42-1.42M7.06 7.06 5.64 5.64" />
          <circle cx="12" cy="12" r="4" />
        </svg>
      ) : (
        <svg aria-hidden="true" viewBox="0 0 24 24">
          <path d="M20.5 15.35A8 8 0 0 1 8.65 3.5 8.5 8.5 0 1 0 20.5 15.35Z" />
        </svg>
      )}
    </button>
  );
}
