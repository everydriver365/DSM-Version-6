// Supabase Edge Function: send-push
// Sends push notifications via the OneSignal REST API to an instructor's device.
//
// ─────────────────────────────────────────────────────────────
// SUPPORTED NOTIFICATION TYPES
// ─────────────────────────────────────────────────────────────
// The function is type-agnostic: any caller that supplies
// instructor_id + title + body gets a push delivered to the
// instructor's registered OneSignal player. `type` and `data` are
// optional passthrough fields for the client to route/deep-link.
//
// 1. Pupil messages
//    { instructor_id, title: "New message from Sam",
//      body: "...", url: "/messages/<pupilId>", type: "pupil_message" }
//
// 2. Payments
//    { instructor_id, title: "Payment received",
//      body: "£45.00 from Sam", url: "/payments", type: "payment" }
//
// 3. Instructor-to-instructor DMs
//    { instructor_id: "<recipient instructor id>",
//      title: "New message from <name>",
//      body: "<message preview>",
//      url: "/messages",
//      type: "instructor_dm",
//      data: { conversation_id, from_instructor_id } }
//
// The DM notification row is produced by the `notify_on_instructor_dm()`
// trigger on `instructor_messages` INSERT, which writes to
// `instructor_notifications`; that row is then dispatched here.
// ─────────────────────────────────────────────────────────────

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const {
      instructor_id,
      title,
      body,
      url,
      type,
      data,
    } = await req.json();

    if (!instructor_id || !title || !body) {
      return new Response(
        JSON.stringify({ error: "Missing fields" }),
        { status: 400, headers: corsHeaders },
      );
    }

    // Get instructor's OneSignal player ID
    const { data: instructor } = await supabase
      .from("instructors")
      .select("onesignal_player_id")
      .eq("id", instructor_id)
      .single();

    if (!instructor?.onesignal_player_id) {
      return new Response(
        JSON.stringify({ error: "No OneSignal player ID" }),
        { status: 404, headers: corsHeaders },
      );
    }

    // Send via OneSignal REST API
    const oneSignalRes = await fetch(
      "https://onesignal.com/api/v1/notifications",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Basic ${Deno.env.get("ONESIGNAL_REST_API_KEY")}`,
        },
        body: JSON.stringify({
          app_id: "8af9dd53-7122-428e-9267-4e3fc188089d",
          include_player_ids: [instructor.onesignal_player_id],
          headings: { en: title },
          contents: { en: body },
          url: url ?? undefined,
          data: {
            type: type ?? "general",
            ...data,
          },
        }),
      },
    );

    const result = await oneSignalRes.json();

    if (!oneSignalRes.ok) {
      console.error("[send-push] OneSignal error:", result);
      return new Response(
        JSON.stringify({ error: result }),
        { status: 500, headers: corsHeaders },
      );
    }

    console.log("[send-push] sent:", result.id);

    return new Response(
      JSON.stringify({ ok: true, id: result.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e: any) {
    console.error("[send-push] error:", e);
    return new Response(
      JSON.stringify({ error: e.message }),
      { status: 500, headers: corsHeaders },
    );
  }
});
