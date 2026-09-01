import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  IconHeart,
  IconPlayerPause,
  IconPlayerPlay,
  IconRadio,
  IconRewindBackward15,
  IconRewindForward15,
  IconShare,
  IconShoppingBag,
} from "@tabler/icons-react";
import { PageLayout } from "@/components/PageLayout";
import { useProRadioContext } from "@/hooks/useProRadio";
import { supabase } from "@/lib/supabaseClient";
import { type PodcastEpisode } from "@/lib/podcasts";
import { getPodcastEpisodes } from "@/lib/podcasts.functions";
import { toast } from "@/lib/toast";

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
  scrollPaddingLeft: PAD,
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

function PerkHeroImage({
  src,
  alt,
  initial,
}: {
  src: string | null;
  alt: string;
  initial: string;
}) {
  const [failed, setFailed] = useState(false);
  if (src?.trim() && !failed) {
    return (
      <img
        src={src}
        alt={alt}
        onError={() => setFailed(true)}
        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
      />
    );
  }
  return (
    <span
      style={{
        color: "rgba(255,255,255,0.92)",
        fontSize: 30,
        fontWeight: 800,
        letterSpacing: "-0.02em",
      }}
    >
      {initial}
    </span>
  );
}

function PerksSection({
  perks,
  onNavigate,
}: {
  perks: Perk[];
  onNavigate: (to: string) => void;
}) {
  if (perks.length === 0) return null;
  const withImage = perks.filter((p) => !!p.hero_image_url?.trim());
  const withoutImage = perks.filter((p) => !p.hero_image_url?.trim());
  const topFour = [...withImage, ...withoutImage].slice(0, 4);
  return (
    <section>
      <SectionHeader
        eyebrow="Perks"
        title="Your exclusive member benefits"
        actionLabel="See all perks"
        onAction={() => onNavigate("/perks")}
      />
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 12,
          padding: `0 ${PAD}px`,
        }}
      >
        {topFour.map((p) => {
          const [c1, c2] = perkTint(p.id);
          const label = p.partner?.name || p.name;
          return (
            <div
              key={p.id}
              onClick={() => onNavigate(`/perks/${p.id}`)}
              style={{
                background: "#fff",
                borderRadius: 14,
                border: `0.5px solid ${HAIRLINE}`,
                boxShadow: "0 1px 3px rgba(11,35,65,0.06)",
                overflow: "hidden",
                cursor: "pointer",
                minWidth: 0,
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
                <PerkHeroImage src={p.hero_image_url} alt={p.name} initial={label.trim().charAt(0).toUpperCase()} />
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
    </section>
  );
}


/* ------------------------------------------------------------------ */
// 1.5 — PRO Radio hero tile
/* ------------------------------------------------------------------ */

type ProStation = {
  name: string;
  subtitle: string;
  badge: string;
  color: string;
  isLive: boolean;
  toastText?: string;
};

/** Mirrors the station list on /radio (src/routes/radio.tsx). */
const PRO_STATIONS: ProStation[] = [
  { name: "PRO Live", subtitle: "Live now", badge: "PRO", color: BLUE, isLive: true },
  { name: "PRO 80s", subtitle: "The best of the 80s", badge: "80s", color: "#12A594", isLive: false },
  { name: "PRO 90s", subtitle: "The best of the 90s", badge: "90s", color: "#7C5CFA", isLive: false },
  { name: "PRO 00s", subtitle: "The best of the 00s", badge: "00s", color: "#E5762F", isLive: false },
  { name: "PRO 70s", subtitle: "The best of the 70s", badge: "70s", color: "#C0398B", isLive: false },
  { name: "PRO 60s", subtitle: "The best of the 60s", badge: "60s", color: "#2E7D32", isLive: false },
  { name: "PRO Chill", subtitle: "Easy listening", badge: "CHL", color: "#0E7490", isLive: false },
  { name: "PRO Drive", subtitle: "Drive time energy", badge: "DRV", color: "#B4232A", isLive: false },
  { name: "PRO Xmas", subtitle: "Festive favourites", badge: "XMS", color: "#C62828", isLive: false, toastText: "PRO Xmas coming soon! 🎄" },
];

/** Static schedule copy — no programme data source exists yet. */
const PRO_SHOWS = [
  { title: "The Morning Drive", schedule: "Weekdays, 6:00 – 10:00", gradient: "linear-gradient(160deg,#F2994A,#0B2341)" },
  { title: "Driving Home", schedule: "Weekdays, 16:00 – 19:00", gradient: "linear-gradient(160deg,#E5762F,#241539)" },
  { title: "Weekend Vibes", schedule: "Saturdays, 9:00 – 13:00", gradient: "linear-gradient(160deg,#7C5CFA,#0B2341)" },
  { title: "The Sunday Session", schedule: "Sundays, 10:00 – 14:00", gradient: "linear-gradient(160deg,#1F7A8C,#0B2341)" },
];


// 1.5 — PRO Radio hero tile
/* ------------------------------------------------------------------ */

function RadioHeroCard({ onNavigate }: { onNavigate: (to: string) => void }) {
  const radio = useProRadioContext();
  const [artworkFailed, setArtworkFailed] = useState(false);
  useEffect(() => {
    setArtworkFailed(false);
  }, [radio.nowPlaying?.artwork]);

  const station = radio.selectedStation || "PRO Live";
  const artwork = radio.nowPlaying?.artwork;
  const subtitle = radio.nowPlaying?.artist || radio.showName || "Groove Salad · SomaFM";

  const ctrl = {
    background: "transparent",
    border: "none",
    padding: 0,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "rgba(255,255,255,0.85)",
  } as const;

  return (
    <section>
      <SectionHeader
        eyebrow="Pro Radio"
        title="The best driving radio"
        actionLabel="Listen in your car"
        onAction={() => onNavigate("/radio")}
      />
      <div
        style={{
          margin: `0 ${PAD}px`,
          borderRadius: 16,
          overflow: "hidden",
          background: "linear-gradient(135deg,#0B2341 0%,#123763 55%,#0B2341 100%)",
          boxShadow: "0 6px 22px rgba(11,35,65,0.18)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 14px 12px" }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                  background: "#E53935",
                  color: "#fff",
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: "0.06em",
                  borderRadius: 999,
                  padding: "3px 9px",
                }}
              >
                <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#fff" }} />
                LIVE
              </span>
            </div>

            <div
              style={{
                color: BLUE,
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                marginTop: 10,
              }}
            >
              Now on air
            </div>
            <div style={{ color: "#fff", fontSize: 20, fontWeight: 700, lineHeight: 1.2, marginTop: 2 }}>
              {station}
            </div>
            <div style={{ color: "rgba(255,255,255,0.82)", fontSize: 12, marginTop: 3, ...CLAMP(1) }}>
              {subtitle}
            </div>
            <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 11, marginTop: 8, ...CLAMP(2) }}>
              The perfect mix of chill beats and driving vibes all day long.
            </div>
            <button
              type="button"
              onClick={() => onNavigate("/radio")}
              style={{
                ...ctrl,
                color: BLUE,
                fontSize: 12,
                fontWeight: 600,
                marginTop: 10,
                gap: 5,
              }}
            >
              View schedule →
            </button>
          </div>

          <div
            style={{
              width: 118,
              height: 118,
              borderRadius: "50%",
              flexShrink: 0,
              background: "radial-gradient(circle at 50% 45%, #123763 0%, #061529 75%)",
              border: "1px solid rgba(44,151,222,0.35)",
              boxShadow: "0 0 0 8px rgba(44,151,222,0.07)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
            }}
          >
            {artwork && !artworkFailed ? (
              <img
                src={artwork}
                alt={radio.nowPlaying?.title || station}
                onError={() => setArtworkFailed(true)}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            ) : (
              <>
                <IconRadio size={20} color={BLUE} stroke={2} />
                <div style={{ color: "#fff", fontSize: 26, fontWeight: 800, lineHeight: 1, marginTop: 4 }}>
                  PRO
                </div>
                <div style={{ color: BLUE, fontSize: 15, fontWeight: 700, lineHeight: 1.1 }}>LIVE</div>
              </>
            )}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "10px 20px 14px",
            background: "rgba(255,255,255,0.05)",
            borderTop: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <button
            type="button"
            aria-label="Favourite"
            onClick={() => radio.toggleFavorite(station)}
            style={ctrl}
          >
            <IconHeart
              size={22}
              stroke={1.6}
              color={radio.favorites?.includes(station) ? "#E53935" : "rgba(255,255,255,0.85)"}
              fill={radio.favorites?.includes(station) ? "#E53935" : "none"}
            />
          </button>
          <button type="button" aria-label="Back 15 seconds" onClick={() => onNavigate("/radio")} style={ctrl}>
            <IconRewindBackward15 size={24} stroke={1.6} />
          </button>
          <button
            type="button"
            aria-label={radio.isPlaying ? "Pause" : "Play"}
            onClick={() => radio.toggle()}
            style={{
              width: 52,
              height: 52,
              borderRadius: "50%",
              background: BLUE,
              border: "none",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              boxShadow: "0 6px 16px rgba(44,151,222,0.4)",
            }}
          >
            {radio.isPlaying ? (
              <IconPlayerPause size={22} color="#fff" fill="#fff" stroke={1} />
            ) : (
              <IconPlayerPlay size={22} color="#fff" fill="#fff" stroke={1} style={{ marginLeft: 2 }} />
            )}
          </button>
          <button type="button" aria-label="Forward 15 seconds" onClick={() => onNavigate("/radio")} style={ctrl}>
            <IconRewindForward15 size={24} stroke={1.6} />
          </button>
          <button type="button" aria-label="Share" onClick={() => onNavigate("/radio")} style={ctrl}>
            <IconShare size={22} stroke={1.6} />
          </button>
        </div>
      </div>

      {/* All stations */}
      <div
        style={{
          padding: `18px ${PAD}px 8px`,
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: NAVY,
        }}
      >
        All stations
      </div>
      <div style={SCROLL_ROW}>
        {PRO_STATIONS.map((s) => {
          const active = s.isLive && station === s.name;
          return (
            <div
              key={s.name}
              onClick={() => {
                if (!s.isLive) {
                  toast(s.toastText ?? `${s.name} coming soon!`);
                  return;
                }
                radio.play();
              }}
              style={{
                ...CARD_SNAP,
                width: 190,
                borderRadius: 12,
                padding: 12,
                background: active ? NAVY : "#fff",
                border: `1px solid ${active ? NAVY : HAIRLINE}`,
                boxShadow: "0 2px 10px rgba(11,35,65,0.06)",
                cursor: "pointer",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div
                  style={{
                    width: 46,
                    height: 46,
                    borderRadius: 10,
                    flexShrink: 0,
                    background: s.color,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#fff",
                    fontSize: 14,
                    fontWeight: 800,
                  }}
                >
                  {s.isLive ? <IconRadio size={22} color="#fff" stroke={2} /> : s.badge}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 700,
                      color: active ? "#fff" : NAVY,
                      ...CLAMP(1),
                    }}
                  >
                    {s.name}
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: active ? "rgba(255,255,255,0.65)" : MUTED,
                      marginTop: 2,
                      ...CLAMP(1),
                    }}
                  >
                    {s.subtitle}
                  </div>
                </div>
              </div>
              <div
                style={{
                  marginTop: 10,
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: "0.06em",
                  color: s.isLive ? (active ? "#fff" : BLUE) : s.color,
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                }}
              >
                {s.isLive ? (
                  <>
                    <span
                      style={{
                        width: 5,
                        height: 5,
                        borderRadius: "50%",
                        background: radio.isPlaying ? "#E53935" : "rgba(255,255,255,0.5)",
                      }}
                    />
                    {radio.isPlaying ? "LIVE" : "PAUSED"}
                  </>
                ) : (
                  "COMING SOON"
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Recently played */}
      <SectionHeader eyebrow="Recently played" actionLabel="View all" onAction={() => onNavigate("/radio")} />
      <div
        style={{
          margin: `0 ${PAD}px`,
          background: "#fff",
          border: `1px solid ${HAIRLINE}`,
          borderRadius: 12,
          padding: 12,
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}
      >
        <div
          style={{
            width: 52,
            height: 52,
            borderRadius: 10,
            flexShrink: 0,
            background: NAVY,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
          }}
        >
          {artwork && !artworkFailed ? (
            <img
              src={artwork}
              alt=""
              onError={() => setArtworkFailed(true)}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          ) : (
            <>
              <div style={{ color: "#fff", fontSize: 13, fontWeight: 800, lineHeight: 1 }}>PRO</div>
              <div style={{ color: BLUE, fontSize: 9, fontWeight: 700 }}>LIVE</div>
            </>
          )}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: NAVY, ...CLAMP(1) }}>{station}</div>
          <div style={{ fontSize: 12, color: MUTED, marginTop: 2, ...CLAMP(1) }}>{subtitle}</div>
        </div>
        <button
          type="button"
          aria-label={radio.isPlaying ? "Pause" : "Play"}
          onClick={() => radio.toggle()}
          style={{
            width: 38,
            height: 38,
            borderRadius: "50%",
            border: `1px solid ${HAIRLINE}`,
            background: "#fff",
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
          }}
        >
          {radio.isPlaying ? (
            <IconPlayerPause size={17} color={NAVY} fill={NAVY} stroke={1} />
          ) : (
            <IconPlayerPlay size={17} color={NAVY} fill={NAVY} stroke={1} style={{ marginLeft: 2 }} />
          )}
        </button>
      </div>

      {/* Featured shows */}
      <SectionHeader eyebrow="Featured shows" actionLabel="View all" onAction={() => onNavigate("/radio")} />
      <div style={SCROLL_ROW}>
        {PRO_SHOWS.map((show) => (
          <div
            key={show.title}
            onClick={() => onNavigate("/radio")}
            style={{ ...CARD_SNAP, width: 150, cursor: "pointer" }}
          >
            <div
              style={{
                height: 106,
                borderRadius: 12,
                background: show.gradient,
                display: "flex",
                alignItems: "flex-end",
                padding: 10,
                color: "#fff",
                fontSize: 15,
                fontWeight: 800,
                lineHeight: 1.15,
                textTransform: "uppercase",
              }}
            >
              <span style={CLAMP(2)}>{show.title}</span>
            </div>
            <div style={{ fontSize: 13, fontWeight: 700, color: NAVY, marginTop: 8, ...CLAMP(1) }}>
              {show.title}
            </div>
            <div style={{ fontSize: 11, color: MUTED, marginTop: 2, ...CLAMP(1) }}>{show.schedule}</div>
          </div>
        ))}
      </div>
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
      <SectionHeader
        eyebrow="Pro Radio"
        title="Ad free radio for ADIs and PDIs"
        actionLabel="Listen live"
        onAction={() => onNavigate("/radio")}
      />
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
      <SectionHeader eyebrow="Podcasts" title="Listen on the road" onAction={onOpen} />
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
      <SectionHeader
        eyebrow="Pro Shop"
        title="Kit for your car"
        onAction={() => onNavigate("/marketplace")}
      />
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
          .limit(12),
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
          <div style={{ fontSize: 15, fontWeight: 600, color: MUTED }}>
            Your PRO membership
          </div>
          <div style={{ fontSize: 13, color: MUTED, marginTop: 2, lineHeight: 1.4, maxWidth: 280 }}>
            Premium exclusive perks for members.
          </div>
        </header>

        <PerksSection perks={perks} onNavigate={go} />
        <RadioHeroCard onNavigate={go} />
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
