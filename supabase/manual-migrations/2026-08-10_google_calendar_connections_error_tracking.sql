-- Add soft-disconnect/error tracking columns to google_calendar_connections
-- so a failed Google token refresh can mark the connection as needing
-- reconnection instead of repeatedly returning a 500.

ALTER TABLE public.google_calendar_connections
ADD COLUMN IF NOT EXISTS refresh_error TEXT,
ADD COLUMN IF NOT EXISTS disconnected_at TIMESTAMPTZ;

-- Allow the authenticated user to see their own error/disconnect state.
-- This works alongside the existing policies used by the app.

-- If no SELECT policy exists, create one. The edge function / service role
-- bypasses RLS, so the update path is unaffected.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'google_calendar_connections'
      AND policyname = 'Users can view their own google calendar connection'
  ) THEN
    CREATE POLICY "Users can view their own google calendar connection"
    ON public.google_calendar_connections
    FOR SELECT
    TO authenticated
    USING (instructor_id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'google_calendar_connections'
      AND policyname = 'Users can update their own google calendar connection'
  ) THEN
    CREATE POLICY "Users can update their own google calendar connection"
    ON public.google_calendar_connections
    FOR UPDATE
    TO authenticated
    USING (instructor_id = auth.uid())
    WITH CHECK (instructor_id = auth.uid());
  END IF;
END
$$;

