## Likely cause

The avatar row is gated by `previewMatchForGap` in `src/routes/schedule.tsx`, which applies a **minimum-notice filter**:

```
const minNoticeHours = s.min_notice_hours ?? 24;
if (hoursUntilSlot < minNoticeHours && !s.short_notice_opt_in) continue;
```

`hoursUntilSlot` is computed from `new Date(`${gap.date}T12:00:00`)` (noon). So on any day where noon is less than 24 hours away — i.e. today and often tomorrow — every pupil whose settings don't opt in to short notice is filtered out, and the avatar row is suppressed even though gap cards render fine. Pupils with `min_notice_hours` = null default to 24, which most pupils probably have.

Secondary factors that also silently drop pupils:
- `preferred_duration_minutes ?? 60` — any gap shorter than 60 min never matches, even if a pupil would take a 45-min lesson.
- `available_days` must contain the exact full day name ("Monday", etc.). If any pupil row stores lowercased or abbreviated day names, they'll never match.

Note: this is a hypothesis based on code inspection. Before changing behaviour I'd confirm by checking, on a day where avatars are missing, what `hoursUntilSlot`, each pupil's `min_notice_hours`, `short_notice_opt_in`, and `available_days` values are.

## Proposed fix (schedule.tsx only, matches gaps.tsx behaviour choice)

1. **Add a one-line debug log** in `previewMatchForGap` (temporary) that logs `{ date, dayName, durationMin, hoursUntilSlot, totalPupilsWithSettings, matched: matched.length }` so we can confirm the cause on the affected day, then remove after verification.
2. **Use the gap's actual start time** for the notice calculation instead of noon: build `slotStart` from `gap.date` + the gap's `startTime` (already on the `GapRow`). Pass `startTime` into `previewMatchForGap` and parse `` `${gap.date}T${gap.startTime}:00` ``. This matches gaps.tsx's approach and avoids over-filtering morning slots.
3. **Confirm behaviour with the user before loosening the filter further.** Options if they want more matches to appear:
   - Keep min-notice strict (current behaviour) — accept that today/near-term days often show no avatars.
   - Relax min-notice for the *preview only* (still enforced when actually offering), e.g. treat null as 0 rather than 24, or ignore it entirely in the preview.
   - Relax the 60-min minimum duration when `preferred_duration_minutes` is null.

Nothing else in the file changes; the avatar row markup, data fetching, and gap detection stay as-is.

## Question for you

Do you want the preview to show avatars for **all future gaps regardless of notice window** (i.e. drop the 24h filter in the preview only), or keep the min-notice check and just fix the noon-vs-actual-time bug?