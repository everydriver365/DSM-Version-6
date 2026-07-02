import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  Plus,
  ClipboardList,
  GripVertical,
  Pencil,
  Trash2,
  Mic,
  MicOff,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "../lib/supabaseClient";

export const Route = createFileRoute("/intake-questions")({
  head: () => ({
    meta: [
      { title: "Intake questions — DSM by EveryDriver" },
      {
        name: "description",
        content: "Manage the questions new pupils answer at registration.",
      },
    ],
  }),
  component: IntakeQuestionsPage,
});

const POPPINS = { fontFamily: "Inter, sans-serif" } as const;

type QType = "text" | "yes_no" | "multiple_choice" | "number";

type IntakeQuestion = {
  id: string;
  instructor_id: string;
  question: string;
  type: QType;
  options: string[] | null;
  required: boolean;
  active: boolean;
  display_order: number;
  created_at?: string;
};

const TYPE_LABEL: Record<QType, string> = {
  text: "Text",
  yes_no: "Yes/No",
  multiple_choice: "Multiple choice",
  number: "Number",
};

const STARTER_QUESTIONS: { text: string; type: QType; options?: string[] }[] = [
  { text: "Do you have any medical conditions we should be aware of?", type: "text" },
  { text: "Have you had any previous driving lessons?", type: "yes_no" },
  { text: "Do you have your provisional licence?", type: "yes_no" },
  {
    text: "What is your preferred lesson time?",
    type: "multiple_choice",
    options: ["Morning", "Afternoon", "Evening"],
  },
  { text: "How did you hear about us?", type: "text" },
];

