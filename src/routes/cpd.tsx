import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Plus,
  X,
  BookOpen,
  GraduationCap,
  Users,
  Video,
  FileText,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { Card } from "../components/dsm/Card";
import { Input } from "../components/dsm/Input";
import { Button } from "../components/dsm/Button";
import { SectionHeader } from "../components/dsm/SectionHeader";
import { supabase } from "../lib/supabaseClient";

export const Route = createFileRoute("/cpd")({
  head: () => ({
    meta: [{ title: "CPD log — DSM by EveryDriver" }],
  }),
  component: CpdPage,
});

const POPPINS = { fontFamily: "Poppins, sans-serif" } as const;
const TARGET_HOURS = 40;

type Category = "training" | "course" | "conference" | "webinar" | "reading" | "other";

const CATEGORIES: { key: Category; label: string }[] = [
  { key: "training", label: "Training" },
  { key: "course", label: "Course" },
  { key: "conference", label: "Conference" },
  { key: "webinar", label: "Webinar" },
  { key: "reading", label: "Reading" },
  { key: "other", label: "Other" },
];

interface Entry {
  id: string;
  title: string;
  category: Category;
  hours: number;
  entry_date: string;
  description: string | null;
}

function catColor(c: Category) {
  if (c === "training") return "#1A52A0";
  if (c === "course") return "#16A34A";
  if (c === "conference") return "#F59E0B";
  if (c === "webinar") return "#1A52A0";
  if (c === "reading") return "#16A34A";
  return "#6B7280";
}

function CatIcon({ c, size = 16 }: { c: Category; size?: number }) {
  const color = "#FFFFFF";
  if (c === "training") return <GraduationCap size={size} color={color} />;
  if (c === "course") return <BookOpen size={size} color={color} />;
  if (c === "conference") return <Users size={size} color={color} />;
  if (c === "webinar") return <Video size={size} color={color} />;
  if (c === "reading") return <FileText size={size} color={color} />;
  return <Sparkles size={size} color={color} />;
}

function catLabel(c: Category) {
  return CATEGORIES.find((x) => x.key === c)?.label ?? "Other";
}

function formatShortDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

const entrySchema = z.object({
  title: z.string().trim().min(1, "Title required").max(120),
  category: z.enum(["training", "course", "conference", "webinar", "reading", "other"]),
  hours: z.number().positive("Hours must be > 0").max(999),
  entry_date: z.string().min(1, "Date required"),
  description: z.string().trim().max(1000).optional().or(z.literal("")),
});

