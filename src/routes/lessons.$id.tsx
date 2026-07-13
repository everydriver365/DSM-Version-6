import { createFileRoute, useNavigate, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Pencil, Navigation, ChevronRight, X, Map, AlertTriangle } from "lucide-react";
import { IconX } from "@tabler/icons-react";
import { toast } from "sonner";
import { Card } from "../components/dsm/Card";
import { SectionHeader } from "../components/dsm/SectionHeader";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { supabase } from "../lib/supabaseClient";
import { PageLayout } from "@/components/PageLayout";

const SUPABASE_URL = "https://bjpqxfrihwjcqprmoqfs.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJqcHF4ZnJpaHdqY3Fwcm1vcWZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE0NzQ4MjEsImV4cCI6MjA5NzA1MDgyMX0.HKlgx3dxP3uxX9wMRRUnfb0IPwaBpFcut_iUgT5XFeo";

async function syncToGoogleCalendar(userId: string, token: string) {
  try {
    await fetch(SUPABASE_URL + '/functions/v1/sync-external-calendar', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_ANON_KEY,
        Authorization: 'Bearer ' + token,
      },
      body: JSON.stringify({ instructorId: userId }),
    });
  } catch (e) {
    console.warn('[sync] failed', e);
  }
  window.open('https://calendar.google.com', '_blank');
}

async function toastWithSync(message: string) {
  const [{ data: userRes }, { data: sess }] = await Promise.all([
    supabase.auth.getUser(),
    supabase.auth.getSession(),
  ]);
  const uid = userRes.user?.id;
  const token = sess.session?.access_token ?? "";
  toast.success(message, {
    action: uid
      ? { label: '📅 Sync to Google Cal', onClick: () => syncToGoogleCalendar(uid, token) }
      : undefined,
    duration: 8000,
  });
}


const CANCEL_REASONS = [
  "Pupil cancelled",
  "Pupil no-show",
  "Instructor cancelled",
  "Weather",
  "Vehicle issue",
  "Other",
] as const;

export const Route = createFileRoute("/lessons/$id")({
  head: () => ({
    meta: [{ title: "Lesson — DSM by EveryDriver" }],
  }),
  component: LessonDetailPage,
});

const POPPINS = { fontFamily: "Inter, sans-serif" } as const;

interface Lesson {
  id: string;
  lesson_date: string;
  lesson_time: string;
  duration_minutes: number | null;
  status: string;
  notes: string | null;
  pickup_address: string | null;
  pupil_id: string;
  payment_status: string | null;
  amount_due: number | null;
  pupils: { id: string; name: string; phone: string | null } | null;
}

interface RouteRow {
  id: string;
  distance_miles: number | null;
  duration_minutes: number | null;
  max_speed_mph: number | null;
  avg_speed_mph: number | null;
}

interface OverspeedEvent {
  id: string;
  recorded_at: string;
  speed_mph: number;
  speed_limit_mph: number;
  excess_mph: number;
  road_name: string | null;
}

function formatTime(t: string) {
  return (t ?? "").slice(0, 5);
}
function formatDateLong(d: Date) {
  return d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
}
function formatDuration(mins: number | null) {
  const m = mins ?? 60;
  if (m % 60 === 0) {
    const h = m / 60;
    return h === 1 ? "1 hour" : `${h} hours`;
  }
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return `${h}h ${rem}m`;
}
function statusColor(s: string) {
  if (s === "confirmed") return "#1877D6";
  if (s === "pending") return "#1877D6";
  if (s === "cancelled") return "#1877D6";
  if (s === "completed") return "#1877D6";
  return "#6B7280";
}

