import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, Plus, Car, Shield, Wrench, Receipt, X } from "lucide-react";
import { Card } from "../components/dsm/Card";
import { SectionHeader } from "../components/dsm/SectionHeader";
import { Input } from "../components/dsm/Input";
import { Button } from "../components/dsm/Button";
import { supabase } from "../lib/supabaseClient";

export const Route = createFileRoute("/expenses")({
  head: () => ({
    meta: [
      { title: "Expenses — DSM by EveryDriver" },
      { name: "description", content: "Track your business expenses." },
    ],
  }),
  component: ExpensesPage,
});

const POPPINS = { fontFamily: "Poppins, sans-serif" } as const;

const CATEGORIES = ["Fuel", "Insurance", "Maintenance", "Mobile", "Subscriptions", "Other"] as const;
type Category = (typeof CATEGORIES)[number];

interface ExpenseRow {
  id: string;
  category: string;
  description: string | null;
  amount: number;
  expense_date: string;
  created_at: string;
}

function formatGBP(n: number) {
  return `£${n.toFixed(2)}`;
}
function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}
function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function startOfYear(d: Date) {
  return new Date(d.getFullYear(), 0, 1);
}
function todayYmd() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function categoryStyle(category: string): { bg: string; icon: React.ReactNode } {
  const c = category.toLowerCase();
  if (c === "fuel") return { bg: "#F59E0B", icon: <Car size={18} color="#FFFFFF" /> };
  if (c === "insurance") return { bg: "#1A52A0", icon: <Shield size={18} color="#FFFFFF" /> };
  if (c === "maintenance") return { bg: "#CC2229", icon: <Wrench size={18} color="#FFFFFF" /> };
  return { bg: "#6B7280", icon: <Receipt size={18} color="#FFFFFF" /> };
}

