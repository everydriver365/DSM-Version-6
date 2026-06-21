# Fix: cursor disappears / deletion stops in profile inputs

## Cause

In `src/routes/profile.tsx`, the `AccordionCard` component is defined **inside** the `ProfilePage` component body (line 595). Every keystroke causes `ProfilePage` to re-render, which creates a brand-new `AccordionCard` function reference. React sees a different component type and unmounts/remounts the entire subtree — including every `TextField` inside it.

Result on every keystroke:
- The `<input>` is destroyed and recreated → focus is lost, the cursor disappears.
- Held-down Backspace stops deleting after the first character because the input it was repeating into no longer exists.

The session replay confirms this: rrweb node IDs for the same field jump (1149 → 1272 → 1395 → 1518) on consecutive keystrokes, which only happens when the DOM node is replaced.

## Fix

Move `AccordionCard` out of `ProfilePage` to module scope so its identity is stable across renders.

1. In `src/routes/profile.tsx`, cut the `AccordionCard` function (lines ~595–643) out of `ProfilePage`.
2. Re-declare it at module scope (next to the other module-level helpers like `TextField` and `SelectField`).
3. Since it currently closes over `expanded` and `toggleSection`, add them as props:
   - `isOpen: boolean`
   - `onToggle: () => void`
   - Keep `sectionKey` only if needed for the meta lookup; otherwise pass `meta` directly. Simplest: keep `sectionKey`, look up `SECTION_META` inside (it's already module-level).
4. Update each call site (`<AccordionCard sectionKey="personal">…`) to also pass `isOpen={expanded.personal}` and `onToggle={() => toggleSection("personal")}`.

No other files change. No behavior changes beyond inputs keeping focus.

## Verification

- Type into First name / Last name / Email and hold Backspace — characters delete continuously and the cursor stays visible.
- Accordion open/close still works for every section.
- No console warnings about controlled inputs.
