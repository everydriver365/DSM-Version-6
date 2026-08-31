import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  IconBell,
  IconBook,
  IconBrandYoutube,
  IconChevronRight,
  IconFileText,
  IconPlayerPlay,
  IconRadio,
  IconSchool,
  IconSearch,
  IconShoppingBag,
  IconStar,
} from "@tabler/icons-react";
import { PageLayout } from "@/components/PageLayout";

const POPPINS = { fontFamily: "Poppins, sans-serif" } as const;
const PAGE_BG = "#F4F6F8";
const NAVY = "#0B2341";
const BLUE = "#2C97DE";
const TEXT_SECONDARY = "#536579";
const BORDER = "#E4E8EF";
const CARD_RADIUS = 14;

function SectionHeader({
  title,
  actionLabel,
  onAction,
}: {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 10,
      }}
    >
      <span
        style={{
          fontSize: 11,
          fontWeight: 700,
          color: NAVY,
          letterSpacing: 0.8,
          textTransform: "uppercase",
        }}
      >
        {title}
      </span>
      {actionLabel && (
        <button
          type="button"
          onClick={onAction}
          style={{
            background: "none",
            border: "none",
            padding: 0,
            cursor: "pointer",
            fontSize: 12,
            fontWeight: 600,
            color: BLUE,
          }}
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}

function RecommendedRow({ onNavigate }: { onNavigate: (to: string) => void }) {
  return (
    <div
      onTouchStart={(e) => e.stopPropagation()}
      onTouchMove={(e) => e.stopPropagation()}
      onTouchEnd={(e) => e.stopPropagation()}
      style={{
        display: "flex",
        gap: 12,
        overflowX: "auto",
        scrollSnapType: "x mandatory",
        WebkitOverflowScrolling: "touch",
        paddingBottom: 4,
        marginLeft: -16,
        marginRight: -16,
        paddingLeft: 16,
        paddingRight: 16,
      }}
    >
      {/* Video card */}
      <div
        onClick={() => onNavigate("/dsm-live")}
        style={{
          flex: "0 0 auto",
          width: 230,
          scrollSnapAlign: "start",
          background: "#fff",
          borderRadius: CARD_RADIUS,
          border: `0.5px solid ${BORDER}`,
          overflow: "hidden",
          cursor: "pointer",
        }}
      >
        <div
          style={{
            height: 130,
            background: "linear-gradient(135deg, #0B2341, #1a3a6b)",
            position: "relative",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <span
            style={{
              position: "absolute",
              top: 8,
              left: 8,
              background: "#E53935",
              borderRadius: 4,
              padding: "2px 7px",
              fontSize: 9,
              fontWeight: 700,
              color: "#fff",
            }}
          >
            NEW
          </span>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: "50%",
              background: "rgba(255,255,255,0.18)",
              border: "2px solid rgba(255,255,255,0.35)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <IconPlayerPlay size={18} color="#fff" fill="#fff" stroke={1.5} style={{ marginLeft: 2 }} />
          </div>
          <span
            style={{
              position: "absolute",
              bottom: 8,
              right: 8,
              background: "rgba(0,0,0,0.55)",
              borderRadius: 4,
              padding: "2px 6px",
              fontSize: 10,
              fontWeight: 600,
              color: "#fff",
            }}
          >
            8:15
          </span>
        </div>
        <div style={{ padding: "10px 12px 12px" }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: NAVY, lineHeight: 1.3 }}>
            3 ways to improve pupil retention
          </div>
          <div style={{ fontSize: 11, color: TEXT_SECONDARY, marginTop: 4 }}>PRO TV · 8 min</div>
        </div>
      </div>

      {/* Continue learning card */}
      <div
        onClick={() => onNavigate("/learn")}
        style={{
          flex: "0 0 auto",
          width: 230,
          scrollSnapAlign: "start",
          background: "#fff",
          borderRadius: CARD_RADIUS,
          border: `0.5px solid ${BORDER}`,
          overflow: "hidden",
          cursor: "pointer",
        }}
      >
        <div style={{ background: NAVY, padding: 14 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.7)" }}>Continue learning</div>
          <div style={{ fontSize: 26, fontWeight: 800, color: "#fff", marginTop: 8, lineHeight: 1.1 }}>ADI</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#fff", lineHeight: 1.2 }}>Standards</div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginTop: 6,
            }}
          >
            <span style={{ fontSize: 13, color: "rgba(255,255,255,0.75)" }}>Module 3</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: "#fff" }}>72%</span>
          </div>
          <div
            style={{
              marginTop: 8,
              height: 6,
              borderRadius: 3,
              background: "rgba(255,255,255,0.18)",
              overflow: "hidden",
            }}
          >
            <div style={{ width: "72%", height: "100%", background: BLUE, borderRadius: 3 }} />
          </div>
        </div>
        <div style={{ padding: "10px 12px", fontSize: 12, color: TEXT_SECONDARY }}>PRO Learn</div>
      </div>
    </div>
  );
}

