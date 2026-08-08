import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { Check, CheckCircle, Globe, Clock, UserPlus, CalendarDays } from "lucide-react";
import { Button } from "../components/dsm/Button";
import { supabase } from "../lib/supabaseClient";
import dsmLogoAsset from "../assets/dsm-logo.png.asset.json";

export const Route = createFileRoute("/onboarding")({
  head: () => ({
    meta: [{ title: "Get started — DSM by EveryDriver" }],
  }),
  component: OnboardingPage,
});

const POPPINS = { fontFamily: "Poppins, sans-serif" } as const;
const TOTAL_STEPS = 9;

type WebsiteChoice = "yes" | "existing" | "later" | null;

type Day = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";
const DAYS: { key: Day; label: string }[] = [
  { key: "mon", label: "Monday" },
  { key: "tue", label: "Tuesday" },
  { key: "wed", label: "Wednesday" },
  { key: "thu", label: "Thursday" },
  { key: "fri", label: "Friday" },
  { key: "sat", label: "Saturday" },
  { key: "sun", label: "Sunday" },
];

interface DayHours {
  enabled: boolean;
  start: string;
  end: string;
}

const DEFAULT_HOURS: Record<Day, DayHours> = {
  mon: { enabled: true, start: "09:00", end: "17:00" },
  tue: { enabled: true, start: "09:00", end: "17:00" },
  wed: { enabled: true, start: "09:00", end: "17:00" },
  thu: { enabled: true, start: "09:00", end: "17:00" },
  fri: { enabled: true, start: "09:00", end: "17:00" },
  sat: { enabled: false, start: "09:00", end: "17:00" },
  sun: { enabled: false, start: "09:00", end: "17:00" },
};

function OnboardingPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");

  const [carMake, setCarMake] = useState("");
  const [carModel, setCarModel] = useState("");
  const [carYear, setCarYear] = useState("");
  const [carReg, setCarReg] = useState("");
  const [transmission, setTransmission] = useState<"Manual" | "Automatic">("Manual");

  const [hours, setHours] = useState<Record<Day, DayHours>>(DEFAULT_HOURS);

  const [hourlyRate, setHourlyRate] = useState("");
  const [homePostcode, setHomePostcode] = useState("");

  const [adiNumber, setAdiNumber] = useState("");
  const [adiGrade, setAdiGrade] = useState<"" | "A" | "B">("");

  const [websiteChoice, setWebsiteChoice] = useState<WebsiteChoice>(null);
  const [wantsCustomDomain, setWantsCustomDomain] = useState(false);
  const [existingWebsiteUrl, setExistingWebsiteUrl] = useState("");

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        navigate({ to: "/login", replace: true });
        return;
      }
      setUserId(data.user.id);
      setUserEmail(data.user.email ?? null);
    })();
  }, [navigate]);

  function next() {
    setError(null);
    setStep((s) => Math.min(TOTAL_STEPS, s + 1));
  }

  async function finish(dest: string = "/home") {
    if (!userId) return;
    setSaving(true);
    setError(null);
    try {
      const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();

      // Always generate a slug — used for profile, job postings and test swap links
      const base =
        fullName
          .toLowerCase()
          .replace(/\s+/g, "-")
          .replace(/[^a-z0-9-]/g, "")
          .replace(/-+/g, "-")
          .replace(/^-|-$/g, "") || "instructor";

      let uniqueSlug = base;
      let suffix = 1;
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { data: existing, error: slugErr } = await supabase
          .from("instructors")
          .select("id")
          .eq("app_slug", uniqueSlug)
          .maybeSingle();
        if (slugErr) {
          console.warn("[onboarding] slug lookup error", slugErr);
          break;
        }
        if (!existing || existing.id === userId) break;
        suffix += 1;
        uniqueSlug = `${base}-${suffix}`;
      }

      const { error: instErr } = await supabase.from("instructors").upsert({
        id: userId,
        name: fullName,
        phone: phone.trim() || null,
        vehicle_make: carMake.trim() || null,
        vehicle_model: carModel.trim() || null,
        vehicle_reg: carReg.trim() || null,
        vehicle_year: carYear.trim() ? Number(carYear.trim()) : null,
        transmission: transmission || null,
        app_slug: uniqueSlug,
        website_published: websiteChoice !== "later",
        website_bio: "Driving instructor based in the UK.",
        hourly_rate: hourlyRate.trim() ? Number(hourlyRate) : null,
        home_postcode: homePostcode.trim().toUpperCase() || null,
        adi_licence_number: adiNumber.trim() || null,
        adi_grade: adiGrade || null,
        wants_custom_domain: websiteChoice === "yes" && wantsCustomDomain,
        existing_website_url:
          websiteChoice === "existing" && existingWebsiteUrl.trim()
            ? existingWebsiteUrl.trim()
            : null,
      });
      if (instErr) throw instErr;

      // Fire welcome email (non-blocking)
      supabase.functions.invoke('send-welcome-email', {
        body: { instructor_id: userId },
      }).catch(err =>
        console.warn('[onboarding] welcome email error', err)
      );

      if (websiteChoice === "yes" && wantsCustomDomain) {
        const { error: csErr } = await supabase.from("contact_submissions").insert({
          name: fullName,
          email: userEmail,
          subject: "Custom domain request",
          message: "Instructor requested a custom domain during onboarding",
        });
        if (csErr) console.warn("[onboarding] contact_submissions insert error", csErr);
      }

      const dayKeyToName: Record<Day, string> = {
        mon: "Monday", tue: "Tuesday", wed: "Wednesday", thu: "Thursday",
        fri: "Friday", sat: "Saturday", sun: "Sunday",
      };
      const perDayHours: Record<string, { start: string; end: string; active: boolean }> = {};
      for (const { key } of DAYS) {
        perDayHours[dayKeyToName[key]] = {
          start: hours[key].start,
          end: hours[key].end,
          active: hours[key].enabled,
        };
      }
      const activeDayNames = DAYS.filter(({ key }) => hours[key].enabled).map(({ key }) => dayKeyToName[key]);
      const firstActive = DAYS.find(({ key }) => hours[key].enabled);
      const repStart = firstActive ? hours[firstActive.key].start : "09:00";
      const repEnd = firstActive ? hours[firstActive.key].end : "18:00";
      const { error: whErr } = await supabase
        .from("instructors")
        .update({
          working_hours_start: repStart,
          working_hours_end: repEnd,
          working_days: activeDayNames.length ? activeDayNames : ["Monday","Tuesday","Wednesday","Thursday","Friday"],
          per_day_hours: perDayHours,
        })
        .eq("id", userId);
      if (whErr) console.warn("[onboarding] instructors update error", whErr);

      navigate({ to: dest, replace: true } as never);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Could not save your details";
      setError(msg);
      setSaving(false);
    }
  }

  const progressPct = (step / TOTAL_STEPS) * 100;

  return (
    <div
      className="min-h-screen w-full bg-[#0B1F3A] flex flex-col items-center px-4 py-8"
      style={POPPINS}
    >
      {/* Progress */}
      <div className="w-full max-w-[420px]">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[12px] text-[#9CA3AF]">Step {step} of {TOTAL_STEPS}</span>
          <span className="text-[12px] text-[#9CA3AF]">{Math.round(progressPct)}%</span>
        </div>
        <div className="h-2 w-full bg-[#1f2f55] rounded-full overflow-hidden">
          <div
            className="h-full bg-[#1877D6] transition-all duration-300"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* Steps */}
      <div style={{ width: "100%", maxWidth: 420, marginTop: 24 }}>
        {step === 1 && (
          <div className="flex flex-col items-center">
            <img src={dsmLogoAsset.url} alt="DSM" className="h-[60px] w-auto mb-5" />
            <div style={{ marginBottom: 16, textAlign: "center" }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: "#fff", ...POPPINS, letterSpacing: "-0.4px", marginBottom: 4 }}>
                Welcome to DSM
              </div>
              <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", ...POPPINS }}>
                Let&apos;s get you set up in 3 minutes
              </div>
            </div>
            <Cta onClick={next}>Get started</Cta>
          </div>
        )}

        {step === 2 && (
          <div>
            <StepHeader title="About you" subtitle="Tell us who you are" />
            <GroupCard>
              <FieldRow label="First name" value={firstName} onChange={setFirstName} />
              <FieldRow label="Last name" value={lastName} onChange={setLastName} />
              <FieldRow label="Phone" value={phone} onChange={setPhone} type="tel" last />
            </GroupCard>
            <Cta onClick={next} disabled={!firstName.trim() || !lastName.trim()}>Continue</Cta>
          </div>
        )}

        {step === 3 && (
          <div>
            <StepHeader title="Your vehicle" subtitle="The car you teach in" />
            <GroupCard>
              <FieldRow label="Make" placeholder="Ford" value={carMake} onChange={setCarMake} />
              <FieldRow label="Model" placeholder="Fiesta" value={carModel} onChange={setCarModel} />
              <FieldRow label="Year" placeholder="2022" value={carYear} onChange={setCarYear} type="number" />
              <FieldRow label="Registration" value={carReg} onChange={setCarReg} />
              <div style={ROW_STYLE_LAST}>
                <label style={ROW_LABEL}>Transmission</label>
                <select
                  value={transmission}
                  onChange={(e) => setTransmission(e.target.value as "Manual" | "Automatic")}
                  style={{ ...ROW_INPUT, textAlignLast: "right" as const, appearance: "none" }}
                >
                  <option>Manual</option>
                  <option>Automatic</option>
                </select>
              </div>
            </GroupCard>
            <Cta onClick={next} disabled={!carMake.trim() || !carModel.trim()}>Continue</Cta>
          </div>
        )}

        {step === 4 && (
          <div>
            <StepHeader title="Working hours" subtitle="When are you available to teach?" />
            <GroupCard>
              {DAYS.map(({ key, label }, i) => {
                const h = hours[key];
                return (
                  <div
                    key={key}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "12px 16px",
                      background: h.enabled ? "#F0F7FF" : "#fff",
                      borderBottom: i === DAYS.length - 1 ? "none" : "1px solid #E4E8EF",
                    }}
                  >
                    <label style={{ display: "flex", alignItems: "center", gap: 8, width: 110, flexShrink: 0, fontSize: 14, fontWeight: 500, color: "#0B1F3A", ...POPPINS, cursor: "pointer" }}>
                      <input
                        type="checkbox"
                        checked={h.enabled}
                        onChange={(e) =>
                          setHours((prev) => ({ ...prev, [key]: { ...prev[key], enabled: e.target.checked } }))
                        }
                        className="h-4 w-4 accent-[#1877D6]"
                      />
                      {label}
                    </label>
                    {h.enabled && (
                      <div className="flex-1 flex items-center justify-end gap-1">
                        <input
                          type="time"
                          value={h.start}
                          onChange={(e) =>
                            setHours((prev) => ({ ...prev, [key]: { ...prev[key], start: e.target.value } }))
                          }
                          style={{ ...TIME_INPUT }}
                        />
                        <span style={{ fontSize: 12, color: "#6B7686", ...POPPINS }}>—</span>
                        <input
                          type="time"
                          value={h.end}
                          onChange={(e) =>
                            setHours((prev) => ({ ...prev, [key]: { ...prev[key], end: e.target.value } }))
                          }
                          style={{ ...TIME_INPUT }}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </GroupCard>
            <Cta onClick={next}>Continue</Cta>
          </div>
        )}

        {step === 5 && (
          <div>
            <StepHeader title="Your rates" subtitle="How much do you charge?" />
            <GroupCard>
              <FieldRow label="Hourly rate" prefix="£" type="number" placeholder="35.00" value={hourlyRate} onChange={setHourlyRate} />
              <FieldRow label="Home postcode" placeholder="SO30 2TD" value={homePostcode} onChange={setHomePostcode} last />
            </GroupCard>
            <p style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", ...POPPINS, marginBottom: 12 }}>
              Most instructors charge £32-£45/hr in 2026. Your postcode is used for gap filler and nearby features — never shared publicly.
            </p>
            <Cta onClick={next} disabled={!hourlyRate.trim()}>Continue</Cta>
          </div>
        )}

        {step === 6 && (
          <div>
            <StepHeader title="Your ADI licence" subtitle="Shown on your profile to build trust" />
            <GroupCard>
              <FieldRow label="Licence no." placeholder="123456" value={adiNumber} onChange={setAdiNumber} />
              <div style={ROW_STYLE_LAST}>
                <label style={ROW_LABEL}>Grade</label>
                <div className="flex-1 flex gap-2 justify-end">
                  {(["A", "B"] as const).map((g) => {
                    const sel = adiGrade === g;
                    return (
                      <button
                        key={g}
                        type="button"
                        onClick={() => setAdiGrade(sel ? "" : g)}
                        style={{
                          ...POPPINS,
                          padding: "6px 16px",
                          borderRadius: 999,
                          border: "none",
                          fontSize: 13,
                          fontWeight: 600,
                          background: sel ? "#1877D6" : "#F1F5F9",
                          color: sel ? "#FFFFFF" : "#6B7686",
                        }}
                      >
                        Grade {g}
                      </button>
                    );
                  })}
                </div>
              </div>
            </GroupCard>
            <Cta onClick={next}>Continue</Cta>
            <button
              type="button"
              onClick={next}
              style={{ ...POPPINS, fontSize: 13, color: "rgba(255,255,255,0.5)", background: "none", border: "none", marginTop: 12, width: "100%" }}
            >
              Skip for now →
            </button>
          </div>
        )}

        {step === 7 && (
          <div>
            <StepHeader title="Want a free website?" subtitle="Every instructor gets a free booking page" />

            <ChoiceCard
              icon={<CheckCircle size={22} color="#10B981" />}
              title="Yes, set me up"
              subtitle="I'll get a free page at everydriver.co.uk/i/[your-name]"
              selected={websiteChoice === "yes"}
              onClick={() => setWebsiteChoice("yes")}
            />
            {websiteChoice === "yes" && (
              <div className="flex flex-col gap-2 mb-3">
                <label className="flex items-start gap-2 text-[13px] cursor-pointer" style={{ ...POPPINS, color: "rgba(255,255,255,0.7)" }}>
                  <input
                    type="checkbox"
                    checked={wantsCustomDomain}
                    onChange={(e) => setWantsCustomDomain(e.target.checked)}
                    className="h-4 w-4 mt-0.5 accent-[#1877D6]"
                  />
                  <span>
                    I&apos;d like a custom domain (e.g. www.myname.co.uk) — contact me about this
                  </span>
                </label>
                {wantsCustomDomain && (
                  <p className="text-[12px] text-[#9EC7F5]" style={POPPINS}>
                    Our team will be in touch to help set this up
                  </p>
                )}
              </div>
            )}

            <ChoiceCard
              icon={<Globe size={22} color="#1877D6" />}
              title="I already have a website"
              subtitle="Skip this — I'll link my existing site instead"
              selected={websiteChoice === "existing"}
              onClick={() => setWebsiteChoice("existing")}
            />
            {websiteChoice === "existing" && (
              <GroupCard>
                <div style={ROW_STYLE_LAST}>
                  <label style={ROW_LABEL}>Website</label>
                  <input
                    type="url"
                    value={existingWebsiteUrl}
                    placeholder="https://www.mydrivingschool.co.uk"
                    onChange={(e) => setExistingWebsiteUrl(e.target.value)}
                    style={ROW_INPUT}
                  />
                </div>
              </GroupCard>
            )}

            <ChoiceCard
              icon={<Clock size={22} color="#6B7280" />}
              title="Not right now"
              subtitle="I can set this up later from settings"
              selected={websiteChoice === "later"}
              onClick={() => setWebsiteChoice("later")}
            />

            <Cta onClick={next} disabled={!websiteChoice}>Continue</Cta>
          </div>
        )}

        {step === 8 && (
          <div>
            <StepHeader title="Your free mini website" subtitle="Bio, photos and contact info — ready to publish" />
            <div style={{ background: "#fff", borderRadius: 16, boxShadow: "0 1px 3px rgba(11,31,58,0.06)", padding: 20, marginBottom: 12, textAlign: "center" }}>
              <div className="h-16 w-16 rounded-full bg-[#E6F1FB] flex items-center justify-center mx-auto mb-3">
                <Globe size={30} color="#1877D6" />
              </div>
              <p className="text-[14px] text-[#6B7686]" style={POPPINS}>
                DSM automatically gives you a simple, personal website. Customise it and publish whenever you&apos;re ready.
              </p>
            </div>
            <Cta onClick={() => navigate({ to: "/minisite", replace: true })}>Set it up now</Cta>
            <button
              type="button"
              onClick={next}
              style={{ ...POPPINS, fontSize: 13, color: "rgba(255,255,255,0.5)", background: "none", border: "none", marginTop: 12, width: "100%" }}
            >
              I&apos;ll do this later
            </button>
          </div>
        )}

        {step === 9 && (
          <div>
            <div className="flex justify-center mb-4">
              <div
                className="h-16 w-16 rounded-full bg-[#10B981] flex items-center justify-center animate-bounce"
                style={{ animationIterationCount: 1 }}
              >
                <Check size={36} color="#fff" strokeWidth={3} />
              </div>
            </div>
            <div style={{ marginBottom: 16, textAlign: "center" }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: "#fff", ...POPPINS, letterSpacing: "-0.4px", marginBottom: 4 }}>
                You&apos;re all set!
              </div>
              <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", ...POPPINS }}>Welcome to DSM</div>
            </div>
            {error && (
              <p className="text-[13px] text-[#CC2229] text-center mb-2" style={POPPINS} role="alert">{error}</p>
            )}
            <Cta onClick={() => finish("/home")} disabled={saving}>
              {saving ? "Saving…" : "Finish setup"}
            </Cta>
            <div className="mt-3">
              <GroupCard>
                <ActionRow
                  icon={<UserPlus size={20} color="#1877D6" />}
                  label="Add your first pupil"
                  disabled={saving}
                  onClick={() => finish("/pupils/new")}
                />
                <ActionRow
                  icon={<CalendarDays size={20} color="#1877D6" />}
                  label="Connect Google Calendar"
                  disabled={saving}
                  onClick={() => finish("/settings/calendar")}
                  last
                />
              </GroupCard>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const ROW_LABEL = {
  fontSize: 13,
  fontWeight: 500,
  color: "#6B7686",
  width: 110,
  flexShrink: 0,
  ...POPPINS,
} as const;

const ROW_INPUT = {
  flex: 1,
  border: "none",
  outline: "none",
  fontSize: 15,
  fontWeight: 500,
  color: "#0B1F3A",
  ...POPPINS,
  background: "transparent",
  textAlign: "right" as const,
  minWidth: 0,
} as const;

const ROW_STYLE = {
  display: "flex",
  alignItems: "center",
  padding: "14px 16px",
  borderBottom: "1px solid #E4E8EF",
} as const;

const ROW_STYLE_LAST = {
  display: "flex",
  alignItems: "center",
  padding: "14px 16px",
} as const;

const TIME_INPUT = {
  ...POPPINS,
  fontSize: 13,
  fontWeight: 500,
  color: "#0B1F3A",
  background: "#fff",
  border: "1px solid #E4E8EF",
  borderRadius: 8,
  padding: "4px 6px",
} as const;

function StepHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 22, fontWeight: 800, color: "#fff", ...POPPINS, letterSpacing: "-0.4px", marginBottom: 4 }}>
        {title}
      </div>
      <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", ...POPPINS }}>{subtitle}</div>
    </div>
  );
}

function GroupCard({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        background: "#fff",
        borderRadius: 16,
        boxShadow: "0 1px 3px rgba(11,31,58,0.06)",
        overflow: "hidden",
        marginBottom: 12,
      }}
    >
      {children}
    </div>
  );
}

