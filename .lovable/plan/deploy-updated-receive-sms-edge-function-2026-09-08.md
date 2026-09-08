# Deploy updated receive-sms Edge Function

## Goal
Deploy the updated `receive-sms` Supabase Edge Function so pupil YES replies to gap-filler offers are automatically booked.

## Steps

1. Open Supabase Dashboard for this project.
2. Go to **Edge Functions** → find `receive-sms` → click **Deploy new version**.
3. Copy the complete updated source from `supabase/functions/receive-sms/index.ts` in the project and paste it into the editor.
4. Ensure these secrets are set under Edge Functions → `receive-sms` → Secrets:
   - `TWILIO_AUTH_TOKEN`
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `TWILIO_PHONE_NUMBER` (or `TWILIO_MESSAGING_SERVICE_SID` if used)
5. Click **Deploy**.
6. In Twilio Console, verify the webhook URL for your number still points to:
   `https://<project-ref>.supabase.co/functions/v1/receive-sms`
7. Send a Gap Filler offer to a test pupil, reply YES, and watch Supabase Edge Function logs.

## Verification

- The YES reply appears in the pupil's message thread.
- A lesson is created for the offered slot.
- Competing open offers for the same slot are marked expired.
- The pupil receives a confirmation text; the instructor receives a notification.

## Notes

- Do not change `send-sms`, gap detection, pupil matching, Google integration, schema, or `capacitor.config.ts`.
- If the dashboard editor does not support relative TypeScript imports (`../../../src/lib/smsAcceptance.ts`), the source may need the acceptance rules duplicated locally in the function before deployment.
