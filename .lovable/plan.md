# Plan: Highway-code alert icons

## Goal
Replace the generic Lucide icons on the community alert cards with UK Highway Code-style iconography so the visual signal matches road signage drivers already recognise.

## What I will change
- Only the icon rendering for each alert type in `src/routes/community.tsx`.
- Add a small set of inline SVG icons styled as UK road signs (red-bordered warning triangles for roadworks/closure/traffic/hazard delays; blue square for examiner tips; neutral symbol for other).
- Keep everything else the same: card layout, typography, label colours, confirmation buttons, comment badges, and the sheet behaviour.

## Icon mapping
```text
roadworks        → red triangle with a roadworks/digger symbol
road_closure     → red triangle with a closed-road/barrier symbol
heavy_traffic    → red triangle with queue/vehicle bars
hazard           → red triangle with an exclamation mark
test_centre_busy → red triangle with an exclamation mark
test_centre_delay→ red triangle with a clock/exclamation mark
examiner_tip     → blue square with an information / graduation-cap symbol
other            → grey circle or triangle with a generic warning symbol
```

## Sizing
The current icon tile is 28 × 28 px. I will replace it with a 28–32 px highway-sign-shaped SVG so it fits the existing card without reflowing the layout. I will add a subtle 1 px shadow to give the sign a slight physical presence, matching the "tactical skeuomorphism" direction you chose.

## Out of scope
- No new alert types.
- No changes to card shape, spacing, text, confirmation button, or comment badge.
- No backend changes.