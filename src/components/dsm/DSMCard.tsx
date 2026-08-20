import type { HTMLAttributes } from "react";
import { tokens } from "@/lib/tokens";

interface DSMCardProps extends HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  style?: React.CSSProperties;
  onClick?: () => void;
  padding?: number;
}

export default function DSMCard({
  children,
  style,
  onClick,
  padding = tokens.cardPadding,
  ...rest
}: DSMCardProps) {
  return (
    <div
      {...rest}
      onClick={onClick}
      style={{
        background: tokens.cardBg,
        borderRadius: tokens.radiusCard,
        boxShadow: tokens.shadowCard,
        padding,
        cursor: onClick ? "pointer" : undefined,
        ...style,
      }}
    >
      {children}
    </div>
  );
}
