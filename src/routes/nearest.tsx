import { createFileRoute } from "@tanstack/react-router";
import * as React from "react";
import { LoadingSpinner } from "@/components/dsm/LoadingSpinner";
import { findNearbyPlaces } from "@/lib/nearest.functions";
import { reverseGeocode } from "@/lib/geocode.functions";
import { openUrl } from "@/lib/openUrl";

export const Route = createFileRoute("/nearest")({
  head: () => ({
    meta: [
      { title: "Nearest — Every Driver Pro" },
      {
        name: "description",
        content:
          "Find toilets, fuel, parking, food, EV chargers and ATMs near your current location while instructing.",
      },
      { property: "og:title", content: "Nearest — Every Driver Pro" },
      {
        property: "og:description",
        content: "Find toilets, fuel, parking, food, EV chargers and ATMs near your current location.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: NearestPage,
});

/* ---------------------------------------------------------------- constants */

const NAVY = "#0B2341";
const BLUE = "#2C97DE";
const BORDER = "#E4E8EF";
const MUTED = "#536579";
const PAGE_BG = "#F4F6F8";

const BROWSER_KEY = import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY as string | undefined;
const SCRIPT_ID = "gmaps-js-sdk";

type GWin = Window & { google?: any };

function loadMaps(): Promise<void> {
  const w = window as GWin;
  if (w.google?.maps) return Promise.resolve();
  if (document.getElementById(SCRIPT_ID)) {
    return new Promise((resolve, reject) => {
      let waited = 0;
      const iv = setInterval(() => {
        waited += 150;
        if ((window as GWin).google?.maps) {
          clearInterval(iv);
          resolve();
        } else if (waited > 10000) {
          clearInterval(iv);
          reject(new Error("Maps timeout"));
        }
      }, 150);
    });
  }
  return new Promise((resolve, reject) => {
    if (!BROWSER_KEY) {
      reject(new Error("Missing Google Maps browser key"));
      return;
    }
    const s = document.createElement("script");
    s.id = SCRIPT_ID;
    s.async = true;
    s.defer = true;
    s.src = `https://maps.googleapis.com/maps/api/js?key=${BROWSER_KEY}&loading=async`;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Failed to load Google Maps JS"));
    document.head.appendChild(s);
  });
}

const CATEGORIES = [
  { id: "toilets", emoji: "🚻", label: "Toilets" },
  { id: "food", emoji: "☕", label: "Food & drink" },
  { id: "fuel", emoji: "⛽", label: "Fuel" },
  { id: "ev", emoji: "⚡", label: "EV charging" },
  { id: "parking", emoji: "🅿️", label: "Parking" },
  { id: "atm", emoji: "🏧", label: "ATM" },
] as const;

const BRANDS = [
  { emoji: "🍟", label: "McDonald's" },
  { emoji: "🥖", label: "Greggs" },
  { emoji: "🛒", label: "Tesco" },
  { emoji: "☕", label: "Costa" },
  { emoji: "☕", label: "Starbucks" },
  { emoji: "⛽", label: "BP" },
  { emoji: "🍕", label: "Subway" },
] as const;

/* ------------------------------------------------------------------ helpers */

function haversine(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

const METRES_PER_MILE = 1609.344;
const RADIUS_OPTIONS = [1, 5, 10, 20] as const;

function fmtDistance(m: number) {
  const mi = m / METRES_PER_MILE;
  return mi < 0.1 ? `${Math.round(m)} m` : `${mi.toFixed(1)} mi`;
}

type Result = {
  id: string;
  name: string;
  address: string;
  distance: number;
  lat: number;
  lng: number;
  rating?: number;
  openNow?: boolean;
  /** EV extras */
  chargers?: number;
  powerKw?: number;
  operational?: boolean | null;
};

type OcmPoi = {
  ID?: number;
  NumberOfPoints?: number | null;
  StatusType?: { IsOperational?: boolean | null } | null;
  AddressInfo?: {
    Title?: string;
    AddressLine1?: string;
    Latitude?: number;
    Longitude?: number;
  } | null;
  Connections?: Array<{ PowerKW?: number | null }> | null;
};

async function fetchEvChargers(lat: number, lng: number, radiusMiles: number): Promise<Result[]> {
  const url =
    `https://api.openchargemap.io/v3/poi/?output=json&latitude=${lat}&longitude=${lng}` +
    `&distance=${radiusMiles}&distanceunit=Miles&maxresults=20&compact=true&verbose=false`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`OpenChargeMap ${res.status}`);
  const rows = (await res.json()) as OcmPoi[];
  return rows
    .filter((r) => typeof r.AddressInfo?.Latitude === "number" && typeof r.AddressInfo?.Longitude === "number")
    .map((r, i) => {
      const plat = r.AddressInfo!.Latitude!;
      const plng = r.AddressInfo!.Longitude!;
      return {
        id: String(r.ID ?? `ocm-${i}`),
        name: r.AddressInfo?.Title ?? "Charging point",
        address: r.AddressInfo?.AddressLine1 ?? "",
        distance: haversine(lat, lng, plat, plng),
        lat: plat,
        lng: plng,
        chargers: r.NumberOfPoints ?? undefined,
        powerKw: r.Connections?.[0]?.PowerKW ?? undefined,
        operational: r.StatusType?.IsOperational ?? null,
      } satisfies Result;
    })
    .sort((a, b) => a.distance - b.distance);
}

/* --------------------------------------------------------------------- page */

function NearestPage() {
  const [pos, setPos] = React.useState<{ lat: number; lng: number } | null>(null);
  const [area, setArea] = React.useState("Locating…");
  const [cat, setCat] = React.useState<string>(CATEGORIES[0].id);
  const [query, setQuery] = React.useState("");
  const [activeQuery, setActiveQuery] = React.useState<string | null>(null);
  const [activeBrand, setActiveBrand] = React.useState<string | null>(null);
  const [results, setResults] = React.useState<Result[]>([]);
  const [locating, setLocating] = React.useState(true);
  const [radiusMi, setRadiusMi] = React.useState<number>(5);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const mapEl = React.useRef<HTMLDivElement | null>(null);
  const mapRef = React.useRef<any>(null);
  const markersRef = React.useRef<any[]>([]);
  const [mapsReady, setMapsReady] = React.useState(false);

  /* Shared locator — used on mount and by the "Use my location" button. */
  const locate = React.useCallback(() => {
    if (!navigator.geolocation) {
      setError("Location is not available on this device");
      setLocating(false);
      return;
    }
    setLocating(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setPos({ lat: p.coords.latitude, lng: p.coords.longitude });
        setLocating(false);
      },
      (err) => {
        setError(
          err.code === err.PERMISSION_DENIED
            ? "Location permission is off. Enable location for Every Driver Pro in your device settings, then tap Use my location."
            : "Could not get your location. Try again outdoors.",
        );
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 },
    );
  }, []);

  /* 1. Geolocation on mount */
  React.useEffect(() => {
    let cancelled = false;
    locate();
    return () => {
      cancelled = true;
    };
  }, []);

  /* 2. Maps SDK — best effort, never blocks the list */
  React.useEffect(() => {
    let cancelled = false;
    loadMaps()
      .then(() => {
        if (!cancelled) setMapsReady(true);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  /* 3. Area name via server-side reverse geocode */
  React.useEffect(() => {
    if (!pos) return;
    let cancelled = false;
    reverseGeocode({ data: { lat: pos.lat, lng: pos.lng } })
      .then((r) => {
        if (!cancelled) setArea(r.town || r.road || "Nearby places");
      })
      .catch(() => {
        if (!cancelled) setArea("Nearby places");
      });
    return () => {
      cancelled = true;
    };
  }, [pos]);

  /* 4. Results — refetch on location, tab or search change */
  React.useEffect(() => {
    if (!pos) return;
    let cancelled = false;
    setLoading(true);
    setError(null);

    const radiusM = Math.round(radiusMi * METRES_PER_MILE);

    const run = async () => {
      try {
        if (!activeQuery && cat === "ev") {
          const rows = await fetchEvChargers(pos.lat, pos.lng, radiusMi);
          if (!cancelled) setResults(rows.filter((r) => r.distance <= radiusM));
          return;
        }
        const r = await findNearbyPlaces({
          data: {
            lat: pos.lat,
            lng: pos.lng,
            category: activeQuery ? "search" : cat,
            ...(activeQuery ? { query: activeQuery } : {}),
            radius: radiusM,
          },
        });
        if (cancelled) return;
        if (r.error) {
          setResults([]);
          setError(r.error);
          return;
        }
        setResults(
          r.places
            .map((p) => ({
              id: p.id,
              name: p.name,
              address: p.address,
              rating: p.rating,
              openNow: p.openNow,
              lat: p.lat,
              lng: p.lng,
              distance: haversine(pos.lat, pos.lng, p.lat, p.lng),
            }))
            .filter((p) => p.distance <= radiusM)
            .sort((a, b) => a.distance - b.distance),
        );
      } catch {
        if (!cancelled) {
          setResults([]);
          setError("Could not load nearby places right now.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [pos, cat, activeQuery, radiusMi]);

  /* 5. Map init + markers */
  React.useEffect(() => {
    if (!mapsReady || !pos || !mapEl.current) return;
    const g = (window as GWin).google;
    if (!g?.maps) return;
    if (!mapRef.current) {
      mapRef.current = new g.maps.Map(mapEl.current, {
        center: pos,
        zoom: 15,
        disableDefaultUI: true,
        zoomControl: true,
      });
      new g.maps.Marker({
        position: pos,
        map: mapRef.current,
        icon: {
          path: g.maps.SymbolPath.CIRCLE,
          scale: 7,
          fillColor: BLUE,
          fillOpacity: 1,
          strokeColor: "#FFFFFF",
          strokeWeight: 3,
        },
        title: "You are here",
      });
    }
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = results.map(
      (r) =>
        new g.maps.Marker({
          position: { lat: r.lat, lng: r.lng },
          map: mapRef.current,
          title: r.name,
        }),
    );
  }, [mapsReady, pos, results]);

  const centreOn = (r: Result) => {
    const g = (window as GWin).google;
    if (mapRef.current && g?.maps) {
      mapRef.current.panTo({ lat: r.lat, lng: r.lng });
      mapRef.current.setZoom(17);
      mapEl.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  const submitSearch = (text: string) => {
    const t = text.trim();
    if (!t) return;
    setActiveQuery(t);
  };

  const clearSearch = () => {
    setQuery("");
    setActiveQuery(null);
    setActiveBrand(null);
  };

  const isEv = !activeQuery && cat === "ev";

  return (
    <div style={{ minHeight: "100vh", background: PAGE_BG, paddingBottom: 96, fontFamily: "Poppins, sans-serif" }}>
      {/* 1. HEADER */}
      <header
        style={{
          background: NAVY,
          color: "#FFFFFF",
          padding: "calc(env(safe-area-inset-top, 0px) + 20px) 16px 20px",
        }}
      >
        <h1 style={{ margin: 0, fontSize: 26, fontWeight: 700, fontFamily: "Sora, sans-serif", color: "#FFFFFF" }}>
          Nearest
        </h1>
        <p style={{ margin: "4px 0 0", fontSize: 13, color: "rgba(255,255,255,0.75)" }}>{area}</p>
      </header>

      {/* 2. SEARCH BAR */}
      <div style={{ margin: 12, position: "relative" }}>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              setActiveBrand(null);
              submitSearch(query);
            }
          }}
          placeholder="Search nearby..."
          aria-label="Search nearby"
          style={{
            width: "100%",
            background: "#FFFFFF",
            border: `1px solid ${BORDER}`,
            borderRadius: 12,
            padding: "12px 40px 12px 14px",
            fontSize: 14,
            color: NAVY,
            outline: "none",
            fontFamily: "Poppins, sans-serif",
          }}
        />
        {(query || activeQuery) && (
          <button
            type="button"
            onClick={clearSearch}
            aria-label="Clear search"
            style={{
              position: "absolute",
              right: 8,
              top: "50%",
              transform: "translateY(-50%)",
              width: 28,
              height: 28,
              borderRadius: 14,
              border: "none",
              background: "#EEF2F6",
              color: MUTED,
              fontSize: 15,
              lineHeight: "28px",
              cursor: "pointer",
            }}
          >
            ✕
          </button>
        )}
      </div>

      {/* 2b. USE MY LOCATION + RADIUS */}
      <div style={{ padding: "0 16px 10px" }}>
        <button
          type="button"
          onClick={locate}
          disabled={locating}
          style={{
            width: "100%",
            background: locating ? "#7FAFD8" : NAVY,
            color: "#FFFFFF",
            border: "none",
            borderRadius: 12,
            padding: "13px 14px",
            fontSize: 14,
            fontWeight: 700,
            cursor: locating ? "default" : "pointer",
            fontFamily: "Poppins, sans-serif",
          }}
        >
          {locating ? "Locating…" : "Use my location"}
        </button>

        <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
          {RADIUS_OPTIONS.map((mi) => {
            const active = radiusMi === mi;
            return (
              <button
                key={mi}
                type="button"
                onClick={() => setRadiusMi(mi)}
                aria-pressed={active}
                style={{
                  flex: 1,
                  background: active ? BLUE : "#FFFFFF",
                  color: active ? "#FFFFFF" : NAVY,
                  border: `1px solid ${active ? BLUE : BORDER}`,
                  borderRadius: 8,
                  padding: "9px 0",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                  fontFamily: "Poppins, sans-serif",
                }}
              >
                {mi} mi
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. BRAND PILLS */}
      <div style={{ padding: "0 16px 8px", overflowX: "auto", scrollbarWidth: "none", whiteSpace: "nowrap" }}>
        {BRANDS.map((b) => {
          const active = activeBrand === b.label;
          return (
            <button
              key={b.label}
              type="button"
              onClick={() => {
                setActiveBrand(b.label);
                setQuery(b.label);
                setActiveQuery(b.label);
              }}
              style={{
                display: "inline-block",
                marginRight: 8,
                background: active ? BLUE : "#FFFFFF",
                color: active ? "#FFFFFF" : NAVY,
                border: `1px solid ${active ? BLUE : BORDER}`,
                borderRadius: 8,
                padding: "10px 14px",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "Poppins, sans-serif",
              }}
            >
              {b.emoji} {b.label}
            </button>
          );
        })}
      </div>

      {/* 4. CATEGORY TABS */}
      <div style={{ padding: "0 16px 8px", overflowX: "auto", scrollbarWidth: "none", whiteSpace: "nowrap" }}>
        {CATEGORIES.map((c) => {
          const active = !activeQuery && cat === c.id;
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => {
                clearSearch();
                setCat(c.id);
              }}
              style={{
                display: "inline-block",
                marginRight: 8,
                background: active ? BLUE : "#FFFFFF",
                color: active ? "#FFFFFF" : MUTED,
                border: `1px solid ${active ? BLUE : BORDER}`,
                borderRadius: 999,
                padding: "10px 14px",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "Poppins, sans-serif",
              }}
            >
              {c.emoji} {c.label}
            </button>
          );
        })}
      </div>

      {/* 5. INLINE MAP */}
      <div
        ref={mapEl}
        style={{
          height: 200,
          margin: "4px 12px 12px",
          borderRadius: 12,
          overflow: "hidden",
          background: "#E8EDF2",
          border: `1px solid ${BORDER}`,
        }}
      />

      {/* 6. RESULTS */}
      {locating || (loading && results.length === 0) ? (
        <div style={{ padding: 32, display: "flex", justifyContent: "center" }}>
          <LoadingSpinner />
        </div>
      ) : error ? (
        <p style={{ padding: "16px 20px", color: MUTED, fontSize: 14, textAlign: "center" }}>{error}</p>
      ) : results.length === 0 ? (
        <p style={{ padding: "16px 20px", color: MUTED, fontSize: 14, textAlign: "center" }}>Nothing found nearby</p>
      ) : (
        results.map((r) => (
          <button
            key={r.id}
            type="button"
            onClick={() => centreOn(r)}
            style={{
              display: "block",
              width: "calc(100% - 24px)",
              textAlign: "left",
              margin: 12,
              background: "#FFFFFF",
              border: `1px solid ${BORDER}`,
              borderRadius: 12,
              padding: 14,
              boxShadow: "0 1px 2px rgba(11,35,65,0.05)",
              cursor: "pointer",
              fontFamily: "Poppins, sans-serif",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: NAVY }}>{r.name}</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: BLUE, whiteSpace: "nowrap" }}>
                {fmtDistance(r.distance)}
              </span>
            </div>

            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", marginTop: 6 }}>
              {isEv ? (
                <>
                  {typeof r.chargers === "number" && (
                    <span style={{ fontSize: 12, color: MUTED }}>{r.chargers} chargers</span>
                  )}
                  {typeof r.powerKw === "number" && (
                    <span style={{ fontSize: 12, color: MUTED }}>{r.powerKw} kW</span>
                  )}
                  <Badge
                    text={r.operational ? "Operational" : "Unknown"}
                    color={r.operational ? "#16A34A" : "#8A93A0"}
                  />
                </>
              ) : (
                <>
                  {typeof r.rating === "number" && (
                    <span style={{ fontSize: 12, color: MUTED }}>⭐ {r.rating.toFixed(1)}</span>
                  )}
                  {typeof r.openNow === "boolean" && (
                    <Badge text={r.openNow ? "Open now" : "Closed"} color={r.openNow ? "#16A34A" : "#E53935"} />
                  )}
                </>
              )}
            </div>

            {r.address && <p style={{ margin: "6px 0 0", fontSize: 12, color: MUTED }}>{r.address}</p>}
          </button>
        ))
      )}
    </div>
  );
}

function Badge({ text, color }: { text: string; color: string }) {
  return (
    <span
      style={{
        fontSize: 11,
        fontWeight: 700,
        color,
        background: `${color}1A`,
        border: `1px solid ${color}33`,
        borderRadius: 999,
        padding: "2px 8px",
      }}
    >
      {text}
    </span>
  );
}
