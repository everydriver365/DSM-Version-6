import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import type { ComponentType } from "react";
import { IconBriefcase, IconCamera, IconCar, IconHeart, IconMapPin, IconPackage, IconSchool, IconShieldCheck, IconStar, IconTool } from "@tabler/icons-react";
import { IconBook, IconSearch, IconSpeakerphone } from "@tabler/icons-react";
import { toast } from "sonner";
import InstructorTopBar from "@/components/dsm/InstructorTopBar";

const SUPABASE_URL = "https://bjpqxfrihwjcqprmoqfs.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJqcHF4ZnJpaHdqY3Fwcm1vcWZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE0NzQ4MjEsImV4cCI6MjA5NzA1MDgyMX0.HKlgx3dxP3uxX9wMRRUnfb0IPwaBpFcut_iUgT5XFeo";

const POPPINS = "Poppins, sans-serif";

export const Route = createFileRoute("/marketplace")({
  head: () => ({
    meta: [
      { title: "DSM Marketplace" },
      {
        name: "description",
        content:
          "Products and services for driving instructors — all in one place.",
      },
    ],
  }),
  component: MarketplacePage,
});

interface Category {
  id: string;
  name: string;
  slug: string;
  display_order: number;
  is_active: boolean;
}

interface Supplier {
  name: string;
  logo_url: string | null;
  is_verified: boolean;
}

interface Listing {
  id: string;
  title: string;
  description: string | null;
  price_display: string | null;
  image_urls: string[] | null;
  is_featured: boolean;
  is_active: boolean;
  listing_type: string | null;
  category_id: string | null;
  supplier_id: string | null;
  created_at: string;
  marketplace_suppliers: Supplier | null;
  marketplace_categories: { name: string; slug: string } | null;
}

type IconCmp = ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;

// Reuse existing slug → icon mapping.
const CATEGORY_ICONS: Record<string, IconCmp> = {
  tracking: IconMapPin,
  hardware: IconCamera,
  dashcams: IconCamera,
  health: IconHeart,
  learning: IconSchool,
  cpd: IconSchool,
  courses: IconBook,
  insurance: IconShieldCheck,
  vehicles: IconCar,
  cars: IconCar,
  maintenance: IconTool,
  services: IconBriefcase,
  marketing: IconSpeakerphone,
  promotion: IconStar,
};

// Category → thumbnail background colour. Mapped from spec categories onto
// the existing slug taxonomy; anything unknown falls back to brand blue.
const CATEGORY_COLOR: Record<string, string> = {
  tracking: "#0F2044",
  hardware: "#0F2044",
  dashcams: "#0F2044",
  services: "#185FA5",
  marketing: "#185FA5",
  learning: "#6B4FD6",
  cpd: "#6B4FD6",
  courses: "#6B4FD6",
  insurance: "#3B6D11",
  maintenance: "#854F0B",
  promotion: "#A32D2D",
  vehicles: "#0C6E7A",
  cars: "#0C6E7A",
  health: "#185FA5",
};

function iconFor(slug?: string | null): IconCmp {
  if (!slug) return IconPackage;
  return CATEGORY_ICONS[slug] ?? IconPackage;
}

function colorFor(slug?: string | null): string {
  if (!slug) return "#185FA5";
  return CATEGORY_COLOR[slug] ?? "#185FA5";
}

// Sentence case: keep the first word's capitalisation, lowercase later words
// unless they look like acronyms (ADI, DVSA).
function sentenceCase(name: string): string {
  return name
    .split(" ")
    .map((w, i) => {
      if (i === 0) return w.charAt(0).toUpperCase() + w.slice(1);
      if (w.length > 1 && w === w.toUpperCase()) return w;
      return w.toLowerCase();
    })
    .join(" ");
}


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

