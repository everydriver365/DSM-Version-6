Deploy the `receive-sms` Supabase Edge Function to the active Supabase project (`bjpqxfrihwjcqprmoqfs`).

Goal: make the Twilio inbound SMS webhook handler live at the Supabase Functions URL so it can validate Twilio signatures, match sender phone numbers to pupils, and insert replies into `chat_messages`.

What the plan covers:
1. Verify the local function source (`supabase/functions/receive-sms/index.ts`) and its README are current and correct.
2. Ensure the Supabase CLI is configured for the project ref `bjpqxfrihwjcqprmoqfs` (create/link `supabase/config.toml` or run the equivalent deploy command with `--project-ref`).
3. Deploy the function using `supabase functions deploy receive-sms` (or the latest equivalent CLI command).
4. After deployment, report the function endpoint URL and confirm the deployed function is reachable (e.g., via a `GET` or `OPTIONS` probe that returns the expected Twilio/XML response or CORS headers).
5. Note any required environment variables on the Supabase project (`TWILIO_AUTH_TOKEN`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`) so the user can set them in the Supabase Dashboard if not already present.

Blocker/dependency: Supabase CLI deployment requires an authenticated Supabase access token or an already-linked project in the workspace. If the sandbox environment does not have Supabase CLI auth configured, I will surface the exact command and ask the user to run it locally (or provide access), then confirm the result.

No other files will be changed; this is purely a deployment of the existing `supabase/functions/receive-sms/index.ts` function.