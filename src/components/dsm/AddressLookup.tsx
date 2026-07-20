import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { Check, Loader2, MapPin, Search, X } from "lucide-react";

const POPPINS = { fontFamily: "Poppins, system-ui, sans-serif" } as const;

// Prefer the Lovable-managed browser key (referrer-restricted to *.lovable.app / *.lovableproject.com);
// fall back to the legacy hardcoded key if the connector env var is missing at build time.
const GOOGLE_MAPS_KEY =
  (import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY as string | undefined)
  || "AIzaSyDWFw0oL9ZyhwdvdvYtDsdJrTFYzF0khFc";
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
  showSearchButton?: boolean;
}

type Prediction = {
  place_id: string;
  description: string;
  structured_formatting?: {
    main_text: string;
    secondary_text?: string;
  };
};

// Minimal typing for the google.maps.places surface we use
type GAutocompleteService = {
  getPlacePredictions: (
    request: {
      input: string;
      componentRestrictions?: { country: string | string[] };
      types?: string[];
    },
    callback: (predictions: Prediction[] | null, status: string) => void,
  ) => void;
};

type GPlace = {
  formatted_address?: string;
  address_components?: Array<{
    long_name: string;
    short_name: string;
    types: string[];
  }>;
  geometry?: {
    location?: {
      lat: () => number;
      lng: () => number;
    };
  };
};

type GPlacesService = {
  getDetails: (
    request: { placeId: string; fields: string[] },
    callback: (place: GPlace | null, status: string) => void,
  ) => void;
};

