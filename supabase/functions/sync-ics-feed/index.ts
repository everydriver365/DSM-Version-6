import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function parseIcsDate(dtStr: string): string {
  dtStr = dtStr.trim();
  if (dtStr.length === 8) {
    return dtStr.slice(0, 4) + "-" + dtStr.slice(4, 6) + "-" + dtStr.slice(6, 8) + "T00:00:00Z";
  }
  const y = dtStr.slice(0, 4);
  const mo = dtStr.slice(4, 6);
  const d = dtStr.slice(6, 8);
  const h = parseInt(dtStr.slice(9, 11));
  const mi = dtStr.slice(11, 13);
  const s = dtStr.slice(13, 15) || "00";
  const isUTC = dtStr.endsWith("Z");
  if (isUTC) {
    return y + "-" + mo + "-" + d + "T" + String(h).padStart(2, "0") + ":" + mi + ":" + s + "Z";
  }
  const monthNum = parseInt(mo);
  const isBST = monthNum > 3 && monthNum < 10;
  const utcH = isBST ? h - 1 : h;
  return y + "-" + mo + "-" + d + "T" + String(utcH).padStart(2, "0") + ":" + mi + ":" + s + "Z";
}

function isAllDay(dtStr: string): boolean {
  return dtStr.trim().length === 8;
}

function unfoldLines(text: string): string[] {
  const result: string[] = [];
  const raw = text.split("\n");
  let current = "";
  for (const line of raw) {
    const stripped = line.replace(/\r$/, "");
    if (stripped.length > 0 && (stripped[0] === " " || stripped[0] === "\t")) {
      current += stripped.slice(1);
    } else {
      if (current) result.push(current);
      current = stripped;
    }
  }
  if (current) result.push(current);
  return result;
}

function parseIcs(text: string): Array<{
  uid: string;
  summary: string;
  dtstart: string;
  dtend: string;
  isAllDay: boolean;
  xEverydriverId?: string;
}> {
  const events: ReturnType<typeof parseIcs> = [];
  const lines = unfoldLines(text);
  let inEvent = false;
  let current: Record<string, string> = {};

  for (const line of lines) {
    if (line === "BEGIN:VEVENT") {
      inEvent = true;
      current = {};
      continue;
    }
    if (line === "END:VEVENT") {
      inEvent = false;
      if (current.DTSTART && current.DTEND && current.UID) {
        events.push({
          uid: current.UID,
          summary: current.SUMMARY || "",
          dtstart: parseIcsDate(current.DTSTART),
          dtend: parseIcsDate(current.DTEND),
          isAllDay: isAllDay(current.DTSTART),
          xEverydriverId: current["X-EVERYDRIVER-ID"] || undefined,
        });
      }
      continue;
    }
    if (!inEvent) continue;
    const colonIdx = line.indexOf(":");
    if (colonIdx === -1) continue;
    let key = line.slice(0, colonIdx).toUpperCase();
    const value = line.slice(colonIdx + 1);
    if (key.startsWith("DTSTART")) key = "DTSTART";
    if (key.startsWith("DTEND")) key = "DTEND";
    current[key] = value;
  }
  return events;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const url = new URL(req.url);
  let instructorId = url.searchParams.get("instructor_id");

  if (!instructorId && req.method === "POST") {
    const body = await req.json().catch(() => ({}));
    instructorId = body.instructor_id;
  }

  let instructors: Array<{ id: string; ics_feed_url: string }> = [];

  if (instructorId) {
    const { data } = await supabase
      .from("instructors")
      .select("id, ics_feed_url")
      .eq("id", instructorId)
      .not("ics_feed_url", "is", null)
      .single();
    if (data) instructors = [data as { id: string; ics_feed_url: string }];
  } else {
    const { data } = await supabase
      .from("instructors")
      .select("id, ics_feed_url")
      .not("ics_feed_url", "is", null)
      .neq("ics_feed_url", "");
    instructors = (data as Array<{ id: string; ics_feed_url: string }>) ?? [];
  }

  const results: Array<{ id: string; status: string; count?: number; error?: string }> = [];

  for (const instructor of instructors) {
    try {
      const res = await fetch(instructor.ics_feed_url, {
        headers: { "User-Agent": "EveryDriverPro/1.0" },
      });
      if (!res.ok) throw new Error("HTTP " + res.status);
      const text = await res.text();
      const events = parseIcs(text);
      const external = events.filter(e => !e.xEverydriverId);

      await supabase
        .from("calendar_blocks")
        .delete()
        .eq("instructor_id", instructor.id)
        .eq("source", "ics_inbound");

      if (external.length > 0) {
        const blocks = external.map(e => ({
          instructor_id: instructor.id,
          start_datetime: e.dtstart,
          end_datetime: e.dtend,
          title: e.summary || "Personal event",
          source: "ics_inbound",
          is_all_day: e.isAllDay,
          blocks_availability: true,
        }));
        await supabase.from("calendar_blocks").insert(blocks);
      }

      await supabase
        .from("instructors")
        .update({
          ics_last_fetched_at: new Date().toISOString(),
          ics_feed_status: "healthy",
        })
        .eq("id", instructor.id);

      results.push({ id: instructor.id, status: "ok", count: external.length });
    } catch (err) {
      await supabase
        .from("instructors")
        .update({ ics_feed_status: "failed" })
        .eq("id", instructor.id);
      results.push({ id: instructor.id, status: "error", error: String(err) });
    }
  }

  return new Response(JSON.stringify({ ok: true, results }), {
    status: 200,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
});
