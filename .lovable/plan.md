# Home dashboard improvements

The home screen already contains a Next lesson map, Needs attention list, Today's lessons tile, a swipeable stats card, Quick actions, and a Discover section. Three changes will make it feel like a true daily command centre. All work stays in `src/routes/home.tsx` and the Discover component.

## 1 — Morning Brief hero card


Add a compact, always-first card that answers "how is my day looking?" in one glance.

- Shows: today's lesson count, completed count, predicted earnings, miles to drive, and next-lesson countdown.
- Pulls data already loaded for the rest of the page; no new backend calls.
- Reuses existing colour tokens and card radius.
- Tapping the card jumps to /schedule; tapping a metric jumps to its detail page.

**Effort:** small. Mostly presentational reuse of existing calculations.

## 2 — Actionable Needs Attention

Turn each Needs Attention row into a one-tap action surface.

- Each row exposes its primary action (e.g. "Call" for calls, "Message" for enquiries, "Reschedule" for cancellations) as a secondary button.
- Keeps the existing row tap-to-list behaviour, and adds an action button that does the obvious thing without an extra navigation.
- Adds haptic feedback and a subtle success toast.

**Effort:** small to medium. Adds conditional action handlers per item type.

## 3 — Unified Discover section

Expand the Discover section beyond DSM Live sessions to include:

- One featured Marketplace listing.
- One latest Industry News headline.
- Horizontal swipe between the three content types (Live, Marketplace, News) with the same pill pagination already used elsewhere.
- Keeps existing data fetch patterns; no new tables.

**Effort:** medium. Reuses Marketplace/News helpers already in the codebase.

## Build order

1. Morning Brief hero card (sets the visual foundation).
2. Needs Attention inline actions.
3. Discover section expansion.

## Technical notes

- Hero card metrics derive from state already loaded in `home.tsx` (today's lessons, durations, rates) — no new queries.
- Needs Attention actions extend the existing `NAItem` type with an optional `action` field so rows without an obvious action render unchanged.
- Discover reuses the existing DSM Live fetch plus the marketplace listing and news helpers already used elsewhere in the app.

## Verification

- Build/typecheck passes.
- Visual check on iPhone viewport: hero card, needs attention rows, and discover section render without pushing critical content below the fold.
- All existing tap handlers and navigation continue to work unchanged.

