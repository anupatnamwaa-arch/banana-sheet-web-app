import type { FactorStatus, MoneyScoreFactor } from "./types";

export interface MoneyScoreInput {
  spendingPaceRatio: number | null;
  safeToSpendPerDay: number | null;
  savingRate: number | null;
  savingTargetPct: number;
  fixedExpensePressureRatio: number | null;
  loggingStreak: number;
}

export interface MoneyScoreResult {
  score: number;
  factors: MoneyScoreFactor[];
}

function factor(
  key: MoneyScoreFactor["key"],
  status: FactorStatus,
  maxPoints: number,
  points: number,
): MoneyScoreFactor {
  return { key, status, maxPoints, points };
}

export function calculateMoneyScore(input: MoneyScoreInput): MoneyScoreResult {
  const spendingPace =
    input.spendingPaceRatio === null
      ? factor("spending_pace", "unknown", 25, 12)
      : input.spendingPaceRatio <= 1
        ? factor("spending_pace", "good", 25, 25)
        : factor("spending_pace", "attention", 25, 8);

  const safeToSpend =
    input.safeToSpendPerDay === null
      ? factor("safe_to_spend", "unknown", 25, 12)
      : input.safeToSpendPerDay > 0
        ? factor("safe_to_spend", "good", 25, 25)
        : factor("safe_to_spend", "attention", 25, 0);

  const savingProgress =
    input.savingRate === null
      ? factor("saving_progress", "unknown", 20, 10)
      : input.savingRate >= input.savingTargetPct
        ? factor("saving_progress", "good", 20, 20)
        : factor("saving_progress", "attention", 20, 6);

  const fixedExpensePressure =
    input.fixedExpensePressureRatio === null
      ? factor("fixed_expense_pressure", "unknown", 20, 10)
      : input.fixedExpensePressureRatio <= 0.4
        ? factor("fixed_expense_pressure", "good", 20, 20)
        : factor("fixed_expense_pressure", "attention", 20, 6);

  const loggingConsistency =
    input.loggingStreak >= 3
      ? factor("logging_consistency", "good", 10, 10)
      : factor("logging_consistency", "attention", 10, input.loggingStreak * 2);

  const factors = [
    spendingPace,
    safeToSpend,
    savingProgress,
    fixedExpensePressure,
    loggingConsistency,
  ];

  return {
    score: factors.reduce((total, item) => total + item.points, 0),
    factors,
  };
}
