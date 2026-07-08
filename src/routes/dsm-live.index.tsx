import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Calendar as CalendarIcon, Clock, Video, Play, Users } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabaseClient";
import {
  CATEGORIES,
  categoryColor,
  formatSessionDate,
  formatSessionTime,
  daysUntil,
  type LiveSession,
} from "./dsm-live";

const SUPABASE_URL = "https://bjpqxfrihwjcqprmoqfs.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJqcHF4ZnJpaHdqY3Fwcm1vcWZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE0NzQ4MjEsImV4cCI6MjA5NzA1MDgyMX0.HKlgx3dxP3uxX9wMRRUnfb0IPwaBpFcut_iUgT5XFeo";

const AUTH_HEADERS = {
  apikey: SUPABASE_ANON_KEY,
  Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
};

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

export const Route = createFileRoute("/dsm-live/")({
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
        if (userId) {
          const res = await fetch(
            `${SUPABASE_URL}/rest/v1/dsm_live_bookings?instructor_id=eq.${userId}&status=eq.confirmed&select=session_id,status`,
            { headers: AUTH_HEADERS },
          );
          const rows = (await res.json()) as { session_id: string }[];
          if (!cancelled && Array.isArray(rows)) {
            setBookedIds(new Set(rows.map((r) => r.session_id)));
          }
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

  const sora = "'Sora', system-ui, -apple-system, sans-serif";
  const manrope = "'Manrope', system-ui, -apple-system, sans-serif";

  return (
    <div style={{ background: "#F3F8FF", minHeight: "calc(100vh - 80px)", fontFamily: manrope }}>
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
        <div style={{ fontWeight: 700, fontSize: 16, flex: 1, fontFamily: sora }}>DSM Live</div>
        <span
          style={{
            background: "#CC2229",
            color: "#fff",
            fontSize: 11,
            fontWeight: 700,
            padding: "4px 8px",
            borderRadius: 999,
            fontFamily: manrope,
          }}
        >
          🔴 LIVE
        </span>
      </div>

      <div
        style={{
          padding: "24px 20px 8px",
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }}
      >
        <h1 style={{ margin: 0, fontFamily: sora, fontSize: 24, fontWeight: 800, color: "#0F2044" }}>
          DSM Live
        </h1>
        <p style={{ margin: 0, fontSize: 13, color: "rgba(15,32,68,0.6)", lineHeight: 1.5 }}>
          Live coaching sessions, CPD webinars and standards check prep — join from anywhere.
        </p>
      </div>

      {/* Categories */}
      <div style={{ padding: "16px 20px 4px", display: "flex", flexDirection: "column", gap: 12 }}>
        <h2
          style={{
            margin: 0,
            fontSize: 11,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.15em",
            color: "rgba(15,32,68,0.6)",
            fontFamily: sora,
          }}
        >
          Categories
        </h2>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {CATEGORIES.map((c) => {
            const active = category === c;
            return (
              <button
                key={c}
                type="button"
                onClick={() => setCategory(c)}
                style={{
                  background: active ? "#1877D6" : "#FFFFFF",
                  color: active ? "#FFFFFF" : "#0F2044",
                  border: active ? "1px solid #1877D6" : "1px solid #E2E6ED",
                  borderRadius: 999,
                  padding: "10px 20px",
                  fontSize: 12,
                  fontWeight: active ? 600 : 500,
                  fontFamily: manrope,
                  cursor: "pointer",
                  boxShadow: active ? "0 4px 12px rgba(24,119,214,0.2)" : "none",
                }}
              >
                {c}
              </button>
            );
          })}
        </div>
      </div>

      {/* Sessions */}
      <div style={{ padding: "20px 20px 8px" }}>
        <h2 style={{ margin: "0 0 16px", fontSize: 18, fontWeight: 700, color: "#0F2044", fontFamily: sora }}>
          Upcoming Sessions
        </h2>
        {sessions === null ? null : filtered.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "48px 16px",
              color: "#6B7280",
              background: "#fff",
              border: "1px solid #E2E6ED",
              borderRadius: 16,
              boxShadow: "0 1px 2px rgba(15,32,68,0.04)",
            }}
          >
            <Video size={48} style={{ margin: "0 auto", opacity: 0.4 }} />
            <div style={{ fontWeight: 700, marginTop: 12, color: "#0F2044", fontFamily: sora }}>
              No sessions scheduled yet
            </div>
            <div style={{ fontSize: 13, marginTop: 4 }}>
              Check back soon — sessions are added regularly.
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {filtered.map((s) => (
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
            ))}
          </div>
        )}
      </div>

      <div id="podcasts" style={{ padding: "20px 20px 8px" }}>
        <h2 style={{ margin: "0 0 4px", fontSize: 18, fontWeight: 700, color: "#0F2044", fontFamily: sora }}>
          🎙️ DSM Podcast
        </h2>
        <div style={{ fontSize: 12, color: "rgba(15,32,68,0.5)", marginBottom: 16 }}>
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

      <CommunitySection />
    </div>
  );
}

