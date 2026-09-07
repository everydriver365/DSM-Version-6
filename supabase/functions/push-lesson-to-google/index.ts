import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// --- Europe/London wall-clock helpers (mirror of src/lib/londonTime.ts) ---
// Lesson times are naive UK wall-clock values. They must be sent to Google as
// wall-clock + timeZone, never as a "Z" instant: a "Z" makes Google ignore the
// timeZone field, which shifted every BST lesson by one hour.
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
function londonWallToUtcMs(date: string, time: string): number {
  const [y, mo, d] = date.split("-").map(Number);
  const [h, mi, s] = time.split(":").map(Number);
  const guess = Date.UTC(y, mo - 1, d, h, mi, Number.isFinite(s) ? s : 0);
  let ms = guess - londonOffsetMs(guess);
  ms = guess - londonOffsetMs(ms);
  return ms;
}
const pad = (n: number) => String(n).padStart(2, "0");
function utcMsToLondonWall(utcMs: number): string {
  const d = new Date(utcMs + londonOffsetMs(utcMs));
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}` +
    `T${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`;
}
function lessonWallRange(lessonDate: string, lessonTime: string, durationMinutes: number) {
  const [y, mo, d] = lessonDate.split("-").map(Number);
  const [h, mi, s] = lessonTime.split(":").map(Number);
  const start = `${y}-${pad(mo)}-${pad(d)}T${pad(h)}:${pad(mi)}:${pad(Number.isFinite(s) ? s : 0)}`;
  const endMs = londonWallToUtcMs(lessonDate, lessonTime) + durationMinutes * 60000;
  return { start, end: utcMsToLondonWall(endMs), timeZone: LONDON };
}


Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { lesson_id, instructor_id } = await req.json();
  if (!lesson_id || !instructor_id) {
    return new Response(JSON.stringify({ error: "lesson_id and instructor_id required" }), { status: 400, headers: corsHeaders });
  }

  // Get instructor Google tokens
  const { data: instructor } = await supabase
    .from("instructors")
    .select("google_access_token, google_refresh_token, google_token_expiry, google_calendar_id, google_calendar_connected")
    .eq("id", instructor_id)
    .single();

  if (!instructor?.google_calendar_connected || !instructor?.google_access_token) {
    return new Response(JSON.stringify({ ok: true, skipped: "no google calendar" }), { headers: corsHeaders });
  }

  // Get lesson details
  const { data: lesson } = await supabase
    .from("lessons")
    .select("id, lesson_date, lesson_time, duration_minutes, lesson_type, event_title, pickup_location, notes, google_event_id, pupils(name)")
    .eq("id", lesson_id)
    .single();

  if (!lesson) {
    return new Response(JSON.stringify({ error: "Lesson not found" }), { status: 404, headers: corsHeaders });
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

  // Build event — wall-clock time + explicit Europe/London (no "Z" instant)
  const isEvent = lesson.lesson_type === "event";
  const title = isEvent ? (lesson.event_title ?? "Event") : `Lesson — ${(lesson.pupils as any)?.name ?? "Pupil"}`;
  const range = lessonWallRange(
    String(lesson.lesson_date),
    String(lesson.lesson_time ?? "00:00:00"),
    lesson.duration_minutes ?? 60,
  );

  const event = {
    summary: title,
    location: lesson.pickup_location ?? undefined,
    description: lesson.notes ?? undefined,
    start: { dateTime: range.start, timeZone: range.timeZone },
    end: { dateTime: range.end, timeZone: range.timeZone },
    // Marks this event as owned by EveryDriver so the importer can recognise
    // its own lessons coming back from Google instead of guessing by time.
    extendedProperties: {
      private: {
        everydriver_origin: "EVERYDRIVER",
        everydriver_lesson_id: String(lesson.id),
      },
    },
  };


  const calendarId = instructor.google_calendar_id ?? "primary";

  let calRes;
  if (lesson.google_event_id) {
    calRes = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${lesson.google_event_id}`,
      { method: "PUT", headers: { "Authorization": `Bearer ${accessToken}`, "Content-Type": "application/json" }, body: JSON.stringify(event) }
    );
  } else {
    calRes = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`,
      { method: "POST", headers: { "Authorization": `Bearer ${accessToken}`, "Content-Type": "application/json" }, body: JSON.stringify(event) }
    );
  }

  const calData = await calRes.json();

  if (calData.id) {
    await supabase.from("lessons").update({ google_event_id: calData.id }).eq("id", lesson_id);
  }

  console.log("[push-lesson-to-google] done:", calData.id ?? JSON.stringify(calData.error));

  return new Response(JSON.stringify({ ok: true, eventId: calData.id }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
});
