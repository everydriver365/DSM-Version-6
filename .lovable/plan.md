File changed: src/routes/pupils.new.tsx only.

Current inline implementation to remove
-------------------------------------
1. The `GOOGLE_MAPS_KEY` constant and the `loadGoogleMaps()` helper (lines 11-55).
2. The `addressInputRef` state (line 82) and the `useEffect` that binds Google Places `Autocomplete` to it (lines 84-135).
3. The two separate form inputs currently rendered at lines 297-321:

```tsx
<Input
  ref={addressInputRef}
  label="Home address"
  type="text"
  value={address}
  onChange={(e) => setAddress(e.target.value)}
  maxLength={255}
  autoComplete="off"
  placeholder="Start typing an address…"
/>
<div>
  <Input
    label="Postcode"
    type="text"
    value={postcode}
    onChange={(e) => setPostcode(e.target.value)}
    maxLength={10}
    autoComplete="postal-code"
  />
  {errors.postcode && (
    <p className="mt-1 text-[12px]" style={{ color: "#1877D6" }}>
      {errors.postcode}
    </p>
  )}
</div>
```

Replacement
-----------
Import the shared component at the top of the file:

```tsx
import { AddressLookup } from "@/components/dsm/AddressLookup";
```

Replace the removed inputs with a single `AddressLookup` instance, keeping the postcode validation error block in the same place:

```tsx
<AddressLookup
  initialPostcode={postcode}
  initialAddress={address}
  onAddressFound={({ postcode: pc, address: addr }) => {
    setPostcode(pc);
    setAddress(addr);
  }}
/>
{errors.postcode && (
  <p className="mt-1 text-[12px]" style={{ color: "#1877D6" }}>
    {errors.postcode}
  </p>
)}
```

What stays unchanged
--------------------
- The `UK_POSTCODE_RE` check and the `handleSave` validation for `postcode`.
- The form fields for name, phone, date of birth, lead source, lead source detail, and block booking.
- The `insert` payload and Supabase save logic.
- The `PageLayout` and navigation wiring.

Rationale
---------
`AddressLookup` already handles browser key resolution, loading/error/no-results states, postcode-first search, house-number prefix editing, and a “Search now” affordance. Replacing the duplicate inline wiring in `pupils.new.tsx` removes a second independently-drifting copy of the same Google Places logic and makes the Add-pupil address UX consistent with profile, settings, coverage areas, and the pupil edit sheet.