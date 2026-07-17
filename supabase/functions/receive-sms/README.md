# receive-sms Edge Function

Handles inbound SMS webhooks from Twilio. Validates that the request is
genuinely from Twilio via HMAC-SHA1 signature (`X-Twilio-Signature`),
matches the sender's phone number to a pupil, and inserts the reply into
`chat_messages` as an inbound SMS.

## Behavior

- Accepts `POST` requests (CORS enabled).
- Verifies `X-Twilio-Signature` against `TWILIO_AUTH_TOKEN`. Rejects with
  `403` if the signature is missing or invalid.
- Looks up the sender (`From`) against `pupils.phone` using digits-only
  comparison (also matches by the last 10 digits so country-code differences
  don't cause misses).
- If matched, inserts a row into `chat_messages` with `direction = 'inbound'`,
  `channel = 'sms'`, the message body, and the Twilio `MessageSid` as
  `external_id`.
- If no pupil matches, the message is ignored (logged, not stored).
- Always responds with an empty TwiML `<Response/>` so Twilio doesn't retry.

## 1. Environment variables

No new secrets are needed. This function reuses `TWILIO_AUTH_TOKEN` — the
same secret already set for `send-sms` — to validate incoming webhook
signatures. `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are injected
automatically.

## 2. Deploy

```bash
supabase functions deploy receive-sms --project-ref bjpqxfrihwjcqprmoqfs
```

## 3. Configure in Twilio Console

1. Open the [Twilio Console](https://console.twilio.com/).
2. Go to **Phone Numbers → Manage → Active Numbers** and click the number
   you send from.
3. Under **Messaging Configuration**, find **"A message comes in"**.
4. Set the handler to **Webhook**, method **HTTP POST**, and URL:

   ```
   https://bjpqxfrihwjcqprmoqfs.supabase.co/functions/v1/receive-sms
   ```

5. Save. Twilio will now POST each inbound SMS to this function.

## 4. Manual invocation (for testing)

Direct `curl` calls will be rejected with `403` because they can't produce a
valid `X-Twilio-Signature`. To test locally, use Twilio's request inspector
or send a real SMS to the configured number and check the function logs and
the `chat_messages` table.
