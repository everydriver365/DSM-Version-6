import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import * as React from "react";
import {
  IconArrowBackUp,
  IconArrowLeft,
  IconEraser,
  IconMaximize,
  IconMessageShare,
  IconMicrophone,
  IconMinimize,
  IconMinus,
  IconPaint,
  IconPencil,
  IconPlayerPlay,
  IconShare,
  IconStar,
  IconStarFilled,
  IconTrash,
  IconX,
} from "@tabler/icons-react";
import { toast } from "sonner";
import { supabase } from "../lib/supabaseClient";

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

const FAV_TEMPLATE_KEY = "pro_teach_template_fav";
const CUSTOM_TEMPLATE_PREFIX = "pro_teach_custom_";

type Point = { x: number; y: number };
type Tool = "pen" | "fill" | "line";
type Background = "blank" | "dots" | "lines" | "road";
type DrawEvent = {
  type: "start" | "move" | "end";
  x: number;
  y: number;
  color: string;
  width: number;
  t: number;
};

function readFavourites(): string[] {
  try {
    const raw = localStorage.getItem(FAV_TEMPLATE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as string[]) : [];
  } catch {
    return [];
  }
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("read failed"));
    reader.readAsDataURL(blob);
  });
}

function SketchBoardPage() {
  const navigate = useNavigate();
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const canvasWrapperRef = React.useRef<HTMLDivElement | null>(null);
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

  // GROUP E — background
  const [background, setBackground] = React.useState<Background>("dots");

  // GROUP G — favourite templates
  const [favourites, setFavourites] = React.useState<string[]>([]);
  React.useEffect(() => setFavourites(readFavourites()), []);
  const toggleFavourite = (key: string) => {
    setFavourites((prev) => {
      const next = prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key];
      try {
        localStorage.setItem(FAV_TEMPLATE_KEY, JSON.stringify(next));
      } catch {
        /* storage full */
      }
      return next;
    });
  };
  const orderedTemplates = React.useMemo(
    () =>
      [...TEMPLATE_PILLS].sort(
        (a, b) => Number(favourites.includes(b.key)) - Number(favourites.includes(a.key)),
      ),
    [favourites],
  );

  // GROUP F — drawing replay
  const drawHistoryRef = React.useRef<DrawEvent[]>([]);
  const [replaying, setReplaying] = React.useState(false);

  // GROUP D — pinch zoom
  const scaleRef = React.useRef(1);
  const lastDistRef = React.useRef(0);

  // GROUP B — voice annotation
  const [isRecording, setIsRecording] = React.useState(false);
  const mediaRecorderRef = React.useRef<MediaRecorder | null>(null);
  const audioChunksRef = React.useRef<Blob[]>([]);
  const [audioBlob, setAudioBlob] = React.useState<Blob | null>(null);
  const [hasAudio, setHasAudio] = React.useState(false);

  // GROUP A — pupil sheet
  const [pupilSheet, setPupilSheet] = React.useState<null | "save" | "send">(null);
  const [pupils, setPupils] = React.useState<Array<{ id: string; name: string | null }>>([]);
  const [loadingPupils, setLoadingPupils] = React.useState(false);
  const [busyPupil, setBusyPupil] = React.useState<string | null>(null);

  // GROUP H — save as template
  const [templateNameInput, setTemplateNameInput] = React.useState<string | null>(null);

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
      const cssWidth = rect.width / (scaleRef.current || 1);
      const cssHeight = rect.height / (scaleRef.current || 1);
      canvas.width = cssWidth * dpr;
      canvas.height = cssHeight * dpr;
      canvas.style.width = `${cssWidth}px`;
      canvas.style.height = `${cssHeight}px`;
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
    // normalised through the rect so pinch zoom never offsets the ink
    return {
      x: ((clientX - rect.left) / (rect.width || 1)) * canvas.width,
      y: ((clientY - rect.top) / (rect.height || 1)) * canvas.height,
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
    drawHistoryRef.current.push({
      type: newStroke ? "start" : "move",
      x,
      y,
      color: colour,
      width,
      t: Date.now(),
    });
  };

  const pushUndoSnapshot = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const snapshot = ctx.getImageData(0, 0, canvas.width, canvas.height);
    setStrokes((prev) => [...prev, snapshot]);
  };

  const start = (e: React.TouchEvent<HTMLCanvasElement> | React.MouseEvent<HTMLCanvasElement>) => {
    if ("touches" in e && e.touches.length === 2) {
      lastDistRef.current = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY,
      );
      drawingRef.current = false;
      return;
    }
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
    // GROUP D — two-finger pinch zooms the board instead of drawing
    if ("touches" in e && e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY,
      );
      if (lastDistRef.current > 0) {
        const delta = dist / lastDistRef.current;
        scaleRef.current = Math.min(Math.max(scaleRef.current * delta, 0.5), 4);
        const wrapper = canvasWrapperRef.current;
        if (wrapper) {
          wrapper.style.transform = `scale(${scaleRef.current})`;
          wrapper.style.transformOrigin = "center center";
        }
      }
      lastDistRef.current = dist;
      return;
    }
    if (tool !== "pen" || !drawingRef.current) return;
    const { x, y } = getPos(e);
    draw(x, y, false);
  };

  const end = () => {
    lastDistRef.current = 0;
    if (!drawingRef.current) return;
    drawingRef.current = false;
    drawHistoryRef.current.push({
      type: "end",
      x: 0,
      y: 0,
      color: currentColor,
      width: lineWidth,
      t: Date.now(),
    });
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
    drawHistoryRef.current = [];
    setConfirmClear(false);
  };

  // GROUP F — replay the drawing at 2x speed
  const replay = async () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const history = drawHistoryRef.current.slice();
    if (!history.length || replaying) return;
    setReplaying(true);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (template) drawTemplate(ctx, template, canvas.width, canvas.height);
    const startTime = history[0].t;
    let elapsed = 0;
    for (const point of history) {
      const target = (point.t - startTime) / 2; // 2x speed
      const wait = Math.min(Math.max(target - elapsed, 0), 400);
      elapsed = target;
      if (wait > 0) await new Promise((r) => setTimeout(r, wait));
      if (point.type === "start") {
        ctx.beginPath();
        ctx.moveTo(point.x, point.y);
      } else if (point.type === "move") {
        ctx.strokeStyle = point.color;
        ctx.lineWidth = point.width;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.lineTo(point.x, point.y);
        ctx.stroke();
      }
    }
    setReplaying(false);
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

  // ---- GROUP B: voice recording -------------------------------------------
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

  // ---- GROUP A/C: pupils --------------------------------------------------
  const canvasDataUrl = (quality = 0.7) => {
    const canvas = canvasRef.current;
    if (!canvas) return "";
    try {
      return canvas.toDataURL("image/jpeg", quality);
    } catch {
      return "";
    }
  };

  const openPupilPicker = async (mode: "save" | "send") => {
    setPupilSheet(mode);
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

  const sendToPupil = async (pupil: { id: string; name: string | null }) => {
    setBusyPupil(pupil.id);
    try {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth?.user?.id;
      if (!uid) throw new Error("no user");
      const image = canvasDataUrl();
      const base = {
        instructor_id: uid,
        pupil_id: pupil.id,
        content: "[PRO Teach sketch]",
        body: "[PRO Teach sketch]",
        image_data: image,
        message_type: "teach_sketch",
        sender_type: "instructor",
        created_at: new Date().toISOString(),
      };
      const { error } = await supabase.from("chat_messages" as never).insert(base as never);
      if (error) {
        const { error: altError } = await supabase
          .from("instructor_messages" as never)
          .insert(base as never);
        if (altError) throw altError;
      }
      toast.success(`Sent to ${pupil.name ?? "pupil"} ✅`);
      setPupilSheet(null);
    } catch {
      toast.error("Could not send that sketch");
    } finally {
      setBusyPupil(null);
    }
  };

  const saveToPupil = async (pupil: { id: string; name: string | null }) => {
    setBusyPupil(pupil.id);
    try {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth?.user?.id;
      if (!uid) throw new Error("no user");
      const image = canvasDataUrl(0.8);
      const audio = audioBlob ? await blobToBase64(audioBlob) : null;

      const { error } = await supabase.from("teach_resources" as never).insert({
        instructor_id: uid,
        pupil_id: pupil.id,
        type: "sketch",
        image_data: image,
        audio_data: audio,
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
          .update({ notes: `${prev}\n[PRO Teach sketch: ${new Date().toLocaleDateString("en-GB")}]` })
          .eq("id", pupil.id);
        if (noteErr) throw noteErr;
      }
      toast.success(`Saved to ${pupil.name ?? "pupil"} ✅`);
      setPupilSheet(null);
    } catch {
      toast.error("Could not save to that pupil");
    } finally {
      setBusyPupil(null);
    }
  };

  // ---- GROUP C: auto-save to lesson notes ---------------------------------
  const canvasHasContent = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return false;
    try {
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      return imageData.data.some((v, i) => i % 4 === 3 && v !== 0);
    } catch {
      return strokes.length > 0;
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
        type: "sketch",
        image_data: canvasDataUrl(0.6),
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

  // ---- GROUP H: save as template ------------------------------------------
  const saveAsTemplate = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    try {
      localStorage.setItem(
        `${CUSTOM_TEMPLATE_PREFIX}${trimmed}`,
        JSON.stringify({ name: trimmed, imageData: canvasDataUrl(0.7), createdAt: new Date().toISOString() }),
      );
      toast.success("Template saved");
    } catch {
      toast.error("Could not save template");
    }
    setTemplateNameInput(null);
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

  const backgroundStyle = (): React.CSSProperties => {
    if (background === "dots") {
      return {
        background: "#fff",
        backgroundImage: "radial-gradient(circle, #E4E8EF 1px, transparent 1px)",
        backgroundSize: "20px 20px",
      };
    }
    if (background === "lines") {
      return {
        background: "#fff",
        backgroundImage:
          "repeating-linear-gradient(transparent, transparent 24px, #E4E8EF 24px, #E4E8EF 25px)",
      };
    }
    if (background === "road") return { background: "#e8f0e8" };
    return { background: "#fff" };
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
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "0 16px 14px" }}>
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
          <div style={{ flex: 1, color: "#fff", fontSize: 15, fontWeight: 700 }}>Sketch Board</div>
          <button
            type="button"
            aria-label="Replay drawing"
            style={{ ...iconBtn, opacity: replaying ? 0.5 : 1 }}
            onClick={replay}
          >
            <IconPlayerPlay size={18} color="#fff" />
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
        <div
          ref={canvasWrapperRef}
          style={{
            position: "absolute",
            inset: 0,
            transformOrigin: "center center",
            ...backgroundStyle(),
          }}
        >
          {background === "road" && (
            <svg
              width="100%"
              height="100%"
              viewBox="0 0 100 200"
              preserveAspectRatio="none"
              aria-hidden="true"
              style={{ position: "absolute", inset: 0 }}
            >
              <rect x="32" y="0" width="36" height="200" fill="#D6DCE3" />
              <line x1="32" y1="0" x2="32" y2="200" stroke="#fff" strokeWidth="1.2" />
              <line x1="68" y1="0" x2="68" y2="200" stroke="#fff" strokeWidth="1.2" />
              <line
                x1="50"
                y1="0"
                x2="50"
                y2="200"
                stroke="#fff"
                strokeWidth="1.2"
                strokeDasharray="8 8"
              />
            </svg>
          )}

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
        </div>

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
        {/* background pills */}
        <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 2 }}>
          {(
            [
              { key: "blank", label: "⬜ Blank" },
              { key: "dots", label: "⋯ Dots" },
              { key: "lines", label: "≡ Lines" },
              { key: "road", label: "🛣️ Road" },
            ] as { key: Background; label: string }[]
          ).map((b) => {
            const active = background === b.key;
            return (
              <button
                key={b.key}
                type="button"
                onClick={() => setBackground(b.key)}
                style={{
                  flexShrink: 0,
                  padding: "5px 10px",
                  borderRadius: 20,
                  fontSize: 11,
                  fontWeight: active ? 700 : 600,
                  border: active ? "none" : `1px solid ${BORDER}`,
                  background: active ? "#EAF5FC" : "#fff",
                  color: active ? "#2C97DE" : MUTED,
                  cursor: "pointer",
                }}
              >
                {b.label}
              </button>
            );
          })}

          <span style={{ width: 1, height: 22, background: BORDER, flexShrink: 0 }} />

          <button
            type="button"
            onClick={() => setTemplateNameInput("")}
            style={{
              flexShrink: 0,
              padding: "5px 10px",
              borderRadius: 20,
              fontSize: 11,
              fontWeight: 600,
              border: `1px solid ${BORDER}`,
              background: "#fff",
              color: MUTED,
              cursor: "pointer",
            }}
          >
            Save as template
          </button>
        </div>

        {/* template pills */}
        <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4 }}>
          {orderedTemplates.map((t) => {
            const active = template === t.key;
            const fav = favourites.includes(t.key);
            return (
              <div
                key={t.key}
                style={{
                  flexShrink: 0,
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  borderRadius: 20,
                  border: active ? "none" : `1px solid ${BORDER}`,
                  background: active ? NAVY : "#fff",
                  padding: "2px 6px 2px 2px",
                }}
              >
                <button
                  type="button"
                  onClick={() => setTemplate(active ? null : t.key)}
                  style={{
                    padding: "4px 8px",
                    borderRadius: 20,
                    fontSize: 12,
                    fontWeight: active ? 700 : 600,
                    border: "none",
                    background: "transparent",
                    color: active ? "#fff" : NAVY,
                    cursor: "pointer",
                  }}
                >
                  {t.label}
                </button>
                <button
                  type="button"
                  aria-label={fav ? `Unstar ${t.label}` : `Star ${t.label}`}
                  onClick={() => toggleFavourite(t.key)}
                  style={{
                    border: "none",
                    background: "transparent",
                    padding: 0,
                    display: "flex",
                    cursor: "pointer",
                  }}
                >
                  {fav ? (
                    <IconStarFilled size={13} color="#F59E0B" />
                  ) : (
                    <IconStar size={13} color={active ? "rgba(255,255,255,0.6)" : "#C7CDD6"} />
                  )}
                </button>
              </div>
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
            <IconPaint size={18} color={tool === "fill" ? "#2C97DE" : MUTED} />
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
            <IconMinus size={18} color={tool === "line" ? "#2C97DE" : MUTED} />
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

          {/* GROUP B — voice annotation */}
          <button
            type="button"
            aria-label={isRecording ? "Stop recording" : "Record voice note"}
            onClick={isRecording ? stopRecording : startRecording}
            style={{
              ...toolBtn,
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
          <button
            type="button"
            onClick={() => void openPupilPicker("save")}
            style={{
              borderRadius: 20,
              padding: "6px 12px",
              fontSize: 11,
              fontWeight: 700,
              border: `1px solid ${BORDER}`,
              background: "#fff",
              color: NAVY,
              cursor: "pointer",
            }}
          >
            Save to pupil
          </button>
        </div>
      </div>

      <style>{`@keyframes proTeachPulse { 0%,100% { opacity: 1 } 50% { opacity: 0.45 } }`}</style>

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
          onClick={() => setPupilSheet(null)}
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
              {pupilSheet === "send" ? "Send to which pupil?" : "Save to which pupil?"}
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
                  disabled={busyPupil !== null}
                  onClick={() => (pupilSheet === "send" ? void sendToPupil(p) : void saveToPupil(p))}
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
                    opacity: busyPupil && busyPupil !== p.id ? 0.5 : 1,
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
                  {busyPupil === p.id && (
                    <span style={{ marginLeft: "auto", fontSize: 12, color: MUTED }}>Working…</span>
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}

      {templateNameInput !== null && (
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
          onClick={() => setTemplateNameInput(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ background: "#fff", borderRadius: 16, padding: 20, width: "100%", maxWidth: 320 }}
          >
            <div style={{ fontSize: 15, fontWeight: 700, color: NAVY }}>Save as template</div>
            <input
              autoFocus
              value={templateNameInput}
              onChange={(e) => setTemplateNameInput(e.target.value)}
              placeholder="Template name"
              style={{
                width: "100%",
                marginTop: 12,
                padding: "10px 12px",
                borderRadius: 10,
                border: `1px solid ${BORDER}`,
                fontSize: 14,
              }}
            />
            <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
              <button
                type="button"
                onClick={() => setTemplateNameInput(null)}
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
                onClick={() => saveAsTemplate(templateNameInput)}
                style={{
                  flex: 1,
                  padding: "10px 0",
                  borderRadius: 10,
                  border: "none",
                  background: NAVY,
                  color: "#fff",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Save
              </button>
            </div>
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
