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
  return (
    <section>
      <SectionHeader
        eyebrow="PRO PERKS"
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
        {ordered.map((p) => {
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
  return (
    <section>
      <SectionHeader
        eyebrow="PRO SHOP"
        title="Kit for your car"
        onAction={() => onNavigate("/marketplace")}
      />
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
          gap: 12,
          padding: `0 ${PAD}px 4px`,
        }}
      >
        {listings.map((l) => {
          const image = l.thumbnail_url || l.image_urls?.[0] || null;
          return (
            <div
              key={l.id}
              onClick={() => onNavigate("/marketplace")}
              style={{
                background: "#fff",
                borderRadius: 8,
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
          .select("id, title, price_display, image_urls")
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
