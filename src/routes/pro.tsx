import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  IconAlertTriangle,
  IconBell,
  IconBook,

  IconChevronRight,
  IconDeviceTv,
  IconGift,
  IconMessageCircle,
  IconMessages,
  IconPlayerPlay,
  IconRadio,
  IconGasStation,
  IconHeartbeat,
  IconDeviceMobile,
  IconDots,

  IconSearch,
  IconShoppingBag,
  IconShieldCheck,
  IconSteeringWheel,
  IconUsers,
  IconWaveSine,

} from "@tabler/icons-react";
import { PageLayout } from "@/components/PageLayout";
import { useProRadioContext } from "@/hooks/useProRadio";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "@/lib/toast";

import proImage from "@/assets/pro-image.png.asset.json";
import proLogo from "@/assets/pro-logo-padded.png";

const POPPINS = { fontFamily: "Poppins, sans-serif" } as const;
const SORA = { fontFamily: "Sora, Poppins, sans-serif" } as const;
const PAGE_BG = "#EEF2F7";
const NAVY = "#0B1F3A";
const BLUE = "#1877D6";
const TEXT_SECONDARY = "#6B7686";
const HAIRLINE = "#E4E8EF";
const CARD_RADIUS = 8;

/** Home-style section eyebrow: 3px accent bar + small blue uppercase title. */
function SectionHead({
  title,
  actionLabel,
  onAction,
  right,
}: {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
  right?: React.ReactNode;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 10,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span
          aria-hidden
          style={{
            display: "inline-block",
            width: 3,
            height: 12,
            borderRadius: 12,
            backgroundColor: BLUE,
          }}
        />
        <h2
          style={{
            ...POPPINS,
            margin: 0,
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: "0.12em",
            color: BLUE,
            textTransform: "uppercase",
          }}
        >
          {title}
        </h2>
      </div>
      {right}
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          style={{
            ...POPPINS,
            background: "none",
            border: "none",
            padding: 0,
            cursor: "pointer",
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: 0.8,
            textTransform: "uppercase",
            color: BLUE,
          }}
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}

function SquareTile({
  icon,
  label,
  onClick,
  selected,
  disabled,
}: {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
  selected?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        ...POPPINS,
        flex: "1 1 0",
        minWidth: 0,
        aspectRatio: "1 / 1",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 5,
        padding: 6,
        borderRadius: 8,
        cursor: "pointer",
        fontSize: "clamp(8px, 2.3vw, 9.5px)",
        fontWeight: 700,
        lineHeight: 1.1,
        textAlign: "center",
        background: selected ? BLUE : "#fff",
        color: selected ? "#fff" : "rgba(11,31,58,0.62)",
        border: selected ? "none" : `1px solid ${HAIRLINE}`,
        boxShadow: selected
          ? "0 8px 18px -8px rgba(24,119,214,0.8)"
          : "0 1px 2px rgba(11,31,58,0.05)",
        opacity: disabled ? 0.75 : 1,
      }}
    >
      <span
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          width: 22,
          height: 22,
          overflow: "hidden",
          transform: "scale(0.88)",
        }}
      >
        {icon}
      </span>
      <span style={{ width: "100%", wordBreak: "break-word" }}>{label}</span>
    </button>
  );
}

function TileRow({ children }: { children: React.ReactNode }) {
  return <div style={{ display: "flex", gap: 8, marginTop: 14 }}>{children}</div>;
}


const SUPABASE_URL = "https://bjpqxfrihwjcqprmoqfs.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJqcHF4ZnJpaHdqY3Fwcm1vcWZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE0NzQ4MjEsImV4cCI6MjA5NzA1MDgyMX0.HKlgx3dxP3uxX9wMRRUnfb0IPwaBpFcut_iUgT5XFeo";

async function sbGet<T>(path: string): Promise<T> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
  });
  if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
  return (await res.json()) as T;
}

/* ------------------------------------------------------------------ */
// Types
/* ------------------------------------------------------------------ */

type LearnVideo = {
  id: string;
  title: string;
  description: string | null;
  video_url: string | null;
  video_embed_url: string | null;
  thumbnail_url: string | null;
  category: string | null;
  is_published: boolean;
  sort_order: number | null;
};

type FeaturedPerk = {
  id: string;
  name: string;
  saving: string | null;
  description: string | null;
  category: string | null;
  hero_image_url: string | null;
  partner_name: string;
  partner_logo_url: string | null;
};

type ShopListing = {
  id: string;
  title: string;
  price_display: string | null;
  image_urls: string[] | null;
  marketplace_suppliers?: { name: string; logo_url: string | null; is_verified: boolean } | null;
};

type FeedItem = {
  id: string;
  type: "chat" | "alert" | "video" | "bitesize" | "perk" | "shop";
  title: string;
  body: string;
  author: string | null;
  source: string;
  route: string;
  created_at: string;
};


/* ------------------------------------------------------------------ */
// Helpers
/* ------------------------------------------------------------------ */

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

const AVATAR_COLORS = ["#1877D6", "#CC2229", "#0B1F3A", "#0F9D58", "#8B5CF6"];

function avatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function firstInitial(name: string): string {
  return name.trim()[0]?.toUpperCase() ?? "?";
}

function communityAvatarColor(name: string): string {
  const initial = firstInitial(name);
  if (initial >= "A" && initial <= "E") return "#2C97DE";
  if (initial >= "F" && initial <= "J") return "#18A999";
  if (initial >= "K" && initial <= "O") return "#7B61FF";
  if (initial >= "P" && initial <= "T") return "#F59E0B";
  return "#E53935";
}

