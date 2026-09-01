import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { tokens } from "@/lib/tokens";
import { useEffect, useMemo, useState } from "react";

import { toast } from "@/lib/toast";
import {
  IconBroadcast,
  IconMicrophone,
  IconPlayerPlay,
  IconSteeringWheel,
  IconUsers,
  IconCalendarPlus,
} from "@tabler/icons-react";
import { supabase } from "@/lib/supabaseClient";
import {
  CATEGORIES,
  formatSessionDate,
  formatSessionTime,
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

function deliveryLabel(session: LiveSession): string {
  const raw = ((session as LiveSession & { delivery_type?: string | null }).delivery_type ?? "").toString().toLowerCase();
  if (raw.includes("zoom")) return "Zoom";
  if (raw.includes("team")) return "Teams";
  if (raw.includes("webinar")) return "Webinar";
  if (raw.includes("podcast")) return "Podcast";
  if (raw.includes("person") || raw.includes("in_person")) return "In person";
  return "Online";
}

function durationLabel(minutes: number | null): string | null {
  const m = minutes ?? 0;
  if (!m) return null;
  if (m % 60 === 0) return `${m / 60}h`;
  if (m > 60) return `${Math.floor(m / 60)}h ${m % 60}m`;
  return `${m}m`;
}

function priceLabel(session: LiveSession): string | null {
  const s = session as LiveSession & { price?: number | null; price_display?: string | null };
  if (s.price_display) return s.price_display;
  if (typeof s.price === "number") return s.price === 0 ? "Free" : `£${s.price.toFixed(2)}`;
  if (typeof session.price_amount === "number") {
    return session.price_amount === 0 ? "Free" : `£${session.price_amount.toFixed(2)}`;
  }
  return null;
}

function priceBadgeStyles(label: string | null): { text: string; background: string; color: string } {
  const raw = (label ?? "").toLowerCase();
  if (raw.includes("pro")) {
    return { text: "PRO", background: "#EAF5FC", color: "#2C97DE" };
  }
  if (raw.includes("free")) {
    return { text: "FREE", background: "#DCFCE7", color: "#16A34A" };
  }
  return { text: label ?? "Paid", background: "#FEF3C7", color: "#F59E0B" };
}

function categoryAccentColor(category: string | null | undefined): string {
  const raw = (category ?? "").toLowerCase();
  if (raw.includes("standards")) return "#2C97DE";
  if (raw.includes("business")) return "#7B61FF";
  if (raw.includes("cpd")) return "#E53935";
  if (raw.includes("coach")) return "#18A999";
  return "#F59E0B";
}

function addToCalendar(session: LiveSession) {
  const start = new Date(`${session.session_date}T${session.session_time || "00:00"}`);
  const end = new Date(start.getTime() + (session.duration_minutes ?? 60) * 60000);
  const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const ics = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
UID:${session.id}@dsmlive
DTSTAMP:${fmt(new Date())}
DTSTART:${fmt(start)}
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
  toast.success("Added to calendar");
}

function DsmLivePage() {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<LiveSession[] | null>(null);
  const [bookedIds, setBookedIds] = useState<Set<string>>(new Set());
  const [category, setCategory] = useState<string>("All");
  const [view, setView] = useState<"upcoming" | "all">("upcoming");
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
    let list = sessions;
    if (category !== "All") list = list.filter((s) => s.category === category);
    if (view === "upcoming") {
      const now = Date.now();
      list = list.filter((s) => {
        const dt = new Date(`${s.session_date}T${s.session_time || "00:00"}:00`).getTime();
        return Number.isFinite(dt) ? dt >= now : true;
      });
    }
    return list;
  }, [sessions, category, view]);

  const nextSession = useMemo(() => {
    if (!sessions) return null;
    const now = Date.now();
    return sessions.find((s) => {
      const dt = new Date(`${s.session_date}T${s.session_time || "00:00"}:00`).getTime();
      return Number.isFinite(dt) ? dt >= now : true;
    }) ?? null;
  }, [sessions]);

  const poppins = "Poppins, sans-serif";

  return (
    <div style={{ fontFamily: poppins, background: "#F4F6F8", minHeight: "100vh", paddingBottom: 24 }}>
      {/* Navy page title */}
      <div
        style={{
          background: "#0B2341",
          padding: "12px 16px 16px",
          textAlign: "center",
        }}
      >
        <h1
          style={{
            margin: 0,
            color: "#FFFFFF",
            fontSize: 18,
            fontWeight: 700,
            lineHeight: 1.25,
            fontFamily: "Sora, sans-serif",
          }}
        >
          EDP Live
        </h1>
        <p
          style={{
            margin: "6px 0 0",
            color: "rgba(255,255,255,0.5)",
            fontSize: 12,
            lineHeight: 1.4,
            fontFamily: poppins,
          }}
        >
          Live coaching, CPD webinars and standards check preparation.
        </p>
      </div>

      {/* Featured next session */}
      {nextSession && (
        <div
          style={{
            margin: 16,
            background: "linear-gradient(135deg, #0B2341, #1a3a6b)",
            borderRadius: 14,
            padding: 16,
            position: "relative",
            minHeight: 140,
            display: "flex",
            flexDirection: "column",
            justifyContent: "flex-end",
            fontFamily: poppins,
          }}
        >
          {/* NEXT SESSION badge */}
          <div
            style={{
              position: "absolute",
              top: 12,
              left: 12,
              background: "#E53935",
              color: "#FFFFFF",
              fontSize: 9,
              fontWeight: 700,
              borderRadius: 4,
              padding: "2px 8px",
              display: "flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            <span
              style={{
                width: 5,
                height: 5,
                borderRadius: "50%",
                background: "#FFFFFF",
                display: "inline-block",
              }}
            />
            NEXT SESSION
          </div>

          {/* Price badge */}
          {(() => {
            const p = priceLabel(nextSession);
            if (!p) return null;
            const styles = priceBadgeStyles(p);
            return (
              <div
                style={{
                  position: "absolute",
                  top: 12,
                  right: 12,
                  background: "rgba(255,255,255,0.15)",
                  color: "#FFFFFF",
                  fontSize: 10,
                  borderRadius: 4,
                  padding: "2px 8px",
                }}
              >
                {styles.text}
              </div>
            );
          })()}

          {/* Date / format / duration */}
          <div
            style={{
              color: "rgba(255,255,255,0.5)",
              fontSize: 11,
              marginBottom: 4,
            }}
          >
            {[
              formatSessionDate(nextSession.session_date),
              deliveryLabel(nextSession),
              durationLabel(nextSession.duration_minutes),
            ]
              .filter(Boolean)
              .join(" · ")}
          </div>

          {/* Title */}
          <div
            style={{
              color: "#FFFFFF",
              fontSize: 17,
              fontWeight: 700,
              lineHeight: 1.3,
              marginBottom: 12,
            }}
          >
            {nextSession.title}
          </div>

          {/* Bottom row */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ color: "#FFFFFF", fontSize: 22, fontWeight: 700 }}>
              {formatSessionTime(nextSession.session_time)}
            </div>
            <button
              type="button"
              onClick={() =>
                navigate({ to: "/dsm-live/$sessionId", params: { sessionId: nextSession.id } })
              }
              style={{
                background: "#2C97DE",
                color: "#FFFFFF",
                fontSize: 13,
                fontWeight: 700,
                borderRadius: 8,
                padding: "8px 18px",
                border: "none",
                cursor: "pointer",
                fontFamily: poppins,
              }}
            >
              {bookedIds.has(nextSession.id) ? "Booked" : "Book / Join"}
            </button>
            <button
              type="button"
              aria-label="Add to calendar"
              onClick={() => addToCalendar(nextSession)}
              style={{
                width: 36,
                height: 36,
                borderRadius: "50%",
                background: "rgba(255,255,255,0.1)",
                border: "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
              }}
            >
              <IconCalendarPlus size={16} color="#FFFFFF" />
            </button>
          </div>
        </div>
      )}

      {/* Category filter pills */}
      <div
        style={{
          display: "flex",
          gap: 6,
          padding: "0 16px 14px",
          overflowX: "auto",
          flexWrap: "nowrap",
          scrollbarWidth: "none",
        }}
        className="dsm-hide-scrollbar"
      >
        <style>{`.dsm-hide-scrollbar::-webkit-scrollbar{display:none;}`}</style>
        {CATEGORIES.map((c) => {
          const active = category === c;
          const label =
            c === "All" ? "All" : c.charAt(0).toUpperCase() + c.slice(1).toLowerCase();
          return (
            <button
              key={c}
              type="button"
              onClick={() => setCategory(c)}
              style={{
                flexShrink: 0,
                background: active ? "#0B2341" : "#FFFFFF",
                color: active ? "#FFFFFF" : "#536579",
                border: active ? "none" : "0.5px solid #E4E8EF",
                borderRadius: 20,
                padding: "5px 14px",
                fontSize: 11,
                fontWeight: active ? 700 : 500,
                fontFamily: poppins,
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* Upcoming sessions */}
      <div style={{ padding: "0 16px" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "0 0 10px",
          }}
        >
          <h2
            style={{
              margin: 0,
              fontSize: 13,
              fontWeight: 700,
              color: "#0B2341",
              fontFamily: poppins,
            }}
          >
            {view === "upcoming" ? "Upcoming sessions" : "All sessions"}
          </h2>
          <button
            type="button"
            onClick={() => setView(view === "upcoming" ? "all" : "upcoming")}
            style={{
              fontSize: 11,
              color: "#2C97DE",
              fontWeight: 500,
              background: "transparent",
              border: "none",
              padding: 0,
              cursor: "pointer",
              fontFamily: poppins,
            }}
          >
            {view === "upcoming" ? "View calendar →" : "Upcoming only →"}
          </button>
        </div>

        {sessions === null ? (
          <div style={{ textAlign: "center", padding: "32px 16px", color: "#B0BAC9", fontSize: 13 }}>
            Loading sessions…
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "32px 16px", color: "#B0BAC9", fontSize: 13 }}>
            {view === "upcoming" ? "No upcoming sessions" : "No sessions found"}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column" }}>
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

      {/* Podcasts */}
      <div id="podcasts" style={{ padding: 16, marginTop: 16 }}>
        <h2 style={{ margin: 0, fontSize: tokens.fontSize.lg, fontWeight: tokens.fontWeight.bold, color: "#0F2044", fontFamily: poppins }}>
          🎙️ EDP Podcast
        </h2>
        <div style={{ fontSize: 12, color: tokens.textMuted, marginTop: 2, marginBottom: 16 }}>
          Latest episodes
        </div>
        {podcasts.length === 0 ? (
          <div style={{ color: tokens.textMuted, fontSize: tokens.fontSize.base, padding: "12px 0" }}>
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
    toast("You're on the list! We'll notify you when EDP Community launches.");
    setEmail("");
  };
  return (
    <div
      id="community"
      style={{
        background: "#0F2044",
        borderRadius: tokens.radiusCard,
        padding: 16,
        margin: "12px 16px 16px",
      }}
    >
      <IconUsers color="#fff" size={28} style={{ marginBottom: 12 }} />
      <div style={{ color: "#fff", fontWeight: 900, fontSize: 18 }}>EDP Community</div>
      <div
        style={{
          color: "rgba(255,255,255,0.7)",
          fontSize: tokens.fontSize.base,
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
            background: "#B45309",
            color: "#fff",
            fontSize: 12,
            fontWeight: tokens.fontWeight.bold,
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
            padding: 16,
            borderRadius: tokens.radiusCard,
            marginTop: 16,
            fontSize: tokens.fontSize.md,
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
            background: tokens.red,
            color: "#fff",
            fontWeight: tokens.fontWeight.semibold,
            padding: 16,
            borderRadius: tokens.radiusCard,
            marginTop: 8,
            border: 0,
            cursor: "pointer",
            fontSize: tokens.fontSize.md,
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
  const poppins = "Poppins, sans-serif";
  const openUrl = (url: string) => window.open(url, "_blank", "noopener,noreferrer");
  const hasAny = p.spotify_url || p.apple_url || p.audio_url;

  return (
    <div
      onClick={() => navigate({ to: "/dsm-live/podcast/$podcastId", params: { podcastId: p.id } })}
      style={{
        background: "#fff",
        border: "0.5px solid #E2E6ED",
        borderRadius: tokens.radiusCard,
        padding: "14px 16px",
        marginBottom: 8,
        display: "flex",
        flexDirection: "row",
        cursor: "pointer",
        fontFamily: poppins,
      }}
    >
      {/* Left: image or placeholder */}
      <div
        style={{
          width: 56,
          height: 56,
          borderRadius: 8,
          background: p.image_url ? `url(${p.image_url}) center/cover` : "#0F2044",
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {!p.image_url && <IconMicrophone size={22} color="#FFFFFF" />}
      </div>

      {/* Right */}
      <div style={{ paddingLeft: 12, flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: tokens.fontSize.xs,
            fontWeight: tokens.fontWeight.bold,
            color: tokens.red,
            textTransform: "uppercase",
            letterSpacing: "0.04em",
          }}
        >
          {p.episode_number != null ? `EP ${p.episode_number}` : "EPISODE"}
        </div>
        <div
          style={{
            fontSize: tokens.fontSize.base,
            fontWeight: tokens.fontWeight.semibold,
            color: "#0F2044",
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {p.title}
        </div>
        {p.guest_name && (
          <div style={{ fontSize: 12, color: tokens.textMuted, marginTop: 2 }}>
            with {p.guest_name}
            {p.guest_title ? ` · ${p.guest_title}` : ""}
          </div>
        )}

        <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
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
                fontSize: 12,
                fontWeight: tokens.fontWeight.semibold,
                borderRadius: tokens.radiusCard,
                padding: "6px 16px",
                border: 0,
                cursor: "pointer",
                fontFamily: poppins,
              }}
            >
              Spotify
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
                fontSize: 12,
                fontWeight: tokens.fontWeight.semibold,
                borderRadius: tokens.radiusCard,
                padding: "6px 16px",
                border: 0,
                cursor: "pointer",
                fontFamily: poppins,
              }}
            >
              Apple
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
                background: "#0F2044",
                color: "#fff",
                fontSize: 12,
                fontWeight: tokens.fontWeight.semibold,
                borderRadius: tokens.radiusCard,
                padding: "6px 16px",
                border: 0,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                fontFamily: poppins,
              }}
            >
              <IconPlayerPlay size={12} /> IconPlayerPlay
            </button>
          )}
          {!hasAny && (
            <span style={{ color: tokens.textMuted, fontSize: 12, fontStyle: "italic" }}>
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
  const poppins = "Poppins, sans-serif";
  const accent = categoryAccentColor(session.category);
  const pLabel = priceLabel(session);
  const pBadge = priceBadgeStyles(pLabel);

  const dateLabel = (() => {
    if (!session.session_date) return null;
    try {
      return new Date(session.session_date + "T00:00:00").toLocaleDateString("en-GB", {
        weekday: "short",
        day: "numeric",
        month: "short",
      });
    } catch {
      return session.session_date;
    }
  })();

  const timeLabel = (() => {
    if (!session.session_time) return "--:--";
    const [hStr, mStr] = session.session_time.split(":");
    return `${String(Number(hStr)).padStart(2, "0")}:${(mStr ?? "00").slice(0, 2)}`;
  })();

  return (
    <div
      onClick={onOpen}
      style={{
        background: "#FFFFFF",
        border: "0.5px solid #E4E8EF",
        borderRadius: 12,
        padding: 14,
        marginBottom: 8,
        display: "flex",
        gap: 12,
        cursor: "pointer",
        fontFamily: poppins,
      }}
    >
      {/* Accent bar */}
      <div
        style={{
          width: 4,
          borderRadius: 2,
          background: accent,
          flexShrink: 0,
          alignSelf: "stretch",
          minHeight: 60,
        }}
      />

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            marginBottom: 4,
          }}
        >
          <span style={{ fontSize: 11, color: "#536579" }}>
            {[dateLabel, deliveryLabel(session)].filter(Boolean).join(" · ")}
          </span>
          {pLabel && (
            <span
              style={{
                fontSize: 9,
                fontWeight: 500,
                borderRadius: 4,
                padding: "1px 6px",
                background: pBadge.background,
                color: pBadge.color,
              }}
            >
              {pBadge.text}
            </span>
          )}
        </div>

        <div
          style={{
            fontSize: 14,
            fontWeight: 500,
            color: "#0B2341",
            marginBottom: 6,
            lineHeight: 1.3,
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {session.title}
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ fontSize: 20, fontWeight: 500, color: "#0B2341" }}>
            {timeLabel}
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpen();
            }}
            style={{
              background: "#FFFFFF",
              border: "0.5px solid #E4E8EF",
              borderRadius: 8,
              padding: "6px 14px",
              fontSize: 12,
              color: "#0B2341",
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: poppins,
            }}
          >
            {booked ? "Booked" : "Book / Join"}
          </button>
        </div>
      </div>
    </div>
  );
}
