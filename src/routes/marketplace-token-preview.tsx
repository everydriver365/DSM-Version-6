import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import MarketplaceTokenBanner, {
  type MarketplaceToken,
} from "@/components/marketplace/MarketplaceTokenBanner";

export const Route = createFileRoute("/marketplace-token-preview")({
  component: MarketplaceTokenPreview,
  head: () => ({
    meta: [
      { title: "Marketplace Promo Token Preview | DSM" },
      {
        name: "description",
        content:
          "Preview of the DSM marketplace promotional banner token before it goes live in the Discover feed.",
      },
      { property: "og:title", content: "Marketplace Promo Token Preview | DSM" },
      {
        property: "og:description",
        content:
          "Preview of the DSM marketplace promotional banner token before it goes live in the Discover feed.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

const TOKENS: MarketplaceToken[] = [
  {
    id: "grow",
    headline: "Grow your business",
    body: "Free test swap, online booking and more to help you succeed.",
    cta: "Learn more",
  },
  {
    id: "dashcam",
    headline: "Dashcam deals",
    body: "Protect every lesson with instructor-rated dual dashcams.",
    cta: "Shop now",
    background: "#1877D6",
  },
  {
    id: "cover",
    headline: "Income protection",
    body: "Cover your diary if illness stops you teaching. From £9/month.",
    cta: "Get a quote",
    background: "#14324F",
  },
  {
    id: "pupils",
    headline: "Fill your diary",
    body: "Get matched with learners searching in your coverage areas.",
    cta: "See pupils",
    background: "#0B1F3A",
  },
];

function MarketplaceTokenPreview() {
  const [active, setActive] = useState(0);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#F6F8FB",
        padding: 16,
        fontFamily: "Poppins, system-ui, sans-serif",
      }}
    >
      <h1
        style={{
          fontSize: 18,
          fontWeight: 700,
          color: "#0B1F3A",
          margin: "8px 0 4px",
        }}
      >
        Marketplace promo token
      </h1>
      <p style={{ fontSize: 13, color: "#64748B", margin: "0 0 16px" }}>
        Mock-up only — not wired into Discover yet.
      </p>

      <MarketplaceTokenBanner
        tokens={TOKENS}
        activeIndex={active}
        onDotPress={setActive}
        onSelect={(t) => console.log("token tapped", t.id)}
      />

      <p style={{ fontSize: 12, color: "#94A3B8", margin: "14px 0 8px" }}>
        All variants
      </p>
      <div style={{ display: "grid", gap: 12 }}>
        {TOKENS.map((t) => (
          <MarketplaceTokenBanner key={t.id} tokens={[t]} />
        ))}
      </div>
    </div>
  );
}
