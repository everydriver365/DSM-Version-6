import { createFileRoute, useNavigate } from "@tanstack/react-router";
import type React from "react";
import { Fragment, useEffect, useMemo, useRef, useState, isValidElement, cloneElement } from "react";
import { toast } from "sonner";
import InstructorTopBar from "@/components/dsm/InstructorTopBar";
import { BottomNav, type BottomNavItem } from "@/components/dsm/BottomNav";
import { HomeIcon, ScheduleIcon, PupilsIcon, MessagesIcon } from "@/components/icons/DrivingIcons";
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
  Tag,
  Zap,
  CalendarDays,
  Crown,
  X,
  UserCircle,
  PlayCircle,
  ChevronDown,
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
  Camera,
  Activity,
  CheckCircle2,
  Sparkles,
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
  IconDots,
  
  IconSteeringWheel,
  IconClipboardCheck,
  IconMicrophone,
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
  pupils?: { name: string; phone?: string | null; postcode?: string | null; address?: string | null; prepaid_hours?: number | null } | null;
}

interface PrevLessonRow {
  id: string;
  lesson_date: string;
  status: string;
  notes: string | null;
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
  elite: "#0F2044",
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
}: {
  todayLessons: LessonRow[];
  onNavigate: () => void;
}) {
  const total = todayLessons.length;
  const upcoming = todayLessons.filter((l) =>
    ["confirmed", "pending", "in_progress"].includes(l.status),
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
    <button
      type="button"
      onClick={onNavigate}
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
        fontFamily: "Poppins, Inter, sans-serif",
      }}
    >
      <span
        style={{
          width: 36,
          height: 36,
          borderRadius: 11,
          background: "#E6F1FB",
          color: "#185FA5",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <IconCalendar size={18} strokeWidth={1.5} />
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 500, color: "#0F2044", lineHeight: 1.3 }}>
          Today's lessons
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
            color: "#0F2044",
            lineHeight: 1,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {total}
        </div>
      </div>
    </button>
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



