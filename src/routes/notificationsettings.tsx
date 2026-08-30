import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { tokens } from "@/lib/tokens";
import { useEffect, useState } from "react";
import {
  IconBell,
  IconCalendar,
  IconClock,
  IconX,
  IconCurrencyPound,
  IconAlertCircle,
  IconUserOff,
  IconMail,
  IconMessage,
  IconSchool,
  IconCalendarCheck,
  IconArrowsLeftRight,
  IconCheck,
  IconChevronRight,
} from "@tabler/icons-react";
import { toast } from "@/lib/toast";
import OneSignal from "@onesignal/capacitor-plugin";
import { Capacitor } from "@capacitor/core";
import { App as CapApp } from "@capacitor/app";
import DSMTopSheet from "@/components/dsm/DSMTopSheet";

import { Card } from "../components/dsm/Card";
import { Button } from "../components/dsm/Button";
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
      { title: "Notification settings — EDP" },
      { name: "description", content: "Manage your notification preferences." },
    ],
  }),
  component: NotificationSettingsPage,
});

const POPPINS = { fontFamily: "Poppins, sans-serif" } as const;

const CARD_STYLE = {
  background: "#FFFFFF",
  borderRadius: 12,
  border: "1px solid #E4E8EF",
  overflow: "hidden",
  padding: 0,
} as const;

const SECTION_LABEL_STYLE = {
  fontSize: 11,
  fontWeight: 700,
  color: "#536579",
  textTransform: "uppercase" as const,
  letterSpacing: "0.6px",
  padding: "16px 16px 6px",
  ...POPPINS,
} as const;

type SettingsState = {
  sms_enabled: boolean;
  push_enabled: boolean;
  lesson_booked: boolean;
  lesson_reminder_24h: boolean;
  lesson_reminder_1h: boolean;
  lesson_cancelled: boolean;
  lesson_rescheduled: boolean;
  lesson_starting_soon: boolean;
  test_tomorrow: boolean;
  payment_received: boolean;
  outstanding_reminder: boolean;
  overdue_payment: boolean;
  new_enquiry: boolean;
  new_review: boolean;
  pupil_churn: boolean;
  quiet_from: string;
  quiet_to: string;
};

