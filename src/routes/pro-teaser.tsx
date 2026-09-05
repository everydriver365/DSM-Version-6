import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  IconCheck,
  IconChevronRight,
  IconDeviceLaptop,
  IconDeviceTv,
  IconPlayerPlayFilled,
  IconCar,
  IconChartBar,
  IconMapPin,
  IconGift,
  IconHeart,
  IconMicrophone,
  IconNews,
  IconPigMoney,
  IconRadio,
  IconShieldCheck,
  IconShoppingBag,
  IconSparkles,
  IconUsers,
  IconWorld,
  IconX,
} from "@tabler/icons-react";

import instructorHeroAsset from "@/assets/dia-instructor.png.asset.json";
import websiteMockAsset from "@/assets/driving-school-website.png.asset.json";
import perkboxLogoAsset from "@/assets/perkbox-logo.png.asset.json";
import perkboxIncludedLogoAsset from "@/assets/perkbox-included-logo.png.asset.json";
import proShopMerchAsset from "@/assets/pro-shop-merch.png.asset.json";
import proShopLogoAsset from "@/assets/pro-shop-logo.png.asset.json";
import diaLogoAsset from "@/assets/dia-logo.png.asset.json";
import proLogoAsset from "@/assets/pro-logo.png.asset.json";
import edpProLogoAsset from "@/assets/edp-pro-logo-new.png.asset.json";
import perkboxUploadedAsset from "@/assets/perkbox-logo-uploaded.png.asset.json";
import tescoPerkAsset from "@/assets/tesco-perk.png.asset.json";
import costaPerkAsset from "@/assets/costa-perk.png.asset.json";
import sainsburysPerkAsset from "@/assets/sainsburys-perk.png.asset.json";
import asdaPerkAsset from "@/assets/asda-perk.png.asset.json";
import trackingLogoAsset from "@/assets/edp-tracking-logo.png.asset.json";
import trackerDeviceAsset from "@/assets/tracker-device.png.asset.json";

import { supabase as defaultSupabase } from "@/lib/supabaseClient";
import { useProRadioContext } from "@/hooks/useProRadio";

/* ------------------------------------------------------------------ */
// Types
/* ------------------------------------------------------------------ */

interface TvVideo {
  id: string;
  title: string | null;
  thumbnail_url: string | null;
}

interface NewsArticle {
  id: string;
  title: string | null;
  source: string | null;
}

export interface ProTeaserProps {
  onNavigate?: (to: string) => void;
  onNavigateToMedia?: () => void;
  supabase?: any;
  session?: any;
}

/* ------------------------------------------------------------------ */
// Tokens
/* ------------------------------------------------------------------ */

const NAVY = "#0B2341";
const BLUE = "#1877D6";
const ORANGE = "#F26522";
const GREEN = "#0E8A4F";
const GREY = "#5C6B7E";
const LINE = "#E7EBF1";
const SORA = "Sora, Poppins, system-ui, sans-serif";

const CARD: React.CSSProperties = {
  background: "#fff",
  borderRadius: 16,
  border: `1px solid ${LINE}`,
  boxShadow: "0 2px 10px rgba(11,35,65,0.05)",
};

/* ------------------------------------------------------------------ */
// Small building blocks
/* ------------------------------------------------------------------ */

function Tick({ children, color = BLUE }: { children: React.ReactNode; color?: string }) {
  return (
    <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
      <IconCheck size={15} color={color} stroke={3} style={{ flexShrink: 0, marginTop: 2 }} />
      <span style={{ fontSize: 13.5, color: NAVY, lineHeight: 1.35, fontWeight: 500 }}>
        {children}
      </span>
    </div>
  );
}

