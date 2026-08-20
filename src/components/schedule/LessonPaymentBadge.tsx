import * as React from "react";
import { pillStyle, type PillVariant } from "@/components/dsm/DSMPill";

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
    return { label: "Live", variant: "info", bg: "#E6F1FB", color: "#1877D6" };
  }

  const s = (status ?? "").toLowerCase();
  const due = Number(amountDue ?? 0);
  const paid = Number(paidAmount ?? 0);
  const prepaid = Number(prepaidHours ?? 0) > 0;

  // Paid / prepaid / nothing outstanding / fully paid by amount
  if (s === "paid" || s === "prepaid" || prepaid || due <= 0 || paid >= due) {
    const label = s === "prepaid" || prepaid ? "Prepaid" : "Paid";
    return { label, variant: "success", bg: "#DCFCE7", color: "#15803D" };
  }


  // Partial payment
  if (s === "partial" || (paid > 0 && paid < due)) {
    const remaining = Math.max(0, due - paid);
    const label = remaining > 0 ? `Part paid · £${remaining.toFixed(0)}` : "Part paid";
    return { label, variant: "warning", bg: "#FEF3C7", color: "#B45309" };
  }

  // Unpaid / due
  if (due > 0) {
    return { label: `£${due.toFixed(0)} due`, variant: "danger", bg: "#FEE2E2", color: "#B91C1C" };
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
