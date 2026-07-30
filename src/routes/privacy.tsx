import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — DSM by EveryDriver" },
      { name: "description", content: "Privacy policy for DSM by EveryDriver." },
      { property: "og:title", content: "Privacy Policy — DSM by EveryDriver" },
      { property: "og:description", content: "Privacy policy for DSM by EveryDriver." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PrivacyPage,
});

const NAVY = "#0B1F3A";
const BLUE = "#1877D6";
const TEXT = "#374151";
const MUTED = "#6B7280";
const FONT = "'Poppins', system-ui, -apple-system, sans-serif";

function PrivacyPage() {
  return (
    <div style={{ minHeight: "100dvh", backgroundColor: "#fff", fontFamily: FONT }}>
      <header
        style={{
          height: 56,
          backgroundColor: NAVY,
          padding: "0 24px",
          display: "flex",
          alignItems: "center",
        }}
      >
        <span style={{ color: "#fff", fontSize: 18, fontWeight: 700 }}>
          DSM by <span style={{ color: BLUE }}>EveryDriver</span>
        </span>
      </header>

      <main
        style={{
          maxWidth: 760,
          margin: "0 auto",
          padding: "32px 24px 40px",
        }}
      >
        <h1 style={{ fontSize: 28, fontWeight: 700, color: NAVY, margin: "0 0 8px" }}>
          Privacy Policy
        </h1>
        <p style={{ fontSize: 13, color: MUTED, margin: "0 0 40px" }}>
          Last updated: 30 July 2026
        </p>

        <Section title="Who we are">
          <p>
            DSM by EveryDriver is a driving instructor management platform.
          </p>
          <p>Contact: hello@everydriver.co.uk</p>
        </Section>

        <Section title="What data we collect">
          <ul>
            <li>Account data: name, email, phone</li>
            <li>Pupil data: names, contact details, lesson history, test dates</li>
            <li>Lesson data: dates, times, locations, GPS routes, notes</li>
            <li>
              Payment data: transaction records — card numbers never stored, processed by Ryft
            </li>
            <li>Location data: GPS only when live tracking is active</li>
            <li>Calendar data: Google Calendar events when you connect via OAuth</li>
            <li>Usage data: feature usage, error logs</li>
          </ul>
        </Section>

        <Section title="How we use your data">
          <ul>
            <li>To provide the DSM platform</li>
            <li>To send lesson reminders and SMS to pupils on your behalf</li>
            <li>To sync lessons with Google Calendar when connected</li>
            <li>To process payments via Ryft</li>
            <li>To generate financial reports</li>
            <li>To improve the platform</li>
          </ul>
        </Section>

        <Section title="Google Calendar integration">
          <p>
            If you connect Google Calendar, DSM creates events when lessons are booked, updates them when rescheduled, and deletes them when cancelled.
          </p>
          <p>
            We request only the calendar.events scope — the minimum required. We do not read your existing calendar events or any other Google data.
          </p>
          <p>
            You can disconnect at any time from Settings → Calendar sync. Our use of Google Calendar data complies with the Google API Services User Data Policy including the Limited Use requirements.
          </p>
        </Section>

        <Section title="Data sharing">
          <p>
            We do not sell your data. We share only with: Supabase (database and auth), Ryft (payments), Twilio (SMS), Google (calendar sync when connected), Resend (email).
          </p>
        </Section>

        <Section title="Data retention">
          <p>
            Retained while your account is active. Deleted within 30 days of account closure except where required by law.
          </p>
        </Section>

        <Section title="Your rights">
          <p>
            Under UK GDPR you have the right to access, correct, export or delete your data. Email hello@everydriver.co.uk
          </p>
        </Section>

        <Section title="Cookies">
          <p>
            Only essential cookies for authentication and session management. No tracking or advertising cookies.
          </p>
        </Section>

        <Section title="Changes">
          <p>
            We will notify you of significant changes by email or in-app notification.
          </p>
        </Section>
      </main>

      <footer
        style={{
          borderTop: "1px solid #E5E7EB",
          padding: "24px",
          textAlign: "center",
          fontSize: 13,
          color: "#9CA3AF",
        }}
      >
        © 2026 EveryDriver Ltd ·{" "}
        <a href="/terms" style={{ color: "#9CA3AF", textDecoration: "none" }}>
          Terms
        </a>{" "}
        ·{" "}
        <a href="mailto:hello@everydriver.co.uk" style={{ color: "#9CA3AF", textDecoration: "none" }}>
          hello@everydriver.co.uk
        </a>
      </footer>
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

export default PrivacyPage;
