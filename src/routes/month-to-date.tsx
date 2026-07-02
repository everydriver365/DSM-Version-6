import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, BarChart3, Calculator, Download } from "lucide-react";
import { supabase } from "../lib/supabaseClient";

export const Route = createFileRoute("/month-to-date")({
  head: () => ({
    meta: [
      { title: "Month to date — DSM" },
      { name: "description", content: "Month to date earnings, lessons and tax estimate." },
    ],
  }),
  component: MonthToDatePage,
});

const POPPINS = { fontFamily: "Inter, sans-serif" } as const;
const BORDER = "0.5px solid #EEF2F7";
const CARD: React.CSSProperties = {
  background: "#fff",
  border: BORDER,
  borderRadius: 12,
  padding: 16,
};

interface LessonRow {
  id: string;
  pupil_id: string | null;
  status: string | null;
  lesson_date: string | null;
  duration_minutes: number | null;
  amount_due: number | null;
  payment_status: string | null;
}

interface HistoryRow {
  id: string;
  pupil_id: string | null;
  amount_paid: number | null;
  payment_method: string | null;
  created_at: string;
  lesson_date: string | null;
}

interface PupilRow {
  id: string;
  first_name: string | null;
  last_name: string | null;
}

function fmtGBP(n: number, opts: Intl.NumberFormatOptions = {}) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    ...opts,
  }).format(isFinite(n) ? n : 0);
}

function fmtHM(totalMinutes: number) {
  const m = Math.max(0, Math.round(totalMinutes));
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
}

function startOfMonth(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0);
}

