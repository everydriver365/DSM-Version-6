import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Plus,
  Calendar as CalendarIcon,
  MapPin,
  ChevronRight,
  Clock,
  PoundSterling,
  CheckCircle,
  X,
} from "lucide-react";
import type React from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { EndLessonWizard } from "../components/dsm/EndLessonWizard";
import { supabase } from "../lib/supabaseClient";

export const Route = createFileRoute("/schedule")({
  head: () => ({
    meta: [
      { title: "Schedule — DSM by EveryDriver" },
      { name: "description", content: "View and manage your lesson schedule." },
    ],
  }),
  component: SchedulePage,
});

const POPPINS = { fontFamily: "Poppins, sans-serif" } as const;

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

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    setLessons(null);
    const windowStart = ymd(rangeStart);
    const windowEnd = ymd(rangeEnd);
    console.log("[schedule] date window:", windowStart, windowEnd);
    supabase
      .from("lessons")
      .select(
        "id, instructor_id, pupil_id, lesson_date, lesson_time, duration_minutes, status, payment_status, amount_due, pickup_location, pickup_postcode, check_in_status, prepaid_hours_used, eol_completed, eol_completed_at, lesson_type, notes, cancelled_at, cancellation_reason, pupil:pupils(id, name, first_name, last_name, phone, profile_image_url)",
      )
      .is("deleted_at", null)
      .gte("lesson_date", windowStart)
      .lte("lesson_date", windowEnd)
      .order("lesson_date", { ascending: true })
      .order("lesson_time", { ascending: true })
      .then(({ data, error }) => {
        const lessons = data as unknown as Lesson[] | null;
        const rows = lessons ?? [];
        console.log("[schedule] fetch result:", lessons?.length, "lessons", error);
        console.log("[schedule] first lesson:", lessons?.[0]);
        if (error) console.error("[schedule] fetch error", error);
        setLessons(rows);
      });
  }, [rangeStart, rangeEnd]);

  const lessonsByDate = useMemo(() => {
    const map = new Map<string, Lesson[]>();
    if (!lessons) return map;
    for (const l of lessons) {
      const arr = map.get(l.lesson_date) ?? [];
      arr.push(l);
      map.set(l.lesson_date, arr);
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

    let accent = "#1A52A0";
    if (isCancelled) accent = "#9CA3AF";
    else if (isCurrent) accent = "#CC2229";
    else if (isCompleted) accent = "#16A34A";

    const timeColor = isCancelled ? "#9CA3AF" : "#0F2044";
    const nameColor = isCancelled ? "#9CA3AF" : "#0F2044";

    const badges: React.ReactNode[] = [];
    if (isCurrent) {
      badges.push(
        <span
          key="live"
          className="text-[10px] px-2 py-0.5 rounded-full inline-flex items-center gap-1 animate-pulse"
          style={{ backgroundColor: "#FEE2E2", color: "#CC2229", ...POPPINS, fontWeight: 700 }}
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: 999,
              backgroundColor: "#CC2229",
              display: "inline-block",
            }}
          />
          Live
        </span>,
      );
    }
    if (pastEnd && !l.eol_completed && !isCancelled) {
      badges.push(
        <span
          key="eol"
          className="text-[10px] px-2 py-0.5 rounded-full"
          style={{ backgroundColor: "#FEF3C7", color: "#92400E", ...POPPINS, fontWeight: 600 }}
        >
          EOL pending
        </span>,
      );
    }
    if (l.payment_status === "paid") {
      badges.push(
        <span
          key="paid"
          className="text-[10px] px-2 py-0.5 rounded-full"
          style={{ backgroundColor: "#DCFCE7", color: "#15803D", ...POPPINS, fontWeight: 600 }}
        >
          Paid
        </span>,
      );
    } else if (pastEnd && l.payment_status === "unpaid" && (l.amount_due ?? 0) > 0) {
      badges.push(
        <span
          key="due"
          className="text-[10px] px-2 py-0.5 rounded-full"
          style={{ backgroundColor: "#FEE2E2", color: "#CC2229", ...POPPINS, fontWeight: 700 }}
        >
          £{Number(l.amount_due).toFixed(2)}
        </span>,
      );
    }

    const showActions = openActionsId === l.id;

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
            padding: "12px 16px",
            backgroundColor: "#FFFFFF",
            alignItems: "stretch",
          }}
        >
          <div
            style={{
              width: 48,
              flexShrink: 0,
              textAlign: "right",
              display: "flex",
              flexDirection: "column",
              justifyContent: "flex-start",
            }}
          >
            <div
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: timeColor,
                ...POPPINS,
                textDecoration: isCancelled ? "line-through" : "none",
              }}
            >
              {formatLessonTime(l)}
            </div>
            <div style={{ fontSize: 11, color: "#9CA3AF", ...POPPINS, marginTop: 2 }}>
              {formatDurationShort(l.duration_minutes)}
            </div>
          </div>
          <div
            style={{
              width: 3,
              borderRadius: 2,
              backgroundColor: accent,
              flexShrink: 0,
              alignSelf: "stretch",
            }}
          />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: nameColor,
                ...POPPINS,
                textDecoration: isCancelled ? "line-through" : "none",
              }}
              className="truncate"
            >
              {name}
            </div>
            {l.pickup_location && (
              <div
                style={{
                  fontSize: 12,
                  color: "#6B7280",
                  ...POPPINS,
                  marginTop: 2,
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                }}
                className="truncate"
              >
                <MapPin size={10} color="#6B7280" />
                <span className="truncate">{l.pickup_location}</span>
              </div>
            )}
            {badges.length > 0 && (
              <div style={{ display: "flex", gap: 6, marginTop: 4, flexWrap: "wrap" }}>
                {badges}
              </div>
            )}
          </div>
          <div style={{ display: "flex", alignItems: "center", flexShrink: 0 }}>
            <ChevronRight size={16} color="#D1D5DB" />
          </div>
        </div>

        {showActions && (
          <div
            style={{
              display: "flex",
              gap: 8,
              padding: "8px 16px 12px 76px",
              backgroundColor: "#F8F9FB",
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
                color: "#16A34A",
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
                color: "#CC2229",
                backgroundColor: "#FFFFFF",
                border: "0.5px solid #E5E7EB",
              }}
            >
              <X size={14} /> Cancel
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
      rows.push(
        <div
          key="empty"
          style={{
            padding: "12px 16px",
            fontSize: 13,
            color: "#9CA3AF",
            ...POPPINS,
          }}
        >
          No lessons
        </div>,
      );
    } else {
      items.forEach((l, i) => {
        rows.push(renderLessonRow(l));
        const next = items[i + 1];
        if (next) {
          const gapMins = Math.round(
            (lessonStart(next).getTime() - lessonEnd(l).getTime()) / 60000,
          );
          if (gapMins > 30) {
            rows.push(
              <div
                key={`gap-${l.id}`}
                style={{
                  margin: "4px 16px 8px 16px",
                  backgroundColor: "#F8F9FB",
                  borderRadius: 8,
                  padding: "8px 12px",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <Clock size={12} color="#9CA3AF" />
                <span style={{ fontSize: 12, color: "#6B7280", ...POPPINS }}>
                  {gapMins} mins free · {formatTimeFromDate(lessonEnd(l))} –{" "}
                  {formatTimeFromDate(lessonStart(next))}
                </span>
              </div>,
            );
          } else {
            rows.push(
              <div
                key={`hr-${l.id}`}
                style={{
                  height: 0,
                  borderTop: "0.5px solid #F3F4F6",
                  margin: "0 16px",
                }}
              />,
            );
          }
        }
      });
    }

    return (
      <div key={dateKey}>
        <div
          style={{
            position: "sticky",
            top: 52,
            zIndex: 20,
            backgroundColor: "#FFFFFF",
            borderBottom: "0.5px solid #E5E5EA",
            padding: "8px 16px",
            ...POPPINS,
            fontSize: 13,
            fontWeight: 600,
            color: "#0F2044",
            marginTop: isFirst ? 0 : 0,
          }}
        >
          <span>{main}</span>
          {suffix && (
            <span style={{ color: "#9CA3AF", fontWeight: 500 }}> · {suffix}</span>
          )}
        </div>
        {rows}
      </div>
    );
  };

  return (
    <div className="min-h-screen pb-24 pb-safe relative" style={{ ...POPPINS, backgroundColor: "#FFFFFF" }}>
      {/* Top bar */}
      <div
        className="sticky top-0 z-40 flex items-center justify-between px-4"
        style={{ height: 52, backgroundColor: "#072b47" }}
      >
        <div className="flex items-center gap-2">
          <span className="text-[15px] font-bold text-white" style={POPPINS}>
            DSM
          </span>
          <span className="text-[15px] text-white" style={POPPINS}>
            Schedule
          </span>
        </div>
        <button
          type="button"
          aria-label="Open calendar"
          onClick={() => navigate({ to: "/diary" })}
          className="flex items-center justify-center"
          style={{ width: 32, height: 32 }}
        >
          <CalendarIcon size={20} color="#FFFFFF" />
        </button>
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
        <div>{days.map((d, i) => renderDay(d, i === 0))}</div>
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
              color: "#1A52A0",
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
          backgroundColor: "#0F2044",
          color: "#FFFFFF",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 6px 16px rgba(15,32,68,0.35)",
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
