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
    gradient: "linear-gradient(135deg, #1A52A0, #0F2044)",
    icon: MapPin,
    badge: "NEW",
    badgeBg: "#FFFFFF",
    badgeColor: "#1A52A0",
    category: "tracking",
    action: "plan",
    buttonText: "Add to plan →",
  },
  {
    id: "dashcam",
    title: "Front & Rear Dashcam",
    subtitle: "£39.99/month per vehicle",
    description: "HD recording, cloud storage, incident clips. Minimum 36-month term.",
    gradient: "linear-gradient(135deg, #CC2229, #7A1419)",
    icon: Camera,
    badge: null,
    badgeBg: "#FFFFFF",
    badgeColor: "#CC2229",
    category: "hardware",
    action: "plan",
    buttonText: "Add to plan →",
  },
  {
    id: "benenden-health",
    title: "Benenden Health",
    subtitle: "£21.99/month",
    description: "24/7 GP helpline, mental health support, hospital treatment. Includes DSM Pro.",
    gradient: "linear-gradient(135deg, #16A34A, #14532D)",
    icon: Heart,
    badge: "POPULAR",
    badgeBg: "#FFFFFF",
    badgeColor: "#16A34A",
    category: "health",
    action: "plan",
    buttonText: "Add to plan →",
  },
  {
    id: "vitality-health",
    title: "Vitality Health",
    subtitle: "£27.99/month",
    description: "Full private health insurance, rewards, virtual GP. Includes DSM Pro.",
    gradient: "linear-gradient(135deg, #7C3AED, #4C1D95)",
    icon: Activity,
    badge: null,
    badgeBg: "#FFFFFF",
    badgeColor: "#7C3AED",
    category: "health",
    action: "plan",
    buttonText: "Add to plan →",
  },
  {
    id: "cpd-courses",
    title: "CPD Courses",
    subtitle: "Coming soon",
    description: "Browse and book DVSA-approved CPD courses.",
    gradient: "linear-gradient(135deg, #D97706, #92400E)",
    icon: GraduationCap,
    badge: null,
    badgeBg: "#FFFFFF",
    badgeColor: "#D97706",
    category: "learning",
    action: "notify",
    buttonText: "Notify me →",
  },
  {
    id: "featured-listing",
    title: "Featured Listing",
    subtitle: "£14.99/month",
    description: "Get priority placement on EveryDriver search results.",
    gradient: "linear-gradient(135deg, #0891B2, #164E63)",
    icon: Star,
    badge: null,
    badgeBg: "#FFFFFF",
    badgeColor: "#0891B2",
    category: "promotion",
    action: "plan",
    buttonText: "Add to plan →",
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
      <>
        <div style={{ minHeight: "100vh", background: "#FFFFFF", fontFamily: "Poppins, sans-serif" }}>
          <div style={{ maxWidth: 480, margin: "0 auto" }}>
            {/* Top bar */}
            <div
              className="flex items-center"
              style={{
                background: "#0F2044",
                color: "#FFFFFF",
                padding: "12px 16px",
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
                  background: "none",
                  border: "none",
                  color: "#FFFFFF",
                  cursor: "pointer",
                  padding: 0,
                  marginRight: 12,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <ArrowLeft size={24} />
              </button>
              <h1
                className="font-bold"
                style={{ fontSize: 18, color: "#FFFFFF", fontFamily: "Poppins, sans-serif", margin: 0 }}
              >
                DSM Marketplace
              </h1>
            </div>

            {/* Hero */}
            <div style={{ padding: "24px 16px", background: "#F7FAFC" }}>
              <h2
                className="font-bold"
                style={{ fontSize: 18, color: "#0F2044", fontFamily: "Poppins, sans-serif", margin: 0 }}
              >
                Everything to grow your driving business
              </h2>
              <p
                style={{
                  fontSize: 13,
                  color: "#6B7280",
                  fontFamily: "Poppins, sans-serif",
                  marginTop: 6,
                  lineHeight: 1.4,
                }}
              >
                Health insurance, vehicle tracking, dashcams and more — all in one place.
              </p>
            </div>

            {/* Category tabs */}
            <div
              style={{
                display: "flex",
                gap: 8,
                overflowX: "auto",
                padding: "12px 16px",
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
                      fontFamily: "Poppins, sans-serif",
                      padding: "8px 16px",
                      borderRadius: 999,
                      border: "none",
                      cursor: "pointer",
                      background: isActive ? "#0F2044" : "#F3F4F6",
                      color: isActive ? "#FFFFFF" : "#374151",
                      transition: "background 0.15s ease, color 0.15s ease",
                    }}
                  >
                    {cat.label}
                  </button>
                );
              })}
            </div>

            {/* Product grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 pb-10">
              {filteredItems.map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.id}
                    style={{
                      position: "relative",
                      minHeight: 180,
                      borderRadius: 16,
                      overflow: "hidden",
                      background: item.gradient,
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "flex-end",
                    }}
                  >
                    {item.badge && (
                      <span
                        className="font-bold px-2 py-1 rounded-full"
                        style={{
                          position: "absolute",
                          top: 12,
                          left: 12,
                          fontSize: 10,
                          backgroundColor: item.badgeBg,
                          color: item.badgeColor,
                          fontFamily: "Poppins, sans-serif",
                          zIndex: 2,
                        }}
                      >
                        {item.badge}
                      </span>
                    )}
                    <Icon
                      size={64}
                      color="#FFFFFF"
                      style={{
                        position: "absolute",
                        top: 12,
                        right: 12,
                        opacity: 0.2,
                      }}
                      strokeWidth={1.5}
                    />
                    <div
                      style={{
                        padding: 16,
                        zIndex: 2,
                      }}
                    >
                      <div
                        className="font-bold"
                        style={{
                          fontSize: 15,
                          color: "#FFFFFF",
                          fontFamily: "Poppins, sans-serif",
                          lineHeight: 1.3,
                        }}
                      >
                        {item.title}
                      </div>
                      <div
                        style={{
                          fontSize: 12,
                          color: "rgba(255,255,255,0.85)",
                          fontFamily: "Poppins, sans-serif",
                          marginTop: 2,
                        }}
                      >
                        {item.subtitle}
                      </div>
                      <div
                        style={{
                          fontSize: 11,
                          color: "rgba(255,255,255,0.7)",
                          fontFamily: "Poppins, sans-serif",
                          marginTop: 6,
                          lineHeight: 1.35,
                          minHeight: 42,
                        }}
                      >
                        {item.description}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleAction(item)}
                        className="font-semibold w-full text-left"
                        style={{
                          marginTop: 10,
                          fontSize: 12,
                          color: "#FFFFFF",
                          fontFamily: "Poppins, sans-serif",
                          background: "rgba(255,255,255,0.2)",
                          border: "none",
                          borderRadius: 8,
                          padding: "8px 10px",
                          cursor: "pointer",
                          transition: "background 0.15s ease",
                        }}
                      >
                        {item.buttonText}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        <Outlet />
      </>
    );

  } catch (err) {
    console.error("[marketplace] render error:", err);
    return <div style={{ padding: 24, color: "red" }}>Error: {String(err)}</div>;
  }
}
