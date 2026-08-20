// Cron endpoint: /api/public/send-lesson-reminders
// Run every 15 minutes (pg_cron / external scheduler) with header
//   x-cron-secret: $REMINDERS_CRON_SECRET
// Sends push notifications (via the send-push edge function) for:
//   1. Lessons starting soon (25-35 mins away)
//   2. Overdue payments (once per day per pupil)
//   3. Tests tomorrow
//   4. Pupils gone quiet (once per week per pupil)
// Every notification is mirrored into `instructor_notifications`.

import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/send-lesson-reminders")({
  server: {
    handlers: {
      POST: async ({ request }) => runReminders(request),
      GET: async ({ request }) => runReminders(request),
    },
  },
});

const SUPABASE_URL = "https://bjpqxfrihwjcqprmoqfs.supabase.co";
const DAY = 86_400_000;

type Rest = (path: string, init?: RequestInit) => Promise<any>;

function isoDate(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

function fmtTime(t: string | null | undefined): string {
  return t ? String(t).slice(0, 5) : "";
}

async function runReminders(request: Request): Promise<Response> {
  // Hardcoded per request (server-only file; never sent to the browser).
  const secret = process.env["REMINDERS_CRON_SECRET"] ?? "dsm-reminders-2026-secret";
  const serviceKey =
    process.env["SUPABASE_SERVICE_ROLE_KEY"] ??
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJqcHF4ZnJpaHdqY3Fwcm1vcWZzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTQ3NDgyMSwiZXhwIjoyMDk3MDUwODIxfQ.R_Z7M_UdjnvUBHyGiiiIqqCrxl4docXN2Bw-7eK20_Q";

  if (!secret || !serviceKey) {
    return Response.json(
      { error: "Reminders not configured (REMINDERS_CRON_SECRET / SUPABASE_SERVICE_ROLE_KEY missing)" },
      { status: 503 },
    );
  }


  const provided =
    request.headers.get("x-cron-secret") ??
    new URL(request.url).searchParams.get("secret") ??
    "";
  if (provided !== secret) return new Response("Unauthorized", { status: 401 });

  const rest: Rest = async (path, init) => {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
      ...init,
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
        ...(init?.headers ?? {}),
      },
    });
    const text = await res.text();
    if (!res.ok) throw new Error(`${res.status} ${text}`);
    return text ? JSON.parse(text) : null;
  };

  const notify = async (args: {
    instructor_id: string;
    title: string;
    body: string;
    type: string;
    url?: string;
    data?: Record<string, unknown>;
    reference_id?: string | null;
    reference_type?: "lesson" | "pupil" | null;
  }) => {
    // 1. Push via the existing send-push edge function
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/send-push`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${serviceKey}`,
        },
        body: JSON.stringify({
          instructor_id: args.instructor_id,
          title: args.title,
          body: args.body,
          url: args.url,
          type: args.type,
          data: args.data ?? {},
        }),
      });
      if (!res.ok) console.error("[reminders] push failed", args.type, await res.text());
    } catch (e) {
      console.error("[reminders] push error", args.type, e);
    }

    // 2. Always record the in-app notification
    try {
      await rest("instructor_notifications", {
        method: "POST",
        body: JSON.stringify({
          instructor_id: args.instructor_id,
          title: args.title,
          body: args.body,
          type: args.type,
          reference_id: args.reference_id ?? null,
          reference_type: args.reference_type ?? null,
          read: false,
          created_at: new Date().toISOString(),
        }),
      });
    } catch (e) {
      console.error("[reminders] notification insert failed", e);
    }
  };

  const markSent = async (ids: string[]) => {
    if (!ids.length) return;
    try {
      await rest(`lessons?id=in.(${ids.join(",")})`, {
        method: "PATCH",
        body: JSON.stringify({ reminder_sent_at: new Date().toISOString() }),
      });
    } catch (e) {
      console.error("[reminders] mark reminder_sent_at failed", e);
    }
  };

  const now = Date.now();
  const today = isoDate(now);
  const summary = { starting_soon: 0, overdue_payments: 0, tests_tomorrow: 0, pupil_churn: 0 };
  const errors: string[] = [];

  // ── 1. Lessons starting soon (25-35 mins) ────────────────
  try {
    const dates = `(${today},${isoDate(now + DAY)})`;
    const rows: any[] =
      (await rest(
        `lessons?select=id,lesson_date,lesson_time,pickup_location,instructor_id,pupil_id,pupils(name,phone)` +
          `&status=eq.confirmed&lesson_type=neq.event&deleted_at=is.null&reminder_sent_at=is.null` +
          `&lesson_date=in.${dates}`,
      )) ?? [];

    const due = rows.filter((l) => {
      const ts = Date.parse(`${l.lesson_date}T${String(l.lesson_time ?? "00:00:00").slice(0, 8)}`);
      if (Number.isNaN(ts)) return false;
      const mins = (ts - now) / 60000;
      return mins >= 25 && mins <= 35;
    });

    for (const l of due) {
      const name = l.pupils?.name ?? "Pupil";
      await notify({
        instructor_id: l.instructor_id,
        type: "tracking",
        title: "Lesson starting soon 🚗",
        body: `${name}'s lesson starts at ${fmtTime(l.lesson_time)}`,
        url: "/schedule",
        reference_id: l.id,
        reference_type: "lesson",
        data: {
          lesson_id: l.id,
          pupil_name: name,
          pupil_phone: l.pupils?.phone ?? null,
          lesson_time: l.lesson_time,
          lesson_date: l.lesson_date,
          pickup_location: l.pickup_location,
        },
      });
      summary.starting_soon++;
    }
    await markSent(due.map((l) => l.id));
  } catch (e: any) {
    errors.push(`starting_soon: ${e.message}`);
  }

  // ── 2. Overdue payments (once per day per pupil) ─────────
  try {
    const cutoff = isoDate(now - 7 * DAY);
    const rows: any[] =
      (await rest(
        `lessons?select=instructor_id,pupil_id,amount_due,paid_amount,pupils(name)` +
          `&payment_status=neq.paid&amount_due=gt.0&status=eq.completed&deleted_at=is.null` +
          `&lesson_date=lt.${cutoff}`,
      )) ?? [];

    const byPupil = new Map<
      string,
      { instructor_id: string; pupil_id: string; name: string; owed: number; count: number }
    >();
    for (const l of rows) {
      const owed = Number(l.amount_due ?? 0) - Number(l.paid_amount ?? 0);
      if (owed <= 0) continue;
      const key = `${l.instructor_id}:${l.pupil_id}`;
      const entry =
        byPupil.get(key) ?? {
          instructor_id: l.instructor_id,
          pupil_id: l.pupil_id,
          name: l.pupils?.name ?? "Pupil",
          owed: 0,
          count: 0,
        };
      entry.owed += owed;
      entry.count += 1;
      byPupil.set(key, entry);
    }

    if (byPupil.size) {
      const since = new Date(now - DAY).toISOString();
      const recent: any[] =
        (await rest(
          `instructor_notifications?select=instructor_id,reference_id&type=eq.overdue_payment&created_at=gte.${since}`,
        )) ?? [];
      const seen = new Set(recent.map((n) => `${n.instructor_id}:${n.reference_id}`));

      for (const e of byPupil.values()) {
        if (seen.has(`${e.instructor_id}:${e.pupil_id}`)) continue;
        await notify({
          instructor_id: e.instructor_id,
          type: "overdue_payment",
          title: "Overdue payment 💰",
          body: `${e.name} owes £${e.owed.toFixed(2)}`,
          url: "/payments",
          reference_id: e.pupil_id,
          reference_type: "pupil",
          data: {
            pupil_id: e.pupil_id,
            pupil_name: e.name,
            amount_owed: Number(e.owed.toFixed(2)),
            lesson_count: e.count,
          },
        });
        summary.overdue_payments++;
      }
    }
  } catch (e: any) {
    errors.push(`overdue_payments: ${e.message}`);
  }

  // ── 3. Tests tomorrow ────────────────────────────────────
  try {
    const tomorrow = isoDate(now + DAY);
    const rows: any[] =
      (await rest(
        `lessons?select=id,lesson_date,lesson_time,pickup_location,instructor_id,pupil_id,pupils(name)` +
          `&lesson_type=eq.test&lesson_date=eq.${tomorrow}&deleted_at=is.null&reminder_sent_at=is.null`,
      )) ?? [];

    for (const l of rows) {
      const name = l.pupils?.name ?? "Pupil";
      await notify({
        instructor_id: l.instructor_id,
        type: "test_tomorrow",
        title: "🎯 Test tomorrow!",
        body: `${name} has their test tomorrow at ${fmtTime(l.lesson_time)} at ${l.pickup_location ?? "the test centre"}`,
        url: "/schedule",
        reference_id: l.pupil_id,
        reference_type: "pupil",
        data: {
          pupil_id: l.pupil_id,
          pupil_name: name,
          test_date: l.lesson_date,
          test_time: l.lesson_time,
          test_centre: l.pickup_location,
        },
      });
      summary.tests_tomorrow++;
    }
    await markSent(rows.map((l) => l.id));
  } catch (e: any) {
    errors.push(`tests_tomorrow: ${e.message}`);
  }

  // ── 4. Pupils gone quiet (once per week per pupil) ───────
  try {
    const cutoff = isoDate(now - 30 * DAY);
    const pupils: any[] =
      (await rest(`pupils?select=id,name,instructor_id&status=eq.active&deleted_at=is.null`)) ?? [];

    if (pupils.length) {
      const ids = pupils.map((p) => p.id);
      const lessons: any[] =
        (await rest(
          `lessons?select=pupil_id,lesson_date&deleted_at=is.null&pupil_id=in.(${ids.join(",")})`,
        )) ?? [];

      const last = new Map<string, string>();
      const future = new Set<string>();
      for (const l of lessons) {
        const d: string = l.lesson_date;
        if (!d) continue;
        if (d > today) future.add(l.pupil_id);
        const prev = last.get(l.pupil_id);
        if (!prev || d > prev) last.set(l.pupil_id, d);
      }

      const since = new Date(now - 7 * DAY).toISOString();
      const recent: any[] =
        (await rest(
          `instructor_notifications?select=reference_id&type=eq.pupil_churn&created_at=gte.${since}`,
        )) ?? [];
      const seen = new Set(recent.map((n) => n.reference_id));

      for (const p of pupils) {
        const lastDate = last.get(p.id);
        if (!lastDate || lastDate >= cutoff) continue;
        if (future.has(p.id) || seen.has(p.id)) continue;
        const days = Math.floor((now - Date.parse(`${lastDate}T00:00:00Z`)) / DAY);
        await notify({
          instructor_id: p.instructor_id,
          type: "pupil_churn",
          title: "⚠️ Pupil going quiet",
          body: `${p.name} hasn't had a lesson in ${days} days`,
          url: `/pupils/${p.id}`,
          reference_id: p.id,
          reference_type: "pupil",
          data: { pupil_id: p.id, pupil_name: p.name, days_since_lesson: days },
        });
        summary.pupil_churn++;
      }
    }
  } catch (e: any) {
    errors.push(`pupil_churn: ${e.message}`);
  }

  console.log("[reminders] done", summary, errors);
  return Response.json({ ok: errors.length === 0, ...summary, errors });
}
