import { tokens } from "@/lib/tokens";
import { useEffect, useState } from "react";
import { IconX } from "@tabler/icons-react";

const POPPINS = { fontFamily: "Poppins, sans-serif" } as const;

export function ChangeDateSheet({
  open,
  submitting,
  currentDate,
  onClose,
  onConfirm,
}: {
  open: boolean;
  submitting: boolean;
  currentDate: string; // "YYYY-MM-DD" format
  onClose: () => void;
  onConfirm: (newDate: string) => void;
}) {
  const [newDate, setNewDate] = useState<string>(currentDate);

  useEffect(() => {
    if (open) {
      setNewDate(currentDate);
    }
  }, [open, currentDate]);

  if (!open) return null;

  const canSubmit = !submitting && newDate !== currentDate && newDate.length > 0;

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
            CHANGE DATE
          </span>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            disabled={submitting}
            className="flex items-center justify-center disabled:opacity-50"
            style={{ width: 32, height: 32 }}
          >
            <IconX stroke={1.5} size={18} color="#6B7280" />
          </button>
        </div>

        <div className="px-4 mt-6">
          <input
            type="date"
            value={newDate}
            onChange={(e) => setNewDate(e.target.value)}
            className="w-full px-3 bg-white"
            style={{
              height: 44,
              borderRadius: 12,
              border: "1px solid #EEF2F7",
              color: tokens.navy,
              fontSize: tokens.fontSize.md,
              ...POPPINS,
            }}
          />
        </div>

        <div className="px-4 mt-4 flex flex-col gap-2">
          <button
            type="button"
            onClick={() => onConfirm(newDate)}
            disabled={!canSubmit}
            className="inline-flex items-center justify-center text-[14px] font-semibold text-white disabled:opacity-50"
            style={{ height: 44, borderRadius: 12, backgroundColor: tokens.blue, ...POPPINS }}
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
              borderRadius: 12,
              backgroundColor: "transparent",
              color: tokens.navy,
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
