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

  const json = (payload: unknown, status = 200) =>
    new Response(JSON.stringify(payload), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  let body: any = {};
  try { body = await req.json(); } catch {}

  const instructor_id = body.instructor_id || body.instructorId;
  const action = body.action ?? "sync";

  if (!instructor_id) {
    return json({ error: "instructor_id required" }, 400);
  }

  const { data: instructor } = await supabase
    .from("instructors")
    .select(
      "google_access_token, google_refresh_token, google_token_expiry, google_calendar_id, google_calendar_ids, google_calendar_connected, google_sync_token, google_sync_tokens, google_channels"
    )
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
    return json({ ok: true, skipped: "no google calendar connected" });
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
      return json({ error: "google auth error", message: reason, status: 401, reconnect: true });
    }
  }

  const gcal = (path: string, init?: RequestInit) =>
    fetch(`https://www.googleapis.com/calendar/v3${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        ...(init?.headers ?? {}),
      },
    });

  // Calendars to import. Multiple calendars are supported; the legacy single
  // google_calendar_id is the fallback so nothing breaks before the user picks.
  const selected: string[] =
    Array.isArray(instructor.google_calendar_ids) && instructor.google_calendar_ids.length
      ? instructor.google_calendar_ids.filter(Boolean)
      : [instructor.google_calendar_id ?? "primary"];
  const legacyCalendar = selected[0];

  // ---------- ACTION: list the instructor's Google calendars ----------
  if (action === "list_calendars") {
    const res = await gcal("/users/me/calendarList?maxResults=250&minAccessRole=reader");
    if (!res.ok) {
      const text = await res.text();
      console.error("[sync-google-calendar] calendarList failed", res.status, text);
      await recordSyncError(text.slice(0, 500), res.status === 401 || res.status === 403);
      return json({ error: "google api error", status: res.status, message: text.slice(0, 500) });
    }
    const list = await res.json();
    return json({
      ok: true,
      selected,
      calendars: (list.items ?? []).map((c: any) => ({
        id: c.id,
        summary: c.summaryOverride ?? c.summary,
        primary: Boolean(c.primary),
        backgroundColor: c.backgroundColor ?? null,
      })),
    });
  }

  const channels: Record<string, any> = (instructor.google_channels ?? {}) as any;

  // ---------- ACTION: register/renew push channels (instant updates) ----------
  if (action === "watch" || action === "unwatch") {
    // Google only accepts push callbacks on an HTTPS domain you own and have
    // verified, so the app's own domain hosts the receiver.
    const webhookUrl =
      body.webhook_url ??
      Deno.env.get("GOOGLE_WEBHOOK_URL") ??
      "https://app.everydriver.pro/api/public/google-calendar-webhook";
    const next: Record<string, any> = { ...channels };
    const stop = async (info: any) => {
      if (!info?.channelId || !info?.resourceId) return;
      await gcal("/channels/stop", {
        method: "POST",
        body: JSON.stringify({ id: info.channelId, resourceId: info.resourceId }),
      }).catch(() => undefined);
    };

    if (action === "unwatch") {
      for (const info of Object.values(next)) await stop(info);
      await supabase.from("instructors").update({ google_channels: {} }).eq("id", instructor_id);
      return json({ ok: true, watching: [] });
    }

    // Drop channels for calendars no longer selected.
    for (const [calId, info] of Object.entries(next)) {
      if (!selected.includes(calId)) {
        await stop(info);
        delete next[calId];
      }
    }

    const failures: Record<string, string> = {};
    for (const calId of selected) {
      const existing = next[calId];
      const stillFresh =
        existing?.expiration && Number(existing.expiration) - Date.now() > 24 * 60 * 60 * 1000;
      if (stillFresh && body.force !== true) continue;
      if (existing) await stop(existing);

      const channelId = crypto.randomUUID();
      const res = await gcal(`/calendars/${encodeURIComponent(calId)}/events/watch`, {
        method: "POST",
        body: JSON.stringify({
          id: channelId,
          type: "web_hook",
          address: webhookUrl,
          token: instructor_id,
          params: { ttl: "604800" }, // 7 days, Google's maximum
        }),
      });
      if (!res.ok) {
        const text = await res.text();
        console.error("[sync-google-calendar] watch failed", calId, res.status, text);
        failures[calId] = text.slice(0, 300);
        continue;
      }
      const info = await res.json();
      next[calId] = {
        channelId,
        resourceId: info.resourceId,
        expiration: info.expiration ? Number(info.expiration) : null,
      };
    }

    await supabase.from("instructors").update({ google_channels: next }).eq("id", instructor_id);
    return json({
      ok: Object.keys(failures).length === 0,
      watching: Object.keys(next),
      failures,
    });
  }

  // ---------- ACTION: delete a pushed lesson event ----------
  if (action === "delete") {
    const eventId = body.google_event_id ?? (await supabase
      .from("lessons")
      .select("google_event_id")
      .eq("id", body.lesson_id)
      .single()
    ).data?.google_event_id;

    if (!eventId) return json({ ok: true, skipped: "no event to delete" });

    const calendarId = instructor.google_calendar_id ?? legacyCalendar ?? "primary";
    const delRes = await gcal(
      `/calendars/${encodeURIComponent(calendarId)}/events/${eventId}`,
      { method: "DELETE" }
    );
    console.log("[sync-google-calendar] deleted event:", eventId, delRes.status);
    return json({ ok: true, deleted: eventId });
  }

  // ---------- ACTION: sync ----------
  const now = new Date();
  const timeMin = new Date(now);
  timeMin.setDate(timeMin.getDate() - 60);
  const timeMax = new Date(now);
  timeMax.setDate(timeMax.getDate() + 180);
  const windowStart = timeMin.toISOString();
  const windowEnd = timeMax.toISOString();

  const forceFull = body.full === true;
  const storedTokens: Record<string, string> = {
    ...((instructor.google_sync_tokens ?? {}) as Record<string, string>),
  };
  // Carry the pre-multi-calendar single token over to the first calendar.
  if (!storedTokens[legacyCalendar] && instructor.google_sync_token) {
    storedTokens[legacyCalendar] = instructor.google_sync_token;
  }

  // Events EveryDriver itself pushed must never come back as "external busy":
  // the lesson already occupies that time.
  const { data: ownedRows } = await supabase
    .from("lessons")
    .select("google_event_id")
    .eq("instructor_id", instructor_id)
    .not("google_event_id", "is", null);
  const ownedIds = new Set((ownedRows ?? []).map((r: any) => r.google_event_id));

  const { data: existingRows, error: existingError } = await supabase
    .from("calendar_blocks")
    .select("id, external_event_id, external_calendar_id")
    .eq("instructor_id", instructor_id)
    .eq("source", "external_calendar");

  if (existingError) {
    console.error("[sync-google-calendar] read existing error", existingError.message);
  }

  const syncStartedAt = new Date().toISOString();
  const nextTokens: Record<string, string> = {};
  let synced = 0;
  let removed = 0;
  let anyIncremental = false;
  let hardError: { status: number; message: string } | null = null;

  const deleteRowIds = async (ids: string[], windowed: boolean) => {
    for (let i = 0; i < ids.length; i += 100) {
      const batch = ids.slice(i, i + 100);
      let q = supabase
        .from("calendar_blocks")
        .delete({ count: "exact" })
        .in("id", batch)
        .eq("instructor_id", instructor_id)
        .eq("source", "external_calendar");
      if (windowed) q = q.gte("start_datetime", windowStart).lte("start_datetime", windowEnd);
      const { error, count } = await q;
      if (error) console.error("[sync-google-calendar] delete error", error.message);
      else removed += count ?? batch.length;
    }
  };

  /** Read every page Google offers for one calendar. */
  async function readEvents(calendarId: string, token: string | null): Promise<
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
        params.set("timeMin", windowStart);
        params.set("timeMax", windowEnd);
        params.set("orderBy", "startTime");
      }
      if (pageToken) params.set("pageToken", pageToken);

      const res = await gcal(`/calendars/${encodeURIComponent(calendarId)}/events?${params}`);

      if (!res.ok) {
        const errText = await res.text();
        console.error("[sync-google-calendar] fetch failed", calendarId, res.status, errText);
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

  for (const calendarId of selected) {
    const isLegacy = calendarId === legacyCalendar;
    // Rows belonging to this calendar; rows imported before calendars were
    // tracked have no id and belong to the original single calendar.
    const rowsForCalendar = (existingRows ?? []).filter(
      (r: any) => r.external_calendar_id === calendarId || (isLegacy && !r.external_calendar_id)
    );
    const existingByEventId = new Map<string, string>();
    for (const row of rowsForCalendar) {
      if (row.external_event_id) existingByEventId.set(row.external_event_id, row.id);
    }

    let token = forceFull ? null : (storedTokens[calendarId] ?? null);
    let read = await readEvents(calendarId, token);
    if (!read.ok && read.expiredToken) {
      console.log("[sync-google-calendar] sync token expired — full read", calendarId);
      token = null;
      read = await readEvents(calendarId, null);
    }
    if (!read.ok) {
      hardError = { status: read.status, message: read.message };
      continue;
    }

    const incremental = read.incremental;
    anyIncremental = anyIncremental || incremental;
    if (read.nextSyncToken) nextTokens[calendarId] = read.nextSyncToken;
    else if (incremental && token) nextTokens[calendarId] = token;

    const cancelledIds: string[] = read.items
      .filter((i: any) => i.status === "cancelled" && i.id)
      .map((i: any) => i.id);
    const allItems = read.items.filter((i: any) => i.status !== "cancelled");
    const items = allItems.filter((i: any) => {
      const marked = i.extendedProperties?.private?.everydriver_origin === "EVERYDRIVER";
      return !marked && !ownedIds.has(i.id);
    });

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

    const seenEventIds = new Set<string>();
    const toInsert: any[] = [];

    for (const item of items) {
      const row = rowFor(item);
      if (row.external_event_id) seenEventIds.add(row.external_event_id);
      const existingId = row.external_event_id
        ? existingByEventId.get(row.external_event_id)
        : undefined;

      if (existingId) {
        const { error } = await supabase.from("calendar_blocks").update(row).eq("id", existingId);
        if (error) console.error("[sync-google-calendar] update error", error.message);
        else synced += 1;
      } else {
        toInsert.push(row);
      }
    }

    for (let i = 0; i < toInsert.length; i += 100) {
      const batch = toInsert.slice(i, i + 100);
      const { error } = await supabase.from("calendar_blocks").insert(batch);
      if (error) console.error("[sync-google-calendar] insert error", error.message);
      else synced += batch.length;
    }

    if (incremental) {
      // Google tells us exactly what was cancelled or deleted — remove only those.
      const ids = cancelledIds
        .map((eventId) => existingByEventId.get(eventId))
        .filter((id): id is string => Boolean(id));
      await deleteRowIds(ids, false);
    } else {
      // Full read: remove what Google no longer has within the synced window,
      // plus legacy rows that predate the Google id and were just re-imported.
      const staleIds = rowsForCalendar
        .filter((r: any) => !r.external_event_id || !seenEventIds.has(r.external_event_id))
        .map((r: any) => r.id);
      await deleteRowIds(staleIds, true);
    }
  }

  // Rows from calendars the instructor has de-selected must not keep blocking time.
  const orphanIds = (existingRows ?? [])
    .filter(
      (r: any) =>
        r.external_calendar_id && !selected.includes(r.external_calendar_id)
    )
    .map((r: any) => r.id);
  if (orphanIds.length) await deleteRowIds(orphanIds, false);

  if (hardError && synced === 0) {
    const authProblem = hardError.status === 401 || hardError.status === 403;
    await recordSyncError(hardError.message || `google api error ${hardError.status}`, authProblem);
    return json({ error: "google api error", status: hardError.status, message: hardError.message });
  }

  await supabase.from("instructors").update({
    calendar_last_synced: new Date().toISOString(),
    google_sync_tokens: nextTokens,
    google_sync_token: nextTokens[legacyCalendar] ?? null,
    google_sync_error: hardError ? hardError.message : null,
    google_sync_error_at: hardError ? new Date().toISOString() : null,
  }).eq("id", instructor_id);

  console.log(
    `[sync-google-calendar] done (${anyIncremental ? "incremental" : "full"}) across ` +
      `${selected.length} calendar(s): ${synced} synced, ${removed} removed`
  );

  return json({
    ok: true,
    success: true,
    synced,
    removed,
    calendars: selected,
    incremental: anyIncremental,
    eventsImported: synced,
    ...(hardError ? { warning: hardError.message } : {}),
  });
});
