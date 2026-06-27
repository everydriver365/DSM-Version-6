import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
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
import aiReceptionistAsset from "../assets/ai-receptionist.png.asset.json";
const richardWithCarImg = richardWithCarAsset.url;
const aiReceptionistImg = aiReceptionistAsset.url;
const pupilAppImg = pupilAppsAsset.url;
const testSwapImg = testCentreCelebrationAsset.url;
import telematicsAsset from "../assets/telematics.png.asset.json";
const telematicsImg = telematicsAsset.url;
import drivingSchoolHappyAsset from "../assets/driving-school-happy.png.asset.json";
const drivingSchoolHappyImg = drivingSchoolHappyAsset.url;
import brokenCarAsset from "../assets/broken-down-car.jpg.asset.json";
const brokenCarImg = brokenCarAsset.url;
import marketingWebsiteAsset from "../assets/marketing-website-mockup.png.asset.json";
const marketingWebsiteImg = marketingWebsiteAsset.url;
import explainerPlaceholderAsset from "../assets/instructor-placeholder.png.asset.json";
const explainerPlaceholderImg = explainerPlaceholderAsset.url;

const INTER_FONT = "'Inter', sans-serif";
const NAVY = "#1B2B4B";
const TEAL = "#00B5A5";
const LIGHT = "#F7FAFC";
const SLATE = "#64748B";

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
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap",
      },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    let cancelled = false;
    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      if (data.session) window.location.href = "/home";
      else setChecked(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!checked) return <div className="min-h-screen" style={{ background: LIGHT, fontFamily: INTER_FONT }} />;

  return (
    <div className="min-h-screen antialiased" style={{ fontFamily: INTER_FONT, color: NAVY }}>
      <MarketingNav />
      <main style={{ background: LIGHT }}>
        <Hero />
        <StatsBar />
        <DiarySection />
        <FeaturesShowcase />
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

/* ---------- Hero ---------- */
function Hero() {
  return (
    <section className="relative overflow-hidden" style={{ background: "#FFFFFF" }}>
      <div className="max-w-[1180px] mx-auto px-6 pt-12 pb-8 sm:pt-16 sm:pb-12 md:pt-24 md:pb-16">
        <div className="max-w-2xl">
          <p className="text-base sm:text-lg leading-relaxed mb-6" style={{ color: SLATE }}>
            Put the industry's most advanced diary tool to work and handle demand with ease.
          </p>
          <h1
            className="text-[34px] sm:text-[44px] md:text-[56px] leading-[1.05] font-black tracking-tight mb-6"
            style={{ color: NAVY }}
          >
            Driving School Management
            <span className="block" style={{ color: TEAL }}>
              — Free for Life
            </span>
          </h1>
          <div className="w-24 h-1 mb-8" style={{ background: TEAL }} />
          <Link
            to="/features"
            className="group inline-flex items-center gap-2 text-lg font-bold no-underline transition-colors"
            style={{ color: TEAL }}
          >
            Maximize Your Efficiency
            <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
      </div>

      <div className="px-6 pb-10 sm:pb-16">
        <div className="max-w-[1180px] mx-auto relative">
          <div className="relative rounded-2xl overflow-hidden shadow-xl">
            <img
              src={heroImg}
              alt="Driving instructor with diary app and pupil tracking dashboard"
              width={1280}
              height={1024}
              className="w-full h-auto"
            />
          </div>
          <div
            className="absolute -bottom-4 -right-2 sm:-bottom-6 sm:-right-4 p-4 sm:p-5 rounded-2xl shadow-xl transform rotate-3"
            style={{ background: "#6366F1", color: "#FFFFFF" }}
          >
            <div className="text-2xl sm:text-3xl font-black">98%</div>
            <div className="text-[10px] sm:text-xs font-bold opacity-90 uppercase tracking-tighter">Fill rate</div>
          </div>
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
    { n: "£0", l: "To Get Started" },
  ];
  return (
    <section className="py-6 sm:py-8 px-6 border-y" style={{ background: "#FFFFFF", borderColor: "#EDF2F7" }}>
      <div className="max-w-[1180px] mx-auto grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
        {stats.map((s) => (
          <div key={s.l}>
            <div className="text-3xl sm:text-4xl font-black leading-none mb-1" style={{ color: NAVY }}>
              {s.n}
            </div>
            <div className="text-sm" style={{ color: SLATE }}>
              {s.l}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ---------- Diary section ---------- */
function DiarySection() {
  return (
    <section className="py-16 sm:py-24 md:py-32 px-6" style={{ background: "#FFFFFF" }}>
      <div className="max-w-[1180px] mx-auto">
        <div className="max-w-2xl mb-12 sm:mb-16">
          <p className="text-base sm:text-lg leading-relaxed mb-6" style={{ color: SLATE }}>
            Your diary, your way — completely free. Manage your schedule, track pupil progress, handle payments
            and communicate with learners all in one place.
          </p>
          <h2
            className="text-[28px] sm:text-[38px] md:text-[46px] font-black leading-[1.05] tracking-tight mb-6"
            style={{ color: NAVY }}
          >
            Make light work of lesson scheduling.
          </h2>
          <div className="w-24 h-1 mb-8" style={{ background: TEAL }} />
          <Link
            to="/features"
            className="group inline-flex items-center gap-2 text-lg font-bold no-underline transition-colors"
            style={{ color: TEAL }}
          >
            Explore the diary
            <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>

        <div className="relative rounded-2xl overflow-hidden shadow-xl mb-10 sm:mb-14">
          <div className="aspect-[16/10] grid place-items-center relative overflow-hidden group cursor-pointer" style={{ background: "#152038" }}>
            <img
              src={explainerPlaceholderImg}
              alt="Explainer video preview"
              className="absolute inset-0 w-full h-full object-cover"
            />
            <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.35)" }} />
            <div className="relative flex flex-col items-center gap-3 text-white drop-shadow-lg">
              <span
                className="w-16 h-16 rounded-full grid place-items-center group-hover:opacity-90 transition-opacity"
                style={{ background: TEAL }}
              >
                <Play className="w-6 h-6 fill-white text-white ml-1" />
              </span>
              <span className="text-sm font-medium">Explainer Video</span>
            </div>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-6">
          {[
            {
              title: "Drag-and-drop calendar",
              body: "Move lessons around in seconds with a calendar that adapts to your week.",
              Icon: Calendar,
            },
            {
              title: "Google Calendar sync",
              body: "Keep personal and business calendars in perfect sync automatically.",
              Icon: Globe,
            },
            {
              title: "Automatic gap filling",
              body: "Fill empty slots with waitlisted pupils before they book elsewhere.",
              Icon: Activity,
            },
            {
              title: "SMS reminders",
              body: "Reduce no-shows with automatic lesson reminders for pupils.",
              Icon: Smartphone,
            },
          ].map(({ title, body, Icon }) => (
            <div key={title} className="flex gap-4">
              <div
                className="shrink-0 w-12 h-12 rounded-xl grid place-items-center"
                style={{ background: "#E6F7F6", color: TEAL }}
              >
                <Icon className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-lg mb-1" style={{ color: NAVY }}>
                  {title}
                </h3>
                <p className="text-sm leading-relaxed" style={{ color: SLATE }}>
                  {body}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- Feature zig-zag ---------- */
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
    img: aiReceptionistImg,
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
    <section className="py-16 sm:py-24 md:py-32 px-6" style={{ background: LIGHT }}>
      <div className="max-w-[1180px] mx-auto">
        <div className="max-w-2xl mb-12 sm:mb-16">
          <div
            className="inline-block text-[11px] sm:text-xs uppercase tracking-[0.2em] font-bold mb-4"
            style={{ color: TEAL }}
          >
            Product Tour
          </div>
          <h2
            className="text-[28px] sm:text-[38px] md:text-[46px] font-black leading-[1.05] tracking-tight mb-6"
            style={{ color: NAVY }}
          >
            See it in action
          </h2>
          <p className="text-base sm:text-lg leading-relaxed" style={{ color: SLATE }}>
            From diary management to live telematics — everything you need in one platform.
          </p>
        </div>

        <div className="flex flex-col gap-16 sm:gap-24 md:gap-32">
          {features.map((f, i) => {
            const reverse = i % 2 === 1;
            return (
              <div
                key={`${f.title}-${i}`}
                className={`grid md:grid-cols-2 gap-8 sm:gap-12 items-center ${reverse ? "md:[&>*:first-child]:order-2" : ""}`}
              >
                <div>
                  <div className="relative rounded-2xl overflow-hidden shadow-xl">
                    <img
                      src={f.img}
                      alt={f.title}
                      width={1024}
                      height={1024}
                      loading="lazy"
                      className="w-full h-auto"
                    />
                  </div>
                </div>
                <div>
                  <div className="w-24 h-1 mb-6" style={{ background: TEAL }} />
                  <h3
                    className="text-[24px] sm:text-[32px] md:text-[38px] font-black leading-tight tracking-tight mb-4"
                    style={{ color: NAVY }}
                  >
                    {f.title}
                  </h3>
                  <p className="text-base sm:text-lg leading-relaxed mb-6" style={{ color: SLATE }}>
                    {f.body}
                  </p>
                  <ul className="grid sm:grid-cols-2 gap-3 mb-6">
                    {f.bullets.map((b) => (
                      <li key={b} className="flex items-center gap-2 text-sm font-medium" style={{ color: NAVY }}>
                        <span
                          className="w-5 h-5 rounded-full grid place-items-center shrink-0"
                          style={{ background: "#E6F7F6" }}
                        >
                          <Check className="w-3 h-3" style={{ color: TEAL }} />
                        </span>
                        {b}
                      </li>
                    ))}
                  </ul>
                  <Link
                    to="/features"
                    className="group inline-flex items-center gap-1.5 font-semibold text-sm no-underline"
                    style={{ color: TEAL }}
                  >
                    Learn more <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                  </Link>
                </div>
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
    { n: "01", t: "Create Your Account", b: "Sign up with your email in 60 seconds. No credit card needed.", Icon: Activity },
    { n: "02", t: "Set Up Your Diary", b: "Add availability, import existing pupils, and configure your preferences.", Icon: Calendar },
    { n: "03", t: "Start Teaching", b: "Manage bookings, track payments and grow your business from day one.", Icon: Building2 },
  ];
  return (
    <section className="py-16 sm:py-24 md:py-32 px-6" style={{ background: "#FFFFFF" }}>
      <div className="max-w-[1180px] mx-auto">
        <div className="max-w-2xl mb-12 sm:mb-16">
          <h2
            className="text-[28px] sm:text-[38px] md:text-[46px] font-black leading-[1.05] tracking-tight mb-6"
            style={{ color: NAVY }}
          >
            Up and Running in 3 Minutes
          </h2>
          <p className="text-base sm:text-lg leading-relaxed" style={{ color: SLATE }}>
            No downloads. No setup fees. No hassle.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 sm:gap-12 relative">
          {steps.map(({ n, t, b, Icon }, idx) => (
            <div key={n} className="relative">
              {idx < 2 && (
                <div
                  className="hidden md:block absolute top-10 left-[calc(50%+60px)] right-[-20px] border-t-2 border-dashed"
                  style={{ borderColor: "#E2E8F0" }}
                />
              )}
              <div className="relative inline-block mb-4">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl grid place-items-center" style={{ background: "#E6F7F6" }}>
                  <Icon className="w-7 h-7 sm:w-9 sm:h-9" style={{ color: TEAL }} />
                </div>
                <span
                  className="absolute -top-1 -right-1 text-white text-[11px] sm:text-xs font-bold rounded-full w-6 h-6 sm:w-7 sm:h-7 grid place-items-center shadow-md"
                  style={{ background: TEAL }}
                >
                  {n}
                </span>
              </div>
              <div className="text-lg sm:text-xl font-bold mb-2" style={{ color: NAVY }}>
                {t}
              </div>
              <div className="text-sm sm:text-base leading-relaxed" style={{ color: SLATE }}>
                {b}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- Pricing tiers ---------- */
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
    <section className="py-16 sm:py-24 md:py-32 px-6" style={{ background: NAVY }}>
      <div className="max-w-[1240px] mx-auto">
        <div className="max-w-2xl mb-12 sm:mb-16">
          <h2 className="text-[28px] sm:text-[38px] md:text-[46px] font-black leading-[1.05] tracking-tight mb-6 text-white">
            Start Free. Grow When Ready.
          </h2>
          <p className="text-base sm:text-lg leading-relaxed" style={{ color: "rgba(255,255,255,0.7)" }}>
            The diary is free forever. Add premium tools as your business grows.
          </p>
        </div>

        <div className="flex flex-col gap-4 sm:gap-5 max-w-[1100px]">
          {plans.map((p) => {
            const isPro = p.highlight;
            return (
              <div
                key={p.name}
                className="rounded-2xl overflow-hidden grid md:grid-cols-[300px,1fr]"
                style={{
                  background: isPro ? TEAL : "rgba(255,255,255,0.1)",
                  border: isPro ? "none" : "1px solid rgba(255,255,255,0.2)",
                }}
              >
                <div className="relative aspect-[16/10] md:aspect-auto md:min-h-[200px] p-3 sm:p-4">
                  <img src={p.img} alt={p.name} loading="lazy" className="w-full h-full object-contain" />
                  {isPro && (
                    <span className="absolute top-3 right-3 bg-white text-[10px] uppercase tracking-wider font-bold px-2.5 py-1 rounded-full" style={{ color: TEAL }}>
                      Most popular
                    </span>
                  )}
                </div>
                <div className="p-4 sm:p-6 md:p-8 flex flex-col">
                  <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 mb-2 sm:flex sm:flex-wrap sm:justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <span
                        className="w-9 h-9 rounded-lg grid place-items-center shrink-0"
                        style={{ background: isPro ? "rgba(255,255,255,0.2)" : "rgba(0,181,165,0.2)" }}
                      >
                        <Check className={`w-4 h-4 ${isPro ? "text-white" : ""}`} style={{ color: isPro ? "#FFFFFF" : TEAL }} />
                      </span>
                      <div className="font-black text-lg sm:text-xl text-white">{p.name}</div>
                    </div>
                    <div className="font-bold text-sm sm:text-base shrink-0" style={{ color: isPro ? "#FFFFFF" : TEAL }}>
                      {p.price}
                    </div>
                  </div>
                  <p className="text-sm sm:text-base leading-relaxed mb-3 sm:mb-4" style={{ color: isPro ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.75)" }}>
                    {p.desc}
                  </p>
                  <ul className="grid sm:grid-cols-2 gap-x-6 gap-y-2 mb-4 sm:mb-5 text-sm" style={{ color: isPro ? "#FFFFFF" : "rgba(255,255,255,0.9)" }}>
                    {p.bullets.map((b) => (
                      <li key={b} className="flex items-center gap-2">
                        <Check className="w-4 h-4 shrink-0" style={{ color: isPro ? "#FFFFFF" : TEAL }} /> {b}
                      </li>
                    ))}
                  </ul>
                  <Link
                    to="/pricing"
                    className="self-start inline-flex items-center gap-1.5 font-semibold text-sm no-underline"
                    style={{ color: isPro ? "#FFFFFF" : TEAL }}
                  >
                    {p.cta} <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>

        <div className="text-center mt-8 sm:mt-10">
          <Link
            to="/pricing"
            className="inline-flex items-center gap-2 font-semibold px-6 py-3 rounded-lg no-underline text-sm sm:text-base"
            style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)", color: "#FFFFFF" }}
          >
            Compare All Plans &amp; Features <ArrowRight className="w-4 h-4" />
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
    <section className="py-16 sm:py-24 md:py-32 px-6" style={{ background: "#FFFFFF" }}>
      <div className="max-w-[1180px] mx-auto">
        <div className="max-w-2xl mb-12 sm:mb-16">
          <h2
            className="text-[28px] sm:text-[38px] md:text-[46px] font-black leading-[1.05] tracking-tight mb-6"
            style={{ color: NAVY }}
          >
            Loved by Instructors
          </h2>
          <p className="text-base sm:text-lg leading-relaxed" style={{ color: SLATE }}>
            Real feedback from ADIs using DSM every day.
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-4 sm:gap-6">
          {items.map((t) => (
            <div key={t.n} className="rounded-2xl p-5 sm:p-7 border" style={{ background: "#FFFFFF", borderColor: "#EDF2F7" }}>
              <div className="flex gap-0.5 mb-3 sm:mb-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="w-4 h-4" style={{ color: TEAL, fill: TEAL }} />
                ))}
              </div>
              <p className="text-sm sm:text-base leading-relaxed mb-4 sm:mb-6" style={{ color: SLATE }}>
                "{t.q}"
              </p>
              <div className="flex items-center gap-3 pt-4 border-t" style={{ borderColor: "#EDF2F7" }}>
                <div
                  className="w-10 h-10 rounded-full grid place-items-center text-white font-bold"
                  style={{ background: NAVY }}
                >
                  {t.n.charAt(0)}
                </div>
                <div>
                  <div className="font-bold text-sm" style={{ color: NAVY }}>
                    {t.n}
                  </div>
                  <div className="text-xs" style={{ color: SLATE }}>
                    {t.r}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- Comparison formula ---------- */
function ComparisonFormula() {
  const rows = [
    { l: "Free diary & scheduling", v: "£0", positive: true },
    { l: "Auto mileage tracking = tax savings", v: "£2,250/yr", positive: true },
    { l: "HMRC MTD filing included", v: "Others: £144/yr", positive: true },
    { l: "Pupil app with self-service booking", v: "Included", positive: true },
    { l: "GPS tracking & dashcam", v: "From £17/mo", positive: true },
    { l: "No lock-in, cancel anytime", v: "Always", positive: true },
  ];
  return (
    <section className="py-16 sm:py-24 md:py-32 px-6" style={{ background: LIGHT }}>
      <div className="max-w-[980px] mx-auto">
        <div className="max-w-2xl mb-8 sm:mb-12">
          <div
            className="text-[11px] sm:text-xs uppercase tracking-[0.2em] font-bold mb-4"
            style={{ color: TEAL }}
          >
            The Math Speaks for Itself
          </div>
          <h2
            className="text-[28px] sm:text-[38px] md:text-[46px] font-black leading-[1.05] tracking-tight"
            style={{ color: NAVY }}
          >
            The No-Brainer Formula
          </h2>
        </div>

        <div className="rounded-2xl p-2 md:p-4 border" style={{ background: "#FFFFFF", borderColor: "#EDF2F7" }}>
          {rows.map((r, i) => (
            <div
              key={r.l}
              className={`flex items-center justify-between gap-4 px-4 sm:px-5 py-4 sm:py-5 ${i !== rows.length - 1 ? "border-b" : ""}`}
              style={{ borderColor: "#EDF2F7" }}
            >
              <div className="flex items-center gap-3">
                <span
                  className="w-6 h-6 rounded-full grid place-items-center shrink-0"
                  style={{ background: "#E6F7F6" }}
                >
                  <Check className="w-3.5 h-3.5" style={{ color: TEAL }} />
                </span>
                <span className="font-medium text-sm sm:text-base" style={{ color: NAVY }}>
                  {r.l}
                </span>
              </div>
              <span className="font-bold text-sm sm:text-base shrink-0" style={{ color: TEAL }}>
                {r.v}
              </span>
            </div>
          ))}
        </div>

        <div className="mt-8 sm:mt-10 text-center">
          <p className="text-base sm:text-lg italic max-w-xl mx-auto mb-2" style={{ color: NAVY }}>
            "Save more in tax deductions than the app costs.
          </p>
          <p className="text-lg sm:text-xl font-black mb-6 sm:mb-8" style={{ color: NAVY }}>
            It literally pays for itself."
          </p>
          <Link
            to="/register"
            className="inline-flex items-center gap-2 font-bold px-6 sm:px-8 py-3 sm:py-4 rounded-lg text-sm sm:text-base no-underline"
            style={{ background: TEAL, color: "#FFFFFF" }}
          >
            Start Free Today <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
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
    <section className="py-16 sm:py-24 md:py-32 px-6" style={{ background: TEAL }}>
      <div className="max-w-[1000px] mx-auto text-center">
        <div className="flex flex-wrap justify-center gap-x-6 sm:gap-x-8 gap-y-2 sm:gap-y-3 mb-6 sm:mb-10">
          {platforms.map(({ i: I, t }) => (
            <span key={t} className="inline-flex items-center gap-2 text-sm" style={{ color: "rgba(255,255,255,0.8)" }}>
              <I className="w-4 h-4" /> {t}
            </span>
          ))}
        </div>

        <h2 className="text-[28px] sm:text-[40px] md:text-[52px] font-black tracking-tight mb-3 sm:mb-4 leading-[1.05] text-white">
          Ready to Simplify Your Business?
        </h2>
        <p className="text-base sm:text-lg mb-6 sm:mb-10 max-w-xl mx-auto" style={{ color: "rgba(255,255,255,0.85)" }}>
          Join 500+ driving instructors who've ditched the paper diary. Start free today.
        </p>

        <div className="flex flex-wrap justify-center gap-3">
          <Link
            to="/register"
            className="inline-flex items-center gap-2 font-bold px-6 sm:px-8 py-3 sm:py-4 rounded-lg text-sm sm:text-base no-underline"
            style={{ background: "#FFFFFF", color: TEAL }}
          >
            Create Free Account <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            to="/pricing"
            className="inline-flex items-center gap-2 font-semibold px-6 sm:px-8 py-3 sm:py-4 rounded-lg text-sm sm:text-base no-underline"
            style={{ background: "transparent", border: "2px solid #FFFFFF", color: "#FFFFFF" }}
          >
            Compare Plans
          </Link>
        </div>
      </div>
    </section>
  );
}
