import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  Plus,
  Leaf,
  Repeat,
  Mic,
  X,
  Fuel,
  Shield,
  Megaphone,
  Wrench,
  GraduationCap,
  Car,
  Phone,
  Briefcase,
  MoreHorizontal,
  Upload,
  Trash2,
  Pencil,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "../lib/supabaseClient";

export const Route = createFileRoute("/expenses")({
  head: () => ({ meta: [{ title: "Expenses — DSM by EveryDriver" }] }),
  component: ExpensesPage,
});

const NAVY = "#0F2044";
const BORDER = "0.5px solid #E2E6ED";
const GREEN = "#059669";

const CATEGORIES = [
  "Fuel",
  "Insurance",
  "Marketing",
  "Equipment",
  "Training",
  "Vehicle",
  "Phone",
  "Professional fees",
  "Other",
] as const;
type Category = (typeof CATEGORIES)[number];

const FILTERS: Array<"All" | Category> = [
  "All",
  "Fuel",
  "Insurance",
  "Marketing",
  "Equipment",
  "Training",
  "Vehicle",
  "Phone",
  "Other",
];

const CATEGORY_META: Record<Category, { icon: any; color: string; bg: string }> = {
  Fuel: { icon: Fuel, color: "#D97706", bg: "#FEF3C7" },
  Insurance: { icon: Shield, color: "#2563EB", bg: "#DBEAFE" },
  Marketing: { icon: Megaphone, color: "#DB2777", bg: "#FCE7F3" },
  Equipment: { icon: Wrench, color: "#6B7280", bg: "#F3F4F6" },
  Training: { icon: GraduationCap, color: "#7C3AED", bg: "#EDE9FE" },
  Vehicle: { icon: Car, color: "#0EA5E9", bg: "#E0F2FE" },
  Phone: { icon: Phone, color: "#059669", bg: "#D1FAE5" },
  "Professional fees": { icon: Briefcase, color: "#B45309", bg: "#FEF3C7" },
  Other: { icon: MoreHorizontal, color: "#4B5563", bg: "#F3F4F6" },
};

type Expense = {
  id: string;
  instructor_id: string;
  category: string;
  description: string | null;
  amount: number;
  expense_date: string;
  tax_deductible: boolean;
  is_recurring: boolean;
  recurring_frequency: string | null;
  receipt_url: string | null;
};

const todayISO = () => new Date().toISOString().slice(0, 10);
const money = (n: number) => `£${n.toFixed(2)}`;

