// lib/wealth/goals.ts
import { bangkokToday } from "@/app/actions/overview-utils";

export interface GoalStatus {
  completed: boolean;
  overdue: boolean;
  monthlyTarget: number | null;
  remainingMonths: number | null;
  remainingAmount: number;
}

/**
 * Calculates the monthly target savings and display status of a Wealth Goal.
 * Kept pure, timezone-correct (Asia/Bangkok), and independently testable.
 *
 * @param targetAmount The goal's total target amount
 * @param currentAmount The current amount saved toward the goal
 * @param targetDate The goal's target date in YYYY-MM-DD format (or null)
 * @param todayOverride Optional override of current Bangkok date (useful for unit testing)
 */
export function calculateGoalMonthlyTarget(
  targetAmount: number,
  currentAmount: number,
  targetDate: string | null,
  todayOverride?: { year: number; month: number; day: number }
): GoalStatus {
  const remainingAmount = Math.max(0, targetAmount - currentAmount);
  const completed = currentAmount >= targetAmount;

  if (completed) {
    return {
      completed: true,
      overdue: false,
      monthlyTarget: null,
      remainingMonths: null,
      remainingAmount: 0,
    };
  }

  // If there is no target date, we can't recommend a monthly target
  if (!targetDate) {
    return {
      completed: false,
      overdue: false,
      monthlyTarget: null,
      remainingMonths: null,
      remainingAmount,
    };
  }

  // Get today's date in Asia/Bangkok
  const today = todayOverride || bangkokToday();

  // Parse the target date (YYYY-MM-DD)
  const [targetYear, targetMonth, targetDay] = targetDate.split("-").map(Number);

  // A goal is overdue if it is incomplete and its target date is earlier than today's calendar date
  const isOverdue =
    targetYear < today.year ||
    (targetYear === today.year && targetMonth < today.month) ||
    (targetYear === today.year && targetMonth === today.month && targetDay < today.day);

  if (isOverdue) {
    return {
      completed: false,
      overdue: true,
      monthlyTarget: null,
      remainingMonths: null,
      remainingAmount,
    };
  }

  // Calculate inclusive calendar months remaining
  // e.g. June 2026 to June 2026 is 1 month. June 2026 to July 2026 is 2 months.
  const remainingMonths = (targetYear - today.year) * 12 + targetMonth - today.month + 1;

  if (remainingMonths <= 0) {
    return {
      completed: false,
      overdue: false,
      monthlyTarget: remainingAmount,
      remainingMonths: 1,
      remainingAmount,
    };
  }

  const monthlyTarget = Math.ceil(remainingAmount / remainingMonths);

  return {
    completed: false,
    overdue: false,
    monthlyTarget,
    remainingMonths,
    remainingAmount,
  };
}
