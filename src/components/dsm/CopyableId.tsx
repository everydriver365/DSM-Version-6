import * as React from "react";
import { Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { haptic } from "@/lib/haptics";

// Tap-to-copy chip for IDs, invoice numbers, reference codes.
export function CopyableId({
  value,
  label,
  className,
}: {
  value: string;
  label?: string;
  className?: string;
}) {
  const [copied, setCopied] = React.useState(false);
  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(value);
      haptic("selection");
      setCopied(true);
      toast.success(`${label ?? "ID"} copied`);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      toast.error("Copy failed");
    }
  };
  return (
    <button
      type="button"
      onClick={handleCopy}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border border-[#EEF2F7] bg-[#F3F8FF] px-2 py-0.5 font-mono text-xs text-[#0B1F3A] hover:bg-[#EAF3FB] transition-colors",
        className,
      )}
      title={`Copy ${label ?? "ID"}`}
    >
      <span className="truncate max-w-[140px]">{value}</span>
      {copied ? (
        <Check className="h-3 w-3 text-[#067647]" />
      ) : (
        <Copy className="h-3 w-3 text-[#5A6B82]" />
      )}
    </button>
  );
}