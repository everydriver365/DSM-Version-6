# Motorway symbol on the Live Track banner

## What changes

When the current road is classified as a Motorway, the road pill in the live tracking banner shows a UK motorway symbol on the left, with the motorway name/number to the right of it (for example the symbol followed by "M27 · Southampton").

Non-motorway roads are unchanged: A Road green, B Road white, Local road grey, "Unknown road" fallback.

## Details

- The symbol is drawn inline (no image asset, no new dependency): a small blue rounded badge in the UK motorway blue `#1877D6`, with a white bordered inner shape and the motorway glyph, sized to sit neatly at 16-18px inside the existing 34px-high pill row.
- It replaces nothing — the road type pill ("Motorway") stays, and the symbol is added at the start of the road number/name pill, with the text directly to its right, vertically centred, ~6px gap.
- Long road names keep the existing single-line truncation with ellipsis so the symbol never gets pushed out.

## Technical notes

- Only `src/routes/live.tsx`.
- Add a small `MotorwaySymbol` component (inline SVG) near the top of the file.
- Render it inside the road number/name pill (the `roadTag || roadLabel` branch, around lines 1571-1602) only when `roadType === "Motorway"`, wrapping the pill contents in a flex row.

If you had a specific symbol image in mind, tell me and I'll match it instead of the standard UK motorway badge.
