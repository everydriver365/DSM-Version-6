import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// --- Europe/London helpers (mirror of src/lib/londonTime.ts) ---
const LONDON = "Europe/London";
function londonOffsetMs(utcMs: number): number {
  const dtf = new Intl.DateTimeFormat("en-GB", {
    timeZone: LONDON, hour12: false,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
  const p: Record<string, string> = {};
  for (const part of dtf.formatToParts(new Date(utcMs))) p[part.type] = part.value;
  const asUtc = Date.UTC(
    Number(p.year), Number(p.month) - 1, Number(p.day),
    Number(p.hour) % 24, Number(p.minute), Number(p.second),
  );
  return asUtc - utcMs;
}
/** London midnight on the given YYYY-MM-DD, as an ISO instant. */
function londonMidnightIso(date: string): string {
  const [y, mo, d] = date.split("-").map(Number);
  const guess = Date.UTC(y, mo - 1, d, 0, 0, 0);
  let ms = guess - londonOffsetMs(guess);
  ms = guess - londonOffsetMs(ms);
  return new Date(ms).toISOString();
}


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

  const instructor_id = body.instructor_id || body.instructorId;
  const action = body.action ?? "sync";

  if (!instructor_id) {
    return new Response(
      JSON.stringify({ error: "instructor_id required" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

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

  // HANDLE SYNC
  const now = new Date();
  const timeMin = new Date(now);
  timeMin.setDate(timeMin.getDate() - 60);
  const timeMax = new Date(now);
  timeMax.setDate(timeMax.getDate() + 180);

  const params = new URLSearchParams({
    timeMin: timeMin.toISOString(),
    timeMax: timeMax.toISOString(),
    singleEvents: "true",
    orderBy: "startTime",
    maxResults: "2500",
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
  const allItems = (eventsData.items ?? []).filter((i: any) => i.status !== "cancelled");

  // Events EveryDriver itself pushed must never come back as "external busy":
  // the lesson already occupies that time. Recognise them by our own marker
  // and, for older events created before the marker existed, by the stored
  // lesson -> Google event mapping.
  const { data: ownedRows } = await supabase
    .from("lessons")
    .select("google_event_id")
    .eq("instructor_id", instructor_id)
    .not("google_event_id", "is", null);
  const ownedIds = new Set((ownedRows ?? []).map((r: any) => r.google_event_id));

  const items = allItems.filter((i: any) => {
    const marked = i.extendedProperties?.private?.everydriver_origin === "EVERYDRIVER";
    return !marked && !ownedIds.has(i.id);
  });

  console.log(
    `[sync-google-calendar] fetched ${allItems.length} events, ${allItems.length - items.length} own lessons skipped`
  );

  // Match-and-update rather than wipe-and-reinsert: each imported row keeps a
  // permanent link to its Google event, so the diary never flickers and
  // availability never briefly frees up time that is actually busy.
  const syncStartedAt = new Date().toISOString();
  const windowStart = timeMin.toISOString();
  const windowEnd = timeMax.toISOString();

  const { data: existingRows, error: existingError } = await supabase
    .from("calendar_blocks")
    .select("id, external_event_id")
    .eq("instructor_id", instructor_id)
    .eq("source", "external_calendar");

  if (existingError) {
    console.error("[sync-google-calendar] read existing error", existingError.message);
  }

  const existingByEventId = new Map<string, string>();
  for (const row of existingRows ?? []) {
    if (row.external_event_id) existingByEventId.set(row.external_event_id, row.id);
  }

  const rowFor = (item: any) => {
    const isAllDay = !item.start?.dateTime;
    // Timed events carry their own UTC offset from Google. All-day events
    // give a date only, with an exclusive end date — anchor both to London
    // midnight so availability maths is right in GMT and BST alike.
    const startRaw = item.start?.dateTime ?? londonMidnightIso(item.start?.date);
    const endRaw = item.end?.dateTime ?? londonMidnightIso(item.end?.date);
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
      external_event_id: item.id ?? null,
      external_calendar_id: calendarId,
      external_updated_at: item.updated ?? null,
      last_synced_at: syncStartedAt,
    };
  };

  let synced = 0;
  const seenEventIds = new Set<string>();
  const toInsert: any[] = [];

  for (const item of items) {
    const row = rowFor(item);
    if (row.external_event_id) seenEventIds.add(row.external_event_id);
    const existingId = row.external_event_id
      ? existingByEventId.get(row.external_event_id)
      : undefined;

    if (existingId) {
      const { error } = await supabase
        .from("calendar_blocks")
        .update(row)
        .eq("id", existingId);
      if (error) {
        console.error("[sync-google-calendar] update error", error.message);
      } else {
        synced += 1;
      }
    } else {
      toInsert.push(row);
    }
  }

  for (let i = 0; i < toInsert.length; i += 100) {
    const batch = toInsert.slice(i, i + 100);
    const { error } = await supabase.from("calendar_blocks").insert(batch);
    if (error) {
      console.error("[sync-google-calendar] insert error", error.message);
    } else {
      synced += batch.length;
    }
  }

  // Remove only what Google no longer has: rows in the synced window whose
  // event has gone (deleted or cancelled), plus legacy rows that predate the
  // Google id and have just been re-imported with one.
  const staleIds = (existingRows ?? [])
    .filter((r: any) => !r.external_event_id || !seenEventIds.has(r.external_event_id))
    .map((r: any) => r.id);

  let removed = 0;
  for (let i = 0; i < staleIds.length; i += 100) {
    const batch = staleIds.slice(i, i + 100);
    const { error, count } = await supabase
      .from("calendar_blocks")
      .delete({ count: "exact" })
      .in("id", batch)
      .eq("instructor_id", instructor_id)
      .eq("source", "external_calendar")
      .gte("start_datetime", windowStart)
      .lte("start_datetime", windowEnd);
    if (error) {
      console.error("[sync-google-calendar] delete error", error.message);
    } else {
      removed += count ?? batch.length;
    }
  }


  await supabase.from("instructors").update({
    calendar_last_synced: new Date().toISOString(),
  }).eq("id", instructor_id);

  console.log(`[sync-google-calendar] done: ${synced} synced, ${removed} removed`);

  return new Response(
    JSON.stringify({ ok: true, success: true, synced, removed, eventsImported: synced }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});

