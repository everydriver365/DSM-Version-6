import { createFileRoute } from "@tanstack/react-router";
import * as React from "react";
import PageHeader from "@/components/dsm/PageHeader";
import { LoadingSpinner } from "@/components/dsm/LoadingSpinner";

export const Route = createFileRoute("/nearest")({
  head: () => ({
    meta: [
      { title: "Nearest — Every Driver Pro" },
      { name: "description", content: "Find toilets, fuel, parking, food, EV chargers and ATMs near your current location while instructing." },
      { property: "og:title", content: "Nearest — Every Driver Pro" },
      { property: "og:description", content: "Find toilets, fuel, parking, food, EV chargers and ATMs near your current location." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: NearestPage,
});

const KEY = import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY as string | undefined;
const SCRIPT_ID = "gmaps-js-sdk";

type GWin = Window & { google?: any };

function loadMaps(): Promise<void> {
  const w = window as GWin;
  if (w.google?.maps?.places) return Promise.resolve();
  if (document.getElementById(SCRIPT_ID)) {
    return new Promise((resolve) => {
      const iv = setInterval(() => {
        if ((window as GWin).google?.maps?.places) {
          clearInterval(iv);
          resolve();
        }
      }, 150);
    });
  }
  return new Promise((resolve, reject) => {
    if (!KEY) { reject(new Error("Missing Google Maps browser key")); return; }
    const s = document.createElement("script");
    s.id = SCRIPT_ID;
    s.async = true;
    s.defer = true;
    s.src = `https://maps.googleapis.com/maps/api/js?key=${KEY}&libraries=geometry,places&loading=async`;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Failed to load Google Maps JS"));
    document.head.appendChild(s);
  });
}

type Cat = {
  id: string;
  emoji: string;
  label: string;
  request: Record<string, unknown>;
};

const CATEGORIES: Cat[] = [
  { id: "toilets", emoji: "🚻", label: "Toilets", request: { keyword: "public toilet" } },
  { id: "food", emoji: "☕", label: "Food & drink", request: { type: "cafe" } },
  { id: "fuel", emoji: "⛽", label: "Fuel", request: { type: "gas_station" } },
  { id: "parking", emoji: "🅿️", label: "Parking", request: { type: "parking" } },
  { id: "ev", emoji: "⚡", label: "EV charger", request: { keyword: "EV charging" } },
  { id: "atm", emoji: "🏧", label: "ATM", request: { type: "atm" } },
];

function haversine(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

function fmtDistance(m: number) {
  if (m < 1000) return `${Math.round(m)} m`;
  return `${(m / 1000).toFixed(1)} km`;
}

type Place = {
  id: string;
  name: string;
  vicinity: string;
  rating?: number;
  openNow?: boolean;
  lat: number;
  lng: number;
  distance: number;
};

function NearestPage() {
  const [pos, setPos] = React.useState<{ lat: number; lng: number } | null>(null);
  const [area, setArea] = React.useState<string>("Locating…");
  const [cat, setCat] = React.useState<string>(CATEGORIES[0].id);
  const [places, setPlaces] = React.useState<Place[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const mapEl = React.useRef<HTMLDivElement | null>(null);
  const mapRef = React.useRef<any>(null);
  const markersRef = React.useRef<any[]>([]);
  const [mapsReady, setMapsReady] = React.useState(false);

  // 1. GPS first — never gated on the Maps JS SDK
  React.useEffect(() => {
    let cancelled = false;
    if (!navigator.geolocation) {
      setError("Location is not available on this device");
      setLoading(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (p) => {
        if (cancelled) return;
        setPos({ lat: p.coords.latitude, lng: p.coords.longitude });
      },
      (err) => {
        if (cancelled) return;
        setError(
          err.code === err.PERMISSION_DENIED
            ? "Enable location access to find nearby places"
            : "Could not get your location. Try again outdoors.",
        );
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 },
    );
    return () => { cancelled = true; };
  }, []);

  // 1b. Map SDK is best-effort (browser key is domain restricted); list works without it
  React.useEffect(() => {
    let cancelled = false;
    loadMaps()
      .then(() => { if (!cancelled) setMapsReady(true); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  // 2. Area name via the server geocode (browser key is not authorised for Geocoding)
  React.useEffect(() => {
    if (!pos) return;
    let cancelled = false;
    reverseGeocode({ data: { lat: pos.lat, lng: pos.lng } })
      .then((r) => {
        if (cancelled) return;
        setArea(r.town || r.road || "Nearby places");
      })
      .catch(() => { if (!cancelled) setArea("Nearby places"); });
    return () => { cancelled = true; };
  }, [pos]);

  // 3. Init map
  React.useEffect(() => {
    if (!pos || !mapsReady || !mapEl.current) return;
    const g = (window as GWin).google;
    if (!g?.maps) return;
    if (!mapRef.current) {
      mapRef.current = new g.maps.Map(mapEl.current, {
        center: pos,
        zoom: 14,
        disableDefaultUI: true,
        zoomControl: true,
      });
      new g.maps.Marker({
        position: pos,
        map: mapRef.current,
        icon: {
          path: g.maps.SymbolPath.CIRCLE,
          scale: 7,
          fillColor: "#2C97DE",
          fillOpacity: 1,
          strokeColor: "#FFFFFF",
          strokeWeight: 2,
        },
        title: "You are here",
      });
    } else {
      mapRef.current.setCenter(pos);
    }
  }, [pos, mapsReady]);

  // 4. Nearby search via Places API (New) through the connector gateway
  React.useEffect(() => {
    if (!pos) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    findNearbyPlaces({ data: { lat: pos.lat, lng: pos.lng, category: cat, radius: 2000 } })
      .then((res) => {
        if (cancelled) return;
        if (res.error) {
          setError(res.error);
          setPlaces([]);
          setLoading(false);
          return;
        }
        setPlaces(
          res.places
            .map((p) => ({
              id: p.id,
              name: p.name,
              vicinity: p.address,
              rating: p.rating,
              openNow: p.openNow,
              lat: p.lat,
              lng: p.lng,
              distance: haversine(pos.lat, pos.lng, p.lat, p.lng),
            }))
            .sort((a, b) => a.distance - b.distance),
        );
        setLoading(false);
      })
      .catch((e) => {
        if (cancelled) return;
        console.error("[nearest] search failed", e);
        setError("Could not search nearby places right now.");
        setPlaces([]);
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, [pos, cat]);


  // 5. Draw result markers
  React.useEffect(() => {
    const g = (window as GWin).google;
    if (!g?.maps || !mapRef.current) return;
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = places.map(
      (p) =>
        new g.maps.Marker({
          position: { lat: p.lat, lng: p.lng },
          map: mapRef.current,
          title: p.name,
        }),
    );
  }, [places]);

  function focusPlace(p: Place) {
    if (!mapRef.current) return;
    mapRef.current.panTo({ lat: p.lat, lng: p.lng });
    mapRef.current.setZoom(16);
    mapEl.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  const activeLabel = CATEGORIES.find((c) => c.id === cat)?.label ?? "";

  return (
    <div style={{ minHeight: "100dvh", background: "#F4F7FA", fontFamily: "Poppins, sans-serif", paddingBottom: 100 }}>
      <PageHeader title="Nearest" subtitle={area} backTo="/home" />

      {/* Category tabs */}
      <div
        style={{
          display: "flex",
          gap: 8,
          overflowX: "auto",
          padding: "12px 16px",
          WebkitOverflowScrolling: "touch",
        }}
      >
        {CATEGORIES.map((c) => {
          const active = c.id === cat;
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => setCat(c.id)}
              style={{
                flexShrink: 0,
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 14px",
                borderRadius: 999,
                border: active ? "1px solid #2C97DE" : "1px solid #E4E8EF",
                background: active ? "#2C97DE" : "#FFFFFF",
                color: active ? "#FFFFFF" : "#536579",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              <span>{c.emoji}</span>
              <span>{c.label}</span>
            </button>
          );
        })}
      </div>

      {/* Map */}
      <div style={{ padding: "0 16px" }}>
        <div
          ref={mapEl}
          style={{
            height: 220,
            width: "100%",
            borderRadius: 12,
            overflow: "hidden",
            border: "1px solid #E4E8EF",
            background: "#E9EEF4",
          }}
        />
      </div>

      {/* Results */}
      <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: 10 }}>
        {error ? (
          <div
            style={{
              background: "#FFFFFF",
              border: "1px solid #E4E8EF",
              borderRadius: 12,
              padding: 24,
              textAlign: "center",
              color: "#536579",
              fontSize: 14,
            }}
          >
            {error}
          </div>
        ) : loading ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, padding: 32 }}>
            <LoadingSpinner />
            <div style={{ color: "#536579", fontSize: 13 }}>Finding {activeLabel.toLowerCase()} nearby…</div>
          </div>
        ) : places.length === 0 ? (
          <div
            style={{
              background: "#FFFFFF",
              border: "1px solid #E4E8EF",
              borderRadius: 12,
              padding: 24,
              textAlign: "center",
              color: "#536579",
              fontSize: 14,
            }}
          >
            No {activeLabel.toLowerCase()} found nearby
          </div>
        ) : (
          places.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => focusPlace(p)}
              style={{
                textAlign: "left",
                background: "#FFFFFF",
                border: "1px solid #E4E8EF",
                borderRadius: 12,
                padding: 14,
                cursor: "pointer",
                display: "flex",
                flexDirection: "column",
                gap: 4,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                <span style={{ fontSize: 15, fontWeight: 700, color: "#0B2341", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {p.name}
                </span>
                <span style={{ fontSize: 13, fontWeight: 600, color: "#2C97DE", flexShrink: 0 }}>
                  {fmtDistance(p.distance)}
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                {typeof p.rating === "number" && (
                  <span style={{ fontSize: 12, color: "#536579" }}>★ {p.rating.toFixed(1)}</span>
                )}
                {p.openNow === true && (
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: "#FFFFFF",
                      background: "#16A34A",
                      borderRadius: 999,
                      padding: "2px 8px",
                    }}
                  >
                    Open now
                  </span>
                )}
              </div>
              {p.vicinity && (
                <div style={{ fontSize: 12, color: "#6B7686" }}>{p.vicinity}</div>
              )}
            </button>
          ))
        )}
      </div>
    </div>
  );
}
