# Wealth Goal Monthly Target Design

## Purpose

Help users understand how much they should save each month to reach a Wealth goal by its target date.

## Existing Model

The Wealth tab already stores personal goals in `goals` with:

- `name`
- `target_amount`
- `current_amount`
- `target_date`

No schema migration is required.

## User Experience

Each Wealth goal card keeps its existing progress display and adds one status line:

- Active goal with a target date: `ต้องออมเดือนละ ฿X`
- Completed goal: `สำเร็จแล้ว`
- Incomplete goal with a past target date: `เกินกำหนด`
- Goal without a target date: no monthly recommendation line

The English locale uses equivalent copy.

## Calculation

Use calendar months because users plan savings monthly.

1. Calculate `remainingAmount = max(0, targetAmount - currentAmount)`.
2. Calculate the number of calendar months from the current Bangkok month through the target month, inclusive.
3. For an incomplete goal with a target date in the current month or a future month, calculate:

   `monthlyTarget = ceil(remainingAmount / remainingMonths)`

4. A goal is completed when `currentAmount >= targetAmount`.
5. A goal is overdue when it is incomplete and `target_date` is earlier than the current Bangkok calendar date.

The current month counts as one month. For example, if a goal is due during the current month, the monthly target equals the full remaining amount.

## Architecture

Add a small pure helper in the Wealth domain for deriving the display state and monthly target. The Wealth goal card consumes the helper output and renders the new line.

The helper does not write data and does not change server actions. This keeps date math independently testable and avoids duplicating calculation rules inside the component.

## Testing

Add focused tests for:

- A future goal divides the remaining amount across inclusive calendar months.
- A goal due in the current month recommends the full remaining amount.
- A completed goal reports completion.
- An incomplete goal with a past date reports overdue.
- A goal without a date reports no monthly recommendation.

Run the focused test suite and TypeScript verification after implementation.

