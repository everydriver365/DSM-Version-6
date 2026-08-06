// Supabase Edge Function: send-push
// Sends Web Push notifications via VAPID to all push_subscriptions for an instructor.
//
// ─────────────────────────────────────────────────────────────
// SUPPORTED NOTIFICATION TYPES
// ─────────────────────────────────────────────────────────────
// The function is type-agnostic: any caller that supplies
// instructor_id + title + body gets a push delivered to every
// registered device for that instructor. `type` and `data` are
// optional passthrough fields for the service worker / client.
//
// 1. Pupil messages
//    { instructor_id, title: "New message from Sam",
//      body: "...", url: "/messages/<pupilId>", type: "pupil_message" }
//
// 2. Payments
//    { instructor_id, title: "Payment received",
//      body: "£45.00 from Sam", url: "/payments", type: "payment" }
//
// 3. Instructor-to-instructor DMs  (added Aug 2026)
//    { instructor_id: "<recipient instructor id>",
//      title: "New message from <name>",
//      body: "<message preview>",
//      url: "/messages",
//      type: "instructor_dm",
//      data: { conversation_id, from_instructor_id } }
//
//    No logic change was required for instructor DMs — the existing
//    instructor_id + title + body path already handles them. The DM
//    notification row is produced by the `notify_on_instructor_dm()`
//    trigger on `instructor_messages` INSERT, which writes to
//    `instructor_notifications`; that row is then dispatched here.
// ─────────────────────────────────────────────────────────────

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import webPush from "https://esm.sh/web-push@3.6.6";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type NotificationType = "pupil_message" | "payment" | "instructor_dm" | (string & {});

interface Payload {
  instructor_id: string;
  title: string;
  body: string;
  url?: string;
  /** Optional category, echoed to the client so the SW can group/route. */
  type?: NotificationType;
  /** Optional extra context, e.g. { conversation_id, from_instructor_id }. */
  data?: Record<string, unknown>;
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

  const { instructor_id, title, body, url, type, data } = payload;
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
