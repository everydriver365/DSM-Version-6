## Plan

Fix the pickup address verification so editing the pickup field reliably verifies and saves the address.

## What I found

- The pickup verification UI is in `src/routes/home.tsx` inside `HeroExpandedPanel`.
- The code calls the server function `verifyAddress` on input blur, then saves `lessons.pickup_location`.
- The visible screenshot shows the field can display “Verified via Google Maps”, but the current flow is fragile because it depends on `onBlur`; tapping the pencil/input and then interacting elsewhere can close/save/reset state in ways that make verification feel broken.
- The server geocoding wrapper exists in `src/lib/geocode.functions.ts` and `src/lib/geocode.server.ts` and returns only `verified`/`bad`, not a clear user-facing failure reason.

## Changes to make

1. **Keep scope tight**
   - Touch only the pickup verification code path needed for this fix.
   - Primary file: `src/routes/home.tsx`.
   - Only touch `src/lib/geocode.server.ts` / `src/lib/geocode.functions.ts` if the runtime logs show the server response itself is the cause.

2. **Make edit mode explicit**
   - Keep the read-only pickup row with the pencil icon.
   - When editing, show the input plus a small explicit confirm/save icon button.
   - Pressing Enter or tapping the confirm button will run verification and save.
   - Blur will no longer be the only reliable trigger.

3. **Prevent premature reset while checking**
   - Do not close edit mode until the verification request finishes.
   - Keep the “Checking…” state visible during the request.
   - Preserve the success/failure state after Supabase refetches the same lesson.

4. **Improve address verification input**
   - Continue using the typed pickup plus pupil postcode for Google context.
   - If Google returns a formatted address, optionally update the displayed value to the verified formatted address only if that does not disrupt the user’s manually typed house/name entry.

5. **Improve failure feedback**
   - If verification fails because of missing connector credentials, gateway denial, or zero results, surface the right state in the UI instead of silently returning “Not yet verified”.
   - Keep the existing green/amber/neutral visual style.

6. **Verify**
   - Reproduce on `/home` mobile viewport:
     - Tap pencil.
     - Enter/change pickup address.
     - Tap confirm or press Enter.
     - Confirm “Checking…” appears, then green/amber status appears and remains after save/refetch.

## Technical notes

- No database schema changes.
- No changes to payment logic, lesson management sheets, or unrelated home sections.
- No Lovable Cloud work; this uses the existing Supabase/client and server function path already in the project.