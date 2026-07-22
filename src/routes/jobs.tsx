import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState, useRef } from "react";
import { ArrowLeft, Briefcase, X, Send } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "../lib/supabaseClient";

export const Route = createFileRoute("/jobs")({
  head: () => ({
    meta: [
      { title: "Jobs — DSM by EveryDriver" },
      { name: "description", content: "Browse and accept open driving instructor job offers in your area." },
    ],
  }),
  component: JobsPage,
});

const POPPINS = { fontFamily: "Inter, sans-serif" } as const;
const NAVY = "#0B1F3A";
const BLUE = "#1877D6";
const GREEN = "#0F9D58";
const AMBER = "#B5661E";
const GREY = "#6B7280";

interface JobOffer {
  id: string;
  pupil_name: string | null;
  transmission: string | null;
  course_hours: number | null;
  preferred_timing: string[] | null;
  preferred_days: string[] | null;
  offered_rate: number | null;
  postcode_area: string | null;
  centre_lat: number | null;
  centre_lng: number | null;
  status: string;
  created_at: string;
  updated_at?: string | null;
  notes?: string | null;
  preferred_start_date?: string | null;
  amount_paid?: number | null;
  payment_method?: string | null;
  special_requirements?: string | null;
  pupil_phone?: string | null;
  pupil_email?: string | null;
  contact_released?: boolean | null;
  declined_by?: string[] | null;
  claimed_by?: string | null;
  claimed_at?: string | null;
  paid_at?: string | null;
  test_booked?: boolean | null;
  test_date?: string | null;
  test_time?: string | null;
  test_centre?: string | null;
  wants_swap_list?: boolean | null;
}

