-- Add soft-delete support to instructors (admin instructor management)
ALTER TABLE public.instructors
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

CREATE INDEX IF NOT EXISTS instructors_deleted_at_idx
  ON public.instructors (deleted_at);
