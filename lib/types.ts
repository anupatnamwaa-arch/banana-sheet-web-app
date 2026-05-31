// Hand-written domain types mirroring the Phase 1 schema.
// See CONTEXT.md for the meaning of each term.

export type TransactionType = "income" | "expense" | "savings";
export type WealthType = "asset" | "liability";
export type PlanType = "lifetime" | "monthly" | "yearly";
export type SlipStatus = "pending" | "verified" | "rejected";

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

/** A user is Active (Pro) when the gate is set AND the plan hasn't expired. */
export function isActive(p: Pick<Profile, "is_active" | "plan_expires_at">): boolean {
  if (!p.is_active) return false;
  if (p.plan_expires_at === null) return true; // lifetime
  return new Date(p.plan_expires_at).getTime() > Date.now();
}
