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
