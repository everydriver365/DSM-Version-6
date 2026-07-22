Task: Modify only `src/routes/home.tsx` — specifically the `HeroExpandedPanel` component (currently ~lines 7573–7812). Do not touch the collapsed Next Lesson card's own Navigate/Text/Call row, and preserve all existing onClick handlers and data bindings.

Current `HeroExpandedPanel` structure:
- Outer wrapper: `background: '#F3F8FF'`, `borderRadius: '0 0 16px 16px'`, `padding: 12`
- Row 0: redundant Call / Text / Navigate actions (margin `-12px -12px 12px`, background `#FAFBFC`, white/blue buttons)
- Row 1: Here / Going / Late pills — white background, `borderRadius: 12`, `padding: '10px 0'`, `gap: 4`, 12px label
- Row 2: Prep / EOL / Arrived pills — EOL solid red fill, Arrived solid blue fill
- Pickup section: white card, `borderRadius: 12`, `padding: '12px 14px'`, 13px links
- Account section: dynamic green/amber/gray background, `borderRadius: 12`, `padding: 14`, 12px buttons
- Last lesson section: white card, `borderRadius: 12`, `padding: 14`, 13px date / 10px status / 13px notes

Proposed changes:
1. Remove Row 0 entirely (Call / Text / Navigate actions).
2. Add a section label "Quick Actions" above the Here/Going/Late and Prep/EOL/Arrived rows.
3. Restyle pills:
   - default `background: '#F2F2F7'`, `borderRadius: 9`, `padding: '8px 4px'`, `gap: 3`, `fontSize: 11`
   - EOL: `background: '#FDEDEE'`, text/icon `color: '#CC2229'` (muted, not solid)
   - Arrived: `background: '#EAF2FC'`, text/icon `color: '#1877D6'` (muted, not solid)
   - Going active state stays `'#FFF8E8'`
4. Pickup section:
   - label text "Pickup"
   - box `background: '#F2F2F7'`, `borderRadius: 9`, `padding: '9px 12px'`, `fontSize: 13`
   - Navigate / Copy links `fontSize: 12`
5. Account section:
   - label text "Account"
   - box `background: '#FEF7E8'`, `borderRadius: 9`, `padding: '11px 12px'`
   - action buttons height `26`, `fontSize: 11`, `borderRadius: 8`, `padding: '0 10px'`
   - preserve existing fg/bg logic for paid/prepaid/cancelled states
6. Last lesson section:
   - label text "Last Lesson"
   - box `background: '#F2F2F7'`, `borderRadius: 9`, `padding: '10px 12px'`
   - date `fontSize: 12`, status pill `fontSize: 9`, notes `fontSize: 11`, lineHeight `1.4`

All section labels: `fontSize: 11`, `fontWeight: 600`, `color: '#8E8E93'`, `textTransform: 'uppercase'`, `letterSpacing: 0.2px`, `marginBottom: 6`.

All onClick handlers, `sendSms`, `setGoingActive`, `onOpenLate`, `onOpenLesson`, `onEol`, `navigateTo`, and data bindings remain unchanged.