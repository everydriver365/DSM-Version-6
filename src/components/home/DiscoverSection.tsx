import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  IconVideo,
  IconPlayerPlayFilled,
  IconCalendar,
  IconChevronRight,
} from "@tabler/icons-react";
import { supabase } from "@/lib/supabaseClient";

const NAVY = "#0B1F3A";
const BLUE = "#1877D6";
const RED = "#CC2229";
const AMBER = "#D97706";
const HAIRLINE = "#E2E8F0";
const MUTED = "#8A94A3";
const FONT = "Poppins, Inter, sans-serif";
const RADIUS = 14;
const SHADOW = "0 1px 3px rgba(0,0,0,0.06)";
const HERO_W = 120;
const TILE_H = 110;

const SUPABASE_URL = "https://bjpqxfrihwjcqprmoqfs.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJqcHF4ZnJpaHdqY3Fwcm1vcWZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE0NzQ4MjEsImV4cCI6MjA5NzA1MDgyMX0.HKlgx3dxP3uxX9wMRRUnfb0IPwaBpFcut_iUgT5XFeo";

type LiveItem = {
  id: string;
  title: string;
  session_date: string;
  session_time: string;
  duration_minutes: number | null;
  is_live: boolean | null;
  max_spaces: number | null;
  spaces_taken: number | null;
};

type LearnItem = {
  id?: string;
  title: string;
  duration: string | null;
  url: string | null;
  thumbnail_url: string | null;
};

type MarketItem = {
  id: string;
  title: string;
  price_display: string | null;
  image_urls: string[] | string | null;
};

function startMs(d: string, t: string) {
  try {
    return new Date(`${d}T${(t || "00:00:00").slice(0, 8)}`).getTime();
  } catch {
    return 0;
  }
}

function isLiveNow(s: LiveItem) {
  if (s.is_live) return true;
  const start = startMs(s.session_date, s.session_time);
  if (!start) return false;
  const end = start + (s.duration_minutes ?? 60) * 60000;
  const now = Date.now();
  return now >= start && now < end;
}

function fmtWhen(d: string, t: string) {
  const ms = startMs(d, t);
  if (!ms) return `${d}`;
  const date = new Date(ms);
  const today = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(today.getDate() + 1);
  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
  const day = sameDay(date, today)
    ? "Today"
    : sameDay(date, tomorrow)
      ? "Tomorrow"
      : date.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  const time = date
    .toLocaleTimeString("en-GB", { hour: "numeric", minute: "2-digit", hour12: true })
    .replace(/\s?(AM|PM|am|pm)$/i, (m) => m.trim().toLowerCase());
  return `${day} · ${time}`;
}

function firstImage(v: string[] | string | null): string | null {
  if (!v) return null;
  if (Array.isArray(v)) return v[0] ?? null;
  try {
    const parsed = JSON.parse(v);
    if (Array.isArray(parsed)) return parsed[0] ?? null;
  } catch {
    /* not json */
  }
  return typeof v === "string" && v.startsWith("http") ? v : null;
}

function youtubeThumb(url: string | null | undefined): string | null {
  if (!url) return null;
  const m = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
  );
  return m ? `https://img.youtube.com/vi/${m[1]}/hqdefault.jpg` : null;
}

function dayOfYear(d: Date) {
  const start = new Date(d.getFullYear(), 0, 0);
  return Math.floor((d.getTime() - start.getTime()) / 86400000);
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2
      style={{
        margin: "0 0 12px",
        fontSize: 18,
        fontWeight: 600,
        color: NAVY,
        letterSpacing: "-0.01em",
        lineHeight: 1.2,
        fontFamily: FONT,
      }}
    >
      {children}
    </h2>
  );
}

function CategoryPill({ label, color }: { label: string; color: string }) {
  return (
    <span
      style={{
        position: "absolute",
        top: 6,
        left: 6,
        background: "rgba(255,255,255,0.92)",
        color,
        fontSize: 9.5,
        fontWeight: 700,
        textTransform: "uppercase",
        letterSpacing: "0.04em",
        padding: "2px 6px",
        borderRadius: 6,
        lineHeight: 1.2,
      }}
    >
      {label}
    </span>
  );
}

