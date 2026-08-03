Add pricing plan indicator for pupils

Add a visible pricing plan indicator that shows whether a pupil is on Standard, Block, National Intensives or Custom, so instructors can see it at a glance without opening the payment sheet.

Proposed changes
- Display a compact, coloured badge next to the pupil's name on the pupil detail page (overview tab) and on the home Next Lesson card subtitle.
- Badge is view-only on the home card; on the pupil detail page it opens the existing UnifiedPaymentSheet when tapped so the plan can be changed.
- Use consistent colour coding: Standard = grey, Block = navy/blue, National Intensives = purple, Custom = teal.
- Reuse the existing `pricing_type` value from the pupil record and the `PRICING_OPTIONS` labels in UnifiedPaymentSheet.

Implementation details
- src/routes/pupils.$id.tsx: add a plan badge in the hero header; badge tap opens `UnifiedPaymentSheet`.
- src/routes/home.tsx: add the plan badge to the Next Lesson subtitle line, after the lesson type and before the duration/package text.
- No database changes needed.
- Keep existing `lesson_type` display as-is and only add the plan label.

Acceptance
- Pupil detail page shows a "Block" badge for a block-booking pupil.
- Home Next Lesson card shows the same plan label in the subtitle line.
- Tap on the pupil detail badge opens the payment sheet with the current pupil selected.
