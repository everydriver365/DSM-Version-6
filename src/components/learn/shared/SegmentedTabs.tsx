/** Shared segmented control for the DSM Learn tabs. */
export default function SegmentedTabs<T extends string>({
  tabs,
  active,
  onChange,
  style,
}: {
  tabs: { id: T; label: string }[];
  active: T;
  onChange: (id: T) => void;
  style?: React.CSSProperties;
}) {
  return (
    <div
      style={{
        display: "flex",
        gap: 4,
        padding: 3,
        background: "#F2F2F4",
        borderRadius: 8,
        fontFamily: "Poppins, sans-serif",
        ...style,
      }}
    >
      {tabs.map((t) => {
        const isActive = active === t.id;
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => onChange(t.id)}
            style={{
              flex: 1,
              padding: 7,
              border: "none",
              borderRadius: 6,
              background: isActive ? "#FFFFFF" : "transparent",
              color: isActive ? "#000000" : "#6E6E73",
              fontFamily: "Poppins, sans-serif",
              fontSize: 12,
              fontWeight: 500,
              cursor: "pointer",
              boxShadow: isActive ? "0 0.5px 1px rgba(0,0,0,0.06)" : "none",
              transition: "background 0.15s, color 0.15s",
            }}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}
