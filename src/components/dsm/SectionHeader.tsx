interface Props {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

// Checkfront-style eyebrow: small caps, wide tracking, brand blue,
// prefixed with a 3px accent bar for scannability.
export function SectionHeader({ children, className = "", style }: Props) {
  return (
    <div className={`mt-6 mb-2 flex items-center gap-2 ${className}`} style={style}>
      <span
        aria-hidden
        style={{
          display: "inline-block",
          width: 3,
          height: 12,
          borderRadius: 2,
          backgroundColor: "#1877D6",
        }}
      />
      <span
        className="text-[11px] font-semibold uppercase"
        style={{
          letterSpacing: "0.12em",
          color: "#1877D6",
          fontFamily: "Inter, sans-serif",
        }}
      >
        {children}
      </span>
    </div>
  );
}

export default SectionHeader;
