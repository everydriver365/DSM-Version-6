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

  const UK_POSTCODE_RE = /^[A-Z]{1,2}[0-9][A-Z0-9]? ?[0-9][A-Z]{2}$/i;
  const postcodeValid = UK_POSTCODE_RE.test(homePostcode.trim());
  const postcodeShowError = postcodeBlurred && homePostcode.trim().length > 0 && !postcodeValid;

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
        .select("name, profile_image_url, pass_booking_fee, hourly_rate, default_lesson_duration_minutes, lesson_buffer_minutes, home_postcode, radius_miles")
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
        style={{ height: 52, backgroundColor: "#072b47" }}
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
                style={{ width: 56, height: 56, backgroundColor: "#1A52A0", color: "#FFFFFF", ...POPPINS }}
              >
                {initials(displayedName)}
              </div>
            )}
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

          <MenuRow
            icon={<Crown size={18} color="#5B21B6" />}
            iconBg="#EDE9FE"
            label="My plan"
            value="DSM Free"
            onClick={() => navigate({ to: "/subscription" })}
          />
        </Card>

        <SectionHeader>PAYMENTS</SectionHeader>
        <Card>
          <div className="flex items-start gap-3">
            <div className="flex-1 min-w-0">
              <div className="text-[14px] font-medium text-[#0F2044]" style={POPPINS}>
                Pass booking fee to pupil
              </div>
              <div className="text-[12px] text-[#6B7280] mt-1" style={POPPINS}>
                A £1 booking fee is charged per payment. Toggle on to pass this to the pupil, off to absorb it yourself.
              </div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={passBookingFee}
              aria-label="Pass booking fee to pupil"
              onClick={togglePassBookingFee}
              style={{
                width: 44,
                height: 26,
                borderRadius: 13,
                background: passBookingFee ? "#1A52A0" : "#D1D5DB",
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
        </Card>

        <SectionHeader>RATES & SCHEDULING</SectionHeader>
        <Card>
          {/* Hourly rate */}
          <div className="flex items-start gap-3">
            <div className="flex-1 min-w-0">
              <div className="text-[14px] font-medium text-[#0F2044]" style={POPPINS}>
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
                className="text-[14px] font-medium text-[#0F2044] text-right"
                style={{
                  width: 72,
                  height: 36,
                  borderRadius: 8,
                  border: "1px solid #E2E6ED",
                  padding: "0 8px",
                  ...POPPINS,
                }}
              />
            </div>
          </div>

          {/* Default lesson duration */}
          <div
            className="flex items-center gap-3 pt-4 mt-4"
            style={{ borderTopWidth: "0.5px", borderTopStyle: "solid", borderTopColor: "#E2E6ED" }}
          >
            <div className="flex-1 min-w-0">
              <div className="text-[14px] font-medium text-[#0F2044]" style={POPPINS}>
                Default lesson duration
              </div>
            </div>
            <select
              value={defaultDuration}
              onChange={(e) => setDefaultDuration(parseInt(e.target.value, 10))}
              className="text-[13px] text-[#0F2044]"
              style={{
                height: 36,
                borderRadius: 8,
                border: "1px solid #E2E6ED",
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
            style={{ borderTopWidth: "0.5px", borderTopStyle: "solid", borderTopColor: "#E2E6ED" }}
          >
            <div className="flex-1 min-w-0">
              <div className="text-[14px] font-medium text-[#0F2044]" style={POPPINS}>
                Buffer between lessons
              </div>
              <div className="text-[12px] text-[#6B7280] mt-1" style={POPPINS}>
                Travel time added between lessons
              </div>
            </div>
            <select
              value={bufferMinutes}
              onChange={(e) => setBufferMinutes(parseInt(e.target.value, 10))}
              className="text-[13px] text-[#0F2044]"
              style={{
                height: 36,
                borderRadius: 8,
                border: "1px solid #E2E6ED",
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
              backgroundColor: "#0F2044",
              border: "none",
              opacity: savingRates ? 0.7 : 1,
              cursor: savingRates ? "not-allowed" : "pointer",
              ...POPPINS,
            }}
          >
            {savingRates ? "Saving…" : "Save rates"}
          </button>
        </Card>

        <SectionHeader>COVERAGE AREA</SectionHeader>
        <Card
          style={{
            background: "#fff",
            border: "0.5px solid #E2E6ED",
            borderRadius: 12,
            padding: 16,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <MapPin size={18} color="#1A52A0" />
            <span style={{ fontSize: 15, fontWeight: 600, color: "#1A1A2E", ...POPPINS }}>
              Coverage area
            </span>
          </div>

          <label style={{ fontSize: 12, color: "#6B7280", ...POPPINS }}>Home postcode</label>
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
                border: `0.5px solid ${postcodeShowError ? "#CC2229" : "#E2E6ED"}`,
                borderRadius: 10,
                fontSize: 14,
                background: "#fff",
                color: "#1A1A2E",
                textTransform: "uppercase",
                ...POPPINS,
              }}
            />
            {postcodeValid && (
              <Check
                size={18}
                color="#16A34A"
                style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)" }}
              />
            )}
          </div>
          {postcodeShowError && (
            <div style={{ fontSize: 12, color: "#CC2229", marginBottom: 14, ...POPPINS }}>
              Please enter a valid UK postcode
            </div>
          )}


          <label style={{ fontSize: 12, color: "#6B7280", ...POPPINS }}>Coverage radius</label>
          <select
            value={coverageRadius}
            onChange={(e) => setCoverageRadius(Number(e.target.value))}
            style={{
              width: "100%",
              height: 44,
              padding: "0 12px",
              border: "0.5px solid #E2E6ED",
              borderRadius: 10,
              fontSize: 14,
              marginTop: 6,
              background: "#fff",
              color: "#1A1A2E",
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
              backgroundColor: "#0F2044",
              border: "none",
              opacity: savingCoverage || !postcodeValid ? 0.5 : 1,
              cursor: savingCoverage || !postcodeValid ? "not-allowed" : "pointer",
              ...POPPINS,
            }}
          >
            {savingCoverage ? "Saving…" : "Save coverage"}
          </button>
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
      style={isFirst ? undefined : { borderTopWidth: "0.5px", borderTopStyle: "solid", borderTopColor: "#E2E6ED" }}
    >
      <div
        className="flex items-center justify-center rounded-full shrink-0"
        style={{ width: 36, height: 36, backgroundColor: iconBg }}
      >
        {icon}
      </div>
      <span className="flex-1 text-[14px] text-[#0F2044]" style={POPPINS}>{label}</span>
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
      style={{ borderTopWidth: "0.5px", borderTopStyle: "solid", borderTopColor: "#E2E6ED", ...POPPINS }}
    >
      {text}
    </div>
  );
}
