import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Calendar,
  PoundSterling,
  MapPin,
  Users,
  BarChart3,
  Globe,
  Star,
} from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { MarketingNav } from "../components/marketing/MarketingNav";
import { MarketingFooter } from "../components/marketing/MarketingFooter";

const FONT = { fontFamily: "Poppins, system-ui, sans-serif" } as const;

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "DSM by EveryDriver — The driving instructor app that works as hard as you do" },
      {
        name: "description",
        content:
          "Schedule lessons, take payments, manage pupils and grow your driving school — all from your phone. Join 1,200+ UK instructors using DSM.",
      },
      { property: "og:title", content: "DSM — Driving School Manager" },
      {
        property: "og:description",
        content:
          "Schedule lessons, take payments, manage pupils and grow your driving school — all from your phone.",
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
      if (data.session) {
        navigate({ to: "/home", replace: true });
      } else {
        setChecked(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  if (!checked) return <div className="min-h-screen bg-white" />;

  return (
    <div className="bg-white min-h-screen" style={FONT}>
      <MarketingNav />
      <Hero />
      <FeaturesStrip />
      <HowItWorks />
      <Testimonials />
      <PricingTeaser />
      <BottomCTA />
      <MarketingFooter />
    </div>
  );
}

/* ---------- Hero ---------- */
function Hero() {
  return (
    <section
      className="min-h-screen bg-gradient-to-br from-[#0F2044] to-[#1A52A0] flex flex-col items-center justify-center text-white text-center px-4 py-24"
      style={FONT}
    >
      <div className="inline-flex items-center border border-white/30 rounded-full px-3 py-1 text-xs text-white/80 mb-6">
        DSM by EveryDriver
      </div>

      <h1 className="text-4xl md:text-6xl font-extrabold max-w-3xl mx-auto leading-tight mb-6">
        The driving instructor app that works as hard as you do
      </h1>

      <p className="text-lg md:text-xl text-white/80 max-w-xl mx-auto mb-10">
        Schedule lessons, track payments, manage pupils and grow your business — all from your phone.
      </p>

      <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
        <Link
          to="/register"
          className="bg-white text-[#0F2044] hover:bg-white/90 font-bold px-8 py-4 rounded-xl text-base no-underline transition-colors"
        >
          Start free today →
        </Link>
        <Link
          to="/features"
          className="border-2 border-white/40 text-white hover:bg-white/10 px-8 py-4 rounded-xl text-base no-underline transition-colors"
        >
          See features
        </Link>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-center gap-6 text-white/60 text-sm">
        <span>✓ Free forever on basic plan</span>
        <span>✓ No card required</span>
        <span>✓ Used by 1,200+ instructors</span>
      </div>
    </section>
  );
}

/* ---------- Features strip ---------- */
function FeaturesStrip() {
  const features = [
    { icon: Calendar, title: "Smart scheduling", desc: "Google Calendar-style diary management" },
    { icon: PoundSterling, title: "Take payments", desc: "Card, Apple Pay & Google Pay in-lesson" },
    { icon: MapPin, title: "GPS tracking", desc: "Live route recording and overspeed alerts" },
    { icon: Users, title: "Pupil management", desc: "Full profiles, progress and history" },
    { icon: BarChart3, title: "Business reports", desc: "MTD earnings, tax estimates and more" },
    { icon: Globe, title: "Your own website", desc: "Free booking page at everydriver.co.uk/i/you" },
  ];

  return (
    <section className="bg-white py-20 px-4" style={FONT}>
      <h2 className="text-3xl md:text-4xl font-bold text-[#0F2044] text-center mb-4">
        Everything you need to run your driving school
      </h2>
      <p className="text-[#6B7280] text-center mb-16 text-lg">
        Built by a driving instructor, for driving instructors.
      </p>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6 max-w-6xl mx-auto">
        {features.map((f) => {
          const Icon = f.icon;
          return (
            <div
              key={f.title}
              className="border border-[#E2E6ED] rounded-2xl p-6 text-center hover:shadow-md transition-shadow"
            >
              <div className="w-12 h-12 bg-[#EEF4FB] rounded-full flex items-center justify-center mx-auto mb-4">
                <Icon className="text-[#1A52A0] w-6 h-6" />
              </div>
              <div className="font-bold text-[#0F2044] text-sm mb-1">{f.title}</div>
              <div className="text-[#6B7280] text-xs">{f.desc}</div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

/* ---------- How it works ---------- */
function HowItWorks() {
  const steps = [
    { n: 1, title: "Sign up free", desc: "Create your account in 60 seconds. No card needed." },
    { n: 2, title: "Set up your diary", desc: "Add pupils, set availability, connect your calendar." },
    { n: 3, title: "Grow your business", desc: "Take payments, track lessons, build your reputation." },
  ];

  return (
    <section className="bg-[#F8F9FB] py-20 px-4" style={FONT}>
      <h2 className="text-3xl md:text-4xl font-bold text-[#0F2044] text-center mb-16">
        Up and running in minutes
      </h2>

      <div className="flex flex-col md:flex-row items-start md:items-center justify-center gap-8 md:gap-0 max-w-4xl mx-auto relative">
        <div className="hidden md:block absolute top-10 left-[16%] right-[16%] border-t-2 border-dashed border-[#E2E6ED]" />
        {steps.map((s) => (
          <div
            key={s.n}
            className="flex flex-col items-center text-center md:w-1/3 relative z-10"
          >
            <div className="w-10 h-10 rounded-full bg-[#0F2044] text-white font-bold flex items-center justify-center mb-4 mx-auto">
              {s.n}
            </div>
            <div className="font-bold text-[#0F2044] text-lg mb-2">{s.title}</div>
            <div className="text-[#6B7280] text-sm max-w-[200px]">{s.desc}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ---------- Testimonials ---------- */
function Testimonials() {
  const items = [
    {
      quote:
        "I went from zero Google presence to getting enquiries every week — and I didn't pay a penny for marketing.",
      name: "James T.",
      role: "ADI, Birmingham",
    },
    {
      quote:
        "Having my reviews front and centre means pupils trust me before they even call. Bookings have doubled.",
      name: "Laura P.",
      role: "ADI, Bristol",
    },
    {
      quote:
        "DSM replaced three different apps I was using. Now everything's in one place and I save hours every week.",
      name: "Amir K.",
      role: "ADI, Leicester",
    },
  ];

  return (
    <section className="bg-white py-20 px-4" style={FONT}>
      <h2 className="text-3xl font-bold text-[#0F2044] text-center mb-4">Loved by instructors</h2>
      <p className="text-[#6B7280] text-center mb-16">Real feedback from real ADIs</p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
        {items.map((t) => (
          <div key={t.name} className="border border-[#E2E6ED] rounded-2xl p-6">
            <div className="flex gap-1 mb-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className="text-amber-400 fill-amber-400 w-4 h-4" />
              ))}
            </div>
            <p className="text-[#374151] italic text-sm leading-relaxed mb-4">"{t.quote}"</p>
            <div className="font-bold text-[#0F2044] text-sm">{t.name}</div>
            <div className="text-[#6B7280] text-xs">{t.role}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ---------- Pricing teaser ---------- */
function PricingTeaser() {
  const freeFeatures = ["Schedule", "Pupils", "Basic reports", "Mini website"];
  const proFeatures = [
    "Everything in Free",
    "GPS tracking",
    "Payments",
    "Custom domain",
    "Business reports",
  ];

  return (
    <section className="bg-[#0F2044] py-20 px-4 text-white text-center" style={FONT}>
      <h2 className="text-3xl md:text-4xl font-bold mb-4">Simple, transparent pricing</h2>
      <p className="text-white/70 mb-16">No tie-in. No hidden fees. Cancel anytime.</p>

      <div className="flex flex-col md:flex-row gap-6 max-w-2xl mx-auto">
        <div className="bg-white/10 border border-white/20 rounded-2xl p-8 flex-1 text-left">
          <div className="text-3xl font-bold mb-1">Free</div>
          <div className="text-white/70 text-sm mb-6">£0/month</div>
          <ul className="flex flex-col gap-2 mb-6 text-sm text-white/80">
            {freeFeatures.map((f) => (
              <li key={f}>✓ {f}</li>
            ))}
          </ul>
          <Link
            to="/register"
            className="block text-center bg-white text-[#0F2044] hover:bg-white/90 w-full py-3 rounded-xl font-semibold no-underline"
          >
            Start free →
          </Link>
        </div>

        <div className="bg-white rounded-2xl p-8 flex-1 relative text-left">
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-400 text-[#0F2044] text-xs font-bold px-4 py-1 rounded-full">
            Most popular
          </div>
          <div className="text-3xl font-bold text-[#0F2044] mb-1">Pro</div>
          <div className="text-[#6B7280] text-sm mb-6">£9.99/month</div>
          <ul className="flex flex-col gap-2 mb-6 text-sm text-[#374151]">
            {proFeatures.map((f) => (
              <li key={f}>✓ {f}</li>
            ))}
          </ul>
          <Link
            to="/register"
            className="block text-center bg-[#1A52A0] text-white hover:bg-[#0F2044] w-full py-3 rounded-xl font-semibold no-underline transition-colors"
          >
            Start free for 30 days →
          </Link>
        </div>
      </div>

      <Link to="/pricing" className="text-white/60 hover:text-white mt-8 inline-block no-underline">
        See full pricing →
      </Link>
    </section>
  );
}

/* ---------- Bottom CTA ---------- */
function BottomCTA() {
  return (
    <section className="bg-[#1A52A0] py-20 px-4 text-white text-center" style={FONT}>
      <h2 className="text-3xl md:text-4xl font-bold mb-4">
        Ready to take control of your business?
      </h2>
      <p className="text-white/80 mb-8">Join 1,200+ driving instructors already using DSM.</p>
      <Link
        to="/register"
        className="inline-block bg-white text-[#0F2044] font-bold px-10 py-4 rounded-xl text-lg hover:bg-white/90 no-underline transition-colors"
      >
        Start free today →
      </Link>
    </section>
  );
}
