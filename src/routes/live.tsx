import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { IconChevronLeft, IconChevronRight, IconMap, IconSearch, IconX } from "@tabler/icons-react";
import { Geolocation } from "@capacitor/geolocation";
import { Capacitor } from "@capacitor/core";
import { supabase } from "../lib/supabaseClient";
import { PupilAvatar } from "../components/PupilAvatar";
import { buildTripReport } from "../lib/tripReport";
import { toast } from "sonner";

export const Route = createFileRoute("/live")({
  validateSearch: (search: Record<string, unknown>): { autostart?: string; lessonId?: string; pupilId?: string } => ({
    autostart: typeof search.autostart === "string" ? search.autostart : undefined,
    lessonId: typeof search.lessonId === "string" ? search.lessonId : undefined,
    pupilId: typeof search.pupilId === "string" ? search.pupilId : undefined,
  }),
  head: () => ({
    meta: [{ title: "Live tracking — DSM by EveryDriver" }],
  }),
  component: LivePage,
});

const SILENT_AUDIO_SRC = "data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4LjI5LjEwMAAAAAAAAAAAAAAA/+M4wAAAAAAAAAAAAFhpbmcAAAAPAAAAAwAAA0kAVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq//////////////////////////////////////////////////////////////////8AAAAATGF2YzU4LjU0AAAAAAAAAAAAAAAAJAYHAAAAAAAAqkBJgQAAAAAAAAAAAAAAAAAAAAD/4zCACAAALSAAAAgAAANIAAAAETEFNRTMuMTAwVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVvvvv";

const POPPINS = { fontFamily: "Poppins, sans-serif" } as const;
const GOOGLE_MAPS_KEY = "AIzaSyDWFw0oL9ZyhwdvdvYtDsdJrTFYzF0khFc";
const TOMTOM_API_KEY = "sU3STzRmGy7LHNUyIuTP6noG7vqqoISH";

/** Derive a road classification from a road name / route number string. */
function deriveRoadType(name?: string | null): string | null {
  if (!name) return null;
  const tag = name.trim().match(/^([MAB])\s?\d/i);
  if (tag) {
    const p = tag[1].toUpperCase();
    return p === "M" ? "Motorway" : p === "A" ? "A Road" : "B Road";
  }
  return "Local road";
}

/** UK motorway sign plate. */
function MotorwaySymbol({ tag, over = false }: { tag?: string | null; over?: boolean }) {
  const bg = over ? "#CC2229" : "#003399";
  return (
    <svg width={38} height={46} viewBox="0 0 44 52" aria-hidden="true" style={{ flexShrink: 0, display: "block" }}>
      <rect x="0" y="0" width="44" height="52" rx="3" fill={bg} />
      <rect x="2" y="2" width="40" height="48" rx="2" fill="none" stroke="#fff" strokeWidth="1.2" />
      <rect x="8" y="8" width="12" height="16" rx="1" fill={over ? "#CC2229" : "#fff"} stroke={over ? "#fff" : "none"} strokeWidth={over ? 1 : 0} />
      <rect x="24" y="8" width="12" height="16" rx="1" fill={over ? "#CC2229" : "#fff"} stroke={over ? "#fff" : "none"} strokeWidth={over ? 1 : 0} />
      <rect x="20" y="8" width="4" height="16" fill={bg} />
      <line x1="4" y1="27" x2="40" y2="27" stroke="#fff" strokeWidth="1.2" />
      <text x="22" y="43" textAnchor="middle" fill="#fff" fontSize="13" fontWeight="800">
        {tag ?? ""}
      </text>
    </svg>
  );
}

/** UK A-road sign plate. */
function ARoadPlate({ tag, over = false }: { tag: string; over?: boolean }) {
  return (
    <svg width={40} height={26} viewBox="0 0 40 26" aria-hidden="true" style={{ flexShrink: 0, display: "block" }}>
      <rect x="0" y="0" width="40" height="26" rx="3" fill={over ? "#CC2229" : "#00703C"} />
      <rect x="2" y="2" width="36" height="22" rx="2" fill="none" stroke="#fff" strokeWidth="1.2" />
      <text x="20" y="18" textAnchor="middle" fill="#fff" fontSize="13" fontWeight="800">
        {tag}
      </text>
    </svg>
  );
}

/** UK B-road sign plate. */
function BRoadPlate({ tag, over = false }: { tag: string; over?: boolean }) {
  return (
    <svg width={46} height={26} viewBox="0 0 46 26" aria-hidden="true" style={{ flexShrink: 0, display: "block" }}>
      <rect x="0" y="0" width="46" height="26" rx="3" fill={over ? "#CC2229" : "#D4C48A"} />
      <rect x="2" y="2" width="42" height="22" rx="2" fill="none" stroke={over ? "#fff" : "#555"} strokeWidth={over ? 1.2 : 0.8} />
      <text x="23" y="18" textAnchor="middle" fill={over ? "#fff" : "#1a1a1a"} fontSize="12" fontWeight="800">
        {tag}
      </text>
    </svg>
  );
}




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
  road_name: string | null;
  speed_limit_mph: number | null;
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

