import { useEffect, useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ChevronLeft, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabaseClient";
import { useAdminGate } from "./admin";

export const Route = createFileRoute("/admin/applications")({
  component: AdminApplicationsPage,
});

const RED = "#CC2229";
const NAVY = "#0F2044";
const AMBER = "#B45309";
const GREEN = "#16A34A";
const BORDER = "#E2E6ED";
const MUTED = "#64748B";

type Application = {
  id: string;
  instructor_id: string;
  business_name: string | null;
  trading_name: string | null;
  website_url: string | null;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  address: string | null;
  postcode: string | null;
  coverage_areas: string | null;
  years_experience: number | null;
  adi_number: string | null;
  dvsa_grade: string | null;
  pass_rate: number | null;
  fleet_size: number | null;
  transmission: string | null;
  specialisms: string | null;
  bio: string | null;
  why_featured: string | null;
  social_instagram: string | null;
  social_facebook: string | null;
  social_tiktok: string | null;
  status: string;
  admin_notes: string | null;
  submitted_at: string | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
};

type FilterKey = "all" | "pending" | "approved" | "rejected";

function AdminApplicationsPage() {
  const navigate = useNavigate();
  const status = useAdminGate();
  const [apps, setApps] = useState<Application[] | null>(null);
  const [filter, setFilter] = useState<FilterKey>("pending");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [adminUserId, setAdminUserId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rejectDraft, setRejectDraft] = useState<Record<string, string>>({});
  const [infoDraft, setInfoDraft] = useState<Record<string, string>>({});
  const [showReject, setShowReject] = useState<Record<string, boolean>>({});
  const [showInfo, setShowInfo] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (status !== "allowed") return;
    let alive = true;
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!alive) return;
      setAdminUserId(u.user?.id ?? null);
      await fetchApps(alive);
    })();
    return () => {
      alive = false;
    };
  }, [status]);

  async function fetchApps(alive = true) {
    const { data, error } = await supabase
      .from("featured_applications")
      .select("*")
      .order("submitted_at", { ascending: false });
    if (!alive) return;
    if (error) {
      console.error("[admin/applications] fetch error", error);
      toast.error("Couldn't load applications");
      setApps([]);
      return;
    }
    setApps((data ?? []) as Application[]);
  }

  const stats = useMemo(() => {
    const list = apps ?? [];
    return {
      pending: list.filter((a) => a.status === "pending").length,
      approved: list.filter((a) => a.status === "approved").length,
      rejected: list.filter((a) => a.status === "rejected").length,
    };
  }, [apps]);

  const filtered = useMemo(() => {
    const list = apps ?? [];
    if (filter === "all") return list;
    return list.filter((a) => a.status === filter);
  }, [apps, filter]);

  async function approve(app: Application) {
    if (!adminUserId) return;
    setBusyId(app.id);
    try {
      const now = new Date().toISOString();
      const until = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      const { error: e1 } = await supabase
        .from("featured_applications")
        .update({ status: "approved", reviewed_at: now, reviewed_by: adminUserId, admin_notes: null })
        .eq("id", app.id);
      if (e1) throw e1;
      const { error: e2 } = await supabase
        .from("instructors")
        .update({ featured_listing: true, featured_until: until })
        .eq("id", app.instructor_id);
      if (e2) console.warn("[approve] instructor update:", e2);
      const { error: e3 } = await supabase
        .from("courses")
        .update({ featured: true })
        .eq("instructor_id", app.instructor_id)
        .eq("status", "published");
      if (e3) console.warn("[approve] courses update:", e3);
      await supabase.from("instructor_notifications").insert({
        instructor_id: app.instructor_id,
        title: "🎉 Featured listing approved",
        body: "Your featured listing has been approved! You're now featured on EveryDriver.",
        type: "featured_application",
      });
      toast.success("Application approved");
      await fetchApps();
    } catch (err) {
      console.error("[approve] error", err);
      toast.error("Couldn't approve application");
    } finally {
      setBusyId(null);
    }
  }

  async function reject(app: Application) {
    if (!adminUserId) return;
    const reason = (rejectDraft[app.id] ?? "").trim();
    if (!reason) {
      toast.error("Please provide a reason");
      return;
    }
    setBusyId(app.id);
    try {
      const now = new Date().toISOString();
      const { error } = await supabase
        .from("featured_applications")
        .update({ status: "rejected", admin_notes: reason, reviewed_at: now, reviewed_by: adminUserId })
        .eq("id", app.id);
      if (error) throw error;
      await supabase.from("instructor_notifications").insert({
        instructor_id: app.instructor_id,
        title: "Featured application not approved",
        body: `Your featured application was not approved. ${reason}`,
        type: "featured_application",
      });
      toast.success("Application rejected");
      setShowReject((s) => ({ ...s, [app.id]: false }));
      setRejectDraft((s) => ({ ...s, [app.id]: "" }));
      await fetchApps();
    } catch (err) {
      console.error("[reject] error", err);
      toast.error("Couldn't reject application");
    } finally {
      setBusyId(null);
    }
  }

  async function requestInfo(app: Application) {
    const message = (infoDraft[app.id] ?? "").trim();
    if (!message) {
      toast.error("Please enter a message");
      return;
    }
    setBusyId(app.id);
    try {
      const { error } = await supabase
        .from("featured_applications")
        .update({ status: "pending", admin_notes: message })
        .eq("id", app.id);
      if (error) throw error;
      await supabase.from("instructor_notifications").insert({
        instructor_id: app.instructor_id,
        title: "More info needed on your application",
        body: message,
        type: "featured_application",
      });
      toast.success("Message sent to instructor");
      setShowInfo((s) => ({ ...s, [app.id]: false }));
      setInfoDraft((s) => ({ ...s, [app.id]: "" }));
      await fetchApps();
    } catch (err) {
      console.error("[requestInfo] error", err);
      toast.error("Couldn't send message");
    } finally {
      setBusyId(null);
    }
  }

  if (status === "checking") {
    return <FullMsg>Checking access…</FullMsg>;
  }
  if (status === "denied") {
    return (
      <div style={{ background: "#fff", minHeight: "100vh", padding: 24, fontFamily: "Inter, sans-serif" }}>
        <div style={{ fontSize: 18, fontWeight: 600, color: RED }}>Access denied</div>
        <div style={{ color: MUTED, marginTop: 8 }}>Your account doesn't have admin access.</div>
        <button
          type="button"
          onClick={() => navigate({ to: "/home" })}
          style={{ marginTop: 20, height: 44, padding: "0 20px", borderRadius: 10, background: NAVY, color: "#fff", border: "none", fontWeight: 600, cursor: "pointer" }}
        >
          Go to home
        </button>
      </div>
    );
  }

  return (
    <div style={{ background: "#fff", minHeight: "100vh", fontFamily: "Inter, sans-serif", paddingBottom: 80 }}>
      {/* Top bar */}
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 10,
          background: RED,
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
            width: 32,
            height: 32,
            borderRadius: "50%",
            background: "rgba(255,255,255,0.18)",
            border: "none",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            color: "#fff",
          }}
        >
          <ChevronLeft size={18} />
        </button>
        <span style={{ fontSize: 16, fontWeight: 600 }}>Featured applications</span>
      </div>

      {/* Stats */}
      <div style={{ padding: 16, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
        <StatCard label="Pending" value={stats.pending} color={AMBER} bg="#FEF3C7" />
        <StatCard label="Approved" value={stats.approved} color={GREEN} bg="#DCFCE7" />
        <StatCard label="Rejected" value={stats.rejected} color={RED} bg="#FEE2E2" />
      </div>

      {/* Filter tabs */}
      <div style={{ display: "flex", gap: 8, padding: "0 16px 12px", overflowX: "auto" }}>
        {(["all", "pending", "approved", "rejected"] as FilterKey[]).map((k) => {
          const active = filter === k;
          return (
            <button
              key={k}
              type="button"
              onClick={() => setFilter(k)}
              style={{
                flexShrink: 0,
                padding: "8px 14px",
                borderRadius: 999,
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                border: active ? "none" : `1px solid ${BORDER}`,
                background: active ? NAVY : "#fff",
                color: active ? "#fff" : NAVY,
                textTransform: "capitalize",
              }}
            >
              {k}
            </button>
          );
        })}
      </div>

      {/* List */}
      {apps === null ? (
        <FullMsg>Loading applications…</FullMsg>
      ) : filtered.length === 0 ? (
        <FullMsg>No applications</FullMsg>
      ) : (
        filtered.map((app) => {
          const isOpen = expandedId === app.id;
          return (
            <div
              key={app.id}
              style={{
                background: "#fff",
                border: `0.5px solid ${BORDER}`,
                borderRadius: 12,
                padding: 16,
                margin: "0 16px 8px",
              }}
            >
              <button
                type="button"
                onClick={() => setExpandedId(isOpen ? null : app.id)}
                style={{
                  background: "none",
                  border: "none",
                  padding: 0,
                  width: "100%",
                  textAlign: "left",
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: NAVY }}>
                    {app.business_name || app.trading_name || "Unnamed business"}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <StatusBadge status={app.status} />
                    {isOpen ? <ChevronUp size={16} color={MUTED} /> : <ChevronDown size={16} color={MUTED} />}
                  </div>
                </div>
                <div style={{ fontSize: 12, color: NAVY, marginTop: 6 }}>
                  {[
                    app.adi_number && `ADI ${app.adi_number}`,
                    app.dvsa_grade,
                    app.pass_rate != null && `${app.pass_rate}% pass`,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </div>
                {app.coverage_areas && (
                  <div style={{ fontSize: 12, color: MUTED, marginTop: 4 }}>{app.coverage_areas}</div>
                )}
                <div style={{ fontSize: 11, color: MUTED, marginTop: 6 }}>
                  Submitted {fmt(app.submitted_at)}
                </div>
              </button>

              {isOpen && (
                <div style={{ marginTop: 14, borderTop: `0.5px solid ${BORDER}`, paddingTop: 12 }}>
                  <Detail title="Contact">
                    <Row k="Name" v={app.contact_name} />
                    <Row k="Email" v={app.contact_email} />
                    <Row k="Phone" v={app.contact_phone} />
                    <Row k="Address" v={[app.address, app.postcode].filter(Boolean).join(", ")} />
                  </Detail>
                  <Detail title="Business">
                    <Row k="ADI number" v={app.adi_number} />
                    <Row k="DVSA grade" v={app.dvsa_grade} />
                    <Row k="Years experience" v={app.years_experience?.toString()} />
                    <Row k="Fleet size" v={app.fleet_size?.toString()} />
                    <Row k="Transmission" v={app.transmission} />
                    <Row k="Pass rate" v={app.pass_rate != null ? `${app.pass_rate}%` : null} />
                  </Detail>
                  <Detail title="Coverage & specialisms">
                    <Row k="Areas" v={app.coverage_areas} />
                    <Row k="Specialisms" v={app.specialisms} />
                  </Detail>
                  {app.bio && (
                    <Detail title="Bio">
                      <div style={{ fontSize: 13, color: NAVY, whiteSpace: "pre-wrap" }}>{app.bio}</div>
                    </Detail>
                  )}
                  {app.why_featured && (
                    <Detail title="Why featured">
                      <div style={{ fontSize: 13, color: NAVY, whiteSpace: "pre-wrap" }}>{app.why_featured}</div>
                    </Detail>
                  )}
                  <Detail title="Online presence">
                    <Row k="Website" v={app.website_url} />
                    <Row k="Instagram" v={app.social_instagram} />
                    <Row k="Facebook" v={app.social_facebook} />
                    <Row k="TikTok" v={app.social_tiktok} />
                  </Detail>
                  {app.admin_notes && app.status !== "pending" && (
                    <Detail title="Admin notes">
                      <div style={{ fontSize: 13, color: NAVY, whiteSpace: "pre-wrap" }}>{app.admin_notes}</div>
                    </Detail>
                  )}

                  {/* Actions */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 14 }}>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button
                        type="button"
                        disabled={busyId === app.id || app.status === "approved"}
                        onClick={() => approve(app)}
                        style={{
                          flex: 1,
                          height: 42,
                          borderRadius: 10,
                          border: "none",
                          background: GREEN,
                          color: "#fff",
                          fontWeight: 700,
                          fontSize: 13,
                          cursor: busyId === app.id ? "wait" : "pointer",
                          opacity: app.status === "approved" ? 0.5 : 1,
                        }}
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        disabled={busyId === app.id}
                        onClick={() => setShowReject((s) => ({ ...s, [app.id]: !s[app.id] }))}
                        style={{
                          flex: 1,
                          height: 42,
                          borderRadius: 10,
                          border: "none",
                          background: RED,
                          color: "#fff",
                          fontWeight: 700,
                          fontSize: 13,
                          cursor: "pointer",
                        }}
                      >
                        Reject
                      </button>
                    </div>
                    <button
                      type="button"
                      disabled={busyId === app.id}
                      onClick={() => setShowInfo((s) => ({ ...s, [app.id]: !s[app.id] }))}
                      style={{
                        height: 42,
                        borderRadius: 10,
                        border: `1px solid ${NAVY}`,
                        background: "#fff",
                        color: NAVY,
                        fontWeight: 700,
                        fontSize: 13,
                        cursor: "pointer",
                      }}
                    >
                      Request more info
                    </button>

                    {showReject[app.id] && (
                      <div style={{ marginTop: 4 }}>
                        <textarea
                          value={rejectDraft[app.id] ?? ""}
                          onChange={(e) => setRejectDraft((s) => ({ ...s, [app.id]: e.target.value }))}
                          placeholder="Reason for rejection (shared with instructor)"
                          rows={3}
                          style={{
                            width: "100%",
                            padding: 10,
                            borderRadius: 10,
                            border: `1px solid ${BORDER}`,
                            fontSize: 13,
                            fontFamily: "inherit",
                            color: NAVY,
                            outline: "none",
                            resize: "vertical",
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => reject(app)}
                          disabled={busyId === app.id}
                          style={{
                            marginTop: 8,
                            width: "100%",
                            height: 40,
                            borderRadius: 10,
                            border: "none",
                            background: RED,
                            color: "#fff",
                            fontWeight: 700,
                            fontSize: 13,
                            cursor: "pointer",
                          }}
                        >
                          Send rejection
                        </button>
                      </div>
                    )}

                    {showInfo[app.id] && (
                      <div style={{ marginTop: 4 }}>
                        <textarea
                          value={infoDraft[app.id] ?? ""}
                          onChange={(e) => setInfoDraft((s) => ({ ...s, [app.id]: e.target.value }))}
                          placeholder="Message to instructor (what more info do you need?)"
                          rows={3}
                          style={{
                            width: "100%",
                            padding: 10,
                            borderRadius: 10,
                            border: `1px solid ${BORDER}`,
                            fontSize: 13,
                            fontFamily: "inherit",
                            color: NAVY,
                            outline: "none",
                            resize: "vertical",
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => requestInfo(app)}
                          disabled={busyId === app.id}
                          style={{
                            marginTop: 8,
                            width: "100%",
                            height: 40,
                            borderRadius: 10,
                            border: `1px solid ${NAVY}`,
                            background: "#fff",
                            color: NAVY,
                            fontWeight: 700,
                            fontSize: 13,
                            cursor: "pointer",
                          }}
                        >
                          Send message
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}

function fmt(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

function StatCard({ label, value, color, bg }: { label: string; value: number; color: string; bg: string }) {
  return (
    <div style={{ background: bg, borderRadius: 12, padding: 12, textAlign: "center" }}>
      <div style={{ fontSize: 22, fontWeight: 800, color }}>{value}</div>
      <div style={{ fontSize: 11, color, fontWeight: 600, marginTop: 2 }}>{label}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; color: string; label: string }> = {
    pending: { bg: "#FEF3C7", color: AMBER, label: "Pending" },
    approved: { bg: "#DCFCE7", color: GREEN, label: "Approved" },
    rejected: { bg: "#FEE2E2", color: RED, label: "Rejected" },
  };
  const cfg = map[status] ?? { bg: "#EEF2F7", color: NAVY, label: status };
  return (
    <span
      style={{
        fontSize: 10,
        fontWeight: 700,
        textTransform: "uppercase",
        letterSpacing: "0.04em",
        padding: "3px 8px",
        borderRadius: 999,
        background: cfg.bg,
        color: cfg.color,
      }}
    >
      {cfg.label}
    </span>
  );
}

function Detail({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginTop: 10 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: MUTED, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 4 }}>
        {title}
      </div>
      {children}
    </div>
  );
}

function Row({ k, v }: { k: string; v: string | null | undefined }) {
  if (!v) return null;
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 10, fontSize: 12, padding: "3px 0" }}>
      <span style={{ color: MUTED }}>{k}</span>
      <span style={{ color: NAVY, fontWeight: 600, textAlign: "right", maxWidth: "65%", wordBreak: "break-word" }}>{v}</span>
    </div>
  );
}

function FullMsg({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ padding: 32, textAlign: "center", color: MUTED, fontFamily: "Inter, sans-serif" }}>{children}</div>
  );
}