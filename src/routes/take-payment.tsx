import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ChevronLeft, Delete, QrCode, CreditCard, Banknote, Share2, Copy, X, CircleCheck } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";
import { supabase } from "../lib/supabaseClient";

const RYFT_PUBLIC_KEY =
  "pk_sandbox_QpmgBnWSyZXGthN4EtZy6XIXYu+oRRkEUeceUFKLrXS5zmRA7XWBrkAdD8E6FgTn";

export const Route = createFileRoute("/take-payment")({
  head: () => ({ meta: [{ title: "Take payment" }] }),
  validateSearch: (search: Record<string, unknown>) => ({
    lessonId: typeof search.lessonId === "string" ? (search.lessonId as string) : undefined,
    pupilId: typeof search.pupilId === "string" ? (search.pupilId as string) : undefined,
  }),
  component: TakePaymentPage,
});

type Tab = "qr" | "card" | "cash";
type CashMethod = "cash" | "bank";

function TakePaymentPage() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const lessonId = search.lessonId ?? null;
  const [amount, setAmount] = useState<string>("0");
  const [pupils, setPupils] = useState<{ id: string; name: string }[]>([]);
  const [pupilId, setPupilId] = useState<string>("");
  const [description, setDescription] = useState("");
  const [tab, setTab] = useState<Tab>("qr");
  const pupilName = pupils.find((p) => p.id === pupilId)?.name ?? "";
  const [passBookingFee, setPassBookingFee] = useState<boolean>(true);

  // Load instructor's booking-fee preference
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      const uid = u?.user?.id;
      if (!uid) return;
      const { data, error } = await supabase
        .from("instructors")
        .select("pass_booking_fee")
        .eq("id", uid)
        .maybeSingle();
      if (cancelled) return;
      if (error) {
        console.warn("[take-payment] load pass_booking_fee", error);
        return;
      }
      if (data && typeof (data as { pass_booking_fee?: boolean }).pass_booking_fee === "boolean") {
        setPassBookingFee((data as { pass_booking_fee: boolean }).pass_booking_fee);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

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

  // Preselect pupil if passed via query
  useEffect(() => {
    if (search.pupilId) setPupilId(search.pupilId);
  }, [search.pupilId]);

  // Shared: after a successful payment, mark the lesson paid, reduce
  // pupils.balance_owed, and insert into payments. Best-effort — each
  // step's error is logged but does not abort the others.
  async function recordPaymentSideEffects(args: {
    instructorId: string | null;
    pupilIdForPayment: string | null;
    amountPaid: number;
    method: "cash" | "bank" | "card";
  }) {
    const { instructorId, pupilIdForPayment, amountPaid, method } = args;
    const today = new Date().toISOString().slice(0, 10);

    if (lessonId) {
      const { error: lessonErr } = await supabase
        .from("lessons")
        .update({ payment_status: "paid", amount_due: 0 })
        .eq("id", lessonId);
      if (lessonErr) console.error("[take-payment] lesson update", lessonErr);
    }

    if (pupilIdForPayment) {
      const { data: pupilRow, error: pupilFetchErr } = await supabase
        .from("pupils")
        .select("balance_owed")
        .eq("id", pupilIdForPayment)
        .maybeSingle();
      if (pupilFetchErr) console.error("[take-payment] pupil fetch", pupilFetchErr);
      const current = Number((pupilRow as { balance_owed?: number | null } | null)?.balance_owed ?? 0);
      if (current > 0) {
        const next = Math.max(0, current - amountPaid);
        const { error: pupilUpdErr } = await supabase
          .from("pupils")
          .update({ balance_owed: next })
          .eq("id", pupilIdForPayment);
        if (pupilUpdErr) console.error("[take-payment] pupil update", pupilUpdErr);
      }
    }

    const { error: payErr } = await supabase.from("payments").insert({
      instructor_id: instructorId,
      pupil_id: pupilIdForPayment,
      lesson_id: lessonId,
      amount: amountPaid,
      payment_method: method,
      payment_date: today,
      status: "completed",
    });
    if (payErr) console.error("[take-payment] payments insert", payErr);
  }

  // Responsive QR size — fits within viewport so layout never looks squashed
  const [qrSize, setQrSize] = useState<number>(220);
  useEffect(() => {
    const compute = () => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      // Reserve room for top text (~140) + bottom buttons (~140) + padding
      const reserved = 280;
      const maxByHeight = Math.max(120, vh - reserved);
      const maxByWidth = Math.max(120, vw - 96); // 24px padding + 14px qr padding each side, buffer
      setQrSize(Math.min(280, Math.floor(Math.min(maxByHeight, maxByWidth))));
    };
    compute();
    window.addEventListener("resize", compute);
    window.addEventListener("orientationchange", compute);
    return () => {
      window.removeEventListener("resize", compute);
      window.removeEventListener("orientationchange", compute);
    };
  }, []);

  // Auto-close after successful payment
  useEffect(() => {
    if (!recorded) return;
    const t = setTimeout(() => navigate({ to: "/home" }), 2500);
    return () => clearTimeout(t);
  }, [recorded, navigate]);

  const amountNum = Number(amount) || 0;
  const BOOKING_FEE = 1;
  const totalNum = amountNum + (passBookingFee ? BOOKING_FEE : 0);

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
      const amountPence = Math.round(totalNum * 100);
      const { data, error } = await supabase.functions.invoke("create-ryft-payment", {
        body: {
          amount: amountPence,
          pupil_id: pupilId || undefined,
          pupil_name: pupilName || undefined,
          description: description || "Payment",
          commission: 1,
          booking_fee_pence: 100,
          instructor_payout_pence: amountPence - 100,
          fee_absorbed_by_instructor: !passBookingFee,
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
          setRecorded(`£${totalNum.toFixed(2)} received via card (QR)`);
          setQrPaymentId(null);
        }
      } catch (e) {
        console.warn("[take-payment] qr poll", e);
      }
    }, 5000);
    return () => clearInterval(t);
  }, [qrPaymentId, totalNum]);

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
      const amountPence = Math.round(totalNum * 100);
      const { data, error } = await supabase.functions.invoke("create-ryft-payment", {
        body: {
          amount: amountPence,
          pupil_id: pupilId || undefined,
          pupil_name: pupilName || undefined,
          description: description || "Payment",
          commission: 1,
          mode: "embedded",
          booking_fee_pence: 100,
          instructor_payout_pence: amountPence - 100,
          fee_absorbed_by_instructor: !passBookingFee,
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
      // Set both state values — the useEffect below will run Ryft.init()
      // AFTER React has rendered the form HTML into the DOM.
      setCardClientSecret(clientSecret);
      setCardSessionId(pid ?? clientSecret);
    } catch (e) {
      console.error("[take-payment] startCard", e);
      toast.error("Couldn't start card payment");
    } finally {
      setCardLoading(false);
    }
  };

  // Initialise Ryft AFTER the form HTML is in the DOM
  useEffect(() => {
    if (!cardSessionId || !cardClientSecret) return;
    let cancelled = false;
    (async () => {
      // Wait for Ryft SDK to load
      const w = window as unknown as { Ryft?: any };
      let waited = 0;
      while (!w.Ryft && waited < 5000) {
        await new Promise((r) => setTimeout(r, 100));
        waited += 100;
      }
      if (cancelled) return;
      console.log("[take-payment] Ryft available:", !!w.Ryft);
      console.log("[take-payment] clientSecret:", cardClientSecret);
      if (!w.Ryft) {
        toast.error("Ryft SDK didn't load");
        return;
      }
      // Wait one more frame to guarantee the form HTML is committed
      await new Promise((r) => requestAnimationFrame(() => r(null)));
      if (cancelled) return;
      // Confirm the form element exists before init
      if (!document.getElementById("ryft-pay-form")) {
        console.warn("[take-payment] ryft-pay-form not in DOM yet");
        return;
      }
      try {
        const initResult = w.Ryft.init({
          publicKey: RYFT_PUBLIC_KEY,
          clientSecret: cardClientSecret,
          googlePay: { merchantName: "EveryDriver", merchantCountryCode: "GB" },
          applePay: { merchantName: "EveryDriver", merchantCountryCode: "GB" },
        });
        console.log("[take-payment] Ryft init result:", initResult);
        try {
          if (w.Ryft.googlePay) w.Ryft.googlePay.mount("#google-pay-container");
        } catch (e) { console.warn("Google Pay not available:", e); }
        try {
          if (w.Ryft.applePay) w.Ryft.applePay.mount("#apple-pay-container");
        } catch (e) { console.warn("Apple Pay not available:", e); }
        w.Ryft.addEventHandler("paymentSuccess", () => {
          toast.success("Payment received");
          setRecorded(`£${totalNum.toFixed(2)} received via card`);
        });
        w.Ryft.addEventHandler("paymentError", (err: any) => {
          console.error("[take-payment] ryft error", err);
          toast.error("Card payment failed");
        });
      } catch (e) {
        console.error("[take-payment] Ryft.init failed", e);
        toast.error("Couldn't initialise card form");
      }
    })();
    return () => { cancelled = true; };
  }, [cardSessionId, cardClientSecret, totalNum]);


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
      await recordPaymentSideEffects({
        instructorId,
        pupilIdForPayment: pupilId || null,
        amountPaid: amountNum,
        method: cashMethod,
      });
      setRecorded(
        `£${amountNum.toFixed(2)} recorded as ${cashMethod === "cash" ? "cash" : "bank transfer"}`,
      );
      toast.success("Payment recorded — balance updated");
    } catch (e) {
      console.error("[take-payment] recordCash", e);
      toast.error("Couldn't record payment");
    } finally {
      setCashSaving(false);
    }
  };

  const NAVY = "#0B1F3A";
  const numpadKeys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "back"];
  const numpadRows = [
    numpadKeys.slice(0, 3),
    numpadKeys.slice(3, 6),
    numpadKeys.slice(6, 9),
    numpadKeys.slice(9, 12),
  ];

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
          padding: "0 16px",
          display: "flex",
          alignItems: "center",
          flexShrink: 0,
          height: 52,
        }}
      >
        <div style={{ width: 32 }} />
        <div
          style={{
            flex: 1,
            textAlign: "center",
            fontSize: 16,
            fontWeight: 600,
          }}
        >
          Take payment
        </div>
        <button
          type="button"
          aria-label="Close"
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
          <X size={18} />
        </button>
      </div>

      <div
        style={{
          flex: 1,
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          maxWidth: 480,
          width: "100%",
          margin: "0 auto",
          position: "relative",
        }}
      >
        {/* Amount */}
        <div
          style={{
            textAlign: "center",
            flexShrink: 0,
            padding: passBookingFee ? "6px 16px 0" : "6px 16px",
            fontSize: 36,
            fontWeight: 700,
            color: NAVY,
            lineHeight: 1.05,
          }}
        >
          £{totalNum.toFixed(2)}
        </div>
        {passBookingFee && (
          <div
            style={{
              textAlign: "center",
              flexShrink: 0,
              padding: "2px 16px 4px",
              fontSize: 11,
              color: "#6B7280",
            }}
          >
            £{amountNum.toFixed(2)} + £1.00 booking fee
          </div>
        )}

        {/* Pupil + Description — compact single row */}
        <div
          style={{
            display: "flex",
            gap: 6,
            flexShrink: 0,
            padding: "0 16px 4px",
            alignItems: "center",
          }}
        >
          <select
            value={pupilId}
            onChange={(e) => setPupilId(e.target.value)}
            style={{
              flex: 1,
              minWidth: 0,
              padding: "6px 8px",
              borderRadius: 8,
              border: "0.5px solid #EEF2F7",
              fontSize: 13,
              color: NAVY,
              background: "#fff",
            }}
          >
            <option value="">For (optional)</option>
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
              flex: 1.5,
              minWidth: 0,
              padding: "6px 8px",
              borderRadius: 8,
              border: "0.5px solid #EEF2F7",
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
            margin: "8px 16px 0",
            height: 40,
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
                  boxShadow: active ? "0 1px 2px rgba(11,31,58,0.08)" : "none",
                  cursor: "pointer",
                }}
              >
                {t.icon}
                {t.label}
              </button>
            );
          })}
        </div>

        {/* Main area — numpad or tab-specific content */}
        <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          {tab === "qr" && (
            <>
              <div
                style={{
                  flex: "0 0 auto",
                  minHeight: 0,
                  padding: "6px 12px 8px",
                  display: "grid",
                  gridTemplateColumns: "repeat(3, 1fr)",
                  gridTemplateRows: "repeat(4, 52px)",
                  gap: 6,
                }}
              >
                {numpadKeys.map((k) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => press(k)}
                    style={{
                      height: 52,
                      maxHeight: 52,
                      padding: "4px 0",
                      fontSize: 20,
                      fontWeight: 600,
                      border: "0.5px solid #EEF2F7",
                      borderRadius: 8,
                      background: "white",
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: NAVY,
                    }}
                  >
                    {k === "back" ? <Delete size={20} /> : k}
                  </button>
                ))}
              </div>

              {/* Generate QR button */}
              <div style={{ padding: "0 16px 8px", flexShrink: 0 }}>
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
                  {qrGenerating ? "Generating…" : "Generate QR code"}
                </button>
              </div>
            </>
          )}

          {tab === "card" && (
            <div style={{ flex: 1, minHeight: 0, padding: "8px 16px", display: "flex", flexDirection: "column", overflow: "auto" }}>
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
                  {cardLoading ? "Loading…" : `Charge card · £${totalNum.toFixed(2)}`}
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
                        Pay £{totalNum.toFixed(2)}
                      </button>
                    </form>
                  </div>
                </>
              )}
            </div>
          )}

          {tab === "cash" && (
            <>
              <div
                style={{
                  flex: "0 0 auto",
                  minHeight: 0,
                  padding: "6px 12px 8px",
                  display: "grid",
                  gridTemplateColumns: "repeat(3, 1fr)",
                  gridTemplateRows: "repeat(4, 52px)",
                  gap: 6,
                }}
              >
                {numpadKeys.map((k) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => press(k)}
                    style={{
                      height: 52,
                      maxHeight: 52,
                      padding: "4px 0",
                      fontSize: 20,
                      fontWeight: 600,
                      border: "0.5px solid #EEF2F7",
                      borderRadius: 8,
                      background: "white",
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: NAVY,
                    }}
                  >
                    {k === "back" ? <Delete size={20} /> : k}
                  </button>
                ))}
              </div>

              {/* Cash controls */}
              <div style={{ padding: "0 16px 8px", flexShrink: 0, display: "flex", gap: 6 }}>
                <select
                  value={cashMethod}
                  onChange={(e) => setCashMethod(e.target.value as CashMethod)}
                  style={{
                    flex: 1,
                    padding: "0 10px",
                    height: 44,
                    borderRadius: 10,
                    border: "0.5px solid #EEF2F7",
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
                    background: "#1877D6",
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
            </>
          )}
        </div>

        {/* Success overlay */}
        {recorded && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              zIndex: 40,
              background: "rgba(255,255,255,0.92)",
              backdropFilter: "blur(4px)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 16,
              padding: 24,
            }}
          >
            <div
              style={{
                width: 72,
                height: 72,
                borderRadius: "50%",
                background: "#1877D6",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#fff",
              }}
            >
              <CircleCheck size={36} />
            </div>
            <div
              style={{
                fontSize: 18,
                fontWeight: 700,
                color: NAVY,
                textAlign: "center",
              }}
            >
              Payment Successful
            </div>
            <div
              style={{
                fontSize: 14,
                fontWeight: 500,
                color: "#1877D6",
                textAlign: "center",
              }}
            >
              {recorded}
            </div>
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
            fontFamily: "Inter, sans-serif",
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
              padding: "calc(env(safe-area-inset-top, 0px) + 16px) 24px 12px",
              textAlign: "center",
              color: "#fff",
            }}
          >
            <div style={{ fontSize: 16, fontWeight: 500, opacity: 0.85 }}>Scan to pay</div>
            <div style={{ fontSize: 40, fontWeight: 700, marginTop: 4, lineHeight: 1.05 }}>
              £{totalNum.toFixed(2)}
            </div>
            {passBookingFee && (
              <div style={{ fontSize: 12, opacity: 0.8, marginTop: 4 }}>
                £{amountNum.toFixed(2)} + £1.00 booking fee = £{totalNum.toFixed(2)}
              </div>
            )}
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
              gap: 8,
            }}
          >
            <div
              style={{
                background: "#fff",
                padding: 14,
                borderRadius: 14,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <QRCodeSVG value={qrUrl} size={qrSize} />
            </div>
            <div style={{ fontSize: 12, color: "#fff", opacity: 0.7 }}>
              Waiting for payment…
            </div>
          </div>

          {/* Bottom section (flex 0) */}
          <div
            style={{
              flex: "0 0 auto",
              padding: "10px 24px calc(env(safe-area-inset-bottom, 0px) + 12px)",
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            <button
              type="button"
              onClick={shareLink}
              style={{
                width: "100%",
                height: 42,
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
                height: 42,
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

