// app/actions/analytics.ts
"use server";

import { bangkokDateKey, bangkokMonthKey } from "@/lib/format";
import { bangkokToday } from "@/app/actions/overview-utils";
import { getDevAuthBypassDataClient } from "@/lib/dev-auth-bypass";
import {
  resolvePeriodWindow,
  resolveRangeWindow,
  trailingMonthKeys,
  monthKeysEndingAt,
  hasTransactionsInWindow,
  DEFAULT_SAVINGS_TARGET_PCT,
  type AnalyticsPeriod,
} from "@/app/actions/analytics-utils";
import type { Locale } from "@/lib/i18n";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface MetricSummary {
  totalExpense: number;
  totalExpenseNonRecurring: number;
  totalIncome: number;
  totalSavings: number;
  avgPerDay: number;
  // Comparison vs same-elapsed-days slice of the previous window
  prevExpense: number;
  prevExpenseNonRecurring: number;
  prevIncome: number;
  elapsedDays: number; // how many days elapsed in current window (for comparison context)
  savingRate: number | null; // savings / income * 100
}

export interface CategoryRow {
  categoryId: string;
  name: string;
  spent: number;
  pct: number; // share of total expense
  icon?: string | null;
  color?: string | null;
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
  metrics: MetricSummary & { avgPerDayNonRecurring: number };
  categories: CategoryRow[]; // sorted desc, all (component slices top 5)
  categoriesNonRecurring: CategoryRow[]; // same but excluding recurring transactions
  categoriesRecurring: CategoryRow[];    // only recurring transactions, sorted desc
  totalRecurringExpense: number;
  totalSubscriptionExpense: number;
  monthlyAverages: {
    income: number;
    expense: number;
    savings: number;
    savingRate: number | null;
    monthCount: number; // months with any transaction data
  };
  trend: TrendPoint[]; // trailing 6 months
  currentMonthRemaining: number;
  weeklyPattern: WeekdayPoint[]; // avg expense per weekday (Mon→Sun)
  peakWeekday: WeekdayPoint | null;
  weeklyPatternNonRecurring: WeekdayPoint[];
  peakWeekdayNonRecurring: WeekdayPoint | null;
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
  note: string | null;
  fixed_cost_id: string | null;
  recurring_kind: "fixed_cost" | "subscription" | null;
  categories: { name: string; icon?: string | null; color?: string | null } | { name: string; icon?: string | null; color?: string | null }[] | null;
}