function MarketplacePage() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState<Category[]>([]);
  const [featured, setFeatured] = useState<Listing[]>([]);
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [cats, feats, all] = await Promise.all([
          sbGet<Category[]>(
            "marketplace_categories?is_active=eq.true&order=display_order.asc",
          ),
          sbGet<Listing[]>(
            "marketplace_listings?is_featured=eq.true&is_active=eq.true&deleted_at=is.null&select=*,marketplace_suppliers(name,logo_url,is_verified),marketplace_categories(name,slug)&limit=6",
          ),
          sbGet<Listing[]>(
            "marketplace_listings?is_active=eq.true&deleted_at=is.null&select=*,marketplace_suppliers(name,logo_url,is_verified),marketplace_categories(name,slug)&order=created_at.desc",
          ),
        ]);
        if (cancelled) return;
        setCategories(cats);
        setFeatured(feats);
        setListings(all);
      } catch (err) {
        console.error("[marketplace] load error", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const filteredAll = useMemo(() => {
    const q = query.trim().toLowerCase();
    return listings.filter((l) => {
      if (l.listing_type === "instructor") return false;
      if (activeCategory && l.marketplace_categories?.slug !== activeCategory)
        return false;
      if (q) {
        const t = l.title?.toLowerCase() ?? "";
        const d = l.description?.toLowerCase() ?? "";
        if (!t.includes(q) && !d.includes(q)) return false;
      }
      return true;
    });
  }, [listings, query, activeCategory]);

  const forSale = useMemo(
    () =>
      listings.filter((l) => {
        if (l.listing_type !== "instructor") return false;
        if (activeCategory && l.marketplace_categories?.slug !== activeCategory)
          return false;
        const q = query.trim().toLowerCase();
        if (q) {
          const t = l.title?.toLowerCase() ?? "";
          const d = l.description?.toLowerCase() ?? "";
          if (!t.includes(q) && !d.includes(q)) return false;
        }
        return true;
      }),
    [listings, activeCategory, query],
  );

  // "Top marketplace" — featured listings, filtered by active category/query
  // using the same rules as the main grid, so filters still work.
  const topMarketplace = useMemo(() => {
    const q = query.trim().toLowerCase();
    const source = featured.length > 0 ? featured : filteredAll;
    return source.filter((l) => {
      if (activeCategory && l.marketplace_categories?.slug !== activeCategory)
        return false;
      if (q) {
        const t = l.title?.toLowerCase() ?? "";
        const d = l.description?.toLowerCase() ?? "";
        if (!t.includes(q) && !d.includes(q)) return false;
      }
      return true;
    });
  }, [featured, filteredAll, activeCategory, query]);

  const openListing = (id: string) =>
    navigate({ to: "/marketplace/$listingId" as never, params: { listingId: id } as never });

  return (
    <div style={{ minHeight: "100vh", background: "#EEF2F7", paddingBottom: 96, fontFamily: POPPINS }}>
      {/* Top bar */}
      <InstructorTopBar
        firstName=""
        pageTitle="DSM Marketplace"
        onBack={() => navigate({ to: "/home" as never })}
        onBell={() => navigate({ to: "/notifications" as never })}
        onPhone={() => navigate({ to: "/enquiries" as never })}
        onLiveTrack={() => navigate({ to: "/live" as never })}
        onMenu={() => navigate({ to: "/more" as never })}
        onMicPress={() => toast.info("Voice commands coming soon!")}
      />
      <div style={{ height: "calc(60px + env(safe-area-inset-top, 0px))" }} />

      <div style={{ padding: "16px 0 8px" }}>
        {/* Search bar */}
        <div style={{ padding: "0 16px", marginBottom: 18 }}>
          <div style={{ position: "relative" }}>
            <div
              style={{
                position: "absolute",
                left: 14,
                top: "50%",
                transform: "translateY(-50%)",
                display: "flex",
                alignItems: "center",
                pointerEvents: "none",
              }}
            >
              <IconSearch size={14} color="#9CA3AF" stroke={2} />
            </div>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search products…"
              style={{
                width: "100%",
                boxSizing: "border-box",
                height: 44,
                background: "#FFFFFF",
                border: "1px solid #E4E8EF",
                borderRadius: 12,
                padding: "0 14px 0 38px",
                outline: "none",
                fontSize: 14,
                color: "#0B1F3A",
                fontFamily: POPPINS,
              }}
            />
          </div>
        </div>

        {/* Categories */}
        <style>{`.mkt-cat-row::-webkit-scrollbar{display:none}.mkt-search-input::placeholder{color:#9CA3AF}`}</style>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, padding: "0 16px" }}>
          <span style={{ width: 4, height: 14, borderRadius: 2, background: "#1877D6" }} />
          <span
            style={{
              fontSize: 12,
              fontWeight: 500,
              color: "#0B1F3A",
              letterSpacing: "0.5px",
              textTransform: "uppercase",
              fontFamily: POPPINS,
            }}
          >
            Categories
          </span>
        </div>
        <div
          className="mkt-cat-row"
          style={{
            display: "flex",
            gap: 8,
            overflowX: "auto",
            padding: "0 16px",
            WebkitOverflowScrolling: "touch",
            scrollbarWidth: "none",
            marginBottom: 20,
          }}
        >
          {[{ id: "__all", slug: null as string | null, name: "All" }, ...categories].map((cat) => {
            const isActive = cat.slug === null ? activeCategory === null : activeCategory === cat.slug;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveCategory(cat.slug)}
                style={{
                  height: 34,
                  background: isActive ? "#0B1F3A" : "#FFFFFF",
                  border: isActive ? "none" : "1px solid #E4E8EF",
                  borderRadius: 20,
                  padding: "0 14px",
                  fontSize: 12,
                  fontWeight: 600,
                  color: isActive ? "#FFFFFF" : "#6B7686",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  flexShrink: 0,
                  fontFamily: POPPINS,
                }}
              >
                {sentenceCase(cat.name)}
              </button>
            );
          })}
        </div>



        {/* Top marketplace */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 16px",
            marginBottom: 10,
          }}
        >
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#0B1F3A", fontFamily: POPPINS }}>
            Top marketplace
          </h2>
          <button
            type="button"
            onClick={() => navigate({ to: "/marketplace/list" as never })}
            style={{
              background: "none",
              border: "none",
              padding: 0,
              cursor: "pointer",
              color: "#1877D6",
              fontSize: 13,
              fontWeight: 600,
              fontFamily: POPPINS,
            }}
          >
            View all →
          </button>
        </div>

        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: "0 16px" }}>
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                style={{
                  height: 100,
                  background: "#FFFFFF",
                  borderRadius: 16,
                  border: "1px solid #E4E8EF",
                }}
              />
            ))}
          </div>
        ) : topMarketplace.length === 0 ? (
          <div style={{ fontSize: 13, color: "#6B7686", padding: "0 16px" }}>No products yet.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column" }}>
            {topMarketplace.map((l, idx) =>
              idx === 0 ? (
                <FeaturedCard key={l.id} listing={l} onOpen={openListing} />
              ) : (
                <ProductCard key={l.id} listing={l} onOpen={openListing} />
              ),
            )}
          </div>
        )}


        {/* For sale by instructors */}
        {forSale.length > 0 && (
          <>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "0 16px",
                margin: "22px 0 10px",
              }}
            >
              <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#0B1F3A", fontFamily: POPPINS }}>
                For sale by instructors
              </h2>
              <button
                type="button"
                onClick={() =>
                  navigate({
                    to: "/marketplace/list" as never,
                    search: { type: "for-sale" } as never,
                  })
                }
                style={{
                  background: "none",
                  border: "none",
                  padding: 0,
                  cursor: "pointer",
                  color: "#1877D6",
                  fontSize: 13,
                  fontWeight: 600,
                  fontFamily: POPPINS,
                }}
              >
                List free →
              </button>
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              {forSale.map((l) => (
                <ProductCard key={l.id} listing={l} onOpen={openListing} />
              ))}
            </div>
          </>
        )}

      </div>
    </div>
  );
}

