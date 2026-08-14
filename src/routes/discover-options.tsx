import { createFileRoute } from "@tanstack/react-router";
import {
  IconBroadcast,
  IconBook,
  IconBolt,
  IconPlayerPlay,
  IconNews,
  IconChevronRight,
} from "@tabler/icons-react";

export const Route = createFileRoute("/discover-options")({
  head: () => ({
    meta: [
      { title: "Discover design options — DSM" },
      {
        name: "description",
        content: "Preview five design directions for the Discover & Learn section.",
      },
      { property: "og:title", content: "Discover design options — DSM" },
      {
        property: "og:description",
        content: "Preview five design directions for the Discover & Learn section.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DiscoverOptionsPage,
});

const FONT = "Poppins, sans-serif";
const BLUE = "#1877D6";
const NAVY = "#0B1F3A";

type Item = {
  label: string;
  sub: string;
  icon: typeof IconBook;
  colour: string;
  tint: string;
  badge?: "live" | "dot";
};

const ITEMS: Item[] = [
  { label: "Live", sub: "ON AIR", icon: IconBroadcast, colour: "#CC2229", tint: "#FEE2E2", badge: "live" },
  { label: "Learn", sub: "DSM Training", icon: IconBook, colour: "#1877D6", tint: "#EFF6FF" },
  { label: "Bitesize", sub: "Tips", icon: IconBolt, colour: "#F59E0B", tint: "#FEF3C7" },
  { label: "Showcase", sub: "Fun videos", icon: IconPlayerPlay, colour: "#7C3AED", tint: "#EDE9FE", badge: "dot" },
  { label: "News", sub: "Updates", icon: IconNews, colour: "#15803D", tint: "#F0FDF4", badge: "dot" },
];

const pulse = `@keyframes dsmLivePulse{0%{box-shadow:0 0 0 0 rgba(204,34,41,.55)}70%{box-shadow:0 0 0 6px rgba(204,34,41,0)}100%{box-shadow:0 0 0 0 rgba(204,34,41,0)}}`;

function SectionLabel({ text, colour = BLUE }: { text: string; colour?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 10 }}>
      <span style={{ width: 3, height: 12, background: colour, borderRadius: 2 }} />
      <span
        style={{
          color: colour,
          fontSize: 11,
          fontWeight: 800,
          letterSpacing: "0.6px",
          textTransform: "uppercase",
          fontFamily: FONT,
        }}
      >
        {text}
      </span>
    </div>
  );
}

/* 1 — Segmented list card */
function OptionOne() {
  return (
    <div
      style={{
        background: "#fff",
        borderRadius: 16,
        border: "1px solid #E4E8EF",
        overflow: "hidden",
      }}
    >
      <div style={{ padding: "12px 14px 6px" }}>
        <SectionLabel text="Discover & Learn" />
      </div>
      {ITEMS.map((it, i) => (
        <div
          key={it.label}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "11px 14px",
            borderTop: i === 0 ? "none" : "0.5px solid #EEF2F7",
          }}
        >
          <span
            style={{
              width: 34,
              height: 34,
              borderRadius: 10,
              background: it.tint,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <it.icon size={17} color={it.colour} stroke={1.6} />
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: NAVY, fontFamily: FONT }}>
              {it.label}
            </div>
            <div style={{ fontSize: 11, color: "#8592A6", fontFamily: FONT }}>{it.sub}</div>
          </div>
          {it.badge === "live" && (
            <span
              style={{
                fontSize: 9,
                fontWeight: 800,
                color: "#CC2229",
                background: "#FEE2E2",
                padding: "3px 7px",
                borderRadius: 999,
                fontFamily: FONT,
              }}
            >
              ON AIR
            </span>
          )}
          <IconChevronRight size={16} color="#C7D0DC" />
        </div>
      ))}
    </div>
  );
}

