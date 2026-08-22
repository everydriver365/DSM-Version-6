import * as React from "react";

/** Shared line-style section header for DSM Learn tabs. */
export default function SectionHeader({
  icon,
  title,
  style,
}: {
  icon?: React.ReactNode;
  title: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        fontFamily: "Poppins, sans-serif",
        ...style,
      }}
    >
      {icon}
      <span
        style={{
          fontSize: 15,
          fontWeight: 500,
          color: "#000000",
          letterSpacing: "-0.2px",
        }}
      >
        {title}
      </span>
    </div>
  );
}

/** 16x16 line-style play triangle used by DSM Learn section headers. */
export function PlayTriangleIcon({ color = "#2B7BC8" }: { color?: string }) {
  return (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M8 5.5v13l11-6.5-11-6.5z"
        stroke={color}
        strokeWidth={1.8}
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}
