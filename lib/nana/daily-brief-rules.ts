import type {
  DailyBriefState,
  PrimaryMessageKey,
} from "./types";

export type SafeToSpendStatus = "healthy" | "attention" | "recovery" | "unknown";

export interface DailyBriefRuleInput {
  needsIncomeSetup: boolean;
  hasUpcomingFixedExpensePressure: boolean;
  safeToSpendStatus: SafeToSpendStatus;
  hasUnusualExpense: boolean;
  hasMeaningfulIncome: boolean;
}

export type MeaningfulEventReason =
  | "meaningful_income"
  | "unusual_expense"
  | "category_threshold"
  | "pace_state_change"
  | "fixed_expense_due";

export interface MeaningfulEventInput {
  hasMeaningfulIncome?: boolean;
  hasUnusualExpense?: boolean;
  categoryThresholdCrossed?: boolean;
  paceStateChanged?: boolean;
  fixedExpenseDueSoon?: boolean;
}

export function choosePrimaryMessage(
  input: DailyBriefRuleInput,
): PrimaryMessageKey {
  if (input.needsIncomeSetup) return "setup_income";
  if (input.hasUpcomingFixedExpensePressure) return "protect_fixed_expenses";
  if (input.safeToSpendStatus === "recovery") return "recover_safe_to_spend";
  if (input.hasUnusualExpense) return "explain_unusual_expense";
  if (input.hasMeaningfulIncome) return "recognize_income";
  return "celebrate_progress";
}

export function deriveDailyBriefState(
  input: DailyBriefRuleInput,
): DailyBriefState {
  if (input.needsIncomeSetup) return "setup";
  if (input.safeToSpendStatus === "recovery") return "recovery";
  if (input.hasMeaningfulIncome) return "payday";
  if (
    input.hasUpcomingFixedExpensePressure ||
    input.safeToSpendStatus === "attention" ||
    input.hasUnusualExpense
  ) {
    return "attention";
  }
  return "normal";
}

export function detectMeaningfulEvent(
  input: MeaningfulEventInput,
): MeaningfulEventReason | null {
  if (input.fixedExpenseDueSoon) return "fixed_expense_due";
  if (input.paceStateChanged) return "pace_state_change";
  if (input.categoryThresholdCrossed) return "category_threshold";
  if (input.hasUnusualExpense) return "unusual_expense";
  if (input.hasMeaningfulIncome) return "meaningful_income";
  return null;
}
