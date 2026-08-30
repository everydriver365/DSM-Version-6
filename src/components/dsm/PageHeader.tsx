import * as React from "react";
import { tokens } from "@/lib/tokens";
import { IconChevronLeft } from "@tabler/icons-react";
import { useGoBack } from "@/hooks/useGoBack";
import { useRegisterPageBack } from "@/components/dsm/BackBarContext";

/**
 * Shared navy page header for DSM secondary pages.
 * Sticky, safe-area aware, with optional back button and right-hand slot.
 */
interface PageHeaderProps {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  backTo?: string;
  onBack?: () => void;
  right?: React.ReactNode;
}

const NAVY = "#0B2341";

export function PageHeader({
  title,
  subtitle,
  showBack = true,
  backTo,
  onBack,
  right,
}: PageHeaderProps) {
  const goBack = useGoBack();
  useRegisterPageBack(showBack);

  function handleBack() {
    // Always mean "previous screen"; backTo is only the deep-link fallback.
    if (onBack) onBack();
    else goBack(backTo ?? "/home");
  }

  return (
    <div
      style={{
        position: "sticky",
        top: 0,
        zIndex: 30,
        background: NAVY,
        color: "#fff",
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "calc(env(safe-area-inset-top, 0px) + 12px) 16px 12px",
        borderRadius: 0,
      }}
    >
      {showBack ? (
        <button
          type="button"
          aria-label="Back"
          onClick={handleBack}
          style={{
            width: 32,
            height: 32,
            borderRadius: "50%",
            background: "rgba(255,255,255,0.15)",
            border: "none",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#fff",
            cursor: "pointer",
            padding: 0,
            flexShrink: 0,
          }}
        >
          <IconChevronLeft size={18} />
        </button>
      ) : null}

      <div style={{ flex: 1, minWidth: 0 }}>
        <h1
          style={{
            fontSize: tokens.fontSize.xl,
            fontWeight: tokens.fontWeight.bold,
            color: "#fff",
            margin: 0,
            fontFamily: "Poppins, sans-serif",
            lineHeight: 1.25,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {title}
        </h1>
        {subtitle ? (
          <div
            style={{
              fontSize: 12,
              color: "rgba(255,255,255,0.7)",
              marginTop: 2,
              fontFamily: "Poppins, sans-serif",
            }}
          >
            {subtitle}
          </div>
        ) : null}
      </div>

      {right ? <div style={{ flexShrink: 0 }}>{right}</div> : null}
    </div>
  );
}

export default PageHeader;
