import { Link, useRouterState } from "@tanstack/react-router";
import { useState } from "react";

const NAVY = "#0F2044";
const FONT = "Poppins, system-ui, sans-serif";

const links = [
  { to: "/features", label: "Features" },
  { to: "/pricing", label: "Pricing" },
  { to: "/how-it-works", label: "How it works" },
  { to: "/about", label: "About" },
  { to: "/contact", label: "Contact" },
] as const;

export function MarketingNav() {
  const [open, setOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        background: NAVY,
        width: "100%",
        fontFamily: FONT,
      }}
    >
      <div
        style={{
          maxWidth: 1280,
          margin: "0 auto",
          height: 64,
          padding: "0 16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
        }}
      >
        {/* Left: wordmark */}
        <Link
          to="/"
          style={{
            display: "flex",
            alignItems: "baseline",
            gap: 8,
            textDecoration: "none",
          }}
        >
          <span style={{ color: "#fff", fontSize: 20, fontWeight: 700, letterSpacing: 0.2 }}>
            DSM
          </span>
          <span style={{ color: "rgba(255,255,255,0.6)", fontSize: 14 }}>
            by EveryDriver
          </span>
        </Link>

        {/* Centre: desktop nav */}
        <nav
          className="dsm-mkt-nav"
          style={{ display: "flex", alignItems: "center", gap: 24 }}
        >
          {links.map((l) => {
            const active = pathname === l.to;
            return (
              <Link
                key={l.to}
                to={l.to}
                style={{
                  color: active ? "#fff" : "rgba(255,255,255,0.8)",
                  textDecoration: "none",
                  fontSize: 14,
                  fontWeight: active ? 600 : 500,
                  fontFamily: FONT,
                }}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>

        {/* Right: CTAs */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }} className="dsm-mkt-cta">
          <Link
            to="/login"
            style={{
              padding: "8px 14px",
              border: "1px solid rgba(255,255,255,0.4)",
              borderRadius: 8,
              color: "#fff",
              fontSize: 14,
              fontWeight: 500,
              textDecoration: "none",
              fontFamily: FONT,
            }}
          >
            Log in
          </Link>
          <Link
            to="/register"
            style={{
              padding: "8px 14px",
              borderRadius: 8,
              background: "#fff",
              color: NAVY,
              fontSize: 14,
              fontWeight: 600,
              textDecoration: "none",
              fontFamily: FONT,
            }}
          >
            Get started free
          </Link>
        </div>

        {/* Hamburger */}
        <button
          onClick={() => setOpen((v) => !v)}
          aria-label="Menu"
          className="dsm-mkt-burger"
          style={{
            display: "none",
            width: 40,
            height: 40,
            borderRadius: 8,
            border: "1px solid rgba(255,255,255,0.3)",
            background: "transparent",
            color: "#fff",
            fontSize: 20,
            cursor: "pointer",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          ☰
        </button>
      </div>

      {/* Mobile dropdown */}
      {open && (
        <div
          className="dsm-mkt-mobile"
          style={{
            background: NAVY,
            borderTop: "1px solid rgba(255,255,255,0.1)",
            padding: "12px 16px 20px",
            display: "flex",
            flexDirection: "column",
            gap: 4,
            fontFamily: FONT,
          }}
        >
          {links.map((l) => {
            const active = pathname === l.to;
            return (
              <Link
                key={l.to}
                to={l.to}
                onClick={() => setOpen(false)}
                style={{
                  padding: "12px 8px",
                  color: active ? "#fff" : "rgba(255,255,255,0.8)",
                  fontSize: 15,
                  fontWeight: active ? 600 : 500,
                  textDecoration: "none",
                  borderRadius: 8,
                }}
              >
                {l.label}
              </Link>
            );
          })}
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 12 }}>
            <Link
              to="/login"
              onClick={() => setOpen(false)}
              style={{
                width: "100%",
                padding: "12px 16px",
                border: "1px solid rgba(255,255,255,0.4)",
                borderRadius: 8,
                color: "#fff",
                fontSize: 15,
                fontWeight: 500,
                textDecoration: "none",
                textAlign: "center",
              }}
            >
              Log in
            </Link>
            <Link
              to="/register"
              onClick={() => setOpen(false)}
              style={{
                width: "100%",
                padding: "12px 16px",
                background: "#fff",
                color: NAVY,
                borderRadius: 8,
                fontSize: 15,
                fontWeight: 600,
                textDecoration: "none",
                textAlign: "center",
              }}
            >
              Get started free
            </Link>
          </div>
        </div>
      )}

      <style>{`
        @media (max-width: 880px) {
          .dsm-mkt-nav { display: none !important; }
          .dsm-mkt-cta { display: none !important; }
          .dsm-mkt-burger { display: inline-flex !important; }
        }
      `}</style>
    </header>
  );
}
