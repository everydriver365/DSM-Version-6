# Gap Filler reliability plan

## Confirmed causes

- **Overlapping diary blocks are not merged safely.** The shared calculator sorts blocks but retains the most recently started block as the previous block, even when an earlier block ends later. This can move the cursor or apply the wrong buffer and produce incorrect free windows.
- **The first appointment's after-buffer is also subtracted before that appointment.** That shortens or removes a legitimate morning gap.
- **Instructor travel buffers are applied to ICS events, recurring blocks, and time off as if each were a lesson.** This can hide otherwise valid gaps.
- **All-day ICS events are explicitly ignored.** The page can therefore show a day as free when a personal all-day event should block it.
- **Calendar rows marked not to block availability are not fetched or respected.** Every inbound ICS row is currently treated the same.
- **Load failures are silently converted into empty diary data.** A failed lessons, ICS, recurring-block, time-off, or instructor query can make the page calculate plausible-looking but false gaps instead of showing an error.
- **The page loads eight calendar dates while its empty-state copy says seven days.** The date range and wording are inconsistent.
- **Minimum gap length is stored only on the current device and forcibly clamped to at least 60 minutes.** A setting below one hour can never surface a gap, and another device may calculate different results.
- **Pupil-specific lesson buffers are not loaded on this page.** Every lesson uses the instructor-wide buffer, unlike other diary calculations, so the same day can disagree across screens.

## Implementation

1. Replace the Gap Filler page's loading pipeline with explicit, typed queries for instructor hours, lessons, pupil buffers, inbound ICS blocks, recurring blocks, time off, active pupils, availability, and unavailability.
2. Fail visibly when required diary inputs cannot be loaded; do not calculate against missing data.
3. Normalize all dates in local UK diary time and use an exact seven-day inclusive range with clear boundaries.
4. Correct the shared gap calculation so busy intervals are clamped to working hours, overlapping intervals are merged, lesson buffers apply only after lessons, non-lesson blocks do not inherit travel time, and all-day blocking events remove the day.
5. Respect `blocks_availability` for calendar rows and use only inbound ICS rows for gap detection; Google OAuth events remain visual elsewhere.
6. Use each pupil's lesson buffer when present, falling back to the instructor default.
7. Keep the existing clean mobile presentation, pupil matching, individual offer flow, and SMS queue trigger, while adding accurate empty/error states and refresh behavior.
8. Add focused tests for empty days, first/last lesson gaps, overlapping blocks, pre-working-hours ICS overlap, all-day ICS, partial time off, recurring blocks, buffers, today cutoff, BST/GMT dates, and failed loads.

## Technical scope

- Primary page: `src/routes/gaps.tsx`
- Shared calculation: `src/lib/gapDetection.ts`
- Focused gap-calculation tests
- No changes to `capacitor.config.ts`, Calendar Sync OAuth, or visible Google Calendar rendering.
