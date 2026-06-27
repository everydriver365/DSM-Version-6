import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Calendar,
  CreditCard,
  Globe,
  Smartphone,
  Megaphone,
  Activity,
  Camera,
  Building2,
  ArrowRight,
  Play,
  Check,
  Star,
} from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { MarketingNav } from "../components/marketing/MarketingNav";
import { MarketingFooter } from "../components/marketing/MarketingFooter";
import heroImg from "../assets/marketing/hero.jpg";
import diaryImg from "../assets/marketing/diary.jpg";
import paymentsImg from "../assets/marketing/payments.jpg";
import websiteImg from "../assets/marketing/website.jpg";
import pupilAppImg from "../assets/marketing/pupil-app.jpg";
import telematicsImg from "../assets/marketing/telematics.jpg";

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

  if (!checked) return <div className="min-h-screen bg-white" />;

  return (
    <div className="bg-white min-h-screen font-sans text-[#0B1530] antialiased">
      <MarketingNav />
      <Hero />
      <DiarySection />
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

/* ---------- Hero ---------- */
function Hero() {
  return (
    <section
      className="relative overflow-hidden bg-[#F4F5F7]"
      style={{
        backgroundImage:
          "radial-gradient(circle, #d8dce5 1px, transparent 1px)",
        backgroundSize: "22px 22px",
      }}
    >
      <div className="max-w-[1240px] mx-auto px-6 py-16 md:py-24 grid lg:grid-cols-2 gap-12 items-center">
        <div>
          <div className="inline-flex items-center gap-2 bg-white/80 backdrop-blur border border-[#e1e4eb] rounded-full px-3.5 py-1.5 text-[13px] text-[#0B1530] mb-6 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-[#16A34A]" />
            Free for every driving instructor
          </div>

          <h1 className="text-[44px] md:text-[64px] leading-[1.02] font-black tracking-tight text-[#0B1530] mb-5">
            Driving School{" "}
            <span className="block md:inline">Management</span>
          </h1>

          <div className="text-[22px] md:text-[26px] font-bold text-[#0B1530] mb-5">
            Free forever for{" "}
            <span className="text-[#1A73E8] underline decoration-[3px] underline-offset-[6px] decoration-[#1A73E8]/30">
              ADIs &amp; PDIs
            </span>
          </div>

          <p className="text-[17px] text-[#475569] leading-relaxed mb-7 max-w-md">
            Manage your lessons, track payments, and grow your business — all from one app.
            No credit card required.
          </p>

          <div className="flex flex-wrap gap-2 mb-8">
            {["Free", "Multi-instructor", "White-label", "GDPR"].map((t) => (
              <span
                key={t}
                className="inline-flex items-center gap-1.5 bg-white border border-[#e1e4eb] rounded-full px-3 py-1.5 text-[13px] text-[#475569] shadow-sm"
              >
                <Check className="w-3.5 h-3.5 text-[#16A34A]" /> {t}
              </span>
            ))}
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              to="/register"
              className="inline-flex items-center gap-2 bg-[#1A73E8] hover:bg-[#1565C7] text-white font-bold px-7 py-4 rounded-full text-[15px] no-underline transition-colors shadow-[0_8px_24px_rgba(26,115,232,0.35)]"
            >
              Start Free Today <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to="/features"
              className="inline-flex items-center gap-2 bg-white hover:bg-[#F8F9FB] text-[#0B1530] font-semibold px-7 py-4 rounded-full text-[15px] no-underline border border-[#e1e4eb] transition-colors"
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
            className="w-full h-auto rounded-2xl"
          />
          <div className="absolute top-4 right-4 md:-top-4 md:-right-4 bg-white rounded-2xl shadow-[0_10px_30px_rgba(15,32,68,0.15)] px-4 py-3 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#EFF6FF] grid place-items-center">
              <Calendar className="w-5 h-5 text-[#1A73E8]" />
            </div>
            <div>
              <div className="font-black text-[#0B1530] text-lg leading-none">98%</div>
              <div className="text-[#64748B] text-xs">Fill rate</div>
            </div>
          </div>
          <div className="absolute bottom-4 left-4 md:-bottom-4 md:-left-4 bg-white rounded-2xl shadow-[0_10px_30px_rgba(15,32,68,0.15)] px-4 py-3 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#ECFDF5] grid place-items-center">
              <Smartphone className="w-5 h-5 text-[#16A34A]" />
            </div>
            <div>
              <div className="font-black text-[#0B1530] text-lg leading-none">500+</div>
              <div className="text-[#64748B] text-xs">Active instructors</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------- Diary section (dark) ---------- */
function DiarySection() {
  const stats = [
    { n: "500+", l: "Active Instructors" },
    { n: "50,000+", l: "Lessons Managed" },
    { n: "4.9★", l: "Average Rating" },
    { n: "£0", l: "To Get Started" },
  ];
  return (
    <section className="bg-[#0A1024] py-20 md:py-28 px-6 text-white">
      <div className="max-w-[1180px] mx-auto">
        <div className="grid lg:grid-cols-2 gap-14 items-center">
          <div>
            <div className="inline-block border border-[#1A73E8]/40 text-[#5EA8FF] text-xs uppercase tracking-[0.2em] font-semibold rounded-full px-4 py-1.5 mb-6">
              No contracts · No tie-in · Leave any time
            </div>
            <h2 className="text-[36px] md:text-[48px] font-black leading-[1.05] tracking-tight mb-6">
              Your Diary, Your Way
              <br />
              — <span className="text-[#1A73E8]">Free for Life</span>
            </h2>
            <p className="text-white/70 text-[17px] leading-relaxed mb-5 max-w-lg">
              DSM gives every driving instructor a powerful diary and business management app — completely free,
              forever. Manage your schedule, track pupil progress, handle payments and communicate with learners
              all in one place.
            </p>
            <p className="text-white/55 text-[15px] leading-relaxed mb-8 max-w-lg">
              Want even more? Optional paid extras like telematics, dashcam integration and a branded website are
              available when you're ready — the core app is yours to keep at absolutely no cost.
            </p>
            <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-white/80 mb-2">
              {["Free forever", "No credit card", "No hidden fees", "Cancel any time"].map((t) => (
                <span key={t} className="inline-flex items-center gap-2">
                  <Check className="w-4 h-4 text-[#16A34A]" /> {t}
                </span>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-5">
            {stats.map((s) => (
              <div
                key={s.l}
                className="bg-white/[0.04] border border-white/10 rounded-2xl p-7 text-center hover:bg-white/[0.06] transition-colors"
              >
                <div className="text-4xl md:text-5xl font-black text-[#5EA8FF] mb-2">{s.n}</div>
                <div className="text-white/60 text-sm">{s.l}</div>
              </div>
            ))}
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
    title: "Effortless Payment Tracking",
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
    img: pupilAppImg,
    title: "Apps for Everyone",
    body: "Dedicated apps for pupils, parents and instructors — free on every plan. Track progress, stay informed, and manage your business from anywhere.",
    bullets: ["Pupil progress dashboard", "Parent lesson notifications", "AI coaching tips", "Mock theory tests"],
  },
  {
    img: telematicsImg,
    title: "Telematics & Driving Data",
    body: "Monitor speed, driver scoring and trip history in real time. Give your pupils measurable feedback backed by data.",
    bullets: ["Live speed monitoring", "Driver scoring", "Trip replay & reports", "Progress tracking"],
  },
];

function FeaturesShowcase() {
  return (
    <section className="bg-white py-20 md:py-28 px-6">
      <div className="max-w-[1180px] mx-auto">
        <div className="text-center mb-16">
          <div className="inline-block text-[#1A73E8] text-xs uppercase tracking-[0.2em] font-bold mb-3">
            Product Tour
          </div>
          <h2 className="text-[36px] md:text-[48px] font-black tracking-tight text-[#0B1530] mb-4">
            See It in Action
          </h2>
          <p className="text-[#64748B] text-lg max-w-2xl mx-auto">
            From diary management to live telematics — everything you need in one platform.
          </p>
        </div>

        <div className="flex flex-col gap-20 md:gap-28">
          {features.map((f, i) => {
            const reverse = i % 2 === 1;
            return (
              <div
                key={f.title}
                className={`grid md:grid-cols-2 gap-10 md:gap-16 items-center ${reverse ? "md:[&>*:first-child]:order-2" : ""}`}
              >
                <div>
                  <h3 className="text-[28px] md:text-[34px] font-black text-[#0B1530] mb-4 leading-tight tracking-tight">
                    {f.title}
                  </h3>
                  <p className="text-[#475569] text-[16px] leading-relaxed mb-6">{f.body}</p>
                  <ul className="grid grid-cols-2 gap-x-4 gap-y-3 mb-7">
                    {f.bullets.map((b) => (
                      <li key={b} className="flex items-center gap-2 text-[#0B1530] text-sm font-medium">
                        <span className="w-5 h-5 rounded-full bg-[#EFF6FF] grid place-items-center">
                          <Check className="w-3 h-3 text-[#1A73E8]" />
                        </span>
                        {b}
                      </li>
                    ))}
                  </ul>
                  <Link
                    to="/features"
                    className="inline-flex items-center gap-1.5 text-[#1A73E8] hover:text-[#1565C7] font-semibold text-sm no-underline"
                  >
                    Learn more <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
                <div>
                  <div className="rounded-2xl overflow-hidden bg-gradient-to-br from-[#F4F5F7] to-[#E8EBF0] p-6 md:p-10">
                    <img
                      src={f.img}
                      alt={f.title}
                      width={1024}
                      height={1024}
                      loading="lazy"
                      className="w-full h-auto rounded-xl shadow-[0_20px_60px_-20px_rgba(15,32,68,0.3)]"
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
    { n: "01", t: "Create Your Account", b: "Sign up with your email in 60 seconds. No credit card needed." },
    { n: "02", t: "Set Up Your Diary", b: "Add availability, import existing pupils, and configure your preferences." },
    { n: "03", t: "Start Teaching", b: "Manage bookings, track payments and grow your business from day one." },
  ];
  return (
    <section className="bg-[#F4F5F7] py-20 md:py-28 px-6">
      <div className="max-w-[1180px] mx-auto">
        <div className="text-center mb-14">
          <h2 className="text-[36px] md:text-[48px] font-black tracking-tight text-[#0B1530] mb-3">
            Up and Running in 3 Minutes
          </h2>
          <p className="text-[#64748B] text-lg">No downloads. No setup fees. No hassle.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {steps.map((s) => (
            <div
              key={s.n}
              className="bg-white rounded-2xl p-8 border border-[#e1e4eb] hover:shadow-[0_10px_30px_rgba(15,32,68,0.08)] transition-shadow"
            >
              <div className="text-[#1A73E8] text-4xl font-black mb-4 tracking-tight">{s.n}</div>
              <div className="text-xl font-bold text-[#0B1530] mb-3">{s.t}</div>
              <div className="text-[#64748B] text-[15px] leading-relaxed">{s.b}</div>
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
    <section className="bg-white py-20 md:py-28 px-6">
      <div className="max-w-[1240px] mx-auto">
        <div className="text-center mb-14">
          <h2 className="text-[36px] md:text-[48px] font-black tracking-tight text-[#0B1530] mb-3">
            Start Free. Grow When Ready.
          </h2>
          <p className="text-[#64748B] text-lg">
            The diary is free forever. Add premium tools as your business grows.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {plans.map((p) => (
            <div
              key={p.name}
              className={`rounded-2xl overflow-hidden border ${p.highlight ? "border-[#1A73E8] shadow-[0_20px_60px_-20px_rgba(26,115,232,0.4)]" : "border-[#e1e4eb]"} bg-white flex flex-col`}
            >
              <div className="h-40 bg-gradient-to-br from-[#F4F5F7] to-[#E8EBF0] p-4 relative">
                <img src={p.img} alt={p.name} loading="lazy" className="w-full h-full object-contain" />
                {p.highlight && (
                  <span className="absolute top-3 right-3 bg-[#1A73E8] text-white text-[10px] uppercase tracking-wider font-bold px-2.5 py-1 rounded-full">
                    Popular
                  </span>
                )}
              </div>
              <div className="p-6 flex flex-col flex-1">
                <div className="font-black text-[#0B1530] text-xl mb-1">{p.name}</div>
                <div className="text-[#1A73E8] font-bold text-sm mb-3">{p.price}</div>
                <p className="text-[#64748B] text-sm leading-relaxed mb-5">{p.desc}</p>
                <ul className="flex flex-col gap-2 mb-6 text-sm text-[#0B1530]">
                  {p.bullets.map((b) => (
                    <li key={b} className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-[#16A34A] shrink-0" /> {b}
                    </li>
                  ))}
                </ul>
                <Link
                  to="/pricing"
                  className={`mt-auto text-center font-semibold px-4 py-3 rounded-full text-sm no-underline transition-colors ${p.highlight ? "bg-[#1A73E8] hover:bg-[#1565C7] text-white" : "bg-[#F4F5F7] hover:bg-[#E8EBF0] text-[#0B1530]"}`}
                >
                  {p.cta}
                </Link>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center mt-10">
          <Link
            to="/pricing"
            className="inline-flex items-center gap-2 text-[#1A73E8] hover:text-[#1565C7] font-semibold no-underline"
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
    <section className="bg-[#F4F5F7] py-20 md:py-28 px-6">
      <div className="max-w-[1180px] mx-auto">
        <div className="text-center mb-14">
          <h2 className="text-[36px] md:text-[48px] font-black tracking-tight text-[#0B1530] mb-3">
            Loved by Instructors
          </h2>
          <p className="text-[#64748B] text-lg">Real feedback from ADIs using DSM every day.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {items.map((t) => (
            <div key={t.n} className="bg-white rounded-2xl p-7 border border-[#e1e4eb]">
              <div className="flex gap-0.5 mb-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                ))}
              </div>
              <p className="text-[#0B1530] text-[15px] leading-relaxed mb-6">"{t.q}"</p>
              <div className="flex items-center gap-3 pt-4 border-t border-[#e1e4eb]">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#1A73E8] to-[#0F2044] grid place-items-center text-white font-bold">
                  {t.n.charAt(0)}
                </div>
                <div>
                  <div className="font-bold text-[#0B1530] text-sm">{t.n}</div>
                  <div className="text-[#64748B] text-xs">{t.r}</div>
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
    <section className="bg-white py-20 md:py-28 px-6">
      <div className="max-w-[980px] mx-auto">
        <div className="text-center mb-12">
          <div className="inline-block text-[#1A73E8] text-xs uppercase tracking-[0.2em] font-bold mb-3">
            The Math Speaks for Itself
          </div>
          <h2 className="text-[36px] md:text-[48px] font-black tracking-tight text-[#0B1530]">
            The No-Brainer Formula
          </h2>
        </div>

        <div className="bg-[#F4F5F7] rounded-2xl p-2 md:p-4">
          {rows.map((r, i) => (
            <div
              key={r.l}
              className={`flex items-center justify-between gap-4 px-5 py-5 ${i !== rows.length - 1 ? "border-b border-[#e1e4eb]" : ""}`}
            >
              <div className="flex items-center gap-3">
                <span className="w-6 h-6 rounded-full bg-[#16A34A]/15 grid place-items-center shrink-0">
                  <Check className="w-3.5 h-3.5 text-[#16A34A]" />
                </span>
                <span className="text-[#0B1530] font-medium text-[15px]">{r.l}</span>
              </div>
              <span className="text-[#1A73E8] font-bold text-[15px] shrink-0">{r.v}</span>
            </div>
          ))}
        </div>

        <div className="mt-10 text-center">
          <p className="text-[#0B1530] text-lg italic max-w-xl mx-auto mb-2">
            "Save more in tax deductions than the app costs.
          </p>
          <p className="text-[#0B1530] text-xl font-black mb-8">It literally pays for itself."</p>
          <Link
            to="/register"
            className="inline-flex items-center gap-2 bg-[#1A73E8] hover:bg-[#1565C7] text-white font-bold px-8 py-4 rounded-full text-[15px] no-underline shadow-[0_8px_24px_rgba(26,115,232,0.35)]"
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
    <section className="bg-[#0A1024] py-20 md:py-28 px-6 text-white">
      <div className="max-w-[1000px] mx-auto text-center">
        <div className="flex flex-wrap justify-center gap-x-8 gap-y-3 mb-10">
          {platforms.map(({ i: I, t }) => (
            <span key={t} className="inline-flex items-center gap-2 text-white/60 text-sm">
              <I className="w-4 h-4" /> {t}
            </span>
          ))}
        </div>

        <h2 className="text-[36px] md:text-[52px] font-black tracking-tight mb-4 leading-[1.05]">
          Ready to Simplify Your Business?
        </h2>
        <p className="text-white/70 text-lg mb-10 max-w-xl mx-auto">
          Join 500+ driving instructors who've ditched the paper diary. Start free today.
        </p>

        <div className="flex flex-wrap justify-center gap-3">
          <Link
            to="/register"
            className="inline-flex items-center gap-2 bg-[#1A73E8] hover:bg-[#1565C7] text-white font-bold px-8 py-4 rounded-full text-[15px] no-underline shadow-[0_8px_24px_rgba(26,115,232,0.4)]"
          >
            Create Free Account <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            to="/pricing"
            className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/15 border border-white/20 text-white font-semibold px-8 py-4 rounded-full text-[15px] no-underline"
          >
            Compare Plans
          </Link>
        </div>
      </div>
    </section>
  );
}

/* unused but kept for tree-shaking of imports */
void Megaphone;
void Camera;
void CreditCard;
