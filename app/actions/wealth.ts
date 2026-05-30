// app/actions/wealth.ts
"use server";

import { createClient } from "@/lib/supabase/server";
import type { WealthType } from "@/lib/types";

export interface WealthPayload {
  name: string;
  type: WealthType;       // "asset" | "liability"
  value: number;          // > 0
  is_liquid: boolean;     // forced false for liabilities
}

export async function addWealth(payload: WealthPayload): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthenticated");

  const { error } = await supabase.from("wealth_debt").insert({
    user_id: user.id,
    name: payload.name,
    type: payload.type,
    value: payload.value,
    is_liquid: payload.type === "asset" ? payload.is_liquid : false,
  });
  if (error) throw new Error(error.message);
}

export async function updateWealth(id: string, payload: WealthPayload): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthenticated");

  const { error } = await supabase
    .from("wealth_debt")
    .update({
      name: payload.name,
      type: payload.type,
      value: payload.value,
      is_liquid: payload.type === "asset" ? payload.is_liquid : false,
    })
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) throw new Error(error.message);
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
