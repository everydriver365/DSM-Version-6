import { tokens } from "@/lib/tokens";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import diaLogoAsset from "@/assets/dia-logo.png.asset.json";
import spotifyLogoAsset from "@/assets/spotify-logo.png.asset.json";
import balloonLogoAsset from "@/assets/balloon-logo.png.asset.json";
import vitalityLogoAsset from "@/assets/vitality-logo.png.asset.json";
import hmacaLogoAsset from "@/assets/hmaca-logo.png.asset.json";

import {
  IconPlayerPlay,
  IconChevronRight,
  IconBroadcast,
  IconBook,
  IconBolt,
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
  IconRosetteDiscount,
} from "@tabler/icons-react";

import { supabase } from "@/lib/supabaseClient";
import { sanitizeNewsTitle } from "@/lib/newsText";


const PIRKX_LIVE = false;

const NAVY = "#0B1F3A";
const BLUE = "#1877D6";
const RED = "#CC2229";
const FONT = "Poppins, sans-serif";

const MUTED = "#6B7280";
const tileBase: React.CSSProperties = {
  borderRadius: tokens.radiusCard,
  overflow: "hidden",
  cursor: "pointer",
  position: "relative",
  display: "flex",
  flexDirection: "column",
  justifyContent: "space-between",
  padding: 16,
  background: "#fff",
  border: "1px solid #EEF2F7",
  boxShadow: "0 1px 2px rgba(11,31,58,0.05), 0 8px 24px -12px rgba(11,31,58,0.10)",
  color: NAVY,
  fontFamily: FONT,
};
const chipBase: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: 32,
  height: 32,
  borderRadius: 12,
};



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
  const [live, setLive] = useState<LiveItem[]>([]);
  const [liveActive, setLiveActive] = useState(false);
  // Ticks forward on a timer so time-based live status re-evaluates itself.
  const [nowTick, setNowTick] = useState<number>(() => Date.now());

  // Live tile status: on air now, starting soon, or nothing scheduled
  const liveStatus: "live" | "soon" | "offline" = useMemo(() => {
    if (live.some((s) => isLiveNow(s))) return "live";
    const now = Date.now();
    const soon = live.some((s) => {
      const start = startMs(s.session_date, s.session_time);
      return !!start && start > now && start - now <= 2 * 60 * 60 * 1000;
    });
    return soon ? "soon" : "offline";
  }, [live, nowTick]);

  const isLiveOnAir = liveStatus === "live";

  // Instructor website tier — drives the Perks tile styling/copy.
  const [websiteTier, setWebsiteTier] = useState<string | null>(null);
  const isFreeTier = !websiteTier || websiteTier === "free";
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data: auth } = await supabase.auth.getUser();
        const user = auth.user;
        if (!user || cancelled) return;
        const { data } = await supabase
          .from("instructors")
          .select("website_tier")
          .eq("id", user.id)
          .maybeSingle();
        if (!cancelled && data) {
          setWebsiteTier((data as { website_tier: string | null }).website_tier ?? null);
        }
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);





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

    const loadLive = async () => {
      try {
        const today = new Date().toISOString().slice(0, 10);
        const res = await fetch(
          `${SUPABASE_URL}/rest/v1/dsm_live_sessions?deleted_at=is.null&status=eq.upcoming&session_date=gte.${today}&order=session_date.asc&order=session_time.asc&limit=10&select=id,title,session_date,session_time,duration_minutes,is_live,max_spaces,spaces_taken,image_url`,
          { headers, cache: "no-store" },
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
    };

    void loadLive();

    // Poll for live status so the Live tile updates without a refresh.
    const poll = window.setInterval(() => {
      if (typeof document !== "undefined" && document.hidden) return;
      void loadLive();
    }, 45000);

    // Re-check immediately when the app regains focus / visibility.
    const onWake = () => {
      if (typeof document !== "undefined" && document.hidden) return;
      setNowTick(Date.now());
      void loadLive();
    };
    window.addEventListener("focus", onWake);
    document.addEventListener("visibilitychange", onWake);

    return () => {
      cancelled = true;
      window.clearInterval(poll);
      window.removeEventListener("focus", onWake);
      document.removeEventListener("visibilitychange", onWake);
    };
  }, []);

  // Local clock tick so a session flipping to "live" by time alone re-renders.
  useEffect(() => {
    const t = window.setInterval(() => {
      if (typeof document !== "undefined" && document.hidden) return;
      setNowTick(Date.now());
    }, 20000);
    return () => window.clearInterval(t);
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

  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 60000);
    return () => clearInterval(id);
  }, []);

  type HeroCard = {
    id: string;
    variant: "marketplace";
    title: string;
    category: string | null;
    priceLabel: string;
    priceCaption: string;
    imageUrl: string | null;
    badge: string;
    badgeColor: string;
    footer: string;
    Icon: React.ComponentType<{ size?: number; color?: string; stroke?: number; opacity?: number }>;
    onOpen: () => void;
  };

  type BenefitsSlide = {
    id: string;
    variant: "benefits";
    title: string;
    subtitle: string;
    stat: string;
    statLabel: string;
    badge: string;
    cta: string;
    onOpen: () => void;
  };

  type CarouselSlide = HeroCard | BenefitsSlide;

  const listingCards: HeroCard[] = featuredListings.map((listing) => ({
    id: listing.id,
    variant: "marketplace",
    title: listing.title ?? "Services & deals",
    category: listing.category,
    priceLabel: listing.price_display ?? "—",
    priceCaption: "PRICE",
    imageUrl: listing.imageUrl,
    badge: "FOR SALE",
    badgeColor: "#1A9B5C",
    footer: "DSM Marketplace",
    Icon: categoryIcon(listing.category),
    onOpen: () =>
      navigate({
        to: "/marketplace/$listingId" as never,
        params: { listingId: listing.id } as never,
      }),
  }));

  const marketplaceFallback: HeroCard = {
    id: "empty",
    variant: "marketplace",
    title: "Services & deals",
    category: null,
    priceLabel: "—",
    priceCaption: "PRICE",
    imageUrl: null,
    badge: "FOR SALE",
    badgeColor: "#1A9B5C",
    footer: "DSM Marketplace",
    Icon: categoryIcon(null),
    onOpen: () => navigate({ to: "/marketplace" as never }),
  };

  const benefitsCard: BenefitsSlide = {
    id: "benefits",
    variant: "benefits",
    title: "DSM member exclusive benefits",
    subtitle: "Including free DIA membership and 40+ perks",
    stat: "40+",
    statLabel: "PERKS",
    badge: "NEW",
    cta: "Explore",
    onOpen: () => navigate({ to: "/marketplace/benefits" as never }),
  };

  const heroCards: CarouselSlide[] = [
    ...(listingCards.length > 0 ? listingCards : [marketplaceFallback]),
    ...(PIRKX_LIVE ? [benefitsCard] : []),
  ];

  return (
    <div style={{ margin: "0 -16px 0", padding: "0 16px 14px", borderRadius: 0, fontFamily: FONT }}>
      {/* FEATURED SECTION HEADER */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginTop: 18,
          marginBottom: 8,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <span
            aria-hidden
            style={{
              width: 3,
              height: 12,
              background: BLUE,
              borderRadius: 12,
              display: "inline-block",
            }}
          />
          <span
            style={{
              color: BLUE,
              fontSize: tokens.fontSize.sm,
              fontWeight: tokens.fontWeight.extrabold,
              letterSpacing: "0.6px",
              textTransform: "uppercase",
              fontFamily: FONT,
            }}
          >
            Featured
          </span>
        </div>
        <span
          role="button"
          tabIndex={0}
          onClick={() => navigate({ to: "/marketplace" as never })}
          style={{ color: BLUE, fontSize: tokens.fontSize.sm, fontWeight: tokens.fontWeight.bold, cursor: "pointer", fontFamily: FONT }}
        >
          See all →
        </span>
      </div>

      {/* FEATURED CAROUSEL */}
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
          {heroCards.map((slide) => {
            const open = slide.onOpen;
            return (
              <div
                key={slide.id}
                style={{ flex: "0 0 100%", scrollSnapAlign: "center", position: "relative" }}
              >
                {slide.variant === "benefits" ? (
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={open}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") open();
                    }}
                    style={{
                      position: "relative",
                      borderRadius: tokens.radiusCard,
                      overflow: "hidden",
                      height: 172,
                      background: "linear-gradient(135deg, #14509E, #0B1F3A)",
                      boxShadow:
                        "0 6px 0 #E4E4E8, 0 16px 32px rgba(11,31,58,0.12)",
                      cursor: "pointer",
                      fontFamily: FONT,
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                      padding: 16,
                    }}
                  >
                    <span
                      style={{
                        position: "absolute",
                        top: 12,
                        left: 14,
                        zIndex: 2,
                        background: "#1A9B5C",
                        color: "#fff",
                        fontSize: tokens.fontSize.xs,
                        fontWeight: 900,
                        letterSpacing: "0.4px",
                        padding: "5px 16px",
                        borderRadius: tokens.radiusCard,
                        boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
                        fontFamily: FONT,
                      }}
                    >
                      {slide.badge}
                    </span>
                    <div>
                      <div
                        style={{
                          color: "#7CE8A8",
                          fontSize: 32,
                          fontWeight: 900,
                          lineHeight: 1,
                          letterSpacing: "-0.4px",
                        }}
                      >
                        {slide.stat}
                      </div>
                      <div
                        style={{
                          color: "#7CE8A8",
                          fontSize: tokens.fontSize.xs,
                          fontWeight: tokens.fontWeight.extrabold,
                          letterSpacing: "0.4px",
                          textTransform: "uppercase",
                          marginTop: 2,
                        }}
                      >
                        {slide.statLabel}
                      </div>
                    </div>
                    <div>
                      <div
                        style={{
                          color: "#fff",
                          fontSize: 17,
                          fontWeight: tokens.fontWeight.extrabold,
                          lineHeight: 1.2,
                          letterSpacing: "-0.3px",
                        }}
                      >
                        {slide.title}
                      </div>
                      <div
                        style={{
                          color: "rgba(255,255,255,0.72)",
                          fontSize: 12,
                          fontWeight: tokens.fontWeight.medium,
                          marginTop: 4,
                        }}
                      >
                        {slide.subtitle}
                      </div>
                    </div>
                    <span
                      style={{
                        position: "absolute",
                        bottom: 16,
                        right: 16,
                        color: "#fff",
                        fontSize: tokens.fontSize.base,
                        fontWeight: tokens.fontWeight.bold,
                        fontFamily: FONT,
                      }}
                    >
                      {slide.cta} →
                    </span>
                  </div>
                ) : (
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={open}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") open();
                    }}
                    style={{
                      position: "relative",
                      borderRadius: tokens.radiusCard,
                      overflow: "hidden",
                      height: 172,
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
                        background: slide?.imageUrl
                          ? "#0B1F3A"
                          : `linear-gradient(150deg, #14335C 0%, ${NAVY} 62%, #071630 100%)`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        overflow: "hidden",
                      }}
                    >
                      {slide?.imageUrl ? (
                        <img
                          src={slide.imageUrl}
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
                          <slide.Icon size={34} color="#FFFFFF" stroke={1.6} opacity={0.9} />
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
                        background: slide.badgeColor,
                        color: "#fff",
                        fontSize: tokens.fontSize.xs,
                        fontWeight: 900,
                        letterSpacing: "0.4px",
                        padding: "5px 16px",
                        borderRadius: tokens.radiusCard,
                        boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
                        fontFamily: FONT,
                      }}
                    >
                      {slide.badge}
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
                        {slide?.category && (
                          <span
                            style={{
                              display: "inline-block",
                              background: tokens.canvas,
                              color: tokens.textSecondary,
                              fontSize: 9,
                              fontWeight: tokens.fontWeight.extrabold,
                              letterSpacing: "0.3px",
                              textTransform: "uppercase",
                              padding: "3px 16px",
                              borderRadius: tokens.radiusCard,
                              width: "fit-content",
                            }}
                          >
                            {slide.category}
                          </span>
                        )}
                        <div
                          style={{
                            color: NAVY,
                            fontSize: tokens.fontSize.lg,
                            fontWeight: tokens.fontWeight.extrabold,
                            letterSpacing: "-0.3px",
                            marginTop: 8,
                            lineHeight: 1.15,
                            display: "-webkit-box",
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: "vertical",
                            overflow: "hidden",
                          }}
                        >
                          {slide.title}
                        </div>
                        <div
                          style={{
                            color: "#B0B0B5",
                            fontSize: 10.5,
                            fontWeight: tokens.fontWeight.semibold,
                            marginTop: 2,
                          }}
                        >
                          {slide.footer}
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
                              fontWeight: tokens.fontWeight.bold,
                              letterSpacing: "0.3px",
                            }}
                          >
                            {slide.priceCaption}
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
                            {slide.priceLabel}
                          </div>
                        </div>
                        <span
                          style={{
                            background: NAVY,
                            color: "#fff",
                            fontSize: 9,
                            fontWeight: tokens.fontWeight.bold,
                            padding: "4px 16px",
                            borderRadius: tokens.radiusCard,
                            boxShadow: "0 2px 0 #050D1C",
                            whiteSpace: "nowrap",
                            flexShrink: 0,
                          }}
                        >
                          View →
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Swipe hint */}
        {PIRKX_LIVE && heroCards.length > 1 && (
          <div
            style={{
              position: "absolute",
              right: 0,
              top: 0,
              bottom: 0,
              width: 44,
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-end",
              paddingRight: 10,
              pointerEvents: "none",
              background: "linear-gradient(90deg, transparent, rgba(11,31,58,0.06))",
              borderRadius: 12,
            }}
          >
            <IconChevronRight size={14} color="#B0B0B5" stroke={2.5} />
          </div>
        )}
      </div>

      {/* DISCOVER SECTION HEADER */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginTop: 18,
          marginBottom: 10,
        }}
      >
        <span
          aria-hidden
          style={{
            width: 3,
            height: 12,
            background: BLUE,
            borderRadius: 12,
            display: "inline-block",
          }}
        />
        <span
          style={{
            color: BLUE,
            fontSize: tokens.fontSize.sm,
            fontWeight: tokens.fontWeight.extrabold,
            letterSpacing: "0.6px",
            textTransform: "uppercase",
            fontFamily: FONT,
          }}
        >
          Discover &amp; Learn
        </span>
      </div>

      {/* DISCOVER MOSAIC */}
      <style>{`@keyframes dsmLivePulse{0%{box-shadow:0 0 0 0 rgba(255,255,255,.55)}70%{box-shadow:0 0 0 5px rgba(255,255,255,0)}100%{box-shadow:0 0 0 0 rgba(255,255,255,0)}}`}</style>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 8,
          marginBottom: 12,
        }}
      >
        {/* PERKS — tall hero */}
        <div
          role="button"
          tabIndex={0}
          onClick={() =>
            navigate({ to: '/benefits' as never })
          }
          style={{
            ...tileBase,
            gridColumn: 1,
            gridRow: "1 / 3",
            height: 200,
            background: "linear-gradient(160deg, #EAF3FB 0%, #F5F9FF 55%, #fff 100%)",
            border: "1px solid #D6E3F0",
          }}
        >
          <div>
            <span style={{ ...chipBase, background: "#fff", color: BLUE, boxShadow: "0 1px 2px rgba(11,31,58,0.06)" }}>
              <IconRosetteDiscount size={20} color={BLUE} stroke={1.6} />
            </span>
            <div style={{ fontSize: 15, fontWeight: tokens.fontWeight.bold, color: NAVY, marginTop: 10 }}>Perks</div>
            <div style={{ fontSize: tokens.fontSize.sm, color: MUTED, lineHeight: 1.4, marginTop: 4 }}>
              {isFreeTier
                ? "Free DIA membership & exclusive member benefits"
                : "4 benefits active"}
            </div>
            <div style={{ display: "flex", alignItems: "center", marginTop: 10 }}>
              <div style={{ display: "flex", alignItems: "center" }}>
                {[
                  { initial: "D", bg: "#1877D6" },
                  { initial: "I", bg: "#0B1F3A" },
                  { initial: "A", bg: "#3B82F6" },
                  { initial: "M", bg: "#64748B" },
                  { initial: "H", bg: "#1e3a5f" },
                ].map((m, i) => (
                  <div
                    key={m.initial}
                    style={{
                      width: 26,
                      height: 26,
                      borderRadius: "50%",
                      background: m.bg,
                      color: "#fff",
                      fontSize: tokens.fontSize.sm,
                      fontWeight: tokens.fontWeight.bold,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      marginLeft: i === 0 ? 0 : -8,
                      border: "2px solid #fff",
                      zIndex: 5 - i,
                      overflow: "hidden",
                    }}
                  >
                    {i === 0 ? (
                      <img
                        src={diaLogoAsset.url}
                        alt="DIA"
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      />
                    ) : i === 1 ? (
                      <img
                        src={spotifyLogoAsset.url}
                        alt="Spotify"
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      />
                    ) : i === 2 ? (
                      <img
                        src={balloonLogoAsset.url}
                        alt="Balloon"
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      />
                    ) : i === 3 ? (
                      <img
                        src={vitalityLogoAsset.url}
                        alt="Vitality"
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      />
                    ) : i === 4 ? (
                      <img
                        src={hmacaLogoAsset.url}
                        alt="HMCA"
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      />
                    ) : (
                      m.initial
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
          <span
            style={{
              color: BLUE,
              fontSize: 12,
              fontWeight: tokens.fontWeight.bold,
              textDecoration: "underline",
              display: "inline-block",
              alignSelf: "flex-start",
            }}
          >
            {isFreeTier ? "Upgrade →" : "Access benefits →"}
          </span>
        </div>

        {/* DSM LEARN — Learn, Bitesize & Showcase */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => navigate({ to: "/dsm-learn" as never })}
          style={{
            ...tileBase,
            gridColumn: 2,
            gridRow: 1,
            height: 96,
            background: "linear-gradient(160deg, #FAFDFB 0%, #F0FDF4 100%)",
            borderColor: "#E8F9ED",
          }}
        >
          {(showcaseCount ?? 0) > 0 && (
            <span
              aria-hidden
              style={{
                position: "absolute",
                top: 10,
                right: 10,
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: RED,
                border: "2px solid #fff",
              }}
            />
          )}
          <div>
            <span style={{ ...chipBase, background: "#E8F9ED", color: "#16A34A" }}>
              <IconBook size={17} color="#16A34A" stroke={1.6} />
            </span>
            <div style={{ fontSize: tokens.fontSize.base, fontWeight: tokens.fontWeight.bold, color: NAVY, marginTop: 8 }}>DSM Learn</div>
            <div
              style={{
                fontSize: tokens.fontSize.xs,
                color: MUTED,
                marginTop: 1,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              Guides, bitesize &amp; showcase
            </div>
          </div>
        </div>

        {/* LIVE & NEWS */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => navigate({ to: "/live-news" as never })}
          style={{
            ...tileBase,
            gridColumn: 2,
            gridRow: 2,

            height: 96,
            background: "linear-gradient(160deg, #FFF9FA 0%, #FDF2F5 100%)",
            borderColor: "#F9E4EB",
          }}
        >
          <div>
            <span
              style={{
                ...chipBase,
                background: isLiveOnAir ? "#FDECEC" : "#FCE8EF",
                color: isLiveOnAir ? RED : "#E91E63",
                position: "relative",
              }}
            >
              {isLiveOnAir ? (
                <>
                  <IconBroadcast size={17} color={RED} stroke={1.6} />
                  <span
                    aria-hidden
                    style={{
                      position: "absolute",
                      top: 2,
                      right: 2,
                      width: 7,
                      height: 7,
                      borderRadius: "50%",
                      background: RED,
                      animation: "dsmLivePulse 1.5s infinite",
                    }}
                  />
                </>
              ) : (
                <IconNews size={17} color="#E91E63" stroke={1.6} />
              )}
            </span>
            {isLiveOnAir ? (
              <>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                    background: "#FDECEC",
                    color: RED,
                    borderRadius: tokens.radiusCard,
                    padding: "2px 16px",
                    fontSize: 9,
                    fontWeight: tokens.fontWeight.extrabold,
                    marginTop: 8,
                  }}
                >
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      background: RED,
                      animation: "dsmLivePulse 1.5s infinite",
                    }}
                  />
                  On air
                </span>
                <div
                  style={{
                    fontSize: tokens.fontSize.base,
                    fontWeight: tokens.fontWeight.bold,
                    color: NAVY,
                    marginTop: 4,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {live.find((s) => isLiveNow(s))?.title ?? "DSM Live"}
                </div>
              </>
            ) : (
              <>
                <div style={{ fontSize: tokens.fontSize.base, fontWeight: tokens.fontWeight.bold, color: NAVY, marginTop: 8 }}>
                  Live, News & Podcasts
                </div>
                <div
                  style={{
                    fontSize: tokens.fontSize.xs,
                    color: MUTED,
                    marginTop: 1,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {"News and Live Events"}
                </div>
              </>
            )}
          </div>
        </div>

      </div>


    </div>
  );
}

export default DiscoverSection;
