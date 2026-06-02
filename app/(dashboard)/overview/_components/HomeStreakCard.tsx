// app/(dashboard)/overview/_components/HomeStreakCard.tsx
"use client";

import { Flame } from "lucide-react";
import { useT } from "@/lib/i18n/LanguageProvider";
import { motion } from "framer-motion";

interface Props {
  streak: number;
  loggedToday: boolean;
}

export function HomeStreakCard({ streak, loggedToday }: Props) {
  const t = useT();

  const lit = streak > 0;
  const sub =
    streak === 0
      ? t.overview.streakSubNone
      : loggedToday
        ? t.overview.streakSubLoggedToday
        : t.overview.streakSubAtRisk;

  return (
    <motion.div
      whileHover={{ scale: 1.01, translateY: -1 }}
      whileTap={{ scale: 0.99 }}
      className="relative overflow-hidden flex items-center gap-4 rounded-[var(--radius-card)] bg-[var(--bg-elevated)] p-4 border border-orange-500/10 shadow-md cursor-pointer transition-all duration-300 group"
    >
      {/* Background radial soft glow when streak is active */}
      {lit && (
        <div className="absolute -left-12 -top-12 w-32 h-32 rounded-full bg-orange-500/5 blur-2xl pointer-events-none group-hover:bg-orange-500/10 transition-all duration-300" />
      )}

      {/* Interactive Flame Container */}
      <div className="relative shrink-0">
        <motion.span
          animate={lit ? {
            boxShadow: ["0 0 0px rgba(249, 115, 22, 0.1)", "0 0 12px rgba(249, 115, 22, 0.3)", "0 0 0px rgba(249, 115, 22, 0.1)"]
          } : {}}
          transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
          className={`flex h-12 w-12 items-center justify-center rounded-full border transition-colors ${
            lit
              ? "bg-orange-500/10 border-orange-500/20"
              : "bg-white/[0.02] border-white/[0.04] text-fg-muted"
          }`}
        >
          <motion.div
            animate={lit ? {
              scale: [1, 1.1, 1],
              rotate: [0, 2, -2, 0]
            } : {}}
            transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
          >
            <Flame
              size={24}
              className={lit ? "text-orange-500 drop-shadow-[0_2px_8px_rgba(249,115,22,0.4)]" : "text-fg-muted"}
              fill={lit ? "currentColor" : "none"}
            />
          </motion.div>
        </motion.span>

        {/* Small pulsing status dot */}
        <span className="absolute -bottom-0.5 -right-0.5 flex h-3 w-3">
          {loggedToday ? (
            <>
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
            </>
          ) : (
            <span className={`relative inline-flex rounded-full h-3 w-3 ${lit ? "bg-amber-500" : "bg-white/10"}`}></span>
          )}
        </span>
      </div>

      {/* Typography and stats */}
      <div className="min-w-0 flex-1">
        <p className="flex items-baseline gap-1.5">
          <span className="text-3xl font-extrabold tracking-tight tabular-nums bg-gradient-to-r from-orange-400 to-amber-300 bg-clip-text text-transparent">
            {streak}
          </span>
          <span className="text-xs font-semibold uppercase tracking-wider text-fg-muted">
            {t.overview.streakDayUnit}
          </span>
        </p>
        <p className="truncate text-xs font-medium text-fg-muted group-hover:text-fg transition-colors mt-0.5">
          {sub}
        </p>
      </div>

      {/* Tiny right arrow indicator */}
      <div className="shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-fg-muted"
        >
          <path d="M5 12h14M12 5l7 7-7 7" />
        </svg>
      </div>
    </motion.div>
  );
}
