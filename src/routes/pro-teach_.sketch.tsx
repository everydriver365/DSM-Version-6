import { createFileRoute, useNavigate } from "@tanstack/react-router";
import * as React from "react";
import {
  IconArrowBackUp,
  IconArrowLeft,
  IconEraser,
  IconShare,
  IconTrash,
} from "@tabler/icons-react";
import { toast } from "sonner";

export const Route = createFileRoute("/pro-teach_/sketch")({
  validateSearch: (search: Record<string, unknown>) => ({
    template: typeof search.template === "string" ? search.template : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Sketch — PRO Teach — Every Driver Pro" },
      {
        name: "description",
        content:
          "Freehand sketch board for in-car briefings: draw roundabouts, junctions and manoeuvres with your pupil.",
      },
      { property: "og:title", content: "Sketch — PRO Teach" },
      {
        property: "og:description",
        content: "Freehand drawing board with manoeuvre templates for driving lesson briefings.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SketchPage,
});

const NAVY = "#0B2341";
const BORDER = "#E4E8EF";
const MUTED = "#536579";
const COLOURS = ["#0B2341", "#E53935", "#2C97DE", "#18A999", "#F59E0B"];
const SIZES = [
  { dot: 8, width: 2 },
  { dot: 12, width: 4 },
  { dot: 18, width: 8 },
];

export type TemplateKey =
  | "blank"
  | "roundabout"
  | "junction"
  | "bay"
  | "parallel"
  | "turnaround"
  | "dual";

const TEMPLATE_PILLS: { key: TemplateKey; label: string }[] = [
  { key: "roundabout", label: "Roundabout" },
  { key: "junction", label: "Junction" },
  { key: "bay", label: "Bay park" },
  { key: "parallel", label: "Parallel" },
  { key: "turnaround", label: "Turn around" },
  { key: "dual", label: "Dual carriageway" },
  { key: "blank", label: "Blank" },
];

type Point = { x: number; y: number };
type Stroke = { points: Point[]; colour: string; width: number };

/* ------------------------------------------------------------ templates */

export function drawTemplate(ctx: CanvasRenderingContext2D, key: TemplateKey, w: number, h: number) {
  if (key === "blank") return;
  const cx = w / 2;
  const cy = h / 2;
  ctx.save();
  ctx.strokeStyle = "#8FA3BA";
  ctx.fillStyle = "#EAF5FC";
  ctx.lineWidth = 2;
  ctx.lineCap = "round";

  const road = (x1: number, y1: number, x2: number, y2: number, width = 20) => {
    ctx.save();
    ctx.lineWidth = width;
    ctx.strokeStyle = "#D7E2EE";
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    ctx.restore();
  };

  if (key === "roundabout") {
    road(cx, cy - 140, cx, cy - 55);
    road(cx, cy + 55, cx, cy + 140);
    road(cx - 140, cy, cx - 55, cy);
    road(cx + 55, cy, cx + 140, cy);
    ctx.beginPath();
    ctx.arc(cx, cy, 60, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx, cy, 25, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  } else if (key === "junction") {
    road(0, cy, w, cy, 34);
    road(cx, cy, cx, h, 34);
    ctx.setLineDash([8, 6]);
    ctx.beginPath();
    ctx.moveTo(cx - 17, cy + 20);
    ctx.lineTo(cx + 17, cy + 20);
    ctx.stroke();
    ctx.setLineDash([]);
  } else if (key === "bay") {
    const bw = 60;
    const bh = 100;
    const startX = cx - bw * 1.5;
    const top = cy - bh / 2;
    for (let i = 0; i < 3; i += 1) {
      ctx.strokeRect(startX + i * bw, top, bw, bh);
    }
    ctx.beginPath();
    ctx.moveTo(cx, top + bh + 70);
    ctx.lineTo(cx, top + bh + 10);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx - 7, top + bh + 22);
    ctx.lineTo(cx, top + bh + 10);
    ctx.lineTo(cx + 7, top + bh + 22);
    ctx.stroke();
  } else if (key === "parallel") {
    road(0, cy + 70, w, cy + 70, 40);
    ctx.strokeRect(cx - 170, cy - 5, 100, 50);
    ctx.strokeRect(cx + 70, cy - 5, 100, 50);
    ctx.beginPath();
    ctx.moveTo(cx + 60, cy - 40);
    ctx.quadraticCurveTo(cx, cy - 40, cx - 20, cy + 20);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx - 28, cy + 6);
    ctx.lineTo(cx - 20, cy + 20);
    ctx.lineTo(cx - 6, cy + 14);
    ctx.stroke();
  } else if (key === "turnaround") {
    road(0, cy, w, cy, 90);
    ctx.strokeRect(40, cy - 20, 70, 40);
    ctx.beginPath();
    ctx.moveTo(120, cy - 5);
    ctx.lineTo(cx + 40, cy - 35);
    ctx.moveTo(cx + 40, cy - 30);
    ctx.lineTo(cx - 40, cy + 35);
    ctx.moveTo(cx - 40, cy + 32);
    ctx.lineTo(w - 60, cy);
    ctx.stroke();
  } else if (key === "dual") {
    road(0, cy - 70, w, cy - 70, 60);
    road(0, cy + 70, w, cy + 70, 60);
    ctx.fillStyle = "#DDEBD8";
    ctx.fillRect(0, cy - 18, w, 36);
    ctx.strokeStyle = "#8FA3BA";
    ctx.strokeRect(0, cy - 18, w, 36);
    ctx.setLineDash([16, 12]);
    ctx.beginPath();
    ctx.moveTo(0, cy - 70);
    ctx.lineTo(w, cy - 70);
    ctx.moveTo(0, cy + 70);
    ctx.lineTo(w, cy + 70);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  ctx.restore();
}

/* ------------------------------------------------------------ component */

function SketchPage() {
  const navigate = useNavigate();
  const { template } = Route.useSearch();
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

  const [currentColor, setCurrentColor] = React.useState("#0B2341");
  const [lineWidth, setLineWidth] = React.useState(3);
  const [isErasing, setIsErasing] = React.useState(false);
  const [activeTemplate, setActiveTemplate] = React.useState<TemplateKey>(
    (template as TemplateKey) ?? "blank",
  );
  const [confirmClear, setConfirmClear] = React.useState(false);

  const strokesRef = React.useRef<Stroke[]>([]);
  const drawingRef = React.useRef(false);

  const repaint = React.useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawTemplate(ctx, activeTemplate, canvas.width, canvas.height);
    for (const s of strokesRef.current) {
      ctx.beginPath();
      ctx.strokeStyle = s.colour;
      ctx.lineWidth = s.width;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      s.points.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
      ctx.stroke();
    }
  }, [activeTemplate]);

  // size canvas to its container
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

  React.useEffect(() => {
    repaint();
  }, [repaint]);

  const getPos = (e: React.TouchEvent | React.MouseEvent): Point => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const touch =
      "touches" in e && e.touches.length ? e.touches[0] : (e as React.MouseEvent);
    return { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
  };

  const draw = (x: number, y: number, newStroke: boolean) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const colour = isErasing ? "#ffffff" : currentColor;
    const width = isErasing ? 20 : lineWidth;
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
  };

  const start = (e: React.TouchEvent | React.MouseEvent) => {
    drawingRef.current = true;
    const { x, y } = getPos(e);
    draw(x, y, true);
  };
  const move = (e: React.TouchEvent | React.MouseEvent) => {
    if (!drawingRef.current) return;
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

  const share = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.toBlob(async (blob) => {
      if (!blob) return;
      const file = new File([blob], "sketch.png", { type: "image/png" });
      const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
      if (nav.share && nav.canShare?.({ files: [file] })) {
        try {
          await nav.share({ files: [file], title: "Sketch from PRO Teach" });
          return;
        } catch {
          /* cancelled */
        }
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "sketch.png";
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Sketch downloaded");
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

  return (
    <div
      ref={rootRef}
      style={{ height: shellHeight, display: "flex", flexDirection: "column", background: "#fff" }}
    >
      {/* header */}
      <div
        style={{
          background: NAVY,
          paddingTop: "calc(env(safe-area-inset-top, 0px) + 14px)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "0 16px 14px",
          }}
        >
          <button
            type="button"
            aria-label="Back"
            style={iconBtn}
            onClick={() => navigate({ to: "/pro-teach" as never })}
          >
            <IconArrowLeft size={18} color="#fff" />
          </button>
          <div style={{ flex: 1, color: "#fff", fontSize: 15, fontWeight: 700 }}>Sketch</div>
          <button type="button" aria-label="Share" style={iconBtn} onClick={share}>
            <IconShare size={18} color="#fff" />
          </button>
          <button
            type="button"
            aria-label="Clear"
            style={iconBtn}
            onClick={() => setConfirmClear(true)}
          >
            <IconTrash size={18} color="#fff" />
          </button>
        </div>
      </div>

      {/* canvas */}
      <div
        ref={wrapRef}
        style={{
          flex: 1,
          position: "relative",
          background:
            "radial-gradient(circle, #E4E8EF 1px, transparent 1px) #fff",
          backgroundSize: "20px 20px",
          touchAction: "none",
          overflow: "hidden",
        }}
      >
        <canvas
          ref={canvasRef}
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", touchAction: "none" }}
          onTouchStart={start}
          onTouchMove={move}
          onTouchEnd={end}
          onMouseDown={start}
          onMouseMove={move}
          onMouseUp={end}
          onMouseLeave={end}
        />
      </div>

      {/* templates row */}
      <div
        style={{
          display: "flex",
          gap: 8,
          overflowX: "auto",
          padding: "10px 16px",
          background: "#fff",
          borderTop: `1px solid ${BORDER}`,
        }}
      >
        {TEMPLATE_PILLS.map((t) => {
          const active = activeTemplate === t.key;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setActiveTemplate(t.key)}
              style={{
                background: active ? NAVY : "#EAF5FC",
                color: active ? "#fff" : "#2C97DE",
                borderRadius: 20,
                padding: "6px 12px",
                fontSize: 11,
                fontWeight: 600,
                border: "none",
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              {t.label}
            </button>
          );
        })}
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
            <div style={{ fontSize: 15, fontWeight: 700, color: NAVY }}>Clear this sketch?</div>
            <div style={{ fontSize: 13, color: MUTED, marginTop: 6 }}>
              This removes everything you have drawn.
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
