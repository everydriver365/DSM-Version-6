# Navigate to a Nearest result

Add a "Navigate" action to each result on the Nearest page so you can jump straight into turn-by-turn directions.

## What changes

- Each result card gets a small navy "Navigate" button on the right-hand side, next to the distance.
- Tapping the card itself still centres the map on that place (unchanged).
- Tapping Navigate opens directions from your current location to that place in the device's maps app:
  - On iOS (Capacitor/Safari): Apple Maps directions link.
  - Elsewhere: Google Maps directions link.
- Falls back to the place's coordinates, with the place name included so the destination is labelled correctly.

## Technical notes

- File touched: `src/routes/nearest.tsx` only.
- Add a `navigateTo(r: Result)` helper that builds:
  - Apple: `https://maps.apple.com/?daddr=<lat>,<lng>&q=<name>&dirflg=d`
  - Google: `https://www.google.com/maps/dir/?api=1&destination=<lat>,<lng>&travelmode=driving`
  - Platform check via `/iPad|iPhone|iPod/.test(navigator.userAgent)`.
- Open via the existing `openUrl` helper from `@/lib/openUrl` (`_system` target) so it works in the native build.
- Button uses existing tokens (navy `#0B2341`, 8px radius, Poppins, 13px/600) and `stopPropagation` so it does not trigger the card's centre-on-map action.
- No changes to data fetching, server functions, or the Google Places/OpenChargeMap logic.
