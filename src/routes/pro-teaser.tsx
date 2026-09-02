import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  IconBookmark,
  IconBriefcase,
  IconCamera,
  IconClock,
  IconDotsVertical,
  IconGift,
  IconHeart,
  IconMessageCircle,
  IconMicrophone,
  IconPlayerPause,
  IconPlayerPlay,
  IconRadio,
  IconShoppingBag,
  IconX,
} from "@tabler/icons-react";
import { toast } from "sonner";
import proLogoAsset from "@/assets/pro-logo.png.asset.json";
import { supabase as defaultSupabase } from "@/lib/supabaseClient";
import { useProRadioContext } from "@/hooks/useProRadio";

/* ------------------------------------------------------------------ */
// Types
/* ------------------------------------------------------------------ */

interface PerkCategory {
  name: string;
  count: number;
}

interface ShopListing {
  id: string;
  title: string | null;
  price_display: string | null;
  thumbnail_url: string | null;
  category: string | null;
}

interface TvVideo {
  id: string;
  title: string | null;
  category: string | null;
  thumbnail_url: string | null;
  video_embed_url: string | null;
  video_url: string | null;
}

interface NewsArticle {
  id: string;
  title: string | null;
  category: string | null;
  image_url: string | null;
  published_at: string | null;
  source: string | null;
  description?: string | null;
  read_time_mins?: number | null;
}

interface CommunityPost {
  id: string;
  body: string | null;
  created_at: string | null;
  authorName: string | null;
}

export interface ProTeaserProps {
  onNavigate?: (to: string) => void;
  onNavigateToMedia?: () => void;
  supabase?: any;
  session?: any;
}

/* ------------------------------------------------------------------ */
// Helpers
/* ------------------------------------------------------------------ */

const NAVY = "#0B2341";
const PRO_BLUE = "#1877D6";
const PRO_TEAL = "#00BFA5";
const BLUE = "#2C97DE";
const TEAL = "#18A999";
const AMBER = "#F59E0B";
const RED = "#E53935";

const MINI_STATIONS: { name: string; stream: string; color: string }[] = [
  { name: "PRO 80s", stream: "https://0n-80s.radionetz.de/0n-80s.mp3", color: "#8B5CF6" },
  { name: "PRO 90s", stream: "https://0n-90s.radionetz.de/0n-90s.mp3", color: "#EC4899" },
  { name: "PRO 00s", stream: "https://stream.laut.fm/00er", color: "#06B6D4" },
  { name: "PRO Chill", stream: "https://0n-chillout.radionetz.de/0n-chillout.mp3", color: "#10B981" },
  { name: "PRO Drive", stream: "https://0n-rock.radionetz.de/0n-rock.mp3", color: "#F97316" },
];

interface PerkExplainer {
  id: string;
  name: string;
  description: string;
  videoUrl: string | null;
  thumbnailUrl: string | null;
  color: string;
  iconColor: string;
}


const COMMUNITY_COUNTS: { likes: number; comments: number }[] = [
  { likes: 12, comments: 3 },
  { likes: 8, comments: 1 },
];

function getVideoThumbnail(
  videoUrl: string | null,
  thumbnailUrl: string | null,
): string | null {
  if (thumbnailUrl) return thumbnailUrl;
  if (!videoUrl) return null;

  const ytPatterns = [
    /youtube\.com\/watch\?v=([^&\s]+)/,
    /youtu\.be\/([^?\s]+)/,
    /youtube\.com\/embed\/([^?\s]+)/,
  ];
  for (const pattern of ytPatterns) {
    const match = videoUrl.match(pattern);
    if (match) {
      return `https://img.youtube.com/vi/${match[1]}/mqdefault.jpg`;
    }
  }

  return null;
}


function getPerkEmbedUrl(url: string): string {
  if (
    url.includes("youtube.com/embed") ||
    url.includes("player.vimeo.com")
  ) {
    return url;
  }

  const ytPatterns = [
    /youtube\.com\/watch\?v=([^&\s]+)/,
    /youtu\.be\/([^?\s]+)/,
  ];
  for (const pattern of ytPatterns) {
    const match = url.match(pattern);
    if (match) {
      return `https://www.youtube.com/embed/${match[1]}`;
    }
  }

  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
  if (vimeoMatch) {
    return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
  }

  return url;
}


function timeAgo(value: string | null | undefined): string {
  if (!value) return "";
  const then = new Date(value).getTime();
  if (Number.isNaN(then)) return "";
  const mins = Math.max(0, Math.round((Date.now() - then) / 60000));
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return `${Math.round(days / 7)}w ago`;
}

function categoryIcon(name: string) {
  const n = name.toLowerCase();
  if (n.includes("health")) return <IconHeart size={22} color={TEAL} />;
  if (n.includes("shop") || n.includes("retail"))
    return <IconShoppingBag size={22} color={TEAL} />;
  if (n.includes("professional") || n.includes("business"))
    return <IconBriefcase size={22} color={TEAL} />;
  return <IconGift size={22} color={TEAL} />;
}

function categoryBlurb(name: string) {
  const n = name.toLowerCase();
  if (n.includes("health")) return "GP · Mental health";
  if (n.includes("shop") || n.includes("retail")) return "Retail · Cinema";
  if (n.includes("professional") || n.includes("business")) return "DIA · CPD";
  return "Member benefits";
}

function newsCategoryColor(category: string | null) {
  const c = (category ?? "").toLowerCase();
  if (c.includes("road") || c.includes("safety")) return RED;
  if (c.includes("motor")) return BLUE;
  return "rgba(255,255,255,0.7)";
}

