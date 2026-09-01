import { createFileRoute, useNavigate } from "@tanstack/react-router";
import * as React from "react";
import {
  IconChevronLeft,
  IconHeart,
  IconPlayerPlay,
  IconPlayerPause,
  IconRadio,
  IconShare,
  IconPlayerSkipBack,
  IconPlayerSkipForward,
} from "@tabler/icons-react";
import { toast } from "@/lib/toast";
import { useProRadioContext } from "@/hooks/useProRadio";

const POPPINS = { fontFamily: "Poppins, sans-serif" } as const;

interface StationDef {
  name: string;
  isLive: boolean;
  /** Optional direct stream URL — when absent the hook's default play() is used. */
  stream?: string;
  toastText?: string;
}

/** All stations shown on the PRO Radio page, sourced from the existing product data. */
const STATIONS: StationDef[] = [
  { name: "PRO Live", isLive: true },
  { name: "PRO 80s", isLive: false },
  { name: "PRO 90s", isLive: false },
  { name: "PRO 00s", isLive: false },
  { name: "PRO 70s", isLive: false },
  { name: "PRO 60s", isLive: false },
  { name: "PRO Chill", isLive: false },
  { name: "PRO Drive", isLive: false },
  { name: "PRO Xmas", isLive: false, toastText: "PRO Xmas coming soon! 🎄" },
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

function LiveBadge({ size = 6 }: { size?: number }) {
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        background: "#E53935",
        color: "#fff",
        fontSize: 10,
        fontWeight: 700,
        borderRadius: 4,
        padding: "2px 8px",
      }}
    >
      <LiveDot size={size} />
      <span>LIVE</span>
    </div>
  );
}

interface StationTileProps {
  station: StationDef;
  isPlaying: boolean;
  isFavorite: boolean;
  onToggle: () => void;
  onToggleFavorite: (e: React.MouseEvent) => void;
}

function StationTile({
  station,
  isPlaying,
  isFavorite,
  onToggle,
  onToggleFavorite,
}: StationTileProps) {
  const isLive = station.isLive;
  const isActive = isLive;

  const tileStyles: React.CSSProperties = isActive
    ? {
        background: "#0B2341",
        borderRadius: 14,
        padding: "14px 8px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 8,
        cursor: "pointer",
        position: "relative",
      }
    : {
        background: "#FFFFFF",
        borderRadius: 14,
        border: "0.5px solid #E4E8EF",
        boxShadow: "0 2px 8px rgba(11,35,65,0.06)",
        padding: "14px 8px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 8,
        cursor: "pointer",
        opacity: 0.6,
        position: "relative",
      };

  const iconBoxStyles: React.CSSProperties = isActive
    ? {
        width: 44,
        height: 44,
        borderRadius: 10,
        background: "rgba(255,255,255,0.15)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }
    : {
        width: 44,
        height: 44,
        borderRadius: 10,
        background: "#F4F6F8",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      };

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={station.name}
      onClick={onToggle}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onToggle();
      }}
      style={tileStyles}
    >
      <button
        type="button"
        aria-label={
          isFavorite
            ? `Remove ${station.name} from favourites`
            : `Add ${station.name} to favourites`
        }
        onClick={onToggleFavorite}
        style={{
          position: "absolute",
          top: 6,
          right: 6,
          background: "transparent",
          border: "none",
          padding: 4,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <IconHeart
          size={14}
          color={
            isFavorite
              ? "#E53935"
              : isActive
                ? "rgba(255,255,255,0.5)"
                : "#D1D5DB"
          }
          fill={isFavorite ? "#E53935" : "none"}
          stroke={2}
        />
      </button>

      <div style={iconBoxStyles}>
        <IconRadio
          size={22}
          color={isActive ? "#2C97DE" : "#536579"}
          stroke={1.8}
        />
      </div>

      <div
        style={{
          fontSize: 11,
          fontWeight: 700,
          color: isActive ? "#FFFFFF" : "#0B2341",
          textAlign: "center",
          lineHeight: 1.2,
          minHeight: 26,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {station.name}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
        {isActive ? (
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 3,
              background: "#E53935",
              color: "#fff",
              fontSize: 8,
              fontWeight: 700,
              borderRadius: 10,
              padding: "2px 7px",
            }}
          >
            <LiveDot size={4} />
            <span>{isPlaying ? "LIVE" : "PAUSED"}</span>
          </div>
        ) : (
          <span
            style={{
              fontSize: 8,
              fontWeight: 600,
              color: "#536579",
              borderRadius: 10,
              padding: "2px 7px",
            }}
          >
            SOON
          </span>
        )}
      </div>
    </div>
  );
}

