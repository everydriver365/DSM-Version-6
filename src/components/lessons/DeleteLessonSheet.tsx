import { useEffect, useState } from "react";
import { X } from "lucide-react";

const POPPINS = { fontFamily: "Inter, sans-serif" } as const;

const DELETE_REASONS = [
  "Booked in error",
  "Duplicate entry",
  "Test/demo lesson",
  "Other",
] as const;

export function DeleteLessonSheet({
  open,
  submitting,
  onClose,
  onConfirm,
}: {
  open: boolean;
  submitting: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
}) {
  const [reason, setReason] = useState<string>("");
  const [otherText, setOtherText] = useState("");

  useEffect(() => {
    if (open) {
      setReason("");
      setOtherText("");
    }
  }, [open]);

  if (!open) return null;

  const resolvedReason =
    reason === "Other" ? otherText.trim() : reason;
  const canSubmit = !submitting && resolvedReason.length > 0;

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
            DELETE LESSON
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

        <div className="px-4 mt-2">
          <div
            className="rounded-[12px] p-3"
            style={{ backgroundColor: "#FEF2F2", border: "0.5px solid #FECACA" }}
          >
            <div className="text-[13px]" style={{ color: "#0F2044", ...POPPINS }}>
              This removes it from your schedule and reports. Use Cancel instead if the pupil cancelled — that keeps the record and any fee.
            </div>
          </div>
        </div>

        <div className="px-4 mt-4">
          <label className="text-[12px] font-semibold" style={{ color: "#0B1F3A" }}>
            Deletion reason *
          </label>
          <div className="flex flex-wrap gap-2 mt-2">
            {DELETE_REASONS.map((r) => {
              const selected = reason === r;
              return (
                <button
                  key={r}
                  type="button"
                  onClick={() => setReason(r)}
                  className="inline-flex items-center justify-center text-[13px]"
                  style={{
                    height: 36,
                    padding: "0 14px",
                    borderRadius: 999,
                    backgroundColor: selected ? "#0B1F3A" : "#F3F4F6",
                    color: selected ? "#FFFFFF" : "#0B1F3A",
                    border: selected ? "1px solid #0B1F3A" : "1px solid #EEF2F7",
                    fontWeight: selected ? 600 : 500,
                    ...POPPINS,
                  }}
                >
                  {r}
                </button>
              );
            })}
          </div>
        </div>

        {reason === "Other" && (
          <div className="px-4 mt-3">
            <input
              type="text"
              value={otherText}
              onChange={(e) => setOtherText(e.target.value)}
              placeholder="Describe the reason"
              className="w-full px-3 bg-white"
              style={{
                height: 44,
                borderRadius: 8,
                border: "1px solid #EEF2F7",
                color: "#0B1F3A",
                fontSize: 14,
                ...POPPINS,
              }}
            />
          </div>
        )}

        <div className="px-4 mt-4 flex flex-col gap-2">
          <button
            type="button"
            onClick={() => onConfirm(resolvedReason)}
            disabled={!canSubmit}
            className="inline-flex items-center justify-center text-[14px] font-semibold text-white disabled:opacity-50"
            style={{ height: 44, borderRadius: 8, backgroundColor: "#CC2229", ...POPPINS }}
          >
            {submitting ? "Deleting…" : "Delete"}
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
