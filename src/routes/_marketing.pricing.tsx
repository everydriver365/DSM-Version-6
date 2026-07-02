import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { CheckCircle2, Minus, MapPin, Camera, ChevronDown } from "lucide-react";

export const Route = createFileRoute("/_marketing/pricing")({
  head: () => ({
    meta: [
      { title: "Pricing — Driving School Manager" },
      {
        name: "description",
        content:
          "Simple, transparent pricing for UK driving instructors. Everything you need to run your driving school — free. Upgrade for health insurance and your own branded website.",
      },
      { property: "og:title", content: "Pricing — Driving School Manager" },
      {
        property: "og:description",
        content:
          "Everything you need to run your driving school — free. Upgrade for health insurance and your own branded website.",
      },
    ],
  }),
  component: PricingPage,
});

function PricingPage() {
  return (
    <div className="bg-white">
      {/* HERO */}
      <section className="bg-[#F7FAFC] py-16 px-6 text-center">
        <span className="bg-[#E6F7F6] text-[#00B5A5] text-xs font-semibold px-3 py-1 rounded-full mb-4 inline-block">
          No confusion. No surprises.
        </span>
        <h1 className="text-4xl md:text-5xl font-black text-[#133155] mb-4">
          Simple, transparent pricing
        </h1>
        <p className="text-[#718096] text-lg mb-8 max-w-2xl mx-auto">
          Everything you need to run your driving school — free. Upgrade for health insurance and your own branded website.
        </p>
      </section>

      {/* PLAN CARDS */}
      <section className="bg-white">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto px-6 pb-16">
          {/* STARTER */}
          <div className="border border-gray-200 rounded-2xl p-8 bg-white flex flex-col">
            <h3 className="font-black text-[#133155] text-2xl mb-2">Starter</h3>
            <div className="mb-1">
              <span className="text-4xl font-black text-[#133155]">Free</span>
              <span className="text-[#718096] text-sm">/forever</span>
            </div>
            <p className="text-[#718096] text-sm mb-6">Everything you need to get started</p>
            <ul className="space-y-2 text-sm text-[#2D3748] flex-1">
              <Feat>Unlimited pupils</Feat>
              <Feat>Smart scheduling &amp; diary</Feat>
              <Feat>Lesson notes</Feat>
              <Feat>Card payments (Apple &amp; Google Pay)</Feat>
              <Feat>GPS live tracking</Feat>
              <Feat>End of lesson wizard</Feat>
              <Feat>DVSA syllabus tracker</Feat>
              <Feat>Quotes system</Feat>
              <Feat>Business reports &amp; tax estimate</Feat>
              <Feat>Vehicle health tracker</Feat>
              <Feat>Fill My Slots — auto-offer free gaps</Feat>
              <Feat>Free mini website</Feat>
              <Feat>EveryDriver marketplace listing</Feat>
              <Feat>Mobile app (iOS &amp; Android)</Feat>
            </ul>
            <Link
              to="/register"
              className="border-2 border-[#133155] text-[#133155] hover:bg-[#133155] hover:text-white font-semibold py-3 px-6 rounded-xl w-full text-center mt-8 block transition-colors no-underline"
            >
              Get started free →
            </Link>
          </div>

          {/* PLUS */}
          <div className="border-2 border-[#00B5A5] rounded-2xl p-8 bg-white relative flex flex-col">
            <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#00B5A5] text-white text-xs font-bold px-4 py-1 rounded-full">
              Most popular
            </span>
            <h3 className="font-black text-[#133155] text-2xl mb-2">Plus</h3>
            <div className="mb-1">
              <span className="text-4xl font-black text-[#133155]">£24.99</span>
              <span className="text-[#718096] text-sm">/month</span>
            </div>
            <p className="text-[#718096] text-sm mb-6">Everything in Starter, plus:</p>
            <ul className="space-y-2 text-sm text-[#2D3748] flex-1">
              <Feat>Everything in Starter</Feat>
              <Feat>Benenden Health membership</Feat>
              <Feat>24/7 GP helpline</Feat>
              <Feat>Mental health support</Feat>
              <Feat>Hospital treatment service</Feat>
              <Feat>Custom domain for your website</Feat>
              <Feat>Remove EveryDriver branding</Feat>
              <Feat>Priority support</Feat>
            </ul>
            <Link
              to="/register"
              className="bg-[#00B5A5] hover:bg-[#009E8F] text-white font-semibold py-3 px-6 rounded-xl w-full text-center mt-8 block transition-colors no-underline"
            >
              Start free trial →
            </Link>
          </div>

          {/* MAX */}
          <div className="bg-[#133155] rounded-2xl p-8 relative flex flex-col">
            <h3 className="font-black text-white text-2xl mb-2">Max</h3>
            <div className="mb-1">
              <span className="text-4xl font-black text-white">£29.99</span>
              <span className="text-white/60 text-sm">/month</span>
            </div>
            <p className="text-white/60 text-sm mb-6">Everything in Starter, plus:</p>
            <ul className="space-y-2 text-sm text-white flex-1">
              <FeatDark>Everything in Starter</FeatDark>
              <FeatDark>Vitality Health membership</FeatDark>
              <FeatDark>Full private health insurance</FeatDark>
              <FeatDark>Virtual GP (GP at Hand)</FeatDark>
              <FeatDark>Vitality rewards (Apple Watch, gym, coffee)</FeatDark>
              <FeatDark>Custom domain for your website</FeatDark>
              <FeatDark>Remove EveryDriver branding</FeatDark>
              <FeatDark>Priority support</FeatDark>
            </ul>
            <Link
              to="/register"
              className="bg-[#00B5A5] hover:bg-[#009E8F] text-white font-semibold py-3 px-6 rounded-xl w-full text-center mt-8 block transition-colors no-underline"
            >
              Start free trial →
            </Link>
          </div>
        </div>
      </section>

      {/* ADD-ONS */}
      <section className="bg-white py-16 px-6">
        <h2 className="text-3xl font-black text-[#133155] text-center mb-4">
          Add vehicle tracking &amp; dashcams
        </h2>
        <p className="text-[#718096] text-center mb-12">
          Available on any plan. No contract on GPS, 36-month term on dashcams.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          <div className="bg-white border border-gray-200 rounded-2xl p-6">
            <MapPin className="text-[#00B5A5] w-8 h-8 mb-4" />
            <h3 className="font-bold text-[#133155] text-lg mb-1">GPS Tracker</h3>
            <div className="text-2xl font-black text-[#133155]">£14.99/month</div>
            <p className="text-[#718096] text-xs mb-4">per vehicle · rolling monthly</p>
            <ul className="text-sm text-[#2D3748] space-y-1">
              <li>Live location</li>
              <li>Journey history</li>
              <li>Harsh event alerts</li>
              <li>Geotab integration</li>
            </ul>
          </div>

          <div className="bg-white border border-gray-200 rounded-2xl p-6">
            <Camera className="text-[#00B5A5] w-8 h-8 mb-4" />
            <h3 className="font-bold text-[#133155] text-lg mb-1">Front Dashcam</h3>
            <div className="text-2xl font-black text-[#133155]">£19.99/month</div>
            <p className="text-[#718096] text-xs mb-4">per vehicle · rolling monthly</p>
            <ul className="text-sm text-[#2D3748] space-y-1">
              <li>HD front recording</li>
              <li>Cloud storage</li>
              <li>Incident clips</li>
              <li>Speed overlay</li>
            </ul>
          </div>

          <div className="bg-[#133155] rounded-2xl p-6">
            <Camera className="text-[#00B5A5] w-8 h-8 mb-4" />
            <h3 className="font-bold text-white text-lg mb-1">Front &amp; Rear Dashcam</h3>
            <div className="text-2xl font-black text-white">£39.99/month</div>
            <p className="text-white/60 text-xs mb-4">per vehicle · 36-month minimum</p>
            <ul className="text-sm text-white space-y-1">
              <li>HD front + rear recording</li>
              <li>Cloud storage</li>
              <li>Incident clips</li>
              <li>Harsh event detection</li>
            </ul>
          </div>
        </div>
      </section>

      {/* COMPARISON TABLE */}
      <section className="bg-[#F7FAFC] py-16 px-6">
        <h2 className="text-3xl font-black text-[#133155] text-center mb-12">
          Compare plans
        </h2>
        <div className="max-w-4xl mx-auto overflow-x-auto">
          <table className="w-full text-sm bg-white rounded-2xl overflow-hidden">
            <thead>
              <tr className="border-b-2 border-gray-200">
                <th className="text-left p-4 text-[#133155] font-bold">Feature</th>
                <th className="p-4 text-center font-bold text-[#133155]">Starter</th>
                <th className="p-4 text-center font-bold text-[#133155]">Plus</th>
                <th className="p-4 text-center font-bold text-[#133155]">Max</th>
              </tr>
            </thead>
            <tbody>
              <Row label="Unlimited pupils" cells={[true, true, true]} index={0} />
              <Row label="GPS tracking" cells={[true, true, true]} index={1} />
              <Row label="EOL wizard" cells={[true, true, true]} index={2} />
              <Row label="Syllabus tracker" cells={[true, true, true]} index={3} />
              <Row label="Business reports" cells={[true, true, true]} index={4} />
              <Row label="Mini website" cells={[true, true, true]} index={5} />
              <Row label="EveryDriver listing" cells={[true, true, true]} index={6} />
              <Row label="Custom domain" cells={[false, true, true]} index={7} />
              <Row label="Benenden Health" cells={[false, true, false]} index={8} />
              <Row label="Vitality Health" cells={[false, false, true]} index={9} />
              <Row label="24/7 GP helpline" cells={[false, true, true]} index={10} />
              <Row label="Priority support" cells={[false, true, true]} index={11} />
            </tbody>
          </table>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-white py-16 px-6">
        <h2 className="text-3xl font-black text-[#133155] text-center mb-12">
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

function Row({
  label,
  cells,
  index,
}: {
  label: string;
  cells: boolean[];
  index: number;
}) {
  const bg = index % 2 === 0 ? "bg-white" : "bg-[#F7FAFC]";
  return (
    <tr className={bg}>
      <td className="p-4 text-[#2D3748]">{label}</td>
      {cells.map((c, i) => (
        <td key={i} className="p-4 text-center">
          {c ? (
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
    a: "Yes — no credit card required, no time limit. You get unlimited pupils, GPS tracking, the syllabus tracker, business reports and your own mini website at no cost.",
  },
  {
    q: "What's the catch with the free plan?",
    a: "There isn't one. Starter is fully featured. Plus and Max add health insurance (Benenden or Vitality), a custom domain on your website and removal of EveryDriver branding.",
  },
  {
    q: "Can I upgrade or downgrade at any time?",
    a: "Yes — upgrade instantly, downgrade at the end of your billing month. No lock-in.",
  },
  {
    q: "How does the health insurance work?",
    a: "When you subscribe to Plus or Max, we add you to our group Benenden or Vitality scheme. You'll receive your membership details within 5 working days.",
  },
  {
    q: "What happens to my health insurance if I cancel?",
    a: "Your cover runs to the end of your billing month. We'll notify Benenden/Vitality and your cover ends at that point.",
  },
  {
    q: "Is the dashcam contract really 36 months?",
    a: "Yes — the front & rear dashcam requires a 36-month commitment to cover the hardware cost. The GPS tracker and front-only dashcam are rolling monthly with no contract.",
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
        <span className="font-semibold text-[#133155]">{q}</span>
        <ChevronDown
          className={`text-[#718096] w-5 h-5 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && <div className="px-5 pb-5 text-[#2D3748] text-sm leading-relaxed">{a}</div>}
    </div>
  );
}
