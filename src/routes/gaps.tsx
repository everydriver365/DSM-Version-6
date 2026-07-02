import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, Check, Plus } from "lucide-react";
import { SectionHeader } from "../components/dsm/SectionHeader";
import { Card } from "../components/dsm/Card";
import { Button } from "../components/dsm/Button";
import { supabase } from "../lib/supabaseClient";

export const Route = createFileRoute("/gaps")({
  head: () => ({
    meta: [
      { title: "Find gaps — DSM" },
      { name: "description", content: "Find free slots between your lessons." },
    ],
  }),
  component: GapsPage,
});

const POPPINS = { fontFamily: "Inter, sans-serif" } as const;

interface LessonRow {
  id: string;
  lesson_date: string;
  lesson_time: string;
  duration_minutes: number | null;
  status: string;
}

interface Gap {
  start: string; // HH:MM
  end: string;
  minutes: number;
}

function ymd(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function toMinutes(t: string) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}
function toHHMM(mins: number) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}
function fmtDuration(mins: number) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h && m) return `${h}h ${m}m`;
  if (h) return `${h}h`;
  return `${m}m`;
}
function fmtLong(d: Date) {
  return d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });
}

function GapsPage() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);
  const days = useMemo(() => {
    return Array.from({ length: 14 }, (_, i) => {
      const d = new Date(today);
      d.setDate(d.getDate() + i);
      return d;
    });
  }, [today]);

  const [selectedDate, setSelectedDate] = useState<string>(ymd(today));
  const [minGapMins, setMinGapMins] = useState<number>(60);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("17:00");
  const [lessons, setLessons] = useState<LessonRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      const uid = data.user?.id ?? null;
      setUserId(uid);
      if (!uid) return;
      const { data: wh, error: whErr } = await supabase
        .from("working_hours")
        .select("start_time, end_time")
        .eq("instructor_id", uid)
        .maybeSingle();
      if (whErr) console.error("[gaps] working_hours error", whErr);
      if (wh) {
        if (wh.start_time) setStartTime(String(wh.start_time).slice(0, 5));
        if (wh.end_time) setEndTime(String(wh.end_time).slice(0, 5));
      }
    })();
  }, []);

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    (async () => {
      const { data, error } = await supabase
        .from("lessons")
        .select("id, lesson_date, lesson_time, duration_minutes, status")
        .eq("instructor_id", userId)
        .eq("lesson_date", selectedDate)
        .neq("status", "cancelled")
        .order("lesson_time", { ascending: true });
      if (error) console.error("[gaps] lessons error", error);
      setLessons((data ?? []) as LessonRow[]);
      setLoading(false);
    })();
  }, [userId, selectedDate]);

  const gaps: Gap[] = useMemo(() => {
    const dayStart = toMinutes(startTime);
    const dayEnd = toMinutes(endTime);
    if (dayEnd <= dayStart) return [];

    if (lessons.length === 0) {
      const span = dayEnd - dayStart;
      if (span >= minGapMins) {
        return [{ start: toHHMM(dayStart), end: toHHMM(dayEnd), minutes: span }];
      }
      return [];
    }

    const busy = lessons
      .map((l) => {
        const s = toMinutes((l.lesson_time ?? "00:00:00").slice(0, 5));
        const e = s + (l.duration_minutes ?? 60);
        return { s, e };
      })
      .sort((a, b) => a.s - b.s);

    const result: Gap[] = [];
    let cursor = dayStart;
    for (const b of busy) {
      if (b.s > cursor) {
        const gapEnd = Math.min(b.s, dayEnd);
        const dur = gapEnd - cursor;
        if (dur >= minGapMins) {
          result.push({ start: toHHMM(cursor), end: toHHMM(gapEnd), minutes: dur });
        }
      }
      cursor = Math.max(cursor, b.e);
      if (cursor >= dayEnd) break;
    }
    if (cursor < dayEnd) {
      const dur = dayEnd - cursor;
      if (dur >= minGapMins) {
        result.push({ start: toHHMM(cursor), end: toHHMM(dayEnd), minutes: dur });
      }
    }
    return result;
  }, [lessons, startTime, endTime, minGapMins]);

  const selectedDateObj = useMemo(() => {
    const [y, m, d] = selectedDate.split("-").map(Number);
    return new Date(y, m - 1, d);
  }, [selectedDate]);

  const durationOptions: { label: string; mins: number }[] = [
    { label: "1h", mins: 60 },
    { label: "1.5h", mins: 90 },
    { label: "2h", mins: 120 },
  ];

  return (
    <div className="min-h-screen bg-white pb-8 pb-safe" style={POPPINS}>
      {/* TOP BAR */}
      <div
        className="sticky top-0 z-40 flex items-center px-2"
        style={{ height: 52, backgroundColor: "#072b47" }}
      >
        <button
          type="button"
          aria-label="Back"
          onClick={() => navigate({ to: "/home" })}
          className="flex items-center justify-center"
          style={{ width: 40, height: 40 }}
        >
          <ChevronLeft size={24} color="#FFFFFF" />
        </button>
        <div className="flex-1 text-center text-white text-[15px] font-semibold">Find gaps</div>
        <div style={{ width: 40 }} />
      </div>

      {/* DATE STRIP */}
      <div className="mt-3 overflow-x-auto no-scrollbar">
        <div className="flex gap-2 px-4" style={{ width: "max-content" }}>
          {days.map((d) => {
            const key = ymd(d);
            const active = key === selectedDate;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setSelectedDate(key)}
                className="flex flex-col items-center justify-center rounded-lg"
                style={{
                  width: 52,
                  height: 64,
                  backgroundColor: active ? "#1A4A6E" : "#F8F9FB",
                  color: active ? "#FFFFFF" : "#0C2340",
                  borderWidth: "0.5px",
                  borderStyle: "solid",
                  borderColor: active ? "#1A4A6E" : "#EEF2F7",
                }}
              >
                <span className="text-[10px] uppercase font-medium">
                  {d.toLocaleDateString("en-GB", { weekday: "short" })}
                </span>
                <span className="text-[18px] font-semibold leading-tight mt-0.5">
                  {d.getDate()}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* SETTINGS CARD */}
      <div className="mx-4 mt-3">
        <Card>
          <div className="text-[12px] font-medium text-[#6B7280] mb-2">
            Minimum gap duration
          </div>
          <div className="flex gap-2">
            {durationOptions.map((o) => {
              const active = minGapMins === o.mins;
              return (
                <button
                  key={o.mins}
                  type="button"
                  onClick={() => setMinGapMins(o.mins)}
                  className="flex-1 h-10 rounded-lg text-[13px] font-medium"
                  style={{
                    backgroundColor: active ? "#1A4A6E" : "#FFFFFF",
                    color: active ? "#FFFFFF" : "#0C2340",
                    borderWidth: "0.5px",
                    borderStyle: "solid",
                    borderColor: active ? "#1A4A6E" : "#EEF2F7",
                  }}
                >
                  {o.label}
                </button>
              );
            })}
          </div>

          <div className="text-[12px] font-medium text-[#6B7280] mt-4 mb-2">
            Show gaps between
          </div>
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="block text-[11px] text-[#6B7280] mb-1">Start</label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="h-11 w-full rounded-lg px-3 text-[14px] text-[#1A1A2E] bg-white focus:border-[#1A4A6E] focus:outline-none"
                style={{
                  fontFamily: "Inter, sans-serif",
                  borderWidth: "0.5px",
                  borderStyle: "solid",
                  borderColor: "#EEF2F7",
                }}
              />
            </div>
            <div className="flex-1">
              <label className="block text-[11px] text-[#6B7280] mb-1">End</label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="h-11 w-full rounded-lg px-3 text-[14px] text-[#1A1A2E] bg-white focus:border-[#1A4A6E] focus:outline-none"
                style={{
                  fontFamily: "Inter, sans-serif",
                  borderWidth: "0.5px",
                  borderStyle: "solid",
                  borderColor: "#EEF2F7",
                }}
              />
            </div>
          </div>
        </Card>
      </div>

      <div className="px-4">
        <SectionHeader>FREE SLOTS ON {fmtLong(selectedDateObj).toUpperCase()}</SectionHeader>
      </div>

      <div className="px-4 flex flex-col gap-2">
        {loading ? (
          <div className="text-center text-[13px] text-[#6B7280] py-6">Loading...</div>
        ) : gaps.length === 0 ? (
          <Card className="flex flex-col items-center justify-center py-8">
            <div
              className="flex items-center justify-center rounded-full mb-3"
              style={{ width: 48, height: 48, backgroundColor: "#ECFDF5" }}
            >
              <Check size={24} color="#16A34A" />
            </div>
            <div className="text-[14px] font-semibold text-[#0C2340]">
              No gaps found — fully booked!
            </div>
          </Card>
        ) : (
          gaps.map((g, i) => (
            <Card key={i}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[16px] font-semibold text-[#0C2340]">
                    {g.start} – {g.end}
                  </div>
                  <span
                    className="inline-block mt-1 text-[11px] font-medium px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: "#EEF4FB", color: "#1A4A6E" }}
                  >
                    {fmtDuration(g.minutes)}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  inline
                  onClick={() =>
                    navigate({
                      to: "/lessons/new",
                      search: { date: selectedDate, time: g.start } as never,
                    })
                  }
                  className="!h-9 !px-3"
                >
                  <Plus size={14} className="mr-1" /> Add lesson
                </Button>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

export default GapsPage;
