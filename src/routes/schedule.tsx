import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Plus,
  Calendar as CalendarIcon,
  CalendarOff,
  RefreshCw,
  PoundSterling,
  CheckCircle,
  MapPin,
  Phone,
  Calendar as CalendarAction,
  X,
} from "lucide-react";
import type React from "react";
import { toast } from "sonner";
import { SectionHeader } from "../components/dsm/SectionHeader";
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

type TabKey = "today" | "tomorrow" | "next";

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
function shortDayMonth(d: Date) {
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}
function longDayHeader(d: Date) {
  return d
    .toLocaleDateString("en-GB", { weekday: "short", day: "2-digit", month: "short" })
    .toUpperCase();
}
function formatTime(t: string) {
  return (t ?? "").slice(0, 5);
}
function formatDuration(mins: number | null) {
  const m = mins ?? 60;
  if (m % 60 === 0) {
    const h = m / 60;
    return h === 1 ? "1 hour" : `${h} hours`;
  }
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return `${h}h ${rem}m`;
}
function statusColor(status: string) {
  switch (status) {
    case "confirmed":
      return "#16A34A";
    case "pending":
      return "#F59E0B";
    case "cancelled":
      return "#CC2229";
    default:
      return "#6B7280";
  }
}

type LessonState = "past" | "current" | "next" | "future";

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
function pupilDisplayName(p: Pupil | null) {
  if (!p) return "Unknown pupil";
  if (p.name) return p.name;
  const full = [p.first_name, p.last_name].filter(Boolean).join(" ").trim();
  return full || "Unknown pupil";
}

