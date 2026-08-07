import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { IconBook, IconChevronLeft, IconLock } from "@tabler/icons-react";

export const Route = createFileRoute("/bitesize")({
  head: () => ({
    meta: [
      { title: "DSM Bitesize — EveryDriver" },
      { name: "description", content: "Short CPD videos for driving instructors." },
    ],
  }),
  component: BitesizePage,
});

const POPPINS = { fontFamily: "Poppins, sans-serif" } as const;

function BitesizePage() {
  const navigate = useNavigate();
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        background: "#DCE4F0",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "16px",
          paddingTop: "calc(16px + env(safe-area-inset-top, 0px))",
          backgroundColor: "#0B1F3A",
        }}
      >
        <button
          type="button"
          aria-label="Back"
          onClick={() => navigate({ to: "/home" as never })}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: 0,
            display: "flex",
            color: "#FFFFFF",
          }}
        >
          <IconChevronLeft size={28} />
        </button>
        <span
          style={{
            fontSize: 15,
            fontWeight: 600,
            color: "#FFFFFF",
            ...POPPINS,
          }}
        >
          DSM Bitesize
        </span>
        <div style={{ width: 28 }} />
      </div>

      {/* Coming soon */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: 32,
          textAlign: "center",
        }}
      >
        <div
          style={{
            width: 80,
            height: 80,
            borderRadius: "50%",
            background: "#E6F1FB",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 24,
          }}
        >
          <IconBook size={36} color="#1877D6" />
        </div>
        <h1
          style={{
            fontSize: 22,
            fontWeight: 700,
            color: "#0B1F3A",
            marginBottom: 12,
            ...POPPINS,
          }}
        >
          DSM Bitesize
        </h1>
        <p
          style={{
            fontSize: 14,
            lineHeight: 1.5,
            color: "#5B6472",
            maxWidth: 280,
            marginBottom: 24,
            ...POPPINS,
          }}
        >
          Short CPD videos for driving instructors — teaching techniques, DVSA
          updates, Standards Check prep and more.
        </p>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            background: "#0B1F3A",
            color: "#FFFFFF",
            fontSize: 12,
            fontWeight: 700,
            fontFamily: "Poppins, sans-serif",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            borderRadius: 20,
            padding: "8px 16px",
          }}
        >
          <IconLock size={14} />
          Coming soon
        </div>
      </div>
    </div>
  );
}
