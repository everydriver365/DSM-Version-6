import { useEffect, useState } from "react";
import { X } from "lucide-react";

const POPPINS = { fontFamily: "Inter, sans-serif" } as const;

const DURATION_HOURS = [1, 1.5, 2, 2.5, 3, 4];

export function ChangeDateTimeSheet({
  open,
  submitting,
  currentDate,
  currentTime,
  currentDuration,
  onClose,
  onConfirm,
}: {
  open: boolean;
  submitting: boolean;
  currentDate: string; // "YYYY-MM-DD"
  currentTime: string; // "HH:MM"
  currentDuration: number; // minutes
  onClose: () => void;
  onConfirm: (newDate: string, newTime: string, newDurationMinutes: number) => void;
}) {
  const [newDate, setNewDate] = useState<string>(currentDate);
  const [newTime, setNewTime] = useState<string>(currentTime);
  const [newDuration, setNewDuration] = useState<number>(currentDuration);

  useEffect(() => {
    if (open) {
      setNewDate(currentDate);
      setNewTime(currentTime);
      setNewDuration(currentDuration);
    }
  }, [open, currentDate, currentTime, currentDuration]);

  if (!open) return null;

  const hasChanged =
    newDate !== currentDate ||
    newTime !== currentTime ||
    newDuration !== currentDuration;

  const canSubmit = !submitting && hasChanged && newDate.length > 0 && newTime.length > 0;

  const inputStyle = {
    height: 44,
    borderRadius: 8,
    border: "1px solid #EEF2F7",
    color: "#0B1F3A",
    fontSize: 14,
    ...POPPINS,
  } as const;

  const labelStyle = {
    fontSize: 11,
    fontWeight: 600,
    color: "#6B7280",
    textTransform: "uppercase" as const,
    letterSpacing: "0.05em",
    ...POPPINS,
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center"
      style={POPPINS}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="absolute inset-0"
        style={{ backgroundColor: "rgba(11,31,58,0.5)" }}
        onClick={submitting ? undefined : onClose}
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
            CHANGE DATE, TIME & DURATION
          </span>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            disabled={submitting}
            className="flex items-center justify-center disabled:opacity-50"
            style={{ width: 32, height: 32 }}
          >
            <X size={18} color="#6B7280" />
          </button>
        </div>

        <div className="px-4 mt-6 flex flex-col gap-4">
          <label className="flex flex-col gap-1">
            <span style={labelStyle}>Date</span>
            <input
              type="date"
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
              className="w-full px-3 bg-white"
              style={inputStyle}
            />
          </label>

          <label className="flex flex-col gap-1">
            <span style={labelStyle}>Time</span>
            <input
              type="time"
              value={newTime}
              onChange={(e) => setNewTime(e.target.value)}
              className="w-full px-3 bg-white"
              style={inputStyle}
            />
          </label>

          <div>
            <span style={labelStyle}>Duration</span>
            <div
              role="radiogroup"
              aria-label="Lesson duration"
              className="grid grid-cols-6 gap-2 mt-1"
            >
              {DURATION_HOURS.map((h) => {
                const minutes = h * 60;
                const selected = newDuration === minutes;
                return (
                  <button
                    key={h}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => setNewDuration(minutes)}
                    className="rounded-[12px] text-[14px] font-medium transition-colors"
                    style={{
                      padding: "14px 2px",
                      fontFamily: "Inter, sans-serif",
                      background: selected ? "#185FA5" : "#F3F8FF",
                      color: selected ? "#FFFFFF" : "#0B1F3A",
                      border: selected ? "none" : "1px solid #EEF2F7",
                    }}
                  >
                    {h}h
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="px-4 mt-6 flex flex-col gap-2">
          <button
            type="button"
            onClick={() => onConfirm(newDate, newTime, newDuration)}
            disabled={!canSubmit}
            className="inline-flex items-center justify-center text-[14px] font-semibold text-white disabled:opacity-50"
            style={{ height: 44, borderRadius: 8, backgroundColor: "#1877D6", ...POPPINS }}
          >
            {submitting ? "Saving…" : "Save"}
          </button>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="inline-flex items-center justify-center text-[13px] font-medium disabled:opacity-50"
            style={{
              height: 40,
              borderRadius: 8,
              backgroundColor: "transparent",
              color: "#0B1F3A",
              ...POPPINS,
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