function sentenceCase(s: string): string {
  if (!s) return "";
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

function formatMoneyDisplay(raw: string | null): string {
  if (!raw) return "";
  const cleaned = raw.replace(/\s/g, "");
  if (/^£\d/.test(cleaned)) return cleaned;
  if (/^\d/.test(cleaned)) return `£${cleaned}`;
  return raw;
}

/* ------------------------------------------------------------------ */
// Radio card
/* ------------------------------------------------------------------ */

const STATIONS: Record<string, { name: string; stream: string; comingSoon: boolean }> = {
  "PRO Live": { name: "PRO Live", stream: "https://ice1.somafm.com/groovesalad-256-mp3", comingSoon: false },
  "PRO 80s": { name: "PRO 80s", stream: "", comingSoon: true },
  "PRO 90s": { name: "PRO 90s", stream: "", comingSoon: true },
  "PRO Chill": { name: "PRO Chill", stream: "", comingSoon: true },
  "PRO Drive": { name: "PRO Drive", stream: "", comingSoon: true },
  "PRO Xmas": { name: "PRO Xmas", stream: "", comingSoon: true },
};

function WaveformIcon() {
  const bars = [10, 18, 24, 18, 10];
  return (
    <span style={{ display: "flex", alignItems: "center", gap: 2.5 }}>
      {bars.map((h, i) => (
        <span key={i} style={{ width: 3, height: h, borderRadius: 2, background: BLUE }} />
      ))}
    </span>
  );
}

function DecadeIcon({ label, from, to }: { label: string; from: string; to: string }) {
  return (
    <span
      style={{
        fontSize: 19,
        fontWeight: 800,
        letterSpacing: -0.5,
        backgroundImage: `linear-gradient(135deg, ${from}, ${to})`,
        WebkitBackgroundClip: "text",
        backgroundClip: "text",
        color: "transparent",
      }}
    >
      {label}
    </span>
  );
}

const STATION_TILES: { name: string; icon: React.ReactNode }[] = [
  { name: "PRO Live", icon: <WaveformIcon /> },
  { name: "PRO 80s", icon: <DecadeIcon label="80s" from="#F59E0B" to="#E53935" /> },
  { name: "PRO 90s", icon: <DecadeIcon label="90s" from="#7B61FF" to="#2C97DE" /> },
  { name: "PRO Xmas", icon: <IconSteeringWheel size={24} color="#F97316" stroke={2} /> },
];

function RadioCard() {
  const radio = useProRadioContext();
  const [selectedChip, setSelectedChip] = useState<string>(radio.selectedStation || "PRO Live");

  useEffect(() => {
    if (radio.selectedStation) setSelectedChip(radio.selectedStation);
  }, [radio.selectedStation]);

  const handleChip = (name: string) => {
    const station = STATIONS[name];
    if (!station) return;
    if (station.comingSoon) {
      toast(`${station.name} coming soon! 🎧`);
      return;
    }
    radio.setStation(station);
    setSelectedChip(name);
  };

  const station = selectedChip;
  const nowTitle = radio.isPlaying
    ? radio.nowPlaying?.title || station
    : station;

  return (
    <section style={{ ...POPPINS }}>
      <SectionHead
        title="PRO Radio"
        right={
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              background: "rgba(229,57,53,0.10)",
              color: "#E53935",
              fontSize: 10,
              fontWeight: 800,
              letterSpacing: 1.2,
              padding: "3px 8px",
              borderRadius: 8,
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: "#E53935",
                display: "inline-block",
              }}
            />
            LIVE
          </span>
        }
      />

      {/* Navy hero player */}
      <div
        style={{
          position: "relative",
          overflow: "hidden",
          borderRadius: 8,
          padding: 20,
          background: `linear-gradient(150deg, ${NAVY} 0%, #10305C 60%, #0B1F3A 100%)`,
          boxShadow: "0 18px 40px -18px rgba(11,31,58,0.65)",
          color: "#fff",
        }}
      >
        <div
          aria-hidden
          style={{
            position: "absolute",
            right: -30,
            top: -40,
            width: 160,
            height: 160,
            borderRadius: "50%",
            background: BLUE,
            opacity: 0.22,
            filter: "blur(46px)",
            pointerEvents: "none",
          }}
        />

        <div style={{ position: "relative", zIndex: 1 }}>
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: 2,
              textTransform: "uppercase",
              color: "#7FB6EE",
            }}
          >
            {selectedChip}
          </div>

          <h3
            style={{
              ...SORA,
              margin: "8px 0 18px",
              fontSize: 17,
              fontWeight: 700,
              lineHeight: 1.3,
              letterSpacing: -0.2,
            }}
          >
            {radio.isPlaying ? nowTitle : "Ad free radio, made for driving instructors."}
          </h3>

          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <button
              type="button"
              aria-label={radio.isPlaying ? "Pause" : "Play"}
              onClick={() => {
                if (radio.isPlaying) radio.pause();
                else radio.play();
                setSelectedChip("PRO Live");
              }}
              style={{
                width: 52,
                height: 52,
                borderRadius: "50%",
                background: "#fff",
                border: "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                cursor: "pointer",
                boxShadow: "0 10px 24px rgba(0,0,0,0.35)",
              }}
            >
              {radio.isPlaying ? (
                <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <span style={{ width: 4, height: 17, background: NAVY, borderRadius: 2 }} />
                  <span style={{ width: 4, height: 17, background: NAVY, borderRadius: 2 }} />
                </span>
              ) : (
                <IconPlayerPlay size={22} color={NAVY} fill={NAVY} stroke={1.2} style={{ marginLeft: 3 }} />
              )}
            </button>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 10,
                  fontWeight: 500,
                  color: "#9DC5EC",
                  marginBottom: 6,
                }}
              >
                <span>{radio.isPlaying ? "On air now" : "Tap to tune in"}</span>
                <span>24/7</span>
              </div>
              <div style={{ height: 4, borderRadius: 999, background: "rgba(255,255,255,0.12)" }}>
                <div
                  style={{
                    height: "100%",
                    width: radio.isPlaying ? "66%" : "12%",
                    borderRadius: 999,
                    background: BLUE,
                    transition: "width 400ms ease",
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Station tiles */}
      <div
        style={{
          display: "flex",
          gap: 8,
          marginTop: 14,
          paddingBottom: 2,
        }}
      >
        {STATION_TILES.map((s) => {
          const stationCfg = STATIONS[s.name];
          const selected = selectedChip === s.name;
          const comingSoon = stationCfg?.comingSoon ?? true;
          return (
            <button
              key={s.name}
              type="button"
              onClick={() => handleChip(s.name)}
              style={{
                ...POPPINS,
                flex: "1 1 0",
                minWidth: 0,
                minHeight: 0,
                aspectRatio: "1 / 1",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 5,
                padding: 6,
                borderRadius: 8,
                cursor: "pointer",
                fontSize: "clamp(8px, 2.3vw, 9.5px)",
                fontWeight: 700,
                lineHeight: 1.1,
                textAlign: "center",
                background: selected ? BLUE : "#fff",
                color: selected ? "#fff" : "rgba(11,31,58,0.62)",
                border: selected ? "none" : `1px solid ${HAIRLINE}`,
                boxShadow: selected
                  ? "0 8px 18px -8px rgba(24,119,214,0.8)"
                  : "0 1px 2px rgba(11,31,58,0.05)",
                opacity: comingSoon && !selected ? 0.75 : 1,
              }}
            >
              <span
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  width: 22,
                  height: 22,
                  overflow: "hidden",
                  transform: "scale(0.88)",
                  transformOrigin: "center",
                }}
              >
                {s.icon}
              </span>
              <span style={{ width: "100%", wordBreak: "break-word" }}>{s.name}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}



/* ------------------------------------------------------------------ */
// PRO TV card
/* ------------------------------------------------------------------ */

const TV_TILES: { name: string; to: string; icon: React.ReactNode }[] = [
  { name: "PRO Learn", to: "/dsm-learn", icon: <IconBook size={24} color="#1877D6" stroke={2} /> },
  { name: "Showcase", to: "/showcase", icon: <IconUsers size={24} color="#7C3AED" stroke={2} /> },
  { name: "Bitesize", to: "/bitesize", icon: <IconPlayerPlay size={24} color="#18A999" stroke={2} /> },
  { name: "Live", to: "/dsm-live", icon: <IconDeviceTv size={24} color="#E5484D" stroke={2} /> },
];

function ProTvCard({ video, onNavigate }: { video: LearnVideo | null; onNavigate: (to: string) => void }) {
  const v = video ?? {
    id: "mock",
    title: "How to pass your standards check",
    description: "A step-by-step guide to help you prepare, stay calm and pass with confidence.",
    video_url: null,
    video_embed_url: null,
    thumbnail_url: null,
    category: "Training",
    is_published: true,
    sort_order: null,
  } as LearnVideo;

  const thumb = v.thumbnail_url || proImage.url;
  const categoryLabel = (v.category || "Training").toUpperCase();

  return (
    <section style={{ ...POPPINS }}>
      {/* Home-style section header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 10,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span
            aria-hidden
            style={{
              display: "inline-block",
              width: 3,
              height: 12,
              borderRadius: 12,
              backgroundColor: BLUE,
            }}
          />
          <span
            style={{
              ...POPPINS,
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: BLUE,
            }}
          >
            PRO TV
          </span>
        </div>
        <span
          style={{
            ...POPPINS,
            fontSize: 10,
            fontWeight: 800,
            letterSpacing: 0.8,
            textTransform: "uppercase",
            color: "#fff",
            background: BLUE,
            padding: "4px 9px",
            borderRadius: 999,
          }}
        >
          NEW
        </span>
      </div>

      <div
        onClick={() => onNavigate("/dsm-live")}
        style={{
          position: "relative",
          borderRadius: 12,
          overflow: "hidden",
          cursor: "pointer",
          background: "#fff",
          border: `1px solid ${HAIRLINE}`,
          boxShadow: "0 4px 14px -4px rgba(11,31,58,0.10)",
          padding: 16,
        }}
      >
        <div style={{ display: "flex", gap: 16, alignItems: "stretch" }}>
          {/* Thumbnail ~42% */}
          <div
            style={{
              position: "relative",
              flex: "0 0 42%",
              minWidth: 0,
              borderRadius: 10,
              overflow: "hidden",
              background: NAVY,
              aspectRatio: "1 / 1",
            }}
          >
            <img
              src={thumb}
              alt={v.title}
              style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
            />

            {/* Play button */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <span
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: "50%",
                  background: "rgba(255,255,255,0.92)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 6px 16px rgba(0,0,0,0.25)",
                }}
              >
                <IconPlayerPlay size={20} color={NAVY} fill={NAVY} stroke={1.2} style={{ marginLeft: 2 }} />
              </span>
            </div>

            {/* Duration label */}
            <div
              style={{
                position: "absolute",
                bottom: 8,
                left: 8,
                background: "rgba(0,0,0,0.65)",
                color: "#fff",
                fontSize: 11,
                fontWeight: 700,
                padding: "3px 7px",
                borderRadius: 4,
              }}
            >
              18:00
            </div>
          </div>

          {/* Text content ~58% */}
          <div
            style={{
              flex: 1,
              minWidth: 0,
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              padding: "4px 0",
            }}
          >
            <span
              style={{
                ...POPPINS,
                fontSize: 10,
                fontWeight: 800,
                letterSpacing: 1,
                textTransform: "uppercase",
                color: "#7C3AED",
                marginBottom: 8,
              }}
            >
              {categoryLabel}
            </span>

            <h3
              style={{
                ...SORA,
                margin: 0,
                color: NAVY,
                fontSize: 17,
                fontWeight: 800,
                lineHeight: 1.22,
                letterSpacing: -0.3,
                marginBottom: 8,
              }}
            >
              {v.title}
            </h3>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                fontSize: 13,
                fontWeight: 500,
                color: "#6B7686",
                marginBottom: 8,
              }}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#6B7686"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              <span>18 min</span>
              <span style={{ color: HAIRLINE }}>·</span>
              <span>Beginner</span>
            </div>

            {v.description && (
              <p
                style={{
                  margin: 0,
                  color: "#6B7686",
                  fontSize: 13,
                  lineHeight: 1.5,
                  overflow: "hidden",
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                }}
              >
                {v.description}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Quick tiles */}
      <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
        {TV_TILES.map((t) => (
          <button
            key={t.name}
            type="button"
            onClick={() => onNavigate(t.to)}
            style={{
              ...POPPINS,
              flex: "1 1 0",
              minWidth: 0,
              aspectRatio: "1 / 1",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 5,
              padding: 6,
              borderRadius: 8,
              cursor: "pointer",
              fontSize: "clamp(8px, 2.3vw, 9.5px)",
              fontWeight: 700,
              lineHeight: 1.1,
              textAlign: "center",
              background: "#fff",
              color: "rgba(11,31,58,0.62)",
              border: `1px solid ${HAIRLINE}`,
              boxShadow: "0 1px 2px rgba(11,31,58,0.05)",
            }}
          >
            <span
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                width: 22,
                height: 22,
                overflow: "hidden",
                transform: "scale(0.88)",
              }}
            >
              {t.icon}
            </span>
            <span style={{ width: "100%", wordBreak: "break-word" }}>{t.name}</span>
          </button>
        ))}
      </div>
    </section>
  );
}