function SchedulePage() {
  const navigate = useNavigate();
  const today = useMemo(() => startOfDay(new Date()), []);
  const tomorrow = useMemo(() => addDays(today, 1), [today]);
  const dayAfter = useMemo(() => addDays(today, 2), [today]);
  const next14End = useMemo(() => addDays(today, 16), [today]);

  const [tab, setTab] = useState<TabKey>("today");
  const [lessons, setLessons] = useState<Lesson[] | null>(null);
  const [now, setNow] = useState<Date>(() => new Date());
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [eolLesson, setEolLesson] = useState<Lesson | null>(null);
  const [eolChecks, setEolChecks] = useState({ theory: false, payment: false, notes: false });
  const [eolSubmitting, setEolSubmitting] = useState(false);
  const [cancelLesson, setCancelLesson] = useState<Lesson | null>(null);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    setLessons(null);
    let q = supabase
      .from("lessons")
      .select(
        "id, instructor_id, pupil_id, lesson_date, lesson_time, duration_minutes, status, payment_status, amount_due, pickup_location, pickup_postcode, check_in_status, prepaid_hours_used, eol_completed, eol_completed_at, lesson_type, notes, cancelled_at, cancellation_reason, pupil:pupils(id, name, first_name, last_name, phone, profile_image_url)",
      )
      .is("deleted_at", null)
      .order("lesson_date", { ascending: true })
      .order("lesson_time", { ascending: true });

    if (tab === "today") q = q.eq("lesson_date", ymd(today));
    else if (tab === "tomorrow") q = q.eq("lesson_date", ymd(tomorrow));
    else q = q.gte("lesson_date", ymd(tomorrow)).lte("lesson_date", ymd(next14End));

    q.then(({ data, error }) => {
      if (error) console.error("[schedule] fetch error", error);
      setLessons((data as unknown as Lesson[]) ?? []);
    });
  }, [tab, today, tomorrow, dayAfter, next14End]);

  const grouped = useMemo(() => {
    if (!lessons) return [] as { date: string; items: Lesson[] }[];
    const map = new Map<string, Lesson[]>();
    for (const l of lessons) {
      const arr = map.get(l.lesson_date) ?? [];
      arr.push(l);
      map.set(l.lesson_date, arr);
    }
    return Array.from(map.entries()).map(([date, items]) => ({ date, items }));
  }, [lessons]);

  const { currentId, nextId } = useMemo(() => {
    if (!lessons) return { currentId: null as string | null, nextId: null as string | null };
    let cur: string | null = null;
    let nxt: string | null = null;
    let nxtTime = Infinity;
    for (const l of lessons) {
      const s = lessonStart(l).getTime();
      const e = lessonEnd(l).getTime();
      const t = now.getTime();
      if (s <= t && t <= e) cur = l.id;
      else if (s > t && s < nxtTime) {
        nxtTime = s;
        nxt = l.id;
      }
    }
    return { currentId: cur, nextId: nxt };
  }, [lessons, now]);

  const getState = (l: Lesson): LessonState => {
    if (l.id === currentId) return "current";
    if (l.id === nextId) return "next";
    if (lessonEnd(l).getTime() < now.getTime()) return "past";
    return "future";
  };

  const markPaid = async (l: Lesson) => {
    const prev = lessons;
    setLessons((cur) =>
      cur ? cur.map((x) => (x.id === l.id ? { ...x, payment_status: "paid" } : x)) : cur,
    );
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

  const openEol = (l: Lesson) => {
    setEolLesson(l);
    setEolChecks({ theory: false, payment: false, notes: false });
  };

  const completeEol = async () => {
    if (!eolLesson) return;
    setEolSubmitting(true);
    const nowIso = new Date().toISOString();
    const { error } = await supabase
      .from("lessons")
      .update({ eol_completed: true, eol_completed_at: nowIso })
      .eq("id", eolLesson.id);
    if (error) {
      console.error("[schedule] eol update error", error);
      toast.error("Couldn't complete EOL");
      setEolSubmitting(false);
      return;
    }
    try {
      await supabase.from("lesson_history").insert({
        lesson_id: eolLesson.id,
        instructor_id: eolLesson.instructor_id,
        pupil_id: eolLesson.pupil_id,
        lesson_date: eolLesson.lesson_date,
        lesson_time: eolLesson.lesson_time,
        duration_minutes: eolLesson.duration_minutes,
        payment_status: eolLesson.payment_status,
        notes: eolLesson.notes,
        eol_theory_checked: true,
        eol_payment_done: true,
        eol_notes_done: true,
      });
    } catch (e) {
      console.warn("[schedule] lesson_history insert failed (non-fatal)", e);
    }
    setLessons((cur) =>
      cur
        ? cur.map((x) =>
            x.id === eolLesson.id ? { ...x, eol_completed: true, eol_completed_at: nowIso } : x,
          )
        : cur,
    );
    toast.success(`EOL completed for ${pupilDisplayName(eolLesson.pupil)}`);
    setEolLesson(null);
    setEolSubmitting(false);
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

  const renderLesson = (l: Lesson, idx: number, arr: Lesson[]) => {
    const name = pupilDisplayName(l.pupil);
    const color = statusColor(l.status);
    const state = getState(l);
    const isLast = idx === arr.length - 1;
    const isPast = state === "past";
    const isExpanded = expandedId === l.id;

    const startD = lessonStart(l);
    const endD = lessonEnd(l);
    const startTxt = formatTimeFromDate(startD);
    const endTxt = formatTimeFromDate(endD);
    const durMins = l.duration_minutes ?? 60;
    const pastEnd = endD.getTime() < now.getTime();

    const lineColor = isPast ? "#9CA3AF" : "#E2E6ED";

    let dot: React.ReactNode = null;
    if (state === "past") {
      dot = (
        <div
          style={{ width: 12, height: 12, borderRadius: 999, backgroundColor: "#9CA3AF" }}
        />
      );
    } else if (state === "current") {
      dot = (
        <div style={{ position: "relative", width: 14, height: 14 }}>
          <span
            className="animate-ping"
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: 999,
              backgroundColor: "#16A34A",
              opacity: 0.6,
            }}
          />
          <div
            style={{
              position: "relative",
              width: 14,
              height: 14,
              borderRadius: 999,
              backgroundColor: "#16A34A",
            }}
          />
        </div>
      );
    } else if (state === "next") {
      dot = (
        <div
          style={{
            width: 12,
            height: 12,
            borderRadius: 999,
            backgroundColor: "#0F2044",
            border: "2px solid #FFFFFF",
            boxShadow: "0 0 0 1px #0F2044",
          }}
        />
      );
    } else {
      dot = (
        <div
          style={{
            width: 12,
            height: 12,
            borderRadius: 999,
            backgroundColor: "#FFFFFF",
            border: "2px solid #E2E6ED",
          }}
        />
      );
    }

    const cardBase: React.CSSProperties = {
      padding: 12,
      borderRadius: 10,
      backgroundColor: "#FFFFFF",
    };
    let cardStyle: React.CSSProperties = { ...cardBase };
    if (state === "past") {
      cardStyle = {
        ...cardBase,
        backgroundColor: "#F8F9FB",
        opacity: 0.7,
        border: "0.5px solid #E2E6ED",
      };
    } else if (state === "current") {
      cardStyle = {
        ...cardBase,
        borderLeft: "3px solid #16A34A",
        boxShadow: "0 0 0 1px #16A34A20",
      };
    } else if (state === "next") {
      cardStyle = {
        ...cardBase,
        borderLeft: "3px solid #0F2044",
        boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
      };
    } else {
      cardStyle = { ...cardBase, border: "0.5px solid #E2E6ED" };
    }

    const timeColor = isPast ? "#9CA3AF" : "#0F2044";
    const nameColor = isPast ? "#9CA3AF" : "#1A1A2E";
    const durColor = isPast ? "#9CA3AF" : "#6B7280";
    const nameWeight = state === "next" ? 600 : 400;

    // Payment badge
    let paymentBadge: React.ReactNode = null;
    const prepaid = (l.prepaid_hours_used ?? 0) > 0;
    if (l.payment_status === "paid") {
      paymentBadge = (
        <span
          className="text-[10px] px-2 py-0.5 rounded-full"
          style={{ backgroundColor: "#DCFCE7", color: "#15803D", ...POPPINS, fontWeight: 600 }}
        >
          Paid
        </span>
      );
    } else if (prepaid) {
      paymentBadge = (
        <span
          className="text-[10px] px-2 py-0.5 rounded-full"
          style={{ backgroundColor: "#DBEAFE", color: "#1D4ED8", ...POPPINS, fontWeight: 600 }}
        >
          Prepaid
        </span>
      );
    } else if (l.payment_status === "unpaid" && pastEnd) {
      paymentBadge = (
        <span
          className="text-[10px] px-2 py-0.5 rounded-full"
          style={{ backgroundColor: "#FEF3C7", color: "#92400E", ...POPPINS, fontWeight: 600 }}
        >
          Unpaid
        </span>
      );
    }

    // EOL badge (only after lesson end)
    let eolBadge: React.ReactNode = null;
    if (pastEnd) {
      if (l.eol_completed) {
        eolBadge = (
          <span
            className="text-[10px] px-2 py-0.5 rounded-full"
            style={{ backgroundColor: "#DCFCE7", color: "#15803D", ...POPPINS, fontWeight: 600 }}
          >
            EOL ✓
          </span>
        );
      } else {
        eolBadge = (
          <span
            className="text-[10px] px-2 py-0.5 rounded-full animate-pulse"
            style={{ backgroundColor: "#FEF3C7", color: "#92400E", ...POPPINS, fontWeight: 600 }}
          >
            EOL pending
          </span>
        );
      }
    }

    const ActionBtn = ({
      icon,
      label,
      color,
      onClick,
    }: {
      icon: React.ReactNode;
      label: string;
      color: string;
      onClick: (e: React.MouseEvent) => void;
    }) => (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onClick(e);
        }}
        className="flex flex-col items-center gap-1 flex-1 py-2 rounded-lg"
        style={{ ...POPPINS, color, backgroundColor: "#F8F9FB" }}
      >
        {icon}
        <span className="text-[10px]" style={{ fontWeight: 600 }}>
          {label}
        </span>
      </button>
    );

    return (
      <div key={l.id} className="flex" style={{ position: "relative" }}>
        <div
          style={{
            width: 48,
            position: "relative",
            flexShrink: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <div
            style={{
              position: "absolute",
              left: "50%",
              top: 0,
              transform: "translateX(-1px)",
              width: 2,
              height: 18,
              backgroundColor: idx === 0 ? "transparent" : lineColor,
            }}
          />
          {!isLast && (
            <div
              style={{
                position: "absolute",
                left: "50%",
                top: 18,
                bottom: 0,
                transform: "translateX(-1px)",
                width: 2,
                backgroundColor: lineColor,
              }}
            />
          )}
          <div
            style={{
              marginTop: 12,
              zIndex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {dot}
          </div>
          <div
            className="text-[11px] mt-1"
            style={{
              ...POPPINS,
              color: timeColor,
              fontWeight: 600,
              textDecoration: isPast ? "line-through" : "none",
              zIndex: 1,
            }}
          >
            {formatTime(l.lesson_time)}
          </div>
        </div>

        <div className="flex-1" style={{ paddingBottom: 12 }}>
          <button
            type="button"
            onClick={() => setExpandedId(isExpanded ? null : l.id)}
            className="block w-full text-left"
          >
            <div style={cardStyle}>
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div
                    className="text-[14px] truncate"
                    style={{ ...POPPINS, color: nameColor, fontWeight: nameWeight }}
                  >
                    {name}
                  </div>
                  <div
                    className="text-[12px] mt-0.5"
                    style={{ ...POPPINS, color: durColor }}
                  >
                    {startTxt} → {endTxt} ({durMins} mins)
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span
                    className="text-[11px] text-white px-2 py-1 rounded-full capitalize"
                    style={{
                      backgroundColor: isPast ? "#9CA3AF" : color,
                      ...POPPINS,
                    }}
                  >
                    {l.status}
                  </span>
                  <div className="flex gap-1">
                    {paymentBadge}
                    {eolBadge}
                  </div>
                </div>
              </div>

              {isExpanded && (
                <div className="mt-3 pt-3" style={{ borderTop: "0.5px solid #E2E6ED" }}>
                  {l.pickup_location && (
                    <div
                      className="text-[12px] mb-2"
                      style={{ ...POPPINS, color: "#6B7280" }}
                    >
                      📍 {l.pickup_location}
                      {l.pickup_postcode ? ` · ${l.pickup_postcode}` : ""}
                    </div>
                  )}
                  <div className="flex gap-1.5">
                    <ActionBtn
                      icon={<PoundSterling size={16} color="#16A34A" />}
                      label="Mark paid"
                      color="#16A34A"
                      onClick={() => markPaid(l)}
                    />
                    <ActionBtn
                      icon={<CheckCircle size={16} color="#1D4ED8" />}
                      label="EOL"
                      color="#1D4ED8"
                      onClick={() => openEol(l)}
                    />
                    <ActionBtn
                      icon={<MapPin size={16} color="#0F2044" />}
                      label="Navigate"
                      color="#0F2044"
                      onClick={() => {
                        const q = encodeURIComponent(
                          [l.pickup_location, l.pickup_postcode].filter(Boolean).join(" "),
                        );
                        if (q)
                          window.open(
                            `https://www.google.com/maps/search/?api=1&query=${q}`,
                            "_blank",
                          );
                      }}
                    />
                    <ActionBtn
                      icon={<Phone size={16} color="#6B7280" />}
                      label="Call"
                      color="#6B7280"
                      onClick={() => {
                        if (l.pupil?.phone) window.location.href = `tel:${l.pupil.phone}`;
                      }}
                    />
                    <ActionBtn
                      icon={<CalendarAction size={16} color="#F59E0B" />}
                      label="Reschedule"
                      color="#F59E0B"
                      onClick={() =>
                        navigate({
                          to: "/lessons/reschedule/$id" as never,
                          params: { id: l.id } as never,
                        })
                      }
                    />
                    <ActionBtn
                      icon={<X size={16} color="#CC2229" />}
                      label="Cancel"
                      color="#CC2229"
                      onClick={() => setCancelLesson(l)}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate({
                        to: "/lessons/$id" as never,
                        params: { id: l.id } as never,
                      });
                    }}
                    className="mt-2 w-full text-[12px] py-1.5"
                    style={{ ...POPPINS, color: "#1A52A0", fontWeight: 500 }}
                  >
                    View details →
                  </button>
                </div>
              )}
            </div>
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-white pb-24 pb-safe relative" style={POPPINS}>
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
        <div className="flex items-center gap-4">
          <button
            type="button"
            aria-label="Add lesson"
            onClick={() => navigate({ to: "/lessons/new" })}
            className="flex items-center justify-center"
            style={{ width: 32, height: 32 }}
          >
            <Plus size={20} color="#FFFFFF" />
          </button>
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
      </div>

      {/* Tabs */}
      <div className="px-4 pt-3">
        <div className="flex gap-2">
          {(
            [
              { k: "today", title: "Today", sub: shortDayMonth(today) },
              { k: "tomorrow", title: "Tomorrow", sub: shortDayMonth(tomorrow) },
              { k: "next", title: "Next", sub: "" },
            ] as { k: TabKey; title: string; sub: string }[]
          ).map((t) => {
            const active = tab === t.k;
            return (
              <button
                key={t.k}
                type="button"
                onClick={() => setTab(t.k)}
                className="flex-1 rounded-lg py-2"
                style={{
                  ...POPPINS,
                  backgroundColor: active ? "#FFFFFF" : "transparent",
                  color: active ? "#0F2044" : "#6B7280",
                  borderWidth: active ? "0.5px" : 0,
                  borderStyle: "solid",
                  borderColor: "#E2E6ED",
                }}
              >
                <div className="text-[13px]" style={{ fontWeight: active ? 600 : 500 }}>
                  {t.title}
                </div>
                {t.sub && (
                  <div
                    className="text-[11px] mt-0.5"
                    style={{ color: active ? "#6B7280" : "#6B7280" }}
                  >
                    {t.sub}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="px-4">
        <SectionHeader>SCHEDULE · {longDayHeader(today)}</SectionHeader>

        {lessons === null ? (
          <div className="flex flex-col gap-2">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="bg-white flex items-center justify-between gap-3"
                style={{
                  padding: 12,
                  borderRadius: 10,
                  borderWidth: "0.5px",
                  borderStyle: "solid",
                  borderColor: "#E2E6ED",
                }}
              >
                <div className="min-w-0 flex flex-col gap-2 flex-1">
                  <div
                    className="skeleton-pulse"
                    style={{ height: 14, width: 40, backgroundColor: "#E2E6ED", borderRadius: 4 }}
                  />
                  <div
                    className="skeleton-pulse"
                    style={{
                      height: 14,
                      width: "70%",
                      backgroundColor: "#E2E6ED",
                      borderRadius: 4,
                    }}
                  />
                  <div
                    className="skeleton-pulse"
                    style={{ height: 12, width: 50, backgroundColor: "#E2E6ED", borderRadius: 4 }}
                  />
                </div>
                <div
                  className="skeleton-pulse shrink-0"
                  style={{ height: 24, width: 60, backgroundColor: "#E2E6ED", borderRadius: 999 }}
                />
              </div>
            ))}
          </div>
        ) : lessons.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-2">
            <CalendarOff size={32} color="#6B7280" />
            <p className="text-[14px] text-[#6B7280]" style={POPPINS}>
              Nothing scheduled
            </p>
          </div>
        ) : tab === "next" ? (
          <div className="flex flex-col gap-4">
            {grouped.map((g) => {
              const d = new Date(`${g.date}T00:00:00`);
              return (
                <div key={g.date} className="flex flex-col gap-2">
                  <div
                    className="text-[11px] font-medium uppercase"
                    style={{ color: "#6B7280", letterSpacing: "0.05em", ...POPPINS }}
                  >
                    {longDayHeader(d)}
                  </div>
                  {g.items.map(renderLesson)}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col gap-2">{lessons.map(renderLesson)}</div>
        )}

        <div className="flex flex-col gap-1 mt-4">
          <button
            type="button"
            onClick={() => navigate({ to: "/lessons/new" })}
            className="h-11 rounded-lg text-[14px] font-medium"
            style={{ ...POPPINS, color: "#16A34A", backgroundColor: "transparent" }}
          >
            + Add lesson
          </button>
          <button
            type="button"
            className="h-11 rounded-lg text-[14px] font-medium inline-flex items-center justify-center gap-1"
            style={{ ...POPPINS, color: "#1A52A0", backgroundColor: "transparent" }}
          >
            <RefreshCw size={14} color="#1A52A0" />
            Fill gaps
          </button>
        </div>
      </div>

      {/* EOL Bottom Sheet */}
      {eolLesson && (
        <div
          className="fixed inset-0 z-[90] flex items-end"
          style={{ backgroundColor: "rgba(15,32,68,0.4)", ...POPPINS }}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="absolute inset-0"
            aria-hidden
            onClick={() => !eolSubmitting && setEolLesson(null)}
          />
          <div
            className="relative w-full bg-white"
            style={{
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              padding: 20,
              boxShadow: "0 -10px 30px rgba(15,32,68,0.18)",
              paddingBottom: "calc(20px + env(safe-area-inset-bottom))",
            }}
          >
            <div
              style={{
                width: 36,
                height: 4,
                borderRadius: 999,
                backgroundColor: "#E2E6ED",
                margin: "0 auto 12px",
              }}
            />
            <div className="text-[16px] font-semibold" style={{ color: "#0F2044" }}>
              End of lesson — {pupilDisplayName(eolLesson.pupil)}
            </div>
            <div className="text-[12px] mt-1" style={{ color: "#6B7280" }}>
              Complete each step to close out the lesson.
            </div>

            <div className="mt-4 flex flex-col gap-2">
              {[
                {
                  key: "theory" as const,
                  icon: <BookOpen size={18} color="#1D4ED8" />,
                  label: "Theory and hazard perception reviewed",
                },
                {
                  key: "payment" as const,
                  icon: <PoundSterling size={18} color="#16A34A" />,
                  label: "Payment received or confirmed",
                },
                {
                  key: "notes" as const,
                  icon: <FileText size={18} color="#0F2044" />,
                  label: "Lesson notes updated",
                },
              ].map((row) => {
                const checked = eolChecks[row.key];
                return (
                  <button
                    key={row.key}
                    type="button"
                    onClick={() =>
                      setEolChecks((c) => ({ ...c, [row.key]: !c[row.key] }))
                    }
                    className="flex items-center gap-3 p-3 rounded-lg text-left"
                    style={{
                      backgroundColor: checked ? "#F0FDF4" : "#F8F9FB",
                      border: `0.5px solid ${checked ? "#16A34A" : "#E2E6ED"}`,
                    }}
                  >
                    {row.icon}
                    <span
                      className="text-[13px] flex-1"
                      style={{ color: "#1A1A2E", fontWeight: 500 }}
                    >
                      {row.label}
                    </span>
                    <div
                      style={{
                        width: 20,
                        height: 20,
                        borderRadius: 999,
                        border: `1.5px solid ${checked ? "#16A34A" : "#9CA3AF"}`,
                        backgroundColor: checked ? "#16A34A" : "transparent",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {checked && <CheckCircle size={14} color="#FFFFFF" />}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => setEolLesson(null)}
                disabled={eolSubmitting}
                className="flex-1 h-11 rounded-lg text-[14px] font-medium"
                style={{
                  backgroundColor: "transparent",
                  color: "#0F2044",
                  border: "0.5px solid #E2E6ED",
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={completeEol}
                disabled={
                  eolSubmitting ||
                  !(eolChecks.theory && eolChecks.payment && eolChecks.notes)
                }
                className="flex-1 h-11 rounded-lg text-[14px] font-semibold text-white"
                style={{
                  backgroundColor:
                    eolChecks.theory && eolChecks.payment && eolChecks.notes
                      ? "#16A34A"
                      : "#9CA3AF",
                  border: "none",
                  opacity: eolSubmitting ? 0.7 : 1,
                }}
              >
                {eolSubmitting ? "Saving…" : "Complete EOL"}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!cancelLesson}
        title="Cancel this lesson?"
        message={
          cancelLesson
            ? `${pupilDisplayName(cancelLesson.pupil)} · ${formatTime(cancelLesson.lesson_time)}`
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
