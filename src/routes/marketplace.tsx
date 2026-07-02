import { createFileRoute, useNavigate } from "@tanstack/react-router";
import type { CSSProperties, ComponentType } from "react";
import { useState } from "react";
import { toast } from "sonner";
import {
  ArrowLeft,
  MapPin,
  Camera,
  Heart,
  Activity,
  GraduationCap,
  Star,
} from "lucide-react";

export const Route = createFileRoute("/marketplace")({
  head: () => ({
    meta: [
      { title: "DSM Marketplace" },
      { name: "description", content: "Health insurance, vehicle tracking, dashcams and more for your driving school." },
    ],
  }),
  component: MarketplacePage,
});

interface IconProps {
  size?: number;
  color?: string;
  strokeWidth?: number;
  style?: CSSProperties;
}

interface MarketplaceItem {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  gradient: string;
  icon: ComponentType<IconProps>;
  iconColor: string;
  badge: string | null;
  badgeBg: string;
  badgeColor: string;
  category: "health" | "tracking" | "hardware" | "promotion" | "learning";
  action: "plan" | "notify";
  buttonText: string;
}

const marketplaceItems: MarketplaceItem[] = [
  {
    id: "gps-tracker",
    title: "GPS Tracker",
    subtitle: "£14.99/month per vehicle",
    description: "Live location, journey history, harsh event alerts, Geotab integration.",
    gradient: "linear-gradient(135deg, #1877D6, #0B1F3A)",
    icon: MapPin,
    iconColor: "#1877D6",
    badge: "NEW",
    badgeBg: "#1877D6",
    badgeColor: "#FFFFFF",
    category: "tracking",
    action: "plan",
    buttonText: "Add to plan",
  },
  {
    id: "dashcam",
    title: "Front & Rear Dashcam",
    subtitle: "£39.99/month per vehicle",
    description: "HD recording, cloud storage, incident clips. Minimum 36-month term.",
    gradient: "linear-gradient(135deg, #CC2229, #7A1419)",
    icon: Camera,
    iconColor: "#60A5FA",
    badge: null,
    badgeBg: "#FFFFFF",
    badgeColor: "#CC2229",
    category: "hardware",
    action: "plan",
    buttonText: "Add to plan",
  },
  {
    id: "benenden-health",
    title: "Benenden Health",
    subtitle: "£21.99/month",
    description: "24/7 GP helpline, mental health support, hospital treatment. Includes DSM Pro.",
    gradient: "linear-gradient(135deg, #16A34A, #14532D)",
    icon: Heart,
    iconColor: "#34D399",
    badge: "POPULAR",
    badgeBg: "#10B981",
    badgeColor: "#FFFFFF",
    category: "health",
    action: "plan",
    buttonText: "Add to plan",
  },
  {
    id: "vitality-health",
    title: "Vitality Health",
    subtitle: "£27.99/month",
    description: "Full private health insurance, rewards, virtual GP. Includes DSM Pro.",
    gradient: "linear-gradient(135deg, #7C3AED, #4C1D95)",
    icon: Activity,
    iconColor: "#F97316",
    badge: null,
    badgeBg: "#FFFFFF",
    badgeColor: "#7C3AED",
    category: "health",
    action: "plan",
    buttonText: "Add to plan",
  },
  {
    id: "cpd-courses",
    title: "CPD Courses",
    subtitle: "Coming soon",
    description: "Browse and book DVSA-approved CPD courses.",
    gradient: "linear-gradient(135deg, #D97706, #92400E)",
    icon: GraduationCap,
    iconColor: "#FBBF24",
    badge: null,
    badgeBg: "#FFFFFF",
    badgeColor: "#D97706",
    category: "learning",
    action: "notify",
    buttonText: "Notify me",
  },
  {
    id: "featured-listing",
    title: "Featured Listing",
    subtitle: "£14.99/month",
    description: "Get priority placement on EveryDriver search results.",
    gradient: "linear-gradient(135deg, #0891B2, #164E63)",
    icon: Star,
    iconColor: "#22D3EE",
    badge: null,
    badgeBg: "#FFFFFF",
    badgeColor: "#0891B2",
    category: "promotion",
    action: "plan",
    buttonText: "Add to plan",
  },
];

const categories: { key: string; label: string }[] = [
  { key: "all", label: "All" },
  { key: "health", label: "Health" },
  { key: "tracking", label: "Tracking" },
  { key: "hardware", label: "Hardware" },
  { key: "promotion", label: "Promotion" },
];

