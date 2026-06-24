## Goal
Restructure `src/routes/take-payment.tsx` so the entire screen fits within 100dvh with no scrolling, with the numpad expanding to fill remaining vertical space.

## Current layout (lines 315–658)

```text
Root (100dvh, flex col, overflow hidden)
├── Top bar (flexShrink: 0) — back + title
└── Content (flex: 1, gap: 10, padding 10/14/12)
    ├── Amount (flexShrink: 0)
    ├── Numpad (flex: 1)            ← currently above pupil/desc
    ├── Pupil + Description (col, flexShrink: 0)
    ├── Tabs (flexShrink: 0)
    ├── Tab action button (flexShrink: 0)
    └── Recorded message (flexShrink: 0)
```

Issues: numpad sits between amount and inputs; tab action button is separate from numpad area; on small viewports the stack can overflow.

## New layout

```text
Root (100dvh, flex col, overflow hidden)
├── Top bar (flex 0, height 52px + safe-area)
└── Content (flex 1, min-h 0, flex col, overflow hidden, max-w 480)
    ├── Amount (flex 0, padding 8/16, fontSize 40)
    ├── Pupil + Description row (flex 0, padding 4/16, fontSize 13)
    ├── Tabs (flex 0, height 40, margin 8/16/0)
    ├── Main area (flex 1, min-h 0, flex col, overflow hidden)
    │     QR tab  → Numpad (flex 1) + "Generate QR" button (flex 0)
    │     Card tab → Charge-card button OR Ryft form (compact, no scroll)
    │     Cash tab → Numpad (flex 1) + method selector + Record (flex 0)
    └── Recorded banner (flex 0, conditional)
```

## Numpad spec

- 3-column grid, `gridAutoRows: 1fr`, gap 6, padding 8/16
- Buttons: `height: 100%`, `minHeight: 0`, fontSize 20, fontWeight 600, borderRadius 10, border 0.5px #E2E6ED, background #F4F6FA

## Card tab

- Pre-session: "Charge card · £x.xx" button
- After session: Google Pay / Apple Pay containers + Ryft form (`#ryft-pay-form`) + Pay button. Container uses `overflow: auto` as a safety net since Ryft form height is content-driven.

## Scope

- Single file: `src/routes/take-payment.tsx`
- No changes to Ryft init logic, server function calls, QR overlay, or any other file
