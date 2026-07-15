import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Zap, Medal, Trophy } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";

export const Route = createFileRoute("/rewards")({
  head: () => ({
    meta: [
      { title: "DSM Rewards" },
      { name: "description", content: "Earn points, climb tiers and see the DSM instructor leaderboard." },
    ],
  }),
  component: RewardsPage,
});

const SUPABASE_URL = "https://bjpqxfrihwjcqprmoqfs.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJqcHF4ZnJpaHdqY3Fwcm1vcWZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE0NzQ4MjEsImV4cCI6MjA5NzA1MDgyMX0.HKlgx3dxP3uxX9wMRRUnfb0IPwaBpFcut_iUgT5XFeo";

type TierKey = "bronze" | "silver" | "gold" | "platinum" | "elite";
const TIERS: Record<TierKey, { min: number; label: string; emoji: string; color: string; bg: string }> = {
  bronze:   { min: 0,    label: "Bronze",   emoji: "🥉", color: "#CD7F32", bg: "#FDF3E7" },
  silver:   { min: 500,  label: "Silver",   emoji: "🥈", color: "#9CA3AF", bg: "#F3F4F6" },
  gold:     { min: 1500, label: "Gold",     emoji: "🥇", color: "#D97706", bg: "#FFFBEB" },
  platinum: { min: 3000, label: "Platinum", emoji: "💎", color: "#6366F1", bg: "#EEF2FF" },
  elite:    { min: 6000, label: "Elite",    emoji: "⭐", color: "#0F2044", bg: "#E0F2FE" },
};
const TIER_ORDER: TierKey[] = ["bronze", "silver", "gold", "platinum", "elite"];

function tierFromPoints(pts: number): TierKey {
  let result: TierKey = "bronze";
  for (const k of TIER_ORDER) if (pts >= TIERS[k].min) result = k;
  return result;
}
function nextTierFrom(t: TierKey): TierKey | null {
  const i = TIER_ORDER.indexOf(t);
  return i >= 0 && i < TIER_ORDER.length - 1 ? TIER_ORDER[i + 1] : null;
}

const EARN_ACTIVITIES: { label: string; points: number }[] = [
  { label: "Complete EOL after lesson", points: 10 },
  { label: "Pupil passes test", points: 100 },
  { label: "Complete CPD hour", points: 15 },
  { label: "Get a 5-star review", points: 50 },
  { label: "Refer an instructor", points: 500 },
  { label: "Profile complete", points: 50 },
  { label: "1 year loyalty", points: 100 },
];

type LeaderRow = {
  instructor_id: string;
  total_points: number;
  tier: string | null;
  instructors: { name: string | null; profile_image_url: string | null } | null;
};

function initials(name?: string | null) {
  if (!name) return "?";
  return name.trim().split(/\s+/).slice(0, 2).map((s) => s[0]?.toUpperCase() ?? "").join("") || "?";
}

