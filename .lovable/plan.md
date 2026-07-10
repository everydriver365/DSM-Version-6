The schedule page is using a full-viewport fixed-position white background (`#FFFFFF`) that was missed when the rest of the app was unified to `#EEF2F7`. Its main scrollable area also has no horizontal padding, so the calendar and agenda rows sit flush to the screen edges, unlike the other pages which keep a 16px gutter.

Changes:
1. Update the outermost wrapper in `src/routes/schedule.tsx` from `background: "#FFFFFF"` to `background: "#EEF2F7"` so it matches the app-wide canvas.
2. Add `padding: "0 16px calc(80px + env(safe-area-inset-bottom))"` to the main scrollable container so the calendar strip and agenda list get the same 16px horizontal gutter used on pages like Messages and Payments.
3. Keep the calendar header sticky and the agenda scrollable; no functional changes to date selection, scrolling, swipe gestures, or lesson taps.
4. Verify the visual result on a mobile viewport (390px) to confirm the calendar and agenda rows now sit inset with the same gutter as other pages.

Only one file is affected: `src/routes/schedule.tsx`.