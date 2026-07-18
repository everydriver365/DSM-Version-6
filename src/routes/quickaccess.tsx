import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  ArrowLeft,
  Search,
  X,
  ChevronRight,
  Bell,
  Calendar as CalendarIcon,
  CalendarCheck,
  Users,
  PoundSterling,
  MessageSquare,
  TrendingUp,
  Receipt,
  Car,
  Fuel,
  BarChart2,
  GraduationCap,
  Trophy,
  Star,
  Inbox,
  Clock,
  Gift,
  BookOpen,
  ClipboardCheck,
  Calculator,
  CheckSquare,
  FileText,
  FolderOpen,
  ClipboardList,
  Heart,
  HelpCircle,
  LayoutGrid,
  FileSignature,
  Navigation,
  MapPin,
  Upload,
  Award,
  ToggleLeft,
  Sun,
  Zap,
  CalendarDays,
  Crown,
  PlayCircle,
  AlertCircle,
  RefreshCw,
  UserCircle,
  FileSpreadsheet,
} from "lucide-react";

export const Route = createFileRoute("/quickaccess")({
  component: QuickAccessPage,
});

const PAGE_BG = "#F0F4F8";
const NAVY = "#0B1F3A";
const BLUE = "#1877D6";
const RED = "#EF4444";

const colorPresets = {
  blue: { bg: "#EAF3FB", icon: "#1877D6" },
  navy: { bg: "#E6ECF5", icon: "#0B1F3A" },
  orange: { bg: "#FFF0E6", icon: "#F97316" },
  purple: { bg: "#F3EEFC", icon: "#8B5CF6" },
  green: { bg: "#E7F8EF", icon: "#10B981" },
  red: { bg: "#FCE8E8", icon: "#EF4444" },
  gray: { bg: "#F1F3F4", icon: "#6B7280" },
} as const;

type ColorKey = keyof typeof colorPresets;

const tileColorMap: Record<string, ColorKey> = {
  Schedule: "blue",
  "Month end": "blue",
  Diary: "blue",
  Availability: "blue",
  "Calendar sync": "blue",
  "Quick availability": "blue",
  Payments: "green",
  Earnings: "green",
  Expenses: "green",
  Tax: "green",
  Quotes: "green",
  MTD: "green",
  Pupils: "purple",
  "Bulk message": "purple",
  Profile: "purple",
  Mileage: "orange",
  Vehicle: "orange",
  Fuel: "orange",
  "Sat Nav": "orange",
  Locations: "orange",
  Reports: "navy",
  Performance: "navy",
  "Weekly report": "navy",
  CPD: "navy",
  Standards: "navy",
  Certifications: "navy",
  Checklist: "navy",
  Manifest: "navy",
  Documents: "navy",
  Notes: "navy",
  Todos: "navy",
  Resources: "navy",
  Help: "navy",
  "Test day": "red",
  Tests: "red",
  "Waiting list": "red",
  Reminders: "red",
  Outstanding: "red",
  Notifications: "red",
  "Live session": "red",
  Messages: "gray",
  Enquiries: "gray",
  Referrals: "gray",
  Rewards: "gray",
  Pipeline: "gray",
  Automations: "gray",
  Waivers: "gray",
  Import: "gray",
  EOD: "gray",
  Briefing: "gray",
  Health: "gray",
};

function getTileColor(label: string): ColorKey {
  return tileColorMap[label] ?? "blue";
}

