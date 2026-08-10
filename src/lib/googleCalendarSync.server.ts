import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://bjpqxfrihwjcqprmoqfs.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJqcHF4ZnJpaHdqY3Fwcm1vcWZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE0NzQ4MjEsImV4cCI6MjA5NzA1MDgyMX0.HKlgx3dxP3uxX9wMRRUnfb0IPwaBpFcut_iUgT5XFeo";

export const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
export const GOOGLE_CALENDAR_API = "https://www.googleapis.com/calendar/v3";

export function createAdminClient(): SupabaseClient | null {
  const serviceKey = process.env["SUPABASE_SERVICE_ROLE_KEY"];
  if (!serviceKey) return null;
  return createClient(SUPABASE_URL, serviceKey);
}

export function createPublishableClient(): SupabaseClient {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      storage: undefined,
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export async function verifyUserFromToken(token: string): Promise<{ id: string } | null> {
  const supabase = createPublishableClient();
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) {
    console.error("verifyUserFromToken failed:", error);
    return null;
  }
  return { id: data.user.id };
}

export async function refreshGoogleAccessToken(
  refreshToken: string,
  clientId: string,
  clientSecret: string,
): Promise<{ access_token: string; expires_in: number } | null> {
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error(`Google token refresh failed (${res.status}):`, text);
    return null;
  }

  return (await res.json()) as { access_token: string; expires_in: number };
}

export async function markConnectionDisconnected(
  supabase: SupabaseClient,
  instructorId: string,
  reason: string,
): Promise<void> {
  const { error } = await supabase
    .from("google_calendar_connections")
    .update({
      refresh_error: reason,
      disconnected_at: new Date().toISOString(),
      access_token: null,
      expires_at: null,
      last_synced_at: null,
    })
    .eq("instructor_id", instructorId);

  if (error) {
    console.error("Failed to mark connection disconnected:", error);
  }
}

export function londonWallToUtc(dateStr: string, timeStr: string): Date {
  const hhmm = timeStr.length >= 5 ? timeStr.slice(0, 5) : timeStr;
  const naiveUtc = new Date(`${dateStr}T${hhmm}:00Z`);
  const fmt = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

  for (const offsetH of [0, -1]) {
    const candidate = new Date(naiveUtc.getTime() + offsetH * 3_600_000);
    const parts = fmt.formatToParts(candidate);
    const m: Record<string, string> = {};
    for (const p of parts) m[p.type] = p.value;
    const wall = `${m.year}-${m.month}-${m.day}T${m.hour}:${m.minute}`;
    if (wall === `${dateStr}T${hhmm}`) return candidate;
  }
  return naiveUtc;
}

