import * as React from "react";

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
): { label: string; bg: string; color: string } | null {
  if (isLive) {
    return { label: "Live", bg: "#E6F1FB", color: "#1877D6" };
  }

  const s = (status ?? "").toLowerCase();
  const due = Number(amountDue ?? 0);
  const paid = Number(paidAmount ?? 0);
  const prepaid = Number(prepaidHours ?? 0) > 0;

  // Paid / prepaid / nothing outstanding
  if (s === "paid" || s === "prepaid" || prepaid || due <= 0) {
    const label = s === "prepaid" || prepaid ? "Prepaid" : "Paid";
    return { label, bg: "#E8F8ED", color: "#1A7A3C" };
  }

  // Partial payment
  if (s === "partial" || (paid > 0 && paid < due)) {
    const remaining = Math.max(0, due - paid);
    const label = remaining > 0 ? `Part paid · £${remaining.toFixed(0)}` : "Part paid";
    return { label, bg: "#FEF3C7", color: "#D97706" };
  }

  // Unpaid / due
  if (due > 0) {
    return { label: `£${due.toFixed(0)} due`, bg: "#FFECEC", color: "#D33B3B" };
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

  const sizeStyle: React.CSSProperties =
    size === "sm"
      ? { fontSize: 10, padding: "2px 7px", borderRadius: 20 }
      : { fontSize: 11, padding: "3px 8px", borderRadius: 20 };

  const style: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    fontWeight: 700,
    lineHeight: 1.4,
    fontFamily: "Poppins, sans-serif",
    backgroundColor: badge.bg,
    color: badge.color,
    border: "none",
    cursor: onClick ? "pointer" : "default",
    flexShrink: 0,
    whiteSpace: "nowrap",
    ...sizeStyle,
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
