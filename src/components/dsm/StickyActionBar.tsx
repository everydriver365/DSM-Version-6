import * as React from "react";
import { cn } from "@/lib/utils";

// Sticky bottom action bar for edit/create forms.
// Sits above the mobile BottomNav via env(safe-area-inset-bottom) + 72px clearance.
// Drop as the last child of a scrollable page; children are the action buttons.
export function StickyActionBar({
  children,
  className,
  aboveBottomNav = true,
}: {
  children: React.ReactNode;
  className?: string;
  aboveBottomNav?: boolean;
}) {
  return (
    <>
      {/* Spacer so content isn't hidden behind the bar */}
      <div aria-hidden className={aboveBottomNav ? "h-32" : "h-24"} />
      <div
        className={cn(
          "fixed left-0 right-0 z-40 border-t border-[#EEF2F7] bg-white/95 backdrop-blur px-4 py-3",
          "shadow-[0_-8px_24px_-12px_rgba(11,31,58,0.15)]",
          className,
        )}
        style={{
          bottom: aboveBottomNav
            ? "calc(env(safe-area-inset-bottom, 0px) + 64px)"
            : "env(safe-area-inset-bottom, 0px)",
        }}
      >
        <div className="mx-auto flex max-w-md items-center gap-2">{children}</div>
      </div>
    </>
  );
}