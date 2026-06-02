// Hand-written domain types mirroring the Phase 1 schema.
// See CONTEXT.md for the meaning of each term.

export type TransactionType = "income" | "expense" | "savings";
export type RecurringKind = "fixed_cost" | "subscription";
export type WealthType = "asset" | "liability";
export type PlanType = "lifetime" | "monthly" | "yearly";
export type SlipStatus = "pending" | "verified" | "rejected";

import type {
  DailyBriefState,
  MoneyScoreFactor,
} from "@/lib/nana/types";

export interface Profile {
  id: string;
  is_active: boolean;
  api_key: string;
  plan_type: PlanType | null;
  plan_expires_at: string | null;
  promo_code: string | null;
  free_roast_used: boolean;
  last_roast_at: string | null;
  savings_target_pct: number;
  cycle_start_day: number;    // 1–28, day the billing period starts (default 1)
  emergency_months: number;   // 1–24, target months of emergency runway (default 6)
  balance_method: "net" | "gross" | "budget"; // how 'remaining' is calculated (default 'net')
  carryover_enabled: boolean; // whether previous cycle remaining rolls into this month (default false)
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
}

export interface Category {
  id: string;
  user_id: string;
  name: string;
  icon: string | null;
  created_at: string;
}

export interface Brand {
  id: string;
  name: string;
  aliases: string[];
  domain: string | null;
  logo_url: string | null;
}

export interface Wallet {
  id: string;
  user_id: string;
  name: string;
  balance: number;
  color: string;
  icon: string;
  created_at: string;
}

export interface Transaction {
  id: string;
  user_id: string;
  amount: number;
  category_id: string | null;
  brand_id: string | null;
  wallet_id: string | null;
  fixed_cost_id: string | null;
  recurring_kind: RecurringKind | null;
  type: TransactionType;
  date: string;
  note: string | null;
  created_at: string;
}

export interface Budget {
  id: string;
  user_id: string;
  category_id: string;
  limit_amount: number;
}

export interface WealthDebt {
  id: string;
  user_id: string;
  name: string;
  type: WealthType;
  value: number;
  is_liquid: boolean;
  monthly_payment: number | null; // liabilities only
  due_date: string | null;        // liabilities only, YYYY-MM-DD
  updated_at: string;
}

export interface Goal {
  id: string;
  user_id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  target_date: string | null; // YYYY-MM-DD
  created_at: string;
}

export interface FixedCost {
  id: string;
  user_id: string;
  amount: number;
  type: TransactionType;
  category_id: string | null;
  wallet_id: string | null;
  recurring_kind: RecurringKind;
  note: string | null;
  day_of_month: number;
  auto_log: boolean;
  start_date: string; // YYYY-MM-DD
  end_date: string | null; // YYYY-MM-DD
  last_logged_at: string | null; // YYYY-MM-DD
  created_at: string;
}

export interface DailyBrief {
  id: string;
  user_id: string;
  brief_date: string;
  state: DailyBriefState;
  safe_to_spend_per_day: number | null;
  safe_to_spend_is_estimated: boolean;
  money_score: number;
  score_factors: MoneyScoreFactor[];
  primary_message_key: string;
  suggested_action_key: string | null;
  reason_values: Record<string, number | string | boolean | null>;
  ai_detail_th: string | null;
  suggestion_dismissed_at: string | null;
  refresh_reason: string;
  refreshed_at: string;
  created_at: string;
}

/** A user is Active (Pro) when the gate is set AND the plan hasn't expired. */
export function isActive(p: Pick<Profile, "is_active" | "plan_expires_at">): boolean {
  if (!p.is_active) return false;
  if (p.plan_expires_at === null) return true; // lifetime
  return new Date(p.plan_expires_at).getTime() > Date.now();
}
