# Show course ID on instructor-facing course screens

Add the course `id` (course ID) to the instructor-facing views where courses are listed and viewed, so instructors can reference it when talking to pupils or support.

## What changes

**1. `src/routes/courses.index.tsx` — course list card**
- In `CourseCard`, render the course ID as small muted text inside the footer row, below the price.
- Keep the existing price/spaces/status layout unchanged.

**2. `src/routes/courses.$id.tsx` — course detail page**
- Add a read-only `DetailRow` for **Course ID** near the top of the non-edit course details card.
- Display `course.id`.

## Verification
- Open `/courses` and confirm each card shows its ID.
- Open a course detail and confirm the ID appears in the details card.
