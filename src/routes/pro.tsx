import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  IconArrowLeft,
  IconBell,
  IconCamera,
  IconDeviceTv,
  IconGift,
  IconPlayerPlay,
  IconRadio,
  IconShoppingBag,
  IconShoppingCart,
  IconUsers,
} from "@tabler/icons-react";
import { PageLayout } from "@/components/PageLayout";

const POPPINS = { fontFamily: "Poppins, sans-serif" } as const;
const PAGE_BG = "#F4F6F8";
const NAVY = "#0B2341";
const BLUE = "#2C97DE";
const TEXT_SECONDARY = "#536579";
const BORDER = "#E4E8EF";

interface StationPillProps {
  label: string;
  active?: boolean;
  onClick: () => void;
}

function StationPill({ label, active, onClick }: StationPillProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        flexShrink: 0,
        borderRadius: 20,
        padding: "5px 14px",
        fontSize: 11,
        fontWeight: 600,
        border: active ? "none" : `0.5px solid ${BORDER}`,
        background: active ? NAVY : PAGE_BG,
        color: active ? "#fff" : TEXT_SECONDARY,
        cursor: "pointer",
      }}
    >
      {label}
    </button>
  );
}

function RadioSection({ onNavigate }: { onNavigate: (to: string) => void }) {
  return (
    <div
      style={{
        background: "#fff",
        borderRadius: 14,
        border: `0.5px solid ${BORDER}`,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          background: "linear-gradient(135deg, #0B2341, #1a3a6b)",
          padding: 16,
          display: "flex",
          alignItems: "center",
          gap: 14,
        }}
      >
        <div
          style={{
            width: 52,
            height: 52,
            borderRadius: 12,
            background: "rgba(44,151,222,0.2)",
            border: "1px solid rgba(44,151,222,0.3)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <IconRadio size={26} color={BLUE} stroke={1.8} />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: "#fff" }}>PRO Radio</span>
            <span
              style={{
                background: "#E53935",
                borderRadius: 4,
                padding: "1px 6px",
                fontSize: 9,
                color: "#fff",
                fontWeight: 700,
              }}
            >
              LIVE
            </span>
          </div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", marginTop: 2 }}>Groove Salad</div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginTop: 1 }}>Now playing...</div>
        </div>

        <button
          type="button"
          onClick={() => onNavigate("/radio")}
          style={{
            width: 44,
            height: 44,
            borderRadius: "50%",
            background: BLUE,
            border: "none",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            flexShrink: 0,
          }}
        >
          <IconPlayerPlay size={20} color="#fff" fill="#fff" stroke={1.5} />
        </button>
      </div>

      <div
        style={{
          padding: "10px 14px",
          display: "flex",
          gap: 6,
          overflowX: "auto",
        }}
      >
        {["PRO Live", "PRO 80s", "PRO 90s", "PRO Chill", "PRO Drive", "🎄 Xmas"].map((s, i) => (
          <StationPill key={s} label={s} active={i === 0} onClick={() => onNavigate("/radio")} />
        ))}
      </div>
    </div>
  );
}

function TVSection({ onNavigate }: { onNavigate: (to: string) => void }) {
  return (
    <div
      onClick={() => onNavigate("/dsm-live")}
      style={{
        background: "#fff",
        borderRadius: 14,
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
        <div
          style={{
            position: "absolute",
            top: 10,
            left: 12,
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <IconDeviceTv size={14} color="rgba(255,255,255,0.6)" stroke={1.8} />
          <span style={{ fontSize: 11, fontWeight: 500, color: "rgba(255,255,255,0.6)" }}>PRO TV</span>
        </div>

        <span
          style={{
            position: "absolute",
            top: 10,
            right: 12,
            background: BLUE,
            borderRadius: 4,
            padding: "2px 8px",
            fontSize: 9,
            color: "#fff",
            fontWeight: 700,
          }}
        >
          NEW
        </span>

        <button
          type="button"
          style={{
            width: 48,
            height: 48,
            borderRadius: "50%",
            background: "rgba(255,255,255,0.15)",
            border: "2px solid rgba(255,255,255,0.3)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
          }}
        >
          <IconPlayerPlay size={20} color="#fff" fill="#fff" stroke={1.5} style={{ marginLeft: 2 }} />
        </button>

        <span
          style={{
            position: "absolute",
            bottom: 10,
            right: 12,
            background: "rgba(0,0,0,0.5)",
            borderRadius: 4,
            padding: "2px 6px",
            fontSize: 10,
            color: "#fff",
            fontWeight: 500,
          }}
        >
          18 min
        </span>
      </div>

      <div
        style={{
          padding: "12px 14px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: NAVY }}>How to pass your standards check</div>
          <div style={{ fontSize: 11, color: TEXT_SECONDARY, marginTop: 2 }}>Training · 18 mins</div>
        </div>
        <span style={{ fontSize: 11, fontWeight: 500, color: BLUE, flexShrink: 0 }}>More →</span>
      </div>
    </div>
  );
}

function PerksSection({ onNavigate }: { onNavigate: (to: string) => void }) {
  return (
    <div
      style={{
        background: "#fff",
        borderRadius: 14,
        border: `0.5px solid ${BORDER}`,
        overflow: "hidden",
        cursor: "pointer",
      }}
    >
      <div
        style={{
          background: "linear-gradient(135deg, #4C1D95, #7B61FF)",
          padding: 16,
          display: "flex",
          alignItems: "center",
          gap: 14,
        }}
      >
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: 12,
            background: "rgba(255,255,255,0.15)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <IconGift size={24} color="#fff" stroke={1.8} />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              color: "rgba(255,255,255,0.5)",
              textTransform: "uppercase",
              letterSpacing: 0.6,
              marginBottom: 3,
            }}
          >
            PRO Perks · Featured
          </div>
          <div style={{ fontSize: 15, fontWeight: 700, color: "#fff" }}>AA Breakdown Cover</div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", marginTop: 2 }}>10% off for EDP members</div>
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onNavigate("/perks");
          }}
          style={{
            background: "rgba(255,255,255,0.2)",
            borderRadius: 8,
            padding: "8px 14px",
            fontSize: 12,
            color: "#fff",
            fontWeight: 700,
            border: "none",
            cursor: "pointer",
            flexShrink: 0,
          }}
        >
          Claim
        </button>
      </div>

      <div
        onClick={() => onNavigate("/perks")}
        style={{
          padding: "10px 14px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <span style={{ fontSize: 11, color: TEXT_SECONDARY }}>Fuel · Health · SIM · more</span>
        <span style={{ fontSize: 11, fontWeight: 500, color: BLUE }}>See all →</span>
      </div>
    </div>
  );
}

function CommunitySection({ onNavigate }: { onNavigate: (to: string) => void }) {
  const posts = [
    { initial: "D", bg: "#2C97DE", name: "Dave M", message: "Anyone covering Winchester this week?", time: "2m" },
    { initial: "S", bg: "#18A999", name: "Sarah T", message: "New DVSA phone guidance just dropped", time: "14m" },
  ];

  return (
    <div
      style={{
        background: "#fff",
        borderRadius: 14,
        border: `0.5px solid ${BORDER}`,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          padding: "12px 14px",
          borderBottom: `0.5px solid ${PAGE_BG}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <IconUsers size={18} color="#18A999" stroke={1.8} />
          <span style={{ fontSize: 14, fontWeight: 700, color: NAVY }}>Community</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span
            style={{
              background: "#E53935",
              borderRadius: 20,
              padding: "2px 8px",
              fontSize: 10,
              color: "#fff",
              fontWeight: 700,
            }}
          >
            3 new
          </span>
          <button
            type="button"
            onClick={() => onNavigate("/community")}
            style={{ background: "none", border: "none", padding: 0, cursor: "pointer" }}
          >
            <span style={{ fontSize: 11, fontWeight: 500, color: BLUE }}>See all →</span>
          </button>
        </div>
      </div>

      {posts.map((post, idx) => (
        <div
          key={idx}
          onClick={() => onNavigate("/community")}
          style={{
            padding: "12px 14px",
            display: "flex",
            alignItems: "center",
            gap: 10,
            borderBottom: idx < posts.length - 1 ? `0.5px solid ${PAGE_BG}` : "none",
            cursor: "pointer",
          }}
        >
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: "50%",
              background: post.bg,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 12,
              fontWeight: 700,
              color: "#fff",
              flexShrink: 0,
            }}
          >
            {post.initial}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: NAVY }}>{post.name}: </span>
            <span style={{ fontSize: 12, color: TEXT_SECONDARY }}>{post.message}</span>
          </div>
          <span style={{ fontSize: 10, color: "#D1D5DB", flexShrink: 0 }}>{post.time}</span>
        </div>
      ))}
    </div>
  );
}

function ShopSection({ onNavigate }: { onNavigate: (to: string) => void }) {
  return (
    <div
      style={{
        background: "#fff",
        borderRadius: 14,
        border: `0.5px solid ${BORDER}`,
        overflow: "hidden",
      }}
    >
      <div
        onClick={() => onNavigate("/marketplace")}
        style={{
          padding: "12px 14px",
          borderBottom: `0.5px solid ${PAGE_BG}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          cursor: "pointer",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <IconShoppingBag size={18} color="#F59E0B" stroke={1.8} />
          <span style={{ fontSize: 14, fontWeight: 700, color: NAVY }}>PRO Shop</span>
        </div>
        <span style={{ fontSize: 11, fontWeight: 500, color: BLUE }}>Browse all →</span>
      </div>

      <div
        onClick={() => onNavigate("/marketplace")}
        style={{
          padding: 14,
          display: "flex",
          alignItems: "center",
          gap: 14,
          cursor: "pointer",
        }}
      >
        <div
          style={{
            width: 60,
            height: 60,
            borderRadius: 10,
            background: PAGE_BG,
            border: `0.5px solid ${BORDER}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <IconCamera size={26} color={TEXT_SECONDARY} stroke={1.5} />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: NAVY, marginBottom: 3 }}>Garmin Dash Cam 67W</div>
          <div style={{ fontSize: 11, color: TEXT_SECONDARY, marginBottom: 5 }}>Wide angle · 1080p · voice</div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: "#16A34A" }}>£89.99</span>
            <span style={{ fontSize: 11, color: "#D1D5DB", textDecoration: "line-through" }}>£119.99</span>
            <span
              style={{
                background: "#DCFCE7",
                color: "#16A34A",
                fontSize: 10,
                fontWeight: 700,
                borderRadius: 4,
                padding: "1px 6px",
              }}
            >
              25% off
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onNavigate("/marketplace");
          }}
          style={{
            width: 36,
            height: 36,
            borderRadius: "50%",
            background: NAVY,
            border: "none",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            flexShrink: 0,
          }}
        >
          <IconShoppingCart size={16} color="#fff" stroke={1.8} />
        </button>
      </div>
    </div>
  );
}

export const Route = createFileRoute("/pro")({
  head: () => ({
    meta: [
      { title: "PRO — Every Driver Pro" },
      { name: "description", content: "Your professional hub for PRO Radio, TV, perks, community and shop." },
      { property: "og:title", content: "PRO — Every Driver Pro" },
      { property: "og:description", content: "Your professional hub for PRO Radio, TV, perks, community and shop." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ProPage,
});

function ProPage() {
  const navigate = useNavigate();
  const go = (to: string) => navigate({ to: to as never });

  return (
    <PageLayout style={{ backgroundColor: PAGE_BG, ...POPPINS }}>
      {/* Header */}
      <div
        style={{
          background: NAVY,
          paddingTop: "env(safe-area-inset-top, 0px)",
          paddingLeft: 16,
          paddingRight: 16,
          paddingBottom: 16,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <button
          type="button"
          aria-label="Go back"
          onClick={() => navigate({ from: "/pro", to: ".." })}
          style={{ background: "none", border: "none", padding: 0, cursor: "pointer", display: "flex" }}
        >
          <IconArrowLeft size={22} color="#fff" stroke={2} />
        </button>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <span
            style={{
              fontSize: 10,
              color: "rgba(255,255,255,0.4)",
              textTransform: "uppercase",
              letterSpacing: 1,
              fontWeight: 600,
            }}
          >
            Every Driver
          </span>
          <span style={{ fontSize: 20, color: "#fff", fontWeight: 700, lineHeight: 1.1 }}>PRO</span>
        </div>

        <div style={{ display: "flex" }}>
          <IconBell size={22} color="rgba(255,255,255,0.5)" stroke={1.8} />
        </div>
      </div>

      {/* Content */}
      <div
        style={{
          padding: 16,
          display: "flex",
          flexDirection: "column",
          gap: 12,
          paddingBottom: "max(env(safe-area-inset-bottom), 24px)",
        }}
      >
        <RadioSection onNavigate={go} />
        <TVSection onNavigate={go} />
        <PerksSection onNavigate={go} />
        <CommunitySection onNavigate={go} />
        <ShopSection onNavigate={go} />
      </div>
    </PageLayout>
  );
}

export default ProPage;
