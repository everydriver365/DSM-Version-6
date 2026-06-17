## Fix duplicate notes route and add My plan to Settings

### 1. Remove duplicate notes route
- **File:** `src/routes/notes.tsx`
- **Action:** Delete the file. It only renders `<Outlet />` and conflicts with `notes.index.tsx` which owns the `/notes` page content.

### 2. Add "My plan" row to Settings menu
- **File:** `src/routes/settings.tsx`
- **Actions:**
  1. Add `Crown` to the `lucide-react` import list.
  2. Extend `MenuRow` component with an optional `value?: string` prop that renders on the right side before the chevron, styled at 13px `#6B7280`.
  3. Insert a new `MenuRow` under the ACCOUNT section, after "Calendar sync" and before the "SUPPORT" header:
     - Icon: `<Crown size={18} color="#5B21B6" />`
     - Icon bg: `#EDE9FE`
     - Label: "My plan"
     - Value: "DSM Free"
     - On click: navigate to `/subscription`