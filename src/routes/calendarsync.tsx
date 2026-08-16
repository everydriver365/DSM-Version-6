import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { IconAlertCircle, IconAlertTriangle, IconCalendar, IconCalendarPlus, IconCheck, IconChevronRight, IconCopy, IconInfoCircle, IconLoader2, IconRefresh, IconX } from "@tabler/icons-react";
import { toast } from "sonner";
import InstructorTopBar from "@/components/dsm/InstructorTopBar";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { SectionHeader } from "../components/dsm/SectionHeader";
import { supabase } from "../lib/supabaseClient";
import { PageLayout } from "@/components/PageLayout";

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
      { title: "IconCalendar sync — DSM by EveryDriver" },
      { name: "description", content: "Sync your lessons to any calendar app using an ICS feed." },
    ],
  }),
  component: CalendarSyncPage,
});

const POPPINS = { fontFamily: "Poppins, sans-serif" } as const;

const SECTION_CARD: React.CSSProperties = {
  background: "#fff",
  borderRadius: 20,
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
  borderRadius: 12,
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
  borderRadius: 14,
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
      <span style={{ width: 3, height: 14, background: "#1877D6", borderRadius: 2, flexShrink: 0 }} />
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
  const [outboundConn, setOutboundConn] = useState<GoogleConnection | null>(null);
  const [outboundConnecting, setOutboundConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [googleConnected, setGoogleConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [lastSynced, setLastSynced] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);

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

  // Google IconCalendar (outbound) connection state + OAuth return handling
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
        setOutboundConn((row as GoogleConnection | null) ?? null);
      } catch {
        // table may not exist yet
      }
    })();

    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const calendarStatus = params.get("calendar");
    const connected = params.get("connected");
    const err = params.get("error");
    if (calendarStatus === "connected") {
      toast.success("Google Calendar connected! 🎉");
      setGoogleConnected(true);
    } else if (calendarStatus === "error") {
      toast.error("Could not connect Google Calendar — please try again");
    }
    if (connected === "google") {
      toast.success("Google IconCalendar connected");
    } else if (err === "google_denied") {
      toast.error("Google IconCalendar access was denied");
    } else if (err === "token_failed") {
      toast.error("Could not complete Google IconCalendar connection");
    }
    if (calendarStatus || connected || err) {
      params.delete("calendar");
      params.delete("connected");
      params.delete("error");
      const qs = params.toString();
      window.history.replaceState({}, "", window.location.pathname + (qs ? `?${qs}` : ""));
    }
  }, []);

  async function connectGoogle() {
    setOutboundConnecting(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      const { data, error } = await supabase.functions.invoke("google-calendar-auth", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (error) throw error;
      const url = (data as { url?: string } | null)?.url;
      if (url) {
        window.open(url, "_system");
        return;
      }
      toast.error("Could not start Google sign-in");
    } catch {
      toast.error("Could not connect to Google IconCalendar");
    } finally {
      setOutboundConnecting(false);
    }
  }


  async function disconnectGoogle() {
    if (!userId) return;
    setDisconnecting(true);
    try {
      const today = new Date().toISOString().split("T")[0];
      await supabase.from("google_calendar_connections").delete().eq("instructor_id", userId);
      await supabase
        .from("lessons")
        .update({ google_event_id: null })
        .eq("instructor_id", userId)
        .gte("lesson_date", today);
      setOutboundConn(null);
      toast.success("Google IconCalendar disconnected");
    } catch {
      toast.error("Could not disconnect Google IconCalendar");
    } finally {
      setDisconnecting(false);
    }
  }

  async function connectGoogleCalendar() {
    setConnecting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch("https://bjpqxfrihwjcqprmoqfs.supabase.co/functions/v1/google-calendar-auth", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
          apikey: SUPABASE_ANON_KEY,
        },
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch {
      toast.error("Could not start Google Calendar connection");
      setConnecting(false);
    }
  }

  async function syncNow() {
    setSyncing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();

      const res = await fetch("https://bjpqxfrihwjcqprmoqfs.supabase.co/functions/v1/sync-google-calendar", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
          apikey: SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ instructorId: userId }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Synced ${data.eventsImported} events from Google Calendar`);
        setLastSynced(new Date().toISOString());
      } else {
        toast.error(data.message ?? "Sync failed");
      }
    } catch {
      toast.error("Sync failed");
    } finally {
      setSyncing(false);
    }
  }

  async function disconnect() {
    if (!userId) return;
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
    toast.success("Google Calendar disconnected");
  }



  async function runSync(urlToUse: string) {
    if (!userId) return;
    const trimmed = urlToUse.trim();
    if (!trimmed) {
      toast.error("Paste your Google IconCalendar ICS URL first");
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
          title: "My DSM IconCalendar Feed",
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
    <PageLayout style={POPPINS}>
      <InstructorTopBar
        firstName=""
        pageTitle="IconCalendar sync"
        onBack={() => navigate({ to: "/settings" as never })}
        onBell={() => navigate({ to: "/notifications" as never })}
        onPhone={() => navigate({ to: "/enquiries" as never })}
        onLiveTrack={() => navigate({ to: "/live" as never })}
        onMenu={() => navigate({ to: "/more" as never })}
        onMicPress={() => toast.info("Voice commands coming soon!")}
      />
      <div style={{ height: "calc(60px + env(safe-area-inset-top, 0px))" }} />

      <div className="px-4 pb-12">
        {/* IconInfoCircle card */}
        <div
          className="mx-0 mt-3"
          style={{
            backgroundColor: "#E7F1FC",
            borderRadius: 16,
            padding: "14px 16px",
            display: "flex",
            flexDirection: "row",
            gap: 10,
          }}
        >
          <IconInfoCircle size={16} color="#1877D6" style={{ flexShrink: 0, marginTop: 1 }} />
          <p style={{ ...POPPINS, color: "#0B1F3A", fontSize: 13, fontWeight: 500, lineHeight: 1.5 }}>
            Sync your lessons to any calendar app using an ICS feed. Works with Google IconCalendar, Apple IconCalendar, and Outlook.
          </p>
        </div>

        {/* Section 1 — Google Calendar OAuth */}
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
            borderRadius: 16,
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
                    Google Calendar connected
                  </div>
                  <div style={{ ...POPPINS, color: "#9CA3AF", fontSize: 11, marginTop: 2 }}>
                    Last synced: {lastSynced ? timeAgo(lastSynced) : "Never synced"}
                  </div>
                </div>
                <div
                  style={{
                    background: "#DCFCE7",
                    color: "#15803D",
                    fontSize: 10,
                    fontWeight: 700,
                    borderRadius: 20,
                    padding: "2px 8px",
                  }}
                >
                  Connected
                </div>
              </div>
              <div style={{ height: 1, background: "#E4E8EF" }} />
              <div
                onClick={syncNow}
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
                  if (e.key === "Enter" || e.key === " ") syncNow();
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
              <div style={{ height: 1, background: "#E4E8EF" }} />
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
                  Sync your Google Calendar events automatically
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

        {/* Secondary ICS option */}
        <div
          style={{
            background: "#fff",
            borderRadius: 16,
            border: "1px solid #E4E8EF",
            overflow: "hidden",
            marginBottom: 16,
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
                borderRadius: 12,
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

        {/* Section 2 — DSM lessons → Google */}
        <SectionLabel>DSM lessons → Google</SectionLabel>
        <div style={SECTION_CARD}>
          <p style={DESC}>
            Connect your Google account so lessons you book in DSM appear in your Google IconCalendar straight away.
          </p>

          {outboundConn ? (
            <>
              <div
                style={{
                  background: "#E6F7EC",
                  borderRadius: 14,
                  padding: "14px 16px",
                  display: "flex",
                  flexDirection: "row",
                  gap: 10,
                }}
              >
                <span style={STATUS_DOT}>
                  <IconCheck size={12} color="#FFFFFF" stroke={3} />
                </span>
                <div>
                  <div style={{ ...POPPINS, color: "#0F6B3D", fontSize: 14.5, fontWeight: 800 }}>
                    Connected to Google IconCalendar
                  </div>
                  <div style={{ ...POPPINS, color: "#3D8A63", fontSize: 11.5, lineHeight: 1.5 }}>
                    Connected on: {formatDate(outboundConn.connected_at)}
                    {" · "}
                    Last synced: {formatDate(outboundConn.last_synced_at)}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={disconnectGoogle}
                disabled={disconnecting}
                style={{
                  ...BTN_OUTLINE_RED,
                  marginTop: 16,
                  opacity: disconnecting ? 0.6 : 1,
                }}
              >
                {disconnecting ? "Disconnecting…" : "Disconnect"}
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={connectGoogle}
              disabled={outboundConnecting}
              style={{ ...BTN_PRIMARY, opacity: outboundConnecting ? 0.6 : 1 }}
            >
              {outboundConnecting ? (
                <>
                  <IconLoader2 size={16} className="animate-spin" /> Connecting…
                </>
              ) : (
                <>
                  <IconCalendarPlus size={16} /> Connect Google IconCalendar
                </>
              )}
            </button>
          )}
        </div>

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
                <IconCopy size={16} /> IconCopy link
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
            borderRadius: 12,
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
                <li>✓ Your Google IconCalendar events sync into DSM every 2 hours</li>
                <li>✓ DSM lessons appear in Google IconCalendar within 24 hours</li>
                <li>✓ DSM is always up to date — use it as your primary schedule</li>
                <li>○ Google IconCalendar is a read-only view — manage lessons in DSM</li>
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
              borderRadius: 12,
              marginBottom: 12,
              borderWidth: "0.5px",
              borderStyle: "solid",
              borderColor: "#EEF2F7",
            }}
          >
            <AccordionTrigger className="px-4 py-3 text-[14px] font-semibold text-[#0B1F3A]" style={{ ...POPPINS, borderRadius: 12 }}>
              <span className="flex items-center gap-3">
                <IconCalendar size={20} color="#1877D6" />
                Google IconCalendar
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
                    Open Google IconCalendar on a computer (not phone)
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
              borderRadius: 12,
              marginBottom: 12,
              borderWidth: "0.5px",
              borderStyle: "solid",
              borderColor: "#EEF2F7",
            }}
          >
            <AccordionTrigger className="px-4 py-3 text-[14px] font-semibold text-[#0B1F3A]" style={{ ...POPPINS, borderRadius: 12 }}>
              <span className="flex items-center gap-3">
                <IconCalendar size={20} color="#1877D6" />
                Apple IconCalendar
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
                    Open the IconCalendar app on Mac or iPhone
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
                    Click File → New IconCalendar Subscription (Mac) or tap Calendars → Add IconCalendar → Add Subscription IconCalendar (iPhone)
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
              borderRadius: 12,
              marginBottom: 12,
              borderWidth: "0.5px",
              borderStyle: "solid",
              borderColor: "#EEF2F7",
            }}
          >
            <AccordionTrigger className="px-4 py-3 text-[14px] font-semibold text-[#0B1F3A]" style={{ ...POPPINS, borderRadius: 12 }}>
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
                    Go to outlook.com and open IconCalendar
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
    </PageLayout>
  );
}
