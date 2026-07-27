import { useEffect } from "react";
import { BottomSheet, PrimaryButton, GhostButton } from "@/components/dsm/BottomSheetV2";
import {
  IconCreditCard,
  IconClock,
  IconCalendar,
  IconUser,
  IconCoins,
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
}: PaymentDetailsSheetProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const label = statusLabel(paymentStatus, prepaidHours);
  const colors = statusColors(paymentStatus, prepaidHours);
  const amountText = amountDue > 0 ? formatMoney(amountDue) : "£0.00";
  const durationText = duration ? `${duration} min lesson` : "Lesson";

  return (
    <BottomSheet
      title="Payment details"
      subtitle={`${durationText}`}
      onClose={onClose}
      footer={
        <>
          <PrimaryButton onClick={onClose} color={BLUE}>
            Close
          </PrimaryButton>
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
        {prepaidHours !== undefined && prepaidHours > 0 && (
          <DetailRow
            icon={<IconCoins size={18} color={GREEN} stroke={2} />}
            label="Prepaid hours"
            value={`${prepaidHours} remaining`}
          />
        )}
        {amountDue > 0 && !prepaidHours && (
          <DetailRow
            icon={<IconCreditCard size={18} color={RED} stroke={2} />}
            label="Amount due"
            value={amountText}
            highlight
          />
        )}
      </div>
    </BottomSheet>
  );
}
