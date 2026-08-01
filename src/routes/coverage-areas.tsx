import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, MapPin, Circle, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "../lib/supabaseClient";
import { PageLayout } from "@/components/PageLayout";
import { BottomSheet } from "@/components/dsm/BottomSheet";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { reverseGeocode } from "@/lib/geocode.functions";

export const Route = createFileRoute("/coverage-areas")({
  head: () => ({
    meta: [
      { title: "Coverage Areas — DSM by EveryDriver" },
      { name: "description", content: "Manage the areas you cover as an instructor." },
    ],
  }),
  component: CoverageAreasPage,
});

const POPPINS = { fontFamily: "Inter, sans-serif" } as const;

// Prefer the Lovable-managed browser key (referrer-restricted); fall back to the legacy key.
const GOOGLE_MAPS_KEY =
  (import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY as string | undefined) ||
  "AIzaSyDWFw0oL9ZyhwdvdvYtDsdJrTFYzF0khFc";

interface CoverageArea {
  id: string;
  instructor_id: string;
  area_name: string;
  postcode_outcodes: string[] | null;
  centre_lat: number | null;
  centre_lng: number | null;
  radius_miles: number;
  is_primary: boolean;
  created_at?: string;
}

// Places API (New) — minimal typings for what we use
type NewPlace = {
  displayName?: string;
  formattedAddress?: string;
  location?: { lat: () => number; lng: () => number };
  fetchFields: (req: { fields: string[] }) => Promise<unknown>;
};

type PlacePrediction = {
  placeId: string;
  text?: { text?: string } | string;
  mainText?: { text?: string } | string;
  secondaryText?: { text?: string } | string;
  toPlace: () => NewPlace;
};

type PlacesLib = {
  AutocompleteSuggestion: {
    fetchAutocompleteSuggestions: (req: {
      input: string;
      sessionToken?: unknown;
      includedRegionCodes?: string[];
    }) => Promise<{ suggestions: Array<{ placePrediction?: PlacePrediction }> }>;
  };
  AutocompleteSessionToken: new () => unknown;
};

type GWindow = Window & {
  google?: {
    maps?: {
      places?: unknown;
      importLibrary?: (name: string) => Promise<unknown>;
    };
  };
};

function readText(v: { text?: string } | string | undefined): string {
  if (!v) return "";
  if (typeof v === "string") return v;
  return v.text ?? "";
}

function loadMapsScript(): Promise<void> {
  const w = window as GWindow;
  if (w.google?.maps?.importLibrary) return Promise.resolve();

  return new Promise((resolve, reject) => {
    (g => {
      let h: any, a: HTMLScriptElement, k: string;
      const p = "The Google Maps JavaScript API";
      const c = "google", l = "importLibrary", q = "__ib__", m = document;
      let b: any = window;
      b = b[c] || (b[c] = {});
      const d = b.maps || (b.maps = {});
      const r = new Set<string>();
      const e = new URLSearchParams();
      const u = () => h || (h = new Promise(async (f: any, n: any) => {
        a = m.createElement("script") as HTMLScriptElement;
        e.set("libraries", [...r] + "");
        for (k in g) e.set(k.replace(/[A-Z]/g, (t: string) => "_" + t[0].toLowerCase()), (g as any)[k]);
        e.set("callback", c + ".maps." + q);
        a.src = `https://maps.${c}apis.com/maps/api/js?` + e;
        d[q] = f;
        a.onerror = () => (h = n(new Error(p + " could not load.")));
        a.nonce = (m.querySelector("script[nonce]") as HTMLScriptElement | null)?.nonce || "";
        m.head.append(a);
      }));

      d[l] ? undefined : (d[l] = (f: any, ...n: any[]) => r.add(f) && u().then(() => d[l](f, ...n)));
    })({ key: GOOGLE_MAPS_KEY, v: "weekly" });

    let attempts = 0;
    const iv = setInterval(() => {
      attempts++;
      if ((window as GWindow).google?.maps?.importLibrary) {
        clearInterval(iv);
        resolve();
      } else if (attempts > 100) {
        clearInterval(iv);
        reject(new Error("Google Maps failed to initialize"));
      }
    }, 100);
  });
}


