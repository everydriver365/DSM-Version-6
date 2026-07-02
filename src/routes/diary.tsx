import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Plus, X } from "lucide-react";
import { Card } from "../components/dsm/Card";
import { SectionHeader } from "../components/dsm/SectionHeader";
import { Input } from "../components/dsm/Input";
import { Button } from "../components/dsm/Button";
import { supabase } from "../lib/supabaseClient";

export const Route = createFileRoute("/diary")({
  head: () => ({
    meta: [
      { title: "Diary — DSM by EveryDriver" },
      { name: "description", content: "Your daily diary and notes." },
    ],
  }),
  component: DiaryPage,
});

const POPPINS = { fontFamily: "Inter, sans-serif" } as const;

interface DiaryRow {
  id: string;
  title: string;
  body: string | null;
  entry_date: string;
  entry_type: string;
  created_at: string;
}

interface LessonRow {
  id: string;
  lesson_date: string;
  lesson_time: string;
  duration_minutes: number | null;
  status: string;
  pupils?: { name: string } | null;
}

const TYPES = [
  { value: "note", label: "Note" },
  { value: "reminder", label: "Reminder" },
  { value: "personal", label: "Personal" },
  { value: "work", label: "Work" },
];

function ymd(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

function sameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function monthLabel(d: Date) {
  return d.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
}

function shortDayLabel(d: Date) {
  return d
    .toLocaleDateString("en-GB", { weekday: "short", day: "2-digit", month: "short" })
    .toUpperCase();
}

function timeLabel(iso: string) {
  return new Date(iso).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function buildMonthGrid(month: Date): (Date | null)[] {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const last = new Date(month.getFullYear(), month.getMonth() + 1, 0);
  const startDow = (first.getDay() + 6) % 7; // Mon=0
  const cells: (Date | null)[] = [];
  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let d = 1; d <= last.getDate(); d++) {
    cells.push(new Date(month.getFullYear(), month.getMonth(), d));
  }
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function DiaryPage() {
  const navigate = useNavigate();
  const today = useMemo(() => new Date(), []);
  const [userId, setUserId] = useState<string | null>(null);
  const [month, setMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selected, setSelected] = useState<Date>(today);
  const [entries, setEntries] = useState<DiaryRow[]>([]);
  const [lessons, setLessons] = useState<LessonRow[]>([]);
  const [showSheet, setShowSheet] = useState(false);
  const [viewEntry, setViewEntry] = useState<DiaryRow | null>(null);

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [entryDate, setEntryDate] = useState(ymd(today));
  const [entryType, setEntryType] = useState("note");
  const [saving, setSaving] = useState(false);
  const [sheetError, setSheetError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (data.user) setUserId(data.user.id);
    })();
  }, []);

  const monthStart = useMemo(
    () => new Date(month.getFullYear(), month.getMonth(), 1),
    [month],
  );
  const monthEnd = useMemo(
    () => new Date(month.getFullYear(), month.getMonth() + 1, 0),
    [month],
  );

  const fetchMonth = async (uid: string) => {
    const startStr = ymd(monthStart);
    const endStr = ymd(monthEnd);
    const [{ data: ent, error: entErr }, { data: les, error: lesErr }] =
      await Promise.all([
        supabase
          .from("diary_entries")
          .select("id, title, body, entry_date, entry_type, created_at")
          .eq("instructor_id", uid)
          .gte("entry_date", startStr)
          .lte("entry_date", endStr)
          .order("created_at", { ascending: false }),
        supabase
          .from("lessons")
          .select(
            "id, lesson_date, lesson_time, duration_minutes, status, pupils(name)",
          )
          .eq("instructor_id", uid)
          .is("deleted_at", null)
          .neq("status", "cancelled")
          .gte("lesson_date", startStr)
          .lte("lesson_date", endStr)
          .order("lesson_time", { ascending: true }),
      ]);
    if (entErr) console.error("[diary] entries fetch", entErr);
    if (lesErr) console.error("[diary] lessons fetch", lesErr);
    setEntries((ent ?? []) as unknown as DiaryRow[]);
    setLessons((les ?? []) as unknown as LessonRow[]);
  };

  useEffect(() => {
    if (!userId) return;
    fetchMonth(userId);
  }, [userId, monthStart.getTime(), monthEnd.getTime()]);

  const entryDays = useMemo(() => {
    const s = new Set<string>();
    entries.forEach((e) => s.add(e.entry_date));
    return s;
  }, [entries]);
  const lessonDays = useMemo(() => {
    const s = new Set<string>();
    lessons.forEach((l) => s.add(l.lesson_date));
    return s;
  }, [lessons]);

  const selectedStr = ymd(selected);
  const selectedEntries = entries.filter((e) => e.entry_date === selectedStr);
  const selectedLessons = lessons.filter((l) => l.lesson_date === selectedStr);

  const grid = buildMonthGrid(month);

  const openAdd = () => {
    setTitle("");
    setBody("");
    setEntryDate(selectedStr);
    setEntryType("note");
    setSheetError(null);
    setShowSheet(true);
  };

  const save = async () => {
    if (!userId) return;
    if (!title.trim()) {
      setSheetError("Please enter a title.");
      return;
    }
    setSaving(true);
    setSheetError(null);
    const { error } = await supabase.from("diary_entries").insert({
      instructor_id: userId,
      title: title.trim(),
      body: body.trim() || null,
      entry_date: entryDate,
      entry_type: entryType,
    });
    setSaving(false);
    if (error) {
      console.error("[diary] save error", error);
      setSheetError(error.message);
      return;
    }
    setShowSheet(false);
    // jump to entry's month if outside current view
    const d = new Date(`${entryDate}T00:00:00`);
    if (
      d.getFullYear() !== month.getFullYear() ||
      d.getMonth() !== month.getMonth()
    ) {
      setMonth(new Date(d.getFullYear(), d.getMonth(), 1));
    }
    setSelected(d);
    await fetchMonth(userId);
  };

  const removeEntry = async (id: string) => {
    setEntries((prev) => prev.filter((e) => e.id !== id));
    setViewEntry(null);
    const { error } = await supabase.from("diary_entries").delete().eq("id", id);
    if (error && userId) {
      console.error("[diary] delete error", error);
      await fetchMonth(userId);
    }
  };

  const prevMonth = () =>
    setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1));
  const nextMonth = () =>
    setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1));

  return (
    <div className="min-h-screen bg-white pb-8" style={POPPINS}>
      {/* TOP BAR */}
      <div
        className="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] h-[52px] flex items-center px-3 z-50"
        style={{ background: "#072b47" }}
      >
        <button
          type="button"
          onClick={() => navigate({ to: "/home" })}
          className="p-1"
          aria-label="Back"
        >
          <ChevronLeft size={24} color="#FFFFFF" />
        </button>
        <div className="absolute left-1/2 -translate-x-1/2 text-white text-[16px] font-semibold">
          Diary
        </div>
        <button
          type="button"
          onClick={openAdd}
          className="ml-auto p-1"
          aria-label="Add entry"
        >
          <Plus size={24} color="#FFFFFF" />
        </button>
      </div>

      <div className="pt-[52px]">
        {/* Month header */}
        <div
          className="mx-4 mt-4 flex items-center justify-between"
          style={{ height: 36 }}
        >
          <button
            type="button"
            onClick={prevMonth}
            aria-label="Previous month"
            className="flex items-center justify-center rounded-md"
            style={{ width: 32, height: 32 }}
          >
            <ChevronLeft size={20} color="#00A3B4" />
          </button>
          <div className="text-[15px] font-semibold text-[#0A2540]">
            {monthLabel(month)}
          </div>
          <button
            type="button"
            onClick={nextMonth}
            aria-label="Next month"
            className="flex items-center justify-center rounded-md"
            style={{ width: 32, height: 32 }}
          >
            <ChevronRight size={20} color="#00A3B4" />
          </button>
        </div>

        {/* Calendar grid */}
        <div className="mx-4 mt-3">
          <div
            className="grid grid-cols-7"
            style={{ rowGap: 2 }}
          >
            {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
              <div
                key={i}
                className="text-center text-[11px] font-medium text-[#6B7280] pb-1"
              >
                {d}
              </div>
            ))}
            {grid.map((d, i) => {
              if (!d) return <div key={i} style={{ height: 44 }} />;
              const dStr = ymd(d);
              const isToday = sameDay(d, today);
              const isSelected = sameDay(d, selected);
              const hasLesson = lessonDays.has(dStr);
              const hasEntry = entryDays.has(dStr);
              const circleBg = isSelected
                ? "#0A2540"
                : isToday
                  ? "#00A3B4"
                  : "transparent";
              const textColor = isSelected || isToday ? "#FFFFFF" : "#0A2540";
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => setSelected(d)}
                  className="flex flex-col items-center justify-start"
                  style={{ height: 44, gap: 2 }}
                >
                  <div
                    className="flex items-center justify-center rounded-full"
                    style={{
                      width: 30,
                      height: 30,
                      backgroundColor: circleBg,
                      color: textColor,
                      fontSize: 13,
                      fontWeight: isToday || isSelected ? 600 : 400,
                    }}
                  >
                    {d.getDate()}
                  </div>
                  <div className="flex items-center" style={{ gap: 3, height: 6 }}>
                    {hasLesson && (
                      <span
                        className="rounded-full"
                        style={{ width: 4, height: 4, backgroundColor: "#00A3B4" }}
                      />
                    )}
                    {hasEntry && (
                      <span
                        className="rounded-full"
                        style={{ width: 4, height: 4, backgroundColor: "#F59E0B" }}
                      />
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div
            className="flex items-center justify-center mt-2"
            style={{ gap: 16 }}
          >
            <div className="flex items-center" style={{ gap: 6 }}>
              <span
                className="rounded-full"
                style={{ width: 6, height: 6, backgroundColor: "#00A3B4" }}
              />
              <span className="text-[11px] text-[#6B7280]">Lessons</span>
            </div>
            <div className="flex items-center" style={{ gap: 6 }}>
              <span
                className="rounded-full"
                style={{ width: 6, height: 6, backgroundColor: "#F59E0B" }}
              />
              <span className="text-[11px] text-[#6B7280]">Diary</span>
            </div>
          </div>
        </div>

        {/* Selected day content */}
        <div className="mx-4">
          <SectionHeader>SELECTED DATE · {shortDayLabel(selected)}</SectionHeader>

          {selectedLessons.length === 0 && selectedEntries.length === 0 ? (
            <div
              className="text-center py-8 text-[13px] text-[#6B7280]"
            >
              Nothing scheduled for this day.
            </div>
          ) : (
            <div className="flex flex-col" style={{ gap: 8 }}>
              {selectedLessons.map((l) => (
                <Card key={l.id} className="!py-3 !px-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="text-[14px] font-semibold text-[#0A2540] truncate">
                        {l.pupils?.name ?? "Pupil"}
                      </div>
                      <div className="text-[13px] text-[#6B7280]">
                        Lesson · {String(l.lesson_time).slice(0, 5)}
                        {l.duration_minutes ? ` · ${l.duration_minutes}m` : ""}
                      </div>
                    </div>
                    <span
                      className="text-[11px] rounded-full px-2 py-1"
                      style={{ backgroundColor: "#EEF4FB", color: "#00A3B4" }}
                    >
                      Lesson
                    </span>
                  </div>
                </Card>
              ))}

              {selectedEntries.map((e) => (
                <Card
                  key={e.id}
                  className="!py-3 !px-4 cursor-pointer"
                  onClick={() => setViewEntry(e)}
                >
                  <div className="flex items-start" style={{ gap: 12 }}>
                    <div className="flex-1 min-w-0">
                      <div className="text-[14px] font-semibold text-[#0A2540] truncate">
                        {e.title}
                      </div>
                      {e.body && (
                        <div
                          className="text-[13px] text-[#6B7280] overflow-hidden"
                          style={{
                            display: "-webkit-box",
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: "vertical",
                            marginTop: 2,
                          }}
                        >
                          {e.body}
                        </div>
                      )}
                    </div>
                    <div
                      className="text-[11px] text-[#6B7280]"
                      style={{ flexShrink: 0 }}
                    >
                      {timeLabel(e.created_at)}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ADD SHEET */}
      {showSheet && (
        <div className="fixed inset-0 z-[60] flex flex-col justify-end">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setShowSheet(false)}
          />
          <div
            className="relative w-full max-w-[430px] mx-auto bg-white rounded-t-2xl px-4 pt-5 pb-8"
            style={{
              animation: "slideUp 0.25s ease-out",
              maxHeight: "90vh",
              overflowY: "auto",
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="text-[16px] font-semibold text-[#0A2540]">
                Add entry
              </div>
              <button
                type="button"
                onClick={() => setShowSheet(false)}
                className="text-[13px] text-[#6B7280]"
              >
                Cancel
              </button>
            </div>

            <div className="flex flex-col" style={{ gap: 12 }}>
              <Input
                label="Title"
                placeholder="e.g. Call DVSA"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />

              <div className="w-full">
                <label
                  className="block mb-1 text-[12px] font-medium text-[#6B7280]"
                  style={POPPINS}
                >
                  Body
                </label>
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows={5}
                  className="w-full rounded-lg px-3 py-2 text-[14px] text-[#1A1A2E] bg-white focus:border-[#00A3B4] focus:outline-none"
                  style={{
                    fontFamily: "Inter, sans-serif",
                    borderWidth: "0.5px",
                    borderStyle: "solid",
                    borderColor: "#EEF2F7",
                    resize: "vertical",
                  }}
                />
              </div>

              <Input
                label="Date"
                type="date"
                value={entryDate}
                onChange={(e) => setEntryDate(e.target.value)}
              />

              <div className="w-full">
                <label
                  className="block mb-1 text-[12px] font-medium text-[#6B7280]"
                  style={POPPINS}
                >
                  Type
                </label>
                <select
                  value={entryType}
                  onChange={(e) => setEntryType(e.target.value)}
                  className="h-11 w-full rounded-lg px-3 text-[14px] text-[#1A1A2E] bg-white focus:border-[#00A3B4] focus:outline-none"
                  style={{
                    fontFamily: "Inter, sans-serif",
                    borderWidth: "0.5px",
                    borderStyle: "solid",
                    borderColor: "#EEF2F7",
                  }}
                >
                  {TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>

              {sheetError && (
                <div className="text-[12px]" style={{ color: "#CC2229" }}>
                  {sheetError}
                </div>
              )}

              <Button onClick={save} disabled={saving || !userId}>
                {saving ? "Saving…" : "Save entry"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* VIEW ENTRY SHEET */}
      {viewEntry && (
        <div className="fixed inset-0 z-[60] flex flex-col justify-end">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setViewEntry(null)}
          />
          <div
            className="relative w-full max-w-[430px] mx-auto bg-white rounded-t-2xl px-4 pt-5 pb-8"
            style={{
              animation: "slideUp 0.25s ease-out",
              maxHeight: "90vh",
              overflowY: "auto",
            }}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1 min-w-0">
                <div className="text-[11px] uppercase font-medium text-[#6B7280]">
                  {viewEntry.entry_type}
                </div>
                <div className="text-[18px] font-semibold text-[#0A2540]">
                  {viewEntry.title}
                </div>
                <div className="text-[12px] text-[#6B7280] mt-1">
                  {viewEntry.entry_date} · {timeLabel(viewEntry.created_at)}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewEntry(null)}
                aria-label="Close"
                className="flex items-center justify-center"
                style={{ width: 32, height: 32 }}
              >
                <X size={20} color="#6B7280" />
              </button>
            </div>

            {viewEntry.body && (
              <div
                className="text-[14px] text-[#1A1A2E] whitespace-pre-wrap"
                style={{ marginBottom: 16 }}
              >
                {viewEntry.body}
              </div>
            )}

            <button
              type="button"
              onClick={() => removeEntry(viewEntry.id)}
              className="text-[13px] font-medium py-2"
              style={{ color: "#CC2229" }}
            >
              Delete entry
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
