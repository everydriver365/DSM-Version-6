# Google Calendar: two-way setup UI + push on lesson create

Scope: only `src/routes/calendarsync.tsx`, `src/routes/lessons.new.tsx`, `src/components/lessons/AddLessonSheet.tsx`.

## What exists today

`calendarsync.tsx` (800 lines) renders, in order: info card → "Import your Google Calendar" card (ICS URL paste, sync error / last-synced states, "Save and sync calendar", "Sync now", "Remove calendar") → "YOUR ICS FEED URL" card (copy/share) → "How calendar sync works" → info banner.

`AddLessonSheet.tsx` already inserts with `.select("id").single()` into `insertedLesson` (line ~285). `lessons.new.tsx` inserts without `.select()`, so it needs `.select("id").single()` added to get the new lesson id.

## Changes

### 1. calendarsync.tsx — two labelled sections

**Section 1 — "Bring Google events into DSM"**
Add a `SectionHeader` above the existing import card. Logic, state and markup inside it stay byte-identical.

**Section 2 — "Send DSM lessons to Google"** (new card, placed directly below section 1, above the ICS feed card)

On mount (in the existing auth effect, after `setUserId`), read `google_calendar_connections` for `connected_at, last_synced_at` where `instructor_id = user.id` via `maybeSingle()`; failures are swallowed so the page still renders.

- Not connected: full-width blue `#1877D6` "Connect Google Calendar" button. On click, `supabase.functions.invoke("google-calendar-auth")`, take `{ url }` from the response and `window.location.href = url`. Error toast if no url comes back.
- Connected: green check + "Connected on {connected_at formatted}", "Last synced: {timeAgo(last_synced_at)}" (reusing the existing `timeAgo` helper), and a red-outline "Disconnect" button that deletes the `google_calendar_connections` row and clears `google_event_id` on the instructor's future lessons (`lesson_date >= today`), then resets local state and toasts.

Also on mount, read `window.location.search`: `?connected=google` → success toast, `?error=...` → error toast; strip the params with `history.replaceState` so they don't re-fire.

The existing "How calendar sync works" copy that says lessons appear in Google "within 24 hours" stays as-is unless you want it reworded once the push path is live.

### 2 & 3. Push new lessons

`lessons.new.tsx`: change the insert to `.select("id").single()` and keep the existing error handling. `AddLessonSheet.tsx` already returns the id.

In both, immediately after the successful insert:

```ts
void supabase.functions.invoke("google-calendar-sync", {
  body: { action: "push", lesson_id: newLesson.id, instructor_id: user.id },
});
```

Not awaited, no toast, no error surfaced — save flow and navigation are unchanged.

## Prerequisite worth flagging

Neither `google-calendar-auth` nor `google-calendar-sync` exists in `supabase/functions/`, and there's no migration for `google_calendar_connections` or a `lessons.google_event_id` column in `db/`. This plan builds only the three frontend files you named, so until those backend pieces are deployed the Connect button will error and the push call will no-op silently (by design). Say the word if you want a follow-up plan for the edge functions and migration.
