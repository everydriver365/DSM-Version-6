import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabaseClient";
import { BottomSheet, PrimaryButton, GhostButton } from "@/components/dsm/BottomSheetV2";
import {
  IconCreditCard,
  IconClock,
  IconCalendar,
  IconUser,
  IconCoins,
  IconCashBanknote,
  IconLink,
  IconBell,
} from "@tabler/icons-react";

interface PaymentDetailsSheetProps {
  open: boolean;
  onClose: () => void;
  pupilName: string;
  lessonDate: string;
  lessonTime: string;
  paymentStatus: string;
  amountDue: number;
  prepaidHours?: number;
  duration?: number;
  pupilId?: string | null;
  pupilPhone?: string | null;
  lessonId?: string | null;
}

const NAVY = "#0B1F3A";
const BLUE = "#1877D6";
const GREEN = "#1E8E3E";
const RED = "#CC2229";
const MUTED = "#8A93A3";
const HAIRLINE = "#E2E8F0";

function formatMoney(n: number) {
  return `£${n.toFixed(2)}`;
}

function formatDay(d?: string | null) {
  if (!d) return "";
  const dt = new Date(d.length <= 10 ? `${d}T00:00:00` : d);
  if (Number.isNaN(dt.getTime())) return d;
  return dt.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function methodLabel(m?: string | null) {
  if (!m) return "";
  const map: Record<string, string> = {
    cash: "Cash",
    card: "Card",
    card_qr: "Card (QR)",
    bank_transfer: "Bank transfer",
    bank: "Bank transfer",
  };
  return map[m] ?? m.replace(/_/g, " ");
}

function statusLabel(status: string, prepaidHours?: number) {
  const s = status.toLowerCase();
  if (s === "prepaid" || prepaidHours) return "Prepaid";
  if (s === "paid") return "Paid";
  return "Due";
}

function statusColors(status: string, prepaidHours?: number) {
  const s = status.toLowerCase();
  if (s === "live" || s === "prepaid" || prepaidHours) {
    return { bg: "#E7F5EE", fg: GREEN };
  }
  if (s === "paid") {
    return { bg: "#E7F5EE", fg: GREEN };
  }
  return { bg: "#FCEBEB", fg: RED };
}

function DetailRow({
  icon,
  label,
  value,
  highlight,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "12px 0",
        borderBottom: `1px solid ${HAIRLINE}`,
      }}
    >
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          background: "#F8FAFC",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 11, color: MUTED, fontWeight: 500 }}>{label}</div>
        <div
          style={{
            fontSize: 14,
            fontWeight: 600,
            color: highlight ? RED : NAVY,
            marginTop: 1,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {value}
        </div>
      </div>
    </div>
  );
}

