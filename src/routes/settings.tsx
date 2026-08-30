import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { tokens } from "@/lib/tokens";
import { useEffect, useState } from "react";
import { IconAlertCircle, IconAlertTriangle, IconBell, IconBolt, IconBuildingBank, IconBuildingStore, IconCalculator, IconCalendar, IconCalendarCheck, IconCheck, IconChevronDown, IconChevronRight, IconClipboardList, IconClock, IconCopy, IconCreditCard, IconCrown, IconCurrencyPound, IconFileText, IconFingerprint, IconFlag, IconGift, IconHelp, IconLogout, IconMapPin, IconMicrophone, IconPlus, IconRobot, IconSchool, IconSettings, IconShield, IconShoppingBag, IconTag, IconTrash, IconUser, IconWorld } from "@tabler/icons-react";
import { isBiometricAvailable, authenticate } from "@/lib/biometric";
import squareLogo from "../assets/square-logo.png.asset.json";



import { toast } from "@/lib/toast";



import {
  readMinGapMinutes,
  writeMinGapMinutes,
  DEFAULT_MIN_GAP_MINUTES,
} from "../lib/gapPrefs";
import {
  readBadgePrefs,
  writeBadgePrefs,
  DEFAULT_BADGE_PREFS,
} from "../lib/badgePrefs";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { useVoiceAssistant } from "../hooks/useVoiceAssistant";
import { supabase } from "../lib/supabaseClient";
import { AddressLookup } from "@/components/dsm/AddressLookup";
import DSMTopSheet from "@/components/dsm/DSMTopSheet";
import { SaveButton, SaveFooter } from "@/components/dsm/SaveFooter";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — EDP by EveryDriver" },
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
  const [biometricLockEnabled, setBiometricLockEnabled] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);

  useEffect(() => {
    try {
      setBiometricLockEnabled(localStorage.getItem("dsm_biometric_lock") === "true");
    } catch {
      /* ignore */
    }
    isBiometricAvailable().then(setBiometricAvailable).catch(() => {});
  }, []);

  async function toggleBiometricLock(val: boolean) {
    if (val) {
      const success = await authenticate("Enable biometric lock");
      if (!success) return;
      setBiometricLockEnabled(true);
      try { localStorage.setItem("dsm_biometric_lock", "true"); } catch { /* ignore */ }
      toast.success("Face ID lock enabled");
    } else {
      setBiometricLockEnabled(false);
      try { localStorage.removeItem("dsm_biometric_lock"); } catch { /* ignore */ }
      toast.success("Face ID lock disabled");
    }
  }
  const [email, setEmail] = useState<string>("");
  const [instructorName, setInstructorName] = useState<string>("");
  const [displayName, setDisplayName] = useState<string>("");
  const [phone, setPhone] = useState<string>("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  
  const [expanded, setExpanded] = useState<ExpandKey>(null);
  const [signOutOpen, setSignOutOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const { availableVoices, selectedVoiceName, setVoice, speak, isSpeaking } = useVoiceAssistant({});
  const [hourlyRate, setHourlyRate] = useState<number>(35);
  const [defaultDuration, setDefaultDuration] = useState<number>(60);
  const [bufferMinutes, setBufferMinutes] = useState<number>(15);
  const [minGapMinutes, setMinGapMinutes] = useState<number>(DEFAULT_MIN_GAP_MINUTES);
  const [bufferAfter, setBufferAfter] = useState<number>(15);
  const [badgePrefs, setBadgePrefs] = useState<{
    issues: boolean;
    chat: boolean;
    admin: boolean;
  }>(DEFAULT_BADGE_PREFS);

  useEffect(() => {
    setMinGapMinutes(readMinGapMinutes());
    supabase.auth.getUser().then(({ data }) => {
      if (data.user?.id) setBadgePrefs(readBadgePrefs(data.user.id));
    });
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
  const [noShowPercent, setNoShowPercent] = useState<number>(100);
  const [cancellationTiers, setCancellationTiers] = useState<Array<{ hours: number; charge_percent: number }>>([
    { hours: 24, charge_percent: 100 },
    { hours: 48, charge_percent: 50 },
  ]);
  const [autoChargeNoShow, setAutoChargeNoShow] = useState<boolean>(false);
  const [reminderEnabled, setReminderEnabled] = useState<boolean>(true);
  const [reminderHoursBefore, setReminderHoursBefore] = useState<number>(24);
  const [paymentReminderEnabled, setPaymentReminderEnabled] = useState<boolean>(true);
  const [paymentChaseMax, setPaymentChaseMax] = useState<number>(3); // 0 = unlimited
  const [morningBriefing, setMorningBriefing] = useState<boolean>(false);
  const [autoTrackLessons, setAutoTrackLessons] = useState<boolean>(false);

  // === Square card payments (standalone tile) ===
  const [squareConnected, setSquareConnected] = useState(false);
  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      const { data: inst } = await supabase
        .from("instructors")
        .select("square_merchant_id")
        .eq("id", data.user.id)
        .maybeSingle();
      setSquareConnected(!!inst?.square_merchant_id);
    });
  }, []);

  // === Payment methods (Square / PayPal.me / Bank transfer) ===
  const [paypalUsername, setPaypalUsername] = useState<string>("");
  const [bankAccountName, setBankAccountName] = useState<string>("");
  const [bankSortCode, setBankSortCode] = useState<string>("");
  const [bankAccountNumber, setBankAccountNumber] = useState<string>("");
  const [activePaymentMethod, setActivePaymentMethod] = useState<"square" | "paypal" | "bank">("square");
  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      const { data: row, error } = await supabase
        .from("instructors")
        .select("paypal_me_username, bank_account_name, bank_sort_code, bank_account_number, active_payment_method")
        .eq("id", data.user.id)
        .maybeSingle();
      if (error || !row) return;
      const r = row as Record<string, string | null>;
      setPaypalUsername(r.paypal_me_username ?? "");
      setBankAccountName(r.bank_account_name ?? "");
      setBankSortCode(r.bank_sort_code ?? "");
      setBankAccountNumber(r.bank_account_number ?? "");
      const m = r.active_payment_method;
      if (m === "paypal" || m === "bank" || m === "square") setActivePaymentMethod(m);
    });
  }, []);


  // === Section: Deposit / Payment options / Tax & expenses / Referral (instructors table) ===
  const [depositEnabled, setDepositEnabled] = useState<boolean>(false);
  const [depositAmount, setDepositAmount] = useState<number>(50);
  const [depositDeadlineDays, setDepositDeadlineDays] = useState<number>(7);
  const PAYMENT_METHODS = ["Cash", "Bank transfer (BACS)", "PayPal", "Card (via EDP)", "Klarna", "Clearpay", "Cheque"] as const;
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
      setBadgePrefs(readBadgePrefs(user.id));

      // Check admin role
      supabase
        .from("user_roles")
        .select("role", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("role", "admin")
        .then(({ count, error: roleErr }) => {
          if (roleErr) {
            console.error("[settings] admin role check error", roleErr);
            return;
          }
          setIsAdmin(typeof count === "number" && count > 0);
        });

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
        .select("name, profile_image_url, hourly_rate, default_lesson_duration_minutes, lesson_buffer_minutes, lesson_buffer_after, home_postcode, address, city, lat, lng, radius_miles, send_lesson_reminders, reminder_timing, publish_to_marketplace, featured_listing, featured_until, app_slug, external_calendar_last_synced_at")
        .eq("id", user.id)
        .maybeSingle();
      if (instErr) console.error("[settings] instructor fetch error", instErr);
      if (instructor?.name) setInstructorName(instructor.name);
      if (instructor?.profile_image_url) setAvatarUrl(instructor.profile_image_url);
      const lastSync = (instructor as unknown as { external_calendar_last_synced_at?: string | null } | null)?.external_calendar_last_synced_at;
      if (lastSync) setCalendarLastSynced(lastSync);
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
        .select("no_show_charge_percent, cancellation_tiers, auto_charge_no_show, reminder_enabled, reminder_hours_before, payment_reminder_enabled, payment_chase_max_reminders, morning_briefing, auto_track_lessons")
        .eq("instructor_id", user.id)
        .maybeSingle();
      if (prefs) {
        const p = prefs as Record<string, unknown>;
        if (typeof p.no_show_charge_percent === "number") setNoShowPercent(p.no_show_charge_percent);
        if (typeof p.cancellation_tiers === "string") {
          try {
            const parsed = JSON.parse(p.cancellation_tiers);
            if (Array.isArray(parsed) && parsed.length > 0) setCancellationTiers(parsed);
          } catch { /* keep defaults */ }
        } else if (Array.isArray(p.cancellation_tiers) && p.cancellation_tiers.length > 0) {
          setCancellationTiers(p.cancellation_tiers as Array<{ hours: number; charge_percent: number }>);
        }
        if (typeof p.auto_charge_no_show === "boolean") setAutoChargeNoShow(p.auto_charge_no_show);
        if (typeof p.reminder_enabled === "boolean") setReminderEnabled(p.reminder_enabled);
        if (typeof p.reminder_hours_before === "number") setReminderHoursBefore(p.reminder_hours_before);
        if (typeof p.payment_reminder_enabled === "boolean") setPaymentReminderEnabled(p.payment_reminder_enabled);
        if (typeof p.payment_chase_max_reminders === "number") setPaymentChaseMax(p.payment_chase_max_reminders);
        if (typeof p.morning_briefing === "boolean") setMorningBriefing(p.morning_briefing);
        if (typeof p.auto_track_lessons === "boolean") setAutoTrackLessons(p.auto_track_lessons);
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
    <DSMTopSheet title="Settings">
      <div style={{ ...POPPINS, background: "#DCE4F0", flex: 1 }}>
      


      {/* Profile card */}
      <div className="mx-4 mt-3" style={{ marginBottom: 20 }}>
        <div
          style={{
            background: tokens.white,
            borderRadius: tokens.radiusCard,
            padding: 16,
            boxShadow: "0 4px 0 #E4E4E8",
            display: "flex",
            alignItems: "center",
            gap: 14,
          }}
        >
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt="Profile"
              style={{ width: 56, height: 56, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }}
            />
          ) : (
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: "50%",
                background: tokens.blue,
                color: tokens.white,
                fontSize: 20,
                fontWeight: tokens.fontWeight.extrabold,
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
                fontSize: tokens.fontSize.xl,
                fontWeight: tokens.fontWeight.extrabold,
                color: "#000000",
                letterSpacing: -0.2,
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
                fontSize: 12.5,
                color: "#8A8A8E",
                marginTop: 2,
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
              background: "#F2F2F7",
              border: "none",
              borderRadius: tokens.radiusCard,
              padding: "12px 16px",
              fontSize: 12.5,
              fontWeight: tokens.fontWeight.bold,
              color: tokens.navy,
              cursor: "pointer",
              flexShrink: 0,
              ...POPPINS,
            }}
          >
            Edit profile
          </button>
        </div>
      </div>

      <div className="px-4" style={{ paddingBottom: 32 }}>
        {/* My profile */}
        <Label>My profile</Label>
        <SectionCard>
          <MenuRow
            icon={<IconUser size={18} color="#2C97DE" />}
            iconBg="#EAF5FC"
            label="Personal details"
            subLabel="Name, email, photo and instructor profile"
            onClick={() => navigate({ to: "/profile" })}
            isFirst
            isLast
          />
        </SectionCard>

        {/* Teaching */}
        <Label>Teaching</Label>
        <SectionCard>
          <MenuRow
            icon={<IconCalendarCheck size={18} color="#2C97DE" />}
            iconBg="#EAF5FC"
            label="Availability & working hours"
            subLabel="Working days, hours, buffers, lunch break, time off, travel time"
            onClick={() => navigate({ to: "/availability-settings" as never })}
            isFirst
          />
          <MenuRow
            icon={<IconMapPin size={18} color="#2C97DE" />}
            iconBg="#EAF5FC"
            label="Coverage areas"
            subLabel="Where you teach and how far you travel"
            onClick={() => navigate({ to: "/coverage-areas" as never })}
          />
          <MenuRow
            icon={<IconCurrencyPound size={18} color="#2C97DE" />}
            iconBg="#EAF5FC"
            label="Postcode rates"
            subLabel="Automatic pricing by location"
            onClick={() => navigate({ to: "/postcode-rates" as never })}
          />
          <MenuRow
            icon={<IconClipboardList size={18} color="#2C97DE" />}
            iconBg="#EAF5FC"
            label="Intake questions"
            subLabel="Questions asked when pupils enquire"
            onClick={() => navigate({ to: "/intake-questions" as never })}
          />
          <MenuRow
            icon={<IconAlertCircle size={18} color="#F59E0B" />}
            iconBg="#FEF3C7"
            label="No show & cancellation"
            subLabel="Set fees for late cancellations and no-shows"
            onClick={() => navigate({ to: "/no-show-policy" as never })}
            isLast
          />
        </SectionCard>

        {/* Business */}
        <Label>Business</Label>
        <SectionCard>
          <MenuRow
            icon={<IconTag size={18} color="#2C97DE" />}
            iconBg="#EAF5FC"
            label="Discount codes"
            subLabel="Create promo codes for your courses"
            onClick={() => navigate({ to: "/discount-codes" as never })}
            isFirst
          />
          <MenuRow
            icon={<IconRobot size={18} color="#7B61FF" />}
            iconBg="#EDE9FE"
            label="Automations"
            subLabel="Reminders, chasers and follow-ups"
            onClick={() => navigate({ to: "/automations" as never })}
          />
          <MenuRow
            icon={<IconCrown size={18} color="#F59E0B" />}
            iconBg="#FEF3C7"
            label="Subscription & plan"
            subLabel="Your Every Driver Pro plan and billing"
            onClick={() => navigate({ to: "/subscription" as never })}
            isLast
          />
        </SectionCard>

        {/* Online presence */}
        <Label>Online presence</Label>
        <SectionCard>
          <MenuRow
            icon={<IconWorld size={18} color="#2C97DE" />}
            iconBg="#EAF5FC"
            label="Mini site"
            subLabel="Your public instructor page"
            onClick={() => navigate({ to: "/minisite" as never })}
            isFirst
          />
          <MenuRow
            icon={<IconShoppingBag size={18} color="#2C97DE" />}
            iconBg="#EAF5FC"
            label="Marketplace listing"
            subLabel="How you appear in EveryDriver search"
            onClick={() => navigate({ to: "/marketplace/edit" as never })}
          />
          <MenuRow
            icon={<IconSchool size={18} color="#2C97DE" />}
            iconBg="#EAF5FC"
            label="Courses"
            subLabel="Your driving courses and packages"
            onClick={() => navigate({ to: "/courses" as never })}
            isLast
          />
        </SectionCard>

        {/* Notifications & sync */}
        <Label>Notifications & sync</Label>
        <SectionCard>
          <MenuRow
            icon={<IconBell size={18} color="#2C97DE" />}
            iconBg="#EAF5FC"
            label="Notification settings"
            subLabel="Push, email and badge preferences"
            onClick={() => navigate({ to: "/notificationsettings" as never })}
            isFirst
          />
          <MenuRow
            icon={<IconCalendar size={18} color="#2C97DE" />}
            iconBg="#EAF5FC"
            label="Calendar sync"
            subLabel="Google Calendar and iCloud connections"
            onClick={() => navigate({ to: "/calendarsync" as never })}
          />
          <MenuRow
            icon={<IconMicrophone size={18} color="#FFFFFF" />}
            iconBg="#0B2341"
            label="ED Settings"
            subLabel="Voice, wake word & AI"
            onClick={() => navigate({ to: "/ed-settings" as never })}
            isLast
          />
        </SectionCard>

        {/* Legal & support */}
        <Label>Legal & support</Label>
        <SectionCard>
          <MenuRow
            icon={<IconHelp size={18} color="#2C97DE" />}
            iconBg="#EAF5FC"
            label="Help & support"
            subLabel="Guides, FAQs and contact"
            onClick={() => navigate({ to: "/help" as never })}
            isFirst
          />
          <MenuRow
            icon={<IconShield size={18} color="#2C97DE" />}
            iconBg="#EAF5FC"
            label="Privacy policy"
            subLabel="How we handle your data"
            onClick={() => navigate({ to: "/privacy" as never })}
          />
          <MenuRow
            icon={<IconFileText size={18} color="#2C97DE" />}
            iconBg="#EAF5FC"
            label="Terms of service"
            subLabel="The rules of using Every Driver Pro"
            onClick={() => navigate({ to: "/terms" as never })}
            isLast
          />
        </SectionCard>

        {/* Account */}
        <Label>Account</Label>
        <SectionCard>
          {isAdmin && (
            <MenuRow
              icon={<IconSettings size={18} color="#FFFFFF" />}
              iconBg="#0B2341"
              label="Admin panel"
              subLabel="Admin tools and moderation"
              onClick={() => navigate({ to: "/admin" as never })}
              isFirst
              isLast={false}
            />
          )}
          <MenuRow
            icon={<IconLogout size={18} color="#E53935" />}
            iconBg="#FEE2E2"
            label="Sign out"
            subLabel="Log out of this account"
            onClick={() => setSignOutOpen(true)}
            labelColor="#E53935"
            hideChevron
            isFirst={!isAdmin}
            isLast
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
      </div>
    </DSMTopSheet>
  );
}

