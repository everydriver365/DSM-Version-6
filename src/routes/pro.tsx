import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  IconBell,
  IconBrandYoutube,
  IconChevronRight,
  IconGift,
  IconMessageCircle,
  IconPlayerPlay,
  IconRadio,
  IconSearch,
  IconShoppingBag,
  IconUsers,
} from "@tabler/icons-react";
import { PageLayout } from "@/components/PageLayout";
import { useProRadioContext } from "@/hooks/useProRadio";
import { supabase } from "@/lib/supabaseClient";
import { formatVideoDuration, videoThumbnail } from "@/lib/learnVideos";
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
  url: string | null;
  embed_url?: string | null;
  thumbnail_url: string | null;
  duration?: string | number | null;
  duration_seconds?: number | null;
  categories?: string[] | null;
  source?: string | null;
  kind?: string | null;
  is_featured?: boolean | null;
  is_published?: boolean | null;
  sort_order?: number | null;
  created_at?: string;
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

const STATIONS = ["PRO Live", "PRO 80s", "PRO 90s", "PRO Chill", "PRO Drive"];

function RadioCard() {
  const radio = useProRadioContext();
  const [selectedChip, setSelectedChip] = useState<string>(radio.selectedStation || "PRO Live");

  useEffect(() => {
    if (radio.selectedStation) setSelectedChip(radio.selectedStation);
  }, [radio.selectedStation]);

  const handleChip = (name: string) => {
    if (name === "PRO Live") {
      radio.toggle();
    } else {
      radio.pause?.();
    }
    setSelectedChip(name);
  };

  const station = radio.selectedStation || selectedChip;
  const nowTitle = radio.isPlaying
    ? radio.nowPlaying?.title || station
    : station;

  return (
    <section style={{ ...POPPINS }}>
      <div
        style={{
          background: NAVY,
          borderRadius: CARD_RADIUS,
          padding: 16,
          display: "flex",
          alignItems: "center",
          gap: 14,
          position: "relative",
        }}
      >
        <div
          style={{
            width: 52,
            height: 52,
            borderRadius: 12,
            background: "rgba(255,255,255,0.12)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <IconRadio size={26} color="#64B5F6" stroke={1.6} />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <span
              style={{
                color: "#fff",
                fontSize: 17,
                fontWeight: 700,
                letterSpacing: -0.2,
              }}
            >
              PRO Radio
            </span>
            <span
              style={{
                background: "#E53935",
                color: "#fff",
                fontSize: 9,
                fontWeight: 800,
                textTransform: "uppercase",
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
              color: "rgba(255,255,255,0.9)",
              fontSize: 14,
              fontWeight: 500,
              lineHeight: 1.3,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {nowTitle}
          </div>
          <div
            style={{
              color: "rgba(255,255,255,0.55)",
              fontSize: 12,
              fontWeight: 400,
              marginTop: 2,
            }}
          >
            {radio.isPlaying ? `On ${station}` : "Tap play to listen"}
          </div>
        </div>

        <button
          type="button"
          aria-label={radio.isPlaying ? "Pause" : "Play"}
          onClick={() => {
            radio.toggle();
            setSelectedChip("PRO Live");
          }}
          style={{
            width: 52,
            height: 52,
            borderRadius: "50%",
            background: BLUE,
            border: "none",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            cursor: "pointer",
            boxShadow: "0 6px 16px rgba(24,119,214,0.35)",
          }}
        >
          {radio.isPlaying ? (
            <span
              style={{
                display: "flex",
                alignItems: "center",
                gap: 3,
              }}
            >
              <span style={{ width: 4, height: 18, background: "#fff", borderRadius: 2 }} />
              <span style={{ width: 4, height: 18, background: "#fff", borderRadius: 2 }} />
            </span>
          ) : (
            <IconPlayerPlay size={22} color="#fff" fill="#fff" stroke={1.2} style={{ marginLeft: 2 }} />
          )}
        </button>
      </div>

      <div
        style={{
          display: "flex",
          gap: 6,
          overflowX: "auto",
          marginTop: 12,
          paddingBottom: 4,
          scrollbarWidth: "none",
          msOverflowStyle: "none",
        }}
      >
        {STATIONS.map((name) => {
          const selected = selectedChip === name;
          return (
            <button
              key={name}
              type="button"
              onClick={() => handleChip(name)}
              style={{
                flex: "0 0 auto",
                background: selected ? NAVY : "#fff",
                color: selected ? "#fff" : NAVY,
                border: `1px solid ${selected ? NAVY : HAIRLINE}`,
                borderRadius: 999,
                padding: "6px 12px",
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: POPPINS.fontFamily,
              }}
            >
              {name}
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

function ProTvCard({ video, onNavigate }: { video: LearnVideo | null; onNavigate: (to: string) => void }) {
  const v = video ?? {
    id: "mock",
    title: "How to pass your standards check",
    duration_seconds: 1080,
    categories: ["Training"],
  } as LearnVideo;

  const thumb = video ? videoThumbnail(video) : null;
  const duration = formatVideoDuration(v);
  const category = (v.categories?.[0] || v.source || "PRO TV").toUpperCase();

  return (
    <section style={{ ...POPPINS }}>
      <div
        onClick={() => onNavigate("/dsm-live")}
        style={{
          background: NAVY,
          borderRadius: CARD_RADIUS,
          overflow: "hidden",
          cursor: "pointer",
          position: "relative",
        }}
      >
        <div
          style={{
            height: 170,
            background: thumb
              ? `linear-gradient(rgba(11,31,58,0.35), rgba(11,31,58,0.55)), url(${thumb}) center/cover`
              : "linear-gradient(135deg, #0B2341, #1a3a6b)",
            position: "relative",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: 12,
              left: 12,
              display: "flex",
              alignItems: "center",
              gap: 6,
              color: "rgba(255,255,255,0.85)",
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            <IconBrandYoutube size={16} stroke={1.8} />
            PRO TV
          </div>

          <span
            style={{
              position: "absolute",
              top: 12,
              right: 12,
              background: BLUE,
              color: "#fff",
              fontSize: 9,
              fontWeight: 800,
              textTransform: "uppercase",
              letterSpacing: 0.4,
              padding: "3px 7px",
              borderRadius: 4,
            }}
          >
            NEW
          </span>

          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: "50%",
              background: "rgba(255,255,255,0.18)",
              border: "2px solid rgba(255,255,255,0.35)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <IconPlayerPlay size={22} color="#fff" fill="#fff" stroke={1.2} style={{ marginLeft: 2 }} />
          </div>

          <span
            style={{
              position: "absolute",
              bottom: 12,
              right: 12,
              background: "rgba(0,0,0,0.55)",
              color: "#fff",
              fontSize: 11,
              fontWeight: 600,
              padding: "3px 7px",
              borderRadius: 4,
            }}
          >
            {duration || "18 min"}
          </span>
        </div>

        <div
          style={{
            background: "#fff",
            padding: "14px 16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: 15,
                fontWeight: 600,
                color: NAVY,
                lineHeight: 1.3,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {v.title}
            </div>
            <div style={{ fontSize: 12, color: TEXT_SECONDARY, marginTop: 3 }}>
              {category} · {duration || "18 mins"}
            </div>
          </div>
          <span style={{ fontSize: 13, fontWeight: 600, color: BLUE, flexShrink: 0 }}>
            More <IconChevronRight size={14} stroke={2} style={{ verticalAlign: "middle" }} />
          </span>
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
          background: "linear-gradient(135deg, #6B4FD6 0%, #8B5CF6 100%)",
          borderRadius: CARD_RADIUS,
          padding: 14,
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}
      >
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: 12,
            background: "rgba(255,255,255,0.2)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <IconGift size={24} color="#fff" stroke={1.6} />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: "rgba(255,255,255,0.75)",
              textTransform: "uppercase",
              letterSpacing: 0.6,
              marginBottom: 4,
            }}
          >
            PRO PERKS · FEATURED
          </div>
          <div
            style={{
              fontSize: 16,
              fontWeight: 700,
              color: "#fff",
              lineHeight: 1.25,
            }}
          >
            {p.name}
          </div>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.85)", marginTop: 3 }}>
            {p.saving}
          </div>
        </div>

        <button
          type="button"
          onClick={() => onNavigate("/perks")}
          style={{
            flexShrink: 0,
            background: "rgba(255,255,255,0.25)",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            padding: "8px 14px",
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
            fontFamily: POPPINS.fontFamily,
          }}
        >
          Claim
        </button>
      </div>

      <div
        style={{
          background: "#fff",
          borderRadius: "0 0 " + CARD_RADIUS + "px " + CARD_RADIUS + "px",
          padding: "12px 16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          border: `0.5px solid ${HAIRLINE}`,
          borderTop: "none",
        }}
      >
        <span style={{ fontSize: 13, color: TEXT_SECONDARY }}>{categoryLine}</span>
        <button
          type="button"
          onClick={() => onNavigate("/benefits")}
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
            onClick={() => onNavigate("/dsm-learn?tab=showcase")}
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
              onClick={() => onNavigate("/dsm-learn?tab=showcase")}
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
            .from("learn_videos")
            .select(
              "id, title, description, url, embed_url, thumbnail_url, duration, duration_seconds, categories, source, kind, is_featured, is_published, sort_order, created_at"
            )
            .eq("kind", "library")
            .eq("is_published", true)
            .eq("is_featured", true)
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
          paddingTop: "calc(env(safe-area-inset-top, 0px) + 64px)",
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
