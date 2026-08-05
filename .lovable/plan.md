# Make the Community summary labels tappable

## Why it does nothing today

On the home screen's Local Issues / Community card, the row reading
`Issues · Chat · Pupils · Admin` is plain text. The `Label` component
(`src/routes/home.tsx`, around line 5480) renders a `<span>` with a colour and
an optional count badge — it has no `onClick` of its own. The only click
handler is on the whole header `<div>`, which toggles the card open/closed.
So tapping "Pupils" just expands or collapses the card; it never takes you to
the pupil messages.

Separately, "Pupils" only shows a count when there are unread pupil replies in
`unreadMsgs`; if that list is empty the label is grey with no badge, which also
makes it feel dead.

## What to change

Only `src/routes/home.tsx`.

1. Give `Label` an optional `onClick`. When provided, the span stops event
   propagation (so it doesn't also toggle the card) and handles the tap itself.
   Add a subtle pressed/hit area: padding, `cursor: pointer`, and keyboard
   focus support via `role="button"` and `tabIndex`.
2. Wire each label to the matching destination:
   - Issues -> `/community` with `tab: 'alerts'`
   - Chat -> `/messages`
   - Pupils -> `/messages` (pupil conversations)
   - Admin -> `/community` with the admin room, matching what the expanded
     Admin row already does.
3. Labels with a zero count stay grey and instead just expand the card, so a
   tap never lands on an empty screen.

## Technical notes

- No data or query changes; this is presentation and navigation only.
- Reuse the exact navigation targets already used by the expanded rows
  (rows 1-4 below the header) so behaviour is consistent.
