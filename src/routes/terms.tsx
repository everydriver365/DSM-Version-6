import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Service — DSM by EveryDriver" },
      { name: "description", content: "Terms of Service for DSM by EveryDriver." },
      { property: "og:title", content: "Terms of Service — DSM by EveryDriver" },
      { property: "og:description", content: "Terms of Service for DSM by EveryDriver." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TermsPage,
});

const NAVY = "#0B1F3A";
const BLUE = "#1877D6";
const BG = "#F8F9FB";
const TEXT = "#374151";
const FONT = "'Poppins', system-ui, -apple-system, sans-serif";

function TermsPage() {
  return (
    <div style={{ minHeight: "100dvh", backgroundColor: BG, fontFamily: FONT }}>
      {/* Header */}
      <header
        style={{
          backgroundColor: NAVY,
          padding: "16px 20px",
          display: "flex",
          alignItems: "center",
        }}
      >
        <span style={{ color: "#fff", fontSize: 18, fontWeight: 600 }}>
          DSM by <span style={{ color: BLUE }}>EveryDriver</span>
        </span>
      </header>

      {/* Content */}
      <main
        style={{
          maxWidth: 760,
          margin: "0 auto",
          padding: "40px 20px 80px",
        }}
      >
        <h1
          style={{
            fontSize: 28,
            fontWeight: 700,
            color: NAVY,
            margin: "0 0 8px",
          }}
        >
          Terms of Service
        </h1>
        <p style={{ fontSize: 14, color: "#6B7280", margin: "0 0 32px" }}>
          Last updated: 30 July 2026
        </p>

        <Section title="1. Agreement">
          <p>
            By creating an account on DSM by EveryDriver you agree to these terms.
          </p>
        </Section>

        <Section title="2. The service">
          <p>
            DSM is a business management platform for driving instructors and driving schools in the UK, including lesson scheduling, pupil management, payment processing, live tracking and related features.
          </p>
        </Section>

        <Section title="3. Your account">
          <ul>
            <li>You must be a legitimate driving instructor or driving school operator</li>
            <li>You are responsible for maintaining security of your login credentials</li>
            <li>You must not share your account or use it for unlawful purposes</li>
            <li>You are responsible for all activity under your account</li>
          </ul>
        </Section>

        <Section title="4. Pupil data">
          <p>
            You are the data controller for your pupils' personal data. You are responsible for complying with UK GDPR. DSM processes pupil data as your data processor.
          </p>
        </Section>

        <Section title="5. Payments">
          <p>
            Payment processing is handled by Ryft. A platform fee of 1% applies to single card payments. Course payments use the school skim amount. Fees subject to change with 30 days notice.
          </p>
        </Section>

        <Section title="6. Google Calendar integration">
          <p>
            If you connect Google Calendar, you authorise DSM to create, update and delete calendar events on your behalf. We only access data needed to sync your DSM lessons. You can revoke access at any time from Settings.
          </p>
        </Section>

        <Section title="7. Live tracking">
          <p>
            You are responsible for informing pupils that GPS routes may be recorded and for complying with applicable data protection obligations.
          </p>
        </Section>

        <Section title="8. Acceptable use">
          <p>
            You must not use DSM to harass pupils or users, send unsolicited messages, attempt unauthorised access, or violate UK law.
          </p>
        </Section>

        <Section title="9. Availability">
          <p>
            We aim for high availability but do not guarantee uninterrupted access.
          </p>
        </Section>

        <Section title="10. Termination">
          <p>
            You may close your account at any time. Data deleted within 30 days of termination except where retention is required by law.
          </p>
        </Section>

        <Section title="11. Limitation of liability">
          <p>
            DSM's liability is limited to fees paid in the three months preceding any claim. We are not liable for indirect or consequential losses.
          </p>
        </Section>

        <Section title="12. Governing law">
          <p>
            Governed by the laws of England and Wales.
          </p>
        </Section>

        <Section title="13. Contact">
          <p>hello@everydriver.co.uk</p>
        </Section>
      </main>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 28 }}>
      <h2
        style={{
          fontSize: 16,
          fontWeight: 600,
          color: NAVY,
          margin: "0 0 12px",
        }}
      >
        {title}
      </h2>
      <div
        style={{
          fontSize: 14,
          fontWeight: 400,
          color: TEXT,
          lineHeight: 1.6,
        }}
      >
        {children}
      </div>
    </section>
  );
}

export default TermsPage;
