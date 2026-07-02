interface Props {
  children: React.ReactNode;
}

// Checkfront-style eyebrow: small caps, wide tracking, brand blue.
export function SectionHeader({ children }: Props) {
  return (
    <div
      className="mt-6 mb-2 text-[11px] font-semibold uppercase"
      style={{
        letterSpacing: "0.12em",
        color: "#1877D6",
        fontFamily: "Inter, sans-serif",
      }}
    >
      {children}
    </div>
  );
}

export default SectionHeader;
