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
const HAIRLINE = "#E3E8F0";
const MUTED = "#8792A2";
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

function fmtTimeDay(d: string, t: string) {
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
}

const rowStyle: React.CSSProperties = {
  display: "flex",
  gap: 10,
  overflowX: "auto",
  WebkitOverflowScrolling: "touch",
  paddingBottom: 2,
  scrollbarWidth: "none",
  msOverflowStyle: "none",
};

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
          `${SUPABASE_URL}/rest/v1/marketplace_listings?is_active=eq.true&deleted_at=is.null&select=id,title,price_display,image_urls&order=is_featured.desc,created_at.desc&limit=6`,
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
        .order("sort_order", { ascending: true })
        .limit(6);
      if (!cancelled && !error && data) setLearn(data as LearnItem[]);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const liveSorted = [...live]
    .sort(
      (a, b) =>
        startMs(a.session_date, a.session_time) - startMs(b.session_date, b.session_time),
    )
    .slice(0, 12);

  const marketItems = market.slice(0, 6);
  const learnItems = learn.filter((v) => !!v.url).slice(0, 6);

  const navyBtn = (fontSize: number): React.CSSProperties => ({
    marginTop: "auto",
    width: "100%",
    background: NAVY,
    color: "#FFFFFF",
    border: "none",
    borderRadius: 8,
    padding: "7px 0",
    fontSize,
    fontWeight: 500,
    fontFamily: FONT,
    cursor: "pointer",
  });

  const oneLine: React.CSSProperties = {
    fontSize: 13,
    fontWeight: 500,
    color: NAVY,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  };

  return (
    <div style={{ padding: "0 0 22px", fontFamily: FONT }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
        }}
      >
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
            fontWeight: 500,
            color: BLUE,
            cursor: "pointer",
          }}
        >
          See more
          <IconChevronRight size={14} stroke={2.2} />
        </button>
      </div>

      <style>{`.dsm-discover-scroll::-webkit-scrollbar{display:none}`}</style>

      {/* 1. Marketplace */}
      {marketItems.length > 0 && (
        <div className="dsm-discover-scroll" style={rowStyle}>
          {marketItems.map((m) => {
            const img = firstImage(m.image_urls);
            const go = () =>
              navigate({
                to: "/marketplace_/$listingId" as never,
                params: { listingId: m.id } as never,
              });
            return (
              <div
                key={`market-${m.id}`}
                role="button"
                tabIndex={0}
                onClick={go}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") go();
                }}
                style={{
                  background: "#FFFFFF",
                  border: `1px solid ${HAIRLINE}`,
                  borderRadius: 14,
                  minWidth: 170,
                  flexShrink: 0,
                  overflow: "hidden",
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  fontFamily: FONT,
                }}
              >
                <div style={{ height: 90, background: "#EEF2F7" }}>
                  {img && (
                    <img
                      src={img}
                      alt={m.title}
                      loading="lazy"
                      style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                    />
                  )}
                </div>
                <div
                  style={{
                    padding: 11,
                    display: "flex",
                    flexDirection: "column",
                    flex: 1,
                    minWidth: 0,
                  }}
                >
                  <div style={oneLine}>{m.title}</div>
                  <div style={{ fontSize: 11, color: MUTED, marginTop: 2, marginBottom: 8 }}>
                    {m.price_display?.trim() ? m.price_display : "Price on request"}
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      go();
                    }}
                    style={navyBtn(12)}
                  >
                    View
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 2. Live */}
      {liveSorted.length > 0 && (
        <div className="dsm-discover-scroll" style={{ ...rowStyle, marginTop: 10 }}>
          {liveSorted.map((s) => {
            const go = () =>
              navigate({
                to: "/dsm-live/$sessionId" as never,
                params: { sessionId: s.id } as never,
              });
            return (
              <div
                key={`live-${s.id}`}
                role="button"
                tabIndex={0}
                onClick={go}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") go();
                }}
                style={{
                  background: "#FFFFFF",
                  border: `1px solid ${HAIRLINE}`,
                  borderRadius: 12,
                  minWidth: 160,
                  flexShrink: 0,
                  padding: "11px 13px",
                  display: "flex",
                  flexDirection: "column",
                  cursor: "pointer",
                  fontFamily: FONT,
                }}
              >
                <div style={{ display: "flex", gap: 9, alignItems: "flex-start" }}>
                  <div
                    style={{
                      position: "relative",
                      width: 32,
                      height: 32,
                      borderRadius: 8,
                      background: NAVY,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <IconBroadcast size={17} color="#FFFFFF" stroke={1.9} />
                    {isLiveNow(s) && (
                      <span
                        style={{
                          position: "absolute",
                          top: -2,
                          right: -2,
                          width: 6,
                          height: 6,
                          borderRadius: "50%",
                          background: RED,
                        }}
                      />
                    )}
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={oneLine}>{s.title}</div>
                    <div style={{ fontSize: 11, color: MUTED }}>
                      {fmtTimeDay(s.session_date, s.session_time)}
                    </div>
                  </div>
                </div>
                <div style={{ height: 10 }} />
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    go();
                  }}
                  style={navyBtn(11)}
                >
                  Join
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* 3. Learn */}
      {learnItems.length > 0 && (
        <div className="dsm-discover-scroll" style={{ ...rowStyle, marginTop: 10 }}>
          {learnItems.map((v, i) => (
            <div
              key={`learn-${v.id ?? i}`}
              role="button"
              tabIndex={0}
              onClick={() => navigate({ to: "/learn" as never })}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") navigate({ to: "/learn" as never });
              }}
              style={{
                background: "#FFFFFF",
                border: `1px solid ${HAIRLINE}`,
                borderRadius: 12,
                minWidth: 150,
                flexShrink: 0,
                padding: "11px 13px",
                display: "flex",
                flexDirection: "column",
                cursor: "pointer",
                fontFamily: FONT,
              }}
            >
              {v.thumbnail_url ? (
                <img
                  src={v.thumbnail_url}
                  alt={v.title}
                  loading="lazy"
                  style={{
                    width: "100%",
                    height: 90,
                    objectFit: "cover",
                    borderRadius: 8,
                    display: "block",
                  }}
                />
              ) : (
                <div
                  style={{
                    width: "100%",
                    height: 90,
                    borderRadius: 8,
                    background: "#EEF2F7",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <IconPlayerPlay size={20} color={MUTED} stroke={2} />
                </div>
              )}
              <div style={{ ...oneLine, marginTop: 8 }}>{v.title}</div>
              <div
                style={{
                  marginTop: 2,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 6,
                }}
              >
                <span
                  style={{
                    fontSize: 11,
                    color: MUTED,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {v.duration ? `${v.duration} · DSM Learn` : "DSM Learn"}
                </span>
                <IconChevronRight size={16} color={MUTED} stroke={2} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default DiscoverSection;
