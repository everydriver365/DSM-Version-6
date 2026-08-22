# Rollback the Next Lesson test-day redesign

The current `src/routes/home.tsx` Next Lesson tile renders a special red-accented test day layout when `isTestLesson(upcoming)` is true. Remove this special treatment entirely so test lessons render the same as normal lessons.

## Changes

1. **Card chrome**
   - Remove the `isTestLesson` conditional border/shadow (line 4888-4890) and restore the single `boxShadow: '0 8px 24px rgba(15,32,68,0.12)'` style for all cases.

2. **Remove test-day countdown**
   - Delete the `testDayCountdown` variable declaration (lines 5037-5046) and any references to it.

3. **Remove the conditional test-day content block (lines 5058-5137)**
   - Delete the red banner, test detail card, "Navigate to test centre" button, and pre-test reminder strip.
   - The normal map-hero layout (the `else` branch starting at line 5138) will render for all lessons.

4. **Action buttons**
   - Remove the `isTestLesson` conditional that shows a "Checklist" button (lines 5462-5489).
   - The "Late" button should always render as the third action, matching the pre-existing normal-lesson behaviour.

5. **Cleanup**
   - Remove any imports that become unused after this rollback if they were only used for the test-day Next Lesson UI. Do not remove `isTestLesson` itself, `TestDetailTrigger`, or other test-related helpers used elsewhere in the file (e.g. the schedule list, tests breakdown modal, etc.).

## Verification

- Build and typecheck pass.
- Visual check: the Next Lesson tile for a test lesson shows the standard map hero, pupil info, action row (Message/Call/Late), and address row — no red accents, no test banner, no test detail card.
- Normal lessons remain unchanged.
