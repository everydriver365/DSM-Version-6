import { createFileRoute } from "@tanstack/react-router";
import { Section, Eyebrow, H1, H2, Lead, PrimaryBtn } from "../components/marketing/ui";

export const Route = createFileRoute("/_marketing/about")({
  head: () => ({
    meta: [
      { title: "About — DSM by EveryDriver" },
      { name: "description", content: "DSM is built by EveryDriver in Winchester, Hampshire — for UK driving instructors who deserve better tools." },
      { property: "og:title", content: "About DSM" },
      { property: "og:description", content: "Built by EveryDriver in Winchester, Hampshire — for UK driving instructors." },
    ],
  }),
  component: AboutPage,
});

function AboutPage() {
  return (
    <>
      <Section padY={72}>
        <Eyebrow>About</Eyebrow>
        <H1>Built by instructors, for instructors.</H1>
        <Lead>
          DSM is made by the team at EveryDriver in Winchester, Hampshire. We've spent years working alongside
          UK driving instructors — and we kept hearing the same thing: the existing tools were clunky, expensive
          and built for desktops. So we made a new one.
        </Lead>
      </Section>

      <Section bg="#F8FAFC" padY={56}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }} className="dsm-about-grid">
          {[
            { t: "Phone-first", b: "Everything is designed to be used standing next to the car, between lessons, on a phone." },
            { t: "Quietly powerful", b: "We hide complexity rather than show it off. If a feature feels heavy, we redesign it." },
            { t: "UK-specific", b: "VAT, MTD, DVSA standards check, intensive courses — we know how it actually works here." },
            { t: "No lock-in", b: "Your data is yours. Export anytime. Cancel anytime. We earn the renewal every month." },
          ].map((v) => (
            <div key={v.t} style={{ background: "#fff", border: "1px solid #E6E8EE", borderRadius: 16, padding: 24 }}>
              <h3 style={{ margin: 0, fontSize: 17, color: "#0B1530", fontWeight: 700 }}>{v.t}</h3>
              <p style={{ margin: "8px 0 0", fontSize: 14, color: "#475569", lineHeight: 1.6 }}>{v.b}</p>
            </div>
          ))}
        </div>
        <style>{`@media (max-width: 720px){.dsm-about-grid{grid-template-columns:1fr !important;}}`}</style>
      </Section>

      <Section padY={64}>
        <div style={{ textAlign: "center" }}>
          <H2>Come on board.</H2>
          <p style={{ color: "#64748B", margin: "12px 0 24px" }}>Join instructors across the UK already using DSM.</p>
          <PrimaryBtn to="/register">Start free trial</PrimaryBtn>
        </div>
      </Section>
    </>
  );
}
