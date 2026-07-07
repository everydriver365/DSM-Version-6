import { createFileRoute, useNavigate } from "@tanstack/react-router";
import type React from "react";
import { Fragment, useEffect, useMemo, useRef, useState, isValidElement, cloneElement } from "react";
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
} from "lucide-react";
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

  const [listings, setListings] = useState<ListingTile[] | null>(null);
  const [legacyTiles, setLegacyTiles] = useState<MarketplaceTile[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const SUPABASE_URL = "https://bjpqxfrihwjcqprmoqfs.supabase.co";
      const SUPABASE_ANON_KEY =
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJqcHF4ZnJpaHdqY3Fwcm1vcWZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE0NzQ4MjEsImV4cCI6MjA5NzA1MDgyMX0.HKlgx3dxP3uxX9wMRRUnfb0IPwaBpFcut_iUgT5XFeo";
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
      const { data } = await supabase
        .from("marketplace_tiles")
        .select("*")
        .eq("is_active", true)
        .order("display_order", { ascending: true });
      if (!cancelled && data) setLegacyTiles(data as MarketplaceTile[]);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const updateScrollState = () => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 0);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
  };

  const scrollBy = (direction: number) => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: direction * 170, behavior: "smooth" });
  };

  useEffect(() => {
    updateScrollState();
  }, [listings, legacyTiles]);

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

  const CATEGORY_GRADIENTS: Record<string, string> = {
    "ADI Training": "linear-gradient(135deg, #1A52A0, #0F2044)",
    "Vehicles": "linear-gradient(135deg, #0891B2, #164E63)",
    "Equipment": "linear-gradient(135deg, #6B7280, #374151)",
    "Technology": "linear-gradient(135deg, #7C3AED, #4C1D95)",
    "Insurance": "linear-gradient(135deg, #16A34A, #14532D)",
    "Business Services": "linear-gradient(135deg, #D97706, #92400E)",
    "For Sale": "linear-gradient(135deg, #CC2229, #7A1419)",
  };
  const DEFAULT_GRADIENT = "linear-gradient(135deg, #0F2044, #1A52A0)";
  const gradientFor = (categoryName: string | undefined): string =>
    (categoryName && CATEGORY_GRADIENTS[categoryName]) || DEFAULT_GRADIENT;

  const openListing = (listingId: string) => {
    navigate({
      to: "/marketplace/$listingId" as never,
      params: { listingId } as never,
    });
  };

  const handleLegacyNav = (url: string) => {
    if (!url) return;
    if (url.startsWith("http://") || url.startsWith("https://")) {
      window.open(url, "_blank", "noopener,noreferrer");
    } else {
      navigate({ to: url as never });
    }
  };

  const showListings = (listings?.length ?? 0) > 0;
  const showLegacy = !showListings && legacyTiles.length > 0;
  // While listings are still loading (null) and there are no legacy tiles yet, render nothing.
  if (!showListings && !showLegacy) return null;

  return (
    <div className="mt-2">
      <div className="mx-4 flex items-end justify-between mb-4">
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#CC2229", display: "inline-block" }} />
            <span
              className="text-[11px] uppercase"
              style={{ color: "#6B7280", letterSpacing: 0.8, fontFamily: "Inter, sans-serif", fontWeight: 600 }}
            >
              Marketplace
            </span>
          </div>
          <p
            className="font-semibold uppercase"
            style={{
              fontSize: 10,
              color: "#9CA3AF",
              letterSpacing: 1,
              fontFamily: "Inter, sans-serif",
              marginTop: 3,
              marginLeft: 14,
            }}
          >
            Curated for you
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <button
            type="button"
            onClick={() => navigate({ to: "/marketplace" as never })}
            className="font-bold"
            style={{
              fontSize: 13,
              color: "#1877D6",
              fontFamily: "Inter, sans-serif",
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 0,
            }}
          >
            Get Listed
          </button>
          <button
            type="button"
            onClick={() => navigate({ to: "/marketplace" as never })}
            className="font-bold"
            style={{
              fontSize: 13,
              color: "#1877D6",
              fontFamily: "Inter, sans-serif",
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 0,
            }}
          >
            See all →
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <button
              type="button"
              onClick={() => scrollBy(-1)}
              disabled={!canScrollLeft}
              aria-label="Scroll left"
              style={{
                width: 24,
                height: 24,
                borderRadius: 12,
                background: "#FFFFFF",
                border: "1px solid #E2E6ED",
                boxShadow: "0 1px 3px rgba(11,31,58,0.06)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: canScrollLeft ? "pointer" : "default",
                opacity: canScrollLeft ? 1 : 0.45,
                padding: 0,
              }}
            >
              <ChevronLeft size={16} color="#0F2044" />
            </button>
            <button
              type="button"
              onClick={() => scrollBy(1)}
              disabled={!canScrollRight}
              aria-label="Scroll right"
              style={{
                width: 24,
                height: 24,
                borderRadius: 12,
                background: "#FFFFFF",
                border: "1px solid #E2E6ED",
                boxShadow: "0 1px 3px rgba(11,31,58,0.06)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: canScrollRight ? "pointer" : "default",
                opacity: canScrollRight ? 1 : 0.45,
                padding: 0,
              }}
            >
              <ChevronRight size={16} color="#0F2044" />
            </button>
          </div>
        </div>
      </div>
        <div
          ref={scrollRef}
          onScroll={updateScrollState}
          style={{
            display: "flex",
            flexDirection: "row",
            gap: 10,
            overflowX: "auto",
            marginLeft: 16,
            marginRight: 16,
            paddingBottom: 8,
            scrollSnapType: "x mandatory",
            scrollbarWidth: "none",
            WebkitOverflowScrolling: "touch",
          }}
        >
        {showListings && listings!.map((tile) => {
              const img = firstImageUrl(tile.image_urls);
              const gradient = gradientFor(tile.marketplace_categories?.name);
              const hero = img
                ? `linear-gradient(180deg, transparent 30%, rgba(0,0,0,0.7) 100%), url(${img}) center/cover no-repeat`
                : gradient;
              const showFeatured = !!tile.is_featured;
              return (
                <div
                  key={tile.id}
                  onClick={() => openListing(tile.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      openListing(tile.id);
                    }
                  }}
                  style={{
                    width: 160,
                    height: 120,
                    flexShrink: 0,
                    scrollSnapAlign: "start",
                    borderRadius: 12,
                    overflow: "hidden",
                    position: "relative",
                    cursor: "pointer",
                    userSelect: "none",
                    background: hero,
                    border: "1px solid #EEF2F7",
                    boxShadow: "0 4px 14px rgba(11,31,58,0.08)",
                  }}
                >
                  {showFeatured && (
                    <span
                      style={{
                        position: "absolute",
                        top: 8,
                        left: 8,
                        fontSize: 9,
                        letterSpacing: 0.6,
                        color: "#D97706",
                        backgroundColor: "#FFFFFF",
                        fontFamily: "Inter, sans-serif",
                        padding: "2px 8px",
                        borderRadius: 999,
                        textTransform: "uppercase",
                        fontWeight: 700,
                        boxShadow: "0 2px 6px rgba(11,31,58,0.18)",
                      }}
                    >
                      Featured
                    </span>
                  )}
                  <div
                    style={{
                      position: "absolute",
                      left: 0,
                      right: 0,
                      bottom: 0,
                      padding: "8px 10px",
                      display: "flex",
                      flexDirection: "column",
                    }}
                  >
                    <span
                      style={{
                        fontSize: 12,
                        color: "#FFFFFF",
                        lineHeight: 1.3,
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                        fontWeight: 700,
                        fontFamily: "Inter, sans-serif",
                        letterSpacing: -0.1,
                      }}
                    >
                      {tile.title}
                    </span>
                    {tile.price_display && (
                      <span
                        style={{
                          fontSize: 10,
                          color: "rgba(255,255,255,0.7)",
                          marginTop: 2,
                          fontFamily: "Inter, sans-serif",
                          fontWeight: 500,
                        }}
                      >
                        {tile.price_display}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}

        {showLegacy && legacyTiles.map((tile) => {
          const accentColor = tile.color || "#4DA3FF";
          const hero = tile.image_url
            ? `linear-gradient(180deg, transparent 30%, rgba(0,0,0,0.7) 100%), url(${tile.image_url}) center/cover no-repeat`
            : tile.gradient || `linear-gradient(135deg, ${accentColor}, #0B1F3A)`;
          const badgeLabel = tile.badge?.trim();
          const badgeIsNew = badgeLabel?.toUpperCase() === "NEW";
          return (
            <div
              key={tile.id}
              onClick={() => handleLegacyNav(tile.link_url)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  handleLegacyNav(tile.link_url);
                }
              }}
              style={{
                width: 160,
                height: 120,
                flexShrink: 0,
                scrollSnapAlign: "start",
                borderRadius: 12,
                overflow: "hidden",
                position: "relative",
                cursor: "pointer",
                userSelect: "none",
                background: hero,
                border: "1px solid #EEF2F7",
                boxShadow: "0 4px 14px rgba(11,31,58,0.08)",
              }}
            >
              {badgeLabel && (
                <span
                  className="font-bold"
                  style={{
                    position: "absolute",
                    top: 8,
                    left: 8,
                    fontSize: 9,
                    letterSpacing: 0.6,
                    color: "#FFFFFF",
                    backgroundColor: badgeIsNew
                      ? "rgba(11,31,58,0.92)"
                      : "rgba(24,119,214,0.92)",
                    backdropFilter: "blur(6px)",
                    WebkitBackdropFilter: "blur(6px)",
                    fontFamily: "Inter, sans-serif",
                    padding: "2px 7px",
                    borderRadius: 999,
                    textTransform: "uppercase",
                    boxShadow: "0 2px 6px rgba(11,31,58,0.18)",
                  }}
                >
                  {badgeLabel}
                </span>
              )}
              <div
                style={{
                  position: "absolute",
                  left: 0,
                  right: 0,
                  bottom: 0,
                  padding: "8px 10px",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <span
                  style={{
                    fontSize: 12,
                    color: "#FFFFFF",
                    lineHeight: 1.3,
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                    fontWeight: 700,
                    fontFamily: "Inter, sans-serif",
                    letterSpacing: -0.1,
                  }}
                >
                  {tile.title}
                </span>
                {tile.subtitle && (
                  <span
                    style={{
                      fontSize: 10,
                      color: "rgba(255,255,255,0.7)",
                      marginTop: 2,
                      fontFamily: "Inter, sans-serif",
                      overflow: "hidden",
                      display: "-webkit-box",
                      WebkitLineClamp: 1,
                      WebkitBoxOrient: "vertical",
                      fontWeight: 500,
                    }}
                  >
                    {tile.subtitle}
                  </span>
                )}
              </div>
            </div>
          );
        })}
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

  const categoryColor = (category: string | null): string => {
    if (!category) return "#CC2229";
    if (category.startsWith("Standards Check")) return "#1A52A0";
    if (category.startsWith("Business Coaching")) return "#16A34A";
    if (category.startsWith("CPD Webinar")) return "#7C3AED";
    if (category.startsWith("New ADI")) return "#D97706";
    return "#CC2229";
  };

  const [sessions, setSessions] = useState<LiveTile[]>([]);
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
  const [podcasts, setPodcasts] = useState<PodcastTile[]>([]);
  const [communityExpanded, setCommunityExpanded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const SUPABASE_URL = "https://bjpqxfrihwjcqprmoqfs.supabase.co";
      const SUPABASE_ANON_KEY =
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJqcHF4ZnJpaHdqY3Fwcm1vcWZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE0NzQ4MjEsImV4cCI6MjA5NzA1MDgyMX0.HKlgx3dxP3uxX9wMRRUnfb0IPwaBpFcut_iUgT5XFeo";
      try {
        const res = await fetch(
          `${SUPABASE_URL}/rest/v1/dsm_live_sessions?deleted_at=is.null&status=eq.upcoming&order=session_date.asc&limit=4&select=id,title,host_name,category,session_date,session_time,price_display,price_amount,image_url,is_live,max_spaces,spaces_taken,duration_minutes`,
          {
            headers: {
              apikey: SUPABASE_ANON_KEY,
              Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
            },
          },
        );
        const data = (await res.json()) as LiveTile[];
        if (!cancelled && Array.isArray(data)) setSessions(data);
      } catch {
        /* ignore */
      }
      try {
        const res = await fetch(
          `${SUPABASE_URL}/rest/v1/dsm_podcasts?is_published=eq.true&deleted_at=is.null&order=episode_number.desc&limit=2&select=id,episode_number,title,guest_name,guest_title,duration_minutes,image_url,spotify_url,apple_url,audio_url,published_at`,
          {
            headers: {
              apikey: SUPABASE_ANON_KEY,
              Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
            },
          },
        );
        const data = (await res.json()) as PodcastTile[];
        if (!cancelled && Array.isArray(data)) setPodcasts(data);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const updateScrollState = () => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 0);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
  };

  const scrollBy = (direction: number) => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: direction * 170, behavior: "smooth" });
  };

  useEffect(() => {
    updateScrollState();
  }, [sessions, podcasts]);

  if (sessions.length === 0 && podcasts.length === 0) return null;

  const fmtDate = (d: string) => {
    try {
      return new Date(d + "T00:00:00").toLocaleDateString("en-GB", {
        weekday: "short",
        day: "numeric",
        month: "short",
      });
    } catch {
      return d;
    }
  };
  const fmtTime = (t: string) => {
    try {
      const [h, m] = t.split(":");
      const d = new Date();
      d.setHours(Number(h), Number(m), 0, 0);
      return d.toLocaleTimeString("en-GB", { hour: "numeric", minute: "2-digit", hour12: true });
    } catch {
      return t;
    }
  };

  const open = (id: string) =>
    navigate({ to: "/dsm-live/$sessionId" as never, params: { sessionId: id } as never });

  const tiles = [
    ...sessions.map((s) => ({ kind: "session" as const, item: s })),
    ...podcasts.map((p) => ({ kind: "podcast" as const, item: p })),
  ];

  if (tiles.length === 0) return null;

  return (
    <div className="mt-2">
      <div className="mx-4 flex items-end justify-between mb-4">
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#CC2229", display: "inline-block" }} />
            <span
              className="text-[11px] uppercase"
              style={{ color: "#6B7280", letterSpacing: 0.8, fontFamily: "Inter, sans-serif", fontWeight: 600 }}
            >
              DSM Live
            </span>
          </div>
          <p
            className="font-semibold uppercase"
            style={{
              fontSize: 10,
              color: "#9CA3AF",
              letterSpacing: 1,
              fontFamily: "Inter, sans-serif",
              marginTop: 3,
              marginLeft: 14,
            }}
          >
            Live events, podcasts and webinars
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <button
            type="button"
            onClick={() => navigate({ to: "/dsm-live" as never })}
            className="font-bold"
            style={{
              fontSize: 13,
              color: "#1877D6",
              fontFamily: "Inter, sans-serif",
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 0,
            }}
          >
            See all →
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <button
              type="button"
              onClick={() => scrollBy(-1)}
              disabled={!canScrollLeft}
              aria-label="Scroll left"
              style={{
                width: 24,
                height: 24,
                borderRadius: 12,
                background: "#FFFFFF",
                border: "1px solid #E2E6ED",
                boxShadow: "0 1px 3px rgba(11,31,58,0.06)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: canScrollLeft ? "pointer" : "default",
                opacity: canScrollLeft ? 1 : 0.45,
                padding: 0,
              }}
            >
              <ChevronLeft size={16} color="#0F2044" />
            </button>
            <button
              type="button"
              onClick={() => scrollBy(1)}
              disabled={!canScrollRight}
              aria-label="Scroll right"
              style={{
                width: 24,
                height: 24,
                borderRadius: 12,
                background: "#FFFFFF",
                border: "1px solid #E2E6ED",
                boxShadow: "0 1px 3px rgba(11,31,58,0.06)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: canScrollRight ? "pointer" : "default",
                opacity: canScrollRight ? 1 : 0.45,
                padding: 0,
              }}
            >
              <ChevronRight size={16} color="#0F2044" />
            </button>
          </div>
        </div>
      </div>
      <div
        ref={scrollRef}
        onScroll={updateScrollState}
        style={{
          display: "flex",
          flexDirection: "row",
          gap: 10,
          overflowX: "auto",
          marginLeft: 16,
          marginRight: 16,
          paddingBottom: 8,
          scrollSnapType: "x mandatory",
          scrollbarWidth: "none",
          WebkitOverflowScrolling: "touch",
        }}
      >
        {tiles.map((tile) => {
              if (tile.kind === "session") {
                const s = tile.item;
                const bandColor = categoryColor(s.category);
                const isWebinar = (s.category ?? "").toLowerCase().includes("webinar");
                const typeLabel = isWebinar ? "WEBINAR" : "ZOOM";
                const hero = s.image_url
                  ? `linear-gradient(180deg, transparent 30%, rgba(0,0,0,0.7) 100%), url(${s.image_url}) center/cover no-repeat`
                  : `linear-gradient(135deg, ${bandColor}, #0F2044)`;
                return (
                  <div
                    key={s.id}
                    onClick={() => open(s.id)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        open(s.id);
                      }
                    }}
                    style={{
                      width: 160,
                      height: 120,
                      flexShrink: 0,
                      scrollSnapAlign: "start",
                      borderRadius: 12,
                      overflow: "hidden",
                      position: "relative",
                      cursor: "pointer",
                      userSelect: "none",
                      background: hero,
                      border: "1px solid #EEF2F7",
                      boxShadow: "0 4px 14px rgba(11,31,58,0.08)",
                    }}
                  >
                    <span
                      style={{
                        position: "absolute",
                        top: 8,
                        left: 8,
                        fontSize: 9,
                        letterSpacing: 0.6,
                        color: bandColor,
                        backgroundColor: "#FFFFFF",
                        fontFamily: "Inter, sans-serif",
                        padding: "2px 8px",
                        borderRadius: 999,
                        textTransform: "uppercase",
                        fontWeight: 700,
                        boxShadow: "0 2px 6px rgba(11,31,58,0.18)",
                      }}
                    >
                      {typeLabel}
                    </span>
                    <div
                      style={{
                        position: "absolute",
                        left: 0,
                        right: 0,
                        bottom: 0,
                        padding: "8px 10px",
                        display: "flex",
                        flexDirection: "column",
                      }}
                    >
                      <span
                        style={{
                          fontSize: 12,
                          color: "#FFFFFF",
                          lineHeight: 1.3,
                          display: "-webkit-box",
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical",
                          overflow: "hidden",
                          fontWeight: 700,
                          fontFamily: "Inter, sans-serif",
                          letterSpacing: -0.1,
                        }}
                      >
                        {s.title}
                      </span>
                      <span
                        style={{
                          fontSize: 10,
                          color: "rgba(255,255,255,0.7)",
                          marginTop: 2,
                          fontFamily: "Inter, sans-serif",
                          fontWeight: 500,
                        }}
                      >
                        {fmtDate(s.session_date)} · {fmtTime(s.session_time).replace(" ", "")}
                      </span>
                    </div>
                  </div>
                );
              }
              const p = tile.item;
              const hero = p.image_url
                ? `linear-gradient(180deg, transparent 30%, rgba(0,0,0,0.7) 100%), url(${p.image_url}) center/cover no-repeat`
                : "linear-gradient(135deg, #7C3AED, #0F2044)";
              return (
                <div
                  key={`pod-${p.id}`}
                  onClick={() =>
                    navigate({ to: "/dsm-live/podcast/$podcastId" as never, params: { podcastId: p.id } as never })
                  }
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      navigate({ to: "/dsm-live/podcast/$podcastId" as never, params: { podcastId: p.id } as never });
                    }
                  }}
                  style={{
                    width: 160,
                    height: 120,
                    flexShrink: 0,
                    scrollSnapAlign: "start",
                    borderRadius: 12,
                    overflow: "hidden",
                    position: "relative",
                    cursor: "pointer",
                    userSelect: "none",
                    background: hero,
                    border: "1px solid #EEF2F7",
                    boxShadow: "0 4px 14px rgba(11,31,58,0.08)",
                  }}
                >
                  <span
                    style={{
                      position: "absolute",
                      top: 8,
                      left: 8,
                      fontSize: 9,
                      letterSpacing: 0.6,
                      color: "#7C3AED",
                      backgroundColor: "#FFFFFF",
                      fontFamily: "Inter, sans-serif",
                      padding: "2px 8px",
                      borderRadius: 999,
                      textTransform: "uppercase",
                      fontWeight: 700,
                      boxShadow: "0 2px 6px rgba(11,31,58,0.18)",
                    }}
                  >
                    PODCAST
                  </span>
                  <div
                    style={{
                      position: "absolute",
                      left: 0,
                      right: 0,
                      bottom: 0,
                      padding: "8px 10px",
                      display: "flex",
                      flexDirection: "column",
                    }}
                  >
                    <span
                      style={{
                        fontSize: 12,
                        color: "#FFFFFF",
                        lineHeight: 1.3,
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                        fontWeight: 700,
                        fontFamily: "Inter, sans-serif",
                        letterSpacing: -0.1,
                      }}
                    >
                      {p.title}
                    </span>
                    <span
                      style={{
                        fontSize: 10,
                        color: "rgba(255,255,255,0.7)",
                        marginTop: 2,
                        fontFamily: "Inter, sans-serif",
                        fontWeight: 500,
                      }}
                    >
                      {p.guest_name ? `with ${p.guest_name}` : "DSM Podcast"}
                    </span>
                  </div>
                </div>
              );
            })}
        </div>
      <div className="mx-4 mt-4 mb-2">
        <span
          className="text-[11px] uppercase"
          style={{ color: "#6B7280", letterSpacing: 0.8, fontFamily: "Inter, sans-serif", fontWeight: 600 }}
        >
          DSM Community
        </span>
      </div>
      <div
        style={{
          width: "calc(100% - 32px)",
          margin: "8px 16px 0",
          background: "#FFFFFF",
          borderRadius: 12,
          padding: 0,
          border: "1px solid #EEF2F7",
          textAlign: "left",
          overflow: "hidden",
          boxShadow: "0 2px 10px rgba(11, 31, 58, 0.05)",
        }}
      >
        <button
          type="button"
          onClick={() => navigate({ to: "/dsm-live", hash: "community" } as never)}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            width: "100%",
            padding: "10px 14px",
            border: "none",
            borderBottom: "1px solid #EEF2F7",
            background: "transparent",
            cursor: "pointer",
            textAlign: "left",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 10,
                background: "#EAF3FB",
                border: "1px solid #E0ECF8",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <Users color="#0C2340" size={18} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ color: "#0B1F3A", fontWeight: 700, fontSize: 14, letterSpacing: -0.2 }}>
                DSM Community
              </div>
              <div style={{ color: "#5A6B82", fontSize: 10, marginTop: 1 }}>
                Forum for ADIs
              </div>
            </div>
          </div>
          <span
            style={{
              background: "#CC2229",
              color: "#fff",
              fontSize: 10,
              fontWeight: 700,
              padding: "4px 10px",
              borderRadius: 999,
              flexShrink: 0,
              display: "inline-flex",
              alignItems: "center",
              gap: 3,
            }}
          >
            Open
            <ChevronRight size={12} />
          </span>
        </button>

        <div
          style={{
            padding: "2px 14px",
          }}
        >
          {([
            { title: "Standards check advice — anyone had part 3 recently?", cat: "Standards Check", replies: 12, activity: "2h" },
            { title: "Best diary app for a solo ADI in 2026?", cat: "Business", replies: 8, activity: "5h" },
            { title: "Pupil no-show policy — what do you charge?", cat: "General", replies: 24, activity: "1d" },
          ] as const)
            .slice(0, communityExpanded ? 3 : 1)
            .map((t, i, arr) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "10px 0",
                  borderBottom: i < arr.length - 1 || communityExpanded ? "1px solid #EEF2F7" : "none",
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      color: "#0B1F3A",
                      fontSize: 12,
                      fontWeight: 600,
                      lineHeight: 1.35,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {t.title}
                  </div>
                  <div style={{ color: "#1877D6", fontSize: 10, marginTop: 2, fontWeight: 500 }}>
                    {t.cat} · {t.replies} replies · {t.activity}
                  </div>
                </div>
              </div>
            ))}
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setCommunityExpanded((v) => !v);
          }}
          style={{
            width: "100%",
            padding: "8px 14px",
            border: "none",
            borderTop: "1px solid #EEF2F7",
            background: "transparent",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 4,
          }}
        >
          <span style={{ color: "#1877D6", fontSize: 10, fontWeight: 700 }}>
            {communityExpanded ? "Show less" : "Show more"}
          </span>
          <ChevronDown
            size={14}
            color="#1877D6"
            style={{
              transform: communityExpanded ? "rotate(180deg)" : "rotate(0deg)",
              transition: "transform 200ms ease",
            }}
          />
        </button>
      </div>
    </div>
  );
}

