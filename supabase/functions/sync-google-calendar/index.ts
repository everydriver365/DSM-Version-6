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

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  let body: any = {};
  try { body = await req.json(); } catch {}

  // Accept both instructor_id and instructorId for compatibility
  const instructor_id = body.instructor_id || body.instructorId;
  const action = body.action ?? "sync";
  const days_ahead = body.days_ahead ?? 60;

  if (!instructor_id) {
    return new Response(
      JSON.stringify({ error: "instructor_id required" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Get instructor Google tokens
  const { data: instructor } = await supabase
    .from("instructors")
    .select("google_access_token, google_refresh_token, google_token_expiry, google_calendar_id, google_calendar_connected")
    .eq("id", instructor_id)
    .single();

  if (!instructor?.google_calendar_connected || !instructor?.google_access_token) {
    return new Response(
      JSON.stringify({ ok: true, skipped: "no google calendar connected" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Refresh token if expired
  let accessToken = instructor.google_access_token;
  if (instructor.google_token_expiry && new Date(instructor.google_token_expiry) < new Date()) {
    const refreshRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: Deno.env.get("GOOGLE_CLIENT_ID")!,
        client_secret: Deno.env.get("GOOGLE_CLIENT_SECRET")!,
        refresh_token: instructor.google_refresh_token,
        grant_type: "refresh_token",
      }),
    });
    const refreshData = await refreshRes.json();
    if (refreshData.access_token) {
      accessToken = refreshData.access_token;
      await supabase.from("instructors").update({
        google_access_token: accessToken,
        google_token_expiry: new Date(Date.now() + refreshData.expires_in * 1000).toISOString(),
      }).eq("id", instructor_id);
    }
  }

  const calendarId = instructor.google_calendar_id ?? "primary";

  // HANDLE DELETE
  if (action === "delete") {
    const eventId = body.google_event_id ?? (await supabase
      .from("lessons")
      .select("google_event_id")
      .eq("id", body.lesson_id)
      .single()
    ).data?.google_event_id;

    if (!eventId) {
      return new Response(
        JSON.stringify({ ok: true, skipped: "no event to delete" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const delRes = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${eventId}`,
      { method: "DELETE", headers: { Authorization: `Bearer ${accessToken}` } }
    );
    console.log("[sync-google-calendar] deleted event:", eventId, delRes.status);
    return new Response(
      JSON.stringify({ ok: true, deleted: eventId }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // HANDLE SYNC — fetch Google events into calendar_blocks
  const now = new Date();
  const timeMin = new Date(now);
  timeMin.setDate(timeMin.getDate() - 7);
  const timeMax = new Date(now);
  timeMax.setDate(timeMax.getDate() + days_ahead);

  const params = new URLSearchParams({
    timeMin: timeMin.toISOString(),
    timeMax: timeMax.toISOString(),
    singleEvents: "true",
    orderBy: "startTime",
    maxResults: "500",
  });

  const eventsRes = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?${params}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  if (!eventsRes.ok) {
    const errText = await eventsRes.text();
    console.error("[sync-google-calendar] fetch failed", eventsRes.status, errText);
    return new Response(
      JSON.stringify({ error: "google api error", status: eventsRes.status }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const eventsData = await eventsRes.json();
  const items = (eventsData.items ?? []).filter((i: any) => i.status !== "cancelled");

  console.log(`[sync-google-calendar] fetched ${items.length} events for ${instructor_id}`);

  // Clear existing external calendar blocks in range
  await supabase
    .from("calendar_blocks")
    .delete()
    .eq("instructor_id", instructor_id)
    .eq("source", "external_calendar")
    .gte("start_datetime", timeMin.toISOString())
    .lte("start_datetime", timeMax.toISOString());

  let synced = 0;
  if (items.length > 0) {
    const rows = items.map((item: any) => {
      const isAllDay = !item.start?.dateTime;
      const startRaw = item.start?.dateTime ?? `${item.start?.date}T00:00:00`;
      const endRaw = item.end?.dateTime ?? `${item.end?.date}T23:59:59`;
      return {
        instructor_id,
        source: "external_calendar",
        title: item.summary ?? "Google event",
        description: item.description ?? null,
        location: item.location ?? null,
        start_datetime: startRaw,
        end_datetime: endRaw,
        is_all_day: isAllDay,
        colour: null,
        blocks_availability: true,
      };
    });

    // Insert in batches of 50 to avoid hitting limits
    for (let i = 0; i < rows.length; i += 50) {
      const batch = rows.slice(i, i + 50);
      const { error } = await supabase.from("calendar_blocks").insert(batch);
      if (error) {
        console.error("[sync-google-calendar] insert error", error.message);
      } else {
        synced += batch.length;
      }
    }
  }

  // Update last synced
  await supabase.from("instructors").update({
    calendar_last_synced: new Date().toISOString(),
  }).eq("id", instructor_id);

  console.log(`[sync-google-calendar] done: ${synced} events synced`);

  return new Response(
    JSON.stringify({ ok: true, success: true, synced, eventsImported: synced }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
