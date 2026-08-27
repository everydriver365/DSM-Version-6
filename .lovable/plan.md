# Make the dedupe SQL version-safe

## Problem

The `column "metadata" does not exist` error is not produced by the `docs/dedupe-notifications.sql` script as written — that script has no `metadata` reference. It likely came from a modified or ad-hoc cron query. Regardless, the current script uses a fixed `SELECT jobid, schedule, command, active FROM cron.job`, which can fail on Supabase/pg_cron versions where `cron.job` has a different column set (or where the SQL editor wraps queries in a way that exposes a `metadata` column).

## Plan

1. Replace the cron.job query with a dynamic, version-safe inspection that:
   - Checks which columns actually exist in `cron.job` via `information_schema.columns`
   - Returns whatever is available without hard-coding column names
2. Add a `pg_extension` check so the script gracefully reports if `pg_cron` is not installed
3. Keep the rest of the diagnostic + fix sections unchanged
4. Update `docs/dedupe-notifications.sql` with the robust version

## Technical notes

- The replacement query uses a CTE against `information_schema.columns` to list available `cron.job` columns, then selects from `cron.job` with `to_jsonb(job.*)` so every present column is returned without naming them explicitly.
- This avoids `42703` errors across Supabase/pg_cron versions.
