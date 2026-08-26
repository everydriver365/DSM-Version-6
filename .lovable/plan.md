# Fix: Schedule and Pupils pages fail to load

## Cause (confirmed)

Loading `/schedule` or `/pupils` throws and the whole app falls back to the root
"This page didn't load" error screen. The browser error is:

```text
Error: cannot add `postgres_changes` callbacks for realtime:unread-count after `subscribe()`
  at src/hooks/useUnreadCount.ts:35
```

`useUnreadCount` always opens a realtime channel with the fixed name
`"unread-count"` (line 56). The root route calls the hook once
(`src/routes/__root.tsx:534`), and Schedule (`schedule.tsx:769`), Pupils
(`pupils.index.tsx:158`) and More (`more.tsx:85`) each call it again. Supabase
returns the *same* channel object for a duplicate name, and adding a
`postgres_changes` listener to an already-subscribed channel throws — crashing
those pages. Home and Messages don't call the hook, which is why only these
pages break.

## The fix

In `src/hooks/useUnreadCount.ts` only:

1. Give every hook instance its own channel name, e.g.
   `supabase.channel("unread-count-" + crypto.randomUUID())` (or a module-level
   incrementing counter), so listeners are never attached to a subscribed
   channel.
2. Wrap the channel setup in a try/catch that logs a warning, so a realtime
   failure can never take a page down again; the initial fetch plus the
   focus/visibility/`dsm-notifications-updated` refresh listeners already keep
   the count current.

## Verification

Load `/schedule` and `/pupils` headlessly and confirm both render their content
with no `postgres_changes` error and no root error screen.

## Scope

`src/hooks/useUnreadCount.ts` only. No changes to badge logic, notification
payloads, page layouts, or data queries.
