-- Add per-thread admin-read flag to job_offer_messages so the admin
-- inbox can surface unread instructor replies.
ALTER TABLE public.job_offer_messages
  ADD COLUMN IF NOT EXISTS read_by_admin boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS job_offer_messages_job_offer_id_created_at_idx
  ON public.job_offer_messages (job_offer_id, created_at DESC);
