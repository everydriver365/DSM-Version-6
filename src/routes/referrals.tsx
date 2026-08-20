import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { tokens } from "@/lib/tokens";
import { useEffect, useState } from "react";
import { IconGift, IconShare } from "@tabler/icons-react";
import { EmptyState } from "@/components/dsm/EmptyState";
import DSMTopSheet from "@/components/dsm/DSMTopSheet";
import { toast } from "sonner";
import { Card } from "../components/dsm/Card";
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
  if (s === "booked") return "#1877D6";
  if (s === "paid") return "#1877D6";
  return "#1877D6";
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
    <DSMTopSheet title="Referrals">
      <div style={{ fontFamily: "Poppins, sans-serif" }}>


      {/* Hero stat card */}
      <div
        className="mx-4 mt-4"
        style={{
          background: "linear-gradient(150deg, #0F2A4D, #0B1F3A)",
          borderRadius: tokens.radiusCard,
          padding: "26px 16px",
          textAlign: "center",
          boxShadow: "0 6px 0 #050D1C, 0 18px 36px rgba(0,0,0,0.3)",
        }}
      >
        <div className="flex" style={{ gap: 0 }}>
          <div className="flex-1 flex flex-col items-center">
            <div
              style={{
                color: "#7C8BA3",
                fontSize: 10.5,
                fontWeight: tokens.fontWeight.bold,
                letterSpacing: 0.6,
                textTransform: "uppercase",
              }}
            >
              Total referrals
            </div>
            <div
              style={{
                fontSize: 34,
                fontWeight: 900,
                letterSpacing: -1,
                marginTop: 8,
                color: tokens.white,
                ...POPPINS,
              }}
            >
              {total}
            </div>
          </div>
          <div
            style={{ borderLeft: "1px solid rgba(255,255,255,0.1)", margin: "0 16px" }}
          />
          <div className="flex-1 flex flex-col items-center">
            <div
              style={{
                color: "#7C8BA3",
                fontSize: 10.5,
                fontWeight: tokens.fontWeight.bold,
                letterSpacing: 0.6,
                textTransform: "uppercase",
              }}
            >
              Earned from referrals
            </div>
            <div
              style={{
                fontSize: 34,
                fontWeight: 900,
                letterSpacing: -1,
                marginTop: 8,
                color: "#3B94E8",
                ...POPPINS,
              }}
            >
              £{earned.toFixed(2)}
            </div>
          </div>
        </div>
      </div>

      {/* Referral code card */}
      <div
        className="mx-4 mt-4"
        style={{
          background: tokens.white,
          borderRadius: tokens.radiusCard,
          padding: 16,
          boxShadow: "0 4px 0 #E4E4E8, 0 14px 30px rgba(0,0,0,0.06)",
        }}
      >
        <div
          style={{
            color: "#8A8A8E",
            fontSize: 11.5,
            fontWeight: tokens.fontWeight.bold,
            letterSpacing: 0.4,
            textTransform: "uppercase",
            marginBottom: 8,
          }}
        >
          Your referral code
        </div>
        <div
          style={{
            color: "#000000",
            fontSize: 24,
            fontWeight: 900,
            letterSpacing: 2,
            marginBottom: 18,
            ...POPPINS,
          }}
        >
          {code}
        </div>
        <button
          type="button"
          onClick={share}
          className="w-full flex items-center justify-center"
          style={{
            background: tokens.blue,
            color: tokens.white,
            fontSize: 15,
            fontWeight: tokens.fontWeight.extrabold,
            padding: 16,
            borderRadius: tokens.radiusCard,
            boxShadow: "0 4px 0 #0F52A8",
            gap: 8,
            border: "none",
            fontFamily: "Poppins, sans-serif",
          }}
        >
          <IconShare size={18} color="#FFFFFF" />
          <span>Share</span>
        </button>
      </div>

      {/* Referral History section label */}
      <div className="px-4 mt-6 mb-3 flex items-center" style={{ gap: 8 }}>
        <div
          style={{
            width: 3,
            height: 14,
            backgroundColor: tokens.blue,
            borderRadius: 12,
          }}
        />
        <div
          style={{
            color: tokens.blue,
            fontSize: 12,
            fontWeight: tokens.fontWeight.extrabold,
            letterSpacing: 0.6,
            textTransform: "uppercase",
          }}
        >
          Referral history
        </div>
      </div>

      <div className="px-4">
        {referrals.length === 0 ? (
          <EmptyState
            icon={<IconGift size={32} color="#9CA3AF" stroke={1.5} />}
            title="No referrals yet"
            subtitle="Share your referral link to earn rewards"
          />
        ) : (
          <div className="flex flex-col" style={{ gap: 8 }}>
            {referrals.map((r) => (
              <Card key={r.id}>
                <div className="flex items-start justify-between" style={{ gap: 8 }}>
                  <div className="min-w-0">
                    <div
                      className="text-[14px] font-semibold truncate"
                      style={{ color: tokens.navy, ...POPPINS }}
                    >
                      {r.referred_name}
                    </div>
                    <div className="mt-1 flex items-center" style={{ gap: 8 }}>
                      <span
                        className="text-[10px] font-semibold px-2 py-[2px]"
                        style={{
                          color: statusColor(r.status),
                          backgroundColor: `${statusColor(r.status)}14`,
                          borderRadius: 8,
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
                      style={{ color: tokens.blue, ...POPPINS }}
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
    </DSMTopSheet>
  );
}
