import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { IconShoppingBag } from "@tabler/icons-react";
import { PageLayout } from "@/components/PageLayout";
import { supabase } from "@/lib/supabaseClient";

const POPPINS = { fontFamily: "Poppins, sans-serif" } as const;
const PAGE_BG = "#F4F6F8";
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

/* ------------------------------------------------------------------ */
// Types
/* ------------------------------------------------------------------ */

type ShopListing = {
  id: string;
  title: string;
  price_display: string | null;
  image_urls: string[] | null;
  thumbnail_url?: string | null;
  category?: string | null;
  description?: string | null;
  marketplace_categories?: { name: string | null } | null;
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

/** Turn stored rich/long text into a single clean line of display copy. */
function oneLine(raw: string | null | undefined): string {
  if (!raw) return "";
  const text = raw
    .replace(/<[^>]*>/g, " ")
    .replace(/[*_#>`]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!text) return "";
  const sentence = text.split(/(?<=[.!?])\s/)[0] ?? text;
  const chosen = sentence.length >= 24 ? sentence : text;
  return chosen.length > 90 ? `${chosen.slice(0, 87).trimEnd()}…` : chosen;
}

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
        padding: `18px ${PAD}px 12px`,
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

function EmptyState({ label }: { label: string }) {
  return (
    <div
      style={{
        padding: "32px 16px",
        textAlign: "center",
        color: MUTED,
        fontSize: 12,
        ...POPPINS,
      }}
    >
      {label}
    </div>
  );
}

/* ------------------------------------------------------------------ */
// Perks
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

/** Large featured tile shown at the top of a tab, matching the PRO TV featured card. */
function FeaturedCard({
  title,
  subtitle,
  image,
  initial,
  tint,
  badge,
  chip,
  onClick,
}: {
  title: string;
  subtitle: string;
  image: string | null | undefined;
  initial: string;
  tint: [string, string];
  badge: string;
  chip: string;
  onClick: () => void;
}) {
  return (
    <div
      onClick={onClick}
      style={{
        background: "#fff",
        borderRadius: 8,
        border: `0.5px solid ${HAIRLINE}`,
        boxShadow: "0 1px 3px rgba(11,35,65,0.06)",
        margin: `0 ${PAD}px 12px`,
        overflow: "hidden",
        cursor: "pointer",
      }}
    >
      <div
        style={{
          position: "relative",
          height: 180,
          background: `linear-gradient(135deg, ${tint[0]}, ${tint[1]})`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <PerkHeroImage src={image ?? null} alt={title} initial={initial} />
        <span
          style={{
            position: "absolute",
            top: 10,
            left: 10,
            background: BLUE,
            color: "#fff",
            fontSize: 9,
            fontWeight: 700,
            borderRadius: 4,
            padding: "3px 8px",
            textTransform: "uppercase",
            letterSpacing: "0.04em",
          }}
        >
          {badge}
        </span>
        <span
          style={{
            position: "absolute",
            bottom: 10,
            right: 10,
            background: "rgba(0,0,0,0.5)",
            color: "#fff",
            fontSize: 10,
            fontWeight: 700,
            borderRadius: 4,
            padding: "3px 8px",
            whiteSpace: "nowrap",
          }}
        >
          {chip}
        </span>
      </div>
      <div style={{ padding: "12px 14px 14px" }}>
        <div style={{ color: NAVY, fontSize: 15, fontWeight: 700, lineHeight: 1.3 }}>{title}</div>
        {subtitle ? (
          <div style={{ color: MUTED, fontSize: 12, marginTop: 4, lineHeight: 1.4, ...CLAMP(2) }}>
            {subtitle}
          </div>
        ) : null}
      </div>
    </div>
  );
}

/** Shared grid tile used identically by PERKS and PRO SHOP. */
function GridCard({
  id,
  title,
  subtitle,
  image,
  chip,
  onClick,
}: {
  id: string;
  title: string;
  subtitle: string;
  image: string | null;
  chip: string;
  onClick: () => void;
}) {
  const [c1, c2] = perkTint(id);
  return (
    <div
      onClick={onClick}
      style={{
        background: "#fff",
        borderRadius: 8,
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
        <PerkHeroImage src={image} alt={title} initial={title.trim().charAt(0).toUpperCase()} />
        <span
          style={{
            position: "absolute",
            left: 8,
            bottom: 8,
            background: "#fff",
            color: BLUE,
            fontSize: 10,
            fontWeight: 700,
            borderRadius: 8,
            padding: "3px 7px",
            boxShadow: "0 1px 4px rgba(11,35,65,0.18)",
            textTransform: "uppercase",
            letterSpacing: "0.03em",
            whiteSpace: "nowrap",
          }}
        >
          {chip}
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
          {title}
        </div>
        <div style={{ fontSize: 11, color: MUTED, marginTop: 3, ...CLAMP(1) }}>{subtitle}</div>
      </div>
    </div>
  );
}

function PerksSection({

  perks,
  onNavigate,
}: {
  perks: Perk[];
  onNavigate: (to: string) => void;
}) {
  if (perks.length === 0) return <EmptyState label="No perks available right now." />;
  const withImage = perks.filter((p) => !!p.hero_image_url?.trim());
  const withoutImage = perks.filter((p) => !p.hero_image_url?.trim());
  const ordered = [...withImage, ...withoutImage];
  const [hero, ...rest] = ordered;
  return (
    <section>
      <SectionHeader
        eyebrow="PRO PERKS"
        title="Your exclusive member benefits"
        actionLabel="See all perks"
        onAction={() => onNavigate("/perks")}
      />
      {hero ? (
        <FeaturedCard
          title={hero.partner?.name || hero.name}
          subtitle={
            oneLine(hero.description) ||
            [hero.partner?.name, hero.category].filter(Boolean).join(" · ")
          }
          image={hero.hero_image_url ?? null}
          initial={(hero.partner?.name || hero.name).trim().charAt(0).toUpperCase()}
          tint={perkTint(hero.id)}
          badge="Featured perk"
          chip={shortSaving(hero.saving)}
          onClick={() => onNavigate(`/perks/${hero.id}`)}
        />
      ) : null}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 12,
          padding: `0 ${PAD}px`,
        }}
      >
        {rest.map((p) => {
          const [c1, c2] = perkTint(p.id);
          const label = p.partner?.name || p.name;
          return (
            <div
              key={p.id}
              onClick={() => onNavigate(`/perks/${p.id}`)}
              style={{
                background: "#fff",
                borderRadius: 8,
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
                <PerkHeroImage
                  src={p.hero_image_url}
                  alt={p.name}
                  initial={label.trim().charAt(0).toUpperCase()}
                />
                <span
                  style={{
                    position: "absolute",
                    left: 8,
                    bottom: 8,
                    background: "#fff",
                    color: BLUE,
                    fontSize: 10,
                    fontWeight: 700,
                    borderRadius: 8,
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
                  {oneLine(p.description) ||
                    [p.partner?.name, p.category].filter(Boolean).join(" · ") ||
                    `${shortSaving(p.saving)} for PRO members`}
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
// PRO Shop
/* ------------------------------------------------------------------ */

function ShopSection({
  listings,
  onNavigate,
}: {
  listings: ShopListing[];
  onNavigate: (to: string) => void;
}) {
  if (listings.length === 0) return <EmptyState label="No shop listings available right now." />;
  const [shopHero, ...restListings] = listings;
  return (
    <section>
      <SectionHeader
        eyebrow="PRO SHOP"
        title="Kit for your car"
        onAction={() => onNavigate("/marketplace")}
      />
      {shopHero ? (
        <FeaturedCard
          title={shopHero.title}
          subtitle={
            oneLine(shopHero.description) ||
            shopHero.marketplace_categories?.name ||
            shopHero.category ||
            "Member price for PRO instructors"
          }
          image={shopHero.thumbnail_url || shopHero.image_urls?.[0] || null}
          initial={shopHero.title.trim().charAt(0).toUpperCase()}
          tint={perkTint(shopHero.id)}
          badge="Featured item"
          chip={
            formatMoneyDisplay(shopHero.price_display) ||
            shopHero.marketplace_categories?.name ||
            "Shop"
          }
          onClick={() => onNavigate(`/marketplace/${shopHero.id}`)}
        />
      ) : null}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
          gap: 12,
          padding: `0 ${PAD}px 4px`,
        }}
      >
        {restListings.map((l) => {
          const [c1, c2] = perkTint(l.id);
          const image = l.thumbnail_url || l.image_urls?.[0] || null;
          const chip = formatMoneyDisplay(l.price_display) || l.category || "Shop";
          return (
            <div
              key={l.id}
              onClick={() => onNavigate(`/marketplace/${l.id}`)}
              style={{
                background: "#fff",
                borderRadius: 8,
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
                <PerkHeroImage
                  src={image}
                  alt={l.title}
                  initial={l.title.trim().charAt(0).toUpperCase()}
                />
                <span
                  style={{
                    position: "absolute",
                    left: 8,
                    bottom: 8,
                    background: "#fff",
                    color: BLUE,
                    fontSize: 10,
                    fontWeight: 700,
                    borderRadius: 8,
                    padding: "3px 7px",
                    boxShadow: "0 1px 4px rgba(11,35,65,0.18)",
                    textTransform: "uppercase",
                    letterSpacing: "0.03em",
                    whiteSpace: "nowrap",
                  }}
                >
                  {chip}
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
                  {l.title}
                </div>
                <div style={{ fontSize: 11, color: MUTED, marginTop: 3, ...CLAMP(1) }}>
                  {oneLine(l.description) ||
                    l.marketplace_categories?.name ||
                    l.category ||
                    "Member price for PRO instructors"}
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
// Page
/* ------------------------------------------------------------------ */

export const Route = createFileRoute("/pro")({
  head: () => ({
    meta: [
      { title: "PRO — Every Driver Pro" },
      {
        name: "description",
        content:
          "Your PRO membership: exclusive member perks and the PRO Shop for driving instructors.",
      },
      { property: "og:title", content: "PRO — Every Driver Pro" },
      {
        property: "og:description",
        content:
          "Your PRO membership: exclusive member perks and the PRO Shop for driving instructors.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => <ProPage />,
});

type ProTabKey = "perks" | "shop";

const TABS: { key: ProTabKey; label: string }[] = [
  { key: "perks", label: "PERKS" },
  { key: "shop", label: "PRO SHOP" },
];

export function ProPage(_props: { onNavigateToMedia?: () => void } = {}) {
  const navigate = useNavigate();
  const go = (to: string) => navigate({ to: to as never });

  const [listings, setListings] = useState<ShopListing[]>([]);
  const [perks, setPerks] = useState<Perk[]>([]);
  const [activeTab, setActiveTab] = useState<ProTabKey>("perks");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [shopRes, perkRes] = await Promise.allSettled([
        supabase
          .from("marketplace_listings")
          .select("id, title, description, price_display, image_urls, marketplace_categories(name)")
          .eq("is_active", true)
          .is("deleted_at", null)
          .order("created_at", { ascending: false })
          .limit(20),
        supabase
          .from("benefit_perks")
          .select("id, name, description, category, saving, hero_image_url, partner:benefit_partners(name)")
          .eq("active", true)
          .order("sort_order", { ascending: true })
          .limit(30),
      ]);
      if (cancelled) return;

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

  return (
    <PageLayout style={{ backgroundColor: PAGE_BG, ...POPPINS }}>
      <div
        style={{
          minHeight: "100%",
          display: "flex",
          flexDirection: "column",
          background: PAGE_BG,
        }}
      >
        <div
          style={{
            background: NAVY,
            paddingTop: "calc(var(--dsm-safe-top, env(safe-area-inset-top, 0px)) + 44px)",
            paddingLeft: 16,
            paddingRight: 16,
            paddingBottom: 0,
            position: "sticky",
            top: 0,
            zIndex: 5,
          }}
        >
          <div
            style={{
              display: "flex",
              gap: 0,
              borderBottom: "1px solid rgba(255,255,255,0.1)",
            }}
          >
            {TABS.map((t) => {
              const active = activeTab === t.key;
              return (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setActiveTab(t.key)}
                  style={{
                    background: "transparent",
                    border: "none",
                    borderBottom: `2px solid ${active ? BLUE : "transparent"}`,
                    color: active ? "#fff" : "rgba(255,255,255,0.5)",
                    fontWeight: active ? 700 : 500,
                    fontSize: 13,
                    padding: "10px 16px",
                    cursor: "pointer",
                    ...POPPINS,
                  }}
                >
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>

        <div
          style={{
            background: PAGE_BG,
            flex: 1,
            overflowY: "auto",
            paddingBottom: "calc(90px + env(safe-area-inset-bottom, 0px))",
          }}
        >
          {activeTab === "perks" ? <PerksSection perks={perks} onNavigate={go} /> : null}
          {activeTab === "shop" ? <ShopSection listings={listings} onNavigate={go} /> : null}
        </div>
      </div>
    </PageLayout>
  );
}

export default ProPage;