export async function syncLessonsToGoogleCalendar(
  supabase: SupabaseClient,
  accessToken: string,
  instructorId: string,
): Promise<{ created: number; updated: number; deleted: number; failed: number }> {
  const today = new Date().toISOString().split("T")[0];
  const { data: lessons, error } = await supabase
    .from("lessons")
    .select(
      "id, lesson_date, lesson_time, duration_minutes, status, pupil_id, google_event_id, pupils(name)",
    )
    .eq("instructor_id", instructorId)
    .is("deleted_at", null)
    .gte("lesson_date", today)
    .order("lesson_date", { ascending: true })
    .order("lesson_time", { ascending: true });

  if (error) throw error;

  let created = 0;
  let updated = 0;
  let deleted = 0;
  let failed = 0;

  for (const lesson of lessons || []) {
    const pupilName =
      (lesson.pupils as { name?: string } | null)?.name || "Pupil";
    const eventId = lesson.google_event_id;

    if (lesson.status === "cancelled") {
      if (eventId) {
        const res = await fetch(
          `${GOOGLE_CALENDAR_API}/calendars/primary/events/${encodeURIComponent(eventId)}`,
          {
            method: "DELETE",
            headers: { Authorization: `Bearer ${accessToken}` },
          },
        );
        if (res.ok || res.status === 404 || res.status === 410) {
          await supabase
            .from("lessons")
            .update({ google_event_id: null })
            .eq("id", lesson.id);
          deleted++;
        } else {
          console.error(
            "Failed to delete Google event",
            lesson.id,
            res.status,
            await res.text(),
          );
          failed++;
        }
      }
      continue;
    }

    const start = londonWallToUtc(lesson.lesson_date, lesson.lesson_time);
    const end = new Date(start.getTime() + (lesson.duration_minutes || 60) * 60_000);

    const eventBody = {
      summary: `Driving lesson — ${pupilName}`,
      start: { dateTime: start.toISOString(), timeZone: "Europe/London" },
      end: { dateTime: end.toISOString(), timeZone: "Europe/London" },
    };

    if (eventId) {
      const res = await fetch(
        `${GOOGLE_CALENDAR_API}/calendars/primary/events/${encodeURIComponent(eventId)}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(eventBody),
        },
      );
      if (res.ok) {
        updated++;
      } else if (res.status === 404 || res.status === 410) {
        const createRes = await fetch(`${GOOGLE_CALENDAR_API}/calendars/primary/events`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(eventBody),
        });
        if (createRes.ok) {
          const data = (await createRes.json()) as { id: string };
          await supabase.from("lessons").update({ google_event_id: data.id }).eq("id", lesson.id);
          created++;
        } else {
          console.error(
            "Failed to recreate Google event",
            lesson.id,
            createRes.status,
            await createRes.text(),
          );
          failed++;
        }
      } else {
        console.error("Failed to update Google event", lesson.id, res.status, await res.text());
        failed++;
      }
    } else {
      const res = await fetch(`${GOOGLE_CALENDAR_API}/calendars/primary/events`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(eventBody),
      });
      if (res.ok) {
        const data = (await res.json()) as { id: string };
        await supabase.from("lessons").update({ google_event_id: data.id }).eq("id", lesson.id);
        created++;
      } else {
        console.error("Failed to create Google event", lesson.id, res.status, await res.text());
        failed++;
      }
    }
  }

  return { created, updated, deleted, failed };
}

export type SyncResult =
  | {
      success: true;
      created: number;
      updated: number;
      deleted: number;
      failed: number;
      last_synced_at: string;
    }
  | {
      success: false;
      reconnect_required: true;
      reason: string;
    }
  | {
      success: false;
      reconnect_required: false;
      error: string;
    };

export async function performGoogleCalendarSync(
  supabase: SupabaseClient,
  instructorId: string,
  googleClientId: string,
  googleClientSecret: string,
): Promise<SyncResult> {
  const { data: connection, error: connError } = await supabase
    .from("google_calendar_connections")
    .select("instructor_id, refresh_token, access_token, expires_at, connected_at, last_synced_at")
    .eq("instructor_id", instructorId)
    .maybeSingle();

  if (connError) {
    console.error("DB error loading connection:", connError);
    return {
      success: false,
      reconnect_required: false,
      error: "Could not load Google Calendar connection.",
    };
  }

  if (!connection) {
    return {
      success: false,
      reconnect_required: true,
      reason: "No Google Calendar connection found for this instructor.",
    };
  }

  if (!connection.refresh_token) {
    await markConnectionDisconnected(supabase, instructorId, "Missing refresh token");
    return {
      success: false,
      reconnect_required: true,
      reason:
        "Your Google Calendar connection is missing its refresh token. Please reconnect.",
    };
  }

  const tokens = await refreshGoogleAccessToken(
    connection.refresh_token,
    googleClientId,
    googleClientSecret,
  );

  if (!tokens) {
    await markConnectionDisconnected(supabase, instructorId, "Google refresh token rejected");
    return {
      success: false,
      reconnect_required: true,
      reason:
        "Google rejected the stored refresh token. This usually happens when account permissions change or the OAuth consent screen is in Testing mode. Please reconnect Google Calendar.",
    };
  }

  const accessToken = tokens.access_token;
  const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();
  const now = new Date().toISOString();

  const { error: updateError } = await supabase
    .from("google_calendar_connections")
    .update({
      access_token: accessToken,
      expires_at: expiresAt,
      last_synced_at: now,
      refresh_error: null,
      disconnected_at: null,
    })
    .eq("instructor_id", instructorId);

  if (updateError) {
    console.error("Failed to update connection tokens:", updateError);
  }

  try {
    const syncResult = await syncLessonsToGoogleCalendar(supabase, accessToken, instructorId);
    return {
      success: true,
      ...syncResult,
      last_synced_at: now,
    };
  } catch (e) {
    console.error("Sync error:", e);
    return {
      success: false,
      reconnect_required: false,
      error: e instanceof Error ? e.message : "Failed to sync lessons to Google Calendar.",
    };
  }
}
