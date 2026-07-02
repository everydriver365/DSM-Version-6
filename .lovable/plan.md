## Fix mobile strip between header and hero tile

On `/home` (mobile), a light strip appears between the fixed navy top bar and the navy hero section that holds the "Next lesson" card. This is caused by the page wrapper's `#F3F8FF` background showing through the space reserved for the fixed header.

### Change (single file: `src/routes/home.tsx`)

The wrapper at line ~1665 sets:
- `backgroundColor: '#F3F8FF'`
- `paddingTop: 'calc(60px + env(safe-area-inset-top, 0px))'`

The navy hero container starts at line ~1800 with `backgroundColor: '#0B1F3A'` and sits below that padding.

Update the navy hero section (line 1800) so it extends up under the reserved header space:
- Add `marginTop: 'calc(-1 * (60px + env(safe-area-inset-top, 0px)))'`
- Add `paddingTop: 'calc(60px + env(safe-area-inset-top, 0px) + 12px)'` (preserving the existing 12px inner top padding)

Result: the space directly beneath the fixed navy top bar is now the same navy (`#0B1F3A`), eliminating the light strip. The white hero card, stats, and everything else render exactly as before.

No other files touched, no functionality changes.