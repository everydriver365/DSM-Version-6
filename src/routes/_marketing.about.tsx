import { createFileRoute, Link } from "@tanstack/react-router";
import { Shield, Zap, Heart } from "lucide-react";

const TEAL = "#1877D6";
const WHITE = "#FFFFFF";
const LIGHT_BG = "#F7FAFC";
const NAVY = "#133155";
const MUTED = "#718096";

export const Route = createFileRoute("/_marketing/about")({
  head: () => ({
    meta: [
      { title: "About — DSM by EveryDriver" },
      { name: "description", content: "DSM is built by driving instructors for driving instructors. Our mission is to make driving instruction better for everyone." },
      { property: "og:title", content: "About DSM" },
      { property: "og:description", content: "Built by an instructor. For instructors. The mission, story and values behind DSM and EveryDriver." },
    ],
  }),
  component: AboutPage,
});

const values = [
  {
    icon: Shield,
    title: "Trust first",
    body: "We protect learners and instructors equally. Every feature we build is designed to create a fairer, safer experience for everyone on the platform.",
  },
  {
    icon: Zap,
    title: "Simple by design",
    body: "Great software should feel effortless. If something takes more than a few taps, we've done it wrong.",
  },
  {
    icon: Heart,
    title: "Built for the profession",
    body: "We're instructors too. We understand the job, the pressures and what actually matters — and that shapes everything we build.",
  },
];

const stats = [
  { value: "Free", label: "Core plan, forever" },
  { value: "£0", label: "To get started" },
  { value: "1", label: "Connected ecosystem" },
  { value: "2", label: "Products, one mission" },
];

function AboutPage() {
  return (
    <div style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* Hero */}
      <section className="bg-[#F7FAFC] py-20 px-6 text-center">
        <div className="max-w-[1180px] mx-auto">
          <span className="inline-block bg-[#E6F7F6] text-[#1877D6] text-xs font-semibold px-3 py-1 rounded-full mb-4">
            Our story
          </span>
          <h1 className="text-4xl md:text-5xl font-black text-[#133155] mb-4">
            Built by an instructor. For instructors.
          </h1>
          <p className="text-[#718096] text-lg max-w-2xl mx-auto">
            DSM started because the tools available to driving instructors were outdated, overpriced and built by people who'd never taught a lesson in their life.
          </p>
        </div>
      </section>

      {/* Story section */}
      <section className="bg-white py-20 px-6" style={{ fontFamily: "'Inter', sans-serif" }}>
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-black text-[#133155] mb-8">Why we built DSM</h2>
          <div className="flex flex-col gap-6">
            <p className="text-[#374151] text-lg leading-relaxed">
              We're driving instructors. We know what it's like to juggle a full diary, chase payments, manage pupils and try to grow a business — all from your car.
            </p>
            <p className="text-[#374151] text-lg leading-relaxed">
              We built DSM because we wanted software that actually understood our world. Not a generic booking tool with a driving school skin — but something built from the ground up for ADIs.
            </p>
            <p className="text-[#374151] text-lg leading-relaxed">
              And we built EveryDriver because we wanted to send our fellow instructors more pupils — not charge them a fortune for advertising that doesn't work.
            </p>
            <p className="text-[#374151] text-lg leading-relaxed">
              Today, DSM and EveryDriver are the connected ecosystem we always wished existed. Free to start. Built to grow with you.
            </p>
          </div>
        </div>
      </section>

      {/* Mission section */}
      <section className="bg-[#F7FAFC] py-20 px-6 text-center" style={{ fontFamily: "'Inter', sans-serif" }}>
        <div className="max-w-[1180px] mx-auto">
          <h2 className="text-3xl font-black text-[#133155] mb-6">Our mission</h2>
          <p className="text-2xl font-black text-[#1877D6] mb-6">
            Making driving instruction better for everyone.
          </p>
          <p className="text-[#718096] text-lg max-w-2xl mx-auto">
            Better for learners who deserve to be looked after from their first lesson to their driving test. Better for instructors who deserve great tools and a steady flow of pupils. Better for the roads we all share.
          </p>
        </div>
      </section>

      {/* Values section */}
      <section className="bg-white py-20 px-6" style={{ fontFamily: "'Inter', sans-serif" }}>
        <div className="max-w-[1180px] mx-auto">
          <h2 className="text-3xl font-black text-[#133155] text-center mb-12">What we stand for</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {values.map((v) => {
              const Icon = v.icon;
              return (
                <div
                  key={v.title}
                  className="bg-[#F7FAFC] rounded-2xl p-8"
                >
                  <div className="text-[#1877D6] mb-5">
                    <Icon size={32} strokeWidth={2} />
                  </div>
                  <h3 className="font-bold text-[#133155] text-lg mb-3">{v.title}</h3>
                  <p className="text-[#718096] text-base leading-relaxed">{v.body}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Stats section */}
      <section className="bg-[#133155] py-20 px-6" style={{ fontFamily: "'Inter', sans-serif" }}>
        <div className="max-w-[1180px] mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto text-center">
            {stats.map((s) => (
              <div key={s.label}>
                <div className="text-[#1877D6] text-5xl font-black mb-2">{s.value}</div>
                <div className="text-white/60 text-sm">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact teaser */}
      <section className="bg-[#F7FAFC] py-16 px-6 text-center" style={{ fontFamily: "'Inter', sans-serif" }}>
        <div className="max-w-[1180px] mx-auto">
          <h2 className="text-3xl font-black text-[#133155] mb-4">Get in touch</h2>
          <p className="text-[#718096] mb-8">Questions, feedback or just want to say hello?</p>
          <Link
            to="/contact"
            className="inline-flex items-center bg-[#1877D6] text-white font-semibold px-8 py-4 rounded-xl no-underline transition hover:bg-[#009E8F]"
          >
            Contact us →
          </Link>
          <p className="text-[#718096] text-sm mt-4">info@everydriver.co.uk</p>
        </div>
      </section>
    </div>
  );
}

export default AboutPage;
