import { useEffect, useState } from "react";

/**
 * Returns a timestamp that refreshes on an interval so time-derived UI
 * (countdowns, "in 35 days" labels) updates itself without a reload.
 * Also re-syncs when the app returns to the foreground.
 */
export function useNowTick(intervalMs = 60000) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const tick = () => setNow(Date.now());
    const id = window.setInterval(tick, intervalMs);
    const onVisible = () => {
      if (document.visibilityState === "visible") tick();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", tick);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", tick);
    };
  }, [intervalMs]);

  return now;
}

export default useNowTick;
