import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  IconGift,
  IconPlayerPause,
  IconPlayerPlay,
  IconRadio,
  IconShoppingBag,
} from "@tabler/icons-react";
import { PageLayout } from "@/components/PageLayout";
import { useProRadioContext } from "@/hooks/useProRadio";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "@/lib/toast";
import { type PodcastEpisode } from "@/lib/podcasts";
import { getPodcastEpisodes } from "@/lib/podcasts.functions";

const POPPINS = { fontFamily: "Poppins, sans-serif" } as const;
const PAGE_BG = "#F4F6F8";
const NAVY = "#0B2341";
const BLUE = "#2C97DE";
const MUTED = "#536579";
const HAIRLINE = "#E4E8EF";
const PURPLE = "#7B61FF";

const CLAMP = (lines: number) =>
  ({
    display: "-webkit-box",
    WebkitLineClamp: lines,
    WebkitBoxOrient: "vertical" as const,
    overflow: "hidden",
  }) as const;

/* ------------------------------------------------------------------ */
// Types
/* ------------------------------------------------------------------ */

interface HowtoVideo {
  id: string;
  title: string;
  description: string | null;
  video_url: string | null;
  video_embed_url: string | null;
  thumbnail_url: string | null;
  category: string | null;
  is_published: boolean;
  sort_order: number | null;
}

type ShopListing = {
  id: string;
  title: string;
  price_display: string | null;
  image_urls: string[] | null;
  thumbnail_url?: string | null;
  category?: string | null;
};

/* ------------------------------------------------------------------ */
// Helpers
/* ------------------------------------------------------------------ */

function formatMoneyDisplay(raw: string | null): string {
  if (!raw) return "";
  const cleaned = raw.replace(/\s/g, "");
  if (/^£\d/.test(cleaned)) return cleaned;
  if (/^\d/.test(cleaned)) return `£${cleaned}`;
  return raw;
}

function formatDuration(secs: number | null): string {
  if (!secs || secs <= 0) return "";
  const mins = Math.round(secs / 60);
  return `${mins} min`;
}

const STATIONS: { name: string; stream: string; comingSoon: boolean }[] = [
  { name: "PRO Live", stream: "https://ice1.somafm.com/groovesalad-256-mp3", comingSoon: false },
  { name: "PRO 80s", stream: "", comingSoon: true },
  { name: "PRO 90s", stream: "", comingSoon: true },
  { name: "PRO 00s", stream: "", comingSoon: true },
  { name: "PRO Chill", stream: "", comingSoon: true },
  { name: "PRO Xmas", stream: "", comingSoon: true },
];

/* ------------------------------------------------------------------ */
// Shared bits
/* ------------------------------------------------------------------ */

function SectionHeader({
  title,
  subtitle,
  onSeeAll,
}: {
  title: string;
  subtitle: string;
  onSeeAll?: () => void;
}) {
  return (
    <div
      style={{
        padding: "16px 16px 10px",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "space-between",
        gap: 12,
      }}
    >
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: NAVY }}>{title}</div>
        <div style={{ fontSize: 12, color: MUTED, marginTop: 2 }}>{subtitle}</div>
      </div>
      {onSeeAll && (
        <button
          type="button"
          onClick={onSeeAll}
          style={{
            ...POPPINS,
            background: "none",
            border: "none",
            padding: 0,
            flexShrink: 0,
            fontSize: 12,
            color: BLUE,
            cursor: "pointer",
          }}
        >
          See all →
        </button>
      )}
    </div>
  );
}

const SCROLL_ROW = {
  display: "flex",
  gap: 10,
  overflowX: "auto" as const,
  WebkitOverflowScrolling: "touch" as const,
  scrollbarWidth: "none" as const,
};

/* ------------------------------------------------------------------ */
// Section 1 — Featured
/* ------------------------------------------------------------------ */

