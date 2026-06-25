import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

const links = [
  { to: "/features", label: "Features" },
  { to: "/pricing", label: "Pricing" },
  { to: "/how-it-works", label: "How it works" },
  { to: "/about", label: "About" },
  { to: "/contact", label: "Contact" },
] as const;

export function MarketingNav() {
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    supabase.auth.getSession().then(({ data }) => {
      if (!cancelled) setSignedIn(!!data.session);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setSignedIn(!!session);
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        background: "rgba(255,255,255,0.92)",
        backdropFilter: "saturate(180%) blur(12px)",
        borderBottom: "1px solid #E6E8EE",
      }}
    >
      <div
        style={{
          maxWidth: 1120,
          margin: "0 auto",
          padding: "14px 20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
        }}
      >
        <Link to="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: "linear-gradient(135deg,#0F2044,#1E40AF)",
              color: "#fff",
              display: "grid",
              placeItems: "center",
              fontWeight: 800,
              fontSize: 14,
              letterSpacing: 0.5,
            }}
          >
            D
          </div>
          <span style={{ fontWeight: 700, color: "#0F172A", fontSize: 17 }}>DSM</span>
          <span style={{ color: "#64748B", fontSize: 12, marginLeft: 2 }}>by EveryDriver</span>
        </Link>

        <nav style={{ display: "flex", gap: 22, alignItems: "center" }} className="dsm-mkt-nav">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              style={{ color: "#334155", textDecoration: "none", fontSize: 14, fontWeight: 500 }}
              activeProps={{ style: { color: "#0F2044", fontWeight: 700 } }}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {signedIn ? (
            <Link
              to="/home"
              style={{
                padding: "9px 16px",
                borderRadius: 10,
                background: "#0F2044",
                color: "#fff",
                fontSize: 14,
                fontWeight: 600,
                textDecoration: "none",
              }}
            >
              Back to DSM →
            </Link>
          ) : (
            <>
              <Link
                to="/login"
                style={{ color: "#0F2044", fontSize: 14, fontWeight: 600, textDecoration: "none" }}
              >
                Log in
              </Link>
              <Link
                to="/register"
                style={{
                  padding: "9px 16px",
                  borderRadius: 10,
                  background: "#0F2044",
                  color: "#fff",
                  fontSize: 14,
                  fontWeight: 600,
                  textDecoration: "none",
                }}
              >
                Start free trial
              </Link>
            </>
          )}
          <button
            onClick={() => setOpen((v) => !v)}
            aria-label="Menu"
            className="dsm-mkt-burger"
            style={{
              display: "none",
              width: 36,
              height: 36,
              borderRadius: 8,
              border: "1px solid #E2E8F0",
              background: "#fff",
              fontSize: 18,
              cursor: "pointer",
            }}
          >
            ☰
          </button>
        </div>
      </div>

      {open && (
        <div
          className="dsm-mkt-mobile"
          style={{
            borderTop: "1px solid #E6E8EE",
            padding: "8px 16px 14px",
            display: "flex",
            flexDirection: "column",
            gap: 4,
            background: "#fff",
          }}
        >
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              onClick={() => setOpen(false)}
              style={{
                padding: "10px 8px",
                color: "#0F172A",
                textDecoration: "none",
                fontSize: 15,
                fontWeight: 500,
                borderRadius: 8,
              }}
            >
              {l.label}
            </Link>
          ))}
        </div>
      )}

      <style>{`
        @media (max-width: 820px) {
          .dsm-mkt-nav { display: none !important; }
          .dsm-mkt-burger { display: inline-flex !important; align-items:center; justify-content:center; }
        }
      `}</style>
    </header>
  );
}
