import { useGoBack } from "@/hooks/useGoBack";
import { PageLoader } from "@/components/dsm/LoadingSpinner";
import { SwipeableDetailShell } from "@/components/dsm/SwipeableDetailShell";

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { IconArrowLeft, IconBook, IconBriefcase, IconCamera, IconCar, IconCheck, IconChevronLeft, IconChevronRight, IconCircleCheck, IconExternalLink, IconHeart, IconMapPin, IconPackage, IconPlayerPlayFilled, IconSchool, IconShieldCheck, IconSpeakerphone, IconStar, IconTag, IconTool, IconX } from "@tabler/icons-react";
import { supabase } from "@/lib/supabaseClient";
import {
  COMPARISON_COLS,
  COMPARISON_ROWS,
  TIERS,
  TIER_NAMES,
  TIER_ORDER,
  checkDomainAvailability,
  createSubscriptionPaymentLink,
  type DomainCheck,
  type PaidTierId,
  type TierId,
} from "@/lib/websiteUpgrade";

const WEBSITE_LISTING_ID = "8b150e48-fd7f-429e-a090-b28bc7e76057";


const SUPABASE_URL = "https://bjpqxfrihwjcqprmoqfs.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJqcHF4ZnJpaHdqY3Fwcm1vcWZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE0NzQ4MjEsImV4cCI6MjA5NzA1MDgyMX0.HKlgx3dxP3uxX9wMRRUnfb0IPwaBpFcut_iUgT5XFeo";

