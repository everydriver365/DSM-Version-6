import { useState } from "react";
import {
  IconChevronUp,
  IconChevronDown,
  IconDots,
  IconHeart,
  IconPlayerPlay,
  IconPlayerPause,
  IconRadio,
  IconArrowsShuffle,
  IconShare,
} from "@tabler/icons-react";
import { useProRadioContext } from "@/hooks/useProRadio";

const POPPINS = { fontFamily: "Poppins, sans-serif" } as const;
const ART_GRADIENT = "linear-gradient(135deg, #2C97DE 0%, #18A999 100%)";

const COMING_UP = [
  { time: "11:00", name: "PRO Driving News" },
  { time: "12:00", name: "The Motoring Podcast" },
  { time: "13:00", name: "PRO Lunch" },
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
            <LiveDot />
            LIVE · PRO Radio
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

      {/* ---------- FULL PLAYER ---------- */}
      {expanded && (
        <div
          className="fixed left-1/2 -translate-x-1/2 w-full max-w-[430px]"
          style={{
            ...POPPINS,
            top: 0,
            bottom: 0,
            zIndex: 100001,
            background: "#072B47",
            display: "flex",
            flexDirection: "column",
            overflowY: "auto",
            paddingTop: "max(env(safe-area-inset-top), 12px)",
            paddingBottom: "max(env(safe-area-inset-bottom), 12px)",
          }}
        >
          {/* Header */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "12px 16px",
            }}
          >
            <button
              type="button"
              aria-label="Close player"
              onClick={() => setExpanded(false)}
              style={{ background: "none", border: "none", padding: 0, cursor: "pointer", display: "flex" }}
            >
              <IconChevronDown size={22} color="rgba(255,255,255,0.5)" stroke={2} />
            </button>
            <span style={{ color: "#FFFFFF", fontSize: 13, fontWeight: 700 }}>
              PRO Radio
            </span>
            <IconDots size={22} color="rgba(255,255,255,0.5)" stroke={2} />
          </div>

          {/* Artwork */}
          <div
            style={{
              margin: "0 32px",
              aspectRatio: "1 / 1",
              borderRadius: 16,
              background: artwork ? "#0B2341" : ART_GRADIENT,
              boxShadow: "0 20px 60px rgba(0,0,0,0.4)",
              overflow: "hidden",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {artwork ? (
              <img
                src={artwork}
                alt={radio.showName}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            ) : (
              <IconRadio size={64} color="#FFFFFF" stroke={1.5} />
            )}
          </div>

          {/* Track info */}
          <div
            style={{
              padding: "24px 24px 8px",
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              gap: 12,
            }}
          >
            <div style={{ minWidth: 0 }}>
              <div style={{ color: "#FFFFFF", fontSize: 20, fontWeight: 700 }}>
                {radio.showName}
              </div>
              {radio.nowPlaying.artist && (
                <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 15 }}>
                  {radio.nowPlaying.artist}
                </div>
              )}
              {radio.isLive && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    marginTop: 6,
                    color: "#E53935",
                    fontSize: 12,
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: 0.4,
                  }}
                >
                  <LiveDot size={7} />
                  Live now
                </div>
              )}
            </div>
            <IconHeart size={22} color="rgba(255,255,255,0.4)" stroke={2} />
          </div>

          {/* Now playing card */}
          <div
            style={{
              margin: "0 24px",
              background: "rgba(255,255,255,0.08)",
              borderRadius: 10,
              padding: "10px 14px",
            }}
          >
            <div
              style={{
                color: "rgba(255,255,255,0.5)",
                fontSize: 10,
                textTransform: "uppercase",
                letterSpacing: 0.6,
              }}
            >
              Now playing
            </div>
            <div style={{ color: "#FFFFFF", fontSize: 13, fontWeight: 500 }}>
              {radio.nowPlaying.title}
            </div>
          </div>

          {/* Controls */}
          <div
            style={{
              padding: 24,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <IconArrowsShuffle size={22} color="rgba(255,255,255,0.4)" stroke={2} />
            <button
              type="button"
              aria-label={radio.isPlaying ? "Pause PRO Radio" : "Play PRO Radio"}
              onClick={() => radio.toggle()}
              style={{
                width: 64,
                height: 64,
                borderRadius: "50%",
                background: "#FFFFFF",
                border: "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
                cursor: "pointer",
              }}
            >
              <PlayIcon size={28} color="#072B47" stroke={2} />
            </button>
            <IconShare size={22} color="rgba(255,255,255,0.4)" stroke={2} />
          </div>

          {/* Coming up */}
          <div style={{ padding: "0 24px 24px" }}>
            <div
              style={{
                color: "rgba(255,255,255,0.4)",
                fontSize: 11,
                textTransform: "uppercase",
                letterSpacing: 0.6,
                marginBottom: 8,
              }}
            >
              Coming up
            </div>
            {COMING_UP.map((slot) => (
              <div
                key={slot.time}
                style={{ display: "flex", gap: 12, padding: "6px 0" }}
              >
                <span
                  style={{
                    color: "rgba(255,255,255,0.4)",
                    fontSize: 12,
                    minWidth: 40,
                  }}
                >
                  {slot.time}
                </span>
                <span style={{ color: "rgba(255,255,255,0.7)", fontSize: 13 }}>
                  {slot.name}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

export default ProRadioPlayer;