type GWindow = Window & {
  google?: {
    maps?: {
      places?: {
        AutocompleteService: new () => GAutocompleteService;
        PlacesService: new (div: HTMLDivElement) => GPlacesService;
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
  showSearchButton = false,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const serviceRef = useRef<GAutocompleteService | null>(null);
  const placesServiceRef = useRef<GPlacesService | null>(null);

  const [placesLoaded, setPlacesLoaded] = useState<boolean>(
    typeof window !== "undefined" && !!(window as GWindow).google?.maps?.places,
  );
  const [inputValue, setInputValue] = useState<string>(initialAddress);
  const [selectedAddress, setSelectedAddress] = useState<string>(initialAddress);
  const [baseAddress, setBaseAddress] = useState<string>(initialAddress);
  const [doorNumber, setDoorNumber] = useState<string>("");
  const [postcode, setPostcode] = useState<string>(initialPostcode);
  const [city, setCity] = useState<string>(initialCity);
  const [selectedLat, setSelectedLat] = useState<number | null>(null);
  const [selectedLng, setSelectedLng] = useState<number | null>(null);
  const [confirmed, setConfirmed] = useState<boolean>(!!initialAddress);
  const [loading, setLoading] = useState<boolean>(false);
  const [suggestions, setSuggestions] = useState<Prediction[]>([]);
  const [showSuggestions, setShowSuggestions] = useState<boolean>(false);
  const [noResults, setNoResults] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [searchKey, setSearchKey] = useState<number>(0);

  console.log("[address-lookup] rendered, initial:", {
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

  // Initialise services once the script is loaded
  useEffect(() => {
    if (!placesLoaded) return;
    const g = (window as GWindow).google;
    if (!g?.maps?.places) return;
    serviceRef.current = new g.maps.places.AutocompleteService();
    const serviceNode = document.createElement("div");
    placesServiceRef.current = new g.maps.places.PlacesService(serviceNode);
  }, [placesLoaded]);

  // Close suggestions when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch predictions as the user types
  useEffect(() => {
    setError(null);
    if (!placesLoaded || !serviceRef.current || confirmed || inputValue.length < 3) {
      setSuggestions([]);
      setShowSuggestions(false);
      setNoResults(false);
      setLoading(false);
      return;
    }

    setLoading(true);
    setNoResults(false);
    setShowSuggestions(false);

    const timer = setTimeout(() => {
      serviceRef.current?.getPlacePredictions(
        {
          input: inputValue,
          componentRestrictions: { country: "gb" },
          types: ["geocode"],
        },
        (predictions, status) => {
          setLoading(false);
          if (status === "OK" && predictions && predictions.length > 0) {
            setSuggestions(predictions);
            setNoResults(false);
            setError(null);
            setShowSuggestions(true);
          } else if (status === "ZERO_RESULTS") {
            setSuggestions([]);
            setNoResults(true);
            setError(null);
            setShowSuggestions(true);
          } else {
            console.error(
              "[address-lookup] getPlacePredictions failed:",
              status,
              "input:",
              inputValue,
            );
            setSuggestions([]);
            setNoResults(false);
            setShowSuggestions(false);
            setError(`Address lookup failed (${status}). Please try again.`);
          }
        },
      );
    }, 300);


    return () => clearTimeout(timer);
  }, [inputValue, placesLoaded, confirmed, searchKey]);

  const handleSelect = useCallback(
    (prediction: Prediction) => {
      if (!placesServiceRef.current) return;
      setLoading(true);
      setShowSuggestions(false);
      setError(null);

      placesServiceRef.current.getDetails(
        {
          placeId: prediction.place_id,
          fields: ["formatted_address", "address_components", "geometry"],
        },
        (place, status) => {
          setLoading(false);
          if (!place || status !== "OK") {
            console.error(
              "[address-lookup] getDetails failed:",
              status,
              "placeId:",
              prediction.place_id,
            );
            setError(`Could not fetch address details (${status}).`);
            return;
          }


          let streetNumber = "";
          let streetName = "";
          let town = "";
          let county = "";
          let pc = "";

          for (const comp of place.address_components || []) {
            const type = comp.types[0];
            if (type === "street_number") streetNumber = comp.long_name;
            else if (type === "route") streetName = comp.long_name;
            else if (type === "postal_town" || type === "locality")
              town = comp.long_name;
            else if (type === "administrative_area_level_2")
              county = comp.long_name;
            else if (type === "postal_code") pc = comp.long_name;
          }

          const line1 = [streetNumber, streetName].filter(Boolean).join(" ");
          const formatted = place.formatted_address || line1 || "";
          const lat = place.geometry?.location?.lat() ?? null;
          const lng = place.geometry?.location?.lng() ?? null;
          const derivedCity = town || county || "";

          setSelectedAddress(formatted);
          setBaseAddress(formatted);
          setDoorNumber("");
          setPostcode(pc);
          setCity(derivedCity);
          setSelectedLat(lat);
          setSelectedLng(lng);
          setInputValue(formatted);
          setConfirmed(true);

          onAddressFound({
            postcode: pc,
            address: formatted,
            city: derivedCity,
            lat,
            lng,
          });
        },
      );
    },
    [onAddressFound],
  );

  function reset() {
    setConfirmed(false);
    setSelectedAddress("");
    setBaseAddress("");
    setDoorNumber("");
    setPostcode("");
    setCity("");
    setSelectedLat(null);
    setSelectedLng(null);
    setInputValue("");
    setError(null);
    setSuggestions([]);
    setShowSuggestions(false);
    setNoResults(false);
    if (inputRef.current) inputRef.current.value = "";
  }

  function commitDoorNumber(next: string) {
    const trimmed = next.trim();
    const combined = trimmed ? `${trimmed} ${baseAddress}` : baseAddress;
    setSelectedAddress(combined);
    onAddressFound({
      postcode,
      address: combined,
      city,
      lat: selectedLat,
      lng: selectedLng,
    });
  }

  const inputBorderColor = error ? "#1877D6" : "#EEF2F7";

  return (
    <div ref={containerRef} style={{ ...POPPINS, position: "relative" }}>
      <label
        className="block"
        style={{ fontSize: 12, color: "#6B7280", ...POPPINS }}
      >
        Address
      </label>

      {!confirmed && (
        <div style={{ position: "relative" }}>
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onFocus={() => {
              if (inputValue.length >= 3) setShowSuggestions(true);
            }}
            placeholder={
              placesLoaded ? "Start typing your address…" : "Loading address lookup…"
            }
            disabled={disabled || !placesLoaded}
            autoComplete="new-password"
            style={{
              width: "100%",
              height: 44,
              padding: "0 12px",
              paddingRight: 36,
              marginTop: 6,
              border: `0.5px solid ${inputBorderColor}`,
              borderRadius: 10,
              fontSize: 14,
              background: "#fff",
              color: "#0B1F3A",
              ...POPPINS,
            }}
          />
          {loading && (
            <div
              style={{
                position: "absolute",
                right: 10,
                top: "50%",
                marginTop: 3,
                transform: "translateY(-50%)",
                pointerEvents: "none",
              }}
            >
              <Loader2 size={18} color="#1877D6" className="animate-spin" />
            </div>
          )}
        </div>
      )}

      {showSearchButton && !confirmed && !loading && inputValue.length >= 3 && (
        <div className="flex justify-end" style={{ marginTop: 6 }}>
          <button
            type="button"
            onClick={() => {
              setError(null);
              setSearchKey((k) => k + 1);
            }}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "6px 12px",
              borderRadius: 8,
              border: "0.5px solid #E2E6ED",
              background: "#fff",
              color: "#1877D6",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              ...POPPINS,
            }}
          >
            <Search size={14} color="#1877D6" />
            Search now
          </button>
        </div>
      )}

      {!confirmed && showSuggestions && (
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
            maxHeight: 240,
            overflowY: "auto",
            zIndex: 50,
          }}
        >
          {loading && suggestions.length === 0 && !noResults && (
            <div
              style={{
                padding: "12px",
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontSize: 13,
                color: "#6B7280",
                ...POPPINS,
              }}
            >
              <Loader2 size={14} color="#1877D6" className="animate-spin" />
              Searching addresses…
            </div>
          )}

          {noResults && (
            <div
              style={{
                padding: "12px",
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontSize: 13,
                color: "#6B7280",
                ...POPPINS,
              }}
            >
              <MapPin size={14} color="#9CA3AF" />
              No results found. Try a different address.
            </div>
          )}

          {suggestions.map((prediction) => (
            <button
              key={prediction.place_id}
              type="button"
              onClick={() => handleSelect(prediction)}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 8,
                width: "100%",
                padding: "10px 12px",
                textAlign: "left",
                background: "transparent",
                border: "none",
                borderBottom: "0.5px solid #F1F5F9",
                cursor: "pointer",
                fontSize: 13,
                color: "#0B1F3A",
                ...POPPINS,
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.backgroundColor = "#F4F8FE")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.backgroundColor = "transparent")
              }
            >
              <MapPin
                size={14}
                color="#1877D6"
                style={{ marginTop: 2, flexShrink: 0 }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 13,
                    color: "#0B1F3A",
                    ...POPPINS,
                    lineHeight: 1.35,
                  }}
                >
                  {prediction.structured_formatting?.main_text ||
                    prediction.description}
                </div>
                {prediction.structured_formatting?.secondary_text && (
                  <div
                    style={{
                      fontSize: 11,
                      color: "#6B7280",
                      marginTop: 2,
                      ...POPPINS,
                    }}
                  >
                    {prediction.structured_formatting.secondary_text}
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>
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
          <Check
            size={18}
            color="#1877D6"
            style={{ marginTop: 2, flexShrink: 0 }}
          />
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
