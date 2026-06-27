import React from "react";
import { Link } from "@tanstack/react-router";

const FONT = "'Poppins', system-ui, -apple-system, sans-serif";
const NAVY = "#1B2B4B";
const TEAL = "#00B5A5";
const TEAL_DARK = "#009687";
const TEAL_TINT = "#E6F7F6";
const INK = "#0F172A";
const MUTED = "#64748B";
const HAIRLINE = "#E5E9F2";
const SHADOW_SOFT =
  "0 1px 2px rgba(15,23,42,0.04), 0 8px 24px rgba(15,23,42,0.06)";

export function Section({
  children,
  bg,
  padY = 80,
}: {
  children: React.ReactNode;
  bg?: string;
  padY?: number;
}) {
  return (
    <section
      style={{
        background: bg ?? "transparent",
        padding: `${padY}px 20px`,
        fontFamily: FONT,
      }}
    >
      <div style={{ maxWidth: 1180, margin: "0 auto" }}>{children}</div>
    </section>
  );
}

export function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        display: "inline-block",
        padding: "6px 14px",
        borderRadius: 999,
        background: TEAL_TINT,
        color: TEAL_DARK,
        fontSize: 12,
        fontWeight: 600,
        letterSpacing: "0.12em",
        textTransform: "uppercase",
        marginBottom: 18,
        fontFamily: FONT,
      }}
    >
      {children}
    </div>
  );
}

export function H1({ children }: { children: React.ReactNode }) {
  return (
    <h1
      style={{
        fontSize: "clamp(34px, 6vw, 64px)",
        lineHeight: 1.05,
        letterSpacing: "-0.02em",
        fontWeight: 700,
        color: NAVY,
        margin: 0,
        fontFamily: FONT,
      }}
    >
      {children}
    </h1>
  );
}

export function H2({ children }: { children: React.ReactNode }) {
  return (
    <h2
      style={{
        fontSize: "clamp(28px, 4vw, 44px)",
        lineHeight: 1.12,
        letterSpacing: "-0.015em",
        fontWeight: 700,
        color: NAVY,
        margin: 0,
        fontFamily: FONT,
      }}
    >
      {children}
    </h2>
  );
}

export function Lead({ children }: { children: React.ReactNode }) {
  return (
    <p
      style={{
        fontSize: 18,
        lineHeight: 1.65,
        color: "#475569",
        marginTop: 18,
        maxWidth: 660,
        fontFamily: FONT,
      }}
    >
      {children}
    </p>
  );
}

export function PrimaryBtn({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <Link
      to={to}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: "14px 24px",
        borderRadius: 12,
        background: TEAL,
        color: "#fff",
        fontWeight: 600,
        fontSize: 15,
        textDecoration: "none",
        boxShadow: "0 8px 20px rgba(0,181,165,0.28)",
        fontFamily: FONT,
        transition: "background 150ms ease, transform 150ms ease",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = TEAL_DARK)}
      onMouseLeave={(e) => (e.currentTarget.style.background = TEAL)}
    >
      {children}
    </Link>
  );
}

export function SecondaryBtn({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <Link
      to={to}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: "14px 24px",
        borderRadius: 12,
        background: "#fff",
        color: NAVY,
        fontWeight: 600,
        fontSize: 15,
        textDecoration: "none",
        border: `1px solid ${HAIRLINE}`,
        fontFamily: FONT,
      }}
    >
      {children}
    </Link>
  );
}

export function FeatureCard({
  icon,
  title,
  body,
}: {
  icon: string;
  title: string;
  body: string;
}) {
  return (
    <div
      style={{
        padding: 26,
        borderRadius: 20,
        border: `1px solid ${HAIRLINE}`,
        background: "#fff",
        boxShadow: SHADOW_SOFT,
        fontFamily: FONT,
        transition: "transform 200ms ease, box-shadow 200ms ease",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-2px)";
        e.currentTarget.style.boxShadow =
          "0 1px 2px rgba(15,23,42,0.04), 0 16px 40px rgba(27,43,75,0.12)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = SHADOW_SOFT;
      }}
    >
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: 12,
          background: TEAL_TINT,
          color: TEAL_DARK,
          display: "grid",
          placeItems: "center",
          fontSize: 22,
          marginBottom: 14,
        }}
      >
        {icon}
      </div>
      <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: NAVY, fontFamily: FONT }}>
        {title}
      </h3>
      <p style={{ margin: "8px 0 0", fontSize: 15, lineHeight: 1.65, color: MUTED, fontFamily: FONT }}>
        {body}
      </p>
    </div>
  );
}

export const MarketingTokens = { FONT, NAVY, TEAL, TEAL_DARK, TEAL_TINT, INK, MUTED, HAIRLINE, SHADOW_SOFT };
