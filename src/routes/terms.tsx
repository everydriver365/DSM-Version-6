import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { tokens } from "@/lib/tokens";
import DSMTopSheet from "@/components/dsm/DSMTopSheet";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Service — Every Driver Pro" },
      { name: "description", content: "Terms of Service for Every Driver Pro." },
      { property: "og:title", content: "Terms of Service — Every Driver Pro" },
      { property: "og:description", content: "Terms of Service for Every Driver Pro." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TermsPage,
});

const POPPINS = { fontFamily: "Poppins, sans-serif" } as const;

const sections: { title: string; content: React.ReactNode }[] = [
  {
    title: "1. ACCEPTANCE",
    content: (
      <>
        <p>By using Every Driver Pro™ you agree to these terms.</p>
        <p style={{ marginTop: 8 }}>If you do not agree, do not use Every Driver Pro™.</p>
      </>
    ),
  },
  {
    title: "2. THE SERVICE",
    content: (
      <p>
        Every Driver Pro™ is a business management application for UK driving instructors provided by EveryDriver™ Ltd.
      </p>
    ),
  },
  {
    title: "3. YOUR ACCOUNT",
    content: (
      <ul>
        <li>You must be a UK driving instructor (ADI or PDI) to use Every Driver Pro™</li>
        <li>You are responsible for keeping your account secure</li>
        <li>You must provide accurate information</li>
        <li>One account per instructor</li>
      </ul>
    ),
  },
  {
    title: "4. ACCEPTABLE USE",
    content: (
      <>
        <p>You must not:</p>
        <ul>
          <li>Use Every Driver Pro™ for any unlawful purpose</li>
          <li>Share your account with others</li>
          <li>Attempt to access other instructors' data</li>
          <li>Reverse engineer or copy the app</li>
        </ul>
      </>
    ),
  },
  {
    title: "5. PUPIL DATA",
    content: (
      <ul>
        <li>You are the data controller for your pupils' information</li>
        <li>You are responsible for obtaining consent from pupils to store their data</li>
        <li>Every Driver Pro™ processes this data on your behalf as a data processor</li>
      </ul>
    ),
  },
  {
    title: "6. SUBSCRIPTION",
    content: (
      <ul>
        <li>Free tier available with limited features</li>
        <li>Paid tiers billed monthly or annually</li>
        <li>Cancellation takes effect at the end of the billing period</li>
        <li>No refunds for partial periods</li>
      </ul>
    ),
  },
  {
    title: "7. PAYMENTS",
    content: (
      <ul>
        <li>Every Driver Pro™ does not process payments on your behalf</li>
        <li>Payment links connect to your own Square/Stripe/PayPal accounts</li>
        <li>You are responsible for your own payment processing</li>
      </ul>
    ),
  },
  {
    title: "8. INTELLECTUAL PROPERTY",
    content: (
      <p>
        Every Driver Pro™ and all content is owned by EveryDriver™ Ltd. You may not copy, modify or distribute the app.
      </p>
    ),
  },
  {
    title: "9. LIABILITY",
    content: (
      <p>
        Every Driver Pro™ is provided "as is". EveryDriver™ Ltd is not liable for any loss of business, data or income arising from use of Every Driver Pro™.
      </p>
    ),
  },
  {
    title: "10. TERMINATION",
    content: (
      <>
        <p>We may suspend or terminate accounts that violate these terms.</p>
        <p style={{ marginTop: 8 }}>You may delete your account at any time in Settings.</p>
      </>
    ),
  },
  {
    title: "11. GOVERNING LAW",
    content: (
      <p>These terms are governed by the laws of England and Wales.</p>
    ),
  },
  {
    title: "12. CONTACT",
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

function TermsPage() {
  const navigate = useNavigate();

  return (
    <DSMTopSheet
      title="Terms of Service"
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
            Terms of Service
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
