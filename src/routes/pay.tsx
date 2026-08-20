import { createFileRoute } from "@tanstack/react-router";
import { tokens } from "@/lib/tokens";

export const Route = createFileRoute("/pay")({
  component: PayPage,
  head: () => ({
    meta: [
      { title: "Pay — EveryDriver" },
      { name: "description", content: "Complete your driving lesson payment securely with Square." },
      { property: "og:title", content: "Pay — EveryDriver" },
      { property: "og:description", content: "Complete your driving lesson payment securely with Square." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "viewport", content: "width=device-width, initial-scale=1, maximum-scale=1" },
    ],
  }),
});

const NAVY = "#0B1F3A";
const BLUE = "#1877D6";
const FONT = "Poppins, sans-serif";

function PayPage() {
  return (
    <div
      style={{
        minHeight: "100dvh",
        background: "#F8F9FB",
        fontFamily: FONT,
        display: "flex",
        justifyContent: "center",
      }}
    >
      <div style={{ width: "100%", maxWidth: 440 }}>
        <header
          style={{
            background: NAVY,
            color: "#fff",
            padding: 16,
            textAlign: "center",
            fontWeight: tokens.fontWeight.bold,
            fontSize: tokens.fontSize.xl,
            letterSpacing: 0.3,
          }}
        >
          DSM by EveryDriver
        </header>

        <main style={{ padding: 24 }}>
          <div
            style={{
              background: "#fff",
              borderRadius: tokens.radiusCard,
              boxShadow: "0 1px 3px rgba(11,31,58,0.06)",
              padding: 24,
              textAlign: "center",
            }}
          >
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: "50%",
                background: tokens.navy,
                color: "#fff",
                fontSize: 26,
                fontWeight: tokens.fontWeight.extrabold,
                lineHeight: "56px",
                margin: "0 auto 14px",
              }}
              aria-hidden="true"
            >
              □
            </div>
            <h1 style={{ fontSize: 20, fontWeight: tokens.fontWeight.bold, color: NAVY, margin: 0 }}>
              Payment processing via Square
            </h1>
            <p style={{ color: tokens.textSecondary, marginTop: 10, fontSize: tokens.fontSize.md, lineHeight: 1.6 }}>
              Payments for DSM by EveryDriver are now processed securely by Square. Please use the
              Square payment link or QR code your instructor sent you.
            </p>
            <p style={{ color: tokens.textSecondary, marginTop: 10, fontSize: 13 }}>
              If you don't have a link, ask your instructor to send a new one.
            </p>
            <div
              style={{
                marginTop: 18,
                fontSize: 12,
                fontWeight: tokens.fontWeight.semibold,
                color: BLUE,
                letterSpacing: 0.3,
              }}
            >
              Secured by Square
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

export default PayPage;
