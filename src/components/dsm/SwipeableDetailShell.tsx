import { tokens } from "@/lib/tokens";
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { IconChevronRight } from "@tabler/icons-react";

const POPPINS = { fontFamily: "Poppins, sans-serif" } as const;

export type SwipeableDetailShellProps<T> = {
  /** The set the user was browsing (same list/category) */
  items: T[];
  /** Index of the item currently open */
  index: number;
  onIndexChange: (index: number) => void;
  getKey: (item: T, index: number) => string;
  /** Renders one panel. isActive = the panel currently snapped into view. */
  renderItem: (item: T, isActive: boolean, index: number) => ReactNode;
  /** "video" = story-style segments, dark peek. "article" = counter pill, light peek. */
  variant?: "video" | "article";
  /** Top-left back/close control — rendered as given, position preserved by the shell. */
  topLeft?: ReactNode;
  /** localStorage flag key for the first-time swipe hint */
  hintKey?: string;
  style?: CSSProperties;
  panelStyle?: CSSProperties;
  className?: string;
};

export function SwipeableDetailShell<T>({
  items,
  index,
  onIndexChange,
  getKey,
  renderItem,
  variant = "video",
  topLeft,
  hintKey = "dsm_swipe_detail_hint_seen",
  style,
  panelStyle,
  className,
}: SwipeableDetailShellProps<T>) {
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const programmaticRef = useRef(false);
  const [showHint, setShowHint] = useState(false);
  const dark = variant === "video";
  const total = items.length;
  const hasNext = index < total - 1;

  // Keep scroll position in sync when index changes from outside
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const target = index * el.clientWidth;
    if (Math.abs(el.scrollLeft - target) < 4) return;
    programmaticRef.current = true;
    el.scrollTo({ left: target, behavior: "auto" });
    const t = setTimeout(() => {
      programmaticRef.current = false;
    }, 120);
    return () => clearTimeout(t);
  }, [index, total]);

  // First-time swipe hint
  useEffect(() => {
    if (total < 2) return;
    let seen = false;
    try {
      seen = localStorage.getItem(hintKey) === "1";
    } catch {
      seen = true;
    }
    if (seen) return;
    setShowHint(true);
    const t = setTimeout(() => {
      setShowHint(false);
      try {
        localStorage.setItem(hintKey, "1");
      } catch {
        /* ignore */
      }
    }, 3000);
    return () => clearTimeout(t);
  }, [hintKey, total]);

  const dismissHint = () => {
    setShowHint(false);
    try {
      localStorage.setItem(hintKey, "1");
    } catch {
      /* ignore */
    }
  };

  const handleScroll = () => {
    const el = scrollerRef.current;
    if (!el || !el.clientWidth) return;
    if (showHint) dismissHint();
    if (programmaticRef.current) return;
    const next = Math.round(el.scrollLeft / el.clientWidth);
    if (next !== index && next >= 0 && next < total) onIndexChange(next);
  };

  return (
    <div style={{ position: "relative", width: "100%", ...style }} className={className}>
      <div
        ref={scrollerRef}
        onScroll={handleScroll}
        style={{
          display: "flex",
          overflowX: total > 1 ? "auto" : "hidden",
          overflowY: "hidden",
          scrollSnapType: "x mandatory",
          WebkitOverflowScrolling: "touch",
          scrollbarWidth: "none",
        }}
      >
        {items.map((item, i) => {
          const near = Math.abs(i - index) <= 1;
          return (
            <div
              key={getKey(item, i)}
              style={{
                flex: "0 0 100%",
                width: "100%",
                minWidth: "100%",
                scrollSnapAlign: "center",
                scrollSnapStop: "always",
                ...panelStyle,
              }}
            >
              {near ? renderItem(item, i === index, i) : null}
            </div>
          );
        })}
      </div>

      {/* Progress indicator */}
      {total > 1 && variant === "video" && (
        <div
          style={{
            position: "absolute",
            top: 12,
            left: 16,
            right: 16,
            display: "flex",
            gap: 4,
            pointerEvents: "none",
            zIndex: 5,
          }}
        >
          {items.map((item, i) => (
            <div
              key={`seg-${getKey(item, i)}`}
              style={{
                flex: 1,
                height: 3,
                borderRadius: 12,
                background: i <= index ? "#fff" : "rgba(255,255,255,0.3)",
              }}
            />
          ))}
        </div>
      )}

      {total > 1 && variant === "article" && (
        <div
          style={{
            position: "absolute",
            top: 12,
            right: 12,
            zIndex: 5,
            pointerEvents: "none",
            color: "#fff",
            fontSize: tokens.fontSize.base,
            fontWeight: tokens.fontWeight.bold,
            background: "rgba(0,0,0,0.3)",
            padding: "6px 16px",
            borderRadius: tokens.radiusCard,
            ...POPPINS,
          }}
        >
          {index + 1} of {total}
        </div>
      )}

      {/* Top-left back/close */}
      {topLeft && (
        <div style={{ position: "absolute", top: 12, left: 12, zIndex: 6 }}>{topLeft}</div>
      )}

      {/* Edge peek affordance */}
      {hasNext && (
        <div
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            right: 0,
            width: 26,
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            paddingRight: 2,
            pointerEvents: "none",
            zIndex: 4,
            background: dark
              ? "linear-gradient(90deg, transparent, rgba(0,0,0,0.3))"
              : "linear-gradient(90deg, transparent, rgba(11,31,58,0.12))",
          }}
        >
          <IconChevronRight
            size={18}
            color={dark ? "rgba(255,255,255,0.55)" : "rgba(11,31,58,0.45)"}
          />
        </div>
      )}

      {/* First-time swipe hint */}
      {showHint && hasNext && (
        <div
          style={{
            position: "absolute",
            right: 14,
            top: "50%",
            transform: "translateY(-50%)",
            zIndex: 7,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 4,
            pointerEvents: "none",
          }}
        >
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: "50%",
              background: dark ? "rgba(255,255,255,0.15)" : "rgba(11,31,58,0.25)",
              backdropFilter: "blur(8px)",
              WebkitBackdropFilter: "blur(8px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <IconChevronRight size={18} color="#fff" />
          </div>
          <span style={{ fontSize: 9, color: "rgba(255,255,255,0.85)", ...POPPINS }}>Next</span>
        </div>
      )}
    </div>
  );
}
