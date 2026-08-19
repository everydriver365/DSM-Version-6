# Change FILL THIS GAP pill to light green

## What
In `src/routes/schedule.tsx`, the `FILL THIS GAP` pill (currently dark navy with white text) should be light green with dark green text.

## How
1. Open the gap-row pill at around line 1746.
2. Change the inline style:
   - `background` from `"#0B1F3A"` to `"#DCFCE7"`
   - `color` from `"#FFFFFF"` to `"#166534"`

No other files are touched.

## Verification
- Load the Schedule page and confirm the pill is light green with dark green text.