function FieldRow({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  prefix,
  last,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  prefix?: string;
  last?: boolean;
}) {
  return (
    <div style={last ? ROW_STYLE_LAST : ROW_STYLE}>
      <label style={ROW_LABEL}>{label}</label>
      {prefix && <span style={{ ...POPPINS, fontSize: 15, fontWeight: 500, color: "#0B1F3A" }}>{prefix}</span>}
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        style={ROW_INPUT}
      />
    </div>
  );
}

function Cta({
  children,
  onClick,
  disabled,
}: {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        width: "100%",
        padding: 16,
        background: disabled ? "#9CA3AF" : "#1877D6",
        color: "#fff",
        border: "none",
        borderRadius: 16,
        fontSize: 16,
        fontWeight: 700,
        cursor: disabled ? "not-allowed" : "pointer",
        ...POPPINS,
        marginTop: 8,
      }}
    >
      {children}
    </button>
  );
}

function ActionRow({
  icon,
  label,
  onClick,
  disabled,
  last,
}: {
  icon: ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  last?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        ...(last ? ROW_STYLE_LAST : ROW_STYLE),
        width: "100%",
        gap: 12,
        background: "transparent",
        textAlign: "left",
        opacity: disabled ? 0.5 : 1,
      }}
    >
      {icon}
      <span style={{ ...POPPINS, fontSize: 15, fontWeight: 500, color: "#0B1F3A" }}>{label}</span>
    </button>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="block mb-1 text-[12px] font-medium text-[#6B7280]" style={POPPINS}>
        {label}
      </label>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="h-12 w-full rounded-lg px-3 text-[14px] text-[#0B1F3A] bg-white placeholder:text-[#9CA3AF] focus:outline-none focus:border-[#1877D6]"
        style={{ ...POPPINS, border: "1.5px solid #CBD5E1" }}
      />
    </div>
  );
}

function ChoiceCard({
  icon,
  title,
  subtitle,
  selected,
  onClick,
}: {
  icon: ReactNode;
  title: string;
  subtitle: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-start gap-3 rounded-xl p-3 text-left transition-colors"
      style={{
        ...POPPINS,
        border: selected ? "1.5px solid #1877D6" : "1px solid #EEF2F7",
        background: selected ? "#EEF3FB" : "#FFFFFF",
      }}
    >
      <div className="mt-0.5">{icon}</div>
      <div className="flex-1">
        <div className="text-[14px] font-semibold text-[#0B1F3A]">{title}</div>
        <div className="text-[12px] text-[#6B7280] mt-0.5">{subtitle}</div>
      </div>
    </button>
  );
}

function ActionCard({
  icon,
  label,
  onClick,
  disabled,
}: {
  icon: ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="w-full flex items-center gap-3 p-3 text-left disabled:opacity-50"
      style={{ ...POPPINS, borderRadius: 10, background: "#E6F1FB", border: "1px solid #D3E4F7" }}
    >
      {icon}
      <span className="text-[14px] font-semibold text-[#0B1F3A]">{label}</span>
    </button>
  );
}
