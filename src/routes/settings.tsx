import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  User,
  Clock,
  Bell,
  Calendar,
  HelpCircle,
  Shield,
  ChevronRight,
  ChevronDown,
  PoundSterling,
} from "lucide-react";

import { Card } from "../components/dsm/Card";
import { Button } from "../components/dsm/Button";

import { SectionHeader } from "../components/dsm/SectionHeader";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { supabase } from "../lib/supabaseClient";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — DSM by EveryDriver" },
      { name: "description", content: "Manage your account and preferences." },
    ],
  }),
  component: SettingsPage,
});

const POPPINS = { fontFamily: "Poppins, sans-serif" } as const;

const DAYS = [
  { key: "mon", label: "Monday" },
  { key: "tue", label: "Tuesday" },
  { key: "wed", label: "Wednesday" },
  { key: "thu", label: "Thursday" },
  { key: "fri", label: "Friday" },
  { key: "sat", label: "Saturday" },
  { key: "sun", label: "Sunday" },
] as const;
type DayKey = (typeof DAYS)[number]["key"];
type WorkingHours = Record<DayKey, boolean>;

const DEFAULT_HOURS: WorkingHours = {
  mon: true, tue: true, wed: true, thu: true, fri: true, sat: true, sun: true,
};

type ExpandKey = "profile" | "working_hours" | "notifications" | null;

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  const a = parts[0]?.[0] ?? "";
  const b = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (a + b).toUpperCase() || "?";
}

