import { tokens } from "@/lib/tokens";

interface DSMSectionHeaderProps {
  title: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export default function DSMSectionHeader({
  title,
  action,
}: DSMSectionHeaderProps) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 12,
        paddingLeft: tokens.pagePadding,
        paddingRight: tokens.pagePadding,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          fontFamily: tokens.fontFamily,
          fontSize: tokens.fontSize.sm,
          fontWeight: tokens.fontWeight.semibold,
          color: tokens.blue,
          textTransform: "uppercase",
          letterSpacing: "0.12em",
        }}
      >
        <span
          aria-hidden
          style={{
            display: "inline-block",
            width: 3,
            height: 12,
            borderRadius: 8,
            backgroundColor: tokens.blue,
          }}
        />
        {title}
      </div>
      {action && (
        <button
          type="button"
          onClick={action.onClick}
          style={{
            fontFamily: tokens.fontFamily,
            fontSize: tokens.fontSize.md,
            fontWeight: tokens.fontWeight.semibold,
            color: tokens.blue,
            background: "transparent",
            border: "none",
            padding: 0,
            cursor: "pointer",
          }}
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
