import React from "react";
import { Link } from "@tanstack/react-router";

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
    <section style={{ background: bg ?? "transparent", padding: `${padY}px 20px` }}>
      <div style={{ maxWidth: 1120, margin: "0 auto" }}>{children}</div>
    </section>
  );
}

export function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        display: "inline-block",
        padding: "6px 12px",
        borderRadius: 999,
        background: "#EFF6FF",
        color: "#1E40AF",
        fontSize: 12,
        fontWeight: 600,
        letterSpacing: 0.4,
        textTransform: "uppercase",
        marginBottom: 16,
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
        fontSize: "clamp(34px, 5.4vw, 56px)",
        lineHeight: 1.08,
        letterSpacing: -0.5,
        fontWeight: 800,
        color: "#0B1530",
        margin: 0,
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
        fontSize: "clamp(26px, 3.6vw, 38px)",
        lineHeight: 1.15,
        letterSpacing: -0.3,
        fontWeight: 700,
        color: "#0B1530",
        margin: 0,
      }}
    >
      {children}
    </h2>
  );
}

export function Lead({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ fontSize: 18, lineHeight: 1.6, color: "#475569", marginTop: 18, maxWidth: 640 }}>
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
        padding: "13px 22px",
        borderRadius: 12,
        background: "#0F2044",
        color: "#fff",
        fontWeight: 600,
        fontSize: 15,
        textDecoration: "none",
        boxShadow: "0 6px 20px rgba(15,32,68,0.18)",
      }}
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
        padding: "13px 22px",
        borderRadius: 12,
        background: "#fff",
        color: "#0F2044",
        fontWeight: 600,
        fontSize: 15,
        textDecoration: "none",
        border: "1px solid #E2E8F0",
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
        padding: 24,
        borderRadius: 16,
        border: "1px solid #E6E8EE",
        background: "#fff",
      }}
    >
      <div style={{ fontSize: 28, marginBottom: 12 }}>{icon}</div>
      <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: "#0B1530" }}>{title}</h3>
      <p style={{ margin: "8px 0 0", fontSize: 14, lineHeight: 1.6, color: "#475569" }}>{body}</p>
    </div>
  );
}
