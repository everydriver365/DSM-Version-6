The inline address editor on the pupil profile page currently has two plain text fields (Address + Postcode) with no search feedback. The user wants both auto-suggest and a visible "Search now" action when a postcode is entered.

Plan
----
1. Replace the inline `AddressEditor` in `src/routes/pupils.$id.tsx` with the existing `AddressLookup` component.
   - This gives live address/postcode autocomplete, loading states, "no results", and error states.
2. Wire `AddressLookup.onAddressFound` to save the selected address, postcode, city, lat, and lng to Supabase and update the local `pupil` state.
3. Add a "Search now" affordance inside (or next to) the `AddressLookup` input.
   - Visible once the user has typed 3+ characters.
   - Re-triggers the prediction lookup and opens the suggestion dropdown.
   - Keeps the existing 300 ms debounced auto-suggest as the user types.
4. Remove the old `AddressEditor` component and the unused Google Places autocomplete binding `useEffect` that was attached to the inline address input.

Technical details
-----------------
- File changed: `src/routes/pupils.$id.tsx` only.
- Reuse `AddressLookup` from `src/components/dsm/AddressLookup.tsx` to keep UX consistent with the Edit pupil sheet.
- Supabase save path: `supabase.from("pupils").update({ address, postcode, city?, lat?, lng? }).eq("id", id)`.
- Keep the existing `setAddressEditing(false)` and `toast.success("Address updated")` behavior after a selection.
- Preserve the fallback that retries without optional columns (`town`, `lat`, `lng`) if the first update fails.

Out of scope
------------
- No changes to the Edit pupil sheet (`AddressLookup` is already used there).
- No schema changes.
- No changes to `AddressLookup.tsx` itself unless a small slot/button prop is needed to expose the "Search now" trigger.