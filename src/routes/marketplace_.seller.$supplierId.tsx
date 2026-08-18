import { PageLoader } from "@/components/dsm/LoadingSpinner";
import { PageHeader } from "@/components/dsm/PageHeader";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { IconCircleCheck, IconMapPin, IconWorld } from "@tabler/icons-react";

const SUPABASE_URL = "https://bjpqxfrihwjcqprmoqfs.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJqcHF4ZnJpaHdqY3Fwcm1vcWZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE0NzQ4MjEsImV4cCI6MjA5NzA1MDgyMX0.HKlgx3dxP3uxX9wMRRUnfb0IPwaBpFcut_iUgT5XFeo";

export const Route = createFileRoute("/marketplace_/seller/$supplierId")({
  head: () => ({
    meta: [
      { title: "Seller profile — DSM Marketplace" },
      {
        name: "description",
        content:
          "View a marketplace seller's profile and browse all of their active listings on Driving School Manager.",
      },
      { property: "og:title", content: "Seller profile — DSM Marketplace" },
      {
        property: "og:description",
        content:
          "View a marketplace seller's profile and browse all of their active listings.",
      },
      { property: "og:type", content: "profile" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SellerProfilePage,
});

interface Supplier {
  id: string;
  name: string;
  logo_url: string | null;
  website_url: string | null;
  description: string | null;
  is_verified: boolean;
}

interface Listing {
  id: string;
  title: string;
  price_display: string | null;
  image_urls: string[] | null;
  image_url: string | null;
  location: string | null;
}

const CARD: React.CSSProperties = {
  background: "#fff",
  borderRadius: 8,
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

function SellerProfilePage() {
  const { supplierId } = Route.useParams();
  const navigate = useNavigate();
  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const headers = {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    };
    (async () => {
      setLoading(true);
      try {
        const sRes = await fetch(
          `${SUPABASE_URL}/rest/v1/marketplace_suppliers?id=eq.${supplierId}&select=id,name,logo_url,website_url,description,is_verified`,
          { headers },
        );
        const sJson: Supplier[] = sRes.ok ? await sRes.json() : [];
        const lRes = await fetch(
          `${SUPABASE_URL}/rest/v1/marketplace_listings?supplier_id=eq.${supplierId}&is_active=eq.true&deleted_at=is.null&select=id,title,price_display,image_urls,image_url,location&order=created_at.desc`,
          { headers },
        );
        const lJson: Listing[] = lRes.ok ? await lRes.json() : [];
        if (cancelled) return;
        setSupplier(sJson[0] ?? null);
        setListings(lJson);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [supplierId]);

  if (loading) return <PageLoader />;

  return (
    <div style={{ minHeight: "100vh", background: "#F5F6F8", paddingBottom: 96 }}>
      <PageHeader title={supplier?.name ?? "Seller"} backTo="/marketplace" />

      <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ ...CARD, display: "flex", gap: 13, alignItems: "center" }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 999,
              background: supplier?.logo_url
                ? `#E7F1FC url(${supplier.logo_url}) center/cover`
                : "#E7F1FC",
              color: "#1877D6",
              fontWeight: 800,
              fontSize: 20,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            {!supplier?.logo_url && (supplier?.name?.charAt(0)?.toUpperCase() ?? "?")}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1
              style={{
                color: "#0B1F3A",
                fontSize: 18,
                fontWeight: 800,
                margin: 0,
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
                {supplier?.name ?? "Seller"}
              </span>
              {supplier?.is_verified && (
                <IconCircleCheck stroke={1.8} size={16} color="#1A9B5C" />
              )}
            </h1>
            <div style={{ color: "#8A8A8E", fontSize: 12.5, marginTop: 3, fontWeight: 600 }}>
              {listings.length} active listing{listings.length === 1 ? "" : "s"}
            </div>
          </div>
        </div>

        {supplier?.description && (
          <div>
            <div style={LABEL}>About</div>
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
                {supplier.description}
              </div>
            </div>
          </div>
        )}

        {supplier?.website_url && (
          <a
            href={supplier.website_url}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              ...CARD,
              padding: "14px 18px",
              display: "flex",
              alignItems: "center",
              gap: 10,
              color: "#1877D6",
              fontSize: 14.5,
              fontWeight: 700,
              textDecoration: "none",
            }}
          >
            <IconWorld stroke={1.8} size={18} />
            Visit website
          </a>
        )}

        <div>
          <div style={LABEL}>Listings</div>
          {listings.length === 0 ? (
            <div
              style={{
                ...CARD,
                textAlign: "center",
                color: "#B0B0B5",
                fontSize: 14,
                fontWeight: 500,
              }}
            >
              No active listings from this seller
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {listings.map((l) => {
                const img = l.image_urls?.[0] ?? l.image_url ?? null;
                return (
                  <button
                    key={l.id}
                    type="button"
                    onClick={() =>
                      navigate({
                        to: "/marketplace/$listingId",
                        params: { listingId: l.id },
                      })
                    }
                    style={{
                      ...CARD,
                      padding: 12,
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      border: "none",
                      textAlign: "left",
                      cursor: "pointer",
                      width: "100%",
                    }}
                  >
                    <div
                      style={{
                        width: 62,
                        height: 62,
                        borderRadius: 8,
                        flexShrink: 0,
                        background: img
                          ? `#EEF2F7 url(${img}) center/cover`
                          : "#EEF2F7",
                      }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          color: "#0B1F3A",
                          fontSize: 14.5,
                          fontWeight: 800,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {l.title}
                      </div>
                      {l.location && (
                        <div
                          style={{
                            color: "#8A8A8E",
                            fontSize: 12,
                            fontWeight: 600,
                            marginTop: 2,
                            display: "flex",
                            alignItems: "center",
                            gap: 4,
                          }}
                        >
                          <IconMapPin stroke={1.8} size={12} />
                          {l.location}
                        </div>
                      )}
                      {l.price_display && (
                        <div
                          style={{
                            color: "#1877D6",
                            fontSize: 14,
                            fontWeight: 800,
                            marginTop: 3,
                          }}
                        >
                          {l.price_display}
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
