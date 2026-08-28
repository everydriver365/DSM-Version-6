Redesign the next-lesson action buttons (Message, Call, Late) in `src/routes/home.tsx`.

Scope
- Only the three action buttons rendered inside the upcoming-lesson card.
- Keep labels, icons, order, dimensions (flex-1 equal width, same row), click handlers, and the SMS/app notification badges on the Message button.
- Do not change any other UI, layout, or functionality.

Design
- Message button: background `#0077F9`, white icon + label.
- Call button: background `#0399AA`, white icon + label.
- Late button: background `#FDE7E7`, icon + label `#D92D3A`.
- All three:
  - height 38px (unchanged)
  - border-radius 16px
  - font `Poppins, sans-serif`, font-weight 600, font-size 12px
  - subtle shadow: `0 2px 6px rgba(0,0,0,0.06)`
  - clean thin-line Tabler icons at 14px, stroke 1.5
  - gap 6px between icon and label
  - flex 1, equal height, centred content
  - no gradients, no gloss, no 3D

Implementation
- Replace the inline `style` blocks for the three `<button>` elements in the action row.
- Keep existing `onClick` logic, `type="button"`, and the badge wrapper/conditional counts on the Message button.
- Verify the file builds and the preview shows the updated buttons.