/* ------------------------------------------------------------------ */
// PRO Perks card
/* ------------------------------------------------------------------ */

function categoryIcon(label: string) {
  const l = label.toLowerCase();
  if (l.includes("fuel") || l.includes("motor") || l.includes("car")) return IconGasStation;
  if (l.includes("health") || l.includes("well") || l.includes("fit")) return IconHeartbeat;
  if (l.includes("sim") || l.includes("phone") || l.includes("mobile")) return IconDeviceMobile;
  if (l.includes("insur") || l.includes("legal") || l.includes("finance")) return IconShieldCheck;
  if (l.includes("shop") || l.includes("retail")) return IconShoppingBag;
  if (l.includes("learn") || l.includes("train") || l.includes("course")) return IconBook;
  return IconGift;
}

function categoryTileColor(label: string) {
  const l = label.toLowerCase();
  if (l.includes("fuel") || l.includes("motor") || l.includes("car")) return "#E53935";
  if (l.includes("health") || l.includes("well") || l.includes("fit")) return "#16A34A";
  if (l.includes("sim") || l.includes("phone") || l.includes("mobile")) return "#1877D6";
  if (l === "more") return "#6B7686";
  return "#7B61FF";
}

function PerkSlide({ p, onNavigate }: { p: FeaturedPerk; onNavigate: (to: string) => void }) {
  const [imgOk, setImgOk] = useState(true);
  const showImage = Boolean(p.hero_image_url) && imgOk;
  const offer = p.saving || p.description || "Exclusive member saving";
  const offerParts = offer.split(/(\d+%)/);

  return (
    <div
      onClick={() => onNavigate("/perks")}
      style={{
        width: "100%",
        flexShrink: 0,
        borderRadius: 8,
        overflow: "hidden",
        position: "relative",
        cursor: "pointer",
        background: `linear-gradient(115deg, ${NAVY} 0%, #123566 55%, #1C5FA8 100%)`,
        boxShadow: "0 16px 38px -18px rgba(11,31,58,0.6), 0 0 0 0.5px rgba(255,255,255,0.10) inset",
        padding: "16px 16px 14px",
        display: "flex",
        alignItems: "stretch",
        gap: 12,
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(90% 120% at 88% 15%, rgba(24,119,214,0.45) 0%, rgba(24,119,214,0) 62%)",
          pointerEvents: "none",
        }}
      />

      {/* Left: content */}
      <div style={{ flex: 1, minWidth: 0, position: "relative", display: "flex", flexDirection: "column" }}>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: 1,
            textTransform: "uppercase",
            color: "#7FB6EE",
          }}
        >
          <IconGift size={12} stroke={2.2} /> PRO Perks
        </div>

        <div style={{ ...SORA, marginTop: 8, fontSize: 19, fontWeight: 800, color: "#fff", lineHeight: 1.15, letterSpacing: -0.3 }}>
          {p.name}
        </div>

        <div style={{ marginTop: 6, fontSize: 12.5, color: "rgba(255,255,255,0.72)", lineHeight: 1.4 }}>
          {offerParts.map((part, i) =>
            /^\d+%$/.test(part) ? (
              <span key={i} style={{ color: "#6FB4F2", fontWeight: 800 }}>
                {part}
              </span>
            ) : (
              <span key={i}>{part}</span>
            )
          )}
        </div>

        {p.partner_name && (
          <div
            style={{
              marginTop: 8,
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: 0.5,
              textTransform: "uppercase",
              color: "rgba(255,255,255,0.45)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {p.partner_name}
            {p.category ? ` · ${p.category}` : ""}
          </div>
        )}
      </div>

      {/* Right: real perk image + CTA */}
      <div
        style={{
          position: "relative",
          width: 130,
          flexShrink: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-end",
          justifyContent: "space-between",
          gap: 10,
        }}
      >
        <div
          style={{
            width: 130,
            height: 84,
            borderRadius: 8,
            overflow: "hidden",
            background: "rgba(255,255,255,0.08)",
            border: "0.5px solid rgba(255,255,255,0.18)",
            boxShadow: "0 10px 24px rgba(10,6,40,0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {showImage ? (
            <img
              src={p.hero_image_url ?? undefined}
              alt={p.name}
              onError={() => setImgOk(false)}
              style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
            />
          ) : (
            <IconGift size={40} color="rgba(255,255,255,0.85)" stroke={1.4} />
          )}
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onNavigate("/perks");
          }}
          style={{
            background: "#fff",
            color: NAVY,
            border: "none",
            borderRadius: 999,
            padding: "8px 16px",
            fontSize: 13,
            fontWeight: 800,
            cursor: "pointer",
            fontFamily: POPPINS.fontFamily,
            boxShadow: "0 6px 16px rgba(10,6,40,0.4)",
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
          }}
        >
          Claim <IconChevronRight size={14} stroke={2.6} />
        </button>
      </div>
    </div>
  );
}

