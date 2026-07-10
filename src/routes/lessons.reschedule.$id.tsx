import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { Card } from "../components/dsm/Card";
import { SectionHeader } from "../components/dsm/SectionHeader";
import { supabase } from "../lib/supabaseClient";
import { PageLayout } from "@/components/PageLayout";

export const Route = createFileRoute("/lessons/reschedule/$id")({
  head: () => ({ meta: [{ title: "Reschedule lesson — DSM by EveryDriver" }] }),
  component: RescheduleLessonPage,
});

const POPPINS = { fontFamily: "Inter, sans-serif" } as const;

interface Lesson {
  id: string;
  lesson_date: string;
  lesson_time: string;
  duration_minutes: number | null;
  pupil_id: string;
  pupils: { id: string; name: string; phone: string | null } | null;
}

const DURATIONS = [
  { label: "1h", mins: 60 },
  { label: "1.5h", mins: 90 },
  { label: "2h", mins: 120 },
  { label: "3h", mins: 180 },
  { label: "4h", mins: 240 },
  { label: "5h", mins: 300 },
];

function formatTime(t: string) {
  return (t ?? "").slice(0, 5);
}
function formatDateLong(d: Date) {
  return d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
}
function formatDuration(mins: number | null) {
  const m = mins ?? 60;
  if (m % 60 === 0) return `${m / 60}h`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}
