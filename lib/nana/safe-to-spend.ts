import type { SafeToSpendInput, SafeToSpendResult } from "./types";

export function calculateSafeToSpend(
  input: SafeToSpendInput,
): SafeToSpendResult {
  const isEstimated = input.cycleIncome === null && input.previousCycleIncome !== null;
  const income = input.cycleIncome ?? input.previousCycleIncome;

  if (income === null) {
    return {
      safeToSpendPerDay: null,
      flexibleAmount: null,
      shortfall: 0,
      isEstimated: false,
      needsIncomeSetup: true,
    };
  }

  const flexibleAmount =
    income -
    input.expensesLogged -
    input.upcomingFixedExpenses -
    input.committedSaving;
  const shortfall = Math.max(0, -flexibleAmount);
  const safeToSpendPerDay = Math.max(
    0,
    Math.floor(flexibleAmount / Math.max(1, input.daysRemaining)),
  );

  return {
    safeToSpendPerDay,
    flexibleAmount,
    shortfall,
    isEstimated,
    needsIncomeSetup: false,
  };
}
