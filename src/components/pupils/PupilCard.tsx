import type { ReactNode } from "react";

const POPPINS = { fontFamily: "Poppins, sans-serif" } as const;

export interface PupilCardProps {
  /** Avatar element (already sized/decorated by the caller). */
  avatar: ReactNode;
  name: string;
  /** Pills (needs-attention) or inline coloured status text (active list). */
  tags?: ReactNode;
  lastLesson?: string | null;
  lessonCount: number;
  /** Only needs-attention cards pass a value — renders the flat left accent bar. */
  accentColour?: string;
  /** Optional trailing control (e.g. quick-actions trigger). */
  trailing?: ReactNode;
  onPress?: () => void;
  onKeyDown?: (e: React.KeyboardEvent) => void;
}

export default function PupilCard({
  avatar,
  name,
  tags,
  lastLesson,
  lessonCount,
  accentColour,
  trailing,
  onPress,
  onKeyDown,
}: PupilCardProps) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onPress}
      onKeyDown={onKeyDown}
      onContextMenu={(e) => e.preventDefault()}
      className="cursor-pointer select-none"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        background: "#FFFFFF",
        border: "0.5px solid #E5E5EA",
        ...(accentColour ? { borderLeft: `3px solid ${accentColour}` } : null),
        borderRadius: 12,
        padding: "12px 14px",
        boxSizing: "border-box",
        WebkitTouchCallout: "none",
        ...POPPINS,
      }}
    >
      <div style={{ flexShrink: 0, display: "flex" }}>{avatar}</div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          className="truncate"
          style={{
            fontSize: 14,
            fontWeight: 500,
            color: "#000000",
            letterSpacing: "-0.1px",
            marginBottom: 4,
          }}
        >
          {name}
        </div>

        {tags && (
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              gap: 6,
              marginBottom: 4,
              fontSize: 12,
            }}
          >
            {tags}
          </div>
        )}

        {lastLesson && (
          <div style={{ fontSize: 11, color: "#6E6E73" }}>{lastLesson}</div>
        )}
      </div>

      <div
        style={{
          textAlign: "center",
          flexShrink: 0,
          lineHeight: 1.15,
        }}
      >
        <div
          style={{
            fontSize: 18,
            fontWeight: 500,
            color: "#000000",
            letterSpacing: "-0.3px",
          }}
        >
          {lessonCount}
        </div>
        <div style={{ fontSize: 9, color: "#6E6E73" }}>
          {lessonCount === 1 ? "lesson" : "lessons"}
        </div>
      </div>

      {trailing}
    </div>
  );
}
