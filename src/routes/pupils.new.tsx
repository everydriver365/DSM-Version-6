import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { Input } from "../components/dsm/Input";
import { Button } from "../components/dsm/Button";
import { supabase } from "../lib/supabaseClient";

export const Route = createFileRoute("/pupils/new")({
  head: () => ({
    meta: [{ title: "Add pupil — DSM by EveryDriver" }],
  }),
  component: NewPupilPage,
});

function NewPupilPage() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [errors, setErrors] = useState<{ name?: string; form?: string }>({});
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    const next: typeof errors = {};
    if (!name.trim()) next.name = "Name is required";
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
    const { error } = await supabase.from("pupils").insert({
      instructor_id: user.id,
      name: name.trim(),
      status: "active",
    });
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
              label="Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={200}
            />
            {errors.name && (
              <p className="mt-1 text-[12px]" style={{ color: "#CC2229" }}>
                {errors.name}
              </p>
            )}
          </div>
          <Input
            label="Phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            maxLength={32}
          />
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
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
