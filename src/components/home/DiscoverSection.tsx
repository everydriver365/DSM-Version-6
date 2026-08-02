import { useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  IconPlayerPlay,
  IconBroadcast,
  IconChevronRight,
} from "@tabler/icons-react";
import { SectionHeader } from "@/components/dsm/SectionHeader";
import { supabase } from "@/lib/supabaseClient";

const NAVY = "#0B1F3A";
const BLUE = "#1877D6";
const RED = "#CC2229";
const GREEN = "#3C9B5A";
const HAIRLINE = "#E1E7EF";
const MUTED = "#8A94A3";
const FONT = "Poppins, Inter, sans-serif";

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
  price_amount: number | null;
  image_urls: string[] | string | null;
  show_image?: boolean | null;
  is_featured?: boolean | null;
  created_at?: string | null;
  marketplace_categories?: { name: string | null; slug: string | null } | null;
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

export function DiscoverSection({ unreadIds = [] }: { unreadIds?: string[] } = {}) {
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
          `${SUPABASE_URL}/rest/v1/marketplace_listings?is_active=eq.true&deleted_at=is.null&select=id,title,price_display,price_amount,image_urls,show_image,is_featured,created_at,marketplace_categories(name,slug)&order=is_featured.desc,created_at.desc&limit=10`,
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

  const stripRef = useRef<HTMLDivElement | null>(null);
  const [activeCard, setActiveCard] = useState(0);

  const onStripScroll = () => {
    const el = stripRef.current;
    if (!el) return;
    const page = el.offsetWidth / 2;
    const idx = Math.round(el.scrollLeft / page);
    const pages = Math.max(1, Math.ceil(allItems.length / 2));
    setActiveCard(Math.max(0, Math.min(pages - 1, idx)));
  };

  const CATEGORY_ICONS: Record<string, string> = {
    dashcam: "📹",
    dashcams: "📹",
    websites: "🌐",
    website: "🌐",
    marketing: "📣",
    insurance: "🛡️",
    finance: "💷",
    vehicles: "🚗",
    cars: "🚗",
    training: "🎓",
    software: "💻",
    equipment: "🧰",
    accessories: "🧰",
  };

  const categoryIcon = (m: MarketItem) => {
    const slug = (m.marketplace_categories?.slug ?? "").toLowerCase();
    const name = (m.marketplace_categories?.name ?? "").toLowerCase();
    return CATEGORY_ICONS[slug] ?? CATEGORY_ICONS[name] ?? "🏷️";
  };

  const ribbonLabel = (m: MarketItem): string | null => {
    if (m.is_featured) return "Popular";
    if (m.created_at) {
      const age = Date.now() - new Date(m.created_at).getTime();
      if (age >= 0 && age < 14 * 24 * 60 * 60 * 1000) return "New";
    }
    return null;
  };

  const CARD_TONES = [
    { pillFg: BLUE, tint: "#EAF3FB" },
    { pillFg: "#067647", tint: "#E7F8EF" },
    { pillFg: "#6D3BD1", tint: "#F0EBFB" },
    { pillFg: "#B45309", tint: "#FDF1DF" },
  ];

  const priceLabel = (m: MarketItem) => {
    const raw = (m.price_display ?? "").trim();
    const hasDigit = /\d/.test(raw);
    if (hasDigit) {
      return raw.toLowerCase().startsWith("from") ? raw : `From ${raw}`;
    }
    if (m.price_amount != null) {
      const unit = raw ? `/${raw}` : "";
      return `£${m.price_amount}${unit}`;
    }
    return "Price on request";
  };

  const splitPrice = (label: string): [string, string] => {
    const idx = label.indexOf("/");
    if (idx === -1) return [label, ""];
    return [label.slice(0, idx).trim(), label.slice(idx)];
  };

  const Dot = ({ size }: { size: number }) => (
    <span
      style={{
        display: "inline-block",
        width: size,
        height: size,
        borderRadius: "50%",
        background: RED,
        flexShrink: 0,
      }}
    />
  );

  const cardShell: React.CSSProperties = {
    flex: "0 0 calc(50% - 4px)",
    minWidth: "calc(50% - 4px)",
    borderRadius: 14,
    border: "1px solid #E4E8EF",
    background: "#FFFFFF",
    overflow: "hidden",
    cursor: "pointer",
    fontFamily: FONT,
    scrollSnapAlign: "start",
    scrollSnapStop: "always",
    display: "flex",
    flexDirection: "column",
  };

  const cardTitle: React.CSSProperties = {
    fontSize: 13,
    fontWeight: 700,
    color: NAVY,
    lineHeight: 1.25,
    display: "-webkit-box",
    WebkitLineClamp: 1,
    WebkitBoxOrient: "vertical",
    overflow: "hidden",
  };

  const cardSub: React.CSSProperties = {
    fontSize: 11,
    fontWeight: 500,
    color: MUTED,
    lineHeight: 1.35,
    display: "-webkit-box",
    WebkitLineClamp: 2,
    WebkitBoxOrient: "vertical",
    overflow: "hidden",
  };

  const pillBase: React.CSSProperties = {
    position: "absolute",
    top: 4,
    left: 4,
    maxWidth: "calc(100% - 12px)",
    display: "inline-flex",
    alignItems: "center",
    gap: 3,
    borderRadius: 999,
    padding: "2px 5px",
    fontSize: 8,
    fontWeight: 700,
    letterSpacing: "0.04em",
    textTransform: "uppercase",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  };

  const stripStyle: React.CSSProperties = {
    display: "flex",
    flexWrap: "nowrap",
    gap: 8,
    alignItems: "stretch",
    overflowX: "auto",
    WebkitOverflowScrolling: "touch",
    scrollSnapType: "x mandatory",
    scrollPadding: "0px",
    overscrollBehaviorX: "contain",
    scrollbarWidth: "none",
    msOverflowStyle: "none",
    padding: "0 0 4px",
  };

  const cardBody: React.CSSProperties = {
    position: "relative",
    padding: "8px 10px 10px",
    flex: 1,
    display: "flex",
    flexDirection: "column",
    gap: 3,
    minHeight: 0,
  };

  // Sessions that are live now, or starting within the next 3 hours, jump to
  // the front of the strip and stick to the left edge while the user scrolls.
  const urgentLive = liveSorted.filter(isUrgentLive);
  const otherLive = liveSorted.filter((s) => !isUrgentLive(s));

  const allItems = [
    ...urgentLive.map((s) => ({ type: "live" as const, data: s, urgent: true })),
    ...market.map((m, i) => ({ type: "market" as const, marketIndex: i, data: m })),
    ...otherLive.map((s) => ({ type: "live" as const, data: s, urgent: false })),
    ...playable.map((v) => ({ type: "learn" as const, data: v })),
  ];


  return (
    <div style={{ margin: "0 -16px 0", padding: "0 16px 22px", borderRadius: 0, fontFamily: FONT }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          margin: "16px 0 10px",
        }}
      >
        <SectionHeader style={{ margin: 0 }}>Discover</SectionHeader>
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

      <style>
        {`.dsm-discover-scroll::-webkit-scrollbar{display:none}@keyframes dsmLivePulse{0%{opacity:1}50%{opacity:.3}100%{opacity:1}}.dsm-live-pulse{animation:dsmLivePulse 1.4s ease infinite}`}
      </style>

      <div
        className="dsm-discover-scroll"
        style={stripStyle}
        ref={stripRef}
        onScroll={onStripScroll}
      >
        {allItems.map((item, i) => {
          if (item.type === "market") {
            const m = item.data;
            const tone = CARD_TONES[item.marketIndex % CARD_TONES.length];
            const ribbon = ribbonLabel(m);
            const catName = ribbon ?? m.marketplace_categories?.name ?? "Marketplace";
            const photo = m.show_image === false ? null : firstImage(m.image_urls);
            const [amount, unit] = splitPrice(priceLabel(m));
            return (
              <div
                key={`market-${m.id}`}
                role="button"
                tabIndex={0}
                onClick={() =>
                  navigate({
                    to: "/marketplace/$listingId" as never,
                    params: { listingId: m.id } as never,
                  })
                }
                style={cardShell}
              >
                <div
                  style={{
                    position: "relative",
                    height: 124,
                    flexShrink: 0,
                    background: tone.tint,
                    borderBottom: `1px solid ${HAIRLINE}`,
                    overflow: "hidden",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {photo && (
                    <img
                      src={photo}
                      alt=""
                      loading="lazy"
                      style={{
                        position: "absolute",
                        inset: 0,
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                      }}
                    />
                  )}
                  <span
                    style={{
                      ...pillBase,
                      zIndex: 1,
                      background: "rgba(255,255,255,0.95)",
                      color: tone.pillFg,
                    }}
                  >
                    <span style={{ fontSize: 11 }}>{categoryIcon(m)}</span>
                    {catName}
                  </span>
                </div>
                <div style={cardBody}>
                  <div style={cardTitle}>{m.title}</div>
                  <div style={cardSub}>
                    {amount}
                    {unit}
                  </div>
                </div>
              </div>
            );
          }

          if (item.type === "live") {
            const s = item.data;
            const nowLive = isLiveNow(s);
            const open = () =>
              navigate({
                to: "/dsm-live/$sessionId" as never,
                params: { sessionId: s.id } as never,
              });
            const unread = unreadIds.includes(s.id);
            return (
              <div
                key={`live-${s.id}`}
                role="button"
                tabIndex={0}
                onClick={open}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") open();
                }}
                style={cardShell}
              >
                <div
                  style={{
                    position: "relative",
                    height: 124,
                    flexShrink: 0,
                    background: NAVY,
                    borderBottom: `1px solid ${HAIRLINE}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    overflow: "hidden",
                  }}
                >
                  {s.image_url ? (
                    <img
                      src={s.image_url}
                      alt=""
                      loading="lazy"
                      style={{
                        position: "absolute",
                        inset: 0,
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                      }}
                    />
                  ) : (
                    <IconBroadcast size={18} color="#FFFFFF" stroke={1.8} />
                  )}
                  <span
                    style={{
                      ...pillBase,
                      zIndex: 1,
                      background: RED,
                      color: "#FFFFFF",
                    }}
                  >
                    <span className={nowLive ? "dsm-live-pulse" : undefined}>
                      <Dot size={4} />
                    </span>
                    Live
                  </span>
                </div>
                <div style={cardBody}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    {unread && <Dot size={6} />}
                    <div style={cardTitle}>{s.title}</div>
                  </div>
                  <div style={cardSub}>
                    {fmtTimeDay(s.session_date, s.session_time)} · DSM Live
                  </div>
                </div>
              </div>
            );
          }

          const v = item.data;
          const thumb = v.thumbnail_url || youtubeThumb(v.url);
          const open = () => {
            if (v.url) window.open(v.url, "_blank", "noopener,noreferrer");
            else navigate({ to: "/learn" as never });
          };
          const unread = v.id ? unreadIds.includes(v.id) : false;
          return (
            <div
              key={`learn-${v.id ?? i}`}
              role="button"
              tabIndex={0}
              onClick={open}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") open();
              }}
              style={cardShell}
            >
              <div
                style={{
                  position: "relative",
                  height: 124,
                  flexShrink: 0,
                  background: "#EEF2F7",
                  borderBottom: `1px solid ${HAIRLINE}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  overflow: "hidden",
                }}
              >
                {thumb ? (
                  <img
                    src={thumb}
                    alt=""
                    loading="lazy"
                    style={{
                      position: "absolute",
                      inset: 0,
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                    }}
                  />
                ) : (
                  <IconPlayerPlay size={15} color={MUTED} stroke={2} />
                )}
                <span
                  style={{
                    ...pillBase,
                    zIndex: 1,
                    background: GREEN,
                    color: "#FFFFFF",
                  }}
                >
                  Learn
                </span>
              </div>
              <div style={cardBody}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  {unread && <Dot size={6} />}
                  <div style={cardTitle}>{v.title}</div>
                </div>
                <div style={cardSub}>
                  {v.duration ? `${v.duration} · DSM Learn` : "Free · DSM Learn"}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {allItems.length > 2 && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            marginTop: 10,
          }}
        >
          {Array.from({ length: Math.ceil(allItems.length / 2) }).map((_, i) => {
            const active = i === activeCard;
            return (
              <span
                key={`dot-${i}`}
                aria-hidden="true"
                style={{
                  width: active ? 8 : 6,
                  height: active ? 8 : 6,
                  borderRadius: "50%",
                  background: active ? BLUE : "#D7DCE3",
                  transition: "all .18s ease",
                }}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

export default DiscoverSection;
