## Why nothing happens

The "+ New course" button is wired correctly and does navigate to `/courses/new` — the URL changes and the route matches. The problem is the parent route.

`src/routes/courses.tsx` defines the route `/courses` AND, because `src/routes/courses.new.tsx` exists as a child, TanStack treats it as a **layout parent**. Layout parents must render `<Outlet />` for child routes to appear. Right now `CoursesPage` just renders the courses list — no `<Outlet />` — so when you navigate to `/courses/new` the child route mounts but has nowhere to render. You see the unchanged courses list (or a flash + nothing), which looks like "nothing happens".

## Fix (only files touched)

Rename `src/routes/courses.tsx` → `src/routes/courses.index.tsx` and update its `createFileRoute("/courses")` → `createFileRoute("/courses/")` (index path).

This makes:
- `/courses` → leaf index route (the list page, unchanged behavior)
- `/courses/new` → independent sibling leaf route (renders the new-course screen)

No parent layout, no `<Outlet />` needed. Nothing else changes.

## Files

- rename `src/routes/courses.tsx` → `src/routes/courses.index.tsx` and update the `createFileRoute` string
- `src/routeTree.gen.ts` regenerates automatically

No changes to `courses.new.tsx`, `home.tsx`, or anything else.