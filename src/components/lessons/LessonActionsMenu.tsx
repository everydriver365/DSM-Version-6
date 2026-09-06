import { tokens } from "@/lib/tokens";
import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

export interface LessonActionsMenuItem {
  label: React.ReactNode;
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
  fontSize: tokens.fontSize.base,
  fontFamily: "Poppins, sans-serif",
  background: "transparent",
  border: "none",
  cursor: "pointer",
  color: tokens.navy,
};

export function LessonActionsMenu({
  open,
  onOpenChange,
  items,
  children,
  top = 40,
  right = 12,
  zIndex = 9999,
  "data-testid": dataTestId,
}: LessonActionsMenuProps) {
  const popoverRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState<{ top: number; right: number } | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  // Measure the trigger so the menu can be portalled to <body> with fixed
  // coordinates — otherwise ancestor overflow/transform clips or hides it.
  useLayoutEffect(() => {
    if (!open) {
      setCoords(null);
      return;
    }
    const measure = () => {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const menuHeight = Math.min(items.length * 42 + 8, 320);
      const spaceBelow = window.innerHeight - rect.bottom;
      const nextTop =
        spaceBelow < menuHeight + 16
          ? Math.max(8, rect.top - menuHeight + (top - 40))
          : rect.top + (top ?? 40);
      setCoords({
        top: nextTop,
        right: Math.max(8, window.innerWidth - rect.right + (right ?? 12) - 12),
      });
    };
    measure();
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [open, items.length, top, right]);

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
      {open && mounted && coords &&
        createPortal(
          <div
            ref={popoverRef}
            onClick={(ev) => ev.stopPropagation()}
            data-testid={dataTestId}
            style={{
              position: "fixed",
              top: coords.top,
              right: coords.right,
              minWidth: 160,
              maxHeight: "60vh",
              overflowY: "auto",
              background: tokens.white,
              border: "1px solid #E5E7EB",
              borderRadius: tokens.radiusCard,
              boxShadow: "0 8px 24px rgba(0,0,0,0.14)",
              zIndex,
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
          </div>,
          document.body,
        )}
    </div>
  );
}

export default LessonActionsMenu;
