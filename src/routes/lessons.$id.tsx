import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Pencil, Navigation, ChevronRight } from "lucide-react";
import { Card } from "../components/dsm/Card";
import { SectionHeader } from "../components/dsm/SectionHeader";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { supabase } from "../lib/supabaseClient";

export const Route = createFileRoute("/lessons/$id")({
  head: () => ({
    meta: [{ title: "Lesson — DSM by EveryDriver" }],
  }),
  component: LessonDetailPage,
});

const POPPINS = { fontFamily: "Poppins, sans-serif" } as const;

interface Lesson {
  id: string;
  lesson_date: string;
  lesson_time: string;
  duration_minutes: number | null;
  status: string;
  notes: string | null;
  pupil_id: string;
  pupils: { id: string; name: string; phone: string | null } | null;
}

function formatTime(t: string) {
  return (t ?? "").slice(0, 5);
}
function formatDateLong(d: Date) {
  return d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
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
function statusColor(s: string) {
  if (s === "confirmed") return "#16A34A";
  if (s === "pending") return "#F59E0B";
  if (s === "cancelled") return "#CC2229";
  if (s === "completed") return "#1A52A0";
  return "#6B7280";
}

function LessonDetailPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [updating, setUpdating] = useState(false);
  const [pendingAction, setPendingAction] = useState<"cancelled" | "completed" | null>(null);

  useEffect(() => {
    supabase
      .from("lessons")
      .select(
        "id, lesson_date, lesson_time, duration_minutes, status, notes, pupil_id, pupils(id, name, phone)",
      )
      .eq("id", id)
      .is("deleted_at", null)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) console.error("[lesson] fetch error", error);
        setLesson((data as unknown as Lesson) ?? null);
      });
  }, [id]);

  async function updateStatus(status: string) {
    if (!lesson || updating) return;
    setUpdating(true);
    const { error } = await supabase.from("lessons").update({ status }).eq("id", lesson.id);
    setUpdating(false);
    if (error) {
      console.error("[lesson] update status error", error);
      return;
    }
    setLesson({ ...lesson, status });
  }

  const confirmStatus = async () => {
    const status = pendingAction;
    setPendingAction(null);
    if (status) await updateStatus(status);
  };

  const dateObj = lesson ? new Date(`${lesson.lesson_date}T00:00:00`) : null;
  const badge = lesson ? statusColor(lesson.status) : "#6B7280";
  const pupilName = lesson?.pupils?.name ?? "Unknown pupil";
  const phone = lesson?.pupils?.phone ?? "";

  return (
    <div className="min-h-screen bg-white pb-8" style={POPPINS}>
      {/* Top bar */}
      <div
        className="sticky top-0 z-40 flex items-center justify-between px-2"
        style={{ height: 52, backgroundColor: "#0F2044" }}
      >
        <button
          type="button"
          aria-label="Back"
          onClick={() => navigate({ to: "/schedule" })}
          className="flex items-center justify-center"
          style={{ width: 40, height: 40 }}
        >
          <ArrowLeft size={22} color="#FFFFFF" />
        </button>
        <div
          className="flex-1 text-center text-[15px] font-semibold text-white"
          style={POPPINS}
        >
          Lesson
        </div>
        <button
          type="button"
          aria-label="Edit lesson"
          className="flex items-center justify-center"
          style={{ width: 40, height: 40 }}
        >
          <Pencil size={18} color="#FFFFFF" />
        </button>
      </div>

      {lesson && dateObj && (
        <>
          {/* Header card */}
          <div className="mx-4 mt-3">
            <Card>
              <div
                className="text-[32px] font-bold leading-tight"
                style={{ color: "#0F2044", ...POPPINS }}
              >
                {formatTime(lesson.lesson_time)}
              </div>
              <div className="text-[13px] text-[#6B7280] mt-0.5" style={POPPINS}>
                {formatDateLong(dateObj)}
              </div>
              <div
                className="text-[16px] font-semibold mt-3 truncate"
                style={{ color: "#0F2044", ...POPPINS }}
              >
                {pupilName}
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[13px] text-[#6B7280]" style={POPPINS}>
                  {formatDuration(lesson.duration_minutes)}
                </span>
                <span
                  className="text-[11px] text-white px-2 py-0.5 rounded-full capitalize"
                  style={{ backgroundColor: badge, ...POPPINS }}
                >
                  {lesson.status}
                </span>
              </div>
            </Card>
          </div>

          {/* Quick actions */}
          <div className="px-4 mt-3 grid grid-cols-3 gap-2">
            <a
              href={phone ? `tel:${phone}` : undefined}
              aria-label="Call"
              className="inline-flex items-center justify-center text-[13px] font-medium text-white"
              style={{ height: 40, borderRadius: 8, backgroundColor: "#CC2229", ...POPPINS }}
            >
              Call
            </a>
            <a
              href={phone ? `sms:${phone}` : undefined}
              aria-label="Text"
              className="inline-flex items-center justify-center text-[13px] font-medium"
              style={{
                height: 40,
                borderRadius: 8,
                backgroundColor: "#F3F4F6",
                color: "#0F2044",
                ...POPPINS,
              }}
            >
              Text
            </a>
            <button
              type="button"
              aria-label="Navigate"
              className="inline-flex items-center justify-center gap-1 text-[13px] font-medium text-white"
              style={{
                height: 40,
                borderRadius: 8,
                backgroundColor: "#16A34A",
                border: "none",
                ...POPPINS,
              }}
            >
              <Navigation size={14} color="#FFFFFF" />
              Navigate
            </button>
          </div>

          <div className="px-4">
            <SectionHeader>LESSON DETAILS</SectionHeader>
            <Card className="!p-0">
              <DetailRow label="Date" value={formatDateLong(dateObj)} isFirst />
              <DetailRow label="Time" value={formatTime(lesson.lesson_time)} />
              <DetailRow label="Duration" value={formatDuration(lesson.duration_minutes)} />
              <DetailRow
                label="Status"
                value={lesson.status.charAt(0).toUpperCase() + lesson.status.slice(1)}
                valueColor={badge}
              />
              <DetailRow label="Pupil" value={pupilName} />
              <DetailRow label="Notes" value={lesson.notes || "—"} multiline />
            </Card>

            <SectionHeader>ACTIONS</SectionHeader>
            <Card className="!p-0">
              <ActionRow
                label="Mark complete"
                disabled={updating || lesson.status === "completed"}
                onClick={() => setPendingAction("completed")}
                color="#16A34A"
                isFirst
              />
              <ActionRow
                label="Cancel lesson"
                disabled={updating || lesson.status === "cancelled"}
                onClick={() => setPendingAction("cancelled")}
                color="#CC2229"
              />
              <ActionRow label="Reschedule" onClick={() => {}} color="#0F2044" />
            </Card>
          </div>
        </>
      )}

      <ConfirmDialog
        open={pendingAction !== null}
        title={pendingAction === "completed" ? "Mark this lesson as complete?" : "Cancel this lesson?"}
        confirmLabel="Confirm"
        onConfirm={confirmStatus}
        onCancel={() => setPendingAction(null)}
      />
    </div>
  );
}

