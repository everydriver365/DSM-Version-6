# Restore TM badge visibility on login screen

## Current state
- `src/routes/login.tsx` still contains the `<span>TM</span>` badge at lines 246–251, positioned absolutely at `-top-0.5 -right-3` next to the EDP logo.
- The badge may be clipped, overlapped, or rendered outside the visible logo area in the current preview.

## Plan
1. Inspect the live `/login` preview to confirm whether the TM badge is actually missing or just visually clipped.
2. Adjust the badge container/positioning so the TM reliably appears at the top-right of the EDP logo without being cut off.
3. Verify the fix renders correctly in the preview.

## Scope
- Only touch `src/routes/login.tsx`.
- Do not modify `capacitor.config.ts` or any unrelated files.