export function PaymentDetailsSheet({
  open,
  onClose,
  pupilName,
  lessonDate,
  lessonTime,
  paymentStatus,
  amountDue,
  prepaidHours,
  duration,
  pupilId,
  pupilPhone,
  lessonId,
}: PaymentDetailsSheetProps) {
  const [payments, setPayments] = useState<
    { id: string; amount: number; date: string | null; method: string | null }[]
  >([]);
  const lastPayment = payments[0] ?? null;
  const [hoursLeft, setHoursLeft] = useState<number | null>(null);
  const [phone, setPhone] = useState<string | null>(pupilPhone ?? null);
  const [sendingLink, setSendingLink] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open || !pupilId) return;
    let cancelled = false;

    (async () => {
      const [{ data: pay }, { data: pupil }] = await Promise.all([
        supabase
          .from("payments")
          .select("id, amount, payment_date, paid_at, created_at, payment_method")
          .eq("pupil_id", pupilId)
          .is("deleted_at", null)
          .order("created_at", { ascending: false })
          .limit(5),
        supabase
          .from("pupils")
          .select("prepaid_hours, phone")
          .eq("id", pupilId)
          .maybeSingle(),
      ]);

      if (cancelled) return;

      const rows = (pay ?? []) as {
        id?: string;
        amount?: number | null;
        payment_date?: string | null;
        paid_at?: string | null;
        created_at?: string | null;
        payment_method?: string | null;
      }[];
      setPayments(
        rows.map((p, i) => ({
          id: p.id ?? String(i),
          amount: Number(p.amount ?? 0),
          date: p.payment_date ?? p.paid_at ?? p.created_at ?? null,
          method: p.payment_method ?? null,
        })),
      );

      const pu = pupil as { prepaid_hours?: number | null; phone?: string | null } | null;
      if (pu) {
        setHoursLeft(Number(pu.prepaid_hours ?? 0));
        if (!pupilPhone) setPhone(pu.phone ?? null);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, pupilId, pupilPhone]);

  if (!open) return null;

  const label = statusLabel(paymentStatus, prepaidHours);
  const colors = statusColors(paymentStatus, prepaidHours);
  const amountText = amountDue > 0 ? formatMoney(amountDue) : "£0.00";
  const durationText = duration ? `${duration} min lesson` : "Lesson";
  const effectiveHours = hoursLeft ?? prepaidHours ?? 0;
  const firstName = pupilName.split(" ")[0] || pupilName;

  const sendReminder = () => {
    if (!phone) {
      toast.error("No phone number for this pupil");
      return;
    }
    const body = encodeURIComponent(
      amountDue > 0
        ? `Hi ${firstName}, just a friendly reminder your lesson balance of £${amountDue.toFixed(2)} is outstanding. Thanks!`
        : `Hi ${firstName}, just a quick reminder about your upcoming lesson. Thanks!`,
    );
    window.location.href = `sms:${phone}?&body=${body}`;
  };

  const sendPaymentLink = async () => {
    if (!phone) {
      toast.error("No phone number for this pupil");
      return;
    }
    setSendingLink(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-ryft-payment", {
        body: {
          amount: amountDue > 0 ? amountDue : 0,
          pupil_id: pupilId,
          pupil_name: pupilName,
          lesson_id: lessonId,
          description: `Lesson payment · ${pupilName}`,
          commission: 1,
        },
      });
      if (error) throw error;
      const url =
        (data as { paymentUrl?: string; url?: string })?.paymentUrl ??
        (data as { url?: string })?.url ??
        null;
      if (!url) throw new Error("No payment URL returned");
      const body = encodeURIComponent(
        `Hi ${firstName}, here's your secure payment link for £${amountDue.toFixed(2)}: ${url}`,
      );
      window.location.href = `sms:${phone}?&body=${body}`;
    } catch (e) {
      console.error("[payment-sheet] payment link failed", e);
      toast.error("Couldn't generate payment link");
    } finally {
      setSendingLink(false);
    }
  };

  return (
    <BottomSheet
      title="Payment details"
      subtitle={`${durationText}`}
      onClose={onClose}
      footer={
        <>
          <PrimaryButton onClick={sendPaymentLink} color={BLUE} disabled={sendingLink}>
            {sendingLink ? "Creating link…" : "Send payment link"}
          </PrimaryButton>
          <GhostButton onClick={sendReminder}>Send reminder</GhostButton>
        </>
      }
    >
      <div style={{ fontFamily: "Poppins, sans-serif" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginBottom: 12,
            padding: "14px 16px",
            background: "#FFFFFF",
            borderRadius: 14,
            boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
          }}
        >
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: colors.bg,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <IconCreditCard size={22} color={colors.fg} stroke={2} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, color: MUTED, fontWeight: 500 }}>
              Current status
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginTop: 2,
              }}
            >
              <span
                style={{
                  fontSize: 16,
                  fontWeight: 700,
                  color: colors.fg,
                }}
              >
                {label}
              </span>
              <span
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: amountDue > 0 && !prepaidHours ? RED : NAVY,
                }}
              >
                {prepaidHours ? `${prepaidHours} hrs prepaid` : amountText}
              </span>
            </div>
          </div>
        </div>

        <DetailRow
          icon={<IconUser size={18} color={BLUE} stroke={2} />}
          label="Pupil"
          value={pupilName}
        />
        <DetailRow
          icon={<IconCalendar size={18} color={BLUE} stroke={2} />}
          label="Date"
          value={lessonDate}
        />
        <DetailRow
          icon={<IconClock size={18} color={BLUE} stroke={2} />}
          label="Time"
          value={lessonTime}
        />
        <DetailRow
          icon={<IconCreditCard size={18} color={amountDue > 0 ? RED : GREEN} stroke={2} />}
          label="Amount due"
          value={amountText}
          highlight={amountDue > 0}
        />
        <DetailRow
          icon={<IconCashBanknote size={18} color={GREEN} stroke={2} />}
          label="Last payment"
          value={
            lastPayment
              ? `${formatMoney(lastPayment.amount)}${lastPayment.date ? ` · ${formatDay(lastPayment.date)}` : ""}${
                  lastPayment.method ? ` · ${methodLabel(lastPayment.method)}` : ""
                }`
              : "No payments recorded"
          }
        />
        <DetailRow
          icon={<IconCoins size={18} color={effectiveHours > 0 ? GREEN : MUTED} stroke={2} />}
          label="Hours prepaid / remaining"
          value={`${effectiveHours.toFixed(1)} hrs remaining`}
        />
        {!phone && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginTop: 12,
              fontSize: 12,
              color: MUTED,
            }}
          >
            <IconBell size={14} color={MUTED} stroke={2} />
            No phone number on file — reminders and links can't be sent.
          </div>
        )}
        {phone && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginTop: 12,
              fontSize: 12,
              color: MUTED,
            }}
          >
            <IconLink size={14} color={MUTED} stroke={2} />
            Sends via SMS to {phone}
          </div>
        )}
      </div>
    </BottomSheet>
  );
}
