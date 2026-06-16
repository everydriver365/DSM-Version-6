import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Phone,
  Car,
  Bell,
  Menu,
  MessageSquare,
  Navigation,
  CalendarOff,
  Search,
  Calendar as CalendarIcon,
  Users,
  PoundSterling,
  Settings as SettingsIcon,
  RefreshCw,
  Plus,
  TrendingUp,
  Receipt,
  Clock,
  BarChart2,
  CheckSquare,
  FileText,
  GraduationCap,
  Star,
  Inbox,
  BookOpen,
  Gift,
  HelpCircle,
  Calculator,
  ClipboardList,
  ClipboardCheck,
  Fuel,
  Heart,
  FolderOpen,
  LayoutGrid,
  FileSignature,
} from "lucide-react";
import { SectionHeader } from "../components/dsm/SectionHeader";
import { supabase } from "../lib/supabaseClient";
import carAsset from "../assets/next-lesson-car.png.asset.json";

export const Route = createFileRoute("/home")({
  head: () => ({
    meta: [
      { title: "Home — DSM by EveryDriver" },
      { name: "description", content: "Your daily overview of lessons, pupils and earnings." },
    ],
  }),
  component: HomePage,
});

interface LessonRow {
  id: string;
  lesson_date: string;
  lesson_time: string;
  duration_minutes: number | null;
  status: string;
  pupil_id: string;
  pupils?: { name: string } | null;
}

const POPPINS = { fontFamily: "Poppins, sans-serif" } as const;
const WEEKLY_LESSON_GOAL = 30;
const WEEKLY_EARNINGS_GOAL = 1000;

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}
function startOfWeek(d: Date) {
  const x = startOfDay(d);
  const day = (x.getDay() + 6) % 7; // Mon=0
  x.setDate(x.getDate() - day);
  return x;
}
function ymd(d: Date) {
  // YYYY-MM-DD in Europe/London regardless of host timezone
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}
function lessonDateTime(l: LessonRow) {
  const t = (l.lesson_time ?? "00:00:00").slice(0, 8);
  const time = t.length === 5 ? `${t}:00` : t;
  return new Date(`${l.lesson_date}T${time}`);
}

/** Current time in Europe/London as "HH:MM:SS" for string comparison with lesson_time */
function londonTimeString() {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(new Date());
}

function formatTime(l: LessonRow) {
  const d = lessonDateTime(l);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}
function formatDayLabel(d: Date) {
  return d
    .toLocaleDateString("en-GB", { weekday: "short", day: "2-digit", month: "short" })
    .toUpperCase();
}
function formatShortDate(d: Date) {
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}
function formatDuration(mins: number | null) {
  if (!mins) return "";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h && m) return `${h}h ${m}m`;
  if (h) return `${h}h`;
  return `${m}m`;
}
function statusColor(status: string) {
  if (status === "confirmed") return "#16A34A";
  if (status === "pending") return "#F59E0B";
  if (status === "cancelled") return "#CC2229";
  return "#6B7280";
}

type TabKey = "today" | "tomorrow" | "next";

