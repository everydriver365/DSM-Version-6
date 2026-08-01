import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { QRCodeSVG } from "qrcode.react";
import { Copy, CreditCard, Search, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabaseClient";
import { BottomSheet, PrimaryButton, SectionLabel } from "@/components/dsm/BottomSheetV2";

const NAVY = "#0B1F3A";
const BLUE = "#1877D6";
const BOOKING_FEE = 1;

type Tab = "qr" | "cash";
/** Matches take-payment.tsx's CashMethod, plus "other" for this sheet. */
type CashMethod = "cash" | "bank" | "other";

export interface TakePaymentSheetProps {
  open: boolean;
  onClose: () => void;
  onSaved?: (method: string, amount: number) => void;
  initialPupilId?: string;
}

export function TakePaymentSheet({
  open,
  onClose,
  onSaved,
  initialPupilId,
}: TakePaymentSheetProps) {
  const navigate = useNavigate();

  const [tab, setTab] = useState<Tab>("qr");
  const [amount, setAmount] = useState<string>("");
  const [description, setDescription] = useState("");
  const [pupils, setPupils] = useState<{ id: string; name: string }[]>([]);
  const [pupilId, setPupilId] = useState<string>(initialPupilId ?? "");
  const [pupilQuery, setPupilQuery] = useState("");
  const [pupilOpen, setPupilOpen] = useState(false);
  const [passBookingFee, setPassBookingFee] = useState<boolean>(true);

  // QR
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [qrPaymentId, setQrPaymentId] = useState<string | null>(null);
  const [qrGenerating, setQrGenerating] = useState(false);

  // Cash
  const [cashMethod, setCashMethod] = useState<CashMethod>("cash");
  const [cashSaving, setCashSaving] = useState(false);

  const amountNum = Number(amount) || 0;
  const totalNum = amountNum + (passBookingFee ? BOOKING_FEE : 0);
  const pupilName = pupils.find((p) => p.id === pupilId)?.name ?? "";

  // Reset transient state whenever the sheet opens.
  useEffect(() => {
    if (!open) return;
    setTab("qr");
    setAmount("");
    setDescription("");
    setPupilId(initialPupilId ?? "");
    setPupilQuery("");
    setPupilOpen(false);
    setQrUrl(null);
    setQrPaymentId(null);
    setQrGenerating(false);
    setCashMethod("cash");
    setCashSaving(false);
  }, [open, initialPupilId]);

  // Load instructor's booking-fee preference (same as take-payment.tsx)
  useEffect(() => {
    if (!open) return;
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
        console.warn("[TakePaymentSheet] load pass_booking_fee", error);
        return;
      }
      if (data && typeof (data as { pass_booking_fee?: boolean }).pass_booking_fee === "boolean") {
        setPassBookingFee((data as { pass_booking_fee: boolean }).pass_booking_fee);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open]);

  // Load instructor's active pupils
  useEffect(() => {
    if (!open) return;
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
        console.warn("[TakePaymentSheet] load pupils", error);
        return;
      }
      setPupils((data ?? []) as { id: string; name: string }[]);
    })();
    return () => {
      cancelled = true;
    };
  }, [open]);

  const filteredPupils = useMemo(() => {
    const q = pupilQuery.trim().toLowerCase();
    if (!q) return pupils;
    return pupils.filter((p) => p.name.toLowerCase().includes(q));
  }, [pupils, pupilQuery]);

  // ---------------------------------------------------------------------
  // Payment side-effects — mirrors take-payment.tsx recordPaymentSideEffects
  // (no lessonId targeting here; the sheet is not lesson-scoped).
  // NOTE: never writes amount_due — fixed at lesson creation.
  // ---------------------------------------------------------------------
  const descriptionRef = useRef(description);
  descriptionRef.current = description;

  async function recordPaymentSideEffects(args: {
    instructorId: string | null;
    pupilIdForPayment: string | null;
    amountPaid: number;
    method: "cash" | "bank" | "other" | "card";
  }) {
    const { instructorId, pupilIdForPayment, amountPaid, method } = args;
    const now = new Date().toISOString();
    const today = now.slice(0, 10);
    const methodNorm = method === "bank" ? "bank_transfer" : method;

    let remaining = amountPaid;

    // 1) Apply to oldest unpaid lessons for the pupil.
    if (pupilIdForPayment && remaining > 0) {
      const { data: unpaid } = await supabase
        .from("lessons")
        .select("id, amount_due")
        .eq("pupil_id", pupilIdForPayment)
        .eq("payment_status", "unpaid")
        .is("deleted_at", null)
        .order("lesson_date", { ascending: true });
      for (const l of (unpaid ?? []) as { id: string; amount_due: number | null }[]) {
        if (remaining <= 0) break;
        const due = Number(l.amount_due ?? 0);
        if (due <= 0) continue;
        if (due <= remaining) {
          await supabase
            .from("lessons")
            .update({
              payment_status: "paid",
              payment_method: methodNorm,
              paid_at: now,
              paid_amount: due,
            })
            .eq("id", l.id);
          remaining -= due;
        } else {
          await supabase
            .from("lessons")
            .update({
              payment_status: "partial",
              payment_method: methodNorm,
              paid_at: now,
              paid_amount: remaining,
            })
            .eq("id", l.id);
          remaining = 0;
        }
      }
    }

    // 2) Any overpayment → pupil credit (account_balance).
    if (pupilIdForPayment && remaining > 0) {
      const { data: pRow } = await supabase
        .from("pupils")
        .select("account_balance")
        .eq("id", pupilIdForPayment)
        .maybeSingle();
      const cur = Number((pRow as { account_balance?: number | null } | null)?.account_balance ?? 0);
      await supabase
        .from("pupils")
        .update({ account_balance: cur + remaining })
        .eq("id", pupilIdForPayment);
    }

    // 3) Audit trail — one lesson_history row per payment.
    if (instructorId && pupilIdForPayment) {
      const { error: hErr } = await supabase.from("lesson_history").insert({
        instructor_id: instructorId,
        pupil_id: pupilIdForPayment,
        lesson_cost: amountPaid,
        payment_status: "paid",
        payment_method: methodNorm,
        notes: descriptionRef.current.trim() || null,
        created_at: now,
      });
      if (hErr) console.error("[TakePaymentSheet] lesson_history insert", hErr);
    }

    // 4) Legacy payments table row for reporting compatibility.
    const { error: payErr } = await supabase.from("payments").insert({
      instructor_id: instructorId,
      pupil_id: pupilIdForPayment,
      amount: amountPaid,
      payment_method: methodNorm,
      payment_date: today,
      status: "completed",
    });
    if (payErr) console.error("[TakePaymentSheet] payments insert", payErr);
  }

  // --- QR flow (identical construction to take-payment.tsx) ---
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
          payment_type: "qr",
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
      console.error("[TakePaymentSheet] generateQr", e);
      toast.error("Couldn't generate payment link");
    } finally {
      setQrGenerating(false);
    }
  };

  const copyLink = async () => {
    if (!qrUrl) return;
    try {
      await navigator.clipboard.writeText(qrUrl);
      toast.success("Link copied");
    } catch {
      toast.error("Copy failed");
    }
  };

  // Poll QR payment status — same pattern as take-payment.tsx
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
          const { data: u } = await supabase.auth.getUser();
          const instructorId = u?.user?.id ?? null;
          await recordPaymentSideEffects({
            instructorId,
            pupilIdForPayment: pupilId || null,
            amountPaid: totalNum,
            method: "card",
          });
          toast.success("Payment received — balance updated");
          setQrPaymentId(null);
          if (typeof window !== "undefined") {
            window.dispatchEvent(new Event("dsm-payment-recorded"));
          }
          onSaved?.("qr", totalNum);
          onClose();
        }
      } catch (e) {
        console.warn("[TakePaymentSheet] qr poll", e);
      }
    }, 5000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qrPaymentId, totalNum, pupilId]);

  // --- Cash / bank / other ---
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
      toast.success("Payment recorded — balance updated");
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("dsm-payment-recorded"));
      }
      onSaved?.(cashMethod, amountNum);
      onClose();
    } catch (e) {
      console.error("[TakePaymentSheet] recordCash", e);
      toast.error("Couldn't record payment");
    } finally {
      setCashSaving(false);
    }
  };

  if (!open) return null;

  const inputStyle: React.CSSProperties = {
    width: "100%",
    height: 44,
    borderRadius: 10,
    border: "0.5px solid #EEF2F7",
    background: "#fff",
    padding: "0 12px",
    fontSize: 14,
    color: NAVY,
    outline: "none",
  };

  const cardStyle: React.CSSProperties = {
    background: "#fff",
    borderRadius: 14,
    boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
    padding: 14,
    marginBottom: 12,
  };

  const footer =
    tab === "qr" ? (
      qrUrl ? (
        <PrimaryButton onClick={copyLink}>Copy link</PrimaryButton>
      ) : (
        <PrimaryButton onClick={generateQr} disabled={qrGenerating || amountNum <= 0}>
          {qrGenerating ? "Generating…" : "Generate QR"}
        </PrimaryButton>
      )
    ) : (
      <PrimaryButton onClick={recordCash} disabled={cashSaving || amountNum <= 0}>
        {cashSaving ? "Saving…" : "Record payment"}
      </PrimaryButton>
    );

  return (
    <BottomSheet
      title="Take payment"
      subtitle={totalNum > 0 ? `£${totalNum.toFixed(2)} total` : undefined}
      onClose={onClose}
      footer={footer}
    >
      <style>{`@keyframes tps-pulse{0%,100%{opacity:1}50%{opacity:.45}}`}</style>

      {/* Tabs */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 4,
          background: "#F4F6FA",
          padding: 3,
          borderRadius: 10,
          marginBottom: 8,
        }}
      >
        {([
          { k: "qr" as const, label: "QR code" },
          { k: "cash" as const, label: "Cash / bank" },
        ]).map((t) => {
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
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Card payment link → full page */}
      <button
        type="button"
        onClick={() => {
          onClose();
          navigate({ to: "/take-payment", search: { pupilId: pupilId || undefined, lessonId: undefined } });
        }}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          background: "transparent",
          border: "none",
          padding: "2px 0 12px",
          color: BLUE,
          fontSize: 13,
          fontWeight: 600,
          cursor: "pointer",
        }}
      >
        <CreditCard size={14} />
        Card payment
        <ChevronRight size={14} />
      </button>

      {/* Pupil */}
      <div style={cardStyle}>
        <SectionLabel>PUPIL</SectionLabel>
        <button
          type="button"
          onClick={() => setPupilOpen((v) => !v)}
          style={{ ...inputStyle, textAlign: "left", cursor: "pointer" }}
        >
          {pupilName || "Select pupil (optional)"}
        </button>
        {pupilOpen && (
          <div style={{ marginTop: 8 }}>
            <div style={{ position: "relative" }}>
              <Search
                size={14}
                style={{ position: "absolute", left: 10, top: 15, color: "#8A93A3" }}
              />
              <input
                autoFocus
                value={pupilQuery}
                onChange={(e) => setPupilQuery(e.target.value)}
                placeholder="Search pupils"
                style={{ ...inputStyle, paddingLeft: 30 }}
              />
            </div>
            <div style={{ maxHeight: 180, overflowY: "auto", marginTop: 6 }}>
              {filteredPupils.length === 0 && (
                <div style={{ fontSize: 13, color: "#8A93A3", padding: "8px 2px" }}>
                  No pupils found
                </div>
              )}
              {filteredPupils.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    setPupilId(p.id);
                    setPupilOpen(false);
                    setPupilQuery("");
                  }}
                  style={{
                    display: "block",
                    width: "100%",
                    textAlign: "left",
                    padding: "10px 4px",
                    borderRadius: 8,
                    border: "none",
                    background: p.id === pupilId ? "#F3F8FF" : "transparent",
                    fontSize: 14,
                    color: NAVY,
                    cursor: "pointer",
                  }}
                >
                  {p.name}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Amount + description */}
      <div style={cardStyle}>
        <SectionLabel>AMOUNT</SectionLabel>
        <div style={{ position: "relative" }}>
          <span
            style={{
              position: "absolute",
              left: 12,
              top: 12,
              fontSize: 16,
              fontWeight: 600,
              color: NAVY,
            }}
          >
            £
          </span>
          <input
            type="text"
            inputMode="decimal"
            value={amount}
            onChange={(e) => {
              const v = e.target.value.replace(/[^0-9.]/g, "");
              if ((v.match(/\./g) ?? []).length > 1) return;
              const parts = v.split(".");
              if (parts[1] && parts[1].length > 2) return;
              setAmount(v);
            }}
            placeholder="0.00"
            style={{
              ...inputStyle,
              paddingLeft: 26,
              fontSize: 18,
              fontWeight: 600,
            }}
          />
        </div>

        <div style={{ height: 10 }} />
        <SectionLabel>DESCRIPTION</SectionLabel>
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Optional"
          style={inputStyle}
        />

        {/* Booking fee toggle */}
        <label
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginTop: 12,
            cursor: "pointer",
          }}
        >
          <span style={{ fontSize: 13, color: NAVY }}>
            Pass £1.00 booking fee to pupil
          </span>
          <input
            type="checkbox"
            checked={passBookingFee}
            onChange={(e) => setPassBookingFee(e.target.checked)}
            style={{ width: 18, height: 18, accentColor: BLUE }}
          />
        </label>
        {passBookingFee && amountNum > 0 && (
          <div style={{ fontSize: 11, color: "#6B7280", marginTop: 4 }}>
            £{amountNum.toFixed(2)} + £1.00 booking fee = £{totalNum.toFixed(2)}
          </div>
        )}
      </div>

      {/* QR tab body */}
      {tab === "qr" && qrUrl && (
        <div style={{ ...cardStyle, textAlign: "center" }}>
          <div
            style={{
              display: "inline-flex",
              padding: 12,
              background: "#fff",
              borderRadius: 12,
              border: "1px solid #EEF2F7",
            }}
          >
            <QRCodeSVG value={qrUrl} size={200} />
          </div>
          <div
            style={{
              marginTop: 12,
              fontSize: 13,
              fontWeight: 600,
              color: BLUE,
              animation: "tps-pulse 1.6s ease-in-out infinite",
            }}
          >
            Waiting for payment…
          </div>
          <button
            type="button"
            onClick={copyLink}
            style={{
              marginTop: 10,
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              background: "#F3F8FF",
              border: "none",
              borderRadius: 999,
              padding: "8px 14px",
              fontSize: 13,
              fontWeight: 600,
              color: NAVY,
              cursor: "pointer",
            }}
          >
            <Copy size={14} />
            Copy link
          </button>
        </div>
      )}

      {/* Cash tab body */}
      {tab === "cash" && (
        <div style={cardStyle}>
          <SectionLabel>METHOD</SectionLabel>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
            {([
              { k: "cash" as const, label: "Cash" },
              { k: "bank" as const, label: "Bank transfer" },
              { k: "other" as const, label: "Other" },
            ]).map((m) => {
              const active = cashMethod === m.k;
              return (
                <button
                  key={m.k}
                  type="button"
                  onClick={() => setCashMethod(m.k)}
                  style={{
                    height: 44,
                    borderRadius: 10,
                    border: active ? `1.5px solid ${BLUE}` : "1px solid #EEF2F7",
                    background: active ? "#F3F8FF" : "#fff",
                    color: active ? BLUE : NAVY,
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  {m.label}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </BottomSheet>
  );
}

export default TakePaymentSheet;