function FeaturedCard({
  video,
  onOpen,
}: {
  video: HowtoVideo | null;
  onOpen: () => void;
}) {
  const title = video?.title ?? "PRO Live Radio";
  const description =
    video?.description ??
    "Ad free radio made for driving instructors — music, chat and company on every drive.";
  const thumb = video?.thumbnail_url ?? null;

  return (
    <div
      onClick={onOpen}
      style={{
        background: "#fff",
        borderRadius: 16,
        overflow: "hidden",
        margin: "0 16px 20px",
        boxShadow: "0 4px 20px rgba(11,35,65,0.1)",
        cursor: "pointer",
      }}
    >
      <div
        style={{
          height: 200,
          background: "linear-gradient(135deg, #0B2341, #1a3a6b)",
          position: "relative",
        }}
      >
        {thumb && (
          <img
            src={thumb}
            alt={title}
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          />
        )}

        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(0,0,0,0.2)",
          }}
        >
          <span
            style={{
              width: 64,
              height: 64,
              borderRadius: "50%",
              background: "rgba(255,255,255,0.15)",
              border: "2px solid rgba(255,255,255,0.3)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <IconPlayerPlay size={28} color="#fff" fill="#fff" stroke={1.2} style={{ marginLeft: 3 }} />
          </span>
        </div>

        <span
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            margin: 12,
            background: BLUE,
            color: "#fff",
            fontSize: 9,
            fontWeight: 700,
            borderRadius: 4,
            padding: "2px 8px",
            letterSpacing: 0.5,
          }}
        >
          FEATURED
        </span>

        <span
          style={{
            position: "absolute",
            bottom: 0,
            right: 0,
            margin: 10,
            background: "rgba(0,0,0,0.6)",
            color: "#fff",
            fontSize: 10,
            borderRadius: 4,
            padding: "2px 7px",
          }}
        >
          {video ? "18:00" : "LIVE"}
        </span>
      </div>

      <div style={{ background: NAVY, padding: "14px 16px" }}>
        <div style={{ color: "#fff", fontSize: 17, fontWeight: 700, lineHeight: 1.3, marginBottom: 6 }}>
          {title}
        </div>
        <div
          style={{
            color: "rgba(255,255,255,0.6)",
            fontSize: 13,
            lineHeight: 1.4,
            marginBottom: 10,
            ...CLAMP(2),
          }}
        >
          {description}
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onOpen();
          }}
          style={{
            ...POPPINS,
            background: BLUE,
            color: "#fff",
            fontSize: 13,
            fontWeight: 700,
            borderRadius: 10,
            padding: "9px 20px",
            border: "none",
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <IconPlayerPlay size={14} color="#fff" fill="#fff" stroke={1.2} />
          Watch now
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
// Section 2 — PRO TV
/* ------------------------------------------------------------------ */

function ProTvSection({ videos, onOpen }: { videos: HowtoVideo[]; onOpen: () => void }) {
  if (videos.length === 0) return null;
  return (
    <section>
      <SectionHeader
        title="PRO TV"
        subtitle="Helpful videos to make you a better driver."
        onSeeAll={onOpen}
      />
      <div style={{ ...SCROLL_ROW, padding: "0 16px 16px" }}>
        {videos.map((v) => (
          <div
            key={v.id}
            onClick={onOpen}
            style={{
              width: 150,
              flexShrink: 0,
              background: "#fff",
              borderRadius: 12,
              border: `0.5px solid ${HAIRLINE}`,
              overflow: "hidden",
              cursor: "pointer",
            }}
          >
            <div style={{ height: 85, background: NAVY, position: "relative" }}>
              {v.thumbnail_url && (
                <img
                  src={v.thumbnail_url}
                  alt={v.title}
                  style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                />
              )}
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  background: "rgba(0,0,0,0.2)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <IconPlayerPlay size={16} color="#fff" fill="#fff" stroke={1.2} />
              </div>
              {v.category && (
                <span
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    margin: 5,
                    background: BLUE,
                    color: "#fff",
                    fontSize: 8,
                    fontWeight: 700,
                    borderRadius: 3,
                    padding: "1px 5px",
                  }}
                >
                  {v.category.toUpperCase()}
                </span>
              )}
            </div>
            <div
              style={{
                padding: "8px 8px 10px",
                fontSize: 12,
                fontWeight: 600,
                color: NAVY,
                ...CLAMP(2),
              }}
            >
              {v.title}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
// Section 3 — PRO Radio
/* ------------------------------------------------------------------ */

function RadioSection() {
  const radio = useProRadioContext();
  const selected = radio.selectedStation || "PRO Live";

  const handleStation = (s: (typeof STATIONS)[number]) => {
    if (s.comingSoon) {
      toast(`${s.name} coming soon! 🎧`);
      return;
    }
    radio.setStation({ name: s.name, stream: s.stream });
  };

  return (
    <div
      style={{
        background: "#fff",
        borderRadius: 14,
        overflow: "hidden",
        margin: "0 16px 20px",
        border: `0.5px solid ${HAIRLINE}`,
      }}
    >
      <div
        style={{
          background: "linear-gradient(135deg, #0B2341, #1a3a6b)",
          padding: 16,
          display: "flex",
          alignItems: "center",
          gap: 14,
        }}
      >
        <div
          style={{
            width: 52,
            height: 52,
            borderRadius: 12,
            background: "rgba(44,151,222,0.2)",
            border: "1px solid rgba(44,151,222,0.3)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <IconRadio size={26} color={BLUE} stroke={2} />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ color: "#fff", fontSize: 15, fontWeight: 700 }}>PRO Radio</span>
            {radio.isPlaying && (
              <span
                style={{
                  background: "#E53935",
                  color: "#fff",
                  fontSize: 9,
                  fontWeight: 700,
                  borderRadius: 4,
                  padding: "1px 6px",
                }}
              >
                LIVE
              </span>
            )}
          </div>
          <div
            style={{
              color: "rgba(255,255,255,0.5)",
              fontSize: 12,
              marginTop: 3,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {radio.isPlaying
              ? radio.nowPlaying?.title || "On air now"
              : "Ad free radio for ADIs and PDIs"}
          </div>
          <div style={{ color: "rgba(255,255,255,0.35)", fontSize: 11, marginTop: 1 }}>
            {radio.showName || selected}
          </div>
        </div>

        <button
          type="button"
          aria-label={radio.isPlaying ? "Pause" : "Play"}
          onClick={() => radio.toggle()}
          style={{
            width: 44,
            height: 44,
            borderRadius: "50%",
            background: BLUE,
            border: "none",
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
          }}
        >
          {radio.isPlaying ? (
            <IconPlayerPause size={20} color="#fff" fill="#fff" stroke={1.2} />
          ) : (
            <IconPlayerPlay size={20} color="#fff" fill="#fff" stroke={1.2} />
          )}
        </button>
      </div>

      <div style={{ ...SCROLL_ROW, gap: 6, padding: "10px 14px" }}>
        {STATIONS.map((s) => {
          const active = selected === s.name;
          return (
            <button
              key={s.name}
              type="button"
              onClick={() => handleStation(s)}
              style={{
                ...POPPINS,
                flexShrink: 0,
                borderRadius: 999,
                padding: "6px 12px",
                fontSize: 11,
                fontWeight: 700,
                cursor: "pointer",
                whiteSpace: "nowrap",
                background: active ? BLUE : "#F4F6F8",
                color: active ? "#fff" : MUTED,
                border: active ? "none" : `0.5px solid ${HAIRLINE}`,
              }}
            >
              {s.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
// Section 4 — Podcasts
/* ------------------------------------------------------------------ */

function PodcastsSection({
  episodes,
  onOpen,
}: {
  episodes: PodcastEpisode[];
  onOpen: () => void;
}) {
  if (episodes.length === 0) return null;
  return (
    <section>
      <SectionHeader
        title="Podcasts"
        subtitle="Expert interviews, real stories and driving tips."
        onSeeAll={onOpen}
      />
      <div style={{ ...SCROLL_ROW, padding: "0 16px 16px" }}>
        {episodes.slice(0, 6).map((ep) => (
          <div
            key={ep.id}
            onClick={onOpen}
            style={{
              width: 160,
              flexShrink: 0,
              background: "#fff",
              borderRadius: 12,
              border: `0.5px solid ${HAIRLINE}`,
              overflow: "hidden",
              cursor: "pointer",
              padding: 10,
            }}
          >
            <div
              style={{
                width: 60,
                height: 60,
                borderRadius: 8,
                background: "#EAF5FC",
                overflow: "hidden",
                marginBottom: 8,
              }}
            >
              {ep.imageUrl && (
                <img
                  src={ep.imageUrl}
                  alt={ep.showName}
                  style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                />
              )}
            </div>
            <div style={{ fontSize: 9, color: MUTED, marginBottom: 3, ...CLAMP(1) }}>
              {ep.showName}
            </div>
            <div style={{ fontSize: 11, fontWeight: 700, color: NAVY, marginBottom: 6, ...CLAMP(2) }}>
              {ep.title}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 10, color: MUTED, flex: 1 }}>
                {formatDuration(ep.durationSecs)}
              </span>
              <span
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  background: NAVY,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <IconPlayerPlay size={12} color="#fff" fill="#fff" stroke={1.2} />
              </span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
// Section 5 — Perks banner
/* ------------------------------------------------------------------ */

function PerksBanner({ onNavigate }: { onNavigate: (to: string) => void }) {
  return (
    <div
      onClick={() => onNavigate("/perks")}
      style={{
        position: "relative",
        background: "#fff",
        borderRadius: 14,
        margin: "0 16px 20px",
        border: `0.5px solid ${HAIRLINE}`,
        overflow: "hidden",
        cursor: "pointer",
      }}
    >
      <span
        aria-hidden
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          bottom: 0,
          width: 4,
          background: PURPLE,
        }}
      />
      <div
        style={{
          padding: "14px 16px 14px 20px",
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}
      >
        <span
          style={{
            width: 40,
            height: 40,
            borderRadius: 10,
            background: "#F0EBFF",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <IconGift size={20} color={PURPLE} stroke={2} />
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: NAVY }}>PRO Perks</div>
          <div style={{ fontSize: 12, color: MUTED, marginTop: 2 }}>
            Exclusive discounts and offers for EDP members.
          </div>
        </div>
        <span style={{ fontSize: 12, fontWeight: 600, color: PURPLE, flexShrink: 0 }}>
          Explore →
        </span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
// Section 6 — PRO Shop
/* ------------------------------------------------------------------ */

function ShopSection({
  listings,
  onNavigate,
}: {
  listings: ShopListing[];
  onNavigate: (to: string) => void;
}) {
  if (listings.length === 0) return null;
  return (
    <section>
      <SectionHeader
        title="PRO Shop"
        subtitle="Premium products and resources."
        onSeeAll={() => onNavigate("/marketplace")}
      />
      <div style={{ ...SCROLL_ROW, padding: "0 16px 24px" }}>
        {listings.map((l) => {
          const image = l.thumbnail_url || l.image_urls?.[0] || null;
          return (
            <div
              key={l.id}
              onClick={() => onNavigate("/marketplace")}
              style={{
                width: 140,
                flexShrink: 0,
                background: "#fff",
                borderRadius: 12,
                border: `0.5px solid ${HAIRLINE}`,
                overflow: "hidden",
                cursor: "pointer",
              }}
            >
              <div
                style={{
                  height: 80,
                  background: "#F4F6F8",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {image ? (
                  <img
                    src={image}
                    alt={l.title}
                    style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                  />
                ) : (
                  <IconShoppingBag size={24} color="#D1D5DB" stroke={1.6} />
                )}
              </div>
              <div style={{ padding: "8px 10px 10px" }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: NAVY, ...CLAMP(2) }}>
                  {l.title}
                </div>
                {l.price_display && (
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#16A34A", marginTop: 4 }}>
                    {formatMoneyDisplay(l.price_display)}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
// Page
/* ------------------------------------------------------------------ */

export const Route = createFileRoute("/pro")({
  head: () => ({
    meta: [
      { title: "PRO — Every Driver Pro" },
      {
        name: "description",
        content:
          "Your professional hub: featured videos, PRO Radio, podcasts, perks and the PRO Shop for driving instructors.",
      },
      { property: "og:title", content: "PRO — Every Driver Pro" },
      {
        property: "og:description",
        content:
          "Your professional hub: featured videos, PRO Radio, podcasts, perks and the PRO Shop for driving instructors.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => <ProPage />,
});

export function ProPage({ onNavigateToMedia }: { onNavigateToMedia?: () => void } = {}) {
  const navigate = useNavigate();
  const go = (to: string) => navigate({ to: to as never });
  const openMedia = () => {
    if (onNavigateToMedia) onNavigateToMedia();
    else go("/dsm-live");
  };

  const loadEpisodes = useServerFn(getPodcastEpisodes);

  const [videos, setVideos] = useState<HowtoVideo[]>([]);
  const [listings, setListings] = useState<ShopListing[]>([]);
  const [episodes, setEpisodes] = useState<PodcastEpisode[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [videoRes, shopRes] = await Promise.allSettled([
        supabase
          .from("howto_videos")
          .select(
            "id, title, description, video_url, video_embed_url, thumbnail_url, category, is_published, sort_order",
          )
          .eq("is_published", true)
          .order("sort_order", { ascending: true })
          .limit(10),
        supabase
          .from("marketplace_listings")
          .select("id, title, price_display, image_urls, category")
          .eq("is_active", true)
          .is("deleted_at", null)
          .order("created_at", { ascending: false })
          .limit(6),
      ]);
      if (cancelled) return;

      if (videoRes.status === "fulfilled" && Array.isArray(videoRes.value.data)) {
        setVideos(videoRes.value.data as unknown as HowtoVideo[]);
      }
      if (shopRes.status === "fulfilled" && Array.isArray(shopRes.value.data)) {
        setListings(shopRes.value.data as unknown as ShopListing[]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const eps = await loadEpisodes();
        if (!cancelled && Array.isArray(eps)) setEpisodes(eps);
      } catch {
        /* podcasts unavailable */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loadEpisodes]);

  const featured = videos[0] ?? null;
  const rest = videos.slice(1);

  return (
    <PageLayout style={{ backgroundColor: PAGE_BG, ...POPPINS }}>
      <div
        style={{
          paddingTop: "calc(env(safe-area-inset-top, 0px) + 48px)",
          paddingBottom: "calc(90px + env(safe-area-inset-bottom, 0px))",
        }}
      >
        <div style={{ padding: "16px 16px 8px" }}>
          <div style={{ fontSize: 22, fontWeight: 700, color: NAVY, letterSpacing: 0.5 }}>PRO</div>
          <div style={{ fontSize: 13, color: MUTED, marginTop: 4 }}>
            Premium content, expert advice and exclusive benefits.
          </div>
        </div>

        <FeaturedCard video={featured} onOpen={openMedia} />
        <ProTvSection videos={rest.length > 0 ? rest : videos} onOpen={openMedia} />
        <RadioSection />
        <PodcastsSection episodes={episodes} onOpen={openMedia} />
        <PerksBanner onNavigate={go} />
        <ShopSection listings={listings} onNavigate={go} />
      </div>
    </PageLayout>
  );
}

export default ProPage;
