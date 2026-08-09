import { PageLoader } from "@/components/dsm/LoadingSpinner";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { IconArrowLeft, IconBriefcase, IconCamera, IconCar, IconCircleCheck, IconHeart, IconMapPin, IconPackage, IconSchool, IconShieldCheck, IconStar, IconTag, IconTool, IconX } from "@tabler/icons-react";
import { BookOpen, Megaphone } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

const SUPABASE_URL = "https://bjpqxfrihwjcqprmoqfs.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJqcHF4ZnJpaHdqY3Fwcm1vcWZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE0NzQ4MjEsImV4cCI6MjA5NzA1MDgyMX0.HKlgx3dxP3uxX9wMRRUnfb0IPwaBpFcut_iUgT5XFeo";

export const Route = createFileRoute("/marketplace_/$listingId")({
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

const CATEGORY_ICONS: Record<string, React.ComponentType<{ size?: number; color?: string }>> = {
  tracking: IconMapPin,
  hardware: IconCamera,
  dashcams: IconCamera,
  health: IconHeart,
  learning: IconSchool,
  cpd: IconSchool,
  courses: BookOpen,
  insurance: IconShieldCheck,
  vehicles: IconCar,
  cars: IconCar,
  maintenance: IconTool,
  services: IconBriefcase,
  marketing: Megaphone,
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
  // Return to the Discover marketplace section when we arrived from there.
  const goBack = () =>
    from === "discover"
      ? navigate({ to: "/discover", search: { tab: "market" } })
      : navigate({ to: "/marketplace" });

  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);
  const [similar, setSimilar] = useState<Listing[]>([]);
  const [sellerListings, setSellerListings] = useState<Listing[]>([]);
  const [enquiryOpen, setEnquiryOpen] = useState(false);
  const [photoIndex, setPhotoIndex] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const rows = await sbGet<Listing[]>(
          `marketplace_listings?id=eq.${listingId}&is_active=eq.true&deleted_at=is.null&select=*,marketplace_suppliers(name,logo_url,website_url,email,phone,is_verified),marketplace_categories(name,slug)`,
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

  const cat = listing?.marketplace_categories;
  const Icon = iconFor(cat?.slug);
  const supplier = listing?.marketplace_suppliers;


  const CARD: React.CSSProperties = {
    background: "#fff",
    borderRadius: 20,
    padding: 18,
    boxShadow: "0 4px 0 #E4E4E8, 0 14px 30px rgba(0,0,0,0.06)",
  };
  const LABEL: React.CSSProperties = {
    color: "#8A8A8E",
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: "0.5px",
    textTransform: "uppercase",
    margin: "0 4px 8px",
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
          onClick={goBack}
          aria-label="Back"
          style={{
            width: 34,
            height: 34,
            borderRadius: 999,
            background: "rgba(255,255,255,0.08)",
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
            onClick={goBack}
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
        <>
          {/* Hero photo gallery */}
          <div style={{ position: "relative", width: "100%", background: "#0B1F3A" }}>
            {photos.length > 1 ? (
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
                    : "linear-gradient(135deg,#0B1F3A,#1877D6)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {!photos[0] && <Icon size={64} color="#FFFFFF" />}
              </div>
            )}

            {/* Status badge */}
            <div
              style={{
                position: "absolute",
                top: 12,
                left: 12,
                background: listing.is_active ? "#1A9B5C" : "#6B7686",
                color: "#fff",
                fontSize: 11,
                fontWeight: 800,
                padding: "6px 12px",
                borderRadius: 20,
              }}
            >
              {listing.is_active ? "For Sale" : "Sold"}
            </div>

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

          <div style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: 14 }}>
            {/* Title + price */}
            <div style={{ ...CARD, padding: 20 }}>
              <div
                style={{
                  color: "#0B1F3A",
                  fontSize: 22,
                  fontWeight: 800,
                  letterSpacing: "-0.3px",
                  lineHeight: 1.25,
                }}
              >
                {listing.title}
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "baseline",
                  gap: 10,
                  marginTop: 10,
                }}
              >
                <span
                  style={{
                    color: "#0B1F3A",
                    fontSize: 28,
                    fontWeight: 900,
                    letterSpacing: "-0.6px",
                  }}
                >
                  {listing.price_display ?? "POA"}
                </span>
                {listing.condition && (
                  <span
                    style={{
                      background: "#EEF2F7",
                      color: "#6B7686",
                      fontSize: 11.5,
                      fontWeight: 700,
                      padding: "5px 11px",
                      borderRadius: 20,
                      whiteSpace: "nowrap",
                      textTransform: "capitalize",
                    }}
                  >
                    {listing.condition}
                  </span>
                )}
              </div>
              {listing.location && (
                <div
                  style={{
                    borderTop: "1px solid #F0F0F2",
                    paddingTop: 12,
                    marginTop: 12,
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    color: "#8A8A8E",
                    fontSize: 13,
                    fontWeight: 600,
                  }}
                >
                  <IconMapPin stroke={1.8} size={13} />
                  {listing.location}
                </div>
              )}
            </div>

            {/* Seller */}
            <div style={{ ...CARD, display: "flex", gap: 13, alignItems: "center" }}>
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
            </div>

            {/* Description */}
            {listing.description && (
              <div>
                <div style={LABEL}>Description</div>
                <div style={CARD}>
                  <div
                    style={{
                      color: "#6B6B6F",
                      fontSize: 14,
                      fontWeight: 500,
                      lineHeight: 1.6,
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    {listing.description}
                  </div>
                </div>
              </div>
            )}

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
              <div
                style={{
                  color: "#0B1F3A",
                  fontSize: 16,
                  fontWeight: 800,
                  marginBottom: 12,
                }}
              >
                Get in touch
              </div>
              <ContactActions
                listing={listing}
                onEnquire={() => setEnquiryOpen(true)}
              />
            </div>
          </div>

          {/* More from this seller */}
          {sellerListings.length > 0 && (
            <div style={{ padding: "0 16px 16px" }}>
              <div style={LABEL}>More from this seller</div>
              <div
                style={{
                  display: "flex",
                  gap: 12,
                  overflowX: "auto",
                  paddingBottom: 14,
                  scrollbarWidth: "none",
                }}
              >
                {sellerListings.map((s) => (
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

          {/* Similar in category */}
          {similar.length > 0 && (
            <div style={{ padding: "0 16px 16px" }}>
              <div style={LABEL}>More in this category</div>
              <div
                style={{
                  display: "flex",
                  gap: 12,
                  overflowX: "auto",
                  paddingBottom: 14,
                  scrollbarWidth: "none",
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

          {enquiryOpen && (
            <EnquirySheet
              listing={listing}
              onClose={() => setEnquiryOpen(false)}
            />
          )}
        </>
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
    background: "#0F2044",
    color: "#FFFFFF",
    border: "none",
    fontSize: 14,
    fontWeight: 700,
    padding: "12px 16px",
    borderRadius: 10,
    cursor: "pointer",
    width: "100%",
    textAlign: "center" as const,
    textDecoration: "none",
    display: "block",
  };

  const secondaryBtn = {
    background: "#FFFFFF",
    color: "#0F2044",
    border: "0.5px solid #0F2044",
    fontSize: 14,
    fontWeight: 700,
    padding: "12px 16px",
    borderRadius: 10,
    cursor: "pointer",
    width: "100%",
    textAlign: "center" as const,
    textDecoration: "none",
    display: "block",
    marginTop: 8,
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
  return (
    <div
      onClick={() => onOpen(listing.id)}
      style={{
        width: 140,
        flexShrink: 0,
        background: "#fff",
        borderRadius: 16,
        overflow: "hidden",
        boxShadow: "0 3px 0 #E4E4E8, 0 8px 18px rgba(0,0,0,0.05)",
        cursor: "pointer",
      }}
    >
      <div
        style={{
          height: 100,
          background: img
            ? `#E7EDF5 url(${img}) center/cover`
            : "linear-gradient(135deg,#0B1F3A,#1877D6)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {!img && <Icon size={32} color="#FFFFFF" />}
      </div>
      <div
        style={{
          color: "#0B1F3A",
          fontSize: 12.5,
          fontWeight: 700,
          lineHeight: 1.3,
          padding: "10px 12px 0",
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
          color: "#0B1F3A",
          fontSize: 13.5,
          fontWeight: 800,
          marginTop: 5,
          padding: "0 12px 12px",
        }}
      >
        {listing.price_display ?? "POA"}
      </div>
    </div>
  );
}


// Silence unused imports lint when IconTag is only imported for icon parity
void IconTag;