function SectionTitle({
  strong,
  rest,
  subtitle,
  color = ORANGE,
}: {
  strong: string;
  rest?: string;
  subtitle?: string;
  color?: string;
}) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div
        style={{
          fontFamily: SORA,
          fontSize: 19,
          fontWeight: 900,
          letterSpacing: "-0.01em",
          color: NAVY,
        }}
      >
        <span style={{ color }}>{strong}</span>
        {rest ? ` ${rest}` : ""}
      </div>
      {subtitle && (
        <div style={{ fontSize: 13, color: GREY, marginTop: 4, lineHeight: 1.4 }}>{subtitle}</div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
// Explainer videos
/* ------------------------------------------------------------------ */

interface SectionVideo {
  section: string;
  title: string | null;
  video_url: string;
}

function toEmbedUrl(url: string): string | null {
  const yt = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]+)/,
  );
  if (yt) return `https://www.youtube.com/embed/${yt[1]}?autoplay=1&rel=0`;
  const vimeo = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}?autoplay=1`;
  if (url.includes("/embed/") || url.includes("player.vimeo")) return url;
  return null;
}

function ExplainerButton({
  video,
  onOpen,
}: {
  video?: SectionVideo;
  onOpen: (v: SectionVideo) => void;
}) {
  if (!video?.video_url) return null;
  return (
    <button
      type="button"
      onClick={() => onOpen(video)}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        marginBottom: 10,
        border: `1px solid ${LINE}`,
        background: "#F4F8FD",
        color: NAVY,
        borderRadius: 999,
        padding: "7px 14px 7px 8px",
        fontSize: 12.5,
        fontWeight: 700,
        fontFamily: "inherit",
        cursor: "pointer",
      }}
    >
      <span
        style={{
          width: 22,
          height: 22,
          borderRadius: 999,
          background: BLUE,
          display: "grid",
          placeItems: "center",
        }}
      >
        <IconPlayerPlayFilled size={11} color="#fff" />
      </span>
      {"Learn More"}
    </button>
  );
}

function VideoModal({ video, onClose }: { video: SectionVideo; onClose: () => void }) {
  const embed = toEmbedUrl(video.video_url);
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={video.title || "Explainer video"}
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 5000,
        background: "rgba(6,16,30,0.82)",
        display: "grid",
        placeItems: "center",
        padding: 16,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ width: "100%", maxWidth: 520, position: "relative" }}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close video"
          style={{
            position: "absolute",
            top: -44,
            right: 0,
            width: 36,
            height: 36,
            borderRadius: 999,
            border: "none",
            background: "rgba(255,255,255,0.16)",
            color: "#fff",
            display: "grid",
            placeItems: "center",
            cursor: "pointer",
          }}
        >
          <IconX size={20} />
        </button>
        <div
          style={{
            borderRadius: 16,
            overflow: "hidden",
            background: "#000",
            aspectRatio: "16 / 9",
          }}
        >
          {embed ? (
            <iframe
              src={embed}
              title={video.title || "Explainer video"}
              allow="accelerometer; autoplay; encrypted-media; picture-in-picture; fullscreen"
              allowFullScreen
              style={{ width: "100%", height: "100%", border: "none" }}
            />
          ) : (
            <video
              src={video.video_url}
              controls
              autoPlay
              playsInline
              style={{ width: "100%", height: "100%", objectFit: "contain", background: "#000" }}
            />
          )}
        </div>
        {video.title && (
          <div
            style={{
              color: "#fff",
              fontSize: 14,
              fontWeight: 600,
              marginTop: 10,
              textAlign: "center",
            }}
          >
            {video.title}
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
// Tracking advert card
/* ------------------------------------------------------------------ */

function TrackingFeature({ icon, l1, l2 }: { icon: React.ReactNode; l1: string; l2: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 7, minWidth: 0 }}>
      <span style={{ flexShrink: 0, display: "grid", placeItems: "center" }}>{icon}</span>
      <span style={{ fontSize: 11, fontWeight: 700, color: NAVY, lineHeight: 1.2 }}>
        {l1}
        <br />
        {l2}
      </span>
    </div>
  );
}

function TrackingPrice({ big, small }: { big: string; small: string }) {
  return (
    <div style={{ textAlign: "center", minWidth: 0, flex: 1 }}>
      <div style={{ fontFamily: SORA, fontSize: 15, fontWeight: 900, color: NAVY, lineHeight: 1.1, whiteSpace: "nowrap" }}>
        {big}
      </div>
      <div style={{ fontSize: 9, color: GREY, fontWeight: 600, whiteSpace: "nowrap" }}>{small}</div>
    </div>
  );
}

function TrackingCard({
  video,
  onOpenVideo,
  onOpen,
}: {
  video?: SectionVideo;
  onOpenVideo: (v: SectionVideo) => void;
  onOpen: () => void;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onOpen();
      }}
      style={{
        marginTop: 12,
        position: "relative",
        overflow: "hidden",
        width: "100%",
        border: `1.5px solid ${BLUE}`,
        borderRadius: 18,
        background: "#fff",
        boxShadow: "0 6px 18px rgba(11,31,58,.07)",
        cursor: "pointer",
        padding: 12,
        textAlign: "left",
      }}
    >
      {/* Featured banner */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          top: 12,
          right: -28,
          width: 110,
          padding: "4px 0",
          background: `linear-gradient(90deg, ${BLUE}, #135EAB)`,
          color: "#fff",
          fontFamily: SORA,
          fontSize: 9,
          fontWeight: 900,
          letterSpacing: ".6px",
          textAlign: "center",
          textTransform: "uppercase",
          transform: "rotate(45deg)",
          zIndex: 2,
          boxShadow: "0 2px 6px rgba(11,31,58,.18)",
        }}
      >
        Featured
      </div>

      {/* soft blue wash behind the device */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          right: -50,
          top: -30,
          width: 220,
          height: 220,
          borderRadius: "50%",
          background: "#E9F1FD",
          zIndex: 0,
        }}
      />

      <div style={{ position: "relative", zIndex: 1 }}>
        {/* title row */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              flexShrink: 0,
              width: 64,
              height: 64,
              borderRadius: 14,
              background: "#EAF2FD",
              display: "grid",
              placeItems: "center",
              overflow: "hidden",
            }}
          >
            <img
              src={trackingLogoAsset.url}
              alt="EDP Tracking"
              style={{ width: "100%", height: "100%", objectFit: "contain" }}
            />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontFamily: SORA,
                fontSize: 26,
                fontWeight: 900,
                color: NAVY,
                letterSpacing: "-0.5px",
                lineHeight: 1.05,
              }}
            >
              TRACKING
            </div>
            <div style={{ fontSize: 11.5, color: GREY, fontWeight: 600, lineHeight: 1.3 }}>
              Professional vehicle tracking for driving instructors.
            </div>
          </div>
          <div
            style={{
              flexShrink: 0,
              width: 28,
              height: 28,
              borderRadius: "50%",
              background: "#fff",
              boxShadow: "0 2px 8px rgba(11,31,58,.12)",
              display: "grid",
              placeItems: "center",
            }}
          >
            <IconChevronRight size={18} color={BLUE} />
          </div>
        </div>

        {/* features */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "8px 12px",
            marginTop: 12,
            alignItems: "center",
          }}
        >
          <TrackingFeature icon={<IconMapPin size={18} color={BLUE} />} l1="Live" l2="location" />
          <span style={{ width: 1, height: 22, background: LINE }} />
          <TrackingFeature
            icon={<IconChartBar size={18} color="#12A67A" />}
            l1="Driving style"
            l2="reports"
          />
          <span style={{ width: 1, height: 22, background: LINE }} />
          <TrackingFeature icon={<IconCar size={18} color={BLUE} />} l1="Vehicle" l2="health checks" />
        </div>

        {/* price row + device */}
        <div
          style={{
            marginTop: 12,
            borderTop: `1px solid ${LINE}`,
            paddingTop: 10,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <img
            src={trackerDeviceAsset.url}
            alt="NexTech vehicle tracker device"
            style={{
              width: 78,
              height: "auto",
              objectFit: "contain",
              flexShrink: 0,
              borderRadius: 10,
            }}
          />
          <div
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 4,
              minWidth: 0,
            }}
          >
            <TrackingPrice big="£9.99" small="/month" />
            <span style={{ width: 1, height: 22, background: LINE, flexShrink: 0 }} />
            <TrackingPrice big="£25" small="setup fee" />
            <span style={{ width: 1, height: 22, background: LINE, flexShrink: 0 }} />
            <TrackingPrice big="24 mths" small="commitment" />
          </div>
        </div>

        {video?.video_url && (
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ marginTop: 10, marginBottom: -4 }}
          >
            <ExplainerButton video={video} onOpen={onOpenVideo} />
          </div>
        )}
      </div>
    </div>
  );
}


/* ------------------------------------------------------------------ */
// Static content
/* ------------------------------------------------------------------ */

const DIA_BENEFITS = [
  "Professional representation",
  "24/7 legal & professional cover",
  "Advice & support",
  "Industry updates",
  "Exclusive member benefits",
];

