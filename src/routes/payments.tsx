import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { BottomNav } from "../components/dsm/BottomNav";
import { Card } from "../components/dsm/Card";
import { SectionHeader } from "../components/dsm/SectionHeader";
import { Button } from "../components/dsm/Button";
import { supabase } from "../lib/supabaseClient";

export const Route = createFileRoute("/payments")({
  head: () => ({
    meta: [
      { title: "Payments — DSM by EveryDriver" },
      { name: "description", content: "Track outstanding balances and recent payments." },
    ],
  }),
  component: PaymentsPage,
});

interface OutstandingPupil {
  id: string;
  first_name: string;
  last_name: string;
  balance_owed: number;
}

interface PaymentRow {
  id: string;
  pupil_id: string;
  amount: number;
  paid_at: string;
  pupils: { first_name: string; last_name: string } | null;
}

function formatGBP(amount: number) {
  return `£${amount.toFixed(2)}`;
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function PaymentsPage() {
  const [outstanding, setOutstanding] = useState<OutstandingPupil[] | null>(null);
  const [payments, setPayments] = useState<PaymentRow[] | null>(null);

  useEffect(() => {
    supabase
      .from("pupils")
      .select("id, first_name, last_name, balance_owed")
      .gt("balance_owed", 0)
      .order("first_name", { ascending: true })
      .then(({ data }) => setOutstanding((data as OutstandingPupil[]) ?? []));

    supabase
      .from("payments")
      .select("id, pupil_id, amount, paid_at, pupils(first_name, last_name)")
      .order("paid_at", { ascending: false })
      .then(({ data }) => setPayments((data as unknown as PaymentRow[]) ?? []));
  }, []);

  async function markPaid(pupil: OutstandingPupil) {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) return;

    const amount = pupil.balance_owed;

    const { error: updErr } = await supabase
      .from("pupils")
      .update({ balance_owed: 0 })
      .eq("id", pupil.id);
    if (updErr) return;

    const { data: inserted, error: insErr } = await supabase
      .from("payments")
      .insert({
        pupil_id: pupil.id,
        instructor_id: userId,
        amount,
        paid_at: new Date().toISOString(),
      })
      .select("id, pupil_id, amount, paid_at")
      .single();
    if (insErr) return;

    setOutstanding((prev) => (prev ?? []).filter((p) => p.id !== pupil.id));
    if (inserted) {
      const newRow: PaymentRow = {
        ...inserted,
        pupils: { first_name: pupil.first_name, last_name: pupil.last_name },
      };
      setPayments((prev) => [newRow, ...(prev ?? [])]);
    }
  }

  return (
    <div
      className="min-h-screen bg-white pb-24 pb-safe"
      style={{ fontFamily: "Poppins, sans-serif" }}
    >
      <div className="px-4 pt-6">
        <p
          className="text-[20px] font-semibold"
          style={{ color: "#0F2044", fontFamily: "Poppins, sans-serif" }}
        >
          Payments
        </p>

        <SectionHeader>Outstanding</SectionHeader>

        {outstanding === null ? null : outstanding.length === 0 ? (
          <div className="flex items-center justify-center py-10">
            <p className="text-[14px] text-[#6B7280]">No outstanding balances</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {outstanding.map((p) => (
              <Card key={p.id}>
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-[14px] font-semibold text-[#0F2044] truncate">
                      {p.first_name} {p.last_name}
                    </div>
                    <div className="text-[14px] font-semibold" style={{ color: "#CC2229" }}>
                      {formatGBP(Number(p.balance_owed))}
                    </div>
                  </div>
                  <Button variant="ghost" inline onClick={() => markPaid(p)}>
                    Mark paid
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}

        <SectionHeader>Recent payments</SectionHeader>

        {payments === null ? null : payments.length === 0 ? (
          <div className="flex items-center justify-center py-10">
            <p className="text-[14px] text-[#6B7280]">No payments recorded</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {payments.map((row) => (
              <Card key={row.id}>
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-[14px] font-semibold text-[#0F2044] truncate">
                      {row.pupils
                        ? `${row.pupils.first_name} ${row.pupils.last_name}`
                        : "Unknown pupil"}
                    </div>
                    <div className="text-[13px] text-[#6B7280]">
                      {formatDate(row.paid_at)}
                    </div>
                  </div>
                  <div
                    className="text-[14px] font-semibold shrink-0"
                    style={{ color: "#16A34A" }}
                  >
                    {formatGBP(Number(row.amount))}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <BottomNav active="payments" />
    </div>
  );
}
