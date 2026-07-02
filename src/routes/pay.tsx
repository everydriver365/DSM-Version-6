import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";

export const Route = createFileRoute("/pay")({
  component: PayPage,
  head: () => ({
    meta: [
      { title: "Pay — EveryDriver" },
      { name: "description", content: "Complete your driving lesson payment securely." },
      { name: "viewport", content: "width=device-width, initial-scale=1, maximum-scale=1" },
    ],
  }),
});

const RYFT_PUBLIC_KEY =
  "pk_sandbox_QpmgBnWSyZXGthN4EtZy6XIXYu+oRRkEUeceUFKLrXS5zmRA7XWBrkAdD8E6FgTn";

declare global {
  interface Window {
    Ryft?: any;
  }
}

function getParams() {
  if (typeof window === "undefined") return { cs: "", amount: 0, desc: "" };
  const sp = new URLSearchParams(window.location.search);
  return {
    cs: sp.get("cs") || "",
    amount: Number(sp.get("amount") || 0),
    desc: sp.get("desc") || "",
  };
}

function PayPage() {
  const [params] = useState(getParams);
  const [status, setStatus] = useState<"loading" | "ready" | "success" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState<string>("");
  const initedRef = useRef(false);

  const { cs: clientSecret, amount, desc } = params;
  const amountPounds = (amount / 100).toFixed(2);

  useEffect(() => {
    if (!clientSecret) {
      setStatus("error");
      setErrorMsg("Invalid payment link");
      return;
    }
    if (initedRef.current) return;
    initedRef.current = true;

    const SDK_URL = "https://embedded.ryftpay.com/v2/ryft.min.js";
    const existing = document.querySelector(`script[src="${SDK_URL}"]`) as HTMLScriptElement | null;

    const init = () => {
      try {
        if (!window.Ryft) throw new Error("Ryft SDK not loaded");
        window.Ryft.init({
          publicKey: RYFT_PUBLIC_KEY,
          clientSecret,
          googlePay: { merchantName: "EveryDriver", merchantCountryCode: "GB" },
          applePay: { merchantName: "EveryDriver", merchantCountryCode: "GB" },
        });
        try {
          if (window.Ryft && window.Ryft.googlePay) {
            window.Ryft.googlePay.mount("#google-pay-container");
          }
        } catch(e) { console.warn("Google Pay not available:", e); }
        try {
          if (window.Ryft && window.Ryft.applePay) {
            window.Ryft.applePay.mount("#apple-pay-container");
          }
        } catch(e) { console.warn("Apple Pay not available:", e); }
        window.Ryft.addEventHandler("paymentSuccess", () => setStatus("success"));
        window.Ryft.addEventHandler("paymentError", (e: any) => {
          setErrorMsg(e?.error?.message || "Payment failed. Please try again.");
        });
        setStatus("ready");
      } catch (e: any) {
        setStatus("error");
        setErrorMsg(e?.message || "Failed to initialise payment");
      }
    };

    if (existing && window.Ryft) {
      init();
    } else {
      const s = existing || document.createElement("script");
      if (!existing) {
        s.src = SDK_URL;
        s.async = true;
        document.body.appendChild(s);
      }
      s.addEventListener("load", init, { once: true });
      s.addEventListener("error", () => {
        setStatus("error");
        setErrorMsg("Could not load payment SDK");
      }, { once: true });
    }
  }, [clientSecret]);

  return (
    <div style={{ minHeight: "100vh", background: "#fff", display: "flex", justifyContent: "center" }}>
      <div style={{ width: "100%", maxWidth: 440, display: "flex", flexDirection: "column" }}>
        <header
          style={{
            background: "#0B1F3A",
            color: "#fff",
            padding: 16,
            textAlign: "center",
            fontWeight: 700,
            fontSize: 18,
            letterSpacing: 0.3,
          }}
        >
          DSM by EveryDriver
        </header>

        {status === "error" && !clientSecret ? (
          <div style={{ padding: 32, textAlign: "center" }}>
            <h1 style={{ color: "#b91c1c", fontSize: 22, fontWeight: 700 }}>Invalid payment link</h1>
            <p style={{ color: "#64748b", marginTop: 8, fontSize: 14 }}>
              Please ask your instructor for a new link.
            </p>
          </div>
        ) : status === "success" ? (
          <div style={{ padding: 40, textAlign: "center" }}>
            <div
              style={{
                width: 72,
                height: 72,
                borderRadius: "50%",
                background: "#1877D6",
                color: "#fff",
                fontSize: 40,
                lineHeight: "72px",
                margin: "0 auto 16px",
              }}
            >
              ✓
            </div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: "#0B1F3A" }}>Payment confirmed!</h1>
            <p style={{ color: "#64748b", marginTop: 8 }}>Thank you.</p>
          </div>
        ) : (
          <>
            <div style={{ padding: 24, textAlign: "center" }}>
              <div style={{ fontSize: 48, fontWeight: 700, color: "#0B1F3A", lineHeight: 1 }}>
                £{amountPounds}
              </div>
              {desc && (
                <div style={{ marginTop: 8, color: "#64748b", fontSize: 14 }}>{desc}</div>
              )}
            </div>

            <div style={{ padding: "0 20px 32px" }}>
              {errorMsg && (
                <div
                  style={{
                    background: "#fef2f2",
                    color: "#b91c1c",
                    padding: 12,
                    borderRadius: 8,
                    fontSize: 14,
                    marginBottom: 12,
                  }}
                >
                  {errorMsg}
                </div>
              )}

              <div id="google-pay-container" style={{ marginBottom: 12 }} />
              <div id="apple-pay-container" style={{ marginBottom: 12 }} />
              <div style={{ textAlign: 'center', color: '#9CA3AF', fontSize: 13, marginBottom: 12 }}>— or pay by card —</div>

              <div className="Ryft--paysection">
                <form id="ryft-pay-form" className="Ryft--payform">
                  <button
                    id="pay-btn"
                    type="submit"
                    style={{
                      width: "100%",
                      marginTop: 12,
                      background: "#0B1F3A",
                      color: "#fff",
                      border: 0,
                      borderRadius: 10,
                      padding: "14px 16px",
                      fontSize: 16,
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    Pay £{amountPounds}
                  </button>
                </form>
              </div>

              {status === "loading" && (
                <p style={{ textAlign: "center", color: "#94a3b8", fontSize: 13, marginTop: 16 }}>
                  Loading secure payment…
                </p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
