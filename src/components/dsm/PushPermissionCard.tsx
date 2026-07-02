import { useEffect, useState } from "react";
import { Bell, BellOff, CheckCircle2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "../../lib/supabaseClient";

const POPPINS = { fontFamily: "Inter, sans-serif" } as const;
const VAPID_PUBLIC_KEY =
  "BCPt7KU8Me_IlOTU1OlId15UTBFlWgTiZbW-IfQmA0M1NH0__IOfyhekALKRRPFSSCrKDPQ2y0qXK7wwftTBKWE";
const SUPABASE_URL = "https://bjpqxfrihwjcqprmoqfs.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJqcHF4ZnJpaHdqY3Fwcm1vcWZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE0NzQ4MjEsImV4cCI6MjA5NzA1MDgyMX0.HKlgx3dxP3uxX9wMRRUnfb0IPwaBpFcut_iUgT5XFeo";

type Status = "unsupported" | "default" | "granted" | "denied";

function readStatus(): Status {
  if (typeof window === "undefined") return "default";
  if (!("Notification" in window) || !("serviceWorker" in navigator) || !("PushManager" in window)) {
    return "unsupported";
  }
  return Notification.permission as Status;
}

export function PushPermissionCard() {
  const [status, setStatus] = useState<Status>("default");
  const [busy, setBusy] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    setStatus(readStatus());
    const declined = localStorage.getItem("push-permission-declined") === "true";
    const oldDismissed = localStorage.getItem("dsm.push.cardDismissed") === "1";
    setDismissed(declined || oldDismissed);
  }, []);

  async function enable() {
    if (busy) return;
    setBusy(true);
    try {
      const reg =
        (await navigator.serviceWorker.getRegistration("/sw.js")) ||
        (await navigator.serviceWorker.register("/sw.js"));
      const permission = await Notification.requestPermission();
      setStatus(permission as Status);
      if (permission !== "granted") {
        localStorage.setItem("push-permission-declined", "true");
        setDismissed(true);
        if (permission === "denied") {
          toast.error("Notifications blocked. Enable them in your browser settings.");
        }
        return;
      }

      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: VAPID_PUBLIC_KEY,
        });
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session) {
        await fetch(`${SUPABASE_URL}/rest/v1/push_subscriptions`, {
          method: "POST",
          headers: {
            apikey: SUPABASE_ANON_KEY,
            Authorization: `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
            Prefer: "resolution=merge-duplicates,return=minimal",
          },
          body: JSON.stringify({
            instructor_id: session.user.id,
            subscription: JSON.stringify(sub),
            user_agent: navigator.userAgent,
          }),
        });
      }
      toast.success("Notifications enabled");
    } catch (err) {
      console.warn("[push] enable failed", err);
      toast.error("Could not enable notifications");
    } finally {
      setBusy(false);
    }
  }

  function dismiss() {
    localStorage.setItem("push-permission-declined", "true");
    localStorage.setItem("dsm.push.cardDismissed", "1");
    setDismissed(true);
  }

  if (dismissed || status === "granted" || status === "denied" || status === "unsupported") {
    return null;
  }

  const isDenied = false;
  const isUnsupported = false;

  return (
    <div className="px-4 mt-3">
      <div
        className="rounded-xl p-3"
        style={{
          backgroundColor: "#FFFFFF",
          border: "0.5px solid #EEF2F7",
          boxShadow: "0 1px 2px rgba(15,32,68,0.04)",
        }}
      >
        <div className="flex items-start gap-3">
          <div
            className="flex items-center justify-center rounded-full shrink-0"
            style={{
              width: 36,
              height: 36,
              backgroundColor: isDenied ? "#FEF3C7" : "#EEF4FB",
            }}
          >
            {isDenied ? (
              <AlertTriangle size={18} color="#B45309" />
            ) : (
              <Bell size={18} color="#1A4A6E" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div
              className="text-[14px] font-semibold"
              style={{ ...POPPINS, color: "#0C2340" }}
            >
              {isUnsupported
                ? "Notifications not supported"
                : isDenied
                ? "Notifications blocked"
                : "Turn on notifications"}
            </div>
            <div
              className="text-[12px] mt-0.5"
              style={{ ...POPPINS, color: "#6B7280" }}
            >
              {isUnsupported
                ? "This browser does not support push notifications."
                : isDenied
                ? "You blocked notifications. Re-enable them in your browser site settings, then reload."
                : "Get alerts for new bookings, payments and lesson reminders."}
            </div>
            <div className="text-[11px] mt-1" style={{ ...POPPINS, color: "#9CA3AF" }}>
              Status:{" "}
              <strong style={{ color: "#374151" }}>
                {isUnsupported
                  ? "Unsupported"
                  : isDenied
                  ? "Blocked"
                  : "Not enabled"}
              </strong>
            </div>
            <div className="flex items-center gap-2 mt-2">
              {!isUnsupported && !isDenied && (
                <button
                  type="button"
                  onClick={enable}
                  disabled={busy}
                  className="text-[13px] font-semibold rounded-md px-3 py-1.5 disabled:opacity-60"
                  style={{ ...POPPINS, backgroundColor: "#1A4A6E", color: "#FFFFFF" }}
                >
                  {busy ? "Enabling…" : "Enable notifications"}
                </button>
              )}
              <button
                type="button"
                onClick={dismiss}
                className="text-[13px] font-medium px-2 py-1.5"
                style={{ ...POPPINS, color: "#6B7280" }}
              >
                Not now
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
