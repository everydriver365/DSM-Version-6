# Home header wave design

## Goal
Add a subtle, layered wave background to the home page header, similar to the reference screenshot, while keeping the existing greeting, icon row, and safe-area layout intact.

## Scope
- Only the home page header (`HomeHeader` in `src/routes/home.tsx`).
- The shared `InstructorTopBar` used on other pages stays unchanged.
- Preserve current greeting, logo, icon buttons, notification badge, and safe-area padding.

## Approach
1. **Mock up 2–3 wave variations**
   - Variation A: A single soft wave arc in a slightly lighter navy, flowing from the right edge behind the greeting.
   - Variation B: Two stacked translucent wave layers in lighter blue/navy tones for added depth.
   - Variation C: A tighter, more prominent wave with a subtle gradient from navy to brand blue.
   - Deliver as rendered previews for selection.

2. **Select direction**
   - User picks one of the three variations (or requests tweaks).

3. **Implement in `src/routes/home.tsx`**
   - Keep `HomeHeader` as a fixed-position bar.
   - Add an absolutely positioned inline SVG wave background layer behind all header content (`zIndex` lower than text/icons).
   - Use CSS-safe values that respect dark navy `#0B1F3A` and brand blue `#1877D6` tones.
   - Avoid external images; use inline SVG for crisp rendering at all screen widths.
   - Ensure no text or buttons overlap the wave in a distracting way.

4. **Verify**
   - Check mobile preview for safe-area clearance and icon readability.
   - Confirm the wave does not interfere with icon taps or the notification badge.
