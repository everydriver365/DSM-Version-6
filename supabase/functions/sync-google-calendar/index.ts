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
    .select("google_access_token, google_refresh_token, google_token_expiry, google_calendar_id, google_calendar_connected, google_sync_token")
    .eq("id", instructor_id)
    .single();

  const recordSyncError = async (message: string, disconnect = false) => {
    const update: Record<string, unknown> = {
      google_sync_error: message.slice(0, 500),
      google_sync_error_at: new Date().toISOString(),
    };
    if (disconnect) update.google_calendar_connected = false;
    await supabase.from("instructors").update(update).eq("id", instructor_id);
  };

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
    } else {
      const reason = String(refreshData.error_description ?? refreshData.error ?? "token refresh failed");
      const revoked = /invalid_grant|unauthorized_client/i.test(String(refreshData.error ?? ""));
      console.error("[sync-google-calendar] refresh failed", reason);
      await recordSyncError(reason, revoked);
      return new Response(
        JSON.stringify({ error: "google auth error", message: reason, status: 401, reconnect: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
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

  const forceFull = body.full === true;
  let syncToken: string | null = forceFull ? null : (instructor.google_sync_token ?? null);

  /**
   * Read every page Google offers. With a sync token Google returns only what
   * changed since the last run; without one it returns the whole window.
   * A 410 means the token is too old, so we fall back to a full read.
   */
  async function readEvents(token: string | null): Promise<
    | { ok: true; items: any[]; nextSyncToken: string | null; incremental: boolean }
    | { ok: false; status: number; message: string; expiredToken: boolean }
  > {
    const items: any[] = [];
    let pageToken: string | undefined;
    let nextSyncToken: string | null = null;

    do {
      const params = new URLSearchParams({ singleEvents: "true", maxResults: "2500" });
      if (token) {
        params.set("syncToken", token);
      } else {
        params.set("timeMin", timeMin.toISOString());
        params.set("timeMax", timeMax.toISOString());
        params.set("orderBy", "startTime");
      }
      if (pageToken) params.set("pageToken", pageToken);

      const res = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?${params}`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );

      if (!res.ok) {
        const errText = await res.text();
        console.error("[sync-google-calendar] fetch failed", res.status, errText);
        let message = errText;
        try { message = JSON.parse(errText)?.error?.message ?? errText; } catch { /* keep raw */ }
        return {
          ok: false,
          status: res.status,
          message: String(message).slice(0, 500),
          expiredToken: res.status === 410 && Boolean(token),
        };
      }

      const page = await res.json();
      items.push(...(page.items ?? []));
      pageToken = page.nextPageToken ?? undefined;
      nextSyncToken = page.nextSyncToken ?? nextSyncToken;
    } while (pageToken);

    return { ok: true, items, nextSyncToken, incremental: Boolean(token) };
  }

  let read = await readEvents(syncToken);
  if (!read.ok && read.expiredToken) {
    console.log("[sync-google-calendar] sync token expired — falling back to a full read");
    syncToken = null;
    await supabase.from("instructors").update({ google_sync_token: null }).eq("id", instructor_id);
    read = await readEvents(null);
  }

  if (!read.ok) {
    const authProblem = read.status === 401 || read.status === 403;
    await recordSyncError(read.message || `google api error ${read.status}`, authProblem);
    return new Response(
      JSON.stringify({ error: "google api error", status: read.status, message: read.message }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const incremental = read.incremental;
  const cancelledIds: string[] = read.items
    .filter((i: any) => i.status === "cancelled" && i.id)
    .map((i: any) => i.id);
  const allItems = read.items.filter((i: any) => i.status !== "cancelled");

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
    `[sync-google-calendar] ${incremental ? "incremental" : "full"} read: ${allItems.length} events, ` +
      `${allItems.length - items.length} own lessons skipped, ${cancelledIds.length} cancelled`
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

  let removed = 0;

  const deleteByIds = async (ids: string[]) => {
    for (let i = 0; i < ids.length; i += 100) {
      const batch = ids.slice(i, i + 100);
      const { error, count } = await supabase
        .from("calendar_blocks")
        .delete({ count: "exact" })
        .in("id", batch)
        .eq("instructor_id", instructor_id)
        .eq("source", "external_calendar");
      if (error) {
        console.error("[sync-google-calendar] delete error", error.message);
      } else {
        removed += count ?? batch.length;
      }
    }
  };

  if (incremental) {
    // Google tells us exactly what was cancelled or deleted — remove only those.
    const ids = cancelledIds
      .map((eventId) => existingByEventId.get(eventId))
      .filter((id): id is string => Boolean(id));
    await deleteByIds(ids);
  } else {
    // Full read: remove what Google no longer has within the synced window,
    // plus legacy rows that predate the Google id and were just re-imported.
    const staleIds = (existingRows ?? [])
      .filter((r: any) => !r.external_event_id || !seenEventIds.has(r.external_event_id))
      .map((r: any) => r.id);

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
  }

  await supabase.from("instructors").update({
    calendar_last_synced: new Date().toISOString(),
    google_sync_token: read.nextSyncToken ?? (incremental ? syncToken : null),
    google_sync_error: null,
    google_sync_error_at: null,
  }).eq("id", instructor_id);

  console.log(
    `[sync-google-calendar] done (${incremental ? "incremental" : "full"}): ${synced} synced, ${removed} removed`
  );

  return new Response(
    JSON.stringify({
      ok: true,
      success: true,
      synced,
      removed,
      incremental,
      eventsImported: synced,
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );

});

