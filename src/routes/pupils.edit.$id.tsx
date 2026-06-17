import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { Input } from "../components/dsm/Input";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { supabase } from "../lib/supabaseClient";

export const Route = createFileRoute("/pupils/edit/$id")({
  head: () => ({
    meta: [{ title: "Edit pupil — DSM by EveryDriver" }],
  }),
  component: EditPupilPage,
});

const POPPINS = { fontFamily: "Poppins, sans-serif" } as const;

const STATUSES: { label: string; value: string }[] = [
  { label: "Active", value: "active" },
  { label: "Passed", value: "passed" },
  { label: "Inactive", value: "inactive" },
  { label: "On hold", value: "on_hold" },
  { label: "Cancelled", value: "cancelled" },
];

const fieldBorder: React.CSSProperties = {
  fontFamily: "Poppins, sans-serif",
  borderWidth: "0.5px",
  borderStyle: "solid",
  borderColor: "#E2E6ED",
};

function FieldLabel({ htmlFor, children }: { htmlFor: string; children: React.ReactNode }) {
  return (
    <label
      htmlFor={htmlFor}
      className="block mb-1 text-[12px] font-medium text-[#6B7280]"
      style={POPPINS}
    >
      {children}
    </label>
  );
}

function EditPupilPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("active");
  const [testDate, setTestDate] = useState("");
  const [notes, setNotes] = useState("");
  const [address, setAddress] = useState("");
  const originalStatus = useRef<string>("active");
  const [inactiveConfirmOpen, setInactiveConfirmOpen] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: userData, error: authErr } = await supabase.auth.getUser();
      if (authErr) {
        console.error("[edit-pupil] auth error", authErr);
        setLoading(false);
        return;
      }
      if (!userData.user) {
        setLoading(false);
        return;
      }

      const { data, error: fetchErr } = await supabase
        .from("pupils")
        .select("first_name, last_name, phone, email, status, test_date, notes, address")
        .eq("id", id)
        .is("deleted_at", null)
        .maybeSingle();

      if (fetchErr) {
        console.error("[edit-pupil] fetch error", fetchErr);
        setError(fetchErr.message);
      } else if (data) {
        const p = data as {
          first_name: string | null;
          last_name: string | null;
          phone: string | null;
          email: string | null;
          status: string | null;
          test_date: string | null;
          notes: string | null;
          address: string | null;
        };
        setFirstName(p.first_name ?? "");
        setLastName(p.last_name ?? "");
        setPhone(p.phone ?? "");
        setEmail(p.email ?? "");
        setStatus(p.status ?? "active");
        originalStatus.current = p.status ?? "active";
        setTestDate(p.test_date ?? "");
        setNotes(p.notes ?? "");
        setAddress(p.address ?? "");
      }
      setLoading(false);
    })();
  }, [id]);

  async function handleSave() {
    if (saving) return;
    setSaving(true);
    setError(null);

    const name = `${firstName.trim()} ${lastName.trim()}`.trim();

    const { error: updErr } = await supabase
      .from("pupils")
      .update({
        first_name: firstName.trim() || null,
        last_name: lastName.trim() || null,
        name: name || null,
        phone: phone.trim() || null,
        email: email.trim() || null,
        status: status || "active",
        test_date: testDate || null,
        notes: notes.trim() || null,
        address: address.trim() || null,
      })
      .eq("id", id);

    if (updErr) {
      console.error("[edit-pupil] update error", updErr);
      setError(updErr.message);
      setSaving(false);
      return;
    }
    toast.success("Pupil updated");
    navigate({ to: "/pupils/$id", params: { id } });
  }

  return (
    <div className="min-h-screen bg-white pb-8" style={POPPINS}>
      {/* Top bar */}
      <div
        className="sticky top-0 z-40 flex items-center justify-between px-2"
        style={{ height: 52, backgroundColor: "#0F2044" }}
      >
        <button
          type="button"
          aria-label="Back"
          onClick={() => navigate({ to: "/pupils/$id", params: { id } })}
          className="flex items-center justify-center"
          style={{ width: 40, height: 40 }}
        >
          <ArrowLeft size={22} color="#FFFFFF" />
        </button>
        <div className="flex-1 text-center text-[15px] font-semibold text-white" style={POPPINS}>
          Edit pupil
        </div>
        <button
          type="button"
          aria-label="Save"
          onClick={handleSave}
          disabled={saving || loading}
          className="flex items-center justify-center text-white text-[14px] font-semibold px-3"
          style={{ height: 40, opacity: saving || loading ? 0.5 : 1 }}
        >
          {saving ? "Saving…" : "Save"}
        </button>
      </div>

      {loading ? (
        <div className="px-4 pt-6 text-[14px] text-[#6B7280]">Loading…</div>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSave();
          }}
          className="flex flex-col gap-4 px-4 pt-4"
        >
          <Input
            label="First name"
            type="text"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
          />

          <Input
            label="Last name"
            type="text"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
          />

          <Input
            label="Phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />

          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <Input
            label="Home address"
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />


          <div>
            <FieldLabel htmlFor="status">Status</FieldLabel>
            <select
              id="status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="h-11 w-full rounded-lg px-3 text-[14px] text-[#1A1A2E] bg-white focus:border-[#1A52A0] focus:outline-none"
              style={fieldBorder}
            >
              {STATUSES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          <Input
            label="Test date"
            type="date"
            value={testDate}
            onChange={(e) => setTestDate(e.target.value)}
          />

          <div>
            <FieldLabel htmlFor="notes">Notes</FieldLabel>
            <textarea
              id="notes"
              rows={4}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add notes about this pupil…"
              className="w-full rounded-lg px-3 py-2 text-[14px] text-[#1A1A2E] bg-white focus:border-[#1A52A0] focus:outline-none"
              style={fieldBorder}
            />
          </div>

          {error && (
            <p className="text-[12px]" style={{ color: "#CC2229" }}>
              {error}
            </p>
          )}
        </form>
      )}
    </div>
  );
}
