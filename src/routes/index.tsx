import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { MarketingNav } from "../components/marketing/MarketingNav";
import { MarketingFooter } from "../components/marketing/MarketingFooter";
import {
  Section,
  Eyebrow,
  H1,
  H2,
  Lead,
  PrimaryBtn,
  SecondaryBtn,
  FeatureCard,
} from "../components/marketing/ui";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "DSM — The all-in-one app for UK driving instructors" },
      {
        name: "description",
        content:
          "DSM by EveryDriver helps UK driving instructors manage pupils, lessons, payments, mileage and end-of-lesson notes — all in one place.",
      },
      { property: "og:title", content: "DSM — Driving School Manager" },
      {
        property: "og:description",
        content:
          "Pupils, scheduling, payments and end-of-lesson notes for UK driving instructors.",
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
    <div style={{ background: "#fff", color: "#0F172A", minHeight: "100vh", fontFamily: "Poppins, system-ui, sans-serif" }}>
      <MarketingNav />

      {/* Hero */}
      <Section padY={88}>
        <div style={{ display: "grid", gridTemplateColumns: "1.1fr 1fr", gap: 48, alignItems: "center" }} className="dsm-hero-grid">
          <div>
            <Eyebrow>Built for UK driving instructors</Eyebrow>
            <H1>Run your driving school from your pocket.</H1>
            <Lead>
              Pupils, lessons, payments, mileage and end-of-lesson notes — DSM by EveryDriver brings it all
              together in one calm, fast app designed for instructors on the move.
            </Lead>
            <div style={{ display: "flex", gap: 12, marginTop: 28, flexWrap: "wrap" }}>
              <PrimaryBtn to="/register">Start free trial</PrimaryBtn>
              <SecondaryBtn to="/how-it-works">See how it works</SecondaryBtn>
            </div>
            <p style={{ marginTop: 16, fontSize: 13, color: "#64748B" }}>
              No card required • Cancel anytime • Designed in Hampshire
            </p>
          </div>

          <div
            style={{
              aspectRatio: "4/5",
              borderRadius: 28,
              background:
                "linear-gradient(160deg,#0F2044 0%, #1E40AF 60%, #3B82F6 100%)",
              boxShadow: "0 30px 80px -20px rgba(15,32,68,0.45)",
              position: "relative",
              overflow: "hidden",
              padding: 24,
              color: "#fff",
            }}
          >
            <div style={{ fontSize: 12, opacity: 0.7, letterSpacing: 0.5 }}>TODAY • TUE 25 JUN</div>
            <div style={{ marginTop: 8, fontSize: 22, fontWeight: 700 }}>4 lessons · £148.00</div>
            <div style={{ marginTop: 24, display: "flex", flexDirection: "column", gap: 10 }}>
              {[
                { t: "09:00", n: "Sarah K · Manual", s: "Confirmed" },
                { t: "11:00", n: "Tom B · Mock test", s: "Confirmed" },
                { t: "14:00", n: "Aisha M · Lesson 12", s: "Unpaid" },
                { t: "16:30", n: "Daniel R · Pickup", s: "Confirmed" },
              ].map((l) => (
                <div
                  key={l.t}
                  style={{
                    background: "rgba(255,255,255,0.08)",
                    border: "1px solid rgba(255,255,255,0.12)",
                    borderRadius: 12,
                    padding: "10px 12px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div>
                    <div style={{ fontSize: 13, opacity: 0.7 }}>{l.t}</div>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>{l.n}</div>
                  </div>
                  <span
                    style={{
                      fontSize: 11,
                      padding: "3px 8px",
                      borderRadius: 999,
                      background: l.s === "Unpaid" ? "#F59E0B" : "rgba(255,255,255,0.18)",
                      color: l.s === "Unpaid" ? "#0B1530" : "#fff",
                      fontWeight: 600,
                    }}
                  >
                    {l.s}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <style>{`
          @media (max-width: 880px) {
            .dsm-hero-grid { grid-template-columns: 1fr !important; }
          }
        `}</style>
      </Section>

      {/* Features grid */}
      <Section bg="#F8FAFC" padY={72}>
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <H2>Everything you need. Nothing you don't.</H2>
          <p style={{ color: "#64748B", marginTop: 12, fontSize: 16 }}>
            Built around the actual day-to-day of a driving instructor.
          </p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16 }} className="dsm-features-grid">
          <FeatureCard icon="📅" title="Schedule" body="Google Calendar-style daily view, tap to add lessons, gaps surfaced automatically." />
          <FeatureCard icon="👥" title="Pupils" body="Profiles, progress, balances, test dates and full lesson history." />
          <FeatureCard icon="💳" title="Take payment" body="Card, Apple Pay and Google Pay via Ryft — or generate a QR for the pupil's phone." />
          <FeatureCard icon="📋" title="End-of-lesson" body="Quick EOL notes that build the pupil's progress record." />
          <FeatureCard icon="🚗" title="Mileage & fuel" body="HMRC-friendly logs you'll thank yourself for at tax time." />
          <FeatureCard icon="📨" title="Enquiries" body="Capture new leads, accept/decline, convert to pupils in one tap." />
        </div>
        <style>{`
          @media (max-width: 880px) { .dsm-features-grid { grid-template-columns: 1fr 1fr !important; } }
          @media (max-width: 560px) { .dsm-features-grid { grid-template-columns: 1fr !important; } }
        `}</style>
      </Section>

      {/* CTA strip */}
      <Section padY={64}>
        <div
          style={{
            background: "linear-gradient(135deg,#0F2044,#1E40AF)",
            color: "#fff",
            borderRadius: 24,
            padding: "44px 32px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 24,
            flexWrap: "wrap",
          }}
        >
          <div>
            <h3 style={{ margin: 0, fontSize: 26, fontWeight: 700 }}>Try DSM free for 14 days.</h3>
            <p style={{ margin: "8px 0 0", opacity: 0.8, fontSize: 15 }}>
              Full access. No card required. Built by instructors, for instructors.
            </p>
          </div>
          <PrimaryBtn to="/register">Start free trial →</PrimaryBtn>
        </div>
      </Section>

      <MarketingFooter />
    </div>
  );
}