function MarketplaceSection({ navigate }: { navigate: ReturnType<typeof useNavigate> }) {
  type ListingTile = {
    id: string;
    title: string;
    price_display: string | null;
    image_urls: string[] | string | null;
    is_featured: boolean | null;
    marketplace_categories: { name: string } | null;
    marketplace_suppliers: { name: string; logo_url: string | null } | null;
  };

  type CategoryRow = { id: string; name: string };

  const [listings, setListings] = useState<ListingTile[]>([]);
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>("All");

  useEffect(() => {
    let cancelled = false;
    const SUPABASE_URL = "https://bjpqxfrihwjcqprmoqfs.supabase.co";
    const SUPABASE_ANON_KEY =
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJqcHF4ZnJpaHdqY3Fwcm1vcWZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE0NzQ4MjEsImV4cCI6MjA5NzA1MDgyMX0.HKlgx3dxP3uxX9wMRRUnfb0IPwaBpFcut_iUgT5XFeo";

    (async () => {
      try {
        const res = await fetch(
          `${SUPABASE_URL}/rest/v1/marketplace_listings?is_active=eq.true&deleted_at=is.null&select=id,title,price_display,image_urls,is_featured,marketplace_categories(name),marketplace_suppliers(name,logo_url)&order=is_featured.desc,created_at.desc&limit=6`,
          {
            headers: {
              apikey: SUPABASE_ANON_KEY,
              Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
            },
          },
        );
        const data = (await res.json()) as ListingTile[];
        if (!cancelled) setListings(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("[home] listings fetch failed", err);
        if (!cancelled) setListings([]);
      }
    })();

    (async () => {
      try {
        const res = await fetch(
          `${SUPABASE_URL}/rest/v1/marketplace_categories?select=id,name&order=name.asc`,
          {
            headers: {
              apikey: SUPABASE_ANON_KEY,
              Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
            },
          },
        );
        const data = (await res.json()) as CategoryRow[];
        if (!cancelled) setCategories(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("[home] categories fetch failed", err);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const firstImageUrl = (raw: ListingTile["image_urls"]): string | null => {
    const arr = Array.isArray(raw)
      ? raw
      : typeof raw === "string"
      ? (() => {
          try {
            return JSON.parse(raw) as string[];
          } catch {
            return [];
          }
        })()
      : [];
    return arr[0] ?? null;
  };

  const staticCategories = ["All", "ADI Training", "Vehicles", "Equipment", "Technology", "Insurance", "Business", "For Sale"];
  const categoryNames = categories.length > 0 ? ["All", ...categories.map((c) => c.name)] : staticCategories;

  const filteredListings = useMemo(() => {
    if (activeCategory === "All") return listings;
    return listings.filter((l) => l.marketplace_categories?.name === activeCategory);
  }, [listings, activeCategory]);

  const openListing = (listingId: string) => {
    navigate({ to: "/marketplace/$listingId" as never, params: { listingId } as never });
  };

  const sora = "'Sora', system-ui, -apple-system, sans-serif";
  const manrope = "'Manrope', system-ui, -apple-system, sans-serif";

  return (
    <div
      style={{
        padding: "24px 20px 96px",
        display: "flex",
        flexDirection: "column",
        gap: 24,
        background: "#F3F8FF",
        minHeight: "100%",
        fontFamily: manrope,
      }}
    >
      {/* Search */}
      <div style={{ position: "relative" }}>
        <Search
          size={16}
          color="rgba(15,32,68,0.4)"
          style={{ position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}
        />
        <button
          type="button"
          onClick={() => navigate({ to: "/marketplace" as never })}
          style={{
            width: "100%",
            background: "#FFFFFF",
            border: "1px solid #E2E6ED",
            borderRadius: 12,
            padding: "14px 16px 14px 44px",
            fontSize: 14,
            color: "rgba(15,32,68,0.4)",
            textAlign: "left",
            cursor: "pointer",
            boxShadow: "0 1px 2px rgba(15,32,68,0.04)",
            fontFamily: manrope,
          }}
        >
          Search products...
        </button>
      </div>

      {/* Categories */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <h2
          style={{
            fontSize: 11,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.15em",
            color: "rgba(15,32,68,0.6)",
            fontFamily: sora,
            margin: 0,
          }}
        >
          Categories
        </h2>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, paddingBottom: 4 }}>
          {categoryNames.map((cat) => {
            const active = activeCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setActiveCategory(cat)}
                style={{
                  background: active ? "#1877D6" : "#FFFFFF",
                  color: active ? "#FFFFFF" : "#0F2044",
                  border: active ? "1px solid #1877D6" : "1px solid #E2E6ED",
                  borderRadius: 999,
                  padding: "10px 20px",
                  fontSize: 12,
                  fontWeight: active ? 600 : 500,
                  fontFamily: manrope,
                  cursor: "pointer",
                  boxShadow: active ? "0 4px 12px rgba(24,119,214,0.2)" : "none",
                }}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </div>

      {/* Grid header */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: "#0F2044", fontFamily: sora, margin: 0 }}>
            Top Marketplace
          </h2>
          <button
            type="button"
            onClick={() => navigate({ to: "/marketplace" as never })}
            style={{
              background: "none",
              border: "none",
              color: "#1877D6",
              fontSize: 12,
              fontWeight: 700,
              fontFamily: manrope,
              cursor: "pointer",
              padding: 0,
            }}
          >
            View All
          </button>
        </div>

        {/* Listings 2-col grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          {filteredListings.map((tile) => {
            const img = firstImageUrl(tile.image_urls);
            const category = tile.marketplace_categories?.name ?? "";
            const badgeText = (category || "LISTING").toUpperCase();
            const badgeIsBlue = tile.is_featured;
            return (
              <button
                key={tile.id}
                type="button"
                onClick={() => openListing(tile.id)}
                style={{
                  background: "#FFFFFF",
                  border: "1px solid #E2E6ED",
                  borderRadius: 16,
                  overflow: "hidden",
                  display: "flex",
                  flexDirection: "column",
                  boxShadow: "0 1px 3px rgba(15,32,68,0.05)",
                  cursor: "pointer",
                  padding: 0,
                  textAlign: "left",
                }}
              >
                <div style={{ height: 128, background: "#F1F5F9", position: "relative" }}>
                  {img ? (
                    <img src={img} alt={tile.title} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                  ) : (
                    <div
                      style={{
                        width: "100%",
                        height: "100%",
                        background: "linear-gradient(135deg,#E0F0FF,#F3F8FF)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Tag size={24} color="#1877D6" />
                    </div>
                  )}
                  <span
                    style={{
                      position: "absolute",
                      top: 8,
                      left: 8,
                      background: badgeIsBlue ? "#1877D6" : "rgba(255,255,255,0.92)",
                      color: badgeIsBlue ? "#FFFFFF" : "#0F2044",
                      padding: "4px 8px",
                      borderRadius: 6,
                      fontSize: 9,
                      fontWeight: 700,
                      fontFamily: manrope,
                      letterSpacing: "0.02em",
                      boxShadow: "0 1px 2px rgba(15,32,68,0.08)",
                      backdropFilter: badgeIsBlue ? undefined : "blur(4px)",
                    }}
                  >
                    {tile.is_featured ? "FEATURED" : badgeText}
                  </span>
                </div>
                <div style={{ padding: 12, display: "flex", flexDirection: "column", flex: 1 }}>
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 600,
                      color: "#0F2044",
                      fontFamily: manrope,
                      lineHeight: 1.3,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {tile.title}
                  </div>
                  {tile.marketplace_suppliers?.name && (
                    <div
                      style={{
                        marginTop: 4,
                        fontSize: 10,
                        color: "rgba(15,32,68,0.6)",
                        fontWeight: 500,
                        textTransform: "uppercase",
                        letterSpacing: "-0.01em",
                        fontFamily: manrope,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {tile.marketplace_suppliers.name}
                    </div>
                  )}
                  <div style={{ marginTop: "auto", paddingTop: 8 }}>
                    <span style={{ color: "#CC2229", fontWeight: 700, fontSize: 14, fontFamily: sora }}>
                      {tile.price_display || "Enquire"}
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Footer CTAs */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16, paddingTop: 8 }}>
        <button
          type="button"
          onClick={() => navigate({ to: "/marketplace/list" as never })}
          style={{
            width: "100%",
            background: "#1877D6",
            color: "#FFFFFF",
            fontWeight: 700,
            padding: "16px 0",
            borderRadius: 12,
            border: "none",
            fontFamily: sora,
            fontSize: 15,
            cursor: "pointer",
            boxShadow: "0 8px 20px rgba(24,119,214,0.25)",
          }}
        >
          List Your Product
        </button>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
          <p
            style={{
              fontSize: 10,
              fontWeight: 700,
              color: "rgba(15,32,68,0.4)",
              fontFamily: manrope,
              textTransform: "uppercase",
              letterSpacing: "0.15em",
              margin: 0,
            }}
          >
            Verified marketplace
          </p>
          <div style={{ height: 2, width: 32, background: "#E2E6ED", borderRadius: 999 }} />
        </div>
      </div>
    </div>
  );
}


function _RemovedMarketplaceLegacy() {
  return null;
}





function DsmLiveSection({ navigate }: { navigate: ReturnType<typeof useNavigate> }) {
  type LiveTile = {
    id: string;
    title: string;
    host_name: string | null;
    category: string | null;
    session_date: string;
    session_time: string;
    price_display: string | null;
    price_amount: number | null;
    image_url: string | null;
    is_live: boolean | null;
    max_spaces: number | null;
    spaces_taken: number | null;
    duration_minutes: number | null;
  };
  type PodcastTile = {
    id: string;
    episode_number: number | null;
    title: string;
    guest_name: string | null;
    guest_title: string | null;
    duration_minutes: number | null;
    image_url: string | null;
    spotify_url: string | null;
    apple_url: string | null;
    audio_url: string | null;
    published_at: string | null;
  };

  const [sessions, setSessions] = useState<LiveTile[]>([]);
  const [podcasts, setPodcasts] = useState<PodcastTile[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const SUPABASE_URL = "https://bjpqxfrihwjcqprmoqfs.supabase.co";
      const SUPABASE_ANON_KEY =
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJqcHF4ZnJpaHdqY3Fwcm1vcWZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE0NzQ4MjEsImV4cCI6MjA5NzA1MDgyMX0.HKlgx3dxP3uxX9wMRRUnfb0IPwaBpFcut_iUgT5XFeo";
      try {
        const res = await fetch(
          `${SUPABASE_URL}/rest/v1/dsm_live_sessions?deleted_at=is.null&status=eq.upcoming&order=session_date.asc&limit=12&select=id,title,host_name,category,session_date,session_time,price_display,price_amount,image_url,is_live,max_spaces,spaces_taken,duration_minutes`,
          { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` } },
        );
        const data = (await res.json()) as LiveTile[];
        if (!cancelled && Array.isArray(data)) setSessions(data);
      } catch { /* ignore */ }
      try {
        const res = await fetch(
          `${SUPABASE_URL}/rest/v1/dsm_podcasts?is_published=eq.true&deleted_at=is.null&order=episode_number.desc&limit=2&select=id,episode_number,title,guest_name,guest_title,duration_minutes,image_url,spotify_url,apple_url,audio_url,published_at`,
          { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` } },
        );
        const data = (await res.json()) as PodcastTile[];
        if (!cancelled && Array.isArray(data)) setPodcasts(data);
      } catch { /* ignore */ }
    })();
    return () => { cancelled = true; };
  }, []);

  const POPPINS = "'Poppins', system-ui, -apple-system, sans-serif";

  // "Tue 21 Jul · 10:10am" (sentence case)
  const fmtDateTime = (d: string, t: string) => {
    try {
      const date = new Date(`${d}T${(t || "00:00:00").slice(0, 8)}`);
      const dateStr = date.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
      let timeStr = date.toLocaleTimeString("en-GB", { hour: "numeric", minute: "2-digit", hour12: true });
      timeStr = timeStr.replace(/\s?(AM|PM|am|pm)$/i, (m) => m.trim().toLowerCase());
      return `${dateStr} · ${timeStr}`;
    } catch {
      return `${d} · ${t}`;
    }
  };

  // Session-type → chip / decorative icon mapping.
  // Reuses categoryColor semantics from the previous implementation.
  const sessionType = (category: string | null): "standards" | "meet" | "other" => {
    const c = (category ?? "").toLowerCase();
    if (c.includes("standards")) return "standards";
    if (c.includes("meet") || c.includes("dsm")) return "meet";
    return "other";
  };
  const open = (id: string) =>
    navigate({ to: "/dsm-live/$sessionId" as never, params: { sessionId: id } as never });

  // Sort chronologically ascending (fetch is already ordered, but sort defensively).
  const sortedSessions = [...sessions].sort((a, b) => {
    const ka = `${a.session_date}T${(a.session_time || "00:00:00").slice(0, 8)}`;
    const kb = `${b.session_date}T${(b.session_time || "00:00:00").slice(0, 8)}`;
    return ka.localeCompare(kb);
  }).slice(0, 12);

  const latestPodcast = podcasts[0] ?? null;

  // Empty state: no upcoming sessions AND no podcast → render nothing.
  if (sortedSessions.length === 0 && !latestPodcast) return null;

  // If any session has is_live true, use those; otherwise mark the 2 soonest.
  const anyLive = sortedSessions.some((s) => s.is_live);
  const liveIds = new Set<string>(
    anyLive
      ? sortedSessions.filter((s) => s.is_live).map((s) => s.id)
      : sortedSessions.slice(0, 2).map((s) => s.id),
  );

  const Thumbnail = ({ category }: { category: string | null }) => {
    const t = sessionType(category);
    if (t === "meet") {
      return (
        <div
          style={{
            height: 90, background: "#185FA5",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "#FFFFFF", fontSize: 28, fontWeight: 500, letterSpacing: "-0.02em",
            fontFamily: POPPINS,
          }}
        >
          DSM
        </div>
      );
    }
    const Icon = t === "standards" ? IconClipboardCheck : IconSteeringWheel;
    const bg = t === "standards" ? "#0F2044" : "#0F2044";
    return (
      <div
        style={{
          height: 90, background: bg,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}
      >
        <Icon size={36} stroke={1.5} color="#3D7BE0" />
      </div>
    );
  };

  return (
    <div style={{ marginTop: 8, fontFamily: POPPINS }}>
      {/* Section header */}
      <div
        style={{
          margin: "0 20px 12px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
          <span
            aria-hidden
            style={{ width: 8, height: 8, borderRadius: "50%", background: "#E24B4A", flexShrink: 0 }}
          />
          <h2 style={{ margin: 0, fontFamily: POPPINS, fontSize: 18, fontWeight: 500, color: "#0F2044" }}>
            DSM Live
          </h2>
        </div>
        <button
          type="button"
          onClick={() => navigate({ to: "/dsm-live" as never })}
          style={{
            background: "none", border: "none", padding: 0, cursor: "pointer",
            color: "#185FA5", fontSize: 13, fontWeight: 500, fontFamily: POPPINS,
          }}
        >
          View all →
        </button>
      </div>

      {sortedSessions.length > 0 ? (
        <div
          style={{
            margin: "0 20px 10px",
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 10,
          }}
        >
          {sortedSessions.map((s) => {
            const isLive = liveIds.has(s.id);
            return (
              <div
                key={s.id}
                role="button"
                tabIndex={0}
                onClick={() => open(s.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(s.id); }
                }}
                style={{
                  background: "#FFFFFF",
                  border: "1px solid rgba(15,32,68,0.10)",
                  borderRadius: 18,
                  overflow: "hidden",
                  cursor: "pointer",
                  userSelect: "none",
                  fontFamily: POPPINS,
                  position: "relative",
                }}
              >
                <Thumbnail category={s.category} />
                {isLive && (
                  <div
                    style={{
                      position: "absolute", top: 8, left: 8,
                      display: "inline-flex", alignItems: "center", gap: 3,
                      background: "#E24B4A", borderRadius: 20,
                      padding: "2px 7px",
                    }}
                  >
                    <span
                      aria-hidden
                      style={{ width: 4, height: 4, borderRadius: "50%", background: "#FFFFFF" }}
                    />
                    <span style={{ fontSize: 8, fontWeight: 500, color: "#FFFFFF" }}>Live</span>
                  </div>
                )}
                <div style={{ padding: "8px 10px 10px" }}>
                  <div
                    style={{
                      fontSize: 12, fontWeight: 500, color: "#0F2044",
                      marginBottom: 2,
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}
                  >
                    {s.title}
                  </div>
                  <div style={{ fontSize: 10, color: "#64748B" }}>
                    {fmtDateTime(s.session_date, s.session_time)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : null}


      {latestPodcast && (
        <div
          role="button"
          tabIndex={0}
          onClick={() =>
            navigate({ to: "/dsm-live/podcast/$podcastId" as never, params: { podcastId: latestPodcast.id } as never })
          }
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              navigate({ to: "/dsm-live/podcast/$podcastId" as never, params: { podcastId: latestPodcast.id } as never });
            }
          }}
          style={{
            margin: "0 20px 4px",
            background: "#F0EBFF",
            borderRadius: 16,
            padding: "14px 18px",
            display: "flex",
            alignItems: "center",
            gap: 12,
            cursor: "pointer",
            userSelect: "none",
            fontFamily: POPPINS,
          }}
        >
          <div
            aria-hidden
            style={{
              width: 38, height: 38, borderRadius: 12, background: "#6B4FD6",
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <IconMicrophone size={20} stroke={1.75} color="#FFFFFF" />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 500, color: "#3C2580" }}>Podcast</div>
            <div style={{ fontSize: 11, color: "#6B4FD6", marginTop: 1 }}>
              Latest episodes for instructors
            </div>
          </div>
          <IconChevronRight size={17} stroke={1.75} color="#6B4FD6" style={{ flexShrink: 0 }} />
        </div>
      )}
    </div>
  );
}




function HomePage() {
  const navigate = useNavigate();

  // ===== Mobile workspaces carousel state =====
  const carouselRef = useRef<HTMLDivElement | null>(null);
  const [activeWs, setActiveWsState] = useState(0);
  const wsIsProgrammatic = useRef(false);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const WS_COUNT = 8;
  const [communityEmail, setCommunityEmail] = useState('');
  const scrollToWs = (i: number) => {
    const clamped = Math.max(0, Math.min(WS_COUNT - 1, i));
    setActiveWsState(clamped);
    const el = carouselRef.current;
    if (!el) return;
    wsIsProgrammatic.current = true;
    el.scrollTo({ left: clamped * el.clientWidth, behavior: 'smooth' });
    window.setTimeout(() => { wsIsProgrammatic.current = false; }, 400);
  };
  const setActiveWs = (i: number) => scrollToWs(i);
  const handleCarouselScroll = () => {
    if (wsIsProgrammatic.current) return;
    const el = carouselRef.current;
    if (!el) return;
    const i = Math.round(el.scrollLeft / Math.max(1, el.clientWidth));
    if (i !== activeWs) setActiveWsState(Math.max(0, Math.min(WS_COUNT - 1, i)));
  };
  const handleCarouselTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };
  const handleCarouselTouchEnd = (e: React.TouchEvent) => {
    const dx = touchStartX.current - e.changedTouches[0].clientX;
    const dy = Math.abs(touchStartY.current - e.changedTouches[0].clientY);
    if (Math.abs(dx) > 50 && Math.abs(dx) > dy) {
      if (dx > 0 && activeWs < WS_COUNT - 1) scrollToWs(activeWs + 1);
      else if (dx < 0 && activeWs > 0) scrollToWs(activeWs - 1);
    }
  };
  useEffect(() => {
    const log = () => {
      // eslint-disable-next-line no-console
      console.log("[home] carousel height:", carouselRef.current?.clientHeight, "window innerHeight:", window.innerHeight);
    };
    log();
    window.addEventListener('resize', log);
    return () => window.removeEventListener('resize', log);
  }, []);

  const [pupilQuery, setPupilQuery] = useState("");
  const [firstName, setFirstName] = useState("there");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [lessons, setLessons] = useState<LessonRow[]>([]);
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
  const [instructorBufferBefore, setInstructorBufferBefore] = useState<number>(0);
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
  const [swapRequests, setSwapRequests] = useState<Array<{ id: string; name: string; test_centre: string | null; current_test_date: string | null; current_test_time: string | null; status: string; created_at: string }>>([]);
  const [eolLesson, setEolLesson] = useState<LessonRow | null>(null);

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
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    (async () => {
      const SUPABASE_URL = "https://bjpqxfrihwjcqprmoqfs.supabase.co";
      const SUPABASE_ANON_KEY =
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJqcHF4ZnJpaHdqY3Fwcm1vcWZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE0NzQ4MjEsImV4cCI6MjA5NzA1MDgyMX0.HKlgx3dxP3uxX9wMRRUnfb0IPwaBpFcut_iUgT5XFeo";
      try {
        const res = await fetch(
          `${SUPABASE_URL}/rest/v1/chat_messages?instructor_id=eq.${userId}&sender_type=eq.pupil&read_at=is.null&deleted_at=is.null&order=created_at.desc&limit=10&select=id,pupil_id,body,created_at,read_at,pupils(name,first_name,profile_image_url)`,
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

      // Upcoming tests list for the bottom sheet and the alert strip
      const todayStr = new Date().toISOString().split("T")[0];
      const { data: testRows } = await supabase
        .from("pupils")
        .select("id, name, first_name, test_date, test_time, test_centre")
        .eq("instructor_id", user.id)
        .not("test_date", "is", null)
        .gte("test_date", todayStr)
        .order("test_date", { ascending: true })
        .limit(10);
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
              borderRadius: 12,
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
      booking: { bg: "#1A52A0", Icon: BookOpen, route: "/bookings" },
      course_booking: { bg: "#1A52A0", Icon: BookOpen, route: "/bookings" },
      payment: { bg: "#16A34A", Icon: PoundSterling, route: "/payments" },
      message: { bg: "#00B5A5", Icon: MessageSquare, route: "/messages" },
      rewards: { bg: "#D97706", Icon: Trophy, route: "/rewards" },
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
          background: "#0F2044",
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
    (async () => {
      const { data, error: authError } = await supabase.auth.getUser();
      if (authError) console.error("[home] auth.getUser error", authError);
      const u = data.user;
      if (!u) {
        console.warn("[home] no authenticated user");
        setAuthChecked(true);
        return;
      }
      setUserId(u.id);

      const { data: instructor, error: instErr } = await supabase
        .from("instructors")
        .select("name, profile_image_url, weekly_lesson_goal, weekly_earnings_goal, lesson_buffer_before, lesson_buffer_after")
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
      const ibb = Number((instructor as any)?.lesson_buffer_before);
      const iba = Number((instructor as any)?.lesson_buffer_after);
      if (Number.isFinite(ibb)) setInstructorBufferBefore(ibb);
      if (Number.isFinite(iba)) setInstructorBufferAfter(iba);
      setAuthChecked(true);
    })();
  }, []);

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
          "id, lesson_date, lesson_time, duration_minutes, status, pupil_id, notes, payment_status, eol_completed, amount_due, pickup_location, pupils(name, first_name, phone, postcode, address, prepaid_hours, deleted_at, custom_rate, custom_rate_90, custom_rate_120)"
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
          "id, lesson_date, lesson_time, duration_minutes, status, pupil_id, notes, payment_status, eol_completed, amount_due, pickup_location, pupils!inner(name, first_name, phone, postcode, address, prepaid_hours, deleted_at)"
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
          "id, name, first_name, last_name, phone, email, prepaid_hours, ni_amount_total, ni_amount_paid, status, deleted_at, buffer_before_minutes, buffer_after_minutes, profile_image_url, calendar_colour, last_lesson_date"
        )
        .eq("instructor_id", userId);
      setActivePupilsCount(
        (pupilsData || []).filter((p: any) => p.status === "active").length,
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
            status: (p.status ?? 'active').toLowerCase(),
            profile_image_url: p.profile_image_url ?? null,
            calendar_colour: p.calendar_colour ?? null,
            last_lesson_date: p.last_lesson_date ?? null,
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
        if (p.deleted_at == null && p.status === "active") {
          infoMap[p.id] = {
            first_name: p.first_name ?? null,
            name: p.name ?? null,
            profile_image_url: p.profile_image_url ?? null,
            calendar_colour: p.calendar_colour ?? null,
            last_lesson_date: p.last_lesson_date ?? null,
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
      // WEEK EARNINGS + WEEK COUNT + WEEK MODAL ROWS — all derived
      // from the single `allLessons` array above. No separate fetches.
      // ============================================================
      const nowMs = Date.now();
      const weekLessonRowsForEarnings = allLessons.filter(
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

      // Combine all sources
      let wk = 0;
      let td = 0;
      const earningsList: Array<{ id: string; date: string; pupilName: string; amount: number; method: string; source: "lesson" | "booking" | "lesson-earned" }> = [];
      const todayYmdStr = ymd(todayStart);
      (weekLessonRowsForEarnings ?? []).forEach((l: any) => {
        const dur = Number(l.duration_minutes) || 60;
        // Only recognise revenue once lesson has actually taken place
        const endMs = new Date(`${l.lesson_date}T${(l.lesson_time || "00:00:00").slice(0, 8)}`).getTime() + dur * 60_000;
        const delivered = l.status === "completed" || endMs <= nowMs;
        if (!delivered) return;
        // Prefer per-duration custom rate, then general custom rate, then amount_due
        const p = l.pupils ?? {};
        let amt = 0;
        if (dur === 90 && Number(p.custom_rate_90) > 0) amt = Number(p.custom_rate_90);
        else if (dur === 120 && Number(p.custom_rate_120) > 0) amt = Number(p.custom_rate_120);
        else if (Number(p.custom_rate) > 0) amt = Math.round(Number(p.custom_rate) * (dur / 60) * 100) / 100;
        else amt = Number(l.amount_due ?? 0);
        if (amt <= 0) return;
        wk += amt;
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
        wk += amt;
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

      // Earnings reflect actual paid records only — no estimates from
      // scheduled/completed lessons, which would inflate the total.
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

      const { data: wh } = await supabase
        .from("working_hours")
        .select("mon, tue, wed, thu, fri, sat, sun, start_time, end_time")
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
  }, [userId, todayStart, weekStart, weekEnd, reloadKey]);

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

  const todayISO = ymd(todayStart);

  // Today timeline shows every lesson for today regardless of status
  // (completed, confirmed, in_progress, cancelled, no_show, pending).
  const todayLessons = allLessons?.filter((l: any) => l.lesson_date === todayISO) || [];

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

  console.log("[home] SINGLE FETCH lessons (active):", lessons?.length);
  console.log("[home] todayLessons derived:", todayLessons?.length);
  console.log("[home] tomorrowLessons derived:", tomorrowLessons?.length);
  console.log("[home] weekEarnings derived:", weekEarnings);
  console.log("[home] outstanding derived:", outstanding);
  console.log("[home] todayISO:", todayISO);

  const tabLessons =
    tab === "today" ? todayLessons : tab === "tomorrow" ? tomorrowLessons : nextTabLessons;

  const nextFreeSlot = (() => {
    const isBeforeEnd = (d: Date, endTimeStr: string | null) => {
      if (!endTimeStr) return true;
      return d.getHours() * 60 + d.getMinutes() < timeToMins(endTimeStr);
    };
    const resolveAfter = (pupilId: string | null | undefined) => {
      if (pupilId && pupilBufferMap[pupilId]?.after != null) {
        return pupilBufferMap[pupilId].after as number;
      }
      return instructorBufferAfter;
    };
    // Earliest slot we're willing to surface today: 30 mins from now, rounded up to the next 15.
    const nowMinPlusLead = (() => {
      const n = new Date();
      const raw = n.getHours() * 60 + n.getMinutes() + 30;
      return Math.ceil(raw / 15) * 15;
    })();
    const clampToday = (d: Date) => {
      const mins = d.getHours() * 60 + d.getMinutes();
      if (mins >= nowMinPlusLead) return d;
      const clamped = new Date(d);
      clamped.setHours(Math.floor(nowMinPlusLead / 60), nowMinPlusLead % 60, 0, 0);
      return clamped;
    };
    const dayKeys = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;
    const workStartMins = timeToMins(
      workingHours?.start_time ? String(workingHours.start_time) : "09:00"
    );
    const tomorrowWorks = workingHours
      ? (workingHours as Record<string, unknown>)[dayKeys[tomorrowStart.getDay()]]
      : false;
    const tomorrowEndTime = tomorrowWorks && workingHours?.end_time
      ? String(workingHours.end_time)
      : null;

    // Today: free slot after last lesson
    if (todayLessons.length > 0) {
      const last = todayLessons[todayLessons.length - 1];
      const afterBuf = resolveAfter(last.pupil_id);
      const end = clampToday(new Date(lessonDateTime(last).getTime() + ((last.duration_minutes ?? 60) + afterBuf) * 60000));
      if (end < tomorrowStart && isBeforeEnd(end, todayEndTime)) {
        // Only surface today if at least an hour still fits before the working day ends.
        const endMins = end.getHours() * 60 + end.getMinutes();
        if (timeToMins(todayEndTime ?? "23:59") - endMins >= 60) {
          return minsToTime(endMins);
        }
      }
    } else if (todayEndTime) {
      // No lessons today but working — surface the earliest still-future slot time.
      const startMins = Math.max(workStartMins, nowMinPlusLead);
      if (timeToMins(todayEndTime) - startMins >= 60) {
        return minsToTime(startMins);
      }
    }

    // No free slot today — check tomorrow
    if (tomorrowLessons.length > 0) {
      const last = tomorrowLessons[tomorrowLessons.length - 1];
      const afterBuf = resolveAfter(last.pupil_id);
      const end = new Date(lessonDateTime(last).getTime() + ((last.duration_minutes ?? 60) + afterBuf) * 60000);
      if (end < dayAfter && isBeforeEnd(end, tomorrowEndTime)) {
        return minsToTime(end.getHours() * 60 + end.getMinutes());
      }
    } else if (tomorrowEndTime) {
      return minsToTime(workStartMins);
    }

    return null;
  })();

  const freeSlotCount = (() => {
    const sorted = [...todayLessons].sort((a, b) => (a.lesson_time ?? '').localeCompare(b.lesson_time ?? ''));
    const startMins = timeToMins(workingHours?.start_time ? String(workingHours.start_time) : "09:00");
    const endMins = timeToMins(todayEndTime ?? "18:00");
    const resolveAfter = (pid: string | null | undefined) => (pid && pupilBufferMap[pid]?.after != null ? pupilBufferMap[pid].after as number : instructorBufferAfter);
    const resolveBefore = (pid: string | null | undefined) => (pid && pupilBufferMap[pid]?.before != null ? pupilBufferMap[pid].before as number : 0);
    if (sorted.length === 0) return Math.max(0, Math.floor((endMins - startMins) / 60));
    let count = 0;
    const first = sorted[0];
    const firstStart = lessonDateTime(first);
    const firstStartMins = firstStart.getHours() * 60 + firstStart.getMinutes();
    if (firstStartMins - resolveBefore(first.pupil_id) - startMins >= 60) count++;
    for (let i = 0; i < sorted.length - 1; i++) {
      const l = sorted[i];
      const next = sorted[i + 1];
      const endThis = new Date(lessonDateTime(l).getTime() + (l.duration_minutes ?? 60) * 60000);
      const gapStartMins = endThis.getHours() * 60 + endThis.getMinutes() + resolveAfter(l.pupil_id);
      const nextStart = lessonDateTime(next);
      const gapEndMins = nextStart.getHours() * 60 + nextStart.getMinutes() - resolveBefore(next.pupil_id);
      if (gapEndMins - gapStartMins >= 60) count++;
    }
    const last = sorted[sorted.length - 1];
    const endLast = new Date(lessonDateTime(last).getTime() + (last.duration_minutes ?? 60) * 60000);
    const lastEndMins = endLast.getHours() * 60 + endLast.getMinutes() + resolveAfter(last.pupil_id);
    if (endMins - lastEndMins >= 60) count++;
    return count;
  })();

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
    const { error } = await supabase
      .from("lessons")
      .update({ payment_status: "paid" })
      .eq("id", l.id);
    if (error) {
      console.error("[mark paid] error", error);
      toast.error("Could not mark lesson as paid");
      return;
    }
    const { error: histErr } = await supabase.from("lesson_history").insert({
      instructor_id: userId,
      pupil_id: l.pupil_id,
      lesson_id: l.id,
      lesson_cost: l.amount_due ?? 0,
      payment_status: "paid",
      payment_method: "manual",
    });
    if (histErr) {
      console.error("[lesson_history] insert error", histErr);
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
    const accent = status === "cancelled" ? "#9CA3AF" : "#1A52A0";

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
    else if (state === "next") cardStyle = { ...cardBase, borderLeft: "3px solid #0B1F3A", boxShadow: "0 2px 8px rgba(0,0,0,0.08)" };

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
              fontFamily: "Inter, sans-serif",
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
    { icon: <CalendarIcon size={20} color="#FFFFFF" />, bg: "#1877D6", label: "Schedule", route: "/schedule" },
    { icon: <BarChart3 size={20} color="#FFFFFF" />, bg: "#1877D6", label: "MTD", route: "/month-to-date" },
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
    { icon: <GraduationCap size={20} color="#FFFFFF" />, bg: "#1877D6", label: "Test day", route: "/testday" },
    { icon: <Trophy size={20} color="#FFFFFF" />, bg: "#1877D6", label: "Rewards", route: "/rewards" },
    { icon: <GraduationCap size={20} color="#FFFFFF" />, bg: "#DC2626", label: "Courses", route: "/courses" },
    { icon: <Star size={20} color="#FFFFFF" />, bg: "#0B1F3A", label: "Reviews", route: "/reviews" },
    { icon: <Inbox size={20} color="#FFFFFF" />, bg: "#1877D6", label: "Enquiries", route: "/enquiries" },
    { icon: <Clock size={20} color="#FFFFFF" />, bg: "#DC2626", label: "Waiting list", route: "/waitlist" },
    { icon: <Gift size={20} color="#FFFFFF" />, bg: "#1877D6", label: "Referrals", route: "/referrals" },
    { icon: <Car size={20} color="#FFFFFF" />, bg: "#6B7280", label: "Vehicle", route: "/vehicle" },
    { icon: <BookOpen size={20} color="#FFFFFF" />, bg: "#1877D6", label: "CPD", route: "/cpd" },
    { icon: <GraduationCap size={20} color="#FFFFFF" />, bg: "#1877D6", label: "CPD log", route: "/cpd" },
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
    { icon: <Sun size={20} color="#FFFFFF" />, bg: "#0B1F3A", label: "EOD", route: "/eod" },
    { icon: <Moon size={20} color="#FFFFFF" />, bg: "#1877D6", label: "End of day", route: "/end-of-day" },
    { icon: <Megaphone size={20} color="#FFFFFF" />, bg: "#DC2626", label: "Broadcast", route: "/broadcast" },
    { icon: <Zap size={20} color="#FFFFFF" />, bg: "#1877D6", label: "Automations", route: "/automations" },
    { icon: <CalendarDays size={20} color="#FFFFFF" />, bg: "#1877D6", label: "Diary", route: "/diary" },
    { icon: <Crown size={20} color="#FFFFFF" />, bg: "#1877D6", label: "My plan", route: "/subscription" },
    { icon: <PlayCircle size={20} color="#FFFFFF" />, bg: "#DC2626", label: "Live session", route: "/livesession" },
    { icon: <Search size={20} color="#FFFFFF" />, bg: "#6B7280", label: "Search", route: "/search" },
    { icon: <Bell size={20} color="#FFFFFF" />, bg: "#DC2626", label: "Notifications", route: "/notifications" },
    { icon: <CalendarDays size={20} color="#FFFFFF" />, bg: "#1877D6", label: "Availability", route: "/quickavailability" },
    { icon: <RefreshCw size={20} color="#FFFFFF" />, bg: "#1877D6", label: "Calendar sync", route: "/calendarsync" },
    { icon: <UserCircle size={20} color="#FFFFFF" />, bg: "#1877D6", label: "Profile", route: "/profile" },
    { icon: <FileSpreadsheet size={20} color="#FFFFFF" />, bg: "#0B1F3A", label: "MTD", route: "/mtd" },
    { icon: <FileText size={20} color="#FFFFFF" />, bg: "#0B1F3A", label: "Quotes", route: "/quotes" },
    { icon: <Sun size={20} color="#FFFFFF" />, bg: "#1877D6", label: "Briefing", route: "/briefing" },
    { icon: <AlertCircle size={20} color="#FFFFFF" />, bg: "#DC2626", label: "Outstanding", route: "/outstanding" },
    { icon: <Globe size={20} color="#FFFFFF" />, bg: "#1877D6", label: "My website", route: "/minisite" },

  ] as const;

  if (!authChecked) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ ...POPPINS, backgroundColor: '#F3F8FF' }}
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
        avatar: (l.pupils as any)?.profile_image_url ?? null,
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
    const timeAgo = (iso: string) => {
      const diff = Math.max(0, Date.now() - new Date(iso).getTime());
      const m = Math.floor(diff / 60000);
      if (m < 1) return "just now";
      if (m < 60) return `${m}m ago`;
      const h = Math.floor(m / 60);
      if (h < 24) return `${h}h ago`;
      return `${Math.floor(h / 24)}d ago`;
    };
    const cardStyle: React.CSSProperties = {
      background: "#FFFFFF", border: "0.5px solid #E2E6ED",
      borderRadius: 12, padding: 16,
    };
    const statLabel: React.CSSProperties = {
      fontSize: 12, fontWeight: 600, color: "#6B7280",
      marginTop: 4, letterSpacing: 0.2,
    };
    const statValue: React.CSSProperties = {
      fontSize: 28, fontWeight: 900, color: "#0F2044", letterSpacing: -0.5,
    };
    const panelHeading: React.CSSProperties = {
      fontSize: 16, fontWeight: 800, color: "#0F2044", marginBottom: 12,
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
      fontSize: 12, fontWeight: 600, color: "#0F2044",
    };
    return (
      <div className="min-h-screen" style={{ ...POPPINS, backgroundColor: "#F3F8FF", paddingTop: "calc(60px + env(safe-area-inset-top, 0px))" }}>
        {notifBanner}
        <InstructorTopBar
          firstName={firstName}
          avatarUrl={avatarUrl}
          unreadCount={notifCount}
          onProfile={() => navigate({ to: "/profile" })}
          onPhone={() => navigate({ to: "/enquiries" })}
          onLiveTrack={() => navigate({ to: "/live" })}
          onBell={() => navigate({ to: "/notifications" })}
          onMenu={() => navigate({ to: "/settings" })}
        />
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "24px 32px" }}>
          {/* HEADER */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
            <h1 style={{ fontSize: 24, fontWeight: 900, color: "#0F2044", margin: 0, fontFamily: "Inter, sans-serif" }}>
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
                    const AVATAR_PALETTE = ["#1A52A0", "#00B5A5", "#7C3AED", "#DC2626", "#F59E0B", "#0EA5E9"];
                    const pupils = outstandingBreakdown.slice(0, 5);
                    const extraPupils = Math.max(0, activePupilsCount - pupils.length);
                    return (
                      <div style={{
                        background: "#FFFFFF", border: "0.5px solid #E2E6ED",
                        borderRadius: 20, overflow: "hidden", margin: "12px 16px 0",
                        fontFamily: "Inter, sans-serif",
                      }}>
                        <div style={{ height: 4, background: "linear-gradient(90deg, #00B5A5, #1A52A0)" }} />
                        <div style={{ padding: 20 }}>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                            <div style={{ fontWeight: 900, fontSize: 18, color: "#0F2044" }}>📅 Free day today</div>
                            <div style={{ fontSize: 13, color: "#9CA3AF" }}>{workingLabel}</div>
                          </div>
                          <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
                            {[
                              { value: `${availableHours} hrs`, label: "Available", color: "#0F2044" },
                              { value: `£${potential}`, label: "Potential", color: "#16A34A" },
                              { value: `${activePupilsCount}`, label: "Pupils", color: "#1A52A0" },
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
                              flex: 1, background: "#0F2044", color: "#FFFFFF",
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
                      return (
                        <button
                          key={l.id}
                          onClick={() => navigate({ to: "/lessons/$id", params: { id: l.id } as any })}
                          style={{
                            display: "grid", gridTemplateColumns: "70px 1fr auto auto",
                            gap: 12, alignItems: "center", padding: "10px 12px",
                            borderRadius: 10, border: "0.5px solid #E2E6ED",
                            background: "#FFFFFF", cursor: "pointer", textAlign: "left",
                            fontFamily: "Inter, sans-serif",
                          }}
                        >
                          <span style={{ fontSize: 14, fontWeight: 700, color: "#0F2044" }}>{formatTime(l)}</span>
                          <span style={{ fontSize: 14, fontWeight: 600, color: "#0F2044", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{pupilName(l)}</span>
                          <span style={{ fontSize: 12, color: "#6B7280" }}>{formatDuration(l.duration_minutes)}</span>
                          <span style={{
                            fontSize: 10, fontWeight: 700, textTransform: "uppercase",
                            padding: "3px 8px", borderRadius: 6,
                            background: paid ? "#DCFCE7" : "#FEE2E2",
                            color: paid ? "#166534" : "#991B1B",
                          }}>{paid ? "Paid" : "Unpaid"}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
                <button
                  onClick={() => navigate({ to: "/schedule" })}
                  style={{
                    marginTop: 12, width: "100%", padding: "10px 12px",
                    borderRadius: 10, border: "1px dashed #1877D6",
                    background: "transparent", color: "#1877D6",
                    fontSize: 13, fontWeight: 600, cursor: "pointer",
                    fontFamily: "Inter, sans-serif",
                  }}
                >Add lesson +</button>
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
                          <div style={{ fontSize: 14, fontWeight: 600, color: "#0F2044", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</div>
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
                          <div style={{ fontSize: 13, fontWeight: 600, color: "#0F2044", lineHeight: 1.3 }}>{n.title}</div>
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
                          <div style={{ fontSize: 14, fontWeight: 600, color: "#0F2044", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.name}</div>
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
    <div className="pb-safe" style={{ ...POPPINS, position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, height: '100dvh', maxHeight: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#0F2044', paddingTop: 'calc(60px + env(safe-area-inset-top, 0px))' }}>
      {notifBanner}
      <style>{`.hide-scrollbar::-webkit-scrollbar{display:none}.hide-scrollbar{scrollbar-width:none;-ms-overflow-style:none}.carousel-hide-scrollbar::-webkit-scrollbar{display:none}@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
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
            style={{ width: 8, height: 8, backgroundColor: "#1877D6", marginLeft: 4 }}
          />
        }
      />

      <PushPermissionCard />

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
              fontFamily: "Inter, sans-serif",
            }}
          >
            <div style={{
              background: "#0B1F3A", color: "#fff", padding: "16px 18px",
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
                    fontSize: 14, fontWeight: 500, color: "#0B1F3A",
                    fontFamily: "Inter, sans-serif",
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                  }}
                >
                  {m.label}
                  <ChevronRight size={16} color="#9CA3AF" />
                </button>
              ))}
            </div>

            {/* Auth action at bottom */}
            <div style={{ borderTop: "0.5px solid #EEF2F7", padding: "12px 18px" }}>
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
                    fontSize: 14, fontWeight: 600, color: "#1877D6",
                    fontFamily: "Inter, sans-serif",
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
                    fontSize: 14, fontWeight: 600, color: "#1877D6",
                    fontFamily: "Inter, sans-serif",
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

      {/* WORKSPACE DOTS + ACTIVE LABEL */}
      {(() => {
        const WORKSPACES = ['Today','Schedule','Pupils','Money','Market','DSM','Community','Tools'];
        return (
          <div style={{ display:'flex', justifyContent:'center', alignItems:'center', gap:5, padding:'4px 16px 8px', background:'#0F2044', flexShrink:0, zIndex:10 }}>
            {WORKSPACES.map((lbl, i) => (
              <button
                key={i}
                type="button"
                aria-label={`Go to ${lbl}`}
                onClick={() => setActiveWs(i)}
                style={{
                  width: activeWs === i ? 22 : 6,
                  height: 6,
                  borderRadius: 3,
                  background: activeWs === i ? '#FFFFFF' : 'rgba(255,255,255,0.25)',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 0,
                  transition: 'all 0.25s ease',
                }}
              />
            ))}
            <span
              style={{
                color: 'rgba(255,255,255,0.6)',
                fontSize: 11,
                fontWeight: 600,
                fontFamily: 'Poppins, sans-serif',
                marginLeft: 10,
                letterSpacing: 0.5,
                textTransform: 'uppercase',
                minWidth: 80,
              }}
            >
              {WORKSPACES[activeWs]}
            </span>
          </div>
        );
      })()}


      {/* WORKSPACES CAROUSEL */}
      <div
        ref={carouselRef}
        onScroll={handleCarouselScroll}
        onTouchStart={handleCarouselTouchStart}
        onTouchEnd={handleCarouselTouchEnd}
        style={{
          flex: 1,
          minHeight: 0,
          display:'flex',
          overflowX:'scroll',
          overflowY:'hidden',
          scrollSnapType:'x mandatory',
          scrollBehavior:'smooth',
          overscrollBehaviorX:'contain',
          WebkitOverflowScrolling:'touch',
          scrollbarWidth:'none',
          msOverflowStyle:'none',
          touchAction:'pan-x',
          background:'#F3F8FF',
        }}
        className="hide-scrollbar carousel-hide-scrollbar"
      >

<section
          data-workspace="today"
          data-ws-index={0}
          style={{
            flex:'0 0 100vw',
            width:'100vw',
            height:'100%',
            scrollSnapAlign:'start',
            overflowY:'auto',
            overflowX:'hidden',
            WebkitOverflowScrolling:'touch',
            touchAction:'pan-y',
            paddingBottom:'calc(64px + env(safe-area-inset-bottom, 0px) + 16px)',
            
          }}
        >
      {/* NAVY HEADER SECTION (hero + stats strip) */}
      <div style={{ backgroundColor: '#0B1F3A', marginTop: 'calc(-1 * (60px + env(safe-area-inset-top, 0px)))', paddingTop: 'calc(60px + env(safe-area-inset-top, 0px) + 12px)', paddingBottom: 24, borderRadius: '0 0 16px 16px', overflow: 'hidden' }}>
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
              fontSize: 10, fontWeight: 700, fontFamily: 'Inter, sans-serif',
              padding: '4px 8px', borderRadius: 6, border: 'none',
              background: carEditMode ? '#1877D6' : 'rgba(11,31,58,0.08)',
              color: carEditMode ? '#FFFFFF' : '#0B1F3A', cursor: 'pointer',
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
                outline: carEditMode ? '2px dashed #1877D6' : 'none',
                WebkitMaskImage: carEditMode ? 'none' : 'linear-gradient(to right, transparent 0%, rgba(0,0,0,0.85) 12%, #000 45%), linear-gradient(to bottom, #000 0%, #000 60%, rgba(0,0,0,0.45) 85%, transparent 100%)',
                WebkitMaskComposite: 'source-in',
                maskImage: carEditMode ? 'none' : 'linear-gradient(to right, transparent 0%, rgba(0,0,0,0.85) 12%, #000 45%), linear-gradient(to bottom, #000 0%, #000 60%, rgba(0,0,0,0.45) 85%, transparent 100%)',
                maskComposite: 'intersect',
              }}
            />

            {/* Label */}
            <div style={{ fontSize: 9, fontWeight: 700, color: '#9CA3AF', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 6, fontFamily: 'Inter, sans-serif', position: 'relative', zIndex: 1 }}>
              Next lesson · {upcoming ? formatDayLabel(lessonDateTime(upcoming)) : '—'}
            </div>
            {/* Content */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative', zIndex: 1 }}>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: 28, fontWeight: 900, color: '#0B1F3A', letterSpacing: -1, lineHeight: '30px', fontFamily: 'Inter, sans-serif', textShadow: '0 1px 2px rgba(255,255,255,0.9)' }}>
                  {upcoming ? formatTime(upcoming) : '—'}
                </div>
                <div style={{ fontSize: 15, fontWeight: 800, color: '#0B1F3A', marginTop: 4, fontFamily: 'Inter, sans-serif', textShadow: '0 1px 2px rgba(255,255,255,0.9)' }}>
                  {upcoming ? pupilName(upcoming) : 'No upcoming lessons'}
                </div>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginTop: 2, fontFamily: 'Inter, sans-serif', textShadow: '0 1px 2px rgba(255,255,255,0.9)' }}>
                  {upcoming ? formatDuration(upcoming.duration_minutes) : ''}
                </div>
              </div>
            </div>
            {/* Action buttons - raised above the car image */}
            {upcoming && (() => {
              const phone = upcoming?.pupils?.phone ?? "";
              const address = upcoming?.pupils?.address ?? "";
              const postcode = upcoming?.pupils?.postcode ?? "";
              const navQuery = [address, postcode].filter(Boolean).join(", ");
              const stop = (e: React.MouseEvent) => e.stopPropagation();
              const btnBase: React.CSSProperties = { flex: 1, height: 36, borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, textDecoration: 'none', border: 'none' };
              return (
                <div style={{ display: 'flex', gap: 8, marginTop: 12, position: 'relative', zIndex: 2 }}>
                  {phone ? (
                    <a href={`tel:${phone}`} target="_top" rel="noopener" onClick={stop} style={{ ...btnBase, background: '#1877D6', color: '#fff' }}>
                      <Phone size={16} color="#ffffff" /> Call
                    </a>
                  ) : (
                    <button onClick={(e) => { stop(e); toast("No phone number for this pupil"); }} style={{ ...btnBase, background: '#1877D6', color: '#fff', opacity: 0.6 }}>
                      <Phone size={16} color="#ffffff" /> Call
                    </button>
                  )}
                  {phone ? (
                    <a href={`sms:${phone}`} target="_top" rel="noopener" onClick={stop} style={{ ...btnBase, background: '#F3F8FF', color: '#0B1F3A', border: '1px solid rgba(11,31,58,0.12)' }}>
                      <MessageSquare size={16} color="#0B1F3A" /> Text
                    </a>
                  ) : (
                    <button onClick={(e) => { stop(e); toast("No phone number"); }} style={{ ...btnBase, background: '#F3F8FF', color: '#0B1F3A', border: '1px solid rgba(11,31,58,0.12)', opacity: 0.6 }}>
                      <MessageSquare size={16} color="#0B1F3A" /> Text
                    </button>
                  )}
                  {navQuery ? (
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(navQuery)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={stop}
                      style={{ ...btnBase, background: '#0B1F3A', color: '#fff' }}
                    >
                      <Navigation size={16} color="#ffffff" /> Go
                    </a>
                  ) : (
                    <button onClick={(e) => { stop(e); toast("No pickup address set"); }} style={{ ...btnBase, background: '#0B1F3A', color: '#fff', opacity: 0.6 }}>
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
                fontSize: 11, fontFamily: 'Inter, sans-serif', color: '#0B1F3A',
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
                  style={{ flex: 1, fontSize: 11, padding: '6px 6px', border: 'none', background: '#1877D6', color: '#FFF', borderRadius: 6, cursor: 'pointer' }}>
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
                  style={{ flex: 1, fontSize: 11, padding: '6px 6px', border: 'none', background: '#1877D6', color: '#FFF', borderRadius: 6, cursor: 'pointer' }}>
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
                style={{ width: '100%', marginTop: 6, fontSize: 12, fontWeight: 700, padding: '8px 8px', border: 'none', background: '#1877D6', color: '#FFF', borderRadius: 6, cursor: 'pointer' }}>
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
                fontFamily: 'Inter, sans-serif',
                fontSize: 11,
                fontWeight: 700,
                color: '#1877D6',
                textTransform: 'uppercase',
                letterSpacing: 0.6,
              }}
            >
              {heroExpanded ? 'Hide details' : 'Tap for details'}
              <ChevronDown
                size={16}
                color="#1877D6"
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
              onEol={() => setEolLesson(upcoming)}
            />
          )}
        </div>
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
                  onClick={() => {
                    const phone = upcoming?.pupils?.phone;
                    const first = (upcoming?.pupils?.name ?? 'there').split(/\s+/)[0];
                    if (!phone) { toast('No phone number'); setLateOpen(false); return; }
                    const body = encodeURIComponent(`Hi ${first}, running ${m} mins late, sorry!`);
                    window.location.href = `sms:${phone}?&body=${body}`;
                    setLateOpen(false);
                  }}
                  style={{ height: 44, borderRadius: 10, border: '1px solid #e3e6ec', background: '#fff', fontFamily: 'Inter, sans-serif', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}
                >{m}m</button>
              ))}
            </div>
          </DialogContent>
        </Dialog>


      </div>
      {/* ============ REDESIGNED HOME BODY (Poppins, Tabler, light) ============ */}
      {(() => {
        const PF = 'Poppins, Inter, sans-serif';
        const BORDER = 'rgba(15,32,68,0.10)';
        const MUTED = '#64748B';
        const NAVY = '#0F2044';
        const ACCENT = '#1A52A0';
        const DANGER = '#C9302C';
        const AMBER_BG = '#FEF3C7';
        const AMBER_FG = '#92400E';
        const PURPLE_BG = '#EDE9FE';
        const PURPLE_FG = '#6D28D9';

        const activeList = tab === 'today' ? todayLessons : tab === 'tomorrow' ? tomorrowLessons : nextTabLessons;
        const sorted = [...activeList].sort((a, b) => {
          const ad = `${a.lesson_date}T${a.lesson_time ?? '00:00'}`;
          const bd = `${b.lesson_date}T${b.lesson_time ?? '00:00'}`;
          return ad.localeCompare(bd);
        });
        const nowT = new Date();
        const fmt24 = (d: Date) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

        type Row = { kind: 'lesson'; l: LessonRow } | { kind: 'gap'; start: Date; mins: number };
        const rows: Row[] = [];
        for (let i = 0; i < sorted.length; i++) {
          const l = sorted[i];
          rows.push({ kind: 'lesson', l });
          const next = sorted[i + 1];
          if (!next) continue;
          const endThis = new Date(lessonDateTime(l).getTime() + (l.duration_minutes ?? 60) * 60000);
          const afterBuf = (l.pupil_id && pupilBufferMap[l.pupil_id]?.after) || 0;
          const beforeBuf = (next.pupil_id && pupilBufferMap[next.pupil_id]?.before) || 0;
          const gapStart = new Date(endThis.getTime() + afterBuf * 60000);
          const nextStart = new Date(lessonDateTime(next).getTime() - beforeBuf * 60000);
          const mins = Math.round((nextStart.getTime() - gapStart.getTime()) / 60000);
          if (mins >= 60) rows.push({ kind: 'gap', start: gapStart, mins });
        }
        const todayGapCount = rows.filter((r) => r.kind === 'gap').length;

        const currentLesson = sorted.find((l) => {
          const s = lessonDateTime(l);
          const e = new Date(s.getTime() + (l.duration_minutes ?? 60) * 60000);
          return nowT >= s && nowT < e;
        });
        const nextLesson = sorted.find((l) => lessonDateTime(l) > nowT);
        const owedPupil = (() => {
          for (const l of sorted) {
            const amt = Number(l.amount_due ?? 0);
            const paid = (l.payment_status ?? '').toLowerCase() === 'paid';
            if (amt > 0 && !paid) return { name: (l.pupils?.first_name ?? pupilName(l)).split(' ')[0], amount: amt, phone: l.pupils?.phone ?? '' };
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
          borderRadius: 16,
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
              borderRadius: 14,
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

        return (
          <div style={{ fontFamily: PF, padding: '14px 16px 0' }}>
            {/* 1. TODAY'S LESSONS TILE */}
            <div style={{ marginBottom: 14 }}>
              <TodayLessonsTile
                todayLessons={todayLessons}
                onNavigate={() => navigate({ to: '/schedule' })}
              />
            </div>

            {/* 2. STATS 2×2 */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <StatCard label="Earnings this week" value={`£${weekEarnings.toFixed(0)}${earningsEstimated ? ' est' : ''}`} onClick={() => setEarningsOpen(true)} />
              <StatCard label="Lessons this week" value={String(weekLessonsTotal)} />
            </div>


            {/* 3. TIMELINE with TABS */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 22, marginBottom: 10 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: NAVY, letterSpacing: -0.2 }}>
                {tab === 'today' ? "Today's timeline" : tab === 'tomorrow' ? "Tomorrow's timeline" : 'Upcoming lessons'}
              </div>
              <button type="button" onClick={() => setActiveWs(1)} style={{ background: 'none', border: 'none', padding: 0, fontFamily: PF, fontSize: 13, fontWeight: 600, color: ACCENT, cursor: 'pointer' }}>Full schedule →</button>
            </div>

            <div role="tablist" aria-label="Lesson period" style={{ display: 'flex', gap: 6, padding: 3, background: '#EEF3FA', borderRadius: 12, marginBottom: 10 }}>
              {(['today', 'tomorrow', 'next'] as const).map((t) => {
                const active = tab === t;
                const label = t === 'today' ? 'Today' : t === 'tomorrow' ? 'Tomorrow' : 'Next';
                return (
                  <button
                    key={t}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => setTab(t)}
                    style={{
                      flex: 1,
                      height: 34,
                      borderRadius: 9,
                      border: 'none',
                      background: active ? '#FFFFFF' : 'transparent',
                      color: active ? NAVY : MUTED,
                      fontFamily: PF,
                      fontSize: 13,
                      fontWeight: active ? 600 : 500,
                      cursor: 'pointer',
                      boxShadow: active ? '0 1px 2px rgba(15,32,68,0.08)' : 'none',
                      transition: 'background 120ms ease',
                    }}
                  >
                    {label}
                  </button>
                );
              })}
            </div>

            {(() => {
              const lessonRows = rows.filter((r): r is { kind: 'lesson'; l: LessonRow } => r.kind === 'lesson');
              const headerLabel = tab === 'today' ? 'Teaching today' : tab === 'tomorrow' ? 'Teaching tomorrow' : 'Upcoming lessons';
              const emptyLabel = tab === 'today' ? 'No lessons today' : tab === 'tomorrow' ? 'No lessons tomorrow' : 'No upcoming lessons';

              if (lessonRows.length === 0) {
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
                <div style={{ ...cardBase, overflow: 'hidden' }}>
                  {/* Card header */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px 12px' }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: NAVY, letterSpacing: -0.2 }}>{headerLabel}</div>
                    <div style={{ fontSize: 13, color: MUTED, fontWeight: 500 }}>
                      {lessonRows.length} lesson{lessonRows.length === 1 ? '' : 's'}
                    </div>
                  </div>

                  {lessonRows.map((row, idx) => {
                    const l = row.l;
                    const start = lessonDateTime(l);
                    const dur = l.duration_minutes ?? 60;
                    const end = new Date(start.getTime() + dur * 60000);
                    const isLive = nowT >= start && nowT < end;
                    const payStatus = (l.payment_status ?? '').toLowerCase();
                    const amt = Number(l.amount_due ?? 0);
                    const isPaid = payStatus === 'paid' || payStatus === 'prepaid';
                    const dueUnpaid = amt > 0 && !isPaid;
                    const name = pupilName(l);
                    const timeLabel = `${String(start.getHours()).padStart(2, '0')}:${String(start.getMinutes()).padStart(2, '0')}`;

                    let pill: React.ReactNode = null;
                    if (isLive) {
                      pill = (
                        <span style={{ background: '#DBEAFE', color: ACCENT, fontSize: 12, fontWeight: 600, padding: '4px 10px', borderRadius: 999 }}>
                          Live
                        </span>
                      );
                    } else if (isPaid) {
                      pill = (
                        <span style={{ background: '#E7F7EC', color: '#137333', fontSize: 12, fontWeight: 600, padding: '4px 10px', borderRadius: 999 }}>
                          Paid ✓
                        </span>
                      );
                    } else if (dueUnpaid) {
                      pill = (
                        <span style={{ background: '#FDECC8', color: '#8A5A00', fontSize: 12, fontWeight: 600, padding: '4px 10px', borderRadius: 999 }}>
                          £{amt.toFixed(0)}
                        </span>
                      );
                    }

                    return (
                      <div
                        key={l.id}
                        onClick={() => navigate({ to: '/lessons/$id', params: { id: l.id } })}
                        role="button"
                        tabIndex={0}
                        style={{
                          padding: '12px 16px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 12,
                          cursor: 'pointer',
                          borderTop: `0.5px solid ${BORDER}`,
                        }}
                      >
                        <div
                          aria-hidden
                          style={{
                            width: 40, height: 40, borderRadius: 999,
                            background: ACCENT, color: '#FFFFFF',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 13, fontWeight: 700, letterSpacing: 0.2,
                            flexShrink: 0,
                          }}
                        >
                          {initialsOf(name)}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          {tab === 'next' && (
                            <div style={{ fontSize: 11, fontWeight: 600, color: ACCENT, marginBottom: 2, fontVariantNumeric: 'tabular-nums', letterSpacing: 0.2 }}>
                              {start.toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short' })}
                            </div>
                          )}
                          <div style={{ fontSize: 15, fontWeight: 600, color: NAVY, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {name}
                          </div>
                          <div style={{ fontSize: 12, color: MUTED, marginTop: 2, fontVariantNumeric: 'tabular-nums' }}>
                            {timeLabel} · {dur} mins
                          </div>
                        </div>
                        {pill}
                        <IconChevronRight size={18} stroke={1.75} color={MUTED} style={{ flexShrink: 0 }} />
                      </div>
                    );
                  })}
                </div>
              );
            })()}

            {/* 4. GAP WITH MATCHED PUPILS */}
            {(() => {
              const firstGap = rows.find((r): r is { kind: 'gap'; start: Date; mins: number } => r.kind === 'gap');
              let gapStart: Date | null = null;
              let gapMins = 0;
              if (firstGap) {
                gapStart = firstGap.start;
                gapMins = firstGap.mins;
              } else if (sorted.length === 0 && tab !== 'next') {
                // Whole working day is free — use working-hours window, fallback 9am–6pm.
                const startStr = workingHours?.start_time ? String(workingHours.start_time) : '09:00';
                const endStr = workingHours?.end_time ? String(workingHours.end_time) : '18:00';
                const [sh, sm] = startStr.split(':').map(Number);
                const [eh, em] = endStr.split(':').map(Number);
                const base = tab === 'today' ? new Date() : (() => { const d = new Date(); d.setDate(d.getDate() + 1); return d; })();
                base.setHours(sh || 9, sm || 0, 0, 0);
                gapStart = base;
                gapMins = ((eh || 18) * 60 + (em || 0)) - ((sh || 9) * 60 + (sm || 0));
                if (gapMins < 60) return null;
              } else {
                return null;
              }
              const gapH = gapStart.getHours();
              const gapM = gapStart.getMinutes();
              const period = gapH >= 12 ? 'PM' : 'AM';
              const h12 = gapH % 12 === 0 ? 12 : gapH % 12;
              const gapTimeLabel = `${h12}:${String(gapM).padStart(2, '0')} ${period}`;
              const isWholeDay = !firstGap;
              const titleText = isWholeDay
                ? `${Math.floor(gapMins / 60)} hrs free · ${gapTimeLabel}`
                : `${gapMins} mins free · ${gapTimeLabel}`;
              // Match pupils whose availability fits this gap
              const DAYS_ABBR = ['sun','mon','tue','wed','thu','fri','sat'];
              const dayKey = DAYS_ABBR[gapStart.getDay()];
              const gapStartMins = gapStart.getHours() * 60 + gapStart.getMinutes();
              const gapEndMins = gapStartMins + gapMins;
              const hoursUntilGap = (gapStart.getTime() - Date.now()) / 3600000;
              const parseHM = (t: string | null | undefined, fallback: number) => {
                if (!t) return fallback;
                const [h, m] = t.split(':').map(Number);
                return (h || 0) * 60 + (m || 0);
              };
              type Matched = { id: string; first: string; avatar: string | null; colour: string | null; daysSince: number };
              const matches: Matched[] = [];
              Object.entries(pupilAvailMap).forEach(([pid, a]) => {
                const info = pupilInfoMap[pid];
                if (!info) return;
                const days = (a.available_days || []).map((d) => String(d).toLowerCase().slice(0, 3));
                if (days.length && !days.includes(dayKey)) return;
                const fromMins = parseHM(a.available_from, 0);
                const untilMins = parseHM(a.available_until, 24 * 60);
                // Gap must overlap the pupil's available window and be long enough
                if (gapEndMins <= fromMins || gapStartMins >= untilMins) return;
                const minNotice = a.min_notice_hours ?? 24;
                if (hoursUntilGap < minNotice && !a.short_notice_opt_in) return;
                const first = (info.first_name || info.name || 'Pupil').split(/\s+/)[0];
                const last = info.last_lesson_date;
                const daysSince = last
                  ? Math.floor((gapStart.getTime() - new Date(last + 'T00:00:00').getTime()) / 86400000)
                  : 999;
                matches.push({ id: pid, first, avatar: info.profile_image_url, colour: info.calendar_colour, daysSince });
              });
              matches.sort((a, b) => b.daysSince - a.daysSince);
              const matchedCount = matches.length;
              const AVATAR_PALETTE = ['#1A52A0', '#00B5A5', '#7C3AED', '#DC2626', '#F59E0B', '#0EA5E9'];
              const shown = matches.slice(0, 4);
              const extra = Math.max(0, matchedCount - shown.length);
              return (
                <div
                  onClick={() => navigate({ to: '/gaps' })}
                  role="button"
                  tabIndex={0}
                  style={{
                    ...cardBase,
                    marginTop: 14,
                    padding: '14px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    cursor: 'pointer',
                    width: '100%',
                  }}
                >
                  <div style={{ width: 36, height: 36, borderRadius: 11, background: '#FBEFE1', color: '#B5661E', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <IconBolt size={18} stroke={1.5} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 500, color: NAVY, lineHeight: 1.3 }}>
                      {titleText}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 5 }}>
                      {shown.length > 0 && (
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                          {shown.map((m, i) => {
                            const bg = m.colour || AVATAR_PALETTE[i % AVATAR_PALETTE.length];
                            const initial = (m.first[0] || '?').toUpperCase();
                            return (
                              <div
                                key={m.id}
                                title={m.first}
                                style={{
                                  width: 22, height: 22, borderRadius: 999,
                                  background: bg, color: '#FFFFFF',
                                  fontSize: 10, fontWeight: 700,
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  border: '1.5px solid #FFFFFF',
                                  marginLeft: i === 0 ? 0 : -6,
                                  overflow: 'hidden',
                                  backgroundImage: m.avatar ? `url(${m.avatar})` : undefined,
                                  backgroundSize: 'cover',
                                  backgroundPosition: 'center',
                                  flexShrink: 0,
                                }}
                              >
                                {m.avatar ? '' : initial}
                              </div>
                            );
                          })}
                          {extra > 0 && (
                            <div style={{
                              width: 22, height: 22, borderRadius: 999,
                              background: '#E5E7EB', color: '#374151',
                              fontSize: 10, fontWeight: 600,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              border: '1.5px solid #FFFFFF',
                              marginLeft: -6,
                              flexShrink: 0,
                            }}>+{extra}</div>
                          )}
                        </div>
                      )}
                      <div style={{ fontSize: 11, color: MUTED, lineHeight: 1.3 }}>
                        {matchedCount > 0 ? `${matchedCount} pupil${matchedCount === 1 ? '' : 's'} may fit` : 'No waitlist match'}
                      </div>
                    </div>
                  </div>
                  <IconChevronRight size={18} stroke={1.5} color={MUTED} style={{ flexShrink: 0 }} />
                </div>
              );
            })()}

            {/* 5. AI INSIGHT */}

            {aiInsight && (() => {
              const insightAccent = '#6B4FD6';
              const insightBg = '#F3EEFD';
              const handleClick = () => {
                if (aiInsight.onAction) aiInsight.onAction();
                else if (aiInsight.to) navigate({ to: aiInsight.to as never });
              };
              const hasAction = Boolean(aiInsight.onAction || aiInsight.to);
              return (
                <div
                  onClick={hasAction ? handleClick : undefined}
                  role={hasAction ? "button" : undefined}
                  tabIndex={hasAction ? 0 : undefined}
                  style={{
                    ...cardBase,
                    marginTop: 10,
                    padding: '14px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    cursor: hasAction ? 'pointer' : 'default',
                    width: '100%',
                  }}
                >
                  <div style={{ width: 36, height: 36, borderRadius: 11, background: insightBg, color: insightAccent, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <IconSparkles size={18} stroke={1.5} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, color: MUTED, lineHeight: 1.2 }}>AI INSIGHT</div>
                    <div style={{ fontSize: 14, fontWeight: 500, color: NAVY, marginTop: 2, lineHeight: 1.35 }}>
                      {aiInsight.text}
                    </div>
                  </div>
                  {hasAction && <IconChevronRight size={18} stroke={1.5} color={MUTED} style={{ flexShrink: 0 }} />}
                </div>
              );
            })()}



            {/* 6. QUICK ACTIONS */}
            <div style={{ marginTop: 22, padding: 16, background: '#F1F5F9', borderRadius: 26, fontFamily: PF }}>
              <div style={{ fontSize: 20, fontWeight: 500, color: NAVY, letterSpacing: '-0.01em', marginBottom: 14 }}>Quick actions</div>
              {(() => {
                const unread = unreadMsgs.length;
                const outstandingBadge = outstanding > 0 ? `£${Math.round(outstanding).toLocaleString()}` : null;
                const showFillSlots = freeSlotCount > 0;
                type Tile = {
                  key: string;
                  label: string;
                  to: string;
                  icon: React.ReactNode;
                  chipBg: string;
                  badge?: React.ReactNode;
                  span?: boolean;
                };
                const tiles: Tile[] = [];
                if (showFillSlots) {
                  tiles.push({
                    key: 'fill',
                    label: 'Fill slots',
                    to: '/gaps',
                    icon: <IconBolt size={20} stroke={1.5} color="#B5661E" />,
                    chipBg: '#FBEFE1',
                    badge: (
                      <span style={{ background: '#FBEFE1', color: '#B5661E', fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 999, fontVariantNumeric: 'tabular-nums' }}>
                        {freeSlotCount} free
                      </span>
                    ),
                  });
                }
                tiles.push(
                  { key: 'schedule', label: 'Schedule', to: '/schedule', icon: <IconCalendar size={20} stroke={1.5} color="#185FA5" />, chipBg: '#E6F1FB' },
                  { key: 'pupils', label: 'Pupils', to: '/pupils', icon: <IconUsers size={20} stroke={1.5} color="#6B4FD6" />, chipBg: '#F0EBFF' },
                  {
                    key: 'payments',
                    label: 'Payments',
                    to: '/payments',
                    icon: <IconWallet size={20} stroke={1.5} color="#A32D2D" />,
                    chipBg: '#FCEBEB',
                    badge: outstandingBadge ? (
                      <span style={{ background: '#FCEBEB', color: '#A32D2D', fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 999, fontVariantNumeric: 'tabular-nums' }}>{outstandingBadge}</span>
                    ) : undefined,
                  },
                  {
                    key: 'messages',
                    label: 'Messages',
                    to: '/messages',
                    icon: <IconMessageCircle size={20} stroke={1.5} color="#3B6D11" />,
                    chipBg: '#EAF3DE',
                    badge: unread > 0 ? (
                      <span style={{ background: '#185FA5', color: '#FFFFFF', minWidth: 20, height: 20, padding: '0 6px', borderRadius: 999, fontSize: 11, fontWeight: 600, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>{unread}</span>
                    ) : undefined,
                  },
                  { key: 'more', label: 'More', to: '/tools', icon: <IconDots size={20} stroke={1.5} color="#6B7280" />, chipBg: '#F1F5F9', span: !showFillSlots },
                );
                return (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    {tiles.map((t) => (
                      <button
                        key={t.key}
                        type="button"
                        onClick={() => navigate({ to: t.to as never })}
                        style={{
                          gridColumn: t.span ? 'span 2' : undefined,
                          background: '#FFFFFF',
                          borderRadius: 20,
                          padding: 18,
                          border: 'none',
                          cursor: 'pointer',
                          fontFamily: PF,
                          textAlign: 'left',
                          display: 'flex',
                          flexDirection: 'column',
                          minHeight: 96,
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                          <span style={{ width: 42, height: 42, borderRadius: 14, background: t.chipBg, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            {t.icon}
                          </span>
                          {t.badge}
                        </div>
                        <div style={{ fontSize: 15, fontWeight: 500, color: NAVY, marginTop: 14 }}>{t.label}</div>
                      </button>
                    ))}
                  </div>
                );
              })()}
            </div>

          </div>
        );
      })()}


        <div style={{ height: 'calc(64px + env(safe-area-inset-bottom, 0px) + 16px)' }} />
        </section>
<section
          data-workspace="schedule"
          data-ws-index={1}
          style={{
            flex:'0 0 100vw',
            width:'100vw',
            height:'100%',
            scrollSnapAlign:'start',
            overflowY:'auto',
            overflowX:'hidden',
            WebkitOverflowScrolling:'touch',
            touchAction:'pan-y',
            paddingBottom:'calc(64px + env(safe-area-inset-bottom, 0px) + 16px)',
            
          }}
        >
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
            fontFamily: "Inter, sans-serif",
          }}
        >
          <span
            style={{
              width: 32,
              height: 32,
              borderRadius: 999,
              backgroundColor: "#EEF2F7",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <Bell size={16} color="#0B1F3A" />
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#0B1F3A" }}>
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
              background: "#1877D6",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              padding: "8px 12px",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: "Inter, sans-serif",
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
            <X size={16} color="#0B1F3A" />
          </button>
        </div>
      )}


      {/* TODAY'S SCHEDULE (Google Calendar style) */}
      <div
        className="mx-4 mt-3"
        style={{
          backgroundColor: "#FFFFFF",
          padding: "0",
          fontFamily: "Poppins, Inter, sans-serif",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between"
          style={{ padding: "4px 4px 12px 4px" }}
        >
          <div style={{ fontSize: 20, fontWeight: 500, color: "#0B1F3A", fontFamily: "Poppins, Inter, sans-serif", letterSpacing: "-0.01em" }}>
            Schedule
          </div>
          <button
            type="button"
            onClick={() => navigate({ to: "/schedule" })}
            style={{
              fontSize: 13,
              fontWeight: 500,
              color: "#1877D6",
              background: "transparent",
              border: "none",
              padding: 0,
              cursor: "pointer",
              fontFamily: "Poppins, Inter, sans-serif",
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
            margin: "0 0 10px 0",
            padding: 3,
            backgroundColor: "#F1F5F9",
            borderRadius: 10,
            fontFamily: "Poppins, Inter, sans-serif",
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
          tab !== "next" ? (
            (() => {
              const targetDate = tab === "today" ? todayStart : tomorrowStart;
              const isToday = tab === "today";
              const dayNoun = isToday ? "today" : "tomorrow";
              const dayKeys = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;
              const targetKey = dayKeys[targetDate.getDay()];
              const todayWorks = workingHours ? (workingHours as Record<string, unknown>)[targetKey] : true;
              const startStr = "09:00";
              const endStr = workingHours?.end_time ? String(workingHours.end_time).slice(0, 5) : "18:00";
              const [sh, sm] = startStr.split(":").map(Number);
              const [eh, em] = endStr.split(":").map(Number);
              const totalMinutes = Math.max(0, (eh * 60 + em) - (sh * 60 + sm));
              const availableHours = Math.round((totalMinutes / 60) * 10) / 10;
              const hourlyRate = 40;
              const potential = Math.round(availableHours * hourlyRate);
              const fmt24 = (h: number, m: number) => `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
              const workingLabel = todayWorks ? `${fmt24(sh, sm)} – ${fmt24(eh, em)}` : `Not working ${dayNoun}`;
              const fmtWindow = todayWorks ? `${fmt24(sh, sm)} – ${fmt24(eh, em)}` : "—";
              return (
                <div style={{
                  margin: "4px 16px 12px",
                  padding: 16,
                  background: "#FFFFFF",
                  border: "0.5px solid #EEF2F7",
                  borderRadius: 16,
                  fontFamily: "Inter, sans-serif",
                  display: "flex", flexDirection: "column", gap: 16,
                }}>
                  {/* Header */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: "#0F2044", lineHeight: 1.2 }}>Free day {dayNoun}</div>
                      <div style={{ fontSize: 12, color: "#6B7280", marginTop: 2 }}>
                        {todayWorks ? `You have ${availableHours} hrs of open time` : `Not scheduled to work ${dayNoun}`}
                      </div>
                    </div>
                    <div style={{ background: "rgba(0,181,165,0.10)", padding: 8, borderRadius: 10, display: "flex" }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#00B5A5" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                        <line x1="16" y1="2" x2="16" y2="6" />
                        <line x1="8" y1="2" x2="8" y2="6" />
                        <line x1="3" y1="10" x2="21" y2="10" />
                      </svg>
                    </div>
                  </div>

                  {/* Stats row */}
                  <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr 1fr", gap: 16 }}>
                    {[
                      { label: "Window", value: fmtWindow, color: "#0F2044" },
                      { label: "Potential", value: `£${potential}`, color: "#00B5A5" },
                      { label: "Pupils", value: `${activePupilsCount} active`, color: "#0F2044" },
                    ].map((s, i) => (
                      <div key={s.label} style={{
                        display: "flex", flexDirection: "column",
                        borderLeft: i === 0 ? "none" : "1px solid #F1F3F7",
                        paddingLeft: i === 0 ? 0 : 16,
                        minWidth: 0,
                      }}>
                        <span style={{ fontSize: 10, fontWeight: 600, color: "#9CA3AF", letterSpacing: "0.06em", textTransform: "uppercase" }}>{s.label}</span>
                        <span style={{ fontSize: 13, fontWeight: 600, color: s.color, marginTop: 2, whiteSpace: "nowrap" }}>{s.value}</span>
                      </div>
                    ))}
                  </div>


                  {/* Actions */}
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => navigate({ to: "/gaps" })} style={{
                      flex: 1, background: "#1877D6", color: "#FFFFFF",
                      padding: "10px 0", borderRadius: 10, fontWeight: 600, fontSize: 13,
                      border: "none", cursor: "pointer", fontFamily: "Inter, sans-serif",
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                    }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                        <line x1="12" y1="5" x2="12" y2="19" />
                        <line x1="5" y1="12" x2="19" y2="12" />
                      </svg>
                      Fill slots
                    </button>
                    <button onClick={() => {
                      window.location.href = `sms:?body=${encodeURIComponent(`Hi everyone, I have lesson availability ${dayNoun}. Reply to book!`)}`;
                    }} style={{
                      flex: 1, background: "#FFFFFF", color: "#0F2044",
                      padding: "10px 0", borderRadius: 10, fontWeight: 600, fontSize: 13,
                      border: "1px solid #E5E7EB", cursor: "pointer", fontFamily: "Inter, sans-serif",
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                    }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                        <path d="M18 8a3 3 0 0 0-3-3H5a2 2 0 0 0-2 2v14l4-4h8a3 3 0 0 0 3-3V8z" />
                      </svg>
                      Broadcast
                    </button>
                  </div>
                  {!todayWorks && (
                    <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: -4 }}>Working hours: {workingLabel}</div>
                  )}
                </div>
              );
            })()
          ) : (
            <div
              style={{
                padding: "20px 16px",
                fontSize: 13,
                color: "#9CA3AF",
                textAlign: "center",
                fontFamily: "Inter, sans-serif",
              }}
            >
              No upcoming lessons
            </div>
          )
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
                        fontFamily: "Inter, sans-serif",
                      }}
                    >
                      {formatDayLabel(startD)}
                    </div>,
                  );
                  lastDateKey = dKey;
                }
              }

              

              const nameColor = isCancelled ? "#9CA3AF" : "#0B1F3A";

              const timeColor = isCancelled ? "#9CA3AF" : "#0B1F3A";

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
                      color: "#1877D6",
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
                        backgroundColor: "#1877D6",
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
                        backgroundColor: "#EEF2F7",
                        color: "#0B1F3A",
                        border: 0,
                        cursor: "pointer",
                        fontFamily: "Inter, sans-serif",
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
                        color: "#0B1F3A",
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
                        color: "#0B1F3A",
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
                        color: "#1877D6",
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
                      color: "#1877D6",
                    }}
                  >
                    Prepaid
                  </span>,
                );
              }

              rows.push(
                <Fragment key={l.id}>
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() =>
                      setExpandedLessonId((prev) =>
                        prev === l.id ? null : l.id,
                      )
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setExpandedLessonId((prev) =>
                          prev === l.id ? null : l.id,
                        );
                      }
                    }}
                    className="grid grid-cols-[44px_minmax(0,1fr)_auto] items-center gap-3 cursor-pointer"
                    style={{
                      padding: "12px 14px",
                      background: "#fff",
                      fontFamily: "Poppins, Inter, sans-serif",
                    }}
                  >
                    {(() => {
                      const chipBg = isCurrent ? "#FCEBEB" : "#E6F1FB";
                      const chipFg = isCurrent ? "#A32D2D" : "#185FA5";
                      return (
                        <div
                          className="relative shrink-0"
                          style={{
                            width: 44,
                            height: 44,
                            borderRadius: 13,
                            background: chipBg,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          {isCurrent && (
                            <span
                              aria-label="Live"
                              style={{
                                position: "absolute",
                                top: 4,
                                right: 4,
                                width: 6,
                                height: 6,
                                borderRadius: 999,
                                backgroundColor: "#DC2626",
                              }}
                            />
                          )}
                          <div
                            style={{
                              fontSize: 11,
                              fontWeight: 500,
                              color: chipFg,
                              fontFamily: "Poppins, Inter, sans-serif",
                              fontVariantNumeric: "tabular-nums",
                              textDecoration: isCancelled ? "line-through" : "none",
                            }}
                          >
                            {fmtT(startD)}
                          </div>
                        </div>
                      );
                    })()}
                    <div className="min-w-0">
                      <div
                        className="truncate"
                        style={{
                          fontSize: 15,
                          fontWeight: 500,
                          color: nameColor,
                          fontFamily: "Poppins, Inter, sans-serif",
                          textDecoration: isCancelled ? "line-through" : "none",
                        }}
                      >
                        {l.pupils?.name ?? "Pupil"}
                      </div>
                      <div
                        className="flex items-center gap-2 flex-wrap"
                        style={{ marginTop: 2 }}
                      >
                        <span style={{ fontSize: 12, color: "#6B7280", fontFamily: "Poppins, Inter, sans-serif" }}>
                          {durShort(l.duration_minutes)}
                        </span>
                        {badges.length > 0 && badges}
                      </div>
                      {l.pickup_location && (
                        <div
                          className="flex min-w-0 items-center gap-1 truncate"
                          style={{ marginTop: 2, fontSize: 11, color: "#6B7280", fontFamily: "Poppins, Inter, sans-serif" }}
                        >
                          <MapPin size={10} color="#6B7280" />
                          <span className="truncate">{l.pickup_location}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex shrink-0 items-center">
                      <ChevronRight
                        size={16}
                        color="#9CA3AF"
                        style={{
                          transform:
                            expandedLessonId === l.id
                              ? "rotate(90deg)"
                              : "rotate(0deg)",
                          transition: "transform 200ms ease",
                        }}
                      />
                    </div>
                  </div>


                  {expandedLessonId === l.id && (
                    <div
                      style={{
                        padding: "12px 16px",
                        background: "#fff",
                        borderTop: "1px solid #F3F4F6",
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {(() => {
                        const amount = l.amount_due ?? 0;
                        const isPrepaid =
                          Number(l.pupils?.prepaid_hours ?? 0) > 0;
                        let statusBadge: React.ReactNode;
                        if (l.payment_status === "paid") {
                          statusBadge = (
                            <span
                              style={{
                                padding: "3px 8px",
                                borderRadius: 999,
                                backgroundColor: "#DCFCE7",
                                color: "#16A34A",
                                fontSize: 12,
                                fontWeight: 600,
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 4,
                              }}
                            >
                              <span>✓</span> Paid
                            </span>
                          );
                        } else if (isPrepaid) {
                          statusBadge = (
                            <span
                              style={{
                                padding: "3px 8px",
                                borderRadius: 999,
                                backgroundColor: "#DBEAFE",
                                color: "#1D4ED8",
                                fontSize: 12,
                                fontWeight: 600,
                              }}
                            >
                              Prepaid
                            </span>
                          );
                        } else if (amount === 0) {
                          statusBadge = (
                            <span
                              style={{
                                padding: "3px 8px",
                                borderRadius: 999,
                                backgroundColor: "#F3F4F6",
                                color: "#6B7280",
                                fontSize: 12,
                                fontWeight: 600,
                              }}
                            >
                              No charge
                            </span>
                          );
                        } else {
                          statusBadge = (
                            <span
                              style={{
                                padding: "3px 8px",
                                borderRadius: 999,
                                backgroundColor: "#FEE2E2",
                                color: "#DC2626",
                                fontSize: 12,
                                fontWeight: 600,
                              }}
                            >
                              Unpaid £{amount.toFixed(2)}
                            </span>
                          );
                        }
                        return (
                          <>
                            <div className="flex items-center gap-2">
                              {statusBadge}
                              {l.payment_status === "paid" && amount > 0 && (
                                <span
                                  className="text-sm font-semibold"
                                  style={{ color: "#0B1F3A" }}
                                >
                                  £{amount.toFixed(2)}
                                </span>
                              )}
                            </div>
                            <div
                              className="flex gap-2 flex-wrap"
                              style={{ marginTop: 8 }}
                            >
                              {l.payment_status !== "paid" &&
                                amount > 0 &&
                                !isPrepaid && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      sendPaymentLink(l);
                                    }}
                                    className="text-sm font-semibold"
                                    style={{
                                      flex: "1 1 auto",
                                      padding: "8px 12px",
                                      borderRadius: 8,
                                      background: "#16A34A",
                                      color: "#fff",
                                      minWidth: 120,
                                      textAlign: "center",
                                    }}
                                  >
                                    Send payment link
                                  </button>
                                )}
                              {l.payment_status !== "paid" &&
                                amount > 0 &&
                                !isPrepaid && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      markLessonPaid(l);
                                    }}
                                    className="text-sm font-semibold"
                                    style={{
                                      flex: "1 1 auto",
                                      padding: "8px 12px",
                                      borderRadius: 8,
                                      background: "#0F2044",
                                      color: "#fff",
                                      minWidth: 120,
                                      textAlign: "center",
                                    }}
                                  >
                                    Mark paid
                                  </button>
                                )}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate({
                                    to: "/lessons/$id",
                                    params: { id: l.id },
                                  });
                                }}
                                className="text-sm font-semibold"
                                style={{
                                  padding: "8px 12px",
                                  color: "#1A52A0",
                                  background: "transparent",
                                  textAlign: "center",
                                }}
                              >
                                View lesson
                              </button>
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  )}
                </Fragment>,
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
                      role="button"
                      tabIndex={0}
                      onClick={() => navigate({ to: "/gaps" })}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "44px minmax(0,1fr) auto",
                        alignItems: "center",
                        gap: 12,
                        padding: "12px 14px",
                        background: "#fff",
                        borderTop: "0.5px dashed #D1D5DB",
                        borderBottom: "0.5px dashed #D1D5DB",
                        cursor: "pointer",
                        fontFamily: "Poppins, Inter, sans-serif",
                      }}
                    >
                      <div
                        style={{
                          width: 44,
                          height: 44,
                          borderRadius: 13,
                          border: "1.5px dashed #CBD5E1",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "#9CA3AF",
                        }}
                      >
                        <Plus size={16} strokeWidth={1.75} />
                      </div>
                      <div style={{ fontSize: 14, color: "#6B7280", fontFamily: "Poppins, Inter, sans-serif" }}>
                        {gapMins} mins free
                      </div>
                      <div style={{ fontSize: 12, fontWeight: 500, color: "#1877D6", fontFamily: "Poppins, Inter, sans-serif" }}>
                        Fill →
                      </div>
                    </div>,
                  );
                } else {
                  rows.push(
                    <div
                      key={`hr-${l.id}`}
                      style={{
                        borderTop: "0.5px solid #EEF2F7",
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
                    color: "#1877D6",
                    background: "transparent",
                    cursor: "pointer",
                    textAlign: "left",
                    fontFamily: "Inter, sans-serif",
                  }}
                >
                  View all {tabLessons.length} lessons →
                </button>,
              );
            }

            return <div style={{ border: '1px solid #E5E7EB', borderRadius: 14, overflow: 'hidden', background: '#fff', fontFamily: 'Poppins, Inter, sans-serif' }}>{rows}</div>;
          })()
        )}
      </div>

      <EndOfDayBanner />

        {/* Schedule CTAs */}
        <div style={{ display:'grid', gridTemplateColumns:'1.3fr 1fr', gap:10, padding:'12px 16px 24px' }}>
          <button
            type="button"
            onClick={() => navigate({ to: '/schedule' })}
            style={{ height:'auto', borderRadius:12, border:'none', background:'#1877D6', color:'#fff', fontSize:14, fontWeight:500, fontFamily:'Poppins, Inter, sans-serif', cursor:'pointer', boxShadow:'none', padding:'14px 4px', display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}
          >
            <Plus size={18} strokeWidth={2} /> Add lesson
          </button>
          <button
            type="button"
            onClick={() => navigate({ to: '/gaps' })}
            style={{ height:'auto', borderRadius:12, border:'1px solid #BFD7F0', background:'#FFFFFF', color:'#1877D6', fontSize:14, fontWeight:500, fontFamily:'Poppins, Inter, sans-serif', cursor:'pointer', boxShadow:'none', padding:'14px 4px', display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}
          >
            <Clock size={18} strokeWidth={2} /> Fill slots
          </button>
        </div>


        <div style={{ height: 'calc(64px + env(safe-area-inset-bottom, 0px) + 16px)' }} />
        </section>
<section
          data-workspace="pupils"
          data-ws-index={2}
          style={{
            flex:'0 0 100vw',
            width:'100vw',
            height:'100%',
            scrollSnapAlign:'start',
            overflowY:'auto',
            overflowX:'hidden',
            WebkitOverflowScrolling:'touch',
            touchAction:'pan-y',
            paddingBottom:'calc(64px + env(safe-area-inset-bottom, 0px) + 16px)',
            
          }}
        >
        {(() => {
          // Payment lookup by pupilId from outstandingBreakdown
          const owedByPupil: Record<string, number> = {};
          for (const o of outstandingBreakdown) owedByPupil[o.pupilId] = (owedByPupil[o.pupilId] ?? 0) + o.amount;


          const fmtTestWhen = (dateStr: string, timeStr: string | null) => {
            const d = new Date(`${dateStr}T${(timeStr || '09:00').slice(0,5)}:00`);
            const day = d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
            const time = d.toLocaleTimeString('en-GB', { hour: 'numeric', minute: '2-digit', hour12: true }).toLowerCase().replace(' ', '');
            return `${day} at ${time}`;
          };
          const daysUntil = (dateStr: string) => {
            const d = new Date(`${dateStr}T00:00:00`);
            const now = new Date();
            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            return Math.max(0, Math.round((d.getTime() - today.getTime()) / 86400000));
          };
          const testsSorted = [...(upcomingTests ?? [])].sort((a, b) => a.test_date.localeCompare(b.test_date));
          const shownOwed = outstandingBreakdown.slice(0, 3);

          return (
            <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
              {/* 1. SEARCH */}
              <button
                type="button"
                onClick={() => navigate({ to: '/pupils' as never })}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 8,
                  background: '#FFFFFF', border: '0.5px solid #E2E6ED', borderRadius: 14,
                  padding: '12px 16px', cursor: 'pointer', textAlign: 'left',
                  boxShadow: '0 2px 8px rgba(15,32,68,0.04)', fontFamily: 'Inter, sans-serif',
                }}
              >
                <Search size={16} color="#9CA3AF" />
                <span style={{ fontSize: 14, color: '#9CA3AF' }}>Search pupils…</span>
              </button>

              {/* 2. QUICK STATS */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                {[
                  { value: activePupilsCount, label: 'Active', color: '#0F2044' },
                  { value: todayLessons.length, label: 'Today', color: '#1A52A0' },
                  { value: upcomingTests?.length ?? 0, label: 'Tests due', color: '#7C3AED' },
                ].map((s) => (
                  <div key={s.label} style={{ background: '#FFFFFF', border: '0.5px solid #E2E6ED', borderRadius: 12, padding: 12, textAlign: 'center', fontFamily: 'Inter, sans-serif' }}>
                    <div style={{ fontSize: 20, fontWeight: 900, color: s.color, lineHeight: 1 }}>{s.value}</div>
                    <div style={{ fontSize: 10, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 0.6, marginTop: 4, fontWeight: 700 }}>{s.label}</div>
                  </div>
                ))}
              </div>

              {/* 2b. ALL PUPILS WITH TABS */}
              {(() => {
                const counts = {
                  current: allPupilsList.filter((p) => p.status === 'active').length,
                  passed: allPupilsList.filter((p) => p.status === 'passed').length,
                  cancelled: allPupilsList.filter((p) => p.status === 'cancelled').length,
                  inactive: allPupilsList.filter((p) => p.status === 'inactive' || p.status === 'archived').length,
                };
                const tabKey = pupilsTab;
                const filtered = allPupilsList.filter((p) => {
                  if (tabKey === 'current') return p.status === 'active';
                  if (tabKey === 'inactive') return p.status === 'inactive' || p.status === 'archived';
                  return p.status === tabKey;
                }).sort((a, b) => a.name.localeCompare(b.name));
                const tabs: Array<{ key: typeof pupilsTab; label: string; count: number }> = [
                  { key: 'current', label: 'Current', count: counts.current },
                  { key: 'passed', label: 'Passed', count: counts.passed },
                  { key: 'cancelled', label: 'Cancelled', count: counts.cancelled },
                  { key: 'inactive', label: 'Inactive', count: counts.inactive },
                ];
                const fmtLastLesson = (d: string | null) => {
                  if (!d) return 'No lessons yet';
                  const dt = new Date(d + 'T00:00:00');
                  const now = new Date();
                  const days = Math.floor((now.getTime() - dt.getTime()) / 86400000);
                  if (days <= 0) return 'Last lesson today';
                  if (days === 1) return 'Last lesson yesterday';
                  if (days < 7) return `Last lesson ${days} days ago`;
                  if (days < 30) return `Last lesson ${Math.floor(days / 7)}w ago`;
                  return `Last lesson ${dt.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`;
                };
                return (
                  <div style={{ background: '#FFFFFF', borderRadius: 16, overflow: 'hidden', border: '0.5px solid #F3F4F6', fontFamily: 'Poppins, Inter, sans-serif' }}>
                    <div style={{ padding: '14px 16px 8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ fontSize: 15, fontWeight: 500, color: '#0F2044' }}>Pupils</div>
                      <button
                        type="button"
                        onClick={() => navigate({ to: '/pupils' })}
                        style={{ fontSize: 13, fontWeight: 500, color: '#1877D6', background: 'transparent', border: 'none', padding: 0, cursor: 'pointer', fontFamily: 'Poppins, Inter, sans-serif' }}
                      >
                        View all →
                      </button>
                    </div>
                    {/* Tabs */}
                    <div style={{ display: 'flex', gap: 4, margin: '0 12px 8px', padding: 3, background: '#F1F5F9', borderRadius: 10 }}>
                      {tabs.map((t) => {
                        const active = tabKey === t.key;
                        return (
                          <button
                            key={t.key}
                            type="button"
                            onClick={() => setPupilsTab(t.key)}
                            style={{
                              flex: 1,
                              background: active ? '#FFFFFF' : 'transparent',
                              color: active ? '#0B1F3A' : '#6B7280',
                              borderRadius: 8,
                              padding: '7px 4px',
                              fontWeight: 500,
                              fontSize: 12,
                              border: 'none',
                              cursor: 'pointer',
                              boxShadow: active ? 'inset 0 0 0 0.5px rgba(15,32,68,0.10)' : 'none',
                              fontFamily: 'Poppins, Inter, sans-serif',
                              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                            }}
                          >
                            <span>{t.label}</span>
                            <span style={{ fontSize: 11, color: active ? '#6B7280' : '#9CA3AF', fontVariantNumeric: 'tabular-nums' }}>{t.count}</span>
                          </button>
                        );
                      })}
                    </div>
                    {filtered.length === 0 ? (
                      <div style={{ padding: '20px 16px', textAlign: 'center', color: '#9CA3AF', fontSize: 13 }}>
                        No {tabKey === 'current' ? 'current' : tabKey} pupils
                      </div>
                    ) : (
                      <div>
                        {filtered.map((p, idx) => {
                          const first = p.first_name || p.name.split(/\s+/)[0] || '?';
                          const initial = (first[0] || '?').toUpperCase();
                          const bg = p.calendar_colour || '#1A52A0';
                          return (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => navigate({ to: '/pupils/$id', params: { id: p.id } })}
                              style={{
                                width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                                padding: '12px 16px', background: 'none', border: 'none',
                                borderTop: idx === 0 ? '0.5px solid #F3F4F6' : '0.5px solid #F3F4F6',
                                cursor: 'pointer', textAlign: 'left',
                                fontFamily: 'Poppins, Inter, sans-serif',
                              }}
                            >
                              <div
                                style={{
                                  width: 36, height: 36, borderRadius: '50%',
                                  background: bg, color: '#FFFFFF',
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  fontSize: 13, fontWeight: 600, flexShrink: 0,
                                  backgroundImage: p.profile_image_url ? `url(${p.profile_image_url})` : undefined,
                                  backgroundSize: 'cover', backgroundPosition: 'center',
                                }}
                              >
                                {p.profile_image_url ? '' : initial}
                              </div>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: 14, fontWeight: 500, color: '#0F2044', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                                <div style={{ fontSize: 12, color: '#9CA3AF', marginTop: 2 }}>{fmtLastLesson(p.last_lesson_date)}</div>
                              </div>
                              <ChevronRight size={16} color="#9CA3AF" />
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })()}



              {/* 3. TODAY'S PUPILS */}
              {todayLessons.length > 0 && (
                <div style={{ background: '#FFFFFF', borderRadius: 16, overflow: 'hidden', border: '0.5px solid #F3F4F6', fontFamily: 'Inter, sans-serif' }}>
                  <div style={{ padding: '14px 16px', borderBottom: '0.5px solid #F3F4F6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#0F2044' }}>Teaching today</div>
                    <div style={{ fontSize: 12, color: '#9CA3AF' }}>{todayLessons.length} lesson{todayLessons.length === 1 ? '' : 's'}</div>
                  </div>
                  {todayLessons.length === 0 ? (
                    <div style={{ padding: 16, textAlign: 'center', color: '#9CA3AF', fontSize: 13 }}>No lessons today</div>
                  ) : (
                    todayLessons.map((l, idx) => {
                      const pid = l.pupil_id ?? '';
                      const name = l.pupils?.name || 'Pupil';
                      const initials = name.split(/\s+/).map((s: string) => s.charAt(0)).join('').slice(0, 2).toUpperCase();
                      const colour = (l.pupils as any)?.calendar_colour || '#1A52A0';
                      const owed = owedByPupil[pid] ?? 0;
                      return (
                        <button
                          key={l.id ?? idx}
                          type="button"
                          onClick={() => pid && navigate({ to: '/pupils/$id', params: { id: pid } })}
                          style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: 'none', border: 'none', borderTop: idx === 0 ? 'none' : '0.5px solid #F3F4F6', cursor: 'pointer', textAlign: 'left', fontFamily: 'Inter, sans-serif' }}
                        >
                          <div style={{ width: 40, height: 40, borderRadius: '50%', background: colour, color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, flexShrink: 0 }}>{initials}</div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 14, fontWeight: 600, color: '#0F2044' }}>{name}</div>
                            <div style={{ fontSize: 12, color: '#9CA3AF' }}>{String(l.lesson_time || '').slice(0, 5)} · {l.duration_minutes ?? 60} mins</div>
                          </div>
                          {owed > 0 ? (
                            <span style={{ background: '#FEF3C7', color: '#92400E', fontSize: 12, fontWeight: 700, padding: '4px 8px', borderRadius: 8 }}>£{owed.toFixed(0)}</span>
                          ) : (
                            <span style={{ background: '#E0FFF4', color: '#065F46', fontSize: 12, fontWeight: 700, padding: '4px 8px', borderRadius: 8 }}>Paid ✓</span>
                          )}
                          <ChevronRight size={14} color="#D1D5DB" />
                        </button>
                      );
                    })
                  )}
                </div>
              )}

              {/* 4. UPCOMING TESTS */}
              {testsSorted.length > 0 && (
                <div style={{ background: '#FFFFFF', borderRadius: 16, overflow: 'hidden', border: '0.5px solid #F3F4F6', fontFamily: 'Inter, sans-serif' }}>
                  <div style={{ padding: '14px 16px', borderBottom: '0.5px solid #F3F4F6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#0F2044' }}>Upcoming tests</div>
                    <span style={{ background: '#F5F3FF', color: '#7C3AED', fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 999 }}>{testsSorted.length}</span>
                  </div>
                  {testsSorted.slice(0, 5).map((t, idx) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => navigate({ to: '/pupils/$id', params: { id: t.id } })}
                      style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: 'none', border: 'none', borderTop: idx === 0 ? 'none' : '0.5px solid #F3F4F6', cursor: 'pointer', textAlign: 'left', fontFamily: 'Inter, sans-serif' }}
                    >
                      <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#F5F3FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Trophy size={16} color="#7C3AED" />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 600, color: '#0F2044' }}>{t.name}</div>
                        <div style={{ fontSize: 12, color: '#9CA3AF' }}>{fmtTestWhen(t.test_date, t.test_time)}</div>
                      </div>
                      <span style={{ background: 'rgba(124,58,237,0.10)', color: '#7C3AED', fontSize: 12, fontWeight: 700, padding: '4px 8px', borderRadius: 8 }}>{daysUntil(t.test_date)} days</span>
                      <ChevronRight size={14} color="#D1D5DB" />
                    </button>
                  ))}
                </div>
              )}

              {/* 5. OUTSTANDING BALANCES */}
              {outstanding > 0 && (
                <div style={{ background: '#FFFFFF', borderRadius: 16, overflow: 'hidden', border: '0.5px solid #F3F4F6', fontFamily: 'Inter, sans-serif' }}>
                  <div style={{ padding: '14px 16px', borderBottom: '0.5px solid #F3F4F6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#CC2229' }}>Outstanding payments</div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: '#CC2229' }}>£{outstanding.toFixed(0)}</div>
                  </div>
                  {shownOwed.map((p, idx) => {
                    const initials = p.name.split(/\s+/).map((s) => s.charAt(0)).join('').slice(0, 2).toUpperCase();
                    return (
                      <div key={p.pupilId} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderTop: idx === 0 ? 'none' : '0.5px solid #F3F4F6' }}>
                        <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#FEE2E2', color: '#DC2626', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>{initials}</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: '#0F2044' }}>{p.name}</div>
                          <div style={{ fontSize: 12, color: '#CC2229' }}>owes £{p.amount.toFixed(0)}</div>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (p.phone) window.location.href = `sms:${p.phone}?body=${encodeURIComponent(`Hi ${p.firstName}, just a reminder that £${p.amount.toFixed(0)} is outstanding on your lessons. Thanks!`)}`;
                            else toast.error('No phone number on file');
                          }}
                          style={{ background: '#FEF2F2', color: '#CC2229', fontSize: 12, fontWeight: 600, padding: '6px 12px', borderRadius: 8, border: 'none', cursor: 'pointer' }}
                        >
                          Chase →
                        </button>
                      </div>
                    );
                  })}
                  {outstandingBreakdown.length > 3 && (
                    <button
                      type="button"
                      onClick={() => navigate({ to: '/payments' as never })}
                      style={{ width: '100%', padding: '10px 16px', borderTop: '0.5px solid #F3F4F6', background: 'none', border: 'none', color: '#1877D6', fontSize: 12, fontWeight: 600, cursor: 'pointer', textAlign: 'center' }}
                    >
                      View all {outstandingBreakdown.length} →
                    </button>
                  )}
                </div>
              )}

              {/* 6. ALL PUPILS LINK */}
              <button
                type="button"
                onClick={() => navigate({ to: '/pupils' })}
                style={{ background: '#0F2044', color: '#FFFFFF', width: '100%', borderRadius: 12, padding: '12px 16px', fontSize: 14, fontWeight: 600, border: 'none', cursor: 'pointer', textAlign: 'center', fontFamily: 'Inter, sans-serif' }}
              >
                View all {activePupilsCount} pupils →
              </button>

              {/* 7. ADD PUPIL */}
              <button
                type="button"
                onClick={() => navigate({ to: '/pupils/new' as never })}
                style={{ background: 'transparent', color: '#0F2044', width: '100%', borderRadius: 12, padding: '12px 16px', fontSize: 14, fontWeight: 600, border: '0.5px solid #0F2044', cursor: 'pointer', textAlign: 'center', fontFamily: 'Inter, sans-serif' }}
              >
                + Add new pupil
              </button>
            </div>
          );
        })()}



        <div style={{ height: 'calc(64px + env(safe-area-inset-bottom, 0px) + 16px)' }} />
        </section>
