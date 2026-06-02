// app/actions/fixed-costs.ts
"use server";

import { createClient } from "@/lib/supabase/server";
import type { FixedCost, RecurringKind } from "@/lib/types";
import { bangkokToday } from "./overview-utils";
import { resolveBrandId } from "./transactions";
import { getOrRefreshDailyBrief } from "./daily-brief";

export interface FixedCostPayload {
  amount: number;
  type: "income" | "expense" | "savings";
  category_id: string | null;
  wallet_id?: string | null;
  recurring_kind?: RecurringKind;
  note: string | null;
  day_of_month: number;
  auto_log: boolean;
  start_date: string; // YYYY-MM-DD
  end_date: string | null; // YYYY-MM-DD
  last_logged_at?: string | null; // YYYY-MM-DD
}

export async function getFixedCosts(userId: string): Promise<FixedCost[]> {
  const supabase = await createClient();
  const { error: authError } = await supabase.auth.getUser();
  if (authError) throw new Error("Unauthenticated");

  const { data, error } = await supabase
    .from("fixed_costs")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data || []) as FixedCost[];
}

export async function addFixedCost(payload: FixedCostPayload): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthenticated");

  const { error } = await supabase.from("fixed_costs").insert({
    user_id: user.id,
    amount: payload.amount,
    type: payload.type,
    category_id: payload.category_id,
    wallet_id: payload.wallet_id || null,
    recurring_kind: payload.recurring_kind ?? "fixed_cost",
    note: payload.note,
    day_of_month: payload.day_of_month,
    auto_log: payload.auto_log,
    start_date: payload.start_date,
    end_date: payload.end_date || null,
    last_logged_at: payload.last_logged_at || null,
  });

  if (error) throw new Error(error.message);

  // Trigger immediate catch-up logging
  await processFixedCosts(user.id);
}

export async function updateFixedCost(
  id: string,
  payload: Partial<FixedCostPayload>
): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthenticated");

  const { error } = await supabase
    .from("fixed_costs")
    .update({
      amount: payload.amount,
      type: payload.type,
      category_id: payload.category_id,
      wallet_id: payload.wallet_id || null,
      recurring_kind: payload.recurring_kind,
      note: payload.note,
      day_of_month: payload.day_of_month,
      auto_log: payload.auto_log,
      start_date: payload.start_date,
      end_date: payload.end_date || null,
    })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) throw new Error(error.message);

  // Trigger immediate catch-up logging
  await processFixedCosts(user.id);
}

export async function deleteFixedCost(id: string): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthenticated");

  const { error } = await supabase
    .from("fixed_costs")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) throw new Error(error.message);
}

/**
 * Background catch-up logging: processes all active fixed costs for the user,
 * inserting any missing transaction records for billing cycles in the past
 * (up to and including today) that have not been logged yet.
 */
export async function processFixedCosts(userId: string): Promise<void> {
  const supabase = await createClient();
  const { year: todayYear, month: todayMonth, day: todayDay } = bangkokToday();
  const todayStr = `${todayYear}-${String(todayMonth).padStart(2, "0")}-${String(todayDay).padStart(2, "0")}`;

  const { data: fixedCosts, error: fcError } = await supabase
    .from("fixed_costs")
    .select("*")
    .eq("user_id", userId)
    .eq("auto_log", true)
    .lte("start_date", todayStr);

  if (fcError) {
    console.error("Error fetching fixed costs for processing:", fcError.message);
    return;
  }
  if (!fixedCosts || fixedCosts.length === 0) return;

  let transactionsInserted = false;

  for (const fc of fixedCosts) {
    const startStr = fc.last_logged_at || fc.start_date;
    const [startYear, startMonth] = startStr.split("-").map(Number);

    let currYear = startYear;
    let currMonth = startMonth;

    const pendingTransactions: Array<{
      user_id: string;
      amount: number;
      type: string;
      category_id: string | null;
      wallet_id: string | null;
      date: string;
      note: string | null;
      brand_id: string | null;
      fixed_cost_id: string;
      recurring_kind: RecurringKind;
    }> = [];

    let latestLoggedDate: string | null = fc.last_logged_at;

    while (
      currYear < todayYear ||
      (currYear === todayYear && currMonth <= todayMonth)
    ) {
      const daysInMonth = new Date(Date.UTC(currYear, currMonth, 0)).getUTCDate();
      const billingDay = Math.min(fc.day_of_month, daysInMonth);
      const billingDateStr = `${currYear}-${String(currMonth).padStart(2, "0")}-${String(billingDay).padStart(2, "0")}`;

      const isValidBillingStr =
        billingDateStr >= fc.start_date &&
        billingDateStr <= todayStr &&
        (!fc.end_date || billingDateStr <= fc.end_date) &&
        (!fc.last_logged_at || billingDateStr > fc.last_logged_at);

      if (isValidBillingStr) {
        const brandId = await resolveBrandId(supabase, fc.note);

        pendingTransactions.push({
          user_id: userId,
          amount: fc.amount,
          type: fc.type,
          category_id: fc.category_id,
          wallet_id: fc.wallet_id,
          date: billingDateStr,
          note: fc.note,
          brand_id: brandId,
          fixed_cost_id: fc.id,
          recurring_kind: fc.recurring_kind ?? "fixed_cost",
        });

        if (!latestLoggedDate || billingDateStr > latestLoggedDate) {
          latestLoggedDate = billingDateStr;
        }
      }

      currMonth++;
      if (currMonth > 12) {
        currMonth = 1;
        currYear++;
      }
    }

    if (pendingTransactions.length > 0) {
      // Sort so they insert chronologically
      pendingTransactions.sort((a, b) => a.date.localeCompare(b.date));

      const { error: insertError } = await supabase
        .from("transactions")
        .insert(pendingTransactions);

      if (insertError) {
        console.error("Error inserting fixed cost transactions:", insertError.message);
        continue;
      }

      transactionsInserted = true;

      // Update the fixed cost's last_logged_at
      const { error: updateError } = await supabase
        .from("fixed_costs")
        .update({ last_logged_at: latestLoggedDate })
        .eq("id", fc.id);

      if (updateError) {
        console.error("Error updating last_logged_at for fixed cost:", updateError.message);
      }
    }
  }

  if (transactionsInserted) {
    await getOrRefreshDailyBrief(userId, "fixed_expense_change").catch((err) => {
      console.error("Failed to refresh Daily Brief in processFixedCosts:", err);
    });
  }
}
