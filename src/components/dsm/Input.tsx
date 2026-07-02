import { forwardRef, useId, type InputHTMLAttributes } from "react";

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export const Input = forwardRef<HTMLInputElement, Props>(function Input(
  { label, id, className = "", style, ...rest },
  ref,
) {
  const autoId = useId();
  const inputId = id ?? autoId;
  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={inputId}
          className="block mb-1 text-[12px] font-medium text-[#6B7280]"
          style={{ fontFamily: "Inter, sans-serif" }}
        >
          {label}
        </label>
      )}
      <input
        ref={ref}
        id={inputId}
        {...rest}
        className={`h-11 w-full rounded-lg px-3 text-[14px] text-[#1A1A2E] bg-white focus:border-[#1877D6] focus:outline-none ${className}`}
        style={{
          fontFamily: "Inter, sans-serif",
          borderWidth: "0.5px",
          borderStyle: "solid",
          borderColor: "#EEF2F7",
          ...style,
        }}
      />
    </div>
  );
});

export default Input;