function PerksCard({
  perks,
  categories,
  onNavigate,
}: {
  perks: FeaturedPerk[];
  categories: string[];
  onNavigate: (to: string) => void;
}) {
  const [index, setIndex] = useState(0);
  const pausedRef = useRef(false);
  const touchStartX = useRef<number | null>(null);

  const count = perks.length;

  useEffect(() => {
    if (count <= 1) return;
    const t = setInterval(() => {
      if (pausedRef.current) return;
      setIndex((i) => (i + 1) % count);
    }, 6000);
    return () => clearInterval(t);
  }, [count]);

  useEffect(() => {
    if (index >= count) setIndex(0);
  }, [count, index]);

  if (count === 0) return null;

  const catLabels = categories.slice(0, 3);

  return (
    <section style={{ ...POPPINS }}>
      <SectionHead title="PRO Perks" actionLabel="See all" onAction={() => onNavigate("/perks")} />
      {/* Carousel */}
      <div
        style={{ overflow: "hidden", borderRadius: 20 }}
        onTouchStart={(e) => {
          pausedRef.current = true;
          touchStartX.current = e.touches[0]?.clientX ?? null;
        }}
        onTouchEnd={(e) => {
          pausedRef.current = false;
          const start = touchStartX.current;
          touchStartX.current = null;
          if (start == null || count <= 1) return;
          const dx = (e.changedTouches[0]?.clientX ?? start) - start;
          if (Math.abs(dx) < 40) return;
          setIndex((i) => (dx < 0 ? (i + 1) % count : (i - 1 + count) % count));
        }}
      >
        <div
          style={{
            display: "flex",
            transform: `translateX(-${index * 100}%)`,
            transition: "transform 380ms cubic-bezier(0.22,0.61,0.36,1)",
          }}
        >
          {perks.map((p) => (
            <PerkSlide key={p.id} p={p} onNavigate={onNavigate} />
          ))}
        </div>
      </div>

      {/* Dots */}
      {count > 1 && (
        <div style={{ display: "flex", justifyContent: "center", gap: 5, marginTop: 8 }}>
          {perks.map((p, i) => (
            <button
              key={p.id}
              type="button"
              aria-label={`Show perk ${i + 1}`}
              onClick={() => setIndex(i)}
              style={{
                width: i === index ? 16 : 6,
                height: 6,
                borderRadius: 999,
                border: "none",
                padding: 0,
                cursor: "pointer",
                background: i === index ? "#1877D6" : "#D6D9E0",
                transition: "width 220ms ease, background 220ms ease",
              }}
            />
          ))}
        </div>
      )}

      {/* Category tiles — same square tile design as under PRO TV */}
      <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
        {[...catLabels, "More"].map((label) => {
          const Icon = label === "More" ? IconDots : categoryIcon(label);
          const color = categoryTileColor(label);
          const to =
            label === "More"
              ? "/perks"
              : `/perks?category=${encodeURIComponent(label.toLowerCase())}`;
          return (
            <button
              key={label}
              type="button"
              onClick={() => onNavigate(to)}
              style={{
                ...POPPINS,
                flex: "1 1 0",
                minWidth: 0,
                aspectRatio: "1 / 1",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 5,
                padding: 6,
                borderRadius: 8,
                cursor: "pointer",
                fontSize: "clamp(8px, 2.3vw, 9.5px)",
                fontWeight: 700,
                lineHeight: 1.1,
                textAlign: "center",
                background: "#fff",
                color: "rgba(11,31,58,0.62)",
                border: `1px solid ${HAIRLINE}`,
                boxShadow: "0 1px 2px rgba(11,31,58,0.05)",
              }}
            >
              <span
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  width: 22,
                  height: 22,
                  overflow: "hidden",
                  transform: "scale(0.88)",
                  color,
                }}
              >
                <Icon size={24} stroke={2} />
              </span>
              <span style={{ width: "100%", wordBreak: "break-word" }}>{label}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}



/* ------------------------------------------------------------------ */
// What's happening feed
/* ------------------------------------------------------------------ */

const SOURCE_BADGES: Record<string, { label: string; icon: React.ReactNode; bg: string; color: string }> = {
  "Chat room": { label: "Chat room", icon: <IconMessages size={10} />, bg: "#EAF5FC", color: "#2C97DE" },
  "Local alert": { label: "Local alert", icon: <IconAlertTriangle size={10} />, bg: "#FEF3C7", color: "#F59E0B" },
  "PRO TV": { label: "PRO TV", icon: <IconDeviceTv size={10} />, bg: "#FEE2E2", color: "#E53935" },
  Bitesize: { label: "Bitesize", icon: <IconBook size={10} />, bg: "#F0EBFF", color: "#7B61FF" },
  "PRO Perks": { label: "PRO Perks", icon: <IconGift size={10} />, bg: "#DCFCE7", color: "#16A34A" },
  "PRO Shop": { label: "PRO Shop", icon: <IconShoppingBag size={10} />, bg: "#FEF3C7", color: "#F59E0B" },
  "Community post": { label: "Community post", icon: <IconUsers size={10} />, bg: "#DCFCE7", color: "#16A34A" },
};

function SourceBadge({ source }: { source?: string }) {
  const config = SOURCE_BADGES[source || "Community post"] ?? SOURCE_BADGES["Community post"];
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 3,
        fontSize: 10,
        fontWeight: 600,
        borderRadius: 8,
        padding: "2px 8px",
        background: config.bg,
        color: config.color,
      }}
    >
      {config.icon}
      {config.label}
    </span>
  );
}

