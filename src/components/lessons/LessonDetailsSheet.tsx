import React from "react";
import { X, Clock, MapPin, Phone, MessageSquare, Calendar, PoundSterling, Navigation, User } from "lucide-react";
import { toast } from "sonner";

interface LessonDetailsSheetProps {
  open: boolean;
  onClose: () => void;
  lesson: {
    id: string;
    lesson_date: string;
    lesson_time: string;
    duration_minutes: number | null;
    status: string;
    pupil_id: string;
    payment_status?: string | null;
    amount_due?: number | null;
    pickup_location?: string | null;
    lesson_type?: string | null;
    notes?: string | null;
    pupils?: {
      name: string | null;
      phone?: string | null;
      postcode?: string | null;
      address?: string | null;
      profile_image_url?: string | null;
    } | null;
  } | null;
  onViewPupil?: () => void;
  onOpenLive?: () => void;
  onTakePayment?: () => void;
  onCancelLesson?: () => void;
}

const navy = "#0B1F3A";
const blue = "#1877D6";
const red = "#CC2229";

export function LessonDetailsSheet({
  open,
  onClose,
  lesson,
  onViewPupil,
  onOpenLive,
  onTakePayment,
  onCancelLesson,
}: LessonDetailsSheetProps) {
  if (!open || !lesson) return null;

  const pupil = lesson.pupils;
  const pupilName = pupil?.name ?? "Pupil";
  const initials = pupilName
    .split(/\s+/)
    .filter(Boolean)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase() || "P";

  const phone = pupil?.phone ?? null;
  const pickup = lesson.pickup_location || [pupil?.address, pupil?.postcode].filter(Boolean).join(", ") || "No pickup set";

  const d = new Date(`${lesson.lesson_date}T${lesson.lesson_time}`);
  const fmtTime = (x: Date) =>
    `${String(x.getHours()).padStart(2, "0")}:${String(x.getMinutes()).padStart(2, "0")}`;
  const startText = fmtTime(d);
  const endD = lesson.duration_minutes ? new Date(d.getTime() + lesson.duration_minutes * 60000) : null;
  const endText = endD ? fmtTime(endD) : null;
  const dateText = d.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "short",
  });

  const hStatus = (lesson.payment_status ?? "unpaid").toLowerCase();
  const hAmountDue = Number(lesson.amount_due ?? 0);
  const isPrepaid = hStatus === "prepaid";
  const isPaid = hStatus === "paid" || (hAmountDue === 0 && !isPrepaid);
  const paymentLabel = isPrepaid ? "Prepaid" : isPaid ? "Paid" : "Due";
  const paymentBg = isPrepaid || isPaid ? "#E5F4EA" : "#FCE9E9";
  const paymentFg = isPrepaid || isPaid ? "#1D8A4E" : "#CC2229";
  const priceText = hAmountDue > 0 ? `£${hAmountDue.toFixed(2)}` : null;

  const handleCall = () => {
    if (!phone) { toast("No phone number"); return; }
    window.location.href = `tel:${phone}`;
  };
  const handleSms = () => {
    if (!phone) { toast("No phone number"); return; }
    window.location.href = `sms:${phone}`;
  };
  const handleMaps = () => {
    if (pickup && pickup !== "No pickup set") {
      window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(pickup)}&travelmode=driving`, "_blank");
    } else {
      toast("No pickup location");
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      style={{ fontFamily: "Inter, sans-serif" }}
    >
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div
        className="relative w-full max-w-md rounded-t-[24px] overflow-hidden flex flex-col"
        style={{
          backgroundColor: "#F5F7FA",
          boxShadow: "0 -4px 24px rgba(0,0,0,0.15)",
          maxHeight: "88vh",
        }}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="rounded-full" style={{ width: 40, height: 5, backgroundColor: "#C7CDD6" }} />
        </div>

        {/* Header */}
        <div className="px-5 pt-2 pb-4 shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold tracking-wide" style={{ color: "#8A93A3" }}>
                LESSON DETAILS
              </div>
              <h2 className="text-xl font-semibold mt-0.5" style={{ color: navy }}>
                {pupilName}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 -mr-2 rounded-full active:bg-black/5"
              aria-label="Close"
              type="button"
            >
              <X size={20} color="#8A93A3" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto px-4 pb-2 flex-1">
          {/* Pupil row */}
          <div
            className="flex items-center gap-4 p-4 mb-4 rounded-2xl bg-white"
            style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}
          >
            <div
              className="flex items-center justify-center rounded-full text-white font-semibold shrink-0"
              style={{ width: 48, height: 48, backgroundColor: blue }}
            >
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-[15px]" style={{ color: navy }}>
                {pupilName}
              </div>
              <div className="text-xs" style={{ color: "#8A93A3" }}>
                {lesson.lesson_type ? `${lesson.lesson_type} • ` : ""}
                {lesson.duration_minutes ?? 60} min
              </div>
            </div>
            <button
              type="button"
              onClick={handleCall}
              className="p-2.5 rounded-xl active:bg-black/5"
              style={{ backgroundColor: "#E8F1FA", color: blue }}
              aria-label="Call pupil"
            >
              <Phone size={18} />
            </button>
          </div>

          {/* Stats */}
          <div
            className="grid grid-cols-3 mb-4 rounded-2xl bg-white overflow-hidden"
            style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}
          >
            <div className="flex flex-col items-center py-4 px-2">
              <Calendar size={18} color={blue} className="mb-1.5" />
              <div className="text-xs font-semibold text-center" style={{ color: navy }}>
                {d.getDate()}
              </div>
              <div className="text-[10px]" style={{ color: "#8A93A3" }}>
                {d.toLocaleDateString("en-GB", { month: "short" })}
              </div>
            </div>
            <div
              className="flex flex-col items-center py-4 px-2"
              style={{ borderLeft: "1px solid #EEF0F3", borderRight: "1px solid #EEF0F3" }}
            >
              <Clock size={18} color={blue} className="mb-1.5" />
              <div className="text-xs font-semibold text-center" style={{ color: navy }}>
                {startText}
              </div>
              <div className="text-[10px]" style={{ color: "#8A93A3" }}>
                {endText ? `to ${endText}` : "start"}
              </div>
            </div>
            <div className="flex flex-col items-center py-4 px-2">
              <PoundSterling size={18} color={paymentFg} className="mb-1.5" />
              <div className="text-xs font-semibold text-center" style={{ color: paymentFg }}>
                {priceText ?? "—"}
              </div>
              <div
                className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
                style={{ backgroundColor: paymentBg, color: paymentFg }}
              >
                {paymentLabel}
              </div>
            </div>
          </div>

          {/* Date & time */}
          <div
            className="flex items-start gap-3 p-4 mb-3 rounded-2xl bg-white"
            style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}
          >
            <div className="p-2 rounded-xl shrink-0" style={{ backgroundColor: "#E8F1FA" }}>
              <Calendar size={18} color={blue} />
            </div>
            <div className="flex-1">
              <div className="text-xs font-semibold mb-0.5" style={{ color: "#8A93A3" }}>
                DATE & TIME
              </div>
              <div className="text-sm font-medium" style={{ color: navy }}>
                {dateText}
              </div>
              <div className="text-sm font-medium" style={{ color: navy }}>
                {startText}{endText ? ` – ${endText}` : ""}
                {lesson.duration_minutes ? ` (${lesson.duration_minutes} min)` : ""}
              </div>
            </div>
          </div>

          {/* Pickup */}
          <div
            className="flex items-start gap-3 p-4 mb-3 rounded-2xl bg-white"
            style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}
          >
            <div className="p-2 rounded-xl shrink-0" style={{ backgroundColor: "#E8F1FA" }}>
              <MapPin size={18} color={blue} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold mb-0.5" style={{ color: "#8A93A3" }}>
                PICKUP
              </div>
              <div className="text-sm font-medium break-words" style={{ color: navy }}>
                {pickup}
              </div>
              <button
                type="button"
                onClick={handleMaps}
                className="mt-2 text-xs font-semibold flex items-center gap-1"
                style={{ color: blue }}
              >
                <Navigation size={14} />
                Open in Maps
              </button>
            </div>
          </div>

          {/* Payment */}
          <div
            className="flex items-start gap-3 p-4 mb-4 rounded-2xl bg-white"
            style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}
          >
            <div className="p-2 rounded-xl shrink-0" style={{ backgroundColor: "#E8F1FA" }}>
              <PoundSterling size={18} color={blue} />
            </div>
            <div className="flex-1">
              <div className="text-xs font-semibold mb-0.5" style={{ color: "#8A93A3" }}>
                PAYMENT
              </div>
              <div className="flex items-center gap-2 mb-1">
                <span
                  className="text-xs font-semibold px-2 py-0.5 rounded"
                  style={{ backgroundColor: paymentBg, color: paymentFg }}
                >
                  {paymentLabel}
                </span>
                {priceText && <span className="text-sm font-semibold" style={{ color: navy }}>{priceText}</span>}
              </div>
              {!isPaid && !isPrepaid && onTakePayment && (
                <button
                  type="button"
                  onClick={onTakePayment}
                  className="mt-1 text-xs font-semibold"
                  style={{ color: blue }}
                >
                  Take payment →
                </button>
              )}
            </div>
          </div>

          {/* Notes */}
          {lesson.notes && (
            <div
              className="p-4 mb-4 rounded-2xl bg-white"
              style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}
            >
              <div className="text-xs font-semibold mb-1" style={{ color: "#8A93A3" }}>
                NOTES
              </div>
              <div className="text-sm" style={{ color: navy }}>
                {lesson.notes}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className="px-4 pt-3 pb-6 shrink-0"
          style={{ borderTop: "1px solid #E3E7ED", backgroundColor: "#F5F7FA" }}
        >
          <div className="grid grid-cols-2 gap-3 mb-3">
            <button
              type="button"
              onClick={onViewPupil}
              className="py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2"
              style={{ backgroundColor: navy, color: "#FFFFFF" }}
            >
              <User size={16} />
              View pupil
            </button>
            <button
              type="button"
              onClick={handleSms}
              className="py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2"
              style={{ backgroundColor: "#FFFFFF", color: navy, border: "1px solid #E2E8F0" }}
            >
              <MessageSquare size={16} />
              Message
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {onOpenLive && (
              <button
                type="button"
                onClick={onOpenLive}
                className="py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2"
                style={{ backgroundColor: blue, color: "#FFFFFF" }}
              >
                Start lesson
              </button>
            )}
            {onCancelLesson && (
              <button
                type="button"
                onClick={onCancelLesson}
                className="py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2"
                style={{ backgroundColor: "#FDEEEE", color: red }}
              >
                Cancel
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
