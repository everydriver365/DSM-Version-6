import { useEffect, useState } from "react";
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
    width: 168,
    minWidth: 168,
    flexShrink: 0,
    flexGrow: 0,
    background: "#FFFFFF",
    border: `1px solid ${HAIRLINE}`,
    borderRadius: 12,
    overflow: "hidden",
    cursor: "pointer",
    fontFamily: FONT,
    scrollSnapAlign: "start",
    scrollSnapStop: "always",
    display: "flex",
    flexDirection: "column",
  };

  const cardTitle: React.CSSProperties = {
    fontSize: 13.5,
    fontWeight: 600,
    color: NAVY,
    lineHeight: 1.25,
    height: 34,
    display: "-webkit-box",
    WebkitLineClamp: 2,
    WebkitBoxOrient: "vertical",
    overflow: "hidden",
  };

  const priceLabel = (m: MarketItem) => {
    const raw = (m.price_display ?? "").trim();
    if (!raw || !/\d/.test(raw)) return "Price on request";
    return raw.toLowerCase().startsWith("from") ? raw : `From ${raw}`;
  };

  const splitPrice = (label: string): [string, string] => {
    const idx = label.indexOf("/");
    if (idx === -1) return [label, ""];
    return [label.slice(0, idx).trim(), label.slice(idx)];
  };

  const stripStyle: React.CSSProperties = {
    display: "flex",
    flexWrap: "nowrap",
    gap: 10,
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

  const listShell: React.CSSProperties = {
    marginTop: 10,
    background: "#FFFFFF",
    border: `1px solid ${HAIRLINE}`,
    borderRadius: 12,
    overflow: "hidden",
    fontFamily: FONT,
  };

  const listRow = (last: boolean): React.CSSProperties => ({
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: 10,
    cursor: "pointer",
    borderBottom: last ? "none" : `1px solid ${HAIRLINE}`,
    fontFamily: FONT,
  });

  const thumbStyle: React.CSSProperties = {
    width: 48,
    height: 48,
    borderRadius: 10,
    flexShrink: 0,
    border: `1px solid ${HAIRLINE}`,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  };

  const rowTitle: React.CSSProperties = {
    fontSize: 14,
    fontWeight: 600,
    color: NAVY,
    lineHeight: 1.25,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
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


  return (
    <div style={{ padding: "0 0 22px", fontFamily: FONT }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, margin: "16px 0 8px" }}>
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


      <style>{`.dsm-discover-scroll::-webkit-scrollbar{display:none}`}</style>

      <div className="dsm-discover-scroll" style={stripStyle}>

        {(() => {
          const marketCard = (m: MarketItem) => {
            const img = firstImage(m.image_urls);
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
                    height: 88,
                    background: img ? `#EEF2F7 url(${img}) center/cover` : "#EEF2F7",
                  }}
                />
                <div
                  style={{
                    padding: 10,
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                  }}
                >
                  <div style={cardTitle}>{m.title}</div>
                  <div
                    style={{
                      marginTop: "auto",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 6,
                    }}
                  >
                    <div style={{ minWidth: 0, overflow: "hidden" }}>
                      <span style={{ fontSize: 15, fontWeight: 700, color: NAVY }}>{amount}</span>
                      {unit && (
                        <span style={{ fontSize: 11, color: "#6B7A90", marginLeft: 1 }}>{unit}</span>
                      )}
                    </div>
                    <span
                      style={{
                        width: 22,
                        height: 22,
                        borderRadius: "50%",
                        background: "#FFFFFF",
                        border: `1px solid ${HAIRLINE}`,
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <IconChevronRight size={13} stroke={2.2} color={NAVY} />
                    </span>
                  </div>
                </div>
              </div>
            );
          };


          const nodes: React.ReactNode[] = market.map((m) => marketCard(m));
          nodes.push(
            <div
              key="scroll-spacer"
              aria-hidden="true"
              style={{ width: 20, flexShrink: 0 }}
            />
          );
          return nodes;
        })()}
      </div>

      {/* DSM Live — grouped rows */}
      {liveSorted.length > 0 && (
        <div style={listShell}>
          {liveSorted.map((s, idx) => {
            const nowLive = isLiveNow(s);
            const open = () =>
              navigate({
                to: "/dsm-live/$sessionId" as never,
                params: { sessionId: s.id } as never,
              });
            return (
              <div
                key={`live-${s.id}`}
                role="button"
                tabIndex={0}
                onClick={open}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") open();
                }}
                style={listRow(idx === liveSorted.length - 1)}
              >
                <div
                  style={{
                    ...thumbStyle,
                    background: s.image_url
                      ? `${NAVY} url(${s.image_url}) center/cover`
                      : NAVY,
                  }}
                >
                  {!s.image_url && <IconBroadcast size={20} color="#FFFFFF" stroke={1.9} />}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    {unreadIds.includes(s.id) && <Dot size={8} />}
                    <div style={rowTitle}>{s.title}</div>
                  </div>
                  <div
                    style={{
                      marginTop: 2,
                      fontSize: 11,
                      color: "#6B7A90",
                      display: "flex",
                      alignItems: "center",
                      gap: 5,
                    }}
                  >
                    {nowLive && <Dot size={6} />}
                    <span>Live · {fmtTimeDay(s.session_date, s.session_time)}</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    open();
                  }}
                  style={{
                    background: NAVY,
                    color: "#FFFFFF",
                    border: "none",
                    borderRadius: 999,
                    padding: "8px 18px",
                    fontSize: 12,
                    fontWeight: 600,
                    fontFamily: FONT,
                    cursor: "pointer",
                    flexShrink: 0,
                  }}
                >
                  Join
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* DSM Learn — grouped rows */}
      {playable.length > 0 && (
        <div style={listShell}>
          {playable.map((v, i) => {
            const thumb = v.thumbnail_url || youtubeThumb(v.url);
            const open = () => {
              if (v.url) window.open(v.url, "_blank", "noopener,noreferrer");
              else navigate({ to: "/learn" as never });
            };
            return (
              <div
                key={`learn-${v.id ?? i}`}
                role="button"
                tabIndex={0}
                onClick={open}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") open();
                }}
                style={listRow(i === playable.length - 1)}
              >
                <div
                  style={{
                    ...thumbStyle,
                    background: thumb ? `#EEF2F7 url(${thumb}) center/cover` : "#EEF2F7",
                  }}
                >
                  {!thumb && <IconPlayerPlay size={18} color={MUTED} stroke={2} />}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    {v.id && unreadIds.includes(v.id) && <Dot size={8} />}
                    <div style={rowTitle}>{v.title}</div>
                  </div>
                  <div style={{ marginTop: 2, fontSize: 11, color: "#6B7A90" }}>
                    {v.duration ? `${v.duration} · DSM Learn` : "DSM Learn"}
                  </div>
                </div>
                <IconChevronRight size={20} stroke={2} color={MUTED} />
              </div>
            );
          })}
        </div>
      )}



    </div>
  );
}


export default DiscoverSection;