const TYPE_ICONS: Record<FeedItem["type"], { bg: string; node: React.ReactNode }> = {
  chat: { bg: "#EAF5FC", node: <IconMessages size={18} color="#2C97DE" /> },
  alert: { bg: "#FEF3C7", node: <IconAlertTriangle size={18} color="#F59E0B" /> },
  video: { bg: "#FEE2E2", node: <IconDeviceTv size={18} color="#E53935" /> },
  bitesize: { bg: "#F0EBFF", node: <IconBook size={18} color="#7B61FF" /> },
  perk: { bg: "#DCFCE7", node: <IconGift size={18} color="#16A34A" /> },
  shop: { bg: "#FEF3C7", node: <IconShoppingBag size={18} color="#F59E0B" /> },
};

const FEED_FALLBACK: FeedItem[] = [
  {
    id: "1",
    type: "chat",
    title: "Winchester chat room",
    body: "Anyone covering Winchester this week?",
    author: "Dave M",
    source: "Chat room",
    route: "/community",
    created_at: new Date(Date.now() - 2 * 60000).toISOString(),
  },
  {
    id: "2",
    type: "alert",
    title: "Roadworks — Bar End Road",
    body: "Expect delays near the test centre",
    author: null,
    source: "Local alert",
    route: "/community",
    created_at: new Date(Date.now() - 60 * 60000).toISOString(),
  },
  {
    id: "3",
    type: "video",
    title: "New video: Getting started with EDP",
    body: "Getting started",
    author: null,
    source: "PRO TV",
    route: "/dsm-live",
    created_at: new Date(Date.now() - 2 * 60 * 60000).toISOString(),
  },
];

