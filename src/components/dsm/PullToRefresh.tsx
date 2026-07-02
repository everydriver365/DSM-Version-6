import * as React from "react";
import { RefreshCw } from "lucide-react";
import { haptic } from "@/lib/haptics";

// Wrap any scrollable page section. Triggers onRefresh when user pulls down
// past the threshold from a scroll-top position. Mobile-friendly, no-op on
// non-touch devices.
const THRESHOLD = 72;
const MAX_PULL = 120;

export function PullToRefresh({
  onRefresh,
  children,
}: {
  onRefresh: () => void | Promise<void>;
  children: React.ReactNode;
}) {
  const [pull, setPull] = React.useState(0);
  const [refreshing, setRefreshing] = React.useState(false);
  const startY = React.useRef<number | null>(null);
  const armed = React.useRef(false);

  const onTouchStart = (e: React.TouchEvent) => {
    if (refreshing) return;
    // Only arm when scrolled to the very top of the window.
    if (window.scrollY > 0) {
      startY.current = null;
      armed.current = false;
      return;
    }
    startY.current = e.touches[0].clientY;
    armed.current = true;
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (!armed.current || startY.current == null || refreshing) return;
    const dy = e.touches[0].clientY - startY.current;
    if (dy <= 0) {
      setPull(0);
      return;
    }
    const eased = Math.min(MAX_PULL, dy * 0.5);
    setPull(eased);
    if (eased > THRESHOLD - 8 && eased < THRESHOLD + 2) haptic("selection");
  };

  const onTouchEnd = async () => {
    if (!armed.current) return;
    armed.current = false;
    startY.current = null;
    if (pull >= THRESHOLD && !refreshing) {
      setRefreshing(true);
      haptic("success");
      try {
        await onRefresh();
      } finally {
        setRefreshing(false);
        setPull(0);
      }
    } else {
      setPull(0);
    }
  };

  const progress = Math.min(1, pull / THRESHOLD);
  const showIndicator = pull > 4 || refreshing;

  return (
    <div onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
      <div
        aria-hidden={!showIndicator}
        className="pointer-events-none flex items-center justify-center overflow-hidden transition-[height] duration-150"
        style={{ height: refreshing ? 48 : pull }}
      >
        <div
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-[0_4px_12px_-4px_rgba(11,31,58,0.2)] border border-[#EEF2F7]"
          style={{
            transform: refreshing
              ? "rotate(0deg)"
              : `rotate(${progress * 360}deg)`,
            opacity: refreshing ? 1 : progress,
          }}
        >
          <RefreshCw
            className={`h-4 w-4 text-[#1877D6] ${refreshing ? "animate-spin" : ""}`}
          />
        </div>
      </div>
      {children}
    </div>
  );
}