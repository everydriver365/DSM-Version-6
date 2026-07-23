## Problem

On `/home`, the Daily catch-up sheet says "2 things need your attention" and clicking **Got it** (or the backdrop / ✕) does nothing visible. The sheet immediately reopens.

## Root cause

In `src/components/dsm/SheetQueue.tsx`, the decision effect (lines 134–153) re-runs whenever `active` changes. Its condition to open the catch-up sheet is:

```
whatsNewResolved is "dismissed" | "none"
  && catchUpReady
  && catchUpRows.length > 0
```

When the user clicks **Got it**, `onDismiss` calls `setActive("none")`. All three conditions above are still true, so the effect immediately sets `active` back to `"catchUp"`. The sheet never actually closes — it looks like the button is dead.

## Fix

Add a one-shot "already handled this mount" guard for the catch-up sheet so dismissing it is terminal for the session.

Only touch `src/components/dsm/SheetQueue.tsx`:

1. Add state: `const [catchUpHandled, setCatchUpHandled] = useState(false);`
2. In the decision effect, add `&& !catchUpHandled` to the catch-up open condition, and include `catchUpHandled` in the dependency array.
3. In the `catchUp` branch, set `catchUpHandled` to `true` in both `onDismiss` and `onRowClick` before/with `setActive("none")`.

This preserves the current "show once per day" behaviour (still gated by the `dsm.dailyCatchUp.lastShown.<uid>` localStorage key written when rows are built) and additionally prevents the same-session re-open loop.

No other files change. No behavioural change to What's New, navigation, or the row queries.
