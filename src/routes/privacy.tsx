import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { tokens } from "@/lib/tokens";
import DSMTopSheet from "@/components/dsm/DSMTopSheet";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — Every Driver Pro" },
      { name: "description", content: "How Every Driver Pro collects, uses and stores your data." },
      { property: "og:title", content: "Privacy Policy — Every Driver Pro" },
      { property: "og:description", content: "How Every Driver Pro collects, uses and stores your data." },
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
          EveryDriver™ Ltd operates Every Driver Pro™, a management application for UK driving instructors.
        </p>
        <p style={{ marginTop: 8 }}>
          Contact: <a href="mailto:support@drivingschoolmanager.co.uk" style={{ color: tokens.blue }}>support@drivingschoolmanager.co.uk</a>
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
        <li>To provide Every Driver Pro™ services</li>
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
        <p>Connecting Google Calendar is optional.</p>
        <p style={{ marginTop: 8 }}>
          Every Driver Pro™'s use and transfer to any other app of information received from Google APIs will adhere to the Google API Services User Data Policy, including the Limited Use requirements.
        </p>
        <p style={{ marginTop: 8 }}>
          You can review the <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noopener noreferrer" style={{ color: tokens.blue }}>Google API Services User Data Policy</a>.
        </p>
      </>
    ),
  },
  {
    title: "7. GOOGLE USER DATA",
    content: (
      <>
        <p>If you connect Google Calendar, Every Driver Pro™ may access:</p>
        <ul>
          <li>Selected calendar information, including calendar name, identifier, primary-calendar status and colour</li>
          <li>Calendar event information, including title, description, location, dates, times, all-day status, event identifier, update status and colour</li>
          <li>Calendar availability and synchronisation information used to identify busy and free time</li>
        </ul>
        <p style={{ marginTop: 8 }}>
          Every Driver Pro™ may also create, update and remove calendar events that mirror lessons and course bookings managed in the app.
        </p>
      </>
    ),
  },
  {
    title: "8. HOW WE USE GOOGLE USER DATA",
    content: (
      <>
        <p>We use Google Calendar data only to:</p>
        <ul>
          <li>Synchronise selected calendars with Every Driver Pro™</li>
          <li>Show calendar events and instructor availability in the schedule</li>
          <li>Identify scheduling conflicts and unavailable times</li>
          <li>Synchronise lessons and course bookings managed in Every Driver Pro™ with Google Calendar</li>
        </ul>
        <p style={{ marginTop: 8 }}>
          We do not use Google user data for advertising, and we do not use it to develop, improve or train generalised artificial intelligence or machine-learning models.
        </p>
      </>
    ),
  },
  {
    title: "9. SHARING OF GOOGLE USER DATA",
    content: (
      <>
        <p>We do not sell Google user data or provide it to advertising networks or data brokers.</p>
        <p style={{ marginTop: 8 }}>
          Google user data may be processed by Google to provide the authorised Calendar service and by Supabase, our hosting and data-processing provider, to operate Every Driver Pro™.
        </p>
        <p style={{ marginTop: 8 }}>
          We may disclose information where required by law, or where reasonably necessary to protect users, our rights or the security and operation of the service.
        </p>
      </>
    ),
  },
  {
    title: "10. PROTECTION OF GOOGLE USER DATA",
    content: (
      <p>
        Google user data is transmitted using HTTPS/TLS, stored within our Supabase-backed service, and protected by authentication and application access controls. Access is restricted to authorised use required to provide, maintain and support the service.
      </p>
    ),
  },
  {
    title: "11. RETENTION OF GOOGLE USER DATA",
    content: (
      <>
        <p>
          We retain connected-calendar information, synchronisation records and imported event information while needed to provide calendar functionality, maintain service records and resolve service issues.
        </p>
        <p style={{ marginTop: 8 }}>
          Google events that are cancelled or deleted are removed from Every Driver Pro™ during calendar synchronisation. We do not state a fixed retention period where the service does not currently apply one.
        </p>
      </>
    ),
  },
  {
    title: "12. DELETION OF GOOGLE USER DATA",
    content: (
      <>
        <p>
          You can disconnect Google Calendar in Settings. Disconnecting removes the Google access and refresh tokens stored for the connection and stops further calendar synchronisation.
        </p>
        <p style={{ marginTop: 8 }}>
          Previously synchronised event information may remain until it is removed through normal synchronisation, account handling or a deletion request. You can request deletion of retained Google user data by contacting <a href="mailto:support@drivingschoolmanager.co.uk" style={{ color: tokens.blue }}>support@drivingschoolmanager.co.uk</a>.
        </p>
        <p style={{ marginTop: 8 }}>
          If you schedule your Every Driver Pro™ account for deletion in Settings, we handle the associated data as part of that account-deletion process. We do not claim that all Google-derived data is erased immediately when a calendar is disconnected or an account deletion is requested.
        </p>
      </>
    ),
  },
  {
    title: "13. WITHDRAWING GOOGLE ACCESS",
    content: (
      <>
        <p>
          Connecting Google Calendar is optional and you can withdraw access at any time.
        </p>
        <p style={{ marginTop: 8 }}>
          You can disconnect Google Calendar using the calendar settings in Every Driver Pro™, or remove Every Driver Pro™ from the third-party access permissions in your Google account. Once access is withdrawn, we stop synchronising your calendar.
        </p>
      </>
    ),
  },
  {
    title: "14. YOUR RIGHTS",

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
          To exercise these rights contact: <a href="mailto:support@drivingschoolmanager.co.uk" style={{ color: tokens.blue }}>support@drivingschoolmanager.co.uk</a>
        </p>
      </>
    ),
  },
  {
    title: "15. COOKIES",
    content: <p>Every Driver Pro™ uses essential cookies only for authentication.</p>,
  },
  {
    title: "16. CHANGES",
    content: <p>We may update this policy. We will notify you of significant changes via the app.</p>,
  },
  {
    title: "17. CONTACT",
    content: (
      <>
        <p>EveryDriver™ Ltd</p>
        <p style={{ marginTop: 4 }}>
          <a href="mailto:support@drivingschoolmanager.co.uk" style={{ color: tokens.blue }}>support@drivingschoolmanager.co.uk</a>
        </p>
        <p style={{ marginTop: 4 }}>
          <a href="https://everydriver.pro" target="_blank" rel="noopener noreferrer" style={{ color: tokens.blue }}>
            everydriver.pro
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
            Every Driver Pro™
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
            Last updated: September 2026
          </p>
        </div>

        {sections.map((section) => (
          <div
            key={section.title}
            style={{
              background: tokens.canvas,
              borderRadius: tokens.radiusCard,
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
          © 2026 EveryDriver Ltd. Every Driver Pro™ is a trademark of EveryDriver Ltd. All rights reserved.
        </p>
      </div>
    </DSMTopSheet>
  );
}
