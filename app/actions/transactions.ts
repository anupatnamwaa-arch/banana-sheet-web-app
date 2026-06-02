// app/actions/transactions.ts
"use server";

import { createClient } from "@/lib/supabase/server";
import type { RecurringKind, TransactionType } from "@/lib/types";
import { getOrRefreshDailyBrief } from "./daily-brief";

export interface TransactionPayload {
  amount: number;        // always positive
  type: TransactionType;
  category_id: string | null;
  wallet_id?: string | null;
  date: string;          // YYYY-MM-DD Bangkok-local
  note: string | null;
}

export interface RecurringTransactionPayload {
  recurring_kind: RecurringKind;
  day_of_month: number;
  end_date: string | null;
}

async function createRecurringSource(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  payload: TransactionPayload,
  recurrence: RecurringTransactionPayload
): Promise<string> {
  if (recurrence.recurring_kind === "subscription" && payload.type !== "expense") {
    throw new Error("Subscriptions are available for expenses only");
  }

  const { data, error } = await supabase
    .from("fixed_costs")
    .insert({
      user_id: userId,
      amount: payload.amount,
      type: payload.type,
      category_id: payload.category_id,
      wallet_id: payload.wallet_id || null,
      note: payload.note,
      day_of_month: recurrence.day_of_month,
      auto_log: true,
      start_date: payload.date,
      end_date: recurrence.end_date,
      last_logged_at: payload.date,
      recurring_kind: recurrence.recurring_kind,
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);
  if (!data) throw new Error("Failed to create recurring expense");
  return data.id;
}

async function deleteRecurringSource(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  fixedCostId: string
): Promise<void> {
  await supabase
    .from("fixed_costs")
    .delete()
    .eq("id", fixedCostId)
    .eq("user_id", userId);
}

/** Resolve brand_id from note text by matching against brands.aliases (case-insensitive). */
export async function resolveBrandId(
  supabase: Awaited<ReturnType<typeof createClient>>,
  note: string | null
): Promise<string | null> {
  if (!note?.trim()) return null;
  const lower = note.toLowerCase();
  const { data: brands } = await supabase
    .from("brands")
    .select("id, name, aliases");
  if (!brands) return null;
  for (const brand of brands as Array<{ id: string; name: string; aliases: string[] }>) {
    const candidates = [brand.name.toLowerCase(), ...brand.aliases.map((a) => a.toLowerCase())];
    if (candidates.some((c) => lower.includes(c))) return brand.id;
  }
  return null;
}

export async function addTransaction(
  payload: TransactionPayload,
  recurrence?: RecurringTransactionPayload
): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthenticated");

  const brand_id = await resolveBrandId(supabase, payload.note);
  const fixedCostId = recurrence
    ? await createRecurringSource(supabase, user.id, payload, recurrence)
    : null;

  const { error } = await supabase.from("transactions").insert({
    user_id: user.id,
    amount: payload.amount,
    type: payload.type,
    category_id: payload.category_id,
    wallet_id: payload.wallet_id || null,
    date: payload.date,
    note: payload.note,
    brand_id,
    fixed_cost_id: fixedCostId,
    recurring_kind: recurrence?.recurring_kind ?? null,
  });
  if (error) {
    if (fixedCostId) await deleteRecurringSource(supabase, user.id, fixedCostId);
    throw new Error(error.message);
  }

  await getOrRefreshDailyBrief(user.id, "transaction_change").catch((err) => {
    console.error("Failed to refresh Daily Brief in addTransaction:", err);
  });
}

export async function updateTransaction(
  id: string,
  payload: TransactionPayload,
  recurrence?: RecurringTransactionPayload
): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthenticated");

  const brand_id = await resolveBrandId(supabase, payload.note);
  const fixedCostId = recurrence
    ? await createRecurringSource(supabase, user.id, payload, recurrence)
    : null;

  const { error } = await supabase
    .from("transactions")
    .update({
      amount: payload.amount,
      type: payload.type,
      category_id: payload.category_id,
      wallet_id: payload.wallet_id || null,
      date: payload.date,
      note: payload.note,
      brand_id,
      ...(recurrence
        ? {
            fixed_cost_id: fixedCostId,
            recurring_kind: recurrence.recurring_kind,
          }
        : {}),
    })
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) {
    if (fixedCostId) await deleteRecurringSource(supabase, user.id, fixedCostId);
    throw new Error(error.message);
  }

  await getOrRefreshDailyBrief(user.id, "transaction_change").catch((err) => {
    console.error("Failed to refresh Daily Brief in updateTransaction:", err);
  });
}

/** Insert a copy of an existing transaction (same fields). Returns nothing. */
export async function duplicateTransaction(id: string): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthenticated");

  const { data: original, error: fetchError } = await supabase
    .from("transactions")
    .select("amount, type, category_id, date, note, brand_id")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();
  if (fetchError) throw new Error(fetchError.message);
  if (!original) throw new Error("ไม่พบรายการ");

  const { error } = await supabase.from("transactions").insert({
    user_id: user.id,
    amount: original.amount,
    type: original.type,
    category_id: original.category_id,
    date: original.date,
    note: original.note,
    brand_id: original.brand_id,
  });
  if (error) throw new Error(error.message);

  await getOrRefreshDailyBrief(user.id, "transaction_change").catch((err) => {
    console.error("Failed to refresh Daily Brief in duplicateTransaction:", err);
  });
}

export async function deleteTransaction(id: string): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthenticated");

  const { error } = await supabase
    .from("transactions")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) throw new Error(error.message);

  await getOrRefreshDailyBrief(user.id, "transaction_change").catch((err) => {
    console.error("Failed to refresh Daily Brief in deleteTransaction:", err);
  });
}

export async function addCategory(name: string, type: string): Promise<string> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthenticated");

  const { data, error } = await supabase
    .from("categories")
    .insert({
      user_id: user.id,
      name: name.trim(),
      type,
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);
  if (!data) throw new Error("Failed to create category");
  return data.id;
}
