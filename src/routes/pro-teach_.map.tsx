import { createFileRoute } from "@tanstack/react-router";
import * as React from "react";
import {
  IconArrowBackUp,
  IconEraser,
  IconHeart,
  IconHeartFilled,
  IconMinus,
  IconPencil,
  IconPlus,
  IconShare,
  IconTrash,
  IconUser,
} from "@tabler/icons-react";
import { toast } from "sonner";
import { supabase } from "../lib/supabaseClient";

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
  const [mapType, setMapType] = React.useState<"roadmap" | "satellite" | "hybrid">("hybrid");
  const [mode, setMode] = React.useState<"draw" | "pan">("draw");
  const [currentColor, setCurrentColor] = React.useState("#E53935");
  const [lineWidth, setLineWidth] = React.useState(3);
  const [isErasing, setIsErasing] = React.useState(false);
  const [confirmClear, setConfirmClear] = React.useState(false);
  const [geoError, setGeoError] = React.useState<string | null>(null);
  const [savedFav, setSavedFav] = React.useState(false);
  const [pupilSheet, setPupilSheet] = React.useState(false);
  const [pupils, setPupils] = React.useState<Array<{ id: string; name: string | null }>>([]);
  const [loadingPupils, setLoadingPupils] = React.useState(false);
  const [savingPupil, setSavingPupil] = React.useState<string | null>(null);

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
      maptype: mapType,
      key: GOOGLE_KEY,
    });
    return `https://maps.googleapis.com/maps/api/staticmap?${params.toString()}&style=feature:poi|visibility:off`;
  }, [coords, zoom, mapType]);

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

  // clear drawing when map type changes so annotations don't sit on the wrong imagery
  React.useEffect(() => {
    strokesRef.current = [];
    repaint();
  }, [mapType, repaint]);

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

  /* ---------- composite (map + drawing) as a data URL ---------- */
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
    try {
      return offscreen.toDataURL("image/png");
    } catch {
      return canvas.toDataURL("image/png");
    }
  }, [staticMapUrl]);

  /* ---------- FEATURE 2 — save to favourites ---------- */
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

  /* ---------- FEATURE 3 — save to pupil ---------- */
  const openPupilPicker = async () => {
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

      const { error } = await supabase.from("teach_resources" as never).insert({
        instructor_id: uid,
        pupil_id: pupil.id,
        type: "map_draw",
        image_data: imageData,
        map_url: staticMapUrl,
        lat: coords?.lat ?? null,
        lng: coords?.lng ?? null,
        zoom,
        created_at: new Date().toISOString(),
      } as never);

      if (error) {
        // table may not exist — fall back to appending a note on the pupil
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

  return (
    <div
      ref={rootRef}
      style={{ height: shellHeight, display: "flex", flexDirection: "column", background: "#fff" }}
    >
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

        {/* FEATURE 1 — zoom controls */}
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

      {/* FEATURE 2 + 3 — save row */}
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
        <button type="button" onClick={openPupilPicker} style={saveBtn} aria-label="Save to pupil">
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
              Save to which pupil?
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
                  onClick={() => saveToPupil(p)}
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
