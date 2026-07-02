import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type IconChipProps = {
  icon: LucideIcon;
  size?: "sm" | "lg";
  tone?: "blue" | "navy" | "success";
  className?: string;
};

/**
 * Checkfront-style icon-in-square-chip. Use as a row leading element
 * for non-people rows (categories, actions, metrics).
 */
export function IconChip({ icon: Icon, size = "sm", tone = "blue", className }: IconChipProps) {
  const toneClasses =
    tone === "navy"
      ? "bg-[#0B1F3A]/5 text-[#0B1F3A]"
      : tone === "success"
        ? "bg-[#E7F8EF] text-[#067647]"
        : "bg-[#EAF3FB] text-[#1877D6]";

  const sizeClasses =
    size === "lg" ? "w-10 h-10 rounded-[10px]" : "w-8 h-8 rounded-lg";
  const iconSize = size === "lg" ? 20 : 16;

  return (
    <span
      className={cn(
        "inline-flex items-center justify-center shrink-0",
        sizeClasses,
        toneClasses,
        className,
      )}
    >
      <Icon size={iconSize} strokeWidth={2} />
    </span>
  );
}

export default IconChip;