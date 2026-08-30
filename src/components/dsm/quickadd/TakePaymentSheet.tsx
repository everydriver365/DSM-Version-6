import { useEffect, useMemo, useState } from "react";
import { toast } from "@/lib/toast";
import { BottomSheet } from "../BottomSheetV2";
import { supabase } from "@/lib/supabaseClient";
import { recordPayment } from "@/lib/payments";
import { FONT, NAVY, HAIRLINE, TextField, TextAreaField, PillGroup, Field, fieldCard, SheetFooter } from "./fields";

const METHODS = [
  { value: "cash", label: "Cash" },
  { value: "bank_transfer", label: "Bank" },
  { value: "card", label: "Card" },
];

interface PupilOption {
  id: string;
  name: string;
}

export function TakePaymentSheet({
  open,
  onClose,
  onSaved,
  onOpenFullPage,
}: {
  open: boolean;
  onClose: () => void;
  onSaved?: () => void;
  onOpenFullPage?: () => void;
}) {
  const [pupils, setPupils] = useState<PupilOption[]>([]);
  const [pupilId, setPupilId] = useState("");
  const [query, setQuery] = useState("");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("cash");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    void (async () => {
      const { data: u } = await supabase.auth.getUser();
      const userId = u?.user?.id;
      if (!userId) return;
      const { data } = await supabase
        .from("pupils")
        .select("id, name, first_name, last_name")
        .eq("instructor_id", userId)
        .is("deleted_at", null)
        .order("name");
      const rows = (data ?? []) as Array<{
        id: string;
        name: string | null;
        first_name: string | null;
        last_name: string | null;
      }>;
      setPupils(
        rows.map((r) => ({
          id: r.id,
          name: (r.name ?? `${r.first_name ?? ""} ${r.last_name ?? ""}`.trim()) || "Unnamed",
        })),
      );
    })();
  }, [open]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q ? pupils.filter((p) => p.name.toLowerCase().includes(q)) : pupils;
    return list.slice(0, 40);
  }, [pupils, query]);

  const selected = pupils.find((p) => p.id === pupilId) ?? null;

  if (!open) return null;

  const reset = () => {
    setPupilId("");
    setQuery("");
    setAmount("");
    setMethod("cash");
    setNotes("");
  };

  const close = () => {
    if ((pupilId || amount || notes) && !window.confirm("You have unsaved changes. Discard them?")) return;
    reset();
    onClose();
  };

  const handleSave = async () => {
    const amountNum = Number(amount);
    if (!pupilId) {
      toast.error("Choose a pupil");
      return;
    }
    if (!(amountNum > 0)) {
      toast.error("Enter an amount");
      return;
    }
    setSaving(true);
    try {
      const { data: pupilRow } = await supabase
        .from("pupils")
        .select("account_balance")
        .eq("id", pupilId)
        .maybeSingle();
      const currentAccountBalance = Number(
        (pupilRow as { account_balance?: number | null } | null)?.account_balance ?? 0,
      );
      await recordPayment({
        pupilId,
        amount: amountNum,
        method,
        notes: notes.trim() || null,
        currentAccountBalance,
      } as Parameters<typeof recordPayment>[0]);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("dsm-payment-recorded"));
      }
      toast.success("Payment recorded — balance updated");
      reset();
      onSaved?.();
      onClose();
    } catch (e) {
      console.error("[take-payment-sheet]", e);
      toast.error("Couldn't record payment");
    } finally {
      setSaving(false);
    }
  };

  return (
    <BottomSheet
      title="Take payment"
      subtitle="Record cash, bank or card"
      onClose={close}
      footer={
        <SheetFooter onCancel={close} onSave={handleSave} saving={saving} saveLabel="Record payment" />
      }
    >
      <div style={{ fontFamily: FONT }}>
        <Field label="Pupil">
          {selected ? (
            <div style={{ ...fieldCard, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: 15, color: NAVY, fontWeight: 600 }}>{selected.name}</span>
              <button
                type="button"
                onClick={() => setPupilId("")}
                style={{ background: "none", border: "none", color: "#1877D6", fontFamily: FONT, fontSize: 13, fontWeight: 600 }}
              >
                Change
              </button>
            </div>
          ) : (
            <div>
              <div style={{ ...fieldCard, marginBottom: 8 }}>
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search pupils…"
                  style={{
                    width: "100%",
                    border: "none",
                    outline: "none",
                    background: "transparent",
                    fontFamily: FONT,
                    fontSize: 15,
                    color: NAVY,
                    height: 26,
                  }}
                />
              </div>
              <div
                style={{
                  background: "#fff",
                  borderRadius: 12,
                  border: `1px solid ${HAIRLINE}`,
                  maxHeight: 200,
                  overflowY: "auto",
                }}
              >
                {filtered.length === 0 ? (
                  <div style={{ padding: 14, fontSize: 13, color: "#8A93A3" }}>No pupils found</div>
                ) : (
                  filtered.map((p, i) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setPupilId(p.id)}
                      style={{
                        display: "block",
                        width: "100%",
                        textAlign: "left",
                        padding: "12px 14px",
                        background: "none",
                        border: "none",
                        borderTop: i === 0 ? "none" : `1px solid ${HAIRLINE}`,
                        fontFamily: FONT,
                        fontSize: 14.5,
                        color: NAVY,
                      }}
                    >
                      {p.name}
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </Field>

        <TextField
          label="Amount (£)"
          value={amount}
          onChange={setAmount}
          placeholder="0.00"
          inputMode="decimal"
        />
        <PillGroup label="Method" value={method} onChange={setMethod} options={METHODS} />
        <TextAreaField label="Note (optional)" value={notes} onChange={setNotes} placeholder="Reference or note" rows={3} />

        {onOpenFullPage && (
          <button
            type="button"
            onClick={() => {
              reset();
              onOpenFullPage();
            }}
            style={{
              width: "100%",
              padding: "12px 0",
              background: "transparent",
              border: "none",
              color: "#1877D6",
              fontFamily: FONT,
              fontSize: 13.5,
              fontWeight: 600,
            }}
          >
            Card / QR payment options
          </button>
        )}
      </div>
    </BottomSheet>
  );
}

export default TakePaymentSheet;
