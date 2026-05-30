// app/actions/goals.ts
"use server";

import { createClient } from "@/lib/supabase/server";

export interface GoalPayload {
  name: string;
  target_amount: number;
  current_amount: number;
  target_date: string | null; // YYYY-MM-DD or null
}

export async function addGoal(payload: GoalPayload): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthenticated");

  const { error } = await supabase.from("goals").insert({
    user_id: user.id,
    name: payload.name,
    target_amount: payload.target_amount,
    current_amount: payload.current_amount,
    target_date: payload.target_date,
  });
  if (error) throw new Error(error.message);
}

export async function updateGoal(id: string, payload: GoalPayload): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthenticated");

  const { error } = await supabase
    .from("goals")
    .update({
      name: payload.name,
      target_amount: payload.target_amount,
      current_amount: payload.current_amount,
      target_date: payload.target_date,
    })
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) throw new Error(error.message);
}

export async function deleteGoal(id: string): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthenticated");

  const { error } = await supabase.from("goals").delete().eq("id", id).eq("user_id", user.id);
  if (error) throw new Error(error.message);
}
