import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ChevronLeft, Plus, X, Send, Search, Pencil } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabaseClient";
import { useAdminGate } from "./admin";
import { AddressLookup } from "@/components/dsm/AddressLookup";

export const Route = createFileRoute("/admin/job-offers")({
  component: AdminJobOffers,
});

const POPPINS = { fontFamily: "Inter, sans-serif" } as const;
const NAVY = "#0B1F3A";
const BLUE = "#1877D6";
const GREY = "#6B7280";

const TRANSMISSIONS = ["manual", "automatic", "either"] as const;
const TIMINGS = [
  { value: "morning", label: "Mornings" },
  { value: "afternoon", label: "Afternoons" },
  { value: "evening", label: "Evenings" },
  { value: "weekend", label: "Weekends" },
];
const WEEKDAYS = [
  { value: "Monday", short: "Mon" },
  { value: "Tuesday", short: "Tue" },
  { value: "Wednesday", short: "Wed" },
  { value: "Thursday", short: "Thu" },
  { value: "Friday", short: "Fri" },
  { value: "Saturday", short: "Sat" },
  { value: "Sunday", short: "Sun" },
];
const PAYMENT_METHODS = ["Deposit", "Paid in full", "Klarna", "Clearpay", "None"] as const;

type JobOffer = {
  id: string;
  pupil_name: string | null;
  pupil_phone: string | null;
  pupil_email: string | null;
  transmission: string | null;
  course_hours: number | null;
  preferred_timing: string[] | null;
  preferred_days: string[] | null;
  preferred_start_date: string | null;
  postcode_area: string | null;
  centre_lat: number | null;
  centre_lng: number | null;
  offered_rate: number | null;
  amount_paid: number | null;
  payment_method: string | null;
  special_requirements: string | null;
  expires_at: string | null;
  status: string;
  created_at: string;
  created_by: string | null;
  claimed_by: string | null;
  claimed_at: string | null;
  enquiry_id: string | null;
  notes?: string | null;
};

type JobMessage = {
  id: string;
  job_offer_id: string;
  sender_type: string;
  sender_id: string | null;
  message: string;
  created_at: string;
};

type Enquiry = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  course_interest: string | null;
  notes: string | null;
  created_at: string;
};

function emptyForm(): Partial<JobOffer> {
  return {
    pupil_name: "",
    pupil_phone: "",
    pupil_email: "",
    transmission: "manual",
    course_hours: 10,
    preferred_timing: [],
    preferred_days: [],
    preferred_start_date: "",
    postcode_area: "",
    centre_lat: null,
    centre_lng: null,
    offered_rate: 0,
    amount_paid: null,
    payment_method: "None",
    special_requirements: "",
    expires_at: "",
    enquiry_id: null,
  };
}

function statusBadge(status: string) {
  const map: Record<string, { bg: string; color: string; label: string }> = {
    open: { bg: "#E5F5EC", color: "#0F9D58", label: "OPEN" },
    claimed: { bg: "#E5F0FC", color: "#1877D6", label: "CLAIMED" },
    expired: { bg: "#F3F4F6", color: "#6B7280", label: "EXPIRED" },
    cancelled: { bg: "#FDE7E9", color: "#CC2229", label: "CANCELLED" },
  };
  return map[status] ?? { bg: "#F3F4F6", color: "#6B7280", label: status.toUpperCase() };
}

