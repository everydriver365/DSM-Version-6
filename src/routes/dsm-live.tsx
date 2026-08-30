import { createFileRoute, Outlet, useRouterState } from "@tanstack/react-router";
import { useState } from "react";
import { useGoBack } from "@/hooks/useGoBack";
import { useProRadioContext } from "@/hooks/useProRadio";
import { tokens } from "@/lib/tokens";
import { toast } from "@/lib/toast";
import {
  IconChevronLeft,
  IconRadio,
  IconPlayerPlay,
  IconPlayerPause,
  IconHeart,
  IconShare,
  IconMusic,
  IconVinyl,
  IconWaveSine,
  IconCar,
  IconMicrophone,
  IconSnowflake,
} from "@tabler/icons-react";

export type LiveSession = {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  host_name: string | null;
  session_date: string;
  session_time: string;
  duration_minutes: number | null;
  max_spaces: number;
  spaces_taken: number;
  price_amount: number | null;
  price_display: string | null;
  status: string | null;
  image_url: string | null;
  is_live: boolean | null;
};

export const CATEGORIES = [
  "All",
  "Standards Check",
  "Business Coaching",
  "CPD Webinar",
  "New ADI",
  "Q&A",
] as const;

export const CATEGORY_COLORS: Record<string, string> = {
  "Standards Check": "#1A52A0",
  "Business Coaching": "#16A34A",
  "CPD Webinar": "#7C3AED",
  "New ADI": "#B45309",
  "Q&A": "#0891B2",
};

export function categoryColor(c: string | null | undefined): string {
  return (c && CATEGORY_COLORS[c]) || "#0F2044";
}

