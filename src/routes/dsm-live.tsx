import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Calendar as CalendarIcon, Clock, Video, Play } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

const SUPABASE_URL = "https://bjpqxfrihwjcqprmoqfs.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJqcHF4ZnJpaHdqY3Fwcm1vcWZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE0NzQ4MjEsImV4cCI6MjA5NzA1MDgyMX0.HKlgx3dxP3uxX9wMRRUnfb0IPwaBpFcut_iUgT5XFeo";

const AUTH_HEADERS = {
  apikey: SUPABASE_ANON_KEY,
  Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
};

export type LiveSession = {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  host_name: string | null;
  session_date: string;
  session_time: string;
  duration_minutes: number | null;
  max_spaces: number;
  spaces_taken: number;
  price_amount: number | null;
  price_display: string | null;
  status: string | null;
};

export const CATEGORIES = [
  "All",
  "Standards Check",
  "Business Coaching",
  "CPD Webinar",
  "New ADI",
  "Q&A",
] as const;

export const CATEGORY_COLORS: Record<string, string> = {
  "Standards Check": "#1A52A0",
  "Business Coaching": "#16A34A",
  "CPD Webinar": "#7C3AED",
  "New ADI": "#D97706",
  "Q&A": "#0891B2",
};

export function categoryColor(c: string | null | undefined): string {
  return (c && CATEGORY_COLORS[c]) || "#0F2044";
}

