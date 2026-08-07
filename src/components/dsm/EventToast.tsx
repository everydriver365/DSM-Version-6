import { useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Briefcase, MessageSquare, Mail, CalendarCheck, Phone, CreditCard, X } from "lucide-react";

const FONT = "Poppins, sans-serif";
const NAVY = "#0B1F3A";
const BLUE = "#1877D6";

export type LiveEventKind = "job" | "enquiry" | "message" | "booking" | "call" | "payment";

export type LiveEventPayload = {
  kind: LiveEventKind;
  /** Body / preview line. */
  text: string;
  url: string;
  /** Optional bold heading (sender name, job title...). */
  title?: string;
  /** Optional avatar image for message events. */
  avatarUrl?: string | null;
  /** Optional explicit dedupe key. */
  dedupeKey?: string;
};


const EVENT_NAME = "dsm-event-toast";

/* ------------------------------------------------------------------ */
/* Dedupe                                                              */
/* ------------------------------------------------------------------ */

const recent = new Map<string, number>();
const DEDUPE_MS = 8000;


/** Returns true when this payload was already shown very recently. */
function isDuplicate(payload: LiveEventPayload): boolean {
  const now = Date.now();
  for (const [k, t] of recent) if (now - t > DEDUPE_MS) recent.delete(k);

  // Only collapse the *same* message arriving via two channels. Distinct
  // messages — even in the same thread, seconds apart — all get a banner.
  const keys: string[] = [];
  if (payload.dedupeKey) keys.push(payload.dedupeKey);
  keys.push(`${payload.kind}|${payload.url}|${payload.text}`);

  const dup = keys.some((k) => recent.has(k));
  for (const k of keys) recent.set(k, now);
  return dup;
}


/**
 * Fire a live event. If the app is foregrounded, the EventToastController
 * shows the in-app banner. If the tab is hidden, we fall back to a native
 * notification (via the already-registered service worker) so the user
 * still gets the alert. Duplicate events (same message arriving via two
 * realtime channels) are collapsed into one.
 */
export function emitLiveEvent(payload: LiveEventPayload) {
  if (typeof window === "undefined") return;
  if (isDuplicate(payload)) return;
  const isVisible = document.visibilityState === "visible";
  if (isVisible) {
    window.dispatchEvent(new CustomEvent<LiveEventPayload>(EVENT_NAME, { detail: payload }));
    return;
  }
  // Background: native push
  try {
    if (
      typeof Notification !== "undefined" &&
      Notification.permission === "granted" &&
      "serviceWorker" in navigator
    ) {
      navigator.serviceWorker.ready.then((reg) => {
        reg.showNotification(payload.title || titleFor(payload.kind), {
          body: payload.text,
          tag: `dsm-live-${payload.kind}`,
          data: { url: payload.url },
        });
      });
    }
  } catch {
    /* ignore */
  }
}

function titleFor(kind: LiveEventKind): string {
  switch (kind) {
    case "job":
      return "New job";
    case "enquiry":
      return "New enquiry";
    case "message":
      return "New message";
    case "booking":
      return "New booking";
    case "call":
      return "Missed call";
    case "payment":
      return "Payment received";
  }
}


function styleFor(kind: LiveEventKind): { tint: string; color: string; icon: React.ReactNode } {
  switch (kind) {
    case "job":
      return { tint: "#FBEFDF", color: "#E0932F", icon: <Briefcase size={17} color="#fff" /> };
    case "enquiry":
      return { tint: "#E5EFFA", color: BLUE, icon: <Mail size={17} color="#fff" /> };
    case "message":
      return { tint: "#E5EFFA", color: BLUE, icon: <MessageSquare size={17} color="#fff" /> };
    case "booking":
      return { tint: "#E7F5EE", color: "#1B7F3B", icon: <CalendarCheck size={17} color="#fff" /> };
    case "call":
      return { tint: "#FBE6E7", color: "#CC2229", icon: <Phone size={17} color="#fff" /> };
    case "payment":
      return { tint: "#E0F2F1", color: "#0F766E", icon: <CreditCard size={17} color="#fff" /> };
  }
}


function initials(name: string): string {
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() ?? "")
      .join("") || "?"
  );
}

/**
 * The one and only in-app notification banner. Every live event — messages,
 * jobs, enquiries, bookings, calls — is queued through here so at most one
 * banner is ever visible.
 */
