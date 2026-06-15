interface Props {
  value: string | number;
  label: string;
}

export function StatTile({ value, label }: Props) {
  return (
    <div
      className="bg-[#F8F9FB] rounded-xl p-4"
      style={{
        borderWidth: "0.5px",
        borderStyle: "solid",
        borderColor: "#E2E6ED",
        fontFamily: "Poppins, sans-serif",
      }}
    >
      <div className="text-[24px] font-semibold text-[#0F2044] leading-tight">{value}</div>
      <div
        className="mt-1 text-[11px] font-medium text-[#6B7280] uppercase"
        style={{ letterSpacing: "0.05em" }}
      >
        {label}
      </div>
    </div>
  );
}

export default StatTile;
