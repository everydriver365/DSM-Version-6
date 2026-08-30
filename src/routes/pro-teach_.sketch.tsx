import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import * as React from "react";
import {
  IconArrowBackUp,
  IconArrowLeft,
  IconBucket,
  IconCheck,
  IconEraser,
  IconMaximize,
  IconMinimize,
  IconPencil,
  IconShare,
  IconTrash,
  IconX,
} from "@tabler/icons-react";
import { toast } from "sonner";

export const Route = createFileRoute("/pro-teach_/sketch")({
  head: () => ({
    meta: [
      { title: "Sketch Board — PRO Teach — Every Driver Pro" },
      {
        name: "description",
        content:
          "Sketch junctions, roundabouts and manoeuvre layouts on a blank board for driving lessons.",
      },
      { property: "og:title", content: "Sketch Board — PRO Teach" },
      {
        property: "og:description",
        content: "Sketch junctions and manoeuvres for driving lessons.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SketchBoardPage,
});

const NAVY = "#0B2341";
const BORDER = "#E4E8EF";
const MUTED = "#536579";
const COLOURS = ["#E53935", "#0B2341", "#2C97DE", "#18A999", "#F59E0B", "#7B61FF"];
const SIZES = [
  { dot: 8, width: 2 },
  { dot: 12, width: 4 },
  { dot: 18, width: 8 },
];

type Point = { x: number; y: number };
type Tool = "pen" | "fill" | "line";

function SketchBoardPage() {
  const navigate = useNavigate();
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const rootRef = React.useRef<HTMLDivElement | null>(null);
  const [shellHeight, setShellHeight] = React.useState<number | string>("100dvh");

  React.useEffect(() => {
    const fit = () => {
      const top = rootRef.current?.getBoundingClientRect().top ?? 0;
      setShellHeight(Math.max(320, window.innerHeight - top - 76));
    };
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);

  const drawingRef = React.useRef(false);
  const [tool, setTool] = React.useState<Tool>("pen");
  const [currentColor, setCurrentColor] = React.useState("#E53935");
  const [lineWidth, setLineWidth] = React.useState(3);
  const [isErasing, setIsErasing] = React.useState(false);
  const search = useSearch({ from: "/pro-teach_/sketch" as never }) as { template?: string };
  const [template, setTemplate] = React.useState<string | null>(search.template ?? null);

  const [confirmClear, setConfirmClear] = React.useState(false);
  const [isFullScreen, setIsFullScreen] = React.useState(false);
  const [lineStart, setLineStart] = React.useState<Point | null>(null);

  const [strokes, setStrokes] = React.useState<ImageData[]>([]);

  React.useEffect(() => {
    if (isFullScreen) {
      document.body.classList.add("pro-teach-fullscreen");
    } else {
      document.body.classList.remove("pro-teach-fullscreen");
    }
    return () => document.body.classList.remove("pro-teach-fullscreen");
  }, [isFullScreen]);

  const repaint = React.useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (template) drawTemplate(ctx, template, canvas.width, canvas.height);
  }, [template]);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const observer = new ResizeObserver(() => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      repaint();
    });
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [repaint]);

  const getPos = (
    e: React.TouchEvent<HTMLCanvasElement>
      | React.MouseEvent<HTMLCanvasElement>
      | TouchEvent
      | MouseEvent,
  ): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    let clientX: number;
    let clientY: number;
    if ("touches" in e && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else if ("changedTouches" in e && e.changedTouches.length > 0) {
      clientX = e.changedTouches[0].clientX;
      clientY = e.changedTouches[0].clientY;
    } else {
      clientX = (e as MouseEvent).clientX;
      clientY = (e as MouseEvent).clientY;
    }
    return {
      x: (clientX - rect.left) * dpr,
      y: (clientY - rect.top) * dpr,
    };
  };

  const draw = (x: number, y: number, newStroke: boolean) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const colour = isErasing ? "rgba(0,0,0,1)" : currentColor;
    const width = isErasing ? 20 : lineWidth;
    ctx.globalCompositeOperation = isErasing ? "destination-out" : "source-over";
    if (newStroke) {
      ctx.beginPath();
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
      ctx.strokeStyle = colour;
      ctx.lineWidth = width;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.stroke();
    }
    ctx.globalCompositeOperation = "source-over";
  };

  const pushUndoSnapshot = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const snapshot = ctx.getImageData(0, 0, canvas.width, canvas.height);
    setStrokes((prev) => [...prev, snapshot]);
  };

  const start = (e: React.TouchEvent<HTMLCanvasElement> | React.MouseEvent<HTMLCanvasElement>) => {
    const { x, y } = getPos(e);
    if (tool === "fill") {
      floodFill(Math.round(x), Math.round(y));
      return;
    }
    if (tool === "line") {
      if (!lineStart) {
        setLineStart({ x, y });
      } else {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext("2d");
        if (!canvas || !ctx) return;
        ctx.beginPath();
        ctx.moveTo(lineStart.x, lineStart.y);
        ctx.lineTo(x, y);
        ctx.strokeStyle = currentColor;
        ctx.lineWidth = lineWidth;
        ctx.lineCap = "round";
        ctx.stroke();
        setLineStart(null);
        pushUndoSnapshot();
      }
      return;
    }
    drawingRef.current = true;
    draw(x, y, true);
  };

  const move = (e: React.TouchEvent<HTMLCanvasElement> | React.MouseEvent<HTMLCanvasElement>) => {
    if (tool !== "pen" || !drawingRef.current) return;
    const { x, y } = getPos(e);
    draw(x, y, false);
  };

  const end = () => {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    pushUndoSnapshot();
  };

  const undo = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    if (strokes.length === 0) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      return;
    }
    const prev = strokes[strokes.length - 2];
    if (prev) {
      ctx.putImageData(prev, 0, 0);
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    setStrokes((s) => s.slice(0, -1));
  };

  const clear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (canvas && ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    setStrokes([]);
    setConfirmClear(false);
  };

  const floodFill = (startX: number, startY: number) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;

    const hexToRgb = (hex: string) => ({
      r: parseInt(hex.slice(1, 3), 16),
      g: parseInt(hex.slice(3, 5), 16),
      b: parseInt(hex.slice(5, 7), 16),
    });
    const fill = hexToRgb(currentColor);

    const startIdx = (startY * width + startX) * 4;
    const startR = data[startIdx];
    const startG = data[startIdx + 1];
    const startB = data[startIdx + 2];
    const startA = data[startIdx + 3];

    if (
      startR === fill.r &&
      startG === fill.g &&
      startB === fill.b &&
      startA === 255
    ) {
      return;
    }

    const match = (idx: number) =>
      data[idx] === startR &&
      data[idx + 1] === startG &&
      data[idx + 2] === startB &&
      data[idx + 3] === startA;

    const set = (idx: number) => {
      data[idx] = fill.r;
      data[idx + 1] = fill.g;
      data[idx + 2] = fill.b;
      data[idx + 3] = 255;
    };

    const stack: [number, number][] = [[startX, startY]];
    while (stack.length) {
      const [x, y] = stack.pop()!;
      if (x < 0 || x >= width || y < 0 || y >= height) continue;
      const idx = (y * width + x) * 4;
      if (!match(idx)) continue;
      set(idx);
      stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
    }

    ctx.putImageData(imageData, 0, 0);
    pushUndoSnapshot();
  };

  const shareSketch = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
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
      style={{
        height: isFullScreen ? "100dvh" : shellHeight,
        display: "flex",
        flexDirection: "column",
        background: "#fff",
        position: isFullScreen ? "fixed" : "relative",
        inset: isFullScreen ? 0 : undefined,
        zIndex: isFullScreen ? 50 : undefined,
      }}
    >
      <div style={{ background: NAVY, paddingTop: "calc(env(safe-area-inset-top, 0px) + 14px)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "0 16px 14px" }}>
          {isFullScreen ? (
            <button
              type="button"
              aria-label="Close full screen"
              style={iconBtn}
              onClick={() => setIsFullScreen(false)}
            >
              <IconX size={20} color="#fff" />
            </button>
          ) : (
            <button
              type="button"
              aria-label="Back"
              style={iconBtn}
              onClick={() => navigate({ to: "/pro-teach" as never })}
            >
              <IconArrowLeft size={18} color="#fff" />
            </button>
          )}
          <div style={{ flex: 1, color: "#fff", fontSize: 15, fontWeight: 700 }}>Sketch Board</div>
          <button
            type="button"
            aria-label={isFullScreen ? "Exit full screen" : "Enter full screen"}
            style={iconBtn}
            onClick={() => setIsFullScreen((v) => !v)}
          >
            {isFullScreen ? <IconMinimize size={20} color="#fff" /> : <IconMaximize size={20} color="#fff" />}
          </button>
          <button type="button" aria-label="Share" style={iconBtn} onClick={shareSketch}>
            <IconShare size={18} color="#fff" />
          </button>
          <button type="button" aria-label="Clear" style={iconBtn} onClick={() => setConfirmClear(true)}>
            <IconTrash size={18} color="#fff" />
          </button>
        </div>
      </div>

      <div
        style={{
          flex: 1,
          position: "relative",
          overflow: "hidden",
          background: "#F9FAFB",
        }}
      >
        <canvas
          ref={canvasRef}
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            touchAction: "none",
          }}
          onTouchStart={start}
          onTouchMove={move}
          onTouchEnd={end}
          onMouseDown={start}
          onMouseMove={move}
          onMouseUp={end}
          onMouseLeave={end}
        />

        {lineStart && (
          <div
            style={{
              position: "absolute",
              left: lineStart.x / (window.devicePixelRatio || 1) - 12,
              top: lineStart.y / (window.devicePixelRatio || 1) - 12,
              width: 24,
              height: 24,
              borderRadius: "50%",
              border: "2px solid #2C97DE",
              background: "rgba(44,151,222,0.2)",
              pointerEvents: "none",
            }}
          />
        )}
      </div>

      <div
        style={{
          background: "#F4F6F8",
          padding: "10px 16px calc(env(safe-area-inset-bottom, 0px) + 10px)",
          borderTop: `1px solid ${BORDER}`,
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
        {/* template pills */}
        <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4 }}>
          {TEMPLATE_PILLS.map((t) => {
            const active = template === t.key;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => setTemplate(active ? null : t.key)}
                style={{
                  flexShrink: 0,
                  padding: "6px 12px",
                  borderRadius: 20,
                  fontSize: 12,
                  fontWeight: active ? 700 : 600,
                  border: active ? "none" : `1px solid ${BORDER}`,
                  background: active ? NAVY : "#fff",
                  color: active ? "#fff" : NAVY,
                  cursor: "pointer",
                }}
              >
                {t.label}
              </button>
            );
          })}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
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

          <span style={{ width: 1, height: 24, background: BORDER }} />

          <button
            type="button"
            aria-label="Pen"
            onClick={() => {
              setTool("pen");
              setIsErasing(false);
              setLineStart(null);
            }}
            style={{
              ...toolBtn,
              borderColor: tool === "pen" && !isErasing ? "#2C97DE" : BORDER,
              background: tool === "pen" && !isErasing ? "#EAF5FC" : "#fff",
            }}
          >
            <IconPencil size={18} color={tool === "pen" && !isErasing ? "#2C97DE" : MUTED} />
          </button>
          <button
            type="button"
            aria-label="Flood fill"
            onClick={() => {
              setTool("fill");
              setIsErasing(false);
              setLineStart(null);
            }}
            style={{
              ...toolBtn,
              borderColor: tool === "fill" ? "#2C97DE" : BORDER,
              background: tool === "fill" ? "#EAF5FC" : "#fff",
            }}
          >
            <IconBucket size={18} color={tool === "fill" ? "#2C97DE" : MUTED} />
          </button>
          <button
            type="button"
            aria-label="Straight line"
            onClick={() => {
              setTool("line");
              setIsErasing(false);
              setLineStart(null);
            }}
            style={{
              ...toolBtn,
              borderColor: tool === "line" ? "#2C97DE" : BORDER,
              background: tool === "line" ? "#EAF5FC" : "#fff",
            }}
          >
            <IconCheck size={18} color={tool === "line" ? "#2C97DE" : MUTED} />
          </button>
          <button
            type="button"
            aria-label="Eraser"
            onClick={() => {
              setIsErasing((v) => !v);
              setTool("pen");
              setLineStart(null);
            }}
            style={{ ...toolBtn, borderColor: isErasing ? "#2C97DE" : BORDER }}
          >
            <IconEraser size={18} color={isErasing ? "#2C97DE" : MUTED} />
          </button>
          <button type="button" aria-label="Undo" onClick={undo} style={toolBtn}>
            <IconArrowBackUp size={18} color={MUTED} />
          </button>
        </div>
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
            <div style={{ fontSize: 15, fontWeight: 700, color: NAVY }}>Clear sketch?</div>
            <div style={{ fontSize: 13, color: MUTED, marginTop: 6 }}>This removes all ink from the board.</div>
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