const CARD_SHADOW = "0 1px 3px rgba(11,31,58,0.06)";

const CATEGORY_PILL: React.CSSProperties = {
  display: "inline-block",
  background: "#EFF6FF",
  color: "#1877D6",
  fontSize: 10,
  fontWeight: 700,
  borderRadius: 20,
  fontFamily: POPPINS,
};

const VIEW_BUTTON: React.CSSProperties = {
  background: "#1877D6",
  color: "#FFFFFF",
  borderRadius: 20,
  padding: "7px 16px",
  fontSize: 13,
  fontWeight: 700,
  border: "none",
  cursor: "pointer",
  fontFamily: POPPINS,
};

/** Neutral "no price" state. */
function NoPriceRow() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <span style={{ fontSize: 13, color: "#9CA3AF", fontFamily: POPPINS }}>
        No price set
      </span>
    </div>
  );
}

function FeaturedCard({
  listing,
  onOpen,
}: {
  listing: Listing;
  onOpen: (id: string) => void;
}) {
  const cat = listing.marketplace_categories;
  const price = listing.price_display?.trim() || null;
  const priceIsBad = !price || !/\d/.test(price);
  const heroImage = listing.image_urls?.[0] ?? null;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpen(listing.id)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen(listing.id);
        }
      }}
      style={{
        margin: "0 16px 10px",
        background: "#fff",
        borderRadius: 16,
        border: "1px solid #E4E8EF",
        overflow: "hidden",
        boxShadow: CARD_SHADOW,
        cursor: "pointer",
        userSelect: "none",
        fontFamily: POPPINS,
      }}
    >
      <div
        style={{
          width: "100%",
          height: 180,
          background: heroImage
            ? `#EEF2F7 url(${heroImage}) center/cover no-repeat`
            : "linear-gradient(135deg,#16305A,#0B1F3A)",
        }}
      />
      <div style={{ padding: 14 }}>
        <div
          style={{
            fontSize: 16,
            fontWeight: 700,
            color: "#0B1F3A",
            fontFamily: POPPINS,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {listing.title}
        </div>
        <span
          style={{
            ...CATEGORY_PILL,
            padding: "3px 10px",
            marginTop: 4,
            marginBottom: 8,
          }}
        >
          {cat?.name || "Marketplace"}
        </span>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 8,
          }}
        >
          {priceIsBad ? (
            <NoPriceRow />
          ) : (
            <span style={{ fontSize: 16, fontWeight: 800, color: "#0B1F3A" }}>
              {price}
            </span>
          )}
          <button type="button" style={VIEW_BUTTON} onClick={() => onOpen(listing.id)}>
            View ›
          </button>
        </div>
      </div>
    </div>
  );
}

