import { useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  IconPlayerPlay,
  IconChevronLeft,
  IconChevronRight,
  IconRadio,
  IconBook,
  IconShoppingBag,
  IconNews,
  IconBrowser,
  IconCar,
  IconTool,
  IconBriefcase,
  IconCamera,
  IconDeviceMobile,
  IconSchool,
  IconKey,
  IconPhoto,
} from "@tabler/icons-react";

import { supabase } from "@/lib/supabaseClient";
import { sanitizeNewsTitle } from "@/lib/newsText";
import { SectionHeader } from "@/components/dsm/SectionHeader";

const NAVY = "#0B1F3A";
const BLUE = "#1877D6";
const RED = "#CC2229";
const HAIRLINE = "#E4E8EF";
const FONT = "Poppins, sans-serif";

/** Pick an icon that matches the listing category for the missing-photo fallback. */
function categoryIcon(category?: string | null) {
  const c = (category ?? "").toLowerCase();
  if (/web|site|digital|seo/.test(c)) return IconBrowser;
  if (/car|vehicle|dual|van/.test(c)) return IconCar;
  if (/rent|hire|lease/.test(c)) return IconKey;
  if (/job|vacancy|recruit|franchise/.test(c)) return IconBriefcase;
  if (/train|course|lesson|adi|pdi|school|tuition/.test(c)) return IconSchool;
  if (/book|guide|resource|material/.test(c)) return IconBook;
  if (/camera|dash|video/.test(c)) return IconCamera;
  if (/phone|tech|device|app|electronic/.test(c)) return IconDeviceMobile;
  if (/tool|part|equip|service|repair|maint/.test(c)) return IconTool;
  if (!c) return IconPhoto;
  return IconShoppingBag;
}


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
  const [featuredListings, setFeaturedListings] = useState<
    {
      id: string;
      title: string | null;
      price_display: string | null;
      category: string | null;
      created_at: string | null;
      imageUrl: string | null;
    }[]
  >([]);

  const [heroIndex, setHeroIndex] = useState(0);
  const [scrollProgress, setScrollProgress] = useState(0);
  const heroScrollRef = useRef<HTMLDivElement>(null);
  const [newsHero, setNewsHero] = useState<string | null>(null);
  const [latestNewsTitle, setLatestNewsTitle] = useState<string | null>(null);
  const [latestNewsSource, setLatestNewsSource] = useState<string | null>(null);
  const [latestNewsDate, setLatestNewsDate] = useState<string | null>(null);
  const [newsItems, setNewsItems] = useState<
    { id: string; title: string | null; image_url: string | null }[]
  >([]);
  const [newsIndex, setNewsIndex] = useState(0);
  const newsScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { count, error } = await supabase
          .from("dsm_live_sessions" as never)
          .select("id", { count: "exact", head: true })
          .is("deleted_at", null)
          .gte("session_date", new Date().toISOString().split("T")[0]);
        if (!cancelled && !error && count != null) setLiveCount(count);
      } catch {
        /* ignore */
      }

      try {
        const { count, error } = await supabase
          .from("learn_videos" as never)
          .select("id", { count: "exact", head: true })
          .not("url", "is", null);
        if (!cancelled && !error && count != null) setLearnCount(count);
      } catch {
        /* ignore */
      }

      try {
        const { count, error } = await supabase
          .from("bitesize_videos" as never)
          .select("id", { count: "exact", head: true })
          .eq("is_published", true)
          .is("deleted_at", null);
        if (!cancelled && !error && count != null) setBitesizeCount(count);
      } catch {
        /* ignore */
      }

      try {
        const { count, error } = await supabase
          .from("showcase_videos" as never)
          .select("id", { count: "exact", head: true })
          .is("deleted_at", null);
        if (!cancelled && !error && count != null) setShowcaseCount(count);
      } catch {
        /* ignore */
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
      .select("id, title, price_display, image_urls, created_at, marketplace_categories(name)")
      .eq("is_active", true)
      .is("deleted_at", null)
      .order("is_featured", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(6)
      .then(({ data }) => {
        if (!data || data.length === 0) return;
        const first = data[0] as { image_urls?: string[] | null };
        const imgs = first.image_urls;
        setMarketplaceHero(
          Array.isArray(imgs) && imgs.length > 0 ? imgs[0] : null,
        );
        setFeaturedListings(
          data.map((row) => {
            const imgs = (row as { image_urls?: string[] | null }).image_urls;
            return {
              id: row.id,
              title: row.title ?? null,
              price_display: row.price_display ?? null,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              category: (row.marketplace_categories as any)?.name ?? null,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              created_at: (row as any).created_at ?? null,
              imageUrl: Array.isArray(imgs) && imgs.length > 0 ? imgs[0] : null,
            };
          }),
        );

      });

    supabase
      .from("news_articles")
      .select("id, image_url, title, source, published_at")
      .not("image_url", "is", null)
      .eq("is_hidden", false)
      .order("published_at", { ascending: false })
      .limit(8)
      .then(({ data }) => {
        const rows = (data ?? []) as {
          id: string;
          image_url: string | null;
          title: string | null;
          source: string | null;
          published_at: string | null;
        }[];
        setNewsItems(
          rows.map((r) => ({
            id: String(r.id),
            title: sanitizeNewsTitle(r.title),
            image_url: r.image_url ?? null,
          })),
        );
        const first = rows[0];
        setNewsHero(first?.image_url ?? null);
        setLatestNewsTitle(sanitizeNewsTitle(first?.title));
        setLatestNewsSource(first?.source ?? null);
        setLatestNewsDate(
          first?.published_at
            ? new Date(first.published_at).toLocaleDateString("en-GB", {
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

  type HeroListing = (typeof featuredListings)[number];
  const heroCards: (HeroListing | null)[] =
    featuredListings.length > 0 ? featuredListings : [null];

  const chipIconWrap: React.CSSProperties = {
    width: 26,
    height: 26,
    borderRadius: 8,
    background: "#EEF2F7",
    color: NAVY,
    margin: "0 auto 4px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  };

  const tileStyle: React.CSSProperties = {
    background: "#fff",
    border: `1px solid ${HAIRLINE}`,
    borderRadius: 13,
    padding: "10px 8px",
    textAlign: "center",
    cursor: "pointer",
    position: "relative",
  };

  const tileDot: React.CSSProperties = {
    position: "absolute",
    top: 5,
    right: 5,
    width: 6,
    height: 6,
    borderRadius: "50%",
    background: RED,
  };

  const chipLabel: React.CSSProperties = {
    fontSize: 11.5,
    fontWeight: 700,
    color: NAVY,
  };

  const chipSub: React.CSSProperties = {
    fontSize: 9.5,
    color: "#8A8A8E",
    marginTop: 1,
  };

  return (
    <div style={{ margin: "0 -16px 0", padding: "0 16px 14px", borderRadius: 0, fontFamily: FONT }}>
      {/* MARKETPLACE SECTION HEADER */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginTop: 18,
          marginBottom: 12,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <span
            aria-hidden
            style={{ width: 3, height: 14, background: BLUE, borderRadius: 2, display: "inline-block" }}
          />
          <span
            style={{
              color: BLUE,
              fontSize: 12,
              fontWeight: 800,
              letterSpacing: "0.6px",
              textTransform: "uppercase",
              fontFamily: FONT,
            }}
          >
            Marketplace
          </span>
        </div>
        <span
          role="button"
          tabIndex={0}
          onClick={() => navigate({ to: "/marketplace" as never })}
          style={{ color: BLUE, fontSize: 12.5, fontWeight: 700, cursor: "pointer", fontFamily: FONT }}
        >
          See all →
        </span>
      </div>

      {/* MARKETPLACE ANGLED-CUT CAROUSEL */}
      <div style={{ position: "relative" }}>
        <div
          ref={heroScrollRef}
          onScroll={(e) => {
            const el = e.currentTarget;
            const w = el.clientWidth || 1;
            const maxScroll = el.scrollWidth - w;
            const progress = maxScroll > 0 ? el.scrollLeft / maxScroll : 0;
            setScrollProgress(progress);
            const i = Math.round(el.scrollLeft / w);
            if (i !== heroIndex) setHeroIndex(i);
          }}
          style={{
            display: "flex",
            gap: 0,
            overflowX: "auto",
            scrollSnapType: "x mandatory",
            scrollbarWidth: "none",
            WebkitOverflowScrolling: "touch",
          }}
        >
          {heroCards.map((listing) => {
            const Icon = categoryIcon(listing?.category);

            const open = () =>
              navigate({
                to: listing ? ("/marketplace/$listingId" as never) : ("/marketplace" as never),
                params: listing ? ({ listingId: listing.id } as never) : undefined,
              });
            return (
              <div
                key={listing?.id ?? "empty"}
                style={{ flex: "0 0 100%", scrollSnapAlign: "center", position: "relative" }}
              >
                <div
                  role="button"
                  tabIndex={0}
                  onClick={open}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") open();
                  }}
                  style={{
                    position: "relative",
                    borderRadius: 20,
                    overflow: "hidden",
                    height: 210,
                    background: "#fff",
                    boxShadow:
                      "0 6px 0 #E4E4E8, 0 16px 32px rgba(11,31,58,0.12)",
                    cursor: "pointer",
                    fontFamily: FONT,
                  }}
                >
                  {/* Image panel with angled clip */}
                  <div
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      bottom: 0,
                      width: "42%",
                      clipPath: "polygon(0 0, 100% 0, 72% 100%, 0 100%)",
                      background: listing?.imageUrl
                        ? "#0B1F3A"
                        : `linear-gradient(150deg, #14335C 0%, ${NAVY} 62%, #071630 100%)`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      overflow: "hidden",
                    }}
                  >
                    {listing?.imageUrl ? (
                      <img
                        src={listing.imageUrl}
                        alt=""
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      />
                    ) : (
                      <div
                        aria-hidden
                        style={{
                          /* nudge left: the angled cut removes space on the right */
                          transform: "translateX(-11%)",
                          width: 72,
                          height: 72,
                          borderRadius: 999,
                          background: "rgba(255,255,255,0.10)",
                          border: "1px solid rgba(255,255,255,0.18)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Icon size={34} color="#FFFFFF" stroke={1.6} opacity={0.9} />
                      </div>
                    )}

                    <div
                      style={{
                        position: "absolute",
                        inset: 0,
                        background:
                          "linear-gradient(180deg, rgba(11,31,58,0.15) 0%, transparent 30%, transparent 70%, rgba(11,31,58,0.25) 100%)",
                        pointerEvents: "none",
                      }}
                    />
                  </div>

                  {/* Status badge */}
                  <span
                    style={{
                      position: "absolute",
                      top: 12,
                      left: 14,
                      zIndex: 2,
                      background: "#1A9B5C",
                      color: "#fff",
                      fontSize: 10,
                      fontWeight: 900,
                      letterSpacing: "0.4px",
                      padding: "5px 12px",
                      borderRadius: 7,
                      boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
                      fontFamily: FONT,
                    }}
                  >
                    FOR SALE
                  </span>

                  {/* Content panel */}
                  <div
                    style={{
                      position: "absolute",
                      top: 0,
                      left: "46%",
                      right: 0,
                      bottom: 34,
                      padding: "16px 16px 0 12px",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      {listing?.category && (
                        <span
                          style={{
                            display: "inline-block",
                            background: "#EEF2F7",
                            color: "#6B7686",
                            fontSize: 9,
                            fontWeight: 800,
                            letterSpacing: "0.3px",
                            textTransform: "uppercase",
                            padding: "3px 9px",
                            borderRadius: 20,
                            width: "fit-content",
                          }}
                        >
                          {listing.category}
                        </span>
                      )}
                      <div
                        style={{
                          color: NAVY,
                          fontSize: 17,
                          fontWeight: 800,
                          letterSpacing: "-0.3px",
                          marginTop: 8,
                          lineHeight: 1.15,
                          display: "-webkit-box",
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical",
                          overflow: "hidden",
                        }}
                      >
                        {listing?.title ?? "Services & deals"}
                      </div>
                      <div
                        style={{
                          color: "#B0B0B5",
                          fontSize: 10.5,
                          fontWeight: 600,
                          marginTop: 2,
                        }}
                      >
                        DSM Marketplace
                      </div>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-end",
                        gap: 8,
                      }}
                    >
                      <div style={{ minWidth: 0 }}>
                        <div
                          style={{
                            color: "#B0B0B5",
                            fontSize: 8.5,
                            fontWeight: 700,
                            letterSpacing: "0.3px",
                          }}
                        >
                          PRICE
                        </div>
                        <div
                          style={{
                            color: NAVY,
                            fontSize: 21,
                            fontWeight: 900,
                            letterSpacing: "-0.4px",
                            lineHeight: 1.1,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {listing?.price_display ?? "—"}
                        </div>
                      </div>
                      <span
                        style={{
                          background: NAVY,
                          color: "#fff",
                          fontSize: 9,
                          fontWeight: 700,
                          padding: "4px 9px",
                          borderRadius: 7,
                          boxShadow: "0 2px 0 #050D1C",
                          whiteSpace: "nowrap",
                          flexShrink: 0,
                        }}
                      >
                        View →
                      </span>
                    </div>
                  </div>

                  {/* Marketplace pagination dots */}
                  {heroCards.length > 1 && (
                    <div
                      role="tablist"
                      aria-label="Marketplace listings"
                      style={{
                        position: "absolute",
                        left: 0,
                        right: 0,
                        bottom: 10,
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                        gap: 6,
                        height: 7,
                        zIndex: 2,
                      }}
                    >
                      {heroCards.map((_, i) => {
                        const isActive = i === heroIndex;
                        return (
                          <div
                            key={i}
                            role="tab"
                            aria-selected={isActive}
                            aria-label={`Listing ${i + 1}`}
                            style={{
                              width: isActive ? 18 : 7,
                              height: 7,
                              borderRadius: 4,
                              backgroundColor: isActive ? BLUE : "#C7CDD9",
                              opacity: isActive ? 1 : 0.5,
                              transition: "width 0.25s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.25s cubic-bezier(0.4, 0, 0.2, 1), background-color 0.25s ease",
                            }}
                          />
                        );
                      })}
                    </div>
                  )}

                </div>
                {heroCards.length > 1 && (
                  <>
                    <button
                      aria-label="Previous listing"
                      onClick={(e) => {
                        e.stopPropagation();
                        const el = heroScrollRef.current;
                        if (!el) return;
                        const w = el.clientWidth;
                        el.scrollTo({ left: Math.max(0, el.scrollLeft - w), behavior: "smooth" });
                      }}
                      style={{
                        position: "absolute",
                        left: 8,
                        top: "50%",
                        transform: `translateY(-50%) scale(${1 + scrollProgress * 0.15})`,
                        width: 28,
                        height: 28,
                        borderRadius: "50%",
                        background: "rgba(255,255,255,0.92)",
                        color: NAVY,
                        border: "none",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        boxShadow: "0 2px 8px rgba(11,31,58,0.18)",
                        opacity: heroIndex === 0 ? 0 : 0.25 + 0.75 * scrollProgress,
                        transition: "opacity 0.2s ease, transform 0.2s ease",
                        zIndex: 3,
                        cursor: "pointer",
                        pointerEvents: heroIndex === 0 ? "none" : "auto",
                        padding: 0,
                      }}
                    >
                      <IconChevronLeft size={18} stroke={2.5} />
                    </button>
                    <button
                      aria-label="Next listing"
                      onClick={(e) => {
                        e.stopPropagation();
                        const el = heroScrollRef.current;
                        if (!el) return;
                        const w = el.clientWidth;
                        el.scrollTo({
                          left: Math.min(el.scrollWidth - w, el.scrollLeft + w),
                          behavior: "smooth",
                        });
                      }}
                      style={{
                        position: "absolute",
                        right: 8,
                        top: "50%",
                        transform: `translateY(-50%) scale(${1 + (1 - scrollProgress) * 0.15})`,
                        width: 28,
                        height: 28,
                        borderRadius: "50%",
                        background: "rgba(255,255,255,0.92)",
                        color: NAVY,
                        border: "none",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        boxShadow: "0 2px 8px rgba(11,31,58,0.18)",
                        opacity: heroIndex === heroCards.length - 1 ? 0 : 0.25 + 0.75 * (1 - scrollProgress),
                        transition: "opacity 0.2s ease, transform 0.2s ease",
                        zIndex: 3,
                        cursor: "pointer",
                        pointerEvents: heroIndex === heroCards.length - 1 ? "none" : "auto",
                        padding: 0,
                      }}
                    >
                      <IconChevronRight size={18} stroke={2.5} />
                    </button>
                  </>
                )}
              </div>
            );
          })}
        </div>

      </div>

      <SectionHeader>Discover</SectionHeader>

      {/* ROW 1 — 4 COMPACT TILES */}
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
          style={tileStyle}
        >
          {liveActive && <span style={tileDot} />}
          <span style={chipIconWrap}>
            <IconRadio size={14} color={NAVY} stroke={2} />
          </span>
          <div style={chipLabel}>Live</div>
          <div style={chipSub}>Events</div>
          {liveCount !== null && liveCount > 0 && (
            <div style={chipSub}>{liveCount === 1 ? "1 session" : `${liveCount} sessions`}</div>
          )}
        </div>

        {/* DSM Learn */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => navigate({ to: "/learn" as never })}
          style={tileStyle}
        >
          <span style={chipIconWrap}>
            <IconPlayerPlay size={14} color={NAVY} stroke={2} />
          </span>
          <div style={chipLabel}>Learn</div>
          <div style={chipSub}>Videos</div>
          {learnCount !== null && learnCount > 0 && (
            <div style={chipSub}>{learnCount} videos</div>
          )}
        </div>

        {/* Bitesize */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => navigate({ to: "/bitesize" as never })}
          style={tileStyle}
        >
          <span style={chipIconWrap}>
            <IconBook size={14} color={NAVY} stroke={2} />
          </span>
          <div style={chipLabel}>Bitesize</div>
          <div style={chipSub}>5 min</div>
          {bitesizeCount !== null && bitesizeCount > 0 && (
            <div style={chipSub}>{bitesizeCount} videos</div>
          )}
        </div>

        {/* Showcase */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => navigate({ to: "/showcase" as never })}
          style={tileStyle}
        >
          {(showcaseCount ?? 0) > 0 && <span style={tileDot} />}
          <span style={chipIconWrap}>
            <IconPlayerPlay size={14} color={NAVY} stroke={2} />
          </span>
          <div style={chipLabel}>Showcase</div>
          <div style={chipSub}>Fun Videos</div>
          {showcaseCount !== null && showcaseCount > 0 && (
            <div style={chipSub}>{showcaseCount} clips</div>
          )}
        </div>
      </div>


      {/* ROW 3 — INDUSTRY NEWS ROW (swipeable) */}
      {(() => {
        const panels =
          newsItems.length > 0
            ? newsItems
            : [{ id: "fallback", title: latestNewsTitle, image_url: newsHero }];
        const multi = panels.length > 1;
        return (
          <div style={{ marginBottom: 8 }}>
            <div
              ref={newsScrollRef}
              onScroll={(e) => {
                const el = e.currentTarget;
                const w = el.clientWidth || 1;
                setNewsIndex(Math.round(el.scrollLeft / w));
              }}
              style={{
                display: "flex",
                overflowX: multi ? "auto" : "hidden",
                scrollSnapType: multi ? "x mandatory" : undefined,
                WebkitOverflowScrolling: "touch",
                scrollbarWidth: "none",
                gap: 0,
              }}
              className="no-scrollbar"
            >
              {panels.map((item) => (
                <div
                  key={item.id}
                  style={{
                    flex: "0 0 100%",
                    scrollSnapAlign: "center",
                    boxSizing: "border-box",
                  }}
                >
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
                    }}
                  >
                    <div
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 8,
                        flexShrink: 0,
                        overflow: "hidden",
                        background: item.image_url
                          ? undefined
                          : "linear-gradient(135deg, #1877D6, #0B1F3A)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {item.image_url ? (
                        <img
                          src={item.image_url}
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
                          marginBottom: 1,
                        }}
                      >
                        DVSA · DIA · More
                      </div>
                      <div
                        style={{
                          fontSize: 10,
                          color: "#9CA3AF",
                          fontFamily: FONT,
                          marginBottom: 3,
                        }}
                      >
                        {newsCount ?? 0} articles
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
                        {item.title || "Industry news & updates"}
                      </div>
                    </div>
                    <IconChevronRight size={14} color={HAIRLINE} style={{ flexShrink: 0 }} />
                  </div>
                </div>
              ))}
            </div>
            {multi && (
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  gap: 6,
                  marginTop: 8,
                }}
              >
                {panels.map((p, i) => (
                  <span
                    key={p.id}
                    style={{
                      width: i === newsIndex ? 16 : 6,
                      height: 6,
                      borderRadius: i === newsIndex ? 4 : "50%",
                      background: i === newsIndex ? BLUE : "rgba(11,31,58,0.18)",
                      transition: "width 0.25s ease, background 0.25s ease",
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        );
      })()}

      {/* BELOW — DSM LIVE SESSIONS */}
      <div ref={liveRef} />
    </div>
  );
}

export default DiscoverSection;
