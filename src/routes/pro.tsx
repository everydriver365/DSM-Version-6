import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  IconPlayerPause,
  IconPlayerPlay,
  IconRadio,
  IconShoppingBag,
} from "@tabler/icons-react";
import { PageLayout } from "@/components/PageLayout";
import { useProRadioContext } from "@/hooks/useProRadio";
import { supabase } from "@/lib/supabaseClient";
import { type PodcastEpisode } from "@/lib/podcasts";
import { getPodcastEpisodes } from "@/lib/podcasts.functions";

const POPPINS = { fontFamily: "Poppins, sans-serif" } as const;
const PAGE_BG = "#F7F8FA";
const NAVY = "#0B2341";
const BLUE = "#2C97DE";
const MUTED = "#536579";
const HAIRLINE = "#E4E8EF";

const PAD = 18;

const CLAMP = (lines: number) =>
  ({
    display: "-webkit-box",
    WebkitLineClamp: lines,
    WebkitBoxOrient: "vertical" as const,
    overflow: "hidden",
  }) as const;

const SCROLL_ROW = {
  display: "flex",
  gap: 12,
  overflowX: "auto" as const,
  WebkitOverflowScrolling: "touch" as const,
  scrollbarWidth: "none" as const,
  scrollSnapType: "x proximity" as const,
  padding: `0 ${PAD}px 4px`,
};

const CARD_SNAP = { scrollSnapAlign: "start" as const, flexShrink: 0 };

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

type Perk = {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  saving: string | null;
  hero_image_url: string | null;
  partner?: { name: string | null } | null;
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
  return `${Math.round(secs / 60)} min`;
}

/* ------------------------------------------------------------------ */
// Shared bits
/* ------------------------------------------------------------------ */

