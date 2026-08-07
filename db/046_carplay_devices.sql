-- CarPlay / native device pairing for instructors
CREATE TABLE IF NOT EXISTS public.instructor_devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instructor_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  device_id text NOT NULL,                 -- iOS identifierForVendor or similar stable id
  platform text NOT NULL DEFAULT 'ios',    -- ios, android, carplay
  apns_token text,                         -- Apple Push Notification service token
  onesignal_player_id text,                -- OneSignal player id if available
  model text,                              -- e.g. "iPhone15,2"
  os_version text,                         -- e.g. "17.0"
  app_version text,                        -- DSM native app version
  carplay_entitled boolean DEFAULT false,
  last_seen_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(instructor_id, device_id, platform)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.instructor_devices TO authenticated;
GRANT ALL ON public.instructor_devices TO service_role;

ALTER TABLE public.instructor_devices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Instructors can manage their own devices"
  ON public.instructor_devices
  FOR ALL
  TO authenticated
  USING (instructor_id = auth.uid())
  WITH CHECK (instructor_id = auth.uid());

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_instructor_devices_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS instructor_devices_updated_at ON public.instructor_devices;
CREATE TRIGGER instructor_devices_updated_at
  BEFORE UPDATE ON public.instructor_devices
  FOR EACH ROW
  EXECUTE FUNCTION public.update_instructor_devices_updated_at();
