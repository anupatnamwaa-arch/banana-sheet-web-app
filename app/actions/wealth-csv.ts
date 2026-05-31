// app/actions/wealth-csv.ts
"use server";

import { createClient } from "@/lib/supabase/server";

export interface WealthImportRow {
  name: string;
  type: "asset" | "liability";
  value: number;
  is_liquid: boolean;
  monthly_payment: number | null;
  due_date: string | null; // YYYY-MM-DD or null
}

export interface WealthImportResult {
  inserted: number;
  skipped: number;
}

export async function bulkImportWealth(
  rows: WealthImportRow[]
): Promise<WealthImportResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthenticated");

  let skipped = 0;
  const inserts: Array<{
    user_id: string;
    name: string;
    type: string;
    value: number;
    is_liquid: boolean;
    monthly_payment: number | null;
    due_date: string | null;
  }> = [];

  for (const row of rows) {
    if (!row.name?.trim()) { skipped++; continue; }
    if (row.type !== "asset" && row.type !== "liability") { skipped++; continue; }
    if (!Number.isFinite(row.value) || row.value < 0) { skipped++; continue; }

    inserts.push({
      user_id: user.id,
      name: row.name.trim(),
      type: row.type,
      value: row.value,
      is_liquid: row.type === "asset" ? row.is_liquid : false,
      monthly_payment: row.type === "liability" ? row.monthly_payment : null,
      due_date: row.type === "liability" ? row.due_date : null,
    });
  }

  if (inserts.length > 0) {
    const { error } = await supabase.from("wealth_debt").insert(inserts);
    if (error) throw new Error(error.message);
  }

  return { inserted: inserts.length, skipped };
}