function HomePage() {
  const navigate = useNavigate();
  const [firstName, setFirstName] = useState("there");
  const [userId, setUserId] = useState<string | null>(null);
  const [lessons, setLessons] = useState<LessonRow[]>([]);
  const [nextLesson, setNextLesson] = useState<LessonRow | null>(null);
  const [outstanding, setOutstanding] = useState(0);
  const [weekEarnings, setWeekEarnings] = useState(0);
  const [todayEarnings, setTodayEarnings] = useState(0);
  const [tab, setTab] = useState<TabKey>("today");
  const [notifCount] = useState(3);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  const now = useMemo(() => new Date(), []);
  const todayStart = useMemo(() => startOfDay(now), [now]);
  const tomorrowStart = useMemo(() => addDays(todayStart, 1), [todayStart]);
  const dayAfter = useMemo(() => addDays(todayStart, 2), [todayStart]);
  const weekStart = useMemo(() => startOfWeek(now), [now]);
  const weekEnd = useMemo(() => addDays(weekStart, 7), [weekStart]);

  useEffect(() => {
    (async () => {
      const { data, error: authError } = await supabase.auth.getUser();
      if (authError) console.error("[home] auth.getUser error", authError);
      const u = data.user;
      if (!u) {
        console.warn("[home] no authenticated user");
        return;
      }
      setUserId(u.id);

      const { data: instructor, error: instErr } = await supabase
        .from("instructors")
        .select("name")
        .eq("id", u.id)
        .maybeSingle();
      if (instErr) console.error("[home] instructors fetch error", instErr);
      if (!instructor) {
        console.warn("[home] no instructor row for user, redirecting to onboarding", u.id);
        navigate({ to: "/onboarding", replace: true });
        return;
      }
      const fullName =
        (instructor?.name as string | undefined) ??
        u.email?.split("@")[0] ??
        "there";
      const first = fullName.trim().split(/\s+/)[0] || "there";
      setFirstName(capitalize(first));
    })();
  }, []);

  useEffect(() => {
    if (!userId) return;
    (async () => {
      const todayYmd = ymd(todayStart);
      const { data: lessonRows, error: lessonsErr } = await supabase
        .from("lessons")
        .select("id, lesson_date, lesson_time, duration_minutes, status, pupil_id, pupils(name)")
        .eq("instructor_id", userId)
        .is("deleted_at", null)
        .neq("status", "cancelled")
        .neq("status", "completed")
        .gte("lesson_date", todayYmd)
        .lte("lesson_date", ymd(addDays(todayStart, 14)))
        .order("lesson_date", { ascending: true })
        .order("lesson_time", { ascending: true });
      if (lessonsErr) console.error("[home] lessons fetch error", lessonsErr);
      setLessons((lessonRows ?? []) as unknown as LessonRow[]);


      const { data: nextRows, error: nextErr } = await supabase
        .from("lessons")
        .select("id, lesson_date, lesson_time, duration_minutes, status, pupil_id, pupils(name)")
        .eq("instructor_id", userId)
        .is("deleted_at", null)
        .neq("status", "cancelled")
        .neq("status", "completed")
        .gte("lesson_date", todayYmd)
        .order("lesson_date", { ascending: true })
        .order("lesson_time", { ascending: true });
      if (nextErr) console.error("[home] next lesson fetch error", nextErr);
      // If lesson is today, ensure its time is still in the future (London)
      const nowTime = londonTimeString();
      const validNext = (nextRows ?? []).find((l) => {
        if (l.lesson_date > todayYmd) return true;
        const lt = (l.lesson_time ?? "00:00:00").slice(0, 8);
        const lessonTime = lt.length === 5 ? `${lt}:00` : lt;
        return lessonTime > nowTime;
      });
      setNextLesson((validNext ?? null) as unknown as LessonRow | null);


      const { data: pupilRows } = await supabase
        .from("pupils")
        .select("balance_owed")
        .eq("instructor_id", userId)
        .is("deleted_at", null)
        .gt("balance_owed", 0);
      setOutstanding((pupilRows ?? []).reduce((s, p) => s + Number(p.balance_owed ?? 0), 0));

      const { data: payRows } = await supabase
        .from("payments")
        .select("amount, paid_at")
        .eq("instructor_id", userId)
        .is("deleted_at", null)
        .gte("paid_at", weekStart.toISOString())
        .lt("paid_at", weekEnd.toISOString());
      let wk = 0;
      let td = 0;
      (payRows ?? []).forEach((p) => {
        const amt = Number(p.amount ?? 0);
        wk += amt;
        if (new Date(p.paid_at) >= todayStart) td += amt;
      });
      setWeekEarnings(wk);
      setTodayEarnings(td);
      setLoading(false);
    })();
  }, [userId, todayStart, weekStart, weekEnd]);

  const upcoming = nextLesson ?? lessons.find((l) => lessonDateTime(l) >= now) ?? lessons[0];
  const todayLessons = lessons.filter((l) => {
    const d = lessonDateTime(l);
    return d >= todayStart && d < tomorrowStart;
  });
  const tomorrowLessons = lessons.filter((l) => {
    const d = lessonDateTime(l);
    return d >= tomorrowStart && d < dayAfter;
  });
  const nextLessons = lessons.filter((l) => lessonDateTime(l) >= dayAfter);

  const weekLessons = lessons.filter((l) => {
    const d = lessonDateTime(l);
    return d >= weekStart && d < weekEnd;
  });

  const tabLessons =
    tab === "today" ? todayLessons : tab === "tomorrow" ? tomorrowLessons : nextLessons;

  const nextFreeSlot = (() => {
    if (todayLessons.length === 0) return null;
    const last = todayLessons[todayLessons.length - 1];
    const end = new Date(lessonDateTime(last).getTime() + (last.duration_minutes ?? 60) * 60000);
    if (end >= tomorrowStart) return null;
    return `${String(end.getHours()).padStart(2, "0")}:${String(end.getMinutes()).padStart(2, "0")}`;
  })();

  const earningsPct = Math.min(100, (weekEarnings / WEEKLY_EARNINGS_GOAL) * 100);
  const lessonsPct = Math.min(100, (weekLessons.length / WEEKLY_LESSON_GOAL) * 100);

  const pupilName = (l?: LessonRow) => l?.pupils?.name ?? "Pupil";

  const quickAccessTiles = [
    { icon: <CalendarIcon size={16} color="#1E40AF" />, tint: "#DBEAFE", label: "Schedule", route: "/schedule" },
    { icon: <Users size={16} color="#059669" />, tint: "#ECFDF5", label: "Pupils", route: "/pupils" },
    { icon: <PoundSterling size={16} color="#5B21B6" />, tint: "#EDE9FE", label: "Payments", route: "/payments" },
    { icon: <MessageSquare size={16} color="#1A52A0" />, tint: "#DBEAFE", label: "Messages", route: "/messages" },
    { icon: <TrendingUp size={16} color="#059669" />, tint: "#ECFDF5", label: "Earnings", route: "/earnings" },
    { icon: <Receipt size={16} color="#92400E" />, tint: "#FEF3C7", label: "Expenses", route: "/expenses" },
    { icon: <Car size={16} color="#DC2626" />, tint: "#FEF2F2", label: "Mileage", route: "/mileage" },
    { icon: <Fuel size={16} color="#92400E" />, tint: "#FEF3C7", label: "Fuel", route: "/fuel" },
    { icon: <BarChart2 size={16} color="#1E40AF" />, tint: "#DBEAFE", label: "Reports", route: "/reports" },
    { icon: <TrendingUp size={16} color="#5B21B6" />, tint: "#EDE9FE", label: "Performance", route: "/performance" },
    { icon: <GraduationCap size={16} color="#059669" />, tint: "#ECFDF5", label: "Tests", route: "/tests" },
    { icon: <Star size={16} color="#92400E" />, tint: "#FEF3C7", label: "Reviews", route: "/reviews" },
    { icon: <Inbox size={16} color="#1A52A0" />, tint: "#DBEAFE", label: "Enquiries", route: "/enquiries" },
    { icon: <Clock size={16} color="#DC2626" />, tint: "#FEF2F2", label: "Waiting list", route: "/waitinglist" },
    { icon: <Gift size={16} color="#059669" />, tint: "#ECFDF5", label: "Referrals", route: "/referrals" },
    { icon: <Car size={16} color="#52525B" />, tint: "#F4F4F5", label: "Vehicle", route: "/vehicle" },
    { icon: <BookOpen size={16} color="#1E40AF" />, tint: "#DBEAFE", label: "CPD", route: "/cpd" },
    { icon: <ClipboardCheck size={16} color="#5B21B6" />, tint: "#EDE9FE", label: "Standards", route: "/standards" },
    { icon: <Calculator size={16} color="#92400E" />, tint: "#FEF3C7", label: "Tax", route: "/tax" },
    { icon: <CheckSquare size={16} color="#059669" />, tint: "#ECFDF5", label: "Todos", route: "/todos" },
    { icon: <FileText size={16} color="#92400E" />, tint: "#FEF3C7", label: "Notes", route: "/notes" },
    { icon: <FolderOpen size={16} color="#1E40AF" />, tint: "#DBEAFE", label: "Documents", route: "/documents" },
    { icon: <ClipboardList size={16} color="#5B21B6" />, tint: "#EDE9FE", label: "Manifest", route: "/manifest" },
    { icon: <CheckSquare size={16} color="#059669" />, tint: "#ECFDF5", label: "Checklist", route: "/checklist" },
    { icon: <Bell size={16} color="#DC2626" />, tint: "#FEF2F2", label: "Reminders", route: "/reminder" },
    { icon: <Heart size={16} color="#92400E" />, tint: "#FEF3C7", label: "Health", route: "/health" },
    { icon: <BookOpen size={16} color="#059669" />, tint: "#ECFDF5", label: "Resources", route: "/resources" },
    { icon: <HelpCircle size={16} color="#52525B" />, tint: "#F4F4F5", label: "Help", route: "/help" },
    { icon: <LayoutGrid size={16} color="#1A52A0" />, tint: "#EEF4FB", label: "Pipeline", route: "/pipeline" },
    { icon: <FileSignature size={16} color="#1A52A0" />, tint: "#EEF4FB", label: "Waivers", route: "/waivers" },
    { icon: <Search size={16} color="#1A52A0" />, tint: "#EEF4FB", label: "Find gaps", route: "/gaps" },
    { icon: <Users size={16} color="#1A52A0" />, tint: "#EEF4FB", label: "Bulk message", route: "/bulkmessage" },
    { icon: <Navigation size={16} color="#1A52A0" />, tint: "#EEF4FB", label: "Sat Nav", route: "/satnav" },
    { icon: <BarChart2 size={16} color="#1A52A0" />, tint: "#EEF4FB", label: "Weekly report", route: "/weeklyreport" },
  ] as const;

  return (
    <div className="min-h-screen pb-24 pb-safe" style={{ ...POPPINS, backgroundColor: '#F2F4F8' }}>
      {/* TOP BAR */}
      <div
        className="sticky top-0 z-40 h-[52px] px-4 flex items-center justify-between"
        style={{ backgroundColor: "#0F2044" }}
      >
        <div className="flex items-center gap-2">
          <span className="text-white text-[15px] font-bold">DSM</span>
          <span className="text-white text-[15px]">{firstName}</span>
          <span
            className="rounded-full"
            style={{ width: 8, height: 8, backgroundColor: "#16A34A" }}
          />
        </div>
        <div className="flex items-center" style={{ gap: 16 }}>
          <Phone size={20} color="#ffffff" />
          <Car size={20} color="#ffffff" />
          <button
            type="button"
            aria-label="Notifications"
            onClick={() => navigate({ to: "/notifications" })}
            className="relative flex items-center justify-center"
            style={{ width: 28, height: 28 }}
          >
            <Bell size={20} color="#ffffff" />
            {notifCount > 0 && (
              <span
                className="absolute -top-1 -right-1 rounded-full text-white text-[9px] font-bold flex items-center justify-center"
                style={{ minWidth: 14, height: 14, backgroundColor: "#CC2229", padding: "0 3px" }}
              >
                {notifCount}
              </span>
            )}
          </button>
          <Menu size={20} color="#ffffff" />
        </div>
      </div>

      {/* NAVY HEADER SECTION (hero + stats strip) */}
      <div style={{ backgroundColor: '#0F2044', paddingBottom: 14 }}>
        {/* NEXT LESSON HERO */}
        <div style={{ backgroundColor: '#FFFFFF', borderRadius: 14, boxShadow: '0 2px 12px rgba(0,0,0,0.10)', overflow: 'hidden', margin: '12px 16px 0' }}>
          <div style={{ textAlign: 'left', padding: 13, cursor: 'pointer', position: 'relative', overflow: 'hidden' }}>
            {/* Car image with mask */}
            <img
              src={carAsset.url}
              alt=""
              aria-hidden
              style={{
                position: 'absolute',
                zIndex: 0,
                right: -30,
                top: -45,
                height: '100%',
                width: '65%',
                objectFit: 'cover',
                objectPosition: 'center 25%',
                opacity: 1,
                pointerEvents: 'none',
                WebkitMaskImage: 'linear-gradient(to right, transparent 0%, rgba(0,0,0,0.9) 25%, #000 60%), linear-gradient(to bottom, #000 0%, #000 65%, rgba(0,0,0,0.5) 88%, transparent 100%)',
                WebkitMaskComposite: 'source-in',
                maskImage: 'linear-gradient(to right, transparent 0%, rgba(0,0,0,0.9) 25%, #000 60%), linear-gradient(to bottom, #000 0%, #000 65%, rgba(0,0,0,0.5) 88%, transparent 100%)',
                maskComposite: 'intersect',
              }}
            />
            {/* Label */}
            <div style={{ fontSize: 9, fontWeight: 700, color: '#9CA3AF', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 6, fontFamily: 'Poppins, sans-serif', position: 'relative' }}>
              Next lesson · {upcoming ? formatDayLabel(lessonDateTime(upcoming)) : '—'}
            </div>
            {/* Content */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative' }}>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: 28, fontWeight: 900, color: '#0F2044', letterSpacing: -1, lineHeight: '30px', fontFamily: 'Poppins, sans-serif', textShadow: '0 1px 2px rgba(255,255,255,0.9)' }}>
                  {upcoming ? formatTime(upcoming) : '—'}
                </div>
                <div style={{ fontSize: 15, fontWeight: 800, color: '#0F2044', marginTop: 4, fontFamily: 'Poppins, sans-serif', textShadow: '0 1px 2px rgba(255,255,255,0.9)' }}>
                  {upcoming ? pupilName(upcoming) : 'No upcoming lessons'}
                </div>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginTop: 2, fontFamily: 'Poppins, sans-serif', textShadow: '0 1px 2px rgba(255,255,255,0.9)' }}>
                  {upcoming ? formatDuration(upcoming.duration_minutes) : ''}
                </div>
              </div>
            </div>
            {/* Action buttons */}
            {upcoming && (
              <div style={{ display: 'flex', gap: 8, marginTop: 12, position: 'relative' }}>
                <button style={{ flex: 1, height: 36, background: '#CC2229', color: '#fff', borderRadius: 8, fontSize: 13, fontWeight: 600, border: 'none', cursor: 'pointer', fontFamily: 'Poppins, sans-serif' }}>📞 Call</button>
                <button style={{ flex: 1, height: 36, background: '#F3F4F6', color: '#1A1A2E', borderRadius: 8, fontSize: 13, fontWeight: 600, border: 'none', cursor: 'pointer', fontFamily: 'Poppins, sans-serif' }}>💬 Text</button>
                <button style={{ flex: 1, height: 36, background: '#16A34A', color: '#fff', borderRadius: 8, fontSize: 13, fontWeight: 600, border: 'none', cursor: 'pointer', fontFamily: 'Poppins, sans-serif' }}>➤ Go</button>
              </div>
            )}
          </div>
        </div>

        {/* STATS STRIP on navy */}
        {loading ? (
          <div
            className="skeleton-pulse"
            style={{ margin: '10px 16px 0', height: 78, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.16)' }}
          />
        ) : (
          <div
            style={{
              margin: '10px 16px 0',
              backgroundColor: 'rgba(255,255,255,0.16)',
              border: '1px solid rgba(255,255,255,0.22)',
              borderRadius: 12,
              overflow: 'hidden',
              boxShadow: '0 4px 14px rgba(0,0,0,0.18)',
              display: 'flex',
            }}
          >
            <div style={{ flex: 1, padding: '10px 12px', borderRight: '1px solid rgba(255,255,255,0.22)' }}>
              <div style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.85)', textTransform: 'uppercase', letterSpacing: 0.8 }}>
                EARNINGS · WEEK
              </div>
              <div style={{ fontSize: 19, fontWeight: 800, color: '#FFD27A', marginTop: 2, lineHeight: 1.1 }}>
                £{weekEarnings.toFixed(0)}
              </div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.75)', marginTop: 2 }}>
                £{todayEarnings.toFixed(0)} today
              </div>
              <div style={{ height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.18)', marginTop: 6, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${earningsPct}%`, backgroundColor: '#CC2229' }} />
              </div>
            </div>
            <div style={{ flex: 1, padding: '10px 12px' }}>
              <div style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.85)', textTransform: 'uppercase', letterSpacing: 0.8 }}>
                LESSONS · WEEK
              </div>
              <div style={{ fontSize: 19, fontWeight: 800, color: '#8FF0C2', marginTop: 2, lineHeight: 1.1 }}>
                {weekLessons.length}/{WEEKLY_LESSON_GOAL}
              </div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.75)', marginTop: 2 }}>
                {todayLessons.length} today
              </div>
              <div style={{ height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.18)', marginTop: 6, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${lessonsPct}%`, backgroundColor: '#1A52A0' }} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* TODAY STRIP — 3 white tiles */}
      <div style={{ display: 'flex', gap: 8, padding: '12px 16px 0' }}>
        <TodayTile value={String(todayLessons.length)} label="Lessons today" valueColor="#1a1a1f" valueSize={22} />
        <TodayTile value={nextFreeSlot ?? '—'} label="Next free slot" valueColor="#2952b3" valueSize={13} />
        <TodayTile value={`£${outstanding.toFixed(0)}`} label="Outstanding" valueColor={outstanding > 0 ? '#c9302c' : '#1a1a1f'} valueSize={13} />
      </div>

      {/* NEEDS ATTENTION */}
      <NeedsAttention
        jobs={0}
        tests={0}
        calls={0}
        enqs={0}
        onNavigate={(to) => navigate({ to })}
      />


      {/* SCHEDULE */}
      <div className="mx-4 mt-4">
        <SectionHeader>SCHEDULE · {formatDayLabel(todayStart)}</SectionHeader>
        <div className="flex" style={{ gap: 8 }}>
          <TabBtn active={tab === "today"} onClick={() => setTab("today")}>
            Today / {formatShortDate(todayStart)}
          </TabBtn>
          <TabBtn active={tab === "tomorrow"} onClick={() => setTab("tomorrow")}>
            Tomorrow / {formatShortDate(tomorrowStart)}
          </TabBtn>
          <TabBtn active={tab === "next"} onClick={() => setTab("next")}>
            Next
          </TabBtn>
        </div>

        <div className="mt-3 flex flex-col" style={{ gap: 8 }}>
          {tabLessons.length === 0 ? (
            <div
              className="flex flex-col items-center justify-center text-[13px]"
              style={{ color: "#6B7280", padding: "24px 0" }}
            >
              <CalendarOff size={24} color="#6B7280" />
              <div className="mt-2">Nothing scheduled for {tab === "today" ? "today" : tab === "tomorrow" ? "tomorrow" : "later"}</div>
            </div>
          ) : (
            tabLessons.map((l) => (
              <div
                key={l.id}
                className="bg-white flex items-center justify-between"
                style={{
                  padding: 12,
                  borderRadius: 10,
                  borderWidth: "0.5px",
                  borderStyle: "solid",
                  borderColor: "#E2E6ED",
                }}
              >
                <div className="flex items-center" style={{ gap: 12 }}>
                  <span className="text-[14px] font-bold text-[#0F2044]">
                    {formatTime(l)}
                  </span>
                  <div>
                    <div className="text-[14px] text-[#0F2044]">{pupilName(l)}</div>
                    <div className="text-[12px] text-[#6B7280]">
                      {formatDuration(l.duration_minutes)}
                    </div>
                  </div>
                </div>
                <span
                  className="text-[10px] uppercase font-medium"
                  style={{
                    color: statusColor(l.status),
                    letterSpacing: "0.05em",
                    padding: "3px 8px",
                    borderRadius: 999,
                    backgroundColor: `${statusColor(l.status)}14`,
                  }}
                >
                  {l.status}
                </span>
              </div>
            ))
          )}
        </div>

        <div className="mt-3 flex" style={{ gap: 16 }}>
          <button
            className="flex items-center text-[13px] font-medium"
            style={{ color: "#16A34A", gap: 4 }}
            onClick={() => navigate({ to: "/lessons/new" })}
          >
            <Plus size={14} /> Add lesson
          </button>
          <button
            className="flex items-center text-[13px] font-medium"
            style={{ color: "#1A52A0", gap: 4 }}
          >
            <RefreshCw size={14} /> Fill gaps
          </button>
        </div>
      </div>

      {/* QUICK ACCESS */}
      <div className="mx-4 mt-4">
        <div className="flex items-center justify-between">
          {searchOpen ? (
            <div className="flex items-center flex-1 gap-2" style={{ height: 32 }}>
              <Search size={16} color="#6B7280" />
              <input
                autoFocus
                type="text"
                placeholder="Search…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 text-[13px] text-[#0F2044] outline-none bg-transparent"
                style={{ fontFamily: "Poppins, sans-serif" }}
              />
              <button
                type="button"
                onClick={() => { setSearchOpen(false); setSearchQuery(""); }}
                className="text-[12px] text-[#6B7280]"
              >
                Cancel
              </button>
            </div>
          ) : (
            <>
              <SectionHeader>QUICK ACCESS</SectionHeader>
              <button
                type="button"
                aria-label="Search quick access"
                onClick={() => setSearchOpen(true)}
                className="flex items-center justify-center"
                style={{ width: 28, height: 28 }}
              >
                <Search size={16} color="#6B7280" />
              </button>
            </>
          )}
        </div>
        <div
          className="quick-access-scroll flex"
          style={{
            flexDirection: "column",
            flexWrap: "wrap",
            height: 168,
            gap: 8,
            overflowX: "auto",
            overflowY: "hidden",
            scrollSnapType: "x mandatory",
            WebkitOverflowScrolling: "touch",
            scrollbarWidth: "none",
            msOverflowStyle: "none",
          }}
        >
          {quickAccessTiles
            .filter((t) => t.label.toLowerCase().includes(searchQuery.toLowerCase()))
            .map((t) => (
              <AccessTile
                key={t.label}
                icon={t.icon}
                tint={t.tint}
                label={t.label}
                onClick={() => navigate({ to: t.route })}
              />
            ))}
          {quickAccessTiles.filter((t) =>
            t.label.toLowerCase().includes(searchQuery.toLowerCase())
          ).length === 0 && (
            <div
              className="flex items-center justify-center text-[12px] text-[#6B7280]"
              style={{ width: "100%", height: 168 }}
            >
              No results for “{searchQuery}”
            </div>
          )}
        </div>
      </div>
      <style>{`
        .quick-access-scroll::-webkit-scrollbar {
          display: none;
        }
        @keyframes skeleton-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        .skeleton-pulse {
          animation: skeleton-pulse 1.5s ease-in-out infinite;
        }
      `}</style>

    </div>
  );
}

