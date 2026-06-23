import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
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
        <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
          <input
            type="text"
            value={pupilName}
            onChange={(e) => setPupilName(e.target.value)}
            placeholder="For (pupil)"
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
              <div
                id="ryft-card-mount"
                ref={cardMountRef}
                style={{ marginTop: 8, minHeight: cardSessionId ? 0 : 0 }}
              />
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
            alignItems: "center",
            justifyContent: "space-between",
            padding: "calc(env(safe-area-inset-top, 0px) + 28px) 24px calc(env(safe-area-inset-bottom, 0px) + 24px)",
            fontFamily: "Poppins, sans-serif",
          }}
        >
          {/* Top: heading + amount */}
          <div style={{ textAlign: "center", color: "#fff" }}>
            <div style={{ fontSize: 16, fontWeight: 500, opacity: 0.85 }}>Scan to pay</div>
            <div style={{ fontSize: 44, fontWeight: 700, marginTop: 6, lineHeight: 1.1 }}>
              £{amountNum.toFixed(2)}
            </div>
          </div>

          {/* Centre: QR card */}
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
            <QRCodeSVG value={qrUrl} size={260} />
          </div>

          {/* Pupil + description + share */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 12,
              width: "100%",
              color: "#fff",
            }}
          >
            {(pupilName || description) && (
              <div style={{ textAlign: "center" }}>
                {pupilName && (
                  <div style={{ fontSize: 15, fontWeight: 600 }}>{pupilName}</div>
                )}
                {description && (
                  <div style={{ fontSize: 13, opacity: 0.8, marginTop: 2 }}>{description}</div>
                )}
              </div>
            )}
            <div style={{ fontSize: 12, opacity: 0.7 }}>Waiting for payment…</div>

            <button
              type="button"
              onClick={shareLink}
              style={{
                width: "100%",
                maxWidth: 320,
                height: 46,
                borderRadius: 12,
                background: "transparent",
                color: "#fff",
                border: "1px solid rgba(255,255,255,0.4)",
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
                maxWidth: 320,
                height: 46,
                borderRadius: 12,
                background: "transparent",
                color: "#fff",
                border: "1px solid rgba(255,255,255,0.25)",
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

