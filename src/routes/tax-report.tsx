import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  PoundSterling,
  Receipt,
  TrendingUp,
  Car,
  Download,
} from "lucide-react";
import { supabase } from "../lib/supabaseClient";

export const Route = createFileRoute("/tax-report")({
  head: () => ({
    meta: [
      { title: "Tax report — DSM by EveryDriver" },
      { name: "description", content: "Self-assessment tax year report." },
    ],
  }),
  component: TaxReportPage,
});

const POPPINS = { fontFamily: "Inter, sans-serif" } as const;

type YearKey = "2025/26" | "2024/25" | "2023/24";

const YEAR_OPTIONS: YearKey[] = ["2025/26", "2024/25", "2023/24"];

function taxYearRange(key: YearKey) {
  const startYear = key === "2025/26" ? 2025 : key === "2024/25" ? 2024 : 2023;
  const start = new Date(Date.UTC(startYear, 3, 6));
  const end = new Date(Date.UTC(startYear + 1, 3, 6));
  return { start, end };
}

function currentTaxYear(): YearKey {
  const now = new Date();
  const y = now.getUTCFullYear();
  const boundary = new Date(Date.UTC(y, 3, 6));
  const startYear = now.getTime() >= boundary.getTime() ? y : y - 1;
  const key = `${startYear}/${String((startYear + 1) % 100).padStart(2, "0")}`;
  return (YEAR_OPTIONS.includes(key as YearKey) ? (key as YearKey) : "2025/26");
}