interface HubTile {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  route: string;
}

function HubGrid({ onNavigate }: { onNavigate: (to: string) => void }) {
  const tiles: HubTile[] = [
    {
      icon: <IconSchool size={26} color="#2C6FE0" stroke={1.8} />,
      title: "PRO Learn",
      subtitle: "Courses & CPD",
      route: "/learn",
    },
    {
      icon: <IconBrandYoutube size={26} color="#E53935" stroke={1.8} />,
      title: "PRO TV",
      subtitle: "Videos & tutorials",
      route: "/dsm-live",
    },
    {
      icon: <IconStar size={26} color="#7B61FF" stroke={1.8} />,
      title: "Showcase",
      subtitle: "Tips & inspiration",
      route: "/showcase",
    },
    {
      icon: <IconRadio size={26} color="#F97316" stroke={1.8} />,
      title: "PRO Radio",
      subtitle: "Listen on the go",
      route: "/radio",
    },
    {
      icon: <IconShoppingBag size={26} color="#16A34A" stroke={1.8} />,
      title: "PRO Shop",
      subtitle: "Products & deals",
      route: "/marketplace",
    },
    {
      icon: <IconFileText size={26} color="#18A999" stroke={1.8} />,
      title: "Resources",
      subtitle: "Downloads & tools",
      route: "/resources",
    },
  ];

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(3, 1fr)",
        gap: 10,
      }}
    >
      {tiles.map((tile) => (
        <button
          key={tile.title}
          type="button"
          onClick={() => onNavigate(tile.route)}
          style={{
            background: "#fff",
            border: `0.5px solid ${BORDER}`,
            borderRadius: CARD_RADIUS,
            padding: "16px 8px 14px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 8,
            cursor: "pointer",
            fontFamily: "Poppins, sans-serif",
          }}
        >
          {tile.icon}
          <span style={{ fontSize: 12, fontWeight: 700, color: NAVY, textAlign: "center" }}>{tile.title}</span>
          <span
            style={{
              fontSize: 10,
              color: TEXT_SECONDARY,
              textAlign: "center",
              lineHeight: 1.3,
            }}
          >
            {tile.subtitle}
          </span>
        </button>
      ))}
    </div>
  );
}

