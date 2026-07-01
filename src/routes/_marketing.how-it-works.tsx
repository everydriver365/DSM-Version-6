import { createFileRoute, Link } from "@tanstack/react-router";
import {
  UserPlus,
  BookOpen,
  Calendar,
  TrendingUp,
  Search,
  Shield,
  CreditCard,
  Star,
  ChevronRight,
} from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const TEAL = "#00B5A5";
const WHITE = "#FFFFFF";
const LIGHT_BG = "#F7FAFC";
const NAVY = "#1B2B4B";
const MUTED = "#718096";

const instructorSteps = [
  {
    n: "1",
    icon: UserPlus,
    title: "Create your free account",
    description: "Sign up in 60 seconds. No card required, no contract, no catch.",
  },
  {
    n: "2",
    icon: BookOpen,
    title: "Add your pupils",
    description: "Add existing pupils manually or let them find you through EveryDriver.",
  },
  {
    n: "3",
    icon: Calendar,
    title: "Schedule and teach",
    description: "Book lessons, take payments and record progress — all from your phone.",
  },
  {
    n: "4",
    icon: TrendingUp,
    title: "Watch your business grow",
    description: "Get more pupils from EveryDriver, track your earnings and grow at your own pace.",
  },
];

const learnerSteps = [
  {
    n: "1",
    icon: Search,
    title: "Find your instructor",
    description: "Search by location, compare courses and read verified reviews.",
  },
  {
    n: "2",
    icon: Shield,
    title: "Choose your package",
    description: "Pick Standard, Protected or Complete — the level of support that suits you.",
  },
  {
    n: "3",
    icon: CreditCard,
    title: "Book and pay securely",
    description: "Pay your deposit online. Apple Pay, Google Pay and card all accepted.",
  },
  {
    n: "4",
    icon: Star,
    title: "Learn and pass",
    description: "Track your progress, swap test dates and stay supported until you pass.",
  },
];

const faqs = [
  {
    q: "Do I need any technical skills to use DSM?",
    a: "None at all. If you can use a smartphone, you can use DSM. Most instructors are up and running within 10 minutes of signing up.",
  },
  {
    q: "Can I import my existing pupils?",
    a: "Yes — you can add pupils manually or contact us for help importing from another app. We offer free migration from Total Drive and other platforms.",
  },
  {
    q: "Does DSM work on iPhone and Android?",
    a: "Yes — DSM is a progressive web app that works on any device. Add it to your home screen for a native app experience.",
  },
  {
    q: "How does EveryDriver send me pupils?",
    a: "When you publish a course on DSM, it automatically appears on EveryDriver.co.uk. Learners find your course, book and pay — the booking appears in your DSM diary automatically.",
  },
  {
    q: "What happens if I want to cancel?",
    a: "Cancel anytime from your settings — no forms, no phone calls, no fees. Your data is always yours to export.",
  },
];

export const Route = createFileRoute("/_marketing/how-it-works")({
  head: () => ({
    meta: [
      { title: "How it works — DSM by EveryDriver" },
      { name: "description", content: "Get up and running in minutes. DSM is simple by design — for instructors and learners." },
      { property: "og:title", content: "How DSM works" },
      { property: "og:description", content: "No training needed. No complicated setup. Just sign up and start managing your driving school." },
    ],
  }),
  component: HowItWorksPage,
});

