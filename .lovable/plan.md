## Plan

1. **Keep changes limited to `src/routes/home.tsx`.**
2. **Fix the admin lookup failure.** The console shows `admin_users` returns multiple rows for the same user, so `.maybeSingle()` fails with `PGRST116` and returns `null`. I’ll change the admin check to fetch rows with `.limit(1)` instead of requiring exactly one row.
3. **Preserve the access flow.** If no instructor exists:
   - query `admin_users` for the logged-in user,
   - if at least one admin row exists, navigate to `/admin`,
   - otherwise navigate to `/onboarding`.
4. **Make the loading gate complete.** Set `authChecked` before any early return that navigates, so the page does not hang during redirects.
5. **Leave debugging logs in place for now** unless you want them removed after confirming admin access works.

## Technical detail

The current admin query is:

```ts
.maybeSingle()
```

Your console log shows:

```text
PGRST116: Results contain 2 rows
```

That means the user is found in `admin_users`, but duplicate rows make `.maybeSingle()` treat it as an error. The code then falls through to onboarding. The fix is to use a list query such as:

```ts
const { data: adminRows, error: adminErr } = await supabase
  .from("admin_users")
  .select("role")
  .eq("user_id", u.id)
  .limit(1);

const adminRow = adminRows?.[0] ?? null;
```