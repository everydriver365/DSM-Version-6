import { createFileRoute } from "@tanstack/react-router";
import { Section, Eyebrow, H1, H2, Lead, PrimaryBtn } from "../components/marketing/ui";

export const Route = createFileRoute("/_marketing/how-it-works")({
  head: () => ({
    meta: [
      { title: "How it works — DSM by EveryDriver" },
      { name: "description", content: "Get set up in minutes. Add pupils, schedule lessons, take payments and complete EOL — all in one app." },
      { property: "og:title", content: "How DSM works" },
      { property: "og:description", content: "From signup to your first lesson in under 10 minutes." },
    ],
  }),
  component: HowItWorksPage,
});

const steps = [
  { n: "1", t: "Sign up", b: "Create your instructor account in under 60 seconds. Email & password — that's it." },
  { n: "2", t: "Add your pupils", b: "Quick-add by name & phone, or import from a CSV. Capture lead source and block bookings as you go." },
  { n: "3", t: "Schedule lessons", b: "Tap an empty slot to book. DSM surfaces gaps and clashes automatically." },
  { n: "4", t: "Run the lesson", b: "Sat-nav, live session view, and a quick End-of-Lesson wizard when you finish." },
  { n: "5", t: "Take payment", b: "Card, Apple Pay, Google Pay — or a QR code the pupil scans from their phone." },
  { n: "6", t: "Track everything", b: "Earnings, mileage, fuel, MTD-ready tax view and progress reports for each pupil." },
];

function HowItWorksPage() {
  return (
    <>
      <Section padY={72}>
        <Eyebrow>How it works</Eyebrow>
        <H1>From signup to your first lesson in under 10 minutes.</H1>
        <Lead>DSM is designed to feel obvious. No training, no manual, no fuss.</Lead>
      </Section>

      <Section padY={24}>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {steps.map((s) => (
            <div
              key={s.n}
              style={{
                display: "grid",
                gridTemplateColumns: "64px 1fr",
                gap: 20,
                padding: 24,
                background: "#fff",
                border: "1px solid #E6E8EE",
                borderRadius: 16,
                alignItems: "start",
              }}
            >
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 14,
                  background: "linear-gradient(135deg,#0F2044,#1E40AF)",
                  color: "#fff",
                  display: "grid",
                  placeItems: "center",
                  fontWeight: 800,
                  fontSize: 22,
                }}
              >
                {s.n}
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: 18, color: "#0B1530", fontWeight: 700 }}>{s.t}</h3>
                <p style={{ margin: "6px 0 0", color: "#475569", fontSize: 15, lineHeight: 1.6 }}>{s.b}</p>
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section padY={64}>
        <div style={{ textAlign: "center" }}>
          <H2>Ready?</H2>
          <p style={{ color: "#64748B", margin: "12px 0 24px" }}>14 days free. No card required.</p>
          <PrimaryBtn to="/register">Start free trial</PrimaryBtn>
        </div>
      </Section>
    </>
  );
}
