import { createFileRoute, useNavigate } from "@tanstack/react-router";
import * as React from "react";
import {
  IconArrowBackUp,
  IconArrowLeft,
  IconEraser,
  IconMinus,
  IconPencil,
  IconPlus,
  IconShare,
  IconTrash,
} from "@tabler/icons-react";
import { toast } from "sonner";

export const Route = createFileRoute("/pro-teach_/map")({
  head: () => ({
    meta: [
      { title: "Map Draw — PRO Teach — Every Driver Pro" },
      {
        name: "description",
        content:
          "Draw routes, junction approaches and manoeuvre lines directly on a live map of where you are teaching.",
      },
      { property: "og:title", content: "Map Draw — PRO Teach" },
      {
        property: "og:description",
        content: "Annotate a live map with routes and manoeuvre lines during driving lessons.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: MapDrawPage,
});

const NAVY = "#0B2341";
const BORDER = "#E4E8EF";
const MUTED = "#536579";
const COLOURS = ["#E53935", "#0B2341", "#2C97DE", "#18A999", "#F59E0B"];
const SIZES = [
  { dot: 8, width: 2 },
  { dot: 12, width: 4 },
  { dot: 18, width: 8 },
];

const GOOGLE_KEY = (import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY as string) ?? "";

type Point = { x: number; y: number };
type Stroke = { points: Point[]; colour: string; width: number };

function MapDrawPage() {
  const navigate = useNavigate();
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const wrapRef = React.useRef<HTMLDivElement | null>(null);
  const rootRef = React.useRef<HTMLDivElement | null>(null);
  const [shellHeight, setShellHeight] = React.useState<number | string>("100dvh");

  // fit between the app header and the bottom nav
  React.useEffect(() => {
    const fit = () => {
      const top = rootRef.current?.getBoundingClientRect().top ?? 0;
      setShellHeight(Math.max(320, window.innerHeight - top - 76));
    };
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);
  const strokesRef = React.useRef<Stroke[]>([]);
  const drawingRef = React.useRef(false);

  const [coords, setCoords] = React.useState<{ lat: number; lng: number } | null>(null);
  const [zoom, setZoom] = React.useState(16);
  const [mode, setMode] = React.useState<"draw" | "pan">("draw");
  const [currentColor, setCurrentColor] = React.useState("#E53935");
  const [lineWidth, setLineWidth] = React.useState(3);
  const [isErasing, setIsErasing] = React.useState(false);
  const [confirmClear, setConfirmClear] = React.useState(false);
  const [geoError, setGeoError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!("geolocation" in navigator)) {
      setGeoError("Location is not available on this device");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => setGeoError("Allow location access to load the map"),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }, []);

  const staticMapUrl = React.useMemo(() => {
    if (!coords || !GOOGLE_KEY) return null;
    const params = new URLSearchParams({
      center: `${coords.lat},${coords.lng}`,
      zoom: String(zoom),
      size: "390x500",
      scale: "2",
      key: GOOGLE_KEY,
    });
    return `https://maps.googleapis.com/maps/api/staticmap?${params.toString()}&style=feature:poi|visibility:off`;
  }, [coords, zoom]);

  const repaint = React.useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (const s of strokesRef.current) {
      ctx.beginPath();
      ctx.strokeStyle = s.colour;
      ctx.lineWidth = s.width;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      s.points.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
      ctx.stroke();
    }
  }, []);

  React.useEffect(() => {
    const resize = () => {
      const canvas = canvasRef.current;
      const wrap = wrapRef.current;
      if (!canvas || !wrap) return;
      canvas.width = wrap.clientWidth;
      canvas.height = wrap.clientHeight;
      repaint();
    };
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, [repaint]);

  const getPos = (e: React.TouchEvent | React.MouseEvent): Point => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const touch = "touches" in e && e.touches.length ? e.touches[0] : (e as React.MouseEvent);
    return { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
  };

  const draw = (x: number, y: number, newStroke: boolean) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const colour = isErasing ? "rgba(0,0,0,1)" : currentColor;
    const width = isErasing ? 20 : lineWidth;
    ctx.globalCompositeOperation = isErasing ? "destination-out" : "source-over";
    if (newStroke) {
      strokesRef.current.push({ points: [{ x, y }], colour, width });
      ctx.beginPath();
      ctx.moveTo(x, y);
    } else {
      const stroke = strokesRef.current[strokesRef.current.length - 1];
      if (stroke) stroke.points.push({ x, y });
      ctx.lineTo(x, y);
      ctx.strokeStyle = colour;
      ctx.lineWidth = width;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.stroke();
    }
    ctx.globalCompositeOperation = "source-over";
  };

  const start = (e: React.TouchEvent | React.MouseEvent) => {
    if (mode !== "draw") return;
    drawingRef.current = true;
    const { x, y } = getPos(e);
    draw(x, y, true);
  };
  const move = (e: React.TouchEvent | React.MouseEvent) => {
    if (mode !== "draw" || !drawingRef.current) return;
    const { x, y } = getPos(e);
    draw(x, y, false);
  };
  const end = () => {
    drawingRef.current = false;
  };

  const undo = () => {
    strokesRef.current.pop();
    repaint();
  };

  const clear = () => {
    strokesRef.current = [];
    repaint();
    setConfirmClear(false);
  };

  const shareMap = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const offscreen = document.createElement("canvas");
    offscreen.width = canvas.width;
    offscreen.height = canvas.height;
    const ctx = offscreen.getContext("2d");
    if (!ctx) return;

    if (staticMapUrl) {
      try {
        const img = new Image();
        img.crossOrigin = "anonymous";
        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = () => reject(new Error("map image"));
          img.src = staticMapUrl;
        });
        ctx.drawImage(img, 0, 0, offscreen.width, offscreen.height);
      } catch {
        ctx.fillStyle = "#e8f0e8";
        ctx.fillRect(0, 0, offscreen.width, offscreen.height);
      }
    } else {
      ctx.fillStyle = "#e8f0e8";
      ctx.fillRect(0, 0, offscreen.width, offscreen.height);
    }
    ctx.drawImage(canvas, 0, 0);

    offscreen.toBlob(async (blob) => {
      if (!blob) return;
      const file = new File([blob], "map-draw.png", { type: "image/png" });
      const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
      if (nav.share && nav.canShare?.({ files: [file] })) {
        try {
          await nav.share({ files: [file], title: "Map from PRO Teach" });
          return;
        } catch {
          /* cancelled */
        }
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "map-draw.png";
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Map downloaded");
    }, "image/png");
  };

  const iconBtn: React.CSSProperties = {
    width: 34,
    height: 34,
    borderRadius: 10,
    border: "none",
    background: "rgba(255,255,255,0.12)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
  };
  const toolBtn: React.CSSProperties = {
    width: 36,
    height: 36,
    borderRadius: 10,
    background: "#fff",
    border: `1px solid ${BORDER}`,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
  };
  const zoomBtn: React.CSSProperties = {
    width: 36,
    height: 36,
    borderRadius: 10,
    background: "rgba(255,255,255,0.92)",
    border: `1px solid ${BORDER}`,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
  };

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", background: "#fff" }}>
      {/* header */}
      <div style={{ background: NAVY, paddingTop: "calc(env(safe-area-inset-top, 0px) + 14px)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "0 16px 14px" }}>
          <button
            type="button"
            aria-label="Back"
            style={iconBtn}
            onClick={() => navigate({ to: "/pro-teach" as never })}
          >
            <IconArrowLeft size={18} color="#fff" />
          </button>
          <div style={{ flex: 1, color: "#fff", fontSize: 15, fontWeight: 700 }}>Map Draw</div>
          <button type="button" aria-label="Share" style={iconBtn} onClick={shareMap}>
            <IconShare size={18} color="#fff" />
          </button>
          <button type="button" aria-label="Clear" style={iconBtn} onClick={() => setConfirmClear(true)}>
            <IconTrash size={18} color="#fff" />
          </button>
        </div>
      </div>

      {/* map + canvas */}
      <div
        ref={wrapRef}
        style={{
          flex: 1,
          position: "relative",
          overflow: "hidden",
          background: staticMapUrl ? `url("${staticMapUrl}") center/cover no-repeat` : "#e8f0e8",
          touchAction: mode === "draw" ? "none" : "auto",
        }}
      >
        {!staticMapUrl && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: MUTED,
              fontSize: 13,
              padding: 24,
              textAlign: "center",
            }}
          >
            {geoError ?? (GOOGLE_KEY ? "Finding your location…" : "Map key unavailable — you can still draw")}
          </div>
        )}

        <canvas
          ref={canvasRef}
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            touchAction: mode === "draw" ? "none" : "auto",
            pointerEvents: mode === "draw" ? "auto" : "none",
          }}
          onTouchStart={start}
          onTouchMove={move}
          onTouchEnd={end}
          onMouseDown={start}
          onMouseMove={move}
          onMouseUp={end}
          onMouseLeave={end}
        />

        {/* mode toggle */}
        <button
          type="button"
          onClick={() => setMode((m) => (m === "draw" ? "pan" : "draw"))}
          style={{
            position: "absolute",
            top: 12,
            right: 12,
            background: "rgba(255,255,255,0.9)",
            borderRadius: 20,
            padding: "4px 12px",
            fontSize: 11,
            fontWeight: 600,
            border: `1px solid ${BORDER}`,
            color: NAVY,
            cursor: "pointer",
          }}
        >
          {mode === "draw" ? "Draw" : "Pan"}
        </button>

        {/* drawing indicator */}
        {mode === "draw" && (
          <div
            style={{
              position: "absolute",
              top: 12,
              left: 12,
              background: "rgba(11,35,65,0.8)",
              borderRadius: 20,
              padding: "4px 10px",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <IconPencil size={12} color="#fff" />
            <span style={{ color: "#fff", fontSize: 11, fontWeight: 700 }}>Drawing</span>
          </div>
        )}

        {/* zoom controls */}
        {mode === "pan" && (
          <div
            style={{
              position: "absolute",
              right: 12,
              bottom: 12,
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            <button
              type="button"
              aria-label="Zoom in"
              style={zoomBtn}
              onClick={() => setZoom((z) => Math.min(20, z + 1))}
            >
              <IconPlus size={18} color={NAVY} />
            </button>
            <button
              type="button"
              aria-label="Zoom out"
              style={zoomBtn}
              onClick={() => setZoom((z) => Math.max(10, z - 1))}
            >
              <IconMinus size={18} color={NAVY} />
            </button>
          </div>
        )}
      </div>

      {/* toolbar */}
      <div
        style={{
          background: "#F4F6F8",
          padding: "10px 16px calc(env(safe-area-inset-bottom, 0px) + 10px)",
          borderTop: `1px solid ${BORDER}`,
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        {SIZES.map((s) => (
          <button
            key={s.dot}
            type="button"
            aria-label={`Pen size ${s.width}`}
            onClick={() => {
              setLineWidth(s.width);
              setIsErasing(false);
            }}
            style={{
              width: s.dot + 8,
              height: s.dot + 8,
              borderRadius: "50%",
              background: "transparent",
              border: lineWidth === s.width && !isErasing ? "2px solid #2C97DE" : "2px solid transparent",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              padding: 0,
            }}
          >
            <span style={{ width: s.dot, height: s.dot, borderRadius: "50%", background: NAVY }} />
          </button>
        ))}

        <span style={{ width: 1, height: 24, background: BORDER }} />

        {COLOURS.map((c) => {
          const active = currentColor === c && !isErasing;
          return (
            <button
              key={c}
              type="button"
              aria-label={`Colour ${c}`}
              onClick={() => {
                setCurrentColor(c);
                setIsErasing(false);
              }}
              style={{
                width: 22,
                height: 22,
                borderRadius: "50%",
                background: c,
                border: active ? "2px solid #fff" : "2px solid transparent",
                boxShadow: active ? `0 0 0 2px ${c}` : "none",
                cursor: "pointer",
                padding: 0,
              }}
            />
          );
        })}

        <span style={{ flex: 1 }} />

        <button
          type="button"
          aria-label="Eraser"
          onClick={() => setIsErasing((v) => !v)}
          style={{ ...toolBtn, borderColor: isErasing ? "#2C97DE" : BORDER }}
        >
          <IconEraser size={18} color={isErasing ? "#2C97DE" : MUTED} />
        </button>
        <button type="button" aria-label="Undo" onClick={undo} style={toolBtn}>
          <IconArrowBackUp size={18} color={MUTED} />
        </button>
      </div>

      {confirmClear && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(11,35,65,0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
            zIndex: 60,
          }}
          onClick={() => setConfirmClear(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ background: "#fff", borderRadius: 16, padding: 20, width: "100%", maxWidth: 320 }}
          >
            <div style={{ fontSize: 15, fontWeight: 700, color: NAVY }}>Clear this drawing?</div>
            <div style={{ fontSize: 13, color: MUTED, marginTop: 6 }}>
              This removes everything drawn on the map.
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
              <button
                type="button"
                onClick={() => setConfirmClear(false)}
                style={{
                  flex: 1,
                  padding: "10px 0",
                  borderRadius: 10,
                  border: `1px solid ${BORDER}`,
                  background: "#fff",
                  color: NAVY,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={clear}
                style={{
                  flex: 1,
                  padding: "10px 0",
                  borderRadius: 10,
                  border: "none",
                  background: "#E53935",
                  color: "#fff",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Clear
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