async function restGet<T>(path: string, token: string | null): Promise<T> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${token || SUPABASE_ANON_KEY}`,
    },
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

function RewardsPage() {
  const navigate = useNavigate();
  const currentYear = new Date().getFullYear();

  const [userId, setUserId] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [myPoints, setMyPoints] = useState<number>(0);
  const [leaderboard, setLeaderboard] = useState<LeaderRow[]>([]);
  const [showOnLeaderboard, setShowOnLeaderboard] = useState<boolean>(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: sess } = await supabase.auth.getSession();
      const uid = sess.session?.user?.id ?? null;
      const tk = sess.session?.access_token ?? null;
      setUserId(uid);
      setToken(tk);
      if (!uid) { setLoading(false); return; }
      try {
        const [mine, board, me] = await Promise.all([
          restGet<Array<{ total_points: number; tier: string | null }>>(
            `instructor_points?instructor_id=eq.${uid}&season_year=eq.${currentYear}&select=total_points,tier`,
            tk,
          ),
          restGet<LeaderRow[]>(
            `instructor_points?season_year=eq.${currentYear}&select=instructor_id,total_points,tier,instructors(name,profile_image_url)&order=total_points.desc&limit=20`,
            tk,
          ),
          restGet<Array<{ show_on_leaderboard: boolean | null }>>(
            `instructors?id=eq.${uid}&select=show_on_leaderboard`,
            tk,
          ),
        ]);
        setMyPoints(mine?.[0]?.total_points ?? 0);
        setLeaderboard(board ?? []);
        setShowOnLeaderboard(me?.[0]?.show_on_leaderboard ?? true);
      } catch (e) {
        console.error("[rewards] fetch failed", e);
      } finally {
        setLoading(false);
      }
    })();
  }, [currentYear]);

  const myTierKey = useMemo(() => tierFromPoints(myPoints), [myPoints]);
  const myTier = TIERS[myTierKey];
  const nextKey = nextTierFrom(myTierKey);
  const nextTier = nextKey ? TIERS[nextKey] : null;
  const progressPct = nextTier
    ? Math.min(100, Math.max(0, ((myPoints - myTier.min) / (nextTier.min - myTier.min)) * 100))
    : 100;
  const ptsToNext = nextTier ? Math.max(0, nextTier.min - myPoints) : 0;

  const myRank = leaderboard.findIndex((r) => r.instructor_id === userId);

  async function toggleShow(next: boolean) {
    setShowOnLeaderboard(next);
    if (!userId) return;
    try {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/instructors?id=eq.${userId}`,
        {
          method: "PATCH",
          headers: {
            apikey: SUPABASE_ANON_KEY,
            Authorization: `Bearer ${token || SUPABASE_ANON_KEY}`,
            "Content-Type": "application/json",
            Prefer: "return=minimal",
          },
          body: JSON.stringify({ show_on_leaderboard: next }),
        },
      );
      if (!res.ok) throw new Error(await res.text());
      toast.success(next ? "You'll appear on the leaderboard" : "Hidden from leaderboard");
    } catch (e) {
      console.error(e);
      toast.error("Could not update preference");
      setShowOnLeaderboard(!next);
    }
  }

  return (
    <div style={{ background: "#FFFFFF", minHeight: "100vh" }}>
      {/* Top bar */}
      <div
        style={{
          background: "#0F2044",
          color: "#FFFFFF",
          padding: "14px 16px",
          display: "flex",
          alignItems: "center",
          gap: 12,
          position: "sticky",
          top: 0,
          zIndex: 10,
        }}
      >
        <button
          onClick={() => navigate({ to: "/home" })}
          aria-label="Back"
          style={{ background: "transparent", border: 0, color: "#fff", padding: 4, display: "flex" }}
        >
          <ArrowLeft size={22} />
        </button>
        <div style={{ fontWeight: 800, fontSize: 17 }}>DSM Rewards</div>
      </div>

      {/* Hero */}
      <div
        style={{
          background: `linear-gradient(160deg, ${myTier.color} 0%, ${myTier.color}CC 60%, #0F2044 100%)`,
          padding: "24px 16px",
          textAlign: "center",
          color: "#fff",
        }}
      >
        <div style={{ fontSize: 44, lineHeight: 1 }}>{myTier.emoji}</div>
        <div style={{ marginTop: 6, fontWeight: 900, fontSize: 22 }}>{myTier.label}</div>
        <div style={{ marginTop: 10, fontWeight: 900, fontSize: 36 }}>
          {loading ? "—" : myPoints.toLocaleString()} pts
        </div>
        {nextTier ? (
          <div style={{ marginTop: 14 }}>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.75)" }}>
              {ptsToNext.toLocaleString()} pts to {nextTier.label}
            </div>
            <div
              style={{
                marginTop: 8,
                background: "rgba(255,255,255,0.2)",
                borderRadius: 999,
                height: 8,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: `${progressPct}%`,
                  height: "100%",
                  background: "#fff",
                  borderRadius: 999,
                  transition: "width 300ms ease",
                }}
              />
            </div>
          </div>
        ) : (
          <div style={{ marginTop: 12, fontSize: 13, color: "rgba(255,255,255,0.75)" }}>
            Top tier reached
          </div>
        )}
        <div style={{ marginTop: 12, fontSize: 12, color: "rgba(255,255,255,0.5)" }}>
          Season {currentYear}
        </div>
      </div>

      {/* How to earn */}
      <div
        style={{
          background: "#FFFFFF",
          border: "0.5px solid #E2E6ED",
          borderRadius: 12,
          padding: 16,
          margin: "16px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <Zap size={18} color="#D97706" />
          <div style={{ fontWeight: 800, color: "#0B1F3A", fontSize: 15 }}>How to earn points</div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {EARN_ACTIVITIES.map((a) => (
            <div
              key={a.label}
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 6,
                padding: 10,
                borderRadius: 10,
                background: "#F7F9FC",
                border: "0.5px solid #E2E6ED",
              }}
            >
              <div style={{ fontSize: 12, color: "#0B1F3A", fontWeight: 600, lineHeight: 1.25 }}>
                {a.label}
              </div>
              <span
                style={{
                  alignSelf: "flex-start",
                  fontSize: 11,
                  fontWeight: 800,
                  padding: "2px 8px",
                  borderRadius: 999,
                  background: "#E0F4FF",
                  color: "#1A52A0",
                }}
              >
                +{a.points} pts
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Leaderboard */}
      <div
        style={{
          background: "#FFFFFF",
          border: "0.5px solid #E2E6ED",
          borderRadius: 12,
          padding: 16,
          margin: "12px 16px 0",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Medal size={18} color="#D97706" />
          <div style={{ fontWeight: 800, color: "#0B1F3A", fontSize: 15 }}>
            Leaderboard {currentYear}
          </div>
        </div>
        <div style={{ fontSize: 13, color: "#6B7280", marginBottom: 12 }}>
          Top 20 DSM instructors
        </div>

        {loading ? (
          <div style={{ color: "#6B7280", fontSize: 13, padding: "12px 0" }}>Loading…</div>
        ) : leaderboard.length === 0 ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              color: "#6B7280",
              fontSize: 13,
              padding: "12px 0",
            }}
          >
            <Trophy size={16} color="#9CA3AF" />
            No leaderboard entries yet this season.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {leaderboard.map((row, i) => {
              const rank = i + 1;
              const isMe = row.instructor_id === userId;
              const rankColor =
                rank === 1 ? "#D97706" : rank === 2 ? "#9CA3AF" : rank === 3 ? "#CD7F32" : "#0B1F3A";
              const tKey = (row.tier as TierKey) || tierFromPoints(row.total_points || 0);
              const t = TIERS[tKey] || TIERS.bronze;
              const name = row.instructors?.name || "Instructor";
              const avatar = row.instructors?.profile_image_url || null;
              return (
                <div
                  key={row.instructor_id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "8px 10px",
                    borderRadius: 10,
                    background: isMe ? "#E0F4FF" : "#FFFFFF",
                    borderLeft: isMe ? "4px solid #1A52A0" : "4px solid transparent",
                    border: isMe ? undefined : "0.5px solid #F0F2F5",
                  }}
                >
                  <div
                    style={{
                      width: 24,
                      textAlign: "center",
                      fontWeight: 800,
                      color: rankColor,
                      fontSize: 14,
                    }}
                  >
                    {rank}
                  </div>
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 999,
                      background: "#F3F4F6",
                      color: "#0B1F3A",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 800,
                      fontSize: 12,
                      overflow: "hidden",
                      flexShrink: 0,
                    }}
                  >
                    {avatar ? (
                      <img
                        src={avatar}
                        alt={name}
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      />
                    ) : (
                      initials(name)
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 700,
                        color: "#0B1F3A",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {isMe ? `${name} (You)` : name}
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: 14 }}>{t.emoji}</span>
                    <span style={{ fontWeight: 800, color: "#0B1F3A", fontSize: 13 }}>
                      {(row.total_points || 0).toLocaleString()}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {!loading && userId && myRank === -1 && (
          <div style={{ marginTop: 10, fontSize: 12, color: "#6B7280" }}>
            You're not in the top 20 yet — keep earning points!
          </div>
        )}
      </div>

      {/* Settings */}
      <div style={{ padding: 16, marginTop: 4 }}>
        <div
          style={{
            background: "#FFFFFF",
            border: "0.5px solid #E2E6ED",
            borderRadius: 12,
            padding: "12px 14px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#0B1F3A" }}>
              Show me on leaderboard
            </div>
            <div style={{ fontSize: 12, color: "#6B7280", marginTop: 2 }}>
              Turn off to hide your name and points from other instructors.
            </div>
          </div>
          <label style={{ position: "relative", display: "inline-block", width: 44, height: 26 }}>
            <input
              type="checkbox"
              checked={showOnLeaderboard}
              onChange={(e) => toggleShow(e.target.checked)}
              style={{ opacity: 0, width: 0, height: 0 }}
            />
            <span
              style={{
                position: "absolute",
                inset: 0,
                background: showOnLeaderboard ? "#1A52A0" : "#D1D5DB",
                borderRadius: 999,
                transition: "background 200ms",
              }}
            />
            <span
              style={{
                position: "absolute",
                top: 3,
                left: showOnLeaderboard ? 21 : 3,
                width: 20,
                height: 20,
                background: "#fff",
                borderRadius: 999,
                transition: "left 200ms",
                boxShadow: "0 1px 2px rgba(0,0,0,0.2)",
              }}
            />
          </label>
        </div>
      </div>

      <div style={{ height: 32 }} />
    </div>
  );
}