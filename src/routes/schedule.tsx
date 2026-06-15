import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Plus, Calendar as CalendarIcon, CalendarOff, RefreshCw } from "lucide-react";
import { BottomNav } from "../components/dsm/BottomNav";
import { Card } from "../components/dsm/Card";
import { SectionHeader } from "../components/dsm/SectionHeader";
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

interface Lesson {
  id: string;
  lesson_date: string;
  lesson_time: string;
  duration_minutes: number | null;
  status: string;
  pupil: { name: string } | null;
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

function SchedulePage() {
  const navigate = useNavigate();
  const today = useMemo(() => startOfDay(new Date()), []);
  const tomorrow = useMemo(() => addDays(today, 1), [today]);
  const dayAfter = useMemo(() => addDays(today, 2), [today]);
  const next14End = useMemo(() => addDays(today, 16), [today]);

  const [tab, setTab] = useState<TabKey>("today");
  const [lessons, setLessons] = useState<Lesson[] | null>(null);

  useEffect(() => {
    setLessons(null);
    let q = supabase
      .from("lessons")
      .select("id, lesson_date, lesson_time, duration_minutes, status, pupil:pupils(name)")
      .is("deleted_at", null)
      .order("lesson_date", { ascending: true })
      .order("lesson_time", { ascending: true });

    if (tab === "today") q = q.eq("lesson_date", ymd(today));
    else if (tab === "tomorrow") q = q.eq("lesson_date", ymd(tomorrow));
    else q = q.gte("lesson_date", ymd(dayAfter)).lte("lesson_date", ymd(next14End));

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

  const renderLesson = (l: Lesson) => {
    const name = l.pupil?.name ?? "Unknown pupil";
    const color = statusColor(l.status);
    return (
      <button
        key={l.id}
        type="button"
        onClick={() => navigate({ to: "/lessons/$id" as never, params: { id: l.id } as never })}
        className="block w-full text-left"
      >
        <Card>
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[14px] font-semibold text-[#0F2044]" style={POPPINS}>
                {formatTime(l.lesson_time)}
              </div>
              <div className="text-[14px] text-[#1A1A2E] truncate" style={POPPINS}>
                {name}
              </div>
              <div className="text-[13px] text-[#6B7280]" style={POPPINS}>
                {formatDuration(l.duration_minutes)}
              </div>
            </div>
            <span
              className="text-[11px] text-white px-2 py-1 rounded-full shrink-0 capitalize"
              style={{ backgroundColor: color, ...POPPINS }}
            >
              {l.status}
            </span>
          </div>
        </Card>
      </button>
    );
  };

  return (
    <div className="min-h-screen bg-white pb-24 pb-safe relative" style={POPPINS}>
      {/* Top bar */}
      <div
        className="sticky top-0 z-40 flex items-center justify-between px-4"
        style={{ height: 52, backgroundColor: "#0F2044" }}
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
                <div
                  className="text-[13px]"
                  style={{ fontWeight: active ? 600 : 500 }}
                >
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

        {lessons === null ? null : lessons.length === 0 ? (
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

        {/* Ghost actions */}
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

      <BottomNav active="schedule" />
    </div>
  );
}