function AdminJobOffers() {
  const navigate = useNavigate();
  const gate = useAdminGate();

  const [uid, setUid] = useState<string | null>(null);
  const [offers, setOffers] = useState<JobOffer[]>([]);
  const [instructorNames, setInstructorNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [showSheet, setShowSheet] = useState(false);
  const [form, setForm] = useState<Partial<JobOffer>>(emptyForm());
  const [editingOffer, setEditingOffer] = useState<JobOffer | null>(null);
  const [saving, setSaving] = useState(false);
  const [threadJob, setThreadJob] = useState<JobOffer | null>(null);

  // Enquiry link search
  const [enquiryQuery, setEnquiryQuery] = useState("");
  const [enquiryResults, setEnquiryResults] = useState<Enquiry[]>([]);
  const [linkedEnquiry, setLinkedEnquiry] = useState<Enquiry | null>(null);

  useEffect(() => {
    if (gate === "denied") navigate({ to: "/home" });
  }, [gate, navigate]);

  useEffect(() => {
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      setUid(auth?.user?.id ?? null);
    })();
  }, []);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("job_offers")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      toast.error("Failed to load job offers");
      setOffers([]);
      setLoading(false);
      return;
    }
    const rows = (data ?? []) as JobOffer[];
    setOffers(rows);

    const claimedIds = Array.from(
      new Set(rows.map((r) => r.claimed_by).filter((v): v is string => !!v)),
    );
    if (claimedIds.length) {
      const { data: instr } = await supabase
        .from("instructors")
        .select("id, name")
        .in("id", claimedIds);
      const map: Record<string, string> = {};
      (instr ?? []).forEach((i: any) => {
        map[i.id] = i.name ?? i.id;
      });
      setInstructorNames(map);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (gate === "allowed") load();
  }, [gate]);

  // Enquiry search
  useEffect(() => {
    const q = enquiryQuery.trim();
    if (!q) {
      setEnquiryResults([]);
      return;
    }
    let cancelled = false;
    const t = setTimeout(async () => {
      const { data } = await supabase
        .from("enquiries")
        .select("*")
        .ilike("name", `%${q}%`)
        .order("created_at", { ascending: false })
        .limit(10);
      if (!cancelled) setEnquiryResults((data ?? []) as Enquiry[]);
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [enquiryQuery]);

  const openNew = () => {
    setForm(emptyForm());
    setLinkedEnquiry(null);
    setEnquiryQuery("");
    setEnquiryResults([]);
    setShowSheet(true);
  };

  const applyEnquiry = (e: Enquiry) => {
    setLinkedEnquiry(e);
    setEnquiryQuery(e.name);
    setEnquiryResults([]);
    setForm((f) => ({
      ...f,
      enquiry_id: e.id,
      pupil_name: e.name ?? f.pupil_name,
      pupil_phone: e.phone ?? f.pupil_phone,
      pupil_email: e.email ?? f.pupil_email,
    }));
  };

  const clearEnquiryLink = () => {
    setLinkedEnquiry(null);
    setEnquiryQuery("");
    setForm((f) => ({ ...f, enquiry_id: null }));
  };

  const toggleDay = (day: string) => {
    setForm((f) => {
      const cur = new Set(f.preferred_days ?? []);
      if (cur.has(day)) cur.delete(day);
      else cur.add(day);
      return { ...f, preferred_days: Array.from(cur) };
    });
  };

  const toggleTiming = (timing: string) => {
    setForm((f) => {
      const cur = new Set(f.preferred_timing ?? []);
      if (cur.has(timing)) cur.delete(timing);
      else cur.add(timing);
      return { ...f, preferred_timing: Array.from(cur) };
    });
  };

  const save = async () => {
    if (!uid) return;
    if (!form.pupil_name?.trim()) {
      toast.error("Pupil name is required");
      return;
    }
    setSaving(true);
    const payload: any = {
      pupil_name: form.pupil_name?.trim() || null,
      pupil_phone: form.pupil_phone?.trim() || null,
      pupil_email: form.pupil_email?.trim() || null,
      transmission: form.transmission || null,
      course_hours: form.course_hours ?? null,
      preferred_timing: form.preferred_timing?.length ? form.preferred_timing : null,
      preferred_days: form.preferred_days?.length ? form.preferred_days : null,
      preferred_start_date: form.preferred_start_date || null,
      postcode_area: form.postcode_area?.trim() || null,
      centre_lat: form.centre_lat ?? null,
      centre_lng: form.centre_lng ?? null,
      offered_rate: form.offered_rate ?? null,
      amount_paid: form.amount_paid ?? null,
      payment_method: form.payment_method || null,
      special_requirements: form.special_requirements?.trim() || null,
      expires_at: form.expires_at ? new Date(form.expires_at).toISOString() : null,
      enquiry_id: form.enquiry_id ?? null,
      created_by: uid,
      status: "open",
    };
    const { error } = await supabase.from("job_offers").insert(payload);
    setSaving(false);
    if (error) {
      toast.error(error.message || "Failed to create job offer");
      return;
    }
    toast.success("Job offer created");
    setShowSheet(false);
    load();
  };

  const cancelOffer = async (offer: JobOffer) => {
    if (!confirm("Cancel this job offer?")) return;
    const { error } = await supabase
      .from("job_offers")
      .update({ status: "cancelled" })
      .eq("id", offer.id)
      .eq("status", "open");
    if (error) {
      toast.error("Failed to cancel");
      return;
    }
    toast.success("Job offer cancelled");
    load();
  };

  if (gate === "checking") {
    return (
      <div style={{ background: "#fff", minHeight: "100vh", padding: 24, ...POPPINS, color: GREY }}>
        Checking access…
      </div>
    );
  }
  if (gate === "denied") {
    return (
      <div style={{ background: "#fff", minHeight: "100vh", padding: 24, ...POPPINS }}>
        <div style={{ fontSize: 18, fontWeight: 600, color: BLUE }}>Access denied</div>
      </div>
    );
  }

  return (
    <div style={{ background: "#DCE4F0", minHeight: "100vh", ...POPPINS, paddingBottom: 32 }}>
      {/* Header */}
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 30,
          background: BLUE,
          color: "#fff",
          padding: "calc(env(safe-area-inset-top, 0px) + 12px) 16px 14px",
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}
      >
        <button
          type="button"
          onClick={() => navigate({ to: "/admin" })}
          aria-label="Back"
          style={{
            width: 32, height: 32, borderRadius: "50%",
            background: "rgba(255,255,255,0.15)", border: "none",
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", color: "#fff",
          }}
        >
          <ChevronLeft size={18} />
        </button>
        <span style={{ fontSize: 16, fontWeight: 600, flex: 1 }}>Job offers</span>
        <button
          type="button"
          onClick={openNew}
          style={{
            background: "#fff", color: BLUE, border: "none", borderRadius: 8,
            padding: "8px 12px", fontSize: 13, fontWeight: 600, cursor: "pointer",
            display: "inline-flex", alignItems: "center", gap: 6,
          }}
        >
          <Plus size={14} /> New
        </button>
      </div>

      {/* List */}
      <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
        {loading ? (
          <div style={{ padding: 24, textAlign: "center", color: GREY, fontSize: 13 }}>Loading…</div>
        ) : offers.length === 0 ? (
          <div style={{ padding: 24, textAlign: "center", color: GREY, fontSize: 13 }}>
            No job offers yet.
          </div>
        ) : (
          offers.map((o) => {
            const badge = statusBadge(o.status);
            return (
              <div
                key={o.id}
                style={{
                  background: "#fff",
                  borderRadius: 12,
                  boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
                  padding: 14,
                }}
              >
                <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: NAVY }}>
                      {o.pupil_name || "New pupil"}
                    </div>
                    <div style={{ fontSize: 12, color: GREY, marginTop: 2 }}>
                      {[
                        o.postcode_area,
                        o.transmission,
                        o.course_hours ? `${o.course_hours} hrs` : null,
                        o.preferred_timing?.join(", "),
                      ].filter(Boolean).join(" · ")}
                    </div>
                    <div style={{ fontSize: 12, color: GREY, marginTop: 4 }}>
                      {o.offered_rate != null ? `£${Number(o.offered_rate).toFixed(2)}/hr` : "Rate TBC"}
                    </div>
                    {o.status === "claimed" && o.claimed_by && (
                      <div style={{ fontSize: 12, color: BLUE, marginTop: 6 }}>
                        Claimed by {instructorNames[o.claimed_by] ?? o.claimed_by.slice(0, 8)}
                        {o.claimed_at ? ` · ${new Date(o.claimed_at).toLocaleString()}` : ""}
                      </div>
                    )}
                  </div>
                  <span
                    style={{
                      fontSize: 10, fontWeight: 700, letterSpacing: 0.3,
                      color: badge.color, background: badge.bg,
                      padding: "4px 8px", borderRadius: 999, whiteSpace: "nowrap",
                    }}
                  >
                    {badge.label}
                  </span>
                </div>

                <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                  {o.status === "claimed" && (
                    <button
                      type="button"
                      onClick={() => setThreadJob(o)}
                      style={{
                        background: BLUE, color: "#fff", border: "none", borderRadius: 8,
                        padding: "8px 12px", fontSize: 13, fontWeight: 600, cursor: "pointer",
                      }}
                    >
                      View messages
                    </button>
                  )}
                  {o.status === "open" && (
                    <>
                      <button
                        type="button"
                        onClick={() => setThreadJob(o)}
                        style={{
                          background: "#fff", color: BLUE, border: `1px solid ${BLUE}`,
                          borderRadius: 8, padding: "8px 12px", fontSize: 13, fontWeight: 600,
                          cursor: "pointer",
                        }}
                      >
                        Messages
                      </button>
                      <button
                        type="button"
                        onClick={() => cancelOffer(o)}
                        style={{
                          background: "#fff", color: "#CC2229", border: "1px solid #CC2229",
                          borderRadius: 8, padding: "8px 12px", fontSize: 13, fontWeight: 600,
                          cursor: "pointer",
                        }}
                      >
                        Cancel
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* New offer sheet */}
      {showSheet && (
        <div
          onClick={() => setShowSheet(false)}
          style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 100,
            display: "flex", flexDirection: "column", justifyContent: "flex-end",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#fff", borderTopLeftRadius: 16, borderTopRightRadius: 16,
              maxHeight: "90vh", overflowY: "auto", ...POPPINS,
            }}
          >
            <div
              style={{
                display: "flex", alignItems: "center", padding: "14px 16px",
                borderBottom: "1px solid #E5E7EB",
              }}
            >
              <div style={{ flex: 1, fontSize: 16, fontWeight: 700, color: NAVY }}>
                New job offer
              </div>
              <button
                onClick={() => setShowSheet(false)}
                style={{ padding: 6, background: "transparent", border: "none", cursor: "pointer" }}
              >
                <X size={20} color={GREY} />
              </button>
            </div>

            <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 14 }}>
              {/* Enquiry link */}
              <FieldLabel label="Link to enquiry (optional)">
                {linkedEnquiry ? (
                  <div
                    style={{
                      display: "flex", alignItems: "center", gap: 8,
                      background: "#E5F0FC", color: BLUE, padding: "8px 12px",
                      borderRadius: 8, fontSize: 13, fontWeight: 600,
                    }}
                  >
                    <span style={{ flex: 1 }}>Linked: {linkedEnquiry.name}</span>
                    <button
                      type="button"
                      onClick={clearEnquiryLink}
                      style={{ background: "transparent", border: "none", cursor: "pointer", color: BLUE }}
                    >
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <div style={{ position: "relative" }}>
                    <div style={{ position: "relative" }}>
                      <Search
                        size={14}
                        style={{ position: "absolute", top: 12, left: 10, color: GREY }}
                      />
                      <input
                        value={enquiryQuery}
                        onChange={(e) => setEnquiryQuery(e.target.value)}
                        placeholder="Search enquiries by name…"
                        style={inputStyle(true)}
                      />
                    </div>
                    {enquiryResults.length > 0 && (
                      <div
                        style={{
                          position: "absolute", top: "100%", left: 0, right: 0, zIndex: 10,
                          background: "#fff", border: "1px solid #E5E7EB", borderRadius: 8,
                          marginTop: 4, maxHeight: 220, overflowY: "auto",
                          boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                        }}
                      >
                        {enquiryResults.map((e) => (
                          <button
                            key={e.id}
                            type="button"
                            onClick={() => applyEnquiry(e)}
                            style={{
                              display: "block", width: "100%", textAlign: "left",
                              padding: "10px 12px", background: "transparent", border: "none",
                              borderBottom: "1px solid #F3F4F6", cursor: "pointer", fontSize: 13,
                            }}
                          >
                            <div style={{ fontWeight: 600, color: NAVY }}>{e.name}</div>
                            <div style={{ fontSize: 11, color: GREY }}>
                              {[e.phone, e.email, e.course_interest].filter(Boolean).join(" · ")}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </FieldLabel>

              <FieldLabel label="Pupil name *">
                <input
                  value={form.pupil_name ?? ""}
                  onChange={(e) => setForm({ ...form, pupil_name: e.target.value })}
                  style={inputStyle()}
                />
              </FieldLabel>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <FieldLabel label="Phone">
                  <input
                    value={form.pupil_phone ?? ""}
                    onChange={(e) => setForm({ ...form, pupil_phone: e.target.value })}
                    style={inputStyle()}
                  />
                </FieldLabel>
                <FieldLabel label="Email">
                  <input
                    value={form.pupil_email ?? ""}
                    onChange={(e) => setForm({ ...form, pupil_email: e.target.value })}
                    style={inputStyle()}
                  />
                </FieldLabel>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <FieldLabel label="Transmission">
                  <select
                    value={form.transmission ?? ""}
                    onChange={(e) => setForm({ ...form, transmission: e.target.value })}
                    style={inputStyle()}
                  >
                    {TRANSMISSIONS.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </FieldLabel>
                <FieldLabel label="Course hours">
                  <input
                    type="number"
                    min={1}
                    value={form.course_hours ?? ""}
                    onChange={(e) => setForm({ ...form, course_hours: e.target.value ? Number(e.target.value) : null })}
                    style={inputStyle()}
                  />
                </FieldLabel>
              </div>

              <FieldLabel label="Preferred timing">
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {TIMINGS.map((t) => {
                    const active = (form.preferred_timing ?? []).includes(t.value);
                    return (
                      <button
                        key={t.value}
                        type="button"
                        onClick={() => toggleTiming(t.value)}
                        style={{
                          padding: "6px 12px", borderRadius: 999,
                          border: `1px solid ${active ? BLUE : "#D1D5DB"}`,
                          background: active ? BLUE : "#fff",
                          color: active ? "#fff" : NAVY,
                          fontSize: 12, fontWeight: 600, cursor: "pointer",
                        }}
                      >
                        {t.label}
                      </button>
                    );
                  })}
                </div>
              </FieldLabel>

              <FieldLabel label="Preferred days">
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {WEEKDAYS.map((d) => {
                    const active = (form.preferred_days ?? []).includes(d.value);
                    return (
                      <button
                        key={d.value}
                        type="button"
                        onClick={() => toggleDay(d.value)}
                        style={{
                          padding: "6px 12px", borderRadius: 999,
                          border: `1px solid ${active ? BLUE : "#D1D5DB"}`,
                          background: active ? BLUE : "#fff",
                          color: active ? "#fff" : NAVY,
                          fontSize: 12, fontWeight: 600, cursor: "pointer",
                        }}
                      >
                        {d.short}
                      </button>
                    );
                  })}
                </div>
              </FieldLabel>

              <FieldLabel label="Postcode area">
                <AddressLookup
                  initialPostcode={form.postcode_area ?? undefined}
                  onAddressFound={({ postcode, lat, lng }) => {
                    const outcode = postcode.trim().split(" ")[0].toUpperCase();
                    setForm((f) => ({ ...f, postcode_area: outcode, centre_lat: lat, centre_lng: lng }));
                  }}
                />
              </FieldLabel>

              <FieldLabel label="Preferred start date">
                <input
                  type="date"
                  value={form.preferred_start_date ?? ""}
                  onChange={(e) => setForm({ ...form, preferred_start_date: e.target.value })}
                  style={inputStyle()}
                />
              </FieldLabel>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <FieldLabel label="Offered rate (£/hr)">
                  <input
                    type="number"
                    step="0.01"
                    value={form.offered_rate ?? ""}
                    onChange={(e) => setForm({ ...form, offered_rate: e.target.value ? Number(e.target.value) : null })}
                    style={inputStyle()}
                  />
                </FieldLabel>
                <FieldLabel label="Expires at">
                  <input
                    type="datetime-local"
                    value={form.expires_at ?? ""}
                    onChange={(e) => setForm({ ...form, expires_at: e.target.value })}
                    style={inputStyle()}
                  />
                </FieldLabel>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <FieldLabel label="Amount paid">
                  <input
                    type="number"
                    step="0.01"
                    min={0}
                    value={form.amount_paid ?? ""}
                    onChange={(e) => setForm({ ...form, amount_paid: e.target.value ? Number(e.target.value) : null })}
                    style={inputStyle()}
                  />
                </FieldLabel>
                <FieldLabel label="Payment method">
                  <select
                    value={form.payment_method ?? "None"}
                    onChange={(e) => setForm({ ...form, payment_method: e.target.value })}
                    style={inputStyle()}
                  >
                    {PAYMENT_METHODS.map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </FieldLabel>
              </div>

              <FieldLabel label="Special requirements">
                <input
                  value={form.special_requirements ?? ""}
                  onChange={(e) => setForm({ ...form, special_requirements: e.target.value })}
                  placeholder="e.g. Pickup from school, nervous driver, has own car"
                  style={inputStyle()}
                />
              </FieldLabel>

              <button
                type="button"
                onClick={save}
                disabled={saving}
                style={{
                  background: BLUE, color: "#fff", border: "none", borderRadius: 10,
                  padding: "12px 16px", fontSize: 15, fontWeight: 600, cursor: "pointer",
                  opacity: saving ? 0.6 : 1, marginTop: 6,
                }}
              >
                {saving ? "Saving…" : "Create job offer"}
              </button>
            </div>
          </div>
        </div>
      )}

      {threadJob && (
        <AdminJobThread
          job={threadJob}
          uid={uid}
          onClose={() => setThreadJob(null)}
        />
      )}
    </div>
  );
}

function FieldLabel({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <span style={{ fontSize: 12, fontWeight: 600, color: NAVY }}>{label}</span>
      {children}
    </label>
  );
}

function inputStyle(withIcon = false): React.CSSProperties {
  return {
    width: "100%",
    padding: withIcon ? "10px 12px 10px 30px" : "10px 12px",
    fontSize: 16,
    border: "1px solid #D1D5DB",
    borderRadius: 8,
    outline: "none",
    background: "#fff",
    color: NAVY,
    fontFamily: "Inter, sans-serif",
  };
}

function AdminJobThread({
  job,
  uid,
  onClose,
}: {
  job: JobOffer;
  uid: string | null;
  onClose: () => void;
}) {
  const [messages, setMessages] = useState<JobMessage[] | null>(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const loadMessages = async () => {
    const { data } = await supabase
      .from("job_offer_messages")
      .select("*")
      .eq("job_offer_id", job.id)
      .order("created_at", { ascending: true });
    setMessages((data ?? []) as JobMessage[]);
    setTimeout(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
    }, 50);
  };

  useEffect(() => { loadMessages(); }, [job.id]);

  const send = async () => {
    const text = draft.trim();
    if (!text || !uid || sending) return;
    setSending(true);
    const { error } = await supabase.from("job_offer_messages").insert({
      job_offer_id: job.id,
      sender_type: "admin",
      sender_id: uid,
      message: text,
    });
    setSending(false);
    if (error) {
      toast.error("Message failed to send");
      return;
    }
    setDraft("");
    loadMessages();
  };

  const fmtTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 100,
        display: "flex", flexDirection: "column", justifyContent: "flex-end",
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#F3F8FF", borderTopLeftRadius: 16, borderTopRightRadius: 16,
          maxHeight: "85vh", display: "flex", flexDirection: "column", ...POPPINS,
        }}
      >
        <div
          style={{
            display: "flex", alignItems: "center", padding: "14px 16px",
            borderBottom: "1px solid #E5E7EB", background: "#fff",
            borderTopLeftRadius: 16, borderTopRightRadius: 16,
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: NAVY }}>
              {job.pupil_name || "Job enquiry"}
            </div>
            <div style={{ fontSize: 11, color: GREY }}>
              {[job.postcode_area, job.preferred_timing?.join(", "), `status: ${job.status}`].filter(Boolean).join(" · ")}
            </div>
          </div>
          <button onClick={onClose} style={{ padding: 6, background: "transparent", border: "none", cursor: "pointer" }}>
            <X size={20} color={GREY} />
          </button>
        </div>

        <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 8 }}>
          {messages === null ? (
            <div style={{ color: GREY, fontSize: 13, textAlign: "center", padding: 20 }}>Loading…</div>
          ) : messages.length === 0 ? (
            <div style={{ color: GREY, fontSize: 13, textAlign: "center", padding: 20 }}>
              No messages yet.
            </div>
          ) : (
            messages.map((m) => {
              const mine = m.sender_type === "admin";
              const bg = mine ? BLUE : m.sender_type === "instructor" ? "#fff" : "#FEF3C7";
              const color = mine ? "#fff" : NAVY;
              return (
                <div key={m.id} style={{ display: "flex", justifyContent: mine ? "flex-end" : "flex-start" }}>
                  <div
                    style={{
                      maxWidth: "78%", background: bg, color, borderRadius: 14,
                      padding: "8px 12px", fontSize: 14,
                      boxShadow: mine ? "none" : "0 1px 2px rgba(0,0,0,0.05)",
                    }}
                  >
                    <div style={{ fontSize: 10, opacity: 0.7, marginBottom: 2, textTransform: "uppercase", letterSpacing: 0.3 }}>
                      {m.sender_type}
                    </div>
                    <div>{m.message}</div>
                    <div style={{ fontSize: 10, opacity: 0.7, marginTop: 2, textAlign: "right" }}>
                      {fmtTime(m.created_at)}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div
          style={{
            display: "flex", gap: 8, padding: 12, borderTop: "1px solid #E5E7EB",
            background: "#fff", paddingBottom: "calc(12px + env(safe-area-inset-bottom, 0px))",
          }}
        >
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") send(); }}
            placeholder="Reply as admin…"
            style={{
              flex: 1, background: "#F3F4F6", border: "none", borderRadius: 20,
              padding: "10px 14px", fontSize: 16, outline: "none", ...POPPINS,
            }}
          />
          <button
            onClick={send}
            disabled={!draft.trim() || sending}
            style={{
              background: BLUE, color: "#fff", border: "none", borderRadius: 20,
              width: 40, height: 40, display: "flex", alignItems: "center", justifyContent: "center",
              cursor: draft.trim() ? "pointer" : "not-allowed", opacity: draft.trim() ? 1 : 0.5,
            }}
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
