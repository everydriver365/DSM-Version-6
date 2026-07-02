import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { Input } from "../components/dsm/Input";
import { supabase } from "../lib/supabaseClient";

export const Route = createFileRoute("/lessons/edit/$id")({
  head: () => ({
    meta: [{ title: "Edit lesson — DSM by EveryDriver" }],
  }),
  component: EditLessonPage,
});

const POPPINS = { fontFamily: "Inter, sans-serif" } as const;

interface Pupil {
  id: string;
  name: string;
}

const DURATIONS: { label: string; value: number }[] = [
  { label: "1h", value: 60 },
  { label: "1.5h", value: 90 },
  { label: "2h", value: 120 },
  { label: "3h", value: 180 },
  { label: "4h", value: 240 },
  { label: "5h", value: 300 },
];

const STATUSES = [
  { label: "Confirmed", value: "confirmed" },
  { label: "Pending", value: "pending" },
  { label: "Completed", value: "completed" },
  { label: "Cancelled", value: "cancelled" },
];

const fieldBorder: React.CSSProperties = {
  fontFamily: "Inter, sans-serif",
  borderWidth: "0.5px",
  borderStyle: "solid",
  borderColor: "#EEF2F7",
};

function FieldLabel({ htmlFor, children }: { htmlFor: string; children: React.ReactNode }) {
  return (
    <label
      htmlFor={htmlFor}
      className="block mb-1 text-[12px] font-medium text-[#6B7280]"
      style={POPPINS}
    >
      {children}
    </label>
  );
}

function EditLessonPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const [pupils, setPupils] = useState<Pupil[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [pupilId, setPupilId] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [duration, setDuration] = useState(60);
  const [status, setStatus] = useState("confirmed");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const [pupilsRes, lessonRes] = await Promise.all([
        supabase
          .from("pupils")
          .select("id, name, first_name, last_name")
          .eq("instructor_id", user.id)
          .is("deleted_at", null)
          .order("name", { ascending: true, nullsFirst: false }),
        supabase
          .from("lessons")
          .select("pupil_id, lesson_date, lesson_time, duration_minutes, status, notes")
          .eq("id", id)
          .is("deleted_at", null)
          .maybeSingle(),
      ]);

      if (pupilsRes.error) console.error("[edit-lesson] pupils error", pupilsRes.error);
      const pupilRows =
        (pupilsRes.data as Array<{
          id: string;
          name: string | null;
          first_name: string | null;
          last_name: string | null;
        }> | null) ?? [];
      setPupils(
        pupilRows.map((p) => ({
          id: p.id,
          name:
            p.name ??
            [p.first_name, p.last_name].filter(Boolean).join(" ").trim() ??
            "Unnamed",
        })),
      );

      if (lessonRes.error) {
        console.error("[edit-lesson] fetch error", lessonRes.error);
        setError(lessonRes.error.message);
      } else if (lessonRes.data) {
        const l = lessonRes.data as {
          pupil_id: string;
          lesson_date: string;
          lesson_time: string;
          duration_minutes: number | null;
          status: string;
          notes: string | null;
        };
        setPupilId(l.pupil_id);
        setDate(l.lesson_date);
        setTime((l.lesson_time ?? "").slice(0, 5));
        setDuration(l.duration_minutes ?? 60);
        setStatus(l.status ?? "confirmed");
        setNotes(l.notes ?? "");
      }
      setLoading(false);
    })();
  }, [id]);

  async function handleSave() {
    if (saving) return;
    setSaving(true);
    setError(null);
    const { error: updErr } = await supabase
      .from("lessons")
      .update({
        pupil_id: pupilId,
        lesson_date: date,
        lesson_time: `${time}:00`,
        duration_minutes: duration,
        status,
        notes: notes.trim() || null,
      })
      .eq("id", id);
    if (updErr) {
      console.error("[edit-lesson] update error", updErr);
      setError(updErr.message);
      setSaving(false);
      return;
    }
    toast.success("Lesson updated");
    navigate({ to: "/lessons/$id", params: { id } });
  }

  return (
    <div className="min-h-screen bg-white pb-8" style={POPPINS}>
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
          Edit lesson
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
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSave();
          }}
          className="flex flex-col gap-4 px-4 pt-4"
        >
          <div>
            <FieldLabel htmlFor="pupil">Pupil</FieldLabel>
            <select
              id="pupil"
              value={pupilId}
              onChange={(e) => setPupilId(e.target.value)}
              className="h-11 w-full rounded-lg px-3 text-[14px] text-[#1A1A2E] bg-white focus:border-[#0B7DDA] focus:outline-none"
              style={fieldBorder}
            >
              <option value="">Select a pupil</option>
              {pupils.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <Input
            label="Date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />

          <Input
            label="Time"
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            step={60}
          />

          <div>
            <FieldLabel htmlFor="duration">Duration</FieldLabel>
            <select
              id="duration"
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              className="h-11 w-full rounded-lg px-3 text-[14px] text-[#1A1A2E] bg-white focus:border-[#0B7DDA] focus:outline-none"
              style={fieldBorder}
            >
              {DURATIONS.map((d) => (
                <option key={d.value} value={d.value}>
                  {d.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <FieldLabel htmlFor="status">Status</FieldLabel>
            <select
              id="status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="h-11 w-full rounded-lg px-3 text-[14px] text-[#1A1A2E] bg-white focus:border-[#0B7DDA] focus:outline-none"
              style={fieldBorder}
            >
              {STATUSES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <FieldLabel htmlFor="notes">Notes</FieldLabel>
            <textarea
              id="notes"
              rows={4}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-lg px-3 py-2 text-[14px] text-[#1A1A2E] bg-white focus:border-[#0B7DDA] focus:outline-none"
              style={fieldBorder}
            />
          </div>

          {error && (
            <p className="text-[12px]" style={{ color: "#CC2229" }}>
              {error}
            </p>
          )}
        </form>
      )}
    </div>
  );
}
