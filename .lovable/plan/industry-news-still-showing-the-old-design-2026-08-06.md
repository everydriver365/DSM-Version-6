# Industry news still showing the old design

## What I verified

I read the live DOM in your preview. The Industry news section is present and already rendering the Direction B layout: a `See all` link, image header, blue uppercase source pill (`DVSA DESPATCH`), bold navy two-line headline, and a clock/calendar meta row (`5 min · 9 Jul`). Real articles are loading from `news_articles`.

So the new code is deployed and working — the view you're looking at is serving an older cached bundle. Two preview viewers were connected when I checked and only one responded, which fits a stale tab or a cached native (Despia) webview.

## Steps

1. Confirm which surface shows the old design: the Lovable preview tab, a separate browser tab, or the installed native app.
2. Force a fresh load on that surface:
   - Browser: hard refresh (Cmd/Ctrl + Shift + R) with only one preview tab open.
   - Native app: fully close and reopen, or clear the app's webview cache.
3. If the old design survives a hard refresh, capture a screenshot of what you see so I can compare it against the rendered markup and find whether a second, older news block exists somewhere else in the app (for example on a different route reachable from home).
4. Only if step 3 shows a genuine duplicate/legacy block: locate and remove it. No code change is planned until that is confirmed — nothing in `home.tsx` currently renders the old card style.

## Technical notes

- Section lives in `src/routes/home.tsx` (~lines 7753–8000), gated by nothing (`{true && ...}`) so it always renders, with an empty-state fallback card.
- Fetch runs in a `useEffect` on `userId`, selecting the 3 latest non-hidden rows from `news_articles`, and logs `[home] news_articles fetched: N` to the console.
- No files need editing to fix a stale cache; publishing/refreshing is sufficient.
