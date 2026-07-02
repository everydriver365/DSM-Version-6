import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ChevronLeft } from "lucide-react";
import { Card } from "../components/dsm/Card";
import { SectionHeader } from "../components/dsm/SectionHeader";
import { Button } from "../components/dsm/Button";
import { supabase } from "../lib/supabaseClient";

export const Route = createFileRoute("/availability")({
  head: () => ({
    meta: [
      { title: "Availability — DSM by EveryDriver" },
      { name: "description", content: "Set your working days and lesson preferences." },
    ],
  }),
  component: AvailabilityPage,
});

const POPPINS = { fontFamily: "Inter, sans-serif" } as const;

const DAYS = [
  { key: "mon", label: "Monday" },
  { key: "tue", label: "Tuesday" },
  { key: "wed", label: "Wednesday" },
  { key: "thu", label: "Thursday" },
  { key: "fri", label: "Friday" },
  { key: "sat", label: "Saturday" },
  { key: "sun", label: "Sunday" },
] as const;
type DayKey = (typeof DAYS)[number]["key"];

const DURATIONS = [60, 90, 120, 180, 240, 300] as const;
const BREAKS = [0, 15, 30, 45, 60] as const;

type Days = Record<DayKey, boolean>;

const DEFAULT_DAYS: Days = {
  mon: true, tue: true, wed: true, thu: true, fri: true, sat: false, sun: false,
};

