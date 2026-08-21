import React from "react";

/**
 * DSM standard save/confirm button + sticky footer.
 * Use for every form, bottom sheet and edit page.
 */
export const SAVE_BUTTON_STYLE: React.CSSProperties = {
  width: "100%",
  height: 52,
  background: "#1877D6",
  color: "#fff",
  borderRadius: 20,
  fontSize: 15,
  fontWeight: 700,
  border: "none",
  cursor: "pointer",
  fontFamily: "Poppins, sans-serif",
  boxShadow: "0 3px 0 #0F52A8",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
};

export const SAVE_FOOTER_STYLE: React.CSSProperties = {
  position: "sticky",
  bottom: 0,
  background: "#EEF2F7",
  padding: "12px 16px",
  paddingBottom: "calc(12px + env(safe-area-inset-bottom, 0px))",
  borderTop: "1px solid #E4E8EF",
  zIndex: 20,
};

export function SaveButton({
  children,
  disabled,
  onClick,
  type = "button",
  style,
}: {
  children: React.ReactNode;
  disabled?: boolean;
  onClick?: () => void;
  type?: "button" | "submit";
  style?: React.CSSProperties;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className="active:opacity-90"
      style={{ ...SAVE_BUTTON_STYLE, opacity: disabled ? 0.5 : 1, ...style }}
    >
      {children}
    </button>
  );
}

export function SaveFooter({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <div style={{ ...SAVE_FOOTER_STYLE, ...style }}>{children}</div>;
}

export default SaveFooter;
