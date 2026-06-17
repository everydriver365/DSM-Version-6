import { createFileRoute, useNavigate, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Pencil, Navigation, ChevronRight, X } from "lucide-react";
import { toast } from "sonner";
import { Card } from "../components/dsm/Card";
import { SectionHeader } from "../components/dsm/SectionHeader";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { supabase } from "../lib/supabaseClient";

const CANCEL_REASONS = [
  "Pupil cancelled",
  "Pupil no-show",
  "Instructor cancelled",
  "Weather",
  "Vehicle issue",
  "Other",
] as const;

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
  const [pendingComplete, setPendingComplete] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);

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

  const confirmComplete = async () => {
    setPendingComplete(false);
    await updateStatus("completed");
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
          onClick={() => router.history.back()}
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
          onClick={() => navigate({ to: "/lessons/edit/$id", params: { id } })}
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
                onClick={() => setPendingComplete(true)}
                color="#16A34A"
                isFirst
              />
              <ActionRow
                label="Cancel lesson"
                disabled={updating || lesson.status === "cancelled"}
                onClick={() => setCancelOpen(true)}
                color="#CC2229"
              />
              <ActionRow
                label="Feedback"
                onClick={() => navigate({ to: "/lessons/feedback/$id", params: { id } })}
                color="#1A52A0"
              />
              <ActionRow
                label="Reschedule"
                onClick={() => navigate({ to: "/lessons/reschedule/$id", params: { id } })}
                color="#0F2044"
              />
            </Card>
          </div>
        </>
      )}

      <ConfirmDialog
        open={pendingComplete}
        title="Mark this lesson as complete?"
        confirmLabel="Confirm"
        onConfirm={confirmComplete}
        onCancel={() => setPendingComplete(false)}
      />

      {lesson && dateObj && (
        <CancelLessonSheet
          open={cancelOpen}
          onClose={() => setCancelOpen(false)}
          pupilName={pupilName}
          pupilId={lesson.pupil_id}
          lessonId={lesson.id}
          when={`${formatDateLong(dateObj)} · ${formatTime(lesson.lesson_time)}`}
          onCancelled={() => {
            toast.success("Lesson cancelled");
            navigate({ to: "/schedule" });
          }}
        />
      )}
    </div>
  );
}

