import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft } from "lucide-react";
import { supabase } from "../lib/supabaseClient";

export const Route = createFileRoute("/live")({
  head: () => ({
    meta: [{ title: "Live tracking — DSM by EveryDriver" }],
  }),
  component: LivePage,
});

const POPPINS = { fontFamily: "Poppins, sans-serif" } as const;
const GOOGLE_MAPS_KEY = "AIzaSyDWFw0oL9ZyhwdvdvYtDsdJrTFYzF0khFc";

interface LessonRow {
  id: string;
  lesson_time: string;
  duration_minutes: number | null;
  status: string;
  pupil_id: string | null;
  pupils: { name: string } | null;
}

interface Coord {
  lat: number;
  lng: number;
  speed_mph: number;
  heading: number | null;
  timestamp: number;
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

function haversineKm(a: Coord, b: { lat: number; lng: number }) {
  const R = 6371;
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.asin(Math.sqrt(s));
}

let gmapsPromise: Promise<any> | null = null;
function loadGoogleMaps(): Promise<any> {
  if (typeof window === "undefined") return Promise.reject(new Error("no window"));
  const w = window as any;
  if (w.google?.maps) return Promise.resolve(w.google);
  if (gmapsPromise) return gmapsPromise;
  gmapsPromise = new Promise((resolve, reject) => {
    const cbName = "__dsmInitGMaps_" + Math.random().toString(36).slice(2);
    (window as any)[cbName] = () => resolve((window as any).google);
    const s = document.createElement("script");
    s.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_KEY}&loading=async&callback=${cbName}`;
    s.async = true;
    s.defer = true;
    s.onerror = reject;
    document.head.appendChild(s);
  });
  return gmapsPromise;
}

function LivePage() {
  const navigate = useNavigate();
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const polylineRef = useRef<any>(null);
  const watchIdRef = useRef<number | null>(null);
  const centeredRef = useRef(false);

  const coordsRef = useRef<Coord[]>([]);
  const routeIdRef = useRef<string | null>(null);
  const userIdRef = useRef<string | null>(null);
  const lastSaveRef = useRef<number>(0);
  const startedAtRef = useRef<number>(0);
  const overspeedSinceRef = useRef<number | null>(null);
  const lastOverspeedInsertRef = useRef<number>(0);
  const speedLimitFetchedRef = useRef<{ key: string; at: number } | null>(null);
  const speedLimitRef = useRef<number | null>(null);
  const roadNameRef = useRef<string | null>(null);

  const [tracking, setTracking] = useState(false);
  const [coordinates, setCoordinates] = useState<Coord[]>([]);
  const [currentSpeed, setCurrentSpeed] = useState<number | null>(null);
  const [speedLimit, setSpeedLimit] = useState<number | null>(null);
  const [roadName, setRoadName] = useState<string | null>(null);
  const [isOverSpeeding, setIsOverSpeeding] = useState(false);
  const [overspeedCount, setOverspeedCount] = useState(0);
  const [overspeedEvents, setOverspeedEvents] = useState<
    { at: number; speed_mph: number; speed_limit_mph: number; excess_mph: number; road_name: string | null }[]
  >([]);
  const [showOverspeedList, setShowOverspeedList] = useState(false);
  const [distanceKm, setDistanceKm] = useState(0);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [geoError, setGeoError] = useState<string | null>(null);

  const [lessons, setLessons] = useState<LessonRow[]>([]);
  const [activeLessonId, setActiveLessonId] = useState<string | null>(null);
  const [activePupilId, setActivePupilId] = useState<string | null>(null);
  const activeLesson = useMemo(
    () => lessons.find((l) => l.id === activeLessonId) ?? null,
    [lessons, activeLessonId],
  );

  // Tick elapsed
  useEffect(() => {
    if (!tracking) return;
    const t = setInterval(() => {
      setElapsedSec(Math.floor((Date.now() - startedAtRef.current) / 1000));
    }, 1000);
    return () => clearInterval(t);
  }, [tracking]);

  // Load map
  useEffect(() => {
    let cancelled = false;
    loadGoogleMaps()
      .then((google) => {
        if (cancelled || !mapRef.current || mapInstanceRef.current) return;
        const map = new google.maps.Map(mapRef.current, {
          center: { lat: 51.5074, lng: -0.1278 },
          zoom: 15,
          disableDefaultUI: true,
          gestureHandling: "greedy",
          styles: [
            { elementType: "geometry", stylers: [{ color: "#1d2c4d" }] },
            { elementType: "labels.text.fill", stylers: [{ color: "#8ec3b9" }] },
            { elementType: "labels.text.stroke", stylers: [{ color: "#1a3646" }] },
            { featureType: "road", elementType: "geometry", stylers: [{ color: "#304a7d" }] },
            { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#2c6675" }] },
            { featureType: "water", elementType: "geometry", stylers: [{ color: "#0e1626" }] },
            { featureType: "poi", stylers: [{ visibility: "off" }] },
            { featureType: "transit", stylers: [{ visibility: "off" }] },
          ],
        });
        mapInstanceRef.current = map;
        polylineRef.current = new google.maps.Polyline({
          path: [],
          geodesic: true,
          strokeColor: "#EF4444",
          strokeOpacity: 0.95,
          strokeWeight: 5,
          map,
        });
      })
      .catch((e) => {
        console.error("[live] gmaps load error", e);
        setGeoError("Map failed to load");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Auth + load lessons + detect in-progress + auto start
  useEffect(() => {
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return;
      userIdRef.current = auth.user.id;

      const today = ymd(new Date());
      const { data, error } = await supabase
        .from("lessons")
        .select("id, lesson_time, duration_minutes, status, pupil_id, pupils(name)")
        .eq("instructor_id", auth.user.id)
        .eq("lesson_date", today)
        .neq("status", "cancelled")
        .is("deleted_at", null)
        .order("lesson_time", { ascending: true });
      if (error) console.error("[live] lessons fetch", error);
      const rows = (data ?? []) as unknown as LessonRow[];
      setLessons(rows);

      const now = new Date();
      const nowMin = now.getHours() * 60 + now.getMinutes();
      const inProgress = rows.find((l) => {
        if (!l.lesson_time) return false;
        const [hh, mm] = l.lesson_time.split(":").map(Number);
        const start = hh * 60 + mm;
        const end = start + (l.duration_minutes ?? 60);
        return nowMin >= start && nowMin < end;
      });
      if (inProgress) {
        setActiveLessonId(inProgress.id);
        setActivePupilId(inProgress.pupil_id);
        startTracking(inProgress.id, inProgress.pupil_id);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current != null && "geolocation" in navigator) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, []);

  async function ensureSpeedLimit(lat: number, lng: number) {
    const key = `${lat.toFixed(3)},${lng.toFixed(3)}`;
    const now = Date.now();
    if (
      speedLimitFetchedRef.current &&
      speedLimitFetchedRef.current.key === key &&
      now - speedLimitFetchedRef.current.at < 30_000
    ) {
      return;
    }
    speedLimitFetchedRef.current = { key, at: now };

    // Cache lookup
    try {
      const { data: cached } = await supabase
        .from("speed_limit_cache")
        .select("speed_limit_mph, road_name, fetched_at")
        .eq("lat_key", Number(lat.toFixed(3)))
        .eq("lng_key", Number(lng.toFixed(3)))
        .maybeSingle();
      if (cached && cached.fetched_at) {
        const age = now - new Date(cached.fetched_at).getTime();
        if (age < 24 * 60 * 60 * 1000) {
          if (cached.speed_limit_mph != null) setSpeedLimit(cached.speed_limit_mph);
          if (cached.road_name) setRoadName(cached.road_name);
          return;
        }
      }
    } catch (e) {
      // table may not exist yet — ignore
    }

    let limit: number | null = null;
    let road: string | null = null;
    try {
      const r = await fetch(
        `https://roads.googleapis.com/v1/speedLimits?path=${lat},${lng}&units=MPH&key=${GOOGLE_MAPS_KEY}`,
      );
      const j = await r.json();
      const sl = j?.speedLimits?.[0]?.speedLimit;
      if (typeof sl === "number") limit = sl;
    } catch (e) {
      console.warn("[live] speed limit fetch failed", e);
    }
    try {
      const r2 = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${GOOGLE_MAPS_KEY}`,
      );
      const j2 = await r2.json();
      const comps = j2?.results?.[0]?.address_components ?? [];
      const routeComp = comps.find((c: any) => c.types?.includes("route"));
      if (routeComp?.long_name) road = routeComp.long_name;
    } catch (e) {
      console.warn("[live] geocode failed", e);
    }

    if (limit != null) setSpeedLimit(limit);
    if (road) setRoadName(road);
    try {
      await supabase.from("speed_limit_cache").upsert({
        lat_key: Number(lat.toFixed(3)),
        lng_key: Number(lng.toFixed(3)),
        speed_limit_mph: limit,
        road_name: road,
        fetched_at: new Date().toISOString(),
      });
    } catch (e) {
      // ignore
    }
  }

  async function saveCoordinates(final = false, extras: Record<string, any> = {}) {
    if (!routeIdRef.current) return;
    const speeds = coordsRef.current.map((c) => c.speed_mph).filter((s) => s > 0);
    const maxSpeed = speeds.length ? Math.max(...speeds) : 0;
    const avgSpeed = speeds.length
      ? Math.round(speeds.reduce((a, b) => a + b, 0) / speeds.length)
      : 0;
    const payload: Record<string, any> = {
      coordinates: coordsRef.current,
      max_speed_mph: maxSpeed,
      avg_speed_mph: avgSpeed,
      distance_km: Number(distanceKm.toFixed(3)),
      ...extras,
    };
    if (final) {
      payload.ended_at = new Date().toISOString();
      payload.duration_minutes = Math.round(
        (Date.now() - startedAtRef.current) / 60000,
      );
    }
    try {
      await supabase.from("lesson_routes").update(payload).eq("id", routeIdRef.current);
    } catch (e) {
      console.warn("[live] save route failed", e);
    }
  }

  async function recordOverspeed(
    speed: number,
    limit: number,
    lat: number,
    lng: number,
  ) {
    if (!routeIdRef.current || !userIdRef.current) return;
    try {
      await supabase.from("overspeed_events").insert({
        lesson_route_id: routeIdRef.current,
        instructor_id: userIdRef.current,
        recorded_at: new Date().toISOString(),
        speed_mph: speed,
        speed_limit_mph: limit,
        excess_mph: speed - limit,
        latitude: lat,
        longitude: lng,
        road_name: roadName,
      });
    } catch (e) {
      console.warn("[live] overspeed insert failed", e);
    }
    setOverspeedCount((c) => c + 1);
  }

  async function startTracking(lessonId: string | null, pupilId: string | null) {
    if (tracking) return;
    if (!("geolocation" in navigator)) {
      setGeoError("GPS access required — please enable location in your browser settings");
      return;
    }
    startedAtRef.current = Date.now();
    coordsRef.current = [];
    setCoordinates([]);
    setDistanceKm(0);
    setOverspeedCount(0);
    setElapsedSec(0);

    try {
      const { data, error } = await supabase
        .from("lesson_routes")
        .insert({
          instructor_id: userIdRef.current,
          lesson_id: lessonId,
          pupil_id: pupilId,
          started_at: new Date().toISOString(),
          coordinates: [],
        })
        .select("id")
        .single();
      if (error) console.warn("[live] create route failed", error);
      routeIdRef.current = data?.id ?? null;
    } catch (e) {
      console.warn("[live] create route ex", e);
    }

    setTracking(true);
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => handlePosition(pos),
      (err) => {
        console.warn("[live] geo err", err);
        setGeoError("GPS access required — please enable location in your browser settings");
      },
      { enableHighAccuracy: true, maximumAge: 1000, timeout: 10000 },
    );
  }

  function handlePosition(pos: GeolocationPosition) {
    const lat = pos.coords.latitude;
    const lng = pos.coords.longitude;
    const speedMs = pos.coords.speed;
    const mph = speedMs != null && speedMs > 0 ? Math.round(speedMs * 2.237) : 0;
    const heading = pos.coords.heading ?? null;
    const point: Coord = { lat, lng, speed_mph: mph, heading, timestamp: Date.now() };

    const prev = coordsRef.current[coordsRef.current.length - 1];
    if (prev) {
      const dKm = haversineKm(prev, { lat, lng });
      if (dKm < 5) setDistanceKm((d) => d + dKm);
    }
    coordsRef.current = [...coordsRef.current, point];
    setCoordinates(coordsRef.current);
    setCurrentSpeed(mph);

    const google = (window as any).google;
    if (google && mapInstanceRef.current) {
      const ll = { lat, lng };
      if (polylineRef.current) {
        const path = polylineRef.current.getPath();
        path.push(new google.maps.LatLng(lat, lng));
      }
      if (!markerRef.current) {
        markerRef.current = new google.maps.Marker({
          position: ll,
          map: mapInstanceRef.current,
          icon: {
            path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
            scale: 6,
            fillColor: "#2563EB",
            fillOpacity: 1,
            strokeColor: "#ffffff",
            strokeWeight: 2,
            rotation: heading ?? 0,
          },
        });
      } else {
        markerRef.current.setPosition(ll);
        const icon = markerRef.current.getIcon();
        if (icon && heading != null) {
          markerRef.current.setIcon({ ...icon, rotation: heading });
        }
      }
      if (!centeredRef.current) {
        mapInstanceRef.current.setCenter(ll);
        centeredRef.current = true;
      } else {
        mapInstanceRef.current.panTo(ll);
      }
    }

    ensureSpeedLimit(lat, lng);

    if (speedLimit != null && mph > speedLimit + 2) {
      const now = Date.now();
      if (overspeedSinceRef.current == null) {
        overspeedSinceRef.current = now;
      } else if (
        now - overspeedSinceRef.current > 2000 &&
        now - lastOverspeedInsertRef.current > 15000
      ) {
        lastOverspeedInsertRef.current = now;
        setIsOverSpeeding(true);
        recordOverspeed(mph, speedLimit, lat, lng);
      } else if (now - overspeedSinceRef.current > 2000) {
        setIsOverSpeeding(true);
      }
    } else {
      overspeedSinceRef.current = null;
      setIsOverSpeeding(false);
    }

    const now = Date.now();
    if (
      now - lastSaveRef.current > 10000 ||
      coordsRef.current.length % 10 === 0
    ) {
      lastSaveRef.current = now;
      saveCoordinates(false);
    }
  }

  async function stopTracking() {
    if (watchIdRef.current != null && "geolocation" in navigator) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setTracking(false);
    await saveCoordinates(true);
    if (activeLessonId) {
      navigate({ to: "/lessons/$id", params: { id: activeLessonId } });
    } else {
      navigate({ to: "/home" });
    }
  }

  const speedColor = isOverSpeeding ? "#EF4444" : "#ffffff";
  const elapsedMin = Math.floor(elapsedSec / 60);
  const elapsedSecRem = elapsedSec % 60;

  return (
    <div className="fixed inset-0" style={{ ...POPPINS, backgroundColor: "#0A1628" }}>
      <style>{`
        @keyframes liveDotPulse {
          0%,100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.3); }
        }
        @keyframes overspeedFlash {
          0%,100% { opacity: 1; }
          50% { opacity: 0.6; }
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
        <div className="flex-1 text-center text-white font-semibold" style={{ fontSize: 16 }}>
          Live tracking
        </div>
        <div className="flex items-center justify-center" style={{ width: 52, height: 52 }}>
          <span
            style={{
              width: 10,
              height: 10,
              borderRadius: 5,
              background: tracking ? "#EF4444" : "#6B7280",
              animation: tracking ? "liveDotPulse 1.4s ease-in-out infinite" : undefined,
            }}
          />
        </div>
      </div>

      {/* MAP */}
      <div ref={mapRef} className="absolute inset-0" style={{ zIndex: 1 }} />

      {/* OVERSPEED FLASH BANNER */}
      {isOverSpeeding && speedLimit != null && currentSpeed != null && (
        <div
          className="absolute z-[1002] left-1/2"
          style={{
            top: "calc(env(safe-area-inset-top, 0px) + 60px)",
            transform: "translateX(-50%)",
            background: "#EF4444",
            color: "#fff",
            padding: "10px 16px",
            borderRadius: 10,
            fontSize: 13,
            fontWeight: 700,
            letterSpacing: "0.02em",
            boxShadow: "0 8px 24px rgba(239,68,68,0.4)",
            animation: "overspeedFlash 0.8s ease-in-out infinite",
            whiteSpace: "nowrap",
          }}
        >
          OVER SPEED LIMIT · {currentSpeed}mph in a {speedLimit} zone
        </div>
      )}

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

      {/* SPEED LIMIT SIGN bottom-left */}
      {speedLimit != null && (
        <div
          className="absolute z-[1000] flex items-center justify-center"
          style={{
            left: 16,
            bottom: 260,
            width: 64,
            height: 64,
            borderRadius: 32,
            background: "#fff",
            border: "5px solid #CC2229",
            boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
          }}
        >
          <span style={{ fontSize: 22, fontWeight: 800, color: "#0A1628", lineHeight: 1 }}>
            {speedLimit}
          </span>
        </div>
      )}

      {/* CURRENT SPEED */}
      <div
        className="absolute z-[1000]"
        style={{
          right: 16,
          bottom: 260,
          background: "rgba(10,22,40,0.85)",
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
          padding: "10px 16px",
          borderRadius: 12,
          color: speedColor,
          minWidth: 90,
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: 32, fontWeight: 800, lineHeight: 1, color: speedColor }}>
          {currentSpeed ?? 0}
        </div>
        <div style={{ fontSize: 11, opacity: 0.8, marginTop: 2, color: "#fff" }}>mph</div>
        {roadName && (
          <div
            style={{
              fontSize: 10,
              marginTop: 4,
              color: "#cbd5e1",
              maxWidth: 110,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {roadName}
          </div>
        )}
      </div>

      {/* BOTTOM PANEL */}
      <div
        className="absolute left-0 right-0 bottom-0 z-[1000] bg-white"
        style={{
          borderRadius: "16px 16px 0 0",
          padding: "16px 20px",
          paddingBottom: "calc(20px + env(safe-area-inset-bottom, 0px))",
          boxShadow: "0 -4px 20px rgba(0,0,0,0.15)",
        }}
      >
        {activeLesson ? (
          <div style={{ marginBottom: 12 }}>
            <div
              style={{
                fontSize: 10,
                letterSpacing: "0.08em",
                color: "#6B7280",
                textTransform: "uppercase",
                fontWeight: 600,
              }}
            >
              Active lesson
            </div>
            <div
              className="flex items-center justify-between"
              style={{ marginTop: 4 }}
            >
              <div style={{ fontSize: 15, fontWeight: 700, color: "#0F2044" }}>
                {activeLesson.pupils?.name ?? "Pupil"}
              </div>
              <div style={{ fontSize: 13, color: "#6B7280", fontWeight: 600 }}>
                {(activeLesson.lesson_time ?? "").slice(0, 5)}
              </div>
            </div>
          </div>
        ) : (
          <div
            style={{
              fontSize: 13,
              color: "#6B7280",
              marginBottom: 12,
              fontStyle: "italic",
            }}
          >
            No active lesson — tracking route manually
          </div>
        )}

        {/* STATS ROW */}
        <div
          className="flex"
          style={{
            gap: 8,
            background: "#F3F4F6",
            borderRadius: 10,
            padding: "10px 12px",
          }}
        >
          <div className="flex-1" style={{ textAlign: "center" }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#0F2044" }}>
              {distanceKm.toFixed(2)}
            </div>
            <div style={{ fontSize: 10, color: "#6B7280", marginTop: 2 }}>km</div>
          </div>
          <div style={{ width: 1, background: "#E5E7EB" }} />
          <div className="flex-1" style={{ textAlign: "center" }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#0F2044" }}>
              {elapsedMin}:{String(elapsedSecRem).padStart(2, "0")}
            </div>
            <div style={{ fontSize: 10, color: "#6B7280", marginTop: 2 }}>duration</div>
          </div>
          <div style={{ width: 1, background: "#E5E7EB" }} />
          <div className="flex-1" style={{ textAlign: "center" }}>
            <div
              style={{
                fontSize: 16,
                fontWeight: 700,
                color: overspeedCount > 0 ? "#EF4444" : "#0F2044",
              }}
            >
              {overspeedCount}
            </div>
            <div style={{ fontSize: 10, color: "#6B7280", marginTop: 2 }}>overspeed</div>
          </div>
        </div>

        {tracking ? (
          <button
            type="button"
            onClick={stopTracking}
            style={{
              marginTop: 12,
              width: "100%",
              height: 46,
              borderRadius: 10,
              background: "#CC2229",
              border: "none",
              color: "#fff",
              fontSize: 15,
              fontWeight: 700,
              cursor: "pointer",
              boxShadow: "0 4px 12px rgba(204,34,41,0.3)",
            }}
          >
            End tracking
          </button>
        ) : (
          <button
            type="button"
            onClick={() => startTracking(activeLessonId, activePupilId)}
            style={{
              marginTop: 12,
              width: "100%",
              height: 46,
              borderRadius: 10,
              background: "#16A34A",
              border: "none",
              color: "#fff",
              fontSize: 15,
              fontWeight: 700,
              cursor: "pointer",
              boxShadow: "0 4px 12px rgba(22,163,74,0.3)",
            }}
          >
            Start tracking
          </button>
        )}
      </div>
    </div>
  );
}
