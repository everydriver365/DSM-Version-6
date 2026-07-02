import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Plus, X, ClipboardCheck } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { Card } from "../components/dsm/Card";
import { Input } from "../components/dsm/Input";
import { Button } from "../components/dsm/Button";
import { SectionHeader } from "../components/dsm/SectionHeader";
import { supabase } from "../lib/supabaseClient";

export const Route = createFileRoute("/standards")({
  head: () => ({
    meta: [{ title: "Standards check — DSM by EveryDriver" }],
  }),
  component: StandardsPage,
});

const POPPINS = { fontFamily: "Inter, sans-serif" } as const;

type Grade = "A" | "B" | "C" | "D";

interface Check {
  id: string;
  check_date: string;
  grade: string;
  examiner_name: string | null;
  test_centre: string | null;
  notes: string | null;
}

const GRADE_COLORS: Record<string, string> = {
  A: "#16A34A",
  B: "#00A3B4",
  C: "#F59E0B",
  D: "#CC2229",
};

function gradeColor(g: string) {
  return GRADE_COLORS[g] ?? "#6B7280";
}

function formatShortDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function daysAgo(iso: string) {
  const ms = Date.now() - new Date(iso).getTime();
  return Math.max(0, Math.floor(ms / 86400000));
}

const checkSchema = z.object({
  check_date: z.string().min(1, "Date required"),
  grade: z.enum(["A", "B", "C", "D"]),
  examiner_name: z.string().max(120).optional(),
  test_centre: z.string().max(120).optional(),
  notes: z.string().max(2000).optional(),
});

