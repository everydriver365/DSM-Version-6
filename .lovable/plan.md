## Goal

Replace the current 3-level competency scale on the Pupil Progress screen with the standard DVSA/ADI 5-level scale.

## Proposed 5-level scale

| Level | Key | Label | Color |
|---|---|---|---|
| 1 | `introduced` | Introduced | grey |
| 2 | `talk_through` | Under full talk-through | red |
| 3 | `prompted` | Prompted | amber |
| 4 | `seldom_prompted` | Seldom prompted | light green |
| 5 | `independent` | Independent | green |

Plus the existing `not_started` baseline (no pill) so untouched items still read as "not started".

## Changes — `src/routes/pupils.progress.$id.tsx` only

1. Replace the `Status` union with the six values above.
2. Replace the tap-cycle (`nextStatus`) with a small pill selector: tapping an item opens an inline row of 5 chips (1–5) and the chosen level becomes the item's status. Long-press / a "Reset" chip clears back to `not_started`.
3. Update progress maths: "competent" is no longer a single state. Display two numbers per section and overall:
   - **Independent** count (level 5) — drives the % progress bar.
   - **In progress** count (levels 1–4) — shown as a secondary stat.
4. Update colour swatches and the "done" check icon to reflect the 5-level palette.
5. Persist via the existing `pupil_progress` upsert — the DB column is free-form `text`, so no migration needed. Old values (`competent`, `in_progress`) are migrated on read: `competent` → `independent`, `in_progress` → `prompted`, `not_started` → unchanged.

## Out of scope

- No schema change. No edits to other routes. The EOL wizard's skill checklist (which writes `practised_at` only) is unaffected.

## Open question

Are the level names above what you want, or would you prefer the alternative DVSA wording ("Introduced / Talk-through / Prompted / Rare prompts / Independent")? I'll go with the table above unless you say otherwise.
