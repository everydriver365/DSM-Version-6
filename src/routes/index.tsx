import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  Calendar,
  Globe,
  Smartphone,
  Activity,
  Building2,
  ArrowRight,
  Play,
  Check,
  Star,
  Sparkles,
} from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { MarketingNav } from "../components/marketing/MarketingNav";
import { MarketingFooter } from "../components/marketing/MarketingFooter";
import heroAsset from "../assets/features-hero.png.asset.json";
const heroImg = heroAsset.url;
import diaryAsset from "../assets/diary-app.png.asset.json";
const diaryImg = diaryAsset.url;
import paymentsAsset from "../assets/flexible-payments.png.asset.json";
const paymentsImg = paymentsAsset.url;
import websiteAsset from "../assets/driving-school-site.png.asset.json";
const websiteImg = websiteAsset.url;
import pupilAppsAsset from "../assets/pupil-apps.png.asset.json";
import testCentreCelebrationAsset from "../assets/test-centre-celebration.jpg.asset.json";
import richardWithCarAsset from "../assets/richard-with-car.jpg.asset.json";
import callAnsweringHeroAsset from "../assets/call-answering-hero.png.asset.json";
const richardWithCarImg = richardWithCarAsset.url;
const callAnsweringHeroImg = callAnsweringHeroAsset.url;
const pupilAppImg = pupilAppsAsset.url;
const testSwapImg = testCentreCelebrationAsset.url;
import telematicsAsset from "../assets/telematics.png.asset.json";
const telematicsImg = telematicsAsset.url;
import drivingSchoolHappyAsset from "../assets/driving-school-happy.png.asset.json";
const drivingSchoolHappyImg = drivingSchoolHappyAsset.url;
import marketingWebsiteAsset from "../assets/marketing-website-mockup.png.asset.json";
const marketingWebsiteImg = marketingWebsiteAsset.url;
import explainerPlaceholderAsset from "../assets/instructor-placeholder.png.asset.json";
const explainerPlaceholderImg = explainerPlaceholderAsset.url;

const FONT = "'Poppins', system-ui, -apple-system, sans-serif";
const NAVY = "#1B2B4B";
const NAVY_SOFT = "#243a66";
const BLUE = "#0E7CCE";
const BLUE_DARK = "#0B69AD";
const BLUE_TINT = "#EAF4FC";
const BG = "#F7FAFC";
const INK = "#0F172A";
const MUTED = "#64748B";
const HAIRLINE = "#E5E9F2";

const SHADOW_SOFT =
  "0 1px 2px rgba(15,23,42,0.04), 0 8px 24px rgba(15,23,42,0.06)";
const SHADOW_LIFT =
  "0 1px 2px rgba(15,23,42,0.04), 0 24px 60px rgba(27,43,75,0.14)";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Driving School Manager — Free forever for UK driving instructors" },
      {
        name: "description",
        content:
          "Manage lessons, take payments, track pupils and grow your driving school — all from one free app. Built for UK ADIs & PDIs.",
      },
      { property: "og:title", content: "Driving School Manager — Free for every driving instructor" },
      {
        property: "og:description",
        content:
          "The all-in-one diary, payments and pupil management app for UK driving instructors. Free forever.",
      },
    ],
  }),
  component: HomePage,
});

