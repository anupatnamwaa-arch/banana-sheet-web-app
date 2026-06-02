# Monthly Subscriptions Design Spec

## 1. Summary

Users can mark an expense as either a regular recurring expense or a subscription. Both repeat monthly and use the existing fixed-cost auto-logging flow. The distinction lets Analytics report subscription spending separately from other committed monthly expenses such as rent.

The first release supports monthly subscriptions only. Annual billing, trials, renewal reminders, and price-change detection are outside this scope.

## 2. Domain Model

The existing `fixed_costs` table remains the single source of truth for recurring monthly cash flows. Add:

```sql
recurring_kind text not null default 'fixed_cost'
  check (recurring_kind in ('fixed_cost', 'subscription'))
```

`fixed_cost` preserves the existing behavior for rent, utilities, and other monthly commitments. `subscription` represents monthly services such as Netflix or Spotify.

Add an optional link from each generated or initially marked transaction to its recurring source:

```sql
fixed_cost_id uuid references public.fixed_costs(id) on delete set null
recurring_kind text
  check (recurring_kind is null or recurring_kind in ('fixed_cost', 'subscription'))
```

`fixed_cost_id` links the logged payment to its recurring source while that source exists. The transaction-level `recurring_kind` is a snapshot: it preserves historical Analytics classification if the user later deletes the recurring source. Existing historical rows remain valid with both fields set to `null`. Analytics must keep its current amount/category/note matcher as a legacy fallback for those pre-migration rows only.

## 3. Transaction Entry

The add-transaction drawers expose one recurrence choice with three states:

1. `One-time`
2. `Recurring expense`
3. `Subscription`

`One-time` creates only the transaction.

`Recurring expense` and `Subscription` create the initial transaction and one `fixed_costs` row with the selected `recurring_kind`. The initial transaction stores the new fixed cost ID so the current payment is classified correctly. Its billing day defaults to today's Bangkok calendar day and remains editable before submission.

The recurring flow continues to support an optional end date. Subscriptions repeat monthly only and are available for expense transactions only. Existing recurring income and savings behavior remains unchanged under `Recurring expense`.

Use one coordinated server action for transaction entry with recurrence. It creates the fixed-cost row with `last_logged_at` set to the initial transaction date, then creates the linked transaction with its `fixed_cost_id` and `recurring_kind` snapshot. If linked transaction creation fails, remove the newly created fixed-cost row and return an error.

When the user edits an existing one-time expense and marks it as a subscription, create the fixed-cost row with `last_logged_at` set to that transaction's date, then update the existing transaction with its `fixed_cost_id` and `recurring_kind` snapshot. The first future auto-log occurs in the next eligible month, so the original payment is not duplicated.

## 4. Auto-Logging

`processFixedCosts(userId)` remains the only recurring scheduler. When it inserts a monthly transaction, it also writes the source `fixed_cost_id` and the `recurring_kind` snapshot.

The existing `last_logged_at` behavior continues to prevent duplicate monthly entries. The initial transaction created from the add drawer is linked to its fixed cost and treated as already logged for the current day, so enabling recurrence does not add a second copy immediately.

If a recurring entry is deleted, historical transactions remain in the ledger. Their `fixed_cost_id` becomes `null` through `on delete set null`, while their `recurring_kind` snapshot remains unchanged.

## 5. Settings

The recurring-expense settings drawer continues to manage both types in one list. Each subscription row displays a visible `Subscription` badge. The add/edit form includes a recurring-type selector:

- `Recurring expense`
- `Subscription`

Existing fixed costs default to `Recurring expense` after migration. The existing auto-log toggle, billing day, start date, end date, category, wallet, and note fields remain available for both types.

## 6. Analytics

Analytics classifies a transaction as recurring when it has a transaction-level `recurring_kind`. For legacy historical rows without that snapshot, it must use the existing amount/category/note matcher as a fallback.

Recurring analytics continue to include both kinds in the total committed-expense load. Add a separate subscription amount so the interface can show how much of the recurring total comes from subscriptions.

The Analytics UI displays subscriptions separately from other recurring expenses while preserving the existing recurring-total cards and breakdowns.

## 7. Error Handling

- Reject any `recurring_kind` outside `fixed_cost` and `subscription` at the database layer.
- Reject `subscription` when the transaction type is not `expense` in the coordinated server action.
- If linked transaction creation fails after fixed-cost creation, remove the newly created fixed-cost row and show the drawer error.
- If linking an existing transaction fails after fixed-cost creation, remove the newly created fixed-cost row and leave the transaction unchanged.
- If automatic logging fails for one recurring entry, log the server error and continue processing the remaining entries, matching the current behavior.
- Existing rows and historical transactions must continue to work after migration.

## 8. Testing

Add focused tests for:

- Migration fields, defaults, allowed values, and foreign-key behavior.
- Fixed-cost payloads accepting `fixed_cost` and `subscription`.
- Initial transaction linking and cleanup behavior when a user marks a new entry as recurring.
- Existing transaction linking and duplicate prevention when a user marks an old expense as a subscription.
- Auto-logged monthly transactions storing `fixed_cost_id` and a `recurring_kind` snapshot.
- Existing `last_logged_at` duplicate prevention.
- Analytics classifying subscription snapshots separately while retaining the legacy fallback for old rows.
- Drawer and settings copy exposing the new three-state transaction choice and subscription badge.

Run the existing analytics, fixed-cost, dashboard navigation, Nana refresh-hook, TypeScript, and production-build checks after the focused tests.