const TEMPLATE_PILLS: { key: string; label: string }[] = [
  { key: "roundabout", label: "Roundabout" },
  { key: "t-junction", label: "T-junction" },
  { key: "crossroads", label: "Crossroads" },
  { key: "mini-roundabout", label: "Mini" },
  { key: "box-junction", label: "Box" },
  { key: "motorway-merge", label: "Motorway" },
  { key: "level-crossing", label: "Crossing" },
  { key: "one-way", label: "One-way" },
  { key: "parallel-park", label: "Parallel" },
  { key: "bay-park", label: "Bay park" },
];

function drawTemplate(
  ctx: CanvasRenderingContext2D,
  key: string,
  width: number,
  height: number,
) {
  ctx.save();
  ctx.strokeStyle = "#CBD5E1";
  ctx.lineWidth = 2;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  const cx = width / 2;
  const cy = height / 2;
  const r = Math.min(width, height) * 0.28;

  switch (key) {
    case "roundabout": {
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();
      // four approach roads
      ctx.beginPath();
      ctx.moveTo(cx, cy - r * 2.2);
      ctx.lineTo(cx, cy - r);
      ctx.moveTo(cx, cy + r);
      ctx.lineTo(cx, cy + r * 2.2);
      ctx.moveTo(cx - r * 2.2, cy);
      ctx.lineTo(cx - r, cy);
      ctx.moveTo(cx + r, cy);
      ctx.lineTo(cx + r * 2.2, cy);
      ctx.stroke();
      break;
    }
    case "t-junction": {
      ctx.beginPath();
      ctx.moveTo(cx, cy - r * 2.2);
      ctx.lineTo(cx, cy + r * 0.2);
      ctx.moveTo(cx - r * 1.8, cy + r * 0.2);
      ctx.lineTo(cx + r * 1.8, cy + r * 0.2);
      ctx.stroke();
      break;
    }
    case "crossroads": {
      ctx.beginPath();
      ctx.moveTo(cx, cy - r * 2.2);
      ctx.lineTo(cx, cy + r * 2.2);
      ctx.moveTo(cx - r * 2.2, cy);
      ctx.lineTo(cx + r * 2.2, cy);
      ctx.stroke();
      break;
    }
    case "mini-roundabout": {
      ctx.beginPath();
      ctx.arc(cx, cy, r * 0.5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx, cy - r * 2);
      ctx.lineTo(cx, cy - r * 0.5);
      ctx.moveTo(cx, cy + r * 0.5);
      ctx.lineTo(cx, cy + r * 2);
      ctx.moveTo(cx - r * 2, cy);
      ctx.lineTo(cx - r * 0.5, cy);
      ctx.moveTo(cx + r * 0.5, cy);
      ctx.lineTo(cx + r * 2, cy);
      ctx.stroke();
      break;
    }
    case "box-junction": {
      const size = r * 1.8;
      ctx.beginPath();
      ctx.rect(cx - size, cy - size, size * 2, size * 2);
      ctx.stroke();
      // cross-hatch
      ctx.beginPath();
      for (let i = -4; i <= 4; i++) {
        ctx.moveTo(cx - size, cy + (i * size) / 4);
        ctx.lineTo(cx + size, cy + (i * size) / 4);
      }
      ctx.stroke();
      break;
    }
    case "motorway-merge": {
      ctx.beginPath();
      // main carriageway
      ctx.moveTo(cx - r * 2.2, cy - r * 0.4);
      ctx.lineTo(cx + r * 2.2, cy - r * 0.4);
      ctx.moveTo(cx - r * 2.2, cy + r * 0.4);
      ctx.lineTo(cx + r * 2.2, cy + r * 0.4);
      // slip road merging from bottom
      ctx.moveTo(cx + r * 0.2, cy + r * 2.2);
      ctx.quadraticCurveTo(cx + r * 0.8, cy + r * 0.4, cx + r * 2.2, cy + r * 0.4);
      ctx.stroke();
      break;
    }
    case "level-crossing": {
      ctx.beginPath();
      ctx.moveTo(cx - r * 2.2, cy);
      ctx.lineTo(cx + r * 2.2, cy);
      ctx.stroke();
      // gate arms
      ctx.beginPath();
      ctx.moveTo(cx - r * 0.6, cy);
      ctx.lineTo(cx - r * 1.2, cy - r * 0.6);
      ctx.moveTo(cx + r * 0.6, cy);
      ctx.lineTo(cx + r * 1.2, cy - r * 0.6);
      ctx.stroke();
      break;
    }
    case "one-way": {
      ctx.beginPath();
      ctx.moveTo(cx - r * 2.2, cy - r * 0.4);
      ctx.lineTo(cx + r * 2.2, cy - r * 0.4);
      ctx.moveTo(cx - r * 2.2, cy + r * 0.4);
      ctx.lineTo(cx + r * 2.2, cy + r * 0.4);
      ctx.stroke();
      // arrows
      ctx.fillStyle = "#CBD5E1";
      for (let i = -1; i <= 1; i++) {
        drawArrowHead(ctx, cx + i * r, cy, 0);
      }
      break;
    }
    case "parallel-park": {
      ctx.beginPath();
      ctx.moveTo(cx - r * 1.8, cy - r * 0.4);
      ctx.lineTo(cx + r * 1.8, cy - r * 0.4);
      ctx.moveTo(cx - r * 1.8, cy + r * 0.4);
      ctx.lineTo(cx + r * 1.8, cy + r * 0.4);
      ctx.stroke();
      // reference car
      ctx.strokeRect(cx - r * 0.5, cy - r * 0.25, r * 0.9, r * 0.5);
      break;
    }
    case "bay-park": {
      ctx.beginPath();
      // bay lines
      for (let i = -2; i <= 2; i++) {
        ctx.moveTo(cx + i * r * 0.6, cy - r * 1.2);
        ctx.lineTo(cx + i * r * 0.6 + r * 0.4, cy + r * 1.2);
      }
      ctx.stroke();
      break;
    }
    default:
      break;
  }

  ctx.restore();
}

function drawArrowHead(ctx: CanvasRenderingContext2D, x: number, y: number, angle: number) {
  const size = 10;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.beginPath();
  ctx.moveTo(-size, -size / 2);
  ctx.lineTo(0, 0);
  ctx.lineTo(-size, size / 2);
  ctx.stroke();
  ctx.restore();
}
