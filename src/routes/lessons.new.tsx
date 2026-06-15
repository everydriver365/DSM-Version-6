import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { Input } from "../components/dsm/Input";
import { Button } from "../components/dsm/Button";
import { supabase } from "../lib/supabaseClient";

export const Route = createFileRoute("/lessons/new")({
  head: () => ({
    meta: [{ title: "Add lesson — DSM by EveryDriver" }],
  }),
  component: NewLessonPage,
});

interface Pupil {
  id: string;
  name: string;
}

const DURATIONS = [30, 45, 60, 90, 120];

const fieldBorder: React.CSSProperties = {
  fontFamily: "Poppins, sans-serif",
  borderWidth: "0.5px",
  borderStyle: "solid",
  borderColor: "#E2E6ED",
};

function FieldLabel({ htmlFor, children }: { htmlFor: string; children: React.ReactNode }) {
  return (
    <label
      htmlFor={htmlFor}
      className="block mb-1 text-[12px] font-medium text-[#6B7280]"
      style={{ fontFamily: "Poppins, sans-serif" }}
    >
      {children}
    </label>
  );
}

function NewLessonPage() {
  const navigate = useNavigate();
  const [pupils, setPupils] = useState<Pupil[]>([]);
  const [pupilId, setPupilId] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [duration, setDuration] = useState(60);
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState<{
    pupil?: string;
    date?: string;
    time?: string;
    form?: string;
  }>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("pupils")
        .select("id, name")
        .eq("instructor_id", user.id)
        .order("name", { ascending: true });
      setPupils((data as Pupil[]) ?? []);
    })();
  }, []);

  async function handleSave() {
    const next: typeof errors = {};
    if (!pupilId) next.pupil = "Pupil is required";
    if (!date) next.date = "Date is required";
    if (!time) next.time = "Time is required";
    if (Object.keys(next).length) {
      setErrors(next);
      return;
    }
    setErrors({});
    setSaving(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setErrors({ form: "You must be signed in to add a lesson" });
      setSaving(false);
      return;
    }
    const { error } = await supabase.from("lessons").insert({
      instructor_id: user.id,
      pupil_id: pupilId,
      lesson_date: date,
      lesson_time: `${time}:00`,
      duration_minutes: duration,
      status: "confirmed",
      notes: notes.trim() || null,
    });
    if (error) {
      setErrors({ form: error.message });
      setSaving(false);
      return;
    }
    navigate({ to: "/schedule" });
  }

  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: "Poppins, sans-serif" }}>
      <div className="px-4 pt-6">
        <div className="flex items-center gap-3 mb-4">
          <button
            type="button"
            aria-label="Back to schedule"
            onClick={() => navigate({ to: "/schedule" })}
            className="flex items-center justify-center w-8 h-8 -ml-1"
          >
            <ArrowLeft size={20} color="#0F2044" />
          </button>
          <p
            className="text-[20px] font-semibold"
            style={{ color: "#0F2044", fontFamily: "Poppins, sans-serif" }}
          >
            Add lesson
          </p>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSave();
          }}
          className="flex flex-col gap-4 mt-2"
        >
          <div>
            <FieldLabel htmlFor="pupil">Pupil</FieldLabel>
            <select
              id="pupil"
              value={pupilId}
              onChange={(e) => setPupilId(e.target.value)}
              className="h-11 w-full rounded-lg px-3 text-[14px] text-[#1A1A2E] bg-white focus:border-[#1A52A0] focus:outline-none"
              style={fieldBorder}
            >
              <option value="">Select a pupil</option>
              {pupils.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            {errors.pupil && (
              <p className="mt-1 text-[12px]" style={{ color: "#CC2229" }}>
                {errors.pupil}
              </p>
            )}
          </div>

          <div>
            <Input
              label="Date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
            {errors.date && (
              <p className="mt-1 text-[12px]" style={{ color: "#CC2229" }}>
                {errors.date}
              </p>
            )}
          </div>

          <div>
            <Input
              label="Time"
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              step={60}
            />
            {errors.time && (
              <p className="mt-1 text-[12px]" style={{ color: "#CC2229" }}>
                {errors.time}
              </p>
            )}
          </div>

          <div>
            <FieldLabel htmlFor="duration">Duration</FieldLabel>
            <select
              id="duration"
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              className="h-11 w-full rounded-lg px-3 text-[14px] text-[#1A1A2E] bg-white focus:border-[#1A52A0] focus:outline-none"
              style={fieldBorder}
            >
              {DURATIONS.map((m) => (
                <option key={m} value={m}>
                  {m} min
                </option>
              ))}
            </select>
          </div>

          <div>
            <FieldLabel htmlFor="notes">Notes</FieldLabel>
            <textarea
              id="notes"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-lg px-3 py-2 text-[14px] text-[#1A1A2E] bg-white focus:border-[#1A52A0] focus:outline-none"
              style={fieldBorder}
            />
          </div>

          {errors.form && (
            <p className="text-[12px]" style={{ color: "#CC2229" }}>
              {errors.form}
            </p>
          )}

          <div className="mt-2">
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : "Save lesson"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
