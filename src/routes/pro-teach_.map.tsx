import { createFileRoute, useNavigate } from "@tanstack/react-router";
import * as React from "react";
import {
  IconArrowBackUp,
  IconArrowLeft,
  IconArrowUpRight,
  IconCheck,
  IconCurrentLocation,
  IconEraser,
  IconHeart,
  IconHeartFilled,
  IconMaximize,
  IconMessageShare,
  IconMicrophone,
  IconMinimize,
  IconMinus,
  IconPencil,
  IconPlus,
  IconRotate,
  IconRotateClockwise,
  IconRoute,
  IconRuler2,
  IconShare,
  IconTextSize,
  IconTrash,
  IconUser,
  IconX,
} from "@tabler/icons-react";
import { toast } from "sonner";
import { supabase } from "../lib/supabaseClient";
import {
  VEHICLE_TYPES,
  VEHICLE_LABEL,
  VehicleIcon,
  isVehicleType,
  vehicleDataUrl,
  type VehicleType,
} from "../components/icons/VehicleIcons";

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

type PlacedIcon = {
  id: string;
  x: number;
  y: number;
  category: "car" | "hazard";
  type: string;
  rotation: number;
};

const CAR_TYPES: string[] = VEHICLE_TYPES as unknown as string[];
const HAZARD_TYPES: string[] = ["pedestrian", "hazard", "traffic-lights", "stop-sign", "school", "roadworks"];
const ICON_EMOJI: Record<string, string> = {
  "car-blue": "🚗",
  "car-yellow": "🚕",
  "car-green": "🚙",
  "car-red": "🚐",
  pedestrian: "🚶",
  hazard: "⚠️",
  "traffic-lights": "🚦",
  "stop-sign": "🛑",
  school: "🚸",
  roadworks: "🚧",
};

type Tool = "draw" | "car" | "hazard" | "arrow" | "text" | "ruler";

/** GROUP I — DVSA test routes, keyed by rounded "lat,lng" area. Populated as
 *  local routes are contributed; the Static Maps URL accepts &path= overlays. */
const TEST_ROUTES: Record<
  string,
  { name: string; color: string; points: [number, number][] }[]
> = {};

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("read failed"));
    reader.readAsDataURL(blob);
  });
}

