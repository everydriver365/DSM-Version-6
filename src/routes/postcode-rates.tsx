import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, MapPin, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "../lib/supabaseClient";

export const Route = createFileRoute("/postcode-rates")({
  head: () => ({ meta: [{ title: "Postcode rates — DSM by EveryDriver" }] }),
  component: PostcodeRatesPage,
});

const POPPINS = { fontFamily: "Inter, sans-serif" } as const;

interface Rule {
  id: string;
  outward_code: string;
  hourly_rate: number;
  label: string | null;
}

function PostcodeRatesPage() {
  const navigate = useNavigate();
  const [uid, setUid] = useState<string | null>(null);
  const [defaultRate, setDefaultRate] = useState<number | null>(null);
  const [rules, setRules] = useState<Rule[] | null>(null);
  const [outward, setOutward] = useState("");
  const [rate, setRate] = useState("");
  const [label, setLabel] = useState("");
  const [saving, setSaving] = useState(false);

  async function load(userId: string) {
    const { data, error } = await supabase
      .from("instructor_postcode_rates")
      .select("id, outward_code, hourly_rate, label")
      .eq("instructor_id", userId)
      .order("outward_code", { ascending: true });
    if (error) {
      console.error("[postcode-rates] load", error);
      setRules([]);
      return;
    }
    setRules((data ?? []) as Rule[]);
  }

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      const id = data.user?.id ?? null;
      setUid(id);
      if (!id) return;
      const { data: inst } = await supabase
        .from("instructors")
        .select("hourly_rate")
        .eq("id", id)
        .maybeSingle();
      if (inst?.hourly_rate != null) setDefaultRate(Number(inst.hourly_rate));
      await load(id);
    });
  }, []);

  async function addRule() {
    if (!uid) return;
    const code = outward.trim().toUpperCase();
    const r = Number(rate);
    if (!code) { toast.error("Enter outward code"); return; }
    if (!Number.isFinite(r) || r <= 0) { toast.error("Enter a valid rate"); return; }
    setSaving(true);
    const { error } = await supabase.from("instructor_postcode_rates").insert({
      instructor_id: uid,
      outward_code: code,
      hourly_rate: r,
      label: label.trim() || null,
    });
    setSaving(false);
    if (error) {
      console.error("[postcode-rates] insert", error);
      toast.error("Failed to add rule");
      return;
    }
    setOutward(""); setRate(""); setLabel("");
    toast.success("Rule added");
    await load(uid);
  }

  async function delRule(id: string) {
    if (!uid) return;
    const { error } = await supabase.from("instructor_postcode_rates").delete().eq("id", id).eq("instructor_id", uid);
    if (error) {
      console.error("[postcode-rates] delete", error);
      toast.error("Failed to delete");
      return;
    }
    setRules((prev) => (prev ?? []).filter((r) => r.id !== id));
  }

  const inputStyle: React.CSSProperties = {
    width: "100%",
    height: 44,
    padding: "0 12px",
    border: "0.5px solid #E2E6ED",
    borderRadius: 10,
    fontSize: 14,
    color: "#0B1F3A",
    background: "#fff",
    ...POPPINS,
  };

  return (
    <div className="min-h-screen bg-[#EEF2F7] pb-12" style={POPPINS}>
      <div className="sticky top-0 z-40 flex items-center px-2" style={{ height: 52, background: "#0F2044" }}>
        <button type="button" aria-label="Back" onClick={() => navigate({ to: "/settings" })} className="flex items-center justify-center" style={{ width: 40, height: 40 }}>
          <ArrowLeft size={22} color="#fff" />
        </button>
        <div className="flex-1 text-center text-[15px] font-semibold text-white" style={POPPINS}>Postcode rates</div>
        <div style={{ width: 40 }} />
      </div>

      <div className="px-4 pt-4">
        <p className="text-[13px]" style={{ color: "#0B1F3A", ...POPPINS }}>
          Set different hourly rates for different postcode areas. The outward code is the first part of the postcode (e.g. SO22, PO15, GU11).
        </p>
        <div className="mt-3 rounded-xl px-3 py-2" style={{ background: "#E0F2FE", color: "#0B1F3A", ...POPPINS, fontSize: 13 }}>
          Your default rate: {defaultRate != null ? `£${defaultRate}/hr` : "not set"} — applies where no postcode rule exists.
        </div>

        <div className="mt-4 flex flex-col gap-2">
          {rules === null ? (
            <div className="text-[13px]" style={{ color: "#6B7280", ...POPPINS }}>Loading…</div>
          ) : rules.length === 0 ? (
            <div className="text-[13px]" style={{ color: "#6B7280", ...POPPINS }}>No postcode rules yet.</div>
          ) : (
            rules.map((r) => (
              <div key={r.id} className="flex items-center gap-3 bg-white rounded-xl px-3 py-3" style={{ border: "0.5px solid #E2E6ED" }}>
                <span className="text-[12px] font-bold px-2 py-1 rounded-md" style={{ background: "#E0F2FE", color: "#0369A1", ...POPPINS }}>
                  {r.outward_code}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-[14px] font-semibold" style={{ color: "#0B1F3A", ...POPPINS }}>£{Number(r.hourly_rate).toFixed(2)}/hr</div>
                  {r.label && <div className="text-[12px] truncate" style={{ color: "#6B7280", ...POPPINS }}>{r.label}</div>}
                </div>
                <button type="button" aria-label="Delete" onClick={() => delRule(r.id)} className="flex items-center justify-center rounded-lg" style={{ width: 36, height: 36, background: "#FEECEE" }}>
                  <Trash2 size={16} color="#CC2229" />
                </button>
              </div>
            ))
          )}
        </div>

        <div className="mt-6 bg-white rounded-xl p-4" style={{ border: "0.5px solid #E2E6ED" }}>
          <div className="flex items-center gap-2 mb-3">
            <MapPin size={18} color="#1877D6" />
            <span className="text-[14px] font-semibold" style={{ color: "#0B1F3A", ...POPPINS }}>Add rule</span>
          </div>
          <label className="text-[12px]" style={{ color: "#6B7280", ...POPPINS }}>Outward code</label>
          <input style={{ ...inputStyle, marginTop: 6, marginBottom: 10, textTransform: "uppercase" }} value={outward} onChange={(e) => setOutward(e.target.value.toUpperCase().slice(0, 4))} maxLength={4} placeholder="e.g. SO22" />
          <label className="text-[12px]" style={{ color: "#6B7280", ...POPPINS }}>Hourly rate (£)</label>
          <input style={{ ...inputStyle, marginTop: 6, marginBottom: 10 }} type="number" step="0.5" inputMode="decimal" value={rate} onChange={(e) => setRate(e.target.value)} placeholder="45" />
          <label className="text-[12px]" style={{ color: "#6B7280", ...POPPINS }}>Label (optional)</label>
          <input style={{ ...inputStyle, marginTop: 6, marginBottom: 14 }} value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Winchester area" maxLength={60} />
          <button type="button" onClick={addRule} disabled={saving} className="w-full text-white text-[14px] font-semibold" style={{ height: 48, borderRadius: 10, background: "#1877D6", opacity: saving ? 0.5 : 1, ...POPPINS }}>
            {saving ? "Saving…" : "Add rule"}
          </button>
          <p className="mt-3 text-[12px]" style={{ color: "#6B7280", ...POPPINS }}>
            Rules apply automatically when creating lessons for pupils in that postcode area.
          </p>
        </div>
      </div>
    </div>
  );
}