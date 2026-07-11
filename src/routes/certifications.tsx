import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, AlertCircle, Award, Calendar, CheckCircle, Clock, MoreHorizontal, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabaseClient";

export const Route = createFileRoute("/certifications")({
  head: () => ({
    meta: [
      { title: "Certifications & Licences" },
      { name: "description", content: "Track ADI licence, DBS, first aid and other renewals." },
    ],
  }),
  component: CertificationsPage,
});

type CertStatus = "expired" | "expiring_soon" | "valid" | "no_expiry";

type Cert = {
  id: string;
  instructor_id: string;
  cert_type: string | null;
  title: string;
  issued_date: string | null;
  expiry_date: string | null;
  reminder_days_before: number;
  notes: string | null;
  is_active: boolean;
  created_at?: string;
};

const CERT_PRESETS = [
  { type: "ADI Licence", title: "ADI Licence (Part 3)", reminder_days: 90 },
  { type: "DBS Check", title: "DBS Enhanced Check", reminder_days: 30 },
  { type: "First Aid", title: "First Aid Certificate", reminder_days: 60 },
  { type: "ADI Part 1", title: "ADI Theory Test (Part 1)", reminder_days: 30 },
  { type: "ADI Part 2", title: "ADI Driving Ability (Part 2)", reminder_days: 30 },
  { type: "CPD", title: "CPD Hours", reminder_days: 30 },
  { type: "Insurance", title: "Business Insurance", reminder_days: 30 },
  { type: "MOT", title: "Vehicle MOT", reminder_days: 30 },
  { type: "Road Tax", title: "Vehicle Road Tax", reminder_days: 14 },
  { type: "Other", title: "Other", reminder_days: 30 },
];

function getCertStatus(expiryDate: string | null, reminderDays: number): {
  status: CertStatus;
  daysUntilExpiry: number | null;
  colour: string;
  bg: string;
  label: string;
} {
  if (!expiryDate) {
    return { status: "no_expiry", daysUntilExpiry: null, colour: "#16A34A", bg: "#E0FFF4", label: "No expiry" };
  }
  const days = Math.floor((new Date(expiryDate).getTime() - Date.now()) / 86400000);
  if (days < 0) {
    return { status: "expired", daysUntilExpiry: days, colour: "#CC2229", bg: "#FEF2F2", label: "Expired" };
  }
  if (days <= reminderDays) {
    return { status: "expiring_soon", daysUntilExpiry: days, colour: "#D97706", bg: "#FFFBEB", label: `Expires in ${days} days` };
  }
  return { status: "valid", daysUntilExpiry: days, colour: "#16A34A", bg: "#E0FFF4", label: "Valid" };
}