function monthKey(dateStr: string) {
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
function monthLabel(key: string) {
  const [y, m] = key.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

function ExpensesPage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<Expense[]>([]);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("All");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [instructorId, setInstructorId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      const { data: u } = await supabase.auth.getUser();
      const uid = u?.user?.id ?? null;
      setInstructorId(uid);
      if (!uid) {
        setLoading(false);
        return;
      }
      await refetch(uid);
    })();
  }, []);

  const refetch = async (uid: string) => {
    setLoading(true);
    const { data, error } = await supabase
      .from("expenses")
      .select("*")
      .eq("instructor_id", uid)
      .order("expense_date", { ascending: false });
    if (error) {
      console.error("[expenses] fetch error", error);
      toast.error("Couldn't load expenses");
    } else {
      setRows((data ?? []) as Expense[]);
    }
    setLoading(false);
  };

  const filtered = useMemo(() => {
    if (filter === "All") return rows;
    return rows.filter((r) => r.category === filter);
  }, [rows, filter]);

  const now = new Date();
  const thisMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const thisYear = now.getFullYear();

  const monthTotal = rows
    .filter((r) => monthKey(r.expense_date) === thisMonthKey)
    .reduce((s, r) => s + Number(r.amount || 0), 0);
  const monthTaxDed = rows
    .filter((r) => monthKey(r.expense_date) === thisMonthKey && r.tax_deductible)
    .reduce((s, r) => s + Number(r.amount || 0), 0);
  const yearTotal = rows
    .filter((r) => new Date(r.expense_date).getFullYear() === thisYear)
    .reduce((s, r) => s + Number(r.amount || 0), 0);
  const recurringCount = rows.filter((r) => r.is_recurring).length;

  const grouped = useMemo(() => {
    const map = new Map<string, Expense[]>();
    for (const r of filtered) {
      const k = monthKey(r.expense_date);
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(r);
    }
    return Array.from(map.entries()).sort((a, b) => (a[0] < b[0] ? 1 : -1));
  }, [filtered]);

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this expense?")) return;
    const { error } = await supabase.from("expenses").delete().eq("id", id);
    if (error) {
      toast.error("Delete failed");
      return;
    }
    toast.success("Expense deleted");
    if (instructorId) await refetch(instructorId);
  };

  return (
    <div style={{ minHeight: "100vh", background: "#fff", paddingBottom: 96 }}>
      {/* Top bar */}
      <header
        style={{
          background: NAVY,
          color: "#fff",
          padding: "16px 16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          position: "sticky",
          top: 0,
          zIndex: 20,
        }}
      >
        <button
          type="button"
          onClick={() => navigate({ to: "/home" })}
          aria-label="Back"
          style={{ background: "transparent", border: 0, color: "#fff", cursor: "pointer" }}
        >
          <ArrowLeft size={22} />
        </button>
        <div style={{ fontWeight: 700, fontSize: 17 }}>Expenses</div>
        <button
          type="button"
          onClick={() => {
            setEditing(null);
            setSheetOpen(true);
          }}
          style={{
            background: "rgba(255,255,255,0.14)",
            border: 0,
            color: "#fff",
            padding: "8px 12px",
            borderRadius: 10,
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            fontWeight: 600,
            cursor: "pointer",
            fontSize: 13,
          }}
        >
          <Plus size={16} /> Add expense
        </button>
      </header>

      {/* Summary cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 12,
          padding: 16,
        }}
      >
        <SummaryCard label="This month" value={money(monthTotal)} />
        <SummaryCard label="Tax deductible" value={money(monthTaxDed)} valueColor={GREEN} />
        <SummaryCard label="This year" value={money(yearTotal)} />
        <SummaryCard label="Recurring" value={String(recurringCount)} />
      </div>

      {/* Category filter tabs */}
      <div
        style={{
          display: "flex",
          gap: 8,
          overflowX: "auto",
          padding: "4px 16px 12px",
          scrollbarWidth: "none",
        }}
      >
        {FILTERS.map((f) => {
          const active = filter === f;
          return (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              style={{
                whiteSpace: "nowrap",
                border: active ? `1px solid ${NAVY}` : BORDER,
                background: active ? NAVY : "#fff",
                color: active ? "#fff" : "#374151",
                padding: "8px 14px",
                borderRadius: 999,
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {f}
            </button>
          );
        })}
      </div>

      {/* List */}
      <div style={{ padding: "0 16px" }}>
        {loading ? (
          <div style={{ color: "#6B7280", padding: 32, textAlign: "center" }}>Loading…</div>
        ) : grouped.length === 0 ? (
          <div style={{ color: "#6B7280", padding: 32, textAlign: "center" }}>
            No expenses yet. Tap “Add expense”.
          </div>
        ) : (
          grouped.map(([k, items]) => {
            const total = items.reduce((s, r) => s + Number(r.amount || 0), 0);
            return (
              <div key={k} style={{ marginBottom: 20 }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "baseline",
                    marginBottom: 8,
                  }}
                >
                  <div style={{ fontWeight: 700, color: NAVY, fontSize: 15 }}>{monthLabel(k)}</div>
                  <div style={{ color: "#6B7280", fontSize: 13 }}>{money(total)}</div>
                </div>
                {items.map((r) => (
                  <ExpenseRow
                    key={r.id}
                    row={r}
                    onEdit={() => {
                      setEditing(r);
                      setSheetOpen(true);
                    }}
                    onDelete={() => handleDelete(r.id)}
                  />
                ))}
              </div>
            );
          })
        )}
      </div>

      {sheetOpen && (
        <AddEditSheet
          initial={editing}
          instructorId={instructorId}
          onClose={() => setSheetOpen(false)}
          onSaved={async () => {
            setSheetOpen(false);
            if (instructorId) await refetch(instructorId);
          }}
        />
      )}
    </div>
  );
}

function SummaryCard({
  label,
  value,
  valueColor,
}: {
  label: string;
  value: string;
  valueColor?: string;
}) {
  return (
    <div
      style={{
        background: "#fff",
        border: BORDER,
        borderRadius: 14,
        padding: 14,
      }}
    >
      <div style={{ fontSize: 12, color: "#6B7280", marginBottom: 6 }}>{label}</div>
      <div style={{ fontWeight: 800, fontSize: 20, color: valueColor ?? NAVY }}>{value}</div>
    </div>
  );
}

