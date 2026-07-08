import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Plus,
  Calendar as CalendarIcon,
  MapPin,
  ChevronRight,
  PoundSterling,
  CheckCircle,
  X,
} from "lucide-react";
import { ArrowLeft, Sparkles } from "lucide-react";
import {
  IconPhone,
  IconBell,
  IconPlus,
} from "@tabler/icons-react";
import type React from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { EndLessonWizard } from "../components/dsm/EndLessonWizard";
import { supabase } from "../lib/supabaseClient";
import { readMinGapMinutes, writeMinGapMinutes } from "../lib/gapPrefs";

export const Route = createFileRoute("/schedule")({
  head: () => ({
    meta: [
      { title: "Schedule — DSM by EveryDriver" },
      { name: "description", content: "View and manage your lesson schedule." },
    ],
  }),
  component: SchedulePage,
});

const POPPINS = { fontFamily: "Inter, sans-serif" } as const;

const SUPABASE_URL = "https://bjpqxfrihwjcqprmoqfs.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJqcHF4ZnJpaHdqY3Fwcm1vcWZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE0NzQ4MjEsImV4cCI6MjA5NzA1MDgyMX0.HKlgx3dxP3uxX9wMRRUnfb0IPwaBpFcut_iUgT5XFeo";

async function awardPoints(
  instructorId: string,
  event: string,
  token: string,
  metadata?: any,
) {
  try {
    await fetch(`${SUPABASE_URL}/functions/v1/award-points`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        apikey: SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({ instructorId, event, metadata }),
    });
  } catch (err) {
    console.warn("[rewards] award-points failed:", err);
  }
}

async function applyNoShowFee(
  lesson: Lesson,
  pupilName: string,
  token: string,
): Promise<number | null> {
  if (!lesson.instructor_id || !lesson.pupil_id) return null;
  try {
    const prefsRes = await fetch(
      `${SUPABASE_URL}/rest/v1/instructor_reminder_preferences?instructor_id=eq.${lesson.instructor_id}&select=no_show_fee,auto_charge_no_show,late_cancel_hours&limit=1`,
      { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${token}` } },
    );
    const prefs = (await prefsRes.json())?.[0];
    if (!prefs || !prefs.auto_charge_no_show || !(prefs.no_show_fee > 0)) return null;
    const fee = (lesson.amount_due ?? 0) * (prefs.no_show_fee / 100);
    if (fee <= 0) return null;
    const pupilRes = await fetch(
      `${SUPABASE_URL}/rest/v1/pupils?id=eq.${lesson.pupil_id}&select=account_balance`,
      { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${token}` } },
    );
    const current = (await pupilRes.json())?.[0]?.account_balance ?? 0;
    await fetch(`${SUPABASE_URL}/rest/v1/pupils?id=eq.${lesson.pupil_id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${token}`,
        Prefer: "return=minimal",
      },
      body: JSON.stringify({ account_balance: Number(current) + fee }),
    });
    toast.success(`No-show fee of £${fee.toFixed(2)} added to ${pupilName}'s balance`);
    return fee;
  } catch (err) {
    console.warn("[schedule] no-show fee failed:", err);
    return null;
  }
}

async function getLateCancelHours(instructorId: string, token: string): Promise<number | null> {
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/instructor_reminder_preferences?instructor_id=eq.${instructorId}&select=late_cancel_hours&limit=1`,
      { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${token}` } },
    );
    const row = (await res.json())?.[0];
    return row?.late_cancel_hours ?? null;
  } catch {
    return null;
  }
}

interface Pupil {
  id?: string;
  name: string | null;
  first_name?: string | null;
  last_name?: string | null;
  phone?: string | null;
  profile_image_url?: string | null;
}

interface Lesson {
  id: string;
  instructor_id?: string | null;
  pupil_id?: string | null;
  lesson_date: string;
  lesson_time: string;
  duration_minutes: number | null;
  status: string;
  payment_status?: string | null;
  amount_due?: number | null;
  pickup_location?: string | null;
  pickup_postcode?: string | null;
  check_in_status?: string | null;
  prepaid_hours_used?: number | null;
  eol_completed?: boolean | null;
  eol_completed_at?: string | null;
  lesson_type?: string | null;
  notes?: string | null;
  cancelled_at?: string | null;
  cancellation_reason?: string | null;
  pupil: Pupil | null;
}

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}
function ymd(d: Date) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}
function lessonStart(l: Lesson) {
  return new Date(`${l.lesson_date}T${(l.lesson_time ?? "00:00:00").slice(0, 8)}`);
}
function lessonEnd(l: Lesson) {
  return new Date(lessonStart(l).getTime() + (l.duration_minutes ?? 60) * 60000);
}
function formatTimeFromDate(d: Date) {
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}
function formatLessonTime(l: Lesson) {
  const displayTime = !l.lesson_time || l.lesson_time === "00:00" ? "TBC" : l.lesson_time.substring(0, 5);
  return displayTime;
}
function pupilDisplayName(p: Pupil | null) {
  if (!p) return "Unknown pupil";
  if (p.name) return p.name;
  const full = [p.first_name, p.last_name].filter(Boolean).join(" ").trim();
  return full || "Unknown pupil";
}
function formatDurationShort(mins: number | null) {
  const m = mins ?? 60;
  if (m % 60 === 0) return `${m / 60}h`;
  if (m < 60) return `${m}m`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}
