# Create DSMTopSheet shared layout component

Create ONLY the new component `src/components/dsm/DSMTopSheet.tsx`. No existing pages are changed.

## Component contract

- Props: `title: string`, `onBack?: () => void`, `right?: React.ReactNode`, `sticky?: React.ReactNode`, `children: React.ReactNode`.
- Pure layout wrapper: no data fetching, no hooks, no Supabase calls.
- Renders a fixed full-screen navy (`#0B1F3A`) flex column container.
- Header: `paddingTop: max(env(safe-area-inset-top, 0px), 24px)`, `paddingBottom: 20px`, `paddingLeft/Right: 20px`, `display: flex`, `alignItems: center`, `justifyContent: space-between`.
  - Left side: if `onBack` is provided, a circular 36×36 translucent (`rgba(255,255,255,0.15)`) chevron-left button; then the page title in Poppins 22px/700 white.
  - Right side: if `right` is provided, render it; otherwise a circular 36×36 translucent bell button that navigates to `/notifications` using `@tabler/icons-react` `IconBell`.
- White panel: background `#fff`, `borderRadius: 28px 28px 0 0`, `marginTop: -18px`, `flex: 1`, `overflowY: auto`, `paddingBottom: calc(88px + env(safe-area-inset-bottom, 0px))`.
  - Drag handle at top: 36×4 px, `#DADFE5`, rounded 2px, `margin: 10px auto 6px`.
  - If `sticky` is provided, render it pinned below the drag handle.
  - Then render `children`.
- Export default.

## Complete component code

```tsx
import * as React from "react";
import { IconChevronLeft, IconBell } from "@tabler/icons-react";

export interface DSMTopSheetProps {
  title: string;
  onBack?: () => void;
  right?: React.ReactNode;
  sticky?: React.ReactNode;
  children: React.ReactNode;
}

export default function DSMTopSheet({
  title,
  onBack,
  right,
  sticky,
  children,
}: DSMTopSheetProps) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        background: "#0B1F3A",
        overflow: "hidden",
      }}
    >
      <header
        style={{
          paddingTop: "max(env(safe-area-inset-top, 0px), 24px)",
          paddingBottom: 20,
          paddingLeft: 20,
          paddingRight: 20,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexShrink: 0,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          {onBack && (
            <button
              type="button"
              aria-label="Go back"
              onClick={onBack}
              style={{
                width: 36,
                height: 36,
                borderRadius: "50%",
                border: 0,
                padding: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "rgba(255,255,255,0.15)",
                cursor: "pointer",
                flexShrink: 0,
              }}
            >
              <IconChevronLeft size={20} color="#FFFFFF" stroke={2} />
            </button>
          )}
          <h1
            style={{
              margin: 0,
              color: "#FFFFFF",
              fontFamily: "Poppins, sans-serif",
              fontSize: 22,
              lineHeight: "28px",
              fontWeight: 700,
            }}
          >
            {title}
          </h1>
        </div>

        {right ?? (
          <button
            type="button"
            aria-label="Notifications"
            onClick={() => {
              if (typeof window !== "undefined") {
                window.location.href = "/notifications";
              }
            }}
            style={{
              width: 36,
              height: 36,
              borderRadius: "50%",
              border: 0,
              padding: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "rgba(255,255,255,0.15)",
              cursor: "pointer",
              flexShrink: 0,
            }}
          >
            <IconBell size={20} color="#FFFFFF" stroke={1.8} />
          </button>
        )}
      </header>

      <div
        style={{
          position: "relative",
          zIndex: 1,
          flex: 1,
          minHeight: 0,
          marginTop: -18,
          background: "#FFFFFF",
          borderRadius: "28px 28px 0 0",
          overflowY: "auto",
          overflowX: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div
          style={{
            width: 36,
            height: 4,
            borderRadius: 2,
            background: "#DADFE5",
            margin: "10px auto 6px",
            flexShrink: 0,
          }}
        />
        {sticky && (
          <div style={{ flexShrink: 0 }}>
            {sticky}
          </div>
        )}
        <div
          style={{
            flex: 1,
            minHeight: 0,
            paddingBottom: "calc(88px + env(safe-area-inset-bottom, 0px))",
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
```

## Constraints

- No existing files touched.
- `capacitor.config.ts` is not modified.
- No data fetching, no hooks, no Supabase calls inside the component.