function HomePage() {
  const navigate = useNavigate();
  const [firstName, setFirstName] = useState("there");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [lessons, setLessons] = useState<LessonRow[]>([]);
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
        .select("name, profile_image_url, weekly_lesson_goal, weekly_earnings_goal")
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

      // Drop rows whose pupil is soft-deleted (matches previous
      // `pupils!inner` + `pupils.deleted_at IS NULL` behaviour).
      const allLessons = (allLessonsRaw ?? []).filter(
        (l: any) => !l.pupils || l.pupils.deleted_at == null,
      );

      // `lessons` state keeps its previous semantics: active scheduled
      // (not cancelled, not completed). Today/Tomorrow/Next/Week UI
      // derives from this array via existing filters at the bottom of
      // the component — behaviour unchanged.
      const activeLessons = allLessons.filter(
        (l: any) => l.status !== "cancelled" && l.status !== "completed",
      );
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
          "id, name, first_name, last_name, phone, email, prepaid_hours, ni_amount_total, ni_amount_paid, status, deleted_at"
        )
        .eq("instructor_id", userId);
      setActivePupilsCount(
        (pupilsData || []).filter((p: any) => p.status === "active").length,
      );
      setGlancePupilCount(
        (pupilsData || []).filter((p: any) => p.deleted_at == null).length,
      );

      const pupilMap: Record<string, any> = {};
      (pupilsData || []).forEach((p: any) => { pupilMap[p.id] = p; });
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
  const todayISO = ymd(todayStart);
  console.log("[today-panel] todayLessons:", todayLessons?.length, todayLessons);
  console.log("[today-panel] lessons:", lessons?.length);
  console.log("[today-panel] todayISO:", todayISO);
  console.log("[today-panel] sample lesson date:", lessons?.[0]?.lesson_date);
  console.log("[today-panel] sample lesson dt parsed:", lessons?.[0] ? lessonDateTime(lessons[0]).toString() : null);
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

          {/* STATS ROW */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, minmax(0, 1fr))", gap: 16, marginBottom: 24 }}>
            <div style={cardStyle}>
              <div style={statValue}>{todayLessons.length}</div>
              <div style={statLabel}>Lessons today</div>
            </div>
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
    <div className="min-h-screen pb-safe" style={{ ...POPPINS, backgroundColor: '#F3F8FF', paddingTop: 'calc(60px + env(safe-area-inset-top, 0px))' }}>
      {notifBanner}
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


        {/* STATS STRIP on navy */}
        {loading ? (
          <div
            className="skeleton-pulse"
            style={{ margin: '10px 16px 0', height: 78, borderRadius: 12, backgroundColor: '#F3F8FF' }}
          />
        ) : (
          <>
          <div style={{ margin: '10px 16px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#0B1F3A', textTransform: 'uppercase', letterSpacing: 0.8 }}>
              Weekly goals
            </div>
            <button
              type="button"
              onClick={() => navigate({ to: '/settings' })}
              style={{ fontSize: 11, fontWeight: 600, color: '#1877D6', background: 'none', border: 'none', padding: 0, cursor: 'pointer', textDecoration: 'underline' }}
            >
              Set goals
            </button>
          </div>
          <div
            style={{
              margin: '6px 16px 0',
              backgroundColor: '#FFFFFF',
              border: '1px solid rgba(11,31,58,0.08)',
              borderRadius: 12,
              overflow: 'hidden',
              boxShadow: '0 2px 10px rgba(11,31,58,0.06)',
              display: 'flex',
            }}
          >
            <div
              onClick={() => setEarningsOpen(true)}
              role="button"
              tabIndex={0}
              style={{ flex: 1, padding: '10px 12px', borderRight: '1px solid rgba(11,31,58,0.08)', cursor: 'pointer' }}
            >
              <div style={{ fontSize: 9, fontWeight: 700, color: '#0B1F3A', textTransform: 'uppercase', letterSpacing: 0.8 }}>
                EARNINGS · WEEK
              </div>
              <div style={{ fontSize: 19, fontWeight: 800, color: '#1877D6', marginTop: 2, lineHeight: 1.1 }}>
                £{weekEarnings.toFixed(0)}
                {earningsEstimated && (
                  <span style={{ fontSize: 10, fontWeight: 600, color: 'rgba(11,31,58,0.5)', marginLeft: 4 }}>
                    (est.)
                  </span>
                )}
              </div>
              {weekEarnings === 0 ? (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); navigate({ to: '/schedule' }); }}
                  style={{ fontSize: 10, color: '#1877D6', marginTop: 2, background: 'none', border: 'none', padding: 0, textDecoration: 'underline', cursor: 'pointer' }}
                >
                  Record payments via EOL →
                </button>
              ) : earningsEstimated ? (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); navigate({ to: '/schedule' }); }}
                  style={{ fontSize: 10, color: 'rgba(11,31,58,0.7)', marginTop: 2, background: 'none', border: 'none', padding: 0, textDecoration: 'underline', cursor: 'pointer', textAlign: 'left' }}
                >
                  Complete EOL
                </button>
              ) : (
                <div style={{ fontSize: 10, color: 'rgba(11,31,58,0.6)', marginTop: 2 }}>
                  £{todayEarnings.toFixed(0)} today
                </div>
              )}
              <div style={{ height: 4, borderRadius: 2, backgroundColor: '#F3F8FF', marginTop: 6, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${earningsPct}%`, backgroundColor: '#1877D6' }} />
              </div>
            </div>
            <div
              onClick={() => setLessonsOpen(true)}
              role="button"
              tabIndex={0}
              style={{ flex: 1, padding: '10px 12px', cursor: 'pointer' }}
            >
              <div style={{ fontSize: 9, fontWeight: 700, color: '#0B1F3A', textTransform: 'uppercase', letterSpacing: 0.8 }}>
                LESSONS · WEEK
              </div>
              <div style={{ fontSize: 19, fontWeight: 800, color: '#1877D6', marginTop: 2, lineHeight: 1.1 }}>
                {weekLessonsTotal}
              </div>
              <div style={{ fontSize: 10, color: 'rgba(11,31,58,0.6)', marginTop: 2 }}>
                {todayLessons.length} today
              </div>
              <div style={{ height: 4, borderRadius: 2, backgroundColor: '#F3F8FF', marginTop: 6, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${lessonsPct}%`, backgroundColor: '#1877D6' }} />
              </div>
            </div>
          </div>
          </>
        )}
      </div>

      {/* TODAY STRIP — 3 white tiles */}
      <div style={{ display: 'flex', gap: 8, padding: '12px 16px 0' }}>
        <TodayTile value={String(todayLessons.length)} label="Lessons today" valueColor="#1a1a1f" valueSize={22} />
        <TodayTile value={nextFreeSlot?.time ?? '—'} subValue={nextFreeSlot?.dayLabel} label="Next free slot" valueColor="#2952b3" valueSize={13} />
        <div
          style={{ flex: 1, display: 'flex', cursor: 'pointer' }}
          onClick={() => setOutstandingOpen(true)}
          role="button"
          tabIndex={0}
        >
          <TodayTile value={`£${outstanding.toFixed(0)}`} label="Outstanding" valueColor={outstanding > 0 ? '#c9302c' : '#1a1a1f'} valueSize={13} />
        </div>
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
          border: "0.5px solid #EEF2F7",
          borderRadius: 16,
          padding: "12px 0",
          fontFamily: "Inter, sans-serif",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between"
          style={{ padding: "0 16px 8px 16px" }}
        >
          <div style={{ fontSize: 14, fontWeight: 700, color: "#0B1F3A" }}>
            Schedule
          </div>
          <button
            type="button"
            onClick={() => navigate({ to: "/schedule" })}
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: "#1877D6",
              background: "transparent",
              cursor: "pointer",
              fontFamily: "Inter, sans-serif",
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
                    className="grid grid-cols-[40px_minmax(0,1fr)_auto] items-center gap-2.5 cursor-pointer"
                    style={{
                      padding: "10px 16px",
                      borderLeft: `4px solid ${isCancelled ? "#9CA3AF" : "#1A52A0"}`,
                      background: "#fff",
                    }}
                  >
                    {(() => {
                      const needsAttention =
                        !isCancelled &&
                        ((pastEnd && !l.eol_completed) ||
                          (l.payment_status === "unpaid" || !l.payment_status));
                      return (
                        <div
                          className="relative shrink-0 text-right"
                          style={{ width: 40 }}
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
                                backgroundColor: "#1877D6",
                              }}
                            />
                          )}
                          <div
                            className="truncate text-xs font-bold"
                            style={{
                              color: timeColor,
                              textDecoration: isCancelled ? "line-through" : "none",
                            }}
                          >
                            {fmtT(startD)}
                          </div>
                          <div
                            className="truncate text-[10px] text-[#9CA3AF]"
                            style={{ marginTop: 2 }}
                          >
                            {durShort(l.duration_minutes)}
                          </div>
                        </div>
                      );
                    })()}
                    <div className="min-w-0">
                      <div
                        className="truncate text-[13px] font-semibold"
                        style={{
                          color: nameColor,
                          textDecoration: isCancelled ? "line-through" : "none",
                        }}
                      >
                        {l.pupils?.name ?? "Pupil"}
                      </div>
                      {l.pickup_location && (
                        <div
                          className="flex min-w-0 items-center gap-1 truncate text-[11px] text-[#6B7280]"
                          style={{ marginTop: 2 }}
                        >
                          <MapPin size={10} color="#6B7280" />
                          <span className="truncate">{l.pickup_location}</span>
                        </div>
                      )}
                      {badges.length > 0 && (
                        <div
                          className="flex flex-wrap gap-1.5"
                          style={{ marginTop: 4 }}
                        >
                          {badges}
                        </div>
                      )}
                    </div>
                    <div className="flex shrink-0 items-center">
                      <ChevronRight
                        size={14}
                        color="#D1D5DB"
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

            return <>{rows}</>;
          })()
        )}
      </div>

      <EndOfDayBanner />




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
                className="flex-1 text-[13px] text-[#0B1F3A] outline-none bg-transparent"
                style={{ fontFamily: "Inter, sans-serif" }}
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
                  style={{ color: "#6B7280", letterSpacing: 0.8, fontFamily: "Inter, sans-serif", fontWeight: 600 }}
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
                  style={{ color: "#1877D6", fontFamily: "Inter, sans-serif" }}
                >
                  See all
                </button>
                <button
                  type="button"
                  onClick={() => alert("Coming soon")}
                  className="text-[13px]"
                  style={{ color: "#1877D6", fontFamily: "Inter, sans-serif" }}
                >
                  Edit pins
                </button>
              </div>
            </>

          )}
        </div>
        <div
          className="quick-access-scroll"
          style={{
            marginTop: 10,
            display: "grid",
            gridTemplateRows: "repeat(2, 80px)",
            gridAutoFlow: "column",
            gridAutoColumns: "calc((100% - 16px) / 3)",
            columnGap: 8,
            rowGap: 8,
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
                key={`${t.route}-${t.label}`}
                icon={t.icon}
                route={t.route}
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
        <div className="flex items-center justify-between px-1" style={{ fontFamily: "Inter, sans-serif" }}>
          <h2 className="text-[11px] font-bold uppercase" style={{ letterSpacing: "0.1em", color: "rgba(11,31,58,0.6)" }}>
            At a Glance
          </h2>
        </div>

        <div className="grid grid-cols-2 gap-2.5 mt-3" style={{ fontFamily: "Inter, sans-serif" }}>
          {/* Tax Estimate Hero (full width) */}
          <button
            type="button"
            onClick={() => navigate({ to: "/tax" })}
            className="col-span-2 text-left active:scale-[0.98] transition-transform flex flex-col justify-between"
            style={{
              backgroundColor: "#FFFFFF",
              borderRadius: 20,
              padding: 14,
              border: "1px solid rgba(11,31,58,0.05)",
              boxShadow: "0 2px 8px rgba(11,31,58,0.04)",
            }}
          >
            <div className="flex justify-between items-start mb-3">
              <div className="flex items-center gap-2.5">
                <div
                  className="flex items-center justify-center"
                  style={{ width: 32, height: 32, borderRadius: 12, backgroundColor: "#F3F8FF" }}
                >
                  <Calculator size={18} color="#1877D6" />
                </div>
                <div>
                  <p className="text-[12px] font-semibold" style={{ color: "#0B1F3A" }}>Est. tax + NI</p>
                  <p className="text-[10px] font-medium" style={{ color: "rgba(11,31,58,0.5)" }}>Tax Year {taxYearLabel}</p>
                </div>
              </div>
              <ChevronRight size={18} color="rgba(11,31,58,0.2)" />
            </div>

            <div className="mb-3">
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-bold" style={{ color: "#0B1F3A" }}>
                  £{glanceTaxAndNi.toLocaleString("en-GB", { maximumFractionDigits: 0 })}
                </span>
                <span className="text-[11px] font-medium" style={{ color: "rgba(11,31,58,0.4)" }}>projected</span>
              </div>
              <p className="text-[11px] mt-0.5" style={{ color: "rgba(11,31,58,0.6)" }}>
                Income Tax + Class 4 NI. Estimate only — consult an accountant.
              </p>
            </div>

            <div className="space-y-1.5">
              <div className="w-full" style={{ height: 4, backgroundColor: "#F3F8FF", borderRadius: 999, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${(monthsElapsed / 12) * 100}%`, backgroundColor: "#1877D6", borderRadius: 999 }} />
              </div>
              <div className="flex justify-between text-[9px] font-bold uppercase" style={{ letterSpacing: "0.08em", color: "rgba(11,31,58,0.4)" }}>
                <span>Year Progress</span>
                <span>{Math.round((monthsElapsed / 12) * 100)}%</span>
              </div>
            </div>
          </button>

          {/* Rewards */}
          <button
            type="button"
            onClick={() => navigate({ to: "/rewards" })}
            className="text-left flex flex-col active:scale-[0.98] transition-transform"
            style={{
              backgroundColor: "#FFFFFF",
              borderRadius: 20,
              padding: 12,
              height: 132,
              border: "1px solid rgba(11,31,58,0.05)",
              boxShadow: "0 2px 8px rgba(11,31,58,0.04)",
            }}
          >
            <div
              className="flex items-center justify-center mb-2.5"
              style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: "#FFF7ED" }}
            >
              <Trophy size={18} color="#EA580C" />
            </div>
            <p className="text-[12px] font-semibold mb-1" style={{ color: "#0B1F3A" }}>Rewards</p>
            <div className="mt-auto">
              <p className="text-lg font-bold" style={{ color: "#0B1F3A" }}>
                {glancePoints}{" "}
                <span className="text-[10px] font-medium uppercase" style={{ color: "rgba(11,31,58,0.4)" }}>pts</span>
              </p>
              <span
                className="inline-block mt-1.5 px-2 py-0.5 text-[9px] font-bold rounded-full uppercase"
                style={{ backgroundColor: glanceTierColor, color: "#FFFFFF", letterSpacing: "-0.01em" }}
              >
                {glanceTier}
              </span>
            </div>
          </button>

          {/* MTD */}
          <button
            type="button"
            onClick={() => navigate({ to: "/mtd" })}
            className="text-left flex flex-col active:scale-[0.98] transition-transform"
            style={{
              backgroundColor: "#FFFFFF",
              borderRadius: 20,
              padding: 12,
              height: 132,
              border: "1px solid rgba(11,31,58,0.05)",
              boxShadow: "0 2px 8px rgba(11,31,58,0.04)",
            }}
          >
            <div
              className="flex items-center justify-center mb-2.5"
              style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: "#F3F8FF" }}
            >
              <FileSpreadsheet size={18} color="#1877D6" />
            </div>
            <p className="text-[12px] font-semibold mb-1" style={{ color: "#0B1F3A" }}>MTD Status</p>
            <div className="mt-auto">
              <p className="text-[11px] leading-tight font-medium mb-2" style={{ color: "rgba(11,31,58,0.7)" }}>
                Making Tax Digital
              </p>
              <span
                className="inline-block px-2 py-0.5 text-[9px] font-bold rounded-full uppercase"
                style={{
                  backgroundColor: glanceMtdEnrolled ? "#F3F8FF" : "#FFFBEB",
                  color: glanceMtdEnrolled ? "#0B1F3A" : "#0B1F3A",
                  letterSpacing: "-0.01em",
                }}
              >
                {glanceMtdEnrolled ? "Enrolled" : "Not Enrolled"}
              </span>
            </div>
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
          const { error } = await supabase
            .from("lesson_history")
            .update({ deleted_at: new Date().toISOString() })
            .eq("id", row.id);
          if (error) {
            console.error("[home] earnings delete failed", error);
            toast.error("Couldn't delete payment");
            return;
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

      <MarketplaceSection navigate={navigate} />

      <DsmLiveSection navigate={navigate} />

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
        color: active ? "#0B1F3A" : "#9CA3AF",
        borderRadius: 8,
        padding: "8px 6px",
        fontWeight: active ? 600 : 400,
        fontSize: 13,
        fontFamily: "Inter, sans-serif",
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


