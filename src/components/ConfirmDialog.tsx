import { useEffect } from "react";
import { BottomSheet, PrimaryButton, GhostButton } from "@/components/dsm/BottomSheetV2";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  /**
   * Whether the confirm action is destructive. When true (default), the
   * primary confirm renders in red and the cancel in the neutral ghost style.
   * Auto-inferred from `confirmLabel` when omitted (Delete/Remove/Sign out/etc).
   */
  destructive?: boolean;
}

const DESTRUCTIVE_RE = /\b(delete|remove|discard|sign out|log out|cancel|clear|reset)\b/i;

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Delete",
  cancelLabel = "Cancel",
  onConfirm,
  onCancel,
  destructive,
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

  const isDestructive =
    destructive ?? DESTRUCTIVE_RE.test(confirmLabel);

  const footer = (
    <>
      <PrimaryButton
        onClick={onConfirm}
        color={isDestructive ? "#CC2229" : "#1877D6"}
      >
        {confirmLabel}
      </PrimaryButton>
      <GhostButton
        onClick={onCancel}
        color="#0B1F3A"
        bg="transparent"
      >
        {cancelLabel}
      </GhostButton>
    </>
  );

  return (
    <BottomSheet title={title} onClose={onCancel} footer={footer}>
      {message ? (
        <div
          className="px-1 pt-1 pb-4 text-[14px] leading-relaxed"
          style={{ color: "#4A5A73", fontFamily: "Poppins, sans-serif" }}
        >
          {message}
        </div>
      ) : (
        <div className="pb-2" />
      )}
    </BottomSheet>
  );
}
