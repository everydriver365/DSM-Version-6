import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { ChevronLeft, Loader2 } from "lucide-react";
import { Input } from "../components/dsm/Input";
import { Card } from "../components/dsm/Card";
import { SectionHeader } from "../components/dsm/SectionHeader";
import { supabase } from "../lib/supabaseClient";

export const Route = createFileRoute("/quotes/new")({
  head: () => ({
    meta: [
      { title: "New quote — DSM by EveryDriver" },
      { name: "description", content: "Send a course quote to a prospective pupil." },
    ],
  }),
  component: NewQuotePage,
});

const POPPINS = { fontFamily: "Poppins, sans-serif" } as const;

type CourseType = "intensive" | "semi-intensive" | "weekly" | "custom";

const COURSE_TYPES: { v: CourseType; label: string }[] = [
  { v: "intensive", label: "Intensive" },
  { v: "semi-intensive", label: "Semi-intensive" },
  { v: "weekly", label: "Weekly" },
  { v: "custom", label: "Custom" },
];

function ymd(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: 12, fontWeight: 500, color: "#6B7280", marginBottom: 4,
        fontFamily: "Poppins, sans-serif",
      }}
    >
      {children}
    </div>
  );
}

function NewQuotePage() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [recipientName, setRecipientName] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [recipientPhone, setRecipientPhone] = useState("");
  const [courseType, setCourseType] = useState<CourseType>("intensive");
  const [hours, setHours] = useState<string>("10");
  const [price, setPrice] = useState<string>("");
  const [deposit, setDeposit] = useState<string>("");
  const [includesTest, setIncludesTest] = useState(false);
  const [personalMessage, setPersonalMessage] = useState("");
  const [validUntil, setValidUntil] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    return ymd(d);
  });

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      setUserId(data.user?.id ?? null);
    })();
  }, []);

  const previewTitle = useMemo(() => {
    const label = COURSE_TYPES.find((c) => c.v === courseType)?.label ?? "Course";
    const h = hours ? `${hours}h ` : "";
    return `${h}${label}${includesTest ? " + Test" : ""}`;
  }, [courseType, hours, includesTest]);

  async function submit() {
    setSaving(true);
    setError(null);

    let uid = userId;
    if (!uid) {
      const { data: authData } = await supabase.auth.getUser();
      uid = authData.user?.id ?? null;
      if (uid) setUserId(uid);
    }
    if (!uid) {
      setSaving(false);
      setError("You must be signed in to send a quote");
      toast.error("You must be signed in to send a quote");
      return;
    }

    const missing: string[] = [];
    if (!recipientName.trim()) missing.push("recipient name");
    if (!price || parseFloat(price) <= 0) missing.push("price");
    if (missing.length > 0) {
      setSaving(false);
      const msg = `Missing required fields: ${missing.join(", ")}`;
      setError(msg);
      toast.error(msg);
      return;
    }

    const payload = {
      instructor_id: uid,
      recipient_name: recipientName.trim(),
      recipient_email: recipientEmail.trim() || null,
      recipient_phone: recipientPhone.trim() || null,
      course_type: courseType,
      hours: hours ? parseFloat(hours) : null,
      price: parseFloat(price),
      deposit_amount: deposit ? parseFloat(deposit) : 0,
      includes_test: includesTest,
      personal_message: personalMessage.trim() || null,
      valid_until: validUntil || null,
      status: "pending",
    };

    const { error: insertError } = await supabase
      .from("quotes")
      .insert(payload)
      .select()
      .single();

    setSaving(false);

    if (insertError) {
      setError(insertError.message || "Failed to send quote");
      toast.error(insertError.message || "Failed to send quote");
      return;
    }

    toast.success(`Quote sent to ${recipientName.trim()}`);
    navigate({ to: "/quotes" });
  }

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#F2F4F8", ...POPPINS, paddingBottom: 24 }}>
      <div
        style={{
          position: "sticky", top: 0, zIndex: 10, backgroundColor: "#0F2044",
          padding: "14px 16px", display: "flex", alignItems: "center", justifyContent: "space-between",
        }}
      >
        <button onClick={() => navigate({ to: "/quotes" })}
          style={{ background: "none", border: "none", cursor: "pointer", color: "#fff", display: "flex" }}
          aria-label="Back">
          <ChevronLeft size={24} />
        </button>
        <h1 style={{ color: "#fff", fontSize: 16, fontWeight: 700, margin: 0 }}>New quote</h1>
        <button onClick={submit} disabled={saving}
          style={{
            background: "none", border: "none",
            cursor: saving ? "not-allowed" : "pointer",
            color: "#fff", fontWeight: 700, fontSize: 14,
            opacity: saving ? 0.5 : 1,
          }}>
          {saving ? "Sending…" : "Send"}
        </button>
      </div>

      <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: 14 }}>
        <SectionHeader>RECIPIENT</SectionHeader>
        <Input label="Name" value={recipientName} onChange={(e) => setRecipientName(e.target.value)} placeholder="Pupil name" />
        <Input label="Email" type="email" value={recipientEmail} onChange={(e) => setRecipientEmail(e.target.value)} placeholder="name@example.com" />
        <Input label="Phone" type="tel" value={recipientPhone} onChange={(e) => setRecipientPhone(e.target.value)} placeholder="07…" />

        <SectionHeader>COURSE</SectionHeader>
        <div>
          <FieldLabel>Course type</FieldLabel>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {COURSE_TYPES.map((t) => {
              const active = courseType === t.v;
              return (
                <button key={t.v} onClick={() => setCourseType(t.v)}
                  style={{
                    padding: "10px 12px", borderRadius: 10,
                    border: `1px solid ${active ? "#1A52A0" : "#e3e6ec"}`,
                    background: active ? "#1A52A0" : "#fff",
                    color: active ? "#fff" : "#1A1A2E",
                    fontWeight: 600, fontSize: 13, cursor: "pointer",
                    fontFamily: "Poppins, sans-serif",
                  }}>
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>

        <Input label="Hours" type="number" inputMode="numeric" value={hours} onChange={(e) => setHours(e.target.value)} placeholder="10" />

        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#1A1A2E" }}>
          <input type="checkbox" checked={includesTest} onChange={(e) => setIncludesTest(e.target.checked)} />
          Includes practical test
        </label>

        <SectionHeader>PRICING</SectionHeader>
        <Input label="Price (£)" type="number" inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0.00" />
        <Input label="Deposit (£)" type="number" inputMode="decimal" value={deposit} onChange={(e) => setDeposit(e.target.value)} placeholder="0.00" />
        <Input label="Valid until" type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} />

        <SectionHeader>PERSONAL MESSAGE</SectionHeader>
        <textarea
          value={personalMessage}
          onChange={(e) => setPersonalMessage(e.target.value)}
          placeholder="Hi! Here's the quote we discussed…"
          rows={4}
          style={{
            width: "100%", borderRadius: 10, padding: 10,
            borderWidth: "0.5px", borderStyle: "solid", borderColor: "#E2E6ED",
            fontFamily: "Poppins, sans-serif", fontSize: 14, color: "#1A1A2E",
            background: "#fff", resize: "vertical",
          }}
        />

        <SectionHeader>PREVIEW</SectionHeader>
        <Card style={{ padding: 14 }}>
          <div style={{ fontSize: 12, color: "#6B7280" }}>Quote for</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#0F2044", marginTop: 2 }}>
            {recipientName.trim() || "Recipient"}
          </div>
          <div style={{ marginTop: 10, display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#1A1A2E" }}>{previewTitle}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: "#0F2044" }}>
              £{price ? Number(price).toFixed(0) : "0"}
            </div>
          </div>
          {deposit && Number(deposit) > 0 && (
            <div style={{ fontSize: 12, color: "#6B7280", marginTop: 4 }}>
              Deposit: £{Number(deposit).toFixed(0)}
            </div>
          )}
          {includesTest && (
            <div style={{ fontSize: 12, color: "#16A34A", marginTop: 4, fontWeight: 600 }}>
              ✓ Includes practical test
            </div>
          )}
          {personalMessage.trim() && (
            <div style={{
              marginTop: 10, padding: 10, background: "#F2F4F8", borderRadius: 8,
              fontSize: 13, color: "#1A1A2E", whiteSpace: "pre-wrap",
            }}>
              {personalMessage.trim()}
            </div>
          )}
          {validUntil && (
            <div style={{ fontSize: 11, color: "#6B7280", marginTop: 10 }}>
              Valid until {new Date(validUntil + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
            </div>
          )}
        </Card>

        <button onClick={submit} disabled={saving}
          style={{
            height: 48, marginTop: 8, background: "#16A34A", color: "#fff",
            border: "none", borderRadius: 10, fontWeight: 700, fontSize: 15,
            cursor: saving ? "not-allowed" : "pointer",
            fontFamily: "Poppins, sans-serif",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            opacity: saving ? 0.7 : 1,
          }}>
          {saving && <Loader2 size={16} className="animate-spin" />}
          {saving ? "Sending…" : "Send quote"}
        </button>

        {error && (
          <div style={{ color: "#CC2229", fontSize: 13, fontWeight: 500, textAlign: "center" }}>
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
