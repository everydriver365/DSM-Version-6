import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Users,
  Car,
  PoundSterling,
  Receipt,
  Star,
  GraduationCap,
  BookOpen,
  Calendar as CalendarIcon,
  Clock,
  CheckCircle2,
  Lock,
  type LucideIcon,
} from "lucide-react";
import { SectionHeader } from "../components/dsm/SectionHeader";
import { Card } from "../components/dsm/Card";
import { supabase } from "../lib/supabaseClient";

export const Route = createFileRoute("/rewards")({
  head: () => ({
    meta: [
      { title: "Rewards & badges — DSM by EveryDriver" },
      { name: "description", content: "Earn points and badges as you grow your driving school." },
    ],
  }),
  component: RewardsPage,
});

const POPPINS = { fontFamily: "Poppins, sans-serif" } as const;

interface Stats {
  pupils: number;
  lessonsCompleted: number;
  payments: number;
  paymentsTotal: number;
  expenses: number;
  reviews: number;
  passRate: number; // 0-100
  passedCount: number;
  cpdEntries: number;
  cpdHours: number;
  mileageEntries: number;
  mileageMiles: number;
  checklistCompletions: number;
  perfectWeek: boolean;
  earlyMornings: number;
}

function tierFor(points: number) {
  if (points >= 2000)
    return { name: "Platinum", color: "#E5E4E2", textColor: "#0F2044", next: null as number | null };
  if (points >= 1000)
    return { name: "Gold", color: "#FFD700", textColor: "#0F2044", next: 2000 };
  if (points >= 500)
    return { name: "Silver", color: "#C0C0C0", textColor: "#0F2044", next: 1000 };
  return { name: "Bronze", color: "#CD7F32", textColor: "#FFFFFF", next: 500 };
}

