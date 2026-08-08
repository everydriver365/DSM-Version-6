# Community card — "Latest" activity row

Add a single top row to the Community card on Home showing the most recent thing that happened across the card's sources, with a coloured dot, a bold title, a one-line "source · detail" summary and a chevron. Tapping it goes wherever that item already goes.

## Logic (extends what exists)

The card already computes `latestActivity` (~line 7650) by taking the newest timestamp across local alerts, unread pupil messages, local chat and UK chat, then formats `timeAgo`. That comparison will be extended to also remember **which** source won and carry its content, as one `latestItem` object. `timeAgo` stays exactly as is.

Candidates entered into the comparison, with the colours already used by this card's chips:

| Source | Title | Source text | Detail | Dot | Tap target |
|---|---|---|---|---|---|
| `localAlerts[0]` | New issue reported | `location_name` (falls back to `alert_type`) | `description` | red `#CC2229` | `/community?tab=alerts` |
| local/UK/room chat latest | New message | sender first name | message text | purple `#7C3AED` | `/community?tab=local` / `tab=rooms` |
| `pupilReplies[0]` (unread pupil msg) | New pupil enquiry | pupil name | message body | blue `#1877D6` | `/messages/$pupilId` |
| admin room latest (when `adminUnread > 0`) | Admin update | Admin | message text | brown `#92400E` | `/community?tab=rooms` |
| `dmPreviews[0]` (when `unreadDMs > 0`) | New DSM message | instructor name | `last_message` | teal `#0F766E` | `/messages/instructor/$conversationId` |

Note on the issues row: `local_alerts` has no reporter name field in the query used here (`id, alert_type, description, location_name, ...`), so the source text uses `location_name` with `alert_type` as fallback rather than a reporter name.

If no source has a timestamp, `latestItem` is `null` and the row is not rendered at all.

## Row markup

Placed at the top of the card header, above the avatar-stack row:

- 8px round dot in the item's colour
- Title: 13.5px / 700, single line, ellipsis
- Second line: `source · detail`, 12px, `#6B7686`, single line, ellipsis
- `ChevronRight` 14px, `#C7CEDA`, right aligned
- Thin `0.5px solid #E4E8EF` divider beneath, before the avatar-stack row
- Whole row tappable; its click stops propagation so it doesn't toggle the card's expand/collapse

## Out of scope

- Avatar stack, active count, "Updated" timestamp and chip row stay unchanged
- No changes to any counts
- No priority weighting — strictly newest by time
- Only `src/routes/home.tsx`, only this card
