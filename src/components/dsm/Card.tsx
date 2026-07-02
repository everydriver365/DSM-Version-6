import type { HTMLAttributes } from "react";

export function Card({ className = "", style, children, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      {...rest}
      className={`bg-[#F8F9FB] rounded-xl p-4 ${className}`}
      style={{
        borderWidth: "0.5px",
        borderStyle: "solid",
        borderColor: "#EEF2F7",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export default Card;
