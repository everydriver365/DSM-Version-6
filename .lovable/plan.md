Plan: Make "Message all" work for SMS, Email, and SMS+Email with delivery status

## Goal
The broadcast page currently only sends SMS. Extend it to support SMS, Email, and SMS+Email, and show delivery status for each queued message so the instructor knows what was sent, failed, or is still pending.

## Current state
- `src/routes/broadcast.tsx` has a `SendMethod` type of `"sms" | "email" | "both"` but the UI only renders an SMS button and `sendNow` only writes to `sms_queue`.
- `sms_queue` exists with a `status` column (`queued`/`sent`/`failed`) and a `send-sms` edge function that updates it.
- The `send-sms` edge function is triggered by `supabase.functions.invoke("send-sms")` after inserting rows.
- No email queue or email-sending edge function exists, and no email connector is linked to the project.
- The broadcast page does not poll delivery status after sending.

## Proposed work

### 1. Add email-sending backend
- Link an email connector (Brevo is the recommended default) to the project so the app can send email through the Lovable connector gateway.
- Create an `email_queue` table with the same shape as `sms_queue`: `id`, `instructor_id`, `recipient_email`, `message`, `subject`, `status`, `scheduled_for`, `sent_at`, `created_at`.
- Create a new Supabase Edge Function `send-email` that:
  - Reads queued rows from `email_queue`.
  - Sends via the connector gateway using the linked email connector credentials.
  - Updates `status` to `sent` or `failed` and records `sent_at` on success.

### 2. Extend `broadcast.tsx` sending logic
- Render three send-method buttons: SMS, Email, SMS & Email.
- When sending:
  - Insert `chat_messages` rows as in-app copies (existing behavior).
  - For SMS: insert into `sms_queue` for pupils with a phone number.
  - For Email: insert into `email_queue` for pupils with an email address.
  - For both: insert into both queues when the pupil has both contact methods.
- Trigger the matching edge function (`send-sms` and/or `send-email`) after inserts.
- Use a per-batch `bulk_messages` row to group the broadcast and track the overall count.

### 3. Add delivery status feedback
- After sending, record the IDs of the queued rows for the batch.
- Poll `sms_queue` and `email_queue` for those rows every 2 seconds for up to 30 seconds.
- Show a summary section: total queued, sent, failed, and pending per channel (SMS/Email).
- If rows are still queued after 30 seconds, stop polling and note that the remaining messages are queued for the background worker.

### 4. Handle missing contact details
- Before sending, show how many selected pupils have no phone and how many have no email.
- If a method is chosen but no pupils have that contact detail, disable the send button and show a helpful message.

## Open decisions
- Which email connector to use. The project has no email connector linked. Brevo is the default recommended provider; I will link it as part of the plan unless you prefer Resend, Mailgun, or SendGrid.
- Whether the email subject should be a fixed template prefix (e.g., "Message from your driving instructor") or editable. The plan will default to an editable subject line with a sensible default.

## Files to touch
- `src/routes/broadcast.tsx` — UI, send logic, status polling.
- `db/039_create_email_queue.sql` — new email queue table.
- `supabase/functions/send-email/index.ts` — new edge function.
- `db/040_update_bulk_messages.sql` — optional batch metadata improvements.
- Connector settings — link an email provider (Brevo by default).

## Out of scope
- Marketing/bulk campaigns: this is still instructor-to-pupil transactional communication triggered by the user action.
- Custom email templates beyond the broadcast message subject/body.