export const Route = createFileRoute("/marketplace_/$listingId")({
  head: () => ({
    meta: [
      { title: "Marketplace listing — Driving School Manager" },
      {
        name: "description",
        content:
          "Supplier details, pricing and instructor offers from the Driving School Manager marketplace.",
      },
      { property: "og:title", content: "Marketplace listing — Driving School Manager" },
      {
        property: "og:description",
        content:
          "Supplier details, pricing and instructor offers from the Driving School Manager marketplace.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  validateSearch: (search: Record<string, unknown>): { from?: "discover" } =>
    search.from === "discover" ? { from: "discover" } : {},
  component: ListingDetailPage,
});


interface Supplier {
  name: string;
  logo_url: string | null;
  website_url: string | null;
  email: string | null;
  phone: string | null;
  is_verified: boolean;
}

interface Listing {
  id: string;
  title: string;
  description: string | null;
  price_display: string | null;
  price_amount: number | null;
  price_type: string | null;
  image_urls: string[] | null;
  image_url: string | null;
  gallery_urls: string[] | null;
  bullet_points: string[] | null;
  links: { label: string; url: string }[] | null;
  video_url: string | null;
  video_embed_url: string | null;
  is_featured: boolean;
  is_active: boolean;
  listing_type: string | null;
  category_id: string | null;
  supplier_id: string | null;
  instructor_id: string | null;
  location: string | null;
  condition: string | null;
  tags: string[] | null;
  contact_type: string | null;
  contact_url: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  created_at: string;
  marketplace_suppliers: Supplier | null;
  marketplace_categories: { name: string; slug: string } | null;
}

/**
 * Derives the hero status badge from the listing's own status fields.
 * `is_active` is the sold/available flag; `listing_type` distinguishes
 * wanted ads, services, rentals and jobs from straight for-sale items.
 */
const STATUS_LABELS: Record<string, { label: string; colour: string }> = {
  wanted: { label: "Wanted", colour: "#1877D6" },
  service: { label: "Service", colour: "#1877D6" },
  job: { label: "Job", colour: "#7B4FD6" },
  rental: { label: "To Rent", colour: "#E08A00" },
  hire: { label: "To Hire", colour: "#E08A00" },
};

function listingStatusBadge(
  listing: Pick<Listing, "is_active" | "listing_type"> | null | undefined,
): { label: string; colour: string } {
  if (!listing) return { label: "For Sale", colour: "#1A9B5C" };
  if (!listing.is_active) return { label: "Sold", colour: "#6B7686" };
  const key = (listing.listing_type ?? "").toLowerCase();
  return STATUS_LABELS[key] ?? { label: "For Sale", colour: "#1A9B5C" };
}


const CATEGORY_ICONS: Record<string, React.ComponentType<{ size?: number; color?: string }>> = {
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

function iconFor(slug?: string | null) {
  if (!slug) return IconPackage;
  return CATEGORY_ICONS[slug] ?? IconPackage;
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

function ListingDetailPage() {
  const { listingId } = Route.useParams();
  const { from } = Route.useSearch();
  const navigate = useNavigate();
  const goBack = useGoBack();


  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);
  const [similar, setSimilar] = useState<Listing[]>([]);
  const [sellerListings, setSellerListings] = useState<Listing[]>([]);
  const [enquiryOpen, setEnquiryOpen] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    void supabase.auth.getUser().then(({ data }) => {
      if (!cancelled) setCurrentUserId(data.user?.id ?? null);
    });
    return () => {
      cancelled = true;
    };
  }, []);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const rows = await sbGet<Listing[]>(
          `marketplace_listings?id=eq.${listingId}&is_active=eq.true&deleted_at=is.null&select=*,gallery_urls,bullet_points,links,video_url,video_embed_url,marketplace_suppliers(name,logo_url,website_url,email,phone,is_verified),marketplace_categories(name,slug)`,
        );
        if (cancelled) return;
        const found = rows[0] ?? null;
        setListing(found);
        if (found?.category_id) {
          const sim = await sbGet<Listing[]>(
            `marketplace_listings?category_id=eq.${found.category_id}&id=neq.${listingId}&is_active=eq.true&deleted_at=is.null&select=*,marketplace_suppliers(name,logo_url,website_url,email,phone,is_verified),marketplace_categories(name,slug)&limit=3`,
          );
          if (!cancelled) setSimilar(sim);
        }
        // Other active listings from the same seller (supplier or instructor).
        const sellerFilter = found?.supplier_id
          ? `supplier_id=eq.${found.supplier_id}`
          : found?.instructor_id
            ? `instructor_id=eq.${found.instructor_id}`
            : null;
        if (sellerFilter) {
          const mine = await sbGet<Listing[]>(
            `marketplace_listings?${sellerFilter}&id=neq.${listingId}&is_active=eq.true&deleted_at=is.null&select=*,marketplace_suppliers(name,logo_url,website_url,email,phone,is_verified),marketplace_categories(name,slug)&limit=10`,
          );
          if (!cancelled) setSellerListings(mine);
        }
      } catch (err) {
        console.error("[listing] load error", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [listingId]);

  const photos = useMemo(() => {
    const list = (listing?.image_urls ?? []).filter(Boolean) as string[];
    if (list.length > 0) return list;
    return listing?.image_url ? [listing.image_url] : [];
  }, [listing]);

  // The set the user can swipe through: this listing plus related ones
  // (same seller first, then same category), de-duplicated.
  const swipeSet = useMemo<Listing[]>(() => {
    if (!listing) return [];
    const seen = new Set([listing.id]);
    const rest: Listing[] = [];
    for (const l of [...sellerListings, ...similar]) {
      if (seen.has(l.id)) continue;
      seen.add(l.id);
      rest.push(l);
    }
    return [listing, ...rest];
  }, [listing, sellerListings, similar]);
  const swipeIndex = 0;


  const cat = listing?.marketplace_categories;
  const Icon = iconFor(cat?.slug);
  const supplier = listing?.marketplace_suppliers;
  // A seller profile page only exists for supplier-backed listings.
  const hasSellerProfile = Boolean(listing?.supplier_id && supplier);
  const statusBadge = listingStatusBadge(listing);


  const CARD: React.CSSProperties = {
    background: "#fff",
    borderRadius: 16,
    border: "1px solid #E4E8EF",
    padding: 16,
    boxShadow: "0 1px 3px rgba(11,31,58,0.06)",
    fontFamily: "Poppins, sans-serif",
  };
  const LABEL: React.CSSProperties = {
    color: "#9CA3AF",
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    margin: "0 0 10px",
    fontFamily: "Poppins, sans-serif",
  };
  const SECTION_HEADER: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0 0 0 0",
    marginBottom: 10,
  };
  const SECTION_TITLE: React.CSSProperties = {
    fontSize: 15,
    fontWeight: 700,
    color: "#0B1F3A",
    fontFamily: "Poppins, sans-serif",
  };
  const SECTION_LINK: React.CSSProperties = {
    fontSize: 12,
    fontWeight: 600,
    color: "#1877D6",
    fontFamily: "Poppins, sans-serif",
    background: "none",
    border: "none",
    cursor: "pointer",
    padding: 0,
  };

  return (
    <div style={{ minHeight: "100vh", background: "#F5F6F8", paddingBottom: 96 }}>
      {/* Header */}
      <div
        style={{
          background: "#0B1F3A",
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
          onClick={() => goBack('/marketplace')}
          aria-label="Back"
          style={{
            width: 36,
            height: 36,
            borderRadius: 999,
            background: "rgba(255,255,255,0.12)",
            border: "none",
            color: "#FFFFFF",
            cursor: "pointer",
            padding: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <IconArrowLeft stroke={1.8} size={19} />
        </button>
        <div
          style={{
            fontSize: 18,
            fontWeight: 700,
            color: "#fff",
            fontFamily: "Poppins, sans-serif",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {listing?.title ?? "Listing"}
        </div>
      </div>

      {loading ? (
        <PageLoader />
      ) : !listing ? (
        <div style={{ padding: 40, textAlign: "center" }}>
          <div style={{ color: "#374151", fontSize: 15, marginBottom: 12 }}>
            Listing not found
          </div>
          <button
            type="button"
            onClick={() => goBack('/marketplace')}
            style={{
              background: "none",
              border: "none",
              color: "#1877D6",
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Back to marketplace
          </button>
        </div>
      ) : (
          <SwipeableDetailShell
            items={swipeSet}
            index={swipeIndex}
            onIndexChange={(i) => {
              const next = swipeSet[i];
              if (!next || next.id === listingId) return;
              navigate({
                to: "/marketplace/$listingId",
                params: { listingId: next.id },
                search: from === "discover" ? { from: "discover" } : {},
              });
            }}
            getKey={(item) => item.id}
            variant="article"
            hintKey="dsm_swipe_listing_hint_seen"
            renderItem={(item, isActive) =>
              !isActive ? (
                <ListingPeek listing={item} />
              ) : (
        <>

          {/* Hero photo gallery */}
          <div style={{ position: "relative", width: "100%", background: "#0B1F3A" }}>
            {listingId === WEBSITE_LISTING_ID ? (
              <div
                style={{
                  width: "100%",
                  aspectRatio: "1 / 0.62",
                  padding: "40px 0 46px",
                  boxSizing: "border-box",
                  background: "linear-gradient(135deg,#1B4E8F 0%,#123A6E 45%,#0B1F3A 100%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 0,
                }}
              >
                {/* Phone mock */}
                <div
                  style={{
                    width: "23%",
                    aspectRatio: "1 / 1.95",
                    background: "#FFFFFF",
                    border: "3px solid #0B1F3A",
                    borderRadius: 14,
                    overflow: "hidden",
                    marginRight: -10,
                    zIndex: 1,
                    boxShadow: "0 10px 24px rgba(0,0,0,0.28)",
                  }}
                >
                  <div style={{ height: 18, background: "#0B1F3A", display: "flex", alignItems: "center", gap: 3, padding: "0 6px" }}>
                    {[0, 1, 2].map((i) => (
                      <span key={i} style={{ width: 4, height: 4, borderRadius: 999, background: "rgba(255,255,255,0.55)" }} />
                    ))}
                  </div>
                  <div style={{ padding: 8, display: "flex", flexDirection: "column", gap: 5 }}>
                    <span style={{ height: 6, borderRadius: 3, background: "#E7EDF5" }} />
                    <span style={{ height: 6, width: "70%", borderRadius: 3, background: "#E7EDF5" }} />
                    <span style={{ height: 6, width: "45%", borderRadius: 3, background: "#E7EDF5" }} />
                  </div>
                </div>
                {/* Browser mock */}
                <div
                  style={{
                    width: "40%",
                    aspectRatio: "1 / 0.68",
                    background: "#FFFFFF",
                    border: "3px solid #0B1F3A",
                    borderRadius: 10,
                    overflow: "hidden",
                    marginTop: 22,
                    boxShadow: "0 12px 28px rgba(0,0,0,0.3)",
                  }}
                >
                  <div style={{ height: 20, background: "#0B1F3A", display: "flex", alignItems: "center", gap: 4, padding: "0 8px" }}>
                    {[0, 1, 2].map((i) => (
                      <span key={i} style={{ width: 5, height: 5, borderRadius: 999, background: "rgba(255,255,255,0.55)" }} />
                    ))}
                  </div>
                  <div style={{ padding: 10, display: "flex", flexDirection: "column", gap: 6 }}>
                    <span style={{ height: 7, borderRadius: 3, background: "#E7EDF5" }} />
                    <span style={{ height: 7, width: "80%", borderRadius: 3, background: "#E7EDF5" }} />
                    <span style={{ height: 7, width: "55%", borderRadius: 3, background: "#E7EDF5" }} />
                  </div>
                </div>
              </div>
            ) : photos.length > 1 ? (

              <div
                onScroll={(e) => {
                  const el = e.currentTarget;
                  const i = Math.round(el.scrollLeft / Math.max(el.clientWidth, 1));
                  if (i !== photoIndex) setPhotoIndex(i);
                }}
                style={{
                  display: "flex",
                  overflowX: "auto",
                  scrollSnapType: "x mandatory",
                  scrollbarWidth: "none",
                }}
              >
                {photos.map((p, i) => (
                  <div
                    key={`${p}-${i}`}
                    style={{
                      flex: "0 0 100%",
                      width: "100%",
                      aspectRatio: "1 / 0.9",
                      scrollSnapAlign: "center",
                      background: `#E7EDF5 url(${p}) center/cover`,
                    }}
                  />
                ))}
              </div>
            ) : (
              <div
                style={{
                  width: "100%",
                  aspectRatio: "1 / 0.9",
                  background: photos[0]
                    ? `#E7EDF5 url(${photos[0]}) center/cover`
                    : "#0B1F3A",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {!photos[0] && <Icon size={64} color="#FFFFFF" />}
              </div>
            )}

            {/* Status badge — derived from the listing's status fields */}
            <div
              style={{
                position: "absolute",
                top: 12,
                left: 12,
                background: "rgba(11,31,58,0.7)",
                backdropFilter: "blur(4px)",
                WebkitBackdropFilter: "blur(4px)",
                color: "#fff",
                fontSize: 11,
                fontWeight: 700,
                padding: "4px 10px",
                borderRadius: 20,
                fontFamily: "Poppins, sans-serif",
              }}
            >
              {statusBadge.label}
            </div>

            {/* Photo counter */}
            {photos.length > 1 && (
              <div
                style={{
                  position: "absolute",
                  top: 12,
                  right: 12,
                  background: "rgba(11,31,58,0.7)",
                  backdropFilter: "blur(4px)",
                  WebkitBackdropFilter: "blur(4px)",
                  color: "#fff",
                  fontSize: 11,
                  fontWeight: 700,
                  padding: "4px 10px",
                  borderRadius: 20,
                  fontFamily: "Poppins, sans-serif",
                }}
              >
                {photoIndex + 1} of {photos.length}
              </div>
            )}


            {/* Pagination dots */}
            {photos.length > 1 && (
              <div
                style={{
                  position: "absolute",
                  bottom: 12,
                  left: 0,
                  right: 0,
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  gap: 5,
                }}
              >
                {photos.map((p, i) => (
                  <span
                    key={`dot-${p}-${i}`}
                    style={{
                      width: i === photoIndex ? 16 : 6,
                      height: 6,
                      borderRadius: 999,
                      background: i === photoIndex ? "#0B1F3A" : "rgba(11,31,58,0.25)",
                      transition: "width .2s ease",
                    }}
                  />
                ))}
              </div>
            )}
          </div>

          <div
            style={{
              padding: "20px 16px 14px",
              display: "flex",
              flexDirection: "column",
              gap: 14,
              position: "relative",
              zIndex: 2,
              marginTop: -26,
              background: "#F5F6F8",
              borderRadius: "26px 26px 0 0",
            }}
          >
            {/* Title + price */}

            <div style={CARD}>
              <div
                style={{
                  color: "#0B1F3A",
                  fontSize: 18,
                  fontWeight: 800,
                  lineHeight: 1.3,
                  fontFamily: "Poppins, sans-serif",
                  marginBottom: 8,
                }}
              >
                {listing.title}
              </div>
              {(() => {
                const isWebsiteListing = listingId === WEBSITE_LISTING_ID;
                const raw = (listing.price_display ?? "").trim();
                const noPrice =
                  !isWebsiteListing && (!raw || raw.toUpperCase() === "POA");
                return (
                  <div>
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "baseline",
                        gap: 6,
                        color: noPrice ? "#9CA3AF" : "#0B1F3A",
                        fontSize: noPrice ? 16 : 24,
                        fontWeight: noPrice ? 500 : 800,
                        fontFamily: "Poppins, sans-serif",
                      }}
                    >
                      {isWebsiteListing ? (
                        <>
                          <span style={{ fontSize: 14, fontWeight: 600, color: "#6B7686" }}>
                            From
                    </span>
                    {noPrice &&
                      currentUserId &&
                      listing.instructor_id === currentUserId && (
                        <button
                          type="button"
                          onClick={() => navigate({ to: "/marketplace/edit" })}
                          style={{
                            marginLeft: 10,
                            background: "none",
                            border: "none",
                            padding: 0,
                            color: "#1877D6",
                            fontSize: 12,
                            fontWeight: 600,
                            cursor: "pointer",
                            fontFamily: "Poppins, sans-serif",
                          }}
                        >
                          Add price →
                        </button>
                      )}
                          £9.99
                          <span style={{ fontSize: 14, fontWeight: 600, color: "#6B7686" }}>
                            /mo
                          </span>
                        </>
                      ) : noPrice ? (
                        "No price set"
                      ) : (
                        raw
                      )}
                    </span>

                    {listing.condition && (
                      <div>
                        <span
                          style={{
                            display: "inline-block",
                            background: "#EFF6FF",
                            color: "#1877D6",
                            fontSize: 11,
                            fontWeight: 700,
                            padding: "4px 10px",
                            borderRadius: 20,
                            marginTop: 8,
                            whiteSpace: "nowrap",
                            textTransform: "capitalize",
                            fontFamily: "Poppins, sans-serif",
                          }}
                        >
                          {listing.condition}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })()}
              {listing.location && (
                <div
                  style={{
                    borderTop: "1px solid #E4E8EF",
                    paddingTop: 12,
                    marginTop: 12,
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    color: "#6B7686",
                    fontSize: 12,
                    fontFamily: "Poppins, sans-serif",
                  }}
                >
                  <IconMapPin stroke={1.8} size={12} color="#9CA3AF" />
                  {listing.location}
                </div>
              )}
            </div>

            {/* Seller */}
            <div
              onClick={
                hasSellerProfile
                  ? () =>
                      navigate({
                        to: "/marketplace/seller/$supplierId",
                        params: { supplierId: listing.supplier_id as string },
                      })
                  : undefined
              }
              role={hasSellerProfile ? "button" : undefined}
              tabIndex={hasSellerProfile ? 0 : undefined}
              style={{
                ...CARD,
                display: "flex",
                gap: 13,
                alignItems: "center",
                cursor: hasSellerProfile ? "pointer" : "default",
              }}
            >
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 999,
                  background: supplier?.logo_url
                    ? `#E7F1FC url(${supplier.logo_url}) center/cover`
                    : "#E7F1FC",
                  color: "#1877D6",
                  fontWeight: 800,
                  fontSize: 17,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                {!supplier?.logo_url && (supplier?.name?.charAt(0)?.toUpperCase() ?? "?")}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    color: "#0B1F3A",
                    fontSize: 15,
                    fontWeight: 800,
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <span
                    style={{
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {supplier?.name ?? "Listed by instructor"}
                  </span>
                  {supplier?.is_verified && (
                    <IconCircleCheck stroke={1.8} size={15} color="#1A9B5C" />
                  )}
                </div>
                {cat && (
                  <div style={{ color: "#8A8A8E", fontSize: 12, marginTop: 2 }}>
                    {cat.name}
                  </div>
                )}
              </div>
              {hasSellerProfile && (
                <IconChevronRight stroke={1.8} size={18} color="#B0B0B5" />
              )}
            </div>

            {/* Description */}
            {(() => {
              const isWebsite = listingId === WEBSITE_LISTING_ID;
              const body = isWebsite
                ? "Give pupils a professional, bookable website in minutes — built on your DSM profile, no design work needed.\n\nYour own multi-page site with your branding, lesson prices, availability and online booking. Add your own domain, keep everything in sync with DSM automatically, and upgrade any time."
                : listing.description;
              if (!body) return null;
              return (
                <div style={CARD}>
                  <div style={LABEL}>Description</div>
                  <div
                    style={{
                      color: "#6B7686",
                      fontSize: 14,
                      lineHeight: 1.6,
                      whiteSpace: "pre-wrap",
                      fontFamily: "Poppins, sans-serif",
                    }}
                  >
                    {body}
                  </div>
                </div>
              );
            })()}

            {/* Key points */}
            {listing.bullet_points && listing.bullet_points.length > 0 && (
              <div style={CARD}>
                <div style={LABEL}>Key points</div>
                <ul
                  style={{
                    listStyle: "none",
                    padding: 0,
                    margin: 0,
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                  }}
                >
                  {listing.bullet_points.map((bp, i) => (
                    <li
                      key={i}
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: 8,
                        color: "#6B7686",
                        fontSize: 14,
                        lineHeight: 1.5,
                        fontFamily: "Poppins, sans-serif",
                      }}
                    >
                      <IconCheck size={18} color="#1A9B5C" stroke={2.2} style={{ flexShrink: 0, marginTop: 1 }} />
                      <span>{bp}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Links */}
            {(() => {
              const links = listing.links ?? [];
              if (links.length === 0) return null;
              return (
                <div style={CARD}>
                  {links.map((link, i) => (
                    <a
                      key={i}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        padding: "13px 16px",
                        borderBottom: i < links.length - 1 ? "1px solid #E4E8EF" : "none",
                        textDecoration: "none",
                      }}
                    >
                      <IconExternalLink size={18} color="#1877D6" stroke={1.8} />
                      <span
                        style={{
                          flex: 1,
                          color: "#0B1F3A",
                          fontSize: 14,
                          fontWeight: 600,
                          fontFamily: "Poppins, sans-serif",
                        }}
                      >
                        {link.label}
                      </span>
                      <IconChevronRight size={18} color="#B0B0B5" stroke={1.8} />
                    </a>
                  ))}
                </div>
              );
            })()}

            {/* Gallery */}
            {(() => {
              const galleryPhotos = (listing.gallery_urls ?? []).slice(1);
              if (galleryPhotos.length === 0) return null;
              return (
                <div style={{ margin: "0 16px 16px" }}>
                  <div
                    style={{
                      color: "#9CA3AF",
                      fontSize: 11,
                      fontWeight: 600,
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      marginBottom: 8,
                      fontFamily: "Poppins, sans-serif",
                    }}
                  >
                    PHOTOS
                  </div>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(3, 1fr)",
                      gap: 4,
                      borderRadius: 16,
                      overflow: "hidden",
                      border: "1px solid #E4E8EF",
                    }}
                  >
                    {galleryPhotos.map((url, i) => (
                      <div
                        key={i}
                        onClick={() => setLightboxIndex(i)}
                        style={{
                          aspectRatio: "1",
                          overflow: "hidden",
                          cursor: "pointer",
                          background: `#E7EDF5 url(${url}) center/cover`,
                        }}
                      />
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* Video */}
            {(() => {
              if (!listing.video_embed_url && !listing.video_url) return null;
              return (
                <>
                  <div
                    style={{
                      color: "#9CA3AF",
                      fontSize: 11,
                      fontWeight: 600,
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      margin: "0 16px 8px",
                      fontFamily: "Poppins, sans-serif",
                    }}
                  >
                    SEE IT IN ACTION
                  </div>
                  <div
                    style={{
                      margin: "0 16px 16px",
                      borderRadius: 16,
                      overflow: "hidden",
                      border: "1px solid #E4E8EF",
                    }}
                  >
                    {listing.video_embed_url ? (
                      <div
                        dangerouslySetInnerHTML={{ __html: listing.video_embed_url }}
                        style={{ width: "100%", aspectRatio: "16 / 9", background: "#000" }}
                      />
                    ) : (
                      <video
                        src={listing.video_url ?? undefined}
                        controls
                        style={{
                          width: "100%",
                          aspectRatio: "16/9",
                          display: "block",
                          background: "#000",
                        }}
                      />
                    )}
                  </div>
                </>
              );
            })()}

            {/* Lightbox */}
            {lightboxIndex !== null && (
              <div
                onClick={() => setLightboxIndex(null)}
                style={{
                  position: "fixed",
                  inset: 0,
                  zIndex: 400,
                  background: "rgba(0,0,0,0.95)",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <button
                  type="button"
                  onClick={() => setLightboxIndex(null)}
                  aria-label="Close"
                  style={{
                    position: "absolute",
                    top: 16,
                    right: 16,
                    width: 40,
                    height: 40,
                    borderRadius: "50%",
                    background: "rgba(255,255,255,0.15)",
                    border: "none",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <IconX size={22} color="#FFFFFF" stroke={2} />
                </button>

                {(() => {
                  const galleryPhotos = (listing.gallery_urls ?? []).slice(1);
                  return (
                    <img
                      src={galleryPhotos[lightboxIndex]}
                      alt={`Photo ${lightboxIndex + 1} of ${galleryPhotos.length}`}
                      style={{ maxWidth: "100%", maxHeight: "80vh", objectFit: "contain" }}
                      onClick={(e) => e.stopPropagation()}
                    />
                  );
                })()}

                <div
                  style={{
                    position: "absolute",
                    bottom: 32,
                    color: "rgba(255,255,255,0.6)",
                    fontSize: 13,
                    fontFamily: "Poppins, sans-serif",
                  }}
                >
                  {(() => {
                    const galleryPhotos = (listing.gallery_urls ?? []).slice(1);
                    return `${lightboxIndex + 1} of ${galleryPhotos.length}`;
                  })()}
                </div>

                {(() => {
                  const galleryPhotos = (listing.gallery_urls ?? []).slice(1);
                  return lightboxIndex > 0 ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setLightboxIndex(lightboxIndex - 1);
                      }}
                      aria-label="Previous"
                      style={{
                        position: "absolute",
                        left: 16,
                        top: "50%",
                        transform: "translateY(-50%)",
                        width: 44,
                        height: 44,
                        borderRadius: "50%",
                        background: "rgba(255,255,255,0.15)",
                        border: "none",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <IconChevronLeft size={24} color="#FFFFFF" stroke={2} />
                    </button>
                  ) : null;
                })()}

                {(() => {
                  const galleryPhotos = (listing.gallery_urls ?? []).slice(1);
                  return lightboxIndex < galleryPhotos.length - 1 ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setLightboxIndex(lightboxIndex + 1);
                      }}
                      aria-label="Next"
                      style={{
                        position: "absolute",
                        right: 16,
                        top: "50%",
                        transform: "translateY(-50%)",
                        width: 44,
                        height: 44,
                        borderRadius: "50%",
                        background: "rgba(255,255,255,0.15)",
                        border: "none",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <IconChevronRight size={24} color="#FFFFFF" stroke={2} />
                    </button>
                  ) : null;
                })()}
              </div>
            )}

            {/* Enhanced upgrade sections — only for the DSM website listing */}
            {listingId === WEBSITE_LISTING_ID && <WebsiteUpgradeSections />}


            {/* Tags */}
            {listing.tags && listing.tags.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {listing.tags.map((t) => (
                  <span
                    key={t}
                    style={{
                      fontSize: 11.5,
                      fontWeight: 700,
                      color: "#6B7686",
                      background: "#EEF2F7",
                      padding: "5px 11px",
                      borderRadius: 20,
                    }}
                  >
                    #{t}
                  </span>
                ))}
              </div>
            )}

            {/* Get in touch */}
            <div style={CARD}>
              <div style={{ ...LABEL, marginBottom: 12 }}>Get in touch</div>
              <ContactActions
                listing={listing}
                onEnquire={() => setEnquiryOpen(true)}
              />
            </div>
          </div>

          {/* Similar in category */}
          {similar.length > 0 && (
            <div style={{ padding: "0 16px 16px" }}>
              <div style={SECTION_HEADER}>
                <div style={SECTION_TITLE}>More in this category</div>
                <button
                  type="button"
                  style={SECTION_LINK}
                  onClick={() => navigate({ to: "/marketplace" })}
                >
                  See all →
                </button>
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                  gap: 12,
                  paddingBottom: 6,
                }}
              >
                {similar.map((s) => (
                  <MiniListingCard
                    key={s.id}
                    listing={s}
                    onOpen={(id) =>
                      navigate({
                        to: "/marketplace/$listingId",
                        params: { listingId: id },
                      })
                    }
                  />
                ))}
              </div>
            </div>
          )}

          {/* More from this seller — always the final section */}
          {sellerListings.length > 0 && (
            <div style={{ padding: "0 16px 160px" }}>
              <div style={SECTION_HEADER}>
                <div style={SECTION_TITLE}>More from this seller</div>
                {hasSellerProfile && (
                  <button
                    type="button"
                    style={SECTION_LINK}
                    onClick={() =>
                      navigate({
                        to: "/marketplace/seller/$supplierId",
                        params: { supplierId: listing.supplier_id as string },
                      })
                    }
                  >
                    See all →
                  </button>
                )}
              </div>
              <div
                style={{ display: "flex", flexDirection: "column" }}
              >
                {sellerListings.map((s) => (
                  <SellerListingRow
                    key={s.id}
                    listing={s}
                    onOpen={(id) =>
                      navigate({
                        to: "/marketplace/$listingId",
                        params: { listingId: id },
                      })
                    }
                  />
                ))}
              </div>
            </div>
          )}


          {enquiryOpen && (
            <EnquirySheet
              listing={listing}
              onClose={() => setEnquiryOpen(false)}
            />
          )}
        </>
              )
            }
          />
      )}

    </div>
  );
}


function ConditionBadge({ condition }: { condition: string }) {
  const map: Record<string, { bg: string; color: string }> = {
    new: { bg: "#D1FAE5", color: "#065F46" },
    used: { bg: "#FEF3C7", color: "#92400E" },
    refurbished: { bg: "#DBEAFE", color: "#1E40AF" },
  };
  const key = condition.toLowerCase();
  const style = map[key] ?? { bg: "#EEF2F7", color: "#0F2044" };
  return (
    <span
      style={{
        display: "inline-block",
        background: style.bg,
        color: style.color,
        fontSize: 11,
        fontWeight: 700,
        textTransform: "uppercase",
        letterSpacing: "0.04em",
        padding: "4px 10px",
        borderRadius: 999,
      }}
    >
      {condition}
    </span>
  );
}

function ContactActions({
  listing,
  onEnquire,
}: {
  listing: Listing;
  onEnquire: () => void;
}) {
  const type = listing.contact_type ?? "email";

  const primaryBtn = {
    background: "#1877D6",
    color: "#fff",
    border: "none",
    fontSize: 14,
    fontWeight: 700,
    padding: 13,
    borderRadius: 20,
    boxShadow: "0 3px 0 #0F52A8",
    cursor: "pointer",
    width: "100%",
    textAlign: "center" as const,
    textDecoration: "none",
    display: "block",
    fontFamily: "Poppins, sans-serif",
  };

  const secondaryBtn = {
    background: "#EFF6FF",
    color: "#1877D6",
    border: "1px solid #1877D6",
    fontSize: 14,
    fontWeight: 700,
    padding: 13,
    borderRadius: 20,
    boxShadow: "none",
    cursor: "pointer",
    width: "100%",
    textAlign: "center" as const,
    textDecoration: "none",
    display: "block",
    marginTop: 12,
    fontFamily: "Poppins, sans-serif",
  };


  if (type === "website") {
    const url =
      listing.contact_url ?? listing.marketplace_suppliers?.website_url ?? "#";
    return (
      <a href={url} target="_blank" rel="noopener noreferrer" style={primaryBtn}>
        Visit website →
      </a>
    );
  }

  if (type === "phone") {
    const phone =
      listing.contact_phone ?? listing.marketplace_suppliers?.phone ?? "";
    return (
      <>
        <a href={`tel:${phone}`} style={primaryBtn}>
          Call now →
        </a>
        <button type="button" onClick={onEnquire} style={secondaryBtn}>
          Send enquiry →
        </button>
      </>
    );
  }

  return (
    <button type="button" onClick={onEnquire} style={primaryBtn}>
      Send enquiry →
    </button>
  );
}

function EnquirySheet({
  listing,
  onClose,
}: {
  listing: Listing;
  onClose: () => void;
}) {
  const [message, setMessage] = useState(
    `Hi, I'm interested in ${listing.title}. Could you please send me more information?`,
  );
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!cancelled && data.user?.email) setEmail(data.user.email);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSend() {
    if (!message.trim() || !email.trim()) {
      toast.error("Please add a message and email");
      return;
    }
    setSending(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const instructorId = userData.user?.id ?? null;
      const { error } = await supabase.from("marketplace_enquiries").insert({
        listing_id: listing.id,
        instructor_id: instructorId,
        message: message.trim(),
        contact_email: email.trim(),
        contact_phone: phone.trim() || null,
      });
      if (error) throw error;

      // Fire-and-forget notifications; don't block success UX on failures.
      const SUPABASE_URL = "https://bjpqxfrihwjcqprmoqfs.supabase.co";
      const SUPABASE_ANON_KEY =
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJqcHF4ZnJpaHdqY3Fwcm1vcWZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE0NzQ4MjEsImV4cCI6MjA5NzA1MDgyMX0.HKlgx3dxP3uxX9wMRRUnfb0IPwaBpFcut_iUgT5XFeo";
      const contactEmail = email.trim();
      const contactPhone = phone.trim();
      const msgBody = message.trim();

      const tasks: Promise<unknown>[] = [];

      // 1. Instructor notification (in-app)
      if (listing.instructor_id) {
        tasks.push(
          Promise.resolve(supabase.from("instructor_notifications").insert({
            instructor_id: listing.instructor_id,
            title: "New marketplace enquiry 📬",
            body: `Someone enquired about your listing: '${listing.title}'`,
            type: "marketplace_enquiry",
            read: false,
            reference_id: listing.id,
            reference_type: "marketplace_listing",
          })),
        );
      }

      const callNotify = (payload: Record<string, string>) =>
        fetch(`${SUPABASE_URL}/functions/v1/send-contact-notification`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: SUPABASE_ANON_KEY,
            Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify(payload),
        });

      // 2. Supplier email (supplier listings)
      if (listing.supplier_id) {
        const supplierEmail =
          listing.marketplace_suppliers?.email || "info@everydriver.co.uk";
        tasks.push(
          callNotify({
            name: "DSM Marketplace",
            email: supplierEmail,
            subject: `New enquiry: ${listing.title}`,
            message: `New enquiry from ${contactEmail}:\n\n${msgBody}\n\nContact: ${contactEmail} ${contactPhone}`,
          }),
        );
      }

      // 3. Admin notification (always)
      tasks.push(
        callNotify({
          name: "DSM Marketplace",
          email: "info@everydriver.co.uk",
          subject: `New marketplace enquiry — ${listing.title}`,
          message: `Listing: ${listing.title} (${listing.id})\nType: ${
            listing.listing_type ?? "—"
          }\nFrom: ${contactEmail}${contactPhone ? ` / ${contactPhone}` : ""}\n\n${msgBody}`,
        }),
      );

      Promise.allSettled(tasks).then((results) => {
        results.forEach((r) => {
          if (r.status === "rejected") {
            console.error("[enquiry] notification failed", r.reason);
          }
        });
      });

      toast.success("Enquiry sent! They'll be in touch soon.");
      onClose();
    } catch (err) {
      console.error("[enquiry] send failed", err);
      toast.error("Could not send enquiry. Try again.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15,32,68,0.45)",
        zIndex: 50,
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#FFFFFF",
          width: "100%",
          maxWidth: 520,
          borderRadius: "16px 16px 0 0",
          padding: 20,
          maxHeight: "85vh",
          overflowY: "auto",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 12,
          }}
        >
          <div style={{ fontSize: 16, fontWeight: 700, color: "#0F2044" }}>
            Send enquiry
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "#6B7280",
              padding: 4,
              display: "flex",
            }}
          >
            <IconX stroke={1.5} size={20} />
          </button>
        </div>

        <label
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: "#374151",
            display: "block",
            marginBottom: 4,
          }}
        >
          Message
        </label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={4}
          style={{
            width: "100%",
            border: "0.5px solid #E2E6ED",
            borderRadius: 10,
            padding: 10,
            fontSize: 14,
            fontFamily: "inherit",
            marginBottom: 12,
            resize: "vertical",
            color: "#0F2044",
          }}
        />

        <label
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: "#374151",
            display: "block",
            marginBottom: 4,
          }}
        >
          Contact email
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{
            width: "100%",
            border: "0.5px solid #E2E6ED",
            borderRadius: 10,
            padding: 10,
            fontSize: 14,
            marginBottom: 12,
            color: "#0F2044",
          }}
        />

        <label
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: "#374151",
            display: "block",
            marginBottom: 4,
          }}
        >
          Contact phone (optional)
        </label>
        <input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          style={{
            width: "100%",
            border: "0.5px solid #E2E6ED",
            borderRadius: 10,
            padding: 10,
            fontSize: 14,
            marginBottom: 16,
            color: "#0F2044",
          }}
        />

        <button
          type="button"
          onClick={handleSend}
          disabled={sending}
          style={{
            width: "100%",
            background: "#1A52A0",
            color: "#FFFFFF",
            border: "none",
            fontSize: 14,
            fontWeight: 700,
            padding: "12px 16px",
            borderRadius: 10,
            cursor: sending ? "not-allowed" : "pointer",
            opacity: sending ? 0.7 : 1,
          }}
        >
          {sending ? "Sending…" : "Send enquiry →"}
        </button>
      </div>
    </div>
  );
}
/** DSM blue-tint category pill. */
function CategoryPill({ name }: { name: string }) {
  return (
    <span
      style={{
        display: "inline-block",
        fontFamily: "Poppins, sans-serif",
        fontSize: 10,
        fontWeight: 700,
        color: "#1877D6",
        background: "#EFF6FF",
        padding: "3px 10px",
        borderRadius: 20,
      }}
    >
      {name}
    </span>
  );
}

/**
 * Renders a listing price reliably. `price_display` is free text and is
 * sometimes just a unit ("Per month", "pcm") with no amount, so fall back to
 * building the label from price_amount + price_type, and to a neutral
 * "Price on request" when there genuinely is no amount.
 */
const PRICE_UNITS: Record<string, string> = {
  month: "/mo",
  monthly: "/mo",
  per_month: "/mo",
  pcm: "/mo",
  year: "/yr",
  yearly: "/yr",
  per_year: "/yr",
  annual: "/yr",
  week: "/wk",
  weekly: "/wk",
  day: "/day",
  daily: "/day",
  hour: "/hr",
  hourly: "/hr",
  per_hour: "/hr",
};

function formatListingPrice(
  listing: Pick<Listing, "price_display" | "price_amount" | "price_type">,
): { text: string; muted: boolean } {
  const amount = listing.price_amount;
  if (typeof amount === "number" && !Number.isNaN(amount)) {
    if (amount === 0) return { text: "Free", muted: false };
    const money =
      Number.isInteger(amount) ? `£${amount}` : `£${amount.toFixed(2)}`;
    const unit =
      PRICE_UNITS[(listing.price_type ?? "").toLowerCase().replace(/\s+/g, "_")] ?? "";
    return { text: `${money}${unit}`, muted: false };
  }
  const display = (listing.price_display ?? "").trim();
  // Only trust price_display when it actually contains a number.
  if (display && /\d/.test(display)) return { text: display, muted: false };
  return { text: "No price set", muted: true };
}

function SellerListingRow({
  listing,
  onOpen,
}: {
  listing: Listing;
  onOpen: (id: string) => void;
}) {
  const cat = listing.marketplace_categories;
  const Icon = iconFor(cat?.slug);
  const img =
    (listing.image_urls && listing.image_urls[0]) || listing.image_url || null;
  const price = formatListingPrice(listing);
  return (
    <div
      onClick={() => onOpen(listing.id)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        background: "#fff",
        border: "1px solid #E4E8EF",
        borderRadius: 16,
        boxShadow: "0 1px 3px rgba(11,31,58,0.06)",
        padding: 12,
        marginBottom: 10,
        fontFamily: "Poppins, sans-serif",
        cursor: "pointer",
      }}
    >
      <div
        style={{
          width: 72,
          height: 72,
          flexShrink: 0,
          borderRadius: 10,
          background: img
            ? `#EEF2F7 url(${img}) center/cover`
            : "#0B1F3A",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {!img && <Icon size={26} color="#FFFFFF" />}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            color: "#0B1F3A",
            fontSize: 13,
            fontWeight: 600,
            lineHeight: 1.25,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {listing.title}
        </div>
        {cat?.name && (
          <div style={{ marginTop: 3 }}>
            <CategoryPill name={cat.name} />
          </div>
        )}
        <div
          style={{
            marginTop: 4,
            color: price.muted ? "#9CA3AF" : "#0B1F3A",
            fontSize: 13,
            fontWeight: price.muted ? 500 : 700,
          }}
        >
          {price.text}
        </div>
      </div>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onOpen(listing.id);
        }}
        style={{
          background: "#1877D6",
          color: "#fff",
          borderRadius: 20,
          padding: "6px 14px",
          fontSize: 12,
          fontWeight: 700,
          border: "none",
          cursor: "pointer",
          fontFamily: "Poppins, sans-serif",
          flexShrink: 0,
        }}
      >
        View ›
      </button>
    </div>
  );
}


function MiniListingCard({
  listing,
  onOpen,
}: {
  listing: Listing;
  onOpen: (id: string) => void;
}) {
  const cat = listing.marketplace_categories;
  const Icon = iconFor(cat?.slug);
  const img =
    (listing.image_urls && listing.image_urls[0]) || listing.image_url || null;
  const price = formatListingPrice(listing);
  return (
    <div
      onClick={() => onOpen(listing.id)}
      style={{
        width: "100%",
        background: "#fff",
        border: "1px solid #E4E8EF",
        borderRadius: 16,
        boxShadow: "0 1px 3px rgba(11,31,58,0.06)",
        overflow: "hidden",
        fontFamily: "Poppins, sans-serif",
        cursor: "pointer",
      }}
    >
      <div
        style={{
          width: "100%",
          aspectRatio: "1 / 1",
          background: img
            ? `#EEF2F7 url(${img}) center/cover`
            : "#0B1F3A",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {!img && <Icon size={30} color="#FFFFFF" />}
      </div>
      <div style={{ padding: 10 }}>
        <div
          style={{
            color: "#0B1F3A",
            fontSize: 12,
            fontWeight: 600,
            lineHeight: 1.3,
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {listing.title}
        </div>
        {cat?.name && (
          <div style={{ marginTop: 4 }}>
            <CategoryPill name={cat.name} />
          </div>
        )}
        <div
          style={{
            marginTop: 6,
            color: price.muted ? "#9CA3AF" : "#0B1F3A",
            fontSize: 13,
            fontWeight: price.muted ? 500 : 700,
          }}
        >
          {price.text}
        </div>
      </div>
    </div>
  );
}



// Silence unused imports lint when IconTag is only imported for icon parity
void IconTag;
/** Lightweight neighbour panel shown while swiping toward another listing. */
function ListingPeek({ listing }: { listing: Listing }) {
  const photo = listing.image_urls?.[0] ?? listing.image_url ?? null;
  return (
    <div style={{ padding: 16 }}>
      <div
        style={{
          background: "#fff",
          borderRadius: 20,
          overflow: "hidden",
          boxShadow: "0 4px 0 #E4E4E8, 0 14px 30px rgba(0,0,0,0.06)",
        }}
      >
        <div
          style={{
            width: "100%",
            aspectRatio: "1 / 0.9",
            background: photo
              ? `#E7EDF5 url(${photo}) center/cover`
              : "linear-gradient(150deg, #14335C 0%, #0B1F3A 100%)",
          }}
        />
        <div style={{ padding: 16 }}>
          <div style={{ color: "#0B1F3A", fontSize: 17, fontWeight: 800, lineHeight: 1.2 }}>
            {listing.title}
          </div>
          {listing.price_display && (
            <div style={{ color: "#1877D6", fontSize: 20, fontWeight: 800, marginTop: 6 }}>
              {listing.price_display}
            </div>
          )}
          <div style={{ color: "#8A8A8E", fontSize: 13, marginTop: 10 }}>
            Release to open this listing…
          </div>
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────
   "Multi Page Custom Website" listing — enhanced upgrade sections.
   All tier data, comparison rows and edge-function calls come from
   the shared @/lib/websiteUpgrade module (also used by /minisite).
   ──────────────────────────────────────────────────────────────── */

const SECTION_TITLE: React.CSSProperties = {
  fontSize: 16,
  fontWeight: 800,
  color: "#0B1F3A",
  marginBottom: 8,
};

const EXAMPLE_SITES = [
  { name: "Southampton Driving School", url: "southamptondrivingschool.co.uk" },
  { name: "Learn to Drive Winchester", url: "learntodrivewins.co.uk" },
  { name: "Premier Driving Academy", url: "premierdrivingacademy.co.uk" },
  { name: "Pass First Time Driving", url: "passfirsttimedriving.co.uk" },
];

function Tick({ colour }: { colour: string }) {
  return <IconCheck stroke={2.4} size={12} color={colour} />;
}

function WebsiteUpgradeSections() {
  const [tier, setTier] = useState<TierId>("free");
  const [instructorName, setInstructorName] = useState("");
  const [userId, setUserId] = useState<string | null>(null);

  const [domainInput, setDomainInput] = useState("");
  const [domainChecking, setDomainChecking] = useState(false);
  const [domainResult, setDomainResult] = useState<DomainCheck | null>(null);

  const [busyTier, setBusyTier] = useState<PaidTierId | null>(null);
  const [compareOpen, setCompareOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      const user = auth.user;
      if (!user || cancelled) return;
      setUserId(user.id);
      const { data } = await supabase
        .from("instructors")
        .select("name, website_tier")
        .eq("id", user.id)
        .maybeSingle();
      if (cancelled || !data) return;
      const d = data as { name: string | null; website_tier: string | null };
      setInstructorName(d.name ?? "");
      if (d.website_tier && TIER_ORDER.includes(d.website_tier as TierId)) {
        setTier(d.website_tier as TierId);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function startUpgrade(paidTier: PaidTierId, domain?: string | null) {
    setBusyTier(paidTier);
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) {
        toast.error("Please sign in to upgrade");
        return;
      }
      const { url } = await createSubscriptionPaymentLink(paidTier, domain ?? null, token);
      window.location.href = url;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not start upgrade");
    } finally {
      setBusyTier(null);
    }
  }

  async function requestManaged() {
    setBusyTier("managed");
    try {
      const who = instructorName || "An instructor";
      await fetch(`${SUPABASE_URL}/functions/v1/send-contact-notification`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          name: "DSM Marketplace",
          email: "info@everydriver.co.uk",
          subject: `New managed website enquiry from ${who}`,
          message: `${who} is interested in DSM Managed Website (£29.99/month).\n\nInstructor ID: ${userId ?? "unknown"}\n\nPlease contact them within 24 hours.`,
        }),
      });
      toast.success("Request sent! We'll be in touch within 24 hours.");
    } catch {
      toast.error("Could not send your request — please try the enquiry form below");
    } finally {
      setBusyTier(null);
    }
  }

  async function runDomainSearch() {
    const q = domainInput.trim();
    if (!q) return;
    setDomainChecking(true);
    setDomainResult(null);
    try {
      const { data } = await supabase.auth.getSession();
      const result = await checkDomainAvailability(q, data.session?.access_token ?? null);
      setDomainResult(result);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Domain check failed");
    } finally {
      setDomainChecking(false);
    }
  }

  const website = TIERS.find((t) => t.id === "website");
  const pro = TIERS.find((t) => t.id === "pro");
  const managed = TIERS.find((t) => t.id === "managed");

  const cardBase: React.CSSProperties = {
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    position: "relative",
  };
  const pill: React.CSSProperties = {
    fontSize: 12,
    fontWeight: 700,
    borderRadius: 20,
    padding: "3px 10px",
    whiteSpace: "nowrap",
  };
  const ctaBase: React.CSSProperties = {
    width: "100%",
    border: "none",
    borderRadius: 8,
    padding: 11,
    fontSize: 14,
    fontWeight: 700,
    marginTop: 12,
    cursor: "pointer",
  };
  const noteBase: React.CSSProperties = {
    fontSize: 10,
    textAlign: "center",
    marginTop: 4,
  };

  const featureRow = (label: string, textColour: string, tickColour: string) => (
    <div
      key={label}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 7,
        fontSize: 12,
        color: textColour,
        marginTop: 7,
      }}
    >
      <Tick colour={tickColour} />
      <span>{label}</span>
    </div>
  );

  return (
    <div style={{ maxWidth: 430, margin: "0 auto", width: "100%" }}>
      {/* SECTION 1 — Current plan strip */}
      <div
        style={{
          background: "#EFF6FF",
          border: "1px solid #1877D6",
          borderRadius: 10,
          padding: "10px 14px",
          display: "flex",
          alignItems: "center",
          gap: 10,
          marginBottom: 16,
        }}
      >
        <span
          style={{ width: 8, height: 8, borderRadius: 999, background: "#1877D6", flexShrink: 0 }}
        />
        <span style={{ fontSize: 12, color: "#6B7686" }}>Your current plan:</span>
        <span style={{ fontSize: 12, fontWeight: 700, color: "#0B1F3A" }}>
          {TIER_NAMES[tier]}
        </span>
      </div>

      {/* SECTION 2 — Choose your plan */}
      <div style={{ ...SECTION_TITLE, marginBottom: 12 }}>Choose your plan</div>

      {website && (
        <div style={{ ...cardBase, background: "#fff", border: "1px solid #E4E8EF" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
            <span style={{ fontSize: 15, fontWeight: 800, color: "#0B1F3A" }}>{website.name}</span>
            <span style={{ ...pill, background: "#EFF6FF", color: "#1877D6" }}>£9.99/month</span>
          </div>
          {website.features.map((f) => featureRow(f, "#6B7686", "#15803D"))}
          <button
            type="button"
            disabled={busyTier !== null}
            onClick={() => startUpgrade("website")}
            style={{ ...ctaBase, background: "#1877D6", color: "#fff" }}
          >
            {busyTier === "website" ? "Starting…" : "Upgrade online →"}
          </button>
          <div style={{ ...noteBase, color: "#9CA3AF" }}>Takes you to secure checkout</div>
        </div>
      )}

      {pro && (
        <div style={{ ...cardBase, background: "linear-gradient(135deg,#14509E,#0B1F3A)" }}>
          <span
            style={{
              position: "absolute",
              top: 12,
              right: 12,
              background: "#15803D",
              color: "#fff",
              fontSize: 9,
              fontWeight: 800,
              borderRadius: 20,
              padding: "3px 8px",
            }}
          >
            Most popular
          </span>
          <div style={{ fontSize: 15, fontWeight: 800, color: "#fff", paddingRight: 88 }}>
            {pro.name}
          </div>
          <div style={{ marginTop: 8 }}>
            <span
              style={{ ...pill, background: "rgba(255,255,255,0.15)", color: "#fff", display: "inline-block" }}
            >
              £19.99/month
            </span>
          </div>
          {pro.features.map((f) => featureRow(f, "rgba(255,255,255,0.9)", "#4ADE80"))}
          <button
            type="button"
            disabled={busyTier !== null}
            onClick={() => startUpgrade("pro")}
            style={{ ...ctaBase, background: "#fff", color: "#0B1F3A" }}
          >
            {busyTier === "pro" ? "Starting…" : "Upgrade to Pro →"}
          </button>
          <div style={{ ...noteBase, color: "rgba(255,255,255,0.5)" }}>
            Takes you to secure checkout
          </div>
        </div>
      )}

      {managed && (
        <div style={{ ...cardBase, background: "linear-gradient(135deg,#1a1a1a,#000)" }}>
          <span
            style={{
              position: "absolute",
              top: 12,
              right: 12,
              background: "#D68A1B",
              color: "#fff",
              fontSize: 9,
              fontWeight: 800,
              borderRadius: 20,
              padding: "3px 8px",
            }}
          >
            White glove
          </span>
          <div style={{ fontSize: 15, fontWeight: 800, color: "#fff", paddingRight: 88 }}>
            {managed.name}
          </div>
          <div style={{ marginTop: 8 }}>
            <span
              style={{ ...pill, background: "rgba(214,138,27,0.18)", color: "#D68A1B", display: "inline-block" }}
            >
              £29.99/month
            </span>
          </div>
          {managed.features.map((f) => featureRow(f, "rgba(255,255,255,0.9)", "#D68A1B"))}
          <button
            type="button"
            disabled={busyTier !== null}
            onClick={requestManaged}
            style={{ ...ctaBase, background: "#D68A1B", color: "#fff" }}
          >
            {busyTier === "managed" ? "Sending…" : "Contact us →"}
          </button>
          <div style={{ ...noteBase, color: "rgba(255,255,255,0.5)" }}>
            Our team will contact you within 24 hours
          </div>
        </div>
      )}

      {/* SECTION 3 — Find your domain */}
      <div style={{ ...SECTION_TITLE, marginTop: 22 }}>Find your domain</div>
      <div style={{ fontSize: 12, color: "#6B7686", marginBottom: 12 }}>
        Search for your school name — included free with DSM Website
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <input
          value={domainInput}
          onChange={(e) => setDomainInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void runDomainSearch();
          }}
          placeholder="yourschoolname"
          style={{
            flex: 1,
            minWidth: 0,
            border: "1px solid #E4E8EF",
            borderRadius: 8,
            padding: "11px 12px",
            fontSize: 14,
            color: "#0B1F3A",
            background: "#fff",
            outline: "none",
          }}
        />
        <button
          type="button"
          onClick={() => void runDomainSearch()}
          disabled={domainChecking}
          style={{
            background: "#1877D6",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            padding: "11px 16px",
            fontSize: 14,
            fontWeight: 700,
            cursor: "pointer",
            flexShrink: 0,
          }}
        >
          {domainChecking ? "…" : "Search"}
        </button>
      </div>

      {domainResult && (
        <div
          style={{
            marginTop: 10,
            borderRadius: 12,
            padding: 14,
            border: `1px solid ${domainResult.available ? "#BBF7D0" : "#FECACA"}`,
            background: domainResult.available ? "#F0FDF4" : "#FEF2F2",
          }}
        >
          <div
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: domainResult.available ? "#15803D" : "#B91C1C",
            }}
          >
            {domainResult.domain}
          </div>
          <div style={{ fontSize: 12, color: "#6B7686", marginTop: 3 }}>
            {domainResult.available
              ? "Available — included free with DSM Website"
              : "Not available — try another name"}
          </div>
          {domainResult.available && (
            <button
              type="button"
              disabled={busyTier !== null}
              onClick={() => startUpgrade("website", domainResult.domain)}
              style={{ ...ctaBase, background: "#15803D", color: "#fff" }}
            >
              {busyTier === "website" ? "Starting…" : "Register this domain →"}
            </button>
          )}
        </div>
      )}

      {/* SECTION 4 — Compare plans */}
      <div style={{ ...SECTION_TITLE, marginTop: 22 }}>Compare plans</div>
      {!compareOpen ? (
        <button
          type="button"
          onClick={() => setCompareOpen(true)}
          style={{
            background: "none",
            border: "none",
            padding: 0,
            fontSize: 12,
            color: "#1877D6",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Tap to see full feature comparison →
        </button>
      ) : (
        <div
          style={{
            background: "#fff",
            border: "1px solid #E4E8EF",
            borderRadius: 12,
            overflow: "hidden",
          }}
        >
          <div style={{ display: "flex", background: "#EEF2F7", padding: "8px 10px" }}>
            <div style={{ flex: 2, fontSize: 10, fontWeight: 800, color: "#0B1F3A" }}>Feature</div>
            {COMPARISON_COLS.map((c) => (
              <div
                key={c.id}
                style={{
                  flex: 1,
                  textAlign: "center",
                  fontSize: 10,
                  fontWeight: 800,
                  color: "#0B1F3A",
                  background: c.id === tier ? "#F7FAFE" : "transparent",
                }}
              >
                {c.name}
                <div style={{ fontSize: 9, fontWeight: 600, color: "#6B7686" }}>{c.price}</div>
              </div>
            ))}
          </div>
          {COMPARISON_ROWS.map((group) => (
            <div key={group.title}>
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 800,
                  color: "#6B7686",
                  padding: "8px 10px 4px",
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                }}
              >
                {group.title}
              </div>
              {group.rows.map((row) => (
                <div
                  key={row.label}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    padding: "7px 10px",
                    borderTop: "1px solid #F1F4F8",
                  }}
                >
                  <div style={{ flex: 2, fontSize: 10, color: "#0B1F3A" }}>{row.label}</div>
                  {COMPARISON_COLS.map((c, i) => (
                    <div
                      key={c.id}
                      style={{
                        flex: 1,
                        textAlign: "center",
                        fontSize: 10,
                        color: i >= row.from ? "#15803D" : "#C7CDD6",
                        background: c.id === tier ? "#F7FAFE" : "transparent",
                      }}
                    >
                      {i >= row.from ? "✓" : "—"}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          ))}
          <button
            type="button"
            onClick={() => setCompareOpen(false)}
            style={{
              width: "100%",
              background: "#fff",
              border: "none",
              borderTop: "1px solid #E4E8EF",
              padding: 10,
              fontSize: 12,
              fontWeight: 600,
              color: "#1877D6",
              cursor: "pointer",
            }}
          >
            Hide comparison
          </button>
        </div>
      )}

      {/* SECTION 5 — Example sites */}
      <div style={{ ...SECTION_TITLE, marginTop: 22 }}>Example sites</div>
      {EXAMPLE_SITES.map((site) => (
        <div
          key={site.url}
          style={{
            background: "#fff",
            borderRadius: 12,
            border: "1px solid #E4E8EF",
            marginBottom: 10,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              height: 160,
              width: "100%",
              background: "linear-gradient(135deg,#EEF2F7,#E4E8EF)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 4,
            }}
          >
            <span style={{ fontSize: 32 }}>🌐</span>
            <span style={{ fontSize: 11, color: "#9CA3AF" }}>Example site</span>
          </div>
          <div style={{ padding: 12 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#0B1F3A" }}>{site.name}</div>
            <div style={{ fontSize: 11, color: "#1877D6", marginTop: 2 }}>{site.url}</div>
            <a
              href="#"
              onClick={(e) => e.preventDefault()}
              style={{
                display: "inline-block",
                marginTop: 8,
                fontSize: 12,
                fontWeight: 600,
                color: "#1877D6",
                textDecoration: "none",
              }}
            >
              View example →
            </a>
          </div>
          <div
            style={{
              fontSize: 9,
              color: "#F59E0B",
              padding: "6px 12px",
              background: "#FFFBEB",
              borderTop: "1px solid #FDE68A",
            }}
          >
            ⚠️ Placeholder — real example URLs coming soon
          </div>
        </div>
      ))}

      {/* SECTION 6 — See it in action */}
      <div style={{ ...SECTION_TITLE, marginTop: 22 }}>See it in action</div>
      <div
        style={{
          width: "100%",
          paddingTop: "56.25%",
          position: "relative",
          background: "linear-gradient(135deg,#0B1F3A,#1877D6)",
          borderRadius: 12,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 999,
              background: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <IconPlayerPlayFilled size={22} color="#0B1F3A" />
          </div>
          <span style={{ color: "rgba(255,255,255,0.8)", fontSize: 12 }}>
            Watch a 2-minute demo
          </span>
        </div>
        <div
          style={{
            position: "absolute",
            bottom: 8,
            left: 0,
            right: 0,
            textAlign: "center",
            fontSize: 9,
            color: "rgba(255,255,255,0.4)",
          }}
        >
          ⚠️ Placeholder — real demo video coming soon
        </div>
      </div>
    </div>
  );
}