function QuickTile({
  value,
  label,
  valueColor,
  valueSize,
}: {
  value: string;
  label: string;
  valueColor: string;
  valueSize: number;
}) {
  return (
    <div
      className="flex-1 bg-white"
      style={{
        borderWidth: "0.5px",
        borderStyle: "solid",
        borderColor: "#E2E6ED",
        borderRadius: 10,
        padding: 10,
      }}
    >
      <div className="font-bold" style={{ color: valueColor, fontSize: valueSize }}>
        {value}
      </div>
      <div
        className="text-[9px] uppercase mt-1"
        style={{ color: "#6B7280", letterSpacing: "0.06em" }}
      >
        {label}
      </div>
    </div>
  );
}

function TabBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className="flex-1 text-[12px]"
      style={{
        backgroundColor: active ? "#ffffff" : "transparent",
        color: active ? "#0F2044" : "#6B7280",
        borderWidth: "0.5px",
        borderStyle: "solid",
        borderColor: active ? "#E2E6ED" : "transparent",
        borderRadius: 8,
        padding: "8px 6px",
        fontWeight: active ? 600 : 400,
      }}
    >
      {children}
    </button>
  );
}

function AccessTile({
  icon,
  tint,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  tint: string;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="bg-white flex flex-col items-center justify-center"
      style={{
        width: 80,
        height: 80,
        borderWidth: "0.5px",
        borderStyle: "solid",
        borderColor: "#E2E6ED",
        borderRadius: 10,
        gap: 4,
        padding: "4px 2px",
        scrollSnapAlign: "start",
        flexShrink: 0,
      }}
    >
      <span
        className="flex items-center justify-center rounded-full"
        style={{ width: 32, height: 32, backgroundColor: tint }}
      >
        {icon}
      </span>
      <span className="text-[10px] text-[#0F2044] text-center leading-tight">{label}</span>
    </button>
  );
}