const quickAccessTiles = [
  { icon: CalendarIcon, label: "Schedule", route: "/schedule" },
  { icon: CalendarCheck, label: "Month end", route: "/monthend" },
  { icon: Users, label: "Pupils", route: "/pupils" },
  { icon: PoundSterling, label: "Payments", route: "/payments" },
  { icon: MessageSquare, label: "Messages", route: "/messages" },
  { icon: TrendingUp, label: "Earnings", route: "/earnings" },
  { icon: Receipt, label: "Expenses", route: "/expenses" },
  { icon: Car, label: "Mileage", route: "/mileage" },
  { icon: Fuel, label: "Fuel", route: "/fuel" },
  { icon: BarChart2, label: "Reports", route: "/reports" },
  { icon: TrendingUp, label: "Performance", route: "/performance" },
  { icon: GraduationCap, label: "Tests", route: "/tests" },
  { icon: GraduationCap, label: "Test day", route: "/testday" },
  { icon: Trophy, label: "Rewards", route: "/rewards" },
  { icon: GraduationCap, label: "Courses", route: "/courses" },
  { icon: Star, label: "Reviews", route: "/reviews" },
  { icon: Inbox, label: "Enquiries", route: "/enquiries" },
  { icon: Clock, label: "Waiting list", route: "/waitinglist" },
  { icon: Gift, label: "Referrals", route: "/referrals" },
  { icon: Car, label: "Vehicle", route: "/vehicle" },
  { icon: BookOpen, label: "CPD", route: "/cpd" },
  { icon: ClipboardCheck, label: "Standards", route: "/standards" },
  { icon: Calculator, label: "Tax", route: "/tax" },
  { icon: CheckSquare, label: "Todos", route: "/todos" },
  { icon: FileText, label: "Notes", route: "/notes" },
  { icon: FolderOpen, label: "Documents", route: "/documents" },
  { icon: ClipboardList, label: "Manifest", route: "/manifest" },
  { icon: CheckSquare, label: "Checklist", route: "/checklist" },
  { icon: Bell, label: "Reminders", route: "/reminder" },
  { icon: Heart, label: "Health", route: "/health" },
  { icon: BookOpen, label: "Resources", route: "/resources" },
  { icon: HelpCircle, label: "Help", route: "/help" },
  { icon: LayoutGrid, label: "Pipeline", route: "/pipeline" },
  { icon: FileSignature, label: "Waivers", route: "/waivers" },
  { icon: Search, label: "Find gaps", route: "/gaps" },
  { icon: Users, label: "Bulk message", route: "/bulkmessage" },
  { icon: Navigation, label: "Sat Nav", route: "/satnav" },
  { icon: BarChart2, label: "Weekly report", route: "/weeklyreport" },
  { icon: MapPin, label: "Locations", route: "/locations" },
  { icon: Upload, label: "Import", route: "/dataimport" },
  { icon: Award, label: "Certifications", route: "/certifications" },
  { icon: ToggleLeft, label: "Availability", route: "/availability" },
  { icon: Sun, label: "EOD", route: "/eod" },
  { icon: Zap, label: "Automations", route: "/automations" },
  { icon: CalendarDays, label: "Diary", route: "/diary" },
  { icon: Crown, label: "My plan", route: "/subscription" },
  { icon: PlayCircle, label: "Live session", route: "/livesession" },
  { icon: Search, label: "Search", route: "/search" },
  { icon: Bell, label: "Notifications", route: "/notifications" },
  { icon: CalendarDays, label: "Quick availability", route: "/quickavailability" },
  { icon: RefreshCw, label: "Calendar sync", route: "/calendarsync" },
  { icon: UserCircle, label: "Profile", route: "/profile" },
  { icon: FileSpreadsheet, label: "MTD", route: "/mtd" },
  { icon: FileText, label: "Quotes", route: "/quotes" },
  { icon: Sun, label: "Briefing", route: "/briefing" },
  { icon: AlertCircle, label: "Outstanding", route: "/outstanding" },
] as const;

