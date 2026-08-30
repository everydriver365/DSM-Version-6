import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  IconChevronLeft,
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
import { useProRadioContext } from "@/hooks/useProRadio";

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

  const artwork = radio.nowPlaying.artwork;
  const PlayIcon = radio.isPlaying ? IconPlayerPause : IconPlayerPlay;

  return (
    <div
      style={{
        ...POPPINS,
        minHeight: "100vh",
        background: "#DCE4F0",
        display: "flex",
        flexDirection: "column",
        paddingBottom: "max(env(safe-area-inset-bottom), 12px)",
      }}
    >
      {/* Header */}
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 30,
          background: "#0B2341",
          marginTop: "calc(-1 * env(safe-area-inset-top, 0px))",
          padding: "calc(env(safe-area-inset-top, 0px) + 12px) 16px 12px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <button
          type="button"
          aria-label="Go back"
          onClick={() => navigate({ to: "/home" as never })}
          style={{ background: "none", border: "none", padding: 0, cursor: "pointer", display: "flex" }}
        >
          <IconChevronLeft size={22} color="#FFFFFF" stroke={2} />
        </button>
        <span style={{ color: "#FFFFFF", fontSize: 15, fontWeight: 700 }}>
          PRO Radio
        </span>
        <div style={{ width: 22 }} />
      </div>

      {/* Now playing card */}
      <div
        style={{
          margin: 16,
          background: "#FFFFFF",
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
        <div style={{ padding: "14px 16px", borderBottom: "1px solid #F4F6F8" }}>
          <div
            style={{
              fontSize: 11,
              color: "#536579",
              textTransform: "uppercase",
              letterSpacing: "0.6px",
              marginBottom: 3,
            }}
          >
            Now playing
          </div>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#0B2341" }}>
            {radio.showName}
          </div>
          <div style={{ fontSize: 13, color: "#536579", marginTop: 2 }}>
            {radio.nowPlaying.title}
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
        <div
          role="button"
          tabIndex={0}
          onClick={() => radio.toggle()}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") radio.toggle();
          }}
          style={{
            background: "#0B2341",
            borderRadius: 14,
            padding: "14px 8px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 8,
            boxShadow: "0 4px 12px rgba(11,35,65,0.3)",
            cursor: "pointer",
          }}
        >
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 12,
              background: "#2C97DE",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <IconRadio size={22} color="#FFFFFF" stroke={1.8} />
          </div>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#FFFFFF" }}>
            PRO Live
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <LiveDot size={5} />
            <span style={{ fontSize: 9, color: "rgba(255,255,255,0.7)" }}>
              LIVE
            </span>
          </div>
        </div>

        {COMING_SOON_STATIONS.map(({ name, Icon, bg }) => (
          <div
            key={name}
            role="button"
            tabIndex={0}
            onClick={() => toast(`${name} coming soon!`)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ")
                toast(`${name} coming soon!`);
            }}
            style={{
              background: "#FFFFFF",
              borderRadius: 14,
              padding: "14px 8px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 8,
              border: "1px solid #E4E8EF",
              boxShadow: "0 2px 0 #E4E4E8",
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
            <div style={{ fontSize: 12, fontWeight: 600, color: "#0B2341" }}>
              {name}
            </div>
            <div style={{ fontSize: 9, color: "#536579" }}>COMING SOON</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default RadioPage;
