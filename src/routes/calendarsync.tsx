import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { tokens } from "@/lib/tokens";
import { useEffect, useState } from "react";
import { IconCalendar, IconCalendarPlus, IconChevronRight, IconCopy, IconInfoCircle, IconRefresh, IconX } from "@tabler/icons-react";
import { backfillGoogleColours } from "@/lib/calendarColourBackfill.functions";
import { toast } from "@/lib/toast";
import DSMTopSheet from "@/components/dsm/DSMTopSheet";
import { SAVE_BUTTON_STYLE } from "@/components/dsm/SaveFooter";
import { supabase } from "../lib/supabaseClient";

const SUPABASE_URL = "https://bjpqxfrihwjcqprmoqfs.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJqcHF4ZnJpaHdqY3Fwcm1vcWZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE0NzQ4MjEsImV4cCI6MjA5NzA1MDgyMX0.HKlgx3dxP3uxX9wMRRUnfb0IPwaBpFcut_iUgT5XFeo";

/** Google only posts change notifications to a verified domain we own. */
const WEBHOOK_URL = "https://app.everydriver.pro/api/public/google-calendar-webhook";

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

interface GoogleConnection {
  connected_at: string | null;
  last_synced_at: string | null;
}

export const Route = createFileRoute("/calendarsync")({
  head: () => ({
    meta: [
      { title: "Calendar sync — EDP by EveryDriver" },
      { name: "description", content: "Connect Google Calendar to import events and push lessons automatically." },
    ],
  }),
  component: CalendarSyncPage,
});

const POPPINS = { fontFamily: "Poppins, sans-serif" } as const;

const BTN_BASE: React.CSSProperties = {
  ...POPPINS,
  width: "100%",
  padding: 15,
  borderRadius: 8,
  fontSize: 14.5,
  fontWeight: tokens.fontWeight.extrabold,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
};

const BTN_PRIMARY: React.CSSProperties = {
  ...BTN_BASE,
  ...SAVE_BUTTON_STYLE,
};

