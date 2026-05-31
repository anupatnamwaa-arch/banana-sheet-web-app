// app/actions/wealth-data.ts
"use server";

import { createClient } from "@/lib/supabase/server";
import { bangkokToday } from "@/app/actions/overview-utils";
import { recordNetWorthSnapshot, recordItemSnapshots } from "@/app/actions/wealth";
import type { Goal } from "@/lib/types";

export interface AssetRow {
  id: string;
  name: string;
  value: number;
  is_liquid: boolean;
}

export interface DebtRow {
  id: string;
  name: string;
  value: number;
  monthly_payment: number | null;
  due_date: string | null;
}

export interface TrendPoint {
  month: string; // YYYY-MM
  netWorth: number;
  totalAssets: number;
  totalLiabilities: number;
}

export interface ItemSnapshot {
  month: string;
  itemId: string;
  name: string;
  type: "asset" | "liability";
  value: number;
}

export interface WealthData {
  hasData: boolean;
  assets: AssetRow[];
  liabilities: DebtRow[];
  totalAssets: number;
  totalLiabilities: number;
  netWorth: number;
  prevNetWorth: number | null;
  emergencyFund: number;
  monthlyExpense: number;
  goals: Goal[];
  trend: TrendPoint[];
  itemSnapshots: ItemSnapshot[];
  updatedAt: string | null;
}

const pad = (n: number) => String(n).padStart(2, "0");

export async function getWealthData(userId: string): Promise<WealthData> {
  const supabase = await createClient();
  const { year, month } = bangkokToday();
  const monthKey = `${year}-${pad(month)}`;
  const prevDate = new Date(Date.UTC(year, month - 2, 1));
  const prevMonthKey = `${prevDate.getUTCFullYear()}-${pad(prevDate.getUTCMonth() + 1)}`;

  const ninetyAgo = new Date(Date.now() - 90 * 86_400_000).toISOString();

  const [wealthRes, goalsRes, snapsRes, itemSnapsRes, expenseRes] = await Promise.all([
    supabase
      .from("wealth_debt")
      .select("id, name, type, value, is_liquid, monthly_payment, due_date, updated_at")
      .eq("user_id", userId)
      .order("value", { ascending: false }),
    supabase
      .from("goals")
      .select("id, user_id, name, target_amount, current_amount, target_date, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: true }),
    supabase
      .from("net_worth_snapshots")
      .select("month, net_worth, total_assets, total_liabilities")
      .eq("user_id", userId)
      .order("month", { ascending: true }),
    supabase
      .from("wealth_item_snapshots")
      .select("month, item_id, name, type, value")
      .eq("user_id", userId)
      .order("month", { ascending: true }),
    supabase
      .from("transactions")
      .select("amount")
      .eq("user_id", userId)
      .eq("type", "expense")
      .gte("date", ninetyAgo),
  ]);

  const rows = (wealthRes.data ?? []) as Array<{
    id: string;
    name: string;
    type: string;
    value: number;
    is_liquid: boolean;
    monthly_payment: number | null;
    due_date: string | null;
    updated_at: string;
  }>;

  const assets: AssetRow[] = [];
  const liabilities: DebtRow[] = [];
  let totalAssets = 0;
  let totalLiabilities = 0;
  let emergencyFund = 0;
  let updatedAt: string | null = null;

  for (const r of rows) {
    if (!updatedAt || r.updated_at > updatedAt) updatedAt = r.updated_at;
    if (r.type === "asset") {
      assets.push({ id: r.id, name: r.name, value: r.value, is_liquid: r.is_liquid });
      totalAssets += r.value;
      if (r.is_liquid) emergencyFund += r.value;
    } else {
      liabilities.push({
        id: r.id,
        name: r.name,
        value: r.value,
        monthly_payment: r.monthly_payment,
        due_date: r.due_date,
      });
      totalLiabilities += r.value;
    }
  }

  const netWorth = totalAssets - totalLiabilities;
  const expenseSum = (expenseRes.data ?? []).reduce((s, r) => s + r.amount, 0);
  const monthlyExpense = expenseSum / 3;

  const snaps = (snapsRes.data ?? []) as Array<{
    month: string;
    net_worth: number;
    total_assets: number;
    total_liabilities: number;
  }>;
  const prevSnap = snaps.find((s) => s.month === prevMonthKey);
  const prevNetWorth = prevSnap ? prevSnap.net_worth : null;

  const hasData = rows.length > 0 || (goalsRes.data?.length ?? 0) > 0;

  if (rows.length > 0) {
    await Promise.all([
      recordNetWorthSnapshot(monthKey, netWorth, totalAssets, totalLiabilities),
      recordItemSnapshots(
        rows.map((r) => ({ id: r.id, name: r.name, type: r.type, value: r.value })),
        monthKey
      ),
    ]);
  }

  // Build aggregate trend (merge recorded history with current live values).
  const trendMap = new Map<string, { netWorth: number; totalAssets: number; totalLiabilities: number }>();
  for (const s of snaps) {
    trendMap.set(s.month, {
      netWorth: s.net_worth,
      totalAssets: s.total_assets,
      totalLiabilities: s.total_liabilities,
    });
  }
  if (rows.length > 0) {
    trendMap.set(monthKey, { netWorth, totalAssets, totalLiabilities });
  }
  const trend: TrendPoint[] = [...trendMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([m, v]) => ({ month: m, ...v }));

  // Build item snapshots list (merge recorded history with current live values).
  const itemSnapsMap = new Map<string, ItemSnapshot>(); // key = month+itemId
  for (const s of (itemSnapsRes.data ?? []) as Array<{
    month: string;
    item_id: string;
    name: string;
    type: string;
    value: number;
  }>) {
    itemSnapsMap.set(`${s.month}|${s.item_id}`, {
      month: s.month,
      itemId: s.item_id,
      name: s.name,
      type: s.type as "asset" | "liability",
      value: s.value,
    });
  }
  // Overlay current month live values (so chart is always fresh).
  for (const r of rows) {
    itemSnapsMap.set(`${monthKey}|${r.id}`, {
      month: monthKey,
      itemId: r.id,
      name: r.name,
      type: r.type as "asset" | "liability",
      value: r.value,
    });
  }
  const itemSnapshots: ItemSnapshot[] = [...itemSnapsMap.values()].sort((a, b) =>
    a.month.localeCompare(b.month)
  );

  return {
    hasData,
    assets,
    liabilities,
    totalAssets,
    totalLiabilities,
    netWorth,
    prevNetWorth,
    emergencyFund,
    monthlyExpense,
    goals: (goalsRes.data ?? []) as Goal[],
    trend,
    itemSnapshots,
    updatedAt,
  };
}
