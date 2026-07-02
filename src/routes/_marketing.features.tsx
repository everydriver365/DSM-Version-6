import { createFileRoute, Link } from "@tanstack/react-router";
import { Calendar, PoundSterling, MapPin, Users, BarChart3, Globe, Check } from "lucide-react";

const NAVY = "#133155";
const TEAL = "#00B5A5";
const LIGHT_BG = "#F7FAFC";
const WHITE = "#FFFFFF";
const TEXT = "#2D3748";
const MUTED = "#718096";

export const Route = createFileRoute("/_marketing/features")({
  head: () => ({
    meta: [
      { title: "Features — DSM by EveryDriver" },
      { name: "description", content: "Every feature in DSM was designed to save driving instructors time, help them earn more, and make running their school effortless." },
      { property: "og:title", content: "DSM Features" },
      { property: "og:description", content: "Scheduling, payments, pupil management, GPS tracking, reports and a free mini website — every tool a UK driving instructor needs." },
    ],
  }),
  component: FeaturesPage,
});

function FeatureItem({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 min-w-[20px] h-5 w-5 rounded-full bg-[#00B5A5]/10 flex items-center justify-center">
        <Check size={12} color={TEAL} strokeWidth={3} />
      </div>
      <span className="text-[#2D3748] text-base">{children}</span>
    </div>
  );
}

function FeatureSection({
  icon: Icon,
  heading,
  description,
  features,
  mockup,
  reversed = false,
  bg = WHITE,
}: {
  icon: React.ElementType;
  heading: string;
  description: string;
  features: string[];
  mockup: React.ReactNode;
  reversed?: boolean;
  bg?: string;
}) {
  return (
    <section className="py-20 px-6" style={{ background: bg, fontFamily: "'Inter', sans-serif" }}>
      <div className="max-w-[1180px] mx-auto">
        <div
          className={`grid md:grid-cols-2 gap-12 items-center ${reversed ? "md:grid-flow-dense" : ""}`}
        >
          <div className={reversed ? "md:col-start-2" : ""}>
            <div className="w-12 h-12 rounded-xl bg-[#00B5A5]/10 flex items-center justify-center mb-5">
              <Icon size={24} color={TEAL} strokeWidth={2} />
            </div>
            <h3 className="text-3xl font-black text-[#133155] mb-4">{heading}</h3>
            <p className="text-[#718096] text-lg leading-relaxed mb-6">{description}</p>
            <div className="flex flex-col gap-3">
              {features.map((f) => (
                <FeatureItem key={f}>{f}</FeatureItem>
              ))}
            </div>
          </div>
          <div className={reversed ? "md:col-start-1" : ""}>{mockup}</div>
        </div>
      </div>
    </section>
  );
}

function MockupCard({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="bg-[#F7FAFC] rounded-2xl p-8 min-h-[320px] flex items-center justify-center"
      style={{ fontFamily: "'Inter', sans-serif" }}
    >
      {children}
    </div>
  );
}

function FeaturesPage() {
  return (
    <div style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* Hero */}
      <section className="bg-[#F7FAFC] py-20 px-6 text-center">
        <div className="max-w-[1180px] mx-auto">
          <span className="inline-block bg-[#E6F7F6] text-[#00B5A5] text-xs font-semibold px-3 py-1 rounded-full mb-4">
            Everything you need
          </span>
          <h1 className="text-4xl md:text-5xl font-black text-[#133155] mb-4">
            Built for driving instructors. By a driving instructor.
          </h1>
          <p className="text-[#718096] text-lg max-w-2xl mx-auto">
            Every feature in DSM was designed to save you time, help you earn more, and make running your driving school effortless.
          </p>
        </div>
      </section>

      {/* Section 1: Smart scheduling */}
      <FeatureSection
        icon={Calendar}
        heading="Smart scheduling"
        description="Your complete diary in your pocket. See your week at a glance, add lessons in seconds, and never double-book again."
        features={[
          "Day, week and month views",
          "Colour-coded by pupil",
          "Automatic conflict detection",
          "Lesson reminders sent automatically",
        ]}
        mockup={
          <MockupCard>
            <Calendar size={80} color={TEAL} strokeWidth={1.5} />
          </MockupCard>
        }
        bg={WHITE}
      />

      {/* Section 2: Take payments anywhere */}
      <FeatureSection
        icon={PoundSterling}
        heading="Take payments anywhere"
        description="Accept card, Apple Pay and Google Pay in seconds. Share a QR code, send a payment link, or take payment at the end of every lesson."
        features={[
          "Card, Apple Pay & Google Pay",
          "QR code payments",
          "Payment links via SMS",
          "Automatic payment records",
        ]}
        mockup={
          <MockupCard>
            <PoundSterling size={80} color={TEAL} strokeWidth={1.5} />
          </MockupCard>
        }
        bg={LIGHT_BG}
        reversed
      />

      {/* Section 3: Live GPS tracking */}
      <FeatureSection
        icon={MapPin}
        heading="Live GPS tracking"
        description="Record every route automatically. Monitor speed, see journey history and keep a full log of every lesson driven."
        features={[
          "Automatic route recording",
          "Speed monitoring",
          "Journey history",
          "Snap-to-road accuracy",
        ]}
        mockup={
          <MockupCard>
            <MapPin size={80} color={TEAL} strokeWidth={1.5} />
          </MockupCard>
        }
        bg={WHITE}
      />

      {/* Section 4: Complete pupil management */}
      <FeatureSection
        icon={Users}
        heading="Complete pupil management"
        description="Everything you need to know about every pupil, in one place. Progress, payments, notes and syllabus — all connected."
        features={[
          "Full pupil profiles",
          "DVSA syllabus tracker",
          "Test readiness score",
          "Payment history",
        ]}
        mockup={
          <MockupCard>
            <Users size={80} color={TEAL} strokeWidth={1.5} />
          </MockupCard>
        }
        bg={LIGHT_BG}
        reversed
      />

      {/* Section 5: Business reports */}
      <FeatureSection
        icon={BarChart3}
        heading="Business reports that matter"
        description="Know exactly how your business is performing. Month-to-date earnings, tax estimates, weekly summaries and more."
        features={[
          "MTD earnings dashboard",
          "Tax year estimate",
          "Weekly report card",
          "Outstanding payments",
        ]}
        mockup={
          <MockupCard>
            <BarChart3 size={80} color={TEAL} strokeWidth={1.5} />
          </MockupCard>
        }
        bg={WHITE}
      />

      {/* Section 6: Mini website */}
      <FeatureSection
        icon={Globe}
        heading="Your own mini website"
        description="Every DSM instructor gets a free booking page on EveryDriver. Upgrade to Plus or Max for your own custom domain and white label branding."
        features={[
          "Free on everydriver.co.uk",
          "Custom domain with Plus/Max",
          "Remove EveryDriver branding",
          "Automatic course listings",
        ]}
        mockup={
          <MockupCard>
            <Globe size={80} color={TEAL} strokeWidth={1.5} />
          </MockupCard>
        }
        bg={LIGHT_BG}
        reversed
      />

      {/* EveryDriver integration */}
      <section className="bg-[#133155] py-20 px-6 text-center" style={{ fontFamily: "'Inter', sans-serif" }}>
        <div className="max-w-[1180px] mx-auto">
          <h2 className="text-3xl font-black text-white mb-4">Get more pupils automatically</h2>
          <p className="text-white/70 text-lg mb-8 max-w-2xl mx-auto">
            Publish your courses to EveryDriver in one click. Learners find you, book and pay — bookings appear in DSM automatically.
          </p>
          <a
            href="https://everydriver.co.uk"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center bg-[#00B5A5] text-white font-semibold px-8 py-4 rounded-xl no-underline transition hover:bg-[#009E8F]"
          >
            See EveryDriver →
          </a>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="bg-[#00B5A5] py-16 px-6 text-center" style={{ fontFamily: "'Inter', sans-serif" }}>
        <div className="max-w-[1180px] mx-auto">
          <h2 className="text-4xl font-black text-white mb-4">Ready to try DSM?</h2>
          <p className="text-white/80 mb-8">Free forever. No card required.</p>
          <Link
            to="/register"
            className="inline-flex items-center bg-white text-[#00B5A5] font-black px-10 py-4 rounded-xl no-underline transition hover:bg-gray-100"
          >
            Get started free →
          </Link>
        </div>
      </section>
    </div>
  );
}

export default FeaturesPage;
