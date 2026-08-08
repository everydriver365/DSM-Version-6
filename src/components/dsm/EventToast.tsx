import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";

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

function colorFor(kind: LiveEventKind): string {
  switch (kind) {
    case "job": return "#E0932F";
    case "enquiry": return "#1877D6";
    case "message": return "#1877D6";
    case "booking": return "#1B7F3B";
    case "call": return "#CC2229";
    case "payment": return "#0F766E";
  }
}

export function EventToastController() {
  const navigate = useNavigate();

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<LiveEventPayload>).detail;
      if (!detail) return;

      const color = colorFor(detail.kind);
      const title = detail.title ?? titleFor(detail.kind);

      toast(title, {
        description: detail.text,
        duration: 5000,
        style: {
          borderLeftColor: color,
          borderLeftWidth: 4,
          borderLeftStyle: "solid",
        },
        action: detail.url ? {
          label: "View",
          onClick: () => navigate({
            to: detail.url as never,
          }),
        } : undefined,
      });
    };

    window.addEventListener(EVENT_NAME, handler);
    return () => window.removeEventListener(EVENT_NAME, handler);
  }, [navigate]);

  return null;
}
