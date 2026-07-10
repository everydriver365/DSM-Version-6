import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Info, Copy, Check, Calendar, AlertTriangle, ChevronDown, Loader2, AlertCircle, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { SectionHeader } from "../components/dsm/SectionHeader";
import { Card } from "../components/dsm/Card";
import { Button } from "../components/dsm/Button";
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

export const Route = createFileRoute("/calendarsync")({
  head: () => ({
    meta: [
      { title: "Calendar sync — DSM by EveryDriver" },
      { name: "description", content: "Sync your lessons to any calendar app using an ICS feed." },
    ],
  }),
  component: CalendarSyncPage,
});

const POPPINS = { fontFamily: "Inter, sans-serif" } as const;


function CalendarSyncPage() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [externalCalendarUrl, setExternalCalendarUrl] = useState("");
  const [savedUrl, setSavedUrl] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [lastSynced, setLastSynced] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [howToOpen, setHowToOpen] = useState(false);
  const [removing, setRemoving] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

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
        const fullSel = `${baseSel},external_calendar_sync_error`;
        let rows: unknown = null;
        let res = await fetch(
          `${SUPABASE_URL}/rest/v1/instructors?id=eq.${user.id}&select=${fullSel}`,
          { headers },
        );
        if (!res.ok) {
          // Column may not exist yet — retry without sync_error.
          res = await fetch(
            `${SUPABASE_URL}/rest/v1/instructors?id=eq.${user.id}&select=${baseSel}`,
            { headers },
          );
        }
        if (res.ok) {
          rows = await res.json();
          const row = Array.isArray(rows) ? rows[0] as {
            external_calendar_url?: string | null;
            external_calendar_last_synced_at?: string | null;
            external_calendar_sync_error?: string | null;
          } : null;
          if (row?.external_calendar_url) {
            setExternalCalendarUrl(row.external_calendar_url);
            setSavedUrl(row.external_calendar_url);
          }
          if (row?.external_calendar_last_synced_at) {
            setLastSynced(row.external_calendar_last_synced_at);
          }
          if (row?.external_calendar_sync_error) {
            setSyncError(row.external_calendar_sync_error);
          }
        }
      } catch {
        // ignore — first-time or column may not exist
      }
    })();
  }, [navigate]);

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
    setSyncing(true);
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
      if (syncData.success) {
        const count = syncData.eventsImported || 0;
        toast.success(
          count > 0
            ? `Calendar synced — ${count} event${count !== 1 ? "s" : ""} imported`
            : "Calendar synced — no upcoming events found",
        );
        setLastSynced(new Date().toISOString());
      } else {
        toast.error(syncData.message || syncData.error || "Sync failed — check your URL and try again");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Sync failed");
    } finally {
      setSyncing(false);
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
    <PageLayout style={POPPINS}>
      {/* Top bar */}
      <div
        className="sticky top-0 z-40 flex items-center justify-between px-4"
        style={{ height: 52, backgroundColor: "#0B1F3A" }}
      >
        <button
          type="button"
          onClick={() => navigate({ to: "/settings" })}
          className="flex items-center justify-center"
          style={{ width: 36, height: 36 }}
          aria-label="Back"
        >
          <ArrowLeft size={22} color="#FFFFFF" />
        </button>
        <div className="text-[15px] font-semibold text-white" style={POPPINS}>
          Calendar sync
        </div>
        <div style={{ width: 36 }} />
      </div>

      <div className="px-4 pb-12">
        {/* Info card */}
        <div
          className="mx-0 mt-3 flex items-start gap-3"
          style={{
            backgroundColor: "#EEF4FB",
            borderWidth: "0.5px",
            borderStyle: "solid",
            borderColor: "#1877D6",
            borderRadius: 12,
            padding: 16,
          }}
        >
          <Info size={20} color="#1877D6" className="shrink-0 mt-0.5" />
          <p className="text-[13px] text-[#0B1F3A] leading-[1.5]" style={POPPINS}>
            Sync your lessons to any calendar app using an ICS feed. Works with Google Calendar, Apple Calendar, and Outlook.
          </p>
        </div>

        {/* Import external Google Calendar */}
        <div
          style={{
            backgroundColor: "#FFFFFF",
            borderWidth: "0.5px",
            borderStyle: "solid",
            borderColor: "#E2E6ED",
            borderRadius: 12,
            padding: 16,
            marginTop: 16,
          }}
        >
          <div className="flex items-center gap-2">
            <Calendar size={18} color="#1A52A0" />
            <div className="text-[14px] font-semibold" style={{ ...POPPINS, color: "#0F2044" }}>
              Import your Google Calendar
            </div>
          </div>
          <p className="text-xs" style={{ ...POPPINS, color: "#6B7280", marginTop: 4, marginBottom: 16 }}>
            See your personal events in DSM so gap filler knows when you're busy
          </p>

          <button
            type="button"
            onClick={() => setHowToOpen((v) => !v)}
            className="flex items-center justify-between w-full"
            style={POPPINS}
          >
            <span className="text-sm font-semibold" style={{ color: "#1A52A0" }}>
              How to get your Google Calendar URL
            </span>
            <ChevronDown
              size={16}
              color="#1A52A0"
              style={{ transform: howToOpen ? "rotate(180deg)" : "none", transition: "transform 150ms" }}
            />
          </button>
          {howToOpen && (
            <div style={{ marginTop: 10 }}>
              <ol className="list-decimal pl-5 text-[12px] leading-[1.5]" style={{ ...POPPINS, color: "#0F2044" }}>
                <li>Open Google Calendar on desktop (calendar.google.com)</li>
                <li>Click the three dots ⋮ next to your calendar name</li>
                <li>Click 'Settings and sharing'</li>
                <li>Scroll down to 'Secret address in iCal format'</li>
                <li>Click the copy icon and paste the URL below</li>
              </ol>
              <p className="text-[11px] italic" style={{ ...POPPINS, color: "#6B7280", marginTop: 8 }}>
                This URL is private — only you have it. No login required.
              </p>
            </div>
          )}

          <div style={{ marginTop: 12 }}>
            <label
              className="block text-xs font-semibold"
              style={{ ...POPPINS, color: "#6B7280", marginBottom: 6 }}
            >
              Your Google Calendar ICS URL
            </label>
            <input
              ref={inputRef}
              type="url"
              value={externalCalendarUrl}
              onChange={(e) => setExternalCalendarUrl(e.target.value)}
              placeholder="https://calendar.google.com/calendar/ical/..."
              className="w-full"
              style={{
                ...POPPINS,
                backgroundColor: "#F7FAFC",
                borderWidth: "0.5px",
                borderStyle: "solid",
                borderColor: "#E2E6ED",
                borderRadius: 10,
                padding: "11px 14px",
                fontSize: 12,
                color: "#0F2044",
                outline: "none",
              }}
            />
          </div>

          {syncError ? (
            <div
              style={{
                marginTop: 8,
                background: "#FEF2F2",
                border: "0.5px solid #FECACA",
                borderRadius: 10,
                padding: "12px 14px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <AlertCircle size={14} color="#CC2229" />
                <span className="text-xs" style={{ ...POPPINS, color: "#CC2229" }}>
                  Sync error: {syncError}
                </span>
              </div>
              <div className="text-xs" style={{ ...POPPINS, color: "#9CA3AF", marginTop: 4 }}>
                This usually means your ICS URL has expired. Get a new one from Google Calendar.
              </div>
              <button
                type="button"
                onClick={() => {
                  inputRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
                  inputRef.current?.focus();
                }}
                className="text-xs font-semibold"
                style={{ ...POPPINS, color: "#1A52A0", marginTop: 6 }}
              >
                Update URL →
              </button>
            </div>
          ) : lastSynced ? (
            (() => {
              const ageMs = Date.now() - new Date(lastSynced).getTime();
              const overdue = ageMs > 6 * 60 * 60 * 1000;
              return (
                <div
                  style={{
                    marginTop: 8,
                    background: "#E0FFF4",
                    border: "0.5px solid #86EFAC",
                    borderRadius: 10,
                    padding: "12px 14px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <CheckCircle size={14} color="#16A34A" />
                    <span
                      className="text-xs font-semibold"
                      style={{ ...POPPINS, color: "#16A34A" }}
                    >
                      Last synced: {timeAgo(lastSynced)}
                    </span>
                  </div>
                  {overdue && (
                    <div
                      className="text-xs"
                      style={{ ...POPPINS, color: "#D97706", marginTop: 4 }}
                    >
                      ⚠️ Sync is overdue — tap Sync now to refresh
                    </div>
                  )}
                </div>
              );
            })()
          ) : null}

          <button
            type="button"
            onClick={() => runSync(externalCalendarUrl)}
            disabled={syncing || !externalCalendarUrl.trim()}
            className="w-full rounded-xl font-semibold text-sm text-white flex items-center justify-center gap-2"
            style={{
              ...POPPINS,
              backgroundColor: "#1A52A0",
              paddingTop: 12,
              paddingBottom: 12,
              marginTop: 12,
              opacity: syncing || !externalCalendarUrl.trim() ? 0.6 : 1,
            }}
          >
            {syncing ? (
              <>
                <Loader2 size={16} className="animate-spin" /> Syncing...
              </>
            ) : (
              <>Save and sync calendar →</>
            )}
          </button>

          {lastSynced && !syncError && (
            <div className="flex items-center justify-end" style={{ marginTop: 10 }}>
              <button
                type="button"
                onClick={() => runSync(savedUrl || externalCalendarUrl)}
                disabled={syncing}
                className="text-xs font-semibold"
                style={{ ...POPPINS, color: "#1A52A0" }}
              >
                Sync now
              </button>
            </div>
          )}



          {savedUrl && (
            <div style={{ marginTop: 10 }}>
              <button
                type="button"
                onClick={removeCalendar}
                disabled={removing}
                className="text-xs"
                style={{ ...POPPINS, color: "#CC2229" }}
              >
                {removing ? "Removing..." : "Remove calendar"}
              </button>
            </div>
          )}
        </div>

        {/* ICS Feed URL */}
        <SectionHeader>YOUR ICS FEED URL</SectionHeader>
        <Card className="flex flex-col gap-3">
          <input
            readOnly
            value={icsUrl}
            className="h-11 w-full rounded-lg px-3 text-[14px] text-[#0B1F3A] bg-white"
            style={{
              fontFamily: "Inter, sans-serif",
              borderWidth: "0.5px",
              borderStyle: "solid",
              borderColor: "#EEF2F7",
            }}
            onFocus={(e) => e.target.select()}
          />
          <Button onClick={copyLink}>
            {copied ? (
              <span className="inline-flex items-center gap-2">
                <Check size={16} /> Copied!
              </span>
            ) : (
              <span className="inline-flex items-center gap-2">
                <Copy size={16} /> Copy link
              </span>
            )}
          </Button>
          <Button variant="ghost" onClick={shareLink}>
            Share link
          </Button>
        </Card>

        {/* Info banner */}
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
          <AlertTriangle size={20} color="#1877D6" className="shrink-0 mt-0.5" />
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
                <Calendar size={20} color="#1877D6" />
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
              borderRadius: 12,
              marginBottom: 12,
              borderWidth: "0.5px",
              borderStyle: "solid",
              borderColor: "#EEF2F7",
            }}
          >
            <AccordionTrigger className="px-4 py-3 text-[14px] font-semibold text-[#0B1F3A]" style={{ ...POPPINS, borderRadius: 12 }}>
              <span className="flex items-center gap-3">
                <Calendar size={20} color="#1877D6" />
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
              borderRadius: 12,
              marginBottom: 12,
              borderWidth: "0.5px",
              borderStyle: "solid",
              borderColor: "#EEF2F7",
            }}
          >
            <AccordionTrigger className="px-4 py-3 text-[14px] font-semibold text-[#0B1F3A]" style={{ ...POPPINS, borderRadius: 12 }}>
              <span className="flex items-center gap-3">
                <Calendar size={20} color="#1877D6" />
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
    </PageLayout>
  );
}