function relTime(iso: string): string {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const s = Math.max(1, Math.floor((now - then) / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}

interface CoverageArea {
  centre_lat: number;
  centre_lng: number;
  radius_miles: number;
}

interface JobMessage {
  id: string;
  job_offer_id: string;
  sender_type: string;
  sender_id: string | null;
  message: string;
  created_at: string;
}

interface InstructorPrefs {
  working_days: string[];
  working_hours_start: string; // HH:MM
  working_hours_end: string;
}

type MatchLevel = "good" | "possible" | "none";

function normalizeDay(d: string): string {
  const s = d.trim().toLowerCase().slice(0, 3);
  return s;
}

function haversineMiles(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 3958.7613; // Earth radius in miles
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
}

// Returns min distance in miles from any coverage centre, or null if no coverage.
function distanceToCoverage(job: JobOffer, coverage: CoverageArea[]): number | null {
  if (job.centre_lat == null || job.centre_lng == null) return null;
  if (coverage.length === 0) return null;
  let best = Infinity;
  for (const c of coverage) {
    const d = haversineMiles(c.centre_lat, c.centre_lng, job.centre_lat, job.centre_lng);
    if (d < best) best = d;
  }
  return best;
}

function withinAnyCoverage(job: JobOffer, coverage: CoverageArea[]): boolean {
  if (job.centre_lat == null || job.centre_lng == null) return false;
  return coverage.some((c) => {
    const d = haversineMiles(c.centre_lat, c.centre_lng, job.centre_lat!, job.centre_lng!);
    return d <= c.radius_miles;
  });
}

function computeHoursDaysMatch(job: JobOffer, prefs: InstructorPrefs | null): MatchLevel {
  if (!prefs) return "none";
  const workDays = new Set((prefs.working_days ?? []).map(normalizeDay));
  const jobDays = (job.preferred_days ?? []).map(normalizeDay);
  const daysOverlap = jobDays.length === 0 ? null : jobDays.some((d) => workDays.has(d));

  const timings = (job.preferred_timing ?? []).map((t) => t.toLowerCase());
  const [sh] = prefs.working_hours_start.split(":").map(Number);
  const [eh] = prefs.working_hours_end.split(":").map(Number);
  let timingOk: boolean | null = null;
  if (timings.length > 0) {
    timingOk = timings.some((timing) => {
      if (timing.includes("evening")) return eh >= 17;
      if (timing.includes("morning")) return sh <= 10;
      if (timing.includes("afternoon")) return sh <= 14 && eh >= 15;
      if (timing.includes("weekend")) return workDays.has("sat") || workDays.has("sun");
      return true;
    });
  }

  const conds = [daysOverlap, timingOk].filter((c) => c !== null) as boolean[];
  if (conds.length === 0) return "possible";
  if (conds.every(Boolean)) return "good";
  if (conds.some(Boolean)) return "possible";
  return "none";
}

function JobsPage() {
  const [uid, setUid] = useState<string | null>(null);
  const [jobs, setJobs] = useState<JobOffer[] | null>(null);
  const [claimedJobs, setClaimedJobs] = useState<JobOffer[] | null>(null);
  const [activeTab, setActiveTab] = useState<"open" | "claimed">("open");
  const [prefs, setPrefs] = useState<InstructorPrefs | null>(null);
  const [coverage, setCoverage] = useState<CoverageArea[]>([]);
  const [threadJob, setThreadJob] = useState<JobOffer | null>(null);
  const [detailJob, setDetailJob] = useState<JobOffer | null>(null);

  const load = async () => {
    const { data: auth } = await supabase.auth.getUser();
    const id = auth?.user?.id ?? null;
    setUid(id);
    if (!id) {
      setJobs([]);
      setClaimedJobs([]);
      return;
    }
    const { data: instr } = await supabase
      .from("instructors")
      .select("working_days, working_hours_start, working_hours_end")
      .eq("id", id)
      .maybeSingle();
    if (instr) {
      setPrefs({
        working_days: (instr.working_days as string[] | null) ?? ["Monday","Tuesday","Wednesday","Thursday","Friday"],
        working_hours_start: instr.working_hours_start ? String(instr.working_hours_start).slice(0, 5) : "09:00",
        working_hours_end: instr.working_hours_end ? String(instr.working_hours_end).slice(0, 5) : "18:00",
      });
    }

    const { data: covData } = await supabase
      .from("instructor_coverage_areas")
      .select("centre_lat, centre_lng, radius_miles")
      .eq("instructor_id", id);
    const cov: CoverageArea[] = ((covData ?? []) as any[])
      .filter((c) => c.centre_lat != null && c.centre_lng != null && c.radius_miles != null)
      .map((c) => ({
        centre_lat: Number(c.centre_lat),
        centre_lng: Number(c.centre_lng),
        radius_miles: Number(c.radius_miles),
      }));
    setCoverage(cov);

    // Open jobs
    const { data, error } = await supabase
      .from("job_offers")
      .select("*")
      .eq("status", "open")
      .order("created_at", { ascending: false });
    if (error) {
      setJobs([]);
    } else {
      const all = (data ?? []) as JobOffer[];
      // Filter out jobs with coords beyond every coverage radius; keep null-coord jobs unfiltered.
      const filtered = all.filter((job) => {
        if (job.centre_lat == null || job.centre_lng == null) return true;
        if (cov.length === 0) return true;
        return cov.some(
          (c) => haversineMiles(c.centre_lat, c.centre_lng, job.centre_lat!, job.centre_lng!) <= c.radius_miles,
        );
      });
      // Filter out jobs already declined by this instructor.
      const filtered2 = filtered.filter((job) => !(job.declined_by ?? []).includes(id));
      setJobs(filtered2);
    }

    // Claimed jobs
    const { data: claimed, error: claimedError } = await supabase
      .from("job_offers")
      .select("*")
      .eq("claimed_by", id)
      .order("claimed_at", { ascending: false });
    if (claimedError) {
      setClaimedJobs([]);
    } else {
      setClaimedJobs((claimed ?? []) as JobOffer[]);
    }
  };

  useEffect(() => { load(); }, []);

  const accept = async (job: JobOffer) => {
    if (!uid) {
      toast.error("Please sign in");
      return;
    }
    const { data, error } = await supabase
      .from("job_offers")
      .update({ status: "claimed", claimed_by: uid, claimed_at: new Date().toISOString() })
      .eq("id", job.id)
      .eq("status", "open")
      .select("id");
    if (error) {
      toast.error("Could not claim job");
      return;
    }
    if (!data || data.length === 0) {
      toast("Someone else already claimed this job");
      load();
      return;
    }

    // Create a Ryft payment link and text it to the pupil.
    try {
      const worth = (job.course_hours ?? 0) * (job.offered_rate ?? 0);
      const alreadyPaid = job.amount_paid != null ? Number(job.amount_paid) : 0;
      const outstanding = Math.max(0, worth - alreadyPaid);
      const amountPence = Math.round(outstanding * 100);

      if (amountPence < 3) {
        toast.success("Job claimed! No outstanding balance — no payment link needed.");
        load();
        return;
      }

      const { data: paymentData, error: payError } = await supabase.functions.invoke("create-ryft-payment", {
        body: {
          amount: amountPence,
          currency: "GBP",
          metadata: { jobOfferId: job.id, pupil_email: job.pupil_email, pupil_name: job.pupil_name },
        },
      });
      if (payError || !paymentData?.paymentUrl) {
        toast.error("Job claimed, but payment link failed");
        load();
        return;
      }
      const paymentUrl = paymentData.paymentUrl as string;
      const pupilName = job.pupil_name || "there";

      if (job.pupil_phone) {
        const message = `Hi ${pupilName}, thanks for your interest! To confirm your driving course, please complete payment here: ${paymentUrl}`;
        await supabase.from("sms_queue").insert({
          instructor_id: uid,
          pupil_phone: job.pupil_phone,
          message,
        });
        toast.success(`Job claimed! Payment link sent to ${pupilName}.`);
      } else {
        toast.success("Job claimed! No pupil phone on file — share the payment link manually.");
      }
    } catch {
      toast.error("Job claimed, but sending payment link failed");
    }
    load();
  };

  return (
    <div className="min-h-screen pb-24 pb-safe" style={{ ...POPPINS, backgroundColor: "#DCE4F0" }}>
      {/* Header */}
      <div
        className="sticky top-0 z-30"
        style={{ backgroundColor: NAVY }}
      >
        <div
          className="flex items-center"
          style={{
            paddingTop: "calc(12px + env(safe-area-inset-top, 0px))",
            paddingBottom: 12,
            paddingLeft: 12,
            paddingRight: 12,
            gap: 8,
          }}
        >
          <Link to="/home" className="p-1 -ml-1">
            <ArrowLeft size={22} color="#FFFFFF" />
          </Link>
          <div className="text-[16px] font-semibold text-white" style={POPPINS}>
            Jobs
          </div>
          <div className="ml-auto text-[12px] text-white/70" style={POPPINS}>
            {activeTab === "open" ? `${jobs?.length ?? 0} open` : `${claimedJobs?.length ?? 0} claimed`}
          </div>
        </div>

        {/* Tabs */}
        <div
          style={{
            display: "flex",
            background: "#FFFFFF",
            padding: "4px 12px 0",
            gap: 16,
            borderBottom: "1px solid #E5E7EB",
          }}
        >
          {(["open", "claimed"] as const).map((tab) => {
            const active = activeTab === tab;
            return (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                style={{
                  background: "transparent",
                  border: "none",
                  borderBottom: `2px solid ${active ? BLUE : "transparent"}`,
                  padding: "10px 4px",
                  fontSize: 14,
                  fontWeight: 600,
                  color: active ? BLUE : GREY,
                  cursor: "pointer",
                  textTransform: "capitalize",
                }}
              >
                {tab}
              </button>
            );
          })}
        </div>
      </div>

      {/* List */}
      {activeTab === "open" ? (
        jobs === null ? (
          <div className="p-8 text-center text-[13px]" style={{ color: GREY, ...POPPINS }}>Loading…</div>
        ) : jobs.length === 0 ? (
          <div className="p-10 text-center" style={POPPINS}>
            <Briefcase size={36} color="#9CA3AF" style={{ margin: "0 auto 12px" }} />
            <div className="text-[14px] font-semibold text-[#0B1F3A]">No open jobs right now</div>
            <div className="text-[12px] mt-1" style={{ color: GREY }}>
              Check back later — new pupil enquiries appear here.
            </div>
          </div>
        ) : (
          <div style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
            {jobs.map((job) => {
              const hoursDays = computeHoursDaysMatch(job, prefs);
              const distanceMi = distanceToCoverage(job, coverage);
              const inRadius = withinAnyCoverage(job, coverage);
              const hasCoords = job.centre_lat != null && job.centre_lng != null;
              const distanceKnown = hasCoords && coverage.length > 0;
              const hoursDaysGood = hoursDays === "good";

              let badge: { label: string; color: string; bg: string } | null = null;
              if (!distanceKnown) {
                if (hoursDaysGood) badge = { label: "Good schedule", color: GREEN, bg: "#E5F5EC" };
                else if (hoursDays === "possible") badge = { label: "Possible schedule fit", color: AMBER, bg: "#FDF2E4" };
              } else {
                const distText = `${distanceMi!.toFixed(1)} mi`;
                if (hoursDaysGood && inRadius) badge = { label: `Good match · ${distText}`, color: GREEN, bg: "#E5F5EC" };
                else if (hoursDaysGood) badge = { label: `Fits schedule · ${distText} away`, color: AMBER, bg: "#FDF2E4" };
                else if (inRadius) badge = { label: `Nearby · ${distText} away`, color: AMBER, bg: "#FDF2E4" };
              }

              const worth = job.course_hours != null && job.offered_rate != null
                ? Number(job.course_hours) * Number(job.offered_rate)
                : null;

              return (
                <div
                  key={job.id}
                  onClick={() => setDetailJob(job)}
                  style={{
                    background: "#FFFFFF",
                    borderRadius: 14,
                    boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
                    overflow: "hidden",
                    cursor: "pointer",
                  }}
                >
                  <div
                    style={{
                      background: GREEN,
                      padding: "10px 16px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <div style={{ fontSize: 11, fontWeight: 700, color: "#FFFFFF" }}>
                      JOB OFFER · Posted {relTime(job.created_at)}
                    </div>
                    {worth != null && (
                      <div style={{ fontSize: 16, fontWeight: 700, color: "#FFFFFF" }}>
                        £{worth.toFixed(2)}
                      </div>
                    )}
                  </div>

                  <div style={{ padding: 16 }}>
                    <div style={{ fontSize: 16, fontWeight: 700, color: NAVY }}>
                      {job.pupil_name || "New pupil"} · {job.postcode_area}
                    </div>
                    <div style={{ fontSize: 12, color: GREY, marginTop: 2 }}>
                      {[
                        job.transmission,
                        job.course_hours ? `${job.course_hours} hrs` : null,
                        job.offered_rate != null ? `£${Number(job.offered_rate).toFixed(2)}/hr` : null,
                        distanceMi != null ? `${distanceMi.toFixed(1)} mi away` : null,
                        job.preferred_timing?.join(", "),
                      ].filter(Boolean).join(" · ")}
                    </div>

                    {badge && (
                      <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
                        <div style={{
                          fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.3,
                          color: badge.color, background: badge.bg, padding: "4px 8px", borderRadius: 999, whiteSpace: "nowrap",
                        }}>
                          {badge.label}
                        </div>
                      </div>
                    )}

                    <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                      <button
                        type="button"
                        onClick={async (e) => {
                          e.stopPropagation();
                          if (!uid) return;
                          await supabase
                            .from("job_offers")
                            .update({ declined_by: [...(job.declined_by ?? []), uid] })
                            .eq("id", job.id);
                          setJobs((prev) => (prev ?? []).filter((j) => j.id !== job.id));
                        }}
                        style={{
                          background: "#F3F4F6",
                          color: NAVY,
                          height: 42,
                          borderRadius: 10,
                          padding: "0 12px",
                          border: "none",
                          fontSize: 13,
                          fontWeight: 600,
                          cursor: "pointer",
                          whiteSpace: "nowrap",
                        }}
                      >
                        Decline
                      </button>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setDetailJob(job); }}
                        style={{
                          background: NAVY,
                          color: "#FFF",
                          height: 42,
                          borderRadius: 10,
                          padding: "0 12px",
                          border: "none",
                          fontSize: 13,
                          fontWeight: 600,
                          cursor: "pointer",
                          whiteSpace: "nowrap",
                          flex: 1,
                        }}
                      >
                        More details
                      </button>
                    </div>
                  </div>
                </div>
              );

            })}
          </div>
        )
      ) : (
        claimedJobs === null ? (
          <div className="p-8 text-center text-[13px]" style={{ color: GREY, ...POPPINS }}>Loading…</div>
        ) : claimedJobs.length === 0 ? (
          <div className="p-10 text-center" style={POPPINS}>
            <Briefcase size={36} color="#9CA3AF" style={{ margin: "0 auto 12px" }} />
            <div className="text-[14px] font-semibold text-[#0B1F3A]">No claimed jobs yet</div>
            <div className="text-[12px] mt-1" style={{ color: GREY }}>
              Jobs you accept will appear here.
            </div>
          </div>
        ) : (
          <div style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
            {claimedJobs.map((job) => {
              const worth = job.course_hours != null && job.offered_rate != null
                ? Number(job.course_hours) * Number(job.offered_rate)
                : null;

              let statusBadge: { label: string; color: string; bg: string };
              if (job.status === "cancelled") {
                statusBadge = { label: "Cancelled", color: "#CC2229", bg: "#FDE7E9" };
              } else if (job.contact_released) {
                statusBadge = { label: "Paid", color: GREEN, bg: "#E5F5EC" };
              } else {
                statusBadge = { label: "Awaiting payment", color: AMBER, bg: "#FDF2E4" };
              }

              const updatedAfterClaimed =
                job.status !== "cancelled" &&
                job.updated_at &&
                job.claimed_at &&
                new Date(job.updated_at) > new Date(job.claimed_at);

              return (
                <div
                  key={job.id}
                  onClick={() => setDetailJob(job)}
                  style={{
                    background: "#FFFFFF",
                    borderRadius: 14,
                    boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
                    overflow: "hidden",
                    cursor: "pointer",
                  }}
                >
                  <div
                    style={{
                      background: GREEN,
                      padding: "10px 16px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <div style={{ fontSize: 11, fontWeight: 700, color: "#FFFFFF" }}>
                      CLAIMED JOB · Claimed {job.claimed_at ? relTime(job.claimed_at) : "—"}
                    </div>
                    {worth != null && (
                      <div style={{ fontSize: 16, fontWeight: 700, color: "#FFFFFF" }}>
                        £{worth.toFixed(2)}
                      </div>
                    )}
                  </div>

                  <div style={{ padding: 16 }}>
                    <div style={{ fontSize: 16, fontWeight: 700, color: NAVY }}>
                      {job.pupil_name || "New pupil"} · {job.postcode_area}
                    </div>
                    <div style={{ fontSize: 12, color: GREY, marginTop: 2 }}>
                      {[
                        job.transmission,
                        job.course_hours ? `${job.course_hours} hrs` : null,
                        job.offered_rate != null ? `£${Number(job.offered_rate).toFixed(2)}/hr` : null,
                        job.preferred_timing?.join(", "),
                      ].filter(Boolean).join(" · ")}
                    </div>

                    <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
                      <div
                        style={{
                          fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.3,
                          color: statusBadge.color, background: statusBadge.bg,
                          padding: "4px 8px", borderRadius: 999, whiteSpace: "nowrap",
                        }}
                      >
                        {statusBadge.label}
                      </div>
                      {updatedAfterClaimed && (
                        <div
                          style={{
                            fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.3,
                            color: BLUE, background: "#E5F0FC",
                            padding: "4px 8px", borderRadius: 999, whiteSpace: "nowrap",
                          }}
                        >
                          Updated
                        </div>
                      )}
                    </div>

                    {job.contact_released && (job.pupil_phone || job.pupil_email) && (
                      <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 4 }}>
                        {job.pupil_phone && (
                          <div style={{ fontSize: 13, color: NAVY, fontWeight: 600 }}>
                            {job.pupil_phone}
                          </div>
                        )}
                        {job.pupil_email && (
                          <div style={{ fontSize: 13, color: NAVY, fontWeight: 600 }}>
                            {job.pupil_email}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}

      {detailJob && (
        <JobDetailSheet
          job={detailJob}
          onClose={() => setDetailJob(null)}
          onAccept={() => { accept(detailJob); setDetailJob(null); }}
          onDecline={async () => {
            if (!uid) return;
            await supabase
              .from("job_offers")
              .update({ declined_by: [...(detailJob.declined_by ?? []), uid] })
              .eq("id", detailJob.id);
            setJobs((prev) => (prev ?? []).filter((j) => j.id !== detailJob.id));
            setDetailJob(null);
          }}
          onOpenThread={() => { setThreadJob(detailJob); setDetailJob(null); }}
        />
      )}


      {threadJob && (
        <JobThread
          job={threadJob}
          uid={uid}
          onClose={() => setThreadJob(null)}
        />
      )}
    </div>
  );
}

function JobThread({ job, uid, onClose }: { job: JobOffer; uid: string | null; onClose: () => void }) {
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
      sender_type: "instructor",
      sender_id: uid,
      message: text,
    });
    if (error) {
      setSending(false);
      toast.error("Message failed to send");
      return;
    }

    const { data: adminRows } = await supabase.from("admin_users").select("user_id");
    if (adminRows && adminRows.length > 0) {
      const pupilName = job.pupil_name || "Job enquiry";
      const notifications = adminRows.map((admin) => ({
        instructor_id: admin.user_id,
        title: "New message",
        body: `${pupilName} — job offer message`,
        type: "job_offer_message",
        read: false,
        reference_id: job.id,
        reference_type: "job_offer",
      }));
      await supabase.from("instructor_notifications").insert(notifications);
    }

    setSending(false);
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
        <div style={{
          display: "flex", alignItems: "center", padding: "14px 16px",
          borderBottom: "1px solid #E5E7EB", background: "#FFFFFF",
          borderTopLeftRadius: 16, borderTopRightRadius: 16,
        }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: NAVY }}>
              {job.pupil_name || "Job enquiry"}
            </div>
            <div style={{ fontSize: 11, color: GREY }}>
              {[job.postcode_area, job.preferred_timing?.join(", ")].filter(Boolean).join(" · ")}
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
              No messages yet. Say hello!
            </div>
          ) : (
            messages.map((m) => {
              const mine = m.sender_type === "instructor";
              return (
                <div key={m.id} style={{ display: "flex", justifyContent: mine ? "flex-end" : "flex-start" }}>
                  <div style={{
                    maxWidth: "78%",
                    background: mine ? BLUE : "#FFFFFF",
                    color: mine ? "#FFFFFF" : NAVY,
                    borderRadius: 14,
                    padding: "8px 12px",
                    fontSize: 14,
                    boxShadow: mine ? "none" : "0 1px 2px rgba(0,0,0,0.05)",
                  }}>
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

        <div style={{
          display: "flex", gap: 8, padding: 12, borderTop: "1px solid #E5E7EB",
          background: "#FFFFFF", paddingBottom: "calc(12px + env(safe-area-inset-bottom, 0px))",
        }}>
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") send(); }}
            placeholder="Type a message…"
            style={{
              flex: 1, background: "#F3F4F6", border: "none", borderRadius: 20,
              padding: "10px 14px", fontSize: 16, outline: "none", ...POPPINS,
            }}
          />
          <button
            onClick={send}
            disabled={!draft.trim() || sending}
            style={{
              background: BLUE, color: "#FFF", border: "none", borderRadius: 20,
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

function HistoryTimeline({ job }: { job: JobOffer }) {
  const entries: { label: string; time: string | null | undefined }[] = [
    { label: "Job created", time: job.created_at },
    { label: "Claimed by you", time: job.claimed_at },
    { label: "Payment received", time: job.paid_at },
  ];

  if (job.status === "cancelled") {
    entries.push({ label: "Cancelled", time: job.updated_at });
  }

  const visible = entries
    .filter((e) => !!e.time)
    .map((e) => ({ ...e, time: e.time! }))
    .sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());

  if (visible.length === 0) return null;

  const fmt = (iso: string) => {
    const d = new Date(iso);
    return `${d.toLocaleDateString(undefined, { day: "numeric", month: "short" })} · ${d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}`;
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
      {visible.map((e, idx) => {
        const last = idx === visible.length - 1;
        return (
          <div key={e.label + e.time} style={{ display: "flex", gap: 10 }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 10 }}>
              <div style={{ width: 8, height: 8, borderRadius: 999, background: BLUE, marginTop: 5 }} />
              {!last && <div style={{ width: 2, flex: 1, background: "#E5E7EB", marginTop: 4 }} />}
            </div>
            <div style={{ flex: 1, paddingBottom: last ? 0 : 12 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: NAVY }}>{e.label}</div>
              <div style={{ fontSize: 11, color: GREY, marginTop: 1 }}>{fmt(e.time)}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function JobDetailSheet({
  job,
  onClose,
  onAccept,
  onDecline,
  onOpenThread,
}: {
  job: JobOffer;
  onClose: () => void;
  onAccept: () => void;
  onDecline: () => void;
  onOpenThread: () => void;
}) {
  const worth = job.course_hours != null && job.offered_rate != null
    ? Number(job.course_hours) * Number(job.offered_rate)
    : null;
  const amountPaid = job.amount_paid != null ? Number(job.amount_paid) : 0;

  const Row = ({ label, value }: { label: string; value: React.ReactNode }) => (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "10px 0", borderBottom: "1px solid #F1F3F7" }}>
      <div style={{ fontSize: 12, color: GREY, fontWeight: 500 }}>{label}</div>
      <div style={{ fontSize: 13, color: NAVY, fontWeight: 600, textAlign: "right", maxWidth: "60%", wordBreak: "break-word" }}>{value}</div>
    </div>
  );

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
          background: "#FFFFFF", borderTopLeftRadius: 16, borderTopRightRadius: 16,
          maxHeight: "90vh", display: "flex", flexDirection: "column", ...POPPINS,
        }}
      >
        <div style={{
          display: "flex", alignItems: "center", padding: "14px 16px",
          borderBottom: "1px solid #E5E7EB",
        }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: NAVY }}>
              {job.pupil_name || "New pupil"}
            </div>
            <div style={{ fontSize: 11, color: GREY, marginTop: 2 }}>
              Posted {relTime(job.created_at)}
            </div>
          </div>
          <button onClick={onClose} style={{ padding: 6, background: "transparent", border: "none", cursor: "pointer" }}>
            <X size={20} color={GREY} />
          </button>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "8px 16px 16px" }}>
          <Row label="Area" value={job.postcode_area || "—"} />
          <Row label="Transmission" value={job.transmission || "—"} />
          <Row label="Course hours" value={job.course_hours != null ? `${job.course_hours} hrs` : "—"} />
          <Row label="Preferred timing" value={job.preferred_timing?.length ? job.preferred_timing.join(", ") : "—"} />
          <Row label="Preferred start" value={job.preferred_start_date ? new Date(job.preferred_start_date).toLocaleDateString() : "—"} />
          <Row label="Rate" value={job.offered_rate != null ? `£${Number(job.offered_rate).toFixed(2)}/hr` : "Rate TBC"} />
          <Row label="Worth" value={worth != null ? <span style={{ color: GREEN }}>£{worth.toFixed(2)}</span> : "—"} />
          {amountPaid > 0 && (
            <>
              <Row label="Amount paid" value={`£${amountPaid.toFixed(2)}`} />
              <Row label="Payment method" value={job.payment_method || "—"} />
            </>
          )}
          {job.special_requirements && (
            <Row label="Special requirements" value={job.special_requirements} />
          )}
          {job.contact_released ? (
            <>
              {job.pupil_phone && <Row label="Phone" value={job.pupil_phone} />}
              {job.pupil_email && <Row label="Email" value={job.pupil_email} />}
            </>
          ) : (
            (job.pupil_phone || job.pupil_email) && (
              <div style={{ padding: "12px 0", fontSize: 12, color: GREY, fontStyle: "italic" }}>
                Contact details available once payment is received
              </div>
            )
          )}

          {job.test_booked && (
            <div style={{ marginTop: 16, padding: 12, background: "#F3F8FF", borderRadius: 10, border: "1px solid #CCE0FA" }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: BLUE, textTransform: "uppercase", letterSpacing: 0.3, marginBottom: 6 }}>
                Test booked
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {job.test_date && (
                  <div style={{ fontSize: 13, color: NAVY, fontWeight: 600 }}>
                    {new Date(job.test_date).toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" })}
                  </div>
                )}
                {job.test_time && (
                  <div style={{ fontSize: 13, color: GREY }}>{job.test_time}</div>
                )}
                {job.test_centre && (
                  <div style={{ fontSize: 13, color: GREY }}>{job.test_centre}</div>
                )}
              </div>
            </div>
          )}

          {job.wants_swap_list && (
            <div style={{ marginTop: 12, fontSize: 12, color: GREY, fontStyle: "italic" }}>
              Pupil wants to join the swap list.
            </div>
          )}

          <div style={{ marginTop: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: NAVY, textTransform: "uppercase", letterSpacing: 0.3, marginBottom: 10 }}>
              History
            </div>
            <HistoryTimeline job={job} />
          </div>

          <button
            onClick={onOpenThread}
            style={{
              marginTop: 20,
              width: "100%",
              background: "#F3F8FF",
              color: BLUE,
              border: "1px solid #CCE0FA",
              borderRadius: 10,
              padding: "12px 16px",
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
              textAlign: "center",
              ...POPPINS,
            }}
          >
            Message admin
          </button>
        </div>

        <div style={{
          display: "flex", gap: 8, padding: 12, borderTop: "1px solid #E5E7EB",
          paddingBottom: "calc(12px + env(safe-area-inset-bottom, 0px))",
        }}>
          <button
            onClick={onDecline}
            style={{
              flex: 1, background: "#F3F4F6", color: NAVY, border: "none", borderRadius: 10,
              padding: "12px 16px", fontSize: 14, fontWeight: 600, cursor: "pointer",
            }}
          >
            Decline
          </button>
          <button
            onClick={onAccept}
            style={{
              flex: 1, background: BLUE, color: "#FFF", border: "none", borderRadius: 10,
              padding: "12px 16px", fontSize: 14, fontWeight: 700, cursor: "pointer",
            }}
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}

