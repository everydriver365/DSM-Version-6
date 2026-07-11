import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import WorkspaceDots from "../components/dsm/WorkspaceDots";

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
  LogOut,
  CreditCard,
  Calculator,
  Gift,
  Copy,
} from "lucide-react";
import { toast } from "sonner";


import { SectionHeader } from "../components/dsm/SectionHeader";
import {
  readMinGapMinutes,
  writeMinGapMinutes,
  DEFAULT_MIN_GAP_MINUTES,
} from "../lib/gapPrefs";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { supabase } from "../lib/supabaseClient";
import { PageLayout } from "@/components/PageLayout";
import { AddressLookup } from "@/components/dsm/AddressLookup";

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

type ExpandKey = string | null;

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
  
  const [expanded, setExpanded] = useState<ExpandKey>(null);
  const [signOutOpen, setSignOutOpen] = useState(false);
  const [passBookingFee, setPassBookingFee] = useState<boolean>(true);
  const [hourlyRate, setHourlyRate] = useState<number>(35);
  const [defaultDuration, setDefaultDuration] = useState<number>(60);
  const [bufferMinutes, setBufferMinutes] = useState<number>(15);
  const [minGapMinutes, setMinGapMinutes] = useState<number>(DEFAULT_MIN_GAP_MINUTES);
  const [bufferAfter, setBufferAfter] = useState<number>(15);

  useEffect(() => {
    setMinGapMinutes(readMinGapMinutes());
  }, []);
  const [savingRates, setSavingRates] = useState(false);
  const [homePostcode, setHomePostcode] = useState<string>("");
  const [homeAddress, setHomeAddress] = useState<string>("");
  const [homeCity, setHomeCity] = useState<string>("");
  const [homeLat, setHomeLat] = useState<number | null>(null);
  const [homeLng, setHomeLng] = useState<number | null>(null);
  const [postcodeBlurred, setPostcodeBlurred] = useState(false);
  const [coverageRadius, setCoverageRadius] = useState<number>(10);
  const [coverageAreaCount, setCoverageAreaCount] = useState<number>(0);
  const [calendarLastSynced, setCalendarLastSynced] = useState<string | null>(null);
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

  // === Section: No-show & cancellation policy + Lesson reminders (instructor_reminder_preferences) ===
  const [noShowFee, setNoShowFee] = useState<number>(0);
  const [lateCancelFee, setLateCancelFee] = useState<number>(0);
  const [lateCancelHours, setLateCancelHours] = useState<number>(24);
  const [autoChargeNoShow, setAutoChargeNoShow] = useState<boolean>(false);
  const [reminderEnabled, setReminderEnabled] = useState<boolean>(true);
  const [reminderHoursBefore, setReminderHoursBefore] = useState<number>(24);
  const [paymentReminderEnabled, setPaymentReminderEnabled] = useState<boolean>(true);
  const [paymentChaseMax, setPaymentChaseMax] = useState<number>(3); // 0 = unlimited
  const [morningBriefing, setMorningBriefing] = useState<boolean>(false);

  // === Section: Deposit / Payment options / Tax & expenses / Referral (instructors table) ===
  const [depositEnabled, setDepositEnabled] = useState<boolean>(false);
  const [depositAmount, setDepositAmount] = useState<number>(50);
  const [depositDeadlineDays, setDepositDeadlineDays] = useState<number>(7);
  const PAYMENT_METHODS = ["Cash", "Bank transfer (BACS)", "PayPal", "Card (via DSM)", "Klarna", "Clearpay", "Cheque"] as const;
  const [acceptedPaymentMethods, setAcceptedPaymentMethods] = useState<string[]>([]);
  const [paymentTerms, setPaymentTerms] = useState<string>("Before lesson");
  const [taxCode, setTaxCode] = useState<string>("1257L");
  const [isElectric, setIsElectric] = useState<boolean>(false);
  const [vehicleMpg, setVehicleMpg] = useState<number>(45);
  const [fuelCostPerLitre, setFuelCostPerLitre] = useState<number>(1.45);
  const [batteryKwh, setBatteryKwh] = useState<number>(60);
  const [electricityCostPerKwh, setElectricityCostPerKwh] = useState<number>(0.28);
  const DEDUCTIONS = [
    "Vehicle running costs", "Vehicle lease/finance", "Business insurance",
    "Phone & communications", "Use of home as office", "Internet/broadband",
    "Training & CPD", "ADI licence & badges", "Uniform/clothing",
    "Teaching equipment", "Franchise fees", "Accountancy fees",
  ] as const;
  const [claimedDeductions, setClaimedDeductions] = useState<string[]>([]);
  const [referralEnabled, setReferralEnabled] = useState<boolean>(false);
  const [referralDiscountAmount, setReferralDiscountAmount] = useState<number>(10);
  const [referralDiscountType, setReferralDiscountType] = useState<"fixed" | "percent">("fixed");
  const [referralCode, setReferralCode] = useState<string>("");

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

      // Coverage areas count for the settings row
      supabase
        .from("instructor_coverage_areas")
        .select("id", { count: "exact", head: true })
        .eq("instructor_id", user.id)
        .then(({ count, error: covErr }) => {
          if (covErr) {
            console.error("[settings] coverage count error", covErr);
            return;
          }
          if (typeof count === "number") setCoverageAreaCount(count);
        });

      const { data: instructor, error: instErr } = await supabase
        .from("instructors")
        .select("name, profile_image_url, pass_booking_fee, hourly_rate, default_lesson_duration_minutes, lesson_buffer_minutes, lesson_buffer_after, home_postcode, address, city, lat, lng, radius_miles, send_lesson_reminders, reminder_timing, publish_to_marketplace, featured_listing, featured_until, app_slug, external_calendar_last_synced_at")
        .eq("id", user.id)
        .maybeSingle();
      if (instErr) console.error("[settings] instructor fetch error", instErr);
      if (instructor?.name) setInstructorName(instructor.name);
      if (instructor?.profile_image_url) setAvatarUrl(instructor.profile_image_url);
      const lastSync = (instructor as unknown as { external_calendar_last_synced_at?: string | null } | null)?.external_calendar_last_synced_at;
      if (lastSync) setCalendarLastSynced(lastSync);
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
      if (instructor && typeof (instructor as { lesson_buffer_after?: number }).lesson_buffer_after === "number") {
        setBufferAfter((instructor as { lesson_buffer_after: number }).lesson_buffer_after);
      }
      // NOTE: instructors.min_gap_minutes column does not exist in the DB.
      // min_gap_minutes is a client-only preference stored in localStorage via
      // readMinGapMinutes / writeMinGapMinutes.
      if (instructor && typeof (instructor as { home_postcode?: string }).home_postcode === "string") {
        setHomePostcode((instructor as { home_postcode: string }).home_postcode);
      }
      if (instructor && typeof (instructor as { address?: string }).address === "string") {
        setHomeAddress((instructor as { address: string }).address);
      }
      if (instructor && typeof (instructor as { city?: string }).city === "string") {
        setHomeCity((instructor as { city: string }).city);
      }
      {
        const la = (instructor as { lat?: number | null } | null)?.lat;
        if (typeof la === "number") setHomeLat(la);
      }
      {
        const ln = (instructor as { lng?: number | null } | null)?.lng;
        if (typeof ln === "number") setHomeLng(ln);
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


      await loadPricingRules(user.id);

      // Load reminder preferences
      const { data: prefs } = await supabase
        .from("instructor_reminder_preferences")
        .select("no_show_fee, late_cancel_fee, late_cancel_hours, auto_charge_no_show, reminder_enabled, reminder_hours_before, payment_reminder_enabled, payment_chase_max_reminders, morning_briefing")
        .eq("instructor_id", user.id)
        .maybeSingle();
      if (prefs) {
        const p = prefs as Record<string, unknown>;
        if (typeof p.no_show_fee === "number") setNoShowFee(p.no_show_fee);
        if (typeof p.late_cancel_fee === "number") setLateCancelFee(p.late_cancel_fee);
        if (typeof p.late_cancel_hours === "number") setLateCancelHours(p.late_cancel_hours);
        if (typeof p.auto_charge_no_show === "boolean") setAutoChargeNoShow(p.auto_charge_no_show);
        if (typeof p.reminder_enabled === "boolean") setReminderEnabled(p.reminder_enabled);
        if (typeof p.reminder_hours_before === "number") setReminderHoursBefore(p.reminder_hours_before);
        if (typeof p.payment_reminder_enabled === "boolean") setPaymentReminderEnabled(p.payment_reminder_enabled);
        if (typeof p.payment_chase_max_reminders === "number") setPaymentChaseMax(p.payment_chase_max_reminders);
        if (typeof p.morning_briefing === "boolean") setMorningBriefing(p.morning_briefing);
      }

      // Load extended instructor fields (deposit/payment/tax/referral)
      const { data: extra } = await supabase
        .from("instructors")
        .select("deposit_enabled, deposit_amount, deposit_deadline_days, accepted_payment_methods, payment_terms, tax_code, vehicle_mpg, fuel_cost_per_litre, is_electric, electricity_cost_per_kwh, battery_kwh, claimed_deductions, referral_enabled, referral_discount_amount, referral_discount_type, referral_code")
        .eq("id", user.id)
        .maybeSingle();
      if (extra) {
        const e = extra as Record<string, unknown>;
        if (typeof e.deposit_enabled === "boolean") setDepositEnabled(e.deposit_enabled);
        if (typeof e.deposit_amount === "number") setDepositAmount(e.deposit_amount);
        if (typeof e.deposit_deadline_days === "number") setDepositDeadlineDays(e.deposit_deadline_days);
        if (Array.isArray(e.accepted_payment_methods)) setAcceptedPaymentMethods(e.accepted_payment_methods as string[]);
        if (typeof e.payment_terms === "string" && e.payment_terms) setPaymentTerms(e.payment_terms);
        if (typeof e.tax_code === "string" && e.tax_code) setTaxCode(e.tax_code);
        if (typeof e.vehicle_mpg === "number") setVehicleMpg(e.vehicle_mpg);
        if (typeof e.fuel_cost_per_litre === "number") setFuelCostPerLitre(e.fuel_cost_per_litre);
        if (typeof e.is_electric === "boolean") setIsElectric(e.is_electric);
        if (typeof e.electricity_cost_per_kwh === "number") setElectricityCostPerKwh(e.electricity_cost_per_kwh);
        if (typeof e.battery_kwh === "number") setBatteryKwh(e.battery_kwh);
        if (Array.isArray(e.claimed_deductions)) setClaimedDeductions(e.claimed_deductions as string[]);
        if (typeof e.referral_enabled === "boolean") setReferralEnabled(e.referral_enabled);
        if (typeof e.referral_discount_amount === "number") setReferralDiscountAmount(e.referral_discount_amount);
        if (e.referral_discount_type === "fixed" || e.referral_discount_type === "percent") setReferralDiscountType(e.referral_discount_type);
        if (typeof e.referral_code === "string") setReferralCode(e.referral_code);
      }
    })();
  }, []);

  async function saveReminderPrefs(patch: Record<string, unknown>) {
    if (!userId) return;
    const { error } = await supabase
      .from("instructor_reminder_preferences")
      .upsert({ instructor_id: userId, ...patch }, { onConflict: "instructor_id" });
    if (error) {
      console.error("[settings] save reminder prefs error", error);
      toast.error("Could not save");
    } else {
      toast.success("Saved ✓");
    }
  }

  async function saveInstructorPatch(patch: Record<string, unknown>) {
    if (!userId) return;
    const { error } = await supabase.from("instructors").update(patch).eq("id", userId);
    if (error) {
      console.error("[settings] save instructor patch error", error);
      toast.error("Could not save");
    } else {
      toast.success("Saved ✓");
    }
  }

  function generateReferralCode() {
    const base = (displayName || instructorName || email.split("@")[0] || "REF").split(/\s+/)[0].toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8) || "REF";
    const rand = Math.random().toString(36).toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 4).padEnd(4, "X");
    return `${base}${rand}`;
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

  async function togglePublishToMarketplace() {
    if (!userId) return;
    const next = !publishToMarketplace;
    setPublishToMarketplace(next);
    const { error: instErr } = await supabase
      .from("instructors")
      .update({ publish_to_marketplace: next })
      .eq("id", userId);
    if (instErr) {
      console.error("[settings] toggle publish_to_marketplace error", instErr);
      setPublishToMarketplace(!next);
      toast.error("Could not update listing");
      return;
    }
    const courseUpdate = supabase.from("instructor_courses").update({ publish_marketplace: next }).eq("instructor_id", userId);
    const { error: courseErr } = await (next ? courseUpdate.eq("status", "active") : courseUpdate);
    if (courseErr) {
      console.error("[settings] update instructor_courses error", courseErr);
    }
    if (next) {
      toast.success("You're now listed on EveryDriver");
    } else {
      toast.success("Your listings have been removed from EveryDriver");
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
        // min_gap_minutes is client-only (localStorage); column not in DB.
      })
      .eq("id", userId);
    setSavingRates(false);
    if (error) {
      console.error("[settings] save rates error", error);
      toast.error("Failed to save rates");
    } else {
      writeMinGapMinutes(minGapMinutes);
      toast.success("Saved ✓");
    }
  }

  async function saveBuffers(nextAfter: number) {
    if (!userId) return;
    const { error } = await supabase
      .from("instructors")
      .update({ lesson_buffer_after: nextAfter })
      .eq("id", userId);
    if (error) {
      console.error("[settings] save buffers error", error);
      toast.error("Failed to save buffers");
    } else {
      toast.success("Buffer settings saved");
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
      // If we don't yet have lat/lng (user typed but never hit Lookup),
      // resolve via postcodes.io before saving.
      let lat = homeLat;
      let lng = homeLng;
      let address = homeAddress;
      let city = homeCity;
      if (lat == null || lng == null) {
        const res = await fetch(
          `https://api.postcodes.io/postcodes/${encodeURIComponent(pc)}`,
        );
        if (!res.ok) {
          toast.error("Postcode not found");
          setSavingCoverage(false);
          return;
        }
        const json = await res.json();
        const r = json?.result ?? {};
        lat = typeof r.latitude === "number" ? r.latitude : null;
        lng = typeof r.longitude === "number" ? r.longitude : null;
        if (!address) {
          const parts = [r.admin_ward, r.admin_district, r.region].filter(
            (x: unknown): x is string => typeof x === "string" && x.length > 0,
          );
          address = parts.length ? parts.join(", ") : pc;
        }
        if (!city) {
          city = r.admin_district || r.parish || r.admin_county || r.region || "";
        }
      }
      const { error } = await supabase
        .from("instructors")
        .update({
          home_postcode: pc,
          address,
          city,
          lat,
          lng,
          radius_miles: coverageRadius,
        })
        .eq("id", userId);
      if (error) {
        console.error("[settings] save coverage error", error);
        toast.error("Failed to save coverage");
      } else {
        setHomePostcode(pc);
        setHomeAddress(address);
        setHomeCity(city);
        setHomeLat(lat);
        setHomeLng(lng);
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
    <PageLayout className="pb-24 pb-safe" style={POPPINS}>
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
      <WorkspaceDots activeLabel="Settings" />


      {/* Profile header */}
      <div className="mx-4 mt-3" style={{ marginBottom: 20 }}>
        <div
          style={{
            background: "#FFFFFF",
            borderRadius: 16,
            padding: 16,
            boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
            display: "flex",
            alignItems: "center",
            gap: 14,
          }}
        >
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt="Profile"
              style={{ width: 52, height: 52, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }}
            />
          ) : (
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: "50%",
                background: "#185FA5",
                color: "#FFFFFF",
                fontSize: 20,
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                ...POPPINS,
              }}
            >
              {initials(displayedName)}
            </div>
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: 16,
                fontWeight: 600,
                color: "#12142B",
                textTransform: "capitalize",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                ...POPPINS,
              }}
            >
              {displayedName}
            </div>
            <div
              style={{
                fontSize: 12,
                color: "#8A94A6",
                marginTop: 1,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                ...POPPINS,
              }}
            >
              {email || "—"}
            </div>
          </div>
          <button
            type="button"
            onClick={() => navigate({ to: "/profile" })}
            style={{
              background: "#EEF2F7",
              border: "none",
              borderRadius: 10,
              padding: "8px 14px",
              fontSize: 12,
              fontWeight: 500,
              color: "#12142B",
              cursor: "pointer",
              flexShrink: 0,
              ...POPPINS,
            }}
          >
            Edit profile
          </button>
        </div>
      </div>

      <div
        className="mx-4 mt-3 flex items-center cursor-pointer"
        onClick={() => navigate({ to: "/availability-settings" as never })}
        style={{
          background: "#FFFFFF",
          border: "0.5px solid #E2E6ED",
          borderRadius: 12,
          padding: 16,
          gap: 12,
        }}
      >
        <div
          className="flex items-center justify-center rounded-xl"
          style={{ width: 44, height: 44, background: "#E0F4FF", flexShrink: 0 }}
        >
          <Clock color="#1A52A0" size={22} />
        </div>
        <div className="flex-1 min-w-0 flex flex-col">
          <span
            className="font-semibold"
            style={{ fontSize: 14, color: "#0F2044", ...POPPINS }}
          >
            Availability & working hours
          </span>
          <span
            style={{ fontSize: 12, color: "#9CA3AF", marginTop: 2, ...POPPINS }}
          >
            Working days, hours, buffers, lunch break, time off, travel time
          </span>
        </div>
        <ChevronRight color="#D1D5DB" size={18} />
      </div>


      <div className="px-4">
        <Label>ACCOUNT</Label>
        <div style={{ backgroundColor: 'white', borderRadius: '14px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', marginBottom: '20px' }}>
          <MenuRow
            icon={<User color="#185FA5" />}
            iconBg="#E6F1FB"
            label="Profile"
            onClick={() => navigate({ to: "/profile" })}
            isFirst
            isLast={false}
          />
          <MenuRow
            icon={<PoundSterling color="#A32D2D" />}
            iconBg="#FCEBEB"
            label="Payments"
            onClick={() => navigate({ to: "/payments" })}
            isLast={false}
          />
          <MenuRow
            icon={<Bell color="#B5661E" />}
            iconBg="#FBEFE1"
            label="Notifications"
            onClick={() => navigate({ to: "/notificationsettings" })}
            isLast={false}
          />
          <MenuRow
            icon={<Calendar color="#6B4FD6" />}
            iconBg="#F0EBFF"
            label="Calendar sync"
            onClick={() => navigate({ to: "/calendarsync" })}
            isLast={false}
            warning={
              calendarLastSynced &&
              Date.now() - new Date(calendarLastSynced).getTime() > 6 * 60 * 60 * 1000
                ? "Sync overdue"
                : undefined
            }
          />
          <MenuRow
            icon={<Crown color="#185FA5" />}
            iconBg="#E6F1FB"
            label="My plan"
            value="DSM Free"
            onClick={() => navigate({ to: "/subscription" })}
            isLast
          />
        </div>

        <Label>PAYMENTS</Label>
        <div style={{ backgroundColor: 'white', borderRadius: '14px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', marginBottom: '20px' }}>
          <MenuRow
            icon={<PoundSterling color="#A32D2D" />}
            iconBg="#FCEBEB"
            label="Pass booking fee to pupil"
            expanded={expanded === "payments"}
            onClick={() => setExpanded(expanded === "payments" ? null : "payments")}
            isFirst
            isLast
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
        </div>

        <Label>LESSON REMINDERS</Label>
        <div style={{ backgroundColor: 'white', borderRadius: '14px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', marginBottom: '20px' }}>
          <MenuRow
            icon={<Clock color="#B5661E" />}
            iconBg="#FBEFE1"

            label="Lesson reminders"
            expanded={expanded === "lessons"}
            onClick={() => setExpanded(expanded === "lessons" ? null : "lessons")}
            isFirst
            isLast
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
        </div>

        <Label>RATES & SCHEDULING</Label>
        <SectionCard>
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

              {/* Lesson buffers (before/after) */}
              <div
                className="pt-4 mt-4"
                style={{ borderTopWidth: "0.5px", borderTopStyle: "solid", borderTopColor: "#EEF2F7" }}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Clock size={14} color="#0F2044" />
                  <div className="text-[14px] font-bold" style={{ color: "#0F2044", ...POPPINS }}>
                    Lesson buffer
                  </div>
                </div>
                <div className="text-[12px] mb-4" style={{ color: "#9CA3AF", ...POPPINS }}>
                  Time between lessons for notes, travel and preparation.
                </div>
                <div
                  className="flex items-center justify-between"
                  style={{ paddingTop: 10, paddingBottom: 10 }}
                >
                  <div className="text-[14px]" style={{ color: "#0F2044", ...POPPINS }}>Gap after each lesson</div>
                  <select
                    value={bufferAfter}
                    onChange={(e) => {
                      const v = parseInt(e.target.value, 10);
                      setBufferAfter(v);
                      void saveBuffers(v);
                    }}
                    className="text-[13px]"
                    style={{ height: 36, borderRadius: 8, border: "0.5px solid #E2E6ED", padding: "0 8px", backgroundColor: "#fff", color: "#0F2044", ...POPPINS }}
                  >
                    {[0, 5, 10, 15, 20, 30, 45, 60].map((m) => (
                      <option key={m} value={m}>{m} min</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Minimum gap shown on schedule */}
              <div
                className="flex items-center gap-3 pt-4 mt-4"
                style={{ borderTopWidth: "0.5px", borderTopStyle: "solid", borderTopColor: "#EEF2F7" }}
              >
                <div className="flex-1 min-w-0">
                  <div className="text-[14px] font-medium text-[#0B1F3A]" style={POPPINS}>
                    Minimum gap to show
                  </div>
                  <div className="text-[12px] text-[#6B7280] mt-1" style={POPPINS}>
                    Free gaps shorter than this are hidden on the schedule
                  </div>
                </div>
                <select
                  value={minGapMinutes}
                  onChange={(e) => setMinGapMinutes(parseInt(e.target.value, 10))}
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
        </SectionCard>

        <Label>COVERAGE AREA</Label>
        <div
          onClick={() => navigate({ to: "/coverage-areas" as never })}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              navigate({ to: "/coverage-areas" as never });
            }
          }}
          style={{
            margin: "0 0 0 0",
            backgroundColor: "#fff",
            border: "0.5px solid #E2E6ED",
            borderRadius: 12,
            padding: 16,
            display: "flex",
            alignItems: "center",
            gap: 12,
            cursor: "pointer",
            ...POPPINS,
          }}
        >
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              backgroundColor: "#E0F4FF",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <MapPin size={22} color="#1A52A0" />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#0F2044" }}>Coverage areas</div>
            <div style={{ fontSize: 12, color: "#9CA3AF", marginTop: 2 }}>
              {coverageAreaCount > 0
                ? `${coverageAreaCount} ${coverageAreaCount === 1 ? "area" : "areas"} defined`
                : "No areas set"}
            </div>
          </div>
          <ChevronRight size={18} color="#D1D5DB" />
        </div>


        <Label>PRICING RULES</Label>
        <SectionCard>
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
        </SectionCard>

        <Label>PUPILS</Label>
        <SectionCard>
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
        </SectionCard>

        <Label>MARKETING</Label>
        <SectionCard>
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
        </SectionCard>

        <Label>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <Globe size={14} color="#6B7280" /> EVERYDRIVER
          </span>
        </Label>
        <SectionCard>
          {/* Row 1: List on marketplace toggle */}
          <div
            className="px-4 py-3 flex items-start gap-3"
          >
            <div
              className="flex items-center justify-center"
              style={{ width: 34, height: 34, minWidth: 34, minHeight: 34, borderRadius: 10, backgroundColor: "#DBEAFE", flexShrink: 0 }}
            >
              <Globe size={18} color="#1877D6" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[14px] font-medium text-[#0B1F3A]" style={POPPINS}>
                List me on EveryDriver
              </div>
              <div className="text-[12px] text-[#6B7280] mt-1" style={POPPINS}>
                Your courses appear in EveryDriver search results and your mini website is publicly visible
              </div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={publishToMarketplace}
              aria-label="List me on EveryDriver"
              onClick={togglePublishToMarketplace}
              style={{
                width: 44,
                height: 26,
                borderRadius: 13,
                background: publishToMarketplace ? "#1877D6" : "#D1D5DB",
                border: "none",
                position: "relative",
                cursor: "pointer",
                flexShrink: 0,
                transition: "background 0.2s",
                marginTop: 4,
              }}
            >
              <span
                style={{
                  position: "absolute",
                  top: 3,
                  left: publishToMarketplace ? 21 : 3,
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

          {/* Row 2: Featured status */}
          <div
            className="px-4 py-3 flex items-center gap-3"
            style={{ borderTopWidth: "0.5px", borderTopStyle: "solid", borderTopColor: "#EEF2F7" }}
          >
            <div
              className="flex items-center justify-center"
              style={{ width: 34, height: 34, minWidth: 34, minHeight: 34, borderRadius: 10, backgroundColor: "#FEF3C7", flexShrink: 0 }}
            >
              <Crown size={18} color="#D97706" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[14px] font-medium text-[#0B1F3A]" style={POPPINS}>
                Featured status
              </div>
              {featuredListing && featuredUntil && new Date(featuredUntil) > new Date() ? (
                <span
                  className="inline-flex items-center gap-1 mt-1"
                  style={{
                    fontSize: 12,
                    color: "#0F7B3F",
                    background: "#E8F5EC",
                    padding: "2px 8px",
                    borderRadius: 999,
                    ...POPPINS,
                  }}
                >
                  Featured until{" "}
                  {new Date(featuredUntil).toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </span>
              ) : (
                <div className="mt-1 flex items-center gap-2 flex-wrap">
                  <span
                    style={{
                      fontSize: 12,
                      color: "#6B7280",
                      background: "#F4F4F5",
                      padding: "2px 8px",
                      borderRadius: 999,
                      ...POPPINS,
                    }}
                  >
                    Not featured
                  </span>
                  <button
                    type="button"
                    onClick={() => navigate({ to: "/marketplace/apply" })}
                    style={{
                      background: "transparent",
                      border: "none",
                      padding: 0,
                      color: "#1877D6",
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: "pointer",
                      ...POPPINS,
                    }}
                  >
                    Apply to get featured →
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Row 3: View profile link */}
          <button
            type="button"
            onClick={() => {
              if (!appSlug) {
                toast.error("Your EveryDriver profile is not set up yet");
                return;
              }
              window.open(`https://everydriver.co.uk/i/${appSlug}`, "_blank", "noopener,noreferrer");
            }}
            className="w-full flex items-center gap-3 px-4 py-3 text-left"
            style={{ borderTopWidth: "0.5px", borderTopStyle: "solid", borderTopColor: "#EEF2F7" }}
          >
            <div
              className="flex items-center justify-center"
              style={{ width: 34, height: 34, minWidth: 34, minHeight: 34, borderRadius: 10, backgroundColor: "#DBEAFE", flexShrink: 0 }}
            >
              <Globe size={18} color="#1877D6" />
            </div>
            <span className="flex-1 text-[14px] text-[#0B1F3A]" style={POPPINS}>
              View my EveryDriver profile
            </span>
            <ChevronRight size={18} color="#6B7280" />
          </button>
        </SectionCard>

        <Label>SUPPORT</Label>
        <SectionCard>
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
        </SectionCard>

        <SectionCard>
          <MenuRow
            icon={<LogOut color="#A32D2D" />}
            iconBg="#FCEBEB"
            label="Sign out"
            labelColor="#A32D2D"
            hideChevron
            isFirst
            onClick={() => setSignOutOpen(true)}
          />
        </SectionCard>

      </div>

      <ConfirmDialog
        open={signOutOpen}
        title="Sign out?"
        confirmLabel="Sign out"
        onConfirm={signOut}
        onCancel={() => setSignOutOpen(false)}
      />
    </PageLayout>
  );
}

function MenuRow({
  icon,
  iconBg,
  label,
  subLabel,
  value,
  onClick,
  expanded,
  isFirst,
  isLast,
  labelColor,
  hideChevron,
  warning,
}: {
  icon: React.ReactNode;
  iconBg: string;
  label: string;
  subLabel?: string;
  value?: string;
  onClick: () => void;
  expanded?: boolean;
  isFirst?: boolean;
  isLast?: boolean;
  labelColor?: string;
  hideChevron?: boolean;
  warning?: string;
}) {
  const dividerStyle: React.CSSProperties | undefined =
    isLast === undefined
      ? isFirst
        ? undefined
        : { borderTopWidth: "0.5px", borderTopStyle: "solid", borderTopColor: "#EEF2F7" }
      : isLast
        ? undefined
        : { borderBottomWidth: "0.5px", borderBottomStyle: "solid", borderBottomColor: "#EEF2F7" };

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center text-left [&_svg]:!w-[17px] [&_svg]:!h-[17px]"
      style={{
        gap: 12,
        padding: "13px 16px",
        ...dividerStyle,
      }}
    >
      <div
        className="flex items-center justify-center"
        style={{ width: 34, height: 34, minWidth: 34, minHeight: 34, borderRadius: 10, backgroundColor: iconBg, flexShrink: 0 }}
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0 flex flex-col">
        <span
          className="truncate flex items-center gap-2"
          style={{ fontSize: 14, fontWeight: 500, color: labelColor ?? "#12142B", ...POPPINS }}
        >
          {label}
          {warning ? (
            <span
              aria-hidden
              style={{
                width: 8,
                height: 8,
                borderRadius: 999,
                background: "#D97706",
                display: "inline-block",
                flexShrink: 0,
              }}
            />
          ) : null}
        </span>
        {warning ? (
          <span
            className="truncate"
            title={warning}
            style={{ fontSize: 11, color: "#D97706", ...POPPINS, marginTop: 2 }}
          >
            {warning}
          </span>
        ) : subLabel ? (
          <span
            className="truncate"
            title={subLabel}
            style={{ fontSize: 11, color: "#9CA3AF", ...POPPINS, marginTop: 2 }}
          >
            {subLabel}
          </span>
        ) : null}
      </div>
      {value ? (
        <span
          style={{
            background: "#E6F1FB",
            color: "#185FA5",
            fontSize: 10,
            fontWeight: 600,
            padding: "3px 9px",
            borderRadius: 20,
            marginRight: 4,
            ...POPPINS,
          }}
        >
          {value}
        </span>
      ) : null}
      {hideChevron ? null : expanded ? (
        <ChevronDown size={15} color="#B0BAC9" />
      ) : (
        <ChevronRight size={15} color="#B0BAC9" />
      )}
    </button>
  );
}

// Section label — plain caption, no left accent bar.
function Label({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="mb-2"
      style={{
        marginTop: 20,
        paddingLeft: 4,
        fontSize: 11,
        fontWeight: 500,
        color: "#B0BAC9",
        letterSpacing: "0.04em",
        textTransform: "uppercase",
        ...POPPINS,
      }}
    >
      {children}
    </div>
  );
}

// White section card wrapping menu rows.
function SectionCard({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div
      style={{
        background: "#FFFFFF",
        borderRadius: 14,
        overflow: "hidden",
        boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
        marginBottom: 20,
        ...style,
      }}
    >
      {children}
    </div>
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
