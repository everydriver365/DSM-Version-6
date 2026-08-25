import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  const APP_URL = "https://app.everydriver.pro";

  if (error || !code || !state) {
    return Response.redirect(`${APP_URL}/calendarsync?error=access_denied`, 302);
  }

  const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID");
  const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET");
  const REDIRECT_URI = "https://bjpqxfrihwjcqprmoqfs.supabase.co/functions/v1/google-calendar-callback";

  try {
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: REDIRECT_URI,
        grant_type: "authorization_code",
      }),
    });

    const tokens = await tokenRes.json();
    console.log("[callback] token response:", JSON.stringify(tokens));

    if (!tokens.access_token) {
      return Response.redirect(`${APP_URL}/calendarsync?error=token_failed`, 302);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL"),
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
    );

    const instructorId = state;
    console.log("[callback] user:", instructorId);

    const { error: updateError } = await supabase
      .from("instructors")
      .update({
        google_access_token: tokens.access_token,
        google_refresh_token: tokens.refresh_token ?? null,
        google_token_expiry: tokens.expires_in
          ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
          : null,
        google_calendar_connected: true,
        google_calendar_id: "primary",
      })
      .eq("id", instructorId);

    if (updateError) {
      console.error("[callback] update error:", updateError);
      return Response.redirect(`${APP_URL}/calendarsync?error=save_failed`, 302);
    }

    console.log("[callback] connected successfully for:", instructorId);
    return Response.redirect(`${APP_URL}/calendarsync?connected=true`, 302);

  } catch (e) {
    console.error("[callback] exception:", e);
    return Response.redirect(`${APP_URL}/calendarsync?error=exception`, 302);
  }
});
