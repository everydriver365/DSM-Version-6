import * as React from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { toast } from "sonner";

import {
  MapPin,
  Camera,
  Heart,
  GraduationCap,
  Star,
  CheckCircle2,
  ChevronLeft,
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

export const Route = createFileRoute("/marketplace/$slug")({
  component: MarketplaceProductPage,
});

type Tile = {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  badge: string | null;
  price_display: string | null;
  link_url: string | null;
  image_url: string | null;
  category: string;
  display_order: number;
  is_active: boolean;
  gradient?: string | null;
};

const CATEGORY_ICONS: Record<string, React.ComponentType<{ size?: number; color?: string; style?: React.CSSProperties }>> = {
  tracking: MapPin,
  hardware: Camera,
  health: Heart,
  learning: GraduationCap,
  promotion: Star,
};

const FEATURES: Record<string, string[]> = {
  tracking: [
    "Live location tracking",
    "Journey history",
    "Harsh event alerts",
    "Geotab hardware integration",
    "No contract",
  ],
  hardware: [
    "HD video recording",
    "Cloud storage",
    "Incident detection",
    "Speed overlay",
    "36-month minimum term",
  ],
  health: [
    "24/7 GP helpline",
    "Mental health support",
    "Hospital treatment",
    "Prescription service",
    "Included with subscription",
  ],
  learning: [
    "DVSA-approved content",
    "Track your CPD hours",
    "Certificate on completion",
    "Flexible scheduling",
  ],
  promotion: [
    "Priority search placement",
    "Featured badge on profile",
    "Increased visibility",
    "Cancel anytime",
  ],
};

const TOP_BAR_HEIGHT = 52;

function MarketplaceProductPage() {
  const { slug } = Route.useParams();
  const navigate = useNavigate();
  const [tile, setTile] = React.useState<Tile | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    void loadTile();
  }, [slug]);


  async function loadTile() {
    setLoading(true);
    const { data, error } = await supabase
      .from("marketplace_tiles")
      .select("*")
      .eq("slug", slug)
      .single();
    if (error || !data) {
      setTile(null);
    } else {
      setTile(data as Tile);
    }
    setLoading(false);
  }

  return (
    <div style={{ minHeight: "100vh", background: "#fff", paddingBottom: 92 }}>
      {/* TOP BAR */}
      <div
        style={{
          background: "#0F2044",
          color: "#fff",
          height: TOP_BAR_HEIGHT,
          padding: "0 16px",
          display: "flex",
          alignItems: "center",
          position: "sticky",
          top: 0,
          zIndex: 10,
        }}
      >
        <button
          onClick={() => navigate({ to: "/marketplace" })}
          style={{
            background: "transparent",
            border: "none",
            color: "#fff",
            cursor: "pointer",
            padding: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 28,
            height: 28,
          }}
          aria-label="Back"
        >
          <ChevronLeft size={24} />
        </button>
        <div
          style={{
            fontSize: 18,
            fontWeight: 700,
            marginLeft: 12,
            flex: 1,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {tile?.title || "Product"}
        </div>
      </div>

      {loading ? (
        <div style={{ padding: 20 }}>
          <p style={{ color: "#64748b" }}>Loading…</p>
        </div>
      ) : !tile ? (
        <div style={{ padding: 40, textAlign: "center" }}>
          <p style={{ fontSize: 16, color: "#374151", marginBottom: 16 }}>
            Product not found
          </p>
          <Link
            to="/marketplace"
            style={{ color: "#00B5A5", fontWeight: 600, fontSize: 14 }}
          >
            Back to marketplace
          </Link>
        </div>
      ) : (
        <>
          {/* HERO */}
          <div
            style={{
              width: "100%",
              height: 200,
              background: tile.image_url
                ? `#F2F4F8 url(${tile.image_url}) center/cover`
                : tile.gradient || "#F2F4F8",
              position: "relative",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {!tile.image_url && <CategoryIcon category={tile.category} />}
            {tile.badge && (
              <div
                style={{
                  position: "absolute",
                  top: 12,
                  left: 12,
                  background: "#00B5A5",
                  color: "#fff",
                  fontSize: 11,
                  fontWeight: 700,
                  padding: "4px 8px",
                  borderRadius: 6,
                }}
              >
                {tile.badge}
              </div>
            )}
          </div>

          {/* CONTENT */}
          <div style={{ padding: 20 }}>
            <div
              style={{
                fontSize: 22,
                fontWeight: 700,
                color: "#0F2044",
                marginBottom: 6,
              }}
            >
              {tile.title}
            </div>
            <div
              style={{
                fontSize: 18,
                fontWeight: 700,
                color: "#00B5A5",
                marginBottom: 12,
              }}
            >
              {tile.price_display || "Free"}
            </div>
            <div
              style={{
                fontSize: 14,
                color: "#6B7280",
                lineHeight: 1.6,
                marginBottom: 16,
              }}
            >
              {tile.description}
            </div>

            {/* FEATURES CARD */}
            <div
              style={{
                background: "#fff",
                border: "0.5px solid #E2E6ED",
                borderRadius: 12,
                padding: 16,
                marginTop: 16,
              }}
            >
              {FEATURES[tile.category]?.map((feature, idx) => {
                const isLast =
                  idx === (FEATURES[tile.category]?.length ?? 0) - 1;
                return (
                  <div
                    key={idx}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      marginBottom: isLast ? 0 : 12,
                    }}
                  >
                    <CheckCircle2 size={18} color="#00B5A5" />
                    <span style={{ fontSize: 13, color: "#374151" }}>
                      {feature}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* STICKY ACTION */}
          <div
            style={{
              position: "fixed",
              bottom: 0,
              left: 0,
              right: 0,
              background: "#fff",
              borderTop: "0.5px solid #E2E6ED",
              padding: 16,
              zIndex: 20,
            }}
          >
            {tile.category === "learning" ? (
              <button
                onClick={() =>
                  toast.success("We'll notify you when this launches")
                }
                style={{
                  width: "100%",
                  background: "#0F2044",
                  color: "#fff",
                  border: "none",
                  padding: "14px",
                  borderRadius: 8,
                  fontSize: 16,
                  fontWeight: 700,
                  cursor: "pointer",
                  height: 48,
                }}
              >
                Notify me when available
              </button>
            ) : (
              <button
                onClick={() =>
                  navigate({
                    to: "/settings",
                    search: { addon: slug },
                  })
                }
                style={{
                  width: "100%",
                  background: "#00B5A5",
                  color: "#fff",
                  border: "none",
                  padding: "14px",
                  borderRadius: 8,
                  fontSize: 16,
                  fontWeight: 700,
                  cursor: "pointer",
                  height: 48,
                }}
              >
                Subscribe now →
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function CategoryIcon({ category }: { category: string }) {
  const Icon = CATEGORY_ICONS[category] || Star;
  return <Icon size={64} color="#0F2044" style={{ opacity: 0.3 }} />;
}
