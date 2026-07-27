import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  IconVideo,
  IconPlayerPlayFilled,
  IconPlayerPlay,
  IconBroadcast,
  IconCalendar,
  IconChevronRight,
} from "@tabler/icons-react";
import { SectionHeader } from "@/components/dsm/SectionHeader";
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
  image_url: string | null;
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
        const today = new Date().toISOString().slice(0, 10);
        const res = await fetch(
          `${SUPABASE_URL}/rest/v1/dsm_live_sessions?deleted_at=is.null&status=eq.upcoming&session_date=gte.${today}&order=session_date.asc&order=session_time.asc&limit=10&select=id,title,session_date,session_time,duration_minutes,is_live,max_spaces,spaces_taken,image_url`,

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
          `${SUPABASE_URL}/rest/v1/marketplace_listings?is_active=eq.true&deleted_at=is.null&select=id,title,price_display,image_urls&order=is_featured.desc,created_at.desc&limit=10`,

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

  const liveSorted = [...live].sort((a, b) => {
    const la = isLiveNow(a) ? 1 : 0;
    const lb = isLiveNow(b) ? 1 : 0;
    if (la !== lb) return lb - la;
    return startMs(a.session_date, a.session_time) - startMs(b.session_date, b.session_time);
  });

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
          navigate({ to: "/dsm-live" as never })
        }
      >
        <div
          style={{
            position: "relative",
            width: HERO_W,
            flexShrink: 0,
            background: s.image_url
              ? `url(${s.image_url}) center/cover`
              : `linear-gradient(135deg, ${NAVY} 0%, ${BLUE} 100%)`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {!s.image_url && <IconVideo size={30} color="#FFFFFF" stroke={1.6} />}
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
          navigate({ to: "/marketplace" as never })
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

  const fmtTimeDay = (d: string, t: string) => {
    const ms = startMs(d, t);
    if (!ms) return "";
    const date = new Date(ms);
    const time = date
      .toLocaleTimeString("en-GB", { hour: "numeric", minute: "2-digit", hour12: true })
      .replace(/\s?(AM|PM|am|pm)$/i, (m) => m.trim().toLowerCase());
    const today = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(today.getDate() + 1);
    const same = (a: Date, b: Date) =>
      a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() &&
      a.getDate() === b.getDate();
    const day = same(date, today)
      ? "today"
      : same(date, tomorrow)
        ? "tomorrow"
        : date.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
    return `${time} ${day}`;
  };

  const StackMedia = ({
    height,
    width,
    front,
    children,
    badge,
  }: {
    height: number;
    width?: number;
    front: React.CSSProperties;
    children?: React.ReactNode;
    badge?: React.ReactNode;
  }) => (
    <div style={{ position: "relative", height, width, flexShrink: width ? 0 : undefined }}>
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 7,
          right: 0,
          height: height - 16,
          background: "#DCE4EE",
          borderRadius: 10,
        }}
      />
      <div
        style={{
          position: "absolute",
          top: 12,
          left: 0,
          right: 9,
          bottom: 0,
          borderRadius: 10,
          overflow: "hidden",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          ...front,
        }}
      >
        {children}
      </div>
      {badge}
    </div>
  );

  const cardShell: React.CSSProperties = {
    width: "calc(50% - 5px)",
    minWidth: "calc(50% - 5px)",
    flexShrink: 0,
    flexGrow: 0,
    background: "#FFFFFF",
    border: `1px solid ${HAIRLINE}`,
    borderRadius: 12,
    padding: 10,
    boxShadow: "0 2px 8px rgba(11,31,58,0.05)",
    cursor: "pointer",
    fontFamily: FONT,
    scrollSnapAlign: "start",
    display: "flex",
    flexDirection: "column",
  };

  const cardBtn = (label: string): React.CSSProperties => ({
    marginTop: 8,
    width: "100%",
    background: NAVY,
    color: "#FFFFFF",
    border: "none",
    borderRadius: 7,
    padding: "7px 0",
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: "0.04em",
    textTransform: "uppercase",
    fontFamily: FONT,
    cursor: "pointer",
  });

  const cardTitle: React.CSSProperties = {
    fontSize: 13,
    fontWeight: 600,
    color: NAVY,
    lineHeight: 1.25,
    display: "-webkit-box",
    WebkitLineClamp: 2,
    WebkitBoxOrient: "vertical",
    overflow: "hidden",
  };
  const cardSub: React.CSSProperties = {
    marginTop: 2,
    fontSize: 11,
    color: "#6B7A90",
    display: "-webkit-box",
    WebkitLineClamp: 1,
    WebkitBoxOrient: "vertical",
    overflow: "hidden",
  };

  const priceLabel = (m: MarketItem) => {
    const raw = (m.price_display ?? "").trim();
    if (!raw || !/\d/.test(raw)) return "Price on request";
    return raw.toLowerCase().startsWith("from") ? raw : `From ${raw}`;
  };

  return (
    <div style={{ padding: "0 0 22px", fontFamily: FONT }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <SectionHeader>Discover</SectionHeader>
        <button
          type="button"
          onClick={() => navigate({ to: "/discover" as never })}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 2,
            background: "none",
            border: "none",
            padding: 0,
            fontFamily: FONT,
            fontSize: 13,
            fontWeight: 600,
            color: BLUE,
            cursor: "pointer",
          }}
        >
          See more
          <IconChevronRight size={14} stroke={2.2} />
        </button>
      </div>

      <style>{`.dsm-discover-scroll::-webkit-scrollbar{display:none}`}</style>

      <div
        className="dsm-discover-scroll"
        style={{
          display: "flex",
          flexWrap: "nowrap",
          gap: 10,
          alignItems: "stretch",
          overflowX: "auto",
          WebkitOverflowScrolling: "touch",
          scrollSnapType: "x mandatory",
          scrollbarWidth: "none",
          msOverflowStyle: "none",
          padding: "0 0 4px",
        }}
      >
        {(() => {
          const liveCard = (s: LiveItem) => (
            <div
              key={`live-${s.id}`}
              role="button"
              tabIndex={0}
              onClick={() =>
                navigate({
                  to: "/dsm-live/$sessionId" as never,
                  params: { sessionId: s.id } as never,
                })
              }
              style={cardShell}
            >
              <StackMedia
                height={78}
                front={{
                  background: s.image_url
                    ? `#12539E url(${s.image_url}) center/cover`
                    : "linear-gradient(160deg, #2C6FD6 0%, #12539E 100%)",
                }}
                badge={
                  <span
                    style={{
                      position: "absolute",
                      top: 3,
                      left: 0,
                      background: RED,
                      color: "#FFFFFF",
                      fontSize: 9,
                      fontWeight: 700,
                      letterSpacing: "0.04em",
                      padding: "2px 6px",
                      borderRadius: 6,
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                      lineHeight: 1.2,
                    }}
                  >
                    <span
                      style={{
                        width: 4,
                        height: 4,
                        borderRadius: "50%",
                        background: "#FFFFFF",
                        display: "inline-block",
                      }}
                    />
                    LIVE
                  </span>
                }
              >
              {!s.image_url && <IconBroadcast size={18} color="#FFFFFF" stroke={1.9} />}
              </StackMedia>
              <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
                <div style={{ ...cardTitle, marginTop: 8 }}>{s.title}</div>
                <div style={cardSub}>{fmtTimeDay(s.session_date, s.session_time)}</div>
              </div>
              <button type="button" style={cardBtn("JOIN")}>
                Join
              </button>
            </div>
          );

          const marketCard = (m: MarketItem) => {
            const img = firstImage(m.image_urls);
            return (
              <div
                key={`market-${m.id}`}
                role="button"
                tabIndex={0}
                onClick={() =>
                  navigate({
                    to: "/marketplace_/$listingId" as never,
                    params: { listingId: m.id } as never,
                  })
                }
                style={cardShell}
              >
                <StackMedia
                  height={78}
                  front={{
                    background: img ? `#EEF2F7 url(${img}) center/cover` : "#EEF2F7",
                  }}
                />
                <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
                  <div style={{ ...cardTitle, marginTop: 8 }}>{m.title}</div>
                  <div style={cardSub}>{priceLabel(m)}</div>
                </div>
                <button type="button" style={cardBtn("VIEW")}>
                  View
                </button>
              </div>
            );
          };

          const nodes: React.ReactNode[] = [];
          const rounds = Math.max(liveSorted.length, market.length);
          for (let i = 0; i < rounds; i++) {
            const s = liveSorted[i];
            if (s) nodes.push(liveCard(s));
            const m = market[i];
            if (m) nodes.push(marketCard(m));
          }
          return nodes;
        })()}
      </div>

      {/* DSM Learn — horizontal scrollable tiles */}
      {playable.length > 0 && (
        <div
          style={{
            margin: "10px 0 0",
            display: "flex",
            flexWrap: "nowrap",
            gap: 10,
            alignItems: "stretch",
            overflowX: "auto",
            WebkitOverflowScrolling: "touch",
            scrollSnapType: "x mandatory",
            scrollbarWidth: "none",
            msOverflowStyle: "none",
            padding: "0 0 4px",
          }}
          className="dsm-discover-scroll"
        >
          {playable.map((v) => {
            const thumb = v.thumbnail_url || youtubeThumb(v.url);
            return (
              <div
                key={`learn-${v.id ?? v.title}`}
                role="button"
                tabIndex={0}
                onClick={() => {
                  if (v.url) window.open(v.url, "_blank", "noopener,noreferrer");
                  else navigate({ to: "/learn" as never });
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    if (v.url) window.open(v.url, "_blank", "noopener,noreferrer");
                    else navigate({ to: "/learn" as never });
                  }
                }}
                style={{
                  ...cardShell,
                  width: "calc(50% - 5px)",
                  minWidth: "calc(50% - 5px)",
                }}
              >
                <StackMedia
                  height={78}
                  front={{
                    background: thumb
                      ? `${NAVY} url(${thumb}) center/cover`
                      : "linear-gradient(160deg, #4A5568 0%, #0B1F3A 100%)",
                  }}
                  badge={
                    <span
                      style={{
                        position: "absolute",
                        top: 3,
                        left: 0,
                        background: NAVY,
                        color: "#FFFFFF",
                        fontSize: 9,
                        fontWeight: 700,
                        letterSpacing: "0.04em",
                        padding: "2px 6px",
                        borderRadius: 6,
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                        lineHeight: 1.2,
                      }}
                    >
                      <IconPlayerPlay size={10} color="#FFFFFF" stroke={2.2} />
                      LEARN
                    </span>
                  }
                >
                  {!thumb && <IconPlayerPlayFilled size={18} color="#FFFFFF" stroke={1.6} />}
                </StackMedia>
                <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
                  <div style={{ ...cardTitle, marginTop: 8 }}>{v.title}</div>
                  <div style={cardSub}>{v.duration ? `${v.duration} · DSM Learn` : "DSM Learn"}</div>
                </div>
                <button type="button" style={cardBtn("WATCH")}>
                  Watch
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}


export default DiscoverSection;
