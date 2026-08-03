import { createFileRoute, useNavigate } from "@tanstack/react-router";
import React from "react";
import { Fragment, useCallback, useEffect, useMemo, useRef, useState, isValidElement, cloneElement } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { recordPayment, recordRefund } from "@/lib/payments";
import InstructorTopBar from "@/components/dsm/InstructorTopBar";
import { QuickActionsMenu, type QuickAction } from "@/components/dsm/QuickActionsMenu";
import { EndLessonWizard } from "@/components/dsm/EndLessonWizard";
import { formatSessionDate, formatSessionTime, type LiveSession } from "./dsm-live";
import { getLessonWeather, type LessonWeather } from "@/lib/lesson-weather.functions";
import { getLessonDriveTime, type LessonDriveTime } from "@/lib/lesson-drive-time.functions";
import { verifyAddress } from "@/lib/geocode.functions";
import { useMinGapMinutes } from "@/lib/gapPrefs";
import { computeDayGaps } from "@/lib/gapDetection";
import { DiscoverSection as DiscoverGrid } from "@/components/home/DiscoverSection";
import { PageLayout } from "@/components/PageLayout";
import { SheetQueueController } from "@/components/dsm/SheetQueue";
import { LessonActionsSheet } from "@/components/lessons/LessonActionsSheet";


import {
  Phone,
  Building2 as Building,
  Info,
  Car,
  Bell,
  Menu,
  MessageSquare,
  CreditCard,
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
  Tag,
  Zap,
  CalendarDays,
  Calendar,
  Settings,
  Crown,
  X,
  UserCircle,
  PlayCircle,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Send,
  CheckCheck,
  FileSpreadsheet,
  AlertCircle,
  Trophy,
  LogOut,
  LogIn,
  Globe,
  Mail,
  User,
  Trash2,
  ArrowLeftRight,
  Moon,
  Megaphone,
  Activity,
  CheckCircle2,
  Sparkles,

  Laptop,
  Package,
  XCircle,
  AlertTriangle,
  FileCheck,
  Grid,
  ArrowRight,
  Smartphone,
  Headphones,
  Infinity,
  MoreHorizontal,
  Move,
  Camera,
  Video,
  Radio,
  Shield,
  ShieldAlert,
  Mic,
  Pencil,
} from "lucide-react";
import {
  IconCurrencyPound,
  IconCalendarStats,
  IconClockHour4,
  IconAlertTriangle,
  IconBolt,
  IconChevronRight,
  IconSparkles,
  IconPhone,
  IconMessage,
  IconPlayerPlay,
  IconCalendarEvent,
  IconUsers,
  IconWallet,
  IconMessageCircle,
  IconLayoutGrid,
  IconX,
  IconCalendar,
  IconMapPin,
  IconClock,
  IconDots,
  IconDotsVertical,
  IconSearch,
  IconCreditCard,

  IconUserPlus,
  IconCalendarPlus,
  IconReceipt,
  IconSpeakerphone,
  IconChartBar,
  IconSteeringWheel,
  IconMicrophone,
  IconBriefcase,
  IconCircleCheck,
  IconArrowRight,
  IconGift,
  IconNavigation,
  IconClipboardList,
  IconClockExclamation,
  IconCurrentLocation,
  IconPencil,
} from "@tabler/icons-react";



import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import { SectionHeader } from "../components/dsm/SectionHeader";
import { supabase } from "../lib/supabaseClient";
import { PushPermissionCard } from "../components/dsm/PushPermissionCard";
import {
  getPermission,
  requestPermission,
  scheduleLessonReminder,
  isSupported as notificationsSupported,
} from "../lib/pushNotifications";
import { PAGE_BACKGROUND } from "@/components/PageLayout";
import { PupilAvatar, pupilColour } from "@/components/PupilAvatar";
import { CancelLessonSheet } from "@/components/lessons/CancelLessonSheet";
import { DeleteLessonSheet } from "@/components/lessons/DeleteLessonSheet";
import { PaymentDetailsSheet } from "@/components/payments/PaymentDetailsSheet";
import { AddLessonSheet } from "@/components/lessons/AddLessonSheet";
import { UnifiedPaymentSheet } from "@/components/payments/UnifiedPaymentSheet";
import AddExpenseSheet from "@/components/expenses/AddExpenseSheet";
import { LogMileageSheet } from "@/components/mileage/LogMileageSheet";
import { SendMessageSheet } from "@/components/messages/SendMessageSheet";
import { filterEchoedBlocks } from "@/lib/calendarDedupe";

import { ConfirmDialog } from "@/components/ConfirmDialog";

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

async function handleSyncGoogleClick() {
  const [{ data: userRes }, { data: sess }] = await Promise.all([
    supabase.auth.getUser(),
    supabase.auth.getSession(),
  ]);
  const uid = userRes.user?.id;
  if (!uid) return;
  await syncToGoogleCalendar(uid, sess.session?.access_token ?? "");
}


// -------------------- Next Lesson Google Map --------------------
const GMAPS_SCRIPT_ID = "google-maps-js-script";
const GMAPS_BROWSER_KEY = import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY as string | undefined;

type GMapsWindow = Window & { google?: any };

function loadGoogleMapsJs(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  const w = window as GMapsWindow;
  if (w.google?.maps?.geometry) return Promise.resolve();
  const existing = document.getElementById(GMAPS_SCRIPT_ID) as HTMLScriptElement | null;
  if (existing) {
    return new Promise((resolve) => {
      const iv = setInterval(() => {
        if ((window as GMapsWindow).google?.maps?.geometry) {
          clearInterval(iv);
          resolve();
        }
      }, 150);
    });
  }
  return new Promise((resolve, reject) => {
    if (!GMAPS_BROWSER_KEY) { reject(new Error("Missing Google Maps browser key")); return; }
    const s = document.createElement("script");
    s.id = GMAPS_SCRIPT_ID;
    s.async = true;
    s.defer = true;
    s.src = `https://maps.googleapis.com/maps/api/js?key=${GMAPS_BROWSER_KEY}&libraries=geometry&loading=async`;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Failed to load Google Maps JS"));
    document.head.appendChild(s);
  });
}

function NextLessonMap({
  originLat,
  originLng,
  destLat,
  destLng,
  destAddress,
  encodedPolyline,
  directionsUrl,
  height = 160,
  isLate = false,
}: {
  originLat: number | null;
  originLng: number | null;
  destLat: number | null;
  destLng: number | null;
  destAddress?: string | null;
  encodedPolyline: string | null;
  directionsUrl: string;
  height?: number;
  isLate?: boolean;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadGoogleMapsJs()
      .then(() => { if (!cancelled) setReady(true); })
      .catch((e) => { if (!cancelled) setError(e?.message ?? "Map failed to load"); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!ready || !ref.current) return;
    const g = (window as GMapsWindow).google;
    if (!g?.maps) return;

    let cancelled = false;

    const draw = (dLat: number | null, dLng: number | null) => {
      if (cancelled || !ref.current) return;
      const hasOrigin = originLat != null && originLng != null;
      const center = hasOrigin
        ? { lat: originLat as number, lng: originLng as number }
        : dLat != null && dLng != null
          ? { lat: dLat, lng: dLng }
          : null;
      if (!center) return;

      const map = new g.maps.Map(ref.current, {
        center,
        zoom: 12,
        disableDefaultUI: true,
        gestureHandling: "none",
        keyboardShortcuts: false,
        clickableIcons: false,
        styles: [
          { featureType: "poi", stylers: [{ visibility: "off" }] },
          { featureType: "transit", stylers: [{ visibility: "off" }] },
        ],
      });

      const dot = (fillColor: string) => ({
        path: g.maps.SymbolPath.CIRCLE,
        scale: 7,
        fillColor,
        fillOpacity: 1,
        strokeColor: "#FFFFFF",
        strokeWeight: 2,
      });

      if (hasOrigin) {
        new g.maps.Marker({
          position: { lat: originLat as number, lng: originLng as number },
          map,
          icon: dot("#22C55E"),
        });
      }

      if (dLat != null && dLng != null) {
        new g.maps.Marker({ position: { lat: dLat, lng: dLng }, map, icon: dot("#CC2229") });
      }

      if (encodedPolyline && g.maps.geometry?.encoding) {
        const path = g.maps.geometry.encoding.decodePath(encodedPolyline);
        new g.maps.Polyline({
          path,
          map,
          strokeColor: "#1877D6",
          strokeOpacity: 0.95,
          strokeWeight: 4,
        });
        const bounds = new g.maps.LatLngBounds();
        path.forEach((p: any) => bounds.extend(p));
        map.fitBounds(bounds, { top: 30, right: 30, bottom: 30, left: 30 });
      } else if (hasOrigin && dLat != null && dLng != null) {
        // No route geometry (drive-time unavailable) — show a straight connector.
        new g.maps.Polyline({
          path: [
            { lat: originLat as number, lng: originLng as number },
            { lat: dLat, lng: dLng },
          ],
          map,
          strokeColor: "#1877D6",
          strokeOpacity: 0.7,
          strokeWeight: 3,
        });
        const bounds = new g.maps.LatLngBounds();
        bounds.extend({ lat: originLat as number, lng: originLng as number });
        bounds.extend({ lat: dLat, lng: dLng });
        map.fitBounds(bounds, { top: 30, right: 30, bottom: 30, left: 30 });
      } else if (dLat != null && dLng != null) {
        map.setZoom(14);
      }
    };

    if ((destLat == null || destLng == null) && destAddress && g.maps.Geocoder) {
      const geocoder = new g.maps.Geocoder();
      geocoder.geocode({ address: `${destAddress}, UK` }, (results: any, status: string) => {
        if (cancelled) return;
        const loc = status === "OK" ? results?.[0]?.geometry?.location : null;
        draw(loc ? loc.lat() : null, loc ? loc.lng() : null);
      });
    } else {
      draw(destLat, destLng);
    }

    return () => { cancelled = true; };
  }, [ready, originLat, originLng, destLat, destLng, destAddress, encodedPolyline]);

  return (
    <div
      onClick={() => window.open(directionsUrl, '_blank')}
      style={{
        position: 'relative',
        height,
        background: '#E8EEF3',
        overflow: 'hidden',
        cursor: 'pointer',
        boxShadow: isLate ? 'inset 0 0 0 3px #C23B3B' : undefined,
      }}
    >
      <div ref={ref} style={{ position: 'absolute', inset: 0 }} />
      {!ready && !error && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: '#6B7280' }}>
          Loading map…
        </div>
      )}
      {error && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: '#6B7280' }}>
          Map unavailable
        </div>
      )}
    </div>
  );
}


export const Route = createFileRoute("/home")({
  head: () => ({
    meta: [
      { title: "Home — DSM by EveryDriver" },
      { name: "description", content: "Your daily overview of lessons, pupils and earnings." },
    ],
  }),
  validateSearch: (search: Record<string, unknown>): { ws?: number } => {
    const raw = search.ws;
    const n = typeof raw === "number" ? raw : typeof raw === "string" ? Number(raw) : NaN;
    if (!Number.isFinite(n)) return {};
    return { ws: Math.max(0, Math.min(7, Math.trunc(n))) };
  },
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
  pupils?: { name: string; phone?: string | null; postcode?: string | null; address?: string | null; prepaid_hours?: number | null; pricing_type?: string | null; block_hours_total?: number | null; profile_image_url?: string | null; } | null;
}

interface PrevLessonRow {
  id: string;
  lesson_date: string;
  status: string;
  notes: string | null;
}

interface PreviewPupil {
  id: string;
  name: string | null;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  postcode: string | null;
  calendar_colour: string | null;
  custom_rate: number | null;
  custom_rate_90: number | null;
  custom_rate_120: number | null;
}

interface PupilReadySetting {
  pupil_id: string;
  instructor_id: string;
  available_days: string[] | null;
  preferred_duration_minutes: number | null;
  min_notice_hours: number | null;
  short_notice_opt_in: boolean | null;
}

const POPPINS = { fontFamily: "Inter, sans-serif" } as const;
// Default weekly goals — should come from instructor settings
// (instructors.weekly_lesson_goal / weekly_earnings_goal). We fall back to
// these defaults if the columns don't exist or the row hasn't been populated.
const DEFAULT_WEEKLY_LESSON_GOAL = 20;
const DEFAULT_WEEKLY_EARNINGS_GOAL = 800;

// Tier thresholds — must mirror the /rewards page.
const TIER_THRESHOLDS = {
  bronze: 0,
  silver: 500,
  gold: 1500,
  platinum: 3000,
  elite: 6000,
} as const;
const TIER_COLORS: Record<keyof typeof TIER_THRESHOLDS, string> = {
  bronze: "#CD7F32",
  silver: "#9CA3AF",
  gold: "#D97706",
  platinum: "#6366F1",
  elite: "#0B1F3A",
};
function tierFromPoints(pts: number): keyof typeof TIER_THRESHOLDS {
  if (pts >= TIER_THRESHOLDS.elite) return "elite";
  if (pts >= TIER_THRESHOLDS.platinum) return "platinum";
  if (pts >= TIER_THRESHOLDS.gold) return "gold";
  if (pts >= TIER_THRESHOLDS.silver) return "silver";
  return "bronze";
}

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

function formatMins(mins: number) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h && m) return `${h}h ${m}m`;
  if (h) return `${h}h`;
  return `${m}m`;
}


type NAItem = {
  key: 'tests' | 'jobs' | 'calls' | 'enq' | 'cancellations' | 'reschedules' | 'certs_expired' | 'certs_expiring' | 'birthday';
  count: number;
  primary: string;
  subtitle: string;
  onClick: () => void;
};

const NA_CATEGORY_ORDER: NAItem['key'][] = ['certs_expired', 'cancellations', 'reschedules', 'birthday', 'certs_expiring', 'tests', 'jobs', 'calls', 'enq'];

const NA_CATEGORY_STYLES: Record<NAItem['key'], { chipBg: string; accent: string; Icon: React.ComponentType<{ size?: number; color?: string }> }> = {
  tests: { chipBg: '#E6F1FB', accent: '#1877D6', Icon: IconSteeringWheel },
  jobs:  { chipBg: '#FBEFE1', accent: '#B5661E', Icon: IconBriefcase },
  calls: { chipBg: '#F0EBFF', accent: '#6B4FD6', Icon: IconPhone },
  enq:   { chipBg: '#EAF3DE', accent: '#2E9E5B', Icon: IconMessageCircle },
  cancellations: { chipBg: '#FEF2F2', accent: '#CC2229', Icon: XCircle },
  reschedules:   { chipBg: '#FFFBEB', accent: '#D97706', Icon: RefreshCw },
  certs_expired:  { chipBg: '#FEF2F2', accent: '#CC2229', Icon: AlertCircle },
  certs_expiring: { chipBg: '#FFFBEB', accent: '#D97706', Icon: Clock },
  birthday: { chipBg: '#F0EBFF', accent: '#6B4FD6', Icon: IconGift },
};


const NA_CARD_STYLE: React.CSSProperties = {
  background: '#FFFFFF',
  borderRadius: 14,
  padding: '12px 16px',
  boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  boxSizing: 'border-box',
};

function NeedsAttentionRow({ item }: { item: NAItem }) {
  const { chipBg, accent, Icon } = NA_CATEGORY_STYLES[item.key];
  return (
    <div
      onClick={item.onClick}
      role="button"
      tabIndex={0}
      className="cf-tap"
      style={{ ...NA_CARD_STYLE, cursor: 'pointer' }}
    >
      <div style={{ width: 36, height: 36, borderRadius: 11, background: chipBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon size={18} color={accent} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: '#12142B', fontFamily: 'Inter, sans-serif', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {item.primary}
        </div>
        <div style={{ fontSize: 11, color: '#8A94A6', marginTop: 1, fontFamily: 'Inter, sans-serif', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {item.subtitle}
        </div>
      </div>
      <IconChevronRight size={15} color="#B0BAC9" />
    </div>
  );
}

function NeedsAttentionAllClear() {
  return (
    <div style={NA_CARD_STYLE}>
      <div style={{ width: 36, height: 36, borderRadius: 11, background: '#EAF3DE', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <IconCircleCheck size={18} color="#2E9E5B" />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: '#12142B', fontFamily: 'Inter, sans-serif' }}>All clear</div>
        <div style={{ fontSize: 11, color: '#8A94A6', marginTop: 1, fontFamily: 'Inter, sans-serif' }}>Nothing needs your attention</div>
      </div>
    </div>
  );
}

function NeedsAttentionSection({ items }: { items: NAItem[] }) {
  const active = items.filter((i) => i.count > 0);
  if (active.length === 0) {
    return (
      <div style={{ margin: '0 16px' }}>
        <NeedsAttentionAllClear />
      </div>
    );
  }
  const sorted = [...active].sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count;
    return NA_CATEGORY_ORDER.indexOf(a.key) - NA_CATEGORY_ORDER.indexOf(b.key);
  }).slice(0, 6);
  return (
    <div style={{ margin: '0 16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: '#0B1F3A', fontFamily: 'Inter, sans-serif' }}>Needs attention</div>
        <div style={{ background: '#FCEBEB', color: '#CC2229', fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: 999, fontFamily: 'Inter, sans-serif' }}>
          {active.length} urgent
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {sorted.map((it) => <NeedsAttentionRow key={it.key} item={it} />)}
      </div>
    </div>
  );
}




function normalizePupilStatus(status: string | null | undefined) {
  const normalized = (status ?? "active").toLowerCase();
  return normalized || "active";
}

function isCurrentPupil(pupil: { status?: string | null; deleted_at?: string | null }) {
  if (pupil.deleted_at != null) return false;
  const status = normalizePupilStatus(pupil.status);
  return status !== "inactive" && status !== "passed" && status !== "cancelled" && status !== "archived";
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

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function lessonDateTime(l: LessonRow) {
  const t = (l.lesson_time ?? "00:00:00").slice(0, 8);
  const time = t.length === 5 ? `${t}:00` : t;
  return new Date(`${l.lesson_date}T${time}`);
}

function timeToMins(time: string): number {
  if (!time) return 0;
  const parts = time.split(':').map(Number);
  return (parts[0] || 0) * 60 + (parts[1] || 0);
}

function minsToTime(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  const period = h >= 12 ? 'pm' : 'am';
  const displayH = h > 12 ? h - 12 : h === 0 ? 12 : h;
  return `${displayH}:${String(m).padStart(2, '0')}${period}`;
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
  if (!l.lesson_time || l.lesson_time === "00:00") return "TBC";
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
  if (status === "confirmed") return "#1877D6";
  if (status === "pending") return "#1877D6";
  if (status === "cancelled") return "#1877D6";
  return "#6B7280";
}

function TodayLessonsTile({
  todayLessons,
  onNavigate,
  onAddLesson,
}: {
  todayLessons: LessonRow[];
  onNavigate: () => void;
  onAddLesson?: () => void;
}) {
  const total = todayLessons.length;
  const upcoming = todayLessons.filter((l) =>
    ["confirmed", "pending", "in_progress"].includes(l.status) &&
    l.status !== "cancelled",
  ).length;
  const completed = todayLessons.filter((l) => l.status === "completed").length;
  const subtitle =
    total === 0
      ? "No lessons today"
      : `${upcoming} upcoming · ${completed} completed`;

  const progress = total === 0 ? 0 : completed / total;
  const size = 48;
  const stroke = 4;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - progress);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onNavigate}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onNavigate();
        }
      }}
      style={{
        width: "100%",
        background: "#FFFFFF",
        border: "0.5px solid rgba(15,32,68,0.10)",
        borderRadius: 16,
        padding: "14px 16px",
        display: "flex",
        alignItems: "center",
        gap: 12,
        cursor: "pointer",
        textAlign: "left",
        fontFamily: "Inter, sans-serif",
      }}
    >
      <span
        style={{
          width: 36,
          height: 36,
          borderRadius: 11,
          background: "#E6F1FB",
          color: "#1877D6",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <IconCalendar size={18} strokeWidth={1.5} />
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ fontSize: 14, fontWeight: 500, color: "#0B1F3A", lineHeight: 1.3 }}>
            Today's lessons
          </div>
          {onAddLesson && (
            <button
              type="button"
              aria-label="Add lesson"
              onClick={(e) => {
                e.stopPropagation();
                onAddLesson();
              }}
              style={{
                width: 22,
                height: 22,
                borderRadius: 6,
                background: "#1877D6",
                color: "#FFFFFF",
                border: "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                cursor: "pointer",
                padding: 0,
              }}
            >
              <Plus size={14} strokeWidth={2.5} />
            </button>
          )}
        </div>
        <div style={{ fontSize: 12, fontWeight: 400, color: "#64748B", marginTop: 2, lineHeight: 1.3 }}>
          {subtitle}
        </div>
      </div>
      <div
        style={{
          position: "relative",
          width: size,
          height: size,
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <svg
          width={size}
          height={size}
          style={{ position: "absolute", inset: 0, transform: "rotate(-90deg)" }}
        >
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#E6F1FB"
            strokeWidth={stroke}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#22C55E"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{ transition: "stroke-dashoffset 0.4s ease" }}
          />
        </svg>
        <div
          style={{
            fontSize: 16,
            fontWeight: 600,
            color: "#0B1F3A",
            lineHeight: 1,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {total}
        </div>
      </div>
    </div>
  );
}

type StatSlideData = {
  key: string;
  title: string;
  subtitleTop: string;
  subtitleBottom: React.ReactNode;
  icon: React.ReactNode;
  right:
    | { kind: "circle"; value: string | number; active: boolean }
    | { kind: "value"; value: string; label?: string };
};

function SwipeableStatsCard({
  slides,
}: {
  slides: StatSlideData[];
}) {
  const [idx, setIdx] = useState(0);
  const startX = useRef<number | null>(null);
  const deltaRef = useRef(0);
  const draggingMouse = useRef(false);

  const commit = () => {
    if (startX.current === null) return;
    const d = deltaRef.current;
    startX.current = null;
    deltaRef.current = 0;
    draggingMouse.current = false;
    if (d < -40 && idx < slides.length - 1) setIdx(idx + 1);
    else if (d > 40 && idx > 0) setIdx(idx - 1);
  };

  const s = slides[Math.min(idx, slides.length - 1)];

  return (
    <div
      style={{
        position: "relative",
        background: "#FFFFFF",
        borderRadius: 16,
        padding: 16,
        boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
        marginBottom: 14,
        userSelect: "none",
        touchAction: "pan-y",
      }}
      onTouchStart={(e) => {
        startX.current = e.touches[0].clientX;
        deltaRef.current = 0;
      }}
      onTouchMove={(e) => {
        if (startX.current !== null) deltaRef.current = e.touches[0].clientX - startX.current;
      }}
      onTouchEnd={commit}
      onMouseDown={(e) => {
        startX.current = e.clientX;
        deltaRef.current = 0;
        draggingMouse.current = true;
      }}
      onMouseMove={(e) => {
        if (draggingMouse.current && startX.current !== null) deltaRef.current = e.clientX - startX.current;
      }}
      onMouseUp={commit}
      onMouseLeave={() => {
        if (draggingMouse.current) commit();
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            background: "#EEF2F7",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            color: "#1877D6",
          }}
        >
          {s.icon}
        </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: "#12142B" }}>{s.title}</div>
            <div style={{ fontSize: 12, color: "#8A94A6", marginTop: 1 }}>{s.subtitleTop}</div>
          <div style={{ fontSize: 11, color: "#B0BAC9", marginTop: 2 }}>{s.subtitleBottom}</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", flexShrink: 0 }}>
          {s.right.kind === "circle" ? (
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: "50%",
                border: "2px solid #EEF2F7",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 20,
                fontWeight: 600,
                color: s.right.active ? "#1877D6" : "#B0BAC9",
              }}
            >
              {s.right.value}
            </div>
          ) : (
            <>
              <div style={{ fontSize: 20, fontWeight: 700, color: "#1877D6", lineHeight: 1 }}>{s.right.value}</div>
              {s.right.label && <div style={{ fontSize: 11, color: "#B0BAC9", marginTop: 2 }}>{s.right.label}</div>}
            </>
          )}
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", marginTop: 14 }}>
        <div style={{ flex: 1 }} />
        <div style={{ flex: 1, display: "flex", justifyContent: "center", gap: 5 }}>
          {slides.map((sl, i) => {
            const active = i === idx;
            return (
              <button
                key={sl.key}
                type="button"
                aria-label={`Show ${sl.title}`}
                onClick={() => setIdx(i)}
                style={{
                  border: "none",
                  padding: 0,
                  cursor: "pointer",
                  height: 6,
                  width: active ? 16 : 6,
                  borderRadius: active ? 4 : "50%",
                  background: active ? "#1877D6" : "#D0D5DD",
                }}
              />
            );
          })}
        </div>
        <div style={{ flex: 1 }} />
      </div>
    </div>
  );
}



type TabKey = "today" | "tomorrow" | "next";

type MarketplaceTile = {
  id: string;
  title: string;
  subtitle: string | null;
  badge: string | null;
  gradient: string | null;
  image_url: string | null;
  link_url: string;
  color: string | null;
  display_order: number | null;
};






type QaTile = {
  key: string;
  label: string;
  onClick: () => void;
  icon: React.ReactNode;
  chipBg: string;
  badge?: React.ReactNode;
};
function TileCard({
  title,
  subtitle,
  icon,
  chipBg,
  chipBorder,
  attention,
  image,
  onClick,
}: {
  title: string;
  subtitle: string;
  icon?: React.ReactNode;
  chipBg?: string;
  chipBorder?: string;
  attention?: boolean;
  image?: string;
  onClick: () => void;
}) {
  const resolvedBorder = chipBorder ?? "rgba(15,32,68,0.12)";
  return (
    <button
      type="button"
      onClick={onClick}
      className="cf-tap qa-card"
      style={{
        position: "relative",
        background: "#FFFFFF",
        border: "1px solid #ECEFF3",
        borderRadius: 24,
        padding: image ? "0 0 18px" : "20px 20px 18px",
        minHeight: image ? 0 : 148,
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        justifyContent: "flex-start",
        cursor: "pointer",
        textAlign: "left",
        fontFamily: "Poppins, Inter, sans-serif",
        transition: "transform 0.15s ease, box-shadow 0.2s ease",
        overflow: "hidden",
        boxShadow: "0 2px 10px -4px rgba(11, 31, 58, 0.10)",
        width: "100%",
      }}
    >
      {attention && (
        <span
          style={{
            position: "absolute",
            top: 12,
            right: 12,
            width: 8,
            height: 8,
            borderRadius: 999,
            background: "#CC2229",
            zIndex: 2,
          }}
        />
      )}
      {image && (
        <div
          style={{
            width: "100%",
            aspectRatio: "16 / 9",
            flexShrink: 0,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            marginBottom: 14,
            position: "relative",
            overflow: "hidden",
            background: "#EEF1F6",
          }}
        >
          <img
            src={image}
            alt=""
            loading="lazy"
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "contain",
              objectPosition: "center",
              display: "block",
            }}
          />
        </div>
      )}
      {icon && (
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            background: chipBg,
            border: `1px solid ${resolvedBorder}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 18,
            marginLeft: 20,
            position: "relative",
            transition: "transform 0.15s ease",
          }}
          className="qa-icon"
        >
          {icon}
        </div>
      )}
      <div
        style={{
          fontSize: 15,
          fontWeight: 600,
          color: "#0B1F3A",
          lineHeight: 1.25,
          marginBottom: 4,
          marginTop: !icon && !image ? 62 : 0,
          letterSpacing: "-0.01em",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          maxWidth: "calc(100% - 56px)",
          marginLeft: 20,
          fontFamily: "Poppins, Inter, sans-serif",
        }}
      >
        {title}
      </div>
      <div
        style={{
          fontSize: 12,
          fontWeight: 500,
          color: "#8A93A3",
          overflow: "hidden",
          textOverflow: "ellipsis",
          maxWidth: "calc(100% - 56px)",
          marginLeft: 20,
          whiteSpace: subtitle.includes("\n") ? "pre-line" : "nowrap",
          lineHeight: 1.3,
          fontFamily: "Poppins, Inter, sans-serif",
        }}
      >
        {subtitle}
      </div>
      <span
        style={{
          position: "absolute",
          right: 14,
          bottom: 14,
          width: 32,
          height: 32,
          borderRadius: 999,
          background: "#E5EAF1",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 1px 2px rgba(11, 31, 58, 0.06)",
        }}
      >
        <ChevronRight size={16} color="#0B1F3A" strokeWidth={2.4} />
      </span>
    </button>
  );
}


function QuickActionsGrid({ pages }: { pages: QaTile[][] }) {
  const PF = "Inter, sans-serif";
  const NAVY = '#12142B';
  const [page, setPage] = useState(0);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const dragRef = useRef<{ x: number; active: boolean } | null>(null);

  const flat = useMemo(() => pages.flat(), [pages]);
  const q = query.trim().toLowerCase();
  const filtered = q ? flat.filter((t) => t.label.toLowerCase().includes(q)) : [];
  const showFiltered = searchOpen && q.length > 0;

  const clamp = (n: number) => Math.max(0, Math.min(pages.length - 1, n));

  const onPointerDown = (e: React.PointerEvent) => {
    if (showFiltered) return;
    dragRef.current = { x: e.clientX, active: true };
  };
  const onPointerUp = (e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d || !d.active) return;
    const dx = e.clientX - d.x;
    if (Math.abs(dx) > 40) {
      setPage((p) => clamp(p + (dx < 0 ? 1 : -1)));
    }
    dragRef.current = null;
  };

  const tiles = showFiltered ? filtered : pages[page] ?? [];

  const renderTile = (t: QaTile) => (
    <button
      key={t.key}
      type="button"
      onClick={t.onClick}
      style={{
        position: 'relative',
        background: '#FFFFFF',
        borderRadius: 14,
        padding: '12px 6px 10px',
        border: 'none',
        cursor: 'pointer',
        fontFamily: PF,
        textAlign: 'center',
        boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}
    >
      {t.badge ? (
        <span style={{ position: 'absolute', top: 7, right: 7, fontSize: 9 }}>{t.badge}</span>
      ) : null}
      <span
        style={{
          width: 42,
          height: 42,
          borderRadius: 12,
          background: t.chipBg,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 8px',
          flexShrink: 0,
        }}
      >
        {React.isValidElement(t.icon)
          ? React.cloneElement(t.icon as React.ReactElement<{ size?: number }>, { size: 19 })
          : t.icon}
      </span>
      <div style={{ fontSize: 12, fontWeight: 500, lineHeight: 1.2, marginTop: 0, color: NAVY }}>{t.label}</div>
    </button>
  );

  return (
    <div style={{ fontFamily: PF }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ fontSize: 16, fontWeight: 600, color: NAVY }}>Quick actions</div>
        <button
          type="button"
          aria-label="Search actions"
          onClick={() => {
            const next = !searchOpen;
            setSearchOpen(next);
            if (!next) setQuery('');
          }}
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            background: '#fff',
            boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
            border: 'none',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
          }}
        >
          <IconSearch size={16} color="#1877D6" />
        </button>
      </div>

      {searchOpen && (
        <div
          style={{
            background: '#fff',
            borderRadius: 12,
            padding: '9px 12px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginBottom: 14,
          }}
        >
          <IconSearch size={15} color="#B0BAC9" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search actions..."
            style={{
              flex: 1,
              border: 'none',
              outline: 'none',
              background: 'transparent',
              fontSize: 13,
              fontFamily: PF,
              color: NAVY,
              minWidth: 0,
            }}
          />
          <button
            type="button"
            aria-label="Clear search"
            onClick={() => {
              setQuery('');
              setSearchOpen(false);
            }}
            style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'inline-flex' }}
          >
            <IconX size={14} color="#B0BAC9" />
          </button>
        </div>
      )}

      <div
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerCancel={() => (dragRef.current = null)}
        style={{ touchAction: 'pan-y' }}
      >
        {showFiltered && filtered.length === 0 ? (
          <div style={{ textAlign: 'center', fontSize: 14, color: '#B0BAC9', padding: '24px 0' }}>
            No actions found
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
            {tiles.map(renderTile)}
          </div>
        )}
      </div>

      {!showFiltered && pages.length > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 12, marginBottom: 0 }}>
          {pages.map((_, i) => {
            const active = i === page;
            return (
              <button
                key={i}
                type="button"
                aria-label={`Page ${i + 1}`}
                onClick={() => setPage(i)}
                style={{
                  width: active ? 16 : 6,
                  height: 6,
                  borderRadius: active ? 4 : 999,
                  background: active ? '#1877D6' : '#D0D5DD',
                  border: 'none',
                  padding: 0,
                  cursor: 'pointer',
                }}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}



function HomePage() {
  const navigate = useNavigate();

  const [quickPage, setQuickPage] = useState(0);
  const [quickSearchOpen, setQuickSearchOpen] = useState(false);
  const [runningLateOpen, setRunningLateOpen] = useState(false);
  const [nearbyOpen, setNearbyOpen] = useState(false);
  const [nearbyLoading, setNearbyLoading] = useState<string | null>(null);
  const [quickSearchQuery, setQuickSearchQuery] = useState('');
  const qaStartX = useRef(0);


  const [pupilQuery, setPupilQuery] = useState("");
  const [firstName, setFirstName] = useState("there");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [allPupils, setAllPupils] = useState<PreviewPupil[]>([]);
  const [allAvailability, setAllAvailability] = useState<PupilReadySetting[]>([]);
  const [reloadKey, setReloadKey] = useState(0);
  useEffect(() => {
    const onPaymentRecorded = () => setReloadKey((k) => k + 1);
    window.addEventListener("dsm-payment-recorded", onPaymentRecorded);
    return () => window.removeEventListener("dsm-payment-recorded", onPaymentRecorded);
  }, []);
  const [addLessonOpen, setAddLessonOpen] = useState(false);
  const [unifiedPayOpen, setUnifiedPayOpen] = useState(false);
  const [addExpenseOpen, setAddExpenseOpen] = useState(false);
  const [logMileageOpen, setLogMileageOpen] = useState(false);
  const [sendMessageOpen, setSendMessageOpen] = useState(false);
  const [sendMessagePupilId, setSendMessagePupilId] = useState<string | undefined>();
  const [unifiedPayPupilId, setUnifiedPayPupilId] = useState<string | undefined>();
  const [addLessonPupilId, setAddLessonPupilId] = useState<string | undefined>();
  const [addLessonDate, setAddLessonDate] = useState<string | undefined>();
  const [lessons, setLessons] = useState<LessonRow[]>([]);
  const [autoTrackLessons, setAutoTrackLessons] = useState<boolean>(false);
  const [actionsOpenForLesson, setActionsOpenForLesson] = useState<LessonRow | null>(null);
  const [cancelSheetForLesson, setCancelSheetForLesson] = useState<LessonRow | null>(null);
  const [deleteSheetForLesson, setDeleteSheetForLesson] = useState<LessonRow | null>(null);
  const [paymentSheetForLesson, setPaymentSheetForLesson] = useState<LessonRow | null>(null);
  const [deleteSubmittingHome, setDeleteSubmittingHome] = useState(false);
  const [movingLessonHome, setMovingLessonHome] = useState<LessonRow | null>(null);
  const [moveModeHome, setMoveModeHome] = useState(false);
  const [confirmMoveHome, setConfirmMoveHome] = useState<{ date: string; time: string } | null>(null);
  useEffect(() => {
    if (!actionsOpenForLesson) return;
    const onDoc = (ev: MouseEvent) => {
      const target = ev.target as HTMLElement | null;
      if (target && target.closest('[data-home-lesson-actions-popover]')) return;
      if (target && target.closest('[data-home-lesson-actions-trigger]')) return;
      setActionsOpenForLesson(null);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [actionsOpenForLesson]);
  const handleMoveLessonHome = useCallback(async (newDate: string, newTime: string) => {
    if (!movingLessonHome) return;
    const SUPABASE_URL = "https://bjpqxfrihwjcqprmoqfs.supabase.co";
    const SUPABASE_ANON_KEY =
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJqcHF4ZnJpaHdqY3Fwcm1vcWZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE0NzQ4MjEsImV4cCI6MjA5NzA1MDgyMX0.HKlgx3dxP3uxX9wMRRUnfb0IPwaBpFcut_iUgT5XFeo";
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const timeVal = newTime.length === 5 ? `${newTime}:00` : newTime;
      const res = await fetch(
        SUPABASE_URL + '/rest/v1/lessons?id=eq.' + movingLessonHome.id,
        {
          method: 'PATCH',
          headers: {
            apikey: SUPABASE_ANON_KEY,
            Authorization: 'Bearer ' + token,
            'Content-Type': 'application/json',
            Prefer: 'return=minimal',
          },
          body: JSON.stringify({
            lesson_date: newDate,
            lesson_time: timeVal,
            updated_at: new Date().toISOString(),
          }),
        },
      );
      if (!res.ok) throw new Error('Failed to move lesson');

      const firstName = (movingLessonHome.pupils as any)?.name?.split(' ')[0] || 'Your pupil';
      if (userId) {
        await supabase.from('instructor_notifications').insert({
          instructor_id: userId,
          type: 'lesson_rescheduled',
          title: 'Lesson rescheduled',
          body: firstName + "'s lesson moved from " + movingLessonHome.lesson_time +
            ' to ' + timeVal + ' on ' + newDate,
          lesson_id: movingLessonHome.id,
        });
        await supabase.from('chat_messages').insert({
          instructor_id: userId,
          pupil_id: movingLessonHome.pupil_id,
          sender_type: 'instructor',
          body: 'Hi, I have rescheduled your lesson from ' +
            movingLessonHome.lesson_date + ' at ' + movingLessonHome.lesson_time +
            ' to ' + newDate + ' at ' + timeVal +
            '. Please let me know if this works for you.',
        });
      }

      setLessons((prev) =>
        prev.map((l) =>
          l.id === movingLessonHome.id
            ? { ...l, lesson_date: newDate, lesson_time: timeVal }
            : l,
        ),
      );

      setMovingLessonHome(null);
      setMoveModeHome(false);
      setConfirmMoveHome(null);
      toast.success('Lesson moved to ' + newDate + ' at ' + newTime);
    } catch (err) {
      console.error('[home] move error', err);
      toast.error('Failed to move lesson');
    }
  }, [movingLessonHome, userId]);
  const [allLessons, setAllLessons] = useState<any[]>([]);
  const [expandedLessonId, setExpandedLessonId] = useState<string | null>(null);
  const [nextLesson, setNextLesson] = useState<LessonRow | null>(null);
  const [outstanding, setOutstanding] = useState(0);
  const [outstandingOpen, setOutstandingOpen] = useState(false);
  const [outstandingBreakdown, setOutstandingBreakdown] = useState<Array<{

    pupilId: string;
    name: string;
    firstName: string;
    phone: string | null;
    email: string | null;
    amount: number;
    type: "Lessons" | "NI Course";
  }>>([]);
  const [instructorFullName, setInstructorFullName] = useState<string>("");
  const [weekEarnings, setWeekEarnings] = useState(0);
  const [weekLessonCount, setWeekLessonCount] = useState(0);
  const [todayEarnings, setTodayEarnings] = useState(0);
  const [earningsEstimated, setEarningsEstimated] = useState(false);
  const [earningsOpen, setEarningsOpen] = useState(false);
  const [lessonsOpen, setLessonsOpen] = useState(false);
  const [earningsRows, setEarningsRows] = useState<Array<{
    id: string;
    date: string;
    pupilName: string;
    amount: number;
    method: string;
    source: "lesson" | "booking" | "lesson-earned";
  }>>([]);
  const [weekLessonRows, setWeekLessonRows] = useState<Array<{
    id: string;
    lesson_date: string;
    lesson_time: string;
    duration_minutes: number | null;
    status: string;
    pupil_id: string;
    pupilName: string;
  }>>([]);
  
  const [tab, setTab] = useState<TabKey>("today");
  const [authChecked, setAuthChecked] = useState(false);
  const [workingHours, setWorkingHours] = useState<any>(null);
  const minGapMinutes = useMinGapMinutes();
  const [instructorBufferAfter, setInstructorBufferAfter] = useState<number>(15);
  const [pupilBufferMap, setPupilBufferMap] = useState<Record<string, { before: number | null; after: number | null }>>({});
  const [pupilAvailMap, setPupilAvailMap] = useState<Record<string, { available_days: string[] | null; available_from: string | null; available_until: string | null; min_notice_hours: number | null; short_notice_opt_in: boolean | null }>>({});
  const [pupilInfoMap, setPupilInfoMap] = useState<Record<string, { first_name: string | null; name: string | null; profile_image_url: string | null; calendar_colour: string | null; last_lesson_date: string | null }>>({});
  const [todayEndTime, setTodayEndTime] = useState<string | null>(null);
  const [notifCount, setNotifCount] = useState(0);
  const [toastNotif, setToastNotif] = useState<{ title: string; body: string; type: string; id: string } | null>(null);
  const [toastVisible, setToastVisible] = useState(false);
  const [testsOpen, setTestsOpen] = useState(false);
  const [upcomingTests, setUpcomingTests] = useState<Array<{

    id: string;
    name: string;
    test_date: string;
    test_time: string | null;
    test_centre: string | null;
  }>>([]);
  const [pendingSwapCount, setPendingSwapCount] = useState(0);
  const [openJobsCount, setOpenJobsCount] = useState(0);
  const [claimedAwaitingPaymentCount, setClaimedAwaitingPaymentCount] = useState(0);
  const [swapRequests, setSwapRequests] = useState<Array<{ id: string; name: string; test_centre: string | null; current_test_date: string | null; current_test_time: string | null; status: string; created_at: string }>>([]);
  const [eolLesson, setEolLesson] = useState<LessonRow | null>(null);
  const [recentCancellations, setRecentCancellations] = useState<Array<{ id: string; pupil_first_name: string | null }>>([]);
  const [rescheduleRequestsCount, setRescheduleRequestsCount] = useState<number>(0);
  const [expiredCerts, setExpiredCerts] = useState<Array<{ id: string; title: string; expiry_date: string }>>([]);
  const [expiringCerts, setExpiringCerts] = useState<Array<{ id: string; title: string; expiry_date: string }>>([]);
  type BirthdayPupil = { id: string; name: string | null; first_name: string | null; phone: string | null; date_of_birth: string; calendar_colour: string | null };
  const [birthdayToday, setBirthdayToday] = useState<BirthdayPupil[]>([]);
  const [birthdaySheetOpen, setBirthdaySheetOpen] = useState(false);


  // ----- Desktop layout (>=768px) — mobile untouched -----
  const [isDesktop, setIsDesktop] = useState<boolean>(() =>
    typeof window !== "undefined" ? window.innerWidth >= 768 : false
  );
  useEffect(() => {
    const handler = () => setIsDesktop(window.innerWidth >= 768);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);
  const [activePupilsCount, setActivePupilsCount] = useState(0);
  // Dismiss / mute state for the Local Issues + chat rows (per-device)
  const LOCAL_MUTE_KEY = "dsm-home-local-muted";
  const [mutedRows, setMutedRows] = useState<Record<string, number>>(() => {
    if (typeof window === "undefined") return {};
    try {
      const raw = window.localStorage.getItem(LOCAL_MUTE_KEY);
      return raw ? (JSON.parse(raw) as Record<string, number>) : {};
    } catch {
      return {};
    }
  });
  const persistMutedRows = useCallback((next: Record<string, number>) => {
    setMutedRows(next);
    try {
      window.localStorage.setItem(LOCAL_MUTE_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  }, []);
  const isRowMuted = useCallback(
    (key: string) => {
      const until = mutedRows[key];
      return typeof until === "number" && until > Date.now();
    },
    [mutedRows],
  );
  const muteRow = useCallback(
    (key: string, ms: number, label: string, undoLabel: string) => {
      const prev = mutedRows[key];
      persistMutedRows({ ...mutedRows, [key]: Date.now() + ms });
      toast.success(label, {
        action: {
          label: "Undo",
          onClick: () => {
            const next = { ...mutedRows };
            if (prev === undefined) delete next[key];
            else next[key] = prev;
            persistMutedRows(next);
            toast.success(undoLabel);
          },
        },
      });
    },
    [mutedRows, persistMutedRows],
  );
  const [localAlerts, setLocalAlerts] = useState<any[] | null>(null);

  const [hasUnreadAlertComments, setHasUnreadAlertComments] = useState(false);
  const [localRoom, setLocalRoom] = useState<{ id: string; area_name: string; image_url: string | null; description: string | null } | null>(null);
  const [localChatLatest, setLocalChatLatest] = useState<{ message: string; created_at: string; instructors: { name: string | null } | null } | null>(null);
  const [ukRoom, setUkRoom] = useState<{ id: string; area_name: string } | null>(null);
  const [ukChatLatest, setUkChatLatest] = useState<any>(null);
  const [unreadUkChat, setUnreadUkChat] = useState(0);
  const [joinedRoomChats, setJoinedRoomChats] = useState<Array<{
    id: string;
    area_name: string | null;
    outcode: string;
    image_url: string | null;
    description: string | null;
    latest: { message: string | null; created_at: string; instructors: { name: string | null } | null } | null;
    unread: number;
  }>>([]);
  const [instructorArea, setInstructorArea] = useState<string>('your area');
  const [instructorHomePostcode, setInstructorHomePostcode] = useState<string | null>(null);
  const [pupilsTab, setPupilsTab] = useState<'current' | 'passed' | 'cancelled' | 'inactive'>('current');
  const [allPupilsList, setAllPupilsList] = useState<Array<{
    id: string;
    name: string;
    first_name: string | null;
    status: string;
    profile_image_url: string | null;
    calendar_colour: string | null;
    last_lesson_date: string | null;
    phone: string | null;
  }>>([]);
  const [recentActivity, setRecentActivity] = useState<Array<{
    id: string;
    title: string;
    body: string | null;
    created_at: string;
    read: boolean;
  }>>([]);
  const [unreadMsgs, setUnreadMsgs] = useState<Array<{
    id: string;
    pupil_id: string;
    body: string | null;
    created_at: string;
    read_at: string | null;
    pupils: { name: string | null; first_name: string | null; profile_image_url: string | null } | null;
  }>>([]);

  // Unread community chat messages across subscribed, non-muted rooms
  const [unreadChat, setUnreadChat] = useState(0);

  // Community card collapse state (starts collapsed, user taps to expand)
  const [communityExpanded, setCommunityExpanded] = useState(false);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    (async () => {
      const { data: subs } = await supabase
        .from('chat_room_subscriptions')
        .select('room_id, last_read_at, muted_until')
        .eq('instructor_id', userId);
      if (cancelled || !subs?.length) return;
      let total = 0;
      for (const s of subs as any[]) {
        const muted = s.muted_until && new Date(s.muted_until) > new Date();
        if (muted) continue;
        const { count } = await supabase
          .from('local_chat_messages')
          .select('id', { count: 'exact', head: true })
          .eq('room_id', s.room_id)
          .neq('instructor_id', userId)
          .gt('created_at', s.last_read_at ?? new Date(0).toISOString());
        total += count ?? 0;
      }
      if (!cancelled) setUnreadChat(total);
    })();
    return () => { cancelled = true; };
  }, [userId]);

  // Latest message from every other room the instructor has joined
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    (async () => {
      const { data: subs } = await supabase
        .from('chat_room_subscriptions')
        .select('room_id, last_read_at')
        .eq('instructor_id', userId);
      if (cancelled || !subs?.length) { if (!cancelled) setJoinedRoomChats([]); return; }
      const excluded = new Set([localRoom?.id, ukRoom?.id].filter(Boolean) as string[]);
      const roomIds = (subs as any[]).map((s) => s.room_id).filter((id: string) => id && !excluded.has(id));
      if (!roomIds.length) { if (!cancelled) setJoinedRoomChats([]); return; }
      const { data: rooms } = await supabase
        .from('local_chat_rooms')
        .select('id, area_name, outcode, image_url, description')
        .in('id', roomIds);
      if (cancelled || !rooms?.length) { if (!cancelled) setJoinedRoomChats([]); return; }
      const out: Array<any> = [];
      for (const room of rooms as any[]) {
        const sub = (subs as any[]).find((s) => s.room_id === room.id);
        const { data: latest } = await supabase
          .from('local_chat_messages')
          .select('message, created_at, instructors(name)')
          .eq('room_id', room.id)
          .is('deleted_at', null)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (!latest) continue;
        const unreadBase = sub?.last_read_at || '1970-01-01T00:00:00Z';
        const { count: unreadCount } = await supabase
          .from('local_chat_messages')
          .select('*', { count: 'exact', head: true })
          .eq('room_id', room.id)
          .is('deleted_at', null)
          .gt('created_at', unreadBase);
        out.push({ id: room.id, area_name: room.area_name, outcode: room.outcode, image_url: room.image_url, description: room.description, latest, unread: unreadCount || 0 });
      }
      out.sort((a, b) => new Date(b.latest.created_at).getTime() - new Date(a.latest.created_at).getTime());
      if (!cancelled) setJoinedRoomChats(out);
    })();
    return () => { cancelled = true; };
  }, [userId, localRoom?.id, ukRoom?.id]);



  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    (async () => {
      const SUPABASE_URL = "https://bjpqxfrihwjcqprmoqfs.supabase.co";
      const SUPABASE_ANON_KEY =
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJqcHF4ZnJpaHdqY3Fwcm1vcWZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE0NzQ4MjEsImV4cCI6MjA5NzA1MDgyMX0.HKlgx3dxP3uxX9wMRRUnfb0IPwaBpFcut_iUgT5XFeo";
      try {
        const res = await fetch(
          `${SUPABASE_URL}/rest/v1/chat_messages?instructor_id=eq.${userId}&sender_type=eq.pupil&read_at=is.null&deleted_at=is.null&order=created_at.desc&limit=10&select=id,pupil_id,body,created_at,read_at,pupils(name,first_name,profile_image_url,photo_url)`,
          {
            headers: {
              apikey: SUPABASE_ANON_KEY,
              Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
            },
          }
        );
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) setUnreadMsgs(Array.isArray(data) ? data : []);
      } catch {}
    })();
    return () => { cancelled = true; };
  }, [userId]);

  // Local alerts (community issues) — filtered by instructor's outcode.
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    (async () => {
      try {
        const { data: instructor } = await supabase
          .from('instructors')
          .select('home_postcode, city')
          .eq('id', userId)
          .maybeSingle();
        const homePostcode = ((instructor as any)?.home_postcode ?? '').trim() || null;
        const outcode = homePostcode?.substring(0, 4)?.trim()?.toUpperCase() ?? null;
        const area = (instructor as any)?.city || outcode || 'your area';
        if (!cancelled) {
          setInstructorArea(area);
          setInstructorHomePostcode(homePostcode);
        }

        let query = supabase
          .from('local_alerts')
          .select('id, alert_type, description, location_name, upvotes, expires_at, created_at, area, outcode, instructor_id, owner_last_read_at, source')
          .eq('is_active', true)
          .gt('expires_at', new Date().toISOString())
          .order('upvotes', { ascending: false })
          .limit(10);
        if (outcode) query = query.eq('outcode', outcode);
        const { data, error } = await query;
        if (cancelled) return;
        if (error) { setLocalAlerts([]); return; }
        const filtered = Array.isArray(data) ? data : [];
        setLocalAlerts(filtered.slice(0, 3));

        // Unread comment activity on the user's own alerts
        try {
          const myAlerts = filtered.filter((a: any) => a?.instructor_id === userId);
          const myAlertIds = myAlerts.map((a: any) => a.id);
          if (myAlertIds.length > 0) {
            const { data: comments } = await supabase
              .from('alert_comments')
              .select('alert_id, created_at')
              .in('alert_id', myAlertIds)
              .order('created_at', { ascending: false });
            if (cancelled) return;
            const latestByAlert: Record<string, string> = {};
            (Array.isArray(comments) ? comments : []).forEach((c: any) => {
              if (c?.alert_id && !latestByAlert[c.alert_id]) latestByAlert[c.alert_id] = c.created_at;
            });
            const unread = myAlerts.some((a: any) => {
              const latest = latestByAlert[a.id];
              if (!latest) return false;
              if (!a.owner_last_read_at) return true;
              return new Date(latest).getTime() > new Date(a.owner_last_read_at).getTime();
            });
            setHasUnreadAlertComments(unread);
          } else {
            setHasUnreadAlertComments(false);
          }
        } catch {}

        // Local chat room + latest message
        if (outcode) {
          const { data: room } = await supabase
            .from('local_chat_rooms')
            .select('id, area_name, image_url, description')
            .eq('outcode', outcode)
            .maybeSingle();
          if (cancelled) return;
          if (room) {
            setLocalRoom(room as any);
            const { data: latest } = await supabase
              .from('local_chat_messages')
              .select('message, created_at, instructors(name)')
              .eq('room_id', (room as any).id)
              .is('deleted_at', null)
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle();
            if (!cancelled) setLocalChatLatest(latest as any);
          }
        }

        // National (UK) chat room + latest message + unread
        const { data: ukRoomData } = await supabase
          .from('local_chat_rooms')
          .select('id, area_name')
          .eq('outcode', 'UK')
          .maybeSingle();
        if (!cancelled && ukRoomData) {
          setUkRoom(ukRoomData as any);
          const { data: ukLatest } = await supabase
            .from('local_chat_messages')
            .select('message, created_at, instructors(name)')
            .eq('room_id', (ukRoomData as any).id)
            .is('deleted_at', null)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();
          if (!cancelled) setUkChatLatest(ukLatest as any);

          const { data: ukSub } = await supabase
            .from('chat_room_subscriptions')
            .select('last_read_at')
            .eq('instructor_id', userId)
            .eq('room_id', (ukRoomData as any).id)
            .maybeSingle();
          if (!cancelled && (ukSub as any)?.last_read_at && (ukLatest as any)?.created_at) {
            const isUnread = new Date((ukLatest as any).created_at) > new Date((ukSub as any).last_read_at);
            setUnreadUkChat(isUnread ? 1 : 0);
          }
        }
      } catch {
        if (!cancelled) setLocalAlerts([]);
      }
    })();
    return () => { cancelled = true; };
  }, [userId]);


  // Pupil cancellations (last 24h) + unread reschedule requests
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    (async () => {
      const since = new Date(Date.now() - 86400000).toISOString();
      const { data: canc } = await supabase
        .from("lessons")
        .select("id, pupils(first_name, name)")
        .eq("instructor_id", userId)
        .eq("status", "cancelled")
        .eq("cancelled_by", "pupil")
        .gte("cancelled_at", since)
        .order("cancelled_at", { ascending: false });
      if (!cancelled) {
        const rows = (canc ?? []).map((r: any) => ({
          id: r.id as string,
          pupil_first_name: (r.pupils?.first_name as string | null) ?? (r.pupils?.name ? String(r.pupils.name).split(/\s+/)[0] : null),
        }));
        setRecentCancellations(rows);
      }

      const { count: reschedCount } = await supabase
        .from("instructor_notifications")
        .select("id", { count: "exact", head: true })
        .eq("instructor_id", userId)
        .eq("type", "reschedule_request")
        .eq("read", false);
      if (!cancelled) setRescheduleRequestsCount(reschedCount ?? 0);
    })();
    return () => { cancelled = true; };
  }, [userId]);

  // Certification expiry surfacing
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    (async () => {
      const cutoff = new Date(Date.now() + 90 * 86400000).toISOString().split('T')[0];
      const { data } = await supabase
        .from('instructor_certifications')
        .select('id, title, expiry_date, reminder_days_before')
        .eq('instructor_id', userId)
        .eq('is_active', true)
        .not('expiry_date', 'is', null)
        .lte('expiry_date', cutoff)
        .order('expiry_date', { ascending: true });
      if (cancelled) return;
      const now = Date.now();
      const rows = (data ?? []) as Array<{ id: string; title: string; expiry_date: string }>;
      setExpiredCerts(rows.filter((c) => new Date(c.expiry_date).getTime() < now));
      setExpiringCerts(rows.filter((c) => new Date(c.expiry_date).getTime() >= now));
    })();
    return () => { cancelled = true; };
  }, [userId]);

  // Birthday reminders
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('pupils')
        .select('id, name, first_name, phone, date_of_birth, calendar_colour')
        .eq('instructor_id', userId)
        .not('date_of_birth', 'is', null)
        .neq('status', 'archived');
      if (cancelled) return;
      const today = new Date();
      const m = today.getMonth() + 1;
      const d = today.getDate();
      const rows = ((data ?? []) as BirthdayPupil[]).filter((p) => {
        if (!p.date_of_birth) return false;
        const dob = new Date(p.date_of_birth);
        return dob.getMonth() + 1 === m && dob.getDate() === d;
      });
      setBirthdayToday(rows);
    })();
    return () => { cancelled = true; };
  }, [userId]);

  useEffect(() => {
    if (!isDesktop) return;
    let cancelled = false;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) return;
      const { data: notes } = await supabase
        .from("instructor_notifications")
        .select("id, title, body, created_at, read")
        .eq("instructor_id", user.id)
        .order("created_at", { ascending: false })
        .limit(8);
      if (!cancelled) setRecentActivity((notes ?? []) as any);
    })();
    return () => { cancelled = true; };
  }, [isDesktop]);

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

      // EverySwap requests for ALL this instructor's pupils
      const { data: allPupils } = await supabase
        .from("pupils")
        .select("name")
        .eq("instructor_id", user.id);
      const pupilNames = (allPupils ?? []).map((p: any) => p.name).filter(Boolean);
      let swapRows: any[] = [];
      let swapCount = 0;
      if (pupilNames.length > 0) {
        const { data, count } = await supabase
          .from("test_swap_requests")
          .select("id, name, test_centre, current_test_date, current_test_time, status, created_at", { count: "exact" })
          .in("name", pupilNames)
          .in("status", ["pending", "matched"])
          .order("created_at", { ascending: false });
        swapRows = data ?? [];
        swapCount = count ?? 0;
      }
      setPendingSwapCount(swapCount);
      setSwapRequests(swapRows);

      // Open job offers count (best-effort — table may not exist yet)
      try {
        const { count: jobsCount } = await supabase
          .from("job_offers")
          .select("id", { count: "exact", head: true })
          .eq("status", "open");
        setOpenJobsCount(jobsCount ?? 0);
      } catch {
        setOpenJobsCount(0);
      }
      try {
        const { count: claimedCount } = await supabase
          .from("job_offers")
          .select("id", { count: "exact", head: true })
          .eq("claimed_by", user.id)
          .eq("contact_released", false);
        setClaimedAwaitingPaymentCount(claimedCount ?? 0);
      } catch {
        setClaimedAwaitingPaymentCount(0);
      }

      // Upcoming tests list for the bottom sheet and the alert strip
      const now = new Date();
      const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
      const { data: testRows } = await supabase
        .from("pupils")
        .select("id, name, first_name, test_date, test_time, test_centre")
        .eq("instructor_id", user.id)
        .not("test_date", "is", null)
        .gte("test_date", todayStr)
        .order("test_date", { ascending: true });
      setUpcomingTests(
        (testRows ?? []).map((p: any) => ({
          id: p.id,
          name: p.name || p.first_name || "Pupil",
          test_date: p.test_date,
          test_time: p.test_time ?? null,
          test_centre: p.test_centre ?? null,
        })),
      );
    }
    loadCount();
  }, []);

  // Poll every 30s for new notifications and show a toast popup for new arrivals.
  const lastSeenNotifIdRef = useRef<string | null>(null);
  const notifPollerInitRef = useRef(false);
  useEffect(() => {
    let cancelled = false;
    async function poll() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) return;
      const { data: rows } = await supabase
        .from("instructor_notifications")
        .select("id, title, body, read, created_at")
        .eq("instructor_id", user.id)
        .order("created_at", { ascending: false })
        .limit(10);
      if (cancelled || !rows) return;
      const latest = rows[0];
      if (!notifPollerInitRef.current) {
        notifPollerInitRef.current = true;
        lastSeenNotifIdRef.current = latest?.id ?? null;
        return;
      }
      if (!latest || latest.id === lastSeenNotifIdRef.current) return;
      const lastId = lastSeenNotifIdRef.current;
      const newOnes: typeof rows = [];
      for (const r of rows) {
        if (r.id === lastId) break;
        newOnes.push(r);
      }
      lastSeenNotifIdRef.current = latest.id;
      const { count } = await supabase
        .from("instructor_notifications")
        .select("id", { count: "exact", head: true })
        .eq("instructor_id", user.id)
        .eq("read", false);
      if (!cancelled) setNotifCount(count || 0);
      for (const n of newOnes.slice(0, 3).reverse()) {
        const raw = n.body || "";
        const body = raw.length > 60 ? raw.slice(0, 60) + "…" : raw;
        toast.custom((t) => (
          <div
            onClick={() => { toast.dismiss(t); navigate({ to: "/notifications" }); }}
            style={{
              background: "#0B1F3A",
              color: "#FFFFFF",
              borderRadius: 10,
              padding: "12px 14px",
              display: "flex",
              gap: 10,
              alignItems: "flex-start",
              minWidth: 280,
              maxWidth: 360,
              cursor: "pointer",
              boxShadow: "0 8px 24px rgba(0,0,0,0.25)",
              fontFamily: "Inter, sans-serif",
            }}
          >
            <div style={{ width: 32, height: 32, borderRadius: "50%", background: "rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Bell size={16} color="#FFFFFF" />
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.3 }}>{n.title}</div>
              {body && <div style={{ fontSize: 12, opacity: 0.85, marginTop: 2, lineHeight: 1.35 }}>{body}</div>}
            </div>
          </div>
        ), { duration: 5000, position: "top-center" });
      }
    }
    poll();
    const id = setInterval(poll, 30000);
    return () => { cancelled = true; clearInterval(id); };
  }, [navigate]);

  // Realtime: show a slide-down banner immediately when a new
  // instructor_notifications row is inserted for this user.
  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`home-notif-banner-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "instructor_notifications",
          filter: `instructor_id=eq.${userId}`,
        },
        (payload: any) => {
          const n = payload.new || {};
          setToastNotif({
            id: String(n.id ?? Date.now()),
            title: n.title || "New notification",
            body: n.body || "",
            type: (n.type || "default") as string,
          });
          setToastVisible(true);
          setNotifCount((c) => c + 1);
        },
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userId]);

  // Auto-dismiss the banner after 5s.
  useEffect(() => {
    if (!toastVisible) return;
    const t = setTimeout(() => setToastVisible(false), 5000);
    return () => clearTimeout(t);
  }, [toastVisible, toastNotif?.id]);

  const notifBanner = (() => {
    const type = toastNotif?.type || "default";
    const map: Record<string, { bg: string; Icon: any; route: string }> = {
      booking: { bg: "#1877D6", Icon: BookOpen, route: "/bookings" },
      course_booking: { bg: "#1877D6", Icon: BookOpen, route: "/bookings" },
      payment: { bg: "#16A34A", Icon: PoundSterling, route: "/payments" },
      message: { bg: "#00B5A5", Icon: MessageSquare, route: "/messages" },
      rewards: { bg: "#D97706", Icon: Trophy, route: "/rewards" },
      pupil_reply: { bg: "#00B5A5", Icon: MessageSquare, route: "/messages" },
      chat_message: { bg: "#7C3AED", Icon: IconMessageCircle, route: "/community" },

      gap_accepted: { bg: "#1E8E3E", Icon: Zap, route: "/gaps" },
      gap_message_sent: { bg: "#1877D6", Icon: Send, route: "/gaps" },
      default: { bg: "#CC2229", Icon: Bell, route: "/notifications" },
    };
    const cfg = map[type] ?? map.default;
    const Icon = cfg.Icon;
    return (
      <div
        role="alert"
        onClick={() => {
          setToastVisible(false);
          navigate({ to: cfg.route });
        }}
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 999,
          background: "#0B1F3A",
          padding: "12px 16px calc(12px) 16px",
          paddingTop: "calc(12px + env(safe-area-inset-top, 0px))",
          transform: toastVisible ? "translateY(0)" : "translateY(-110%)",
          transition: "transform 0.3s ease",
          display: "flex",
          alignItems: "center",
          gap: 12,
          cursor: "pointer",
          boxShadow: "0 8px 24px rgba(0,0,0,0.25)",
          fontFamily: "Inter, sans-serif",
          pointerEvents: toastVisible ? "auto" : "none",
        }}
      >
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: "50%",
            background: cfg.bg,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <Icon size={18} color="#FFFFFF" />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ color: "#FFFFFF", fontWeight: 600, fontSize: 13, lineHeight: 1.3 }}>
            {toastNotif?.title ?? ""}
          </div>
          {toastNotif?.body && (
            <div
              style={{
                color: "rgba(255,255,255,0.7)",
                fontSize: 12,
                marginTop: 2,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {toastNotif.body}
            </div>
          )}
        </div>
        <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 11, flexShrink: 0 }}>Just now</div>
        <button
          type="button"
          aria-label="Dismiss notification"
          onClick={(e) => { e.stopPropagation(); setToastVisible(false); }}
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
          <X size={16} color="rgba(255,255,255,0.6)" />
        </button>
      </div>
    );
  })();

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
  const setHeroExpandedWithEvent = (next: boolean | ((prev: boolean) => boolean)) => {
    setHeroExpanded((prev) => {
      const value = typeof next === "function" ? (next as (prev: boolean) => boolean)(prev) : next;
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event(value ? "dsm-sheet-open" : "dsm-sheet-close"));
      }
      return value;
    });
  };
  const [prevLesson, setPrevLesson] = useState<PrevLessonRow | null>(null);
  const [goingActive, setGoingActive] = useState(false);
  const [lateOpen, setLateOpen] = useState(false);



  // AT A GLANCE state
  const [glancePupilCount, setGlancePupilCount] = useState(0);
  const [glanceCompletedLessons, setGlanceCompletedLessons] = useState(0);
  const [glancePaymentsCount, setGlancePaymentsCount] = useState(0);
  const [glancePaymentsTotal, setGlancePaymentsTotal] = useState(0);
  const [glanceExpensesTotal, setGlanceExpensesTotal] = useState(0);
  const [glanceMtdEnrolled, setGlanceMtdEnrolled] = useState<boolean | null>(null);
  const [weeklyLessonGoal, setWeeklyLessonGoal] = useState<number>(DEFAULT_WEEKLY_LESSON_GOAL);
  const [weeklyEarningsGoal, setWeeklyEarningsGoal] = useState<number>(DEFAULT_WEEKLY_EARNINGS_GOAL);
  const [glancePoints, setGlancePoints] = useState<number>(0);

  useEffect(() => {
    if (!userId) return;
    (async () => {
      const taxYearStart = new Date(
        new Date().getMonth() >= 3 ? new Date().getFullYear() : new Date().getFullYear() - 1,
        3,
        6,
      );
      const currentYear = new Date().getFullYear();
      const [lessonsRes, paymentsRes, expensesRes, mtdRes, pointsRes] = await Promise.all([
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
        supabase
          .from("instructor_points")
          .select("total_points")
          .eq("instructor_id", userId)
          .eq("season_year", currentYear)
          .maybeSingle(),
      ]);
      setGlanceCompletedLessons(lessonsRes.count ?? 0);
      const pays = paymentsRes.data ?? [];
      setGlancePaymentsCount(pays.length);
      setGlancePaymentsTotal(pays.reduce((s, p: any) => s + Number(p.amount ?? 0), 0));
      setGlanceExpensesTotal(
        (expensesRes.data ?? []).reduce((s, e: any) => s + Number(e.amount ?? 0), 0),
      );
      setGlanceMtdEnrolled(mtdRes.data ? Boolean((mtdRes.data as any).enrolled) : false);
      const pointsRow = (pointsRes as any)?.data ?? null;
      setGlancePoints(Number(pointsRow?.total_points ?? 0));
    })();
  }, [userId]);

  const glanceTierKey = tierFromPoints(glancePoints);
  const glanceTier = glanceTierKey.charAt(0).toUpperCase() + glanceTierKey.slice(1);
  const glanceTierColor = TIER_COLORS[glanceTierKey];
  const glanceNetProfit = Math.max(0, glancePaymentsTotal - glanceExpensesTotal);
  // UK Self-Employed estimate for 2024/25 tax year — Income Tax + Class 4 NI.
  // Personal allowance £12,570; basic-rate band up to £50,270 (20% tax, 9% NI);
  // above £50,270 (40% tax, 2% NI). Rough guide only — does not include Class 2
  // NI, PA taper (>£100k), higher/additional-rate band, Scottish rates, or
  // dividend/other income.
  const glanceTaxAndNi = (() => {
    const profit = glanceNetProfit;
    const PA = 12570;
    const BASIC_TOP = 50270;
    const basicSlice = Math.max(0, Math.min(profit, BASIC_TOP) - PA);
    const higherSlice = Math.max(0, profit - BASIC_TOP);
    const incomeTax = basicSlice * 0.2 + higherSlice * 0.4;
    const class4Ni = basicSlice * 0.09 + higherSlice * 0.02;
    return Math.max(0, incomeTax + class4Ni);
  })();
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
    let cancelled = false;
    (async () => {
      const authResult = await Promise.race([
        supabase.auth
          .getSession()
          .then(({ data, error }: any) => ({
            timedOut: false,
            user: data.session?.user ?? null,
            error,
          }))
          .catch((error: unknown) => ({ timedOut: false, user: null, error })),
        new Promise<{ timedOut: true; user: null; error: null }>((resolve) => {
          setTimeout(() => resolve({ timedOut: true, user: null, error: null }), 3500);
        }),
      ]);
      if (cancelled) return;
      if (authResult.timedOut) {
        console.warn("[home] auth session lookup timed out; showing dashboard shell");
        setAuthChecked(true);
        return;
      }
      if (authResult.error) console.error("[home] auth.getSession error", authResult.error);
      const u = authResult.user;
      if (!u) {
        console.warn("[home] no authenticated user");
        setAuthChecked(true);
        return;
      }
      setUserId(u.id);

      const { data: instructor, error: instErr } = await supabase
        .from("instructors")
        .select("name, profile_image_url, weekly_lesson_goal, weekly_earnings_goal, lesson_buffer_after")
        .eq("id", u.id)
        .maybeSingle();
      if (instErr) console.error("[home] instructors fetch error", instErr);
      if (!instructor) {
        console.log("[home] no instructor found, checking admin for:", u.id);
        const { data: adminRows, error: adminErr } = await supabase
          .from("admin_users")
          .select("role")
          .eq("user_id", u.id)
          .limit(1);
        const adminRow = adminRows?.[0] ?? null;
        console.log("[home] admin check result:", adminRow, "error:", adminErr);
        if (adminRow) {
          console.log("[home] admin confirmed, navigating to /admin");
          setAuthChecked(true);
          navigate({ to: "/admin" });
          return;
        }
        console.log("[home] not admin, going to onboarding");
        console.warn("[home] no instructor row for user, redirecting to onboarding", u.id);
        setAuthChecked(true);
        navigate({ to: "/onboarding", replace: true });
        return;
      }
      const fullName =
        (instructor?.name as string | undefined) ??
        u.email?.split("@")[0] ??
        "there";
      const first = fullName.trim().split(/\s+/)[0] || "there";
      setFirstName(capitalize(first));
      setInstructorFullName(fullName);
      setAvatarUrl((instructor?.profile_image_url as string | undefined) ?? null);
      const wlGoal = Number((instructor as any)?.weekly_lesson_goal);
      const weGoal = Number((instructor as any)?.weekly_earnings_goal);
      if (Number.isFinite(wlGoal) && wlGoal > 0) setWeeklyLessonGoal(wlGoal);
      if (Number.isFinite(weGoal) && weGoal > 0) setWeeklyEarningsGoal(weGoal);
      const iba = Number((instructor as any)?.lesson_buffer_after);
      if (Number.isFinite(iba)) setInstructorBufferAfter(iba);
      setAuthChecked(true);
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!userId) return;
    (async () => {
      const [pupilsRes, availRes] = await Promise.all([
        supabase
          .from("pupils")
          .select("id,name,first_name,last_name,phone,postcode,calendar_colour,custom_rate,custom_rate_90,custom_rate_120")
          .eq("instructor_id", userId)
          .eq("status", "active")
          .is("deleted_at", null),
        supabase
          .from("pupil_ready_to_learn_settings")
          .select("*")
          .eq("instructor_id", userId),
      ]);
      if (pupilsRes.error) console.error("[home] pupils query failed:", pupilsRes.error);
      if (availRes.error) console.error("[home] availability query failed:", availRes.error);
      setAllPupils((pupilsRes.data ?? []) as PreviewPupil[]);
      setAllAvailability((availRes.data ?? []) as PupilReadySetting[]);
    })();
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    (async () => {
      const todayYmd = ymd(todayStart);
      const yesterdayYmd = ymd(addDays(todayStart, -1));
      const in60Ymd = ymd(addDays(todayStart, 60));
      const weekStartYmd = ymd(weekStart);
      const weekEndYmd = ymd(weekEnd);

      // ============================================================
      // SINGLE LESSONS FETCH — 60-day window, all statuses.
      // Every lesson-derived panel (Today, Tomorrow, Next-tab, Week
      // count, Week breakdown modal, Week earnings) is derived from
      // `allLessons` in-memory below. The only separate lessons reads
      // are: (a) unbounded "nextLesson" hero, (b) all-time unpaid
      // totals, (c) lifetime completed-count in the money glance,
      // (d) hero-expanded prev-lesson lookup — each has a different
      // predicate that can't be derived from this window.
      // ============================================================
      const { data: allLessonsRaw, error: lessonsErr } = await supabase
        .from("lessons")
        .select(
          "id, lesson_date, lesson_time, duration_minutes, status, pupil_id, notes, payment_status, paid_amount, eol_completed, amount_due, pickup_location, pupils(name, first_name, phone, postcode, address, prepaid_hours, profile_image_url, photo_url, deleted_at, custom_rate, custom_rate_90, custom_rate_120)"
        )
        .eq("instructor_id", userId)
        .is("deleted_at", null)
        .gte("lesson_date", yesterdayYmd)
        .lte("lesson_date", in60Ymd)
        .order("lesson_date", { ascending: true })
        .order("lesson_time", { ascending: true });
      if (lessonsErr) console.error("[home] lessons fetch error", lessonsErr);

      console.log(
        "[home] raw lessons dates:",
        allLessonsRaw?.map((l: any) => l.lesson_date + " " + l.status),
      );

      // Drop rows whose pupil is soft-deleted (matches previous
      // `pupils!inner` + `pupils.deleted_at IS NULL` behaviour).
      const allLessons = (allLessonsRaw ?? []).filter(
        (l: any) => !l.pupils || l.pupils.deleted_at == null,
      );

      // Today timeline shows every lesson for today regardless of status.
      const todayLessons = allLessons.filter((l: any) => l.lesson_date === todayYmd);

      // Upcoming active lessons (used by legacy panels expecting scheduled lessons).
      const upcomingLessons = allLessons.filter(
        (l: any) =>
          l.lesson_date >= todayYmd &&
          ["confirmed", "pending", "in_progress"].includes(l.status),
      );

      // `lessons` state keeps its previous behaviour for panels that expect
      // active/scheduled lessons (not cancelled).
      const activeLessons = allLessons.filter(
        (l: any) => !["cancelled"].includes(l.status),
      );
      setAllLessons(allLessons);
      setLessons(activeLessons as unknown as LessonRow[]);

      // ---- Next lesson (unbounded — may be beyond the 60-day window) ----
      const { data: nextRows, error: nextErr } = await supabase
        .from("lessons")
        .select(
          "id, lesson_date, lesson_time, duration_minutes, status, pupil_id, notes, payment_status, paid_amount, eol_completed, amount_due, pickup_location, pupils!inner(name, first_name, phone, postcode, address, prepaid_hours, pricing_type, block_hours_total, deleted_at)"
        )
        .eq("instructor_id", userId)
        .is("deleted_at", null)
        .is("pupils.deleted_at", null)
        .neq("status", "cancelled")
        .neq("status", "completed")
        .gte("lesson_date", todayYmd)
        .order("lesson_date", { ascending: true })
        .order("lesson_time", { ascending: true })
        .limit(5);
      if (nextErr) console.error("[home] next lesson fetch error", nextErr);
      const nowTime = londonTimeString();
      const validNext = (nextRows ?? []).find((l) => {
        if (l.lesson_date > todayYmd) return true;
        const lt = (l.lesson_time ?? "00:00:00").slice(0, 8);
        const lessonTime = lt.length === 5 ? `${lt}:00` : lt;
        return lessonTime > nowTime;
      });
      setNextLesson((validNext ?? null) as unknown as LessonRow | null);

      // ---- Unpaid lessons (all time, exclude cancelled) ----
      const { data: unpaidLessons } = await supabase
        .from("lessons")
        .select("pupil_id, amount_due")
        .eq("instructor_id", userId)
        .eq("payment_status", "unpaid")
        .neq("status", "cancelled")
        .gt("amount_due", 0)
        .is("deleted_at", null);

      // ---- Single pupils fetch (P1 + P4 + P5 consolidated) ----
      const { data: pupilsData } = await supabase
        .from("pupils")
        .select(
          "id, name, first_name, last_name, phone, email, prepaid_hours, ni_amount_total, ni_amount_paid, status, deleted_at, buffer_before_minutes, buffer_after_minutes, profile_image_url, photo_url, calendar_colour"
        )
        .eq("instructor_id", userId);
      setActivePupilsCount(
        (pupilsData || []).filter(isCurrentPupil).length,
      );
      setGlancePupilCount(
        (pupilsData || []).filter((p: any) => p.deleted_at == null).length,
      );
      setAllPupilsList(
        (pupilsData || [])
          .filter((p: any) => p.deleted_at == null)
          .map((p: any) => ({
            id: p.id,
            name: p.name ?? '',
            first_name: p.first_name ?? null,
            status: normalizePupilStatus(p.status),
            profile_image_url: p.profile_image_url ?? p.photo_url ?? null,

            calendar_colour: p.calendar_colour ?? null,
            last_lesson_date: null,
            phone: p.phone ?? null,
          })),
      );


      const pupilMap: Record<string, any> = {};
      (pupilsData || []).forEach((p: any) => { pupilMap[p.id] = p; });
      const bufMap: Record<string, { before: number | null; after: number | null }> = {};
      const infoMap: Record<string, { first_name: string | null; name: string | null; profile_image_url: string | null; calendar_colour: string | null; last_lesson_date: string | null }> = {};
      (pupilsData || []).forEach((p: any) => {
        bufMap[p.id] = {
          before: p.buffer_before_minutes ?? null,
          after: p.buffer_after_minutes ?? null,
        };
        if (isCurrentPupil(p)) {
          infoMap[p.id] = {
            first_name: p.first_name ?? null,
            name: p.name ?? null,
            profile_image_url: p.profile_image_url ?? p.photo_url ?? null,
            calendar_colour: p.calendar_colour ?? null,
            last_lesson_date: null,
          };
        }
      });
      setPupilBufferMap(bufMap);
      setPupilInfoMap(infoMap);

      // Availability for gap-matching on today's timeline
      const { data: availData } = await supabase
        .from("pupil_ready_to_learn_settings")
        .select("pupil_id, available_days, available_from, available_until, min_notice_hours, short_notice_opt_in")
        .eq("instructor_id", userId);
      const availMap: Record<string, { available_days: string[] | null; available_from: string | null; available_until: string | null; min_notice_hours: number | null; short_notice_opt_in: boolean | null }> = {};
      (availData || []).forEach((a: any) => {
        if (a.pupil_id) availMap[a.pupil_id] = {
          available_days: a.available_days ?? null,
          available_from: a.available_from ?? null,
          available_until: a.available_until ?? null,
          min_notice_hours: a.min_notice_hours ?? null,
          short_notice_opt_in: a.short_notice_opt_in ?? null,
        };
      });
      setPupilAvailMap(availMap);
      const prepaidPupilIds = new Set<string>(
        (pupilsData || [])
          .filter((p: any) => Number(p.prepaid_hours || 0) > 0)
          .map((p: any) => p.id as string)
      );

      // Group regular unpaid lessons by pupil
      const lessonOwedByPupil: Record<string, number> = {};
      (unpaidLessons || []).forEach((l: any) => {
        if (prepaidPupilIds.has(l.pupil_id)) return;
        lessonOwedByPupil[l.pupil_id] =
          (lessonOwedByPupil[l.pupil_id] || 0) + Number(l.amount_due || 0);
      });

      const outstandingAmt = Object.values(lessonOwedByPupil)
        .reduce((s: number, v: number) => s + v, 0);

      const niPupilsRows = (pupilsData || []).filter(
        (p: any) => Number(p.prepaid_hours || 0) > 0 && p.ni_amount_total != null
      );

      const niOwedByPupil: Record<string, number> = {};
      niPupilsRows.forEach((p: any) => {
        const owed = Number(p.ni_amount_total || 0) - Number(p.ni_amount_paid || 0);
        if (owed > 0) niOwedByPupil[p.id] = owed;
      });

      const niOutstanding = Object.values(niOwedByPupil).reduce(
        (s: number, v: number) => s + v,
        0
      );

      // Build breakdown rows
      const breakdown: Array<{
        pupilId: string;
        name: string;
        firstName: string;
        phone: string | null;
        email: string | null;
        amount: number;
        type: "Lessons" | "NI Course";
      }> = [];
      const rowFor = (id: string, amount: number, type: "Lessons" | "NI Course") => {
        const p = pupilMap[id];
        if (!p) return;
        const name =
          (p.name as string) ||
          [p.first_name, p.last_name].filter(Boolean).join(" ") ||
          "Pupil";
        const firstName = (p.first_name as string) || name.split(/\s+/)[0] || "there";
        breakdown.push({
          pupilId: id,
          name,
          firstName,
          phone: p.phone ?? null,
          email: p.email ?? null,
          amount,
          type,
        });
      };
      Object.entries(lessonOwedByPupil).forEach(([id, amt]) => rowFor(id, amt as number, "Lessons"));
      Object.entries(niOwedByPupil).forEach(([id, amt]) => rowFor(id, amt as number, "NI Course"));
      breakdown.sort((a, b) => b.amount - a.amount);

      setOutstandingBreakdown(breakdown);
      setOutstanding(outstandingAmt + niOutstanding);

      // ============================================================
      // WEEK EARNINGS — committed revenue for the current week.
      // Sum of `amount_due` for lessons in the Monday-start week
      // whose status is 'completed' or 'confirmed' (and not soft-
      // deleted). We deliberately do NOT filter by payment_status:
      // a confirmed lesson is committed revenue whether or not
      // cash has been received. `amount_due` is the single source
      // of truth (paid_amount is unreliable in historic data).
      // ============================================================
      const nowMs = Date.now();
      const weekLessonRowsForEarnings = allLessons.filter(
        (l: any) =>
          l.lesson_date >= weekStartYmd &&
          l.lesson_date < weekEndYmd &&
          (l.status === "completed" || l.status === "confirmed"),
      );

      const wk = weekLessonRowsForEarnings.reduce(
        (s: number, l: any) => s + Number(l.amount_due ?? 0),
        0,
      );

      // Today earnings + breakdown modal rows keep their existing
      // "delivered lessons" shape so the modal shows the same list
      // it always has — only the headline weekEarnings changes.
      const weekLessonRowsForList = allLessons.filter(
        (l: any) =>
          l.status !== "cancelled" &&
          l.lesson_date >= weekStartYmd &&
          l.lesson_date < weekEndYmd,
      );

      // Source 2: Course booking deposits from public site
      const { data: bookingRows } = await supabase
        .from("course_bookings")
        .select("id, amount_paid, booked_at, pupil_name, payment_method")
        .eq("instructor_id", userId)
        .eq("status", "confirmed")
        .gte("booked_at", weekStart.toISOString())
        .lt("booked_at", weekEnd.toISOString());

      let td = 0;
      const earningsList: Array<{ id: string; date: string; pupilName: string; amount: number; method: string; source: "lesson" | "booking" | "lesson-earned" }> = [];
      const todayYmdStr = ymd(todayStart);
      (weekLessonRowsForList ?? []).forEach((l: any) => {
        const dur = Number(l.duration_minutes) || 60;
        const endMs = new Date(`${l.lesson_date}T${(l.lesson_time || "00:00:00").slice(0, 8)}`).getTime() + dur * 60_000;
        const delivered = l.status === "completed" || endMs <= nowMs;
        if (!delivered) return;
        const p = l.pupils ?? {};
        let amt = 0;
        if (dur === 90 && Number(p.custom_rate_90) > 0) amt = Number(p.custom_rate_90);
        else if (dur === 120 && Number(p.custom_rate_120) > 0) amt = Number(p.custom_rate_120);
        else if (Number(p.custom_rate) > 0) amt = Math.round(Number(p.custom_rate) * (dur / 60) * 100) / 100;
        else amt = Number(l.amount_due ?? 0);
        if (amt <= 0) return;
        if (l.lesson_date === todayYmdStr) td += amt;
        const iso = new Date(`${l.lesson_date}T${(l.lesson_time || "00:00:00").slice(0, 8)}`).toISOString();
        const method = l.payment_status === "paid" ? "Paid" : "Prepaid";
        earningsList.push({
          id: String(l.id),
          date: iso,
          pupilName: p.name ?? "Pupil",
          amount: amt,
          method,
          source: "lesson-earned",
        });
      });
      (bookingRows ?? []).forEach((p: any) => {
        const amt = Number(p.amount_paid ?? 0);
        if (new Date(p.booked_at) >= todayStart) td += amt;
        earningsList.push({
          id: String(p.id),
          date: p.booked_at,
          pupilName: p.pupil_name ?? "Course booking",
          amount: amt,
          method: p.payment_method ?? "Booking",
          source: "booking",
        });
      });
      earningsList.sort((a, b) => (a.date < b.date ? 1 : -1));
      setEarningsRows(earningsList);

      setEarningsEstimated(false);

      setWeekEarnings(wk);
      setTodayEarnings(td);
      setWeekLessonCount(weekLessonRowsForEarnings.length);


      // Full week lesson list for the breakdown modal (all statuses,
      // derived from the single fetch above).
      const weekLessonData = allLessons.filter(
        (l: any) =>
          l.lesson_date >= weekStartYmd && l.lesson_date < weekEndYmd,
      );
      setWeekLessonRows(
        weekLessonData.map((l: any) => ({
          id: l.id,
          lesson_date: l.lesson_date,
          lesson_time: l.lesson_time,
          duration_minutes: l.duration_minutes,
          status: l.status,
          pupil_id: l.pupil_id,
          pupilName: l.pupils?.first_name ?? l.pupils?.name ?? "Pupil",
        })),
      );

      const { data: instrData } = await supabase
        .from("instructors")
        .select("working_hours_start, working_hours_end, working_days, per_day_hours, lesson_buffer_after, lunch_break_start, lunch_break_end, hourly_rate")
        .eq("id", userId)
        .maybeSingle();
      if (instrData) {
        const dayKeyToName: Record<string, string> = {
          sun: "Sunday", mon: "Monday", tue: "Tuesday", wed: "Wednesday",
          thu: "Thursday", fri: "Friday", sat: "Saturday",
        };
        const workingDaysArr = (instrData.working_days as string[] | null) ?? ["Monday","Tuesday","Wednesday","Thursday","Friday"];
        const perDay = (instrData.per_day_hours as Record<string, { start?: string; end?: string; active?: boolean }> | null) ?? null;
        const globalStart = instrData.working_hours_start ? String(instrData.working_hours_start).slice(0, 5) : "09:00";
        const globalEnd = instrData.working_hours_end ? String(instrData.working_hours_end).slice(0, 5) : "18:00";

        const dayKeys = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;
        const todayKey = dayKeys[todayStart.getDay()];
        const todayName = dayKeyToName[todayKey];
        const todayCfg = perDay?.[todayName];
        const todayActive = todayCfg ? todayCfg.active === true : workingDaysArr.includes(todayName);
        const todayEnd = todayCfg?.end || globalEnd;
        setTodayEndTime(todayActive ? todayEnd : null);

        // Build a legacy-shaped compat object so existing consumers keep working.
        const compat: Record<string, unknown> = {
          start_time: globalStart,
          end_time: globalEnd,
          per_day_hours: perDay,
          working_days: workingDaysArr,
        };
        for (const k of dayKeys) {
          const name = dayKeyToName[k];
          const cfg = perDay?.[name];
          compat[k] = cfg ? cfg.active === true : workingDaysArr.includes(name);
        }
        setWorkingHours(compat);
      } else {
        setTodayEndTime(null);
        setWorkingHours(null);
      }
      setLoading(false);
    })();
  }, [userId, todayStart, weekStart, weekEnd, reloadKey]);

  // New message anywhere in the app (pupil / local chat / admin thread)
  // -> refresh home so unread badges and previews stay in sync.
  useEffect(() => {
    const handler = () => setReloadKey((k) => k + 1);
    window.addEventListener("dsm-message-received", handler);
    return () => window.removeEventListener("dsm-message-received", handler);
  }, []);


  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    const channelName = `payment-updates-home-${userId}`;
    console.log('[realtime] home subscribing:', channelName);
    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'lessons',
        filter: `instructor_id=eq.${userId}`,
      }, () => {
        if (cancelled) return;
        console.log('[realtime] lessons changed, refetching home payments...');
        setReloadKey((k) => k + 1);
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'lesson_history',
        filter: `instructor_id=eq.${userId}`,
      }, () => {
        if (cancelled) return;
        console.log('[realtime] lesson_history changed, refetching home payments...');
        setReloadKey((k) => k + 1);
      })
      .subscribe((status, err) => {
        console.log('[realtime] home channel status:', status, err ?? '');
      });
    return () => {
      cancelled = true;
      console.log('[realtime] home unsubscribing:', channelName);
      try {
        supabase.removeChannel(channel);
      } catch (e) {
        console.warn('[realtime] home removeChannel failed:', e);
      }
    };
  }, [userId]);

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


  const upcoming = nextLesson ?? lessons.find((l) => lessonDateTime(l) >= now && l.status !== "cancelled") ?? null;

  // Fetch instructor auto-track preference
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("instructor_reminder_preferences")
        .select("auto_track_lessons")
        .eq("instructor_id", userId)
        .maybeSingle();
      if (cancelled) return;
      if (error) {
        console.warn("[home] auto_track_lessons fetch failed", error);
        return;
      }
      if (data && typeof data.auto_track_lessons === "boolean") {
        setAutoTrackLessons(data.auto_track_lessons);
      }
    })();
    return () => { cancelled = true; };
  }, [userId]);

  // In-progress lesson (now is between start and start+duration)
  const currentLesson = useMemo(() => {
    const nowMs = now.getTime();
    return lessons.find((l) => {
      if (l.status === "cancelled") return false;
      const start = lessonDateTime(l).getTime();
      const dur = (l.duration_minutes ?? 60) * 60000;
      return nowMs >= start && nowMs < start + dur;
    }) ?? null;
  }, [lessons, now]);

  // Auto-navigate to live tracking once per in-progress lesson when autoTrackLessons is enabled
  const autoNavigatedLessonId = useRef<string | null>(null);
  useEffect(() => {
    if (!autoTrackLessons || !currentLesson) return;
    if (autoNavigatedLessonId.current === currentLesson.id) return;
    autoNavigatedLessonId.current = currentLesson.id;
    navigate({
      to: '/live',
      search: { autostart: '1', lessonId: currentLesson.id, pupilId: currentLesson.pupil_id },
    });
  }, [autoTrackLessons, currentLesson, navigate]);

  // ── Next Lesson traffic + weather chips ───────────────────────────────────
  const fetchWeather = useServerFn(getLessonWeather);
  const fetchDriveTime = useServerFn(getLessonDriveTime);
  const [weatherData, setWeatherData] = useState<LessonWeather>(null);
  const [driveData, setDriveData] = useState<LessonDriveTime>(null);
  const [instructorLocation, setInstructorLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [driveLoading, setDriveLoading] = useState(false);
  // client-side dedupe: keyed by lesson id, expires after 5 min
  const chipCacheRef = useRef<Record<string, { weather: LessonWeather; drive: LessonDriveTime; expires: number }>>({});

  useEffect(() => {
    console.log("[home] chip-effect fired. upcoming.id:", upcoming?.id, "pupil:", upcoming?.pupils?.name, "postcode:", upcoming?.pupils?.postcode, "address:", upcoming?.pupils?.address, "pickup:", upcoming?.pickup_location);
    if (!upcoming?.id) {
      setWeatherData(null);
      setDriveData(null);
      setInstructorLocation(null);
      return;
    }
    const destination = [upcoming.pickup_location, upcoming.pupils?.address, upcoming.pupils?.postcode]
      .filter(Boolean)
      .join(", ");
    const postcode = upcoming.pupils?.postcode ?? null;
    if (!destination && !postcode) {
      console.warn("[home] no destination or postcode on upcoming lesson — skipping weather/drive fetch");
      return;
    }

    const cacheKey = upcoming.id;
    const cached = chipCacheRef.current[cacheKey];
    const nowMs = Date.now();
    const cachedHasRequiredData = Boolean(cached?.weather || !postcode) && Boolean(cached?.drive || !destination);
    if (cached && cached.expires > nowMs && cachedHasRequiredData) {
      setWeatherData(cached.weather);
      setDriveData(cached.drive);
      return;
    }

    let cancelled = false;

    // Weather — kick off immediately (no geolocation needed).
    setWeatherLoading(true);
    console.log("[home] fetching weather for", postcode ?? destination);
    fetchWeather({ data: { postcode: postcode ?? destination } })
      .then((w) => {
        console.log("[home] weather result:", w);
        if (!cancelled) setWeatherData(w);
      })
      .catch((err) => {
        console.error("[home] weather fetch failed:", err);
        if (!cancelled) setWeatherData(null);
      })
      .finally(() => { if (!cancelled) setWeatherLoading(false); });

    // Drive time — try geolocation first, fall back to instructor home postcode.
    const fallbackToHomePostcode = () => {
      if (cancelled) return;
      if (!destination) { setDriveData(null); setDriveLoading(false); return; }
      if (!instructorHomePostcode) {
        console.warn("[home] no geolocation and no home_postcode — skipping drive-time fetch");
        setDriveData(null);
        setDriveLoading(false);
        return;
      }
      console.log("[home] fetching drive time via home postcode", instructorHomePostcode, "to", destination);
      fetchDriveTime({
        data: { originPostcode: instructorHomePostcode, destination },
      })
        .then((d) => {
          console.log("[home] drive time result (postcode fallback):", d);
          if (!cancelled) setDriveData(d);
        })
        .catch((err) => {
          console.error("[home] drive time fetch failed (postcode fallback):", err);
          if (!cancelled) setDriveData(null);
        })
        .finally(() => { if (!cancelled) setDriveLoading(false); });
    };

    if (destination) {
      setDriveLoading(true);
      if (typeof navigator !== "undefined" && navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            if (cancelled) return;
            setInstructorLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
            console.log("[home] fetching drive time from", pos.coords.latitude, pos.coords.longitude, "to", destination);
            fetchDriveTime({
              data: {
                originLat: pos.coords.latitude,
                originLon: pos.coords.longitude,
                destination,
              },
            })
              .then((d) => {
                console.log("[home] drive time result:", d);
                if (!cancelled) setDriveData(d);
              })
              .catch((err) => {
                console.error("[home] drive time fetch failed:", err);
                if (!cancelled) setDriveData(null);
              })
              .finally(() => { if (!cancelled) setDriveLoading(false); });
          },
          (err) => {
            console.warn("[home] geolocation unavailable, falling back to home postcode:", err?.code, err?.message);
            fallbackToHomePostcode();
          },
          { enableHighAccuracy: false, timeout: 4000, maximumAge: 60000 },
        );
      } else {
        fallbackToHomePostcode();
      }
    } else {
      setDriveData(null);
    }

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [upcoming?.id, instructorHomePostcode]);

  // Cache the resolved pair whenever both settle
  useEffect(() => {
    if (!upcoming?.id) return;
    if (weatherLoading || driveLoading) return;
    const destination = [upcoming.pickup_location, upcoming.pupils?.address, upcoming.pupils?.postcode]
      .filter(Boolean)
      .join(", ");
    const postcode = upcoming.pupils?.postcode ?? null;
    const hasRequiredData = Boolean(weatherData || !postcode) && Boolean(driveData || !destination);
    if (!hasRequiredData) return;
    chipCacheRef.current[upcoming.id] = {
      weather: weatherData,
      drive: driveData,
      expires: Date.now() + 5 * 60 * 1000,
    };
  }, [upcoming?.id, weatherData, driveData, weatherLoading, driveLoading]);



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

  const [calendarBlocks, setCalendarBlocks] = useState<Array<{ id: string; start_datetime: string; end_datetime: string; title: string | null }>>([]);

  const todayISO = ymd(todayStart);
  const tomorrowISO = ymd(tomorrowStart);
  const tomorrowFormatted = formatDayLabel(tomorrowStart);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;

    const fetchCalendarBlocks = async () => {
      const { data, error } = await supabase
        .from("calendar_blocks")
        .select("id, start_datetime, end_datetime, title")
        .eq("instructor_id", userId)
        .eq("source", "external_calendar")
        .gte("start_datetime", todayISO)
        .lte("start_datetime", `${tomorrowISO}T23:59:59`);
      if (cancelled) return;
      if (error) {
        console.warn("[home] calendar_blocks fetch failed", error);
        return;
      }
      setCalendarBlocks((data as any[]) ?? []);
    };

    fetchCalendarBlocks();

    const handleCalendarSynced = () => {
      console.log("[home] calendar-synced event received; refetching calendar_blocks");
      fetchCalendarBlocks();
    };
    window.addEventListener('calendar-synced', handleCalendarSynced);

    return () => {
      cancelled = true;
      window.removeEventListener('calendar-synced', handleCalendarSynced);
    };
  }, [userId, todayISO, tomorrowISO]);

  // Today timeline shows every lesson for today regardless of status
  // (completed, confirmed, in_progress, cancelled, no_show, pending).
  const todayLessons = allLessons?.filter((l: any) => l.lesson_date === todayISO) || [];

  // Tomorrow timeline: include every lesson for tomorrow regardless of status
  // (except soft-deleted). Match against the ISO date string so we avoid
  // host-timezone drift between lessonDateTime() and tomorrowStart.
  const tomorrowLessons = (allLessons ?? []).filter(
    (l: any) => l.lesson_date === tomorrowISO && l.deleted_at == null,
  ) as unknown as LessonRow[];
  const nextLessons = lessons.filter((l) => lessonDateTime(l) >= now && l.status !== "cancelled");
  const nextTabLessons = nextLessons.slice(0, 5);

  const weekLessons = lessons.filter((l) => {
    const d = lessonDateTime(l);
    return d >= weekStart && d < weekEnd;
  });
  const weekLessonsTotal = Math.max(weekLessonCount, weekLessons.length);

  console.log("[home] SINGLE FETCH lessons (active):", lessons?.length);
  console.log("[home] todayLessons derived:", todayLessons?.length);
  console.log("[home] tomorrowLessons derived:", tomorrowLessons?.length);
  console.log("[home] weekEarnings derived:", weekEarnings);
  console.log("[home] outstanding derived:", outstanding);
  console.log("[home] todayISO:", todayISO);
  console.log("[home] tomorrowISO:", tomorrowISO);
  console.log(
    "[home] tomorrowLessons:",
    tomorrowLessons?.length,
    tomorrowLessons?.map((l: any) => l.lesson_date + " " + l.lesson_time + " " + l.status),
  );
  console.log(
    "[home] allLessons sample dates:",
    allLessons?.slice(0, 10).map((l: any) => l.lesson_date + " " + l.status),
  );

  const tabLessons =
    tab === "today" ? todayLessons : tab === "tomorrow" ? tomorrowLessons : nextTabLessons;

  // Imported Google events that are really DSM lessons pushed out to Google are
  // dropped here so they don't render (or block gaps) twice.
  const visibleCalendarBlocks = filterEchoedBlocks(
    (calendarBlocks || []).map((b) => ({ ...b, source: "external_calendar" })),
    (allLessons || []) as Array<{ lesson_date: string; lesson_time: string }>,
  );

  // Convert calendar blocks for a given date to sorted [startMins, endMins] intervals.
  // Parses UTC timestamps into LOCAL date/time so BST/GMT boundaries don't misclassify blocks.
  const blocksForDate = (dateStr: string) =>
    (visibleCalendarBlocks || [])
      .map((b) => {
        const sd = new Date(b.start_datetime);
        const ed = new Date(b.end_datetime);
        if (isNaN(sd.getTime()) || isNaN(ed.getTime())) return null;
        const localDateStr = `${sd.getFullYear()}-${String(sd.getMonth() + 1).padStart(2, '0')}-${String(sd.getDate()).padStart(2, '0')}`;
        const localStartTime = `${String(sd.getHours()).padStart(2, '0')}:${String(sd.getMinutes()).padStart(2, '0')}`;
        const localEndTime = `${String(ed.getHours()).padStart(2, '0')}:${String(ed.getMinutes()).padStart(2, '0')}`;
        const durationMins = Math.max(0, Math.round((ed.getTime() - sd.getTime()) / 60000));
        const startsAtBoundary = localStartTime === '00:00' || localStartTime === '01:00';
        const endsAtBoundary = localEndTime === '00:00' || localEndTime === '01:00' || localEndTime === '23:59';
        const isAllDay =
          (localStartTime === '00:00' && (localEndTime === '00:00' || localEndTime === '23:59')) ||
          (durationMins >= 20 * 60 && startsAtBoundary && endsAtBoundary);
        if (isAllDay) return null;
        return {
          localDate: localDateStr,
          start: timeToMins(localStartTime),
          end: timeToMins(localEndTime),
          title: b.title ?? 'Busy',
        };
      })
      .filter((b): b is { localDate: string; start: number; end: number; title: string } => b !== null && b.localDate === dateStr)
      .map((b) => ({ start: b.start, end: b.end, title: b.title }))
      .sort((a, b) => a.start - b.start);
  const todayBlocks = blocksForDate(todayISO);
  const tomorrowBlocks = blocksForDate(tomorrowISO);

  const startTimeStr = workingHours?.start_time ? String(workingHours.start_time) : "09:00";

  const tomorrowEndTime = (() => {
    if (!workingHours) return "18:00";
    const dayKeys = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;
    const dayKeyToName: Record<string, string> = {
      sun: "Sunday", mon: "Monday", tue: "Tuesday", wed: "Wednesday",
      thu: "Thursday", fri: "Friday", sat: "Saturday",
    };
    const key = dayKeys[tomorrowStart.getDay()];
    const name = dayKeyToName[key];
    const perDay = (workingHours as Record<string, unknown>).per_day_hours as Record<string, { start?: string; end?: string; active?: boolean }> | null | undefined;
    const cfg = perDay?.[name];
    const workingDaysArr = ((workingHours as Record<string, unknown>).working_days as string[] | null) ?? ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
    const active = cfg ? cfg.active === true : workingDaysArr.includes(name);
    return active ? (cfg?.end || String((workingHours as Record<string, unknown>).end_time ?? "18:00")) : null;
  })();

  const nextFreeSlot = (() => {
    const mapLessons = (list: LessonRow[]) =>
      list.map((l) => ({
        lesson_time: l.lesson_time || "",
        duration_minutes: l.duration_minutes ?? 60,
        status: l.status,
        bufferAfterMinutes:
          l.pupil_id && typeof pupilBufferMap[l.pupil_id]?.after === "number"
            ? (pupilBufferMap[l.pupil_id].after as number)
            : null,
      }));
    const rawBlocks = (visibleCalendarBlocks || []).map((b) => ({
      start_datetime: b.start_datetime,
      end_datetime: b.end_datetime,
      title: b.title,
    }));

    if (todayEndTime) {
      const todayGaps = computeDayGaps({
        dayLessons: mapLessons(todayLessons),
        calendarBlocks: rawBlocks,
        recurringBlocks: [],
        dayTimeOff: [],
        dayStart: startTimeStr,
        dayEnd: todayEndTime,
        instructorBufferAfter,
        dateStr: todayISO,
        isToday: true,
        minGapMinutes: 60,
      });
      if (todayGaps.length > 0) return minsToTime(todayGaps[0].startMins);
    }

    if (tomorrowEndTime) {
      const tomorrowGaps = computeDayGaps({
        dayLessons: mapLessons(tomorrowLessons),
        calendarBlocks: rawBlocks,
        recurringBlocks: [],
        dayTimeOff: [],
        dayStart: startTimeStr,
        dayEnd: tomorrowEndTime,
        instructorBufferAfter,
        dateStr: tomorrowISO,
        isToday: false,
        minGapMinutes: 60,
      });
      if (tomorrowGaps.length > 0) return minsToTime(tomorrowGaps[0].startMins);
    }

    return null;
  })();


  function computeFreeMinutes(
    dateLessons: LessonRow[],
    rawCalendarBlocks: Array<{ start_datetime: string; end_datetime: string; title: string | null }>,
    dateStr: string,
    isToday: boolean,
    startTimeStr: string,
    endTimeStr: string | null,
    bufferAfter: number,
    pupilBuf: Record<string, { before: number | null; after: number | null }>
  ) {
    if (!endTimeStr) return { count: 0, totalMinutes: 0 };
    const gaps = computeDayGaps({
      dayLessons: dateLessons.map((l) => ({
        lesson_time: l.lesson_time || "",
        duration_minutes: l.duration_minutes ?? 60,
        status: l.status,
        bufferAfterMinutes: (l.pupil_id && typeof pupilBuf[l.pupil_id]?.after === "number" ? (pupilBuf[l.pupil_id].after as number) : null),
      })),
      calendarBlocks: (rawCalendarBlocks || []).map((b) => ({
        start_datetime: b.start_datetime,
        end_datetime: b.end_datetime,
        title: b.title,
      })),
      recurringBlocks: [],
      dayTimeOff: [],
      dayStart: startTimeStr,
      dayEnd: endTimeStr,
      instructorBufferAfter: bufferAfter,
      dateStr,
      isToday,
      minGapMinutes,
    });
    let totalMinutes = 0;
    for (const g of gaps) totalMinutes += g.gapMins;
    return { count: gaps.length, totalMinutes };
  }

  const { count: freeSlotCount, totalMinutes: totalFreeMinutesToday } = computeFreeMinutes(
    todayLessons, visibleCalendarBlocks, todayISO, true, startTimeStr, todayEndTime, instructorBufferAfter, pupilBufferMap
  );

  const { totalMinutes: totalFreeMinutesTomorrow } = computeFreeMinutes(
    tomorrowLessons, visibleCalendarBlocks, tomorrowISO, false, startTimeStr, tomorrowEndTime, instructorBufferAfter, pupilBufferMap
  );



  console.log("[next-free] todayLessons:", todayLessons?.length);
  console.log("[next-free] workStart:", workingHours?.start_time, "workEnd:", workingHours?.end_time);
  console.log("[next-free] todayEndTime:", todayEndTime, "instructorBufferAfter:", instructorBufferAfter);
  console.log("[next-free] result:", nextFreeSlot);
  console.log("[home] freeSlotCount:", freeSlotCount);


  const earningsPct = Math.min(100, (weekEarnings / (weeklyEarningsGoal || 1)) * 100);
  const lessonsPct = Math.min(100, (weekLessonsTotal / (weeklyLessonGoal || 1)) * 100);

  const pupilName = (l?: LessonRow) => l?.pupils?.name ?? "Pupil";

  async function markLessonPaid(l: LessonRow) {
    if (!userId) {
      toast.error("Not authenticated");
      return;
    }
    try {
      await recordPayment({
        pupilId: l.pupil_id,
        amount: Number(l.amount_due ?? 0),
        method: "cash",
        notes: "Gap filler payment",
        currentAccountBalance: 0,
        targetLessonId: l.id,
      });
    } catch (e) {
      console.error("[mark paid] recordPayment error", e);
      toast.error("Could not mark lesson as paid");
      return;
    }
    setLessons((prev) =>
      prev.map((lesson) =>
        lesson.id === l.id ? { ...lesson, payment_status: "paid" } : lesson,
      ),
    );
    toast.success("Lesson marked as paid");
  }

  function sendPaymentLink(l: LessonRow) {
    const phone = l.pupils?.phone;
    if (!phone) {
      toast.error("No phone number for this pupil");
      return;
    }
    const amount = l.amount_due ?? 0;
    const amountPence = Math.round(amount * 100);
    const desc = encodeURIComponent("Lesson payment");
    const payUrl = `https://everydriver.co.uk/pay?amount=${amountPence}&desc=${desc}&ref=${l.id}`;
    const message = `Hi ${l.pupils?.name ?? "there"}, you have an outstanding lesson payment of £${amount.toFixed(2)}. Please pay here: ${payUrl}`;
    window.location.href = `sms:${phone}?body=${encodeURIComponent(message)}`;
  }

  const renderLessonCard = (l: LessonRow) => {
    const start = lessonDateTime(l);
    const end = new Date(start.getTime() + (l.duration_minutes ?? 60) * 60000);
    const isLive = now >= start && now < end;
    const status = (l.status ?? "").toLowerCase();
    const accent = status === "cancelled" ? "#9CA3AF" : "#1877D6";

    const balance = Number(l.amount_due ?? 0);
    const paid = (l.payment_status === "paid") || balance <= 0;
    const postcode = l.pupils?.postcode ?? null;
    const notes = (l.notes ?? "").toLowerCase();
    const lessonType = (l.lesson_type ?? "").toLowerCase();
    let typeBadge: { label: string; bg: string; color: string } | null = null;
    if (notes.includes("mock")) typeBadge = { label: "Mock test", bg: "#EEF2F7", color: "#0B1F3A" };
    else if (notes.includes("test") || lessonType.includes("test")) typeBadge = { label: "Test", bg: "#EEF2F7", color: "#0B1F3A" };
    else if ((l.notes ?? "").includes("Course")) typeBadge = { label: "Course", bg: "#DBEAFE", color: "#1E40AF" };
    const todayYmdStr = ymd(todayStart);
    const showEol = l.lesson_date < todayYmdStr || status === "completed";
    return (
      <div
        key={l.id}
        role="button"
        tabIndex={0}
        onClick={() => navigate({ to: "/pupils/$id", params: { id: l.pupil_id }, search: { lessonId: l.id } })}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            navigate({ to: "/pupils/$id", params: { id: l.pupil_id }, search: { lessonId: l.id } });
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
          borderColor: "#EEF2F7",
          borderLeft: `4px solid ${accent}`,
          marginBottom: 6,
          cursor: "pointer",
        }}
      >
        <div className="flex items-center" style={{ gap: 12, minWidth: 0 }}>

          <span className="text-[14px] font-bold" style={{ color: accent }}>
            {formatTime(l)}
          </span>
          <div style={{ minWidth: 0 }}>
            <div className="flex items-center" style={{ gap: 6, flexWrap: "wrap" }}>
              <span className="text-[14px] font-semibold text-[#0B1F3A]">{pupilName(l)}</span>
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
                color: "#1877D6",
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
                color: "#1877D6",
                padding: "3px 8px",
                borderRadius: 999,
                backgroundColor: "#FFECEC",
              }}
            >
              <span style={{ width: 6, height: 6, borderRadius: 999, backgroundColor: "#1877D6" }} />
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

    const lineColor = isPast ? "#9CA3AF" : "#EEF2F7";
    const isLast = idx === arr.length - 1;

    let dot: React.ReactNode;
    if (state === "past") {
      dot = <div style={{ width: 12, height: 12, borderRadius: 999, backgroundColor: "#9CA3AF" }} />;
    } else if (state === "current") {
      dot = (
        <div style={{ position: "relative", width: 14, height: 14 }}>
          <span
            className="animate-ping"
            style={{ position: "absolute", inset: 0, borderRadius: 999, backgroundColor: "#1877D6", opacity: 0.6 }}
          />
          <div style={{ position: "relative", width: 14, height: 14, borderRadius: 999, backgroundColor: "#1877D6" }} />
        </div>
      );
    } else if (state === "next") {
      dot = (
        <div
          style={{
            width: 12,
            height: 12,
            borderRadius: 999,
            backgroundColor: "#0B1F3A",
            border: "2px solid #FFFFFF",
            boxShadow: "0 0 0 1px #0B1F3A",
          }}
        />
      );
    } else {
      dot = (
        <div style={{ width: 12, height: 12, borderRadius: 999, backgroundColor: "#FFFFFF", border: "2px solid #EEF2F7" }} />
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
    let cardStyle: React.CSSProperties = { ...cardBase, border: "0.5px solid #EEF2F7" };
    if (state === "past") cardStyle = { ...cardBase, backgroundColor: "#F8F9FB", opacity: 0.6, border: "0.5px solid #EEF2F7" };
    else if (state === "current") cardStyle = { ...cardBase, borderLeft: "3px solid #1877D6", boxShadow: "0 0 0 1px #1877D620" };
    else if (state === "next") cardStyle = { ...cardBase, borderLeft: "3px solid #0B1F3A", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" };

    const timeColor = isPast ? "#9CA3AF" : "#0B1F3A";
    const nameColor = isPast ? "#9CA3AF" : "#0B1F3A";
    const endPassed = end.getTime() < now.getTime();
    const paymentStatus = (l.payment_status ?? "").toLowerCase();
    const eolDone = l.eol_completed === true;

    type Badge = { label: string; bg: string; color: string };
    const badges: Badge[] = [];
    if (endPassed && !eolDone) badges.push({ label: "EOL", bg: "#EEF2F7", color: "#0B1F3A" });

    const fmtAmt = (n: number) => {
      const v = Math.abs(n);
      return Number.isInteger(v) ? `£${v}` : `£${v.toFixed(2)}`;
    };
    const amountDue = typeof l.amount_due === "number" ? l.amount_due : 0;
    const balance = 0;
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
              fontFamily: "Inter, sans-serif",
              flexShrink: 0,
              minWidth: 48,
            }}
          >
            {formatTime(l)}
          </span>
        )}
        <div style={{ minWidth: 0, fontSize: 13, fontWeight: 600, color: nameColor, fontFamily: "Inter, sans-serif" }} className="truncate flex-1">
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
                  fontFamily: "Inter, sans-serif",
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
                  fontFamily: "Inter, sans-serif",
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
          onClick={() => navigate({ to: "/pupils/$id", params: { id: l.pupil_id }, search: { lessonId: l.id } })}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              navigate({ to: "/pupils/$id", params: { id: l.pupil_id }, search: { lessonId: l.id } });
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
              fontFamily: "Inter, sans-serif",
            }}
          >
            {formatTime(l)}
          </div>
        </div>

        <div
          role="button"
          tabIndex={0}
          onClick={() => navigate({ to: "/pupils/$id", params: { id: l.pupil_id }, search: { lessonId: l.id } })}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              navigate({ to: "/pupils/$id", params: { id: l.pupil_id }, search: { lessonId: l.id } });
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
    { icon: <CalendarIcon size={20} color="#FFFFFF" />, bg: "#1877D6", label: "Schedule", route: "/schedule" },
    
    { icon: <Map size={20} color="#FFFFFF" />, bg: "#1877D6", label: "Start tracking", route: "/live" },
    { icon: <CalendarCheck size={20} color="#FFFFFF" />, bg: "#1877D6", label: "Month end", route: "/monthend" },
    { icon: <Users size={20} color="#FFFFFF" />, bg: "#1877D6", label: "Pupils", route: "/pupils" },
    { icon: <PoundSterling size={20} color="#FFFFFF" />, bg: "#1877D6", label: "Payments", route: "/payments" },
    { icon: <MessageSquare size={20} color="#FFFFFF" />, bg: "#1877D6", label: "Messages", route: "/messages" },
    { icon: <TrendingUp size={20} color="#FFFFFF" />, bg: "#1877D6", label: "Earnings", route: "/earnings" },
    { icon: <Receipt size={20} color="#FFFFFF" />, bg: "#0B1F3A", label: "Expenses", route: "/expenses" },
    { icon: <Car size={20} color="#FFFFFF" />, bg: "#DC2626", label: "Mileage", route: "/mileage" },
    { icon: <Fuel size={20} color="#FFFFFF" />, bg: "#0B1F3A", label: "Fuel costs", route: "/fuel" },
    { icon: <BarChart2 size={20} color="#FFFFFF" />, bg: "#1877D6", label: "Reports", route: "/reports" },
    { icon: <TrendingUp size={20} color="#FFFFFF" />, bg: "#1877D6", label: "Performance", route: "/performance" },
    { icon: <GraduationCap size={20} color="#FFFFFF" />, bg: "#1877D6", label: "Tests", route: "/tests" },
    { icon: <ShieldAlert size={20} color="#FFFFFF" />, bg: "#B5661E", label: "DVSA risk", route: "/tests" },
    { icon: <GraduationCap size={20} color="#FFFFFF" />, bg: "#1877D6", label: "Test day", route: "/testday" },
    { icon: <Trophy size={20} color="#FFFFFF" />, bg: "#1877D6", label: "Rewards", route: "/rewards" },
    { icon: <GraduationCap size={20} color="#FFFFFF" />, bg: "#DC2626", label: "Courses", route: "/courses" },
    { icon: <Star size={20} color="#FFFFFF" />, bg: "#0B1F3A", label: "Reviews", route: "/reviews" },
    { icon: <Inbox size={20} color="#FFFFFF" />, bg: "#1877D6", label: "Enquiries", route: "/enquiries" },
    { icon: <Clock size={20} color="#FFFFFF" />, bg: "#DC2626", label: "Waiting list", route: "/waitlist" },
    { icon: <Gift size={20} color="#FFFFFF" />, bg: "#1877D6", label: "Referrals", route: "/referrals" },
    { icon: <Car size={20} color="#FFFFFF" />, bg: "#6B7280", label: "Vehicle", route: "/vehicle" },
    { icon: <BookOpen size={20} color="#FFFFFF" />, bg: "#1877D6", label: "CPD", route: "/cpd" },
    
    { icon: <ClipboardCheck size={20} color="#FFFFFF" />, bg: "#1877D6", label: "Standards", route: "/standards" },
    { icon: <Calculator size={20} color="#FFFFFF" />, bg: "#0B1F3A", label: "Tax", route: "/tax" },
    { icon: <FileText size={20} color="#FFFFFF" />, bg: "#1877D6", label: "Tax report", route: "/tax-report" },
    { icon: <CheckSquare size={20} color="#FFFFFF" />, bg: "#1877D6", label: "Todos", route: "/todos" },
    { icon: <FileText size={20} color="#FFFFFF" />, bg: "#0B1F3A", label: "Notes", route: "/notes" },
    { icon: <FolderOpen size={20} color="#FFFFFF" />, bg: "#1877D6", label: "Documents", route: "/documents" },
    { icon: <ClipboardList size={20} color="#FFFFFF" />, bg: "#1877D6", label: "Manifest", route: "/manifest" },
    { icon: <CheckSquare size={20} color="#FFFFFF" />, bg: "#1877D6", label: "Checklist", route: "/checklist" },
    { icon: <Bell size={20} color="#FFFFFF" />, bg: "#DC2626", label: "Reminders", route: "/reminder" },
    { icon: <Heart size={20} color="#FFFFFF" />, bg: "#0B1F3A", label: "Health", route: "/health" },
    { icon: <BookOpen size={20} color="#FFFFFF" />, bg: "#1877D6", label: "Resources", route: "/resources" },
    { icon: <HelpCircle size={20} color="#FFFFFF" />, bg: "#6B7280", label: "Help", route: "/help" },
    { icon: <LayoutGrid size={20} color="#FFFFFF" />, bg: "#1877D6", label: "Pipeline", route: "/pipeline" },
    { icon: <FileSignature size={20} color="#FFFFFF" />, bg: "#6B7280", label: "Waivers", route: "/waivers" },
    { icon: <Zap size={20} color="#FFFFFF" />, bg: "#1877D6", label: "Fill My Slots", route: "/gaps" },
    { icon: <Users size={20} color="#FFFFFF" />, bg: "#DC2626", label: "Bulk message", route: "/bulkmessage" },
    { icon: <Navigation size={20} color="#FFFFFF" />, bg: "#1877D6", label: "Sat Nav", route: "/satnav" },
    { icon: <BarChart3 size={20} color="#FFFFFF" />, bg: "#1877D6", label: "Weekly report", route: "/weekly-report" },
    { icon: <MapPin size={20} color="#FFFFFF" />, bg: "#DC2626", label: "Locations", route: "/locations" },
    { icon: <Upload size={20} color="#FFFFFF" />, bg: "#6B7280", label: "Import", route: "/dataimport" },
    { icon: <Award size={20} color="#FFFFFF" />, bg: "#0B1F3A", label: "Certifications", route: "/certifications" },
    { icon: <ToggleLeft size={20} color="#FFFFFF" />, bg: "#1877D6", label: "Availability", route: "/availability" },
    
    { icon: <Moon size={20} color="#FFFFFF" />, bg: "#1877D6", label: "End of day", route: "/end-of-day" },
    { icon: <Megaphone size={20} color="#FFFFFF" />, bg: "#DC2626", label: "Broadcast", route: "/broadcast" },
    { icon: <Zap size={20} color="#FFFFFF" />, bg: "#1877D6", label: "Automations", route: "/automations" },
    { icon: <CalendarDays size={20} color="#FFFFFF" />, bg: "#1877D6", label: "Diary", route: "/diary" },
    { icon: <Crown size={20} color="#FFFFFF" />, bg: "#1877D6", label: "My plan", route: "/subscription" },
    { icon: <PlayCircle size={20} color="#FFFFFF" />, bg: "#DC2626", label: "Live session", route: "/livesession" },
    { icon: <Search size={20} color="#FFFFFF" />, bg: "#6B7280", label: "Search", route: "/search" },
    { icon: <Bell size={20} color="#FFFFFF" />, bg: "#DC2626", label: "Notifications", route: "/notifications" },
    
    { icon: <RefreshCw size={20} color="#FFFFFF" />, bg: "#1877D6", label: "Calendar sync", route: "/calendarsync" },
    { icon: <UserCircle size={20} color="#FFFFFF" />, bg: "#1877D6", label: "Profile", route: "/profile" },
    { icon: <FileSpreadsheet size={20} color="#FFFFFF" />, bg: "#0B1F3A", label: "MTD", route: "/mtd" },
    { icon: <FileText size={20} color="#FFFFFF" />, bg: "#0B1F3A", label: "Quotes", route: "/quotes" },
    { icon: <Sun size={20} color="#FFFFFF" />, bg: "#1877D6", label: "Briefing", route: "/briefing" },
    { icon: <AlertCircle size={20} color="#FFFFFF" />, bg: "#DC2626", label: "Outstanding", route: "/outstanding" },
    { icon: <Globe size={20} color="#FFFFFF" />, bg: "#1877D6", label: "My website", route: "/minisite" },
    { icon: <PlayCircle size={20} color="#FFFFFF" />, bg: "#7C3AED", label: "Learn", route: "/learn" },

  ] as const;

  function previewMatchForGap(gap: {
    date: string;
    dayName: string;
    durationMin: number;
  }): { count: number; topPupils: Array<{ name: string | null; first_name: string | null; calendar_colour: string | null }> } {
    if (!allPupils.length || !allAvailability.length) {
      return { count: 0, topPupils: [] };
    }
    const availByPupil = new (globalThis.Map)<string, PupilReadySetting>();
    for (const a of allAvailability) {
      if (a.pupil_id) availByPupil.set(a.pupil_id, a);
    }
    const slotStart = new Date(`${gap.date}T00:00:00`).getTime();
    const hoursUntilSlot = (slotStart - Date.now()) / 3600000;

    const matched: Array<{ name: string | null; first_name: string | null; calendar_colour: string | null }> = [];
    for (const p of allPupils) {
      const s = availByPupil.get(p.id);
      if (!s) continue;
      const availDays = s.available_days || [];
      if (!availDays.includes(gap.dayName)) continue;
      const minDuration = s.preferred_duration_minutes ?? 60;
      if (gap.durationMin < minDuration) continue;
      const minNoticeHours = s.min_notice_hours ?? 24;
      if (hoursUntilSlot < minNoticeHours && !s.short_notice_opt_in) continue;
      matched.push({
        name: p.name,
        first_name: p.first_name,
        calendar_colour: p.calendar_colour,
      });
    }
    return { count: matched.length, topPupils: matched.slice(0, 3) };
  }

  if (!authChecked) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ ...POPPINS, backgroundColor: PAGE_BACKGROUND }}
      >
        <div className="flex flex-col items-center gap-3">
          <div
            className="animate-spin rounded-full"
            style={{ width: 32, height: 32, border: '3px solid #EEF2F7', borderTopColor: '#1877D6' }}
          />
          <div style={{ fontSize: 14, color: '#6B7280' }}>Checking access…</div>
        </div>
      </div>
    );
  }

  // ============ DESKTOP LAYOUT (>=768px) ============
  const todaysPupilsFiltered = (() => {
    const seen = new Set<string>();
    const rows: Array<{ id: string; name: string; initials: string; avatar: string | null; timeLabel: string }> = [];
    for (const l of todayLessons) {
      const id = l.pupil_id ?? "";
      if (!id || seen.has(id)) continue;
      seen.add(id);
      const name = l.pupils?.name || "Pupil";
      const initials = name.split(/\s+/).map((s: string) => s.charAt(0)).join("").slice(0,2).toUpperCase();
      rows.push({
        id,
        name,
        initials,
        avatar: ((l.pupils as any)?.profile_image_url ?? (l.pupils as any)?.photo_url) ?? null,
        timeLabel: `${String(l.lesson_time || "").slice(0,5)} · ${formatDuration(l.duration_minutes)}`,
      });
    }
    const q = pupilQuery.trim().toLowerCase();
    return q ? rows.filter((r) => r.name.toLowerCase().includes(q)) : rows;
  })();
  const outstandingBreakdownFiltered = (() => {
    const q = pupilQuery.trim().toLowerCase();
    if (!q) return outstandingBreakdown;
    return outstandingBreakdown.filter((p) => p.name.toLowerCase().includes(q));
  })();

  // Needs Attention counts
  const naJobs: number = openJobsCount;
  const naTests = (upcomingTests ?? []).filter((p) => {
    if (!p.test_date) return false;
    const days = Math.floor((new Date(p.test_date).getTime() - new Date().getTime()) / 86400000);
    return days >= 0 && days <= 7;
  }).length;
  const naCalls: number = 0; // TODO: wire missed calls
  const naEnquiries = pendingSwapCount || 0;
  const naUrgentCount = [naJobs, naTests, naCalls, naEnquiries].filter((n) => n > 0).length;

  const timeAgo = (iso: string) => {
    const diff = Math.max(0, Date.now() - new Date(iso).getTime());
    const m = Math.floor(diff / 60000);
    if (m < 1) return "just now";
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  };

  if (isDesktop) {
    const now = new Date();
    const in7 = new Date(now.getTime() + 7 * 86400000);
    const in30 = new Date(now.getTime() + 30 * 86400000);
    const parseTest = (t: { test_date: string }) => new Date(t.test_date + "T00:00:00");
    const testsThisWeek = upcomingTests.filter((t) => {
      const d = parseTest(t);
      return d >= new Date(now.getFullYear(), now.getMonth(), now.getDate()) && d <= in7;
    });
    const upcomingTests30 = upcomingTests.filter((t) => parseTest(t) <= in30);
    const dateHeader = now.toLocaleDateString("en-GB", {
      weekday: "long", day: "numeric", month: "long", year: "numeric",
    });
    const cardStyle: React.CSSProperties = {
      background: "#FFFFFF", border: "0.5px solid #E2E6ED",
      borderRadius: 10, padding: 16,
    };
    const statLabel: React.CSSProperties = {
      fontSize: 12, fontWeight: 600, color: "#6B7280",
      marginTop: 4, letterSpacing: 0.2,
    };
    const statValue: React.CSSProperties = {
      fontSize: 28, fontWeight: 900, color: "#0B1F3A", letterSpacing: -0.5,
    };
    const panelHeading: React.CSSProperties = {
      fontSize: 16, fontWeight: 800, color: "#0B1F3A", marginBottom: 12,
    };
    const viewAllLink: React.CSSProperties = {
      fontSize: 13, fontWeight: 600, color: "#1877D6",
      background: "none", border: "none", cursor: "pointer",
      fontFamily: "Inter, sans-serif", padding: 0,
    };
    const quickBtn: React.CSSProperties = {
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      gap: 6, padding: "14px 8px", borderRadius: 10,
      border: "0.5px solid #E2E6ED", background: "#F8FAFF",
      cursor: "pointer", fontFamily: "Inter, sans-serif",
      fontSize: 12, fontWeight: 600, color: "#0B1F3A",
    };
    return (
      <div className="min-h-screen" style={{ ...POPPINS, backgroundColor: PAGE_BACKGROUND, paddingTop: "calc(60px + env(safe-area-inset-top, 0px))" }}>
        {notifBanner}
        <InstructorTopBar
          firstName={firstName}
          avatarUrl={avatarUrl}
          unreadCount={notifCount}
          onProfile={() => navigate({ to: "/profile" })}
          onPhone={() => navigate({ to: "/enquiries" })}
          onLiveTrack={() => navigate({ to: "/live" })}
          onBell={() => navigate({ to: "/notifications" })}
          onMenu={() => window.dispatchEvent(new Event('dsm-open-menu'))}
          onMicPress={() => toast.info("Voice commands coming soon!")}
        />
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "24px 32px" }}>
          {/* HEADER */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
            <h1 style={{ fontSize: 24, fontWeight: 900, color: "#0B1F3A", margin: 0, fontFamily: "Inter, sans-serif" }}>
              Good morning, {firstName} 👋
            </h1>
            <div style={{ fontSize: 14, color: "#6B7280", fontFamily: "Inter, sans-serif" }}>
              {dateHeader}
            </div>
          </div>

          {/* TODAY'S LESSONS TILE */}
          <div style={{ marginBottom: 16 }}>
            <TodayLessonsTile
              todayLessons={todayLessons}
              onNavigate={() => navigate({ to: "/schedule" })}
              onAddLesson={() => { setAddLessonDate(undefined); setAddLessonPupilId(undefined); setAddLessonOpen(true); }}
            />
          </div>

          {/* STATS ROW */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 16, marginBottom: 24 }}>
            <div style={cardStyle}>
              <div style={{ ...statValue, color: "#16A34A" }}>£{Math.round(weekEarnings)}</div>
              <div style={statLabel}>This week</div>
            </div>
            <div style={cardStyle}>
              <div style={{ ...statValue, color: "#CC2229" }}>£{Math.round(outstanding)}</div>
              <div style={statLabel}>Outstanding</div>
            </div>
            <div style={cardStyle}>
              <div style={statValue}>{activePupilsCount}</div>
              <div style={statLabel}>Active pupils</div>
            </div>
            <div style={cardStyle}>
              <div style={statValue}>{testsThisWeek.length}</div>
              <div style={statLabel}>Tests this week</div>
            </div>
          </div>

          {/* 2-COLUMN GRID */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            {/* LEFT COLUMN */}
            <div>
              {/* Today's schedule */}
              <div style={cardStyle}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12 }}>
                  <div style={panelHeading}>Today's schedule</div>
                  <div style={{ fontSize: 12, color: "#6B7280", fontFamily: "Inter, sans-serif" }}>{dateHeader}</div>
                </div>
                {todayLessons.length === 0 ? (
                  (() => {
                    const dayKeys = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;
                    const todayKey = dayKeys[todayStart.getDay()];
                    const todayWorks = workingHours ? (workingHours as Record<string, unknown>)[todayKey] : true;
                    const startStr = "09:00";
                    const endStr = workingHours?.end_time ? String(workingHours.end_time).slice(0, 5) : "18:00";
                    const [sh, sm] = startStr.split(":").map(Number);
                    const [eh, em] = endStr.split(":").map(Number);
                    const totalMinutes = Math.max(0, (eh * 60 + em) - (sh * 60 + sm));
                    const availableHours = Math.round((totalMinutes / 60) * 10) / 10;
                    const hourlyRate = 40;
                    const potential = Math.round(availableHours * hourlyRate);
                    const fmt24 = (h: number, m: number) => `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
                    const workingLabel = todayWorks ? `${fmt24(sh, sm)} – ${fmt24(eh, em)}` : "Not working today";
                    const AVATAR_PALETTE = ["#1877D6", "#00B5A5", "#7C3AED", "#DC2626", "#F59E0B", "#0EA5E9"];
                    const pupils = outstandingBreakdown.slice(0, 5);
                    const extraPupils = Math.max(0, activePupilsCount - pupils.length);
                    return (
                      <div style={{
                        background: "#FFFFFF", border: "0.5px solid #E2E6ED",
                        borderRadius: 10, overflow: "hidden", margin: "12px 16px 0",
                        fontFamily: "Inter, sans-serif",
                      }}>
                        <div style={{ height: 4, background: "linear-gradient(90deg, #00B5A5, #1877D6)" }} />
                        <div style={{ padding: 20 }}>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                            <div style={{ fontWeight: 900, fontSize: 18, color: "#0B1F3A" }}>📅 Free day today</div>
                            <div style={{ fontSize: 13, color: "#9CA3AF" }}>{workingLabel}</div>
                          </div>
                          <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
                            {[
                              { value: `${availableHours} hrs`, label: "Available", color: "#0B1F3A" },
                              { value: `£${potential}`, label: "Potential", color: "#16A34A" },
                              { value: `${activePupilsCount}`, label: "Pupils", color: "#1877D6" },
                            ].map((s) => (
                              <div key={s.label} style={{
                                flex: 1, background: "#F7FAFC", border: "0.5px solid #E2E6ED",
                                borderRadius: 10, padding: "10px 14px", textAlign: "center",
                              }}>
                                <div style={{ fontWeight: 700, fontSize: 18, color: s.color }}>{s.value}</div>
                                <div style={{ fontSize: 12, color: "#9CA3AF" }}>{s.label}</div>
                              </div>
                            ))}
                          </div>
                          <div style={{ marginBottom: 16 }}>
                            <div style={{ fontSize: 12, color: "#9CA3AF", fontWeight: 600, marginBottom: 8 }}>
                              Pupils who may be free today:
                            </div>
                            {pupils.length > 0 ? (
                              <div style={{ display: "flex", alignItems: "center" }}>
                                {pupils.map((p, i) => {
                                  const initials = (p.firstName || p.name || "?")
                                    .split(" ").map((s) => s[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();
                                  return (
                                    <div key={p.pupilId} style={{
                                      width: 36, height: 36, borderRadius: "50%",
                                      background: AVATAR_PALETTE[i % AVATAR_PALETTE.length],
                                      color: "#FFFFFF", fontWeight: 700, fontSize: 13,
                                      display: "flex", alignItems: "center", justifyContent: "center",
                                      marginLeft: i === 0 ? 0 : -10,
                                      border: "2px solid #FFFFFF",
                                    }}>{initials}</div>
                                  );
                                })}
                                {extraPupils > 0 && (
                                  <div style={{
                                    width: 36, height: 36, borderRadius: "50%", background: "#E5E7EB",
                                    color: "#4B5563", fontWeight: 700, fontSize: 12,
                                    display: "flex", alignItems: "center", justifyContent: "center",
                                    marginLeft: -10, border: "2px solid #FFFFFF",
                                  }}>+{extraPupils}</div>
                                )}
                              </div>
                            ) : (
                              <div style={{ fontSize: 13, color: "#9CA3AF" }}>Your active pupils</div>
                            )}
                          </div>
                          <div style={{ display: "flex", gap: 8 }}>
                            <button onClick={() => navigate({ to: "/gaps" })} style={{
                              flex: 1, background: "#0B1F3A", color: "#FFFFFF",
                              padding: "12px 0", borderRadius: 12, fontWeight: 600, fontSize: 14,
                              border: "none", cursor: "pointer", fontFamily: "Inter, sans-serif",
                            }}>Fill My Slots →</button>
                            <button onClick={() => {
                              window.location.href = `sms:?body=${encodeURIComponent("Hi everyone, I have lesson availability today. Reply to book!")}`;
                            }} style={{
                              flex: 1, background: "#00B5A5", color: "#FFFFFF",
                              padding: "12px 0", borderRadius: 12, fontWeight: 600, fontSize: 14,
                              border: "none", cursor: "pointer", fontFamily: "Inter, sans-serif",
                            }}>Broadcast message</button>
                          </div>
                        </div>
                      </div>
                    );
                  })()
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {todayLessons.map((l) => {
                      const paid = (l.payment_status ?? "").toLowerCase() === "paid";
                      const [hh, mm] = (l.lesson_time ?? "00:00").split(":").map(Number);
                      const endMinutes = hh * 60 + mm + (l.duration_minutes ?? 60);
                      const nowMinutes = new Date().getHours() * 60 + new Date().getMinutes();
                      const eolDue = !l.eol_completed && l.lesson_date === todayISO && endMinutes <= nowMinutes;
                      return (
                        <button
                          key={l.id}
                          onClick={() => navigate({ to: "/pupils/$id", params: { id: l.pupil_id } as any, search: { lessonId: l.id } as any })}
                          style={{
                            display: "grid", gridTemplateColumns: "70px 1fr auto auto auto",
                            gap: 12, alignItems: "center", padding: "10px 12px",
                            borderRadius: 10, border: "0.5px solid #E2E6ED",
                            background: "#FFFFFF", cursor: "pointer", textAlign: "left",
                            fontFamily: "Inter, sans-serif",
                          }}
                        >
                          <span style={{ fontSize: 14, fontWeight: 700, color: "#0B1F3A" }}>{formatTime(l)}</span>
                          <span style={{ fontSize: 14, fontWeight: 600, color: "#0B1F3A", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{pupilName(l)}</span>
                          <span style={{ fontSize: 12, color: "#6B7280" }}>{formatDuration(l.duration_minutes)}</span>
                          <span style={{
                            fontSize: 10, fontWeight: 700, textTransform: "uppercase",
                            padding: "3px 8px", borderRadius: 6,
                            background: paid ? "#DCFCE7" : "#FEE2E2",
                            color: paid ? "#166534" : "#991B1B",
                          }}>{paid ? "Paid" : "Unpaid"}</span>
                          {eolDue && (
                            <span
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate({ to: "/end-of-day" });
                              }}
                              style={{
                                fontSize: 10, fontWeight: 700, textTransform: "uppercase",
                                padding: "3px 8px", borderRadius: 6,
                                background: "#FEF3C7", color: "#B45309",
                                cursor: "pointer",
                              }}
                            >
                              EOL due
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
                <div style={{ display: "flex", gap: 8, marginTop: 12, alignItems: "stretch" }}>
                  <button
                    onClick={() => navigate({ to: "/schedule" })}
                    style={{
                      flex: 1, padding: "10px 12px",
                      borderRadius: 10, border: "1px dashed #1877D6",
                      background: "transparent", color: "#1877D6",
                      fontSize: 13, fontWeight: 600, cursor: "pointer",
                      fontFamily: "Inter, sans-serif",
                    }}
                  >Add lesson +</button>
                  <button
                    onClick={handleSyncGoogleClick}
                    style={{
                      background: 'white',
                      border: '0.5px solid #E2E6ED',
                      borderRadius: 8,
                      padding: '6px 10px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      fontSize: 11,
                      fontWeight: 600,
                      color: '#1877D6',
                      fontFamily: 'Inter, sans-serif',
                    }}
                  >
                    <CalendarIcon size={12} color="#1877D6" />
                    Sync Google
                  </button>
                </div>

              </div>

              {/* Outstanding payments */}
              <div style={{ ...cardStyle, marginTop: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12 }}>
                  <div style={panelHeading}>Outstanding payments</div>
                  <button onClick={() => navigate({ to: "/payments" })} style={viewAllLink}>View all →</button>
                </div>
                {outstandingBreakdown.length === 0 ? (
                  <div style={{ fontSize: 13, color: "#6B7280", padding: "12px 0", fontFamily: "Inter, sans-serif" }}>
                    All pupils paid up.
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {outstandingBreakdown.slice(0, 8).map((p) => (
                      <div key={p.pupilId + p.type}
                        style={{
                          display: "grid", gridTemplateColumns: "1fr auto auto",
                          gap: 12, alignItems: "center", padding: "10px 12px",
                          borderRadius: 10, border: "0.5px solid #E2E6ED",
                          fontFamily: "Inter, sans-serif",
                        }}
                      >
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: 14, fontWeight: 600, color: "#0B1F3A", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</div>
                          <div style={{ fontSize: 11, color: "#6B7280" }}>{p.type}</div>
                        </div>
                        <div style={{ fontSize: 14, fontWeight: 800, color: "#CC2229" }}>£{p.amount.toFixed(2)}</div>
                        {p.phone ? (
                          <a
                            href={`sms:${p.phone}?body=${encodeURIComponent(`Hi ${p.firstName}, just a reminder that £${p.amount.toFixed(2)} is outstanding on your lesson account. Thanks!`)}`}
                            style={{
                              padding: "6px 10px", borderRadius: 8,
                              background: "#1877D6", color: "#FFFFFF",
                              fontSize: 12, fontWeight: 600, textDecoration: "none",
                            }}
                          >Chase SMS</a>
                        ) : (
                          <span style={{ fontSize: 11, color: "#9CA3AF" }}>No phone</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* RIGHT COLUMN */}
            <div>
              {/* Recent activity */}
              <div style={cardStyle}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12 }}>
                  <div style={panelHeading}>Recent activity</div>
                  <button onClick={() => navigate({ to: "/notifications" })} style={viewAllLink}>View all →</button>
                </div>
                {recentActivity.length === 0 ? (
                  <div style={{ fontSize: 13, color: "#6B7280", padding: "12px 0", fontFamily: "Inter, sans-serif" }}>
                    No recent activity.
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {recentActivity.map((n) => (
                      <div key={n.id}
                        style={{
                          display: "flex", gap: 10, alignItems: "flex-start",
                          padding: "10px 12px", borderRadius: 10,
                          border: "0.5px solid #E2E6ED",
                          background: n.read ? "#FFFFFF" : "#F0F7FF",
                          fontFamily: "Inter, sans-serif",
                        }}
                      >
                        <div style={{
                          width: 28, height: 28, borderRadius: "50%",
                          background: "#E7F0FA", display: "flex",
                          alignItems: "center", justifyContent: "center", flexShrink: 0,
                        }}>
                          <Bell size={14} color="#1877D6" />
                        </div>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: "#0B1F3A", lineHeight: 1.3 }}>{n.title}</div>
                          {n.body && (
                            <div style={{ fontSize: 12, color: "#6B7280", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
                              {n.body}
                            </div>
                          )}
                        </div>
                        <div style={{ fontSize: 11, color: "#9CA3AF", flexShrink: 0 }}>{timeAgo(n.created_at)}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Upcoming tests */}
              <div style={{ ...cardStyle, marginTop: 16 }}>
                <div style={panelHeading}>Upcoming tests</div>
                {upcomingTests30.length === 0 ? (
                  <div style={{ fontSize: 13, color: "#6B7280", padding: "12px 0", fontFamily: "Inter, sans-serif" }}>
                    No tests in the next 30 days.
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {upcomingTests30.map((t) => (
                      <div key={t.id}
                        style={{
                          display: "grid", gridTemplateColumns: "1fr auto",
                          gap: 12, alignItems: "center", padding: "10px 12px",
                          borderRadius: 10, border: "0.5px solid #E2E6ED",
                          fontFamily: "Inter, sans-serif",
                        }}
                      >
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: 14, fontWeight: 600, color: "#0B1F3A", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.name}</div>
                          <div style={{ fontSize: 12, color: "#6B7280" }}>
                            {new Date(t.test_date + "T00:00:00").toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}
                            {t.test_time ? ` · ${t.test_time.slice(0, 5)}` : ""}
                            {t.test_centre ? ` · ${t.test_centre}` : ""}
                          </div>
                        </div>
                        <button
                          onClick={() => navigate({ to: "/pupils/$id", params: { id: t.id } as any })}
                          style={viewAllLink}
                        >View →</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Quick actions */}
              <div style={{ ...cardStyle, marginTop: 16 }}>
                <div style={panelHeading}>Quick actions</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
                  <button style={quickBtn} onClick={() => navigate({ to: "/schedule" })}>
                    <Plus size={18} color="#1877D6" /> Add lesson
                  </button>
                  <button style={quickBtn} onClick={() => navigate({ to: "/payments" })}>
                    <PoundSterling size={18} color="#16A34A" /> Take payment
                  </button>
                  <button style={quickBtn} onClick={() => navigate({ to: "/pupils" })}>
                    <Users size={18} color="#1877D6" /> Add pupil
                  </button>
                  <button style={quickBtn} onClick={() => navigate({ to: "/schedule" })}>
                    <CalendarIcon size={18} color="#1877D6" /> Schedule
                  </button>
                  <button style={quickBtn} onClick={() => navigate({ to: "/quotes" })}>
                    <FileText size={18} color="#1877D6" /> Quotes
                  </button>
                  <button style={quickBtn} onClick={() => navigate({ to: "/reports" })}>
                    <BarChart3 size={18} color="#1877D6" /> Reports
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <PageLayout className="pb-safe" style={{ ...POPPINS, position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, width: '100%', maxWidth: '100vw', height: '100dvh', maxHeight: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', overflowX: 'hidden', paddingTop: 'calc(60px + env(safe-area-inset-top, 0px))', paddingBottom: 'calc(60px + env(safe-area-inset-bottom, 0px))' }}>
      {notifBanner}
      <SheetQueueController userId={userId} />
      <style>{`.hide-scrollbar::-webkit-scrollbar{display:none}.hide-scrollbar{scrollbar-width:none;-ms-overflow-style:none}.carousel-hide-scrollbar::-webkit-scrollbar{display:none}@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}@keyframes chipShimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
      {/* TOP BAR */}
      <InstructorTopBar
        firstName={firstName}
        avatarUrl={avatarUrl}
        unreadCount={notifCount}
        onProfile={() => navigate({ to: "/profile" })}
        onPhone={() => navigate({ to: "/enquiries" })}
        onLiveTrack={() => navigate({ to: "/live" })}
        onBell={() => navigate({ to: "/notifications" })}
        onMenu={() => window.dispatchEvent(new Event('dsm-open-menu'))}
        onMicPress={() => toast.info("Voice commands coming soon!")}
      />

      <PushPermissionCard />





<section
          data-workspace="today"
          data-ws-index={0}
          style={{
            minWidth: '100vw',
            width: '100vw',
            maxWidth: '100vw',
            height: '100%',
            scrollSnapAlign: 'start',
            overflowY: 'auto',
            overflowX: 'hidden',
            flexShrink: 0,
            background: PAGE_BACKGROUND,
            WebkitOverflowScrolling: 'touch',
            touchAction: 'pan-y',
            overscrollBehaviorX: 'none',
            paddingBottom: 10,
          }}
        >
      {/* ============ NAVY HEADER BLOCK ============ */}
      <div
        style={{
          backgroundColor: '#0B1F3A',
          marginTop: 'calc(-1 * (60px + env(safe-area-inset-top, 0px)))',
          padding: 'calc(60px + env(safe-area-inset-top, 0px) + 16px) 16px 34px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontFamily: 'Inter, sans-serif',
          borderRadius: '0 0 24px 24px',
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 18, fontWeight: 600, color: '#FFFFFF', lineHeight: 1.2 }}>Dashboard</div>
          <div style={{ fontSize: 13, color: '#9AA6BC', marginTop: 4 }}>
            Welcome back, {firstName || 'there'} 👋
          </div>
        </div>
        <button
          type="button"
          onClick={() => navigate({ to: '/profile' })}
          aria-label="Profile"
          style={{
            width: 34, height: 34, borderRadius: '50%',
            background: '#1877D6', color: '#FFFFFF',
            fontSize: 13, fontWeight: 600,
            border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', overflow: 'hidden', padding: 0, flexShrink: 0,
            fontFamily: 'Inter, sans-serif',
          }}
        >
          {avatarUrl
            ? <img src={avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : (firstName?.[0] ?? 'I').toUpperCase()}
        </button>
      </div>

      {/* ============ OVERLAPPING STAT TILES ============ */}
      {/* NOTE: naCalls (callbacks) and naJobs (open jobs) are not yet wired to a real table — showing 0 as placeholder. naEnquiries is derived from pendingSwapCount today. */}
      <div style={{ padding: '0 16px', marginTop: -22, marginBottom: 20, display: 'flex', gap: 8, fontFamily: 'Inter, sans-serif' }}>
        {[
          { label: 'Calls', value: String(naCalls), sub: 'Need callback', color: '#CC2229', route: '/messages' },
          { label: "Jobs", value: String(naJobs), sub: 'Open', color: '#B5661E', route: '/jobs' },
          { label: "Enq's", value: String(naEnquiries), sub: 'New', color: '#1877D6', route: '/enquiries' },
        ].map((s) => (
          <button
            key={s.label}
            type="button"
            onClick={() => navigate({ to: s.route as never })}
            style={{
              flex: 1, background: '#FFFFFF', borderRadius: 10,
              boxShadow: '0 1px 3px rgba(0,0,0,0.06)', padding: 12, minWidth: 0,
              border: 'none', textAlign: 'left', cursor: 'pointer', fontFamily: 'Inter, sans-serif',
            }}
          >
            <div style={{ fontSize: 10, fontWeight: 700, color: s.color, textTransform: 'uppercase', letterSpacing: 0.3 }}>{s.label}</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: s.label === 'Jobs' ? '#1E8E3E' : '#0B1F3A', marginTop: 4, lineHeight: 1 }}>{s.value}</div>
            {s.label === 'Jobs' && claimedAwaitingPaymentCount > 0 ? (
              <div style={{ fontSize: 10, color: '#1877D6', marginTop: 4 }}>{claimedAwaitingPaymentCount} claimed</div>
            ) : s.label === 'Jobs' ? null : (
              <div style={{ fontSize: 10, color: '#8A93A3', marginTop: 4 }}>{s.sub}</div>
            )}
          </button>
        ))}
      </div>

      {/* ============ PUPIL REPLIES ============ */}
      {unreadMsgs.length > 0 && (
        <div
          style={{
            background: '#FFFFFF',
            borderRadius: 14,
            boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
            margin: '0 16px 12px',
            padding: 14,
            fontFamily: 'Inter, sans-serif',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#0B1F3A' }}>Pupil replies</div>
            <span style={{ background: '#E6F1FB', color: '#1877D6', fontSize: 11, fontWeight: 700, borderRadius: 999, padding: '2px 8px' }}>
              {unreadMsgs.length}
            </span>
          </div>
          {unreadMsgs.slice(0, 3).map((m, idx) => {
            const displayName = m.pupils?.first_name || m.pupils?.name || 'Pupil';
            const initial = displayName.trim().charAt(0).toUpperCase() || '?';
            const isNewest = idx === 0;
            const ago = (() => {
              const diff = Math.max(0, Date.now() - new Date(m.created_at).getTime());
              const mm = Math.floor(diff / 60000);
              if (mm < 1) return 'just now';
              if (mm < 60) return `${mm}m ago`;
              const h = Math.floor(mm / 60);
              if (h < 24) return `${h}h ago`;
              return `${Math.floor(h / 24)}d ago`;
            })();
            return (
              <div
                key={m.id}
                onClick={() => navigate({ to: '/messages' as never })}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: isNewest ? '8px 10px' : '6px 0',
                  cursor: 'pointer',
                  background: isNewest ? '#F0F7FF' : 'transparent',
                  borderRadius: isNewest ? 10 : 0,
                  marginBottom: isNewest ? 4 : 0,
                  borderLeft: isNewest ? '3px solid #1877D6' : '3px solid transparent',
                }}
              >
                <div
                  style={{
                    width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                    background: pupilColour(m.pupil_id, null, displayName),
                    color: '#FFFFFF', fontSize: 12, fontWeight: 700,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  {initial}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#0B1F3A' }}>{displayName}</div>
                  <div style={{ fontSize: 12, color: '#8A93A3', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {m.body || ''}
                  </div>
                </div>
                <div style={{ fontSize: 11, color: '#8A93A3', flexShrink: 0 }}>{ago}</div>
              </div>
            );
          })}
          {unreadMsgs.length > 3 && (
            <button
              type="button"
              onClick={() => navigate({ to: '/messages' as never })}
              style={{ background: 'none', border: 'none', padding: '8px 0 0', color: '#1877D6', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
            >
              See all {unreadMsgs.length} messages →
            </button>
          )}
        </div>
      )}

      {/* Next lesson section header */}
      {/* ============ NEXT LESSON CARD ============ */}

      <div
        style={{
          margin: '0 16px 0',
          background: '#FFFFFF',
          borderRadius: upcoming && heroExpanded ? '16px 16px 0 0' : 16,
          boxShadow: '0 4px 16px rgba(11,31,58,0.08)',
          overflow: 'hidden',
          fontFamily: 'Inter, sans-serif',
          position: 'relative',
        }}
      >
        {(() => {

          // ETA calculation
          let etaLabel: string | null = null;
          let lateMin = 0;
          let isLate = false;
          if (upcoming && driveData) {
            const startD = lessonDateTime(upcoming);
            const nowMs = Date.now();
            const msUntilStart = startD.getTime() - nowMs;
            if (msUntilStart > 0 && msUntilStart <= 12 * 60 * 60 * 1000) {
              const etaMs = nowMs + driveData.durationMinutes * 60000;
              lateMin = Math.round((etaMs - startD.getTime()) / 60000);
              etaLabel = new Date(etaMs).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
              isLate = lateMin >= 2;
            }
          }

          const pupilFullName = upcoming?.pupils?.name ?? '';
          const pupilFirstName = pupilFullName.split(/\s+/)[0] || 'there';

          // Adverse weather match
          const adverseKeywords = ['rain','snow','ice','storm','fog','wind','hail'];
          const weatherCondition = weatherData?.condition ?? '';
          const isAdverseWeather = !!weatherCondition &&
            adverseKeywords.some((k) => weatherCondition.toLowerCase().includes(k));

          // Community alert matched to pupil outcode
          const pupilPostcode = (upcoming?.pupils?.postcode ?? '').trim();
          const pupilOutcode = pupilPostcode.includes(' ')
            ? pupilPostcode.split(' ')[0].toUpperCase()
            : pupilPostcode.slice(0, Math.max(0, pupilPostcode.length - 3)).toUpperCase();
          const matchedAlert = pupilOutcode && Array.isArray(localAlerts)
            ? localAlerts.find((a: any) => a && a.is_active !== false &&
                String(a.outcode ?? '').toUpperCase() === pupilOutcode)
            : null;

          const showTraffic = !!driveData &&
            (driveData.trafficLabel === 'Moderate traffic' || driveData.trafficLabel === 'Heavy traffic');
          const anyReason = isLate && (showTraffic || isAdverseWeather || !!matchedAlert);

          // Payment / due
          const hStatus = (upcoming?.payment_status ?? 'unpaid').toLowerCase();
          const hAmountDue = Number(upcoming?.amount_due ?? 0);
          const isPaid = hStatus === 'paid' || hStatus === 'prepaid'
            || hAmountDue <= 0
            || Number((upcoming as any)?.paid_amount ?? 0) >= hAmountDue;
          const priceText = `£${hAmountDue.toFixed(2)}`;


          // Package info
          const pType = (upcoming?.pupils?.pricing_type ?? '').toLowerCase();
          const pTotal = Number(upcoming?.pupils?.block_hours_total ?? 0);
          const pHours = Number(upcoming?.pupils?.prepaid_hours ?? 0);
          const isOnPackage = pType === 'block' || pType === 'national_intensives' || (pType === '' && pHours > 0);
          const packageText = isOnPackage && pTotal > 0 ? `${Math.round(pHours)}/${Math.round(pTotal)} lessons` : null;

          // Date / time / duration
          const d = upcoming ? lessonDateTime(upcoming) : null;
          const fmt = (x: Date) => `${String(x.getHours()).padStart(2, '0')}:${String(x.getMinutes()).padStart(2, '0')}`;
          const startText = d ? fmt(d) : '—';
          const dur = upcoming?.duration_minutes ?? 0;
          const durationDecimal = dur ? (dur / 60).toFixed(dur % 60 === 0 ? 0 : 1) : '0';
          const pickup = upcoming?.pickup_location || [upcoming?.pupils?.address, upcoming?.pupils?.postcode].filter(Boolean).join(', ') || 'No pickup';

          const isOverdue = !isPaid && d ? d < todayStart : false;
          const hLabelFinal = isPaid ? 'Paid' : isOverdue ? 'Overdue' : 'Due';
          const hPillBgFinal = isPaid ? '#E5F4EA' : isOverdue ? '#FEECEC' : '#FEF3C7';
          const hPillFgFinal = isPaid ? '#1E9E5A' : isOverdue ? '#CC2229' : '#D97706';



          const openMaps = () => {
            if (driveData?.directionsUrl) {
              window.open(driveData.directionsUrl, '_blank');
            } else if (pickup && pickup !== 'No pickup') {
              window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(pickup)}&travelmode=driving`, '_blank');
            } else {
              toast('No pickup location');
            }
          };

          const endD = d && dur ? new Date(d.getTime() + dur * 60000) : null;
          const endText = endD ? fmt(endD) : null;
          const railDow = d ? d.toLocaleDateString('en-GB', { weekday: 'short' }).toUpperCase() : '—';
          const railDay = d ? String(d.getDate()) : '—';
          const railMon = d ? d.toLocaleDateString('en-GB', { month: 'short' }).toUpperCase() : '';
          const isLessonToday = upcoming && d ? ymd(d) === ymd(todayStart) : false;

          if (!upcoming) {
            return (
              <div style={{ padding: '14px 12px 20px', textAlign: 'center', color: '#8A93A3', fontSize: 12, fontFamily: 'Inter, sans-serif' }}>
                No upcoming lessons
              </div>
            );
          }

          return (
            <>
              {/* Header strip */}
              <div style={{
                background: '#EEF2F7',
                padding: '10px 14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 8,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 3, height: 12, borderRadius: 2, background: '#1877D6' }} />
                  <span style={{
                    fontSize: 11, fontWeight: 700, color: '#1877D6',
                    letterSpacing: '0.06em', textTransform: 'uppercase',
                    fontFamily: 'Poppins, sans-serif',
                  }}>
                    NEXT LESSON
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => navigate({ to: '/schedule' })}
                  style={{
                    background: 'none', border: 'none', padding: 0, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 2,
                    fontSize: 12, fontWeight: 600, color: '#1877D6',
                    fontFamily: 'Poppins, sans-serif',
                  }}
                >
                  Full schedule <ChevronRight size={14} />
                </button>
              </div>

              {/* Pupil row */}
              <div style={{
                padding: '14px 16px',
                display: 'flex', alignItems: 'flex-start', gap: 12,
                borderBottom: '1px solid #E4E8EF',
              }}>
                <PupilAvatar pupil={upcoming?.pupils ?? null} pupilId={upcoming?.pupil_id ?? null} size={36} />
                <div style={{ flex: 1, minWidth: 0, paddingTop: 1 }}>
                  <div style={{
                    fontSize: 18, fontWeight: 700, color: '#0B1F3A',
                    fontFamily: 'Poppins, sans-serif', lineHeight: 1.25,
                  }}>
                    {pupilFullName || 'Pupil'}
                  </div>
                  <div style={{
                    fontSize: 13, color: '#6B7686',
                    fontFamily: 'Poppins, sans-serif', marginTop: 3,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {(upcoming?.lesson_type?.replace(/\s+lesson$/i, '') || 'Standard')} · {durationDecimal}hr{packageText ? ` · ${packageText}` : ''}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); const phone = upcoming?.pupils?.phone; if (phone) window.location.href = `tel:${phone}`; }}
                    style={{
                      width: 32, height: 32, borderRadius: '50%', background: '#EEF2F7', border: 'none',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                    }}
                  >
                    <Phone size={16} color="#0B1F3A" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); navigate({ to: '/pupils/$id', params: { id: upcoming?.pupil_id ?? '' }, search: { lessonId: upcoming?.id } as any }); }}
                    style={{
                      width: 32, height: 32, borderRadius: '50%', background: '#EEF2F7', border: 'none',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                    }}
                  >
                    <MessageSquare size={16} color="#0B1F3A" />
                  </button>
                </div>
              </div>

              {/* Date / Time / Price grid */}
              <div style={{
                display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
                alignItems: 'stretch', padding: '12px 16px',
                borderBottom: '1px solid #E4E8EF',
              }}>
                {/* Date column */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingRight: 12, borderRight: '1px solid #E4E8EF' }}>
                  <span style={{ width: 3, height: 32, borderRadius: 2, background: '#1877D6' }} />
                  <div>
                    <div style={{
                      fontSize: 28, fontWeight: 700, color: '#0B1F3A', lineHeight: 1,
                      fontFamily: 'Poppins, sans-serif',
                    }}>
                      {railDay}
                    </div>
                    <div style={{
                      fontSize: 10, fontWeight: 600, color: '#6B7686',
                      textTransform: 'uppercase', letterSpacing: '0.04em', marginTop: 2,
                      fontFamily: 'Poppins, sans-serif',
                    }}>
                      {railDow}, {railMon}
                    </div>
                  </div>
                </div>

                {/* Time column */}
                <div style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  padding: '0 12px', borderRight: '1px solid #E4E8EF', gap: 3,
                }}>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 4,
                    fontSize: 10, fontWeight: 600, color: '#6B7686',
                    textTransform: 'uppercase', letterSpacing: '0.04em',
                    fontFamily: 'Poppins, sans-serif',
                  }}>
                    <Clock size={12} color="#6B7686" />
                    TIME
                  </div>
                  <div style={{
                    fontSize: 14, fontWeight: 700, color: '#0B1F3A',
                    fontFamily: 'Poppins, sans-serif',
                  }}>
                    {startText}
                  </div>
                </div>

                {/* Price column */}
                <div style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  paddingLeft: 12, gap: 4,
                }}>
                  <div style={{
                    fontSize: 10, fontWeight: 600, color: '#6B7686',
                    textTransform: 'uppercase', letterSpacing: '0.04em',
                    fontFamily: 'Poppins, sans-serif',
                  }}>
                    PRICE
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {isPaid && (
                      <span style={{
                        background: '#E4F5EA', color: '#2E7D4F',
                        fontSize: 10, fontWeight: 600, padding: '2px 6px', borderRadius: 7,
                        fontFamily: 'Poppins, sans-serif',
                      }}>
                        Paid
                      </span>
                    )}
                    <span style={{
                      fontSize: 17, fontWeight: 700, color: '#0B1F3A',
                      fontFamily: 'Poppins, sans-serif',
                    }}>
                      {priceText}
                    </span>
                  </div>
                </div>

              </div>

              {/* Reasons row */}
              {anyReason && (
                <div style={{
                  marginTop: 0, padding: '10px 16px',
                  display: 'flex', flexDirection: 'column', gap: 3,
                  fontSize: 11, color: '#5A6270',
                  borderBottom: '1px solid #E4E8EF',
                }}>
                  {showTraffic && driveData && (
                    <div>🚦 {driveData.trafficLabel} on your route
                      {driveData.normalDurationMinutes && driveData.durationMinutes
                        ? ` (${driveData.normalDurationMinutes}m → ${driveData.durationMinutes}m)`
                        : ''}
                    </div>
                  )}
                  {isAdverseWeather && <div>⛅ {weatherCondition}</div>}
                  {matchedAlert && <div style={{ fontSize: 'clamp(10px, 3vw, 11px)', lineHeight: 1.35, color: '#B45309' }}>⚠️ {(matchedAlert as any).description}</div>}
                </div>
              )}

              {/* Late banner */}
              {isLate && (
                <div style={{
                  background: '#FEECEC', padding: '8px 12px',
                  borderBottom: '1px solid #F5D5D5',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
                }}>
                  <span style={{ fontSize: 11, color: '#7A1F1F', fontWeight: 500, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    Arriving ~{etaLabel} — let {pupilFirstName} know?
                  </span>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setLateOpen(true); }}
                    style={{
                      background: '#CC2229', color: '#FFFFFF', border: 'none',
                      fontSize: 11, fontWeight: 700, padding: '5px 10px', borderRadius: 999,
                      cursor: 'pointer', flexShrink: 0, fontFamily: 'Poppins, sans-serif',
                    }}
                  >Notify pupil</button>
                </div>
              )}

              {/* Address row */}
              <div style={{
                padding: '12px 16px',
                display: 'flex', alignItems: 'center', gap: 8,
                borderBottom: '1px solid #E4E8EF',
              }}>
                <MapPin size={16} color="#6B7686" style={{ flexShrink: 0 }} />
                <span style={{
                  flex: 1, fontSize: 12, color: '#6B7686',
                  fontFamily: 'Poppins, sans-serif',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {pickup}
                </span>
              </div>

              {/* Footer / More */}
              <div style={{
                padding: '11px 16px',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
              }}>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); openMaps(); }}
                  style={{
                    background: 'none', border: 'none', padding: 0, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 4,
                    fontSize: 13, fontWeight: 600, color: '#1877D6',
                    fontFamily: 'Poppins, sans-serif',
                  }}
                >
                  <Navigation size={16} />
                  View route{driveData ? ` · ${driveData.durationMinutes} min` : ''}
                  {weatherData?.tempC != null && (
                    <>
                      <span style={{ color: '#6B7686', margin: '0 2px' }}>·</span>
                      <Sun size={15} color="#E0A020" />
                      <span style={{ fontSize: 13, color: '#6B7686', fontFamily: 'Poppins, sans-serif', fontWeight: 400 }}>
                        {Math.round(weatherData.tempC)}°
                      </span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setHeroExpandedWithEvent((v) => !v)}
                  style={{
                    background: 'none', border: 'none', padding: 0, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 4,
                    fontSize: 13, fontWeight: 600, color: '#0B1F3A',
                    fontFamily: 'Poppins, sans-serif',
                  }}
                >
                  More {heroExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
              </div>
            </>
          );


        })()}
      </div>



      {upcoming && heroExpanded && (
        <LessonActionsSheet
          open={heroExpanded}
          onClose={() => setHeroExpandedWithEvent(false)}
          lesson={upcoming as any}
          prev={prevLesson as any}
          goingActive={goingActive}
          setGoingActive={setGoingActive}
          onOpenLate={() => setLateOpen(true)}
          onOpenLesson={() => navigate({ to: "/pupils/$id", params: { id: upcoming.pupil_id } as any, search: { lessonId: upcoming.id } as any })}
          onEol={() => setEolLesson(upcoming)}
          userId={userId}
        />
      )}


        {/* Late sheet */}
        <Dialog open={lateOpen} onOpenChange={setLateOpen}>
          <DialogContent className="max-w-[320px]">
            <DialogHeader>
              <DialogTitle style={{ fontFamily: 'Inter, sans-serif' }}>How many minutes late?</DialogTitle>
            </DialogHeader>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginTop: 8 }}>
              {[5, 10, 15, 20].map((m) => (
                <button
                  key={m}
                  onClick={async () => {
                    const phone = upcoming?.pupils?.phone ?? null;
                    const pupilIdVal = upcoming?.pupil_id ?? null;
                    const first = (upcoming?.pupils?.name ?? 'there').split(/\s+/)[0];
                    if (!userId || !pupilIdVal) { toast('Unable to send'); setLateOpen(false); return; }
                    const body = `Hi ${first}, running ${m} mins late, sorry!`;
                    try {
                      if (phone) {
                        const { error: smsErr } = await supabase.from('sms_queue').insert({
                          instructor_id: userId, pupil_phone: phone, message: body,
                        });
                        if (smsErr) console.error('[home] sms_queue insert failed', smsErr);
                      }
                      const { error: chatErr } = await supabase.from('chat_messages').insert({
                        instructor_id: userId, pupil_id: pupilIdVal,
                        sender_type: 'instructor', sender_id: userId, body,
                      });
                      if (chatErr) throw chatErr;
                      toast.success(`Sent "running ${m}m late"`);
                    } catch (err) {
                      console.error('[home] late notify failed', err);
                      toast.error('Could not send message');
                    }
                    setLateOpen(false);
                  }}
                  style={{ height: 44, borderRadius: 10, border: '1px solid #e3e6ec', background: '#fff', fontFamily: 'Inter, sans-serif', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}
                >{m}m</button>
              ))}
            </div>
          </DialogContent>
        </Dialog>




        {/* ============ LOCAL ISSUES + LOCAL CHAT (unified card) ============ */}
        {((localAlerts !== null && localAlerts.length > 0) || localRoom || joinedRoomChats.length > 0) && (() => {
          const NAVY_C = '#0B1F3A';
          const GREY_C = '#6B7686';
          const BORDER_C = '#E4E8EF';
          const GREEN_C = '#1E9E5A';
          const AMBER_C = '#D97706';
          const RED_C = '#CC2229';
          const PF_C = 'Poppins, sans-serif';

          const severityOf = (a: any): string => {
            const txt = `${a?.alert_type ?? ''} ${a?.description ?? ''}`.toLowerCase();
            if (/closed|closure|crash|collision|accident|blocked/.test(txt)) return RED_C;
            if (/broken|breakdown|broken down|lane|roadworks|works|queue|delay|hazard|flood/.test(txt)) return AMBER_C;
            return GREEN_C;
          };
          const rank = (c: string) => (c === RED_C ? 3 : c === AMBER_C ? 2 : 1);

          const allAlerts = Array.isArray(localAlerts) ? localAlerts : [];
          const alerts = allAlerts.filter((a: any) => !isRowMuted(`alert:${a?.id}`));
          const alertsHidden = isRowMuted('alerts') || alerts.length === 0;
          const localChatHidden = !localRoom || isRowMuted('localchat');
          const visibleRooms = joinedRoomChats.filter((r) => !isRowMuted(`room:${r.id}`));
          const mutedCount = Object.keys(mutedRows).filter((k) => isRowMuted(k)).length;
          if (alertsHidden && localChatHidden && visibleRooms.length === 0 && mutedCount === 0) return null;

          const topAlert = alerts.length
            ? [...alerts].sort((a: any, b: any) => {
                // Instructor alerts always beat TomTom
                const aIsInstructor = !a.source || a.source !== 'tomtom';
                const bIsInstructor = !b.source || b.source !== 'tomtom';
                if (aIsInstructor !== bIsInstructor) return bIsInstructor ? 1 : -1;
                // Then by severity
                const d = rank(severityOf(b)) - rank(severityOf(a));
                if (d !== 0) return d;
                // Then by recency
                return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
              })[0]
            : null;
          const sevColor = topAlert ? severityOf(topAlert) : GREEN_C;
          const alertPreview = topAlert
            ? topAlert.source === 'tomtom'
              ? [topAlert.alert_type, topAlert.location_name]
                  .filter(Boolean).join(' · ') || topAlert.description || 'Traffic issue nearby'
              : topAlert.description || topAlert.alert_type || 'Active issue nearby'
            : '';

          const HOUR = 3600_000;
          const rowMenu = (key: string, name: string, extra: QuickAction[] = []): QuickAction[] => [
            ...extra,
            { label: 'Mute for 8 hours', onClick: () => muteRow(key, 8 * HOUR, `${name} muted for 8 hours`, `${name} unmuted`) },
            { label: 'Mute for 7 days', onClick: () => muteRow(key, 7 * 24 * HOUR, `${name} muted for 7 days`, `${name} unmuted`) },
            { label: 'Dismiss', onClick: () => muteRow(key, 365 * 24 * HOUR, `${name} dismissed`, `${name} restored`), destructive: true },
          ];
          const MenuButton = ({ items }: { items: QuickAction[] }) => (
            <div onClick={(e) => e.stopPropagation()} style={{ flexShrink: 0 }}>
              <QuickActionsMenu
                items={items}
                trigger={({ onClick }) => (
                  <button
                    type="button"
                    aria-label="Row options"
                    onClick={onClick}
                    style={{
                      background: 'none', border: 'none', padding: 4, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    <MoreHorizontal size={16} color={GREY_C} />
                  </button>
                )}
              />
            </div>
          );


          const HazardIcon = (
            <svg width={26} height={26} viewBox="0 0 26 26" style={{ flexShrink: 0, display: 'block' }} aria-hidden="true">
              <path d="M13 2.6 L24.4 22.4 H1.6 Z" fill="#FFFFFF" stroke={RED_C} strokeWidth={3} strokeLinejoin="round" />
              <rect x="11.85" y="9.4" width="2.3" height="7.1" rx="1.15" fill="#111111" />
              <circle cx="13" cy="18.9" r="1.35" fill="#111111" />
            </svg>
          );

          

          const RoomAvatar = ({
            imageUrl,
            name,
            size = 32,
          }: {
            imageUrl: string | null;
            name: string | null;
            size?: number;
          }) => {
            if (imageUrl) {
              return (
                <img
                  src={imageUrl}
                  alt={name || 'Chat room'}
                  style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, display: 'block' }}
                />
              );
            }
            const initials = (name || 'C')
              .split(' ')
              .map((w) => w[0])
              .filter(Boolean)
              .slice(0, 2)
              .join('')
              .toUpperCase();
            return (
              <div
                style={{
                  width: size,
                  height: size,
                  borderRadius: '50%',
                  background: '#1877D6',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: size * 0.4,
                  fontWeight: 700,
                  flexShrink: 0,
                  fontFamily: PF_C,
                }}
              >
                {initials}
              </div>
            );
          };

          const pupilReplies = unreadMsgs.filter((m) => !m.read_at).slice(0, 2);
          const pupilName = (m: (typeof unreadMsgs)[number]) =>
            m.pupils?.name || m.pupils?.first_name || 'Pupil';
          const initialsOf = (n: string) =>
            n.split(' ').map((w) => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();

          // ---- Counts ----
          const adminRoom = visibleRooms.find((r) =>
            /admin/i.test(r.area_name || r.outcode || ''),
          );
          const adminUnread = adminRoom?.unread ?? 0;
          const totalUnreadChat =
            unreadChat + unreadUkChat +
            joinedRoomChats.reduce((s, r) => s + (r.unread ?? 0), 0);

          // ---- Avatar stack (max 4, one per type) ----
          type StackItem = { key: string; bg: string; node: React.ReactNode };
          const avatarItems: StackItem[] = [];
          if (!alertsHidden && alerts.length > 0) {
            avatarItems.push({ key: 'issues', bg: RED_C, node: <AlertTriangle size={15} color="#FFFFFF" /> });
          }
          if (adminUnread > 0) {
            avatarItems.push({ key: 'admin', bg: '#92400E', node: <Megaphone size={15} color="#FFFFFF" /> });
          }
          const firstPupil = pupilReplies[0];
          if (firstPupil) {
            avatarItems.push({
              key: 'pupils', bg: '#1877D6',
              node: <>{(pupilName(firstPupil) || 'P')[0].toUpperCase()}</>,
            });
          }
          if (totalUnreadChat > 0) {
            avatarItems.push({ key: 'chat', bg: '#7C3AED', node: <IconMessageCircle size={15} color="#FFFFFF" /> });
          }
          const isQuiet = avatarItems.length === 0;
          const stack = avatarItems.slice(0, 4);

          const Badge = ({ colour, value }: { colour: string; value: number }) => (
            <span style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              minWidth: 16, height: 16, borderRadius: 8, background: colour,
              color: '#FFFFFF', fontSize: 9, fontWeight: 700, fontFamily: PF_C,
              padding: '0 3px', marginLeft: 2,
            }}>
              {value}
            </span>
          );
          const Label = ({ text, colour, count }: { text: string; colour: string; count: number }) => (
            <span style={{
              display: 'inline-flex', alignItems: 'center',
              fontSize: 11, fontFamily: PF_C,
              color: count > 0 ? colour : '#9CA3AF',
              fontWeight: count > 0 ? 600 : 400,
            }}>
              {text}
              {count > 0 && <Badge colour={colour} value={count} />}
            </span>
          );
          const Sep = () => <span style={{ color: BORDER_C, fontSize: 11 }}>·</span>;

          

          const rowBase: React.CSSProperties = {
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '11px 14px', cursor: 'pointer',
            borderTop: `0.5px solid ${BORDER_C}`,
          };
          const labelStyle: React.CSSProperties = { fontSize: 12, fontWeight: 600, color: NAVY_C, fontFamily: PF_C };
          const timeStyle: React.CSSProperties = { fontSize: 10, color: GREY_C, fontFamily: PF_C, flexShrink: 0 };

          return (
            <>
              <SectionHeader style={{ margin: '16px 16px 4px' }}>Local Issues</SectionHeader>
              <div style={{
                margin: '0 16px', background: '#FFFFFF', borderRadius: 16,
                border: `1px solid ${BORDER_C}`, overflow: 'hidden', fontFamily: PF_C,
              }}>

              {/* ---- HEADER ---- */}
              <div
                onClick={() => setCommunityExpanded((v) => !v)}
                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', cursor: 'pointer' }}
              >
                <div style={{ display: 'flex', flexDirection: 'row-reverse', flexShrink: 0 }}>
                  {isQuiet ? (
                    <div style={{
                      width: 32, height: 32, borderRadius: '50%', background: '#D1D5DB',
                      border: '2.5px solid #FFFFFF', boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}>
                      <Users size={15} color="#6B7280" />
                    </div>
                  ) : (
                    [...stack].reverse().map((it, i) => (
                      <div
                        key={it.key}
                        style={{
                          width: 32, height: 32, borderRadius: '50%', background: it.bg,
                          border: '2.5px solid #FFFFFF', color: '#FFFFFF',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
                          fontSize: 11, fontWeight: 700, fontFamily: PF_C,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          overflow: 'hidden', flexShrink: 0,
                          marginLeft: i === stack.length - 1 ? 0 : -10,
                        }}
                      >
                        {it.node}
                      </div>
                    ))
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: NAVY_C, fontFamily: PF_C }}>Community</div>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 6, marginTop: 3,
                    flexWrap: 'nowrap', overflow: 'hidden',
                  }}>
                    <Label text="Issues" colour={RED_C} count={alerts.length} />
                    <Sep />
                    <Label text="Chat" colour="#7C3AED" count={totalUnreadChat} />
                    <Sep />
                    <Label text="Pupils" colour="#1877D6" count={pupilReplies.length} />
                    <Sep />
                    <Label text="Admin" colour="#92400E" count={adminUnread} />
                  </div>
                </div>
                {communityExpanded
                  ? <ChevronUp size={14} color="#9CA3AF" style={{ flexShrink: 0 }} />
                  : <ChevronDown size={14} color="#9CA3AF" style={{ flexShrink: 0 }} />}
              </div>

              {communityExpanded && (
                <>
                  {/* ROW 1 — Alerts */}
                  {!alertsHidden && (
                    <div onClick={() => navigate({ to: '/community', search: { tab: 'alerts' } })} style={rowBase}>
                      <div style={{ position: 'relative', flexShrink: 0 }}>
                        <div style={{
                          width: 36, height: 36, borderRadius: '50%', background: '#FCE9E9',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          <AlertTriangle size={18} color={RED_C} />
                        </div>
                        <span style={{
                          position: 'absolute', top: -2, right: -4, minWidth: 16, height: 16,
                          borderRadius: 999, background: RED_C, color: '#FFFFFF',
                          fontSize: 9, fontWeight: 700, fontFamily: PF_C, padding: '0 4px',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          {alerts.length}
                        </span>
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={labelStyle}>Local issues</div>
                        <div style={{
                          fontSize: 11, fontWeight: 600, color: RED_C, fontFamily: PF_C,
                          whiteSpace: 'normal', overflowWrap: 'break-word', lineHeight: '1.35',
                        }}>
                          {alertPreview}
                        </div>
                      </div>
                      {topAlert?.created_at && <div style={timeStyle}>{timeAgo(topAlert.created_at)}</div>}
                      <MenuButton
                        items={rowMenu('alerts', 'Local issues', topAlert?.id ? [{
                          label: 'Dismiss this alert',
                          onClick: () => muteRow(`alert:${topAlert.id}`, 365 * 24 * HOUR, 'Alert dismissed', 'Alert restored'),
                        }] : [])}
                      />
                    </div>
                  )}

                  {/* ROW 2 — Pupil messages */}
                  {pupilReplies.map((m) => (
                    <div
                      key={m.id}
                      onClick={() => navigate({ to: '/messages/$pupilId', params: { pupilId: m.pupil_id } })}
                      style={rowBase}
                    >
                      <div style={{ position: 'relative', flexShrink: 0 }}>
                        <div style={{
                          width: 36, height: 36, borderRadius: '50%', background: '#1877D6',
                          color: '#FFFFFF', fontSize: 13, fontWeight: 700, fontFamily: PF_C,
                          display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
                        }}>
                          {m.pupils?.profile_image_url
                            ? <img src={m.pupils.profile_image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            : initialsOf(pupilName(m))}
                        </div>
                        <span style={{
                          position: 'absolute', bottom: -1, right: -1, width: 10, height: 10,
                          borderRadius: '50%', background: RED_C, border: '2px solid #FFFFFF',
                        }} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={labelStyle}>{pupilName(m)}</div>
                        <div style={{
                          fontSize: 11, fontWeight: 700, color: NAVY_C, fontFamily: PF_C,
                          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                        }}>
                          {(m.body || '').substring(0, 48)}{(m.body || '').length > 48 ? '…' : ''}
                        </div>
                      </div>
                      <div style={timeStyle}>{timeAgo(m.created_at)}</div>
                    </div>
                  ))}

                  {/* ROW 3 — Local chat */}
                  {!localChatHidden && localRoom && (
                    <div onClick={() => navigate({ to: '/community', search: { tab: 'local' } })} style={rowBase}>
                      <div style={{ position: 'relative', flexShrink: 0 }}>
                        <div style={{
                          width: 36, height: 36, borderRadius: '50%', background: NAVY_C,
                          display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
                        }}>
                          {localRoom.image_url
                            ? <img src={localRoom.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            : <IconMessageCircle size={18} color="#FFFFFF" />}
                        </div>
                        {unreadChat > 0 && (
                          <span style={{
                            position: 'absolute', top: -2, right: -4, minWidth: 16, height: 16,
                            borderRadius: 999, background: '#7C3AED', color: '#FFFFFF',
                            fontSize: 9, fontWeight: 700, fontFamily: PF_C, padding: '0 4px',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}>
                            {unreadChat}
                          </span>
                        )}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={labelStyle}>{localRoom.area_name} Local Chat</div>
                        <div style={{
                          fontSize: 11, fontWeight: unreadChat > 0 ? 700 : 500,
                          color: unreadChat > 0 ? NAVY_C : GREY_C, fontFamily: PF_C,
                          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                        }}>
                          {localChatLatest
                            ? `${(localChatLatest.instructors?.name?.split(' ')[0]) || 'Someone'}: ${(localChatLatest.message || '').substring(0, 40)}${(localChatLatest.message || '').length > 40 ? '…' : ''}`
                            : `Be the first to chat in ${localRoom.area_name}!`}
                        </div>
                      </div>
                      {localChatLatest?.created_at && <div style={timeStyle}>{timeAgo(localChatLatest.created_at)}</div>}
                      <MenuButton items={rowMenu('localchat', 'Local chat')} />
                    </div>
                  )}

                  {/* ROW 4 — Joined rooms */}
                  {visibleRooms.map((room) => (
                    <div
                      key={room.id}
                      onClick={() => navigate({ to: '/community', search: { tab: 'rooms' } })}
                      style={rowBase}
                    >
                      <div style={{ position: 'relative', flexShrink: 0 }}>
                        <div style={{
                          width: 36, height: 36, borderRadius: '50%', background: '#7C3AED',
                          color: '#FFFFFF', fontSize: 13, fontWeight: 700, fontFamily: PF_C,
                          display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
                        }}>
                          {room.image_url
                            ? <img src={room.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            : initialsOf(room.area_name || room.outcode || 'C')}
                        </div>
                        {room.unread > 0 && (
                          <span style={{
                            position: 'absolute', top: -2, right: -4, minWidth: 16, height: 16,
                            borderRadius: 999, background: '#7C3AED', color: '#FFFFFF',
                            fontSize: 9, fontWeight: 700, fontFamily: PF_C, padding: '0 4px',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}>
                            {room.unread}
                          </span>
                        )}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={labelStyle}>{room.area_name || room.outcode}</div>
                        <div style={{
                          fontSize: 11, fontWeight: room.unread > 0 ? 700 : 500,
                          color: room.unread > 0 ? NAVY_C : GREY_C, fontFamily: PF_C,
                          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                        }}>
                          {`${(room.latest?.instructors?.name?.split(' ')[0]) || 'Someone'}: ${(room.latest?.message || '').substring(0, 40)}${(room.latest?.message || '').length > 40 ? '…' : ''}`}
                        </div>
                      </div>
                      {room.latest?.created_at && <div style={timeStyle}>{timeAgo(room.latest.created_at)}</div>}
                      <MenuButton items={rowMenu(`room:${room.id}`, `${room.area_name || room.outcode} chat`)} />
                    </div>
                  ))}


                  <div
                    onClick={() => navigate({ to: '/community' })}
                    style={{
                      padding: '9px 14px', fontSize: 12, fontWeight: 500, color: '#1877D6',
                      fontFamily: PF_C, cursor: 'pointer', borderTop: `0.5px solid ${BORDER_C}`,
                    }}
                  >
                    See all in Community →
                  </div>

                  {mutedCount > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        persistMutedRows({});
                        toast.success('Muted items restored');
                      }}
                      style={{
                        width: '100%', textAlign: 'center', padding: '10px 16px',
                        background: '#F7F9FC', border: 'none',
                        borderTop: `0.5px solid ${BORDER_C}`,
                        fontSize: 12, fontWeight: 600, color: GREY_C, fontFamily: PF_C, cursor: 'pointer',
                      }}
                    >
                      {mutedCount} muted · Show all
                    </button>
                  )}
                </>
              )}

            </div>
            </>
          );
        })()}


        {/* ============ NATIONAL CHAT ============ */}
        {ukRoom && (
          <div
            onClick={() => navigate({ to: '/community', search: { tab: 'uk' } })}
            style={{
              margin: '8px 16px 0', background: 'white', borderRadius: 14,
              boxShadow: '0 2px 8px rgba(11,31,58,0.06)', padding: '13px 14px',
              display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer',
              fontFamily: 'Poppins, sans-serif',
              border: unreadUkChat > 0 ? '1.5px solid #1877D6' : '1px solid transparent',
            }}
          >
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <div style={{
                width: 36, height: 36, borderRadius: 11,
                background: unreadUkChat > 0 ? '#1877D6' : '#E6F1FB',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Globe size={18} color={unreadUkChat > 0 ? '#FFFFFF' : '#1877D6'} />
              </div>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#0B1F3A', fontFamily: 'Poppins, sans-serif' }}>
                DSM National Chat
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 1 }}>
                <div style={{
                  fontSize: unreadUkChat > 0 ? 12 : 11,
                  fontWeight: unreadUkChat > 0 ? 600 : 400,
                  color: unreadUkChat > 0 ? '#0B1F3A' : '#9CA3AF',
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1, minWidth: 0,
                  fontFamily: 'Poppins, sans-serif',
                }}>
                  {ukChatLatest
                    ? `${(ukChatLatest.instructors?.name?.split(' ')[0]) || 'Someone'}: ${(ukChatLatest.message || '').substring(0, 40)}${(ukChatLatest.message || '').length > 40 ? '...' : ''}`
                    : 'Join the national conversation!'}
                </div>
                {ukChatLatest?.created_at && (
                  <div style={{
                    fontSize: 10, color: unreadUkChat > 0 ? '#1877D6' : '#9CA3AF', flexShrink: 0,
                    fontFamily: 'Poppins, sans-serif',
                  }}>
                    {timeAgo(ukChatLatest.created_at)}
                  </div>
                )}
              </div>
            </div>
            {unreadUkChat > 0 && (
              <div style={{
                width: 16, height: 16, borderRadius: 8, flexShrink: 0,
                background: '#1877D6', color: '#FFFFFF', fontSize: 10, fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'Poppins, sans-serif',
              }}>
                {unreadUkChat}
              </div>
            )}
            <ChevronRight size={17} color="#C7CDD9" style={{ flexShrink: 0 }} />
          </div>
        )}





      {/* ============ REDESIGNED HOME BODY (Poppins, Tabler, light) ============ */}
      {(() => {
        const PF = 'Inter, sans-serif';
        const BORDER = 'rgba(15,32,68,0.10)';
        const MUTED = '#64748B';
        const NAVY = '#0B1F3A';
        const ACCENT = '#1877D6';
        const DANGER = '#C9302C';
        const AMBER_BG = '#FEF3C7';
        const AMBER_FG = '#92400E';
        const PURPLE_BG = '#EDE9FE';
        const PURPLE_FG = '#6D28D9';

        const activeList = tab === 'today' ? todayLessons : tab === 'tomorrow' ? tomorrowLessons : nextTabLessons;
        const scheduleCounts = {
          today: todayLessons.length + todayBlocks.length,
          tomorrow: tomorrowLessons.length + tomorrowBlocks.length,
          next: nextTabLessons.length,
        };
        const sorted = [...activeList].sort((a, b) => {
          const ad = `${a.lesson_date}T${a.lesson_time ?? '00:00'}`;
          const bd = `${b.lesson_date}T${b.lesson_time ?? '00:00'}`;
          return ad.localeCompare(bd);
        });
        const nowT = new Date();
        const fmt24 = (d: Date) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

        type Row =
          | { kind: 'lesson'; l: LessonRow }
          | { kind: 'gap'; start: Date; mins: number }
          | { kind: 'calendar'; title: string; start: Date; end: Date };
        const rows: Row[] = [];
        const whStartStr = workingHours?.start_time ? String(workingHours.start_time) : '09:00';
        const whEndStr = workingHours?.end_time ? String(workingHours.end_time) : '18:00';

        // Resolve per-day working hours for today/tomorrow from per_day_hours if present.
        const resolveDayHours = (d: Date): { start: string; end: string } => {
          const dayKeys = ['sun','mon','tue','wed','thu','fri','sat'] as const;
          const dayKeyToName: Record<string, string> = {
            sun: 'Sunday', mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday',
            thu: 'Thursday', fri: 'Friday', sat: 'Saturday',
          };
          const name = dayKeyToName[dayKeys[d.getDay()]];
          const perDay = (workingHours as Record<string, unknown> | null | undefined)?.per_day_hours as Record<string, { start?: string; end?: string; active?: boolean }> | null | undefined;
          const cfg = perDay?.[name];
          if (cfg?.active === false) return { start: whStartStr, end: whStartStr }; // zero-width window → no gaps
          return { start: cfg?.start || whStartStr, end: cfg?.end || whEndStr };
        };

        if (tab === 'today' || tab === 'tomorrow') {
          const baseDate = tab === 'today' ? todayStart : tomorrowStart;
          const dateStr = tab === 'today' ? todayISO : tomorrowISO;
          const isToday = tab === 'today';
          const { start: dayStart, end: dayEnd } = resolveDayHours(baseDate);

          // Emit lesson rows.
          for (const l of sorted) rows.push({ kind: 'lesson', l });

          // Compute gaps via the shared canonical implementation (subtracts calendar blocks correctly).
          const computed = computeDayGaps({
            dayLessons: sorted.map((l) => ({
              lesson_time: l.lesson_time || '',
              duration_minutes: l.duration_minutes ?? 60,
              status: l.status,
              bufferAfterMinutes: (l.pupil_id && pupilBufferMap[l.pupil_id]?.after) ?? null,
            })),
            calendarBlocks: (visibleCalendarBlocks || []).map((b) => ({
              start_datetime: b.start_datetime,
              end_datetime: b.end_datetime,
              title: b.title,
            })),
            recurringBlocks: [],
            dayTimeOff: [],
            dayStart,
            dayEnd,
            instructorBufferAfter,
            dateStr,
            isToday,
            minGapMinutes,
          });
          for (const g of computed) {
            const s = new Date(baseDate);
            s.setHours(0, 0, 0, 0);
            s.setMinutes(g.startMins);
            rows.push({ kind: 'gap', start: s, mins: g.gapMins });
          }
        } else {
          // 'next' tab: lesson-to-lesson only (calendar blocks not fetched for arbitrary future dates).
          const [whSh, whSm] = whStartStr.split(':').map(Number);
          const [whEh, whEm] = whEndStr.split(':').map(Number);
          for (let i = 0; i < sorted.length; i++) {
            const l = sorted[i];
            rows.push({ kind: 'lesson', l });
            const next = sorted[i + 1];
            if (!next) continue;
            if (l.lesson_date !== next.lesson_date) continue;
            const endThis = new Date(lessonDateTime(l).getTime() + (l.duration_minutes ?? 60) * 60000);
            const afterBuf = (l.pupil_id && pupilBufferMap[l.pupil_id]?.after) || 0;
            const rawGapStart = new Date(endThis.getTime() + afterBuf * 60000);
            const rawNextStart = lessonDateTime(next);
            const dayWorkStart = new Date(rawGapStart);
            dayWorkStart.setHours(whSh || 9, whSm || 0, 0, 0);
            const dayWorkEnd = new Date(rawGapStart);
            dayWorkEnd.setHours(whEh || 18, whEm || 0, 0, 0);
            const gapStart = new Date(Math.max(rawGapStart.getTime(), dayWorkStart.getTime()));
            const gapEnd = new Date(Math.min(rawNextStart.getTime(), dayWorkEnd.getTime()));
            const mins = Math.round((gapEnd.getTime() - gapStart.getTime()) / 60000);
            if (mins >= minGapMinutes) rows.push({ kind: 'gap', start: gapStart, mins });
          }
        }


        // Insert calendar blocks for today/tomorrow (not 'next' — blocksForDate isn't computed for arbitrary future dates).
        if (tab === 'today' || tab === 'tomorrow') {
          const baseDate = tab === 'today' ? todayStart : tomorrowStart;
          const blocks = tab === 'today' ? todayBlocks : tomorrowBlocks;
          for (const b of blocks) {
            const s = new Date(baseDate);
            s.setHours(0, 0, 0, 0);
            s.setMinutes(b.start);
            const e = new Date(baseDate);
            e.setHours(0, 0, 0, 0);
            e.setMinutes(b.end);
            rows.push({ kind: 'calendar', title: b.title, start: s, end: e });
          }
        }

        // Re-sort chronologically so lessons, gaps, and calendar events interleave in real time order.
        rows.sort((a, b) => {
          const at = a.kind === 'lesson' ? lessonDateTime(a.l).getTime() : a.start.getTime();
          const bt = b.kind === 'lesson' ? lessonDateTime(b.l).getTime() : b.start.getTime();
          return at - bt;
        });

        const todayGapCount = rows.filter((r) => r.kind === 'gap').length;

        const currentLesson = sorted.find((l) => {
          const s = lessonDateTime(l);
          const e = new Date(s.getTime() + (l.duration_minutes ?? 60) * 60000);
          return nowT >= s && nowT < e;
        });
        const nextLesson = sorted.find((l) => lessonDateTime(l) > nowT && l.status !== "cancelled");
        const owedPupil = (() => {
          const top = outstandingBreakdown[0];
          if (top && top.amount > 0) {
            return {
              name: top.firstName || top.name.split(' ')[0],
              amount: top.amount,
              phone: top.phone ?? '',
            };
          }
          for (const l of sorted) {
            const amt = Number(l.amount_due ?? 0);
            const status = (l.payment_status ?? '').toLowerCase();
            const prepaidPupil = Number((l.pupils as any)?.prepaid_hours ?? 0) > 0;
            if (amt > 0 && status !== 'paid' && status !== 'prepaid' && !prepaidPupil) {
              return { name: (l.pupils?.first_name ?? pupilName(l)).split(' ')[0], amount: amt, phone: l.pupils?.phone ?? '' };
            }
          }
          return null;
        })();
        let aiInsight: { text: string; cta?: string; to?: string; onAction?: () => void; actionLabel?: string } | null = null;
        if (currentLesson) {
          aiInsight = { text: `Lesson with ${(currentLesson.pupils?.first_name ?? pupilName(currentLesson)).split(' ')[0]} in progress. Log end-of-lesson notes when you finish.`, cta: 'Open', to: '/live' };
        } else if (owedPupil) {
          aiInsight = {
            text: `${owedPupil.name} owes £${owedPupil.amount.toFixed(0)}.`,
            actionLabel: 'Remind',
            onAction: () => {
              if (!owedPupil.phone) { toast('No phone number'); return; }
              const body = encodeURIComponent(`Hi ${owedPupil.name}, just a friendly reminder your lesson balance of £${owedPupil.amount.toFixed(0)} is outstanding. Thanks!`);
              window.location.href = `sms:${owedPupil.phone}?&body=${body}`;
            },
          };
        } else if (nextLesson) {
          aiInsight = { text: `Next up: ${(nextLesson.pupils?.first_name ?? pupilName(nextLesson)).split(' ')[0]} at ${fmt24(lessonDateTime(nextLesson))}. Check the route before you set off.`, cta: 'Route', to: '/satnav' };
        }

        const cardBase: React.CSSProperties = {
          background: '#FFFFFF',
          border: `0.5px solid ${BORDER}`,
          borderRadius: 10,
          fontFamily: PF,
        };
        const rowTap: React.CSSProperties = {
          minHeight: 56,
          display: 'flex',
          alignItems: 'center',
          cursor: 'pointer',
          width: '100%',
        };

        const StatCard = ({ label, value, danger, onClick }: { label: string; value: string; danger?: boolean; onClick?: () => void }) => (
          <div
            onClick={onClick}
            role={onClick ? 'button' : undefined}
            tabIndex={onClick ? 0 : undefined}
            style={{
              ...cardBase,
              borderRadius: 10,
              padding: '12px 14px',
              minHeight: 66,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              cursor: onClick ? 'pointer' : 'default',
            }}
          >
            <div style={{ fontSize: 12, fontWeight: 500, color: MUTED, letterSpacing: -0.1 }}>{label}</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: danger ? DANGER : NAVY, marginTop: 4, letterSpacing: -0.3, lineHeight: 1.1 }}>{value}</div>
          </div>
        );

        // Month / YTD earnings from in-memory allLessons (60-day window;
        // YTD is best-effort within that window — we don't have prior-period
        // data here, so vs-comparisons render as "—").
        const todayYmdStr = new Date().toISOString().slice(0, 10);
        const yearStr = todayYmdStr.slice(0, 4);
        const monthStr = todayYmdStr.slice(0, 7);
        const monthEarnings = (allLessons ?? []).reduce((s: number, l: any) => {
          if (typeof l.lesson_date === 'string' && l.lesson_date.startsWith(monthStr) &&
              (l.status === 'completed' || l.status === 'confirmed')) {
            return s + Number(l.amount_due ?? 0);
          }
          return s;
        }, 0);
        const monthLessonsCompleted = (allLessons ?? []).filter(
          (l: any) => typeof l.lesson_date === 'string' && l.lesson_date.startsWith(monthStr) && l.status === 'completed',
        ).length;
        const ytdEarnings = (allLessons ?? []).reduce((s: number, l: any) => {
          if (typeof l.lesson_date === 'string' && l.lesson_date.startsWith(yearStr) &&
              (l.status === 'completed' || l.status === 'confirmed')) {
            return s + Number(l.amount_due ?? 0);
          }
          return s;
        }, 0);
        const ytdLessonsCompleted = (allLessons ?? []).filter(
          (l: any) => typeof l.lesson_date === 'string' && l.lesson_date.startsWith(yearStr) && l.status === 'completed',
        ).length;
        const todayUpcoming = todayLessons.filter((l: any) => ['confirmed', 'pending', 'in_progress'].includes(l.status)).length;
        const todayCompleted = todayLessons.filter((l: any) => l.status === 'completed').length;
        const weekStartStr = (() => {
          const d = new Date(weekStart);
          return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        })();
        const weekCompletedForAvg = (allLessons ?? []).filter(
          (l: any) => l.status === 'completed' && typeof l.lesson_date === 'string' && l.lesson_date >= weekStartStr,
        ).length;
        const weekAvg = weekCompletedForAvg > 0 ? weekEarnings / weekCompletedForAvg : 0;


        const statSlides: StatSlideData[] = [
          {
            key: 'today',
            title: "Today's lessons",
            subtitleTop: todayLessons.length === 0 ? 'No lessons today' : `${todayUpcoming} upcoming · ${todayCompleted} completed`,
            subtitleBottom: `£${Math.round(todayEarnings)} earned today`,
            icon: <CalendarIcon size={20} strokeWidth={1.75} />,
            right: { kind: 'circle', value: todayLessons.length, active: todayLessons.length > 0 },
          },
          {
            key: 'week',
            title: 'This week',
            subtitleTop: `${weekLessonsTotal} lessons completed`,
            subtitleBottom: weekAvg > 0 ? `avg £${weekAvg.toFixed(0)} per lesson` : 'avg —',
            icon: <PoundSterling size={20} strokeWidth={1.75} />,
            right: { kind: 'value', value: `£${Math.round(weekEarnings)}`, label: 'earned' },
          },
          {
            key: 'month',
            title: 'This month',
            subtitleTop: `${monthLessonsCompleted} lessons completed`,
            subtitleBottom: <span style={{ color: '#B0BAC9' }}>— vs last month</span>,
            icon: <PoundSterling size={20} strokeWidth={1.75} />,
            right: { kind: 'value', value: `£${Math.round(monthEarnings)}`, label: 'earned' },
          },
          {
            key: 'ytd',
            title: 'Year to date',
            subtitleTop: `${ytdLessonsCompleted} lessons completed`,
            subtitleBottom: <span style={{ color: '#B0BAC9' }}>— vs last year</span>,
            icon: <BarChart3 size={20} strokeWidth={1.75} />,
            right: { kind: 'value', value: `£${Math.round(ytdEarnings)}`, label: 'earned' },
          },
        ];




        // ---- Smart Business Card: slot freed from a recent pupil cancellation ----
        const freedSlot = (allLessons || []).find((l: any) =>
          l.status === 'cancelled' &&
          l.cancelled_by === 'pupil' &&
          l.cancelled_at &&
          new Date(l.cancelled_at).getTime() > Date.now() - 86400000
        ) || null;

        return (
          <div style={{ fontFamily: PF, padding: '14px 16px 0' }}>



            {/* Smart Business Card: slot freed */}
            {freedSlot && (() => {
              const pupilName = freedSlot.pupils?.first_name || freedSlot.pupils?.name || 'A pupil';
              const time = String(freedSlot.lesson_time || '').slice(0, 5);
              const duration = freedSlot.duration_minutes || 60;
              return (
                <div
                  style={{
                    marginTop: 16,
                    background: '#FFFBEB',
                    border: '0.5px solid #D97706',
                    borderLeft: '4px solid #D97706',
                    borderRadius: 10,
                    padding: '14px 16px',
                    fontFamily: PF,
                    display: 'flex',
                    gap: 12,
                    alignItems: 'center',
                  }}
                >
                  <div style={{ width: 40, height: 40, borderRadius: 8, background: '#FEF3C7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Zap size={20} color="#D97706" />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#D97706', textTransform: 'uppercase', letterSpacing: 0.5 }}>Slot freed</div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#0B1F3A', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {pupilName} cancelled their lesson
                    </div>
                    <div style={{ fontSize: 12, color: '#92400E', marginTop: 1 }}>
                      {freedSlot.lesson_date} at {time} — {duration} min slot now free
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => navigate({
                      to: '/gaps',
                      search: { date: freedSlot.lesson_date, time, duration: String(duration) } as any,
                    })}
                    style={{ background: '#D97706', color: '#FFFFFF', border: 'none', borderRadius: 10, padding: '8px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer', flexShrink: 0, whiteSpace: 'nowrap' }}
                  >
                    Fill slot →
                  </button>
                </div>
              );
            })()}





            {/* 3. TIMELINE with TABS */}
            <SectionHeader>Teaching Schedule</SectionHeader>


            {(() => {
              const lessonRows = rows.filter((r): r is { kind: 'lesson'; l: LessonRow } => r.kind === 'lesson');
              const calendarRows = rows.filter((r): r is { kind: 'calendar'; title: string; start: Date; end: Date } => r.kind === 'calendar');
              
              const emptyLabel = tab === 'today' ? 'No lessons today' : tab === 'tomorrow' ? 'No lessons tomorrow' : 'No upcoming lessons';

              if (lessonRows.length === 0 && calendarRows.length === 0) {
                const freeMinutes = tab === 'today' ? totalFreeMinutesToday : tab === 'tomorrow' ? totalFreeMinutesTomorrow : 0;
                if ((tab === 'today' || tab === 'tomorrow') && freeMinutes >= minGapMinutes) {
                  const hours = Math.round(freeMinutes / 60);
                  const dayLabel = tab === 'today' ? 'today' : 'tomorrow';
                  return (
                    <div style={{ background: '#FFFFFF', borderRadius: 10, border: '1px solid rgba(15,32,68,0.08)', padding: '20px 18px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 44, height: 44, borderRadius: 8, background: 'linear-gradient(135deg, #1877D6, #0B1F3A)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <IconBolt size={22} color="#FFFFFF" stroke={2} />
                      </div>
                      <div style={{ fontSize: 15, fontWeight: 600, color: '#0B1F3A', fontFamily: 'Inter, sans-serif' }}>Your day is wide open</div>
                      <div style={{ fontSize: 13, color: '#6B7280', fontFamily: 'Inter, sans-serif' }}>{hours} hours free {dayLabel} — fill a gap before it goes to waste.</div>
                      <button
                        type="button"
                        onClick={() => navigate({ to: '/gaps' })}
                        style={{ marginTop: 4, width: '100%', background: '#0B1F3A', color: '#FFFFFF', border: 'none', borderRadius: 12, padding: 12, fontSize: 14, fontWeight: 600, fontFamily: 'Inter, sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer' }}
                      >
                        <IconBolt size={16} color="#FFFFFF" stroke={2} />
                        Open gap filler
                      </button>
                    </div>
                  );
                }
                return (
                  <div style={{ ...cardBase, padding: 20, textAlign: 'center', color: MUTED, fontSize: 13 }}>
                    {emptyLabel}
                  </div>
                );
              }


              const initialsOf = (name: string) => {
                const parts = name.trim().split(/\s+/).filter(Boolean);
                if (parts.length === 0) return '?';
                if (parts.length === 1) {
                  const p = parts[0];
                  return (p[0] + (p[1] ?? '')).toUpperCase();
                }
                return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
              };

              return (
                <div style={{ fontFamily: PF, background: '#FFFFFF', borderRadius: 18, padding: 0, boxShadow: '0 4px 16px rgba(11,31,58,0.06)', border: '1px solid #E2E8F0', overflow: 'hidden' }}>
                  {/* Segmented control */}
                  <div role="tablist" aria-label="Lesson period" style={{ display: 'flex', padding: 3, background: '#EEF2F7', borderRadius: 999, margin: '16px 18px' }}>
                    {(['today', 'tomorrow', 'next'] as const).map((t) => {
                      const active = tab === t;
                      const label = t === 'today' ? 'Today' : t === 'tomorrow' ? 'Tomorrow' : 'Next';
                      const count = scheduleCounts[t];
                      return (
                        <button
                          key={t}
                          type="button"
                          role="tab"
                          aria-selected={active}
                          onClick={() => setTab(t)}
                          style={{
                            flex: 1,
                            padding: '8px 0',
                            borderRadius: 999,
                            border: 'none',
                            background: active ? '#FFFFFF' : 'transparent',
                            color: active ? '#0B1F3A' : '#6B7A90',
                            fontFamily: PF,
                            fontSize: 14,
                            fontWeight: active ? 700 : 500,
                            cursor: 'pointer',
                            boxShadow: active ? '0 1px 2px rgba(11,31,58,0.10), 0 1px 3px rgba(11,31,58,0.06)' : 'none',
                            transition: 'background 120ms ease, color 120ms ease',
                            textAlign: 'center',
                            letterSpacing: -0.1,
                          }}
                        >
                          <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                            {label}
                            {count > 0 && (
                              <span
                                style={{
                                  minWidth: 18,
                                  height: 18,
                                  padding: '0 5px',
                                  borderRadius: 9,
                                  background: '#1877D6',
                                  color: '#FFFFFF',
                                  fontSize: 11,
                                  fontWeight: 700,
                                  lineHeight: '18px',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                }}
                              >
                                {count}
                              </span>
                            )}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  <div style={{ height: 1, background: '#E2E8F0' }} />


                  {moveModeHome && movingLessonHome && (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 12,
                        background: '#0B1F3A',
                        color: '#FFFFFF',
                        borderRadius: 12,
                        padding: '10px 14px',
                        margin: '0 16px 12px',

                        fontFamily: PF,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                        <div
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: '50%',
                            background: '#1877D6',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                          }}
                        >
                          <Move size={14} color="#FFFFFF" />
                        </div>
                        <div style={{ fontSize: 13, fontWeight: 500, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          Moving: {(movingLessonHome.pupils as any)?.name?.split(' ')[0] || 'lesson'}'s {movingLessonHome.duration_minutes} min lesson
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => { setMovingLessonHome(null); setMoveModeHome(false); setConfirmMoveHome(null); }}
                        style={{
                          background: 'transparent',
                          border: '1px solid rgba(255,255,255,0.3)',
                          color: '#FFFFFF',
                          borderRadius: 8,
                          padding: '4px 10px',
                          fontSize: 12,
                          fontWeight: 500,
                          cursor: 'pointer',
                          flexShrink: 0,
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  )}

                  {/* Timeline container */}
                  <div style={{ position: 'relative' }}>
                    {rows.map((r, idx) => {
                    if (r.kind === 'gap') {
                      const gs = r.start;
                      const ge = new Date(gs.getTime() + r.mins * 60000);
                      const fmtT = (d: Date) => `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
                      const hourlyRate = 40;
                      const potential = Math.round((r.mins / 60) * hourlyRate);
                      const gapDate = `${gs.getFullYear()}-${String(gs.getMonth() + 1).padStart(2, '0')}-${String(gs.getDate()).padStart(2, '0')}`;
                      const dayName = DAY_NAMES[gs.getDay()];
                      const preview = previewMatchForGap({ date: gapDate, dayName, durationMin: r.mins });
                      const gapStartTime = fmtT(gs);
                      const durLabel = formatMins(r.mins);
                      return (
                        <div
                          key={`gap-${idx}`}
                          style={{
                            background: moveModeHome ? '#F4F8FE' : '#FFFBF3',
                            borderTop: idx === 0 ? 'none' : '1px solid #EEF2F7',
                          }}
                        >
                          {/* FILL THIS GAP pill, flush above the row */}
                          <div style={{ padding: '8px 16px 0' }}>
                            <span
                              style={{
                                display: 'inline-block',
                                background: '#FBEBD3',
                                color: '#B5661E',
                                fontSize: 11,
                                fontWeight: 700,
                                letterSpacing: 0.3,
                                padding: '3px 9px',
                                borderRadius: '6px 6px 0 0',
                              }}
                            >
                              FILL THIS GAP
                            </span>
                          </div>
                          <div
                            onClick={() => {
                              if (moveModeHome && movingLessonHome) {
                                setConfirmMoveHome({ date: gapDate, time: gapStartTime });
                              } else {
                                navigate({ to: '/gaps' as never });
                              }
                            }}
                            role="button"
                            tabIndex={0}
                            style={{
                              padding: '4px 16px 14px',
                              display: 'flex',
                              alignItems: 'stretch',
                              gap: 12,
                              cursor: 'pointer',
                            }}
                          >
                            <div style={{ width: 52, flexShrink: 0, paddingTop: 2 }}>
                              <div style={{ fontSize: 16, fontWeight: 700, color: '#0B1F3A', fontVariantNumeric: 'tabular-nums', lineHeight: 1.15 }}>
                                {fmtT(gs)}
                              </div>
                              <div style={{ fontSize: 11.5, fontWeight: 500, color: '#8A93A3', marginTop: 3, fontVariantNumeric: 'tabular-nums' }}>
                                {durLabel}
                              </div>
                            </div>
                            <div aria-hidden style={{ width: 3, borderRadius: 2, background: '#E8A23D', flexShrink: 0, alignSelf: 'stretch' }} />
                            <div style={{ flex: 1, minWidth: 0, paddingTop: 2, display: 'flex', alignItems: 'center', gap: 8 }}>
                              {preview.count > 0 && (
                                <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                                  {preview.topPupils.map((p, i) => {
                                    const initials = (p.name ?? p.first_name ?? "P")
                                      .split(/\s+/)
                                      .map((s) => s.charAt(0))
                                      .join("")
                                      .slice(0, 2)
                                      .toUpperCase();
                                    return (
                                      <div
                                        key={i}
                                        style={{
                                          width: 24,
                                          height: 24,
                                          borderRadius: '50%',
                                          background: pupilColour((p as any).id ?? null, p.calendar_colour ?? null, p.name ?? null),
                                          border: '2px solid #FFFFFF',
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          fontSize: 9,
                                          fontWeight: 700,
                                          color: '#FFFFFF',
                                          marginRight: i === preview.topPupils.length - 1 ? 0 : -8,
                                        }}
                                      >
                                        {initials}
                                      </div>
                                    );
                                  })}
                                  {preview.count > preview.topPupils.length && (
                                    <div
                                      style={{
                                        width: 24,
                                        height: 24,
                                        borderRadius: '50%',
                                        background: '#94A3B8',
                                        border: '2px solid #FFFFFF',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: 9,
                                        fontWeight: 700,
                                        color: '#FFFFFF',
                                        marginLeft: -8,
                                      }}
                                    >
                                      +{preview.count - preview.topPupils.length}
                                    </div>
                                  )}
                                </div>
                              )}
                              <div style={{ fontSize: 13.5, fontWeight: 500, color: '#0B1F3A', minWidth: 0 }}>
                                {preview.count > 0
                                  ? `${preview.count} pupil${preview.count === 1 ? '' : 's'} may fit · £${potential} potential`
                                  : `${durLabel} free · £${potential} potential`}
                              </div>
                            </div>
                            {moveModeHome ? (
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); setConfirmMoveHome({ date: gapDate, time: gapStartTime }); }}
                                style={{
                                  alignSelf: 'center',
                                  background: '#0B1F3A',
                                  color: '#FFFFFF',
                                  fontSize: 12.5,
                                  fontWeight: 600,
                                  padding: '8px 14px',
                                  borderRadius: 9,
                                  border: 'none',
                                  cursor: 'pointer',
                                  fontFamily: PF,
                                  flexShrink: 0,
                                }}
                              >
                                Move here
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); navigate({ to: '/gaps' as never }); }}
                                style={{
                                  alignSelf: 'center',
                                  background: '#1877D6',
                                  color: '#FFFFFF',
                                  fontSize: 12.5,
                                  fontWeight: 600,
                                  padding: '8px 16px',
                                  borderRadius: 9,
                                  border: 'none',
                                  cursor: 'pointer',
                                  fontFamily: PF,
                                  flexShrink: 0,
                                }}
                              >
                                Fill
                              </button>
                            )}
                          </div>
                        </div>
                      );

                    }

                    if (r.kind === 'calendar') {
                      const cs = r.start;
                      const ce = r.end;
                      const fmtT = (d: Date) => `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
                      const durMin = Math.max(0, Math.round((ce.getTime() - cs.getTime()) / 60000));
                      const h = Math.floor(durMin / 60);
                      const m = durMin % 60;
                      const durLabel = h > 0 && m > 0 ? `${h}h ${m}m` : h > 0 ? `${h}h` : `${m}m`;
                      // Strip a redundant leading date/time/duration prefix, e.g.
                      // "27/07/2026 – 7am – NSAC – Standards Check Review" -> "NSAC – Standards Check Review".
                      const cleanTitle = (() => {
                        const raw = (r.title ?? '').trim();
                        if (!raw) return raw;
                        const sep = /\s*(?:[–—-]|\||·)\s*/;
                        const parts = raw.split(sep);
                        if (parts.length < 2) return raw;
                        const redundant = (s: string) =>
                          /^\d{1,4}[/.-]\d{1,2}[/.-]\d{1,4}$/.test(s) ||
                          /^\d{1,2}([:.]\d{2})?\s*(am|pm)$/i.test(s) ||
                          /^\d{1,2}:\d{2}$/.test(s) ||
                          /^\d+\s*(min|mins|minutes|h|hr|hrs|hours)$/i.test(s);
                        let i = 0;
                        while (i < parts.length - 1 && redundant(parts[i].trim())) i++;
                        const rest = parts.slice(i).join(' – ').trim();
                        return rest || raw;
                      })();
                      return (
                        <div
                          key={`cal-${idx}`}
                          style={{
                            padding: '12px 14px',
                            display: 'flex',
                            alignItems: 'stretch',
                            gap: 12,
                            borderTop: idx === 0 ? 'none' : '1px solid #EEF2F7',
                          }}
                        >
                          <div style={{ width: 52, flexShrink: 0, paddingTop: 2 }}>
                            <div style={{ fontSize: 16, fontWeight: 700, color: '#0B1F3A', fontVariantNumeric: 'tabular-nums', lineHeight: 1.15 }}>
                              {fmtT(cs)}
                            </div>
                            <div style={{ fontSize: 11.5, fontWeight: 500, color: '#8A93A3', marginTop: 3, fontVariantNumeric: 'tabular-nums' }}>
                              {durLabel}
                            </div>
                          </div>
                          <div aria-hidden style={{ width: 3, borderRadius: 2, background: '#D9DEE7', flexShrink: 0, alignSelf: 'stretch' }} />
                          <div style={{ flex: 1, minWidth: 0, paddingTop: 2 }}>
                            <div
                              style={{
                                fontSize: 15,
                                fontWeight: 600,
                                color: '#0B1F3A',
                                lineHeight: 1.3,
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                              }}
                              title={r.title}
                            >
                              {cleanTitle}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 3, minWidth: 0 }}>
                              <IconCalendarEvent size={13} stroke={1.8} color="#6B7686" style={{ flexShrink: 0 }} />
                              <span style={{ fontSize: 12, color: '#6B7686', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Google Calendar</span>
                            </div>
                          </div>
                        </div>
                      );
                    }

                    const row = { kind: 'lesson' as const, l: r.l };

                    const l = row.l;
                    const start = lessonDateTime(l);
                    const dur = l.duration_minutes ?? 60;
                    const end = new Date(start.getTime() + dur * 60000);
                    const isLive = nowT >= start && nowT < end;
                    const isCancelled = (l.status ?? '').toLowerCase() === 'cancelled';
                    const payStatus = (l.payment_status ?? '').toLowerCase();
                    const amt = Number(l.amount_due ?? 0);
                    const isPrepaidPupil = Number((l.pupils as any)?.prepaid_hours ?? 0) > 0;
                    const isPaid = payStatus === 'paid' || payStatus === 'prepaid' || isPrepaidPupil;
                    const dueUnpaid = amt > 0 && !isPaid;
                    const name = pupilName(l);
                    const timeLabel = `${String(start.getHours()).padStart(2, '0')}:${String(start.getMinutes()).padStart(2, '0')}`;

                    let priceNode: React.ReactNode = null;
                    if (isCancelled) {
                      priceNode = null;
                    } else if (isLive) {
                      priceNode = (
                        <span style={{ fontSize: 13, fontWeight: 500, color: ACCENT }}>Live</span>
                      );
                    } else if (isPrepaidPupil) {
                      priceNode = (
                        <span style={{ fontSize: 13, fontWeight: 500, color: '#1877D6' }}>Prepaid</span>
                      );
                    } else if (isPaid) {
                      priceNode = (
                        <span style={{ fontSize: 13, fontWeight: 500, color: '#137333' }}>Paid</span>
                      );
                    } else if (amt > 0) {
                      priceNode = (
                        <span style={{ fontSize: 13, fontWeight: 500, color: '#0B1F3A', fontVariantNumeric: 'tabular-nums' }}>
                          £{amt.toFixed(0)}
                        </span>
                      );
                    }

                    const calColour = pupilColour(l.pupil_id, (l.pupils as any)?.calendar_colour ?? null, name);
                    const durLabel = (() => {
                      const h = Math.floor(dur / 60);
                      const m = dur % 60;
                      return h > 0 && m > 0 ? `${h}h ${m}m` : h > 0 ? `${h}h` : `${m}m`;
                    })();

                    const pickupLabel =
                      l.pickup_location ||
                      [(l.pupils as any)?.address, (l.pupils as any)?.postcode].filter(Boolean).join(', ') ||
                      null;

                    const openLessonActions = () => setActionsOpenForLesson((cur) => (cur?.id === l.id ? null : l));
                    let lpTimer: any = null;
                    const startLongPress = () => {
                      if (lpTimer) clearTimeout(lpTimer);
                      lpTimer = setTimeout(() => { lpTimer = null; openLessonActions(); }, 500);
                    };
                    const cancelLongPress = () => { if (lpTimer) { clearTimeout(lpTimer); lpTimer = null; } };

                    const payPill = isCancelled ? null : isLive
                      ? { label: 'Live', bg: '#E6F1FB', fg: '#1877D6' }
                      : (isPrepaidPupil || payStatus === 'prepaid')
                        ? { label: 'Prepaid', bg: '#E4F5EA', fg: '#2E7D4F' }
                        : dueUnpaid
                          ? { label: `£${amt.toFixed(0)} due`, bg: '#FCE9E9', fg: '#CC2229' }
                          : null;

                    return (
                      <div key={l.id} style={{ position: 'relative', borderTop: idx === 0 ? 'none' : '1px solid #EEF2F7' }}>
                        <div
                          onClick={() => navigate({ to: '/pupils/$id', params: { id: l.pupil_id } as any, search: { lessonId: l.id } as any })}
                          onPointerDown={startLongPress}
                          onPointerUp={cancelLongPress}
                          onPointerLeave={cancelLongPress}
                          onPointerCancel={cancelLongPress}
                          onContextMenu={(e) => { e.preventDefault(); openLessonActions(); }}
                          role="button"
                          tabIndex={0}
                          style={{
                            padding: '12px 14px',
                            display: 'flex',
                            alignItems: 'stretch',
                            gap: 12,
                            cursor: 'pointer',
                            boxSizing: 'border-box',
                            opacity: isCancelled ? 0.55 : 1,
                          }}
                        >
                            <div style={{ width: 52, flexShrink: 0, paddingTop: 2 }}>
                              <div style={{ fontSize: 16, fontWeight: 700, color: '#0B1F3A', fontVariantNumeric: 'tabular-nums', lineHeight: 1.15, textDecoration: isCancelled ? 'line-through' : 'none' }}>
                                {timeLabel}
                              </div>
                              <div style={{ fontSize: 11.5, fontWeight: 500, color: '#8A93A3', marginTop: 3, fontVariantNumeric: 'tabular-nums' }}>
                                {durLabel}
                              </div>
                            </div>
                            <div
                              aria-hidden
                              style={{
                                width: 3,
                                borderRadius: 2,
                                background: isCancelled ? '#9CA3AF' : '#1877D6',
                                flexShrink: 0,
                                alignSelf: 'stretch',
                              }}
                            />
                            <div style={{ flex: 1, minWidth: 0, paddingTop: 2 }}>
                              {tab === 'next' && (
                                <div style={{ fontSize: 11, fontWeight: 500, color: '#1877D6', marginBottom: 2, fontVariantNumeric: 'tabular-nums', letterSpacing: 0.2 }}>
                                  {start.toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short' })}
                                </div>
                              )}
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                                <span style={{ flex: 1, minWidth: 0, fontSize: 15, fontWeight: 600, color: isCancelled ? '#6B7280' : '#0B1F3A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', lineHeight: 1.3, textDecoration: isCancelled ? 'line-through' : 'none' }}>
                                  {name}
                                </span>
                                {isCancelled ? (
                                  <span style={{
                                    flexShrink: 0,
                                    fontSize: 10,
                                    fontWeight: 700,
                                    letterSpacing: 0.4,
                                    textTransform: 'uppercase',
                                    color: '#CC2229',
                                    background: '#FCE9E9',
                                    padding: '2px 8px',
                                    borderRadius: 999,
                                    lineHeight: 1.4,
                                  }}>
                                    Cancelled
                                  </span>
                                ) : payPill ? (
                                  <button
                                    type="button"
                                    onClick={(ev) => { ev.stopPropagation(); setPaymentSheetForLesson(l); }}
                                    style={{
                                      flexShrink: 0,
                                      fontSize: 11,
                                      fontWeight: 700,
                                      padding: '2px 9px',
                                      borderRadius: 999,
                                      border: 'none',
                                      cursor: 'pointer',
                                      whiteSpace: 'nowrap',
                                      background: payPill.bg,
                                      color: payPill.fg,
                                      fontFamily: PF,
                                    }}
                                  >
                                    {payPill.label}
                                  </button>
                                ) : null}
                              </div>
                              {pickupLabel && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4, minWidth: 0 }}>
                                  <IconMapPin size={12} stroke={1.9} color="#6B7686" style={{ flexShrink: 0 }} />
                                  <span style={{ fontSize: 12, color: '#6B7686', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {pickupLabel}
                                  </span>
                                </div>
                              )}
                            </div>

                            <span
                              data-home-lesson-actions-trigger
                              role="button"
                              aria-label="Lesson options"
                              onClick={(e) => { e.stopPropagation(); openLessonActions(); }}
                              style={{ flexShrink: 0, display: 'flex', alignItems: 'center', paddingLeft: 2, cursor: 'pointer' }}
                            >
                              <IconDotsVertical size={14} stroke={2} color="#D1D5DB" />
                            </span>
                         </div>
                         {actionsOpenForLesson?.id === l.id && (
                           <div
                             data-home-lesson-actions-popover
                             onClick={(ev) => ev.stopPropagation()}
                             style={{
                               position: 'absolute',
                               top: 40,
                               right: 12,
                               minWidth: 140,
                               background: '#FFFFFF',
                               border: '1px solid #E5E7EB',
                               borderRadius: 10,
                               boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
                               zIndex: 40,
                               overflow: 'hidden',
                             }}
                           >
                             <button
                               type="button"
                               style={{ display: 'block', width: '100%', textAlign: 'left', padding: '10px 14px', fontSize: 13, background: 'transparent', border: 'none', cursor: 'pointer', color: '#111827' }}
                               onClick={(ev) => {
                                 ev.stopPropagation();
                                 setActionsOpenForLesson(null);
                                 navigate({ to: '/lessons/edit/$id', params: { id: l.id } });
                               }}
                             >
                               Edit lesson
                             </button>
                             <button
                               type="button"
                               style={{ display: 'block', width: '100%', textAlign: 'left', padding: '10px 14px', fontSize: 13, background: 'transparent', border: 'none', cursor: 'pointer', color: '#111827' }}
                               onClick={(ev) => {
                                 ev.stopPropagation();
                                 setActionsOpenForLesson(null);
                                 setMovingLessonHome(l);
                                 setMoveModeHome(true);
                                 const firstName = (l.pupils as any)?.name?.split(' ')[0] || 'this lesson';
                                 toast.info('Select a new time slot for ' + firstName, { duration: 10000 });
                               }}
                             >
                               Move
                             </button>
                             <button
                               type="button"
                               style={{ display: 'block', width: '100%', textAlign: 'left', padding: '10px 14px', fontSize: 13, background: 'transparent', border: 'none', cursor: 'pointer', color: '#111827' }}
                               onClick={(ev) => {
                                 ev.stopPropagation();
                                 setActionsOpenForLesson(null);
                                 setCancelSheetForLesson(l);
                               }}
                             >
                               Cancel
                             </button>
                             <button
                               type="button"
                               style={{ display: 'block', width: '100%', textAlign: 'left', padding: '10px 14px', fontSize: 13, background: 'transparent', border: 'none', cursor: 'pointer', color: '#CC2229' }}
                               onClick={(ev) => {
                                 ev.stopPropagation();
                                 setActionsOpenForLesson(null);
                                 setDeleteSheetForLesson(l);
                               }}
                             >
                               Delete
                             </button>
                           </div>
                         )}
                       </div>
                      );

                  })}
                  </div>
                  {/* Footer */}
                  <div style={{ borderTop: '1px solid #E2E8F0', padding: '14px 18px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <button
                      type="button"
                      onClick={() => { setAddLessonPupilId(undefined); setAddLessonDate(tab === 'tomorrow' ? tomorrowISO : undefined); setAddLessonOpen(true); }}
                      style={{ background: 'none', border: 'none', padding: 0, fontFamily: PF, fontSize: 13.5, fontWeight: 600, color: '#1877D6', cursor: 'pointer', lineHeight: 1 }}
                    >
                      Add +
                    </button>
                    <button
                      type="button"
                      onClick={() => navigate({ to: '/schedule' as never })}
                      style={{ background: 'none', border: 'none', padding: 0, fontFamily: PF, fontSize: 13.5, fontWeight: 600, color: '#1877D6', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                    >
                      Full schedule
                      <ArrowRight size={14} strokeWidth={2.2} />
                    </button>
                  </div>
                </div>
              );
            })()}




            {/* 5. QUICK ACCESS (swipeable 3x2) */}
            {(() => {
              const unreadCount = unreadMsgs.length;
              type GraphicKind = 'timeline' | 'calendar' | 'donut' | 'chart' | 'bubbles' | 'alarm' | 'book' | 'medal' | 'swap' | 'repeat' | 'checklist' | 'receipt' | 'grad' | 'map' | 'location' | 'fuel' | 'car' | 'bars' | 'moon' | 'invoice' | 'trend' | 'gear' | 'clock2' | 'sync' | 'gift' | 'shield' | 'spark' | 'calc' | 'card';
              type QuickTile = { label: string; sub: string; route: string | null; icon: any; iconStroke: string; chipBg: string; wsIndex?: number; attention?: boolean; action?: 'running-late' | 'nearby' | 'take-payment' | 'add-expense' | 'log-mileage' | 'send-message'; badge?: number; graphic?: GraphicKind };
              const quickTiles: QuickTile[] = [
                // First four
                { label: 'Fill slots', sub: 'Gaps', route: '/gaps', icon: IconBolt, iconStroke: '#B45309', chipBg: '#FBEBD3', attention: freeSlotCount > 0, badge: freeSlotCount, graphic: 'timeline' },
                { label: 'Schedule', sub: 'View diary', route: null, icon: IconCalendar, iconStroke: '#1877D6', chipBg: '#E6F1FB', wsIndex: 1, graphic: 'calendar' },
                { label: 'Take payment', sub: 'Card & QR', route: null, icon: IconCreditCard, iconStroke: '#1E8E3E', chipBg: '#DDEFE1', action: 'take-payment', graphic: 'card' },
                { label: 'Nearby', sub: 'Find places', route: null, icon: IconMapPin, iconStroke: '#1877D6', chipBg: '#E6F1FB', action: 'nearby', graphic: 'location' },
                // Page 2 — Teaching
                { label: 'Pupils', sub: `${activePupilsCount} active`, route: '/pupils', icon: IconUsers, iconStroke: '#6B4FA0', chipBg: '#EAE3F5', graphic: 'donut' },
                { label: 'Payments', sub: outstanding > 0 ? `£${Math.round(outstanding)} owed` : 'All settled', route: '/payments', icon: IconCurrencyPound, iconStroke: '#1E8E3E', chipBg: '#DDEFE1', attention: outstanding > 0, badge: outstanding > 0 ? Math.round(outstanding) : undefined, graphic: 'chart' },
                { label: 'Messages', sub: unreadCount > 0 ? `${unreadCount} new` : 'No new', route: '/messages', icon: IconMessageCircle, iconStroke: '#1877D6', chipBg: '#E6F1FB', attention: unreadCount > 0, graphic: 'bubbles' },
                { label: 'Community', sub: unreadChat > 0 ? `${unreadChat} unread` : 'ADI chat', route: '/community', icon: IconMessageCircle, iconStroke: '#7C3AED', chipBg: '#EFE7FB', attention: unreadChat > 0, badge: unreadChat > 0 ? unreadChat : undefined, graphic: 'bubbles' },

                { label: 'Send message', sub: 'Quick text', route: null, icon: IconMessage, iconStroke: '#1877D6', chipBg: '#E6F1FB', action: 'send-message', graphic: 'bubbles' },
                { label: 'Running late', sub: 'Alert pupils', route: null, icon: IconClock, iconStroke: '#C23B3B', chipBg: '#FBE2E2', action: 'running-late', graphic: 'alarm' },
                { label: 'EOL', sub: 'End of lesson', route: '/pupils', icon: BookOpen, iconStroke: '#1877D6', chipBg: '#E6F1FB', graphic: 'book' },
                { label: 'Log test', sub: 'Test result', route: '/driving-test', icon: Award, iconStroke: '#7C3AED', chipBg: '#EFE7FB', graphic: 'medal' },
                { label: 'Test swap', sub: 'Manage per pupil', route: '/pupils', icon: ArrowLeftRight, iconStroke: '#7C3AED', chipBg: '#EFE7FB', graphic: 'swap' },
                { label: 'Recurring', sub: 'Weekly series', route: '/lesson-series', icon: RefreshCw, iconStroke: '#1877D6', chipBg: '#E6F1FB', graphic: 'repeat' },
                { label: 'Syllabus', sub: 'Standards', route: '/standards', icon: GraduationCap, iconStroke: '#16A34A', chipBg: '#DDEFE1', graphic: 'grad' },
                { label: 'Mock tests', sub: 'Practice', route: '/mock-tests', icon: ClipboardCheck, iconStroke: '#16A34A', chipBg: '#DDEFE1', graphic: 'checklist' },
                // Page 3 — Business
                { label: 'Expenses', sub: 'Track costs', route: '/expenses', icon: Receipt, iconStroke: '#C23B3B', chipBg: '#FBE2E2', graphic: 'receipt' },
                { label: 'Log expense', sub: 'Add cost', route: null, icon: Receipt, iconStroke: '#C23B3B', chipBg: '#FBE2E2', action: 'add-expense', graphic: 'receipt' },
                { label: 'Certifications', sub: 'Licences', route: '/certifications', icon: Award, iconStroke: '#B45309', chipBg: '#FBEBD3', graphic: 'shield' },
                { label: 'CPD log', sub: 'Development', route: '/cpd', icon: GraduationCap, iconStroke: '#16A34A', chipBg: '#DDEFE1', graphic: 'bars' },
                { label: 'Mileage', sub: 'Log miles', route: null, icon: MapPin, iconStroke: '#5A6B85', chipBg: '#EEF2F7', action: 'log-mileage', graphic: 'map' },
                { label: 'Find fuel', sub: 'Nearby', route: '/fuel', icon: Fuel, iconStroke: '#B45309', chipBg: '#FBEBD3', graphic: 'fuel' },
                { label: 'Vehicle', sub: 'Health & MOT', route: '/vehicle', icon: Car, iconStroke: '#5A6B85', chipBg: '#EEF2F7', graphic: 'car' },
                // Page 4 — Reports
                { label: 'MTD', sub: 'Month summary', route: '/mtd', icon: BarChart3, iconStroke: '#1877D6', chipBg: '#E6F1FB', graphic: 'bars' },
                { label: 'Tax report', sub: 'Self assessment', route: '/tax-report', icon: Calculator, iconStroke: '#B45309', chipBg: '#FBEBD3', graphic: 'calc' },
                { label: 'Weekly', sub: 'Week report', route: '/weekly-report', icon: CalendarIcon, iconStroke: '#16A34A', chipBg: '#DDEFE1', graphic: 'bars' },
                { label: 'End of day', sub: 'Daily wrap', route: '/end-of-day', icon: Moon, iconStroke: '#7C3AED', chipBg: '#EFE7FB', graphic: 'moon' },
                { label: 'Invoices', sub: 'Billing', route: '/invoices', icon: FileText, iconStroke: '#1877D6', chipBg: '#E6F1FB', graphic: 'invoice' },
                { label: 'Forecast', sub: 'Earnings', route: '/earnings', icon: TrendingUp, iconStroke: '#16A34A', chipBg: '#DDEFE1', graphic: 'trend' },
                // Page 5 — Admin
                { label: 'Settings', sub: 'Account', route: '/settings', icon: SettingsIcon, iconStroke: '#5A6B85', chipBg: '#EEF2F7', graphic: 'gear' },
                { label: 'Availability', sub: 'Working hours', route: '/availability-settings', icon: Clock, iconStroke: '#1877D6', chipBg: '#E6F1FB', graphic: 'clock2' },
                { label: 'Coverage', sub: 'Service areas', route: '/coverage-areas', icon: MapPin, iconStroke: '#1877D6', chipBg: '#E6F1FB', graphic: 'map' },
                { label: 'Calendar', sub: 'Google sync', route: '/calendarsync', icon: CalendarIcon, iconStroke: '#1877D6', chipBg: '#E6F1FB', graphic: 'sync' },
                { label: 'Referrals', sub: 'Rewards', route: '/referrals', icon: Gift, iconStroke: '#00B5A5', chipBg: '#D8F1EE', graphic: 'gift' },
                { label: 'T&Cs', sub: 'Terms', route: '/terms', icon: FileCheck, iconStroke: '#16A34A', chipBg: '#DDEFE1', graphic: 'checklist' },
                { label: 'Automations', sub: 'Auto actions', route: '/automations', icon: Zap, iconStroke: '#B45309', chipBg: '#FBEBD3', graphic: 'spark' },
              ];
              const tilesPerPage = 6;
              const totalPages = Math.ceil(quickTiles.length / tilesPerPage);
              const currentTiles = quickTiles.slice(quickPage * tilesPerPage, (quickPage + 1) * tilesPerPage);

              const goTile = (tile: QuickTile) => {
                if (tile.action === 'running-late') { setRunningLateOpen(true); return; }
                else if (tile.action === 'nearby') { setNearbyOpen(true); return; }
                else if (tile.action === 'take-payment') { setUnifiedPayPupilId(undefined); setUnifiedPayOpen(true); return; }
                else if (tile.action === 'add-expense') { setAddExpenseOpen(true); return; }
                else if (tile.action === 'log-mileage') { setLogMileageOpen(true); return; }
                else if (tile.action === 'send-message') { setSendMessagePupilId(undefined); setSendMessageOpen(true); return; }
                if (tile.wsIndex === 1) { navigate({ to: '/schedule' as never }); return; }
                if (tile.wsIndex === 2) { navigate({ to: '/pupils' as never }); return; }
                if (tile.wsIndex === 3) { navigate({ to: '/payments' as never }); return; }
                if (tile.wsIndex === 6) { navigate({ to: '/dsm-live' as never }); return; }
                if (tile.wsIndex === 7 || tile.route === null) { navigate({ to: '/more' as never }); return; }
                navigate({ to: tile.route as never });
              };


              const renderQuickTile = (tile: QuickTile, key: string, onTap?: () => void) => {
                const Icon = tile.icon;
                const subColor = tile.attention ? '#CC2229' : '#64748B';
                const subWeight = tile.attention ? 600 : 400;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => { goTile(tile); onTap?.(); }}
                    className="cf-tap qa-card"
                    style={{
                      position: 'relative',
                      background: '#FFFFFF',
                      border: '1px solid #E2E8F0',
                      borderRadius: 14,
                      padding: 10,
                      minHeight: 78,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'flex-start',
                      gap: 8,
                      cursor: 'pointer',
                      textAlign: 'left',
                      fontFamily: "Poppins, Inter, sans-serif",
                      transition: 'transform 0.15s ease, box-shadow 0.2s ease',
                      overflow: 'hidden',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                    }}
                  >
                    {tile.attention && (
                      <span style={{
                        position: 'absolute',
                        top: 10,
                        right: 10,
                        width: 8,
                        height: 8,
                        borderRadius: 999,
                        background: '#CC2229',
                      }} />
                    )}
                    <div
                      className="qa-icon"
                      style={{
                        width: 30,
                        height: 30,
                        borderRadius: 8,
                        background: tile.chipBg,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        transition: 'transform 0.15s ease',
                      }}
                    >
                      <Icon size={16} color={tile.iconStroke} strokeWidth={2} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, maxWidth: '100%' }}>
                      <span style={{ fontSize: 11, fontWeight: 500, color: '#0B1F3A', lineHeight: 1.25, letterSpacing: '-0.01em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: "Poppins, Inter, sans-serif" }}>{tile.label}</span>
                      <span style={{ marginTop: 1, fontSize: 10, fontWeight: subWeight, color: subColor, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: tile.sub.includes('\n') ? 'pre-line' : 'nowrap', lineHeight: 1.3, fontFamily: "Poppins, Inter, sans-serif" }}>{tile.sub}</span>
                    </div>
                  </button>
                );
              };




              const sq = quickSearchQuery.trim().toLowerCase();
              const searchResults = sq
                ? quickTiles.filter((t) => t.label.toLowerCase().includes(sq) || t.sub.toLowerCase().includes(sq))
                : quickTiles;

              return (
                <>
        <SectionHeader>Upcoming Tests</SectionHeader>
        {/* ============ UPCOMING TESTS CARD ============ */}
        {(() => {
          const parseDate = (iso: string) => {
            const d = new Date(iso + 'T00:00:00');
            return isNaN(d.getTime()) ? null : d;
          };
          const fmtDateTime = (iso: string, time?: string | null) => {
            const d = parseDate(iso);
            if (!d) return iso;
            const datePart = d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
            const timePart = time ? ` · ${String(time).slice(0, 5)}` : '';
            return `${datePart}${timePart}`;
          };
          const now = new Date();
          const nowMs = now.getTime();
          const testsSorted = [...(upcomingTests ?? [])]
            .filter((p) => p.test_date && new Date(p.test_date).getTime() >= nowMs - 86400000)
            .sort((a, b) => a.test_date.localeCompare(b.test_date));
          if (testsSorted.length === 0) return null;
          const next = testsSorted[0];
          const nextDate = parseDate(next.test_date);
          const dayNum = nextDate ? nextDate.getDate() : '--';
          const monthAbbr = nextDate
            ? nextDate.toLocaleDateString('en-GB', { month: 'short' }).toUpperCase()
            : '';
          const brandColors = ['#0B1F3A', '#0F6E56', '#185FA5'];
          return (
            <div
              onClick={() => navigate({ to: '/tests' as never })}
              style={{
                background: '#FFFFFF',
                border: '1px solid #E3E8F0',
                borderRadius: 14,
                padding: '14px 16px',
                cursor: 'pointer',
                fontFamily: 'Inter, sans-serif',
              }}
            >
              {/* Row 1: next test */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {/* Date block */}
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 10,
                    background: '#0B1F3A',
                    color: '#FFFFFF',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    lineHeight: 1.1,
                  }}
                >
                  <div style={{ fontSize: 15, fontWeight: 700 }}>{dayNum}</div>
                  <div
                    style={{
                      fontSize: 8,
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                    }}
                  >
                    {monthAbbr}
                  </div>
                </div>
                {/* Meta */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 500,
                      color: '#0B1F3A',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {next.name} · {next.test_centre || 'Test centre TBC'}
                  </div>
                  <div style={{ fontSize: 12, color: '#8792A2', marginTop: 2 }}>
                    {fmtDateTime(next.test_date, next.test_time)}
                  </div>
                </div>
                {/* Chevron */}
                <IconChevronRight size={18} stroke={2} color="#8792A2" style={{ flexShrink: 0 }} />
              </div>
              {/* Divider */}
              <div style={{ height: 1, background: '#EEF2F7', margin: '10px 0' }} />
              {/* Row 2: summary */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  {testsSorted.slice(0, 3).map((t, i) => {
                    const initials = (t.name ?? '').trim().charAt(0).toUpperCase() || '?';
                    return (
                      <div
                        key={t.id}
                        style={{
                          width: 22,
                          height: 22,
                          borderRadius: '50%',
                          background: brandColors[i % brandColors.length],
                          border: '2px solid #FFFFFF',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 10,
                          fontWeight: 600,
                          color: '#FFFFFF',
                          marginLeft: i === 0 ? 0 : -7,
                          zIndex: i,
                          position: 'relative',
                        }}
                      >
                        {initials}
                      </div>
                    );
                  })}
                  {testsSorted.length > 3 && (
                    <div
                      style={{
                        width: 22,
                        height: 22,
                        borderRadius: '50%',
                        background: '#D3D8E0',
                        border: '2px solid #FFFFFF',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 10,
                        fontWeight: 600,
                        color: '#5B6472',
                        marginLeft: -7,
                        zIndex: 3,
                        position: 'relative',
                      }}
                    >
                      +{testsSorted.length - 3}
                    </div>
                  )}
                </div>
                <span style={{ fontSize: 12, color: '#8792A2' }}>
                  {testsSorted.length} pupils with tests booked
                </span>
              </div>
            </div>
          );
        })()}


                  <style>{`
                    .qa-card:active { transform: scale(0.975); }
                    .qa-card:active .qa-icon { transform: scale(0.92); }
                    @keyframes qaRipple { 0% { transform: scale(0); opacity: 0.35; } 100% { transform: scale(2.6); opacity: 0; } }
                    .qa-card::after { content: ''; position: absolute; inset: 0; border-radius: inherit; background: radial-gradient(circle at center, rgba(15,32,68,0.18) 0%, transparent 60%); opacity: 0; pointer-events: none; }
                    .qa-card:active::after { animation: qaRipple 0.5s ease-out; }
                  `}</style>
                    <div style={{ background: PAGE_BACKGROUND, margin: '0 -16px 0', padding: '0 16px 0', borderRadius: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                        <SectionHeader>Quick Access</SectionHeader>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ display: 'flex', gap: 4 }}>
                          {Array.from({ length: totalPages }).map((_, i) => (
                            <div
                              key={i}
                              onClick={() => setQuickPage(i)}
                              style={{
                                width: quickPage === i ? 16 : 5,
                                height: 5,
                                borderRadius: 3,
                                background: quickPage === i ? '#0B1F3A' : '#D6DCE5',
                                transition: 'all 0.25s ease',
                                cursor: 'pointer',
                              }}
                            />
                          ))}
                        </div>
                        <button
                          type="button"
                          onClick={() => { setQuickSearchQuery(''); setQuickSearchOpen(true); }}
                          style={{
                            width: 32, height: 32, borderRadius: 999,
                            background: '#FFFFFF', border: 'none', padding: 0, marginLeft: 4, cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                          }}
                          aria-label="Search quick access"
                        >
                          <IconSearch size={15} color="#0B1F3A" />
                        </button>
                      </div>
                    </div>

                    <div
                      onTouchStart={(e) => { qaStartX.current = e.touches[0].clientX; }}
                      onTouchEnd={(e) => {
                        const dx = qaStartX.current - e.changedTouches[0].clientX;
                        if (dx > 50 && quickPage < totalPages - 1) setQuickPage((p) => p + 1);
                        if (dx < -50 && quickPage > 0) setQuickPage((p) => p - 1);
                      }}
                      style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}
                    >
                      {currentTiles.map((tile, idx) => renderQuickTile(tile, `${tile.label}-${idx}`))}
                    </div>
                  </div>


                  {quickSearchOpen && (
                    <div
                      onClick={() => setQuickSearchOpen(false)}
                      style={{
                        position: 'fixed',
                        top: 0, left: 0, right: 0, bottom: 0,
                        background: 'rgba(0,0,0,0.5)',
                        zIndex: 100,
                        display: 'flex',
                        alignItems: 'flex-end',
                        fontFamily: 'Inter, sans-serif',
                      }}
                    >
                      <div
                        onClick={(e) => e.stopPropagation()}
                        style={{
                          background: '#FFFFFF',
                          borderRadius: '20px 20px 0 0',
                          padding: 20,
                          maxHeight: '80vh',
                          overflowY: 'auto',
                          width: '100%',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                          <div style={{ fontSize: 16, fontWeight: 700, color: '#0B1F3A' }}>Search tools</div>
                          <button
                            type="button"
                            onClick={() => setQuickSearchOpen(false)}
                            style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                            aria-label="Close search"
                          >
                            <X size={20} color="#6B7280" />
                          </button>
                        </div>
                        <div style={{
                          background: '#F7FAFC',
                          border: '0.5px solid #E2E6ED',
                          borderRadius: 12,
                          padding: '12px 16px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          marginBottom: 16,
                        }}>
                          <Search size={16} color="#9CA3AF" />
                          <input
                            autoFocus
                            type="text"
                            placeholder="Search all features..."
                            value={quickSearchQuery}
                            onChange={(e) => setQuickSearchQuery(e.target.value)}
                            style={{
                              flex: 1,
                              border: 'none',
                              outline: 'none',
                              background: 'transparent',
                              fontSize: 14,
                              color: '#0B1F3A',
                              fontFamily: 'Inter, sans-serif',
                            }}
                          />
                        </div>
                        {searchResults.length === 0 ? (
                          <div style={{ fontSize: 14, color: '#9CA3AF', textAlign: 'center', padding: 24 }}>
                            No features found
                          </div>
                        ) : (
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
                            {searchResults.map((tile, idx) => renderQuickTile(tile, `qs-${tile.label}-${idx}`, () => setQuickSearchOpen(false)))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {runningLateOpen && (
                    <div
                      onClick={() => setRunningLateOpen(false)}
                      style={{
                        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100,
                        display: 'flex', alignItems: 'flex-end', fontFamily: 'Inter, sans-serif',
                      }}
                    >
                      <div
                        onClick={(e) => e.stopPropagation()}
                        style={{ background: '#FFFFFF', borderRadius: '20px 20px 0 0', padding: 20, width: '100%' }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                          <div style={{ width: 36, height: 36, borderRadius: 8, background: '#FBE2E2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <IconClock size={20} color="#C23B3B" strokeWidth={1.8} />
                          </div>
                          <div style={{ fontSize: 16, fontWeight: 700, color: '#0B1F3A' }}>Running late</div>
                        </div>
                        <div style={{ fontSize: 13, color: '#5A6B85', marginBottom: 16 }}>
                          Notify today's pupils you're running late. This will send a heads-up message to each pupil with a lesson later today.
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button
                            type="button"
                            onClick={() => setRunningLateOpen(false)}
                            style={{ flex: 1, padding: '12px', borderRadius: 12, border: '1px solid #E2E6ED', background: '#FFFFFF', color: '#0B1F3A', fontSize: 14, fontWeight: 600, fontFamily: 'Inter, sans-serif', cursor: 'pointer' }}
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => { setRunningLateOpen(false); navigate({ to: '/broadcast' as never }); }}
                            style={{ flex: 1, padding: '12px', borderRadius: 12, border: 'none', background: '#C23B3B', color: '#FFFFFF', fontSize: 14, fontWeight: 600, fontFamily: 'Inter, sans-serif', cursor: 'pointer' }}
                          >
                            Notify pupils
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {nearbyOpen && (() => {
                    const cats: { emoji: string; label: string; term: string }[] = [
                      { emoji: '🚻', label: 'Toilets', term: 'public+toilets' },
                      { emoji: '⚡', label: 'EV Chargers', term: 'EV+charging+station' },
                      { emoji: '☕', label: 'Coffee', term: 'coffee+shop' },
                      { emoji: '🅿️', label: 'Parking', term: 'car+park' },
                      { emoji: '🍔', label: 'Food', term: 'restaurants' },
                      { emoji: '⛽', label: 'Fuel', term: 'petrol+station' },
                    ];
                    const openCat = (c: { label: string; term: string }) => {
                      setNearbyLoading(c.label);
                      const done = (url: string) => {
                        setNearbyLoading(null);
                        setNearbyOpen(false);
                        window.open(url, '_blank', 'noopener,noreferrer');
                      };
                      if (!('geolocation' in navigator)) {
                        done(`https://www.google.com/maps/search/${c.term}`);
                        return;
                      }
                      navigator.geolocation.getCurrentPosition(
                        (pos) => done(`https://www.google.com/maps/search/${c.term}/@${pos.coords.latitude},${pos.coords.longitude},15z`),
                        () => done(`https://www.google.com/maps/search/${c.term}`),
                        { enableHighAccuracy: false, timeout: 8000, maximumAge: 60000 },
                      );
                    };
                    return (
                      <div
                        onClick={() => { if (!nearbyLoading) setNearbyOpen(false); }}
                        style={{
                          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100,
                          display: 'flex', alignItems: 'flex-end', fontFamily: 'Inter, sans-serif',
                        }}
                      >
                        <div
                          onClick={(e) => e.stopPropagation()}
                          style={{ background: '#FFFFFF', borderRadius: '20px 20px 0 0', padding: 20, width: '100%' }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                            <div style={{ width: 36, height: 36, borderRadius: 8, background: '#E6F1FB', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <IconMapPin size={20} color="#1877D6" stroke={1.8} />
                            </div>
                            <div style={{ fontSize: 16, fontWeight: 700, color: '#0B1F3A' }}>Find nearby</div>
                          </div>
                          <div style={{ fontSize: 13, color: '#5A6B85', marginBottom: 16 }}>
                            {nearbyLoading ? `Getting location…` : 'Opens Google Maps around your current location.'}
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                            {cats.map((c) => (
                              <button
                                key={c.label}
                                type="button"
                                disabled={!!nearbyLoading}
                                onClick={() => openCat(c)}
                                style={{
                                  background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 12, height: 56,
                                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2,
                                  cursor: nearbyLoading ? 'default' : 'pointer', opacity: nearbyLoading && nearbyLoading !== c.label ? 0.5 : 1,
                                  fontFamily: 'Inter, sans-serif', padding: 0,
                                }}
                              >
                                <span style={{ fontSize: 18, lineHeight: 1 }}>{c.emoji}</span>
                                <span style={{ fontSize: 11, fontWeight: 600, color: '#0B1F3A' }}>{c.label}</span>
                              </button>
                            ))}
                          </div>
                          <button
                            type="button"
                            onClick={() => { if (!nearbyLoading) setNearbyOpen(false); }}
                            style={{ marginTop: 14, width: '100%', padding: '12px', borderRadius: 12, border: '1px solid #E2E6ED', background: '#FFFFFF', color: '#0B1F3A', fontSize: 14, fontWeight: 600, fontFamily: 'Inter, sans-serif', cursor: 'pointer' }}
                          >
                            Close
                          </button>
                        </div>
                      </div>
                    );
                  })()}
                </>
              );
            })()}

            <DiscoverGrid />





          </div>
        );
      })()}


        <div style={{ height: 10 }} />
        </section>







      {unreadMsgs.length > 0 && (
        <div style={{ padding: "0 16px", marginTop: 16, fontFamily: "Inter, sans-serif" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <MessageSquare size={18} color="#0B1F3A" />
              <div style={{ fontSize: 16, fontWeight: 700, color: "#0B1F3A" }}>Messages</div>
              <span style={{ background: "#CC2229", color: "#FFFFFF", fontSize: 12, borderRadius: 999, padding: "2px 8px", fontWeight: 600 }}>
                {unreadMsgs.length}
              </span>
            </div>
            <button
              onClick={() => navigate({ to: "/messages" as never })}
              style={{ background: "none", border: "none", color: "#1877D6", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
            >
              See all →
            </button>
          </div>
          {unreadMsgs.map((m) => {
            const displayName = m.pupils?.first_name || m.pupils?.name || "Pupil";
            const initials = displayName
              .split(/\s+/)
              .map((s) => s.charAt(0))
              .join("")
              .slice(0, 2)
              .toUpperCase();
            return (
              <div
                key={m.id}
                onClick={() => navigate({ to: "/messages/$pupilId" as never, params: { pupilId: m.pupil_id } as never })}
                style={{
                  background: "#FFFFFF",
                  border: "0.5px solid #E2E6ED",
                  borderRadius: 10,
                  padding: "12px 14px",
                  marginBottom: 8,
                  display: "flex",
                  alignItems: "center",
                  cursor: "pointer",
                }}
              >
                <div style={{
                  width: 36, height: 36, borderRadius: "50%",
                  background: "#1877D6",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: "#FFFFFF", fontSize: 13, fontWeight: 700, flexShrink: 0,
                  backgroundImage: (m.pupils?.profile_image_url ?? (m.pupils as any)?.photo_url) ? `url(${m.pupils?.profile_image_url ?? (m.pupils as any)?.photo_url})` : undefined,
                  backgroundSize: "cover", backgroundPosition: "center",
                }}>
                  {!(m.pupils?.profile_image_url ?? (m.pupils as any)?.photo_url) && initials}

                </div>
                <div style={{ paddingLeft: 10, flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#0B1F3A" }}>{displayName}</div>
                  <div style={{ fontSize: 12, color: "#6B7280", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {m.body || ""}
                  </div>
                  <div style={{ fontSize: 10, color: "#9CA3AF", marginTop: 2 }}>{(() => {
                    const diff = Math.max(0, Date.now() - new Date(m.created_at).getTime());
                    const mm = Math.floor(diff / 60000);
                    if (mm < 1) return "just now";
                    if (mm < 60) return `${mm}m ago`;
                    const h = Math.floor(mm / 60);
                    if (h < 24) return `${h}h ago`;
                    return `${Math.floor(h / 24)}d ago`;
                  })()}</div>
                </div>
                {!m.read_at && (
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#CC2229", flexShrink: 0, marginLeft: 8 }} />
                )}
              </div>
            );
          })}
        </div>
      )}


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

      {cancelSheetForLesson && (
        <CancelLessonSheet
          open={true}
          onClose={() => setCancelSheetForLesson(null)}
          pupilName={pupilName(cancelSheetForLesson)}
          pupilId={cancelSheetForLesson.pupil_id ?? ""}
          lessonId={cancelSheetForLesson.id}
          lessonDate={cancelSheetForLesson.lesson_date}
          lessonTime={cancelSheetForLesson.lesson_time}
          paymentStatus={(cancelSheetForLesson as any).payment_status ?? null}
          amountDue={Number((cancelSheetForLesson as any).amount_due ?? 0)}
          when={`${cancelSheetForLesson.lesson_date} at ${(cancelSheetForLesson.lesson_time ?? "").slice(0, 5)}`}
          onCancelled={() => {
            const id = cancelSheetForLesson.id;
            setLessons((prev) => (prev ?? []).map((l) => l.id === id ? { ...l, status: "cancelled" } : l));
            toast.success("Lesson cancelled");
            setCancelSheetForLesson(null);
          }}
        />
      )}

      {deleteSheetForLesson && (
        <DeleteLessonSheet
          open={true}
          submitting={deleteSubmittingHome}
          onClose={() => { if (!deleteSubmittingHome) setDeleteSheetForLesson(null); }}
          onConfirm={async (reason: string) => {
            const lesson = deleteSheetForLesson;
            if (!lesson) return;
            setDeleteSubmittingHome(true);
            try {
              const { error } = await supabase
                .from("lessons")
                .update({ deleted_at: new Date().toISOString(), deletion_reason: reason })
                .eq("id", lesson.id);
              if (error) throw error;
              setLessons((prev) => (prev ?? []).filter((l) => l.id !== lesson.id));
              toast.success("Lesson deleted");
              setDeleteSheetForLesson(null);
            } catch (err: any) {
              toast.error(err?.message || "Failed to delete lesson");
            } finally {
              setDeleteSubmittingHome(false);
            }
          }}
        />
      )}

      {paymentSheetForLesson && (
        <PaymentDetailsSheet
          open={true}
          onClose={() => setPaymentSheetForLesson(null)}
          pupilName={pupilName(paymentSheetForLesson)}
          lessonDate={paymentSheetForLesson.lesson_date}
          lessonTime={String(paymentSheetForLesson.lesson_time ?? "").slice(0, 5)}
          paymentStatus={(paymentSheetForLesson as any).payment_status ?? ""}
          amountDue={Number((paymentSheetForLesson as any).amount_due ?? 0)}
          prepaidHours={Number((paymentSheetForLesson.pupils as any)?.prepaid_hours ?? 0)}
          duration={paymentSheetForLesson.duration_minutes ?? 60}
          pupilId={(paymentSheetForLesson as any).pupil_id ?? null}
          pupilPhone={(paymentSheetForLesson.pupils as any)?.phone ?? null}
          lessonId={(paymentSheetForLesson as any).id ?? null}
        />
      )}

      <AddLessonSheet
        open={addLessonOpen}
        onClose={() => setAddLessonOpen(false)}
        initialPupilId={addLessonPupilId}
        initialDate={addLessonDate}
        onSaved={() => {
          setAddLessonOpen(false);
          setReloadKey((k) => k + 1);
        }}
      />

      <UnifiedPaymentSheet
        open={unifiedPayOpen}
        onClose={() => setUnifiedPayOpen(false)}
        initialPupilId={unifiedPayPupilId}
        onSaved={() => {
          setUnifiedPayOpen(false);
          setUnifiedPayPupilId(undefined);
          setReloadKey((k) => k + 1);
        }}
      />

      <AddExpenseSheet
        open={addExpenseOpen}
        onClose={() => setAddExpenseOpen(false)}
        onSaved={() => setReloadKey((k) => k + 1)}
      />

      <LogMileageSheet
        open={logMileageOpen}
        onClose={() => setLogMileageOpen(false)}
        onSaved={() => setReloadKey((k) => k + 1)}
      />

      <SendMessageSheet
        open={sendMessageOpen}
        onClose={() => { setSendMessageOpen(false); setSendMessagePupilId(undefined); }}
        initialPupilId={sendMessagePupilId}
        onSent={() => setReloadKey((k) => k + 1)}
      />






      <ConfirmDialog
        open={!!confirmMoveHome}
        title="Move lesson?"
        message={
          confirmMoveHome && movingLessonHome
            ? `Move ${(movingLessonHome.pupils as any)?.name || 'this lesson'} from ${movingLessonHome.lesson_date} at ${movingLessonHome.lesson_time} to ${confirmMoveHome.date} at ${confirmMoveHome.time}?`
            : ''
        }
        confirmLabel="Move"
        cancelLabel="Cancel"
        destructive={false}
        onCancel={() => setConfirmMoveHome(null)}
        onConfirm={() => {
          if (!confirmMoveHome) return;
          handleMoveLessonHome(confirmMoveHome.date, confirmMoveHome.time);
          setConfirmMoveHome(null);
        }}
      />

      <OutstandingBreakdownModal
        open={outstandingOpen}
        onClose={() => setOutstandingOpen(false)}
        total={outstanding}
        rows={outstandingBreakdown}
        instructorName={instructorFullName || firstName}
        onView={(id: string) => {
          setOutstandingOpen(false);
          navigate({ to: "/pupils/$id", params: { id } });
        }}
      />

      <EarningsBreakdownModal
        open={earningsOpen}
        onClose={() => setEarningsOpen(false)}
        total={weekEarnings}
        rows={earningsRows}
        onRecord={() => { setEarningsOpen(false); navigate({ to: "/schedule" }); }}
        onViewMTD={() => { setEarningsOpen(false); navigate({ to: "/month-to-date" }); }}
        onEdit={async (row, updates) => {
          const iso = updates.date ? new Date(updates.date + "T12:00:00").toISOString() : row.date;
          const { error } = await supabase
            .from("lesson_history")
            .update({
              lesson_cost: updates.amount,
              payment_method: updates.method,
              created_at: iso,
            })
            .eq("id", row.id);
          if (error) {
            console.error("[home] earnings edit failed", error);
            toast.error("Couldn't update payment");
            return;
          }
          const delta = updates.amount - row.amount;
          setEarningsRows((rs) =>
            rs
              .map((r) =>
                r.id === row.id && r.source === row.source
                  ? { ...r, amount: updates.amount, method: updates.method, date: iso }
                  : r,
              )
              .sort((a, b) => (a.date < b.date ? 1 : -1)),
          );
          setWeekEarnings((n) => n + delta);
          toast.success("Payment updated");
        }}
        onDelete={async (row) => {
          const nowIso = new Date().toISOString();

          if (row.source === "lesson-earned") {
            // Fix 2: reverse lesson to unpaid (amount_due is fixed at lesson
            // creation and must never change here), reverse account_balance if
            // applicable, and soft-delete the
            // corresponding payments + lesson_history rows.
            const { data: lessonRow, error: lessonFetchErr } = await supabase
              .from("lessons")
              .select("id, pupil_id, payment_status, amount_due, paid_amount, paid_at, pupils(pricing_type)")
              .eq("id", row.id)
              .maybeSingle();
            if (lessonFetchErr) {
              console.error("[home] earnings delete: lesson fetch failed", lessonFetchErr);
              toast.error("Couldn't delete payment");
              return;
            }

            const restoreAmount = Number(row.amount) || 0;
            const wasPrepaid = lessonRow?.payment_status === "prepaid";
            // Block / national intensives pupils pay up front, so their lessons
            // revert to prepaid rather than unpaid.
            const pricingType = (
              ((lessonRow as any)?.pupils?.pricing_type as string | null) ?? ""
            ).toLowerCase();
            const isPrepaidPricing =
              pricingType === "block" || pricingType === "national_intensives";

            const { error: lErr } = await supabase
              .from("lessons")
              .update({
                payment_status: isPrepaidPricing ? "prepaid" : "unpaid",
                paid_at: null,
                paid_amount: null,
                payment_method: null,
              })
              .eq("id", row.id);
            if (lErr) {
              console.error("[home] earnings delete: lesson update failed", lErr);
              toast.error("Couldn't delete payment");
              return;
            }

            // Reverse the credit through the payments API so the unwind is
            // audited rather than a bare account_balance patch.
            if (wasPrepaid && lessonRow?.pupil_id) {
              const { data: pRow } = await supabase
                .from("pupils")
                .select("account_balance")
                .eq("id", lessonRow.pupil_id)
                .maybeSingle();
              const current = Number((pRow as { account_balance?: number | null } | null)?.account_balance ?? 0);
              if (restoreAmount > 0) {
                try {
                  await recordRefund({
                    pupilId: lessonRow.pupil_id,
                    amount: restoreAmount,
                    method: "cash",
                    notes: "Gap filler lesson cancelled — credit restored",
                    currentAccountBalance: current,
                  });
                } catch (e) {
                  console.error("[home] recordRefund error", e);
                }
              }
            }


            // Soft-delete legacy payments row(s) for this lesson
            const { error: payErr } = await supabase
              .from("payments")
              .update({ deleted_at: nowIso })
              .eq("instructor_id", userId)
              .eq("pupil_id", lessonRow?.pupil_id)
              .eq("amount", lessonRow?.amount_due)
              .eq("paid_at", lessonRow?.paid_at)
              .is("deleted_at", null);
            if (payErr) console.error("[home] payments soft-delete error", payErr);

            // Soft-delete lesson_history row(s) for this lesson
            const { error: histErr } = await supabase
              .from("lesson_history")
              .update({ deleted_at: nowIso })
              .eq("lesson_id", row.id)
              .is("deleted_at", null);
            if (histErr) console.error("[home] lesson_history soft-delete error", histErr);
          } else if (row.source === "booking") {
            const { error } = await supabase
              .from("course_bookings")
              .update({ status: "cancelled" })
              .eq("id", row.id);
            if (error) {
              console.error("[home] booking cancel failed", error);
              toast.error("Couldn't delete payment");
              return;
            }
          }

          setEarningsRows((rs) => rs.filter((r) => !(r.id === row.id && r.source === row.source)));
          setWeekEarnings((n) => Math.max(0, n - row.amount));
          toast.success("Payment deleted");
        }}
      />

      <LessonsBreakdownModal
        open={lessonsOpen}
        onClose={() => setLessonsOpen(false)}
        rows={weekLessonRows}
        onOpenLesson={(id: string) => {
          setLessonsOpen(false);
          const row = weekLessonRows.find((r) => r.id === id);
          if (row?.pupil_id) {
            navigate({ to: "/pupils/$id", params: { id: row.pupil_id } as any, search: { lessonId: id } as any });
          }
        }}
        onDelete={async (id: string, reason: string, notes: string) => {
          const prev = weekLessonRows;
          setWeekLessonRows((rs) => rs.filter((r) => r.id !== id));
          setWeekLessonCount((n: number) => Math.max(0, n - 1));
          try {
            const { error } = await supabase
              .from("lessons")
              .update({
                deleted_at: new Date().toISOString(),
                cancellation_reason: reason,
                cancellation_notes: notes || null,
              })
              .eq("id", id);
            if (error) throw error;
            toast.success("Lesson removed");
          } catch (e: any) {
            setWeekLessonRows(prev);
            setWeekLessonCount((n: number) => n + 1);
            toast.error(e?.message || "Failed to delete lesson");
          }
        }}
      />

      <TestsBreakdownModal
        open={testsOpen}
        onClose={() => setTestsOpen(false)}
        tests={upcomingTests}
        swapRequests={swapRequests}
        onOpenPupil={(id: string) => {
          setTestsOpen(false);
          navigate({ to: "/pupils/$id", params: { id } });
        }}
      />



      {birthdaySheetOpen && (
        <div className="fixed inset-0 z-[70] flex flex-col justify-end" style={{ fontFamily: 'Inter, sans-serif' }}>
          <div className="absolute inset-0 bg-black/40" onClick={() => setBirthdaySheetOpen(false)} />
          <div className="relative w-full max-w-[430px] mx-auto bg-white rounded-t-2xl pt-5 pb-6 max-h-[85vh] overflow-y-auto" style={{ animation: 'slideUp 0.25s ease-out' }}>
            <div className="flex items-center justify-between px-4 mb-3">
              <div className="flex items-center gap-2">
                <IconGift size={20} color="#6B4FD6" />
                <div className="text-[16px] font-semibold" style={{ color: '#0B1F3A' }}>
                  {birthdayToday.length === 1 ? 'Birthday today' : `${birthdayToday.length} birthdays today`}
                </div>
              </div>
              <button type="button" onClick={() => setBirthdaySheetOpen(false)} aria-label="Close">
                <IconX size={20} color="#6B7280" />
              </button>
            </div>
            {birthdayToday.map((p) => {
              const displayName = p.first_name || p.name || 'Pupil';
              const initials = displayName.split(/\s+/).map((s) => s.charAt(0)).join('').slice(0, 2).toUpperCase();
              const age = p.date_of_birth
                ? Math.floor((Date.now() - new Date(p.date_of_birth).getTime()) / (365.25 * 86400000))
                : null;
              const bg = p.calendar_colour || '#6B4FD6';
              const giftMsg = encodeURIComponent(
                `Happy birthday ${displayName}! 🎂 As a birthday treat, I'd like to offer you £10 off your next lesson. Just mention this message when we next speak. Hope you have a wonderful day!`
              );
              return (
                <div key={p.id} style={{ borderTop: '0.5px solid #F3F4F6' }}>
                  <div className="flex items-center gap-3" style={{ padding: '14px 16px' }}>
                    <div style={{ width: 40, height: 40, borderRadius: 20, background: bg, color: '#FFFFFF', fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[14px] font-semibold truncate" style={{ color: '#0B1F3A' }}>{displayName}</div>
                      {age !== null && (
                        <div className="text-[12px]" style={{ color: '#9CA3AF' }}>{age} today 🎂</div>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 px-4 pb-3">
                    <a
                      href={p.phone ? `sms:${p.phone}?body=${giftMsg}` : `sms:?body=${giftMsg}`}
                      className="flex-1 text-center rounded-xl py-2.5 px-4 text-[13px] font-semibold"
                      style={{ background: '#7C3AED', color: '#FFFFFF', textDecoration: 'none' }}
                    >
                      🎁 Send gift message
                    </a>
                    <button
                      type="button"
                      onClick={() => { setBirthdaySheetOpen(false); navigate({ to: '/messages/$pupilId' as never, params: { pupilId: p.id } as never }); }}
                      className="flex-1 rounded-xl py-2.5 px-4 text-[13px] font-semibold"
                      style={{ background: '#0B1F3A', color: '#FFFFFF', border: 'none', cursor: 'pointer' }}
                    >
                      💬 Message
                    </button>
                  </div>
                </div>
              );
            })}
            <div className="px-4 mt-2">
              <button
                type="button"
                onClick={() => setBirthdaySheetOpen(false)}
                className="w-full rounded-xl py-2.5 text-[13px] font-semibold"
                style={{ background: '#F3F4F6', color: '#6B7280', border: 'none', cursor: 'pointer' }}
              >
                ✓ Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REPORT ALERT FAB */}
      {localAlerts !== null && (
        <button
          onClick={() => navigate({ to: '/community' as never })}
          style={{
            position: 'fixed',
            bottom: 'calc(80px + env(safe-area-inset-bottom, 0px) + 12px)',
            right: 16,
            background: '#CC2229',
            border: 'none',
            borderRadius: '50%',
            width: 48,
            height: 48,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(204,34,41,0.4)',
            zIndex: 40,
          }}
          aria-label="Report local issue"
        >
          <AlertTriangle size={20} color="white" />
        </button>
      )}
    </PageLayout>


  );



}

function HeroExpandedPanel({
  lesson,
  prev,
  goingActive,
  setGoingActive,
  onOpenLate,
  navigateTo,
  onOpenLesson,
  onEol,
}: {
  lesson: LessonRow;
  prev: PrevLessonRow | null;
  goingActive: boolean;
  setGoingActive: (v: boolean) => void;
  onOpenLate: () => void;
  navigateTo: (to: string) => void;
  onOpenLesson: () => void;
  onEol: () => void;
}) {
  const navigate = useNavigate();
  const verifyAddressFn = useServerFn(verifyAddress);
  const phone = lesson.pupils?.phone ?? null;
  const firstName = (lesson.pupils?.name ?? "there").split(/\s+/)[0];
  const balance = Number(lesson.amount_due ?? 0);
  const pickupPostcode = ""; // no pickup field on schema

  const sendSms = (body: string) => {
    if (!phone) { toast("No phone number"); return; }
    window.location.href = `sms:${phone}?&body=${encodeURIComponent(body)}`;
  };

  const pillBase: React.CSSProperties = {
    background: '#F2F2F7',
    border: 'none',
    borderRadius: 9,
    padding: '8px 4px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    cursor: 'pointer',
    fontFamily: 'Inter, sans-serif',
    fontSize: 11,
    fontWeight: 500,
    color: '#0B1F3A',
  };
  const pillLabel: React.CSSProperties = { fontSize: 11, fontWeight: 500 };
  const sectionLabel: React.CSSProperties = {
    fontSize: 11,
    fontWeight: 600,
    color: '#8E8E93',
    textTransform: 'uppercase',
    letterSpacing: 0.2,
    marginBottom: 6,
    fontFamily: 'Inter, sans-serif',
  };

  // --- Pickup address (home address default, editable alternative) ---
  const homeAddress = lesson.pupils?.address ?? '';
  const [pickupValue, setPickupValue] = useState<string>(lesson.pickup_location ?? homeAddress);
  const [pickupState, setPickupState] = useState<'idle' | 'checking' | 'ok' | 'bad'>('idle');
  const [isEditingPickup, setIsEditingPickup] = useState(false);
  // The address string the current pickupState was computed for — keeps the
  // verified/unverified line visible after a save + refetch echoes the value back.
  const verifiedForRef = useRef<string | null>(null);

  // --- what3words (manual entry, 3 boxes) ---
  const [w3w, setW3w] = useState<[string, string, string]>(['', '', '']);
  const [w3wState, setW3wState] = useState<'idle' | 'checking' | 'ok' | 'bad'>('idle');

  const lessonIdRef = useRef(lesson.id);
  const pickupValueRef = useRef(pickupValue);
  pickupValueRef.current = pickupValue;
  useEffect(() => {
    const incoming = lesson.pickup_location ?? homeAddress;
    const lessonChanged = lessonIdRef.current !== lesson.id;
    lessonIdRef.current = lesson.id;
    // Same lesson: only adopt the incoming value if it genuinely differs from
    // what we're showing (i.e. changed elsewhere) — a refetch echoing back the
    // value we just saved must not wipe the verification result.
    if (!lessonChanged && pickupValueRef.current.trim() === incoming.trim()) return;
    setPickupValue(incoming);
    setPickupState('idle');
    verifiedForRef.current = null;
    if (lessonChanged) setIsEditingPickup(false);
  }, [lesson.id, lesson.pickup_location, homeAddress]);



  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('pupils')
        .select('what3words')
        .eq('id', lesson.pupil_id)
        .maybeSingle();
      const raw = (data as { what3words?: string | null } | null)?.what3words ?? '';
      if (cancelled || !raw) return;
      const parts = String(raw).replace(/^\/+/, '').split('.');
      if (parts.length === 3) setW3w([parts[0], parts[1], parts[2]]);
    })();
    return () => { cancelled = true; };
  }, [lesson.pupil_id]);

  const verifyAndSavePickup = async () => {
    if (pickupState === 'checking') return;
    const address = pickupValue.trim();
    if (!address) {
      setPickupState('idle');
      verifiedForRef.current = null;
      setPickupValue(homeAddress);
      setIsEditingPickup(false);
      if (lesson.pickup_location) {
        const { error } = await supabase
          .from('lessons')
          .update({ pickup_location: null })
          .eq('id', lesson.id);
        if (error) { console.error('[pickup] clear failed', error); toast("Couldn't save pickup"); }
        else toast('Pickup reset to home address');
      }
      return;
    }
    setPickupState('checking');
    verifiedForRef.current = address;
    // Give Google postcode context so house-number-only entries resolve.
    const postcode = (lesson.pupils?.postcode ?? '').trim();
    const query = postcode && !address.toUpperCase().includes(postcode.toUpperCase())
      ? `${address}, ${postcode}`
      : address;
    let verified = false;
    let addressToSave = address;
    try {
      const res = await verifyAddressFn({ data: { address: query } });
      verified = Boolean(res?.verified);
      if (verified && res?.formattedAddress) {
        addressToSave = res.formattedAddress;
        setPickupValue(addressToSave);
        verifiedForRef.current = addressToSave;
      }
      if (!verified && res?.reason) console.warn('[pickup] not verified:', res.reason);
    } catch (e) {
      console.warn('[pickup] geocode failed', e);
    }
    setPickupState(verified ? 'ok' : 'bad');
    const nextPickupLocation = addressToSave.trim() === homeAddress.trim() ? null : addressToSave;
    if ((nextPickupLocation ?? '') !== (lesson.pickup_location ?? '')) {
      const { error } = await supabase
        .from('lessons')
        .update({ pickup_location: nextPickupLocation })
        .eq('id', lesson.id);
      if (error) { console.error('[pickup] save failed', error); toast("Couldn't save pickup"); }
      else toast('Pickup saved');
    }
    setIsEditingPickup(false);

  };

  const verifyAndSaveW3w = async () => {
    const [a, b, c] = w3w.map((s) => s.trim().toLowerCase());
    if (!a || !b || !c) { setW3wState('idle'); return; }
    const words = `${a}.${b}.${c}`;
    setW3wState('checking');
    let verified = false;
    try {
      const key = import.meta.env.VITE_W3W_API_KEY as string | undefined;
      const r = await fetch(
        `https://api.what3words.com/v3/convert-to-coordinates?words=${encodeURIComponent(words)}&key=${key ?? ''}`,
      );
      const j = await r.json();
      verified = Boolean(j?.coordinates);
    } catch (e) {
      console.warn('[w3w] lookup failed', e);
    }
    setW3wState(verified ? 'ok' : 'bad');
    const { error } = await supabase
      .from('pupils')
      .update({ what3words: words })
      .eq('id', lesson.pupil_id);
    if (error) { console.error('[w3w] save failed', error); toast("Couldn't save what3words"); }
  };

  const gridBtn: React.CSSProperties = {
    background: '#F5F7FA',
    border: '1px solid #E2E8F0',
    borderRadius: 12,
    padding: '10px 4px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    cursor: 'pointer',
    fontFamily: 'Inter, sans-serif',
    fontSize: 11,
    fontWeight: 500,
    color: '#0B1F3A',
  };
  const gridBtnDanger: React.CSSProperties = {
    ...gridBtn,
    background: '#FCE9E9',
    border: '1px solid #F5CBCB',
    color: '#CC2229',
  };
  const fieldInput: React.CSSProperties = {
    flex: 1,
    minWidth: 0,
    background: '#FFFFFF',
    border: '1px solid #E2E8F0',
    borderRadius: 10,
    padding: '9px 12px',
    fontFamily: 'Inter, sans-serif',
    fontSize: 13,
    color: '#0B1F3A',
    outline: 'none',
  };

  const statusLine = (
    state: 'idle' | 'checking' | 'ok' | 'bad',
    okText: string,
    badText: string,
  ) => {
    if (state === 'checking') {
      return <div style={{ marginTop: 6, fontSize: 11, color: '#8E8E93', fontFamily: 'Inter, sans-serif' }}>Checking…</div>;
    }
    if (state === 'ok') {
      return (
        <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#1F6B2E', fontFamily: 'Inter, sans-serif' }}>
          <IconCircleCheck size={14} stroke={1.8} /> {okText}
        </div>
      );
    }
    if (state === 'bad') {
      return (
        <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#B45309', fontFamily: 'Inter, sans-serif' }}>
          <IconAlertTriangle size={14} stroke={1.8} /> {badText}
        </div>
      );
    }
    return (
      <div style={{ marginTop: 6, fontSize: 11, color: '#8E8E93', fontFamily: 'Inter, sans-serif' }}>Not yet verified</div>
    );
  };

  return (
    <div style={{ background: '#F3F8FF', borderRadius: 16, padding: 12 }}>
      {/* Quick Actions */}
      <div style={sectionLabel}>Quick Actions</div>
      {/* Row 1 — Navigate / Text / Call */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
        <button
          style={{ ...gridBtn, background: goingActive ? '#FFF8E8' : '#FFFFFF' }}
          onClick={() => { setGoingActive(true); sendSms(`Hi ${firstName}, on the way!`); }}
        >
          <IconNavigation size={18} stroke={1.8} color="#0B1F3A" />
          <span style={pillLabel}>Navigate</span>
        </button>
        <button
          type="button"
          style={{ ...gridBtn, background: '#FFFFFF' }}
          onClick={(e) => { e.stopPropagation(); navigate({ to: '/messages/$pupilId', params: { pupilId: lesson.pupil_id } as any }); }}
        >
          <IconMessage size={18} stroke={1.8} color="#0B1F3A" />
          <span style={pillLabel}>Text</span>
        </button>
        <button
          type="button"
          style={{ ...gridBtn, background: '#FFFFFF' }}
          onClick={(e) => { e.stopPropagation(); if (!phone) { toast('No phone number'); return; } window.location.href = `tel:${phone}`; }}
        >
          <IconPhone size={18} stroke={1.8} color="#0B1F3A" />
          <span style={pillLabel}>Call</span>
        </button>
      </div>

      {/* Row 2 — Prep / Running late / I'm here */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginTop: 8 }}>
        <button style={{ ...gridBtn, background: '#FFFFFF' }} onClick={onOpenLesson}>
          <IconClipboardList size={18} stroke={1.8} color="#0B1F3A" />
          <span style={pillLabel}>Prep</span>
        </button>
        <button style={gridBtnDanger} onClick={onOpenLate}>
          <IconClockExclamation size={18} stroke={1.8} color="#CC2229" />
          <span style={{ ...pillLabel, color: '#CC2229' }}>Running late</span>
        </button>
        <button
          style={{ ...gridBtn, background: '#E8F5E9' }}
          onClick={() => sendSms(`Hi ${firstName}, I'm outside whenever you're ready 👋`)}
        >
          <IconCurrentLocation size={18} stroke={1.8} color="#0B1F3A" />
          <span style={pillLabel}>I'm here</span>
        </button>
      </div>

      {/* Row 3 — Edit lesson / EOL */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 8 }}>
        <button
          type="button"
          style={{ ...gridBtn, background: '#FFFFFF' }}
          onClick={() => navigate({ to: '/lessons/edit/$id', params: { id: lesson.id } })}
        >
          <IconPencil size={18} stroke={1.8} color="#0B1F3A" />
          <span style={pillLabel}>Edit lesson</span>
        </button>
        <button
          type="button"
          style={gridBtnDanger}
          onClick={(e) => { e.stopPropagation(); onEol(); }}
        >
          <IconCircleCheck size={18} stroke={1.8} color="#CC2229" />
          <span style={{ ...pillLabel, color: '#CC2229' }}>EOL</span>
        </button>
      </div>

      {/* Pickup */}
      <div style={{ marginTop: 14 }}>
        <div style={sectionLabel}>Pickup</div>
        {isEditingPickup ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <MapPin size={14} color="#8E8E93" />
            <input
              value={pickupValue}
              onChange={(e) => { setPickupValue(e.target.value); setPickupState('idle'); verifiedForRef.current = null; }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  verifyAndSavePickup();
                }
              }}
              placeholder="Enter pickup address"
              style={fieldInput}
              autoFocus
            />
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={verifyAndSavePickup}
              disabled={pickupState === 'checking'}
              aria-label="Verify and save pickup address"
              style={{
                width: 34,
                height: 34,
                borderRadius: 10,
                border: '1px solid #B7E4C7',
                background: pickupState === 'checking' ? '#F5F7FA' : '#E8F5E9',
                color: '#1F6B2E',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: pickupState === 'checking' ? 'default' : 'pointer',
                flexShrink: 0,
              }}
            >
              <IconCircleCheck size={18} stroke={1.8} />
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 10, padding: '9px 12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
              <MapPin size={14} color="#8E8E93" />
              <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, color: '#0B1F3A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {pickupValue || 'No address set'}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsEditingPickup(true)}
              style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', color: '#8E8E93', flexShrink: 0 }}
              aria-label="Edit pickup address"
            >
              <Pencil size={16} />
            </button>
          </div>
        )}
        {statusLine(
          verifiedForRef.current !== null && verifiedForRef.current === pickupValue.trim() ? pickupState : 'idle',
          'Verified via Google Maps',
          "Couldn't verify — check for typos",
        )}

      </div>

      {/* what3words */}
      <div style={{ marginTop: 14 }}>
        <div style={sectionLabel}>what3words</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ color: '#E11F26', fontWeight: 700, fontFamily: 'Inter, sans-serif', fontSize: 15 }}>///</span>
          {[0, 1, 2].map((i) => (
            <Fragment key={i}>
              {i > 0 && <span style={{ color: '#0B1F3A', fontWeight: 700 }}>.</span>}
              <input
                value={w3w[i]}
                onChange={(e) => {
                  const next = [...w3w] as [string, string, string];
                  next[i] = e.target.value.replace(/[^a-zA-Z\u00C0-\u024F-]/g, '');
                  setW3w(next);
                  setW3wState('idle');
                }}
                onBlur={verifyAndSaveW3w}
                placeholder={`word${i + 1}`}
                style={{ ...fieldInput, textAlign: 'center', padding: '9px 6px' }}
              />
            </Fragment>
          ))}
        </div>
        {statusLine(w3wState, 'Verified via what3words', 'Not a recognised what3words address')}
      </div>


      {/* Account — driven by lessons.payment_status + lessons.amount_due */}
      {(() => {
        const status = (lesson.payment_status ?? 'unpaid').toLowerCase();
        const amount = balance;

        let label: string | null = null;
        let fg = '#0B1F3A';
        let bg = '#FEF7E8';
        let showActions = false;

        if (status === 'paid') {
          label = 'Paid ✓'; fg = '#1F6B2E';
        } else if (status === 'prepaid') {
          label = 'Prepaid ✓'; fg = '#1F6B2E';
        } else if (status === 'cancelled') {
          label = 'Cancelled'; fg = '#5A6270'; bg = '#E9EDF2';
        } else if (status === 'partial') {
          label = `£${amount.toFixed(2)} remaining`; fg = '#8A5A00'; showActions = true;
        } else if (status === 'unpaid' && amount > 0) {
          label = `£${amount.toFixed(2)} due`; fg = '#8A5A00'; showActions = true;
        }

        if (!label) return null;

        return (
          <div style={{ marginTop: 14 }}>
            <div style={sectionLabel}>Account</div>
            <div style={{ background: bg, borderRadius: 9, padding: '11px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, fontFamily: 'Inter, sans-serif' }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: fg }}>{label}</span>
              {showActions && (
                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    onClick={() => sendSms(`Hi ${firstName}, just a quick reminder that £${amount.toFixed(2)} is outstanding on your lesson account. Thanks!`)}
                    style={{ background: '#FFFFFF', color: '#0B1F3A', fontSize: 11, fontWeight: 500, padding: '0 10px', height: 26, borderRadius: 8, border: 'none', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}
                  >Chase</button>
                  <button
                    onClick={() => navigateTo('/payments')}
                    style={{ background: '#3B6D11', color: '#FFFFFF', fontSize: 11, fontWeight: 500, padding: '0 10px', height: 26, borderRadius: 8, border: 'none', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}
                  >Mark paid</button>
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* Last lesson */}
      <div style={{ marginTop: 14 }}>
        <div style={sectionLabel}>Last Lesson</div>
        {prev ? (
          <div style={{ background: '#F2F2F7', borderRadius: 9, padding: '10px 12px', fontFamily: 'Inter, sans-serif' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: '#0B1F3A' }}>
                {new Date(prev.lesson_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
              </span>
              <span style={{ fontSize: 9, fontWeight: 500, padding: '2px 8px', borderRadius: 999, color: '#5A6270', background: '#E9EDF2', textTransform: 'capitalize' }}>{prev.status}</span>
            </div>
            {prev.notes && (
              <div style={{ marginTop: 5, color: '#5A6270', fontSize: 11, lineHeight: 1.4 }}>
                {prev.notes}
              </div>
            )}
          </div>
        ) : (
          <div style={{ background: '#F2F2F7', borderRadius: 9, padding: '10px 12px', color: '#8A93A3', fontFamily: 'Inter, sans-serif', fontSize: 12 }}>No previous lesson</div>
        )}
      </div>

      {/* Full pupil profile link */}
      <button
        type="button"
        onClick={() => navigate({ to: '/pupils/$id', params: { id: lesson.pupil_id }, search: { lessonId: lesson.id } })}
        style={{
          marginTop: 14,
          width: '100%',
          textAlign: 'center',
          background: 'none',
          border: 'none',
          color: '#1877D6',
          fontFamily: 'Inter, sans-serif',
          fontSize: 12,
          fontWeight: 600,
          cursor: 'pointer',
          padding: 0,
        }}
      >
        View full pupil profile →
      </button>
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
        borderColor: "#EEF2F7",
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
        color: active ? "#0B1F3A" : "#6B7280",
        borderRadius: 8,
        padding: "8px 6px",
        fontWeight: 500,
        fontSize: 13,
        fontFamily: "Inter, sans-serif",
        lineHeight: 1.2,
        border: "none",
        cursor: "pointer",
        boxShadow: active ? "inset 0 0 0 0.5px rgba(15,32,68,0.10)" : "none",
        transition: "background 150ms ease",
      }}
    >
      {children}
    </button>
  );
}


function iconTint(solid: string) {
  switch (solid.toUpperCase()) {
    case "#1877D6": return "#F3F8FF";
    case "#0B1F3A": return "#EEF2F7";
    case "#DC2626": return "#FEF2F2";
    case "#6B7280": return "#F3F4F6";
    case "#EA580C": return "#FFF7ED";
    case "#16A34A": return "#F0FDF4";
    case "#7C3AED": return "#F5F3FF";
    case "#EC4899": return "#FDF2F8";
    case "#06B6D4": return "#ECFEFF";
    case "#F59E0B": return "#FFFBEB";
    default: return "#F3F8FF";
  }
}

function tileColor(route: string) {
  const r = route.toLowerCase();
  if (r.includes("payment") || r.includes("earning") || r.includes("tax") || r.includes("quote") || r.includes("outstanding") || r.includes("mtd") || r.includes("month-to-date")) return "#16A34A";
  if (r.includes("pupil") || r.includes("people") || r.includes("user") || r.includes("enquir") || r.includes("waitlist") || r.includes("referral")) return "#7C3AED";
  if (r.includes("message") || r.includes("broadcast") || r.includes("bulkmessage")) return "#EC4899";
  if (r.includes("live") || r.includes("satnav") || r.includes("map") || r.includes("location") || r.includes("gap") || r.includes("track")) return "#06B6D4";
  if (r.includes("mileage") || r.includes("fuel") || r.includes("vehicle") || r.includes("car") || r.includes("reminder") || r.includes("alert")) return "#DC2626";
  if (r.includes("report") || r.includes("performance") || r.includes("pipeline") || r.includes("analytic") || r.includes("document") || r.includes("manifest") || r.includes("checklist") || r.includes("note") || r.includes("todo") || r.includes("waiver") || r.includes("import") || r.includes("certification") || r.includes("standard") || r.includes("help") || r.includes("expenses")) return "#0B1F3A";
  if (r.includes("test") || r.includes("course") || r.includes("cpd") || r.includes("briefing") || r.includes("health") || r.includes("eod") || r.includes("end-of-day") || r.includes("resource")) return "#F59E0B";
  if (r.includes("reward") || r.includes("review") || r.includes("trophy")) return "#EC4899";
  if (r.includes("setting") || r.includes("profile") || r.includes("search") || r.includes("notification") || r.includes("subscription") || r.includes("plan")) return "#6B7280";
  return "#1877D6";
}

function AccessTile({
  icon,
  label,
  route,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  route: string;
  onClick: () => void;
}) {
  const color = tileColor(route);
  const coloredIcon = isValidElement(icon)
    ? cloneElement(icon as React.ReactElement<{ color?: string }>, { color })
    : icon;
  return (
    <button
      onClick={onClick}
      className="bg-white flex flex-col items-center justify-center"
      style={{
        width: "100%",
        height: 80,
        borderWidth: "0.5px",
        borderStyle: "solid",
        borderColor: "#EEF2F7",
        borderRadius: 12,
        gap: 6,
        padding: 12,
        scrollSnapAlign: "start",
        flexShrink: 0,
      }}
    >
      <span
        className="flex items-center justify-center"
        style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: iconTint(color) }}
      >
        {coloredIcon}
      </span>
      <span className="text-[10px] text-[#0B1F3A] text-center leading-tight" style={{ maxWidth: '100%', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{label}</span>
    </button>
  );
}

function EndOfDayBanner() {
  const navigate = useNavigate();
  const todayKey = new Date().toISOString().slice(0, 10);
  const storageKey = `eod-banner-dismissed-${todayKey}`;
  const [dismissed, setDismissed] = useState(false);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    try {
      if (localStorage.getItem(storageKey) === "1") setDismissed(true);
    } catch {}
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, [storageKey]);

  const hour = now.getHours();
  if (dismissed || hour < 17 || hour >= 23) return null;

  return (
    <div
      className="mx-4 mt-3 flex items-center gap-2"
      style={{
        backgroundColor: "#F0F4FF",
        border: "1px solid #BFDBFE",
        padding: "10px 16px",
        borderRadius: 10,
        fontFamily: "Inter, sans-serif",
      }}
    >
      <Moon size={16} color="#1877D6" />
      <div style={{ fontSize: 13, color: "#0B1F3A", fontWeight: 600 }}>
        Ready to wrap up?
      </div>
      <button
        type="button"
        onClick={() => navigate({ to: "/end-of-day" })}
        style={{
          marginLeft: "auto",
          fontSize: 12,
          fontWeight: 600,
          color: "#1877D6",
          background: "transparent",
          cursor: "pointer",
          fontFamily: "Inter, sans-serif",
        }}
      >
        View summary →
      </button>
      <button
        type="button"
        aria-label="Dismiss"
        onClick={() => {
          try { localStorage.setItem(storageKey, "1"); } catch {}
          setDismissed(true);
        }}
        style={{
          background: "transparent",
          cursor: "pointer",
          padding: 2,
          marginLeft: 4,
        }}
      >
        <X size={14} color="#6B7280" />
      </button>
    </div>
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
        fontFamily: 'Inter, sans-serif',
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


function OutstandingBreakdownModal({
  open,
  onClose,
  total,
  rows,
  instructorName,
  onView,
}: {
  open: boolean;
  onClose: () => void;
  total: number;
  rows: Array<{
    pupilId: string;
    name: string;
    firstName: string;
    phone: string | null;
    email: string | null;
    amount: number;
    type: "Lessons" | "NI Course";
  }>;
  instructorName: string;
  onView: (id: string) => void;
}) {
  const buildMessage = (firstName: string, amount: number) => {
    const amountPence = Math.round(amount * 100);
    return `Hi ${firstName}, just a reminder that £${amount.toFixed(2)} is outstanding for your driving lessons. You can pay here: https://drivingschoolmanager.co.uk/pay?amount=${amountPence}&desc=Lesson+payment. Thanks, ${instructorName}`;
  };

  const openSms = (phone: string | null, msg: string) => {
    const num = (phone || "").replace(/\s+/g, "");
    const href = `sms:${num}?body=${encodeURIComponent(msg)}`;
    window.location.href = href;
  };

  const openMail = (email: string | null, msg: string) => {
    const href = `mailto:${email || ""}?subject=${encodeURIComponent("Payment reminder")}&body=${encodeURIComponent(msg)}`;
    window.location.href = href;
  };

  const sendAll = async () => {
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      if (!r.phone) continue;
      openSms(r.phone, buildMessage(r.firstName, r.amount));
      await new Promise((res) => setTimeout(res, 1000));
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        style={{
          maxWidth: 480,
          padding: 0,
          fontFamily: "Inter, sans-serif",
          maxHeight: "85vh",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <DialogHeader style={{ padding: "16px 20px", borderBottom: "1px solid #e5e7eb" }}>
          <DialogTitle style={{ fontSize: 16, fontWeight: 700, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>Outstanding payments</span>
            <span style={{ color: "#c9302c" }}>£{total.toFixed(2)}</span>
          </DialogTitle>
        </DialogHeader>

        <div style={{ flex: 1, overflowY: "auto", padding: "8px 12px" }}>
          {rows.length === 0 && (
            <div style={{ padding: 24, textAlign: "center", color: "#6B7280", fontSize: 13 }}>
              No outstanding payments. 🎉
            </div>
          )}
          {rows.map((r) => {
            const msg = buildMessage(r.firstName, r.amount);
            return (
              <div
                key={`${r.pupilId}-${r.type}`}
                style={{
                  padding: 12,
                  borderBottom: "1px solid #f3f4f6",
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                  <div style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0 }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: "#111827", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {r.name}
                    </span>
                    <span
                      style={{
                        marginTop: 2,
                        alignSelf: "flex-start",
                        fontSize: 10,
                        fontWeight: 600,
                        padding: "2px 6px",
                        borderRadius: 4,
                        backgroundColor: r.type === "NI Course" ? "#EEF2F7" : "#DBEAFE",
                        color: r.type === "NI Course" ? "#0B1F3A" : "#1E40AF",
                      }}
                    >
                      {r.type}
                    </span>
                  </div>
                  <span style={{ fontSize: 14, fontWeight: 700, color: "#c9302c" }}>
                    £{r.amount.toFixed(2)}
                  </span>
                </div>

                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    onClick={() => openSms(r.phone, msg)}
                    disabled={!r.phone}
                    style={{
                      flex: 1,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 4,
                      padding: "6px 8px",
                      fontSize: 11,
                      fontWeight: 600,
                      backgroundColor: r.phone ? "#F3F8FF" : "#F3F4F6",
                      color: r.phone ? "#0B1F3A" : "#9CA3AF",
                      border: `1px solid ${r.phone ? "#A7F3D0" : "#E5E7EB"}`,
                      borderRadius: 6,
                      cursor: r.phone ? "pointer" : "not-allowed",
                    }}
                  >
                    <MessageSquare size={12} /> Text
                  </button>
                  <button
                    onClick={() => openMail(r.email, msg)}
                    disabled={!r.email}
                    style={{
                      flex: 1,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 4,
                      padding: "6px 8px",
                      fontSize: 11,
                      fontWeight: 600,
                      backgroundColor: r.email ? "#EFF6FF" : "#F3F4F6",
                      color: r.email ? "#1D4ED8" : "#9CA3AF",
                      border: `1px solid ${r.email ? "#BFDBFE" : "#E5E7EB"}`,
                      borderRadius: 6,
                      cursor: r.email ? "pointer" : "not-allowed",
                    }}
                  >
                    <Mail size={12} /> Email
                  </button>
                  <button
                    onClick={() => onView(r.pupilId)}
                    style={{
                      flex: 1,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 4,
                      padding: "6px 8px",
                      fontSize: 11,
                      fontWeight: 600,
                      backgroundColor: "#F1F5F9",
                      color: "#0B1F3A",
                      border: "1px solid #CBD5E1",
                      borderRadius: 6,
                      cursor: "pointer",
                    }}
                  >
                    <User size={12} /> View
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ padding: 12, borderTop: "1px solid #e5e7eb", display: "flex", gap: 8 }}>
          <button
            onClick={sendAll}
            disabled={rows.length === 0}
            style={{
              flex: 1,
              padding: "10px 12px",
              fontSize: 13,
              fontWeight: 700,
              backgroundColor: rows.length === 0 ? "#E5E7EB" : "#1877D6",
              color: rows.length === 0 ? "#9CA3AF" : "#FFFFFF",
              border: "none",
              borderRadius: 8,
              cursor: rows.length === 0 ? "not-allowed" : "pointer",
            }}
          >
            Send all reminders
          </button>
          <button
            onClick={onClose}
            style={{
              padding: "10px 16px",
              fontSize: 13,
              fontWeight: 600,
              backgroundColor: "#F3F4F6",
              color: "#374151",
              border: "1px solid #D1D5DB",
              borderRadius: 8,
              cursor: "pointer",
            }}
          >
            Close
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function EarningsBreakdownModal({
  open,
  onClose,
  total,
  rows,
  onRecord,
  onViewMTD,
  onEdit,
  onDelete,
}: {
  open: boolean;
  onClose: () => void;
  total: number;
  rows: Array<{ id: string; date: string; pupilName: string; amount: number; method: string; source: "lesson" | "booking" | "lesson-earned" }>;
  onRecord: () => void;
  onViewMTD: () => void;
  onEdit: (
    row: { id: string; date: string; pupilName: string; amount: number; method: string; source: "lesson" | "booking" | "lesson-earned" },
    updates: { amount: number; method: string; date: string },
  ) => Promise<void>;
  onDelete: (
    row: { id: string; date: string; pupilName: string; amount: number; method: string; source: "lesson" | "booking" | "lesson-earned" },
  ) => Promise<void>;
}) {
  const fmtDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
  };
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState("");
  const [editMethod, setEditMethod] = useState("cash");
  const [editDate, setEditDate] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const startEdit = (r: { id: string; amount: number; method: string; date: string }) => {
    setEditingId(r.id);
    setEditAmount(r.amount.toFixed(2));
    setEditMethod(r.method || "cash");
    const d = new Date(r.date);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    setEditDate(`${yyyy}-${mm}-${dd}`);
  };
  const cancelEdit = () => {
    setEditingId(null);
  };
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        style={{ maxWidth: 480, padding: 0, fontFamily: "Inter, sans-serif", maxHeight: "85vh", display: "flex", flexDirection: "column" }}
      >
        <DialogHeader style={{ padding: "16px 20px", borderBottom: "1px solid #e5e7eb" }}>
          <DialogTitle style={{ fontSize: 16, fontWeight: 700, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>Earnings this week</span>
            <span style={{ color: "#0B1F3A" }}>£{total.toFixed(2)}</span>
          </DialogTitle>
        </DialogHeader>

        <div style={{ flex: 1, overflowY: "auto", padding: "8px 12px" }}>
          {rows.length === 0 ? (
            <div style={{ padding: 24, textAlign: "center", color: "#6B7280", fontSize: 13 }}>
              No payments recorded this week
              <div style={{ marginTop: 8 }}>
                <button
                  onClick={onRecord}
                  style={{ background: "none", border: "none", color: "#1877D6", fontWeight: 600, fontSize: 13, textDecoration: "underline", cursor: "pointer" }}
                >
                  Record payment →
                </button>
              </div>
            </div>
          ) : (
            rows.map((r) => {
              const isEditing = editingId === r.id;
              const editable = r.source === "lesson";
              const isBusy = busyId === r.id;
              return (
                <div key={`${r.source}-${r.id}`} style={{ borderBottom: "1px solid #f3f4f6" }}>
                  <div style={{ padding: 12, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "#111827", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {r.pupilName}
                      </div>
                      <div style={{ fontSize: 11, color: "#6B7280", marginTop: 2 }}>{fmtDate(r.date)}</div>
                    </div>
                    <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 6px", borderRadius: 4, backgroundColor: "#EFF6FF", color: "#1E40AF", textTransform: "capitalize" }}>
                      {r.method}
                    </span>
                    <span style={{ fontSize: 14, fontWeight: 700, color: "#0B1F3A", minWidth: 60, textAlign: "right" }}>
                      £{r.amount.toFixed(2)}
                    </span>
                    {editable && !isEditing && (
                      <div style={{ display: "flex", gap: 4 }}>
                        <button
                          type="button"
                          onClick={() => startEdit(r)}
                          aria-label="Edit payment"
                          style={{ background: "none", border: "1px solid #E5E7EB", borderRadius: 6, padding: "4px 6px", cursor: "pointer", color: "#374151", fontSize: 11 }}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(r.id)}
                          aria-label="Delete payment"
                          style={{ background: "none", border: "1px solid #FCA5A5", borderRadius: 6, padding: "4px 6px", cursor: "pointer", color: "#B91C1C", fontSize: 11 }}
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                  {isEditing && (
                    <div style={{ padding: "0 12px 12px", display: "flex", flexDirection: "column", gap: 8 }}>
                      <div style={{ display: "flex", gap: 8 }}>
                        <label style={{ flex: 1, fontSize: 11, color: "#6B7280" }}>
                          Amount (£)
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={editAmount}
                            onChange={(e) => setEditAmount(e.target.value)}
                            style={{ width: "100%", marginTop: 2, padding: "6px 8px", border: "1px solid #E5E7EB", borderRadius: 6, fontSize: 13 }}
                          />
                        </label>
                        <label style={{ flex: 1, fontSize: 11, color: "#6B7280" }}>
                          Date
                          <input
                            type="date"
                            value={editDate}
                            onChange={(e) => setEditDate(e.target.value)}
                            style={{ width: "100%", marginTop: 2, padding: "6px 8px", border: "1px solid #E5E7EB", borderRadius: 6, fontSize: 13 }}
                          />
                        </label>
                      </div>
                      <label style={{ fontSize: 11, color: "#6B7280" }}>
                        Method
                        <select
                          value={editMethod}
                          onChange={(e) => setEditMethod(e.target.value)}
                          style={{ width: "100%", marginTop: 2, padding: "6px 8px", border: "1px solid #E5E7EB", borderRadius: 6, fontSize: 13, backgroundColor: "#fff" }}
                        >
                          <option value="cash">Cash</option>
                          <option value="bank_transfer">Bank transfer</option>
                          <option value="card">Card</option>
                        </select>
                      </label>
                      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                        <button
                          type="button"
                          onClick={cancelEdit}
                          disabled={isBusy}
                          style={{ padding: "6px 10px", fontSize: 12, background: "#F3F4F6", border: "1px solid #D1D5DB", borderRadius: 6, cursor: "pointer" }}
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={async () => {
                            const amt = Number(editAmount);
                            if (!amt || amt <= 0) {
                              toast.error("Enter a valid amount");
                              return;
                            }
                            setBusyId(r.id);
                            try {
                              await onEdit(r, { amount: amt, method: editMethod, date: editDate });
                              setEditingId(null);
                            } finally {
                              setBusyId(null);
                            }
                          }}
                          style={{ padding: "6px 10px", fontSize: 12, background: "#1877D6", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", opacity: isBusy ? 0.6 : 1 }}
                        >
                          {isBusy ? "Saving..." : "Save"}
                        </button>
                      </div>
                    </div>
                  )}
                  {confirmDeleteId === r.id && (
                    <div style={{ padding: "0 12px 12px", display: "flex", flexDirection: "column", gap: 6 }}>
                      <div style={{ fontSize: 12, color: "#374151" }}>
                        Delete this payment? It will be soft-deleted and removed from totals.
                      </div>
                      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(null)}
                          disabled={isBusy}
                          style={{ padding: "6px 10px", fontSize: 12, background: "#F3F4F6", border: "1px solid #D1D5DB", borderRadius: 6, cursor: "pointer" }}
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={async () => {
                            setBusyId(r.id);
                            try {
                              await onDelete(r);
                              setConfirmDeleteId(null);
                            } finally {
                              setBusyId(null);
                            }
                          }}
                          style={{ padding: "6px 10px", fontSize: 12, background: "#DC2626", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", opacity: isBusy ? 0.6 : 1 }}
                        >
                          {isBusy ? "Deleting..." : "Delete"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        <div style={{ padding: 12, borderTop: "1px solid #e5e7eb", display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13, fontWeight: 700, color: "#111827" }}>
            <span>Total</span>
            <span style={{ color: "#0B1F3A" }}>£{total.toFixed(2)}</span>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={onViewMTD}
              style={{ flex: 1, padding: "10px 12px", fontSize: 13, fontWeight: 700, backgroundColor: "#1877D6", color: "#FFFFFF", border: "none", borderRadius: 8, cursor: "pointer" }}
            >
              View MTD →
            </button>
            <button
              onClick={onClose}
              style={{ padding: "10px 16px", fontSize: 13, fontWeight: 600, backgroundColor: "#F3F4F6", color: "#374151", border: "1px solid #D1D5DB", borderRadius: 8, cursor: "pointer" }}
            >
              Close
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function LessonsBreakdownModal({
  open,
  onClose,
  rows,
  onOpenLesson,
  onDelete,
}: {
  open: boolean;
  onClose: () => void;
  rows: Array<{ id: string; lesson_date: string; lesson_time: string; duration_minutes: number | null; status: string; pupil_id: string; pupilName: string }>;
  onOpenLesson: (id: string) => void;
  onDelete: (id: string, reason: string, notes: string) => Promise<void>;
}) {
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [reason, setReason] = useState("Created in error");
  const [notes, setNotes] = useState("");
  const [deleting, setDeleting] = useState(false);

  const fmtDayTime = (date: string, time: string) => {
    const d = new Date(`${date}T${(time || "00:00:00").slice(0, 8)}`);
    const day = d.toLocaleDateString("en-GB", { weekday: "short" });
    return `${day} ${(time || "").slice(0, 5)}`;
  };
  const statusColors: Record<string, { bg: string; fg: string }> = {
    completed: { bg: "#F3F8FF", fg: "#0B1F3A" },
    confirmed: { bg: "#EFF6FF", fg: "#1E40AF" },
    cancelled: { bg: "#FEE2E2", fg: "#991B1B" },
  };
  const completed = rows.filter((r) => r.status === "completed").length;
  const upcoming = rows.filter((r) => r.status === "confirmed" || r.status === "scheduled").length;
  const cancelled = rows.filter((r) => r.status === "cancelled").length;
  const totalHours =
    rows.filter((r) => r.status !== "cancelled").reduce((s, r) => s + (r.duration_minutes ?? 60), 0) / 60;

  const closeConfirm = () => {
    setConfirmId(null);
    setReason("Created in error");
    setNotes("");
  };

  return (
    <>
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        style={{ maxWidth: 480, padding: 0, fontFamily: "Inter, sans-serif", maxHeight: "85vh", display: "flex", flexDirection: "column" }}
      >
        <DialogHeader style={{ padding: "16px 20px", borderBottom: "1px solid #e5e7eb" }}>
          <DialogTitle style={{ fontSize: 16, fontWeight: 700 }}>Lessons this week</DialogTitle>
        </DialogHeader>

        <div style={{ flex: 1, overflowY: "auto", padding: "8px 12px" }}>
          {rows.length === 0 && (
            <div style={{ padding: 24, textAlign: "center", color: "#6B7280", fontSize: 13 }}>
              No lessons this week.
            </div>
          )}
          {rows.map((r) => {
            const colors = statusColors[r.status] ?? { bg: "#F3F4F6", fg: "#374151" };
            return (
              <div
                key={r.id}
                style={{
                  width: "100%",
                  padding: 12,
                  borderBottom: "1px solid #f3f4f6",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <button
                  onClick={() => onOpenLesson(r.id)}
                  style={{
                    flex: 1,
                    minWidth: 0,
                    textAlign: "left",
                    background: "none",
                    border: "none",
                    padding: 0,
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    cursor: "pointer",
                  }}
                >
                  <div style={{ minWidth: 78, fontSize: 12, fontWeight: 700, color: "#0B1F3A" }}>
                    {fmtDayTime(r.lesson_date, r.lesson_time)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0, fontSize: 13, fontWeight: 600, color: "#111827", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {r.pupilName}
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 6px", borderRadius: 4, backgroundColor: "#F1F5F9", color: "#0B1F3A" }}>
                    {r.duration_minutes ?? 60}m
                  </span>
                  <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 6px", borderRadius: 4, backgroundColor: colors.bg, color: colors.fg, textTransform: "capitalize" }}>
                    {r.status}
                  </span>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setConfirmId(r.id);
                    setReason("Created in error");
                    setNotes("");
                  }}
                  aria-label="Delete lesson"
                  style={{
                    background: "none",
                    border: "none",
                    padding: 6,
                    cursor: "pointer",
                    color: "#DC2626",
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            );
          })}
        </div>

        <div style={{ padding: 12, borderTop: "1px solid #e5e7eb", display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ fontSize: 12, color: "#374151", fontWeight: 600 }}>
            Completed: {completed} · Upcoming: {upcoming} · Cancelled: {cancelled}
          </div>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#0B1F3A" }}>
            {totalHours.toFixed(1)}h taught this week
          </div>
          <button
            onClick={onClose}
            style={{ marginTop: 4, padding: "10px 16px", fontSize: 13, fontWeight: 600, backgroundColor: "#F3F4F6", color: "#374151", border: "1px solid #D1D5DB", borderRadius: 8, cursor: "pointer" }}
          >
            Close
          </button>
        </div>
      </DialogContent>
    </Dialog>

    <Dialog open={confirmId !== null} onOpenChange={(v) => !v && !deleting && closeConfirm()}>
      <DialogContent style={{ maxWidth: 400, padding: 0, fontFamily: "Inter, sans-serif" }}>
        <DialogHeader style={{ padding: "16px 20px", borderBottom: "1px solid #e5e7eb" }}>
          <DialogTitle style={{ fontSize: 16, fontWeight: 700 }}>Delete this lesson?</DialogTitle>
        </DialogHeader>
        <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: "#374151" }}>
            Reason
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              style={{ marginTop: 4, width: "100%", padding: "8px 10px", fontSize: 13, border: "1px solid #D1D5DB", borderRadius: 6, background: "#fff" }}
            >
              <option>Created in error</option>
              <option>Duplicate entry</option>
              <option>Wrong date/time</option>
              <option>Other</option>
            </select>
          </label>
          <label style={{ fontSize: 12, fontWeight: 600, color: "#374151" }}>
            Additional notes (optional)
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              style={{ marginTop: 4, width: "100%", padding: "8px 10px", fontSize: 13, border: "1px solid #D1D5DB", borderRadius: 6, resize: "vertical", fontFamily: "inherit" }}
            />
          </label>
        </div>
        <div style={{ padding: 12, borderTop: "1px solid #e5e7eb", display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button
            onClick={closeConfirm}
            disabled={deleting}
            style={{ padding: "8px 14px", fontSize: 13, fontWeight: 600, background: "transparent", color: "#374151", border: "none", borderRadius: 8, cursor: "pointer" }}
          >
            Cancel
          </button>
          <button
            onClick={async () => {
              if (!confirmId) return;
              setDeleting(true);
              try {
                await onDelete(confirmId, reason, notes);
                closeConfirm();
              } finally {
                setDeleting(false);
              }
            }}
            disabled={deleting}
            style={{ padding: "8px 14px", fontSize: 13, fontWeight: 700, backgroundColor: "#DC2626", color: "#fff", border: "none", borderRadius: 8, cursor: deleting ? "not-allowed" : "pointer", opacity: deleting ? 0.7 : 1 }}
          >
            {deleting ? "Deleting…" : "Delete lesson"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
}



function TestsBreakdownModal({
  open,
  onClose,
  tests,
  swapRequests,
  onOpenPupil,
}: {
  open: boolean;
  onClose: () => void;
  tests: Array<{ id: string; name: string; test_date: string; test_time: string | null; test_centre: string | null }>;
  swapRequests: Array<{ id: string; name: string; test_centre: string | null; current_test_date: string | null; current_test_time: string | null; status: string; created_at: string }>;
  onOpenPupil: (id: string) => void;
}) {
  const fmtDate = (d: string) => {
    const dt = new Date(`${d}T00:00:00`);
    return dt.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
  };
  const fmtShort = (d: string | null) => {
    if (!d) return "";
    const dt = new Date(`${d}T00:00:00`);
    return dt.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  };
  const daysUntil = (d: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dt = new Date(`${d}T00:00:00`);
    return Math.round((dt.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  };
  const daysSince = (iso: string) => {
    const today = new Date();
    const dt = new Date(iso);
    return Math.max(0, Math.round((today.getTime() - dt.getTime()) / (1000 * 60 * 60 * 24)));
  };
  const badgeColors = (days: number) => {
    if (days < 7) return { bg: "#FEE2E2", fg: "#991B1B" };
    if (days <= 14) return { bg: "#EEF2F7", fg: "#0B1F3A" };
    return { bg: "#F3F8FF", fg: "#0B1F3A" };
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        style={{ maxWidth: 480, padding: 0, fontFamily: "Inter, sans-serif", maxHeight: "85vh", display: "flex", flexDirection: "column" }}
      >
        <DialogHeader style={{ padding: "16px 20px", borderBottom: "1px solid #e5e7eb" }}>
          <DialogTitle style={{ fontSize: 16, fontWeight: 700 }}>Tests</DialogTitle>
        </DialogHeader>

        <div style={{ flex: 1, overflowY: "auto" }}>
          <div style={{ padding: "10px 16px", fontSize: 11, fontWeight: 700, color: "#6B7280", textTransform: "uppercase", letterSpacing: 0.5 }}>
            Upcoming tests
          </div>
          {tests.length === 0 && (
            <div style={{ padding: "12px 20px 18px", color: "#6B7280", fontSize: 13 }}>
              No upcoming tests scheduled.
            </div>
          )}
          {tests.map((t) => {
            const days = daysUntil(t.test_date);
            const colors = badgeColors(days);
            return (
              <div key={t.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                <button
                  onClick={() => onOpenPupil(t.id)}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    padding: "10px 16px",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#111827", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {t.name}
                    </div>
                    <div style={{ fontSize: 12, color: "#4B5563", marginTop: 2 }}>
                      {fmtDate(t.test_date)}
                      {t.test_time ? ` · ${String(t.test_time).slice(0, 5)}` : ""}
                      {t.test_centre ? ` · ${t.test_centre}` : ""}
                    </div>
                  </div>
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      padding: "3px 8px",
                      borderRadius: 999,
                      backgroundColor: colors.bg,
                      color: colors.fg,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {days <= 0 ? "Today" : `In ${days} day${days === 1 ? "" : "s"}`}
                  </span>
                </button>
              </div>
            );
          })}

          <div style={{ padding: "16px 16px 8px", display: "flex", alignItems: "center", gap: 6 }}>
            <ArrowLeftRight size={14} color="#1877D6" />
            <span style={{ fontSize: 11, fontWeight: 700, color: "#1877D6", textTransform: "uppercase", letterSpacing: 0.5 }}>
              EverySwap requests
            </span>
          </div>
          {swapRequests.length === 0 ? (
            <div style={{ padding: "8px 20px 18px", color: "#6B7280", fontSize: 12, textAlign: "center" }}>
              No active swap requests
            </div>
          ) : (
            <div style={{ padding: "0 16px 12px", display: "flex", flexDirection: "column", gap: 6 }}>
              {swapRequests.map((s) => {
                const matched = s.status === "matched";
                return (
                  <div
                    key={s.id}
                    style={{
                      background: "#fff",
                      border: "0.5px solid #EEF2F7",
                      borderRadius: 10,
                      padding: "10px 12px",
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "#111827", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {s.name}
                      </div>
                      <div style={{ fontSize: 12, color: "#6B7280", marginTop: 2 }}>
                        {s.current_test_date ? fmtShort(s.current_test_date) : "No date"}
                        {s.current_test_time ? ` · ${String(s.current_test_time).slice(0, 5)}` : ""}
                        {s.test_centre ? ` · ${s.test_centre}` : ""}
                      </div>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          padding: "3px 8px",
                          borderRadius: 999,
                          backgroundColor: matched ? "#F3F8FF" : "#EEF2F7",
                          color: matched ? "#0B1F3A" : "#0B1F3A",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {matched ? "Matched ✓" : "Seeking swap"}
                      </span>
                      <span style={{ fontSize: 11, color: "#9CA3AF" }}>
                        {(() => {
                          const d = daysSince(s.created_at);
                          return d === 0 ? "Today" : `${d} day${d === 1 ? "" : "s"} ago`;
                        })()}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>


        <div style={{ padding: 12, borderTop: "1px solid #e5e7eb" }}>
          <button
            onClick={onClose}
            style={{ width: "100%", padding: "10px 16px", fontSize: 13, fontWeight: 600, backgroundColor: "#F3F4F6", color: "#374151", border: "1px solid #D1D5DB", borderRadius: 8, cursor: "pointer" }}
          >
            Close
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}



const DISCOVER_SUPABASE_URL = "https://bjpqxfrihwjcqprmoqfs.supabase.co";
const DISCOVER_SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJqcHF4ZnJpaHdqY3Fwcm1vcWZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE0NzQ4MjEsImV4cCI6MjA5NzA1MDgyMX0.HKlgx3dxP3uxX9wMRRUnfb0IPwaBpFcut_iUgT5XFeo";

const DISCOVER_HEADERS = {
  apikey: DISCOVER_SUPABASE_ANON_KEY,
  Authorization: `Bearer ${DISCOVER_SUPABASE_ANON_KEY}`,
};

type DiscoverListing = {
  id: string;
  title: string;
  price_display: string | null;
  price_amount: number | null;
  image_urls: string[] | null;
  is_featured: boolean;
  marketplace_categories: { name: string; slug: string } | null;
};

function formatDiscoverDay(dateStr: string): string {
  try {
    const d = new Date(dateStr + "T00:00:00");
    return String(d.getDate());
  } catch {
    return "–";
  }
}

function formatDiscoverMonth(dateStr: string): string {
  try {
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString("en-GB", { month: "short" }).toUpperCase();
  } catch {
    return "";
  }
}

function formatDiscoverTime(timeStr: string): string {
  if (!timeStr) return "";
  const [h, m] = timeStr.split(":");
  const hh = String(Number(h) || 0).padStart(2, "0");
  const mm = (m ?? "00").padStart(2, "0");
  return `${hh}:${mm}`;
}


function DiscoverSection() {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<LiveSession[] | null>(null);


  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          `${DISCOVER_SUPABASE_URL}/rest/v1/dsm_live_sessions?deleted_at=is.null&order=session_date.asc&order=session_time.asc`,
          { headers: DISCOVER_HEADERS },
        );
        const data = (await res.json()) as LiveSession[];
        if (!cancelled) setSessions(Array.isArray(data) ? data : []);
      } catch {
        if (!cancelled) setSessions([]);
      }

    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const upcoming = useMemo(() => {
    if (!sessions) return [];
    const now = Date.now();
    return sessions
      .filter((s) => {
        const dt = new Date(
          `${s.session_date}T${s.session_time || "00:00"}:00`,
        ).getTime();
        return Number.isFinite(dt) ? dt >= now : true;
      })
      .slice(0, 2);
  }, [sessions]);

  const hasLive = upcoming.length > 0;
  if (!hasLive) return null;


  const headerTitle = {
    fontSize: 18,
    fontWeight: 700,
    color: "#0B1F3A",
    fontFamily: "Inter, sans-serif",
  } as const;

  const viewAllBtn = {
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
    fontSize: 13,
    fontWeight: 600,
    color: "#1877D6",
    background: "none",
    border: "none",
    padding: 0,
    cursor: "pointer",
    fontFamily: "Inter, sans-serif",
  } as const;

  const cardShell: React.CSSProperties = {
    background: "#FFFFFF",
    borderRadius: 14,
    boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
    overflow: "hidden",
    cursor: "pointer",
  };

  const gradientLive = "linear-gradient(135deg, #1877D6 0%, #0B1F3A 100%)";
  const gradientMarket = "linear-gradient(135deg, #6B4FD6 0%, #1877D6 100%)";

  const truncate: React.CSSProperties = {
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  };

  return (
    <div style={{ margin: "20px -16px 0", padding: "0 16px", fontFamily: "Inter, sans-serif" }}>

      {hasLive && (
        <div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 14,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: "#C23B3B",
                }}
              />
              <div style={headerTitle}>DSM Live</div>
            </div>
            <button
              type="button"
              style={viewAllBtn}
              onClick={() => navigate({ to: "/dsm-live" })}
            >
              View all
              <ArrowRight size={14} strokeWidth={2} />
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {upcoming.map((s) => {
              const isToday = (() => {
                try {
                  const d = new Date(`${s.session_date}T00:00:00`);
                  const t = new Date();
                  return d.getFullYear() === t.getFullYear() && d.getMonth() === t.getMonth() && d.getDate() === t.getDate();
                } catch { return false; }
              })();
              return (
                <div
                  key={s.id}
                  style={{ ...cardShell, display: 'flex', alignItems: 'stretch' }}
                  onClick={() =>
                    navigate({
                      to: "/dsm-live/$sessionId",
                      params: { sessionId: s.id },
                    })
                  }
                >
                  <div
                    style={{
                      width: 56,
                      height: 56,
                      background: s.image_url ? `url(${s.image_url}) center/cover` : gradientLive,
                      backgroundColor: "#EEF1F6",
                      position: 'relative',
                      flexShrink: 0,
                    }}
                  >
                    {isToday && (
                      <span style={{ position: 'absolute', top: 4, left: 4, background: '#CC2229', color: '#FFFFFF', fontSize: 7, fontWeight: 700, padding: '2px 5px', borderRadius: 4, letterSpacing: 0.4 }}>
                        LIVE
                      </span>
                    )}
                  </div>
                  <div style={{ flex: 1, padding: '8px 10px', minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <div style={{ fontSize: 8, color: '#8A93A3', textTransform: 'uppercase', letterSpacing: 0.3 }}>
                      {formatDiscoverDay(s.session_date)} {formatDiscoverMonth(s.session_date)} · {formatDiscoverTime(s.session_time)}
                    </div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#0B1F3A', lineHeight: 1.2, ...truncate, marginTop: 2 }}>{s.title}</div>
                    <div style={{ fontSize: 9, fontWeight: 600, color: '#3B6D11', marginTop: 3 }}>Free</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', padding: '0 10px', flexShrink: 0 }}>
                    <span style={{ background: '#1877D6', color: '#FFFFFF', fontSize: 11, fontWeight: 600, padding: '6px 10px', borderRadius: 7 }}>Join</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}



    </div>
  );
}