function SettingsPage() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState<string>("");
  const [instructorName, setInstructorName] = useState<string>("");
  const [displayName, setDisplayName] = useState<string>("");
  const [phone, setPhone] = useState<string>("");
  const [workingDays, setWorkingDays] = useState<WorkingHours>(DEFAULT_HOURS);
  const [expanded, setExpanded] = useState<ExpandKey>(null);
  const [signOutOpen, setSignOutOpen] = useState(false);

  useEffect(() => {
    (async () => {
      const { data, error: authErr } = await supabase.auth.getUser();
      if (authErr) console.error("[settings] auth error", authErr);
      const user = data.user;
      if (!user) return;
      setUserId(user.id);
      setEmail(user.email ?? "");

      const { data: instructor, error: instErr } = await supabase
        .from("instructors")
        .select("name")
        .eq("id", user.id)
        .maybeSingle();
      if (instErr) console.error("[settings] instructor fetch error", instErr);
      if (instructor?.name) setInstructorName(instructor.name);

      const { data: profile } = await supabase
        .from("profiles")
        .select("display_name, phone")
        .eq("id", user.id)
        .maybeSingle();
      if (profile) {
        setDisplayName(profile.display_name ?? "");
        setPhone(profile.phone ?? "");
      }

      const { data: hours } = await supabase
        .from("working_hours")
        .select("mon, tue, wed, thu, fri, sat, sun")
        .eq("instructor_id", user.id)
        .maybeSingle();
      if (hours) {
        setWorkingDays({
          mon: hours.mon, tue: hours.tue, wed: hours.wed, thu: hours.thu,
          fri: hours.fri, sat: hours.sat, sun: hours.sun,
        });
      } else {
        await supabase
          .from("working_hours")
          .insert({ instructor_id: user.id, ...DEFAULT_HOURS });
      }
    })();
  }, []);


  async function toggleDay(d: DayKey) {
    const next = { ...workingDays, [d]: !workingDays[d] };
    setWorkingDays(next);
    if (!userId) return;
    const { error } = await supabase.from("working_hours").upsert(
      { instructor_id: userId, ...next, updated_at: new Date().toISOString() },
      { onConflict: "instructor_id" },
    );
    if (error) console.error("[settings] toggle day error", error);
  }

  async function signOut() {
    setSignOutOpen(false);
    await supabase.auth.signOut();
    navigate({ to: "/login", replace: true });
  }

  const displayedName = displayName || instructorName || email.split("@")[0] || "Instructor";

  return (
    <div className="min-h-screen bg-white pb-24 pb-safe" style={POPPINS}>
      {/* Top bar */}
      <div
        className="sticky top-0 z-40 flex items-center justify-between px-4"
        style={{ height: 52, backgroundColor: "#0F2044" }}
      >
        <div className="flex items-center gap-2">
          <span className="text-[15px] font-bold text-white" style={POPPINS}>DSM</span>
          <span className="text-[15px] text-white" style={POPPINS}>Settings</span>
        </div>
      </div>

      {/* Profile header */}
      <div className="mx-4 mt-3">
        <Card>
          <div className="flex items-center gap-3">
            <div
              className="flex items-center justify-center rounded-full shrink-0 text-[16px] font-semibold"
              style={{ width: 56, height: 56, backgroundColor: "#1A52A0", color: "#FFFFFF", ...POPPINS }}
            >
              {initials(displayedName)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[18px] font-semibold text-[#0F2044] truncate" style={POPPINS}>
                {displayedName}
              </div>
              <div className="text-[13px] text-[#6B7280] truncate" style={POPPINS}>
                {email || "—"}
              </div>
            </div>
            <Button variant="ghost" inline onClick={() => navigate({ to: "/profile" })}>
              Edit profile
            </Button>
          </div>
        </Card>
      </div>

      <div className="px-4">
        <SectionHeader>ACCOUNT</SectionHeader>
        <Card className="!p-0">
          <MenuRow
            icon={<User size={18} color="#1E40AF" />}
            iconBg="#DBEAFE"
            label="Profile"
            onClick={() => navigate({ to: "/profile" })}
            isFirst
          />


          <MenuRow
            icon={<PoundSterling size={18} color="#5B21B6" />}
            iconBg="#EDE9FE"
            label="Payments"
            onClick={() => navigate({ to: "/payments" })}
          />

          <MenuRow
            icon={<Clock size={18} color="#1A52A0" />}
            iconBg="#DBEAFE"
            label="Working hours"
            onClick={() => navigate({ to: "/availability" })}
          />



          <MenuRow
            icon={<Bell size={18} color="#92400E" />}
            iconBg="#FEF3C7"
            label="Notifications"
            onClick={() => navigate({ to: "/notificationsettings" })}
          />

          <MenuRow
            icon={<Calendar size={18} color="#1A52A0" />}
            iconBg="#DBEAFE"
            label="Calendar sync"
            onClick={() => navigate({ to: "/calendarsync" })}
          />
        </Card>

        <SectionHeader>SUPPORT</SectionHeader>
        <Card className="!p-0">
          <MenuRow
            icon={<HelpCircle size={18} color="#52525B" />}
            iconBg="#F4F4F5"
            label="Help"
            onClick={() => navigate({ to: "/help" })}
            isFirst
          />
          <MenuRow
            icon={<Shield size={18} color="#52525B" />}
            iconBg="#F4F4F5"
            label="Privacy policy"
            onClick={() =>
              window.open("https://everydriver.co.uk/privacy-policy", "_blank", "noopener,noreferrer")
            }
          />

        </Card>

        <SectionHeader>DANGER ZONE</SectionHeader>
        <Button variant="destructive" onClick={() => setSignOutOpen(true)}>
          Sign out
        </Button>
      </div>

      <ConfirmDialog
        open={signOutOpen}
        title="Sign out?"
        confirmLabel="Sign out"
        onConfirm={signOut}
        onCancel={() => setSignOutOpen(false)}
      />
    </div>
  );
}

function MenuRow({
  icon,
  iconBg,
  label,
  onClick,
  expanded,
  isFirst,
}: {
  icon: React.ReactNode;
  iconBg: string;
  label: string;
  onClick: () => void;
  expanded?: boolean;
  isFirst?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-3 text-left"
      style={isFirst ? undefined : { borderTopWidth: "0.5px", borderTopStyle: "solid", borderTopColor: "#E2E6ED" }}
    >
      <div
        className="flex items-center justify-center rounded-full shrink-0"
        style={{ width: 36, height: 36, backgroundColor: iconBg }}
      >
        {icon}
      </div>
      <span className="flex-1 text-[14px] text-[#0F2044]" style={POPPINS}>{label}</span>
      {expanded ? (
        <ChevronDown size={18} color="#6B7280" />
      ) : (
        <ChevronRight size={18} color="#6B7280" />
      )}
    </button>
  );
}

function PlaceholderBlock({ text }: { text: string }) {
  return (
    <div
      className="px-4 py-4 text-[13px] text-[#6B7280]"
      style={{ borderTopWidth: "0.5px", borderTopStyle: "solid", borderTopColor: "#E2E6ED", ...POPPINS }}
    >
      {text}
    </div>
  );
}
