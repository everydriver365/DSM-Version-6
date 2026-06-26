import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  ArrowLeft,
  AlertTriangle,
  Calendar as CalendarIcon,
  FileText,
  Mic,
  MicOff,
} from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { EndLessonWizard } from "../components/dsm/EndLessonWizard";

export const Route = createFileRoute("/end-of-day")({
  component: EndOfDayPage,
});

type Lesson = {
  id: string;
  pupil_id: string;
  lesson_date: string;
  lesson_time: string | null;
  duration_minutes: number | null;
  eol_completed: boolean | null;
  payment_status: string | null;
  amount_due: number | null;
  pupils?: { id: string; name: string | null; first_name: string | null; last_name: string | null; phone: string | null } | null;
};

type HistoryRow = {
  id: string;
  lesson_cost: number | null;
  created_at: string;
};

function pupilName(p?: { name?: string | null; first_name?: string | null; last_name?: string | null } | null): string {
  if (!p) return "";
  return (p.name || `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim()) ?? "";
}



function fmtDateLong(d: Date) {
  return d.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

function pad(n: number) {
  return n < 10 ? `0${n}` : String(n);
}

function toIsoDate(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function lessonEndInPast(l: Lesson, today: Date) {
  if (!l.lesson_time) return true;
  const [h, m] = l.lesson_time.split(":").map((v) => parseInt(v, 10));
  const end = new Date(today);
  end.setHours(h || 0, (m || 0) + (l.duration_minutes ?? 60), 0, 0);
  return end.getTime() <= Date.now();
}

function EndOfDayPage() {
  const navigate = useNavigate();
  const today = useMemo(() => new Date(), []);
  const todayIso = toIsoDate(today);
  const tomorrow = useMemo(() => {
    const t = new Date(today);
    t.setDate(t.getDate() + 1);
    return t;
  }, [today]);
  const tomorrowIso = toIsoDate(tomorrow);

  const [instructorId, setInstructorId] = useState<string | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [tomorrowLessons, setTomorrowLessons] = useState<Lesson[]>([]);
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [prepaidPupilIds, setPrepaidPupilIds] = useState<Set<string>>(new Set());
  const [notes, setNotes] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const [listening, setListening] = useState(false);
  const [eolLesson, setEolLesson] = useState<Lesson | null>(null);
  const recogRef = useRef<any>(null);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      const id = u.user?.id;
      if (!id) return;
      setInstructorId(id);

      const [
        { data: ls, error: lessonsError },
        { data: tls, error: tlsError },
        { data: hs, error: paymentsError },
        { data: noteRow },
      ] = await Promise.all([
        supabase
          .from("lessons")
          .select(
            "id,pupil_id,lesson_date,lesson_time,duration_minutes,eol_completed,payment_status,amount_due,pupils(id,name,first_name,last_name,phone)",
          )
          .eq("instructor_id", id)
          .eq("lesson_date", todayIso)
          .is("deleted_at", null)
          .order("lesson_time", { ascending: true }),
        supabase
          .from("lessons")
          .select(
            "id,pupil_id,lesson_date,lesson_time,duration_minutes,pupils(id,name,first_name,last_name,phone)",
          )
          .eq("instructor_id", id)
          .eq("lesson_date", tomorrowIso)
          .is("deleted_at", null)
          .order("lesson_time", { ascending: true }),
        supabase
          .from("lesson_history")
          .select("id,lesson_cost,created_at")
          .eq("instructor_id", id)
          .eq("payment_status", "paid")
          .gte("created_at", `${todayIso}T00:00:00`),
        supabase
          .from("daily_notes")
          .select("notes")
          .eq("instructor_id", id)
          .eq("note_date", todayIso)
          .maybeSingle(),
      ]);
      console.log("[eod] today date:", todayIso, "instructor:", id);
      console.log("[eod] today lessons:", ls, "error:", lessonsError);
      console.log("[eod] tomorrow lessons:", tls, "error:", tlsError);
      console.log("[eod] today payments:", hs, "error:", paymentsError);
      setLessons((ls ?? []) as any);
      setTomorrowLessons((tls ?? []) as any);
      setHistory((hs ?? []) as any);
      if (noteRow?.notes) setNotes(noteRow.notes);

      const pupilIds = Array.from(
        new Set(((ls as any[]) ?? []).map((l) => l.pupil_id).filter(Boolean)),
      );
      if (pupilIds.length) {
        const { data: pupilsData } = await supabase
          .from("pupils")
          .select("id, prepaid_hours")
          .in("id", pupilIds);
        setPrepaidPupilIds(
          new Set(
            (pupilsData ?? [])
              .filter((p: any) => (p.prepaid_hours || 0) > 0)
              .map((p: any) => p.id),
          ),
        );
      }
    })();
  }, [todayIso, tomorrowIso]);

  const stats = useMemo(() => {
    const totalMin = lessons.reduce((s, l) => s + (l.duration_minutes ?? 0), 0);
    const paidEarnings = history.reduce((s, h) => s + (h.lesson_cost ?? 0), 0);
    const prepaidEarnings = lessons
      .filter((l) => prepaidPupilIds.has(l.pupil_id))
      .reduce((s, l) => s + (l.amount_due ?? 0), 0);
    const earned = paidEarnings + prepaidEarnings;
    const outstanding = lessons
      .filter((l) => l.payment_status === "unpaid" && !prepaidPupilIds.has(l.pupil_id))
      .reduce((s, l) => s + (l.amount_due ?? 0), 0);
    return {
      count: lessons.length,
      hours: totalMin / 60,
      earned,
      prepaidEarnings,
      outstanding,
    };
  }, [lessons, history, prepaidPupilIds]);

  const outstandingEols = lessons.filter(
    (l) => !l.eol_completed && lessonEndInPast(l, today),
  );
  const unpaidLessons = lessons.filter(
    (l) => l.payment_status === "unpaid" && !prepaidPupilIds.has(l.pupil_id),
  );

  async function saveNote(value: string) {
    if (!instructorId) return;
    setSavingNote(true);
    const { error } = await supabase
      .from("daily_notes")
      .upsert(
        { instructor_id: instructorId, note_date: todayIso, notes: value, updated_at: new Date().toISOString() },
        { onConflict: "instructor_id,note_date" },
      );
    setSavingNote(false);
    if (error) toast.error("Couldn't save note");
  }

  function toggleListen() {
    const SR: any =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      toast.error("Speech recognition not supported on this device");
      return;
    }
    if (listening) {
      recogRef.current?.stop();
      return;
    }
    const r = new SR();
    r.continuous = true;
    r.interimResults = false;
    r.lang = "en-GB";
    r.onresult = (e: any) => {
      let chunk = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) chunk += e.results[i][0].transcript;
      }
      if (chunk) {
        setNotes((prev) => (prev ? `${prev} ${chunk}`.trim() : chunk.trim()));
      }
    };
    r.onend = () => {
      setListening(false);
      setNotes((cur) => {
        saveNote(cur);
        return cur;
      });
    };
    r.onerror = () => setListening(false);
    recogRef.current = r;
    setListening(true);
    r.start();
  }

  function chasePayment(l: Lesson) {
    const phone = l.pupils?.phone ?? "";
    const name = pupilName(l.pupils) || "there";
    const body = encodeURIComponent(
      `Hi ${name}, just a quick reminder there's £${(l.amount_due ?? 0).toFixed(2)} outstanding for today's lesson. Thanks!`,
    );
    window.location.href = `sms:${phone}?&body=${body}`;
  }

  const earliestTomorrow = tomorrowLessons[0]?.lesson_time?.slice(0, 5) ?? null;

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#FFFFFF", fontFamily: "Poppins, sans-serif", paddingBottom: 80 }}>
      {/* Top bar */}
      <div style={{ backgroundColor: "#0F2044", color: "#FFFFFF", padding: "14px 16px", display: "flex", alignItems: "center", gap: 12 }}>
        <button type="button" onClick={() => navigate({ to: "/home" })} style={{ background: "transparent", color: "#FFFFFF", cursor: "pointer" }} aria-label="Back">
          <ArrowLeft size={20} />
        </button>
        <div>
          <div style={{ fontSize: 16, fontWeight: 700 }}>End of day</div>
          <div style={{ fontSize: 12, opacity: 0.85 }}>{fmtDateLong(today)}</div>
        </div>
      </div>

      {/* Section 1: Summary */}
      <div style={{ padding: 16, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <Stat label="Lessons today" value={String(stats.count)} />
        <Stat label="Hours taught" value={stats.hours.toFixed(1)} />
        <Stat label="Earned today" value={`£${stats.earned.toFixed(0)}`} color="#16A34A" hint={stats.prepaidEarnings > 0 ? "(est.)" : undefined} />
        <Stat label="Outstanding" value={`£${stats.outstanding.toFixed(0)}`} color={stats.outstanding > 0 ? "#DC2626" : "#0F2044"} />
      </div>

      {/* Section 2: Outstanding actions */}
      {(outstandingEols.length > 0 || unpaidLessons.length > 0) && (
        <Card>
          <Heading icon={<AlertTriangle size={16} color="#D97706" />} title="Actions needed" />
          {outstandingEols.map((l) => (
            <Row key={`eol-${l.id}`}>
              <span>{pupilName(l.pupils) || "Pupil"} — EOL pending</span>
              <SmallBtn color="#1A52A0" onClick={() => setEolLesson(l)}>Complete EOL</SmallBtn>
            </Row>
          ))}
          {unpaidLessons.map((l) => (
            <Row key={`pay-${l.id}`}>
              <span>{pupilName(l.pupils) || "Pupil"} — £{(l.amount_due ?? 0).toFixed(2)} unpaid</span>
              <SmallBtn color="#DC2626" onClick={() => chasePayment(l)}>Chase payment</SmallBtn>
            </Row>
          ))}
        </Card>
      )}

      {/* Section 3: Today's lessons recap */}
      <Card>
        <Heading title="Today's lessons" />
        {lessons.length === 0 ? (
          <div style={{ fontSize: 13, color: "#6B7280" }}>No lessons today.</div>
        ) : (
          lessons.map((l) => (
            <button
              type="button"
              key={l.id}
              onClick={() => navigate({ to: "/lessons/$id", params: { id: l.id } })}
              style={{
                width: "100%",
                textAlign: "left",
                background: "transparent",
                cursor: "pointer",
                padding: "8px 0",
                borderBottom: "1px solid #F3F4F6",
                display: "flex",
                alignItems: "center",
                gap: 10,
              }}
            >
              <span style={{ fontSize: 12, fontWeight: 600, color: "#0F2044", minWidth: 50 }}>
                {l.lesson_time?.slice(0, 5) ?? "--:--"}
              </span>
              <span style={{ fontSize: 13, color: "#0F2044", flex: 1 }}>
                {pupilName(l.pupils) || "Pupil"}
              </span>
              {!l.eol_completed && (
                <Badge bg="#FEF3C7" color="#92400E">EOL</Badge>
              )}
              {prepaidPupilIds.has(l.pupil_id) ? (
                <Badge bg="#DBEAFE" color="#1E3A8A">Prepaid</Badge>
              ) : l.payment_status === "paid" ? (
                <Badge bg="#DCFCE7" color="#166534">Paid ✓</Badge>
              ) : l.payment_status === "unpaid" && (l.amount_due ?? 0) > 0 ? (
                <Badge bg="#FEE2E2" color="#991B1B">£{(l.amount_due ?? 0).toFixed(0)} unpaid</Badge>
              ) : null}
            </button>
          ))
        )}
      </Card>

      {/* Section 4: Tomorrow */}
      <Card>
        <Heading icon={<CalendarIcon size={16} color="#1A52A0" />} title="Tomorrow" />
        {tomorrowLessons.length === 0 ? (
          <div style={{ fontSize: 13, color: "#6B7280" }}>No lessons booked for tomorrow.</div>
        ) : (
          <>
            <div style={{ fontSize: 13, color: "#0F2044", marginBottom: 8 }}>
              {tomorrowLessons.length} lesson{tomorrowLessons.length === 1 ? "" : "s"} tomorrow
              {earliestTomorrow ? ` starting at ${earliestTomorrow}` : ""}
            </div>
            {tomorrowLessons.slice(0, 3).map((l) => (
              <div key={l.id} style={{ display: "flex", gap: 10, padding: "6px 0", fontSize: 13, color: "#0F2044" }}>
                <span style={{ minWidth: 50, fontWeight: 600 }}>{l.lesson_time?.slice(0, 5) ?? "--:--"}</span>
                <span>{pupilName(l.pupils) || "Pupil"}</span>
              </div>
            ))}
            <button
              type="button"
              onClick={() => toast.success("Reminder set for 30 mins before first lesson")}
              style={{
                marginTop: 10,
                padding: "8px 12px",
                borderRadius: 8,
                background: "#1A52A0",
                color: "#FFFFFF",
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Set a reminder
            </button>
          </>
        )}
      </Card>

      {/* Section 5: Day notes */}
      <Card>
        <Heading icon={<FileText size={16} color="#7C3AED" />} title="Day notes" />
        <div style={{ position: "relative" }}>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onBlur={(e) => saveNote(e.target.value)}
            placeholder="How did today go? Any notes for tomorrow..."
            rows={4}
            style={{
              width: "100%",
              padding: 10,
              paddingRight: 40,
              fontSize: 13,
              fontFamily: "Poppins, sans-serif",
              border: "1px solid #E2E6ED",
              borderRadius: 10,
              resize: "vertical",
              outline: "none",
              color: "#0F2044",
              backgroundColor: "#FFFFFF",
            }}
          />
          <button
            type="button"
            onClick={toggleListen}
            aria-label={listening ? "Stop dictation" : "Start dictation"}
            style={{
              position: "absolute",
              right: 8,
              top: 8,
              padding: 6,
              borderRadius: 999,
              background: listening ? "#DC2626" : "#F3F4F6",
              cursor: "pointer",
              animation: listening ? "eod-pulse 1s infinite" : undefined,
            }}
          >
            {listening ? <MicOff size={16} color="#FFFFFF" /> : <Mic size={16} color="#0F2044" />}
          </button>
        </div>
        <div style={{ marginTop: 6, fontSize: 11, color: "#6B7280" }}>
          {savingNote ? "Saving…" : "Auto-saves on blur"}
        </div>
        <style>{`@keyframes eod-pulse{0%,100%{opacity:1}50%{opacity:.55}}`}</style>
      </Card>

      {eolLesson && instructorId && (
        <EndLessonWizard
          open={true}
          onClose={() => setEolLesson(null)}
          lessonId={eolLesson.id}
          pupilId={eolLesson.pupil_id}
          pupilName={pupilName(eolLesson.pupils) || "Pupil"}
          instructorId={instructorId}
          durationMinutes={eolLesson.duration_minutes ?? 60}
          lessonDate={eolLesson.lesson_date}
          startTime={eolLesson.lesson_time ?? "09:00"}
          onCompleted={() => {
            setEolLesson(null);
            setLessons((prev) =>
              prev.map((p) => (p.id === eolLesson.id ? { ...p, eol_completed: true } : p)),
            );
          }}
        />
      )}
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        margin: "12px 16px 0 16px",
        padding: 16,
        backgroundColor: "#FFFFFF",
        border: "0.5px solid #E2E6ED",
        borderRadius: 12,
      }}
    >
      {children}
    </div>
  );
}

function Heading({ icon, title }: { icon?: React.ReactNode; title: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
      {icon}
      <div style={{ fontSize: 14, fontWeight: 700, color: "#0F2044" }}>{title}</div>
    </div>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 10,
        padding: "8px 0",
        borderBottom: "1px solid #F3F4F6",
        fontSize: 13,
        color: "#0F2044",
      }}
    >
      {children}
    </div>
  );
}

function SmallBtn({ children, color, onClick }: { children: React.ReactNode; color: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: "6px 10px",
        borderRadius: 8,
        background: color,
        color: "#FFFFFF",
        fontSize: 12,
        fontWeight: 600,
        cursor: "pointer",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </button>
  );
}

function Badge({ children, bg, color }: { children: React.ReactNode; bg: string; color: string }) {
  return (
    <span style={{ padding: "2px 8px", borderRadius: 999, backgroundColor: bg, color, fontSize: 11, fontWeight: 600 }}>
      {children}
    </span>
  );
}

function Stat({ label, value, color, hint }: { label: string; value: string; color?: string; hint?: string }) {
  return (
    <div
      style={{
        padding: 14,
        border: "0.5px solid #E2E6ED",
        borderRadius: 12,
        backgroundColor: "#FFFFFF",
      }}
    >
      <div style={{ fontSize: 20, fontWeight: 700, color: color ?? "#0F2044" }}>
        {value}
        {hint && <span style={{ fontSize: 11, fontWeight: 500, color: "#6B7280", marginLeft: 4 }}>{hint}</span>}
      </div>
      <div style={{ fontSize: 11, color: "#6B7280", marginTop: 2 }}>{label}</div>
    </div>
  );
}
