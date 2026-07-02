import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, BookOpen, Mic, MicOff, Send, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "../lib/supabaseClient";

export const Route = createFileRoute("/reflective-log/$pupilId")({
  head: () => ({ meta: [{ title: "Reflective log — DSM by EveryDriver" }] }),
  component: ReflectiveLogPage,
});

const INTER = { fontFamily: "Inter, sans-serif" } as const;

type LogRow = {
  id: string;
  pupil_id: string;
  instructor_id: string | null;
  lesson_id: string | null;
  what_went_well: string | null;
  needs_practice: string | null;
  goals: string | null;
  instructor_response: string | null;
  responded_at: string | null;
  created_at: string;
};

type LessonOpt = { id: string; date: string | null; start_time: string | null };

function formatDateTime(iso: string) {
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return { date: `${dd}/${mm}/${yyyy}`, time: `${hh}:${mi}` };
}

// Minimal Web Speech API hook
function useMic(onResult: (text: string) => void) {
  const recogRef = useRef<any>(null);
  const [listening, setListening] = useState(false);

  const start = () => {
    const SR: any =
      (typeof window !== "undefined" && ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)) || null;
    if (!SR) {
      toast.error("Voice input not supported in this browser");
      return;
    }
    const r = new SR();
    r.continuous = false;
    r.interimResults = false;
    r.lang = "en-GB";
    r.onresult = (e: any) => {
      const t = e.results?.[0]?.[0]?.transcript ?? "";
      if (t) onResult(t);
    };
    r.onend = () => setListening(false);
    r.onerror = () => setListening(false);
    recogRef.current = r;
    setListening(true);
    try {
      r.start();
    } catch {
      setListening(false);
    }
  };
  const stop = () => {
    try {
      recogRef.current?.stop();
    } catch {}
    setListening(false);
  };
  return { listening, start, stop };
}

