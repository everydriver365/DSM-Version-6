import { useEffect, useMemo, useState } from "react";
import { tokens } from "@/lib/tokens";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { IconChevronLeft, IconSearch, IconStar } from "@tabler/icons-react";
import { supabase } from "@/lib/supabaseClient";
import { useAdminGate } from "./admin";

export const Route = createFileRoute("/admin/featured")({
  component: AdminFeatured,
});

type Instructor = {
  id: string;
  name: string | null;
  featured_listing: boolean | null;
  featured_until: string | null;
  app_slug: string | null;
};

const FEE = 14.99;

const CARD_SHADOW = "0 1px 2px rgba(0,0,0,0.04), 0 6px 16px rgba(0,0,0,0.05)";

function initialsOf(name: string | null) {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return (parts[0]![0]! + (parts[1]?.[0] ?? "")).toUpperCase();
}

function TopBar({ onBack }: { onBack: () => void }) {
  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 40,
        background: tokens.navy,
        color: "#fff",
        borderRadius: "0 0 16px 16px",
        padding: "calc(env(safe-area-inset-top, 0px) + 12px) 16px 18px",
        display: "flex",
        alignItems: "center",
        gap: 12,
      }}
    >
      <button
        type="button"
        onClick={onBack}
        aria-label="Back"
        style={{
          width: 34,
          height: 34,
          borderRadius: "50%",
          background: "rgba(255,255,255,0.08)",
          border: "none",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          color: "#fff",
          flexShrink: 0,
        }}
      >
        <IconChevronLeft stroke={1.5} size={18} />
      </button>
      <span style={{ fontSize: 24, fontWeight: tokens.fontWeight.extrabold, letterSpacing: "-0.4px", color: "#fff" }}>
        Featured listings
      </span>
    </div>
  );
}

function StatColumn({ label, value, divider }: { label: string; value: string; divider?: boolean }) {
  return (
    <div
      style={{
        flex: 1,
        padding: 16,
        borderLeft: divider ? "1px solid #EFEFF2" : undefined,
      }}
    >
      <div style={{ fontSize: 26, fontWeight: tokens.fontWeight.extrabold, color: "#000", letterSpacing: "-0.5px" }}>{value}</div>
      <div
        style={{
          fontSize: 10.5,
          fontWeight: tokens.fontWeight.bold,
          color: "#8A8A8E",
          textTransform: "uppercase",
          letterSpacing: "0.4px",
          marginTop: 4,
        }}
      >
        {label}
      </div>
    </div>
  );
}

function Toggle({ on, onChange, disabled }: { on: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      disabled={disabled}
      onClick={() => onChange(!on)}
      style={{
        width: 46,
        height: 28,
        borderRadius: 999,
        background: on ? "#1877D6" : "#E5E5EA",
        border: "none",
        position: "relative",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.6 : 1,
        transition: "background 0.15s",
        flexShrink: 0,
        padding: 0,
      }}
    >
      <span
        style={{
          position: "absolute",
          top: 2,
          left: on ? 20 : 2,
          width: 24,
          height: 24,
          borderRadius: "50%",
          background: "#fff",
          boxShadow: "0 1px 2px rgba(0,0,0,0.2)",
          transition: "left 0.15s",
        }}
      />
    </button>
  );
}

