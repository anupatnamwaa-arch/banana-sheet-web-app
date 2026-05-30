// app/actions/budgets.ts
"use server";

import { createClient } from "@/lib/supabase/server";

export async function setBudget(categoryId: string, amount: number): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthenticated");

  const { error } = await supabase
    .from("budgets")
    .upsert(
      { user_id: user.id, category_id: categoryId, limit_amount: amount },
      { onConflict: "user_id,category_id" }
    );
  if (error) throw new Error(error.message);
}

export async function deleteBudget(categoryId: string): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthenticated");

  const { error } = await supabase
    .from("budgets")
    .delete()
    .eq("user_id", user.id)
    .eq("category_id", categoryId);
  if (error) throw new Error(error.message);
}
