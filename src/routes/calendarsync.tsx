import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { tokens } from "@/lib/tokens";
import { useEffect, useState } from "react";
import { IconCalendar, IconChevronRight, IconInfoCircle, IconRefresh, IconX } from "@tabler/icons-react";
import { backfillGoogleColours } from "@/lib/calendarColourBackfill.functions";
import { toast } from "@/lib/toast";
import DSMTopSheet from "@/components/dsm/DSMTopSheet";
import { SAVE_BUTTON_STYLE } from "@/components/dsm/SaveFooter";
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
        const res = await fetch(
          `${SUPABASE_URL}/rest/v1/instructors?id=eq.${user.id}&select=google_calendar_connected,calendar_last_synced`,
          { headers },
        );
        if (res.ok) {
          const rows = await res.json();
          const row = Array.isArray(rows)
            ? (rows[0] as {
                google_calendar_connected?: boolean | null;
                calendar_last_synced?: string | null;
              })
            : null;
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
      const data = await res.json().catch(() => ({}));
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
      } else if (
        String(data.error ?? "").includes("calendar_blocks_external_unique") ||
        String(data.error ?? "").includes("duplicate key")
      ) {
        toast.info("Calendar already up to date");
        setLastSynced(new Date().toISOString());
      } else {
        toast.error(data.message ?? data.error ?? "Sync failed");
      }
    } catch {
      toast.error("Sync failed");
    } finally {
      setSyncing(false);
    }
  }

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