export function EventToastController() {
  const navigate = useNavigate();
  const [current, setCurrent] = useState<LiveEventPayload | null>(null);
  const [shown, setShown] = useState(false);
  const queueRef = useRef<LiveEventPayload[]>([]);
  const timerRef = useRef<number | null>(null);
  const [dragY, setDragY] = useState(0);
  const startY = useRef<number | null>(null);

  const clearTimer = () => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const showNext = () => {
    clearTimer();
    setDragY(0);
    const next = queueRef.current.shift() ?? null;
    setCurrent(next);
    setShown(false);
    if (next) {
      window.requestAnimationFrame(() => setShown(true));
      timerRef.current = window.setTimeout(() => {
        setShown(false);
        window.setTimeout(() => {
          setCurrent(null);
          window.setTimeout(showNext, 120);
        }, 220);
      }, 5000);
    }
  };

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<LiveEventPayload>).detail;
      if (!detail) return;
      queueRef.current.push(detail);
      if (!current) showNext();
    };
    window.addEventListener(EVENT_NAME, handler);
    return () => {
      window.removeEventListener(EVENT_NAME, handler);
      clearTimer();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current]);

  if (!current) return null;

  const { color, icon } = styleFor(current.kind);

  const dismiss = () => {
    clearTimer();
    setShown(false);
    window.setTimeout(() => {
      setCurrent(null);
      window.setTimeout(showNext, 120);
    }, 200);
  };

  const heading = current.title || titleFor(current.kind);

  return (
    <div
      style={{
        position: "fixed",
        top: "calc(env(safe-area-inset-top, 0px) + 12px)",
        left: 16,
        right: 16,
        zIndex: 9999,
        maxWidth: 390,
        margin: "0 auto",
        fontFamily: FONT,
        pointerEvents: "none",
      }}
    >
      <div
        role="button"
        tabIndex={0}
        onClick={() => {
          const url = current.url;
          dismiss();
          if (url) navigate({ to: url as never });
        }}
        onTouchStart={(e) => {
          startY.current = e.touches[0].clientY;
        }}
        onTouchMove={(e) => {
          if (startY.current == null) return;
          const dy = e.touches[0].clientY - startY.current;
          if (dy < 0) setDragY(dy);
        }}
        onTouchEnd={() => {
          if (dragY < -40) dismiss();
          else setDragY(0);
          startY.current = null;
        }}
        style={{
          pointerEvents: "auto",
          background: "#FFFFFF",
          borderRadius: 14,
          overflow: "hidden",
          boxShadow: "0 12px 40px rgba(11,31,58,0.22)",
          border: "1px solid #E8ECF2",
          borderTop: `3px solid ${color}`,
          opacity: shown ? 1 : 0,
          transform: shown ? `translateY(${dragY}px)` : "translateY(-20px)",
          transition:
            dragY === 0 ? "transform 0.25s ease-out, opacity 0.25s ease-out" : "opacity 0.25s ease-out",
          cursor: "pointer",
        }}
      >
        {/* Top bar */}
        <div
          style={{
            padding: "6px 12px",
            display: "flex",
            alignItems: "center",
            gap: 6,
            background: "#F8FAFC",
            borderBottom: "0.5px solid #E8ECF2",
          }}
        >
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: color, flexShrink: 0 }} />
          <span
            style={{
              fontSize: 10,
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              color: "rgba(11,31,58,0.55)",
              flex: 1,
            }}
          >
            DSM · {titleFor(current.kind)}
          </span>
          <button
            type="button"
            aria-label="Dismiss"
            onClick={(e) => {
              e.stopPropagation();
              dismiss();
            }}
            style={{
              background: "none",
              border: "none",
              padding: 0,
              lineHeight: 0,
              cursor: "pointer",
            }}
          >
            <X size={14} color="rgba(11,31,58,0.4)" />
          </button>
        </div>

        {/* Main row */}
        <div style={{ padding: "10px 12px", display: "flex", alignItems: "center", gap: 10 }}>
          {current.avatarUrl ? (
            <img
              src={current.avatarUrl}
              alt=""
              style={{
                width: 36,
                height: 36,
                borderRadius: "50%",
                objectFit: "cover",
                flexShrink: 0,
                border: `2px solid ${BLUE}`,
              }}
            />
          ) : (
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: "50%",
                flexShrink: 0,
                background: current.kind === "message" ? "#E6F1FB" : color,
                border: current.kind === "message" ? `2px solid ${BLUE}` : "none",
                color: current.kind === "message" ? BLUE : "#FFFFFF",
                fontSize: 12,
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {current.kind === "message" && current.title ? initials(current.title) : icon}
            </div>
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: "#0B1F3A",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {heading}
            </div>
            <div
              style={{
                fontSize: 11,
                color: "rgba(11,31,58,0.55)",
                lineHeight: 1.35,
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              }}
            >
              {current.text}
            </div>
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              const url = current.url;
              dismiss();
              if (url) navigate({ to: url as never });
            }}
            style={{
              flexShrink: 0,
              background: BLUE,
              color: "#FFFFFF",
              fontFamily: FONT,
              fontSize: 12,
              fontWeight: 600,
              padding: "4px 12px",
              borderRadius: 20,
              border: "none",
              cursor: "pointer",
            }}
          >
            {current.kind === "message" ? "Reply" : "View"}
          </button>
        </div>
      </div>
    </div>
  );
}
