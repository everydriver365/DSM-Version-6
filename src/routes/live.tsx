import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ChevronLeft, Target } from "lucide-react";
import { supabase } from "../lib/supabaseClient";

export const Route = createFileRoute("/live")({
  head: () => ({
    meta: [{ title: "Live tracking — DSM by EveryDriver" }],
  }),
  component: LivePage,
});

const POPPINS = { fontFamily: "Poppins, sans-serif" } as const;

interface LessonRow {
  id: string;
  lesson_time: string;
  status: string;
  pupils: { name: string } | null;
}

function ymd(d: Date) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

function statusColor(status: string) {
  if (status === "confirmed") return "#16A34A";
  if (status === "pending") return "#F59E0B";
  if (status === "cancelled") return "#CC2229";
  return "#6B7280";
}

// Load leaflet via CDN once
let leafletPromise: Promise<any> | null = null;
function loadLeaflet(): Promise<any> {
  if (typeof window === "undefined") return Promise.reject(new Error("no window"));
  const w = window as any;
  if (w.L) return Promise.resolve(w.L);
  if (leafletPromise) return leafletPromise;
  leafletPromise = new Promise((resolve, reject) => {
    if (!document.querySelector('link[data-leaflet]')) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      link.setAttribute("data-leaflet", "1");
      document.head.appendChild(link);
    }
    const existing = document.querySelector<HTMLScriptElement>('script[data-leaflet]');
    if (existing) {
      existing.addEventListener("load", () => resolve((window as any).L));
      existing.addEventListener("error", reject);
      return;
    }
    const s = document.createElement("script");
    s.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    s.setAttribute("data-leaflet", "1");
    s.onload = () => resolve((window as any).L);
    s.onerror = reject;
    document.head.appendChild(s);
  });
  return leafletPromise;
}

