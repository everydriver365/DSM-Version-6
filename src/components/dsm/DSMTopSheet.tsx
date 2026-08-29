import * as React from "react";
import { tapLight } from "@/lib/haptics";
import { IconChevronLeft } from "@tabler/icons-react";
import { tokens } from "@/lib/tokens";
import { useGoBack } from "@/hooks/useGoBack";

export interface DSMTopSheetProps {
  title: string;
  /** Custom back handler. Defaults to browser/router back (fallback `/home`). */
  onBack?: () => void;
  /** Set true to hide the back arrow entirely. */
  hideBack?: boolean;
  /** Fallback route used by the default back handler. */
  backFallback?: string;
  right?: React.ReactNode;
  sticky?: React.ReactNode;
  children: React.ReactNode;
}

export default function DSMTopSheet({
  title,
  onBack,
  hideBack,
  backFallback = "/home",
  right,
  sticky,
  children,
}: DSMTopSheetProps) {
  const goBack = useGoBack();
  const handleBack = onBack ?? (() => goBack(backFallback));
  const showBack = !hideBack;

  return (
    <div
      style={{
        // Flows below the global app header instead of covering it — two
        // stacked navy headers left an empty band at the top of the page.
        position: "relative",
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        background: tokens.navy,
      }}
    >
      <header
        style={{
          flexShrink: 0,
          paddingTop: 14,
          paddingBottom: 28,
          paddingLeft: tokens.pagePadding,
          paddingRight: tokens.pagePadding,
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          boxSizing: "border-box",
          background: tokens.navy,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 10,
          }}
        >
          {showBack && (
            <button
              type="button"
              aria-label="Go back"
              onClick={() => { tapLight(); handleBack(); }}

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
              <IconChevronLeft size={20} color={tokens.white} stroke={2} />
            </button>
          )}
          <h1
            style={{
              margin: 0,
              color: tokens.white,
              fontFamily: "Sora, sans-serif",
              fontSize: tokens.fontSize.xxl,
              lineHeight: "40px",
              fontWeight: tokens.fontWeight.bold,
            }}
          >
            {title}
          </h1>
        </div>

        {right}
      </header>

      <div
        className="page-enter"
        style={{
          position: "relative",
          zIndex: 1,
          flex: 1,
          minHeight: 0,
          marginTop: -18,
          background: "#DCE4F0",
          borderRadius: `${tokens.radiusSheet}px ${tokens.radiusSheet}px 0 0`,
          boxShadow: tokens.shadowSheet,
          overflowX: "hidden",
          display: "flex",
          flexDirection: "column",
          paddingTop: 20,
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
