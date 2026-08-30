import { createFileRoute, useNavigate } from "@tanstack/react-router";
import * as React from "react";
import { IconArrowLeft, IconMap, IconMessage, IconSend } from "@tabler/icons-react";
import { supabase } from "../lib/supabaseClient";

export const Route = createFileRoute("/pro-teach_/route/")({
  head: () => ({
    meta: [
      { title: "AI Route Planner — Every Driver Pro" },
      {
        name: "description",
        content:
          "Ask ED to plan a practical driving lesson route covering roundabouts, parking, dual carriageways and mock tests.",
      },
      { property: "og:title", content: "AI Route Planner — Every Driver Pro" },
      {
        property: "og:description",
        content: "Instant AI-planned UK driving lesson routes for any teaching objective.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: RoutePlannerPage,
});

const NAVY = "#0B2341";
const BLUE = "#2C97DE";
const MUTED = "#536579";
const BORDER = "#E4E8EF";

const QUICK_ROUTES = [
  "🔄 Roundabouts",
  "🅿️ Parking",
  "🏙️ Town centre",
  "🛣️ Dual carriageway",
  "🌆 Independent driving",
  "📋 Mock test route",
  "⛽ Fuel efficient route",
  "🏘️ Residential streets",
  "🚦 Traffic lights",
  "↩️ Manoeuvres",
];

function RoutePlannerPage() {
  const navigate = useNavigate();
  const [activePill, setActivePill] = React.useState<string | null>(null);
  const [text, setText] = React.useState("");
  const [lastPrompt, setLastPrompt] = React.useState<string | null>(null);
  const [response, setResponse] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  const submitPrompt = async (prompt: string) => {
    if (!prompt.trim()) return;
    setLastPrompt(prompt);
    setLoading(true);
    setResponse(null);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const res = await fetch(
        "https://bjpqxfrihwjcqprmoqfs.supabase.co/functions/v1/ed-ai",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({
            question: `As a driving instructor in the UK, suggest a practical lesson route for: ${prompt}. Include street names, key junctions and manoeuvres. Keep it concise — 3-4 sentences maximum.`,
            context: "PRO Teach route planning",
          }),
        },
      );
      const data = (await res.json()) as { answer?: string };
      setResponse(data.answer ?? "Could not plan a route right now.");
    } catch {
      setResponse("Could not connect to ED. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100%", background: "#F4F6F8", paddingBottom: 24 }}>
      {/* header */}
      <div
        style={{
          background: NAVY,
          padding: "10px 12px",
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        <button
          type="button"
          aria-label="Back"
          onClick={() => navigate({ to: "/pro-teach" as never })}
          style={{
            width: 34,
            height: 34,
            borderRadius: 17,
            border: "none",
            background: "rgba(255,255,255,0.12)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
          }}
        >
          <IconArrowLeft size={18} color="#fff" />
        </button>
        <div style={{ flex: 1, color: "#fff", fontSize: 15, fontWeight: 700 }}>AI Route Planner</div>
        <IconMap size={20} color="#fff" />
      </div>

      <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
        {/* quick routes */}
        <div>
          <div style={{ fontSize: 11, color: MUTED, marginBottom: 8 }}>Quick routes</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {QUICK_ROUTES.map((pill) => {
              const active = activePill === pill;
              return (
                <button
                  key={pill}
                  type="button"
                  onClick={() => {
                    setActivePill(pill);
                    void submitPrompt(pill.replace(/^\S+\s/, ""));
                  }}
                  style={{
                    border: "none",
                    background: active ? NAVY : "#EAF5FC",
                    color: active ? "#fff" : BLUE,
                    borderRadius: 20,
                    padding: "6px 12px",
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  {pill}
                </button>
              );
            })}
          </div>
        </div>

        {/* ED response */}
        {(loading || response) && (
          <div
            style={{
              background: "#F4F6F8",
              borderRadius: 12,
              border: `1px solid ${BORDER}`,
              padding: 14,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 14,
                  background: NAVY,
                  color: "#fff",
                  fontSize: 11,
                  fontWeight: 700,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                ED
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, color: NAVY }}>ED suggests</div>
            </div>

            {loading ? (
              <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: MUTED }}>
                <span
                  style={{
                    width: 14,
                    height: 14,
                    borderRadius: 7,
                    border: `2px solid ${BORDER}`,
                    borderTopColor: BLUE,
                    display: "inline-block",
                    animation: "routeSpin 0.8s linear infinite",
                  }}
                />
                Planning your route…
              </div>
            ) : (
              <>
                <div style={{ fontSize: 13, color: NAVY, lineHeight: 1.5, whiteSpace: "pre-wrap" }}>
                  {response}
                </div>
                <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                  <button
                    type="button"
                    onClick={() =>
                      navigate({
                        to: "/pro-teach/map" as never,
                        search: { note: response ?? "" } as never,
                      })
                    }
                    style={{
                      flex: 1,
                      border: "none",
                      background: NAVY,
                      color: "#fff",
                      borderRadius: 10,
                      padding: "8px 12px",
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    Open in Map Draw
                  </button>
                  <button
                    type="button"
                    onClick={() => lastPrompt && void submitPrompt(lastPrompt)}
                    style={{
                      flex: 1,
                      border: `1px solid ${BORDER}`,
                      background: "#fff",
                      color: MUTED,
                      borderRadius: 10,
                      padding: "8px 12px",
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    Try another
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* custom prompt */}
        <div>
          <div style={{ fontSize: 11, color: MUTED, marginBottom: 8 }}>Ask ED</div>
          <div
            style={{
              background: "#F4F6F8",
              borderRadius: 12,
              border: `1px solid ${BORDER}`,
              padding: "10px 14px",
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <IconMessage size={18} color={MUTED} />
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  setActivePill(null);
                  void submitPrompt(text);
                }
              }}
              placeholder="Plan a route for..."
              style={{
                flex: 1,
                border: "none",
                outline: "none",
                background: "transparent",
                fontSize: 14,
                color: NAVY,
              }}
            />
            <button
              type="button"
              aria-label="Send"
              onClick={() => {
                setActivePill(null);
                void submitPrompt(text);
              }}
              style={{
                width: 32,
                height: 32,
                borderRadius: 16,
                border: "none",
                background: NAVY,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                flexShrink: 0,
              }}
            >
              <IconSend size={14} color="#fff" />
            </button>
          </div>
        </div>
      </div>

      <style>{`@keyframes routeSpin { to { transform: rotate(360deg) } }`}</style>
    </div>
  );
}