const WEBSITE_FREE = [
  "5-page professional website",
  "Your EveryDriver web address",
  "Mobile friendly",
  "Contact & enquiry tools",
  "Showcase your lessons and areas covered",
];

const BRANDS: { name: string; colour: string; italic?: boolean; offer: string; image?: string }[] = [
  { name: "TESCO", colour: "#EE1C2E", offer: "Up to 10% off Gift Cards", image: tescoPerkAsset.url },
  { name: "COSTA", colour: "#6D1B32", offer: "Free regular hot drink", image: costaPerkAsset.url },
  { name: "Sainsbury's", colour: "#F06C00", offer: "Up to 10% off Gift Cards", image: sainsburysPerkAsset.url },
  { name: "ASDA", colour: "#00A94F", offer: "Up to 10% off Gift Cards", image: asdaPerkAsset.url },
  { name: "JUST EAT", colour: "#FF8000", italic: true, offer: "Up to 20% off" },
  { name: "Uber Eats", colour: "#06C167", offer: "Up to 20% off" },
];

const PRO_FEATURES = [
  "DIA membership (worth £125/year)",
  "20-page website",
  "Custom domain",
  "PRO Radio",
  "PRO TV",
  "PRO Podcasts",
  "PRO News",
  "Perkbox benefits",
  "HMCA benefits",
  "PRO Shop",
  "Exclusive PRO content",
];

const BENENDEN_FEATURES = [
  "24/7 GP helpline",
  "Mental health support",
  "Physiotherapy and diagnostics",
  "Treatment when NHS waits are long",
];

const ADDONS = [
  { title: "MULTI CAR", body: "Manage more than one car on your account.", price: "£Call/month" },
  { title: "WHITE LABEL", body: "Run EveryDriver under your own brand.", price: "£Call/month" },
];

/* ------------------------------------------------------------------ */
// Route
/* ------------------------------------------------------------------ */

