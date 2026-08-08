# Update Discover chip label font size to 14px

## Context
The selected element is the "Live" chip label in `src/components/home/DiscoverSection.tsx`. The four compact chips (Live, Learn, Bitesize, Showcase) share a common `chipLabel` style object.

## Change
Update `src/components/home/DiscoverSection.tsx` line ~297:
- Change `fontSize: 9` to `fontSize: 14` in the `chipLabel` style object.

This applies to all four chip labels because they all use `chipLabel`.

## Files touched
- `src/components/home/DiscoverSection.tsx` (1-line style change)
