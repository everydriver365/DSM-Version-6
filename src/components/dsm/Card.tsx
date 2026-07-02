import type { HTMLAttributes } from "react";

export function Card({ className = "", style, children, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      {...rest}
      className={`bg-white rounded-2xl p-5 ${className}`}
      style={{
        borderWidth: "1px",
        borderStyle: "solid",
        borderColor: "#EEF2F7",
        boxShadow: "0 1px 2px rgba(11,31,58,0.04)",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export default Card;
