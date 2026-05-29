# Single-currency THB, store UTC, bucket/display in Asia/Bangkok

The app is single-currency: amounts are plain numerics in Thai Baht (THB), with no currency column and no conversion. Multi-currency adds rate/history complexity that the core value doesn't need.

All timestamps are stored in UTC (`timestamptz`), but every time-based calculation — Monthly Velocity, Avg Monthly Expense, "this month's" roast, Daily Pace, the period selector — buckets and displays in **Asia/Bangkok (UTC+7)**. Grouping by UTC would push late-evening Bangkok transactions into the wrong day/month for the entire (Thai) user base. Ingestion treats an incoming Shortcut `date` as Bangkok-local and defaults to `now()` when omitted.

## Consequences

- Date bucketing must explicitly apply the Asia/Bangkok offset in queries/aggregations — never rely on the server's local zone or naive UTC truncation.
- Going multi-currency or multi-timezone later is a non-trivial migration; deliberately deferred.
