import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { IconCheck, IconCrown } from "@tabler/icons-react";
import InstructorTopBar from "@/components/dsm/InstructorTopBar";
import { SectionHeader } from "../components/dsm/SectionHeader";
import { Button } from "../components/dsm/Button";
import { supabase } from "../lib/supabaseClient";

export const Route = createFileRoute("/subscription")({
  head: () => ({
    meta: [
      { title: "My plan — DSM by EveryDriver" },
      { name: "description", content: "View your DSM plan and upgrade options." },
    ],
  }),
  component: SubscriptionPage,
});

const POPPINS = { fontFamily: "Poppins, sans-serif" } as const;

const DISPLAY_TIER_NAMES: Record<string, string> = {
  free: "DSM Free",
  website: "DSM Essential",
  pro: "DSM Pro",
  managed: "DSM Max",
};

function SubscriptionPage() {
  const navigate = useNavigate();

  const [userId, setUserId] = useState<string | null>(null);
  const [instructorName, setInstructorName] = useState<string>("");
  const [showCancelSheet, setShowCancelSheet] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [websiteTier, setWebsiteTier] = useState<string>("free");
  const [customDomain, setCustomDomain] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);
      const { data, error } = await supabase
        .from("instructors")
        .select("website_tier, custom_domain, name")
        .eq("id", user.id)
        .single();
      if (error) console.error("[subscription] load error", error);
      if (data) {
        setWebsiteTier(data.website_tier ?? "free");
        setCustomDomain(data.custom_domain ?? null);
        setInstructorName(data.name ?? "");
      }
    })();
  }, []);

  const TIER_LOSSES = useMemo<Record<string, { icon: string; text: string }[]>>(
    () => ({
      website: [
        {
          icon: "🌐",
          text: customDomain ? `Your domain ${customDomain}` : "Your custom domain",
        },
        { icon: "🎓", text: "Free DIA membership" },
        { icon: "🛡️", text: "HMCA health insurance rates" },
        { icon: "📊", text: "Website analytics" },
        { icon: "⭐", text: "Priority listing on EveryDriver" },
      ],
      pro: [
        { icon: "📞", text: "AI call answering" },
        { icon: "💬", text: "Live chat on your website" },
        { icon: "🏥", text: "pirkx GP and wellbeing access" },
        { icon: "🎁", text: "Perkbox 4,000+ discounts" },
        { icon: "❤️", text: "Bennenden health cover" },
        { icon: "🎓", text: "Free DIA membership" },
        { icon: "🗣️", text: "Ask DSM voice assistant" },
      ],
      managed: [
        { icon: "👤", text: "Your dedicated account manager" },
        { icon: "🌐", text: "Managed website service" },
        { icon: "📈", text: "SEO reporting and management" },
        { icon: "📞", text: "AI call answering" },
        { icon: "🏥", text: "All health benefits" },
        { icon: "🎓", text: "Free DIA membership" },
      ],
    }),
    [customDomain],
  );

  async function handleCancel() {
    if (!userId) return;
    setCancelling(true);
    try {
      await fetch(
        "https://bjpqxfrihwjcqprmoqfs.supabase.co/functions/v1/send-managed-enquiry-email",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey:
              "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJqcHF4ZnJpaHdqY3Fwcm1vcWZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE0NzQ4MjEsImV4cCI6MjA5NzA1MDgyMX0.HKlgx3dxP3uxX9wMRRUnfb0IPwaBpFcut_iUgT5XFeo",
          },
          body: JSON.stringify({
            instructor_name: instructorName,
            instructor_id: userId,
            tier: "cancellation_request",
          }),
        },
      );

      setShowCancelSheet(false);
      toast.success("Cancellation request received", {
        description: "Our team will process this within 24 hours and confirm by email.",
        duration: 8000,
      });
    } catch {
      toast.error("Could not send cancellation request. Please email info@everydriver.co.uk");
    } finally {
      setCancelling(false);
    }
  }

  const isPaid = websiteTier !== "free";

  return (
    <div className="min-h-screen pb-8" style={{ ...POPPINS, backgroundColor: "#F3F8FF", margin: -8 }}>
      {/* TOP BAR */}
      <InstructorTopBar
        firstName=""
        pageTitle="My plan"
        onBack={() => navigate({ to: "/settings" } as never)}
        onBell={() => navigate({ to: "/notifications" as never })}
        onPhone={() => navigate({ to: "/enquiries" as never })}
        onLiveTrack={() => navigate({ to: "/live" as never })}
        onMenu={() => navigate({ to: "/more" as never })}
        onMicPress={() => toast.info("Voice commands coming soon!")}
      />
      <div style={{ height: "calc(60px + env(safe-area-inset-top, 0px))" }} />

      {/* CURRENT PLAN CARD */}
      <div
        className="mx-4 mt-3"
        style={{
          backgroundColor: "#0B1F3A",
          borderRadius: 16,
          padding: 16,
        }}
      >
        <div
          style={{
            fontSize: 10,
            fontWeight: 700,
            color: "#9CA3AF",
            letterSpacing: 0.8,
            textTransform: "uppercase",
            marginBottom: 8,
          }}
        >
          CURRENT PLAN
        </div>
        <div style={{ fontSize: 24, fontWeight: 700, color: "#ffffff", marginBottom: 4 }}>
          {DISPLAY_TIER_NAMES[websiteTier] ?? "DSM Free"}
        </div>
        <div style={{ fontSize: 13, color: "#9CA3AF", marginBottom: 12 }}>
          {isPaid ? "All paid features included" : "All core features included"}
        </div>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            backgroundColor: "#1877D6",
            color: "#ffffff",
            fontSize: 11,
            fontWeight: 700,
            padding: "2px 8px",
            borderRadius: 20,
          }}
        >
          <span style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: "#ffffff" }} />
          Active
        </div>
      </div>

      {isPaid && (
        <div className="mx-4 mt-3 text-center">
          <button
            type="button"
            onClick={() => setShowCancelSheet(true)}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              fontSize: 13,
              color: "#9CA3AF",
              fontFamily: "Poppins, sans-serif",
              textDecoration: "underline",
            }}
          >
            Cancel subscription
          </button>
        </div>
      )}

      {/* UPGRADE TO PRO */}
      <div className="mx-4">
        <SectionHeader>UPGRADE TO PRO</SectionHeader>
      </div>
      <div
        className="mx-4"
        style={{
          backgroundColor: "#ffffff",
          border: "2px solid #1877D6",
          borderRadius: 16,
          padding: 16,
          position: "relative",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: "#0B1F3A" }}>DSM Pro</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#1877D6" }}>£19.99/month</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
          <Feature text="Unlimited pupils" />
          <Feature text="SMS reminders (requires Twilio)" />
          <Feature text="Advanced analytics" />
          <Feature text="Priority support" />
          <Feature text="White-label pupil portal" />
          <Feature text="API access" />
        </div>

        <Button
          variant="primary"
          onClick={() => {
            /* placeholder for Stripe checkout */
          }}
        >
          Upgrade to Pro
        </Button>

        {/* Coming soon badge */}
        <div
          style={{
            position: "absolute",
            top: 8,
            right: 8,
            backgroundColor: "#1877D6",
            color: "#ffffff",
            fontSize: 10,
            fontWeight: 700,
            padding: "2px 8px",
            borderRadius: 20,
          }}
        >
          Coming soon
        </div>
      </div>

      {/* FREE FEATURES */}
      <div className="mx-4">
        <SectionHeader>FEATURES INCLUDED FREE</SectionHeader>
      </div>
      <div
        className="mx-4"
        style={{
          backgroundColor: "#ffffff",
          borderRadius: 16,
          padding: 16,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <Feature text="Up to 50 pupils" />
          <Feature text="Schedule management" />
          <Feature text="Payments tracking" />
          <Feature text="Expenses & mileage" />
          <Feature text="Document vault" />
          <Feature text="And more..." />
        </div>
      </div>

      <div style={{ height: 24 }} />

      {/* CANCEL SUBSCRIPTION BOTTOM SHEET */}
      {showCancelSheet && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 300,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "flex-end",
          }}
          onClick={() => setShowCancelSheet(false)}
        >
          <div
            style={{
              background: "#EEF2F7",
              borderRadius: "22px 22px 0 0",
              padding: "0 0 40px",
              maxHeight: "90vh",
              overflowY: "auto",
              width: "100%",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Handle bar */}
            <div
              style={{
                width: 36,
                height: 5,
                background: "#D1D1D6",
                borderRadius: 3,
                margin: "12px auto 0",
              }}
            />

            {/* Warning header */}
            <div style={{ padding: "20px 16px 0", textAlign: "center" }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>⚠️</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: "#0B1F3A", marginBottom: 6 }}>
                Before you cancel
              </div>
              <div style={{ fontSize: 13, color: "#6B7686" }}>
                You'll immediately lose access to:
              </div>
            </div>

            {/* Loss list */}
            <div
              style={{
                margin: "16px 16px 0",
                background: "#fff",
                borderRadius: 16,
                border: "1px solid #E4E8EF",
                overflow: "hidden",
              }}
            >
              {(TIER_LOSSES[websiteTier] ?? TIER_LOSSES.website).map((item, index, arr) => (
                <div
                  key={item.text}
                  style={{
                    display: "flex",
                    gap: 12,
                    alignItems: "center",
                    padding: "13px 16px",
                    borderBottom: index === arr.length - 1 ? undefined : "1px solid #E4E8EF",
                  }}
                >
                  <span style={{ fontSize: 20, flexShrink: 0 }}>{item.icon}</span>
                  <span style={{ fontSize: 14, fontWeight: 500, color: "#0B1F3A" }}>
                    {item.text}
                  </span>
                </div>
              ))}
            </div>

            {/* DIA retention card */}
            <div
              style={{
                margin: "12px 16px 0",
                background: "#FEF3C7",
                borderRadius: 16,
                padding: "14px 16px",
                border: "1px solid #FDE68A",
                display: "flex",
                gap: 10,
                alignItems: "flex-start",
              }}
            >
              <span style={{ fontSize: 20, flexShrink: 0 }}>🎓</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#92400E" }}>
                  Your free DIA membership will end
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: "#92400E",
                    opacity: 0.8,
                    lineHeight: 1.4,
                    marginTop: 3,
                  }}
                >
                  DIA membership costs £99/year (plus £25 joining fee) independently.
                  This is included completely free with your DSM subscription.
                </div>
              </div>
            </div>

            {/* Keep my plan */}
            <button
              type="button"
              onClick={() => setShowCancelSheet(false)}
              disabled={cancelling}
              style={{
                margin: "16px 16px 0",
                width: "calc(100% - 32px)",
                background: "#0B1F3A",
                color: "#fff",
                borderRadius: 20,
                padding: 15,
                fontSize: 15,
                fontWeight: 800,
                border: "none",
                cursor: "pointer",
                fontFamily: "Poppins, sans-serif",
                boxShadow: "0 4px 0 #050D1C",
                opacity: cancelling ? 0.6 : 1,
              }}
            >
              Keep my subscription ✓
            </button>

            {/* Confirm cancel */}
            <div style={{ textAlign: "center", marginTop: 12, padding: "0 16px" }}>
              <button
                type="button"
                onClick={handleCancel}
                disabled={cancelling}
                style={{
                  background: "none",
                  border: "none",
                  cursor: cancelling ? "not-allowed" : "pointer",
                  fontSize: 12,
                  color: "#9CA3AF",
                  fontFamily: "Poppins, sans-serif",
                  textDecoration: "underline",
                }}
              >
                {cancelling ? "Cancelling..." : "I understand — cancel anyway"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Feature({ text }: { text: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <IconCheck size={16} color="#1877D6" stroke={3} />
      <span style={{ fontSize: 14, color: "#0B1F3A" }}>{text}</span>
    </div>
  );
}
