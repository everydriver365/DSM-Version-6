import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  IconCheck,
  IconChevronRight,
  IconDeviceTv,
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
} from "@tabler/icons-react";

import diaLogoAsset from "@/assets/dia-logo.png.asset.json";
import instructorHeroAsset from "@/assets/richard-with-car.jpg.asset.json";
import websiteMockAsset from "@/assets/driving-school-website.png.asset.json";
import perkboxLogoAsset from "@/assets/perkbox-logo.png.asset.json";
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

const BRANDS: { name: string; colour: string; italic?: boolean; offer: string }[] = [
  { name: "TESCO", colour: "#EE1C2E", offer: "Up to 10% off Gift Cards" },
  { name: "COSTA", colour: "#6D1B32", offer: "Free regular hot drink" },
  { name: "Sainsbury's", colour: "#F06C00", offer: "Up to 10% off Gift Cards" },
  { name: "ASDA", colour: "#00A94F", offer: "Up to 10% off Gift Cards" },
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
  { title: "MULTI CAR", body: "Manage more than one car on your account.", price: "£2.99/month" },
  { title: "WHITE LABEL", body: "Run EveryDriver under your own brand.", price: "£19.99/month" },
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

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [tvRes, newsRes] = await Promise.allSettled([
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
      ]);
      if (cancelled) return;
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
        {/* ============ 1 — DIA MEMBERSHIP ============ */}
        <section
          style={{
            position: "relative",
            padding: "calc(env(safe-area-inset-top, 0px) + 64px) 16px 24px",
            overflow: "hidden",
          }}
        >
          <img
            src={instructorHeroAsset.url}
            alt="Driving instructor in a car"
            style={{
              position: "absolute",
              top: 0,
              right: 0,
              width: "58%",
              height: 300,
              objectFit: "cover",
              objectPosition: "center 20%",
              borderBottomLeftRadius: 120,
              opacity: 0.95,
            }}
          />
          <div
            style={{
              position: "absolute",
              top: 0,
              right: 0,
              width: "58%",
              height: 300,
              background: "linear-gradient(90deg, #fff 0%, rgba(255,255,255,0.6) 30%, rgba(255,255,255,0) 70%)",
            }}
          />

          <div style={{ position: "relative", maxWidth: 300 }}>
            <div
              aria-label="DIA"
              role="img"
              style={{
                width: 96,
                height: 112,
                marginBottom: 12,
                display: "grid",
                placeItems: "center",
                background: `linear-gradient(160deg, #2C93F0, ${BLUE} 55%, #0F5FB0)`,
                clipPath:
                  "path('M48 0 L96 18 L96 62 C96 92 74 106 48 112 C22 106 0 92 0 62 L0 18 Z')",
                boxShadow: "0 14px 26px rgba(24,119,214,0.28)",
              }}
            >
              <span
                style={{
                  fontFamily: SORA,
                  fontSize: 28,
                  fontWeight: 900,
                  color: "#fff",
                  letterSpacing: "0.5px",
                  border: "3px solid rgba(255,255,255,0.9)",
                  borderRadius: 8,
                  padding: "2px 8px",
                  lineHeight: 1.1,
                }}
              >
                DIA
              </span>
            </div>

            <span
              style={{
                display: "inline-block",
                background: BLUE,
                color: "#fff",
                fontSize: 10.5,
                fontWeight: 800,
                letterSpacing: ".8px",
                borderRadius: 999,
                padding: "4px 12px",
                marginBottom: 8,
              }}
            >
              INCLUDED
            </span>
            <h1
              style={{
                fontFamily: SORA,
                fontSize: 27,
                fontWeight: 900,
                color: NAVY,
                lineHeight: 1.05,
                letterSpacing: "-0.02em",
                margin: 0,
              }}
            >
              DIA MEMBERSHIP
            </h1>
            <div
              style={{
                fontFamily: SORA,
                fontSize: 17,
                fontWeight: 800,
                color: BLUE,
                marginTop: 4,
                marginBottom: 8,
              }}
            >
              WORTH £125/YEAR
            </div>
            <p style={{ fontSize: 13.5, color: GREY, lineHeight: 1.45, margin: "0 0 14px" }}>
              Professional representation, advice, support and industry updates.{" "}
              <strong style={{ color: NAVY }}>Included</strong> with EveryDriver PRO.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
              {DIA_BENEFITS.map((b) => (
                <Tick key={b}>{b}</Tick>
              ))}
            </div>
          </div>

          {/* Worth badge */}
          <div
            style={{
              position: "absolute",
              right: 16,
              top: "calc(env(safe-area-inset-top, 0px) + 120px)",
              width: 104,
              padding: "14px 8px 22px",
              background: `linear-gradient(160deg, ${BLUE}, #0F5FB0)`,
              color: "#fff",
              textAlign: "center",
              borderRadius: "12px 12px 52px 52px",
              boxShadow: "0 10px 20px rgba(11,35,65,0.25)",
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".5px" }}>WORTH</div>
            <div style={{ fontFamily: SORA, fontSize: 26, fontWeight: 900, lineHeight: 1.1 }}>
              £125
            </div>
            <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: ".5px", opacity: 0.9 }}>
              PER YEAR
            </div>
          </div>
        </section>

        {/* ============ 2 — WEBSITE ============ */}
        <section style={{ padding: "8px 16px 24px" }}>
          <div style={{ ...CARD, padding: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
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
        <section style={{ padding: "0 0 24px" }}>
          <div style={{ padding: "0 16px" }}>
            <SectionTitle strong="PRO" rest="PERKS" subtitle="Real savings on things you already buy." />
          </div>
          <div style={{ padding: "0 16px" }}>
            <div style={{ ...CARD, padding: 12, display: "flex", gap: 12, alignItems: "stretch" }}>
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
                      flex: "0 0 84px",
                      border: `1px solid ${LINE}`,
                      borderRadius: 10,
                      padding: "10px 6px",
                      textAlign: "center",
                      background: "#FBFCFE",
                    }}
                  >
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
        <section style={{ padding: "0 16px 24px" }}>
          <SectionTitle
            strong="PRO"
            rest="MEDIA HUB"
            subtitle="Industry news, advice and entertainment — made for driving instructors."
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

          <button
            type="button"
            onClick={() => go("/marketplace")}
            style={{
              ...CARD,
              marginTop: 10,
              width: "100%",
              padding: "12px 14px",
              cursor: "pointer",
              fontFamily: "inherit",
              display: "flex",
              alignItems: "center",
              gap: 10,
              textAlign: "left",
            }}
          >
            <IconShoppingBag size={20} color={ORANGE} style={{ flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12.5, fontWeight: 800, color: NAVY, letterSpacing: ".3px" }}>
                PRO SHOP
              </div>
              <div style={{ fontSize: 11.5, color: GREY, lineHeight: 1.3 }}>
                Exclusive products and offers for instructors.
              </div>
            </div>
            <IconChevronRight size={18} color={GREY} style={{ flexShrink: 0 }} />
          </button>
        </section>

        {/* ============ 5 — PERKBOX DISCOUNTS ============ */}
        <section style={{ padding: "0 0 24px" }}>
          <div style={{ padding: "0 16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <img
                src={perkboxLogoAsset.url}
                alt="Perkbox"
                style={{ height: 18, width: "auto", display: "block" }}
              />
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 800,
                  color: NAVY,
                  letterSpacing: ".5px",
                }}
              >
                THOUSANDS OF DISCOUNTS WITH PERKBOX
              </div>
            </div>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 18,
              overflowX: "auto",
              padding: "4px 16px",
              WebkitOverflowScrolling: "touch",
            }}
          >
            {BRANDS.map((b) => (
              <div
                key={b.name}
                style={{
                  flex: "0 0 auto",
                  fontFamily: SORA,
                  fontSize: 15,
                  fontWeight: 900,
                  color: b.colour,
                  fontStyle: b.italic ? "italic" : "normal",
                  whiteSpace: "nowrap",
                }}
              >
                {b.name}
              </div>
            ))}
            <div
              style={{
                flex: "0 0 auto",
                border: `1px solid ${LINE}`,
                borderRadius: 10,
                padding: "6px 12px",
                textAlign: "center",
                background: "#fff",
              }}
            >
              <div style={{ fontFamily: SORA, fontSize: 14, fontWeight: 900, color: NAVY }}>
                +9000
              </div>
              <div style={{ fontSize: 8.5, fontWeight: 700, color: GREY, letterSpacing: ".4px" }}>
                MORE OFFERS
              </div>
            </div>
          </div>
        </section>


        {/* ============ 6 — PRICING ============ */}
        <section style={{ padding: "0 0 24px" }}>
          <div style={{ padding: "0 16px" }}>
            <SectionTitle strong="MEMBERSHIP" rest="PRICING" color={NAVY} />
          </div>

          <div
            style={{
              display: "flex",
              gap: 12,
              overflowX: "auto",
              padding: "10px 16px 4px",
              scrollSnapType: "x mandatory",
              WebkitOverflowScrolling: "touch",
            }}
          >
            <div style={{ flex: "0 0 284px", scrollSnapAlign: "start" }}>
              <PlanCard
                accent={ORANGE}
                badge="MOST POPULAR"
                name="PRO"
                price="£24.99"
                period="/month"
                note="12-month commitment"
                saving={null}
                wasNow={null}
                features={PRO_FEATURES}
                cta="JOIN PRO"
                footnote="£24.99 per month for 12 months"
                onCta={() => go("/subscription")}
              />
            </div>

            <div style={{ flex: "0 0 284px", scrollSnapAlign: "start" }}>
              <PlanCard
                accent="#E8A020"
                badge="BEST VALUE"
                name="PRO ANNUAL"
                price="£199.99"
                period="/year"
                note="Everything in PRO, paid yearly"
                saving={{ headline: "Save £99.89", detail: "That's only £16.67/month" }}
                wasNow={{ was: "£299.88", now: "£199.99 per year" }}
                features={[]}
                cta="JOIN PRO ANNUAL"
                footnote="£199.99 per year"
                onCta={() => go("/subscription")}
              />
            </div>

            <div style={{ flex: "0 0 284px", scrollSnapAlign: "start" }}>
              <PlanCard
                accent="#7C3AED"
                badge="BEST VALUE"
                name="PRO+"
                price="£39.99"
                period="/month"
                note="12-month commitment"
                saving={null}
                wasNow={null}
                intro="Everything in PRO, plus:"
                heartLine="Benenden Health"
                features={BENENDEN_FEATURES}
                cta="JOIN PRO+"
                footnote="£39.99 per month for 12 months"
                onCta={() => go("/subscription")}
              />
            </div>
          </div>
        </section>


        {/* ============ 7 — TRUST + ADD-ONS ============ */}
        <section style={{ padding: "0 16px 24px" }}>
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
// Plan card
/* ------------------------------------------------------------------ */