function CalendarSyncPage() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [googleConnected, setGoogleConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [lastSynced, setLastSynced] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);

  const [syncing, setSyncing] = useState(false);
  const [icsInboundUrl, setIcsInboundUrl] = useState("");
  const [savedIcsUrl, setSavedIcsUrl] = useState("");
  const [isEditingIcs, setIsEditingIcs] = useState(false);
  const [icsFeedStatus, setIcsFeedStatus] = useState("");
  const [icsLastFetched, setIcsLastFetched] = useState("");
  // Multiple Google calendars + instant updates
  const [calendars, setCalendars] = useState<
    { id: string; summary: string; primary: boolean }[]
  >([]);
  const [selectedCalendars, setSelectedCalendars] = useState<string[]>([]);
  const [loadingCalendars, setLoadingCalendars] = useState(false);
  const [instantUpdates, setInstantUpdates] = useState(false);
  const [instantBusy, setInstantBusy] = useState(false);

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
        const res = await fetch(
          `${SUPABASE_URL}/rest/v1/instructors?id=eq.${user.id}&select=google_calendar_connected,calendar_last_synced,google_sync_error,google_sync_error_at,ics_feed_url,ics_feed_status,ics_last_fetched_at`,
          { headers },
        );
        if (res.ok) {
          const rows = await res.json();
          const row = Array.isArray(rows)
            ? (rows[0] as {
                google_calendar_connected?: boolean | null;
                calendar_last_synced?: string | null;
                google_sync_error?: string | null;
                google_sync_error_at?: string | null;
                ics_feed_url?: string | null;
                ics_feed_status?: string | null;
                ics_last_fetched_at?: string | null;
              })
            : null;
          setGoogleConnected(row?.google_calendar_connected ?? false);
          setLastSynced(row?.calendar_last_synced ?? null);
          setSyncError(row?.google_sync_error ?? null);
          setIcsInboundUrl(row?.ics_feed_url || "");
          setSavedIcsUrl(row?.ics_feed_url || "");
          setIcsFeedStatus(row?.ics_feed_status || "");
          setIcsLastFetched(row?.ics_last_fetched_at || "");
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
      params.get("connected") === "true" ||
      params.get("connected") === "google" ||
      params.get("calendar") === "connected";
    const isError = params.get("calendar") === "error" || params.get("error") !== null;

    if (!isConnected && !isError) return;

    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        if (isConnected) {
          try {
            localStorage.setItem("pending_calendar_connected", "true");
          } catch {
            // ignore
          }
          navigate({ to: "/login", replace: true });
        }
        return;
      }

      if (isConnected) {
        toast.success("Google Calendar connected! 🎉");
        setGoogleConnected(true);
      } else if (isError) {
        toast.error("Could not connect Google Calendar — please try again");
      }
      window.history.replaceState({}, "", window.location.pathname);
      if (isConnected) {
        setTimeout(() => {
          void sync();
        }, 1500);
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const { data: userData } = await supabase.auth.getUser();
        const uid = userData.user?.id;
        if (!uid) return;
        const { data } = await supabase
          .from("instructors")
          .select("ics_feed_url, ics_feed_status, ics_last_fetched_at")
          .eq("id", uid)
          .single();
        if (data) {
          setIcsInboundUrl(data.ics_feed_url || "");
          setSavedIcsUrl(data.ics_feed_url || "");
          setIcsFeedStatus(data.ics_feed_status || "");
          setIcsLastFetched(data.ics_last_fetched_at || "");
        }
      } catch {
        // ignore — table or columns may not exist yet
      }
    })();
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

  /** Sync with Google Calendar. */
  async function sync() {
    setSyncing(true);
    try {
      console.log("[calendar-sync] sync called, userId:", userId, "googleConnected:", googleConnected);
      if (!userId) {
        toast.error("Not signed in — please refresh and try again");
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Please sign in");
        return;
      }

      const res = await fetch(`${SUPABASE_URL}/functions/v1/sync-google-calendar`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ instructor_id: userId, instructorId: userId }),
      });
      const rawBody = await res.text();
      let data: any = {};
      try {
        data = rawBody ? JSON.parse(rawBody) : {};
      } catch {
        data = {};
      }
      console.log("[calendar-sync] sync response", res.status, rawBody);

      if (
        data.ok ||
        data.success ||
        data.synced !== undefined ||
        data.eventsImported !== undefined
      ) {
        toast.success(
          `Synced ${data.synced ?? data.eventsImported ?? 0} events from Google Calendar`,
        );
        setLastSynced(new Date().toISOString());
        setSyncError(null);

        if (userId) {
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
        return;
      }

      const detail = String(data.message ?? data.error ?? "");
      const googleStatus = Number(data.status ?? 0);

      if (detail.includes("calendar_blocks_external_unique") || detail.includes("duplicate key")) {
        toast.info("Calendar already up to date");
        setLastSynced(new Date().toISOString());
        setSyncError(null);
        return;
      }

      const authProblem =
        data.reconnect === true ||
        googleStatus === 401 ||
        googleStatus === 403 ||
        /invalid_grant|unauthorized|token|reconnect|no google calendar connected/i.test(detail);

      if (authProblem) {
        setGoogleConnected(false);
        setSyncError("Your Google Calendar connection has expired — please reconnect.");
        toast.error("Your Google Calendar connection has expired — please reconnect.");
        return;
      }

      const message = detail
        ? googleStatus
          ? `Sync failed: ${detail} (Google ${googleStatus})`
          : `Sync failed: ${detail}`
        : `Sync failed (${res.status})`;
      setSyncError(message);
      toast.error(message);
    } catch (err) {
      console.error("[calendar-sync] sync error", err);
      const message = `Sync failed: ${err instanceof Error ? err.message : "could not reach the sync service"}`;
      setSyncError(message);
      toast.error(message);

    } finally {
      setSyncing(false);
    }
  }

  /** Call the calendar service with a specific action. */
  async function callCalendarService(action: string, extra: Record<string, unknown> = {}) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session || !userId) throw new Error("Please sign in again");
    const res = await fetch(`${SUPABASE_URL}/functions/v1/sync-google-calendar`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ instructor_id: userId, action, ...extra }),
    });
    const raw = await res.text();
    let data: any = {};
    try { data = raw ? JSON.parse(raw) : {}; } catch { /* non-JSON */ }
    console.log(`[calendar-sync] ${action}`, res.status, raw.slice(0, 300));
    return data;
  }

  /** Load which Google calendars exist and which are being imported. */
  async function loadCalendars() {
    if (!userId) return;
    setLoadingCalendars(true);
    try {
      const { data: row } = await supabase
        .from("instructors")
        .select("google_calendar_ids, google_channels")
        .eq("id", userId)
        .maybeSingle();
      const chosen = (row as any)?.google_calendar_ids ?? [];
      setSelectedCalendars(Array.isArray(chosen) ? chosen : []);
      const channels = (row as any)?.google_channels ?? {};
      setInstantUpdates(Object.keys(channels).length > 0);

      const data = await callCalendarService("list_calendars");
      if (Array.isArray(data?.calendars)) {
        setCalendars(data.calendars);
        if (!chosen?.length && data.selected?.length) setSelectedCalendars(data.selected);
      }
    } catch (err) {
      console.warn("[calendar-sync] could not load calendars", err);
    } finally {
      setLoadingCalendars(false);
    }
  }

  /** Turn a calendar's import on or off. */
  async function toggleCalendar(id: string) {
    if (!userId) return;
    const next = selectedCalendars.includes(id)
      ? selectedCalendars.filter((c) => c !== id)
      : [...selectedCalendars, id];
    if (next.length === 0) {
      toast.error("Keep at least one calendar selected");
      return;
    }
    setSelectedCalendars(next);
    const { error } = await supabase
      .from("instructors")
      .update({ google_calendar_ids: next })
      .eq("id", userId);
    if (error) {
      toast.error("Could not save your calendar choice");
      return;
    }
    void sync();
    if (instantUpdates)
      void callCalendarService("watch", { webhook_url: WEBHOOK_URL }).catch(() => undefined);
  }

  /** Ask Google to tell us the moment something changes (or stop). */
  async function toggleInstantUpdates() {
    if (!userId) return;
    if (!instantUpdates && selectedCalendars.length === 0) {
      toast.error("Pick at least one calendar first");
      return;
    }
    setInstantBusy(true);
    try {
      const turnOn = !instantUpdates;
      const data = await callCalendarService(turnOn ? "watch" : "unwatch", {
        webhook_url: WEBHOOK_URL,
      });
      if (turnOn) {
        const watching: string[] = data?.watching ?? [];
        if (watching.length) {
          setInstantUpdates(true);
          toast.success("Google changes will now appear straight away");
        } else if (data?.reason === "no_calendars_selected") {
          toast.error("Pick at least one calendar first");
        } else if (data?.watching === undefined && data?.failures === undefined) {
          toast.error(
            data?.message || data?.error
              ? `Instant updates unavailable: ${data.message ?? data.error}`
              : "Instant updates aren't available yet — the calendar service needs redeploying",
          );
        } else {
          const reason = Object.values(data?.failures ?? {})[0];
          const text = typeof reason === "string" ? reason : "";
          if (/webhook|address|domain|unauthorized.*callback|not verified/i.test(text)) {
            toast.error(
              `Google won't accept ${WEBHOOK_URL} yet — verify everydriver.pro in Google Search Console, then try again.`,
            );
          } else {
            toast.error(
              text
                ? `Google refused instant updates: ${text}`
                : "Google refused instant updates — please try again",
            );
          }
        }
      } else {
        setInstantUpdates(false);
        toast.success("Instant updates turned off");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not change instant updates");
    } finally {
      setInstantBusy(false);
    }
  }

  useEffect(() => {
    if (googleConnected && userId) void loadCalendars();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [googleConnected, userId]);



  /** Disconnect Google Calendar. */
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

  const icsUrl = userId
    ? `${SUPABASE_URL}/functions/v1/ics-feed?instructor_id=${userId}`
    : "";

  async function copyIcsUrl() {
    if (!icsUrl) return;
    try {
      await navigator.clipboard.writeText(icsUrl);
      toast.success("Link copied!");
    } catch {
      toast.error("Copy failed");
    }
  }

  async function saveIcsUrl(overrideUrl?: string) {
    const url = overrideUrl !== undefined ? overrideUrl.trim() : icsInboundUrl.trim();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase
      .from("instructors")
      .update({
        ics_feed_url: url || null,
      })
      .eq("id", user.id);

    setSavedIcsUrl(url);
    setIcsInboundUrl(url);

    if (url) {
      await fetch(
        `${SUPABASE_URL}/functions/v1/sync-ics-feed?instructor_id=${user.id}`,
        {
          method: "GET",
          headers: {
            apikey: SUPABASE_ANON_KEY,
          },
        }
      );
      toast.success("Calendar connected — personal events imported");
    } else {
      toast.success("Calendar disconnected");
    }
  }

  return (
    <DSMTopSheet title="Calendar Sync" onBack={() => navigate({ to: "/settings" as never })}>
      <div style={{ ...POPPINS, minHeight: "100%" }}>
        <div className="px-4 pb-12">
          <div
            className="mx-0 mt-3"
            style={{
              backgroundColor: "#E7F1FC",
              borderRadius: tokens.radiusCard,
              padding: "14px 16px",
              display: "flex",
              flexDirection: "row",
              gap: 10,
            }}
          >
            <IconInfoCircle size={16} color="#1877D6" style={{ flexShrink: 0, marginTop: 1 }} />
            <p
              style={{
                ...POPPINS,
                color: tokens.navy,
                fontSize: tokens.fontSize.base,
                fontWeight: tokens.fontWeight.medium,
                lineHeight: 1.5,
              }}
            >
              Connect your Google Calendar to import events and push EDP lessons automatically.
            </p>
          </div>

          <div
            style={{
              background: "#fff",
              borderRadius: 12,
              border: "0.5px solid #E4E8EF",
              padding: 16,
              marginBottom: 16,
              ...POPPINS,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                marginBottom: 8,
              }}
            >
              <IconCalendar size={20} color="#2C97DE" />
              <div
                style={{
                  color: "#0B2341",
                  fontSize: 14,
                  fontWeight: tokens.fontWeight.bold,
                }}
              >
                Add EDP to your calendar
              </div>
            </div>

            <p
              style={{
                color: "#536579",
                fontSize: 12,
                lineHeight: 1.5,
                margin: 0,
              }}
            >
              Subscribe to your lesson calendar in Google, Apple or Outlook. Your lessons update automatically.
            </p>

            <div
              style={{
                background: "#F4F6F8",
                borderRadius: 8,
                padding: "10px 12px",
                marginTop: 10,
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <div
                style={{
                  flex: 1,
                  fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                  fontSize: 11,
                  color: "#536579",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {icsUrl || "Sign in to see your calendar link"}
              </div>
              {icsUrl && (
                <button
                  type="button"
                  onClick={copyIcsUrl}
                  style={{
                    background: "transparent",
                    border: "none",
                    padding: 0,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <IconCopy size={16} color="#2C97DE" />
                </button>
              )}
            </div>

            <div style={{ marginTop: 12 }}>
              <div
                style={{
                  color: "#0B2341",
                  fontSize: 11,
                  fontWeight: tokens.fontWeight.bold,
                  marginBottom: 6,
                }}
              >
                How to add:
              </div>
              <div style={{ fontSize: 11, color: "#536579", lineHeight: 1.6 }}>
                <div>1. Open Google Calendar on desktop → click "+" next to "Other calendars" → select "From URL"</div>
                <div style={{ marginTop: 4 }}>2. Paste the link above and click "Add calendar"</div>
                <div style={{ marginTop: 4 }}>
                  ⚠️ Important: choose "From URL" — not "Import". Using Import will create duplicates
                </div>
                <div style={{ marginTop: 4 }}>3. Your EDP lessons will appear within a few minutes and update automatically</div>
              </div>
            </div>

            <div style={{ marginTop: 8, fontSize: 10, color: "#9CA3AF" }}>
              Apple Calendar: File → New Calendar Subscription → paste the link
            </div>
          </div>

          <div
            style={{
              background: "#fff",
              borderRadius: 12,
              border: "0.5px solid #E4E8EF",
              padding: 16,
              marginBottom: 16,
              ...POPPINS,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                marginBottom: 8,
              }}
            >
              <IconCalendarPlus size={20} color="#18A999" />
              <div
                style={{
                  color: "#0B2341",
                  fontSize: 14,
                  fontWeight: tokens.fontWeight.bold,
                }}
              >
                Import your personal calendar
              </div>
            </div>

            <p
              style={{
                color: "#536579",
                fontSize: 12,
                lineHeight: 1.5,
                margin: 0,
                marginBottom: 12,
              }}
            >
              Paste your Google or Apple private calendar URL below. EDP will import your personal events so gaps are never offered when you're busy.
            </p>

            {(!savedIcsUrl.trim() || isEditingIcs) ? (
              <>
                <label
                  style={{
                    display: "block",
                    color: "#0B2341",
                    fontSize: 11,
                    fontWeight: tokens.fontWeight.bold,
                    marginBottom: 4,
                  }}
                >
                  Your private calendar URL
                </label>
                <input
                  type="url"
                  placeholder="https://calendar.google.com/calendar/ical/..."
                  value={icsInboundUrl}
                  onChange={(e) => setIcsInboundUrl(e.target.value)}
                  style={{
                    width: "100%",
                    background: "#F4F6F8",
                    borderRadius: 8,
                    border: "0.5px solid #E4E8EF",
                    padding: "10px 12px",
                    fontSize: 12,
                    fontFamily: "inherit",
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                />

                <button
                  type="button"
                  onClick={async () => {
                    await saveIcsUrl();
                    setIsEditingIcs(false);
                  }}
                  style={{
                    marginTop: 10,
                    background: "#18A999",
                    color: "white",
                    borderRadius: 8,
                    padding: "10px 16px",
                    fontSize: 13,
                    fontWeight: 600,
                    border: "none",
                    cursor: "pointer",
                    width: "100%",
                  }}
                >
                  Save calendar URL
                </button>
              </>
            ) : (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "12px",
                  background: "#F0FDF4",
                  borderRadius: 8,
                  border: "1px solid #BBF7D0",
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
                  <IconCalendarPlus size={20} color="#15803D" stroke={1.5} />
                </div>
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      color: "#0B2341",
                      fontSize: 14,
                      fontWeight: tokens.fontWeight.bold,
                    }}
                  >
                    Personal calendar connected
                  </div>
                  <div style={{ fontSize: 11, color: "#536579", marginTop: 2 }}>
                    {icsFeedStatus === "healthy"
                      ? `Importing events · fetched ${icsLastFetched ? timeAgo(icsLastFetched) : "never"}`
                      : icsFeedStatus === "failed"
                        ? "Connection failed — check your URL"
                        : "Calendar URL saved"}
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                  <button
                    type="button"
                    onClick={() => {
                      setIcsInboundUrl(savedIcsUrl);
                      setIsEditingIcs(true);
                    }}
                    style={{
                      background: "transparent",
                      border: "none",
                      color: "#1877D6",
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: "pointer",
                      padding: 0,
                    }}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      await saveIcsUrl("");
                    }}
                    style={{
                      background: "transparent",
                      border: "none",
                      color: "#CC2229",
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: "pointer",
                      padding: 0,
                    }}
                  >
                    Remove
                  </button>
                </div>
              </div>
            )}

            <div style={{ marginTop: 12 }}>
              <div
                style={{
                  color: "#0B2341",
                  fontSize: 11,
                  fontWeight: tokens.fontWeight.bold,
                  marginBottom: 6,
                }}
              >
                How to get your Google Calendar private URL:
              </div>
              <div style={{ fontSize: 11, color: "#536579", lineHeight: 1.6 }}>
                <div>1. Open Google Calendar on desktop</div>
                <div style={{ marginTop: 4 }}>2. Click the three dots next to your calendar name</div>
                <div style={{ marginTop: 4 }}>3. Select "Settings and sharing"</div>
                <div style={{ marginTop: 4 }}>4. Scroll to "Integrate calendar"</div>
                <div style={{ marginTop: 4 }}>5. Copy the "Secret address in iCal format" link</div>
                <div style={{ marginTop: 4 }}>6. Paste it above</div>
              </div>
              <div
                style={{
                  marginTop: 8,
                  background: "#FEF3C7",
                  borderRadius: 8,
                  padding: "8px 10px",
                  fontSize: 11,
                  color: "#92400E",
                }}
              >
                ⚠ Keep this URL private — it gives access to your calendar events
              </div>
            </div>
          </div>

          <div style={{ marginTop: 24 }}>
            <div
              style={{
                ...POPPINS,
                color: tokens.textMuted,
                fontSize: tokens.fontSize.sm,
                fontWeight: tokens.fontWeight.semibold,
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
                    <div
                      style={{
                        ...POPPINS,
                        color: tokens.navy,
                        fontSize: tokens.fontSize.md,
                        fontWeight: 600,
                      }}
                    >
                      Google Calendar
                    </div>
                    <div
                      style={{
                        ...POPPINS,
                        color: tokens.textMuted,
                        fontSize: tokens.fontSize.sm,
                        marginTop: 2,
                      }}
                    >
                      Last synced: {lastSynced ? timeAgo(lastSynced) : "Never synced"}
                    </div>
                    {syncError ? (
                      <div
                        style={{
                          ...POPPINS,
                          color: "#CC2229",
                          fontSize: tokens.fontSize.sm,
                          marginTop: 4,
                        }}
                      >
                        {syncError}
                      </div>
                    ) : null}

                  </div>
                  <div
                    style={{
                      background: "#DCFCE7",
                      color: "#15803D",
                      fontSize: tokens.fontSize.sm,
                      fontWeight: tokens.fontWeight.bold,
                      borderRadius: 999,
                      padding: "4px 10px",
                    }}
                  >
                    Connected
                  </div>
                </div>
                <div style={{ height: 1, background: tokens.border }} />

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
                  <div
                    style={{
                      ...POPPINS,
                      color: tokens.navy,
                      fontSize: tokens.fontSize.md,
                      fontWeight: tokens.fontWeight.medium,
                      flex: 1,
                    }}
                  >
                    Sync now
                  </div>
                  {syncing && (
                    <div style={{ ...POPPINS, color: tokens.textMuted, fontSize: 11 }}>
                      Syncing...
                    </div>
                  )}
                </div>

                <div
                  onClick={instantBusy ? undefined : toggleInstantUpdates}
                  role="button"
                  tabIndex={0}
                  style={{
                    padding: "13px 16px",
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    cursor: instantBusy ? "default" : "pointer",
                    borderBottom: "1px solid #E4E8EF",
                    opacity: instantBusy ? 0.6 : 1,
                  }}
                  onKeyDown={(e) => {
                    if (!instantBusy && (e.key === "Enter" || e.key === " ")) toggleInstantUpdates();
                  }}
                >
                  <IconRefresh size={16} color="#1877D6" stroke={1.5} />
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        ...POPPINS,
                        color: tokens.navy,
                        fontSize: tokens.fontSize.md,
                        fontWeight: tokens.fontWeight.medium,
                      }}
                    >
                      Instant updates
                    </div>
                    <div
                      style={{ ...POPPINS, color: tokens.textMuted, fontSize: tokens.fontSize.sm }}
                    >
                      {instantUpdates
                        ? "Google changes appear here straight away"
                        : "Turn on to skip waiting for the next sync"}
                    </div>
                    <div
                      style={{
                        ...POPPINS,
                        color: tokens.textMuted,
                        fontSize: 11,
                        marginTop: 2,
                        wordBreak: "break-all",
                      }}
                    >
                      Notification address: {WEBHOOK_URL}
                    </div>
                  </div>
                  <div
                    style={{
                      background: instantUpdates ? "#DCFCE7" : "#EEF2F7",
                      color: instantUpdates ? "#15803D" : tokens.textMuted,
                      fontSize: tokens.fontSize.sm,
                      fontWeight: tokens.fontWeight.bold,
                      borderRadius: 999,
                      padding: "4px 10px",
                    }}
                  >
                    {instantBusy ? "…" : instantUpdates ? "On" : "Off"}
                  </div>
                </div>

                <div style={{ padding: "13px 16px", borderBottom: "1px solid #E4E8EF" }}>
                  <div
                    style={{
                      ...POPPINS,
                      color: tokens.navy,
                      fontSize: tokens.fontSize.md,
                      fontWeight: tokens.fontWeight.medium,
                      marginBottom: 6,
                    }}
                  >
                    Calendars to import
                  </div>
                  {loadingCalendars && calendars.length === 0 ? (
                    <div style={{ ...POPPINS, color: tokens.textMuted, fontSize: tokens.fontSize.sm }}>
                      Loading your calendars…
                    </div>
                  ) : calendars.length === 0 ? (
                    <div style={{ ...POPPINS, color: tokens.textMuted, fontSize: tokens.fontSize.sm }}>
                      Could not list your calendars — using your main one.
                    </div>
                  ) : (
                    calendars.map((cal) => {
                      const on = selectedCalendars.includes(cal.id);
                      return (
                        <label
                          key={cal.id}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                            padding: "6px 0",
                            cursor: "pointer",
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={on}
                            onChange={() => toggleCalendar(cal.id)}
                            style={{ width: 16, height: 16, accentColor: "#1877D6" }}
                          />
                          <span
                            style={{
                              ...POPPINS,
                              color: tokens.navy,
                              fontSize: tokens.fontSize.sm,
                            }}
                          >
                            {cal.summary || cal.id}
                            {cal.primary ? " (main)" : ""}
                          </span>
                        </label>
                      );
                    })
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
                  <div
                    style={{
                      ...POPPINS,
                      color: tokens.red,
                      fontSize: tokens.fontSize.md,
                      fontWeight: 500,
                    }}
                  >
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
                  <div
                    style={{
                      ...POPPINS,
                      color: tokens.navy,
                      fontSize: tokens.fontSize.md,
                      fontWeight: 600,
                    }}
                  >
                    Connect Google Calendar
                  </div>
                  <div
                    style={{
                      ...POPPINS,
                      color: tokens.textMuted,
                      fontSize: tokens.fontSize.sm,
                      marginTop: 2,
                    }}
                  >
                    Import events and push lessons automatically
                  </div>
                </div>
                {connecting ? (
                  <div style={{ ...POPPINS, color: tokens.blue, fontSize: 12 }}>Connecting...</div>
                ) : (
                  <IconChevronRight size={16} color="#C7D0DC" stroke={2} />
                )}
              </div>
            )}
          </div>

          {!googleConnected && (
            <button
              type="button"
              onClick={connectGoogleCalendar}
              disabled={connecting}
              style={{
                ...BTN_PRIMARY,
                opacity: connecting ? 0.6 : 1,
              }}
            >
              {connecting ? "Connecting…" : "Connect Google Calendar"}
            </button>
          )}
        </div>
      </div>
    </DSMTopSheet>
  );
}