function ExpenseRow({
  row,
  onEdit,
  onDelete,
}: {
  row: Expense;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const meta =
    CATEGORY_META[(row.category as Category) in CATEGORY_META ? (row.category as Category) : "Other"];
  const Icon = meta.icon;
  const date = new Date(row.expense_date).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <div
      style={{
        background: "#fff",
        border: BORDER,
        borderRadius: 12,
        padding: "14px 16px",
        marginBottom: 8,
      }}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          width: "100%",
          background: "transparent",
          border: 0,
          padding: 0,
          textAlign: "left",
          cursor: "pointer",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: meta.bg,
              color: meta.color,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <Icon size={18} />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: meta.color,
                  background: meta.bg,
                  padding: "2px 8px",
                  borderRadius: 999,
                }}
              >
                {row.category}
              </span>
              {row.is_recurring && (
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: "#4B5563",
                    background: "#F3F4F6",
                    padding: "2px 8px",
                    borderRadius: 999,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  <Repeat size={10} /> {row.recurring_frequency ?? "Recurring"}
                </span>
              )}
            </div>
            <div
              style={{
                fontWeight: 600,
                color: NAVY,
                marginTop: 2,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {row.description || "—"}
            </div>
            <div style={{ color: "#6B7280", fontSize: 12, marginTop: 2 }}>{date}</div>
          </div>
        </div>
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <div style={{ fontWeight: 800, color: NAVY, display: "inline-flex", alignItems: "center", gap: 6 }}>
            {money(Number(row.amount || 0))}
            {row.tax_deductible && <Leaf size={14} color={GREEN} />}
          </div>
        </div>
      </button>

      {open && (
        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          <button
            type="button"
            onClick={onEdit}
            style={{
              flex: 1,
              padding: "8px 12px",
              borderRadius: 10,
              border: BORDER,
              background: "#fff",
              color: NAVY,
              fontWeight: 600,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              cursor: "pointer",
              fontSize: 13,
            }}
          >
            <Pencil size={14} /> Edit
          </button>
          <button
            type="button"
            onClick={onDelete}
            style={{
              flex: 1,
              padding: "8px 12px",
              borderRadius: 10,
              border: `1px solid #FCA5A5`,
              background: "#FEF2F2",
              color: "#B91C1C",
              fontWeight: 600,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              cursor: "pointer",
              fontSize: 13,
            }}
          >
            <Trash2 size={14} /> Delete
          </button>
          {row.receipt_url && (
            <a
              href={row.receipt_url}
              target="_blank"
              rel="noreferrer"
              style={{
                flex: 1,
                padding: "8px 12px",
                borderRadius: 10,
                border: BORDER,
                background: "#fff",
                color: NAVY,
                fontWeight: 600,
                textAlign: "center",
                textDecoration: "none",
                fontSize: 13,
              }}
            >
              Receipt
            </a>
          )}
        </div>
      )}
    </div>
  );
}

