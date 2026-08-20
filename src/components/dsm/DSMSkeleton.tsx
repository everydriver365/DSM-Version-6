import { tokens } from "@/lib/tokens";

interface DSMSkeletonProps {
  width?: string | number;
  height?: number;
  borderRadius?: number;
  style?: React.CSSProperties;
}

export default function DSMSkeleton({
  width = "100%",
  height = 16,
  borderRadius = 8,
  style,
}: DSMSkeletonProps) {
  return (
    <>
      <style>{`
        @keyframes dsm-skeleton-shimmer {
          0% { background-position: -200px 0; }
          100% { background-position: calc(200px + 100%) 0; }
        }
      `}</style>
      <div
        style={{
          width,
          height,
          borderRadius,
          background: `linear-gradient(90deg, ${tokens.canvas} 0%, ${tokens.white} 50%, ${tokens.canvas} 100%)`,
          backgroundSize: "200px 100%",
          animation: "dsm-skeleton-shimmer 1.6s ease-in-out infinite",
          ...style,
        }}
      />
    </>
  );
}
