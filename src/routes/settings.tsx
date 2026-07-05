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
  Crown,
  MapPin,
  Check,
  Trash2,
  Plus,
  Store,
  Tag,
  ClipboardList,
  AlertTriangle,
  Globe,
} from "lucide-react";
import { toast } from "sonner";

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

const POPPINS = { fontFamily: "Inter, sans-serif" } as const;

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

type ExpandKey = "payments" | "lessons" | "rates" | "coverage" | "pricing" | null;

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
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [workingDays, setWorkingDays] = useState<WorkingHours>(DEFAULT_HOURS);
  const [expanded, setExpanded] = useState<ExpandKey>(null);
  const [signOutOpen, setSignOutOpen] = useState(false);
  const [passBookingFee, setPassBookingFee] = useState<boolean>(true);
  const [hourlyRate, setHourlyRate] = useState<number>(35);
  const [defaultDuration, setDefaultDuration] = useState<number>(60);
  const [bufferMinutes, setBufferMinutes] = useState<number>(15);
  const [savingRates, setSavingRates] = useState(false);
  const [homePostcode, setHomePostcode] = useState<string>("");
  const [postcodeBlurred, setPostcodeBlurred] = useState(false);
  const [coverageRadius, setCoverageRadius] = useState<number>(10);
  const [savingCoverage, setSavingCoverage] = useState(false);
  const [sendLessonReminders, setSendLessonReminders] = useState<boolean>(true);
  const [reminderTiming, setReminderTiming] = useState<"evening" | "morning" | "both">("evening");

  // EveryDriver listing state
  const [publishToMarketplace, setPublishToMarketplace] = useState<boolean>(true);
  const [featuredListing, setFeaturedListing] = useState<boolean>(false);
  const [featuredUntil, setFeaturedUntil] = useState<string | null>(null);
  const [appSlug, setAppSlug] = useState<string>("");

  const UK_POSTCODE_RE = /^[A-Z]{1,2}[0-9][A-Z0-9]? ?[0-9][A-Z]{2}$/i;
  const postcodeValid = UK_POSTCODE_RE.test(homePostcode.trim());
  const postcodeShowError = postcodeBlurred && homePostcode.trim().length > 0 && !postcodeValid;

  // Pricing rules
  type RuleType = "time_of_day" | "day_of_week" | "postcode_zone" | "advance_notice";
  type AdjType = "flat" | "percent";
  type PricingRule = {
    id: string;
    instructor_id: string;
    rule_name: string;
    rule_type: RuleType;
    conditions: Record<string, unknown>;
    adjustment_type: AdjType;
    adjustment_value: number;
    is_active: boolean;
  };
  const RULE_TYPE_LABEL: Record<RuleType, string> = {
    time_of_day: "Time of Day",
    day_of_week: "Day of Week",
    postcode_zone: "Postcode Zone",
    advance_notice: "Advance Notice",
  };
  const [pricingRules, setPricingRules] = useState<PricingRule[]>([]);
  const [ruleName, setRuleName] = useState("");
  const [ruleType, setRuleType] = useState<RuleType>("time_of_day");
  const [ruleTime, setRuleTime] = useState("17:00");
  const [ruleDays, setRuleDays] = useState<Record<DayKey, boolean>>({
    mon: false, tue: false, wed: false, thu: false, fri: false, sat: false, sun: false,
  });
  const [rulePostcodes, setRulePostcodes] = useState("");
  const [ruleHours, setRuleHours] = useState<number>(24);
  const [ruleAdjType, setRuleAdjType] = useState<AdjType>("flat");
  const [ruleAdjValue, setRuleAdjValue] = useState<number>(5);
  const [savingRule, setSavingRule] = useState(false);

  const POSTCODE_ENTRY_RE = /^[A-Z]{1,2}[0-9][A-Z0-9]?( ?[0-9][A-Z]{2})?$/i;
  const postcodeEntries = rulePostcodes.split(",").map((s) => s.trim()).filter(Boolean);
  const hasInvalidPostcodes = ruleType === "postcode_zone" && postcodeEntries.some((e) => !POSTCODE_ENTRY_RE.test(e));

  async function loadPricingRules(uid: string) {
    const { data, error } = await supabase
      .from("pricing_rules")
      .select("*")
      .eq("instructor_id", uid)
      .order("created_at", { ascending: false });
    if (error) {
      console.error("[settings] pricing_rules fetch error", error);
      return;
    }
    setPricingRules((data ?? []) as PricingRule[]);
  }

  async function addPricingRule() {
    if (!userId) return;
    if (!ruleName.trim()) {
      toast.error("Rule name required");
      return;
    }
    let conditions: Record<string, unknown> = {};
    if (ruleType === "time_of_day") conditions = { after: ruleTime };
    else if (ruleType === "day_of_week") {
      const days = (Object.keys(ruleDays) as DayKey[]).filter((d) => ruleDays[d]);
      if (days.length === 0) {
        toast.error("Select at least one day");
        return;
      }
      conditions = { days };
    } else if (ruleType === "postcode_zone") {
      const POSTCODE_RE = /^[A-Z]{1,2}[0-9][A-Z0-9]?( ?[0-9][A-Z]{2})?$/i;
      const codes = rulePostcodes.split(",").map((s) => s.trim().replace(/\s+/g, " ").toUpperCase()).filter(Boolean);
      if (codes.length === 0) {
        toast.error("Enter at least one postcode");
        return;
      }
      if (codes.some((c) => !POSTCODE_RE.test(c))) {
        toast.error("Fix invalid postcodes");
        return;
      }
      conditions = { postcodes: codes };
    } else if (ruleType === "advance_notice") {
      conditions = { within_hours: ruleHours };
    }
    setSavingRule(true);
    const { error } = await supabase.from("pricing_rules").insert({
      instructor_id: userId,
      rule_name: ruleName.trim(),
      rule_type: ruleType,
      conditions,
      adjustment_type: ruleAdjType,
      adjustment_value: ruleAdjValue,
      is_active: true,
    });
    setSavingRule(false);
    if (error) {
      console.error("[settings] add rule error", error);
      toast.error("Could not add rule");
      return;
    }
    toast.success("Rule added");
    setRuleName("");
    setRuleAdjValue(5);
    await loadPricingRules(userId);
  }

  async function toggleRule(id: string, next: boolean) {
    if (!userId) return;
    const { error } = await supabase
      .from("pricing_rules")
      .update({ is_active: next })
      .eq("id", id)
      .eq("instructor_id", userId);
    if (error) {
      toast.error("Could not update rule");
      return;
    }
    setPricingRules((prev) => prev.map((r) => (r.id === id ? { ...r, is_active: next } : r)));
  }

  async function deleteRule(id: string) {
    if (!userId) return;
    const { error } = await supabase.from("pricing_rules").delete().eq("id", id).eq("instructor_id", userId);
    if (error) {
      toast.error("Could not delete rule");
      return;
    }
    setPricingRules((prev) => prev.filter((r) => r.id !== id));
  }

  function describeRule(r: PricingRule): string {
    const c = r.conditions ?? {};
    if (r.rule_type === "time_of_day") return `After ${(c as { after?: string }).after ?? "—"}`;
    if (r.rule_type === "day_of_week") {
      const days = ((c as { days?: string[] }).days ?? []).join(", ");
      return days || "—";
    }
    if (r.rule_type === "postcode_zone") {
      return ((c as { postcodes?: string[] }).postcodes ?? []).join(", ") || "—";
    }
    if (r.rule_type === "advance_notice") {
      return `Within ${(c as { within_hours?: number }).within_hours ?? "—"}h`;
    }
    return "";
  }

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
        .select("name, profile_image_url, pass_booking_fee, hourly_rate, default_lesson_duration_minutes, lesson_buffer_minutes, home_postcode, radius_miles, send_lesson_reminders, reminder_timing, publish_to_marketplace, featured_listing, featured_until, app_slug")
        .eq("id", user.id)
        .maybeSingle();
      if (instErr) console.error("[settings] instructor fetch error", instErr);
      if (instructor?.name) setInstructorName(instructor.name);
      if (instructor?.profile_image_url) setAvatarUrl(instructor.profile_image_url);
      if (instructor && typeof (instructor as { pass_booking_fee?: boolean }).pass_booking_fee === "boolean") {
        setPassBookingFee((instructor as { pass_booking_fee: boolean }).pass_booking_fee);
      }
      if (instructor && typeof (instructor as { hourly_rate?: number }).hourly_rate === "number") {
        setHourlyRate((instructor as { hourly_rate: number }).hourly_rate);
      }
      if (instructor && typeof (instructor as { default_lesson_duration_minutes?: number }).default_lesson_duration_minutes === "number") {
        setDefaultDuration((instructor as { default_lesson_duration_minutes: number }).default_lesson_duration_minutes);
      }
      if (instructor && typeof (instructor as { lesson_buffer_minutes?: number }).lesson_buffer_minutes === "number") {
        setBufferMinutes((instructor as { lesson_buffer_minutes: number }).lesson_buffer_minutes);
      }
      if (instructor && typeof (instructor as { home_postcode?: string }).home_postcode === "string") {
        setHomePostcode((instructor as { home_postcode: string }).home_postcode);
      }
      if (instructor && typeof (instructor as { radius_miles?: number }).radius_miles === "number") {
        setCoverageRadius((instructor as { radius_miles: number }).radius_miles);
      }
      if (instructor && typeof (instructor as { send_lesson_reminders?: boolean }).send_lesson_reminders === "boolean") {
        setSendLessonReminders((instructor as { send_lesson_reminders: boolean }).send_lesson_reminders);
      }
      const rt = (instructor as { reminder_timing?: string } | null)?.reminder_timing;
      if (rt === "evening" || rt === "morning" || rt === "both") {
        setReminderTiming(rt);
      }

      if (instructor && typeof (instructor as { publish_to_marketplace?: boolean }).publish_to_marketplace === "boolean") {
        setPublishToMarketplace((instructor as { publish_to_marketplace: boolean }).publish_to_marketplace);
      }
      if (instructor && typeof (instructor as { featured_listing?: boolean }).featured_listing === "boolean") {
        setFeaturedListing((instructor as { featured_listing: boolean }).featured_listing);
      }
      if (instructor && (instructor as { featured_until?: string | null }).featured_until) {
        setFeaturedUntil((instructor as { featured_until: string }).featured_until);
      }
      if (instructor && typeof (instructor as { app_slug?: string }).app_slug === "string") {
        setAppSlug((instructor as { app_slug: string }).app_slug);
      }



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

      await loadPricingRules(user.id);
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

  async function togglePassBookingFee() {
    const next = !passBookingFee;
    setPassBookingFee(next);
    if (!userId) return;
    const { error } = await supabase
      .from("instructors")
      .update({ pass_booking_fee: next })
      .eq("id", userId);
    if (error) {
      console.error("[settings] toggle pass_booking_fee error", error);
      setPassBookingFee(!next);
    }
  }

  async function toggleSendLessonReminders() {
    const next = !sendLessonReminders;
    setSendLessonReminders(next);
    if (!userId) return;
    const { error } = await supabase
      .from("instructors")
      .update({ send_lesson_reminders: next })
      .eq("id", userId);
    if (error) {
      console.error("[settings] toggle send_lesson_reminders error", error);
      setSendLessonReminders(!next);
      toast.error("Could not save preference");
    }
  }

  async function updateReminderTiming(value: "evening" | "morning" | "both") {
    const prev = reminderTiming;
    setReminderTiming(value);
    if (!userId) return;
    const { error } = await supabase
      .from("instructors")
      .update({ reminder_timing: value })
      .eq("id", userId);
    if (error) {
      console.error("[settings] update reminder_timing error", error);
      setReminderTiming(prev);
      toast.error("Could not save reminder timing");
    }
  }



  async function saveRates() {
    if (!userId) return;
    setSavingRates(true);
    const { error } = await supabase
      .from("instructors")
      .update({
        hourly_rate: hourlyRate,
        default_lesson_duration_minutes: defaultDuration,
        lesson_buffer_minutes: bufferMinutes,
      })
      .eq("id", userId);
    setSavingRates(false);
    if (error) {
      console.error("[settings] save rates error", error);
      toast.error("Failed to save rates");
    } else {
      toast.success("Saved ✓");
    }
  }

  async function saveCoverage() {
    if (!userId) return;
    const UK_POSTCODE_RE = /^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/i;
    const pc = homePostcode.trim().toUpperCase();
    if (!UK_POSTCODE_RE.test(pc)) {
      toast.error("Enter a valid UK postcode");
      return;
    }
    setSavingCoverage(true);
    try {
      const res = await fetch(`https://api.postcodes.io/postcodes/${encodeURIComponent(pc)}`);
      if (!res.ok) {
        toast.error("Postcode not found");
        setSavingCoverage(false);
        return;
      }
      const json = await res.json();
      const lat = json?.result?.latitude ?? null;
      const lng = json?.result?.longitude ?? null;
      const { error } = await supabase
        .from("instructors")
        .update({ home_postcode: pc, lat, lng, radius_miles: coverageRadius })
        .eq("id", userId);
      if (error) {
        console.error("[settings] save coverage error", error);
        toast.error("Failed to save coverage");
      } else {
        setHomePostcode(pc);
        toast.success("Coverage saved ✓");
      }
    } catch (e) {
      console.error("[settings] geocode error", e);
      toast.error("Could not look up postcode");
    } finally {
      setSavingCoverage(false);
    }
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
        style={{ height: 52, backgroundColor: "#0B1F3A" }}
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
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt="Profile"
                className="rounded-full shrink-0"
                style={{ width: 56, height: 56, objectFit: "cover" }}
              />
            ) : (
              <div
                className="flex items-center justify-center rounded-full shrink-0 text-[16px] font-semibold"
                style={{ width: 56, height: 56, backgroundColor: "#1877D6", color: "#FFFFFF", ...POPPINS }}
              >
                {initials(displayedName)}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="text-[18px] font-semibold text-[#0B1F3A] truncate" style={POPPINS}>
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
            icon={<Clock size={18} color="#1877D6" />}
            iconBg="#DBEAFE"
            label="Working hours"
            onClick={() => navigate({ to: "/availability" })}
          />



          <MenuRow
            icon={<Bell size={18} color="#0B1F3A" />}
            iconBg="#EEF2F7"
            label="Notifications"
            onClick={() => navigate({ to: "/notificationsettings" })}
          />

          <MenuRow
            icon={<Calendar size={18} color="#1877D6" />}
            iconBg="#DBEAFE"
            label="Calendar sync"
            onClick={() => navigate({ to: "/calendarsync" })}
          />

          <MenuRow
            icon={<Crown size={18} color="#5B21B6" />}
            iconBg="#EDE9FE"
            label="My plan"
            value="DSM Free"
            onClick={() => navigate({ to: "/subscription" })}
          />
        </Card>

        <SectionHeader>PAYMENTS</SectionHeader>
        <Card className="!p-0">
          <MenuRow
            icon={<PoundSterling size={18} color="#5B21B6" />}
            iconBg="#EDE9FE"
            label="Pass booking fee to pupil"
            expanded={expanded === "payments"}
            onClick={() => setExpanded(expanded === "payments" ? null : "payments")}
            isFirst
          />
          {expanded === "payments" && (
            <div className="px-4 pb-4" style={{ borderTop: "0.5px solid #EEF2F7" }}>
              <div className="flex items-start gap-3 pt-3">
                <div className="flex-1 min-w-0">
                  <div className="text-[12px] text-[#6B7280]" style={POPPINS}>
                    A £1 booking fee is charged per payment. Toggle on to pass this to the pupil, off to absorb it yourself.
                  </div>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={passBookingFee}
                  aria-label="Pass booking fee to pupil"
                  onClick={(e) => {
                    e.stopPropagation();
                    togglePassBookingFee();
                  }}
                  style={{
                    width: 44,
                    height: 26,
                    borderRadius: 13,
                    background: passBookingFee ? "#1877D6" : "#D1D5DB",
                    border: "none",
                    position: "relative",
                    cursor: "pointer",
                    flexShrink: 0,
                    transition: "background 0.2s",
                  }}
                >
                  <span
                    style={{
                      position: "absolute",
                      top: 3,
                      left: passBookingFee ? 21 : 3,
                      width: 20,
                      height: 20,
                      borderRadius: "50%",
                      background: "#fff",
                      transition: "left 0.2s",
                      boxShadow: "0 1px 2px rgba(0,0,0,0.15)",
                    }}
                  />
                </button>
              </div>
            </div>
          )}
        </Card>

        <SectionHeader>LESSON REMINDERS</SectionHeader>
        <Card className="!p-0">
          <MenuRow
            icon={<Bell size={18} color="#0B1F3A" />}
            iconBg="#EEF2F7"
            label="Lesson reminders"
            expanded={expanded === "lessons"}
            onClick={() => setExpanded(expanded === "lessons" ? null : "lessons")}
            isFirst
          />
          {expanded === "lessons" && (
            <div className="px-4 pb-4" style={{ borderTop: "0.5px solid #EEF2F7" }}>
              <div className="flex items-start gap-3 pt-3">
                <div className="flex-1 min-w-0">
                  <div className="text-[14px] font-medium text-[#0B1F3A]" style={POPPINS}>
                    Send pupils lesson reminders
                  </div>
                  <div className="text-[12px] text-[#6B7280] mt-1" style={POPPINS}>
                    Automatically email pupils the evening before their lesson
                  </div>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={sendLessonReminders}
                  aria-label="Send pupils lesson reminders"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleSendLessonReminders();
                  }}
                  style={{
                    width: 44,
                    height: 26,
                    borderRadius: 13,
                    background: sendLessonReminders ? "#1877D6" : "#D1D5DB",
                    border: "none",
                    position: "relative",
                    cursor: "pointer",
                    flexShrink: 0,
                    transition: "background 0.2s",
                  }}
                >
                  <span
                    style={{
                      position: "absolute",
                      top: 3,
                      left: sendLessonReminders ? 21 : 3,
                      width: 20,
                      height: 20,
                      borderRadius: "50%",
                      background: "#fff",
                      transition: "left 0.2s",
                      boxShadow: "0 1px 2px rgba(0,0,0,0.15)",
                    }}
                  />
                </button>
              </div>

              {sendLessonReminders && (
                <div className="mt-4 pt-4" style={{ borderTop: "0.5px solid #EEF2F7" }}>
                  <div className="text-[14px] font-medium text-[#0B1F3A] mb-2" style={POPPINS}>
                    Reminder timing
                  </div>
                  <select
                    value={reminderTiming}
                    onChange={(e) => updateReminderTiming(e.target.value as "evening" | "morning" | "both")}
                    className="w-full text-[14px] text-[#0B1F3A]"
                    style={{
                      ...POPPINS,
                      padding: "10px 12px",
                      border: "0.5px solid #EEF2F7",
                      borderRadius: 8,
                      background: "#FFFFFF",
                    }}
                  >
                    <option value="evening">Evening before (6pm)</option>
                    <option value="morning">Morning of lesson (8am)</option>
                    <option value="both">Both</option>
                  </select>
                </div>
              )}
            </div>
          )}
        </Card>

        <SectionHeader>RATES & SCHEDULING</SectionHeader>
        <Card className="!p-0">
          <MenuRow
            icon={<PoundSterling size={18} color="#1877D6" />}
            iconBg="#DBEAFE"
            label="Rates & scheduling"
            expanded={expanded === "rates"}
            onClick={() => setExpanded(expanded === "rates" ? null : "rates")}
            isFirst
          />
          {expanded === "rates" && (
            <div className="px-4 pb-4" style={{ borderTop: "0.5px solid #EEF2F7" }}>
              {/* Hourly rate */}
              <div className="flex items-start gap-3 pt-4">
                <div className="flex-1 min-w-0">
                  <div className="text-[14px] font-medium text-[#0B1F3A]" style={POPPINS}>
                    Hourly rate
                  </div>
                  <div className="text-[12px] text-[#6B7280] mt-1" style={POPPINS}>
                    Used to calculate lesson costs in the EOL wizard
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <span className="text-[14px] text-[#6B7280]" style={POPPINS}>£</span>
                  <input
                    type="number"
                    min={0}
                    step={0.5}
                    value={hourlyRate}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      if (!isNaN(val) && val >= 0) {
                        setHourlyRate(val);
                      }
                    }}
                    className="text-[14px] font-medium text-[#0B1F3A] text-right"
                    style={{
                      width: 72,
                      height: 36,
                      borderRadius: 8,
                      border: "1px solid #EEF2F7",
                      padding: "0 8px",
                      ...POPPINS,
                    }}
                  />
                </div>
              </div>

              {/* Default lesson duration */}
              <div
                className="flex items-center gap-3 pt-4 mt-4"
                style={{ borderTopWidth: "0.5px", borderTopStyle: "solid", borderTopColor: "#EEF2F7" }}
              >
                <div className="flex-1 min-w-0">
                  <div className="text-[14px] font-medium text-[#0B1F3A]" style={POPPINS}>
                    Default lesson duration
                  </div>
                </div>
                <select
                  value={defaultDuration}
                  onChange={(e) => setDefaultDuration(parseInt(e.target.value, 10))}
                  className="text-[13px] text-[#0B1F3A]"
                  style={{
                    height: 36,
                    borderRadius: 8,
                    border: "1px solid #EEF2F7",
                    padding: "0 8px",
                    backgroundColor: "#fff",
                    ...POPPINS,
                  }}
                >
                  <option value={60}>1 hour</option>
                  <option value={120}>2 hours</option>
                  <option value={180}>3 hours</option>
                  <option value={240}>4 hours</option>
                  <option value={300}>5 hours</option>
                  <option value={360}>6 hours</option>
                  <option value={420}>7 hours</option>
                  <option value={480}>8 hours</option>
                </select>
              </div>

              {/* Buffer between lessons */}
              <div
                className="flex items-center gap-3 pt-4 mt-4"
                style={{ borderTopWidth: "0.5px", borderTopStyle: "solid", borderTopColor: "#EEF2F7" }}
              >
                <div className="flex-1 min-w-0">
                  <div className="text-[14px] font-medium text-[#0B1F3A]" style={POPPINS}>
                    Buffer between lessons
                  </div>
                  <div className="text-[12px] text-[#6B7280] mt-1" style={POPPINS}>
                    Travel time added between lessons
                  </div>
                </div>
                <select
                  value={bufferMinutes}
                  onChange={(e) => setBufferMinutes(parseInt(e.target.value, 10))}
                  className="text-[13px] text-[#0B1F3A]"
                  style={{
                    height: 36,
                    borderRadius: 8,
                    border: "1px solid #EEF2F7",
                    padding: "0 8px",
                    backgroundColor: "#fff",
                    ...POPPINS,
                  }}
                >
                  <option value={0}>None</option>
                  <option value={15}>15 mins</option>
                  <option value={30}>30 mins</option>
                  <option value={45}>45 mins</option>
                  <option value={60}>1 hour</option>
                  <option value={90}>1.5 hours</option>
                  <option value={120}>2 hours</option>
                </select>
              </div>

              {/* Save button */}
              <button
                type="button"
                onClick={saveRates}
                disabled={savingRates}
                className="w-full text-[14px] font-semibold text-white mt-5"
                style={{
                  height: 48,
                  borderRadius: 10,
                  backgroundColor: "#0B1F3A",
                  border: "none",
                  opacity: savingRates ? 0.7 : 1,
                  cursor: savingRates ? "not-allowed" : "pointer",
                  ...POPPINS,
                }}
              >
                {savingRates ? "Saving…" : "Save rates"}
              </button>
            </div>
          )}
        </Card>

        <SectionHeader>COVERAGE AREA</SectionHeader>
        <Card className="!p-0">
          <MenuRow
            icon={<MapPin size={18} color="#1877D6" />}
            iconBg="#DBEAFE"
            label="Coverage area"
            expanded={expanded === "coverage"}
            onClick={() => setExpanded(expanded === "coverage" ? null : "coverage")}
            isFirst
          />
          {expanded === "coverage" && (
            <div className="px-4 pb-4" style={{ borderTop: "0.5px solid #EEF2F7" }}>
              <label className="block pt-4" style={{ fontSize: 12, color: "#6B7280", ...POPPINS }}>Home postcode</label>
              <div style={{ position: "relative", marginTop: 6, marginBottom: postcodeShowError ? 4 : 14 }}>
                <input
                  type="text"
                  value={homePostcode}
                  onChange={(e) => setHomePostcode(e.target.value.toUpperCase())}
                  onBlur={() => setPostcodeBlurred(true)}
                  placeholder="e.g. SO23 9AX"
                  autoCapitalize="characters"
                  maxLength={10}
                  style={{
                    width: "100%",
                    height: 44,
                    padding: "0 36px 0 12px",
                    border: `0.5px solid ${postcodeShowError ? "#1877D6" : "#EEF2F7"}`,
                    borderRadius: 10,
                    fontSize: 14,
                    background: "#fff",
                    color: "#0B1F3A",
                    textTransform: "uppercase",
                    ...POPPINS,
                  }}
                />
                {postcodeValid && (
                  <Check
                    size={18}
                    color="#1877D6"
                    style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)" }}
                  />
                )}
              </div>
              {postcodeShowError && (
                <div style={{ fontSize: 12, color: "#1877D6", marginBottom: 14, ...POPPINS }}>
                  Please enter a valid UK postcode
                </div>
              )}

              <label className="block" style={{ fontSize: 12, color: "#6B7280", ...POPPINS }}>Coverage radius</label>
              <select
                value={coverageRadius}
                onChange={(e) => setCoverageRadius(Number(e.target.value))}
                style={{
                  width: "100%",
                  height: 44,
                  padding: "0 12px",
                  border: "0.5px solid #EEF2F7",
                  borderRadius: 10,
                  fontSize: 14,
                  marginTop: 6,
                  background: "#fff",
                  color: "#0B1F3A",
                  ...POPPINS,
                }}
              >
                {[5, 10, 15, 20, 25, 30].map((m) => (
                  <option key={m} value={m}>
                    {m} miles
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={saveCoverage}
                disabled={savingCoverage || !postcodeValid}
                className="w-full text-[14px] font-semibold text-white mt-5"
                style={{
                  height: 48,
                  borderRadius: 10,
                  backgroundColor: "#0B1F3A",
                  border: "none",
                  opacity: savingCoverage || !postcodeValid ? 0.5 : 1,
                  cursor: savingCoverage || !postcodeValid ? "not-allowed" : "pointer",
                  ...POPPINS,
                }}
              >
                {savingCoverage ? "Saving…" : "Save coverage"}
              </button>
            </div>
          )}
        </Card>

        <SectionHeader>PRICING RULES</SectionHeader>
        <Card className="!p-0">
          <MenuRow
            icon={<PoundSterling size={18} color="#1877D6" />}
            iconBg="#DBEAFE"
            label="Pricing rules"
            expanded={expanded === "pricing"}
            onClick={() => setExpanded(expanded === "pricing" ? null : "pricing")}
            isFirst
          />
          {expanded === "pricing" && (
            <div className="px-4 pb-4" style={{ borderTop: "0.5px solid #EEF2F7" }}>
              <MenuRow
                icon={<MapPin size={18} color="#0369A1" />}
                iconBg="#E0F2FE"
                label="Postcode rates"
                onClick={() => navigate({ to: "/postcode-rates" })}
                isFirst
              />

              <div className="pt-4" style={{ borderTop: "0.5px solid #EEF2F7" }}>
                <p style={{ fontSize: 12, color: "#6B7280", marginBottom: 14, ...POPPINS }}>
                  Automatically adjust lesson prices based on time, day, location, or booking notice.
                </p>

                {pricingRules.length === 0 && (
                  <p style={{ fontSize: 13, color: "#6B7280", marginBottom: 14, ...POPPINS }}>
                    No pricing rules yet. Add one below.
                  </p>
                )}

                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
                  {pricingRules.map((r) => (
                    <div
                      key={r.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        border: "0.5px solid #EEF2F7",
                        borderRadius: 10,
                        padding: 12,
                        background: "#fff",
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                          <span style={{ fontWeight: 600, fontSize: 14, color: "#0B1F3A", ...POPPINS }}>
                            {r.rule_name}
                          </span>
                          <span
                            style={{
                              fontSize: 11,
                              padding: "2px 8px",
                              borderRadius: 999,
                              background: "#EEF2FF",
                              color: "#1877D6",
                              ...POPPINS,
                            }}
                          >
                            {RULE_TYPE_LABEL[r.rule_type]}
                          </span>
                          <span
                            style={{
                              fontSize: 12,
                              fontWeight: 600,
                              color: "#1877D6",
                              ...POPPINS,
                            }}
                          >
                            {r.adjustment_type === "flat"
                              ? `+£${Number(r.adjustment_value).toFixed(2)}`
                              : `+${r.adjustment_value}%`}
                          </span>
                        </div>
                        <div style={{ fontSize: 12, color: "#6B7280", marginTop: 2, ...POPPINS }}>
                          {describeRule(r)}
                        </div>
                      </div>
                      <label style={{ display: "inline-flex", alignItems: "center", cursor: "pointer" }}>
                        <input
                          type="checkbox"
                          checked={r.is_active}
                          onChange={(e) => toggleRule(r.id, e.target.checked)}
                          style={{ width: 18, height: 18, accentColor: "#1877D6" }}
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() => deleteRule(r.id)}
                        aria-label="Delete rule"
                        style={{
                          background: "transparent",
                          border: "none",
                          cursor: "pointer",
                          padding: 4,
                          color: "#1877D6",
                        }}
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  ))}
                </div>

                <div style={{ borderTop: "0.5px solid #EEF2F7", paddingTop: 14 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#0B1F3A", marginBottom: 10, ...POPPINS }}>
                    Add new rule
                  </div>

                  <label style={{ fontSize: 12, color: "#6B7280", ...POPPINS }}>Rule name</label>
                  <input
                    type="text"
                    value={ruleName}
                    onChange={(e) => setRuleName(e.target.value)}
                    placeholder="e.g. Evening Surcharge"
                    style={{
                      width: "100%", height: 44, padding: "0 12px",
                      border: "0.5px solid #EEF2F7", borderRadius: 10, fontSize: 14,
                      marginTop: 6, marginBottom: 12, background: "#fff", color: "#0B1F3A", ...POPPINS,
                    }}
                  />

                  <label style={{ fontSize: 12, color: "#6B7280", ...POPPINS }}>Rule type</label>
                  <select
                    value={ruleType}
                    onChange={(e) => setRuleType(e.target.value as RuleType)}
                    style={{
                      width: "100%", height: 44, padding: "0 12px",
                      border: "0.5px solid #EEF2F7", borderRadius: 10, fontSize: 14,
                      marginTop: 6, marginBottom: 12, background: "#fff", color: "#0B1F3A", ...POPPINS,
                    }}
                  >
                    <option value="time_of_day">Time of Day</option>
                    <option value="day_of_week">Day of Week</option>
                    <option value="postcode_zone">Postcode Zone</option>
                    <option value="advance_notice">Advance Notice</option>
                  </select>

                  {ruleType === "time_of_day" && (
                    <>
                      <label style={{ fontSize: 12, color: "#6B7280", ...POPPINS }}>After time</label>
                      <input
                        type="time"
                        value={ruleTime}
                        onChange={(e) => setRuleTime(e.target.value)}
                        style={{
                          width: "100%", height: 44, padding: "0 12px",
                          border: "0.5px solid #EEF2F7", borderRadius: 10, fontSize: 14,
                          marginTop: 6, marginBottom: 12, background: "#fff", color: "#0B1F3A", ...POPPINS,
                        }}
                      />
                    </>
                  )}

                  {ruleType === "day_of_week" && (
                    <div style={{ marginTop: 6, marginBottom: 12 }}>
                      <label style={{ fontSize: 12, color: "#6B7280", ...POPPINS }}>Days</label>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 6 }}>
                        {DAYS.map((d) => (
                          <label
                            key={d.key}
                            style={{
                              display: "inline-flex", alignItems: "center", gap: 6,
                              padding: "6px 10px", border: "0.5px solid #EEF2F7",
                              borderRadius: 8, fontSize: 13, cursor: "pointer", ...POPPINS,
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={ruleDays[d.key]}
                              onChange={(e) => setRuleDays((p) => ({ ...p, [d.key]: e.target.checked }))}
                              style={{ accentColor: "#1877D6" }}
                            />
                            {d.label.slice(0, 3)}
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  {ruleType === "postcode_zone" && (() => {
                    const POSTCODE_RE = /^[A-Z]{1,2}[0-9][A-Z0-9]?( ?[0-9][A-Z]{2})?$/i;
                    const entries = rulePostcodes.split(",").map((s) => s.trim()).filter(Boolean);
                    const invalid = entries.filter((e) => !POSTCODE_RE.test(e));
                    return (
                      <>
                        <label style={{ fontSize: 12, color: "#6B7280", ...POPPINS }}>
                          Postcodes (comma separated)
                        </label>
                        <input
                          type="text"
                          value={rulePostcodes}
                          onChange={(e) => setRulePostcodes(e.target.value.toUpperCase())}
                          placeholder="SO22, SO23 9AX"
                          style={{
                            width: "100%", height: 44, padding: "0 12px",
                            border: `0.5px solid ${invalid.length ? "#1877D6" : "#EEF2F7"}`,
                            borderRadius: 10, fontSize: 14,
                            marginTop: 6, marginBottom: invalid.length || entries.length ? 4 : 12,
                            background: "#fff", color: "#0B1F3A",
                            textTransform: "uppercase", ...POPPINS,
                          }}
                        />
                        {invalid.length > 0 && (
                          <div style={{ color: "#1877D6", fontSize: 12, marginBottom: 8, ...POPPINS }}>
                            {invalid.map((v) => `Invalid postcode: ${v}`).join(" · ")}
                          </div>
                        )}
                        {entries.length > 0 && invalid.length === 0 && (
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
                            {entries.map((v) => (
                              <span key={v} style={{
                                display: "inline-flex", alignItems: "center", gap: 4,
                                fontSize: 12, color: "#0F7B3F", background: "#E8F5EC",
                                padding: "2px 8px", borderRadius: 999, ...POPPINS,
                              }}>
                                <Check size={12} /> {v}
                              </span>
                            ))}
                          </div>
                        )}
                      </>
                    );
                  })()}

                  {ruleType === "advance_notice" && (
                    <>
                      <label style={{ fontSize: 12, color: "#6B7280", ...POPPINS }}>Within X hours</label>
                      <input
                        type="number"
                        min={1}
                        value={ruleHours}
                        onChange={(e) => setRuleHours(Number(e.target.value))}
                        style={{
                          width: "100%", height: 44, padding: "0 12px",
                          border: "0.5px solid #EEF2F7", borderRadius: 10, fontSize: 14,
                          marginTop: 6, marginBottom: 12, background: "#fff", color: "#0B1F3A", ...POPPINS,
                        }}
                      />
                    </>
                  )}

                  <div style={{ display: "flex", gap: 8 }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: 12, color: "#6B7280", ...POPPINS }}>Adjustment type</label>
                      <select
                        value={ruleAdjType}
                        onChange={(e) => setRuleAdjType(e.target.value as AdjType)}
                        style={{
                          width: "100%", height: 44, padding: "0 12px",
                          border: "0.5px solid #EEF2F7", borderRadius: 10, fontSize: 14,
                          marginTop: 6, background: "#fff", color: "#0B1F3A", ...POPPINS,
                        }}
                      >
                        <option value="flat">Flat amount (£)</option>
                        <option value="percent">Percentage (%)</option>
                      </select>
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: 12, color: "#6B7280", ...POPPINS }}>Adjustment value</label>
                      <input
                        type="number"
                        step="0.01"
                        value={ruleAdjValue}
                        onChange={(e) => setRuleAdjValue(Number(e.target.value))}
                        style={{
                          width: "100%", height: 44, padding: "0 12px",
                          border: "0.5px solid #EEF2F7", borderRadius: 10, fontSize: 14,
                          marginTop: 6, background: "#fff", color: "#0B1F3A", ...POPPINS,
                        }}
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={addPricingRule}
                    disabled={savingRule || hasInvalidPostcodes}
                    className="w-full text-[14px] font-semibold text-white mt-4"
                    style={{
                      height: 48, borderRadius: 10, backgroundColor: "#0B1F3A", border: "none",
                      opacity: savingRule || hasInvalidPostcodes ? 0.6 : 1,
                      cursor: savingRule || hasInvalidPostcodes ? "not-allowed" : "pointer",
                      display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6,
                      ...POPPINS,
                    }}
                  >
                    <Plus size={16} /> {savingRule ? "Adding…" : "Add rule"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </Card>

        <SectionHeader>PUPILS</SectionHeader>
        <Card className="!p-0">
          <MenuRow
            icon={<ClipboardList size={18} color="#1877D6" />}
            iconBg="#E0F2FE"
            label="Intake questions"
            onClick={() => navigate({ to: "/intake-questions" })}
            isFirst
          />
          <MenuRow
            icon={<AlertTriangle size={18} color="#D97706" />}
            iconBg="#FEF3C7"
            label="No-show policy"
            onClick={() => navigate({ to: "/no-show-policy" })}
          />
        </Card>

        <SectionHeader>MARKETING</SectionHeader>
        <Card className="!p-0">
          <MenuRow
            icon={<Tag size={18} />}
            iconBg="#EEF2F7"
            label="Discount codes"
            onClick={() => navigate({ to: "/discount-codes" })}
            isFirst
          />
          <MenuRow
            icon={<Store size={18} color="#52525B" />}
            iconBg="#F4F4F5"
            label="Edit marketplace tiles"
            onClick={() => navigate({ to: "/marketplace/edit" })}
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
          <MenuRow
            icon={<Shield size={18} color="#1877D6" />}
            iconBg="#FEECEE"
            label="Admin"
            onClick={() => navigate({ to: "/admin" })}
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
  value,
  onClick,
  expanded,
  isFirst,
}: {
  icon: React.ReactNode;
  iconBg: string;
  label: string;
  value?: string;
  onClick: () => void;
  expanded?: boolean;
  isFirst?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-3 text-left"
      style={isFirst ? undefined : { borderTopWidth: "0.5px", borderTopStyle: "solid", borderTopColor: "#EEF2F7" }}
    >
      <div
        className="flex items-center justify-center rounded-full shrink-0"
        style={{ width: 36, height: 36, backgroundColor: iconBg }}
      >
        {icon}
      </div>
      <span className="flex-1 text-[14px] text-[#0B1F3A]" style={POPPINS}>{label}</span>
      {value ? (
        <span className="text-[13px] text-[#6B7280]" style={POPPINS}>{value}</span>
      ) : null}
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
      style={{ borderTopWidth: "0.5px", borderTopStyle: "solid", borderTopColor: "#EEF2F7", ...POPPINS }}
    >
      {text}
    </div>
  );
}
