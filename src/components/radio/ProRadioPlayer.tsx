import { useState } from "react";
import {
  IconChevronUp,
  IconChevronDown,
  IconDots,
  IconHeart,
  IconPlayerPlay,
  IconPlayerPause,
  IconRadio,
  IconShare,
  IconMusic,
  IconVinyl,
  IconWaveSine,
  IconCar,
  IconMicrophone,
  IconTree,
} from "@tabler/icons-react";
import { toast } from "@/lib/toast";
import { BottomSheet } from "@/components/dsm/BottomSheetV2";
import { useProRadioContext } from "@/hooks/useProRadio";

const POPPINS = { fontFamily: "Poppins, sans-serif" } as const;
const ART_GRADIENT = "linear-gradient(135deg, #2C97DE 0%, #18A999 100%)";

const COMING_SOON_STATIONS = [
  { name: "PRO 80s", Icon: IconMusic, bg: "#18A999" },
  { name: "PRO 90s", Icon: IconMusic, bg: "#7B61FF" },
  { name: "PRO 00s", Icon: IconMusic, bg: "#2C97DE" },
  { name: "PRO 70s", Icon: IconVinyl, bg: "#F59E0B" },
  { name: "PRO 60s", Icon: IconVinyl, bg: "#536579" },
  { name: "PRO Chill", Icon: IconWaveSine, bg: "#18A999" },
  { name: "PRO Drive", Icon: IconCar, bg: "#2C97DE" },
  { name: "PRO Xmas", Icon: IconTree, bg: "#E53935", toastText: "PRO Xmas coming soon! 🎄" },
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

interface StationTileProps {
  name: string;
  Icon: React.ComponentType<{ size?: number; color?: string; stroke?: number }>;
  bg: string;
  isLive: boolean;
  isPlaying: boolean;
  isSelected: boolean;
  isFavorite: boolean;
  toastText?: string;
  onToggle: () => void;
  onToggleFavorite: () => void;
}

function StationTile({
  name,
  Icon,
  bg,
  isLive,
  isPlaying,
  isSelected,
  isFavorite,
  toastText,
  onToggle,
  onToggleFavorite,
}: StationTileProps) {
  const isDark = isLive;
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => {
        if (!isLive && toastText) toast(toastText);
        onToggle();
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          if (!isLive && toastText) toast(toastText);
          onToggle();
        }
      }}
      style={{
        position: "relative",
        background: isDark ? "#0B2341" : "#FFFFFF",
        borderRadius: 14,
        padding: "14px 8px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 8,
        border: isSelected
          ? `2px solid ${isDark ? "#2C97DE" : "#2C97DE"}`
          : isDark
            ? "none"
            : "1px solid #E4E8EF",
        boxShadow: isDark
          ? "0 4px 12px rgba(11,35,65,0.3)"
          : "0 2px 0 #E4E4E8",
        cursor: "pointer",
      }}
    >
      <button
        type="button"
        aria-label={isFavorite ? `Remove ${name} from favourites` : `Add ${name} to favourites`}
        onClick={(e) => {
          e.stopPropagation();
          onToggleFavorite();
        }}
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
          color={isFavorite ? "#E53935" : isDark ? "rgba(255,255,255,0.5)" : "#D1D5DB"}
          fill={isFavorite ? "#E53935" : "none"}
          stroke={2}
        />
      </button>
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
    </div>
  );
}

/**
 * Persistent PRO Radio player.
 * Renders nothing until playback has been started at least once, then keeps a
 * mini bar docked above the bottom nav. Tapping it opens the full-screen sheet.
 */
