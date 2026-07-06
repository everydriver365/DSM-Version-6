## Why it still looks like nothing happens

The click is now working: the logs show `pupils fetched: 7`, `settings fetched: 0`, and `ranked result: 7`.

The problem is layout/scroll position: the ranked results are rendering far down the page, below a very long list of detected free slots. On mobile, after clicking the floating `Find pupils for 1 slot →` button, the page stays where it is, so the new results are off-screen and it appears that nothing happened.

## Plan

1. Update only `src/routes/gaps.tsx`.
2. Add a results anchor/ref near the ranked results block.
3. After `findPupils()` sets the ranked results and selected search slots, automatically scroll the user to the results section.
4. Make the scroll happen after React has rendered the results, so it reliably lands on `7 pupils ranked for 1 slot`.
5. Keep the existing ranking logic, pupil query, button labels, and results UI unchanged.

## Technical detail

- Use `useRef` alongside the existing React hooks.
- Attach the ref to the `{ranked !== null && (...)}` results container.
- In `findPupils`, after `setRanked(scored)` and `setSearchSlots(slotsToScore)`, call `requestAnimationFrame(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }))`.
- This fixes the perceived “nothing happens” issue without changing database logic or ranking behaviour.