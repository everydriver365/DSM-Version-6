# Remove the large blue area at the top of the chat page

## What the screenshot shows

On a message thread there is a tall navy block between the app header row (menu / EDP logo / search / bell) and the "Richard Chapman" chat header. It is roughly a header's height of empty navy.

## What the code does today (verified)

- `src/routes/__root.tsx`: the app header is `position: sticky; top: 0` with `padding-top: env(safe-area-inset-top) + 16px` and `padding-bottom: 10px`, so it occupies its own height in flow. The content wrapper uses `min-height: calc(100dvh - env(safe-area-inset-top) - 58px)` — a hard-coded 58px estimate of the header height.
- `src/routes/messages.$pupilId.tsx`: the page measures its own height in a `useLayoutEffect` (`window.innerHeight - element top - parent padding-bottom`) and renders its navy chat header in flow at the top of that fixed-height column.

The empty navy is not yet pinned to one of these with a measurement on the running app, so guessing between them (hard-coded 58px vs. the measured height being taken before fonts/safe-area settle, vs. the document scrolling and the sticky header detaching) would risk another wrong fix.

## Plan

1. Reproduce the thread screen headlessly at 390px width, signed in, and measure: the app header's rect, the chat header's rect, the page wrapper's computed padding/min-height, the document scroll position, and which element paints the navy in the gap.
2. Fix the single cause found, in the smallest edit:
   - if the hard-coded `58px` disagrees with the real header height, stop hard-coding it and let the wrapper size from flow;
   - if the chat page's measured height is stale or double-counts, correct the measurement (or drop it in favour of a flow-based `flex: 1` column);
   - if the document is scrolling behind the sticky header, remove the extra height that causes the overflow.
3. Re-measure after the change: the chat header must start immediately under the app header, with no navy gap, at 390px, 430px and desktop, both at the top of the thread and scrolled.

## Files likely touched

- `src/routes/messages.$pupilId.tsx`
- `src/routes/__root.tsx` (only if measurement shows the gap originates there)

No change to messaging, realtime, search, jump-to-latest or auto-scroll behaviour.
