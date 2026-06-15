import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ChevronLeft } from "lucide-react";
import { Card } from "../components/dsm/Card";
import { SectionHeader } from "../components/dsm/SectionHeader";
import { supabase } from "../lib/supabaseClient";

export const Route = createFileRoute("/earnings")({
  head: () => ({
    meta: [
      { title: "Earnings — DSM by EveryDriver" },
      { name: "description", content: "Track your weekly, monthly, and yearly earnings." },
    ],
  }),
  component: EarningsPage,
});

const POPPINS = { fontFamily: "Poppins, sans-serif" } as const;

interface PaymentRow {
  id: string;
  amount: number;
  paid_at: string | null;
  created_at: string;
  note: string | null;
  pupils: { name: string } | null;
}

function formatGBP(amount: number) {
  return `£${amount.toFixed(2)}`;
}
function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
function startOfWeek(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  const day = (x.getDay() + 6) % 7;
  x.setDate(x.getDate() - day);
  return x;
}
function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function startOfYear(d: Date) {
  return new Date(d.getFullYear(), 0, 1);
}

function EarningsPage() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [payments, setPayments] = useState<PaymentRow[] | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      setUserId(data.user?.id ?? null);
    })();
  }, []);

  useEffect(() => {
    if (!userId) return;
    supabase
      .from("payments")
      .select("id, amount, paid_at, created_at, note, pupils(name)")
      .eq("instructor_id", userId)
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (error) console.error("[earnings] fetch error", error);
        setPayments((data as unknown as PaymentRow[]) ?? []);
      });
  }, [userId]);

  const { week, month, year } = useMemo(() => {
    const now = new Date();
    const ws = startOfWeek(now).getTime();
    const ms = startOfMonth(now).getTime();
    const ys = startOfYear(now).getTime();
    let w = 0;
    let m = 0;
    let y = 0;
    (payments ?? []).forEach((p) => {
      const amt = Number(p.amount ?? 0);
      const t = new Date(p.paid_at ?? p.created_at).getTime();
      if (t >= ys) y += amt;
      if (t >= ms) m += amt;
      if (t >= ws) w += amt;
    });
    return { week: w, month: m, year: y };
  }, [payments]);

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
        <div className="flex-1 text-center text-white text-[15px] font-semibold" style={POPPINS}>
          Earnings
        </div>
        <div style={{ width: 40 }} />
      </div>

      {/* Summary card */}
      <div
        className="mx-4 mt-3"
        style={{ backgroundColor: "#0F2044", borderRadius: 12, padding: 16 }}
      >
        <SummaryRow label="THIS WEEK" value={formatGBP(week)} />
        <Divider />
        <SummaryRow label="THIS MONTH" value={formatGBP(month)} />
        <Divider />
        <SummaryRow label="THIS YEAR" value={formatGBP(year)} />
      </div>

      <div className="px-4">
        <SectionHeader>PAYMENT HISTORY</SectionHeader>

        {payments === null ? null : payments.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <p className="text-[14px] text-[#6B7280]" style={POPPINS}>
              No payments recorded
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {payments.map((row) => (
              <Card key={row.id}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div
                      className="text-[14px] font-semibold text-[#0F2044] truncate"
                      style={POPPINS}
                    >
                      {row.pupils?.name ?? "Unknown pupil"}
                    </div>
                    <div className="text-[13px] text-[#6B7280] mt-0.5" style={POPPINS}>
                      {formatDate(row.paid_at ?? row.created_at)}
                    </div>
                    {row.note && (
                      <div
                        className="text-[12px] text-[#6B7280] mt-1 italic"
                        style={POPPINS}
                      >
                        {row.note}
                      </div>
                    )}
                  </div>
                  <div
                    className="text-[14px] font-bold shrink-0"
                    style={{ color: "#16A34A", ...POPPINS }}
                  >
                    {formatGBP(Number(row.amount))}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="py-2">
      <div
        className="text-[10px] font-medium uppercase"
        style={{ color: "#9CA3AF", letterSpacing: "0.05em", ...POPPINS }}
      >
        {label}
      </div>
      <div
        className="text-[28px] font-bold mt-1 leading-none"
        style={{ color: "#F59E0B", ...POPPINS }}
      >
        {value}
      </div>
    </div>
  );
}

function Divider() {
  return (
    <div
      style={{
        height: "0.5px",
        backgroundColor: "#1F2F55",
        margin: "4px 0",
      }}
    />
  );
}
