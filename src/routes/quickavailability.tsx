import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, ToggleLeft, ChevronRight } from "lucide-react";
import { Card } from "../components/dsm/Card";
import { Input } from "../components/dsm/Input";
import { Button } from "../components/dsm/Button";
import { SectionHeader } from "../components/dsm/SectionHeader";
import { supabase } from "../lib/supabaseClient";

export const Route = createFileRoute("/quickavailability")({
  head: () => ({
    meta: [{ title: "Quick availability — DSM" }],
  }),
  component: QuickAvailabilityPage,
});

const POPPINS = { fontFamily: "Inter, sans-serif" } as const;

function QuickAvailabilityPage() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [isActive, setIsActive] = useState(true);
  const [returnDate, setReturnDate] = useState("");
  const [reason, setReason] = useState("");
  const [savedReturnDate, setSavedReturnDate] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      const u = data.user;
      if (!u) return;
      setUserId(u.id);
      const { data: row } = await supabase
        .from("instructors")
        .select("is_active, unavailable_until, unavailable_reason")
        .eq("id", u.id)
        .maybeSingle();
      if (row) {
        setIsActive(row.is_active ?? true);
        setReturnDate((row.unavailable_until as string | null) ?? "");
        setSavedReturnDate((row.unavailable_until as string | null) ?? null);
        setReason((row.unavailable_reason as string | null) ?? "");
      }
      setLoading(false);
    })();
  }, []);

  async function toggleStatus() {
    if (!userId) return;
    const next = !isActive;
    setIsActive(next);
    const { error } = await supabase
      .from("instructors")
      .update({ is_active: next })
      .eq("id", userId);
    if (error) {
      console.error("[quickavailability] toggle error", error);
      setIsActive(!next);
    }
  }

  async function saveTemporary() {
    if (!userId) return;
    setSaving(true);
    const { error } = await supabase
      .from("instructors")
      .update({
        unavailable_until: returnDate || null,
        unavailable_reason: reason || null,
      })
      .eq("id", userId);
    setSaving(false);
    if (!error) setSavedReturnDate(returnDate || null);
  }

  return (
    <div className="min-h-screen" style={{ ...POPPINS, backgroundColor: "#F3F8FF", margin: -8 }}>
      {/* Top bar */}
      <div
        className="sticky top-0 z-40 h-[52px] px-4 flex items-center"
        style={{ backgroundColor: "#072b47" }}
      >
        <button
          type="button"
          aria-label="Back"
          onClick={() => navigate({ to: "/home" })}
          className="flex items-center justify-center"
          style={{ width: 32, height: 32 }}
        >
          <ArrowLeft size={20} color="#ffffff" />
        </button>
        <div className="flex-1 text-center text-white text-[15px] font-semibold">
          Quick availability
        </div>
        <div style={{ width: 32 }} />
      </div>

      {loading ? (
        <div className="p-6 text-[13px] text-[#6B7280]">Loading…</div>
      ) : (
        <>
          {/* Status card */}
          <div
            className="mx-4 mt-4"
            style={{
              borderRadius: 16,
              padding: 24,
              backgroundColor: isActive ? "#ECFDF5" : "#FEF2F2",
              borderWidth: 1,
              borderStyle: "solid",
              borderColor: isActive ? "#16A34A" : "#CC2229",
              textAlign: "center",
            }}
          >
            <div
              className="rounded-full mx-auto"
              style={{
                width: 16,
                height: 16,
                backgroundColor: isActive ? "#16A34A" : "#CC2229",
                marginBottom: 12,
              }}
            />
            <div
              style={{
                fontSize: 20,
                fontWeight: 600,
                color: isActive ? "#16A34A" : "#CC2229",
              }}
            >
              {isActive ? "You are available" : "You are unavailable"}
            </div>
            <div style={{ fontSize: 13, color: "#6B7280", marginTop: 6, marginBottom: 20 }}>
              {isActive
                ? "Pupils can see and book your slots"
                : "Pupils cannot book new lessons"}
            </div>
            <button
              type="button"
              onClick={toggleStatus}
              className="w-full rounded-lg font-medium text-white"
              style={{
                height: 52,
                fontSize: 15,
                backgroundColor: isActive ? "#CC2229" : "#16A34A",
                fontFamily: "Inter, sans-serif",
              }}
            >
              {isActive ? "Go unavailable" : "Go available"}
            </button>
          </div>

          <div className="px-4">
            <SectionHeader>TEMPORARY UNAVAILABILITY</SectionHeader>
            <Card>
              <div className="flex flex-col gap-3">
                <Input
                  label="Set a return date"
                  type="date"
                  value={returnDate}
                  onChange={(e) => setReturnDate(e.target.value)}
                />
                <Input
                  label="Reason (optional)"
                  placeholder="e.g. Holiday, Illness"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
                {savedReturnDate && (
                  <div className="text-[12px] text-[#6B7280]">
                    Current return date:{" "}
                    <span className="text-[#1A1A2E] font-medium">{savedReturnDate}</span>
                  </div>
                )}
                <Button variant="ghost" onClick={saveTemporary} disabled={saving}>
                  {saving ? "Saving…" : "Save"}
                </Button>
              </div>
            </Card>

            <SectionHeader>AVAILABILITY HOURS</SectionHeader>
            <Link
              to="/availability"
              className="block"
              style={{ textDecoration: "none" }}
            >
              <Card>
                <div className="flex items-center justify-between">
                  <span className="text-[14px] text-[#1A1A2E] font-medium">
                    Edit working hours
                  </span>
                  <ChevronRight size={18} color="#6B7280" />
                </div>
              </Card>
            </Link>
          </div>

          <div style={{ height: 32 }} />
        </>
      )}
    </div>
  );
}

// Silence unused import warning if ToggleLeft not used elsewhere
void ToggleLeft;