function dayHeaderLabel(d: Date, today: Date) {
  const main = d
    .toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
  const diff = Math.round((startOfDay(d).getTime() - today.getTime()) / 86400000);
  let suffix = "";
  if (diff === 0) suffix = "today";
  else if (diff === 1) suffix = "tomorrow";
  else if (diff === -1) suffix = "yesterday";
  return { main, suffix };
}

function SchedulePage() {
  const navigate = useNavigate();
  const today = useMemo(() => startOfDay(new Date()), []);
  const [daysAhead, setDaysAhead] = useState<number>(6); // today + 6 = 7 days (with today-1 = 8 total)
  const rangeStart = useMemo(() => addDays(today, -1), [today]);
  const rangeEnd = useMemo(() => addDays(today, daysAhead), [today, daysAhead]);

  const [lessons, setLessons] = useState<Lesson[] | null>(null);
  const [now, setNow] = useState<Date>(() => new Date());
  const [openActionsId, setOpenActionsId] = useState<string | null>(null);
  const [eolLesson, setEolLesson] = useState<Lesson | null>(null);
  const [cancelLesson, setCancelLesson] = useState<Lesson | null>(null);
  const [colourMap, setColourMap] = useState<Record<string, string>>({});
  const [minGapMinutes, setMinGapMinutes] = useState<number>(() => readMinGapMinutes());
  const [instructorBufferBefore, setInstructorBufferBefore] = useState<number>(0);
  const [instructorBufferAfter, setInstructorBufferAfter] = useState<number>(15);
  const [pupilBufferMap, setPupilBufferMap] = useState<
    Record<string, { before: number | null; after: number | null }>
  >({});

  useEffect(() => {
    const sync = () => setMinGapMinutes(readMinGapMinutes());
    window.addEventListener("min-gap-minutes-changed", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("min-gap-minutes-changed", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: authData } = await supabase.auth.getUser();
      const uid = authData.user?.id;
      if (!uid) return;
      const { data, error } = await supabase
        .from("instructors")
        .select("min_gap_minutes, lesson_buffer_before, lesson_buffer_after")
        .eq("id", uid)
        .maybeSingle();
      if (cancelled || error || !data) return;
      const v = (data as unknown as { min_gap_minutes?: number }).min_gap_minutes;
      if (typeof v === "number") {
        setMinGapMinutes(v);
        writeMinGapMinutes(v);
      }
      const bb = (data as unknown as { lesson_buffer_before?: number }).lesson_buffer_before;
      const ba = (data as unknown as { lesson_buffer_after?: number }).lesson_buffer_after;
      if (typeof bb === "number") setInstructorBufferBefore(bb);
      if (typeof ba === "number") setInstructorBufferAfter(ba);
    })();
    return () => { cancelled = true; };
  }, []);


  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLessons(null);
    const windowStart = ymd(rangeStart);
    const windowEnd = ymd(rangeEnd);
    console.log("[schedule] date window:", windowStart, windowEnd);

    (async () => {
      const { data, error } = await supabase
        .from("lessons")
        .select(
          "id, instructor_id, pupil_id, lesson_date, lesson_time, duration_minutes, status, payment_status, amount_due, pickup_location, pickup_postcode, check_in_status, prepaid_hours_used, eol_completed, eol_completed_at, lesson_type, notes, cancelled_at, cancellation_reason, pupil:pupils(id, name, first_name, last_name, phone, profile_image_url)",
        )
        .is("deleted_at", null)
        .gte("lesson_date", windowStart)
        .lte("lesson_date", windowEnd)
        .order("lesson_date", { ascending: true })
        .order("lesson_time", { ascending: true });

      if (cancelled) return;

      const lessons = data as unknown as Lesson[] | null;
      const rows = lessons ?? [];
      console.log("[schedule] fetch result:", lessons?.length, "lessons", error);
      console.log("[schedule] first lesson:", lessons?.[0]);
      if (error) console.error("[schedule] fetch error", error);
      setLessons(rows);

      const pupilIds = [...new Set(rows.map((l) => l.pupil_id).filter(Boolean))];
      if (pupilIds.length > 0) {
        const SUPABASE_URL = "https://bjpqxfrihwjcqprmoqfs.supabase.co";
        const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJqcHF4ZnJpaHdqY3Fwcm1vcWZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE0NzQ4MjEsImV4cCI6MjA5NzA1MDgyMX0.HKlgx3dxP3uxX9wMRRUnfb0IPwaBpFcut_iUgT5XFeo";
        const token = (await supabase.auth.getSession()).data.session?.access_token;
        if (token) {
          const pupilRes = await fetch(
            `${SUPABASE_URL}/rest/v1/pupils?id=in.(${pupilIds.join(",")})&select=id,calendar_colour,buffer_before_minutes,buffer_after_minutes`,
            {
              headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${token}` },
            },
          );
          const pupilData = await pupilRes.json();
          const map: Record<string, string> = {};
          const bufMap: Record<string, { before: number | null; after: number | null }> = {};
          (pupilData || []).forEach((p: any) => {
            if (p.calendar_colour) map[p.id] = p.calendar_colour;
            bufMap[p.id] = {
              before: p.buffer_before_minutes ?? null,
              after: p.buffer_after_minutes ?? null,
            };
          });
          if (!cancelled) {
            setColourMap(map);
            setPupilBufferMap(bufMap);
          }
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [rangeStart, rangeEnd]);


  const lessonsByDate = useMemo(() => {
    const map = new Map<string, Lesson[]>();
    if (!lessons) return map;
    for (const l of lessons) {
      const dateKey = l.lesson_date.substring(0, 10); // Always YYYY-MM-DD
      const arr = map.get(dateKey) ?? [];
      arr.push(l);
      map.set(dateKey, arr);
    }
    const grouped = Object.fromEntries(map);
    console.log(
      "[schedule] grouped days:",
      Object.keys(grouped),
      "total groups:",
      Object.keys(grouped).length,
    );
    console.log("[schedule] grouped lessons for first day:", Object.values(grouped)?.[0]);
    console.log(
      "[schedule] day keys being rendered:",
      Array.from({ length: 8 }).map((_, i) => ymd(addDays(rangeStart, i))),
    );
    return map;
  }, [lessons, rangeStart]);

  const days = useMemo(() => {
    const out: Date[] = [];
    const total = Math.round((rangeEnd.getTime() - rangeStart.getTime()) / 86400000) + 1;
    for (let i = 0; i < total; i++) out.push(addDays(rangeStart, i));
    return out;
  }, [rangeStart, rangeEnd]);

  const currentId = useMemo(() => {
    if (!lessons) return null;
    const t = now.getTime();
    for (const l of lessons) {
      const s = lessonStart(l).getTime();
      const e = lessonEnd(l).getTime();
      if (s <= t && t <= e && l.status !== "cancelled") return l.id;
    }
    return null;
  }, [lessons, now]);

  const markPaid = async (l: Lesson) => {
    const prev = lessons;
    setLessons((cur) =>
      cur ? cur.map((x) => (x.id === l.id ? { ...x, payment_status: "paid" } : x)) : cur,
    );
    setOpenActionsId(null);
    const { error } = await supabase
      .from("lessons")
      .update({ payment_status: "paid" })
      .eq("id", l.id);
    if (error) {
      console.error("[schedule] mark paid error", error);
      setLessons(prev);
      toast.error("Couldn't mark as paid");
      return;
    }
    toast.success(`Payment marked for ${pupilDisplayName(l.pupil)}`);
  };

  const onEolCompleted = () => {
    if (!eolLesson) return;
    const nowIso = new Date().toISOString();
    setLessons((cur) =>
      cur
        ? cur.map((x) =>
            x.id === eolLesson.id
              ? { ...x, status: "completed", eol_completed: true, eol_completed_at: nowIso }
              : x,
          )
        : cur,
    );
    toast.success(`EOL completed for ${pupilDisplayName(eolLesson.pupil)}`);
  };

  const cancelLessonNow = async () => {
    if (!cancelLesson) return;
    const id = cancelLesson.id;
    const lessonSnapshot = cancelLesson;
    const isPrepaid = (cancelLesson.payment_status ?? "").toLowerCase() === "prepaid";
    const amountDue = Number(cancelLesson.amount_due ?? 0);
    const pupilId = cancelLesson.pupil_id ?? null;
    const prev = lessons;
    setLessons((cur) =>
      cur
        ? cur.map((x) =>
            x.id === id
              ? {
                  ...x,
                  status: "cancelled",
                  cancelled_at: new Date().toISOString(),
                  payment_status: "cancelled",
                  amount_due: 0,
                }
              : x,
          )
        : cur,
    );
    setCancelLesson(null);
    setOpenActionsId(null);
    const { error } = await supabase
      .from("lessons")
      .update({
        status: "cancelled",
        cancelled_at: new Date().toISOString(),
        payment_status: "cancelled",
        amount_due: 0,
      })
      .eq("id", id);
    if (error) {
      console.error("[schedule] cancel error", error);
      setLessons(prev);
      toast.error("Couldn't cancel lesson");
      return;
    }

    // Refund prepaid amount back to pupil credit. Legacy pupils.balance_owed
    // is intentionally NOT written — outstanding is derived from unpaid lessons.
    if (isPrepaid && amountDue > 0 && pupilId) {
      const { data: pupilRow, error: readErr } = await supabase
        .from("pupils")
        .select("account_balance")
        .eq("id", pupilId)
        .maybeSingle();
      if (readErr) console.error("[schedule] cancel refund read error", readErr);
      const current = Number((pupilRow as { account_balance: number | null } | null)?.account_balance ?? 0);
      const { error: refundErr } = await supabase
        .from("pupils")
        .update({ account_balance: current + amountDue })
        .eq("id", pupilId);
      if (refundErr) console.error("[schedule] cancel refund write error", refundErr);
    }

    toast.success("Lesson cancelled");
    // Late cancellation → negative points
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      const instructorId = lessonSnapshot.instructor_id ?? undefined;
      if (token && instructorId) {
        const lateHours = await getLateCancelHours(instructorId, token);
        if (lateHours != null) {
          const hoursUntil =
            (lessonStart(lessonSnapshot).getTime() - Date.now()) / 3600000;
          if (hoursUntil <= lateHours) {
            await awardPoints(instructorId, "LATE_CANCELLATION", token, {
              referenceId: id,
              referenceType: "lesson",
            });
          }
        }
      }
    } catch (err) {
      console.warn("[schedule] late-cancel points failed:", err);
    }
  };

  const markNoShow = async (l: Lesson) => {
    const id = l.id;
    const prev = lessons;
    setLessons((cur) =>
      cur ? cur.map((x) => (x.id === id ? { ...x, status: "no_show" } : x)) : cur,
    );
    setOpenActionsId(null);
    const { error } = await supabase
      .from("lessons")
      .update({ status: "no_show" })
      .eq("id", id);
    if (error) {
      console.error("[schedule] no-show error", error);
      setLessons(prev);
      toast.error("Couldn't mark no-show");
      return;
    }
    toast.success(`Marked no-show for ${pupilDisplayName(l.pupil)}`);
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      if (token && l.instructor_id) {
        await awardPoints(l.instructor_id, "NO_SHOW", token, {
          referenceId: id,
          referenceType: "lesson",
        });
        await applyNoShowFee(l, pupilDisplayName(l.pupil), token);
      }
    } catch (err) {
      console.warn("[schedule] no-show side effects failed:", err);
    }
  };

  const goToLesson = (id: string) => {
    navigate({ to: "/lessons/$id" as never, params: { id } as never });
  };

  // Long-press handling
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressed = useRef<boolean>(false);
  const startPress = (lessonId: string) => {
    longPressed.current = false;
    pressTimer.current = setTimeout(() => {
      longPressed.current = true;
      setOpenActionsId((cur) => (cur === lessonId ? null : lessonId));
    }, 450);
  };
  const cancelPress = () => {
    if (pressTimer.current) {
      clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
  };

  // NOTE: This screen currently only sources native `lessons` from Supabase.
  // The spec references external calendar-event rows (Google Calendar sync)
  // and multi-pupil / group-slot rows — no data source for those exists on
  // this screen today, so those row variants are intentionally omitted
  // rather than mocked. Wire them in when a sync/group data source lands.
  // FLAG: If in future a lesson appears both as a native `lessons` row AND
  // as an ingested external-calendar row for the same pupil/time, that is a
  // data/sync issue — do not silently dedupe here; investigate the sync.

  type DayTab = "today" | "tomorrow" | "next";
  const [dayTab, setDayTab] = useState<DayTab>("today");
  const selectedDate = useMemo(() => {
    const offset = dayTab === "today" ? 0 : dayTab === "tomorrow" ? 1 : 2;
    return addDays(today, offset);
  }, [today, dayTab]);

  const NAVY = "#0F2044";
  const MUTED = "#6B7280";
  const SUB = "#94A3B8";
  const BORDER = "#E5E7EB";
  const SURFACE_1 = "#F1F5F9";
  const DANGER = "#DC2626";
  const DANGER_BG = "#FEE2E2";
  const ACCENT = "#1877D6";

  // Initials from a pupil display name (reuses pupilDisplayName for source of truth).
  const initialsOf = (name: string) => {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return "?";
    if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const renderLessonRow = (l: Lesson, opts: { isLast: boolean }) => {
    void opts.isLast;
    const name = pupilDisplayName(l.pupil);
    const endD = lessonEnd(l);
    const pastEnd = endD.getTime() < now.getTime();
    const isCancelled = l.status === "cancelled";
    const showActions = openActionsId === l.id;

    const paymentStatus = (l.payment_status ?? "").toLowerCase();
    const amountDue = l.amount_due ?? 0;
    // Overdue keeps its danger tint; otherwise map to Prepaid / Payment due pills.
    const overdue = pastEnd && paymentStatus === "unpaid" && amountDue > 0 && !isCancelled;
    const isPrepaid = paymentStatus === "prepaid";
    const isPaymentDue = !overdue && paymentStatus === "unpaid" && amountDue > 0 && !isCancelled;

    const avatarBg = (l.pupil_id && colourMap[l.pupil_id]) || "#E2E8F0";

    return (
      <div key={l.id}>
        <div
          role="button"
          tabIndex={0}
          onClick={() => {
            if (longPressed.current) {
              longPressed.current = false;
              return;
            }
            goToLesson(l.id);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") goToLesson(l.id);
          }}
          onPointerDown={() => startPress(l.id)}
          onPointerUp={cancelPress}
          onPointerLeave={cancelPress}
          onPointerCancel={cancelPress}
          onContextMenu={(e) => {
            e.preventDefault();
            setOpenActionsId((cur) => (cur === l.id ? null : l.id));
          }}
          className="cursor-pointer select-none"
          style={{
            display: "flex",
            gap: 12,
            padding: "12px 14px",
            alignItems: "center",
            minHeight: 56,
            background: "#FFFFFF",
          }}
        >
          <div style={{ width: 44, flexShrink: 0 }}>
            <div
              style={{
                fontSize: 13,
                fontWeight: 500,
                color: NAVY,
                ...POPPINS,
                lineHeight: 1.1,
                textDecoration: isCancelled ? "line-through" : "none",
              }}
            >
              {formatLessonTime(l)}
            </div>
          </div>
          {/* Pupil avatar — background comes from existing pupil.calendar_colour (colourMap). */}
          <div
            aria-hidden
            style={{
              width: 34,
              height: 34,
              borderRadius: 999,
              background: avatarBg,
              color: "#FFFFFF",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 12,
              fontWeight: 500,
              ...POPPINS,
              flexShrink: 0,
              overflow: "hidden",
            }}
          >
            {l.pupil?.profile_image_url ? (
              <img
                src={l.pupil.profile_image_url}
                alt=""
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            ) : (
              initialsOf(name)
            )}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: 14,
                fontWeight: 500,
                color: isCancelled ? MUTED : NAVY,
                ...POPPINS,
                textDecoration: isCancelled ? "line-through" : "none",
              }}
              className="truncate"
            >
              {name}
            </div>
            <div
              style={{
                fontSize: 11,
                color: MUTED,
                ...POPPINS,
                marginTop: 2,
              }}
              className="truncate"
            >
              {formatDurationShort(l.duration_minutes)}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
            {overdue && (
              <span
                style={{
                  ...POPPINS,
                  fontSize: 10,
                  fontWeight: 500,
                  backgroundColor: DANGER_BG,
                  color: DANGER,
                  padding: "3px 8px",
                  borderRadius: 999,
                }}
              >
                Overdue
              </span>
            )}
            {isPrepaid && (
              <span
                style={{
                  ...POPPINS,
                  fontSize: 10,
                  fontWeight: 500,
                  backgroundColor: "#E6F1FB",
                  color: "#185FA5",
                  padding: "3px 8px",
                  borderRadius: 999,
                }}
              >
                Prepaid
              </span>
            )}
            {isPaymentDue && (
              <span
                style={{
                  ...POPPINS,
                  fontSize: 10,
                  fontWeight: 500,
                  backgroundColor: "#FBEFE1",
                  color: "#B5661E",
                  padding: "3px 8px",
                  borderRadius: 999,
                }}
              >
                Payment due
              </span>
            )}
            <ChevronRight size={16} color="#CBD5E1" />
          </div>
        </div>

        {showActions && (
          <div
            style={{
              display: "flex",
              gap: 8,
              padding: "8px 14px 12px 70px",
              backgroundColor: "#F8FAFC",
            }}
          >
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); markPaid(l); }}
              className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg py-2"
              style={{ ...POPPINS, fontSize: 12, fontWeight: 500, color: ACCENT, backgroundColor: "#FFFFFF", border: `0.5px solid ${BORDER}` }}
            >
              <PoundSterling size={14} /> Paid
            </button>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setEolLesson(l); setOpenActionsId(null); }}
              className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg py-2"
              style={{ ...POPPINS, fontSize: 12, fontWeight: 500, color: NAVY, backgroundColor: "#FFFFFF", border: `0.5px solid ${BORDER}` }}
            >
              <CheckCircle size={14} /> EOL
            </button>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setCancelLesson(l); }}
              className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg py-2"
              style={{ ...POPPINS, fontSize: 12, fontWeight: 500, color: NAVY, backgroundColor: "#FFFFFF", border: `0.5px solid ${BORDER}` }}
            >
              <X size={14} /> Cancel
            </button>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); markNoShow(l); }}
              className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg py-2"
              style={{ ...POPPINS, fontSize: 12, fontWeight: 500, color: DANGER, backgroundColor: "#FFFFFF", border: `0.5px solid ${BORDER}` }}
            >
              <X size={14} /> No-show
            </button>
          </div>
        )}
      </div>
    );
  };


  // Compute gaps for the selected day (reusing existing buffer logic).
  const dayInfo = useMemo(() => {
    const items = lessonsByDate.get(ymd(selectedDate)) ?? [];
    const isPast = selectedDate.getTime() < today.getTime();
    const isToday = selectedDate.getTime() === today.getTime();
    const nowMs = Date.now();
    const dayStart = new Date(selectedDate);
    dayStart.setHours(9, 0, 0, 0);
    const dayEnd = new Date(selectedDate);
    dayEnd.setHours(18, 0, 0, 0);
    const minUsable = 60;
    const threshold = Math.max(minGapMinutes, minUsable);

    const resolveBuf = (pupilId: string | null | undefined, type: "before" | "after") => {
      if (pupilId && pupilBufferMap[pupilId]) {
        const v = type === "before" ? pupilBufferMap[pupilId].before : pupilBufferMap[pupilId].after;
        if (v != null) return v;
      }
      return type === "before" ? instructorBufferBefore : instructorBufferAfter;
    };

    type Gap = { key: string; startMs: number; endMs: number; usableMins: number };
    const gaps: Gap[] = [];
    const pushGap = (key: string, startMs: number, endMs: number) => {
      if (isPast) return;
      if (isToday && endMs <= nowMs) return;
      const minStart = isToday ? Math.max(startMs, nowMs + 30 * 60000) : startMs;
      const mins = Math.round((endMs - minStart) / 60000);
      if (mins < threshold) return;
      gaps.push({ key, startMs: minStart, endMs, usableMins: mins });
    };

    if (items.length > 0) {
      const first = items[0];
      pushGap(
        `pre-${first.id}`,
        dayStart.getTime(),
        lessonStart(first).getTime() - (resolveBuf(first.pupil_id, "before") + instructorBufferAfter) * 60000,
      );
      items.forEach((l, i) => {
        const next = items[i + 1];
        if (!next) return;
        const leftReserve = resolveBuf(l.pupil_id, "after") + instructorBufferBefore;
        const rightReserve = resolveBuf(next.pupil_id, "before") + instructorBufferAfter;
        pushGap(
          `gap-${l.id}`,
          lessonEnd(l).getTime() + leftReserve * 60000,
          lessonStart(next).getTime() - rightReserve * 60000,
        );
      });
      const last = items[items.length - 1];
      pushGap(
        `post-${last.id}`,
        lessonEnd(last).getTime() + (resolveBuf(last.pupil_id, "after") + instructorBufferBefore) * 60000,
        dayEnd.getTime(),
      );
    }
    const totalMins = gaps.reduce((sum, g) => sum + g.usableMins, 0);
    return { items, gaps, totalMins, isPast, isToday };
  }, [lessonsByDate, selectedDate, today, minGapMinutes, pupilBufferMap, instructorBufferBefore, instructorBufferAfter]);

  const formatOpenMins = (mins: number) => {
    if (mins <= 0) return "0m";
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h && m) return `${h}h ${m}m`;
    if (h) return `${h}h`;
    return `${m}m`;
  };

  const renderTimeline = () => {
    const { items, gaps, isToday } = dayInfo;
    if (items.length === 0 && gaps.length === 0) {
      return (
        <div
          style={{
            margin: "0 16px",
            border: `0.5px solid ${BORDER}`,
            borderRadius: 12,
            padding: "22px 16px",
            textAlign: "center",
            fontSize: 13,
            color: MUTED,
            ...POPPINS,
            background: "#FFFFFF",
          }}
        >
          Nothing scheduled
        </div>
      );
    }

    // Build a chronological sequence: lessons and now-strip in the solid
    // bordered container; gaps rendered as separate dashed cards inserted
    // between the container segments.
    type SolidRow =
      | { kind: "lesson"; lesson: Lesson; startMs: number }
      | { kind: "now"; startMs: number };

    const nowMs = Date.now();
    const solid: SolidRow[] = items.map((l) => ({
      kind: "lesson" as const,
      lesson: l,
      startMs: lessonStart(l).getTime(),
    }));
    if (isToday && items.length > 0) {
      const firstMs = lessonStart(items[0]).getTime();
      const lastMs = lessonEnd(items[items.length - 1]).getTime();
      if (nowMs >= firstMs && nowMs <= lastMs) {
        solid.push({ kind: "now", startMs: nowMs });
        solid.sort((a, b) => a.startMs - b.startMs);
      }
    }

    // Group solid rows separated by gaps into segments.
    const sortedGaps = [...gaps].sort((a, b) => a.startMs - b.startMs);
    const segments: SolidRow[][] = [];
    let current: SolidRow[] = [];
    let gapIdx = 0;
    const gapNodes: React.ReactNode[] = [];

    const pushGapNode = (g: typeof sortedGaps[number]) => {
      gapNodes.push(
        <div
          key={g.key}
          role="button"
          tabIndex={0}
          onClick={() => navigate({ to: "/gaps" })}
          style={{
            margin: "10px 16px",
            border: "1.5px dashed #CBD5E1",
            borderRadius: 12,
            padding: "14px 16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            minHeight: 56,
            cursor: "pointer",
            ...POPPINS,
            background: "transparent",
          }}
        >
          <div>
            <div style={{ fontSize: 14, fontWeight: 500, color: MUTED }}>
              {formatOpenMins(g.usableMins)} open
            </div>
            <div style={{ fontSize: 12, color: SUB, marginTop: 2 }}>
              {formatTimeFromDate(new Date(g.startMs))} – {formatTimeFromDate(new Date(g.endMs))}
            </div>
          </div>
          <div style={{ fontSize: 12, fontWeight: 500, color: ACCENT }}>Fill →</div>
        </div>,
      );
    };

    for (const row of solid) {
      while (gapIdx < sortedGaps.length && sortedGaps[gapIdx].endMs <= row.startMs) {
        if (current.length) segments.push(current);
        current = [];
        pushGapNode(sortedGaps[gapIdx]);
        gapIdx++;
      }
      current.push(row);
    }
    if (current.length) segments.push(current);
    while (gapIdx < sortedGaps.length) {
      pushGapNode(sortedGaps[gapIdx]);
      gapIdx++;
    }

    // Build interleaved output: alternating segments (solid cards) and gaps.
    const output: React.ReactNode[] = [];
    let g = 0;
    // If a gap starts before any lesson, it comes first.
    // We already pushed gaps into gapNodes in chronological order; interleave
    // with segments by comparing timing.
    const segmentStart = (seg: SolidRow[]) => seg[0].startMs;
    const gapStart = (idx: number) => sortedGaps[idx]?.startMs ?? Infinity;

    let segIdx = 0;
    while (segIdx < segments.length || g < gapNodes.length) {
      const nextSeg = segments[segIdx];
      const useSeg = nextSeg && segmentStart(nextSeg) <= gapStart(g);
      if (useSeg) {
        output.push(
          <div
            key={`seg-${segIdx}`}
            style={{
              margin: "0 16px",
              border: `0.5px solid ${BORDER}`,
              borderRadius: 12,
              background: "#FFFFFF",
              overflow: "hidden",
            }}
          >
            {nextSeg.map((row, i) => {
              const isLast = i === nextSeg.length - 1;
              const divider =
                i > 0 ? (
                  <div
                    key={`hr-${segIdx}-${i}`}
                    style={{ height: 0, borderTop: `0.5px solid ${BORDER}` }}
                  />
                ) : null;
              if (row.kind === "now") {
                return (
                  <div key={`now-${row.startMs}`}>
                    {divider}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        padding: "6px 14px",
                        background: DANGER_BG,
                        ...POPPINS,
                      }}
                    >
                      <span
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: 999,
                          background: DANGER,
                          display: "inline-block",
                        }}
                      />
                      <span style={{ fontSize: 11, fontWeight: 500, color: DANGER }}>
                        NOW · {formatTimeFromDate(new Date(row.startMs))}
                      </span>
                    </div>
                  </div>
                );
              }
              return (
                <div key={row.lesson.id}>
                  {divider}
                  {renderLessonRow(row.lesson, { isLast })}
                </div>
              );
            })}
          </div>,
        );
        segIdx++;
      } else {
        output.push(gapNodes[g]);
        g++;
      }
    }
    return <>{output}</>;
  };

  const tabs: { key: DayTab; label: string }[] = [
    { key: "today", label: "Today" },
    { key: "tomorrow", label: "Tomorrow" },
    { key: "next", label: "Next" },
  ];

  const showDateHeader = dayTab !== "today";
  const dateHeaderLabel = selectedDate
    .toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })
    .toUpperCase();

  return (
    <div
      className="min-h-screen pb-24 pb-safe relative"
      style={{ ...POPPINS, backgroundColor: "#FFFFFF" }}
    >
      {/* Header */}
      <div
        className="sticky top-0 z-40"
        style={{
          background: "#FFFFFF",
          borderBottom: `0.5px solid ${BORDER}`,
          padding: "14px 16px 12px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h1
            style={{
              ...POPPINS,
              color: NAVY,
              fontSize: 20,
              fontWeight: 500,
              margin: 0,
              lineHeight: 1.1,
            }}
          >
            Schedule
          </h1>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <button
              type="button"
              aria-label="Call"
              onClick={() => navigate({ to: "/messages" as never })}
              style={{ background: "transparent", border: "none", padding: 0, color: MUTED, cursor: "pointer", display: "inline-flex" }}
            >
              <IconPhone size={19} stroke={1.75} />
            </button>
            <button
              type="button"
              aria-label="Notifications"
              onClick={() => navigate({ to: "/notifications" as never })}
              style={{ background: "transparent", border: "none", padding: 0, color: MUTED, cursor: "pointer", display: "inline-flex", position: "relative" }}
            >
              <IconBell size={19} stroke={1.75} />
              {/* Notification unread-count data source not present on this screen; badge omitted until wired. */}
            </button>
            <button
              type="button"
              aria-label="Add lesson"
              onClick={() => navigate({ to: "/lessons/new" })}
              style={{ background: "transparent", border: "none", padding: 0, color: MUTED, cursor: "pointer", display: "inline-flex" }}
            >
              <IconPlus size={19} stroke={1.75} />
            </button>
          </div>
        </div>

        {/* Day tabs */}
        <div
          style={{
            marginTop: 12,
            background: SURFACE_1,
            padding: 3,
            borderRadius: 10,
            display: "flex",
            gap: 2,
          }}
        >
          {tabs.map((t) => {
            const active = dayTab === t.key;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => setDayTab(t.key)}
                style={{
                  flex: 1,
                  padding: "8px 0",
                  borderRadius: 8,
                  border: "none",
                  background: active ? "#FFFFFF" : "transparent",
                  boxShadow: active ? "inset 0 0 0 0.5px rgba(15,32,68,0.08), 0 1px 2px rgba(15,32,68,0.04)" : "none",
                  color: active ? NAVY : MUTED,
                  fontSize: 13,
                  fontWeight: active ? 500 : 400,
                  cursor: "pointer",
                  ...POPPINS,
                }}
              >
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {lessons === null ? (
        <div style={{ padding: 16 }}>
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="skeleton-pulse"
              style={{
                height: 56,
                marginBottom: 8,
                backgroundColor: "#F3F4F6",
                borderRadius: 8,
              }}
            />
          ))}
        </div>
      ) : (
        <div style={{ paddingTop: 16 }}>
          {/*
            Gap-filler summary card — amber "open slot" treatment.
            FLAG: waitlist/gap-match pupil data and per-slot potential earnings
            are not fetched on this screen today, so the avatar stack and
            "potential to earn £X" clause are intentionally omitted rather
            than fabricated. Wire them in when a matching data source lands.
          */}
          {dayInfo.gaps.length > 0 && (() => {
            const firstGap = [...dayInfo.gaps].sort((a, b) => a.startMs - b.startMs)[0];
            return (
              <div
                style={{
                  margin: "0 16px 12px",
                  background: "#FBEFE1",
                  borderRadius: 14,
                  padding: "14px 16px",
                  ...POPPINS,
                }}
              >
                <div style={{ fontSize: 14, fontWeight: 500, color: "#7A4813" }}>
                  You have an open slot today
                </div>
                <div style={{ fontSize: 12, color: "#B5661E", marginTop: 4 }}>
                  {formatTimeFromDate(new Date(firstGap.startMs))} – {formatTimeFromDate(new Date(firstGap.endMs))}
                  {" ("}{formatOpenMins(firstGap.usableMins)}{")"}
                </div>
                <button
                  type="button"
                  onClick={() => navigate({ to: "/gaps" })}
                  style={{
                    marginTop: 12,
                    background: "#EFAF2C",
                    color: "#3D2408",
                    border: "none",
                    borderRadius: 10,
                    padding: "8px 14px",
                    fontSize: 13,
                    fontWeight: 500,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    cursor: "pointer",
                    ...POPPINS,
                  }}
                >
                  Fill slot <ChevronRight size={14} />
                </button>
              </div>
            );
          })()}

          {/*
            AI insight card — no insight-generation source exists on this
            screen today; card intentionally omitted rather than shown as
            a placeholder. Wire in when an insight source lands.
          */}

          {/* Section header — Today's timeline (only on today tab). */}
          {dayTab === "today" && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                margin: "0 16px 8px",
                ...POPPINS,
              }}
            >
              <span style={{ fontSize: 18, fontWeight: 500, color: NAVY }}>
                Today&apos;s timeline
              </span>
              {/*
                FLAG: no separate "full schedule" route exists — this page
                IS the schedule. Link points to /schedule (self) as the
                closest existing route; revisit when a distinct full/week
                schedule view is introduced.
              */}
              <button
                type="button"
                onClick={() => navigate({ to: "/schedule" })}
                style={{
                  background: "transparent",
                  border: "none",
                  padding: 0,
                  color: ACCENT,
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: "pointer",
                  ...POPPINS,
                }}
              >
                View full schedule →
              </button>
            </div>
          )}

          {/* Date section header for Tomorrow / Next */}
          {showDateHeader && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                margin: "0 16px 8px",
                ...POPPINS,
              }}
            >
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 500,
                  color: MUTED,
                  letterSpacing: "0.04em",
                }}
              >
                {dateHeaderLabel}
              </span>
              <button
                type="button"
                onClick={() =>
                  navigate({
                    to: `/lessons/new?date=${ymd(selectedDate)}` as unknown as "/lessons/new",
                  })
                }
                style={{
                  background: "transparent",
                  border: "none",
                  padding: 0,
                  color: ACCENT,
                  fontSize: 12,
                  fontWeight: 500,
                  cursor: "pointer",
                  ...POPPINS,
                }}
              >
                + Add
              </button>
            </div>
          )}

          {renderTimeline()}

          {/*
            Recent activity section — no unified activity feed data source
            (payments received / lessons completed timeline) is fetched on
            this screen today; section intentionally omitted rather than
            shown as a placeholder. Wire in when an activity source lands.

            Floating add button — a "+" add-lesson control already exists
            in the sticky header (IconPlus); a duplicate FAB is intentionally
            not added to avoid two entry points for the same action.
          */}
        </div>
      )}


      {eolLesson && (
        <EndLessonWizard
          open={!!eolLesson}
          onClose={() => setEolLesson(null)}
          lessonId={eolLesson.id}
          pupilId={eolLesson.pupil_id ?? ""}
          pupilName={pupilDisplayName(eolLesson.pupil)}
          instructorId={eolLesson.instructor_id ?? ""}
          durationMinutes={eolLesson.duration_minutes ?? 60}
          lessonDate={eolLesson.lesson_date}
          startTime={eolLesson.lesson_time}
          onCompleted={onEolCompleted}
        />
      )}

      <ConfirmDialog
        open={!!cancelLesson}
        title="Cancel this lesson?"
        message={
          cancelLesson
            ? `${pupilDisplayName(cancelLesson.pupil)} · ${formatLessonTime(cancelLesson)}`
            : undefined
        }
        confirmLabel="Cancel lesson"
        cancelLabel="Keep"
        onCancel={() => setCancelLesson(null)}
        onConfirm={cancelLessonNow}
      />

      <style>{`
        @keyframes skeleton-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        .skeleton-pulse {
          animation: skeleton-pulse 1.5s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
