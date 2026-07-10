import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Calendar as CalendarIcon,
  Clock,
  Video,
  Play,
  Users,
  ClipboardCheck,
  Car,
  Armchair,
  Mic,
  Presentation,
  MapPin,
} from "lucide-react";
import { toast } from "sonner";
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



  const poppins = "'Poppins', system-ui, -apple-system, sans-serif";

  return (
    <div style={{ background: "#F3F8FF", minHeight: "calc(100vh - 80px)", fontFamily: poppins }}>
      {/* Top bar */}
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
        <div style={{ fontWeight: 600, fontSize: 16, flex: 1, fontFamily: poppins }}>DSM Live</div>
        <span
          style={{
            background: "#CC2229",
            color: "#fff",
            fontSize: 11,
            fontWeight: 700,
            padding: "4px 12px",
            borderRadius: 999,
            fontFamily: poppins,
          }}
        >
          🔴 LIVE
        </span>
      </div>

      {/* Hero */}
      <div style={{ background: "#0F2044", padding: "16px 20px 24px" }}>
        <h1 style={{ margin: 0, fontFamily: poppins, fontSize: 24, fontWeight: 900, color: "#FFFFFF" }}>
          DSM Live
        </h1>
        <p style={{ margin: "4px 0 0", fontSize: 14, color: "rgba(255,255,255,0.6)", lineHeight: 1.5 }}>
          Live coaching, CPD webinars and standards check prep
        </p>
      </div>

      {/* Category pills (horizontal scroll) */}
      <div
        style={{
          display: "flex",
          gap: 8,
          padding: "12px 16px",
          overflowX: "auto",
          scrollbarWidth: "none",
        }}
        className="dsm-hide-scrollbar"
      >
        <style>{`.dsm-hide-scrollbar::-webkit-scrollbar{display:none;}`}</style>
        {CATEGORIES.map((c) => {
          const active = category === c;
          return (
            <button
              key={c}
              type="button"
              onClick={() => setCategory(c)}
              style={{
                flexShrink: 0,
                background: active ? "#1A52A0" : "#FFFFFF",
                color: active ? "#FFFFFF" : "#0F2044",
                border: active ? "0.5px solid #1A52A0" : "0.5px solid #E2E6ED",
                borderRadius: 20,
                padding: "8px 16px",
                fontSize: 12,
                fontWeight: 600,
                fontFamily: poppins,
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              {c}
            </button>
          );
        })}
      </div>

      {/* Sessions */}
      <div style={{ padding: 16 }}>
        <h2
          style={{
            margin: "0 0 12px",
            fontSize: 16,
            fontWeight: 700,
            color: "#0F2044",
            fontFamily: poppins,
          }}
        >
          Sessions
        </h2>

        {/* Upcoming / All toggle */}
        <div
          style={{
            display: "flex",
            background: "#FFFFFF",
            borderRadius: 12,
            padding: 3,
            boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
            marginBottom: 16,
            width: "100%",
          }}
        >
          {(["upcoming", "all"] as const).map((v) => {
            const active = view === v;
            return (
              <button
                key={v}
                type="button"
                onClick={() => setView(v)}
                style={{
                  flex: 1,
                  padding: "9px 4px",
                  fontSize: 13,
                  fontWeight: 600,
                  color: active ? "#FFFFFF" : "#8A94A6",
                  background: active ? "#1A52A0" : "transparent",
                  borderRadius: 9,
                  border: 0,
                  cursor: "pointer",
                  fontFamily: poppins,
                }}
              >
                {v === "upcoming" ? "Upcoming" : "All sessions"}
              </button>
            );
          })}
        </div>

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
        <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#0F2044", fontFamily: poppins }}>
          🎙️ DSM Podcast
        </h2>
        <div style={{ fontSize: 12, color: "#9CA3AF", marginTop: 2, marginBottom: 16 }}>
          Latest episodes
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
  const poppins = "'Poppins', system-ui, -apple-system, sans-serif";
  const openUrl = (url: string) => window.open(url, "_blank", "noopener,noreferrer");
  const hasAny = p.spotify_url || p.apple_url || p.audio_url;

  return (
    <div
      onClick={() => navigate({ to: "/dsm-live/podcast/$podcastId", params: { podcastId: p.id } })}
      style={{
        background: "#fff",
        border: "0.5px solid #E2E6ED",
        borderRadius: 12,
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
        {!p.image_url && <Mic size={22} color="#FFFFFF" />}
      </div>

      {/* Right */}
      <div style={{ paddingLeft: 12, flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 10,
            fontWeight: 700,
            color: "#CC2229",
            textTransform: "uppercase",
            letterSpacing: "0.04em",
          }}
        >
          {p.episode_number != null ? `EP ${p.episode_number}` : "EPISODE"}
        </div>
        <div
          style={{
            fontSize: 13,
            fontWeight: 600,
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
          <div style={{ fontSize: 12, color: "#9CA3AF", marginTop: 2 }}>
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
                fontWeight: 600,
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
                fontWeight: 600,
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
                fontWeight: 600,
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
              <Play size={12} /> Play
            </button>
          )}
          {!hasAny && (
            <span style={{ color: "#9CA3AF", fontSize: 12, fontStyle: "italic" }}>
              Coming soon
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// NOTE: LiveSession has no `delivery_type` field in the data model.
// Until the column is added, all delivery badges default to "Online" with a
// video icon. Wire this up once the field exists on dsm_live_sessions.
function SessionCard({
  session,
  booked,
  onOpen,
}: {
  session: LiveSession;
  booked: boolean;
  onOpen: () => void;
}) {
  const poppins = "'Poppins', system-ui, -apple-system, sans-serif";
  const s = session as LiveSession & {
    delivery_type?: string | null;
    image_url?: string | null;
    price_display?: string | null;
    price?: number | null;
    spaces?: number | null;
    spaces_available?: number | null;
  };

  // Category → gradient mapping.
  const gradient = (() => {
    const c = (s.category ?? "").toLowerCase();
    if (c.includes("standards")) return "linear-gradient(135deg, #1A52A0, #0F2044)";
    if (c.includes("business") || c.includes("coach")) return "linear-gradient(135deg, #16A34A, #14532D)";
    if (c.includes("cpd") || c.includes("webinar")) return "linear-gradient(135deg, #7C3AED, #4C1D95)";
    if (c.includes("new adi") || c.includes("adi support")) return "linear-gradient(135deg, #D97706, #92400E)";
    if (c.includes("q&a") || c.includes("qa") || c.includes("question")) return "linear-gradient(135deg, #0891B2, #164E63)";
    return "linear-gradient(135deg, #CC2229, #7A1419)";
  })();

  // Delivery badge — defaults to "Online" until delivery_type exists.
  const delivery = (() => {
    const raw = (s.delivery_type ?? "").toString().toLowerCase();
    if (raw.includes("zoom")) return { Icon: Video, label: "Zoom" };
    if (raw.includes("team")) return { Icon: Video, label: "Teams" };
    if (raw.includes("webinar")) return { Icon: Presentation, label: "Webinar" };
    if (raw.includes("podcast")) return { Icon: Mic, label: "Podcast" };
    if (raw.includes("person") || raw.includes("in-person") || raw.includes("in_person"))
      return { Icon: MapPin, label: "In person" };
    return { Icon: Video, label: "Online" };
  })();
  const DeliveryIcon = delivery.Icon;

  const dateLabel = (() => {
    if (!s.session_date) return "";
    try {
      const d = new Date(s.session_date + "T00:00:00");
      return d.toLocaleDateString("en-GB", {
        weekday: "long",
        day: "numeric",
        month: "long",
      });
    } catch {
      return s.session_date;
    }
  })();

  const timeLabel = (() => {
    if (!s.session_time) return "";
    const fmt = (h: number, m: number) => {
      const d = new Date();
      d.setHours(h, m, 0, 0);
      return d
        .toLocaleTimeString("en-GB", { hour: "numeric", minute: "2-digit", hour12: true })
        .replace(/\s/g, "")
        .toLowerCase();
    };
    try {
      const [hStr, mStr] = s.session_time.split(":");
      const h = Number(hStr);
      const m = Number(mStr);
      const start = fmt(h, m);
      if (s.duration_minutes && s.duration_minutes > 0) {
        return `${start} · ${s.duration_minutes} minutes`;
      }
      return start;
    } catch {
      return s.session_time;
    }
  })();

  const spacesLabel = (() => {
    const n = s.spaces_available ?? s.spaces;
    if (typeof n === "number" && Number.isFinite(n)) return `${n} spaces`;
    return null;
  })();

  const priceLabel = (() => {
    if (s.price_display) return s.price_display;
    if (typeof s.price === "number") {
      if (s.price === 0) return "Free";
      return `£${s.price.toFixed(2)}`;
    }
    return null;
  })();
  const isFree = priceLabel === "Free";

  const heroStyle: React.CSSProperties = s.image_url
    ? {
        height: 120,
        position: "relative",
        backgroundImage: `linear-gradient(rgba(0,0,0,0.35), rgba(0,0,0,0.35)), url(${s.image_url})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }
    : {
        height: 120,
        position: "relative",
        background: gradient,
      };

  return (
    <div
      onClick={onOpen}
      style={{
        background: "#FFFFFF",
        border: "0.5px solid #E2E6ED",
        borderRadius: 16,
        overflow: "hidden",
        marginBottom: 12,
        cursor: "pointer",
        fontFamily: poppins,
      }}
    >
      {/* Hero */}
      <div style={heroStyle}>
        {/* Top-left category */}
        {s.category && (
          <span
            style={{
              position: "absolute",
              top: 10,
              left: 10,
              background: "rgba(255,255,255,0.2)",
              color: "#FFFFFF",
              fontSize: 11,
              fontWeight: 600,
              padding: "3px 10px",
              borderRadius: 999,
              fontFamily: poppins,
            }}
          >
            {s.category}
          </span>
        )}
        {/* Top-right spaces */}
        {spacesLabel && (
          <span
            style={{
              position: "absolute",
              top: 10,
              right: 10,
              background: "rgba(0,0,0,0.3)",
              color: "#FFFFFF",
              fontSize: 11,
              padding: "3px 10px",
              borderRadius: 999,
              fontFamily: poppins,
            }}
          >
            {spacesLabel}
          </span>
        )}
        {/* Live badge */}
        {s.is_live && (
          <span
            style={{
              position: "absolute",
              bottom: 10,
              right: 10,
              background: "#CC2229",
              color: "#FFFFFF",
              fontSize: 11,
              fontWeight: 700,
              padding: "3px 10px",
              borderRadius: 999,
              fontFamily: poppins,
            }}
          >
            🔴 LIVE
          </span>
        )}
      </div>

      {/* Body */}
      <div style={{ padding: "14px 16px" }}>
        <div
          style={{
            fontSize: 15,
            fontWeight: 700,
            color: "#0F2044",
            marginBottom: 6,
            fontFamily: poppins,
          }}
        >
          {s.title}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
          <CalendarIcon size={14} color="#9CA3AF" />
          <span style={{ fontSize: 13, color: "#6B7280" }}>{dateLabel}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
          <Clock size={14} color="#9CA3AF" />
          <span style={{ fontSize: 13, color: "#6B7280" }}>{timeLabel}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <DeliveryIcon size={14} color="#9CA3AF" />
          <span style={{ fontSize: 13, color: "#6B7280" }}>{delivery.label}</span>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: 10,
          }}
        >
          {priceLabel ? (
            <span
              style={{
                fontSize: 15,
                fontWeight: 700,
                color: isFree ? "#16A34A" : "#0F2044",
                fontFamily: poppins,
              }}
            >
              {priceLabel}
            </span>
          ) : (
            <span />
          )}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpen();
            }}
            style={{
              background: booked ? "#16A34A" : "#CC2229",
              color: "#FFFFFF",
              fontSize: 12,
              fontWeight: 600,
              padding: "8px 16px",
              borderRadius: 12,
              border: 0,
              cursor: "pointer",
              fontFamily: poppins,
            }}
          >
            {booked ? "Booked ✓" : "Book now →"}
          </button>
        </div>
      </div>
    </div>
  );
}
