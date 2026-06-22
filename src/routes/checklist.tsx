import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Check } from "lucide-react";
import { toast } from "sonner";
import { SectionHeader } from "../components/dsm/SectionHeader";
import { Button } from "../components/dsm/Button";
import { supabase } from "../lib/supabaseClient";

export const Route = createFileRoute("/checklist")({
  head: () => ({
    meta: [{ title: "Pre-lesson checklist — DSM by EveryDriver" }],
  }),
  component: ChecklistPage,
});

const POPPINS = { fontFamily: "Poppins, sans-serif" } as const;

const GROUPS: { title: string; items: string[] }[] = [
  {
    title: "VEHICLE CHECKS",
    items: [
      "Tyres (pressure & condition)",
      "Mirrors adjusted",
      "Seat & headrest",
      "Seatbelt working",
      "Fuel level",
      "Warning lights clear",
      "Windscreen clean",
      "Dual controls working",
    ],
  },
  {
    title: "PUPIL CHECKS",
    items: [
      "Licence checked",
      "Theory pass certificate (if applicable)",
      "Glasses/contacts if needed",
      "Emergency contact noted",
    ],
  },
  {
    title: "LESSON PREP",
    items: [
      "Route planned",
      "Test centre familiar (if test lesson)",
      "Notes reviewed",
      "Payment confirmed",
    ],
  },
];

const ALL_ITEMS = GROUPS.flatMap((g) => g.items);

function daysAgo(iso: string) {
  const then = new Date(iso);
  then.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((today.getTime() - then.getTime()) / 86400000);
}

function ChecklistPage() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [lastCompletedAt, setLastCompletedAt] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (data.user) setUserId(data.user.id);
    })();
  }, []);

  async function loadLast(uid: string) {
    const { data, error } = await supabase
      .from("checklist_completions")
      .select("completed_at")
      .eq("instructor_id", uid)
      .order("completed_at", { ascending: false })
      .limit(1);
    if (error) console.error("[checklist] fetch error", error);
    setLastCompletedAt(data?.[0]?.completed_at ?? null);
  }

  useEffect(() => {
    if (userId) loadLast(userId);
  }, [userId]);

  function toggle(item: string) {
    setChecked((c) => ({ ...c, [item]: !c[item] }));
  }

  const completedCount = ALL_ITEMS.filter((i) => checked[i]).length;
  const allChecked = completedCount === ALL_ITEMS.length;

  async function complete() {
    if (!userId || saving) return;
    if (!allChecked) {
      toast.error(`Tick all ${ALL_ITEMS.length} items first`);
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("checklist_completions").insert({
      instructor_id: userId,
      items_checked: checked,
    });
    setSaving(false);
    if (error) {
      console.error("[checklist] save error", error);
      toast.error("Couldn't save checklist");
      return;
    }
    toast.success("Checklist completed");
    setChecked({});
    loadLast(userId);
  }

  const lastLabel = (() => {
    if (!lastCompletedAt) return "Not yet completed";
    const d = daysAgo(lastCompletedAt);
    if (d === 0) return "Last completed: today";
    if (d === 1) return "Last completed: 1 day ago";
    return `Last completed: ${d} days ago`;
  })();

  return (
    <div className="min-h-screen bg-white pb-8" style={POPPINS}>
      <div
        className="sticky top-0 z-40 flex items-center justify-between px-2"
        style={{ height: 52, backgroundColor: "#072b47" }}
      >
        <button
          type="button"
          aria-label="Back"
          onClick={() => navigate({ to: "/home" })}
          className="flex items-center justify-center"
          style={{ width: 40, height: 40 }}
        >
          <ArrowLeft size={22} color="#FFFFFF" />
        </button>
        <div
          className="flex-1 text-center text-[15px] font-semibold text-white"
          style={POPPINS}
        >
          Pre-lesson checklist
        </div>
        <div style={{ width: 40 }} />
      </div>

      <div className="px-4">
        {GROUPS.map((g) => (
          <div key={g.title}>
            <SectionHeader>{g.title}</SectionHeader>
            <div
              className="bg-white"
              style={{
                borderRadius: 10,
                border: "0.5px solid #E2E6ED",
                overflow: "hidden",
              }}
            >
              {g.items.map((item, idx) => {
                const on = !!checked[item];
                return (
                  <button
                    key={item}
                    type="button"
                    onClick={() => toggle(item)}
                    className="w-full flex items-center text-left"
                    style={{
                      gap: 12,
                      padding: "12px 14px",
                      borderTop: idx === 0 ? "none" : "0.5px solid #F1F3F7",
                      backgroundColor: on ? "#F0F7F2" : "#FFFFFF",
                    }}
                  >
                    <span
                      className="flex items-center justify-center shrink-0"
                      style={{
                        width: 22,
                        height: 22,
                        borderRadius: 6,
                        backgroundColor: on ? "#16A34A" : "#FFFFFF",
                        border: on ? "1px solid #16A34A" : "1.5px solid #CBD5E1",
                      }}
                    >
                      {on && <Check size={14} color="#FFFFFF" strokeWidth={3} />}
                    </span>
                    <span
                      className="text-[14px]"
                      style={{
                        color: "#0F2044",
                        textDecoration: on ? "line-through" : "none",
                        opacity: on ? 0.7 : 1,
                      }}
                    >
                      {item}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        <div className="mt-6">
          <div
            className="text-[12px] text-center mb-2"
            style={{ color: "#6B7280" }}
          >
            {completedCount} / {ALL_ITEMS.length} checked
          </div>
          <Button onClick={complete} disabled={saving || !allChecked} type="button">
            {saving ? "Saving…" : "Complete checklist"}
          </Button>
          <div
            className="text-[12px] text-center mt-2"
            style={{ color: "#6B7280" }}
          >
            {lastLabel}
          </div>
        </div>
      </div>
    </div>
  );
}
