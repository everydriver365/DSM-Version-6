import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Bell } from "lucide-react";
import { Card } from "../components/dsm/Card";
import { Button } from "../components/dsm/Button";
import { SectionHeader } from "../components/dsm/SectionHeader";
import { supabase } from "../lib/supabaseClient";
import {
  getPermission,
  requestPermission,
  isSupported as notificationsSupported,
} from "../lib/pushNotifications";
import {
  subscribeToPush,
  unsubscribeFromPush,
  getCurrentPushStatus,
  pushSupported,
} from "../lib/pushSubscription";


export const Route = createFileRoute("/notificationsettings")({
  head: () => ({
    meta: [
      { title: "Notification settings — DSM" },
      { name: "description", content: "Manage your notification preferences." },
    ],
  }),
  component: NotificationSettingsPage,
});

const POPPINS = { fontFamily: "Inter, sans-serif" } as const;

type SettingsState = {
  lesson_booked: boolean;
  lesson_reminder_24h: boolean;
  lesson_reminder_1h: boolean;
  lesson_cancelled: boolean;
  lesson_rescheduled: boolean;
  payment_received: boolean;
  outstanding_reminder: boolean;
  new_enquiry: boolean;
  new_review: boolean;
  quiet_from: string;
  quiet_to: string;
};

const DEFAULTS: SettingsState = {
  lesson_booked: true,
  lesson_reminder_24h: true,
  lesson_reminder_1h: true,
  lesson_cancelled: true,
  lesson_rescheduled: true,
  payment_received: true,
  outstanding_reminder: true,
  new_enquiry: true,
  new_review: true,
  quiet_from: "22:00",
  quiet_to: "07:00",
};

