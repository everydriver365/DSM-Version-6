import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { Card } from "../components/dsm/Card";
import { SectionHeader } from "../components/dsm/SectionHeader";
import { supabase } from "../lib/supabaseClient";

export const Route = createFileRoute("/tax")({
  head: () => ({
    meta: [
      { title: "Tax estimate — DSM by EveryDriver" },
      { name: "description", content: "Estimate your self-assessment tax bill." },
    ],
  }),
  component: TaxPage,
});

const POPPINS = { fontFamily: "Inter, sans-serif" } as const;

type YearKey = "2025/26" | "2026/27";

// UK tax year: 6 April YYYY → 5 April YYYY+1
function taxYearRange(key: YearKey): { start: Date; end: Date; startYear: number } {
  const startYear = key === "2025/26" ? 2025 : 2026;
  return {
    start: new Date(startYear, 3, 6), // April = 3
    end: new Date(startYear + 1, 3, 6),
    startYear,
  };
}

function fmt(n: number) {
  return n.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function TaxPage() {
  const navigate = useNavigate();
  const [year, setYear] = useState<YearKey>("2025/26");
  const [userId, setUserId] = useState<string | null>(null);
  const [income, setIncome] = useState(0);
  const [expenses, setExpenses] = useState(0);

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
      const startIso = start.toISOString();
      const endIso = end.toISOString();
      const startYmd = start.toISOString().slice(0, 10);
      const endYmd = end.toISOString().slice(0, 10);

      const { data: payRows } = await supabase
        .from("payments")
        .select("amount, paid_at")
        .eq("instructor_id", userId)
        .is("deleted_at", null)
        .gte("paid_at", startIso)
        .lt("paid_at", endIso);
      setIncome((payRows ?? []).reduce((s, r) => s + Number(r.amount ?? 0), 0));

      const { data: expRows } = await supabase
        .from("expenses")
        .select("amount, expense_date")
        .eq("instructor_id", userId)
        .is("deleted_at", null)
        .gte("expense_date", startYmd)
        .lt("expense_date", endYmd);
      setExpenses((expRows ?? []).reduce((s, r) => s + Number(r.amount ?? 0), 0));
    })();
  }, [userId, start, end]);

  const netProfit = Math.max(0, income - expenses);
  const PA = 12570;
  const BR_LIMIT = 50270;
  const taxable = Math.max(0, netProfit - PA);
  const incomeTax = Math.min(taxable, BR_LIMIT - PA) * 0.2;
  const class2 = netProfit > 6725 ? 179.4 : 0;
  const class4Base = Math.max(0, Math.min(netProfit, BR_LIMIT) - PA);
  const class4 = class4Base * 0.09;
  const totalTax = incomeTax + class2 + class4;

  // months remaining in tax year
  const now = new Date();
  const totalMs = end.getTime() - start.getTime();
  const elapsed = Math.max(0, Math.min(totalMs, now.getTime() - start.getTime()));
  const monthsElapsed = Math.round((elapsed / totalMs) * 12);
  const monthsRemaining = Math.max(0, 12 - monthsElapsed);
  const progressPct = Math.min(100, (elapsed / totalMs) * 100);

  return (
    <div className="min-h-screen bg-white pb-12" style={POPPINS}>
      {/* TOP BAR */}
      <div
        className="sticky top-0 z-40 h-[52px] px-4 flex items-center justify-between"
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
        <div className="text-white text-[15px] font-semibold">Tax estimate</div>
        <div style={{ width: 40, height: 40 }} />
      </div>

      {/* YEAR TABS */}
      <div className="mx-4 mt-3 flex" style={{ gap: 8 }}>
        {(["2025/26", "2026/27"] as YearKey[]).map((y) => {
          const active = year === y;
          return (
            <button
              key={y}
              type="button"
              onClick={() => setYear(y)}
              className="flex-1 text-[13px] font-medium"
              style={{
                height: 36,
                borderRadius: 8,
                backgroundColor: active ? "#1877D6" : "#F3F4F6",
                color: active ? "#ffffff" : "#6B7280",
              }}
            >
              {y}
            </button>
          );
        })}
      </div>

      {/* SUMMARY CARD */}
      <div
        className="mx-4 mt-3"
        style={{ backgroundColor: "#0B1F3A", borderRadius: 12, padding: 16 }}
      >
        <div className="text-[10px] uppercase" style={{ color: "#9CA3AF", letterSpacing: "0.08em" }}>
          GROSS INCOME
        </div>
        <div className="text-[24px] font-bold" style={{ color: "#F59E0B" }}>
          £{fmt(income)}
        </div>
        <div className="mt-3 text-[10px] uppercase" style={{ color: "#9CA3AF", letterSpacing: "0.08em" }}>
          TOTAL EXPENSES
        </div>
        <div className="text-[24px] font-bold" style={{ color: "#CC2229" }}>
          £{fmt(expenses)}
        </div>
        <div
          className="my-3"
          style={{ height: "0.5px", backgroundColor: "rgba(255,255,255,0.2)" }}
        />
        <div className="text-[10px] uppercase" style={{ color: "#9CA3AF", letterSpacing: "0.08em" }}>
          NET PROFIT
        </div>
        <div className="text-[28px] font-bold text-white">£{fmt(netProfit)}</div>
      </div>

      <div className="mx-4">
        <SectionHeader>TAX BREAKDOWN</SectionHeader>
        <Card className="bg-white">
          <Row label="Personal allowance" value={`£${fmt(PA)}`} color="#16A34A" />
          <Row label="Taxable income" value={`£${fmt(taxable)}`} color="#0B1F3A" />
          <Row
            label="Income tax (20%)"
            value={`£${fmt(incomeTax)}`}
            color="#CC2229"
          />
          <Row label="Class 2 NI (£3.45/wk)" value={`£${fmt(class2)}`} color="#CC2229" />
          <Row label="Class 4 NI (9%)" value={`£${fmt(class4)}`} color="#CC2229" />
          <div className="my-2" style={{ height: "0.5px", backgroundColor: "#EEF2F7" }} />
          <div className="flex items-center justify-between">
            <span className="text-[14px] font-bold text-[#0B1F3A]">ESTIMATED TAX BILL</span>
            <span className="text-[20px] font-bold" style={{ color: "#CC2229" }}>
              £{fmt(totalTax)}
            </span>
          </div>
        </Card>

        <SectionHeader>PAYMENT ON ACCOUNT</SectionHeader>
        <Card className="bg-white">
          <div className="text-[13px] text-[#6B7280]">
            HMRC requires two payments on account — 31 Jan and 31 Jul — each 50% of last year's bill.
          </div>
          <div className="mt-3 flex items-center justify-between text-[12px] text-[#6B7280]">
            <span>Tax year progress</span>
            <span>{monthsRemaining} months remaining</span>
          </div>
          <div
            className="mt-2 overflow-hidden"
            style={{ height: 6, borderRadius: 3, backgroundColor: "#F3F4F6" }}
          >
            <div style={{ height: "100%", width: `${progressPct}%`, backgroundColor: "#1877D6" }} />
          </div>
        </Card>

        <div className="mt-3 text-[12px] text-[#6B7280] text-center">
          This is an estimate only. Consult a qualified accountant.
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-[13px] text-[#0B1F3A]">{label}</span>
      <span className="text-[13px] font-semibold" style={{ color }}>
        {value}
      </span>
    </div>
  );
}
