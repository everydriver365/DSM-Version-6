import type { ButtonHTMLAttributes, CSSProperties } from "react";

type Variant = "primary" | "destructive" | "ghost";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  inline?: boolean;
}

export function Button({
  variant = "primary",
  inline = false,
  className = "",
  style,
  children,
  ...rest
}: Props) {
  const base =
    "h-11 rounded-[10px] font-semibold text-[14px] transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center px-5";
  const width = inline ? "" : "w-full";

  let variantClasses = "";
  let extraStyle: CSSProperties = {};

  if (variant === "primary") {
    variantClasses = "bg-[#1877D6] text-white hover:bg-[#0F5FB0]";
  } else if (variant === "destructive") {
    variantClasses = "bg-[#DC2626] text-white hover:bg-[#B91C1C]";
  } else {
    variantClasses = "bg-white text-[#0B1F3A] hover:bg-[#F3F8FF]";
    extraStyle = { borderWidth: "1px", borderStyle: "solid", borderColor: "#EEF2F7" };
  }

  return (
    <button
      {...rest}
      className={`${base} ${width} ${variantClasses} ${className}`}
      style={{ fontFamily: "Inter, sans-serif", ...extraStyle, ...style }}
    >
      {children}
    </button>
  );
}

export default Button;
