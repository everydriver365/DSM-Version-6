import type { CSSProperties, ReactNode } from "react";
import { Check, AlertCircle } from "lucide-react";
import type { SaveState } from "@/hooks/useSaveState";

interface Props {
  state: SaveState;
  onClick: () => void;
  label: ReactNode;
  successLabel?: string;
  errorLabel?: string;
  disabled?: boolean;
  style?: CSSProperties;
  className?: string;
  type?: "button" | "submit";
  idleBg?: string;
  idleColor?: string;
}

const FONT = { fontFamily: "Inter, sans-serif" } as const;

export function SaveButton({
  state,
  onClick,
  label,
  successLabel = "Saved",
  errorLabel = "Try again",
  disabled,
  style,
  className,
  type = "button",
  idleBg = "#0F2044",
  idleColor = "#fff",
}: Props) {
  let bg = idleBg;
  let color = idleColor;
  let content: ReactNode = label;

  if (state === "success") {
    bg = "#EAF3DE";
    color = "#3B6D11";
    content = (
      <>
        <Check size={16} color={color} strokeWidth={2.5} />
        <span>{successLabel}</span>
      </>
    );
  } else if (state === "error") {
    bg = "#FCEBEB";
    color = "#A32D2D";
    content = (
      <>
        <AlertCircle size={16} color={color} strokeWidth={2.5} />
        <span>{errorLabel}</span>
      </>
    );
  }

  const isBusy = state === "saving";

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || isBusy}
      aria-live="polite"
      className={className}
      style={{
        background: bg,
        color,
        width: "100%",
        borderRadius: 12,
        padding: "13px 0",
        border: "none",
        fontSize: 14,
        fontWeight: 500,
        marginTop: 14,
        opacity: disabled ? 0.6 : 1,
        cursor: disabled || isBusy ? "default" : "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        transition: "background-color 150ms, color 150ms",
        ...FONT,
        ...style,
      }}
    >
      {content}
    </button>
  );
}

export default SaveButton;
