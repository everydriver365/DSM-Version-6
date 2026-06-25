import { createFileRoute, useNavigate } from "@tanstack/react-router";
import type React from "react";
import { Fragment, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import InstructorTopBar from "@/components/dsm/InstructorTopBar";
import { EndLessonWizard } from "@/components/dsm/EndLessonWizard";
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
  CalendarCheck,
  Users,
  PoundSterling,
  Settings as SettingsIcon,
  RefreshCw,
  Plus,
  TrendingUp,
  Receipt,
  Clock,
  BarChart2,
  BarChart3,
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
  Map,
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
  Trophy,
  LogOut,
  LogIn,
  Globe,
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
  lesson_type?: string | null;
  payment_status?: string | null;
  eol_completed?: boolean | null;
  amount_due?: number | null;
  pickup_location?: string | null;
  pupils?: { name: string; phone?: string | null; balance_owed?: number | null; postcode?: string | null } | null;
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
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [lessons, setLessons] = useState<LessonRow[]>([]);
  const [nextLesson, setNextLesson] = useState<LessonRow | null>(null);
  const [outstanding, setOutstanding] = useState(0);
  const [weekEarnings, setWeekEarnings] = useState(0);
  const [weekLessonCount, setWeekLessonCount] = useState(0);
  const [todayEarnings, setTodayEarnings] = useState(0);
  const [earningsEstimated, setEarningsEstimated] = useState(false);
  
  const [tab, setTab] = useState<TabKey>("today");
  const [workingHours, setWorkingHours] = useState<any>(null);
  const [todayEndTime, setTodayEndTime] = useState<string | null>(null);
  const [notifCount, setNotifCount] = useState(0);
  const [enqCount, setEnqCount] = useState(0);
  const [eolLesson, setEolLesson] = useState<LessonRow | null>(null);

  useEffect(() => {
    async function loadCount() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { count } = await supabase
        .from("instructor_notifications")
        .select("id", { count: "exact", head: true })
        .eq("instructor_id", user.id)
        .eq("read", false);
      setNotifCount(count || 0);

      // Pending enquiries = enquiry rows linked to this instructor's notifications
      // whose status is still 'new' or 'accepted'. Declined enquiries are not pending.
      const { data: refRows } = await supabase
        .from("instructor_notifications")
        .select("reference_id")
        .eq("instructor_id", user.id)
        .eq("type", "enquiry");
      const refIds = (refRows ?? [])
        .map((r) => r.reference_id as string | null)
        .filter((x): x is string => !!x);
      if (refIds.length === 0) {
        setEnqCount(0);
      } else {
        const { count: eCount } = await supabase
          .from("enquiries")
          .select("id", { count: "exact", head: true })
          .in("id", refIds)
          .in("status", ["new", "accepted"]);
        setEnqCount(eCount || 0);
      }
    }
    loadCount();
  }, []);

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

  // ----- Car image position (drag-to-reposition, persisted in localStorage) -----
  type CarPos = { right: number; top: number; width: number; heightPct: number; objectPositionY: number };
  const CAR_POS_KEY = "home.nextLessonCar.pos.v1";
  const defaultCarPos: CarPos = { right: -30, top: 0, width: 60, heightPct: 100, objectPositionY: 25 };
  const [carPos, setCarPos] = useState<CarPos>(() => {
    if (typeof window === "undefined") return defaultCarPos;
    try {
      const raw = window.localStorage.getItem(CAR_POS_KEY);
      if (!raw) return defaultCarPos;
      return { ...defaultCarPos, ...JSON.parse(raw) };
    } catch { return defaultCarPos; }
  });
  const [carEditMode, setCarEditMode] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    try { window.localStorage.setItem(CAR_POS_KEY, JSON.stringify(carPos)); } catch {}
  }, [carPos]);


  // AT A GLANCE state
  const [glancePupilCount, setGlancePupilCount] = useState(0);
  const [glanceCompletedLessons, setGlanceCompletedLessons] = useState(0);
  const [glancePaymentsCount, setGlancePaymentsCount] = useState(0);
  const [glancePaymentsTotal, setGlancePaymentsTotal] = useState(0);
  const [glanceExpensesTotal, setGlanceExpensesTotal] = useState(0);
  const [glanceMtdEnrolled, setGlanceMtdEnrolled] = useState<boolean | null>(null);

  useEffect(() => {
    if (!userId) return;
    (async () => {
      const taxYearStart = new Date(
        new Date().getMonth() >= 3 ? new Date().getFullYear() : new Date().getFullYear() - 1,
        3,
        6,
      );
      const [pupilsRes, lessonsRes, paymentsRes, expensesRes, mtdRes] = await Promise.all([
        supabase
          .from("pupils")
          .select("id", { count: "exact", head: true })
          .eq("instructor_id", userId)
          .is("deleted_at", null),
        supabase
          .from("lessons")
          .select("id", { count: "exact", head: true })
          .eq("instructor_id", userId)
          .eq("status", "completed")
          .is("deleted_at", null),
        supabase
          .from("payments")
          .select("amount, paid_at")
          .eq("instructor_id", userId)
          .is("deleted_at", null)
          .gte("paid_at", taxYearStart.toISOString()),
        supabase
          .from("expenses")
          .select("amount, expense_date")
          .eq("instructor_id", userId)
          .is("deleted_at", null)
          .gte("expense_date", taxYearStart.toISOString().slice(0, 10)),
        supabase
          .from("instructor_mtd")
          .select("enrolled")
          .eq("instructor_id", userId)
          .maybeSingle(),
      ]);
      setGlancePupilCount(pupilsRes.count ?? 0);
      setGlanceCompletedLessons(lessonsRes.count ?? 0);
      const pays = paymentsRes.data ?? [];
      setGlancePaymentsCount(pays.length);
      setGlancePaymentsTotal(pays.reduce((s, p: any) => s + Number(p.amount ?? 0), 0));
      setGlanceExpensesTotal(
        (expensesRes.data ?? []).reduce((s, e: any) => s + Number(e.amount ?? 0), 0),
      );
      setGlanceMtdEnrolled(mtdRes.data ? Boolean((mtdRes.data as any).enrolled) : false);
    })();
  }, [userId]);

  const glancePoints = glancePupilCount * 10 + glanceCompletedLessons * 5 + glancePaymentsCount * 2;
  const glanceTier =
    glancePoints >= 1000 ? "Platinum" : glancePoints >= 500 ? "Gold" : glancePoints >= 200 ? "Silver" : "Bronze";
  const glanceTierColor =
    glanceTier === "Platinum"
      ? "#0EA5E9"
      : glanceTier === "Gold"
      ? "#D97706"
      : glanceTier === "Silver"
      ? "#6B7280"
      : "#B45309";
  const glanceNetProfit = Math.max(0, glancePaymentsTotal - glanceExpensesTotal);
  const glanceTaxBill = Math.max(0, (glanceNetProfit - 12570) * 0.2);
  const monthsElapsed = (() => {
    const now = new Date();
    const startMonth = now.getMonth() >= 3 ? 3 : -9; // April = 3
    const monthsSinceApril = (now.getFullYear() - (now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1)) * 12 + (now.getMonth() - 3) + (now.getMonth() < 3 ? 12 : 0);
    void startMonth;
    return Math.min(12, Math.max(0, monthsSinceApril + (now.getDate() / 30)));
  })();
  const taxYearLabel = (() => {
    const now = new Date();
    const startYear = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
    return `${String(startYear).slice(2)}/${String(startYear + 1).slice(2)}`;
  })();






  const [now, setNow] = useState<Date>(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(id);
  }, []);
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
        .select("name, profile_image_url")
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
      setAvatarUrl((instructor?.profile_image_url as string | undefined) ?? null);
    })();
  }, []);

  useEffect(() => {
    if (!userId) return;
    (async () => {
      const todayYmd = ymd(todayStart);
      const { data: lessonRows, error: lessonsErr } = await supabase
        .from("lessons")
        .select("id, lesson_date, lesson_time, duration_minutes, status, pupil_id, notes, payment_status, eol_completed, amount_due, pickup_location, pupils!inner(name,phone,balance_owed,postcode,prepaid_hours,deleted_at)")
        .eq("instructor_id", userId)
        .is("deleted_at", null)
        .is("pupils.deleted_at", null)
        .neq("status", "cancelled")
        .neq("status", "completed")
        .gte("lesson_date", todayYmd)
        .lte("lesson_date", ymd(addDays(todayStart, 14)))
        .order("lesson_date", { ascending: true })
        .order("lesson_time", { ascending: true });
      if (lessonsErr) console.error("[home] lessons fetch error", lessonsErr);
      if (lessonRows && lessonRows.length > 0) {
        console.log("[home] first lesson row sample:", lessonRows[0]);
      }
      setLessons((lessonRows ?? []) as unknown as LessonRow[]);


      const { data: nextRows, error: nextErr } = await supabase
        .from("lessons")
        .select("id, lesson_date, lesson_time, duration_minutes, status, pupil_id, notes, payment_status, eol_completed, amount_due, pickup_location, pupils!inner(name,phone,balance_owed,postcode,prepaid_hours,deleted_at)")
        .eq("instructor_id", userId)
        .is("deleted_at", null)
        .is("pupils.deleted_at", null)
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


      const { data: unpaidLessons } = await supabase
        .from("lessons")
        .select("pupil_id, amount_due")
        .eq("instructor_id", userId)
        .eq("payment_status", "unpaid")
        .gt("amount_due", 0)
        .is("deleted_at", null);

      const { data: pupilsData } = await supabase
        .from("pupils")
        .select("id, prepaid_hours")
        .eq("instructor_id", userId);

      const prepaidPupilIds = new Set(
        (pupilsData || [])
          .filter((p: any) => Number(p.prepaid_hours || 0) > 0)
          .map((p: any) => p.id)
      );

      const outstandingAmt = (unpaidLessons || [])
        .filter((l: any) => !prepaidPupilIds.has(l.pupil_id))
        .reduce((sum: number, l: any) => sum + Number(l.amount_due || 0), 0);

      const { data: niPupils } = await supabase
        .from("pupils")
        .select("id, prepaid_hours, ni_amount_total, ni_amount_paid")
        .eq("instructor_id", userId)
        .gt("prepaid_hours", 0)
        .not("ni_amount_total", "is", null);

      const niOutstanding = (niPupils || []).reduce((sum: number, p: any) => {
        const owed = Number(p.ni_amount_total || 0) - Number(p.ni_amount_paid || 0);
        return owed > 0 ? sum + owed : sum;
      }, 0);

      setOutstanding(outstandingAmt + niOutstanding);

      // Source 1: EOL payments recorded in lesson_history
      const { data: historyRows } = await supabase
        .from("lesson_history")
        .select("lesson_cost, payment_status, created_at")
        .eq("instructor_id", userId)
        .eq("payment_status", "paid")
        .gte("created_at", weekStart.toISOString());

      // Source 2: Course booking deposits from public site
      const { data: bookingRows } = await supabase
        .from("course_bookings")
        .select("amount_paid, booked_at")
        .eq("instructor_id", userId)
        .eq("status", "confirmed")
        .gte("booked_at", weekStart.toISOString());

      // Combine all sources
      let wk = 0;
      let td = 0;
      (historyRows ?? []).forEach((p) => {
        const amt = Number(p.lesson_cost ?? 0);
        wk += amt;
        if (new Date(p.created_at) >= todayStart) td += amt;
      });
      (bookingRows ?? []).forEach((p) => {
        const amt = Number(p.amount_paid ?? 0);
        wk += amt;
        if (new Date(p.booked_at) >= todayStart) td += amt;
      });

      // Fallback: estimate from lessons taught when no formal payments recorded
      if (wk === 0) {
        const { data: lessonRows } = await supabase
          .from("lessons")
          .select("amount_due, lesson_date")
          .eq("instructor_id", userId)
          .in("status", ["confirmed", "completed"])
          .is("deleted_at", null)
          .gte("lesson_date", ymd(weekStart));
        let lessonEarnings = 0;
        let lessonToday = 0;
        const todayYmd = ymd(todayStart);
        (lessonRows ?? []).forEach((l) => {
          const amt = Number(l.amount_due ?? 0);
          lessonEarnings += amt;
          if (l.lesson_date && l.lesson_date >= todayYmd) lessonToday += amt;
        });
        if (lessonEarnings > 0) {
          wk = lessonEarnings;
          td = lessonToday;
          setEarningsEstimated(true);
        } else {
          setEarningsEstimated(false);
        }
      } else {
        setEarningsEstimated(false);
      }

      setWeekEarnings(wk);
      setTodayEarnings(td);


      const { count: wkLessonCount } = await supabase
        .from("lessons")
        .select("id", { count: "exact", head: true })
        .eq("instructor_id", userId)
        .is("deleted_at", null)
        .neq("status", "cancelled")
        .gte("lesson_date", ymd(weekStart))
        .lt("lesson_date", ymd(weekEnd));
      setWeekLessonCount(wkLessonCount ?? 0);

      const { data: wh } = await supabase
        .from("working_hours")
        .select("mon, tue, wed, thu, fri, sat, sun, end_time")
        .eq("instructor_id", userId)
        .maybeSingle();
      if (wh) {
        const dayKeys = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;
        const key = dayKeys[todayStart.getDay()];
        const works = (wh as Record<string, unknown>)[key];
        setTodayEndTime(works && wh.end_time ? String(wh.end_time).slice(0, 5) : null);
        setWorkingHours(wh);
      } else {
        setTodayEndTime(null);
        setWorkingHours(null);
      }
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

  const allTodayLessons = lessons.filter((l) => {
    const d = lessonDateTime(l);
    return d >= todayStart && d < tomorrowStart;
  });
  const todayLessons = allTodayLessons.filter((l) => {
    const end = new Date(lessonDateTime(l).getTime() + (l.duration_minutes ?? 60) * 60000);
    if (end.getTime() > now.getTime()) return true;
    // keep past lessons that still need action (EOL pending or payment unpaid)
    const paymentStatus = (l.payment_status ?? "").toLowerCase();
    const needsEol = l.eol_completed !== true;
    const needsPayment = paymentStatus === "unpaid" || paymentStatus === "";
    return needsEol || needsPayment;
  });
  const tomorrowLessons = lessons.filter((l) => {
    const d = lessonDateTime(l);
    return d >= tomorrowStart && d < dayAfter;
  });
  const nextLessons = lessons.filter((l) => lessonDateTime(l) >= now);
  const nextTabLessons = nextLessons.slice(0, 5);

  const weekLessons = lessons.filter((l) => {
    const d = lessonDateTime(l);
    return d >= weekStart && d < weekEnd;
  });
  const weekLessonsTotal = Math.max(weekLessonCount, weekLessons.length);

  const tabLessons =
    tab === "today" ? todayLessons : tab === "tomorrow" ? tomorrowLessons : nextTabLessons;

  const nextFreeSlot = (() => {
    const fmt = (d: Date) => `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
    const isBeforeEnd = (d: Date, endTimeStr: string | null) => {
      if (!endTimeStr) return true;
      const [eh, em] = endTimeStr.split(":").map(Number);
      return d.getHours() * 60 + d.getMinutes() < eh * 60 + em;
    };
    const dayKeys = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;
    const tomorrowWorks = workingHours
      ? (workingHours as Record<string, unknown>)[dayKeys[tomorrowStart.getDay()]]
      : false;
    const tomorrowEndTime = tomorrowWorks && workingHours?.end_time
      ? String(workingHours.end_time).slice(0, 5)
      : null;

    // Today: free slot after last lesson
    if (todayLessons.length > 0) {
      const last = todayLessons[todayLessons.length - 1];
      const end = new Date(lessonDateTime(last).getTime() + (last.duration_minutes ?? 60) * 60000);
      if (end < tomorrowStart && isBeforeEnd(end, todayEndTime)) {
        return { time: fmt(end), dayLabel: formatDayLabel(todayStart) };
      }
    } else if (todayEndTime) {
      // No lessons today but working — whole day is free
      return { time: "FREE", dayLabel: formatDayLabel(todayStart) };
    }

    // No free slot today — check tomorrow
    if (tomorrowLessons.length > 0) {
      const last = tomorrowLessons[tomorrowLessons.length - 1];
      const end = new Date(lessonDateTime(last).getTime() + (last.duration_minutes ?? 60) * 60000);
      if (end < dayAfter && isBeforeEnd(end, tomorrowEndTime)) {
        return { time: fmt(end), dayLabel: formatDayLabel(tomorrowStart) };
      }
    } else if (tomorrowEndTime) {
      return { time: "FREE", dayLabel: formatDayLabel(tomorrowStart) };
    }

    return null;
  })();

  const earningsPct = Math.min(100, (weekEarnings / WEEKLY_EARNINGS_GOAL) * 100);
  const lessonsPct = Math.min(100, (weekLessonsTotal / WEEKLY_LESSON_GOAL) * 100);

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
    const postcode = l.pupils?.postcode ?? null;
    const notes = (l.notes ?? "").toLowerCase();
    const lessonType = (l.lesson_type ?? "").toLowerCase();
    let typeBadge: { label: string; bg: string; color: string } | null = null;
    if (notes.includes("mock")) typeBadge = { label: "Mock test", bg: "#FEF3C7", color: "#92400E" };
    else if (notes.includes("test") || lessonType.includes("test")) typeBadge = { label: "Test", bg: "#FEF3C7", color: "#92400E" };
    else if ((l.notes ?? "").includes("Course")) typeBadge = { label: "Course", bg: "#DBEAFE", color: "#1E40AF" };
    const todayYmdStr = ymd(todayStart);
    const showEol = l.lesson_date < todayYmdStr || status === "completed";
    return (
      <div
        key={l.id}
        role="button"
        tabIndex={0}
        onClick={() => navigate({ to: "/lessons/$id", params: { id: l.id } })}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            navigate({ to: "/lessons/$id", params: { id: l.id } });
          }
        }}
        className="bg-white flex items-center justify-between hover:bg-[#F8F9FB]"
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
          cursor: "pointer",
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
        <div className="flex items-center" style={{ gap: 12, minWidth: 0 }}>
          <span className="text-[14px] font-bold" style={{ color: accent }}>
            {formatTime(l)}
          </span>
          <div style={{ minWidth: 0 }}>
            <div className="flex items-center" style={{ gap: 6, flexWrap: "wrap" }}>
              <span className="text-[14px] font-semibold text-[#0F2044]">{pupilName(l)}</span>
              {typeBadge && (
                <span
                  className="text-[10px] font-semibold uppercase"
                  style={{
                    padding: "2px 6px",
                    borderRadius: 999,
                    backgroundColor: typeBadge.bg,
                    color: typeBadge.color,
                    letterSpacing: "0.04em",
                  }}
                >
                  {typeBadge.label}
                </span>
              )}
            </div>
            <div className="flex items-center" style={{ gap: 4, fontSize: 12, color: postcode ? "#6B7280" : "#9CA3AF" }}>
              <MapPin size={10} />
              <span>{postcode ?? "No pickup set"}</span>
            </div>
            <div style={{ fontSize: 13, color: "#6B7280" }}>
              {formatDuration(l.duration_minutes)}
            </div>
          </div>
        </div>
        <div className="flex items-center" style={{ gap: 6 }}>
          {showEol && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setEolLesson(l);
              }}
              style={{
                backgroundColor: "#EEF4FB",
                color: "#1A52A0",
                fontSize: 12,
                fontWeight: 700,
                textTransform: "uppercase",
                borderRadius: 6,
                padding: "2px 8px",
                cursor: "pointer",
              }}
            >
              EOL
            </button>
          )}
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
      </div>
    );
  };

  const renderTimelineLesson = (
    l: LessonRow,
    idx: number,
    arr: LessonRow[],
    currentId: string | null,
    nextId: string | null,
    showTimeline: boolean = true,
  ) => {
    const start = lessonDateTime(l);
    const end = new Date(start.getTime() + (l.duration_minutes ?? 60) * 60000);
    const isCurrent = l.id === currentId;
    const isNext = l.id === nextId;
    const isPast = !isCurrent && end.getTime() < now.getTime();
    const state: "past" | "current" | "next" | "future" =
      isCurrent ? "current" : isNext ? "next" : isPast ? "past" : "future";

    const lineColor = isPast ? "#9CA3AF" : "#E2E6ED";
    const isLast = idx === arr.length - 1;

    let dot: React.ReactNode;
    if (state === "past") {
      dot = <div style={{ width: 12, height: 12, borderRadius: 999, backgroundColor: "#9CA3AF" }} />;
    } else if (state === "current") {
      dot = (
        <div style={{ position: "relative", width: 14, height: 14 }}>
          <span
            className="animate-ping"
            style={{ position: "absolute", inset: 0, borderRadius: 999, backgroundColor: "#16A34A", opacity: 0.6 }}
          />
          <div style={{ position: "relative", width: 14, height: 14, borderRadius: 999, backgroundColor: "#16A34A" }} />
        </div>
      );
    } else if (state === "next") {
      dot = (
        <div
          style={{
            width: 12,
            height: 12,
            borderRadius: 999,
            backgroundColor: "#0F2044",
            border: "2px solid #FFFFFF",
            boxShadow: "0 0 0 1px #0F2044",
          }}
        />
      );
    } else {
      dot = (
        <div style={{ width: 12, height: 12, borderRadius: 999, backgroundColor: "#FFFFFF", border: "2px solid #E2E6ED" }} />
      );
    }

    const cardBase: React.CSSProperties = {
      minHeight: 56,
      padding: "8px 12px",
      borderRadius: 10,
      backgroundColor: "#FFFFFF",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 8,
    };
    let cardStyle: React.CSSProperties = { ...cardBase, border: "0.5px solid #E2E6ED" };
    if (state === "past") cardStyle = { ...cardBase, backgroundColor: "#F8F9FB", opacity: 0.6, border: "0.5px solid #E2E6ED" };
    else if (state === "current") cardStyle = { ...cardBase, borderLeft: "3px solid #16A34A", boxShadow: "0 0 0 1px #16A34A20" };
    else if (state === "next") cardStyle = { ...cardBase, borderLeft: "3px solid #0F2044", boxShadow: "0 2px 8px rgba(0,0,0,0.08)" };

    const timeColor = isPast ? "#9CA3AF" : "#0F2044";
    const nameColor = isPast ? "#9CA3AF" : "#0F2044";
    const endPassed = end.getTime() < now.getTime();
    const paymentStatus = (l.payment_status ?? "").toLowerCase();
    const eolDone = l.eol_completed === true;

    type Badge = { label: string; bg: string; color: string };
    const badges: Badge[] = [];
    if (endPassed && !eolDone) badges.push({ label: "EOL", bg: "#FEF3C7", color: "#92400E" });

    const fmtAmt = (n: number) => {
      const v = Math.abs(n);
      return Number.isInteger(v) ? `£${v}` : `£${v.toFixed(2)}`;
    };
    const amountDue = typeof l.amount_due === "number" ? l.amount_due : 0;
    const balance = typeof l.pupils?.balance_owed === "number" ? l.pupils!.balance_owed! : 0;
    if (paymentStatus === "paid" && amountDue > 0) {
      badges.push({ label: `${fmtAmt(amountDue)} ✓`, bg: "#E8F8ED", color: "#1A7A3C" });
    } else if (paymentStatus === "unpaid" && amountDue > 0) {
      badges.push({ label: fmtAmt(amountDue), bg: "#FFECEC", color: "#D33B3B" });
    } else if (balance < 0) {
      badges.push({ label: fmtAmt(balance), bg: "#FFECEC", color: "#D33B3B" });
    } else if (balance > 0) {
      badges.push({ label: `+${fmtAmt(balance)}`, bg: "#E8F8ED", color: "#1A7A3C" });
    }

    const rowInner = (
      <div style={cardStyle}>
        {!showTimeline && (
          <span
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: timeColor,
              fontFamily: "Poppins, sans-serif",
              flexShrink: 0,
              minWidth: 48,
            }}
          >
            {formatTime(l)}
          </span>
        )}
        <div style={{ minWidth: 0, fontSize: 13, fontWeight: 600, color: nameColor, fontFamily: "Poppins, sans-serif" }} className="truncate flex-1">
          {pupilName(l)}
        </div>
        <div className="flex items-center" style={{ gap: 4, flexShrink: 0 }}>
          {badges.map((b, i) =>
            b.label === "EOL" ? (
              <button
                key={i}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setEolLesson(l);
                }}
                style={{
                  fontSize: 10,
                  padding: "2px 6px",
                  borderRadius: 999,
                  backgroundColor: b.bg,
                  color: b.color,
                  fontWeight: 700,
                  fontFamily: "Poppins, sans-serif",
                  lineHeight: 1.4,
                  border: "none",
                  cursor: "pointer",
                }}
              >
                {b.label}
              </button>
            ) : (
              <span
                key={i}
                style={{
                  fontSize: 10,
                  padding: "2px 6px",
                  borderRadius: 999,
                  backgroundColor: b.bg,
                  color: b.color,
                  fontWeight: 700,
                  fontFamily: "Poppins, sans-serif",
                  lineHeight: 1.4,
                }}
              >
                {b.label}
              </span>
            ),
          )}
        </div>
      </div>
    );

    if (!showTimeline) {
      return (
        <div
          key={l.id}
          role="button"
          tabIndex={0}
          onClick={() => navigate({ to: "/lessons/$id", params: { id: l.id } })}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              navigate({ to: "/lessons/$id", params: { id: l.id } });
            }
          }}
          className="text-left w-full cursor-pointer"
          style={{ paddingBottom: 6 }}
        >
          {rowInner}
        </div>
      );
    }

    return (
      <div key={l.id} className="flex" style={{ position: "relative" }}>
        <div
          style={{
            width: 48,
            flexShrink: 0,
            position: "relative",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          {idx !== 0 && (
            <div style={{ position: "absolute", left: "50%", top: 0, transform: "translateX(-1px)", width: 2, height: 18, backgroundColor: lineColor }} />
          )}
          {!isLast && (
            <div style={{ position: "absolute", left: "50%", top: 18, bottom: 0, transform: "translateX(-1px)", width: 2, backgroundColor: lineColor }} />
          )}
          <div style={{ marginTop: 12, zIndex: 1 }}>{dot}</div>
          <div
            className="mt-1"
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: timeColor,
              textDecoration: isPast ? "line-through" : "none",
              zIndex: 1,
              fontFamily: "Poppins, sans-serif",
            }}
          >
            {formatTime(l)}
          </div>
        </div>

        <div
          role="button"
          tabIndex={0}
          onClick={() => navigate({ to: "/lessons/$id", params: { id: l.id } })}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              navigate({ to: "/lessons/$id", params: { id: l.id } });
            }
          }}
          className="flex-1 text-left cursor-pointer"
          style={{ paddingBottom: 8 }}
        >
          {rowInner}
        </div>
      </div>
    );
  };

  const quickAccessTiles = [
    { icon: <CalendarIcon size={20} color="#FFFFFF" />, bg: "#1A52A0", label: "Schedule", route: "/schedule" },
    { icon: <BarChart3 size={20} color="#FFFFFF" />, bg: "#1A52A0", label: "MTD", route: "/month-to-date" },
    { icon: <Map size={20} color="#FFFFFF" />, bg: "#16A34A", label: "Start tracking", route: "/live" },
    { icon: <CalendarCheck size={20} color="#FFFFFF" />, bg: "#7C3AED", label: "Month end", route: "/monthend" },
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
    { icon: <GraduationCap size={20} color="#FFFFFF" />, bg: "#F59E0B", label: "Test day", route: "/testday" },
    { icon: <Trophy size={20} color="#FFFFFF" />, bg: "#F59E0B", label: "Rewards", route: "/rewards" },
    { icon: <GraduationCap size={20} color="#FFFFFF" />, bg: "#DC2626", label: "Courses", route: "/courses" },
    { icon: <Star size={20} color="#FFFFFF" />, bg: "#D97706", label: "Reviews", route: "/reviews" },
    { icon: <Inbox size={20} color="#FFFFFF" />, bg: "#1A52A0", label: "Enquiries", route: "/enquiries" },
    { icon: <Clock size={20} color="#FFFFFF" />, bg: "#DC2626", label: "Waiting list", route: "/waitlist" },
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
    { icon: <Globe size={20} color="#FFFFFF" />, bg: "#1A52A0", label: "My website", route: "/minisite" },

  ] as const;

  return (
    <div className="min-h-screen pb-24 pb-safe" style={{ ...POPPINS, backgroundColor: '#F2F4F8', paddingTop: 'calc(60px + env(safe-area-inset-top, 0px))' }}>
      {/* TOP BAR */}
      <InstructorTopBar
        firstName={firstName}
        avatarUrl={avatarUrl}
        unreadCount={notifCount}
        onProfile={() => navigate({ to: "/profile" })}
        onPhone={() => navigate({ to: "/enquiries" })}
        onLiveTrack={() => navigate({ to: "/live" })}
        onBell={() => navigate({ to: "/notifications" })}
        onMenu={() => navigate({ to: "/settings" })}
        statusDot={
          <span
            className="rounded-full"
            style={{ width: 8, height: 8, backgroundColor: "#16A34A", marginLeft: 4 }}
          />
        }
      />

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
            <div style={{ overflowY: "auto", padding: "8px 0", flex: 1 }}>
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

            {/* Auth action at bottom */}
            <div style={{ borderTop: "0.5px solid #E2E6ED", padding: "12px 18px" }}>
              {userId ? (
                <button
                  onClick={async () => {
                    setMenuOpen(false);
                    await supabase.auth.signOut();
                    navigate({ to: "/login", replace: true });
                  }}
                  style={{
                    width: "100%", textAlign: "left", padding: "12px 0",
                    background: "none", border: "none", cursor: "pointer",
                    fontSize: 14, fontWeight: 600, color: "#CC2229",
                    fontFamily: "Poppins, sans-serif",
                    display: "flex", alignItems: "center", gap: 10,
                  }}
                >
                  <LogOut size={18} />
                  Sign out
                </button>
              ) : (
                <button
                  onClick={() => { setMenuOpen(false); navigate({ to: "/login" }); }}
                  style={{
                    width: "100%", textAlign: "left", padding: "12px 0",
                    background: "none", border: "none", cursor: "pointer",
                    fontSize: 14, fontWeight: 600, color: "#1A52A0",
                    fontFamily: "Poppins, sans-serif",
                    display: "flex", alignItems: "center", gap: 10,
                  }}
                >
                  <LogIn size={18} />
                  Log in
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* NAVY HEADER SECTION (hero + stats strip) */}
      <div style={{ backgroundColor: '#072b47', paddingTop: 12, paddingBottom: 24, borderRadius: '0 0 16px 16px', overflow: 'hidden' }}>
        {/* NEXT LESSON HERO */}
        <div style={{ backgroundColor: '#FFFFFF', borderRadius: heroExpanded ? '16px 16px 0 0' : 16, boxShadow: '0 2px 12px rgba(0,0,0,0.10)', overflow: heroExpanded ? 'visible' : 'hidden', margin: '-4px 16px 0', position: 'relative' }}>
          {/* Car edit toggle */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setCarEditMode((v) => {
                if (v) toast.success("Car position saved");
                return !v;
              });
            }}
            style={{
              position: 'absolute', top: 6, right: 6, zIndex: 10,
              fontSize: 10, fontWeight: 700, fontFamily: 'Poppins, sans-serif',
              padding: '4px 8px', borderRadius: 6, border: 'none',
              background: carEditMode ? '#1A52A0' : 'rgba(15,32,68,0.08)',
              color: carEditMode ? '#FFFFFF' : '#0F2044', cursor: 'pointer',
            }}
            title="Drag the car to reposition. Values are saved automatically."
          >
            {carEditMode ? '✓ Done' : '✎ Car'}
          </button>
          <div
            onClick={() => !carEditMode && upcoming && setHeroExpanded((v) => !v)}
            style={{ textAlign: 'left', padding: 16, cursor: upcoming && !carEditMode ? 'pointer' : 'default', position: 'relative', overflow: 'hidden' }}
          >
            {/* Car image - fills the tile and fades behind content/buttons via mask */}
            <img
              src={carAsset.url}
              alt=""
              aria-hidden
              draggable={false}
              onPointerDown={(e) => {
                if (!carEditMode) return;
                e.stopPropagation();
                e.preventDefault();
                const target = e.currentTarget;
                target.setPointerCapture(e.pointerId);
                const startX = e.clientX;
                const startY = e.clientY;
                const startRight = carPos.right;
                const startTop = carPos.top;
                const onMove = (ev: PointerEvent) => {
                  const dx = ev.clientX - startX;
                  const dy = ev.clientY - startY;
                  setCarPos((p) => ({ ...p, right: Math.round(startRight - dx), top: Math.round(startTop + dy) }));
                };
                const onUp = (ev: PointerEvent) => {
                  try { target.releasePointerCapture(ev.pointerId); } catch {}
                  window.removeEventListener("pointermove", onMove);
                  window.removeEventListener("pointerup", onUp);
                };
                window.addEventListener("pointermove", onMove);
                window.addEventListener("pointerup", onUp);
              }}
              style={{
                width: '62%',
                height: '88%',
                objectFit: 'cover',
                objectPosition: 'right',
                position: 'absolute',
                right: '-1px',
                top: '-44px',
                opacity: 1,
                zIndex: carEditMode ? 5 : 0,
                pointerEvents: carEditMode ? 'auto' : 'none',
                cursor: carEditMode ? 'move' : 'default',
                outline: carEditMode ? '2px dashed #1A52A0' : 'none',
                WebkitMaskImage: carEditMode ? 'none' : 'linear-gradient(to right, transparent 0%, rgba(0,0,0,0.85) 12%, #000 45%), linear-gradient(to bottom, #000 0%, #000 60%, rgba(0,0,0,0.45) 85%, transparent 100%)',
                WebkitMaskComposite: 'source-in',
                maskImage: carEditMode ? 'none' : 'linear-gradient(to right, transparent 0%, rgba(0,0,0,0.85) 12%, #000 45%), linear-gradient(to bottom, #000 0%, #000 60%, rgba(0,0,0,0.45) 85%, transparent 100%)',
                maskComposite: 'intersect',
              }}
            />

            {/* Label */}
            <div style={{ fontSize: 9, fontWeight: 700, color: '#9CA3AF', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 6, fontFamily: 'Poppins, sans-serif', position: 'relative', zIndex: 1 }}>
              Next lesson · {upcoming ? formatDayLabel(lessonDateTime(upcoming)) : '—'}
            </div>
            {/* Content */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative', zIndex: 1 }}>
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
            {/* Action buttons - raised above the car image */}
            {upcoming && (() => {
              const phone = upcoming?.pupils?.phone ?? "";
              const postcode = upcoming?.pupils?.postcode ?? "";
              const stop = (e: React.MouseEvent) => e.stopPropagation();
              const btnBase: React.CSSProperties = { flex: 1, height: 36, borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'Poppins, sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, textDecoration: 'none' };
              return (
                <div style={{ display: 'flex', gap: 8, marginTop: 12, position: 'relative', zIndex: 2 }}>
                  {phone ? (
                    <a href={`tel:${phone}`} target="_top" rel="noopener" onClick={stop} style={{ ...btnBase, background: '#CC2229', color: '#fff' }}>
                      <Phone size={16} color="#ffffff" /> Call
                    </a>
                  ) : (
                    <button onClick={(e) => { stop(e); toast("No phone number for this pupil"); }} style={{ ...btnBase, background: '#CC2229', color: '#fff', border: 'none', opacity: 0.6 }}>
                      <Phone size={16} color="#ffffff" /> Call
                    </button>
                  )}
                  {phone ? (
                    <a href={`sms:${phone}`} target="_top" rel="noopener" onClick={stop} style={{ ...btnBase, background: '#F3F4F6', color: '#1A1A2E' }}>
                      <MessageSquare size={16} color="#1A1A2E" /> Text
                    </a>
                  ) : (
                    <button onClick={(e) => { stop(e); toast("No phone number"); }} style={{ ...btnBase, background: '#F3F4F6', color: '#1A1A2E', border: 'none', opacity: 0.6 }}>
                      <MessageSquare size={16} color="#1A1A2E" /> Text
                    </button>
                  )}
                  {postcode ? (
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(postcode)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={stop}
                      style={{ ...btnBase, background: '#16A34A', color: '#fff' }}
                    >
                      <Navigation size={16} color="#ffffff" /> Go
                    </a>
                  ) : (
                    <button onClick={(e) => { stop(e); toast("No pickup postcode set"); }} style={{ ...btnBase, background: '#16A34A', color: '#fff', border: 'none', opacity: 0.6 }}>
                      <Navigation size={16} color="#ffffff" /> Go
                    </button>
                  )}
                </div>
              );
            })()}
          </div>
          {carEditMode && (
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                margin: '12px 16px 16px',
                background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: 8,
                padding: 10, boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                fontSize: 11, fontFamily: 'Poppins, sans-serif', color: '#0F2044',
                display: 'flex', flexDirection: 'column', gap: 6,
              }}
            >
              <div style={{ fontWeight: 700 }}>Drag image to move</div>
              <label style={{ display: 'flex', justifyContent: 'space-between', gap: 6, alignItems: 'center' }}>
                W {carPos.width}%
                <input type="range" min={20} max={120} value={carPos.width}
                  onChange={(e) => setCarPos((p) => ({ ...p, width: Number(e.target.value) }))}
                  style={{ flex: 1 }} />
              </label>
              <label style={{ display: 'flex', justifyContent: 'space-between', gap: 6, alignItems: 'center' }}>
                H {carPos.heightPct}%
                <input type="range" min={40} max={160} value={carPos.heightPct}
                  onChange={(e) => setCarPos((p) => ({ ...p, heightPct: Number(e.target.value) }))}
                  style={{ flex: 1 }} />
              </label>
              <label style={{ display: 'flex', justifyContent: 'space-between', gap: 6, alignItems: 'center' }}>
                Y-focus {carPos.objectPositionY}%
                <input type="range" min={0} max={100} value={carPos.objectPositionY}
                  onChange={(e) => setCarPos((p) => ({ ...p, objectPositionY: Number(e.target.value) }))}
                  style={{ flex: 1 }} />
              </label>
              <div style={{ fontSize: 10, color: '#6B7280' }}>
                right: {carPos.right}, top: {carPos.top}
              </div>
              <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                <button type="button" onClick={() => { setCarPos(defaultCarPos); toast("Car position reset"); }}
                  style={{ flex: 1, fontSize: 11, padding: '6px 6px', border: '1px solid #E5E7EB', background: '#FFF', borderRadius: 6, cursor: 'pointer' }}>
                  Reset
                </button>
                <button type="button" onClick={() => {
                  const txt = JSON.stringify(carPos);
                  try { navigator.clipboard?.writeText(txt); toast.success("Car position copied to clipboard"); } catch {}
                  console.log('[car position]', txt);
                }}
                  style={{ flex: 1, fontSize: 11, padding: '6px 6px', border: 'none', background: '#1A52A0', color: '#FFF', borderRadius: 6, cursor: 'pointer' }}>
                  Copy
                </button>
                <button type="button" onClick={() => {
                  const blob = new Blob([JSON.stringify(carPos, null, 2)], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = 'car-position.json';
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  URL.revokeObjectURL(url);
                  toast.success('Car position exported');
                }}
                  style={{ flex: 1, fontSize: 11, padding: '6px 6px', border: 'none', background: '#16A34A', color: '#FFF', borderRadius: 6, cursor: 'pointer' }}>
                  Export
                </button>
              </div>
              <button type="button" onClick={() => {
                if (typeof window !== 'undefined') {
                  try { window.localStorage.setItem(CAR_POS_KEY, JSON.stringify(carPos)); } catch {}
                }
                setCarEditMode(false);
                toast.success('Car position saved');
              }}
                style={{ width: '100%', marginTop: 6, fontSize: 12, fontWeight: 700, padding: '8px 8px', border: 'none', background: '#1A52A0', color: '#FFF', borderRadius: 6, cursor: 'pointer' }}>
                Save position
              </button>
            </div>
          )}
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
                {earningsEstimated && (
                  <span style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.65)', marginLeft: 4 }}>
                    (est.)
                  </span>
                )}
              </div>
              {weekEarnings === 0 ? (
                <button
                  type="button"
                  onClick={() => navigate({ to: '/schedule' })}
                  style={{ fontSize: 10, color: '#FFD27A', marginTop: 2, background: 'none', border: 'none', padding: 0, textDecoration: 'underline', cursor: 'pointer' }}
                >
                  Record payments via EOL →
                </button>
              ) : earningsEstimated ? (
                <button
                  type="button"
                  onClick={() => navigate({ to: '/schedule' })}
                  style={{ fontSize: 10, color: 'rgba(255,255,255,0.85)', marginTop: 2, background: 'none', border: 'none', padding: 0, textDecoration: 'underline', cursor: 'pointer', textAlign: 'left' }}
                >
                  Complete EOL
                </button>
              ) : (
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.75)', marginTop: 2 }}>
                  £{todayEarnings.toFixed(0)} today
                </div>
              )}
              <div style={{ height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.18)', marginTop: 6, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${earningsPct}%`, backgroundColor: '#CC2229' }} />
              </div>
            </div>
            <div style={{ flex: 1, padding: '10px 12px' }}>
              <div style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.85)', textTransform: 'uppercase', letterSpacing: 0.8 }}>
                LESSONS · WEEK
              </div>
              <div style={{ fontSize: 19, fontWeight: 800, color: '#8FF0C2', marginTop: 2, lineHeight: 1.1 }}>
                {weekLessonsTotal}
              </div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.75)', marginTop: 2 }}>
                {todayLessons.length} today
              </div>
              <div style={{ height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.18)', marginTop: 6, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${lessonsPct}%`, backgroundColor: '#8FF0C2' }} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* TODAY STRIP — 3 white tiles */}
      <div style={{ display: 'flex', gap: 8, padding: '12px 16px 0' }}>
        <TodayTile value={String(todayLessons.length)} label="Lessons today" valueColor="#1a1a1f" valueSize={22} />
        <TodayTile value={nextFreeSlot?.time ?? '—'} subValue={nextFreeSlot?.dayLabel} label="Next free slot" valueColor="#2952b3" valueSize={13} />
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
        enqs={enqCount}
        onNavigate={(to) => navigate({ to })}
      />


      {/* TODAY'S SCHEDULE (Google Calendar style) */}
      <div
        className="mx-4 mt-3"
        style={{
          backgroundColor: "#FFFFFF",
          border: "0.5px solid #E2E6ED",
          borderRadius: 16,
          padding: "12px 0",
          fontFamily: "Poppins, sans-serif",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between"
          style={{ padding: "0 16px 8px 16px" }}
        >
          <div style={{ fontSize: 14, fontWeight: 700, color: "#0F2044" }}>
            Schedule
          </div>
          <button
            type="button"
            onClick={() => navigate({ to: "/schedule" })}
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: "#1A52A0",
              background: "transparent",
              cursor: "pointer",
              fontFamily: "Poppins, sans-serif",
            }}
          >
            View all →
          </button>
        </div>

        {/* Tab switcher */}
        <div
          style={{
            display: "flex",
            gap: 4,
            margin: "0 16px 8px 16px",
            padding: 3,
            backgroundColor: "#F3F4F6",
            borderRadius: 10,
          }}
        >
          <TabBtn active={tab === "today"} onClick={() => setTab("today")}>
            Today
          </TabBtn>
          <TabBtn active={tab === "tomorrow"} onClick={() => setTab("tomorrow")}>
            Tomorrow
          </TabBtn>
          <TabBtn active={tab === "next"} onClick={() => setTab("next")}>
            Next
          </TabBtn>
        </div>


        {tabLessons.length === 0 ? (
          <div
            style={{
              padding: "20px 16px",
              fontSize: 13,
              color: "#9CA3AF",
              textAlign: "center",
              fontFamily: "Poppins, sans-serif",
            }}
          >
            {tab === "today"
              ? "No lessons today"
              : tab === "tomorrow"
                ? "No lessons tomorrow"
                : "No upcoming lessons"}
          </div>
        ) : (
          (() => {
            const shown = tabLessons.slice(0, 6);
            const hiddenCount = tabLessons.length - shown.length;

            const tNow = now.getTime();
            const lStart = (l: LessonRow) => lessonDateTime(l).getTime();
            const lEnd = (l: LessonRow) =>
              lStart(l) + (l.duration_minutes ?? 60) * 60000;
            let currentId: string | null = null;
            for (const l of shown) {
              if (lStart(l) <= tNow && tNow <= lEnd(l) && l.status !== "cancelled") {
                currentId = l.id;
                break;
              }
            }
            const fmtT = (d: Date) =>
              `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
            const durShort = (m: number | null) => {
              const x = m ?? 60;
              if (x % 60 === 0) return `${x / 60}h`;
              if (x < 60) return `${x}m`;
              return `${Math.floor(x / 60)}h ${x % 60}m`;
            };

            const rows: React.ReactNode[] = [];
            let lastDateKey: string | null = null;
            shown.forEach((l, i) => {
              const startD = lessonDateTime(l);
              const endD = new Date(lEnd(l));
              const pastEnd = endD.getTime() < tNow;
              const isCurrent = l.id === currentId;
              const isCancelled = l.status === "cancelled";
              const isCompleted = l.status === "completed" || l.eol_completed === true;

              if (tab === "next") {
                const dKey = ymd(startD);
                if (dKey !== lastDateKey) {
                  rows.push(
                    <div
                      key={`hdr-${dKey}`}
                      style={{
                        padding: "10px 16px 4px",
                        fontSize: 11,
                        fontWeight: 700,
                        letterSpacing: 0.4,
                        color: "#6B7280",
                        fontFamily: "Poppins, sans-serif",
                      }}
                    >
                      {formatDayLabel(startD)}
                    </div>,
                  );
                  lastDateKey = dKey;
                }
              }

              let accent = "#1A52A0";
              if (isCancelled) accent = "#9CA3AF";
              else if (isCurrent) accent = "#CC2229";
              else if (isCompleted) accent = "#16A34A";

              const nameColor = isCancelled ? "#9CA3AF" : "#0F2044";
              const timeColor = isCancelled ? "#9CA3AF" : "#0F2044";

              const badges: React.ReactNode[] = [];
              if (isCurrent) {
                badges.push(
                  <span
                    key="live"
                    className="animate-pulse"
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      padding: "1px 6px",
                      borderRadius: 999,
                      backgroundColor: "#FEE2E2",
                      color: "#CC2229",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    <span
                      style={{
                        width: 5,
                        height: 5,
                        borderRadius: 999,
                        backgroundColor: "#CC2229",
                      }}
                    />
                    Live
                  </span>,
                );
              }
              if (!isCancelled) {
                if (pastEnd && !l.eol_completed) {
                  badges.push(
                    <button
                      key="eol"
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEolLesson(l);
                      }}
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        padding: "2px 8px",
                        borderRadius: 999,
                        backgroundColor: "#FEF3C7",
                        color: "#92400E",
                        border: 0,
                        cursor: "pointer",
                        fontFamily: "Poppins, sans-serif",
                      }}
                    >
                      Complete EOL
                    </button>,
                  );
                } else if (pastEnd && l.eol_completed) {
                  badges.push(
                    <span
                      key="eol-done"
                      style={{
                        fontSize: 10,
                        fontWeight: 600,
                        color: "#15803D",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 3,
                      }}
                    >
                      ✓ EOL
                    </span>,
                  );
                }
              }
              const isPrepaidPupil = Number((l.pupils as any)?.prepaid_hours ?? 0) > 0;
              if (!isPrepaidPupil) {
                if (l.payment_status === "paid") {
                  badges.push(
                    <span
                      key="paid"
                      style={{
                        fontSize: 10,
                        fontWeight: 600,
                        color: "#15803D",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 3,
                      }}
                    >
                      ✓ Paid
                    </span>,
                  );
                } else if (
                  !isCancelled &&
                  pastEnd &&
                  (l.payment_status === "unpaid" || !l.payment_status) &&
                  Number(l.amount_due ?? 0) > 0
                ) {
                  const amt = Number(l.amount_due ?? 0);
                  badges.push(
                    <span
                      key="due"
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        padding: "1px 6px",
                        borderRadius: 999,
                        backgroundColor: "#FEE2E2",
                        color: "#CC2229",
                      }}
                    >
                      £{amt.toFixed(2)} unpaid
                    </span>,
                  );
                }
              } else {
                badges.push(
                  <span
                    key="prepaid"
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      padding: "1px 6px",
                      borderRadius: 999,
                      backgroundColor: "#EEF4FB",
                      color: "#1A52A0",
                    }}
                  >
                    Prepaid
                  </span>,
                );
              }



              rows.push(
                <div
                  key={l.id}
                  role="button"
                  tabIndex={0}
                  onClick={() =>
                    navigate({
                      to: "/lessons/$id" as never,
                      params: { id: l.id } as never,
                    })
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter")
                      navigate({
                        to: "/lessons/$id" as never,
                        params: { id: l.id } as never,
                      });
                  }}
                  style={{
                    display: "flex",
                    gap: 10,
                    padding: "10px 16px",
                    alignItems: "stretch",
                    cursor: "pointer",
                  }}
                >
                  {(() => {
                    const needsAttention =
                      !isCancelled &&
                      ((pastEnd && !l.eol_completed) ||
                        (l.payment_status === "unpaid" || !l.payment_status));


                    return (
                      <div
                        style={{
                          width: 40,
                          flexShrink: 0,
                          textAlign: "right",
                          position: "relative",
                        }}
                      >
                        {needsAttention && (
                          <span
                            aria-label="Needs attention"
                            style={{
                              position: "absolute",
                              top: -2,
                              left: -2,
                              width: 8,
                              height: 8,
                              borderRadius: 999,
                              backgroundColor: "#F59E0B",
                            }}
                          />
                        )}
                    <div
                      style={{
                        fontSize: 12,
                        fontWeight: 700,
                        color: timeColor,
                        textDecoration: isCancelled ? "line-through" : "none",
                      }}
                    >
                      {fmtT(startD)}
                    </div>
                    <div style={{ fontSize: 10, color: "#9CA3AF", marginTop: 2 }}>
                      {durShort(l.duration_minutes)}
                    </div>
                  </div>
                    );
                  })()}
                  <div
                    style={{
                      width: 3,
                      borderRadius: 2,
                      backgroundColor: accent,
                      flexShrink: 0,
                      alignSelf: "stretch",
                    }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      className="truncate"
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: nameColor,
                        textDecoration: isCancelled ? "line-through" : "none",
                      }}
                    >
                      {l.pupils?.name ?? "Pupil"}
                    </div>
                    {l.pickup_location && (
                      <div
                        className="truncate"
                        style={{
                          fontSize: 11,
                          color: "#6B7280",
                          marginTop: 2,
                          display: "flex",
                          alignItems: "center",
                          gap: 3,
                        }}
                      >
                        <MapPin size={10} color="#6B7280" />
                        <span className="truncate">{l.pickup_location}</span>
                      </div>
                    )}
                    {badges.length > 0 && (
                      <div
                        style={{
                          display: "flex",
                          gap: 6,
                          marginTop: 4,
                          flexWrap: "wrap",
                        }}
                      >
                        {badges}
                      </div>
                    )}
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      flexShrink: 0,
                    }}
                  >
                    <ChevronRight size={14} color="#D1D5DB" />
                  </div>
                </div>,
              );

              const next = shown[i + 1];
              if (next && (tab !== "next" || ymd(lessonDateTime(next)) === ymd(startD))) {
                const gapMins = Math.round(
                  (lStart(next) - lEnd(l)) / 60000,
                );
                if (gapMins > 30) {
                  rows.push(
                    <div
                      key={`gap-${l.id}`}
                      style={{
                        margin: "2px 16px 6px 16px",
                        padding: "4px 10px",
                        fontSize: 11,
                        color: "#6B7280",
                        backgroundColor: "#F8F9FB",
                        borderRadius: 6,
                      }}
                    >
                      {gapMins} mins free
                    </div>,
                  );
                } else {
                  rows.push(
                    <div
                      key={`hr-${l.id}`}
                      style={{
                        borderTop: "0.5px solid #F3F4F6",
                        margin: "0 16px",
                      }}
                    />,
                  );
                }
              }
            });

            if (hiddenCount > 0) {
              rows.push(
                <button
                  key="view-all"
                  type="button"
                  onClick={() => navigate({ to: "/schedule" })}
                  style={{
                    margin: "8px 16px 0 16px",
                    padding: "6px 0",
                    fontSize: 12,
                    fontWeight: 600,
                    color: "#1A52A0",
                    background: "transparent",
                    cursor: "pointer",
                    textAlign: "left",
                    fontFamily: "Poppins, sans-serif",
                  }}
                >
                  View all {tabLessons.length} lessons →
                </button>,
              );
            }

            return <>{rows}</>;
          })()
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
              <div className="flex items-center gap-2">
                <span
                  className="text-[11px] uppercase"
                  style={{ color: "#6B7280", letterSpacing: 0.8, fontFamily: "Poppins, sans-serif", fontWeight: 600 }}
                >
                  QUICK ACCESS
                </span>
                <button
                  type="button"
                  aria-label="Search quick access"
                  onClick={() => setSearchOpen(true)}
                  className="flex items-center justify-center"
                  style={{ width: 24, height: 24 }}
                >
                  <Search size={14} color="#6B7280" />
                </button>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => navigate({ to: "/quickaccess" as never })}
                  className="text-[13px]"
                  style={{ color: "#1A52A0", fontFamily: "Poppins, sans-serif" }}
                >
                  See all
                </button>
                <button
                  type="button"
                  onClick={() => alert("Coming soon")}
                  className="text-[13px]"
                  style={{ color: "#1A52A0", fontFamily: "Poppins, sans-serif" }}
                >
                  Edit pins
                </button>
              </div>
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

      {/* AT A GLANCE */}
      <div className="mx-4 mt-4">
        <SectionHeader>AT A GLANCE</SectionHeader>
        <div className="flex flex-col gap-2 mt-2">
          {/* Rewards card */}
          <button
            type="button"
            onClick={() => navigate({ to: "/rewards" })}
            className="flex items-center text-left"
            style={{
              backgroundColor: "#FFFFFF",
              borderWidth: "0.5px",
              borderStyle: "solid",
              borderColor: "#E2E6ED",
              borderRadius: 12,
              padding: 12,
              gap: 12,
              fontFamily: "Poppins, sans-serif",
            }}
          >
            <div
              className="flex items-center justify-center shrink-0"
              style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: "#FEF3C7" }}
            >
              <Trophy size={18} color="#D97706" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-semibold" style={{ color: "#0F2044" }}>
                DSM Rewards
              </div>
              <div className="text-[13px]" style={{ color: "#6B7280" }}>
                {glancePoints} pts
              </div>
            </div>
            <span
              className="text-[11px] font-semibold px-2 py-1 rounded-full"
              style={{ backgroundColor: glanceTierColor, color: "#FFFFFF" }}
            >
              {glanceTier}
            </span>
            <ChevronRight size={18} color="#9CA3AF" />
          </button>

          {/* Tax estimate card */}
          <button
            type="button"
            onClick={() => navigate({ to: "/tax" })}
            className="text-left w-full"
            style={{
              backgroundColor: "#FFFFFF",
              borderWidth: "0.5px",
              borderStyle: "solid",
              borderColor: "#E2E6ED",
              borderRadius: 12,
              padding: 12,
              fontFamily: "Poppins, sans-serif",
            }}
          >
            <div className="flex items-center gap-3">
              <div
                className="flex items-center justify-center shrink-0"
                style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: "#DBEAFE" }}
              >
                <Calculator size={18} color="#1A52A0" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span
                    className="text-[10px] uppercase font-semibold"
                    style={{ color: "#9CA3AF", letterSpacing: 0.6 }}
                  >
                    TAX ESTIMATE
                  </span>
                  <span className="text-[10px]" style={{ color: "#9CA3AF" }}>
                    {taxYearLabel}
                  </span>
                </div>
                <div className="text-[20px] font-bold mt-0.5" style={{ color: "#0F2044" }}>
                  £{glanceTaxBill.toLocaleString("en-GB", { maximumFractionDigits: 0 })}
                </div>
              </div>
              <ChevronRight size={18} color="#9CA3AF" />
            </div>
            <div className="text-[12px] mt-1" style={{ color: "#6B7280" }}>
              Projected full-year estimate
            </div>
            <div
              className="mt-2 w-full"
              style={{ height: 4, borderRadius: 2, backgroundColor: "#E2E6ED", overflow: "hidden" }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${(monthsElapsed / 12) * 100}%`,
                  backgroundColor: "#1A52A0",
                  borderRadius: 2,
                }}
              />
            </div>
          </button>

          {/* MTD card */}
          <button
            type="button"
            onClick={() => navigate({ to: "/mtd" })}
            className="flex items-center text-left"
            style={{
              backgroundColor: "#FFFFFF",
              borderWidth: "0.5px",
              borderStyle: "solid",
              borderColor: "#E2E6ED",
              borderRadius: 12,
              padding: 12,
              gap: 12,
              fontFamily: "Poppins, sans-serif",
            }}
          >
            <div
              className="flex items-center justify-center shrink-0"
              style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: "#ECFDF5" }}
            >
              <FileSpreadsheet size={18} color="#16A34A" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-semibold" style={{ color: "#0F2044" }}>
                Making Tax Digital
              </div>
            </div>
            <span
              className="text-[11px] font-semibold px-2 py-1 rounded-full"
              style={{
                backgroundColor: glanceMtdEnrolled ? "#ECFDF5" : "#FEF3C7",
                color: glanceMtdEnrolled ? "#16A34A" : "#B45309",
              }}
            >
              {glanceMtdEnrolled ? "Enrolled" : "Not enrolled"}
            </span>
            <ChevronRight size={18} color="#9CA3AF" />
          </button>
        </div>
      </div>

      {eolLesson && (
        <EndLessonWizard
          open={!!eolLesson}
          onClose={() => setEolLesson(null)}
          lessonId={eolLesson.id}
          pupilId={eolLesson.pupil_id ?? ""}
          pupilName={eolLesson.pupils?.name ?? "Pupil"}
          instructorId={userId ?? ""}
          durationMinutes={eolLesson.duration_minutes ?? 60}
          lessonDate={eolLesson.lesson_date}
          startTime={eolLesson.lesson_time}
          onCompleted={() => {
            const id = eolLesson.id;
            setLessons((cur) =>
              cur.map((x) =>
                x.id === id
                  ? { ...x, status: "completed", eol_completed: true }
                  : x,
              ),
            );
            toast.success(`EOL completed for ${eolLesson.pupils?.name ?? "pupil"}`);
          }}
        />
      )}
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
  subValue,
}: {
  value: string;
  label: string;
  valueColor: string;
  valueSize: number;
  subValue?: string;
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
      {subValue && (
        <div style={{ fontSize: 10, color: '#6B7280', marginTop: 2, lineHeight: 1.1 }}>
          {subValue}
        </div>
      )}
      <div style={{ fontSize: 10, color: '#999', marginTop: subValue ? 2 : 4, textAlign: 'center' }}>
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
    { key: 'enqs', label: "Enq's", count: enqs, bg: enqs > 0 ? '#16A34A' : 'transparent', countColor: enqs > 0 ? '#FFFFFF' : '#6B7280', route: '/enquiries', detail: 'New enquiries to respond to.' },
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
