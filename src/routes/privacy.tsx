import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { tokens } from "@/lib/tokens";
import DSMTopSheet from "@/components/dsm/DSMTopSheet";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — DSM by EveryDriver" },
      { name: "description", content: "How DSM by EveryDriver collects, uses and stores your data." },
      { property: "og:title", content: "Privacy Policy — DSM by EveryDriver" },
      { property: "og:description", content: "How DSM by EveryDriver collects, uses and stores your data." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PrivacyPage,
});

const POPPINS = { fontFamily: "Poppins, sans-serif" } as const;

const sections: { title: string; content: React.ReactNode }[] = [
  {
    title: "1. WHO WE ARE",
    content: (
      <>
        <p>
          EveryDriver Ltd operates DSM (Driving School Manager), a management application for UK driving instructors.
        </p>
        <p style={{ marginTop: 8 }}>
          Contact: <a href="mailto:hello@everydriver.co.uk" style={{ color: tokens.blue }}>hello@everydriver.co.uk</a>
        </p>
      </>
    ),
  },
  {
    title: "2. WHAT DATA WE COLLECT",
    content: (
      <ul>
        <li>Name and email address (account)</li>
        <li>Business information (instructor details, pricing, availability)</li>
        <li>Pupil information (name, phone, email, lesson history)</li>
        <li>Location data (only during Live Track sessions, not stored permanently)</li>
        <li>Payment records (amounts, dates — no card details stored)</li>
        <li>Device information (for push notifications)</li>
        <li>Google Calendar data (if connected)</li>
      </ul>
    ),
  },
  {
    title: "3. HOW WE USE YOUR DATA",
    content: (
      <ul>
        <li>To provide DSM services</li>
        <li>To send lesson reminders and notifications</li>
        <li>To generate reports and analytics for your business</li>
        <li>To improve the app</li>
      </ul>
    ),
  },
  {
    title: "4. DATA STORAGE",
    content: (
      <>
        <p>All data is stored securely using Supabase (EU region).</p>
        <p style={{ marginTop: 8 }}>We never sell your data to third parties.</p>
      </>
    ),
  },
  {
    title: "5. PUSH NOTIFICATIONS",
    content: (
      <>
        <p>We use OneSignal to deliver push notifications.</p>
        <p style={{ marginTop: 8 }}>You can disable notifications in your iPhone settings at any time.</p>
      </>
    ),
  },
  {
    title: "6. GOOGLE CALENDAR",
    content: (
      <>
        <p>If you connect Google Calendar, we store access tokens to sync your lessons.</p>
        <p style={{ marginTop: 8 }}>You can disconnect at any time in Settings.</p>
      </>
    ),
  },
  {
    title: "7. YOUR RIGHTS",
    content: (
      <>
        <p>Under UK GDPR you have the right to:</p>
        <ul>
          <li>Access your data</li>
          <li>Correct your data</li>
          <li>Delete your account and data</li>
          <li>Export your data</li>
        </ul>
        <p style={{ marginTop: 8 }}>
          To exercise these rights contact: <a href="mailto:hello@everydriver.co.uk" style={{ color: tokens.blue }}>hello@everydriver.co.uk</a>
        </p>
      </>
    ),
  },
  {
    title: "8. COOKIES",
    content: <p>DSM uses essential cookies only for authentication.</p>,
  },
  {
    title: "9. CHANGES",
    content: <p>We may update this policy. We will notify you of significant changes via the app.</p>,
  },
  {
    title: "10. CONTACT",
    content: (
      <>
        <p>EveryDriver Ltd</p>
        <p style={{ marginTop: 4 }}>
          <a href="mailto:hello@everydriver.co.uk" style={{ color: tokens.blue }}>hello@everydriver.co.uk</a>
        </p>
        <p style={{ marginTop: 4 }}>
          <a href="https://drivingschoolmanager.co.uk" target="_blank" rel="noopener noreferrer" style={{ color: tokens.blue }}>
            drivingschoolmanager.co.uk
          </a>
        </p>
      </>
    ),
  },
];

function PrivacyPage() {
  const navigate = useNavigate();

  return (
    <DSMTopSheet
      title="Privacy Policy"
      onBack={() => navigate({ to: "/settings" })}
    >
      <div
        style={{
          padding: "20px 16px 28px",
          ...POPPINS,
        }}
      >
        <div
          style={{
            marginBottom: 24,
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: tokens.fontSize.base,
              fontWeight: tokens.fontWeight.semibold,
              color: tokens.blue,
              textTransform: "uppercase",
              letterSpacing: "0.5px",
            }}
          >
            DSM by EveryDriver
          </p>
          <h1
            style={{
              margin: "6px 0 4px",
              fontSize: 26,
              fontWeight: tokens.fontWeight.bold,
              color: tokens.navy,
              lineHeight: "32px",
            }}
          >
            Privacy Policy
          </h1>
          <p
            style={{
              margin: 0,
              fontSize: tokens.fontSize.base,
              color: "#6B7280",
            }}
          >
            Last updated: August 2026
          </p>
        </div>

        {sections.map((section) => (
          <div
            key={section.title}
            style={{
              background: tokens.canvas,
              borderRadius: 12,
              padding: "16px",
              marginBottom: 14,
            }}
          >
            <h2
              style={{
                margin: "0 0 10px",
                fontSize: tokens.fontSize.md,
                fontWeight: tokens.fontWeight.bold,
                color: tokens.navy,
                letterSpacing: "0.3px",
              }}
            >
              {section.title}
            </h2>
            <div
              style={{
                fontSize: tokens.fontSize.md,
                lineHeight: "22px",
                color: "#374151",
              }}
            >
              {section.content}
            </div>
          </div>
        ))}

        <p
          style={{
            marginTop: 10,
            fontSize: 12,
            color: "#8A8A8E",
            textAlign: "center",
          }}
        >
          © 2026 EveryDriver Ltd. All rights reserved.
        </p>
      </div>
    </DSMTopSheet>
  );
}
