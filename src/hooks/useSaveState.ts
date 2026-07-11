import { useCallback, useRef, useState, useEffect } from "react";

export type SaveState = "idle" | "saving" | "success" | "error";

export function useSaveState(revertMs = 2000) {
  const [state, setState] = useState<SaveState>("idle");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const runSave = useCallback(
    async (saveFn: () => Promise<unknown> | unknown) => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      setState("saving");
      try {
        await saveFn();
        setState("success");
        timerRef.current = setTimeout(() => setState("idle"), revertMs);
        return true;
      } catch (err) {
        console.error("[useSaveState] save failed", err);
        setState("error");
        timerRef.current = setTimeout(() => setState("idle"), revertMs);
        return false;
      }
    },
    [revertMs],
  );

  return { state, runSave };
}
