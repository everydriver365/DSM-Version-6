import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "../lib/supabaseClient";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "DSM by EveryDriver" },
      { name: "description", content: "Driving school instructor management." },
    ],
  }),
  component: Index,
});

function Index() {
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
  return <div className="min-h-screen bg-white" />;
}