function MonthToDatePage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [lessons, setLessons] = useState<LessonRow[]>([]);
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [pupils, setPupils] = useState<Record<string, PupilRow>>({});

  const now = new Date();
  const monthLabel = now.toLocaleString("en-GB", { month: "long", year: "numeric" });
  const monthStart = startOfMonth(now);

  useEffect(() => {
    (async () => {
      try {
        const { data: auth } = await supabase.auth.getUser();
        const uid = auth.user?.id;
        if (!uid) {
          setLoading(false);
          return;
        }
        const monthIso = monthStart.toISOString();

        const [lessonsRes, historyRes] = await Promise.all([
          supabase
            .from("lessons")
            .select("id, pupil_id, status, lesson_date, duration_minutes, amount_due, payment_status")
            .eq("instructor_id", uid)
            .gte("lesson_date", monthIso),
          supabase
            .from("lesson_history")
            .select("id, pupil_id, amount_paid, payment_method, created_at, lesson_date")
            .eq("instructor_id", uid)
            .gte("created_at", monthIso)
            .order("created_at", { ascending: false }),
        ]);

        const ls = (lessonsRes.data ?? []) as LessonRow[];
        const hs = (historyRes.data ?? []) as HistoryRow[];
        setLessons(ls);
        setHistory(hs);

        const pupilIds = Array.from(
          new Set([...ls, ...hs].map((r) => r.pupil_id).filter((x): x is string => !!x)),
        );
        if (pupilIds.length) {
          const { data: pData } = await supabase
            .from("pupils")
            .select("id, first_name, last_name")
            .in("id", pupilIds);
          const map: Record<string, PupilRow> = {};
          (pData ?? []).forEach((p: any) => (map[p.id] = p));
          setPupils(map);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const earnings = useMemo(
    () => history.reduce((s, r) => s + Number(r.amount_paid || 0), 0),
    [history],
  );
  const completed = useMemo(
    () => lessons.filter((l) => (l.status || "").toLowerCase() === "completed"),
    [lessons],
  );
  const lessonsCount = completed.length;
  const totalMinutes = completed.reduce((s, l) => s + Number(l.duration_minutes || 0), 0);
  const outstanding = lessons
    .filter((l) => (l.payment_status || "").toLowerCase() === "unpaid")
    .reduce((s, l) => s + Number(l.amount_due || 0), 0);

  // Tax estimate
  const daysElapsed = Math.max(1, now.getDate());
  const projectedAnnual = (earnings / daysElapsed) * 365;
  const personalAllowance = 12570;
  const higherBand = 50270;
  const taxable = Math.max(0, projectedAnnual - personalAllowance);
  const basicTax = Math.min(taxable, higherBand - personalAllowance) * 0.2;
  const higherTax = Math.max(0, projectedAnnual - higherBand) * 0.4;
  const incomeTax = basicTax + higherTax;
  const niLower = Math.max(0, Math.min(projectedAnnual, higherBand) - personalAllowance) * 0.09;
  const niUpper = Math.max(0, projectedAnnual - higherBand) * 0.02;
  const ni = niLower + niUpper;
  const totalTax = incomeTax + ni;

  // Weekly bars (last 4 weeks)
  const weeks = useMemo(() => {
    const out: { label: string; total: number; start: Date; end: Date }[] = [];
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    for (let i = 3; i >= 0; i--) {
      const end = new Date(today);
      end.setDate(today.getDate() - i * 7);
      const start = new Date(end);
      start.setDate(end.getDate() - 6);
      const total = history
        .filter((h) => {
          const d = new Date(h.created_at);
          return d >= start && d <= new Date(end.getTime() + 86399999);
        })
        .reduce((s, h) => s + Number(h.amount_paid || 0), 0);
      const fmt = (d: Date) =>
        d.toLocaleString("en-GB", { day: "numeric", month: "short" });
      out.push({ label: `${fmt(start)}–${fmt(end)}`, total, start, end });
    }
    return out;
  }, [history]);
  const maxWeek = Math.max(1, ...weeks.map((w) => w.total));

  const pupilName = (id: string | null) => {
    if (!id) return "Unknown";
    const p = pupils[id];
    if (!p) return "Pupil";
    return [p.first_name, p.last_name].filter(Boolean).join(" ") || "Pupil";
  };

  const exportCSV = () => {
    const headers = ["Date", "Pupil", "Amount", "Method"];
    const rows = history.map((h) => [
      new Date(h.created_at).toLocaleDateString("en-GB"),
      pupilName(h.pupil_id).replace(/,/g, " "),
      Number(h.amount_paid || 0).toFixed(2),
      (h.payment_method || "").replace(/,/g, " "),
    ]);
    const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `mtd-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ minHeight: "100vh", background: "#fff", ...POPPINS, paddingBottom: 80 }}>
      {/* Top bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "16px",
          borderBottom: BORDER,
          position: "sticky",
          top: 0,
          background: "#fff",
          zIndex: 10,
        }}
      >
        <button
          onClick={() => navigate({ to: "/home" })}
          aria-label="Back"
          style={{ background: "none", border: "none", padding: 4, cursor: "pointer" }}
        >
          <ArrowLeft size={22} color="#0B1F3A" />
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <BarChart3 size={20} color="#1877D6" />
          <div>
            <div style={{ fontWeight: 700, fontSize: 16, color: "#0B1F3A" }}>Month to date</div>
            <div style={{ fontSize: 12, color: "#6B7280" }}>{monthLabel}</div>
          </div>
        </div>
      </div>

      <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
        {/* Stats 2x2 */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div style={CARD}>
            <div style={{ fontSize: 12, color: "#6B7280" }}>Earnings this month</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: "#16A34A", marginTop: 4 }}>
              {loading ? "…" : fmtGBP(earnings)}
            </div>
          </div>
          <div style={CARD}>
            <div style={{ fontSize: 12, color: "#6B7280" }}>Lessons completed</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: "#0B1F3A", marginTop: 4 }}>
              {loading ? "…" : lessonsCount}
            </div>
          </div>
          <div style={CARD}>
            <div style={{ fontSize: 12, color: "#6B7280" }}>Hours taught</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: "#0B1F3A", marginTop: 4 }}>
              {loading ? "…" : fmtHM(totalMinutes)}
            </div>
          </div>
          <div style={CARD}>
            <div style={{ fontSize: 12, color: "#6B7280" }}>Outstanding</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: "#CC2229", marginTop: 4 }}>
              {loading ? "…" : fmtGBP(outstanding)}
            </div>
          </div>
        </div>

        {/* Tax estimate */}
        <div style={CARD}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <Calculator size={18} color="#1877D6" />
            <div style={{ fontWeight: 700, color: "#0B1F3A" }}>Tax estimate</div>
          </div>
          <Row label="Projected annual" value={fmtGBP(projectedAnnual, { maximumFractionDigits: 0 })} />
          <Row label="Income tax (est.)" value={fmtGBP(incomeTax, { maximumFractionDigits: 0 })} />
          <Row label="National Insurance (Class 4)" value={fmtGBP(ni, { maximumFractionDigits: 0 })} />
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginTop: 8,
              paddingTop: 8,
              borderTop: BORDER,
            }}
          >
            <div style={{ fontWeight: 600, color: "#0B1F3A" }}>Total estimated tax</div>
            <div style={{ fontWeight: 700, color: "#D97706" }}>
              {fmtGBP(totalTax, { maximumFractionDigits: 0 })}
            </div>
          </div>
          <div style={{ fontSize: 11, color: "#6B7280", marginTop: 8 }}>
            This is an estimate only. Consult a qualified accountant for tax advice.
          </div>
        </div>

        {/* Weekly bar chart */}
        <div style={CARD}>
          <div style={{ fontWeight: 700, color: "#0B1F3A", marginBottom: 10 }}>
            Earnings by week
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {weeks.map((w) => (
              <div key={w.label} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 84, fontSize: 11, color: "#6B7280" }}>{w.label}</div>
                <div style={{ flex: 1, background: "#F3F4F6", borderRadius: 6, overflow: "hidden" }}>
                  <div
                    style={{
                      background: "#1877D6",
                      height: 24,
                      width: `${(w.total / maxWeek) * 100}%`,
                      minWidth: w.total > 0 ? 4 : 0,
                      borderRadius: 6,
                    }}
                  />
                </div>
                <div style={{ width: 70, textAlign: "right", fontSize: 12, color: "#0B1F3A" }}>
                  {fmtGBP(w.total, { maximumFractionDigits: 0 })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent payments */}
        <div style={CARD}>
          <div style={{ fontWeight: 700, color: "#0B1F3A", marginBottom: 10 }}>
            Recent payments
          </div>
          {history.length === 0 && !loading ? (
            <div style={{ fontSize: 13, color: "#6B7280" }}>No payments this month.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column" }}>
              {history.slice(0, 10).map((h, i) => (
                <div
                  key={h.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "10px 0",
                    borderTop: i === 0 ? "none" : BORDER,
                  }}
                >
                  <div>
                    <div style={{ fontSize: 14, color: "#0B1F3A", fontWeight: 600 }}>
                      {pupilName(h.pupil_id)}
                    </div>
                    <div style={{ fontSize: 11, color: "#6B7280" }}>
                      {new Date(h.created_at).toLocaleDateString("en-GB")} ·{" "}
                      {h.payment_method || "—"}
                    </div>
                  </div>
                  <div style={{ fontWeight: 700, color: "#16A34A" }}>
                    {fmtGBP(Number(h.amount_paid || 0))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Export */}
        <button
          onClick={exportCSV}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            background: "#1877D6",
            color: "#fff",
            border: "none",
            borderRadius: 12,
            padding: "14px",
            fontWeight: 600,
            fontSize: 14,
            cursor: "pointer",
            marginTop: 4,
          }}
        >
          <Download size={16} /> Export CSV
        </button>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0" }}>
      <div style={{ fontSize: 13, color: "#6B7280" }}>{label}</div>
      <div style={{ fontSize: 13, color: "#0B1F3A", fontWeight: 600 }}>{value}</div>
    </div>
  );
}