function ProductCard({
  listing,
  onOpen,
}: {
  listing: Listing;
  onOpen: (id: string) => void;
}) {
  const cat = listing.marketplace_categories;
  const Icon = iconFor(cat?.slug);
  const accent = colorFor(cat?.slug);
  const image = listing.image_urls?.[0] ?? null;
  const price = listing.price_display?.trim() || null;
  const priceIsBad = !price || !/\d/.test(price);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpen(listing.id)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen(listing.id);
        }
      }}
      style={{
        margin: "0 16px 10px",
        background: "#fff",
        borderRadius: 16,
        border: "1px solid #E4E8EF",
        boxShadow: CARD_SHADOW,
        padding: 12,
        display: "flex",
        gap: 12,
        alignItems: "center",
        cursor: "pointer",
        userSelect: "none",
        fontFamily: POPPINS,
      }}
    >
      <div
        style={{
          width: 76,
          height: 76,
          flexShrink: 0,
          borderRadius: 10,
          background: image
            ? `#EEF2F7 url(${image}) center/cover no-repeat`
            : "#EEF2F7",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {!image && <Icon size={26} color={accent} strokeWidth={1.75} />}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 14,
            fontWeight: 600,
            color: "#0B1F3A",
            fontFamily: POPPINS,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {listing.title}
        </div>
        <span
          style={{
            ...CATEGORY_PILL,
            padding: "2px 8px",
            marginTop: 3,
            marginBottom: 6,
            maxWidth: "100%",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {cat?.name || "Marketplace"}
        </span>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 8,
          }}
        >
          {priceIsBad ? (
            <NoPriceRow />
          ) : (
            <span style={{ fontSize: 14, fontWeight: 700, color: "#0B1F3A" }}>
              {price}
            </span>
          )}
          <button type="button" style={VIEW_BUTTON} onClick={() => onOpen(listing.id)}>
            View ›
          </button>
        </div>
      </div>
    </div>
  );
}



