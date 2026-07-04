import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import type { ComponentType } from "react";
import {
  ArrowLeft,
  Search as SearchIcon,
  Star,
  Tag,
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
  X,
  CheckCircle2,
} from "lucide-react";

const SUPABASE_URL = "https://bjpqxfrihwjcqprmoqfs.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJqcHF4ZnJpaHdqY3Fwcm1vcWZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE0NzQ4MjEsImV4cCI6MjA5NzA1MDgyMX0.HKlgx3dxP3uxX9wMRRUnfb0IPwaBpFcut_iUgT5XFeo";

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
  image_url: string | null;
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

function iconFor(slug?: string | null): IconCmp {
  if (!slug) return Package;
  return CATEGORY_ICONS[slug] ?? Package;
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

  const activeCategoryName = useMemo(
    () => categories.find((c) => c.slug === activeCategory)?.name ?? null,
    [activeCategory, categories],
  );

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

  const openListing = (id: string) =>
    navigate({ to: "/marketplace/$listingId" as never, params: { listingId: id } as never });

  return (
    <div style={{ minHeight: "100vh", background: "#FFFFFF", paddingBottom: 96 }}>
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
        <div style={{ fontSize: 16, fontWeight: 700 }}>DSM Marketplace</div>
      </div>

      {/* Hero */}
      <div
        style={{
          background: "#F7FAFC",
          padding: "20px 16px",
          borderBottom: "0.5px solid #E2E6ED",
        }}
      >
        <h2
          style={{
            margin: 0,
            fontSize: 18,
            fontWeight: 700,
            color: "#0F2044",
          }}
        >
          DSM Marketplace
        </h2>
        <p
          style={{
            margin: "4px 0 12px",
            fontSize: 13,
            color: "#6B7280",
          }}
        >
          Products and services for driving instructors — all in one place.
        </p>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            background: "#FFFFFF",
            border: "0.5px solid #E2E6ED",
            borderRadius: 10,
            padding: "10px 14px",
          }}
        >
          <SearchIcon size={16} color="#9CA3AF" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search listings…"
            style={{
              border: "none",
              outline: "none",
              flex: 1,
              fontSize: 14,
              color: "#0F2044",
              background: "transparent",
            }}
          />
        </div>

        <button
          type="button"
          onClick={() => navigate({ to: "/marketplace/list" as never })}
          style={{
            marginTop: 8,
            background: "none",
            border: "none",
            padding: 0,
            color: "#1A52A0",
            fontSize: 14,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          List your product or service →
        </button>
      </div>

      {/* Categories */}
      <div style={{ padding: 16 }}>
        <div
          style={{
            fontSize: 14,
            fontWeight: 700,
            color: "#0F2044",
            marginBottom: 12,
          }}
        >
          Browse by category
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 8,
          }}
        >
          {categories.map((cat) => {
            const Icon = iconFor(cat.slug);
            const isActive = activeCategory === cat.slug;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() =>
                  setActiveCategory(isActive ? null : cat.slug)
                }
                style={{
                  background: isActive ? "#0F2044" : "#FFFFFF",
                  border: "0.5px solid #E2E6ED",
                  borderRadius: 12,
                  padding: "12px 8px",
                  textAlign: "center",
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <Icon size={20} color={isActive ? "#FFFFFF" : "#0F2044"} />
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: isActive ? "#FFFFFF" : "#0F2044",
                    lineHeight: 1.2,
                  }}
                >
                  {cat.name}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Featured */}
      {featured.length > 0 && (
        <div style={{ padding: "4px 16px 0" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              marginBottom: 12,
            }}
          >
            <Star size={16} color="#D97706" fill="#D97706" />
            <span
              style={{ fontSize: 14, fontWeight: 700, color: "#0F2044" }}
            >
              Featured
            </span>
          </div>
          <div
            style={{
              display: "flex",
              gap: 12,
              overflowX: "auto",
              scrollSnapType: "x mandatory",
              paddingBottom: 8,
              scrollbarWidth: "none",
            }}
          >
            {featured.map((l) => (
              <FeaturedCard key={l.id} listing={l} onOpen={openListing} />
            ))}
          </div>
        </div>
      )}

      {/* All listings */}
      <div style={{ padding: "16px", marginTop: 8 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 12,
          }}
        >
          <div style={{ fontSize: 14, fontWeight: 700, color: "#0F2044" }}>
            All listings
          </div>
          <div style={{ fontSize: 12, color: "#6B7280" }}>
            {filteredAll.length} {filteredAll.length === 1 ? "listing" : "listings"}
          </div>
        </div>

        {activeCategory && (
          <div style={{ marginBottom: 12 }}>
            <button
              type="button"
              onClick={() => setActiveCategory(null)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                background: "#EEF2F7",
                border: "none",
                borderRadius: 999,
                padding: "6px 10px",
                fontSize: 12,
                color: "#0F2044",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Showing: {activeCategoryName}
              <X size={12} />
            </button>
          </div>
        )}

        {loading ? (
          <div style={{ fontSize: 13, color: "#6B7280" }}>Loading…</div>
        ) : filteredAll.length === 0 ? (
          <div
            style={{
              border: "0.5px dashed #E2E6ED",
              borderRadius: 12,
              padding: 24,
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: 13, color: "#6B7280", marginBottom: 6 }}>
              No listings yet in this category
            </div>
            <button
              type="button"
              onClick={() => navigate({ to: "/marketplace/list" as never })}
              style={{
                background: "none",
                border: "none",
                color: "#1A52A0",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Be the first to list →
            </button>
          </div>
        ) : (
          filteredAll.map((l) => (
            <ListingRow key={l.id} listing={l} onOpen={openListing} />
          ))
        )}
      </div>

      {/* For sale by instructors */}
      <div
        style={{
          background: "#FFFBEB",
          borderTop: "0.5px solid #FDE68A",
          padding: 16,
          marginTop: 8,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            marginBottom: 4,
          }}
        >
          <Tag size={16} color="#D97706" />
          <span style={{ fontSize: 14, fontWeight: 700, color: "#0F2044" }}>
            For sale by instructors
          </span>
        </div>
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
            color: "#1A52A0",
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
            marginBottom: 12,
          }}
        >
          Got something to sell? List it free →
        </button>

        {forSale.length === 0 ? (
          <div style={{ fontSize: 12, color: "#6B7280" }}>
            No instructor listings yet.
          </div>
        ) : (
          forSale.map((l) => (
            <ListingRow key={l.id} listing={l} onOpen={openListing} />
          ))
        )}
      </div>
    </div>
  );
}

