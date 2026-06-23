import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Camera, Loader2, Pencil, Phone, Trash2 } from "lucide-react";
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

const POPPINS = { fontFamily: "Poppins, sans-serif" } as const;

interface Pupil {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  lesson_count: number | null;
  balance_owed: number | null;
  status: string | null;
  test_date: string | null;
  notes: string | null;
  photo_url: string | null;
  photo_consent: boolean | null;
}

interface Lesson {
  id: string;
  lesson_date: string;
  lesson_time: string;
  duration_minutes: number | null;
  status: string;
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
  if (s === "active") return { bg: "#16A34A", label: "Active" };
  if (s === "passed") return { bg: "#1A52A0", label: "Passed" };
  return { bg: "#6B7280", label: s.charAt(0).toUpperCase() + s.slice(1) };
}
function lessonStatusColor(s: string) {
  if (s === "confirmed") return "#16A34A";
  if (s === "pending") return "#F59E0B";
  if (s === "cancelled") return "#CC2229";
  return "#6B7280";
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
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const photoRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    supabase
      .from("pupils")
      .select("id, name, phone, email, lesson_count, balance_owed, status, test_date, notes, photo_url, photo_consent")
      .eq("id", id)
      .is("deleted_at", null)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) console.error("[pupil] fetch error", error);
        const p = (data as Pupil) ?? null;
        setPupil(p);
        setNotesDraft(p?.notes ?? "");
      });

    supabase
      .from("lessons")
      .select("id, lesson_date, lesson_time, duration_minutes, status")
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
  const balance = Number(pupil?.balance_owed ?? 0);
  const lessonCount = Number(pupil?.lesson_count ?? 0);

  return (
    <div className="min-h-screen bg-white pb-8" style={POPPINS}>
      {/* Top bar */}
      <div
        className="sticky top-0 z-40 flex items-center justify-between px-2"
        style={{ height: 52, backgroundColor: "#072b47" }}
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
                  backgroundColor: "#1A52A0",
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
                    border: "1px solid #E2E6ED",
                  }}
                >
                  <Camera size={11} color="#1A52A0" />
                </span>
              </button>
              <div className="min-w-0 flex-1">
                <div
                  className="text-[18px] font-semibold text-[#0F2044] truncate"
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
                <span className="text-[12px] text-[#1A1A2E]">
                  I have consent to use this pupil&apos;s photo publicly
                </span>
              </label>
            </div>

            <div className="grid grid-cols-3 gap-2 mt-4">
              <StatChip label="Lessons" value={String(lessonCount)} />
              <StatChip
                label="Balance"
                value={`£${balance.toFixed(2)}`}
                valueColor={balance > 0 ? "#CC2229" : "#0F2044"}
              />
              <StatChip label="Test" value={formatTestDate(pupil.test_date)} />
            </div>

            {/* Test Readiness */}
            {(() => {
              const total = progressData?.total ?? 0;
              const competent = progressData?.competent ?? 0;
              const pct = total > 0 ? Math.round((competent / total) * 100) : 0;
              let barColor = "#CC2229";
              if (pct >= 100) barColor = "#16A34A";
              else if (pct >= 71) barColor = "#1A52A0";
              else if (pct >= 41) barColor = "#F59E0B";
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
                      style={{ backgroundColor: "#E2E6ED" }}
                    >
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${pct}%`, backgroundColor: barColor }}
                      />
                    </div>
                    <div
                      className="text-[14px] font-bold"
                      style={{ color: "#0F2044", ...POPPINS }}
                    >
                      {pct}%
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <div className="text-[12px]" style={{ color: "#6B7280", ...POPPINS }}>
                      {competent} of {total} syllabus items competent
                    </div>
                    <Button
                      variant="ghost"
                      onClick={() => navigate({ to: "/pupils/progress/$id", params: { id } })}
                    >
                      View progress
                    </Button>
                  </div>
                </div>
              );
            })()}
          </Card>
        </div>
      )}

      <div className="px-4">
        <SectionHeader>QUICK ACTIONS</SectionHeader>
        <div className="grid grid-cols-3 gap-2">
          <a
            href={pupil?.phone ? `tel:${pupil.phone}` : undefined}
            aria-label="Call"
            className="inline-flex items-center justify-center text-[13px] font-medium text-white"
            style={{ height: 40, borderRadius: 8, backgroundColor: "#CC2229", ...POPPINS }}
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
              color: "#0F2044",
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
              backgroundColor: "#1A52A0",
              border: "none",
              ...POPPINS,
            }}
          >
            Add lesson
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



        <SectionHeader>UPCOMING LESSONS</SectionHeader>
        {lessons === null ? null : lessons.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-[14px] text-[#6B7280]" style={POPPINS}>
              No upcoming lessons
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {lessons.map((l) => {
              const d = new Date(`${l.lesson_date}T00:00:00`);
              return (
                <Card key={l.id}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-[13px] text-[#6B7280]" style={POPPINS}>
                        {formatDateShort(d)}
                      </div>
                      <div className="text-[14px] font-semibold text-[#0F2044]" style={POPPINS}>
                        {formatTime(l.lesson_time)}
                      </div>
                      <div className="text-[13px] text-[#6B7280]" style={POPPINS}>
                        {l.duration_minutes ?? 60} min
                      </div>
                    </div>
                    <span
                      className="text-[11px] text-white px-2 py-1 rounded-full shrink-0 capitalize"
                      style={{ backgroundColor: lessonStatusColor(l.status), ...POPPINS }}
                    >
                      {l.status}
                    </span>
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        <SectionHeader>NOTES</SectionHeader>
        <textarea
          rows={3}
          value={notesDraft}
          onChange={(e) => setNotesDraft(e.target.value)}
          placeholder="Add a note about this pupil…"
          className="w-full rounded-lg p-3 text-[14px] text-[#1A1A2E] bg-white focus:border-[#1A52A0] focus:outline-none"
          style={{
            ...POPPINS,
            borderWidth: "0.5px",
            borderStyle: "solid",
            borderColor: "#E2E6ED",
            resize: "vertical",
          }}
        />
        <div className="mt-2 flex items-center justify-end gap-3">
          {noteSaved && (
            <span className="text-[12px]" style={{ color: "#16A34A", ...POPPINS }}>
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
    </div>
  );
}

function StatChip({
  label,
  value,
  valueColor = "#0F2044",
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
        borderColor: "#E2E6ED",
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
