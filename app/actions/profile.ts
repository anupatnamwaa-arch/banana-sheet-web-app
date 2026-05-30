// app/actions/profile.ts
"use server";

import { createClient } from "@/lib/supabase/server";

/**
 * Rotate the current user's api_key to a fresh UUID.
 * Returns the new key. Throws "Unauthenticated" if no session.
 */
export async function regenerateApiKey(): Promise<string> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthenticated");

  const newKey = crypto.randomUUID();

  const { error } = await supabase
    .from("profiles")
    .update({ api_key: newKey })
    .eq("id", user.id);

  if (error) throw new Error(error.message);
  return newKey;
}

/**
 * Update the current user's savings-rate target (percent of income, 0–100).
 * Returns the clamped value that was saved.
 */
export async function updateSavingsTarget(pct: number): Promise<number> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthenticated");

  const clamped = Math.max(0, Math.min(100, Math.round(pct)));

  const { error } = await supabase
    .from("profiles")
    .update({ savings_target_pct: clamped })
    .eq("id", user.id);

  if (error) throw new Error(error.message);
  return clamped;
}