function DetailRow({
  label,
  value,
  valueColor = "#0F2044",
  multiline,
  isFirst,
}: {
  label: string;
  value: string;
  valueColor?: string;
  multiline?: boolean;
  isFirst?: boolean;
}) {
  return (
    <div
      className="flex gap-3 px-4 py-3"
      style={{
        ...(isFirst
          ? undefined
          : {
              borderTopWidth: "0.5px",
              borderTopStyle: "solid",
              borderTopColor: "#E2E6ED",
            }),
        alignItems: multiline ? "flex-start" : "center",
        justifyContent: "space-between",
      }}
    >
      <span className="text-[13px] text-[#6B7280] shrink-0" style={POPPINS}>
        {label}
      </span>
      <span
        className={`text-[13px] text-right ${multiline ? "" : "truncate"}`}
        style={{
          color: valueColor,
          ...POPPINS,
          whiteSpace: multiline ? "pre-wrap" : undefined,
        }}
      >
        {value}
      </span>
    </div>
  );
}

function ActionRow({
  label,
  onClick,
  color,
  disabled,
  isFirst,
}: {
  label: string;
  onClick: () => void;
  color: string;
  disabled?: boolean;
  isFirst?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="w-full flex items-center justify-between px-4 py-3 text-left disabled:opacity-50"
      style={
        isFirst
          ? undefined
          : {
              borderTopWidth: "0.5px",
              borderTopStyle: "solid",
              borderTopColor: "#E2E6ED",
            }
      }
    >
      <span className="text-[14px] font-medium" style={{ color, ...POPPINS }}>
        {label}
      </span>
      <ChevronRight size={18} color="#6B7280" />
    </button>
  );
}
