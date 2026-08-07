import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import type { ComponentType } from "react";
import {
  Search as SearchIcon,
  Star,
  MapPin,
  Camera,
  Heart,
  GraduationCap,
  Wrench,
  ShieldCheck,
  Car,
  BookOpen,
  Briefcase,
  Megaphone,
  Package,
} from "lucide-react";
import { toast } from "sonner";
import InstructorTopBar from "@/components/dsm/InstructorTopBar";

const SUPABASE_URL = "https://bjpqxfrihwjcqprmoqfs.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJqcHF4ZnJpaHdqY3Fwcm1vcWZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE0NzQ4MjEsImV4cCI6MjA5NzA1MDgyMX0.HKlgx3dxP3uxX9wMRRUnfb0IPwaBpFcut_iUgT5XFeo";

const POPPINS = "'Poppins', system-ui, -apple-system, sans-serif";

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
  tracking: MapPin,
  hardware: Camera,
  dashcams: Camera,
  health: Heart,
  learning: GraduationCap,
  cpd: GraduationCap,
  courses: BookOpen,
  insurance: ShieldCheck,
  vehicles: Car,
  cars: Car,
  maintenance: Wrench,
  services: Briefcase,
  marketing: Megaphone,
  promotion: Star,
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
  if (!slug) return Package;
  return CATEGORY_ICONS[slug] ?? Package;
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
    <div style={{ minHeight: "100vh", background: "#FFFFFF", paddingBottom: 96, fontFamily: POPPINS }}>
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

      <div style={{ padding: "20px 16px 8px" }}>
        {/* Search bar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            background: "#FFFFFF",
            border: "1px solid rgba(15,32,68,0.10)",
            borderRadius: 14,
            padding: "11px 14px",
            marginBottom: 20,
          }}
        >
          <SearchIcon size={18} color="#64748B" strokeWidth={1.75} />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search products..."
            style={{
              border: "none",
              outline: "none",
              flex: 1,
              fontSize: 14,
              color: "#0F2044",
              background: "transparent",
              fontFamily: POPPINS,
            }}
          />
        </div>

        {/* Categories */}
        <style>{`.mkt-cat-row::-webkit-scrollbar{display:none}`}</style>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
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
            WebkitOverflowScrolling: "touch",
            scrollbarWidth: "none",
            marginBottom: 22,
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
                  background: isActive ? "#0B1F3A" : "#FFFFFF",
                  border: isActive ? "1px solid #0B1F3A" : "1px solid #E3E8F0",
                  borderRadius: 100,
                  padding: "8px 16px",
                  fontSize: 13,
                  fontWeight: 500,
                  color: isActive ? "#FFFFFF" : "#5B6472",
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
            marginBottom: 14,
          }}
        >
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "#0B1F3A", fontFamily: POPPINS, letterSpacing: "-0.01em" }}>
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
              fontSize: 15,
              fontWeight: 600,
              fontFamily: POPPINS,
            }}
          >
            View all →
          </button>
        </div>

        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                style={{
                  height: 116,
                  background: "#F1F5F9",
                  borderRadius: 14,
                  border: "1px solid #E3E8F0",
                }}
              />
            ))}
          </div>
        ) : topMarketplace.length === 0 ? (
          <div style={{ fontSize: 13, color: "#64748B" }}>No products yet.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
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
                margin: "28px 0 14px",
              }}
            >
              <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "#0B1F3A", fontFamily: POPPINS, letterSpacing: "-0.01em" }}>
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
                  fontSize: 15,
                  fontWeight: 600,
                  fontFamily: POPPINS,
                }}
              >
                List free →
              </button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>

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

