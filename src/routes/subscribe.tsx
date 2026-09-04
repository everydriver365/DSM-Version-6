import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { IconArrowLeft, IconCheck, IconLoader2 } from "@tabler/icons-react";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "@/lib/toast";
import { useGoBack } from "@/hooks/useGoBack";

// NOTE: after deploying the gc-webhook function, register the webhook URL in the
// GoCardless dashboard: Developers -> Webhooks -> Add endpoint
// URL: https://bjpqxfrihwjcqprmoqfs.supabase.co/functions/v1/gc-webhook

const SUPABASE_URL = "https://bjpqxfrihwjcqprmoqfs.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJqcHF4ZnJpaHdqY3Fwcm1vcWZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE0NzQ4MjEsImV4cCI6MjA5NzA1MDgyMX0.HKlgx3dxP3uxX9wMRRUnfb0IPwaBpFcut_iUgT5XFeo";

type Tier = "pro" | "pro_plus";
type Interval = "monthly" | "annual";

const PLANS: Record<Tier, {
  name: string;
  monthly: number;
  annual: number;
  monthlyDisplay: string;
  annualDisplay: string;
  annualMonthly: string;
  color: string;
  features: string[];
}> = {
  pro: {
    name: "PRO",
    monthly: 2499,
    annual: 24999,
    monthlyDisplay: "£24.99",
    annualDisplay: "£249.99",
    annualMonthly: "£20.83",
    color: "#2C97DE",
    features: [
      "Full instructor website",
      "DIA membership included (worth £99/yr)",
      "58 exclusive perks",
      "GP access & health benefits",
      "PRO Radio & TV",
      "Industry news & community",
      "Diary, pupils & payments",
    ],
  },
  pro_plus: {
    name: "PRO Plus",
    monthly: 3999,
    annual: 39999,
    monthlyDisplay: "£39.99",
    annualDisplay: "£399.99",
    annualMonthly: "£33.33",
    color: "#18A999",
    features: [
      "Everything in PRO",
      "Bennenden Health included (worth £186/yr)",
      "Priority support",
      "Early access to new features",
    ],
  },
};

