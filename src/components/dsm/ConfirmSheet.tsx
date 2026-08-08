import { useCallback, useRef, useState } from "react";
import { BottomSheet } from "./BottomSheetV2";

export interface ConfirmSheetProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

const POPPINS = "Poppins, sans-serif";

export function ConfirmSheet({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  destructive = true,
  onConfirm,
  onCancel,
}: ConfirmSheetProps) {
  if (!open) return null;
  return (
    <BottomSheet title={title} onClose={onCancel}>
      <div
        style={{
          padding: "0 16px 16px",
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >
        <div
          style={{
            background: "#fff",
            borderRadius: 16,
            boxShadow: "0 1px 3px rgba(11,31,58,0.06)",
            padding: "15px 16px",
          }}
        >
          <p
            style={{
              fontSize: 15,
              color: "#6B7686",
              fontFamily: POPPINS,
              lineHeight: 1.5,
              margin: 0,
            }}
          >
            {message}
          </p>
        </div>

        <button
          onClick={onConfirm}
          style={{
            width: "100%",
            padding: 15,
            background: destructive ? "#CC2229" : "#1877D6",
            color: "#fff",
            border: "none",
            borderRadius: 16,
            fontSize: 16,
            fontWeight: 700,
            cursor: "pointer",
            fontFamily: POPPINS,
          }}
        >
          {confirmLabel}
        </button>

        <button
          onClick={onCancel}
          style={{
            width: "100%",
            padding: 15,
            background: "#EEF2F7",
            color: "#6B7686",
            border: "none",
            borderRadius: 16,
            fontSize: 16,
            fontWeight: 600,
            cursor: "pointer",
            fontFamily: POPPINS,
          }}
        >
          {cancelLabel}
        </button>
      </div>
    </BottomSheet>
  );
}

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
}

/**
 * Promise-based replacement for window.confirm().
 *
 *   const { confirm, confirmSheet } = useConfirmSheet();
 *   if (!(await confirm({ title: "Delete", message: "Sure?" }))) return;
 *   ...
 *   return (<>{content}{confirmSheet}</>);
 */
export function useConfirmSheet() {
  const [opts, setOpts] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<((v: boolean) => void) | null>(null);

  const confirm = useCallback((options: ConfirmOptions) => {
    setOpts(options);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const settle = useCallback((value: boolean) => {
    setOpts(null);
    resolver.current?.(value);
    resolver.current = null;
  }, []);

  const confirmSheet = (
    <ConfirmSheet
      open={!!opts}
      title={opts?.title ?? ""}
      message={opts?.message ?? ""}
      confirmLabel={opts?.confirmLabel}
      cancelLabel={opts?.cancelLabel}
      destructive={opts?.destructive ?? true}
      onConfirm={() => settle(true)}
      onCancel={() => settle(false)}
    />
  );

  return { confirm, confirmSheet };
}

export default ConfirmSheet;
