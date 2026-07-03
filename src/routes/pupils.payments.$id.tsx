import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, PoundSterling } from "lucide-react";
import { Card } from "../components/dsm/Card";
import { SectionHeader } from "../components/dsm/SectionHeader";
import { supabase } from "../lib/supabaseClient";

export const Route = createFileRoute("/pupils/payments/$id")({
  head: () => ({
    meta: [{ title: "Payment history — DSM by EveryDriver" }],
  }),
  component: PupilPaymentsPage,
});

const POPPINS = { fontFamily: "Inter, sans-serif" } as const;

interface PaymentRow {
  id: string;
  lesson_cost: number | null;
  created_at: string;
  payment_method: string | null;
}

function formatGBP(amount: number | null) {
  if (amount == null) return "£0.00";
  return `£${Number(amount).toFixed(2)}`;
}

function balanceLabel(net: number) {
  if (net > 0) return "Balance owed";
  if (net < 0) return "Account credit";
  return "All paid";
}

function balanceValue(accountBalance: number | null, balanceOwed: number | null) {
  const credit = Number(accountBalance ?? 0);
  const owed = Number(balanceOwed ?? 0);
  const net = owed - credit;
  return { net, credit, owed };
}

function formatDate(d: Date) {
  return d.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatMethod(method: string | null) {
  if (!method) return "Payment";
  return method.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function PupilPaymentsPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const [pupilName, setPupilName] = useState<string>("");
  const [accountBalance, setAccountBalance] = useState<number | null>(null);
  const [balanceOwed, setBalanceOwed] = useState<number | null>(null);
  const [payments, setPayments] = useState<PaymentRow[] | null>(null);

  useEffect(() => {
    supabase
      .from("pupils")
      .select("name, account_balance, balance_owed")
      .eq("id", id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) console.error("[pupil-payments] pupil fetch error", error);
        const p = (data as { name?: string | null; account_balance?: number | null; balance_owed?: number | null } | null) ?? null;
        setPupilName(p?.name ?? "");
        setAccountBalance(p?.account_balance ?? null);
        setBalanceOwed(p?.balance_owed ?? null);
      });

    // Live owed amount from unpaid lessons (matches pupil profile calculation)
    supabase
      .from("lessons")
      .select("duration_minutes, amount_due, payment_status, status")
      .eq("pupil_id", id)
      .is("deleted_at", null)
      .neq("status", "cancelled")
      .then(({ data, error }) => {
        if (error) {
          console.error("[pupil-payments] unpaid lessons error", error);
          return;
        }
        const rows = (data as { duration_minutes: number | null; amount_due: number | null; payment_status: string | null }[] | null) ?? [];
        const owed = rows
          .filter((r) => r.payment_status !== "paid")
          .reduce((sum, r) => sum + Number(r.amount_due || 0), 0);
        setBalanceOwed(Math.round(owed * 100) / 100);
      });

    supabase
      .from("lesson_history")
      .select("id, lesson_cost, created_at, payment_method")
      .eq("pupil_id", id)
      .eq("payment_status", "paid")
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (error) console.error("[pupil-payments] history error", error);
        setPayments((data as PaymentRow[] | null) ?? []);
      });
  }, [id]);

  const totalPaid = (payments ?? []).reduce((sum, p) => sum + Number(p.lesson_cost ?? 0), 0);

  return (
    <div className="min-h-screen bg-white pb-8" style={POPPINS}>
      <div
        className="sticky top-0 z-40 flex items-center px-2"
        style={{ height: 52, backgroundColor: "#0B1F3A" }}
      >
        <button
          type="button"
          aria-label="Back"
          onClick={() => navigate({ to: "/pupils/$id", params: { id } })}
          className="flex items-center justify-center"
          style={{ width: 40, height: 40 }}
        >
          <ArrowLeft size={22} color="#FFFFFF" />
        </button>
        <div
          className="flex-1 text-center text-[15px] font-semibold text-white"
          style={POPPINS}
        >
          Payment history
        </div>
        <div style={{ width: 40 }} />
      </div>

      <div className="px-4 mt-3">
        {pupilName && (
          <div className="text-[16px] font-semibold text-[#0B1F3A] mb-3" style={POPPINS}>
            {pupilName}
          </div>
        )}

        {(() => {
          const { net, owed } = balanceValue(accountBalance, balanceOwed);
          return (
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="rounded-xl p-4" style={{ backgroundColor: "#0F2044" }}>
                <p
                  className="text-[10px] font-bold uppercase tracking-widest"
                  style={{ color: "rgba(255,255,255,0.5)", ...POPPINS }}
                >
                  {balanceLabel(net)}
                </p>
                <p className="text-[22px] font-bold text-white mt-1" style={POPPINS}>
                  {formatGBP(Math.abs(net))}
                </p>
              </div>
              <div className="rounded-xl p-4" style={{ backgroundColor: "#F1F5F9" }}>
                <p
                  className="text-[10px] font-bold uppercase tracking-widest"
                  style={{ color: "#64748B", ...POPPINS }}
                >
                  Total paid
                </p>
                <p className="text-[22px] font-bold text-[#0B1F3A] mt-1" style={POPPINS}>
                  {formatGBP(totalPaid)}
                </p>
              </div>
              <div className="rounded-xl p-4" style={{ backgroundColor: "#F1F5F9" }}>
                <p
                  className="text-[10px] font-bold uppercase tracking-widest"
                  style={{ color: "#64748B", ...POPPINS }}
                >
                  Owed
                </p>
                <p className="text-[22px] font-bold text-[#0B1F3A] mt-1" style={POPPINS}>
                  {formatGBP(owed)}
                </p>
              </div>
            </div>
          );
        })()}

        {payments === null ? null : payments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <PoundSterling size={40} color="#6B7280" />
            <p className="mt-3 text-[14px] text-[#6B7280]" style={POPPINS}>
              No payment history
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <SectionHeader>Payments</SectionHeader>
            {payments.map((p) => (
              <Card key={p.id}>
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div
                      className="text-[14px] font-semibold text-[#0B1F3A]"
                      style={POPPINS}
                    >
                      {formatDate(new Date(p.created_at))}
                    </div>
                    <div className="text-[13px] text-[#6B7280]" style={POPPINS}>
                      {formatMethod(p.payment_method)}
                    </div>
                  </div>
                  <div
                    className="text-[16px] font-bold text-[#0B1F3A] shrink-0"
                    style={POPPINS}
                  >
                    {formatGBP(p.lesson_cost)}
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
