# Update DSMTopSheet to match the Messages header exactly

Only `src/components/dsm/DSMTopSheet.tsx` will be changed. The goal is to make every page that uses the shared sheet component match the hand-built Messages header spacing, typography, and button sizes.

## Current file (src/components/dsm/DSMTopSheet.tsx)

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

## Updated file (src/components/dsm/DSMTopSheet.tsx)

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
          height: "calc(max(env(safe-area-inset-top, 0px), 24px) + 86px)",
          flexShrink: 0,
          paddingTop: "calc(max(env(safe-area-inset-top, 0px), 24px) + 13px)",
          paddingBottom: 28,
          paddingLeft: 22,
          paddingRight: 22,
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 10,
          }}
        >
          {onBack && (
            <button
              type="button"
              aria-label="Go back"
              onClick={onBack}
              style={{
                width: 40,
                height: 40,
                borderRadius: "50%",
                border: 0,
                padding: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "rgba(255,255,255,0.1)",
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
              fontFamily: "Sora, sans-serif",
              fontSize: 22,
              lineHeight: "40px",
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
              width: 40,
              height: 40,
              borderRadius: "50%",
              border: 0,
              padding: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "rgba(255,255,255,0.1)",
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
          paddingTop: 12,
        }}
      >
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

## Changes

- Header height becomes fixed: `calc(max(env(safe-area-inset-top, 0px), 24px) + 86px)`.
- Header padding becomes `calc(max(env(safe-area-inset-top, 0px), 24px) + 13px) 22px 28px`.
- Header alignment changes from `center` to `flex-start` for both the header row and the title/back row.
- Title uses `Sora, sans-serif` with `lineHeight: '40px'` instead of `Poppins` with `28px` line height.
- Back button and bell button resize from `36px` to `40px` and their background changes from `rgba(255,255,255,0.15)` to `rgba(255,255,255,0.1)`.
- The grey drag handle inside the white sheet is removed.
- The white sheet now has `paddingTop: 12` instead of a drag handle margin.
- Bottom safe-area padding remains unchanged: `calc(88px + env(safe-area-inset-bottom, 0px))`.

No other file will be modified. This single change will fix the inconsistent spacing across every page that uses `DSMTopSheet`.
