import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ChevronLeft, Plus, CheckSquare, Trash2 } from "lucide-react";
import { Card } from "../components/dsm/Card";
import { SectionHeader } from "../components/dsm/SectionHeader";
import { Input } from "../components/dsm/Input";
import { Button } from "../components/dsm/Button";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { supabase } from "../lib/supabaseClient";

export const Route = createFileRoute("/todos")({
  head: () => ({
    meta: [
      { title: "To-do — DSM by EveryDriver" },
      { name: "description", content: "Track your to-do items." },
    ],
  }),
  component: TodosPage,
});

const POPPINS = { fontFamily: "Inter, sans-serif" } as const;

type Priority = "high" | "medium" | "low";

interface TodoRow {
  id: string;
  title: string;
  due_date: string | null;
  priority: Priority;
  completed: boolean;
}

function ymd(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatDateLabel(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function priorityColor(p: Priority) {
  if (p === "high") return "#CC2229";
  if (p === "medium") return "#F59E0B";
  return "#16A34A";
}

function TodosPage() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [todos, setTodos] = useState<TodoRow[]>([]);
  const [showSheet, setShowSheet] = useState(false);

  const [pendingDelete, setPendingDelete] = useState<TodoRow | null>(null);

  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [priority, setPriority] = useState<Priority>("medium");
  const [saving, setSaving] = useState(false);
  const [sheetError, setSheetError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (data.user) setUserId(data.user.id);
    })();
  }, []);

  const fetchTodos = async (uid: string) => {
    const { data, error } = await supabase
      .from("todos")
      .select("id, title, due_date, priority, completed")
      .eq("instructor_id", uid)
      .is("deleted_at", null)
      .order("due_date", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: false });
    if (error) console.error("[todos] fetch error", error);
    setTodos((data ?? []) as unknown as TodoRow[]);
  };

  useEffect(() => {
    if (!userId) return;
    fetchTodos(userId);
  }, [userId]);

  const today = ymd(new Date());
  const dueToday = todos.filter((t) => !t.completed && t.due_date === today);
  const upcoming = todos.filter(
    (t) => !t.completed && (!t.due_date || t.due_date > today),
  );
  const overdue = todos.filter((t) => !t.completed && t.due_date && t.due_date < today);
  const completed = todos.filter((t) => t.completed);

  const openSheet = () => {
    setTitle("");
    setDueDate(today);
    setPriority("medium");
    setSheetError(null);
    setShowSheet(true);
  };

  const saveTodo = async () => {
    if (!userId) return;
    if (!title.trim()) {
      setSheetError("Please enter a title.");
      return;
    }
    setSaving(true);
    setSheetError(null);
    const { error } = await supabase.from("todos").insert({
      instructor_id: userId,
      title: title.trim(),
      due_date: dueDate || null,
      priority,
      completed: false,
    });
    setSaving(false);
    if (error) {
      console.error("[todos] insert error", error);
      setSheetError(error.message);
      return;
    }
    setShowSheet(false);
    await fetchTodos(userId);
  };

  const toggleCompleted = async (t: TodoRow) => {
    const next = !t.completed;
    setTodos((prev) => prev.map((x) => (x.id === t.id ? { ...x, completed: next } : x)));
    const { error } = await supabase
      .from("todos")
      .update({ completed: next })
      .eq("id", t.id);
    if (error) {
      console.error("[todos] toggle error", error);
      if (userId) await fetchTodos(userId);
    }
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    const id = pendingDelete.id;
    setPendingDelete(null);
    setTodos((prev) => prev.filter((x) => x.id !== id));
    const { error } = await supabase
      .from("todos")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id);
    if (error) {
      console.error("[todos] delete error", error);
      if (userId) await fetchTodos(userId);
    }
  };

  const renderRow = (t: TodoRow) => (
    <Card
      key={t.id}
      className="!py-3 !px-4"
      style={t.completed ? { backgroundColor: "#F8F9FB", opacity: 0.6 } : undefined}
    >
      <div className="flex items-center" style={{ gap: 12 }}>
        <button
          type="button"
          onClick={() => toggleCompleted(t)}
          aria-label={t.completed ? "Mark incomplete" : "Mark complete"}
          className="flex items-center justify-center rounded"
          style={{
            width: 22,
            height: 22,
            borderWidth: "1px",
            borderStyle: "solid",
            borderColor: t.completed ? "#16A34A" : "#EEF2F7",
            backgroundColor: t.completed ? "#16A34A" : "#FFFFFF",
            flexShrink: 0,
          }}
        >
          {t.completed && <CheckSquare size={14} color="#FFFFFF" />}
        </button>
        <div className="flex-1 min-w-0">
          <div
            className="text-[14px] font-semibold truncate"
            style={{
              color: t.completed ? "#6B7280" : "#0B1F3A",
              textDecoration: t.completed ? "line-through" : "none",
            }}
          >
            {t.title}
          </div>
          {t.due_date && (
            <div className="text-[12px] text-[#6B7280] mt-0.5">
              {formatDateLabel(t.due_date)}
            </div>
          )}
        </div>
        <span
          className="text-[10px] uppercase font-medium px-2 py-0.5 rounded-full"
          style={{
            color: "#FFFFFF",
            backgroundColor: priorityColor(t.priority),
            letterSpacing: "0.05em",
            flexShrink: 0,
          }}
        >
          {t.priority}
        </span>
        <button
          type="button"
          onClick={() => setPendingDelete(t)}
          aria-label="Delete task"
          className="flex items-center justify-center"
          style={{ width: 28, height: 28, flexShrink: 0 }}
        >
          <Trash2 size={16} color="#CC2229" />
        </button>
      </div>
    </Card>
  );

  return (
    <div className="min-h-screen bg-white pb-8" style={POPPINS}>
      {/* TOP BAR */}
      <div
        className="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] h-[52px] flex items-center px-3 z-50"
        style={{ background: "#0B1F3A" }}
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
          To-do
        </div>
        <button
          type="button"
          onClick={openSheet}
          className="ml-auto p-1"
          aria-label="Add to-do"
        >
          <Plus size={24} color="#FFFFFF" />
        </button>
      </div>

      <div className="pt-[52px]">
        <div className="mx-4">
          {overdue.length > 0 && (
            <>
              <SectionHeader>OVERDUE</SectionHeader>
              <div className="flex flex-col" style={{ gap: 8 }}>
                {overdue.map(renderRow)}
              </div>
            </>
          )}

          <SectionHeader>DUE TODAY</SectionHeader>
          {dueToday.length === 0 ? (
            <div className="text-[13px] text-[#6B7280] py-2">Nothing due today</div>
          ) : (
            <div className="flex flex-col" style={{ gap: 8 }}>
              {dueToday.map(renderRow)}
            </div>
          )}

          <SectionHeader>UPCOMING</SectionHeader>
          {upcoming.length === 0 ? (
            <div className="text-[13px] text-[#6B7280] py-2">No upcoming to-dos</div>
          ) : (
            <div className="flex flex-col" style={{ gap: 8 }}>
              {upcoming.map(renderRow)}
            </div>
          )}

          <SectionHeader>COMPLETED</SectionHeader>
          {completed.length === 0 ? (
            <div className="text-[13px] text-[#6B7280] py-2">Nothing completed yet</div>
          ) : (
            <div className="flex flex-col" style={{ gap: 8 }}>
              {completed.map(renderRow)}
            </div>
          )}
        </div>
      </div>

      {/* ADD TODO SHEET */}
      {showSheet && (
        <div className="fixed inset-0 z-[60] flex flex-col justify-end">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setShowSheet(false)}
          />
          <div
            className="relative w-full max-w-[430px] mx-auto bg-white rounded-t-2xl px-4 pt-5 pb-8"
            style={{ animation: "slideUp 0.25s ease-out" }}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="text-[16px] font-semibold text-[#0B1F3A]">Add to-do</div>
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
                placeholder="e.g. Call pupil about reschedule"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />

              <div>
                <label
                  className="block mb-1 text-[12px] font-medium text-[#6B7280]"
                  style={{ fontFamily: "Inter, sans-serif" }}
                >
                  Due date
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="h-11 w-full rounded-lg px-3 text-[14px] text-[#0B1F3A] bg-white focus:border-[#1877D6] focus:outline-none"
                  style={{
                    fontFamily: "Inter, sans-serif",
                    borderWidth: "0.5px",
                    borderStyle: "solid",
                    borderColor: "#EEF2F7",
                  }}
                />
              </div>

              <div>
                <label
                  className="block mb-1 text-[12px] font-medium text-[#6B7280]"
                  style={{ fontFamily: "Inter, sans-serif" }}
                >
                  Priority
                </label>
                <div className="flex" style={{ gap: 4 }}>
                  {(["high", "medium", "low"] as Priority[]).map((p) => {
                    const active = priority === p;
                    return (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setPriority(p)}
                        className="flex-1 h-10 rounded-md text-[13px] font-medium capitalize transition-colors"
                        style={{
                          backgroundColor: active ? priorityColor(p) : "transparent",
                          color: active ? "#FFFFFF" : "#6B7280",
                          fontFamily: "Inter, sans-serif",
                          borderWidth: active ? 0 : "0.5px",
                          borderStyle: "solid",
                          borderColor: "#EEF2F7",
                        }}
                      >
                        {p}
                      </button>
                    );
                  })}
                </div>
              </div>

              {sheetError && (
                <div className="text-[12px]" style={{ color: "#CC2229" }}>
                  {sheetError}
                </div>
              )}

              <Button onClick={saveTodo} disabled={saving || !userId}>
                {saving ? "Saving…" : "Save to-do"}
              </Button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
      `}</style>

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Delete this task?"
        confirmLabel="Delete"
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
