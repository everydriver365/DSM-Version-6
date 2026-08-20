import * as React from "react";
import { IconChevronLeft, IconBell } from "@tabler/icons-react";

export interface DSMTopSheetProps {
  title: string;
  onBack?: () => void;
  right?: React.ReactNode;
  sticky?: React.ReactNode;
  children: React.ReactNode;
}

export default function DSMTopSheet({
  title,
  onBack,
  right,
  sticky,
  children,
}: DSMTopSheetProps) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        background: "#0B1F3A",
        overflow: "hidden",
      }}
    >
      <header
        style={{
          height: "calc(max(env(safe-area-inset-top, 0px), 24px) + 86px)",
          flexShrink: 0,
          paddingTop: "calc(max(env(safe-area-inset-top, 0px), 24px) + 13px)",
          paddingBottom: 28,
          paddingLeft: 22,
          paddingRight: 22,
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 10,
          }}
        >
          {onBack && (
            <button
              type="button"
              aria-label="Go back"
              onClick={onBack}
              style={{
                width: 40,
                height: 40,
                borderRadius: "50%",
                border: 0,
                padding: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "rgba(255,255,255,0.1)",
                cursor: "pointer",
                flexShrink: 0,
              }}
            >
              <IconChevronLeft size={20} color="#FFFFFF" stroke={2} />
            </button>
          )}
          <h1
            style={{
              margin: 0,
              color: "#FFFFFF",
              fontFamily: "Sora, sans-serif",
              fontSize: 22,
              lineHeight: "40px",
              fontWeight: 700,
            }}
          >
            {title}
          </h1>
        </div>

        {right ?? (
          <button
            type="button"
            aria-label="Notifications"
            onClick={() => {
              if (typeof window !== "undefined") {
                window.location.href = "/notifications";
              }
            }}
            style={{
              width: 40,
              height: 40,
              borderRadius: "50%",
              border: 0,
              padding: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "rgba(255,255,255,0.1)",
              cursor: "pointer",
              flexShrink: 0,
            }}
          >
            <IconBell size={20} color="#FFFFFF" stroke={1.8} />
          </button>
        )}
      </header>

      <div
        style={{
          position: "relative",
          zIndex: 1,
          flex: 1,
          minHeight: 0,
          marginTop: -18,
          background: "#FFFFFF",
          borderRadius: "28px 28px 0 0",
          overflowY: "auto",
          overflowX: "hidden",
          display: "flex",
          flexDirection: "column",
          paddingTop: 12,
        }}
      >
        {sticky && (
          <div style={{ flexShrink: 0 }}>
            {sticky}
          </div>
        )}
        <div
          style={{
            flex: 1,
            minHeight: 0,
            paddingBottom: "calc(88px + env(safe-area-inset-bottom, 0px))",
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