// Shared interaction styling for every grouped row (hover / focus / disabled).
const ROW_INTERACTION =
  "transition-colors duration-150 hover:bg-[#F6F7F9] active:bg-[#EFF1F4] focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#1877D6] disabled:opacity-50 disabled:pointer-events-none";

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
  disabled,
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
  disabled?: boolean;
}) {
  const dividerStyle: React.CSSProperties | undefined =
    isLast === undefined
      ? isFirst
        ? undefined
        : { borderTopWidth: "1px", borderTopStyle: "solid", borderTopColor: "#F4F6F8" }
      : isLast
        ? undefined
        : { borderBottomWidth: "1px", borderBottomStyle: "solid", borderBottomColor: "#F4F6F8" };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`w-full flex items-center text-left [&_svg]:!w-[17px] [&_svg]:!h-[17px] ${ROW_INTERACTION}`}
      style={{
        gap: 12,
        padding: "14px 16px",
        ...dividerStyle,
      }}
    >
      <div
        className="flex items-center justify-center"
        style={{ width: 34, height: 34, minWidth: 34, minHeight: 34, borderRadius: 8, backgroundColor: iconBg, flexShrink: 0 }}
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0 flex flex-col">
        <span
          className="truncate flex items-center gap-2"
          style={{ fontSize: 15, fontWeight: tokens.fontWeight.medium, color: labelColor ?? "#0B2341", ...POPPINS }}
        >
          {label}
          {warning ? (
            <span
              aria-hidden
              style={{
                width: 8,
                height: 8,
                borderRadius: 999,
                background: "#B45309",
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
            style={{ fontSize: 12, color: "#B45309", ...POPPINS, marginTop: 2 }}
          >
            {warning}
          </span>
        ) : subLabel ? (
          <span
            className="truncate"
            title={subLabel}
            style={{ fontSize: 12, color: "#536579", ...POPPINS, marginTop: 2 }}
          >
            {subLabel}
          </span>
        ) : null}
      </div>
      {value ? (
        <span
          style={{
            background: "#E6F1FB",
            color: tokens.blue,
            fontSize: tokens.fontSize.sm,
            fontWeight: tokens.fontWeight.bold,
            padding: "4px 10px",
            borderRadius: 999,
            marginRight: 4,
            ...POPPINS,
          }}
        >
          {value}
        </span>
      ) : null}
      {hideChevron ? null : expanded ? (
        <IconChevronDown size={18} color="#D1D5DB" />
      ) : (
        <IconChevronRight size={18} color="#D1D5DB" />
      )}
    </button>
  );
}

