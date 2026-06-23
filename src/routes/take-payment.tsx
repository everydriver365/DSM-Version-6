import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ChevronLeft, Delete, QrCode, CreditCard, Banknote, Share2, Copy } from "lucide-react";
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
  const [pupilName, setPupilName] = useState("");
  const [description, setDescription] = useState("");
  const [tab, setTab] = useState<Tab>("qr");

  // QR
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [qrPaymentId, setQrPaymentId] = useState<string | null>(null);
  const [qrGenerating, setQrGenerating] = useState(false);

  // Card
  const [cardLoading, setCardLoading] = useState(false);
  const [cardSessionId, setCardSessionId] = useState<string | null>(null);
  const cardMountRef = useRef<HTMLDivElement | null>(null);

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
      const { data, error } = await supabase.functions.invoke("create-ryft-payment", {
        body: {
          amount: amountNum,
          pupil_name: pupilName || undefined,
          description: description || "Payment",
          commission: 1,
        },
      });
      if (error) throw error;
      const url =
        (data as { paymentUrl?: string; url?: string })?.paymentUrl ??
        (data as { url?: string })?.url ??
        null;
      const pid =
        (data as { paymentId?: string; id?: string })?.paymentId ??
        (data as { id?: string })?.id ??
        null;
      if (!url) throw new Error("No payment URL returned");
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
    if (amountNum <= 0) {
      toast.error("Enter an amount first");
      return;
    }
    setCardLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-ryft-payment", {
        body: {
          amount: amountNum,
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
      const w = window as unknown as { Ryft?: { mount: (opts: unknown) => void } };
      let waited = 0;
      while (!w.Ryft && waited < 5000) {
        await new Promise((r) => setTimeout(r, 100));
        waited += 100;
      }
      if (!w.Ryft) throw new Error("Ryft SDK didn't load");
      if (cardMountRef.current) cardMountRef.current.innerHTML = "";
      w.Ryft.mount({
        publicKey: RYFT_PUBLIC_KEY,
        clientSecret,
        selector: "#ryft-card-mount",
        onSuccess: () => {
          toast.success("Payment received");
          setRecorded(`£${amountNum.toFixed(2)} received via card`);
        },
        onError: (err: unknown) => {
          console.error("[take-payment] ryft error", err);
          toast.error("Card payment failed");
        },
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

  return (
    <div style={{ minHeight: "100vh", background: "#fff", fontFamily: "Poppins, sans-serif" }}>
      {/* Top bar */}
      <div
        style={{
          background: NAVY,
          color: "#fff",
          padding: "calc(env(safe-area-inset-top, 0px) + 14px) 16px 14px",
          display: "flex",
          alignItems: "center",
          position: "sticky",
          top: 0,
          zIndex: 10,
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

      <div style={{ padding: 16, maxWidth: 480, margin: "0 auto" }}>
        {/* Amount */}
        <div style={{ textAlign: "center", marginTop: 8 }}>
          <div style={{ fontSize: 14, color: "#6B7280" }}>Amount</div>
          <div
            style={{
              fontSize: 48,
              fontWeight: 700,
              color: NAVY,
              lineHeight: 1.1,
              marginTop: 4,
            }}
          >
            £{amount}
          </div>
        </div>

        {/* Numpad */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 8,
            marginTop: 16,
          }}
        >
          {numpadKeys.map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => press(k)}
              style={{
                height: 56,
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
              }}
            >
              {k === "back" ? <Delete size={20} /> : k}
            </button>
          ))}
        </div>

        {/* For / Description */}
        <div style={{ marginTop: 16 }}>
          <label style={{ fontSize: 12, color: "#6B7280", fontWeight: 600 }}>For (optional)</label>
          <input
            type="text"
            value={pupilName}
            onChange={(e) => setPupilName(e.target.value)}
            placeholder="Pupil name"
            style={{
              width: "100%",
              padding: 12,
              borderRadius: 10,
              border: "0.5px solid #E2E6ED",
              fontSize: 14,
              marginTop: 4,
              color: NAVY,
            }}
          />
        </div>
        <div style={{ marginTop: 10 }}>
          <label style={{ fontSize: 12, color: "#6B7280", fontWeight: 600 }}>
            Description (optional)
          </label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Lesson payment"
            style={{
              width: "100%",
              padding: 12,
              borderRadius: 10,
              border: "0.5px solid #E2E6ED",
              fontSize: 14,
              marginTop: 4,
              color: NAVY,
            }}
          />
        </div>

        {/* Tabs */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 6,
            marginTop: 20,
            background: "#F4F6FA",
            padding: 4,
            borderRadius: 10,
          }}
        >
          {(
            [
              { k: "qr" as const, label: "QR Code", icon: <QrCode size={14} /> },
              { k: "card" as const, label: "Card", icon: <CreditCard size={14} /> },
              { k: "cash" as const, label: "Cash/Transfer", icon: <Banknote size={14} /> },
            ]
          ).map((t) => {
            const active = tab === t.k;
            return (
              <button
                key={t.k}
                type="button"
                onClick={() => setTab(t.k)}
                style={{
                  height: 38,
                  borderRadius: 8,
                  border: "none",
                  background: active ? "#fff" : "transparent",
                  color: active ? NAVY : "#6B7280",
                  fontSize: 12,
                  fontWeight: 600,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
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

        {/* Tab content */}
        <div style={{ marginTop: 16 }}>
          {tab === "qr" && (
            <div>
              {!qrUrl ? (
                <button
                  type="button"
                  onClick={generateQr}
                  disabled={qrGenerating}
                  style={{
                    width: "100%",
                    height: 48,
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
              ) : (
                <div
                  style={{
                    padding: 16,
                    borderRadius: 12,
                    background: "#F8F9FB",
                    border: "0.5px solid #E2E6ED",
                    textAlign: "center",
                  }}
                >
                  <div style={{ fontSize: 13, color: "#6B7280" }}>
                    {description || "Payment"}
                  </div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: NAVY, marginTop: 2 }}>
                    £{amountNum.toFixed(2)}
                  </div>
                  <div
                    style={{
                      background: "#fff",
                      display: "inline-block",
                      padding: 12,
                      borderRadius: 10,
                      border: "1px solid #E2E6ED",
                      marginTop: 12,
                    }}
                  >
                    <QRCodeSVG value={qrUrl} size={200} />
                  </div>
                  <div style={{ fontSize: 13, color: NAVY, fontWeight: 600, marginTop: 10 }}>
                    Pupil scan to pay
                  </div>
                  <div style={{ fontSize: 11, color: "#6B7280", marginTop: 2 }}>
                    Waiting for payment…
                  </div>
                  <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                    <button
                      type="button"
                      onClick={shareLink}
                      style={{
                        flex: 1,
                        height: 42,
                        borderRadius: 10,
                        background: NAVY,
                        color: "#fff",
                        border: "none",
                        fontSize: 13,
                        fontWeight: 600,
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 6,
                        cursor: "pointer",
                      }}
                    >
                      <Share2 size={14} /> Share link
                    </button>
                    <button
                      type="button"
                      onClick={copyLink}
                      style={{
                        height: 42,
                        width: 42,
                        borderRadius: 10,
                        background: "#fff",
                        color: NAVY,
                        border: "1px solid #E2E6ED",
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                      }}
                      aria-label="Copy link"
                    >
                      <Copy size={14} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {tab === "card" && (
            <div>
              {!cardSessionId ? (
                <button
                  type="button"
                  onClick={startCard}
                  disabled={cardLoading}
                  style={{
                    width: "100%",
                    height: 48,
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
              ) : null}
              <div
                id="ryft-card-mount"
                ref={cardMountRef}
                style={{ marginTop: 12, minHeight: cardSessionId ? 320 : 0 }}
              />
            </div>
          )}

          {tab === "cash" && (
            <div>
              <label style={{ fontSize: 12, color: "#6B7280", fontWeight: 600 }}>
                Payment method
              </label>
              <select
                value={cashMethod}
                onChange={(e) => setCashMethod(e.target.value as CashMethod)}
                style={{
                  width: "100%",
                  padding: 12,
                  borderRadius: 10,
                  border: "0.5px solid #E2E6ED",
                  fontSize: 14,
                  marginTop: 4,
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
                  width: "100%",
                  height: 48,
                  borderRadius: 10,
                  background: "#16A34A",
                  color: "#fff",
                  border: "none",
                  fontSize: 14,
                  fontWeight: 600,
                  marginTop: 14,
                  opacity: cashSaving ? 0.7 : 1,
                  cursor: "pointer",
                }}
              >
                {cashSaving ? "Saving…" : "Record payment"}
              </button>
            </div>
          )}
        </div>

        {recorded && (
          <div
            style={{
              marginTop: 16,
              padding: 14,
              borderRadius: 10,
              background: "#F0FDF4",
              border: "1px solid #16A34A",
              color: "#15803D",
              fontSize: 13,
              fontWeight: 600,
              textAlign: "center",
            }}
          >
            {recorded}
          </div>
        )}
      </div>
    </div>
  );
}
