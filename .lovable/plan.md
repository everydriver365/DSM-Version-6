# Match the chat screen's header room to the messages list

## What the two screenshots show

Both screens share the same app header (menu / EDP logo / search / bell). On the messages list the white content starts immediately under it. On an instructor chat there is a second, taller navy area between the app header and the "Richard Chapman" row — roughly 240px of empty navy — before any message content.

## What the code does today (verified)

- `src/routes/__root.tsx`: the app header is `position: sticky; top: 0` with `padding-top: calc(env(safe-area-inset-top) + 16px)`, and publishes its measured height as `--dsm-header-h`. The content wrapper uses `min-height: calc(100dvh - var(--dsm-header-h, 58px))`.
- `src/routes/messages.$pupilId.tsx`: the page sets its own pixel height in a `useLayoutEffect` (`window.innerHeight - element top - parent padding-bottom`) and renders a navy header block (56px row, `background: navy`) as the first child, in flow.
- Nothing in the chat file draws navy above that 56px row, so the extra band is either the app header rendering much taller on this route, or the chat header block being stretched/offset by the fixed-height column — this has not been pinned down on a real render, so the fix is not guessed here.

## Plan

1. Reproduce both screens headlessly at 390px width, signed in, with a simulated iOS safe-area inset, and measure for each: the app header's rect and computed padding, the first child rect of the page wrapper, the chat header block's rect and height, the wrapper's computed min-height, and which element paints the navy in the gap. Compare the list route against the thread route so the difference is explicit.
2. Fix the single cause found, smallest edit:
   - if the app header's safe-area padding is being applied on top of a webview that is already inset, stop double-counting it (single source of top inset);
   - if the chat header block is stretching or being offset inside the fixed-height column, put it back to its natural 56px in flow;
   - if the measured `pageHeight` is stale or double-counts the header, correct or drop the measurement in favour of a flow-based `flex: 1` column.
3. Re-measure after the change: the chat header must start immediately under the app header, with the same header room as the messages list, at 390px, 430px and desktop, top of thread and scrolled, with and without a safe-area inset.

## Files likely touched

- `src/routes/messages.$pupilId.tsx`
- `src/routes/__root.tsx` (only if measurement shows the extra room originates in the app header)

No change to messaging, realtime, search, jump-to-latest or auto-scroll behaviour. `capacitor.config.ts` is not touched.
