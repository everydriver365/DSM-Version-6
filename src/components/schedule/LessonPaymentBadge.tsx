import { tokens } from "@/lib/tokens";
import * as React from "react";
import { pillStyle, PILL_COLORS, type PillVariant } from "@/components/dsm/DSMPill";
import { paymentStatusVariant } from "@/lib/statusVariants";

export type LessonPaymentBadgeProps = {
  status: string | null | undefined;
  amountDue?: number | null | undefined;
  paidAmount?: number | null | undefined;
  prepaidHours?: number | null | undefined;
  isLive?: boolean;
  /** Clicking the badge opens the payment sheet instead of the parent card. */
  onClick?: (e: React.MouseEvent) => void;
  /** Visual size. */
  size?: "sm" | "md";
};

export function getLessonPaymentBadge(
  status: string | null | undefined,
  amountDue?: number | null | undefined,
  paidAmount?: number | null | undefined,
  prepaidHours?: number | null | undefined,
  isLive?: boolean,
): { label: string; variant: PillVariant; bg: string; color: string } | null {
  if (isLive) {
    return { label: "Live", variant: "info", ...PILL_COLORS.info };
  }

  const s = (status ?? "").toLowerCase();
  const due = Number(amountDue ?? 0);
  const paid = Number(paidAmount ?? 0);
  const prepaid = Number(prepaidHours ?? 0) > 0;

  // Paid / prepaid / nothing outstanding / fully paid by amount
  if (s === "paid" || s === "prepaid" || prepaid || due <= 0 || paid >= due) {
    const label = s === "prepaid" || prepaid ? "Prepaid" : "Paid";
    const variant = paymentStatusVariant(s === "prepaid" || prepaid ? "prepaid" : "paid");
    return { label, variant, ...PILL_COLORS[variant] };
  }


  // Partial payment
  if (s === "partial" || (paid > 0 && paid < due)) {
    const remaining = Math.max(0, due - paid);
    const label = remaining > 0 ? `Part paid · £${remaining.toFixed(0)}` : "Part paid";
    const variant = paymentStatusVariant("partial");
    return { label, variant, ...PILL_COLORS[variant] };
  }

  // Unpaid / due
  if (due > 0) {
    const variant = paymentStatusVariant("unpaid");
    return { label: `£${due.toFixed(0)} due`, variant, ...PILL_COLORS[variant] };
  }

  return null;
}

export function LessonPaymentBadge({
  status,
  amountDue,
  paidAmount,
  prepaidHours,
  isLive,
  onClick,
  size = "sm",
}: LessonPaymentBadgeProps) {
  const badge = getLessonPaymentBadge(status, amountDue, paidAmount, prepaidHours, isLive);
  if (!badge) return null;

  const style: React.CSSProperties = {
    ...pillStyle(badge.variant, size),
    cursor: onClick ? "pointer" : "default",
  };

  if (onClick) {
    return (
      <button type="button" onClick={onClick} style={style}>
        {badge.label}
      </button>
    );
  }
  return <span style={style}>{badge.label}</span>;
}