function CommunitySection() {
  const [email, setEmail] = useState("");
  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast("You're on the list! We'll notify you when DSM Community launches.");
    setEmail("");
  };
  return (
    <div
      id="community"
      style={{
        background: "#0F2044",
        borderRadius: 16,
        padding: 20,
        margin: "12px 16px 16px",
      }}
    >
      <Users color="#fff" size={28} style={{ marginBottom: 12 }} />
      <div style={{ color: "#fff", fontWeight: 900, fontSize: 18 }}>DSM Community</div>
      <div
        style={{
          color: "rgba(255,255,255,0.7)",
          fontSize: 13,
          marginTop: 8,
          lineHeight: 1.5,
        }}
      >
        A dedicated forum for driving instructors — discuss standards checks, share tips, get
        business advice and connect with ADIs across the UK.
      </div>
      <div style={{ marginTop: 12 }}>
        <span
          style={{
            display: "inline-block",
            background: "#D97706",
            color: "#fff",
            fontSize: 12,
            fontWeight: 700,
            padding: "4px 12px",
            borderRadius: 999,
          }}
        >
          Coming soon
        </span>
      </div>
      <form onSubmit={onSubmit}>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Enter your email to be notified"
          style={{
            width: "100%",
            background: "rgba(255,255,255,0.1)",
            border: "1px solid rgba(255,255,255,0.2)",
            color: "#fff",
            padding: 12,
            borderRadius: 10,
            marginTop: 16,
            fontSize: 14,
            outline: "none",
            boxSizing: "border-box",
          }}
          className="community-email-input"
        />
        <style>{`.community-email-input::placeholder{color:rgba(255,255,255,0.4);}`}</style>
        <button
          type="submit"
          style={{
            width: "100%",
            background: "#CC2229",
            color: "#fff",
            fontWeight: 600,
            padding: 12,
            borderRadius: 10,
            marginTop: 8,
            border: 0,
            cursor: "pointer",
            fontSize: 14,
          }}
        >
          Notify me when it launches →
        </button>
      </form>
      <div
        style={{
          color: "rgba(255,255,255,0.4)",
          fontSize: 12,
          textAlign: "center",
          marginTop: 8,
        }}
      >
        No spam. Just a heads up when we launch.
      </div>
    </div>
  );
}

