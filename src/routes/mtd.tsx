import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Download } from "lucide-react";
import { toast } from "sonner";
import { SectionHeader } from "../components/dsm/SectionHeader";
import { Card } from "../components/dsm/Card";
import { Button } from "../components/dsm/Button";
import { Input } from "../components/dsm/Input";
import { supabase } from "../lib/supabaseClient";

export const Route = createFileRoute("/mtd")({
  head: () => ({
    meta: [
      { title: "Making Tax Digital — DSM by EveryDriver" },
      { name: "description", content: "Track your MTD enrolment and quarterly HMRC submissions." },
    ],
  }),
  component: MtdPage,
});

const POPPINS = { fontFamily: "Inter, sans-serif" } as const;
const VALUE = "#1A1A2E";
const MUTED = "#6B7280";
const MILEAGE_RATE = 0.45;

interface MtdRow {
  is_enrolled: boolean;
  mtd_start_date: string | null;
  hmrc_reference: string | null;
  q1_submitted: boolean;
  q2_submitted: boolean;
  q3_submitted: boolean;
  q4_submitted: boolean;
}

type QuarterKey = "q1" | "q2" | "q3" | "q4";

interface QuarterDef {
  key: QuarterKey;
  label: string;
  period: string;
  periodStart: Date;
  periodEnd: Date;
  due: Date;
}

function currentTaxYearStart(now: Date): Date {
  const y = now.getUTCFullYear();
  const aprStart = Date.UTC(y, 3, 6); // 6 Apr
  return now.getTime() >= aprStart ? new Date(aprStart) : new Date(Date.UTC(y - 1, 3, 6));
}

function buildQuarters(taxYearStart: Date): QuarterDef[] {
  const ys = taxYearStart.getUTCFullYear();
  const ye = ys + 1;
  return [
    {
      key: "q1",
      label: "Q1",
      period: "6 Apr – 5 Jul",
      periodStart: new Date(Date.UTC(ys, 3, 6)),
      periodEnd: new Date(Date.UTC(ys, 6, 5)),
      due: new Date(Date.UTC(ys, 7, 5)),
    },
    {
      key: "q2",
      label: "Q2",
      period: "6 Jul – 5 Oct",
      periodStart: new Date(Date.UTC(ys, 6, 6)),
      periodEnd: new Date(Date.UTC(ys, 9, 5)),
      due: new Date(Date.UTC(ys, 10, 5)),
    },
    {
      key: "q3",
      label: "Q3",
      period: "6 Oct – 5 Jan",
      periodStart: new Date(Date.UTC(ys, 9, 6)),
      periodEnd: new Date(Date.UTC(ye, 0, 5)),
      due: new Date(Date.UTC(ye, 1, 5)),
    },
    {
      key: "q4",
      label: "Q4",
      period: "6 Jan – 5 Apr",
      periodStart: new Date(Date.UTC(ye, 0, 6)),
      periodEnd: new Date(Date.UTC(ye, 3, 5)),
      due: new Date(Date.UTC(ye, 4, 5)),
    },
  ];
}