function ExpensesPage() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [rows, setRows] = useState<ExpenseRow[] | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      setUserId(data.user?.id ?? null);
    })();
  }, []);

  const load = async (uid: string) => {
    const { data, error } = await supabase
      .from("expenses")
      .select("id, category, description, amount, expense_date, created_at")
      .eq("instructor_id", uid)
      .order("expense_date", { ascending: false });
    if (error) console.error("[expenses] fetch error", error);
    setRows((data as unknown as ExpenseRow[]) ?? []);
  };

  useEffect(() => {
    if (!userId) return;
    void load(userId);
  }, [userId]);

  const { month, year } = useMemo(() => {
    const now = new Date();
    const ms = startOfMonth(now).getTime();
    const ys = startOfYear(now).getTime();
    let m = 0;
    let y = 0;
    (rows ?? []).forEach((r) => {
      const t = new Date(r.expense_date).getTime();
      const amt = Number(r.amount ?? 0);
      if (t >= ys) y += amt;
      if (t >= ms) m += amt;
    });
    return { month: m, year: y };
  }, [rows]);

  return (
    <div className="min-h-screen bg-white pb-8 pb-safe" style={POPPINS}>
      {/* Top bar */}
      <div
        className="sticky top-0 z-40 flex items-center px-2"
        style={{ height: 52, backgroundColor: "#0F2044" }}
      >
        <button
          type="button"
          aria-label="Back"
          onClick={() => navigate({ to: "/home" })}
          className="flex items-center justify-center"
          style={{ width: 40, height: 40 }}
        >
          <ChevronLeft size={24} color="#FFFFFF" />
        </button>
        <div className="flex-1 text-center text-white text-[15px] font-semibold">Expenses</div>
        <button
          type="button"
          aria-label="Add expense"
          onClick={() => setSheetOpen(true)}
          className="flex items-center justify-center"
          style={{ width: 40, height: 40 }}
        >
          <Plus size={24} color="#FFFFFF" />
        </button>
      </div>

      {/* Summary card */}
      <div className="mx-4 mt-3 flex" style={{ backgroundColor: "#0F2044", borderRadius: 12, padding: 16 }}>
        <div className="flex-1">
          <div
            className="text-[10px] uppercase font-medium"
            style={{ color: "#9CA3AF", letterSpacing: "0.05em" }}
          >
            THIS MONTH
          </div>
          <div className="text-[24px] font-bold mt-1 leading-none" style={{ color: "#F59E0B" }}>
            {formatGBP(month)}
          </div>
        </div>
        <div style={{ width: "0.5px", backgroundColor: "rgba(255,255,255,0.2)" }} />
        <div className="flex-1 pl-4">
          <div
            className="text-[10px] uppercase font-medium"
            style={{ color: "#9CA3AF", letterSpacing: "0.05em" }}
          >
            THIS YEAR
          </div>
          <div className="text-[24px] font-bold mt-1 leading-none" style={{ color: "#F59E0B" }}>
            {formatGBP(year)}
          </div>
        </div>
      </div>

      <div className="px-4">
        <SectionHeader>EXPENSES</SectionHeader>

        {rows === null ? null : rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10" style={{ gap: 8 }}>
            <Receipt size={32} color="#9CA3AF" />
            <p className="text-[14px] text-[#6B7280]">No expenses recorded</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {rows.map((row) => {
              const s = categoryStyle(row.category);
              return (
                <Card key={row.id}>
                  <div className="flex items-center gap-3">
                    <span
                      className="flex items-center justify-center rounded-full shrink-0"
                      style={{ width: 36, height: 36, backgroundColor: s.bg }}
                    >
                      {s.icon}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="text-[14px] font-semibold text-[#0F2044] truncate">
                        {row.description || row.category}
                      </div>
                      <div className="text-[12px] text-[#6B7280] mt-0.5">{row.category}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-[14px] font-bold" style={{ color: "#CC2229" }}>
                        {formatGBP(Number(row.amount))}
                      </div>
                      <div className="text-[11px] text-[#6B7280] mt-0.5">
                        {formatDate(row.expense_date)}
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {sheetOpen && userId && (
        <AddExpenseSheet
          userId={userId}
          onClose={() => setSheetOpen(false)}
          onSaved={() => {
            setSheetOpen(false);
            if (userId) void load(userId);
          }}
        />
      )}
    </div>
  );
}

function AddExpenseSheet({
  userId,
  onClose,
  onSaved,
}: {
  userId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [category, setCategory] = useState<Category>("Fuel");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState<string>(todayYmd());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    setError(null);
    const num = Number(amount);
    if (!isFinite(num) || num <= 0) {
      setError("Enter a valid amount");
      return;
    }
    setSaving(true);
    const { error: insErr } = await supabase.from("expenses").insert({
      instructor_id: userId,
      category: category.toLowerCase(),
      description: description.trim() || null,
      amount: num,
      expense_date: date,
    });
    setSaving(false);
    if (insErr) {
      console.error("[expenses] insert error", insErr);
      setError(insErr.message);
      return;
    }
    onSaved();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end" style={{ backgroundColor: "rgba(0,0,0,0.4)" }}>
      <div
        className="absolute inset-0"
        onClick={onClose}
        aria-hidden
      />
      <div
        className="relative w-full bg-white"
        style={{ borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 16, paddingBottom: 24, ...POPPINS }}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="text-[16px] font-semibold text-[#0F2044]">Add Expense</div>
          <button onClick={onClose} aria-label="Close" className="flex items-center justify-center" style={{ width: 32, height: 32 }}>
            <X size={20} color="#6B7280" />
          </button>
        </div>

        <div className="flex flex-col gap-3">
          <div>
            <label className="block mb-1 text-[12px] font-medium text-[#6B7280]">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as Category)}
              className="h-11 w-full rounded-lg px-3 text-[14px] text-[#1A1A2E] bg-white focus:border-[#1A52A0] focus:outline-none"
              style={{
                fontFamily: "Poppins, sans-serif",
                borderWidth: "0.5px",
                borderStyle: "solid",
                borderColor: "#E2E6ED",
              }}
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <Input
            label="Description"
            placeholder="e.g. Shell garage"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={200}
          />

          <Input
            label="Amount (£)"
            type="number"
            inputMode="decimal"
            step="0.01"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />

          <Input
            label="Date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />

          {error && <div className="text-[12px]" style={{ color: "#CC2229" }}>{error}</div>}

          <Button onClick={save} disabled={saving}>
            {saving ? "Saving…" : "Save expense"}
          </Button>
        </div>
      </div>
    </div>
  );
}
