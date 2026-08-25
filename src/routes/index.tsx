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
    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      navigate({ to: data.session ? "/home" : "/login", replace: true });
    });
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  return (
    <div
      className="min-h-screen w-full flex flex-col items-center justify-center bg-[#0B1F3A]"
      style={{ fontFamily: "Poppins, sans-serif" }}
    >
      <div className="text-white text-[20px] font-semibold tracking-wide">
        Every Driver <span style={{ color: "#1877D6" }}>Pro</span>
      </div>
      <div className="mt-2 text-[13px] text-[#9CA3AF]">Driving School Management</div>
      <div
        className="mt-6 h-6 w-6 rounded-full border-2 border-white/20 border-t-white animate-spin"
        aria-label="Loading"
      />
    </div>
  );
}

export default RootRedirect;
