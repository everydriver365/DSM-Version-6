import { useEffect, useState } from "react";
import { Upload } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "../../lib/supabaseClient";
import { BottomSheet } from "../dsm/BottomSheetV2";

const NAVY = "#0B1F3A";
const BLUE = "#1877D6";
const BORDER = "0.5px solid #EEF2F7";

const CATEGORIES = [
  "Fuel",
  "Vehicle",
  "Insurance",
  "Training",
  "Equipment",
  "Marketing",
  "Software",
  "Other",
] as const;

const FREQUENCIES = ["Weekly", "Monthly", "Quarterly", "Annually"] as const;

const todayISO = () => new Date().toISOString().slice(0, 10);

const SUPABASE_URL = "https://bjpqxfrihwjcqprmoqfs.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJqcHF4ZnJpaHdqY3Fwcm1vcWZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE0NzQ4MjEsImV4cCI6MjA5NzA1MDgyMX0.HKlgx3dxP3uxX9wMRRUnfb0IPwaBpFcut_iUgT5XFeo";

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
      <span style={{ fontSize: 14, fontWeight: 600, color: NAVY }}>{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={value}
        onClick={() => onChange(!value)}
        style={{
          width: 46,
          height: 27,
          borderRadius: 999,
          border: 0,
          background: value ? BLUE : "#D7DEE8",
          position: "relative",
          cursor: "pointer",
          transition: "background 0.15s ease",
        }}
      >
        <span
          style={{
            position: "absolute",
            top: 3,
            left: value ? 22 : 3,
            width: 21,
            height: 21,
            borderRadius: 999,
            background: "#fff",
            boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
            transition: "left 0.15s ease",
          }}
        />
      </button>
    </div>
  );
}

export interface AddExpenseSheetProps {
  open: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

export default function AddExpenseSheet({ open, onClose, onSaved }: AddExpenseSheetProps) {
  const [instructorId, setInstructorId] = useState<string | null>(null);
  const [category, setCategory] = useState<string>("Fuel");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(todayISO());
  const [taxDed, setTaxDed] = useState(true);
  const [recurring, setRecurring] = useState(false);
  const [frequency, setFrequency] = useState<string>("Monthly");
  const [endDate, setEndDate] = useState("");
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let alive = true;
    supabase.auth.getUser().then(({ data }) => {
      if (alive) setInstructorId(data.user?.id ?? null);
    });
    return () => {
      alive = false;
    };
  }, []);

  const reset = () => {
    setCategory("Fuel");
    setDescription("");
    setAmount("");
    setDate(todayISO());
    setTaxDed(true);
    setRecurring(false);
    setFrequency("Monthly");
    setEndDate("");
    setReceiptFile(null);
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
      let receipt_url: string | null = null;
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

      const basePayload: Record<string, unknown> = {
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

      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;

      const post = async (payload: Record<string, unknown>) => {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/expenses`, {
          method: "POST",
          headers: {
            apikey: SUPABASE_ANON_KEY,
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            Prefer: "return=representation",
          },
          body: JSON.stringify(payload),
        });
        const body = await res.json().catch(() => null);
        return { res, body };
      };

      let payload = { ...basePayload };
      if (recurring && endDate) payload.recurring_end_date = endDate;

      let { res, body } = await post(payload);
      // If the optional end-date column doesn't exist, retry without it.
      if (!res.ok && recurring && endDate) {
        ({ res, body } = await post(basePayload));
      }

      if (!res.ok) {
        const msg = body?.message || body?.error || "Save failed";
        console.error("[expenses] save error", msg);
        toast.error(msg);
        setSaving(false);
        return;
      }

      toast.success("Expense added");
      reset();
      setSaving(false);
      onSaved?.();
      onClose();
    } catch (e: any) {
      console.error("[expenses] unexpected", e);
      toast.error(e?.message || "Something went wrong");
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <BottomSheet
      title="Add expense"
      subtitle="Log a business cost"
      onClose={onClose}
      footer={
        <button
          type="button"
          disabled={saving}
          onClick={submit}
          style={{
            width: "100%",
            background: BLUE,
            color: "#fff",
            padding: "14px 16px",
            border: 0,
            borderRadius: 12,
            fontWeight: 700,
            fontSize: 15,
            cursor: saving ? "not-allowed" : "pointer",
            opacity: saving ? 0.7 : 1,
          }}
        >
          {saving ? "Saving…" : "Save expense"}
        </button>
      }
    >
      <Field label="Category">
        <select value={category} onChange={(e) => setCategory(e.target.value)} style={inputStyle}>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Description">
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="e.g. Fuel at Shell"
          style={inputStyle}
        />
      </Field>

      <Field label="Amount">
        <div style={{ position: "relative" }}>
          <span
            style={{
              position: "absolute",
              left: 14,
              top: "50%",
              transform: "translateY(-50%)",
              fontSize: 15,
              color: "#6B7280",
              fontWeight: 600,
            }}
          >
            £
          </span>
          <input
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            style={{ ...inputStyle, paddingLeft: 28 }}
          />
        </div>
      </Field>

      <Field label="Date">
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={inputStyle} />
      </Field>

      <ToggleRow label="Tax deductible" value={taxDed} onChange={setTaxDed} />
      <ToggleRow label="Recurring" value={recurring} onChange={setRecurring} />

      {recurring && (
        <div style={{ marginTop: 12 }}>
          <Field label="Frequency">
            <select value={frequency} onChange={(e) => setFrequency(e.target.value)} style={inputStyle}>
              {FREQUENCIES.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </Field>
          <Field label="End date (optional)">
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              style={inputStyle}
            />
          </Field>
        </div>
      )}

      <Field label="Receipt (optional)">
        <label
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "10px 12px",
            border: BORDER,
            background: "#fff",
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
    </BottomSheet>
  );
}