export function formatSessionDate(dateStr: string): string {
  try {
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString("en-GB", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

export function formatSessionTime(timeStr: string): string {
  try {
    const [h, m] = timeStr.split(":");
    const d = new Date();
    d.setHours(Number(h), Number(m), 0, 0);
    return d.toLocaleTimeString("en-GB", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return timeStr;
  }
}

export function daysUntil(dateStr: string): number {
  const d = new Date(dateStr + "T00:00:00").getTime();
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.round((d - now.getTime()) / 86400000);
}

type Podcast = {
  id: string;
  episode_number: number | null;
  title: string;
  description: string | null;
  guest_name: string | null;
  guest_title: string | null;
  duration_minutes: number | null;
  audio_url: string | null;
  spotify_url: string | null;
  apple_url: string | null;
  image_url: string | null;
};

export const Route = createFileRoute("/dsm-live")({
  component: DsmLivePage,
});

function DsmLivePage() {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<LiveSession[] | null>(null);
  const [bookedIds, setBookedIds] = useState<Set<string>>(new Set());
  const [category, setCategory] = useState<string>("All");
  const [podcasts, setPodcasts] = useState<Podcast[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          `${SUPABASE_URL}/rest/v1/dsm_live_sessions?deleted_at=is.null&order=session_date.asc&order=session_time.asc`,
          { headers: AUTH_HEADERS },
        );
        const data = (await res.json()) as LiveSession[];
        if (!cancelled) setSessions(Array.isArray(data) ? data : []);
      } catch {
        if (!cancelled) setSessions([]);
      }

      try {
        const { data: userData } = await supabase.auth.getUser();
        const userId = userData?.user?.id;
        if (!userId) return;
        const res = await fetch(
          `${SUPABASE_URL}/rest/v1/dsm_live_bookings?instructor_id=eq.${userId}&status=eq.confirmed&select=session_id,status`,
          { headers: AUTH_HEADERS },
        );
        const rows = (await res.json()) as { session_id: string }[];
        if (!cancelled && Array.isArray(rows)) {
          setBookedIds(new Set(rows.map((r) => r.session_id)));
        }
      } catch {
        /* ignore */
      }

      try {
        const res = await fetch(
          `${SUPABASE_URL}/rest/v1/dsm_podcasts?is_published=eq.true&deleted_at=is.null&order=episode_number.desc`,
          { headers: AUTH_HEADERS },
        );
        const data = (await res.json()) as Podcast[];
        if (!cancelled && Array.isArray(data)) setPodcasts(data);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    if (!sessions) return [];
    if (category === "All") return sessions;
    return sessions.filter((s) => s.category === category);
  }, [sessions, category]);

  return (
    <div style={{ background: "#fff", minHeight: "100vh", paddingBottom: 32 }}>
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
          onClick={() => navigate({ to: "/" })}
          style={{ background: "transparent", border: 0, color: "#fff", padding: 4, cursor: "pointer" }}
          aria-label="Back"
        >
          <ArrowLeft size={22} />
        </button>
        <div style={{ fontWeight: 700, fontSize: 16, flex: 1 }}>DSM Live</div>
        <span
          style={{
            background: "#CC2229",
            color: "#fff",
            fontSize: 11,
            fontWeight: 700,
            padding: "4px 8px",
            borderRadius: 999,
          }}
        >
          🔴 LIVE
        </span>
      </div>

      <div
        style={{
          background: "linear-gradient(135deg, #CC2229, #0F2044)",
          padding: "24px 16px",
          color: "#fff",
        }}
      >
        <div style={{ fontWeight: 900, fontSize: 24 }}>DSM Live</div>
        <div style={{ color: "rgba(255,255,255,0.7)", fontSize: 14, marginTop: 8 }}>
          Live coaching sessions, CPD webinars and standards check prep — join from anywhere.
        </div>
        <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 12, marginTop: 4 }}>
          Hosted by DSM instructors and industry experts
        </div>
      </div>

      <div
        style={{
          display: "flex",
          gap: 8,
          overflowX: "auto",
          padding: "12px 16px",
          scrollbarWidth: "none",
        }}
      >
        {CATEGORIES.map((c) => {
          const active = category === c;
          return (
            <button
              key={c}
              type="button"
              onClick={() => setCategory(c)}
              style={{
                flexShrink: 0,
                padding: "8px 14px",
                borderRadius: 999,
                border: `1px solid ${active ? "#0F2044" : "#E2E6ED"}`,
                background: active ? "#0F2044" : "#fff",
                color: active ? "#fff" : "#0F2044",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {c}
            </button>
          );
        })}
      </div>

      <div style={{ padding: 16 }}>
        {sessions === null ? null : filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "48px 16px", color: "#6B7280" }}>
            <Video size={48} style={{ margin: "0 auto", opacity: 0.4 }} />
            <div style={{ fontWeight: 600, marginTop: 12, color: "#0F2044" }}>
              No sessions scheduled yet
            </div>
            <div style={{ fontSize: 13, marginTop: 4 }}>
              Check back soon — sessions are added regularly.
            </div>
          </div>
        ) : (
          filtered.map((s) => (
            <SessionCard
              key={s.id}
              session={s}
              booked={bookedIds.has(s.id)}
              onOpen={() =>
                navigate({
                  to: "/dsm-live/$sessionId",
                  params: { sessionId: s.id },
                })
              }
            />
          ))
        )}
      </div>

      <div id="podcasts" style={{ padding: "8px 16px 16px" }}>
        <div style={{ fontWeight: 700, fontSize: 16, color: "#0F2044" }}>
          🎙️ DSM Podcast
        </div>
        <div style={{ fontSize: 12, color: "#9CA3AF", marginTop: 2, marginBottom: 12 }}>
          Listen to our latest episodes
        </div>
        {podcasts.length === 0 ? (
          <div style={{ color: "#9CA3AF", fontSize: 13, padding: "12px 0" }}>
            No episodes yet — check back soon.
          </div>
        ) : (
          podcasts.map((p) => <PodcastCard key={p.id} podcast={p} />)
        )}
      </div>
    </div>
  );
}

