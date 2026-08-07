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
import { supabase } from "@/lib/supabaseClient";

const NAVY = "#0B1F3A";
const BLUE = "#1877D6";
const RED = "#CC2229";
const HAIRLINE = "#E4E8EF";
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
  const liveRef = useRef<HTMLDivElement>(null);
  const [live, setLive] = useState<LiveItem[]>([]);
  const [liveActive, setLiveActive] = useState(false);

  const [liveCount, setLiveCount] = useState<number | null>(null);
  const [learnCount, setLearnCount] = useState<number | null>(null);
  const [bitesizeCount, setBitesizeCount] = useState<number | null>(null);
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
    supabase
      .from("dsm_live_sessions")
      .select("image_url")
      .not("image_url", "is", null)
      .is("deleted_at", null)
      .order("session_date", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => setLiveHero(data?.image_url ?? null));

    supabase
      .from("showcase_videos" as never)
      .select("thumbnail_url")
      .not("thumbnail_url", "is", null)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .single()
      .then(({ data }) =>
        setShowcaseHero(
          (data as { thumbnail_url?: string | null } | null)?.thumbnail_url ?? null,
        ),
      );

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

  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 60000);
    return () => clearInterval(id);
  }, []);

  const chipIconWrap: React.CSSProperties = {
    width: 28,
    height: 28,
    borderRadius: 8,
    margin: "0 auto 4px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  };

  const chipLabel: React.CSSProperties = {
    fontSize: 9,
    fontWeight: 700,
    color: NAVY,
  };

  const chipSub: React.CSSProperties = {
    fontSize: 8,
    color: "#9CA3AF",
    marginTop: 1,
  };

  return (
    <div style={{ margin: "0 -16px 0", padding: "0 16px 2px", borderRadius: 0, fontFamily: FONT }}>
      <div style={{ fontSize: 18, fontWeight: 700, color: NAVY, fontFamily: FONT, marginBottom: 10 }}>
        Discover
      </div>

      {/* ROW 1 — 4 COMPACT CHIPS */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 6,
          marginBottom: 8,
        }}
      >
        {/* DSM Live */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => liveRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
          style={{
            background: "#fff",
            border: `0.5px solid ${HAIRLINE}`,
            borderRadius: 10,
            padding: "8px 4px",
            textAlign: "center",
            cursor: "pointer",
            position: "relative",
          }}
        >
          {liveActive && (
            <span
              style={{
                position: "absolute",
                top: 5,
                right: 5,
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: RED,
              }}
            />
          )}
          <span style={{ ...chipIconWrap, background: "#E6F1FB" }}>
            <IconRadio size={14} color={BLUE} stroke={2} />
          </span>
          <div style={chipLabel}>Live</div>
          <div style={chipSub}>Events</div>
        </div>

        {/* DSM Learn */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => navigate({ to: "/learn" as never })}
          style={{
            background: "#fff",
            border: `0.5px solid ${HAIRLINE}`,
            borderRadius: 10,
            padding: "8px 4px",
            textAlign: "center",
            cursor: "pointer",
            position: "relative",
          }}
        >
          <span style={{ ...chipIconWrap, background: "#E0E7FF" }}>
            <IconPlayerPlay size={14} color="#4F46E5" stroke={2} />
          </span>
          <div style={chipLabel}>Learn</div>
          <div style={chipSub}>Videos</div>
        </div>

        {/* Bitesize */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => navigate({ to: "/bitesize" as never })}
          style={{
            background: "#fff",
            border: `0.5px solid ${HAIRLINE}`,
            borderRadius: 10,
            padding: "8px 4px",
            textAlign: "center",
            cursor: "pointer",
            position: "relative",
          }}
        >
          <span style={{ ...chipIconWrap, background: "#EFE7FB" }}>
            <IconBook size={14} color="#7C3AED" stroke={2} />
          </span>
          <div style={chipLabel}>Bitesize</div>
          <div style={chipSub}>5 min</div>
        </div>

        {/* Showcase */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => navigate({ to: "/showcase" as never })}
          style={{
            background: "#fff",
            border: `0.5px solid ${HAIRLINE}`,
            borderRadius: 10,
            padding: "8px 4px",
            textAlign: "center",
            cursor: "pointer",
            position: "relative",
          }}
        >
          {(showcaseCount ?? 0) > 0 && (
            <span
              style={{
                position: "absolute",
                top: 5,
                right: 5,
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: RED,
              }}
            />
          )}
          <span style={{ ...chipIconWrap, background: "#FCE9E9" }}>
            <IconPlayerPlay size={14} color={RED} stroke={2} />
          </span>
          <div style={chipLabel}>Showcase</div>
          <div style={chipSub}>Clips</div>
        </div>
      </div>

      {/* ROW 2 — MARKETPLACE HERO BANNER */}
      <div
        role="button"
        tabIndex={0}
        onClick={() =>
          navigate({
            to: featuredListing ? ("/marketplace/$listingId" as never) : ("/marketplace" as never),
            params: featuredListing ? ({ listingId: featuredListing.id } as never) : undefined,
          })
        }
        style={{
          width: "100%",
          marginBottom: 8,
          borderRadius: 14,
          overflow: "hidden",
          cursor: "pointer",
          position: "relative",
          background: "linear-gradient(120deg, #1C8A4B, #0F6E3A)",
          padding: 14,
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
              opacity: 0.2,
              zIndex: 0,
            }}
          />
        )}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundColor: NAVY,
            opacity: 0.82,
            zIndex: 1,
          }}
        />
        <div
          style={{
            position: "relative",
            zIndex: 2,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                display: "inline-block",
                background: "rgba(255,255,255,0.2)",
                borderRadius: 20,
                padding: "2px 8px",
                fontSize: 8,
                fontWeight: 700,
                color: "#fff",
                marginBottom: 6,
              }}
            >
              🛍 MARKETPLACE
            </div>
            <div
              style={{
                fontSize: 15,
                fontWeight: 800,
                color: "#fff",
                fontFamily: FONT,
                display: "-webkit-box",
                WebkitLineClamp: 1,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
                marginBottom: 2,
              }}
            >
              {featuredListing?.title ?? "Services & deals"}
            </div>
            <div
              style={{
                fontSize: 11,
                color: "rgba(255,255,255,0.8)",
                fontFamily: FONT,
                marginBottom: 8,
              }}
            >
              {featuredListing
                ? `${featuredListing.category ?? "Services"} · ${featuredListing.price_display ?? "View listing"}`
                : "Explore all listings →"}
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                navigate({
                  to: featuredListing ? ("/marketplace/$listingId" as never) : ("/marketplace" as never),
                  params: featuredListing ? ({ listingId: featuredListing.id } as never) : undefined,
                });
              }}
              style={{
                background: "#fff",
                color: "#0F6E3A",
                fontSize: 10,
                fontWeight: 700,
                fontFamily: FONT,
                borderRadius: 20,
                padding: "4px 12px",
                border: "none",
                cursor: "pointer",
              }}
            >
              View listing →
            </button>
          </div>
          <IconShoppingBag size={48} color="rgba(255,255,255,0.15)" style={{ flexShrink: 0 }} />
        </div>
      </div>

      {/* ROW 3 — INDUSTRY NEWS ROW */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => navigate({ to: "/news" as never })}
        style={{
          background: "#fff",
          border: `0.5px solid ${HAIRLINE}`,
          borderRadius: 14,
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "10px 12px",
          cursor: "pointer",
          marginBottom: 8,
        }}
      >
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 8,
            flexShrink: 0,
            overflow: "hidden",
            background: newsHero ? undefined : "linear-gradient(135deg, #1877D6, #0B1F3A)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {newsHero ? (
            <img
              src={newsHero}
              alt=""
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          ) : (
            <IconNews size={18} color="#fff" />
          )}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 8,
              fontWeight: 700,
              color: BLUE,
              textTransform: "uppercase",
              marginBottom: 3,
            }}
          >
            DVSA · DIA · More
          </div>
          <div
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: NAVY,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {latestNewsTitle ?? "Industry news & updates"}
          </div>
        </div>
        <IconChevronRight size={14} color={HAIRLINE} style={{ flexShrink: 0 }} />
      </div>

      {/* BELOW — DSM LIVE SESSIONS */}
      <div ref={liveRef} />
    </div>
  );
}

export default DiscoverSection;
