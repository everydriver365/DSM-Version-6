# Address lookup in Quick Add Pupil

## What changes

When you add a pupil from the home shortcut button:

1. Instead of typing the address and postcode by hand, you start typing a postcode (or street) and a dropdown shows matching addresses. Tap one and the address, town and postcode fill in automatically — the same lookup already used on the full pupil page.
2. You can still type an address manually if the lookup finds nothing.
3. Tapping "Open full pupil form" now carries across what you already typed (first name, last name, phone, address, postcode) instead of wiping it.

Nothing else in the quick add sheet changes, and saving a pupil works exactly as it does today.

## Notes

- Address suggestions come from Google, which is already connected. It lists real addresses and places rather than a guaranteed list of every house number at a postcode; a paid UK address service would be needed for that, which we can add later if you want it.

## Technical details

Files touched:

- `src/components/dsm/quickadd/QuickPupilSheet.tsx`
  - Replace the plain Address + Postcode `TextField`s with the existing `AddressLookup` component (`@/components/dsm/AddressLookup`), wiring `onAddressFound` to set `address`, `postcode`, and (new) `city`/lat/lng state.
  - Keep the existing UK postcode validation for manually typed values, and keep the current Supabase insert shape, adding `city`/`lat`/`lng` only if those columns already exist on `pupils` (verify before including).
  - Change the "Open full pupil form" handler so it stops calling `reset()` and instead passes the current field values to the parent.
- `src/routes/home.tsx` (only the `QuickPupilSheet` usage)
  - `onOpenFullForm` receives the draft values and navigates to `/pupils/new` with them as search params.
- `src/routes/pupils.new.tsx`
  - Read those search params on mount to prefill first name, last name, phone, address, postcode.

Verification: `bunx tsgo --noEmit`, plus a Playwright pass opening the quick add sheet to confirm the lookup dropdown renders and values carry into the full form.
