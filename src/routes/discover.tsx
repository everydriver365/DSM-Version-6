import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { IconBroadcast, IconPlayerPlay, IconChevronRight } from "@tabler/icons-react";
import InstructorTopBar from "@/components/dsm/InstructorTopBar";
import { supabase } from "@/lib/supabaseClient";

export const Route = createFileRoute("/discover")({
  head: () => ({
    meta: [
      { title: "Discover — DSM" },
      {
        name: "description",
        content:
          "Live sessions, learning videos and marketplace listings for driving instructors, all in one place.",
      },
      { property: "og:title", content: "Discover — DSM" },
      {
        property: "og:description",
        content:
          "Live sessions, learning videos and marketplace listings for driving instructors, all in one place.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DiscoverPage,
});

const NAVY = "#0B1F3A";
const BLUE = "#1877D6";
const RED = "#CC2229";
const CANVAS = "#EEF2F7";
const HAIRLINE = "#E2E8F0";
const MUTED = "#8A94A3";
const FONT = "Poppins, Inter, sans-serif";
const SHADOW = "0 1px 3px rgba(0,0,0,0.06)";

const SUPABASE_URL = "https://bjpqxfrihwjcqprmoqfs.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJqcHF4ZnJpaHdqY3Fwcm1vcWZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE0NzQ4MjEsImV4cCI6MjA5NzA1MDgyMX0.HKlgx3dxP3uxX9wMRRUnfb0IPwaBpFcut_iUgT5XFeo";

const AUTH_HEADERS = {
  apikey: SUPABASE_ANON_KEY,
  Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
};

type LiveItem = {
  id: string;
  title: string;
  session_date: string;
  session_time: string;
  duration_minutes: number | null;
  is_live: boolean | null;
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
  if (!ms) return d;
  const date = new Date(ms);
  const today = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(today.getDate() + 1);
  const same = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
  const day = same(date, today)
    ? "Today"
    : same(date, tomorrow)
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

function SectionBlock({
  title,
  subtitle,
  actionLabel,
  onAction,
  children,
}: {
  title: string;
  subtitle: string;
  actionLabel: string;
  onAction: () => void;
  children: React.ReactNode;
}) {
  return (
    <section style={{ margin: "24px 16px 0" }}>
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 10,
          marginBottom: 10,
        }}
      >
        <div style={{ minWidth: 0 }}>
          <h2
            style={{
              margin: 0,
              fontSize: 17,
              fontWeight: 700,
              color: NAVY,
              letterSpacing: "-0.01em",
              fontFamily: FONT,
            }}
          >
            {title}
          </h2>
          <p style={{ margin: "2px 0 0", fontSize: 12, color: MUTED, fontFamily: FONT }}>
            {subtitle}
          </p>
        </div>
        <button
          type="button"
          onClick={onAction}
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
            flexShrink: 0,
          }}
        >
          {actionLabel}
          <IconChevronRight size={14} stroke={2.2} />
        </button>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>{children}</div>
    </section>
  );
}

function Row({
  onClick,
  media,
  badge,
  title,
  meta,
  cta,
}: {
  onClick: () => void;
  media: React.CSSProperties;
  badge?: React.ReactNode;
  title: string;
  meta: string;
  cta: string;
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
        borderRadius: 14,
        boxShadow: SHADOW,
        padding: 10,
        display: "flex",
        alignItems: "center",
        gap: 12,
        cursor: "pointer",
        fontFamily: FONT,
      }}
    >
      <div
        style={{
          position: "relative",
          width: 68,
          height: 52,
          flexShrink: 0,
          borderRadius: 10,
          overflow: "hidden",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          ...media,
        }}
      >
        {badge}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 14,
            fontWeight: 600,
            color: NAVY,
            lineHeight: 1.25,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {title}
        </div>
        <div
          style={{
            marginTop: 2,
            fontSize: 11.5,
            color: "#6B7A90",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {meta}
        </div>
      </div>
      <span
        style={{
          background: NAVY,
          color: "#FFFFFF",
          borderRadius: 7,
          padding: "7px 12px",
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: "0.04em",
          textTransform: "uppercase",
          flexShrink: 0,
        }}
      >
        {cta}
      </span>
    </div>
  );
}

function Empty({ label }: { label: string }) {
  return (
    <div
      style={{
        border: `1px dashed ${HAIRLINE}`,
        borderRadius: 14,
        padding: "18px 12px",
        textAlign: "center",
        fontFamily: FONT,
        fontSize: 12.5,
        color: MUTED,
      }}
    >
      {label}
    </div>
  );
}

function TabBar({
  active,
  onChange,
  counts,
}: {
  active: "live" | "learn" | "market";
  onChange: (tab: "live" | "learn" | "market") => void;
  counts: Record<"live" | "learn" | "market", number>;
}) {
  const tabs: { id: "live" | "learn" | "market"; label: string }[] = [
    { id: "live", label: "Live" },
    { id: "learn", label: "Learn" },
    { id: "market", label: "Marketplace" },
  ];
  return (
    <div
      style={{
        display: "flex",
        gap: 6,
        padding: "12px 16px 0",
        fontFamily: FONT,
      }}
    >
      {tabs.map((t) => {
        const isActive = active === t.id;
        const count = counts[t.id];
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => onChange(t.id)}
            style={{
              flex: 1,
              padding: "10px 8px",
              borderRadius: 10,
              border: "none",
              background: isActive ? NAVY : "#FFFFFF",
              color: isActive ? "#FFFFFF" : NAVY,
              fontFamily: FONT,
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              boxShadow: isActive ? "none" : SHADOW,
              borderWidth: isActive ? 0 : 1,
              borderStyle: "solid",
              borderColor: isActive ? "transparent" : HAIRLINE,
              transition: "background 0.15s, color 0.15s",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
            }}
          >
            {t.label}
            {count > 0 && (
              <span
                aria-label={`${count} items`}
                style={{
                  minWidth: 18,
                  height: 18,
                  padding: "0 5px",
                  borderRadius: 9,
                  background: isActive ? "rgba(255,255,255,0.22)" : "#EAF2FC",
                  color: isActive ? "#FFFFFF" : "#1877D6",
                  fontSize: 11,
                  fontWeight: 700,
                  lineHeight: "18px",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}


function DiscoverPage() {
  const navigate = useNavigate();
  const [live, setLive] = useState<LiveItem[]>([]);
  const [learn, setLearn] = useState<LearnItem[]>([]);
  const [market, setMarket] = useState<MarketItem[]>([]);
  const [activeTab, setActiveTab] = useState<"live" | "learn" | "market">("live");
  const liveRef = useRef<HTMLDivElement>(null);
  const learnRef = useRef<HTMLDivElement>(null);
  const marketRef = useRef<HTMLDivElement>(null);

  const scrollTo = (tab: "live" | "learn" | "market") => {
    const ref = { live: liveRef, learn: learnRef, market: marketRef }[tab];
    ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    setActiveTab(tab);
  };

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const today = new Date().toISOString().slice(0, 10);
        const res = await fetch(
          `${SUPABASE_URL}/rest/v1/dsm_live_sessions?deleted_at=is.null&status=eq.upcoming&session_date=gte.${today}&order=session_date.asc&order=session_time.asc&limit=4&select=id,title,session_date,session_time,duration_minutes,is_live,image_url`,
          { headers: AUTH_HEADERS },
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
          `${SUPABASE_URL}/rest/v1/marketplace_listings?is_active=eq.true&deleted_at=is.null&select=id,title,price_display,image_urls&order=is_featured.desc,created_at.desc&limit=4`,
          { headers: AUTH_HEADERS },
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
        .limit(4);
      if (!cancelled && !error && data) setLearn(data as LearnItem[]);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div style={{ minHeight: "100vh", background: CANVAS, paddingBottom: 96, fontFamily: FONT }}>
      <InstructorTopBar
        firstName=""
        pageTitle="Discover"
        onBack={() => navigate({ to: "/" as never })}
        onBell={() => navigate({ to: "/notifications" as never })}
        onPhone={() => navigate({ to: "/enquiries" as never })}
        onLiveTrack={() => navigate({ to: "/live" as never })}
        onMenu={() => navigate({ to: "/more" as never })}
        onMicPress={() => toast.info("Voice commands coming soon!")}
      />
      <div style={{ height: "calc(60px + env(safe-area-inset-top, 0px))" }} />

      <div style={{ padding: "8px 16px 0" }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, color: NAVY, margin: 0, lineHeight: 1.15 }}>
          Discover
        </h1>
        <p style={{ fontSize: 14, color: "#6B7A90", margin: "4px 0 0" }}>
          Live sessions, learning and the marketplace — all in one place.
        </p>
      </div>

      <TabBar
        active={activeTab}
        onChange={scrollTo}
        counts={{ live: live.length, learn: learn.length, market: market.length }}
      />


      {activeTab === "live" && (
        <div ref={liveRef} id="discover-live">
          <SectionBlock
            title="DSM Live"
            subtitle="Upcoming live sessions and podcasts"
            actionLabel="See all"
            onAction={() => navigate({ to: "/dsm-live" as never })}
          >
            {live.length === 0 && <Empty label="No upcoming live sessions right now." />}
            {live.map((s) => {
              const now = isLiveNow(s);
              return (
                <Row
                  key={s.id}
                  onClick={() => navigate({ to: "/dsm-live" as never })}
                  media={{
                    background: s.image_url
                      ? `#12539E url(${s.image_url}) center/cover`
                      : "linear-gradient(160deg, #2C6FD6 0%, #12539E 100%)",
                  }}
                  badge={
                    now ? (
                      <span
                        style={{
                          position: "absolute",
                          top: 4,
                          left: 4,
                          background: RED,
                          color: "#FFFFFF",
                          fontSize: 8.5,
                          fontWeight: 700,
                          letterSpacing: "0.04em",
                          padding: "2px 5px",
                          borderRadius: 5,
                        }}
                      >
                        LIVE
                      </span>
                    ) : !s.image_url ? (
                      <IconBroadcast size={18} color="#FFFFFF" stroke={1.9} />
                    ) : null
                  }
                  title={s.title}
                  meta={fmtWhen(s.session_date, s.session_time)}
                  cta="Join"
                />
              );
            })}
          </SectionBlock>
        </div>
      )}

      {activeTab === "learn" && (
        <div ref={learnRef} id="discover-learn">
          <SectionBlock
            title="DSM Learn"
            subtitle="Short guides and how-to videos"
            actionLabel="See all"
            onAction={() => navigate({ to: "/learn" as never })}
          >
            {learn.length === 0 && <Empty label="No videos available yet." />}
            {learn.map((v, i) => {
              const thumb = v.thumbnail_url || youtubeThumb(v.url);
              return (
                <Row
                  key={v.id ?? i}
                  onClick={() => navigate({ to: "/learn" as never })}
                  media={{
                    background: thumb
                      ? `${NAVY} url(${thumb}) center/cover`
                      : "linear-gradient(160deg, #4A5568 0%, #0B1F3A 100%)",
                  }}
                  badge={!thumb ? <IconPlayerPlay size={16} color="#FFFFFF" stroke={2} /> : null}
                  title={v.title}
                  meta={v.duration ? `${v.duration} · DSM Learn` : "DSM Learn"}
                  cta="Watch"
                />
              );
            })}
          </SectionBlock>
        </div>
      )}

      {activeTab === "market" && (
        <div ref={marketRef} id="discover-market">
          <SectionBlock
            title="DSM Marketplace"
            subtitle="Cars, kit and services for instructors"
            actionLabel="See all"
            onAction={() => navigate({ to: "/marketplace" as never })}
          >
            {market.length === 0 && <Empty label="No listings available right now." />}
            {market.map((m) => {
              const img = firstImage(m.image_urls);
              const raw = (m.price_display ?? "").trim();
              const price = !raw || !/\d/.test(raw)
                ? "Price on request"
                : raw.toLowerCase().startsWith("from")
                  ? raw
                  : `From ${raw}`;
              return (
                <Row
                  key={m.id}
                  onClick={() => navigate({ to: "/marketplace" as never })}
                  media={{ background: img ? `#EEF2F7 url(${img}) center/cover` : "#EEF2F7" }}
                  title={m.title}
                  meta={price}
                  cta="View"
                />
              );
            })}
          </SectionBlock>
        </div>
      )}
    </div>
  );
}

export default DiscoverPage;
