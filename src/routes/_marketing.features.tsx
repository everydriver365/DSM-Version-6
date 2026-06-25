import { createFileRoute } from "@tanstack/react-router";
import { Section, Eyebrow, H1, H2, Lead, PrimaryBtn, FeatureCard } from "../components/marketing/ui";

export const Route = createFileRoute("/_marketing/features")({
  head: () => ({
    meta: [
      { title: "Features — DSM by EveryDriver" },
      { name: "description", content: "Pupils, schedule, payments, EOL notes, mileage and more — every feature in DSM." },
      { property: "og:title", content: "DSM Features" },
      { property: "og:description", content: "Every tool a UK driving instructor needs, in one app." },
    ],
  }),
  component: FeaturesPage,
});

function FeaturesPage() {
  return (
    <>
      <Section padY={72}>
        <Eyebrow>Features</Eyebrow>
        <H1>Every tool you need to run your driving school.</H1>
        <Lead>
          DSM is built around the actual workflow of a UK driving instructor — fast, calm and out of your way.
        </Lead>
      </Section>

      <Section bg="#F8FAFC" padY={56}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16 }} className="dsm-features-grid">
          <FeatureCard icon="📅" title="Smart schedule" body="Sticky day headers, gap detection, status-coloured accent bars." />
          <FeatureCard icon="👥" title="Pupil profiles" body="Lesson history, progress, balances, test dates, lead source." />
          <FeatureCard icon="💳" title="In-app payments" body="Ryft card, Apple Pay, Google Pay and a scannable QR for the pupil." />
          <FeatureCard icon="📦" title="Block bookings" body="Record prepaid hours, automatic balance tracking and top-ups." />
          <FeatureCard icon="📝" title="End-of-lesson" body="Guided EOL wizard that updates pupil progress automatically." />
          <FeatureCard icon="🚗" title="Mileage logs" body="HMRC-friendly business mileage tracking." />
          <FeatureCard icon="⛽" title="Fuel & expenses" body="Log fill-ups and receipts ready for your accountant." />
          <FeatureCard icon="🧾" title="Tax & MTD" body="See earnings, expenses and tax position at a glance." />
          <FeatureCard icon="📨" title="Enquiries pipeline" body="New / accepted / declined sections with one-tap conversion." />
          <FeatureCard icon="📣" title="Bulk messaging" body="SMS your pupils about cancellations, offers or test prep." />
          <FeatureCard icon="📍" title="Saved locations" body="Pickups, drop-offs and favourite training spots." />
          <FeatureCard icon="🎓" title="Standards check" body="Track CPD, standards check prep and certifications." />
        </div>
        <style>{`
          @media (max-width: 880px) { .dsm-features-grid { grid-template-columns: 1fr 1fr !important; } }
          @media (max-width: 560px) { .dsm-features-grid { grid-template-columns: 1fr !important; } }
        `}</style>
      </Section>

      <Section padY={64}>
        <div style={{ textAlign: "center" }}>
          <H2>Ready to give it a go?</H2>
          <p style={{ color: "#64748B", margin: "12px 0 24px" }}>14 days free. No card required.</p>
          <PrimaryBtn to="/register">Start free trial</PrimaryBtn>
        </div>
      </Section>
    </>
  );
}
