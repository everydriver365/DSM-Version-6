import { toast as sonnerToast } from "sonner";

type VariantOptions = Parameters<typeof sonnerToast.success>[1];

/**
 * DSM toast variants — consistent icons, colours and left-border accents.
 * Use these instead of calling sonner directly so every success/error/info/warning
 * toast matches the iOS-style treatment in src/components/ui/sonner.tsx.
 */
export const dsmToast = {
  success: (message: string, opts?: VariantOptions) => sonnerToast.success(message, opts),
  error: (message: string, opts?: VariantOptions) => sonnerToast.error(message, opts),
  info: (message: string, opts?: VariantOptions) => sonnerToast.info(message, opts),
  warning: (message: string, opts?: VariantOptions) => sonnerToast.warning(message, opts),
  raw: sonnerToast,
};
