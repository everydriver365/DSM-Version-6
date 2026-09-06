# Remove top separator line from Teaching Schedule tile

## What's changing

The thin horizontal line at the top of the Teaching Schedule white card on the **Today** / **Tomorrow** tabs is the `Separator` rendered by `ScheduleDateDivider`, even when its day label is hidden. This change removes that separator when no label is shown.

## Files

- `src/components/schedule/ScheduleDateDivider.tsx`: only render the `<Separator />` when `showLabel` is `true`.

## Technical notes

- `ScheduleDateDivider` currently always renders the separator regardless of `showLabel`.
- `src/routes/home.tsx` calls it as `<ScheduleDateDivider date={rowStart} showLabel={tab === 'next'} />`, so for Today/Tomorrow the label is suppressed but the separator remains.
- Conditionally rendering the separator when `showLabel` is true removes the stray top line while keeping the day-divider separator on the **Next** tab.
