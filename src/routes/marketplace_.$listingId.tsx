import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  ArrowLeft,
  MapPin,
  CheckCircle2,
  Package,
  Star,
  Camera,
  Heart,
  GraduationCap,
  Wrench,
  ShieldCheck,
  Car,
  BookOpen,
  Briefcase,
  Megaphone,
  Tag,
  X,
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

const SUPABASE_URL = "https://bjpqxfrihwjcqprmoqfs.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJqcHF4ZnJpaHdqY3Fwcm1vcWZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE0NzQ4MjEsImV4cCI6MjA5NzA1MDgyMX0.HKlgx3dxP3uxX9wMRRUnfb0IPwaBpFcut_iUgT5XFeo";

export const Route = createFileRoute("/marketplace_/$listingId")({
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

function iconFor(slug?: string | null) {
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

function ListingDetailPage() {
  const { listingId } = Route.useParams();
  const navigate = useNavigate();
  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);
  const [similar, setSimilar] = useState<Listing[]>([]);
  const [enquiryOpen, setEnquiryOpen] = useState(false);

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

  const heroImage = useMemo(() => {
    if (listing?.image_urls && listing.image_urls.length > 0)
      return listing.image_urls[0];
    return listing?.image_url ?? null;
  }, [listing]);

  const cat = listing?.marketplace_categories;
  const Icon = iconFor(cat?.slug);
  const supplier = listing?.marketplace_suppliers;

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
          onClick={() => navigate({ to: "/marketplace" })}
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
        <div
          style={{
            fontSize: 15,
            fontWeight: 700,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {listing?.title ?? "Listing"}
        </div>
      </div>

      {loading ? (
        <div style={{ padding: 24, color: "#6B7280", fontSize: 13 }}>Loading…</div>
      ) : !listing ? (
        <div style={{ padding: 40, textAlign: "center" }}>
          <div style={{ color: "#374151", fontSize: 15, marginBottom: 12 }}>
            Listing not found
          </div>
          <button
            type="button"
            onClick={() => navigate({ to: "/marketplace" })}
            style={{
              background: "none",
              border: "none",
              color: "#1A52A0",
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
          {/* Hero */}
          <div
            style={{
              width: "100%",
              height: 220,
              background: heroImage
                ? `#F3F8FF url(${heroImage}) center/cover`
                : "linear-gradient(135deg,#0F2044,#1A52A0)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {!heroImage && <Icon size={64} color="#FFFFFF" />}
          </div>

          {/* Supplier bar */}
          <div
            style={{
              background: "#FFFFFF",
              padding: "12px 16px",
              borderBottom: "0.5px solid #E2E6ED",
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 999,
                background: supplier?.logo_url
                  ? `#EEF2F7 url(${supplier.logo_url}) center/cover`
                  : "#EEF2F7",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                color: "#0F2044",
                fontWeight: 700,
                fontSize: 14,
              }}
            >
              {!supplier?.logo_url &&
                (supplier?.name?.charAt(0)?.toUpperCase() ?? "?")}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <span
                  style={{
                    fontSize: 14,
                    fontWeight: 700,
                    color: "#0F2044",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {supplier?.name ?? "Listed by instructor"}
                </span>
                {supplier?.is_verified && (
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
                    <CheckCircle2 size={11} /> Verified
                  </span>
                )}
              </div>
            </div>
            {cat && (
              <span
                style={{
                  display: "inline-block",
                  background: "#EEF2F7",
                  color: "#0F2044",
                  fontSize: 10,
                  fontWeight: 600,
                  padding: "3px 8px",
                  borderRadius: 999,
                }}
              >
                {cat.name}
              </span>
            )}
          </div>

          {/* Content */}
          <div style={{ padding: 16 }}>
            <h1
              style={{
                margin: 0,
                fontSize: 22,
                fontWeight: 700,
                color: "#0F2044",
                marginBottom: 8,
              }}
            >
              {listing.title}
            </h1>
            {listing.price_display && (
              <div
                style={{
                  fontSize: 20,
                  fontWeight: 900,
                  color: "#00B5A5",
                  marginBottom: 16,
                }}
              >
                {listing.price_display}
              </div>
            )}
            {listing.description && (
              <div
                style={{
                  fontSize: 14,
                  color: "#374151",
                  lineHeight: 1.6,
                  marginBottom: 16,
                  whiteSpace: "pre-wrap",
                }}
              >
                {listing.description}
              </div>
            )}

            {listing.tags && listing.tags.length > 0 && (
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 6,
                  marginBottom: 12,
                }}
              >
                {listing.tags.map((t) => (
                  <span
                    key={t}
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: "#6B7280",
                      background: "#F3F4F6",
                      padding: "3px 8px",
                      borderRadius: 999,
                    }}
                  >
                    #{t}
                  </span>
                ))}
              </div>
            )}

            {listing.location && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  fontSize: 13,
                  color: "#6B7280",
                  marginBottom: 10,
                }}
              >
                <MapPin size={14} />
                {listing.location}
              </div>
            )}

            {listing.condition && (
              <div style={{ marginBottom: 10 }}>
                <ConditionBadge condition={listing.condition} />
              </div>
            )}

            {/* Contact actions card */}
            <div
              style={{
                background: "#FFFFFF",
                border: "0.5px solid #E2E6ED",
                borderRadius: 12,
                padding: 16,
                marginTop: 16,
              }}
            >
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  color: "#0F2044",
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

          {/* Similar */}
          {similar.length > 0 && (
            <div style={{ padding: "8px 16px 16px", marginTop: 8 }}>
              <div
                style={{
                  fontSize: 13,
                  color: "#6B7280",
                  fontWeight: 600,
                  marginBottom: 10,
                }}
              >
                More from this category
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
                {similar.map((s) => (
                  <SimilarCard
                    key={s.id}
                    listing={s}
                    onOpen={(id) =>
                      navigate({
                        to: "/marketplace_/$listingId",
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
          supabase.from("instructor_notifications").insert({
            instructor_id: listing.instructor_id,
            title: "New marketplace enquiry 📬",
            body: `Someone enquired about your listing: '${listing.title}'`,
            type: "marketplace_enquiry",
            read: false,
            reference_id: listing.id,
            reference_type: "marketplace_listing",
          }),
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
            <X size={20} />
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

function SimilarCard({
  listing,
  onOpen,
}: {
  listing: Listing;
  onOpen: (id: string) => void;
}) {
  const supplier = listing.marketplace_suppliers;
  const cat = listing.marketplace_categories;
  const Icon = iconFor(cat?.slug);
  const img =
    (listing.image_urls && listing.image_urls[0]) || listing.image_url || null;
  return (
    <div
      onClick={() => onOpen(listing.id)}
      style={{
        width: 220,
        flexShrink: 0,
        scrollSnapAlign: "start",
        cursor: "pointer",
      }}
    >
      <div
        style={{
          height: 110,
          borderRadius: "12px 12px 0 0",
          background: img
            ? `#F3F8FF url(${img}) center/cover`
            : "linear-gradient(135deg,#0F2044,#1A52A0)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {!img && <Icon size={36} color="#FFFFFF" />}
      </div>
      <div
        style={{
          background: "#FFFFFF",
          border: "0.5px solid #E2E6ED",
          borderTop: "none",
          borderRadius: "0 0 12px 12px",
          padding: 10,
        }}
      >
        <div
          style={{
            fontSize: 11,
            color: "#6B7280",
            marginBottom: 2,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {supplier?.name ?? "—"}
        </div>
        <div
          style={{
            fontSize: 13,
            fontWeight: 700,
            color: "#0F2044",
            lineHeight: 1.3,
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
            marginBottom: 4,
          }}
        >
          {listing.title}
        </div>
        <div style={{ fontSize: 12, color: "#6B7280" }}>
          {listing.price_display ?? "—"}
        </div>
      </div>
    </div>
  );
}

// Silence unused imports lint when Tag is only imported for icon parity
void Tag;