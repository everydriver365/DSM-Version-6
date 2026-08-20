import * as React from "react";

/**
 * Canonical status pill for DSM. Every paid / unpaid / warning / info /
 * neutral state in the app should render through this component (or the
 * exported `pillStyle` helper) so colours, sizing and radius stay identical.
 */
export type PillVariant =
  | "success"
  | "danger"
  | "warning"
  | "info"
  | "neutral"
  | "purple";

export const PILL_COLORS: Record<PillVariant, { bg: string; color: string }> = {
  success: { bg: "#DCFCE7", color: "#15803D" },
  danger: { bg: "#FEE2E2", color: "#B91C1C" },
  warning: { bg: "#FEF3C7", color: "#B45309" },
  info: { bg: "#E6F1FB", color: "#1877D6" },
  neutral: { bg: "#F1F5F9", color: "#6B7686" },
  purple: { bg: "#EDE9FE", color: "#7C3AED" },
};

export function pillStyle(
  variant: PillVariant,
  size: "sm" | "md" = "sm",
): React.CSSProperties {
  const c = PILL_COLORS[variant];
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
    fontFamily: "Poppins, sans-serif",
    fontSize: size === "sm" ? 11 : 12,
    fontWeight: 700,
    lineHeight: 1.2,
    letterSpacing: 0.2,
    padding: size === "sm" ? "4px 10px" : "6px 12px",
    borderRadius: 999,
    border: "none",
    whiteSpace: "nowrap",
    flexShrink: 0,
    backgroundColor: c.bg,
    color: c.color,
  };
}

export interface DSMPillProps {
  variant?: PillVariant;
  size?: "sm" | "md";
  children: React.ReactNode;
  onClick?: (e: React.MouseEvent) => void;
  style?: React.CSSProperties;
}

export function DSMPill({
  variant = "neutral",
  size = "sm",
  children,
  onClick,
  style,
}: DSMPillProps) {
  const merged = { ...pillStyle(variant, size), ...style };
  if (onClick) {
    return (
      <button type="button" onClick={onClick} style={{ ...merged, cursor: "pointer" }}>
        {children}
      </button>
    );
  }
  return <span style={merged}>{children}</span>;
}

export default DSMPill;
