import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Calendar } from "lucide-react";
import { Card } from "../components/dsm/Card";
import { SectionHeader } from "../components/dsm/SectionHeader";
import { StatTile } from "../components/dsm/StatTile";
import { Button } from "../components/dsm/Button";
import { supabase } from "../lib/supabaseClient";

export const Route = createFileRoute("/pupils/history/$id")({
  head: () => ({
    meta: [{ title: "Lesson history — DSM by EveryDriver" }],
  }),
  component: PupilHistoryPage,
});

const POPPINS = { fontFamily: "Inter, sans-serif" } as const;

interface Lesson {
  id: string;
  lesson_date: string;
  lesson_time: string;
  duration_minutes: number | null;
  status: string;
}

function formatTime(t: string) {
  return (t ?? "").slice(0, 5);
}
function formatDateShort(d: Date) {
  return d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
}
function monthLabel(d: Date) {
  return d.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
}
function statusColor(s: string) {
  const x = (s ?? "").toLowerCase();
  if (x === "completed") return "#1877D6";
  if (x === "confirmed") return "#1877D6";
  if (x === "cancelled") return "#1877D6";
  if (x === "pending") return "#1877D6";
  return "#6B7280";
}

function PupilHistoryPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const [lessons, setLessons] = useState<Lesson[] | null>(null);

  useEffect(() => {
    supabase
      .from("lessons")
      .select("id, lesson_date, lesson_time, duration_minutes, status")
      .eq("pupil_id", id)
      .is("deleted_at", null)
      .order("lesson_date", { ascending: false })
      .order("lesson_time", { ascending: false })
      .then(({ data, error }) => {
        if (error) console.error("[pupil-history] fetch error", error);
        setLessons((data as Lesson[]) ?? []);
      });
  }, [id]);

  const total = lessons?.length ?? 0;
  const completed = lessons?.filter((l) => l.status === "completed").length ?? 0;
  const cancelled = lessons?.filter((l) => l.status === "cancelled").length ?? 0;

  // Group by month key
  const groups: { key: string; label: string; items: Lesson[] }[] = [];
  if (lessons) {
    const map = new Map<string, { label: string; items: Lesson[] }>();
    for (const l of lessons) {
      const d = new Date(`${l.lesson_date}T00:00:00`);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (!map.has(key)) map.set(key, { label: monthLabel(d), items: [] });
      map.get(key)!.items.push(l);
    }
    for (const [key, v] of map) groups.push({ key, label: v.label, items: v.items });
  }

  return (
    <div className="min-h-screen bg-white pb-8" style={POPPINS}>
      <div
        className="sticky top-0 z-40 flex items-center px-2"
        style={{ height: 52, backgroundColor: "#0B1F3A" }}
      >
        <button
          type="button"
          aria-label="Back"
          onClick={() => navigate({ to: "/pupils/$id", params: { id } })}
          className="flex items-center justify-center"
          style={{ width: 40, height: 40 }}
        >
          <ArrowLeft size={22} color="#FFFFFF" />
        </button>
        <div
          className="flex-1 text-center text-[15px] font-semibold text-white"
          style={POPPINS}
        >
          Lesson history
        </div>
        <div style={{ width: 40 }} />
      </div>

      <div className="px-4 mt-3">
        <div className="grid grid-cols-3 gap-2">
          <StatTile value={total} label="Total" />
          <StatTile value={completed} label="Completed" />
          <StatTile value={cancelled} label="Cancelled" />
        </div>

        {lessons === null ? null : lessons.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Calendar size={40} color="#6B7280" />
            <p className="mt-3 text-[14px] text-[#6B7280]" style={POPPINS}>
              No lesson history
            </p>
          </div>
        ) : (
          groups.map((g) => (
            <div key={g.key}>
              <SectionHeader>{g.label}</SectionHeader>
              <div style={{ background: "#FFFFFF", borderRadius: 16, overflow: "hidden", border: "0.5px solid #F3F4F6" }}>
                {g.items.map((l, idx) => {
                  const d = new Date(`${l.lesson_date}T00:00:00`);
                  const isCompleted = l.status === "completed";
                  const isCancelled = l.status === "cancelled";
                  const bg = isCancelled ? "#E5E7EB" : "#1A52A0";
                  return (
                    <div
                      key={l.id}
                      onClick={() => navigate({ to: "/lessons/$id", params: { id: l.id } })}
                      style={{
                        width: "100%", display: "flex", alignItems: "center", gap: 12,
                        padding: "12px 16px", cursor: "pointer",
                        borderTop: idx === 0 ? "none" : "0.5px solid #F3F4F6",
                        ...POPPINS,
                      }}
                    >
                      <div style={{ width: 40, height: 40, borderRadius: "50%", background: bg, color: "#FFFFFF", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, flexShrink: 0 }}>
                        <Calendar size={18} color="#FFFFFF" />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 600, color: isCancelled ? "#6B7280" : "#0F2044", textDecoration: isCancelled ? "line-through" : "none", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", ...POPPINS }}>
                          {formatDateShort(d)}
                        </div>
                        <div style={{ fontSize: 12, color: "#9CA3AF", marginTop: 2, ...POPPINS }}>
                          {formatTime(l.lesson_time)} · {l.duration_minutes ?? 60} mins
                        </div>
                      </div>
                      {isCancelled ? (
                        <span style={{ background: "#FEE2E2", color: "#991B1B", fontSize: 12, fontWeight: 700, padding: "4px 8px", borderRadius: 8, ...POPPINS }}>Cancelled</span>
                      ) : isCompleted ? (
                        <Button
                          variant="ghost"
                          inline
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate({ to: "/lessons/feedback/$id", params: { id: l.id } });
                          }}
                          style={{ height: 28, fontSize: 12, padding: "0 10px" }}
                        >
                          Feedback
                        </Button>
                      ) : (
                        <span style={{ background: "#E6F1FB", color: "#185FA5", fontSize: 12, fontWeight: 700, padding: "4px 8px", borderRadius: 8, ...POPPINS, textTransform: "capitalize" }}>
                          {l.status}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))

        )}
      </div>
    </div>
  );
}
