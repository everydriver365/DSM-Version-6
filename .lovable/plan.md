## What I found

The geocoding backend is fine — I called the Google Maps geocoding gateway directly with the project's connected key and it returned a valid `OK` result for a pupil address. So the lookup itself works.

The problem is in the panel's UI state in `src/routes/home.tsx` (`HeroExpandedPanel`):

1. After you finish editing, `verifyAndSavePickup` sets the status (`ok` / `bad`) and then saves to `lessons.pickup_location`. The save triggers a data refetch, the `lesson.pickup_location` prop changes, and the effect at line 6964 immediately runs `setPickupState('idle')` — wiping the just-computed result. You end up back at "Not yet verified", so the check looks like it never ran.
2. The status line only ever appears for a split second, and there's no visible "Checking…" feedback while the network call is in flight.
3. The address is sent to Google exactly as typed, with no postcode context, so short/partial entries (e.g. `34`) fail even when the pupil's postcode is known.

## The fix (only `src/routes/home.tsx`)

- Make the reset effect value-aware: only reset `pickupState`/`pickupValue` when the incoming lesson is actually a different lesson (`lesson.id` change) or when the incoming address genuinely differs from what's currently shown. A refetch echoing back the value we just saved must not clear the verified state.
- Track the verified result against the address string it was computed for, so the status line stays visible in the read-only row after editing ends, and only clears when the text actually changes.
- Show the `checking` state properly while the request is in flight (spinner/grey "Checking…"), then green verified / amber couldn't-verify.
- Append the pupil's postcode to the query sent for verification (display and saved value stay exactly what the user typed) so house-number-only entries resolve.
- Keep verification and saving independent: a "couldn't verify" result still saves the typed address, as it does today.

No changes to what3words, payment logic, the map, or any other file.
