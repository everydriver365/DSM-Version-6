## Answer

Yes — postcode search already works on the pupil profile, no code changes needed.

### How to use it

1. Open the pupil's profile.
2. Tap the pencil (Edit pupil) icon in the top-right of the header.
3. Scroll to the **Address** field (the `AddressLookup` component).
4. Type a UK postcode (e.g. `SW1A 1AA`). After 3 characters, Google Places predictions appear in the dropdown.
5. Pick a suggestion — the component fills the full address, city, and postcode, and the sheet's Save writes `address` + `postcode` to the pupil.

### Why it works

`src/components/dsm/AddressLookup.tsx` calls Google's `AutocompleteService.getPlacePredictions` with `types: ["geocode"]` and `componentRestrictions: { country: "gb" }`. `"geocode"` accepts both street addresses and postal codes, so a postcode query returns matching results.

### Optional follow-up

If you want a **postcode-only search UX** (e.g. a dedicated "Find by postcode" button that just resolves the postcode centroid without a full address), that would be a small new feature — say the word and I'll plan it separately.
