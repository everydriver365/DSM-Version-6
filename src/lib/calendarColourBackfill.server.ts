/**
 * Colour pass over imported Google events: copies each event's colour onto the
 * matching `calendar_blocks` row (source = 'external_calendar').
 *
 * Runs after every Google sync. Server-only: talks to Google with the
 * instructor's stored OAuth token and writes ONLY the `colour` column.
 */

import process from "node:process";
import { createAuthenticatedSupabaseClient } from "./carplay-auth.server";

const DEFAULT_DAYS_BACK = 90;
const DEFAULT_DAYS_FORWARD = 180;

// Google's standard event colour palette (colorId 1-11).
const EVENT_COLOURS: Record<string, string> = {
  "1": "#7986CB",
  "2": "#33B679",
  "3": "#8E24AA",
  "4": "#E67C73",
  "5": "#F6BF26",
  "6": "#F4511E",
  "7": "#039BE5",
  "8": "#616161",
  "9": "#3F51B5",
  "10": "#0B8043",
  "11": "#D50000",
};

export type BackfillResult = {
  success: boolean;
  updated: number;
  scanned: number;
  blocks: number;
  error?: string;
};

type Row = Record<string, unknown> | null;

function pick(row: Row, keys: string[]): string | null {
  if (!row) return null;
  for (const k of keys) {
    const v = row[k];
    if (typeof v === "string" && v.trim()) return v;
  }
  return null;
}

async function refreshAccessToken(refreshToken: string): Promise<string | null> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;
  try {
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
      }),
    });
    if (!res.ok) {
      console.error("[colour-backfill] token refresh failed", res.status, await res.text());
      return null;
    }
    const data = (await res.json()) as { access_token?: string };
    return typeof data.access_token === "string" ? data.access_token : null;
  } catch (err) {
    console.error("[colour-backfill] token refresh error", err);
    return null;
  }
}

type GEvent = {
  summary?: string;
  colorId?: string;
  start?: { dateTime?: string; date?: string };
};

export async function backfillGoogleEventColours(
  accessToken: string,
  window?: { daysBack?: number; daysForward?: number },
): Promise<BackfillResult> {
  const empty = { updated: 0, scanned: 0, blocks: 0 };
  const supabase = createAuthenticatedSupabaseClient(accessToken);

  const { data: userData, error: userErr } = await supabase.auth.getUser();
  const instructorId = userData?.user?.id;
  if (userErr || !instructorId) {
    return { success: false, ...empty, error: "Unauthorized" };
  }

  // --- Google credentials -------------------------------------------------
  const { data: connRow } = await supabase
    .from("google_calendar_connections")
    .select("*")
    .eq("instructor_id", instructorId)
    .maybeSingle();

  const { data: instrRow } = await supabase
    .from("instructors")
    .select(
      "google_access_token, google_refresh_token, google_calendar_id, google_token_expiry",
    )
    .eq("id", instructorId)
    .maybeSingle();

  const conn = (connRow ?? null) as Row;
  const instr = (instrRow ?? null) as Row;

  let googleToken =
    pick(conn, ["access_token", "google_access_token"]) ??
    pick(instr, ["google_access_token"]);
  const refreshToken =
    pick(conn, ["refresh_token", "google_refresh_token"]) ??
    pick(instr, ["google_refresh_token"]);
  const calendarId =
    pick(conn, ["calendar_id", "google_calendar_id"]) ??
    pick(instr, ["google_calendar_id"]) ??
    "primary";
  const expiry =
    pick(conn, ["token_expiry", "expires_at", "google_token_expiry"]) ??
    pick(instr, ["google_token_expiry"]);

  if (!googleToken && !refreshToken) {
    return { success: false, ...empty, error: "Google Calendar is not connected" };
  }

  const expired =
    !googleToken || (expiry ? new Date(expiry).getTime() <= Date.now() + 60_000 : false);
  if (expired && refreshToken) {
    const fresh = await refreshAccessToken(refreshToken);
    if (fresh) googleToken = fresh;
  }
  if (!googleToken) {
    return { success: false, ...empty, error: "Could not obtain a Google access token" };
  }

  // --- Fetch the last 90 days of Google events ---------------------------
  const timeMax = new Date();
  const timeMin = new Date(timeMax.getTime() - DAYS_BACK * 24 * 3600_000);
  const events: GEvent[] = [];

  try {
    let pageToken: string | undefined;
    do {
      const url = new URL(
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`,
      );
      url.searchParams.set("timeMin", timeMin.toISOString());
      url.searchParams.set("timeMax", timeMax.toISOString());
      url.searchParams.set("singleEvents", "true");
      url.searchParams.set("maxResults", "250");
      if (pageToken) url.searchParams.set("pageToken", pageToken);

      const res = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${googleToken}` },
      });
      if (!res.ok) {
        const body = await res.text();
        console.error("[colour-backfill] google list failed", res.status, body);
        return {
          success: false,
          ...empty,
          error: `Google request failed [${res.status}]: ${body.slice(0, 300)}`,
        };
      }
      const data = (await res.json()) as { items?: GEvent[]; nextPageToken?: string };
      if (Array.isArray(data.items)) events.push(...data.items);
      pageToken = typeof data.nextPageToken === "string" ? data.nextPageToken : undefined;
    } while (pageToken);
  } catch (err) {
    console.error("[colour-backfill] google fetch error", err);
    return { success: false, ...empty, error: "Could not reach Google Calendar" };
  }

  // --- Existing imported rows in the same window -------------------------
  const { data: blocks, error: blocksErr } = await supabase
    .from("calendar_blocks")
    .select("id, title, start_datetime, colour")
    .eq("instructor_id", instructorId)
    .eq("source", "external_calendar")
    .gte("start_datetime", timeMin.toISOString())
    .lte("start_datetime", timeMax.toISOString());

  if (blocksErr) {
    console.error("[colour-backfill] blocks fetch failed", blocksErr.message);
    return { success: false, ...empty, scanned: events.length, error: blocksErr.message };
  }

  const rows = (blocks ?? []) as {
    id: string;
    title: string | null;
    start_datetime: string;
    colour: string | null;
  }[];

  const keyOf = (startIso: string, title: string | null) =>
    `${new Date(startIso).getTime()}|${(title ?? "").trim().toLowerCase()}`;

  // Group by start+title; duplicate keys are ambiguous and get skipped.
  const byKey = new Map<string, { id: string; colour: string | null }[]>();
  for (const b of rows) {
    if (!b.start_datetime) continue;
    const k = keyOf(b.start_datetime, b.title);
    const list = byKey.get(k) ?? [];
    list.push({ id: b.id, colour: b.colour });
    byKey.set(k, list);
  }

  let updated = 0;
  for (const ev of events) {
    const startIso =
      ev.start?.dateTime ?? (ev.start?.date ? `${ev.start.date}T00:00:00Z` : null);
    if (!startIso) continue;
    const colour = ev.colorId ? EVENT_COLOURS[ev.colorId] : undefined;
    if (!colour) continue;

    const matches = byKey.get(keyOf(startIso, ev.summary ?? null));
    if (!matches || matches.length !== 1) continue; // missing or ambiguous — skip
    const target = matches[0];
    if (!target || target.colour === colour) continue;

    const { error: updErr } = await supabase
      .from("calendar_blocks")
      .update({ colour })
      .eq("id", target.id);
    if (updErr) {
      console.error("[colour-backfill] update failed", target.id, updErr.message);
      continue;
    }
    updated += 1;
  }

  return { success: true, updated, scanned: events.length, blocks: rows.length };
}
