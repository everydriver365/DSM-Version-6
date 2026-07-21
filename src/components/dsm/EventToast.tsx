import { useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Briefcase, MessageSquare, Mail, CalendarCheck, Phone } from "lucide-react";

const FONT = "Poppins, sans-serif";
const NAVY = "#0F2044";

export type LiveEventKind = "job" | "enquiry" | "message" | "booking" | "call";

export type LiveEventPayload = {
  kind: LiveEventKind;
  text: string;
  url: string;
};

const EVENT_NAME = "dsm-event-toast";

/**
 * Fire a live event. If the app is foregrounded, the EventToastController
 * shows an in-app toast. If the tab is hidden, we fall back to a native
 * notification (via the already-registered service worker) so the user
 * still gets the alert.
 */
export function emitLiveEvent(payload: LiveEventPayload) {
  if (typeof window === "undefined") return;
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
        reg.showNotification(titleFor(payload.kind), {
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
  }
}

function styleFor(kind: LiveEventKind): { tint: string; color: string; icon: React.ReactNode } {
  switch (kind) {
    case "job":
      return { tint: "#FBEFDF", color: "#B5661E", icon: <Briefcase size={18} color="#B5661E" /> };
    case "enquiry":
      return { tint: "#E5EFFA", color: "#1877D6", icon: <Mail size={18} color="#1877D6" /> };
    case "message":
      return {
        tint: "#E5EFFA",
        color: "#1877D6",
        icon: <MessageSquare size={18} color="#1877D6" />,
      };
    case "booking":
      return {
        tint: "#E7F5EE",
        color: "#1B7F3B",
        icon: <CalendarCheck size={18} color="#1B7F3B" />,
      };
    case "call":
      return { tint: "#FBE6E7", color: "#CC2229", icon: <Phone size={18} color="#CC2229" /> };
  }
}

export function EventToastController() {
  const navigate = useNavigate();
  const [current, setCurrent] = useState<LiveEventPayload | null>(null);
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
    if (next) {
      timerRef.current = window.setTimeout(() => {
        setCurrent(null);
        // Small gap between queued toasts.
        window.setTimeout(showNext, 200);
      }, 4000);
    }
  };

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<LiveEventPayload>).detail;
      if (!detail) return;
      if (current) {
        queueRef.current.push(detail);
      } else {
        queueRef.current.push(detail);
        showNext();
      }
    };
    window.addEventListener(EVENT_NAME, handler);
    return () => {
      window.removeEventListener(EVENT_NAME, handler);
      clearTimer();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current]);

  if (!current) return null;

  const { tint, icon } = styleFor(current.kind);

  const dismiss = () => {
    setCurrent(null);
    window.setTimeout(showNext, 150);
  };

  return (
    <div
      style={{
        position: "fixed",
        top: "calc(env(safe-area-inset-top, 0px) + 10px)",
        left: 0,
        right: 0,
        display: "flex",
        justifyContent: "center",
        zIndex: 200,
        pointerEvents: "none",
        fontFamily: FONT,
      }}
    >
      <div
        role="button"
        tabIndex={0}
        onClick={() => {
          const url = current.url;
          dismiss();
          if (url) navigate({ to: url });
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
          if (dragY < -40) {
            dismiss();
          } else {
            setDragY(0);
          }
          startY.current = null;
        }}
        style={{
          pointerEvents: "auto",
          width: "calc(100% - 24px)",
          maxWidth: 460,
          minHeight: 64,
          background: "white",
          borderRadius: 14,
          boxShadow: "0 1px 3px rgba(0,0,0,0.06), 0 6px 20px rgba(15,32,68,0.12)",
          padding: "10px 14px",
          display: "flex",
          alignItems: "center",
          gap: 12,
          transform: `translateY(${dragY}px)`,
          transition: dragY === 0 ? "transform 200ms ease" : "none",
          cursor: "pointer",
        }}
      >
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 10,
            background: tint,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          {icon}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: NAVY,
              lineHeight: 1.3,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {current.text}
          </div>
        </div>
      </div>
    </div>
  );
}
