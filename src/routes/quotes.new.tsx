import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";

export const Route = createFileRoute("/quotes/new")({
  validateSearch: (search: Record<string, unknown>) => ({
    name: typeof search.name === "string" ? search.name : undefined,
    email: typeof search.email === "string" ? search.email : undefined,
    phone: typeof search.phone === "string" ? search.phone : undefined,
    course: typeof search.course === "string" ? search.course : undefined,
    hours: typeof search.hours === "string" ? search.hours : undefined,
    price: typeof search.price === "string" ? search.price : undefined,
    message: typeof search.message === "string" ? search.message : undefined,
  }),
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

  const search = Route.useSearch();
  const [pupilName, setPupilName] = useState(search.name ?? "");
  const [email, setEmail] = useState(search.email ?? "");
  const [phone, setPhone] = useState(search.phone ?? "");
  const [postcode, setPostcode] = useState("");
  const [courseType, setCourseType] = useState(
    search.course && COURSE_TYPES.includes(search.course) ? search.course : COURSE_TYPES[0]
  );
  const [hours, setHours] = useState<string>(search.hours ?? "");
  const [price, setPrice] = useState<string>(search.price ?? "");
  const [deposit, setDeposit] = useState<string>("");
  const [notes, setNotes] = useState(search.message ?? "");

  const defaultValid = (() => { const d = new Date(); d.setDate(d.getDate() + 14); return d.toISOString().slice(0, 10); })();
  const [validUntil, setValidUntil] = useState(defaultValid);
  const [priceTouched, setPriceTouched] = useState(!!search.price);
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


  async function save(status: "draft" | "sent") {
    const newErrors: { pupilName?: string; price?: string; postcode?: string } = {};
    if (!pupilName.trim()) newErrors.pupilName = "Pupil name is required";
    const priceNum = parseFloat(price);
    if (!price.trim() || isNaN(priceNum)) newErrors.price = "Price is required";
    else if (priceNum <= 0) newErrors.price = "Price must be greater than 0";
    if (postcode && !POSTCODE_RE.test(postcode.trim())) newErrors.postcode = "Invalid UK postcode";
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;
    if (!userId) { alert("Not signed in"); return; }
    setSaving(true);
    try {
      
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const SUPABASE_URL = "https://bjpqxfrihwjcqprmoqfs.supabase.co";
      const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJqcHF4ZnJpaHdqY3Fwcm1vcWZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE0NzQ4MjEsImV4cCI6MjA5NzA1MDgyMX0.HKlgx3dxP3uxX9wMRRUnfb0IPwaBpFcut_iUgT5XFeo";
      const res = await fetch(`${SUPABASE_URL}/rest/v1/quotes`, {
        method: "POST",
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Prefer: "return=representation",
        },
        body: JSON.stringify({
          instructor_id: userId,
          recipient_name: pupilName.trim(),
          recipient_email: email.trim() || null,
          recipient_phone: phone.trim() || null,
          course_type: courseType || null,
          hours: hours ? parseFloat(hours) : null,
          price: parseFloat(price),
          deposit_amount: deposit ? parseFloat(deposit) : null,
          valid_until: validUntil || null,
          personal_message: notes.trim() || null,
          status,
        }),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.message || JSON.stringify(payload));
      const data = Array.isArray(payload) ? payload[0] : payload;
      if (status === "sent" && data) {
        if (email.trim()) {
          await fetch(`${SUPABASE_URL}/functions/v1/send-quote`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
              apikey: SUPABASE_ANON_KEY,
            },
            body: JSON.stringify({ quoteId: data.id }),
          });
        } else if (phone.trim()) {
          const link = `https://everydriver.co.uk/quote/${data.token}`;
          const smsBody = `Hi ${pupilName}, your quote for £${parseFloat(price || "0").toFixed(2)}: ${link}`;
          window.location.href = `sms:${phone}?body=${encodeURIComponent(smsBody)}`;
        }
        toast.success(`Quote sent to ${pupilName}`);
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
          <input
            style={errors.pupilName ? errorInputStyle : inputStyle}
            value={pupilName}
            onChange={(e) => { setPupilName(e.target.value); if (errors.pupilName) setErrors((p) => ({ ...p, pupilName: undefined })); }}
            aria-invalid={!!errors.pupilName}
          />
          {errors.pupilName && <div style={errorTextStyle}>{errors.pupilName}</div>}
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
          <input
            style={errors.postcode ? errorInputStyle : inputStyle}
            value={postcode}
            onChange={(e) => { setPostcode(e.target.value.toUpperCase()); if (errors.postcode) setErrors((p) => ({ ...p, postcode: undefined })); }}
            aria-invalid={!!errors.postcode}
          />
          {errors.postcode && <div style={errorTextStyle}>{errors.postcode}</div>}
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
            <label style={labelStyle}>Price £ *</label>
            <input
              style={errors.price ? errorInputStyle : inputStyle}
              type="number"
              step={0.5}
              value={price}
              onChange={(e) => { setPrice(e.target.value); setPriceTouched(true); if (errors.price) setErrors((p) => ({ ...p, price: undefined })); }}
              aria-invalid={!!errors.price}
            />
            {errors.price && <div style={errorTextStyle}>{errors.price}</div>}
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
