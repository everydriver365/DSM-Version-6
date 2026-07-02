import type { ReactNode } from "react";

interface Props {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  action?: ReactNode;
}

/**
 * Checkfront-style page header:
 * optional eyebrow (small caps blue) + Sora navy title + optional action.
 */
export function PageHeader({ eyebrow, title, subtitle, action }: Props) {
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
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export default PageHeader;