export function ProRadioPlayer() {
  const radio = useProRadioContext();
  const [expanded, setExpanded] = useState(false);

  if (!radio.hasStarted) return null;

  const artwork = radio.nowPlaying.artwork;
  const PlayIcon = radio.isPlaying ? IconPlayerPause : IconPlayerPlay;

  return (
    <>
      {/* ---------- MINI PLAYER ---------- */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => setExpanded(true)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") setExpanded(true);
        }}
        className="fixed left-1/2 -translate-x-1/2 w-full max-w-[430px]"
        style={{
          ...POPPINS,
          bottom: "calc(56px + max(env(safe-area-inset-bottom), 8px) + 8px)",
          zIndex: 49,
          background: "#072B47",
          padding: "10px 16px",
          display: "flex",
          alignItems: "center",
          gap: 12,
          borderTop: "1px solid rgba(255,255,255,0.1)",
          cursor: "pointer",
        }}
      >
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 8,
            background: artwork ? "#0B2341" : ART_GRADIENT,
            flexShrink: 0,
            overflow: "hidden",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {artwork ? (
            <img
              src={artwork}
              alt=""
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          ) : (
            <IconRadio size={18} color="#FFFFFF" stroke={1.8} />
          )}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              color: "#FFFFFF",
              fontSize: 13,
              fontWeight: 600,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {radio.showName}
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              color: "rgba(255,255,255,0.6)",
              fontSize: 11,
            }}
          >
            {radio.isLive ? (
              <>
                <LiveDot />
                {radio.isPlaying ? "LIVE" : "PAUSED"} · PRO Radio
              </>
            ) : (
              <>
                <span style={{ fontSize: 9 }}>COMING SOON</span>
                <span>· {radio.showName}</span>
              </>
            )}
          </div>
        </div>

        <button
          type="button"
          aria-label={radio.isPlaying ? "Pause PRO Radio" : "Play PRO Radio"}
          onClick={(e) => {
            e.stopPropagation();
            radio.toggle();
          }}
          style={{
            width: 36,
            height: 36,
            borderRadius: "50%",
            background: "rgba(255,255,255,0.15)",
            border: "none",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            flexShrink: 0,
          }}
        >
          <PlayIcon size={16} color="#FFFFFF" stroke={2} />
        </button>

        <IconChevronUp size={18} color="rgba(255,255,255,0.5)" stroke={2} />
      </div>

      {/* ---------- FULL PLAYER (DSM bottom sheet) ---------- */}
      {expanded && (
        <BottomSheet
          title="PRO Radio"
          subtitle={radio.showName}
          onClose={() => setExpanded(false)}
          footer={
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
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
          }
        >
          {/* Now playing card */}
          <div
            style={{
              background: "#FFFFFF",
              borderRadius: 16,
              border: "1px solid #E4E8EF",
              boxShadow: "0 4px 20px rgba(11,35,65,0.08)",
              overflow: "hidden",
              marginBottom: 16,
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
              {!artwork && (
                <IconRadio size={80} color="rgba(255,255,255,0.3)" stroke={1.5} />
              )}
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
                <span style={{ color: "#FFFFFF", fontSize: 10, fontWeight: 700 }}>
                  LIVE
                </span>
              </div>
            </div>

            {/* Track info */}
            <div style={{ padding: "14px 16px" }}>
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
                {radio.isLive ? (
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      color: "#E53935",
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    <LiveDot size={5} />
                    {radio.isPlaying ? "LIVE" : "PAUSED"}
                  </span>
                ) : (
                  <span style={{ fontSize: 10, fontWeight: 700, color: "#536579" }}>
                    COMING SOON
                  </span>
                )}
              </div>
              <div style={{ fontSize: 16, fontWeight: 700, color: "#0B2341" }}>
                {radio.showName}
              </div>
              <div style={{ fontSize: 13, color: "#536579", marginTop: 2 }}>
                {radio.isLive
                  ? radio.nowPlaying.artist
                    ? `${radio.nowPlaying.title} · ${radio.nowPlaying.artist}`
                    : radio.nowPlaying.title
                  : "This station will be available soon"}
              </div>
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
              paddingBottom: 10,
            }}
          >
            All stations
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 10,
              paddingBottom: 8,
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
              isFavorite={radio.favorites.includes("PRO Live")}
              onToggle={() => radio.toggle()}
              onToggleFavorite={() => radio.toggleFavorite("PRO Live")}
            />

            {[...COMING_SOON_STATIONS]
              .sort((a, b) => {
                const aFav = radio.favorites.includes(a.name);
                const bFav = radio.favorites.includes(b.name);
                if (aFav === bFav) return 0;
                return aFav ? -1 : 1;
              })
              .map(({ name, Icon, bg, toastText }) => (
                <StationTile
                  key={name}
                  name={name}
                  Icon={Icon}
                  bg={bg}
                  isLive={false}
                  isPlaying={false}
                  isSelected={radio.selectedStation === name}
                  isFavorite={radio.favorites.includes(name)}
                  toastText={toastText}
                  onToggle={() => radio.selectStation(name)}
                  onToggleFavorite={() => radio.toggleFavorite(name)}
                />
              ))}
          </div>
        </BottomSheet>
      )}

    </>
  );
}

export default ProRadioPlayer;
