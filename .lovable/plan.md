## Why calendar events don't show on Today

In `src/routes/home.tsx` around line 5354, the timeline render filters `rows` to just lessons:

```ts
const lessonRows = rows.filter(r => r.kind === 'lesson');
if (lessonRows.length === 0) {
  // returns "Your day is wide open" card or "No lessons today"
  return ...;
}
// rows.map(...) with calendar branch never runs
```

So `rows.map` (which contains the `calendar` branch added earlier) only ever renders when there is at least one lesson. Your Today has `todayLessons: 0`, so the early return fires and the Google Calendar blocks in `rows` are dropped on the floor. Tomorrow has the same bug (also 0 lessons in your logs). It works on Schedule because Schedule uses a different render path.

## Fix (only `src/routes/home.tsx`)

Change the empty-state logic so calendar rows count as timeline content:

1. Compute `calendarRows = rows.filter(r => r.kind === 'calendar')` alongside `lessonRows`.
2. Change the early-return guard from `if (lessonRows.length === 0)` to `if (lessonRows.length === 0 && calendarRows.length === 0)` — only show "Your day is wide open" / "No lessons today" when there is nothing at all to display.
3. In the header meta line (currently `{lessonRows.length} lesson(s)`), when `lessonRows.length === 0` and calendar events exist, show `{calendarRows.length} calendar event(s)` instead, so the header isn't misleading.
4. Leave `rows.map` untouched — the existing `r.kind === 'calendar'` branch already renders the muted grey card correctly.

Out of scope: the free-minutes math for the "wide open" card (it already runs after this change only when there are truly no blocks either), and the Next tab (still won't have calendar rows by design).