function FeaturedCard({
  listing,
  onOpen,
}: {
  listing: Listing;
  onOpen: (id: string) => void;
}) {
  const cat = listing.marketplace_categories;
  const price = listing.price_display?.trim() || null;
  const priceIsBad = price && !/\d/.test(price);
  const priceText = priceIsBad ? "No price set" : price ?? "Price on request";
  const heroImage = listing.image_urls?.[0] ?? null;
  const headerBackground = heroImage
    ? `url(${heroImage}) center/cover no-repeat`
    : "linear-gradient(135deg,#16305A,#0B1F3A)";

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
        borderRadius: 18,
        border: "1px solid #E3E8F0",
        overflow: "hidden",
        background: "#fff",
        cursor: "pointer",
        userSelect: "none",
        fontFamily: POPPINS,
      }}
    >
      <div
        style={{
          height: 210,
          background: headerBackground,
          position: "relative",
          padding: "12px 14px",
        }}
      >
        <span
          style={{
            background: "rgba(255,255,255,0.16)",
            backdropFilter: "blur(4px)",
            color: "#fff",
            fontSize: 11,
            fontWeight: 700,
            padding: "6px 14px",
            borderRadius: 20,
            textTransform: "uppercase",
            letterSpacing: "0.04em",
          }}
        >
          Featured
        </span>
      </div>
      <div style={{ padding: "14px 16px 16px" }}>
        <div
          style={{
            fontSize: 20,
            fontWeight: 700,
            color: "#0B1F3A",
            marginBottom: 10,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {listing.title}
        </div>
        <span
          style={{
            display: "inline-flex",
            fontSize: 13,
            fontWeight: 600,
            color: "#1877D6",
            background: "#E6F1FB",
            padding: "6px 12px",
            borderRadius: 10,
            marginBottom: 16,
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
          <span
            style={
              priceIsBad
                ? { fontSize: 15, fontWeight: 600, color: "#CC2229" }
                : { fontSize: 15, fontWeight: 600, color: "#0B1F3A" }
            }
          >
            {priceText}
          </span>
          <span
            style={{
              background: "#1877D6",
              color: "#FFFFFF",
              fontSize: 15,
              fontWeight: 600,
              padding: "10px 18px",
              borderRadius: 10,
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            View ›
          </span>
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
  const subtitle =
    listing.marketplace_suppliers?.name || cat?.name || "Marketplace";
  const priceIsBad = price && !/\d/.test(price);
  const priceText = priceIsBad ? "No price set" : price ?? "Price on request";

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
        background: "#FFFFFF",
        border: "1px solid #E3E8F0",
        borderRadius: 14,
        padding: 12,
        display: "flex",
        flexDirection: "row",
        gap: 12,
        cursor: "pointer",
        userSelect: "none",
        fontFamily: POPPINS,
      }}
    >
      <div
        style={{
          width: 90,
          height: 90,
          flexShrink: 0,
          borderRadius: 10,
          background: image ? `#F1F5F9 url(${image}) center/cover no-repeat` : `${accent}1F`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {!image && <Icon size={28} color={accent} strokeWidth={1.75} />}
      </div>

      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        <div
          style={{
            fontSize: 16,
            fontWeight: 600,
            color: "#0B1F3A",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            marginBottom: 4,
          }}
        >
          {listing.title}
        </div>
        <span
          style={{
            display: "inline-flex",
            width: "fit-content",
            fontSize: 12,
            fontWeight: 600,
            letterSpacing: "0.01em",
            color: accent,
            background: `${accent}1F`,
            padding: "5px 11px",
            borderRadius: 10,
            marginBottom: "auto",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {subtitle}
        </span>

        <div
          style={{
            marginTop: 6,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 8,
          }}
        >
          <span
            style={
              priceIsBad
                ? { fontSize: 15, fontWeight: 600, color: "#CC2229" }
                : { fontSize: 15, fontWeight: 600, color: "#0B1F3A" }
            }
          >
            {priceText}
          </span>
          <span
            style={{
              background: "#1877D6",
              color: "#FFFFFF",
              fontSize: 15,
              fontWeight: 600,
              padding: "10px 18px",
              borderRadius: 10,
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            View ›
          </span>
        </div>
      </div>
    </div>
  );
}


