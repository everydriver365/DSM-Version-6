Visual text edit: standardise Discover Marketplace banner title to 14px

## What we're doing
Reduce the font size of the featured marketplace listing title in the Discover section from 15px to 14px, matching the app-wide body text standard already applied to teaching schedule tiles and Discover chip labels.

## Where the change happens
- File: `src/components/home/DiscoverSection.tsx`
- Target: the title div inside the Marketplace hero banner (currently `fontSize: 15`, around line 525).
- New value: `fontSize: 14`.

## Why
The user selected the banner title text ("WDU – What's Driving Us Course") and wants it to use the same 14px size as the rest of the app tiles. No other layout, weight, or colour changes are needed.

## Scope & exclusions
- Only the Discover section Marketplace banner title font size.
- No changes to the Marketplace page (`src/routes/marketplace.tsx`), the News row, the chip labels, or other Discover section spacing.
- No database or API changes.

## Verification
- After the edit, visually inspect the Discover section in the preview; the Marketplace banner title should render at 14px and still truncate to one line.
- No build errors expected; the change is a single numeric value in an inline style object.
