# Fix text/message icon in next lesson tile

## Goal
Make the text/message icon in the Next lesson card on the home screen open the existing `SendMessageSheet` so the instructor can actually message the pupil, instead of navigating to the pupil profile.

## Current state
- `src/routes/home.tsx` renders a Next lesson card with two action buttons: phone (`tel:`) and message (`navigate` to `/pupils/$id`).
- The message icon currently opens the pupil's profile page, not a message composer.
- `src/routes/home.tsx` already imports `SendMessageSheet` from `@/components/messages/SendMessageSheet` and uses it elsewhere in the file, so the component is available.

## Plan
1. **Inspect existing usage** of `SendMessageSheet` in `src/routes/home.tsx` to confirm its props (recipient, open state, on close, etc.).
2. **Add state** to manage the message sheet open/closed state, scoped to the next lesson tile.
3. **Replace the message icon `onClick`** to open the `SendMessageSheet` for the upcoming pupil instead of navigating to the profile.
4. **Ensure the sheet is rendered** in the correct place in the component tree (likely near the bottom of the home page alongside other sheets).
5. **Verify** with a build check and preview that the icon opens the sheet and no runtime errors occur.

## Scope
- Only touch `src/routes/home.tsx`.
- No server-side changes.
- No visual redesign beyond the interaction change.
