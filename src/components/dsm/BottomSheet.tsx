import type { ReactNode } from "react";
import { BottomSheet as BottomSheetV2 } from "./BottomSheetV2";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title?: string;
  description?: string;
  children: ReactNode;
  /** Retained for API compatibility — the V2 shell manages its own max height. */
  maxHeightVh?: number;
  footer?: ReactNode;
}

/**
 * Compatibility wrapper around the new DSM BottomSheetV2 shell.
 * Preserves the legacy `open` / `onOpenChange` / `title` / `description` API
 * so existing callers continue to work while adopting the new chrome
 * (Poppins, canvas background, close pill, footer slot).
 */
export function BottomSheet({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
}: Props) {
  if (!open) return null;
  return (
    <BottomSheetV2
      title={title ?? ""}
      subtitle={description}
      onClose={() => onOpenChange(false)}
      footer={footer}
    >
      {children}
    </BottomSheetV2>
  );
}

export default BottomSheet;
