// app/actions/analytics.ts
"use server";

import { createClient } from "@/lib/supabase/server";
import { bangkokDateKey, bangkokMonthKey } from "@/lib/format";
import { bangkokToday } from "@/app/actions/overview-utils";
import {
  resolvePeriodWindow,
  resolveRangeWindow,
  trailingMonthKeys,
  monthKeysEndingAt,
  DEFAULT_SAVINGS_TARGET_PCT,
  type AnalyticsPeriod,
} from "@/app/actions/analytics-utils";
import type { Locale } from "@/lib/i18n";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface MetricSummary {
  totalExpense: number;
  totalIncome: number;
  totalSavings: number;
  avgPerDay: number;
  // Comparison vs equivalent previous window
  prevExpense: number;
  prevIncome: number;
  savingRate: number | null; // savings / income * 100
}

export interface CategoryRow {
  categoryId: string;
  name: string;
  spent: number;
  pct: number; // share of total expense
}

export interface TrendPoint {
  month: string; // YYYY-MM
  income: number;
  expense: number;
  savings: number;
}

export interface WeekdayPoint {
  label: string; // จ, อ, พ, ...
  fullLabel: string; // จันทร์, อังคาร, ...
  avg: number; // average expense on this weekday across the window
}

export interface CategoryMove {
  name: string;
  current: number;
  previous: number;
  delta: number; // current - previous
  pct: number | null; // % change vs previous; null if previous 0
}

export interface AnalyticsData {
  hasData: boolean;
  period: AnalyticsPeriod;
  metrics: MetricSummary;
  categories: CategoryRow[]; // sorted desc, all (component slices top 5)
  trend: TrendPoint[]; // trailing 6 months
  currentMonthRemaining: number;
  weeklyPattern: WeekdayPoint[]; // avg expense per weekday (Mon→Sun)
  peakWeekday: WeekdayPoint | null;
  topCategory: CategoryRow | null;
  movers: CategoryMove[]; // biggest category changes vs previous window
  insights: string[]; // max 2
}

// ─── Server action ─────────────────────────────────────────────────────────

interface TxRow {
  amount: number;
  type: string;
  date: string;
  category_id: string | null;
  categories: { name: string } | { name: string }[] | null;
}

function catName(row: TxRow): string {
  const c = Array.isArray(row.categories) ? row.categories[0] : row.categories;
  return c?.name ?? "ไม่มีหมวดหมู่";
}

