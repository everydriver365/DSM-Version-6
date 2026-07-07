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
import type React from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { EndLessonWizard } from "../components/dsm/EndLessonWizard";
import { supabase } from "../lib/supabaseClient";
import { readMinGapMinutes } from "../lib/gapPrefs";

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
            `${SUPABASE_URL}/rest/v1/pupils?id=in.(${pupilIds.join(",")})&select=id,calendar_colour`,
            {
              headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${token}` },
            },
          );
          const pupilData = await pupilRes.json();
          const map: Record<string, string> = {};
          (pupilData || []).forEach((p: any) => {
            if (p.calendar_colour) map[p.id] = p.calendar_colour;
          });
          if (!cancelled) setColourMap(map);
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
    const prev = lessons;
    setLessons((cur) =>
      cur
        ? cur.map((x) =>
            x.id === id
              ? { ...x, status: "cancelled", cancelled_at: new Date().toISOString() }
              : x,
          )
        : cur,
    );
    setCancelLesson(null);
    setOpenActionsId(null);
    const { error } = await supabase
      .from("lessons")
      .update({ status: "cancelled", cancelled_at: new Date().toISOString() })
      .eq("id", id);
    if (error) {
      console.error("[schedule] cancel error", error);
      setLessons(prev);
      toast.error("Couldn't cancel lesson");
      return;
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

  const renderLessonRow = (l: Lesson) => {
    const name = pupilDisplayName(l.pupil);
    const startD = lessonStart(l);
    const endD = lessonEnd(l);
    const pastEnd = endD.getTime() < now.getTime();
    const isCurrent = l.id === currentId;
    const isCancelled = l.status === "cancelled";
    const isCompleted = l.status === "completed" || l.eol_completed === true;
    const showActions = openActionsId === l.id;
    const isSelected = isCurrent || showActions;

    const lessonColour = l.pupil_id ? (colourMap[l.pupil_id] || "#1A52A0") : "#1A52A0";
    const timeColor = isSelected ? lessonColour : isCancelled ? "#9CA3AF" : lessonColour;
    const nameColor = isSelected ? lessonColour : isCancelled ? "#9CA3AF" : "#0B1F3A";

    const badges: React.ReactNode[] = [];

    if (isCurrent) {
      badges.push(
        <span
          key="live"
          className="text-[10px] px-2 py-0.5 rounded-full inline-flex items-center gap-1 animate-pulse"
          style={{ backgroundColor: `${lessonColour}20`, color: lessonColour, ...POPPINS, fontWeight: 700 }}
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: 999,
              backgroundColor: lessonColour,
              display: "inline-block",
            }}
          />
          Live
        </span>,
      );
    }
    if (pastEnd && !l.eol_completed && !isCancelled) {
      badges.push(
        <button
          key="eol"
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setEolLesson(l);
          }}
          className="text-[10px] px-2 py-0.5 rounded-full cursor-pointer"
          style={{ backgroundColor: isSelected ? `${lessonColour}18` : "#EEF2F7", color: isSelected ? lessonColour : "#0B1F3A", ...POPPINS, fontWeight: 600, border: 0 }}
        >
          EOL pending
        </button>,
      );
    }
    if (l.payment_status === "paid") {
      badges.push(
        <span
          key="paid"
          className="text-[10px] px-2 py-0.5 rounded-full"
          style={{ backgroundColor: isSelected ? `${lessonColour}18` : "#EEF2F7", color: isSelected ? lessonColour : "#0B1F3A", ...POPPINS, fontWeight: 600 }}
        >
          Paid
        </span>,
      );
    } else if (pastEnd && l.payment_status === "unpaid" && (l.amount_due ?? 0) > 0) {
      badges.push(
        <span
          key="due"
          className="text-[10px] px-2 py-0.5 rounded-full"
          style={{ backgroundColor: isSelected ? `${lessonColour}20` : "#FEE2E2", color: isSelected ? lessonColour : "#1877D6", ...POPPINS, fontWeight: 700 }}
        >
          £{Number(l.amount_due).toFixed(2)}
        </span>,
      );
    }
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
            gap: 14,
            padding: "14px 16px",
            alignItems: "stretch",
            background: isCurrent ? `${lessonColour}10` : "#FFFFFF",
          }}
        >
          <div
            style={{
              width: 62,
              flexShrink: 0,
              textAlign: "left",
              display: "flex",
              flexDirection: "column",
              justifyContent: "flex-start",
            }}
          >
            <div
              style={{
                fontSize: 20,
                fontWeight: 700,
                color: timeColor,
                ...POPPINS,
                lineHeight: 1.1,
                letterSpacing: "-0.01em",
                textDecoration: isCancelled ? "line-through" : "none",
              }}
            >
              {formatLessonTime(l)}
            </div>
            <div style={{ fontSize: 12, color: "#94A3B8", ...POPPINS, marginTop: 4 }}>
              {formatDurationShort(l.duration_minutes)}
            </div>
          </div>
          <div
            style={{
              width: 4,
              borderRadius: 3,
              background: lessonColour,
              flexShrink: 0,
            }}
          />
          <div style={{ flex: 1, minWidth: 0, paddingTop: 2 }}>
            <div
              style={{
                fontSize: 15,
                fontWeight: 700,
                color: nameColor,
                ...POPPINS,
                textDecoration: isCancelled ? "line-through" : "none",
              }}
              className="truncate"
            >
              {name}
            </div>
            <div
              style={{
                fontSize: 13,
                color: "#94A3B8",
                ...POPPINS,
                marginTop: 3,
                display: "flex",
                alignItems: "center",
                gap: 4,
              }}
              className="truncate"
            >
              {l.pickup_location ? (
                <>
                  <MapPin size={11} color="#94A3B8" />
                  <span className="truncate">{l.pickup_location}</span>
                </>
              ) : (
                <span>Lesson</span>
              )}
            </div>
            {badges.length > 0 && (
              <div
                style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}
              >
                {badges}
              </div>
            )}
          </div>
          <div style={{ display: "flex", alignItems: "center", flexShrink: 0 }}>
            <ChevronRight size={18} color="#CBD5E1" />
          </div>
        </div>

        {showActions && (
          <div
            style={{
              display: "flex",
              gap: 8,
              padding: "8px 16px 14px 92px",
              backgroundColor: "#F8FAFC",
            }}

          >
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                markPaid(l);
              }}
              className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg py-2"
              style={{
                ...POPPINS,
                fontSize: 12,
                fontWeight: 600,
                color: "#1877D6",
                backgroundColor: "#FFFFFF",
                border: "0.5px solid #E5E7EB",
              }}
            >
              <PoundSterling size={14} /> Paid
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setEolLesson(l);
                setOpenActionsId(null);
              }}
              className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg py-2"
              style={{
                ...POPPINS,
                fontSize: 12,
                fontWeight: 600,
                color: "#1D4ED8",
                backgroundColor: "#FFFFFF",
                border: "0.5px solid #E5E7EB",
              }}
            >
              <CheckCircle size={14} /> EOL
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setCancelLesson(l);
              }}
              className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg py-2"
              style={{
                ...POPPINS,
                fontSize: 12,
                fontWeight: 600,
                color: "#1877D6",
                backgroundColor: "#FFFFFF",
                border: "0.5px solid #E5E7EB",
              }}
            >
              <X size={14} /> Cancel
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                markNoShow(l);
              }}
              className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg py-2"
              style={{
                ...POPPINS,
                fontSize: 12,
                fontWeight: 600,
                color: "#B91C1C",
                backgroundColor: "#FFFFFF",
                border: "0.5px solid #E5E7EB",
              }}
            >
              <X size={14} /> No-show
            </button>
          </div>
        )}
      </div>
    );
  };

  const renderDay = (d: Date, isFirst: boolean) => {
    const dateKey = ymd(d);
    const items = lessonsByDate.get(dateKey) ?? [];
    const { main, suffix } = dayHeaderLabel(d, today);

    const rows: React.ReactNode[] = [];
    if (items.length === 0) {
      const isPast = d.getTime() < today.getTime();
      if (isPast) {
        rows.push(
          <div
            key="empty"
            style={{
              padding: "16px 18px",
              fontSize: 12,
              color: "#94A3B8",
              ...POPPINS,
              textAlign: "center",
            }}
          >
            Nothing scheduled
          </div>,
        );
      } else {
        const hoursFree = 9;
        const potential = hoursFree * 40;
        const dayNoun = d.getTime() === today.getTime() ? "today" : "on this day";
        rows.push(
          <div
            key="empty-free"
            style={{
              margin: "6px 12px",
              background: "#FFFFFF",
              border: "0.5px solid #EEF2F7",
              borderRadius: 12,
              padding: "10px 12px",
              display: "flex",
              alignItems: "center",
              gap: 10,
              ...POPPINS,
            }}
          >
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: 8,
                background: "rgba(0,181,165,0.10)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#00B5A5",
                flexShrink: 0,
              }}
            >
              <CalendarIcon size={14} />
            </div>
            <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#0F2044", lineHeight: 1.2 }}>
                Free day · {hoursFree} hrs open
              </div>
              <div style={{ fontSize: 11, color: "#6B7280", marginTop: 2 }}>
                Potential <span style={{ color: "#00B5A5", fontWeight: 600 }}>£{potential}</span>
              </div>
            </div>
            <button
              type="button"
              aria-label="Fill slots"
              onClick={(e) => { e.stopPropagation(); navigate({ to: "/gaps" }); }}
              style={{
                width: 30, height: 30, borderRadius: 8,
                background: "#1877D6", color: "#FFFFFF", border: "none",
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer", flexShrink: 0,
              }}
            >
              <Plus size={14} strokeWidth={2.6} />
            </button>
            <button
              type="button"
              aria-label="Broadcast availability"
              onClick={(e) => {
                e.stopPropagation();
                window.location.href = `sms:?body=${encodeURIComponent(`Hi everyone, I have lesson availability ${dayNoun}. Reply to book!`)}`;
              }}
              style={{
                width: 30, height: 30, borderRadius: 8,
                background: "#FFFFFF", color: "#0F2044",
                border: "1px solid #E5E7EB",
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer", flexShrink: 0,
              }}
            >
              <Sparkles size={14} />
            </button>
          </div>,
        );
      }
    } else {
      const isPast = d.getTime() < today.getTime();
      const isToday = d.getTime() === today.getTime();
      const nowMs = Date.now();
      const dayWindowStart = new Date(d);
      dayWindowStart.setHours(9, 0, 0, 0);
      const dayWindowEnd = new Date(d);
      dayWindowEnd.setHours(18, 0, 0, 0);

      const renderGapRow = (
        key: string,
        startMs: number,
        endMs: number,
      ) => {
        const gapMins = Math.round((endMs - startMs) / 60000);
        if (gapMins < minGapMinutes) return null;
        if (isPast) return null;
        if (isToday && endMs <= nowMs) return null;
        const displayStart = isToday && startMs < nowMs ? nowMs : startMs;
        const displayMins = Math.round((endMs - displayStart) / 60000);
        if (displayMins < minGapMinutes) return null;
        return (
          <div
            key={key}
            style={{
              margin: "6px 12px",
              background: "linear-gradient(180deg, #F8FAFC 0%, #EAF3FF 100%)",
              border: "1px solid #EEF2F7",
              borderRadius: 14,
              padding: "10px 12px",
              display: "flex",
              alignItems: "center",
              gap: 12,
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 999,
                background: "#FFFFFF",
                border: "1px solid #E2E8F0",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#3B82F6",
                flexShrink: 0,
              }}
            >
              <Sparkles size={16} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#0F2044", ...POPPINS }}>
                {displayMins >= 60
                  ? `${Math.round((displayMins / 60) * 10) / 10} hrs free`
                  : `${displayMins} mins free`}
              </div>
              <div style={{ fontSize: 12, color: "#94A3B8", ...POPPINS, marginTop: 2 }}>
                {formatTimeFromDate(new Date(displayStart))} –{" "}
                {formatTimeFromDate(new Date(endMs))} · tap to fill
              </div>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                navigate({ to: "/gaps" });
              }}
              style={{
                background: "transparent",
                border: "none",
                padding: 4,
                cursor: "pointer",
              }}
            >
              <ChevronRight size={18} color="#94A3B8" />
            </button>
          </div>
        );
      };

      const firstStartMs = lessonStart(items[0]).getTime();
      const preGap = renderGapRow(
        `gap-pre-${items[0].id}`,
        dayWindowStart.getTime(),
        firstStartMs,
      );
      if (preGap) rows.push(preGap);

      items.forEach((l, i) => {
        rows.push(renderLessonRow(l));
        const next = items[i + 1];
        if (next) {
          const gapMins = Math.round(
            (lessonStart(next).getTime() - lessonEnd(l).getTime()) / 60000,
          );
          if (gapMins >= minGapMinutes) {
            rows.push(
              <div
                key={`gap-${l.id}`}
                style={{
                  margin: "6px 12px",
                  background:
                    "linear-gradient(180deg, #F8FAFC 0%, #EAF3FF 100%)",
                  border: "1px solid #EEF2F7",
                  borderRadius: 14,
                  padding: "10px 12px",
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                }}
              >
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 999,
                    background: "#FFFFFF",
                    border: "1px solid #E2E8F0",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#3B82F6",
                    flexShrink: 0,
                  }}
                >
                  <Sparkles size={16} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 700,
                      color: "#0F2044",
                      ...POPPINS,
                    }}
                  >
                    {gapMins} mins free
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: "#94A3B8",
                      ...POPPINS,
                      marginTop: 2,
                    }}
                  >
                    {formatTimeFromDate(lessonEnd(l))} –{" "}
                    {formatTimeFromDate(lessonStart(next))} · tap to fill
                  </div>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate({ to: "/gaps" });
                  }}
                  style={{
                    background: "transparent",
                    border: "none",
                    padding: 4,
                    cursor: "pointer",
                  }}
                >
                  <ChevronRight size={18} color="#94A3B8" />
                </button>
              </div>,
            );
          } else {
            rows.push(
              <div
                key={`hr-${l.id}`}
                style={{
                  height: 0,
                  borderTop: "1px solid #F1F5F9",
                  margin: "0 16px",
                }}
              />,
            );
          }
        }
      });

      const lastLesson = items[items.length - 1];
      const lastEndMs = lessonEnd(lastLesson).getTime();
      const postGap = renderGapRow(
        `gap-post-${lastLesson.id}`,
        lastEndMs,
        dayWindowEnd.getTime(),
      );
      if (postGap) rows.push(postGap);
    }

    void isFirst;
    return (
      <div key={dateKey}>
        {/* Day header row */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "4px 4px 10px",
            margin: "0 16px",
            ...POPPINS,
          }}
        >
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              color: "#94A3B8",
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: 999,
                background: "#CBD5E1",
                display: "inline-block",
              }}
            />
            {main}
            {suffix && (
              <span style={{ color: "#CBD5E1", fontSize: 12 }}>
                · {suffix}
              </span>
            )}
          </span>
          <button
            type="button"
            onClick={() =>
              navigate({
                to: `/lessons/new?date=${dateKey}` as unknown as "/lessons/new",
              })
            }
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              background: "#FFFFFF",
              border: "1px solid #E2E6ED",
              borderRadius: 999,
              padding: "5px 12px 5px 10px",
              fontSize: 13,
              fontWeight: 600,
              color: "#0F2044",
              cursor: "pointer",
              ...POPPINS,
            }}
          >
            <Plus size={14} /> Add
          </button>
        </div>

        {/* Timeline card */}
        <div
          style={{
            margin: "0 16px 14px",
            background: "#FFFFFF",
            border: "1px solid #E2E6ED",
            borderRadius: 20,
            padding: "6px 0",
            boxShadow: "0 1px 2px rgba(15,32,68,0.03)",
            overflow: "hidden",
          }}
        >
          {rows}
        </div>
      </div>
    );
  };

  return (
    <div
      className="min-h-screen pb-24 pb-safe relative"
      style={{ ...POPPINS, backgroundColor: "#FFFFFF" }}
    >
      {/* Top bar — light theme */}
      <div
        className="sticky top-0 z-40"
        style={{
          background: "#FFFFFF",
          borderBottom: "0.5px solid #E2E6ED",
          padding: "14px 20px 12px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button
            onClick={() => navigate({ to: "/home" })}
            aria-label="Back"
            style={{
              background: "#F1F5F9",
              border: "none",
              width: 36,
              height: 36,
              borderRadius: 999,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              color: "#0F2044",
            }}
          >
            <ArrowLeft size={18} />
          </button>
          <div style={{ flex: 1 }}>
            <h1
              style={{
                ...POPPINS,
                color: "#0F2044",
                fontSize: 22,
                fontWeight: 700,
                letterSpacing: "-0.01em",
                margin: 0,
                lineHeight: 1.1,
              }}
            >
              Schedule
            </h1>
            <div style={{ color: "#94A3B8", fontSize: 13, marginTop: 2 }}>
              Your lessons at a glance
            </div>
          </div>
          <button
            type="button"
            aria-label="Open calendar"
            onClick={() => navigate({ to: "/diary" })}
            style={{
              background: "#F1F5F9",
              border: "none",
              width: 36,
              height: 36,
              borderRadius: 999,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              color: "#0F2044",
            }}
          >
            <CalendarIcon size={18} />
          </button>
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
          {days.map((d, i) => renderDay(d, i === 0))}
        </div>
      )}

      {lessons !== null && (
        <div style={{ display: "flex", justifyContent: "center", padding: "16px 16px 24px" }}>
          <button
            type="button"
            onClick={() => setDaysAhead((n) => n + 7)}
            style={{
              ...POPPINS,
              fontSize: 13,
              fontWeight: 600,
              color: "#1877D6",
              backgroundColor: "transparent",
              padding: "8px 16px",
            }}
          >
            Load more →
          </button>
        </div>
      )}

      {/* FAB */}
      <button
        type="button"
        aria-label="Add lesson"
        onClick={() => navigate({ to: "/lessons/new" })}
        style={{
          position: "fixed",
          right: 20,
          bottom: 88,
          width: 52,
          height: 52,
          borderRadius: 999,
          backgroundColor: "#0B1F3A",
          color: "#FFFFFF",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 6px 16px rgba(11,31,58,0.35)",
          zIndex: 30,
        }}
      >
        <Plus size={24} color="#FFFFFF" />
      </button>

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
