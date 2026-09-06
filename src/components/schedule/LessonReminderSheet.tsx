import React, { useEffect, useState } from "react";
import { IconBell, IconTrash, IconX } from "@tabler/icons-react";
import { toast } from "@/lib/toast";
import { supabase } from "@/lib/supabaseClient";

const navy = "#0B1F3A";
const blue = "#1877D6";
const red = "#CC2229";
const hairline = "#E4E8EF";
const subtle = "#6B7686";
const font = "Poppins, sans-serif";

const OPTIONS = [
  { label: "15 minutes before", value: 15 },
  { label: "30 minutes before", value: 30 },
  { label: "1 hour before", value: 60 },
  { label: "2 hours before", value: 120 },
  { label: "The day before", value: 1440 },
];

export type ReminderLessonRef = {
  id: string;
  lesson_date: string;
  lesson_time: string;
  pupils?: { name?: string | null } | null;
};

export function LessonReminderSheet({
  open,
  lesson,
  instructorId,
  onClose,
  onSaved,
}: {
  open: boolean;
  lesson: ReminderLessonRef | null;
  instructorId: string | null;
  onClose: () => void;
  onSaved?: () => void;
}) {
  const [minutes, setMinutes] = useState(60);
  const [existing, setExisting] = useState<{ id: string; minutes_before: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || !lesson) return;
    let cancelled = false;
    setLoading(true);
    supabase
      .from("lesson_reminders")
      .select("id, minutes_before")
      .eq("lesson_id", lesson.id)
      .eq("enabled", true)
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) console.warn("[reminder] load failed", error.message);
        setExisting(data ?? null);
        setMinutes(data?.minutes_before ?? 60);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, lesson?.id]);

  if (!open || !lesson) return null;

  const save = async () => {
    if (!instructorId) return;
    setSaving(true);
    const { error } = await supabase
      .from("lesson_reminders")
      .upsert(
        {
          lesson_id: lesson.id,
          instructor_id: instructorId,
          minutes_before: minutes,
          enabled: true,
          sent_at: null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "lesson_id" },
      );
    setSaving(false);
    if (error) {
      toast.error("Could not save the reminder");
      console.error("[reminder] save failed", error);
      return;
    }
    toast.success("Reminder set");
    onSaved?.();
    onClose();
  };

  const remove = async () => {
    if (!existing) return;
    setSaving(true);
    const { error } = await supabase.from("lesson_reminders").delete().eq("lesson_id", lesson.id);
    setSaving(false);
    if (error) {
      toast.error("Could not remove the reminder");
      return;
    }
    toast.success("Reminder removed");
    onSaved?.();
    onClose();
  };

  const pupil = lesson.pupils?.name ?? "this lesson";

  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 100000, background: "rgba(11,31,58,0.45)", display: "flex", alignItems: "flex-end" }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          background: "#fff",
          borderTopLeftRadius: 8,
          borderTopRightRadius: 8,
          padding: "18px 16px calc(20px + env(safe-area-inset-bottom))",
          fontFamily: font,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
          <IconBell size={20} color={blue} stroke={1.7} />
          <span style={{ fontSize: 17, fontWeight: 600, color: navy }}>Lesson reminder</span>
          <button
            type="button"
            onClick={onClose}
            style={{ marginLeft: "auto", border: 0, background: "transparent", cursor: "pointer" }}
            aria-label="Close"
          >
            <IconX size={20} color={subtle} />
          </button>
        </div>
        <p style={{ fontSize: 13, color: subtle, margin: "0 0 14px" }}>
          Get a notification before {pupil} on {lesson.lesson_date} at {String(lesson.lesson_time).slice(0, 5)}.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 8, opacity: loading ? 0.5 : 1 }}>
          {OPTIONS.map((o) => {
            const active = minutes === o.value;
            return (
              <button
                key={o.value}
                type="button"
                onClick={() => setMinutes(o.value)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  padding: "13px 14px",
                  borderRadius: 8,
                  border: `1px solid ${active ? blue : hairline}`,
                  background: active ? "#EAF2FC" : "#fff",
                  color: navy,
                  fontFamily: font,
                  fontSize: 15,
                  fontWeight: active ? 600 : 500,
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                {o.label}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          disabled={saving || loading}
          onClick={save}
          style={{
            width: "100%",
            marginTop: 16,
            padding: "14px 0",
            borderRadius: 8,
            border: 0,
            background: blue,
            color: "#fff",
            fontFamily: font,
            fontSize: 15,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          {existing ? "Update reminder" : "Set reminder"}
        </button>

        {existing && (
          <button
            type="button"
            disabled={saving}
            onClick={remove}
            style={{
              width: "100%",
              marginTop: 10,
              padding: "12px 0",
              borderRadius: 8,
              border: `1px solid ${hairline}`,
              background: "#fff",
              color: red,
              fontFamily: font,
              fontSize: 15,
              fontWeight: 600,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
            }}
          >
            <IconTrash size={18} stroke={1.6} /> Cancel reminder
          </button>
        )}
      </div>
    </div>
  );
}
