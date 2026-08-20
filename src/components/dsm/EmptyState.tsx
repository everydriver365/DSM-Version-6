import type { ReactNode } from "react";
import { tokens } from "@/lib/tokens";
import { IconMoodEmpty } from "@tabler/icons-react";

type IconComponent = (props: { size?: number; color?: string }) => ReactNode;

interface EmptyStateProps {
  /** Either a rendered node (preferred) or an icon component (legacy usage). */
  icon?: ReactNode | IconComponent;
  title: string;
  subtitle?: string;
  /** Legacy alias for subtitle. */
  description?: string;
  action?: ReactNode | { label: string; onClick: () => void };
}

// Checkfront-style empty state: soft blue circle icon, navy title, muted body, one CTA.
export function EmptyState({ icon, title, subtitle, description, action }: EmptyStateProps) {
  let iconNode: ReactNode = null;
  if (typeof icon === "function") {
    const Icon = icon as IconComponent;
    iconNode = <Icon size={28} color="#1877D6" />;
  } else if (icon) {
    iconNode = icon;
  } else {
    iconNode = <IconMoodEmpty size={32} color="#9CA3AF" stroke={1.5} />;
  }

  const body = subtitle ?? description;

  const actionNode =
    action && typeof action === "object" && "label" in (action as Record<string, unknown>) ? (
      <button
        type="button"
        onClick={(action as { label: string; onClick: () => void }).onClick}
        className="inline-flex items-center justify-center h-10 px-4 rounded-lg text-[13px] font-semibold text-white"
        style={{ backgroundColor: tokens.blue, fontFamily: "Poppins, sans-serif", border: "none" }}
      >
        {(action as { label: string }).label}
      </button>
    ) : (
      (action as ReactNode)
    );

  return (
    <div className="flex flex-col items-center justify-center text-center px-6 py-12">
      <div
        className="flex items-center justify-center rounded-full"
        style={{
          width: 64,
          height: 64,
          backgroundColor: "#EAF3FB",
          marginBottom: 16,
        }}
      >
        {iconNode}
      </div>
      <h3
        className="text-[16px] font-semibold"
        style={{ color: tokens.navy, fontFamily: "Sora, Poppins, sans-serif" }}
      >
        {title}
      </h3>
      {body && (
        <p className="mt-1 text-[13px] max-w-xs" style={{ color: "#6B7280" }}>
          {body}
        </p>
      )}
      {actionNode && <div className="mt-5">{actionNode}</div>}
    </div>
  );
}

export default EmptyState;
