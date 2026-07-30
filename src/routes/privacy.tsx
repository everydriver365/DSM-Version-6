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
const BG = "#F8F9FB";
const TEXT = "#374151";
const FONT = "'Poppins', system-ui, -apple-system, sans-serif";

function PrivacyPage() {
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
          Privacy Policy
        </h1>
        <p style={{ fontSize: 14, color: "#6B7280", margin: "0 0 32px" }}>
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
            <li>
              Account data: name, email, phone, business details
            </li>
            <li>
              Pupil data: names, contact details, lesson history, test dates, progress
            </li>
            <li>
              Lesson data: dates, times, locations, routes, notes
            </li>
            <li>
              Payment data: transaction records (card numbers never stored — processed by Ryft)
            </li>
            <li>
              Location data: GPS coordinates during live tracking only when active
            </li>
            <li>
              Calendar data: if you connect Google Calendar, we read/write events using OAuth2 you explicitly grant
            </li>
            <li>
              Usage data: feature usage, session logs, error reports
            </li>
          </ul>
        </Section>

        <Section title="How we use your data">
          <ul>
            <li>To provide and operate the DSM platform</li>
            <li>To send lesson reminders and SMS messages to pupils on your behalf</li>
            <li>To sync lessons with Google Calendar when you connect your account</li>
            <li>To process payments through Ryft</li>
            <li>To generate reports and financial summaries</li>
            <li>To improve the platform and fix issues</li>
          </ul>
        </Section>

        <Section title="Google Calendar integration">
          <p>
            If you connect Google Calendar, DSM will create events when lessons are booked, update them when rescheduled, and delete them when cancelled.
          </p>
          <p>
            We request only the calendar.events scope — the minimum required. We do not read your existing calendar events or any other Google data.
          </p>
          <p>
            You can disconnect at any time from Settings → Calendar sync. Our use complies with the Google API Services User Data Policy including the Limited Use requirements.
          </p>
        </Section>

        <Section title="Data sharing">
          <p>
            We do not sell your data. We share data only with: Supabase (database/auth), Ryft (payments), Twilio (SMS), Google (calendar sync when connected), Resend (email).
          </p>
        </Section>

        <Section title="Data retention">
          <p>
            Data retained while account is active. Deleted within 30 days of account closure except where required by law.
          </p>
        </Section>

        <Section title="Your rights">
          <p>
            Under UK GDPR you have the right to access, correct, export or delete your data. Contact hello@everydriver.co.uk
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
