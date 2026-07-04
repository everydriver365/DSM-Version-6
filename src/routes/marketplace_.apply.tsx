import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Star, Check, CheckCircle2, Clock, XCircle } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

export const Route = createFileRoute("/marketplace_/apply")({
  head: () => ({
    meta: [
      { title: "Get Featured on EveryDriver" },
      { name: "description", content: "Apply to be a featured driving instructor on EveryDriver." },
    ],
  }),
  component: ApplyPage,
});

const NAVY = "#0F2044";
const BLUE = "#1A52A0";
const BG_HERO = "#F0F4FF";
const BORDER_HERO = "#BFDBFE";
const MUTED = "#64748B";
const BORDER = "#E5E7EB";

type ExistingApp = {
  id: string;
  status: string;
  admin_notes: string | null;
  reviewed_at: string | null;
  submitted_at: string | null;
  featured_until?: string | null;
};

const TRANSMISSIONS = ["Manual", "Automatic", "Both"] as const;
const SPECIALISMS = [
  "Nervous pupils",
  "Intensive courses",
  "Pass Plus",
  "Motorway lessons",
  "Fleet training",
  "Refresher lessons",
  "Teen lessons",
  "Mature learners",
];
const GRADES = ["Grade 4", "Grade 5", "Grade 6", "Not graded"];