/* 2 — Scrollable chip rail */
function OptionTwo() {
  return (
    <div>
      <SectionLabel text="Discover & Learn" />
      <div
        style={{
          display: "flex",
          gap: 8,
          overflowX: "auto",
          paddingBottom: 4,
          scrollbarWidth: "none",
        }}
      >
        {ITEMS.map((it) => (
          <div
            key={it.label}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              background: "#fff",
              border: "1px solid #E4E8EF",
              borderRadius: 999,
              padding: "8px 14px 8px 8px",
              flexShrink: 0,
              position: "relative",
            }}
          >
            <span
              style={{
                width: 26,
                height: 26,
                borderRadius: 999,
                background: it.tint,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <it.icon size={14} color={it.colour} stroke={1.7} />
            </span>
            <span style={{ fontSize: 13, fontWeight: 600, color: NAVY, fontFamily: FONT }}>
              {it.label}
            </span>
            {it.badge && (
              <span
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: 999,
                  background: it.badge === "live" ? "#FF3B30" : "#1877D6",
                  position: "absolute",
                  top: 6,
                  right: 8,
                  animation: it.badge === "live" ? "dsmLivePulse 1.6s ease-out infinite" : undefined,
                }}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* 3 — Bento mix */
function OptionThree() {
  const [live, learn, ...rest] = ITEMS;
  return (
    <div>
      <SectionLabel text="Discover & Learn" />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
        {[live, learn].map((it) => (
          <div
            key={it.label}
            style={{
              background: "#fff",
              borderRadius: 14,
              border: "1px solid #E4E8EF",
              padding: 12,
              minHeight: 92,
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
            }}
          >
            <span
              style={{
                width: 32,
                height: 32,
                borderRadius: 10,
                background: it.tint,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <it.icon size={17} color={it.colour} stroke={1.6} />
            </span>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: NAVY, fontFamily: FONT }}>
                {it.label}
              </div>
              <div
                style={{
                  fontSize: 10.5,
                  fontWeight: it.badge === "live" ? 800 : 500,
                  color: it.badge === "live" ? "#CC2229" : "#8592A6",
                  fontFamily: FONT,
                }}
              >
                {it.sub}
              </div>
            </div>
          </div>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
        {rest.map((it) => (
          <div
            key={it.label}
            style={{
              background: "#fff",
              borderRadius: 14,
              border: "1px solid #E4E8EF",
              padding: "12px 6px",
              textAlign: "center",
            }}
          >
            <span
              style={{
                width: 28,
                height: 28,
                borderRadius: 9,
                background: it.tint,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 6px",
              }}
            >
              <it.icon size={15} color={it.colour} stroke={1.6} />
            </span>
            <div style={{ fontSize: 12.5, fontWeight: 600, color: NAVY, fontFamily: FONT }}>
              {it.label}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* 4 — Flat tinted grid (matches Quick Access) */
function OptionFour() {
  return (
    <div>
      <SectionLabel text="Discover & Learn" />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 8 }}>
        {ITEMS.map((it) => (
          <div key={it.label} style={{ textAlign: "center" }}>
            <span
              style={{
                width: 46,
                height: 46,
                borderRadius: 15,
                background: it.tint,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 6px",
                position: "relative",
              }}
            >
              <it.icon size={20} color={it.colour} stroke={1.6} />
              {it.badge && (
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 999,
                    background: it.badge === "live" ? "#FF3B30" : "#1877D6",
                    border: "1.5px solid #EEF2F7",
                    position: "absolute",
                    top: -1,
                    right: -1,
                  }}
                />
              )}
            </span>
            <div style={{ fontSize: 11.5, fontWeight: 600, color: NAVY, fontFamily: FONT }}>
              {it.label}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* 5 — Dark feature band */
function OptionFive() {
  return (
    <div style={{ background: NAVY, borderRadius: 18, padding: 14 }}>
      <SectionLabel text="Discover & Learn" colour="#7FB2F0" />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 7 }}>
        {ITEMS.map((it) => (
          <div
            key={it.label}
            style={{
              background: "rgba(255,255,255,0.08)",
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 12,
              padding: "12px 4px",
              textAlign: "center",
              position: "relative",
            }}
          >
            <span
              style={{
                width: 28,
                height: 28,
                borderRadius: 9,
                background: "rgba(255,255,255,0.12)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 6px",
              }}
            >
              <it.icon size={15} color="#fff" stroke={1.6} />
            </span>
            <div style={{ fontSize: 11.5, fontWeight: 600, color: "#fff", fontFamily: FONT }}>
              {it.label}
            </div>
            {it.badge === "live" && (
              <span
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: 999,
                  background: "#FF3B30",
                  position: "absolute",
                  top: 7,
                  right: 7,
                  animation: "dsmLivePulse 1.6s ease-out infinite",
                }}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

const OPTIONS = [
  { n: 1, name: "Segmented list card", node: <OptionOne /> },
  { n: 2, name: "Scrollable chip rail", node: <OptionTwo /> },
  { n: 3, name: "Bento mix", node: <OptionThree /> },
  { n: 4, name: "Flat tinted grid", node: <OptionFour /> },
  { n: 5, name: "Dark feature band", node: <OptionFive /> },
];

function DiscoverOptionsPage() {
  return (
    <main
      style={{
        background: "#EEF2F7",
        minHeight: "100vh",
        padding: "20px 16px 60px",
        fontFamily: FONT,
      }}
    >
      <style>{pulse}</style>
      <h1 style={{ fontSize: 18, fontWeight: 800, color: NAVY, marginBottom: 4 }}>
        Discover &amp; Learn — 5 options
      </h1>
      <p style={{ fontSize: 12, color: "#6B7A90", marginBottom: 20 }}>
        Preview only. Tell me the number you want and I&apos;ll build it into the home screen.
      </p>
      {OPTIONS.map((o) => (
        <section key={o.n} style={{ marginBottom: 26 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#6B7A90", marginBottom: 8 }}>
            Option {o.n} — {o.name}
          </div>
          {o.node}
        </section>
      ))}
    </main>
  );
}

export default DiscoverOptionsPage;
