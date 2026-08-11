import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { IconCircleCheck, IconHome } from "@tabler/icons-react";

export const Route = createFileRoute("/payment-complete")({
  head: () => ({
    meta: [
      { title: "Payment Complete — DSM" },
      {
        name: "description",
        content:
          "Your card payment has been received. Your driving instructor will be notified automatically.",
      },
      { property: "og:title", content: "Payment Complete — DSM" },
      {
        property: "og:description",
        content:
          "Your card payment has been received. Your driving instructor will be notified automatically.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PaymentCompletePage,
});

const FONT = "Poppins, sans-serif";

function PaymentCompletePage() {
  const navigate = useNavigate();
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          navigate({ to: "/home" as never });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [navigate]);

  return (
    <div
      style={{
        minHeight: "100dvh",
        background: "#EEF2F7",
        fontFamily: FONT,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        padding: 24,
      }}
    >
      <div
        style={{
          width: 88,
          height: 88,
          borderRadius: "50%",
          background: "#DCFCE7",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 20,
        }}
      >
        <IconCircleCheck size={48} color="#16A34A" stroke={1.6} />
      </div>

      <h1
        style={{
          margin: 0,
          fontSize: 22,
          fontWeight: 700,
          color: "#0B1F3A",
          fontFamily: FONT,
        }}
      >
        Payment complete
      </h1>

      <p
        style={{
          margin: "10px 0 0",
          fontSize: 14,
          color: "#6B7686",
          lineHeight: 1.5,
          maxWidth: 320,
        }}
      >
        Thank you — your payment has been received. Your instructor will be
        notified.
      </p>

      <div style={{ fontSize: 12, color: "#9CA3AF", margin: "20px 0 16px" }}>
        Returning to DSM in {countdown}s…
      </div>

      <button
        type="button"
        onClick={() => navigate({ to: "/home" as never })}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          background: "#1877D6",
          color: "#fff",
          border: "none",
          borderRadius: 20,
          padding: "12px 24px",
          fontSize: 14,
          fontWeight: 700,
          cursor: "pointer",
          fontFamily: FONT,
        }}
      >
        <IconHome size={18} stroke={1.8} />
        Go to DSM
      </button>
    </div>
  );
}
