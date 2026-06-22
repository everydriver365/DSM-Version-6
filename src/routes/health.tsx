import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Droplets,
  Smile,
  Activity,
  Coffee,
  X,
  Heart,
} from "lucide-react";
import { toast } from "sonner";
import { Card } from "../components/dsm/Card";
import { Input } from "../components/dsm/Input";
import { Button } from "../components/dsm/Button";
import { SectionHeader } from "../components/dsm/SectionHeader";
import { supabase } from "../lib/supabaseClient";

export const Route = createFileRoute("/health")({
  head: () => ({
    meta: [{ title: "Health & wellbeing — DSM by EveryDriver" }],
  }),
  component: HealthPage,
});

const POPPINS = { fontFamily: "Poppins, sans-serif" } as const;

interface Log {
  log_date: string;
  water_glasses: number;
  mood: number | null;
  steps: number | null;
  breaks_taken: number;
}

const MOODS = ["😩", "😕", "😐", "🙂", "😄"];
const TIPS = [
  "Take a 5 min break every 2 hours to reduce fatigue",
  "Stay hydrated — aim for 8 glasses of water per day",
  "Stretch between lessons to reduce back strain",
];

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function HealthPage() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [logs, setLogs] = useState<Log[]>([]);
  const [moodOpen, setMoodOpen] = useState(false);
  const [stepsOpen, setStepsOpen] = useState(false);
  const [tipIndex, setTipIndex] = useState(0);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (data.user) setUserId(data.user.id);
    })();
  }, []);

  useEffect(() => {
    const t = setInterval(
      () => setTipIndex((i) => (i + 1) % TIPS.length),
      6000,
    );
    return () => clearInterval(t);
  }, []);

  async function load(uid: string) {
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - 6);
    const since = weekStart.toISOString().slice(0, 10);
    const { data, error } = await supabase
      .from("health_logs")
      .select("log_date, water_glasses, mood, steps, breaks_taken")
      .eq("instructor_id", uid)
      .gte("log_date", since)
      .order("log_date", { ascending: false });
    if (error) console.error("[health] fetch error", error);
    setLogs((data ?? []) as unknown as Log[]);
  }

  useEffect(() => {
    if (userId) load(userId);
  }, [userId]);

  const today = useMemo<Log>(() => {
    const iso = todayISO();
    return (
      logs.find((l) => l.log_date === iso) ?? {
        log_date: iso,
        water_glasses: 0,
        mood: null,
        steps: null,
        breaks_taken: 0,
      }
    );
  }, [logs]);

  const week = useMemo(() => {
    const moods = logs.filter((l) => l.mood != null);
    const avgMood =
      moods.length > 0
        ? moods.reduce((s, l) => s + (l.mood ?? 0), 0) / moods.length
        : 0;
    const totalWater = logs.reduce((s, l) => s + (l.water_glasses ?? 0), 0);
    const breakDays = logs.filter((l) => (l.breaks_taken ?? 0) > 0).length;
    return { avgMood, totalWater, breakDays };
  }, [logs]);

  async function upsertToday(patch: Partial<Log>) {
    if (!userId) return;
    const iso = todayISO();
    const next: Log = {
      log_date: iso,
      water_glasses: today.water_glasses,
      mood: today.mood,
      steps: today.steps,
      breaks_taken: today.breaks_taken,
      ...patch,
    };
    // optimistic
    setLogs((prev) => {
      const others = prev.filter((l) => l.log_date !== iso);
      return [next, ...others];
    });
    const { error } = await supabase
      .from("health_logs")
      .upsert(
        {
          instructor_id: userId,
          log_date: iso,
          water_glasses: next.water_glasses,
          mood: next.mood,
          steps: next.steps,
          breaks_taken: next.breaks_taken,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "instructor_id,log_date" },
      );
    if (error) {
      console.error("[health] upsert error", error);
      toast.error("Couldn't save");
      load(userId);
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
        <div
          className="flex-1 text-center text-[15px] font-semibold text-white"
          style={POPPINS}
        >
          Health & wellbeing
        </div>
        <div style={{ width: 40 }} />
      </div>

      <div className="px-4">
        <SectionHeader>TODAY</SectionHeader>
        <Card className="bg-white">
          <div className="grid grid-cols-2" style={{ gap: 8 }}>
            <QuickLog
              icon={<Droplets size={20} color="#1A52A0" />}
              tint="#DBEAFE"
              label="Log water"
              onClick={() =>
                upsertToday({
                  water_glasses: Math.min(today.water_glasses + 1, 20),
                })
              }
            />
            <QuickLog
              icon={<Smile size={20} color="#16A34A" />}
              tint="#ECFDF5"
              label="Log mood"
              onClick={() => setMoodOpen(true)}
            />
            <QuickLog
              icon={<Activity size={20} color="#F59E0B" />}
              tint="#FEF3C7"
              label="Log steps"
              onClick={() => setStepsOpen(true)}
            />
            <QuickLog
              icon={<Coffee size={20} color="#CC2229" />}
              tint="#FEE2E2"
              label="Log break"
              onClick={() =>
                upsertToday({ breaks_taken: today.breaks_taken + 1 })
              }
            />
          </div>

          <div className="mt-4">
            <div
              className="flex items-center justify-between text-[13px]"
              style={{ color: "#6B7280" }}
            >
              <span>Water today</span>
              <span style={{ color: "#0F2044", fontWeight: 600 }}>
                {today.water_glasses} / 8 glasses
              </span>
            </div>
            <div className="mt-2 flex items-center" style={{ gap: 6 }}>
              {Array.from({ length: 8 }).map((_, i) => {
                const filled = i < today.water_glasses;
                return (
                  <div
                    key={i}
                    className="flex items-center justify-center"
                    style={{
                      width: 28,
                      height: 32,
                      borderRadius: 6,
                      backgroundColor: filled ? "#DBEAFE" : "#F8F9FB",
                      border: "0.5px solid #E2E6ED",
                    }}
                  >
                    <Droplets
                      size={14}
                      color={filled ? "#1A52A0" : "#C7CCD3"}
                    />
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-3 grid grid-cols-3" style={{ gap: 8 }}>
            <MiniStat
              label="MOOD"
              value={today.mood != null ? MOODS[today.mood - 1] : "—"}
            />
            <MiniStat
              label="STEPS"
              value={today.steps != null ? today.steps.toLocaleString() : "—"}
            />
            <MiniStat label="BREAKS" value={String(today.breaks_taken)} />
          </div>
        </Card>

        <SectionHeader>THIS WEEK</SectionHeader>
        <Card className="bg-white">
          <div className="grid grid-cols-3" style={{ gap: 8 }}>
            <MiniStat
              label="AVG MOOD"
              value={
                week.avgMood > 0
                  ? MOODS[Math.round(week.avgMood) - 1] ?? "—"
                  : "—"
              }
            />
            <MiniStat label="WATER" value={`${week.totalWater}`} />
            <MiniStat label="BREAK DAYS" value={`${week.breakDays}`} />
          </div>
        </Card>

        <SectionHeader>TIPS</SectionHeader>
        <Card className="bg-white">
          <div
            className="text-[14px]"
            style={{ color: "#0F2044", lineHeight: 1.5 }}
          >
            {TIPS[tipIndex]}
          </div>
          <div className="mt-3 flex items-center justify-center" style={{ gap: 6 }}>
            {TIPS.map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`Tip ${i + 1}`}
                onClick={() => setTipIndex(i)}
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: 3,
                  backgroundColor: i === tipIndex ? "#1A52A0" : "#E2E6ED",
                }}
              />
            ))}
          </div>
        </Card>
      </div>

      {moodOpen && (
        <SheetShell title="HOW ARE YOU FEELING?" onClose={() => setMoodOpen(false)}>
          <div className="flex items-center justify-between" style={{ gap: 8 }}>
            {MOODS.map((emoji, i) => {
              const value = i + 1;
              const active = today.mood === value;
              return (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => {
                    upsertToday({ mood: value });
                    setMoodOpen(false);
                  }}
                  className="flex items-center justify-center"
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 28,
                    backgroundColor: active ? "#DBEAFE" : "#F8F9FB",
                    border: active
                      ? "1px solid #1A52A0"
                      : "0.5px solid #E2E6ED",
                    fontSize: 28,
                  }}
                >
                  {emoji}
                </button>
              );
            })}
          </div>
        </SheetShell>
      )}

      {stepsOpen && (
        <StepsSheet
          initial={today.steps ?? 0}
          onClose={() => setStepsOpen(false)}
          onSave={(v) => {
            upsertToday({ steps: v });
            setStepsOpen(false);
          }}
        />
      )}
    </div>
  );
}