function formatDurationMs(ms: number) {
  const totalSeconds = Math.max(0, Math.round(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
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

function SegmentSpeedChart({
  points,
  speedLimitMph,
}: {
  points: { timestamp: number; speed_mph: number; over: boolean }[];
  speedLimitMph: number | null;
}) {
  if (points.length < 2) return null;
  const width = 280;
  const height = 72;
  const padding = { top: 8, right: 8, bottom: 20, left: 32 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;
  const minT = points[0].timestamp;
  const maxT = points[points.length - 1].timestamp;
  const timeSpan = Math.max(1, maxT - minT);
  const maxSpeed = Math.max(
    1,
    Math.max(speedLimitMph ?? 0, ...points.map((p) => p.speed_mph))
  );
  const xFor = (t: number) => padding.left + ((t - minT) / timeSpan) * chartW;
  const yFor = (s: number) => padding.top + chartH - (s / maxSpeed) * chartH;
  const pathD = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${xFor(p.timestamp)} ${yFor(p.speed_mph)}`)
    .join(" ");
  const limitY = speedLimitMph != null ? yFor(speedLimitMph) : null;

  return (
    <div style={{ padding: "12px 12px 0" }}>
      <svg width="100%" viewBox={`0 0 ${width} ${height}`} style={{ display: "block" }}>
        {/* grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((r) => {
          const y = padding.top + chartH * (1 - r);
          return (
            <line
              key={r}
              x1={padding.left}
              y1={y}
              x2={width - padding.right}
              y2={y}
              stroke="#E5E7EB"
              strokeWidth={1}
            />
          );
        })}
        {/* speed limit line */}
        {limitY != null && (
          <line
            x1={padding.left}
            y1={limitY}
            x2={width - padding.right}
            y2={limitY}
            stroke="#EF4444"
            strokeWidth={1.5}
            strokeDasharray="4 3"
          />
        )}
        {/* speed line */}
        <path
          d={pathD}
          fill="none"
          stroke="#1877D6"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* points */}
        {points.map((p, i) => (
          <circle
            key={i}
            cx={xFor(p.timestamp)}
            cy={yFor(p.speed_mph)}
            r={2.5}
            fill={p.over ? "#CC2229" : "#1877D6"}
          />
        ))}
        {/* Y-axis labels */}
        <text x={padding.left - 4} y={padding.top + 4} textAnchor="end" fontSize={8} fill="#6B7280">
          {Math.round(maxSpeed)}
        </text>
        <text x={padding.left - 4} y={padding.top + chartH + 3} textAnchor="end" fontSize={8} fill="#6B7280">
          0
        </text>
        {/* IconX-axis labels */}
        <text x={padding.left} y={height - 4} textAnchor="middle" fontSize={8} fill="#6B7280">
          {new Date(minT).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </text>
        <text x={width - padding.right} y={height - 4} textAnchor="middle" fontSize={8} fill="#6B7280">
          {new Date(maxT).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </text>
      </svg>
    </div>
  );
}

function LivePage() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const polylineRef = useRef<any>(null);
  const watchIdRef = useRef<string | null>(null);
  const silentAudioRef = useRef<HTMLAudioElement | null>(null);
  const isStoppingRef = useRef(false);
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
  const lastRoadFetchRef = useRef<{ lat: number; lng: number } | null>(null);

  const [tracking, setTracking] = useState(false);
  const [coordinates, setCoordinates] = useState<Coord[]>([]);
  const [currentSpeed, setCurrentSpeed] = useState<number | null>(null);
  const [speedLimit, setSpeedLimit] = useState<number | null>(null);
  const [roadName, setRoadName] = useState<string | null>(null);
  const [roadType, setRoadType] = useState<string | null>(null);
  const [isOverSpeeding, setIsOverSpeeding] = useState(false);
  const [overspeedCount, setOverspeedCount] = useState(0);
  const [overspeedEvents, setOverspeedEvents] = useState<
    { at: number; speed_mph: number; speed_limit_mph: number; excess_mph: number; road_name: string | null }[]
  >([]);
  const [showOverspeedList, setShowOverspeedList] = useState(false);
  const [distanceKm, setDistanceKm] = useState(0);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [lastFixAccuracy, setLastFixAccuracy] = useState<number | null>(null);
  const [lastGeoWarning, setLastGeoWarning] = useState<string | null>(null);

  const [lessons, setLessons] = useState<LessonRow[]>([]);
  const [lessonsLoaded, setLessonsLoaded] = useState(false);
  const [activeLessonId, setActiveLessonId] = useState<string | null>(null);
  const [activePupilId, setActivePupilId] = useState<string | null>(null);
  const [trackingPupilName, setTrackingPupilName] = useState<string | null>(null);
  const [showLessonPicker, setShowLessonPicker] = useState(false);
  const [pickedLessonId, setPickedLessonId] = useState<string>("manual");
  const [activePupils, setActivePupils] = useState<{ id: string; name: string }[]>([]);


  interface ReportSegment {
    road_name: string;
    distance_miles: number;
    speed_limit_mph: number | null;
    max_speed_mph: number;
    avg_speed_mph: number;
    exceeded: boolean;
    points: { timestamp: number; speed_mph: number; over: boolean }[];
  }
  interface ReportData {
    pupilName: string;
    totalDistanceMiles: number;
    totalDurationSec: number;
    overallMaxSpeed: number;
    overspeedCount: number;
    segments: ReportSegment[];
    lessonId: string | null;
  }
  const [showReport, setShowReport] = useState(false);
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [expandedSegments, setExpandedSegments] = useState<Set<number>>(new Set());


  interface PickerPupil {
    id: string;
    name: string | null;
    first_name: string | null;
    last_name: string | null;
    calendar_colour: string | null;
  }
  const [allPupils, setAllPupils] = useState<PickerPupil[]>([]);
  const [pupilPickerOpen, setPupilPickerOpen] = useState(false);
  const [pupilSearchQuery, setPupilSearchQuery] = useState("");

  const activeLesson = useMemo(
    () => lessons.find((l) => l.id === activeLessonId) ?? null,
    [lessons, activeLessonId],
  );

  const selectedPupilName = useMemo(() => {
    if (!activePupilId) return null;
    const pupil = allPupils.find((item) => item.id === activePupilId);
    if (!pupil) return activePupils.find((item) => item.id === activePupilId)?.name ?? null;
    return (
      pupil.name ||
      `${pupil.first_name ?? ""} ${pupil.last_name ?? ""}`.trim() ||
      null
    );
  }, [activePupilId, activePupils, allPupils]);
  const activeLessonPupilName = activeLesson?.pupils?.name ?? null;

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
    console.log("[live] mounted, checking for active lesson");
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) {
        setLessonsLoaded(true);
        return;
      }
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
      setLessonsLoaded(true);

      // Load active pupils for manual "Select pupil" picker
      const { data: pupilsData, error: pupilsErr } = await supabase
        .from("pupils")
        .select("id,name,first_name,last_name,calendar_colour")
        .eq("instructor_id", auth.user.id)
        .eq("status", "active")
        .is("deleted_at", null);
      if (pupilsErr) console.error("[live] pupils fetch", pupilsErr);
      setAllPupils((pupilsData ?? []) as PickerPupil[]);

      // Load active pupils for the lesson picker "Other pupils" section
      const { data: activePupilsData, error: activePupilsErr } = await supabase
        .from("pupils")
        .select("id, name")
        .eq("instructor_id", auth.user.id)
        .eq("status", "active")
        .is("deleted_at", null)
        .order("name", { ascending: true });
      if (activePupilsErr) console.error("[live] active pupils fetch", activePupilsErr);
      setActivePupils((activePupilsData ?? []) as { id: string; name: string }[]);


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
      if (watchIdRef.current != null) {
        Geolocation.clearWatch({ id: watchIdRef.current as string });
        watchIdRef.current = null;
      }

      try {
        silentAudioRef.current?.pause();
      } catch {
        // ignore
      }
      silentAudioRef.current = null;
    };
  }, []);

  // Recover the GPS watch if iOS suspended the page while tracking
  useEffect(() => {
    function onVisibility() {
      if (document.visibilityState !== "visible") return;
      if (!tracking) return;
      if (watchIdRef.current != null) return;
      startGpsWatch();
      startSilentAudio();
      toast.info("Tracking resumed");
    }
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tracking]);


  // Auto-start tracking when navigated here from Home with autostart query params
  useEffect(() => {
    if (search.autostart !== '1' || !search.lessonId || !search.pupilId) return;
    console.log("[live] autostart triggered for lesson", search.lessonId);
    setActiveLessonId(search.lessonId);
    setActivePupilId(search.pupilId);
    startTracking(search.lessonId, search.pupilId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (lessonsLoaded && !tracking && !activeLessonId && !geoError) {
      console.log("[live] no active lesson — showing manual start");
    }
  }, [lessonsLoaded, tracking, activeLessonId, geoError]);

  async function ensureSpeedLimit(lat: number, lng: number) {
    const key = `${lat.toFixed(3)},${lng.toFixed(3)}`;
    const now = Date.now();
    if (
      speedLimitFetchedRef.current &&
      speedLimitFetchedRef.current.key === key &&
      now - speedLimitFetchedRef.current.at < 5_000
    ) {
      return;
    }
    speedLimitFetchedRef.current = { key, at: now };

    // Cache lookup
    try {
      const { data: cached } = await supabase
        .from("speed_limit_cache")
        .select("speed_limit_mph, road_name, fetched_at")
        .eq("latitude", Number(lat.toFixed(3)))
        .eq("longitude", Number(lng.toFixed(3)))
        .maybeSingle();
      if (cached && cached.fetched_at && (cached.road_name || cached.speed_limit_mph != null)) {
        const age = now - new Date(cached.fetched_at).getTime();
        if (age < 24 * 60 * 60 * 1000) {
          if (cached.speed_limit_mph != null) {
            setSpeedLimit(cached.speed_limit_mph);
            speedLimitRef.current = cached.speed_limit_mph;
          }
          if (cached.road_name) {
            setRoadName(cached.road_name);
            roadNameRef.current = cached.road_name;
            setRoadType(deriveRoadType(cached.road_name));
          }
          return;
        }
      }
    } catch (e) {
      // table may not exist yet — ignore
    }

    let limit: number | null = null;
    let road: string | null = null;
    try {
      console.log('[live] fetching road for:', lat, lng);
      // TomTom Reverse Geocode returns the snapped street name, its route
      // numbers, an optional posted speed limit ("40.00MPH") and roadUse.
      const url =
        `https://api.tomtom.com/search/2/reverseGeocode/${lat},${lng}.json` +
        `?key=${TOMTOM_API_KEY}&returnSpeedLimit=true&returnRoadUse=true&radius=100`;
      const r = await fetch(url);
      if (!r.ok) throw new Error(`TomTom ${r.status}`);
      const j = await r.json();
      console.log('[live] TomTom response:', JSON.stringify(j?.addresses?.[0]?.address));
      const entry = j?.addresses?.[0];
      const addr = entry?.address;

      // Speed limit e.g. "40.00MPH" or "50.00KMPH"
      const slRaw: string | undefined = addr?.speedLimit;
      if (typeof slRaw === "string") {
        const num = parseFloat(slRaw);
        if (!Number.isNaN(num)) {
          limit = /kmph|km\/h/i.test(slRaw) ? Math.round(num / 1.609) : Math.round(num);
        }
      }

      // Prefer route number (A31, M27) plus street name when both exist
      const routeNumbers: string[] | undefined = addr?.routeNumbers;
      const routeNum = routeNumbers?.[0]?.trim();
      const streetName = addr?.streetName?.trim();
      if (routeNum && streetName) road = `${routeNum} · ${streetName}`;
      else if (routeNum) road = routeNum;
      else if (streetName) road = streetName;
      else if (addr?.street) road = addr.street;
      else if (addr?.municipalitySubdivision) road = addr.municipalitySubdivision;
      console.log('[live] road name set:', road);

      // Road type from roadUse / route number prefix
      const roadUse: string[] = Array.isArray(entry?.roadUse) ? entry.roadUse : [];
      let rt: string | null = null;
      const rn = routeNumbers?.[0] ?? "";
      if (roadUse.includes("Motorway") || /^M\d/i.test(rn)) rt = "Motorway";
      else if (/^A\d/i.test(rn) || roadUse.includes("Arterial") || roadUse.includes("LimitedAccess"))
        rt = "A Road";
      else if (/^B\d/i.test(rn) || roadUse.includes("Terminal")) rt = "B Road";
      else if (road) rt = "Local road";
      setRoadType(rt);
    } catch (e) {
      console.error('[live] TomTom failed:', e);
    }


    if (limit != null) {
      setSpeedLimit(limit);
      speedLimitRef.current = limit;
    }
    if (road) {
      setRoadName(road);
      roadNameRef.current = road;
    }
    try {
      await supabase.from("speed_limit_cache").upsert({
        latitude: Number(lat.toFixed(3)),
        longitude: Number(lng.toFixed(3)),
        speed_limit_mph: limit,
        road_name: road,
        fetched_at: new Date().toISOString(),
      });
    } catch (e) {
      // ignore
    }
  }

  async function saveCoordinates(final = false, extras: Record<string, any> = {}) {
    if (!routeIdRef.current) return false;
    const speeds = coordsRef.current.map((c) => c.speed_mph).filter((s) => s > 0);
    const maxSpeed = speeds.length ? Math.max(...speeds) : 0;
    const avgSpeed = speeds.length
      ? Math.round(speeds.reduce((a, b) => a + b, 0) / speeds.length)
      : 0;
    const payload: Record<string, any> = {
      coordinates: coordsRef.current,
      max_speed_mph: maxSpeed,
      avg_speed_mph: avgSpeed,
      distance_miles: Number((distanceKm * 0.621371).toFixed(3)),
      ...extras,
    };
    if (final) {
      payload.ended_at = new Date().toISOString();
      payload.duration_minutes = Math.round(
        (Date.now() - startedAtRef.current) / 60000,
      );
    }
    try {
      const { error } = await supabase.from("lesson_routes").update(payload).eq("id", routeIdRef.current);
      if (error) {
        console.warn("[live] save route failed", error);
        return false;
      }
      return true;
    } catch (e) {
      console.warn("[live] save route failed", e);
      return false;
    }
  }


  async function recordOverspeed(
    speed: number,
    limit: number,
    lat: number,
    lng: number,
    road: string | null,
  ) {
    const excess = speed - limit;
    const at = Date.now();
    if (routeIdRef.current && userIdRef.current) {
      try {
        await supabase.from("overspeed_events").insert({
          lesson_route_id: routeIdRef.current,
          instructor_id: userIdRef.current,
          recorded_at: new Date(at).toISOString(),
          speed_mph: speed,
          speed_limit_mph: limit,
          excess_mph: excess,
          latitude: lat,
          longitude: lng,
          road_name: road,
        });
      } catch (e) {
        console.warn("[live] overspeed insert failed", e);
      }
    }
    setOverspeedCount((c) => c + 1);
    setOverspeedEvents((arr) => [
      { at, speed_mph: speed, speed_limit_mph: limit, excess_mph: excess, road_name: road },
      ...arr,
    ]);
  }

  async function startTracking(lessonId: string | null, pupilId: string | null) {
    console.log("[live] startTracking requested", { lessonId, pupilId, tracking });
    if (tracking) {
      console.log("[live] startTracking ignored — already tracking");
      return;
    }

    // requestPermissions() is native-only — it throws "Not implemented on web".
    // On web the browser prompts during getCurrentPosition instead.
    if (Capacitor.isNativePlatform()) {
      try {
        const permission = await Geolocation.requestPermissions();
        if (permission.location !== "granted" && permission.coarseLocation !== "granted") {
          toast.error("Location permission required for Live Track");
          setGeoError("Location permission is off — tap to open settings, then try again");
          setActivePupilId(null);
          setTrackingPupilName(null);
          return;
        }
      } catch (err) {
        console.error("[live] requestPermissions failed", err);
        // Fall through — getCurrentPosition/watchPosition will surface real errors.
      }
    }


    // Ask for a one-shot fix first so we get an immediate position.
    try {
      console.log("[live] requesting initial GPS fix...");
      const position = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 30000,
      });
      console.log("[live] got initial fix:", position.coords.latitude, position.coords.longitude, "accuracy:", position.coords.accuracy);
      handlePosition({
        coords: {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          speed: position.coords.speed,
          heading: position.coords.heading,
          altitude: null,
          altitudeAccuracy: null,
        },
        timestamp: position.timestamp,
      } as GeolocationPosition);
    } catch (err) {
      console.error("[live] initial fix failed", err);
      // Continue — the watch will deliver the first fix.
    }

    setGeoError(null);
    startedAtRef.current = Date.now();
    coordsRef.current = [];
    setCoordinates([]);
    setDistanceKm(0);
    setOverspeedCount(0);
    setOverspeedEvents([]);
    setElapsedSec(0);
    routeIdRef.current = null;

    // Start tracking immediately — never block the UI on the route insert
    setTracking(true);
    startSilentAudio();
    startWatching();


    // Create the route record in the background
    void (async () => {
      try {
        // Ensure session is fresh before insert
        await supabase.auth.getSession();

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
        if (error) {
          console.error("[live] create route failed", error);
          toast.error("Tracking started, but the route couldn't be saved");
          return;
        }
        console.log("[live] route created", data?.id);
        routeIdRef.current = data?.id ?? null;
      } catch (e) {
        console.error("[live] create route ex", e);
        toast.error("Tracking started, but the route couldn't be saved");
      }
    })();
  }

  function startGpsWatch() {
    startWatching();
  }

  async function startWatching() {
    // Capacitor Geolocation is always available — no need to check.
    // Guard — clear any existing watch before starting new one.
    if (watchIdRef.current !== null) {
      await Geolocation.clearWatch({ id: watchIdRef.current as string });
      watchIdRef.current = null;
    }

    console.log("[live] starting geolocation watch");
    watchIdRef.current = await Geolocation.watchPosition(
      {
        enableHighAccuracy: true,
        timeout: 10000,
      },
      (position, err) => {
        console.log("[live] watch position callback fired, position:", position?.coords?.latitude, "err:", err);
        if (err) {
          console.error("[live] geolocation error:", err);
          return;
        }
        if (position) {
          handlePosition({
            coords: {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracy: position.coords.accuracy,
              speed: position.coords.speed,
              heading: position.coords.heading,
              altitude: null,
              altitudeAccuracy: null,
            },
            timestamp: position.timestamp,
          } as GeolocationPosition);
        }
      }
    );
  }

  function startSilentAudio() {
    try {
      if (silentAudioRef.current) return;
      const audio = new Audio();
      audio.src = SILENT_AUDIO_SRC;
      audio.loop = true;
      audio.volume = 0.001;
      void audio.play().catch(() => {});
      silentAudioRef.current = audio;
    } catch {
      // ignore — audio is only a background-keepalive hint
    }
  }

  function stopSilentAudio() {
    try {
      silentAudioRef.current?.pause();
    } catch {
      // ignore
    }
    silentAudioRef.current = null;
  }

  async function snapToRoads(
    points: { lat: number; lng: number }[],
  ): Promise<{ lat: number; lng: number }[]> {
    if (points.length < 2) return points;
    try {
      const res = await fetch(
        `https://api.tomtom.com/snap-to-roads/1/snap-to-roads?key=${TOMTOM_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            points: points.map((p) => ({ lat: p.lat, lon: p.lng })),
          }),
        },
      );
      if (!res.ok) {
        console.warn("[live] snap-to-roads failed:", res.status);
        return points;
      }
      const data = await res.json();
      const snapped = data?.snappedPoints ?? data?.points ?? [];
      if (!Array.isArray(snapped) || snapped.length === 0) return points;
      const mapped = snapped
        .map((p: any) => ({
          lat: p?.lat ?? p?.latitude ?? p?.position?.lat ?? p?.position?.latitude,
          lng: p?.lon ?? p?.lng ?? p?.longitude ?? p?.position?.lon ?? p?.position?.longitude,
        }))
        .filter((p: any) => typeof p.lat === "number" && typeof p.lng === "number");
      return mapped.length ? mapped : points;
    } catch (e) {
      console.warn("[live] snap error:", e);
      return points;
    }
  }

  async function handlePosition(pos: GeolocationPosition) {

    const lat = pos.coords.latitude;
    const lng = pos.coords.longitude;
    const speedMs = pos.coords.speed;
    console.log("[live] position update:", pos.coords.latitude, pos.coords.longitude, "speed:", pos.coords.speed);
    const mph = speedMs != null && speedMs > 0 ? Math.round(speedMs * 2.23694) : 0;
    const heading = pos.coords.heading ?? null;
    const accuracy = pos.coords.accuracy ?? 999;
    if (accuracy > 100) {
      // GPS accuracy worse than 100m — skip this point
      console.log('[live] skipping low accuracy point:', accuracy + 'm');
      return;
    }
    const prev = coordsRef.current[coordsRef.current.length - 1];
    if (prev) {
      const dMetres = haversineKm(prev, { lat, lng }) * 1000;
      if (dMetres < 5) {
        // Less than 5 metres from last point — skip (stationary jitter)
        return;
      }
    }
    if (prev && mph > 0) {
      const timeDiff = (Date.now() - prev.timestamp) / 1000;
      const prevMph = prev.speed_mph ?? 0;
      const speedJump = Math.abs(mph - prevMph);
      if (timeDiff < 2 && speedJump > 40) {
        // Speed jumped more than 40mph in under 2 seconds — GPS glitch, skip this point
        console.log("[live] skipping speed anomaly:", speedJump + "mph jump");
        return;
      }
    }
    const point: Coord = { lat, lng, speed_mph: mph, heading, timestamp: Date.now(), road_name: roadNameRef.current, speed_limit_mph: speedLimitRef.current };
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
        const rawCoords = coordsRef.current
          .map((c) => ({ lat: c.lat, lng: c.lng }))
          .filter((c) => typeof c.lat === "number" && typeof c.lng === "number");
        if (rawCoords.length % 5 === 0 || rawCoords.length < 5) {
          // Snap every 5 points to keep the line following the road.
          // Non-blocking so the marker/stats update immediately.
          void snapToRoads(rawCoords).then((snapped) => {
            if (!polylineRef.current) return;
            polylineRef.current.setPath(
              snapped.map((c) => new google.maps.LatLng(c.lat, c.lng)),
            );
          });
        } else {

          const path = polylineRef.current.getPath();
          path.push(new google.maps.LatLng(lat, lng));
        }
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

    const distMetres = (
      a: { lat: number; lng: number },
      b: { lat: number; lng: number },
    ) => {
      const R = 6371000;
      const dLat = ((b.lat - a.lat) * Math.PI) / 180;
      const dLng = ((b.lng - a.lng) * Math.PI) / 180;
      const aa =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((a.lat * Math.PI) / 180) *
          Math.cos((b.lat * Math.PI) / 180) *
          Math.sin(dLng / 2) *
          Math.sin(dLng / 2);
      return R * 2 * Math.atan2(Math.sqrt(aa), Math.sqrt(1 - aa));
    };

    const last = lastRoadFetchRef.current;
    const movedEnough = !last || distMetres(last, { lat, lng }) > 20;
    if (movedEnough) {
      lastRoadFetchRef.current = { lat, lng };
      ensureSpeedLimit(lat, lng);
    }

    const currentLimit = speedLimitRef.current;
    const currentRoad = roadNameRef.current;
    if (currentLimit != null && mph > currentLimit + 2) {
      const now = Date.now();
      if (overspeedSinceRef.current == null) {
        overspeedSinceRef.current = now;
      } else if (
        now - overspeedSinceRef.current > 2000 &&
        now - lastOverspeedInsertRef.current > 15000
      ) {
        lastOverspeedInsertRef.current = now;
        setIsOverSpeeding(true);
        recordOverspeed(mph, currentLimit, lat, lng, currentRoad);
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
    if (isStoppingRef.current) return;
    isStoppingRef.current = true;
    try {
      if (watchIdRef.current != null) {
        await Geolocation.clearWatch({ id: watchIdRef.current as string });
        watchIdRef.current = null;
      }

      stopSilentAudio();
      await saveCoordinates(true);

      setTracking(false);


      // Build report by grouping consecutive points sharing road_name
      const pts = coordsRef.current;
      const { segments, overallMaxSpeed: overallMax } = buildTripReport(pts);

      const pupilName =
        trackingPupilName ??
        activeLesson?.pupils?.name ??
        "this pupil";

      setReportData({
        pupilName,
        totalDistanceMiles: distanceKm * 0.621371,
        totalDurationSec: elapsedSec,
        overallMaxSpeed: overallMax,
        overspeedCount,
        segments,
        lessonId: activeLessonId,
      });
      setShowReport(true);
    } finally {
      isStoppingRef.current = false;
    }
  }


  function finishReport() {
    const lid = reportData?.lessonId ?? activeLessonId;
    setShowReport(false);
    if (lid) {
      navigate({ to: "/lessons/$id", params: { id: lid } });
    } else {
      navigate({ to: "/home" });
    }
  }

  const speedColor = isOverSpeeding ? "#EF4444" : "#ffffff";
  const elapsedMin = Math.floor(elapsedSec / 60);
  const elapsedSecRem = elapsedSec % 60;
  const distanceMiles = distanceKm * 0.621371;

  async function exportReportPdf(r: ReportData, includePoints: boolean = false) {
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const margin = 40;
    let y = margin;

    // Navy header band
    doc.setFillColor(11, 31, 58);
    doc.rect(0, 0, pageW, 90, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text("TRIP REPORT", margin, 34);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text(r.pupilName, margin, 58);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(`Saved to ${r.pupilName}'s record`, margin, 76);
    y = 120;

    // Summary
    const durMin = Math.floor(r.totalDurationSec / 60);
    const durSec = r.totalDurationSec % 60;
    const summary = [
      ["Distance", `${r.totalDistanceMiles.toFixed(1)} mi`],
      ["Duration", `${durMin}m ${durSec}s`],
      ["Max speed", `${Math.round(r.overallMaxSpeed)} mph`],
      ["Overspeed", `${r.overspeedCount}`],
    ];
    const colW = (pageW - margin * 2) / 2;
    doc.setDrawColor(229, 231, 235);
    summary.forEach(([label, value], i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const bx = margin + col * colW;
      const by = y + row * 60;
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(bx, by, colW - 8, 52, 6, 6, "FD");
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(107, 114, 128);
      doc.text(label.toUpperCase(), bx + 10, by + 16);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(15);
      const isOverspeedRed = label === "Overspeed" && r.overspeedCount > 0;
      doc.setTextColor(...(isOverspeedRed ? [204, 34, 41] : [11, 31, 58]) as [number, number, number]);
      doc.text(value, bx + 10, by + 38);
    });
    y += 60 * Math.ceil(summary.length / 2) + 16;

    // Segments header
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(107, 114, 128);
    doc.text(`ROAD SEGMENTS (${r.segments.length})`, margin, y);
    y += 14;

    // Segments
    doc.setDrawColor(229, 231, 235);
    r.segments.forEach((seg) => {
      const rowH = 52;
      if (y + rowH > pageH - margin) {
        doc.addPage();
        y = margin;
      }
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(margin, y, pageW - margin * 2, rowH, 6, 6, "FD");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(11, 31, 58);
      const nameMax = pageW - margin * 2 - (seg.exceeded ? 90 : 20);
      const name = doc.splitTextToSize(seg.road_name, nameMax)[0];
      doc.text(name, margin + 10, y + 18);

      if (seg.exceeded) {
        doc.setFillColor(204, 34, 41);
        doc.roundedRect(pageW - margin - 78, y + 8, 68, 16, 8, 8, "F");
        doc.setTextColor(255, 255, 255);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.text("EXCEEDED", pageW - margin - 44, y + 19, { align: "center" });
      }

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(55, 65, 81);
      const limit = seg.speed_limit_mph != null ? `${seg.speed_limit_mph} mph` : "Not available";
      const meta = `${seg.distance_miles.toFixed(2)} mi   ·   Limit: ${limit}   ·   Avg: ${Math.round(seg.avg_speed_mph)} mph   ·   Max: ${Math.round(seg.max_speed_mph)} mph`;
      doc.text(meta, margin + 10, y + 40);

      y += rowH + 6;

      if (includePoints && seg.points.length > 0) {
        const tableW = pageW - margin * 2;
        const timeColW = tableW * 0.55;
        const speedColW = tableW * 0.45;
        const headerH = 18;
        const rowPtH = 14;

        // Table header
        if (y + headerH > pageH - margin) { doc.addPage(); y = margin; }
        doc.setFillColor(243, 244, 246);
        doc.rect(margin, y, tableW, headerH, "F");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.setTextColor(107, 114, 128);
        doc.text("TIME", margin + 8, y + 12);
        doc.text("SPEED", margin + timeColW + 8, y + 12);
        y += headerH;

        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        seg.points.forEach((pt, j) => {
          if (y + rowPtH > pageH - margin) {
            doc.addPage();
            y = margin;
            // repeat header on new page
            doc.setFillColor(243, 244, 246);
            doc.rect(margin, y, tableW, headerH, "F");
            doc.setFont("helvetica", "bold");
            doc.setFontSize(8);
            doc.setTextColor(107, 114, 128);
            doc.text("TIME", margin + 8, y + 12);
            doc.text("SPEED", margin + timeColW + 8, y + 12);
            y += headerH;
            doc.setFont("helvetica", "normal");
            doc.setFontSize(9);
          }
          if (j % 2 === 1) {
            doc.setFillColor(249, 250, 251);
            doc.rect(margin, y, tableW, rowPtH, "F");
          }
          doc.setTextColor(55, 65, 81);
          const t = new Date(pt.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
          doc.text(t, margin + 8, y + 10);
          if (pt.over) {
            doc.setTextColor(204, 34, 41);
            doc.setFont("helvetica", "bold");
          } else {
            doc.setTextColor(11, 31, 58);
          }
          doc.text(`${Math.round(pt.speed_mph)} mph`, margin + timeColW + 8, y + 10);
          doc.setFont("helvetica", "normal");
          y += rowPtH;
        });
        y += 8;
      }
    });

    if (r.segments.length === 0) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      doc.setTextColor(107, 114, 128);
      doc.text("No segments recorded.", margin, y + 14);
    }

    // Footer
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(156, 163, 175);
    doc.text(`Generated ${new Date().toLocaleString("en-GB")}`, margin, pageH - 20);

    const safeName = r.pupilName.replace(/[^a-z0-9]+/gi, "_").toLowerCase();
    const date = new Date().toISOString().slice(0, 10);
    doc.save(`trip-report${includePoints ? "-detailed" : ""}-${safeName}-${date}.pdf`);
  }

  if (showReport && reportData) {
    const r = reportData;
    const durMin = Math.floor(r.totalDurationSec / 60);
    const durSec = r.totalDurationSec % 60;
    return (
      <div className="fixed inset-0 overflow-y-auto" style={{ ...POPPINS, backgroundColor: "#F5F7FA" }}>
        {/* Header */}
        <div style={{ backgroundColor: "#0B1F3A", color: "#fff", padding: "20px 16px 24px", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
          <div style={{ fontSize: 12, letterSpacing: 1, opacity: 0.7, textTransform: "uppercase" }}>Trip report</div>
          <div style={{ fontSize: 22, fontWeight: 700, marginTop: 4 }}>{r.pupilName}</div>
          <div style={{ fontSize: 13, opacity: 0.8, marginTop: 6 }}>Saved to {r.pupilName}'s record</div>
        </div>

        {/* Summary */}
        <div style={{ padding: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {[
              { label: "Distance", value: `${r.totalDistanceMiles.toFixed(1)} mi` },
              { label: "Duration", value: `${durMin}m ${durSec}s` },
              { label: "Max speed", value: `${Math.round(r.overallMaxSpeed)} mph` },
              { label: "Overspeed", value: `${r.overspeedCount}`, red: r.overspeedCount > 0 },
            ].map((s) => (
              <div key={s.label} style={{ backgroundColor: "#fff", border: "1px solid #E5E7EB", borderRadius: 8, padding: 12, boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
                <div style={{ fontSize: 11, letterSpacing: 0.5, color: "#6B7280", textTransform: "uppercase" }}>{s.label}</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: s.red ? "#CC2229" : "#0B1F3A", marginTop: 4 }}>{s.value}</div>
              </div>
            ))}
          </div>

          {/* Segments */}
          <div style={{ marginTop: 20, fontSize: 12, letterSpacing: 0.5, color: "#6B7280", textTransform: "uppercase", fontWeight: 600 }}>
            Road segments ({r.segments.length})
          </div>
          <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 8 }}>
            {r.segments.length === 0 && (
              <div style={{ backgroundColor: "#fff", border: "1px solid #E5E7EB", borderRadius: 8, padding: 16, textAlign: "center", color: "#6B7280", fontSize: 13 }}>
                No segments recorded.
              </div>
            )}
            {r.segments.map((seg, i) => {
              const isOpen = expandedSegments.has(i);
              return (
              <div key={i} style={{ backgroundColor: "#fff", border: "1px solid #E5E7EB", borderRadius: 8, boxShadow: "0 1px 3px rgba(0,0,0,0.06)", overflow: "hidden" }}>
                <button
                  onClick={() => setExpandedSegments((prev) => { const n = new Set(prev); if (n.has(i)) n.delete(i); else n.add(i); return n; })}
                  style={{ width: "100%", background: "transparent", border: "none", padding: 12, textAlign: "left", cursor: "pointer" }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                    <div style={{ fontSize: 15, fontWeight: 600, color: "#0B1F3A", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {seg.road_name}
                    </div>
                    {seg.exceeded && (
                      <span style={{ fontSize: 11, fontWeight: 700, color: "#fff", backgroundColor: "#CC2229", padding: "3px 8px", borderRadius: 999 }}>
                        Exceeded
                      </span>
                    )}
                    <span style={{ fontSize: 12, color: "#6B7280", marginLeft: 4 }}>{isOpen ? "▲" : "▼"}</span>
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 8, fontSize: 12, color: "#374151" }}>
                    <span><b style={{ color: "#0B1F3A" }}>{seg.distance_miles.toFixed(2)} mi</b></span>
                    <span>Duration: <b style={{ color: "#0B1F3A" }}>{seg.points.length > 1 ? formatDurationMs(seg.points[seg.points.length - 1].timestamp - seg.points[0].timestamp) : "—"}</b></span>
                    <span>Limit: <b style={{ color: "#0B1F3A" }}>{seg.speed_limit_mph != null ? `${seg.speed_limit_mph} mph` : "Not available"}</b></span>
                    <span>Avg: <b style={{ color: "#0B1F3A" }}>{Math.round(seg.avg_speed_mph)} mph</b></span>
                    <span>Max: <b style={{ color: seg.exceeded ? "#CC2229" : "#0B1F3A" }}>{Math.round(seg.max_speed_mph)} mph</b></span>
                    <span style={{ color: "#6B7280" }}>{seg.points.length} pts</span>
                  </div>
                </button>
                {isOpen && (
                  <div style={{ borderTop: "1px solid #E5E7EB", backgroundColor: "#F9FAFB", maxHeight: 260, overflowY: "auto" }}>
                    <SegmentSpeedChart points={seg.points} speedLimitMph={seg.speed_limit_mph} />
                    {seg.points.length === 0 ? (
                      <div style={{ padding: 12, fontSize: 12, color: "#6B7280", textAlign: "center" }}>No points</div>
                    ) : (
                      seg.points.map((pt, j) => (
                        <div key={j} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", borderTop: j === 0 ? "none" : "1px solid #F1F5F9", fontSize: 12, fontVariantNumeric: "tabular-nums" }}>
                          <span style={{ color: "#374151" }}>{new Date(pt.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</span>
                          <span style={{ fontWeight: 600, color: pt.over ? "#CC2229" : "#0B1F3A" }}>{Math.round(pt.speed_mph)} mph</span>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
              );
            })}
          </div>

          <button
            onClick={() => exportReportPdf(r)}
            style={{
              marginTop: 24,
              width: "100%",
              padding: "14px 16px",
              borderRadius: 8,
              border: "1px solid #1877D6",
              backgroundColor: "#fff",
              color: "#1877D6",
              fontSize: 15,
              fontWeight: 700,
              cursor: "pointer",
              boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
            }}
          >
            Export as PDF
          </button>
          <button
            onClick={() => exportReportPdf(r, true)}
            style={{
              marginTop: 10,
              width: "100%",
              padding: "14px 16px",
              borderRadius: 8,
              border: "1px solid #1877D6",
              backgroundColor: "#1877D6",
              color: "#fff",
              fontSize: 15,
              fontWeight: 700,
              cursor: "pointer",
              boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
            }}
          >
            Export as PDF (detailed)
          </button>
          <button
            onClick={finishReport}
            style={{
              marginTop: 10,
              width: "100%",
              padding: "14px 16px",
              borderRadius: 8,
              border: "none",
              backgroundColor: "#1877D6",
              color: "#fff",
              fontSize: 15,
              fontWeight: 700,
              cursor: "pointer",
              boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
            }}
          >
            Done
          </button>
          <div style={{ height: 32 }} />
        </div>
      </div>
    );
  }



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


      {/* TOP BAR — standard DSM header */}
      <div
        className="absolute top-0 left-0 right-0 z-[1000] flex items-center justify-between"
        style={{
          minHeight: 56,
          paddingTop: "calc(env(safe-area-inset-top, 0px) + 10px)",
          paddingBottom: 10,
          paddingLeft: 16,
          paddingRight: 16,
          background: "#FFFFFF",
        }}
      >
        <button
          type="button"
          aria-label="Back"
          onClick={() => navigate({ to: '/home' as never, replace: true })}
          className="flex items-center justify-center"
          style={{
            width: 36,
            height: 36,
            borderRadius: 0,
            background: "#F1F4F8",
            border: "none",
            cursor: "pointer",
            padding: 0,
          }}
        >
          <IconChevronLeft size={20} color="#0B1F3A" stroke={2} />
        </button>

        <div
          className="absolute left-1/2 -translate-x-1/2"
          style={{
            color: "#000000",
            fontSize: 17,
            fontWeight: 700,
            fontFamily: "Poppins, sans-serif",
          }}
        >
          Live Tracking
        </div>

        <button
          type="button"
          aria-label="End tracking"
          onClick={() => {
            if (isStoppingRef.current) return;
            if (tracking) {
              stopTracking();
            } else {
              navigate({ to: "/home" });
            }
          }}
          className="flex items-center justify-center"
          style={{
            padding: "8px 16px",
            borderRadius: 0,
            background: "#CC2229",
            color: "#FFFFFF",
            fontSize: 13,
            fontWeight: 800,
            letterSpacing: "0.3px",
            boxShadow: "0 3px 0 #B02318",
            border: "none",
            cursor: "pointer",
          }}
        >
          END
        </button>
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
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 700,
            letterSpacing: "0.02em",
            boxShadow: "0 8px 24px rgba(239,68,68,0.4)",
            animation: "overspeedFlash 0.8s ease-in-out infinite",
            whiteSpace: "nowrap",
          }}
        >
          OVER SPEED LIMIT · {currentSpeed}mph in a {speedLimit}mph zone{roadName ? ` · ${roadName}` : ""}
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
            borderRadius: 8,
            maxWidth: 300,
            width: "calc(100% - 40px)",
            textAlign: "center",
            color: "#0B1F3A",
            fontSize: 14,
            boxShadow: "0 8px 30px rgba(0,0,0,0.3)",
          }}
        >
          <div style={{ marginBottom: 12, lineHeight: 1.4 }}>{geoError}</div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="button"
              onClick={() => window.open("app-settings:", "_blank")}
              style={{
                flex: 1,
                height: 42,
                borderRadius: 8,
                background: "#fff",
                border: "1px solid #E2E8F0",
                color: "#0B1F3A",
                fontSize: 14,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Open settings
            </button>
            <button
              type="button"
              onClick={() => {
                setGeoError(null);
                void startTracking(activeLessonId, activePupilId);
              }}
              style={{
                flex: 1,
                height: 42,
                borderRadius: 8,
                background: "#1877D6",
                border: "none",
                color: "#fff",
                fontSize: 14,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Try again
            </button>
          </div>
        </div>
      )}


      {/* UNIFIED SPEED PILL */}
      {(() => {
        const rn = roadName ?? "";
        const m = rn.match(/^([MABE]\s?\d+[A-Z]*)\b[\s,·-]*(.*)$/i);
        const roadTag = m ? m[1].replace(/\s/g, "").toUpperCase() : null;
        const roadLabel = m ? (m[2] || "").trim() || null : rn || null;
        const over = !!(isOverSpeeding && speedLimit != null && currentSpeed != null);
        const excess = over ? Math.max(0, (currentSpeed ?? 0) - (speedLimit ?? 0)) : 0;
        const zone20 = speedLimit === 20 && !over;
        const maxSpeedMph = Math.max(
          currentSpeed ?? 0,
          ...coordsRef.current.map((c) => c.speed_mph ?? 0),
          0,
        );
        const roadNameText =
          roadTag && roadLabel ? `${roadTag} · ${roadLabel}` : roadLabel || roadTag || "Road not identified";
        const hasSign =
          (roadType === "Motorway") ||
          (roadType === "A Road" && !!roadTag) ||
          (roadType === "B Road" && !!roadTag);
        return (
          <div
            className="absolute z-[1000]"
            style={{
              left: 16,
              right: 16,
              bottom: "calc(env(safe-area-inset-bottom, 0px) + 100px)",
              background: "rgba(10,22,40,0.9)",
              backdropFilter: "blur(8px)",
              borderRadius: 8,
              padding: "14px 16px",
              fontFamily: "Poppins, sans-serif",
            }}
          >
            {/* Top row */}
            <div className="flex items-center">
              {/* Speed limit roundel */}
              <div
                className="flex items-center justify-center"
                style={{
                  flexShrink: 0,
                  width: 48,
                  height: 48,
                  borderRadius: "50%",
                  background: over ? "#CC2229" : zone20 ? "#FEF3C7" : "#fff",
                  border: `4px solid ${over ? "#FF6B6B" : zone20 ? "#F59E0B" : "#CC2229"}`,
                }}
              >
                <span
                  style={{
                    fontSize: 18,
                    fontWeight: 800,
                    lineHeight: 1,
                    color: speedLimit == null ? "#6B7686" : over ? "#fff" : zone20 ? "#92400E" : "#0B1F3A",
                  }}
                >
                  {speedLimit ?? "—"}
                </span>
              </div>

              {/* Centre: speed + road name */}
              <div style={{ flex: 1, minWidth: 0, textAlign: "center", padding: "0 12px" }}>
                <div className="flex items-baseline justify-center" style={{ gap: 4 }}>
                  <span style={{ fontSize: 36, fontWeight: 800, lineHeight: 1, color: over ? "#FF6B6B" : "#fff" }}>
                    {currentSpeed ?? 0}
                  </span>
                  <span style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", paddingBottom: 3 }}>mph</span>
                </div>
                <div
                  style={{
                    marginTop: 4,
                    fontSize: 16,
                    fontWeight: over ? 600 : 400,
                    color: over ? "#FF6B6B" : "#fff",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {over ? `${excess} mph over` : roadNameText}
                </div>
              </div>

              {/* Right: road sign */}
              {hasSign ? (
                <span style={{ flexShrink: 0 }}>
                  {roadType === "Motorway" && <MotorwaySymbol tag={roadTag} over={over} />}
                  {roadType === "A Road" && roadTag && <ARoadPlate tag={roadTag} over={over} />}
                  {roadType === "B Road" && roadTag && <BRoadPlate tag={roadTag} over={over} />}
                </span>
              ) : zone20 ? (
                <span
                  style={{
                    flexShrink: 0,
                    background: "#F59E0B",
                    color: "#92400E",
                    fontSize: 11,
                    fontWeight: 700,
                    padding: "4px 8px",
                    borderRadius: 8,
                    whiteSpace: "nowrap",
                  }}
                >
                  20 zone
                </span>
              ) : (
                <div style={{ width: 46, flexShrink: 0 }} />
              )}
            </div>

            {/* Divider */}
            <div style={{ height: 1, background: "rgba(255,255,255,0.1)", margin: "12px 0" }} />

            {/* Bottom stats */}
            <div className="flex" style={{ justifyContent: "space-between" }}>
              {[
                { v: distanceMiles.toFixed(1), l: "miles", c: "#fff", lc: "#6B7686" },
                {
                  v: `${elapsedMin}:${String(elapsedSecRem).padStart(2, "0")}`,
                  l: "elapsed",
                  c: "#fff",
                  lc: "#6B7686",
                },
                { v: String(Math.round(maxSpeedMph)), l: "max mph", c: "#fff", lc: "#6B7686" },
                {
                  v: String(overspeedCount),
                  l: "overspeed",
                  c: overspeedCount > 0 ? "#CC2229" : "#15803D",
                  lc: overspeedCount > 0 ? "#CC2229" : "#15803D",
                },
              ].map((s) => (
                <div key={s.l} style={{ flex: 1, textAlign: "center" }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: s.c, lineHeight: 1.1 }}>{s.v}</div>
                  <div
                    style={{
                      fontSize: 9,
                      color: s.lc,
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      marginTop: 2,
                    }}
                  >
                    {s.l}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })()}




      {/* MANUAL START OVERLAY — shown when no active lesson and not yet tracking */}
      {lessonsLoaded && !tracking && !activeLessonId && !activePupilId && !geoError && (
        <div
          className="absolute z-[1050]"
          style={{
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: "calc(100% - 40px)",
            maxWidth: 340,
            background: "#fff",
            border: "0.5px solid #EEF2F7",
            borderRadius: 8,
            padding: 24,
            textAlign: "center",
            boxShadow: "0 12px 40px rgba(0,0,0,0.25)",
          }}
        >
          <div className="flex items-center justify-center" style={{ marginBottom: 12 }}>
            <IconMap size={44} color="#1877D6" stroke={1.8} />
          </div>
          <div style={{ fontSize: 18, fontWeight: 700, color: "#0B1F3A", marginBottom: 6 }}>
            No active lesson
          </div>
          <div style={{ fontSize: 13, color: "#6B7280", marginBottom: 20, lineHeight: 1.4 }}>
            You can still track this journey manually
          </div>
          <button
            type="button"
            onClick={() => {
              void startTracking(null, null);
            }}
            style={{
              width: "100%",
              height: 46,
              borderRadius: 8,
              background: "#1877D6",
              border: "none",
              color: "#fff",
              fontSize: 15,
              fontWeight: 700,
              cursor: "pointer",
              marginBottom: 8,
              boxShadow: "0 4px 12px rgba(26,82,160,0.3)",
            }}
          >
            Start manual tracking
          </button>
          <button
            type="button"
            onClick={() => setPupilPickerOpen(true)}
            style={{
              width: "100%",
              height: 46,
              borderRadius: 8,
              background: "#fff",
              border: "1.5px solid #1877D6",
              color: "#1877D6",
              fontSize: 15,
              fontWeight: 700,
              cursor: "pointer",
              marginBottom: 8,
            }}
          >
            Select pupil
          </button>
          <button
            type="button"
            onClick={() => navigate({ to: "/home" })}
            style={{
              width: "100%",
              height: 42,
              borderRadius: 8,
              background: "transparent",
              border: "none",
              color: "#6B7280",
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Back
          </button>
        </div>
      )}



      {/* BOTTOM PANEL */}
      <div
        className="absolute left-0 right-0 bottom-0 z-[1000] bg-white"
        style={{
          borderRadius: "8px 8px 0 0",
          padding: "10px 20px",
          paddingBottom: "calc(20px + env(safe-area-inset-bottom, 0px))",
          boxShadow: "0 -4px 20px rgba(0,0,0,0.15)",
        }}
      >
        {activeLesson ? (
          <div style={{ marginBottom: 8 }}>
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
              <div style={{ fontSize: 15, fontWeight: 700, color: "#0B1F3A" }}>
                {activeLesson.pupils?.name ?? "Pupil"}
              </div>
              <div style={{ fontSize: 13, color: "#6B7280", fontWeight: 600 }}>
                {(activeLesson.lesson_time ?? "").slice(0, 5)}
              </div>
            </div>
          </div>
        ) : tracking ? (
          <div className="flex items-center justify-between" style={{ gap: 12, padding: "4px 0" }}>
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  fontSize: 10,
                  letterSpacing: "0.08em",
                  color: "#6B7280",
                  textTransform: "uppercase",
                  fontWeight: 600,
                  lineHeight: 1.2,
                }}
              >
                {coordinates.length === 0 ? "Acquiring GPS signal…" : "Tracking"}
              </div>
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  color: "#0B1F3A",
                  lineHeight: 1.2,
                  opacity: coordinates.length === 0 ? 0.6 : 1,
                }}
              >
                {trackingPupilName ?? selectedPupilName ?? activeLessonPupilName ?? "Manual journey"}
              </div>

            </div>

            {/* Compact stats chip */}
            <div
              className="flex items-center"
              style={{
                background: "#EEF2F7",
                borderRadius: 8,
                padding: "6px 10px",
                gap: 10,
                flexShrink: 0,
              }}
            >
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#0B1F3A", lineHeight: 1.2 }}>
                  {distanceMiles.toFixed(1)}
                </div>
                <div style={{ fontSize: 9, color: "#6B7280", lineHeight: 1.2 }}>mi</div>
              </div>
              <div style={{ width: 1, alignSelf: "stretch", background: "#D7DEE8" }} />
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#0B1F3A", lineHeight: 1.2 }}>
                  {elapsedMin}:{String(elapsedSecRem).padStart(2, "0")}
                </div>
                <div style={{ fontSize: 9, color: "#6B7280", lineHeight: 1.2 }}>duration</div>
              </div>
            </div>
          </div>
        ) : (
          <div
            style={{
              fontSize: 13,
              color: "#6B7280",
              fontStyle: "italic",
              padding: "4px 0",
            }}
          >
            No active lesson — tracking route manually
          </div>
        )}


      </div>

      {/* OVERSPEED LIST MODAL */}
      {showOverspeedList && (
        <div
          className="absolute inset-0 z-[1100] flex items-end"
          style={{ background: "rgba(0,0,0,0.5)" }}
          onClick={() => setShowOverspeedList(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#fff",
              width: "100%",
              borderRadius: "8px 8px 0 0",
              padding: "16px 20px",
              paddingBottom: "calc(20px + env(safe-area-inset-bottom, 0px))",
              maxHeight: "70%",
              overflowY: "auto",
            }}
          >
            <div className="flex items-center justify-between" style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: "#0B1F3A" }}>
                Overspeed events ({overspeedEvents.length})
              </div>
              <button
                type="button"
                onClick={() => setShowOverspeedList(false)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#6B7280",
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Close
              </button>
            </div>
            {overspeedEvents.length === 0 ? (
              <div style={{ fontSize: 13, color: "#6B7280" }}>No events yet.</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {overspeedEvents.map((ev, i) => {
                  const t = new Date(ev.at);
                  const hh = String(t.getHours()).padStart(2, "0");
                  const mm = String(t.getMinutes()).padStart(2, "0");
                  return (
                    <div
                      key={i}
                      style={{
                        background: "#F3F4F6",
                        borderRadius: 8,
                        padding: "10px 12px",
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <div style={{ fontSize: 13, fontWeight: 700, color: "#0B1F3A" }}>
                          {ev.road_name ?? "Unknown road"}
                        </div>
                        <div style={{ fontSize: 12, color: "#6B7280", fontWeight: 600 }}>
                          {hh}:{mm}
                        </div>
                      </div>
                      <div style={{ fontSize: 12, color: "#374151", marginTop: 4 }}>
                        {ev.speed_mph}mph in a {ev.speed_limit_mph}mph zone{" "}
                        <span style={{ color: "#EF4444", fontWeight: 700 }}>
                          (excess: +{ev.excess_mph}mph)
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* PUPIL PICKER SHEET — manual tracking against a specific pupil */}
      {pupilPickerOpen && (
        <div
          className="fixed inset-0 z-[1100] flex items-end justify-center"
          style={POPPINS}
        >
          <div
            className="absolute inset-0"
            style={{ background: "rgba(0,0,0,0.4)" }}
            onClick={() => {
              setPupilPickerOpen(false);
              setPupilSearchQuery("");
            }}
          />
          <div
            className="relative w-full max-w-md flex flex-col"
            style={{
              background: "#F2F2F7",
              borderRadius: "8px 8px 0 0",
              maxHeight: "80vh",
              paddingBottom: "calc(12px + env(safe-area-inset-bottom, 0px))",
            }}
          >
            <div className="flex justify-center pb-1" style={{ marginTop: 10 }}>
              <div style={{ width: 36, height: 5, borderRadius: 8, background: "#D1D1D6" }} />
            </div>
            <div className="flex items-center justify-between px-5 pt-2 pb-3">
              <div style={{ fontSize: 20, fontWeight: 800, color: "#0B1F3A", letterSpacing: "-0.3px" }}>
                Select pupil
              </div>
              <button
                type="button"
                onClick={() => {
                  setPupilPickerOpen(false);
                  setPupilSearchQuery("");
                }}
                className="flex items-center justify-center active:opacity-70"
                style={{ width: 30, height: 30, borderRadius: 8, background: "#E5E5EA", border: "none" }}
                aria-label="Close"
              >
                <IconX stroke={2} size={13} color="#6B6B6F" />
              </button>
            </div>
            <div className="px-4 pb-3">
              <div
                className="flex items-center"
                style={{
                  background: "#fff",
                  borderRadius: 8,
                  padding: "13px 16px",
                  gap: 10,
                  boxShadow: "0 3px 0 #E4E4E8",
                }}
              >
                <IconSearch stroke={1.5} size={16} color="#8A8A8E" />
                <input
                  type="text"
                  value={pupilSearchQuery}
                  onChange={(e) => setPupilSearchQuery(e.target.value)}
                  placeholder="Search pupils"
                  autoFocus
                  style={{
                    border: "none",
                    background: "transparent",
                    outline: "none",
                    flex: 1,
                    fontSize: 14.5,
                    color: "#0B1F3A",
                  }}
                  className="live-pupil-search"
                />
              </div>
            </div>
            <div className="overflow-y-auto px-2 pb-4" style={{ flex: 1 }}>
              {(() => {
                const q = pupilSearchQuery.trim().toLowerCase();
                const filtered = allPupils
                  .map((p) => ({
                    p,
                    display:
                      p.name ||
                      `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim() ||
                      "Unnamed",
                  }))
                  .filter(({ display }) => !q || display.toLowerCase().includes(q))
                  .sort((a, b) => a.display.localeCompare(b.display));
                if (filtered.length === 0) {
                  return (
                    <div
                      style={{
                        padding: "24px 16px",
                        textAlign: "center",
                        color: "#6B7280",
                        fontSize: 14,
                      }}
                    >
                      No pupils found
                    </div>
                  );
                }
                return filtered.map(({ p, display }) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      console.log("[live] pupil selected", p.id, display);
                      setPupilPickerOpen(false);
                      setPupilSearchQuery("");
                      setActivePupilId(p.id);
                      setTrackingPupilName(display);
                      void startTracking(null, p.id);
                    }}
                    className="w-full flex items-center active:opacity-80"
                    style={{
                      background: "#fff",
                      border: "none",
                      textAlign: "left",
                      borderRadius: 8,
                      padding: "14px 16px",
                      marginBottom: 10,
                      gap: 13,
                      boxShadow: "0 3px 0 #E4E4E8, 0 8px 18px rgba(0,0,0,0.04)",
                    }}
                  >
                    <PupilAvatar pupil={p} pupilId={p.id} size={44} />
                    <div style={{ fontSize: 16, fontWeight: 700, color: "#0B1F3A" }}>
                      {display}
                    </div>
                    <IconChevronRight size={14} stroke={2} color="#C7C7CC" style={{ marginLeft: "auto" }} />
                  </button>
                ));
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