function IntakeQuestionsPage() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [questions, setQuestions] = useState<IntakeQuestion[]>([]);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<IntakeQuestion | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<IntakeQuestion | null>(null);
  const dragId = useRef<string | null>(null);

  const SUPABASE_URL = "https://bjpqxfrihwjcqprmoqfs.supabase.co";
  const SUPABASE_ANON_KEY =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJqcHF4ZnJpaHdqY3Fwcm1vcWZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE0NzQ4MjEsImV4cCI6MjA5NzA1MDgyMX0.HKlgx3dxP3uxX9wMRRUnfb0IPwaBpFcut_iUgT5XFeo";

  async function authHeaders(extra: Record<string, string> = {}) {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    return {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...extra,
    };
  }

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      const uid = data.user?.id ?? null;
      setUserId(uid);
      if (uid) await load(uid);
      else setLoading(false);
    })();
  }, []);

  async function load(uid: string) {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/intake_questions?instructor_id=eq.${uid}&deleted_at=is.null&order=display_order.asc`,
        {
          headers: {
            apikey: SUPABASE_ANON_KEY,
            Authorization: `Bearer ${token}`,
          },
        },
      );
      const data = await res.json();
      console.log("[intake] fetch result:", res.status, data);
      if (!res.ok) {
        toast.error("Failed to load questions");
        setQuestions([]);
      } else {
        setQuestions(Array.isArray(data) ? (data as IntakeQuestion[]) : []);
      }
    } catch (e) {
      console.error("[intake] fetch error", e);
      toast.error("Failed to load questions");
      setQuestions([]);
    }
    setLoading(false);
  }

  async function restInsert(payload: Record<string, unknown>) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/intake_questions`, {
      method: "POST",
      headers: await authHeaders({ Prefer: "return=representation" }),
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => null);
    console.log("[intake] insert result:", res.status, data);
    return { ok: res.ok, status: res.status, data };
  }

  async function restUpdate(id: string, payload: Record<string, unknown>) {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/intake_questions?id=eq.${id}`,
      {
        method: "PATCH",
        headers: await authHeaders({ Prefer: "return=representation" }),
        body: JSON.stringify(payload),
      },
    );
    const data = await res.json().catch(() => null);
    console.log("[intake] update result:", res.status, data);
    return { ok: res.ok, status: res.status, data };
  }

  async function restDelete(id: string) {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/intake_questions?id=eq.${id}`,
      { method: "DELETE", headers: await authHeaders() },
    );
    console.log("[intake] delete result:", res.status);
    return { ok: res.ok, status: res.status };
  }

  async function addStarter(s: (typeof STARTER_QUESTIONS)[number]) {
    if (!userId) return;
    const nextOrder = questions.length;
    const r = await restInsert({
      instructor_id: userId,
      question: s.text,
      type: s.type,
      options: s.options ?? null,
      required: false,
      active: true,
      display_order: nextOrder,
    });
    if (!r.ok) {
      toast.error("Could not add question");
      return;
    }
    toast.success("Question added");
    await load(userId);
  }

  async function saveQuestion(q: {
    id?: string;
    question: string;
    type: QType;
    options: string[] | null;
    required: boolean;
  }) {
    if (!userId) return;
    if (q.id) {
      const r = await restUpdate(q.id, {
        question: q.question,
        type: q.type,
        options: q.options,
        required: q.required,
      });
      if (!r.ok) {
        toast.error("Save failed");
        return;
      }
    } else {
      const r = await restInsert({
        instructor_id: userId,
        question: q.question,
        type: q.type,
        options: q.options,
        required: q.required,
        active: true,
        display_order: questions.length,
      });
      if (!r.ok) {
        toast.error("Save failed");
        return;
      }
    }
    toast.success("Saved");
    setSheetOpen(false);
    setEditing(null);
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    const refetchRes = await fetch(
      `${SUPABASE_URL}/rest/v1/intake_questions?instructor_id=eq.${userId}&deleted_at=is.null&order=display_order.asc`,
      {
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${token}`,
        },
      },
    );
    const refetchData = await refetchRes.json();
    console.log("[intake] refetch after save:", refetchRes.status, refetchData);
    setQuestions(Array.isArray(refetchData) ? refetchData : []);
  }

  async function toggleActive(q: IntakeQuestion) {
    const r = await restUpdate(q.id, { active: !q.active });
    if (!r.ok) {
      toast.error("Update failed");
      return;
    }
    setQuestions((prev) =>
      prev.map((x) => (x.id === q.id ? { ...x, active: !x.active } : x)),
    );
  }

  async function removeQuestion(q: IntakeQuestion) {
    const r = await restDelete(q.id);
    if (!r.ok) {
      toast.error("Delete failed");
      return;
    }
    setConfirmDelete(null);
    toast.success("Deleted");
    if (userId) await load(userId);
  }

  async function reorder(fromId: string, toId: string) {
    if (fromId === toId) return;
    const list = [...questions];
    const fromIdx = list.findIndex((q) => q.id === fromId);
    const toIdx = list.findIndex((q) => q.id === toId);
    if (fromIdx < 0 || toIdx < 0) return;
    const [moved] = list.splice(fromIdx, 1);
    list.splice(toIdx, 0, moved);
    const reindexed = list.map((q, i) => ({ ...q, display_order: i }));
    setQuestions(reindexed);
    const results = await Promise.all(
      reindexed.map((q) => restUpdate(q.id, { display_order: q.display_order })),
    );
    if (results.some((r) => !r.ok)) {
      toast.error("Reorder partially failed");
    }
  }

  const availableStarters = useMemo(() => {
    const existing = new Set(questions.map((q) => q.question.trim().toLowerCase()));
    return STARTER_QUESTIONS.filter((s) => !existing.has(s.text.trim().toLowerCase()));
  }, [questions]);

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#FFFFFF", ...POPPINS }}>
      {/* Top bar */}
      <div
        style={{
          backgroundColor: "#0A2540",
          color: "#FFFFFF",
          padding: "14px 16px",
          display: "flex",
          alignItems: "center",
          gap: 12,
          position: "sticky",
          top: 0,
          zIndex: 20,
        }}
      >
        <button
          onClick={() => navigate({ to: "/settings" })}
          aria-label="Back"
          style={{
            background: "transparent",
            border: "none",
            color: "#FFFFFF",
            padding: 4,
            cursor: "pointer",
          }}
        >
          <ArrowLeft size={22} />
        </button>
        <div style={{ fontSize: 17, fontWeight: 600, flex: 1 }}>Intake questions</div>
        <button
          onClick={() => {
            console.log("[intake] add button tapped");
            setEditing(null);
            setSheetOpen(true);
          }}

          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            backgroundColor: "#FFFFFF",
            color: "#0A2540",
            border: "none",
            borderRadius: 8,
            padding: "8px 12px",
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
            ...POPPINS,
          }}
        >
          <Plus size={16} /> Add question
        </button>
      </div>

      {/* Intro card */}
      <div
        style={{
          margin: "16px",
          backgroundColor: "#F0F4FF",
          border: "1px solid #BFDBFE",
          borderRadius: 12,
          padding: 16,
          display: "flex",
          gap: 12,
          alignItems: "flex-start",
        }}
      >
        <ClipboardList size={20} color="#00A3B4" style={{ flexShrink: 0, marginTop: 2 }} />
        <div style={{ fontSize: 13, lineHeight: 1.5, color: "#0A2540" }}>
          These questions are shown to new pupils when they register or book for the first
          time. Use them to gather important information upfront.
        </div>
      </div>

      {/* Starter suggestions */}
      {!loading && questions.length === 0 && availableStarters.length > 0 && (
        <div style={{ margin: "12px 16px" }}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: 0.5,
              color: "#6B7280",
              marginBottom: 8,
            }}
          >
            SUGGESTED QUESTIONS
          </div>
          {availableStarters.map((s, i) => (
            <div
              key={i}
              style={{
                backgroundColor: "#FFFFFF",
                border: "0.5px solid #EEF2F7",
                borderRadius: 12,
                padding: "12px 14px",
                marginBottom: 8,
                display: "flex",
                alignItems: "center",
                gap: 12,
              }}
            >
              <div style={{ flex: 1, fontSize: 14, color: "#0A2540" }}>{s.text}</div>
              <button
                onClick={() => addStarter(s)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  background: "#0A2540",
                  color: "#FFFFFF",
                  border: "none",
                  borderRadius: 8,
                  padding: "6px 10px",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                  ...POPPINS,
                }}
              >
                <Plus size={12} /> Add
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Question list */}
      <div style={{ marginTop: 12, paddingBottom: 96 }}>
        {loading ? (
          <div style={{ padding: 16, color: "#6B7280", fontSize: 13 }}>Loading…</div>
        ) : (
          questions.map((q) => (
            <div
              key={q.id}
              draggable
              onDragStart={() => (dragId.current = q.id)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => {
                if (dragId.current) reorder(dragId.current, q.id);
                dragId.current = null;
              }}
              style={{
                backgroundColor: "#FFFFFF",
                border: "0.5px solid #EEF2F7",
                borderRadius: 12,
                padding: "14px 16px",
                margin: "0 16px 8px",
                display: "flex",
                alignItems: "flex-start",
                gap: 10,
                opacity: q.active ? 1 : 0.55,
              }}
            >
              <div
                style={{
                  color: "#9CA3AF",
                  cursor: "grab",
                  paddingTop: 2,
                  touchAction: "none",
                }}
              >
                <GripVertical size={18} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: "#0A2540",
                    marginBottom: 6,
                  }}
                >
                  {q.question}
                </div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
                  <span
                    style={{
                      fontSize: 11,
                      padding: "2px 8px",
                      borderRadius: 6,
                      backgroundColor: "#EEF2FF",
                      color: "#00A3B4",
                      fontWeight: 500,
                    }}
                  >
                    {TYPE_LABEL[q.type]}
                  </span>
                  {q.required && (
                    <span
                      style={{
                        fontSize: 11,
                        padding: "2px 8px",
                        borderRadius: 6,
                        backgroundColor: "#FEECEE",
                        color: "#CC2229",
                        fontWeight: 500,
                      }}
                    >
                      Required
                    </span>
                  )}
                </div>
                {q.type === "multiple_choice" && q.options && q.options.length > 0 && (
                  <div style={{ fontSize: 12, color: "#6B7280", marginBottom: 8 }}>
                    Options: {q.options.join(", ")}
                  </div>
                )}
                <div style={{ display: "flex", gap: 12 }}>
                  <button
                    onClick={() => {
                      setEditing(q);
                      setSheetOpen(true);
                    }}
                    style={{
                      background: "transparent",
                      border: "none",
                      color: "#00A3B4",
                      fontSize: 13,
                      fontWeight: 500,
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                      padding: 0,
                    }}
                  >
                    <Pencil size={13} /> Edit
                  </button>
                  <button
                    onClick={() => setConfirmDelete(q)}
                    style={{
                      background: "transparent",
                      border: "none",
                      color: "#CC2229",
                      fontSize: 13,
                      fontWeight: 500,
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                      padding: 0,
                    }}
                  >
                    <Trash2 size={13} /> Delete
                  </button>
                </div>
              </div>
              <Toggle checked={q.active} onChange={() => toggleActive(q)} />
            </div>
          ))
        )}
      </div>

      {sheetOpen && (
        <QuestionSheet
          initial={editing}
          onClose={() => {
            setSheetOpen(false);
            setEditing(null);
          }}
          onSave={saveQuestion}
        />
      )}

      {confirmDelete && (
        <div
          onClick={() => setConfirmDelete(null)}
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.4)",
            zIndex: 60,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: "#FFFFFF",
              borderRadius: 14,
              padding: 20,
              maxWidth: 380,
              width: "100%",
              ...POPPINS,
            }}
          >
            <div style={{ fontSize: 16, fontWeight: 600, color: "#0A2540", marginBottom: 8 }}>
              Delete this question?
            </div>
            <div style={{ fontSize: 13, color: "#6B7280", marginBottom: 16 }}>
              {confirmDelete.question}
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button
                onClick={() => setConfirmDelete(null)}
                style={{
                  padding: "8px 14px",
                  borderRadius: 8,
                  border: "1px solid #EEF2F7",
                  background: "#FFFFFF",
                  color: "#0A2540",
                  fontWeight: 500,
                  cursor: "pointer",
                  ...POPPINS,
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => removeQuestion(confirmDelete)}
                style={{
                  padding: "8px 14px",
                  borderRadius: 8,
                  border: "none",
                  background: "#CC2229",
                  color: "#FFFFFF",
                  fontWeight: 600,
                  cursor: "pointer",
                  ...POPPINS,
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Toggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <button
      onClick={onChange}
      aria-pressed={checked}
      style={{
        width: 42,
        height: 24,
        borderRadius: 12,
        border: "none",
        backgroundColor: checked ? "#00A3B4" : "#D1D5DB",
        position: "relative",
        cursor: "pointer",
        flexShrink: 0,
        transition: "background-color 0.15s",
      }}
    >
      <span
        style={{
          position: "absolute",
          top: 2,
          left: checked ? 20 : 2,
          width: 20,
          height: 20,
          borderRadius: "50%",
          backgroundColor: "#FFFFFF",
          transition: "left 0.15s",
        }}
      />
    </button>
  );
}

function QuestionSheet({
  initial,
  onClose,
  onSave,
}: {
  initial: IntakeQuestion | null;
  onClose: () => void;
  onSave: (q: {
    id?: string;
    question: string;
    type: QType;
    options: string[] | null;
    required: boolean;
  }) => Promise<void>;
}) {
  const [text, setText] = useState(initial?.question ?? "");
  const [type, setType] = useState<QType>(initial?.type ?? "text");
  const [required, setRequired] = useState<boolean>(initial?.required ?? false);
  const [options, setOptions] = useState<string[]>(
    initial?.options && initial.options.length > 0 ? initial.options : ["", ""],
  );
  const [saving, setSaving] = useState(false);
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  function toggleMic() {
    const SR: any =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      toast.error("Speech recognition not supported");
      return;
    }
    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }
    const rec = new SR();
    rec.lang = "en-GB";
    rec.interimResults = false;
    rec.onresult = (e: any) => {
      const t = e.results[0][0].transcript;
      setText((prev) => (prev ? prev + " " + t : t));
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    recognitionRef.current = rec;
    rec.start();
    setListening(true);
  }

  async function handleSave() {
    const trimmed = text.trim();
    if (!trimmed) {
      toast.error("Please enter a question");
      return;
    }
    let opts: string[] | null = null;
    if (type === "multiple_choice") {
      opts = options.map((o) => o.trim()).filter(Boolean);
      if (opts.length < 2) {
        toast.error("Add at least 2 options");
        return;
      }
    }
    setSaving(true);
    try {
      await onSave({
        id: initial?.id,
        question: trimmed,
        type: type,
        options: opts,
        required,
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0,0,0,0.4)",
        zIndex: 50,
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: 520,
          maxHeight: "calc(90vh - 64px)",
          backgroundColor: "#FFFFFF",
          borderTopLeftRadius: 16,
          borderTopRightRadius: 16,
          overflowY: "auto",
          fontFamily: "Inter, sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "16px 20px",
            borderBottom: "1px solid #F1F3F7",
          }}
        >
          <div style={{ fontSize: 16, fontWeight: 600, color: "#0A2540" }}>
            {initial ? "Edit question" : "Add question"}
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              background: "transparent",
              border: "none",
              color: "#6B7280",
              cursor: "pointer",
              padding: 4,
            }}
          >
            <X size={20} />
          </button>
        </div>

        <div style={{ padding: 20 }}>
          {/* Question text */}
          <label style={{ fontSize: 12, fontWeight: 600, color: "#374151" }}>
            Question <span style={{ color: "#CC2229" }}>*</span>
          </label>
          <div style={{ position: "relative", marginTop: 6, marginBottom: 16 }}>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Type your question…"
              rows={3}
              style={{
                width: "100%",
                border: "1px solid #EEF2F7",
                borderRadius: 10,
                padding: "10px 40px 10px 12px",
                fontSize: 14,
                fontFamily: "Inter, sans-serif",
                resize: "vertical",
                color: "#0A2540",
                outline: "none",
              }}
            />
            <button
              type="button"
              onClick={toggleMic}
              aria-label="Voice input"
              style={{
                position: "absolute",
                right: 8,
                top: 8,
                background: listening ? "#CC2229" : "#F4F4F5",
                color: listening ? "#FFFFFF" : "#374151",
                border: "none",
                borderRadius: 8,
                padding: 6,
                cursor: "pointer",
              }}
            >
              {listening ? <MicOff size={16} /> : <Mic size={16} />}
            </button>
          </div>

          {/* Type */}
          <label style={{ fontSize: 12, fontWeight: 600, color: "#374151" }}>Answer type</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as QType)}
            style={{
              width: "100%",
              marginTop: 6,
              marginBottom: 16,
              border: "1px solid #EEF2F7",
              borderRadius: 10,
              padding: "10px 12px",
              fontSize: 14,
              fontFamily: "Inter, sans-serif",
              backgroundColor: "#FFFFFF",
              color: "#0A2540",
              outline: "none",
            }}
          >
            <option value="text">Text</option>
            <option value="yes_no">Yes or No</option>
            <option value="multiple_choice">Multiple choice</option>
            <option value="number">Number</option>
          </select>

          {/* Options */}
          {type === "multiple_choice" && (
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#374151" }}>
                Options (up to 6)
              </label>
              <div style={{ marginTop: 6, display: "flex", flexDirection: "column", gap: 8 }}>
                {options.map((opt, i) => (
                  <div key={i} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <input
                      value={opt}
                      onChange={(e) => {
                        const next = [...options];
                        next[i] = e.target.value;
                        setOptions(next);
                      }}
                      placeholder={`Option ${i + 1}`}
                      style={{
                        flex: 1,
                        border: "1px solid #EEF2F7",
                        borderRadius: 10,
                        padding: "8px 12px",
                        fontSize: 14,
                        fontFamily: "Inter, sans-serif",
                        color: "#0A2540",
                        outline: "none",
                      }}
                    />
                    {options.length > 2 && (
                      <button
                        onClick={() => setOptions(options.filter((_, j) => j !== i))}
                        aria-label="Remove option"
                        style={{
                          background: "transparent",
                          border: "none",
                          color: "#CC2229",
                          cursor: "pointer",
                          padding: 4,
                        }}
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              {options.length < 6 && (
                <button
                  onClick={() => setOptions([...options, ""])}
                  style={{
                    marginTop: 8,
                    background: "transparent",
                    border: "1px dashed #BFDBFE",
                    color: "#00A3B4",
                    borderRadius: 10,
                    padding: "8px 12px",
                    fontSize: 13,
                    fontWeight: 500,
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                    fontFamily: "Inter, sans-serif",
                  }}
                >
                  <Plus size={14} /> Add option
                </button>
              )}
            </div>
          )}

          {/* Required toggle */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "12px 0",
              borderTop: "1px solid #F1F3F7",
              borderBottom: "1px solid #F1F3F7",
              marginBottom: 20,
            }}
          >
            <div>
              <div style={{ fontSize: 14, fontWeight: 500, color: "#0A2540" }}>
                Required
              </div>
              <div style={{ fontSize: 12, color: "#6B7280" }}>
                Pupil must answer before submitting
              </div>
            </div>
            <Toggle checked={required} onChange={() => setRequired((v) => !v)} />
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              width: "100%",
              height: 48,
              borderRadius: 10,
              backgroundColor: "#0A2540",
              color: "#FFFFFF",
              border: "none",
              fontSize: 15,
              fontWeight: 600,
              cursor: saving ? "not-allowed" : "pointer",
              opacity: saving ? 0.6 : 1,
              fontFamily: "Inter, sans-serif",
            }}
          >
            {saving ? "Saving…" : "Save question"}
          </button>

          <div style={{ height: 80 }} />
        </div>
      </div>
    </div>
  );
}
