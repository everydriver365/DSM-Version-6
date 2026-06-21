## Problem

`/pupils/new` (and `/pupils/edit/:id`) write/read a `pupils.address` column that doesn't exist in the live Supabase schema, causing PostgREST error: *Could not find the 'address' column of 'pupils' in the schema cache*.

The SQL exists in `db/037_pupil_address_lesson_pickup.sql` but was never applied — that folder is a manual SQL-editor changelog, not a migration runner. The same file also adds `lessons.pickup_location`, which is referenced elsewhere in the app.

## Fix

Run a single migration that mirrors `db/037`:

```sql
alter table public.pupils
  add column if not exists address text;

alter table public.lessons
  add column if not exists pickup_location text;
```

No code changes — `pupils.new.tsx` / `pupils.edit.$id.tsx` already handle the column correctly. No RLS/grant changes needed (existing table policies cover new columns).

## Verification

After migration, reload `/pupils/new`, submit a pupil with an address, and confirm the insert succeeds and the row shows the address in `/pupils/edit/:id`.
