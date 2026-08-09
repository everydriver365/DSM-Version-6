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
} from "@tabler/icons-react";
import { supabase } from "@/lib/supabaseClient";
import { sanitizeNewsTitle } from "@/lib/newsText";
import { SectionHeader } from "@/components/dsm/SectionHeader";

const NAVY = "#0B1F3A";
const BLUE = "#1877D6";
const RED = "#CC2229";
const HAIRLINE = "#E4E8EF";
const FONT = "Poppins, sans-serif";

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
  const heroScrollRef = useRef<HTMLDivElement>(null);
  const [newsHero, setNewsHero] = useState<string | null>(null);
  const [latestNewsTitle, setLatestNewsTitle] = useState<string | null>(null);
  const [latestNewsSource, setLatestNewsSource] = useState<string | null>(null);
  const [latestNewsDate, setLatestNewsDate] = useState<string | null>(null);

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
      .select("image_url, title, source, published_at")
      .not("image_url", "is", null)
      .eq("is_hidden", false)
      .order("published_at", { ascending: false })
      .limit(1)
      .single()
      .then(({ data }) => {
        setNewsHero(data?.image_url ?? null);
        setLatestNewsTitle(sanitizeNewsTitle(data?.title));
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
          marginBottom: 10,
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

      {/* MARKETPLACE HERO CAROUSEL */}
      <div
        ref={heroScrollRef}
        onScroll={(e) => {
          const el = e.currentTarget;
          const w = el.clientWidth || 1;
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
          paddingBottom: 8,
          marginBottom: 18,
        }}
      >
        {heroCards.map((listing) => {
          const created = listing?.created_at ? new Date(listing.created_at).getTime() : 0;
          const isNew = created > 0 && Date.now() - created < 14 * 24 * 60 * 60 * 1000;
          const cat = (listing?.category ?? "").toLowerCase();
          const isWebsite = cat.includes("web") || cat.includes("site");
          const open = () =>
            navigate({
              to: listing ? ("/marketplace/$listingId" as never) : ("/marketplace" as never),
              params: listing ? ({ listingId: listing.id } as never) : undefined,
            });
          return (
            <div
              key={listing?.id ?? "empty"}
              style={{ flex: "0 0 100%", scrollSnapAlign: "center", paddingRight: 0 }}
            >
              <div
                role="button"
                tabIndex={0}
                onClick={open}
                style={{
                  position: "relative",
                  height: 180,
                  borderRadius: 22,
                  overflow: "hidden",
                  cursor: "pointer",
                  background: NAVY,
                  boxShadow: "0 5px 0 #081730, 0 16px 32px rgba(11,31,58,0.35)",
                }}
              >
                {/* Listing image background */}
                {listing?.imageUrl ? (
                  <img
                    src={listing.imageUrl}
                    alt=""
                    loading="lazy"
                    style={{
                      position: "absolute",
                      inset: 0,
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      opacity: 0.5,
                      zIndex: 1,
                      borderRadius: 22,
                      pointerEvents: "none",
                    }}
                  />
                ) : (
                  <div
                    aria-hidden
                    style={{
                      position: "absolute",
                      inset: 0,
                      background: BLUE,
                      opacity: 0.5,
                      zIndex: 1,
                      borderRadius: 22,
                    }}
                  />
                )}

                {/* Bottom-to-top gradient so text stays readable */}
                <div
                  aria-hidden
                  style={{
                    position: "absolute",
                    inset: 0,
                    background: `linear-gradient(to top, ${NAVY}e6 0%, ${NAVY}80 40%, ${NAVY}40 70%, transparent 100%)`,
                    zIndex: 2,
                    borderRadius: 22,
                    pointerEvents: "none",
                  }}
                />

                {isNew && (
                  <span
                    style={{
                      position: "absolute",
                      top: 14,
                      left: 14,
                      background: "#fff",
                      color: NAVY,
                      fontSize: 10,
                      fontWeight: 900,
                      padding: "5px 10px",
                      borderRadius: 8,
                      fontFamily: FONT,
                      zIndex: 3,
                    }}
                  >
                    NEW
                  </span>
                )}

                {!listing?.imageUrl && (
                  <div
                    aria-hidden
                    style={{ position: "absolute", top: 16, right: 16, width: 150, zIndex: 2 }}
                  >
                    {isWebsite || !listing ? (
                      <div
                        style={{
                          borderRadius: 10,
                          border: "1.5px solid rgba(255,255,255,0.35)",
                          background: "rgba(255,255,255,0.10)",
                          overflow: "hidden",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 4,
                            padding: "6px 8px",
                            background: "rgba(255,255,255,0.18)",
                          }}
                        >
                          {[0, 1, 2].map((i) => (
                            <span
                              key={i}
                              style={{
                                width: 6,
                                height: 6,
                                borderRadius: "50%",
                                background: "rgba(255,255,255,0.4)",
                              }}
                            />
                          ))}
                        </div>
                        <div style={{ padding: 8 }}>
                          <div style={{ height: 7, width: "70%", borderRadius: 3, background: "rgba(255,255,255,0.30)" }} />
                          <div style={{ height: 6, width: "90%", borderRadius: 3, background: "rgba(255,255,255,0.16)", marginTop: 6 }} />
                          <div style={{ height: 6, width: "55%", borderRadius: 3, background: "rgba(255,255,255,0.16)", marginTop: 5 }} />
                          <div style={{ height: 14, width: 52, borderRadius: 5, background: "rgba(255,255,255,0.38)", marginTop: 9 }} />
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: "flex", justifyContent: "flex-end" }}>
                        <IconShoppingBag size={92} color="rgba(255,255,255,0.22)" stroke={1.5} />
                      </div>
                    )}
                  </div>
                )}


                {/* Content */}
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    zIndex: 3,
                    padding: 18,
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "flex-end",
                  }}
                >
                  <div
                    style={{
                      color: "#fff",
                      fontSize: 20,
                      fontWeight: 800,
                      letterSpacing: "-0.3px",
                      maxWidth: "62%",
                      fontFamily: FONT,
                      lineHeight: 1.15,
                    }}
                  >
                    {listing?.title ?? "Services & deals"}
                  </div>
                  <div
                    style={{
                      color: "rgba(255,255,255,0.7)",
                      fontSize: 12,
                      marginTop: 4,
                      fontFamily: FONT,
                    }}
                  >
                    {listing
                      ? `${listing.category ?? "Services"} · DSM Marketplace`
                      : `${listingCount ?? 0} listings available`}
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "flex-end",
                      justifyContent: "space-between",
                      marginTop: 12,
                    }}
                  >
                    <div>
                      <div
                        style={{
                          color: "rgba(255,255,255,0.6)",
                          fontSize: 10,
                          fontWeight: 600,
                          letterSpacing: "0.4px",
                          fontFamily: FONT,
                        }}
                      >
                        FROM
                      </div>
                      <div
                        style={{
                          color: "#fff",
                          fontSize: 20,
                          fontWeight: 900,
                          fontFamily: FONT,
                          lineHeight: 1.1,
                        }}
                      >
                        {listing?.price_display ?? "—"}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        open();
                      }}
                      style={{
                        background: "#fff",
                        color: NAVY,
                        fontSize: 10.5,
                        fontWeight: 700,
                        fontFamily: FONT,
                        padding: "5px 10px",
                        borderRadius: 7,
                        border: "none",
                        boxShadow: "0 1.5px 0 #B8C4D6",

                        cursor: "pointer",
                      }}
                    >
                      View listing
                    </button>
                  </div>
                </div>

                {/* Swipe indicators */}
                {heroCards.length > 1 && (
                  <>
                    {heroIndex > 0 && (
                      <button
                        type="button"
                        aria-label="Previous listing"
                        onClick={(e) => {
                          e.stopPropagation();
                          const el = heroScrollRef.current;
                          if (!el) return;
                          el.scrollBy({ left: -el.clientWidth, behavior: "smooth" });
                        }}
                        style={{
                          position: "absolute",
                          top: "50%",
                          left: 8,
                          transform: "translateY(-50%)",
                          zIndex: 4,
                          width: 28,
                          height: 28,
                          borderRadius: "50%",
                          border: "none",
                          background: "rgba(255,255,255,0.88)",
                          color: NAVY,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          boxShadow: "0 2px 6px rgba(11,31,58,0.28)",
                          cursor: "pointer",
                          padding: 0,
                        }}
                      >
                        <IconChevronLeft size={18} stroke={2.2} />
                      </button>
                    )}
                    {heroIndex < heroCards.length - 1 && (
                      <button
                        type="button"
                        aria-label="Next listing"
                        onClick={(e) => {
                          e.stopPropagation();
                          const el = heroScrollRef.current;
                          if (!el) return;
                          el.scrollBy({ left: el.clientWidth, behavior: "smooth" });
                        }}
                        style={{
                          position: "absolute",
                          top: "50%",
                          right: 8,
                          transform: "translateY(-50%)",
                          zIndex: 4,
                          width: 28,
                          height: 28,
                          borderRadius: "50%",
                          border: "none",
                          background: "rgba(255,255,255,0.88)",
                          color: NAVY,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          boxShadow: "0 2px 6px rgba(11,31,58,0.28)",
                          cursor: "pointer",
                          padding: 0,
                        }}
                      >
                        <IconChevronRight size={18} stroke={2.2} />
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          );
        })}
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
              marginBottom: 1,
            }}
          >
            DVSA · DIA · More
          </div>
          <div style={{ fontSize: 10, color: "#9CA3AF", fontFamily: FONT, marginBottom: 3 }}>
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
            {latestNewsTitle || "Industry news & updates"}
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
