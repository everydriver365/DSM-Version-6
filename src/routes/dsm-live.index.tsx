import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { tokens } from "@/lib/tokens";
import { useEffect, useMemo, useState } from "react";

import { toast } from "sonner";
import { IconBroadcast, IconMicrophone, IconPlayerPlay, IconSteeringWheel, IconUsers } from "@tabler/icons-react";
import DSMTopSheet from "@/components/dsm/DSMTopSheet";
import { supabase } from "@/lib/supabaseClient";
import {
  CATEGORIES,
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



  const poppins = "Poppins, sans-serif";

  return (
    <DSMTopSheet title="DSM Live">
      <div style={{ fontFamily: poppins }}>

      {/* Live status pill */}
      <div style={{ background: tokens.navy, padding: "0 16px 12px", display: "flex" }}>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            background: "rgba(255,255,255,0.1)",
            border: "0.5px solid rgba(255,255,255,0.25)",
            color: tokens.white,
            fontSize: tokens.fontSize.sm,
            fontWeight: tokens.fontWeight.medium,
            padding: "4px 12px",
            borderRadius: 999,
            fontFamily: poppins,
          }}
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: 999,
              background: "#16A34A",
              display: "inline-block",
            }}
          />
          Live
        </span>
      </div>


      {/* Hero */}
      <div style={{ padding: "16px 16px 18px" }}>
        <div
          style={{
            background: tokens.white,
            borderRadius: 8,
            border: "0.5px solid #E2E6ED",
            padding: 18,
            display: "flex",
            flexDirection: "row",
            gap: 14,
            alignItems: "flex-start",
          }}
        >
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 8,
              background: "#E6F1FB",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <IconBroadcast size={22} color="#1877D6" stroke={1.5} />

          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: tokens.fontSize.xl,
                fontWeight: tokens.fontWeight.medium,
                color: tokens.navy,
                marginBottom: 6,
                fontFamily: poppins,
              }}
            >
              DSM Live
            </div>
            <p
              style={{
                margin: 0,
                fontSize: tokens.fontSize.base,
                color: "#5A6270",
                lineHeight: 1.5,
                fontFamily: poppins,
              }}
            >
              Live coaching, CPD webinars and standards check prep
            </p>
          </div>
        </div>
      </div>

      {/* Category pills (horizontal scroll) */}
      <div
        style={{
          display: "flex",
          gap: 8,
          padding: "12px 16px",
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
                background: active ? "#0B1F3A" : "#FFFFFF",
                color: active ? "#FFFFFF" : "#0B1F3A",
                border: active ? "1px solid #0B1F3A" : "1px solid #E3E8F0",
                borderRadius: 999,
                padding: "8px 16px",
                fontSize: tokens.fontSize.base,
                fontWeight: active ? 500 : 400,
                fontFamily: poppins,
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              {label}
            </button>
          );
        })}
        {(() => {
          const active = view === "upcoming";
          return (
            <button
              type="button"
              onClick={() => setView(active ? "all" : "upcoming")}
              style={{
                flexShrink: 0,
                background: active ? "#0B1F3A" : "#FFFFFF",
                color: active ? "#FFFFFF" : "#0B1F3A",
                border: active ? "1px solid #0B1F3A" : "1px solid #E3E8F0",
                borderRadius: 999,
                padding: "8px 16px",
                fontSize: tokens.fontSize.base,
                fontWeight: active ? 500 : 400,
                fontFamily: poppins,
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              Upcoming
            </button>
          );
        })()}
      </div>


      {/* Sessions */}
      <div style={{ padding: 16 }}>
        <h2
          style={{
            margin: "0 0 12px",
            fontSize: 15,
            fontWeight: tokens.fontWeight.medium,
            color: tokens.navy,
            fontFamily: poppins,
          }}
        >
          Sessions
        </h2>





        {sessions === null ? null : filtered.length === 0 ? (
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
      <div id="podcasts" style={{ padding: 16 }}>
        <h2 style={{ margin: 0, fontSize: tokens.fontSize.lg, fontWeight: tokens.fontWeight.bold, color: "#0F2044", fontFamily: poppins }}>
          🎙️ DSM Podcast
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
    </DSMTopSheet>
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
        borderRadius: 8,
        padding: 20,
        margin: "12px 16px 16px",
      }}
    >
      <IconUsers color="#fff" size={28} style={{ marginBottom: 12 }} />
      <div style={{ color: "#fff", fontWeight: 900, fontSize: 18 }}>DSM Community</div>
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
            padding: 12,
            borderRadius: 8,
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
            padding: 12,
            borderRadius: 8,
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
        borderRadius: 8,
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
                borderRadius: 8,
                padding: "6px 12px",
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
                borderRadius: 8,
                padding: "6px 12px",
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
                borderRadius: 8,
                padding: "6px 12px",
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
  const s = session as LiveSession & {
    delivery_type?: string | null;
    image_url?: string | null;
    price_display?: string | null;
    price?: number | null;
  };

  const deliveryLabel = (() => {
    const raw = (s.delivery_type ?? "").toString().toLowerCase();
    if (raw.includes("zoom")) return "Zoom";
    if (raw.includes("team")) return "Teams";
    if (raw.includes("webinar")) return "Webinar";
    if (raw.includes("podcast")) return "Podcast";
    if (raw.includes("person") || raw.includes("in_person")) return "In person";
    return "Online";
  })();


  const priceLabel = (() => {
    if (s.price_display) return s.price_display;
    if (typeof s.price === "number") return s.price === 0 ? "Free" : `£${s.price.toFixed(2)}`;
    return null;
  })();
  const isFree = (priceLabel ?? "").toLowerCase() === "free";

  const timeLabel = (() => {
    if (!s.session_time) return null;
    const [hStr, mStr] = s.session_time.split(":");
    return `${String(Number(hStr)).padStart(2, "0")}:${(mStr ?? "00").slice(0, 2)}`;
  })();

  const durLabel = (() => {
    const m = s.duration_minutes ?? 0;
    if (!m) return null;
    if (m % 60 === 0) return `${m / 60}h`;
    if (m > 60) return `${Math.floor(m / 60)}h${m % 60}`;
    return `${m}m`;
  })();

  const dateLabel = (() => {
    if (!s.session_date) return null;
    try {
      return new Date(s.session_date + "T00:00:00").toLocaleDateString("en-GB", {
        weekday: "short",
        day: "numeric",
        month: "short",
      });
    } catch {
      return s.session_date;
    }
  })();

  return (
    <div
      onClick={onOpen}
      style={{
        background: tokens.white,
        border: "1px solid #E3E8F0",
        borderRadius: 8,
        padding: 12,
        marginBottom: 10,
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        cursor: "pointer",
        fontFamily: poppins,
      }}
    >
      {/* Time column */}
      <div style={{ width: 48, flexShrink: 0 }}>
        <div style={{ fontSize: tokens.fontSize.lg, fontWeight: tokens.fontWeight.bold, color: tokens.navy, lineHeight: 1.1 }}>
          {timeLabel ?? "--:--"}
        </div>
        {durLabel && (
          <div style={{ fontSize: 12, fontWeight: tokens.fontWeight.semibold, color: "#8792A2", marginTop: 2 }}>
            {durLabel}
          </div>
        )}
      </div>

      {/* Accent bar */}
      <div
        style={{
          width: 4,
          alignSelf: "stretch",
          minHeight: 44,
          borderRadius: 8,
          background: booked ? "#1D7A4C" : "#1877D6",
          flexShrink: 0,
        }}
      />

      {/* Details */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: tokens.fontSize.md,
            fontWeight: tokens.fontWeight.bold,
            color: tokens.navy,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {s.title}
        </div>
        <div
          style={{
            fontSize: 12,
            color: "#8792A2",
            marginTop: 2,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {[dateLabel, deliveryLabel].filter(Boolean).join(" · ")}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
          {priceLabel && (
            <span
              style={{
                fontSize: 12,
                fontWeight: tokens.fontWeight.semibold,
                color: isFree ? "#1D7A4C" : "#0B1F3A",
              }}
            >
              {priceLabel}
            </span>
          )}
          {booked && (
            <span
              style={{
                fontSize: 9,
                fontWeight: tokens.fontWeight.bold,
                letterSpacing: "0.02em",
                padding: "3px 7px",
                borderRadius: 8,
                background: "#E4F4EB",
                color: "#1D7A4C",
                textTransform: "uppercase",
              }}
            >
              Booked
            </span>
          )}
        </div>
      </div>

      {/* Hero image — far right */}
      <div
        style={{
          width: 76,
          height: 76,
          borderRadius: 8,
          flexShrink: 0,
          background: s.image_url ? `url(${s.image_url}) center/cover` : "#0B1F3A",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {!s.image_url && (
          <IconSteeringWheel size={26} color="rgba(255,255,255,0.4)" stroke={1.75} />
        )}
      </div>
    </div>
  );
}