/* ---------- Scroll-reveal helper ---------- */
function Reveal({
  children,
  delay = 0,
  className = "",
  style,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
  style?: React.CSSProperties;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const prefersReduce =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduce) {
      setShown(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            setShown(true);
            io.disconnect();
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div
      ref={ref as React.RefObject<HTMLDivElement>}
      className={className}
      style={{
        opacity: shown ? 1 : 0,
        transform: shown ? "translateY(0)" : "translateY(16px)",
        transition: `opacity 600ms cubic-bezier(.22,.61,.36,1) ${delay}ms, transform 600ms cubic-bezier(.22,.61,.36,1) ${delay}ms`,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function HomePage() {
  const navigate = useNavigate();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    let cancelled = false;
    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      if (data.session) navigate({ to: "/home", replace: true });
      else setChecked(true);
    });
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  if (!checked)
    return (
      <div
        className="min-h-screen"
        style={{ background: BG, fontFamily: FONT }}
      />
    );

  return (
    <div
      className="min-h-screen antialiased"
      style={{ fontFamily: FONT, color: INK, background: BG }}
    >
      <MarketingNav />
      <main>
        <Hero />
        <StatsBar />
        <DiarySection />
        <FeaturesShowcase />
        <PaymentsFeatureDuplicate />
        <HowItWorks />
        <PricingTiers />
        <Testimonials />
        <ComparisonFormula />
        <FinalCTA />
      </main>
      <MarketingFooter />
    </div>
  );
}

/* ---------- Eyebrow pill ---------- */
function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold uppercase"
      style={{
        background: BLUE_TINT,
        color: BLUE_DARK,
        letterSpacing: "0.14em",
      }}
    >
      <Sparkles className="w-3 h-3" />
      {children}
    </span>
  );
}

/* ---------- Hero ---------- */
function Hero() {
  return (
    <section
      className="relative overflow-hidden"
      style={{
        background:
          "radial-gradient(1100px 600px at 50% -10%, rgba(14,124,206,0.12), transparent 60%), radial-gradient(800px 500px at 90% 10%, rgba(27,43,75,0.06), transparent 60%), " +
          BG,
      }}
    >
      <div className="max-w-[1180px] mx-auto px-5 sm:px-8 pt-6 sm:pt-14 lg:pt-[88px] pb-12 sm:pb-16 lg:pb-24">
        <div className="grid lg:grid-cols-[1.05fr_1fr] gap-12 lg:gap-16 items-center">
          <div>
            <Reveal delay={80}>
              <h1
                className="mt-5 font-bold tracking-tight"
                style={{
                  color: NAVY,
                  fontSize: "clamp(36px, 6vw, 64px)",
                  lineHeight: 1.04,
                  letterSpacing: "-0.025em",
                }}
              >
                Driving school management,
                <span style={{ color: BLUE }}> made effortless.</span>
              </h1>
            </Reveal>
            <Reveal delay={140}>
              <p
                className="mt-6 max-w-xl"
                style={{
                  color: MUTED,
                  fontSize: "clamp(16px, 1.4vw, 18px)",
                  lineHeight: 1.65,
                }}
              >
                Put the industry's most advanced diary to work — schedule lessons,
                take payments, and grow your pupil base from one beautiful app.
                Free forever.
              </p>
            </Reveal>
            <Reveal delay={200}>
              <div className="mt-8 flex flex-row gap-3">
                <Link
                  to="/register"
                  className="group inline-flex flex-1 sm:flex-none items-center justify-center gap-2 rounded-xl px-5 sm:px-7 py-3.5 font-semibold no-underline transition-all"
                  style={{
                    background: BLUE,
                    color: "#fff",
                    boxShadow: "0 10px 24px rgba(14,124,206,0.35)",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = BLUE_DARK;
                    e.currentTarget.style.transform = "translateY(-1px)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = BLUE;
                    e.currentTarget.style.transform = "translateY(0)";
                  }}
                >
                  Start free
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
                <Link
                  to="/features"
                  className="inline-flex flex-1 sm:flex-none items-center justify-center gap-2 rounded-xl px-5 sm:px-7 py-3.5 font-semibold no-underline transition-colors"
                  style={{
                    background: "#fff",
                    color: NAVY,
                    border: `1px solid ${HAIRLINE}`,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "#F1F5F9";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "#fff";
                  }}
                >
                  See features
                </Link>
              </div>
            </Reveal>
            <Reveal delay={260}>
              <div
                className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm"
                style={{ color: MUTED }}
              >
                <span className="inline-flex items-center gap-1.5">
                  <Check className="w-4 h-4" style={{ color: BLUE }} /> No card required
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Check className="w-4 h-4" style={{ color: BLUE }} /> Cancel anytime
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Check className="w-4 h-4" style={{ color: BLUE }} /> GDPR compliant
                </span>
              </div>
            </Reveal>
          </div>

          <Reveal delay={120}>
            <div className="relative">
              <div
                aria-hidden
                className="absolute -inset-6 rounded-[40px]"
                style={{
                  background:
                    "linear-gradient(135deg, rgba(14,124,206,0.18), rgba(27,43,75,0.10))",
                  filter: "blur(40px)",
                }}
              />
              <div
                className="relative rounded-[28px] overflow-hidden bg-white"
                style={{ boxShadow: SHADOW_LIFT, border: `1px solid ${HAIRLINE}` }}
              >
                <img
                  src={heroImg}
                  alt="Driving instructor diary and pupil tracking dashboard"
                  width={1280}
                  height={1024}
                  className="w-full h-auto block"
                />
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

/* ---------- Stats bar ---------- */
function StatsBar() {
  const stats = [
    { n: "500+", l: "Active Instructors" },
    { n: "50,000+", l: "Lessons Managed" },
    { n: "4.9★", l: "Average Rating" },
    { n: "£0", l: "Free Forever *" },
  ];
  return (
    <section className="px-5 sm:px-8 pb-2">
      <div className="max-w-[1180px] mx-auto">
        <Reveal>
          <div
            className="rounded-3xl bg-white px-6 sm:px-10 py-7 sm:py-9 grid grid-cols-2 md:grid-cols-4 gap-y-6 gap-x-4"
            style={{ boxShadow: SHADOW_SOFT, border: `1px solid ${HAIRLINE}` }}
          >
            {stats.map((s, i) => (
              <div
                key={s.l}
                className={`text-center ${i > 0 ? "md:border-l" : ""}`}
                style={{ borderColor: HAIRLINE }}
              >
                <div
                  className="font-bold leading-none mb-1.5"
                  style={{
                    color: NAVY,
                    fontSize: "clamp(28px, 3vw, 36px)",
                    letterSpacing: "-0.02em",
                  }}
                >
                  {s.n}
                </div>
                <div
                  className="text-[13px] font-medium"
                  style={{ color: MUTED }}
                >
                  {s.l}
                </div>
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ---------- Section heading ---------- */
function SectionHead({
  eyebrow,
  title,
  body,
  align = "left",
}: {
  eyebrow?: string;
  title: ReactNode;
  body?: ReactNode;
  align?: "left" | "center";
}) {
  return (
    <div
      className={`max-w-2xl mb-12 sm:mb-16 ${align === "center" ? "mx-auto text-center" : ""}`}
    >
      {eyebrow && (
        <Reveal>
          <Eyebrow>{eyebrow}</Eyebrow>
        </Reveal>
      )}
      <Reveal delay={60}>
        <h2
          className={`${eyebrow ? "mt-5" : ""} font-bold tracking-tight`}
          style={{
            color: NAVY,
            fontSize: "clamp(28px, 4vw, 44px)",
            lineHeight: 1.1,
            letterSpacing: "-0.02em",
          }}
        >
          {title}
        </h2>
      </Reveal>
      {body && (
        <Reveal delay={120}>
          <p
            className="mt-5"
            style={{ color: MUTED, fontSize: 18, lineHeight: 1.65 }}
          >
            {body}
          </p>
        </Reveal>
      )}
    </div>
  );
}

/* ---------- Explainer video section ---------- */
function DiarySection() {
  return (
    <section className="py-20 sm:py-28 lg:py-36 px-5 sm:px-8 overflow-hidden">
      <div className="max-w-[1180px] mx-auto">
        <div className="grid lg:grid-cols-[1fr_1.12fr] gap-12 lg:gap-16 items-center">
          <div>
            <Reveal delay={80}>
              <h2
                className="font-bold tracking-tight"
                style={{
                  color: NAVY,
                  fontSize: "clamp(32px, 4.2vw, 52px)",
                  lineHeight: 1.08,
                  letterSpacing: "-0.025em",
                }}
              >
                Learn all about DSM and how we can help you.
              </h2>
            </Reveal>
            <Reveal delay={140}>
              <p
                className="mt-6 max-w-md"
                style={{
                  color: MUTED,
                  fontSize: "clamp(16px, 1.4vw, 18px)",
                  lineHeight: 1.65,
                }}
              >
                See how driving instructors use our free diary, payments and
                pupil tools to save hours every week and run a more
                professional driving school.
              </p>
            </Reveal>
            <Reveal delay={200}>
              <a
                href="#video"
                className="group inline-flex items-center gap-2 mt-8 pt-6 font-semibold transition-colors"
                style={{
                  color: BLUE,
                  borderTop: `1px solid ${HAIRLINE}`,
                  fontSize: 16,
                }}
                onClick={(e) => {
                  e.preventDefault();
                  document
                    .getElementById("explainer-video")
                    ?.scrollIntoView({ behavior: "smooth", block: "center" });
                }}
              >
                Watch the 90-second tour
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </a>
            </Reveal>
          </div>

          <Reveal delay={120}>
            <div id="explainer-video" className="relative">
              <div
                aria-hidden
                className="absolute -inset-8 rounded-[40px] opacity-60"
                style={{
                  background:
                    "radial-gradient(600px 400px at 70% 40%, rgba(14,124,206,0.14), transparent 60%), radial-gradient(500px 300px at 20% 80%, rgba(27,43,75,0.08), transparent 60%)",
                }}
              />
              <div
                className="relative rounded-[24px] overflow-hidden bg-white"
                style={{
                  boxShadow: SHADOW_LIFT,
                  border: `1px solid ${HAIRLINE}`,
                }}
              >
                <div
                  className="aspect-video grid place-items-center relative overflow-hidden group cursor-pointer"
                  style={{ background: NAVY }}
                >
                  <img
                    src={explainerPlaceholderImg}
                    alt="Explainer video preview"
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                  <div
                    className="absolute inset-0"
                    style={{
                      background:
                        "linear-gradient(180deg, rgba(15,23,42,0.25) 0%, rgba(15,23,42,0.55) 100%)",
                    }}
                  />
                  <div className="relative flex flex-col items-center gap-3 text-white drop-shadow-lg">
                    <span
                      className="w-16 h-16 sm:w-20 sm:h-20 rounded-full grid place-items-center transition-transform group-hover:scale-105"
                      style={{
                        background: BLUE,
                        boxShadow: "0 12px 30px rgba(14,124,206,0.55)",
                      }}
                    >
                      <Play className="w-6 h-6 sm:w-7 sm:h-7 fill-white text-white ml-1" />
                    </span>
                    <span className="text-sm sm:text-base font-medium tracking-wide">
                      Watch the 90-second tour
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

/* ---------- Features showcase ---------- */
const features = [
  {
    img: paymentsImg,
    title: "Effortless Payments",
    body: "Take card, Apple Pay and Google Pay in-lesson via QR code. Chase outstanding balances and generate professional invoices — all built into your diary.",
    bullets: ["Payment status tracking", "Automatic reminders", "PDF invoices", "Revenue reports"],
  },
  {
    img: websiteImg,
    title: "Your Own Professional Website",
    body: "Get a branded .co.uk website with direct pupil booking. Show up in Google searches and stand out from the competition.",
    bullets: ["Custom domain name", "SEO optimised pages", "Online booking", "Review showcase"],
  },
  {
    img: marketingWebsiteImg,
    title: "Free Advertising",
    body: "Get a branded .co.uk website with direct pupil booking. Show up in Google searches and stand out from the competition.",
    bullets: ["Custom domain name", "SEO optimised pages", "Online booking", "Review showcase"],
  },
  {
    img: pupilAppImg,
    title: "Apps for Everyone",
    body: "Dedicated apps for pupils, parents and instructors — free on every plan. Track progress, stay informed, and manage your business from anywhere.",
    bullets: ["Pupil progress dashboard", "Parent lesson notifications", "AI coaching tips", "Mock theory tests"],
  },
  {
    img: richardWithCarImg,
    title: "Free Health Insurance",
    body: "On our paid plans get FREE healthcover with Bennenden Health or Vitality to look after you when you ill.",
    bullets: ["Bennenden Health option", "Vitality option", "No medical required", "Included in paid plans"],
  },
  {
    img: callAnsweringHeroImg,
    title: "Call Answering Service",
    body: "Never miss a new pupil enquiry. Our AI receptionist answers calls, takes messages and books appointments while you teach.",
    bullets: ["24/7 call handling", "Instant SMS summary", "Calendar integration", "Affordable add-on"],
  },
  {
    img: testSwapImg,
    title: "Free Test Swapping App",
    body: "Swap driving test slots with other instructors instantly. Reduce cancellations and keep your pupils moving towards test day.",
    bullets: ["Real-time slot swaps", "Push notifications", "DVSA test centre data", "Free with core app"],
  },
  {
    img: telematicsImg,
    title: "Telematics & Driving Data",
    body: "Monitor speed, driver scoring and trip history in real time. Give your pupils measurable feedback backed by data.",
    bullets: ["Live speed monitoring", "Driver scoring", "Trip replay & reports", "Progress tracking"],
  },
  {
    img: drivingSchoolHappyImg,
    title: "Multi Car Schools",
    body: "Manage multiple instructors, vehicles and diaries from one central dashboard. Built for growing driving schools.",
    bullets: ["Multi-instructor diary", "Vehicle assignment", "Central reporting", "Role-based access"],
  },
];

function FeaturesShowcase() {
  return (
    <section
      className="py-20 sm:py-28 lg:py-36 px-5 sm:px-8"
      style={{ background: "#fff" }}
    >
      <div className="max-w-[1180px] mx-auto">
        <SectionHead
          eyebrow="Product tour"
          title="Everything you need, beautifully connected."
          body="From diary management to live telematics — one platform, one login, one experience your pupils will love."
        />

        <div className="flex flex-col gap-20 sm:gap-28 lg:gap-36">
          {features.map((f, i) => {
            const reverse = i % 2 === 1;
            return (
              <div
                key={`${f.title}-${i}`}
                className={`grid md:grid-cols-2 gap-10 sm:gap-14 items-center ${
                  reverse ? "md:[&>*:first-child]:order-2" : ""
                }`}
              >
                <Reveal>
                  <div className="relative">
                    <div
                      aria-hidden
                      className="absolute -inset-4 rounded-[36px]"
                      style={{
                        background:
                          "linear-gradient(135deg, rgba(14,124,206,0.10), rgba(27,43,75,0.06))",
                        filter: "blur(28px)",
                      }}
                    />
                    <div
                      className="relative rounded-[24px] overflow-hidden bg-white"
                      style={{
                        boxShadow: SHADOW_LIFT,
                        border: `1px solid ${HAIRLINE}`,
                      }}
                    >
                      <img
                        src={f.img}
                        alt={f.title}
                        width={1024}
                        height={1024}
                        loading="lazy"
                        className="w-full h-auto block"
                      />
                    </div>
                  </div>
                </Reveal>
                <Reveal delay={100}>
                  <div>
                    <Eyebrow>Feature</Eyebrow>
                    <h3
                      className="mt-4 font-bold tracking-tight"
                      style={{
                        color: NAVY,
                        fontSize: "clamp(24px, 3vw, 34px)",
                        lineHeight: 1.15,
                        letterSpacing: "-0.02em",
                      }}
                    >
                      {f.title}
                    </h3>
                    <p
                      className="mt-4"
                      style={{
                        color: MUTED,
                        fontSize: 17,
                        lineHeight: 1.65,
                      }}
                    >
                      {f.body}
                    </p>
                    <ul className="mt-6 grid sm:grid-cols-2 gap-3">
                      {f.bullets.map((b) => (
                        <li
                          key={b}
                          className="flex items-center gap-2.5 text-[14px] font-medium"
                          style={{ color: NAVY }}
                        >
                          <span
                            className="w-5 h-5 rounded-full grid place-items-center shrink-0"
                            style={{ background: BLUE_TINT }}
                          >
                            <Check
                              className="w-3 h-3"
                              style={{ color: BLUE_DARK }}
                            />
                          </span>
                          {b}
                        </li>
                      ))}
                    </ul>
                    <Link
                      to="/features"
                      className="group mt-7 inline-flex items-center gap-1.5 font-semibold no-underline"
                      style={{ color: BLUE_DARK }}
                    >
                      Learn more
                      <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                    </Link>
                  </div>
                </Reveal>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ---------- How it works ---------- */
function HowItWorks() {
  const steps = [
    {
      n: "01",
      t: "Create Your Account",
      b: "Sign up with your email in 60 seconds. No credit card needed.",
      Icon: Activity,
    },
    {
      n: "02",
      t: "Set Up Your Diary",
      b: "Add availability, import existing pupils, and configure your preferences.",
      Icon: Calendar,
    },
    {
      n: "03",
      t: "Start Teaching",
      b: "Manage bookings, track payments and grow your business from day one.",
      Icon: Building2,
    },
  ];
  return (
    <section className="py-20 sm:py-28 lg:py-36 px-5 sm:px-8">
      <div className="max-w-[1180px] mx-auto">
        <SectionHead
          eyebrow="Getting started"
          title="Up and running in 3 minutes."
          body="No downloads. No setup fees. No hassle."
        />

        <div className="grid md:grid-cols-3 gap-5 sm:gap-6">
          {steps.map(({ n, t, b, Icon }, i) => (
            <Reveal key={n} delay={i * 80}>
              <div
                className="h-full rounded-2xl bg-white p-7 sm:p-8 transition-all"
                style={{
                  border: `1px solid ${HAIRLINE}`,
                  boxShadow: SHADOW_SOFT,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-2px)";
                  e.currentTarget.style.boxShadow = SHADOW_LIFT;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = SHADOW_SOFT;
                }}
              >
                <div className="flex items-start justify-between mb-6">
                  <span
                    className="w-12 h-12 rounded-xl grid place-items-center"
                    style={{ background: BLUE_TINT, color: BLUE_DARK }}
                  >
                    <Icon className="w-6 h-6" />
                  </span>
                  <span
                    className="text-3xl font-bold"
                    style={{ color: BLUE, opacity: 0.4, letterSpacing: "-0.04em" }}
                  >
                    {n}
                  </span>
                </div>
                <div
                  className="text-lg font-semibold mb-2"
                  style={{ color: NAVY }}
                >
                  {t}
                </div>
                <p
                  className="text-[15px] leading-relaxed"
                  style={{ color: MUTED }}
                >
                  {b}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- Pricing ---------- */
function PricingTiers() {
  const plans = [
    {
      name: "Free",
      price: "Free Forever",
      img: diaryImg,
      desc: "Your complete lesson management hub — scheduling, payments, and gap-filling in one place.",
      bullets: ["Drag-and-drop calendar", "Google Calendar sync", "Gap filling & SMS", "Payment tracking"],
      cta: "Get started free",
      highlight: false,
    },
    {
      name: "All-In",
      price: "£7.99/mo",
      img: websiteImg,
      desc: "Everything to run your business — website, custom domain, online booking and marketing tools.",
      bullets: ["Custom .co.uk domain", "Online booking", "SEO optimised", "Review showcase"],
      cta: "Learn more",
      highlight: true,
    },
    {
      name: "GPS + Health",
      price: "£34.99/mo",
      img: telematicsImg,
      desc: "Live GPS tracking, mileage logging and route replay — plus Basic Health cover included.",
      bullets: ["Live GPS tracking", "Mileage logging", "Basic Health cover", "All All-In features"],
      cta: "Learn more",
      highlight: false,
    },
    {
      name: "Dashcam + Health",
      price: "£54.99/mo",
      img: pupilAppImg,
      desc: "Forward-facing dashcam protection with Enhanced Health cover — dental, optical, GP & more.",
      bullets: ["Dashcam protection", "Enhanced Health cover", "Cloud storage", "All GPS features"],
      cta: "Learn more",
      highlight: false,
    },
  ];

  return (
    <section
      className="py-20 sm:py-28 lg:py-36 px-5 sm:px-8"
      style={{ background: "#fff" }}
    >
      <div className="max-w-[1180px] mx-auto">
        <SectionHead
          eyebrow="Pricing"
          title="Start free. Grow when ready."
          body="The diary is free forever. Add premium tools as your business grows."
        />

        <div className="grid md:grid-cols-2 gap-5 sm:gap-6">
          {plans.map((p, i) => {
            const isPro = p.highlight;
            return (
              <Reveal key={p.name} delay={i * 70}>
                <div
                  className="relative h-full rounded-3xl overflow-hidden transition-all"
                  style={{
                    background: "#fff",
                    border: isPro ? `2px solid ${BLUE}` : `1px solid ${HAIRLINE}`,
                    boxShadow: isPro ? SHADOW_LIFT : SHADOW_SOFT,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-3px)";
                    e.currentTarget.style.boxShadow = SHADOW_LIFT;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = isPro
                      ? SHADOW_LIFT
                      : SHADOW_SOFT;
                  }}
                >
                  {isPro && (
                    <span
                      className="absolute top-5 right-5 text-[10px] uppercase font-bold px-2.5 py-1 rounded-full"
                      style={{
                        background: BLUE,
                        color: "#fff",
                        letterSpacing: "0.12em",
                      }}
                    >
                      Most popular
                    </span>
                  )}
                  <div
                    className="aspect-[16/9] p-6 grid place-items-center"
                    style={{ background: BG }}
                  >
                    <img
                      src={p.img}
                      alt={p.name}
                      loading="lazy"
                      className="max-h-full w-auto object-contain"
                    />
                  </div>
                  <div className="p-7 sm:p-8">
                    <div className="flex items-baseline justify-between gap-4 mb-2">
                      <div
                        className="font-bold text-xl"
                        style={{ color: NAVY }}
                      >
                        {p.name}
                      </div>
                      <div
                        className="font-bold text-base shrink-0"
                        style={{ color: BLUE_DARK }}
                      >
                        {p.price}
                      </div>
                    </div>
                    <p
                      className="text-[15px] leading-relaxed mb-5"
                      style={{ color: MUTED }}
                    >
                      {p.desc}
                    </p>
                    <ul className="grid sm:grid-cols-2 gap-2.5 mb-6 text-[14px]">
                      {p.bullets.map((b) => (
                        <li
                          key={b}
                          className="flex items-center gap-2"
                          style={{ color: NAVY }}
                        >
                          <Check
                            className="w-4 h-4 shrink-0"
                            style={{ color: BLUE }}
                          />{" "}
                          {b}
                        </li>
                      ))}
                    </ul>
                    <Link
                      to="/pricing"
                      className="group inline-flex items-center gap-1.5 font-semibold no-underline"
                      style={{ color: BLUE_DARK }}
                    >
                      {p.cta}{" "}
                      <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                    </Link>
                  </div>
                </div>
              </Reveal>
            );
          })}
        </div>

        <div className="text-center mt-12">
          <Link
            to="/pricing"
            className="inline-flex items-center gap-2 font-semibold px-6 py-3 rounded-xl no-underline"
            style={{
              background: BG,
              border: `1px solid ${HAIRLINE}`,
              color: NAVY,
            }}
          >
            Compare all plans &amp; features <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ---------- Testimonials ---------- */
function Testimonials() {
  const items = [
    {
      q: "I used to spend Sunday evenings sorting my diary and chasing payments. Now the app does it all — I just teach.",
      n: "Sarah M.",
      r: "ADI, Manchester",
    },
    {
      q: "The telematics changed how I teach. Pupils can actually see their improvement in data — it's incredibly motivating.",
      n: "James T.",
      r: "ADI, Bristol",
    },
    {
      q: "Parents love the live tracking. It's given me a real edge over other instructors in my area.",
      n: "Priya K.",
      r: "ADI, Birmingham",
    },
  ];
  return (
    <section className="py-20 sm:py-28 lg:py-36 px-5 sm:px-8">
      <div className="max-w-[1180px] mx-auto">
        <SectionHead
          eyebrow="Loved by instructors"
          title="Built with ADIs, for ADIs."
          body="Real feedback from UK instructors using DSM every day."
        />
        <div className="grid md:grid-cols-3 gap-5 sm:gap-6">
          {items.map((t, i) => (
            <Reveal key={t.n} delay={i * 80}>
              <div
                className="h-full rounded-2xl bg-white p-7 transition-all"
                style={{
                  border: `1px solid ${HAIRLINE}`,
                  boxShadow: SHADOW_SOFT,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-2px)";
                  e.currentTarget.style.boxShadow = SHADOW_LIFT;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = SHADOW_SOFT;
                }}
              >
                <div className="flex gap-1 mb-4">
                  {Array.from({ length: 5 }).map((_, idx) => (
                    <Star
                      key={idx}
                      className="w-4 h-4"
                      style={{ color: BLUE, fill: BLUE }}
                    />
                  ))}
                </div>
                <p
                  className="text-[16px] leading-relaxed mb-6"
                  style={{ color: INK }}
                >
                  &ldquo;{t.q}&rdquo;
                </p>
                <div
                  className="flex items-center gap-3 pt-5 border-t"
                  style={{ borderColor: HAIRLINE }}
                >
                  <div
                    className="w-10 h-10 rounded-full grid place-items-center text-white font-bold"
                    style={{
                      background: `linear-gradient(135deg, ${NAVY}, ${NAVY_SOFT})`,
                    }}
                  >
                    {t.n.charAt(0)}
                  </div>
                  <div>
                    <div
                      className="font-semibold text-sm"
                      style={{ color: NAVY }}
                    >
                      {t.n}
                    </div>
                    <div className="text-xs" style={{ color: MUTED }}>
                      {t.r}
                    </div>
                  </div>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- Comparison formula ---------- */
function ComparisonFormula() {
  const rows = [
    { l: "Free diary & scheduling", v: "£0" },
    { l: "Auto mileage tracking = tax savings", v: "£2,250/yr" },
    { l: "HMRC MTD filing included", v: "Others: £144/yr" },
    { l: "Pupil app with self-service booking", v: "Included" },
    { l: "GPS tracking & dashcam", v: "From £17/mo" },
    { l: "No lock-in, cancel anytime", v: "Always" },
  ];
  return (
    <section
      className="py-20 sm:py-28 lg:py-36 px-5 sm:px-8"
      style={{ background: "#fff" }}
    >
      <div className="max-w-[980px] mx-auto">
        <SectionHead
          eyebrow="The math speaks for itself"
          title="The no-brainer formula."
        />

        <Reveal>
          <div
            className="rounded-3xl overflow-hidden"
            style={{
              background: BG,
              border: `1px solid ${HAIRLINE}`,
              boxShadow: SHADOW_SOFT,
            }}
          >
            {rows.map((r, i) => (
              <div
                key={r.l}
                className={`flex items-center justify-between gap-4 px-5 sm:px-7 py-5 sm:py-6 ${
                  i !== rows.length - 1 ? "border-b" : ""
                }`}
                style={{ borderColor: HAIRLINE }}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span
                    className="w-7 h-7 rounded-full grid place-items-center shrink-0"
                    style={{ background: BLUE_TINT }}
                  >
                    <Check
                      className="w-3.5 h-3.5"
                      style={{ color: BLUE_DARK }}
                    />
                  </span>
                  <span
                    className="font-medium text-[15px] sm:text-base"
                    style={{ color: NAVY }}
                  >
                    {r.l}
                  </span>
                </div>
                <span
                  className="font-bold text-[14px] sm:text-base shrink-0"
                  style={{ color: BLUE_DARK }}
                >
                  {r.v}
                </span>
              </div>
            ))}
          </div>
        </Reveal>

        <Reveal delay={120}>
          <div className="mt-12 text-center">
            <p
              className="text-base sm:text-lg italic max-w-xl mx-auto mb-1"
              style={{ color: NAVY }}
            >
              &ldquo;Save more in tax deductions than the app costs.
            </p>
            <p
              className="text-lg sm:text-xl font-bold mb-8"
              style={{ color: NAVY }}
            >
              It literally pays for itself.&rdquo;
            </p>
            <Link
              to="/register"
              className="inline-flex items-center gap-2 font-semibold px-7 py-3.5 rounded-xl no-underline transition-all"
              style={{
                background: BLUE,
                color: "#fff",
                boxShadow: "0 12px 28px rgba(14,124,206,0.35)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = BLUE_DARK;
                e.currentTarget.style.transform = "translateY(-1px)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = BLUE;
                e.currentTarget.style.transform = "translateY(0)";
              }}
            >
              Start free today <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ---------- Final CTA ---------- */
function FinalCTA() {
  const platforms = [
    { i: Smartphone, t: "iOS & Android" },
    { i: Globe, t: "Web App" },
    { i: Activity, t: "24/7 Access" },
    { i: Building2, t: "GDPR Compliant" },
  ];
  return (
    <section className="px-5 sm:px-8 py-16 sm:py-24">
      <div className="max-w-[1180px] mx-auto">
        <Reveal>
          <div
            className="relative overflow-hidden rounded-[32px] px-6 sm:px-10 lg:px-16 py-16 sm:py-20 lg:py-24 text-center"
            style={{
              background: `linear-gradient(135deg, ${NAVY} 0%, ${NAVY_SOFT} 100%)`,
              boxShadow: SHADOW_LIFT,
            }}
          >
            <div
              aria-hidden
              className="absolute inset-0 pointer-events-none"
              style={{
                background:
                  "radial-gradient(600px 300px at 80% 0%, rgba(14,124,206,0.35), transparent 60%), radial-gradient(500px 280px at 10% 100%, rgba(14,124,206,0.18), transparent 60%)",
              }}
            />
            <div className="relative">
              <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 mb-8">
                {platforms.map(({ i: I, t }) => (
                  <span
                    key={t}
                    className="inline-flex items-center gap-2 text-[13px]"
                    style={{ color: "rgba(255,255,255,0.75)" }}
                  >
                    <I className="w-4 h-4" /> {t}
                  </span>
                ))}
              </div>

              <h2
                className="font-bold tracking-tight mb-4 text-white mx-auto max-w-2xl"
                style={{
                  fontSize: "clamp(28px, 4.4vw, 48px)",
                  lineHeight: 1.08,
                  letterSpacing: "-0.025em",
                }}
              >
                Ready to simplify your business?
              </h2>
              <p
                className="text-base sm:text-lg mb-10 max-w-xl mx-auto"
                style={{ color: "rgba(255,255,255,0.78)" }}
              >
                Join 500+ driving instructors who've ditched the paper diary.
                Start free today.
              </p>

              <div className="flex flex-row sm:flex-wrap justify-center gap-3">
                <Link
                  to="/register"
                  className="inline-flex flex-1 sm:flex-none items-center justify-center gap-2 font-semibold px-7 py-3.5 rounded-xl no-underline transition-all"
                  style={{
                    background: BLUE,
                    color: "#fff",
                    boxShadow: "0 12px 30px rgba(14,124,206,0.45)",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = BLUE_DARK;
                    e.currentTarget.style.transform = "translateY(-1px)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = BLUE;
                    e.currentTarget.style.transform = "translateY(0)";
                  }}
                >
                  Create free account <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  to="/pricing"
                  className="inline-flex flex-1 sm:flex-none items-center justify-center gap-2 font-semibold px-7 py-3.5 rounded-xl no-underline"
                  style={{
                    background: "rgba(255,255,255,0.08)",
                    border: "1px solid rgba(255,255,255,0.25)",
                    color: "#fff",
                  }}
                >
                  Compare plans
                </Link>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