export async function getAnalyticsData(
  userId: string,
  period: AnalyticsPeriod,
  savingsTarget: number = DEFAULT_SAVINGS_TARGET_PCT,
  range?: { from: string; to: string },
  locale: Locale = "th"
): Promise<AnalyticsData> {
  const supabase = await createClient();

  // A custom month range overrides the preset period when valid.
  const rangeWin = range ? resolveRangeWindow(range.from, range.to) : null;
  const win = rangeWin ?? resolvePeriodWindow(period);

  // Trend (and anchor-month remaining) end at the range's last month when a range
  // is picked; otherwise at the trailing window ending this month.
  const trendKeys = rangeWin && range
    ? monthKeysEndingAt(range.to, 6)
    : trailingMonthKeys(6);
  const anchorMk = trendKeys[trendKeys.length - 1];

  // Earliest instant we need = min(prevStart, Bangkok start of the trailing-6-month
  // trend window). Anchor the trend start to Bangkok midnight (UTC+7).
  const [ty, tm] = trendKeys[0].split("-").map(Number);
  const trail6Start = new Date(Date.UTC(ty, tm - 1, 1) - 7 * 3_600_000).toISOString();
  const fetchStart = win.prevStart < trail6Start ? win.prevStart : trail6Start;

  const { data, error } = await supabase
    .from("transactions")
    .select("amount, type, date, category_id, categories(name)")
    .eq("user_id", userId)
    .gte("date", fetchStart);

  if (error) throw new Error(error.message);

  const rows = (data ?? []) as unknown as TxRow[];

  const inWindow = (iso: string, start: string, end: string) =>
    iso >= start && iso < end;

  // ── Current-window aggregation ───────────────────────────────────────────
  let totalExpense = 0;
  let totalIncome = 0;
  let totalSavings = 0;
  const catSpend: Record<string, { name: string; spent: number }> = {};
  const dailyMap: Record<string, number> = {};

  // ── Previous-window aggregation ──────────────────────────────────────────
  let prevExpense = 0;
  let prevIncome = 0;
  const prevCatSpend: Record<string, number> = {};

  // ── Trailing-6-month trend ───────────────────────────────────────────────
  const trendBuckets: Record<string, { income: number; expense: number; savings: number }> = {};
  for (const k of trendKeys) trendBuckets[k] = { income: 0, expense: 0, savings: 0 };

  for (const r of rows) {
    const iso = r.date;

    // Trend (trailing 6 months, all types)
    const mk = bangkokMonthKey(iso);
    if (trendBuckets[mk]) {
      if (r.type === "income") trendBuckets[mk].income += r.amount;
      else if (r.type === "expense") trendBuckets[mk].expense += r.amount;
      else if (r.type === "savings") trendBuckets[mk].savings += r.amount;
    }

    // Current selected window
    if (inWindow(iso, win.start, win.end)) {
      if (r.type === "income") totalIncome += r.amount;
      else if (r.type === "savings") totalSavings += r.amount;
      else if (r.type === "expense") {
        totalExpense += r.amount;
        const id = r.category_id ?? "__none__";
        if (!catSpend[id]) catSpend[id] = { name: catName(r), spent: 0 };
        catSpend[id].spent += r.amount;
        const dk = bangkokDateKey(iso);
        dailyMap[dk] = (dailyMap[dk] ?? 0) + r.amount;
      }
    }

    // Previous comparison window
    if (inWindow(iso, win.prevStart, win.prevEnd)) {
      if (r.type === "income") prevIncome += r.amount;
      else if (r.type === "expense") {
        prevExpense += r.amount;
        const id = r.category_id ?? "__none__";
        prevCatSpend[id] = (prevCatSpend[id] ?? 0) + r.amount;
      }
    }
  }

  // ── Categories (current window) ──────────────────────────────────────────
  const categories: CategoryRow[] = Object.entries(catSpend)
    .map(([categoryId, { name, spent }]) => ({
      categoryId,
      name,
      spent,
      pct: totalExpense > 0 ? Math.round((spent / totalExpense) * 100) : 0,
    }))
    .sort((a, b) => b.spent - a.spent);

  const topCategory = categories[0] ?? null;

  // ── Avg per day (over elapsed days of the window) ────────────────────────
  const { year, month, day } = bangkokToday();
  const nowMidnightIso = new Date(
    Date.UTC(year, month - 1, day) - 7 * 3_600_000
  ).toISOString();
  const elapsedEnd = win.end < nowMidnightIso ? win.end : nowMidnightIso;
  const elapsedDays = Math.max(
    1,
    Math.round((Date.parse(elapsedEnd) - Date.parse(win.start)) / 86_400_000)
  );
  const avgPerDay = totalExpense / elapsedDays;

  // ── Weekday pattern (avg expense per day-of-week, Mon→Sun) ────────────────
  const WD_SHORT = locale === "en"
    ? ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"]
    : ["จ", "อ", "พ", "พฤ", "ศ", "ส", "อา"];
  const WD_FULL = locale === "en"
    ? ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
    : ["จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์", "เสาร์", "อาทิตย์"];
  // Monday-first index (0..6) from a YYYY-MM-DD calendar date.
  const mondayIdx = (dateKey: string) => {
    const [y, m, d] = dateKey.split("-").map(Number);
    return (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7;
  };

  const wdSum = [0, 0, 0, 0, 0, 0, 0];
  for (const [date, amount] of Object.entries(dailyMap)) wdSum[mondayIdx(date)] += amount;

  // Count how many of each weekday have elapsed in the window.
  const wdCount = [0, 0, 0, 0, 0, 0, 0];
  const [sy, sm, sd] = bangkokDateKey(win.start).split("-").map(Number);
  for (let i = 0; i < elapsedDays; i++) {
    const dow = (new Date(Date.UTC(sy, sm - 1, sd + i)).getUTCDay() + 6) % 7;
    wdCount[dow]++;
  }

  const weeklyPattern: WeekdayPoint[] = WD_SHORT.map((label, i) => ({
    label,
    fullLabel: WD_FULL[i],
    avg: wdCount[i] > 0 ? wdSum[i] / wdCount[i] : 0,
  }));
  const peakWeekday = weeklyPattern.some((w) => w.avg > 0)
    ? weeklyPattern.reduce((m, w) => (w.avg > m.avg ? w : m), weeklyPattern[0])
    : null;

  // ── Saving rate ──────────────────────────────────────────────────────────
  const savingRate = totalIncome > 0 ? Math.round((totalSavings / totalIncome) * 100) : null;

  // ── Trend array + anchor-month remaining ─────────────────────────────────
  const trend: TrendPoint[] = trendKeys.map((m) => ({ month: m, ...trendBuckets[m] }));
  const cur = trendBuckets[anchorMk] ?? { income: 0, expense: 0, savings: 0 };
  const currentMonthRemaining = cur.income - cur.expense - cur.savings;

  // ── Movers (category change vs previous window) ──────────────────────────
  const moverIds = new Set([...Object.keys(catSpend), ...Object.keys(prevCatSpend)]);
  const movers: CategoryMove[] = [...moverIds]
    .map((id) => {
      const current = catSpend[id]?.spent ?? 0;
      const previous = prevCatSpend[id] ?? 0;
      const delta = current - previous;
      return {
        name: catSpend[id]?.name ?? (locale === "en" ? "Other" : "อื่นๆ"),
        current,
        previous,
        delta,
        pct: previous > 0 ? Math.round((delta / previous) * 100) : null,
      };
    })
    .filter((m) => Math.abs(m.delta) > 0)
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
    .slice(0, 3);

  // ── Smart insights (max 2) ───────────────────────────────────────────────
  const insights: string[] = [];
  const topMover = movers[0];
  if (topMover && topMover.delta > 0) {
    insights.push(locale === "en"
      ? `${topMover.name} spending is ฿${Math.round(topMover.delta).toLocaleString("en-US")} higher than the previous period`
      : `เดือนนี้ค่า${topMover.name}สูงกว่าช่วงก่อน ฿${Math.round(topMover.delta).toLocaleString("th-TH")}`);
  }
  if (insights.length < 2 && totalExpense > 0) {
    const cut = 150;
    insights.push(locale === "en"
      ? `Reducing daily spending by ฿${cut} could save about ฿${(cut * 30).toLocaleString("en-US")} per month`
      : `ถ้าลดค่าใช้จ่ายวันละ ฿${cut} คุณจะออมเพิ่มได้ประมาณ ฿${(cut * 30).toLocaleString("th-TH")} ต่อเดือน`);
  }
  if (insights.length < 2 && savingRate !== null && savingRate >= savingsTarget) {
    insights.push(locale === "en"
      ? `Great job! You saved ${savingRate}% and reached your goal 🎉`
      : `เยี่ยมมาก! คุณออมได้ ${savingRate}% ถึงเป้าหมายแล้ว 🎉`);
  }

  const hasData = rows.length > 0;

  return {
    hasData,
    period,
    metrics: {
      totalExpense,
      totalIncome,
      totalSavings,
      avgPerDay,
      prevExpense,
      prevIncome,
      savingRate,
    },
    categories,
    trend,
    currentMonthRemaining,
    weeklyPattern,
    peakWeekday,
    topCategory,
    movers,
    insights: insights.slice(0, 2),
  };
}
