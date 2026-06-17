import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { Input } from "../components/dsm/Input";
import { Button } from "../components/dsm/Button";
import { supabase } from "../lib/supabaseClient";

type NewPupilSearch = { name?: string; phone?: string };

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

function NewPupilPage() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const [preFirst, preLast] = splitName(search.name ?? "");
  const [firstName, setFirstName] = useState(preFirst);
  const [lastName, setLastName] = useState(preLast);
  const [phone, setPhone] = useState(search.phone ?? "");
  const [address, setAddress] = useState("");
  const [errors, setErrors] = useState<{
    firstName?: string;
    lastName?: string;
    form?: string;
  }>({});
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    const next: typeof errors = {};
    if (!firstName.trim()) next.firstName = "First name is required";
    if (!lastName.trim()) next.lastName = "Last name is required";
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
      name: `${first} ${last}`,
      status: "active",
    };
    if (phone.trim()) insert.phone = phone.trim();
    if (address.trim()) insert.address = address.trim();
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
            label="Home address"
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            maxLength={255}
          />
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
