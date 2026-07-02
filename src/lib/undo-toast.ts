import { toast } from "sonner";
import { haptic } from "./haptics";

// Show a toast with an Undo action window.
// If the user taps Undo before the window closes, onUndo runs and onCommit is skipped.
// Otherwise onCommit runs when the window elapses.
export function undoableToast(opts: {
  message: string;
  onUndo: () => void | Promise<void>;
  onCommit?: () => void | Promise<void>;
  durationMs?: number;
}) {
  const duration = opts.durationMs ?? 5000;
  let undone = false;
  haptic("selection");
  const id = toast(opts.message, {
    duration,
    action: {
      label: "Undo",
      onClick: async () => {
        undone = true;
        haptic("tap");
        await opts.onUndo();
        toast.dismiss(id);
      },
    },
  });
  setTimeout(async () => {
    if (!undone && opts.onCommit) await opts.onCommit();
  }, duration);
}