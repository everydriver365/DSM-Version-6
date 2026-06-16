import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { X, StickyNote, Navigation as NavIcon, Phone, CheckSquare } from "lucide-react";
import { SectionHeader } from "../components/dsm/SectionHeader";
import { Button } from "../components/dsm/Button";
import { supabase } from "../lib/supabaseClient";

export const Route = createFileRoute("/livesession")({
  head: () => ({
    meta: [{ title: "Live session — DSM" }],
  }),
  component: LiveSessionPage,
});

const POPPINS = { fontFamily: "Poppins, sans-serif" } as const;

interface LessonRow {
  id: string;
  lesson_date: string;
  lesson_time: string;
  duration_minutes: number | null;
  status: string;
  notes: string | null;
  pupil_id: string;
  pupils?: { name: string; phone: string | null } | null;
}

function ymd(d: Date) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

function fmtTimer(secs: number) {
  const s = Math.max(0, Math.floor(secs));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function LiveSessionPage() {
  const navigate = useNavigate();
  const [lesson, setLesson] = useState<LessonRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionElapsed, setSessionElapsed] = useState(0);
  const [notes, setNotes] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const [noteSheetOpen, setNoteSheetOpen] = useState(false);
  const [quickNote, setQuickNote] = useState("");
  const lastSavedRef = useRef<string>("");

  // Load current/next lesson for today
  useEffect(() => {
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      const u = auth.user;
      if (!u) {
        setLoading(false);
        return;
      }
      const today = ymd(new Date());
      const { data, error } = await supabase
        .from("lessons")
        .select("id, lesson_date, lesson_time, duration_minutes, status, notes, pupil_id, pupils(name, phone)")
        .eq("instructor_id", u.id)
        .is("deleted_at", null)
        .neq("status", "cancelled")
        .neq("status", "completed")
        .eq("lesson_date", today)
        .order("lesson_time", { ascending: true })
        .limit(1);
      if (error) console.error("[livesession] fetch error", error);
      const row = (data?.[0] ?? null) as unknown as LessonRow | null;
      setLesson(row);
      setNotes(row?.notes ?? "");
      lastSavedRef.current = row?.notes ?? "";
      setLoading(false);
    })();
  }, []);

  // Session timer — counts up from 0 every second
  useEffect(() => {
    const id = setInterval(() => setSessionElapsed((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, []);

  // Autosave notes every 5s
  useEffect(() => {
    if (!lesson) return;
    const id = setInterval(async () => {
      if (notes === lastSavedRef.current) return;
      setSavingNote(true);
      const { error } = await supabase
        .from("lessons")
        .update({ notes })
        .eq("id", lesson.id);
      if (!error) lastSavedRef.current = notes;
      setSavingNote(false);
    }, 5000);
    return () => clearInterval(id);
  }, [lesson, notes]);


  async function endSession() {
    if (!lesson) {
      navigate({ to: "/home" });
      return;
    }
    // persist any pending notes
    if (notes !== lastSavedRef.current) {
      await supabase.from("lessons").update({ notes }).eq("id", lesson.id);
    }
    await supabase.from("lessons").update({ status: "completed" }).eq("id", lesson.id);
    navigate({ to: "/lessons/feedback/$id", params: { id: lesson.id } });
  }

  async function saveQuickNote() {
    if (!lesson || !quickNote.trim()) {
      setNoteSheetOpen(false);
      return;
    }
    const stamp = new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
    const next = `${notes ? notes + "\n" : ""}[${stamp}] ${quickNote.trim()}`;
    setNotes(next);
    await supabase.from("lessons").update({ notes: next }).eq("id", lesson.id);
    lastSavedRef.current = next;
    setQuickNote("");
    setNoteSheetOpen(false);
  }

  const pupilName = lesson?.pupils?.name ?? "Pupil";
  const pupilPhone = lesson?.pupils?.phone ?? "";
  const startTimeLabel = lesson ? (lesson.lesson_time ?? "").slice(0, 5) : "—";

  return (
    <div className="min-h-screen" style={{ ...POPPINS, backgroundColor: "#CC2229", margin: -8 }}>
      {/* TOP BAR */}
      <div
        className="sticky top-0 z-40 h-[52px] px-4 flex items-center justify-between"
        style={{ backgroundColor: "#CC2229" }}
      >
        <div style={{ width: 28 }} />
        <div className="text-white text-[16px] font-semibold">Live session</div>
        <button
          type="button"
          aria-label="End session"
          onClick={endSession}
          className="flex items-center justify-center"
          style={{ width: 28, height: 28 }}
        >
          <X size={22} color="#ffffff" />
        </button>
      </div>

      {/* TIMER */}
      <div style={{ padding: "32px 16px 24px", textAlign: "center" }}>
        <div
          style={{
            color: "#ffffff",
            fontSize: 48,
            fontWeight: 700,
            letterSpacing: 1,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {loading ? "00:00:00" : fmtTimer(sessionElapsed)}
        </div>
        <div style={{ color: "rgba(255,255,255,0.8)", fontSize: 12, marginTop: 6 }}>
          {lesson ? "Session in progress" : "No active lesson"}
        </div>
      </div>

      {/* PUPIL CARD */}
      <div
        style={{
          background: "#ffffff",
          borderRadius: 12,
          padding: 16,
          margin: "0 16px",
          boxShadow: "0 2px 12px rgba(0,0,0,0.10)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 24,
              background: "#1A52A0",
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 700,
              fontSize: 16,
            }}
          >
            {initials(pupilName)}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 18, fontWeight: 600, color: "#0F2044" }}>{pupilName}</div>
            <div style={{ fontSize: 12, color: "#6B7280", marginTop: 2 }}>
              Start {startTimeLabel} · {lesson?.duration_minutes ?? 60} min
            </div>
            <div style={{ fontSize: 12, color: "#6B7280", marginTop: 2 }}>Pickup: home address</div>
          </div>
        </div>
      </div>

      {/* QUICK ACTIONS */}
      <div style={{ padding: "0 16px" }}>
        <SectionHeader>QUICK ACTIONS</SectionHeader>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <button
            type="button"
            onClick={endSession}
            style={actionBtn("#CC2229")}
          >
            <X size={20} color="#fff" />
            <span>End lesson</span>
          </button>
          <button
            type="button"
            onClick={() => setNoteSheetOpen(true)}
            style={actionBtn("#1A52A0")}
          >
            <StickyNote size={20} color="#fff" />
            <span>Add note</span>
          </button>
          <button
            type="button"
            onClick={() => window.open("https://maps.google.com", "_blank")}
            style={actionBtn("#16A34A")}
          >
            <NavIcon size={20} color="#fff" />
            <span>Navigate</span>
          </button>
          <button
            type="button"
            onClick={() => {
              if (pupilPhone) window.location.href = `tel:${pupilPhone}`;
            }}
            style={{ ...actionBtn("#F59E0B"), opacity: pupilPhone ? 1 : 0.6 }}
          >
            <Phone size={20} color="#fff" />
            <span>Call pupil</span>
          </button>
        </div>

        <SectionHeader>LESSON NOTES</SectionHeader>
        <div style={{ position: "relative" }}>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Live notes — auto-saves every 5 seconds"
            style={{
              width: "100%",
              minHeight: 160,
              borderRadius: 12,
              padding: 12,
              background: "#ffffff",
              color: "#0F2044",
              fontSize: 14,
              border: "none",
              resize: "vertical",
              fontFamily: "Poppins, sans-serif",
            }}
          />
          <div
            style={{
              position: "absolute",
              right: 10,
              bottom: 10,
              fontSize: 10,
              color: "#6B7280",
              background: "rgba(255,255,255,0.9)",
              padding: "2px 6px",
              borderRadius: 6,
            }}
          >
            {savingNote ? "Saving…" : notes === lastSavedRef.current ? "Saved" : "Editing"}
          </div>
        </div>
        <div style={{ height: 24 }} />
      </div>

      {/* QUICK NOTE SHEET */}
      {noteSheetOpen && (
        <div
          onClick={() => setNoteSheetOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            zIndex: 50,
            display: "flex",
            alignItems: "flex-end",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#fff",
              width: "100%",
              borderTopLeftRadius: 16,
              borderTopRightRadius: 16,
              padding: 16,
            }}
          >
            <div style={{ fontSize: 16, fontWeight: 600, color: "#0F2044", marginBottom: 12 }}>
              Quick note
            </div>
            <textarea
              autoFocus
              value={quickNote}
              onChange={(e) => setQuickNote(e.target.value)}
              placeholder="e.g. Struggled with roundabout entry"
              style={{
                width: "100%",
                minHeight: 100,
                borderRadius: 8,
                padding: 10,
                border: "0.5px solid #E2E6ED",
                fontSize: 14,
                fontFamily: "Poppins, sans-serif",
              }}
            />
            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <Button variant="ghost" onClick={() => setNoteSheetOpen(false)}>
                Cancel
              </Button>
              <Button onClick={saveQuickNote}>Save</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function actionBtn(bg: string): React.CSSProperties {
  return {
    height: 80,
    borderRadius: 12,
    background: bg,
    color: "#fff",
    border: "none",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    fontSize: 14,
    fontWeight: 600,
    fontFamily: "Poppins, sans-serif",
    cursor: "pointer",
  };
}
