import { IconMenu2 } from "@tabler/icons-react";
import type { ReactNode } from "react";

interface Props {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  action?: ReactNode;
  onMenu?: () => void;
}

/**
 * Checkfront-style page header:
 * optional eyebrow (small caps blue) + Sora navy title + optional action.
 */
export function PageHeader({ eyebrow, title, subtitle, action, onMenu }: Props) {
  return (
    <div className="flex items-start justify-between gap-3 pt-2 pb-4">
      <div className="min-w-0 flex-1">
        {eyebrow ? (
          <div className="cf-eyebrow mb-1">{eyebrow}</div>
        ) : null}
        <h1
          className="truncate text-[22px] font-bold leading-tight"
          style={{ color: "#0B1F3A", fontFamily: "Sora, Inter, sans-serif" }}
        >
          {title}
        </h1>
        {subtitle ? (
          <p className="mt-1 text-sm text-[#4A5A73]">{subtitle}</p>
        ) : null}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {onMenu ? (
          <button
            type="button"
            aria-label="Menu"
            onClick={onMenu}
            style={{
              width: 32,
              height: 32,
              borderRadius: "50%",
              background: "#0B1F3A",
              border: "none",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              padding: 0,
            }}
          >
            <IconMenu2 size={18} color="#ffffff" strokeWidth={1.8} />
          </button>
        ) : null}
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
    </div>
  );
}

export default PageHeader;