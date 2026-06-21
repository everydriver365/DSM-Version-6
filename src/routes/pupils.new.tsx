import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { Input } from "../components/dsm/Input";
import { Button } from "../components/dsm/Button";
import { supabase } from "../lib/supabaseClient";

type NewPupilSearch = { name?: string; phone?: string };

const GOOGLE_MAPS_KEY = "AIzaSyDWFw0oL9ZyhwdvdvYtDsdJrTFYzF0khFc";
const UK_POSTCODE_RE = /^[A-Z]{1,2}[0-9][A-Z0-9]? ?[0-9][A-Z]{2}$/i;

export const Route = createFileRoute("/pupils/new")({
  head: () => ({
    meta: [{ title: "Add pupil — DSM by EveryDriver" }],
  }),
  validateSearch: (search: Record<string, unknown>): NewPupilSearch => ({
    name: typeof search.name === "string" ? search.name : undefined,
    phone: typeof search.phone === "string" ? search.phone : undefined,
  }),
  component: NewPupilPage,
});

function splitName(full: string): [string, string] {
  const parts = full.trim().split(/\s+/);
  if (parts.length === 0) return ["", ""];
  if (parts.length === 1) return [parts[0], ""];
  return [parts[0], parts.slice(1).join(" ")];
}

function loadGoogleMaps(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  const w = window as unknown as { google?: { maps?: { places?: unknown } } };
  if (w.google?.maps?.places) return Promise.resolve();
  const existing = document.getElementById(
    "google-maps-places-script",
  ) as HTMLScriptElement | null;
  if (existing) {
    return new Promise((resolve) => {
      existing.addEventListener("load", () => resolve());
      if (w.google?.maps?.places) resolve();
    });
  }
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.id = "google-maps-places-script";
    s.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_KEY}&libraries=places&loading=async`;
    s.async = true;
    s.defer = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Failed to load Google Maps"));
    document.head.appendChild(s);
  });
}

function NewPupilPage() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const [preFirst, preLast] = splitName(search.name ?? "");
  const [firstName, setFirstName] = useState(preFirst);
  const [lastName, setLastName] = useState(preLast);
  const [phone, setPhone] = useState(search.phone ?? "");
  const [address, setAddress] = useState("");
  const [postcode, setPostcode] = useState("");
  const [errors, setErrors] = useState<{
    firstName?: string;
    lastName?: string;
    postcode?: string;
    form?: string;
  }>({});
  const [saving, setSaving] = useState(false);
  const addressInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    loadGoogleMaps()
      .then(() => {
        if (cancelled) return;
        const input = addressInputRef.current;
        const g = (window as unknown as {
          google?: {
            maps?: {
              places?: {
                Autocomplete: new (
                  el: HTMLInputElement,
                  opts: Record<string, unknown>,
                ) => {
                  addListener: (e: string, cb: () => void) => void;
                  getPlace: () => {
                    formatted_address?: string;
                    address_components?: Array<{
                      long_name: string;
                      short_name: string;
                      types: string[];
                    }>;
                  };
                };
              };
            };
          };
        }).google;
        if (!input || !g?.maps?.places) return;
        const ac = new g.maps.places.Autocomplete(input, {
          componentRestrictions: { country: "gb" },
          types: ["address"],
          fields: ["formatted_address", "address_components"],
        });
        ac.addListener("place_changed", () => {
          const place = ac.getPlace();
          const formatted = place.formatted_address ?? "";
          const pc =
            place.address_components?.find((c) =>
              c.types.includes("postal_code"),
            )?.long_name ?? "";
          if (formatted) setAddress(() => formatted);
          if (pc) setPostcode(() => pc);
        });
      })
      .catch(() => {
        // silently ignore — manual entry still works
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSave() {
    const next: typeof errors = {};
    if (!firstName.trim()) next.firstName = "First name is required";
    if (!lastName.trim()) next.lastName = "Last name is required";
    if (postcode.trim() && !UK_POSTCODE_RE.test(postcode.trim())) {
      next.postcode = "Enter a valid UK postcode";
    }
    if (Object.keys(next).length) {
      setErrors(next);
      return;
    }
    setErrors({});
    setSaving(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setErrors({ form: "You must be signed in to add a pupil" });
      setSaving(false);
      return;
    }
    const first = firstName.trim();
    const last = lastName.trim();
    const insert: Record<string, unknown> = {
      instructor_id: user.id,
      first_name: first,
      last_name: last,
      name: `${first} ${last}`.trim(),
      status: "active",
    };
    if (phone.trim()) insert.phone = phone.trim();
    if (address.trim()) insert.address = address.trim();
    if (postcode.trim()) insert.postcode = postcode.trim().toUpperCase();
    const { error } = await supabase.from("pupils").insert(insert);
    if (error) {
      setErrors({ form: error.message });
      setSaving(false);
      return;
    }
    navigate({ to: "/pupils" });
  }

  return (
    <div
      className="min-h-screen bg-white"
      style={{ fontFamily: "Poppins, sans-serif" }}
    >
      <div className="px-4 pt-6">
        <div className="flex items-center gap-3 mb-4">
          <button
            type="button"
            aria-label="Back to pupils"
            onClick={() => navigate({ to: "/pupils" })}
            className="flex items-center justify-center w-8 h-8 -ml-1"
          >
            <ArrowLeft size={20} color="#0F2044" />
          </button>
          <p
            className="text-[20px] font-semibold"
            style={{ color: "#0F2044", fontFamily: "Poppins, sans-serif" }}
          >
            Add pupil
          </p>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSave();
          }}
          className="flex flex-col gap-4 mt-2"
        >
          <div>
            <Input
              label="First name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              maxLength={100}
            />
            {errors.firstName && (
              <p className="mt-1 text-[12px]" style={{ color: "#CC2229" }}>
                {errors.firstName}
              </p>
            )}
          </div>
          <div>
            <Input
              label="Last name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              maxLength={100}
            />
            {errors.lastName && (
              <p className="mt-1 text-[12px]" style={{ color: "#CC2229" }}>
                {errors.lastName}
              </p>
            )}
          </div>
          <Input
            label="Phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            maxLength={30}
          />
          <Input
            ref={addressInputRef}
            label="Home address"
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            maxLength={255}
            autoComplete="off"
            placeholder="Start typing an address…"
          />
          <div>
            <Input
              label="Postcode"
              type="text"
              value={postcode}
              onChange={(e) => setPostcode(e.target.value)}
              maxLength={10}
              autoComplete="postal-code"
            />
            {errors.postcode && (
              <p className="mt-1 text-[12px]" style={{ color: "#CC2229" }}>
                {errors.postcode}
              </p>
            )}
          </div>
          {errors.form && (
            <p className="text-[12px]" style={{ color: "#CC2229" }}>
              {errors.form}
            </p>
          )}

          <div className="mt-2">
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : "Save pupil"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
