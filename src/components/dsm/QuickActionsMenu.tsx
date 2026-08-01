import { useRef, useState, useLayoutEffect } from "react";
import { createPortal } from "react-dom";

export type QuickAction = {
  label: string;
  onClick: () => void;
  destructive?: boolean;
};

export function QuickActionsMenu({
  trigger,
  items,
}: {
  trigger: (props: { onClick: () => void }) => React.ReactNode;
  items: QuickAction[];
}) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; right: number } | null>(null);
  const triggerRef = useRef<HTMLDivElement>(null);

  const openMenu = () => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (rect) {
      setCoords({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
    }
    setOpen(true);
  };

  useLayoutEffect(() => {
    if (!open) return;
    const handleResize = () => setOpen(false);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [open]);

  return (
    <div ref={triggerRef} style={{ display: "inline-flex" }}>
      {trigger({ onClick: openMenu })}
      {open &&
        coords &&
        createPortal(
          <>
            <div
              style={{
                position: "fixed",
                inset: 0,
                zIndex: 30,
              }}
              onClick={() => setOpen(false)}
            />
            <div
              style={{
                position: "fixed",
                top: coords.top,
                right: coords.right,
                zIndex: 40,
                background: "#FFFFFF",
                borderRadius: 8,
                border: "0.5px solid #E2E6ED",
                boxShadow: "0 6px 20px rgba(0,0,0,0.08)",
                minWidth: 140,
                overflow: "hidden",
              }}
            >
              {items.map((item, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    item.onClick();
                  }}
                  style={{
                    display: "block",
                    width: "100%",
                    textAlign: "left",
                    padding: "10px 14px",
                    background: "none",
                    border: "none",
                    borderBottom: i < items.length - 1 ? "0.5px solid #E2E6ED" : "none",
                    fontSize: 13,
                    fontFamily: "Poppins, sans-serif",
                    color: item.destructive ? "#CC2229" : "#0B1F3A",
                    cursor: "pointer",
                  }}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </>,
          document.body,
        )}
    </div>
  );
}