function fmtDate(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso + (iso.length === 10 ? "T00:00:00" : ""));
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function CertificationsPage() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [certs, setCerts] = useState<Cert[]>([]);
  const [loading, setLoading] = useState(true);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<Cert | null>(null);
  const [menuFor, setMenuFor] = useState<string | null>(null);

  // Form state
  const [fTitle, setFTitle] = useState("");
  const [fType, setFType] = useState("Other");
  const [fIssued, setFIssued] = useState("");
  const [fExpiry, setFExpiry] = useState("");
  const [fNoExpiry, setFNoExpiry] = useState(false);
  const [fReminder, setFReminder] = useState(30);
  const [fNotes, setFNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const successTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate({ to: "/auth" as never });
        return;
      }
      setUserId(user.id);
    })();
  }, [navigate]);

  const load = async (uid: string) => {
    setLoading(true);
    const { data } = await supabase
      .from("instructor_certifications")
      .select("*")
      .eq("instructor_id", uid)
      .eq("is_active", true)
      .order("expiry_date", { ascending: true, nullsFirst: false });
    setCerts((data ?? []) as Cert[]);
    setLoading(false);
  };

  useEffect(() => {
    if (userId) load(userId);
  }, [userId]);

  const grouped = useMemo(() => {
    const g: Record<CertStatus, Array<{ cert: Cert; s: ReturnType<typeof getCertStatus> }>> = {
      expired: [], expiring_soon: [], valid: [], no_expiry: [],
    };
    for (const c of certs) {
      const s = getCertStatus(c.expiry_date, c.reminder_days_before ?? 30);
      g[s.status].push({ cert: c, s });
    }
    return g;
  }, [certs]);

  const expiredCount = grouped.expired.length;
  const expiringCount = grouped.expiring_soon.length;
  const validCount = grouped.valid.length + grouped.no_expiry.length;

  const openAdd = (preset?: typeof CERT_PRESETS[number]) => {
    setEditing(null);
    setFTitle(preset?.title ?? "");
    setFType(preset?.type ?? "Other");
    setFIssued("");
    setFExpiry("");
    setFNoExpiry(false);
    setFReminder(preset?.reminder_days ?? 30);
    setFNotes("");
    setSaveSuccess(false);
    setSheetOpen(true);
    setMenuFor(null);
  };

  const openEdit = (c: Cert) => {
    setEditing(c);
    setFTitle(c.title);
    setFType(c.cert_type || "Other");
    setFIssued(c.issued_date || "");
    setFExpiry(c.expiry_date || "");
    setFNoExpiry(!c.expiry_date);
    setFReminder(c.reminder_days_before ?? 30);
    setFNotes(c.notes || "");
    setSaveSuccess(false);
    setSheetOpen(true);
    setMenuFor(null);
  };

  const openRenew = (c: Cert) => {
    setEditing(null);
    setFTitle(c.title);
    setFType(c.cert_type || "Other");
    setFIssued(new Date().toISOString().slice(0, 10));
    setFExpiry("");
    setFNoExpiry(false);
    setFReminder(c.reminder_days_before ?? 30);
    setFNotes(c.notes || "");
    // Store old cert id so save can archive it after insert
    (window as any).__renewingCertId = c.id;
    setSaveSuccess(false);
    setSheetOpen(true);
    setMenuFor(null);
  };

  const archive = async (c: Cert) => {
    if (!userId) return;
    const { error } = await supabase
      .from("instructor_certifications")
      .update({ is_active: false })
      .eq("id", c.id);
    if (error) {
      toast.error("Could not archive");
      return;
    }
    toast.success("Archived");
    setMenuFor(null);
    load(userId);
  };

  const refreshList = () => {
    if (userId) load(userId);
  };

  const closeSheet = () => {
    if (successTimerRef.current) {
      clearTimeout(successTimerRef.current);
      successTimerRef.current = null;
    }
    setSaveSuccess(false);
    setSheetOpen(false);
    setEditing(null);
    setFTitle("");
    setFType("Other");
    setFIssued("");
    setFExpiry("");
    setFNoExpiry(false);
    setFReminder(30);
    setFNotes("");
    setSaving(false);
  };

  const finishAndRefresh = () => {
    closeSheet();
    refreshList();
  };

  const save = async () => {
    if (!userId) return;
    if (!fTitle.trim()) {
      toast.error("Title is required");
      return;
    }
    setSaving(true);
    const payload: Partial<Cert> = {
      instructor_id: userId,
      title: fTitle.trim(),
      cert_type: fType,
      issued_date: fIssued || null,
      expiry_date: fNoExpiry ? null : (fExpiry || null),
      reminder_days_before: fReminder,
      notes: fNotes.trim() || null,
      is_active: true,
    };
    let error;
    if (editing) {
      ({ error } = await supabase
        .from("instructor_certifications")
        .update(payload)
        .eq("id", editing.id));
    } else {
      ({ error } = await supabase
        .from("instructor_certifications")
        .insert(payload));
      const renewId = (window as any).__renewingCertId as string | undefined;
      if (!error && renewId) {
        await supabase.from("instructor_certifications").update({ is_active: false }).eq("id", renewId);
        (window as any).__renewingCertId = undefined;
      }
    }
    setSaving(false);
    if (error) {
      toast.error("Could not save");
      return;
    }
    toast.success(editing ? "Updated" : "Saved");
    setSaveSuccess(true);
    successTimerRef.current = setTimeout(() => {
      finishAndRefresh();
    }, 2000);
  };

  const groupHeader = (label: string, colour: string, count: number) => (
    count > 0 ? (
      <div style={{ margin: "16px 16px 8px", fontSize: 10, fontWeight: 600, color: colour, textTransform: "uppercase", letterSpacing: 0.6, fontFamily: "Inter, sans-serif" }}>
        {label}
      </div>
    ) : null
  );

  const CertCard = ({ cert, s }: { cert: Cert; s: ReturnType<typeof getCertStatus> }) => {
    const progressPct = (() => {
      if (!cert.issued_date || !cert.expiry_date) return null;
      const start = new Date(cert.issued_date).getTime();
      const end = new Date(cert.expiry_date).getTime();
      if (end <= start) return 100;
      const now = Date.now();
      const pct = ((now - start) / (end - start)) * 100;
      return Math.max(0, Math.min(100, pct));
    })();
    return (
      <div style={{
        background: "#FFFFFF", border: "0.5px solid #E2E6ED", borderRadius: 12,
        padding: 0, overflow: "hidden", margin: "0 16px 8px",
        borderLeft: `3px solid ${s.colour}`, fontFamily: "Inter, sans-serif",
      }}>
        <div style={{ padding: "14px 16px", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: s.colour, textTransform: "uppercase", letterSpacing: 0.6 }}>
              {cert.cert_type || "Certification"}
            </div>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#0F2044", marginTop: 2 }}>{cert.title}</div>
            {cert.notes ? (
              <div style={{ fontSize: 12, color: "#9CA3AF", marginTop: 2 }}>{cert.notes}</div>
            ) : null}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, position: "relative" }}>
            <span style={{ background: s.bg, color: s.colour, fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 999 }}>
              {s.status === "expired" ? "Expired" : s.status === "expiring_soon" ? "Soon" : s.status === "valid" ? "Valid" : "No expiry"}
            </span>
            <button
              onClick={() => setMenuFor(menuFor === cert.id ? null : cert.id)}
              style={{ border: "none", background: "transparent", cursor: "pointer", padding: 4, color: "#9CA3AF" }}
              aria-label="More"
            >
              <MoreHorizontal size={16} />
            </button>
            {menuFor === cert.id && (
              <div style={{ position: "absolute", top: 26, right: 0, background: "#fff", border: "0.5px solid #E2E6ED", borderRadius: 10, boxShadow: "0 6px 20px rgba(0,0,0,0.1)", zIndex: 20, minWidth: 140, overflow: "hidden" }}>
                {[
                  { label: "Edit", onClick: () => openEdit(cert) },
                  { label: "Renew", onClick: () => openRenew(cert) },
                  { label: "Archive", onClick: () => archive(cert) },
                ].map((it) => (
                  <button key={it.label} onClick={it.onClick} style={{ display: "block", width: "100%", textAlign: "left", padding: "10px 14px", border: "none", background: "transparent", fontSize: 13, cursor: "pointer", color: "#0F2044" }}>
                    {it.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        <div style={{ padding: "0 16px 12px", display: "flex", gap: 16, flexWrap: "wrap" }}>
          {cert.issued_date && (
            <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "#6B7280" }}>
              <Calendar size={12} color="#9CA3AF" /> Issued {fmtDate(cert.issued_date)}
            </div>
          )}
          {cert.expiry_date && (
            <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: s.colour, fontWeight: 600 }}>
              <Clock size={12} color={s.colour} /> {s.label}
            </div>
          )}
        </div>
        {progressPct !== null && (
          <div style={{ height: 3, background: "#F3F4F6", margin: "0 16px 12px" }}>
            <div style={{ height: "100%", background: s.colour, width: `${progressPct}%` }} />
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{ minHeight: "100vh", background: "#FFFFFF", fontFamily: "Poppins, Inter, sans-serif", paddingBottom: 100 }}>
      {/* Top bar */}
      <div style={{ background: "#0F2044", padding: "calc(env(safe-area-inset-top, 0px) + 14px) 16px 14px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, color: "#FFFFFF" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button
            onClick={() => navigate({ to: "/home" as never })}
            style={{ background: "transparent", border: "none", color: "#FFFFFF", cursor: "pointer", padding: 4 }}
            aria-label="Back"
          >
            <ArrowLeft size={22} />
          </button>
          <div style={{ fontSize: 17, fontWeight: 700 }}>Certifications & Licences</div>
        </div>
        <button
          onClick={() => navigate({ to: "/home" as never })}
          style={{ background: "transparent", border: "none", color: "#FFFFFF", cursor: "pointer", padding: 4 }}
          aria-label="Close"
        >
          <X size={22} />
        </button>
      </div>

      {/* Summary strip */}
      <div style={{ display: "flex", gap: 8, margin: "16px 16px 0" }}>
        {[
          { count: expiredCount, label: "Expired", colour: "#CC2229" },
          { count: expiringCount, label: "Expiring soon", colour: "#D97706" },
          { count: validCount, label: "Valid", colour: "#16A34A" },
        ].map((s) => (
          <div key={s.label} style={{ flex: 1, background: "#FFFFFF", border: "0.5px solid #E2E6ED", borderRadius: 12, padding: 12, textAlign: "center" }}>
            <div style={{ fontSize: 20, fontWeight: 900, color: s.colour }}>{s.count}</div>
            <div style={{ fontSize: 10, color: "#9CA3AF", marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Urgent alert */}
      {(expiredCount > 0 || expiringCount > 0) && (
        <div style={{ margin: "12px 16px 0", background: "#FEF2F2", border: "0.5px solid #FECACA", borderRadius: 12, padding: "14px 16px", display: "flex", alignItems: "flex-start", gap: 10 }}>
          <AlertCircle size={16} color="#CC2229" style={{ marginTop: 1 }} />
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#CC2229" }}>
              {expiredCount} expired · {expiringCount} expiring soon
            </div>
            <div style={{ fontSize: 12, color: "#9CA3AF", marginTop: 4 }}>
              Renew these before your next standards check
            </div>
          </div>
        </div>
      )}

      {/* List */}
      {loading ? (
        <div style={{ padding: 32, textAlign: "center", color: "#9CA3AF" }}>Loading…</div>
      ) : certs.length === 0 ? (
        <div style={{ padding: "48px 24px 24px", textAlign: "center" }}>
          <Award size={48} color="#D1D5DB" style={{ margin: "0 auto 12px" }} />
          <div style={{ fontSize: 15, fontWeight: 600, color: "#6B7280" }}>No certifications tracked</div>
          <div style={{ fontSize: 13, color: "#9CA3AF", marginTop: 4 }}>
            Add your ADI licence, DBS check and other important dates
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center", marginTop: 20 }}>
            {CERT_PRESETS.map((p) => (
              <button
                key={p.type}
                onClick={() => openAdd(p)}
                style={{ background: "#F0F4FF", color: "#1A52A0", fontSize: 12, fontWeight: 600, padding: "6px 12px", borderRadius: 999, border: "none", cursor: "pointer" }}
              >
                {p.title}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <>
          {groupHeader("EXPIRED", "#CC2229", grouped.expired.length)}
          {grouped.expired.map(({ cert, s }) => <CertCard key={cert.id} cert={cert} s={s} />)}
          {groupHeader("EXPIRING SOON", "#D97706", grouped.expiring_soon.length)}
          {grouped.expiring_soon.map(({ cert, s }) => <CertCard key={cert.id} cert={cert} s={s} />)}
          {groupHeader("VALID", "#16A34A", grouped.valid.length)}
          {grouped.valid.map(({ cert, s }) => <CertCard key={cert.id} cert={cert} s={s} />)}
          {groupHeader("NO EXPIRY DATE", "#9CA3AF", grouped.no_expiry.length)}
          {grouped.no_expiry.map(({ cert, s }) => <CertCard key={cert.id} cert={cert} s={s} />)}
        </>
      )}

      {/* FAB add */}
      <button
        onClick={() => openAdd()}
        style={{ position: "fixed", right: 20, bottom: "calc(env(safe-area-inset-bottom, 0px) + 24px)", width: 56, height: 56, borderRadius: 28, background: "#0F2044", color: "#FFFFFF", border: "none", fontSize: 28, fontWeight: 300, cursor: "pointer", boxShadow: "0 6px 20px rgba(15,32,68,0.35)", zIndex: 30 }}
        aria-label="Add certification"
      >
        +
      </button>

      {/* Bottom sheet */}
      {sheetOpen && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 40, display: "flex", alignItems: "flex-end" }} onClick={() => setSheetOpen(false)}>
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ background: "#FFFFFF", width: "100%", maxHeight: "88vh", overflowY: "auto", borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: "20px 16px calc(env(safe-area-inset-bottom, 0px) + 20px)", fontFamily: "Poppins, Inter, sans-serif" }}
          >
            <div style={{ width: 40, height: 4, background: "#E5E7EB", borderRadius: 2, margin: "0 auto 16px" }} />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: "#0F2044" }}>
                {editing ? "Edit certification" : "Add certification"}
              </div>
              <button
                onClick={closeSheet}
                style={{ background: "#F3F4F6", border: "none", width: 32, height: 32, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
                aria-label="Close sheet"
              >
                <X size={16} color="#6B7280" />
              </button>
            </div>

            {saveSuccess ? (
              <div style={{ background: "#E0FFF4", borderRadius: 12, padding: 24, textAlign: "center" }}>
                <CheckCircle size={48} color="#16A34A" style={{ margin: "0 auto 12px" }} />
                <div style={{ fontSize: 20, fontWeight: 900, color: "#0F2044" }}>Saved!</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#16A34A", marginTop: 4 }}>{fTitle}</div>
                {fExpiry && !fNoExpiry ? (
                  <div style={{ fontSize: 14, color: "#9CA3AF", marginTop: 4 }}>Expires {fmtDate(fExpiry)}</div>
                ) : null}
                <button
                  onClick={finishAndRefresh}
                  style={{ background: "#0F2044", color: "#FFFFFF", width: "100%", borderRadius: 12, padding: "12px 16px", fontWeight: 600, border: "none", cursor: "pointer", marginTop: 16 }}
                >
                  Done
                </button>
              </div>
            ) : (
              <>
                {!editing && (
                  <>
                    <div style={{ fontSize: 12, color: "#9CA3AF", marginBottom: 8 }}>Quick add</div>
                    <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 8, marginBottom: 12 }}>
                      {CERT_PRESETS.map((p) => (
                        <button
                          key={p.type}
                          onClick={() => { setFTitle(p.title); setFType(p.type); setFReminder(p.reminder_days); }}
                          style={{ background: "#F0F4FF", color: "#1A52A0", fontSize: 12, fontWeight: 600, padding: "6px 12px", borderRadius: 999, border: "none", cursor: "pointer", whiteSpace: "nowrap" }}
                        >
                          {p.title}
                        </button>
                      ))}
                    </div>
                  </>
                )}

                <Field label="Title">
                  <input value={fTitle} onChange={(e) => setFTitle(e.target.value)} placeholder="e.g. ADI Licence" style={inputStyle} />
                </Field>

                <Field label="Certification type">
                  <select value={fType} onChange={(e) => setFType(e.target.value)} style={inputStyle}>
                    {CERT_PRESETS.map((p) => (
                      <option key={p.type} value={p.type}>{p.type}</option>
                    ))}
                  </select>
                </Field>

                <Field label="Issued date">
                  <input type="date" value={fIssued} onChange={(e) => setFIssued(e.target.value)} style={inputStyle} />
                </Field>

                <Field label="Expiry date">
                  <input type="date" value={fExpiry} disabled={fNoExpiry} onChange={(e) => setFExpiry(e.target.value)} style={{ ...inputStyle, opacity: fNoExpiry ? 0.5 : 1 }} />
                  <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "#6B7280", marginTop: 6, cursor: "pointer" }}>
                    <input type="checkbox" checked={fNoExpiry} onChange={(e) => setFNoExpiry(e.target.checked)} />
                    No expiry date
                  </label>
                </Field>

                <Field label="Remind me">
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <select value={fReminder} onChange={(e) => setFReminder(Number(e.target.value))} style={{ ...inputStyle, flex: "0 0 auto", width: 100 }}>
                      {[7, 14, 30, 60, 90, 180].map((d) => (
                        <option key={d} value={d}>{d} days</option>
                      ))}
                    </select>
                    <span style={{ fontSize: 12, color: "#6B7280" }}>before expiry</span>
                  </div>
                </Field>

                <Field label="Notes">
                  <textarea value={fNotes} onChange={(e) => setFNotes(e.target.value)} placeholder="Reference number, provider, etc." rows={3} style={{ ...inputStyle, resize: "vertical" }} />
                </Field>

                <button
                  onClick={save}
                  disabled={saving}
                  style={{ background: "#0F2044", color: "#FFFFFF", width: "100%", borderRadius: 12, padding: "12px 16px", fontWeight: 600, border: "none", cursor: "pointer", marginTop: 8, opacity: saving ? 0.7 : 1 }}
                >
                  {saving ? "Saving…" : "Save"}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  border: "0.5px solid #E2E6ED",
  borderRadius: 10,
  padding: "10px 12px",
  fontSize: 14,
  fontFamily: "Inter, sans-serif",
  color: "#0F2044",
  background: "#FFFFFF",
  boxSizing: "border-box",
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 12, color: "#6B7280", fontWeight: 600, marginBottom: 6 }}>{label}</div>
      {children}
    </div>
  );
}
