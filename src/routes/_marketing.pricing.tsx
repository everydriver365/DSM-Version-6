import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { CheckCircle2, X, Minus, MapPin, Camera, ChevronDown } from "lucide-react";

export const Route = createFileRoute("/_marketing/pricing")({
  head: () => ({
    meta: [
      { title: "Pricing — Driving School Manager" },
      {
        name: "description",
        content:
          "Simple, transparent pricing for UK driving instructors. Free forever to start. Upgrade for GPS, syllabus tracking, health cover and more.",
      },
      { property: "og:title", content: "Pricing — Driving School Manager" },
      {
        property: "og:description",
        content:
          "Start free forever. Upgrade when you're ready. Cancel anytime.",
      },
    ],
  }),
  component: PricingPage,
});

type Billing = "monthly" | "annual";

function PricingPage() {
  const [billing, setBilling] = useState<Billing>("monthly");
  const annual = billing === "annual";

  return (
    <div className="bg-white">
      {/* HERO */}
      <section className="bg-[#F7FAFC] py-16 px-6 text-center">
        <span className="bg-[#E6F7F6] text-[#00B5A5] text-xs font-semibold px-3 py-1 rounded-full mb-4 inline-block">
          Simple, transparent pricing
        </span>
        <h1 className="text-4xl md:text-5xl font-black text-[#1B2B4B] mb-4">
          No surprises. No lock-in.
        </h1>
        <p className="text-[#718096] text-lg mb-8">
          Start free forever. Upgrade when you're ready. Cancel anytime.
        </p>
        <div className="inline-flex items-center bg-white border border-gray-200 rounded-full p-1">
          <button
            onClick={() => setBilling("monthly")}
            className={`px-5 py-2 rounded-full text-sm font-semibold transition-colors ${
              !annual ? "bg-[#00B5A5] text-white" : "text-[#1B2B4B]"
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setBilling("annual")}
            className={`px-5 py-2 rounded-full text-sm font-semibold transition-colors ${
              annual ? "bg-[#00B5A5] text-white" : "text-[#1B2B4B]"
            }`}
          >
            Annual <span className="text-xs opacity-80">(save 2 months)</span>
          </button>
        </div>
      </section>

      {/* PLAN CARDS */}
      <section className="bg-white py-16 px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
          {/* STARTER */}
          <div className="border border-gray-200 rounded-2xl p-8 flex flex-col">
            <h3 className="font-black text-[#1B2B4B] text-2xl mb-2">Starter</h3>
            <div className="mb-1">
              <span className="text-4xl font-black text-[#1B2B4B]">Free</span>
              <span className="text-[#718096] text-sm">/forever</span>
            </div>
            <p className="text-[#718096] text-sm mb-6">Perfect for getting started</p>
            <div className="border-t border-gray-200 mb-6" />
            <ul className="space-y-2 text-sm text-[#2D3748] flex-1">
              <Feat>Unlimited pupils</Feat>
              <Feat>Lesson scheduling</Feat>
              <Feat>Lesson notes</Feat>
              <Feat>Card payments (Apple &amp; Google Pay)</Feat>
              <Feat>DSM mini website</Feat>
              <Feat>EveryDriver marketplace listing</Feat>
              <Feat>Email lesson reminders</Feat>
              <Feat>Mobile app (iOS &amp; Android)</Feat>
              <NoFeat>GPS live tracking</NoFeat>
              <NoFeat>EOL wizard</NoFeat>
              <NoFeat>Business reports</NoFeat>
              <NoFeat>Syllabus tracker</NoFeat>
              <NoFeat>Health insurance</NoFeat>
            </ul>
            <Link
              to="/register"
              className="border-2 border-[#1B2B4B] text-[#1B2B4B] hover:bg-[#1B2B4B] hover:text-white font-semibold py-3 px-6 rounded-xl w-full text-center mt-8 block transition-colors no-underline"
            >
              Get started free →
            </Link>
          </div>

          {/* PRO */}
          <div className="border-2 border-[#00B5A5] rounded-2xl p-8 relative flex flex-col">
            <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#00B5A5] text-white text-xs font-bold px-4 py-1 rounded-full">
              Most popular
            </span>
            <h3 className="font-black text-[#1B2B4B] text-2xl mb-2">Pro</h3>
            <div className="mb-1">
              <span className="text-4xl font-black text-[#1B2B4B]">
                {annual ? "£83.25" : "£9.99"}
              </span>
              <span className="text-[#718096] text-sm">{annual ? "/year" : "/month"}</span>
            </div>
            {annual && (
              <span className="inline-block bg-[#E6F7F6] text-[#00B5A5] text-xs font-bold px-2 py-1 rounded-full mb-2 w-fit">
                Save £36.63
              </span>
            )}
            <p className="text-[#718096] text-sm mb-6">Everything in Starter, plus:</p>
            <ul className="space-y-2 text-sm text-[#2D3748] flex-1">
              <Feat>Everything in Starter</Feat>
              <Feat>GPS live tracking + route recording</Feat>
              <Feat>End of lesson (EOL) wizard</Feat>
              <Feat>DVSA syllabus tracker</Feat>
              <Feat>Test readiness score</Feat>
              <Feat>Quotes system</Feat>
              <Feat>Waiting list manager</Feat>
              <Feat>Broadcast messages to pupils</Feat>
              <Feat>MTD earnings + tax estimate</Feat>
              <Feat>Weekly business reports</Feat>
              <Feat>Vehicle health tracker</Feat>
              <Feat>Fuel cost calculator</Feat>
              <Feat>Pricing rules (evening/weekend)</Feat>
              <Feat>Certificate generator</Feat>
              <Feat>Push notifications</Feat>
              <Feat>Priority support</Feat>
            </ul>
            <Link
              to="/register"
              search={{ plan: "pro" }}
              className="bg-[#00B5A5] hover:bg-[#009E8F] text-white font-semibold py-3 px-6 rounded-xl w-full text-center mt-8 block transition-colors no-underline"
            >
              Start 30-day free trial →
            </Link>
          </div>

          {/* PLUS */}
          <div className="border border-gray-200 rounded-2xl p-8 relative flex flex-col">
            <h3 className="font-black text-[#1B2B4B] text-2xl mb-2">Plus</h3>
            <div className="mb-1">
              <span className="text-4xl font-black text-[#1B2B4B]">
                {annual ? "£183.25" : "£21.99"}
              </span>
              <span className="text-[#718096] text-sm">{annual ? "/year" : "/month"}</span>
            </div>
            {annual && (
              <span className="inline-block bg-[#E6F7F6] text-[#00B5A5] text-xs font-bold px-2 py-1 rounded-full mb-2 w-fit">
                Save £80.63
              </span>
            )}
            <p className="text-[#718096] text-sm mb-6">Everything in Pro, plus:</p>
            <ul className="space-y-2 text-sm text-[#2D3748] flex-1">
              <Feat>Everything in Pro</Feat>
              <Feat>Benenden Health membership included</Feat>
              <Feat>24/7 GP helpline</Feat>
              <Feat>Mental health support</Feat>
              <Feat>Hospital treatment service</Feat>
              <Feat>(Benenden retails at £15.50/month — included free)</Feat>
            </ul>
            <p className="text-xs text-[#718096] mt-4">
              Benenden Health subject to eligibility. Terms apply.
            </p>
            <Link
              to="/register"
              search={{ plan: "plus" }}
              className="bg-[#1B2B4B] hover:bg-[#243752] text-white font-semibold py-3 px-6 rounded-xl w-full text-center mt-8 block transition-colors no-underline"
            >
              Start 30-day free trial →
            </Link>
          </div>

          {/* MAX */}
          <div className="bg-[#1B2B4B] rounded-2xl p-8 relative flex flex-col">
            <h3 className="font-black text-white text-2xl mb-2">Max</h3>
            <div className="mb-1">
              <span className="text-4xl font-black text-white">
                {annual ? "£233.25" : "£27.99"}
              </span>
              <span className="text-white/60 text-sm">{annual ? "/year" : "/month"}</span>
            </div>
            {annual && (
              <span className="inline-block bg-[#00B5A5] text-white text-xs font-bold px-2 py-1 rounded-full mb-2 w-fit">
                Save £102.63
              </span>
            )}
            <p className="text-white/60 text-sm mb-6">Everything in Pro, plus:</p>
            <ul className="space-y-2 text-sm text-white flex-1">
              <FeatDark>Everything in Pro</FeatDark>
              <FeatDark>Vitality Health membership included</FeatDark>
              <FeatDark>Full private health insurance</FeatDark>
              <FeatDark>Virtual GP (GP at Hand)</FeatDark>
              <FeatDark>Vitality rewards (Apple Watch, gym, coffee)</FeatDark>
              <FeatDark>Mental health support</FeatDark>
              <FeatDark>(Vitality retails at £21+/month — included free)</FeatDark>
            </ul>
            <p className="text-xs text-white/40 mt-4">
              Vitality Health subject to eligibility and underwriting. Terms apply.
            </p>
            <Link
              to="/register"
              search={{ plan: "max" }}
              className="bg-[#00B5A5] hover:bg-[#009E8F] text-white font-semibold py-3 px-6 rounded-xl w-full text-center mt-8 block transition-colors no-underline"
            >
              Start 30-day free trial →
            </Link>
          </div>
        </div>
      </section>

      {/* HARDWARE */}
      <section className="bg-[#F7FAFC] py-16 px-6">
        <h2 className="text-3xl font-black text-[#1B2B4B] text-center mb-4">
          Add vehicle tracking &amp; dashcams
        </h2>
        <p className="text-[#718096] text-center mb-12">
          Professional GPS tracking and dashcam solutions for your teaching vehicle. Add to any plan.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          <div className="bg-white border border-gray-200 rounded-2xl p-6">
            <MapPin className="text-[#00B5A5] w-8 h-8 mb-4" />
            <h3 className="font-bold text-[#1B2B4B] text-lg mb-1">GPS Tracker</h3>
            <div className="text-2xl font-black text-[#1B2B4B]">£14.99/month</div>
            <p className="text-[#718096] text-xs mb-4">per vehicle · rolling monthly</p>
            <ul className="text-sm text-[#2D3748] space-y-1 mb-6">
              <li>Live location</li>
              <li>Journey history</li>
              <li>Harsh event alerts</li>
              <li>Geotab integration</li>
            </ul>
            <button className="border border-[#00B5A5] text-[#00B5A5] hover:bg-[#00B5A5] hover:text-white rounded-lg px-4 py-2 text-sm font-semibold transition-colors">
              Add to plan →
            </button>
          </div>

          <div className="bg-white border border-gray-200 rounded-2xl p-6">
            <Camera className="text-[#00B5A5] w-8 h-8 mb-4" />
            <h3 className="font-bold text-[#1B2B4B] text-lg mb-1">Front Dashcam</h3>
            <div className="text-2xl font-black text-[#1B2B4B]">£19.99/month</div>
            <p className="text-[#718096] text-xs mb-4">per vehicle · rolling monthly</p>
            <ul className="text-sm text-[#2D3748] space-y-1 mb-6">
              <li>HD front recording</li>
              <li>Cloud storage</li>
              <li>Incident clips</li>
              <li>Speed overlay</li>
            </ul>
            <button className="border border-[#00B5A5] text-[#00B5A5] hover:bg-[#00B5A5] hover:text-white rounded-lg px-4 py-2 text-sm font-semibold transition-colors">
              Add to plan →
            </button>
          </div>

          <div className="bg-[#1B2B4B] rounded-2xl p-6">
            <Camera className="text-[#00B5A5] w-8 h-8 mb-4" />
            <h3 className="font-bold text-white text-lg mb-1">Front &amp; Rear Dashcam</h3>
            <div className="text-2xl font-black text-white">£39.99/month</div>
            <p className="text-white/60 text-xs mb-4">per vehicle · 3-year minimum term</p>
            <ul className="text-sm text-white space-y-1 mb-4">
              <li>HD front + rear recording</li>
              <li>Cloud storage</li>
              <li>Incident clips</li>
              <li>Speed overlay</li>
              <li>Harsh event detection</li>
            </ul>
            <p className="text-white/40 text-xs mb-4">
              Minimum 36-month contract. Early termination fees apply.
            </p>
            <button className="bg-[#00B5A5] hover:bg-[#009E8F] text-white rounded-lg px-4 py-2 text-sm font-semibold transition-colors">
              Add to plan →
            </button>
          </div>
        </div>
      </section>

      {/* COMPARISON TABLE */}
      <section className="bg-white py-16 px-6">
        <h2 className="text-3xl font-black text-[#1B2B4B] text-center mb-12">
          Compare all features
        </h2>
        <div className="max-w-5xl mx-auto overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-gray-200">
                <th className="text-left p-3 text-[#1B2B4B] font-bold">Feature</th>
                {(
                  [
                    ["Starter", "Free"],
                    ["Pro", "£9.99/mo"],
                    ["Plus", "£21.99/mo"],
                    ["Max", "£27.99/mo"],
                  ] as const
                ).map(([name, price]) => (
                  <th key={name} className="p-3 text-center">
                    <div className="font-bold text-[#1B2B4B]">{name}</div>
                    <div className="text-xs text-[#718096] font-normal">{price}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <CategoryRow label="Core" />
              <Row label="Pupils" cells={["Unlimited", "Unlimited", "Unlimited", "Unlimited"]} index={0} />
              <Row label="Scheduling" cells={[true, true, true, true]} index={1} />
              <Row label="Lesson notes" cells={[true, true, true, true]} index={2} />
              <Row label="Mobile app" cells={[true, true, true, true]} index={3} />
              <Row label="Email reminders" cells={[true, true, true, true]} index={4} />
              <Row label="DSM mini website" cells={[true, true, true, true]} index={5} />
              <Row label="EveryDriver listing" cells={[true, true, true, true]} index={6} />

              <CategoryRow label="Payments" />
              <Row label="Card payments" cells={[true, true, true, true]} index={0} />
              <Row label="Apple & Google Pay" cells={[true, true, true, true]} index={1} />
              <Row label="QR code payments" cells={[true, true, true, true]} index={2} />
              <Row label="Booking fee (£1 per payment)" cells={[true, true, true, true]} index={3} />

              <CategoryRow label="Pro features" />
              <Row label="GPS live tracking" cells={[false, true, true, true]} index={0} />
              <Row label="EOL wizard" cells={[false, true, true, true]} index={1} />
              <Row label="Syllabus tracker" cells={[false, true, true, true]} index={2} />
              <Row label="Test readiness score" cells={[false, true, true, true]} index={3} />
              <Row label="Quotes system" cells={[false, true, true, true]} index={4} />
              <Row label="Business reports" cells={[false, true, true, true]} index={5} />
              <Row label="Tax estimate" cells={[false, true, true, true]} index={6} />
              <Row label="Waiting list" cells={[false, true, true, true]} index={7} />
              <Row label="Broadcast messages" cells={[false, true, true, true]} index={8} />
              <Row label="Vehicle health tracker" cells={[false, true, true, true]} index={9} />
              <Row label="Push notifications" cells={[false, true, true, true]} index={10} />
              <Row label="Priority support" cells={[false, true, true, true]} index={11} />

              <CategoryRow label="Health & wellbeing" />
              <Row label="Benenden Health" cells={[false, false, true, false]} index={0} />
              <Row label="Vitality Health" cells={[false, false, false, true]} index={1} />
              <Row label="24/7 GP helpline" cells={[false, false, true, true]} index={2} />
              <Row label="Health rewards" cells={[false, false, false, true]} index={3} />
            </tbody>
          </table>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-[#F7FAFC] py-16 px-6">
        <h2 className="text-3xl font-black text-[#1B2B4B] text-center mb-12">
          Common questions
        </h2>
        <div className="max-w-2xl mx-auto space-y-3">
          {FAQS.map((f, i) => (
            <FaqItem key={i} q={f.q} a={f.a} />
          ))}
        </div>
      </section>

      {/* BOTTOM CTA */}
      <section className="bg-[#00B5A5] py-16 px-6 text-center">
        <h2 className="text-4xl font-black text-white mb-4">
          Ready to take control of your business?
        </h2>
        <p className="text-white/80 mb-8">
          Join thousands of driving instructors already using DSM. Start free today.
        </p>
        <Link
          to="/register"
          className="bg-white text-[#00B5A5] font-black px-10 py-4 rounded-xl text-lg inline-block no-underline hover:bg-gray-50 transition-colors"
        >
          Get started free →
        </Link>
      </section>
    </div>
  );
}

function Feat({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2">
      <CheckCircle2 className="text-[#00B5A5] w-4 h-4 mt-0.5 shrink-0" />
      <span>{children}</span>
    </li>
  );
}

function FeatDark({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2">
      <CheckCircle2 className="text-[#00B5A5] w-4 h-4 mt-0.5 shrink-0" />
      <span>{children}</span>
    </li>
  );
}

function NoFeat({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2 text-[#718096]">
      <X className="text-gray-300 w-4 h-4 mt-0.5 shrink-0" />
      <span>{children}</span>
    </li>
  );
}

function CategoryRow({ label }: { label: string }) {
  return (
    <tr>
      <td
        colSpan={5}
        className="bg-[#1B2B4B] text-white text-xs font-bold uppercase tracking-wider p-3"
      >
        {label}
      </td>
    </tr>
  );
}

function Row({
  label,
  cells,
  index,
}: {
  label: string;
  cells: (boolean | string)[];
  index: number;
}) {
  const bg = index % 2 === 0 ? "bg-white" : "bg-[#F7FAFC]";
  return (
    <tr className={bg}>
      <td className="p-3 text-[#2D3748]">{label}</td>
      {cells.map((c, i) => (
        <td key={i} className="p-3 text-center">
          {typeof c === "string" ? (
            <span className="text-[#2D3748] text-sm">{c}</span>
          ) : c ? (
            <CheckCircle2 className="text-[#00B5A5] w-5 h-5 inline-block" />
          ) : (
            <Minus className="text-gray-300 w-5 h-5 inline-block" />
          )}
        </td>
      ))}
    </tr>
  );
}

const FAQS = [
  {
    q: "Is the Starter plan really free forever?",
    a: "Yes — no credit card required, no time limit. You can use Starter for as long as you like.",
  },
  {
    q: "What is the £1 booking fee?",
    a: "A small £1 fee is charged per payment taken through DSM. You can choose to pass this to your pupil or absorb it yourself. This is how we keep our free plan free.",
  },
  {
    q: "Can I upgrade or downgrade at any time?",
    a: "Yes — upgrade instantly, downgrade at the end of your billing period. No lock-in on monthly plans.",
  },
  {
    q: "How does the health insurance work?",
    a: "When you subscribe to Plus or Max, we add you to our group Benenden or Vitality scheme. You'll receive your membership details within 5 working days.",
  },
  {
    q: "What happens to my health insurance if I cancel?",
    a: "Your health cover runs to the end of your billing month. We'll notify Benenden/Vitality and your cover will end at that point.",
  },
  {
    q: "Is the dashcam contract really 3 years?",
    a: "Yes — the front & rear dashcam requires a minimum 36-month commitment. This covers the hardware cost. The GPS tracker and front-only dashcam are rolling monthly with no contract.",
  },
  {
    q: "Can I import my data from another app?",
    a: "Yes — we offer free data import from Total Drive and other major platforms. Contact us at info@everydriver.co.uk.",
  },
];

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="bg-white border border-gray-200 rounded-xl">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between p-5 text-left"
      >
        <span className="font-semibold text-[#1B2B4B]">{q}</span>
        <ChevronDown
          className={`text-[#718096] w-5 h-5 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && <div className="px-5 pb-5 text-[#2D3748] text-sm leading-relaxed">{a}</div>}
    </div>
  );
}