const DEFAULTS: SettingsState = {
  sms_enabled: true,
  push_enabled: true,
  lesson_booked: true,
  lesson_reminder_24h: true,
  lesson_reminder_1h: true,
  lesson_cancelled: true,
  lesson_rescheduled: true,
  lesson_starting_soon: true,
  test_tomorrow: true,
  payment_received: true,
  outstanding_reminder: true,
  overdue_payment: true,
  new_enquiry: true,
  new_review: true,
  pupil_churn: true,
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
  const [notifEnabled, setNotifEnabled] = useState(false);
  // "granted" | "not-asked" | "blocked" | "unavailable" | "web"
  const [nativePermState, setNativePermState] = useState<string>("not-asked");
  const [pushInitError, setPushInitError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setPushStatus(await getCurrentPushStatus());
    })();
  }, []);

  useEffect(() => {
    (async () => {
      if (typeof window !== "undefined") {
        setPushInitError(localStorage.getItem("dsm.push.initError"));
      }
      if (!Capacitor.isNativePlatform()) {
        setNativePermState("web");
        return;
      }
      try {
        const isGranted = await OneSignal.Notifications.hasPermission();
        setNotifEnabled(isGranted);
        if (isGranted) {
          setNativePermState("granted");
          return;
        }
        // iOS: 0 = not determined, 1 = denied, 2+ = authorised/provisional.
        let native: number | null = null;
        try {
          native = (await (OneSignal.Notifications as any).permissionNative()) as number;
        } catch {
          native = null;
        }
        setNativePermState(native === 0 || native === null ? "not-asked" : "blocked");
      } catch (e) {
        console.warn("[OneSignal] permission check failed", e);
        setNativePermState("unavailable");
      }
    })();
  }, []);

  async function openIosSettings() {
    try {
      await (CapApp as any).openUrl({ url: "app-settings:" });
    } catch {
      toast.error("Open iOS Settings > Every Driver Pro > Notifications");
    }
  }

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
          sms_enabled: row.sms_enabled ?? true,
          push_enabled: row.push_enabled ?? true,
          lesson_booked: row.lesson_booked ?? true,
          lesson_reminder_24h: row.lesson_reminder_24h ?? true,
          lesson_reminder_1h: row.lesson_reminder_1h ?? true,
          lesson_cancelled: row.lesson_cancelled ?? true,
          lesson_rescheduled: row.lesson_rescheduled ?? true,
          lesson_starting_soon: row.lesson_starting_soon ?? true,
          test_tomorrow: row.test_tomorrow ?? true,
          payment_received: row.payment_received ?? true,
          outstanding_reminder: row.outstanding_reminder ?? true,
          overdue_payment: row.overdue_payment ?? true,
          new_enquiry: row.new_enquiry ?? true,
          new_review: row.new_review ?? true,
          pupil_churn: row.pupil_churn ?? true,
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
    let { error } = await supabase.from("notification_settings").upsert(
      { instructor_id: userId, ...state, updated_at: new Date().toISOString() },
      { onConflict: "instructor_id" },
    );
    if (error && /sms_enabled|push_enabled/.test(error.message)) {
      // Channel columns not migrated yet — save the rest so nothing is lost.
      const { sms_enabled: _s, push_enabled: _p, ...rest } = state;
      ({ error } = await supabase.from("notification_settings").upsert(
        { instructor_id: userId, ...rest, updated_at: new Date().toISOString() },
        { onConflict: "instructor_id" },
      ));
      if (!error) toast.error("SMS/push preferences could not be saved yet.");
    }
    setSaving(false);
    if (error) {
      console.error("[notificationsettings] save error", error);
      return;
    }
    navigate({ to: "/settings" });
  }

  const pushGranted = nativePermState === "granted";

  return (
    <DSMTopSheet title="Notification Settings" onBack={() => navigate({ to: "/settings" as never })}>
      <div className="pb-24" style={{ ...POPPINS, background: "#DCE4F0", flex: 1 }}>
        <div className="px-4">
          {/* SECTION 1 — Lessons */}
          <div style={SECTION_LABEL_STYLE}>Lessons</div>
          <Card style={CARD_STYLE}>
            <ToggleItem
              icon={<IconCalendar size={18} color="#2C97DE" />}
              iconBg="#EAF5FC"
              label="Lesson tomorrow"
              subtitle="Reminder the day before"
              value={state.lesson_reminder_24h}
              onChange={(v) => setKey("lesson_reminder_24h", v)}
              isFirst
            />
            <ToggleItem
              icon={<IconClock size={18} color="#2C97DE" />}
              iconBg="#EAF5FC"
              label="Lesson starting soon"
              subtitle="30 minutes before start"
              value={state.lesson_starting_soon}
              onChange={(v) => setKey("lesson_starting_soon", v)}
            />
            <ToggleItem
              icon={<IconX size={18} color="#E53935" />}
              iconBg="#FEE2E2"
              label="Lesson cancelled"
              subtitle="When a lesson is cancelled"
              value={state.lesson_cancelled}
              onChange={(v) => setKey("lesson_cancelled", v)}
              isLast
            />
          </Card>

          {/* SECTION 2 — Pupils & payments */}
          <div style={SECTION_LABEL_STYLE}>Pupils & payments</div>
          <Card style={CARD_STYLE}>
            <ToggleItem
              icon={<IconCurrencyPound size={18} color="#16A34A" />}
              iconBg="#DCFCE7"
              label="Payment received"
              subtitle="When a pupil pays"
              value={state.payment_received}
              onChange={(v) => setKey("payment_received", v)}
              isFirst
            />
            <ToggleItem
              icon={<IconAlertCircle size={18} color="#F59E0B" />}
              iconBg="#FEF3C7"
              label="Overdue payment"
              subtitle="When payment is overdue"
              value={state.overdue_payment}
              onChange={(v) => setKey("overdue_payment", v)}
            />
            <ToggleItem
              icon={<IconUserOff size={18} color="#F59E0B" />}
              iconBg="#FEF3C7"
              label="Pupil gone quiet"
              subtitle="No lesson in 30 days"
              value={state.pupil_churn}
              onChange={(v) => setKey("pupil_churn", v)}
              isLast
            />
          </Card>

          {/* SECTION 3 — Enquiries & messages */}
          <div style={SECTION_LABEL_STYLE}>Enquiries & messages</div>
          <Card style={CARD_STYLE}>
            <ToggleItem
              icon={<IconMail size={18} color="#7B61FF" />}
              iconBg="#EDE9FE"
              label="New enquiry"
              subtitle="New booking enquiry"
              value={state.new_enquiry}
              onChange={(v) => setKey("new_enquiry", v)}
              isFirst
              isLast
            />
          </Card>

          {/* SECTION 4 — Tests */}
          <div style={SECTION_LABEL_STYLE}>Tests</div>
          <Card style={CARD_STYLE}>
            <ToggleItem
              icon={<IconCalendarCheck size={18} color="#F59E0B" />}
              iconBg="#FEF3C7"
              label="Test tomorrow"
              subtitle="Reminder the day before"
              value={state.test_tomorrow}
              onChange={(v) => setKey("test_tomorrow", v)}
              isFirst
              isLast
            />
          </Card>

          {/* SECTION 5 — ED Voice assistant */}
          <div style={SECTION_LABEL_STYLE}>ED Voice assistant</div>
          <Card
            style={{
              ...CARD_STYLE,
              padding: "14px 16px",
              cursor: "pointer",
            }}
            onClick={() => navigate({ to: "/ed-settings" })}
          >
            <div className="flex items-center" style={{ gap: 12 }}>
              <span
                className="flex items-center justify-center"
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 8,
                  backgroundColor: "#0B2341",
                  flexShrink: 0,
                }}
              >
                <span style={{ color: "#fff", fontSize: 12, fontWeight: 700, ...POPPINS }}>
                  ED
                </span>
              </span>
              <div className="flex-1">
                <div style={{ fontSize: 15, fontWeight: 500, color: "#0B2341", ...POPPINS }}>
                  ED Settings
                </div>
                <div style={{ fontSize: 12, color: "#536579", marginTop: 2, ...POPPINS }}>
                  Voice, wake word & AI
                </div>
              </div>
              <IconChevronRight size={20} color="#D1D5DB" />
            </div>
          </Card>

          {/* SECTION 6 — Push notifications */}
          <div style={SECTION_LABEL_STYLE}>Push notifications</div>
          <Card style={CARD_STYLE}>
            <div
              className="flex items-center"
              style={{
                gap: 12,
                padding: "14px 16px",
                borderBottom: "1px solid #F4F6F8",
              }}
            >
              <span
                className="flex items-center justify-center"
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 8,
                  backgroundColor: pushGranted ? "#DCFCE7" : "#FEE2E2",
                  flexShrink: 0,
                }}
              >
                {pushGranted ? (
                  <IconCheck size={18} color="#16A34A" />
                ) : (
                  <IconAlertCircle size={18} color="#E53935" />
                )}
              </span>
              <div className="flex-1">
                <div
                  style={{
                    fontSize: 15,
                    fontWeight: 500,
                    color: pushGranted ? "#16A34A" : "#E53935",
                    ...POPPINS,
                  }}
                >
                  {pushGranted ? "Notifications enabled" : "Notifications disabled"}
                </div>
                <div style={{ fontSize: 12, color: "#536579", marginTop: 2, ...POPPINS }}>
                  {pushGranted
                    ? "Push notifications are active"
                    : "Tap below to enable"}
                </div>
              </div>
            </div>

            {!pushGranted && nativePermState !== "web" && (
              <button
                type="button"
                onClick={async () => {
                  if (nativePermState === "blocked" || nativePermState === "unavailable") {
                    await openIosSettings();
                    return;
                  }
                  try {
                    await OneSignal.Notifications.requestPermission(true);
                    const isGranted = await OneSignal.Notifications.hasPermission();
                    setNotifEnabled(isGranted);
                    if (isGranted) {
                      setNativePermState("granted");
                      toast.success("Notifications enabled!");
                    } else {
                      setNativePermState("blocked");
                      toast.error("iOS won’t re-ask — enable it in Settings");
                      await openIosSettings();
                    }
                  } catch (e) {
                    console.warn("[OneSignal] request permission failed", e);
                    setNativePermState("unavailable");
                    toast.error("Could not enable notifications");
                  }
                }}
                style={{
                  display: "block",
                  width: "calc(100% - 32px)",
                  height: 44,
                  margin: "12px 16px",
                  borderRadius: 10,
                  background: "#2C97DE",
                  color: "#fff",
                  fontSize: 14,
                  fontWeight: 600,
                  textAlign: "center",
                  border: "none",
                  cursor: "pointer",
                  ...POPPINS,
                }}
              >
                {nativePermState === "blocked" || nativePermState === "unavailable"
                  ? "Open iOS Settings"
                  : "Enable push notifications"}
              </button>
            )}
          </Card>

          <div className="mt-6">
            <Button variant="primary" onClick={save} disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </div>
        </div>
      </div>
    </DSMTopSheet>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <div style={SECTION_LABEL_STYLE}>{children}</div>;
}