function AdminFeatured() {
  const navigate = useNavigate();
  const status = useAdminGate();
  const [instructors, setInstructors] = useState<Instructor[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (status !== "allowed") return;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("instructors")
        .select("id, name, featured_listing, featured_until, app_slug")
        .order("name");
      if (error) console.error("[admin.featured] fetch error", error);
      setInstructors((data as Instructor[]) ?? []);
      setLoading(false);
    })();
  }, [status]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return instructors;
    return instructors.filter((i) => (i.name ?? "").toLowerCase().includes(q));
  }, [instructors, query]);

  const featuredCount = instructors.filter((i) => i.featured_listing).length;
  const revenue = featuredCount * FEE;

  async function toggleFeatured(inst: Instructor, next: boolean) {
    setSavingId(inst.id);
    try {
      if (next) {
        const until = new Date();
        until.setDate(until.getDate() + 30);
        const untilIso = until.toISOString();
        const { error } = await supabase
          .from("instructors")
          .update({ featured_listing: true, featured_until: untilIso })
          .eq("id", inst.id);
        if (error) throw error;
        await supabase
          .from("instructor_courses")
          .update({ featured: true })
          .eq("instructor_id", inst.id)
          .eq("status", "active")
          .eq("publish_marketplace", true);
        setInstructors((prev) =>
          prev.map((p) =>
            p.id === inst.id ? { ...p, featured_listing: true, featured_until: untilIso } : p,
          ),
        );
      } else {
        const { error } = await supabase
          .from("instructors")
          .update({ featured_listing: false, featured_until: null })
          .eq("id", inst.id);
        if (error) throw error;
        await supabase
          .from("instructor_courses")
          .update({ featured: false })
          .eq("instructor_id", inst.id);
        setInstructors((prev) =>
          prev.map((p) =>
            p.id === inst.id ? { ...p, featured_listing: false, featured_until: null } : p,
          ),
        );
      }
    } catch (err) {
      console.error("[admin.featured] toggle error", err);
      alert("Could not update featured status");
    } finally {
      setSavingId(null);
    }
  }

  if (status === "checking") {
    return (
      <div style={{ background: "#fff", minHeight: "100vh", padding: 24, fontFamily: "Poppins, sans-serif", color: "#6B7280" }}>
        Checking access…
      </div>
    );
  }
  if (status === "denied") {
    return (
      <div style={{ background: "#fff", minHeight: "100vh", padding: 24, fontFamily: "Poppins, sans-serif" }}>
        <div style={{ fontSize: tokens.fontSize.xl, fontWeight: tokens.fontWeight.semibold, color: tokens.blue }}>Access denied</div>
        <div style={{ color: "#6B7280", marginTop: 8 }}>Redirecting…</div>
      </div>
    );
  }

  return (
    <div style={{ background: "#F2F2F7", minHeight: "100vh", fontFamily: "Poppins, sans-serif" }}>
      <TopBar onBack={() => navigate({ to: "/admin" })} />
      <div style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 74px)", paddingBottom: 32 }}>
        {/* stats */}
        <div style={{ padding: "0 16px" }}>
          <div
            style={{
              background: "#fff",
              borderRadius: tokens.radiusCard,
              boxShadow: CARD_SHADOW,
              display: "flex",
            }}
          >
            <StatColumn label="Total featured" value={String(featuredCount)} />
            <StatColumn label="Revenue" value={`£${revenue.toFixed(2)}`} divider />
          </div>
        </div>

        {/* search */}
        <div style={{ padding: "12px 16px 0" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 9,
              background: "#fff",
              borderRadius: tokens.radiusCard,
              padding: "13px 16px",
              boxShadow: CARD_SHADOW,
            }}
          >
            <IconSearch stroke={1.5} size={16} color="#8A8A8E" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search instructors"
              style={{
                flex: 1,
                border: "none",
                outline: "none",
                background: "transparent",
                fontSize: tokens.fontSize.md,
                color: "#000",
              }}
            />
          </div>
        </div>

        {/* list */}
        <div style={{ margin: "12px 16px 0" }}>
          {loading ? (
            <div style={{ color: "#8A8A8E", padding: 12 }}>Loading…</div>
          ) : filtered.length === 0 ? (
            <div style={{ color: "#8A8A8E", padding: 12 }}>No instructors found.</div>
          ) : (
            <div
              style={{
                background: "#fff",
                borderRadius: tokens.radiusCard,
                overflow: "hidden",
                boxShadow: CARD_SHADOW,
              }}
            >
              {filtered.map((inst, idx) => {
                const featured = !!inst.featured_listing;
                return (
                  <div
                    key={inst.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 13,
                      padding: "14px 16px",
                      borderTop: idx === 0 ? "none" : "1px solid #EFEFF2",
                    }}
                  >
                    <div
                      style={{
                        width: 38,
                        height: 38,
                        borderRadius: "50%",
                        background: featured ? "#0B1F3A" : "#F2F2F7",
                        color: featured ? "#fff" : "#0B1F3A",
                        fontSize: tokens.fontSize.base,
                        fontWeight: tokens.fontWeight.bold,
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      {initialsOf(inst.name)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <div style={{ fontSize: 15, fontWeight: tokens.fontWeight.bold, color: "#000" }}>
                          {inst.name ?? "Unnamed"}
                        </div>
                        {featured && (
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 4,
                              fontSize: tokens.fontSize.xs,
                              fontWeight: tokens.fontWeight.extrabold,
                              color: "#B8860B",
                              background: "#FFF6DC",
                              padding: "3px 9px",
                              borderRadius: tokens.radiusCard,
                              letterSpacing: "0.3px",
                            }}
                          >
                            <IconStar stroke={1.5} size={9} /> Featured
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: 12.5, color: "#8A8A8E", marginTop: 2 }}>
                        {inst.app_slug ?? "no slug"}
                      </div>
                      {featured && inst.featured_until && (
                        <div style={{ fontSize: 11.5, fontWeight: tokens.fontWeight.medium, color: "#B8860B", marginTop: 2 }}>
                          Until {new Date(inst.featured_until).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                    <Toggle
                      on={featured}
                      disabled={savingId === inst.id}
                      onChange={(v) => toggleFeatured(inst, v)}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
