import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { toast } from "sonner";
import { BottomSheet, PrimaryButton, GhostButton } from "./BottomSheetV2";
import { pushSupported, subscribeToPush } from "../../lib/pushSubscription";

const STORAGE_KEY = "push-permission-declined";
const FONT = { fontFamily: "Poppins, Inter, sans-serif" } as const;

interface PushPermissionSheetProps {
  /** Signed-in user id — the sheet only appears once a user is present. */
  userId: string | null;
}

/**
 * Post-login prompt asking the instructor to opt in (or out) of push
 * notifications. Shown once per device; "Not now" is remembered.
 */
export function PushPermissionSheet({ userId }: PushPermissionSheetProps) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!userId) return;
    if (!pushSupported()) return;
    if (Notification.permission !== "default") return;
    if (localStorage.getItem(STORAGE_KEY) === "true") return;
    // Small delay so it doesn't fight with the login transition.
    const t = window.setTimeout(() => setOpen(true), 1200);
    return () => window.clearTimeout(t);
  }, [userId]);

  if (!open) return null;

  async function optIn() {
    if (busy) return;
    setBusy(true);
    try {
      const res = await subscribeToPush();
      if (res.ok) {
        toast.success("Notifications enabled");
        setOpen(false);
      } else {
        localStorage.setItem(STORAGE_KEY, "true");
        toast.error(res.error ?? "Could not enable notifications");
        setOpen(false);
      }
    } finally {
      setBusy(false);
    }
  }

  function optOut() {
    localStorage.setItem(STORAGE_KEY, "true");
    setOpen(false);
  }

  const footer = (
    <>
      <PrimaryButton onClick={optIn} disabled={busy} color="#1877D6">
        {busy ? "Enabling…" : "Turn on notifications"}
      </PrimaryButton>
      <GhostButton onClick={optOut} color="#0B1F3A" bg="transparent">
        Not now
      </GhostButton>
    </>
  );

  return (
    <BottomSheet title="Stay in the loop" onClose={optOut} footer={footer}>
      <div className="flex items-start gap-3 px-1 pt-1 pb-4">
        <div
          className="flex items-center justify-center rounded-full shrink-0"
          style={{ width: 40, height: 40, backgroundColor: "#EEF4FB" }}
        >
          <Bell size={20} color="#1877D6" />
        </div>
        <div className="min-w-0">
          <div className="text-[14px] font-semibold" style={{ ...FONT, color: "#0B1F3A" }}>
            Turn on push notifications
          </div>
          <div className="text-[13px] mt-1 leading-relaxed" style={{ ...FONT, color: "#4A5A73" }}>
            Get alerts for new bookings, payments, messages and lesson reminders. You can change
            this any time in Notification settings.
          </div>
        </div>
      </div>
    </BottomSheet>
  );
}
