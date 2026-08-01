import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { QRCodeSVG } from "qrcode.react";
import {
  Package,
  Building2,
  Clock,
  Pencil,
  Banknote,
  Landmark,
  QrCode,
  Link2,
  CreditCard,
  Copy,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabaseClient";
import { BottomSheet, PrimaryButton, SectionLabel } from "@/components/dsm/BottomSheetV2";

const NAVY = "#0B1F3A";
const BLUE = "#1877D6";
const BLUE_BG = "#E6F1FB";
const RED = "#CC2229";
const GREEN = "#2FA86A";
const HAIRLINE = "#EEF2F7";

type PricingType = "block" | "national_intensives" | "standard" | "custom";
type PayMethod = "cash" | "bank_transfer" | "qr" | "link" | "klarna" | "clearpay";

export interface PricingPaymentSheetProps {
  open: boolean;
  onClose: () => void;
  pupilId: string;
  instructorId: string;
  onSaved?: () => void;
}

interface PupilRow {
  id: string;
  name: string | null;
  pricing_type: string | null;
  prepaid_hours: number | null;
  block_hours_total: number | null;
  prepaid_amount_paid: number | null;
  custom_rate: number | null;
  custom_rate_90: number | null;
  custom_rate_120: number | null;
  hourly_rate_override: number | null;
  ni_amount_total: number | null;
  ni_amount_paid: number | null;
  ni_payer: string | null;
  ni_payment_date: string | null;
  ni_reference: string | null;
  account_balance: number | null;
}

interface InstructorRow {
  hourly_rate: number | null;
  klarna_enabled: boolean | null;
  clearpay_enabled: boolean | null;
  accepted_payment_methods: string[] | null;
}

interface HistoryRow {
  amount: number;
  payment_method: string | null;
  date: string | null;
  payment_status: string | null;
}

const PRICING_OPTIONS: { key: PricingType; label: string; Icon: typeof Package }[] = [
  { key: "block", label: "Block", Icon: Package },
  { key: "national_intensives", label: "National Intensives", Icon: Building2 },
  { key: "standard", label: "Standard", Icon: Clock },
  { key: "custom", label: "Custom rate", Icon: Pencil },
];

const METHOD_META: Record<string, { label: string; Icon: typeof Banknote }> = {
  cash: { label: "Cash", Icon: Banknote },
  bank_transfer: { label: "Bank transfer", Icon: Landmark },
  bank: { label: "Bank transfer", Icon: Landmark },
  qr: { label: "QR code", Icon: QrCode },
  link: { label: "Payment link", Icon: Link2 },
  card: { label: "Card", Icon: CreditCard },
  klarna: { label: "Klarna", Icon: CreditCard },
  clearpay: { label: "Clearpay", Icon: CreditCard },
};

const money = (n: number) => `£${(Number(n) || 0).toFixed(2)}`;

function fmtDate(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  height: 44,
  borderRadius: 10,
  border: `0.5px solid ${HAIRLINE}`,
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ fontSize: 12, color: "#6B7280", marginBottom: 4 }}>{label}</div>
      {children}
    </div>
  );
}

function ReadOnlyRow({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "8px 0",
        borderTop: `1px solid ${HAIRLINE}`,
      }}
    >
      <span style={{ fontSize: 13, color: "#6B7280" }}>{label}</span>
      <span style={{ fontSize: 14, fontWeight: 600, color: color ?? NAVY }}>{value}</span>
    </div>
  );
}

