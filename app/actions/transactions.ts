// app/actions/transactions.ts
"use server";

import { createClient } from "@/lib/supabase/server";
import type { TransactionType } from "@/lib/types";

export interface TransactionPayload {
  amount: number;        // always positive
  type: TransactionType;
  category_id: string | null;
  date: string;          // YYYY-MM-DD Bangkok-local
  note: string | null;
}

/** Resolve brand_id from note text by matching against brands.aliases (case-insensitive). */
async function resolveBrandId(
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

export async function addTransaction(payload: TransactionPayload): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthenticated");

  const brand_id = await resolveBrandId(supabase, payload.note);

  const { error } = await supabase.from("transactions").insert({
    user_id: user.id,
    amount: payload.amount,
    type: payload.type,
    category_id: payload.category_id,
    date: payload.date,
    note: payload.note,
    brand_id,
  });
  if (error) throw new Error(error.message);
}

export async function updateTransaction(
  id: string,
  payload: TransactionPayload
): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthenticated");

  const brand_id = await resolveBrandId(supabase, payload.note);

  const { error } = await supabase
    .from("transactions")
    .update({
      amount: payload.amount,
      type: payload.type,
      category_id: payload.category_id,
      date: payload.date,
      note: payload.note,
      brand_id,
    })
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) throw new Error(error.message);
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
}