function WhatsHappeningCard({ items, onNavigate }: { items: FeedItem[]; onNavigate: (to: string) => void }) {
  const newCount = items.filter((i) => Date.now() - new Date(i.created_at).getTime() < 86400000).length;
  const displayRows = items.length > 0 ? items.slice(0, 7) : FEED_FALLBACK;

  return (
    <section style={{ ...POPPINS }}>
      <SectionHead
        title="What's happening"
        right={
          newCount > 0 ? (
            <span
              style={{
                background: "rgba(229,57,53,0.10)",
                color: "#E53935",
                fontSize: 10,
                fontWeight: 800,
                letterSpacing: 0.6,
                padding: "3px 8px",
                borderRadius: 8,
                textTransform: "uppercase",
              }}
            >
              {newCount} new
            </span>
          ) : undefined
        }
        actionLabel="See all"
        onAction={() => onNavigate("/community")}
      />

      <div
        style={{
          background: "#fff",
          borderRadius: 8,
          border: `0.5px solid ${HAIRLINE}`,
          overflow: "hidden",
          boxShadow: "0 6px 18px -12px rgba(11,31,58,0.35)",
        }}
      >
        {displayRows.map((row, idx) => {
          const icon = TYPE_ICONS[row.type];
          return (
            <div
              key={`${row.type}-${row.id}`}
              onClick={() => onNavigate(row.route)}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 10,
                padding: "10px 14px",
                cursor: "pointer",
                borderBottom: idx < displayRows.length - 1 ? "0.5px solid #F4F6F8" : "none",
              }}
            >
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: "50%",
                  background: row.author ? communityAvatarColor(row.author) : icon.bg,
                  color: "#fff",
                  fontSize: 13,
                  fontWeight: 700,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                {row.author ? firstInitial(row.author) : icon.node}
              </div>
              <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 8,
                  }}
                >
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: "#0B2341",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {row.author || row.title}
                  </span>
                  <span style={{ fontSize: 10, color: "#D1D5DB", flexShrink: 0 }}>{timeAgo(row.created_at)}</span>
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: "#536579",
                    lineHeight: 1.4,
                    marginTop: 2,
                    overflow: "hidden",
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                  }}
                >
                  {row.body}
                </div>
                <div style={{ marginTop: 4 }}>
                  <SourceBadge source={row.source} />
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
// PRO Shop card
/* ------------------------------------------------------------------ */

