import { useEffect, useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ChevronLeft, Search, Star } from "lucide-react";
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

function TopBar({ onBack }: { onBack: () => void }) {
  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 40,
        background: "#CC2229",
        color: "#fff",
        padding: "calc(env(safe-area-inset-top, 0px) + 12px) 16px 14px",
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
          width: 32,
          height: 32,
          borderRadius: "50%",
          background: "rgba(255,255,255,0.15)",
          border: "none",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          color: "#fff",
        }}
      >
        <ChevronLeft size={18} />
      </button>
      <span style={{ fontSize: 16, fontWeight: 600 }}>Featured listings</span>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        flex: 1,
        background: "#F8F9FB",
        borderWidth: "0.5px",
        borderStyle: "solid",
        borderColor: "#EEF2F7",
        borderRadius: 12,
        padding: 14,
      }}
    >
      <div style={{ fontSize: 22, fontWeight: 600, color: "#0C2340" }}>{value}</div>
      <div
        style={{
          fontSize: 11,
          fontWeight: 500,
          color: "#6B7280",
          textTransform: "uppercase",
          letterSpacing: "0.05em",
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
        width: 44,
        height: 26,
        borderRadius: 999,
        background: on ? "#CC2229" : "#D1D5DB",
        border: "none",
        position: "relative",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.6 : 1,
        transition: "background 0.15s",
        flexShrink: 0,
      }}
    >
      <span
        style={{
          position: "absolute",
          top: 3,
          left: on ? 21 : 3,
          width: 20,
          height: 20,
          borderRadius: "50%",
          background: "#fff",
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
      <div style={{ background: "#fff", minHeight: "100vh", padding: 24, fontFamily: "Inter, sans-serif", color: "#6B7280" }}>
        Checking access…
      </div>
    );
  }
  if (status === "denied") {
    return (
      <div style={{ background: "#fff", minHeight: "100vh", padding: 24, fontFamily: "Inter, sans-serif" }}>
        <div style={{ fontSize: 18, fontWeight: 600, color: "#CC2229" }}>Access denied</div>
        <div style={{ color: "#6B7280", marginTop: 8 }}>Redirecting…</div>
      </div>
    );
  }

  return (
    <div style={{ background: "#fff", minHeight: "100vh", fontFamily: "Inter, sans-serif" }}>
      <TopBar onBack={() => navigate({ to: "/admin" })} />
      <div style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 64px)", paddingBottom: 32 }}>
        {/* stats */}
        <div style={{ padding: 16, display: "flex", gap: 12 }}>
          <StatCard label="Total featured" value={String(featuredCount)} />
          <StatCard label="Revenue" value={`£${revenue.toFixed(2)}`} />
        </div>

        {/* search */}
        <div style={{ padding: "0 16px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              background: "#F8F9FB",
              border: "0.5px solid #EEF2F7",
              borderRadius: 10,
              padding: "8px 12px",
            }}
          >
            <Search size={16} color="#6B7280" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search instructors"
              style={{
                flex: 1,
                border: "none",
                outline: "none",
                background: "transparent",
                fontSize: 14,
                color: "#0C2340",
              }}
            />
          </div>
        </div>

        {/* list */}
        <div style={{ margin: "12px 16px 0", display: "flex", flexDirection: "column", gap: 10 }}>
          {loading ? (
            <div style={{ color: "#6B7280", padding: 12 }}>Loading…</div>
          ) : filtered.length === 0 ? (
            <div style={{ color: "#6B7280", padding: 12 }}>No instructors found.</div>
          ) : (
            filtered.map((inst) => (
              <div
                key={inst.id}
                style={{
                  background: "#fff",
                  borderWidth: "0.5px",
                  borderStyle: "solid",
                  borderColor: "#EEF2F7",
                  borderRadius: 12,
                  padding: 14,
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "#0C2340" }}>
                      {inst.name ?? "Unnamed"}
                    </div>
                    {inst.featured_listing && (
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                          fontSize: 10,
                          fontWeight: 600,
                          color: "#8A6100",
                          background: "#FFF4CC",
                          border: "0.5px solid #F0D77A",
                          padding: "2px 6px",
                          borderRadius: 999,
                          textTransform: "uppercase",
                          letterSpacing: "0.04em",
                        }}
                      >
                        <Star size={10} /> Featured
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 12, color: "#6B7280", marginTop: 2 }}>
                    {inst.app_slug ?? "no slug"}
                  </div>
                  {inst.featured_until && (
                    <div style={{ fontSize: 11, color: "#6B7280", marginTop: 2 }}>
                      Until {new Date(inst.featured_until).toLocaleDateString()}
                    </div>
                  )}
                </div>
                <Toggle
                  on={!!inst.featured_listing}
                  disabled={savingId === inst.id}
                  onChange={(v) => toggleFeatured(inst, v)}
                />
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
