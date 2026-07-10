import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
import { PageLayout } from "@/components/PageLayout";
  ArrowLeft,
  Phone,
  MessageSquare,
  Navigation,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Card } from "../components/dsm/Card";
import { SectionHeader } from "../components/dsm/SectionHeader";
import { Button } from "../components/dsm/Button";
import { supabase } from "../lib/supabaseClient";

export const Route = createFileRoute("/manifest")({
  head: () => ({
    meta: [
      { title: "Today's manifest — DSM by EveryDriver" },
      { name: "description", content: "Your daily lesson plan and end-of-day summary." },
    ],
  }),
  component: ManifestPage,
});

const POPPINS = { fontFamily: "Inter, sans-serif" } as const;

interface Lesson {
  id: string;
  lesson_date: string;
  lesson_time: string;
  duration_minutes: number | null;
  status: string;
  notes: string | null;
  pupils?: { name: string; phone: string | null } | null;
}

function ymd(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function lessonTime(l: Lesson) {
  const t = (l.lesson_time ?? "00:00:00").slice(0, 5);
  return t;
}
function statusColor(s: string) {
  if (s === "confirmed") return "#1877D6";
  if (s === "completed") return "#1877D6";
  if (s === "pending") return "#1877D6";
  if (s === "cancelled") return "#1877D6";
  return "#6B7280";
}

function ManifestPage() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [earned, setEarned] = useState(0);
  const [miles, setMiles] = useState(0);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [savedMsg, setSavedMsg] = useState<string | null>(null);

  const today = useMemo(() => startOfDay(new Date()), []);
  const todayYmd = ymd(today);
  const notesKey = `dsm:daily_notes:${todayYmd}`;

  const dateLabel = today.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });

  useEffect(() => {
    setNotes(localStorage.getItem(notesKey) ?? "");
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (data.user) setUserId(data.user.id);
    })();
  }, [notesKey]);

  useEffect(() => {
    if (!userId) return;
    (async () => {
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const { data: ls } = await supabase
        .from("lessons")
        .select(
          "id, lesson_date, lesson_time, duration_minutes, status, notes, pupils(name, phone)",
        )
        .eq("instructor_id", userId)
        .is("deleted_at", null)
        .eq("lesson_date", todayYmd)
        .order("lesson_time", { ascending: true });
      setLessons((ls ?? []) as unknown as Lesson[]);

      const { data: pays } = await supabase
        .from("payments")
        .select("amount, paid_at")
        .eq("instructor_id", userId)
        .is("deleted_at", null)
        .gte("paid_at", today.toISOString())
        .lt("paid_at", tomorrow.toISOString());
      setEarned((pays ?? []).reduce((s, r) => s + Number(r.amount ?? 0), 0));

      const { data: ms } = await supabase
        .from("mileage_logs")
        .select("miles")
        .eq("instructor_id", userId)
        .is("deleted_at", null)
        .eq("trip_date", todayYmd);
      setMiles((ms ?? []).reduce((s, r) => s + Number(r.miles ?? 0), 0));
    })();
  }, [userId, today, todayYmd]);

  const totalMinutes = lessons.reduce((s, l) => s + (l.duration_minutes ?? 0), 0);
  const totalHours = (totalMinutes / 60).toFixed(1);
  const completedCount = lessons.filter((l) => l.status === "completed").length;
  const cancelledCount = lessons.filter((l) => l.status === "cancelled").length;

  function saveNotes(v: string) {
    setNotes(v);
    localStorage.setItem(notesKey, v);
  }

  async function completeDay() {
    if (!userId) return;
    const ids = lessons.filter((l) => l.status === "confirmed").map((l) => l.id);
    if (ids.length === 0) {
      setSavedMsg("No confirmed lessons to complete.");
      return;
    }
    const { error } = await supabase
      .from("lessons")
      .update({ status: "completed" })
      .in("id", ids);
    if (error) {
      console.error("[manifest] complete day error", error);
      setSavedMsg("Failed to complete day.");
      return;
    }
    setLessons((prev) =>
      prev.map((l) => (ids.includes(l.id) ? { ...l, status: "completed" } : l)),
    );
    setSavedMsg(`Marked ${ids.length} lesson${ids.length === 1 ? "" : "s"} as completed.`);
  }

  return (
    <PageLayout className="pb-12" style={POPPINS}>
      <div
        className="sticky top-0 z-40 h-[52px] px-4 flex items-center justify-between"
        style={{ backgroundColor: "#0B1F3A" }}
      >
        <button
          type="button"
          aria-label="Back"
          onClick={() => navigate({ to: "/home" })}
          className="flex items-center justify-center"
          style={{ width: 40, height: 40 }}
        >
          <ArrowLeft size={22} color="#ffffff" />
        </button>
        <div className="text-white text-[15px] font-semibold">Today's manifest</div>
        <div className="text-white text-[13px]" style={{ minWidth: 40, textAlign: "right" }}>
          {dateLabel}
        </div>
      </div>

      {/* SUMMARY STRIP */}
      <div
        className="px-4 py-3 flex"
        style={{ backgroundColor: "#0B1F3A", gap: 8 }}
      >
        <Stat value={String(lessons.length)} label="LESSONS" />
        <Stat value={totalHours} label="HOURS" />
        <Stat value={`£${earned.toFixed(0)}`} label="EARNED" color="#1877D6" />
        <Stat value={miles.toFixed(0)} label="MILES" />
      </div>

      <div className="mx-4">
        <SectionHeader>LESSON PLAN</SectionHeader>
        <div className="flex flex-col" style={{ gap: 8 }}>
          {lessons.length === 0 ? (
            <div className="text-[13px] text-[#6B7280] text-center py-6">
              No lessons today
            </div>
          ) : (
            lessons.map((l) => {
              const isOpen = expanded === l.id;
              return (
                <div
                  key={l.id}
                  className="bg-white"
                  style={{
                    padding: 12,
                    borderRadius: 10,
                    borderWidth: "0.5px",
                    borderStyle: "solid",
                    borderColor: "#EEF2F7",
                  }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start" style={{ gap: 12 }}>
                      <span className="text-[14px] font-bold text-[#0B1F3A]">
                        {lessonTime(l)}
                      </span>
                      <div>
                        <div className="text-[14px] text-[#0B1F3A]">
                          {l.pupils?.name ?? "Pupil"}
                        </div>
                        <div className="text-[13px] text-[#6B7280]">
                          {l.duration_minutes ?? 60} min
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center" style={{ gap: 8 }}>
                      <span
                        className="text-[10px] uppercase font-medium"
                        style={{
                          color: statusColor(l.status),
                          letterSpacing: "0.05em",
                          padding: "3px 8px",
                          borderRadius: 999,
                          backgroundColor: `${statusColor(l.status)}14`,
                        }}
                      >
                        {l.status}
                      </span>
                      <button
                        type="button"
                        aria-label={isOpen ? "Collapse" : "Expand"}
                        onClick={() => setExpanded(isOpen ? null : l.id)}
                      >
                        {isOpen ? (
                          <ChevronUp size={18} color="#6B7280" />
                        ) : (
                          <ChevronDown size={18} color="#6B7280" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="mt-2 flex" style={{ gap: 6 }}>
                    <ActionBtn
                      icon={<Phone size={14} />}
                      label="Call"
                      bg="#1877D6"
                      href={l.pupils?.phone ? `tel:${l.pupils.phone}` : undefined}
                    />
                    <ActionBtn
                      icon={<MessageSquare size={14} />}
                      label="Text"
                      bg="#F3F4F6"
                      color="#0B1F3A"
                      href={l.pupils?.phone ? `sms:${l.pupils.phone}` : undefined}
                    />
                    <ActionBtn
                      icon={<Navigation size={14} />}
                      label="Navigate"
                      bg="#1877D6"
                    />
                  </div>

                  {isOpen && (
                    <div
                      className="mt-3 text-[13px] text-[#6B7280]"
                      style={{
                        padding: 10,
                        borderRadius: 8,
                        backgroundColor: "#F8F9FB",
                      }}
                    >
                      {l.notes || "No notes for this lesson."}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        <SectionHeader>END OF DAY</SectionHeader>
        <Card className="bg-white">
          <SummaryRow label="Total earned today" value={`£${earned.toFixed(2)}`} color="#1877D6" />
          <SummaryRow label="Lessons completed" value={String(completedCount)} color="#1877D6" />
          <SummaryRow label="Lessons cancelled" value={String(cancelledCount)} color="#1877D6" />

          <div className="mt-3">
            <label className="block mb-1 text-[12px] font-medium text-[#6B7280]">
              Notes
            </label>
            <textarea
              rows={4}
              value={notes}
              onChange={(e) => saveNotes(e.target.value)}
              placeholder="How did the day go?"
              className="w-full rounded-lg p-3 text-[14px] text-[#0B1F3A] bg-white focus:border-[#1877D6] focus:outline-none resize-none"
              style={{
                fontFamily: "Inter, sans-serif",
                borderWidth: "0.5px",
                borderStyle: "solid",
                borderColor: "#EEF2F7",
              }}
            />
          </div>

          <div className="mt-4">
            <Button onClick={completeDay}>Complete day</Button>
          </div>

          {savedMsg && (
            <div
              className="mt-3 text-[13px]"
              style={{
                padding: 10,
                borderRadius: 8,
                backgroundColor: "#F3F8FF",
                color: "#0B1F3A",
              }}
            >
              {savedMsg}
            </div>
          )}
        </Card>
      </div>
    </PageLayout>
  );
}

function Stat({
  value,
  label,
  color = "#ffffff",
}: {
  value: string;
  label: string;
  color?: string;
}) {
  return (
    <div className="flex-1 text-center">
      <div className="text-[18px] font-bold" style={{ color }}>
        {value}
      </div>
      <div
        className="text-[10px] uppercase"
        style={{ color: "#9CA3AF", letterSpacing: "0.08em" }}
      >
        {label}
      </div>
    </div>
  );
}

function ActionBtn({
  icon,
  label,
  bg,
  color = "#ffffff",
  href,
}: {
  icon: React.ReactNode;
  label: string;
  bg: string;
  color?: string;
  href?: string;
}) {
  const content = (
    <span className="flex-1 flex items-center justify-center gap-1 text-[12px] font-medium">
      {icon} {label}
    </span>
  );
  const style = {
    height: 32,
    borderRadius: 8,
    backgroundColor: bg,
    color,
    flex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  } as const;
  if (href) {
    return (
      <a href={href} style={style}>
        {content}
      </a>
    );
  }
  return (
    <button type="button" style={style}>
      {content}
    </button>
  );
}

function SummaryRow({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-[13px] text-[#0B1F3A]">{label}</span>
      <span className="text-[13px] font-semibold" style={{ color }}>
        {value}
      </span>
    </div>
  );
}