function SectionHeader({
  eyebrow,
  title,
  subtitle,
  actionLabel,
  onAction,
}: {
  eyebrow?: string;
  title?: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div
      style={{
        padding: `26px ${PAD}px 12px`,
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "space-between",
        gap: 12,
      }}
    >
      <div style={{ minWidth: 0 }}>
        {eyebrow && (
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.14em",
              color: BLUE,
              textTransform: "uppercase",
            }}
          >
            {eyebrow}
          </div>
        )}
        {title && (
          <div style={{ fontSize: 20, fontWeight: 700, color: NAVY, marginTop: 3, lineHeight: 1.2 }}>
            {title}
          </div>
        )}
        {subtitle && (
          <div style={{ fontSize: 13, color: MUTED, marginTop: 3, lineHeight: 1.35 }}>{subtitle}</div>
        )}
      </div>

      {onAction && (
        <button
          type="button"
          onClick={onAction}
          style={{
            ...POPPINS,
            background: "none",
            border: "none",
            padding: 0,
            flexShrink: 0,
            fontSize: 13,
            fontWeight: 600,
            color: BLUE,
            cursor: "pointer",
            whiteSpace: "nowrap",
          }}
        >
          {actionLabel ?? "See all"} ›
        </button>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
// 1 — Perks rail
/* ------------------------------------------------------------------ */

function shortSaving(raw: string | null): string {
  const s = (raw || "").trim();
  if (!s) return "Exclusive";
  const pct = s.match(/(\d+)\s*%/);
  if (pct) return `${pct[1]}% off`;
  const money = s.match(/£\s?([\d,]+)\s*\+?/);
  if (money) return `£${money[1]}${s.includes("+") ? "+" : ""} value`;
  return s.length > 14 ? "Member offer" : s;
}

function perkTint(seed: string): [string, string] {
  const palettes: Array<[string, string]> = [
    ["#0B2341", "#1F4E86"],
    ["#134E4A", "#2C8A80"],
    ["#3B1E54", "#7A3EA8"],
    ["#5A2B12", "#B4682C"],
    ["#12314F", "#2C97DE"],
  ];
  let n = 0;
  for (let i = 0; i < seed.length; i += 1) n = (n + seed.charCodeAt(i)) % palettes.length;
  return palettes[n]!;
}

function PerksSection({
  perks,
  onNavigate,
}: {
  perks: Perk[];
  onNavigate: (to: string) => void;
}) {
  const [active, setActive] = useState(0);
  if (perks.length === 0) return null;
  const CARD_W = 148;
  const pages = Math.max(1, Math.ceil(perks.length / 2));
  return (
    <section>
      <SectionHeader
        eyebrow="Perks"
        title="Your exclusive member benefits"
        actionLabel="See all perks"
        onAction={() => onNavigate("/perks")}
      />
      <div
        style={SCROLL_ROW}
        onScroll={(e) => {
          const el = e.currentTarget;
          const idx = Math.round(el.scrollLeft / ((CARD_W + 12) * 2));
          setActive(Math.min(pages - 1, Math.max(0, idx)));
        }}
      >
        {perks.map((p) => {
          const [c1, c2] = perkTint(p.id);
          const label = p.partner?.name || p.name;
          return (
            <div
              key={p.id}
              onClick={() => onNavigate(`/perks/${p.id}`)}
              style={{
                ...CARD_SNAP,
                width: CARD_W,
                background: "#fff",
                borderRadius: 14,
                border: `0.5px solid ${HAIRLINE}`,
                boxShadow: "0 1px 3px rgba(11,35,65,0.06)",
                overflow: "hidden",
                cursor: "pointer",
              }}
            >
              <div
                style={{
                  height: 104,
                  background: `linear-gradient(135deg, ${c1}, ${c2})`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  position: "relative",
                }}
              >
                {p.hero_image_url ? (
                  <img
                    src={p.hero_image_url}
                    alt={p.name}
                    style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                  />
                ) : (
                  <span
                    style={{
                      color: "rgba(255,255,255,0.92)",
                      fontSize: 30,
                      fontWeight: 800,
                      letterSpacing: "-0.02em",
                    }}
                  >
                    {label.trim().charAt(0).toUpperCase()}
                  </span>
                )}
                <span
                  style={{
                    position: "absolute",
                    left: 8,
                    bottom: 8,
                    background: "#fff",
                    color: BLUE,
                    fontSize: 10,
                    fontWeight: 700,
                    borderRadius: 6,
                    padding: "3px 7px",
                    boxShadow: "0 1px 4px rgba(11,35,65,0.18)",
                    textTransform: "uppercase",
                    letterSpacing: "0.03em",
                    whiteSpace: "nowrap",
                  }}
                >
                  {shortSaving(p.saving)}
                </span>
              </div>
              <div style={{ padding: "9px 10px 12px" }}>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: NAVY,
                    lineHeight: 1.28,
                    minHeight: 34,
                    ...CLAMP(2),
                  }}
                >
                  {label}
                </div>
                <div style={{ fontSize: 11, color: MUTED, marginTop: 3, ...CLAMP(1) }}>
                  {p.category || p.description?.trim() || "Member benefit"}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {pages > 1 && (
        <div style={{ display: "flex", justifyContent: "center", gap: 5, marginTop: 10 }}>
          {Array.from({ length: pages }).map((_, i) => (
            <span
              key={i}
              style={{
                width: i === active ? 16 : 5,
                height: 5,
                borderRadius: 3,
                background: i === active ? BLUE : "#CBD5E1",
                transition: "width .2s",
              }}
            />
          ))}
        </div>
      )}
    </section>
  );
}


/* ------------------------------------------------------------------ */
// 2 — Featured hero
/* ------------------------------------------------------------------ */

function FeaturedCard({ video, onOpen }: { video: HowtoVideo | null; onOpen: () => void }) {
  if (!video) {
    return (
      <section>
        <SectionHeader eyebrow="Featured" />
        <div
          onClick={onOpen}
          style={{
            margin: `0 ${PAD}px`,
            borderRadius: 16,
            padding: "26px 18px 24px",
            background: "linear-gradient(135deg,#0B2341,#1F4E86)",
            boxShadow: "0 6px 22px rgba(11,35,65,0.12)",
            cursor: "pointer",
          }}
        >
          <span
            style={{
              display: "inline-block",
              background: BLUE,
              color: "#fff",
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: "0.08em",
              borderRadius: 4,
              padding: "3px 8px",
              marginBottom: 10,
            }}
          >
            FEATURED
          </span>
          <div style={{ color: "#fff", fontSize: 20, fontWeight: 700, lineHeight: 1.25 }}>
            New PRO TV episodes are on the way
          </div>
          <div style={{ color: "rgba(255,255,255,0.7)", fontSize: 13, marginTop: 6, lineHeight: 1.4 }}>
            Nothing published yet. Browse the media library for the latest training and live shows.
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 16 }}>
            <span
              style={{
                width: 34,
                height: 34,
                borderRadius: "50%",
                background: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <IconPlayerPlay size={16} color={NAVY} fill={NAVY} stroke={1.2} style={{ marginLeft: 2 }} />
            </span>
            <span style={{ color: "#fff", fontSize: 14, fontWeight: 600 }}>Open PRO TV</span>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section>
      <SectionHeader eyebrow="Featured" />
      <div
        onClick={onOpen}
        style={{
          margin: `0 ${PAD}px`,
          borderRadius: 16,
          overflow: "hidden",
          position: "relative",
          background: NAVY,
          boxShadow: "0 6px 22px rgba(11,35,65,0.12)",
          cursor: "pointer",
        }}
      >
        <div style={{ height: 230, background: "linear-gradient(135deg,#0B2341,#1a3a6b)" }}>
          {video.thumbnail_url && (
            <img
              src={video.thumbnail_url}
              alt={video.title}
              style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
            />
          )}
        </div>

        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            padding: "56px 16px 16px",
            background:
              "linear-gradient(to bottom, rgba(11,35,65,0) 0%, rgba(11,35,65,0.85) 45%, #0B2341 100%)",
          }}
        >
          <span
            style={{
              display: "inline-block",
              background: BLUE,
              color: "#fff",
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: "0.08em",
              borderRadius: 4,
              padding: "3px 8px",
              marginBottom: 8,
            }}
          >
            FEATURED
          </span>
          <div style={{ color: "#fff", fontSize: 22, fontWeight: 700, lineHeight: 1.2 }}>
            {video.title}
          </div>
          {video.description && (
            <div
              style={{
                color: "rgba(255,255,255,0.7)",
                fontSize: 13,
                lineHeight: 1.4,
                marginTop: 6,
                ...CLAMP(2),
              }}
            >
              {video.description}
            </div>
          )}
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 14 }}>
            <span
              style={{
                width: 34,
                height: 34,
                borderRadius: "50%",
                background: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <IconPlayerPlay size={16} color={NAVY} fill={NAVY} stroke={1.2} style={{ marginLeft: 2 }} />
            </span>
            <span style={{ color: "#fff", fontSize: 14, fontWeight: 600 }}>Watch now</span>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
// 3 — PRO TV
/* ------------------------------------------------------------------ */

function ProTvSection({ videos, onOpen }: { videos: HowtoVideo[]; onOpen: () => void }) {
  if (videos.length === 0) {
    return (
      <section>
        <SectionHeader
          eyebrow="Pro TV"
          title="Watch and learn"
          subtitle="Helpful videos to make you a better driver."
          onAction={onOpen}
        />
        <div
          onClick={onOpen}
          style={{
            margin: `0 ${PAD}px`,
            borderRadius: 14,
            border: `0.5px solid ${HAIRLINE}`,
            background: "#fff",
            padding: "20px 16px",
            display: "flex",
            alignItems: "center",
            gap: 12,
            cursor: "pointer",
          }}
        >
          <span
            style={{
              width: 42,
              height: 42,
              borderRadius: 10,
              background: "#EAF3FB",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <IconPlayerPlay size={18} color={BLUE} fill={BLUE} stroke={1.2} style={{ marginLeft: 2 }} />
          </span>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: NAVY }}>No episodes published yet</div>
            <div style={{ fontSize: 12, color: MUTED, marginTop: 2 }}>
              Tap to browse the full media library.
            </div>
          </div>
        </div>
      </section>
    );
  }
  return (
    <section>
      <SectionHeader
        eyebrow="Pro TV"
        title="Watch and learn"
        subtitle="Helpful videos to make you a better driver."
        onAction={onOpen}
      />

      <div style={SCROLL_ROW}>
        {videos.map((v) => (
          <div
            key={v.id}
            onClick={onOpen}
            style={{ ...CARD_SNAP, width: 142, cursor: "pointer" }}
          >
            <div
              style={{
                height: 100,
                borderRadius: 12,
                background: NAVY,
                position: "relative",
                overflow: "hidden",
              }}
            >
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
                  background: "rgba(11,35,65,0.18)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <span
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: "50%",
                    border: "2px solid rgba(255,255,255,0.85)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <IconPlayerPlay size={14} color="#fff" fill="#fff" stroke={1.2} style={{ marginLeft: 2 }} />
                </span>
              </div>
            </div>
            {v.category && (
              <span
                style={{
                  display: "inline-block",
                  marginTop: 8,
                  background: BLUE,
                  color: "#fff",
                  fontSize: 9,
                  fontWeight: 700,
                  letterSpacing: "0.06em",
                  borderRadius: 3,
                  padding: "2px 6px",
                  textTransform: "uppercase",
                }}
              >
                {v.category}
              </span>
            )}
            <div
              style={{
                marginTop: 6,
                fontSize: 13,
                fontWeight: 600,
                color: NAVY,
                lineHeight: 1.3,
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
// 4 — PRO Radio (compact)
/* ------------------------------------------------------------------ */

function RadioSection({ onNavigate }: { onNavigate: (to: string) => void }) {
  const radio = useProRadioContext();
  const [artworkFailed, setArtworkFailed] = useState(false);
  useEffect(() => {
    setArtworkFailed(false);
  }, [radio.nowPlaying?.artwork]);

  const station = radio.selectedStation || "PRO Live";

  return (
    <section>
      <SectionHeader eyebrow="Pro Radio" actionLabel="Listen live" onAction={() => onNavigate("/radio")} />
      <div
        style={{
          margin: `0 ${PAD}px`,
          borderRadius: 14,
          background: NAVY,
          padding: 14,
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}
      >
        <div
          style={{
            width: 54,
            height: 54,
            borderRadius: 10,
            background: "rgba(255,255,255,0.08)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            overflow: "hidden",
          }}
        >
          {radio.nowPlaying?.artwork && !artworkFailed ? (
            <img
              src={radio.nowPlaying.artwork}
              alt={radio.nowPlaying.title || "Now playing"}
              onError={() => setArtworkFailed(true)}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          ) : (
            <IconRadio size={24} color={BLUE} stroke={2} />
          )}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
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
            <span
              style={{
                color: BLUE,
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
              }}
            >
              On air now
            </span>
          </div>
          <div
            style={{
              color: "#fff",
              fontSize: 15,
              fontWeight: 700,
              marginTop: 3,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {radio.isPlaying ? radio.nowPlaying?.title || station : station}
          </div>
          <div
            style={{
              color: "rgba(255,255,255,0.55)",
              fontSize: 12,
              marginTop: 1,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {radio.nowPlaying?.artist || radio.showName || "Ad free radio for ADIs and PDIs"}
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
    </section>
  );
}

/* ------------------------------------------------------------------ */
// 5 — Podcasts
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
      <SectionHeader eyebrow="Podcasts" onAction={onOpen} />
      <div style={SCROLL_ROW}>
        {episodes.slice(0, 8).map((ep) => (
          <div key={ep.id} onClick={onOpen} style={{ ...CARD_SNAP, width: 142, cursor: "pointer" }}>
            <div
              style={{
                height: 100,
                borderRadius: 12,
                background: "#EAF5FC",
                position: "relative",
                overflow: "hidden",
              }}
            >
              {ep.imageUrl && (
                <img
                  src={ep.imageUrl}
                  alt={ep.showName}
                  style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                />
              )}
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  background: "rgba(11,35,65,0.25)",
                  display: "flex",
                  alignItems: "flex-end",
                  justifyContent: "space-between",
                  padding: 8,
                }}
              >
                <span
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: "50%",
                    background: "rgba(255,255,255,0.9)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <IconPlayerPlay size={12} color={NAVY} fill={NAVY} stroke={1.2} style={{ marginLeft: 1 }} />
                </span>
                {formatDuration(ep.durationSecs) && (
                  <span
                    style={{
                      background: "rgba(0,0,0,0.55)",
                      color: "#fff",
                      fontSize: 10,
                      borderRadius: 4,
                      padding: "2px 6px",
                    }}
                  >
                    {formatDuration(ep.durationSecs)}
                  </span>
                )}
              </div>
            </div>
            <div style={{ fontSize: 11, color: MUTED, marginTop: 8, ...CLAMP(1) }}>{ep.showName}</div>
            <div
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: NAVY,
                marginTop: 2,
                lineHeight: 1.3,
                ...CLAMP(2),
              }}
            >
              {ep.title}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
// 6 — PRO Shop
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
      <SectionHeader eyebrow="Pro Shop" onAction={() => onNavigate("/marketplace")} />
      <div style={SCROLL_ROW}>
        {listings.map((l) => {
          const image = l.thumbnail_url || l.image_urls?.[0] || null;
          return (
            <div
              key={l.id}
              onClick={() => onNavigate("/marketplace")}
              style={{
                ...CARD_SNAP,
                width: 142,
                background: "#fff",
                borderRadius: 12,
                border: `0.5px solid ${HAIRLINE}`,
                overflow: "hidden",
                cursor: "pointer",
              }}
            >
              <div
                style={{
                  height: 100,
                  background: "#F1F4F8",
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
              <div style={{ padding: "9px 10px 11px" }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: NAVY, lineHeight: 1.3, ...CLAMP(2) }}>
                  {l.title}
                </div>
                {l.price_display && (
                  <div style={{ fontSize: 13, fontWeight: 700, color: BLUE, marginTop: 4 }}>
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
          "Your PRO membership: exclusive perks, featured videos, PRO Radio, podcasts and the PRO Shop for driving instructors.",
      },
      { property: "og:title", content: "PRO — Every Driver Pro" },
      {
        property: "og:description",
        content:
          "Your PRO membership: exclusive perks, featured videos, PRO Radio, podcasts and the PRO Shop for driving instructors.",
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
  const [perks, setPerks] = useState<Perk[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [videoRes, shopRes, perkRes] = await Promise.allSettled([
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
          .select("id, title, price_display, image_urls")
          .eq("is_active", true)
          .is("deleted_at", null)
          .order("created_at", { ascending: false })
          .limit(6),
        supabase
          .from("benefit_perks")
          .select("id, name, description, category, saving, hero_image_url, partner:benefit_partners(name)")
          .eq("active", true)
          .order("sort_order", { ascending: true })
          .limit(8),
      ]);
      if (cancelled) return;

      if (videoRes.status === "fulfilled" && Array.isArray(videoRes.value.data)) {
        setVideos(videoRes.value.data as unknown as HowtoVideo[]);
      }
      if (shopRes.status === "fulfilled" && Array.isArray(shopRes.value.data)) {
        setListings(shopRes.value.data as unknown as ShopListing[]);
      }
      if (perkRes.status === "fulfilled" && Array.isArray(perkRes.value.data)) {
        setPerks(perkRes.value.data as unknown as Perk[]);
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
          paddingTop: "calc(env(safe-area-inset-top, 0px) + 8px)",
          paddingBottom: "calc(90px + env(safe-area-inset-bottom, 0px))",
        }}
      >
        <header style={{ padding: `18px ${PAD}px 2px` }}>
          <h1
            style={{
              fontSize: 40,
              fontWeight: 800,
              color: NAVY,
              margin: 0,
              letterSpacing: "-0.02em",
              lineHeight: 1,
            }}
          >
            PRO
          </h1>
          <div style={{ fontSize: 15, fontWeight: 600, color: MUTED, marginTop: 8 }}>
            Your PRO membership
          </div>
          <div style={{ fontSize: 13, color: MUTED, marginTop: 2, lineHeight: 1.4, maxWidth: 280 }}>
            Premium content, expert advice and exclusive benefits.
          </div>
        </header>

        <PerksSection perks={perks} onNavigate={go} />
        <FeaturedCard video={featured} onOpen={openMedia} />
        <ProTvSection videos={rest.length > 0 ? rest : videos} onOpen={openMedia} />
        <RadioSection onNavigate={go} />
        <PodcastsSection episodes={episodes} onOpen={openMedia} />
        <ShopSection listings={listings} onNavigate={go} />
      </div>
    </PageLayout>
  );
}

export default ProPage;