function MicTextarea({
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
  const { listening, start, stop } = useMic((t) => onChange(value ? `${value} ${t}` : t));
  return (
    <div className="relative">
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="w-full text-[14px] px-3 py-2 pr-11 rounded-lg border outline-none"
        style={{ borderColor: "#E2E6ED", ...INTER }}
      />
      <button
        type="button"
        onClick={listening ? stop : start}
        aria-label={listening ? "Stop dictation" : "Start dictation"}
        className="absolute right-2 top-2 inline-flex items-center justify-center rounded-full"
        style={{
          width: 32,
          height: 32,
          backgroundColor: listening ? "#7C3AED" : "#F3F4F6",
          color: listening ? "#FFFFFF" : "#0B1F3A",
          border: "none",
        }}
      >
        {listening ? <MicOff size={16} /> : <Mic size={16} />}
      </button>
    </div>
  );
}

function ReflectiveLogPage() {
  const { pupilId } = Route.useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [pupilName, setPupilName] = useState<string>("");
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [instructorId, setInstructorId] = useState<string | null>(null);

  const [respondingId, setRespondingId] = useState<string | null>(null);
  const [responseText, setResponseText] = useState("");
  const [savingResponse, setSavingResponse] = useState(false);

  const [addOpen, setAddOpen] = useState(false);
  const [went, setWent] = useState("");
  const [practice, setPractice] = useState("");
  const [goals, setGoals] = useState("");
  const [lessonId, setLessonId] = useState<string>("");
  const [lessons, setLessons] = useState<LessonOpt[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id ?? null;
      setInstructorId(uid);

      const [{ data: p }, { data: l }, { data: ls }] = await Promise.all([
        supabase.from("pupils").select("name, first_name, last_name").eq("id", pupilId).maybeSingle(),
        supabase
          .from("reflective_logs")
          .select("*")
          .eq("pupil_id", pupilId)
          .order("created_at", { ascending: false }),
        supabase
          .from("lessons")
          .select("id, date, start_time")
          .eq("pupil_id", pupilId)
          .order("date", { ascending: false })
          .limit(30),
      ]);
      if (cancelled) return;
      const nm =
        (p as any)?.name ||
        [((p as any)?.first_name || "").trim(), ((p as any)?.last_name || "").trim()].filter(Boolean).join(" ") ||
        "Pupil";
      setPupilName(nm);
      setLogs(((l as any[]) ?? []) as LogRow[]);
      setLessons(((ls as any[]) ?? []) as LessonOpt[]);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [pupilId]);

  const sortedLogs = useMemo(
    () => [...logs].sort((a, b) => (b.created_at || "").localeCompare(a.created_at || "")),
    [logs],
  );

  const submitResponse = async (logId: string) => {
    const text = responseText.trim();
    if (!text) {
      toast.error("Please write a response");
      return;
    }
    setSavingResponse(true);
    const nowIso = new Date().toISOString();
    const { error } = await supabase
      .from("reflective_logs")
      .update({ instructor_response: text, responded_at: nowIso })
      .eq("id", logId);
    setSavingResponse(false);
    if (error) {
      toast.error(error.message || "Could not send response");
      return;
    }
    setLogs((prev) =>
      prev.map((r) => (r.id === logId ? { ...r, instructor_response: text, responded_at: nowIso } : r)),
    );
    setRespondingId(null);
    setResponseText("");
    toast.success("Response sent");
  };

  const submitNewLog = async () => {
    if (!went.trim() && !practice.trim() && !goals.trim()) {
      toast.error("Add at least one section");
      return;
    }
    setSaving(true);
    const payload: any = {
      pupil_id: pupilId,
      instructor_id: instructorId,
      lesson_id: lessonId || null,
      what_went_well: went.trim() || null,
      needs_practice: practice.trim() || null,
      goals: goals.trim() || null,
    };
    const { data, error } = await supabase.from("reflective_logs").insert(payload).select("*").maybeSingle();
    setSaving(false);
    if (error) {
      toast.error(error.message || "Could not save log");
      return;
    }
    if (data) setLogs((prev) => [data as LogRow, ...prev]);
    setWent("");
    setPractice("");
    setGoals("");
    setLessonId("");
    setAddOpen(false);
    toast.success("Log entry saved");
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#FFFFFF", ...INTER }}>
      {/* Top bar */}
      <div
        className="sticky top-0 z-10 px-4 py-3 flex items-center gap-3"
        style={{ backgroundColor: "#0F2044", color: "#FFFFFF" }}
      >
        <button
          type="button"
          onClick={() => navigate({ to: "/pupils/$id", params: { id: pupilId } })}
          className="inline-flex items-center justify-center rounded-full"
          style={{ width: 36, height: 36, backgroundColor: "rgba(255,255,255,0.12)", border: "none", color: "#FFFFFF" }}
          aria-label="Back"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="text-[15px] font-semibold truncate">
          Reflective log — {pupilName || "…"}
        </div>
      </div>

      {loading ? (
        <div className="p-6 text-center text-[13px]" style={{ color: "#6B7280" }}>
          Loading…
        </div>
      ) : sortedLogs.length === 0 ? (
        <div className="px-6 py-16 flex flex-col items-center text-center">
          <BookOpen size={56} color="#7C3AED" />
          <div className="mt-4 text-[16px] font-semibold" style={{ color: "#0B1F3A" }}>
            No reflective logs yet
          </div>
          <div className="mt-2 text-[13px] max-w-[320px]" style={{ color: "#6B7280" }}>
            After each lesson, your pupil can record what went well, what needs more practice, and
            their goals for next time.
          </div>
          <div className="mt-2 text-[12px] max-w-[320px]" style={{ color: "#9CA3AF" }}>
            Pupils complete their reflective log through the EveryDriver portal.
          </div>
        </div>
      ) : (
        <div className="pt-3 pb-2">
          {sortedLogs.map((log) => {
            const { date, time } = formatDateTime(log.created_at);
            const isResponding = respondingId === log.id;
            return (
              <div
                key={log.id}
                style={{
                  backgroundColor: "#FFFFFF",
                  border: "0.5px solid #E2E6ED",
                  borderRadius: 12,
                  padding: 16,
                  marginLeft: 16,
                  marginRight: 16,
                  marginBottom: 8,
                }}
              >
                <div className="flex items-baseline justify-between">
                  <div className="text-[13px] font-semibold" style={{ color: "#0B1F3A" }}>
                    {date}
                  </div>
                  <div className="text-[12px]" style={{ color: "#9CA3AF" }}>
                    {time}
                  </div>
                </div>

                {log.what_went_well && (
                  <div
                    className="mt-3 pl-3 text-[13px]"
                    style={{ borderLeft: "3px solid #10B981", color: "#0B1F3A" }}
                  >
                    <div className="text-[12px] font-semibold mb-1" style={{ color: "#059669" }}>
                      ✅ What went well
                    </div>
                    <div style={{ whiteSpace: "pre-wrap" }}>{log.what_went_well}</div>
                  </div>
                )}

                {log.needs_practice && (
                  <div
                    className="mt-3 pl-3 text-[13px]"
                    style={{ borderLeft: "3px solid #F59E0B", color: "#0B1F3A" }}
                  >
                    <div className="text-[12px] font-semibold mb-1" style={{ color: "#B45309" }}>
                      📈 What needs more practice
                    </div>
                    <div style={{ whiteSpace: "pre-wrap" }}>{log.needs_practice}</div>
                  </div>
                )}

                {log.goals && (
                  <div
                    className="mt-3 pl-3 text-[13px]"
                    style={{ borderLeft: "3px solid #1877D6", color: "#0B1F3A" }}
                  >
                    <div className="text-[12px] font-semibold mb-1" style={{ color: "#1877D6" }}>
                      🎯 Goals for next lesson
                    </div>
                    <div style={{ whiteSpace: "pre-wrap" }}>{log.goals}</div>
                  </div>
                )}

                {log.instructor_response ? (
                  <div
                    className="mt-3 p-3 rounded-lg text-[13px] italic"
                    style={{ backgroundColor: "#0F2044", color: "#FFFFFF" }}
                  >
                    <div className="text-[11px] font-semibold not-italic mb-1" style={{ opacity: 0.7 }}>
                      Your response
                    </div>
                    <div style={{ whiteSpace: "pre-wrap" }}>{log.instructor_response}</div>
                  </div>
                ) : isResponding ? (
                  <div className="mt-3">
                    <MicTextarea
                      value={responseText}
                      onChange={setResponseText}
                      placeholder="Write a response your pupil will see…"
                    />
                    <div className="mt-2 flex gap-2 justify-end">
                      <button
                        type="button"
                        onClick={() => {
                          setRespondingId(null);
                          setResponseText("");
                        }}
                        className="px-3 h-9 rounded-lg text-[13px]"
                        style={{ backgroundColor: "#F3F4F6", color: "#0B1F3A", border: "none" }}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        disabled={savingResponse}
                        onClick={() => submitResponse(log.id)}
                        className="px-3 h-9 rounded-lg text-[13px] text-white inline-flex items-center gap-1"
                        style={{ backgroundColor: "#7C3AED", border: "none", opacity: savingResponse ? 0.7 : 1 }}
                      >
                        <Send size={14} />
                        {savingResponse ? "Sending…" : "Send response"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-3">
                    <button
                      type="button"
                      onClick={() => {
                        setRespondingId(log.id);
                        setResponseText("");
                      }}
                      className="text-[13px] font-medium"
                      style={{ color: "#7C3AED", background: "none", border: "none", padding: 0 }}
                    >
                      Add response
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add log entry */}
      <div className="px-4 pt-2 pb-24">
        <button
          type="button"
          onClick={() => setAddOpen(true)}
          className="w-full inline-flex items-center justify-center gap-2 text-[13px] font-medium"
          style={{
            height: 44,
            borderRadius: 10,
            backgroundColor: "#F3F4F6",
            color: "#0B1F3A",
            border: "none",
          }}
        >
          <BookOpen size={16} color="#7C3AED" />
          Add log entry
        </button>
      </div>

      {/* Bottom sheet */}
      {addOpen && (
        <div
          className="fixed inset-0 z-40 flex items-end"
          style={{ backgroundColor: "rgba(15,32,68,0.45)" }}
          onClick={() => (saving ? null : setAddOpen(false))}
        >
          <div
            className="w-full"
            style={{
              backgroundColor: "#FFFFFF",
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              maxHeight: "85vh",
              overflowY: "auto",
              paddingBottom: 96,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-4 pt-3 pb-2 flex items-center justify-between sticky top-0 bg-white z-10">
              <div className="text-[15px] font-semibold" style={{ color: "#0B1F3A" }}>
                New reflective log
              </div>
              <button
                type="button"
                aria-label="Close"
                onClick={() => setAddOpen(false)}
                className="inline-flex items-center justify-center rounded-full"
                style={{ width: 32, height: 32, backgroundColor: "#F3F4F6", border: "none", color: "#0B1F3A" }}
              >
                <X size={16} />
              </button>
            </div>
            <div className="px-4 pt-2 space-y-4">
              <div>
                <div className="text-[12px] font-semibold mb-1" style={{ color: "#059669" }}>
                  ✅ What went well?
                </div>
                <MicTextarea value={went} onChange={setWent} placeholder="e.g. Confident with roundabouts…" />
              </div>
              <div>
                <div className="text-[12px] font-semibold mb-1" style={{ color: "#B45309" }}>
                  📈 What needs more practice?
                </div>
                <MicTextarea value={practice} onChange={setPractice} placeholder="e.g. Bay parking…" />
              </div>
              <div>
                <div className="text-[12px] font-semibold mb-1" style={{ color: "#1877D6" }}>
                  🎯 Goals for next lesson?
                </div>
                <MicTextarea value={goals} onChange={setGoals} placeholder="e.g. Practise emergency stop…" />
              </div>
              <div>
                <div className="text-[12px] font-semibold mb-1" style={{ color: "#0B1F3A" }}>
                  Link to a lesson (optional)
                </div>
                <select
                  value={lessonId}
                  onChange={(e) => setLessonId(e.target.value)}
                  className="w-full h-10 px-2 rounded-lg border text-[13px] bg-white"
                  style={{ borderColor: "#E2E6ED", color: "#0B1F3A" }}
                >
                  <option value="">— None —</option>
                  {lessons.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.date ?? ""} {l.start_time ? `· ${l.start_time.slice(0, 5)}` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                disabled={saving}
                onClick={submitNewLog}
                className="w-full text-white text-[14px] font-semibold inline-flex items-center justify-center gap-2"
                style={{
                  height: 46,
                  borderRadius: 10,
                  backgroundColor: "#7C3AED",
                  border: "none",
                  opacity: saving ? 0.7 : 1,
                }}
              >
                <BookOpen size={16} />
                {saving ? "Saving…" : "Save log entry"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}