export const Route = createFileRoute("/subscribe")({
  head: () => ({
    meta: [
      { title: "Upgrade to EDP PRO — EveryDriver" },
      { name: "description", content: "Subscribe to EveryDriver PRO or PRO Plus by Direct Debit and unlock your website, DIA membership and exclusive instructor perks." },
      { property: "og:title", content: "Upgrade to EDP PRO — EveryDriver" },
      { property: "og:description", content: "Subscribe to EveryDriver PRO or PRO Plus by Direct Debit and unlock your website, DIA membership and exclusive instructor perks." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SubscribePage,
});

function SubscribePage() {
  const navigate = useNavigate();
  const goBack = useGoBack();
  const [selectedTier, setSelectedTier] = useState<Tier>("pro");
  const [selectedInterval, setSelectedInterval] = useState<Interval>("monthly");
  const [loading, setLoading] = useState(false);

  async function handleSubscribe() {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate({ to: "/login" as never });
        return;
      }
      const res = await fetch(`${SUPABASE_URL}/functions/v1/create-gc-mandate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
          apikey: SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
          instructor_id: session.user.id,
          tier: selectedTier,
          interval: selectedInterval,
          return_url: `${window.location.origin}/subscribe/complete`,
        }),
      });
      const data = await res.json();
      if (data.redirect_url) {
        sessionStorage.setItem("gc_flow_id", data.flow_id);
        sessionStorage.setItem("gc_tier", selectedTier);
        sessionStorage.setItem("gc_interval", selectedInterval);
        window.location.href = data.redirect_url;
      } else {
        toast.error("Could not start payment. Please try again.");
      }
    } catch (err) {
      toast.error("Payment error: " + String(err));
    } finally {
      setLoading(false);
    }
  }

  const plan = PLANS[selectedTier];

  return (
    <div style={{ minHeight: "100vh", background: "#F4F6F8", fontFamily: "Poppins, sans-serif" }}>
      <div
        style={{
          background: "#0B2341",
          paddingTop: "calc(env(safe-area-inset-top) + 12px)",
          padding: "12px 16px 16px",
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}
      >
        <button
          type="button"
          onClick={() => goBack("/home")}
          aria-label="Back"
          style={{ background: "none", border: "none", padding: 0, display: "inline-flex", cursor: "pointer" }}
        >
          <IconArrowLeft size={20} color="#fff" stroke={1.8} />
        </button>
        <h1 style={{ color: "#fff", fontSize: 18, fontWeight: 700, margin: 0 }}>Upgrade to PRO</h1>
      </div>

      <div style={{ padding: 16 }}>
        {/* Interval toggle */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {(["monthly", "annual"] as Interval[]).map((iv) => {
            const active = selectedInterval === iv;
            return (
              <button
                key={iv}
                type="button"
                onClick={() => setSelectedInterval(iv)}
                style={{
                  background: active ? "#0B2341" : "#F4F6F8",
                  color: active ? "#fff" : "#536579",
                  border: active ? "none" : "1px solid #E4E8EF",
                  borderRadius: 10,
                  padding: "8px 20px",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                {iv === "monthly" ? "Monthly" : "Annual"}
              </button>
            );
          })}
          {selectedInterval === "annual" && (
            <span
              style={{
                background: "#DCFCE7",
                color: "#16A34A",
                fontSize: 11,
                fontWeight: 600,
                borderRadius: 20,
                padding: "3px 10px",
              }}
            >
              Save 2 months
            </span>
          )}
        </div>

        {/* Plan cards */}
        <div style={{ display: "flex", gap: 10, marginTop: 14, alignItems: "stretch" }}>
          {(Object.keys(PLANS) as Tier[]).map((tier) => {
            const p = PLANS[tier];
            const selected = selectedTier === tier;
            return (
              <div
                key={tier}
                onClick={() => setSelectedTier(tier)}
                style={{
                  position: "relative",
                  flex: 1,
                  background: "#fff",
                  borderRadius: 14,
                  border: `2px solid ${selected ? p.color : "#E4E8EF"}`,
                  padding: 16,
                  cursor: "pointer",
                }}
              >
                {selected && (
                  <span
                    style={{
                      position: "absolute",
                      top: 10,
                      right: 10,
                      width: 20,
                      height: 20,
                      borderRadius: 999,
                      background: p.color,
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <IconCheck size={12} color="#fff" stroke={2.5} />
                  </span>
                )}
                <div style={{ fontSize: 14, fontWeight: 700, color: p.color }}>{p.name}</div>
                {selectedInterval === "monthly" ? (
                  <div style={{ marginTop: 4 }}>
                    <span style={{ fontSize: 20, fontWeight: 700, color: "#0B2341" }}>{p.monthlyDisplay}</span>
                    <span style={{ fontSize: 11, color: "#536579" }}>/mo</span>
                  </div>
                ) : (
                  <div style={{ marginTop: 4 }}>
                    <div>
                      <span style={{ fontSize: 20, fontWeight: 700, color: "#0B2341" }}>{p.annualMonthly}</span>
                      <span style={{ fontSize: 11, color: "#536579" }}>/mo</span>
                    </div>
                    <div style={{ marginTop: 2 }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: "#0B2341" }}>{p.annualDisplay}</span>
                      <span style={{ fontSize: 10, color: "#536579" }}>/yr</span>
                    </div>
                  </div>
                )}
                <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
                  {p.features.map((f) => (
                    <div key={f} style={{ display: "flex", gap: 6 }}>
                      <IconCheck size={14} color={p.color} stroke={2.2} style={{ flexShrink: 0, marginTop: 2 }} />
                      <span style={{ fontSize: 12, color: "#536579", lineHeight: 1.4 }}>{f}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Value banner */}
        <div
          style={{
            background: "#EAF5FC",
            borderRadius: 12,
            padding: "12px 14px",
            marginTop: 12,
            fontSize: 12,
            color: "#0B2341",
            lineHeight: 1.5,
          }}
        >
          💡 DIA membership alone costs £99/year. EDP PRO includes it plus your full website and 58 exclusive perks.
        </div>

        {/* Subscribe */}
        <button
          type="button"
          onClick={handleSubscribe}
          disabled={loading}
          style={{
            background: plan.color,
            color: "#fff",
            fontSize: 16,
            fontWeight: 700,
            borderRadius: 14,
            padding: 16,
            width: "100%",
            marginTop: 16,
            border: "none",
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            opacity: loading ? 0.8 : 1,
          }}
        >
          {loading ? (
            <IconLoader2 size={20} color="#fff" style={{ animation: "spin 1s linear infinite" }} />
          ) : (
            "Subscribe with Direct Debit →"
          )}
        </button>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 6,
            marginTop: 12,
            fontSize: 11,
            color: "#536579",
            textAlign: "center",
          }}
        >
          <span>🔒 Secured by GoCardless</span>
          <span>Cancel anytime · No contracts</span>
          <span>Direct Debit — no card needed</span>
        </div>
      </div>
      <style>{"@keyframes spin { to { transform: rotate(360deg); } }"}</style>
    </div>
  );
}
