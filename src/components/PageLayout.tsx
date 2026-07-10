import * as React from "react";

/**
 * Shared page wrapper. Owns the app-wide canvas background so any future
 * change (color, min-height, safe-area handling) is a one-line edit.
 *
 * Usage:
 *   <PageLayout className="pb-24" style={POPPINS}> ... </PageLayout>
 *
 * - `className` is appended after the base classes, so callers can add
 *   layout modifiers (pb-*, flex, relative, etc.).
 * - `style` merges with (and can override) the default background — needed
 *   for the small number of screens that intentionally use a different
 *   canvas color (e.g. auth screens on dark navy).
 */
export const PAGE_BACKGROUND = "#EEF2F7";

type PageLayoutProps = React.HTMLAttributes<HTMLDivElement> & {
  children: React.ReactNode;
};

export function PageLayout({
  children,
  className,
  style,
  ...rest
}: PageLayoutProps) {
  return (
    <div
      {...rest}
      className={`min-h-screen ${className ?? ""}`.trim()}
      style={{ backgroundColor: PAGE_BACKGROUND, ...style }}
    >
      {children}
    </div>
  );
}

export default PageLayout;
