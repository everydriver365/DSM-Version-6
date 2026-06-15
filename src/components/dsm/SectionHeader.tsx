interface Props {
  children: React.ReactNode;
}

export function SectionHeader({ children }: Props) {
  return (
    <div
      className="mt-6 mb-2 text-[11px] font-medium text-[#6B7280] uppercase"
      style={{ letterSpacing: "0.05em", fontFamily: "Poppins, sans-serif" }}
    >
      {children}
    </div>
  );
}

export default SectionHeader;
