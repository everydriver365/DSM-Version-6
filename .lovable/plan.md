## Goal
On the New Lesson screen, the pupil selector currently filters out `inactive` and soft-deleted pupils only. Also exclude `archived` and `cancelled` pupils so they don't appear in the dropdown.

## Change
Single edit in `src/routes/lessons.new.tsx` (the `.from("pupils")` query around line 66-72): replace `.neq("status", "inactive")` with `.not("status", "in", "(inactive,archived,cancelled)")`.

## Result
- New Lesson dropdown only lists current pupils (active / passed).
- Archived, cancelled, inactive, and soft-deleted pupils are hidden.
- No other screens affected (Pupils index, edit, etc. keep their own filters).