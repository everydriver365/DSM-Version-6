# Header spacing, the empty band at the top of pages, and Nearest improvements

## Already done this turn (monitoring findings 1 and 2)

- **Duplicate overdue-payment alerts** — the reminders job now writes the in-app notification with "ignore duplicates", and when no new row is created it skips the push. That ends the 96-a-day 409 errors and keeps the badge count and push alerts in sync.
- **Microphone listening on every screen** — "Hey ED" background listening is now opt-in. It is off unless the instructor turns it on with a new toggle in "Hey ED" Settings; the mic no longer opens on app load.

## 1. The empty band at the top of pages (your screenshot)

Confirmed cause: pages such as Lesson Series, Diary, Bookings and Import Data render `DSMTopSheet`, which is a **full-screen fixed overlay with its own navy header**. The global app header in `__root.tsx` is drawn on top of it, so the sheet's own header is hidden and all you see is a strip of navy plus the sheet's rounded top edge and its 20px top padding — the light empty band.

Fix: when a route renders `DSMTopSheet`, do not stack two headers. The sheet starts below the global header instead of at `inset: 0`, and its own duplicate title header is not painted behind the global one.

## 2. Content hidden behind the app header (monitoring finding 3)

Confirmed in code. The global header uses `marginTop: calc(-1 * env(safe-area-inset-top))` while the content wrapper no longer adds any compensating padding, so on notched phones the page content starts one status-bar height too high and sits under the navy bar. `PageHeader` repeats the same negative margin, pulling those pages up twice.

Fix: remove the negative margin from both headers and keep only the safe-area top padding. The webview already paints edge-to-edge from y=0, so the navy background still extends behind the status bar, and content lands directly under the header with nothing hidden.

## 3. Nearest page: "Use my location" button

Add a prominent full-width primary button above the results on `/nearest` that requests device geolocation, shows a "Locating…" state, stores the returned coordinates, and re-runs the current search from that point. If permission is denied or unavailable, show a short inline message explaining how to enable location, keeping the existing search behaviour intact.

## 4. Nearest page: distance radius filter (miles)

Add a pill row — 1, 5, 10, 20 miles — under the search controls. The selected radius is converted to metres and passed to the Places search, and results beyond the radius are filtered out. Each result row shows its distance in miles (e.g. "2.3 mi"). Default 5 miles.

## Technical notes

- Header fix: `src/routes/__root.tsx` (global `Header` style plus the content wrapper), `src/components/dsm/PageHeader.tsx`.
- Top-sheet fix: `src/components/dsm/DSMTopSheet.tsx` only, so every page using it is corrected in one place.
- Nearest: `src/routes/nearest.tsx` for UI/state, `src/lib/nearest.server.ts` to accept a radius (metres) and the user's coordinates; distances computed with the haversine formula and rendered in miles.