function ToggleItem({
  icon,
  iconBg,
  label,
  subtitle,
  value,
  onChange,
  isFirst,
  isLast,
}: {
  icon: React.ReactNode;
  iconBg: string;
  label: string;
  subtitle?: string;
  value: boolean;
  onChange: (v: boolean) => void;
  isFirst?: boolean;
  isLast?: boolean;
}) {
  return (
    <div
      className="flex items-center"
      style={{
        gap: 12,
        padding: "14px 16px",
        borderBottom: isLast ? undefined : "1px solid #F4F6F8",
      }}
    >
      <span
        className="flex items-center justify-center"
        style={{
          width: 34,
          height: 34,
          borderRadius: 8,
          backgroundColor: iconBg,
          flexShrink: 0,
        }}
      >
        {icon}
      </span>
      <div className="flex-1" style={{ minWidth: 0 }}>
        <div style={{ fontSize: 15, fontWeight: 500, color: "#0B2341", ...POPPINS }}>
          {label}
        </div>
        {subtitle && (
          <div style={{ fontSize: 12, color: "#536579", marginTop: 2, ...POPPINS }}>
            {subtitle}
          </div>
        )}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={value}
        onClick={() => onChange(!value)}
        className="relative shrink-0 rounded-full transition-colors"
        style={{
          width: 44,
          height: 26,
          backgroundColor: value ? "#1877D6" : "#EEF2F7",
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
