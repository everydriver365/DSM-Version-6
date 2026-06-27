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

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "DSM by EveryDriver — Run your driving school from your phone" },
      {
        name: "description",
        content:
          "Schedule lessons, take payments, track routes and manage pupils — all in one app built for UK driving instructors. Free to start.",
      },
      { property: "og:title", content: "DSM — Driving School Manager" },
      {
        property: "og:description",
        content:
          "Schedule lessons, take payments, track routes and manage pupils — built for UK driving instructors.",
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
    <div className="bg-white min-h-screen font-sans">
      <MarketingNav />
      <Hero />
      <FeatureTiles />
      <HowItWorks />
      <SocialProof />
      <PricingTeaser />
      <BottomCTA />
      <MarketingFooter />
    </div>
  );
}

/* ---------- Hero ---------- */
function Hero() {
  return (
    <section className="min-h-screen bg-[#0F2044] flex">
      <div className="flex-1 flex flex-col justify-center pl-8 md:pl-20 pr-6 py-20 max-w-xl">
        <div className="bg-white/10 text-white/80 text-xs px-3 py-1 rounded-full mb-6 inline-flex items-center gap-2 w-fit">
          <span className="bg-white text-[#0F2044] font-bold px-2 py-0.5 rounded-full text-[10px]">NEW</span>
          Now with GPS tracking & payments
        </div>

        <h1 className="text-4xl md:text-6xl font-black text-white leading-tight mb-6">
          Run your driving school from your phone
        </h1>

        <p className="text-white/70 text-lg mb-8 max-w-md">
          Schedule lessons, take payments, track routes and manage pupils — all in one app built for UK driving instructors.
        </p>

        <div className="flex flex-wrap gap-4">
          <Link
            to="/register"
            className="bg-white text-[#0F2044] font-bold px-8 py-4 rounded-xl text-base hover:bg-white/90 no-underline transition-colors"
          >
            Start free today
          </Link>
          <a
            href="#demo"
            className="border-2 border-white/30 text-white px-8 py-4 rounded-xl text-base hover:bg-white/10 no-underline transition-colors"
          >
            Watch demo
          </a>
        </div>

        <div className="mt-8 flex flex-wrap gap-6 text-white/50 text-sm">
          <span>✓ Free to start</span>
          <span>✓ No card required</span>
          <span>✓ DVSA approved instructors</span>
        </div>
      </div>

      <div className="hidden md:flex flex-1 items-center justify-center pr-8">
        <div className="w-64 h-[520px] bg-white/10 rounded-[40px] border-2 border-white/20 flex items-center justify-center">
          <span className="text-white/30 text-sm">App preview</span>
        </div>
      </div>
    </section>
  );
}