function VerifiedBadge() {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 3,
        color: "#059669",
        fontSize: 11,
        fontWeight: 600,
      }}
    >
      <CheckCircle2 size={11} />
      Verified
    </span>
  );
}

function CategoryBadge({ name }: { name: string }) {
  return (
    <span
      style={{
        display: "inline-block",
        background: "#EEF2F7",
        color: "#0F2044",
        fontSize: 10,
        fontWeight: 600,
        padding: "2px 8px",
        borderRadius: 999,
      }}
    >
      {name}
    </span>
  );
}

function FeaturedCard({
  listing,
  onOpen,
}: {
  listing: Listing;
  onOpen: (id: string) => void;
}) {
  const supplier = listing.marketplace_suppliers;
  const cat = listing.marketplace_categories;
  const Icon = iconFor(cat?.slug);
  return (
    <div
      style={{
        width: 240,
        flexShrink: 0,
        scrollSnapAlign: "start",
      }}
    >
      <div
        style={{
          height: 120,
          borderRadius: "12px 12px 0 0",
          background: listing.image_url
            ? `#F3F8FF url(${listing.image_url}) center/cover`
            : "linear-gradient(135deg,#0F2044,#1A52A0)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {!listing.image_url && <Icon size={40} color="#FFFFFF" />}
      </div>
      <div
        style={{
          background: "#FFFFFF",
          border: "0.5px solid #E2E6ED",
          borderTop: "none",
          borderRadius: "0 0 12px 12px",
          padding: 12,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            fontSize: 11,
            color: "#6B7280",
            marginBottom: 4,
          }}
        >
          <span
            style={{
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {supplier?.name ?? "—"}
          </span>
          {supplier?.is_verified && <VerifiedBadge />}
        </div>
        <div
          style={{
            fontSize: 14,
            fontWeight: 700,
            color: "#0F2044",
            marginBottom: 4,
            lineHeight: 1.3,
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {listing.title}
        </div>
        <div
          style={{
            fontSize: 12,
            color: "#6B7280",
            marginBottom: 8,
          }}
        >
          {listing.price_display ?? "—"}
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 8,
          }}
        >
          {cat && <CategoryBadge name={cat.name} />}
          <button
            type="button"
            onClick={() => onOpen(listing.id)}
            style={{
              background: "#0F2044",
              color: "#FFFFFF",
              border: "none",
              fontSize: 12,
              fontWeight: 600,
              padding: "6px 12px",
              borderRadius: 8,
              cursor: "pointer",
            }}
          >
            View →
          </button>
        </div>
      </div>
    </div>
  );
}

function ListingRow({
  listing,
  onOpen,
}: {
  listing: Listing;
  onOpen: (id: string) => void;
}) {
  const supplier = listing.marketplace_suppliers;
  const cat = listing.marketplace_categories;
  const Icon = iconFor(cat?.slug);
  return (
    <div
      onClick={() => onOpen(listing.id)}
      style={{
        position: "relative",
        background: "#FFFFFF",
        border: "0.5px solid #E2E6ED",
        borderRadius: 12,
        padding: 16,
        marginBottom: 8,
        display: "flex",
        gap: 12,
        cursor: "pointer",
      }}
    >
      <div
        style={{
          width: 80,
          height: 80,
          borderRadius: 8,
          flexShrink: 0,
          background: listing.image_url
            ? `#F3F8FF url(${listing.image_url}) center/cover`
            : "linear-gradient(135deg,#0F2044,#1A52A0)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {!listing.image_url && <Icon size={28} color="#FFFFFF" />}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 14,
            fontWeight: 700,
            color: "#0F2044",
            lineHeight: 1.3,
            paddingRight: listing.is_featured ? 60 : 0,
          }}
        >
          {listing.title}
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            fontSize: 12,
            color: "#6B7280",
            marginTop: 2,
          }}
        >
          <span
            style={{
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              maxWidth: 160,
            }}
          >
            {supplier?.name ?? "—"}
          </span>
          {supplier?.is_verified && <VerifiedBadge />}
        </div>
        {listing.description && (
          <div
            style={{
              fontSize: 12,
              color: "#6B7280",
              marginTop: 4,
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {listing.description}
          </div>
        )}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 8,
            marginTop: 8,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              minWidth: 0,
            }}
          >
            <span
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: "#0F2044",
              }}
            >
              {listing.price_display ?? "—"}
            </span>
            {cat && <CategoryBadge name={cat.name} />}
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpen(listing.id);
            }}
            style={{
              background: "#0F2044",
              color: "#FFFFFF",
              border: "none",
              fontSize: 12,
              fontWeight: 600,
              padding: "6px 10px",
              borderRadius: 8,
              cursor: "pointer",
              flexShrink: 0,
            }}
          >
            View →
          </button>
        </div>
      </div>

      {listing.is_featured && (
        <span
          style={{
            position: "absolute",
            top: 8,
            right: 8,
            background: "#D97706",
            color: "#FFFFFF",
            fontSize: 9,
            fontWeight: 700,
            padding: "2px 6px",
            borderRadius: 4,
            letterSpacing: "0.04em",
          }}
        >
          FEATURED
        </span>
      )}
    </div>
  );
}