function PodcastCard({ podcast: p }: { podcast: Podcast }) {
  const navigate = useNavigate();
  const openUrl = (url: string) => window.open(url, "_blank", "noopener,noreferrer");
  const hasAny = p.spotify_url || p.apple_url || p.audio_url;
  const bandColor = "#CC2229";
  return (
    <div
      onClick={() => navigate({ to: "/dsm-live/podcast/$podcastId", params: { podcastId: p.id } })}
      style={{
        background: "#fff",
        border: "0.5px solid #E2E6ED",
        borderRadius: 16,
        overflow: "hidden",
        marginBottom: 12,
        boxShadow: "0 1px 2px rgba(15,32,68,0.04)",
        cursor: "pointer",
      }}
    >
      <div style={{ height: 6, background: bandColor, width: "100%" }} />
      <div
        style={{
          background: `${bandColor}12`,
          color: bandColor,
          fontSize: 10,
          fontWeight: 800,
          letterSpacing: "0.08em",
          padding: "6px 16px",
          textTransform: "uppercase",
          borderBottom: "0.5px solid #E2E6ED",
        }}
      >
        🎙️ PODCAST
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
              onClick={(e) => {
                e.stopPropagation();
                openUrl(p.spotify_url!);
              }}
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
              onClick={(e) => {
                e.stopPropagation();
                openUrl(p.apple_url!);
              }}
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
              onClick={(e) => {
                e.stopPropagation();
                openUrl(p.audio_url!);
              }}
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
  const spaceText = `${remaining} spaces left`;
  const spaceIsLow = remaining > 0 && remaining < 5;
  const isFree =
    !session.price_amount ||
    (session.price_display ?? "").toLowerCase().includes("free");

  const categoryGradient = (c: string | null): string => {
    if (!c) return "linear-gradient(135deg, #CC2229, #7A1419)";
    if (c.startsWith("Standards Check")) return "linear-gradient(135deg, #1877D6, #0F2044)";
    if (c.startsWith("Business Coaching")) return "linear-gradient(135deg, #16A34A, #14532D)";
    if (c.startsWith("CPD Webinar")) return "linear-gradient(135deg, #7C3AED, #4C1D95)";
    if (c.startsWith("New ADI")) return "linear-gradient(135deg, #D97706, #92400E)";
    if (c.startsWith("Q&A")) return "linear-gradient(135deg, #0891B2, #164E63)";
    return "linear-gradient(135deg, #CC2229, #7A1419)";
  };

  const hasImage = !!session.image_url;
  const topBackground = hasImage
    ? `url(${session.image_url})`
    : categoryGradient(session.category);
  const imagePosition = (session as any).image_position || "center center";

  const sora = "'Sora', system-ui, -apple-system, sans-serif";
  const manrope = "'Manrope', system-ui, -apple-system, sans-serif";

  return (
    <div
      onClick={onOpen}
      style={{
        background: "#fff",
        border: "1px solid #E2E6ED",
        borderRadius: 16,
        overflow: "hidden",
        boxShadow: "0 1px 2px rgba(15,32,68,0.04)",
        cursor: "pointer",
        fontFamily: manrope,
      }}
    >
      <div
        style={{
          height: 160,
          position: "relative",
          background: topBackground,
          backgroundSize: "cover",
          backgroundPosition: imagePosition,
          backgroundRepeat: "no-repeat",
        }}
      >
        {hasImage && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "linear-gradient(180deg, transparent 40%, rgba(0,0,0,0.5) 100%)",
            }}
          />
        )}
        <span
          style={{
            position: "absolute",
            top: 12,
            left: 12,
            background: "rgba(255,255,255,0.95)",
            color: "#0F2044",
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            padding: "5px 10px",
            borderRadius: 999,
            fontFamily: sora,
          }}
        >
          {session.category ?? "Session"}
        </span>

        <span
          style={{
            position: "absolute",
            top: 12,
            right: 12,
            background: "rgba(0,0,0,0.45)",
            color: spaceIsLow ? "#FCD34D" : "#fff",
            fontSize: 11,
            fontWeight: 600,
            padding: "5px 10px",
            borderRadius: 999,
          }}
        >
          {spaceText}
        </span>

        {session.host_name && (
          <span
            style={{
              position: "absolute",
              bottom: 12,
              left: 12,
              color: "rgba(255,255,255,0.92)",
              fontSize: 13,
              fontWeight: 500,
            }}
          >
            with {session.host_name}
          </span>
        )}

        {session.is_live && (
          <span
            style={{
              position: "absolute",
              bottom: 12,
              right: 12,
              background: "#CC2229",
              color: "#fff",
              fontSize: 11,
              fontWeight: 700,
              padding: "4px 10px",
              borderRadius: 999,
            }}
          >
            🔴 LIVE NOW
          </span>
        )}
      </div>

      <div style={{ padding: 16 }}>
        <div style={{ fontFamily: sora, fontWeight: 700, fontSize: 16, color: "#0F2044", marginBottom: 10, lineHeight: 1.3 }}>
          {session.title}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "rgba(15,32,68,0.6)", marginBottom: 6 }}>
          <CalendarIcon size={14} />
          {formatSessionDate(session.session_date)}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "rgba(15,32,68,0.6)", marginBottom: 6 }}>
          <Clock size={14} />
          {formatSessionTime(session.session_time)}
          {session.duration_minutes ? ` · ${session.duration_minutes} minutes` : ""}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "rgba(15,32,68,0.6)" }}>
          <Video size={14} />
          Zoom
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 14, paddingTop: 14, borderTop: "1px solid #E2E6ED" }}>
          <div
            style={{
              fontFamily: sora,
              fontWeight: 800,
              fontSize: 18,
              color: isFree ? "#16A34A" : "#CC2229",
            }}
          >
            {session.price_display ?? (isFree ? "Free" : `£${session.price_amount}`)}
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpen();
            }}
            style={{
              background: "#1877D6",
              color: "#fff",
              fontWeight: 600,
              fontSize: 13,
              padding: "10px 18px",
              borderRadius: 12,
              border: 0,
              cursor: "pointer",
              boxShadow: "0 4px 12px rgba(24,119,214,0.25)",
              fontFamily: manrope,
            }}
          >
            {booked ? "Booked ✓" : "Book now →"}
          </button>
        </div>
      </div>
    </div>
  );
}