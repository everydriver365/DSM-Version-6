import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { IconAlertCircle, IconCircleCheck, IconLoader2 } from "@tabler/icons-react";
import { supabase } from "@/lib/supabaseClient";

// NOTE: after deploying the gc-webhook function, register the webhook URL in the
// GoCardless dashboard: Developers -> Webhooks -> Add endpoint
// URL: https://bjpqxfrihwjcqprmoqfs.supabase.co/functions/v1/gc-webhook

const SUPABASE_URL = supabase.supabaseUrl;
const SUPABASE_ANON_KEY = supabase.supabaseKey;

export const Route = createFileRoute("/subscribe/complete")({
  head: () => ({
    meta: [
      { title: "Subscription complete — EveryDriver PRO" },
      { name: "description", content: "Finalising your EveryDriver PRO Direct Debit subscription." },
      { property: "og:title", content: "Subscription complete — EveryDriver PRO" },
      { property: "og:description", content: "Finalising your EveryDriver PRO Direct Debit subscription." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SubscribeCompletePage,
});

function SubscribeCompletePage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const flowId = sessionStorage.getItem("gc_flow_id") ?? params.get("redirect_flow_id");
        const tier = sessionStorage.getItem("gc_tier");
        const interval = sessionStorage.getItem("gc_interval");
        const { data: { session } } = await supabase.auth.getSession();
        if (!session || !flowId) {
          if (!cancelled) setStatus("error");
          return;
        }
        const res = await fetch(`${SUPABASE_URL}/functions/v1/create-gc-subscription`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
            apikey: SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({
            flow_id: flowId,
            instructor_id: session.user.id,
            tier,
            interval,
          }),
        });
        const data = await res.json().catch(() => null);
        if (cancelled) return;
        if (res.ok && data && !data.error) {
          sessionStorage.removeItem("gc_flow_id");
          sessionStorage.removeItem("gc_tier");
          sessionStorage.removeItem("gc_interval");
          setStatus("success");
        } else {
          setStatus("error");
        }
      } catch {
        if (!cancelled) setStatus("error");
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#F4F6F8",
        fontFamily: "Poppins, sans-serif",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        textAlign: "center",
        gap: 10,
      }}
    >
      {status === "loading" && (
        <>
          <IconLoader2 size={48} color="#2C97DE" style={{ animation: "spin 1s linear infinite" }} />
          <div style={{ fontSize: 14, color: "#536579" }}>Setting up your subscription…</div>
        </>
      )}

      {status === "success" && (
        <>
          <IconCircleCheck size={64} color="#16A34A" stroke={1.6} />
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "#0B2341", margin: 0 }}>Welcome to EDP PRO!</h1>
          <div style={{ fontSize: 14, color: "#536579" }}>Your subscription is active.</div>
          <button
            type="button"
            onClick={() => navigate({ to: "/home" as never })}
            style={{
              marginTop: 12,
              background: "#2C97DE",
              color: "#fff",
              border: "none",
              borderRadius: 14,
              padding: "14px 28px",
              fontSize: 15,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Go to home
          </button>
        </>
      )}

      {status === "error" && (
        <>
          <IconAlertCircle size={64} color="#E53935" stroke={1.6} />
          <h1 style={{ fontSize: 18, fontWeight: 700, color: "#0B2341", margin: 0 }}>Payment not completed</h1>
          <div style={{ fontSize: 13, color: "#536579" }}>Please try again or contact support.</div>
          <button
            type="button"
            onClick={() => navigate({ to: "/subscribe" as never })}
            style={{
              marginTop: 12,
              background: "#0B2341",
              color: "#fff",
              border: "none",
              borderRadius: 14,
              padding: "14px 28px",
              fontSize: 15,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </>
      )}
      <style>{"@keyframes spin { to { transform: rotate(360deg); } }"}</style>
    </div>
  );
}
