# ETA colour + late-message option on next lesson tile

The next lesson tile already shows an ETA and already turns red when the projected arrival is 2+ minutes late. This change makes the on-time state clearly green and surfaces a quick late-message action from the same row.

## What changes

- In the next lesson tile footer, change the ETA text colour:
  - Green (`#1E8E3E`) when `isLate` is false.
  - Red (`#CC2229`) when `isLate` is true (kept from current behaviour).
- When the ETA is red/late, add a small "Message" button/pill immediately after the ETA that opens the existing "How many minutes late?" sheet (`setLateOpen(true)`).
- Keep the existing red late-warning banner untouched; the new Message option is a faster alternative in the footer row.
- The green/red state and Message button use the already-computed `isLate`, `etaLabel`, `upcoming`, and `lateOpen` state — no new queries or server functions.

## Technical notes

- Single file: `src/routes/home.tsx`.
- The ETA span lives in the footer block around line 6341; change its `color` ternary from navy to green.
- Add the "Message" action inline with the ETA when `isLate && etaLabel`.
- Reuse the existing `<Dialog open={lateOpen} ...>` late sheet and its SMS/chat send logic; only the trigger is new.