function StandardsPage() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [checks, setChecks] = useState<Check[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [addOpen, setAddOpen] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (data.user) setUserId(data.user.id);
    })();
  }, []);

  async function load(uid: string) {
    const { data, error } = await supabase
      .from("standards_checks")
      .select("id, check_date, grade, examiner_name, test_centre, notes")
      .eq("instructor_id", uid)
      .order("check_date", { ascending: false });
    if (error) console.error("[standards] fetch error", error);
    setChecks((data ?? []) as unknown as Check[]);
  }

  useEffect(() => {
    if (userId) load(userId);
  }, [userId]);

  const latest = useMemo(() => checks[0], [checks]);

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
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
          Standards check
        </div>
        <button
          type="button"
          aria-label="Add check"
          onClick={() => setAddOpen(true)}
          className="flex items-center justify-center"
          style={{ width: 40, height: 40 }}
        >
          <Plus size={22} color="#FFFFFF" />
        </button>
      </div>

      {/* Summary */}
      {latest && (
        <div
          className="mx-4 mt-3 flex items-center"
          style={{
            backgroundColor: "#0A2540",
            borderRadius: 12,
            padding: 16,
            gap: 16,
          }}
        >
          <div
            className="flex items-center justify-center font-bold text-white"
            style={{
              width: 64,
              height: 64,
              borderRadius: 32,
              backgroundColor: gradeColor(latest.grade),
              fontSize: 32,
            }}
          >
            {latest.grade}
          </div>
          <div className="flex-1 min-w-0">
            <div
              className="text-[11px] tracking-wider font-semibold"
              style={{ color: "#9CA3AF" }}
            >
              LAST GRADE
            </div>
            <div className="text-white mt-1" style={{ fontSize: 14 }}>
              Last checked: {daysAgo(latest.check_date)} day
              {daysAgo(latest.check_date) === 1 ? "" : "s"} ago
            </div>
            {latest.examiner_name && (
              <div
                className="text-[12px] mt-0.5"
                style={{ color: "#9CA3AF" }}
              >
                {latest.examiner_name}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="px-4">
        <SectionHeader>RECENT CHECKS</SectionHeader>
        {checks.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center text-[13px]"
            style={{ color: "#6B7280", padding: "32px 0" }}
          >
            <ClipboardCheck size={28} color="#6B7280" />
            <div className="mt-2">No standards checks recorded</div>
          </div>
        ) : (
          <div className="flex flex-col" style={{ gap: 8 }}>
            {checks.map((c) => {
              const isOpen = expanded.has(c.id);
              return (
                <Card key={c.id} className="bg-white">
                  <button
                    type="button"
                    onClick={() => toggle(c.id)}
                    className="w-full text-left"
                  >
                    <div className="flex items-start" style={{ gap: 12 }}>
                      <div
                        className="flex items-center justify-center shrink-0 font-bold text-white"
                        style={{
                          width: 44,
                          height: 44,
                          borderRadius: 22,
                          backgroundColor: gradeColor(c.grade),
                          fontSize: 20,
                        }}
                      >
                        {c.grade}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div
                          className="text-[14px] font-bold"
                          style={{ color: "#0A2540" }}
                        >
                          {formatShortDate(c.check_date)}
                        </div>
                        {c.examiner_name && (
                          <div
                            className="text-[13px] mt-0.5"
                            style={{ color: "#6B7280" }}
                          >
                            {c.examiner_name}
                            {c.test_centre ? ` · ${c.test_centre}` : ""}
                          </div>
                        )}
                        {c.notes && (
                          <div
                            className="text-[12px] mt-1"
                            style={{
                              color: "#6B7280",
                              whiteSpace: isOpen ? "pre-wrap" : "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          >
                            {c.notes}
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {addOpen && userId && (
        <AddCheckSheet
          userId={userId}
          onClose={() => setAddOpen(false)}
          onAdded={() => {
            setAddOpen(false);
            load(userId);
          }}
        />
      )}
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
        <div className="px-4 pt-2">{children}</div>
      </div>
    </div>
  );
}

function AddCheckSheet({
  userId,
  onClose,
  onAdded,
}: {
  userId: string;
  onClose: () => void;
  onAdded: () => void;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const [checkDate, setCheckDate] = useState(today);
  const [grade, setGrade] = useState<Grade>("A");
  const [examiner, setExaminer] = useState("");
  const [centre, setCentre] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  async function save() {
    if (saving) return;
    const parsed = checkSchema.safeParse({
      check_date: checkDate,
      grade,
      examiner_name: examiner.trim() || undefined,
      test_centre: centre.trim() || undefined,
      notes: notes.trim() || undefined,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Invalid input");
      return;
    }
    setSaving(true);
    const v = parsed.data;
    const { error } = await supabase.from("standards_checks").insert({
      instructor_id: userId,
      check_date: v.check_date,
      grade: v.grade,
      examiner_name: v.examiner_name ?? null,
      test_centre: v.test_centre ?? null,
      notes: v.notes ?? null,
    });
    setSaving(false);
    if (error) {
      console.error("[standards] insert error", error);
      toast.error("Couldn't save check");
      return;
    }
    toast.success("Standards check added");
    onAdded();
  }

  return (
    <SheetShell title="ADD STANDARDS CHECK" onClose={onClose}>
      <div className="flex flex-col" style={{ gap: 12 }}>
        <Input
          label="Date"
          type="date"
          value={checkDate}
          onChange={(e) => setCheckDate(e.target.value)}
        />
        <div>
          <label
            className="block text-[11px] font-semibold tracking-wider mb-1"
            style={{ color: "#6B7280" }}
          >
            GRADE
          </label>
          <div className="grid grid-cols-4" style={{ gap: 8 }}>
            {(["A", "B", "C", "D"] as Grade[]).map((g) => {
              const active = grade === g;
              return (
                <button
                  key={g}
                  type="button"
                  onClick={() => setGrade(g)}
                  className="flex items-center justify-center font-bold"
                  style={{
                    height: 44,
                    borderRadius: 10,
                    backgroundColor: active ? gradeColor(g) : "#F8F9FB",
                    color: active ? "#FFFFFF" : gradeColor(g),
                    border: active
                      ? "1px solid transparent"
                      : "0.5px solid #EEF2F7",
                    fontSize: 18,
                  }}
                >
                  {g}
                </button>
              );
            })}
          </div>
        </div>
        <Input
          label="Examiner name"
          value={examiner}
          onChange={(e) => setExaminer(e.target.value)}
          placeholder="e.g. J. Smith"
        />
        <Input
          label="Test centre"
          value={centre}
          onChange={(e) => setCentre(e.target.value)}
          placeholder="e.g. Manchester"
        />
        <div>
          <label
            className="block text-[11px] font-semibold tracking-wider mb-1"
            style={{ color: "#6B7280" }}
          >
            NOTES
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={5}
            className="w-full text-[14px]"
            style={{
              border: "0.5px solid #EEF2F7",
              borderRadius: 8,
              padding: 10,
              color: "#0A2540",
              outline: "none",
              resize: "vertical",
            }}
            placeholder="Examiner feedback, areas to improve…"
          />
        </div>
        <div className="mt-2 grid grid-cols-2" style={{ gap: 8 }}>
          <Button variant="ghost" onClick={onClose} type="button">
            Cancel
          </Button>
          <Button onClick={save} disabled={saving} type="button">
            {saving ? "Saving…" : "Save"}
          </Button>
        </div>
      </div>
    </SheetShell>
  );
}
