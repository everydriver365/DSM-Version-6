No code changes requested. See the audit above:

- settings.tsx has 1 inline data section (day booleans only) and 2 menu links to `/availability` and `/availability-settings`.
- Three editors write working hours across the app: settings.tsx inline toggles, `/availability`, and `/availability-settings` (plus `/onboarding` seeding).
- Two competing sources of truth:
  - `public.working_hours` (mon..sun, start_time, end_time, lesson_duration_minutes, break_minutes) — written by settings.tsx, `/availability`, `/onboarding`; read by `/home`.
  - `public.instructors` (working_hours_start, working_hours_end, working_days, buffers, lunch, travel) — written by `/availability-settings`; read by `/schedule`, `/gaps`.
- The two are never synced, so editing hours in one editor does not update pages that read the other.

If you'd like, next step could be a plan to consolidate onto a single source of truth (recommend `working_hours` table) and migrate `/availability-settings`, `/schedule`, and `/gaps` to read/write from it — or the reverse. Tell me which direction you want and I'll write the plan.