export interface SafeToSpendInput {
  cycleIncome: number | null;
  previousCycleIncome: number | null;
  expensesLogged: number;
  upcomingFixedExpenses: number;
  committedSaving: number;
  daysRemaining: number;
}

export interface SafeToSpendResult {
  safeToSpendPerDay: number | null;
  flexibleAmount: number | null;
  shortfall: number;
  isEstimated: boolean;
  needsIncomeSetup: boolean;
}

export type DailyBriefState =
  | "normal"
  | "attention"
  | "recovery"
  | "payday"
  | "setup";

export type FactorStatus = "good" | "attention" | "unknown";

export type MoneyScoreFactorKey =
  | "spending_pace"
  | "safe_to_spend"
  | "saving_progress"
  | "fixed_expense_pressure"
  | "logging_consistency";

export interface MoneyScoreFactor {
  key: MoneyScoreFactorKey;
  status: FactorStatus;
  points: number;
  maxPoints: number;
}

export type PrimaryMessageKey =
  | "protect_fixed_expenses"
  | "recover_safe_to_spend"
  | "explain_unusual_expense"
  | "recognize_income"
  | "celebrate_progress"
  | "setup_income";
