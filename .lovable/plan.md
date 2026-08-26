# Fix iOS app icon badge consistency

## Current state
- `src/hooks/useUnreadCount.ts` already queries `instructor_notifications` and calls `Badge.set({ count: unreadCount })`.
- `src/routes/__root.tsx` already imports and calls `useUnreadCount()` once at the top of `RootComponent`, so the badge logic runs on every authenticated screen.
- The same hook is still mounted redundantly in five page components, which causes duplicate Supabase realtime subscriptions and duplicate `Badge.set()` calls:
  - `src/routes/pupils.index.tsx`
  - `src/routes/enquiries.tsx`
  - `src/routes/courses.index.tsx`
  - `src/routes/schedule.tsx`
  - `src/routes/more.tsx`

## Changes
1. Add an optional `{ skipBadge?: boolean }` argument to `useUnreadCount` so pages can read the unread count for UI without also setting the native badge.
2. Convert page-level calls that need the count for UI to `useUnreadCount({ skipBadge: true })`:
   - `src/routes/pupils.index.tsx`
   - `src/routes/schedule.tsx`
   - `src/routes/more.tsx`
3. Remove the unused page-level calls (and their imports) from:
   - `src/routes/enquiries.tsx`
   - `src/routes/courses.index.tsx`
4. Leave `src/routes/__root.tsx` untouched: it already owns the single root-level badge sync.
5. Do not change `send-push`, OneSignal payload, database logic, or `capacitor.config.ts`.

## Verification
- Run project typecheck/build validation.
- Search the project and confirm exactly one root-level `useUnreadCount()` invocation remains and only it triggers `Badge.set()`.