function PodcastCard({ podcast: p }: { podcast: Podcast }) {
  const openUrl = (url: string) => window.open(url, "_blank", "noopener,noreferrer");
  const hasAny = p.spotify_url || p.apple_url || p.audio_url;
  const bandColor = "#CC2229";
  return (
    <div
      style={{
        background: "#fff",
        border: "0.5px solid #E2E6ED",
        borderRadius: 16,
        overflow: "hidden",
        marginBottom: 12,
        boxShadow: "0 1px 2px rgba(15,32,68,0.04)",
      }}
    >
      <div style={{ height: 6, background: bandColor, width: "100%" }} />
      <div style={{ padding: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span
            style={{
              background: `${bandColor}15`,
              color: bandColor,
              fontSize: 11,
              fontWeight: 700,
              padding: "4px 8px",
              borderRadius: 6,
            }}
          >
            {p.episode_number != null ? `EP ${p.episode_number}` : "Podcast"}
          </span>
          {p.duration_minutes && (
            <span style={{ color: "#6B7280", fontSize: 12, fontWeight: 600 }}>
              {p.duration_minutes} mins
            </span>
          )}
        </div>

        <div style={{ fontWeight: 700, fontSize: 16, color: "#0F2044", marginTop: 8, marginBottom: 4 }}>
          {p.title}
        </div>
        {p.guest_name && (
          <div style={{ color: "#6B7280", fontSize: 13 }}>
            with {p.guest_name}
            {p.guest_title ? ` · ${p.guest_title}` : ""}
          </div>
        )}
        {p.description && (
          <div
            style={{
              color: "#6B7280",
              fontSize: 12,
              marginTop: 6,
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {p.description}
          </div>
        )}

        <div
          style={{
            background: "#F7FAFC",
            margin: "12px -16px 0",
            padding: "10px 16px",
            borderTop: "0.5px solid #E2E6ED",
            display: "flex",
            flexWrap: "wrap",
            gap: 8,
            alignItems: "center",
          }}
        >
          {p.spotify_url && (
            <button
              type="button"
              onClick={() => openUrl(p.spotify_url!)}
              style={{
                background: "#1DB954",
                color: "#fff",
                fontSize: 13,
                fontWeight: 600,
                borderRadius: 8,
                padding: "8px 14px",
                border: 0,
                cursor: "pointer",
              }}
            >
              🎵 Spotify
            </button>
          )}
          {p.apple_url && (
            <button
              type="button"
              onClick={() => openUrl(p.apple_url!)}
              style={{
                background: "#FC3C44",
                color: "#fff",
                fontSize: 13,
                fontWeight: 600,
                borderRadius: 8,
                padding: "8px 14px",
                border: 0,
                cursor: "pointer",
              }}
            >
              🎧 Apple
            </button>
          )}
          {p.audio_url && (
            <button
              type="button"
              onClick={() => openUrl(p.audio_url!)}
              style={{
                background: "#CC2229",
                color: "#fff",
                fontSize: 13,
                fontWeight: 600,
                borderRadius: 8,
                padding: "8px 14px",
                border: 0,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <Play size={14} /> Play now
            </button>
          )}
          {!hasAny && (
            <span
              style={{
                background: "#FEF3C7",
                color: "#92400E",
                fontSize: 12,
                fontWeight: 600,
                padding: "6px 10px",
                borderRadius: 999,
              }}
            >
              Coming soon
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function SessionCard({
  session,
  booked,
  onOpen,
}: {
  session: LiveSession;
  booked: boolean;
  onOpen: () => void;
}) {
  const remaining = Math.max(0, session.max_spaces - session.spaces_taken);
  const full = remaining <= 0;
  const spaceColor = full ? "#CC2229" : remaining < 5 ? "#D97706" : "#16A34A";
  const spaceText = full ? "Full" : `${remaining} spaces left`;
  const days = daysUntil(session.session_date);
  const soon = days >= 0 && days <= 7;
  const bandColor = categoryColor(session.category);
  const isFree =
    !session.price_amount ||
    (session.price_display ?? "").toLowerCase().includes("free");
  const isWebinar = (session.category ?? "").toLowerCase().includes("webinar");
  const typeLabel = isWebinar ? "🎓 WEBINAR" : "📹 ZOOM SESSION";
  const typeColor = isWebinar ? "#7C3AED" : "#1A52A0";

  return (
    <div
      style={{
        background: "#fff",
        border: "0.5px solid #E2E6ED",
        borderRadius: 16,
        overflow: "hidden",
        marginBottom: 12,
        boxShadow: "0 1px 2px rgba(15,32,68,0.04)",
      }}
    >
      <div style={{ height: 6, background: bandColor, width: "100%" }} />
      <div
        style={{
          background: `${typeColor}12`,
          color: typeColor,
          fontSize: 10,
          fontWeight: 800,
          letterSpacing: "0.08em",
          padding: "6px 16px",
          textTransform: "uppercase",
          borderBottom: "0.5px solid #E2E6ED",
        }}
      >
        {typeLabel}
      </div>
      <div style={{ padding: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span
            style={{
              background: `${bandColor}15`,
              color: bandColor,
              fontSize: 11,
              fontWeight: 700,
              padding: "4px 8px",
              borderRadius: 6,
            }}
          >
            {session.category ?? "Session"}
          </span>
          <span style={{ color: spaceColor, fontSize: 12, fontWeight: 600 }}>{spaceText}</span>
        </div>

        <div style={{ fontWeight: 700, fontSize: 16, color: "#0F2044", marginTop: 8, marginBottom: 4 }}>
          {session.title}
        </div>
        {session.host_name && (
          <div style={{ color: "#6B7280", fontSize: 13 }}>with {session.host_name}</div>
        )}
        {session.description && (
          <div
            style={{
              color: "#6B7280",
              fontSize: 12,
              marginTop: 6,
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {session.description}
          </div>
        )}

        <div
          style={{
            background: "#F7FAFC",
            margin: "12px -16px 0",
            padding: "10px 16px",
            borderTop: "0.5px solid #E2E6ED",
            display: "flex",
            flexWrap: "wrap",
            gap: 12,
            alignItems: "center",
            fontSize: 12,
            color: "#374151",
          }}
        >
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <CalendarIcon size={14} /> {formatSessionDate(session.session_date)}
          </span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <Clock size={14} /> {formatSessionTime(session.session_time)}
            {session.duration_minutes ? ` (${session.duration_minutes} mins)` : ""}
          </span>
          {soon && (
            <span
              style={{
                background: "#FEF3C7",
                color: "#92400E",
                fontSize: 11,
                fontWeight: 600,
                padding: "3px 8px",
                borderRadius: 999,
              }}
            >
              {days === 0 ? "Today" : days === 1 ? "Tomorrow" : `Starts in ${days} days`}
            </span>
          )}
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: 12,
          }}
        >
          <div style={{ fontWeight: 700, color: isFree ? "#16A34A" : "#0F2044" }}>
            {session.price_display ?? (isFree ? "Free for Plus & Max" : `£${session.price_amount}`)}
          </div>
          {booked ? (
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span
                style={{
                  background: "#DCFCE7",
                  color: "#166534",
                  padding: "4px 10px",
                  borderRadius: 999,
                  fontSize: 12,
                  fontWeight: 700,
                }}
              >
                ✓ Booked
              </span>
              <button
                type="button"
                onClick={onOpen}
                style={{ background: "transparent", border: 0, color: "#0F2044", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
              >
                View details →
              </button>
            </div>
          ) : full ? (
            <button
              type="button"
              onClick={onOpen}
              style={{
                border: "1px solid #CC2229",
                color: "#CC2229",
                background: "#fff",
                borderRadius: 8,
                padding: "8px 14px",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Join waitlist →
            </button>
          ) : (
            <button
              type="button"
              onClick={onOpen}
              style={{
                background: "#CC2229",
                color: "#fff",
                border: 0,
                borderRadius: 8,
                padding: "8px 14px",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Book now →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}