function ApplyPage() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [existing, setExisting] = useState<ExistingApp | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [step, setStep] = useState(1);

  // Step 1
  const [businessName, setBusinessName] = useState("");
  const [adiNumber, setAdiNumber] = useState("");
  const [dvsaGrade, setDvsaGrade] = useState("");
  const [yearsExperience, setYearsExperience] = useState("");
  const [passRate, setPassRate] = useState("");
  const [transmission, setTransmission] = useState<string>("Manual");
  const [fleetSize, setFleetSize] = useState("1");

  // Step 2
  const [coverageAreas, setCoverageAreas] = useState("");
  const [specialisms, setSpecialisms] = useState<string[]>([]);
  const [bio, setBio] = useState("");

  // Step 3
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [address, setAddress] = useState("");
  const [postcode, setPostcode] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [instagram, setInstagram] = useState("");
  const [facebook, setFacebook] = useState("");
  const [tiktok, setTiktok] = useState("");

  // Step 4
  const [whyFeatured, setWhyFeatured] = useState("");
  const [adminNotes, setAdminNotes] = useState("");
  const [confirm, setConfirm] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      const uid = u.user?.id ?? null;
      if (!alive) return;
      setUserId(uid);
      if (!uid) {
        setLoading(false);
        return;
      }
      const [{ data: inst }, { data: apps }] = await Promise.all([
        supabase.from("instructors").select("*").eq("id", uid).maybeSingle(),
        supabase
          .from("featured_applications")
          .select("*")
          .eq("instructor_id", uid)
          .order("created_at", { ascending: false })
          .limit(1),
      ]);
      if (!alive) return;
      const rec = inst as Record<string, unknown> | null;
      if (rec) {
        setContactName(String(rec.name ?? rec.full_name ?? ""));
        setContactEmail(String(rec.email ?? u.user?.email ?? ""));
        setContactPhone(String(rec.phone ?? rec.mobile ?? ""));
        setBusinessName(String(rec.business_name ?? rec.trading_name ?? ""));
      } else if (u.user?.email) {
        setContactEmail(u.user.email);
      }
      const app = (apps as ExistingApp[] | null)?.[0] ?? null;
      if (app && (app.status === "pending" || app.status === "approved" || app.status === "rejected")) {
        setExisting(app);
      }
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, []);

  const canNext = useMemo(() => {
    if (step === 1) return businessName.trim() && adiNumber.trim();
    if (step === 2) return coverageAreas.trim().length > 0;
    if (step === 3) return contactName.trim() && contactEmail.trim();
    return true;
  }, [step, businessName, adiNumber, coverageAreas, contactName, contactEmail]);

  async function handleSubmit() {
    if (!userId) {
      toast.error("You need to be signed in");
      return;
    }
    if (!confirm) {
      toast.error("Please confirm details are accurate");
      return;
    }
    setSubmitting(true);
    const payload = {
      instructor_id: userId,
      business_name: businessName || null,
      trading_name: businessName || null,
      website_url: websiteUrl || null,
      contact_name: contactName,
      contact_email: contactEmail,
      contact_phone: contactPhone || null,
      address: address || null,
      postcode: postcode || null,
      coverage_areas: coverageAreas || null,
      years_experience: yearsExperience ? Number(yearsExperience) : null,
      adi_number: adiNumber || null,
      dvsa_grade: dvsaGrade || null,
      pass_rate: passRate ? Number(passRate) : null,
      fleet_size: fleetSize ? Number(fleetSize) : 1,
      transmission,
      specialisms: specialisms.join(", ") || null,
      bio: bio || null,
      why_featured: whyFeatured || null,
      social_instagram: instagram || null,
      social_facebook: facebook || null,
      social_tiktok: tiktok || null,
      admin_notes: adminNotes || null,
      status: "pending",
      submitted_at: new Date().toISOString(),
    };
    const { error } = await supabase.from("featured_applications").insert(payload);
    if (error) {
      console.error("[apply] insert error", error);
      toast.error(error.message || "Couldn't submit application");
      setSubmitting(false);
      return;
    }
    await supabase.from("instructor_notifications").insert({
      instructor_id: userId,
      title: "Application submitted ✓",
      body: "We'll review it within 2 business days.",
      type: "featured_application",
    });
    setSubmitting(false);
    setSubmitted(true);
  }

  function toggleSpec(s: string) {
    setSpecialisms((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));
  }

  return (
    <div style={{ minHeight: "100vh", background: "#FFFFFF", fontFamily: "Inter, sans-serif", paddingBottom: 120 }}>
      {/* Top bar */}
      <div style={{ background: NAVY, color: "#FFF", padding: "14px 16px", display: "flex", alignItems: "center", gap: 12 }}>
        <button
          type="button"
          onClick={() => navigate({ to: "/marketplace" })}
          aria-label="Back"
          style={{ background: "none", border: "none", color: "#FFF", cursor: "pointer", padding: 4, display: "flex" }}
        >
          <ArrowLeft size={22} />
        </button>
        <h1 style={{ fontSize: 17, fontWeight: 700, margin: 0 }}>Get Featured on EveryDriver</h1>
      </div>

      {loading ? (
        <div style={{ padding: 32, textAlign: "center", color: MUTED }}>Loading…</div>
      ) : submitted ? (
        <SuccessScreen onBack={() => navigate({ to: "/marketplace" })} />
      ) : existing ? (
        <ExistingStatus app={existing} onReapply={() => setExisting(null)} onBack={() => navigate({ to: "/marketplace" })} />
      ) : (
        <>
          {/* Hero */}
          <div style={{ background: BG_HERO, borderBottom: `0.5px solid ${BORDER_HERO}`, padding: "20px 16px" }}>
            <Star size={32} color={BLUE} strokeWidth={2} />
            <div style={{ fontSize: 18, fontWeight: 700, color: NAVY, marginTop: 8 }}>
              Grow your driving school with EveryDriver
            </div>
            <div style={{ fontSize: 13, color: MUTED, marginTop: 6, lineHeight: 1.5 }}>
              Featured instructors get priority placement on EveryDriver search results, more enquiries and a professional profile page.
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 12, fontSize: 12, color: BLUE, fontWeight: 600 }}>
              <span>✓ Priority placement</span>
              <span>✓ Featured badge</span>
              <span>✓ More enquiries</span>
            </div>
          </div>

          {/* Progress */}
          <div style={{ padding: "16px 16px 0" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: MUTED, marginBottom: 6, fontWeight: 600 }}>
              <span>Step {step} of 4</span>
              <span>{Math.round((step / 4) * 100)}%</span>
            </div>
            <div style={{ height: 6, background: "#F1F5F9", borderRadius: 999, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${(step / 4) * 100}%`, background: BLUE, transition: "width .2s" }} />
            </div>
          </div>

          <div style={{ padding: "16px" }}>
            {step === 1 && (
              <Section title="Tell us about your business">
                <Field label="Business / trading name *">
                  <Input value={businessName} onChange={setBusinessName} placeholder="e.g. Smith School of Motoring" />
                </Field>
                <Field label="ADI number *">
                  <Input value={adiNumber} onChange={setAdiNumber} placeholder="e.g. 123456" />
                </Field>
                <Field label="DVSA grade">
                  <Select value={dvsaGrade} onChange={setDvsaGrade} options={GRADES} placeholder="Select grade" />
                </Field>
                <Field label="Years as ADI">
                  <Input value={yearsExperience} onChange={setYearsExperience} type="number" placeholder="e.g. 5" />
                </Field>
                <Field label="Approximate pass rate (%)">
                  <Input value={passRate} onChange={setPassRate} type="number" placeholder="0-100" />
                </Field>
                <Field label="Transmission offered">
                  <Pills options={[...TRANSMISSIONS]} selected={[transmission]} onToggle={(v) => setTransmission(v)} />
                </Field>
                <Field label="Fleet size">
                  <Input value={fleetSize} onChange={setFleetSize} type="number" placeholder="1" />
                </Field>
              </Section>
            )}

            {step === 2 && (
              <Section title="Where do you teach?">
                <Field label="Coverage areas *">
                  <Textarea
                    value={coverageAreas}
                    onChange={setCoverageAreas}
                    placeholder="List the towns, cities or postcodes you cover e.g. Winchester, Eastleigh, SO22, SO30"
                    rows={3}
                  />
                </Field>
                <Field label="Specialisms">
                  <Pills
                    options={SPECIALISMS}
                    selected={specialisms}
                    onToggle={toggleSpec}
                    multi
                  />
                </Field>
                <Field label={`Short bio (${bio.length}/300)`}>
                  <Textarea
                    value={bio}
                    onChange={(v) => setBio(v.slice(0, 300))}
                    placeholder="Tell learners a bit about you and your teaching style…"
                    rows={4}
                  />
                </Field>
              </Section>
            )}

            {step === 3 && (
              <Section title="Contact & online presence">
                <Field label="Contact name *"><Input value={contactName} onChange={setContactName} /></Field>
                <Field label="Contact email *"><Input value={contactEmail} onChange={setContactEmail} type="email" /></Field>
                <Field label="Contact phone"><Input value={contactPhone} onChange={setContactPhone} type="tel" /></Field>
                <Field label="Business address"><Input value={address} onChange={setAddress} placeholder="Street, town" /></Field>
                <Field label="Postcode"><Input value={postcode} onChange={setPostcode} placeholder="SO22 1AA" /></Field>
                <Field label="Website URL"><Input value={websiteUrl} onChange={setWebsiteUrl} placeholder="https://…" /></Field>
                <Field label="Instagram handle"><Input value={instagram} onChange={setInstagram} placeholder="@yourhandle" /></Field>
                <Field label="Facebook page URL"><Input value={facebook} onChange={setFacebook} placeholder="https://facebook.com/…" /></Field>
                <Field label="TikTok handle"><Input value={tiktok} onChange={setTiktok} placeholder="@yourhandle" /></Field>
              </Section>
            )}

            {step === 4 && (
              <Section title="Final details">
                <Field label={`Why do you want to be featured? (${whyFeatured.length}/500)`}>
                  <Textarea
                    value={whyFeatured}
                    onChange={(v) => setWhyFeatured(v.slice(0, 500))}
                    rows={4}
                    placeholder="Tell us what makes you a great fit…"
                  />
                </Field>
                <Field label="Anything else we should know?">
                  <Textarea value={adminNotes} onChange={setAdminNotes} rows={3} placeholder="Optional" />
                </Field>

                <div
                  style={{
                    background: "#F8FAFC",
                    border: `1px solid ${BORDER}`,
                    borderRadius: 12,
                    padding: 14,
                    marginTop: 8,
                    fontSize: 13,
                    color: NAVY,
                  }}
                >
                  <div style={{ fontWeight: 700, marginBottom: 8 }}>Summary</div>
                  <SummaryRow k="Business" v={businessName || "—"} />
                  <SummaryRow k="ADI number" v={adiNumber || "—"} />
                  <SummaryRow k="DVSA grade" v={dvsaGrade || "—"} />
                  <SummaryRow k="Transmission" v={transmission} />
                  <SummaryRow k="Coverage" v={coverageAreas || "—"} />
                  <SummaryRow k="Specialisms" v={specialisms.join(", ") || "—"} />
                  <SummaryRow k="Contact" v={`${contactName} · ${contactEmail}`} />
                </div>

                <label style={{ display: "flex", gap: 10, alignItems: "flex-start", marginTop: 14, fontSize: 13, color: NAVY }}>
                  <input type="checkbox" checked={confirm} onChange={(e) => setConfirm(e.target.checked)} style={{ marginTop: 3 }} />
                  <span>I confirm all details are accurate and I am a DVSA-registered ADI</span>
                </label>
              </Section>
            )}

            {/* Nav buttons */}
            <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
              {step > 1 && (
                <button
                  type="button"
                  onClick={() => setStep((s) => s - 1)}
                  style={{
                    flex: 1,
                    padding: "12px",
                    borderRadius: 10,
                    border: `1px solid ${BORDER}`,
                    background: "#FFF",
                    color: NAVY,
                    fontWeight: 600,
                    fontSize: 14,
                    cursor: "pointer",
                  }}
                >
                  Back
                </button>
              )}
              {step < 4 ? (
                <button
                  type="button"
                  disabled={!canNext}
                  onClick={() => setStep((s) => s + 1)}
                  style={{
                    flex: 2,
                    padding: "12px",
                    borderRadius: 10,
                    border: "none",
                    background: canNext ? BLUE : "#94A3B8",
                    color: "#FFF",
                    fontWeight: 700,
                    fontSize: 14,
                    cursor: canNext ? "pointer" : "not-allowed",
                  }}
                >
                  Continue →
                </button>
              ) : (
                <button
                  type="button"
                  disabled={!confirm || submitting}
                  onClick={handleSubmit}
                  style={{
                    flex: 2,
                    padding: "12px",
                    borderRadius: 10,
                    border: "none",
                    background: confirm && !submitting ? BLUE : "#94A3B8",
                    color: "#FFF",
                    fontWeight: 700,
                    fontSize: 14,
                    cursor: confirm && !submitting ? "pointer" : "not-allowed",
                  }}
                >
                  {submitting ? "Submitting…" : "Submit application →"}
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginTop: 16 }}>
      <div style={{ fontSize: 16, fontWeight: 700, color: NAVY, marginBottom: 12 }}>{title}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>{children}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "block" }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: NAVY, marginBottom: 6 }}>{label}</div>
      {children}
    </label>
  );
}

function Input({
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      style={{
        width: "100%",
        padding: "11px 12px",
        borderRadius: 10,
        border: `1px solid ${BORDER}`,
        fontSize: 14,
        color: NAVY,
        background: "#FFF",
        outline: "none",
        fontFamily: "inherit",
      }}
    />
  );
}

function Textarea({
  value,
  onChange,
  placeholder,
  rows = 3,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      style={{
        width: "100%",
        padding: "11px 12px",
        borderRadius: 10,
        border: `1px solid ${BORDER}`,
        fontSize: 14,
        color: NAVY,
        background: "#FFF",
        outline: "none",
        resize: "vertical",
        fontFamily: "inherit",
      }}
    />
  );
}

function Select({
  value,
  onChange,
  options,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder?: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{
        width: "100%",
        padding: "11px 12px",
        borderRadius: 10,
        border: `1px solid ${BORDER}`,
        fontSize: 14,
        color: NAVY,
        background: "#FFF",
        outline: "none",
        fontFamily: "inherit",
      }}
    >
      <option value="">{placeholder ?? "Select…"}</option>
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  );
}

function Pills({
  options,
  selected,
  onToggle,
  multi = false,
}: {
  options: string[];
  selected: string[];
  onToggle: (v: string) => void;
  multi?: boolean;
}) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
      {options.map((o) => {
        const active = selected.includes(o);
        return (
          <button
            key={o}
            type="button"
            onClick={() => onToggle(o)}
            style={{
              padding: "8px 14px",
              borderRadius: 999,
              fontSize: 13,
              fontWeight: 600,
              border: active ? `1px solid ${BLUE}` : `1px solid ${BORDER}`,
              background: active ? BLUE : "#FFF",
              color: active ? "#FFF" : NAVY,
              cursor: "pointer",
            }}
            aria-pressed={active}
            aria-label={multi ? `Toggle ${o}` : `Select ${o}`}
          >
            {o}
          </button>
        );
      })}
    </div>
  );
}

function SummaryRow({ k, v }: { k: string; v: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 10, padding: "4px 0", fontSize: 12 }}>
      <span style={{ color: MUTED }}>{k}</span>
      <span style={{ color: NAVY, fontWeight: 600, textAlign: "right", maxWidth: "60%" }}>{v}</span>
    </div>
  );
}

function SuccessScreen({ onBack }: { onBack: () => void }) {
  return (
    <div style={{ padding: "48px 24px", textAlign: "center" }}>
      <div
        style={{
          width: 88,
          height: 88,
          borderRadius: "50%",
          background: "#DCFCE7",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          margin: "0 auto 20px",
          animation: "pop .4s ease",
        }}
      >
        <Check size={44} color="#16A34A" strokeWidth={3} />
      </div>
      <div style={{ fontSize: 22, fontWeight: 700, color: NAVY }}>Application submitted!</div>
      <div style={{ fontSize: 14, color: MUTED, marginTop: 10, lineHeight: 1.5 }}>
        We'll review your application within 2 business days and notify you of the outcome.
      </div>
      <button
        type="button"
        onClick={onBack}
        style={{
          marginTop: 28,
          padding: "12px 20px",
          borderRadius: 10,
          border: "none",
          background: BLUE,
          color: "#FFF",
          fontWeight: 700,
          fontSize: 14,
          cursor: "pointer",
        }}
      >
        Back to marketplace
      </button>
      <style>{`@keyframes pop { 0% { transform: scale(0); } 70% { transform: scale(1.1); } 100% { transform: scale(1); } }`}</style>
    </div>
  );
}

function ExistingStatus({
  app,
  onReapply,
  onBack,
}: {
  app: ExistingApp;
  onReapply: () => void;
  onBack: () => void;
}) {
  if (app.status === "pending") {
    return (
      <Banner
        icon={<Clock size={40} color="#B45309" />}
        bg="#FEF3C7"
        border="#FCD34D"
        title="Application under review"
        body="We've received your application and will get back to you within 2 business days."
        actionLabel="Back to marketplace"
        onAction={onBack}
      />
    );
  }
  if (app.status === "approved") {
    return (
      <Banner
        icon={<CheckCircle2 size={40} color="#16A34A" />}
        bg="#DCFCE7"
        border="#86EFAC"
        title="You're featured! ✓"
        body={app.featured_until ? `Featured until ${new Date(app.featured_until).toLocaleDateString()}` : "Your featured listing is live on EveryDriver."}
        actionLabel="Back to marketplace"
        onAction={onBack}
      />
    );
  }
  return (
    <Banner
      icon={<XCircle size={40} color="#CC2229" />}
      bg="#FEE2E2"
      border="#FCA5A5"
      title="Application not approved"
      body={app.admin_notes || "Your application wasn't approved this time. You can apply again with updated details."}
      actionLabel="Apply again"
      onAction={onReapply}
    />
  );
}

function Banner({
  icon,
  bg,
  border,
  title,
  body,
  actionLabel,
  onAction,
}: {
  icon: React.ReactNode;
  bg: string;
  border: string;
  title: string;
  body: string;
  actionLabel: string;
  onAction: () => void;
}) {
  return (
    <div style={{ padding: 16 }}>
      <div
        style={{
          background: bg,
          border: `1px solid ${border}`,
          borderRadius: 14,
          padding: 20,
          textAlign: "center",
        }}
      >
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 10 }}>{icon}</div>
        <div style={{ fontSize: 18, fontWeight: 700, color: NAVY }}>{title}</div>
        <div style={{ fontSize: 13, color: "#334155", marginTop: 8, lineHeight: 1.5 }}>{body}</div>
        <button
          type="button"
          onClick={onAction}
          style={{
            marginTop: 16,
            padding: "10px 18px",
            borderRadius: 10,
            border: "none",
            background: BLUE,
            color: "#FFF",
            fontWeight: 700,
            fontSize: 13,
            cursor: "pointer",
          }}
        >
          {actionLabel}
        </button>
      </div>
    </div>
  );
}