function fmt(n: number) {
  return n.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const CATEGORY_LABELS: Record<string, string> = {
  fuel: "Fuel",
  insurance: "Insurance",
  maintenance: "Vehicle maintenance",
  vehicle: "Vehicle",
  cpd: "Training / CPD",
  training: "Training / CPD",
  phone: "Phone",
  marketing: "Marketing",
  office: "Office",
  subscriptions: "Subscriptions",
  other: "Other",
};

function catLabel(c: string) {
  const k = (c ?? "other").toLowerCase();
  return CATEGORY_LABELS[k] ?? (c ? c.charAt(0).toUpperCase() + c.slice(1) : "Other");
}

function TaxReportPage() {
  const navigate = useNavigate();
  const [year, setYear] = useState<YearKey>(currentTaxYear());
  const [userId, setUserId] = useState<string | null>(null);

  const [cash, setCash] = useState(0);
  const [card, setCard] = useState(0);
  const [bank, setBank] = useState(0);
  const [everydriver, setEverydriver] = useState(0);
  const [deposits, setDeposits] = useState(0);

  const [expensesTotal, setExpensesTotal] = useState(0);
  const [expensesByCat, setExpensesByCat] = useState<Record<string, number>>({});

  const [miles, setMiles] = useState(0);

  const [loading, setLoading] = useState(false);

  const { start, end } = useMemo(() => taxYearRange(year), [year]);

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
      const startIso = start.toISOString();
      const endIso = end.toISOString();
      const startYmd = start.toISOString().slice(0, 10);
      const endYmd = end.toISOString().slice(0, 10);

      // Income from lesson_history
      const { data: lh } = await supabase
        .from("lesson_history")
        .select("lesson_cost, payment_method, payment_status, created_at")
        .eq("instructor_id", userId)
        .eq("payment_status", "paid")
        .gte("created_at", startIso)
        .lt("created_at", endIso);

      let c = 0, cd = 0, b = 0, ed = 0;
      for (const r of lh ?? []) {
        const amt = Number((r as any).lesson_cost ?? 0);
        const m = String((r as any).payment_method ?? "").toLowerCase();
        if (m === "cash") c += amt;
        else if (m === "card") cd += amt;
        else if (m === "bank_transfer" || m === "bank") b += amt;
        else if (m === "everydriver") ed += amt;
      }
      setCash(c); setCard(cd); setBank(b); setEverydriver(ed);

      // Course booking deposits
      const { data: cb } = await supabase
        .from("course_bookings")
        .select("amount_paid, booked_at")
        .eq("instructor_id", userId)
        .gte("booked_at", startIso)
        .lt("booked_at", endIso);
      setDeposits((cb ?? []).reduce((s, r: any) => s + Number(r.amount_paid ?? 0), 0));

      // Expenses
      const { data: exp } = await supabase
        .from("expenses")
        .select("amount, category, expense_date, tax_deductible, deleted_at")
        .eq("instructor_id", userId)
        .eq("tax_deductible", true)
        .is("deleted_at", null)
        .gte("expense_date", startYmd)
        .lt("expense_date", endYmd);
      let et = 0;
      const bc: Record<string, number> = {};
      for (const r of exp ?? []) {
        const amt = Number((r as any).amount ?? 0);
        et += amt;
        const cat = String((r as any).category ?? "other");
        bc[cat] = (bc[cat] ?? 0) + amt;
      }
      setExpensesTotal(et);
      setExpensesByCat(bc);

      // Mileage
      const { data: ml } = await supabase
        .from("mileage_logs")
        .select("miles, trip_date, deleted_at")
        .eq("instructor_id", userId)
        .is("deleted_at", null)
        .gte("trip_date", startYmd)
        .lt("trip_date", endYmd);
      setMiles((ml ?? []).reduce((s, r: any) => s + Number(r.miles ?? 0), 0));

      setLoading(false);
    })();
  }, [userId, start, end]);

  const totalIncome = cash + card + bank + everydriver + deposits;
  const mileageAllowance =
    Math.min(miles, 10000) * 0.45 + Math.max(0, miles - 10000) * 0.25;
  const netProfit = Math.max(0, totalIncome - expensesTotal - mileageAllowance);
  const PA = 12570;
  const taxableIncome = Math.max(0, netProfit - PA);
  const taxEstimate = taxableIncome * 0.2;
  const niEstimate = Math.max(0, netProfit - PA) * 0.09;

  function downloadSummary() {
    const rows = [
      ["Tax year", year],
      ["Period", `${start.toISOString().slice(0, 10)} to ${end.toISOString().slice(0, 10)}`],
      [],
      ["INCOME"],
      ["Cash", cash.toFixed(2)],
      ["Card", card.toFixed(2)],
      ["Bank transfer", bank.toFixed(2)],
      ["EveryDriver", everydriver.toFixed(2)],
      ["Course deposits", deposits.toFixed(2)],
      ["Total income", totalIncome.toFixed(2)],
      [],
      ["EXPENSES"],
      ...Object.entries(expensesByCat).map(([k, v]) => [catLabel(k), v.toFixed(2)]),
      ["Total expenses", expensesTotal.toFixed(2)],
      [],
      ["MILEAGE"],
      ["Total miles", String(miles)],
      ["Mileage allowance", mileageAllowance.toFixed(2)],
      [],
      ["SUMMARY"],
      ["Net profit", netProfit.toFixed(2)],
      ["Estimated tax (20%)", taxEstimate.toFixed(2)],
      ["Estimated NI (Class 4, 9%)", niEstimate.toFixed(2)],
    ];
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tax-report-${year.replace("/", "-")}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  const cardStyle = {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    borderWidth: "0.5px",
    borderStyle: "solid" as const,
    borderColor: "#EEF2F7",
  };

  return (
    <div className="min-h-screen bg-white pb-12" style={POPPINS}>
      {/* TOP BAR */}
      <div
        className="cf-header-navy sticky top-0 z-40 h-[52px] px-4 flex items-center justify-between"
        style={{ backgroundColor: "#0B1F3A" }}
      >
        <button
          type="button"
          aria-label="Back"
          onClick={() => navigate({ to: "/home" })}
          className="flex items-center justify-center"
          style={{ width: 40, height: 40 }}
        >
          <ArrowLeft size={22} color="#ffffff" />
        </button>
        <div className="text-white text-[15px] font-semibold">Tax report</div>
        <div style={{ width: 40, height: 40 }} />
      </div>

      {/* YEAR SELECTOR */}
      <div
        className="bg-white flex items-center justify-between"
        style={{ padding: 16, borderBottom: "0.5px solid #EEF2F7" }}
      >
        <label htmlFor="tax-year" className="text-[13px] font-medium text-[#0B1F3A]">
          Tax year
        </label>
        <select
          id="tax-year"
          value={year}
          onChange={(e) => setYear(e.target.value as YearKey)}
          className="text-[13px] font-medium text-[#0B1F3A] bg-white"
          style={{
            height: 36,
            padding: "0 12px",
            borderRadius: 8,
            border: "0.5px solid #EEF2F7",
          }}
        >
          <option value="2025/26">2025/26 (6 Apr 2025 – 5 Apr 2026)</option>
          <option value="2024/25">2024/25 (6 Apr 2024 – 5 Apr 2025)</option>
          <option value="2023/24">2023/24 (6 Apr 2023 – 5 Apr 2024)</option>
        </select>
      </div>

      {/* INCOME */}
      <div style={{ ...cardStyle, marginLeft: 16, marginRight: 16, marginTop: 16 }}>
        <div className="flex items-center gap-2">
          <PoundSterling size={18} color="#1877D6" />
          <div className="text-[15px] font-semibold text-[#0B1F3A]">Income</div>
        </div>
        <div className="mt-2 text-[26px] font-bold" style={{ color: "#1877D6" }}>
          £{fmt(totalIncome)}
        </div>
        <div className="mt-3 space-y-1.5">
          <Row label="Cash payments" value={`£${fmt(cash)}`} />
          <Row label="Card payments" value={`£${fmt(card)}`} />
          <Row label="Bank transfer" value={`£${fmt(bank)}`} />
          <Row label="EveryDriver bookings" value={`£${fmt(everydriver)}`} />
          <Row label="Course deposits" value={`£${fmt(deposits)}`} />
        </div>
      </div>

      {/* EXPENSES */}
      <div style={{ ...cardStyle, marginLeft: 16, marginRight: 16, marginTop: 12 }}>
        <div className="flex items-center gap-2">
          <Receipt size={18} color="#1877D6" />
          <div className="text-[15px] font-semibold text-[#0B1F3A]">Allowable expenses</div>
        </div>
        <div className="mt-2 text-[26px] font-bold" style={{ color: "#1877D6" }}>
          £{fmt(expensesTotal)}
        </div>
        <div className="mt-3 space-y-1.5">
          {Object.keys(expensesByCat).length === 0 ? (
            <div className="text-[13px] text-[#6B7280]">No deductible expenses recorded.</div>
          ) : (
            Object.entries(expensesByCat)
              .sort((a, b) => b[1] - a[1])
              .map(([cat, amt]) => (
                <Row key={cat} label={catLabel(cat)} value={`£${fmt(amt)}`} />
              ))
          )}
        </div>
      </div>

      {/* PROFIT */}
      <div style={{ ...cardStyle, marginLeft: 16, marginRight: 16, marginTop: 12 }}>
        <div className="flex items-center gap-2">
          <TrendingUp size={18} color="#0B1F3A" />
          <div className="text-[15px] font-semibold text-[#0B1F3A]">Net profit</div>
        </div>
        <div className="mt-2 text-[26px] font-bold" style={{ color: "#0B1F3A" }}>
          £{fmt(netProfit)}
        </div>
        <div className="mt-3 space-y-1.5">
          <Row label="Tax estimate (20% basic rate)" value={`£${fmt(taxEstimate)}`} muted />
          <Row label="NI Class 4 (9% over £12,570)" value={`£${fmt(niEstimate)}`} muted />
        </div>
        <div className="mt-3 text-[11px] text-[#6B7280]">
          This is an estimate only. Please consult a qualified accountant.
        </div>
      </div>

      {/* MILEAGE */}
      <div style={{ ...cardStyle, marginLeft: 16, marginRight: 16, marginTop: 12 }}>
        <div className="flex items-center gap-2">
          <Car size={18} color="#1877D6" />
          <div className="text-[15px] font-semibold text-[#0B1F3A]">Mileage allowance</div>
        </div>
        <div className="mt-2 text-[26px] font-bold" style={{ color: "#1877D6" }}>
          £{fmt(mileageAllowance)}
        </div>
        <div className="mt-3 space-y-1.5">
          <Row label="Total miles" value={miles.toLocaleString("en-GB")} />
          <Row
            label="First 10,000 miles × £0.45"
            value={`£${fmt(Math.min(miles, 10000) * 0.45)}`}
          />
          <Row
            label="Remaining miles × £0.25"
            value={`£${fmt(Math.max(0, miles - 10000) * 0.25)}`}
          />
        </div>
        <div className="mt-3 text-[11px] text-[#6B7280]">
          Alternative to actual fuel costs — use whichever is higher.
        </div>
      </div>

      {/* SUMMARY */}
      <div
        style={{
          backgroundColor: "#0B1F3A",
          borderRadius: 12,
          marginLeft: 16,
          marginRight: 16,
          marginTop: 12,
          padding: 20,
        }}
      >
        <div className="text-white text-[16px] font-semibold">Self assessment summary</div>
        <div className="mt-3 space-y-2">
          <SumRow label="Total income" value={`£${fmt(totalIncome)}`} />
          <SumRow label="Total expenses" value={`£${fmt(expensesTotal)}`} />
          <SumRow label="Mileage allowance" value={`£${fmt(mileageAllowance)}`} />
          <SumRow label="Net profit" value={`£${fmt(netProfit)}`} bold />
          <SumRow label="Estimated tax (20%)" value={`£${fmt(taxEstimate)}`} />
          <SumRow label="Estimated NI" value={`£${fmt(niEstimate)}`} />
        </div>
        <button
          type="button"
          onClick={downloadSummary}
          className="mt-4 w-full flex items-center justify-center gap-2 text-white text-[14px] font-semibold"
          style={{ backgroundColor: "#1877D6", height: 44, borderRadius: 10 }}
        >
          <Download size={16} /> Download summary
        </button>
      </div>

      {loading && (
        <div className="mt-3 text-center text-[12px] text-[#6B7280]">Loading…</div>
      )}
    </div>
  );
}

function Row({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className={`text-[13px] ${muted ? "text-[#6B7280]" : "text-[#0B1F3A]"}`}>{label}</span>
      <span className={`text-[13px] font-semibold ${muted ? "text-[#6B7280]" : "text-[#0B1F3A]"}`}>
        {value}
      </span>
    </div>
  );
}

function SumRow({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span
        className="text-[13px]"
        style={{ color: bold ? "#FFFFFF" : "rgba(255,255,255,0.7)", fontWeight: bold ? 700 : 400 }}
      >
        {label}
      </span>
      <span
        className="text-[13px]"
        style={{ color: bold ? "#FFFFFF" : "rgba(255,255,255,0.9)", fontWeight: bold ? 700 : 600 }}
      >
        {value}
      </span>
    </div>
  );
}