function ShopCard({ listings, onNavigate }: { listings: ShopListing[]; onNavigate: (to: string) => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const products = listings.length
    ? listings
    : ([
        { id: "1", title: "Garmin Dash Cam 67W", price_display: "£259.99", image_urls: [] },
        { id: "2", title: "Dash Cam Hardwire Kit", price_display: "£29.99", image_urls: [] },
        { id: "3", title: "ADI Badge Holder", price_display: "£8.99", image_urls: [] },
      ] as ShopListing[]);

  const GAP = 12;

  const handleScroll = () => {
    const el = containerRef.current;
    if (!el) return;
    const card = el.firstElementChild as HTMLElement | null;
    const cardWidth = card ? card.getBoundingClientRect().width : el.offsetWidth / 2;
    const idx = Math.round(el.scrollLeft / (cardWidth + GAP));
    setActiveIndex(Math.min(idx, Math.max(0, products.length - 1)));
  };

  return (
    <section style={{ ...POPPINS }}>
      <SectionHead title="PRO Shop" actionLabel="Browse all" onAction={() => onNavigate("/marketplace")} />

      <div
        ref={containerRef}
        onScroll={handleScroll}
        style={{
          display: "flex",
          gap: GAP,
          overflowX: "auto",
          scrollSnapType: "x mandatory",
          WebkitOverflowScrolling: "touch",
          paddingBottom: 8,
          scrollbarWidth: "none",
          msOverflowStyle: "none",
        }}
      >
        {products.map((p) => {
          const image = p.image_urls?.[0] || null;
          return (
            <div
              key={p.id}
              onClick={() => onNavigate(`/marketplace`)}
              style={{
                flex: "0 0 auto",
                width: `calc(50% - ${GAP / 2}px)`,
                scrollSnapAlign: "start",
                background: "#fff",
                borderRadius: CARD_RADIUS,
                border: `0.5px solid ${HAIRLINE}`,
                overflow: "hidden",
                cursor: "pointer",
              }}
            >
              <div
                style={{
                  height: 130,
                  background: image
                    ? `url(${image}) center/cover`
                    : "linear-gradient(135deg, #E4E8EF, #F4F6F8)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {!image && <IconShoppingBag size={32} color="#B8C0CC" stroke={1.5} />}
              </div>
              <div style={{ padding: 12 }}>
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: NAVY,
                    lineHeight: 1.3,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {p.title}
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, color: BLUE, marginTop: 4 }}>
                  {p.price_display ? formatMoneyDisplay(p.price_display) : ""}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {products.length > 1 && (
        <div style={{ display: "flex", justifyContent: "center", gap: 6, marginTop: 6 }}>
          {products.map((_, i) => (
            <span
              key={i}
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: i === activeIndex ? NAVY : "#D1D5DB",
              }}
            />
          ))}
        </div>
      )}
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
        content: "Your professional hub: PRO Radio, PRO TV, Perks, Community and PRO Shop for driving instructors.",
      },
      { property: "og:title", content: "PRO — Every Driver Pro" },
      {
        property: "og:description",
        content: "Your professional hub: PRO Radio, PRO TV, Perks, Community and PRO Shop for driving instructors.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ProPage,
});

function ProPage() {
  const navigate = useNavigate();
  const go = (to: string) => navigate({ to: to as never });

  const [loading, setLoading] = useState(true);
  const [video, setVideo] = useState<LearnVideo | null>(null);
  const [perks, setPerks] = useState<FeaturedPerk[]>([]);
  const [perkCategories, setPerkCategories] = useState<string[]>([]);
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [listings, setListings] = useState<ShopListing[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [videoRes, perkRes, chatRes, listingsRes, alertsRes, tvRes, bitesizeRes, perkFeedRes, shopFeedRes] =
          await Promise.allSettled([

          supabase
            .from("howto_videos")
            .select(
              "id, title, description, video_url, video_embed_url, thumbnail_url, category, is_published, sort_order"
            )
            .eq("is_published", true)
            .order("sort_order", { ascending: true })
            .limit(1),
          supabase
            .from("benefit_perks")
            .select(
              "id, name, saving, description, category, hero_image_url, partner:benefit_partners(name, icon_bg, icon_color)"
            )
            .eq("active", true)
            .order("sort_order", { ascending: true })
            .limit(8),

          supabase
            .from("local_chat_messages")
            .select("id, message, created_at, instructors(name)")
            .is("deleted_at", null)
            .order("created_at", { ascending: false })
            .limit(3),

          sbGet<
            ShopListing[]
          >(
            "marketplace_listings?is_active=eq.true&deleted_at=is.null&order=created_at.desc&select=id,title,price_display,image_urls,marketplace_suppliers(name,logo_url,is_verified)&limit=10"
          ),
          supabase
            .from("local_alerts")
            .select("id, title, body, created_at, alert_type")
            .order("created_at", { ascending: false })
            .limit(2),
          supabase
            .from("howto_videos")
            .select("id, title, category, created_at")
            .eq("is_published", true)
            .order("created_at", { ascending: false })
            .limit(2),
          supabase
            .from("bitesize_videos")
            .select("id, title, category, created_at")
            .eq("is_published", true)
            .order("created_at", { ascending: false })
            .limit(2),
          supabase
            .from("benefit_perks")
            .select("id, name, saving, created_at")
            .eq("active", true)
            .order("created_at", { ascending: false })
            .limit(1),
          supabase
            .from("marketplace_listings")
            .select("id, title, price_display, created_at")
            .eq("is_active", true)
            .is("deleted_at", null)
            .order("created_at", { ascending: false })
            .limit(1),
        ]);


        if (cancelled) return;

        if (videoRes.status === "fulfilled" && videoRes.value.data && videoRes.value.data.length > 0) {
          setVideo(videoRes.value.data[0] as LearnVideo);
        }

        let perkRows: any[] =
          perkRes.status === "fulfilled" && Array.isArray(perkRes.value.data)
            ? (perkRes.value.data as any[])
            : [];

        // If the partner embed fails (e.g. schema drift on benefit_partners),
        // still show the perks themselves rather than hiding the whole section.
        if (perkRows.length === 0) {
          const { data: plainPerks } = await supabase
            .from("benefit_perks")
            .select("id, name, saving, description, category, hero_image_url")
            .eq("active", true)
            .order("sort_order", { ascending: true })
            .limit(8);
          if (cancelled) return;
          if (Array.isArray(plainPerks)) perkRows = plainPerks as any[];
        }

        if (perkRows.length > 0) {
          setPerks(
            perkRows.map((row) => ({
              id: row.id,
              name: row.name,
              saving: row.saving,
              description: row.description,
              category: row.category,
              hero_image_url: row.hero_image_url ?? null,
              partner_name: row.partner?.name ?? "EDP partner",
              partner_logo_url: row.partner?.logo_url ?? null,
            }))
          );

          const cats = Array.from(
            new Set(
              perkRows
                .map((r) => r.category)
                .filter((c): c is string => typeof c === "string" && c.trim().length > 0)
                .map((c) => sentenceCase(c))
            )
          );
          setPerkCategories(cats);
        }

        const rowsOf = (res: PromiseSettledResult<any>): any[] =>
          res.status === "fulfilled" && Array.isArray(res.value?.data) ? res.value.data : [];

        const feedItems: FeedItem[] = [
          ...rowsOf(chatRes).map((r) => ({
            id: String(r.id),
            type: "chat" as const,
            title: "Chat room",
            body: r.message ?? r.body ?? "",
            author: r.instructors?.name ?? null,
            source: "Chat room",
            route: "/community",
            created_at: r.created_at,
          })),
          ...rowsOf(alertsRes).map((r) => ({
            id: String(r.id),
            type: "alert" as const,
            title: r.title ?? "Local alert",
            body: r.body ?? "",
            author: null,
            source: "Local alert",
            route: "/community",
            created_at: r.created_at,
          })),
          ...rowsOf(tvRes).map((r) => ({
            id: String(r.id),
            type: "video" as const,
            title: `New video: ${r.title}`,
            body: r.category || "PRO TV",
            author: null,
            source: "PRO TV",
            route: "/dsm-live",
            created_at: r.created_at,
          })),
          ...rowsOf(bitesizeRes).map((r) => ({
            id: String(r.id),
            type: "bitesize" as const,
            title: `New: ${r.title}`,
            body: r.category || "Bitesize",
            author: null,
            source: "Bitesize",
            route: "/bitesize",
            created_at: r.created_at,
          })),
          ...rowsOf(perkFeedRes).map((r) => ({
            id: String(r.id),
            type: "perk" as const,
            title: `New perk: ${r.name}`,
            body: r.saving || "New deal",
            author: null,
            source: "PRO Perks",
            route: "/perks",
            created_at: r.created_at,
          })),
          ...rowsOf(shopFeedRes).map((r) => ({
            id: String(r.id),
            type: "shop" as const,
            title: r.title,
            body: r.price_display || "PRO Shop",
            author: null,
            source: "PRO Shop",
            route: "/marketplace",
            created_at: r.created_at,
          })),
        ]
          .filter((i) => !!i.created_at)
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          .slice(0, 7);

        setFeed(feedItems);


        if (listingsRes.status === "fulfilled") {
          setListings(listingsRes.value);
        }
      } catch (err) {
        console.error("[pro] load error", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <PageLayout style={{ backgroundColor: PAGE_BG, ...POPPINS }}>
      <div
        style={{
          paddingTop: "calc(env(safe-area-inset-top, 0px) + 48px)",
          paddingLeft: 16,
          paddingRight: 16,
          paddingBottom: "calc(90px + env(safe-area-inset-bottom, 0px))",
          display: "flex",
          flexDirection: "column",
          gap: 26,
        }}
      >
        <RadioCard />
        <ProTvCard video={video} onNavigate={go} />
        <PerksCard perks={perks} categories={perkCategories} onNavigate={go} />
        <WhatsHappeningCard items={feed} onNavigate={go} />
        <ShopCard listings={listings} onNavigate={go} />
      </div>
    </PageLayout>
  );
}

export default ProPage;
