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
 * Update the user's display name and/or avatar URL.
 */
export async function updateProfileDisplay(
  displayName: string | null,
  avatarUrl: string | null
): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthenticated");

  const { error } = await supabase
    .from("profiles")
    .update({
      display_name: displayName?.trim() || null,
      avatar_url: avatarUrl,
    })
    .eq("id", user.id);

  if (error) throw new Error(error.message);
}

/**
 * Hard-delete all financial data for the current user.
 * Keeps: auth account, profile, categories (just labels).
 * Deletes: transactions, budgets, goals, wealth_debt (cascades snapshots),
 *          net_worth_snapshots.
 */
export async function deleteAllUserData(): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthenticated");
  const uid = user.id;

  // Order matters — delete FK-referencing tables first.
  const tables = [
    "budgets",
    "transactions",
    "goals",
    "wealth_debt",           // cascades wealth_item_snapshots
    "net_worth_snapshots",   // cascades nothing
  ] as const;

  for (const table of tables) {
    const { error } = await supabase.from(table).delete().eq("user_id", uid);
    if (error) throw new Error(`ลบ ${table} ไม่สำเร็จ: ${error.message}`);
  }
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

/**
 * Set the billing cycle start day (1–28).
 * Returns the clamped value that was saved.
 */
export async function saveBillingCycle(day: number): Promise<number> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthenticated");

  const clamped = Math.max(1, Math.min(28, Math.round(day)));

  const { error } = await supabase
    .from("profiles")
    .update({ cycle_start_day: clamped })
    .eq("id", user.id);

  if (error) throw new Error(error.message);
  return clamped;
}

/**
 * Set the emergency fund target in months (1–24).
 * Returns the clamped value that was saved.
 */
export async function saveEmergencyGoal(months: number): Promise<number> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthenticated");

  const clamped = Math.max(1, Math.min(24, Math.round(months)));

  const { error } = await supabase
    .from("profiles")
    .update({ emergency_months: clamped })
    .eq("id", user.id);

  if (error) throw new Error(error.message);
  return clamped;
}

/**
 * Set the balance calculation method ('net' | 'gross' | 'budget').
 */
export async function saveBalanceMethod(
  method: "net" | "gross" | "budget"
): Promise<void> {
  if (!["net", "gross", "budget"].includes(method)) {
    throw new Error("Invalid balance method");
  }
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthenticated");

  const { error } = await supabase
    .from("profiles")
    .update({ balance_method: method })
    .eq("id", user.id);

  if (error) throw new Error(error.message);
}

/**
 * Toggle whether the previous billing cycle's remaining balance rolls over.
 */
export async function saveCarryoverEnabled(enabled: boolean): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthenticated");

  const { error } = await supabase
    .from("profiles")
    .update({ carryover_enabled: enabled })
    .eq("id", user.id);

  if (error) throw new Error(error.message);
}
