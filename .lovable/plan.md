Fix the "Next lesson / Full schedule" header so it becomes a visibly smaller box above the lesson card, rather than text indented inside the same card.

Current state
- The header div is nested inside the main white lesson card at `src/routes/home.tsx` around line 4415.
- Its `width: 80%` is relative to that card, so the white box (the card) stays full width and only the text/buttons are narrower.
- The user wants the header box to be 20% less wide than the lesson card below it.

Plan
1. Restructure the Next Lesson section in `src/routes/home.tsx`:
   - Render the "Next lesson / Full schedule" header as a separate white card/box **above** the main lesson card.
   - Remove the header from inside the existing lesson card container.
2. Size the new header card to 80% width and center it (`margin: 0 auto`).
3. Keep the lesson card at its current full width (with its existing 16px side margins).
4. Preserve all existing functionality: dot indicator, "Full schedule" navigation link, padding, and fonts.
5. Verify the header card now renders visibly narrower than the lesson card in the preview.

No other files are touched.