// Section label — plain caption, no left accent bar.
function Label({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        padding: "16px 16px 6px",
        fontSize: 11,
        fontWeight: tokens.fontWeight.bold,
        color: "#536579",
        letterSpacing: "0.6px",
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
        background: tokens.white,
        borderRadius: 12,
        border: "1px solid #E4E8EF",
        overflow: "hidden",
        marginBottom: 4,
        ...style,
      }}
    >
      {children}
    </div>
  );
}


// ============ Shared helpers for new settings sections ============

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="text-[12px] font-medium text-[#6B7280]"
      style={{ ...POPPINS, marginBottom: -6 }}
    >
      {children}
    </div>
  );
}

function PoundInput({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[15px] text-[#6B7280]" style={POPPINS}>£</span>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
        className="flex-1 text-[14px] text-[#0B1F3A]"
        style={{
          padding: "12px 16px",
          border: "1px solid #E2E6ED",
          borderRadius: tokens.radiusCard,
          background: tokens.white,
          ...POPPINS,
        }}
      />
    </div>
  );
}

function SelectBox({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full text-[14px] text-[#0B1F3A]"
      style={{
        padding: "12px 16px",
        border: "1px solid #E2E6ED",
        borderRadius: tokens.radiusCard,
        background: tokens.white,
        ...POPPINS,
      }}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}

function ToggleSwitch({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={(e) => { e.stopPropagation(); onChange(!checked); }}
      style={{
        width: 44,
        height: 26,
        borderRadius: 12,
        background: checked ? "#1877D6" : "#D1D5DB",
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
          left: checked ? 21 : 3,
          width: 20,
          height: 20,
          borderRadius: "50%",
          background: "#fff",
          transition: "left 0.2s",
          boxShadow: "0 1px 2px rgba(0,0,0,0.15)",
        }}
      />
    </button>
  );
}

function SaveRow({ onClick }: { onClick: () => void }) {
  return (
    <SaveFooter style={{ position: "static", background: "transparent", border: "none", padding: "12px 0 0" }}>
      <SaveButton onClick={onClick}>Save</SaveButton>
    </SaveFooter>
  );
}