export const Route = createFileRoute("/pro-teaser")({
  head: () => ({
    meta: [
      { title: "Join EveryDriver PRO — DIA membership, website & perks" },
      {
        name: "description",
        content:
          "EveryDriver PRO includes DIA membership worth £125/year, a professional website, Perkbox savings and PRO Radio, TV, Podcasts and News. From £24.99/month.",
      },
      { property: "og:title", content: "Join EveryDriver PRO" },
      {
        property: "og:description",
        content:
          "DIA membership, a professional website, everyday savings and PRO media — all in one membership for driving instructors.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
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

/* ------------------------------------------------------------------ */
// Page
/* ------------------------------------------------------------------ */

export function ProTeaserPage({
  onNavigate,
  onNavigateToMedia,
  supabase = defaultSupabase,
}: ProTeaserProps = {}) {
  const radio = useProRadioContext();
  const go = (to: string) => onNavigate?.(to);

  const [videos, setVideos] = useState<TvVideo[]>([]);
  const [news, setNews] = useState<NewsArticle[]>([]);
  const [billing, setBilling] = useState<"monthly" | "annual">("monthly");
  const [sectionVideos, setSectionVideos] = useState<Record<string, SectionVideo>>({});
  const [openVideo, setOpenVideo] = useState<SectionVideo | null>(null);
  const [trackingListingId, setTrackingListingId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [tvRes, newsRes, explainerRes, trackingRes] = await Promise.allSettled([
        supabase
          .from("howto_videos")
          .select("id, title, thumbnail_url, sort_order")
          .eq("is_published", true)
          .order("sort_order", { ascending: true })
          .limit(3),
        supabase
          .from("news_articles")
          .select("id, title, source, published_at")
          .eq("is_hidden", false)
          .order("published_at", { ascending: false })
          .limit(3),
        supabase.from("pro_section_videos").select("section, title, video_url"),
        supabase
          .from("marketplace_listings")
          .select("id, title")
          .eq("is_active", true)
          .is("deleted_at", null)
          .ilike("title", "%track%")
          .limit(1),
      ]);
      if (!cancelled && trackingRes.status === "fulfilled") {
        const row = (trackingRes.value.data as any[] | null)?.[0];
        if (row?.id) setTrackingListingId(String(row.id));
      }

      if (cancelled) return;
      if (explainerRes.status === "fulfilled" && Array.isArray(explainerRes.value.data)) {
        const map: Record<string, SectionVideo> = {};
        for (const r of explainerRes.value.data as any[]) {
          if (r?.section && r?.video_url) {
            map[String(r.section)] = {
              section: String(r.section),
              title: r.title ?? null,
              video_url: String(r.video_url),
            };
          }
        }
        setSectionVideos(map);
      }
      if (tvRes.status === "fulfilled" && Array.isArray(tvRes.value.data)) {
        setVideos(
          (tvRes.value.data as any[]).map((r) => ({
            id: String(r.id),
            title: r.title ?? null,
            thumbnail_url: r.thumbnail_url ?? null,
          })),
        );
      }
      if (newsRes.status === "fulfilled" && Array.isArray(newsRes.value.data)) {
        setNews(
          (newsRes.value.data as any[]).map((r) => ({
            id: String(r.id),
            title: r.title ?? null,
            source: r.source ?? null,
          })),
        );
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [supabase]);

  return (
    <div
      style={{
        background: "#fff",
        minHeight: "100dvh",
        paddingBottom: 120,
        fontFamily: "Poppins, system-ui, sans-serif",
      }}
    >
      <div style={{ maxWidth: 520, margin: "0 auto" }}>
        {/* ============ 0 — PRO INTRO ============ */}
        <section
          style={{
            position: "relative",
            padding: "calc(env(safe-area-inset-top, 0px) + 56px) 16px 20px",
            background: "linear-gradient(180deg, #F4F8FD 0%, #FFFFFF 100%)",
          }}
        >
          <div
            aria-hidden
            style={{
              position: "absolute",
              top: "calc(env(safe-area-inset-top, 0px) + 70px)",
              right: 12,
              width: 118,
              textAlign: "center",
              fontFamily: "'Segoe Script', 'Brush Script MT', cursive",
              fontSize: 21,
              fontWeight: 700,
              lineHeight: 1.15,
              color: BLUE,
              transform: "rotate(-6deg)",
            }}
          >
            Instructors Stronger Together
            <div
              style={{
                marginTop: 4,
                height: 6,
                borderBottom: `3px solid ${BLUE}`,
                opacity: 0.35,
                borderRadius: 999,
              }}
            />
          </div>

          <h2
            style={{
              margin: 0,
              marginTop: 20,
              maxWidth: 260,
              fontFamily: SORA,
              fontSize: 32,
              fontWeight: 900,
              lineHeight: 1.05,
              color: NAVY,
              letterSpacing: "-0.5px",
            }}
          >
            <img
              src={edpProLogoAsset.url}
              alt="EveryDriver PRO"
              style={{ width: "100%", maxWidth: 146, height: "auto", display: "block" }}
            />
          </h2>
          <p
            style={{
              margin: "6px 0 0",
              maxWidth: 260,
              fontFamily: SORA,
              fontSize: 18,
              fontWeight: 700,
              color: NAVY,
              lineHeight: 1.25,
            }}
          >
            More for your business. More for you.
          </p>
          <p
            style={{
              margin: "10px 0 0",
              fontSize: 14,
              lineHeight: 1.5,
              color: GREY,
              maxWidth: 330,
            }}
          >
            EveryDriver PRO brings your professional membership, website,
            exclusive perks, savings and instructor content together in one
            place.
          </p>

          <div
            style={{
              margin: "18px 0 10px",
              fontFamily: SORA,
              fontSize: 13,
              fontWeight: 900,
              letterSpacing: ".8px",
              color: GREY,
            }}
          >
            PRO INCLUDES
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, minmax(0,1fr))",
              gap: 8,
            }}
          >
            {[
              {
                icon: <IconShieldCheck size={26} stroke={2} color={BLUE} />,
                title: "DIA",
                sub: "Professional membership",
                bg: "#EAF3FD",
              },
              {
                icon: <IconDeviceLaptop size={26} stroke={2} color="#E8365D" />,
                title: "WEBSITE",
                sub: "Build your online presence",
                bg: "#FDEEF1",
              },
              {
                icon: <IconGift size={26} stroke={2} color={GREEN} />,
                title: "PERKS",
                sub: "Everyday savings & benefits",
                bg: "#E9F7EF",
              },
              {
                icon: <IconPlayerPlayFilled size={22} color="#7C3AED" />,
                title: "MEDIA",
                sub: "Radio, TV, podcasts & news",
                bg: "#F1ECFD",
              },
            ].map((t) => (
              <div
                key={t.title}
                style={{
                  background: t.bg,
                  borderRadius: 14,
                  padding: "12px 6px 10px",
                  textAlign: "center",
                }}
              >
                <div style={{ display: "grid", placeItems: "center", height: 30 }}>
                  {t.icon}
                </div>
                <div
                  style={{
                    marginTop: 6,
                    fontFamily: SORA,
                    fontSize: 12,
                    fontWeight: 900,
                    color: NAVY,
                  }}
                >
                  {t.title}
                </div>
                <div style={{ marginTop: 2, fontSize: 10.5, lineHeight: 1.3, color: GREY }}>
                  {t.sub}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ============ 1 — DIA MEMBERSHIP ============ */}
        <section style={{ padding: "8px 16px 24px" }}>
          <div style={{ ...CARD, position: "relative", overflow: "hidden", padding: 0 }}>
            {/* Instructor photo — upper right only */}
            <div
              style={{
                position: "absolute",
                top: 0,
                right: 0,
                width: "46%",
                height: 190,
                overflow: "hidden",
              }}
            >
              <img
                src={instructorHeroAsset.url}
                alt="Professional driving instructor sitting in a car"
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  objectPosition: "78% 25%",
                }}
              />
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  background:
                    "linear-gradient(90deg, #fff 0%, rgba(255,255,255,0.85) 22%, rgba(255,255,255,0) 62%)",
                }}
              />
              <div
                style={{
                  position: "absolute",
                  left: 0,
                  right: 0,
                  bottom: 0,
                  height: 70,
                  background: "linear-gradient(180deg, rgba(255,255,255,0) 0%, #fff 88%)",
                }}
              />
            </div>


            {/* Content */}
            <div style={{ position: "relative", padding: 18 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                <img
                  src={diaLogoAsset.url}
                  alt="DIA"
                  style={{ width: 54, height: 54, objectFit: "contain", borderRadius: 8 }}
                />
                <img
                  src={perkboxUploadedAsset.url}
                  alt="Perkbox"
                  style={{ width: 54, height: 54, objectFit: "contain", borderRadius: 8 }}
                />
              </div>

              <h1
                style={{
                  fontFamily: SORA,
                  fontSize: 25,
                  fontWeight: 900,
                  color: NAVY,
                  lineHeight: 1.05,
                  letterSpacing: "-0.02em",
                  margin: 0,
                  maxWidth: "62%",
                }}
              >
                DIA MEMBERSHIP
              </h1>
              <div
                style={{
                  fontFamily: SORA,
                  fontSize: 15.5,
                  fontWeight: 800,
                  color: BLUE,
                  marginTop: 4,
                  marginBottom: 8,
                }}
              >
                WORTH £125/YEAR
              </div>
              <p
                style={{
                  fontSize: 13,
                  color: GREY,
                  lineHeight: 1.45,
                  margin: "0 0 14px",
                  maxWidth: "72%",
                }}
              >
                Professional representation, advice, support and industry updates.{" "}
                <strong style={{ color: NAVY }}>Included</strong> with EveryDriver PRO.
              </p>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
                  gap: "8px 12px",
                }}
              >
                {DIA_BENEFITS.map((b) => (
                  <Tick key={b}>{b}</Tick>
                ))}
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", padding: "0 14px 12px" }}>
              <ExplainerButton video={sectionVideos["dia"]} onOpen={setOpenVideo} />
            </div>
          </div>
        </section>


        {/* ============ 2 — WEBSITE ============ */}
        <section style={{ padding: "8px 16px 24px" }}>
          <div style={{ ...CARD, padding: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 999,
                    background: "#E6F5EC",
                    display: "grid",
                    placeItems: "center",
                    flexShrink: 0,
                  }}
                >
                  <IconWorld size={22} color={GREEN} />
                </div>
                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 800,
                      letterSpacing: ".7px",
                      color: GREEN,
                    }}
                  >
                    YOUR WEBSITE
                  </div>
                  <div
                    style={{
                      fontFamily: SORA,
                      fontSize: 24,
                      fontWeight: 900,
                      color: GREEN,
                      lineHeight: 1,
                    }}
                  >
                    FREE
                  </div>
                </div>
              </div>
              <ExplainerButton video={sectionVideos["website"]} onOpen={setOpenVideo} />
            </div>

            <img
              src={websiteMockAsset.url}
              alt="Example driving school website on desktop and mobile"
              style={{
                width: "100%",
                borderRadius: 12,
                display: "block",
                marginBottom: 14,
                border: `1px solid ${LINE}`,
              }}
            />

            <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
              {WEBSITE_FREE.map((w) => (
                <Tick key={w} color={GREEN}>
                  {w}
                </Tick>
              ))}
            </div>

            <button
              type="button"
              onClick={() => go("/subscription")}
              style={{
                marginTop: 14,
                width: "100%",
                border: "none",
                cursor: "pointer",
                fontFamily: "inherit",
                borderRadius: 10,
                padding: "13px 16px",
                background: "#0E7A46",
                color: "#fff",
                fontSize: 13.5,
                fontWeight: 900,
                letterSpacing: ".6px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 10,
              }}
            >
              <span style={{ flex: 1, textAlign: "center" }}>GET YOUR FREE WEBSITE</span>
              <IconChevronRight size={18} color="#fff" style={{ flexShrink: 0 }} />
            </button>
          </div>
        </section>

        {/* ============ 3 — PRO PERKS ============ */}
        <section style={{ padding: "8px 16px 24px" }}>
          <div style={{ ...CARD, padding: 16 }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <SectionTitle strong="PRO" rest="PERKS" subtitle="Real savings on things you already buy." />
              </div>
              <ExplainerButton video={sectionVideos["perks"]} onOpen={setOpenVideo} />
            </div>

            <div style={{ display: "flex", gap: 12, alignItems: "stretch" }}>
              <button
                type="button"
                onClick={() => go("/perks")}
                style={{
                  flex: "0 0 96px",
                  border: "none",
                  background: "transparent",
                  textAlign: "left",
                  cursor: "pointer",
                  fontFamily: "inherit",
                  padding: 0,
                }}
              >
                <IconGift size={30} color="#7C3AED" />
                <div
                  style={{
                    fontFamily: SORA,
                    fontSize: 13,
                    fontWeight: 900,
                    color: NAVY,
                    letterSpacing: ".3px",
                    marginTop: 6,
                  }}
                >
                  PERKBOX
                </div>
                <div style={{ fontSize: 11, color: GREY, lineHeight: 1.3, marginTop: 4 }}>
                  Thousands of discounts
                </div>
              </button>

              <div
                style={{
                  flex: 1,
                  minWidth: 0,
                  display: "flex",
                  gap: 8,
                  overflowX: "auto",
                  paddingBottom: 2,
                  WebkitOverflowScrolling: "touch",
                }}
              >
                {BRANDS.map((b) => (
                  <div
                    key={b.name}
                    style={{
                      flex: b.image ? "0 0 110px" : "0 0 84px",
                      border: `1px solid ${LINE}`,
                      borderRadius: 10,
                      padding: b.image ? 0 : "10px 6px",
                      textAlign: "center",
                      background: b.image ? "#fff" : "#FBFCFE",
                      overflow: "hidden",
                      display: "flex",
                      flexDirection: "column",
                    }}
                  >
                    {b.image ? (
                      <>
                        <img
                          src={b.image}
                          alt={`${b.name} offer`}
                          style={{ width: "100%", height: 68, objectFit: "cover", display: "block" }}
                        />
                        <div style={{ padding: "6px 4px 8px" }}>
                          <div
                            style={{
                              fontFamily: SORA,
                              fontSize: 10,
                              fontWeight: 900,
                              color: b.colour,
                              lineHeight: 1.1,
                            }}
                          >
                            {b.name}
                          </div>
                          <div style={{ fontSize: 8.5, color: GREY, marginTop: 3, lineHeight: 1.25 }}>
                            {b.offer}
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        <div
                          style={{
                            fontFamily: SORA,
                            fontSize: 12,
                            fontWeight: 900,
                            color: b.colour,
                            fontStyle: b.italic ? "italic" : "normal",
                            lineHeight: 1.1,
                          }}
                        >
                          {b.name}
                        </div>
                        <div style={{ fontSize: 9, color: GREY, marginTop: 5, lineHeight: 1.25 }}>
                          {b.offer}
                        </div>
                      </>
                    )}
                  </div>
                ))}
                <div
                  style={{
                    flex: "0 0 84px",
                    border: `1px solid ${LINE}`,
                    borderRadius: 10,
                    display: "grid",
                    placeItems: "center",
                    background: "#fff",
                  }}
                >
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontFamily: SORA, fontSize: 15, fontWeight: 900, color: NAVY }}>
                      +9000
                    </div>
                    <div style={{ fontSize: 8.5, fontWeight: 700, color: GREY, letterSpacing: ".4px" }}>
                      MORE OFFERS
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </section>

        {/* ============ 4 — PRO MEDIA HUB ============ */}
        <section style={{ padding: "8px 16px 24px" }}>
          <ExplainerButton video={sectionVideos["media"]} onOpen={setOpenVideo} />
          <div style={{ ...CARD, padding: 16 }}>
            <SectionTitle
              strong="PRO"
              rest="MEDIA HUB"
              subtitle="Industry news, advice and entertainment — made for driving instructors and by driving instructors. "
            />

            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0,1fr))", gap: 10 }}>
              <MediaCard
                title="PRO RADIO"
                body="Your instructor station, anywhere you are."
                colour={NAVY}
                icon={<IconRadio size={20} color="#fff" />}
                wave
                waveActive={radio.isPlaying}
                onClick={() => go("/radio")}
              />
              <MediaCard
                title="PRO TV"
                body="Practical videos, guides and shows for instructors."
                colour="#CC2229"
                icon={<IconDeviceTv size={20} color="#fff" />}
                items={videos.map((v) => v.title ?? "").filter(Boolean).slice(0, 2)}
                onClick={() => go("/learn")}
              />
              <MediaCard
                title="PRO PODCASTS"
                body="Expert advice and real conversations on the go."
                colour="#7C3AED"
                icon={<IconMicrophone size={20} color="#fff" />}
                wave
                onClick={() => onNavigateToMedia?.()}
              />
              <MediaCard
                title="PRO NEWS"
                body="Industry updates that matter, when they matter."
                colour="#0F766E"
                icon={<IconNews size={20} color="#fff" />}
                items={news.map((n) => n.title ?? "").filter(Boolean).slice(0, 2)}
                onClick={() => onNavigateToMedia?.()}
              />
            </div>

            <TrackingCard
              video={sectionVideos["tracking"]}
              onOpenVideo={setOpenVideo}
              onOpen={() =>
                go(trackingListingId ? `/marketplace/${trackingListingId}` : "/marketplace")
              }
            />

            <button
              type="button"
              onClick={() => go("/marketplace")}
              style={{
                marginTop: 32,
                position: "relative",
                overflow: "hidden",
                width: "100%",
                padding: 12,
                border: `1.5px solid ${BLUE}`,
                borderRadius: 18,
                background: "#fff",
                boxShadow: "0 6px 18px rgba(11,31,58,.07)",
                cursor: "pointer",
                fontFamily: "inherit",
                display: "flex",
                alignItems: "center",
                gap: 10,
                textAlign: "left",
              }}
            >
              <div
                style={{
                  flexShrink: 0,
                  width: 55,
                  height: 55,
                  borderRadius: 12,
                  background: "#FFF1E8",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <img
                  src={proShopLogoAsset.url}
                  alt="PRO"
                  style={{ width: 35, height: 35, objectFit: "contain" }}
                />
              </div>
              <div style={{ flex: 1, minWidth: 0, zIndex: 1 }}>
                <div style={{ fontFamily: SORA, fontSize: 15, fontWeight: 900, color: NAVY, letterSpacing: ".2px" }}>
                  PRO SHOP
                </div>
                <div style={{ fontSize: 11.5, color: GREY, lineHeight: 1.3, maxWidth: 150 }}>
                  Exclusive products and offers for instructors.
                </div>
              </div>
              <img
                src={proShopMerchAsset.url}
                alt="EveryDriver PRO polo shirt, cap and travel cup"
                style={{
                  position: "absolute",
                  right: 0,
                  bottom: 0,
                  height: "100%",
                  width: "auto",
                  objectFit: "contain",
                  objectPosition: "bottom right",
                  pointerEvents: "none",
                  zIndex: 0,
                }}
              />
              <div
                style={{
                  flexShrink: 0,
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  background: "#F2F7FE",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  position: "relative",
                  zIndex: 1,
                }}
              >
                <IconChevronRight size={18} color={BLUE} />
              </div>
            </button>



          </div>
        </section>


        {/* ============ 6 — PRICING ============ */}
        <section style={{ padding: "0 0 24px" }}>
          <div style={{ padding: "0 16px" }}>
            <ExplainerButton video={sectionVideos["pricing"]} onOpen={setOpenVideo} />
          </div>
          <div style={{ padding: "0 16px" }}>
            <SectionTitle strong="MEMBERSHIP" rest="PRICING" color={NAVY} />
          </div>

          <div style={{ display: "grid", gap: 18, padding: "18px 16px 4px" }}>
            {/* FREE */}
            <div style={{ ...CARD, padding: 16, display: "flex", gap: 14, alignItems: "center" }}>
              <div style={{ flex: "0 0 116px", minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: ".8px", color: NAVY }}>
                  EVERYDRIVER
                </div>
                <div style={{ fontFamily: SORA, fontSize: 34, fontWeight: 900, color: BLUE, lineHeight: 1.05 }}>
                  FREE
                </div>
                <div style={{ fontSize: 12.5, color: NAVY, marginTop: 4 }}>
                  FREE forever for ADI's & PDI's.
                </div>
                <button
                  type="button"
                  onClick={() => go("/subscription")}
                  style={{
                    border: "none",
                    cursor: "pointer",
                    fontFamily: "inherit",
                    borderRadius: 10,
                    background: "#E7F1FD",
                    color: BLUE,
                    fontSize: 10,
                    fontWeight: 900,
                    padding: "7px 9px",
                    width: "100%",
                    marginTop: 9,
                    lineHeight: 1.2,
                  }}
                >
                  Get Started
                </button>
              </div>
              <div
                style={{
                  flex: "1 1 0",
                  minWidth: 0,
                  borderLeft: "1px solid #E3E9F2",
                  paddingLeft: 12,
                  display: "grid",
                  gap: 6,
                }}
              >

                {["5 page mini website", "Online Booling", "Receive enquiries", "Every Driver address school.everydriver.co.uk"].map((f) => (
                  <Tick key={f} color={BLUE}>
                    {f}
                  </Tick>
                ))}
              </div>
            </div>

            <div
              style={{
                ...CARD,
                padding: 12,
                display: "flex",
                alignItems: "center",
                gap: 12,
                background: "#F5F1FE",
                borderColor: "#E0D7FA",
              }}
            >
              <img
                src={perkboxIncludedLogoAsset.url}
                alt="Perkbox"
                style={{ width: 34, height: 34, borderRadius: 8, objectFit: "contain", flexShrink: 0 }}
              />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: NAVY, lineHeight: 1.35 }}>
                  FREE Perkbox for 12 months
                </div>
                <div style={{ fontSize: 11.5, color: GREY, marginTop: 2 }}>
                  To the first 1500 members
                </div>
              </div>
            </div>

            {/* PRO */}
            <div style={{ ...CARD, padding: 16, borderColor: `${ORANGE}66`, position: "relative" }}>
              <span
                style={{
                  position: "absolute",
                  top: -11,
                  left: 16,
                  background: ORANGE,
                  color: "#fff",
                  fontSize: 10.5,
                  fontWeight: 800,
                  letterSpacing: ".6px",
                  borderRadius: 999,
                  padding: "4px 12px",
                }}
              >
                MOST POPULAR
              </span>

              <div style={{ display: "flex", gap: 12, alignItems: "flex-start", marginTop: 4 }}>
                <div style={{ flex: "1 1 0", minWidth: 0 }}>
                  <Wordmark name="PRO" accent={ORANGE} />
                  <div style={{ fontSize: 12.5, color: NAVY, marginTop: 6 }}>
                    Everything you need to grow your business, all in one membership.
                  </div>
                </div>

                <div style={{ flex: "0 0 auto", minWidth: 0 }}>
                  <div
                    style={{
                      display: "inline-flex",
                      background: "#F1F4F8",
                      borderRadius: 999,
                      padding: 2,
                    }}
                  >
                    {(["monthly", "annual"] as const).map((b) => (
                      <button
                        key={b}
                        type="button"
                        onClick={() => setBilling(b)}
                        style={{
                          border: "none",
                          cursor: "pointer",
                          fontFamily: "inherit",
                          borderRadius: 999,
                          padding: "4px 10px",
                          fontSize: 10.5,
                          fontWeight: 800,
                          background: billing === b ? BLUE : "transparent",
                          color: billing === b ? "#fff" : NAVY,
                        }}
                      >
                        {b === "monthly" ? "Monthly" : "Annual"}
                      </button>
                    ))}
                  </div>

                  <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginTop: 10 }}>
                    <div style={{ textAlign: "right", opacity: billing === "monthly" ? 1 : 0.45 }}>
                      <div style={{ fontFamily: SORA, fontSize: 20, fontWeight: 900, color: NAVY, lineHeight: 1 }}>
                        £24.99
                      </div>
                      <div style={{ fontSize: 11.5, color: GREY }}>/month</div>
                    </div>
                    <div style={{ width: 1, alignSelf: "stretch", background: "#E3E9F2" }} />
                    <div style={{ textAlign: "right", opacity: billing === "annual" ? 1 : 0.45 }}>
                      <div style={{ fontFamily: SORA, fontSize: 20, fontWeight: 900, color: NAVY, lineHeight: 1 }}>
                        £199.99
                      </div>
                      <div style={{ fontSize: 11.5, color: GREY }}>/year</div>
                    </div>
                  </div>

                  <div
                    style={{
                      marginTop: 10,
                      background: "#FFF6ED",
                      borderRadius: 12,
                      padding: "9px 12px",
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                    }}
                  >
                    <IconGift size={22} color={ORANGE} />
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 800, color: ORANGE }}>Save £99.89</div>
                      <div style={{ fontSize: 11.5, color: "#B4651F" }}>That's only £16.67/month</div>
                    </div>
                  </div>
                </div>
              </div>

              <div
                style={{
                  marginTop: 14,
                  background: "#F7F9FC",
                  borderRadius: 14,
                  padding: 12,
                  display: "grid",
                  gridTemplateColumns: "repeat(2, minmax(0,1fr))",
                  gap: "8px 12px",
                }}
              >
                {PRO_FEATURES.map((f) => (
                  <Tick key={f} color={ORANGE}>
                    {f === "PRO Shop" ? (
                      <span style={{ display: "flex", flexDirection: "column" }}>
                        <span>{f}</span>
                        <img
                          src={diaLogoAsset.url}
                          alt="DIA"
                          style={{ width: 33, height: 33, objectFit: "contain", display: "block", marginTop: 20, borderRadius: 8 }}
                        />
                      </span>
                    ) : (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                        {f}
                      </span>
                    )}
                  </Tick>
                ))}
              </div>

              <button
                type="button"
                onClick={() => go("/subscription")}
                style={{
                  marginTop: 14,
                  width: "100%",
                  border: "none",
                  cursor: "pointer",
                  fontFamily: "inherit",
                  borderRadius: 12,
                  padding: "15px 0",
                  background: ORANGE,
                  color: "#fff",
                  fontSize: 15,
                  fontWeight: 900,
                  letterSpacing: ".5px",
                }}
              >
                {billing === "monthly" ? "JOIN PRO" : "JOIN PRO ANNUAL"}
              </button>
              <div style={{ textAlign: "center", marginTop: 8, fontSize: 11.5, color: GREY }}>
                Switch between monthly or annual to see pricing
              </div>
            </div>

            {/* PRO+ */}
            <div style={{ ...CARD, padding: 16, borderColor: "#7C3AED55", position: "relative" }}>
              <span
                style={{
                  position: "absolute",
                  top: -11,
                  left: 16,
                  background: "#7C3AED",
                  color: "#fff",
                  fontSize: 10.5,
                  fontWeight: 800,
                  letterSpacing: ".6px",
                  borderRadius: 999,
                  padding: "4px 12px",
                }}
              >
                PREMIUM
              </span>

              <div style={{ display: "flex", gap: 12, alignItems: "flex-start", marginTop: 4 }}>
                <div style={{ flex: "1 1 0", minWidth: 0 }}>
                  <Wordmark name="PRO+" accent="#7C3AED" />
                  <div style={{ fontSize: 13, fontWeight: 800, color: NAVY, marginTop: 10 }}>
                    Everything in PRO, plus:
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 4,
                      marginTop: 8,
                      width: "100%",
                      flexWrap: "nowrap",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 4, minWidth: 0, flexShrink: 1 }}>
                      <IconHeart size={16} color="#F0399B" fill="#F0399B" />
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: 700,
                          color: NAVY,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        Benenden Health
                      </span>
                    </div>
                    <div style={{ display: "inline-flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 3,
                          fontSize: 10,
                          fontWeight: 700,
                          color: NAVY,
                          whiteSpace: "nowrap",
                          flexShrink: 0,
                        }}
                      >
                        <img
                          src={diaLogoAsset.url}
                          alt="DIA"
                          style={{ width: 12, height: 12, borderRadius: 2, display: "block" }}
                        />
                        DIA Included
                      </span>
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 3,
                          fontSize: 10,
                          fontWeight: 700,
                          color: NAVY,
                          whiteSpace: "nowrap",
                          flexShrink: 0,
                        }}
                      >
                        <img
                          src={perkboxIncludedLogoAsset.url}
                          alt="Perkbox"
                          style={{ width: 12, height: 12, borderRadius: 2, display: "block" }}
                        />
                        Perkbox Included
                      </span>
                    </div>
                  </div>
                </div>

                <div style={{ flex: "0 0 auto", textAlign: "right" }}>
                  <div style={{ fontFamily: SORA, fontSize: 22, fontWeight: 900, color: NAVY, lineHeight: 1 }}>
                    £39.99
                  </div>
                  <div style={{ fontSize: 11.5, color: GREY }}>/month</div>
                </div>
              </div>

              <div
                style={{
                  marginTop: 12,
                  background: "#F5F1FE",
                  borderRadius: 14,
                  padding: 12,
                  display: "grid",
                  gap: 8,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <IconHeart size={18} color="#7C3AED" />
                  <span style={{ fontSize: 14, fontWeight: 800, color: "#7C3AED" }}>Benenden Health</span>
                </div>
                {BENENDEN_FEATURES.map((f) => (
                  <Tick key={f} color="#7C3AED">
                    {f}
                  </Tick>
                ))}
              </div>

              <button
                type="button"
                onClick={() => go("/subscription")}
                style={{
                  marginTop: 14,
                  width: "100%",
                  border: "none",
                  cursor: "pointer",
                  fontFamily: "inherit",
                  borderRadius: 12,
                  padding: "15px 0",
                  background: "#7C3AED",
                  color: "#fff",
                  fontSize: 15,
                  fontWeight: 900,
                  letterSpacing: ".5px",
                }}
              >
                JOIN PRO+
              </button>
              <div style={{ textAlign: "center", marginTop: 8, fontSize: 11.5, color: GREY }}>
                £39.99 per month for 12 months
              </div>
            </div>
          </div>
        </section>



        {/* ============ 7 — TRUST + ADD-ONS ============ */}
        <section style={{ padding: "0 16px 24px" }}>
          <ExplainerButton video={sectionVideos["addons"]} onOpen={setOpenVideo} />
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, minmax(0,1fr))",
              gap: 10,
              marginBottom: 16,
            }}
          >
            {[
              {
                title: "SAVE MORE",
                body: "Exclusive discounts that put money back in your pocket.",
                colour: ORANGE,
                icon: <IconPigMoney size={22} color={ORANGE} />,
              },
              {
                title: "PROTECTED",
                body: "Professional membership plus optional health cover in PRO+.",
                colour: BLUE,
                icon: <IconShieldCheck size={22} color={BLUE} />,
              },
              {
                title: "STAY CONNECTED",
                body: "Trusted news, advice and entertainment for driving instructors.",
                colour: GREEN,
                icon: <IconUsers size={22} color={GREEN} />,
              },
            ].map((t) => (
              <div key={t.title} style={{ ...CARD, padding: 10 }}>
                <div style={{ marginBottom: 6 }}>{t.icon}</div>
                <div
                  style={{
                    fontSize: 10.5,
                    fontWeight: 900,
                    letterSpacing: ".5px",
                    color: t.colour,
                    marginBottom: 3,
                  }}
                >
                  {t.title}
                </div>
                <div style={{ fontSize: 10.5, color: GREY, lineHeight: 1.3 }}>{t.body}</div>
              </div>
            ))}
          </div>

          <div
            style={{
              fontSize: 11.5,
              fontWeight: 800,
              letterSpacing: ".8px",
              color: GREY,
              marginBottom: 8,
            }}
          >
            ADD-ONS
          </div>
          <div style={{ border: `1px solid ${LINE}`, borderRadius: 12, overflow: "hidden" }}>
            {ADDONS.map((a, i) => (
              <div
                key={a.title}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                  padding: "11px 12px",
                  borderTop: i === 0 ? undefined : `1px solid ${LINE}`,
                  background: "#FBFCFE",
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: NAVY }}>{a.title}</div>
                  <div style={{ fontSize: 11.5, color: GREY, lineHeight: 1.3 }}>{a.body}</div>
                </div>
                <div style={{ fontSize: 12.5, fontWeight: 700, color: NAVY, flexShrink: 0 }}>
                  {a.price}
                </div>
              </div>
            ))}
          </div>
        </section>


        {/* ============ 8 — FINAL CTA ============ */}
        <section style={{ padding: "0 16px 32px" }}>
          <button
            type="button"
            onClick={() => go("/subscription")}
            style={{
              width: "100%",
              border: "none",
              cursor: "pointer",
              fontFamily: "inherit",
              borderRadius: 16,
              padding: "16px 18px",
              background: `linear-gradient(135deg, ${ORANGE}, #FF8A3D)`,
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              boxShadow: "0 10px 22px rgba(242,101,34,0.35)",
            }}
          >
            <IconSparkles size={22} color="#fff" style={{ flexShrink: 0 }} />
            <div style={{ textAlign: "center", flex: 1 }}>
              <div style={{ fontFamily: SORA, fontSize: 16, fontWeight: 900, letterSpacing: ".2px" }}>
                JOIN EVERYDRIVER PRO
              </div>
              <div style={{ fontSize: 12.5, opacity: 0.95 }}>From £24.99/month</div>
            </div>
            <IconChevronRight size={22} color="#fff" style={{ flexShrink: 0 }} />
          </button>
        </section>
      </div>

      {openVideo && <VideoModal video={openVideo} onClose={() => setOpenVideo(null)} />}
    </div>
  );
}

