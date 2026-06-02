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

export interface HistoricalSnapshotPayload {
  month: string;
  value: number;
}

export async function addWealthWithHistory(
  payload: WealthPayload,
  history: HistoricalSnapshotPayload[]
): Promise<string> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthenticated");

  // 1. Insert main wealth_debt item
  const { data: newItem, error: insertError } = await supabase
    .from("wealth_debt")
    .insert({
      user_id: user.id,
      ...normalize(payload),
    })
    .select("id")
    .single();

  if (insertError) throw new Error(insertError.message);
  if (!newItem) throw new Error("Failed to create wealth item");

  const id = newItem.id;

  // 2. Process historical snapshots
  if (history.length > 0) {
    for (const h of history) {
      const { error: snapError } = await supabase
        .from("wealth_item_snapshots")
        .upsert(
          {
            user_id: user.id,
            item_id: id,
            month: h.month,
            name: payload.name.trim(),
            type: payload.type,
            value: h.value,
          },
          { onConflict: "user_id,item_id,month" }
        );
      if (snapError) throw new Error(snapError.message);

      // Recalculate net worth snapshots for this month
      const { data: monthSnaps } = await supabase
        .from("wealth_item_snapshots")
        .select("type, value")
        .eq("user_id", user.id)
        .eq("month", h.month);

      let totalAssets = 0;
      let totalLiabilities = 0;

      if (monthSnaps) {
        for (const s of monthSnaps) {
          if (s.type === "asset") totalAssets += Number(s.value);
          else if (s.type === "liability") totalLiabilities += Number(s.value);
        }
      }

      const netWorth = totalAssets - totalLiabilities;

      const { error: nwError } = await supabase
        .from("net_worth_snapshots")
        .upsert(
          {
            user_id: user.id,
            month: h.month,
            net_worth: netWorth,
            total_assets: totalAssets,
            total_liabilities: totalLiabilities,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id,month" }
        );
      if (nwError) throw new Error(nwError.message);
    }
  }

  return id;
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

export async function updateWealthWithHistory(
  id: string,
  payload: WealthPayload,
  history: HistoricalSnapshotPayload[]
): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthenticated");

  // 1. Update the main wealth_debt item
  const { error: mainError } = await supabase
    .from("wealth_debt")
    .update(normalize(payload))
    .eq("id", id)
    .eq("user_id", user.id);
  if (mainError) throw new Error(mainError.message);

  // Synchronize the renamed wealth item name across ALL its existing historical snapshots
  const { error: renameError } = await supabase
    .from("wealth_item_snapshots")
    .update({ name: payload.name.trim() })
    .eq("item_id", id)
    .eq("user_id", user.id);
  if (renameError) throw new Error(renameError.message);

  // 2. Process historical snapshots
  if (history.length > 0) {
    // Get item name and type to ensure snapshots are denormalized correctly
    const { data: itemData } = await supabase
      .from("wealth_debt")
      .select("name, type")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (!itemData) throw new Error("Item not found");

    for (const h of history) {
      // Upsert the snapshot for this specific month
      const { error: snapError } = await supabase
        .from("wealth_item_snapshots")
        .upsert(
          {
            user_id: user.id,
            item_id: id,
            month: h.month,
            name: itemData.name,
            type: itemData.type,
            value: h.value,
          },
          { onConflict: "user_id,item_id,month" }
        );
      if (snapError) throw new Error(snapError.message);

      // Recalculate and update the overall net_worth_snapshots for this month
      const { data: monthSnaps } = await supabase
        .from("wealth_item_snapshots")
        .select("type, value")
        .eq("user_id", user.id)
        .eq("month", h.month);

      let totalAssets = 0;
      let totalLiabilities = 0;

      if (monthSnaps) {
        for (const s of monthSnaps) {
          if (s.type === "asset") totalAssets += Number(s.value);
          else if (s.type === "liability") totalLiabilities += Number(s.value);
        }
      }

      const netWorth = totalAssets - totalLiabilities;

      const { error: nwError } = await supabase
        .from("net_worth_snapshots")
        .upsert(
          {
            user_id: user.id,
            month: h.month,
            net_worth: netWorth,
            total_assets: totalAssets,
            total_liabilities: totalLiabilities,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id,month" }
        );
      if (nwError) throw new Error(nwError.message);
    }
  }
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

  // 1. Identify all months that have snapshots for this item before deleting it
  const { data: affectedSnaps } = await supabase
    .from("wealth_item_snapshots")
    .select("month")
    .eq("item_id", id)
    .eq("user_id", user.id);

  const affectedMonths = affectedSnaps ? [...new Set(affectedSnaps.map((s) => s.month))] : [];

  // 2. Delete the wealth item (cascades to wealth_item_snapshots in database schema)
  const { error } = await supabase
    .from("wealth_debt")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) throw new Error(error.message);

  // 3. Recalculate net worth snapshots for all affected months
  if (affectedMonths.length > 0) {
    for (const month of affectedMonths) {
      const { data: remainingSnaps } = await supabase
        .from("wealth_item_snapshots")
        .select("type, value")
        .eq("user_id", user.id)
        .eq("month", month);

      let totalAssets = 0;
      let totalLiabilities = 0;

      if (remainingSnaps) {
        for (const s of remainingSnaps) {
          if (s.type === "asset") totalAssets += Number(s.value);
          else if (s.type === "liability") totalLiabilities += Number(s.value);
        }
      }

      const netWorth = totalAssets - totalLiabilities;

      if (totalAssets === 0 && totalLiabilities === 0) {
        // If no assets or liabilities left for this month, clean up the aggregate snapshot
        await supabase
          .from("net_worth_snapshots")
          .delete()
          .eq("user_id", user.id)
          .eq("month", month);
      } else {
        await supabase
          .from("net_worth_snapshots")
          .upsert(
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
    }
  }
}
