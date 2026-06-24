import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ChevronLeft, Delete, QrCode, CreditCard, Banknote, Share2, Copy, X } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";
import { supabase } from "../lib/supabaseClient";

const RYFT_PUBLIC_KEY =
  "pk_sandbox_QpmgBnWSyZXGthN4EtZy6XIXYu+oRRkEUeceUFKLrXS5zmRA7XWBrkAdD8E6FgTn";

export const Route = createFileRoute("/take-payment")({
  head: () => ({ meta: [{ title: "Take payment" }] }),
  component: TakePaymentPage,
});

type Tab = "qr" | "card" | "cash";
type CashMethod = "cash" | "bank";

function TakePaymentPage() {
  const navigate = useNavigate();
  const [amount, setAmount] = useState<string>("0");
  const [pupils, setPupils] = useState<{ id: string; name: string }[]>([]);
  const [pupilId, setPupilId] = useState<string>("");
  const [description, setDescription] = useState("");
  const [tab, setTab] = useState<Tab>("qr");
  const pupilName = pupils.find((p) => p.id === pupilId)?.name ?? "";

  // Load instructor's current pupils
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      const uid = u?.user?.id;
      if (!uid) return;
      const { data, error } = await supabase
        .from("pupils")
        .select("id, name")
        .eq("instructor_id", uid)
        .is("deleted_at", null)
        .not("status", "in", "(inactive,archived,cancelled)")
        .order("name");
      if (cancelled) return;
      if (error) {
        console.warn("[take-payment] load pupils", error);
        return;
      }
      setPupils((data ?? []) as { id: string; name: string }[]);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // QR
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [qrPaymentId, setQrPaymentId] = useState<string | null>(null);
  const [qrGenerating, setQrGenerating] = useState(false);

  // Card
  const [cardLoading, setCardLoading] = useState(false);
  const [cardSessionId, setCardSessionId] = useState<string | null>(null);
  const [cardClientSecret, setCardClientSecret] = useState<string | null>(null);
  

  

  // Cash/transfer
  const [cashMethod, setCashMethod] = useState<CashMethod>("cash");
  const [cashSaving, setCashSaving] = useState(false);
  const [recorded, setRecorded] = useState<string | null>(null);

  const amountNum = Number(amount) || 0;

  const press = (key: string) => {
    setAmount((prev) => {
      if (key === "back") return prev.length <= 1 ? "0" : prev.slice(0, -1);
      if (key === ".") return prev.includes(".") ? prev : prev + ".";
      if (prev === "0") return key;
      // limit to 2 decimal places
      if (prev.includes(".") && prev.split(".")[1].length >= 2) return prev;
      return prev + key;
    });
  };

  // --- QR flow ---
  const generateQr = async () => {
    if (amountNum <= 0) {
      toast.error("Enter an amount first");
      return;
    }
    setQrGenerating(true);
    try {
      const amountPence = Math.round(amountNum * 100);
      const { data, error } = await supabase.functions.invoke("create-ryft-payment", {
        body: {
          amount: amountPence,
          pupil_id: pupilId || undefined,
          pupil_name: pupilName || undefined,
          description: description || "Payment",
          commission: 1,
        },
      });
      if (error) throw error;
      const clientSecret =
        (data as { clientSecret?: string; client_secret?: string })?.clientSecret ??
        (data as { client_secret?: string })?.client_secret ??
        null;
      const pid =
        (data as { paymentId?: string; id?: string })?.paymentId ??
        (data as { id?: string })?.id ??
        null;
      if (!clientSecret) throw new Error("No client secret returned");
      const url = `https://drivingschoolmanager.co.uk/pay?cs=${clientSecret}&amount=${amountPence}&desc=${encodeURIComponent(description || "Payment")}`;
      setQrUrl(url);
      setQrPaymentId(pid);
      toast.success("Payment link ready");
    } catch (e) {
      console.error("[take-payment] generateQr", e);
      toast.error("Couldn't generate payment link");
    } finally {
      setQrGenerating(false);
    }
  };

  const shareLink = async () => {
    if (!qrUrl) return;
    try {
      if (navigator.share) {
        await navigator.share({ title: "Payment link", url: qrUrl });
      } else {
        await navigator.clipboard.writeText(qrUrl);
        toast.success("Link copied to clipboard");
      }
    } catch {
      /* user cancelled */
    }
  };

  const copyLink = async () => {
    if (!qrUrl) return;
    await navigator.clipboard.writeText(qrUrl);
    toast.success("Link copied");
  };

  // Poll QR payment status
  useEffect(() => {
    if (!qrPaymentId) return;
    const t = setInterval(async () => {
      try {
        const { data } = await supabase.functions.invoke("get-ryft-payment-status", {
          body: { paymentId: qrPaymentId },
        });
        const status = (data as { status?: string })?.status;
        if (status === "succeeded" || status === "completed" || status === "paid") {
          clearInterval(t);
          toast.success("Payment received");
          setRecorded(`£${amountNum.toFixed(2)} received via card (QR)`);
          setQrPaymentId(null);
        }
      } catch (e) {
        console.warn("[take-payment] qr poll", e);
      }
    }, 5000);
    return () => clearInterval(t);
  }, [qrPaymentId, amountNum]);

  // --- Card (Ryft embedded) ---
  useEffect(() => {
    if (tab !== "card") return;
    if (document.querySelector('script[data-ryft="1"]')) return;
    const s = document.createElement("script");
    s.src = "https://embedded.ryftpay.com/v2/ryft.min.js";
    s.async = true;
    s.dataset.ryft = "1";
    document.head.appendChild(s);
  }, [tab]);

  const startCard = async () => {
    console.log("[take-payment] Charge card clicked");
    if (amountNum <= 0) {
      toast.error("Enter an amount first");
      return;
    }
    setCardLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-ryft-payment", {
        body: {
          amount: Math.round(amountNum * 100),
          pupil_id: pupilId || undefined,
          pupil_name: pupilName || undefined,
          description: description || "Payment",
          commission: 1,
          mode: "embedded",
        },
      });
      if (error) throw error;
      const clientSecret =
        (data as { clientSecret?: string; client_secret?: string })?.clientSecret ??
        (data as { client_secret?: string })?.client_secret;
      const pid =
        (data as { paymentId?: string; id?: string })?.paymentId ??
        (data as { id?: string })?.id ??
        null;
      if (!clientSecret) throw new Error("No client secret returned");
      setCardSessionId(pid);

      // Wait for Ryft SDK to load
      const w = window as unknown as { Ryft?: any };
      let waited = 0;
      while (!w.Ryft && waited < 5000) {
        await new Promise((r) => setTimeout(r, 100));
        waited += 100;
      }
      console.log("[take-payment] Ryft available:", !!w.Ryft);
      console.log("[take-payment] clientSecret:", clientSecret);
      if (!w.Ryft) throw new Error("Ryft SDK didn't load");
      const initResult = w.Ryft.init({
        publicKey: RYFT_PUBLIC_KEY,
        clientSecret,
        googlePay: { merchantName: "EveryDriver", merchantCountryCode: "GB" },
        applePay: { merchantName: "EveryDriver", merchantCountryCode: "GB" },
      });
      console.log("[take-payment] Ryft init result:", initResult);
      try {
        if (w.Ryft && w.Ryft.googlePay) {
          w.Ryft.googlePay.mount("#google-pay-container");
        }
      } catch(e) { console.warn("Google Pay not available:", e); }
      try {
        if (w.Ryft && w.Ryft.applePay) {
          w.Ryft.applePay.mount("#apple-pay-container");
        }
      } catch(e) { console.warn("Apple Pay not available:", e); }
      w.Ryft.addEventHandler("paymentSuccess", () => {
        toast.success("Payment received");
        setRecorded(`£${amountNum.toFixed(2)} received via card`);
      });
      w.Ryft.addEventHandler("paymentError", (err: any) => {
        console.error("[take-payment] ryft error", err);
        toast.error("Card payment failed");
      });
    } catch (e) {
      console.error("[take-payment] startCard", e);
      toast.error("Couldn't start card payment");
    } finally {
      setCardLoading(false);
    }
  };

  // --- Cash / transfer ---
  const recordCash = async () => {
    if (amountNum <= 0) {
      toast.error("Enter an amount first");
      return;
    }
    setCashSaving(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      const instructorId = u?.user?.id ?? null;
      await supabase.from("lesson_history").insert({
        instructor_id: instructorId,
        pupil_id: pupilId || null,
        lesson_date: new Date().toISOString().slice(0, 10),
        payment_status: "paid",
        payment_method: cashMethod,
        amount: amountNum,
      });
      setRecorded(
        `£${amountNum.toFixed(2)} recorded as ${cashMethod === "cash" ? "cash" : "bank transfer"}`,
      );
      toast.success("Payment recorded");
    } catch (e) {
      console.error("[take-payment] recordCash", e);
      toast.error("Couldn't record payment");
    } finally {
      setCashSaving(false);
    }
  };

  const NAVY = "#0F2044";
  const numpadKeys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "back"];

  // QR overlay visibility — auto-opens when QR generated, Close hides it
  const qrOverlayOpen = tab === "qr" && !!qrUrl;
  const closeQrOverlay = () => {
    setQrUrl(null);
    setQrPaymentId(null);
  };

  return (
    <div
      style={{
        height: "100dvh",
        background: "#fff",
        fontFamily: "Poppins, sans-serif",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* Top bar */}
      <div
        style={{
          background: NAVY,
          color: "#fff",
          padding: "calc(env(safe-area-inset-top, 0px) + 10px) 16px 10px",
          display: "flex",
          alignItems: "center",
          flexShrink: 0,
        }}
      >
        <button
          type="button"
          aria-label="Back"
          onClick={() => navigate({ to: "/home" })}
          style={{
            background: "rgba(255,255,255,0.10)",
            border: "none",
            width: 32,
            height: 32,
            borderRadius: "50%",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#fff",
            cursor: "pointer",
          }}
        >
          <ChevronLeft size={18} />
        </button>
        <div
          style={{
            flex: 1,
            textAlign: "center",
            fontSize: 16,
            fontWeight: 600,
            marginRight: 32,
          }}
        >
          Take payment
        </div>
      </div>

      <div
        style={{
          flex: 1,
          minHeight: 0,
          padding: "10px 14px 12px",
          maxWidth: 480,
          width: "100%",
          margin: "0 auto",
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
        {/* Amount */}
        <div style={{ textAlign: "center", flexShrink: 0 }}>
          <div
            style={{
              fontSize: 40,
              fontWeight: 700,
              color: NAVY,
              lineHeight: 1.05,
            }}
          >
            £{amount}
          </div>
        </div>

        {/* Numpad — flex grows to fill */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 6,
            flex: 1,
            minHeight: 0,
          }}
        >
          {numpadKeys.map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => press(k)}
              style={{
                fontSize: 20,
                fontWeight: 600,
                color: NAVY,
                background: "#F4F6FA",
                border: "0.5px solid #E2E6ED",
                borderRadius: 10,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                minHeight: 0,
              }}
            >
              {k === "back" ? <Delete size={20} /> : k}
            </button>
          ))}
        </div>

        {/* For + Description — single compact row */}
        <div style={{ display: "flex", flexDirection: "column", gap: 6, flexShrink: 0 }}>
          <select
            value={pupilId}
            onChange={(e) => setPupilId(e.target.value)}
            style={{
              flex: 1,
              minWidth: 0,
              padding: "8px 10px",
              borderRadius: 8,
              border: "0.5px solid #E2E6ED",
              fontSize: 13,
              color: NAVY,
              background: "#fff",
            }}
          >
            <option value="">For (optional) — select pupil</option>
            {pupils.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description"
            style={{
              flex: 1,
              minWidth: 0,
              padding: "8px 10px",
              borderRadius: 8,
              border: "0.5px solid #E2E6ED",
              fontSize: 13,
              color: NAVY,
            }}
          />
        </div>

        {/* Tabs */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 4,
            background: "#F4F6FA",
            padding: 3,
            borderRadius: 10,
            flexShrink: 0,
          }}
        >
          {(
            [
              { k: "qr" as const, label: "QR Code", icon: <QrCode size={13} /> },
              { k: "card" as const, label: "Card", icon: <CreditCard size={13} /> },
              { k: "cash" as const, label: "Cash/Transfer", icon: <Banknote size={13} /> },
            ]
          ).map((t) => {
            const active = tab === t.k;
            return (
              <button
                key={t.k}
                type="button"
                onClick={() => setTab(t.k)}
                style={{
                  height: 34,
                  borderRadius: 8,
                  border: "none",
                  background: active ? "#fff" : "transparent",
                  color: active ? NAVY : "#6B7280",
                  fontSize: 11,
                  fontWeight: 600,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 4,
                  boxShadow: active ? "0 1px 2px rgba(15,32,68,0.08)" : "none",
                  cursor: "pointer",
                }}
              >
                {t.icon}
                {t.label}
              </button>
            );
          })}
        </div>

        {/* Tab content — compact action area */}
        <div style={{ flexShrink: 0 }}>
          {tab === "qr" && !qrUrl && (
            <button
              type="button"
              onClick={generateQr}
              disabled={qrGenerating}
              style={{
                width: "100%",
                height: 44,
                borderRadius: 10,
                background: NAVY,
                color: "#fff",
                border: "none",
                fontSize: 14,
                fontWeight: 600,
                opacity: qrGenerating ? 0.7 : 1,
                cursor: "pointer",
              }}
            >
              {qrGenerating ? "Generating…" : "Generate payment link"}
            </button>
          )}

          {tab === "card" && (
            <div>
              {!cardSessionId && (
                <button
                  type="button"
                  onClick={startCard}
                  disabled={cardLoading}
                  style={{
                    width: "100%",
                    height: 44,
                    borderRadius: 10,
                    background: NAVY,
                    color: "#fff",
                    border: "none",
                    fontSize: 14,
                    fontWeight: 600,
                    opacity: cardLoading ? 0.7 : 1,
                    cursor: "pointer",
                  }}
                >
                  {cardLoading ? "Loading…" : `Charge card · £${amountNum.toFixed(2)}`}
                </button>
              )}
              {cardSessionId && (
                <>
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
                          background: "#0F2044",
                          color: "#fff",
                          border: 0,
                          borderRadius: 10,
                          padding: "14px 16px",
                          fontSize: 16,
                          fontWeight: 600,
                          cursor: "pointer",
                        }}
                      >
                        Pay £{amountNum.toFixed(2)}
                      </button>
                    </form>
                  </div>
                </>
              )}
            </div>
          )}

          {tab === "cash" && (
            <div style={{ display: "flex", gap: 6 }}>
              <select
                value={cashMethod}
                onChange={(e) => setCashMethod(e.target.value as CashMethod)}
                style={{
                  flex: 1,
                  padding: "0 10px",
                  height: 44,
                  borderRadius: 10,
                  border: "0.5px solid #E2E6ED",
                  fontSize: 13,
                  color: NAVY,
                  background: "#fff",
                }}
              >
                <option value="cash">Cash</option>
                <option value="bank">Bank transfer</option>
              </select>
              <button
                type="button"
                onClick={recordCash}
                disabled={cashSaving}
                style={{
                  flex: 1.2,
                  height: 44,
                  borderRadius: 10,
                  background: "#16A34A",
                  color: "#fff",
                  border: "none",
                  fontSize: 14,
                  fontWeight: 600,
                  opacity: cashSaving ? 0.7 : 1,
                  cursor: "pointer",
                }}
              >
                {cashSaving ? "Saving…" : "Record"}
              </button>
            </div>
          )}
        </div>

        {recorded && (
          <div
            style={{
              padding: 10,
              borderRadius: 10,
              background: "#F0FDF4",
              border: "1px solid #16A34A",
              color: "#15803D",
              fontSize: 12,
              fontWeight: 600,
              textAlign: "center",
              flexShrink: 0,
            }}
          >
            {recorded}
          </div>
        )}
      </div>

      {/* FULL SCREEN QR OVERLAY */}
      {qrOverlayOpen && qrUrl && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: NAVY,
            zIndex: 50,
            display: "flex",
            flexDirection: "column",
            height: "100vh",
            fontFamily: "Poppins, sans-serif",
          }}
        >
          {/* Close button */}
          <button
            type="button"
            aria-label="Close"
            onClick={closeQrOverlay}
            style={{
              position: "absolute",
              top: 16,
              right: 16,
              width: 36,
              height: 36,
              borderRadius: "50%",
              background: "rgba(255,255,255,0.15)",
              border: "none",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              cursor: "pointer",
              zIndex: 1,
            }}
          >
            <X size={18} />
          </button>

          {/* Top section (flex 0) */}
          <div
            style={{
              flex: "0 0 auto",
              padding: "calc(env(safe-area-inset-top, 0px) + 24px) 24px 24px",
              textAlign: "center",
              color: "#fff",
            }}
          >
            <div style={{ fontSize: 16, fontWeight: 500, opacity: 0.85 }}>Scan to pay</div>
            <div style={{ fontSize: 44, fontWeight: 700, marginTop: 6, lineHeight: 1.1 }}>
              £{amountNum.toFixed(2)}
            </div>
            {(pupilName || description) && (
              <div style={{ marginTop: 10 }}>
                {pupilName && (
                  <div style={{ fontSize: 15, fontWeight: 600 }}>{pupilName}</div>
                )}
                {description && (
                  <div style={{ fontSize: 13, opacity: 0.8, marginTop: 2 }}>{description}</div>
                )}
              </div>
            )}
          </div>

          {/* Middle section (flex 1, centred) */}
          <div
            style={{
              flex: 1,
              minHeight: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: "0 24px",
              gap: 12,
            }}
          >
            <div
              style={{
                background: "#fff",
                padding: 24,
                borderRadius: 16,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <QRCodeSVG value={qrUrl} size={240} />
            </div>
            <div style={{ fontSize: 12, color: "#fff", opacity: 0.7 }}>
              Waiting for payment…
            </div>
          </div>

          {/* Bottom section (flex 0) */}
          <div
            style={{
              flex: "0 0 auto",
              padding: "24px 24px calc(env(safe-area-inset-bottom, 0px) + 24px)",
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}
          >
            <button
              type="button"
              onClick={shareLink}
              style={{
                width: "100%",
                height: 46,
                borderRadius: 12,
                background: "#fff",
                color: NAVY,
                border: "none",
                fontSize: 14,
                fontWeight: 600,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                cursor: "pointer",
              }}
            >
              <Share2 size={16} /> Share link
            </button>

            <button
              type="button"
              onClick={closeQrOverlay}
              style={{
                width: "100%",
                height: 46,
                borderRadius: 12,
                background: "transparent",
                color: "#fff",
                border: "1px solid rgba(255,255,255,0.4)",
                fontSize: 14,
                fontWeight: 500,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                cursor: "pointer",
              }}
            >
              <X size={16} /> Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

