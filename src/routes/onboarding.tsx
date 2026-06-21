import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Check, CheckCircle, Globe, Clock } from "lucide-react";
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
const TOTAL_STEPS = 6;

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

  async function finish() {
    if (!userId) return;
    setSaving(true);
    setError(null);
    try {
      const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();

      let uniqueSlug: string | null = null;
      if (websiteChoice === "yes") {
        // Generate a unique app_slug from the name
        const base =
          fullName
            .toLowerCase()
            .replace(/\s+/g, "-")
            .replace(/[^a-z0-9-]/g, "")
            .replace(/-+/g, "-")
            .replace(/^-|-$/g, "") || "instructor";

        uniqueSlug = base;
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
      }

      const { error: instErr } = await supabase.from("instructors").upsert({
        id: userId,
        name: fullName,
        phone: phone.trim() || null,
        car_make: carMake.trim() || null,
        car_model: carModel.trim() || null,
        app_slug: uniqueSlug,
        website_published: false,
        wants_custom_domain: websiteChoice === "yes" && wantsCustomDomain,
        existing_website_url:
          websiteChoice === "existing" && existingWebsiteUrl.trim()
            ? existingWebsiteUrl.trim()
            : null,
      });
      if (instErr) throw instErr;

      if (websiteChoice === "yes" && wantsCustomDomain) {
        const { error: csErr } = await supabase.from("contact_submissions").insert({
          name: fullName,
          email: userEmail,
          subject: "Custom domain request",
          message: "Instructor requested a custom domain during onboarding",
        });
        if (csErr) console.warn("[onboarding] contact_submissions insert error", csErr);
      }

      const rows = DAYS.map(({ key }) => ({
        instructor_id: userId,
        day: key,
        enabled: hours[key].enabled,
        start_time: hours[key].start,
        end_time: hours[key].end,
      }));
      const { error: whErr } = await supabase
        .from("working_hours")
        .upsert(rows, { onConflict: "instructor_id,day" });
      if (whErr) console.warn("[onboarding] working_hours upsert error", whErr);

      navigate({ to: "/home", replace: true });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Could not save your details";
      setError(msg);
      setSaving(false);
    }
  }

  const progressPct = (step / TOTAL_STEPS) * 100;

  return (
    <div
      className="min-h-screen w-full bg-[#0F2044] flex flex-col items-center px-4 py-8"
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
            className="h-full bg-[#1A52A0] transition-all duration-300"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* Card */}
      <div
        className="w-full max-w-[420px] bg-white mt-8 flex flex-col"
        style={{ borderRadius: 20, padding: 32, boxShadow: "0 8px 32px rgba(0,0,0,0.3)" }}
      >
        {step === 1 && (
          <div className="flex flex-col items-center gap-4">
            <img src={dsmLogoAsset.url} alt="DSM" className="h-[60px] w-auto" />
            <h1 className="text-[24px] font-semibold text-[#0F2044] text-center">Welcome to DSM</h1>
            <p className="text-[14px] text-[#6B7280] text-center">
              Let&apos;s get you set up in 3 minutes
            </p>
            <div className="w-full mt-4">
              <Button onClick={next} className="h-12">Get started</Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="flex flex-col gap-4">
            <h2 className="text-[20px] font-semibold text-[#0F2044]">Tell us about yourself</h2>
            <Field label="First name" value={firstName} onChange={setFirstName} />
            <Field label="Last name" value={lastName} onChange={setLastName} />
            <Field label="Phone" value={phone} onChange={setPhone} type="tel" />
            <Button
              onClick={next}
              className="h-12"
              disabled={!firstName.trim() || !lastName.trim()}
            >
              Next
            </Button>
          </div>
        )}

        {step === 3 && (
          <div className="flex flex-col gap-4">
            <h2 className="text-[20px] font-semibold text-[#0F2044]">Your teaching vehicle</h2>
            <Field label="Car make" placeholder="Ford" value={carMake} onChange={setCarMake} />
            <Field label="Car model" placeholder="Fiesta" value={carModel} onChange={setCarModel} />
            <Field label="Year" placeholder="2022" value={carYear} onChange={setCarYear} type="number" />
            <Field label="Registration" value={carReg} onChange={setCarReg} />
            <div>
              <label className="block mb-1 text-[12px] font-medium text-[#6B7280]">Transmission</label>
              <select
                value={transmission}
                onChange={(e) => setTransmission(e.target.value as "Manual" | "Automatic")}
                className="h-12 w-full rounded-lg px-3 text-[14px] text-[#0F2044] bg-white focus:outline-none focus:border-[#1A52A0]"
                style={{ ...POPPINS, border: "1.5px solid #CBD5E1" }}
              >
                <option>Manual</option>
                <option>Automatic</option>
              </select>
            </div>
            <Button onClick={next} className="h-12" disabled={!carMake.trim() || !carModel.trim()}>
              Next
            </Button>
          </div>
        )}

        {step === 4 && (
          <div className="flex flex-col gap-3">
            <h2 className="text-[20px] font-semibold text-[#0F2044]">When do you work?</h2>
            <div className="flex flex-col gap-2">
              {DAYS.map(({ key, label }) => {
                const h = hours[key];
                return (
                  <div
                    key={key}
                    className="flex items-center gap-2 p-2 rounded-lg"
                    style={{ border: "1px solid #E2E6ED" }}
                  >
                    <label className="flex items-center gap-2 w-[110px] text-[13px] text-[#0F2044] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={h.enabled}
                        onChange={(e) =>
                          setHours((prev) => ({ ...prev, [key]: { ...prev[key], enabled: e.target.checked } }))
                        }
                        className="h-4 w-4 accent-[#1A52A0]"
                      />
                      {label}
                    </label>
                    <input
                      type="time"
                      value={h.start}
                      disabled={!h.enabled}
                      onChange={(e) =>
                        setHours((prev) => ({ ...prev, [key]: { ...prev[key], start: e.target.value } }))
                      }
                      className="flex-1 h-9 rounded-md px-2 text-[13px] text-[#0F2044] bg-white disabled:opacity-40"
                      style={{ ...POPPINS, border: "1px solid #CBD5E1" }}
                    />
                    <span className="text-[#6B7280] text-[12px]">to</span>
                    <input
                      type="time"
                      value={h.end}
                      disabled={!h.enabled}
                      onChange={(e) =>
                        setHours((prev) => ({ ...prev, [key]: { ...prev[key], end: e.target.value } }))
                      }
                      className="flex-1 h-9 rounded-md px-2 text-[13px] text-[#0F2044] bg-white disabled:opacity-40"
                      style={{ ...POPPINS, border: "1px solid #CBD5E1" }}
                    />
                  </div>
                );
              })}
            </div>
            <Button onClick={next} className="h-12 mt-2">Next</Button>
          </div>
        )}

        {step === 5 && (
          <div className="flex flex-col gap-4">
            <h2 className="text-[24px] font-bold text-[#0F2044]">Want a free website?</h2>
            <p className="text-[14px] text-[#6B7280]">
              Every instructor gets a free booking page on EveryDriver. You can also connect your own domain later.
            </p>

            <ChoiceCard
              icon={<CheckCircle size={22} color="#10B981" />}
              title="Yes, set me up"
              subtitle="I'll get a free page at everydriver.co.uk/i/[your-name]"
              selected={websiteChoice === "yes"}
              onClick={() => setWebsiteChoice("yes")}
            />
            {websiteChoice === "yes" && (
              <div className="pl-2 -mt-2 flex flex-col gap-2">
                <label className="flex items-start gap-2 text-[13px] text-[#0F2044] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={wantsCustomDomain}
                    onChange={(e) => setWantsCustomDomain(e.target.checked)}
                    className="h-4 w-4 mt-0.5 accent-[#1A52A0]"
                  />
                  <span>
                    I&apos;d like a custom domain (e.g. www.myname.co.uk) — contact me about this
                  </span>
                </label>
                {wantsCustomDomain && (
                  <p className="text-[12px] text-[#1A52A0] bg-[#EEF3FB] rounded-md px-3 py-2">
                    Our team will be in touch to help set this up
                  </p>
                )}
              </div>
            )}

            <ChoiceCard
              icon={<Globe size={22} color="#1A52A0" />}
              title="I already have a website"
              subtitle="Skip this — I'll link my existing site instead"
              selected={websiteChoice === "existing"}
              onClick={() => setWebsiteChoice("existing")}
            />
            {websiteChoice === "existing" && (
              <div className="pl-2 -mt-2">
                <label className="block mb-1 text-[12px] font-medium text-[#6B7280]">
                  Your website URL (optional)
                </label>
                <input
                  type="url"
                  value={existingWebsiteUrl}
                  placeholder="https://www.mydrivingschool.co.uk"
                  onChange={(e) => setExistingWebsiteUrl(e.target.value)}
                  className="h-12 w-full rounded-lg px-3 text-[14px] text-[#0F2044] bg-white placeholder:text-[#9CA3AF] focus:outline-none focus:border-[#1A52A0]"
                  style={{ ...POPPINS, border: "1.5px solid #CBD5E1" }}
                />
              </div>
            )}

            <ChoiceCard
              icon={<Clock size={22} color="#6B7280" />}
              title="Not right now"
              subtitle="I can set this up later from settings"
              selected={websiteChoice === "later"}
              onClick={() => setWebsiteChoice("later")}
            />

            <Button onClick={next} className="h-12 mt-2" disabled={!websiteChoice}>
              Next
            </Button>
          </div>
        )}

        {step === 6 && (
          <div className="flex flex-col items-center gap-4">
            <div
              className="h-16 w-16 rounded-full bg-[#10B981] flex items-center justify-center animate-bounce"
              style={{ animationIterationCount: 1 }}
            >
              <Check size={36} color="#fff" strokeWidth={3} />
            </div>
            <h2 className="text-[24px] font-semibold text-[#0F2044] text-center">You&apos;re all set!</h2>
            <p className="text-[14px] text-[#6B7280] text-center">Your DSM account is ready</p>
            {error && (
              <p className="text-[13px] text-[#CC2229] text-center" role="alert">{error}</p>
            )}
            <div className="w-full mt-2">
              <Button onClick={finish} disabled={saving} className="h-12">
                {saving ? "Saving…" : "Go to dashboard"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
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
        className="h-12 w-full rounded-lg px-3 text-[14px] text-[#0F2044] bg-white placeholder:text-[#9CA3AF] focus:outline-none focus:border-[#1A52A0]"
        style={{ ...POPPINS, border: "1.5px solid #CBD5E1" }}
      />
    </div>
  );
}