function QuickAccessPage() {
  const navigate = useNavigate();
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredTiles = useMemo(
    () =>
      quickAccessTiles.filter((t) =>
        t.label.toLowerCase().includes(searchQuery.toLowerCase())
      ),
    [searchQuery]
  );

  return (
    <div
      className="min-h-screen pb-32 pb-safe"
      style={{ backgroundColor: PAGE_BG, fontFamily: "Poppins, Inter, sans-serif" }}
    >
      {/* HEADER */}
      <div className="px-5 pt-4 pb-2 flex items-center justify-between">
        <button
          type="button"
          onClick={() => navigate({ to: "/home" })}
          className="flex items-center justify-center"
          style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            backgroundColor: "#FFFFFF",
            border: "1px solid #E2E8F0",
            boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
            cursor: "pointer",
          }}
          aria-label="Back"
        >
          <ArrowLeft size={20} color={NAVY} />
        </button>

        <button
          type="button"
          onClick={() => {
            setSearchOpen((s) => {
              const next = !s;
              if (!next) setSearchQuery("");
              return next;
            });
          }}
          className="flex items-center justify-center"
          style={{
            width: 44,
            height: 44,
            borderRadius: 999,
            backgroundColor: "#FFFFFF",
            border: "1px solid #E2E8F0",
            boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
            cursor: "pointer",
          }}
          aria-label="Toggle search"
        >
          {searchOpen ? (
            <X size={20} color={NAVY} />
          ) : (
            <Search size={20} color={NAVY} />
          )}
        </button>
      </div>

      {/* TITLE */}
      <div className="px-5 pt-2 pb-4">
        <h1
          className="text-[32px] font-bold leading-tight"
          style={{ color: NAVY, fontFamily: "Poppins, Inter, sans-serif", letterSpacing: "-0.02em" }}
        >
          Quick Access
        </h1>
        <p className="text-[15px] mt-1" style={{ color: "#64748B" }}>
          Everything you need, right at your fingertips
        </p>
      </div>

      {/* SEARCH BAR */}
      {searchOpen && (
        <div className="px-5 pb-3">
          <div
            className="flex items-center gap-2 px-3"
            style={{
              height: 48,
              backgroundColor: "#FFFFFF",
              borderRadius: 16,
              borderWidth: "1px",
              borderStyle: "solid",
              borderColor: "#E2E8F0",
              boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
            }}
          >
            <Search size={18} color="#94A3B8" />
            <input
              type="text"
              placeholder="Search quick access..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 bg-transparent outline-none text-[15px] placeholder-[#94A3B8]"
              style={{ color: NAVY }}
              autoFocus
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                style={{ background: "none", border: "none", cursor: "pointer" }}
                aria-label="Clear search"
              >
                <X size={18} color="#94A3B8" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* GRID */}
      <div
        className="px-5 pt-2 pb-6"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
          gap: 16,
        }}
      >
        {filteredTiles.map((t) => {
          const color = colorPresets[getTileColor(t.label)];
          const Icon = t.icon;
          return (
            <button
              key={t.label}
              type="button"
              onClick={() => navigate({ to: t.route })}
              className="cf-tap flex flex-col items-start"
              style={{
                backgroundColor: "#FFFFFF",
                borderRadius: 24,
                padding: 20,
                minHeight: 132,
                borderWidth: "1px",
                borderStyle: "solid",
                borderColor: "#E8EDF3",
                boxShadow: "0 4px 20px rgba(11, 31, 58, 0.05)",
                cursor: "pointer",
                position: "relative",
                textAlign: "left",
              }}
            >
              <span
                className="flex items-center justify-center"
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 14,
                  backgroundColor: color.bg,
                  marginBottom: 14,
                }}
              >
                <Icon size={24} color={color.icon} strokeWidth={1.8} />
              </span>
              <span
                className="text-[15px] leading-snug pr-6"
                style={{ color: NAVY, fontWeight: 600 }}
              >
                {t.label}
              </span>
              <span
                className="flex items-center justify-center"
                style={{
                  position: "absolute",
                  right: 16,
                  bottom: 16,
                  width: 28,
                  height: 28,
                  borderRadius: 999,
                  backgroundColor: "#F8FAFC",
                  border: "1px solid #E2E8F0",
                }}
              >
                <ChevronRight size={16} color={BLUE} />
              </span>
            </button>
          );
        })}
      </div>

      {/* EMPTY STATE */}
      {filteredTiles.length === 0 && (
        <div
          className="flex flex-col items-center justify-center text-center px-5"
          style={{ paddingTop: 48, paddingBottom: 48 }}
        >
          <div
            className="flex items-center justify-center mb-3"
            style={{
              width: 56,
              height: 56,
              borderRadius: 18,
              backgroundColor: "#EAF3FB",
            }}
          >
            <Search size={26} color={BLUE} />
          </div>
          <p className="text-[15px] font-medium" style={{ color: NAVY }}>
            No results for "{searchQuery}"
          </p>
          <p className="text-[13px] mt-1" style={{ color: "#64748B" }}>
            Try a different search term
          </p>
        </div>
      )}

      {/* BOTTOM NOTIFICATION BANNER */}
      <div className="px-5 pb-6">
        <button
          type="button"
          onClick={() => navigate({ to: "/notifications" })}
          className="cf-tap w-full flex items-center gap-4"
          style={{
            backgroundColor: "#FFFFFF",
            borderRadius: 20,
            padding: "16px 18px",
            borderWidth: "1px",
            borderStyle: "solid",
            borderColor: "#E8EDF3",
            boxShadow: "0 4px 20px rgba(11, 31, 58, 0.05)",
            cursor: "pointer",
            textAlign: "left",
          }}
        >
          <span
            className="flex items-center justify-center"
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              backgroundColor: "#EAF3FB",
              flexShrink: 0,
            }}
          >
            <Bell size={22} color={BLUE} />
          </span>
          <div className="flex-1 min-w-0">
            <p
              className="text-[15px] font-semibold"
              style={{ color: NAVY }}
            >
              Stay on top of your day
            </p>
            <p className="text-[13px] mt-0.5" style={{ color: "#64748B" }}>
              Check your latest notifications and reminders
            </p>
          </div>
          <ChevronRight size={20} color={BLUE} />
        </button>
      </div>
    </div>
  );
}