function QuickLog({
  icon,
  tint,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  tint: string;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center"
      style={{
        gap: 10,
        padding: 12,
        borderRadius: 10,
        border: "0.5px solid #E2E6ED",
        backgroundColor: "#FFFFFF",
      }}
    >
      <div
        className="flex items-center justify-center shrink-0"
        style={{
          width: 32,
          height: 32,
          borderRadius: 16,
          backgroundColor: tint,
        }}
      >
        {icon}
      </div>
      <span
        className="text-[13px] font-semibold text-left"
        style={{ color: "#0F2044" }}
      >
        {label}
      </span>
    </button>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        padding: 10,
        borderRadius: 8,
        backgroundColor: "#F8F9FB",
        border: "0.5px solid #E2E6ED",
      }}
    >
      <div
        className="text-[10px] tracking-wider font-semibold"
        style={{ color: "#6B7280" }}
      >
        {label}
      </div>
      <div
        className="mt-0.5 font-bold"
        style={{ color: "#0F2044", fontSize: 16 }}
      >
        {value}
      </div>
    </div>
  );
}

function SheetShell({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      style={POPPINS}
    >
      <div
        className="absolute inset-0"
        style={{ backgroundColor: "rgba(15,32,68,0.5)" }}
        onClick={onClose}
        aria-hidden
      />
      <div
        className="relative w-full bg-white"
        style={{
          borderTopLeftRadius: 16,
          borderTopRightRadius: 16,
          maxHeight: "92vh",
          overflowY: "auto",
          paddingBottom: 24,
        }}
      >
        <div className="flex items-center justify-between px-4 pt-4">
          <span
            className="text-[11px] font-semibold tracking-wider"
            style={{ color: "#6B7280" }}
          >
            {title}
          </span>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="flex items-center justify-center"
            style={{ width: 32, height: 32 }}
          >
            <X size={18} color="#6B7280" />
          </button>
        </div>
        <div className="px-4 pt-2 pb-2">{children}</div>
      </div>
    </div>
  );
}

function StepsSheet({
  initial,
  onClose,
  onSave,
}: {
  initial: number;
  onClose: () => void;
  onSave: (v: number) => void;
}) {
  const [val, setVal] = useState(initial ? String(initial) : "");
  return (
    <SheetShell title="LOG STEPS" onClose={onClose}>
      <div className="flex flex-col" style={{ gap: 12 }}>
        <Input
          label="Steps today"
          type="number"
          inputMode="numeric"
          min="0"
          step="1"
          value={val}
          onChange={(e) => setVal(e.target.value)}
          placeholder="e.g. 6500"
        />
        <div className="grid grid-cols-2" style={{ gap: 8 }}>
          <Button variant="ghost" onClick={onClose} type="button">
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => {
              const n = Math.max(0, Math.floor(Number(val) || 0));
              onSave(n);
            }}
          >
            Save
          </Button>
        </div>
      </div>
    </SheetShell>
  );
}
