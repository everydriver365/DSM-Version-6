import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Rocket, UserPlus, Calendar, Clock, Users, ChevronRight } from "lucide-react";
import { supabase } from "../../lib/supabaseClient";

const POPPINS = { fontFamily: "Poppins, system-ui, sans-serif" } as const;

export interface WelcomeOverlayProps {
  userId: string;
  instructorName: string | null;
  onDismiss: () => void;
}

type Step = {
  icon: React.ReactNode;
  bg: string;
  title: string;
  subtitle: string;
  to: string;
};

export function WelcomeOverlay({ userId, instructorName, onDismiss }: WelcomeOverlayProps) {
  const navigate = useNavigate();
  const [visible, setVisible] = useState(true);
  const [dismissing, setDismissing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await (supabase as any)
        .from("instructors")
        .select("welcome_seen_at")
        .eq("id", userId)
        .single();
      if (cancelled) return;
      if (data?.welcome_seen_at) {
        setVisible(false);
        onDismiss();
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  async function dismiss() {
    if (dismissing) return;
    setDismissing(true);
    await (supabase as any)
      .from("instructors")
      .update({ welcome_seen_at: new Date().toISOString() })
      .eq("id", userId);
    setVisible(false);
    onDismiss();
  }

  if (!visible) return null;

  const firstName = (instructorName ?? "").trim().split(/\s+/)[0] || "";

  const steps: Step[] = [
    {
      icon: <UserPlus size={20} color="#fff" />,
      bg: "#1877D6",
      title: "Add your first pupil",
      subtitle: "Start tracking lessons and progress",
      to: "/pupils/new",
    },
    {
      icon: <Calendar size={20} color="#fff" />,
      bg: "#15803D",
      title: "Connect Google Calendar",
      subtitle: "Sync lessons automatically",
      to: "/settings",
    },
    {
      icon: <Clock size={20} color="#fff" />,
      bg: "#7C3AED",
      title: "Set your availability",
      subtitle: "Let Gap Filler find lessons for you",
      to: "/availability",
    },
    {
      icon: <Users size={20} color="#fff" />,
      bg: "#CC2229",
      title: "Explore the community",
      subtitle: "Connect with local instructors",
      to: "/community",
    },
  ];

  return (
    <div
      style={{
        ...POPPINS,
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "#0B1F3A",
        overflowY: "auto",
        paddingTop: "env(safe-area-inset-top, 0px)",
      }}
    >
      {/* HEADER */}
      <div style={{ padding: "32px 24px 0" }}>
        <div style={{ color: "#fff", fontSize: 28, fontWeight: 800, letterSpacing: -0.5 }}>DSM</div>
        <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", marginTop: 2 }}>by EveryDriver</div>
      </div>

      {/* HERO */}
      <div style={{ padding: "24px 24px 0", textAlign: "center" }}>
        <div
          style={{
            width: 80,
            height: 80,
            borderRadius: "50%",
            background: "rgba(255,255,255,0.1)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto",
          }}
        >
          <Rocket size={40} color="#fff" />
        </div>
        <div style={{ fontSize: 24, fontWeight: 700, color: "#fff", marginTop: 16 }}>
          {`Welcome${firstName ? ", " + firstName : ""}!`}
        </div>
        <div style={{ fontSize: 14, color: "rgba(255,255,255,0.6)", marginTop: 8 }}>
          You're all set up. Here's what to do first.
        </div>
      </div>

      {/* STEPS */}
      <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 12 }}>
        {steps.map((s) => (
          <div
            key={s.title}
            role="button"
            tabIndex={0}
            onClick={() => {
              navigate({ to: s.to as never });
              void dismiss();
            }}
            style={{
              background: "rgba(255,255,255,0.08)",
              borderRadius: 12,
              padding: "14px 16px",
              display: "flex",
              alignItems: "center",
              gap: 14,
              cursor: "pointer",
            }}
          >
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: "50%",
                background: s.bg,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              {s.icon}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: "#fff" }}>{s.title}</div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", marginTop: 2 }}>{s.subtitle}</div>
            </div>
            <ChevronRight size={16} color="rgba(255,255,255,0.3)" />
          </div>
        ))}
      </div>

      {/* FOOTER */}
      <div
        style={{
          padding: 24,
          paddingBottom: "calc(24px + env(safe-area-inset-bottom, 0px))",
          textAlign: "center",
        }}
      >
        <button
          type="button"
          onClick={() => void dismiss()}
          disabled={dismissing}
          style={{
            ...POPPINS,
            width: "100%",
            padding: 15,
            background: "#1877D6",
            color: "#fff",
            borderRadius: 12,
            border: "none",
            fontSize: 16,
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          Let's go
        </button>
        <button
          type="button"
          onClick={() => void dismiss()}
          disabled={dismissing}
          style={{
            ...POPPINS,
            fontSize: 13,
            color: "#6B7686",
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: 12,
          }}
        >
          I'll explore on my own
        </button>
      </div>
    </div>
  );
}

export default WelcomeOverlay;