function CancelLessonSheet({
  open,
  onClose,
  pupilName,
  pupilId,
  lessonId,
  when,
  onCancelled,
}: {
  open: boolean;
  onClose: () => void;
  pupilName: string;
  pupilId: string;
  lessonId: string;
  when: string;
  onCancelled: () => void;
}) {
  const [reason, setReason] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [charge, setCharge] = useState(false);
  const [fee, setFee] = useState("0.00");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setReason("");
      setNotes("");
      setCharge(false);
      setFee("0.00");
      setSubmitting(false);
    }
  }, [open]);

  async function submit() {
    if (!reason || submitting) return;
    setSubmitting(true);
    const { error } = await supabase
      .from("lessons")
      .update({
        status: "cancelled",
        cancellation_reason: reason,
        cancellation_notes: notes || null,
        cancelled_at: new Date().toISOString(),
      })
      .eq("id", lessonId);
    if (error) {
      console.error("[cancel] update lesson error", error);
      toast.error("Couldn't cancel lesson");
      setSubmitting(false);
      return;
    }

    const feeNum = charge ? parseFloat(fee) || 0 : 0;
    if (feeNum > 0) {
      const { data: pupil, error: readErr } = await supabase
        .from("pupils")
        .select("balance_owed")
        .eq("id", pupilId)
        .maybeSingle();
      if (readErr) console.error("[cancel] pupil read error", readErr);
      const current = Number((pupil as { balance_owed: number } | null)?.balance_owed ?? 0);
      const { error: updErr } = await supabase
        .from("pupils")
        .update({ balance_owed: current + feeNum })
        .eq("id", pupilId);
      if (updErr) console.error("[cancel] pupil balance update error", updErr);
    }

    setSubmitting(false);
    onCancelled();
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" style={POPPINS}>
      <div
        className="absolute inset-0"
        style={{ backgroundColor: "rgba(15,32,68,0.5)" }}
        onClick={onClose}
        aria-hidden
      />
      <div
        className="relative w-full bg-white"
        style={{
          borderTopLeftRadius: 16,
          borderTopRightRadius: 16,
          maxHeight: "92vh",
          overflowY: "auto",
          paddingBottom: 24,
        }}
      >
        <div className="flex items-center justify-between px-4 pt-4">
          <span className="text-[11px] font-semibold tracking-wider" style={{ color: "#6B7280" }}>
            CANCEL LESSON
          </span>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="flex items-center justify-center"
            style={{ width: 32, height: 32 }}
          >
            <X size={18} color="#6B7280" />
          </button>
        </div>

        <div className="px-4 mt-2">
          <div
            className="rounded-[12px] p-3"
            style={{ backgroundColor: "#F3F4F6" }}
          >
            <div className="text-[14px] font-semibold" style={{ color: "#0F2044" }}>
              {pupilName}
            </div>
            <div className="text-[12px]" style={{ color: "#6B7280" }}>{when}</div>
          </div>
        </div>

        <div className="px-4 mt-4">
          <label className="text-[12px] font-semibold" style={{ color: "#0F2044" }}>
            Cancellation reason *
          </label>
          <select
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full mt-1 px-3 bg-white"
            style={{
              height: 44,
              borderRadius: 8,
              border: "1px solid #E2E6ED",
              color: "#0F2044",
              fontSize: 14,
              ...POPPINS,
            }}
          >
            <option value="" disabled>Select a reason</option>
            {CANCEL_REASONS.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>

        <div className="px-4 mt-4">
          <div className="flex items-center justify-between">
            <span className="text-[14px] font-medium" style={{ color: "#0F2044" }}>
              Charge cancellation fee?
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={charge}
              onClick={() => setCharge((v) => !v)}
              className="relative"
              style={{
                width: 44,
                height: 26,
                borderRadius: 999,
                backgroundColor: charge ? "#16A34A" : "#E2E6ED",
                transition: "background-color 0.15s",
              }}
            >
              <span
                className="absolute top-[3px] bg-white"
                style={{
                  left: charge ? 21 : 3,
                  width: 20,
                  height: 20,
                  borderRadius: "50%",
                  transition: "left 0.15s",
                  boxShadow: "0 1px 2px rgba(0,0,0,0.2)",
                }}
              />
            </button>
          </div>
          {charge && (
            <div className="mt-2">
              <div className="flex items-center" style={{ borderRadius: 8, border: "1px solid #E2E6ED", height: 44, paddingLeft: 12 }}>
                <span style={{ color: "#6B7280", fontSize: 14 }}>£</span>
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min="0"
                  value={fee}
                  onChange={(e) => setFee(e.target.value)}
                  className="flex-1 px-2 bg-transparent outline-none"
                  style={{ color: "#0F2044", fontSize: 14, ...POPPINS, height: 42 }}
                />
              </div>
              <div className="text-[12px] mt-1" style={{ color: "#6B7280" }}>
                This will be added to the pupil's outstanding balance
              </div>
            </div>
          )}
        </div>

        <div className="px-4 mt-4">
          <label className="text-[12px] font-semibold" style={{ color: "#0F2044" }}>
            Additional notes
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="w-full mt-1 px-3 py-2 bg-white"
            style={{
              borderRadius: 8,
              border: "1px solid #E2E6ED",
              color: "#0F2044",
              fontSize: 14,
              resize: "none",
              ...POPPINS,
            }}
          />
        </div>

        <div className="px-4 mt-5 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center justify-center text-[14px] font-medium"
            style={{
              height: 44,
              borderRadius: 8,
              backgroundColor: "transparent",
              border: "1px solid #E2E6ED",
              color: "#0F2044",
              ...POPPINS,
            }}
          >
            Keep lesson
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={!reason || submitting}
            className="inline-flex items-center justify-center text-[14px] font-semibold text-white disabled:opacity-50"
            style={{
              height: 44,
              borderRadius: 8,
              backgroundColor: "#CC2229",
              ...POPPINS,
            }}
          >
            {submitting ? "Cancelling…" : "Cancel lesson"}
          </button>
        </div>
      </div>
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
