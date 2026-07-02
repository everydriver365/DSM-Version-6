import type { ReactNode } from "react";
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
        className="rounded-t-[20px] border-0 bg-white p-0 shadow-[0_-8px_30px_-8px_rgba(11,31,58,0.2)]"
        style={{ maxHeight: `${maxHeightVh}vh` }}
      >
        <div className="flex h-full max-h-full flex-col">
          {/* Handle */}
          <div className="flex justify-center pt-3 pb-1">
            <div className="h-1 w-10 rounded-full bg-[#D5DDE8]" />
          </div>
          {title ? (
            <div className="px-5 pb-3">
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
          ) : null}
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