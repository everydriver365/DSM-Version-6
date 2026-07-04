import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabaseClient";
import {
  categoryColor,
  formatSessionDate,
  formatSessionTime,
  type LiveSession,
} from "./dsm-live";

const SUPABASE_URL = "https://bjpqxfrihwjcqprmoqfs.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJqcHF4ZnJpaHdqY3Fwcm1vcWZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE0NzQ4MjEsImV4cCI6MjA5NzA1MDgyMX0.HKlgx3dxP3uxX9wMRRUnfb0IPwaBpFcut_iUgT5XFeo";

type SessionDetail = LiveSession & {
  tags: string[] | null;
  zoom_link: string | null;
  zoom_link_revealed_after_booking: boolean | null;
};

type Booking = {
  id: string;
  session_id: string;
  instructor_id: string;
  status: string;
};

export const Route = createFileRoute("/dsm-live/$sessionId")({
  component: SessionDetailPage,
});

function authHeaders(extra: Record<string, string> = {}) {
  return {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    "Content-Type": "application/json",
    ...extra,
  };
}

function SessionDetailPage() {
  const navigate = useNavigate();
  const { sessionId } = Route.useParams();
  const [session, setSession] = useState<SessionDetail | null>(null);
  const [booking, setBooking] = useState<Booking | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          `${SUPABASE_URL}/rest/v1/dsm_live_sessions?id=eq.${sessionId}&deleted_at=is.null`,
          { headers: authHeaders() },
        );
        const rows = (await res.json()) as SessionDetail[];
        if (!cancelled) setSession(rows?.[0] ?? null);
      } catch {
        if (!cancelled) setSession(null);
      }

      try {
        const { data: userData } = await supabase.auth.getUser();
        const uid = userData?.user?.id ?? null;
        const uemail = userData?.user?.email ?? "";
        if (!cancelled) {
          setUserId(uid);
          setEmail(uemail);
        }
        if (uid) {
          const r = await fetch(
            `${SUPABASE_URL}/rest/v1/dsm_live_bookings?session_id=eq.${sessionId}&instructor_id=eq.${uid}&status=eq.confirmed`,
            { headers: authHeaders() },
          );
          const rows = (await r.json()) as Booking[];
          if (!cancelled) setBooking(rows?.[0] ?? null);

          const p = await fetch(
            `${SUPABASE_URL}/rest/v1/instructors_profile?id=eq.${uid}&select=full_name`,
            { headers: authHeaders() },
          );
          const prof = (await p.json()) as { full_name?: string }[];
          if (!cancelled && prof?.[0]?.full_name) setName(prof[0].full_name);
        }
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  const bandColor = categoryColor(session?.category);

  async function handleBook() {
    if (!session || !userId) {
      toast.error("Please sign in to book");
      return;
    }
    if (session.spaces_taken >= session.max_spaces) {
      toast.error("This session is full");
      return;
    }
    if (!name.trim() || !email.trim()) {
      toast.error("Please add your name and email");
      return;
    }
    setSubmitting(true);
    try {
      const insertRes = await fetch(`${SUPABASE_URL}/rest/v1/dsm_live_bookings`, {
        method: "POST",
        headers: authHeaders({ Prefer: "return=representation" }),
        body: JSON.stringify({
          session_id: session.id,
          instructor_id: userId,
          name,
          email,
          status: "confirmed",
        }),
      });
      if (!insertRes.ok) throw new Error(await insertRes.text());
      const rows = (await insertRes.json()) as Booking[];
      setBooking(rows?.[0] ?? null);

      await fetch(`${SUPABASE_URL}/rest/v1/dsm_live_sessions?id=eq.${session.id}`, {
        method: "PATCH",
        headers: authHeaders(),
        body: JSON.stringify({ spaces_taken: session.spaces_taken + 1 }),
      }).catch(() => null);

      await fetch(`${SUPABASE_URL}/rest/v1/instructor_notifications`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          instructor_id: userId,
          title: "🎥 You're booked!",
          body: `'${session.title}' on ${formatSessionDate(session.session_date)} at ${formatSessionTime(session.session_time)}. Zoom link sent 30 mins before.`,
          type: "info",
        }),
      }).catch(() => null);

      setSession({ ...session, spaces_taken: session.spaces_taken + 1 });
      toast.success("Booking confirmed! 🎉");
    } catch (err) {
      console.error("[dsm-live book]", err);
      toast.error("Could not confirm booking");
    } finally {
      setSubmitting(false);
    }
  }

  async function cancelBooking() {
    if (!booking) return;
    try {
      await fetch(`${SUPABASE_URL}/rest/v1/dsm_live_bookings?id=eq.${booking.id}`, {
        method: "PATCH",
        headers: authHeaders(),
        body: JSON.stringify({ status: "cancelled" }),
      });
      if (session) {
        await fetch(`${SUPABASE_URL}/rest/v1/dsm_live_sessions?id=eq.${session.id}`, {
          method: "PATCH",
          headers: authHeaders(),
          body: JSON.stringify({
            spaces_taken: Math.max(0, session.spaces_taken - 1),
          }),
        });
        setSession({ ...session, spaces_taken: Math.max(0, session.spaces_taken - 1) });
      }
      setBooking(null);
      toast.success("Booking cancelled");
    } catch {
      toast.error("Could not cancel");
    }
  }

  function downloadIcs() {
    if (!session) return;
    const dt = new Date(`${session.session_date}T${session.session_time}`);
    const end = new Date(dt.getTime() + (session.duration_minutes ?? 60) * 60000);
    const fmt = (d: Date) =>
      d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
    const ics = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
UID:${session.id}@dsmlive
DTSTAMP:${fmt(new Date())}
DTSTART:${fmt(dt)}
DTEND:${fmt(end)}
SUMMARY:${session.title}
DESCRIPTION:${(session.description ?? "").replace(/\n/g, "\\n")}
END:VEVENT
END:VCALENDAR`;
    const blob = new Blob([ics], { type: "text/calendar" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${session.title.replace(/\W+/g, "-")}.ics`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (!session) {
    return (
      <div style={{ padding: 24, color: "#6B7280" }}>Loading…</div>
    );
  }

  const remaining = Math.max(0, session.max_spaces - session.spaces_taken);

  return (
    <div style={{ background: "#fff", minHeight: "100vh", paddingBottom: 40 }}>
      <div
        style={{
          background: "#0F2044",
          color: "#fff",
          padding: "12px 16px",
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}
      >
        <button
          type="button"
          onClick={() => navigate({ to: "/dsm-live" })}
          style={{ background: "transparent", border: 0, color: "#fff", padding: 4, cursor: "pointer" }}
          aria-label="Back"
        >
          <ArrowLeft size={22} />
        </button>
        <div
          style={{
            fontWeight: 700,
            fontSize: 15,
            flex: 1,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {session.title}
        </div>
      </div>

      <div
        style={{
          background: `linear-gradient(135deg, ${bandColor}, #0F2044)`,
          color: "#fff",
          padding: "24px 16px",
        }}
      >
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            background: "rgba(255,255,255,0.92)",
            color: bandColor,
            fontSize: 10,
            fontWeight: 800,
            padding: "4px 8px",
            borderRadius: 4,
            textTransform: "uppercase",
            letterSpacing: "0.04em",
          }}
        >
          {(session.category ?? "").toLowerCase().includes("webinar") ? "🎓 Webinar" : "📹 Zoom Session"}
        </div>
        <div style={{ color: "rgba(255,255,255,0.7)", fontSize: 12, fontWeight: 700, textTransform: "uppercase", marginTop: 12 }}>
          {session.category ?? "Session"}
        </div>
        <div style={{ fontWeight: 900, fontSize: 20, marginTop: 4 }}>{session.title}</div>
        {session.host_name && (
          <div style={{ color: "rgba(255,255,255,0.7)", fontSize: 14, marginTop: 2 }}>
            with {session.host_name}
          </div>
        )}
        <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 13, marginTop: 8 }}>
          {formatSessionDate(session.session_date)} · {formatSessionTime(session.session_time)}
          {session.duration_minutes ? ` · ${session.duration_minutes} mins` : ""}
        </div>
      </div>

      <div style={{ padding: 16 }}>
        {booking ? (
          <div
            style={{
              background: "#DCFCE7",
              border: "1px solid #86EFAC",
              borderRadius: 12,
              padding: 16,
              color: "#166534",
            }}
          >
            <div style={{ fontWeight: 700, fontSize: 16 }}>✓ You're booked!</div>
            <div style={{ fontSize: 13, marginTop: 6 }}>
              Your Zoom link will be sent to your email 30 minutes before the session starts.
            </div>
            {session.zoom_link && session.zoom_link_revealed_after_booking === false && (
              <a
                href={session.zoom_link}
                target="_blank"
                rel="noreferrer"
                style={{
                  display: "inline-block",
                  marginTop: 12,
                  background: "#0F2044",
                  color: "#fff",
                  padding: "10px 14px",
                  borderRadius: 8,
                  fontWeight: 600,
                  fontSize: 13,
                  textDecoration: "none",
                }}
              >
                Join Zoom →
              </a>
            )}
            <div style={{ display: "flex", gap: 12, marginTop: 12 }}>
              <button
                type="button"
                onClick={downloadIcs}
                style={{
                  border: "1px solid #166534",
                  color: "#166534",
                  background: "#fff",
                  borderRadius: 8,
                  padding: "8px 12px",
                  fontSize: 13,
                  cursor: "pointer",
                }}
              >
                Add to calendar
              </button>
              <button
                type="button"
                onClick={cancelBooking}
                style={{
                  background: "transparent",
                  border: 0,
                  color: "#CC2229",
                  fontSize: 13,
                  cursor: "pointer",
                }}
              >
                Cancel booking
              </button>
            </div>
          </div>
        ) : (
          <>
            {session.description && (
              <div
                style={{
                  background: "#fff",
                  border: "0.5px solid #E2E6ED",
                  borderRadius: 12,
                  padding: 16,
                }}
              >
                <div style={{ fontSize: 14, color: "#374151", whiteSpace: "pre-wrap" }}>
                  {session.description}
                </div>
                {session.tags && session.tags.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
                    {session.tags.map((t) => (
                      <span
                        key={t}
                        style={{
                          background: "#F1F5F9",
                          color: "#0F2044",
                          fontSize: 11,
                          padding: "3px 8px",
                          borderRadius: 999,
                        }}
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div
              style={{
                background: "#fff",
                border: "0.5px solid #E2E6ED",
                borderRadius: 12,
                padding: 16,
                marginTop: 12,
                fontSize: 13,
                color: "#374151",
                display: "grid",
                gap: 8,
              }}
            >
              <div>📅 Date: {formatSessionDate(session.session_date)}</div>
              <div>🕐 Time: {formatSessionTime(session.session_time)} (UK time)</div>
              <div>⏱ Duration: {session.duration_minutes ?? 60} minutes</div>
              <div>👥 Spaces: {remaining} remaining</div>
              <div>💰 Price: {session.price_display ?? (session.price_amount ? `£${session.price_amount}` : "Free")}</div>
              <div>🎥 Platform: Zoom (link sent after booking)</div>
            </div>

            <div
              style={{
                background: "#fff",
                border: "0.5px solid #E2E6ED",
                borderRadius: 12,
                padding: 16,
                marginTop: 12,
              }}
            >
              <div style={{ fontWeight: 700, fontSize: 15, color: "#0F2044", marginBottom: 10 }}>
                Book your place
              </div>
              <label style={{ fontSize: 12, color: "#6B7280" }}>Name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                style={{
                  width: "100%",
                  border: "1px solid #E2E6ED",
                  borderRadius: 8,
                  padding: "10px 12px",
                  marginTop: 4,
                  marginBottom: 10,
                  fontSize: 14,
                }}
              />
              <label style={{ fontSize: 12, color: "#6B7280" }}>Email</label>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                type="email"
                style={{
                  width: "100%",
                  border: "1px solid #E2E6ED",
                  borderRadius: 8,
                  padding: "10px 12px",
                  marginTop: 4,
                  fontSize: 14,
                }}
              />
              <button
                type="button"
                onClick={handleBook}
                disabled={submitting || remaining <= 0}
                style={{
                  marginTop: 14,
                  width: "100%",
                  height: 48,
                  background: remaining <= 0 ? "#9CA3AF" : "#CC2229",
                  color: "#fff",
                  border: 0,
                  borderRadius: 10,
                  fontWeight: 700,
                  fontSize: 15,
                  cursor: submitting ? "wait" : "pointer",
                }}
              >
                {remaining <= 0 ? "Session full" : submitting ? "Booking…" : "Confirm booking →"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}