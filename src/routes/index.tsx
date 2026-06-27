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

  if (!checked) return <div className="min-h-screen bg-[#F7FAFC]" style={{ fontFamily: INTER_FONT }} />;

  return (
    <div className="min-h-screen text-[#2D3748] antialiased bg-[#F7FAFC]" style={{ fontFamily: INTER_FONT }}>
      <MarketingNav />
      <Hero />
      <DiarySection />
      <StatsBar />
      <FeaturesShowcase />
      <HowItWorks />
      <PricingTiers />
      <Testimonials />
      <ComparisonFormula />
      <FinalCTA />
      <MarketingFooter />
    </div>
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
    <section className="bg-white py-5 sm:py-7 px-6 border-y border-gray-100">
      <div className="max-w-[1180px] mx-auto grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
        {stats.map((s) => (
          <div key={s.l}>
            <div className="text-3xl md:text-4xl font-black text-[#1B2B4B] leading-none mb-1">{s.n}</div>
            <div className="text-[#718096] text-sm">{s.l}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ---------- Hero ---------- */
function Hero() {
  return (
    <section className="relative overflow-hidden bg-[#F7FAFC]">
      <div className="max-w-[1240px] mx-auto px-5 sm:px-6 py-8 sm:py-12 md:py-24 grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
        <div>
          <h1 className="text-[28px] sm:text-[44px] md:text-[64px] leading-[1.05] font-black tracking-tight text-[#1B2B4B] mb-3">
            Driving School{" "}
            <span className="block md:inline">Management</span>
          </h1>

          <div className="text-[16px] sm:text-[22px] md:text-[26px] font-bold text-[#1B2B4B] mb-3">
            Free forever for{" "}
            <span className="text-[#00B5A5] underline decoration-[3px] underline-offset-[6px] decoration-[#00B5A5]/30">
              ADIs &amp; PDIs
            </span>
          </div>

          <p className="text-[14px] sm:text-[17px] text-gray-600 leading-relaxed mb-4 max-w-md">
            Manage your lessons, track payments, and grow your business — all from one app.
            No credit card required.
          </p>

          <div className="flex flex-col sm:flex-row sm:flex-wrap gap-3">
            <Link
              to="/register"
              className="inline-flex items-center justify-center gap-2 bg-[#00B5A5] hover:bg-[#009E8F] text-white font-bold px-6 py-3 sm:px-7 sm:py-4 rounded-lg text-[14px] sm:text-[15px] no-underline transition-colors w-full sm:w-auto"
            >
              Start Free Today <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to="/features"
              className="inline-flex items-center justify-center gap-2 border-2 border-[#1B2B4B] text-[#1B2B4B] hover:bg-[#1B2B4B] hover:text-white font-semibold px-6 py-3 sm:px-7 sm:py-4 rounded-lg text-[14px] sm:text-[15px] no-underline transition-colors w-full sm:w-auto"
            >
              <Play className="w-4 h-4 fill-current" /> Watch Demo
            </Link>
          </div>
        </div>

        <div className="relative">
          <img
            src={heroImg}
            alt="Driving instructor with car, diary calendar app and vehicle tracking dashboard"
            width={1280}
            height={1024}
            className="w-full h-auto rounded-2xl bg-[#1B2B4B]/10 border border-[#1B2B4B]/20"
          />
          <div className="absolute top-4 right-4 md:-top-4 md:-right-4 bg-white rounded-2xl shadow-[0_10px_30px_rgba(27,43,75,0.15)] px-4 py-3 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#E6F7F6] grid place-items-center">
              <Calendar className="w-5 h-5 text-[#00B5A5]" />
            </div>
            <div>
              <div className="font-black text-[#1B2B4B] text-lg leading-none">98%</div>
              <div className="text-[#718096] text-xs">Fill rate</div>
            </div>
          </div>
          <div className="absolute bottom-4 left-4 md:-bottom-4 md:-left-4 bg-white rounded-2xl shadow-[0_10px_30px_rgba(27,43,75,0.15)] px-4 py-3 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#E6F7F6] grid place-items-center">
              <Smartphone className="w-5 h-5 text-[#00B5A5]" />
            </div>
            <div>
              <div className="font-black text-[#1B2B4B] text-lg leading-none">500+</div>
              <div className="text-[#718096] text-xs">Active instructors</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------- Diary section ---------- */
function DiarySection() {
  return (
    <section className="bg-[#1B2B4B] py-10 sm:py-20 md:py-28 px-5 sm:px-6 text-white">
      <div className="max-w-[1180px] mx-auto">
        <div className="grid lg:grid-cols-2 gap-10 items-center">
          <div>
            <div className="inline-block border border-[#00B5A5]/50 text-[#00B5A5] text-[11px] sm:text-xs uppercase tracking-[0.2em] font-semibold rounded-full px-3 sm:px-4 py-1.5 mb-4">
              No contracts · No tie-in · Leave any time
            </div>
            <h2 className="text-[22px] sm:text-[36px] md:text-[48px] font-black leading-[1.05] tracking-tight mb-4">
              Your Diary, Your Way
              <br />
              — <span className="text-[#00B5A5]">Free for Life</span>
            </h2>
            <p className="text-white/75 text-[15px] sm:text-[17px] leading-relaxed mb-4 max-w-lg">
              DSM gives every driving instructor a powerful diary and business management app — completely free,
              forever. Manage your schedule, track pupil progress, handle payments and communicate with learners
              all in one place.
            </p>
            <p className="text-white/60 text-[14px] sm:text-[15px] leading-relaxed mb-6 max-w-lg">
              Want even more? Optional paid extras like telematics, dashcam integration and a branded website are
              available when you're ready — the core app is yours to keep at absolutely no cost.
            </p>
            <div className="flex flex-wrap gap-x-4 sm:gap-x-6 gap-y-2 text-sm text-white/85 mb-2">
              {["Free forever", "No credit card", "No hidden fees", "Cancel any time"].map((t) => (
                <span key={t} className="inline-flex items-center gap-2">
                  <Check className="w-4 h-4 text-[#00B5A5]" /> {t}
                </span>
              ))}
            </div>
          </div>

          <div className="aspect-[16/10] rounded-2xl border border-white/10 bg-[#152038] grid place-items-center relative overflow-hidden group cursor-pointer">
            <img src={explainerPlaceholderImg} alt="Explainer video preview" className="absolute inset-0 w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/35" />
            <div className="relative flex flex-col items-center gap-3 text-white drop-shadow-lg">
              <span className="w-16 h-16 rounded-full bg-[#00B5A5] grid place-items-center group-hover:bg-[#009E8F] transition-colors">
                <Play className="w-6 h-6 fill-white text-white ml-1" />
              </span>
              <span className="text-sm font-medium">Explainer Video</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------- Feature zig-zag ---------- */
const features = [
  {
    img: diaryImg,
    title: "Smart Diary Management",
    body: "Drag-and-drop scheduling, automatic gap detection, and Google Calendar sync. Never miss a booking or double-book again.",
    bullets: ["Drag & drop calendar", "Google Calendar sync", "Automatic gap filling", "SMS reminders"],
  },
  {
    img: paymentsImg,
    title: "Effortless Payments",
    body: "Take card, Apple Pay and Google Pay in-lesson via QR code. Chase outstanding balances and generate professional invoices — all built into your diary.",
    bullets: ["Payment status tracking", "Automatic reminders", "PDF invoices", "Revenue reports"],
  },
  {
    img: websiteImg,
    title: "Your Own Professional Website for Free",
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
    body: "On our paid plans get FREE healthcover with Bennenden Health or Vitality to look after you when you ill.\u00a0",
    bullets: ["Pupil progress dashboard", "Parent lesson notifications", "AI coaching tips", "Mock theory tests"],
  },
  {
    img: aiReceptionistImg,
    title: "Call Answering Service",
    body: "On our paid plans get FREE healthcover with Bennenden Health or Vitality to look after you when you ill.\u00a0",
    bullets: ["Pupil progress dashboard", "Parent lesson notifications", "AI coaching tips", "Mock theory tests"],
  },
  {
    img: testSwapImg,
    title: "Free Test Swapping App",
    body: "Dedicated apps for pupils, parents and instructors — free on every plan. Track progress, stay informed, and manage your business from anywhere.",
    bullets: ["Pupil progress dashboard", "Parent lesson notifications", "AI coaching tips", "Mock theory tests"],
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
    body: "Monitor speed, driver scoring and trip history in real time. Give your pupils measurable feedback backed by data.",
    bullets: ["Live speed monitoring", "Driver scoring", "Trip replay & reports", "Progress tracking"],
  },
];

function FeaturesShowcase() {
  return (
    <section className="bg-white py-10 sm:py-20 md:py-28 px-5 sm:px-6">
      <div className="max-w-[1180px] mx-auto">
        <div className="text-center mb-10 sm:mb-16">
          <div className="inline-block text-[#00B5A5] text-[11px] sm:text-xs uppercase tracking-[0.2em] font-bold mb-3">
            Product Tour
          </div>
          <h2 className="text-[22px] sm:text-[36px] md:text-[48px] font-black tracking-tight text-[#1B2B4B] mb-3 sm:mb-4">
            See It in Action
          </h2>
          <p className="text-gray-500 text-base sm:text-lg max-w-2xl mx-auto">
            From diary management to live telematics — everything you need in one platform.
          </p>
        </div>

        <div className="flex flex-col gap-10 sm:gap-20 md:gap-28">
          {features.map((f, i) => {
            const reverse = i % 2 === 1;
            return (
              <div
                key={`${f.title}-${i}`}
                className={`grid md:grid-cols-2 gap-5 sm:gap-10 md:gap-16 items-center ${reverse ? "md:[&>*:first-child]:order-2" : ""}`}
              >
                <div className="bg-white border border-gray-100 shadow-sm hover:shadow-md transition-shadow rounded-2xl p-4 sm:p-6 md:p-8">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-[#E6F7F6] grid place-items-center mb-4">
                    <Check className="w-4 h-4 sm:w-5 sm:h-5 text-[#00B5A5]" />
                  </div>
                  <h3 className="text-[18px] sm:text-[28px] md:text-[34px] font-black text-[#1B2B4B] mb-3 leading-tight tracking-tight">
                    {f.title}
                  </h3>
                  <p className="text-gray-500 text-[14px] sm:text-[16px] leading-relaxed mb-4 sm:mb-6">{f.body}</p>
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 mb-5 sm:mb-7">
                    {f.bullets.map((b) => (
                      <li key={b} className="flex items-center gap-2 text-[#1B2B4B] text-sm font-medium">
                        <span className="w-5 h-5 rounded-full bg-[#E6F7F6] grid place-items-center">
                          <Check className="w-3 h-3 text-[#00B5A5]" />
                        </span>
                        {b}
                      </li>
                    ))}
                  </ul>
                  <Link
                    to="/features"
                    className="inline-flex items-center gap-1.5 text-[#00B5A5] hover:text-[#009E8F] font-semibold text-sm no-underline"
                  >
                    Learn more <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
                <div>
                  <div className="rounded-2xl overflow-hidden p-2 sm:p-6 md:p-10">
                    <img
                      src={f.img}
                      alt={f.title}
                      width={1024}
                      height={1024}
                      loading="lazy"
                      className="w-full h-auto rounded-xl shadow-[0_20px_60px_-20px_rgba(27,43,75,0.25)]"
                    />
                  </div>
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
    <section className="bg-[#F7FAFC] py-10 sm:py-20 md:py-28 px-5 sm:px-6">
      <div className="max-w-[1180px] mx-auto">
        <div className="text-center mb-10 sm:mb-14">
          <h2 className="text-[22px] sm:text-[36px] md:text-[48px] font-black tracking-tight text-[#1B2B4B] mb-2 sm:mb-3">
            Up and Running in 3 Minutes
          </h2>
          <p className="text-gray-500 text-base sm:text-lg">No downloads. No setup fees. No hassle.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 sm:gap-10 relative">
          {steps.map(({ n, t, b, Icon }, idx) => (
            <div key={n} className="text-center relative">
              {idx < 2 && (
                <div className="hidden md:block absolute top-10 left-[calc(50%+50px)] right-[-30px] border-t-2 border-dashed border-gray-300" />
              )}
              <div className="relative inline-block mb-4">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-[#E6F7F6] grid place-items-center">
                  <Icon className="w-7 h-7 sm:w-9 sm:h-9 text-[#00B5A5]" />
                </div>
                <span className="absolute -top-1 -right-1 bg-[#00B5A5] text-white text-[11px] sm:text-[11px] font-bold rounded-full w-6 h-6 sm:w-7 sm:h-7 grid place-items-center shadow-md">
                  {n}
                </span>
              </div>
              <div className="text-lg sm:text-xl font-bold text-[#1B2B4B] mb-2">{t}</div>
              <div className="text-gray-500 text-[14px] sm:text-[15px] leading-relaxed max-w-xs mx-auto">{b}</div>
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
    <section className="bg-[#1B2B4B] py-14 sm:py-20 md:py-28 px-5 sm:px-6">
      <div className="max-w-[1240px] mx-auto">
        <div className="text-center mb-14">
          <h2 className="text-[28px] sm:text-[36px] md:text-[48px] font-black tracking-tight text-white mb-3">
            Start Free. Grow When Ready.
          </h2>
          <p className="text-white/70 text-lg">
            The diary is free forever. Add premium tools as your business grows.
          </p>
        </div>

        <div className="flex flex-col gap-5 max-w-[1100px] mx-auto">
          {plans.map((p) => {
            const isPro = p.highlight;
            const cardBg = isPro ? "bg-[#00B5A5]" : "bg-white/10 border border-white/20";
            const titleColor = isPro ? "text-white" : "text-white";
            const descColor = isPro ? "text-white/90" : "text-white/75";
            const priceColor = isPro ? "text-white" : "text-[#00B5A5]";
            const bulletText = isPro ? "text-white" : "text-white/90";
            const ctaColor = isPro ? "text-white hover:text-white/80" : "text-[#00B5A5] hover:text-[#7FE5DC]";
            return (
              <div
                key={p.name}
                className={`rounded-2xl overflow-hidden grid md:grid-cols-[300px,1fr] ${cardBg}`}
              >
                <div className="relative aspect-[16/10] md:aspect-auto md:min-h-[200px] p-4">
                  <img src={p.img} alt={p.name} loading="lazy" className="w-full h-full object-contain" />
                  {isPro && (
                    <span className="absolute top-3 right-3 bg-white text-[#00B5A5] text-[10px] uppercase tracking-wider font-bold px-2.5 py-1 rounded-full">
                      Most popular
                    </span>
                  )}
                </div>
                <div className="p-5 sm:p-6 md:p-8 flex flex-col">
                  <div className="flex items-baseline justify-between gap-4 mb-2 flex-wrap">
                    <div className="flex items-center gap-3">
                      <span className={`w-9 h-9 rounded-lg grid place-items-center ${isPro ? "bg-white/20" : "bg-[#00B5A5]/20"}`}>
                        <Check className={`w-4 h-4 ${isPro ? "text-white" : "text-[#00B5A5]"}`} />
                      </span>
                      <div className={`font-black text-xl ${titleColor}`}>{p.name}</div>
                    </div>
                    <div className={`font-bold text-base ${priceColor}`}>{p.price}</div>
                  </div>
                  <p className={`${descColor} text-[15px] leading-relaxed mb-4`}>{p.desc}</p>
                  <ul className={`grid sm:grid-cols-2 gap-x-6 gap-y-2 mb-5 text-sm ${bulletText}`}>
                    {p.bullets.map((b) => (
                      <li key={b} className="flex items-center gap-2">
                        <Check className={`w-4 h-4 shrink-0 ${isPro ? "text-white" : "text-[#00B5A5]"}`} /> {b}
                      </li>
                    ))}
                  </ul>
                  <Link
                    to="/pricing"
                    className={`self-start inline-flex items-center gap-1.5 font-semibold text-sm no-underline ${ctaColor}`}
                  >
                    {p.cta} <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>

        <div className="text-center mt-10">
          <Link
            to="/pricing"
            className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-semibold px-6 py-3 rounded-lg no-underline"
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
    <section className="bg-white py-14 sm:py-20 md:py-28 px-5 sm:px-6">
      <div className="max-w-[1180px] mx-auto">
        <div className="text-center mb-14">
          <h2 className="text-[28px] sm:text-[36px] md:text-[48px] font-black tracking-tight text-[#1B2B4B] mb-3">
            Loved by Instructors
          </h2>
          <p className="text-gray-500 text-lg">Real feedback from ADIs using DSM every day.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {items.map((t) => (
            <div key={t.n} className="bg-white rounded-2xl p-7 border border-gray-100 shadow-sm">
              <div className="flex gap-0.5 mb-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-[#00B5A5] text-[#00B5A5]" />
                ))}
              </div>
              <p className="text-gray-600 text-[15px] leading-relaxed mb-6">"{t.q}"</p>
              <div className="flex items-center gap-3 pt-4 border-t border-gray-100">
                <div className="w-10 h-10 rounded-full bg-[#1B2B4B] grid place-items-center text-white font-bold">
                  {t.n.charAt(0)}
                </div>
                <div>
                  <div className="font-bold text-[#1B2B4B] text-sm">{t.n}</div>
                  <div className="text-gray-500 text-xs">{t.r}</div>
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
    <section className="bg-[#F7FAFC] py-14 sm:py-20 md:py-28 px-5 sm:px-6">
      <div className="max-w-[980px] mx-auto">
        <div className="text-center mb-12">
          <div className="inline-block text-[#00B5A5] text-xs uppercase tracking-[0.2em] font-bold mb-3">
            The Math Speaks for Itself
          </div>
          <h2 className="text-[28px] sm:text-[36px] md:text-[48px] font-black tracking-tight text-[#1B2B4B]">
            The No-Brainer Formula
          </h2>
        </div>

        <div className="bg-white rounded-2xl p-2 md:p-4 border border-gray-100 shadow-sm">
          {rows.map((r, i) => (
            <div
              key={r.l}
              className={`flex items-center justify-between gap-4 px-5 py-5 ${i !== rows.length - 1 ? "border-b border-gray-100" : ""}`}
            >
              <div className="flex items-center gap-3">
                <span className="w-6 h-6 rounded-full bg-[#E6F7F6] grid place-items-center shrink-0">
                  <Check className="w-3.5 h-3.5 text-[#00B5A5]" />
                </span>
                <span className="text-[#1B2B4B] font-medium text-[15px]">{r.l}</span>
              </div>
              <span className="text-[#00B5A5] font-bold text-[15px] shrink-0">{r.v}</span>
            </div>
          ))}
        </div>

        <div className="mt-10 text-center">
          <p className="text-[#1B2B4B] text-lg italic max-w-xl mx-auto mb-2">
            "Save more in tax deductions than the app costs.
          </p>
          <p className="text-[#1B2B4B] text-xl font-black mb-8">It literally pays for itself."</p>
          <Link
            to="/register"
            className="inline-flex items-center gap-2 bg-[#00B5A5] hover:bg-[#009E8F] text-white font-bold px-8 py-4 rounded-lg text-[15px] no-underline"
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
    <section className="bg-[#00B5A5] py-14 sm:py-20 md:py-28 px-5 sm:px-6 text-white">
      <div className="max-w-[1000px] mx-auto text-center">
        <div className="flex flex-wrap justify-center gap-x-8 gap-y-3 mb-10">
          {platforms.map(({ i: I, t }) => (
            <span key={t} className="inline-flex items-center gap-2 text-white/80 text-sm">
              <I className="w-4 h-4" /> {t}
            </span>
          ))}
        </div>

        <h2 className="text-[30px] sm:text-[36px] md:text-[52px] font-black tracking-tight mb-4 leading-[1.05]">
          Ready to Simplify Your Business?
        </h2>
        <p className="text-white/85 text-lg mb-10 max-w-xl mx-auto">
          Join 500+ driving instructors who've ditched the paper diary. Start free today.
        </p>

        <div className="flex flex-wrap justify-center gap-3">
          <Link
            to="/register"
            className="inline-flex items-center gap-2 bg-white text-[#00B5A5] hover:bg-gray-50 font-bold px-8 py-4 rounded-lg text-[15px] no-underline"
          >
            Create Free Account <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            to="/pricing"
            className="inline-flex items-center gap-2 bg-transparent hover:bg-white/10 border-2 border-white text-white font-semibold px-8 py-4 rounded-lg text-[15px] no-underline"
          >
            Compare Plans
          </Link>
        </div>
      </div>
    </section>
  );
}