function LessonDetailPage() {
  const { id } = Route.useParams();
  console.log("[lessons.$id] mounted, id:", id);
  const navigate = useNavigate();
  const router = useRouter();
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [route, setRoute] = useState<RouteRow | null>(null);
  const [overspeedEvents, setOverspeedEvents] = useState<OverspeedEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);
  const [pendingComplete, setPendingComplete] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [insightDismissed, setInsightDismissed] = useState(false);



  async function confirmDelete() {
    if (deleting) return;
    setDeleting(true);
    const { error } = await supabase
      .from("lessons")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id);
    setDeleting(false);
    if (error) {
      console.error("[lesson] soft delete error", error);
      toast.error("Couldn't delete lesson");
      return;
    }
    setDeleteOpen(false);
    toastWithSync("Lesson deleted");
    navigate({ to: "/schedule" });
  }


  useEffect(() => {
    setLoading(true);
    setFetchError(null);
    supabase
      .from("lessons")
      .select(
        "id, lesson_date, lesson_time, duration_minutes, status, notes, pickup_address, pupil_id, payment_status, amount_due, pupils(id, name, phone)",
      )
      .eq("id", id)
      .is("deleted_at", null)
      .maybeSingle()
      .then(({ data, error }) => {
        console.log("[lessons.$id] id:", id, "lesson:", data, "error:", error);
        if (error) {
          console.error("[lesson] fetch error", error);
          setFetchError(error.message);
          setLesson(null);
        } else {
          setLesson((data as unknown as Lesson) ?? null);
        }
        setLoading(false);
      });
  }, [id]);


  useEffect(() => {
    if (!lesson) return;
    (async () => {
      const { data: routeData, error: routeError } = await supabase
        .from("lesson_routes")
        .select("id, distance_miles, duration_minutes, max_speed_mph, avg_speed_mph")
        .eq("lesson_id", lesson.id)
        .maybeSingle();
      if (routeError) {
        console.error("[lesson] route fetch error", routeError);
        return;
      }
      if (!routeData) return;
      setRoute(routeData as unknown as RouteRow);

      const { data: events, error: eventsError } = await supabase
        .from("overspeed_events")
        .select("id, recorded_at, speed_mph, speed_limit_mph, excess_mph, road_name")
        .eq("lesson_route_id", routeData.id)
        .order("recorded_at", { ascending: true });
      if (eventsError) console.error("[lesson] overspeed fetch error", eventsError);
      setOverspeedEvents((events as unknown as OverspeedEvent[]) ?? []);
    })();
  }, [lesson]);

  async function updateStatus(status: string) {
    if (!lesson || updating) return;
    setUpdating(true);
    const { error } = await supabase.from("lessons").update({ status }).eq("id", lesson.id);
    setUpdating(false);
    if (error) {
      console.error("[lesson] update status error", error);
      return;
    }
    setLesson({ ...lesson, status });
  }

  const confirmComplete = async () => {
    setPendingComplete(false);
    await updateStatus("completed");
  };

  const handleNavigate = () => {
    const address = lesson?.pickup_address || lesson?.notes || "";
    if (!address) {
      toast("No pickup address set for this lesson");
      return;
    }
    const encodedAddress = encodeURIComponent(address);
    const isIOS = /iPhone|iPad/.test(navigator.userAgent);
    if (isIOS) {
      window.open(`maps://maps.apple.com/?daddr=${encodedAddress}`, "_blank");
    } else {
      window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodedAddress}`, "_blank");
    }
  };

  const dateObj = lesson ? new Date(`${lesson.lesson_date}T00:00:00`) : null;
  const badge = lesson ? statusColor(lesson.status) : "#6B7280";
  const pupilName = lesson?.pupils?.name ?? "Unknown pupil";
  const phone = lesson?.pupils?.phone ?? "";

  const lessonInsight = lesson
    ? (() => {
        const amount = Number(lesson.amount_due ?? 0);
        const paid = (lesson.payment_status ?? "").toLowerCase() === "paid";
        if (amount > 0 && !paid) {
          const firstName = pupilName.split(" ")[0];
          return {
            text: `${firstName} owes £${amount.toFixed(0)} for this lesson.`,
            actionLabel: "Remind" as const,
            onAction: () => {
              if (!phone) {
                toast("No phone number");
                return;
              }
              const body = encodeURIComponent(
                `Hi ${firstName}, just a friendly reminder your lesson balance of £${amount.toFixed(0)} is outstanding. Thanks!`,
              );
              window.location.href = `sms:${phone}?&body=${body}`;
            },
          };
        }
        return null;
      })()
    : null;


  return (
    <PageLayout className="pb-8" style={POPPINS}>
      {/* Top bar */}
      <div
        className="sticky top-0 z-40 flex items-center justify-between px-2"
        style={{ height: 52, backgroundColor: "#0B1F3A" }}
      >
        <button
          type="button"
          aria-label="Back"
          onClick={() => router.history.back()}
          className="flex items-center justify-center"
          style={{ width: 40, height: 40 }}
        >
          <ArrowLeft size={22} color="#FFFFFF" />
        </button>
        <div
          className="flex-1 text-center text-[15px] font-semibold text-white"
          style={POPPINS}
        >
          Lesson
        </div>
        <button
          type="button"
          aria-label="Edit lesson"
          onClick={() => navigate({ to: "/lessons/edit/$id", params: { id } })}
          className="flex items-center justify-center"
          style={{ width: 40, height: 40 }}
        >
          <Pencil size={18} color="#FFFFFF" />
        </button>
      </div>

      {loading && (
        <div className="px-4 mt-3 space-y-3">
          <div
            className="animate-pulse"
            style={{ height: 120, borderRadius: 12, backgroundColor: "#E5E7EB" }}
          />
          <div
            className="animate-pulse"
            style={{ height: 40, borderRadius: 8, backgroundColor: "#E5E7EB" }}
          />
          <div
            className="animate-pulse"
            style={{ height: 280, borderRadius: 12, backgroundColor: "#E5E7EB" }}
          />
          <div
            className="animate-pulse"
            style={{ height: 180, borderRadius: 12, backgroundColor: "#E5E7EB" }}
          />
        </div>
      )}

      {!loading && !lesson && (
        <div className="flex flex-col items-center justify-center mt-20 px-6">
          <div
            className="text-[16px] font-semibold"
            style={{ color: "#0B1F3A", ...POPPINS }}
          >
            Lesson not found
          </div>
          <div
            className="text-[13px] text-center mt-2"
            style={{ color: "#6B7280", ...POPPINS }}
          >
            {fetchError || "This lesson may have been deleted or the link is incorrect."}
          </div>
          <button
            type="button"
            onClick={() => router.history.back()}
            className="mt-6 text-[13px] font-medium text-white"
            style={{
              height: 40,
              borderRadius: 8,
              backgroundColor: "#1877D6",
              padding: "0 24px",
              border: "none",
              ...POPPINS,
            }}
          >
            Go back
          </button>
        </div>
      )}

      {lesson && dateObj && (
        <>
          {/* Header card */}
          <div className="mx-4 mt-3">
            <Card>
              <div
                className="text-[32px] font-bold leading-tight"
                style={{ color: "#0B1F3A", ...POPPINS }}
              >
                {formatTime(lesson.lesson_time)}
              </div>
              <div className="text-[13px] text-[#6B7280] mt-0.5" style={POPPINS}>
                {formatDateLong(dateObj)}
              </div>
              <div
                className="text-[16px] font-semibold mt-3 truncate"
                style={{ color: "#0B1F3A", ...POPPINS }}
              >
                {pupilName}
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[13px] text-[#6B7280]" style={POPPINS}>
                  {formatDuration(lesson.duration_minutes)}
                </span>
                <span
                  className="text-[11px] text-white px-2 py-0.5 rounded-full capitalize"
                  style={{ backgroundColor: badge, ...POPPINS }}
                >
                  {lesson.status}
                </span>
              </div>
            </Card>
          </div>

          {/* Quick actions */}
          <div className="px-4 mt-3 grid grid-cols-3 gap-2">
            <a
              href={phone ? `tel:${phone}` : undefined}
              aria-label="Call"
              className="inline-flex items-center justify-center text-[13px] font-medium text-white"
              style={{ height: 40, borderRadius: 8, backgroundColor: "#1877D6", ...POPPINS }}
            >
              Call
            </a>
            <a
              href={phone ? `sms:${phone}` : undefined}
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
              aria-label="Navigate"
              className="inline-flex items-center justify-center gap-1 text-[13px] font-medium text-white"
              style={{
                height: 40,
                borderRadius: 8,
                backgroundColor: "#1877D6",
                border: "none",
                ...POPPINS,
              }}
              onClick={handleNavigate}
            >
              <Navigation size={14} color="#FFFFFF" />
              Navigate
            </button>
          </div>

          {/* AI insight */}
          {lessonInsight && !insightDismissed && (() => {
            const ACCENT_INSIGHT = '#6B4FD6';
            const NAVY = '#0F2044';
            const BORDER = 'rgba(15,32,68,0.10)';
            const MUTED = '#64748B';
            const ACCENT = '#1A52A0';
            return (
              <div className="mx-4 mt-3" style={{ position: 'relative', background: '#FFFFFF', border: `0.5px solid ${BORDER}`, borderRadius: 10, padding: '13px 16px 13px 19px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, fontFamily: 'Poppins, Inter, sans-serif' }}>
                <span aria-hidden style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: ACCENT_INSIGHT, borderRadius: '10px 0 0 10px' }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 11, fontWeight: 500, color: ACCENT_INSIGHT, letterSpacing: '0.02em', marginBottom: 3 }}>AI INSIGHT</div>
                  <div style={{ fontSize: 14, fontWeight: 500, color: NAVY, lineHeight: 1.4, marginBottom: 8 }}>{lessonInsight.text}</div>
                  {lessonInsight.onAction && (
                    <button type="button" onClick={lessonInsight.onAction} style={{ background: 'none', border: 'none', padding: 0, fontFamily: 'Poppins, Inter, sans-serif', fontSize: 12, fontWeight: 500, color: ACCENT, cursor: 'pointer' }}>{lessonInsight.actionLabel} →</button>
                  )}
                </div>
                <button
                  type="button"
                  aria-label="Dismiss"
                  onClick={() => setInsightDismissed(true)}
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: 999,
                    border: 'none',
                    background: 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    flexShrink: 0,
                    padding: 0,
                  }}
                >
                  <IconX size={15} color={MUTED} />
                </button>
              </div>
            );
          })()}



          <div className="px-4">

            <SectionHeader>LESSON DETAILS</SectionHeader>
            <Card className="!p-0">
              <DetailRow label="Date" value={formatDateLong(dateObj)} isFirst />
              <DetailRow label="Time" value={formatTime(lesson.lesson_time)} />
              <DetailRow label="Duration" value={formatDuration(lesson.duration_minutes)} />
              <DetailRow
                label="Status"
                value={lesson.status.charAt(0).toUpperCase() + lesson.status.slice(1)}
                valueColor={badge}
              />
              <DetailRow label="Pupil" value={pupilName} />
              <DetailRow label="Notes" value={lesson.notes || "—"} multiline />
            </Card>

            {route && (
              <>
                <SectionHeader>ROUTE & TRACKING</SectionHeader>
                <div
                  className="bg-white"
                  style={{
                    border: "0.5px solid #EEF2F7",
                    borderRadius: 12,
                    padding: 16,
                  }}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <Map size={18} color="#1877D6" />
                    <span
                      className="text-[11px] font-semibold tracking-wider"
                      style={{ color: "#1877D6", ...POPPINS }}
                    >
                      Route & tracking
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 mb-4">
                    <div className="text-center">
                      <div
                        className="text-[16px] font-bold"
                        style={{ color: "#0B1F3A", ...POPPINS }}
                      >
                        {(route.distance_miles ?? 0).toFixed(1)} mi
                      </div>
                      <div
                        className="text-[10px] text-[#6B7280] mt-0.5"
                        style={POPPINS}
                      >
                        Distance
                      </div>
                    </div>
                    <div className="text-center">
                      <div
                        className="text-[16px] font-bold"
                        style={{ color: "#0B1F3A", ...POPPINS }}
                      >
                        {route.duration_minutes ?? 0} mins
                      </div>
                      <div
                        className="text-[10px] text-[#6B7280] mt-0.5"
                        style={POPPINS}
                      >
                        Duration
                      </div>
                    </div>
                    <div className="text-center">
                      <div
                        className="text-[16px] font-bold"
                        style={{ color: "#0B1F3A", ...POPPINS }}
                      >
                        {(route.max_speed_mph ?? 0).toFixed(0)} mph
                      </div>
                      <div
                        className="text-[10px] text-[#6B7280] mt-0.5"
                        style={POPPINS}
                      >
                        Max speed
                      </div>
                    </div>
                  </div>

                  {overspeedEvents.length > 0 && (
                    <div className="mb-3">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertTriangle size={16} color="#1877D6" />
                        <span
                          className="text-[12px] font-semibold"
                          style={{ color: "#1877D6", ...POPPINS }}
                        >
                          Overspeed events
                        </span>
                      </div>
                      <div className="flex flex-col gap-2">
                        {overspeedEvents.map((ev) => {
                          const t = new Date(ev.recorded_at);
                          const time = `${String(t.getHours()).padStart(2, "0")}:${String(t.getMinutes()).padStart(2, "0")}`;
                          return (
                            <div
                              key={ev.id}
                              className="text-[12px]"
                              style={{ color: "#374151", ...POPPINS }}
                            >
                              {time} · {ev.road_name ?? "Unknown road"} ·{" "}
                              {ev.speed_mph}mph in {ev.speed_limit_mph}mph zone{" "}
                              <span style={{ color: "#EF4444", fontWeight: 700 }}>
                                (+{ev.excess_mph}mph)
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => toast("Map replay coming soon")}
                    className="w-full text-center text-[13px] font-semibold"
                    style={{
                      background: "transparent",
                      border: "none",
                      color: "#1877D6",
                      padding: "10px 0",
                      cursor: "pointer",
                      ...POPPINS,
                    }}
                  >
                    View on map
                  </button>
                </div>
              </>
            )}

            <SectionHeader>ACTIONS</SectionHeader>
            <Card className="!p-0">
              <ActionRow
                label="Mark complete"
                disabled={updating || lesson.status === "completed"}
                onClick={() => setPendingComplete(true)}
                color="#1877D6"
                isFirst
              />
              <ActionRow
                label="Cancel lesson"
                disabled={updating || lesson.status === "cancelled"}
                onClick={() => setCancelOpen(true)}
                color="#1877D6"
              />
              <ActionRow
                label="Feedback"
                onClick={() => navigate({ to: "/lessons/feedback/$id", params: { id } })}
                color="#1877D6"
              />
              <ActionRow
                label="Reschedule"
                onClick={() => navigate({ to: "/lessons/reschedule/$id", params: { id } })}
                color="#0B1F3A"
              />
              <ActionRow
                label="Delete lesson"
                disabled={deleting}
                onClick={() => setDeleteOpen(true)}
                color="#1877D6"
              />
            </Card>
          </div>
        </>
      )}

      <ConfirmDialog
        open={pendingComplete}
        title="Mark this lesson as complete?"
        confirmLabel="Confirm"
        onConfirm={confirmComplete}
        onCancel={() => setPendingComplete(false)}
      />

      <ConfirmDialog
        open={deleteOpen}
        title="Delete this lesson?"
        message="This removes it from your schedule and reports. Use Cancel instead if the pupil cancelled — that keeps the record and any fee."
        confirmLabel={deleting ? "Deleting…" : "Delete"}
        onConfirm={confirmDelete}
        onCancel={() => {
          if (!deleting) setDeleteOpen(false);
        }}
      />

      {lesson && dateObj && (
        <CancelLessonSheet
          open={cancelOpen}
          onClose={() => setCancelOpen(false)}
          pupilName={pupilName}
          pupilId={lesson.pupil_id}
          lessonId={lesson.id}
          lessonDate={lesson.lesson_date}
          lessonTime={lesson.lesson_time}
          paymentStatus={lesson.payment_status}
          amountDue={Number(lesson.amount_due ?? 0)}
          when={`${formatDateLong(dateObj)} · ${formatTime(lesson.lesson_time)}`}
          onCancelled={() => {
            toast.success("Lesson cancelled");
            navigate({ to: "/schedule" });
          }}
        />
      )}
    </PageLayout>
  );
}

type CancellationTier = { hours: number; charge_percent: number };

function CancelLessonSheet({
  open,
  onClose,
  pupilName,
  pupilId,
  lessonId,
  lessonDate,
  lessonTime,
  paymentStatus,
  amountDue,
  when,
  onCancelled,
}: {
  open: boolean;
  onClose: () => void;
  pupilName: string;
  pupilId: string;
  lessonId: string;
  lessonDate: string;
  lessonTime: string;
  paymentStatus: string | null;
  amountDue: number;
  when: string;
  onCancelled: () => void;
}) {
  const [reason, setReason] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [tiers, setTiers] = useState<CancellationTier[]>([
    { hours: 24, charge_percent: 100 },
    { hours: 48, charge_percent: 50 },
  ]);
  const [noShowPercent, setNoShowPercent] = useState<number>(100);

  useEffect(() => {
    if (open) {
      setReason("");
      setNotes("");
      setSubmitting(false);
    }
  }, [open]);

  // Fetch instructor policy on open
  useEffect(() => {
    if (!open) return;
    (async () => {
      const { data: userRes } = await supabase.auth.getUser();
      const uid = userRes.user?.id;
      if (!uid) return;
      const { data } = await supabase
        .from("instructor_reminder_preferences")
        .select("cancellation_tiers, no_show_charge_percent")
        .eq("instructor_id", uid)
        .maybeSingle();
      if (!data) return;
      const p = data as Record<string, unknown>;
      if (typeof p.no_show_charge_percent === "number") setNoShowPercent(p.no_show_charge_percent);
      const raw = p.cancellation_tiers;
      if (typeof raw === "string") {
        try {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0) setTiers(parsed as CancellationTier[]);
        } catch { /* keep defaults */ }
      } else if (Array.isArray(raw) && raw.length > 0) {
        setTiers(raw as CancellationTier[]);
      }
    })();
  }, [open]);

  const isNoShow =
    reason === "Pupil no-show" || reason.toLowerCase().includes("no-show") || reason.toLowerCase().includes("no_show");

  // Charge calculation
  const lessonStart = new Date(`${lessonDate}T${lessonTime}`);
  const hoursUntilLesson = (lessonStart.getTime() - Date.now()) / 3600000;
  const lessonValue = amountDue || 0;

  const sortedTiers = [...tiers].sort((a, b) => a.hours - b.hours);
  const applicableTier = isNoShow
    ? null
    : sortedTiers.find((t) => hoursUntilLesson < t.hours) ?? null;

  const chargePercent = isNoShow ? noShowPercent : (applicableTier ? applicableTier.charge_percent : 0);
  const noticePeriod = applicableTier ? applicableTier.hours : null;
  const chargeAmount = Math.round(lessonValue * chargePercent / 100 * 100) / 100;

  async function performCancel(feeAmount: number, waived: boolean) {
    if (submitting) return;
    setSubmitting(true);

    const isPrepaid = (paymentStatus ?? "").toLowerCase() === "prepaid";
    const lessonPatch: Record<string, unknown> = {
      status: "cancelled",
      cancellation_reason: reason,
      cancellation_notes: feeAmount > 0
        ? `Cancellation fee applied: ${chargePercent}% of lesson value${notes ? ` — ${notes}` : ""}`
        : (notes || null),
      cancelled_at: new Date().toISOString(),
      payment_status: feeAmount > 0 ? "unpaid" : "cancelled",
      amount_due: feeAmount > 0 ? feeAmount : 0,
    };
    const { error } = await supabase.from("lessons").update(lessonPatch).eq("id", lessonId);
    if (error) {
      console.error("[cancel] update lesson error", error);
      toast.error("Couldn't cancel lesson");
      setSubmitting(false);
      return;
    }

    // Refund prepaid balance back to pupil credit if lesson was prepaid.
    if (isPrepaid && amountDue > 0) {
      const { data: pupilRow, error: readErr } = await supabase
        .from("pupils")
        .select("account_balance")
        .eq("id", pupilId)
        .maybeSingle();
      if (readErr) console.error("[cancel] pupil read error", readErr);
      const current = Number((pupilRow as { account_balance: number | null } | null)?.account_balance ?? 0);
      const { error: refundErr } = await supabase
        .from("pupils")
        .update({ account_balance: current + amountDue })
        .eq("id", pupilId);
      if (refundErr) console.error("[cancel] account_balance refund error", refundErr);
    }

    const { data: userRes } = await supabase.auth.getUser();
    const instructorId = userRes.user?.id ?? null;
    if (instructorId) {
      const body = feeAmount > 0
        ? `Cancellation fee of £${feeAmount.toFixed(2)} added for ${pupilName}`
        : `${pupilName}'s lesson on ${when} was cancelled${waived ? " (charge waived)" : ""}`;
      const { error: notifErr } = await supabase.from("instructor_notifications").insert({
        instructor_id: instructorId,
        title: feeAmount > 0 ? "Cancellation fee added" : "Lesson cancelled",
        body,
        type: "lesson",
        read: false,
      });
      if (notifErr) console.error("[cancel] notification error", notifErr);
    }

    setSubmitting(false);
    onCancelled();
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" style={POPPINS}>
      <div
        className="absolute inset-0"
        style={{ backgroundColor: "rgba(11,31,58,0.5)" }}
        onClick={onClose}
        aria-hidden
      />
      <div
        className="relative w-full bg-white"
        style={{
          borderTopLeftRadius: 16,
          borderTopRightRadius: 16,
          maxHeight: "92vh",
          overflowY: "auto",
          paddingBottom: 24,
        }}
      >
        <div className="flex items-center justify-between px-4 pt-4">
          <span className="text-[11px] font-semibold tracking-wider" style={{ color: "#6B7280" }}>
            CANCEL LESSON
          </span>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="flex items-center justify-center"
            style={{ width: 32, height: 32 }}
          >
            <X size={18} color="#6B7280" />
          </button>
        </div>

        <div className="px-4 mt-2">
          <div className="rounded-[12px] p-3" style={{ backgroundColor: "#F3F4F6" }}>
            <div className="text-[14px] font-semibold" style={{ color: "#0B1F3A" }}>{pupilName}</div>
            <div className="text-[12px]" style={{ color: "#6B7280" }}>{when}</div>
          </div>
        </div>

        {/* Step 1 — reason */}
        <div className="px-4 mt-4">
          <label className="text-[12px] font-semibold" style={{ color: "#0B1F3A" }}>
            Cancellation reason *
          </label>
          <select
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full mt-1 px-3 bg-white"
            style={{ height: 44, borderRadius: 8, border: "1px solid #EEF2F7", color: "#0B1F3A", fontSize: 14, ...POPPINS }}
          >
            <option value="" disabled>Select a reason</option>
            {CANCEL_REASONS.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>

        {/* Optional notes */}
        <div className="px-4 mt-4">
          <label className="text-[12px] font-semibold" style={{ color: "#0B1F3A" }}>
            Additional notes
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="w-full mt-1 px-3 py-2 bg-white"
            style={{ borderRadius: 8, border: "1px solid #EEF2F7", color: "#0B1F3A", fontSize: 14, resize: "none", ...POPPINS }}
          />
        </div>

        {/* Step 2 — charge calculation (shown once reason is selected) */}
        {reason && (
          <>
            <div
              className="mx-4"
              style={{
                marginTop: 12,
                background: "#FEF2F2",
                border: "0.5px solid #FECACA",
                borderRadius: 12,
                padding: 16,
              }}
            >
              <div className="text-[14px]" style={{ color: "#0F2044", ...POPPINS }}>
                Notice given: {Math.max(0, Math.round(hoursUntilLesson))} hours
              </div>
              {chargePercent > 0 ? (
                <>
                  <div className="mt-2" style={{ fontWeight: 700, fontSize: 15, color: "#CC2229", ...POPPINS }}>
                    Cancellation charge applies: {chargePercent}% = £{chargeAmount.toFixed(2)}
                  </div>
                  <div className="text-[12px] mt-1" style={{ color: "#9CA3AF", ...POPPINS }}>
                    {isNoShow
                      ? "Based on your no-show policy"
                      : `Based on your policy: less than ${noticePeriod} hours notice`}
                  </div>
                </>
              ) : (
                <>
                  <div className="mt-2 text-[14px]" style={{ fontWeight: 600, color: "#16A34A", ...POPPINS }}>
                    No charge applies
                  </div>
                  <div className="text-[12px] mt-1" style={{ color: "#9CA3AF", ...POPPINS }}>
                    Sufficient notice given
                  </div>
                </>
              )}
            </div>

            <div className="px-4 mt-4 flex flex-col gap-2">
              {chargeAmount > 0 && (
                <button
                  type="button"
                  onClick={() => performCancel(chargeAmount, false)}
                  disabled={submitting}
                  className="inline-flex items-center justify-center text-[14px] font-semibold text-white disabled:opacity-50"
                  style={{ height: 44, borderRadius: 8, backgroundColor: "#CC2229", ...POPPINS }}
                >
                  {submitting ? "Applying…" : `Apply £${chargeAmount.toFixed(2)} charge`}
                </button>
              )}
              <button
                type="button"
                onClick={() => performCancel(0, true)}
                disabled={submitting}
                className="inline-flex items-center justify-center text-[14px] font-semibold disabled:opacity-50"
                style={{ height: 44, borderRadius: 8, backgroundColor: "#F3F4F6", color: "#6B7280", ...POPPINS }}
              >
                Waive charge
              </button>
              <button
                type="button"
                onClick={() => performCancel(0, false)}
                disabled={submitting}
                className="inline-flex items-center justify-center text-[14px] font-medium disabled:opacity-50"
                style={{ height: 44, borderRadius: 8, backgroundColor: "#FFFFFF", border: "0.5px solid #E2E6ED", color: "#9CA3AF", ...POPPINS }}
              >
                Cancel without charge
              </button>
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="inline-flex items-center justify-center text-[13px] font-medium disabled:opacity-50"
                style={{ height: 40, borderRadius: 8, backgroundColor: "transparent", color: "#0B1F3A", ...POPPINS }}
              >
                Keep lesson
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function DetailRow({
  label,
  value,
  valueColor = "#0B1F3A",
  multiline,
  isFirst,
}: {
  label: string;
  value: string;
  valueColor?: string;
  multiline?: boolean;
  isFirst?: boolean;
}) {
  return (
    <div
      className="flex gap-3 px-4 py-3"
      style={{
        ...(isFirst
          ? undefined
          : {
              borderTopWidth: "0.5px",
              borderTopStyle: "solid",
              borderTopColor: "#EEF2F7",
            }),
        alignItems: multiline ? "flex-start" : "center",
        justifyContent: "space-between",
      }}
    >
      <span className="text-[13px] text-[#6B7280] shrink-0" style={POPPINS}>
        {label}
      </span>
      <span
        className={`text-[13px] text-right ${multiline ? "" : "truncate"}`}
        style={{
          color: valueColor,
          ...POPPINS,
          whiteSpace: multiline ? "pre-wrap" : undefined,
        }}
      >
        {value}
      </span>
    </div>
  );
}

function ActionRow({
  label,
  onClick,
  color,
  disabled,
  isFirst,
}: {
  label: string;
  onClick: () => void;
  color: string;
  disabled?: boolean;
  isFirst?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="w-full flex items-center justify-between px-4 py-3 text-left disabled:opacity-50"
      style={
        isFirst
          ? undefined
          : {
              borderTopWidth: "0.5px",
              borderTopStyle: "solid",
              borderTopColor: "#EEF2F7",
            }
      }
    >
      <span className="text-[14px] font-medium" style={{ color, ...POPPINS }}>
        {label}
      </span>
      <ChevronRight size={18} color="#6B7280" />
    </button>
  );
}
