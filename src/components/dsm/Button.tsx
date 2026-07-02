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
    "h-11 rounded-lg font-medium text-[14px] transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center px-4";
  const width = inline ? "" : "w-full";

  let variantClasses = "";
  let extraStyle: CSSProperties = {};

  if (variant === "primary") {
    variantClasses = "bg-[#00A3B4] text-white hover:bg-[#163d7a]";
  } else if (variant === "destructive") {
    variantClasses = "bg-[#CC2229] text-white hover:bg-[#a81b21]";
  } else {
    variantClasses = "bg-transparent text-[#00A3B4] hover:bg-[#f0f4ff]";
    extraStyle = { borderWidth: "0.5px", borderStyle: "solid", borderColor: "#00A3B4" };
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
