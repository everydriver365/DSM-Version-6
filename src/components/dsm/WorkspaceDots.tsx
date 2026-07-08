import { useNavigate } from "@tanstack/react-router";

const WORKSPACES = ["Today", "Schedule", "Pupils", "Money", "Market", "DSM", "Community", "Tools"];

type Props = {
  activeIndex?: number;
};

export default function WorkspaceDots({ activeIndex = 0 }: Props) {
  const navigate = useNavigate();
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        gap: 5,
        padding: "4px 16px 8px",
        background: "#0F2044",
        flexShrink: 0,
        zIndex: 10,
      }}
    >
      {WORKSPACES.map((lbl, i) => (
        <button
          key={i}
          type="button"
          aria-label={`Go to ${lbl}`}
          onClick={() => navigate({ to: "/home", search: { ws: i } as any })}
          style={{
            width: activeIndex === i ? 22 : 6,
            height: 6,
            borderRadius: 3,
            background: activeIndex === i ? "#FFFFFF" : "rgba(255,255,255,0.25)",
            border: "none",
            cursor: "pointer",
            padding: 0,
            transition: "all 0.25s ease",
          }}
        />
      ))}
      <span
        style={{
          color: "rgba(255,255,255,0.6)",
          fontSize: 11,
          fontWeight: 600,
          fontFamily: "Poppins, sans-serif",
          marginLeft: 10,
          letterSpacing: 0.5,
          textTransform: "uppercase",
          minWidth: 80,
        }}
      >
        {WORKSPACES[activeIndex] ?? WORKSPACES[0]}
      </span>
    </div>
  );
}
