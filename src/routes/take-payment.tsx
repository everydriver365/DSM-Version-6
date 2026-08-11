import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ChevronLeft, ChevronDown, Delete, QrCode, CreditCard, Banknote, Share2, Copy, X, CircleCheck } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";
import { supabase } from "../lib/supabaseClient";
import { recordPayment, recordPaymentWithPackage } from "@/lib/payments";


export const Route = createFileRoute("/take-payment")({
  head: () => ({ meta: [{ title: "Take payment" }] }),
  validateSearch: (search: Record<string, unknown>): { lessonId?: string; pupilId?: string } => ({
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
  const [hoursBought, setHoursBought] = useState<string>("");
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

  // Shared: after a successful payment, reconcile via the single canonical
  // payment write path in @/lib/payments.
  async function recordPaymentSideEffects(args: {
    instructorId: string | null;
    pupilIdForPayment: string | null;
    amountPaid: number;
    method: "cash" | "bank" | "card";
  }) {
    const { pupilIdForPayment, amountPaid, method } = args;
    if (!pupilIdForPayment || !(amountPaid > 0)) return;
    const methodNorm = method === "bank" ? "bank_transfer" : method;
    const hours = Number(hoursBought) || 0;

    const { data: pupilRow } = await supabase
      .from("pupils")
      .select("account_balance")
      .eq("id", pupilIdForPayment)
      .maybeSingle();
    const currentAccountBalance = Number(
      (pupilRow as { account_balance?: number | null } | null)?.account_balance ?? 0,
    );

    const paymentInput = {
      pupilId: pupilIdForPayment,
      amount: amountPaid,
      method: methodNorm,
      notes: description.trim() || null,
      currentAccountBalance,
      targetLessonId: lessonId,
    };

    if (hours > 0) {
      await recordPaymentWithPackage({ ...paymentInput, hoursBought: hours });
    } else {
      await recordPayment(paymentInput);
    }

    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("dsm-payment-recorded"));
    }
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
  const bookingFee = amountNum * 0.01;
  const totalNum = amountNum + (passBookingFee ? bookingFee : 0);

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

  // --- QR flow (Square payment link) ---
  const generateQr = async () => {
    if (amountNum <= 0) {
      toast.error("Enter an amount first");
      return;
    }
    setQrGenerating(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      const instructorId = u?.user?.id ?? null;
      if (!instructorId) {
        toast.error("Not signed in — please log in again");
        return;
      }
      const amountPence = Math.round(totalNum * 100);
      if (!amountPence || amountPence <= 0) {
        toast.error("Enter an amount first");
        return;
      }
      const { data, error } = await supabase.functions.invoke("square-create-payment-link", {
        body: {
          instructor_id: instructorId,
          pupil_id: pupilId || null,
          lesson_id: lessonId,
          amount_pence: amountPence,
          description: description || "Payment",
        },
      });

      if (error) throw error;
      const res = data as { no_square?: boolean; url?: string; id?: string } | null;
      if (res?.no_square) {
        toast.error("Square not connected. Connect Square in your profile.");
        return;
      }
      if (!res?.url) throw new Error("No payment URL returned");
      setQrUrl(res.url);
      setQrPaymentId(res.id ?? null);
      toast.success("Square payment link ready");
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



  // --- Card (Square hosted checkout) ---
  const startCard = async () => {
    if (amountNum <= 0) {
      toast.error("Enter an amount first");
      return;
    }
    setCardLoading(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      const instructorId = u?.user?.id ?? null;
      if (!instructorId) {
        toast.error("Not signed in — please log in again");
        return;
      }
      const amountPence = Math.round(totalNum * 100);
      if (!amountPence || amountPence <= 0) {
        toast.error("Enter an amount first");
        return;
      }
      const { data, error } = await supabase.functions.invoke("square-create-payment-link", {
        body: {
          instructor_id: instructorId,
          pupil_id: pupilId || null,
          lesson_id: lessonId,
          amount_pence: amountPence,
          description: description || "Payment",
        },
      });
      if (error) throw error;
      const res = data as { no_square?: boolean; url?: string } | null;
      if (res?.no_square) {
        toast.error("Square not connected. Connect Square in your profile.");
        return;
      }
      if (!res?.url) throw new Error("No payment URL returned");
      window.location.href = res.url;
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
  const fieldCardStyle: React.CSSProperties = {
    background: "#fff",
    borderRadius: 14,
    padding: "13px 15px",
    boxShadow: "0 3px 0 #E4E4E8",
  };
  // Every key is the same box on every device: padding is replaced by a fixed
  // min-height with line-height 1, so digits, the "." and the backspace icon
  // all centre identically instead of being sized by their own glyph metrics.
  const keyStyle: React.CSSProperties = {
    background: "#fff",
    borderRadius: 16,
    padding: 0,
    minHeight: 64,
    boxSizing: "border-box",
    border: "none",
    WebkitAppearance: "none",
    appearance: "none",
    font: "inherit",
    lineHeight: 1,
    textAlign: "center",
    color: NAVY,
    fontSize: 24,
    fontWeight: 800,
    fontVariantNumeric: "tabular-nums",
    boxShadow: "0 3px 0 #E4E4E8",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    WebkitTapHighlightColor: "transparent",
    userSelect: "none",
  };

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
            fontSize: 19,
            fontWeight: 800,
            letterSpacing: "-0.3px",
            color: "#fff",
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
            padding: "10px 16px",
            fontSize: 46,
            fontWeight: 900,
            letterSpacing: "-1.5px",
            color: NAVY,
            lineHeight: 1.05,
          }}
        >
          £{totalNum.toFixed(2)}
        </div>


        {/* Pupil + Description — compact single row */}
        <div
          style={{
            display: "flex",
            gap: 8,
            flexShrink: 0,
            padding: "12px 16px 0",
            alignItems: "stretch",
          }}
        >
          <div style={{ ...fieldCardStyle, width: 118, flexShrink: 0, position: "relative", display: "flex", alignItems: "center" }}>
            <select
              value={pupilId}
              onChange={(e) => setPupilId(e.target.value)}
              style={{
                flex: 1,
                minWidth: 0,
                appearance: "none",
                WebkitAppearance: "none",
                border: "none",
                outline: "none",
                background: "transparent",
                fontSize: 14,
                fontWeight: 700,
                color: NAVY,
                paddingRight: 16,
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                overflow: "hidden",
              }}
            >
              <option value="">For (optional)</option>
              {pupils.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <ChevronDown size={14} color="#8A8A8E" style={{ position: "absolute", right: 12, pointerEvents: "none" }} />
          </div>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description"
            style={{
              ...fieldCardStyle,
              flex: 1,
              minWidth: 0,
              border: "none",
              outline: "none",
              fontSize: 14,
              fontWeight: 500,
              color: NAVY,
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              overflow: "hidden",
            }}
          />
          <div style={{ ...fieldCardStyle, width: 52, flexShrink: 0, padding: "11px 10px" }}>

            <input
              type="number"
              inputMode="decimal"
              step="0.5"
              min="0"
              value={hoursBought}
              onChange={(e) => setHoursBought(e.target.value)}
              placeholder="0"
              title="Hours bought (optional)"
              style={{
                width: "100%",
                minWidth: 0,
                border: "none",
                outline: "none",
                background: "transparent",
                fontSize: 14,
                fontWeight: 800,
                color: NAVY,
                textAlign: "center",
                padding: 0,
              }}
            />
            <div
              style={{
                textAlign: "center",
                color: "#B0B0B5",
                fontSize: 9.5,
                fontWeight: 600,
                marginTop: 2,
              }}
            >
              HRS
            </div>
          </div>
        </div>


        {/* Tabs */}
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            background: "#fff",
            padding: 4,
            borderRadius: 16,
            boxShadow: "0 3px 0 #E4E4E8",
            flexShrink: 0,
            margin: "10px 16px 0",
          }}
        >
          {(
            [
              { k: "qr" as const, label: "QR Code", icon: <QrCode size={15} /> },
              { k: "card" as const, label: "Card", icon: <CreditCard size={15} /> },
              { k: "cash" as const, label: "Cash/Transfer", icon: <Banknote size={15} /> },
            ]
          ).map((t) => {
            const active = tab === t.k;
            return (
              <button
                key={t.k}
                type="button"
                onClick={() => setTab(t.k)}
                style={{
                  flex: 1,
                  minWidth: 0,
                  padding: "11px 4px",
                  borderRadius: 12,
                  border: "none",
                  background: active ? NAVY : "transparent",
                  color: active ? "#fff" : "#8A8A8E",
                  fontSize: 13,
                  fontWeight: 700,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
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
                  padding: "10px 16px 12px",
                  display: "grid",
                  gridTemplateColumns: "repeat(3, 1fr)",
                  gap: 10,
                }}
              >
                {numpadKeys.map((k) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => press(k)}
                    style={keyStyle}
                  >
                    {k === "back" ? (
                      <span style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 22, height: 22 }}>
                        <Delete size={22} color="#6B6B6F" style={{ display: "block" }} />
                      </span>
                    ) : k}
                  </button>
                ))}
              </div>

              {/* Generate QR button */}
              <div style={{ padding: "0 16px 12px", flexShrink: 0 }}>
                <button
                  type="button"
                  onClick={generateQr}
                  disabled={qrGenerating}
                  style={{
                    width: "100%",
                    padding: 17,
                    borderRadius: 16,
                    background: NAVY,
                    color: "#fff",
                    border: "none",
                    fontSize: 16,
                    fontWeight: 800,
                    boxShadow: "0 4px 0 #050D1C",
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
              <button
                type="button"
                onClick={startCard}
                disabled={cardLoading}
                style={{
                  width: "100%",
                  padding: 17,
                  borderRadius: 16,
                  background: NAVY,
                  color: "#fff",
                  border: "none",
                  fontSize: 16,
                  fontWeight: 800,
                  boxShadow: "0 4px 0 #050D1C",
                  opacity: cardLoading ? 0.7 : 1,
                  cursor: "pointer",
                }}
              >
                {cardLoading ? "Loading…" : `Pay by card with Square · £${totalNum.toFixed(2)}`}
              </button>
              <div style={{ textAlign: "center", color: "#9CA3AF", fontSize: 13, marginTop: 12 }}>
                Opens a secure Square checkout page
              </div>
            </div>

          )}

          {tab === "cash" && (
            <>
              <div
                style={{
                  flex: "0 0 auto",
                  minHeight: 0,
                  padding: "10px 16px 12px",
                  display: "grid",
                  gridTemplateColumns: "repeat(3, 1fr)",
                  gap: 10,
                }}
              >
                {numpadKeys.map((k) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => press(k)}
                    style={keyStyle}
                  >
                    {k === "back" ? (
                      <span style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 22, height: 22 }}>
                        <Delete size={22} color="#6B6B6F" style={{ display: "block" }} />
                      </span>
                    ) : k}
                  </button>
                ))}
              </div>


              {/* Cash controls */}
              <div style={{ padding: "0 16px 12px", flexShrink: 0, display: "flex", gap: 8, alignItems: "center" }}>
                <div style={{ ...fieldCardStyle, flex: 1, position: "relative", display: "flex", alignItems: "center" }}>
                  <select
                    value={cashMethod}
                    onChange={(e) => setCashMethod(e.target.value as CashMethod)}
                    style={{
                      flex: 1,
                      minWidth: 0,
                      appearance: "none",
                      WebkitAppearance: "none",
                      border: "none",
                      outline: "none",
                      background: "transparent",
                      fontSize: 14,
                      fontWeight: 700,
                      color: NAVY,
                      paddingRight: 16,
                    }}
                  >
                    <option value="cash">Cash</option>
                    <option value="bank">Bank transfer</option>
                  </select>
                  <ChevronDown size={14} color="#8A8A8E" style={{ position: "absolute", right: 12, pointerEvents: "none" }} />
                </div>
                <button
                  type="button"
                  onClick={recordCash}
                  disabled={cashSaving}
                  style={{
                    flex: 1.2,
                    padding: 17,
                    borderRadius: 16,
                    background: NAVY,
                    color: "#fff",
                    border: "none",
                    fontSize: 16,
                    fontWeight: 800,
                    boxShadow: "0 4px 0 #050D1C",
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
              padding: "calc(env(safe-area-inset-top, 0px) + 16px) 24px 12px",
              textAlign: "center",
              color: "#fff",
            }}
          >
            <div style={{ fontSize: 16, fontWeight: 500, opacity: 0.85 }}>Scan to pay</div>
            <div style={{ fontSize: 40, fontWeight: 700, marginTop: 4, lineHeight: 1.05 }}>
              £{totalNum.toFixed(2)}
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

