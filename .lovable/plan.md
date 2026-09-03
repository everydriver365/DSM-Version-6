# PRO Teaser header redesign

Redesign only the introduction area at the top of `src/routes/pro-teaser.tsx` to match the supplied reference image. No other files or sections are touched.

## Changes in `src/routes/pro-teaser.tsx`

### Header introduction (replace lines ~599-648)
- Remove the small "Every Driver PRO" eyebrow.
- Replace heading "Your professional ecosystem" with **"Your PRO Driver Hub"**.
- Add the supporting text directly underneath:
  **"Everything you need to save money, stay informed and get more from your professional driving career."**
- Heading style: large, bold, premium, dark navy (`#0B2341`), ~32 px, font-weight 800–900.
- Supporting text style: softer grey/navy (`#536579` / `#6B7686`), ~15 px, line-height 1.35, constrained width so it wraps to roughly 2–3 lines on a phone.
- Add a subtle blue accent line (`#1877D6`, ~32 px wide, 3–4 px tall, rounded) directly under the introduction text.
- Give the introduction generous vertical padding so it reads as an intentional page intro, not an afterthought.

### Quick-access pills (keep directly below intro)
- Keep the same six options in order: **PRO Perks**, **PRO Shop**, **Radio**, **PRO TV**, **News**, **Community**.
- Make **PRO Perks** the selected/primary pill: dark navy background (`#0B2341`), white text, left star icon, rounded pill, subtle shadow.
- Keep the remaining five pills in the existing light grey style.
- Preserve all existing navigation from the pills.

## Out of scope
- Do not change any other section: PRO Perks hero/category/explainer cards, PRO Shop, PRO Radio, PRO TV, News, Community, or the perk video modal.
- Do not touch `capacitor.config.ts`, `src/routes/home.tsx`, `src/routes/__root.tsx`, bottom navigation, or the microphone button — these remain as they are.
- Do not add backend/data changes; the redesign is purely presentational.

## Verification
- Run `tsgo` typecheck after editing.
- Check the preview at `/pro-teaser` and at `/home` (swipe to PRO teaser) to confirm the new heading, subtitle, accent line, and selected PRO Perks pill render correctly without crowding the content below.