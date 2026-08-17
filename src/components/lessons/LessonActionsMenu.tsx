import React, { useEffect, useRef } from "react";

export interface LessonActionsMenuItem {
  label: string;
  onClick: () => void;
}

export interface LessonActionsMenuProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: LessonActionsMenuItem[];
  children: React.ReactNode;
  top?: number;
  right?: number;
  zIndex?: number;
  "data-testid"?: string;
}

const BASE_ITEM_STYLE: React.CSSProperties = {
  display: "block",
  width: "100%",
  textAlign: "left",
  padding: "10px 14px",
  fontSize: 13,
  fontFamily: "Poppins, sans-serif",
  background: "transparent",
  border: "none",
  cursor: "pointer",
  color: "#0B1F3A",
};

export function LessonActionsMenu({
  open,
  onOpenChange,
  items,
  children,
  top = 40,
  right = 12,
  zIndex = 60,
  "data-testid": dataTestId,
}: LessonActionsMenuProps) {
  const popoverRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handle = (ev: MouseEvent) => {
      const target = ev.target as Node;
      if (popoverRef.current?.contains(target)) return;
      if (triggerRef.current?.contains(target)) return;
      onOpenChange(false);
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [open, onOpenChange]);

  return (
    <div
      ref={triggerRef}
      style={{
        position: "relative",
        display: "flex",
        alignItems: "center",
        flexShrink: 0,
      }}
    >
      {children}
      {open && (
        <div
          ref={popoverRef}
          onClick={(ev) => ev.stopPropagation()}
          data-testid={dataTestId}
          style={{
            position: "absolute",
            top,
            right,
            minWidth: 140,
            background: "#FFFFFF",
            border: "1px solid #E5E7EB",
            borderRadius: 10,
            boxShadow: "0 4px 16px rgba(0,0,0,0.1)",
            zIndex,
            overflow: "hidden",
            fontFamily: "Poppins, sans-serif",
          }}
        >
          {items.map((item, idx) => (
            <button
              key={idx}
              type="button"
              style={BASE_ITEM_STYLE}
              onClick={(ev) => {
                ev.stopPropagation();
                onOpenChange(false);
                item.onClick();
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default LessonActionsMenu;
