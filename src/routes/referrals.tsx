import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Gift, Share2 } from "lucide-react";
import { toast } from "sonner";
import { Card } from "../components/dsm/Card";
import { Button } from "../components/dsm/Button";
import { SectionHeader } from "../components/dsm/SectionHeader";
import { supabase } from "../lib/supabaseClient";

export const Route = createFileRoute("/referrals")({
  head: () => ({
    meta: [{ title: "Referrals — DSM by EveryDriver" }],
  }),
  component: ReferralsPage,
});

const POPPINS = { fontFamily: "Poppins, sans-serif" } as const;

type Status = "pending" | "booked" | "paid";

interface Referral {
  id: string;
  referred_name: string;
  status: Status;
  reward_amount: number;
  created_at: string;
}

function statusColor(s: Status) {
  if (s === "booked") return "#16A34A";
  if (s === "paid") return "#1A52A0";
  return "#F59E0B";
}

function statusLabel(s: Status) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function formatShortDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function codeFromId(id: string) {
  return id.replace(/-/g, "").slice(0, 8).toUpperCase();
}

function ReferralsPage() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [referrals, setReferrals] = useState<Referral[]>([]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (data.user) setUserId(data.user.id);
    })();
  }, []);

  useEffect(() => {
    if (!userId) return;
    (async () => {
      const { data, error } = await supabase
        .from("referrals")
        .select("id, referred_name, status, reward_amount, created_at")
        .eq("instructor_id", userId)
        .order("created_at", { ascending: false });
      if (error) console.error("[referrals] fetch error", error);
      setReferrals((data ?? []) as unknown as Referral[]);
    })();
  }, [userId]);

  const code = userId ? codeFromId(userId) : "--------";
  const total = referrals.length;
  const earned = referrals
    .filter((r) => r.status === "paid")
    .reduce((s, r) => s + Number(r.reward_amount || 0), 0);

  async function share() {
    const text = `Book your driving lessons with me! Use code ${code} for a discount.`;
    const nav = typeof navigator !== "undefined" ? (navigator as Navigator & { share?: (d: ShareData) => Promise<void> }) : null;
    if (nav?.share) {
      try {
        await nav.share({ text });
        return;
      } catch {
        // user cancelled or share failed — fall through to clipboard
      }
    }
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Copied to clipboard");
    } catch {
      toast.error("Couldn't share");
    }
  }

  return (
    <div className="min-h-screen bg-white pb-8" style={POPPINS}>
      {/* Top bar */}
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
        <div className="flex-1 text-center text-[15px] font-semibold text-white" style={POPPINS}>
          Referrals
        </div>
        <div style={{ width: 40, height: 40 }} />
      </div>

      {/* Summary card */}
      <div
        className="mx-4 mt-3 flex flex-col items-center"
        style={{ backgroundColor: "#0F2044", borderRadius: 12, padding: 16 }}
      >
        <div className="text-[11px] tracking-wider font-semibold" style={{ color: "#9CA3AF" }}>
          TOTAL REFERRALS
        </div>
        <div className="text-white font-bold mt-1" style={{ fontSize: 28, lineHeight: 1, ...POPPINS }}>
          {total}
        </div>
        <div className="text-[11px] tracking-wider font-semibold mt-3" style={{ color: "#9CA3AF" }}>
          EARNED FROM REFERRALS
        </div>
        <div className="font-bold mt-1" style={{ fontSize: 24, color: "#F59E0B", ...POPPINS }}>
          £{earned.toFixed(2)}
        </div>
      </div>

      {/* Share card */}
      <div
        className="mx-4 mt-3"
        style={{
          backgroundColor: "white",
          border: "0.5px solid #E2E6ED",
          borderRadius: 12,
          padding: 16,
        }}
      >
        <div
          className="text-[11px] font-semibold tracking-wider"
          style={{ color: "#6B7280", textTransform: "uppercase" }}
        >
          Your referral code
        </div>
        <div
          className="font-bold mt-1"
          style={{ fontSize: 20, color: "#0F2044", letterSpacing: 1.5, ...POPPINS }}
        >
          {code}
        </div>
        <div className="mt-3">
          <Button onClick={share} type="button">
            <span className="inline-flex items-center justify-center" style={{ gap: 6 }}>
              <Share2 size={16} color="#FFFFFF" />
              Share
            </span>
          </Button>
        </div>
      </div>

      <div className="px-4">
        <SectionHeader>REFERRAL HISTORY</SectionHeader>
        {referrals.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center text-[13px]"
            style={{ color: "#6B7280", padding: "32px 0" }}
          >
            <Gift size={28} color="#6B7280" />
            <div className="mt-2">No referrals yet</div>
          </div>
        ) : (
          <div className="flex flex-col" style={{ gap: 8 }}>
            {referrals.map((r) => (
              <Card key={r.id}>
                <div className="flex items-start justify-between" style={{ gap: 8 }}>
                  <div className="min-w-0">
                    <div
                      className="text-[14px] font-semibold truncate"
                      style={{ color: "#0F2044", ...POPPINS }}
                    >
                      {r.referred_name}
                    </div>
                    <div className="mt-1 flex items-center" style={{ gap: 8 }}>
                      <span
                        className="text-[10px] font-semibold px-2 py-[2px]"
                        style={{
                          color: statusColor(r.status),
                          backgroundColor: `${statusColor(r.status)}14`,
                          borderRadius: 4,
                          textTransform: "uppercase",
                          letterSpacing: 0.4,
                        }}
                      >
                        {statusLabel(r.status)}
                      </span>
                      <span className="text-[11px]" style={{ color: "#6B7280" }}>
                        {formatShortDate(r.created_at)}
                      </span>
                    </div>
                  </div>
                  {r.status === "paid" && Number(r.reward_amount) > 0 && (
                    <div
                      className="shrink-0 text-[14px] font-bold"
                      style={{ color: "#16A34A", ...POPPINS }}
                    >
                      £{Number(r.reward_amount).toFixed(2)}
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