function RewardsPage() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (data.user) setUserId(data.user.id);
    })();
  }, []);

  useEffect(() => {
    if (!userId) return;
    (async () => {
      setLoading(true);
      const safeCount = async (
        table: string,
        build?: (q: ReturnType<typeof baseQuery>) => ReturnType<typeof baseQuery>,
      ) => {
        function baseQuery() {
          return supabase.from(table).select("*", { count: "exact", head: true }).eq("instructor_id", userId);
        }
        const q = build ? build(baseQuery()) : baseQuery();
        const { count, error } = await q;
        if (error) {
          console.warn(`[rewards] ${table}`, error.message);
          return 0;
        }
        return count ?? 0;
      };
      const safeSum = async (table: string, column: string): Promise<number> => {
        const { data, error } = await supabase
          .from(table)
          .select(column)
          .eq("instructor_id", userId);
        if (error) {
          console.warn(`[rewards] sum ${table}.${column}`, error.message);
          return 0;
        }
        const rows = (data ?? []) as unknown as Array<Record<string, unknown>>;
        return rows.reduce((a, r) => a + (Number(r[column] ?? 0) || 0), 0);
      };

      const [
        pupils,
        lessonsCompleted,
        payments,
        paymentsTotal,
        expenses,
        reviews,
        cpdEntries,
        cpdHours,
        mileageEntries,
        mileageMiles,
        checklistCompletions,
      ] = await Promise.all([
        safeCount("pupils", (q) => q.is("deleted_at", null)),
        safeCount("lessons", (q) => q.eq("status", "completed")),
        safeCount("payments"),
        safeSum("payments", "amount"),
        safeCount("expenses"),
        safeCount("reviews"),
        safeCount("cpd_entries"),
        safeSum("cpd_entries", "hours"),
        safeCount("mileage_logs"),
        safeSum("mileage_logs", "miles"),
        safeCount("checklist_completions"),
      ]);

      // Pass rate & passed count
      const { data: tests } = await supabase
        .from("driving_tests")
        .select("result, pupil_id")
        .eq("instructor_id", userId)
        .not("result", "is", null);
      const decided = (tests ?? []).filter((t) => t.result === "Pass" || t.result === "Fail");
      const passes = decided.filter((t) => t.result === "Pass");
      const passRate = decided.length > 0 ? (passes.length / decided.length) * 100 : 0;
      const passedCount = new Set(passes.map((p) => (p as { pupil_id: string }).pupil_id)).size;

      // Early bird — lessons before 08:00
      const { data: earlyLessons } = await supabase
        .from("lessons")
        .select("lesson_date")
        .eq("instructor_id", userId);
      const earlyMornings = (earlyLessons ?? []).filter((l) => {
        const d = new Date((l as { lesson_date: string }).lesson_date);
        return d.getHours() < 8;
      }).length;

      // Perfect week — last 7 days, all lessons completed (≥1 lesson)
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const { data: weekLessons } = await supabase
        .from("lessons")
        .select("status")
        .eq("instructor_id", userId)
        .gte("lesson_date", weekAgo.toISOString());
      const ws = weekLessons ?? [];
      const perfectWeek =
        ws.length > 0 &&
        ws.every((l) => {
          const s = (l as { status: string }).status;
          return s === "completed";
        });

      setStats({
        pupils,
        lessonsCompleted,
        payments,
        paymentsTotal,
        expenses,
        reviews,
        passRate,
        passedCount,
        cpdEntries,
        cpdHours,
        mileageEntries,
        mileageMiles,
        checklistCompletions,
        perfectWeek,
        earlyMornings,
      });
      setLoading(false);
    })();
  }, [userId]);

  const earn = stats
    ? [
        { label: "Add a pupil", count: stats.pupils, per: 10, points: stats.pupils * 10 },
        { label: "Complete a lesson", count: stats.lessonsCompleted, per: 5, points: stats.lessonsCompleted * 5 },
        { label: "Record a payment", count: stats.payments, per: 2, points: stats.payments * 2 },
        { label: "Log expenses", count: stats.expenses, per: 1, points: stats.expenses * 1 },
        { label: "Add a review", count: stats.reviews, per: 20, points: stats.reviews * 20 },
        {
          label: "Pass rate >80%",
          count: stats.passRate > 80 ? 1 : 0,
          per: 50,
          points: stats.passRate > 80 ? 50 : 0,
          suffix: `${stats.passRate.toFixed(0)}%`,
        },
        { label: "Complete CPD", count: stats.cpdEntries, per: 15, points: stats.cpdEntries * 15 },
        { label: "Fill in mileage", count: stats.mileageEntries, per: 1, points: stats.mileageEntries * 1 },
        {
          label: "Complete daily checklist",
          count: stats.checklistCompletions,
          per: 5,
          points: stats.checklistCompletions * 5,
        },
      ]
    : [];

  const points = earn.reduce((a, e) => a + e.points, 0);
  const tier = tierFor(points);
  const toNext = tier.next != null ? tier.next - points : 0;

  interface BadgeDef {
    name: string;
    desc: string;
    Icon: LucideIcon;
    color: string;
    earned: boolean;
  }
  const badges: BadgeDef[] = stats
    ? [
        { name: "First pupil", desc: "Add your first pupil", Icon: Users, color: "#16A34A", earned: stats.pupils >= 1 },
        { name: "Road to success", desc: "Complete 10 lessons", Icon: Car, color: "#1A52A0", earned: stats.lessonsCompleted >= 10 },
        { name: "Money maker", desc: "Record £1000 in payments", Icon: PoundSterling, color: "#F59E0B", earned: stats.paymentsTotal >= 1000 },
        { name: "Record keeper", desc: "Log 30 expenses", Icon: Receipt, color: "#7C3AED", earned: stats.expenses >= 30 },
        { name: "Top rated", desc: "Get 5 reviews", Icon: Star, color: "#F59E0B", earned: stats.reviews >= 5 },
        { name: "Pass master", desc: "10 pupils passed test", Icon: GraduationCap, color: "#16A34A", earned: stats.passedCount >= 10 },
        { name: "CPD champion", desc: "Log 20 CPD hours", Icon: BookOpen, color: "#1A52A0", earned: stats.cpdHours >= 20 },
        { name: "Mileage master", desc: "Log 1000 miles", Icon: Car, color: "#6B7280", earned: stats.mileageMiles >= 1000 },
        { name: "Perfect week", desc: "Complete all lessons in a week", Icon: CalendarIcon, color: "#16A34A", earned: stats.perfectWeek },
        { name: "Early bird", desc: "Add 5 lessons before 8am", Icon: Clock, color: "#F59E0B", earned: stats.earlyMornings >= 5 },
      ]
    : [];

  return (
    <div className="min-h-screen bg-white pb-12" style={POPPINS}>
      <div
        className="sticky top-0 z-40 flex items-center justify-between px-2"
        style={{ height: 52, backgroundColor: "#0F2044" }}
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
          Rewards &amp; badges
        </div>
        <div style={{ width: 40 }} />
      </div>

      {/* Points card */}
      <div
        className="mx-4 mt-3"
        style={{ backgroundColor: "#0F2044", borderRadius: 12, padding: 16, color: "#FFFFFF" }}
      >
        <div
          className="text-[10px] uppercase"
          style={{ color: "#9CA3AF", letterSpacing: "0.06em" }}
        >
          DSM Rewards
        </div>
        <div className="flex items-end justify-between mt-1" style={{ gap: 12 }}>
          <div className="text-[36px] font-bold leading-none">
            {loading ? "—" : points.toLocaleString()}
            <span className="text-[14px] font-medium ml-2" style={{ color: "#9CA3AF" }}>
              pts
            </span>
          </div>
          <span
            className="text-[12px] font-semibold"
            style={{
              backgroundColor: tier.color,
              color: tier.textColor,
              borderRadius: 999,
              padding: "4px 10px",
            }}
          >
            {tier.name}
          </span>
        </div>
        <div className="text-[13px] mt-2" style={{ color: "#9CA3AF" }}>
          {tier.next == null
            ? "Max tier reached — well done!"
            : `${Math.max(0, toNext).toLocaleString()} points to ${tierFor(tier.next).name}`}
        </div>
      </div>

      <div className="px-4">
        <SectionHeader>HOW TO EARN</SectionHeader>
        <Card>
          <div className="flex flex-col" style={{ gap: 10 }}>
            {earn.map((e) => (
              <div
                key={e.label}
                className="flex items-center justify-between"
                style={{ gap: 12 }}
              >
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-medium" style={{ color: "#0F2044" }}>
                    {e.label}
                  </div>
                  <div className="text-[11px]" style={{ color: "#6B7280" }}>
                    {e.count}
                    {("suffix" in e && e.suffix) ? ` · ${e.suffix}` : ""} · {e.per}pt
                    {e.per === 1 ? "" : "s"} each
                  </div>
                </div>
                <span
                  className="text-[12px] font-semibold shrink-0"
                  style={{
                    backgroundColor: "#EEF4FB",
                    color: "#1A52A0",
                    borderRadius: 999,
                    padding: "3px 10px",
                  }}
                >
                  +{e.points}
                </span>
              </div>
            ))}
          </div>
        </Card>

        <SectionHeader>BADGES</SectionHeader>
        <div className="grid grid-cols-2" style={{ gap: 8 }}>
          {badges.map((b) => {
            const Icon = b.Icon;
            const circleBg = b.earned ? b.color : "#E2E6ED";
            return (
              <Card key={b.name}>
                <div className="flex items-start justify-between" style={{ gap: 8 }}>
                  <div
                    className="flex items-center justify-center"
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 999,
                      backgroundColor: circleBg,
                      opacity: b.earned ? 1 : 0.6,
                    }}
                  >
                    <Icon size={22} color={b.earned ? "#FFFFFF" : "#9CA3AF"} />
                  </div>
                  {b.earned ? (
                    <CheckCircle2 size={18} color="#16A34A" />
                  ) : (
                    <Lock size={16} color="#9CA3AF" />
                  )}
                </div>
                <div
                  className="text-[12px] font-semibold mt-2"
                  style={{ color: b.earned ? "#0F2044" : "#6B7280" }}
                >
                  {b.name}
                </div>
                <div className="text-[11px]" style={{ color: "#6B7280" }}>
                  {b.desc}
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default RewardsPage;