const ANALYTICS_PAGE_SIZE = 1000;

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
  const supabase = await getDevAuthBypassDataClient();

  // A custom month range overrides the preset period when valid.
  const rangeWin = range ? resolveRangeWindow(range.from, range.to) : null;
  const win = rangeWin ?? resolvePeriodWindow(period);

  // Trend (and anchor-month remaining) end at the range's last month when a range
  // is picked; otherwise at the trailing window ending this month.
  const trendKeys = rangeWin && range
    ? monthKeysEndingAt(range.to, 6)
    : trailingMonthKeys(6);
  const anchorMk = trendKeys[trendKeys.length - 1];

  // 12-month trailing keys (always Bangkok-relative, regardless of selected period)
  const trail12Keys = trailingMonthKeys(12);

  // Earliest instant we need = min(prevStart, trail-6 start, trail-12 start).
  const [ty, tm] = trendKeys[0].split("-").map(Number);
  const trail6Start = new Date(Date.UTC(ty, tm - 1, 1) - 7 * 3_600_000).toISOString();
  const [t12y, t12m] = trail12Keys[0].split("-").map(Number);
  const trail12Start = new Date(Date.UTC(t12y, t12m - 1, 1) - 7 * 3_600_000).toISOString();
  const fetchStart = [win.prevStart, trail6Start, trail12Start].reduce((a, b) => (a < b ? a : b));

  const rows: TxRow[] = [];
  for (let from = 0; ; from += ANALYTICS_PAGE_SIZE) {
    const { data, error } = await supabase
      .from("transactions")
      .select("amount, type, date, category_id, note, fixed_cost_id, recurring_kind, categories(name, icon, color)")
      .eq("user_id", userId)
      .gte("date", fetchStart)
      .order("date", { ascending: true })
      .range(from, from + ANALYTICS_PAGE_SIZE - 1);

    if (error) throw new Error(error.message);

    const page = (data ?? []) as unknown as TxRow[];
    rows.push(...page);
    if (page.length < ANALYTICS_PAGE_SIZE) break;
  }

  // Fetch active fixed costs to filter recurring transactions
  const { data: fixedCostsData } = await supabase
    .from("fixed_costs")
    .select("amount, type, category_id, note")
    .eq("user_id", userId);
  const fixedCosts = fixedCostsData ?? [];

  const isRecurring = (r: TxRow) => {
    if (r.recurring_kind) return true;
    return fixedCosts.some(
      (fc) =>
        fc.amount === r.amount &&
        fc.type === r.type &&
        fc.category_id === r.category_id &&
        (fc.note === r.note || (!fc.note && !r.note))
    );
  };

  const inWindow = (iso: string, start: string, end: string) =>
    iso >= start && iso < end;

  // ── Elapsed days (computed before loop so prev window can be capped) ─────
  const { year, month, day } = bangkokToday();
  const nowMidnightIso = new Date(Date.UTC(year, month - 1, day) - 7 * 3_600_000).toISOString();
  const elapsedEnd = win.end < nowMidnightIso ? win.end : nowMidnightIso;
  const elapsedDays = Math.max(1, Math.round((Date.parse(elapsedEnd) - Date.parse(win.start)) / 86_400_000));
  // Cap the previous window to the same number of elapsed days so early-month
  // comparisons are apples-to-apples instead of partial vs full period.
  const prevElapsedEnd = new Date(Date.parse(win.prevStart) + elapsedDays * 86_400_000).toISOString();

  // ── Current-window aggregation ───────────────────────────────────────────
  let totalExpense = 0;
  let totalExpenseNonRecurring = 0;
  let totalSubscriptionExpense = 0;
  let totalIncome = 0;
  let totalSavings = 0;
  const catSpend: Record<string, { name: string; spent: number; icon: string | null; color: string | null }> = {};
  const catSpendNonRecurring: Record<string, { name: string; spent: number; icon: string | null; color: string | null }> = {};
  const dailyMap: Record<string, number> = {};
  const dailyMapNonRecurring: Record<string, number> = {};

  // ── Previous-window aggregation ──────────────────────────────────────────
  let prevExpense = 0;
  let prevExpenseNonRecurring = 0;
  let prevIncome = 0;
  const prevCatSpend: Record<string, number> = {};

  // ── Trailing-6-month trend ───────────────────────────────────────────────
  const trendBuckets: Record<string, { income: number; expense: number; savings: number }> = {};
  for (const k of trendKeys) trendBuckets[k] = { income: 0, expense: 0, savings: 0 };

  // ── Trailing-12-month buckets (for monthly averages) ─────────────────────
  const trail12Buckets: Record<string, { income: number; expense: number; savings: number }> = {};
  for (const k of trail12Keys) trail12Buckets[k] = { income: 0, expense: 0, savings: 0 };

  for (const r of rows) {
    const iso = r.date;

    // Trend (trailing 6 months, all types)
    const mk = bangkokMonthKey(iso);
    if (trendBuckets[mk]) {
      if (r.type === "income") trendBuckets[mk].income += r.amount;
      else if (r.type === "expense") trendBuckets[mk].expense += r.amount;
      else if (r.type === "savings") trendBuckets[mk].savings += r.amount;
    }
    // 12-month averages
    if (trail12Buckets[mk]) {
      if (r.type === "income") trail12Buckets[mk].income += r.amount;
      else if (r.type === "expense") trail12Buckets[mk].expense += r.amount;
      else if (r.type === "savings") trail12Buckets[mk].savings += r.amount;
    }

    // Current selected window
    if (inWindow(iso, win.start, win.end)) {
      if (r.type === "income") totalIncome += r.amount;
      else if (r.type === "savings") totalSavings += r.amount;
      else if (r.type === "expense") {
        totalExpense += r.amount;
        const recurring = isRecurring(r);
        if (r.recurring_kind === "subscription") totalSubscriptionExpense += r.amount;
        const id = r.category_id ?? "__none__";
        const c = Array.isArray(r.categories) ? r.categories[0] : r.categories;

        if (!catSpend[id]) catSpend[id] = { name: catName(r), spent: 0, icon: c?.icon ?? null, color: c?.color ?? null };
        catSpend[id].spent += r.amount;

        const dk = bangkokDateKey(iso);
        dailyMap[dk] = (dailyMap[dk] ?? 0) + r.amount;

        if (!recurring) {
          totalExpenseNonRecurring += r.amount;
          if (!catSpendNonRecurring[id]) catSpendNonRecurring[id] = { name: catName(r), spent: 0, icon: c?.icon ?? null, color: c?.color ?? null };
          catSpendNonRecurring[id].spent += r.amount;
          dailyMapNonRecurring[dk] = (dailyMapNonRecurring[dk] ?? 0) + r.amount;
        }
      }
    }

    // Previous comparison window — capped to same elapsed days as current window
    if (inWindow(iso, win.prevStart, prevElapsedEnd)) {
      if (r.type === "income") prevIncome += r.amount;
      else if (r.type === "expense") {
        prevExpense += r.amount;
        if (!isRecurring(r)) prevExpenseNonRecurring += r.amount;
        const id = r.category_id ?? "__none__";
        prevCatSpend[id] = (prevCatSpend[id] ?? 0) + r.amount;
      }
    }
  }

  // ── Categories (current window) ──────────────────────────────────────────
  const categories: CategoryRow[] = Object.entries(catSpend)
    .map(([categoryId, { name, spent, icon, color }]) => ({
      categoryId,
      name,
      spent,
      pct: totalExpense > 0 ? Math.round((spent / totalExpense) * 100) : 0,
      icon,
      color,
    }))
    .sort((a, b) => b.spent - a.spent);

  const topCategory = categories[0] ?? null;

  const totalRecurringExpense = totalExpense - totalExpenseNonRecurring;

  const categoriesRecurring: CategoryRow[] = Object.entries(catSpend)
    .map(([categoryId, { name, spent, icon, color }]) => {
      const nonRecurring = catSpendNonRecurring[categoryId]?.spent ?? 0;
      const recurringSpent = spent - nonRecurring;
      return {
        categoryId,
        name,
        spent: recurringSpent,
        pct: totalRecurringExpense > 0 ? Math.round((recurringSpent / totalRecurringExpense) * 100) : 0,
        icon,
        color,
      };
    })
    .filter((c) => c.spent > 0)
    .sort((a, b) => b.spent - a.spent);

  const categoriesNonRecurring: CategoryRow[] = Object.entries(catSpendNonRecurring)
    .map(([categoryId, { name, spent, icon, color }]) => ({
      categoryId,
      name,
      spent,
      pct: totalExpenseNonRecurring > 0 ? Math.round((spent / totalExpenseNonRecurring) * 100) : 0,
      icon,
      color,
    }))
    .sort((a, b) => b.spent - a.spent);

  // ── Avg per day (elapsedDays already computed above the loop) ────────────
  const avgPerDay = totalExpense / elapsedDays;
  const avgPerDayNonRecurring = totalExpenseNonRecurring / elapsedDays;

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
  const wdSumNonRecurring = [0, 0, 0, 0, 0, 0, 0];
  for (const [date, amount] of Object.entries(dailyMap)) wdSum[mondayIdx(date)] += amount;
  for (const [date, amount] of Object.entries(dailyMapNonRecurring)) wdSumNonRecurring[mondayIdx(date)] += amount;

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

  const weeklyPatternNonRecurring: WeekdayPoint[] = WD_SHORT.map((label, i) => ({
    label,
    fullLabel: WD_FULL[i],
    avg: wdCount[i] > 0 ? wdSumNonRecurring[i] / wdCount[i] : 0,
  }));
  const peakWeekdayNonRecurring = weeklyPatternNonRecurring.some((w) => w.avg > 0)
    ? weeklyPatternNonRecurring.reduce((m, w) => (w.avg > m.avg ? w : m), weeklyPatternNonRecurring[0])
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

  // ── 12-month monthly averages ────────────────────────────────────────────
  const trail12Months = Object.values(trail12Buckets);
  const monthsWithData = trail12Months.filter(
    (b) => b.income > 0 || b.expense > 0 || b.savings > 0
  ).length;
  const monthCount = Math.max(1, monthsWithData);
  const avg12Income  = trail12Months.reduce((s, b) => s + b.income,  0) / monthCount;
  const avg12Expense = trail12Months.reduce((s, b) => s + b.expense, 0) / monthCount;
  const avg12Savings = trail12Months.reduce((s, b) => s + b.savings, 0) / monthCount;
  const avg12SavingRate = avg12Income > 0
    ? Math.round((avg12Savings / avg12Income) * 100)
    : null;
  const monthlyAverages = {
    income:    Math.round(avg12Income),
    expense:   Math.round(avg12Expense),
    savings:   Math.round(avg12Savings),
    savingRate: avg12SavingRate,
    monthCount,
  };

  const hasData = hasTransactionsInWindow(rows, win);

  return {
    hasData,
    period,
    metrics: {
      totalExpense,
      totalExpenseNonRecurring,
      totalIncome,
      totalSavings,
      avgPerDay,
      avgPerDayNonRecurring,
      prevExpense,
      prevExpenseNonRecurring,
      prevIncome,
      elapsedDays,
      savingRate,
    },
    categories,
    categoriesNonRecurring,
    categoriesRecurring,
    totalRecurringExpense,
    totalSubscriptionExpense,
    monthlyAverages,
    trend,
    currentMonthRemaining,
    weeklyPattern,
    peakWeekday,
    weeklyPatternNonRecurring,
    peakWeekdayNonRecurring,
    topCategory,
    movers,
    insights: insights.slice(0, 2),
  };
}
