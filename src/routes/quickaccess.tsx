import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { tokens } from "@/lib/tokens";
import { useMemo, useState } from "react";
import { IconAlertCircle, IconAward, IconBell, IconBolt, IconBook, IconCalculator, IconCalendar, IconCalendarCheck, IconCalendarMonth, IconCar, IconChartBar, IconClipboardCheck, IconClipboardList, IconClock, IconCrown, IconCurrencyPound, IconFileSpreadsheet, IconFileText, IconFolderOpen, IconGasStation, IconGift, IconHeart, IconHelpCircle, IconInbox, IconLayoutGrid, IconMapPin, IconMessage, IconNavigation, IconPlayerPlay, IconReceipt, IconRefresh, IconSchool, IconSearch, IconSignature, IconSquareCheck, IconStar, IconSun, IconToggleLeft, IconTrendingUp, IconTrophy, IconUpload, IconUserCircle, IconUsers, IconWorld, IconX } from "@tabler/icons-react";
import { toast } from "sonner";
import DSMTopSheet from "@/components/dsm/DSMTopSheet";

export const Route = createFileRoute("/quickaccess")({
  component: QuickAccessPage,
});

const quickAccessTiles = [
  { icon: <IconCalendar size={22} color="#FFFFFF" />, bg: "#1877D6", label: "Schedule", route: "/schedule" },
  { icon: <IconCalendarCheck size={22} color="#FFFFFF" />, bg: "#1877D6", label: "Month end", route: "/monthend" },
  { icon: <IconUsers size={22} color="#FFFFFF" />, bg: "#1877D6", label: "Pupils", route: "/pupils" },
  { icon: <IconCurrencyPound size={22} color="#FFFFFF" />, bg: "#1877D6", label: "Payments", route: "/payments" },
  { icon: <IconMessage size={22} color="#FFFFFF" />, bg: "#1877D6", label: "Messages", route: "/messages" },
  { icon: <IconTrendingUp size={22} color="#FFFFFF" />, bg: "#1877D6", label: "Earnings", route: "/earnings" },
  { icon: <IconReceipt size={22} color="#FFFFFF" />, bg: "#0B1F3A", label: "Expenses", route: "/expenses" },
  { icon: <IconCar size={22} color="#FFFFFF" />, bg: "#B91C1C", label: "Mileage", route: "/mileage" },
  { icon: <IconGasStation size={22} color="#FFFFFF" />, bg: "#0B1F3A", label: "IconGasStation", route: "/fuel" },
  { icon: <IconChartBar size={22} color="#FFFFFF" />, bg: "#1877D6", label: "Reports", route: "/reports" },
  { icon: <IconTrendingUp size={22} color="#FFFFFF" />, bg: "#1877D6", label: "Performance", route: "/performance" },
  { icon: <IconSchool size={22} color="#FFFFFF" />, bg: "#1877D6", label: "Tests", route: "/tests" },
  { icon: <IconSchool size={22} color="#FFFFFF" />, bg: "#1877D6", label: "Test day", route: "/testday" },
  { icon: <IconTrophy size={22} color="#FFFFFF" />, bg: "#1877D6", label: "Rewards", route: "/rewards" },
  { icon: <IconSchool size={22} color="#FFFFFF" />, bg: "#B91C1C", label: "Courses", route: "/courses" },
  { icon: <IconWorld size={22} color="#FFFFFF" />, bg: "#7C3AED", label: "My Website", route: "/minisite" },
  { icon: <IconStar size={22} color="#FFFFFF" />, bg: "#0B1F3A", label: "Reviews", route: "/reviews" },
  { icon: <IconInbox size={22} color="#FFFFFF" />, bg: "#1877D6", label: "Enquiries", route: "/enquiries" },
  { icon: <IconClock size={22} color="#FFFFFF" />, bg: "#B91C1C", label: "Waiting list", route: "/waitinglist" },
  { icon: <IconGift size={22} color="#FFFFFF" />, bg: "#1877D6", label: "Referrals", route: "/referrals" },
  { icon: <IconCar size={22} color="#FFFFFF" />, bg: "#6B7280", label: "Vehicle", route: "/vehicle" },
  { icon: <IconBook size={22} color="#FFFFFF" />, bg: "#1877D6", label: "CPD", route: "/cpd" },
  { icon: <IconClipboardCheck size={22} color="#FFFFFF" />, bg: "#1877D6", label: "Standards", route: "/standards" },
  { icon: <IconCalculator size={22} color="#FFFFFF" />, bg: "#0B1F3A", label: "Tax", route: "/tax" },
  { icon: <IconSquareCheck size={22} color="#FFFFFF" />, bg: "#1877D6", label: "Todos", route: "/todos" },
  { icon: <IconFileText size={22} color="#FFFFFF" />, bg: "#0B1F3A", label: "Notes", route: "/notes" },
  { icon: <IconFolderOpen size={22} color="#FFFFFF" />, bg: "#1877D6", label: "Documents", route: "/documents" },
  { icon: <IconClipboardList size={22} color="#FFFFFF" />, bg: "#1877D6", label: "Manifest", route: "/manifest" },
  { icon: <IconSquareCheck size={22} color="#FFFFFF" />, bg: "#1877D6", label: "Checklist", route: "/checklist" },
  { icon: <IconBell size={22} color="#FFFFFF" />, bg: "#B91C1C", label: "Reminders", route: "/reminder" },
  { icon: <IconHeart size={22} color="#FFFFFF" />, bg: "#0B1F3A", label: "Health", route: "/health" },
  { icon: <IconBook size={22} color="#FFFFFF" />, bg: "#1877D6", label: "Resources", route: "/resources" },
  { icon: <IconHelpCircle size={22} color="#FFFFFF" />, bg: "#6B7280", label: "Help", route: "/help" },
  { icon: <IconLayoutGrid size={22} color="#FFFFFF" />, bg: "#1877D6", label: "Pipeline", route: "/pipeline" },
  { icon: <IconSignature size={22} color="#FFFFFF" />, bg: "#6B7280", label: "Waivers", route: "/waivers" },
  { icon: <IconSearch size={22} color="#FFFFFF" />, bg: "#1877D6", label: "Find gaps", route: "/gaps" },
  { icon: <IconUsers size={22} color="#FFFFFF" />, bg: "#B91C1C", label: "Bulk message", route: "/bulkmessage" },
  { icon: <IconNavigation size={22} color="#FFFFFF" />, bg: "#1877D6", label: "Sat Nav", route: "/satnav" },
  { icon: <IconChartBar size={22} color="#FFFFFF" />, bg: "#1877D6", label: "Weekly report", route: "/weeklyreport" },
  { icon: <IconMapPin size={22} color="#FFFFFF" />, bg: "#B91C1C", label: "Locations", route: "/locations" },
  { icon: <IconUpload size={22} color="#FFFFFF" />, bg: "#6B7280", label: "Import", route: "/dataimport" },
  { icon: <IconAward size={22} color="#FFFFFF" />, bg: "#0B1F3A", label: "Certifications", route: "/certifications" },
  { icon: <IconToggleLeft size={22} color="#FFFFFF" />, bg: "#1877D6", label: "Availability", route: "/availability" },
  { icon: <IconSun size={22} color="#FFFFFF" />, bg: "#0B1F3A", label: "EOD", route: "/eod" },
  { icon: <IconBolt size={22} color="#FFFFFF" />, bg: "#1877D6", label: "Automations", route: "/automations" },
  { icon: <IconCalendarMonth size={22} color="#FFFFFF" />, bg: "#1877D6", label: "Diary", route: "/diary" },
  { icon: <IconCrown size={22} color="#FFFFFF" />, bg: "#1877D6", label: "My plan", route: "/subscription" },
  { icon: <IconPlayerPlay size={22} color="#FFFFFF" />, bg: "#B91C1C", label: "Live session", route: "/livesession" },
  { icon: <IconSearch size={22} color="#FFFFFF" />, bg: "#6B7280", label: "Search", route: "/search" },
  { icon: <IconBell size={22} color="#FFFFFF" />, bg: "#B91C1C", label: "Notifications", route: "/notifications" },
  { icon: <IconCalendarMonth size={22} color="#FFFFFF" />, bg: "#1877D6", label: "Availability", route: "/quickavailability" },
  { icon: <IconRefresh size={22} color="#FFFFFF" />, bg: "#1877D6", label: "Calendar sync", route: "/calendarsync" },
  { icon: <IconUserCircle size={22} color="#FFFFFF" />, bg: "#1877D6", label: "Profile", route: "/profile" },
  { icon: <IconFileSpreadsheet size={22} color="#FFFFFF" />, bg: "#0B1F3A", label: "MTD", route: "/mtd" },
  { icon: <IconFileText size={22} color="#FFFFFF" />, bg: "#0B1F3A", label: "Quotes", route: "/quotes" },
  { icon: <IconSun size={22} color="#FFFFFF" />, bg: "#1877D6", label: "Briefing", route: "/briefing" },
  { icon: <IconAlertCircle size={22} color="#FFFFFF" />, bg: "#B91C1C", label: "Outstanding", route: "/outstanding" },
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
    <DSMTopSheet title="Quick Access">
      <div style={{ fontFamily: "Poppins, sans-serif" }}>

      {/* Actions row */}
      <div className="flex justify-end px-4 pt-3">
        <button
          type="button"
          onClick={() => {
            setSearchOpen((s) => {
              const next = !s;
              if (!next) setSearchQuery("");
              return next;
            });
          }}
          aria-label="Toggle search"
          className="inline-flex items-center gap-2 text-[13px] font-semibold"
          style={{ height: 34, padding: "0 12px", borderRadius: 8, border: "1px solid #E2E8F0", background: tokens.white, color: tokens.navy }}
        >
          {searchOpen ? <IconX size={15} /> : <IconSearch size={15} />}
          {searchOpen ? "Close search" : "Search"}
        </button>
      </div>


      {/* SEARCH BAR */}
      {searchOpen && (
        <div className="px-4 pt-3 pb-1">
          <div
            className="flex items-center gap-2 px-3"
            style={{
              height: 40,
              backgroundColor: tokens.white,
              borderRadius: 8,
              borderWidth: "0.5px",
              borderStyle: "solid",
              borderColor: tokens.canvas,
            }}
          >
            <IconSearch size={16} color="#6B7280" />
            <input
              type="text"
              placeholder="Search quick access..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 bg-transparent outline-none text-[14px] text-[#0B1F3A] placeholder-[#9CA3AF]"
              autoFocus
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                style={{ background: "none", border: "none", cursor: "pointer" }}
                aria-label="Clear search"
              >
                <IconX size={16} color="#6B7280" />
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
              borderColor: tokens.canvas,
              borderRadius: 8,
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
                borderRadius: 8,
                backgroundColor: t.bg,
              }}
            >
              {t.icon}
            </span>
            <span
              className="text-[13px] text-center"
              style={{ color: tokens.navy, fontWeight: 500 }}
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
    </DSMTopSheet>
  );
}
