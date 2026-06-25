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
  Check,
} from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { MarketingNav } from "../components/marketing/MarketingNav";
import { MarketingFooter } from "../components/marketing/MarketingFooter";

const NAVY = "#0F2044";
const BLUE = "#1A52A0";
const FONT = "Poppins, system-ui, sans-serif";

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

  if (!checked) return <div style={{ minHeight: "100vh", background: "#fff" }} />;

  return (
    <div style={{ background: "#fff", color: NAVY, fontFamily: FONT, minHeight: "100vh" }}>
      <MarketingNav />
      <Hero />
      <FeaturesStrip />
      <HowItWorks />
      <Testimonials />
      <PricingTeaser />
      <BottomCTA />
      <MarketingFooter />

      <style>{`
        .dsm-h1 { font-size: 52px; }
        .dsm-h2 { font-size: 36px; }
        @media (max-width: 720px) {
          .dsm-h1 { font-size: 32px !important; }
          .dsm-h2 { font-size: 28px !important; }
          .dsm-phone-mock { display: none !important; }
        }
      `}</style>
    </div>
  );
}

/* ---------- Hero ---------- */
function Hero() {
  return (
    <section
      style={{
        minHeight: "100vh",
        background: `linear-gradient(180deg, ${NAVY} 0%, ${BLUE} 100%)`,
        color: "#fff",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "80px 16px 40px",
        textAlign: "center",
        fontFamily: FONT,
      }}
    >
      <div
        style={{
          display: "inline-block",
          border: "1px solid rgba(255,255,255,0.3)",
          borderRadius: 999,
          padding: "4px 12px",
          fontSize: 12,
          color: "rgba(255,255,255,0.8)",
          marginBottom: 16,
        }}
      >
        DSM by EveryDriver
      </div>

      <h1
        className="dsm-h1"
        style={{
          fontWeight: 800,
          lineHeight: 1.1,
          maxWidth: 700,
          margin: "0 0 24px",
          letterSpacing: -0.5,
        }}
      >
        The driving instructor app that works as hard as you do
      </h1>

      <p
        style={{
          fontSize: 18,
          lineHeight: 1.55,
          color: "rgba(255,255,255,0.8)",
          maxWidth: 560,
          margin: "0 0 40px",
        }}
      >
        Schedule lessons, track payments, manage pupils and grow your business — all from your
        phone. Join 1,200+ instructors who've made the switch.
      </p>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
        <Link
          to="/register"
          style={{
            height: 48,
            padding: "0 32px",
            background: "#fff",
            color: NAVY,
            borderRadius: 10,
            fontWeight: 700,
            fontSize: 16,
            textDecoration: "none",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          Start free today →
        </Link>
        <Link
          to="/features"
          style={{
            height: 48,
            padding: "0 24px",
            border: "1.5px solid rgba(255,255,255,0.4)",
            color: "#fff",
            borderRadius: 10,
            fontSize: 16,
            textDecoration: "none",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          See features
        </Link>
      </div>

      <div
        style={{
          marginTop: 32,
          display: "flex",
          gap: 24,
          flexWrap: "wrap",
          justifyContent: "center",
          color: "rgba(255,255,255,0.6)",
          fontSize: 13,
        }}
      >
        <span>✓ Free forever on basic plan</span>
        <span>✓ No card required</span>
        <span>✓ Used by 1,200+ instructors</span>
      </div>

      {/* Phone mockup placeholder */}
      <div
        className="dsm-phone-mock"
        style={{
          marginTop: 60,
          width: 280,
          height: 560,
          background: "rgba(255,255,255,0.1)",
          border: "1.5px solid rgba(255,255,255,0.2)",
          borderRadius: 32,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "rgba(255,255,255,0.4)",
          fontSize: 14,
        }}
      >
        App preview
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
    <section style={{ background: "#fff", padding: "80px 16px", textAlign: "center", fontFamily: FONT }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <h2 className="dsm-h2" style={{ fontWeight: 700, color: NAVY, margin: "0 0 12px" }}>
          Everything you need to run your driving school
        </h2>
        <p style={{ color: "#6B7280", fontSize: 16, margin: "0 0 48px" }}>
          Built by a driving instructor, for driving instructors.
        </p>

        <div
          className="dsm-fstrip"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(6, 1fr)",
            gap: 24,
          }}
        >
          {features.map((f) => {
            const Icon = f.icon;
            return (
              <div
                key={f.title}
                className="dsm-fcard"
                style={{
                  border: "0.5px solid #E2E6ED",
                  borderRadius: 16,
                  padding: 24,
                  background: "#fff",
                  textAlign: "center",
                  transition: "box-shadow 0.2s ease",
                }}
              >
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 999,
                    background: "#EEF4FB",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    margin: "0 auto",
                  }}
                >
                  <Icon size={24} color={BLUE} strokeWidth={2} />
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, color: NAVY, marginTop: 12 }}>
                  {f.title}
                </div>
                <div style={{ fontSize: 12, color: "#6B7280", marginTop: 6, lineHeight: 1.5 }}>
                  {f.desc}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <style>{`
        .dsm-fcard:hover { box-shadow: 0 8px 24px -8px rgba(15,32,68,0.15); }
        @media (max-width: 880px) {
          .dsm-fstrip { grid-template-columns: repeat(3, 1fr) !important; }
        }
        @media (max-width: 480px) {
          .dsm-fstrip { grid-template-columns: repeat(2, 1fr) !important; }
        }
      `}</style>
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
    <section style={{ background: "#F8F9FB", padding: "80px 16px", fontFamily: FONT }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <h2
          className="dsm-h2"
          style={{ fontWeight: 700, color: NAVY, textAlign: "center", margin: "0 0 48px" }}
        >
          Up and running in minutes
        </h2>

        <div
          className="dsm-steps"
          style={{
            display: "flex",
            flexDirection: "row",
            gap: 32,
            justifyContent: "space-between",
            alignItems: "flex-start",
            position: "relative",
          }}
        >
          {/* dashed connector */}
          <div
            className="dsm-steps-line"
            style={{
              position: "absolute",
              top: 20,
              left: "16.66%",
              right: "16.66%",
              height: 0,
              borderTop: "2px dashed #E2E6ED",
              zIndex: 0,
            }}
          />

          {steps.map((s) => (
            <div
              key={s.n}
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                textAlign: "center",
                position: "relative",
                zIndex: 1,
              }}
            >
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 999,
                  background: NAVY,
                  color: "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 700,
                  fontSize: 16,
                  marginBottom: 16,
                }}
              >
                {s.n}
              </div>
              <div style={{ fontSize: 18, fontWeight: 700, color: NAVY, marginBottom: 8 }}>
                {s.title}
              </div>
              <div style={{ fontSize: 14, color: "#6B7280", maxWidth: 240, lineHeight: 1.55 }}>
                {s.desc}
              </div>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        @media (max-width: 720px) {
          .dsm-steps { flex-direction: column !important; gap: 32px !important; }
          .dsm-steps-line { display: none !important; }
        }
      `}</style>
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
    <section style={{ background: "#fff", padding: "80px 16px", fontFamily: FONT }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <h2
          className="dsm-h2"
          style={{ fontWeight: 700, color: NAVY, textAlign: "center", margin: "0 0 8px" }}
        >
          Loved by instructors
        </h2>
        <p style={{ color: "#6B7280", textAlign: "center", margin: "0 0 48px", fontSize: 16 }}>
          Real feedback from real ADIs
        </p>

        <div
          className="dsm-test-grid"
          style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 24 }}
        >
          {items.map((t) => (
            <div
              key={t.name}
              style={{
                border: "0.5px solid #E2E6ED",
                borderRadius: 16,
                padding: 24,
                background: "#fff",
              }}
            >
              <div style={{ display: "flex", gap: 2, marginBottom: 12 }}>
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} size={16} fill="#F59E0B" color="#F59E0B" />
                ))}
              </div>
              <p
                style={{
                  fontSize: 14,
                  color: "#374151",
                  fontStyle: "italic",
                  margin: "0 0 16px",
                  lineHeight: 1.6,
                }}
              >
                "{t.quote}"
              </p>
              <div style={{ fontSize: 14, fontWeight: 700, color: NAVY }}>{t.name}</div>
              <div style={{ fontSize: 12, color: "#6B7280" }}>{t.role}</div>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        @media (max-width: 880px) {
          .dsm-test-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
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
    <section style={{ background: NAVY, padding: "80px 16px", color: "#fff", fontFamily: FONT }}>
      <div style={{ maxWidth: 1100, margin: "0 auto", textAlign: "center" }}>
        <h2 className="dsm-h2" style={{ fontWeight: 700, margin: "0 0 12px" }}>
          Simple, transparent pricing
        </h2>
        <p style={{ color: "rgba(255,255,255,0.7)", margin: "0 0 48px", fontSize: 16 }}>
          No tie-in. No hidden fees. Cancel anytime.
        </p>

        <div
          className="dsm-pricing-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 16,
            maxWidth: 680,
            margin: "0 auto",
            textAlign: "left",
          }}
        >
          {/* FREE */}
          <div
            style={{
              background: "rgba(255,255,255,0.1)",
              border: "1px solid rgba(255,255,255,0.2)",
              borderRadius: 16,
              padding: 32,
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
              <div style={{ fontSize: 32, fontWeight: 700, color: "#fff" }}>Free</div>
              <span
                style={{
                  border: "1px solid rgba(255,255,255,0.3)",
                  borderRadius: 999,
                  padding: "3px 10px",
                  fontSize: 11,
                  color: "rgba(255,255,255,0.85)",
                }}
              >
                forever
              </span>
            </div>
            <div style={{ fontSize: 14, color: "rgba(255,255,255,0.8)", marginBottom: 20 }}>
              £0 / month
            </div>
            <ul style={{ listStyle: "none", padding: 0, margin: "0 0 24px", display: "flex", flexDirection: "column", gap: 10, flex: 1 }}>
              {freeFeatures.map((f) => (
                <li key={f} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14, color: "#fff" }}>
                  <Check size={16} color="#fff" strokeWidth={2.5} />
                  {f}
                </li>
              ))}
            </ul>
            <Link
              to="/register"
              style={{
                width: "100%",
                height: 44,
                background: "#fff",
                color: NAVY,
                borderRadius: 10,
                fontWeight: 700,
                fontSize: 14,
                textDecoration: "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              Start free →
            </Link>
          </div>

          {/* PRO */}
          <div
            style={{
              background: "#fff",
              borderRadius: 16,
              padding: 32,
              position: "relative",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <span
              style={{
                position: "absolute",
                top: 16,
                right: 16,
                background: "#F59E0B",
                color: "#0B1530",
                fontSize: 11,
                fontWeight: 700,
                padding: "4px 10px",
                borderRadius: 999,
              }}
            >
              Most popular
            </span>
            <div style={{ fontSize: 32, fontWeight: 700, color: NAVY, marginBottom: 4 }}>Pro</div>
            <div style={{ fontSize: 14, color: NAVY, opacity: 0.85, marginBottom: 20 }}>
              £9.99 / month
            </div>
            <ul style={{ listStyle: "none", padding: 0, margin: "0 0 24px", display: "flex", flexDirection: "column", gap: 10, flex: 1 }}>
              {proFeatures.map((f) => (
                <li key={f} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14, color: "#1F2937" }}>
                  <Check size={16} color={BLUE} strokeWidth={2.5} />
                  {f}
                </li>
              ))}
            </ul>
            <Link
              to="/register"
              style={{
                width: "100%",
                height: 44,
                background: BLUE,
                color: "#fff",
                borderRadius: 10,
                fontWeight: 700,
                fontSize: 14,
                textDecoration: "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              Start Pro free for 30 days →
            </Link>
          </div>
        </div>

        <div style={{ marginTop: 24 }}>
          <Link
            to="/pricing"
            style={{
              color: "rgba(255,255,255,0.7)",
              fontSize: 14,
              textDecoration: "none",
            }}
          >
            See full pricing breakdown →
          </Link>
        </div>
      </div>

      <style>{`
        @media (max-width: 640px) {
          .dsm-pricing-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </section>
  );
}

/* ---------- Bottom CTA ---------- */
function BottomCTA() {
  return (
    <section
      style={{
        background: BLUE,
        padding: "80px 16px",
        color: "#fff",
        textAlign: "center",
        fontFamily: FONT,
      }}
    >
      <div style={{ maxWidth: 800, margin: "0 auto" }}>
        <h2 className="dsm-h2" style={{ fontWeight: 700, margin: 0 }}>
          Ready to take control of your business?
        </h2>
        <p style={{ color: "rgba(255,255,255,0.8)", fontSize: 16, marginTop: 12, marginBottom: 32 }}>
          Join 1,200+ driving instructors already using DSM.
        </p>
        <Link
          to="/register"
          style={{
            height: 52,
            padding: "0 40px",
            background: "#fff",
            color: NAVY,
            borderRadius: 10,
            fontWeight: 700,
            fontSize: 18,
            textDecoration: "none",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          Start free today →
        </Link>
      </div>
    </section>
  );
}
