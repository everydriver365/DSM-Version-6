import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import type { ComponentType } from "react";
import {
  ArrowLeft,
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
      <div
        style={{
          background: "#0F2044",
          color: "#FFFFFF",
          padding: "14px 16px",
          display: "flex",
          alignItems: "center",
          gap: 12,
          position: "sticky",
          top: 0,
          zIndex: 10,
        }}
      >
        <button
          type="button"
          onClick={() => navigate({ to: "/home" })}
          aria-label="Back"
          style={{
            background: "transparent",
            border: "none",
            color: "#FFFFFF",
            cursor: "pointer",
            padding: 0,
            display: "flex",
          }}
        >
          <ArrowLeft size={22} />
        </button>
        <div style={{ fontSize: 16, fontWeight: 500, fontFamily: POPPINS }}>DSM Marketplace</div>
      </div>

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
        <div
          style={{
            fontSize: 12,
            fontWeight: 500,
            color: "#64748B",
            letterSpacing: "0.04em",
            marginBottom: 10,
          }}
        >
          CATEGORIES
        </div>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 8,
            marginBottom: 22,
          }}
        >
          {categories.map((cat) => {
            const isActive = activeCategory === cat.slug;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveCategory(isActive ? null : cat.slug)}
                style={{
                  background: isActive ? "#185FA5" : "#FFFFFF",
                  border: isActive ? "none" : "1px solid rgba(15,32,68,0.10)",
                  borderRadius: 100,
                  padding: "8px 16px",
                  fontSize: 13,
                  fontWeight: 500,
                  color: isActive ? "#FFFFFF" : "#334155",
                  cursor: "pointer",
                  fontFamily: POPPINS,
                }}
              >
                {cat.name}
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
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 500, color: "#0F2044", fontFamily: POPPINS }}>
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
              color: "#185FA5",
              fontSize: 13,
              fontWeight: 500,
              fontFamily: POPPINS,
            }}
          >
            View all →
          </button>
        </div>

        {loading ? (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 10,
            }}
          >
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                style={{
                  height: 158,
                  background: "#F1F5F9",
                  borderRadius: 16,
                  border: "1px solid rgba(15,32,68,0.10)",
                }}
              />
            ))}
          </div>
        ) : topMarketplace.length === 0 ? (
          <div style={{ fontSize: 13, color: "#64748B" }}>No products yet.</div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 10,
            }}
          >
            {topMarketplace.map((l) => (
              <ProductCard key={l.id} listing={l} onOpen={openListing} />
            ))}
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
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 500, color: "#0F2044", fontFamily: POPPINS }}>
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
                  color: "#185FA5",
                  fontSize: 13,
                  fontWeight: 500,
                  fontFamily: POPPINS,
                }}
              >
                List free →
              </button>
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 10,
              }}
            >
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
            fontSize: 14,
            fontWeight: 500,
            color: "#0B1F3A",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            marginBottom: 4,
          }}
        >
          {listing.title}
        </div>
        <div
          style={{
            fontSize: 12,
            color: "#8792A2",
            marginBottom: "auto",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {subtitle}
        </div>

        <div
          style={{
            marginTop: 6,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 8,
          }}
        >
          <span style={{ fontSize: 12, fontWeight: 500, color: "#0B1F3A" }}>
            {price ?? "Price on request"}
          </span>
          <span
            style={{
              background: "#1877D6",
              color: "#FFFFFF",
              fontSize: 11,
              fontWeight: 500,
              padding: "6px 12px",
              borderRadius: 8,
            }}
          >
            View
          </span>
        </div>
      </div>
    </div>
  );
}

