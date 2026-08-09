import { useEffect, useState, type RefObject } from "react";
import { IconArrowDown } from "@tabler/icons-react";

/**
 * Floating "jump to latest" pill. Appears when the user has scrolled up away
 * from the newest message in a chat thread; tapping it smooth-scrolls back to
 * the bottom.
 */
export default function JumpToLatestButton({
  scrollerRef,
  bottomOffset = 96,
  threshold = 200,
}: {
  scrollerRef: RefObject<HTMLDivElement | null>;
  /** Distance from the bottom of the thread container, in px. */
  bottomOffset?: number;
  /** How far from the bottom the user must be before the pill shows. */
  threshold?: number;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const onScroll = () => {
      const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
      setVisible(distance > threshold);
    };
    onScroll();
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [scrollerRef, threshold]);

  if (!visible) return null;

  return (
    <button
      type="button"
      aria-label="Jump to latest message"
      onClick={() => {
        const el = scrollerRef.current;
        if (!el) return;
        el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
      }}
      style={{
        position: "fixed",
        left: "50%",
        transform: "translateX(-50%)",
        bottom: bottomOffset,
        zIndex: 20,
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "8px 14px",
        borderRadius: 999,
        border: "none",
        background: "#0B1F3A",
        color: "#fff",
        fontSize: 12.5,
        fontWeight: 700,
        boxShadow: "0 6px 18px rgba(11,31,58,0.28)",
        cursor: "pointer",
      }}
    >
      <IconArrowDown size={15} stroke={2.4} />
      Jump to latest
    </button>
  );
}
