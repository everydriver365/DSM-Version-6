CREATE TABLE public.accounting_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instructor_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider text NOT NULL,
  provider_org_name text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (instructor_id, provider)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.accounting_connections TO authenticated;
GRANT ALL ON public.accounting_connections TO service_role;

ALTER TABLE public.accounting_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Instructors can manage their own accounting connections"
ON public.accounting_connections
FOR ALL
TO authenticated
USING (instructor_id = auth.uid())
WITH CHECK (instructor_id = auth.uid());
