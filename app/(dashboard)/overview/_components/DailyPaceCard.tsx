import Link from "next/link";
import { Lock } from "lucide-react";
import { formatTHB } from "@/lib/format";
import type { DailyPaceData } from "@/app/actions/overview";

interface Props {
  data: DailyPaceData | null; // null = free user
}

function LockedOverlay() {
  return (
    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 rounded-2xl backdrop-blur-sm bg-black/30">
      <Lock size={20} className="text-fg-muted" />
      <Link
        href="/paywall"
        className="rounded-full bg-accent px-4 py-1.5 text-xs font-semibold text-black"
      >
        🔒 ปลดล็อกด้วย Pro
      </Link>
    </div>
  );
}

function barColour(expense: number, paceLine: number): string {
  if (paceLine === 0) return "bg-[var(--positive)]";
  const ratio = expense / paceLine;
  if (ratio <= 1.0) return "bg-[var(--positive)]";
  if (ratio <= 1.2) return "bg-amber-400";
  return "bg-[var(--negative)]";
}

export function DailyPaceCard({ data }: Props) {
  // Placeholder values for free-user blur state
  const display = data ?? {
    currentMonthExpense: 8500,
    budgetTarget: 15000,
    paceLine: 9000,
    daysElapsed: 18,
    daysInMonth: 30,
    hasBudget: true,
  };

  const fillPct = display.budgetTarget > 0
    ? Math.min((display.currentMonthExpense / display.budgetTarget) * 100, 100)
    : 0;

  const colour = barColour(display.currentMonthExpense, display.paceLine);

  // Setup prompt when no budget and no expense history
  const showSetupPrompt = data !== null && display.budgetTarget === 0;

  return (
    <div className="glass relative overflow-hidden p-5">
      {!data && <LockedOverlay />}

      <div className={!data ? "blur-sm pointer-events-none select-none" : ""}>
        <p className="text-xs font-medium text-fg-muted">📊 Daily Pace</p>

        {showSetupPrompt ? (
          <div className="mt-3 text-sm text-fg-muted">
            ตั้งงบประมาณเพื่อดู Daily Pace{" "}
            <Link href="/settings" className="text-accent underline">
              ตั้งค่าเลย
            </Link>
          </div>
        ) : (
          <>
            <div className="mt-3 flex justify-between text-xs text-fg-muted">
              <span>{formatTHB(display.currentMonthExpense)}</span>
              <span>เป้า {formatTHB(display.budgetTarget)}</span>
            </div>
            {/* Progress bar */}
            <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-[var(--glass-border)]">
              <div
                className={`h-full rounded-full transition-all ${colour}`}
                style={{ width: `${fillPct}%` }}
              />
            </div>
            {/* Pace marker + days label */}
            <div className="mt-2 flex justify-between text-xs text-fg-muted">
              <span>
                วันที่ {display.daysElapsed}/{display.daysInMonth}
              </span>
              <span>
                Pace {formatTHB(display.paceLine)}
              </span>
            </div>
            {!display.hasBudget && (
              <p className="mt-1 text-xs text-fg-muted">
                * ใช้ค่าใช้จ่ายเฉลี่ยเนื่องจากยังไม่ได้ตั้งงบ{" "}
                <Link href="/settings" className="text-accent">
                  ตั้งงบ
                </Link>
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