function CpdPage() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [addOpen, setAddOpen] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (data.user) setUserId(data.user.id);
    })();
  }, []);

  async function load(uid: string) {
    const { data, error } = await supabase
      .from("cpd_entries")
      .select("id, title, category, hours, entry_date, description")
      .eq("instructor_id", uid)
      .order("entry_date", { ascending: false });
    if (error) console.error("[cpd] fetch error", error);
    setEntries((data ?? []) as unknown as Entry[]);
  }

  useEffect(() => {
    if (userId) load(userId);
  }, [userId]);

  const now = new Date();
  const yearStart = new Date(now.getFullYear(), 0, 1);
  const yearHours = entries
    .filter((e) => new Date(e.entry_date) >= yearStart)
    .reduce((s, e) => s + Number(e.hours), 0);
  const totalHours = entries.reduce((s, e) => s + Number(e.hours), 0);
  const progress = Math.min(100, (yearHours / TARGET_HOURS) * 100);

  return (
    <div className="min-h-screen bg-white pb-8" style={POPPINS}>
      {/* Top bar */}
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
          CPD log
        </div>
        <button
          type="button"
          aria-label="Add entry"
          onClick={() => setAddOpen(true)}
          className="flex items-center justify-center"
          style={{ width: 40, height: 40 }}
        >
          <Plus size={22} color="#FFFFFF" />
        </button>
      </div>

      {/* Summary card */}
      <div
        className="mx-4 mt-3"
        style={{ backgroundColor: "#0F2044", borderRadius: 12, padding: 16 }}
      >
        <div className="grid grid-cols-2" style={{ gap: 12 }}>
          <div>
            <div className="text-[11px] tracking-wider font-semibold" style={{ color: "#9CA3AF" }}>
              THIS YEAR
            </div>
            <div className="text-white font-bold mt-1" style={{ fontSize: 24, ...POPPINS }}>
              {yearHours.toFixed(1)}h
            </div>
          </div>
          <div className="text-right">
            <div className="text-[11px] tracking-wider font-semibold" style={{ color: "#9CA3AF" }}>
              TOTAL HOURS
            </div>
            <div className="text-white font-bold mt-1" style={{ fontSize: 24, ...POPPINS }}>
              {totalHours.toFixed(1)}h
            </div>
          </div>
        </div>
        <div className="mt-3">
          <div
            className="w-full overflow-hidden"
            style={{ height: 8, borderRadius: 4, backgroundColor: "rgba(255,255,255,0.15)" }}
          >
            <div
              style={{
                width: `${progress}%`,
                height: "100%",
                backgroundColor: "#1A52A0",
                borderRadius: 4,
                transition: "width 200ms",
              }}
            />
          </div>
          <div className="mt-2 text-[12px]" style={{ color: "#9CA3AF" }}>
            {yearHours.toFixed(1)} / {TARGET_HOURS} hours target
          </div>
        </div>
      </div>

      <div className="px-4">
        <SectionHeader>CPD ENTRIES</SectionHeader>
        {entries.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center text-[13px]"
            style={{ color: "#6B7280", padding: "32px 0" }}
          >
            <BookOpen size={28} color="#6B7280" />
            <div className="mt-2">No CPD entries yet</div>
          </div>
        ) : (
          <div className="flex flex-col" style={{ gap: 8 }}>
            {entries.map((e) => (
              <Card key={e.id}>
                <div className="flex items-start" style={{ gap: 12 }}>
                  <div
                    className="flex items-center justify-center shrink-0"
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 18,
                      backgroundColor: catColor(e.category),
                    }}
                  >
                    <CatIcon c={e.category} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between" style={{ gap: 8 }}>
                      <div
                        className="text-[14px] font-semibold truncate"
                        style={{ color: "#0F2044", ...POPPINS }}
                      >
                        {e.title}
                      </div>
                      <div
                        className="text-[14px] font-bold shrink-0"
                        style={{ color: "#0F2044", ...POPPINS }}
                      >
                        {Number(e.hours).toFixed(1)}h
                      </div>
                    </div>
                    <div className="mt-1 flex items-center" style={{ gap: 8 }}>
                      <span className="text-[12px]" style={{ color: "#6B7280" }}>
                        {formatShortDate(e.entry_date)}
                      </span>
                      <span
                        className="text-[10px] font-semibold px-2 py-[2px]"
                        style={{
                          color: catColor(e.category),
                          backgroundColor: `${catColor(e.category)}14`,
                          borderRadius: 4,
                          textTransform: "uppercase",
                          letterSpacing: 0.4,
                        }}
                      >
                        {catLabel(e.category)}
                      </span>
                    </div>
                    {e.description && (
                      <div
                        className="mt-2 text-[13px]"
                        style={{ color: "#6B7280", ...POPPINS }}
                      >
                        {e.description}
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {addOpen && userId && (
        <AddEntrySheet
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
    <div className="fixed inset-0 z-50 flex items-end justify-center" style={POPPINS}>
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
          <span className="text-[11px] font-semibold tracking-wider" style={{ color: "#6B7280" }}>
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

function AddEntrySheet({
  userId,
  onClose,
  onAdded,
}: {
  userId: string;
  onClose: () => void;
  onAdded: () => void;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<Category>("training");
  const [hours, setHours] = useState("");
  const [entryDate, setEntryDate] = useState(today);
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  async function save() {
    if (saving) return;
    const parsed = entrySchema.safeParse({
      title,
      category,
      hours: Number(hours),
      entry_date: entryDate,
      description,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Invalid input");
      return;
    }
    setSaving(true);
    const v = parsed.data;
    const { error } = await supabase.from("cpd_entries").insert({
      instructor_id: userId,
      title: v.title,
      category: v.category,
      hours: v.hours,
      entry_date: v.entry_date,
      description: v.description || null,
    });
    setSaving(false);
    if (error) {
      console.error("[cpd] insert error", error);
      toast.error("Couldn't save entry");
      return;
    }
    toast.success("CPD entry added");
    onAdded();
  }

  return (
    <SheetShell title="ADD CPD ENTRY" onClose={onClose}>
      <div className="flex flex-col" style={{ gap: 12 }}>
        <Input
          label="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={120}
          placeholder="e.g. ORDIT refresher"
        />
        <div>
          <label className="block mb-1 text-[12px] font-medium text-[#6B7280]">Category</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as Category)}
            className="w-full px-3 py-2 bg-white"
            style={{
              borderRadius: 8,
              border: "0.5px solid #E2E6ED",
              color: "#1A1A2E",
              fontSize: 14,
              ...POPPINS,
            }}
          >
            {CATEGORIES.map((c) => (
              <option key={c.key} value={c.key}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
        <Input
          label="Hours"
          type="number"
          inputMode="decimal"
          step="0.25"
          min="0"
          value={hours}
          onChange={(e) => setHours(e.target.value)}
          placeholder="e.g. 1.5"
        />
        <Input
          label="Date"
          type="date"
          value={entryDate}
          onChange={(e) => setEntryDate(e.target.value)}
        />
        <div>
          <label className="block mb-1 text-[12px] font-medium text-[#6B7280]">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            maxLength={1000}
            className="w-full px-3 py-2 bg-white"
            style={{
              borderRadius: 8,
              border: "0.5px solid #E2E6ED",
              color: "#1A1A2E",
              fontSize: 14,
              resize: "none",
              ...POPPINS,
            }}
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
