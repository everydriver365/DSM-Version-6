# Snap the live tracking trail to roads

## What's happening now

The red trail on the Live Tracking map is drawn straight from raw GPS fixes. Each new fix is pushed onto the Google Maps polyline as-is, so the line cuts diagonally across car parks and buildings instead of following Tollbar Way. Nothing snaps it to the road network today — the only road logic left in the page is a reverse-geocode lookup used for the road name and speed-limit sign (a snap-based lookup that used to exist there was swapped out on 5 Aug, but it never affected the drawn line).

## What will change

The drawn trail gets snapped to the road network live, in batches, while tracking:

- Raw GPS points keep being recorded and saved exactly as they are today — distance, speed, overspeed and the saved route data are untouched.
- A separate "display path" is built by sending each batch of new points to TomTom's snap-to-roads service and drawing the road-following geometry it returns back.
- Batching: once about 10 new points have accumulated (or after a short idle gap so the line doesn't stall when stopped at lights), one request is sent with a small overlap onto the previous batch, so consecutive batches join up cleanly with no visible seam.
- The polyline is redrawn from snapped geometry for the confirmed part of the drive, with the last few unsnapped points appended raw so the line always reaches the current position and never lags behind the blue arrow.
- If a snap request fails, times out, or returns nothing usable, that batch falls back to the raw points — the trail degrades to today's behaviour rather than breaking or gapping.

## Not changing

Map view, blue heading marker, bottom tracking stats panel, speed limit sign, overspeed alerts, distance/duration maths, saved route coordinates, and the header.

## Technical notes

- File: `src/routes/live.tsx` only.
- New refs: a pending-raw-points buffer, a snapped-path array, and an in-flight guard so only one snap request runs at a time.
- Uses TomTom `snapToRoads/1` with the existing `TOMTOM_API_KEY` already in the file, requesting the matched route geometry; points are sent in `lng,lat` order, capped per request.
- Flush trigger lives in the existing GPS-fix handler; the polyline is updated with `setPath(snapped.concat(pendingRaw))` instead of `path.push(...)`.
- Snapping is display-only: `coordsRef` and everything written to the database stay raw.