function AvailabilityPage() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [days, setDays] = useState<Days>(DEFAULT_DAYS);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("17:00");
  const [duration, setDuration] = useState<number>(60);
  const [breakMins, setBreakMins] = useState<number>(0);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      const uid = data.user?.id ?? null;
      setUserId(uid);
      if (!uid) return;
      const { data: row, error: fetchErr } = await supabase
        .from("working_hours")
        .select("mon, tue, wed, thu, fri, sat, sun, start_time, end_time, lesson_duration_minutes, break_minutes")
        .eq("instructor_id", uid)
        .maybeSingle();
      if (fetchErr) console.error("[availability] fetch error", fetchErr);
      if (row) {
        setDays({
          mon: !!row.mon, tue: !!row.tue, wed: !!row.wed, thu: !!row.thu,
          fri: !!row.fri, sat: !!row.sat, sun: !!row.sun,
        });
        if (row.start_time) setStartTime(String(row.start_time).slice(0, 5));
        if (row.end_time) setEndTime(String(row.end_time).slice(0, 5));
        if (row.lesson_duration_minutes) setDuration(Number(row.lesson_duration_minutes));
        if (row.break_minutes != null) setBreakMins(Number(row.break_minutes));
      }
    })();
  }, []);

  const toggleDay = (k: DayKey) => setDays((d) => ({ ...d, [k]: !d[k] }));

  const save = async () => {
    if (!userId) return;
    setError(null);
    setSavedMsg(null);
    setSaving(true);
    const { error: upErr } = await supabase.from("working_hours").upsert(
      {
        instructor_id: userId,
        ...days,
        start_time: startTime,
        end_time: endTime,
        lesson_duration_minutes: duration,
        break_minutes: breakMins,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "instructor_id" },
    );
    setSaving(false);
    if (upErr) {
      console.error("[availability] save error", upErr);
      setError(upErr.message);
      return;
    }
    setSavedMsg("Saved");
    setTimeout(() => setSavedMsg(null), 2000);
  };

  return (
    <div className="min-h-screen bg-white pb-8 pb-safe" style={POPPINS}>
      <div
        className="sticky top-0 z-40 flex items-center px-2"
        style={{ height: 52, backgroundColor: "#0B1F3A" }}
      >
        <button
          type="button"
          aria-label="Back"
          onClick={() => navigate({ to: "/settings" })}
          className="flex items-center justify-center"
          style={{ width: 40, height: 40 }}
        >
          <ChevronLeft size={24} color="#FFFFFF" />
        </button>
        <div className="flex-1 text-center text-white text-[15px] font-semibold">Availability</div>
        <div style={{ width: 40 }} />
      </div>

      <div className="px-4">
        <SectionHeader>WORKING DAYS</SectionHeader>
        <Card className="!p-0">
          {DAYS.map((d, i) => {
            const on = days[d.key];
            return (
              <div
                key={d.key}
                className="px-4 py-3"
                style={i === 0 ? undefined : { borderTopWidth: "0.5px", borderTopStyle: "solid", borderTopColor: "#EEF2F7" }}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[14px] text-[#0B1F3A]">{d.label}</span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={on}
                    aria-label={`${d.label} working`}
                    onClick={() => toggleDay(d.key)}
                    className="relative inline-flex items-center rounded-full transition-colors"
                    style={{ width: 40, height: 22, backgroundColor: on ? "#1877D6" : "#EEF2F7" }}
                  >
                    <span
                      className="inline-block rounded-full bg-white transition-transform"
                      style={{ width: 18, height: 18, transform: `translateX(${on ? 20 : 2}px)` }}
                    />
                  </button>
                </div>
                {on && (
                  <div className="flex gap-3 mt-3">
                    <div className="flex-1">
                      <label className="block mb-1 text-[11px] font-medium text-[#6B7280] uppercase" style={{ letterSpacing: "0.05em" }}>
                        Start
                      </label>
                      <input
                        type="time"
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value)}
                        className="h-10 w-full rounded-lg px-3 text-[14px] text-[#0B1F3A] bg-white focus:border-[#1877D6] focus:outline-none"
                        style={{ fontFamily: "Inter, sans-serif", borderWidth: "0.5px", borderStyle: "solid", borderColor: "#EEF2F7" }}
                      />
                    </div>
                    <div className="flex-1">
                      <label className="block mb-1 text-[11px] font-medium text-[#6B7280] uppercase" style={{ letterSpacing: "0.05em" }}>
                        End
                      </label>
                      <input
                        type="time"
                        value={endTime}
                        onChange={(e) => setEndTime(e.target.value)}
                        className="h-10 w-full rounded-lg px-3 text-[14px] text-[#0B1F3A] bg-white focus:border-[#1877D6] focus:outline-none"
                        style={{ fontFamily: "Inter, sans-serif", borderWidth: "0.5px", borderStyle: "solid", borderColor: "#EEF2F7" }}
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </Card>

        <SectionHeader>LESSON DURATION</SectionHeader>
        <Card className="!p-2">
          <Segmented
            options={[
              { value: 60, label: "1h" },
              { value: 90, label: "1.5h" },
              { value: 120, label: "2h" },
              { value: 180, label: "3h" },
              { value: 240, label: "4h" },
              { value: 300, label: "5h" },
            ]}
            value={duration}
            onChange={setDuration}
          />
        </Card>

        <SectionHeader>BREAK BETWEEN LESSONS</SectionHeader>
        <Card className="!p-2">
          <Segmented
            options={BREAKS.map((b) => ({ value: b, label: b === 0 ? "None" : `${b} min` }))}
            value={breakMins}
            onChange={setBreakMins}
          />
        </Card>

        {error && <div className="mt-3 text-[12px]" style={{ color: "#CC2229" }}>{error}</div>}
        {savedMsg && <div className="mt-3 text-[12px]" style={{ color: "#16A34A" }}>{savedMsg}</div>}

        <div className="mt-6">
          <Button onClick={save} disabled={saving || !userId}>
            {saving ? "Saving…" : "Save availability"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function Segmented<T extends number>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex" style={{ gap: 4 }}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className="flex-1 h-9 rounded-md text-[12px] font-medium transition-colors"
            style={{
              backgroundColor: active ? "#1877D6" : "transparent",
              color: active ? "#FFFFFF" : "#6B7280",
              fontFamily: "Inter, sans-serif",
            }}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
