# Fix obscured header in iOS/Xcode preview

## Problem
When the app is viewed in Xcode (iOS Simulator / preview), the fixed top bar on the "My Slots" screen overlaps the iOS status bar. The system time/text in the status bar covers the header title.

## Current state
- `src/routes/__root.tsx` already has `viewport-fit=cover` in the viewport meta tag.
- `src/components/dsm/InstructorTopBar.tsx` uses `padding-top: calc(env(safe-area-inset-top, 0px) + 12px)`.
- `src/components/dsm/PageHeader.tsx` uses the same `env(safe-area-inset-top, 0px)` fallback pattern.
- Routes that use `InstructorTopBar` add a spacer with `height: calc(60px + env(safe-area-inset-top, 0px))`.
- The `env(safe-area-inset-top, 0px)` fallback is `0px`, so when the webview/preview does not expose the safe-area inset (e.g., Xcode preview or some WKWebView setups), the header content sits only 12px from the top and is obscured by the status bar.

## Proposed change
1. Increase the minimum safe-area fallback in the two shared header components so content always clears a typical status bar height even when `env()` returns `0px`.
2. Export a shared spacer height from `InstructorTopBar.tsx` and update routes that sit below the bar so the spacer matches the new header height and content is not hidden.

## Implementation
- In `src/components/dsm/InstructorTopBar.tsx`:
  - Change `padding-top` from `calc(env(safe-area-inset-top, 0px) + 12px)` to `calc(max(env(safe-area-inset-top, 0px), 24px) + 12px)`.
  - Export `export const TOP_BAR_SPACER = "calc(max(env(safe-area-inset-top, 0px), 24px) + 60px)";` so routes can use a consistent spacer.
- In `src/components/dsm/PageHeader.tsx`:
  - Apply the same `padding-top` change.
- In `src/routes/gaps.tsx` and other routes that use the `60px + env(...)` spacer:
  - Replace the hardcoded spacer with the exported `TOP_BAR_SPACER` constant.
- Verify the header no longer overlaps the status bar on the preview.

## Verification
- Check the preview of `/gaps` (My Slots) to confirm the title is fully visible below the iOS status bar.
- Check a few other pages that use `InstructorTopBar` or `PageHeader` for consistent spacing.