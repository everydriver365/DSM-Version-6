# Fix `resolveDayHours` active-flag handling in home.tsx

## Goal
Make the home teaching schedule gap filler treat working days correctly when per-day working hours exist but do not explicitly set `active: false`.

## Current bug
In `src/routes/home.tsx`, the local `resolveDayHours` helper short-circuits to a zero-width window only when `cfg.active === false`. When a per-day config exists but `active` is `undefined`, it falls through and uses `cfg.start`/`cfg.end`, which may be empty/invalid and makes the day look non-working. As a result, gaps never appear even though the instructor has configured working days.

## Proposed change
Replace the `resolveDayHours` body in `src/routes/home.tsx` (around line 6689) with the logic below. No other code is changed. `capacitor.config.ts` is not touched.

```ts
const resolveDayHours = (d: Date): { start: string; end: string } => {
  const dayKeys = ['sun','mon','tue','wed','thu','fri','sat'] as const;
  const dayKeyToName: Record<string, string> = {
    sun: 'Sunday', mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday',
    thu: 'Thursday', fri: 'Friday', sat: 'Saturday',
  };
  const name = dayKeyToName[dayKeys[d.getDay()]];
  const perDay = (workingHours as Record<string, unknown> | null | undefined)?.per_day_hours as Record<string, { start?: string; end?: string; active?: boolean }> | null | undefined;
  const cfg = perDay?.[name];

  // No per-day config — fall back to the working_days list
  if (!cfg) {
    const workingDaysArr = (workingHours as Record<string, unknown> | null | undefined)?.working_days as string[] | null | undefined ?? ['mon','tue','wed','thu','fri'];
    const isWorkingDay = workingDaysArr.includes(name);
    if (!isWorkingDay) return { start: whStartStr, end: whStartStr };
    return { start: whStartStr, end: whEndStr };
  }

  // Per-day config exists — only treat as off if explicitly set to false
  if (cfg.active === false) return { start: whStartStr, end: whStartStr };

  return { start: cfg.start || whStartStr, end: cfg.end || whEndStr };
};
```

## Verification
- Run `bunx tsgo --noEmit` after the edit.
- Report the updated `resolveDayHours` function back to the user before finishing.
