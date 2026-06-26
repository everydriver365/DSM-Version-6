import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

export const Route = createFileRoute("/quotes/new")({
  component: NewQuotePage,
});

const POPPINS = { fontFamily: "Poppins, sans-serif" as const };
const COURSE_TYPES = ["Intensive", "Semi-intensive", "Weekly lessons", "Pass Plus", "Motorway", "Other"];
const POSTCODE_RE = /^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/i;

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "10px 12px", border: "1px solid #E2E6ED",
  borderRadius: 8, fontSize: 14, fontFamily: "Poppins, sans-serif",
  background: "#fff", color: "#0F2044", boxSizing: "border-box",
};
const labelStyle: React.CSSProperties = { fontSize: 12, fontWeight: 600, color: "#6B7280", marginBottom: 4, display: "block" };

function NewQuotePage() {
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [hourlyRate, setHourlyRate] = useState<number>(0);

  const [pupilName, setPupilName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [postcode, setPostcode] = useState("");
  const [courseType, setCourseType] = useState(COURSE_TYPES[0]);
  const [hours, setHours] = useState<string>("");
  const [price, setPrice] = useState<string>("");
  const [deposit, setDeposit] = useState<string>("");
  const [notes, setNotes] = useState("");
  const defaultValid = (() => { const d = new Date(); d.setDate(d.getDate() + 14); return d.toISOString().slice(0, 10); })();
  const [validUntil, setValidUntil] = useState(defaultValid);
  const [priceTouched, setPriceTouched] = useState(false);
  const [depositTouched, setDepositTouched] = useState(false);
  const [errors, setErrors] = useState<{ pupilName?: string; price?: string; postcode?: string }>({});

  const errorTextStyle: React.CSSProperties = { fontSize: 12, color: "#D92D20", marginTop: 4, fontFamily: "Poppins, sans-serif" };
  const errorInputStyle: React.CSSProperties = { ...inputStyle, border: "1px solid #D92D20" };

  useEffect(() => {
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id ?? null;
      setUserId(uid);
      if (uid) {
        const { data } = await supabase.from("instructors").select("hourly_rate").eq("id", uid).maybeSingle();
        if (data?.hourly_rate) setHourlyRate(Number(data.hourly_rate) || 0);
      }
    })();
  }, []);

  useEffect(() => {
    const h = parseFloat(hours);
    if (!priceTouched && !isNaN(h) && hourlyRate > 0) setPrice((h * hourlyRate).toFixed(2));
  }, [hours, hourlyRate, priceTouched]);

  useEffect(() => {
    const p = parseFloat(price);
    if (!depositTouched && !isNaN(p)) setDeposit((p * 0.2).toFixed(2));
  }, [price, depositTouched]);

  async function generateRef(): Promise<string> {
    const year = new Date().getFullYear();
    const { count } = await supabase.from("quotes").select("*", { count: "exact", head: true }).eq("instructor_id", userId!);
    const seq = String((count ?? 0) + 1).padStart(3, "0");
    return `QT-${year}-${seq}`;
  }

  async function save(status: "draft" | "sent") {
    if (!pupilName.trim()) { alert("Pupil name is required"); return; }
    if (postcode && !POSTCODE_RE.test(postcode.trim())) { alert("Invalid UK postcode"); return; }
    if (!userId) { alert("Not signed in"); return; }
    setSaving(true);
    try {
      const quote_ref = await generateRef();
      const { data, error } = await supabase.from("quotes").insert({
        instructor_id: userId,
        quote_ref,
        pupil_name: pupilName.trim(),
        email: email.trim() || null,
        phone: phone.trim() || null,
        postcode: postcode.trim() || null,
        course_type: courseType,
        total_hours: hours ? parseFloat(hours) : null,
        price: price ? parseFloat(price) : null,
        deposit_amount: deposit ? parseFloat(deposit) : null,
        notes: notes.trim() || null,
        valid_until: validUntil,
        status,
      }).select().single();
      if (error) throw error;
      if (status === "sent" && data) {
        const link = `${window.location.origin}/quotes/${data.id}`;
        const body = `Hi ${pupilName}, your quote ${quote_ref} for £${parseFloat(price || "0").toFixed(2)}: ${link}`;
        if (phone) window.location.href = `sms:${phone}?body=${encodeURIComponent(body)}`;
        else if (email) window.location.href = `mailto:${email}?subject=${encodeURIComponent("Your quote")}&body=${encodeURIComponent(body)}`;
      }
      navigate({ to: "/quotes" });
    } catch (e: any) {
      alert("Failed to save: " + (e?.message ?? "unknown"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen pb-32" style={{ ...POPPINS, backgroundColor: "#fff" }}>
      <div style={{ background: "#0F2044", color: "#fff", padding: "14px 16px", display: "flex", alignItems: "center", gap: 12, paddingTop: "calc(14px + env(safe-area-inset-top, 0px))" }}>
        <button onClick={() => navigate({ to: "/quotes" })} aria-label="Back" style={{ background: "none", border: "none", color: "#fff", display: "flex" }}>
          <ArrowLeft size={22} />
        </button>
        <div style={{ fontWeight: 700, fontSize: 16 }}>New quote</div>
      </div>

      <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 14 }}>
        <div>
          <label style={labelStyle}>Pupil name *</label>
          <input style={inputStyle} value={pupilName} onChange={(e) => setPupilName(e.target.value)} />
        </div>
        <div>
          <label style={labelStyle}>Email</label>
          <input style={inputStyle} type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div>
          <label style={labelStyle}>Phone</label>
          <input style={inputStyle} type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
        <div>
          <label style={labelStyle}>Postcode</label>
          <input style={inputStyle} value={postcode} onChange={(e) => setPostcode(e.target.value.toUpperCase())} />
        </div>
        <div>
          <label style={labelStyle}>Course type</label>
          <select style={inputStyle} value={courseType} onChange={(e) => setCourseType(e.target.value)}>
            {COURSE_TYPES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div>
            <label style={labelStyle}>Total hours</label>
            <input style={inputStyle} type="number" step={0.5} value={hours} onChange={(e) => setHours(e.target.value)} />
          </div>
          <div>
            <label style={labelStyle}>Price £</label>
            <input style={inputStyle} type="number" step={0.5} value={price} onChange={(e) => { setPrice(e.target.value); setPriceTouched(true); }} />
          </div>
        </div>
        <div>
          <label style={labelStyle}>Deposit £</label>
          <input style={inputStyle} type="number" step={0.5} value={deposit} onChange={(e) => { setDeposit(e.target.value); setDepositTouched(true); }} />
        </div>
        <div>
          <label style={labelStyle}>Notes</label>
          <textarea style={{ ...inputStyle, minHeight: 80, resize: "vertical" }} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
        <div>
          <label style={labelStyle}>Valid until</label>
          <input style={inputStyle} type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} />
        </div>
      </div>

      <div style={{ position: "fixed", bottom: "calc(64px + env(safe-area-inset-bottom, 0px))", left: 0, right: 0, background: "#fff", borderTop: "0.5px solid #E2E6ED", padding: "16px", display: "flex", gap: 8, zIndex: 50 }}>
        <button disabled={saving} onClick={() => save("draft")} style={{
          flex: 1, padding: "12px", borderRadius: 10, border: "1px solid #0F2044",
          background: "#fff", color: "#0F2044", fontWeight: 600, fontSize: 14,
          fontFamily: "Poppins, sans-serif", cursor: "pointer", opacity: saving ? 0.6 : 1,
        }}>Save as draft</button>
        <button disabled={saving} onClick={() => save("sent")} style={{
          flex: 1, padding: "12px", borderRadius: 10, border: "none",
          background: "#0F2044", color: "#fff", fontWeight: 600, fontSize: 14,
          fontFamily: "Poppins, sans-serif", cursor: "pointer", opacity: saving ? 0.6 : 1,
        }}>Save and send</button>
      </div>
    </div>
  );
}