function StepsRow({
  steps,
}: {
  steps: { n: string; icon: React.ElementType; title: string; description: string }[];
}) {
  return (
    <div className="relative max-w-5xl mx-auto">
      <div className="hidden md:block absolute top-7 left-[12%] right-[12%] h-0.5 bg-[#00B5A5]/20" />
      <div className="flex flex-col md:flex-row gap-8 relative">
        {steps.map((step) => {
          const Icon = step.icon;
          return (
            <div key={step.n} className="flex-1 flex flex-col items-center text-center">
              <div className="w-14 h-14 rounded-full bg-[#00B5A5] text-white font-black text-xl flex items-center justify-center mb-6 z-10">
                {step.n}
              </div>
              <div className="mb-4 text-[#00B5A5]">
                <Icon size={28} strokeWidth={2} />
              </div>
              <h3 className="font-bold text-[#1B2B4B] text-lg mb-3">{step.title}</h3>
              <p className="text-[#718096] text-sm leading-relaxed">{step.description}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function HowItWorksPage() {
  return (
    <div style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* Hero */}
      <section className="bg-[#F7FAFC] py-20 px-6 text-center">
        <div className="max-w-[1180px] mx-auto">
          <span className="inline-block bg-[#E6F7F6] text-[#00B5A5] text-xs font-semibold px-3 py-1 rounded-full mb-4">
            Simple by design
          </span>
          <h1 className="text-4xl md:text-5xl font-black text-[#1B2B4B] mb-4">
            Up and running in minutes
          </h1>
          <p className="text-[#718096] text-lg max-w-2xl mx-auto">
            No training needed. No complicated setup. Just sign up and start managing your driving school.
          </p>
        </div>
      </section>

      {/* For instructors */}
      <section className="bg-white py-20 px-6" style={{ fontFamily: "'Inter', sans-serif" }}>
        <div className="max-w-[1180px] mx-auto">
          <h2 className="text-3xl font-black text-[#1B2B4B] text-center mb-16">For instructors</h2>
          <StepsRow steps={instructorSteps} />
        </div>
      </section>

      {/* For learners */}
      <section className="bg-[#F7FAFC] py-20 px-6" style={{ fontFamily: "'Inter', sans-serif" }}>
        <div className="max-w-[1180px] mx-auto">
          <h2 className="text-3xl font-black text-[#1B2B4B] text-center mb-16">For learners</h2>
          <StepsRow steps={learnerSteps} />
        </div>
      </section>

      {/* EveryDriver connection */}
      <section className="bg-[#1B2B4B] py-20 px-6" style={{ fontFamily: "'Inter', sans-serif" }}>
        <div className="max-w-[1180px] mx-auto">
          <h2 className="text-3xl font-black text-white text-center mb-6">
            One platform. Both sides connected.
          </h2>
          <p className="text-white/70 text-center max-w-2xl mx-auto mb-12">
            When an instructor creates a course in DSM and publishes it to EveryDriver, learners can find and book it instantly. The booking appears in DSM automatically — no manual work needed.
          </p>
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <span className="bg-[#00B5A5] text-white px-6 py-3 rounded-xl font-bold">DSM</span>
            <ChevronRight className="text-white/50" size={24} />
            <span className="bg-white/10 text-white px-6 py-3 rounded-xl">Course published</span>
            <ChevronRight className="text-white/50" size={24} />
            <span className="bg-white/10 text-white px-6 py-3 rounded-xl">Learner books</span>
            <ChevronRight className="text-white/50" size={24} />
            <span className="bg-[#00B5A5] text-white px-6 py-3 rounded-xl font-bold">Booking in DSM</span>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-white py-16 px-6" style={{ fontFamily: "'Inter', sans-serif" }}>
        <div className="max-w-[1180px] mx-auto">
          <h2 className="text-3xl font-black text-[#1B2B4B] text-center mb-12">Common questions</h2>
          <Accordion type="single" collapsible className="max-w-2xl mx-auto">
            {faqs.map((faq, idx) => (
              <AccordionItem key={idx} value={`item-${idx}`}>
                <AccordionTrigger className="text-[#1B2B4B] text-left font-semibold">
                  {faq.q}
                </AccordionTrigger>
                <AccordionContent className="text-[#718096] leading-relaxed">
                  {faq.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="bg-[#00B5A5] py-16 px-6 text-center" style={{ fontFamily: "'Inter', sans-serif" }}>
        <div className="max-w-[1180px] mx-auto">
          <h2 className="text-4xl font-black text-white mb-4">Ready to get started?</h2>
          <p className="text-white/80 mb-8">Join hundreds of driving instructors already using DSM.</p>
          <Link
            to="/register"
            className="inline-flex items-center bg-white text-[#00B5A5] font-black px-10 py-4 rounded-xl no-underline transition hover:bg-gray-100"
          >
            Create free account →
          </Link>
        </div>
      </section>
    </div>
  );
}

export default HowItWorksPage;
