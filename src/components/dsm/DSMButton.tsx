import { tokens } from "@/lib/tokens";

interface DSMButtonProps {
  label: string;
  onClick: () => void;
  variant?: "primary" | "secondary" | "danger" | "ghost";
  icon?: React.ReactNode;
  disabled?: boolean;
  fullWidth?: boolean;
  size?: "sm" | "md" | "lg";
}

export default function DSMButton({
  label,
  onClick,
  variant = "primary",
  icon,
  disabled,
  fullWidth,
  size = "md",
}: DSMButtonProps) {
  const heights = { sm: 36, md: 44, lg: 52 };
  const fontSizes = { sm: 12, md: 14, lg: 15 };

  const styles: Record<
    string,
    React.CSSProperties
  > = {
    primary: {
      background: tokens.blue,
      color: tokens.white,
      boxShadow: "0 3px 0 #0F52A8",
    },
    secondary: {
      background: tokens.white,
      color: tokens.textPrimary,
      border: `1px solid ${tokens.border}`,
      boxShadow: tokens.shadowCard,
    },
    danger: {
      background: tokens.red,
      color: tokens.white,
      boxShadow: "0 3px 0 #B91C1C",
    },
    ghost: {
      background: "transparent",
      color: tokens.blue,
      border: "none",
    },
  };

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        height: heights[size],
        width: fullWidth ? "100%" : undefined,
        padding: size === "sm" ? "0 14px" : "0 20px",
        borderRadius: tokens.radiusButton,
        fontFamily: tokens.fontFamily,
        fontSize: fontSizes[size],
        fontWeight: tokens.fontWeight.semibold,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
        transition: "transform 0.12s ease",
        ...styles[variant],
      }}
      onMouseDown={(e) =>
        (e.currentTarget.style.transform = "scale(0.97)")
      }
      onMouseUp={(e) =>
        (e.currentTarget.style.transform = "scale(1)")
      }
      onMouseLeave={(e) =>
        (e.currentTarget.style.transform = "scale(1)")
      }
      onTouchStart={(e) =>
        (e.currentTarget.style.transform = "scale(0.97)")
      }
      onTouchEnd={(e) =>
        (e.currentTarget.style.transform = "scale(1)")
      }
    >
      {icon}
      {label}
    </button>
  );
}