function HeroCard() {
  const radio = useProRadioContext();
  const PlayIcon = radio.isPlaying ? IconPlayerPause : IconPlayerPlay;
  const currentStationName = radio.selectedStation ?? "PRO Radio";
  const isCurrentFavorite = radio.favorites.includes(currentStationName);

  return (
    <div
      style={{
        margin: 16,
        background: "#FFFFFF",
        borderRadius: 16,
        overflow: "hidden",
        boxShadow: "0 8px 32px rgba(11,35,65,0.15)",
      }}
    >
      {/* Top navy gradient panel */}
      <div
        style={{
          position: "relative",
          padding: "20px 20px 24px",
          background: "linear-gradient(135deg, #0B2341 0%, #1a3a6b 100%)",
        }}
      >
        {/* Top row: live badge + heart */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 16,
          }}
        >
          {radio.isPlaying ? <LiveBadge /> : <div />}
          <button
            type="button"
            aria-label={
              isCurrentFavorite
                ? "Remove from favourites"
                : "Add to favourites"
            }
            onClick={() => radio.toggleFavorite(currentStationName)}
            style={{
              background: "transparent",
              border: "none",
              padding: 0,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <IconHeart
              size={20}
              color={isCurrentFavorite ? "#E53935" : "rgba(255,255,255,0.5)"}
              fill={isCurrentFavorite ? "#E53935" : "none"}
              stroke={2}
            />
          </button>
        </div>

        {/* Station artwork / icon */}
        <div
          style={{
            width: 72,
            height: 72,
            borderRadius: 16,
            background: "rgba(255,255,255,0.1)",
            border: "1.5px solid rgba(255,255,255,0.15)",
            margin: "16px auto",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
          }}
        >
          {radio.nowPlaying.artwork ? (
            <img
              src={radio.nowPlaying.artwork}
              alt=""
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          ) : (
            <IconRadio size={36} color="#2C97DE" stroke={1.5} />
          )}
        </div>

        {/* Station name */}
        <div
          style={{
            fontSize: 20,
            fontWeight: 700,
            color: "#FFFFFF",
            textAlign: "center",
            marginBottom: 4,
          }}
        >
          {currentStationName}
        </div>

        {/* Now playing info */}
        <div
          style={{
            fontSize: 14,
            color: "rgba(255,255,255,0.6)",
            textAlign: "center",
            marginBottom: 4,
            lineHeight: 1.35,
          }}
        >
          {radio.nowPlaying.artist
            ? `${radio.nowPlaying.title} · ${radio.nowPlaying.artist}`
            : radio.nowPlaying.title}
        </div>

        {/* Show / track name */}
        <div
          style={{
            fontSize: 12,
            color: "rgba(255,255,255,0.4)",
            textAlign: "center",
          }}
        >
          {radio.showName}
        </div>
      </div>

      {/* Controls */}
      <div
        style={{
          padding: "16px 24px 20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "#FFFFFF",
        }}
      >
        <IconPlayerSkipBack size={28} color="#D1D5DB" stroke={2} />
        <button
          type="button"
          aria-label={radio.isPlaying ? "Pause PRO Radio" : "Play PRO Radio"}
          onClick={() => radio.toggle()}
          style={{
            width: 60,
            height: 60,
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
          <PlayIcon size={28} color="#FFFFFF" stroke={2} />
        </button>
        <IconPlayerSkipForward size={28} color="#D1D5DB" stroke={2} />
      </div>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: 13,
        fontWeight: 700,
        color: "#0B2341",
        textTransform: "uppercase",
        letterSpacing: "0.6px",
        padding: "16px 16px 10px",
      }}
    >
      {children}
    </div>
  );
}

export const Route = createFileRoute("/radio")({
  head: () => ({
    meta: [
      { title: "PRO Radio — EDP" },
      { name: "description", content: "Listen to PRO Radio and discover upcoming stations." },
    ],
  }),
  component: RadioPage,
});

function RadioPage() {
  const navigate = useNavigate();
  const radio = useProRadioContext();

  const sortedStations = React.useMemo(() => {
    return [...STATIONS].sort((a, b) => {
      const aFav = radio.favorites.includes(a.name);
      const bFav = radio.favorites.includes(b.name);
      if (aFav === bFav) return 0;
      return aFav ? -1 : 1;
    });
  }, [radio.favorites]);

  const handleStationToggle = (station: StationDef) => {
    if (!station.isLive) {
      toast(station.toastText ?? `${station.name} coming soon!`);
      return;
    }
    if (station.stream) {
      radio.setStation({ name: station.name, stream: station.stream });
    } else {
      radio.play();
    }
  };

  const handleShare = async () => {
    const shareData = {
      title: "PRO Radio",
      text: `Listen to ${radio.showName} on PRO Radio`,
      url: window.location.href,
    };
    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch {
        // user cancelled
      }
    }
  };

  return (
    <div
      style={{
        ...POPPINS,
        minHeight: "100vh",
        background: "#F4F6F8",
        display: "flex",
        flexDirection: "column",
        paddingBottom: "max(env(safe-area-inset-bottom), 16px)",
      }}
    >
      {/* Header */}
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 30,
          background: "#0B2341",
          paddingTop: "env(safe-area-inset-top, 0px)",
          paddingBottom: 12,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          paddingLeft: 16,
          paddingRight: 16,
        }}
      >
        <button
          type="button"
          aria-label="Go back"
          onClick={() => navigate({ to: "/home" as never })}
          style={{
            background: "none",
            border: "none",
            padding: 0,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 32,
            height: 32,
          }}
        >
          <IconChevronLeft size={22} color="#FFFFFF" stroke={2} />
        </button>
        <span
          style={{
            color: "#FFFFFF",
            fontSize: 18,
            fontWeight: 700,
            letterSpacing: "0.2px",
          }}
        >
          PRO Radio
        </span>
        <button
          type="button"
          aria-label="Share PRO Radio"
          onClick={handleShare}
          style={{
            background: "none",
            border: "none",
            padding: 0,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 32,
            height: 32,
          }}
        >
          <IconShare size={20} color="rgba(255,255,255,0.5)" stroke={2} />
        </button>
      </div>

      {/* Page content */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        <HeroCard />

        <SectionLabel>All stations</SectionLabel>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 10,
            padding: "0 16px 20px",
          }}
        >
          {sortedStations.map((station) => (
            <StationTile
              key={station.name}
              station={station}
              isPlaying={radio.isPlaying}
              isFavorite={radio.favorites.includes(station.name)}
              onToggle={() => handleStationToggle(station)}
              onToggleFavorite={(e) => {
                e.stopPropagation();
                radio.toggleFavorite(station.name);
              }}
            />
          ))}
        </div>

        {/* Recently played — only shown when the hook provides history */}
        {radio.hasStarted && (
          <SectionLabel>Recently played</SectionLabel>
          // Horizontal scroll of recent stations would go here when data exists.
        )}
      </div>
    </div>
  );
}

export default RadioPage;
