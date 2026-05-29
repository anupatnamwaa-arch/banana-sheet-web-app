// app/actions/csv.ts
"use server";

import { createClient } from "@/lib/supabase/server";
import { bangkokDateKey } from "@/lib/format";
import type { TransactionType } from "@/lib/types";

export interface MappedRow {
  date: string;       // Bangkok-local calendar date, YYYY-MM-DD
  amount: number;     // always positive
  type: TransactionType;
  category?: string;
  note?: string;
}

export async function exportTransactionsCsv(): Promise<string> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthenticated");

  const { data, error } = await supabase
    .from("transactions")
    .select("date, amount, type, note, categories(name)")
    .eq("user_id", user.id)
    .order("date", { ascending: false });

  if (error) throw new Error(error.message);

  const rows = (data ?? []) as unknown as Array<{
    date: string;
    amount: number;
    type: string;
    note: string | null;
    categories: { name: string } | null;
  }>;

  const header = "date,amount,type,category,note";
  const escapeField = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const lines = rows.map((r) => {
    const date = bangkokDateKey(r.date);
    const category = r.categories?.name ?? "";
    return [escapeField(date), r.amount, r.type, escapeField(category), escapeField(r.note ?? "")].join(",");
  });

  return [header, ...lines].join("\n") + "\n";
}

export interface ImportResult {
  inserted: number;
  skipped: number;
}

export async function bulkImportTransactions(
  rows: MappedRow[]
): Promise<ImportResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthenticated");

  // Resolve categories: batch upsert unique names, then build name→id map.
  const uniqueNames = [...new Set(
    rows.map((r) => r.category?.trim()).filter(Boolean) as string[]
  )];

  const categoryMap: Record<string, string> = {};

  if (uniqueNames.length > 0) {
    // Insert missing categories (ON CONFLICT does nothing — idempotent).
    const { error: catInsertError } = await supabase.from("categories").insert(
      uniqueNames.map((name) => ({ user_id: user.id, name }))
    );
    // A conflict (duplicate) is expected and safe — only throw on real errors.
    if (catInsertError && catInsertError.code !== "23505") {
      throw new Error(catInsertError.message);
    }

    const { data: cats } = await supabase
      .from("categories")
      .select("id, name")
      .eq("user_id", user.id)
      .in("name", uniqueNames);

    (cats ?? []).forEach((c: { id: string; name: string }) => {
      categoryMap[c.name.toLowerCase()] = c.id;
    });
  }

  // Build insert payload — skip rows that fail validation.
  let skipped = 0;
  const inserts: Array<{
    user_id: string;
    amount: number;
    type: TransactionType;
    category_id: string | null;
    note: string | null;
    date: string;
  }> = [];

  for (const row of rows) {
    if (!Number.isFinite(row.amount) || row.amount < 0) { skipped++; continue; }
    if (row.type !== "income" && row.type !== "expense") { skipped++; continue; }
    if (!row.date || isNaN(Date.parse(row.date))) { skipped++; continue; }

    inserts.push({
      user_id: user.id,
      amount: row.amount,
      type: row.type,
      category_id: row.category
        ? (categoryMap[row.category.toLowerCase()] ?? null)
        : null,
      note: row.note ?? null,
      date: row.date,
    });
  }

  if (inserts.length > 0) {
    const { error } = await supabase.from("transactions").insert(inserts);
    if (error) throw new Error(error.message);
  }

  return { inserted: inserts.length, skipped };
}
