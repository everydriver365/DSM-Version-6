import { createFileRoute, useNavigate } from "@tanstack/react-router";
import type React from "react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
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
  MapPin,
  Upload,
  Award,
  ToggleLeft,
  Sun,
  Zap,
  CalendarDays,
  Crown,
  X,
  UserCircle,
  PlayCircle,
  ChevronDown,
  ChevronRight,
  Send,
  CheckCheck,
  FileSpreadsheet,
  AlertCircle,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import { SectionHeader } from "../components/dsm/SectionHeader";
import { supabase } from "../lib/supabaseClient";
import {
  getPermission,
  requestPermission,
  scheduleLessonReminder,
  isSupported as notificationsSupported,
} from "../lib/pushNotifications";
import carAsset from "../assets/next-lesson-car.png.asset.json";
import dsmLogo from "../assets/dsm-logo.png.asset.json";


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
  notes?: string | null;
  pupils?: { name: string; phone: string | null; balance_owed?: number | null } | null;
}

interface PrevLessonRow {
  id: string;
  lesson_date: string;
  status: string;
  notes: string | null;
}

const POPPINS = { fontFamily: "Poppins, sans-serif" } as const;
const WEEKLY_LESSON_GOAL = 30;
const WEEKLY_EARNINGS_GOAL = 1000;

