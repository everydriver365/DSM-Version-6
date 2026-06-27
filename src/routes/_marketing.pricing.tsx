import { createFileRoute, Link } from "@tanstack/react-router";
import { Section, Eyebrow, H1, H2, Lead, PrimaryBtn } from "../components/marketing/ui";

export const Route = createFileRoute("/_marketing/pricing")({
  head: () => ({
    meta: [
      { title: "Pricing — DSM by EveryDriver" },
      { name: "description", content: "Simple monthly pricing for UK driving instructors. 14-day free trial, no card required." },
      { property: "og:title", content: "DSM Pricing" },
      { property: "og:description", content: "One plan. Everything included. Cancel anytime." },
    ],
  }),
  component: PricingPage,
});

function PricingPage() {
  const features = [
    "Unlimited pupils & lessons",
    "Card, Apple Pay, Google Pay payments",
    "QR code payments for pupils",
    "End-of-lesson wizard",
    "Mileage, fuel & expense logs",
    "Bulk SMS to pupils",
    "Enquiry pipeline & conversion",
    "Block booking / prepaid hours",
    "Test day & standards check tools",
    "Free updates forever",
  ];

  return (
    <>
      <Section padY={72}>
        <div style={{ textAlign: "center" }}>
          <Eyebrow>Pricing</Eyebrow>
          <H1>One simple plan.</H1>
          <Lead>Everything included. No tiers, no add-ons, no nonsense.</Lead>
        </div>
      </Section>

      <Section padY={24}>
        <div
          style={{
            maxWidth: 480,
            margin: "0 auto",
            background: "#fff",
            border: "1px solid #E6E8EE",
            borderRadius: 24,
            padding: 36,
            boxShadow: "0 20px 60px -20px rgba(15,32,68,0.18)",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: 12, fontWeight: 600, color: "#009687", letterSpacing: "0.12em", textTransform: "uppercase" }}>
            DSM Professional
          </div>
          <div style={{ marginTop: 16, display: "flex", alignItems: "baseline", justifyContent: "center", gap: 6 }}>
            <span style={{ fontSize: 56, fontWeight: 800, color: "#0B1530", letterSpacing: -1 }}>£19</span>
            <span style={{ fontSize: 16, color: "#64748B" }}>/ month</span>
          </div>
          <p style={{ color: "#64748B", fontSize: 14, marginTop: 4 }}>Billed monthly. Cancel anytime.</p>

          <div style={{ margin: "28px 0", textAlign: "left", display: "flex", flexDirection: "column", gap: 10 }}>
            {features.map((f) => (
              <div key={f} style={{ display: "flex", gap: 10, alignItems: "center", fontSize: 14, color: "#0F172A" }}>
                <span style={{ color: "#16A34A", fontWeight: 700 }}>✓</span> {f}
              </div>
            ))}
          </div>

          <PrimaryBtn to="/register">Start 14-day free trial</PrimaryBtn>
          <p style={{ marginTop: 12, fontSize: 12, color: "#94A3B8" }}>No card required to start.</p>
        </div>
      </Section>

      <Section padY={64}>
        <div style={{ textAlign: "center" }}>
          <H2>Questions?</H2>
          <p style={{ color: "#64748B", margin: "12px 0 18px" }}>
            We're happy to chat — instructors talk to instructors.
          </p>
          <Link to="/contact" style={{ color: "#009687", fontWeight: 600, textDecoration: "none" }}>
            Get in touch →
          </Link>
        </div>
      </Section>
    </>
  );
}