function staticMapUrl(lat: number | null, lng: number | null, radius: number, size = "400x100") {
  if (lat == null || lng == null) return "";
  // Approx radius zoom: 11 works well for ~10mi; adjust slightly by radius.
  const zoom = radius <= 3 ? 12 : radius <= 8 ? 11 : radius <= 15 ? 10 : 9;
  const path = `path=color:0x1A52A0AA|weight:2|fillcolor:0x1A52A033|geodesic:true|` +
    circlePathPoints(lat, lng, radius).join("|");
  return `https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=${zoom}&size=${size}&maptype=roadmap&${path}&key=${GOOGLE_MAPS_KEY}`;
}

function circlePathPoints(lat: number, lng: number, radiusMiles: number, points = 36): string[] {
  const r = radiusMiles / 3958.8; // earth radius mi
  const latRad = (lat * Math.PI) / 180;
  const lngRad = (lng * Math.PI) / 180;
  const out: string[] = [];
  for (let i = 0; i <= points; i++) {
    const brng = (i * 2 * Math.PI) / points;
    const latP = Math.asin(
      Math.sin(latRad) * Math.cos(r) + Math.cos(latRad) * Math.sin(r) * Math.cos(brng),
    );
    const lngP =
      lngRad +
      Math.atan2(
        Math.sin(brng) * Math.sin(r) * Math.cos(latRad),
        Math.cos(r) - Math.sin(latRad) * Math.sin(latP),
      );
    out.push(`${((latP * 180) / Math.PI).toFixed(5)},${((lngP * 180) / Math.PI).toFixed(5)}`);
  }
  return out;
}

