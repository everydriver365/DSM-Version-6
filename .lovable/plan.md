Make the "Tap for details" toggle its own white card below the Next lesson card, 20% narrower than the lesson card (277px vs 346px at mobile width), flush against it with no gap. The expanded details panel stays the full width of the lesson card.

All changes in `src/routes/home.tsx`:

1. Move the "Tap for details" button (currently the last child inside the lesson card, around line 4724) out of the lesson card so it becomes a sibling directly beneath it.

2. Wrap it in its own white card:
   - `width: 'calc((100% - 32px) * 0.8)'` — the same 80% treatment used by the "Next lesson / Full schedule" header card, giving 277px against the lesson card's 346px.
   - `margin: '0 auto'` so it is centred under the lesson card.
   - `background: '#FFFFFF'`, `boxShadow: '0 1px 3px rgba(0,0,0,0.06)'`.
   - `borderRadius: '0 0 16px 16px'` so it reads as a rounded cap hanging below the card.
   - Keep the existing centred row layout, 14px bold blue label, and chevron icon.

3. Remove the gap between the lesson card and the new toggle card: change the lesson card's margin from `0 16px 16px` to `0 16px 0`, and drop the toggle button's own `borderTop` (the card boundary now provides the separation).

4. Keep the expanded panel full width: `HeroExpandedPanel` moves below the toggle card as a sibling with `margin: '0 16px 16px'`, so it matches the lesson card's width rather than the narrower toggle. Its top corners become square and bottom corners stay rounded.

5. Preserve all behaviour: `setHeroExpanded` toggling, the label swapping between "Tap for details" and "Hide details", the chevron direction, and every prop passed to `HeroExpandedPanel`.

Technical note: the "no upcoming lessons" branch keeps its current rendering — the toggle card and expanded panel only render when there is an upcoming lesson.