/* ---------- Feature tiles ---------- */
function FeatureTiles() {
  const tiles = [
    { bg: "bg-[#0F2044]", top: "bg-[#1A52A0]", Icon: Calendar, title: "Smart scheduling", desc: "Google Calendar-style diary. See your week at a glance." },
    { bg: "bg-[#16A34A]", top: "bg-green-700", Icon: PoundSterling, title: "Take payments", desc: "Card, Apple Pay & Google Pay in-lesson via QR code." },
    { bg: "bg-[#CC2229]", top: "bg-red-800", Icon: MapPin, title: "Live GPS tracking", desc: "Record every route. Monitor speed. Stay safe." },
    { bg: "bg-[#7C3AED]", top: "bg-purple-800", Icon: Users, title: "Pupil management", desc: "Full profiles, syllabus progress and payment history." },
    { bg: "bg-[#0891B2]", top: "bg-cyan-800", Icon: BarChart3, title: "Business reports", desc: "MTD earnings, tax estimates and weekly summaries." },
    { bg: "bg-[#D97706]", top: "bg-amber-800", Icon: Globe, title: "Your mini website", desc: "Free booking page at everydriver.co.uk/i/you" },
  ];

  return (
    <section className="bg-white py-24 px-6">
      <h2 className="text-4xl font-black text-[#0F2044] text-center mb-4">Everything in one app</h2>
      <p className="text-[#6B7280] text-center mb-16">
        Built by an instructor. Trusted by 1,200+ ADIs across the UK.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
        {tiles.map((t) => {
          const Icon = t.Icon;
          return (
            <div
              key={t.title}
              className={`${t.bg} rounded-2xl overflow-hidden hover:shadow-xl transition-shadow cursor-pointer`}
            >
              <div className={`h-48 ${t.top} flex items-center justify-center`}>
                <Icon className="w-20 h-20 text-white/30" />
              </div>
              <div className="p-6">
                <h3 className="text-white font-bold text-xl mb-2">{t.title}</h3>
                <p className="text-white/70 text-sm">{t.desc}</p>
              </div>
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
    { n: 1, title: "Create account", desc: "60 seconds. No card needed." },
    { n: 2, title: "Add your pupils", desc: "Import or add manually." },
    { n: 3, title: "Start earning", desc: "Take payments, track lessons." },
  ];

  return (
    <section className="bg-[#F8F9FB] py-24 px-6">
      <h2 className="text-4xl font-black text-[#0F2044] text-center mb-16">
        Up and running in 5 minutes
      </h2>
      <div className="flex flex-col md:flex-row gap-8 max-w-4xl mx-auto">
        {steps.map((s) => (
          <div key={s.n} className="flex-1 text-center">
            <div className="w-16 h-16 rounded-full bg-[#0F2044] text-white font-black text-2xl flex items-center justify-center mx-auto mb-6">
              {s.n}
            </div>
            <div className="text-xl font-bold text-[#0F2044] mb-3">{s.title}</div>
            <div className="text-[#6B7280]">{s.desc}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ---------- Social proof ---------- */
function SocialProof() {
  const stats = [
    { n: "1,200+", label: "Instructors" },
    { n: "50,000+", label: "Lessons tracked" },
    { n: "4.9★", label: "Average rating" },
    { n: "£2M+", label: "Payments processed" },
  ];
  const testimonials = [
    { quote: "I went from zero Google presence to enquiries every week — and I didn't pay a penny for marketing.", name: "James T.", role: "ADI, Birmingham" },
    { quote: "Having my reviews front and centre means pupils trust me before they even call. Bookings have doubled.", name: "Laura P.", role: "ADI, Bristol" },
    { quote: "DSM replaced three different apps I was using. Everything's in one place and I save hours every week.", name: "Amir K.", role: "ADI, Leicester" },
  ];

  return (
    <section className="bg-white py-24 px-6">
      <h2 className="text-3xl font-black text-[#0F2044] text-center mb-4">
        Trusted by instructors across the UK
      </h2>
      <p className="text-[#6B7280] text-center mb-16">Real numbers from real ADIs.</p>

      <div className="flex flex-col md:flex-row justify-center gap-16 mb-16">
        {stats.map((s) => (
          <div key={s.label} className="text-center">
            <div className="text-5xl font-black text-[#1A52A0]">{s.n}</div>
            <div className="text-[#6B7280] text-sm mt-2">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
        {testimonials.map((t) => (
          <div key={t.name} className="border border-[#E2E6ED] rounded-2xl p-6">
            <div className="flex gap-1 mb-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className="w-4 h-4 text-amber-400 fill-amber-400" />
              ))}
            </div>
            <p className="italic text-[#374151] text-sm leading-relaxed mb-4">"{t.quote}"</p>
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
  const free = ["Schedule", "Pupils", "Basic reports", "Mini website"];
  const pro = ["Everything in Free", "GPS tracking", "Payments", "Custom domain", "Business reports"];

  return (
    <section className="bg-[#0F2044] py-24 px-6 text-center">
      <h2 className="text-4xl font-black text-white mb-4">Simple pricing</h2>
      <p className="text-white/70 mb-16">Start free. Upgrade when you're ready.</p>

      <div className="flex flex-col md:flex-row gap-6 max-w-2xl mx-auto">
        <div className="bg-white/10 border border-white/20 rounded-2xl p-8 flex-1 text-left">
          <div className="text-3xl font-black text-white mb-1">Free</div>
          <div className="text-white/70 text-sm mb-6">£0/month</div>
          <ul className="flex flex-col gap-2 mb-6 text-sm text-white/80">
            {free.map((f) => <li key={f}>✓ {f}</li>)}
          </ul>
          <Link to="/register" className="block text-center bg-white text-[#0F2044] font-bold w-full py-3 rounded-xl hover:bg-white/90 no-underline">
            Start free →
          </Link>
        </div>

        <div className="bg-white rounded-2xl p-8 flex-1 relative text-left">
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-400 text-[#0F2044] text-xs font-bold px-4 py-1 rounded-full">
            Most popular
          </div>
          <div className="text-3xl font-black text-[#0F2044] mb-1">Pro</div>
          <div className="text-[#6B7280] text-sm mb-6">£9.99/month</div>
          <ul className="flex flex-col gap-2 mb-6 text-sm text-[#374151]">
            {pro.map((f) => <li key={f}>✓ {f}</li>)}
          </ul>
          <Link to="/register" className="block text-center bg-[#1A52A0] text-white font-bold w-full py-3 rounded-xl hover:bg-[#0F2044] no-underline transition-colors">
            Start 30-day trial →
          </Link>
        </div>
      </div>

      <Link to="/pricing" className="text-white/50 hover:text-white mt-8 inline-block no-underline">
        See all features →
      </Link>
    </section>
  );
}

/* ---------- Bottom CTA ---------- */
function BottomCTA() {
  return (
    <section className="bg-[#1A52A0] py-24 px-6 text-center">
      <h2 className="text-4xl md:text-5xl font-black text-white mb-4">
        Ready to take control?
      </h2>
      <p className="text-white/80 mb-10">
        Join 1,200+ driving instructors already using DSM.
      </p>
      <Link
        to="/register"
        className="inline-block bg-white text-[#0F2044] font-black px-12 py-5 rounded-xl text-lg hover:bg-white/90 no-underline transition-colors"
      >
        Start free today →
      </Link>
    </section>
  );
}