function CoverageAreasPage() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [areas, setAreas] = useState<CoverageArea[]>([]);
  const [loading, setLoading] = useState(true);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<CoverageArea | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<CoverageArea | null>(null);

  async function load(uid: string) {
    setLoading(true);
    const { data, error } = await supabase
      .from("instructor_coverage_areas")
      .select("*")
      .eq("instructor_id", uid)
      .order("is_primary", { ascending: false })
      .order("created_at", { ascending: true });
    if (error) {
      console.error("[coverage-areas] load error", error);
      toast.error("Could not load coverage areas");
    } else {
      setAreas((data ?? []) as CoverageArea[]);
    }
    setLoading(false);
  }

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        navigate({ to: "/login" as never });
        return;
      }
      setUserId(data.user.id);
      await load(data.user.id);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function openAdd() {
    setEditing(null);
    setSheetOpen(true);
  }
  function openEdit(a: CoverageArea) {
    setEditing(a);
    setSheetOpen(true);
  }

  async function handleSave(payload: Omit<CoverageArea, "id" | "instructor_id" | "created_at"> & { id?: string }) {
    if (!userId) return;
    try {
      if (payload.is_primary) {
        // Clear other primaries first
        const { error: clearErr } = await supabase
          .from("instructor_coverage_areas")
          .update({ is_primary: false })
          .eq("instructor_id", userId);
        if (clearErr) throw clearErr;
      }
      if (payload.id) {
        const { error } = await supabase
          .from("instructor_coverage_areas")
          .update({
            area_name: payload.area_name,
            postcode_outcodes: payload.postcode_outcodes,
            centre_lat: payload.centre_lat,
            centre_lng: payload.centre_lng,
            radius_miles: payload.radius_miles,
            is_primary: payload.is_primary,
          })
          .eq("id", payload.id);
        if (error) throw error;
        toast.success("Coverage area updated");
      } else {
        const { error } = await supabase.from("instructor_coverage_areas").insert({
          instructor_id: userId,
          area_name: payload.area_name,
          postcode_outcodes: payload.postcode_outcodes,
          centre_lat: payload.centre_lat,
          centre_lng: payload.centre_lng,
          radius_miles: payload.radius_miles,
          is_primary: payload.is_primary,
        });
        if (error) throw error;
        toast.success("Coverage area added");
      }
      setSheetOpen(false);
      setEditing(null);
      await load(userId);
    } catch (e) {
      console.error("[coverage-areas] save error", e);
      toast.error("Could not save coverage area");
    }
  }

  async function handleDelete(area: CoverageArea) {
    if (!userId) return;
    const { error } = await supabase
      .from("instructor_coverage_areas")
      .delete()
      .eq("id", area.id);
    if (error) {
      console.error("[coverage-areas] delete error", error);
      toast.error("Could not remove area");
      return;
    }
    toast.success("Area removed");
    setConfirmDelete(null);
    await load(userId);
  }

  return (
    <PageLayout className="pb-24" style={{ backgroundColor: "#fff", ...POPPINS }}>
      {/* Top bar */}
      <div
        style={{
          backgroundColor: "#0F2044",
          color: "#fff",
          padding: "14px 16px",
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}
      >
        <button
          type="button"
          onClick={() => navigate({ to: "/settings" as never })}
          style={{ background: "none", border: "none", color: "#fff", cursor: "pointer", padding: 4 }}
          aria-label="Back"
        >
          <ArrowLeft size={22} />
        </button>
        <h1 style={{ fontSize: 17, fontWeight: 700, margin: 0, ...POPPINS }}>Coverage Areas</h1>
      </div>

      {/* Intro card */}
      <div
        style={{
          margin: "16px 16px 0",
          padding: 16,
          backgroundColor: "#F0F4FF",
          border: "0.5px solid #BFDBFE",
          borderRadius: 12,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <MapPin size={16} color="#1A52A0" />
          <div style={{ fontWeight: 600, fontSize: 14, color: "#0F2044" }}>Define where you teach</div>
        </div>
        <div style={{ fontSize: 12, color: "#6B7280", marginTop: 4 }}>
          Add each area you cover. Learners searching in these areas will find you on EveryDriver.
        </div>
      </div>

      {/* List / empty state */}
      {loading ? (
        <div style={{ padding: 24, textAlign: "center", color: "#9CA3AF", fontSize: 13 }}>Loading…</div>
      ) : areas.length === 0 ? (
        <div style={{ padding: "40px 16px 0", textAlign: "center" }}>
          <MapPin size={48} color="#D1D5DB" style={{ marginBottom: 12 }} />
          <div style={{ fontWeight: 600, fontSize: 14, color: "#6B7280" }}>No coverage areas set</div>
          <div style={{ fontSize: 13, color: "#9CA3AF", marginTop: 4 }}>
            Add your first area to appear on EveryDriver
          </div>
          <div style={{ padding: "16px 0 0" }}>
            <button
              type="button"
              onClick={openAdd}
              style={{
                backgroundColor: "#0F2044",
                color: "#fff",
                width: "100%",
                borderRadius: 12,
                padding: "12px 0",
                border: "none",
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
                ...POPPINS,
              }}
            >
              + Add your first area
            </button>
          </div>
        </div>
      ) : (
        <>
          {areas.map((a) => (
            <AreaCard
              key={a.id}
              area={a}
              onEdit={() => openEdit(a)}
              onDelete={() => setConfirmDelete(a)}
            />
          ))}
          <div style={{ margin: "12px 16px 0" }}>
            <button
              type="button"
              onClick={openAdd}
              style={{
                backgroundColor: "#0F2044",
                color: "#fff",
                width: "100%",
                borderRadius: 12,
                padding: "12px 0",
                border: "none",
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                ...POPPINS,
              }}
            >
              <Plus size={16} /> Add coverage area
            </button>
          </div>
        </>
      )}

      <AreaEditor
        open={sheetOpen}
        onOpenChange={(v) => {
          setSheetOpen(v);
          if (!v) setEditing(null);
        }}
        initial={editing}
        onSave={handleSave}
      />

      <ConfirmDialog
        open={!!confirmDelete}
        title="Remove coverage area?"
        message={confirmDelete ? `Remove ${confirmDelete.area_name} from your coverage areas?` : ""}
        confirmLabel="Remove"
        onCancel={() => setConfirmDelete(null)}
        onConfirm={() => confirmDelete && handleDelete(confirmDelete)}
      />
    </PageLayout>
  );
}

function AreaCard({
  area,
  onEdit,
  onDelete,
}: {
  area: CoverageArea;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const outcodes = (area.postcode_outcodes ?? []).join(", ");
  return (
    <div
      style={{
        margin: "8px 16px 0",
        backgroundColor: "#fff",
        border: "0.5px solid #E2E6ED",
        borderRadius: 12,
        padding: 16,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: "#0F2044" }}>{area.area_name}</div>
          {area.is_primary && (
            <span
              style={{
                backgroundColor: "#1A52A0",
                color: "#fff",
                fontSize: 11,
                fontWeight: 700,
                padding: "2px 8px",
                borderRadius: 999,
              }}
            >
              Primary
            </span>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button
            type="button"
            onClick={onEdit}
            style={{ background: "none", border: "none", color: "#1A52A0", fontSize: 12, cursor: "pointer", padding: 0 }}
          >
            Edit
          </button>
          <button
            type="button"
            onClick={onDelete}
            aria-label="Delete"
            style={{ background: "none", border: "none", color: "#CC2229", fontSize: 18, cursor: "pointer", padding: 0, lineHeight: 1 }}
          >
            ×
          </button>
        </div>
      </div>

      <div style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <MapPin size={12} color="#9CA3AF" />
          <span style={{ fontSize: 12, color: "#6B7280" }}>{outcodes || "—"}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <Circle size={12} color="#9CA3AF" />
          <span style={{ fontSize: 12, color: "#6B7280" }}>{area.radius_miles} mile radius</span>
        </div>
      </div>

      {area.centre_lat != null && area.centre_lng != null && (
        <div style={{ marginTop: 10, height: 100, borderRadius: 8, overflow: "hidden", background: "#F3F4F6" }}>
          <img
            src={staticMapUrl(area.centre_lat, area.centre_lng, area.radius_miles, "400x100")}
            alt={`Map of ${area.area_name}`}
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          />
        </div>
      )}
    </div>
  );
}

/* ---------- Editor bottom sheet ---------- */

function AreaEditor({
  open,
  onOpenChange,
  initial,
  onSave,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial: CoverageArea | null;
  onSave: (payload: Omit<CoverageArea, "id" | "instructor_id" | "created_at"> & { id?: string }) => Promise<void>;
}) {
  const [areaName, setAreaName] = useState(initial?.area_name ?? "");
  const [lat, setLat] = useState<number | null>(initial?.centre_lat ?? null);
  const [lng, setLng] = useState<number | null>(initial?.centre_lng ?? null);
  const [outcodes, setOutcodes] = useState<string[]>(initial?.postcode_outcodes ?? []);
  const [outcodeInput, setOutcodeInput] = useState("");
  const [outcodeError, setOutcodeError] = useState<string | null>(null);
  const [radius, setRadius] = useState<number>(initial?.radius_miles ?? 5);
  const [isPrimary, setIsPrimary] = useState<boolean>(initial?.is_primary ?? false);
  const [saving, setSaving] = useState(false);
  const [placesLoaded, setPlacesLoaded] = useState(false);
  const [placesError, setPlacesError] = useState(false);
  const [suggestions, setSuggestions] = useState<
    Array<{ id: string; main: string; secondary: string }>
  >([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [nameTouched, setNameTouched] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const placesLibRef = useRef<PlacesLib | null>(null);
  const sessionTokenRef = useRef<unknown>(null);
  const predsRef = useRef<Map<string, PlacePrediction>>(new Map());

  // Reset state when opening
  useEffect(() => {
    if (open) {
      setAreaName(initial?.area_name ?? "");
      setLat(initial?.centre_lat ?? null);
      setLng(initial?.centre_lng ?? null);
      setOutcodes(initial?.postcode_outcodes ?? []);
      setOutcodeInput("");
      setOutcodeError(null);
      setRadius(initial?.radius_miles ?? 5);
      setIsPrimary(initial?.is_primary ?? false);
      setSuggestions([]);
      setShowSuggestions(false);
      setNameTouched(false);
    }
  }, [open, initial]);

  // Load Google Maps + Places (New)
  useEffect(() => {
    if (!open || placesLibRef.current) return;
    let cancelled = false;
    (async () => {
      try {
        await loadMapsScript();
        const g = (window as GWindow).google;
        if (!g?.maps?.importLibrary) throw new Error("importLibrary unavailable");
        const lib = (await g.maps.importLibrary("places")) as PlacesLib;
        if (cancelled) return;
        placesLibRef.current = lib;
        sessionTokenRef.current = new lib.AutocompleteSessionToken();
        setPlacesLoaded(true);
      } catch (e) {
        console.error("[coverage-areas] places load", e);
        if (!cancelled) setPlacesError(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open]);

  // Fetch suggestions as the user types
  useEffect(() => {
    const lib = placesLibRef.current;
    const query = areaName.trim();
    if (!open || !placesLoaded || !lib || !nameTouched || query.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const { suggestions: raw } = await lib.AutocompleteSuggestion.fetchAutocompleteSuggestions({
          input: query,
          sessionToken: sessionTokenRef.current ?? undefined,
          includedRegionCodes: ["gb"],
        });
        if (cancelled) return;
        const map = new Map<string, PlacePrediction>();
        const list = raw
          .map((s) => s.placePrediction)
          .filter((p): p is PlacePrediction => !!p)
          .map((p) => {
            map.set(p.placeId, p);
            return {
              id: p.placeId,
              main: readText(p.mainText) || readText(p.text),
              secondary: readText(p.secondaryText),
            };
          });
        predsRef.current = map;
        setSuggestions(list);
        setShowSuggestions(list.length > 0);
      } catch (e) {
        if (cancelled) return;
        console.error("[coverage-areas] fetchAutocompleteSuggestions failed", e);
        setSuggestions([]);
        setShowSuggestions(false);
      }
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [areaName, open, placesLoaded, nameTouched]);

  async function selectSuggestion(id: string) {
    const lib = placesLibRef.current;
    const pred = predsRef.current.get(id);
    if (!lib || !pred) return;
    setShowSuggestions(false);
    setNameTouched(false);
    try {
      const place = pred.toPlace();
      await place.fetchFields({ fields: ["displayName", "formattedAddress", "location"] });
      const name = place.displayName || place.formattedAddress || "";
      if (name) setAreaName(name);
      const la = place.location?.lat();
      const ln = place.location?.lng();
      if (typeof la === "number" && typeof ln === "number") {
        setLat(la);
        setLng(ln);
      }
      sessionTokenRef.current = new lib.AutocompleteSessionToken();
    } catch (e) {
      console.error("[coverage-areas] fetchFields failed", e);
    }
  }


  async function addOutcode() {
    const raw = outcodeInput.trim().toUpperCase().replace(/\s+/g, "");
    setOutcodeError(null);
    if (!raw) return;
    if (outcodes.includes(raw)) {
      setOutcodeError("Already added");
      return;
    }
    try {
      const res = await fetch(`https://api.postcodes.io/outcodes/${encodeURIComponent(raw)}`);
      if (res.status !== 200) {
        setOutcodeError("Invalid postcode area");
        return;
      }
      const json = await res.json();
      const result = json?.result;
      setOutcodes((prev) => [...prev, raw]);
      setOutcodeInput("");
      // If we have no centre yet, seed from this outcode
      if (result && (lat == null || lng == null)) {
        if (typeof result.latitude === "number" && typeof result.longitude === "number") {
          setLat(result.latitude);
          setLng(result.longitude);
        }
      }
    } catch (e) {
      console.error("[coverage-areas] outcode lookup", e);
      setOutcodeError("Could not verify postcode");
    }
  }

  function removeOutcode(oc: string) {
    setOutcodes((prev) => prev.filter((x) => x !== oc));
  }

  const canSave = areaName.trim().length > 0 && lat != null && lng != null && radius > 0;
  const previewUrl = useMemo(
    () => staticMapUrl(lat, lng, radius, "600x300"),
    [lat, lng, radius],
  );

  async function submit() {
    if (!canSave) {
      toast.error("Add an area name and location first");
      return;
    }
    setSaving(true);
    let finalOutcodes = outcodes;
    if (finalOutcodes.length === 0 && lat != null && lng != null) {
      try {
        const result = (await reverseGeocode({ data: { lat, lng } })) as { postcode?: string } | null;
        const derivedOutcode = result?.postcode?.split(" ")[0]?.toUpperCase();
        if (derivedOutcode) finalOutcodes = [derivedOutcode];
      } catch (e) {
        console.warn("[coverage-areas] auto-derive outcode failed", e);
        // non-fatal — area still saves without an outcode, same as current behaviour
      }
    }
    await onSave({
      id: initial?.id,
      area_name: areaName.trim(),
      postcode_outcodes: finalOutcodes,
      centre_lat: lat,
      centre_lng: lng,
      radius_miles: radius,
      is_primary: isPrimary,
    });
    setSaving(false);
  }

  return (
    <BottomSheet
      open={open}
      onOpenChange={onOpenChange}
      title={initial ? "Edit coverage area" : "Add coverage area"}
    >
      {/* Area name */}
      <div style={{ position: "relative" }}>
        <label style={{ fontSize: 12, color: "#9CA3AF", ...POPPINS }}>Area name</label>
        <input
          ref={inputRef}
          type="text"
          value={areaName}
          onChange={(e) => {
            setNameTouched(true);
            setAreaName(e.target.value);
          }}
          onFocus={() => {
            if (suggestions.length > 0) setShowSuggestions(true);
          }}
          onBlur={() => window.setTimeout(() => setShowSuggestions(false), 150)}
          placeholder="e.g. Winchester, Eastleigh, Chandlers Ford"
          autoComplete="new-password"
          style={{
            width: "100%",
            height: 44,
            padding: "0 12px",
            marginTop: 6,
            border: "0.5px solid #E2E6ED",
            borderRadius: 10,
            fontSize: 14,
            background: "#fff",
            color: "#0F2044",
            ...POPPINS,
          }}
        />
        {placesError && (
          <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 4, ...POPPINS }}>
            Address lookup unavailable — type the area name and add a postcode below.
          </div>
        )}
        {showSuggestions && suggestions.length > 0 && (
          <div
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: "100%",
              marginTop: 4,
              background: "#fff",
              border: "0.5px solid #EEF2F7",
              borderRadius: 10,
              boxShadow: "0 4px 12px rgba(11,31,58,0.08)",
              maxHeight: 220,
              overflowY: "auto",
              zIndex: 60,
            }}
          >
            {suggestions.map((s) => (
              <button
                key={s.id}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => selectSuggestion(s.id)}
                style={{
                  display: "block",
                  width: "100%",
                  textAlign: "left",
                  padding: "10px 12px",
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  ...POPPINS,
                }}
              >
                <div style={{ fontSize: 14, color: "#0F2044" }}>{s.main}</div>
                {s.secondary && (
                  <div style={{ fontSize: 12, color: "#9CA3AF" }}>{s.secondary}</div>
                )}
              </button>
            ))}
          </div>
        )}
      </div>


      {/* Outcodes */}
      <div style={{ marginTop: 12 }}>
        <label style={{ fontSize: 12, color: "#9CA3AF", ...POPPINS }}>Postcode areas covered</label>
        <div style={{ fontSize: 12, color: "#9CA3AF", marginTop: 2 }}>
          Add the outward codes for this area e.g. SO22 SO23
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
          <input
            type="text"
            value={outcodeInput}
            onChange={(e) => setOutcodeInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addOutcode();
              }
            }}
            placeholder="SO22"
            style={{
              flex: 1,
              height: 40,
              padding: "0 12px",
              border: "0.5px solid #E2E6ED",
              borderRadius: 10,
              fontSize: 14,
              textTransform: "uppercase",
              ...POPPINS,
            }}
          />
          <button
            type="button"
            onClick={addOutcode}
            style={{
              padding: "0 14px",
              backgroundColor: "#0F2044",
              color: "#fff",
              border: "none",
              borderRadius: 10,
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              ...POPPINS,
            }}
          >
            Add
          </button>
        </div>
        {outcodeError && (
          <div style={{ fontSize: 12, color: "#CC2229", marginTop: 6 }}>{outcodeError}</div>
        )}
        {outcodes.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
            {outcodes.map((oc) => (
              <button
                key={oc}
                type="button"
                onClick={() => removeOutcode(oc)}
                style={{
                  backgroundColor: "#F0F4FF",
                  color: "#1A52A0",
                  fontSize: 12,
                  fontWeight: 700,
                  padding: "4px 10px",
                  borderRadius: 999,
                  border: "none",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  ...POPPINS,
                }}
              >
                {oc} <X size={11} />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Radius */}
      <div style={{ marginTop: 16 }}>
        <label style={{ fontSize: 12, color: "#9CA3AF", ...POPPINS }}>Teaching radius</label>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#0F2044", marginTop: 4 }}>
          {radius} miles
        </div>
        <input
          type="range"
          min={1}
          max={15}
          step={0.5}
          value={radius}
          onChange={(e) => setRadius(Number(e.target.value))}
          style={{ width: "100%", marginTop: 4, accentColor: "#1A52A0" }}
        />
        <div style={{ fontSize: 12, color: "#9CA3AF", marginTop: 2 }}>
          How far from the centre of this area you're willing to travel
        </div>
      </div>

      {/* Primary toggle */}
      <div
        style={{
          marginTop: 16,
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, color: "#0F2044", ...POPPINS }}>Set as primary area</div>
          <div style={{ fontSize: 12, color: "#9CA3AF", marginTop: 2 }}>
            Your primary area appears first on EveryDriver
          </div>
        </div>
        <button
          type="button"
          onClick={() => setIsPrimary((v) => !v)}
          aria-pressed={isPrimary}
          style={{
            width: 44,
            height: 26,
            borderRadius: 999,
            backgroundColor: isPrimary ? "#1A52A0" : "#E2E6ED",
            border: "none",
            position: "relative",
            cursor: "pointer",
            flexShrink: 0,
            transition: "background-color 150ms",
          }}
        >
          <span
            style={{
              position: "absolute",
              top: 3,
              left: isPrimary ? 21 : 3,
              width: 20,
              height: 20,
              borderRadius: "50%",
              backgroundColor: "#fff",
              transition: "left 150ms",
            }}
          />
        </button>
      </div>

      {/* Map preview */}
      {lat != null && lng != null && (
        <div style={{ marginTop: 16, height: 150, borderRadius: 10, overflow: "hidden", background: "#F3F4F6" }}>
          <img
            src={previewUrl}
            alt="Coverage preview"
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          />
        </div>
      )}

      <button
        type="button"
        onClick={submit}
        disabled={!canSave || saving}
        style={{
          marginTop: 20,
          backgroundColor: "#0F2044",
          color: "#fff",
          width: "100%",
          borderRadius: 12,
          padding: "12px 0",
          border: "none",
          fontSize: 14,
          fontWeight: 600,
          cursor: !canSave || saving ? "not-allowed" : "pointer",
          opacity: !canSave || saving ? 0.5 : 1,
          ...POPPINS,
        }}
      >
        {saving ? "Saving…" : initial ? "Save changes" : "Add area"}
      </button>
    </BottomSheet>
  );
}
