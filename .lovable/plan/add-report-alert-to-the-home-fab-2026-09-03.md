# Add "Report alert" to the home FAB

Add a community road-alert shortcut (road closure, roadworks, accident, flooding, test centre delay, etc.) to the Quick Add menu on the home page.

## What the user sees

- A new tile in the Quick Add sheet labelled **Report alert**, with a warning-triangle icon in the critical red used elsewhere for alerts.
- Tapping it takes the instructor to the Community page and immediately opens the existing "Report an alert" sheet, where they pick the alert type, confirm the location and submit — exactly the same flow as the Report button already on the Community page.

## Where it sits

The Quick Add sheet is grouped into Teaching / People / Business. Report alert is neither, so it goes in a new small **Community** group at the end of the sheet, keeping the existing three groups untouched.

## Technical notes

Only `src/routes/home.tsx` changes.

- Add `"report"` to the `QuickAddKey` union and a new entry in `QUICK_ADD_ITEMS`: `{ key: "report", label: "Report alert", icon: IconAlertTriangle, bg: "#E53935", group: "Community" }`.
- Extend the group type and `QUICK_ADD_GROUPS` with `"Community"`.
- In `runQuickAdd`, add `case "report"`: navigate to `/community` with `search: { tab: "alerts" }`, then dispatch `dsm-open-report-sheet` on `window` after navigation settles (short timeout, so the Community page's listener is mounted).
- No new tables or backend work: `/community` already owns the report sheet, its listener for `dsm-open-report-sheet`, and the insert into the alerts table with the full alert-type list including `road_closure`.
