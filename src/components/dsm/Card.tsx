import type { HTMLAttributes } from "react";
import { tokens } from "@/lib/tokens";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  interactive?: boolean;
}

export function Card({ className = "", style, children, interactive, onClick, ...rest }: CardProps) {
  const tap = interactive || !!onClick ? "cf-tap cursor-pointer" : "";
  return (
    <div
      {...rest}
      onClick={onClick}
      className={`bg-white rounded-lg p-5 ${tap} ${className}`}
      style={{
        borderWidth: "1px",
        borderStyle: "solid",
        borderColor: tokens.canvas,
        boxShadow: "0 1px 2px rgba(11,31,58,0.04)",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export default Card;
