import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  IconBriefcase,
  IconCamera,
  IconClock,
  IconDotsVertical,
  IconGift,
  IconHeart,
  IconMicrophone,
  IconPlayerPause,
  IconPlayerPlay,
  IconRadio,
  IconShoppingBag,
} from "@tabler/icons-react";
import { supabase as defaultSupabase } from "@/lib/supabaseClient";
import { useProRadioContext } from "@/hooks/useProRadio";

/* ------------------------------------------------------------------ */
// Types
/* ------------------------------------------------------------------ */

interface FeaturedPerk {
  id: string;
  name: string | null;
  saving: string | null;
  category: string | null;
  description: string | null;
}

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
  const [featuredPerk, setFeaturedPerk] = useState<FeaturedPerk | null>(null);
  const [perkCategories, setPerkCategories] = useState<PerkCategory[]>([]);
  const [perkTotal, setPerkTotal] = useState(0);
  const [listings, setListings] = useState<ShopListing[]>([]);
  const [videos, setVideos] = useState<TvVideo[]>([]);
  const [news, setNews] = useState<NewsArticle[]>([]);
  const [posts, setPosts] = useState<CommunityPost[]>([]);

  useEffect(() => {
    let cancelled = false;
    const timeout = window.setTimeout(() => {
      if (!cancelled) setLoading(false);
    }, 3000);

    (async () => {
      const [perkRes, catRes, shopRes, tvRes, bitesizeRes, newsRes, postRes] =
        await Promise.allSettled([
          supabase
            .from("benefit_perks")
            .select("id, name, saving, category, description")
            .eq("active", true)
            .order("sort_order", { ascending: true })
            .limit(1),
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
            .from("news_articles")
            .select("id, title, category, image_url, published_at, source")
            .eq("is_hidden", false)
            .order("published_at", { ascending: false })
            .limit(2),
          supabase
            .from("local_chat_messages")
            .select("id, message, created_at, instructors(name)")
            .is("deleted_at", null)
            .order("created_at", { ascending: false })
            .limit(2),
        ]);


      if (cancelled) return;

      if (perkRes.status === "fulfilled") {
        const row = (perkRes.value.data ?? [])[0];
        if (row) setFeaturedPerk(row as FeaturedPerk);
      }

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
      <div style={{ borderBottom: "1px solid #F0F0F0" }}>
        <SectionHeaderRow
          label="PRO Perks"
          color={TEAL}
          action="See all →"
          onAction={() => go("/perks")}
        />

        <div
          style={{
            padding: "16px 16px 12px",
            display: "flex",
            gap: 12,
            alignItems: "center",
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 14,
              background: "#E8F8F4",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <IconGift size={28} color={TEAL} />
          </div>
          <div>
            <div
              style={{
                color: TEAL,
                fontSize: 11,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: ".6px",
                marginBottom: 4,
              }}
            >
              PRO Perks
            </div>
            <div
              style={{
                fontSize: 19,
                fontWeight: 700,
                color: NAVY,
                lineHeight: 1.2,
                marginBottom: 3,
              }}
            >
              Save £1,000s every year
            </div>
            <div style={{ fontSize: 12, color: "#888" }}>
              {perkTotal > 0 ? perkTotal : "Exclusive"} exclusive benefits for EDP members
            </div>
          </div>
        </div>

        {perkCategories.length > 0 && (
          <div style={{ display: "flex", gap: 8, padding: "0 16px 12px" }}>
            {perkCategories.map((cat) => (
              <div
                key={cat.name}
                onClick={() => go("/perks")}
                style={{
                  flex: 1,
                  background: "#E8F8F4",
                  borderRadius: 10,
                  padding: 12,
                  textAlign: "center",
                  cursor: "pointer",
                }}
              >
                <span style={{ display: "block", marginBottom: 6 }}>
                  {categoryIcon(cat.name)}
                </span>
                <div style={{ fontSize: 12, fontWeight: 700, color: NAVY }}>
                  {cat.name}
                </div>
                <div style={{ fontSize: 11, color: TEAL, marginTop: 2 }}>
                  {cat.count}
                </div>
                <div style={{ fontSize: 10, color: "#888", marginTop: 3 }}>
                  {categoryBlurb(cat.name)}
                </div>
              </div>
            ))}
          </div>
        )}

        {featuredPerk && (
          <div
            onClick={() => go("/perks")}
            style={{
              margin: "0 16px 14px",
              background: "#F7FDF9",
              borderRadius: 10,
              padding: 12,
              border: "0.5px solid #C8EFE4",
              display: "flex",
              alignItems: "center",
              gap: 10,
              cursor: "pointer",
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                background: TEAL,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <IconHeart size={18} color="#fff" />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  color: TEAL,
                  fontSize: 10,
                  fontWeight: 700,
                  marginBottom: 2,
                }}
              >
                Featured perk
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, color: NAVY }}>
                {featuredPerk.name ?? "Member perk"}
              </div>
              <div style={{ fontSize: 11, color: "#888" }}>
                {featuredPerk.saving ?? featuredPerk.category ?? "Exclusive to PRO"}
              </div>
            </div>
            <div style={{ fontSize: 11, color: BLUE, fontWeight: 700 }}>Claim →</div>
          </div>
        )}
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
          color={BLUE}
          action="All stations →"
          onAction={() => go("/radio")}
        />
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.15fr 1fr",
            gap: 10,
            padding: 12,
            borderTop: "1px solid #F0F0F0",
          }}
        >
          {/* PRO Live — primary */}
          <div
            onClick={() => go("/radio")}
            style={{
              position: "relative",
              overflow: "hidden",
              borderRadius: 8,
              cursor: "pointer",
              background: `linear-gradient(160deg, ${BLUE} 0%, #0F5FB5 62%, #0B3F7D 100%)`,
              boxShadow: "0 6px 16px rgba(24,119,214,0.22)",
              padding: 12,
              display: "flex",
              flexDirection: "column",
              gap: 8,
              minHeight: 168,
            }}
          >
            {/* equaliser detail */}
            <div
              aria-hidden
              style={{
                position: "absolute",
                right: 8,
                bottom: 10,
                display: "flex",
                alignItems: "flex-end",
                gap: 3,
                opacity: 0.35,
              }}
            >
              {[10, 20, 14, 26, 16, 8].map((h, i) => (
                <span
                  key={i}
                  style={{
                    width: 3,
                    height: h,
                    borderRadius: 2,
                    background: "#fff",
                    display: "block",
                  }}
                />
              ))}
            </div>

            <div
              style={{ display: "flex", alignItems: "center", gap: 8 }}
            >
              <div
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 8,
                  background: "rgba(255,255,255,0.18)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <IconRadio size={19} color="#fff" />
              </div>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  background: RED,
                  color: "#fff",
                  fontSize: 9,
                  fontWeight: 800,
                  letterSpacing: 0.6,
                  padding: "3px 8px",
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
                  fontSize: 17,
                  fontWeight: 800,
                  color: "#fff",
                  letterSpacing: -0.3,
                }}
              >
                {radio.selectedStation ?? "PRO Live"}
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: "rgba(255,255,255,0.85)",
                  marginTop: 2,
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
                width: 44,
                height: 44,
                borderRadius: 22,
                background: "#fff",
                border: "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                boxShadow: "0 4px 12px rgba(0,0,0,0.18)",
              }}
              aria-label={radio.isPlaying ? "Pause radio" : "Play radio"}
            >
              {radio.isPlaying ? (
                <IconPlayerPause size={20} color={BLUE} />
              ) : (
                <IconPlayerPlay size={20} color={BLUE} />
              )}
            </button>

            <div
              style={{
                marginTop: "auto",
                fontSize: 10,
                fontWeight: 600,
                color: "rgba(255,255,255,0.9)",
              }}
            >
              Feel good driving, all day long
            </div>
          </div>

          {/* PRO Talk — secondary */}
          <div
            onClick={() => go("/radio")}
            style={{
              borderRadius: 8,
              cursor: "pointer",
              background: "#F6F8FA",
              border: "1px solid #E9EDF2",
              padding: 12,
              display: "flex",
              flexDirection: "column",
              gap: 8,
              minHeight: 168,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 8,
                  background: "#ECEFF3",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <IconMicrophone size={18} color="#9AA5B1" />
              </div>
              <span
                style={{
                  background: "#E7EBF0",
                  color: "#6B7885",
                  fontSize: 9,
                  fontWeight: 800,
                  letterSpacing: 0.6,
                  padding: "3px 8px",
                  borderRadius: 999,
                }}
              >
                COMING SOON
              </span>
            </div>

            <div>
              <div
                style={{
                  fontSize: 17,
                  fontWeight: 800,
                  color: NAVY,
                  letterSpacing: -0.3,
                }}
              >
                PRO Talk
              </div>
              <div style={{ fontSize: 11, color: "#7A8794", marginTop: 2 }}>
                Instructor talk radio, launching soon.
              </div>
            </div>

            <div
              aria-hidden
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                background: "#fff",
                border: "1px solid #E1E6EC",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <IconPlayerPlay size={20} color="#C2CAD3" />
            </div>

            <div
              style={{
                marginTop: "auto",
                fontSize: 10,
                fontWeight: 600,
                color: "#8C97A3",
              }}
            >
              Real talk for real instructors
            </div>
          </div>
        </div>

        {/* 5 smaller station tiles */}
        <div
          style={{
            padding: "0 12px 12px",
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
                  borderRadius: 8,
                  padding: 10,
                  background: isSelected ? BLUE : "#fff",
                  border: `1px solid ${isSelected ? BLUE : "#E9EDF2"}`,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 6,
                  cursor: "pointer",
                }}
              >
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 6,
                    background: isSelected
                      ? "rgba(255,255,255,0.18)"
                      : `${station.color}15`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {isPlaying ? (
                    <IconPlayerPause
                      size={14}
                      color={isSelected ? "#fff" : station.color}
                    />
                  ) : (
                    <IconRadio
                      size={14}
                      color={isSelected ? "#fff" : station.color}
                    />
                  )}
                </div>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    color: isSelected ? "#fff" : NAVY,
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
        <div style={{ display: "flex", borderTop: "1px solid #F0F0F0" }}>
          {news.slice(0, 2).map((a, i) => (
            <div
              key={a.id}
              onClick={() => onNavigateToMedia?.()}
              style={{
                flex: 1,
                cursor: "pointer",
                borderRight: i === 0 ? "1px solid #F0F0F0" : undefined,
              }}
            >
              <div
                style={{
                  height: 90,
                  position: "relative",
                  background: "#2a3545",
                  overflow: "hidden",
                }}
              >
                {a.image_url && (
                  <img
                    src={a.image_url}
                    alt={a.title ?? "Article"}
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
                      "linear-gradient(transparent, rgba(0,0,0,0.7))",
                  }}
                />
                <div
                  style={{
                    position: "absolute",
                    bottom: 0,
                    left: 0,
                    right: 0,
                    padding: "8px 10px",
                  }}
                >
                  <div
                    style={{
                      fontSize: 9,
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: ".4px",
                      marginBottom: 3,
                      color: newsCategoryColor(a.category),
                    }}
                  >
                    {a.category ?? a.source ?? "News"}
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: "#fff",
                      lineHeight: 1.3,
                    }}
                  >
                    {a.title ?? "Untitled"}
                  </div>
                </div>
              </div>
              <div style={{ padding: "7px 10px", fontSize: 10, color: "#888" }}>
                {timeAgo(a.published_at)}
              </div>
            </div>
          ))}
          {news.length === 0 && (
            <div style={{ flex: 1, padding: 16, fontSize: 12, color: "#888" }}>
              {loading ? "Loading news…" : "No articles yet."}
            </div>
          )}
        </div>
      </div>

      {/* ============ SECTION 7 — COMMUNITY ============ */}
      <div style={{ padding: "14px 16px" }}>
        <SectionHeaderRow
          label="Community"
          color={TEAL}
          action="See all →"
          onAction={() => go("/community")}
          badge={posts.length > 0 ? `${posts.length} new` : undefined}
        />
        <div style={{ display: "flex", gap: 12 }}>
          {posts.slice(0, 2).map((p, i) => (
            <div
              key={p.id}
              onClick={() => go("/community")}
              style={{
                flex: 1,
                cursor: "pointer",
                borderRight: i === 0 ? "1px solid #F4F4F4" : undefined,
                paddingRight: i === 0 ? 12 : undefined,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  marginBottom: 6,
                }}
              >
                <div
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: 13,
                    background: i === 0 ? BLUE : TEAL,
                    color: "#fff",
                    fontSize: 10,
                    fontWeight: 700,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  {(p.authorName ?? "E").charAt(0).toUpperCase()}
                </div>
                <div style={{ fontSize: 12, fontWeight: 700, color: NAVY }}>
                  {p.authorName ?? "EDP member"}
                </div>
                <div style={{ fontSize: 10, color: "#888" }}>
                  {timeAgo(p.created_at)}
                </div>
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: "#444",
                  lineHeight: 1.4,
                  display: "-webkit-box",
                  WebkitLineClamp: 3,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                }}
              >
                {p.body ?? ""}
              </div>
            </div>
          ))}
          {posts.length === 0 && (
            <div style={{ flex: 1, fontSize: 12, color: "#888" }}>
              {loading ? "Loading community…" : "No posts yet."}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ProTeaserPage;
