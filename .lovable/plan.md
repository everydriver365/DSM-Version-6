# Extend Gap Filler to 14 days (user-configurable)

## Recommendation
Worth doing, but keep the default at 7 days and let the instructor opt in to 14 days. Doubling the lookahead increases offer volume (and SMS queue pressure), but it directly addresses the goal of reducing empty diary slots further out without surprising users.

## What will change

1. **Shared gap-window preference**
   - Extend `src/lib/gapPrefs.ts` with `GAP_WINDOW_DAYS_STORAGE_KEY`, `DEFAULT_GAP_WINDOW_DAYS = 7`, and helpers `readGapWindowDays`, `writeGapWindowDays`, `useGapWindowDays`.
   - Allow choices: 7, 14, 21, 30 days.

2. **Gap Filler page (`src/routes/gaps.tsx`)**
   - Replace hard-coded `RANGE_DAYS = 7` with `useGapWindowDays()`.
   - Load diary data for the selected window.
   - Update the empty-state copy from "No gaps in the next 7 days" to a dynamic phrase.
   - Add a small control (e.g., a segmented button in the sticky header) to change the window. The choice persists in `localStorage` and applies to Home/Schedule automatically.

3. **Home screen (`src/routes/home.tsx`)**
   - Use `useGapWindowDays()` wherever gap suggestions are computed so the timeline and suggested-slot cards respect the same preference.

4. **Schedule page (`src/routes/schedule.tsx`)**
   - Use `useGapWindowDays()` for gap hints/banners so the diary view is consistent.

5. **No logic changes**
   - Existing `computeDayGaps()`, `previewMatchForGap()`, pupil notice rules, buffer handling, all-day-event behaviour, and SMS duplicate prevention remain untouched.

## Risks & mitigations

- **SMS queue pressure**: The account-wide `send-sms` function processes up to 50 queued rows per run. With 14 days the queue could grow faster. Mitigation: keep default 7 days; instructors choose 14 only if they want the trade-off.
- **Pupil notice rules unchanged**: Far-out slots are still filtered by each pupil's `min_notice_hours` / `short_notice_opt_in`, so pupils who need long notice will not be offered same-day/short-notice slots incorrectly.
- **No schema changes**: This is a client-side preference and date-range update only.

## Tests to update/run

- Existing gap tests assume 7 days; add/adjust cases for 14-day windows, all-day events, and pupil notice filtering across the boundary.
- Full test suite and TypeScript typecheck.

## Excluded

- No changes to `capacitor.config.ts`.
- No changes to `send-sms`, SMS matching, `gapDetection.ts`, or `pupilMatching.ts` engines.
- No database migrations.