export function formatSessionDate(dateStr: string): string {
  try {
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString("en-GB", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

export function formatSessionTime(timeStr: string): string {
  try {
    const [h, m] = timeStr.split(":");
    const d = new Date();
    d.setHours(Number(h), Number(m), 0, 0);
    return d.toLocaleTimeString("en-GB", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return timeStr;
  }
}

export function daysUntil(dateStr: string): number {
  const d = new Date(dateStr + "T00:00:00").getTime();
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.round((d - now.getTime()) / 86400000);
}

type TabKey = "radio" | "live";

const POPPINS = { fontFamily: "Poppins, sans-serif" } as const;

const COMING_SOON_STATIONS = [
  { name: "PRO 80s", Icon: IconMusic, bg: "#18A999" },
  { name: "PRO 90s", Icon: IconMusic, bg: "#7B61FF" },
  { name: "PRO 00s", Icon: IconMusic, bg: "#2C97DE" },
  { name: "PRO 70s", Icon: IconVinyl, bg: "#F59E0B" },
  { name: "PRO 60s", Icon: IconVinyl, bg: "#536579" },
  { name: "PRO Chill", Icon: IconWaveSine, bg: "#18A999" },
  { name: "PRO Drive", Icon: IconCar, bg: "#2C97DE" },
  { name: "PRO Talk", Icon: IconMicrophone, bg: "#7B61FF" },
  { name: "PRO Xmas", Icon: IconSnowflake, bg: "#E53935" },
];

function LiveDot({ size = 6 }: { size?: number }) {
  return (
    <span
      aria-hidden
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: "#E53935",
        display: "inline-block",
        flexShrink: 0,
      }}
    />
  );
}

function ProRadioTab() {
  const radio = useProRadioContext();
  const artwork = radio.nowPlaying.artwork;
  const PlayIcon = radio.isPlaying ? IconPlayerPause : IconPlayerPlay;

  return (
    <div style={{ ...POPPINS, paddingBottom: "calc(88px + env(safe-area-inset-bottom, 0px))" }}>
      {/* Now playing card */}
      <div
        style={{
          margin: 16,
          background: "#fff",
          borderRadius: 16,
          border: "1px solid #E4E8EF",
          boxShadow: "0 4px 20px rgba(11,35,65,0.08)",
          overflow: "hidden",
        }}
      >
        {/* Artwork */}
        <div
          style={{
            position: "relative",
            height: 160,
            background: artwork
              ? `url(${artwork}) center/cover no-repeat`
              : "linear-gradient(135deg, #0B2341 0%, #2C97DE 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {!artwork && <IconRadio size={80} color="rgba(255,255,255,0.3)" stroke={1.5} />}
          <div
            style={{
              position: "absolute",
              top: 12,
              left: 12,
              background: "rgba(229,57,53,0.9)",
              borderRadius: 20,
              padding: "4px 10px",
              display: "flex",
              alignItems: "center",
              gap: 5,
            }}
          >
            <LiveDot />
            <span style={{ color: "#FFFFFF", fontSize: 10, fontWeight: 700 }}>LIVE</span>
          </div>
        </div>

        {/* Track info */}
        <div style={{ padding: "14px 16px", borderBottom: "1px solid #F4F6F8" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 3,
            }}
          >
            <span
              style={{
                fontSize: 11,
                color: "#536579",
                textTransform: "uppercase",
                letterSpacing: "0.6px",
              }}
            >
              Now playing
            </span>
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: radio.isPlaying ? "#E53935" : "#536579",
                display: "flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              <LiveDot size={5} />
              {radio.isPlaying ? "LIVE" : "PAUSED"}
            </span>
          </div>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#0B2341" }}>{radio.showName}</div>
          <div style={{ fontSize: 13, color: "#536579", marginTop: 2 }}>
            {radio.nowPlaying.artist
              ? `${radio.nowPlaying.title} · ${radio.nowPlaying.artist}`
              : radio.nowPlaying.title}
          </div>
        </div>

        {/* Controls */}
        <div
          style={{
            padding: "14px 16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <IconHeart size={20} color="#D1D5DB" stroke={2} />
          <button
            type="button"
            aria-label={radio.isPlaying ? "Pause PRO Radio" : "Play PRO Radio"}
            onClick={() => radio.toggle()}
            style={{
              width: 56,
              height: 56,
              borderRadius: "50%",
              background: "#2C97DE",
              border: "none",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 4px 16px rgba(44,151,222,0.4)",
              cursor: "pointer",
            }}
          >
            <PlayIcon size={24} color="#FFFFFF" stroke={2} />
          </button>
          <IconShare size={20} color="#D1D5DB" stroke={2} />
        </div>
      </div>

      {/* Stations */}
      <div
        style={{
          fontSize: 11,
          fontWeight: 700,
          color: "#536579",
          textTransform: "uppercase",
          letterSpacing: "0.6px",
          padding: "4px 16px 10px",
        }}
      >
        All stations
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 10,
          padding: "0 16px 16px",
        }}
      >
        {/* PRO Live — active */}
        <StationTile
          name="PRO Live"
          Icon={IconRadio}
          bg="#2C97DE"
          isLive
          isPlaying={radio.isPlaying}
          isSelected={radio.selectedStation === "PRO Live"}
          onClick={() => radio.toggle()}
        />

        {COMING_SOON_STATIONS.map(({ name, Icon, bg }) => (
          <StationTile
            key={name}
            name={name}
            Icon={Icon}
            bg={bg}
            isLive={false}
            isPlaying={false}
            isSelected={radio.selectedStation === name}
            onClick={() => {
              toast(`${name} coming soon!`);
            }}
          />
        ))}
      </div>
    </div>
  );
}

interface StationTileProps {
  name: string;
  Icon: React.ComponentType<{ size?: number; color?: string; stroke?: number }>;
  bg: string;
  isLive: boolean;
  isPlaying: boolean;
  isSelected: boolean;
  onClick: () => void;
}

function StationTile({
  name,
  Icon,
  bg,
  isLive,
  isPlaying,
  isSelected,
  onClick,
}: StationTileProps) {
  const isDark = isLive;
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        position: "relative",
        background: isDark ? "#0B2341" : "#FFFFFF",
        borderRadius: 14,
        padding: "14px 8px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 8,
        border: isSelected ? "2px solid #2C97DE" : isDark ? "none" : "1px solid #E4E8EF",
        boxShadow: isDark ? "0 4px 12px rgba(11,35,65,0.3)" : "0 2px 0 #E4E4E8",
        cursor: "pointer",
      }}
    >
      <div
        style={{
          width: 48,
          height: 48,
          borderRadius: 12,
          background: bg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Icon size={22} color="#FFFFFF" stroke={1.8} />
      </div>
      <div
        style={{
          fontSize: 12,
          fontWeight: isDark ? 700 : 600,
          color: isDark ? "#FFFFFF" : "#0B2341",
        }}
      >
        {name}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
        {isLive ? (
          <>
            <LiveDot size={5} />
            <span style={{ fontSize: 9, color: "rgba(255,255,255,0.7)" }}>
              {isPlaying ? "LIVE" : "PAUSED"}
            </span>
          </>
        ) : (
          <span style={{ fontSize: 9, color: "#536579" }}>COMING SOON</span>
        )}
      </div>
    </button>
  );
}

export const Route = createFileRoute("/dsm-live")({
  component: DsmLiveLayout,
});

function DsmLiveLayout() {
  const [activeTab, setActiveTab] = useState<TabKey>("radio");
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const goBack = useGoBack();

  const isIndex = pathname === "/dsm-live" || pathname === "/dsm-live/";

  // Child routes (session detail, podcast detail, etc.) render full-screen with their own chrome.
  if (!isIndex) {
    return <Outlet />;
  }

  return (
    <div
      style={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        background: "#F4F6F8",
      }}
    >
      {/* Header */}
      <header
        style={{
          flexShrink: 0,
          background: "#0B2341",
          paddingTop: 10,
          paddingBottom: 10,
          paddingLeft: tokens.pagePadding,
          paddingRight: tokens.pagePadding,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",

          boxSizing: "border-box",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button
            type="button"
            aria-label="Go back"
            onClick={() => goBack("/home")}
            style={{
              width: 40,
              height: 40,
              borderRadius: "50%",
              border: 0,
              padding: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "rgba(255,255,255,0.1)",
              cursor: "pointer",
              flexShrink: 0,
            }}
          >
            <IconChevronLeft size={20} color="#FFFFFF" stroke={2} />
          </button>
          <h1
            style={{
              margin: 0,
              color: "#FFFFFF",
              fontFamily: "Sora, sans-serif",
              fontSize: tokens.fontSize.xl,
              lineHeight: "32px",

              fontWeight: tokens.fontWeight.bold,
            }}
          >
            PRO
          </h1>
        </div>
      </header>

      {/* Tabs */}
      <div
        style={{
          flexShrink: 0,
          padding: "12px 16px 0",
          background: "#F4F6F8",
          display: "flex",
          gap: 8,
        }}
      >
        <TabButton
          label="📻 PRO Radio"
          active={activeTab === "radio"}
          onClick={() => setActiveTab("radio")}
        />
        <TabButton
          label="🎥 PRO Live"
          active={activeTab === "live"}
          onClick={() => setActiveTab("live")}
        />
      </div>

      {/* Content */}
      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: "auto",
          overflowX: "hidden",
        }}
      >
        {activeTab === "radio" ? <ProRadioTab /> : <Outlet />}
      </div>
    </div>
  );
}

function TabButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        background: active ? "#0B2341" : "#FFFFFF",
        color: active ? "#FFFFFF" : "#536579",
        borderRadius: 20,
        padding: "8px 20px",
        fontSize: 13,
        fontWeight: active ? 700 : 600,
        border: active ? "none" : "1px solid #E4E8EF",
        cursor: "pointer",
        fontFamily: "Poppins, sans-serif",
      }}
    >
      {label}
    </button>
  );
}
