Update `src/components/dsm/BottomNav.tsx` only.

1. **Replace icon imports** — remove the `DrivingIcons` imports and import `Home`, `CalendarDays`, `Users`, `MessageSquare`, `Grid` from `lucide-react`.

2. **Update `NavKey` type** — change from `home | pupils | schedule | messages | payments | settings` to `home | schedule | pupils | messages | more`.

3. **Redefine `defaultItems`** with 5 tabs:
   - Home → `/home` → `Home`
   - Schedule → `/schedule` → `CalendarDays`
   - Pupils → `/pupils` → `Users`
   - Messages → `/messages` → `MessageSquare`
   - More → route `null`, onClick dispatches `window.dispatchEvent(new CustomEvent('dsm-workspace-change', { detail: { index: 7 } }))` → `Grid`

   Remove the existing Payments and Settings tabs entirely. Update the `defaultItems` type to allow `to?: string | null` and `onClick?: () => void`.

4. **Update active-state logic** for the default rendering branch:
   - Home: `active === 'home' && currentWs === 0`
   - Schedule: `active === 'schedule'`
   - Pupils: `active === 'pupils' || active?.startsWith('pupils')`
   - Messages: `active === 'messages'`
   - More: `currentWs === 7`

5. **Update styling**:
   - Active icon + label color: `#0F2044`
   - Active label: `font-semibold`
   - Inactive icon + label color: `#9CA3AF`
   - Icon size: `22px`
   - Label: `text-[10px] font-medium` with `mt-1px` (active label becomes `font-semibold`)
   - Each tab keeps `flex-1` so the 5 tabs share equal width

6. **Keep the existing custom `items` prop path** unchanged; only the default `defaultItems` branch and its active logic are modified.

No other files will be touched.