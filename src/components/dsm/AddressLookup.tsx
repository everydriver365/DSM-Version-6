import { useEffect, useRef, useState } from "react";
import { Check, X } from "lucide-react";

const POPPINS = { fontFamily: "Poppins, system-ui, sans-serif" } as const;

// Same key + script id as used elsewhere in the app (see src/routes/pupils.new.tsx)
const GOOGLE_MAPS_KEY = "AIzaSyDWFw0oL9ZyhwdvdvYtDsdJrTFYzF0khFc";
const SCRIPT_ID = "google-maps-places-script";

export interface AddressLookupResult {
  postcode: string;
  address: string;
  city: string;
  lat: number | null;
  lng: number | null;
}

interface Props {
  initialPostcode?: string;
  initialAddress?: string;
  initialCity?: string;
  onAddressFound: (r: AddressLookupResult) => void;
  disabled?: boolean;
}

// Minimal typing for the google.maps.places surface we use
type GAutocomplete = {
  addListener: (evt: string, cb: () => void) => void;
  getPlace: () => {
    formatted_address?: string;
    address_components?: Array<{ long_name: string; short_name: string; types: string[] }>;
    geometry?: { location?: { lat: () => number; lng: () => number } };
  };
};
type GWindow = Window & {
  google?: {
    maps?: {
      places?: {
        Autocomplete: new (
          input: HTMLInputElement,
          opts: Record<string, unknown>,
        ) => GAutocomplete;
      };
    };
  };
};

function loadPlacesScript(): Promise<void> {
  const w = window as GWindow;
  if (w.google?.maps?.places) return Promise.resolve();
  const existing = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
  if (existing) {
    return new Promise((resolve) => {
      const iv = setInterval(() => {
        if ((window as GWindow).google?.maps?.places) {
          clearInterval(iv);
          resolve();
        }
      }, 150);
    });
  }
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.id = SCRIPT_ID;
    s.async = true;
    s.defer = true;
    s.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_KEY}&libraries=places&loading=async`;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Failed to load Google Maps script"));
    document.head.appendChild(s);
  });
}

export function AddressLookup({
  initialPostcode = "",
  initialAddress = "",
  initialCity = "",
  onAddressFound,
  disabled = false,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [placesLoaded, setPlacesLoaded] = useState<boolean>(
    typeof window !== "undefined" && !!(window as GWindow).google?.maps?.places,
  );
  const [selectedAddress, setSelectedAddress] = useState<string>(initialAddress);
  const [postcode, setPostcode] = useState<string>(initialPostcode);
  const [city, setCity] = useState<string>(initialCity);
  const [confirmed, setConfirmed] = useState<boolean>(!!initialAddress);
  const [error, setError] = useState<string | null>(null);

  console.log("[address-lookup] component rendered, initial:", {
    initialPostcode,
    initialAddress,
    initialCity,
  });

  // Load the Google Maps Places script (idempotent — reuses existing tag)
  useEffect(() => {
    let cancelled = false;
    loadPlacesScript()
      .then(() => {
        if (!cancelled) {
          console.log("[address-lookup] google places ready");
          setPlacesLoaded(true);
        }
      })
      .catch((e) => {
        console.error("[address-lookup] script load error:", e);
        if (!cancelled) setError("Could not load address lookup");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Bind autocomplete once the script + input are ready
  useEffect(() => {
    if (!placesLoaded || !inputRef.current || confirmed) return;
    const g = (window as GWindow).google;
    if (!g?.maps?.places) return;

    const autocomplete = new g.maps.places.Autocomplete(inputRef.current, {
      componentRestrictions: { country: "gb" },
      fields: ["formatted_address", "address_components", "geometry"],
      types: ["address"],
    });

    const listener = () => {
      const place = autocomplete.getPlace();
      console.log("[address-lookup] place_changed:", place);
      if (!place.address_components) {
        setError("Please pick a suggestion from the list");
        return;
      }

      let streetNumber = "";
      let streetName = "";
      let town = "";
      let county = "";
      let pc = "";

      for (const comp of place.address_components) {
        const type = comp.types[0];
        if (type === "street_number") streetNumber = comp.long_name;
        else if (type === "route") streetName = comp.long_name;
        else if (type === "postal_town" || type === "locality") town = comp.long_name;
        else if (type === "administrative_area_level_2") county = comp.long_name;
        else if (type === "postal_code") pc = comp.long_name;
      }

      const line1 = [streetNumber, streetName].filter(Boolean).join(" ");
      const formatted = place.formatted_address || line1 || "";
      const lat = place.geometry?.location?.lat() ?? null;
      const lng = place.geometry?.location?.lng() ?? null;
      const derivedCity = town || county || "";

      setSelectedAddress(formatted);
      setPostcode(pc);
      setCity(derivedCity);
      setConfirmed(true);
      setError(null);

      // Preserve the existing consumer API (settings.tsx / profile.tsx)
      onAddressFound({
        postcode: pc,
        address: formatted,
        city: derivedCity,
        lat,
        lng,
      });
    };

    autocomplete.addListener("place_changed", listener);

    // Prevent the browser's autofill from covering suggestions
    inputRef.current.setAttribute("autocomplete", "new-password");

    return () => {
      // Autocomplete has no public teardown; leave the instance to be GC'd
      // when the input unmounts.
    };
  }, [placesLoaded, confirmed, onAddressFound]);

  function reset() {
    setConfirmed(false);
    setSelectedAddress("");
    setPostcode("");
    setCity("");
    setError(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div style={{ ...POPPINS }}>
      <label
        className="block"
        style={{ fontSize: 12, color: "#6B7280", ...POPPINS }}
      >
        Address
      </label>

      {!confirmed && (
        <input
          ref={inputRef}
          type="text"
          defaultValue={initialAddress}
          placeholder={
            placesLoaded ? "Start typing your address…" : "Loading address lookup…"
          }
          disabled={disabled || !placesLoaded}
          style={{
            width: "100%",
            height: 44,
            padding: "0 12px",
            marginTop: 6,
            border: `0.5px solid ${error ? "#1877D6" : "#EEF2F7"}`,
            borderRadius: 10,
            fontSize: 14,
            background: "#fff",
            color: "#0B1F3A",
            ...POPPINS,
          }}
        />
      )}

      {error && !confirmed && (
        <div
          style={{
            fontSize: 12,
            color: "#1877D6",
            marginTop: 6,
            ...POPPINS,
          }}
        >
          {error}
        </div>
      )}

      {confirmed && selectedAddress && (
        <div
          style={{
            marginTop: 6,
            padding: "10px 12px",
            background: "#F8FAFC",
            border: "0.5px solid #EEF2F7",
            borderRadius: 10,
            display: "flex",
            alignItems: "flex-start",
            gap: 10,
          }}
        >
          <Check size={18} color="#1877D6" style={{ marginTop: 2, flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: 14,
                color: "#0B1F3A",
                ...POPPINS,
                lineHeight: 1.35,
              }}
            >
              {selectedAddress}
            </div>
            {postcode && (
              <div
                style={{
                  fontSize: 12,
                  color: "#6B7280",
                  marginTop: 4,
                  ...POPPINS,
                }}
              >
                Postcode: {postcode}
                {city ? ` · ${city}` : ""}
              </div>
            )}
            <button
              type="button"
              onClick={reset}
              style={{
                marginTop: 6,
                background: "none",
                border: "none",
                color: "#1877D6",
                cursor: "pointer",
                fontSize: 12,
                padding: 0,
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                ...POPPINS,
              }}
            >
              <X size={12} /> Change
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
