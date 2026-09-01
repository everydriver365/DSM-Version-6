# Fix the obscured MEDIA title

## Confirmed cause

The MEDIA header currently uses `env(safe-area-inset-top)` directly. In the native iOS wrapper, the app already publishes a measured/fallback inset as `--dsm-safe-top` because some TestFlight/WebView builds report the environment inset as zero. The MEDIA header does not use that native-safe value, so its 44px selector clearance can begin too high and the fixed TODAY | PRO | MEDIA selector overlaps the title.

## Change

- Update only `src/components/media/MediaHub.tsx`.
- Keep the existing 44px clearance for the selector, but calculate it after the app’s native-safe inset:
  ```tsx
  paddingTop: "calc(var(--dsm-safe-top, env(safe-area-inset-top, 0px)) + 44px)"
  ```
- Do not alter the header design, tabs, content, queries, navigation, or swipe behavior.
- Do not touch `capacitor.config.ts` or other pages.

## Verification

- Open HOME, switch to MEDIA, and confirm the MEDIA title sits fully below the TODAY | PRO | MEDIA selector.
- Confirm NEWS | PRO TV | PODCASTS remains directly below the title and the content still scrolls normally.
