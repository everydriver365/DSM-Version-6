import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import * as React from "react";
import {
  IconArrowBackUp,
  IconArrowLeft,
  IconArrowsCross,
  IconArrowsLeftRight,
  IconBook,
  IconBox,
  IconDots,
  IconParking,
  IconRoad,
  IconRotateClockwise,
  IconUser,
} from "@tabler/icons-react";
import { useGoBack } from "@/hooks/useGoBack";
import { supabase } from "../lib/supabaseClient";

export const Route = createFileRoute("/pro-teach")({
  head: () => ({
    meta: [
      { title: "PRO Teach — Every Driver Pro" },
      {
        name: "description",
        content:
          "Teaching tools for driving instructors: freehand sketch board, draw-on-map briefings and manoeuvre templates.",
      },
      { property: "og:title", content: "PRO Teach — Every Driver Pro" },
      {
        property: "og:description",
        content: "Sketch board, map drawing and manoeuvre templates for in-car lesson briefings.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ProTeachPage,
});

const NAVY = "#0B2341";
const BLUE = "#2C97DE";
const BORDER = "#E4E8EF";
const MUTED = "#536579";

function SectionLabel({ text, dim }: { text: string; dim?: boolean }) {
  return (
    <div
      style={{
        fontSize: 11,
        fontWeight: 700,
        color: MUTED,
        textTransform: "uppercase",
        letterSpacing: "0.6px",
        padding: "0 4px 4px",
        opacity: dim ? 0.5 : 1,
      }}
    >
      {text}
    </div>
  );
}

const TEMPLATES = [
  { key: "roundabout", label: "Roundabout", Icon: IconRotateClockwise },
  { key: "junction", label: "Junction", Icon: IconArrowsCross },
  { key: "bay", label: "Bay park", Icon: IconParking },
  { key: "parallel", label: "Parallel park", Icon: IconArrowBackUp },
  { key: "turnaround", label: "Turn around", Icon: IconArrowsLeftRight },
  { key: "dual", label: "Dual carriageway", Icon: IconRoad },
] as const;

type Favourite = {
  id: string;
  name: string;
  imageData: string;
  type: "map" | "sketch";
  createdAt: string;
};

function useRecentSketches(max = 3): Favourite[] {
  const [items, setItems] = React.useState<Favourite[]>([]);
  React.useEffect(() => {
    const out: Favourite[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith("pro_teach_fav_")) {
        try {
          const raw = localStorage.getItem(key);
          if (!raw) continue;
          const parsed = JSON.parse(raw);
          out.push({
            id: parsed.id ?? key,
            name: parsed.name ?? "Saved sketch",
            imageData: parsed.imageData ?? "",
            type: parsed.mapUrl || parsed.lat ? "map" : "sketch",
            createdAt: parsed.createdAt ?? new Date().toISOString(),
          });
        } catch {
          // ignore corrupt entries
        }
      }
    }
    out.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    setItems(out.slice(0, max));
  }, []);
  return items;
}

function ProTeachPage() {
  const navigate = useNavigate();
  const goBack = useGoBack();
  const search = useSearch({ from: "/pro-teach" as never }) as { pupilId?: string };
  const pupilId = search.pupilId;
  const [pupilName, setPupilName] = React.useState<string | null>(null);
  const [shareTemplate, setShareTemplate] = React.useState<string | null>(null);
  const recent = useRecentSketches(3);

  React.useEffect(() => {
    if (!pupilId) {
      setPupilName(null);
      return;
    }
    let cancelled = false;
    supabase
      .from("pupils")
      .select("name")
      .eq("id", pupilId)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled) setPupilName((data as { name?: string | null } | null)?.name ?? null);
      });
    return () => {
      cancelled = true;
    };
  }, [pupilId]);

  const bigCard: React.CSSProperties = {
    background: "#fff",
    borderRadius: 16,
    border: `1px solid ${BORDER}`,
    boxShadow: "0 4px 0 #E4E4E8",
    overflow: "hidden",
    cursor: "pointer",
  };

  const badge: React.CSSProperties = {
    position: "absolute",
    top: 8,
    right: 8,
    borderRadius: 6,
    padding: "2px 6px",
    fontSize: 9,
    color: "#fff",
    fontWeight: 700,
    letterSpacing: "0.4px",
  };

  const openTemplate = (key: string) => {
    navigate({ to: "/pro-teach/sketch" as never, search: { template: key } as never });
  };

  const handleTemplateClick = (key: string) => {
    openTemplate(key);
  };

  const startLongPress = (key: string) => {
    const id = window.setTimeout(() => setShareTemplate(key), 500);
    return () => window.clearTimeout(id);
  };

  const shareTemplateUrl = async (key: string) => {
    const url = `${window.location.origin}/pro-teach/sketch?template=${key}`;
    const nav = navigator as Navigator & { share?: (d: ShareData) => Promise<void> };
    if (nav.share) {
      try {
        await nav.share({ title: "PRO Teach template", url });
        return;
      } catch {
        /* cancelled */
      }
    }
    await navigator.clipboard.writeText(url);
  };

  return (
    <div style={{ minHeight: "100vh", background: "#F4F6F8" }}>
      {/* header */}
      <div
        style={{
          background: NAVY,
          paddingTop: "calc(env(safe-area-inset-top, 0px) + 14px)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "0 16px 14px",
          }}
        >
          <button
            type="button"
            onClick={() => goBack("/home")}
            aria-label="Back"
            style={{
              width: 32,
              height: 32,
              borderRadius: "50%",
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

          <div style={{ flex: 1, textAlign: "center" }}>
            <div
              style={{
                color: "rgba(255,255,255,0.6)",
                fontSize: 11,
                textTransform: "uppercase",
                letterSpacing: "0.6px",
              }}
            >
              Every Driver Pro
            </div>
            <div style={{ color: "#fff", fontSize: 18, fontWeight: 700 }}>PRO Teach</div>
          </div>

          <IconDots size={20} color="rgba(255,255,255,0.5)" />
        </div>

        {/* current context bar */}
        <div style={{ padding: "0 16px 16px" }}>
          <div
            style={{
              background: "rgba(255,255,255,0.1)",
              borderRadius: 12,
              padding: "12px 14px",
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <IconUser size={16} color="rgba(255,255,255,0.6)" />
            <span style={{ color: "rgba(255,255,255,0.7)", fontSize: 13 }}>
              {pupilId ? (pupilName ? `With ${pupilName}` : "Loading pupil…") : "Teaching tools"}
            </span>
          </div>
        </div>
      </div>

      {/* content */}
      <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
        {/* section 1 */}
        <div>
          <SectionLabel text="Teaching tools" />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {/* Sketch */}
            <div
              role="button"
              tabIndex={0}
              onClick={() => navigate({ to: "/pro-teach/sketch" as never })}
              onKeyDown={(e) => e.key === "Enter" && navigate({ to: "/pro-teach/sketch" as never })}
              style={bigCard}
            >
              <div
                style={{
                  height: 90,
                  position: "relative",
                  background: "linear-gradient(135deg, #0B2341, #2C97DE)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <svg width="70" height="70" viewBox="0 0 100 100" aria-hidden="true">
                  <g stroke="#fff" strokeWidth="3" fill="none" opacity="0.9">
                    <circle cx="50" cy="50" r="22" />
                    <line x1="50" y1="0" x2="50" y2="26" />
                    <line x1="50" y1="74" x2="50" y2="100" />
                    <line x1="0" y1="50" x2="26" y2="50" />
                    <line x1="74" y1="50" x2="100" y2="50" />
                  </g>
                  <circle cx="50" cy="50" r="9" fill="rgba(255,255,255,0.35)" />
                </svg>
                <span style={{ ...badge, background: "rgba(255,255,255,0.2)" }}>SKETCH</span>
              </div>
              <div style={{ padding: 12 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: NAVY }}>Sketch</div>
                <div style={{ fontSize: 12, color: MUTED, marginTop: 2 }}>Freehand drawing board</div>
              </div>
            </div>

            {/* Map draw */}
            <div
              role="button"
              tabIndex={0}
              onClick={() => navigate({ to: "/pro-teach/map" as never })}
              onKeyDown={(e) => e.key === "Enter" && navigate({ to: "/pro-teach/map" as never })}
              style={bigCard}
            >
              <div
                style={{
                  height: 90,
                  position: "relative",
                  background: "#e8f0e8",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <svg width="100" height="70" viewBox="0 0 120 90" aria-hidden="true">
                  <g stroke="#b9cdb9" strokeWidth="7" fill="none">
                    <line x1="0" y1="30" x2="120" y2="30" />
                    <line x1="0" y1="65" x2="120" y2="65" />
                    <line x1="35" y1="0" x2="35" y2="90" />
                    <line x1="85" y1="0" x2="85" y2="90" />
                  </g>
                  <path
                    d="M10 78 C 40 70, 30 40, 60 30 S 100 20, 112 10"
                    stroke="#E53935"
                    strokeWidth="3"
                    fill="none"
                    strokeLinecap="round"
                  />
                </svg>
                <span style={{ ...badge, background: "rgba(11,35,65,0.7)" }}>MAP</span>
              </div>
              <div style={{ padding: 12 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: NAVY }}>Map Draw</div>
                <div style={{ fontSize: 12, color: MUTED, marginTop: 2 }}>Draw on live map</div>
              </div>
            </div>
          </div>
        </div>

        {/* Recent sketches */}
        {recent.length > 0 && (
          <div>
            <SectionLabel text="Recent sketches" />
            <div style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 4 }}>
              {recent.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() =>
                    navigate({
                      to: item.type === "map" ? ("/pro-teach/map" as never) : ("/pro-teach/sketch" as never),
                    })
                  }
                  style={{
                    flexShrink: 0,
                    width: 120,
                    borderRadius: 12,
                    border: `1px solid ${BORDER}`,
                    overflow: "hidden",
                    background: "#fff",
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  <div style={{ height: 80, background: "#F9FAFB" }}>
                    {item.imageData ? (
                      <img
                        src={item.imageData}
                        alt={item.name}
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      />
                    ) : (
                      <div
                        style={{
                          width: "100%",
                          height: "100%",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: MUTED,
                          fontSize: 11,
                        }}
                      >
                        No preview
                      </div>
                    )}
                  </div>
                  <div style={{ padding: 8 }}>
                    <div
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        color: NAVY,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {item.name}
                    </div>
                    <div style={{ fontSize: 10, color: MUTED, marginTop: 2 }}>
                      {new Date(item.createdAt).toLocaleDateString("en-GB")}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* section 2 */}
        <div>
          <SectionLabel text="Templates" />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
            {TEMPLATES.map(({ key, label, Icon }) => {
              let clearTimer: (() => void) | null = null;
              return (
                <div
                  key={key}
                  role="button"
                  tabIndex={0}
                  onClick={() => handleTemplateClick(key)}
                  onMouseDown={() => {
                    clearTimer = startLongPress(key);
                  }}
                  onMouseUp={() => clearTimer?.()}
                  onMouseLeave={() => clearTimer?.()}
                  onTouchStart={() => {
                    clearTimer = startLongPress(key);
                  }}
                  onTouchEnd={() => clearTimer?.()}
                  style={{
                    background: "#fff",
                    borderRadius: 12,
                    border: `1px solid ${BORDER}`,
                    boxShadow: "0 2px 0 #E4E4E8",
                    padding: "12px 8px",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 6,
                    cursor: "pointer",
                    userSelect: "none",
                  }}
                >
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 10,
                      background: "#EAF5FC",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Icon size={20} color={BLUE} stroke={1.6} />
                  </div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: NAVY, textAlign: "center" }}>
                    {label}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* section 3 */}
        <div>
          <SectionLabel text="Coming soon" dim />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {[
              { label: "3D Diagrams", bg: "#EDE9FE", color: "#7B61FF", Icon: IconBox },
              { label: "Resources", bg: "#FEF3C7", color: "#F59E0B", Icon: IconBook },
            ].map(({ label, bg, color, Icon }) => (
              <div
                key={label}
                style={{
                  background: "#fff",
                  borderRadius: 12,
                  border: `1px solid ${BORDER}`,
                  boxShadow: "0 2px 0 #E4E4E8",
                  padding: "12px 8px",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 6,
                  opacity: 0.6,
                }}
              >
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 10,
                    background: bg,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Icon size={20} color={color} stroke={1.6} />
                </div>
                <div style={{ fontSize: 11, fontWeight: 700, color: NAVY, textAlign: "center" }}>
                  {label}
                </div>
                <div style={{ fontSize: 10, color: MUTED }}>Coming soon</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {shareTemplate && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(11,35,65,0.45)",
            display: "flex",
            alignItems: "flex-end",
            zIndex: 60,
          }}
          onClick={() => setShareTemplate(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#fff",
              width: "100%",
              borderRadius: "18px 18px 0 0",
              padding: "14px 16px calc(env(safe-area-inset-bottom, 0px) + 16px)",
            }}
          >
            <div style={{ width: 36, height: 4, borderRadius: 2, background: "#C7C7CC", margin: "0 auto 12px" }} />
            <div style={{ fontSize: 16, fontWeight: 700, color: NAVY, marginBottom: 12 }}>
              {TEMPLATES.find((t) => t.key === shareTemplate)?.label ?? "Template"}
            </div>
            <button
              type="button"
              onClick={() => {
                setShareTemplate(null);
                openTemplate(shareTemplate);
              }}
              style={{
                width: "100%",
                padding: "12px 0",
                borderRadius: 12,
                border: "none",
                background: NAVY,
                color: "#fff",
                fontWeight: 700,
                marginBottom: 8,
                cursor: "pointer",
              }}
            >
              Open
            </button>
            <button
              type="button"
              onClick={async () => {
                await shareTemplateUrl(shareTemplate);
                setShareTemplate(null);
              }}
              style={{
                width: "100%",
                padding: "12px 0",
                borderRadius: 12,
                border: `1px solid ${BORDER}`,
                background: "#fff",
                color: NAVY,
                fontWeight: 700,
                marginBottom: 8,
                cursor: "pointer",
              }}
            >
              Share link
            </button>
            <button
              type="button"
              onClick={() => setShareTemplate(null)}
              style={{
                width: "100%",
                padding: "12px 0",
                borderRadius: 12,
                border: "none",
                background: "transparent",
                color: MUTED,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