function WhatsNew({ onNavigate }: { onNavigate: (to: string) => void }) {
  const rows = [
    {
      icon: <IconPlayerPlay size={18} color="#fff" fill="#fff" stroke={1.5} />,
      bg: "#0B2341",
      title: "New video: Parallel parking",
      meta: "PRO TV · 6 min",
      route: "/dsm-live",
    },
    {
      icon: <IconStar size={18} color="#fff" stroke={1.8} />,
      bg: "#7B61FF",
      title: "5 new items in Showcase",
      meta: "Tips, ideas & real stories",
      route: "/showcase",
    },
    {
      icon: <IconBook size={18} color="#fff" stroke={1.8} />,
      bg: "#2C6FE0",
      title: "New course: Teaching manoeuvres",
      meta: "PRO Learn · 47 min",
      route: "/learn",
    },
  ];

  return (
    <div
      style={{
        background: "#fff",
        borderRadius: CARD_RADIUS,
        border: `0.5px solid ${BORDER}`,
        overflow: "hidden",
      }}
    >
      {rows.map((row, idx) => (
        <div
          key={row.title}
          onClick={() => onNavigate(row.route)}
          style={{
            padding: "10px 12px",
            display: "flex",
            alignItems: "center",
            gap: 12,
            cursor: "pointer",
            borderBottom: idx < rows.length - 1 ? `0.5px solid ${PAGE_BG}` : "none",
          }}
        >
          <div
            style={{
              width: 46,
              height: 40,
              borderRadius: 8,
              background: row.bg,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            {row.icon}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: NAVY, lineHeight: 1.3 }}>{row.title}</div>
            <div style={{ fontSize: 11, color: TEXT_SECONDARY, marginTop: 2 }}>{row.meta}</div>
          </div>
          <IconChevronRight size={18} color="#C4CCD6" stroke={2} />
        </div>
      ))}
    </div>
  );
}

export const Route = createFileRoute("/pro")({
  head: () => ({
    meta: [
      { title: "PRO — Every Driver Pro" },
      {
        name: "description",
        content: "Your professional hub: PRO Learn, PRO TV, Showcase, Radio, Shop and resources for instructors.",
      },
      { property: "og:title", content: "PRO — Every Driver Pro" },
      {
        property: "og:description",
        content: "Your professional hub: PRO Learn, PRO TV, Showcase, Radio, Shop and resources for instructors.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ProPage,
});

function ProPage() {
  const navigate = useNavigate();
  const go = (to: string) => navigate({ to: to as never });

  const openSearch = () => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("dsm-open-universal-search"));
    }
  };

  return (
    <PageLayout style={{ backgroundColor: PAGE_BG, ...POPPINS }}>
      {/* Header */}
      <div
        style={{
          paddingTop: "calc(env(safe-area-inset-top, 0px) + 52px)",
          paddingLeft: 16,
          paddingRight: 16,
          paddingBottom: 8,
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 30, fontWeight: 800, color: BLUE, lineHeight: 1.05 }}>PRO</div>
          <div style={{ fontSize: 13, color: TEXT_SECONDARY, marginTop: 4, lineHeight: 1.35 }}>
            Your professional hub
            <br />
            Learn. Grow. Succeed.
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 14, flexShrink: 0, paddingTop: 4 }}>
          <button
            type="button"
            aria-label="Search"
            onClick={openSearch}
            style={{ background: "none", border: "none", padding: 0, cursor: "pointer", display: "flex" }}
          >
            <IconSearch size={22} color={NAVY} stroke={2} />
          </button>
          <button
            type="button"
            aria-label="Notifications"
            onClick={() => go("/notifications")}
            style={{ background: "none", border: "none", padding: 0, cursor: "pointer", display: "flex" }}
          >
            <IconBell size={22} color={NAVY} stroke={2} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div
        style={{
          padding: 16,
          paddingTop: 12,
          display: "flex",
          flexDirection: "column",
          gap: 20,
          paddingBottom: "calc(90px + env(safe-area-inset-bottom, 0px))",
        }}
      >
        <div>
          <SectionHeader title="Recommended for you" actionLabel="See all" onAction={() => go("/learn")} />
          <RecommendedRow onNavigate={go} />
        </div>

        <div>
          <SectionHeader title="PRO Hub" />
          <HubGrid onNavigate={go} />
        </div>

        <div>
          <SectionHeader title="What's new" actionLabel="See all" onAction={() => go("/showcase")} />
          <WhatsNew onNavigate={go} />
        </div>
      </div>
    </PageLayout>
  );
}

export default ProPage;