function fmtDate(d: Date) {
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function fmtMoney(n: number) {
  return `£${n.toFixed(2)}`;
}

function csvCell(v: unknown) {
  const s = v == null ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function MtdPage() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [row, setRow] = useState<MtdRow>({
    is_enrolled: false,
    mtd_start_date: null,
    hmrc_reference: null,
    q1_submitted: false,
    q2_submitted: false,
    q3_submitted: false,
    q4_submitted: false,
  });
  const [saving, setSaving] = useState(false);
  const [income, setIncome] = useState(0);
  const [expenses, setExpenses] = useState(0);
  const [miles, setMiles] = useState(0);
  const [payments, setPayments] = useState<{ amount: number; created_at: string }[]>([]);
  const [expenseRows, setExpenseRows] = useState<
    { amount: number; category: string | null; description: string | null; expense_date: string }[]
  >([]);
  const [mileageRows, setMileageRows] = useState<{ miles: number; created_at: string }[]>([]);

  const now = useMemo(() => new Date(), []);
  const taxYearStart = useMemo(() => currentTaxYearStart(now), [now]);
  const taxYearEnd = useMemo(
    () => new Date(Date.UTC(taxYearStart.getUTCFullYear() + 1, 3, 6)),
    [taxYearStart],
  );
  const quarters = useMemo(() => buildQuarters(taxYearStart), [taxYearStart]);
  const taxYearLabel = `${taxYearStart.getUTCFullYear()}/${(taxYearStart.getUTCFullYear() + 1)
    .toString()
    .slice(-2)}`;

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      const uid = data.user?.id ?? null;
      setUserId(uid);
      if (!uid) return;

      const { data: mtdRow } = await supabase
        .from("instructor_mtd")
        .select("is_enrolled, mtd_start_date, hmrc_reference, q1_submitted, q2_submitted, q3_submitted, q4_submitted")
        .eq("instructor_id", uid)
        .maybeSingle();
      if (mtdRow) setRow(mtdRow as MtdRow);

      const startIso = taxYearStart.toISOString();
      const endIso = taxYearEnd.toISOString();
      const startYmd = taxYearStart.toISOString().slice(0, 10);
      const endYmd = taxYearEnd.toISOString().slice(0, 10);

      const { data: pays } = await supabase
        .from("payments")
        .select("amount, created_at")
        .eq("instructor_id", uid)
        .is("deleted_at", null)
        .gte("created_at", startIso)
        .lt("created_at", endIso);
      const payArr = (pays ?? []) as { amount: number | null; created_at: string }[];
      setPayments(payArr.map((p) => ({ amount: Number(p.amount ?? 0), created_at: p.created_at })));
      setIncome(payArr.reduce((s, p) => s + Number(p.amount ?? 0), 0));

      const { data: exps } = await supabase
        .from("expenses")
        .select("amount, category, description, expense_date")
        .eq("instructor_id", uid)
        .is("deleted_at", null)
        .gte("expense_date", startYmd)
        .lt("expense_date", endYmd);
      const expArr = (exps ?? []) as {
        amount: number | null;
        category: string | null;
        description: string | null;
        expense_date: string;
      }[];
      setExpenseRows(
        expArr.map((e) => ({
          amount: Number(e.amount ?? 0),
          category: e.category,
          description: e.description,
          expense_date: e.expense_date,
        })),
      );
      setExpenses(expArr.reduce((s, e) => s + Number(e.amount ?? 0), 0));

      const { data: mil } = await supabase
        .from("mileage_logs")
        .select("miles, created_at")
        .eq("instructor_id", uid)
        .is("deleted_at", null)
        .gte("created_at", startIso)
        .lt("created_at", endIso);
      const milArr = (mil ?? []) as { miles: number | null; created_at: string }[];
      setMileageRows(milArr.map((m) => ({ miles: Number(m.miles ?? 0), created_at: m.created_at })));
      setMiles(milArr.reduce((s, m) => s + Number(m.miles ?? 0), 0));
    })();
  }, [taxYearStart, taxYearEnd]);

  const mileageAllowance = miles * MILEAGE_RATE;
  const netProfit = income - expenses - mileageAllowance;

  async function persist(patch: Partial<MtdRow>) {
    if (!userId) return;
    const next = { ...row, ...patch };
    setRow(next);
    setSaving(true);
    const { error } = await supabase
      .from("instructor_mtd")
      .upsert(
        { instructor_id: userId, ...next, updated_at: new Date().toISOString() },
        { onConflict: "instructor_id" },
      );
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Saved");
  }

  function quarterStatus(q: QuarterDef): {
    label: string;
    color: string;
    bg: string;
    dueColor: string;
  } {
    const submitted = row[`${q.key}_submitted` as const] as boolean;
    if (submitted) return { label: "Submitted", color: "#065F46", bg: "#D1FAE5", dueColor: MUTED };
    const msToDue = q.due.getTime() - now.getTime();
    const daysToDue = msToDue / 86400000;
    if (now > q.due) return { label: "Overdue", color: "#991B1B", bg: "#FEE2E2", dueColor: "#CC2229" };
    if (now < q.periodEnd) return { label: "Not due", color: "#374151", bg: "#E5E7EB", dueColor: MUTED };
    if (daysToDue <= 30) return { label: "Due soon", color: "#92400E", bg: "#FEF3C7", dueColor: "#F59E0B" };
    return { label: "Not due", color: "#374151", bg: "#E5E7EB", dueColor: MUTED };
  }

  function exportCsv() {
    const lines: string[] = [];
    lines.push(["Date", "Type", "Category", "Description", "Amount (£)"].map(csvCell).join(","));
    for (const p of payments) {
      lines.push(
        [p.created_at.slice(0, 10), "Income", "Lesson payment", "", p.amount.toFixed(2)]
          .map(csvCell)
          .join(","),
      );
    }
    for (const e of expenseRows) {
      lines.push(
        [e.expense_date, "Expense", e.category ?? "", e.description ?? "", (-e.amount).toFixed(2)]
          .map(csvCell)
          .join(","),
      );
    }
    for (const m of mileageRows) {
      lines.push(
        [
          m.created_at.slice(0, 10),
          "Mileage allowance",
          `${m.miles.toFixed(1)} miles @ £${MILEAGE_RATE}`,
          "",
          (-m.miles * MILEAGE_RATE).toFixed(2),
        ]
          .map(csvCell)
          .join(","),
      );
    }
    lines.push("");
    lines.push(["", "", "", "Total income", income.toFixed(2)].map(csvCell).join(","));
    lines.push(["", "", "", "Total expenses", (-expenses).toFixed(2)].map(csvCell).join(","));
    lines.push(["", "", "", "Mileage allowance", (-mileageAllowance).toFixed(2)].map(csvCell).join(","));
    lines.push(["", "", "", "Net profit", netProfit.toFixed(2)].map(csvCell).join(","));

    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `mtd-records-${taxYearLabel.replace("/", "-")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Records exported");
  }

  return (
    <div className="min-h-screen" style={{ ...POPPINS, backgroundColor: "#F3F8FF", margin: -8 }}>
      {/* TOP BAR */}
      <div
        className="sticky top-0 z-40 h-[52px] px-4 flex items-center"
        style={{ backgroundColor: "#072b47" }}
      >
        <button
          onClick={() => navigate({ to: "/home" })}
          aria-label="Back"
          className="p-1 -ml-1"
          style={{ color: "#fff" }}
        >
          <ArrowLeft size={22} />
        </button>
        <h1
          className="absolute left-1/2 -translate-x-1/2 text-white text-[16px] font-medium"
          style={{ ...POPPINS }}
        >
          Making Tax Digital
        </h1>
      </div>

      <div className="px-4 pb-12 pt-3">
        {/* Info card */}
        <div
          style={{
            background: "#EEF4FB",
            borderWidth: "0.5px",
            borderStyle: "solid",
            borderColor: "#1A4A6E",
            borderRadius: 12,
            padding: 16,
            fontSize: 13,
            color: VALUE,
            lineHeight: 1.5,
          }}
        >
          MTD for Income Tax requires self-employed people earning over £50,000 to keep digital
          records and submit quarterly updates to HMRC from April 2026.
        </div>

        <SectionHeader>YOUR MTD STATUS</SectionHeader>
        <Card>
          <div className="flex items-center justify-between mb-3">
            <span style={{ fontSize: 13, color: MUTED }}>Tax year {taxYearLabel}</span>
            {row.is_enrolled ? (
              <span
                style={{
                  background: "#D1FAE5",
                  color: "#065F46",
                  fontSize: 11,
                  fontWeight: 600,
                  padding: "4px 10px",
                  borderRadius: 999,
                }}
              >
                Enrolled
              </span>
            ) : (
              <span
                style={{
                  background: "#FEF3C7",
                  color: "#92400E",
                  fontSize: 11,
                  fontWeight: 600,
                  padding: "4px 10px",
                  borderRadius: 999,
                }}
              >
                Not enrolled
              </span>
            )}
          </div>

          <label className="flex items-center justify-between py-2">
            <span style={{ fontSize: 14, color: VALUE }}>I am enrolled in MTD</span>
            <input
              type="checkbox"
              checked={row.is_enrolled}
              disabled={saving}
              onChange={(e) => persist({ is_enrolled: e.target.checked })}
              style={{ width: 20, height: 20, accentColor: "#1A4A6E" }}
            />
          </label>

          <div className="mt-3">
            <Input
              label="MTD start date"
              type="date"
              value={row.mtd_start_date ?? ""}
              onChange={(e) => setRow({ ...row, mtd_start_date: e.target.value || null })}
              onBlur={() => persist({ mtd_start_date: row.mtd_start_date })}
            />
          </div>

          <div className="mt-3">
            <Input
              label="HMRC reference (optional)"
              type="text"
              value={row.hmrc_reference ?? ""}
              onChange={(e) => setRow({ ...row, hmrc_reference: e.target.value || null })}
              onBlur={() => persist({ hmrc_reference: row.hmrc_reference })}
              placeholder="e.g. AB123456C"
            />
          </div>
        </Card>

        <SectionHeader>QUARTERLY SUBMISSIONS</SectionHeader>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {quarters.map((q) => {
            const s = quarterStatus(q);
            const submitted = row[`${q.key}_submitted` as const] as boolean;
            return (
              <Card key={q.key} style={{ padding: 12 }}>
                <div className="flex items-center justify-between mb-2">
                  <span style={{ fontSize: 14, fontWeight: 600, color: VALUE }}>{q.label}</span>
                  <span
                    style={{
                      background: s.bg,
                      color: s.color,
                      fontSize: 10,
                      fontWeight: 600,
                      padding: "3px 8px",
                      borderRadius: 999,
                    }}
                  >
                    {s.label}
                  </span>
                </div>
                <div style={{ fontSize: 12, color: MUTED, marginBottom: 4 }}>{q.period}</div>
                <div style={{ fontSize: 12, color: s.dueColor, marginBottom: 10 }}>
                  Due {fmtDate(q.due)}
                </div>
                <Button
                  variant="ghost"
                  className="h-9 text-[12px]"
                  disabled={submitted || saving}
                  onClick={() => persist({ [`${q.key}_submitted`]: true } as Partial<MtdRow>)}
                >
                  {submitted ? "Submitted" : "Mark submitted"}
                </Button>
              </Card>
            );
          })}
        </div>

        <SectionHeader>DIGITAL RECORDS</SectionHeader>
        <Card>
          <Row label="Income (payments)" value={fmtMoney(income)} />
          <Row label="Expenses" value={`− ${fmtMoney(expenses)}`} />
          <Row
            label={`Mileage allowance (${miles.toFixed(1)} mi × £${MILEAGE_RATE})`}
            value={`− ${fmtMoney(mileageAllowance)}`}
          />
          <div
            style={{
              height: 1,
              background: "#EEF2F7",
              margin: "10px 0",
            }}
          />
          <Row
            label="Net profit"
            value={fmtMoney(netProfit)}
            valueColor={netProfit >= 0 ? "#16A34A" : "#CC2229"}
            bold
          />
          <div className="mt-4">
            <Button variant="ghost" onClick={exportCsv}>
              <Download size={16} style={{ marginRight: 8 }} />
              Export records
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  valueColor = VALUE,
  bold = false,
}: {
  label: string;
  value: string;
  valueColor?: string;
  bold?: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span style={{ fontSize: 13, color: MUTED }}>{label}</span>
      <span style={{ fontSize: 14, fontWeight: bold ? 700 : 500, color: valueColor }}>{value}</span>
    </div>
  );
}