function LivePage() {
  const navigate = useNavigate();
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const watchIdRef = useRef<number | null>(null);
  const [speedMph, setSpeedMph] = useState<number>(0);
  const [position, setPosition] = useState<GeolocationPosition | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [lessons, setLessons] = useState<LessonRow[]>([]);
  const [userId, setUserId] = useState<string | null>(null);

  // Init map + geolocation
  useEffect(() => {
    let cancelled = false;
    loadLeaflet()
      .then((L) => {
        if (cancelled || !mapRef.current || mapInstanceRef.current) return;
        const map = L.map(mapRef.current, {
          center: [51.5074, -0.1278],
          zoom: 15,
          zoomControl: false,
          attributionControl: false,
        });
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          maxZoom: 19,
        }).addTo(map);
        mapInstanceRef.current = map;

        // Pulsing dot icon
        const pulseIcon = L.divIcon({
          className: "live-pulse-icon",
          html: '<div class="live-pulse-dot"><div class="live-pulse-ring"></div></div>',
          iconSize: [20, 20],
          iconAnchor: [10, 10],
        });
        markerRef.current = L.marker([51.5074, -0.1278], { icon: pulseIcon }).addTo(map);
      })
      .catch((e) => {
        console.error("[live] leaflet load error", e);
        setGeoError("Map failed to load");
      });

    if (!("geolocation" in navigator)) {
      setGeoError("GPS access required — please enable location in your browser settings");
      return;
    }
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        setPosition(pos);
        const s = pos.coords.speed;
        setSpeedMph(s != null && s > 0 ? Math.round(s * 2.237) : 0);
        const L = (window as any).L;
        if (L && mapInstanceRef.current && markerRef.current) {
          const ll: [number, number] = [pos.coords.latitude, pos.coords.longitude];
          markerRef.current.setLatLng(ll);
          if (!(markerRef.current as any).__centred) {
            mapInstanceRef.current.setView(ll, 15);
            (markerRef.current as any).__centred = true;
          }
        }
      },
      (err) => {
        console.warn("[live] geolocation error", err);
        setGeoError("GPS access required — please enable location in your browser settings");
      },
      { enableHighAccuracy: true, maximumAge: 1000, timeout: 15000 },
    );

    return () => {
      cancelled = true;
      if (watchIdRef.current != null && "geolocation" in navigator) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Auth + today's lessons
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) return;
      setUserId(data.user.id);
    })();
  }, []);

  useEffect(() => {
    if (!userId) return;
    (async () => {
      const today = ymd(new Date());
      const { data, error } = await supabase
        .from("lessons")
        .select("id, lesson_time, status, pupils(name)")
        .eq("instructor_id", userId)
        .eq("lesson_date", today)
        .is("deleted_at", null)
        .order("lesson_time", { ascending: true });
      if (error) console.error("[live] lessons fetch error", error);
      setLessons((data ?? []) as unknown as LessonRow[]);
    })();
  }, [userId]);

  function centreOnMe() {
    if (!position || !mapInstanceRef.current) return;
    mapInstanceRef.current.setView(
      [position.coords.latitude, position.coords.longitude],
      16,
    );
  }

  function stopTracking() {
    if (watchIdRef.current != null && "geolocation" in navigator) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    navigate({ to: "/home" });
  }

  return (
    <div
      className="fixed inset-0"
      style={{ ...POPPINS, backgroundColor: "#0A1628" }}
    >
      <style>{`
        .live-pulse-icon { background: transparent !important; border: none !important; }
        .live-pulse-dot {
          position: relative;
          width: 20px; height: 20px;
          background: #2563EB;
          border: 3px solid #fff;
          border-radius: 50%;
          box-shadow: 0 0 0 2px rgba(37,99,235,0.4);
        }
        .live-pulse-ring {
          position: absolute;
          top: -3px; left: -3px;
          width: 20px; height: 20px;
          border-radius: 50%;
          background: rgba(37,99,235,0.5);
          animation: livePulse 1.8s ease-out infinite;
        }
        @keyframes livePulse {
          0% { transform: scale(1); opacity: 0.7; }
          100% { transform: scale(3.2); opacity: 0; }
        }
      `}</style>

      {/* TOP BAR */}
      <div
        className="absolute top-0 left-0 right-0 z-[1000] flex items-center"
        style={{
          height: 52,
          paddingTop: "env(safe-area-inset-top, 0px)",
          background: "rgba(10,22,40,0.85)",
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
        }}
      >
        <button
          type="button"
          aria-label="Back"
          onClick={() => navigate({ to: "/home" })}
          className="flex items-center justify-center"
          style={{ width: 52, height: 52, background: "transparent", border: "none", cursor: "pointer" }}
        >
          <ChevronLeft size={24} color="#ffffff" />
        </button>
        <div
          className="flex-1 text-center text-white font-semibold"
          style={{ fontSize: 16, marginRight: 52 }}
        >
          Live tracking
        </div>
      </div>

      {/* MAP */}
      <div ref={mapRef} className="absolute inset-0" style={{ zIndex: 1 }} />

      {/* GEO ERROR */}
      {geoError && (
        <div
          className="absolute z-[1001]"
          style={{
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            background: "#fff",
            padding: "16px 20px",
            borderRadius: 12,
            maxWidth: 280,
            textAlign: "center",
            color: "#0F2044",
            fontSize: 14,
            boxShadow: "0 8px 30px rgba(0,0,0,0.3)",
          }}
        >
          {geoError}
        </div>
      )}

      {/* SPEED bottom-left */}
      <div
        className="absolute z-[1000]"
        style={{
          left: 16,
          bottom: 220,
          background: "rgba(10,22,40,0.85)",
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
          padding: "10px 14px",
          borderRadius: 12,
          color: "#fff",
          minWidth: 80,
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: 28, fontWeight: 700, lineHeight: 1 }}>{speedMph}</div>
        <div style={{ fontSize: 11, opacity: 0.8, marginTop: 2 }}>mph</div>
      </div>

      {/* CENTRE ON ME bottom-right */}
      <button
        type="button"
        aria-label="Centre on me"
        onClick={centreOnMe}
        className="absolute z-[1000] flex items-center justify-center"
        style={{
          right: 16,
          bottom: 220,
          width: 48,
          height: 48,
          borderRadius: 24,
          background: "#0F2044",
          border: "none",
          cursor: "pointer",
          boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
        }}
      >
        <Target size={22} color="#ffffff" />
      </button>

      {/* BOTTOM PANEL */}
      <div
        className="absolute left-0 right-0 bottom-0 z-[1000] bg-white"
        style={{
          borderRadius: "16px 16px 0 0",
          padding: "16px 20px",
          paddingBottom: "calc(20px + env(safe-area-inset-bottom, 0px))",
          boxShadow: "0 -4px 20px rgba(0,0,0,0.15)",
          maxHeight: "40vh",
          overflowY: "auto",
        }}
      >
        <div
          style={{
            fontSize: 11,
            letterSpacing: "0.08em",
            color: "#6B7280",
            textTransform: "uppercase",
            fontWeight: 600,
          }}
        >
          Today's lessons
        </div>

        <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 8 }}>
          {lessons.length === 0 ? (
            <div style={{ fontSize: 13, color: "#6B7280", padding: "8px 0" }}>
              No lessons today
            </div>
          ) : (
            lessons.map((l) => (
              <div
                key={l.id}
                className="flex items-center justify-between"
                style={{
                  padding: "8px 10px",
                  borderRadius: 8,
                  background: "#F3F4F6",
                }}
              >
                <div className="flex items-center" style={{ gap: 10 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "#0F2044", minWidth: 44 }}>
                    {(l.lesson_time ?? "").slice(0, 5)}
                  </span>
                  <span style={{ fontSize: 13, color: "#1A1A2E" }}>
                    {l.pupils?.name ?? "Pupil"}
                  </span>
                </div>
                <span
                  style={{
                    fontSize: 10,
                    padding: "3px 8px",
                    borderRadius: 999,
                    background: statusColor(l.status),
                    color: "#fff",
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: "0.04em",
                  }}
                >
                  {l.status}
                </span>
              </div>
            ))
          )}
        </div>

        <button
          type="button"
          onClick={stopTracking}
          style={{
            marginTop: 14,
            width: "100%",
            height: 44,
            borderRadius: 10,
            background: "transparent",
            border: "1px solid #CC2229",
            color: "#CC2229",
            fontSize: 14,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Stop tracking
        </button>
      </div>
    </div>
  );
}
