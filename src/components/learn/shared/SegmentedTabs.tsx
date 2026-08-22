/** Shared segmented control for the DSM Learn tabs and pupil filters. */
export default function SegmentedTabs<T extends string>({
  tabs,
  active,
  onChange,
  style,
}: {
  tabs: { id: T; label: string; count?: number }[];
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
        borderRadius: 10,
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
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 4,
              padding: t.count === undefined ? 7 : "8px 4px",
              border: "none",
              borderRadius: 8,
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
            <span>{t.label}</span>
            {t.count !== undefined && (
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 500,
                  padding: isActive ? "1px 6px" : 0,
                  borderRadius: 999,
                  background: isActive ? "#E6F1FB" : "transparent",
                  color: isActive ? "#2B7BC8" : "#6E6E73",
                }}
              >
                {t.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

