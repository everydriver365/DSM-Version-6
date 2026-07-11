import { useState } from "react";
import { Check, Loader2, Search } from "lucide-react";

const POPPINS = { fontFamily: "Poppins, system-ui, sans-serif" } as const;
const UK_POSTCODE_RE = /^[A-Z]{1,2}[0-9][A-Z0-9]? ?[0-9][A-Z]{2}$/i;

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

/**
 * UK postcode → address/city/lat/lng lookup using api.postcodes.io.
 * postcodes.io does not return a street address, so `address` is derived from
 * the postcode's admin_ward + admin_district (best-effort locality string).
 */
export function AddressLookup({
  initialPostcode = "",
  initialAddress = "",
  initialCity = "",
  onAddressFound,
  disabled = false,
}: Props) {
  const [postcode, setPostcode] = useState(initialPostcode.toUpperCase());
  const [address, setAddress] = useState(initialAddress);
  const [city, setCity] = useState(initialCity);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [found, setFound] = useState<boolean>(!!initialAddress);

  const valid = UK_POSTCODE_RE.test(postcode.trim());

  async function lookup() {
    const pc = postcode.trim().toUpperCase();
    console.log("[address-lookup] postcode entered:", pc);
    if (!UK_POSTCODE_RE.test(pc)) {
      console.warn("[address-lookup] failed local UK postcode regex:", pc);
      setError("Enter a valid UK postcode");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const url = `https://api.postcodes.io/postcodes/${encodeURIComponent(pc)}`;
      const res = await fetch(url);
      const data = await res.json().catch(() => null);
      console.log("[address-lookup] raw response:", data);

      if (data && data.status === 200 && data.result) {
        const r = data.result;
        const parts = [r.ward, r.admin_district, r.admin_county].filter(
          (x: unknown): x is string => typeof x === "string" && x.length > 0,
        );
        const derivedAddress: string = parts.length ? parts.join(", ") : pc;
        const derivedCity: string = r.admin_district || r.parish || "";
        const lat: number | null =
          typeof r.latitude === "number" ? r.latitude : null;
        const lng: number | null =
          typeof r.longitude === "number" ? r.longitude : null;

        console.log("[address-lookup] api response:", {
          address: derivedAddress,
          city: derivedCity,
          lat,
          lng,
        });

        setAddress(derivedAddress);
        setCity(derivedCity);
        setFound(true);
        onAddressFound({
          postcode: pc,
          address: derivedAddress,
          city: derivedCity,
          lat,
          lng,
        });
      } else {
        console.error("[address-lookup] postcode not found:", data);
        setError("Postcode not found — please check and try again");
        setFound(false);
      }
    } catch (e) {
      console.error("[address-lookup] error:", e);
      setError("Could not look up postcode");
      setFound(false);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ ...POPPINS }}>
      <label
        className="block"
        style={{ fontSize: 12, color: "#6B7280", ...POPPINS }}
      >
        Postcode
      </label>
      <div
        style={{
          display: "flex",
          gap: 8,
          marginTop: 6,
          alignItems: "stretch",
        }}
      >
        <div style={{ position: "relative", flex: 1 }}>
          <input
            type="text"
            value={postcode}
            onChange={(e) => {
              setPostcode(e.target.value.toUpperCase());
              setFound(false);
              setError(null);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                lookup();
              }
            }}
            placeholder="e.g. SO23 9AX"
            autoCapitalize="characters"
            maxLength={10}
            disabled={disabled || loading}
            style={{
              width: "100%",
              height: 44,
              padding: "0 36px 0 12px",
              border: `0.5px solid ${error ? "#1877D6" : "#EEF2F7"}`,
              borderRadius: 10,
              fontSize: 14,
              background: "#fff",
              color: "#0B1F3A",
              textTransform: "uppercase",
              ...POPPINS,
            }}
          />
          {found && !loading && (
            <Check
              size={18}
              color="#1877D6"
              style={{
                position: "absolute",
                right: 10,
                top: "50%",
                transform: "translateY(-50%)",
              }}
            />
          )}
        </div>
        <button
          type="button"
          onClick={lookup}
          disabled={disabled || loading || !valid}
          style={{
            height: 44,
            padding: "0 14px",
            borderRadius: 10,
            border: "none",
            background: "#0B1F3A",
            color: "#fff",
            fontSize: 13,
            fontWeight: 600,
            cursor: loading || !valid ? "not-allowed" : "pointer",
            opacity: loading || !valid ? 0.5 : 1,
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            ...POPPINS,
          }}
        >
          {loading ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Search size={14} />
          )}
          {loading ? "Looking up" : "Lookup"}
        </button>
      </div>
      {error && (
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
      {found && address && (
        <div
          style={{
            marginTop: 10,
            padding: "10px 12px",
            background: "#F8FAFC",
            border: "0.5px solid #EEF2F7",
            borderRadius: 10,
          }}
        >
          <div style={{ fontSize: 12, color: "#6B7280", ...POPPINS }}>
            Address
          </div>
          <div
            style={{
              fontSize: 14,
              color: "#0B1F3A",
              marginTop: 2,
              ...POPPINS,
            }}
          >
            {address}
          </div>
          {city && (
            <>
              <div
                style={{
                  fontSize: 12,
                  color: "#6B7280",
                  marginTop: 8,
                  ...POPPINS,
                }}
              >
                City
              </div>
              <div
                style={{
                  fontSize: 14,
                  color: "#0B1F3A",
                  marginTop: 2,
                  ...POPPINS,
                }}
              >
                {city}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
