## Problem

On `/pupils`, the Active tab queries:

```
.is("deleted_at", null)
.neq("status", "inactive")
.neq("status", "passed")
.neq("status", "cancelled")
```

In PostgREST/SQL, `status != 'inactive'` evaluates to NULL (not TRUE) when `status IS NULL`. Rows with NULL status are therefore excluded, so pupils who were never assigned a status don't show up as Active — even though they should be the default.

## Fix

In `src/routes/pupils.index.tsx`, change the Active branch of the tab query so NULL statuses are treated as active. Replace the three chained `.neq(...)` calls with a single PostgREST `or` filter that explicitly includes NULL:

```ts
q = q
  .is("deleted_at", null)
  .or("status.is.null,and(status.neq.inactive,status.neq.passed,status.neq.cancelled)");
```

Leave the Passed and Archived branches unchanged. No other files touched, no schema/backend changes, no logic changes to lesson counts, balances, hours, or realtime subscriptions.

## Verification

- Reload `/pupils`, confirm pupils with NULL status now appear under Active.
- Confirm Passed tab still only shows `status = 'passed'`.
- Confirm Archived tab still shows deleted / inactive / cancelled.
