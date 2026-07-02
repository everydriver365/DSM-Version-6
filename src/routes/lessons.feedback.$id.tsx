import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { Card } from "../components/dsm/Card";
import { SectionHeader } from "../components/dsm/SectionHeader";
import { supabase } from "../lib/supabaseClient";

export const Route = createFileRoute("/lessons/feedback/$id")({
  head: () => ({
    meta: [{ title: "Lesson feedback — DSM by EveryDriver" }],
  }),
  component: LessonFeedbackPage,
});

const POPPINS = { fontFamily: "Inter, sans-serif" } as const;

const TOPICS = [
  "Cockpit drill",
  "Moving off",
  "Steering",
  "Gears",
  "Braking",
  "Junctions",
  "Roundabouts",
  "Dual carriageway",
  "Parking",
  "Manoeuvres",
  "Independent driving",
  "Emergency stop",
  "Bay parking",
  "Parallel parking",
  "Reverse parking",
  "Motorway",
  "Night driving",
  "Theory discussion",
];

const RATING_LABELS = ["Needs work", "Below average", "Good", "Very good", "Excellent"];

interface LessonSummary {
  id: string;
  lesson_date: string;
  lesson_time: string;
  status: string;
  pupils: { name: string | null; first_name: string | null; last_name: string | null } | null;
}

function formatTime(t: string) {
  return (t ?? "").slice(0, 5);
}
function formatDateLong(d: Date) {
  return d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
}

function LessonFeedbackPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const [lesson, setLesson] = useState<LessonSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [topics, setTopics] = useState<string[]>([]);
  const [rating, setRating] = useState(3);
  const [instructorNotes, setInstructorNotes] = useState("");
  const [pupilFeedback, setPupilFeedback] = useState("");

  useEffect(() => {
    (async () => {
      const { data, error: err } = await supabase
        .from("lessons")
        .select("id, lesson_date, lesson_time, status, pupils(name, first_name, last_name)")
        .eq("id", id)
        .maybeSingle();
      if (err) {
        console.error("[lesson-feedback] fetch error", err);
        setError(err.message);
      } else {
        setLesson(data as unknown as LessonSummary);
      }
      setLoading(false);
    })();
  }, [id]);

  function toggleTopic(t: string) {
    setTopics((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));
  }

  async function handleSave() {
    if (saving) return;
    setSaving(true);
    setError(null);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setError("Not signed in");
      setSaving(false);
      return;
    }
    const { error: insErr } = await supabase.from("lesson_feedback").insert({
      lesson_id: id,
      instructor_id: user.id,
      topics_covered: topics,
      progress_rating: rating,
      instructor_notes: instructorNotes.trim() || null,
      pupil_feedback: pupilFeedback.trim() || null,
    });
    if (insErr) {
      console.error("[lesson-feedback] insert error", insErr);
      setError(insErr.message);
      setSaving(false);
      return;
    }
    if (lesson && lesson.status !== "completed") {
      const { error: updErr } = await supabase
        .from("lessons")
        .update({ status: "completed" })
        .eq("id", id);
      if (updErr) console.error("[lesson-feedback] status update error", updErr);
    }
    toast.success("Feedback saved");
    navigate({ to: "/lessons/$id", params: { id } });
  }

  const pupilName =
    lesson?.pupils?.name ??
    [lesson?.pupils?.first_name, lesson?.pupils?.last_name].filter(Boolean).join(" ") ??
    "Unknown pupil";
  const dateObj = lesson ? new Date(`${lesson.lesson_date}T00:00:00`) : null;

  return (
    <div className="min-h-screen bg-white pb-12" style={POPPINS}>
      {/* Top bar */}
      <div
        className="sticky top-0 z-40 flex items-center justify-between px-2"
        style={{ height: 52, backgroundColor: "#072b47" }}
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
          Lesson feedback
        </div>
        <button
          type="button"
          aria-label="Save"
          onClick={handleSave}
          disabled={saving || loading}
          className="flex items-center justify-center text-white text-[14px] font-semibold px-3"
          style={{ height: 40, opacity: saving || loading ? 0.5 : 1 }}
        >
          {saving ? "Saving…" : "Save"}
        </button>
      </div>

      {loading ? (
        <div className="px-4 pt-6 text-[14px] text-[#6B7280]">Loading…</div>
      ) : (
        <div className="px-4">
          {/* Header summary */}
          <div className="mt-3">
            <Card>
              <div className="text-[16px] font-semibold" style={{ color: "#0B1F3A", ...POPPINS }}>
                {pupilName}
              </div>
              <div className="text-[13px] text-[#6B7280] mt-1" style={POPPINS}>
                {dateObj ? formatDateLong(dateObj) : ""} · {lesson ? formatTime(lesson.lesson_time) : ""}
              </div>
            </Card>
          </div>

          {/* Topics */}
          <SectionHeader>WHAT WE COVERED</SectionHeader>
          <div className="flex flex-wrap gap-2">
            {TOPICS.map((t) => {
              const selected = topics.includes(t);
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => toggleTopic(t)}
                  className="text-[12px] font-medium"
                  style={{
                    height: 32,
                    padding: "0 12px",
                    borderRadius: 16,
                    backgroundColor: selected ? "#1877D6" : "#F8F9FB",
                    color: selected ? "#FFFFFF" : "#0B1F3A",
                    border: selected ? "0.5px solid #1877D6" : "0.5px solid #EEF2F7",
                    ...POPPINS,
                  }}
                >
                  {t}
                </button>
              );
            })}
          </div>

          {/* Progress rating */}
          <SectionHeader>PUPIL PROGRESS</SectionHeader>
          <Card>
            <div className="flex items-center justify-between gap-2">
              {[1, 2, 3, 4, 5].map((n) => {
                const active = rating === n;
                return (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setRating(n)}
                    className="flex-1 text-[14px] font-semibold"
                    style={{
                      height: 40,
                      borderRadius: 8,
                      backgroundColor: active ? "#1877D6" : "#FFFFFF",
                      color: active ? "#FFFFFF" : "#0B1F3A",
                      border: "0.5px solid #EEF2F7",
                      ...POPPINS,
                    }}
                  >
                    {n}
                  </button>
                );
              })}
            </div>
            <div className="flex justify-between mt-2 text-[11px]" style={{ color: "#6B7280", ...POPPINS }}>
              <span>Needs work</span>
              <span>Excellent</span>
            </div>
            <div className="text-center text-[13px] font-medium mt-2" style={{ color: "#0B1F3A", ...POPPINS }}>
              {RATING_LABELS[rating - 1]}
            </div>
          </Card>

          {/* Instructor notes */}
          <SectionHeader>INSTRUCTOR NOTES</SectionHeader>
          <textarea
            rows={5}
            value={instructorNotes}
            onChange={(e) => setInstructorNotes(e.target.value)}
            placeholder="Private notes (not shared with pupil)"
            className="w-full rounded-lg px-3 py-2 text-[14px] bg-white focus:border-[#1877D6] focus:outline-none"
            style={{
              color: "#0B1F3A",
              borderWidth: "0.5px",
              borderStyle: "solid",
              borderColor: "#EEF2F7",
              ...POPPINS,
            }}
          />

          {/* Pupil feedback */}
          <SectionHeader>FEEDBACK FOR PUPIL</SectionHeader>
          <textarea
            rows={4}
            value={pupilFeedback}
            onChange={(e) => setPupilFeedback(e.target.value)}
            placeholder="Shared with pupil"
            className="w-full rounded-lg px-3 py-2 text-[14px] bg-white focus:border-[#1877D6] focus:outline-none"
            style={{
              color: "#0B1F3A",
              borderWidth: "0.5px",
              borderStyle: "solid",
              borderColor: "#EEF2F7",
              ...POPPINS,
            }}
          />

          {error && (
            <p className="mt-3 text-[12px]" style={{ color: "#CC2229" }}>
              {error}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