/* ------------------------------------------------------------------ */
// Media card
/* ------------------------------------------------------------------ */

function MediaCard({
  title,
  body,
  colour,
  icon,
  items,
  wave,
  waveActive,
  onClick,
}: {
  title: string;
  body: string;
  colour: string;
  icon: React.ReactNode;
  items?: string[];
  wave?: boolean;
  waveActive?: boolean;
  onClick: () => void;
}) {

  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        textAlign: "left",
        border: "none",
        cursor: "pointer",
        fontFamily: "inherit",
        borderRadius: 14,
        padding: 12,
        color: "#fff",
        background: `linear-gradient(140deg, ${colour}, ${colour}CC)`,
        minHeight: 118,
        display: "flex",
        flexDirection: "column",
        gap: 6,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
        {icon}
        <span style={{ fontFamily: SORA, fontSize: 13, fontWeight: 900, letterSpacing: ".3px" }}>
          {title}
        </span>
      </div>
      <div style={{ fontSize: 11.5, lineHeight: 1.35, opacity: 0.92 }}>{body}</div>
      {items && items.length > 0 && (
        <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: 3 }}>
          {items.map((t) => (
            <div
              key={t}
              style={{
                fontSize: 10.5,
                fontWeight: 600,
                opacity: 0.95,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              • {t}
            </div>
          ))}
        </div>
      )}
      {wave && (
        <div
          style={{
            marginTop: "auto",
            display: "flex",
            alignItems: "flex-end",
            gap: 2,
            height: 22,
          }}
        >
          {Array.from({ length: 26 }).map((_, i) => (
            <span
              key={i}
              style={{
                flex: 1,
                borderRadius: 1.5,
                background: waveActive ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.5)",
                height: `${Math.round(20 + Math.abs(Math.sin(i * 1.7)) * 80)}%`,
              }}
            />
          ))}
        </div>
      )}

    </button>
  );
}

/* ------------------------------------------------------------------ */
// Wordmark (EVERYDRIVER + plan name with star)
/* ------------------------------------------------------------------ */

function Wordmark({ name, accent, size = 34 }: { name: string; accent: string; size?: number }) {
  return (
    <div style={{ minWidth: 0 }}>
      <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: ".8px", color: NAVY }}>
        EVERYDRIVER
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 4,
          fontFamily: SORA,
          fontSize: size,
          fontWeight: 900,
          color: accent,
          lineHeight: 1.05,
        }}
      >
        <span>{name}</span>
      </div>
    </div>
  );
}