<section
          data-workspace="money"
          data-ws-index={3}
          style={{
            flex:'0 0 100vw',
            width:'100vw',
            height:'100%',
            scrollSnapAlign:'start',
            overflowY:'auto',
            overflowX:'hidden',
            WebkitOverflowScrolling:'touch',
            touchAction:'pan-y',
            paddingBottom:'calc(64px + env(safe-area-inset-bottom, 0px) + 16px)',
            
          }}
        >

        {(() => {
          const pct = Math.min(100, Math.round((weekEarnings / (weeklyEarningsGoal || 1)) * 100));
          const recentPayments = [...earningsRows]
            .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
            .slice(0, 5);
          const fmtDate = (d: string) => {
            if (!d) return '';
            try {
              return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
            } catch { return d; }
          };
          const links: Array<{ icon: React.ReactNode; bg: string; label: string; to: string }> = [
            { icon: <BarChart3 size={16} color="#1A52A0" />, bg: '#EFF6FF', label: 'MTD', to: '/mtd' },
            { icon: <Calculator size={16} color="#16A34A" />, bg: '#DCFCE7', label: 'Tax report', to: '/tax-report' },
            { icon: <Receipt size={16} color="#CC2229" />, bg: '#FEE2E2', label: 'Expenses', to: '/expenses' },
            { icon: <CalendarIcon size={16} color="#7C3AED" />, bg: '#F5F3FF', label: 'Weekly report', to: '/weekly-report' },
            { icon: <Moon size={16} color="#D97706" />, bg: '#FEF3C7', label: 'End of day', to: '/end-of-day' },
            { icon: <FileText size={16} color="#6B7280" />, bg: '#F3F4F6', label: 'Invoices', to: '/invoices' },
          ];
          return (
            <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12, paddingBottom: 80, fontFamily: 'Inter, sans-serif' }}>
              {/* 1. EARNINGS HERO */}
              <div style={{ background: '#0F2044', borderRadius: 20, padding: 20, marginBottom: 4, position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', right: -20, top: -20, width: 120, height: 120, borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />
                <div style={{ position: 'relative' }}>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: 0.6, fontWeight: 600 }}>This week</div>
                  <div style={{ fontSize: 32, fontWeight: 900, color: '#FFFFFF', marginTop: 4, lineHeight: 1 }}>£{Math.round(weekEarnings)}</div>
                  <div style={{ marginTop: 12, height: 4, background: 'rgba(255,255,255,0.10)', borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: '#FFFFFF', borderRadius: 2 }} />
                  </div>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', marginTop: 4 }}>{pct}% of £{weeklyEarningsGoal} goal</div>
                </div>
                <div style={{ position: 'absolute', right: 20, top: 20, textAlign: 'right' }}>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: 0.6 }}>Today</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: '#FFFFFF', marginTop: 2 }}>£{Math.round(todayEarnings)}</div>
                </div>
              </div>

              {/* 2. OUTSTANDING */}
              {outstanding > 0 && (
                <div style={{ background: '#FFFFFF', border: '0.5px solid #E2E6ED', borderRadius: 16, overflow: 'hidden' }}>
                  <div style={{ padding: '14px 16px', borderBottom: '0.5px solid #F3F4F6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <AlertCircle size={16} color="#CC2229" />
                      <span style={{ fontSize: 14, fontWeight: 600, color: '#0F2044', marginLeft: 6 }}>Outstanding</span>
                    </div>
                    <div style={{ fontSize: 18, fontWeight: 900, color: '#CC2229' }}>£{Math.round(outstanding)}</div>
                  </div>
                  {outstandingBreakdown.map((p) => {
                    const initials = p.name.split(/\s+/).map((s) => s.charAt(0)).join('').slice(0, 2).toUpperCase();
                    return (
                      <div key={p.pupilId} style={{ padding: '12px 16px', borderTop: '0.5px solid #F3F4F6', display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#1A52A0', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>{initials}</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: '#0F2044' }}>{p.name}</div>
                          <div style={{ fontSize: 12, color: '#CC2229' }}>Owes £{p.amount.toFixed(0)}</div>
                        </div>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button
                            type="button"
                            onClick={() => {
                              if (p.phone) {
                                window.location.href = `sms:${p.phone}?body=${encodeURIComponent(`Hi ${p.firstName}, just a reminder you have an outstanding lesson payment of £${p.amount.toFixed(0)} due. Could you arrange payment when you get a chance? Thanks!`)}`;
                              } else {
                                toast.error('No phone number on file');
                              }
                            }}
                            style={{ background: '#FEF3C7', color: '#92400E', fontSize: 10, fontWeight: 700, padding: '6px 10px', borderRadius: 8, border: 'none', cursor: 'pointer' }}
                          >
                            💬 Chase
                          </button>
                          <button
                            type="button"
                            onClick={() => navigate({ to: '/payments' as never })}
                            style={{ background: '#0F2044', color: '#FFFFFF', fontSize: 10, fontWeight: 700, padding: '6px 10px', borderRadius: 8, border: 'none', cursor: 'pointer' }}
                          >
                            💳 Pay
                          </button>
                        </div>
                      </div>
                    );
                  })}
                  <div style={{ padding: '12px 16px', borderTop: '0.5px solid #F3F4F6', background: '#FEF2F2', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: 12, color: '#CC2229', fontWeight: 600 }}>{outstandingBreakdown.length} pupils · Total £{Math.round(outstanding)}</div>
                    <button type="button" onClick={() => navigate({ to: '/payments' as never })} style={{ background: 'none', border: 'none', fontSize: 12, color: '#1A52A0', fontWeight: 600, cursor: 'pointer' }}>Record payment →</button>
                  </div>
                </div>
              )}

              {/* 3. RECENT PAYMENTS */}
              <div style={{ background: '#FFFFFF', border: '0.5px solid #E2E6ED', borderRadius: 16, overflow: 'hidden' }}>
                <div style={{ padding: '14px 16px', borderBottom: '0.5px solid #F3F4F6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#0F2044' }}>Recent payments</div>
                  <button type="button" onClick={() => navigate({ to: '/payments' as never })} style={{ background: 'none', border: 'none', fontSize: 12, color: '#1A52A0', fontWeight: 600, cursor: 'pointer' }}>View all →</button>
                </div>
                {recentPayments.length === 0 ? (
                  <div style={{ padding: 16, textAlign: 'center', color: '#9CA3AF', fontSize: 13 }}>No payments recorded yet</div>
                ) : (
                  recentPayments.map((r, idx) => (
                    <div key={r.id} style={{ padding: '12px 16px', borderTop: idx === 0 ? 'none' : '0.5px solid #F3F4F6', display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#DCFCE7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <PoundSterling size={16} color="#16A34A" />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#0F2044' }}>{r.pupilName || 'Payment received'}</div>
                        <div style={{ fontSize: 12, color: '#9CA3AF' }}>{fmtDate(r.date)}{r.method ? ` · ${r.method}` : ''}</div>
                      </div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: '#16A34A' }}>£{r.amount.toFixed(0)}</div>
                    </div>
                  ))
                )}
              </div>

              {/* 4. SEND REMINDERS */}
              {outstanding > 0 && outstandingBreakdown.length > 0 && (
                <div style={{ background: '#FFFFFF', border: '0.5px solid #E2E6ED', borderRadius: 16, padding: 16 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#0F2044', marginBottom: 4 }}>Send payment reminders</div>
                  <div style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 12 }}>Remind all pupils with outstanding balances</div>
                  <button
                    type="button"
                    onClick={() => {
                      const first = outstandingBreakdown.find((p) => p.phone);
                      if (!first) { toast.error('No phone numbers on file'); return; }
                      const msg = encodeURIComponent('Hi, just a reminder you have an outstanding driving lesson payment. Could you arrange payment when convenient? Thanks!');
                      window.location.href = `sms:${first.phone}?body=${msg}`;
                    }}
                    style={{ width: '100%', background: '#0F2044', color: '#FFFFFF', padding: '12px 16px', borderRadius: 12, border: 'none', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
                  >
                    📱 Send to all ({outstandingBreakdown.length})
                  </button>
                </div>
              )}

              {/* 5. FINANCIAL QUICK LINKS */}
              <div style={{ background: '#FFFFFF', border: '0.5px solid #E2E6ED', borderRadius: 16, overflow: 'hidden' }}>
                <div style={{ padding: '14px 16px', borderBottom: '0.5px solid #F3F4F6', fontSize: 14, fontWeight: 600, color: '#0F2044' }}>Finance</div>
                {links.map((l, idx) => (
                  <button
                    key={l.label}
                    type="button"
                    onClick={() => navigate({ to: l.to as never })}
                    style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderTop: idx === 0 ? 'none' : '0.5px solid #F3F4F6', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', fontFamily: 'Inter, sans-serif' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 32, height: 32, borderRadius: '50%', background: l.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{l.icon}</div>
                      <span style={{ fontSize: 13, fontWeight: 500, color: '#0F2044' }}>{l.label}</span>
                    </div>
                    <ChevronRight size={16} color="#D1D5DB" />
                  </button>
                ))}
              </div>
            </div>
          );
        })()}


        <div style={{ height: 'calc(64px + env(safe-area-inset-bottom, 0px) + 16px)' }} />
        </section>
<section
          data-workspace="marketplace"
          data-ws-index={4}
          style={{
            flex:'0 0 100vw',
            width:'100vw',
            height:'100%',
            scrollSnapAlign:'start',
            overflowY:'auto',
            overflowX:'hidden',
            WebkitOverflowScrolling:'touch',
            touchAction:'pan-y',
            paddingBottom:'calc(64px + env(safe-area-inset-bottom, 0px) + 16px)',
            
          }}
        >
        <MarketplaceSection navigate={navigate} />
        <div style={{ height: 'calc(64px + env(safe-area-inset-bottom, 0px) + 16px)' }} />
        </section>
<section
          data-workspace="dsm"
          data-ws-index={5}
          style={{
            flex:'0 0 100vw',
            width:'100vw',
            height:'100%',
            scrollSnapAlign:'start',
            overflowY:'auto',
            overflowX:'hidden',
            WebkitOverflowScrolling:'touch',
            touchAction:'pan-y',
            paddingBottom:'calc(64px + env(safe-area-inset-bottom, 0px) + 16px)',
            
          }}
        >
        <DsmLiveSection navigate={navigate} />
        <div style={{ height: 'calc(64px + env(safe-area-inset-bottom, 0px) + 16px)' }} />
        </section>
<section
          data-workspace="community"
          data-ws-index={6}
          style={{
            flex:'0 0 100vw',
            width:'100vw',
            height:'100%',
            scrollSnapAlign:'start',
            overflowY:'auto',
            overflowX:'hidden',
            WebkitOverflowScrolling:'touch',
            touchAction:'pan-y',
            paddingBottom:'calc(64px + env(safe-area-inset-bottom, 0px) + 16px)',
          }}
        >
          <div style={{ padding:16, display:'flex', flexDirection:'column', gap:12, paddingBottom:80 }}>
            {/* 1. HERO */}
            <div style={{ background:'linear-gradient(135deg, #0F2044, #1A52A0)', borderRadius:20, padding:20, marginBottom:4 }}>
              <Users color="#fff" size={28} style={{ marginBottom:8 }} />
              <div style={{ color:'#fff', fontWeight:900, fontSize:20 }}>DSM Community</div>
              <div style={{ color:'rgba(255,255,255,0.7)', fontSize:14, marginTop:4 }}>Connect with ADIs across the UK</div>
              <div style={{ color:'rgba(255,255,255,0.5)', fontSize:12, marginTop:6, lineHeight:1.5 }}>
                Forum for driving instructors — share tips, get advice, discuss standards checks.
              </div>
              <div style={{ marginTop:12 }}>
                <span style={{ background:'#D97706', color:'#fff', fontSize:12, fontWeight:700, padding:'4px 12px', borderRadius:999 }}>
                  Coming soon
                </span>
              </div>
              <input
                type="email"
                value={communityEmail}
                onChange={(e) => setCommunityEmail(e.target.value)}
                placeholder="Enter your email"
                className="community-hero-email"
                style={{
                  width:'100%', boxSizing:'border-box',
                  background:'rgba(255,255,255,0.1)',
                  border:'1px solid rgba(255,255,255,0.2)',
                  color:'#fff', padding:'10px 14px', borderRadius:10,
                  marginTop:12, fontSize:14, outline:'none',
                }}
              />
              <style>{`.community-hero-email::placeholder{color:rgba(255,255,255,0.4);}`}</style>
              <button
                type="button"
                onClick={() => {
                  toast("You're on the list! We'll notify you when DSM Community launches.");
                  setCommunityEmail('');
                }}
                style={{
                  background:'#fff', color:'#0F2044', fontWeight:600,
                  width:'100%', borderRadius:12, padding:'10px 0',
                  fontSize:14, marginTop:8, border:0, cursor:'pointer',
                }}
              >
                Notify me when it launches →
              </button>
            </div>

            {/* 2. PLACEHOLDER TOPICS */}
            <div style={{ background:'#fff', border:'0.5px solid #E2E6ED', borderRadius:16, overflow:'hidden' }}>
              <div style={{ padding:'14px 16px', borderBottom:'0.5px solid #F3F4F6', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <div style={{ fontWeight:600, fontSize:14, color:'#0F2044' }}>Hot topics</div>
                <span style={{ background:'#F3F4F6', color:'#6B7280', fontSize:12, padding:'2px 8px', borderRadius:999 }}>Preview</span>
              </div>
              {[
                { title:'Standards check — Grade 6 tips?', meta:'23 replies · ADI Training', hot:true },
                { title:'Best dashcam for instructor cars 2026?', meta:'18 replies · Equipment', hot:false },
                { title:'How do you handle nervous pupils?', meta:'31 replies · Teaching', hot:false },
              ].map((t, i) => (
                <div key={i} style={{ padding:'12px 16px', borderTop: i === 0 ? '0' : '0.5px solid #F3F4F6', display:'flex', justifyContent:'space-between', alignItems:'center', gap:10 }}>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontWeight:600, fontSize:13, color:'#0F2044' }}>{t.title}</div>
                    <div style={{ fontSize:12, color:'#9CA3AF', marginTop:2 }}>{t.meta}</div>
                  </div>
                  {t.hot && (
                    <span style={{ background:'#FEF2F2', color:'#CC2229', fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:999, flexShrink:0 }}>
                      🔥 Hot
                    </span>
                  )}
                </div>
              ))}
              <div style={{ padding:'12px 16px', borderTop:'0.5px solid #F3F4F6', textAlign:'center' }}>
                <span style={{ fontSize:12, color:'#1A52A0', fontWeight:600 }}>Join the waitlist to access the community →</span>
              </div>
            </div>

            {/* 3. CPD & DEVELOPMENT */}
            <div style={{ background:'#fff', border:'0.5px solid #E2E6ED', borderRadius:16, overflow:'hidden' }}>
              <div style={{ padding:'14px 16px', borderBottom:'0.5px solid #F3F4F6', fontWeight:600, fontSize:14, color:'#0F2044' }}>
                CPD & development
              </div>
              {[
                { Icon: GraduationCap, color:'#16A34A', label:'CPD log', to:'/cpd' },
                { Icon: ClipboardCheck, color:'#1A52A0', label:'Standards check tracker', to:'/standards' },
                { Icon: Award, color:'#D97706', label:'Certifications', to:'/certifications' },
                { Icon: BookOpen, color:'#7C3AED', label:'Training resources', to:'/resources' },
              ].map((r, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => navigate({ to: r.to as never })}
                  style={{
                    width:'100%', background:'#fff', border:0,
                    padding:'12px 16px', borderTop: i === 0 ? '0' : '0.5px solid #F3F4F6',
                    display:'flex', justifyContent:'space-between', alignItems:'center',
                    cursor:'pointer', textAlign:'left',
                  }}
                >
                  <span style={{ display:'flex', alignItems:'center', gap:12 }}>
                    <r.Icon size={18} color={r.color} />
                    <span style={{ fontSize:13, fontWeight:500, color:'#0F2044' }}>{r.label}</span>
                  </span>
                  <ChevronRight size={16} color="#D1D5DB" />
                </button>
              ))}
            </div>

            {/* 4. STANDARDS CHECK CARD */}
            <div style={{ background:'#F0F4FF', border:'0.5px solid #BFDBFE', borderRadius:16, padding:16 }}>
              <ClipboardCheck size={20} color="#1A52A0" style={{ marginBottom:6 }} />
              <div style={{ fontWeight:600, fontSize:14, color:'#0F2044' }}>Standards check prep</div>
              <div style={{ fontSize:12, color:'#6B7280', marginTop:4, lineHeight:1.5 }}>
                Access guides, mock check resources and expert tips to nail your next standards check.
              </div>
              <button
                type="button"
                onClick={() => navigate({ to: '/standards' as never })}
                style={{
                  background:'#1A52A0', color:'#fff', fontSize:14, fontWeight:600,
                  width:'100%', borderRadius:12, padding:'10px 0',
                  border:0, cursor:'pointer', marginTop:12,
                }}
              >
                View resources →
              </button>
            </div>
          </div>
        </section>
<section
          data-workspace="tools"
          data-ws-index={7}
          style={{
            flex:'0 0 100vw',
            width:'100vw',
            height:'100%',
            scrollSnapAlign:'start',
            overflowY:'auto',
            overflowX:'hidden',
            WebkitOverflowScrolling:'touch',
            touchAction:'pan-y',
            paddingBottom:'calc(64px + env(safe-area-inset-bottom, 0px) + 16px)',
            
          }}
        >

        <div style={{ padding:'4px 16px 8px' }}>
          <div style={{ fontSize:22, fontWeight:900, color:'#0B1F3A', letterSpacing:-0.5, fontFamily:'Inter, sans-serif' }}>Tools</div>
          <div style={{ fontSize:13, color:'rgba(11,31,58,0.60)', marginTop:2 }}>Everything, in one place</div>
        </div>
      {/* SEARCH */}
      <div className="mx-4 mt-2">
        <div className="flex items-center gap-2 rounded-xl bg-white" style={{ border: '0.5px solid #EEF2F7', padding: '8px 12px' }}>
          <Search size={16} color="#6B7280" />
          <input
            type="text"
            placeholder="Search tools…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 text-[13px] text-[#0B1F3A] outline-none bg-transparent"
            style={{ fontFamily: "Inter, sans-serif" }}
          />
          {searchQuery && (
            <button type="button" onClick={() => setSearchQuery("")} className="text-[12px] text-[#6B7280]">Clear</button>
          )}
        </div>
      </div>

      {/* TOOL GROUPS */}
      {(() => {
        const groups: Array<{ title: string; tiles: Array<{ icon: React.ReactNode; label: string; route: string }> }> = [
          { title: 'Teaching', tiles: [
            { icon: <ClipboardCheck size={20} color="#FFFFFF" />, label: 'EOL wizard', route: '/lessons' },
            { icon: <BookOpen size={20} color="#FFFFFF" />, label: 'Syllabus', route: '/standards' },
            { icon: <GraduationCap size={20} color="#FFFFFF" />, label: 'Test day', route: '/testday' },
            { icon: <ClipboardList size={20} color="#FFFFFF" />, label: 'Mock tests', route: '/mock-tests' },
            { icon: <FileText size={20} color="#FFFFFF" />, label: 'Reflective logs', route: '/reflective-log' },
            { icon: <FileSignature size={20} color="#FFFFFF" />, label: 'Lesson notes', route: '/lesson-notes' },
            { icon: <Clock size={20} color="#FFFFFF" />, label: 'Running late', route: '/running-late' },
            { icon: <CalendarIcon size={20} color="#FFFFFF" />, label: 'Lesson plan', route: '/lesson-plan' },
          ]},
          { title: 'Business', tiles: [
            { icon: <BookOpen size={20} color="#FFFFFF" />, label: 'CPD log', route: '/cpd' },
            { icon: <Award size={20} color="#FFFFFF" />, label: 'Certifications', route: '/certifications' },
            { icon: <FolderOpen size={20} color="#FFFFFF" />, label: 'Document vault', route: '/documents' },
            { icon: <Receipt size={20} color="#FFFFFF" />, label: 'Expenses', route: '/expenses' },
            { icon: <Car size={20} color="#FFFFFF" />, label: 'Mileage', route: '/mileage' },
            { icon: <Car size={20} color="#FFFFFF" />, label: 'Vehicle', route: '/vehicle' },
            { icon: <FileSpreadsheet size={20} color="#FFFFFF" />, label: 'Invoices', route: '/invoices' },
            { icon: <CalendarCheck size={20} color="#FFFFFF" />, label: 'Month end', route: '/monthend' },
          ]},
          { title: 'Admin', tiles: [
            { icon: <SettingsIcon size={20} color="#FFFFFF" />, label: 'Settings', route: '/settings' },
            { icon: <HelpCircle size={20} color="#FFFFFF" />, label: 'Intake questions', route: '/intake-questions' },
            { icon: <CalendarOff size={20} color="#FFFFFF" />, label: 'No-show policy', route: '/no-show-policy' },
            { icon: <MapPin size={20} color="#FFFFFF" />, label: 'Postcode rates', route: '/postcode-rates' },
            { icon: <Gift size={20} color="#FFFFFF" />, label: 'Discount codes', route: '/discount-codes' },
            { icon: <Zap size={20} color="#FFFFFF" />, label: 'Automations', route: '/automations' },
            { icon: <FileText size={20} color="#FFFFFF" />, label: 'T&Cs', route: '/terms' },
          ]},
          { title: 'Reports', tiles: [
            { icon: <BarChart3 size={20} color="#FFFFFF" />, label: 'MTD', route: '/month-to-date' },
            { icon: <Calculator size={20} color="#FFFFFF" />, label: 'Tax report', route: '/tax-report' },
            { icon: <BarChart2 size={20} color="#FFFFFF" />, label: 'Weekly report', route: '/weekly-report' },
            { icon: <CalendarDays size={20} color="#FFFFFF" />, label: 'End of day', route: '/end-of-day' },
            { icon: <FileText size={20} color="#FFFFFF" />, label: 'Annual report', route: '/reports' },
            { icon: <TrendingUp size={20} color="#FFFFFF" />, label: 'Earnings forecast', route: '/earnings-forecast' },
            { icon: <Activity size={20} color="#FFFFFF" />, label: 'Business health', route: '/business-health' },
          ]},
        ];
        const q = searchQuery.trim().toLowerCase();
        const filtered = groups
          .map((g) => ({ ...g, tiles: q ? g.tiles.filter((t) => t.label.toLowerCase().includes(q)) : g.tiles }))
          .filter((g) => g.tiles.length > 0);
        if (filtered.length === 0) {
          return (
            <div className="mx-4 mt-6 text-center text-[13px] text-[#6B7280]">
              No tools match “{searchQuery}”
            </div>
          );
        }
        return filtered.map((g) => (
          <div key={g.title} className="mx-4 mt-5">
            <div
              className="text-[11px] uppercase mb-2"
              style={{ color: '#6B7280', letterSpacing: 0.8, fontFamily: 'Inter, sans-serif', fontWeight: 700 }}
            >
              {g.title}
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: 8,
              }}
            >
              {g.tiles.map((t) => (
                <AccessTile
                  key={`${g.title}-${t.route}-${t.label}`}
                  icon={t.icon}
                  route={t.route}
                  label={t.label}
                  onClick={() => navigate({ to: t.route as never })}
                />
              ))}
            </div>
          </div>
        ));
      })()}
      <style>{`
        @keyframes skeleton-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        .skeleton-pulse {
          animation: skeleton-pulse 1.5s ease-in-out infinite;
        }
      `}</style>


        <div style={{ height: 'calc(64px + env(safe-area-inset-bottom, 0px) + 16px)' }} />
        </section>
      </div>





      {unreadMsgs.length > 0 && (
        <div style={{ padding: "0 16px", marginTop: 16, fontFamily: "Inter, sans-serif" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <MessageSquare size={18} color="#0F2044" />
              <div style={{ fontSize: 16, fontWeight: 700, color: "#0F2044" }}>Messages</div>
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
                  borderRadius: 12,
                  padding: "12px 14px",
                  marginBottom: 8,
                  display: "flex",
                  alignItems: "center",
                  cursor: "pointer",
                }}
              >
                <div style={{
                  width: 36, height: 36, borderRadius: "50%",
                  background: "#1A52A0",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: "#FFFFFF", fontSize: 13, fontWeight: 700, flexShrink: 0,
                  backgroundImage: m.pupils?.profile_image_url ? `url(${m.pupils.profile_image_url})` : undefined,
                  backgroundSize: "cover", backgroundPosition: "center",
                }}>
                  {!m.pupils?.profile_image_url && initials}
                </div>
                <div style={{ paddingLeft: 10, flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#0F2044" }}>{displayName}</div>
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
            // Fix 2: reverse lesson to unpaid, restore amount_due,
            // reverse account_balance if applicable, and soft-delete the
            // corresponding payments + lesson_history rows.
            const { data: lessonRow, error: lessonFetchErr } = await supabase
              .from("lessons")
              .select("id, pupil_id, payment_status, amount_due, paid_amount")
              .eq("id", row.id)
              .maybeSingle();
            if (lessonFetchErr) {
              console.error("[home] earnings delete: lesson fetch failed", lessonFetchErr);
              toast.error("Couldn't delete payment");
              return;
            }

            const restoreAmount = Number(row.amount) || 0;
            const wasPrepaid = lessonRow?.payment_status === "prepaid";

            const { error: lErr } = await supabase
              .from("lessons")
              .update({
                payment_status: "unpaid",
                amount_due: restoreAmount,
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

            // Reverse account_balance credit if the lesson was prepaid from credit
            if (wasPrepaid && lessonRow?.pupil_id) {
              const { data: pRow } = await supabase
                .from("pupils")
                .select("account_balance")
                .eq("id", lessonRow.pupil_id)
                .maybeSingle();
              const current = Number((pRow as { account_balance?: number | null } | null)?.account_balance ?? 0);
              await supabase
                .from("pupils")
                .update({ account_balance: current + restoreAmount })
                .eq("id", lessonRow.pupil_id);
            }

            // Soft-delete legacy payments row(s) for this lesson
            const { error: payErr } = await supabase
              .from("payments")
              .update({ deleted_at: nowIso })
              .eq("lesson_id", row.id)
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
          navigate({ to: "/lessons/$id", params: { id } });
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


      {/* HOME BOTTOM NAV — controls the workspace carousel */}
      {(() => {
        const navItems: BottomNavItem[] = [
          { key: 'today', label: 'Today', Icon: HomeIcon, onClick: () => scrollToWs(0) },
          { key: 'schedule', label: 'Schedule', Icon: ScheduleIcon, onClick: () => scrollToWs(1) },
          { key: 'pupils', label: 'Pupils', Icon: PupilsIcon, onClick: () => scrollToWs(2) },
          { key: 'messages', label: 'Messages', Icon: MessagesIcon, onClick: () => navigate({ to: '/messages' as never }) },
          { key: 'more', label: 'More', Icon: LayoutGrid, onClick: () => scrollToWs(7) },
        ];
        const activeIndex = activeWs === 0 ? 0 : activeWs === 1 ? 1 : activeWs === 2 ? 2 : activeWs === 7 ? 4 : -1;
        return (
          <BottomNav
            items={navItems}
            activeIndex={activeIndex}
            activeColor="#0F2044"
            inactiveColor="#9CA3AF"
          />
        );
      })()}
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
  onEol,
}: {
  lesson: LessonRow;
  prev: PrevLessonRow | null;
  goingActive: boolean;
  setGoingActive: (v: boolean) => void;
  onOpenLate: () => void;
  navigateTo: (to: string) => void;
  onEol: () => void;
}) {
  const phone = lesson.pupils?.phone ?? null;
  const firstName = (lesson.pupils?.name ?? "there").split(/\s+/)[0];
  const balance = Number(lesson.amount_due ?? 0);
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
    fontFamily: 'Inter, sans-serif',
    fontWeight: 600,
    fontSize: 12,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    cursor: 'pointer',
    color: '#0B1F3A',
  };
  const sectionLabel: React.CSSProperties = {
    fontSize: 10,
    textTransform: 'uppercase',
    color: '#999',
    letterSpacing: 0.6,
    fontWeight: 700,
    fontFamily: 'Inter, sans-serif',
    marginBottom: 6,
  };

  return (
    <div style={{ background: '#F3F8FF', borderRadius: '0 0 16px 16px', padding: 12 }}>
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
            borderColor: goingActive ? '#1877D6' : '#e3e6ec',
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
          onClick={(e) => {
            e.stopPropagation();
            onEol();
          }}
          style={{
            flex: 1,
            background: '#CC2229',
            border: 'none',
            borderRadius: 10,
            padding: '8px 16px',
            color: 'white',
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 4,
            fontFamily: 'Inter, sans-serif',
          }}
        >
          <CheckCircle2 size={14} color="#ffffff" /> EOL
        </button>
        <button
          style={{
            flex: 1,
            height: 36,
            borderRadius: 10,
            border: 'none',
            background: '#1877D6',
            color: '#fff',
            fontFamily: 'Inter, sans-serif',
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'Inter, sans-serif', fontSize: 13 }}>
          <MapPin size={14} color="#6B7280" />
          {pickupPostcode ? (
            <>
              <span style={{ color: '#0B1F3A', fontWeight: 600 }}>{pickupPostcode}</span>
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(pickupPostcode)}`}
                target="_blank"
                rel="noreferrer"
                style={{ color: '#1877D6', fontWeight: 600, marginLeft: 'auto' }}
              >Navigate</a>
              <button
                onClick={() => { navigator.clipboard?.writeText(pickupPostcode); toast("Copied"); }}
                style={{ background: 'none', border: 'none', color: '#1877D6', fontWeight: 600, fontFamily: 'Inter, sans-serif', fontSize: 13, cursor: 'pointer' }}
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
          <div style={{ background: '#fbe8e8', border: '1px solid #f5c5c5', borderRadius: 10, padding: 10, display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'Inter, sans-serif' }}>
            <span style={{ flex: 1, fontSize: 13, fontWeight: 700, color: '#991B1B' }}>£{balance.toFixed(2)} outstanding</span>
            <button
              onClick={() => sendSms(`Hi ${firstName}, just a quick reminder that £${balance.toFixed(2)} is outstanding on your lesson account. Thanks!`)}
              style={{ height: 28, padding: '0 10px', borderRadius: 8, border: '1px solid #f5c5c5', background: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}
            >Chase</button>
            <button
              onClick={() => navigateTo('/payments')}
              style={{ height: 28, padding: '0 10px', borderRadius: 8, border: 'none', background: '#991B1B', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}
            >Mark paid</button>
          </div>
        ) : (
          <div style={{ color: '#1877D6', fontWeight: 700, fontFamily: 'Inter, sans-serif', fontSize: 13 }}>Paid up ✓</div>
        )}
      </div>

      {/* Last lesson */}
      <div style={{ marginTop: 12 }}>
        <div style={sectionLabel}>LAST LESSON</div>
        {prev ? (
          <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, color: '#0B1F3A' }}>
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
          <div style={{ color: '#6B7280', fontFamily: 'Inter, sans-serif', fontSize: 13 }}>No previous lesson</div>
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
        fontFamily: "Poppins, Inter, sans-serif",
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


