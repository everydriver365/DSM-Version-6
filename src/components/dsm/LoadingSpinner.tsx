import React from "react";
import { tokens } from "@/lib/tokens";

export function LoadingSpinner({
  size = 24,
  color = "#1877D6",
}: {
  size?: number;
  color?: string;
}) {
  return (
    <>
      <style>
        {`
          @keyframes dsm-spin {
            to { transform: rotate(360deg); }
          }
        `}
      </style>
      <div
        style={{
          width: size,
          height: size,
          border: `3px solid ${color}33`,
          borderTopColor: color,
          borderRadius: "50%",
          animation: "dsm-spin 0.8s linear infinite",
        }}
        aria-label="Loading"
        role="status"
      />
    </>
  );
}

export function PageLoader() {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 12,
        padding: 40,
        color: "#6B7280",
        fontFamily: "Poppins, sans-serif",
        fontSize: tokens.fontSize.md,
        fontWeight: tokens.fontWeight.medium,
      }}
    >
      <LoadingSpinner />
      <div>Loading...</div>
    </div>
  );
}

export function SkeletonRow() {
  return (
    <>
      <style>
        {`
          @keyframes dsm-pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.4; }
          }
        `}
      </style>
      <div
        className="flex items-center"
        style={{
          gap: 12,
          padding: "13px 16px",
          background: tokens.white,
        }}
      >
        {/* Avatar skeleton */}
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: "50%",
            backgroundColor: tokens.canvas,
            animation: "dsm-pulse 1.6s ease-in-out infinite",
            flexShrink: 0,
          }}
        />
        {/* Text skeletons */}
        <div className="min-w-0 flex-1 flex flex-col gap-2">
          <div
            style={{
              height: 14,
              width: "60%",
              backgroundColor: tokens.canvas,
              borderRadius: 8,
              animation: "dsm-pulse 1.6s ease-in-out infinite",
            }}
          />
          <div
            style={{
              height: 11,
              width: "40%",
              backgroundColor: tokens.canvas,
              borderRadius: 8,
              animation: "dsm-pulse 1.6s ease-in-out infinite",
            }}
          />
        </div>
      </div>
    </>
  );
}

export function SkeletonCard({ rows = 3 }: { rows?: number }) {
  return (
    <div
      style={{
        margin: "0 16px",
        background: tokens.white,
        borderRadius: 8,
        overflow: "hidden",
        boxShadow: "0 1px 3px rgba(11,31,58,0.06)",
      }}
    >
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i}>
          <SkeletonRow />
          {i < rows - 1 && (
            <div style={{ height: 1, background: tokens.border, marginLeft: 74 }} />
          )}
        </div>
      ))}
    </div>
  );
}

export default LoadingSpinner;
