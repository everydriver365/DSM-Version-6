// Supabase Edge Function: ics-feed
// GET /functions/v1/ics-feed?instructor_id=<uuid>
// Returns a valid ICS calendar feed of the instructor's lessons.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

function pad(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

function fmtUtc(d: Date): string {
  return (
    `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}` +
    `T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`
  );
}

// Convert a London wall-clock date+time to the corresponding UTC instant.
// London is either UTC+0 (GMT) or UTC+1 (BST); try both and verify by
// formatting the candidate back to Europe/London wall time.
function londonWallToUtc(dateStr: string, timeStr: string): Date {
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
    const candidate = new Date(naiveUtc.getTime() + offsetH * 3600_000);
    const parts = fmt.formatToParts(candidate);
    const m: Record<string, string> = {};
    for (const p of parts) m[p.type] = p.value;
    const wall = `${m.year}-${m.month}-${m.day}T${m.hour}:${m.minute}`;
    if (wall === `${dateStr}T${hhmm}`) return candidate;
  }
  return naiveUtc;
}

function escapeText(s: string): string {
  return String(s ?? "")
    .replace(/\\/g, "\\\\")
    .replace(/\r?\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

function foldLine(line: string): string {
  // RFC 5545: lines > 75 octets must be folded with CRLF + space.
  if (line.length <= 75) return line;
  const out: string[] = [];
  let i = 0;
  while (i < line.length) {
    out.push((i === 0 ? "" : " ") + line.slice(i, i + 73));
    i += 73;
  }
  return out.join("\r\n");
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "GET") {
    return new Response("Method not allowed", { status: 405, headers: CORS });
  }

  const url = new URL(req.url);
  const instructorId = url.searchParams.get("instructor_id");
  if (!instructorId) {
    return new Response("Missing instructor_id", { status: 400, headers: CORS });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey =
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ??
    Deno.env.get("SUPABASE_ANON_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey);

  const { data: lessons, error } = await supabase
    .from("lessons")
    .select("id, lesson_date, lesson_time, duration_minutes, status, pupil_id, pupils(name)")
    .eq("instructor_id", instructorId)
    .is("deleted_at", null)
    .neq("status", "cancelled")
    .order("lesson_date", { ascending: true })
    .order("lesson_time", { ascending: true });

  if (error) {
    return new Response(`Error: ${error.message}`, { status: 500, headers: CORS });
  }

  const now = fmtUtc(new Date());
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//DSM by EveryDriver//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:DSM Lessons",
    "NAME:DSM Lessons",
  ];

  for (const l of (lessons ?? []) as Array<{
    id: string;
    lesson_date: string;
    lesson_time: string;
    duration_minutes: number | null;
    status: string | null;
    pupils: { name: string | null } | { name: string | null }[] | null;
  }>) {
    if (!l.lesson_date || !l.lesson_time) continue;
    const duration = l.duration_minutes ?? 60;
    const start = londonWallToUtc(l.lesson_date, l.lesson_time);
    const end = new Date(start.getTime() + duration * 60_000);
    const pupil = Array.isArray(l.pupils) ? l.pupils[0] : l.pupils;
    const pupilName = pupil?.name ?? "Pupil";
    const hours = (duration / 60).toFixed(duration % 60 === 0 ? 0 : 1);

    lines.push("BEGIN:VEVENT");
    lines.push(`UID:${l.id}@everydriver.co.uk`);
    lines.push(`DTSTAMP:${now}`);
    lines.push(`DTSTART:${fmtUtc(start)}`);
    lines.push(`DTEND:${fmtUtc(end)}`);
    lines.push(foldLine(`SUMMARY:${escapeText(`${pupilName} - Driving lesson`)}`));
    lines.push(
      foldLine(
        `DESCRIPTION:${escapeText(
          `Duration: ${hours}h\nStatus: ${l.status ?? "confirmed"}`,
        )}`,
      ),
    );
    lines.push("END:VEVENT");
  }

  lines.push("END:VCALENDAR");

  const body = lines.join("\r\n") + "\r\n";

  return new Response(body, {
    status: 200,
    headers: {
      ...CORS,
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'attachment; filename="dsm-lessons.ics"',
      "Cache-Control": "public, max-age=300",
    },
  });
});
