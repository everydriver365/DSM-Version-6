import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";

// App root: the public marketing site lives on the marketing project
// (everydriver.pro). Here, send signed-in instructors to /home and
// everyone else to /login.
export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Every Driver Pro — Driving School Management" },
      {
        name: "description",
        content:
          "Every Driver Pro is the all-in-one app for UK driving instructors: diary, pupils, payments, messages and more.",
      },
      { property: "og:title", content: "Every Driver Pro — Driving School Management" },
      {
        property: "og:description",
        content:
          "Every Driver Pro is the all-in-one app for UK driving instructors: diary, pupils, payments, messages and more.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: RootRedirect,
});

function RootRedirect() {
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;

    console.log(
      "[auth] localStorage keys:",
      Object.keys(localStorage).filter(
        (k) => k.includes("sb") || k.includes("supabase")
      )
    );

    // Check localStorage for a cached Supabase session first
    // to avoid network round trip
    try {
      const key = Object.keys(localStorage).find(
        (k) =>
          (k.includes("sb-") && k.includes("-auth-token")) ||
          k.includes("supabase.auth.token")
      );
      if (key) {
        const raw = localStorage.getItem(key);
        if (raw) {
          const parsed = JSON.parse(raw);
          const token =
            parsed?.access_token ?? parsed?.currentSession?.access_token;
          if (token && !cancelled) {
            navigate({
              to: "/home",
              replace: true,
            });
            return;
          }
        }
      }
    } catch {
      // fall through to async check
    }

    // No cached session — check with Supabase
    supabase.auth.getSession().then(({ data }) => {
      console.log("[auth] session:", data.session ? "found" : "none");
      if (cancelled) return;
      navigate({
        to: data.session ? "/home" : "/login",
        replace: true,
      });
    });

    return () => {
      cancelled = true;
    };
  }, [navigate]);

  return (
    <div
      style={{
        minHeight: "100vh",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "#0B1F3A",
        fontFamily: "Poppins, sans-serif",
      }}
    >
      <div
        style={{
          color: "#fff",
          fontSize: 20,
          fontWeight: 600,
          letterSpacing: "0.05em",
        }}
      >
        Every Driver{" "}
        <span style={{ color: "#1877D6" }}>Pro</span>
      </div>
      <div
        style={{
          marginTop: 8,
          fontSize: 13,
          color: "#9CA3AF",
        }}
      >
        Driving School Management
      </div>
      <div
        style={{
          marginTop: 24,
          width: 24,
          height: 24,
          borderRadius: "50%",
          border: "2px solid rgba(255,255,255,0.2)",
          borderTopColor: "#fff",
          animation: "spin 0.8s linear infinite",
        }}
      />
    </div>
  );
}
