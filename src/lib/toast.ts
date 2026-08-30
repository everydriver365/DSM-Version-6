import { toast as sonnerToast } from "sonner";

type ToastOptions = Parameters<typeof sonnerToast>[1];

/**
 * Unified DSM toast.
 *
 * - Plain calls (`toast(message, opts)`) render as the info variant so every
 *   notification uses the same iOS-style treatment, icon and close button.
 * - Use `toast.success`, `toast.error`, `toast.warning`, or `toast.info` for
 *   explicit semantic variants with consistent colours and icons.
 * - `duration` and all other Sonner options can be passed per-toast.
 */
export const toast = Object.assign(
  (message: string, opts?: ToastOptions) => sonnerToast.info(message, opts),
  sonnerToast
);
