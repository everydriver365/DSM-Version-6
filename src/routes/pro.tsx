import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  IconBell,
  IconChevronRight,
  IconDeviceTv,
  IconGift,
  IconMessageCircle,
  IconPlayerPlay,
  IconRadio,
  IconSearch,
  IconShoppingBag,
  IconSteeringWheel,
  IconUsers,
  IconWaveSine,

} from "@tabler/icons-react";
import { PageLayout } from "@/components/PageLayout";
import { useProRadioContext } from "@/hooks/useProRadio";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "@/lib/toast";

import proImage from "@/assets/pro-image.png.asset.json";

const POPPINS = { fontFamily: "Poppins, sans-serif" } as const;
const PAGE_BG = "#F4F6F8";
const NAVY = "#0B1F3A";
const BLUE = "#1877D6";
const TEXT_SECONDARY = "#6B7686";
const HAIRLINE = "#E4E8EF";
const CARD_RADIUS = 16;

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

type CommunityComment = {
  id: string;
  body: string;
  created_at: string;
  author_name: string | null;
  instructor_name: string | null;
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
  { name: "PRO Chill", icon: <IconWaveSine size={24} color="#18A999" stroke={2.2} /> },
  { name: "PRO Drive", icon: <IconSteeringWheel size={24} color="#F97316" stroke={2} /> },
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
      <div
        style={{
          background: "linear-gradient(135deg, #EAF3FC 0%, #DCEBFB 55%, #E8F1FD 100%)",
          borderRadius: 8,
          padding: 14,
          border: "0.5px solid #CFE0F5",
          boxShadow: "0 2px 10px rgba(11,31,58,0.06)",
        }}
      >
        {/* Top row */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              width: 46,
              height: 46,
              borderRadius: 8,
              background: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              boxShadow: "0 1px 4px rgba(11,31,58,0.08)",
            }}
          >
            <IconRadio size={26} color={BLUE} stroke={1.8} />
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ color: NAVY, fontSize: 17, fontWeight: 700, letterSpacing: -0.2 }}>
                PRO Radio
              </span>
              <span
                style={{
                  background: "#E53935",
                  color: "#fff",
                  fontSize: 9,
                  fontWeight: 800,
                  letterSpacing: 0.4,
                  padding: "2px 6px",
                  borderRadius: 4,
                }}
              >
                LIVE
              </span>
            </div>
            <div
              style={{
                color: TEXT_SECONDARY,
                fontSize: 13,
                marginTop: 2,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {radio.isPlaying ? nowTitle : "Ad FREE radio for ADI's and PDI's"}
            </div>
          </div>

          <button
            type="button"
            aria-label={radio.isPlaying ? "Pause" : "Play"}
            onClick={() => {
              if (radio.isPlaying) {
                radio.pause();
              } else {
                radio.play();
              }
              setSelectedChip("PRO Live");
            }}
            style={{
              width: 50,
              height: 50,
              borderRadius: "50%",
              background: BLUE,
              border: "3px solid #fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              cursor: "pointer",
              boxShadow: "0 6px 16px rgba(24,119,214,0.3)",
            }}
          >
            {radio.isPlaying ? (
              <span style={{ display: "flex", alignItems: "center", gap: 3 }}>
                <span style={{ width: 4, height: 16, background: "#fff", borderRadius: 2 }} />
                <span style={{ width: 4, height: 16, background: "#fff", borderRadius: 2 }} />
              </span>
            ) : (
              <IconPlayerPlay size={20} color="#fff" fill="#fff" stroke={1.2} style={{ marginLeft: 2 }} />
            )}
          </button>
        </div>

        {/* Stations */}
        <div
          style={{
            display: "flex",
            alignItems: "stretch",
            marginTop: 12,
            paddingTop: 10,
            borderTop: "0.5px solid rgba(11,31,58,0.08)",
          }}
        >
          {STATION_TILES.map((s) => {
            const station = STATIONS[s.name];
            const selected = selectedChip === s.name;
            const comingSoon = station?.comingSoon ?? true;
            return (
              <button
                key={s.name}
                type="button"
                onClick={() => handleChip(s.name)}
                style={{
                  flex: 1,
                  minWidth: 0,
                  background: selected ? "#0B2341" : "#F4F6F8",
                  color: selected ? "#fff" : "#536579",
                  borderRadius: 8,
                  border: selected ? "none" : "0.5px solid #E4E8EF",
                  padding: "6px 2px",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 5,
                  cursor: "pointer",
                  fontFamily: POPPINS.fontFamily,
                  opacity: comingSoon && !selected ? 0.7 : 1,
                }}
              >
                <span style={{ height: 26, display: "flex", alignItems: "center" }}>{s.icon}</span>
                <span style={{ fontSize: 10.5, fontWeight: 600, color: "inherit", whiteSpace: "nowrap" }}>
                  {s.name}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}


/* ------------------------------------------------------------------ */
// PRO TV card
/* ------------------------------------------------------------------ */

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
  const duration = "18 min";
  const category = sentenceCase(v.category || "PRO TV");

  return (
    <section style={{ ...POPPINS }}>
      <div
        onClick={() => onNavigate("/dsm-live")}
        style={{
          background: "#fff",
          borderRadius: 8,
          overflow: "hidden",
          cursor: "pointer",
          position: "relative",
          padding: 12,
          border: `0.5px solid ${HAIRLINE}`,
          boxShadow: "0 2px 10px rgba(11,31,58,0.06)",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 10,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              color: NAVY,
              fontSize: 16,
              fontWeight: 700,
              letterSpacing: -0.2,
            }}
          >
            <IconDeviceTv size={20} color={NAVY} stroke={1.8} />
            PRO TV
          </div>

          <span
            style={{
              background: BLUE,
              color: "#fff",
              fontSize: 9,
              fontWeight: 800,
              textTransform: "uppercase",
              letterSpacing: 0.4,
              padding: "3px 7px",
              borderRadius: 999,
            }}
          >
            NEW
          </span>
        </div>

        {/* Body */}
        <div style={{ display: "flex", gap: 12, alignItems: "stretch" }}>
          {/* Thumbnail */}
          <div
            style={{
              position: "relative",
              width: "36%",
              minWidth: 112,
              maxWidth: 130,
              aspectRatio: "16 / 10",
              borderRadius: 8,
              overflow: "hidden",
              background: thumb ? `url(${thumb}) center/cover no-repeat` : "linear-gradient(135deg, #0B2341, #1a3a6b)",
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: "rgba(11,31,58,0.22)",
              }}
            />
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: "50%",
                background: "rgba(255,255,255,0.22)",
                border: "2px solid rgba(255,255,255,0.45)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                position: "relative",
                zIndex: 1,
              }}
            >
              <IconPlayerPlay size={15} color="#fff" fill="#fff" stroke={1.2} style={{ marginLeft: 2 }} />
            </div>
          </div>

          {/* Info */}
          <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", justifyContent: "center" }}>
            <h3
              style={{
                margin: 0,
                color: NAVY,
                fontSize: 15,
                fontWeight: 700,
                lineHeight: 1.25,
                letterSpacing: -0.2,
              }}
            >
              {v.title}
            </h3>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                color: TEXT_SECONDARY,
                fontSize: 12,
                fontWeight: 500,
                marginTop: 4,
              }}
            >
              <span>{category}</span>
              <span style={{ width: 4, height: 4, borderRadius: "50%", background: "#C5CDD8" }} />
              <span>{duration}</span>
            </div>

            <p
              style={{
                margin: "6px 0 0",
                color: TEXT_SECONDARY,
                fontSize: 12,
                lineHeight: 1.45,
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              }}
            >
              {v.description || "A step-by-step guide to help you prepare, stay calm and pass with confidence."}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
// PRO Perks card
/* ------------------------------------------------------------------ */

function PerksCard({
  perk,
  categories,
  onNavigate,
}: {
  perk: FeaturedPerk | null;
  categories: string[];
  onNavigate: (to: string) => void;
}) {
  const p = perk ?? {
    id: "mock",
    name: "AA Breakdown Cover",
    saving: "10% off for EDP members",
    partner_name: "AA",
    category: "Motoring",
  };

  const categoryLine = categories.length
    ? categories.slice(0, 3).join(" · ") + (categories.length > 3 ? " · more" : "")
    : "Fuel · Health · SIM · more";

  return (
    <section style={{ ...POPPINS }}>
      <div
        style={{
          background: "linear-gradient(135deg, #EDE9FE 0%, #E3DCFB 55%, #F1EEFE 100%)",
          borderRadius: 8,
          padding: 14,
          display: "flex",
          alignItems: "center",
          gap: 12,
          border: "0.5px solid #D9D0F7",
          boxShadow: "0 2px 10px rgba(107,79,214,0.08)",
        }}
      >
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: 8,
            background: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            boxShadow: "0 1px 4px rgba(107,79,214,0.12)",
          }}
        >
          <IconGift size={24} color="#7C3AED" stroke={1.8} />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 10.5,
              fontWeight: 700,
              color: "#7C3AED",
              textTransform: "uppercase",
              letterSpacing: 0.6,
              marginBottom: 3,
            }}
          >
            PRO PERKS
          </div>
          <div
            style={{
              fontSize: 16,
              fontWeight: 700,
              color: NAVY,
              lineHeight: 1.25,
            }}
          >
            {p.name}
          </div>
          <div style={{ fontSize: 13, color: "#5B5473", marginTop: 3 }}>
            {p.saving}
          </div>
        </div>

        <button
          type="button"
          onClick={() => onNavigate("/perks")}
          style={{
            flexShrink: 0,
            background: "#fff",
            color: "#7C3AED",
            border: "0.5px solid #D9D0F7",
            borderRadius: 8,
            padding: "9px 16px",
            fontSize: 14,
            fontWeight: 700,
            cursor: "pointer",
            fontFamily: POPPINS.fontFamily,
            boxShadow: "0 1px 4px rgba(107,79,214,0.12)",
          }}
        >
          Claim
        </button>
      </div>

      <div
        style={{
          background: "#fff",
          borderRadius: 8,
          marginTop: 8,
          padding: "12px 16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          border: `0.5px solid ${HAIRLINE}`,

        }}
      >
        <span style={{ fontSize: 13, color: TEXT_SECONDARY }}>{categoryLine}</span>
        <button
          type="button"
          onClick={() => onNavigate("/perks")}
          style={{
            background: "none",
            border: "none",
            padding: 0,
            cursor: "pointer",
            fontSize: 13,
            fontWeight: 600,
            color: BLUE,
            fontFamily: POPPINS.fontFamily,
          }}
        >
          See all <IconChevronRight size={14} stroke={2} style={{ verticalAlign: "middle" }} />
        </button>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