function AddEditSheet({
  initial,
  instructorId,
  onClose,
  onSaved,
}: {
  initial: Expense | null;
  instructorId: string | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [category, setCategory] = useState<Category>((initial?.category as Category) ?? "Fuel");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [amount, setAmount] = useState<string>(initial ? String(initial.amount) : "");
  const [date, setDate] = useState(initial?.expense_date ?? todayISO());
  const [taxDed, setTaxDed] = useState(initial?.tax_deductible ?? true);
  const [recurring, setRecurring] = useState(initial?.is_recurring ?? false);
  const [frequency, setFrequency] = useState(initial?.recurring_frequency ?? "Monthly");
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [listening, setListening] = useState(false);
  const recRef = useRef<any>(null);

  const startSpeech = () => {
    const SR: any = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      toast.error("Speech not supported on this device");
      return;
    }
    if (listening) {
      recRef.current?.stop();
      return;
    }
    const rec = new SR();
    rec.lang = "en-GB";
    rec.interimResults = false;
    rec.onresult = (e: any) => {
      const text = e.results?.[0]?.[0]?.transcript ?? "";
      if (text) setDescription((d) => (d ? d + " " + text : text));
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    rec.start();
    recRef.current = rec;
    setListening(true);
  };

  const submit = async () => {
    if (!instructorId) {
      toast.error("Please sign in");
      return;
    }
    const amt = Number(amount);
    if (!amt || amt <= 0) {
      toast.error("Enter an amount");
      return;
    }
    setSaving(true);
    try {
      let receipt_url: string | null = initial?.receipt_url ?? null;
      if (receiptFile) {
        const ext = receiptFile.name.split(".").pop() || "jpg";
        const path = `${instructorId}/${Date.now()}.${ext}`;
        const up = await supabase.storage.from("expense-receipts").upload(path, receiptFile, {
          upsert: false,
          contentType: receiptFile.type || undefined,
        });
        if (up.error) {
          console.error("[expenses] upload error", up.error);
          toast.error("Receipt upload failed — saving without it");
        } else {
          const { data: signed } = await supabase.storage
            .from("expense-receipts")
            .createSignedUrl(path, 60 * 60 * 24 * 365);
          receipt_url = signed?.signedUrl ?? path;
        }
      }

      const payload = {
        instructor_id: instructorId,
        category,
        description: description.trim() || null,
        amount: amt,
        expense_date: date,
        tax_deductible: taxDed,
        is_recurring: recurring,
        recurring_frequency: recurring ? frequency : null,
        receipt_url,
      };

      const res = initial
        ? await supabase.from("expenses").update(payload).eq("id", initial.id)
        : await supabase.from("expenses").insert(payload);
      if (res.error) {
        console.error("[expenses] save error", res.error);
        toast.error(res.error.message || "Save failed");
        setSaving(false);
        return;
      }
      toast.success(initial ? "Expense updated" : "Expense added");
      onSaved();
    } catch (e: any) {
      console.error("[expenses] unexpected", e);
      toast.error("Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.4)",
        zIndex: 60,
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#fff",
          width: "100%",
          maxWidth: 520,
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          padding: 20,
          maxHeight: "92vh",
          overflowY: "auto",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 16,
          }}
        >
          <div style={{ fontWeight: 800, fontSize: 18, color: NAVY }}>
            {initial ? "Edit expense" : "Add expense"}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{ background: "transparent", border: 0, cursor: "pointer", color: "#6B7280" }}
          >
            <X size={22} />
          </button>
        </div>

        <Field label="Category">
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as Category)}
            style={inputStyle}
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Description">
          <div style={{ position: "relative" }}>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Fuel at Shell"
              style={{ ...inputStyle, paddingRight: 42 }}
            />
            <button
              type="button"
              onClick={startSpeech}
              aria-label="Dictate"
              style={{
                position: "absolute",
                right: 8,
                top: "50%",
                transform: "translateY(-50%)",
                background: listening ? "#FEE2E2" : "#F3F4F6",
                color: listening ? "#B91C1C" : NAVY,
                border: 0,
                borderRadius: 8,
                width: 32,
                height: 32,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Mic size={16} />
            </button>
          </div>
        </Field>

        <Field label="Amount (£)">
          <input
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            style={inputStyle}
          />
        </Field>

        <Field label="Date">
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={inputStyle} />
        </Field>

        <ToggleRow label="Tax deductible" value={taxDed} onChange={setTaxDed} />
        <ToggleRow label="Recurring" value={recurring} onChange={setRecurring} />

        {recurring && (
          <Field label="Frequency">
            <select value={frequency} onChange={(e) => setFrequency(e.target.value)} style={inputStyle}>
              {["Weekly", "Monthly", "Quarterly", "Annually"].map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </Field>
        )}

        <Field label="Receipt (optional)">
          <label
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 12px",
              border: BORDER,
              borderRadius: 10,
              cursor: "pointer",
              color: NAVY,
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            <Upload size={16} />
            {receiptFile ? receiptFile.name : "Choose file"}
            <input
              type="file"
              accept="image/*,application/pdf"
              style={{ display: "none" }}
              onChange={(e) => setReceiptFile(e.target.files?.[0] ?? null)}
            />
          </label>
        </Field>

        <button
          type="button"
          disabled={saving}
          onClick={submit}
          style={{
            marginTop: 8,
            width: "100%",
            background: NAVY,
            color: "#fff",
            padding: "14px 16px",
            border: 0,
            borderRadius: 12,
            fontWeight: 700,
            cursor: saving ? "not-allowed" : "pointer",
            opacity: saving ? 0.7 : 1,
          }}
        >
          {saving ? "Saving…" : initial ? "Update expense" : "Add expense"}
        </button>
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "12px 14px",
  border: BORDER,
  borderRadius: 10,
  fontSize: 15,
  color: NAVY,
  background: "#fff",
  outline: "none",
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: "#6B7280", marginBottom: 6 }}>{label}</div>
      {children}
    </div>
  );
}

function ToggleRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "12px 0",
        borderBottom: BORDER,
        marginBottom: 4,
      }}
    >
      <div style={{ color: NAVY, fontWeight: 600, fontSize: 14 }}>{label}</div>
      <button
        type="button"
        onClick={() => onChange(!value)}
        aria-pressed={value}
        style={{
          width: 46,
          height: 26,
          borderRadius: 999,
          background: value ? NAVY : "#D1D5DB",
          border: 0,
          position: "relative",
          cursor: "pointer",
          transition: "background .15s ease",
        }}
      >
        <span
          style={{
            position: "absolute",
            top: 3,
            left: value ? 23 : 3,
            width: 20,
            height: 20,
            borderRadius: "50%",
            background: "#fff",
            transition: "left .15s ease",
          }}
        />
      </button>
    </div>
  );
}
