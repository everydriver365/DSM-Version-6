# New features & product roadmap

## Project context

Every Driver Pro is a UK driving-instructor app built on TanStack Start + Supabase. It already has: home dashboard, schedule/diary, pupils, lessons, payments, courses, marketplace, PRO perks, PRO radio/TV/news, community, Google Calendar sync, push notifications, tasks/actions, and media hub.

## Goal

Add instructor-facing features that reduce admin time, improve pupil outcomes, and increase revenue/retention without a full re-architecture.

## Proposed roadmap

### Phase 1 — Quick wins (high impact, low risk)

1. **Automated lesson reminders**
   - 24 h and 2 h before-lesson SMS/push/email reminders for pupils.
   - Reuse existing `lessons` table, `pushNotifications` lib, and scheduled edge-function pattern.
   - Add per-pupil opt-out and a template in admin.

2. **Pupil progress & curriculum tracker**
   - New `pupil_progress` table (pupil_id, skill, status, last_practised_date, notes).
   - Skills aligned to the UK DVSA syllabus (mirror-signal-manoeuvre, junctions, roundabouts, manoeuvres, independent driving, etc.).
   - Visible on the pupil card and inside the end-of-lesson wizard; drives a "test-ready" estimate.

3. **No-show / cancellation policy automation**
   - configurable cancellation window per instructor (e.g., 48 h).
   - Auto-flag late cancellations in the schedule and optionally apply a stored `cancellation_fee` to the pupil balance.
   - Reuses existing `lessons.status`, `pupils.account_balance`, and payment flows.

### Phase 2 — Differentiators

4. **Route optimisation for the day**
   - Morning "plan my day" view that reorders lessons to minimise drive time between pickups.
   - Builds on existing `lesson-weather.functions.ts`, `lesson-drive-time.functions.ts`, and `computeDayGaps` logic.
   - Respects fixed personal blocks and lesson durations.

5. **DVSA test centre cancellation finder**
   - Public cron/API route that polls DVSA booking cancellations for instructors' pupils.
   - Store test centres per pupil; notify when an earlier slot appears.
   - Fits the existing notification infrastructure and `driving-test.$pupilId.tsx` flow.

6. **Pupil self-service booking & payment portal**
   - Public `/book/:instructorSlug` route where pupils see availability, request a slot, and pay via Square.
   - Reuses `availability.tsx`, course/pricing rules, and the Square payment edge function already in use for courses.

### Phase 3 — Scale & community

7. **Instructor analytics dashboard**
   - Revenue, hours taught, pass rate, pupil churn, gap utilisation over time.
   - Aggregates existing `lessons`, `payments`, `pupils`, and `expenses` tables; new `instructor_stats` materialised view optional.

8. **Referral rewards**
   - Each pupil gets a shareable referral code; instructor sets reward (e.g., £10 off next lesson).
   - Track conversions in a new `referrals` table; surface in payments/earnings.

9. **AI lesson briefing & debrief assistant**
   - Use the already-installed `ai` SDK to generate a concise lesson plan for the next lesson based on pupil progress and weaknesses.
   - Optionally generate a pupil-friendly recap text after the end-of-lesson wizard.

## Recommended first step

Start with **Phase 1.1 Automated lesson reminders** and **Phase 1.2 Pupil progress tracker**. They:
- directly reduce no-shows and improve pupil outcomes,
- reuse existing tables and notification code,
- create foundation data for later AI and analytics features.

## Technical notes

- All new tables should follow the existing Supabase RLS + GRANT pattern.
- Keep UI consistent with the existing iOS-like, navy/teal design system.
- Reuse existing components: `BottomSheet`, `SectionHeader`, `PageLayout`, `DSMPill`, `PupilAvatar`.
- Edge functions for cron/webhooks belong under `supabase/functions/`; app-internal logic uses `createServerFn`.
