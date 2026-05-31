// app/actions/wallets.ts
"use server";

import { createClient } from "@/lib/supabase/server";
import type { Wallet } from "@/lib/types";

/**
 * Fetch all wallets/accounts for the current user.
 */
export async function getWallets(): Promise<Wallet[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthenticated");

  const { data, error } = await supabase
    .from("wallets")
    .select("id, user_id, name, balance, color, icon, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);
  return (data || []) as Wallet[];
}

/**
 * Set (create or update) a wallet for the current user.
 */
export async function setWallet(payload: {
  id?: string;
  name: string;
  balance: number;
  color: string;
  icon: string;
}): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthenticated");

  const name = payload.name.trim();
  if (!name) throw new Error("กรุณากรอกชื่อกระเป๋าเงิน / Wallet name is required");

  const dataToSave = {
    user_id: user.id,
    name,
    balance: payload.balance || 0,
    color: payload.color || "#fb923c",
    icon: payload.icon || "👛",
  };

  if (payload.id) {
    // Update existing wallet
    const { error } = await supabase
      .from("wallets")
      .update(dataToSave)
      .eq("id", payload.id)
      .eq("user_id", user.id);

    if (error) throw new Error(error.message);
  } else {
    // Create new wallet
    const { error } = await supabase
      .from("wallets")
      .insert(dataToSave);

    if (error) throw new Error(error.message);
  }
}

/**
 * Delete a wallet by ID.
 * Transactions using this wallet will have wallet_id set to null automatically (cascade set null).
 */
export async function deleteWallet(id: string): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthenticated");

  const { error } = await supabase
    .from("wallets")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) throw new Error(error.message);
}
