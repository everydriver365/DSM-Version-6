import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { IconAlertCircle, IconAlertTriangle, IconCalendar, IconCheck, IconChevronDown, IconChevronRight, IconCopy, IconInfoCircle, IconLoader2, IconRefresh, IconX } from "@tabler/icons-react";
import { DSMToggle } from "@/components/dsm/DSMToggle";
import {
  getImportEnabled,
  getPushEnabled,
  setImportEnabled as persistImportEnabled,
  setPushEnabled as persistPushEnabled,
} from "@/lib/calendarSyncPrefs";
import { backfillGoogleColours } from "@/lib/calendarColourBackfill.functions";
import { toast } from "sonner";
import DSMTopSheet from "@/components/dsm/DSMTopSheet";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { SectionHeader } from "../components/dsm/SectionHeader";
import { supabase } from "../lib/supabaseClient";

const SUPABASE_URL = "https://bjpqxfrihwjcqprmoqfs.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJqcHF4ZnJpaHdqY3Fwcm1vcWZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE0NzQ4MjEsImV4cCI6MjA5NzA1MDgyMX0.HKlgx3dxP3uxX9wMRRUnfb0IPwaBpFcut_iUgT5XFeo";

function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const s = Math.max(0, Math.floor((now - then) / 1000));
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} minute${m === 1 ? "" : "s"} ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} hour${h === 1 ? "" : "s"} ago`;
  const d = Math.floor(h / 24);
  return `${d} day${d === 1 ? "" : "s"} ago`;
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "Never";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "Never";
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

interface GoogleConnection {
  connected_at: string | null;
  last_synced_at: string | null;
}

export const Route = createFileRoute("/calendarsync")({
  head: () => ({
    meta: [
      { title: "Calendar sync — DSM by EveryDriver" },
      { name: "description", content: "Sync your lessons to any calendar app using an ICS feed." },
    ],
  }),
  component: CalendarSyncPage,
});

const POPPINS = { fontFamily: "Poppins, sans-serif" } as const;

const SECTION_CARD: React.CSSProperties = {
  background: "#fff",
  borderRadius: 8,
  padding: 18,
  boxShadow: "0 4px 0 #E4E4E8, 0 14px 30px rgba(0,0,0,0.06)",
  marginBottom: 24,
};

const DESC: React.CSSProperties = {
  ...POPPINS,
  color: "#6B6B6F",
  fontSize: 13.5,
  fontWeight: 500,
  lineHeight: 1.5,
  marginBottom: 16,
};

const FIELD_LABEL: React.CSSProperties = {
  ...POPPINS,
  display: "block",
  color: "#8A8A8E",
  fontSize: 12,
  fontWeight: 600,
  marginBottom: 8,
};

const FIELD_INPUT: React.CSSProperties = {
  ...POPPINS,
  background: "#F2F2F7",
  borderRadius: 8,
  padding: "13px 15px",
  border: "none",
  outline: "none",
  color: "#6B6B6F",
  fontSize: 13,
  fontWeight: 500,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

const STATUS_DOT: React.CSSProperties = {
  width: 22,
  height: 22,
  borderRadius: 999,
  background: "#1A9B5C",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
};

const BTN_BASE: React.CSSProperties = {
  ...POPPINS,
  width: "100%",
  padding: 15,
  borderRadius: 8,
  fontSize: 14.5,
  fontWeight: 800,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
};

const BTN_PRIMARY: React.CSSProperties = {
  ...BTN_BASE,
  background: "#1877D6",
  color: "#fff",
  border: "none",
  boxShadow: "0 4px 0 #0F52A8",
};

const BTN_OUTLINE: React.CSSProperties = {
  ...BTN_BASE,
  background: "#fff",
  color: "#1877D6",
  border: "1.5px solid #E4E4E8",
};

const BTN_OUTLINE_RED: React.CSSProperties = {
  ...BTN_BASE,
  background: "#fff",
  color: "#FF3B30",
  border: "1.5px solid #FF3B30",
};

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 }}>
      <span style={{ width: 3, height: 14, background: "#1877D6", borderRadius: 8, flexShrink: 0 }} />
      <span
        style={{
          ...POPPINS,
          color: "#1877D6",
          fontSize: 12,
          fontWeight: 800,
          letterSpacing: "0.6px",
          textTransform: "uppercase",
        }}
      >
        {children}
      </span>
    </div>
  );
}




function CalendarSyncPage() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [externalCalendarUrl, setExternalCalendarUrl] = useState("");
  const [savedUrl, setSavedUrl] = useState("");
  const [icsSyncing, setIcsSyncing] = useState(false);
  const [icsLastSynced, setIcsLastSynced] = useState<string | null>(null);
  const [icsSyncError, setIcsSyncError] = useState<string | null>(null);
  const [removing, setRemoving] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [googleConnected, setGoogleConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [lastSynced, setLastSynced] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [importEnabled, setImportEnabledState] = useState(true);
  const [pushEnabled, setPushEnabledState] = useState(true);
  const [showICS, setShowICS] = useState(false);

  // Load saved sync-direction preferences (client-only).
  useEffect(() => {
    setImportEnabledState(getImportEnabled());
    setPushEnabledState(getPushEnabled());
  }, []);

  function setImportEnabled(v: boolean) {
    setImportEnabledState(v);
    persistImportEnabled(v);
  }

  function setPushEnabled(v: boolean) {
    setPushEnabledState(v);
    persistPushEnabled(v);
  }

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      const user = data.user;
      if (!user) {
        navigate({ to: "/login", replace: true });
        return;
      }
      setUserId(user.id);
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData.session?.access_token;
        const headers = {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${token}`,
        };
        const baseSel = "external_calendar_url,external_calendar_last_synced_at";
        const fullSel = `${baseSel},external_calendar_sync_error,google_calendar_connected,calendar_last_synced`;
        let rows: unknown = null;
        let res = await fetch(
          `${SUPABASE_URL}/rest/v1/instructors?id=eq.${user.id}&select=${fullSel}`,
          { headers },
        );
        if (!res.ok) {
          // Column may not exist yet — retry without sync_error.
          res = await fetch(
            `${SUPABASE_URL}/rest/v1/instructors?id=eq.${user.id}&select=${baseSel},google_calendar_connected,calendar_last_synced`,
            { headers },
          );
        }
        if (res.ok) {
          rows = await res.json();
          const row = Array.isArray(rows) ? rows[0] as {
            external_calendar_url?: string | null;
            external_calendar_last_synced_at?: string | null;
            external_calendar_sync_error?: string | null;
            google_calendar_connected?: boolean | null;
            calendar_last_synced?: string | null;
          } : null;
          if (row?.external_calendar_url) {
            setExternalCalendarUrl(row.external_calendar_url);
            setSavedUrl(row.external_calendar_url);
          }
          if (row?.external_calendar_last_synced_at) {
            setIcsLastSynced(row.external_calendar_last_synced_at);
          }
          if (row?.external_calendar_sync_error) {
            setIcsSyncError(row.external_calendar_sync_error);
          }
          setGoogleConnected(row?.google_calendar_connected ?? false);
          setLastSynced(row?.calendar_last_synced ?? null);
        }
      } catch {
        // ignore — first-time or column may not exist
      }
    })();
  }, [navigate]);

  // Google Calendar connection state (google_calendar_connections is the
  // source of truth; instructors.google_calendar_connected is a mirror)
  // + OAuth return handling.
  useEffect(() => {
    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id;
      if (!uid) return;
      try {
        const { data: row } = await supabase
          .from("google_calendar_connections")
          .select("connected_at, last_synced_at")
          .eq("instructor_id", uid)
          .maybeSingle();
        const conn = (row as GoogleConnection | null) ?? null;
        if (conn) {
          setGoogleConnected(true);
          if (conn.last_synced_at) setLastSynced(conn.last_synced_at);
        }
      } catch {
        // table may not exist yet — fall back to the instructors mirror
      }
    })();

    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const isConnected =
      params.get("calendar") === "connected" || params.get("connected") === "google";
    const isError = params.get("calendar") === "error" || params.get("error") !== null;

    if (isConnected) {
      toast.success("Google Calendar connected! 🎉");
      setGoogleConnected(true);
      window.history.replaceState({}, "", window.location.pathname);
      // Auto-sync after a short delay to let state settle
      setTimeout(() => {
        void sync();
      }, 1500);
    } else if (isError) {
      toast.error("Could not connect Google Calendar — please try again");
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  async function connectGoogleCalendar() {
    setConnecting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Please sign in again to connect Google Calendar");
        setConnecting(false);
        return;
      }

      const res = await fetch(`${SUPABASE_URL}/functions/v1/google-calendar-auth`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
          apikey: SUPABASE_ANON_KEY,
        },
      });
      const raw = await res.text();
      let data: any = {};
      try { data = JSON.parse(raw); } catch { /* non-JSON body */ }
      console.log("[calendar-sync] google-calendar-auth", res.status, raw.slice(0, 300));

      if (!res.ok || !data?.url) {
        toast.error(data?.message ?? data?.error ?? `Could not start Google sign-in (${res.status})`);
        setConnecting(false);
        return;
      }

      // Google blocks its consent screen inside iframes (the Lovable preview
      // runs in one), which makes the flow flash open and vanish. Break out of
      // the frame — or fall back to a new tab if that is not allowed.
      const inIframe = window.self !== window.top;
      if (inIframe) {
        try {
          window.top!.location.href = data.url;
        } catch {
          const w = window.open(data.url, "_blank", "noopener,noreferrer");
          if (!w) toast.error("Please allow pop-ups to connect Google Calendar");
        }
        setConnecting(false);
        return;
      }
      window.location.href = data.url;
    } catch (err) {
      console.error("[calendar-sync] connect failed", err);
      toast.error("Could not start Google Calendar connection");
      setConnecting(false);
    }
  }

  /** One sync entry point — routes to Google OAuth sync or the ICS sync. */
  async function sync() {
    if (!importEnabled) {
      toast.error("Importing Google events is turned off");
      return;
    }
    setSyncing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Please sign in");
        return;
      }

      const endpoint = googleConnected ? "sync-google-calendar" : "sync-external-calendar";
      console.log("[calendar-sync] endpoint:", endpoint, "googleConnected:", googleConnected);

      const res = await fetch(`${SUPABASE_URL}/functions/v1/${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ instructorId: userId }),
      });
      const data = await res.json().catch(() => ({}));
      if (data.success || data.eventsImported !== undefined) {
        toast.success(`Synced ${data.eventsImported ?? 0} events`);
        setLastSynced(new Date().toISOString());
        // After every Google sync: copy each event's Google colour onto the
        // imported rows. Silent, and never allowed to break a normal sync.
        if (googleConnected && userId) {
          void (async () => {
            try {
              const result = await backfillGoogleColours({
                data: { accessToken: session.access_token, daysBack: 90, daysForward: 180 },
              });
              if (result.success) {
                console.log("[calendar-sync] colour pass", result);
              } else {
                console.warn("[calendar-sync] colour backfill failed", result.error);
              }
            } catch (err) {
              console.warn("[calendar-sync] colour backfill error", err);
            }
          })();
        }
      } else {
        toast.error(data.message ?? data.error ?? "Sync failed");
      }
    } catch {
      toast.error("Sync failed");
    } finally {
      setSyncing(false);
    }
  }

  /** One disconnect entry point — clears both stores. */
  async function disconnect() {
    if (!userId) return;
    try {
      await supabase.from("google_calendar_connections").delete().eq("instructor_id", userId);
      await supabase
        .from("instructors")
        .update({
          google_calendar_connected: false,
          google_access_token: null,
          google_refresh_token: null,
          google_calendar_id: null,
          google_token_expiry: null,
        })
        .eq("id", userId);
      setGoogleConnected(false);
      setLastSynced(null);
      toast.success("Google Calendar disconnected");
    } catch {
      toast.error("Could not disconnect Google Calendar");
    }
  }



  async function runSync(urlToUse: string) {
    if (!userId) return;
    const trimmed = urlToUse.trim();
    if (!trimmed) {
      toast.error("Paste your Google Calendar ICS URL first");
      return;
    }
    let parsed: URL | null = null;
    try { parsed = new URL(trimmed); } catch { /* noop */ }
    if (!parsed || (parsed.protocol !== "https:" && parsed.protocol !== "http:" && parsed.protocol !== "webcal:")) {
      toast.error("That doesn't look like a valid ICS URL (must start with https://)");
      return;
    }
    urlToUse = trimmed;
    setIcsSyncing(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;

      if (urlToUse !== savedUrl) {
        const patchRes = await fetch(
          `${SUPABASE_URL}/rest/v1/instructors?id=eq.${userId}`,
          {
            method: "PATCH",
            headers: {
              apikey: SUPABASE_ANON_KEY,
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ external_calendar_url: urlToUse }),
          },
        );
        if (!patchRes.ok) {
          throw new Error("Could not save URL");
        }
        setSavedUrl(urlToUse);
      }

      const syncRes = await fetch(
        `${SUPABASE_URL}/functions/v1/sync-external-calendar`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: SUPABASE_ANON_KEY,
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ instructorId: userId }),
        },
      );
      const syncData = await syncRes.json().catch(() => ({}));
      console.log("[calendar-sync] sync response:", syncData);
      const rawErr = String(syncData.error || syncData.message || "");
      if (syncData.success) {
        const count = syncData.eventsImported || 0;
        toast.success(
          count > 0
            ? `Calendar synced — ${count} event${count !== 1 ? "s" : ""} imported`
            : "Calendar synced — no upcoming events found",
        );
        setIcsLastSynced(new Date().toISOString());
      } else if (syncRes.status === 429 || rawErr.includes("429")) {
        toast.error("Your calendar provider is rate-limiting us. Please wait a few minutes and sync again.");
      } else {
        toast.error(syncData.message || syncData.error || "Sync failed — check your URL and try again");
      }

    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Sync failed");
    } finally {
      setIcsSyncing(false);
    }
  }

  async function removeCalendar() {
    if (!userId) return;
    setRemoving(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      await fetch(`${SUPABASE_URL}/rest/v1/instructors?id=eq.${userId}`, {
        method: "PATCH",
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ external_calendar_url: null, external_calendar_last_synced_at: null }),
      });
      await fetch(`${SUPABASE_URL}/rest/v1/calendar_blocks?instructor_id=eq.${userId}`, {
        method: "DELETE",
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${token}`,
        },
      });
      setExternalCalendarUrl("");
      setSavedUrl("");
      setLastSynced(null);
      toast.success("External calendar removed");
    } catch {
      toast.error("Could not remove calendar");
    } finally {
      setRemoving(false);
    }
  }

  const icsUrl = userId
    ? `https://bjpqxfrihwjcqprmoqfs.supabase.co/functions/v1/ics-feed?instructor_id=${userId}`
    : "https://bjpqxfrihwjcqprmoqfs.supabase.co/functions/v1/ics-feed?instructor_id=…";

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(icsUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
      const ta = document.createElement("textarea");
      ta.value = icsUrl;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  async function shareLink() {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "My DSM Calendar Feed",
          text: "Sync your lessons to any calendar app using this ICS feed.",
          url: icsUrl,
        });
      } catch {
        // user cancelled
      }
    } else {
      copyLink();
    }
  }

  return (
    <DSMTopSheet title="Calendar Sync" onBack={() => navigate({ to: "/settings" as never })}>
    <div style={{ ...POPPINS, minHeight: "100%" }}>

      <div className="px-4 pb-12">
        {/* IconInfoCircle card */}
        <div
          className="mx-0 mt-3"
          style={{
            backgroundColor: "#E7F1FC",
            borderRadius: 8,
            padding: "14px 16px",
            display: "flex",
            flexDirection: "row",
            gap: 10,
          }}
        >
          <IconInfoCircle size={16} color="#1877D6" style={{ flexShrink: 0, marginTop: 1 }} />
          <p style={{ ...POPPINS, color: "#0B1F3A", fontSize: 13, fontWeight: 500, lineHeight: 1.5 }}>
            Sync your lessons to any calendar app using an ICS feed. Works with Google Calendar, Apple Calendar, and Outlook.
          </p>
        </div>

        {/* Google Calendar — single connection card */}
        <div style={{ marginTop: 24 }}>
          <div
            style={{
              ...POPPINS,
              color: "#9CA3AF",
              fontSize: 11,
              fontWeight: 600,
              textTransform: "uppercase",
              marginBottom: 12,
            }}
          >
            GOOGLE CALENDAR
          </div>
        </div>

        <div
          style={{
            background: "#fff",
            borderRadius: 8,
            border: "1px solid #E4E8EF",
            overflow: "hidden",
            marginBottom: 16,
          }}
        >
          {googleConnected ? (
            <>
              <div
                style={{
                  padding: "14px 16px",
                  display: "flex",
                  gap: 12,
                  alignItems: "center",
                }}
              >
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 999,
                    background: "#DCFCE7",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <IconCalendar size={20} color="#15803D" stroke={1.5} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ ...POPPINS, color: "#0B1F3A", fontSize: 14, fontWeight: 600 }}>
                    Google Calendar
                  </div>
                  <div style={{ ...POPPINS, color: "#9CA3AF", fontSize: 11, marginTop: 2 }}>
                    Last synced: {lastSynced ? timeAgo(lastSynced) : "Never synced"}
                  </div>
                </div>
                <div
                  style={{
                    background: "#DCFCE7",
                    color: "#15803D",
                    fontSize: 11,
                    fontWeight: 700,
                    borderRadius: 999,
                    padding: "4px 10px",
                  }}
                >
                  Connected
                </div>
              </div>
              <div style={{ height: 1, background: "#E4E8EF" }} />

              {/* Import direction */}
              <div
                style={{
                  padding: "13px 16px",
                  display: "flex",
                  gap: 12,
                  alignItems: "center",
                  borderBottom: "1px solid #E4E8EF",
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ ...POPPINS, color: "#0B1F3A", fontSize: 14, fontWeight: 500 }}>
                    Import Google events into DSM
                  </div>
                  <div style={{ ...POPPINS, color: "#9CA3AF", fontSize: 11, marginTop: 2 }}>
                    Google events appear on your schedule
                  </div>
                </div>
                <DSMToggle checked={importEnabled} onChange={setImportEnabled} />
              </div>

              {/* Push direction */}
              <div
                style={{
                  padding: "13px 16px",
                  display: "flex",
                  gap: 12,
                  alignItems: "center",
                  borderBottom: "1px solid #E4E8EF",
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ ...POPPINS, color: "#0B1F3A", fontSize: 14, fontWeight: 500 }}>
                    Push DSM lessons to Google
                  </div>
                  <div style={{ ...POPPINS, color: "#9CA3AF", fontSize: 11, marginTop: 2 }}>
                    Lessons appear in your Google Calendar
                  </div>
                </div>
                <DSMToggle checked={pushEnabled} onChange={setPushEnabled} />
              </div>

              <div
                onClick={sync}
                role="button"
                tabIndex={0}
                style={{
                  padding: "13px 16px",
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  cursor: "pointer",
                  borderBottom: "1px solid #E4E8EF",
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") sync();
                }}
              >
                <IconRefresh
                  size={16}
                  color="#1877D6"
                  stroke={1.5}
                  className={syncing ? "animate-spin" : undefined}
                />
                <div style={{ ...POPPINS, color: "#0B1F3A", fontSize: 14, fontWeight: 500, flex: 1 }}>
                  Sync now
                </div>
                {syncing && (
                  <div style={{ ...POPPINS, color: "#9CA3AF", fontSize: 11 }}>Syncing...</div>
                )}
              </div>

              <div
                onClick={disconnect}
                role="button"
                tabIndex={0}
                style={{
                  padding: "13px 16px",
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  cursor: "pointer",
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") disconnect();
                }}
              >
                <IconX size={16} color="#CC2229" stroke={1.5} />
                <div style={{ ...POPPINS, color: "#CC2229", fontSize: 14, fontWeight: 500 }}>
                  Disconnect Google Calendar
                </div>
              </div>
            </>
          ) : (
            <div
              onClick={connectGoogleCalendar}
              role="button"
              tabIndex={0}
              style={{
                padding: "14px 16px",
                display: "flex",
                gap: 12,
                alignItems: "center",
                cursor: "pointer",
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") connectGoogleCalendar();
              }}
            >
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 999,
                  background: "#EFF6FF",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <IconCalendar size={20} color="#1877D6" stroke={1.5} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ ...POPPINS, color: "#0B1F3A", fontSize: 14, fontWeight: 600 }}>
                  Connect Google Calendar
                </div>
                <div style={{ ...POPPINS, color: "#9CA3AF", fontSize: 11, marginTop: 2 }}>
                  Import events and push lessons automatically
                </div>
              </div>
              {connecting ? (
                <div style={{ ...POPPINS, color: "#1877D6", fontSize: 12 }}>Connecting...</div>
              ) : (
                <IconChevronRight size={16} color="#C7D0DC" stroke={2} />
              )}
            </div>
          )}
        </div>

        {/* Advanced — ICS fallback (collapsed) */}
        <button
          type="button"
          onClick={() => setShowICS(!showICS)}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            fontSize: 12,
            color: "#9CA3AF",
            padding: "8px 0",
            display: "flex",
            alignItems: "center",
            gap: 6,
            fontFamily: "Poppins, sans-serif",
          }}
        >
          <IconChevronDown
            size={12}
            color="#9CA3AF"
            style={{ transform: showICS ? "rotate(180deg)" : "none" }}
          />
          Use a custom ICS link instead
        </button>

        {showICS && (
        <div
          style={{
            background: "#fff",
            borderRadius: 8,
            border: "1px solid #E4E8EF",
            overflow: "hidden",
            marginBottom: 16,
            marginTop: 8,
            padding: "14px 16px",
          }}
        >
          <div style={{ ...POPPINS, color: "#0B1F3A", fontSize: 14, fontWeight: 600, marginBottom: 4 }}>
            Or use a custom ICS URL
          </div>
          <p style={{ ...POPPINS, color: "#9CA3AF", fontSize: 12, lineHeight: 1.5, marginBottom: 12 }}>
            Works with Outlook, Apple Calendar, and other apps that share an ICS feed.
          </p>
          <div style={{ marginBottom: 12 }}>
            <input
              ref={inputRef}
              type="url"
              value={externalCalendarUrl}
              onChange={(e) => setExternalCalendarUrl(e.target.value)}
              placeholder="https://calendar.google.com/calendar/ical/..."
              className="w-full"
              style={FIELD_INPUT}
            />
          </div>
          {icsSyncError ? (
            <div
              style={{
                marginBottom: 12,
                background: "#FEF2F2",
                borderRadius: 8,
                padding: "12px 14px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <IconAlertCircle size={14} color="#FF3B30" />
                <span className="text-xs" style={{ ...POPPINS, color: "#FF3B30", fontWeight: 600 }}>
                  Sync error: {icsSyncError}
                </span>
              </div>
              <div className="text-xs" style={{ ...POPPINS, color: "#8A8A8E", marginTop: 4 }}>
                This usually means your ICS URL has expired. Get a new one from your calendar app.
              </div>
              <button
                type="button"
                onClick={() => {
                  inputRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
                  inputRef.current?.focus();
                }}
                className="text-xs font-semibold"
                style={{ ...POPPINS, color: "#1877D6", marginTop: 6 }}
              >
                Update URL →
              </button>
            </div>
          ) : icsLastSynced ? (
            <div style={{ ...POPPINS, color: "#9CA3AF", fontSize: 12, marginTop: 8, marginBottom: 12 }}>
              Last synced: {timeAgo(icsLastSynced)}
            </div>
          ) : null}

          <button
            type="button"
            onClick={() => runSync(externalCalendarUrl)}
            disabled={icsSyncing || !externalCalendarUrl.trim()}
            style={{
              ...BTN_PRIMARY,
              opacity: icsSyncing || !externalCalendarUrl.trim() ? 0.6 : 1,
            }}
          >
            {icsSyncing ? (
              <>
                <IconLoader2 size={16} className="animate-spin" /> Syncing...
              </>
            ) : (
              <>Save and sync ICS URL →</>
            )}
          </button>

          {savedUrl && (
            <div style={{ marginTop: 12, textAlign: "center" }}>
              <button
                type="button"
                onClick={removeCalendar}
                disabled={removing}
                style={{ ...POPPINS, color: "#FF3B30", fontSize: 13, fontWeight: 700 }}
              >
                {removing ? "Removing..." : "Remove calendar"}
              </button>
            </div>
          )}
        </div>
        )}


        {/* ICS Feed URL */}

        <SectionLabel>Your ICS feed URL</SectionLabel>
        <div style={SECTION_CARD}>
          <input
            readOnly
            value={icsUrl}
            className="w-full"
            style={FIELD_INPUT}
            onFocus={(e) => e.target.select()}
          />
          <button type="button" onClick={copyLink} style={{ ...BTN_PRIMARY, marginTop: 12 }}>
            {copied ? (
              <>
                <IconCheck size={16} /> Copied!
              </>
            ) : (
              <>
                <IconCopy size={16} /> Copy link
              </>
            )}
          </button>
          <button type="button" onClick={shareLink} style={{ ...BTN_OUTLINE, marginTop: 12 }}>
            Share link
          </button>
        </div>


        {/* How calendar sync works */}
        <div
          style={{
            backgroundColor: "#F0F4FF",
            borderWidth: "0.5px",
            borderStyle: "solid",
            borderColor: "#BFDBFE",
            borderRadius: 8,
            padding: 16,
            marginLeft: 16,
            marginRight: 16,
            marginTop: 12,
          }}
        >
          <div className="flex items-start gap-3">
            <IconInfoCircle size={16} color="#1A52A0" className="shrink-0 mt-0.5" />
            <div>
              <div
                className="text-[14px] font-semibold"
                style={{ ...POPPINS, color: "#0F2044", marginBottom: 8 }}
              >
                How calendar sync works
              </div>
              <ul
                className="text-xs"
                style={{ ...POPPINS, color: "#6B7280", lineHeight: 1.6 }}
              >
                <li>✓ Your Google Calendar events sync into DSM every 2 hours</li>
                <li>✓ DSM lessons appear in Google Calendar within 24 hours</li>
                <li>✓ DSM is always up to date — use it as your primary schedule</li>
                <li>○ Google Calendar is a read-only view — manage lessons in DSM</li>
              </ul>
            </div>
          </div>
        </div>

        {/* IconInfoCircle banner */}
        <div
          className="mt-3 flex items-start gap-3"
          style={{
            backgroundColor: "#EEF2F7",
            borderWidth: "1px",
            borderStyle: "solid",
            borderColor: "#1877D6",
            borderRadius: 8,
            padding: 12,
          }}
        >
          <IconAlertTriangle size={20} color="#1877D6" className="shrink-0 mt-0.5" />
          <p className="text-[13px] text-[#0B1F3A] leading-[1.5]" style={POPPINS}>
            This is a one-way read feed. Your DSM lessons appear in your calendar app, but changes made in your calendar app will not sync back to DSM. Always manage your lessons in DSM.
          </p>
        </div>

        <SectionHeader>HOW TO ADD TO YOUR CALENDAR</SectionHeader>
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem
            value="google"
            className="border-0"
            style={{
              backgroundColor: "#F8F9FB",
              borderRadius: 8,
              marginBottom: 12,
              borderWidth: "0.5px",
              borderStyle: "solid",
              borderColor: "#EEF2F7",
            }}
          >
            <AccordionTrigger className="px-4 py-3 text-[14px] font-semibold text-[#0B1F3A]" style={{ ...POPPINS, borderRadius: 8}}>
              <span className="flex items-center gap-3">
                <IconCalendar size={20} color="#1877D6" />
                Google Calendar
              </span>
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4">
              <ol className="flex flex-col gap-3 list-none">
                <li className="flex items-start gap-3">
                  <div
                    className="flex items-center justify-center shrink-0 rounded-full text-[12px] font-semibold text-white"
                    style={{ width: 28, height: 28, backgroundColor: "#1877D6", ...POPPINS }}
                  >
                    1
                  </div>
                  <p className="text-[14px] text-[#0B1F3A] leading-[1.4] pt-0.5" style={POPPINS}>
                    Open Google Calendar on a computer (not phone)
                  </p>
                </li>
                <li className="flex items-start gap-3">
                  <div
                    className="flex items-center justify-center shrink-0 rounded-full text-[12px] font-semibold text-white"
                    style={{ width: 28, height: 28, backgroundColor: "#1877D6", ...POPPINS }}
                  >
                    2
                  </div>
                  <p className="text-[14px] text-[#0B1F3A] leading-[1.4] pt-0.5" style={POPPINS}>
                    Click + next to "Other calendars" on the left sidebar
                  </p>
                </li>
                <li className="flex items-start gap-3">
                  <div
                    className="flex items-center justify-center shrink-0 rounded-full text-[12px] font-semibold text-white"
                    style={{ width: 28, height: 28, backgroundColor: "#1877D6", ...POPPINS }}
                  >
                    3
                  </div>
                  <p className="text-[14px] text-[#0B1F3A] leading-[1.4] pt-0.5" style={POPPINS}>
                    Click "From URL"
                  </p>
                </li>
                <li className="flex items-start gap-3">
                  <div
                    className="flex items-center justify-center shrink-0 rounded-full text-[12px] font-semibold text-white"
                    style={{ width: 28, height: 28, backgroundColor: "#1877D6", ...POPPINS }}
                  >
                    4
                  </div>
                  <p className="text-[14px] text-[#0B1F3A] leading-[1.4] pt-0.5" style={POPPINS}>
                    Paste your ICS feed URL above
                  </p>
                </li>
                <li className="flex items-start gap-3">
                  <div
                    className="flex items-center justify-center shrink-0 rounded-full text-[12px] font-semibold text-white"
                    style={{ width: 28, height: 28, backgroundColor: "#1877D6", ...POPPINS }}
                  >
                    5
                  </div>
                  <p className="text-[14px] text-[#0B1F3A] leading-[1.4] pt-0.5" style={POPPINS}>
                    Click "Add calendar"
                  </p>
                </li>
              </ol>
              <p className="mt-3 text-[12px] text-[#6B7280] italic" style={POPPINS}>
                Note: Updates every few hours automatically
              </p>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem
            value="apple"
            className="border-0"
            style={{
              backgroundColor: "#F8F9FB",
              borderRadius: 8,
              marginBottom: 12,
              borderWidth: "0.5px",
              borderStyle: "solid",
              borderColor: "#EEF2F7",
            }}
          >
            <AccordionTrigger className="px-4 py-3 text-[14px] font-semibold text-[#0B1F3A]" style={{ ...POPPINS, borderRadius: 8}}>
              <span className="flex items-center gap-3">
                <IconCalendar size={20} color="#1877D6" />
                Apple Calendar
              </span>
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4">
              <ol className="flex flex-col gap-3 list-none">
                <li className="flex items-start gap-3">
                  <div
                    className="flex items-center justify-center shrink-0 rounded-full text-[12px] font-semibold text-white"
                    style={{ width: 28, height: 28, backgroundColor: "#1877D6", ...POPPINS }}
                  >
                    1
                  </div>
                  <p className="text-[14px] text-[#0B1F3A] leading-[1.4] pt-0.5" style={POPPINS}>
                    Open the Calendar app on Mac or iPhone
                  </p>
                </li>
                <li className="flex items-start gap-3">
                  <div
                    className="flex items-center justify-center shrink-0 rounded-full text-[12px] font-semibold text-white"
                    style={{ width: 28, height: 28, backgroundColor: "#1877D6", ...POPPINS }}
                  >
                    2
                  </div>
                  <p className="text-[14px] text-[#0B1F3A] leading-[1.4] pt-0.5" style={POPPINS}>
                    Click File → New Calendar Subscription (Mac) or tap Calendars → Add Calendar → Add Subscription Calendar (iPhone)
                  </p>
                </li>
                <li className="flex items-start gap-3">
                  <div
                    className="flex items-center justify-center shrink-0 rounded-full text-[12px] font-semibold text-white"
                    style={{ width: 28, height: 28, backgroundColor: "#1877D6", ...POPPINS }}
                  >
                    3
                  </div>
                  <p className="text-[14px] text-[#0B1F3A] leading-[1.4] pt-0.5" style={POPPINS}>
                    Paste your ICS feed URL
                  </p>
                </li>
                <li className="flex items-start gap-3">
                  <div
                    className="flex items-center justify-center shrink-0 rounded-full text-[12px] font-semibold text-white"
                    style={{ width: 28, height: 28, backgroundColor: "#1877D6", ...POPPINS }}
                  >
                    4
                  </div>
                  <p className="text-[14px] text-[#0B1F3A] leading-[1.4] pt-0.5" style={POPPINS}>
                    Click Subscribe
                  </p>
                </li>
              </ol>
              <p className="mt-3 text-[12px] text-[#6B7280] italic" style={POPPINS}>
                Note: Updates every few hours automatically
              </p>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem
            value="outlook"
            className="border-0"
            style={{
              backgroundColor: "#F8F9FB",
              borderRadius: 8,
              marginBottom: 12,
              borderWidth: "0.5px",
              borderStyle: "solid",
              borderColor: "#EEF2F7",
            }}
          >
            <AccordionTrigger className="px-4 py-3 text-[14px] font-semibold text-[#0B1F3A]" style={{ ...POPPINS, borderRadius: 8}}>
              <span className="flex items-center gap-3">
                <IconCalendar size={20} color="#1877D6" />
                Outlook
              </span>
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4">
              <ol className="flex flex-col gap-3 list-none">
                <li className="flex items-start gap-3">
                  <div
                    className="flex items-center justify-center shrink-0 rounded-full text-[12px] font-semibold text-white"
                    style={{ width: 28, height: 28, backgroundColor: "#1877D6", ...POPPINS }}
                  >
                    1
                  </div>
                  <p className="text-[14px] text-[#0B1F3A] leading-[1.4] pt-0.5" style={POPPINS}>
                    Go to outlook.com and open Calendar
                  </p>
                </li>
                <li className="flex items-start gap-3">
                  <div
                    className="flex items-center justify-center shrink-0 rounded-full text-[12px] font-semibold text-white"
                    style={{ width: 28, height: 28, backgroundColor: "#1877D6", ...POPPINS }}
                  >
                    2
                  </div>
                  <p className="text-[14px] text-[#0B1F3A] leading-[1.4] pt-0.5" style={POPPINS}>
                    Click Add calendar → Subscribe from web
                  </p>
                </li>
                <li className="flex items-start gap-3">
                  <div
                    className="flex items-center justify-center shrink-0 rounded-full text-[12px] font-semibold text-white"
                    style={{ width: 28, height: 28, backgroundColor: "#1877D6", ...POPPINS }}
                  >
                    3
                  </div>
                  <p className="text-[14px] text-[#0B1F3A] leading-[1.4] pt-0.5" style={POPPINS}>
                    Paste your ICS feed URL
                  </p>
                </li>
                <li className="flex items-start gap-3">
                  <div
                    className="flex items-center justify-center shrink-0 rounded-full text-[12px] font-semibold text-white"
                    style={{ width: 28, height: 28, backgroundColor: "#1877D6", ...POPPINS }}
                  >
                    4
                  </div>
                  <p className="text-[14px] text-[#0B1F3A] leading-[1.4] pt-0.5" style={POPPINS}>
                    Click Import
                  </p>
                </li>
              </ol>
              <p className="mt-3 text-[12px] text-[#6B7280] italic" style={POPPINS}>
                Note: Updates every few hours automatically
              </p>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    </div>
    </DSMTopSheet>
  );
}
