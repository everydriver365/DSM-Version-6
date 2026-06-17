// Supabase Edge Function: send-push
// Sends Web Push notifications via VAPID to all push_subscriptions for an instructor.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import webPush from "https://esm.sh/web-push@3.6.6";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Payload {
  instructor_id: string;
  title: string;
  body: string;
  url?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const VAPID_PUBLIC = Deno.env.get("VAPID_PUBLIC_KEY");
  const VAPID_PRIVATE = Deno.env.get("VAPID_PRIVATE_KEY");

  if (!SUPABASE_URL || !SERVICE_ROLE || !VAPID_PUBLIC || !VAPID_PRIVATE) {
    return new Response(
      JSON.stringify({ error: "Missing env: SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  let payload: Payload;
  try {
    payload = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { instructor_id, title, body, url } = payload;
  if (!instructor_id || !title || !body) {
    return new Response(
      JSON.stringify({ error: "instructor_id, title and body are required" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  webPush.setVapidDetails("mailto:support@everydriver.co.uk", VAPID_PUBLIC, VAPID_PRIVATE);

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);
  const { data: subs, error } = await supabase
    .from("push_subscriptions")
    .select("id, subscription")
    .eq("instructor_id", instructor_id);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const notificationPayload = JSON.stringify({ title, body, url: url ?? "/" });
  let sent = 0;
  let failed = 0;
  const staleIds: string[] = [];

  for (const row of subs ?? []) {
    try {
      // deno-lint-ignore no-explicit-any
      await webPush.sendNotification(row.subscription as any, notificationPayload);
      sent++;
    } catch (err) {
      // deno-lint-ignore no-explicit-any
      const statusCode = (err as any)?.statusCode;
      if (statusCode === 404 || statusCode === 410) {
        // Subscription expired or unsubscribed — drop it.
        staleIds.push(row.id);
      }
      failed++;
      console.error("[send-push] sendNotification error", err);
    }
  }

  if (staleIds.length) {
    await supabase.from("push_subscriptions").delete().in("id", staleIds);
  }

  return new Response(
    JSON.stringify({ sent, failed, removed_stale: staleIds.length }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
