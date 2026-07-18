import type { ReactNode } from "react";
import { X } from "lucide-react";
import { Sheet, SheetContent } from "@/components/ui/sheet";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title?: string;
  description?: string;
  children: ReactNode;
  /** max height percentage of viewport, default 85 */
  maxHeightVh?: number;
}

/**
 * Checkfront-style bottom sheet: consistent handle, safe-area padding,
 * bottom-nav clearance. Wraps shadcn Sheet with brand chrome.
 */
export function BottomSheet({
  open,
  onOpenChange,
  title,
  description,
  children,
  maxHeightVh = 85,
}: Props) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="rounded-t-[20px] border-0 bg-white p-0 shadow-[0_-8px_30px_-8px_rgba(11,31,58,0.2)] [&>button.absolute]:hidden"
        style={{ maxHeight: `${maxHeightVh}vh` }}
      >
        <div className="flex h-full max-h-full flex-col">
          {/* Handle */}
          <div className="flex justify-center pt-3 pb-1">
            <div className="h-1 w-10 rounded-full bg-[#D5DDE8]" />
          </div>
          <div className="flex items-start justify-between gap-3 px-5 pb-3">
            {title ? (
              <div className="flex-1 min-w-0">
                <h2
                  className="text-lg font-bold"
                  style={{ color: "#0B1F3A", fontFamily: "Sora, Inter, sans-serif" }}
                >
                  {title}
                </h2>
                {description ? (
                  <p className="mt-0.5 text-sm text-[#4A5A73]">{description}</p>
                ) : null}
              </div>
            ) : (
              <div className="flex-1" />
            )}
            <button
              type="button"
              aria-label="Close"
              onClick={() => onOpenChange(false)}
              className="flex shrink-0 items-center justify-center"
              style={{
                width: 32,
                height: 32,
                borderRadius: 999,
                backgroundColor: "#F3F4F6",
                border: "none",
              }}
            >
              <X size={16} color="#6B7280" />
            </button>
          </div>
          <div
            className="min-h-0 flex-1 overflow-y-auto px-5 pt-1"
            style={{ paddingBottom: "calc(1rem + env(safe-area-inset-bottom) + 80px)" }}
          >
            {children}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export default BottomSheet;