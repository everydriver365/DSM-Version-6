import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { tokens } from "@/lib/tokens";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { toast } from "sonner";

import { PageLoader } from "@/components/dsm/LoadingSpinner";
import {
  IconCircleCheck,
  IconWorld,
  IconRosetteDiscount,
  IconPhone,
  IconSparkles,
  IconChevronRight,
} from "@tabler/icons-react";

export const Route = createFileRoute("/subscription-success")({
  component: SubscriptionSuccessPage,
  validateSearch: (search) => ({
    tier: (search.tier as string) ?? "website",
    domain: (search.domain as string) ?? "",
  }),
  head: () => ({
    meta: [
      { title: "Subscription activated — DSM by EveryDriver" },
      { name: "description", content: "Your DSM subscription has been activated." },
      { property: "og:title", content: "Subscription activated — DSM by EveryDriver" },
      { property: "og:description", content: "Your DSM subscription has been activated." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

const TIER_NAMES: Record<string, string> = {
  website: "DSM Essential",
  pro: "DSM Pro",
  managed: "DSM Max",
};

const TIER_FEATURES: Record<string, string[]> = {
  website: [
    "Your own .co.uk domain",
    'Remove "Powered by EveryDriver"',
    "Gallery and video intro",
    "Analytics dashboard",
    "Free DIA membership",
    "HMCA health insurance rates",
  ],
  pro: [
    "Everything in Essential",
    "AI call answering",
    "Live chat on your website",
    "Your own DSM phone number",
    "pirkx GP and wellbeing access",
    "Perkbox 4,000+ discounts",
    "Bennenden health cover",
    "Siri and Ask DSM voice",
  ],
  managed: [
    "Everything in Pro",
    "We build your website for you",
    "Monthly content updates",
    "SEO reporting and management",
    "Google Business Profile setup",
    "Dedicated account manager",
    "CarPlay integration",
  ],
};

const POPPINS = { fontFamily: "Poppins, sans-serif" } as const;

function SubscriptionSuccessPage() {
  const search = Route.useSearch();
  const tier = search.tier ?? "website";
  const domain = search.domain ?? "";
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [activated, setActivated] = useState(false);
  const [websiteTier, setWebsiteTier] = useState<string>("free");

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate({ to: "/login" as never });
        return;
      }

      // Poll for subscription activation (webhook may take a few seconds)
      let attempts = 0;
      const interval = setInterval(async () => {
        attempts++;
        const { data } = await supabase
          .from("instructors")
          .select("website_tier")
          .eq("id", user.id)
          .single();

        if (data?.website_tier !== "free" && data?.website_tier) {
          setWebsiteTier(data.website_tier);
          setActivated(true);
          setLoading(false);
          clearInterval(interval);
          toast.success("Subscription activated!");
        }

        // Give up after 30 seconds
        if (attempts >= 15) {
          setLoading(false);
          clearInterval(interval);
        }
      }, 2000);

      return () => clearInterval(interval);
    })();
  }, [navigate]);

  const sectionLabelStyle: React.CSSProperties = {
    fontSize: tokens.fontSize.sm,
    fontWeight: tokens.fontWeight.semibold,
    color: tokens.textMuted,
    textTransform: "uppercase",
    marginBottom: 8,
  };

  const successCard = (
    <div
      style={{
        background: "linear-gradient(135deg, #15803D, #15803D)",
        borderRadius: 8,
        padding: "28px 24px",
        textAlign: "center",
        marginBottom: 20,
        boxShadow: "0 4px 0 #14532D",
      }}
    >
      <IconCircleCheck
        size={56}
        color="#fff"
        stroke={1.5}
        style={{ margin: "0 auto 16px", display: "block" }}
      />
      <div style={{ fontSize: 24, fontWeight: tokens.fontWeight.extrabold, color: "#fff", marginBottom: 8 }}>
        You're all set! 🎉
      </div>
      <div style={{ fontSize: tokens.fontSize.md, color: "rgba(255,255,255,0.8)" }}>
        {TIER_NAMES[tier] ?? "Your plan"} is now active
      </div>
      {domain && (
        <div
          style={{
            marginTop: 12,
            backgroundColor: "rgba(255,255,255,0.2)",
            borderRadius: 8,
            padding: "6px 16px",
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <IconWorld size={14} color="#fff" stroke={1.5} />
          <span style={{ fontSize: 12, color: "#fff", fontWeight: 600 }}>
            {domain} being set up
          </span>
        </div>
      )}
    </div>
  );

  const whatsIncluded = (
    <>
      <div style={sectionLabelStyle}>What's included</div>
      <div
        style={{
          background: "#fff",
          borderRadius: 8,
          border: "1px solid #E4E8EF",
          overflow: "hidden",
          marginBottom: 16,
        }}
      >
        {(TIER_FEATURES[tier] ?? TIER_FEATURES.website).map((feature, index, arr) => (
          <div
            key={feature}
            style={{
              display: "flex",
              gap: 12,
              alignItems: "center",
              padding: "12px 16px",
              borderBottom: index === arr.length - 1 ? undefined : "1px solid #E4E8EF",
            }}
          >
            <IconCircleCheck size={16} color="#15803D" stroke={2} />
            <span style={{ fontSize: tokens.fontSize.md, color: tokens.navy, fontWeight: 500 }}>
              {feature}
            </span>
          </div>
        ))}
      </div>
    </>
  );

  const actionCardBase: React.CSSProperties = {
    background: "#fff",
    borderRadius: 8,
    border: "1px solid #E4E8EF",
    padding: "14px 16px",
    display: "flex",
    gap: 12,
    alignItems: "center",
    marginBottom: 8,
    cursor: "pointer",
  };

  const nextSteps = (
    <>
      <div style={sectionLabelStyle}>Next steps</div>

      <div style={actionCardBase} onClick={() => navigate({ to: "/minisite" as never })}>
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: "50%",
            background: "#EFF6FF",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <IconWorld size={20} color="#1877D6" stroke={1.5} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: tokens.fontSize.md, fontWeight: tokens.fontWeight.bold, color: tokens.navy }}>
            Set up your website
          </div>
          <div style={{ fontSize: 12, color: tokens.textSecondary, marginTop: 2 }}>
            Customise your mini-site
          </div>
        </div>
        <IconChevronRight size={16} color="#C7D0DC" stroke={2} />
      </div>

      <div style={actionCardBase} onClick={() => navigate({ to: "/benefits" as never })}>
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: "50%",
            background: "#EDE9FE",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <IconRosetteDiscount size={20} color="#7C3AED" stroke={1.5} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: tokens.fontSize.md, fontWeight: tokens.fontWeight.bold, color: tokens.navy }}>
            Access your benefits
          </div>
          <div style={{ fontSize: 12, color: tokens.textSecondary, marginTop: 2 }}>
            DIA membership, health cover and more
          </div>
        </div>
        <IconChevronRight size={16} color="#C7D0DC" stroke={2} />
      </div>

      {(tier === "pro" || tier === "managed") && (
        <div style={actionCardBase} onClick={() => navigate({ to: "/settings" as never })}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: "50%",
              background: "#F0FDF4",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <IconPhone size={20} color="#15803D" stroke={1.5} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: tokens.fontSize.md, fontWeight: tokens.fontWeight.bold, color: tokens.navy }}>
              Set up AI call answering
            </div>
            <div style={{ fontSize: 12, color: tokens.textSecondary, marginTop: 2 }}>
              Record your voice and activate your DSM number
            </div>
          </div>
          <IconChevronRight size={16} color="#C7D0DC" stroke={2} />
        </div>
      )}
    </>
  );

  const domainStatus = (
    <div
      style={{
        background: "#FEF3C7",
        borderRadius: 8,
        padding: "14px 16px",
        display: "flex",
        gap: 12,
        alignItems: "flex-start",
        marginBottom: 16,
        border: "1px solid #FDE68A",
      }}
    >
      <IconWorld
        size={18}
        color="#B45309"
        stroke={1.5}
        style={{ marginTop: 2, flexShrink: 0 }}
      />
      <div>
        <div style={{ fontSize: tokens.fontSize.md, fontWeight: tokens.fontWeight.bold, color: "#B45309" }}>{domain}</div>
        <div
          style={{
            fontSize: 12,
            color: "#B45309",
            opacity: 0.8,
            lineHeight: 1.5,
            marginTop: 4,
          }}
        >
          Your domain is being registered and DNS is being configured. This takes up to 24
          hours — we'll notify you when it's live.
        </div>
      </div>
    </div>
  );

  const goToDSMButton = (
    <button
      style={{
        marginTop: 8,
        width: "100%",
        background: tokens.navy,
        color: "#fff",
        borderRadius: 8,
        padding: 15,
        fontSize: 15,
        fontWeight: tokens.fontWeight.extrabold,
        border: "none",
        cursor: "pointer",
        fontFamily: "Poppins, sans-serif",
        boxShadow: "0 4px 0 #050D1C",
      }}
      onClick={() => navigate({ to: "/" as never })}
    >
      Go to DSM →
    </button>
  );

  const manualCheckCard = (
    <div
      style={{
        background: "#fff",
        borderRadius: 8,
        border: "1px solid #E4E8EF",
        padding: 20,
        textAlign: "center",
        marginBottom: 16,
      }}
    >
      <div style={{ fontSize: tokens.fontSize.lg, fontWeight: tokens.fontWeight.bold, color: tokens.navy, marginBottom: 8 }}>
        Taking longer than expected
      </div>
      <div style={{ fontSize: tokens.fontSize.base, color: tokens.textSecondary, lineHeight: 1.5, marginBottom: 16 }}>
        Your payment was received. If your subscription hasn't activated in a few minutes, contact
        us at info@everydriver.co.uk
      </div>
      {goToDSMButton}
      <div
        style={{ fontSize: 12, color: tokens.blue, marginTop: 12, cursor: "pointer" }}
        onClick={() =>
          window.open(
            "mailto:info@everydriver.co.uk?subject=Subscription activation issue",
            "_blank",
          )
        }
      >
        Contact support
      </div>
    </div>
  );

  return (
    <div
      style={{
        ...POPPINS,
        backgroundColor: tokens.canvas,
        minHeight: "100vh",
        paddingBottom: 40,
      }}
    >
      <div
        style={{
          backgroundColor: tokens.navy,
          borderRadius: "0 0 8px 8px",
          padding: "20px 16px",
          textAlign: "center",
          color: "#fff",
        }}
      >
        <div style={{ fontSize: tokens.fontSize.xl, fontWeight: 800 }}>Subscription activated</div>
      </div>

      <div style={{ maxWidth: 480, margin: "0 auto", padding: "24px 16px" }}>
        {loading && (
          <div style={{ textAlign: "center", marginTop: 40 }}>
            <PageLoader />
            <div
              style={{
                fontSize: tokens.fontSize.md,
                color: tokens.textSecondary,
                textAlign: "center",
                marginTop: 16,
              }}
            >
              Activating your subscription...
            </div>
          </div>
        )}

        {!loading && activated && (
          <>
            {successCard}
            {whatsIncluded}
            {nextSteps}
            {domain && domainStatus}
            {goToDSMButton}
          </>
        )}

        {!loading && !activated && (
          <>
            {manualCheckCard}
          </>
        )}
      </div>
    </div>
  );
}

export default SubscriptionSuccessPage;
