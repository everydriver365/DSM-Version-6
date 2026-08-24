# Lighter blue sign-in page

The sign-in page currently sits on a flat, very dark navy (`#0B1F3A`). We'll lift it with a richer blue treatment while keeping the premium iOS glass look and all existing functionality.

## What changes

**File: `src/routes/login.tsx` only** (background layer; no logic touched).

1. **Background** — replace the flat `bg-[#0B1F3A]` with a vertical gradient:
   - Top: `#0B1F3A` (brand navy, keeps continuity with the app)
   - Middle: `#16386B` (lifted steel navy)
   - Bottom: `#2A5C9E` (lighter Checkfront-family blue)
2. **Decorative glows** — two soft, non-interactive radial glows layered under the content:
   - Brand blue (`#1877D6`, ~14% opacity) bleeding in from the top-right
   - Lighter blue (`#3E8FE0`, ~10% opacity) rising from the bottom-left
3. **Keep everything else identical** — glass card, Face ID row, inputs, sign-in button, footer, logo, all Supabase/WebAuthn logic. The dark translucent inputs and white text stay legible because the lightest point of the gradient (`#2A5C9E`) still has strong contrast against white text and `rgba(255,255,255,0.06)` input fills.

## Verification

- Screenshot the login page at mobile viewport before/after.
- Check computed contrast of input text and button against the lightest gradient stop.
- Confirm no console errors and Face ID row still renders.
