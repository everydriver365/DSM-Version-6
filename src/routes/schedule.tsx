import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";
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

interface Lesson {
  id: string;
  scheduled_at: string;
  duration_minutes: number | null;
  status: string;
  pupil: { first_name: string; last_name: string } | null;
}

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

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

function formatTime(iso: string) {
  const d = new Date(iso);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
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
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(today, i)), [today]);
  const [selected, setSelected] = useState<Date>(today);
  const [lessons, setLessons] = useState<Lesson[] | null>(null);

  useEffect(() => {
    const start = startOfDay(selected);
    const end = addDays(start, 1);
    setLessons(null);
    supabase
      .from("lessons")
      .select("id, scheduled_at, duration_minutes, status, pupil:pupils(first_name, last_name)")
      .gte("scheduled_at", start.toISOString())
      .lt("scheduled_at", end.toISOString())
      .order("scheduled_at", { ascending: true })
      .then(({ data }) => setLessons((data as unknown as Lesson[]) ?? []));
  }, [selected]);

  return (
    <div
      className="min-h-screen bg-white pb-24 pb-safe relative"
      style={{ fontFamily: "Poppins, sans-serif" }}
    >
      <div className="px-4 pt-6">
        <p className="text-[20px] font-semibold text-[#0F2044]" style={{ fontFamily: 'Poppins, sans-serif', fontSize: '20px', fontWeight: 600 }}>Schedule</p>

        <div className="mt-4 -mx-4 px-4 overflow-x-auto">
          <div className="flex gap-2">
            {days.map((d) => {
              const isSel = d.getTime() === selected.getTime();
              return (
                <button
                  key={d.toISOString()}
                  onClick={() => setSelected(d)}
                  className="flex flex-col items-center justify-center rounded-xl shrink-0"
                  style={{
                    width: 56,
                    height: 64,
                    backgroundColor: isSel ? "#1A52A0" : "#F8F9FB",
                    color: isSel ? "#FFFFFF" : "#0F2044",
                    borderWidth: "0.5px",
                    borderStyle: "solid",
                    borderColor: isSel ? "#1A52A0" : "#E2E6ED",
                  }}
                >
                  <span
                    className="text-[11px]"
                    style={{ color: isSel ? "#FFFFFF" : "#6B7280" }}
                  >
                    {DAY_NAMES[d.getDay()]}
                  </span>
                  <span className="text-[16px] font-semibold">{d.getDate()}</span>
                </button>
              );
            })}
          </div>
        </div>

        <SectionHeader>Lessons</SectionHeader>

        {lessons === null ? null : lessons.length === 0 ? (
          <div className="flex items-center justify-center py-20">
            <p className="text-[14px] text-[#6B7280]">No lessons today</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {lessons.map((l) => {
              const name = l.pupil
                ? `${l.pupil.first_name} ${l.pupil.last_name}`
                : "Unknown pupil";
              const color = statusColor(l.status);
              return (
                <Card key={l.id}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-[14px] font-semibold text-[#0F2044]">
                        {formatTime(l.scheduled_at)}
                      </div>
                      <div className="text-[14px] text-[#1A1A2E] truncate">{name}</div>
                      <div className="text-[13px] text-[#6B7280]">
                        {formatDuration(l.duration_minutes)}
                      </div>
                    </div>
                    <span
                      className="text-[11px] text-white px-2 py-1 rounded-full shrink-0 capitalize"
                      style={{ backgroundColor: color }}
                    >
                      {l.status}
                    </span>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <button
        type="button"
        aria-label="Add lesson"
        onClick={() => navigate({ to: "/lessons/new" })}
        className="fixed z-50 flex items-center justify-center rounded-full"
        style={{
          width: 52,
          height: 52,
          backgroundColor: "#1A52A0",
          color: "#FFFFFF",
          right: 16,
          bottom: "calc(env(safe-area-inset-bottom, 0px) + 80px)",
          border: "none",
        }}
      >
        <Plus size={24} color="#FFFFFF" />
      </button>

      <BottomNav active="schedule" />
    </div>
  );
}
