/** Calm tinted status pill used by pupil list cards. */
export type StatusPillTone = "red" | "amber" | "blue" | "green" | "grey";

const TONES: Record<StatusPillTone, { bg: string; fg: string }> = {
  red: { bg: "#FBEAEC", fg: "#C8434F" },
  amber: { bg: "#FBF1DE", fg: "#B8801F" },
  blue: { bg: "#E6F1FB", fg: "#2B7BC8" },
  green: { bg: "#E7F4E7", fg: "#3B8B3B" },
  grey: { bg: "#F2F2F4", fg: "#6E6E73" },
};

export default function StatusPill({
  tone = "grey",
  label,
}: {
  tone?: StatusPillTone;
  label: string;
}) {
  const c = TONES[tone];
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        background: c.bg,
        color: c.fg,
        fontFamily: "Poppins, sans-serif",
        fontSize: 10,
        fontWeight: 500,
        lineHeight: 1.4,
        padding: "2px 7px",
        borderRadius: 999,
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </span>
  );
}