function SectionHeaderRow({
  label,
  color,
  action,
  onAction,
  badge,
}: {
  label: string;
  color: string;
  action: string;
  onAction: () => void;
  badge?: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "12px 16px 8px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span
          style={{
            fontSize: 10,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: ".6px",
            color,
          }}
        >
          {label}
        </span>
        {badge && (
          <span
            style={{
              background: RED,
              color: "#fff",
              fontSize: 9,
              fontWeight: 700,
              borderRadius: 8,
              padding: "1px 6px",
            }}
          >
            {badge}
          </span>
        )}
      </div>
      <button
        type="button"
        onClick={onAction}
        style={{
          fontSize: 11,
          color: BLUE,
          fontWeight: 600,
          cursor: "pointer",
          background: "transparent",
          border: "none",
          padding: 0,
        }}
      >
        {action}
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
// Page
/* ------------------------------------------------------------------ */

export const Route = createFileRoute("/pro-teaser")({
  head: () => ({
    meta: [
      { title: "PRO Overview — Every Driver Pro" },
      {
        name: "description",
        content:
          "A snapshot of your Every Driver PRO ecosystem: perks, PRO Shop, radio, PRO TV, news and community.",
      },
      { property: "og:title", content: "PRO Overview — Every Driver Pro" },
      {
        property: "og:description",
        content:
          "A snapshot of your Every Driver PRO ecosystem: perks, PRO Shop, radio, PRO TV, news and community.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => <ProTeaserRoute />,
});

function ProTeaserRoute() {
  const navigate = useNavigate();
  return (
    <ProTeaserPage
      onNavigate={(to) => navigate({ to: to as never })}
      onNavigateToMedia={() => navigate({ to: "/home" as never })}
    />
  );
}

export function ProTeaserPage({
  onNavigate,
  onNavigateToMedia,
  supabase = defaultSupabase,
}: ProTeaserProps = {}) {
  const radio = useProRadioContext();

  const [loading, setLoading] = useState(true);
  const [perkCategories, setPerkCategories] = useState<PerkCategory[]>([]);
  const [perkTotal, setPerkTotal] = useState(0);
  const [perkVideos, setPerkVideos] = useState<Array<{
    id: string;
    name: string;
    video_url: string | null;
    video_embed_url: string | null;
    partner: {
      id: string;
      name: string;
    } | null;
  }>>([]);
  const [listings, setListings] = useState<ShopListing[]>([]);
  const [videos, setVideos] = useState<TvVideo[]>([]);
  const [news, setNews] = useState<NewsArticle[]>([]);
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [perkVideo, setPerkVideo] = useState<string | null>(null);
  const [communityPage, setCommunityPage] = useState(0);

  const communityScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    const timeout = window.setTimeout(() => {
      if (!cancelled) setLoading(false);
    }, 3000);

    (async () => {
      const [catRes, shopRes, tvRes, bitesizeRes, perkVideosRes, newsRes, postRes] =
        await Promise.allSettled([
          supabase.from("benefit_perks").select("category").eq("active", true),
          supabase
            .from("marketplace_listings")
            .select("id, title, price_display, image_urls, marketplace_categories(name)")
            .eq("is_active", true)
            .is("deleted_at", null)
            .order("created_at", { ascending: false })
            .limit(4),
          supabase
            .from("howto_videos")
            .select(
              "id, title, category, thumbnail_url, video_embed_url, video_url, sort_order",
            )
            .eq("is_published", true)
            .order("sort_order", { ascending: true })
            .limit(4),
          supabase
            .from("bitesize_videos")
            .select("id, title, category, thumbnail_url, video_url, created_at")
            .eq("is_published", true)
            .is("deleted_at", null)
            .order("created_at", { ascending: false })
            .limit(4),
          supabase
            .from("benefit_perks")
            .select(
              "id, name, video_url, video_embed_url, partner:benefit_partners!partner_id(id, name)",
            )
            .not("video_url", "is", null)
            .not("video_url", "eq", "")
            .limit(4),
          supabase
            .from("news_articles")
            .select(
              "id, title, category, image_url, published_at, source, description, read_time_mins",
            )
            .eq("is_hidden", false)
            .order("published_at", { ascending: false })
            .limit(2),
          supabase
            .from("local_chat_messages")
            .select("id, message, created_at, instructors(name)")
            .is("deleted_at", null)
            .order("created_at", { ascending: false })
            .limit(8),
        ]);


      if (cancelled) return;

      if (catRes.status === "fulfilled" && Array.isArray(catRes.value.data)) {
        const rows = catRes.value.data as { category: string | null }[];
        setPerkTotal(rows.length);
        const counts = new Map<string, number>();
        for (const r of rows) {
          const key = (r.category ?? "").trim();
          if (!key) continue;
          counts.set(key, (counts.get(key) ?? 0) + 1);
        }
        setPerkCategories(
          [...counts.entries()]
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 3),
        );
      }

      if (shopRes.status === "fulfilled" && Array.isArray(shopRes.value.data)) {
        setListings(
          (shopRes.value.data as any[]).map((r) => ({
            id: String(r.id),
            title: r.title ?? null,
            price_display: r.price_display ?? null,
            thumbnail_url: Array.isArray(r.image_urls) ? (r.image_urls[0] ?? null) : null,
            category: r.marketplace_categories?.name ?? null,
          })),
        );
      }

      const howtoVideos: TvVideo[] =
        tvRes.status === "fulfilled" && Array.isArray(tvRes.value.data)
          ? (tvRes.value.data as any[]).map((r) => ({
              id: String(r.id),
              title: r.title ?? null,
              category: r.category ?? null,
              thumbnail_url: r.thumbnail_url ?? null,
              video_embed_url: r.video_embed_url ?? null,
              video_url: r.video_url ?? null,
            }))
          : [];

      const bitesizeVideos: TvVideo[] =
        bitesizeRes.status === "fulfilled" &&
        Array.isArray(bitesizeRes.value.data)
          ? (bitesizeRes.value.data as any[]).map((r) => ({
              id: String(r.id),
              title: r.title ?? null,
              category: r.category ?? null,
              thumbnail_url: r.thumbnail_url ?? null,
              video_embed_url: null,
              video_url: r.video_url ?? null,
            }))
          : [];

      setVideos([...howtoVideos, ...bitesizeVideos].slice(0, 4));

      if (
        perkVideosRes.status === "fulfilled" &&
        Array.isArray(perkVideosRes.value.data)
      ) {
        setPerkVideos(
          (perkVideosRes.value.data as any[]).map((r) => ({
            id: String(r.id),
            name: r.name ?? "",
            video_url: r.video_url ?? null,
            video_embed_url: r.video_embed_url ?? null,
            partner: r.partner ?? null,
          })),
        );
      }



      if (newsRes.status === "fulfilled" && Array.isArray(newsRes.value.data)) {
        setNews(newsRes.value.data as NewsArticle[]);
      }

      if (postRes.status === "fulfilled" && Array.isArray(postRes.value.data)) {
        setPosts(
          (postRes.value.data as any[]).map((r) => ({
            id: String(r.id),
            body: r.message ?? null,
            created_at: r.created_at ?? null,
            authorName: r.instructors?.name ?? null,
          })),
        );
      }

      setLoading(false);
    })();

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [supabase]);

  const go = (to: string) => onNavigate?.(to);
  const perkCountLabel = useMemo(
    () => (perkTotal > 0 ? `${perkTotal} Perks` : "Perks"),
    [perkTotal],
  );

  const postPairs = useMemo(() => {
    const pairs: CommunityPost[][] = [];
    for (let i = 0; i < posts.length; i += 2) {
      pairs.push(posts.slice(i, i + 2));
    }
    return pairs;
  }, [posts]);

  const perkExplainers = useMemo<PerkExplainer[]>(() => {
    if (perkVideos.length > 0) {
      return perkVideos.map((p) => ({
        id: p.id,
        name: p.partner?.name ?? p.name,
        description: p.name,
        videoUrl: p.video_embed_url ?? p.video_url,
        thumbnailUrl: null,
        color: "#E8F8F4",
        iconColor: "#18A999",
      }));
    }
    return [
      {
        id: "bennenden",
        name: "Bennenden Health",
        description: "Private healthcare",
        videoUrl: null,
        thumbnailUrl: null,
        color: "#E8F8F4",
        iconColor: "#18A999",
      },
      {
        id: "perkbox",
        name: "Perkbox",
        description: "Retail discounts",
        videoUrl: null,
        thumbnailUrl: null,
        color: "#EAF5FC",
        iconColor: "#2C97DE",
      },
      {
        id: "pirkx",
        name: "Pirkx",
        description: "Wellbeing platform",
        videoUrl: null,
        thumbnailUrl: null,
        color: "#F0EBFF",
        iconColor: "#7B61FF",
      },
      {
        id: "dia",
        name: "DIA Membership",
        description: "Professional body",
        videoUrl: null,
        thumbnailUrl: null,
        color: "#FEF9EC",
        iconColor: "#F59E0B",
      },
    ];
  }, [perkVideos]);


  const onCommunityScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const page = Math.round(el.scrollLeft / Math.max(1, el.clientWidth));
    setCommunityPage(page);
  };

  return (
    <div
      style={{
        background: "#fff",
        minHeight: "100dvh",
        paddingBottom: 100,
        fontFamily: "Poppins, system-ui, sans-serif",
      }}
    >
      {/* ============ SECTION 1 — PRO HEADER ============ */}
      <div
        style={{
          padding: "calc(env(safe-area-inset-top, 0px) + 44px) 16px 16px",
          borderBottom: "1px solid #F0F0F0",
        }}
      >
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: BLUE,
            textTransform: "uppercase",
            letterSpacing: "1.5px",
            marginBottom: 8,
          }}
        >
          Every Driver PRO
        </div>
        <div
          style={{
            fontSize: 30,
            fontWeight: 900,
            color: NAVY,
            lineHeight: 1.1,
            marginTop: 10,
            marginBottom: 8,
          }}
        >
          Your professional ecosystem
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {[perkCountLabel, "PRO Shop", "Radio", "PRO TV", "News", "Community"].map(
            (tag) => (
              <span
                key={tag}
                style={{
                  fontSize: 11,
                  color: "#536579",
                  background: "#F4F6F8",
                  borderRadius: 4,
                  padding: "3px 8px",
                }}
              >
                {tag}
              </span>
            ),
          )}
        </div>
      </div>

      {/* ============ SECTION 2 — PRO PERKS ============ */}
      <div style={{ borderBottom: "1px solid #F0F0F0", paddingBottom: 16 }}>
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "12px 16px 14px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
            <img
              src={proLogoAsset.url}
              alt="PRO"
              style={{ height: 26, width: "auto", display: "block", flexShrink: 0 }}
            />
            <span
              style={{
                fontSize: 15,
                fontWeight: 800,
                color: NAVY,
                letterSpacing: "-0.02em",
              }}
            >
              PRO PERKS
            </span>
          </div>
          <button
            type="button"
            onClick={() => go("/perks")}
            style={{
              background: "none",
              border: "none",
              padding: 0,
              fontSize: 12,
              fontWeight: 600,
              color: PRO_BLUE,
              cursor: "pointer",
              flexShrink: 0,
            }}
          >
            See all →
          </button>
        </div>

        {/* Hero */}
        <div
          style={{
            margin: "0 16px 14px",
            background: "#F0F7FC",
            borderRadius: 18,
            padding: 14,
            display: "flex",
            alignItems: "center",
            gap: 14,
            border: "1px solid rgba(24,119,214,0.08)",
          }}
        >
          <div
            style={{
              width: 84,
              height: 84,
              borderRadius: 18,
              background: "linear-gradient(135deg, #E1EEF7 0%, #EAF5FD 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <img
              src={proLogoAsset.url}
              alt="PRO"
              style={{ width: 62, height: "auto", display: "block" }}
            />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: 10,
                fontWeight: 800,
                color: PRO_TEAL,
                textTransform: "uppercase",
                letterSpacing: "0.1em",
              }}
            >
              PRO PERKS
            </div>
            <div
              style={{
                fontSize: 22,
                fontWeight: 800,
                color: NAVY,
                lineHeight: 1.05,
                marginTop: 5,
                letterSpacing: "-0.02em",
              }}
            >
              Save £1,000s every year
            </div>
            <div style={{ fontSize: 12.5, color: "#536579", marginTop: 5 }}>
              {perkTotal > 0 ? perkTotal : "Exclusive"} exclusive benefits for EDP members
            </div>
          </div>
        </div>

        {/* Category cards */}
        {perkCategories.length > 0 && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: `repeat(${Math.min(perkCategories.length, 3)}, 1fr)`,
              gap: 10,
              margin: "0 16px 14px",
            }}
          >
            {perkCategories.slice(0, 3).map((cat) => {
              const n = cat.name.toLowerCase();
              const isPro = /professional|dia|cpd|training|business|insurance|legal|finance/.test(n);
              const isShop = /shop|retail|cinema|leisure|lifestyle|entertainment|food|dining/.test(n);
              const color = isPro ? PRO_TEAL : PRO_BLUE;
              const tint = isPro ? "#EAF9F7" : "#EAF5FD";
              const Icon = isPro ? IconBriefcase : isShop ? IconShoppingBag : IconHeart;
              return (
                <div
                  key={cat.name}
                  role="button"
                  tabIndex={0}
                  onClick={() => go("/perks")}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") go("/perks");
                  }}
                  style={{
                    background: tint,
                    border: "1px solid rgba(11,35,65,0.05)",
                    borderRadius: 16,
                    padding: "12px 10px",
                    position: "relative",
                    cursor: "pointer",
                    display: "flex",
                    flexDirection: "column",
                    minWidth: 0,
                  }}
                >
                  <span
                    aria-hidden
                    style={{
                      position: "absolute",
                      top: 8,
                      right: 8,
                      width: 22,
                      height: 22,
                      borderRadius: "50%",
                      background: "#fff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      boxShadow: "0 1px 3px rgba(11,35,65,0.08)",
                      fontSize: 11,
                      fontWeight: 800,
                      color,
                    }}
                  >
                    ›
                  </span>
                  <div
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: 10,
                      background: "rgba(255,255,255,0.85)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      marginBottom: 10,
                    }}
                  >
                    <Icon size={18} color={color} stroke={1.8} />
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: NAVY,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {cat.name}
                  </div>
                  <div
                    style={{
                      fontSize: 22,
                      fontWeight: 800,
                      color,
                      marginTop: 1,
                      lineHeight: 1,
                    }}
                  >
                    {cat.count}
                  </div>
                  <div
                    style={{
                      fontSize: 10,
                      color: "#8A94A3",
                      marginTop: "auto",
                      paddingTop: 8,
                      lineHeight: 1.3,
                    }}
                  >
                    {categoryBlurb(cat.name)}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Perk explainers */}
        <div
          style={{
            padding: "0 16px 6px",
            fontSize: 10,
            fontWeight: 700,
            color: "#536579",
            textTransform: "uppercase",
            letterSpacing: ".6px",
          }}
        >
          Perk explainers
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 8,
            padding: "0 16px 12px",
          }}
        >
          {PERK_EXPLAINERS.map((tile) => {
            const thumb = getVideoThumbnail(tile.videoUrl, tile.thumbnailUrl);
            const hasThumb = Boolean(thumb);
            return (
              <div
                key={tile.id}
                onClick={() => {
                  if (tile.videoUrl) {
                    setPerkVideo(getPerkEmbedUrl(tile.videoUrl));
                  } else {
                    toast.info(`${tile.name} coming soon`);
                  }
                }}
                style={{
                  position: "relative",
                  borderRadius: 10,
                  overflow: "hidden",
                  cursor: "pointer",
                  minHeight: 90,
                  background: tile.color,
                }}
              >
                {hasThumb && (
                  <>
                    <img
                      src={thumb!}
                      alt={tile.name}
                      style={{
                        position: "absolute",
                        inset: 0,
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                      }}
                    />
                    <div
                      style={{
                        position: "absolute",
                        inset: 0,
                        background: "linear-gradient(transparent, rgba(0,0,0,0.65))",
                      }}
                    />
                  </>
                )}
                <div
                  style={{
                    position: "relative",
                    zIndex: 1,
                    padding: 10,
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    boxSizing: "border-box",
                  }}
                >
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: "50%",
                      background: hasThumb
                        ? tile.videoUrl
                          ? tile.iconColor
                          : "rgba(255,255,255,0.3)"
                        : `${tile.iconColor}66`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <IconPlayerPlay size={12} color="#fff" />
                  </div>
                  <div>
                    <div
                      style={{
                        fontSize: 12,
                        fontWeight: 700,
                        color: hasThumb ? "#fff" : NAVY,
                        lineHeight: 1.2,
                        marginBottom: 2,
                      }}
                    >
                      {tile.name}
                    </div>
                    <div
                      style={{
                        fontSize: 10,
                        color: hasThumb ? "rgba(255,255,255,0.7)" : "#536579",
                      }}
                    >
                      {tile.description}
                    </div>
                    <div
                      style={{
                        fontSize: 10,
                        fontWeight: 600,
                        color: hasThumb ? "rgba(255,255,255,0.8)" : tile.iconColor,
                        opacity: tile.videoUrl ? 1 : 0.5,
                        marginTop: 3,
                      }}
                    >
                      Watch →
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

      </div>


      {/* ============ SECTION 3 — PRO SHOP ============ */}
      <div style={{ borderBottom: "1px solid #F0F0F0" }}>
        <SectionHeaderRow
          label="PRO Shop"
          color={AMBER}
          action="Browse all →"
          onAction={() => go("/marketplace")}
        />
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 10,
            padding: "0 16px 12px",
          }}
        >
          {(listings.length > 0 ? listings : []).slice(0, 4).map((l) => {
            const priceIsBad = !l.price_display || !/\d/.test(l.price_display);
            return (
              <div
                key={l.id}
                onClick={() => go("/marketplace")}
                style={{
                  background: "#fff",
                  borderRadius: 8,
                  border: "1px solid #E4E8EF",
                  boxShadow: "0 1px 3px rgba(11,31,58,0.06)",
                  padding: 10,
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                  cursor: "pointer",
                }}
              >
                <div
                  style={{
                    width: "100%",
                    height: 90,
                    borderRadius: 8,
                    background: l.thumbnail_url
                      ? `#EEF2F7 url(${l.thumbnail_url}) center/cover no-repeat`
                      : "#EEF2F7",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {!l.thumbnail_url && <IconCamera size={26} color="#aaa" />}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: NAVY,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      marginBottom: 3,
                    }}
                  >
                    {l.title ?? "Listing"}
                  </div>
                  <span
                    style={{
                      display: "inline-block",
                      background: "#EFF6FF",
                      color: BLUE,
                      fontSize: 9,
                      fontWeight: 700,
                      borderRadius: 8,
                      padding: "2px 6px",
                      marginBottom: 6,
                    }}
                  >
                    {l.category || "PRO Shop"}
                  </span>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 8,
                    }}
                  >
                    {priceIsBad ? (
                      <span style={{ fontSize: 11, color: "#888" }}>
                        No price set
                      </span>
                    ) : (
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: 700,
                          color: NAVY,
                        }}
                      >
                        {l.price_display}
                      </span>
                    )}
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        color: BLUE,
                      }}
                    >
                      View ›
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
          {listings.length === 0 && (
            <div
              style={{
                gridColumn: "1 / -1",
                padding: 16,
                fontSize: 12,
                color: "#888",
                background: "#fff",
                borderRadius: 8,
                border: "1px solid #E4E8EF",
              }}
            >
              {loading ? "Loading listings…" : "No listings yet."}
            </div>
          )}
        </div>
      </div>

      {/* ============ SECTION 4 — PRO RADIO ============ */}
      <div style={{ borderBottom: "1px solid #F0F0F0" }}>
        <SectionHeaderRow
          label="PRO Radio"
          color={PRO_TEAL}
          action="All stations →"
          onAction={() => go("/radio")}
        />
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.1fr 1fr",
            gap: 10,
            padding: 12,
            borderTop: "1px solid #F0F0F0",
            alignItems: "stretch",
          }}
        >
          {/* PRO Live — primary */}
          <div
            onClick={() => go("/radio")}
            style={{
              position: "relative",
              overflow: "hidden",
              borderRadius: 14,
              cursor: "pointer",
              background: `linear-gradient(135deg, #0F5FB5 0%, ${PRO_BLUE} 45%, ${PRO_TEAL} 100%)`,
              boxShadow: "0 8px 20px rgba(24,119,214,0.22)",
              padding: 12,
              display: "flex",
              flexDirection: "column",
              gap: 10,
              minHeight: 196,
            }}
          >
            {/* equaliser detail */}
            <div
              aria-hidden
              style={{
                position: "absolute",
                right: 10,
                bottom: 12,
                display: "flex",
                alignItems: "flex-end",
                gap: 3,
              }}
            >
              {[10, 18, 26, 34, 22, 14, 8].map((h, i) => (
                <span
                  key={i}
                  style={{
                    width: 4,
                    height: h,
                    borderRadius: 3,
                    background: "rgba(255,255,255,0.55)",
                    display: "block",
                  }}
                />
              ))}
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: "rgba(255,255,255,0.9)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  boxShadow: "0 2px 6px rgba(0,0,0,0.12)",
                }}
              >
                <IconRadio size={20} color={PRO_BLUE} stroke={1.9} />
              </div>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                  background: RED,
                  color: "#fff",
                  fontSize: 9,
                  fontWeight: 800,
                  letterSpacing: 0.7,
                  padding: "4px 9px",
                  borderRadius: 999,
                }}
              >
                <span
                  style={{
                    width: 5,
                    height: 5,
                    borderRadius: 5,
                    background: "#fff",
                    display: "inline-block",
                  }}
                />
                LIVE
              </span>
            </div>

            <div>
              <div
                style={{
                  fontSize: 20,
                  fontWeight: 800,
                  color: "#fff",
                  letterSpacing: -0.4,
                  lineHeight: 1.1,
                }}
              >
                {radio.selectedStation ?? "PRO Live"}
              </div>
              <div
                style={{
                  fontSize: 11.5,
                  color: "rgba(255,255,255,0.9)",
                  marginTop: 3,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {radio.nowPlaying?.title ?? "Hope"}
                {radio.nowPlaying?.artist ? ` · ${radio.nowPlaying.artist}` : " · Gold Lounge"}
              </div>
            </div>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                radio.toggle();
              }}
              style={{
                width: 48,
                height: 48,
                borderRadius: 24,
                background: "#fff",
                border: "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                boxShadow: "0 6px 14px rgba(0,0,0,0.2)",
              }}
              aria-label={radio.isPlaying ? "Pause radio" : "Play radio"}
            >
              {radio.isPlaying ? (
                <IconPlayerPause size={22} color={PRO_BLUE} />
              ) : (
                <IconPlayerPlay size={22} color={PRO_BLUE} fill={PRO_BLUE} />
              )}
            </button>

            <div
              style={{
                marginTop: "auto",
                fontSize: 10.5,
                fontWeight: 700,
                color: "rgba(255,255,255,0.95)",
                position: "relative",
                zIndex: 1,
              }}
            >
              Feel good driving, all day long
            </div>
          </div>

          {/* PRO Talk — secondary */}
          <div
            onClick={() => go("/radio")}
            style={{
              borderRadius: 14,
              cursor: "pointer",
              background: "#F5FBFA",
              border: "1px solid #E4EFEE",
              padding: 12,
              display: "flex",
              flexDirection: "column",
              gap: 10,
              minHeight: 196,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: "#E4F5F2",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <IconMicrophone size={19} color={PRO_TEAL} stroke={1.9} />
              </div>
              <span
                style={{
                  background: "#DFF3F0",
                  color: "#0E8C7C",
                  fontSize: 9,
                  fontWeight: 800,
                  letterSpacing: 0.7,
                  padding: "4px 9px",
                  borderRadius: 999,
                }}
              >
                COMING SOON
              </span>
            </div>

            <div>
              <div
                style={{
                  fontSize: 20,
                  fontWeight: 800,
                  color: NAVY,
                  letterSpacing: -0.4,
                  lineHeight: 1.1,
                }}
              >
                PRO Talk
              </div>
              <div style={{ fontSize: 11.5, color: "#7A8794", marginTop: 3, lineHeight: 1.35 }}>
                Instructor talk radio, launching soon.
              </div>
            </div>

            <div
              aria-hidden
              style={{
                width: 48,
                height: 48,
                borderRadius: 24,
                background: "#fff",
                border: "1px solid #E1EBEA",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 2px 6px rgba(11,35,65,0.06)",
              }}
            >
              <IconPlayerPlay size={22} color="#9FD8D0" />
            </div>

            <div
              style={{
                marginTop: "auto",
                fontSize: 10.5,
                fontWeight: 600,
                color: "#8C97A3",
                lineHeight: 1.35,
              }}
            >
              Real talk for real instructors
            </div>
          </div>
        </div>

        {/* 5 smaller station tiles */}
        <div
          style={{
            padding: "0 12px 14px",
            display: "grid",
            gridTemplateColumns: "repeat(5, 1fr)",
            gap: 8,
          }}
        >
          {MINI_STATIONS.map((station) => {
            const isSelected = radio.selectedStation === station.name;
            const isPlaying = isSelected && radio.isPlaying;
            return (
              <button
                key={station.name}
                type="button"
                onClick={() => radio.playStream(station.stream, station.name)}
                style={{
                  borderRadius: 12,
                  padding: "10px 4px",
                  background: "#fff",
                  border: `1px solid ${isSelected ? station.color : "#EBEEF2"}`,
                  boxShadow: "0 1px 3px rgba(11,35,65,0.05)",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 7,
                  cursor: "pointer",
                }}
              >
                <div
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: 9,
                    background: `${station.color}1A`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {isPlaying ? (
                    <IconPlayerPause size={15} color={station.color} />
                  ) : (
                    <IconRadio size={15} color={station.color} stroke={1.9} />
                  )}
                </div>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    color: NAVY,
                    textAlign: "center",
                    lineHeight: 1.2,
                  }}
                >
                  {station.name}
                </span>
              </button>
            );
          })}
        </div>


      </div>

      {/* ============ SECTION 5 — PRO TV ============ */}
      <div style={{ borderBottom: "1px solid #F0F0F0" }}>
        <SectionHeaderRow
          label="PRO TV"
          color={BLUE}
          action="See all →"
          onAction={() => onNavigateToMedia?.()}
        />
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 8,
            padding: "0 16px 16px",
            borderTop: "1px solid #F0F0F0",
          }}
        >
          {videos.slice(0, 4).map((v, i) => (
            <div
              key={v.id}
              onClick={() => onNavigateToMedia?.()}
              style={{
                cursor: "pointer",
              }}
            >
              <div
                style={{
                  height: 80,
                  background: "#E8EDF2",
                  position: "relative",
                  overflow: "hidden",
                  borderRadius: 8,
                }}
              >
                {v.thumbnail_url && (
                  <img
                    src={v.thumbnail_url}
                    alt={v.title ?? "Video"}
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                )}
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <div
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: 15,
                      background: "rgba(11,35,65,0.12)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <IconPlayerPlay
                      size={13}
                      color={NAVY}
                      style={{ marginLeft: 1 }}
                    />
                  </div>
                </div>
                {i === 0 && (
                  <div
                    style={{
                      position: "absolute",
                      top: 6,
                      left: 6,
                      background: BLUE,
                      color: "#fff",
                      fontSize: 8,
                      fontWeight: 700,
                      borderRadius: 3,
                      padding: "1px 5px",
                    }}
                  >
                    NEW
                  </div>
                )}
                <div
                  style={{
                    position: "absolute",
                    bottom: 6,
                    right: 6,
                    background: "rgba(0,0,0,0.4)",
                    color: "#fff",
                    fontSize: 9,
                    borderRadius: 3,
                    padding: "1px 5px",
                  }}
                >
                  Watch
                </div>
              </div>
              <div style={{ padding: "10px 0 0" }}>
                <div style={{ fontSize: 9, color: "#536579", marginBottom: 3 }}>
                  {v.category ?? "PRO TV"}
                </div>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: NAVY,
                    lineHeight: 1.3,
                  }}
                >
                  {v.title ?? "Untitled"}
                </div>
              </div>
            </div>
          ))}
          {videos.length === 0 && (
            <div style={{ gridColumn: "1 / -1", padding: 16, fontSize: 12, color: "#888" }}>
              {loading ? "Loading videos…" : "No videos yet."}
            </div>
          )}
        </div>
      </div>

      {/* ============ SECTION 6 — NEWS ============ */}
      <div style={{ borderBottom: "1px solid #F0F0F0" }}>
        <SectionHeaderRow
          label="News"
          color={RED}
          action="See all →"
          onAction={() => onNavigateToMedia?.()}
        />
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
            gap: 12,
            padding: "4px 16px 18px",
            alignItems: "stretch",
          }}
        >
          {news.slice(0, 2).map((a) => (
            <article
              key={a.id}
              onClick={() => onNavigateToMedia?.()}
              style={{
                cursor: "pointer",
                background: "#fff",
                border: "1px solid #ECECEC",
                borderRadius: 10,
                boxShadow: "0 1px 3px rgba(16,24,40,0.06)",
                overflow: "hidden",
                display: "flex",
                flexDirection: "column",
                minWidth: 0,
              }}
            >
              <div
                style={{
                  position: "relative",
                  width: "100%",
                  aspectRatio: "16 / 9",
                  background: "#22303F",
                  overflow: "hidden",
                }}
              >
                {a.image_url && (
                  <img
                    src={a.image_url}
                    alt={a.title ?? "Article"}
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
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    background:
                      "linear-gradient(to bottom, rgba(0,0,0,0.18) 0%, transparent 38%, rgba(0,0,0,0.55) 100%)",
                  }}
                />
                <span
                  style={{
                    position: "absolute",
                    top: 8,
                    left: 8,
                    background: RED,
                    color: "#fff",
                    fontSize: 9,
                    fontWeight: 800,
                    letterSpacing: ".6px",
                    textTransform: "uppercase",
                    padding: "3px 6px",
                    borderRadius: 3,
                    maxWidth: "80%",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {a.category ?? a.source ?? "News"}
                </span>
                <div
                  style={{
                    position: "absolute",
                    bottom: 8,
                    left: 8,
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <span
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: "50%",
                      background: "rgba(0,0,0,0.6)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <IconPlayerPlay size={11} color="#fff" fill="#fff" />
                  </span>
                  <span
                    style={{
                      color: "#fff",
                      fontSize: 10,
                      fontWeight: 700,
                      textShadow: "0 1px 2px rgba(0,0,0,0.5)",
                    }}
                  >
                    {a.read_time_mins ? `${a.read_time_mins}:00` : "2:48"}
                  </span>
                </div>
              </div>

              <div
                style={{
                  padding: "10px 12px 12px",
                  flex: 1,
                  minWidth: 0,
                }}
              >
                <h3
                  style={{
                    margin: 0,
                    fontSize: 15,
                    fontWeight: 800,
                    lineHeight: 1.22,
                    letterSpacing: "-0.2px",
                    color: "#111827",
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                  }}
                >
                  {a.title ?? "Untitled"}
                </h3>
                {a.description && (
                  <p
                    style={{
                      margin: "5px 0 0",
                      fontSize: 11.5,
                      lineHeight: 1.4,
                      color: "#6B7280",
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                    }}
                  >
                    {a.description}
                  </p>
                )}
              </div>

              <div
                style={{
                  borderTop: "1px solid #F2F2F2",
                  padding: "8px 12px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 8,
                }}
              >
                <span
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                    minWidth: 0,
                    fontSize: 10.5,
                    color: "#8A8F98",
                    fontWeight: 500,
                  }}
                >
                  <IconClock size={13} color="#8A8F98" />
                  <span
                    style={{
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {timeAgo(a.published_at)}
                  </span>
                </span>
                <IconDotsVertical size={14} color="#B0B4BA" />
              </div>
            </article>
          ))}
          {news.length === 0 && (
            <div
              style={{
                gridColumn: "1 / -1",
                padding: "18px 4px",
                fontSize: 12,
                color: "#888",
              }}
            >
              {loading ? "Loading news…" : "No articles yet."}
            </div>
          )}
        </div>
      </div>

      {/* ============ SECTION 7 — COMMUNITY ============ */}
      <div style={{ paddingTop: 14 }}>
        <SectionHeaderRow
          label="Community"
          color={TEAL}
          action="See all →"
          onAction={() => go("/community")}
          badge="2 new"
        />
        <div
          ref={communityScrollRef}
          onScroll={onCommunityScroll}
          style={{
            display: "flex",
            overflowX: "auto",
            scrollSnapType: "x mandatory",
            scrollbarWidth: "none",
            msOverflowStyle: "none",
            WebkitOverflowScrolling: "touch",
          }}
        >
          {postPairs.length === 0 ? (
            <div style={{ padding: "0 16px", fontSize: 12, color: "#888" }}>
              {loading ? "Loading community…" : "No posts yet."}
            </div>
          ) : (
            postPairs.map((pair, pageIndex) => (
              <div
                key={pageIndex}
                style={{
                  flex: "0 0 100%",
                  scrollSnapAlign: "start",
                  display: "flex",
                  gap: 8,
                  padding: "0 16px",
                  boxSizing: "border-box",
                }}
              >
                {pair.map((p, cardIndex) => {
                  const globalIndex = pageIndex * 2 + cardIndex;
                  const { likes, comments } =
                    COMMUNITY_COUNTS[globalIndex] ?? {
                      likes: 0,
                      comments: 0,
                    };
                  return (
                    <div
                      key={p.id}
                      onClick={() => go("/community")}
                      style={{
                        flex: 1,
                        minWidth: 0,
                        background: "#fff",
                        borderRadius: 12,
                        border: "1px solid #F0F0F0",
                        boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
                        padding: 12,
                        display: "flex",
                        flexDirection: "column",
                        cursor: "pointer",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          marginBottom: 10,
                        }}
                      >
                        <div
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: 16,
                            background: "#EAF8F6",
                            color: TEAL,
                            fontSize: 12,
                            fontWeight: 700,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                          }}
                        >
                          {(p.authorName ?? "E")
                            .charAt(0)
                            .toUpperCase()}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div
                            style={{
                              fontSize: 13,
                              fontWeight: 700,
                              color: NAVY,
                              lineHeight: 1.3,
                            }}
                          >
                            {p.authorName ?? "EDP member"}
                          </div>
                          <div style={{ fontSize: 11, color: "#888" }}>
                            {timeAgo(p.created_at)}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                          }}
                          style={{
                            background: "transparent",
                            border: "none",
                            padding: 4,
                            cursor: "pointer",
                            color: "#888",
                            flexShrink: 0,
                          }}
                        >
                          <IconDotsVertical size={16} />
                        </button>
                      </div>
                      <div
                        style={{
                          fontSize: 14,
                          color: "#222",
                          lineHeight: 1.45,
                          flex: 1,
                          marginBottom: 12,
                          whiteSpace: "pre-wrap",
                        }}
                      >
                        {p.body ?? ""}
                      </div>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 12,
                          paddingTop: 8,
                          borderTop: "1px solid #F5F5F5",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 4,
                            fontSize: 11,
                            fontWeight: 600,
                            color: "#666",
                          }}
                        >
                          <IconHeart size={16} color="#666" fill="none" />
                          {likes}
                        </div>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 4,
                            fontSize: 11,
                            fontWeight: 600,
                            color: "#666",
                          }}
                        >
                          <IconMessageCircle
                            size={16}
                            color="#666"
                            fill="none"
                          />
                          {comments}
                        </div>
                        <div style={{ flex: 1 }} />
                        <button
                          type="button"
                          onClick={(e) => e.stopPropagation()}
                          style={{
                            background: "transparent",
                            border: "none",
                            padding: 4,
                            cursor: "pointer",
                            color: "#666",
                          }}
                        >
                          <IconBookmark
                            size={16}
                            color="#666"
                            fill="none"
                          />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))
          )}
        </div>
        {postPairs.length > 1 && (
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              gap: 4,
              marginTop: 12,
              paddingBottom: 14,
            }}
          >
            {postPairs.map((_, i) => (
              <div
                key={i}
                style={{
                  width: i === communityPage ? 16 : 6,
                  height: 6,
                  borderRadius: 3,
                  background: i === communityPage ? NAVY : "#D9D9D9",
                  transition: "all 0.2s ease",
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Perk explainer video modal */}
      {perkVideo && (
        <div
          onClick={() => setPerkVideo(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.92)",
            zIndex: 200,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <button
            type="button"
            onClick={() => setPerkVideo(null)}
            style={{
              position: "absolute",
              top: 20,
              right: 20,
              background: "transparent",
              border: "none",
              cursor: "pointer",
            }}
          >
            <IconX size={24} color="#fff" />
          </button>
          <iframe
            src={perkVideo}
            title="Perk explainer video"
            style={{ width: "100%", maxWidth: 390, height: 220, border: "none" }}
            allowFullScreen
            allow="autoplay; fullscreen"
          />
        </div>
      )}
    </div>
  );
}

export default ProTeaserPage;