/** Isolated overlay layer: placing/dragging an icon only re-renders this. */
const IconOverlay = React.memo(function IconOverlay({
  icons,
  selectedId,
}: {
  icons: PlacedIcon[];
  selectedId: string | null;
}) {
  const selected = selectedId ? icons.find((i) => i.id === selectedId) : undefined;
  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none", contain: "layout paint" }}>
      {icons.map((icon) => (
        <div
          key={icon.id}
          id={`icon-${icon.id}`}
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            fontSize: 28,
            lineHeight: "30px",
            userSelect: "none",
            pointerEvents: "none",
            transform: `translate3d(${icon.x - 15}px, ${icon.y - 15}px, 0) rotate(${icon.rotation}deg)`,
            willChange: "transform",
            width: 30,
            height: 30,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {ICON_EMOJI[icon.type]}
        </div>
      ))}

      {selected && (
        <div
          id={`icon-ring-${selected.id}`}
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            transform: `translate3d(${selected.x - 25}px, ${selected.y - 25}px, 0)`,
            willChange: "transform",
            width: 50,
            height: 50,
            borderRadius: "50%",
            border: "2px solid #2C97DE",
            pointerEvents: "none",
            boxShadow: "0 0 0 4px rgba(44,151,222,0.2)",
          }}
        />
      )}

    </div>
  );
});



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

  const drawnStrokesRef = React.useRef<Stroke[]>([]);
  const drawingRef = React.useRef(false);

  const [coords, setCoords] = React.useState<{ lat: number; lng: number } | null>(null);
  const [zoom, setZoom] = React.useState(16);
  const [mapType, setMapType] = React.useState<"roadmap" | "satellite" | "hybrid">("hybrid");
  const [mode, setMode] = React.useState<"draw" | "pan">("draw");
  const [activeTool, setActiveTool] = React.useState<Tool>("draw");
  const [currentColor, setCurrentColor] = React.useState("#E53935");
  const [lineWidth, setLineWidth] = React.useState(3);
  const [isErasing, setIsErasing] = React.useState(false);
  const [confirmClear, setConfirmClear] = React.useState(false);
  const [geoError, setGeoError] = React.useState<string | null>(null);
  const [savedFav, setSavedFav] = React.useState(false);
  const [pupilSheet, setPupilSheet] = React.useState(false);
  const [pupilMode, setPupilMode] = React.useState<"save" | "send">("save");
  const [pupils, setPupils] = React.useState<Array<{ id: string; name: string | null }>>([]);
  const [loadingPupils, setLoadingPupils] = React.useState(false);
  const [savingPupil, setSavingPupil] = React.useState<string | null>(null);

  // GROUP B — voice annotation
  const [isRecording, setIsRecording] = React.useState(false);
  const mediaRecorderRef = React.useRef<MediaRecorder | null>(null);
  const audioChunksRef = React.useRef<Blob[]>([]);
  const [audioBlob, setAudioBlob] = React.useState<Blob | null>(null);
  const [hasAudio, setHasAudio] = React.useState(false);

  // undo state: bitmaps live in a ref (they are megabytes each) — state only tracks the count
  const strokesRef = React.useRef<ImageData[]>([]);
  const [strokeCount, setStrokeCount] = React.useState(0);
  const MAX_UNDO = 10;


  // placed icons (cars + hazards)
  const [placedIcons, setPlacedIcons] = React.useState<PlacedIcon[]>([]);
  const [selectedIconId, setSelectedIconId] = React.useState<string | null>(null);
  const draggingIdRef = React.useRef<string | null>(null);
  const draggingPosRef = React.useRef({ x: 0, y: 0 });
  const draggingRotationRef = React.useRef(0);
  const hasShownHintRef = React.useRef(false);

  // two-tap tools
  const [arrowStart, setArrowStart] = React.useState<Point | null>(null);
  const [rulerStart, setRulerStart] = React.useState<Point | null>(null);

  // text label popup
  const [textInput, setTextInput] = React.useState<{ x: number; y: number; value: string } | null>(null);

  // full screen
  const [isFullScreen, setIsFullScreen] = React.useState(false);

  React.useEffect(() => {
    if (isFullScreen) {
      document.body.classList.add("pro-teach-fullscreen");
    } else {
      document.body.classList.remove("pro-teach-fullscreen");
    }
    return () => document.body.classList.remove("pro-teach-fullscreen");
  }, [isFullScreen]);

  React.useEffect(() => {
    if (!("geolocation" in navigator)) {
      setGeoError("Location is not available on this device");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const c = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setCoords(c);
        setHomeCoords(c);
      },
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
      maptype: mapType,
      key: GOOGLE_KEY,
    });
    return `https://maps.googleapis.com/maps/api/staticmap?${params.toString()}&style=feature:poi|visibility:off`;
  }, [coords, zoom, mapType]);

  const repaint = React.useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const dpr = window.devicePixelRatio || 1;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (const s of drawnStrokesRef.current) {
      ctx.beginPath();
      ctx.strokeStyle = s.colour;
      ctx.lineWidth = s.width;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      s.points.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
      ctx.stroke();
    }
    void dpr;
  }, []);

  // size canvas to its container with DPR-aware backing store
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
      // draw in CSS pixels so pointer coords map 1:1 to canvas coords
      canvas.getContext("2d")?.setTransform(dpr, 0, 0, dpr, 0, 0);
      repaint();
    });
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [repaint]);

  // clear drawing when map type changes so annotations don't sit on the wrong imagery
  React.useEffect(() => {
    drawnStrokesRef.current = [];
    strokesRef.current = [];
    setStrokeCount(0);
    setPlacedIcons([]);
    setSelectedIconId(null);
    draggingIdRef.current = null;
    repaint();
  }, [mapType, repaint]);

  // ---- drag to pan the static map ----
  const mapLayerRef = React.useRef<HTMLDivElement | null>(null);
  const panStartRef = React.useRef<{ x: number; y: number } | null>(null);
  const panDeltaRef = React.useRef({ x: 0, y: 0 });
  const panFrameRef = React.useRef<number | null>(null);
  const [homeCoords, setHomeCoords] = React.useState<{ lat: number; lng: number } | null>(null);

  const applyPanTransform = () => {
    if (panFrameRef.current !== null) return;
    panFrameRef.current = requestAnimationFrame(() => {
      panFrameRef.current = null;
      const el = mapLayerRef.current;
      if (el) {
        const { x, y } = panDeltaRef.current;
        el.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      }
    });
  };

  const panDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (mode !== "pan") return;
    panStartRef.current = { x: e.clientX, y: e.clientY };
    panDeltaRef.current = { x: 0, y: 0 };
    (e.currentTarget as HTMLDivElement).setPointerCapture?.(e.pointerId);
  };

  const panMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (mode !== "pan" || !panStartRef.current) return;
    panDeltaRef.current = {
      x: e.clientX - panStartRef.current.x,
      y: e.clientY - panStartRef.current.y,
    };
    applyPanTransform();
  };

  const panUp = () => {
    const startPoint = panStartRef.current;
    if (!startPoint) return;
    panStartRef.current = null;
    if (panFrameRef.current !== null) {
      cancelAnimationFrame(panFrameRef.current);
      panFrameRef.current = null;
    }
    const { x: dx, y: dy } = panDeltaRef.current;
    panDeltaRef.current = { x: 0, y: 0 };
    const el = mapLayerRef.current;
    if (el) el.style.transform = "translate3d(0,0,0)";
    if (!coords || (Math.abs(dx) < 2 && Math.abs(dy) < 2)) return;

    // metres per CSS pixel at this latitude/zoom (image is requested at scale:2)
    const mPerPx = (156543.03392 * Math.cos((coords.lat * Math.PI) / 180)) / Math.pow(2, zoom);
    const dLng = (-dx * mPerPx) / (111320 * Math.cos((coords.lat * Math.PI) / 180));
    const dLat = (dy * mPerPx) / 110540;
    setCoords({ lat: coords.lat + dLat, lng: coords.lng + dLng });
  };

  const recentre = () => {
    if (homeCoords) {
      setCoords(homeCoords);
      return;
    }
    if (!("geolocation" in navigator)) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => toast.error("Couldn't get your location"),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };


  const getPos = (
    e: React.TouchEvent<HTMLCanvasElement>
      | React.MouseEvent<HTMLCanvasElement>
      | TouchEvent
      | MouseEvent,
  ): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
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
    // CSS pixels — matches both the scaled canvas context and the DOM overlay
    return { x: clientX - rect.left, y: clientY - rect.top };
  };

  const pushUndoSnapshot = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const snapshot = ctx.getImageData(0, 0, canvas.width, canvas.height);
    strokesRef.current.push(snapshot);
    if (strokesRef.current.length > MAX_UNDO) strokesRef.current.shift();
    setStrokeCount(strokesRef.current.length);
  };


  const draw = (x: number, y: number, newStroke: boolean) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const colour = isErasing ? "rgba(0,0,0,1)" : currentColor;
    const width = isErasing ? 20 : lineWidth;
    ctx.globalCompositeOperation = isErasing ? "destination-out" : "source-over";
    if (newStroke) {
      drawnStrokesRef.current.push({ points: [{ x, y }], colour, width });
      ctx.beginPath();
      ctx.moveTo(x, y);
    } else {
      const stroke = drawnStrokesRef.current[drawnStrokesRef.current.length - 1];
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

  const placeIcon = (x: number, y: number) => {
    if (activeTool === "car") {
      // never leave the tool armed with nothing — fall back to the first car
      const type = selectedCarTypeRef.current ?? CAR_TYPES[0];
      if (!selectedCarTypeRef.current) setSelectedCarType(type);
      addIcon(x, y, "car", type);
    } else if (activeTool === "hazard") {
      const type = selectedHazardTypeRef.current ?? HAZARD_TYPES[0];
      if (!selectedHazardTypeRef.current) setSelectedHazardType(type);
      addIcon(x, y, "hazard", type);
    }
  };

  const addIcon = (x: number, y: number, category: "car" | "hazard", type: string) => {
    setPlacedIcons((prev) => [
      ...prev,
      { id: `${Date.now()}-${prev.length}`, x, y, category, type, rotation: 0 },
    ]);
    if (!hasShownHintRef.current) {
      hasShownHintRef.current = true;
      // defer so the toast never competes with the placement frame
      setTimeout(() => toast("Tap icon to select", { duration: 2000 }), 400);
    }
  };

  const findIconAt = (x: number, y: number) => {
    return placedIcons.find((icon) => Math.abs(icon.x - x) < 22 && Math.abs(icon.y - y) < 22);

  };

  const drawArrow = (startX: number, startY: number, endX: number, endY: number) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(endX, endY);
    ctx.strokeStyle = currentColor;
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.stroke();

    const angle = Math.atan2(endY - startY, endX - startX);
    const headLen = 15;
    ctx.beginPath();
    ctx.moveTo(endX, endY);
    ctx.lineTo(endX - headLen * Math.cos(angle - Math.PI / 6), endY - headLen * Math.sin(angle - Math.PI / 6));
    ctx.moveTo(endX, endY);
    ctx.lineTo(endX - headLen * Math.cos(angle + Math.PI / 6), endY - headLen * Math.sin(angle + Math.PI / 6));
    ctx.stroke();
  };

  const drawRuler = (aX: number, aY: number, bX: number, bY: number) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const METERS_PER_PIXEL_ZOOM16 = 0.6;
    const scale = Math.pow(2, 16 - zoom);
    const pixelDist = Math.sqrt(Math.pow(bX - aX, 2) + Math.pow(bY - aY, 2));
    const meters = pixelDist * METERS_PER_PIXEL_ZOOM16 * scale;
    const display = meters < 1000 ? `${Math.round(meters)}m` : `${(meters / 1000).toFixed(1)}km`;

    ctx.setLineDash([5, 5]);
    ctx.strokeStyle = "#7B61FF";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(aX, aY);
    ctx.lineTo(bX, bY);
    ctx.stroke();
    ctx.setLineDash([]);

    const midX = (aX + bX) / 2;
    const midY = (aY + bY) / 2;
    ctx.fillStyle = "rgba(123,97,255,0.9)";
    ctx.fillRect(midX - 20, midY - 12, 40, 20);
    ctx.fillStyle = "#fff";
    ctx.font = "bold 11px system-ui";
    ctx.textAlign = "center";
    ctx.fillText(display, midX, midY + 2);
  };

  const drawTextLabel = (x: number, y: number, text: string) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    ctx.font = "bold 14px system-ui";
    const width = ctx.measureText(text).width;
    ctx.fillStyle = "rgba(255,255,255,0.8)";
    ctx.fillRect(x - 4, y - 16, width + 8, 20);
    ctx.fillStyle = currentColor;
    ctx.fillText(text, x, y);
  };

  const selectedCarTypeRef = React.useRef<string | null>(null);
  const selectedHazardTypeRef = React.useRef<string | null>(null);
  const [selectedCarType, setSelectedCarType] = React.useState<string | null>(null);
  const [selectedHazardType, setSelectedHazardType] = React.useState<string | null>(null);

  React.useEffect(() => {
    selectedCarTypeRef.current = selectedCarType;
  }, [selectedCarType]);
  React.useEffect(() => {
    selectedHazardTypeRef.current = selectedHazardType;
  }, [selectedHazardType]);

  const start = (e: React.TouchEvent<HTMLCanvasElement> | React.MouseEvent<HTMLCanvasElement>) => {
    if (mode !== "draw") return;
    const { x, y } = getPos(e);

    // icon selection / drag
    const icon = findIconAt(x, y);
    if (selectedIconId) {
      if (icon) {
        setSelectedIconId(icon.id);
        draggingIdRef.current = icon.id;
        draggingPosRef.current = { x: icon.x, y: icon.y };
        draggingRotationRef.current = icon.rotation;
        return;
      }
      setSelectedIconId(null);
    } else if (icon && activeTool !== "draw" && activeTool !== "arrow" && activeTool !== "text" && activeTool !== "ruler") {
      setSelectedIconId(icon.id);
      return;
    }

    if (activeTool === "draw") {
      drawingRef.current = true;
      draw(x, y, true);
    } else if (activeTool === "car" || activeTool === "hazard") {
      placeIcon(x, y);
    } else if (activeTool === "arrow") {
      if (!arrowStart) {
        setArrowStart({ x, y });
      } else {
        drawArrow(arrowStart.x, arrowStart.y, x, y);
        setArrowStart(null);
        pushUndoSnapshot();
      }
    } else if (activeTool === "ruler") {
      if (!rulerStart) {
        setRulerStart({ x, y });
      } else {
        drawRuler(rulerStart.x, rulerStart.y, x, y);
        setRulerStart(null);
        pushUndoSnapshot();
      }
    } else if (activeTool === "text") {
      setTextInput({ x, y, value: "" });
    }
  };

  const dragFrameRef = React.useRef<number | null>(null);
  const lastMoveTime = React.useRef(0);

  const move = (e: React.TouchEvent<HTMLCanvasElement> | React.MouseEvent<HTMLCanvasElement>) => {
    if (draggingIdRef.current) {
      if ("touches" in e) {
        if (e.cancelable) e.preventDefault();
        e.stopPropagation();
      }
      const now = Date.now();
      if (now - lastMoveTime.current < 16) return; // ~60fps cap
      lastMoveTime.current = now;

      const { x, y } = getPos(e);
      draggingPosRef.current = { x, y };
      const id = draggingIdRef.current;

      // move the DOM node directly — no React re-render while dragging
      if (dragFrameRef.current !== null) return;
      dragFrameRef.current = requestAnimationFrame(() => {
        dragFrameRef.current = null;
        const { x: px, y: py } = draggingPosRef.current;
        const el = document.getElementById(`icon-${id}`);
        if (el) {
          const rot = draggingRotationRef.current;
          el.style.transform = `translate3d(${px - 15}px, ${py - 15}px, 0) rotate(${rot}deg)`;
        }
        const ring = document.getElementById(`icon-ring-${id}`);
        if (ring) ring.style.transform = `translate3d(${px - 25}px, ${py - 25}px, 0)`;
      });
      return;
    }
    if (mode !== "draw" || !drawingRef.current || activeTool !== "draw") return;
    const { x, y } = getPos(e);
    draw(x, y, false);
  };


  const end = () => {
    if (draggingIdRef.current) {
      const id = draggingIdRef.current;
      const { x, y } = draggingPosRef.current;
      draggingIdRef.current = null;
      if (dragFrameRef.current !== null) {
        cancelAnimationFrame(dragFrameRef.current);
        dragFrameRef.current = null;
      }
      setPlacedIcons((prev) => prev.map((i) => (i.id === id ? { ...i, x, y } : i)));
      return;
    }
    if (!drawingRef.current) return;
    drawingRef.current = false;
    pushUndoSnapshot();
  };


  const undo = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const stack = strokesRef.current;
    if (stack.length === 0) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      return;
    }
    const prev = stack[stack.length - 2];
    if (prev) {
      ctx.putImageData(prev, 0, 0);
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    stack.pop();
    setStrokeCount(stack.length);
    drawnStrokesRef.current.pop();
  };

  const clear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (canvas && ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    drawnStrokesRef.current = [];
    strokesRef.current = [];
    setStrokeCount(0);
    setPlacedIcons([]);
    setSelectedIconId(null);
    draggingIdRef.current = null;
    setConfirmClear(false);
  };

  const rotateIcon = (id: string, delta: number) => {
    setPlacedIcons((prev) => prev.map((i) => (i.id === id ? { ...i, rotation: i.rotation + delta } : i)));
  };

  const deleteIcon = (id: string) => {
    setPlacedIcons((prev) => prev.filter((i) => i.id !== id));
    setSelectedIconId(null);
  };

  // icons are stored in CSS px; exports draw onto an untransformed device-px canvas
  const drawIconsOntoCanvas = (ctx: CanvasRenderingContext2D, scale = 1) => {
    for (const icon of placedIcons) {
      const emoji = ICON_EMOJI[icon.type];
      ctx.save();
      ctx.translate(icon.x * scale, icon.y * scale);
      ctx.rotate((icon.rotation * Math.PI) / 180);
      ctx.font = `${28 * scale}px serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(emoji, 0, 0);
      ctx.restore();
    }
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
    drawIconsOntoCanvas(ctx, canvas.width / (canvas.getBoundingClientRect().width || canvas.width));


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

  const compositeDataUrl = React.useCallback(async (): Promise<string | null> => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const offscreen = document.createElement("canvas");
    offscreen.width = canvas.width;
    offscreen.height = canvas.height;
    const ctx = offscreen.getContext("2d");
    if (!ctx) return null;

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
    drawIconsOntoCanvas(ctx, canvas.width / (canvas.getBoundingClientRect().width || canvas.width));
    try {
      return offscreen.toDataURL("image/png");
    } catch {
      return canvas.toDataURL("image/png");
    }
  }, [staticMapUrl, placedIcons]);

  const saveFavourite = async () => {
    try {
      const imageData = (await compositeDataUrl()) ?? "";
      const favourite = {
        id: Date.now().toString(),
        name: `Map ${new Date().toLocaleDateString("en-GB")}`,
        imageData,
        mapUrl: staticMapUrl,
        lat: coords?.lat ?? null,
        lng: coords?.lng ?? null,
        zoom,
        createdAt: new Date().toISOString(),
      };
      localStorage.setItem(`pro_teach_fav_${favourite.id}`, JSON.stringify(favourite));
      setSavedFav(true);
      toast.success("Saved to favourites ✅");
    } catch {
      toast.error("Could not save this map");
    }
  };

  const openPupilPicker = async (mode: "save" | "send" = "save") => {
    setPupilMode(mode);
    setPupilSheet(true);
    setLoadingPupils(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth?.user?.id;
      if (!uid) {
        setPupils([]);
        return;
      }
      const { data } = await supabase
        .from("pupils")
        .select("id, name")
        .eq("instructor_id", uid)
        .is("deleted_at", null)
        .order("name");
      setPupils((data ?? []) as Array<{ id: string; name: string | null }>);
    } catch {
      setPupils([]);
    } finally {
      setLoadingPupils(false);
    }
  };

  const saveToPupil = async (pupil: { id: string; name: string | null }) => {
    setSavingPupil(pupil.id);
    try {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth?.user?.id;
      if (!uid) throw new Error("no user");
      const imageData = (await compositeDataUrl()) ?? "";
      const audioData = audioBlob ? await blobToBase64(audioBlob) : null;

      const { error } = await supabase.from("teach_resources" as never).insert({
        instructor_id: uid,
        pupil_id: pupil.id,
        type: "map_draw",
        image_data: imageData,
        audio_data: audioData,
        map_url: staticMapUrl,
        lat: coords?.lat ?? null,
        lng: coords?.lng ?? null,
        zoom,
        created_at: new Date().toISOString(),
      } as never);

      if (error) {
        const { data: existing } = await supabase
          .from("pupils")
          .select("notes")
          .eq("id", pupil.id)
          .maybeSingle();
        const prev = ((existing as { notes?: string | null } | null)?.notes ?? "") as string;
        const { error: noteErr } = await supabase
          .from("pupils")
          .update({ notes: `${prev}\n[Map saved: ${new Date().toLocaleDateString("en-GB")}]` })
          .eq("id", pupil.id);
        if (noteErr) throw noteErr;
      }

      toast.success(`Saved to ${pupil.name ?? "pupil"} ✅`);
      setPupilSheet(false);
    } catch {
      toast.error("Could not save to that pupil");
    } finally {
      setSavingPupil(null);
    }
  };

  // ---- GROUP A: send the map straight to a pupil's chat ---------------------
  const sendToPupil = async (pupil: { id: string; name: string | null }) => {
    setSavingPupil(pupil.id);
    try {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth?.user?.id;
      if (!uid) throw new Error("no user");
      const canvas = canvasRef.current;
      const image = (await compositeDataUrl()) ?? canvas?.toDataURL("image/jpeg", 0.7) ?? "";
      const payload = {
        instructor_id: uid,
        pupil_id: pupil.id,
        content: "[PRO Teach sketch]",
        body: "[PRO Teach sketch]",
        image_data: image,
        message_type: "teach_sketch",
        sender_type: "instructor",
        created_at: new Date().toISOString(),
      };
      const { error } = await supabase.from("chat_messages" as never).insert(payload as never);
      if (error) {
        const { error: altError } = await supabase
          .from("instructor_messages" as never)
          .insert(payload as never);
        if (altError) throw altError;
      }
      toast.success(`Sent to ${pupil.name ?? "pupil"} ✅`);
      setPupilSheet(false);
    } catch {
      toast.error("Could not send that map");
    } finally {
      setSavingPupil(null);
    }
  };

  // ---- GROUP B: voice annotation -------------------------------------------
  const startRecording = () => {
    navigator.mediaDevices
      ?.getUserMedia({ audio: true })
      .then((stream) => {
        const mr = new MediaRecorder(stream);
        mediaRecorderRef.current = mr;
        audioChunksRef.current = [];
        mr.ondataavailable = (e) => audioChunksRef.current.push(e.data);
        mr.onstop = () => {
          const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
          setAudioBlob(blob);
          setHasAudio(true);
          stream.getTracks().forEach((t) => t.stop());
        };
        mr.start();
        setIsRecording(true);
      })
      .catch(() => toast.error("Microphone unavailable"));
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  };

  const playAudio = () => {
    if (!audioBlob) return;
    const url = URL.createObjectURL(audioBlob);
    const audio = new Audio(url);
    audio.onended = () => URL.revokeObjectURL(url);
    void audio.play();
  };

  // ---- GROUP C: auto-save to lesson notes -----------------------------------
  const canvasHasContent = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return false;
    if (placedIcons.length > 0) return true;
    try {
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      return imageData.data.some((v, i) => i % 4 === 3 && v !== 0);
    } catch {
      return strokeCount > 0;
    }
  };

  const saveToLessonNotes = async () => {
    try {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth?.user?.id;
      if (!uid) throw new Error("no user");
      const today = new Date().toISOString().slice(0, 10);
      const { data } = await supabase
        .from("lessons")
        .select("id, pupil_id, notes, lesson_time")
        .eq("instructor_id", uid)
        .eq("lesson_date", today)
        .neq("status", "cancelled")
        .order("lesson_time")
        .limit(1);
      const lesson = (data ?? [])[0] as
        | { id: string; pupil_id: string | null; notes: string | null }
        | undefined;
      if (!lesson) {
        toast.error("No lesson today to attach this to");
        return;
      }
      const stamp = new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
      await supabase
        .from("lessons")
        .update({ notes: `${lesson.notes ?? ""}\n[PRO Teach sketch - ${stamp}]`.trim() })
        .eq("id", lesson.id);
      await supabase.from("teach_resources" as never).insert({
        instructor_id: uid,
        pupil_id: lesson.pupil_id,
        lesson_id: lesson.id,
        type: "map_draw",
        image_data: (await compositeDataUrl()) ?? "",
        created_at: new Date().toISOString(),
      } as never);
      toast.success("Saved to lesson notes ✅");
    } catch {
      toast.error("Could not save to lesson notes");
    }
  };

  const leaveWithPrompt = () => {
    if (canvasHasContent()) {
      toast("Save sketch to lesson notes?", {
        duration: 5000,
        action: { label: "Save", onClick: () => void saveToLessonNotes() },
        cancel: { label: "Dismiss", onClick: () => undefined },
      });
    }
    navigate({ to: "/pro-teach" as never });
  };

  // ---- GROUP I: DVSA test route overlay (infrastructure) --------------------
  const showTestRoutes = () => {
    const routes = TEST_ROUTES[`${coords?.lat?.toFixed(1) ?? ""},${coords?.lng?.toFixed(1) ?? ""}`];
    if (routes && routes.length > 0) {
      toast.success(`${routes.length} test route${routes.length === 1 ? "" : "s"} for your area`);
      return;
    }
    toast("Test routes for your area coming soon. Contact us to add your local test routes.");
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
  const saveBtn: React.CSSProperties = {
    background: "#fff",
    border: `1px solid ${BORDER}`,
    borderRadius: 10,
    padding: "8px 14px",
    display: "flex",
    alignItems: "center",
    gap: 6,
    cursor: "pointer",
  };
  const zoomBtn: React.CSSProperties = {
    width: 40,
    height: 40,
    borderRadius: 10,
    background: "rgba(255,255,255,0.95)",
    border: `1px solid ${BORDER}`,
    boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
  };
  const iconPill: React.CSSProperties = {
    width: 40,
    height: 40,
    borderRadius: 10,
    background: "#fff",
    border: `1px solid ${BORDER}`,
    fontSize: 20,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    padding: 0,
  };
  const iconPillActive: React.CSSProperties = {
    border: "2px solid #2C97DE",
    background: "#EAF5FC",
  };
  const toolPillActive: React.CSSProperties = {
    border: "2px solid #2C97DE",
    background: "#EAF5FC",
  };

  const selectedIcon = placedIcons.find((i) => i.id === selectedIconId);

  const indicatorText = () => {
    if (activeTool === "car") return "Place car mode";
    if (activeTool === "hazard") return "Place hazard mode";
    if (activeTool === "arrow") return arrowStart ? "Tap end point" : "Arrow mode";
    if (activeTool === "text") return "Text mode";
    if (activeTool === "ruler") return rulerStart ? "Tap point B" : "Ruler mode";
    return "Drawing mode";
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
      {/* header */}
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
            <button type="button" aria-label="Back" style={iconBtn} onClick={leaveWithPrompt}>
              <IconArrowLeft size={18} color="#fff" />
            </button>
          )}
          <div style={{ flex: 1, color: "#fff", fontSize: 15, fontWeight: 700 }}>Map Draw</div>
          <button type="button" aria-label="Test routes" style={iconBtn} onClick={showTestRoutes}>
            <IconRoute size={20} color="#fff" />
          </button>
          <button
            type="button"
            aria-label={isFullScreen ? "Exit full screen" : "Enter full screen"}
            style={iconBtn}
            onClick={() => setIsFullScreen((v) => !v)}
          >
            {isFullScreen ? <IconMinimize size={20} color="#fff" /> : <IconMaximize size={20} color="#fff" />}
          </button>
          <button
            type="button"
            aria-label="Send to pupil"
            style={iconBtn}
            onClick={() => void openPupilPicker("send")}
          >
            <IconMessageShare size={20} color="#fff" />
          </button>
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
        onPointerDown={panDown}
        onPointerMove={panMove}
        onPointerUp={panUp}
        onPointerCancel={panUp}
        style={{
          flex: 1,
          position: "relative",
          overflow: "hidden",
          background: "#e8f0e8",
          touchAction: "none",
          cursor: mode === "pan" ? "grab" : "default",
        }}
      >
        {/* map imagery layer — transformed live while panning */}
        <div
          ref={mapLayerRef}
          style={{
            position: "absolute",
            inset: 0,
            background: staticMapUrl ? `url("${staticMapUrl}") center/cover no-repeat` : "#e8f0e8",
            willChange: "transform",
            pointerEvents: "none",
          }}
        />
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

        {/* placed icons overlay (memoised so placement doesn't re-render the page) */}
        <IconOverlay icons={placedIcons} selectedId={selectedIconId} />


        {/* selected icon action bar */}
        {selectedIcon && (
          <div
            style={{
              position: "absolute",
              left: selectedIcon.x - 76,
              top: selectedIcon.y - 60,
              display: "flex",
              gap: 8,
              zIndex: 100,
              pointerEvents: "auto",
            }}
          >
            <button
              type="button"
              aria-label="Delete icon"
              onClick={() => deleteIcon(selectedIcon.id)}
              style={{
                width: 36,
                height: 36,
                borderRadius: "50%",
                background: "#E53935",
                border: "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
              }}
            >
              <IconTrash size={16} color="#fff" />
            </button>
            <button
              type="button"
              aria-label="Rotate left"
              onClick={() => rotateIcon(selectedIcon.id, -45)}
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
              }}
            >
              <IconRotate size={16} color="#fff" />
            </button>
            <button
              type="button"
              aria-label="Rotate right"
              onClick={() => rotateIcon(selectedIcon.id, 45)}
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
              }}
            >
              <IconRotateClockwise size={16} color="#fff" />
            </button>
            <button
              type="button"
              aria-label="Done"
              onClick={() => setSelectedIconId(null)}
              style={{
                width: 36,
                height: 36,
                borderRadius: "50%",
                background: "#16A34A",
                border: "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
              }}
            >
              <IconCheck size={16} color="#fff" />
            </button>
          </div>
        )}

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
          {mode === "draw" ? "Draw" : "Move map"}
        </button>

        {/* tool indicator */}
        {mode === "draw" && (
          <div
            style={{
              position: "absolute",
              top: 12,
              left: 12,
              background:
                activeTool === "car" || activeTool === "hazard"
                  ? "rgba(44,151,222,0.8)"
                  : activeTool === "arrow" || activeTool === "ruler" || activeTool === "text"
                    ? "rgba(123,97,255,0.8)"
                    : "rgba(11,35,65,0.8)",
              borderRadius: 20,
              padding: "4px 10px",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            {activeTool === "car" || activeTool === "hazard" ? (
              <span style={{ fontSize: 12 }}>{ICON_EMOJI[selectedCarType || selectedHazardType || "car-blue"]}</span>
            ) : (
              <IconPencil size={12} color="#fff" />
            )}
            <span style={{ color: "#fff", fontSize: 11, fontWeight: 700 }}>{indicatorText()}</span>
          </div>
        )}

        {/* zoom controls */}
        <div
          style={{
            position: "absolute",
            right: 12,
            top: "50%",
            transform: "translateY(-50%)",
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          <button
            type="button"
            aria-label="Zoom in"
            style={zoomBtn}
            onClick={() => setZoom((z) => Math.min(19, z + 1))}
          >
            <IconPlus size={20} color={NAVY} />
          </button>
          <div
            style={{
              background: "rgba(11,35,65,0.7)",
              borderRadius: 6,
              padding: "3px 6px",
              color: "#fff",
              fontSize: 10,
              fontWeight: 700,
              textAlign: "center",
            }}
          >
            {zoom}
          </div>
          <button
            type="button"
            aria-label="Zoom out"
            style={zoomBtn}
            onClick={() => setZoom((z) => Math.max(13, z - 1))}
          >
            <IconMinus size={20} color={NAVY} />
          </button>
          <button type="button" aria-label="Recentre on my location" style={zoomBtn} onClick={recentre}>
            <IconCurrentLocation size={18} color={NAVY} />
          </button>
        </div>

        {/* Map type toggle */}
        <div
          style={{
            position: "absolute",
            bottom: 12,
            left: "50%",
            transform: "translateX(-50%)",
            display: "flex",
            gap: 6,
          }}
        >
          {[
            { key: "roadmap", label: "Map" },
            { key: "satellite", label: "Satellite" },
            { key: "hybrid", label: "Hybrid" },
          ].map((t) => {
            const active = mapType === (t.key as typeof mapType);
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => setMapType(t.key as typeof mapType)}
                style={{
                  background: active ? NAVY : "rgba(255,255,255,0.95)",
                  color: active ? "#fff" : NAVY,
                  borderRadius: 20,
                  padding: "6px 14px",
                  fontSize: 12,
                  fontWeight: active ? 700 : 600,
                  border: active ? "none" : `1px solid ${BORDER}`,
                  boxShadow: active ? "none" : "0 2px 6px rgba(0,0,0,0.15)",
                  cursor: "pointer",
                }}
              >
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      <style>{`.pro-teach-toolbar-scroll::-webkit-scrollbar { display: none; }`}</style>

      {/* toolbar */}
      <div
        style={{
          background: "#F4F6F8",
          borderTop: `1px solid ${BORDER}`,
          display: "flex",
          flexDirection: "column",
          gap: 8,
          padding: "10px 0 calc(env(safe-area-inset-bottom, 0px) + 10px)",
        }}
      >
        {/* scrollable tool strip */}
        <div
          className="pro-teach-toolbar-scroll"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            overflowX: "auto",
            WebkitOverflowScrolling: "touch",
            scrollbarWidth: "none",
            msOverflowStyle: "none",
            padding: "0 16px",
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
                setActiveTool("draw");
                setSelectedCarType(null);
                setSelectedHazardType(null);
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
                flexShrink: 0,
              }}
            >
              <span style={{ width: s.dot, height: s.dot, borderRadius: "50%", background: NAVY }} />
            </button>
          ))}

          <span style={{ width: 1, height: 24, background: BORDER, flexShrink: 0 }} />

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
                  setActiveTool("draw");
                  setSelectedCarType(null);
                  setSelectedHazardType(null);
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
                  flexShrink: 0,
                }}
              />
            );
          })}

          <span style={{ width: 1, height: 24, background: BORDER, flexShrink: 0 }} />

          {/* Cars */}
          {CAR_TYPES.map((type) => {
            const active = selectedCarType === type;
            return (
              <button
                key={type}
                type="button"
                aria-label={`Place ${type}`}
                onClick={() => {
                  if (selectedCarType === type && activeTool === "car") {
                    // tapping the armed pill disarms back to the pen
                    setSelectedCarType(null);
                    setActiveTool("draw");
                  } else {
                    setSelectedCarType(type);
                    setActiveTool("car");
                  }
                  setMode("draw");
                  setSelectedHazardType(null);
                  setIsErasing(false);
                }}
                style={{
                  ...iconPill,
                  flexShrink: 0,
                  ...(active ? iconPillActive : {}),
                }}
              >
                {ICON_EMOJI[type]}
              </button>
            );
          })}

          <span style={{ width: 1, height: 24, background: BORDER, flexShrink: 0 }} />

          {/* Hazards */}
          {HAZARD_TYPES.map((type) => {
            const active = selectedHazardType === type;
            return (
              <button
                key={type}
                type="button"
                aria-label={`Place ${type}`}
                onClick={() => {
                  if (selectedHazardType === type && activeTool === "hazard") {
                    setSelectedHazardType(null);
                    setActiveTool("draw");
                  } else {
                    setSelectedHazardType(type);
                    setActiveTool("hazard");
                  }
                  setMode("draw");
                  setSelectedCarType(null);
                  setIsErasing(false);
                }}
                style={{
                  ...iconPill,
                  flexShrink: 0,
                  ...(active ? iconPillActive : {}),
                }}
              >
                {ICON_EMOJI[type]}
              </button>
            );
          })}

          <span style={{ width: 1, height: 24, background: BORDER, flexShrink: 0 }} />

          {/* Tools: arrow / text / ruler */}
          <button
            type="button"
            aria-label="Arrow tool"
            onClick={() => {
              setActiveTool("arrow");
              setArrowStart(null);
              setSelectedCarType(null);
              setSelectedHazardType(null);
              setIsErasing(false);
            }}
            style={{
              ...toolBtn,
              flexShrink: 0,
              ...(activeTool === "arrow" ? toolPillActive : {}),
            }}
          >
            <IconArrowUpRight size={18} color={activeTool === "arrow" ? "#2C97DE" : NAVY} />
          </button>
          <button
            type="button"
            aria-label="Text tool"
            onClick={() => {
              setActiveTool("text");
              setSelectedCarType(null);
              setSelectedHazardType(null);
              setIsErasing(false);
            }}
            style={{
              ...toolBtn,
              flexShrink: 0,
              ...(activeTool === "text" ? toolPillActive : {}),
            }}
          >
            <IconTextSize size={18} color={activeTool === "text" ? "#2C97DE" : NAVY} />
          </button>
          <button
            type="button"
            aria-label="Ruler tool"
            onClick={() => {
              setActiveTool("ruler");
              setRulerStart(null);
              setSelectedCarType(null);
              setSelectedHazardType(null);
              setIsErasing(false);
            }}
            style={{
              ...toolBtn,
              flexShrink: 0,
              ...(activeTool === "ruler" ? toolPillActive : {}),
            }}
          >
            <IconRuler2 size={18} color={activeTool === "ruler" ? "#2C97DE" : NAVY} />
          </button>

          <span style={{ width: 1, height: 24, background: BORDER, flexShrink: 0 }} />

          {/* Draw mode pill */}
          <button
            type="button"
            aria-label="Draw mode"
            onClick={() => {
              setActiveTool("draw");
              setSelectedCarType(null);
              setSelectedHazardType(null);
            }}
            style={{
              borderRadius: 20,
              padding: "6px 14px",
              fontSize: 12,
              fontWeight: 700,
              border: `1px solid ${BORDER}`,
              cursor: "pointer",
              background: activeTool === "draw" ? NAVY : "#fff",
              color: activeTool === "draw" ? "#fff" : NAVY,
              flexShrink: 0,
            }}
          >
            Draw
          </button>

          <button
            type="button"
            aria-label="Eraser"
            onClick={() => {
              setIsErasing((v) => !v);
              setActiveTool("draw");
              setSelectedCarType(null);
              setSelectedHazardType(null);
            }}
            style={{ ...toolBtn, flexShrink: 0, borderColor: isErasing ? "#2C97DE" : BORDER }}
          >
            <IconEraser size={18} color={isErasing ? "#2C97DE" : MUTED} />
          </button>
          <button type="button" aria-label="Undo" onClick={undo} style={{ ...toolBtn, flexShrink: 0 }}>
            <IconArrowBackUp size={18} color={MUTED} />
          </button>

          {/* GROUP B — voice annotation */}
          <button
            type="button"
            aria-label={isRecording ? "Stop recording" : "Record voice note"}
            onClick={isRecording ? stopRecording : startRecording}
            style={{
              ...toolBtn,
              flexShrink: 0,
              borderColor: isRecording ? "#E53935" : BORDER,
              animation: isRecording ? "proTeachPulse 1s ease-in-out infinite" : undefined,
            }}
          >
            <IconMicrophone size={20} color={isRecording ? "#E53935" : MUTED} />
          </button>
          {hasAudio && (
            <button
              type="button"
              onClick={playAudio}
              style={{
                flexShrink: 0,
                borderRadius: 20,
                padding: "6px 10px",
                fontSize: 11,
                fontWeight: 700,
                border: "1px solid #18A999",
                background: "#E7F7F4",
                color: "#0F7A6E",
                cursor: "pointer",
              }}
            >
              🎤 Voice note
            </button>
          )}
        </div>
      </div>

      <style>{`@keyframes proTeachPulse { 0%,100% { opacity: 1 } 50% { opacity: 0.45 } }`}</style>


      {/* save row */}
      <div
        style={{
          background: "#F4F6F8",
          padding: "0 16px calc(env(safe-area-inset-bottom, 0px) + 10px)",
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        <button type="button" onClick={saveFavourite} style={saveBtn} aria-label="Save to favourites">
          {savedFav ? (
            <IconHeartFilled size={18} color="#E53935" />
          ) : (
            <IconHeart size={18} color={MUTED} />
          )}
          <span style={{ fontSize: 12, color: MUTED }}>Save</span>
        </button>
        <button type="button" onClick={() => void openPupilPicker("save")} style={saveBtn} aria-label="Save to pupil">
          <IconUser size={18} color={MUTED} />
          <span style={{ fontSize: 12, color: MUTED }}>Save to pupil</span>
        </button>
      </div>

      {pupilSheet && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(11,35,65,0.45)",
            display: "flex",
            alignItems: "flex-end",
            zIndex: 60,
          }}
          onClick={() => setPupilSheet(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#fff",
              width: "100%",
              borderRadius: "18px 18px 0 0",
              padding: "14px 16px calc(env(safe-area-inset-bottom, 0px) + 16px)",
              maxHeight: "70vh",
              overflowY: "auto",
            }}
          >
            <div style={{ width: 36, height: 4, borderRadius: 2, background: "#C7C7CC", margin: "0 auto 12px" }} />
            <div style={{ fontSize: 16, fontWeight: 700, color: NAVY, marginBottom: 10 }}>
              {pupilMode === "send" ? "Send to which pupil?" : "Save to which pupil?"}
            </div>
            {loadingPupils ? (
              <div style={{ fontSize: 13, color: MUTED, padding: "16px 0" }}>Loading pupils…</div>
            ) : pupils.length === 0 ? (
              <div style={{ fontSize: 13, color: MUTED, padding: "16px 0" }}>No pupils found.</div>
            ) : (
              pupils.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  disabled={savingPupil !== null}
                  onClick={() => (pupilMode === "send" ? void sendToPupil(p) : void saveToPupil(p))}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "10px 4px",
                    background: "transparent",
                    border: "none",
                    borderBottom: `1px solid ${BORDER}`,
                    cursor: "pointer",
                    opacity: savingPupil && savingPupil !== p.id ? 0.5 : 1,
                  }}
                >
                  <span
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: "50%",
                      background: "#EAF1FB",
                      color: NAVY,
                      fontSize: 14,
                      fontWeight: 700,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {(p.name ?? "?").trim().charAt(0).toUpperCase()}
                  </span>
                  <span style={{ fontSize: 15, fontWeight: 700, color: NAVY }}>
                    {p.name ?? "Unnamed pupil"}
                  </span>
                  {savingPupil === p.id && (
                    <span style={{ marginLeft: "auto", fontSize: 12, color: MUTED }}>Saving…</span>
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}

      {textInput && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(11,35,65,0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
            zIndex: 80,
          }}
          onClick={() => setTextInput(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ background: "#fff", borderRadius: 16, padding: 16, width: "100%", maxWidth: 320 }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <input
                autoFocus
                type="text"
                value={textInput.value}
                onChange={(e) => setTextInput((t) => (t ? { ...t, value: e.target.value } : null))}
                placeholder="Add label..."
                style={{
                  flex: 1,
                  padding: "10px 12px",
                  borderRadius: 10,
                  border: `1px solid ${BORDER}`,
                  fontSize: 14,
                  outline: "none",
                }}
              />
              <button
                type="button"
                onClick={() => setTextInput(null)}
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: "50%",
                  border: `1px solid ${BORDER}`,
                  background: "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                }}
              >
                ✕
              </button>
            </div>
            <button
              type="button"
              onClick={() => {
                if (!textInput.value.trim()) return;
                drawTextLabel(textInput.x, textInput.y, textInput.value.trim());
                pushUndoSnapshot();
                setTextInput(null);
              }}
              style={{
                width: "100%",
                padding: "10px 0",
                borderRadius: 10,
                border: "none",
                background: NAVY,
                color: "#fff",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Add
            </button>
          </div>
        </div>
      )}

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
            <div style={{ fontSize: 15, fontWeight: 700, color: NAVY }}>Clear all marks?</div>
            <div style={{ fontSize: 13, color: MUTED, marginTop: 6 }}>
              This removes all drawings and placed icons from the map.
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
