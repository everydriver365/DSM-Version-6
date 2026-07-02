import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, AlertTriangle, Clock, Eye } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "../lib/supabaseClient";

export const Route = createFileRoute("/no-show-policy")({
  head: () => ({
    meta: [
      { title: "No-show policy — DSM by EveryDriver" },
      { name: "description", content: "Set your late cancellation and no-show policy." },
    ],
  }),
  component: NoShowPolicyPage,
});

const FONT = { fontFamily: "Inter, sans-serif" } as const;
const SUPABASE_URL = "https://bjpqxfrihwjcqprmoqfs.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJqcHF4ZnJpaHdqY3Fwcm1vcWZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE0NzQ4MjEsImV4cCI6MjA5NzA1MDgyMX0.HKlgx3dxP3uxX9wMRRUnfb0IPwaBpFcut_iUgT5XFeo";

function NoShowPolicyPage() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [lateCancelHours, setLateCancelHours] = useState<number>(24);
  const [lateCancelFee, setLateCancelFee] = useState<number>(0);
  const [noShowFee, setNoShowFee] = useState<number>(0);
  const [autoCharge, setAutoCharge] = useState<boolean>(false);
  const [saving, setSaving] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const session = sessionData.session;
      if (!session) return;
      setUserId(session.user.id);
      setAccessToken(session.access_token);
      try {
        const res = await fetch(
          `${SUPABASE_URL}/rest/v1/instructor_reminder_preferences?instructor_id=eq.${session.user.id}&select=*`,
          {
            headers: {
              apikey: SUPABASE_ANON_KEY,
              Authorization: `Bearer ${session.access_token}`,
            },
          },
        );
        if (res.ok) {
          const rows = (await res.json()) as Array<{
            no_show_fee?: number | null;
            late_cancel_fee?: number | null;
            late_cancel_hours?: number | null;
            auto_charge_no_show?: boolean | null;
          }>;
          const row = rows[0];
          if (row) {
            if (typeof row.late_cancel_hours === "number") setLateCancelHours(row.late_cancel_hours);
            if (typeof row.late_cancel_fee === "number") setLateCancelFee(row.late_cancel_fee);
            if (typeof row.no_show_fee === "number") setNoShowFee(row.no_show_fee);
            if (typeof row.auto_charge_no_show === "boolean") setAutoCharge(row.auto_charge_no_show);
          }
        }
      } catch (e) {
        console.error("[no-show-policy] fetch error", e);
      }
    })();
  }, []);

  async function save() {
    if (!userId || !accessToken) {
      toast.error("Not signed in");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/instructor_reminder_preferences?on_conflict=instructor_id`,
        {
          method: "POST",
          headers: {
            apikey: SUPABASE_ANON_KEY,
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
            Prefer: "resolution=merge-duplicates,return=minimal",
          },
          body: JSON.stringify({
            instructor_id: userId,
            no_show_fee: noShowFee,
            late_cancel_fee: lateCancelFee,
            late_cancel_hours: lateCancelHours,
            auto_charge_no_show: autoCharge,
          }),
        },
      );
      if (!res.ok) {
        const text = await res.text();
        console.error("[no-show-policy] save error", res.status, text);
        toast.error("Could not save policy");
      } else {
        toast.success("Policy saved");
        setSavedFlash(true);
        window.setTimeout(() => setSavedFlash(false), 3000);
      }
    } catch (e) {
      console.error("[no-show-policy] save error", e);
      toast.error("Could not save policy");
    } finally {
      setSaving(false);
    }
  }

  const previewText =
    lateCancelFee === 0 && noShowFee === 0
      ? "Please give as much notice as possible if you need to cancel your lesson."
      : `${
          lateCancelFee > 0
            ? `Lessons cancelled with less than ${lateCancelHours} hours notice will incur a ${lateCancelFee}% cancellation charge. `
            : ""
        }${
          noShowFee > 0
            ? `Pupils who do not show up will be charged ${noShowFee}% of the lesson price.`
            : ""
        }`.trim();

  return (
    <div className="min-h-screen bg-white pb-24 pb-safe" style={FONT}>
      <div
        className="sticky top-0 z-40 flex items-center gap-3 px-4"
        style={{ height: 52, backgroundColor: "#0F2044" }}
      >
        <button
          type="button"
          aria-label="Back"
          onClick={() => navigate({ to: "/settings" })}
          className="flex items-center justify-center rounded-full"
          style={{ width: 32, height: 32 }}
        >
          <ArrowLeft size={20} color="#FFFFFF" />
        </button>
        <span className="text-[15px] font-semibold text-white" style={FONT}>
          No-show policy
        </span>
      </div>

      {/* Intro card */}
      <div
        className="mx-4 mt-4 flex gap-3"
        style={{
          backgroundColor: "#FFFBEB",
          border: "1px solid #FDE68A",
          borderRadius: 12,
          padding: 16,
        }}
      >
        <AlertTriangle size={20} color="#D97706" className="shrink-0 mt-0.5" />
        <div className="text-[13px] text-[#78350F] leading-snug" style={FONT}>
          Set your policy for late cancellations and no-shows. This appears on your DSM mini website and booking
          confirmation emails.
        </div>
      </div>

      {/* Settings card */}
      <div
        className="mx-4 mt-3"
        style={{
          backgroundColor: "#FFFFFF",
          border: "0.5px solid #E2E6ED",
          borderRadius: 12,
          padding: 16,
        }}
      >
        <div className="flex items-center gap-2 mb-3">
          <Clock size={18} color="#0F2044" />
          <div className="text-[15px] font-semibold text-[#0F2044]" style={FONT}>
            Late cancellation
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-[13px] text-[#0F2044] mb-1.5" style={FONT}>
            How many hours notice is required?
          </label>
          <select
            value={lateCancelHours}
            onChange={(e) => setLateCancelHours(Number(e.target.value))}
            className="w-full text-[14px] text-[#0F2044] bg-white"
            style={{
              border: "0.5px solid #E2E6ED",
              borderRadius: 8,
              padding: "10px 12px",
              ...FONT,
            }}
          >
            <option value={12}>12 hours</option>
            <option value={24}>24 hours</option>
            <option value={48}>48 hours</option>
            <option value={72}>72 hours</option>
          </select>
        </div>

        <div className="mb-4">
          <label className="block text-[13px] text-[#0F2044] mb-1.5" style={FONT}>
            Late cancellation fee (% of lesson price)
          </label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              step={5}
              min={0}
              max={100}
              value={lateCancelFee}
              onChange={(e) => setLateCancelFee(Math.min(100, Math.max(0, Number(e.target.value) || 0)))}
              className="flex-1 text-[14px] text-[#0F2044] bg-white"
              style={{
                border: "0.5px solid #E2E6ED",
                borderRadius: 8,
                padding: "10px 12px",
                ...FONT,
              }}
            />
            <span className="text-[15px] text-[#6B7280]" style={FONT}>%</span>
          </div>
          <div className="text-[12px] text-[#6B7280] mt-1" style={FONT}>
            e.g. 50% of a £40 lesson = £20 late cancel fee
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-[13px] text-[#0F2044] mb-1.5" style={FONT}>
            Fee charged if pupil doesn't show up
          </label>
          <div className="flex items-center gap-2">
            <span className="text-[15px] text-[#6B7280]" style={FONT}>£</span>
            <input
              type="number"
              step={0.5}
              min={0}
              value={noShowFee}
              onChange={(e) => setNoShowFee(Number(e.target.value) || 0)}
              className="flex-1 text-[14px] text-[#0F2044] bg-white"
              style={{
                border: "0.5px solid #E2E6ED",
                borderRadius: 8,
                padding: "10px 12px",
                ...FONT,
              }}
            />
          </div>
        </div>

        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="text-[13px] text-[#0F2044]" style={FONT}>
              Automatically add no-show fee to pupil balance
            </div>
            <div className="text-[12px] text-[#6B7280] mt-0.5" style={FONT}>
              When enabled, the fee is added to the pupil's outstanding balance automatically
            </div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={autoCharge}
            onClick={() => setAutoCharge((v) => !v)}
            className="relative shrink-0 rounded-full transition-colors"
            style={{
              width: 44,
              height: 26,
              backgroundColor: autoCharge ? "#0F2044" : "#D1D5DB",
            }}
          >
            <span
              className="absolute top-0.5 rounded-full bg-white transition-all"
              style={{
                width: 22,
                height: 22,
                left: autoCharge ? 20 : 2,
              }}
            />
          </button>
        </div>
      </div>

      {/* Preview card */}
      <div
        className="mx-4 mt-3"
        style={{
          backgroundColor: "#F7FAFC",
          border: "1px solid #E2E6ED",
          borderRadius: 12,
          padding: 16,
        }}
      >
        <div className="flex items-center gap-2 mb-2">
          <Eye size={18} color="#0F2044" />
          <div className="text-[15px] font-semibold text-[#0F2044]" style={FONT}>
            Policy preview
          </div>
        </div>
        <div className="text-[13px] text-[#374151] leading-relaxed" style={FONT}>
          {previewText}
        </div>
      </div>

      <div className="px-4 mt-3">
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="w-full rounded-xl text-white text-[15px] font-semibold disabled:opacity-60"
          style={{
            backgroundColor: "#0F2044",
            padding: "12px 16px",
            ...FONT,
          }}
        >
          {saving ? "Saving…" : "Save policy"}
        </button>
        {savedFlash && (
          <div className="text-center text-[13px] text-[#16A34A] mt-2" style={FONT}>
            Policy updated ✓
          </div>
        )}
      </div>
    </div>
  );
}
