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
  status: string;
  created_at: string;
  notes?: string | null;
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

function computeMatch(job: JobOffer, prefs: InstructorPrefs | null): MatchLevel {
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
  const [prefs, setPrefs] = useState<InstructorPrefs | null>(null);
  const [threadJob, setThreadJob] = useState<JobOffer | null>(null);

  const load = async () => {
    const { data: auth } = await supabase.auth.getUser();
    const id = auth?.user?.id ?? null;
    setUid(id);
    if (!id) {
      setJobs([]);
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

    const { data, error } = await supabase
      .from("job_offers")
      .select("*")
      .eq("status", "open")
      .order("created_at", { ascending: false });
    if (error) {
      setJobs([]);
      return;
    }
    setJobs((data ?? []) as JobOffer[]);
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
    } else {
      toast.success("Job claimed!");
    }
    load();
  };

  return (
    <div className="min-h-screen pb-24 pb-safe" style={{ ...POPPINS, backgroundColor: "#DCE4F0" }}>
      {/* Header */}
      <div
        className="sticky top-0 z-30 flex items-center"
        style={{
          backgroundColor: NAVY,
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
          {jobs?.length ?? 0} open
        </div>
      </div>

      {/* List */}
      {jobs === null ? (
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
            const match = computeMatch(job, prefs);
            const badge =
              match === "good"
                ? { label: "Good match", color: GREEN, bg: "#E5F5EC" }
                : match === "possible"
                ? { label: "Possible match", color: AMBER, bg: "#FDF2E4" }
                : null;
            return (
              <div
                key={job.id}
                onClick={() => setThreadJob(job)}
                style={{
                  background: "#FFFFFF",
                  borderRadius: 12,
                  boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
                  padding: 14,
                  cursor: "pointer",
                }}
              >
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: NAVY }}>
                      {job.pupil_name || "New pupil"}
                    </div>
                    <div style={{ fontSize: 12, color: GREY, marginTop: 2 }}>
                      {[
                        job.postcode_area,
                        job.transmission,
                        job.course_hours ? `${job.course_hours} hrs` : null,
                        job.preferred_timing,
                      ].filter(Boolean).join(" · ")}
                    </div>
                  </div>
                  {badge && (
                    <div style={{
                      fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.3,
                      color: badge.color, background: badge.bg, padding: "4px 8px", borderRadius: 999, whiteSpace: "nowrap",
                    }}>
                      {badge.label}
                    </div>
                  )}
                </div>

                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 12, gap: 8 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: NAVY }}>
                    {job.offered_rate != null ? `£${Number(job.offered_rate).toFixed(2)}/hr` : "Rate TBC"}
                  </div>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); accept(job); }}
                    style={{
                      background: BLUE, color: "#FFF", border: "none", borderRadius: 8,
                      padding: "8px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer",
                    }}
                  >
                    Accept
                  </button>
                </div>
              </div>
            );
          })}
        </div>
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
              {[job.postcode_area, job.preferred_timing].filter(Boolean).join(" · ")}
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
