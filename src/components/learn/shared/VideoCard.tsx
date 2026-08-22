import { IconDownload, IconCheck, IconMovie, IconPlayerPlay } from "@tabler/icons-react";

const NAVY = "#0B1F3A";

/**
 * Shared video card for DSM Learn (Learn / Bitesize / Showcase tabs).
 * Visual only — behaviour comes from onPlay / onDownload props.
 */
export default function VideoCard({
  thumbnail,
  title,
  duration,
  downloadable,
  downloaded,
  downloading,
  placeholderColor = NAVY,
  onPlay,
  onDownload,
}: {
  thumbnail?: string | null;
  title: string;
  duration?: string | null;
  downloadable?: boolean;
  downloaded?: boolean;
  downloading?: boolean;
  placeholderColor?: string;
  onPlay: () => void;
  onDownload?: (e: React.MouseEvent) => void;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onPlay}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onPlay();
      }}
      style={{
        background: "#FFFFFF",
        border: "0.5px solid #E5E5EA",
        borderRadius: 12,
        overflow: "hidden",
        cursor: "pointer",
        textAlign: "left",
        fontFamily: "Poppins, sans-serif",
      }}
    >
      <div
        style={{
          position: "relative",
          width: "100%",
          aspectRatio: "4 / 3",
          background: placeholderColor,
          ...(thumbnail
            ? {
                backgroundImage: `url(${thumbnail})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }
            : null),
        }}
      >
        {!thumbnail && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              opacity: 0.18,
            }}
          >
            <IconMovie size={48} color="#fff" stroke={1} />
          </div>
        )}

        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: "50%",
              background: "rgba(255,255,255,0.92)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <IconPlayerPlay
              size={14}
              color={NAVY}
              fill={NAVY}
              stroke={1.8}
              style={{ marginLeft: 1.5 }}
            />
          </div>
        </div>

        {duration ? (
          <div
            style={{
              position: "absolute",
              bottom: 6,
              right: 6,
              padding: "2px 6px",
              borderRadius: 4,
              background: "rgba(0,0,0,0.6)",
              color: "#FFFFFF",
              fontSize: 10,
              fontWeight: 500,
            }}
          >
            {duration}
          </div>
        ) : null}

        {downloadable && (
          <button
            type="button"
            onClick={onDownload}
            aria-label={downloaded ? "Available offline" : "Download for offline"}
            style={{
              position: "absolute",
              top: 6,
              right: 6,
              width: 24,
              height: 24,
              borderRadius: "50%",
              border: "none",
              padding: 0,
              background: downloaded ? "#1E8E3E" : "rgba(0,0,0,0.4)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: downloaded ? "default" : "pointer",
              opacity: downloading ? 0.6 : 1,
            }}
          >
            {downloaded ? (
              <IconCheck size={12} color="#FFFFFF" stroke={2.5} />
            ) : (
              <IconDownload size={12} color="#FFFFFF" stroke={1.8} />
            )}
          </button>
        )}
      </div>

      <div
        style={{
          padding: "10px 12px",
          fontSize: 13,
          fontWeight: 500,
          color: "#000000",
          letterSpacing: "-0.1px",
          lineHeight: 1.3,
        }}
      >
        {title}
      </div>
    </div>
  );
}
