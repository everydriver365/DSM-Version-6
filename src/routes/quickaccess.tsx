import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  ArrowLeft,
  Search,
  X,
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
  Bell,
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

const quickAccessTiles = [
  { icon: <CalendarIcon size={22} color="#FFFFFF" />, bg: "#00A3B4", label: "Schedule", route: "/schedule" },
  { icon: <CalendarCheck size={22} color="#FFFFFF" />, bg: "#7C3AED", label: "Month end", route: "/monthend" },
  { icon: <Users size={22} color="#FFFFFF" />, bg: "#16A34A", label: "Pupils", route: "/pupils" },
  { icon: <PoundSterling size={22} color="#FFFFFF" />, bg: "#7C3AED", label: "Payments", route: "/payments" },
  { icon: <MessageSquare size={22} color="#FFFFFF" />, bg: "#00A3B4", label: "Messages", route: "/messages" },
  { icon: <TrendingUp size={22} color="#FFFFFF" />, bg: "#16A34A", label: "Earnings", route: "/earnings" },
  { icon: <Receipt size={22} color="#FFFFFF" />, bg: "#D97706", label: "Expenses", route: "/expenses" },
  { icon: <Car size={22} color="#FFFFFF" />, bg: "#DC2626", label: "Mileage", route: "/mileage" },
  { icon: <Fuel size={22} color="#FFFFFF" />, bg: "#D97706", label: "Fuel", route: "/fuel" },
  { icon: <BarChart2 size={22} color="#FFFFFF" />, bg: "#00A3B4", label: "Reports", route: "/reports" },
  { icon: <TrendingUp size={22} color="#FFFFFF" />, bg: "#7C3AED", label: "Performance", route: "/performance" },
  { icon: <GraduationCap size={22} color="#FFFFFF" />, bg: "#16A34A", label: "Tests", route: "/tests" },
  { icon: <GraduationCap size={22} color="#FFFFFF" />, bg: "#F59E0B", label: "Test day", route: "/testday" },
  { icon: <Trophy size={22} color="#FFFFFF" />, bg: "#F59E0B", label: "Rewards", route: "/rewards" },
  { icon: <GraduationCap size={22} color="#FFFFFF" />, bg: "#DC2626", label: "Courses", route: "/courses" },
  { icon: <Star size={22} color="#FFFFFF" />, bg: "#D97706", label: "Reviews", route: "/reviews" },
  { icon: <Inbox size={22} color="#FFFFFF" />, bg: "#00A3B4", label: "Enquiries", route: "/enquiries" },
  { icon: <Clock size={22} color="#FFFFFF" />, bg: "#DC2626", label: "Waiting list", route: "/waitinglist" },
  { icon: <Gift size={22} color="#FFFFFF" />, bg: "#16A34A", label: "Referrals", route: "/referrals" },
  { icon: <Car size={22} color="#FFFFFF" />, bg: "#6B7280", label: "Vehicle", route: "/vehicle" },
  { icon: <BookOpen size={22} color="#FFFFFF" />, bg: "#00A3B4", label: "CPD", route: "/cpd" },
  { icon: <ClipboardCheck size={22} color="#FFFFFF" />, bg: "#7C3AED", label: "Standards", route: "/standards" },
  { icon: <Calculator size={22} color="#FFFFFF" />, bg: "#D97706", label: "Tax", route: "/tax" },
  { icon: <CheckSquare size={22} color="#FFFFFF" />, bg: "#7C3AED", label: "Todos", route: "/todos" },
  { icon: <FileText size={22} color="#FFFFFF" />, bg: "#D97706", label: "Notes", route: "/notes" },
  { icon: <FolderOpen size={22} color="#FFFFFF" />, bg: "#00A3B4", label: "Documents", route: "/documents" },
  { icon: <ClipboardList size={22} color="#FFFFFF" />, bg: "#7C3AED", label: "Manifest", route: "/manifest" },
  { icon: <CheckSquare size={22} color="#FFFFFF" />, bg: "#16A34A", label: "Checklist", route: "/checklist" },
  { icon: <Bell size={22} color="#FFFFFF" />, bg: "#DC2626", label: "Reminders", route: "/reminder" },
  { icon: <Heart size={22} color="#FFFFFF" />, bg: "#D97706", label: "Health", route: "/health" },
  { icon: <BookOpen size={22} color="#FFFFFF" />, bg: "#16A34A", label: "Resources", route: "/resources" },
  { icon: <HelpCircle size={22} color="#FFFFFF" />, bg: "#6B7280", label: "Help", route: "/help" },
  { icon: <LayoutGrid size={22} color="#FFFFFF" />, bg: "#7C3AED", label: "Pipeline", route: "/pipeline" },
  { icon: <FileSignature size={22} color="#FFFFFF" />, bg: "#6B7280", label: "Waivers", route: "/waivers" },
  { icon: <Search size={22} color="#FFFFFF" />, bg: "#00A3B4", label: "Find gaps", route: "/gaps" },
  { icon: <Users size={22} color="#FFFFFF" />, bg: "#DC2626", label: "Bulk message", route: "/bulkmessage" },
  { icon: <Navigation size={22} color="#FFFFFF" />, bg: "#16A34A", label: "Sat Nav", route: "/satnav" },
  { icon: <BarChart2 size={22} color="#FFFFFF" />, bg: "#00A3B4", label: "Weekly report", route: "/weeklyreport" },
  { icon: <MapPin size={22} color="#FFFFFF" />, bg: "#DC2626", label: "Locations", route: "/locations" },
  { icon: <Upload size={22} color="#FFFFFF" />, bg: "#6B7280", label: "Import", route: "/dataimport" },
  { icon: <Award size={22} color="#FFFFFF" />, bg: "#D97706", label: "Certifications", route: "/certifications" },
  { icon: <ToggleLeft size={22} color="#FFFFFF" />, bg: "#00A3B4", label: "Availability", route: "/availability" },
  { icon: <Sun size={22} color="#FFFFFF" />, bg: "#D97706", label: "EOD", route: "/eod" },
  { icon: <Zap size={22} color="#FFFFFF" />, bg: "#7C3AED", label: "Automations", route: "/automations" },
  { icon: <CalendarDays size={22} color="#FFFFFF" />, bg: "#00A3B4", label: "Diary", route: "/diary" },
  { icon: <Crown size={22} color="#FFFFFF" />, bg: "#7C3AED", label: "My plan", route: "/subscription" },
  { icon: <PlayCircle size={22} color="#FFFFFF" />, bg: "#DC2626", label: "Live session", route: "/livesession" },
  { icon: <Search size={22} color="#FFFFFF" />, bg: "#6B7280", label: "Search", route: "/search" },
  { icon: <Bell size={22} color="#FFFFFF" />, bg: "#DC2626", label: "Notifications", route: "/notifications" },
  { icon: <CalendarDays size={22} color="#FFFFFF" />, bg: "#00A3B4", label: "Availability", route: "/quickavailability" },
  { icon: <RefreshCw size={22} color="#FFFFFF" />, bg: "#7C3AED", label: "Calendar sync", route: "/calendarsync" },
  { icon: <UserCircle size={22} color="#FFFFFF" />, bg: "#00A3B4", label: "Profile", route: "/profile" },
  { icon: <FileSpreadsheet size={22} color="#FFFFFF" />, bg: "#D97706", label: "MTD", route: "/mtd" },
  { icon: <FileText size={22} color="#FFFFFF" />, bg: "#D97706", label: "Quotes", route: "/quotes" },
  { icon: <Sun size={22} color="#FFFFFF" />, bg: "#16A34A", label: "Briefing", route: "/briefing" },
  { icon: <AlertCircle size={22} color="#FFFFFF" />, bg: "#DC2626", label: "Outstanding", route: "/outstanding" },
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
      className="min-h-screen pb-24 pb-safe"
      style={{ backgroundColor: "#F7F5EF", fontFamily: "Inter, sans-serif" }}
    >
      {/* TOP BAR */}
      <div
        className="sticky top-0 z-40 h-[56px] px-4 flex items-center justify-between"
        style={{ backgroundColor: "#072b47" }}
      >
        <button
          type="button"
          onClick={() => navigate({ to: "/home" })}
          className="flex items-center justify-center"
          style={{ background: "none", border: "none", cursor: "pointer" }}
          aria-label="Back"
        >
          <ArrowLeft size={22} color="#FFFFFF" />
        </button>

        <span className="text-white text-[16px] font-semibold">
          Quick access
        </span>

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
          style={{ background: "none", border: "none", cursor: "pointer" }}
          aria-label="Toggle search"
        >
          {searchOpen ? (
            <X size={22} color="#FFFFFF" />
          ) : (
            <Search size={22} color="#FFFFFF" />
          )}
        </button>
      </div>

      {/* SEARCH BAR */}
      {searchOpen && (
        <div className="px-4 pt-3 pb-1">
          <div
            className="flex items-center gap-2 px-3"
            style={{
              height: 40,
              backgroundColor: "#FFFFFF",
              borderRadius: 10,
              borderWidth: "0.5px",
              borderStyle: "solid",
              borderColor: "#EEF2F7",
            }}
          >
            <Search size={16} color="#6B7280" />
            <input
              type="text"
              placeholder="Search quick access..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 bg-transparent outline-none text-[14px] text-[#0A2540] placeholder-[#9CA3AF]"
              autoFocus
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                style={{ background: "none", border: "none", cursor: "pointer" }}
                aria-label="Clear search"
              >
                <X size={16} color="#6B7280" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* GRID */}
      <div
        className="px-4 pt-3 pb-8"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
          gap: 12,
        }}
      >
        {filteredTiles.map((t) => (
          <button
            key={t.label}
            type="button"
            onClick={() => navigate({ to: t.route })}
            className="bg-white flex flex-col items-center justify-center"
            style={{
              borderWidth: "0.5px",
              borderStyle: "solid",
              borderColor: "#EEF2F7",
              borderRadius: 12,
              padding: 16,
              gap: 8,
              cursor: "pointer",
            }}
          >
            <span
              className="flex items-center justify-center"
              style={{
                width: 44,
                height: 44,
                borderRadius: 10,
                backgroundColor: t.bg,
              }}
            >
              {t.icon}
            </span>
            <span
              className="text-[13px] text-center"
              style={{ color: "#0A2540", fontWeight: 500 }}
            >
              {t.label}
            </span>
          </button>
        ))}
      </div>

      {/* EMPTY STATE */}
      {filteredTiles.length === 0 && (
        <div
          className="flex items-center justify-center text-[14px] text-[#6B7280]"
          style={{ paddingTop: 40 }}
        >
          No results for "{searchQuery}"
        </div>
      )}
    </div>
  );
}