function todayIso() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function RescheduleLessonPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();

  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [duration, setDuration] = useState(60);
  const [notify, setNotify] = useState(true);
  const [smsEdited, setSmsEdited] = useState(false);
  const [sms, setSms] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    supabase
      .from("lessons")
      .select("id, lesson_date, lesson_time, duration_minutes, pupil_id, pupils(id, name, phone)")
      .eq("id", id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) console.error("[reschedule] fetch error", error);
        const l = (data as unknown as Lesson) ?? null;
        setLesson(l);
        if (l) {
          setDate(l.lesson_date);
          setTime(formatTime(l.lesson_time));
          setDuration(l.duration_minutes ?? 60);
        }
      });
  }, [id]);

  const pupilName = lesson?.pupils?.name ?? "Unknown pupil";
  const currentDateObj = lesson ? new Date(`${lesson.lesson_date}T00:00:00`) : null;

  const newDateObj = useMemo(() => (date ? new Date(`${date}T00:00:00`) : null), [date]);

  const defaultSms = useMemo(() => {
    const first = (pupilName.split(" ")[0]) || "there";
    const dStr = newDateObj ? formatDateLong(newDateObj) : "[new date]";
    const tStr = time || "[new time]";
    return `Hi ${first}, your lesson has been rescheduled to ${dStr} at ${tStr}. See you then!`;
  }, [pupilName, newDateObj, time]);

  useEffect(() => {
    if (!smsEdited) setSms(defaultSms);
  }, [defaultSms, smsEdited]);

  const minDate = todayIso();
  const canSubmit = !!lesson && !!date && !!time && date >= minDate && !submitting;

  async function submit() {
    if (!canSubmit || !lesson) return;
    setSubmitting(true);

    const { error: updErr } = await supabase
      .from("lessons")
      .update({
        lesson_date: date,
        lesson_time: time.length === 5 ? `${time}:00` : time,
        duration_minutes: duration,
      })
      .eq("id", lesson.id);

    if (updErr) {
      console.error("[reschedule] update error", updErr);
      toast.error("Couldn't reschedule lesson");
      setSubmitting(false);
      return;
    }

    const { data: userRes } = await supabase.auth.getUser();
    const instructorId = userRes.user?.id ?? null;

    if (notify && lesson.pupils?.phone && instructorId) {
      const { error: smsErr } = await supabase.from("sms_queue").insert({
        instructor_id: instructorId,
        pupil_phone: lesson.pupils.phone,
        message: sms,
        scheduled_for: new Date().toISOString(),
      });
      if (smsErr) console.error("[reschedule] sms_queue error", smsErr);
    }

    if (instructorId && newDateObj) {
      const { error: notifErr } = await supabase.from("instructor_notifications").insert({
        instructor_id: instructorId,
        title: "Lesson rescheduled",
        body: `${pupilName} moved to ${formatDateLong(newDateObj)} ${time}`,
        type: "lesson",
        read: false,
      });
      if (notifErr) console.error("[reschedule] notification error", notifErr);
    }

    setSubmitting(false);
    toast.success("Lesson rescheduled");
    navigate({ to: "/schedule" });
  }

  return (
    <PageLayout className="pb-12" style={POPPINS}>
      <div
        className="sticky top-0 z-40 flex items-center justify-between px-2"
        style={{ height: 52, backgroundColor: "#0B1F3A" }}
      >
        <button
          type="button"
          aria-label="Back"
          onClick={() => navigate({ to: "/lessons/$id", params: { id } })}
          className="flex items-center justify-center"
          style={{ width: 40, height: 40 }}
        >
          <ArrowLeft size={22} color="#FFFFFF" />
        </button>
        <div className="flex-1 text-center text-[15px] font-semibold text-white" style={POPPINS}>
          Reschedule lesson
        </div>
        <div style={{ width: 40 }} />
      </div>

      {lesson && currentDateObj && (
        <div className="px-4">
          <div className="mt-3">
            <Card className="!bg-[#F8F9FB]">
              <div
                className="text-[10px] font-semibold uppercase"
                style={{ color: "#9CA3AF", letterSpacing: "0.05em" }}
              >
                Current lesson
              </div>
              <div className="text-[16px] font-semibold mt-1" style={{ color: "#0B1F3A" }}>
                {pupilName}
              </div>
              <div className="text-[14px] font-bold mt-1" style={{ color: "#1877D6" }}>
                {formatDateLong(currentDateObj)} · {formatTime(lesson.lesson_time)}
              </div>
              <div className="text-[13px] mt-0.5" style={{ color: "#6B7280" }}>
                {formatDuration(lesson.duration_minutes)}
              </div>
            </Card>
          </div>

          <SectionHeader>NEW DATE & TIME</SectionHeader>
          <Card>
            <label className="text-[12px] font-semibold" style={{ color: "#0B1F3A" }}>
              Date
            </label>
            <input
              type="date"
              value={date}
              min={minDate}
              onChange={(e) => setDate(e.target.value)}
              className="w-full mt-1 px-3 bg-white"
              style={{
                height: 44,
                borderRadius: 8,
                border: "1px solid #EEF2F7",
                color: "#0B1F3A",
                fontSize: 14,
                ...POPPINS,
              }}
            />

            <label className="text-[12px] font-semibold mt-3 block" style={{ color: "#0B1F3A" }}>
              Time
            </label>
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="w-full mt-1 px-3 bg-white"
              style={{
                height: 44,
                borderRadius: 8,
                border: "1px solid #EEF2F7",
                color: "#0B1F3A",
                fontSize: 14,
                ...POPPINS,
              }}
            />

            <label className="text-[12px] font-semibold mt-3 block" style={{ color: "#0B1F3A" }}>
              Duration
            </label>
            <select
              value={duration}
              onChange={(e) => setDuration(parseInt(e.target.value, 10))}
              className="w-full mt-1 px-3 bg-white"
              style={{
                height: 44,
                borderRadius: 8,
                border: "1px solid #EEF2F7",
                color: "#0B1F3A",
                fontSize: 14,
                ...POPPINS,
              }}
            >
              {DURATIONS.map((d) => (
                <option key={d.mins} value={d.mins}>
                  {d.label}
                </option>
              ))}
            </select>
          </Card>

          <SectionHeader>NOTIFY PUPIL</SectionHeader>
          <Card>
            <div className="flex items-center justify-between">
              <span className="text-[14px] font-medium" style={{ color: "#0B1F3A" }}>
                Send SMS notification to pupil
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={notify}
                onClick={() => setNotify((v) => !v)}
                className="relative"
                style={{
                  width: 44,
                  height: 26,
                  borderRadius: 999,
                  backgroundColor: notify ? "#1877D6" : "#EEF2F7",
                  transition: "background-color 0.15s",
                }}
              >
                <span
                  className="absolute top-[3px] bg-white"
                  style={{
                    left: notify ? 21 : 3,
                    width: 20,
                    height: 20,
                    borderRadius: "50%",
                    transition: "left 0.15s",
                    boxShadow: "0 1px 2px rgba(0,0,0,0.2)",
                  }}
                />
              </button>
            </div>

            {notify && (
              <div className="mt-3">
                <label className="text-[12px] font-semibold" style={{ color: "#0B1F3A" }}>
                  SMS preview
                </label>
                <textarea
                  value={sms}
                  onChange={(e) => {
                    setSmsEdited(true);
                    setSms(e.target.value);
                  }}
                  rows={4}
                  className="w-full mt-1 px-3 py-2 bg-white"
                  style={{
                    borderRadius: 8,
                    border: "1px solid #EEF2F7",
                    color: "#0B1F3A",
                    fontSize: 14,
                    resize: "none",
                    ...POPPINS,
                  }}
                />
                {!lesson.pupils?.phone && (
                  <div className="text-[12px] mt-1" style={{ color: "#1877D6" }}>
                    No phone number on file for this pupil — SMS will not be sent.
                  </div>
                )}
              </div>
            )}
          </Card>

          <button
            type="button"
            disabled={!canSubmit}
            onClick={submit}
            className="w-full mt-6 text-white font-semibold"
            style={{
              height: 52,
              borderRadius: 10,
              backgroundColor: canSubmit ? "#1877D6" : "#9CA3AF",
              fontSize: 15,
              ...POPPINS,
            }}
          >
            {submitting ? "Rescheduling…" : "Confirm reschedule"}
          </button>
        </div>
      )}
    </PageLayout>
  );
}
