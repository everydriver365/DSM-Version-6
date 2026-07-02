import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

interface Props {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
}

// Checkfront-style empty state: soft blue circle icon, navy title, muted body, one CTA.
export function EmptyState({ icon: Icon, title, description, action }: Props) {
  return (
    <div className="flex flex-col items-center justify-center text-center px-6 py-12">
      {Icon && (
        <div
          className="flex items-center justify-center rounded-full"
          style={{
            width: 64,
            height: 64,
            backgroundColor: "#EAF3FB",
            marginBottom: 16,
          }}
        >
          <Icon size={28} color="#1877D6" />
        </div>
      )}
      <h3
        className="text-[16px] font-semibold"
        style={{ color: "#0B1F3A", fontFamily: "Sora, Inter, sans-serif" }}
      >
        {title}
      </h3>
      {description && (
        <p
          className="mt-1 text-[13px] max-w-xs"
          style={{ color: "#6B7280" }}
        >
          {description}
        </p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export default EmptyState;