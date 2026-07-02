import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState, Fragment } from "react";
import { ArrowLeft, Award, BookOpen, Camera, ChevronRight, ClipboardCheck, ClipboardList, CreditCard, Flag, Heart, Loader2, MapPin, Palette, Pencil, Phone, PoundSterling, Search, Trash2, Trophy, X, Check } from "lucide-react";
import { jsPDF } from "jspdf";
import { toast } from "sonner";
import { Card } from "../components/dsm/Card";
import { SectionHeader } from "../components/dsm/SectionHeader";
import { Button } from "../components/dsm/Button";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { supabase } from "../lib/supabaseClient";

export const Route = createFileRoute("/pupils/$id")({
  head: () => ({
    meta: [{ title: "Pupil — DSM by EveryDriver" }],
  }),
  component: PupilDetailPage,
});

const POPPINS = { fontFamily: "Inter, sans-serif" } as const;

interface Pupil {
  id: string;
  name: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  email: string | null;
  lesson_count: number | null;
  balance_owed: number | null;
  account_balance: number | null;
  prepaid_hours: number | null;
  prepaid_amount_paid: number | null;
  address: string | null;
  postcode: string | null;
  profile_image_url: string | null;
  status: string | null;
  test_date: string | null;
  notes: string | null;
  photo_url: string | null;
  photo_consent: boolean | null;
  lead_source: string | null;
  lead_source_detail: string | null;
  ni_amount_total: number | null;
  ni_payer: string | null;
  ni_amount_paid: number | null;
  ni_payment_date: string | null;
  ni_reference: string | null;
  test_time: string | null;
  test_centre: string | null;
  test_centre_id: string | null;
  wants_swap: boolean | null;
  theory_pass: boolean | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  emergency_contact_relation: string | null;
  driving_licence_number: string | null;
  custom_rate: number | null;
  custom_rate_90: number | null;
  custom_rate_120: number | null;
  calendar_colour: string | null;
}

interface Lesson {
  id: string;
  lesson_date: string;
  lesson_time: string;
  duration_minutes: number | null;
  status: string;
  price: number | null;
  is_paid: boolean | null;
  lesson_type: string | null;
  notes: string | null;
  end_of_lesson_completed: boolean | null;
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  const a = parts[0]?.[0] ?? "";
  const b = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (a + b).toUpperCase() || "?";
}
function formatTime(t: string) {
  return (t ?? "").slice(0, 5);
}
function formatDateShort(d: Date) {
  return d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
}
function formatTestDate(iso: string | null) {
  if (!iso) return "No test";
  return new Date(`${iso}T00:00:00`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });
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
function statusBadge(status: string | null) {
  const s = (status ?? "active").toLowerCase();
  if (s === "active") return { bg: "#1877D6", label: "Active" };
  if (s === "passed") return { bg: "#1877D6", label: "Passed" };
  return { bg: "#6B7280", label: s.charAt(0).toUpperCase() + s.slice(1) };
}
function lessonStatusColor(s: string) {
  if (s === "confirmed") return "#1877D6";
  if (s === "pending") return "#1877D6";
  if (s === "cancelled") return "#1877D6";
  return "#6B7280";
}
function isLessonLive(l: Lesson) {
  const now = new Date();
  const start = new Date(`${l.lesson_date}T${l.lesson_time}`);
  const end = new Date(start.getTime() + (l.duration_minutes ?? 60) * 60000);
  return now >= start && now <= end;
}
function isLessonPast(l: Lesson) {
  const now = new Date();
  const end = new Date(`${l.lesson_date}T${l.lesson_time}`);
  end.setMinutes(end.getMinutes() + (l.duration_minutes ?? 60));
  return now > end;
}
function accentColor(l: Lesson) {
  if (isLessonLive(l)) return "#1877D6";
  if (l.status === "completed") return "#1877D6";
  if (l.status === "cancelled") return "#9CA3AF";
  return "#1877D6";
}
function daysBetween(a: string, b: string) {
  const d1 = new Date(`${a}T00:00:00`);
  const d2 = new Date(`${b}T00:00:00`);
  const ms = d2.getTime() - d1.getTime();
  return Math.round(ms / (1000 * 60 * 60 * 24));
}

function PupilDetailPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const [pupil, setPupil] = useState<Pupil | null>(null);
  const [lessons, setLessons] = useState<Lesson[] | null>(null);
  const [notesDraft, setNotesDraft] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);
  const [noteSaved, setNoteSaved] = useState(false);
  const [removeOpen, setRemoveOpen] = useState(false);
  const [progressData, setProgressData] = useState<{ total: number; competent: number } | null>(null);
  const [syllabusPct, setSyllabusPct] = useState<number | null>(null);
  const [syllabusSum, setSyllabusSum] = useState<number>(0);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [actualLessonCount, setActualLessonCount] = useState<number | null>(null);
  const [balance, setBalance] = useState<number>(0);
  const [hoursCompleted, setHoursCompleted] = useState<number>(0);
  const [instructorRate, setInstructorRate] = useState<number | null>(null);
  const [instructorName, setInstructorName] = useState<string>("");
  const [certOpen, setCertOpen] = useState(false);
  const [certMilestone, setCertMilestone] = useState<"first_lesson" | "10_lessons" | "20_lessons" | "theory_pass" | "test_pass">("test_pass");
  const [intakeAnswers, setIntakeAnswers] = useState<any[] | null>(null);
  const [centreInfo, setCentreInfo] = useState<{ id: string; name: string; town: string | null } | null>(null);
  const [allCentres, setAllCentres] = useState<{ id: string; name: string; town: string | null }[]>([]);
  const [centrePickerOpen, setCentrePickerOpen] = useState(false);
  const [centreSearch, setCentreSearch] = useState("");
  const photoRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    supabase
      .from("pupils")
      .select(`
        id, name, first_name, last_name, phone, email, status,
        lesson_count, balance_owed, account_balance,
        test_date, test_time, test_centre,
        test_centre_id,
        prepaid_hours, prepaid_amount_paid,
        notes, profile_image_url, photo_url, photo_consent,
        address, postcode, lead_source, lead_source_detail,
        theory_pass, wants_swap,
        ni_amount_total, ni_amount_paid, ni_payer, ni_payment_date, ni_reference,
        emergency_contact_name, emergency_contact_phone, emergency_contact_relation,
        driving_licence_number, custom_rate, custom_rate_90, custom_rate_120, calendar_colour
      `)
      .eq("id", id)
      .is("deleted_at", null)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) console.error("[pupil] fetch error", error);
        const p = (data as Pupil) ?? null;
        setPupil(p);
        setNotesDraft(p?.notes ?? "");
        console.log("[pupils.$id] pupil data:", p, "lesson_count:", p?.lesson_count, "balance_owed:", p?.balance_owed, "account_balance:", p?.account_balance);
        if (p?.test_centre_id) {
          supabase
            .from("test_centres")
            .select("id, name, town")
            .eq("id", p.test_centre_id)
            .maybeSingle()
            .then(({ data: tc }) => setCentreInfo((tc as any) ?? null));
        } else {
          setCentreInfo(null);
        }
      });

    supabase
      .from("lessons")
      .select("id", { count: "exact", head: true })
      .eq("pupil_id", id)
      .in("status", ["confirmed", "completed"])
      .is("deleted_at", null)
      .then(({ count, error }) => {
        if (error) console.error("[pupil] lesson count error", error);
        setActualLessonCount(count ?? 0);
        console.log("[pupils.$id] lesson count (confirmed+completed):", count);
      });

    supabase
      .from("lesson_history")
      .select("lesson_cost, payment_status")
      .eq("pupil_id", id)
      .then(({ data, error }) => {
        if (error) console.error("[pupil] lesson_history error", error);
        const rows = (data as { lesson_cost: number | null; payment_status: string | null }[]) ?? [];
        const totalCost = rows.reduce((s, r) => s + (Number(r.lesson_cost) || 0), 0);
        const totalPaid = rows
          .filter((r) => r.payment_status === "paid")
          .reduce((s, r) => s + (Number(r.lesson_cost) || 0), 0);
        const bal = totalPaid - totalCost;
        setBalance(bal);
        console.log("[pupils.$id] balance:", bal, "totalCost:", totalCost, "totalPaid:", totalPaid);
      });

    supabase
      .from("lessons")
      .select("id, lesson_date, lesson_time, duration_minutes, status, price, is_paid, lesson_type, notes, end_of_lesson_completed")
      .eq("pupil_id", id)
      .is("deleted_at", null)
      .neq("status", "cancelled")
      .neq("status", "completed")
      .gte("lesson_date", ymd(new Date()))
      .order("lesson_date", { ascending: true })
      .order("lesson_time", { ascending: true })
      .then(({ data, error }) => {
        if (error) console.error("[pupil] lessons error", error);
        setLessons((data as Lesson[]) ?? []);
      });

    // Hours completed: sum duration_minutes for confirmed/completed lessons
    supabase
      .from("lessons")
      .select("duration_minutes")
      .eq("pupil_id", id)
      .is("deleted_at", null)
      .in("status", ["confirmed", "completed"])
      .then(({ data }) => {
        const mins = (data ?? []).reduce(
          (s: number, r: { duration_minutes: number | null }) =>
            s + Number(r.duration_minutes ?? 0),
          0,
        );
        setHoursCompleted(mins / 60);
      });

    // Instructor hourly rate fallback
    supabase.auth.getUser().then(({ data: u }) => {
      const uid = u?.user?.id;
      if (!uid) return;
      supabase
        .from("instructors")
        .select("hourly_rate, first_name, last_name, business_name")
        .eq("id", uid)
        .maybeSingle()
        .then(({ data }) => {
          if (data?.hourly_rate != null) setInstructorRate(Number(data.hourly_rate));
          const d = data as { first_name?: string | null; last_name?: string | null; business_name?: string | null } | null;
          const nm = [d?.first_name, d?.last_name].filter(Boolean).join(" ").trim() || d?.business_name || "";
          setInstructorName(nm);
        });
    });

    supabase
      .from("pupil_progress")
      .select("status")
      .eq("pupil_id", id)
      .then(({ data, error }) => {
        if (error) console.error("[pupil] progress error", error);
        const rows = (data as { status: string }[]) ?? [];
        const total = rows.length;
        const competent = rows.filter(
          (r) => r.status === "independent" || r.status === "competent",
        ).length;
        setProgressData({ total, competent });
      });

    supabase
      .from("pupil_syllabus_progress")
      .select("level")
      .eq("pupil_id", id)
      .then(({ data, error }) => {
        if (error) {
          console.error("[pupil] syllabus error", error);
          setSyllabusPct(0);
          return;
        }
        const rows = (data as { level: number }[]) ?? [];
        const total = rows.reduce((s, r) => s + (Number(r.level) || 0), 0);
        setSyllabusSum(total);
        // 27 competencies × 5 max
        setSyllabusPct(Math.round((total / (27 * 5)) * 100));
      });

    supabase
      .from("intake_answers")
      .select("*, intake_questions(question, type)")
      .eq("pupil_id", id)
      .order("created_at", { ascending: true })
      .then(({ data, error }) => {
        if (error) console.error("[pupil] intake answers error", error);
        setIntakeAnswers(data ?? []);
      });
  }, [id]);

  async function removePupil() {
    setRemoveOpen(false);
    const { error } = await supabase
      .from("pupils")
      .update({ deleted_at: new Date().toISOString(), status: "inactive" })
      .eq("id", id);
    if (error) {
      console.error("[pupil] remove error", error);
      return;
    }
    navigate({ to: "/pupils" });
  }

  async function saveNotes() {
    setSavingNotes(true);
    setNoteSaved(false);
    const { error } = await supabase
      .from("pupils")
      .update({ notes: notesDraft })
      .eq("id", id);
    setSavingNotes(false);
    if (error) {
      console.error("[pupil] save notes error", error);
      return;
    }
    setNoteSaved(true);
    setTimeout(() => setNoteSaved(false), 2000);
  }

  async function onPickPupilPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    if (!/^image\//.test(f.type)) return;
    if (f.size > 8 * 1024 * 1024) return;
    setUploadingPhoto(true);
    try {
      const ext = f.name.split(".").pop() ?? "jpg";
      const path = `${id}/${Date.now()}.${ext}`;
      const up = await supabase.storage
        .from("pupil-photos")
        .upload(path, f, { contentType: f.type, upsert: true });
      if (up.error) throw up.error;
      const { data: pub } = supabase.storage.from("pupil-photos").getPublicUrl(path);
      const publicUrl = pub.publicUrl;
      const { error } = await supabase
        .from("pupils")
        .update({ photo_url: publicUrl })
        .eq("id", id);
      if (error) throw error;
      setPupil((p) => (p ? { ...p, photo_url: publicUrl } : p));
    } catch (err) {
      console.error("[pupil] photo upload", err);
    } finally {
      setUploadingPhoto(false);
    }
  }

  async function togglePhotoConsent(value: boolean) {
    setPupil((p) => (p ? { ...p, photo_consent: value } : p));
    const { error } = await supabase
      .from("pupils")
      .update({ photo_consent: value })
      .eq("id", id);
    if (error) {
      console.error("[pupil] consent error", error);
      setPupil((p) => (p ? { ...p, photo_consent: !value } : p));
    }
  }

  const badge = statusBadge(pupil?.status ?? null);
  const lessonCount = actualLessonCount ?? 0;

  return (
    <div className="min-h-screen bg-white pb-8" style={POPPINS}>
      {/* Top bar */}
      <div
        className="sticky top-0 z-40 flex items-center justify-between px-2"
        style={{ height: 52, backgroundColor: "#0B1F3A" }}
      >
        <button
          type="button"
          aria-label="Back"
          onClick={() => navigate({ to: "/pupils" })}
          className="flex items-center justify-center"
          style={{ width: 40, height: 40 }}
        >
          <ArrowLeft size={22} color="#FFFFFF" />
        </button>
        <div
          className="flex-1 text-center text-[15px] font-semibold text-white truncate px-2"
          style={POPPINS}
        >
          {pupil?.name ?? ""}
        </div>
        <div className="flex items-center">
          <button
            type="button"
            aria-label="Edit pupil"
            onClick={() => navigate({ to: "/pupils/edit/$id", params: { id } })}
            className="flex items-center justify-center"
            style={{ width: 40, height: 40 }}
          >
            <Pencil size={18} color="#FFFFFF" />
          </button>
          <a
            href={pupil?.phone ? `tel:${pupil.phone}` : undefined}
            aria-label="Call pupil"
            className="flex items-center justify-center"
            style={{ width: 40, height: 40 }}
          >
            <Phone size={18} color="#FFFFFF" />
          </a>
          <button
            type="button"
            aria-label="Remove pupil"
            onClick={() => setRemoveOpen(true)}
            className="flex items-center justify-center"
            style={{ width: 40, height: 40 }}
          >
            <Trash2 size={18} color="#FFFFFF" />
          </button>
        </div>
      </div>

      {/* Profile header card */}
      {pupil && (
        <div className="mx-4 mt-3">
          <Card>
            <div className="flex items-center gap-3">
              <input
                ref={photoRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={onPickPupilPhoto}
              />
              <button
                type="button"
                onClick={() => !uploadingPhoto && photoRef.current?.click()}
                disabled={uploadingPhoto}
                aria-label="Upload pupil photo"
                className="relative flex items-center justify-center rounded-full shrink-0 overflow-hidden text-[18px] font-semibold"
                style={{
                  width: 56,
                  height: 56,
                  backgroundColor: "#1877D6",
                  color: "#FFFFFF",
                  ...POPPINS,
                }}
              >
                {pupil.photo_url ? (
                  <img src={pupil.photo_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span>{initials(pupil.name)}</span>
                )}
                {uploadingPhoto && (
                  <span
                    className="absolute inset-0 flex items-center justify-center"
                    style={{ backgroundColor: "rgba(0,0,0,0.45)" }}
                  >
                    <Loader2 size={18} color="#FFFFFF" className="animate-spin" />
                  </span>
                )}
                <span
                  className="absolute bottom-0 right-0 flex items-center justify-center rounded-full"
                  style={{
                    width: 20,
                    height: 20,
                    backgroundColor: "#FFFFFF",
                    border: "1px solid #EEF2F7",
                  }}
                >
                  <Camera size={11} color="#1877D6" />
                </span>
              </button>
              <div className="min-w-0 flex-1">
                <div
                  className="text-[18px] font-semibold text-[#0B1F3A] truncate"
                  style={POPPINS}
                >
                  {pupil.name}
                </div>
                <span
                  className="inline-block mt-1 text-[11px] text-white px-2 py-0.5 rounded-full"
                  style={{ backgroundColor: badge.bg, ...POPPINS }}
                >
                  {badge.label}
                </span>
              </div>
            </div>

            <div className="mt-2">
              <div className="text-[11px]" style={{ color: "#6B7280", ...POPPINS }}>
                Used on EveryDriver website with pupil consent
              </div>
              <label
                className="mt-2 flex items-start gap-2 cursor-pointer"
                style={POPPINS}
              >
                <input
                  type="checkbox"
                  checked={Boolean(pupil.photo_consent)}
                  onChange={(e) => togglePhotoConsent(e.target.checked)}
                  style={{ marginTop: 2 }}
                />
                <span className="text-[12px] text-[#0B1F3A]">
                  I have consent to use this pupil&apos;s photo publicly
                </span>
              </label>
            </div>

            <div className="grid grid-cols-3 gap-2 mt-4">
              <StatChip label="Lessons" value={String(lessonCount)} />
              <StatChip
                label="Balance"
                value={
                  balance === 0
                    ? "All paid"
                    : balance < 0
                      ? `Owes £${Math.abs(balance).toFixed(2)}`
                      : `In credit £${balance.toFixed(2)}`
                }
                valueColor={balance < 0 ? "#1877D6" : "#1877D6"}
              />
              <StatChip label="Test" value={formatTestDate(pupil.test_date)} />
            </div>

            {(() => {
              const lc = actualLessonCount ?? 0;
              const theoryPass = !!pupil?.theory_pass;
              const syllabusPoints = Math.min((syllabusSum / 135) * 60, 60);
              const lessonPoints = Math.min((lc / 40) * 30, 30);
              const theoryPoints = theoryPass ? 10 : 0;
              const score = Math.round(syllabusPoints + lessonPoints + theoryPoints);
              console.log("[test-readiness] score:", score, "syllabus:", syllabusPoints, "lessons:", lessonPoints, "theory:", theoryPoints);
              let barColor = "#1877D6";
              if (score >= 100) barColor = "#1877D6";
              else if (score >= 71) barColor = "#1877D6";
              else if (score >= 41) barColor = "#1877D6";
              return (
                <div className="mt-4">
                  <div
                    className="text-[11px] font-medium uppercase"
                    style={{ color: "#6B7280", letterSpacing: "0.05em", ...POPPINS }}
                  >
                    TEST READINESS
                  </div>
                  <div className="flex items-center gap-3 mt-2">
                    <div
                      className="flex-1 h-2 rounded-full overflow-hidden"
                      style={{ backgroundColor: "#EEF2F7" }}
                    >
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${score}%`, backgroundColor: barColor }}
                      />
                    </div>
                    <div
                      className="text-[14px] font-bold"
                      style={{ color: "#0B1F3A", ...POPPINS }}
                    >
                      {score}%
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-2 gap-2">
                    <div className="text-[12px]" style={{ color: "#6B7280", ...POPPINS }}>
                      Syllabus {Math.round(syllabusPoints)}/60 · Lessons {Math.round(lessonPoints)}/30 · Theory {theoryPoints}/10
                    </div>
                    <Button
                      variant="ghost"
                      onClick={() => navigate({ to: "/pupils/syllabus/$id", params: { id } })}
                    >
                      View
                    </Button>
                  </div>
                </div>
              );
            })()}
          </Card>
        </div>
      )}

      {/* Emergency contact, licence, custom rates, calendar colour */}
      {pupil && (
        <PupilExtras
          pupil={pupil}
          instructorRate={instructorRate}
          onUpdated={(patch) => setPupil((p) => (p ? { ...p, ...patch } : p))}
        />
      )}

      {/* Intake answers */}
      <div className="px-4">
        <SectionHeader>INTAKE ANSWERS</SectionHeader>
        {intakeAnswers === null ? null : intakeAnswers.length === 0 ? (
          <div className="text-[14px] text-[#6B7280]" style={POPPINS}>
            No intake answers recorded
          </div>
        ) : (
          <div
            className="bg-white"
            style={{
              borderRadius: 12,
              borderWidth: "0.5px",
              borderStyle: "solid",
              borderColor: "#EEF2F7",
              padding: 16,
            }}
          >
            <div className="flex items-center gap-2 mb-3">
              <ClipboardList size={18} color="#1877D6" />
              <div className="text-[14px] font-semibold" style={{ color: "#0B1F3A", ...POPPINS }}>
                Intake answers
              </div>
            </div>
            {intakeAnswers.map((a, i) => (
              <div key={a.id}>
                <div className="text-[12px]" style={{ color: "#6B7280", ...POPPINS }}>
                  {a.intake_questions?.question ?? "Question"}
                </div>
                <div
                  className="text-[14px] font-semibold mt-0.5"
                  style={{ color: "#0B1F3A", ...POPPINS }}
                >
                  {a.answer ?? a.answer_text ?? String(a.value ?? "")}
                </div>
                {i < intakeAnswers.length - 1 && (
                  <div style={{ height: 0.5, backgroundColor: "#F3F4F6", margin: "12px 0" }} />
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="px-4">
        <SectionHeader>QUICK ACTIONS</SectionHeader>
        <div className="grid grid-cols-3 gap-2">
          <a
            href={pupil?.phone ? `tel:${pupil.phone}` : undefined}
            aria-label="Call"
            className="inline-flex items-center justify-center text-[13px] font-medium text-white"
            style={{ height: 40, borderRadius: 8, backgroundColor: "#1877D6", ...POPPINS }}
          >
            Call
          </a>
          <a
            href={pupil?.phone ? `sms:${pupil.phone}` : undefined}
            aria-label="Text"
            className="inline-flex items-center justify-center text-[13px] font-medium"
            style={{
              height: 40,
              borderRadius: 8,
              backgroundColor: "#F3F4F6",
              color: "#0B1F3A",
              ...POPPINS,
            }}
          >
            Text
          </a>
          <button
            type="button"
            onClick={() => navigate({ to: "/lessons/new" })}
            className="inline-flex items-center justify-center text-[13px] font-medium text-white"
            style={{
              height: 40,
              borderRadius: 8,
              backgroundColor: "#1877D6",
              border: "none",
              ...POPPINS,
            }}
          >
            Add lesson
          </button>
          <button
            type="button"
            onClick={() => setCertOpen(true)}
            className="inline-flex items-center justify-center gap-1 text-[13px] font-medium text-white col-span-3"
            style={{
              height: 40,
              borderRadius: 8,
              backgroundColor: "#1877D6",
              border: "none",
              ...POPPINS,
            }}
          >
            <Award size={16} color="#FFFFFF" />
            Certificate
          </button>
        </div>
        <div className="mt-2">
          <Button
            variant="ghost"
            onClick={() => navigate({ to: "/pupils/history/$id", params: { id } })}
          >
            History
          </Button>
        </div>
        <div className="mt-2">
          <Button
            variant="ghost"
            onClick={() => navigate({ to: "/pupils/progress/$id", params: { id } })}
          >
            Progress
          </Button>
        </div>
        <div className="mt-2">
          <button
            type="button"
            onClick={() => navigate({ to: "/pupils/syllabus/$id", params: { id } })}
            className="w-full inline-flex items-center justify-between px-3"
            style={{
              height: 40,
              borderRadius: 8,
              backgroundColor: "#F3F4F6",
              color: "#0B1F3A",
              border: "none",
              ...POPPINS,
            }}
          >
            <span className="inline-flex items-center gap-2 text-[13px] font-medium">
              <BookOpen size={16} color="#0B1F3A" />
              Syllabus
            </span>
            <span className="text-[12px] font-semibold" style={{ color: "#1877D6" }}>
              {syllabusPct == null ? "—" : `${syllabusPct}%`}
            </span>
          </button>
        </div>
        <div className="mt-2">
          <button
            type="button"
            onClick={() => navigate({ to: "/test-day/$pupilId", params: { pupilId: id } })}
            className="w-full inline-flex items-center justify-center gap-2 text-[13px] font-medium text-white"
            style={{
              height: 40,
              borderRadius: 8,
              backgroundColor: "#1877D6",
              border: "none",
              ...POPPINS,
            }}
          >
            <Flag size={16} color="#FFFFFF" />
            Test day
          </button>
        </div>
        <div className="mt-2">
          <button
            type="button"
            onClick={() => navigate({ to: "/reflective-log/$pupilId", params: { pupilId: id } })}
            className="w-full inline-flex items-center justify-center gap-2 text-[13px] font-medium text-white"
            style={{
              height: 40,
              borderRadius: 8,
              backgroundColor: "#7C3AED",
              border: "none",
              ...POPPINS,
            }}
          >
            <BookOpen size={16} color="#FFFFFF" />
            Reflective log
          </button>
        </div>
        <div className="mt-2">
          <button
            type="button"
            onClick={() => navigate({ to: "/mock-tests/$pupilId", params: { pupilId: id } })}
            className="w-full inline-flex items-center justify-center gap-2 text-[13px] font-medium text-white"
            style={{
              height: 40,
              borderRadius: 8,
              backgroundColor: "#0891B2",
              border: "none",
              ...POPPINS,
            }}
          >
            <ClipboardCheck size={16} color="#FFFFFF" />
            Mock test
          </button>
        </div>
        <div className="mt-2">
          <button
            type="button"
            onClick={() => navigate({ to: "/driving-test/$pupilId", params: { pupilId: id } })}
            className="w-full inline-flex items-center justify-center gap-2 text-[13px] font-medium text-white"
            style={{
              height: 40,
              borderRadius: 8,
              backgroundColor: "#D97706",
              border: "none",
              ...POPPINS,
            }}
          >
            <Trophy size={16} color="#FFFFFF" />
            Test result
          </button>
        </div>






        <SectionHeader>UPCOMING LESSONS</SectionHeader>
        {lessons === null ? null : lessons.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-[14px] text-[#6B7280]" style={POPPINS}>
              No upcoming lessons
            </p>
          </div>
        ) : (
          <div className="flex flex-col">
            {lessons.map((l, idx) => {
              const d = new Date(`${l.lesson_date}T00:00:00`);
              const prev = idx > 0 ? lessons[idx - 1] : null;
              const gapDays = prev ? daysBetween(prev.lesson_date, l.lesson_date) : 0;
              const live = isLessonLive(l);
              const past = isLessonPast(l);
              const accent = accentColor(l);
              const price = Number(l.price ?? 0);
              const unpaid = !l.is_paid && price > 0;
              const showGap = gapDays > 7;

              return (
                <Fragment key={l.id}>
                  {showGap && (
                    <div className="flex items-center justify-center py-3">
                      <span className="text-[11px]" style={{ color: "#9CA3AF", ...POPPINS }}>
                        {gapDays} day{gapDays > 1 ? "s" : ""} gap
                      </span>
                    </div>
                  )}
                  <div
                    className="flex items-stretch cursor-pointer"
                    style={{ minHeight: 56 }}
                    onClick={() => navigate({ to: "/lessons/$id", params: { id: l.id } })}
                  >
                    {/* Left time column */}
                    <div
                      className="flex flex-col items-center justify-center shrink-0"
                      style={{ width: 40, padding: "8px 0" }}
                    >
                      <span className="text-[12px] font-bold" style={{ color: "#0B1F3A", ...POPPINS }}>
                        {formatTime(l.lesson_time)}
                      </span>
                      <span className="text-[10px]" style={{ color: "#9CA3AF", ...POPPINS }}>
                        {l.duration_minutes ?? 60}m
                      </span>
                    </div>

                    {/* Accent bar */}
                    <div className="shrink-0" style={{ width: 3, backgroundColor: accent, borderRadius: 2 }} />

                    {/* Content */}
                    <div className="flex-1 min-w-0 flex flex-col justify-center px-3 py-2">
                      <div className="text-[13px] font-semibold truncate" style={{ color: "#0B1F3A", ...POPPINS }}>
                        {formatDateShort(d)}
                      </div>
                      {l.lesson_type && (
                        <div className="text-[11px] truncate" style={{ color: "#6B7280", ...POPPINS }}>
                          {l.lesson_type}
                        </div>
                      )}
                      {l.notes && (
                        <div className="text-[11px] truncate" style={{ color: "#9CA3AF", ...POPPINS }}>
                          {l.notes}
                        </div>
                      )}

                      {/* Badges */}
                      <div className="flex flex-wrap items-center gap-1 mt-1">
                        {live && (
                          <span
                            className="inline-flex items-center gap-1 text-[10px] font-medium text-white px-1.5 py-0.5 rounded-full"
                            style={{ backgroundColor: "#1877D6", ...POPPINS }}
                          >
                            <span className="relative flex h-1.5 w-1.5">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
                              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-white" />
                            </span>
                            Live
                          </span>
                        )}
                        {past && l.status !== "cancelled" && !l.end_of_lesson_completed && (
                          <span
                            className="text-[10px] font-medium text-white px-1.5 py-0.5 rounded-full"
                            style={{ backgroundColor: "#1877D6", ...POPPINS }}
                          >
                            EOL pending
                          </span>
                        )}
                        {l.is_paid && (
                          <span
                            className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full border"
                            style={{ backgroundColor: "#E7F8EF", color: "#067647", borderColor: "#B8ECCF", ...POPPINS }}
                          >
                            Paid ✓
                          </span>
                        )}
                        {unpaid && past && (
                          <span
                            className="text-[10px] font-medium text-white px-1.5 py-0.5 rounded-full"
                            style={{ backgroundColor: "#1877D6", ...POPPINS }}
                          >
                            £{price.toFixed(2)} due
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Chevron */}
                    <div className="flex items-center justify-center shrink-0 px-2">
                      <ChevronRight size={14} color="#9CA3AF" />
                    </div>
                  </div>
                  {/* Hairline divider */}
                  <div style={{ height: 0.5, backgroundColor: "#F3F4F6", marginLeft: 43 }} />
                </Fragment>
              );
            })}
          </div>
        )}

        {pupil?.lead_source && (
          <>
            <SectionHeader>LEAD SOURCE</SectionHeader>
            <div
              className="rounded-lg bg-white px-3 py-2 text-[14px] text-[#0B1F3A]"
              style={{
                ...POPPINS,
                borderWidth: "0.5px",
                borderStyle: "solid",
                borderColor: "#EEF2F7",
              }}
            >
              {pupil.lead_source}
              {pupil.lead_source_detail ? ` — ${pupil.lead_source_detail}` : ""}
            </div>
          </>
        )}

        {pupil?.lead_source === "National Intensive" && (() => {
          const total = Number(pupil.ni_amount_total ?? 0);
          const paid = Number(pupil.ni_amount_paid ?? 0);
          const outstanding = total - paid;
          let paidColor = "#1877D6";
          if (total > 0 && paid >= total) paidColor = "#1877D6";
          else if (paid > 0) paidColor = "#1877D6";
          const payerLabel =
            pupil.ni_payer === "national_intensives"
              ? "National Intensives (agency)"
              : pupil.ni_payer === "pupil"
              ? "Pupil direct"
              : "—";
          return (
            <div
              className="bg-white"
              style={{
                marginTop: 12,
                padding: 16,
                borderRadius: 12,
                borderWidth: "0.5px",
                borderStyle: "solid",
                borderColor: "#EEF2F7",
              }}
            >
              <div className="flex items-center gap-2 mb-3">
                <span
                  className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                  style={{ backgroundColor: "#EEF4FB", color: "#1877D6", ...POPPINS }}
                >
                  National Intensive
                </span>
                <span
                  className="text-[13px] font-semibold"
                  style={{ color: "#0B1F3A", ...POPPINS }}
                >
                  Payment details
                </span>
              </div>
              <NIRow label="Total course fee" value={pupil.ni_amount_total != null ? `£${total.toFixed(2)}` : "—"} />
              <NIRow label="Paying party" value={payerLabel} />
              <NIRow
                label="Amount paid"
                value={`£${paid.toFixed(2)}`}
                valueColor={paidColor}
              />
              <NIRow
                label="Payment date"
                value={pupil.ni_payment_date ? new Date(`${pupil.ni_payment_date}T00:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "Not recorded"}
              />
              <NIRow label="Reference" value={pupil.ni_reference || "—"} />
              {total > 0 && (
                outstanding > 0 ? (
                  <div
                    style={{
                      marginTop: 12,
                      padding: "10px 12px",
                      borderRadius: 8,
                      backgroundColor: "#FEF2F2",
                      border: "1px solid #FECACA",
                      color: "#1877D6",
                      fontSize: 13,
                      fontWeight: 600,
                      ...POPPINS,
                    }}
                  >
                    £{outstanding.toFixed(2)} outstanding from National Intensives
                  </div>
                ) : (
                  <div
                    style={{
                      marginTop: 12,
                      padding: "10px 12px",
                      borderRadius: 8,
                      backgroundColor: "#F0FDF4",
                      border: "1px solid #DBEAFE",
                      color: "#1877D6",
                      fontSize: 13,
                      fontWeight: 600,
                      ...POPPINS,
                    }}
                  >
                    Fully paid ✓
                  </div>
                )
              )}

              {(() => {
                const prepaid = Number(pupil.prepaid_hours ?? 0);
                if (!(total > 0 || prepaid > 0)) return null;
                const effectiveRate =
                  total > 0 && prepaid > 0
                    ? total / prepaid
                    : instructorRate ?? 0;
                const hoursPurchased =
                  prepaid > 0
                    ? prepaid
                    : effectiveRate > 0
                    ? total / effectiveRate
                    : 0;
                const hoursRemaining = hoursPurchased - hoursCompleted;
                let remainColor = "#1877D6";
                if (hoursRemaining > 5) remainColor = "#1877D6";
                else if (hoursRemaining >= 1) remainColor = "#1877D6";
                const pct =
                  hoursPurchased > 0
                    ? Math.min(100, Math.max(0, (hoursCompleted / hoursPurchased) * 100))
                    : 0;
                return (
                  <>
                    <div
                      className="mt-3 pt-3 text-[11px] font-semibold uppercase tracking-wide"
                      style={{ color: "#6B7280", borderTop: "0.5px solid #EEF2F7", ...POPPINS }}
                    >
                      Hours
                    </div>
                    <NIRow label="Hours purchased" value={`${hoursPurchased.toFixed(1)} hrs`} />
                    <NIRow label="Hours completed" value={`${hoursCompleted.toFixed(1)} hrs`} />
                    <NIRow
                      label="Hours remaining"
                      value={`${hoursRemaining.toFixed(1)} hrs`}
                      valueColor={remainColor}
                    />
                    {total > 0 && prepaid > 0 && (
                      <NIRow
                        label="Rate per hour"
                        value={`£${(total / prepaid).toFixed(2)}/hr`}
                      />
                    )}
                    <div
                      style={{
                        marginTop: 10,
                        height: 8,
                        borderRadius: 4,
                        backgroundColor: "#F3F8FF",
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          width: `${pct}%`,
                          height: "100%",
                          backgroundColor: "#1877D6",
                          borderRadius: 4,
                        }}
                      />
                    </div>
                  </>
                );
              })()}


              <div
                className="mt-3 pt-3 text-[11px] font-semibold uppercase tracking-wide"
                style={{ color: "#6B7280", borderTop: "0.5px solid #EEF2F7", ...POPPINS }}
              >
                Test details
              </div>
              <NIRow
                label="Test date"
                value={pupil.test_date ? new Date(`${pupil.test_date}T00:00:00`).toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" }) : "—"}
              />
              <NIRow label="Test time" value={pupil.test_time ? pupil.test_time.slice(0, 5) : "—"} />
              <NIRow label="Test centre" value={pupil.test_centre || "—"} />

              <div
                className="mt-3 pt-3 text-[11px] font-semibold uppercase tracking-wide"
                style={{ color: "#6B7280", borderTop: "0.5px solid #EEF2F7", ...POPPINS }}
              >
                EverySwap
              </div>
              <div
                className="flex items-center justify-between py-1.5"
                style={{ borderTop: "0.5px solid #F3F4F6" }}
              >
                <span className="text-[12px]" style={{ color: "#6B7280", ...POPPINS }}>
                  Swap status
                </span>
                {pupil.wants_swap ? (
                  <span className="flex items-center gap-2">
                    <span
                      className="text-[11px] font-semibold text-white px-2 py-0.5 rounded-full"
                      style={{ backgroundColor: "#1877D6", ...POPPINS }}
                    >
                      On EverySwap list
                    </span>
                    <span className="text-[11px]" style={{ color: "#9CA3AF", ...POPPINS }}>
                      Seeking swap
                    </span>
                  </span>
                ) : (
                  <span className="text-[12px]" style={{ color: "#9CA3AF", ...POPPINS }}>
                    Not on swap list
                  </span>
                )}
              </div>

              <div className="mt-3 flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => navigate({ to: "/pupils/edit/$id", params: { id } })}
                  className="text-[13px] font-medium"
                  style={{ color: "#1877D6", ...POPPINS }}
                >
                  Edit payment details
                </button>
                <button
                  type="button"
                  onClick={() => navigate({ to: "/pupils/edit/$id", params: { id } })}
                  className="text-[13px] font-medium"
                  style={{ color: "#1877D6", ...POPPINS }}
                >
                  Manage swap
                </button>
              </div>
            </div>
          );
        })()}


        <SectionHeader>NOTES</SectionHeader>
        <textarea
          rows={3}
          value={notesDraft}
          onChange={(e) => setNotesDraft(e.target.value)}
          placeholder="Add a note about this pupil…"
          className="w-full rounded-lg p-3 text-[14px] text-[#0B1F3A] bg-white focus:border-[#1877D6] focus:outline-none"
          style={{
            ...POPPINS,
            borderWidth: "0.5px",
            borderStyle: "solid",
            borderColor: "#EEF2F7",
            resize: "vertical",
          }}
        />
        <div className="mt-2 flex items-center justify-end gap-3">
          {noteSaved && (
            <span className="text-[12px]" style={{ color: "#1877D6", ...POPPINS }}>
              Saved
            </span>
          )}
          <Button onClick={saveNotes} disabled={savingNotes} inline>
            {savingNotes ? "Saving…" : "Save note"}
          </Button>
        </div>
      </div>

      <ConfirmDialog
        open={removeOpen}
        title={`Remove ${pupil?.name ?? "pupil"}?`}
        message={`${pupil?.name ?? "They"} will be marked inactive and hidden from all lists.`}
        confirmLabel="Remove"
        onConfirm={removePupil}
        onCancel={() => setRemoveOpen(false)}
      />

      {certOpen && (
        <div className="fixed inset-0 z-[60] flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/40" onClick={() => setCertOpen(false)} />
          <div
            className="relative w-full max-w-[430px] mx-auto bg-white rounded-t-2xl px-4 pt-5 pb-8"
            style={{ ...POPPINS, animation: "slideUp 0.25s ease-out" }}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Award size={20} color="#1877D6" />
                <div className="text-[16px] font-semibold text-[#0B1F3A]">Generate certificate</div>
              </div>
              <button type="button" onClick={() => setCertOpen(false)} aria-label="Close">
                <X size={20} color="#6B7280" />
              </button>
            </div>

            <label className="block mb-1 text-[12px] font-medium text-[#6B7280]">Milestone</label>
            <select
              value={certMilestone}
              onChange={(e) => setCertMilestone(e.target.value as typeof certMilestone)}
              className="h-11 w-full rounded-lg px-3 text-[14px] text-[#0B1F3A] bg-white focus:border-[#1877D6] focus:outline-none mb-4"
              style={{ ...POPPINS, borderWidth: "0.5px", borderStyle: "solid", borderColor: "#EEF2F7" }}
            >
              <option value="first_lesson">First lesson complete</option>
              <option value="10_lessons">10 lessons complete</option>
              <option value="20_lessons">20 lessons complete</option>
              <option value="theory_pass">Theory test passed</option>
              <option value="test_pass">Driving test passed! 🎉</option>
            </select>

            <button
              type="button"
              onClick={() => {
                const milestoneTitles: Record<typeof certMilestone, string> = {
                  first_lesson: "First Lesson Complete",
                  "10_lessons": "10 Lessons Complete",
                  "20_lessons": "20 Lessons Complete",
                  theory_pass: "Theory Test Passed",
                  test_pass: "Driving Test Passed!",
                };
                const achievementText: Record<typeof certMilestone, string> = {
                  test_pass: "has successfully passed their practical driving test",
                  theory_pass: "has successfully passed their theory test",
                  first_lesson: "has completed their first driving lesson",
                  "10_lessons": "has completed 10 driving lessons",
                  "20_lessons": "has completed 20 driving lessons",
                };
                const pupilName = pupil?.name ?? "Pupil";
                const milestone = milestoneTitles[certMilestone];

                const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
                const W = 297;
                const H = 210;

                // Double border
                doc.setDrawColor(15, 32, 68);
                doc.setLineWidth(1.0);
                doc.rect(3, 3, W - 6, H - 6);
                doc.setLineWidth(0.3);
                doc.rect(7, 7, W - 14, H - 14);

                // Title
                doc.setTextColor(120, 120, 120);
                doc.setFont("helvetica", "normal");
                doc.setFontSize(14);
                doc.text("CERTIFICATE OF ACHIEVEMENT", W / 2, 40, { align: "center" });

                // Milestone heading
                doc.setTextColor(15, 32, 68);
                doc.setFont("helvetica", "bold");
                doc.setFontSize(28);
                doc.text(milestone, W / 2, 60, { align: "center" });

                // "This is to certify that"
                doc.setTextColor(120, 120, 120);
                doc.setFont("helvetica", "normal");
                doc.setFontSize(12);
                doc.text("This is to certify that", W / 2, 78, { align: "center" });

                // Pupil name
                doc.setTextColor(30, 30, 30);
                doc.setFont("helvetica", "bold");
                doc.setFontSize(24);
                doc.text(pupilName, W / 2, 92, { align: "center" });

                // Underline
                doc.setDrawColor(15, 32, 68);
                doc.setLineWidth(0.5);
                const nameWidth = doc.getTextWidth(pupilName);
                doc.line(W / 2 - nameWidth / 2 - 4, 96, W / 2 + nameWidth / 2 + 4, 96);

                // Achievement
                doc.setTextColor(120, 120, 120);
                doc.setFont("helvetica", "normal");
                doc.setFontSize(12);
                doc.text(achievementText[certMilestone], W / 2, 112, { align: "center" });

                // Date + Instructor
                const today = new Date();
                const dd = String(today.getDate()).padStart(2, "0");
                const mm = String(today.getMonth() + 1).padStart(2, "0");
                const yy = String(today.getFullYear()).slice(-2);
                doc.setFontSize(10);
                doc.setTextColor(60, 60, 60);
                doc.text(`Date: ${dd}/${mm}/${yy}`, 40, 132);
                doc.text(`Instructor: ${instructorName || "—"}`, W - 40, 132, { align: "right" });

                // Signature line
                doc.setDrawColor(150, 150, 150);
                doc.setLineWidth(0.3);
                doc.line(W / 2 - 40, 148, W / 2 + 40, 148);
                doc.setFontSize(9);
                doc.setTextColor(120, 120, 120);
                doc.text("Signature", W / 2, 154, { align: "center" });

                // Footer
                doc.setFontSize(8);
                doc.setTextColor(150, 150, 150);
                doc.text("Issued by EveryDriver · everydriver.co.uk · DVSA Approved", W / 2, 165, {
                  align: "center",
                });

                doc.save(`${pupilName} - ${milestone} - Certificate.pdf`);
                setCertOpen(false);
                toast.success("Certificate downloaded. Send to pupil manually.");
              }}
              className="w-full inline-flex items-center justify-center gap-2 text-[14px] font-medium text-white"
              style={{ height: 44, borderRadius: 8, backgroundColor: "#1877D6", ...POPPINS }}
            >
              <Award size={16} color="#FFFFFF" />
              Generate & download
            </button>
          </div>
        </div>
      )}

      <style>{`@keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }`}</style>
    </div>
  );
}

function StatChip({
  label,
  value,
  valueColor = "#0B1F3A",
}: {
  label: string;
  value: string;
  valueColor?: string;
}) {
  return (
    <div
      className="rounded-lg px-2 py-2 text-center"
      style={{
        backgroundColor: "#F8F9FB",
        borderWidth: "0.5px",
        borderStyle: "solid",
        borderColor: "#EEF2F7",
      }}
    >
      <div
        className="text-[14px] font-semibold truncate"
        style={{ color: valueColor, ...POPPINS }}
      >
        {value}
      </div>
      <div
        className="text-[10px] font-medium uppercase mt-0.5"
        style={{ color: "#6B7280", letterSpacing: "0.05em", ...POPPINS }}
      >
        {label}
      </div>
    </div>
  );
}

function NIRow({
  label,
  value,
  valueColor = "#0B1F3A",
}: {
  label: string;
  value: string;
  valueColor?: string;
}) {
  return (
    <div
      className="flex items-center justify-between py-1.5"
      style={{ borderTop: "0.5px solid #F3F4F6" }}
    >
      <span className="text-[12px]" style={{ color: "#6B7280", ...POPPINS }}>
        {label}
      </span>
      <span className="text-[13px] font-semibold" style={{ color: valueColor, ...POPPINS }}>
        {value}
      </span>
    </div>
  );
}

const RELATIONS = ["Parent", "Spouse", "Partner", "Sibling", "Friend", "Guardian", "Other"];
const CAL_COLOURS = ["#1A52A0", "#16A34A", "#CC2229", "#D97706", "#7C3AED", "#0891B2", "#EC4899", "#0F2044"];
const EXTRAS_CARD: React.CSSProperties = {
  borderRadius: 12,
  border: "0.5px solid #E2E6ED",
  padding: 16,
  marginLeft: 16,
  marginRight: 16,
  marginTop: 12,
  background: "#fff",
};
const EXTRAS_INPUT: React.CSSProperties = {
  width: "100%",
  height: 40,
  padding: "0 12px",
  border: "0.5px solid #E2E6ED",
  borderRadius: 8,
  fontSize: 14,
  color: "#0B1F3A",
  background: "#fff",
  ...POPPINS,
};

function PupilExtras({
  pupil,
  instructorRate,
  onUpdated,
}: {
  pupil: Pupil;
  instructorRate: number | null;
  onUpdated: (patch: Partial<Pupil>) => void;
}) {
  const [editEmg, setEditEmg] = useState(false);
  const [emgName, setEmgName] = useState(pupil.emergency_contact_name ?? "");
  const [emgPhone, setEmgPhone] = useState(pupil.emergency_contact_phone ?? "");
  const [emgRel, setEmgRel] = useState(pupil.emergency_contact_relation ?? "Parent");
  const [savingEmg, setSavingEmg] = useState(false);

  const [editLic, setEditLic] = useState(false);
  const [licence, setLicence] = useState(pupil.driving_licence_number ?? "");
  const [savingLic, setSavingLic] = useState(false);

  const [r1, setR1] = useState(pupil.custom_rate != null ? String(pupil.custom_rate) : "");
  const [r90, setR90] = useState(pupil.custom_rate_90 != null ? String(pupil.custom_rate_90) : "");
  const [r120, setR120] = useState(pupil.custom_rate_120 != null ? String(pupil.custom_rate_120) : "");
  const [editRates, setEditRates] = useState(false);
  const [savingRates, setSavingRates] = useState(false);

  useEffect(() => {
    if (editRates) {
      setR1(pupil.custom_rate != null ? String(pupil.custom_rate) : "");
      setR90(pupil.custom_rate_90 != null ? String(pupil.custom_rate_90) : "");
      setR120(pupil.custom_rate_120 != null ? String(pupil.custom_rate_120) : "");
    }
  }, [editRates, pupil.custom_rate, pupil.custom_rate_90, pupil.custom_rate_120]);

  async function patchPupil(patch: Record<string, unknown>) {
    console.log("[custom-rates] patchPupil url:", `pupils?id=eq.${pupil.id}`, "payload:", patch);
    const { data, error, status } = await supabase.from("pupils").update(patch).eq("id", pupil.id).select();
    console.log("[custom-rates] result:", status, data, error);
    if (error) {
      console.error("[pupil] patch error", error);
      toast.error("Save failed");
      return false;
    }
    return true;
  }

  async function saveEmg() {
    if (!emgName.trim() || !emgPhone.trim()) {
      toast.error("Name and phone required");
      return;
    }
    setSavingEmg(true);
    const ok = await patchPupil({
      emergency_contact_name: emgName.trim(),
      emergency_contact_phone: emgPhone.trim(),
      emergency_contact_relation: emgRel,
    });
    setSavingEmg(false);
    if (ok) {
      onUpdated({
        emergency_contact_name: emgName.trim(),
        emergency_contact_phone: emgPhone.trim(),
        emergency_contact_relation: emgRel,
      });
      setEditEmg(false);
      toast.success("Emergency contact saved");
    }
  }

  async function saveLic() {
    setSavingLic(true);
    const val = licence.trim() || null;
    const ok = await patchPupil({ driving_licence_number: val });
    setSavingLic(false);
    if (ok) {
      onUpdated({ driving_licence_number: val });
      setEditLic(false);
      toast.success("Licence saved");
    }
  }

  async function saveRates() {
    setSavingRates(true);
    const patch = {
      custom_rate: r1 === "" ? null : Number(r1),
      custom_rate_90: r90 === "" ? null : Number(r90),
      custom_rate_120: r120 === "" ? null : Number(r120),
    };
    console.log("[custom-rates] saving:", patch);
    const ok = await patchPupil(patch);
    setSavingRates(false);
    if (ok) {
      onUpdated(patch);
      setR1(patch.custom_rate != null ? String(patch.custom_rate) : "");
      setR90(patch.custom_rate_90 != null ? String(patch.custom_rate_90) : "");
      setR120(patch.custom_rate_120 != null ? String(patch.custom_rate_120) : "");
      setEditRates(false);
      toast.success("Custom rates saved");
    }
  }

  async function clearRates() {
    setR1(""); setR90(""); setR120("");
    const patch = { custom_rate: null, custom_rate_90: null, custom_rate_120: null };
    const ok = await patchPupil(patch);
    if (ok) {
      onUpdated(patch);
      setEditRates(false);
      toast.success("Custom rates cleared");
    }
  }

  async function pickColour(hex: string) {
    const next = pupil.calendar_colour === hex ? null : hex;
    const ok = await patchPupil({ calendar_colour: next });
    if (ok) onUpdated({ calendar_colour: next });
  }

  return (
    <>
      {/* Emergency contact */}
      <div style={EXTRAS_CARD}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Heart size={18} color="#CC2229" />
            <span className="text-[14px] font-semibold" style={{ color: "#0B1F3A", ...POPPINS }}>Emergency contact</span>
          </div>
          {!editEmg && (
            <button type="button" onClick={() => setEditEmg(true)} className="text-[12px] font-semibold" style={{ color: "#1877D6", ...POPPINS }}>
              {pupil.emergency_contact_name ? "Edit" : "Add"}
            </button>
          )}
        </div>
        {!editEmg ? (
          pupil.emergency_contact_name ? (
            <div>
              <div className="text-[14px] font-semibold" style={{ color: "#0B1F3A", ...POPPINS }}>{pupil.emergency_contact_name}</div>
              <div className="flex items-center gap-2 mt-1">
                <a href={`tel:${pupil.emergency_contact_phone ?? ""}`} className="text-[13px]" style={{ color: "#1877D6", ...POPPINS }}>
                  {pupil.emergency_contact_phone}
                </a>
                {pupil.emergency_contact_relation && (
                  <span className="text-[11px] px-2 py-0.5 rounded-full" style={{ background: "#EEF2F7", color: "#0B1F3A", ...POPPINS }}>
                    {pupil.emergency_contact_relation}
                  </span>
                )}
              </div>
            </div>
          ) : (
            <div className="text-[13px]" style={{ color: "#6B7280", ...POPPINS }}>No emergency contact set</div>
          )
        ) : (
          <div className="flex flex-col gap-2">
            <input style={EXTRAS_INPUT} placeholder="Name" value={emgName} onChange={(e) => setEmgName(e.target.value)} />
            <input style={EXTRAS_INPUT} placeholder="Phone" type="tel" value={emgPhone} onChange={(e) => setEmgPhone(e.target.value)} />
            <select style={EXTRAS_INPUT} value={emgRel} onChange={(e) => setEmgRel(e.target.value)}>
              {RELATIONS.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
            <div className="flex gap-2 mt-1">
              <button type="button" onClick={saveEmg} disabled={savingEmg} className="flex-1 h-10 rounded-lg text-white text-[13px] font-semibold" style={{ background: "#1877D6", ...POPPINS }}>
                {savingEmg ? "Saving…" : "Save"}
              </button>
              <button type="button" onClick={() => setEditEmg(false)} className="h-10 px-4 rounded-lg text-[13px] font-semibold" style={{ background: "#F3F4F6", color: "#0B1F3A", ...POPPINS }}>
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Driving licence */}
      <div style={EXTRAS_CARD}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <CreditCard size={18} color="#1877D6" />
            <span className="text-[14px] font-semibold" style={{ color: "#0B1F3A", ...POPPINS }}>Driving licence</span>
          </div>
          {!editLic && (
            <button type="button" onClick={() => setEditLic(true)} className="text-[12px] font-semibold" style={{ color: "#1877D6", ...POPPINS }}>
              {pupil.driving_licence_number ? "Edit" : "Add"}
            </button>
          )}
        </div>
        {!editLic ? (
          <div>
            <div className="text-[14px] font-semibold tracking-wider" style={{ color: "#0B1F3A", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>
              {pupil.driving_licence_number ? pupil.driving_licence_number.toUpperCase().replace(/(.{5})(.{6})(.{5})/, "$1 $2 $3") : "Not set"}
            </div>
            <div className="text-[11px] mt-1" style={{ color: "#9CA3AF", ...POPPINS }}>Verify with DVLA (coming soon)</div>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <input style={EXTRAS_INPUT} placeholder="e.g. MORGA657054SM9IJ" value={licence} onChange={(e) => setLicence(e.target.value.toUpperCase())} maxLength={20} />
            <div className="flex gap-2 mt-1">
              <button type="button" onClick={saveLic} disabled={savingLic} className="flex-1 h-10 rounded-lg text-white text-[13px] font-semibold" style={{ background: "#1877D6", ...POPPINS }}>
                {savingLic ? "Saving…" : "Save"}
              </button>
              <button type="button" onClick={() => setEditLic(false)} className="h-10 px-4 rounded-lg text-[13px] font-semibold" style={{ background: "#F3F4F6", color: "#0B1F3A", ...POPPINS }}>
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Custom rates */}
      <div style={EXTRAS_CARD}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <PoundSterling size={18} color="#1877D6" />
            <span className="text-[14px] font-semibold" style={{ color: "#0B1F3A", ...POPPINS }}>Custom lesson rates</span>
          </div>
          {!editRates && (
            <button type="button" onClick={() => setEditRates(true)} className="text-[12px] font-semibold" style={{ color: "#1877D6", ...POPPINS }}>
              {pupil.custom_rate != null || pupil.custom_rate_90 != null || pupil.custom_rate_120 != null ? "Edit" : "Add"}
            </button>
          )}
        </div>
        <div className="text-[12px] mb-3" style={{ color: "#6B7280", ...POPPINS }}>
          Default: {instructorRate != null ? `£${instructorRate}/hr` : "not set"}
        </div>
        {!editRates ? (
          pupil.custom_rate != null || pupil.custom_rate_90 != null || pupil.custom_rate_120 != null ? (
            <div className="flex flex-col gap-1">
              {pupil.custom_rate != null && (
                <div className="text-[13px]" style={{ color: "#0B1F3A", ...POPPINS }}>
                  1 hour: <span className="font-semibold">£{pupil.custom_rate}</span>
                </div>
              )}
              {pupil.custom_rate_90 != null && (
                <div className="text-[13px]" style={{ color: "#0B1F3A", ...POPPINS }}>
                  1.5 hour: <span className="font-semibold">£{pupil.custom_rate_90}</span>
                </div>
              )}
              {pupil.custom_rate_120 != null && (
                <div className="text-[13px]" style={{ color: "#0B1F3A", ...POPPINS }}>
                  2 hour: <span className="font-semibold">£{pupil.custom_rate_120}</span>
                </div>
              )}
            </div>
          ) : (
            <div className="text-[13px]" style={{ color: "#6B7280", ...POPPINS }}>Using default instructor rate</div>
          )
        ) : (
          <div className="flex flex-col gap-2">
            <label className="text-[12px]" style={{ color: "#6B7280", ...POPPINS }}>1 hour lesson (£)</label>
            <input style={EXTRAS_INPUT} type="number" step="0.5" inputMode="decimal" placeholder={instructorRate != null ? String(instructorRate) : ""} value={r1} onChange={(e) => setR1(e.target.value)} />
            <label className="text-[12px] mt-1" style={{ color: "#6B7280", ...POPPINS }}>1.5 hour lesson (£)</label>
            <input style={EXTRAS_INPUT} type="number" step="0.5" inputMode="decimal" placeholder={instructorRate != null ? String(instructorRate * 1.5) : ""} value={r90} onChange={(e) => setR90(e.target.value)} />
            <label className="text-[12px] mt-1" style={{ color: "#6B7280", ...POPPINS }}>2 hour lesson (£)</label>
            <input style={EXTRAS_INPUT} type="number" step="0.5" inputMode="decimal" placeholder={instructorRate != null ? String(instructorRate * 2) : ""} value={r120} onChange={(e) => setR120(e.target.value)} />
            <div className="flex gap-2 mt-3">
              <button type="button" onClick={saveRates} disabled={savingRates} className="flex-1 h-10 rounded-lg text-white text-[13px] font-semibold" style={{ background: "#1877D6", ...POPPINS }}>
                {savingRates ? "Saving…" : "Save rates"}
              </button>
              <button type="button" onClick={() => setEditRates(false)} className="h-10 px-4 rounded-lg text-[13px] font-semibold" style={{ background: "#F3F4F6", color: "#0B1F3A", ...POPPINS }}>
                Cancel
              </button>
            </div>
            <button type="button" onClick={clearRates} className="mt-2 text-[12px] font-medium text-left" style={{ color: "#CC2229", ...POPPINS }}>
              Clear custom rates
            </button>
          </div>
        )}
      </div>

      {/* Calendar colour */}
      <div style={EXTRAS_CARD}>
        <div className="flex items-center gap-2 mb-3">
          <Palette size={18} color="#1877D6" />
          <span className="text-[14px] font-semibold" style={{ color: "#0B1F3A", ...POPPINS }}>Calendar colour</span>
        </div>
        <div className="grid grid-cols-8 gap-2">
          {CAL_COLOURS.map((c) => {
            const selected = pupil.calendar_colour === c;
            return (
              <button
                key={c}
                type="button"
                aria-label={`Colour ${c}`}
                onClick={() => pickColour(c)}
                className="flex items-center justify-center rounded-full"
                style={{ width: 32, height: 32, background: c, border: selected ? "2px solid #0B1F3A" : "0.5px solid #E2E6ED" }}
              >
                {selected && <Check size={16} color="#fff" />}
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}
