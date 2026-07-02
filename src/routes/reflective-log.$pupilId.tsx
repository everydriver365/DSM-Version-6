import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, BookOpen, Mic, MicOff, Plus, Send, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "../lib/supabaseClient";

export const Route = createFileRoute("/reflective-log/$pupilId")({
  head: () => ({ meta: [{ title: "Reflective log — DSM by EveryDriver" }] }),
  component: ReflectiveLogPage,
});

const INTER = { fontFamily: "Inter, sans-serif" } as const;

const SUPABASE_URL = "https://bjpqxfrihwjcqprmoqfs.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJqcHF4ZnJpaHdqY3Fwcm1vcWZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE0NzQ4MjEsImV4cCI6MjA5NzA1MDgyMX0.HKlgx3dxP3uxX9wMRRUnfb0IPwaBpFcut_iUgT5XFeo";

type Log = {
  id: string;
  pupil_id: string;
  instructor_id: string | null;
  what_went_well: string | null;
  improvements: string | null;
  next_goals: string | null;
  instructor_response: string | null;
  responded_at: string | null;
  created_at: string;
};

async function restHeaders() {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token ?? SUPABASE_ANON_KEY;
  return {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

function formatLongDate(iso: string) {
  const d = new Date(iso);
  const day = d.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const time = d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  return `${day} at ${time}`;
}

function useMic(onResult: (t: string) => void) {
  const rRef = useRef<any>(null);
  const [listening, setListening] = useState(false);
  const start = () => {
    const SR: any =
      (typeof window !== "undefined" &&
        ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)) ||
      null;
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
    rRef.current = r;
    setListening(true);
    try {
      r.start();
    } catch {
      setListening(false);
    }
  };
  const stop = () => {
    try {
      rRef.current?.stop();
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
          color: listening ? "#FFFFFF" : "#0F2044",
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
  const [pupilName, setPupilName] = useState("");
  const [logs, setLogs] = useState<Log[]>([]);
  const [userId, setUserId] = useState<string | null>(null);

  const [respondingId, setRespondingId] = useState<string | null>(null);
  const [responseText, setResponseText] = useState("");
  const [savingResponse, setSavingResponse] = useState(false);

  const [addOpen, setAddOpen] = useState(false);
  const [went, setWent] = useState("");
  const [improve, setImprove] = useState("");
  const [goals, setGoals] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const headers = await restHeaders();
      const { data: auth } = await supabase.auth.getUser();
      setUserId(auth.user?.id ?? null);

      try {
        const [pRes, lRes] = await Promise.all([
          fetch(
            `${SUPABASE_URL}/rest/v1/pupils?id=eq.${encodeURIComponent(pupilId)}&select=name,first_name,last_name`,
            { headers },
          ),
          fetch(
            `${SUPABASE_URL}/rest/v1/reflective_logs?pupil_id=eq.${encodeURIComponent(pupilId)}&deleted_at=is.null&order=created_at.desc`,
            { headers },
          ),
        ]);
        const pJson = pRes.ok ? await pRes.json() : [];
        const lJson = lRes.ok ? await lRes.json() : [];
        if (cancelled) return;
        const p = Array.isArray(pJson) ? pJson[0] : null;
        const nm =
          p?.name ||
          [(p?.first_name || "").trim(), (p?.last_name || "").trim()].filter(Boolean).join(" ") ||
          "";
        setPupilName(nm);
        setLogs(Array.isArray(lJson) ? (lJson as Log[]) : []);
      } catch {
        if (!cancelled) toast.error("Could not load reflective logs");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [pupilId]);

  const submitResponse = async (logId: string) => {
    const text = responseText.trim();
    if (!text) {
      toast.error("Please write a response");
      return;
    }
    setSavingResponse(true);
    try {
      const headers = await restHeaders();
      const responded_at = new Date().toISOString();
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/reflective_logs?id=eq.${encodeURIComponent(logId)}`,
        {
          method: "PATCH",
          headers: { ...headers, Prefer: "return=representation" },
          body: JSON.stringify({ instructor_response: text, responded_at }),
        },
      );
      if (!res.ok) throw new Error(await res.text());
      setLogs((prev) =>
        prev.map((r) => (r.id === logId ? { ...r, instructor_response: text, responded_at } : r)),
      );
      setRespondingId(null);
      setResponseText("");
      toast.success("Response sent ✓");
    } catch (e: any) {
      toast.error(e?.message || "Could not send response");
    } finally {
      setSavingResponse(false);
    }
  };

  const submitNewLog = async () => {
    if (!went.trim() && !improve.trim() && !goals.trim()) {
      toast.error("Add at least one section");
      return;
    }
    setSaving(true);
    try {
      const headers = await restHeaders();
      const body = {
        pupil_id: pupilId,
        instructor_id: userId,
        what_went_well: went.trim() || null,
        improvements: improve.trim() || null,
        next_goals: goals.trim() || null,
      };
      const res = await fetch(`${SUPABASE_URL}/rest/v1/reflective_logs`, {
        method: "POST",
        headers: { ...headers, Prefer: "return=representation" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(await res.text());
      const created = await res.json();
      const row = Array.isArray(created) ? created[0] : created;
      if (row) setLogs((prev) => [row as Log, ...prev]);
      setWent("");
      setImprove("");
      setGoals("");
      setAddOpen(false);
      toast.success("Log entry saved");
    } catch (e: any) {
      toast.error(e?.message || "Could not save log");
    } finally {
      setSaving(false);
    }
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
          style={{
            width: 36,
            height: 36,
            backgroundColor: "rgba(255,255,255,0.12)",
            border: "none",
            color: "#FFFFFF",
          }}
          aria-label="Back"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="flex flex-col min-w-0">
          <div className="text-[15px] font-semibold truncate">Reflective log</div>
          {pupilName && (
            <div className="text-[12px] truncate" style={{ opacity: 0.8 }}>
              {pupilName}
            </div>
          )}
        </div>
      </div>

      {loading ? (
        <div className="p-6 text-center text-[13px]" style={{ color: "#6B7280" }}>
          Loading…
        </div>
      ) : logs.length === 0 ? (
        <div className="px-6 py-16 flex flex-col items-center text-center">
          <BookOpen className="w-16 h-16 mx-auto mb-4" color="#7C3AED" />
          <div className="text-[16px] font-bold" style={{ color: "#0F2044" }}>
            No reflective logs yet
          </div>
          <div className="mt-2 text-sm text-center max-w-xs mx-auto" style={{ color: "#6B7280" }}>
            After each lesson, pupils record what went well, what to improve, and their goals. You
            can respond to each entry.
          </div>
        </div>
      ) : (
        <div className="p-4">
          {logs.map((log) => {
            const isResponding = respondingId === log.id;
            return (
              <div
                key={log.id}
                style={{
                  backgroundColor: "#FFFFFF",
                  border: "0.5px solid #E2E6ED",
                  borderRadius: 12,
                  padding: 16,
                  marginBottom: 12,
                }}
              >
                <div className="text-xs mb-3" style={{ color: "#6B7280" }}>
                  {formatLongDate(log.created_at)}
                </div>

                {log.what_went_well && (
                  <div
                    className="pl-3 text-[14px]"
                    style={{ borderLeft: "3px solid #10B981", color: "#0F2044", marginBottom: 12 }}
                  >
                    <div className="text-xs font-semibold mb-1" style={{ color: "#059669" }}>
                      ✅ What went well
                    </div>
                    <div style={{ whiteSpace: "pre-wrap" }}>{log.what_went_well}</div>
                  </div>
                )}

                {log.improvements && (
                  <div
                    className="pl-3 text-[14px]"
                    style={{ borderLeft: "3px solid #F59E0B", color: "#0F2044", marginBottom: 12 }}
                  >
                    <div className="text-xs font-semibold mb-1" style={{ color: "#B45309" }}>
                      📈 What to improve
                    </div>
                    <div style={{ whiteSpace: "pre-wrap" }}>{log.improvements}</div>
                  </div>
                )}

                {log.next_goals && (
                  <div
                    className="pl-3 text-[14px]"
                    style={{ borderLeft: "3px solid #1A52A0", color: "#0F2044", marginBottom: 12 }}
                  >
                    <div className="text-xs font-semibold mb-1" style={{ color: "#1A52A0" }}>
                      🎯 Next lesson goals
                    </div>
                    <div style={{ whiteSpace: "pre-wrap" }}>{log.next_goals}</div>
                  </div>
                )}

                {log.instructor_response ? (
                  <div
                    className="rounded-lg mt-3"
                    style={{ backgroundColor: "#0F2044", padding: 12 }}
                  >
                    <div className="text-xs font-semibold" style={{ color: "#FFFFFF", opacity: 0.75 }}>
                      Your response
                    </div>
                    <div
                      className="text-sm italic mt-1"
                      style={{ color: "#FFFFFF", whiteSpace: "pre-wrap" }}
                    >
                      {log.instructor_response}
                    </div>
                    {log.responded_at && (
                      <div className="text-xs mt-2" style={{ color: "#FFFFFF", opacity: 0.6 }}>
                        {formatLongDate(log.responded_at)}
                      </div>
                    )}
                  </div>
                ) : isResponding ? (
                  <div className="mt-3">
                    <MicTextarea
                      value={responseText}
                      onChange={setResponseText}
                      placeholder="Write your response to this log entry..."
                      rows={3}
                    />
                    <div className="mt-2 flex gap-2 justify-end">
                      <button
                        type="button"
                        onClick={() => {
                          setRespondingId(null);
                          setResponseText("");
                        }}
                        className="px-3 h-9 rounded-lg text-[13px]"
                        style={{ backgroundColor: "#F3F4F6", color: "#0F2044", border: "none" }}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        disabled={savingResponse}
                        onClick={() => submitResponse(log.id)}
                        className="px-3 h-9 rounded-lg text-white text-[13px] inline-flex items-center gap-1"
                        style={{
                          backgroundColor: "#0F2044",
                          border: "none",
                          opacity: savingResponse ? 0.7 : 1,
                        }}
                      >
                        <Send size={14} />
                        {savingResponse ? "Sending…" : "Send response"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setRespondingId(log.id);
                      setResponseText("");
                    }}
                    className="text-sm font-medium mt-1"
                    style={{
                      color: "#1A52A0",
                      background: "none",
                      border: "none",
                      padding: 0,
                    }}
                  >
                    Add your response →
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Floating add button */}
      <button
        type="button"
        aria-label="Add log entry"
        onClick={() => setAddOpen(true)}
        className="fixed inline-flex items-center justify-center rounded-full"
        style={{
          right: 20,
          bottom: 24,
          width: 56,
          height: 56,
          backgroundColor: "#7C3AED",
          color: "#FFFFFF",
          border: "none",
          boxShadow: "0 10px 24px rgba(124,58,237,0.35)",
          zIndex: 30,
        }}
      >
        <BookOpen size={22} />
        <Plus size={12} style={{ position: "absolute", right: 12, bottom: 12 }} />
      </button>

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
              <div className="text-[15px] font-semibold" style={{ color: "#0F2044" }}>
                Add log entry
              </div>
              <button
                type="button"
                aria-label="Close"
                onClick={() => setAddOpen(false)}
                className="inline-flex items-center justify-center rounded-full"
                style={{
                  width: 32,
                  height: 32,
                  backgroundColor: "#F3F4F6",
                  border: "none",
                  color: "#0F2044",
                }}
              >
                <X size={16} />
              </button>
            </div>
            <div className="px-4 pt-2 space-y-4">
              <div>
                <div className="text-xs font-semibold mb-1" style={{ color: "#059669" }}>
                  ✅ What went well?
                </div>
                <MicTextarea value={went} onChange={setWent} rows={3} />
              </div>
              <div>
                <div className="text-xs font-semibold mb-1" style={{ color: "#B45309" }}>
                  📈 What to improve?
                </div>
                <MicTextarea value={improve} onChange={setImprove} rows={3} />
              </div>
              <div>
                <div className="text-xs font-semibold mb-1" style={{ color: "#1A52A0" }}>
                  🎯 Goals for next lesson?
                </div>
                <MicTextarea value={goals} onChange={setGoals} rows={3} />
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