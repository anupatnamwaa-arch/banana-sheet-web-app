// app/actions/wealth.ts
"use server";

import { createClient } from "@/lib/supabase/server";
import type { WealthType } from "@/lib/types";

export interface WealthPayload {
  name: string;
  type: WealthType;       // "asset" | "liability"
  value: number;          // > 0
  is_liquid: boolean;     // forced false for liabilities
  monthly_payment?: number | null; // liabilities only
  due_date?: string | null;        // liabilities only, YYYY-MM-DD
}

/** Liabilities carry debt detail; assets carry liquidity. Normalize per type. */
function normalize(payload: WealthPayload) {
  const isAsset = payload.type === "asset";
  return {
    name: payload.name,
    type: payload.type,
    value: payload.value,
    is_liquid: isAsset ? payload.is_liquid : false,
    monthly_payment: isAsset ? null : payload.monthly_payment ?? null,
    due_date: isAsset ? null : payload.due_date ?? null,
  };
}

export async function addWealth(payload: WealthPayload): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthenticated");

  const { error } = await supabase
    .from("wealth_debt")
    .insert({ user_id: user.id, ...normalize(payload) });
  if (error) throw new Error(error.message);
}

export async function updateWealth(id: string, payload: WealthPayload): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthenticated");

  const { error } = await supabase
    .from("wealth_debt")
    .update(normalize(payload))
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) throw new Error(error.message);
}

/** Upsert the current Bangkok month's net-worth snapshot (idempotent per month). */
export async function recordNetWorthSnapshot(
  month: string,
  netWorth: number,
  totalAssets: number,
  totalLiabilities: number
): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return; // demo / unauthenticated: skip silently

  await supabase.from("net_worth_snapshots").upsert(
    {
      user_id: user.id,
      month,
      net_worth: netWorth,
      total_assets: totalAssets,
      total_liabilities: totalLiabilities,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,month" }
  );
}

/** Upsert per-item value snapshot for the current Bangkok month. */
export async function recordItemSnapshots(
  items: Array<{ id: string; name: string; type: string; value: number }>,
  month: string
): Promise<void> {
  if (items.length === 0) return;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from("wealth_item_snapshots").upsert(
    items.map((item) => ({
      user_id: user.id,
      item_id: item.id,
      month,
      name: item.name,
      type: item.type,
      value: item.value,
      updated_at: new Date().toISOString(),
    })),
    { onConflict: "user_id,item_id,month" }
  );
}

export async function deleteWealth(id: string): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthenticated");

  const { error } = await supabase
    .from("wealth_debt")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) throw new Error(error.message);
}
