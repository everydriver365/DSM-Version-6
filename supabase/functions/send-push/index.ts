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

    const { instructor_id, title, body, subtitle, url, type, data } =
      await req.json();

    if (!instructor_id || !body) {
      return new Response(
        JSON.stringify({ error: "Missing fields" }),
        { status: 400, headers: corsHeaders },
      );
    }

    const { data: instructor } = await supabase
      .from("instructors")
      .select("onesignal_player_id")
      .eq("id", instructor_id)
      .single();

    if (!instructor?.onesignal_player_id) {
      console.error("[send-push] No OneSignal player ID for", instructor_id);
      return new Response(
        JSON.stringify({ error: "No OneSignal player ID" }),
        { status: 404, headers: corsHeaders },
      );
    }

    const { count: unreadCount } = await supabase
      .from("instructor_notifications")
      .select("*", { count: "exact", head: true })
      .eq("instructor_id", instructor_id)
      .eq("read", false);

    // Rows are always inserted before the push is sent, so the unread count
    // is already the correct absolute badge value.
    const badgeCount = Math.max(unreadCount ?? 0, 1);

    const bannerTitle = buildTitle(title, type);

    const apiKey = Deno.env.get("ONESIGNAL_REST_API_KEY") ?? "";
    const appId = "70d001f6-c98e-434d-8251-354c62447cb5";
    const subscriptionId = instructor.onesignal_player_id;

    console.log("[send-push] sending to subscription:", subscriptionId, "badge:", badgeCount);

    const payload: any = {
      app_id: appId,
      include_subscription_ids: [subscriptionId],
      headings: { en: bannerTitle },
      contents: { en: body },
      ios_badgeType: "SetTo",
      ios_badgeCount: badgeCount,
      target_channel: "push",
    };

    if (subtitle) payload.subtitle = { en: subtitle };
    if (url) payload.url = url;
    if (data || type) payload.data = { type: type ?? "general", url: url ?? "/notifications", ...data };

    const oneSignalRes = await fetch(
      "https://api.onesignal.com/notifications",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Key ${apiKey}`,
        },
        body: JSON.stringify(payload),
      },
    );

    const result = await oneSignalRes.json();

    if (!oneSignalRes.ok) {
      console.error("[send-push] OneSignal error:", JSON.stringify(result));
      return new Response(
        JSON.stringify({ error: result }),
        { status: 500, headers: corsHeaders },
      );
    }

    console.log("[send-push] sent:", result.id, "badge:", badgeCount);

    return new Response(
      JSON.stringify({ ok: true, id: result.id, badgeCount }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e: any) {
    console.error("[send-push] error:", e.message);
    return new Response(
      JSON.stringify({ error: e.message }),
      { status: 500, headers: corsHeaders },
    );
  }
});
