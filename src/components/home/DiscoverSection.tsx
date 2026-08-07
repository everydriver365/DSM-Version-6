import { useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  IconPlayerPlay,
  IconChevronRight,
  IconRadio,
  IconBook,
  IconShoppingBag,
  IconNews,
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



export function DiscoverSection({ unreadIds = [] }: { unreadIds?: string[] } = {}) {
  const navigate = useNavigate();
  const [live, setLive] = useState<LiveItem[]>([]);
  const [liveActive, setLiveActive] = useState(false);

  
  
  const [showcaseCount, setShowcaseCount] = useState<number | null>(null);
  const [listingCount, setListingCount] = useState<number | null>(null);
  const [newsCount, setNewsCount] = useState<number | null>(null);
  const [newsUnread, setNewsUnread] = useState(false);

  const [liveHero, setLiveHero] = useState<string | null>(null);
  const [showcaseHero, setShowcaseHero] = useState<string | null>(null);
  const [marketplaceHero, setMarketplaceHero] = useState<string | null>(null);
  const [featuredListing, setFeaturedListing] = useState<{
    id: string;
    title: string | null;
    price_display: string | null;
    category: string | null;
  } | null>(null);
  const [newsHero, setNewsHero] = useState<string | null>(null);
  const [latestNewsTitle, setLatestNewsTitle] = useState<string | null>(null);
  const [latestNewsSource, setLatestNewsSource] = useState<string | null>(null);
  const [latestNewsDate, setLatestNewsDate] = useState<string | null>(null);


  useEffect(() => {
    let cancelled = false;
    (async () => {
      // Showcase view count (table may not exist yet)
      try {
        const { data, error } = await supabase
          .from("showcase_videos" as never)
          .select("views");
        if (!cancelled && !error && Array.isArray(data)) {
          const total = (data as { views?: number | null }[]).reduce(
            (sum, r) => sum + (r.views ?? 0),
            0,
          );
          setShowcaseCount(total);
        }
      } catch {
        /* table may not exist */
      }

      try {
        const { count, error } = await supabase
          .from("marketplace_listings")
          .select("id", { count: "exact", head: true })
          .eq("is_active", true)
          .is("deleted_at", null);
        if (!cancelled && !error && count != null) setListingCount(count);
      } catch {
        /* ignore */
      }

      try {
        const { count, error } = await supabase
          .from("news_articles" as never)
          .select("id", { count: "exact", head: true });
        if (!cancelled && !error && count != null) setNewsCount(count);
        const lastVisit = localStorage.getItem("dsm_news_last_visit");
        if (lastVisit) {
          const { count: unread } = await supabase
            .from("news_articles" as never)
            .select("id", { count: "exact", head: true })
            .gt("fetched_at", lastVisit);
          if (!cancelled) setNewsUnread((unread ?? 0) > 0);
        } else if (!cancelled && (count ?? 0) > 0) {
          setNewsUnread(true);
        }
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);



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
        if (!cancelled && Array.isArray(data)) {
          setLive(data);
          const now = new Date();
          const twoHoursFromNow = new Date(now.getTime() + 2 * 60 * 60 * 1000);
          const isHighlighted = data.some((s) => {
            if (!s.session_date || !s.session_time) return false;
            const start = new Date(`${s.session_date}T${s.session_time}`);
            const end = new Date(start.getTime() + (s.duration_minutes ?? 60) * 60000);
            const isLive = now >= start && now <= end;
            const isSoon = start <= twoHoursFromNow && start >= now;
            return isLive || isSoon;
          });
          setLiveActive(isHighlighted);
        }
      } catch {
        /* ignore */
      }
    })();




    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    // DSM Live — latest session image
    supabase
      .from("dsm_live_sessions")
      .select("image_url")
      .not("image_url", "is", null)
      .is("deleted_at", null)
      .order("session_date", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => setLiveHero(data?.image_url ?? null));

    // DSM Showcase — latest reel thumbnail
    supabase
      .from("reels")
      .select("thumbnail_url")
      .not("thumbnail_url", "is", null)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .single()
      .then(({ data }) => setShowcaseHero(data?.thumbnail_url ?? null));

    // Marketplace — featured/latest listing
    supabase
      .from("marketplace_listings")
      .select("id, title, price_display, image_urls, marketplace_categories(name)")
      .eq("is_active", true)
      .is("deleted_at", null)
      .order("is_featured", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(1)
      .single()
      .then(({ data }) => {
        if (!data) return;
        const imgs = (data as { image_urls?: string[] | null }).image_urls;
        setMarketplaceHero(
          Array.isArray(imgs) && imgs.length > 0 ? imgs[0] : null,
        );
        setFeaturedListing({
          id: data.id,
          title: data.title ?? null,
          price_display: data.price_display ?? null,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          category: (data.marketplace_categories as any)?.name ?? null,
        });
      });

    // Industry News — latest article image
    supabase
      .from("news_articles")
      .select("image_url, title, source, published_at")
      .not("image_url", "is", null)
      .eq("is_hidden", false)
      .order("published_at", { ascending: false })
      .limit(1)
      .single()
      .then(({ data }) => {
        setNewsHero(data?.image_url ?? null);
        setLatestNewsTitle(data?.title ?? null);
        setLatestNewsSource(data?.source ?? null);
        setLatestNewsDate(
          data?.published_at
            ? new Date(data.published_at).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "short",
              })
            : null,
        );
      });

  }, []);

  const liveSorted = [...live].sort((a, b) => {
    const la = isLiveNow(a) ? 1 : 0;
    const lb = isLiveNow(b) ? 1 : 0;
    if (la !== lb) return lb - la;
    return startMs(a.session_date, a.session_time) - startMs(b.session_date, b.session_time);
  });




  // Re-render each minute so "Starts in X min" and the live window stay accurate.
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 60000);
    return () => clearInterval(id);
  }, []);






  const tileShell: React.CSSProperties = {
    background: "#fff",
    border: `0.5px solid ${HAIRLINE}`,
    borderRadius: 14,
    overflow: "hidden",
    cursor: "pointer",
    fontFamily: FONT,
  };

  const strip = (tint: string): React.CSSProperties => ({
    height: 46,
    background: tint,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0 10px",
  });

  const stripPill = (accent: string): React.CSSProperties => ({
    display: "inline-flex",
    alignItems: "center",
    gap: 3,
    background: "#FFFFFF",
    color: accent,
    fontSize: 9,
    fontWeight: 700,
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    borderRadius: 999,
    padding: "3px 7px",
    lineHeight: 1.2,
  });

  const tileLabelWrap: React.CSSProperties = { padding: "9px 12px 11px" };
  const tileTitle: React.CSSProperties = { fontSize: 12, fontWeight: 700, color: NAVY };
  const tileSub: React.CSSProperties = { fontSize: 10, color: "#6B7686", marginTop: 1 };
  const bodyRow: React.CSSProperties = {
    display: "flex",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 8,
  };


  return (
    <div style={{ margin: "0 -16px 0", padding: "0 16px 2px", borderRadius: 0, fontFamily: FONT }}>
      <div style={{ margin: "16px 0 10px" }}>
        <SectionHeader style={{ margin: 0 }}>Discover</SectionHeader>
      </div>

      <style>
        {`
          .dsm-discover-scroll::-webkit-scrollbar{display:none}
          @keyframes dsmLivePulse{0%{opacity:1}50%{opacity:.3}100%{opacity:1}}
          .dsm-live-pulse{animation:dsmLivePulse 1.4s ease infinite}
          @keyframes livePulse {
            0%, 100% { box-shadow: 0 0 0 3px rgba(204,34,41,0.15), 0 4px 16px rgba(204,34,41,0.2); }
            50% { box-shadow: 0 0 0 6px rgba(204,34,41,0.08), 0 4px 20px rgba(204,34,41,0.3); }
          }
          @keyframes dotPulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.3; }
          }
          .dsm-live-dot-pulse { animation: dotPulse 1s ease-in-out infinite; }
        `}
      </style>


      {/* A) MARKETPLACE BANNER */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => navigate({ to: "/marketplace" } as never)}
        style={{
          borderRadius: 16,
          overflow: "hidden",
          cursor: "pointer",
          position: "relative",
          marginBottom: 10,
          fontFamily: FONT,
        }}
      >
        {marketplaceHero && (
          <img
            src={marketplaceHero}
            alt=""
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
          />
        )}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(120deg, rgba(24,119,214,0.72), rgba(11,31,58,0.78))",
          }}
        />
        <div style={{ position: "relative", zIndex: 1, padding: 16 }}>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              background: "rgba(255,255,255,0.2)",
              borderRadius: 20,
              padding: "4px 10px",
              fontSize: 9,
              fontWeight: 700,
              color: "#fff",
              letterSpacing: "0.06em",
            }}
          >
            🛍 MARKETPLACE
          </span>
          <div
            style={{
              marginTop: 10,
              fontSize: 18,
              fontWeight: 800,
              color: "#fff",
              display: "-webkit-box",
              WebkitLineClamp: 1,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {featuredListing?.title ?? "Business Services"}
          </div>
          <div
            style={{
              marginTop: 4,
              marginBottom: 14,
              fontSize: 12,
              color: "rgba(255,255,255,0.85)",
            }}
          >
            {featuredListing
              ? `${featuredListing.category ?? "Services"} · ${featuredListing.price_display ?? "View marketplace"}`
              : "Explore marketplace →"}
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              navigate({ to: "/marketplace" } as never);
            }}
            style={{
              display: "inline-flex",
              alignItems: "center",
              background: "#fff",
              color: "#1877D6",
              fontSize: 12,
              fontWeight: 700,
              fontFamily: FONT,
              borderRadius: 20,
              padding: "6px 16px",
              border: "none",
              cursor: "pointer",
            }}
          >
            View marketplace →
          </button>
        </div>
      </div>

      {/* B) FOUR COMPACT CHIPS */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 8,
          marginBottom: 16,
        }}
      >
        {[
          {
            key: "live",
            label: "DSM Live",
            sub: "Webinars",
            icon: <IconRadio size={14} color={BLUE} stroke={2} />,
            bg: "#E6F1FB",
            onClick: () => navigate({ to: "/dsm-live" as never }),
            dot: liveActive ? RED : null,
          },
          {
            key: "bitesize",
            label: "Bitesize",
            sub: "CPD courses",
            icon: <IconBook size={14} color="#7C3AED" stroke={2} />,
            bg: "#EFE7FB",
            onClick: () => navigate({ to: "/bitesize" as never }),
            dot: null,
          },
          {
            key: "showcase",
            label: "Showcase",
            sub: "Community clips",
            icon: <IconPlayerPlay size={14} color={RED} stroke={2} />,
            bg: "#FCE9E9",
            onClick: () => navigate({ to: "/showcase" as never }),
            dot: (showcaseCount ?? 0) > 0 ? RED : null,
          },
          {
            key: "news",
            label: "News",
            sub: "Industry updates",
            icon: <IconNews size={14} color={BLUE} stroke={2} />,
            bg: "#E6F1FB",
            onClick: () => navigate({ to: "/news" as never }),
            dot: newsUnread ? RED : null,
          },
        ].map((chip) => (
          <div
            key={chip.key}
            role="button"
            tabIndex={0}
            onClick={chip.onClick}
            style={{
              position: "relative",
              background: "#fff",
              border: `1px solid ${HAIRLINE}`,
              borderRadius: 12,
              padding: "10px 4px 9px",
              textAlign: "center",
              cursor: "pointer",
              fontFamily: FONT,
            }}
          >
            {chip.dot && (
              <span
                style={{
                  position: "absolute",
                  top: 6,
                  right: 6,
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  background: chip.dot,
                }}
              />
            )}
            <span
              style={{
                width: 26,
                height: 26,
                borderRadius: 8,
                margin: "0 auto 6px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: chip.bg,
              }}
            >
              {chip.icon}
            </span>
            <div style={{ fontSize: 9.5, fontWeight: 700, color: NAVY }}>
              {chip.label}
            </div>
            <div style={{ fontSize: 8.5, color: "#9CA3AF", marginTop: 2 }}>
              {chip.sub}
            </div>
          </div>
        ))}
      </div>





    </div>
  );
}

export default DiscoverSection;
