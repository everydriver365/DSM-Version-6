import { useEffect } from "react";

const POPPINS = { fontFamily: "Inter, sans-serif" } as const;

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Delete",
  cancelLabel = "Cancel",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center px-6"
      style={{ backgroundColor: "rgba(11,31,58,0.4)", ...POPPINS }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
    >
      <div
        className="absolute inset-0"
        aria-hidden
        onClick={onCancel}
      />
      <div
        className="relative w-full bg-white"
        style={{
          maxWidth: 340,
          borderRadius: 16,
          padding: 20,
          boxShadow: "0 20px 40px rgba(11,31,58,0.18)",
        }}
      >
        <div
          id="confirm-dialog-title"
          className="text-[16px] font-semibold"
          style={{ color: "#0B1F3A" }}
        >
          {title}
        </div>
        {message && (
          <div className="text-[14px] mt-2" style={{ color: "#6B7280" }}>
            {message}
          </div>
        )}
        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 h-11 rounded-lg text-[14px] font-medium"
            style={{
              backgroundColor: "transparent",
              color: "#0B1F3A",
              borderWidth: "0.5px",
              borderStyle: "solid",
              borderColor: "#EEF2F7",
            }}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 h-11 rounded-lg text-[14px] font-semibold text-white"
            style={{ backgroundColor: "#CC2229", border: "none" }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