function CircleIconBtn({
  children, onClick, ariaLabel,
}: { children: React.ReactNode; onClick: () => void; ariaLabel: string }) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      onClick={onClick}
      className="relative flex items-center justify-center"
      style={{
        width: 36, height: 36, borderRadius: 18,
        background: "rgba(255,255,255,0.15)",
        border: "none", cursor: "pointer",
      }}
    >
      {children}
    </button>
  );
}

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
  const [notifPermission, setNotifPermission] = useState<"granted" | "denied" | "default">(
    () => (notificationsSupported() ? getPermission() : "denied"),
  );
  const [notifPromptDismissed, setNotifPromptDismissed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.sessionStorage.getItem("dsm:notifPromptDismissed") === "1";
  });
  const [heroExpanded, setHeroExpanded] = useState(false);
  const [prevLesson, setPrevLesson] = useState<PrevLessonRow | null>(null);
  const [goingActive, setGoingActive] = useState(false);
  const [lateOpen, setLateOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);





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
        .select("id, lesson_date, lesson_time, duration_minutes, status, pupil_id, notes, pupils(name,phone,balance_owed)")
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
        .select("id, lesson_date, lesson_time, duration_minutes, status, pupil_id, notes, pupils(name,phone,balance_owed)")
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

  // Schedule a local reminder 1h before the next lesson if it's today & >1h away.
  useEffect(() => {
    if (!nextLesson) return;
    if (notifPermission !== "granted") return;
    const t = (nextLesson.lesson_time ?? "00:00:00").slice(0, 8);
    const time = t.length === 5 ? `${t}:00` : t;
    const lessonAt = new Date(`${nextLesson.lesson_date}T${time}`);
    const msAway = lessonAt.getTime() - Date.now();
    const isToday = ymd(lessonAt) === ymd(new Date());
    if (!isToday) return;
    if (msAway <= 60 * 60 * 1000) return;
    const cleanup = scheduleLessonReminder(nextLesson);
    return cleanup;
  }, [nextLesson, notifPermission]);


  const upcoming = nextLesson ?? lessons.find((l) => lessonDateTime(l) >= now) ?? lessons[0];

  // Fetch previous lesson for the upcoming pupil when hero expands
  useEffect(() => {
    if (!heroExpanded || !upcoming?.pupil_id || !userId) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("lessons")
        .select("id, lesson_date, status, notes")
        .eq("instructor_id", userId)
        .eq("pupil_id", upcoming.pupil_id)
        .is("deleted_at", null)
        .lt("lesson_date", ymd(todayStart))
        .order("lesson_date", { ascending: false })
        .limit(1);
      if (!cancelled) setPrevLesson((data?.[0] ?? null) as PrevLessonRow | null);
    })();
    return () => {
      cancelled = true;
    };
  }, [heroExpanded, upcoming?.pupil_id, userId, todayStart]);

  const todayLessons = lessons.filter((l) => {
    const d = lessonDateTime(l);
    return d >= todayStart && d < tomorrowStart;
  });
  const tomorrowLessons = lessons.filter((l) => {
    const d = lessonDateTime(l);
    return d >= tomorrowStart && d < dayAfter;
  });
  const nextLessons = lessons.filter((l) => lessonDateTime(l) >= dayAfter);
  const nextTabLessons = nextLessons.slice(0, 10);

  const weekLessons = lessons.filter((l) => {
    const d = lessonDateTime(l);
    return d >= weekStart && d < weekEnd;
  });

  const tabLessons =
    tab === "today" ? todayLessons : tab === "tomorrow" ? tomorrowLessons : nextTabLessons;

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

  const renderLessonCard = (l: LessonRow) => {
    const start = lessonDateTime(l);
    const end = new Date(start.getTime() + (l.duration_minutes ?? 60) * 60000);
    const isLive = now >= start && now < end;
    const status = (l.status ?? "").toLowerCase();
    const accent =
      isLive ? "#CC2229"
      : status === "completed" ? "#16A34A"
      : status === "cancelled" ? "#9CA3AF"
      : "#1A52A0";
    const balance = l.pupils?.balance_owed ?? 0;
    const paid = balance <= 0;
    return (
      <div
        key={l.id}
        className="bg-white flex items-center justify-between"
        style={{
          position: "relative",
          overflow: "hidden",
          padding: 12,
          paddingLeft: 16,
          borderRadius: 10,
          borderWidth: "0.5px",
          borderStyle: "solid",
          borderColor: "#E2E6ED",
          marginBottom: 6,
          backgroundColor: isLive ? "#FFF5F5" : "#FFFFFF",
        }}
      >
        <span
          aria-hidden
          style={{
            position: "absolute",
            left: 0,
            top: 10,
            bottom: 10,
            width: 3,
            borderRadius: 2,
            backgroundColor: accent,
          }}
        />
        <div className="flex items-center" style={{ gap: 12 }}>
          <span className="text-[14px] font-bold" style={{ color: accent }}>
            {formatTime(l)}
          </span>
          <div>
            <div className="text-[14px] font-semibold text-[#0F2044]">{pupilName(l)}</div>
            <div style={{ fontSize: 13, color: "#6B7280" }}>
              {formatDuration(l.duration_minutes)}
            </div>
          </div>
        </div>
        {isLive ? (
          <span
            className="text-[12px] font-medium inline-flex items-center"
            style={{
              gap: 6,
              color: "#CC2229",
              padding: "3px 8px",
              borderRadius: 999,
              backgroundColor: "#FFECEC",
            }}
          >
            <span style={{ width: 6, height: 6, borderRadius: 999, backgroundColor: "#CC2229" }} />
            In progress
          </span>
        ) : (
          <span
            className="text-[12px] inline-flex items-center"
            style={{
              gap: 6,
              color: paid ? "#1A7A3C" : "#D33B3B",
              padding: "3px 8px",
              borderRadius: 999,
              backgroundColor: paid ? "#E8F8ED" : "#FFECEC",
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: 999,
                backgroundColor: paid ? "#1A7A3C" : "#D33B3B",
              }}
            />
            {paid ? "Paid" : "Not paid"}
          </span>
        )}
      </div>
    );
  };

  const quickAccessTiles = [
    { icon: <CalendarIcon size={20} color="#FFFFFF" />, bg: "#1A52A0", label: "Schedule", route: "/schedule" },
    { icon: <Users size={20} color="#FFFFFF" />, bg: "#16A34A", label: "Pupils", route: "/pupils" },
    { icon: <PoundSterling size={20} color="#FFFFFF" />, bg: "#7C3AED", label: "Payments", route: "/payments" },
    { icon: <MessageSquare size={20} color="#FFFFFF" />, bg: "#1A52A0", label: "Messages", route: "/messages" },
    { icon: <TrendingUp size={20} color="#FFFFFF" />, bg: "#16A34A", label: "Earnings", route: "/earnings" },
    { icon: <Receipt size={20} color="#FFFFFF" />, bg: "#D97706", label: "Expenses", route: "/expenses" },
    { icon: <Car size={20} color="#FFFFFF" />, bg: "#DC2626", label: "Mileage", route: "/mileage" },
    { icon: <Fuel size={20} color="#FFFFFF" />, bg: "#D97706", label: "Fuel", route: "/fuel" },
    { icon: <BarChart2 size={20} color="#FFFFFF" />, bg: "#1A52A0", label: "Reports", route: "/reports" },
    { icon: <TrendingUp size={20} color="#FFFFFF" />, bg: "#7C3AED", label: "Performance", route: "/performance" },
    { icon: <GraduationCap size={20} color="#FFFFFF" />, bg: "#16A34A", label: "Tests", route: "/tests" },
    { icon: <GraduationCap size={20} color="#FFFFFF" />, bg: "#DC2626", label: "Courses", route: "/courses" },
    { icon: <Star size={20} color="#FFFFFF" />, bg: "#D97706", label: "Reviews", route: "/reviews" },
    { icon: <Inbox size={20} color="#FFFFFF" />, bg: "#1A52A0", label: "Enquiries", route: "/enquiries" },
    { icon: <Clock size={20} color="#FFFFFF" />, bg: "#DC2626", label: "Waiting list", route: "/waitinglist" },
    { icon: <Gift size={20} color="#FFFFFF" />, bg: "#16A34A", label: "Referrals", route: "/referrals" },
    { icon: <Car size={20} color="#FFFFFF" />, bg: "#6B7280", label: "Vehicle", route: "/vehicle" },
    { icon: <BookOpen size={20} color="#FFFFFF" />, bg: "#1A52A0", label: "CPD", route: "/cpd" },
    { icon: <ClipboardCheck size={20} color="#FFFFFF" />, bg: "#7C3AED", label: "Standards", route: "/standards" },
    { icon: <Calculator size={20} color="#FFFFFF" />, bg: "#D97706", label: "Tax", route: "/tax" },
    { icon: <CheckSquare size={20} color="#FFFFFF" />, bg: "#7C3AED", label: "Todos", route: "/todos" },
    { icon: <FileText size={20} color="#FFFFFF" />, bg: "#D97706", label: "Notes", route: "/notes" },
    { icon: <FolderOpen size={20} color="#FFFFFF" />, bg: "#1A52A0", label: "Documents", route: "/documents" },
    { icon: <ClipboardList size={20} color="#FFFFFF" />, bg: "#7C3AED", label: "Manifest", route: "/manifest" },
    { icon: <CheckSquare size={20} color="#FFFFFF" />, bg: "#16A34A", label: "Checklist", route: "/checklist" },
    { icon: <Bell size={20} color="#FFFFFF" />, bg: "#DC2626", label: "Reminders", route: "/reminder" },
    { icon: <Heart size={20} color="#FFFFFF" />, bg: "#D97706", label: "Health", route: "/health" },
    { icon: <BookOpen size={20} color="#FFFFFF" />, bg: "#16A34A", label: "Resources", route: "/resources" },
    { icon: <HelpCircle size={20} color="#FFFFFF" />, bg: "#6B7280", label: "Help", route: "/help" },
    { icon: <LayoutGrid size={20} color="#FFFFFF" />, bg: "#7C3AED", label: "Pipeline", route: "/pipeline" },
    { icon: <FileSignature size={20} color="#FFFFFF" />, bg: "#6B7280", label: "Waivers", route: "/waivers" },
    { icon: <Search size={20} color="#FFFFFF" />, bg: "#1A52A0", label: "Find gaps", route: "/gaps" },
    { icon: <Users size={20} color="#FFFFFF" />, bg: "#DC2626", label: "Bulk message", route: "/bulkmessage" },
    { icon: <Navigation size={20} color="#FFFFFF" />, bg: "#16A34A", label: "Sat Nav", route: "/satnav" },
    { icon: <BarChart2 size={20} color="#FFFFFF" />, bg: "#1A52A0", label: "Weekly report", route: "/weeklyreport" },
    { icon: <MapPin size={20} color="#FFFFFF" />, bg: "#DC2626", label: "Locations", route: "/locations" },
    { icon: <Upload size={20} color="#FFFFFF" />, bg: "#6B7280", label: "Import", route: "/dataimport" },
    { icon: <Award size={20} color="#FFFFFF" />, bg: "#D97706", label: "Certifications", route: "/certifications" },
    { icon: <ToggleLeft size={20} color="#FFFFFF" />, bg: "#1A52A0", label: "Availability", route: "/availability" },
    { icon: <Sun size={20} color="#FFFFFF" />, bg: "#D97706", label: "EOD", route: "/eod" },
    { icon: <Zap size={20} color="#FFFFFF" />, bg: "#7C3AED", label: "Automations", route: "/automations" },
    { icon: <CalendarDays size={20} color="#FFFFFF" />, bg: "#1A52A0", label: "Diary", route: "/diary" },
    { icon: <Crown size={20} color="#FFFFFF" />, bg: "#7C3AED", label: "My plan", route: "/subscription" },
    { icon: <PlayCircle size={20} color="#FFFFFF" />, bg: "#DC2626", label: "Live session", route: "/livesession" },
    { icon: <Search size={20} color="#FFFFFF" />, bg: "#6B7280", label: "Search", route: "/search" },
    { icon: <Bell size={20} color="#FFFFFF" />, bg: "#DC2626", label: "Notifications", route: "/notifications" },
    { icon: <CalendarDays size={20} color="#FFFFFF" />, bg: "#1A52A0", label: "Availability", route: "/quickavailability" },
    { icon: <RefreshCw size={20} color="#FFFFFF" />, bg: "#7C3AED", label: "Calendar sync", route: "/calendarsync" },
    { icon: <UserCircle size={20} color="#FFFFFF" />, bg: "#1A52A0", label: "Profile", route: "/profile" },
    { icon: <FileSpreadsheet size={20} color="#FFFFFF" />, bg: "#D97706", label: "MTD", route: "/mtd" },
    { icon: <FileText size={20} color="#FFFFFF" />, bg: "#D97706", label: "Quotes", route: "/quotes" },
    { icon: <Sun size={20} color="#FFFFFF" />, bg: "#16A34A", label: "Briefing", route: "/briefing" },
    { icon: <AlertCircle size={20} color="#FFFFFF" />, bg: "#DC2626", label: "Outstanding", route: "/outstanding" },

  ] as const;

  return (
    <div className="min-h-screen pb-24 pb-safe" style={{ ...POPPINS, backgroundColor: '#F2F4F8', margin: -8 }}>
      {/* TOP BAR */}
      <div
        className="sticky top-0 z-40 h-[56px] px-4 flex items-center justify-between"
        style={{ backgroundColor: "#0F2044" }}
      >
        <div className="flex items-center gap-2">
          <img
            src={dsmLogo.url}
            alt="DSM"
            style={{ height: 28, width: 'auto', objectFit: 'contain' }}
          />
          <span className="text-white text-[15px]">{firstName}</span>
          <span
            className="rounded-full"
            style={{ width: 8, height: 8, backgroundColor: "#16A34A" }}
          />
        </div>

        {/* RIGHT: circular icon buttons */}
        <div className="flex items-center" style={{ gap: 8 }}>
          <CircleIconBtn
            ariaLabel="Call next pupil"
            onClick={() => {
              const phone = nextLesson?.pupils?.phone;
              if (phone) window.location.href = `tel:${phone}`;
              else navigate({ to: "/pupils" });
            }}
          >
            <Phone size={18} color="#ffffff" />
          </CircleIconBtn>
          <CircleIconBtn ariaLabel="Vehicle" onClick={() => navigate({ to: "/vehicle" })}>
            <Car size={18} color="#ffffff" />
          </CircleIconBtn>
          <CircleIconBtn ariaLabel="Notifications" onClick={() => navigate({ to: "/notifications" })}>
            <Bell size={18} color="#ffffff" />
            {notifCount > 0 && (
              <span
                className="absolute rounded-full text-white text-[9px] font-bold flex items-center justify-center"
                style={{
                  top: -2, right: -2, minWidth: 16, height: 16,
                  backgroundColor: "#CC2229", padding: "0 4px",
                  border: "1.5px solid #0F2044",
                }}
              >
                {notifCount}
              </span>
            )}
          </CircleIconBtn>
          <CircleIconBtn ariaLabel="Menu" onClick={() => setMenuOpen(true)}>
            <Menu size={18} color="#ffffff" />
          </CircleIconBtn>
        </div>
      </div>

      {/* SLIDE-IN MENU */}
      {menuOpen && (
        <div
          onClick={() => setMenuOpen(false)}
          style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
            zIndex: 50, display: "flex", justifyContent: "flex-end",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "min(82vw, 320px)", height: "100vh", background: "#fff",
              boxShadow: "-4px 0 24px rgba(0,0,0,0.2)",
              display: "flex", flexDirection: "column",
              fontFamily: "Poppins, sans-serif",
            }}
          >
            <div style={{
              background: "#0F2044", color: "#fff", padding: "16px 18px",
              display: "flex", alignItems: "center", justifyContent: "space-between",
            }}>
              <div style={{ fontWeight: 700, fontSize: 16 }}>Menu</div>
              <button
                onClick={() => setMenuOpen(false)}
                aria-label="Close menu"
                style={{ background: "none", border: "none", color: "#fff", cursor: "pointer", display: "flex" }}
              >
                <X size={22} />
              </button>
            </div>
            <div style={{ overflowY: "auto", padding: "8px 0" }}>
              {[
                { label: "Home", to: "/home" as const },
                { label: "Schedule", to: "/schedule" as const },
                { label: "Pupils", to: "/pupils" as const },
                { label: "Lessons", to: "/schedule" as const },
                { label: "Payments", to: "/payments" as const },
                { label: "Earnings", to: "/earnings" as const },
                { label: "Expenses", to: "/expenses" as const },
                { label: "Mileage", to: "/mileage" as const },
                { label: "Messages", to: "/messages" as const },
                { label: "Enquiries", to: "/enquiries" as const },
                { label: "Tests", to: "/tests" as const },
                { label: "Courses", to: "/courses" as const },
                { label: "Quotes", to: "/quotes" as const },
                { label: "Day briefing", to: "/briefing" as const },
                { label: "Outstanding tasks", to: "/outstanding" as const },
                { label: "Reports", to: "/reports" as const },
                { label: "Vehicle", to: "/vehicle" as const },
                { label: "Documents", to: "/documents" as const },
                { label: "MTD", to: "/mtd" as const },
                { label: "Settings", to: "/settings" as const },
                { label: "Profile", to: "/profile" as const },
                { label: "Help", to: "/help" as const },
              ].map((m) => (
                <button
                  key={m.label}
                  onClick={() => { setMenuOpen(false); navigate({ to: m.to }); }}
                  style={{
                    width: "100%", textAlign: "left", padding: "12px 18px",
                    background: "none", border: "none", cursor: "pointer",
                    fontSize: 14, fontWeight: 500, color: "#0F2044",
                    fontFamily: "Poppins, sans-serif",
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                  }}
                >
                  {m.label}
                  <ChevronRight size={16} color="#9CA3AF" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* NAVY HEADER SECTION (hero + stats strip) */}
      <div style={{ backgroundColor: '#0F2044', paddingTop: 16, paddingBottom: 20, borderRadius: '0 0 16px 16px', overflow: 'hidden' }}>
        {/* NEXT LESSON HERO */}
        <div style={{ backgroundColor: '#FFFFFF', borderRadius: heroExpanded ? '16px 16px 0 0' : 16, boxShadow: '0 2px 12px rgba(0,0,0,0.10)', overflow: heroExpanded ? 'visible' : 'hidden', margin: '0 16px' }}>
          <div
            onClick={() => upcoming && setHeroExpanded((v) => !v)}
            style={{ textAlign: 'left', padding: 13, cursor: upcoming ? 'pointer' : 'default', position: 'relative', overflow: 'hidden' }}
          >
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
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    const phone = upcoming?.pupils?.phone;
                    if (phone) window.location.href = `tel:${phone}`;
                    else toast("No phone number for this pupil");
                  }}
                  style={{ flex: 1, height: 36, background: '#CC2229', color: '#fff', borderRadius: 8, fontSize: 13, fontWeight: 600, border: 'none', cursor: 'pointer', fontFamily: 'Poppins, sans-serif' }}
                >📞 Call</button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    const phone = upcoming?.pupils?.phone;
                    if (phone) window.location.href = `sms:${phone}`;
                    else toast("No phone number");
                  }}
                  style={{ flex: 1, height: 36, background: '#F3F4F6', color: '#1A1A2E', borderRadius: 8, fontSize: 13, fontWeight: 600, border: 'none', cursor: 'pointer', fontFamily: 'Poppins, sans-serif' }}
                >💬 Text</button>
                <button
                  onClick={(e) => { e.stopPropagation(); navigate({ to: "/livesession" }); }}
                  style={{ flex: 1, height: 36, background: '#16A34A', color: '#fff', borderRadius: 8, fontSize: 13, fontWeight: 600, border: 'none', cursor: 'pointer', fontFamily: 'Poppins, sans-serif' }}
                >➤ Go</button>
              </div>
            )}
          </div>
          {/* Expand affordance footer */}
          {upcoming && (
            <div
              onClick={() => setHeroExpanded((v) => !v)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                padding: '8px 12px',
                borderTop: '1px solid #EEF1F5',
                background: '#FAFBFC',
                cursor: 'pointer',
                fontFamily: 'Poppins, sans-serif',
                fontSize: 11,
                fontWeight: 700,
                color: '#1A52A0',
                textTransform: 'uppercase',
                letterSpacing: 0.6,
              }}
            >
              {heroExpanded ? 'Hide details' : 'Tap for details'}
              <ChevronDown
                size={16}
                color="#1A52A0"
                style={{ transition: 'transform 200ms', transform: heroExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}
              />
            </div>
          )}

          {upcoming && heroExpanded && (
            <HeroExpandedPanel
              lesson={upcoming}
              prev={prevLesson}
              goingActive={goingActive}
              setGoingActive={setGoingActive}
              onOpenLate={() => setLateOpen(true)}
              navigateTo={(to) => navigate({ to })}
            />
          )}
        </div>
        {/* Late sheet */}
        <Dialog open={lateOpen} onOpenChange={setLateOpen}>
          <DialogContent className="max-w-[320px]">
            <DialogHeader>
              <DialogTitle style={{ fontFamily: 'Poppins, sans-serif' }}>How many minutes late?</DialogTitle>
            </DialogHeader>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginTop: 8 }}>
              {[5, 10, 15, 20].map((m) => (
                <button
                  key={m}
                  onClick={() => {
                    const phone = upcoming?.pupils?.phone;
                    const first = (upcoming?.pupils?.name ?? 'there').split(/\s+/)[0];
                    if (!phone) { toast('No phone number'); setLateOpen(false); return; }
                    const body = encodeURIComponent(`Hi ${first}, running ${m} mins late, sorry!`);
                    window.location.href = `sms:${phone}?&body=${body}`;
                    setLateOpen(false);
                  }}
                  style={{ height: 44, borderRadius: 10, border: '1px solid #e3e6ec', background: '#fff', fontFamily: 'Poppins, sans-serif', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}
                >{m}m</button>
              ))}
            </div>
          </DialogContent>
        </Dialog>


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

      {/* ENABLE NOTIFICATIONS PROMPT */}
      {notificationsSupported() && notifPermission === "default" && !notifPromptDismissed && (
        <div
          style={{
            margin: "12px 16px 0",
            backgroundColor: "#FFFBEB",
            border: "1px solid #FCD34D",
            borderRadius: 12,
            padding: 12,
            display: "flex",
            alignItems: "center",
            gap: 10,
            fontFamily: "Poppins, sans-serif",
          }}
        >
          <span
            style={{
              width: 32,
              height: 32,
              borderRadius: 999,
              backgroundColor: "#FEF3C7",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <Bell size={16} color="#92400E" />
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#92400E" }}>
              Enable lesson reminders?
            </div>
            <div style={{ fontSize: 11, color: "#78350F", marginTop: 2 }}>
              Get a notification 1 hour before each lesson.
            </div>
          </div>
          <button
            type="button"
            onClick={async () => {
              const result = await requestPermission();
              setNotifPermission(result);
              if (result !== "default") {
                window.sessionStorage.setItem("dsm:notifPromptDismissed", "1");
                setNotifPromptDismissed(true);
              }
            }}
            style={{
              background: "#1A52A0",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              padding: "8px 12px",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: "Poppins, sans-serif",
              flexShrink: 0,
            }}
          >
            Enable
          </button>
          <button
            type="button"
            aria-label="Dismiss"
            onClick={() => {
              window.sessionStorage.setItem("dsm:notifPromptDismissed", "1");
              setNotifPromptDismissed(true);
            }}
            style={{
              background: "transparent",
              border: "none",
              padding: 4,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <X size={16} color="#92400E" />
          </button>
        </div>
      )}



      {/* NEEDS ATTENTION */}
      <NeedsAttention
        jobs={0}
        tests={0}
        calls={0}
        enqs={0}
        onNavigate={(to) => navigate({ to })}
      />


      {/* SCHEDULE */}
      <div
        className="mx-4 mt-3"
        style={{
          backgroundColor: "#FFFFFF",
          border: "0.5px solid #E2E6ED",
          borderRadius: 16,
          padding: 16,
          fontFamily: "Poppins, sans-serif",
        }}
      >
        {/* Header */}
        <div
          style={{
            fontSize: 10,
            textTransform: "uppercase",
            color: "#9CA3AF",
            letterSpacing: "0.08em",
            fontWeight: 700,
            marginBottom: 12,
          }}
        >
          SCHEDULE · {formatDayLabel(todayStart)}
        </div>

        {/* Tab switcher */}
        <div
          className="flex"
          style={{
            background: "#F2F4F8",
            borderRadius: 10,
            padding: 3,
            gap: 3,
          }}
        >
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

        {/* Content */}
        <div className="mt-3 flex flex-col" style={{ gap: 8 }}>
          {tabLessons.length === 0 ? (
            <div>
              <div
                style={{
                  fontSize: 10,
                  textTransform: "uppercase",
                  color: "#9CA3AF",
                  letterSpacing: "0.08em",
                  fontWeight: 700,
                  marginBottom: 8,
                }}
              >
                NO LESSONS
              </div>
              <div
                className="flex flex-col items-center justify-center"
                style={{
                  background: "#FFFFFF",
                  border: "1px solid #E8ECF2",
                  borderRadius: 12,
                  padding: 24,
                }}
              >
                <CalendarOff size={32} color="#C4CAD4" />
                <div
                  style={{
                    fontSize: 13,
                    color: "#9CA3AF",
                    marginTop: 8,
                    fontFamily: "Poppins, sans-serif",
                  }}
                >
                  Nothing scheduled for {tab === "today" ? "today" : tab === "tomorrow" ? "tomorrow" : "yet"}
                </div>
              </div>
              <div className="flex mt-3" style={{ gap: 8 }}>
                <button
                  type="button"
                  className="flex items-center justify-center"
                  style={{
                    flex: 1,
                    background: "#FFFFFF",
                    border: "1px solid #E2E6ED",
                    borderRadius: 10,
                    padding: "10px 16px",
                    fontSize: 13,
                    fontWeight: 600,
                    color: "#16A34A",
                    cursor: "pointer",
                    fontFamily: "Poppins, sans-serif",
                  }}
                  onClick={() => navigate({ to: "/lessons/new" })}
                >
                  + Add lesson
                </button>
                <button
                  type="button"
                  className="flex items-center justify-center"
                  style={{
                    flex: 1,
                    background: "#FFFFFF",
                    border: "1px solid #E2E6ED",
                    borderRadius: 10,
                    padding: "10px 16px",
                    fontSize: 13,
                    fontWeight: 600,
                    color: "#1A52A0",
                    cursor: "pointer",
                    fontFamily: "Poppins, sans-serif",
                  }}
                >
                  ⟳ Fill gaps
                </button>
              </div>
            </div>
          ) : tab === "next" ? (
            (() => {
              const grouped = nextTabLessons.reduce((acc, l) => {
                if (!acc[l.lesson_date]) acc[l.lesson_date] = [];
                acc[l.lesson_date].push(l);
                return acc;
              }, {} as Record<string, LessonRow[]>);
              return Object.entries(grouped).map(([date, items]) => (
                <div key={date}>
                  <div
                    style={{
                      fontSize: 11,
                      textTransform: "uppercase",
                      color: "#6B7280",
                      fontWeight: 600,
                      letterSpacing: "0.05em",
                      marginTop: 8,
                      marginBottom: 4,
                    }}
                  >
                    {formatDayLabel(new Date(`${date}T00:00:00`))}
                  </div>
                  {items.map((l) => renderLessonCard(l))}
                </div>
              ));
            })()
          ) : (
            tabLessons.map((l) => renderLessonCard(l))
          )}
        </div>

        {tabLessons.length > 0 && (
          <div className="flex mt-3" style={{ gap: 8 }}>
            <button
              type="button"
              className="flex items-center justify-center"
              style={{
                flex: 1,
                background: "#FFFFFF",
                border: "1px solid #E2E6ED",
                borderRadius: 10,
                padding: "10px 16px",
                fontSize: 13,
                fontWeight: 600,
                color: "#16A34A",
                cursor: "pointer",
                fontFamily: "Poppins, sans-serif",
              }}
              onClick={() => navigate({ to: "/lessons/new" })}
            >
              + Add lesson
            </button>
            <button
              type="button"
              className="flex items-center justify-center"
              style={{
                flex: 1,
                background: "#FFFFFF",
                border: "1px solid #E2E6ED",
                borderRadius: 10,
                padding: "10px 16px",
                fontSize: 13,
                fontWeight: 600,
                color: "#1A52A0",
                cursor: "pointer",
                fontFamily: "Poppins, sans-serif",
              }}
            >
              ⟳ Fill gaps
            </button>
          </div>
        )}
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
                bg={t.bg}
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

function HeroExpandedPanel({
  lesson,
  prev,
  goingActive,
  setGoingActive,
  onOpenLate,
  navigateTo,
}: {
  lesson: LessonRow;
  prev: PrevLessonRow | null;
  goingActive: boolean;
  setGoingActive: (v: boolean) => void;
  onOpenLate: () => void;
  navigateTo: (to: string) => void;
}) {
  const phone = lesson.pupils?.phone ?? null;
  const firstName = (lesson.pupils?.name ?? "there").split(/\s+/)[0];
  const balance = Number(lesson.pupils?.balance_owed ?? 0);
  const pickupPostcode = ""; // no pickup field on schema

  const sendSms = (body: string) => {
    if (!phone) { toast("No phone number"); return; }
    window.location.href = `sms:${phone}?&body=${encodeURIComponent(body)}`;
  };

  const statusBtn: React.CSSProperties = {
    flex: 1,
    height: 36,
    borderRadius: 10,
    border: '1px solid #e3e6ec',
    background: '#fff',
    fontFamily: 'Poppins, sans-serif',
    fontWeight: 600,
    fontSize: 12,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    cursor: 'pointer',
    color: '#1A1A2E',
  };
  const sectionLabel: React.CSSProperties = {
    fontSize: 10,
    textTransform: 'uppercase',
    color: '#999',
    letterSpacing: 0.6,
    fontWeight: 700,
    fontFamily: 'Poppins, sans-serif',
    marginBottom: 6,
  };

  return (
    <div style={{ background: '#F2F4F8', borderRadius: '0 0 16px 16px', padding: 12 }}>
      {/* Row 1 — status */}
      <div style={{ display: 'flex', gap: 6 }}>
        <button
          style={statusBtn}
          onClick={() => sendSms(`Hi ${firstName}, I'm outside whenever you're ready 👋`)}
        >
          <MapPin size={14} /> Here
        </button>
        <button
          style={{
            ...statusBtn,
            background: goingActive ? '#fff8e8' : '#fff',
            borderColor: goingActive ? '#f59e0b' : '#e3e6ec',
          }}
          onClick={() => { setGoingActive(true); sendSms(`Hi ${firstName}, on the way!`); }}
        >
          <Send size={14} /> Going
        </button>
        <button style={statusBtn} onClick={onOpenLate}>
          <Clock size={14} /> Late
        </button>
      </div>

      {/* Row 2 — primary CTA */}
      <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
        <button
          style={{ ...statusBtn, flex: 1 }}
          onClick={() => navigateTo(`/pupils/${lesson.pupil_id}`)}
        >
          <ClipboardList size={14} /> Prep
        </button>
        <button
          style={{
            flex: 1.6,
            height: 36,
            borderRadius: 10,
            border: 'none',
            background: '#1A52A0',
            color: '#fff',
            fontFamily: 'Poppins, sans-serif',
            fontWeight: 600,
            fontSize: 12,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 4,
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(26,82,160,0.35)',
          }}
          onClick={() => {
            sendSms(`Hi ${firstName}, I'm outside and ready when you are! 🚗`);
            toast("Marked as arrived");
          }}
        >
          <CheckCheck size={14} /> Arrived
        </button>
      </div>

      {/* Pickup */}
      <div style={{ marginTop: 12 }}>
        <div style={sectionLabel}>PICKUP</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'Poppins, sans-serif', fontSize: 13 }}>
          <MapPin size={14} color="#6B7280" />
          {pickupPostcode ? (
            <>
              <span style={{ color: '#1A1A2E', fontWeight: 600 }}>{pickupPostcode}</span>
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(pickupPostcode)}`}
                target="_blank"
                rel="noreferrer"
                style={{ color: '#1A52A0', fontWeight: 600, marginLeft: 'auto' }}
              >Navigate</a>
              <button
                onClick={() => { navigator.clipboard?.writeText(pickupPostcode); toast("Copied"); }}
                style={{ background: 'none', border: 'none', color: '#1A52A0', fontWeight: 600, fontFamily: 'Poppins, sans-serif', fontSize: 13, cursor: 'pointer' }}
              >Copy</button>
            </>
          ) : (
            <span style={{ color: '#6B7280' }}>No pickup set</span>
          )}
        </div>
      </div>

      {/* Account */}
      <div style={{ marginTop: 12 }}>
        <div style={sectionLabel}>ACCOUNT</div>
        {balance > 0 ? (
          <div style={{ background: '#fbe8e8', border: '1px solid #f5c5c5', borderRadius: 10, padding: 10, display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'Poppins, sans-serif' }}>
            <span style={{ flex: 1, fontSize: 13, fontWeight: 700, color: '#991B1B' }}>£{balance.toFixed(2)} outstanding</span>
            <button
              onClick={() => sendSms(`Hi ${firstName}, just a quick reminder that £${balance.toFixed(2)} is outstanding on your lesson account. Thanks!`)}
              style={{ height: 28, padding: '0 10px', borderRadius: 8, border: '1px solid #f5c5c5', background: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'Poppins, sans-serif' }}
            >Chase</button>
            <button
              onClick={() => navigateTo('/payments')}
              style={{ height: 28, padding: '0 10px', borderRadius: 8, border: 'none', background: '#991B1B', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'Poppins, sans-serif' }}
            >Mark paid</button>
          </div>
        ) : (
          <div style={{ color: '#16A34A', fontWeight: 700, fontFamily: 'Poppins, sans-serif', fontSize: 13 }}>Paid up ✓</div>
        )}
      </div>

      {/* Last lesson */}
      <div style={{ marginTop: 12 }}>
        <div style={sectionLabel}>LAST LESSON</div>
        {prev ? (
          <div style={{ fontFamily: 'Poppins, sans-serif', fontSize: 13, color: '#1A1A2E' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontWeight: 600 }}>{new Date(prev.lesson_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
              <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', padding: '2px 6px', borderRadius: 6, color: '#fff', background: statusColor(prev.status) }}>{prev.status}</span>
            </div>
            {prev.notes && (
              <div style={{ marginTop: 4, color: '#6B7280', fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                {prev.notes}
              </div>
            )}
          </div>
        ) : (
          <div style={{ color: '#6B7280', fontFamily: 'Poppins, sans-serif', fontSize: 13 }}>No previous lesson</div>
        )}
      </div>
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
      type="button"
      onClick={onClick}
      className="flex-1"
      style={{
        backgroundColor: active ? "#ffffff" : "transparent",
        color: active ? "#0F2044" : "#9CA3AF",
        borderRadius: 8,
        padding: "8px 6px",
        fontWeight: active ? 600 : 400,
        fontSize: 13,
        fontFamily: "Poppins, sans-serif",
        lineHeight: 1.2,
        border: "none",
        cursor: "pointer",
        boxShadow: active ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
        transition: "all 150ms ease",
      }}
    >
      {children}
    </button>
  );
}

function AccessTile({
  icon,
  bg,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  bg: string;
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
        borderRadius: 12,
        gap: 6,
        padding: 12,
        scrollSnapAlign: "start",
        flexShrink: 0,
      }}
    >
      <span
        className="flex items-center justify-center"
        style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: bg }}
      >
        {icon}
      </span>
      <span className="text-[10px] text-[#0F2044] text-center leading-tight" style={{ maxWidth: '100%', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{label}</span>
    </button>
  );
}

function TodayTile({
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
      style={{
        flex: 1,
        backgroundColor: '#FFFFFF',
        border: '1px solid #e0e3ea',
        borderRadius: 14,
        padding: '12px 8px',
        minHeight: 70,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'Poppins, sans-serif',
      }}
    >
      <div style={{ fontSize: valueSize, fontWeight: 700, color: valueColor, lineHeight: 1.1 }}>
        {value}
      </div>
      <div style={{ fontSize: 10, color: '#999', marginTop: 4, textAlign: 'center' }}>
        {label}
      </div>
    </div>
  );
}

function NeedsAttention({
  jobs,
  tests,
  calls,
  enqs,
  onNavigate,
}: {
  jobs: number;
  tests: number;
  calls: number;
  enqs: number;
  onNavigate: (to: string) => void;
}) {
  const urgentCount = jobs;
  const cells: Array<{
    key: string;
    label: string;
    count: number;
    bg: string;
    countColor: string;
    route: string;
    detail: string;
  }> = [
    { key: 'jobs', label: "Jobs", count: jobs, bg: '#fbe8e8', countColor: '#c9302c', route: '/enquiries', detail: 'Outstanding jobs to action.' },
    { key: 'tests', label: "Tests", count: tests, bg: '#e8eefb', countColor: '#2952b3', route: '/tests', detail: 'Upcoming driving tests.' },
    { key: 'calls', label: "Calls", count: calls, bg: 'transparent', countColor: '#6B7280', route: '/messages', detail: 'Calls to return.' },
    { key: 'enqs', label: "Enq's", count: enqs, bg: 'transparent', countColor: '#6B7280', route: '/enquiries', detail: 'New enquiries to respond to.' },
  ];
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <div
      style={{
        margin: '12px 16px 0',
        backgroundColor: '#FFFFFF',
        border: '1px solid #e0e3ea',
        borderRadius: 14,
        padding: 12,
        fontFamily: 'Poppins, sans-serif',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: '#999', textTransform: 'uppercase', letterSpacing: 0.8 }}>
          NEEDS ATTENTION
        </div>
        {urgentCount > 0 && (
          <span style={{ backgroundColor: '#c9302c', color: '#fff', fontSize: 9, fontWeight: 700, padding: '3px 8px', borderRadius: 999 }}>
            {urgentCount} urgent
          </span>
        )}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
        {cells.map((c) => {
          const isOpen = expanded === c.key;
          return (
            <button
              key={c.key}
              onClick={() => {
                setExpanded(isOpen ? null : c.key);
                onNavigate(c.route);
              }}
              style={{
                backgroundColor: c.bg,
                border: 'none',
                borderRadius: 10,
                padding: '8px 4px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                fontFamily: 'Poppins, sans-serif',
                position: 'relative',
              }}
            >
              <div style={{ fontSize: 20, fontWeight: 700, color: c.countColor, lineHeight: 1.1 }}>
                {c.count}
              </div>
              <div style={{ fontSize: 9, fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', marginTop: 2, letterSpacing: 0.4 }}>
                {c.label}
              </div>
              <span style={{ position: 'absolute', right: 4, top: 4, fontSize: 9, color: '#9CA3AF' }}>›</span>
            </button>
          );
        })}
      </div>
      {expanded && (
        <div style={{ marginTop: 10, padding: '8px 10px', backgroundColor: '#F8F9FB', borderRadius: 8, fontSize: 12, color: '#374151' }}>
          {cells.find((c) => c.key === expanded)?.detail}
        </div>
      )}
    </div>
  );
}