function TileShell({
  onClick,
  children,
}: {
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onClick();
      }}
      style={{
        background: "#FFFFFF",
        border: `1px solid ${HAIRLINE}`,
        borderRadius: RADIUS,
        boxShadow: SHADOW,
        overflow: "hidden",
        cursor: "pointer",
        display: "flex",
        minHeight: TILE_H,
        fontFamily: FONT,
      }}
    >
      {children}
    </div>
  );
}

function SeeMore({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      style={{
        marginTop: 6,
        background: "none",
        border: "none",
        padding: 0,
        textAlign: "left",
        fontFamily: FONT,
        fontSize: 11.5,
        fontWeight: 600,
        color: BLUE,
        cursor: "pointer",
        alignSelf: "flex-start",
      }}
    >
      {label} →
    </button>
  );
}

function TileBody({
  title,
  meta,
  seeMore,
  onSeeMore,
}: {
  title: string;
  meta: React.ReactNode;
  seeMore: string;
  onSeeMore: () => void;
}) {

  return (
    <div
      style={{
        flex: 1,
        minWidth: 0,
        padding: "10px 12px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          fontSize: 13,
          fontWeight: 600,
          color: NAVY,
          lineHeight: 1.25,
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
        }}
      >
        {title}
      </div>
      <div
        style={{
          marginTop: 4,
          fontSize: 11,
          color: MUTED,
          display: "flex",
          alignItems: "center",
          gap: 4,
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {meta}
      </div>
      <SeeMore label={seeMore} onClick={onSeeMore} />
    </div>
  );
}

function EmptyTile({ label }: { label: string }) {
  return (
    <div
      style={{
        border: `1px dashed ${HAIRLINE}`,
        borderRadius: RADIUS,
        minHeight: TILE_H,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: FONT,
        fontSize: 11.5,
        color: MUTED,
      }}
    >
      {label}
    </div>
  );
}

export function DiscoverSection() {
  const navigate = useNavigate();
  const [live, setLive] = useState<LiveItem[]>([]);
  const [learn, setLearn] = useState<LearnItem[]>([]);
  const [market, setMarket] = useState<MarketItem[]>([]);

  useEffect(() => {
    let cancelled = false;
    const headers = {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    };

    (async () => {
      try {
        const res = await fetch(
          `${SUPABASE_URL}/rest/v1/dsm_live_sessions?deleted_at=is.null&status=eq.upcoming&order=session_date.asc&limit=12&select=id,title,session_date,session_time,duration_minutes,is_live,max_spaces,spaces_taken`,
          { headers },
        );
        const data = (await res.json()) as LiveItem[];
        if (!cancelled && Array.isArray(data)) setLive(data);
      } catch {
        /* ignore */
      }
    })();

    (async () => {
      try {
        const res = await fetch(
          `${SUPABASE_URL}/rest/v1/marketplace_listings?is_active=eq.true&deleted_at=is.null&select=id,title,price_display,image_urls&order=is_featured.desc,created_at.desc&limit=1`,
          { headers },
        );
        const data = (await res.json()) as MarketItem[];
        if (!cancelled && Array.isArray(data)) setMarket(data);
      } catch {
        /* ignore */
      }
    })();

    (async () => {
      const { data, error } = await supabase
        .from("learn_videos")
        .select("id, title, duration, url, thumbnail_url")
        .not("url", "is", null)
        .order("sort_order", { ascending: true });
      if (!cancelled && !error && data) setLearn(data as LearnItem[]);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const liveTop = [...live].sort((a, b) => {
    const la = isLiveNow(a) ? 1 : 0;
    const lb = isLiveNow(b) ? 1 : 0;
    if (la !== lb) return lb - la;
    return startMs(a.session_date, a.session_time) - startMs(b.session_date, b.session_time);
  })[0];
  const marketTop = market[0];

  const playable = learn.filter((v) => !!v.url);
  const tip = playable.length
    ? playable[dayOfYear(new Date()) % playable.length]
    : null;

  const liveTile = (s: LiveItem) => {
    const nowLive = isLiveNow(s);
    const count = s.spaces_taken ?? 0;
    return (
      <TileShell
        onClick={() =>
          navigate({ to: "/dsm-live/$sessionId" as never, params: { sessionId: s.id } as never })
        }
      >
        <div
          style={{
            position: "relative",
            width: HERO_W,
            flexShrink: 0,
            background: `linear-gradient(135deg, ${NAVY} 0%, ${BLUE} 100%)`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <IconVideo size={30} color="#FFFFFF" stroke={1.6} />
          <CategoryPill label="Live" color={RED} />
          <span
            style={{
              position: "absolute",
              top: 6,
              right: 6,
              background: nowLive ? RED : BLUE,
              color: "#FFFFFF",
              fontSize: 9,
              fontWeight: 700,
              textTransform: "uppercase",
              padding: "2px 6px",
              borderRadius: 999,
              lineHeight: 1.2,
            }}
          >
            {nowLive ? "Now" : String(count)}
          </span>
        </div>
        <TileBody
          title={s.title}
          meta={
            <>
              <IconCalendar size={12} stroke={1.8} />
              <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>
                {fmtWhen(s.session_date, s.session_time)}
              </span>
            </>
          }
          seeMore="See all live sessions"
          onSeeMore={() => navigate({ to: "/dsm-live" as never })}
        />
      </TileShell>
    );
  };

  const marketTile = (m: MarketItem) => {
    const img = firstImage(m.image_urls);
    const priced = !!m.price_display;
    return (
      <TileShell
        onClick={() =>
          navigate({ to: "/marketplace/$listingId" as never, params: { listingId: m.id } as never })
        }
      >
        <div
          style={{
            position: "relative",
            width: HERO_W,
            flexShrink: 0,
            background: img ? `#EEF2F7 url(${img}) center/cover` : "#EEF2F7",
          }}
        >
          <CategoryPill label="Marketplace" color={NAVY} />
        </div>
        <TileBody
          title={m.title}
          meta={
            <span
              style={{
                fontWeight: 700,
                fontSize: 12,
                color: priced ? NAVY : AMBER,
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {priced ? m.price_display : "Coming soon"}
            </span>
          }
          seeMore="See all marketplace items"
          onSeeMore={() => navigate({ to: "/marketplace" as never })}
        />
      </TileShell>
    );
  };

  return (
    <div style={{ padding: "20px 0 22px", fontFamily: FONT }}>
      <SectionHeading>Discover</SectionHeading>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {liveTop ? liveTile(liveTop) : <EmptyTile label="Nothing right now" />}
        {marketTop ? marketTile(marketTop) : <EmptyTile label="Nothing right now" />}
      </div>

      {tip && (
        <div style={{ marginTop: 22 }}>
          <SectionHeading>Tip of the day</SectionHeading>
          <div
            role="button"
            tabIndex={0}
            onClick={() => navigate({ to: "/learn" as never })}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") navigate({ to: "/learn" as never });
            }}
            style={{
              background: "#FFFFFF",
              border: `1px solid ${HAIRLINE}`,
              borderRadius: RADIUS,
              boxShadow: SHADOW,
              padding: 10,
              display: "flex",
              alignItems: "center",
              gap: 10,
              cursor: "pointer",
            }}
          >
            {(() => {
              const thumb = tip.thumbnail_url || youtubeThumb(tip.url);
              return (
                <div
                  style={{
                    width: 52,
                    height: 52,
                    flexShrink: 0,
                    borderRadius: 10,
                    overflow: "hidden",
                    background: thumb ? `${NAVY} url(${thumb}) center/cover` : NAVY,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {!thumb && <IconPlayerPlayFilled size={18} color="#FFFFFF" />}
                </div>
              );
            })()}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: NAVY,
                  lineHeight: 1.25,
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                }}
              >
                {tip.title}
              </div>
              <div style={{ marginTop: 3, fontSize: 11, color: MUTED }}>
                {tip.duration ? `${tip.duration} · DSM Learn` : "DSM Learn"}
              </div>
            </div>
            <IconChevronRight size={18} color={MUTED} stroke={1.8} />
          </div>
        </div>
      )}
    </div>
  );
}

export default DiscoverSection;