function PlanCard({
  accent,
  badge,
  name,
  price,
  period,
  note,
  saving,
  wasNow,
  intro,
  heartLine,
  features,
  cta,
  footnote,
  onCta,
}: {
  accent: string;
  badge?: string;
  name: string;
  price: string;
  period: string;
  note: string;
  saving: { headline: string; detail: string } | null;
  wasNow: { was: string; now: string } | null;
  intro?: string;
  heartLine?: string;
  features: string[];
  cta: string;
  footnote: string;
  onCta: () => void;
}) {
  return (
    <div style={{ ...CARD, padding: 14, borderColor: `${accent}55`, position: "relative" }}>
      {badge && (
        <span
          style={{
            position: "absolute",
            top: -9,
            left: 14,
            background: accent,
            color: "#fff",
            fontSize: 9.5,
            fontWeight: 800,
            letterSpacing: ".6px",
            borderRadius: 999,
            padding: "3px 10px",
          }}
        >
          {badge}
        </span>
      )}

      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 10,
          marginTop: 4,
        }}
      >
        <div>
          <div style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: ".8px", color: NAVY }}>
            EVERYDRIVER
          </div>
          <div style={{ fontFamily: SORA, fontSize: 28, fontWeight: 900, color: accent, lineHeight: 1 }}>
            {name}
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontFamily: SORA, fontSize: 22, fontWeight: 900, color: NAVY, lineHeight: 1 }}>
            {price}
          </div>
          <div style={{ fontSize: 11.5, color: GREY }}>{period}</div>
        </div>
      </div>

      <div
        style={{
          display: "inline-block",
          marginTop: 8,
          background: "#F1F4F8",
          color: NAVY,
          fontSize: 10.5,
          fontWeight: 700,
          borderRadius: 999,
          padding: "3px 10px",
        }}
      >
        {note}
      </div>

      {saving && (
        <div
          style={{
            marginTop: 10,
            background: "#FFF6ED",
            border: "1px solid #FBD9BC",
            borderRadius: 12,
            padding: "9px 12px",
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 800, color: ORANGE }}>{saving.headline}</div>
          <div style={{ fontSize: 11.5, color: "#B4651F" }}>{saving.detail}</div>
        </div>
      )}

      {intro && (
        <div style={{ fontSize: 12.5, color: GREY, marginTop: 10 }}>{intro}</div>
      )}
      {heartLine && (
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6 }}>
          <IconHeart size={16} color="#7C3AED" fill="#7C3AED" />
          <span style={{ fontSize: 13.5, fontWeight: 800, color: NAVY }}>{heartLine}</span>
        </div>
      )}

      <div
        style={{
          marginTop: 10,
          display: "grid",
          gridTemplateColumns: "repeat(2, minmax(0,1fr))",
          gap: 6,
        }}
      >
        {features.map((f) => (
          <Tick key={f} color={accent}>
            {f}
          </Tick>
        ))}
      </div>

      <button
        type="button"
        onClick={onCta}
        style={{
          marginTop: 14,
          width: "100%",
          border: "none",
          cursor: "pointer",
          fontFamily: "inherit",
          borderRadius: 12,
          padding: "13px 0",
          background: accent,
          color: "#fff",
          fontSize: 14,
          fontWeight: 900,
          letterSpacing: ".5px",
        }}
      >
        {cta}
      </button>

      <div style={{ textAlign: "center", marginTop: 8, fontSize: 11.5, color: GREY }}>
        {wasNow ? (
          <>
            <span style={{ textDecoration: "line-through", marginRight: 6 }}>{wasNow.was}</span>
            <strong style={{ color: NAVY }}>{wasNow.now}</strong>
          </>
        ) : (
          footnote
        )}
      </div>
    </div>
  );
}