// Community card
/* ------------------------------------------------------------------ */

function CommunityCard({ comments, onNavigate }: { comments: CommunityComment[]; onNavigate: (to: string) => void }) {
  const rows = comments.length
    ? comments.slice(0, 2)
    : [
        { id: "1", body: "Anyone covering Winchester this week?", author_name: "Dave M", created_at: new Date(Date.now() - 2 * 60000).toISOString() },
        { id: "2", body: "New DVSA phone guidance just dropped", author_name: "Sarah T", created_at: new Date(Date.now() - 14 * 60000).toISOString() },
      ];

  const newCount = comments.filter((c) => Date.now() - new Date(c.created_at).getTime() < 86400000).length || 3;

  return (
    <section style={{ ...POPPINS }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 10,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <IconUsers size={20} color={NAVY} stroke={1.8} />
          <span style={{ fontSize: 15, fontWeight: 700, color: NAVY }}>Community</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span
            style={{
              background: "#E53935",
              color: "#fff",
              fontSize: 11,
              fontWeight: 700,
              padding: "3px 8px",
              borderRadius: 999,
            }}
          >
            {newCount} new
          </span>
          <button
            type="button"
            onClick={() => onNavigate("/community")}
            style={{
              background: "none",
              border: "none",
              padding: 0,
              cursor: "pointer",
              fontSize: 13,
              fontWeight: 600,
              color: BLUE,
              fontFamily: POPPINS.fontFamily,
            }}
          >
            See all <IconChevronRight size={14} stroke={2} style={{ verticalAlign: "middle" }} />
          </button>
        </div>
      </div>

      <div
        style={{
          background: "#fff",
          borderRadius: CARD_RADIUS,
          border: `0.5px solid ${HAIRLINE}`,
          overflow: "hidden",
        }}
      >
        {rows.map((row, idx) => {
          const name = row.author_name || "Member";
          const color = avatarColor(name);
          return (
            <div
              key={row.id}
              onClick={() => onNavigate("/community")}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "12px 14px",
                cursor: "pointer",
                borderBottom: idx < rows.length - 1 ? `0.5px solid ${HAIRLINE}` : "none",
              }}
            >
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: "50%",
                  background: color,
                  color: "#fff",
                  fontSize: 13,
                  fontWeight: 700,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                {initials(name)}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 14,
                    color: NAVY,
                    lineHeight: 1.35,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  <strong>{name.split(" ")[0]}:</strong>{" "}
                  <span style={{ fontWeight: 400 }}>{row.body}</span>
                </div>
              </div>
              <span style={{ fontSize: 12, color: "#9CA3AF", flexShrink: 0 }}>{timeAgo(row.created_at)}</span>
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
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 10,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <IconShoppingBag size={20} color="#F59E0B" stroke={1.8} />
          <span style={{ fontSize: 15, fontWeight: 700, color: NAVY }}>PRO Shop</span>
        </div>
        <button
          type="button"
          onClick={() => onNavigate("/marketplace")}
          style={{
            background: "none",
            border: "none",
            padding: 0,
            cursor: "pointer",
            fontSize: 13,
            fontWeight: 600,
            color: BLUE,
            fontFamily: POPPINS.fontFamily,
          }}
        >
          Browse all <IconChevronRight size={14} stroke={2} style={{ verticalAlign: "middle" }} />
        </button>
      </div>

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
  const [perk, setPerk] = useState<FeaturedPerk | null>(null);
  const [perkCategories, setPerkCategories] = useState<string[]>([]);
  const [comments, setComments] = useState<CommunityComment[]>([]);
  const [listings, setListings] = useState<ShopListing[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [videoRes, perkRes, commentsRes, listingsRes] = await Promise.allSettled([
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
              "id, name, saving, description, category, partner:benefit_partners(name, logo_url, icon_bg, icon_color)"
            )
            .eq("active", true)
            .order("sort_order", { ascending: true })
            .limit(1),
          supabase
            .from("showcase_comments")
            .select(
              "id, body, created_at, author_name, instructor:instructors!instructor_id(id, name)"
            )
            .is("deleted_at", null)
            .is("parent_id", null)
            .order("created_at", { ascending: false })
            .limit(5),
          sbGet<
            ShopListing[]
          >(
            "marketplace_listings?is_active=eq.true&deleted_at=is.null&order=created_at.desc&select=id,title,price_display,image_urls,marketplace_suppliers(name,logo_url,is_verified)&limit=10"
          ),
        ]);

        if (cancelled) return;

        if (videoRes.status === "fulfilled" && videoRes.value.data && videoRes.value.data.length > 0) {
          setVideo(videoRes.value.data[0] as LearnVideo);
        }

        if (perkRes.status === "fulfilled" && perkRes.value.data && perkRes.value.data.length > 0) {
          const row = perkRes.value.data[0] as any;
          setPerk({
            id: row.id,
            name: row.name,
            saving: row.saving,
            description: row.description,
            category: row.category,
            partner_name: row.partner?.name ?? "EDP partner",
            partner_logo_url: row.partner?.logo_url ?? null,
          });
        }

        if (
          perkRes.status === "fulfilled" &&
          perkRes.value.data &&
          Array.isArray(perkRes.value.data)
        ) {
          const cats = Array.from(
            new Set(
              (perkRes.value.data as any[])
                .map((r) => r.category)
                .filter((c): c is string => typeof c === "string" && c.trim().length > 0)
                .map((c) => sentenceCase(c))
            )
          );
          setPerkCategories(cats);
        }

        if (commentsRes.status === "fulfilled" && commentsRes.value.data) {
          setComments(
            (commentsRes.value.data as any[]).map((r) => ({
              id: r.id,
              body: r.body,
              created_at: r.created_at,
              author_name: r.author_name || r.instructor?.name || "Member",
              instructor_name: r.instructor?.name || null,
            }))
          );
        }

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
          gap: 20,
        }}
      >
        <RadioCard />
        <ProTvCard video={video} onNavigate={go} />
        <PerksCard perk={perk} categories={perkCategories} onNavigate={go} />
        <CommunityCard comments={comments} onNavigate={go} />
        <ShopCard listings={listings} onNavigate={go} />
      </div>
    </PageLayout>
  );
}

export default ProPage;