function MarketplacePage() {
  console.log("[marketplace] mounted");
  try {
    const navigate = useNavigate();
    const [activeCategory, setActiveCategory] = useState("all");

    const filteredItems =
      activeCategory === "all"
        ? marketplaceItems
        : marketplaceItems.filter((item) => item.category === activeCategory);

    const handleAction = (item: MarketplaceItem) => {
      if (item.action === "plan") {
        navigate({ to: "/settings" });
      } else {
        toast("We'll notify you when this launches", {
          description: "CPD Courses will be available soon.",
        });
      }
    };

    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#F3F8FF",
          fontFamily: "Inter, sans-serif",
          paddingBottom: 100,
        }}
      >
        <div style={{ maxWidth: 480, margin: "0 auto" }}>
          {/* Hero header */}
          <div
            style={{
              background: "#0B1F3A",
              padding: "48px 16px 40px",
              textAlign: "center",
              position: "relative",
              overflow: "hidden",
              borderRadius: "0 0 32px 32px",
            }}
          >
            <button
              type="button"
              onClick={() => navigate({ to: "/home" })}
              aria-label="Back"
              style={{
                position: "absolute",
                top: 16,
                left: 16,
                background: "none",
                border: "none",
                color: "#FFFFFF",
                cursor: "pointer",
                padding: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 2,
              }}
            >
              <ArrowLeft size={24} />
            </button>
            <h1
              className="font-bold"
              style={{
                fontSize: 28,
                color: "#FFFFFF",
                fontFamily: "Inter, sans-serif",
                margin: 0,
                position: "relative",
                zIndex: 1,
                letterSpacing: "-0.02em",
              }}
            >
              DSM Marketplace
            </h1>
            <p
              style={{
                fontSize: 14,
                color: "rgba(147,197,253,0.9)",
                fontFamily: "Inter, sans-serif",
                marginTop: 8,
                position: "relative",
                zIndex: 1,
              }}
            >
              Enhance your coverage with premium add-ons
            </p>
          </div>

          {/* Category tabs */}
          <div
            style={{
              display: "flex",
              gap: 8,
              overflowX: "auto",
              padding: "0 16px",
              marginTop: -20,
              position: "relative",
              zIndex: 2,
              scrollbarWidth: "none",
              WebkitOverflowScrolling: "touch",
            }}
          >
            {categories.map((cat) => {
              const isActive = activeCategory === cat.key;
              return (
                <button
                  key={cat.key}
                  type="button"
                  onClick={() => setActiveCategory(cat.key)}
                  className="font-semibold"
                  style={{
                    flexShrink: 0,
                    fontSize: 13,
                    fontFamily: "Inter, sans-serif",
                    padding: "10px 18px",
                    borderRadius: 999,
                    border: isActive ? "none" : "1px solid rgba(11,31,58,0.08)",
                    cursor: "pointer",
                    background: isActive ? "#1877D6" : "#FFFFFF",
                    color: isActive ? "#FFFFFF" : "#0B1F3A",
                    boxShadow: isActive
                      ? "0 4px 14px rgba(24,119,214,0.25)"
                      : "0 2px 8px rgba(11,31,58,0.04)",
                    transition: "background 0.15s ease, color 0.15s ease, box-shadow 0.15s ease",
                  }}
                >
                  {cat.label}
                </button>
              );
            })}
          </div>

          {/* Product grid */}
          <div
            className="grid grid-cols-2"
            style={{
              gap: 14,
              padding: "24px 16px",
            }}
          >
            {filteredItems.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.id}
                  className="flex flex-col"
                  style={{
                    background: "linear-gradient(135deg, #0B1F3A 0%, #162A45 100%)",
                    borderRadius: 24,
                    padding: 16,
                    boxShadow: "0 10px 24px -8px rgba(11,31,58,0.18)",
                    border: "1px solid rgba(255,255,255,0.05)",
                    minHeight: 210,
                  }}
                >
                  <div
                    className="flex justify-between items-start"
                    style={{ marginBottom: 12 }}
                  >
                    {item.badge ? (
                      <span
                        className="font-bold"
                        style={{
                          fontSize: 10,
                          textTransform: "uppercase",
                          letterSpacing: "0.04em",
                          padding: "3px 8px",
                          borderRadius: 999,
                          backgroundColor: item.badgeBg,
                          color: item.badgeColor,
                          fontFamily: "Inter, sans-serif",
                        }}
                      >
                        {item.badge}
                      </span>
                    ) : (
                      <span style={{ width: 1, height: 1 }} />
                    )}
                    <div style={{ color: item.iconColor, opacity: 0.85 }}>
                      <Icon size={22} color={item.iconColor} strokeWidth={1.5} />
                    </div>
                  </div>

                  <div
                    className="font-bold"
                    style={{
                      fontSize: 15,
                      color: "#FFFFFF",
                      fontFamily: "Inter, sans-serif",
                      lineHeight: 1.25,
                      marginBottom: 4,
                    }}
                  >
                    {item.title}
                  </div>

                  <div
                    style={{
                      fontSize: 14,
                      color: "#1877D6",
                      fontFamily: "Inter, sans-serif",
                      fontWeight: 700,
                      marginBottom: 6,
                    }}
                  >
                    {item.subtitle}
                  </div>

                  <div
                    style={{
                      fontSize: 11,
                      color: "rgba(255,255,255,0.55)",
                      fontFamily: "Inter, sans-serif",
                      lineHeight: 1.4,
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                      flexGrow: 1,
                    }}
                  >
                    {item.description}
                  </div>

                  <button
                    type="button"
                    onClick={() => handleAction(item)}
                    className="font-semibold"
                    style={{
                      marginTop: 12,
                      width: "100%",
                      fontSize: 12,
                      color: "#FFFFFF",
                      fontFamily: "Inter, sans-serif",
                      background: "rgba(255,255,255,0.1)",
                      border: "1px solid rgba(255,255,255,0.15)",
                      borderRadius: 12,
                      padding: "9px 10px",
                      cursor: "pointer",
                      transition: "background 0.15s ease",
                    }}
                  >
                    {item.buttonText}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );

  } catch (err) {
    console.error("[marketplace] render error:", err);
    return <div style={{ padding: 24, color: "red" }}>Error: {String(err)}</div>;
  }
}
