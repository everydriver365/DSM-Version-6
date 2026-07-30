# Google Calendar: connect account + push lessons out

Three files change: `src/routes/calendarsync.tsx`, `src/routes/lessons.new.tsx`, `src/components/lessons/AddLessonSheet.tsx`. Nothing else.

## Current state (verified by reading the files)

- **calendarsync.tsx** (800 lines): one continuous page — copyable DSM ICS feed URL, a "paste your Google ICS URL" input, a "Sync now" button that calls the `sync-external-calendar` edge function, last-synced/error status, and a "How to" accordion. All of it is inbound only (Google → DSM). There is no outbound connection UI.
- **lessons.new.tsx**: `handleSave()` inserts the lesson with `supabase.from("lessons").insert({...})` and does **not** request the new row's id. Recurring occurrences are inserted through a raw REST `POST /rest/v1/lessons` with `Prefer: return=minimal`, so no ids come back. It also defines and calls `syncToGoogleCalendar()`, which just re-runs the inbound sync and opens google.com/calendar in a tab — misleading, gets removed along with the toast action that triggers it.
- **AddLessonSheet.tsx**: same save logic; the single lesson insert already ends with `.select("id")`, and the recurring batch also uses `Prefer: return=minimal`.

## Section 1 — calendarsync.tsx

Keep every existing ICS behaviour untouched, just group it under a header **"Google events → DSM"**, then a divider, then the new section.

**"DSM lessons → Google"** — on mount, read `google_calendar_connections` for the signed-in instructor (`connected_at`, `last_synced_at`, `maybeSingle`). Also read the URL query on mount:

- `?connected=google` → success toast
- `?error=google_denied` / `?error=token_failed` → error toast

then strip the param from the URL.

Not connected: full-width blue (#1877D6) "Connect Google Calendar" button that invokes the `google-calendar-auth` edge function with the user's bearer token and redirects to the returned `url`.

Connected: green check + "Connected to Google Calendar", muted "Connected on {date}" and "Last synced: {date or Never}", plus a red-outline "Disconnect" that deletes the connection row, nulls `google_event_id` on that instructor's lessons from today onward, toasts success, and clears local state.

## Section 2 — push on save

In both `lessons.new.tsx` and `AddLessonSheet.tsx`, after a lesson row is saved successfully, fire and forget:

```ts
void supabase.functions.invoke("google-calendar-sync", {
  body: { action: "push", lesson_id, instructor_id: userId },
});
```

Never awaited, never surfaced as an error.

To have an id to push, the single insert in `lessons.new.tsx` gains `.select("id").single()`, and the recurring batch POST in both files switches its `Prefer` header to `return=representation` so the returned rows' ids can each be pushed. Existing insert payloads, pricing, prepaid and series logic stay exactly as they are.

`syncToGoogleCalendar()` and the toast action that calls it are deleted from `lessons.new.tsx`; the toast becomes a plain "Lesson added".

## Dependencies outside these files

This is the frontend half. It assumes the backend pieces already exist (or will be added separately): the `google_calendar_connections` table, a `google_event_id` column on `lessons`, and the `google-calendar-auth` / `google-calendar-sync` edge functions. Until those exist, connect will error and the push calls will silently no-op — which is exactly the fire-and-forget behaviour requested.