export function PricingPaymentSheet({
  open,
  onClose,
  pupilId,
  instructorId,
  onSaved,
}: PricingPaymentSheetProps) {
  const navigate = useNavigate();

  const [pupil, setPupil] = useState<PupilRow | null>(null);
  const [instructor, setInstructor] = useState<InstructorRow | null>(null);
  const [history, setHistory] = useState<HistoryRow[]>([]);

  const [pricingType, setPricingType] = useState<PricingType>("standard");

  // editable pricing fields
  const [hoursTotal, setHoursTotal] = useState("");
  const [packagePrice, setPackagePrice] = useState("");
  const [niTotal, setNiTotal] = useState("");
  const [niRef, setNiRef] = useState("");
  const [niPayer, setNiPayer] = useState<"national_intensives" | "pupil">("national_intensives");
  const [rate60, setRate60] = useState("");
  const [rate90, setRate90] = useState("");
  const [rate120, setRate120] = useState("");
  const [savingPricing, setSavingPricing] = useState(false);

  // payment
  const [amount, setAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [method, setMethod] = useState<PayMethod>("cash");
  const [paidBy, setPaidBy] = useState<"national_intensives" | "pupil">("national_intensives");
  const [saving, setSaving] = useState(false);
  const [qrUrl, setQrUrl] = useState<string | null>(null);

  const amountNum = Number(amount) || 0;

  // ---- global bottom-nav hide -------------------------------------------
  useEffect(() => {
    if (!open || typeof window === "undefined") return;
    window.dispatchEvent(new Event("dsm-sheet-open"));
    return () => window.dispatchEvent(new Event("dsm-sheet-close"));
  }, [open]);

  const handleClose = useCallback(() => {
    if (typeof window !== "undefined") window.dispatchEvent(new Event("dsm-sheet-close"));
    onClose();
  }, [onClose]);

  // ---- data load ---------------------------------------------------------
  const load = useCallback(async () => {
    const { data: p, error: pErr } = await supabase
      .from("pupils")
      .select(
        "id, name, pricing_type, prepaid_hours, block_hours_total, prepaid_amount_paid, custom_rate, custom_rate_90, custom_rate_120, hourly_rate_override, ni_amount_total, ni_amount_paid, ni_payer, ni_payment_date, ni_reference, account_balance",
      )
      .eq("id", pupilId)
      .maybeSingle();
    if (pErr) console.warn("[PricingPaymentSheet] pupil", pErr);
    if (p) {
      const row = p as unknown as PupilRow;
      setPupil(row);
      const t = (row.pricing_type ?? "standard") as PricingType;
      setPricingType(PRICING_OPTIONS.some((o) => o.key === t) ? t : "standard");
      setHoursTotal(row.block_hours_total != null ? String(row.block_hours_total) : "");
      setPackagePrice(row.prepaid_amount_paid != null ? String(row.prepaid_amount_paid) : "");
      setNiTotal(row.ni_amount_total != null ? String(row.ni_amount_total) : "");
      setNiRef(row.ni_reference ?? "");
      setNiPayer(row.ni_payer === "pupil" ? "pupil" : "national_intensives");
      setRate60(row.custom_rate != null ? String(row.custom_rate) : "");
      setRate90(row.custom_rate_90 != null ? String(row.custom_rate_90) : "");
      setRate120(row.custom_rate_120 != null ? String(row.custom_rate_120) : "");
    }

    const { data: i, error: iErr } = await supabase
      .from("instructors")
      .select("hourly_rate, klarna_enabled, clearpay_enabled, accepted_payment_methods")
      .eq("id", instructorId)
      .maybeSingle();
    if (iErr) console.warn("[PricingPaymentSheet] instructor", iErr);
    if (i) setInstructor(i as unknown as InstructorRow);

    const { data: h, error: hErr } = await supabase
      .from("lesson_history")
      .select("lesson_cost, payment_method, payment_status, created_at")
      .eq("pupil_id", pupilId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(20);
    if (hErr) console.warn("[PricingPaymentSheet] history", hErr);
    setHistory(
      ((h ?? []) as {
        lesson_cost: number | null;
        payment_method: string | null;
        payment_status: string | null;
        created_at: string | null;
      }[]).map((r) => ({
        amount: Number(r.lesson_cost ?? 0),
        payment_method: r.payment_method,
        payment_status: r.payment_status,
        date: r.created_at,
      })),
    );
  }, [pupilId, instructorId]);

  useEffect(() => {
    if (!open) return;
    setQrUrl(null);
    setAmount("");
    setPaymentDate(new Date().toISOString().slice(0, 10));
    setMethod("cash");
    void load();
  }, [open, load]);

  const amountPaidSoFar = useMemo(
    () => history.reduce((s, r) => s + (Number(r.amount) || 0), 0),
    [history],
  );

  // ---- pricing type save -------------------------------------------------
  const selectType = async (t: PricingType) => {
    setPricingType(t);
    const { error } = await supabase.from("pupils").update({ pricing_type: t }).eq("id", pupilId);
    if (error) {
      console.error("[PricingPaymentSheet] pricing_type", error);
      toast.error("Couldn't save pricing type");
      return;
    }
    onSaved?.();
  };

  const savePricingFields = async () => {
    setSavingPricing(true);
    try {
      let patch: Record<string, unknown> = {};
      if (pricingType === "block") {
        patch = {
          block_hours_total: hoursTotal === "" ? null : Number(hoursTotal),
          prepaid_amount_paid: packagePrice === "" ? null : Number(packagePrice),
        };
      } else if (pricingType === "national_intensives") {
        patch = {
          block_hours_total: hoursTotal === "" ? null : Number(hoursTotal),
          ni_amount_total: niTotal === "" ? null : Number(niTotal),
          ni_reference: niRef.trim() || null,
          ni_payer: niPayer,
        };
      } else if (pricingType === "custom") {
        patch = {
          custom_rate: rate60 === "" ? null : Number(rate60),
          custom_rate_90: rate90 === "" ? null : Number(rate90),
          custom_rate_120: rate120 === "" ? null : Number(rate120),
        };
      }
      const { error } = await supabase.from("pupils").update(patch).eq("id", pupilId);
      if (error) throw error;
      toast.success("Saved");
      await load();
      onSaved?.();
    } catch (e) {
      console.error("[PricingPaymentSheet] savePricingFields", e);
      toast.error("Couldn't save");
    } finally {
      setSavingPricing(false);
    }
  };

  // ---- payment -----------------------------------------------------------
  const generateLink = async (kind: "qr" | "link") => {
    if (amountNum <= 0) {
      toast.error("Enter an amount first");
      return;
    }
    try {
      const amountPence = Math.round(amountNum * 100);
      const { data, error } = await supabase.functions.invoke("create-ryft-payment", {
        body: {
          amount: amountPence,
          pupil_id: pupilId,
          pupil_name: pupil?.name ?? undefined,
          description: "Payment",
          payment_type: "qr",
          instructor_id: instructorId,
        },
      });
      if (error) throw error;
      const clientSecret =
        (data as { clientSecret?: string; client_secret?: string })?.clientSecret ??
        (data as { client_secret?: string })?.client_secret ??
        null;
      if (!clientSecret) throw new Error("No client secret returned");
      const url = `https://drivingschoolmanager.co.uk/pay?cs=${clientSecret}&amount=${amountPence}&desc=${encodeURIComponent("Payment")}`;
      setQrUrl(url);
      if (kind === "link") {
        try {
          await navigator.clipboard.writeText(url);
          toast.success("Payment link copied");
        } catch {
          toast.success("Payment link ready");
        }
      } else {
        toast.success("QR code ready");
      }
    } catch (e) {
      console.error("[PricingPaymentSheet] generateLink", e);
      toast.error("Couldn't generate payment link");
    }
  };

  const recordPayment = async () => {
    if (amountNum <= 0) return;
    setSaving(true);
    try {
      const nowIso = new Date(`${paymentDate}T12:00:00`).toISOString();

      const { error: hErr } = await supabase.from("lesson_history").insert({
        instructor_id: instructorId,
        pupil_id: pupilId,
        lesson_cost: amountNum,
        payment_status: "paid",
        payment_method: method,
        created_at: nowIso,
      });
      if (hErr) throw hErr;

      if (method === "qr" || method === "link") {
        await generateLink(method === "qr" ? "qr" : "link");
      }

      if (pricingType === "national_intensives" && paidBy === "national_intensives") {
        const { error } = await supabase
          .from("pupils")
          .update({
            ni_amount_paid: Number(pupil?.ni_amount_paid ?? 0) + amountNum,
            ni_payment_date: paymentDate,
          })
          .eq("id", pupilId);
        if (error) console.error("[PricingPaymentSheet] ni update", error);
      }

      toast.success("Payment recorded");
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("dsm-payment-recorded"));
      }
      setAmount("");
      await load();
      onSaved?.();
    } catch (e) {
      console.error("[PricingPaymentSheet] recordPayment", e);
      toast.error("Couldn't record payment");
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  const accepted = instructor?.accepted_payment_methods ?? null;
  const methodAllowed = (m: PayMethod) => {
    if (m === "klarna") return !!instructor?.klarna_enabled;
    if (m === "clearpay") return !!instructor?.clearpay_enabled;
    if (!accepted || accepted.length === 0) return true;
    return accepted.includes(m);
  };

  const methodButtons: { key: PayMethod; label: string; Icon: typeof Banknote }[] = (
    [
      { key: "cash" as const, label: "Cash", Icon: Banknote },
      { key: "bank_transfer" as const, label: "Bank transfer", Icon: Landmark },
      { key: "qr" as const, label: "QR code", Icon: QrCode },
      { key: "link" as const, label: "Payment link", Icon: Link2 },
      { key: "klarna" as const, label: "Klarna", Icon: CreditCard },
      { key: "clearpay" as const, label: "Clearpay", Icon: CreditCard },
    ] as { key: PayMethod; label: string; Icon: typeof Banknote }[]
  ).filter((m) => methodAllowed(m.key));

  const hoursRemaining = Number(pupil?.prepaid_hours ?? 0);
  const blockOutstanding = Number(pupil?.prepaid_amount_paid ?? 0) - amountPaidSoFar;
  const niOutstanding = Number(pupil?.ni_amount_total ?? 0) - Number(pupil?.ni_amount_paid ?? 0);

  return (
    <BottomSheet
      title="Pricing & payments"
      subtitle={pupil?.name ?? undefined}
      onClose={handleClose}
      footer={
        <PrimaryButton onClick={recordPayment} disabled={saving || amountNum <= 0}>
          {saving ? "Saving…" : "Record payment"}
        </PrimaryButton>
      }
    >
      {/* SECTION 1 — pricing type */}
      <div style={cardStyle}>
        <SectionLabel>PRICING TYPE</SectionLabel>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {PRICING_OPTIONS.map(({ key, label, Icon }) => {
            const active = pricingType === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => void selectType(key)}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-start",
                  gap: 8,
                  padding: 12,
                  borderRadius: 12,
                  border: `1px solid ${active ? BLUE : HAIRLINE}`,
                  background: active ? BLUE_BG : "#F8FAFC",
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                <Icon size={18} color={active ? BLUE : "#6B7280"} />
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: active ? BLUE : NAVY,
                  }}
                >
                  {label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* SECTION 2 — type-specific fields */}
      {pricingType === "block" && (
        <div style={cardStyle}>
          <SectionLabel>BLOCK PACKAGE</SectionLabel>
          <Field label="Total hours">
            <input
              inputMode="decimal"
              value={hoursTotal}
              onChange={(e) => setHoursTotal(e.target.value)}
              style={inputStyle}
              placeholder="0"
            />
          </Field>
          <Field label="Package price (£)">
            <input
              inputMode="decimal"
              value={packagePrice}
              onChange={(e) => setPackagePrice(e.target.value)}
              style={inputStyle}
              placeholder="0.00"
            />
          </Field>
          <ReadOnlyRow label="Hours remaining" value={`${hoursRemaining}h`} color={BLUE} />
          <ReadOnlyRow label="Amount paid so far" value={money(amountPaidSoFar)} />
          <ReadOnlyRow
            label="Outstanding"
            value={money(Math.max(0, blockOutstanding))}
            color={blockOutstanding > 0 ? RED : NAVY}
          />
          <PrimaryButton onClick={savePricingFields} disabled={savingPricing}>
            {savingPricing ? "Saving…" : "Save package"}
          </PrimaryButton>
        </div>
      )}

      {pricingType === "national_intensives" && (
        <div style={cardStyle}>
          <SectionLabel>NATIONAL INTENSIVES</SectionLabel>
          <Field label="Total hours">
            <input
              inputMode="decimal"
              value={hoursTotal}
              onChange={(e) => setHoursTotal(e.target.value)}
              style={inputStyle}
              placeholder="0"
            />
          </Field>
          <Field label="Total agreed amount (£)">
            <input
              inputMode="decimal"
              value={niTotal}
              onChange={(e) => setNiTotal(e.target.value)}
              style={inputStyle}
              placeholder="0.00"
            />
          </Field>
          <Field label="NI reference">
            <input
              value={niRef}
              onChange={(e) => setNiRef(e.target.value)}
              style={inputStyle}
              placeholder="Reference"
            />
          </Field>
          <Field label="Who pays">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {(
                [
                  { k: "national_intensives" as const, label: "National Intensives" },
                  { k: "pupil" as const, label: "The pupil" },
                ]
              ).map((o) => {
                const active = niPayer === o.k;
                return (
                  <button
                    key={o.k}
                    type="button"
                    onClick={() => setNiPayer(o.k)}
                    style={{
                      height: 40,
                      borderRadius: 10,
                      border: `1px solid ${active ? BLUE : HAIRLINE}`,
                      background: active ? BLUE_BG : "#F8FAFC",
                      color: active ? BLUE : NAVY,
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    {o.label}
                  </button>
                );
              })}
            </div>
          </Field>
          <ReadOnlyRow label="Hours remaining" value={`${hoursRemaining}h`} color={BLUE} />
          <ReadOnlyRow label="Amount paid" value={money(Number(pupil?.ni_amount_paid ?? 0))} />
          <ReadOnlyRow
            label="Outstanding"
            value={money(Math.max(0, niOutstanding))}
            color={niOutstanding > 0 ? RED : NAVY}
          />
          <PrimaryButton onClick={savePricingFields} disabled={savingPricing}>
            {savingPricing ? "Saving…" : "Save details"}
          </PrimaryButton>
        </div>
      )}

      {pricingType === "standard" && (
        <div style={cardStyle}>
          <SectionLabel>STANDARD RATE</SectionLabel>
          <div style={{ fontSize: 22, fontWeight: 700, color: "#6B7280" }}>
            {money(Number(instructor?.hourly_rate ?? 0))}
            <span style={{ fontSize: 13, fontWeight: 500 }}> / hour</span>
          </div>
          <div style={{ fontSize: 12, color: "#8A93A3", marginTop: 6 }}>
            Rate set in your settings
          </div>
        </div>
      )}

      {pricingType === "custom" && (
        <div style={cardStyle}>
          <SectionLabel>CUSTOM RATES</SectionLabel>
          <Field label="60 min rate (£)">
            <input
              inputMode="decimal"
              value={rate60}
              onChange={(e) => setRate60(e.target.value)}
              style={inputStyle}
              placeholder="0.00"
            />
          </Field>
          <Field label="90 min rate (£)">
            <input
              inputMode="decimal"
              value={rate90}
              onChange={(e) => setRate90(e.target.value)}
              style={inputStyle}
              placeholder="0.00"
            />
          </Field>
          <Field label="120 min rate (£)">
            <input
              inputMode="decimal"
              value={rate120}
              onChange={(e) => setRate120(e.target.value)}
              style={inputStyle}
              placeholder="0.00"
            />
          </Field>
          <PrimaryButton onClick={savePricingFields} disabled={savingPricing}>
            {savingPricing ? "Saving…" : "Save rates"}
          </PrimaryButton>
        </div>
      )}

      {/* SECTION 3 — record payment */}
      <div style={cardStyle}>
        <SectionLabel>RECORD PAYMENT</SectionLabel>
        <Field label="Amount (£)">
          <input
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            style={inputStyle}
            placeholder="0.00"
          />
        </Field>
        <Field label="Payment date">
          <input
            type="date"
            value={paymentDate}
            onChange={(e) => setPaymentDate(e.target.value)}
            style={inputStyle}
          />
        </Field>
        <Field label="Payment method">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
            {methodButtons.map(({ key, label, Icon }) => {
              const active = method === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setMethod(key)}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 4,
                    padding: "10px 4px",
                    borderRadius: 10,
                    border: `1px solid ${active ? BLUE : HAIRLINE}`,
                    background: active ? BLUE_BG : "#F8FAFC",
                    color: active ? BLUE : NAVY,
                    fontSize: 11,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  <Icon size={16} color={active ? BLUE : "#6B7280"} />
                  {label}
                </button>
              );
            })}
          </div>
        </Field>

        {pricingType === "national_intensives" && (
          <Field label="Paid by">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {(
                [
                  { k: "national_intensives" as const, label: "NI" },
                  { k: "pupil" as const, label: "Pupil" },
                ]
              ).map((o) => {
                const active = paidBy === o.k;
                return (
                  <button
                    key={o.k}
                    type="button"
                    onClick={() => setPaidBy(o.k)}
                    style={{
                      height: 40,
                      borderRadius: 10,
                      border: `1px solid ${active ? BLUE : HAIRLINE}`,
                      background: active ? BLUE_BG : "#F8FAFC",
                      color: active ? BLUE : NAVY,
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    {o.label}
                  </button>
                );
              })}
            </div>
          </Field>
        )}

        {(method === "qr" || method === "link") && (
          <div style={{ marginTop: 4 }}>
            <button
              type="button"
              onClick={() => void generateLink(method === "qr" ? "qr" : "link")}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                background: "transparent",
                border: "none",
                padding: "4px 0",
                color: BLUE,
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {method === "qr" ? <QrCode size={14} /> : <Copy size={14} />}
              {method === "qr" ? "Generate QR code" : "Create & copy payment link"}
            </button>
            {qrUrl && method === "qr" && (
              <div style={{ display: "flex", justifyContent: "center", padding: 12 }}>
                <QRCodeSVG value={qrUrl} size={160} />
              </div>
            )}
            {qrUrl && method === "link" && (
              <div style={{ fontSize: 12, color: "#6B7280", wordBreak: "break-all" }}>{qrUrl}</div>
            )}
          </div>
        )}
      </div>

      {/* SECTION 4 — payment history */}
      <div style={cardStyle}>
        <div
          style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}
        >
          <SectionLabel>PAYMENT HISTORY</SectionLabel>
          <button
            type="button"
            onClick={() => {
              handleClose();
              navigate({ to: "/pupils/payments/$id", params: { id: pupilId } });
            }}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 2,
              background: "transparent",
              border: "none",
              color: BLUE,
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            View all
            <ChevronRight size={13} />
          </button>
        </div>
        {history.length === 0 && (
          <div style={{ fontSize: 13, color: "#8A93A3", padding: "6px 0" }}>No payments yet</div>
        )}
        {history.slice(0, 10).map((h, idx) => {
          const meta = METHOD_META[h.payment_method ?? ""] ?? METHOD_META["cash"]!;
          const Icon = meta.Icon;
          return (
            <div
              key={`${h.date}-${idx}`}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "10px 0",
                borderTop: idx === 0 ? "none" : `1px solid ${HAIRLINE}`,
              }}
            >
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  background: "#F4F6FA",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <Icon size={15} color="#6B7280" />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: NAVY }}>{meta.label}</div>
                <div style={{ fontSize: 12, color: "#8A93A3" }}>{fmtDate(h.date)}</div>
              </div>
              <div style={{ fontSize: 14, fontWeight: 700, color: GREEN }}>
                +{money(h.amount)}
              </div>
            </div>
          );
        })}
      </div>
    </BottomSheet>
  );
}

export default PricingPaymentSheet;