function NotificationSettingsPage() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [state, setState] = useState<SettingsState>(DEFAULTS);
  const [saving, setSaving] = useState(false);
  const [browserPerm, setBrowserPerm] = useState<"granted" | "denied" | "default">(
    () => (notificationsSupported() ? getPermission() : "denied"),
  );


  const [pushStatus, setPushStatus] = useState<"enabled" | "disabled" | "unsupported">(
    () => (pushSupported() ? "disabled" : "unsupported"),
  );
  const [pushBusy, setPushBusy] = useState(false);
  const [pushError, setPushError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setPushStatus(await getCurrentPushStatus());
    })();
  }, []);

  async function togglePush(next: boolean) {
    if (pushBusy) return;
    setPushBusy(true);
    setPushError(null);
    const res = next ? await subscribeToPush() : await unsubscribeFromPush();
    if (!res.ok) setPushError(res.error ?? "Something went wrong.");
    setPushStatus(await getCurrentPushStatus());
    if (next && res.ok) setBrowserPerm(getPermission());
    setPushBusy(false);
  }

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.auth.getUser();
      if (error) console.error("[notificationsettings] auth error", error);
      const user = data.user;
      if (!user) return;
      setUserId(user.id);

      const { data: row, error: rowErr } = await supabase
        .from("notification_settings")
        .select("*")
        .eq("instructor_id", user.id)
        .maybeSingle();
      if (rowErr) console.error("[notificationsettings] fetch error", rowErr);
      if (row) {
        setState({
          lesson_booked: row.lesson_booked ?? true,
          lesson_reminder_24h: row.lesson_reminder_24h ?? true,
          lesson_reminder_1h: row.lesson_reminder_1h ?? true,
          lesson_cancelled: row.lesson_cancelled ?? true,
          lesson_rescheduled: row.lesson_rescheduled ?? true,
          payment_received: row.payment_received ?? true,
          outstanding_reminder: row.outstanding_reminder ?? true,
          new_enquiry: row.new_enquiry ?? true,
          new_review: row.new_review ?? true,
          quiet_from: (row.quiet_from ?? "22:00").slice(0, 5),
          quiet_to: (row.quiet_to ?? "07:00").slice(0, 5),
        });
      }
    })();
  }, []);

  function setKey<K extends keyof SettingsState>(k: K, v: SettingsState[K]) {
    setState((s) => ({ ...s, [k]: v }));
  }

  async function save() {
    if (!userId) return;
    setSaving(true);
    const { error } = await supabase.from("notification_settings").upsert(
      { instructor_id: userId, ...state, updated_at: new Date().toISOString() },
      { onConflict: "instructor_id" },
    );
    setSaving(false);
    if (error) {
      console.error("[notificationsettings] save error", error);
      return;
    }
    navigate({ to: "/settings" });
  }

  return (
    <div className="min-h-screen bg-white pb-24" style={POPPINS}>
      <div
        className="sticky top-0 z-40 flex items-center px-4"
        style={{ height: 52, backgroundColor: "#072b47" }}
      >
        <button type="button" onClick={() => navigate({ to: "/settings" })} aria-label="Back">
          <ArrowLeft size={22} color="#FFFFFF" />
        </button>
        <div className="flex-1 text-center text-[15px] font-semibold text-white" style={POPPINS}>
          Notification settings
        </div>
        <div style={{ width: 22 }} />
      </div>

      <div className="px-4">
        <SectionHeader>PUSH NOTIFICATIONS</SectionHeader>
        <Card>
          <div className="flex items-center gap-3">
            <span
              className="flex items-center justify-center rounded-full"
              style={{ width: 32, height: 32, backgroundColor: "#DBEAFE", flexShrink: 0 }}
            >
              <Bell size={16} color="#00A3B4" />
            </span>
            <div className="flex-1">
              <div className="text-[14px] font-semibold text-[#0A2540]" style={POPPINS}>
                Push notifications
              </div>
              <div className="text-[12px] text-[#6B7280]" style={POPPINS}>
                {pushStatus === "unsupported"
                  ? "Not supported on this device"
                  : pushStatus === "enabled"
                    ? "Enabled on this device"
                    : "Not enabled"}
              </div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={pushStatus === "enabled"}
              disabled={pushStatus === "unsupported" || pushBusy}
              onClick={() => togglePush(pushStatus !== "enabled")}
              className="relative shrink-0 rounded-full transition-colors"
              style={{
                width: 44,
                height: 26,
                backgroundColor: pushStatus === "enabled" ? "#00A3B4" : "#EEF2F7",
                opacity: pushStatus === "unsupported" || pushBusy ? 0.5 : 1,
              }}
            >
              <span
                className="absolute top-[3px] rounded-full bg-white transition-all"
                style={{
                  width: 20,
                  height: 20,
                  left: pushStatus === "enabled" ? 21 : 3,
                  boxShadow: "0 1px 2px rgba(0,0,0,0.2)",
                }}
              />
            </button>
          </div>
          {pushError && (
            <div className="text-[11px] text-[#B91C1C] mt-2" style={POPPINS}>
              {pushError}
            </div>
          )}
        </Card>

        <SectionHeader>BROWSER PERMISSION</SectionHeader>
        <Card>
          {(() => {
            const supported = notificationsSupported();
            const status = !supported
              ? { label: "Notifications: Not supported", color: "#6B7280", bg: "#F3F4F6" }
              : browserPerm === "granted"
                ? { label: "Notifications: Enabled ✓", color: "#15803D", bg: "#DCFCE7" }
                : browserPerm === "denied"
                  ? { label: "Notifications: Blocked ✗", color: "#B91C1C", bg: "#FEE2E2" }
                  : { label: "Notifications: Not set up", color: "#92400E", bg: "#FEF3C7" };
            return (
              <div className="flex items-center gap-3">
                <span
                  className="flex items-center justify-center rounded-full"
                  style={{ width: 32, height: 32, backgroundColor: status.bg, flexShrink: 0 }}
                >
                  <Bell size={16} color={status.color} />
                </span>
                <div
                  className="flex-1 text-[13px] font-semibold"
                  style={{ color: status.color, ...POPPINS }}
                >
                  {status.label}
                </div>
                {supported && browserPerm !== "granted" && browserPerm !== "denied" && (
                  <button
                    type="button"
                    onClick={async () => {
                      const r = await requestPermission();
                      setBrowserPerm(r);
                    }}
                    className="text-white text-[12px] font-semibold rounded-lg"
                    style={{
                      backgroundColor: "#00A3B4",
                      padding: "8px 12px",
                      ...POPPINS,
                    }}
                  >
                    Request permission
                  </button>
                )}
              </div>
            );
          })()}
          {browserPerm === "denied" && (
            <div className="text-[11px] text-[#6B7280] mt-2" style={POPPINS}>
              Notifications are blocked. Enable them in your browser settings to receive reminders.
            </div>
          )}
        </Card>


        <SectionHeader>LESSON NOTIFICATIONS</SectionHeader>
        <Card className="!p-0">
          <ToggleRow label="New lesson booked" value={state.lesson_booked} onChange={(v) => setKey("lesson_booked", v)} isFirst />
          <ToggleRow label="Lesson reminder — 24 hours before" value={state.lesson_reminder_24h} onChange={(v) => setKey("lesson_reminder_24h", v)} />
          <ToggleRow label="Lesson reminder — 1 hour before" value={state.lesson_reminder_1h} onChange={(v) => setKey("lesson_reminder_1h", v)} />
          <ToggleRow label="Lesson cancelled by pupil" value={state.lesson_cancelled} onChange={(v) => setKey("lesson_cancelled", v)} />
          <ToggleRow label="Lesson rescheduled" value={state.lesson_rescheduled} onChange={(v) => setKey("lesson_rescheduled", v)} />
        </Card>

        <SectionHeader>PAYMENT NOTIFICATIONS</SectionHeader>
        <Card className="!p-0">
          <ToggleRow label="Payment received" value={state.payment_received} onChange={(v) => setKey("payment_received", v)} isFirst />
          <ToggleRow label="Outstanding balance reminder" value={state.outstanding_reminder} onChange={(v) => setKey("outstanding_reminder", v)} />
        </Card>

        <SectionHeader>PUPIL NOTIFICATIONS</SectionHeader>
        <Card className="!p-0">
          <ToggleRow label="New enquiry received" value={state.new_enquiry} onChange={(v) => setKey("new_enquiry", v)} isFirst />
          <ToggleRow label="New review received" value={state.new_review} onChange={(v) => setKey("new_review", v)} />
        </Card>

        <SectionHeader>QUIET HOURS</SectionHeader>
        <Card>
          <div className="text-[12px] text-[#6B7280] mb-3" style={POPPINS}>
            No notifications sent during this window.
          </div>
          <div className="flex gap-3">
            <label className="flex-1">
              <div className="text-[12px] text-[#6B7280] mb-1" style={POPPINS}>From</div>
              <input
                type="time"
                value={state.quiet_from}
                onChange={(e) => setKey("quiet_from", e.target.value)}
                className="w-full h-11 rounded-lg px-3 bg-white text-[14px] text-[#0A2540]"
                style={{ borderWidth: "0.5px", borderStyle: "solid", borderColor: "#EEF2F7", ...POPPINS }}
              />
            </label>
            <label className="flex-1">
              <div className="text-[12px] text-[#6B7280] mb-1" style={POPPINS}>To</div>
              <input
                type="time"
                value={state.quiet_to}
                onChange={(e) => setKey("quiet_to", e.target.value)}
                className="w-full h-11 rounded-lg px-3 bg-white text-[14px] text-[#0A2540]"
                style={{ borderWidth: "0.5px", borderStyle: "solid", borderColor: "#EEF2F7", ...POPPINS }}
              />
            </label>
          </div>
        </Card>

        <div className="mt-6">
          <Button variant="primary" onClick={save} disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function ToggleRow({
  label,
  value,
  onChange,
  isFirst,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
  isFirst?: boolean;
}) {
  return (
    <div
      className="flex items-center justify-between px-4 py-3"
      style={isFirst ? undefined : { borderTopWidth: "0.5px", borderTopStyle: "solid", borderTopColor: "#EEF2F7" }}
    >
      <span className="flex-1 text-[14px] text-[#0A2540] pr-3" style={POPPINS}>{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={value}
        onClick={() => onChange(!value)}
        className="relative shrink-0 rounded-full transition-colors"
        style={{
          width: 44,
          height: 26,
          backgroundColor: value ? "#00A3B4" : "#EEF2F7",
        }}
      >
        <span
          className="absolute top-[3px] rounded-full bg-white transition-all"
          style={{
            width: 20,
            height: 20,
            left: value ? 21 : 3,
            boxShadow: "0 1px 2px rgba(0,0,0,0.2)",
          }}
        />
      </button>
    </div>
  );
}
