import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ChevronLeft, Check, Crown } from "lucide-react";
import { SectionHeader } from "../components/dsm/SectionHeader";
import { Button } from "../components/dsm/Button";

export const Route = createFileRoute("/subscription")({
  head: () => ({
    meta: [
      { title: "My plan — DSM by EveryDriver" },
      { name: "description", content: "View your DSM plan and upgrade options." },
    ],
  }),
  component: SubscriptionPage,
});

const POPPINS = { fontFamily: "Inter, sans-serif" } as const;

function SubscriptionPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen pb-8" style={{ ...POPPINS, backgroundColor: "#F7F5EF", margin: -8 }}>
      {/* TOP BAR */}
      <div
        className="sticky top-0 z-40 h-[52px] px-4 flex items-center justify-between"
        style={{ backgroundColor: "#072b47" }}
      >
        <button
          type="button"
          aria-label="Back"
          onClick={() => navigate({ to: "/settings" })}
          className="flex items-center justify-center"
          style={{ width: 28, height: 28 }}
        >
          <ChevronLeft size={22} color="#ffffff" />
        </button>
        <div className="text-white text-[16px] font-semibold">My plan</div>
        <div style={{ width: 28 }} />
      </div>

      {/* CURRENT PLAN CARD */}
      <div
        className="mx-4 mt-3"
        style={{
          backgroundColor: "#0A2540",
          borderRadius: 12,
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
          DSM Free
        </div>
        <div style={{ fontSize: 13, color: "#9CA3AF", marginBottom: 12 }}>
          All core features included
        </div>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            backgroundColor: "#16A34A",
            color: "#ffffff",
            fontSize: 11,
            fontWeight: 700,
            padding: "2px 8px",
            borderRadius: 6,
          }}
        >
          <span style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: "#ffffff" }} />
          Active
        </div>
      </div>

      {/* UPGRADE TO PRO */}
      <div className="mx-4">
        <SectionHeader>UPGRADE TO PRO</SectionHeader>
      </div>
      <div
        className="mx-4"
        style={{
          backgroundColor: "#ffffff",
          border: "2px solid #0B7DDA",
          borderRadius: 12,
          padding: 16,
          position: "relative",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: "#0A2540" }}>DSM Pro</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#0B7DDA" }}>£19.99/month</div>
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
            backgroundColor: "#F59E0B",
            color: "#ffffff",
            fontSize: 10,
            fontWeight: 700,
            padding: "2px 8px",
            borderRadius: 6,
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
          borderRadius: 12,
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
    </div>
  );
}

function Feature({ text }: { text: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <Check size={16} color="#16A34A" strokeWidth={3} />
      <span style={{ fontSize: 14, color: "#0A2540" }}>{text}</span>
    </div>
  );
}
