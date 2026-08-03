import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { QRCodeSVG } from "qrcode.react";
import {
  Banknote,
  Building2,
  Clock,
  Copy,
  Landmark,
  Link2,
  Mail,
  MessageSquare,
  Package,
  QrCode,
  Search,
  Sparkles,
  CreditCard,
} from "lucide-react";
import { toast } from "sonner";
import { IconCircleCheck, IconReceipt } from "@tabler/icons-react";
import { supabase } from "@/lib/supabaseClient";
import { BottomSheet } from "@/components/dsm/BottomSheetV2";
import { recordPayment, recordRefund, recordStandalonePayment, getPupilBalance, type PupilBalance } from "@/lib/payments";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// ---------------------------------------------------------------------------
// Design tokens — Checkfront × DSM
// ---------------------------------------------------------------------------
const WHITE = "#fff";
const BORDER = "#E5E7EB";
const DIVIDER = "#F3F4F6";
const NAVY = "#0B1F3A";
const BODY = "#374151";
const MUTED = "#9CA3AF";
const BLUE = "#1877D6";
const BLUE_BG = "#EFF6FF";
const RED = "#CC2229";
const GREEN = "#15803D";
const GREEN_BG = "#F0FDF4";
const AMBER = "#92400E";
const AMBER_BG = "#FFFBEB";
const PURPLE = "#7C5CFC";
const FONT = "Poppins, sans-serif";

const money = (n: number) => `£${(Number(n) || 0).toFixed(2)}`;
const todayIso = () => new Date().toISOString().slice(0, 10);

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type PricingType = "block" | "national_intensives" | "standard" | "custom";
type PayMethod = "cash" | "bank_transfer" | "qr" | "link" | "klarna" | "clearpay";
type TabKey = "payment" | "pricing";

export interface UnifiedPaymentSheetProps {
  open: boolean;
  onClose: () => void;
  onSaved?: () => void;
  initialPupilId?: string;
}

interface PupilRow {
  id: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  pricing_type: string | null;
  prepaid_hours: number | null;
  block_hours_total: number | null;
  prepaid_amount_paid: number | null;
  ni_amount_total: number | null;
  ni_amount_paid: number | null;
  ni_payer: string | null;
  ni_reference: string | null;
  account_balance: number | null;
}

interface InstructorRow {
  name: string | null;
  hourly_rate: number | null;
  klarna_enabled: boolean | null;
  clearpay_enabled: boolean | null;
  accepted_payment_methods: string[] | null;
}

interface UnpaidLesson {
  id: string;
  lesson_date: string | null;
  duration: number | null;
  amount_due: number | null;
  paid_amount: number | null;
  payment_status: string | null;
}

interface HistoryRow {
  id: string;
  amount: number;
  method: string | null;
  created_at: string | null;
  lesson_date: string | null;
  notes: string | null;
}

const PRICING_OPTIONS: {
  key: PricingType;
  label: string;
  sublabel?: string;
  Icon: React.ComponentType<{ size?: number; color?: string }>;
}[] = [
  { key: "block", label: "Block", Icon: Package },
  { key: "national_intensives", label: "National Intensives", Icon: Building2 },
  { key: "standard", label: "Standard", Icon: Clock },
  { key: "custom", label: "One-off", sublabel: "Single occasion payment", Icon: IconReceipt },
];

const METHOD_LABEL: Record<PayMethod, string> = {
  cash: "Cash",
  bank_transfer: "Bank transfer",
  qr: "QR code",
  link: "Pay link",
  klarna: "Klarna",
  clearpay: "Clearpay",
};

/** Canonical DB value for every PayMethod variant. */
const METHOD_DB: Record<PayMethod, string> = {
  cash: "cash",
  bank_transfer: "bank_transfer",
  qr: "card_qr",
  link: "card_link",
  klarna: "klarna",
  clearpay: "clearpay",
};

/** Map any UI method (or already-canonical string) to its DB value. */
const toDbMethod = (m: string | null | undefined): string => {
  if (!m) return "cash";
  const key = m.trim().toLowerCase().replace(/[\s-]+/g, "_");
  if (key in METHOD_DB) return METHOD_DB[key as PayMethod];
  const aliases: Record<string, string> = {
    card_qr: "card_qr",
    qr_code: "card_qr",
    card_link: "card_link",
    pay_link: "card_link",
    paylink: "card_link",
    bacs: "bank_transfer",
    bank: "bank_transfer",
    transfer: "bank_transfer",
    card: "card_link",
    refund: "refund",
  };
  return aliases[key] ?? key;
};


// ---------------------------------------------------------------------------
// Small presentational helpers
// ---------------------------------------------------------------------------
const inputStyle: React.CSSProperties = {
  width: "100%",
  height: 40,
  borderRadius: 8,
  border: `1px solid ${BORDER}`,
  background: WHITE,
  padding: "0 10px",
  fontSize: 13,
  color: NAVY,
  fontFamily: FONT,
  outline: "none",
  boxSizing: "border-box",
};

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: 9,
        fontWeight: 600,
        color: MUTED,
        textTransform: "uppercase",
        letterSpacing: "0.08em",
        marginBottom: 6,
        fontFamily: FONT,
      }}
    >
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ fontSize: 11, color: BODY, marginBottom: 4, fontFamily: FONT }}>{label}</div>
      {children}
    </div>
  );
}

function SummaryBar({ cells }: { cells: { label: string; value: string; color?: string }[] }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${cells.length}, 1fr)`,
        border: `1px solid ${BORDER}`,
        borderRadius: 10,
        background: WHITE,
        marginBottom: 12,
        overflow: "hidden",
      }}
    >
      {cells.map((c, i) => (
        <div
          key={c.label}
          style={{
            padding: "10px 8px",
            textAlign: "center",
            borderLeft: i === 0 ? "none" : `1px solid ${BORDER}`,
          }}
        >
          <div style={{ fontSize: 14, fontWeight: 700, color: c.color ?? NAVY, fontFamily: FONT }}>
            {c.value}
          </div>
          <div style={{ fontSize: 9, color: MUTED, marginTop: 2, fontFamily: FONT, textTransform: "uppercase", letterSpacing: "0.06em" }}>
            {c.label}
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// UnifiedPaymentSheet — the single place all payment actions happen
// ---------------------------------------------------------------------------
export function UnifiedPaymentSheet({
  open,
  onClose,
  onSaved,
  initialPupilId,
}: UnifiedPaymentSheetProps) {
  const navigate = useNavigate();

  const [instructorId, setInstructorId] = useState<string | null>(null);
  const [instructor, setInstructor] = useState<InstructorRow | null>(null);
  const [pupils, setPupils] = useState<PupilRow[]>([]);

  const [pupilId, setPupilId] = useState<string | null>(initialPupilId ?? null);
  const [customMode, setCustomMode] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(!initialPupilId);
  const [query, setQuery] = useState("");

  const [balance, setBalance] = useState<PupilBalance | null>(null);
  const [unpaidLessons, setUnpaidLessons] = useState<UnpaidLesson[]>([]);
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [outstandingMap, setOutstandingMap] = useState<Record<string, number>>({});

  const [tab, setTab] = useState<TabKey>("payment");

  // --- take payment state ---
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<PayMethod | null>("cash");
  const [partial, setPartial] = useState(false);
  const [note, setNote] = useState("");
  const [paymentDate, setPaymentDate] = useState(todayIso);
  const [saving, setSaving] = useState(false);
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [qrPaymentId, setQrPaymentId] = useState<string | null>(null);
  const [qrFullscreen, setQrFullscreen] = useState(false);
  const [payUrl, setPayUrl] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [refundRow, setRefundRow] = useState<HistoryRow | null>(null);
  const [refundAmount, setRefundAmount] = useState("");
  const [paymentSuccess, setPaymentSuccess] = useState<{
    historyId: string;
    amount: number;
    method: string;
    pupilName: string;
  } | null>(null);
  const [editPayment, setEditPayment] = useState<{
    historyId: string;
    amount: string;
    method: PayMethod;
    date: string;
    notes: string;
  } | null>(null);
  const [deletePayment, setDeletePayment] = useState<{
    historyId: string;
    amount: number;
    method: string | null;
    date: string | null;
  } | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [refundConfirmOpen, setRefundConfirmOpen] = useState(false);
  const [refundProcessing, setRefundProcessing] = useState(false);

  // --- pricing tab state ---
  const [pricingType, setPricingType] = useState<PricingType>("standard");
  const [hoursTotal, setHoursTotal] = useState("");
  const [packagePrice, setPackagePrice] = useState("");
  const [packageMethod, setPackageMethod] = useState<PayMethod>("cash");
  const [niTotal, setNiTotal] = useState("");
  const [niRef, setNiRef] = useState("");
  const [niPayer, setNiPayer] = useState<"national_intensives" | "pupil">("national_intensives");
  const [oneOffAmount, setOneOffAmount] = useState("");
  const [oneOffReason, setOneOffReason] = useState("");
  const [oneOffMethod, setOneOffMethod] = useState<PayMethod>("cash");
  const [savingPricing, setSavingPricing] = useState(false);

  const pupil = useMemo(() => pupils.find((p) => p.id === pupilId) ?? null, [pupils, pupilId]);
  const amountNum = Number(amount) || 0;
  const outstanding = balance?.outstanding ?? 0;
  const maxRefundableAmount = useMemo(() => {
    if (!balance) return 0;
    return Math.max(0, balance.lessonsPaid + balance.accountCredit);
  }, [balance]);
  // Cap for the currently selected ledger row: can't refund more than the row,
  // and can't refund more than the pupil's available paid/credit balance.
  const refundRowMax = useMemo(() => {
    if (!refundRow) return 0;
    return Math.min(refundRow.amount, maxRefundableAmount);
  }, [refundRow, maxRefundableAmount]);
  const refundAmountNum = Number(refundAmount) || 0;



  // ---- sheet open/close events ------------------------------------------
  useEffect(() => {
    if (!open || typeof window === "undefined") return;
    window.dispatchEvent(new Event("dsm-sheet-open"));
    return () => {
      window.dispatchEvent(new Event("dsm-sheet-close"));
    };
  }, [open]);

  const handleClose = useCallback(() => {
    if (typeof window !== "undefined") window.dispatchEvent(new Event("dsm-sheet-close"));
    onClose();
  }, [onClose]);

  const handlePaymentDone = useCallback(() => {
    onSaved?.();
    handleClose();
  }, [onSaved, handleClose]);

  const handleRecordAnother = useCallback(() => {
    setPaymentSuccess(null);
    setAmount("");
    setMethod("cash");
    setNote("");
    setPartial(false);
    setQrUrl(null);
    setPayUrl(null);
    setQrPaymentId(null);
  }, []);

  useEffect(() => {
    if (!paymentSuccess || editPayment || deletePayment) return;
    const t = setTimeout(() => handlePaymentDone(), 4000);
    return () => clearTimeout(t);
  }, [paymentSuccess, editPayment, deletePayment, handlePaymentDone]);

  // ---- reset on open -----------------------------------------------------
  useEffect(() => {
    if (!open) return;
    setPupilId(initialPupilId ?? null);
    setCustomMode(false);
    setPickerOpen(!initialPupilId);
    setQuery("");
    setTab("payment");
    setAmount("");
    setMethod("cash");
    setPartial(false);
    setNote("");
    setPaymentDate(todayIso());
    setQrUrl(null);
    setQrPaymentId(null);
    setQrFullscreen(false);
    setPayUrl(null);
    setRefundRow(null);
    setRefundAmount("");
    setRefundConfirmOpen(false);
    setRefundProcessing(false);
    setPaymentSuccess(null);
    setEditPayment(null);
    setDeletePayment(null);
  }, [open, initialPupilId]);

  // ---- close QR fullscreen with Escape key --------------------------------
  useEffect(() => {
    if (!qrFullscreen || typeof window === "undefined") return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setQrFullscreen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [qrFullscreen]);

  // ---- load pupils + instructor -----------------------------------------
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      const uid = u?.user?.id ?? null;
      if (cancelled || !uid) return;
      setInstructorId(uid);

      const [{ data: ps, error: pErr }, { data: ins, error: iErr }] = await Promise.all([
        supabase
          .from("pupils")
          .select(
            "id, name, phone, email, pricing_type, prepaid_hours, block_hours_total, prepaid_amount_paid, ni_amount_total, ni_amount_paid, ni_payer, ni_reference, account_balance",
          )
          .eq("instructor_id", uid)
          .is("deleted_at", null)
          .not("status", "in", "(inactive,archived,cancelled)")
          .order("name"),
        supabase
          .from("instructors")
          .select("name, hourly_rate, klarna_enabled, clearpay_enabled, accepted_payment_methods")
          .eq("id", uid)
          .maybeSingle(),
      ]);
      if (cancelled) return;
      if (pErr) console.warn("[UnifiedPaymentSheet] pupils", pErr);
      if (iErr) console.warn("[UnifiedPaymentSheet] instructor", iErr);
      setPupils((ps ?? []) as unknown as PupilRow[]);
      if (ins) setInstructor(ins as unknown as InstructorRow);
    })();
    return () => {
      cancelled = true;
    };
  }, [open]);

  // ---- outstanding per pupil for the dropdown ----------------------------
  useEffect(() => {
    if (!open || pupils.length === 0) return;
    let cancelled = false;
    (async () => {
      const ids = pupils.map((p) => p.id);
      const { data } = await supabase
        .from("lessons")
        .select("pupil_id, amount_due, paid_amount, payment_status")
        .in("pupil_id", ids)
        .neq("status", "cancelled")
        .is("deleted_at", null);
      if (cancelled) return;
      const map: Record<string, number> = {};
      for (const l of (data ?? []) as {
        pupil_id: string;
        amount_due: number | null;
        paid_amount: number | null;
        payment_status: string | null;
      }[]) {
        if (l.payment_status === "paid" || l.payment_status === "prepaid") continue;
        const rem = Number(l.amount_due ?? 0) - Number(l.paid_amount ?? 0);
        if (rem > 0) map[l.pupil_id] = (map[l.pupil_id] ?? 0) + rem;
      }
      setOutstandingMap(map);
    })();
    return () => {
      cancelled = true;
    };
  }, [open, pupils]);

  // ---- per-pupil data ----------------------------------------------------
  const loadPupilData = useCallback(
    async (id: string) => {
      const bal = await getPupilBalance(id);
      setBalance(bal);
      setAmount(""); // Always start blank — instructor enters amount

      const { data: ls } = await supabase
        .from("lessons")
        .select("id, lesson_date, duration, amount_due, paid_amount, payment_status")
        .eq("pupil_id", id)
        .neq("status", "cancelled")
        .is("deleted_at", null)
        .in("payment_status", ["unpaid", "partial"])
        .order("lesson_date", { ascending: true });
      setUnpaidLessons((ls ?? []) as unknown as UnpaidLesson[]);

      const { data: h } = await supabase
        .from("lesson_history")
        .select("id, lesson_cost, amount_paid, payment_method, created_at, lesson_date, notes")
        .eq("pupil_id", id)
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(20);
      setHistory(
        ((h ?? []) as {
          id: string;
          lesson_cost: number | null;
          amount_paid: number | null;
          payment_method: string | null;
          created_at: string | null;
          lesson_date: string | null;
          notes: string | null;
        }[]).map((r) => ({
          id: r.id,
          amount: Number(r.amount_paid ?? r.lesson_cost ?? 0),
          method: r.payment_method,
          created_at: r.created_at,
          lesson_date: r.lesson_date,
          notes: r.notes,
        })),
      );
    },
    [],
  );

  // Hydrate pricing fields whenever the selected pupil row changes.
  useEffect(() => {
    if (!pupil) return;
    const t = (pupil.pricing_type ?? "standard") as PricingType;
    setPricingType(PRICING_OPTIONS.some((o) => o.key === t) ? t : "standard");
    setHoursTotal(pupil.block_hours_total != null ? String(pupil.block_hours_total) : "");
    setPackagePrice(pupil.prepaid_amount_paid != null ? String(pupil.prepaid_amount_paid) : "");
    setNiTotal(pupil.ni_amount_total != null ? String(pupil.ni_amount_total) : "");
    setNiRef(pupil.ni_reference ?? "");
    setNiPayer(pupil.ni_payer === "pupil" ? "pupil" : "national_intensives");
    setOneOffAmount("");
    setOneOffReason("");
    setOneOffMethod("cash");
  }, [pupil]);

  useEffect(() => {
    if (!open || !pupilId) return;
    void loadPupilData(pupilId);
  }, [open, pupilId, loadPupilData]);

  const refreshPupil = useCallback(async () => {
    if (!pupilId) return;
    const { data } = await supabase
      .from("pupils")
      .select(
        "id, name, phone, email, pricing_type, prepaid_hours, block_hours_total, prepaid_amount_paid, ni_amount_total, ni_amount_paid, ni_payer, ni_reference, account_balance",
      )
      .eq("id", pupilId)
      .maybeSingle();
    if (data) {
      const row = data as unknown as PupilRow;
      setPupils((prev) => prev.map((p) => (p.id === row.id ? row : p)));
    }
    await loadPupilData(pupilId);
  }, [pupilId, loadPupilData]);

  // ---- edit / delete a recorded payment ----------------------------------
  const openEditPayment = useCallback(
    (row: { id: string; amount: number; method: string | null; lesson_date?: string | null; created_at?: string | null; notes?: string | null }) => {
      setDeletePayment(null);
      setEditPayment({
        historyId: row.id,
        amount: String(row.amount),
        method: (row.method as PayMethod) ?? "cash",
        date: (row.lesson_date ?? row.created_at ?? new Date().toISOString()).slice(0, 10),
        notes: row.notes ?? "",
      });
    },
    [],
  );

  const saveEditPayment = useCallback(async () => {
    if (!editPayment) return;
    const newAmount = Number(editPayment.amount) || 0;
    if (newAmount <= 0) {
      toast.error("Enter an amount first");
      return;
    }
    setSavingEdit(true);
    try {
      const { error } = await supabase
        .from("lesson_history")
        .update({
          amount_paid: newAmount,
          payment_method: editPayment.method,
          lesson_date: editPayment.date,
          notes: editPayment.notes.trim() || null,
        })
        .eq("id", editPayment.historyId);
      if (error) throw error;
      if (pupilId) {
        setBalance(await getPupilBalance(pupilId));
        await loadPupilData(pupilId);
      }
      setPaymentSuccess((prev) =>
        prev && prev.historyId === editPayment.historyId
          ? { ...prev, amount: newAmount, method: editPayment.method }
          : prev,
      );
      toast.success("Payment updated");
      setEditPayment(null);
      if (typeof window !== "undefined") window.dispatchEvent(new Event("dsm-payment-recorded"));
    } catch (e) {
      console.error("[UnifiedPaymentSheet] saveEditPayment", e);
      toast.error("Couldn't update payment");
    } finally {
      setSavingEdit(false);
    }
  }, [editPayment, pupilId, loadPupilData]);

  const confirmDeletePayment = useCallback(async () => {
    if (!deletePayment) return;
    setSavingEdit(true);
    try {
      const { error } = await supabase
        .from("lesson_history")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", deletePayment.historyId);
      if (error) throw error;
      if (pupilId) await getPupilBalance(pupilId);
      toast.success("Payment removed");
      if (typeof window !== "undefined") window.dispatchEvent(new Event("dsm-payment-recorded"));
      setDeletePayment(null);
      setPaymentSuccess(null);
      onSaved?.();
      handleClose();
    } catch (e) {
      console.error("[UnifiedPaymentSheet] confirmDeletePayment", e);
      toast.error("Couldn't remove payment");
    } finally {
      setSavingEdit(false);
    }
  }, [deletePayment, pupilId, onSaved, handleClose]);

  // ---- filtered pupil list ----------------------------------------------
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return pupils;
    return pupils.filter((p) => (p.name ?? "").toLowerCase().includes(q));
  }, [pupils, query]);

  // ---- method availability ----------------------------------------------
  const accepted = instructor?.accepted_payment_methods ?? null;
  const methodAllowed = (m: PayMethod) => {
    if (m === "klarna") return !!instructor?.klarna_enabled;
    if (m === "clearpay") return !!instructor?.clearpay_enabled;
    if (!accepted || accepted.length === 0) return true;

    // Normalise: lowercase and strip spaces/special chars for comparison
    const normalised = accepted.map((a: string) =>
      a.toLowerCase().replace(/[^a-z]/g, "")
    );
    const key = m.toLowerCase().replace(/[^a-z]/g, "");

    // Map method keys to possible normalised values
    const aliases: Record<string, string[]> = {
      cash: ["cash"],
      banktransfer: ["banktransfer", "banktransferbacs", "bacs"],
      qr: ["qr", "qrcode", "card"],
      link: ["link", "paylink", "paymentlink"],
    };

    const keyNorm = key.replace(/_/g, "");
    return (aliases[keyNorm] ?? [keyNorm]).some((a) => normalised.includes(a));
  };
  const methodList: { key: PayMethod; Icon: typeof Banknote }[] = (
    [
      { key: "cash" as const, Icon: Banknote },
      { key: "bank_transfer" as const, Icon: Landmark },
      { key: "qr" as const, Icon: QrCode },
      { key: "link" as const, Icon: Link2 },
      { key: "klarna" as const, Icon: CreditCard },
      { key: "clearpay" as const, Icon: CreditCard },
    ] as { key: PayMethod; Icon: typeof Banknote }[]
  ).filter((m) => methodAllowed(m.key));

  const isRemote = method === "qr" || method === "link";

  // ---- QR / pay link -----------------------------------------------------
  const createRyftPayment = useCallback(
    async (kind: "qr" | "link"): Promise<{ url: string; paymentId: string | null } | null> => {
      if (amountNum <= 0) {
        toast.error("Enter an amount first");
        return null;
      }
      setGenerating(true);
      try {
        const amountPence = Math.round(amountNum * 100);
        const { data, error } = await supabase.functions.invoke("create-ryft-payment", {
          body: {
            amount: amountPence,
            payment_type: kind,
            instructor_id: instructorId,
            pupil_id: pupilId ?? undefined,
            pupil_name: pupil?.name ?? undefined,
            description: note.trim() || "Payment",
          },
        });
        if (error) throw error;
        const clientSecret =
          (data as { clientSecret?: string; client_secret?: string })?.clientSecret ??
          (data as { client_secret?: string })?.client_secret ??
          null;
        const pid =
          (data as { paymentId?: string; id?: string })?.paymentId ??
          (data as { id?: string })?.id ??
          null;
        if (!clientSecret) throw new Error("No client secret returned");
        const url = `https://drivingschoolmanager.co.uk/pay?cs=${clientSecret}&amount=${amountPence}&desc=${encodeURIComponent(
          note.trim() || "Payment",
        )}`;
        return { url, paymentId: pid };
      } catch (e) {
        console.error("[UnifiedPaymentSheet] createRyftPayment", e);
        toast.error("Couldn't generate payment");
        return null;
      } finally {
        setGenerating(false);
      }
    },
    [amountNum, instructorId, pupilId, pupil, note],
  );

  const generateQr = async () => {
    const res = await createRyftPayment("qr");
    if (!res) return;
    setQrUrl(res.url);
    setQrPaymentId(res.paymentId);
    setQrFullscreen(true);
    toast.success("QR code ready");
  };

  const generateLink = async () => {
    const res = await createRyftPayment("link");
    if (!res) return;
    setPayUrl(res.url);
    setQrPaymentId(res.paymentId);
    toast.success("Payment link ready");
  };

  // ---- payment write -----------------------------------------------------
  // All pupil payment writes go through recordPayment() in @/lib/payments —
  // this component never touches lesson_history / lessons / account_balance
  // for a pupil payment itself.
  const handleRecordPayment = useCallback(
    async (overrideMethod?: PayMethod) => {
      const m = overrideMethod ?? method;
      if (!m || amountNum <= 0) return;
      if (!customMode && !pupilId) return;
      setSaving(true);
      try {
        const methodStr = toDbMethod(m);
        const nowIso = new Date(`${paymentDate}T12:00:00`).toISOString();
        let historyId = "";

        if (customMode || !pupilId) {
          // No pupil linked — payments.ts owns the standalone audit write.
          const res = await recordStandalonePayment({
            amount: amountNum,
            method: methodStr,
            notes: note.trim() || null,
            paymentDate,
            createdAt: nowIso,
          });
          historyId = res.historyId;
        } else {
          await recordPayment({
            pupilId,
            amount: amountNum,
            method: methodStr,
            notes: note.trim() || null,
            currentAccountBalance: Number(pupil?.account_balance ?? 0),
            createdAt: nowIso,
          });

          // NI tracking lives on the pupil row, not the payment ledger.
          const type = (pupil?.pricing_type ?? "standard") as PricingType;
          if (
            type === "national_intensives" &&
            (pupil?.ni_payer ?? "national_intensives") === "national_intensives"
          ) {
            await supabase
              .from("pupils")
              .update({
                ni_amount_paid: Number(pupil?.ni_amount_paid ?? 0) + amountNum,
                ni_payment_date: paymentDate,
              })
              .eq("id", pupilId);
          }

          // Pick up the audit row recordPayment just wrote so the success
          // panel's edit/delete actions have something to target.
          const { data: latest } = await supabase
            .from("lesson_history")
            .select("id")
            .eq("pupil_id", pupilId)
            .is("deleted_at", null)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();
          historyId = (latest as { id: string } | null)?.id ?? "";

        }

        toast.success(customMode ? "Custom payment recorded" : "Payment recorded");
        if (typeof window !== "undefined") {
          window.dispatchEvent(new Event("dsm-payment-recorded"));
        }
        setPaymentSuccess({
          historyId,
          amount: amountNum,
          method: methodStr,
          pupilName: pupil?.name ?? "Custom",
        });
        // Ready for the next payment — keep the pupil selected.
        setAmount("");
        setMethod("cash");
        setNote("");
        setPaymentDate(todayIso());
        setQrUrl(null);
        setPayUrl(null);
        setQrPaymentId(null);
        onSaved?.();
      } catch (e) {
        console.error("[UnifiedPaymentSheet] handleRecordPayment", e);
        toast.error("Couldn't record payment");
      } finally {
        if (pupilId) {
          try {
            await refreshPupil();
            setBalance(await getPupilBalance(pupilId));
          } catch (refreshErr) {
            console.error("[UnifiedPaymentSheet] refresh after handleRecordPayment", refreshErr);
          }
        }
        setSaving(false);
      }
    },
    [
      method,
      amountNum,
      paymentDate,
      instructorId,
      pupilId,
      customMode,
      note,
      pupil,
      refreshPupil,
      onSaved,
    ],
  );


  // ---- QR polling --------------------------------------------------------
  useEffect(() => {
    if (!qrPaymentId) return;
    const t = setInterval(async () => {
      try {
        const { data } = await supabase.functions.invoke("get-ryft-payment-status", {
          body: { paymentId: qrPaymentId },
        });
        const status = (data as { status?: string })?.status;
        if (status === "succeeded" || status === "completed" || status === "paid") {
          clearInterval(t);
          setQrPaymentId(null);
          await handleRecordPayment(method === "link" ? "link" : "qr");
          handleClose();
        }
      } catch (e) {
        console.warn("[UnifiedPaymentSheet] qr poll", e);
      }
    }, 5000);
    return () => clearInterval(t);
  }, [qrPaymentId, method, handleRecordPayment, handleClose]);

  // ---- pay link delivery -------------------------------------------------
  const copyLink = async () => {
    if (!payUrl) return;
    try {
      await navigator.clipboard.writeText(payUrl);
      toast.success("Link copied");
    } catch {
      toast.error("Copy failed");
    }
  };

  const firstName = (pupil?.name ?? "").split(" ")[0] ?? "";

  const sendSms = () => {
    if (!payUrl || !pupil?.phone) {
      toast.error("No phone number on file");
      return;
    }
    window.open(
      "sms:" +
        pupil.phone +
        "?body=" +
        encodeURIComponent(
          `Hi ${firstName}, here is your payment link for your driving lessons: ${payUrl}`,
        ),
    );
  };

  const sendEmail = async () => {
    if (!payUrl || !pupil?.email) {
      toast.error("No email address on file");
      return;
    }
    try {
      const { error } = await supabase.functions.invoke("send-payment-email", {
        body: {
          pupil_email: pupil.email,
          pupil_name: pupil.name,
          instructor_name: instructor?.name ?? "your instructor",
          amount: amountNum,
          paymentUrl: payUrl,
        },
      });
      if (error) throw error;
      toast.success("Email sent");
    } catch {
      const body = `Hi ${firstName}, here is your payment link for your driving lessons: ${payUrl}`;
      window.open(
        "mailto:" +
          pupil.email +
          "?subject=" +
          encodeURIComponent(`Payment request from ${instructor?.name ?? "your instructor"}`) +
          "&body=" +
          encodeURIComponent(body),
      );
    }
  };

  // ---- refunds -----------------------------------------------------------
  const confirmRefund = async () => {
    if (!refundRow || !pupilId || refundProcessing) return;
    const amt = Math.round(refundAmountNum * 100) / 100;
    if (!(amt > 0)) {
      toast.error("Enter a refund amount greater than £0");
      return;
    }
    if (amt > refundRow.amount) {
      toast.error(`Refund can't exceed the original payment (${money(refundRow.amount)})`);
      return;
    }
    if (amt > maxRefundableAmount) {
      toast.error(`Refund amount exceeds available paid/credit balance (${money(maxRefundableAmount)})`);
      return;
    }
    const isPartial = amt < refundRow.amount;
    setRefundProcessing(true);
    try {
      await recordRefund({
        pupilId,
        amount: amt,
        method: toDbMethod(refundRow.method ?? "refund"),
        notes: isPartial
          ? `Partial refund of ${money(amt)} (from ${money(refundRow.amount)} payment)`
          : `Refund of ${money(amt)}`,
        currentAccountBalance: Number(pupil?.account_balance ?? 0),
      });

      toast.success(
        isPartial
          ? `Partial refund of ${money(amt)} recorded`
          : `Refund of ${money(amt)} recorded`,
      );
      setRefundRow(null);
      setRefundAmount("");
      setRefundConfirmOpen(false);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("dsm-payment-recorded"));
      }
      onSaved?.();
    } catch (e) {
      console.error("[UnifiedPaymentSheet] confirmRefund", e);
      toast.error(`Couldn't record ${money(amt)} refund`);

    } finally {
      setRefundProcessing(false);
      if (pupilId) {
        try {
          await refreshPupil();
          setBalance(await getPupilBalance(pupilId));
        } catch (refreshErr) {
          console.error("[UnifiedPaymentSheet] refresh after confirmRefund", refreshErr);
        }
      }
    }
  };


  // ---- pricing tab -------------------------------------------------------
  const selectPricingType = async (t: PricingType) => {
    setPricingType(t);
    if (!pupilId) return;
    const { error } = await supabase.from("pupils").update({ pricing_type: t }).eq("id", pupilId);
    if (error) {
      toast.error("Couldn't save pricing type");
      return;
    }
    await refreshPupil();
    // No onSaved here — just update silently
  };

  const savePricing = async () => {
    if (!pupilId) return;
    setSavingPricing(true);
    try {
      let patch: Record<string, unknown> = {};
      if (pricingType === "block") {
        patch = {
          block_hours_total: hoursTotal === "" ? null : Number(hoursTotal),
          prepaid_amount_paid: packagePrice === "" ? null : Number(packagePrice),
        };
      } else if (pricingType === "national_intensives") {
        patch = {
          block_hours_total: hoursTotal === "" ? null : Number(hoursTotal),
          ni_amount_total: niTotal === "" ? null : Number(niTotal),
          ni_reference: niRef.trim() || null,
          ni_payer: niPayer,
        };
      } else if (pricingType === "custom") {
        // One-off pricing has no stored fields; payments are recorded via lesson_history.
        patch = {};
      }
      const { error } = await supabase.from("pupils").update(patch).eq("id", pupilId);
      if (error) throw error;

      let isNewPackage = false;
      let newPrice = 0;
      if (pricingType === "block") {
        const prevPrice = Number(pupil?.prepaid_amount_paid ?? 0);
        newPrice = packagePrice === "" ? 0 : Number(packagePrice);
        isNewPackage = newPrice > 0 && newPrice !== prevPrice;
        if (isNewPackage) {
          await recordPayment({
            pupilId,
            amount: newPrice,
            method: toDbMethod(packageMethod),
            notes: `Block package: ${hoursTotal} hrs at £${newPrice}`,
            currentAccountBalance: Number(pupil?.account_balance ?? 0),
          });
          // Package hours live on the pupil row.
          await supabase
            .from("pupils")
            .update({
              prepaid_hours: hoursTotal === "" ? 0 : Number(hoursTotal),
              block_hours_total: hoursTotal === "" ? null : Number(hoursTotal),
              prepaid_amount_paid: newPrice,
            })
            .eq("id", pupilId);
          const { data: latest } = await supabase
            .from("lesson_history")
            .select("id")
            .eq("pupil_id", pupilId)
            .is("deleted_at", null)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();
          setPaymentSuccess({
            historyId: (latest as { id: string } | null)?.id ?? "",
            amount: newPrice,
            method: packageMethod,
            pupilName: pupil?.name ?? "",
          });
        }
      }

      toast.success(
        isNewPackage
          ? `Block package recorded — ${hoursTotal} hrs · ${money(newPrice)}`
          : "Pricing updated",
      );
      onSaved?.();
    } catch (e) {
      console.error("[UnifiedPaymentSheet] savePricing", e);
      toast.error("Couldn't save pricing");
    } finally {
      if (pupilId) {
        try {
          await refreshPupil();
          setBalance(await getPupilBalance(pupilId));
        } catch (refreshErr) {
          console.error("[UnifiedPaymentSheet] refresh after savePricing", refreshErr);
        }
      }
      setSavingPricing(false);
    }
  };

  const recordOneOffPayment = async () => {
    if (!pupilId || !instructorId) return;
    const amount = Number(oneOffAmount) || 0;
    if (amount <= 0) {
      toast.error("Enter an amount first");
      return;
    }
    const { data: hRow, error } = await supabase
      .from("lesson_history")
      .insert({
        instructor_id: instructorId,
        pupil_id: pupilId,
        amount_paid: amount,
        payment_method: toDbMethod(oneOffMethod),
        lesson_date: todayIso(),
        payment_status: "paid",
        notes: oneOffReason.trim() || "One-off payment",
        created_at: new Date().toISOString(),
      })
      .select("id")
      .single();
    if (error) {
      console.error("[UnifiedPaymentSheet] recordOneOffPayment", error);
      toast.error("Couldn't record one-off payment");
      return;
    }
    toast.success("One-off payment recorded");
    setBalance(await getPupilBalance(pupilId));
    await loadPupilData(pupilId);
    setPaymentSuccess({
      historyId: (hRow as { id: string } | null)?.id ?? "",
      amount,
      method: oneOffMethod,
      pupilName: pupil?.name ?? "",
    });
    setOneOffAmount("");
    setOneOffReason("");
    setOneOffMethod("cash");
  };

  // Block cancellation calculator
  const unusedHrs = Number(pupil?.prepaid_hours ?? 0);
  const blockTotalHrs = Number(pupil?.block_hours_total ?? 0);
  const blockPrice = Number(pupil?.prepaid_amount_paid ?? 0);
  const refundDue = blockTotalHrs > 0 ? (unusedHrs / blockTotalHrs) * blockPrice : 0;

  const processCancellation = async () => {
    if (!pupilId) return;
    if (refundDue > maxRefundableAmount) {
      toast.error(`Cancellation refund exceeds available paid/credit balance (${money(maxRefundableAmount)})`);
      return;
    }
    try {
      await supabase.from("pupils").update({ prepaid_hours: 0 }).eq("id", pupilId);
      if (refundDue > 0) {
        await recordRefund({
          pupilId,
          amount: refundDue,
          method: "refund",
          notes: `Package cancellation — ${unusedHrs}h of ${blockTotalHrs}h unused`,
          currentAccountBalance: Number(pupil?.account_balance ?? 0),
        });
        toast.success(`Refund of ${money(refundDue)} recorded`);
      }
      toast.success("Cancellation processed");
      onSaved?.();
    } catch (e) {
      console.error("[UnifiedPaymentSheet] processCancellation", e);
      toast.error("Couldn't process cancellation");
    } finally {
      if (pupilId) {
        try {
          await refreshPupil();
          setBalance(await getPupilBalance(pupilId));
        } catch (refreshErr) {
          console.error("[UnifiedPaymentSheet] refresh after processCancellation", refreshErr);
        }
      }
    }
  };

  if (!open) return null;

  // -------------------------------------------------------------------------
  // Derived display
  // -------------------------------------------------------------------------
  const type = (pupil?.pricing_type ?? "standard") as PricingType;
  const isPackage = type === "block" || type === "national_intensives";

  const pupilContext = (() => {
    if (!pupil) return "";
    if (type === "block") return `Block · ${Number(pupil.prepaid_hours ?? 0)} hrs remaining`;
    if (type === "national_intensives")
      return `National Intensives · ${Number(pupil.prepaid_hours ?? 0)} hrs remaining`;
    if (type === "custom") return `One-off payment pupil · ${unpaidLessons.length} unpaid`;
    return `Standard rate · ${unpaidLessons.length} unpaid`;
  })();

  const feeApplies = method === "qr" || method === "link";
  const netAfterFee = amountNum * 0.99;

  const primaryLabel = customMode
    ? "Record custom payment"
    : method === "qr"
      ? qrUrl
        ? "Regenerate QR"
        : "Generate QR"
      : method === "link"
        ? payUrl
          ? "Generate new link"
          : "Generate link"
        : `Record ${money(amountNum)} ${method ? METHOD_LABEL[method].toLowerCase() : ""} payment`;

  const primaryDisabled =
    saving ||
    generating ||
    amountNum <= 0 ||
    !method ||
    (!customMode && !pupilId);

  const onPrimary = () => {
    if (method === "qr") return void generateQr();
    if (method === "link") return void generateLink();
    return void handleRecordPayment();
  };

  const isNewBlockPackage =
    pricingType === "block" &&
    packagePrice !== "" &&
    Number(packagePrice) > 0 &&
    Number(packagePrice) !== Number(pupil?.prepaid_amount_paid ?? 0);
  const footerLabel = isNewBlockPackage
    ? `Save & record ${money(Number(packagePrice))} package payment`
    : "Save pricing";

  const footer =
    tab === "pricing" && !customMode && pricingType !== "custom" ? (
      <button
        type="button"
        onClick={() => void savePricing()}
        disabled={savingPricing}
        style={{
          width: "100%",
          height: 44,
          borderRadius: 8,
          border: "none",
          background: BLUE,
          color: WHITE,
          fontSize: 13,
          fontWeight: 600,
          fontFamily: FONT,
          cursor: "pointer",
          opacity: savingPricing ? 0.5 : 1,
        }}
      >
        {savingPricing ? "Saving…" : footerLabel}
      </button>
    ) : (
      <button
        type="button"
        onClick={onPrimary}
        disabled={primaryDisabled}
        style={{
          width: "100%",
          height: 44,
          borderRadius: 8,
          border: "none",
          background: BLUE,
          color: WHITE,
          fontSize: 13,
          fontWeight: 600,
          fontFamily: FONT,
          cursor: "pointer",
          opacity: primaryDisabled ? 0.45 : 1,
        }}
      >
        {saving || generating ? "Working…" : primaryLabel}
      </button>
    );

  // -------------------------------------------------------------------------
  return (
    <BottomSheet
      title={customMode ? "Custom payment" : "Payments"}
      subtitle={pupil?.name ?? undefined}
      onClose={handleClose}
      footer={paymentSuccess || editPayment || deletePayment ? null : footer}
    >
      <style>{`@keyframes ups-pulse{0%,100%{opacity:1}50%{opacity:.4}}`}</style>

      <div style={{ fontFamily: FONT, background: WHITE, paddingBottom: 4, position: "relative" }}>
        {paymentSuccess && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              zIndex: 10,
              background: WHITE,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              padding: 24,
            }}
          >
            <IconCircleCheck size={48} color={GREEN} />
            <div style={{ fontSize: 16, fontWeight: 600, color: NAVY, marginTop: 16 }}>Payment recorded</div>
            <div style={{ fontSize: 13, color: MUTED, marginTop: 4 }}>
              £{paymentSuccess.amount.toFixed(2)} {METHOD_LABEL[paymentSuccess.method as PayMethod] || paymentSuccess.method}
            </div>
            <div style={{ fontSize: 13, color: MUTED }}>for {paymentSuccess.pupilName}</div>
            {balance && (
              <div style={{ width: "100%", marginTop: 16 }}>
                <SummaryBar
                  cells={
                    isPackage
                      ? [
                          { label: "Package", value: money(balance.packageTotal) },
                          { label: "Paid", value: money(balance.packagePaid), color: GREEN },
                          {
                            label: "Outstanding",
                            value: money(balance.packageOutstanding),
                            color: balance.packageOutstanding > 0 ? RED : GREEN,
                          },
                        ]
                      : [
                          { label: "Total owed", value: money(balance.lessonsOwed) },
                          { label: "Paid", value: money(balance.lessonsPaid), color: GREEN },
                          {
                            label: "Outstanding",
                            value: money(balance.outstanding),
                            color: balance.outstanding > 0 ? RED : GREEN,
                          },
                        ]
                  }
                />
              </div>
            )}
            <div style={{ display: "flex", gap: 8, marginTop: 16, width: "100%" }}>
              <button
                type="button"
                disabled={!paymentSuccess.historyId}
                onClick={() =>
                  openEditPayment({
                    id: paymentSuccess.historyId,
                    amount: paymentSuccess.amount,
                    method: paymentSuccess.method,
                    notes: "",
                  })
                }
                style={{
                  flex: 1,
                  height: 38,
                  borderRadius: 8,
                  border: `1px solid ${BORDER}`,
                  background: WHITE,
                  color: NAVY,
                  fontSize: 12,
                  fontWeight: 600,
                  fontFamily: FONT,
                  cursor: "pointer",
                  opacity: paymentSuccess.historyId ? 1 : 0.45,
                }}
              >
                Edit payment
              </button>
              <button
                type="button"
                disabled={!paymentSuccess.historyId}
                onClick={() =>
                  setDeletePayment({
                    historyId: paymentSuccess.historyId,
                    amount: paymentSuccess.amount,
                    method: paymentSuccess.method,
                    date: new Date().toISOString(),
                  })
                }
                style={{
                  flex: 1,
                  height: 38,
                  borderRadius: 8,
                  border: `1px solid ${RED}`,
                  background: WHITE,
                  color: RED,
                  fontSize: 12,
                  fontWeight: 600,
                  fontFamily: FONT,
                  cursor: "pointer",
                  opacity: paymentSuccess.historyId ? 1 : 0.45,
                }}
              >
                Delete payment
              </button>
            </div>
            <div style={{ display: "flex", gap: 12, marginTop: 12, width: "100%" }}>
              <button
                type="button"
                onClick={handleRecordAnother}
                style={{
                  flex: 1,
                  height: 44,
                  borderRadius: 8,
                  border: `1px solid ${BORDER}`,
                  background: WHITE,
                  color: NAVY,
                  fontSize: 13,
                  fontWeight: 600,
                  fontFamily: FONT,
                  cursor: "pointer",
                }}
              >
                Record another
              </button>
              <button
                type="button"
                onClick={handlePaymentDone}
                style={{
                  flex: 1,
                  height: 44,
                  borderRadius: 8,
                  border: "none",
                  background: BLUE,
                  color: WHITE,
                  fontSize: 13,
                  fontWeight: 600,
                  fontFamily: FONT,
                  cursor: "pointer",
                }}
              >
                Done
              </button>
            </div>
          </div>
        )}
        {editPayment && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              zIndex: 11,
              background: WHITE,
              padding: 20,
              overflowY: "auto",
            }}
          >
            <div style={{ fontSize: 16, fontWeight: 600, color: NAVY, marginBottom: 12 }}>Edit payment</div>
            <Field label="Amount (£)">
              <input
                inputMode="decimal"
                value={editPayment.amount}
                onChange={(e) => setEditPayment({ ...editPayment, amount: e.target.value })}
                style={inputStyle}
              />
            </Field>
            <Label>Method</Label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
              {(["cash", "bank_transfer", "qr", "link"] as PayMethod[]).map((m) => {
                const active = editPayment.method === m;
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setEditPayment({ ...editPayment, method: m })}
                    style={{
                      flex: "1 1 46%",
                      height: 36,
                      borderRadius: 8,
                      border: `1px solid ${active ? BLUE : BORDER}`,
                      background: active ? BLUE : WHITE,
                      color: active ? WHITE : BODY,
                      fontSize: 12,
                      fontWeight: 600,
                      fontFamily: FONT,
                      cursor: "pointer",
                    }}
                  >
                    {METHOD_LABEL[m]}
                  </button>
                );
              })}
            </div>
            <Field label="Date">
              <input
                type="date"
                value={editPayment.date}
                onChange={(e) => setEditPayment({ ...editPayment, date: e.target.value })}
                style={inputStyle}
              />
            </Field>
            <Field label="Reason / notes">
              <input
                value={editPayment.notes}
                onChange={(e) => setEditPayment({ ...editPayment, notes: e.target.value })}
                placeholder="Optional"
                style={inputStyle}
              />
            </Field>
            <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
              <button
                type="button"
                onClick={() => setEditPayment(null)}
                style={{
                  flex: 1,
                  height: 44,
                  borderRadius: 8,
                  border: `1px solid ${BORDER}`,
                  background: WHITE,
                  color: NAVY,
                  fontSize: 13,
                  fontWeight: 600,
                  fontFamily: FONT,
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={savingEdit}
                onClick={() => void saveEditPayment()}
                style={{
                  flex: 1,
                  height: 44,
                  borderRadius: 8,
                  border: "none",
                  background: BLUE,
                  color: WHITE,
                  fontSize: 13,
                  fontWeight: 600,
                  fontFamily: FONT,
                  cursor: "pointer",
                  opacity: savingEdit ? 0.5 : 1,
                }}
              >
                {savingEdit ? "Saving…" : "Save changes"}
              </button>
            </div>
          </div>
        )}

        {deletePayment && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              zIndex: 12,
              background: WHITE,
              padding: 24,
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
            }}
          >
            <div style={{ fontSize: 16, fontWeight: 600, color: RED }}>Delete this payment?</div>
            <div style={{ fontSize: 13, color: MUTED, marginTop: 6 }}>
              {money(deletePayment.amount)} ·{" "}
              {METHOD_LABEL[deletePayment.method as PayMethod] || deletePayment.method || "payment"} ·{" "}
              {fmtDate(deletePayment.date)}
            </div>
            <div style={{ fontSize: 12, color: AMBER, marginTop: 10 }}>This cannot be undone</div>
            <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
              <button
                type="button"
                onClick={() => setDeletePayment(null)}
                style={{
                  flex: 1,
                  height: 44,
                  borderRadius: 8,
                  border: `1px solid ${BORDER}`,
                  background: WHITE,
                  color: NAVY,
                  fontSize: 13,
                  fontWeight: 600,
                  fontFamily: FONT,
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={savingEdit}
                onClick={() => void confirmDeletePayment()}
                style={{
                  flex: 1,
                  height: 44,
                  borderRadius: 8,
                  border: "none",
                  background: RED,
                  color: WHITE,
                  fontSize: 13,
                  fontWeight: 600,
                  fontFamily: FONT,
                  cursor: "pointer",
                  opacity: savingEdit ? 0.5 : 1,
                }}
              >
                {savingEdit ? "Removing…" : "Confirm delete"}
              </button>
            </div>
          </div>
        )}

        {/* ---------------- PUPIL SELECTOR ---------------- */}
        {pickerOpen && (
          <div style={{ marginBottom: 12 }}>
            <Label>Who is paying?</Label>
            <div style={{ position: "relative", marginBottom: 8 }}>
              <Search size={14} style={{ position: "absolute", left: 10, top: 13, color: MUTED }} />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search pupils"
                style={{ ...inputStyle, paddingLeft: 30 }}
              />
            </div>
            <div
              style={{
                border: `1px solid ${BORDER}`,
                borderRadius: 10,
                maxHeight: 230,
                overflowY: "auto",
              }}
            >
              {filtered.length === 0 && (
                <div style={{ padding: 12, fontSize: 12, color: MUTED }}>No pupils found</div>
              )}
              {filtered.map((p, i) => {
                const owed = outstandingMap[p.id] ?? 0;
                const t = (p.pricing_type ?? "standard") as PricingType;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      setCustomMode(false);
                      setPupilId(p.id);
                      setPickerOpen(false);
                      setQuery("");
                      setTab("payment");
                    }}
                    style={{
                      display: "flex",
                      width: "100%",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 8,
                      padding: "10px 12px",
                      background: WHITE,
                      border: "none",
                      borderTop: i === 0 ? "none" : `1px solid ${DIVIDER}`,
                      cursor: "pointer",
                      textAlign: "left",
                      fontFamily: FONT,
                    }}
                  >
                    <span style={{ minWidth: 0 }}>
                      <span
                        style={{
                          display: "block",
                          fontSize: 13,
                          fontWeight: 600,
                          color: NAVY,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {p.name ?? "Unnamed"}
                      </span>
                      <span style={{ fontSize: 11, color: MUTED }}>
                        {t === "national_intensives"
                          ? "National Intensives"
                          : t.charAt(0).toUpperCase() + t.slice(1)}
                      </span>
                    </span>
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: owed > 0 ? RED : GREEN,
                        flexShrink: 0,
                      }}
                    >
                      {owed > 0 ? money(owed) : "Paid"}
                    </span>
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() => {
                  setCustomMode(true);
                  setPupilId(null);
                  setBalance(null);
                  setUnpaidLessons([]);
                  setHistory([]);
                  setAmount("");
                  setPickerOpen(false);
                }}
                style={{
                  display: "flex",
                  width: "100%",
                  alignItems: "center",
                  gap: 8,
                  padding: "11px 12px",
                  background: WHITE,
                  border: "none",
                  borderTop: `1px solid ${DIVIDER}`,
                  cursor: "pointer",
                  textAlign: "left",
                  fontFamily: FONT,
                }}
              >
                <Sparkles size={14} color={PURPLE} />
                <span style={{ fontSize: 13, fontWeight: 600, color: PURPLE }}>
                  Custom payment
                </span>
              </button>
            </div>
          </div>
        )}

        {/* ---------------- PUPIL HEADER ---------------- */}
        {!pickerOpen && (pupil || customMode) && (
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              gap: 8,
              padding: "10px 12px",
              border: `1px solid ${BORDER}`,
              borderRadius: 10,
              marginBottom: 12,
              background: WHITE,
            }}
          >
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: NAVY }}>
                {customMode ? "Custom payment" : (pupil?.name ?? "")}
              </div>
              <div style={{ fontSize: 11, color: MUTED, marginTop: 2 }}>
                {customMode ? "No pupil linked" : pupilContext}
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
              {!customMode && balance && (
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    padding: "3px 8px",
                    borderRadius: 999,
                    color: outstanding > 0 ? RED : GREEN,
                    background: outstanding > 0 ? "#FEF2F2" : GREEN_BG,
                  }}
                >
                  {outstanding > 0 ? `${money(outstanding)} due` : "Fully paid"}
                </span>
              )}
              <button
                type="button"
                onClick={() => setPickerOpen(true)}
                style={{
                  background: "none",
                  border: "none",
                  padding: 0,
                  fontSize: 11,
                  fontWeight: 600,
                  color: BLUE,
                  cursor: "pointer",
                  fontFamily: FONT,
                }}
              >
                Change
              </button>
            </div>
          </div>
        )}

        {/* ---------------- TABS ---------------- */}
        {!customMode && pupil && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              border: `1px solid ${BORDER}`,
              borderRadius: 8,
              overflow: "hidden",
              marginBottom: 14,
            }}
          >
            {([
              { k: "payment" as const, label: "Take payment" },
              { k: "pricing" as const, label: "Pricing & hours" },
            ]).map((t, i) => {
              const active = tab === t.k;
              return (
                <button
                  key={t.k}
                  type="button"
                  onClick={() => setTab(t.k)}
                  style={{
                    height: 36,
                    border: "none",
                    borderLeft: i === 0 ? "none" : `1px solid ${BORDER}`,
                    background: active ? BLUE_BG : WHITE,
                    color: active ? BLUE : BODY,
                    fontSize: 12,
                    fontWeight: 600,
                    fontFamily: FONT,
                    cursor: "pointer",
                  }}
                >
                  {t.label}
                </button>
              );
            })}
          </div>
        )}

        {/* ================= TAB 1 — TAKE PAYMENT ================= */}
        {(tab === "payment" || customMode) && (pupil || customMode) && (
          <>
            {/* Summary bar */}
            {!customMode && balance && (
              <SummaryBar
                cells={
                  isPackage
                    ? [
                        { label: "Package", value: money(balance.packageTotal) },
                        { label: "Paid", value: money(balance.packagePaid), color: GREEN },
                        {
                          label: "Outstanding",
                          value: money(balance.packageOutstanding),
                          color: balance.packageOutstanding > 0 ? RED : GREEN,
                        },
                      ]
                    : [
                        { label: "Total owed", value: money(balance.lessonsOwed) },
                        { label: "Paid", value: money(balance.lessonsPaid), color: GREEN },
                        {
                          label: "Outstanding",
                          value: money(balance.outstanding),
                          color: balance.outstanding > 0 ? RED : GREEN,
                        },
                      ]
                }
              />
            )}

            {/* NI context banner */}
            {!customMode && type === "national_intensives" && (
              <div
                style={{
                  border: `1px solid ${BORDER}`,
                  background: GREEN_BG,
                  borderRadius: 10,
                  padding: "9px 12px",
                  fontSize: 11,
                  color: GREEN,
                  marginBottom: 12,
                }}
              >
                {(pupil?.ni_payer ?? "national_intensives") === "national_intensives"
                  ? "NI pays by bank transfer — record payment from National Intensives"
                  : "The pupil pays directly — record payment from the pupil"}
                {pupil?.ni_reference ? ` · Ref ${pupil.ni_reference}` : ""}
              </div>
            )}

            {/* Unpaid lesson breakdown */}
            {!customMode && !isPackage && unpaidLessons.length > 0 && (
              <div style={{ marginBottom: 14 }}>
                <Label>Unpaid lessons</Label>
                <div style={{ border: `1px solid ${BORDER}`, borderRadius: 10, overflow: "hidden" }}>
                  {unpaidLessons.map((l, i) => {
                    const due = Number(l.amount_due ?? 0) - Number(l.paid_amount ?? 0);
                    return (
                      <button
                        key={l.id}
                        type="button"
                        onClick={() => setAmount(due > 0 ? due.toFixed(2) : "")}
                        style={{
                          display: "flex",
                          width: "100%",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: "9px 12px",
                          border: "none",
                          borderTop: i === 0 ? "none" : `1px solid ${DIVIDER}`,
                          background: WHITE,
                          cursor: "pointer",
                          fontFamily: FONT,
                          textAlign: "left",
                        }}
                      >
                        <span>
                          <span style={{ display: "block", fontSize: 12, color: NAVY }}>
                            {fmtDate(l.lesson_date)}
                          </span>
                          <span style={{ fontSize: 11, color: MUTED }}>
                            {l.duration ? `${l.duration} min` : "Lesson"}
                            {Number(l.paid_amount ?? 0) > 0
                              ? ` · ${money(Number(l.paid_amount))} paid`
                              : ""}
                          </span>
                        </span>
                        <span style={{ fontSize: 12, fontWeight: 600, color: RED }}>
                          {money(due)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Amount */}
            <Label>Amount</Label>
            <div style={{ position: "relative", marginBottom: 6 }}>
              <span
                style={{
                  position: "absolute",
                  left: 12,
                  top: 12,
                  fontSize: 20,
                  fontWeight: 700,
                  color: NAVY,
                }}
              >
                £
              </span>
              <input
                inputMode="decimal"
                value={amount}
                onChange={(e) => {
                  const v = e.target.value.replace(/[^0-9.]/g, "");
                  if ((v.match(/\./g) ?? []).length > 1) return;
                  const parts = v.split(".");
                  if (parts[1] && parts[1].length > 2) return;
                  setAmount(v);
                }}
                placeholder="0.00"
                style={{
                  ...inputStyle,
                  height: 52,
                  paddingLeft: 30,
                  fontSize: 22,
                  fontWeight: 700,
                }}
              />
            </div>

            {!customMode && outstanding > 0 && (
              <div style={{ fontSize: 11, color: BODY, marginBottom: 12 }}>
                {amountNum > 0 && amountNum < outstanding
                  ? `Partial: ${money(amountNum)} of ${money(outstanding)} · `
                  : `Full amount: ${money(outstanding)} · `}
                <button
                  type="button"
                  onClick={() => setAmount(outstanding.toFixed(2))}
                  style={{
                    background: "none",
                    border: "none",
                    padding: 0,
                    color: BLUE,
                    fontWeight: 600,
                    fontSize: 11,
                    cursor: "pointer",
                    fontFamily: FONT,
                  }}
                >
                  Pay in full
                </button>
              </div>
            )}

            {/* Partial toggle */}
            {!customMode && outstanding > 0 && (
              <>
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    border: `1px solid ${BORDER}`,
                    borderRadius: 8,
                    padding: "9px 12px",
                    marginBottom: 6,
                    cursor: "pointer",
                  }}
                >
                  <span style={{ fontSize: 12, color: BODY }}>Partial payment</span>
                  <input
                    type="checkbox"
                    checked={partial}
                    onChange={(e) => setPartial(e.target.checked)}
                    style={{ width: 16, height: 16, accentColor: BLUE }}
                  />
                </label>
                {partial ? (
                  <div style={{ fontSize: 11, color: BODY, marginBottom: 12 }}>
                    Remaining after this payment:{" "}
                    <strong style={{ color: RED }}>
                      {money(Math.max(0, outstanding - amountNum))}
                    </strong>
                  </div>
                ) : (
                  amountNum > 0 &&
                  Math.abs(amountNum - outstanding) > 0.005 && (
                    <div style={{ fontSize: 11, color: AMBER, marginBottom: 12 }}>
                      Amount doesn't match the full outstanding balance — turn on partial payment.
                    </div>
                  )
                )}
              </>
            )}

            {/* Custom note */}
            {customMode && (
              <div style={{ marginBottom: 12 }}>
                <Label>Note</Label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="What is this payment for?"
                  rows={3}
                  style={{ ...inputStyle, height: "auto", padding: 10, resize: "vertical" }}
                />
              </div>
            )}

            {/* Method buttons */}
            <Label>Payment method</Label>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: 6,
                marginBottom: 12,
              }}
            >
              {methodList.map(({ key, Icon }) => {
                const active = method === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => {
                      setMethod(key);
                      setQrUrl(null);
                      setPayUrl(null);
                      setQrPaymentId(null);
                    }}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 4,
                      height: 54,
                      borderRadius: 8,
                      border: `1px solid ${active ? BLUE : BORDER}`,
                      background: active ? BLUE_BG : WHITE,
                      color: active ? BLUE : BODY,
                      fontSize: 11,
                      fontWeight: active ? 600 : 500,
                      fontFamily: FONT,
                      cursor: "pointer",
                    }}
                  >
                    <Icon size={15} color={active ? BLUE : MUTED} />
                    {METHOD_LABEL[key]}
                  </button>
                );
              })}
            </div>

            {/* 1% fee note */}
            {feeApplies && amountNum > 0 && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  background: AMBER_BG,
                  border: `1px solid ${BORDER}`,
                  borderRadius: 8,
                  padding: "8px 12px",
                  marginBottom: 12,
                  fontSize: 11,
                  color: AMBER,
                }}
              >
                <span>1% platform fee</span>
                <strong>You receive {money(netAfterFee)}</strong>
              </div>
            )}

            {/* QR */}
            {method === "qr" && qrUrl && (
              <div
                style={{
                  border: `1px solid ${BORDER}`,
                  borderRadius: 10,
                  padding: 14,
                  marginBottom: 12,
                  textAlign: "center",
                }}
              >
                <QRCodeSVG value={qrUrl} size={120} />
                <div style={{ fontSize: 12, color: NAVY, fontWeight: 600, marginTop: 10 }}>
                  Scan to pay {money(amountNum)}
                </div>
                <button
                  type="button"
                  onClick={() => setQrFullscreen(true)}
                  style={{
                    marginTop: 8,
                    fontSize: 12,
                    fontWeight: 600,
                    color: BLUE,
                    background: "none",
                    border: "none",
                    padding: 0,
                    fontFamily: FONT,
                    cursor: "pointer",
                  }}
                >
                  Full screen
                </button>
              </div>
            )}

            {/* Pay link */}
            {method === "link" && payUrl && (
              <div
                style={{
                  border: `1px solid ${BORDER}`,
                  borderRadius: 10,
                  padding: 12,
                  marginBottom: 12,
                }}
              >
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
                  {[
                    { label: "Copy link", Icon: Copy, onClick: copyLink },
                    { label: "Send SMS", Icon: MessageSquare, onClick: sendSms },
                    { label: "Email", Icon: Mail, onClick: () => void sendEmail() },
                  ].map(({ label, Icon, onClick }) => (
                    <button
                      key={label}
                      type="button"
                      onClick={onClick}
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: 4,
                        height: 50,
                        justifyContent: "center",
                        borderRadius: 8,
                        border: `1px solid ${BORDER}`,
                        background: WHITE,
                        color: BODY,
                        fontSize: 11,
                        fontWeight: 500,
                        fontFamily: FONT,
                        cursor: "pointer",
                      }}
                    >
                      <Icon size={14} color={MUTED} />
                      {label}
                    </button>
                  ))}
                </div>
                <div
                  style={{
                    marginTop: 8,
                    fontSize: 10,
                    color: MUTED,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {payUrl}
                </div>
                <div style={{ marginTop: 6, fontSize: 10, color: PURPLE }}>
                  ✦ Email sent via DSM — branded
                </div>
              </div>
            )}

            {/* Payment date */}
            {!isRemote && (
              <div style={{ marginBottom: 14 }}>
                <Label>Payment date</Label>
                <input
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  style={inputStyle}
                />
              </div>
            )}

            {/* ---------------- PAYMENT HISTORY ---------------- */}
            {!customMode && pupilId && (
              <div style={{ marginTop: 4 }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: 6,
                  }}
                >
                  <Label>Payment history</Label>
                  <button
                    type="button"
                    onClick={() => {
                      handleClose();
                      navigate({ to: "/payments", search: { pupil: pupilId } as never });
                    }}
                    style={{
                      background: "none",
                      border: "none",
                      padding: 0,
                      fontSize: 11,
                      fontWeight: 600,
                      color: BLUE,
                      cursor: "pointer",
                      fontFamily: FONT,
                    }}
                  >
                    See all →
                  </button>
                </div>

                {refundRow && (
                  <div
                    style={{
                      border: `1px solid ${BORDER}`,
                      background: AMBER_BG,
                      borderRadius: 10,
                      padding: 12,
                      marginBottom: 10,
                    }}
                  >
                    <div style={{ fontSize: 12, fontWeight: 600, color: AMBER }}>
                      Issue refund — {money(refundRow.amount)} —{" "}
                      {refundRow.method ?? "payment"} — {fmtDate(refundRow.created_at)}
                    </div>

                    <div style={{ marginTop: 10 }}>
                      <div style={{ fontSize: 10, color: MUTED, marginBottom: 4 }}>
                        Refund amount (max {money(refundRowMax)})
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ fontSize: 13, color: BODY, fontWeight: 600 }}>£</span>
                        <input
                          type="number"
                          inputMode="decimal"
                          min={0}
                          step="0.01"
                          max={refundRowMax}
                          value={refundAmount}
                          onChange={(e) => setRefundAmount(e.target.value)}
                          style={{
                            flex: 1,
                            height: 34,
                            borderRadius: 8,
                            border: `1px solid ${BORDER}`,
                            background: WHITE,
                            padding: "0 10px",
                            fontSize: 13,
                            fontFamily: FONT,
                            color: NAVY,
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => setRefundAmount(String(refundRowMax))}
                          style={{
                            height: 34,
                            padding: "0 10px",
                            borderRadius: 8,
                            border: `1px solid ${BORDER}`,
                            background: WHITE,
                            color: BODY,
                            fontSize: 11,
                            fontWeight: 600,
                            fontFamily: FONT,
                            cursor: "pointer",
                          }}
                        >
                          Full
                        </button>
                      </div>
                      {refundAmountNum > 0 && refundAmountNum < refundRow.amount && (
                        <div style={{ fontSize: 10, color: MUTED, marginTop: 4 }}>
                          Partial refund — {money(refundRow.amount - refundAmountNum)} of this
                          payment stays on the ledger
                        </div>
                      )}
                      {refundAmountNum > refundRowMax && (
                        <div style={{ fontSize: 10, color: RED, marginTop: 4 }}>
                          Amount exceeds the refundable maximum
                        </div>
                      )}
                    </div>

                    <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
                      <button
                        type="button"
                        onClick={() => setRefundConfirmOpen(true)}
                        disabled={!(refundAmountNum > 0) || refundAmountNum > refundRowMax}
                        style={{
                          flex: 1,
                          height: 34,
                          borderRadius: 8,
                          border: "none",
                          background:
                            !(refundAmountNum > 0) || refundAmountNum > refundRowMax ? BORDER : RED,
                          color: WHITE,
                          fontSize: 12,
                          fontWeight: 600,
                          fontFamily: FONT,
                          cursor:
                            !(refundAmountNum > 0) || refundAmountNum > refundRowMax
                              ? "not-allowed"
                              : "pointer",
                        }}
                      >
                        {refundAmountNum > 0 && refundAmountNum < refundRow.amount
                          ? `Refund ${money(refundAmountNum)}`
                          : "Confirm refund"}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setRefundRow(null);
                          setRefundAmount("");
                        }}

                        style={{
                          flex: 1,
                          height: 34,
                          borderRadius: 8,
                          border: `1px solid ${BORDER}`,
                          background: WHITE,
                          color: BODY,
                          fontSize: 12,
                          fontWeight: 600,
                          fontFamily: FONT,
                          cursor: "pointer",
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {history.length === 0 && (
                  <div style={{ fontSize: 11, color: MUTED, padding: "6px 0" }}>
                    No payments recorded yet
                  </div>
                )}

                {(() => {
                  // Running balance: newest first, so walk forward adding back
                  // each payment to reconstruct the balance after it landed.
                  const shown = history.slice(0, 5);
                  let after = outstanding;
                  return shown.map((r, i) => {
                    const balanceAfter = after;
                    after = after + r.amount;
                    return (
                      <div
                        key={r.id}
                        style={{
                          display: "flex",
                          alignItems: "flex-start",
                          justifyContent: "space-between",
                          gap: 8,
                          padding: "9px 0",
                          borderTop: i === 0 ? "none" : `1px solid ${DIVIDER}`,
                        }}
                      >
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: 12, color: NAVY }}>
                            {(r.method ?? "payment").replace(/_/g, " ")} · {fmtDate(r.created_at)}
                          </div>
                          <div style={{ fontSize: 10, color: MUTED, marginTop: 2 }}>
                            {balanceAfter > 0
                              ? `Balance after: ${money(balanceAfter)} still owed`
                              : "Balance after: Fully paid ✓"}
                          </div>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                          <span style={{ fontSize: 12, fontWeight: 600, color: r.amount < 0 ? RED : GREEN }}>
                            {money(r.amount)}
                          </span>
                          {r.amount > 0 && (() => {
                            const rowMax = Math.min(r.amount, maxRefundableAmount);
                            const blocked = rowMax <= 0;
                            return (
                              <button
                                type="button"
                                onClick={() => {
                                  if (blocked) {
                                    toast.error(
                                      `No refundable paid/credit balance available (${money(maxRefundableAmount)})`,
                                    );
                                    return;
                                  }
                                  setRefundRow(r);
                                  setRefundAmount(String(rowMax));
                                }}
                                style={{
                                  height: 24,
                                  padding: "0 8px",
                                  borderRadius: 6,
                                  border: `1px solid ${blocked ? BORDER : RED}`,
                                  background: WHITE,
                                  color: blocked ? MUTED : RED,
                                  fontSize: 10,
                                  fontWeight: 600,
                                  fontFamily: FONT,
                                  cursor: blocked ? "not-allowed" : "pointer",
                                }}
                                disabled={blocked}
                              >
                                Refund
                              </button>
                            );
                          })()}

                          <button
                            type="button"
                            onClick={() => openEditPayment(r)}
                            style={{
                              height: 24,
                              padding: "0 8px",
                              borderRadius: 6,
                              border: `1px solid ${BORDER}`,
                              background: WHITE,
                              color: NAVY,
                              fontSize: 10,
                              fontWeight: 600,
                              fontFamily: FONT,
                              cursor: "pointer",
                            }}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setDeletePayment({
                                historyId: r.id,
                                amount: r.amount,
                                method: r.method,
                                date: r.lesson_date ?? r.created_at,
                              })
                            }
                            style={{
                              height: 24,
                              padding: "0 8px",
                              borderRadius: 6,
                              border: `1px solid ${RED}`,
                              background: WHITE,
                              color: RED,
                              fontSize: 10,
                              fontWeight: 600,
                              fontFamily: FONT,
                              cursor: "pointer",
                            }}
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    );
                  });
                })()}

                {history.length > 5 && (
                  <button
                    type="button"
                    onClick={() => {
                      handleClose();
                      navigate({ to: "/payments", search: { pupil: pupilId } as never });
                    }}
                    style={{
                      background: "none",
                      border: "none",
                      padding: "8px 0 0",
                      fontSize: 11,
                      fontWeight: 600,
                      color: BLUE,
                      cursor: "pointer",
                      fontFamily: FONT,
                    }}
                  >
                    View all {history.length} payments →
                  </button>
                )}
              </div>
            )}
          </>
        )}

        {/* ================= TAB 2 — PRICING & HOURS ================= */}
        {tab === "pricing" && !customMode && pupil && (
          <>
            <Label>Pricing type</Label>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 8,
                marginBottom: 14,
              }}
            >
              {PRICING_OPTIONS.map(({ key, label, sublabel, Icon }) => {
                const active = pricingType === key;
                const isNi = key === "national_intensives";
                const accent = isNi ? GREEN : BLUE;
                const accentBg = isNi ? GREEN_BG : BLUE_BG;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => void selectPricingType(key)}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "flex-start",
                      gap: 4,
                      padding: 12,
                      borderRadius: 10,
                      border: `1px solid ${active ? accent : BORDER}`,
                      background: active ? accentBg : WHITE,
                      cursor: "pointer",
                      textAlign: "left",
                      fontFamily: FONT,
                    }}
                  >
                    <Icon size={16} color={active ? accent : MUTED} />
                    <span style={{ fontSize: 12, fontWeight: 600, color: active ? accent : NAVY }}>
                      {label}
                    </span>
                    {sublabel && (
                      <span style={{ fontSize: 10, color: MUTED, lineHeight: 1.2 }}>
                        {sublabel}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {pricingType === "block" && (
              <>
                <Label>Block package</Label>
                <Field label="Total hours">
                  <input
                    inputMode="decimal"
                    value={hoursTotal}
                    onChange={(e) => setHoursTotal(e.target.value)}
                    placeholder="0"
                    style={inputStyle}
                  />
                </Field>
                <Field label="Package price (£)">
                  <input
                    inputMode="decimal"
                    value={packagePrice}
                    onChange={(e) => setPackagePrice(e.target.value)}
                    placeholder="0.00"
                    style={inputStyle}
                  />
                </Field>

                <div
                  style={{
                    fontSize: 10,
                    color: MUTED,
                    marginTop: 8,
                    marginBottom: 12,
                    lineHeight: 1.4,
                  }}
                >
                  Enter the total hours purchased and the full package price.
                  When saved, the hours will be credited to this pupil and the
                  payment will appear in their payment history.
                </div>

                {(() => {
                  const newPrice = packagePrice === "" ? 0 : Number(packagePrice);
                  const prevPrice = Number(pupil?.prepaid_amount_paid ?? 0);
                  if (!(newPrice > 0 && newPrice !== prevPrice)) return null;
                  return (
                    <div style={{ marginBottom: 12 }}>
                      <div
                        style={{
                          border: `1px solid ${BORDER}`,
                          background: AMBER_BG,
                          borderRadius: 10,
                          padding: 12,
                        }}
                      >
                        <div style={{ fontSize: 12, fontWeight: 700, color: AMBER }}>
                          Record package payment
                        </div>
                        <div style={{ fontSize: 11, color: AMBER, marginTop: 4 }}>
                          This will record a {money(newPrice)} package payment for{" "}
                          {hoursTotal === "" ? 0 : Number(hoursTotal)} hours
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
                        {(["cash", "bank_transfer", "qr", "link"] as PayMethod[]).map((m) => {
                          const active = packageMethod === m;
                          return (
                            <button
                              key={m}
                              type="button"
                              onClick={() => setPackageMethod(m)}
                              style={{
                                flex: "1 1 45%",
                                height: 34,
                                borderRadius: 8,
                                border: `1px solid ${active ? BLUE : BORDER}`,
                                background: active ? "#EFF6FF" : WHITE,
                                color: active ? BLUE : NAVY,
                                fontSize: 12,
                                fontWeight: 600,
                                fontFamily: FONT,
                                cursor: "pointer",
                              }}
                            >
                              {METHOD_LABEL[m]}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}

                {balance && (
                  <SummaryBar
                    cells={[
                      { label: "Hrs remaining", value: `${balance.hoursRemaining}h`, color: BLUE },
                      { label: "Paid", value: money(balance.packagePaid), color: GREEN },
                      {
                        label: "Outstanding",
                        value: money(balance.packageOutstanding),
                        color: balance.packageOutstanding > 0 ? RED : GREEN,
                      },
                    ]}
                  />
                )}

                {unusedHrs > 0 && blockTotalHrs > 0 && (
                  <div
                    style={{
                      border: `1px solid ${BORDER}`,
                      background: AMBER_BG,
                      borderRadius: 10,
                      padding: 12,
                      marginBottom: 12,
                    }}
                  >
                    <div style={{ fontSize: 12, fontWeight: 600, color: AMBER }}>
                      Cancel package — refund calculator
                    </div>
                    <div style={{ fontSize: 11, color: AMBER, marginTop: 6 }}>
                      {unusedHrs} unused hrs of {blockTotalHrs} total · {money(blockPrice)} package
                    </div>
                    <div style={{ fontSize: 11, color: AMBER, marginTop: 2 }}>
                      ({unusedHrs} ÷ {blockTotalHrs}) × {money(blockPrice)}
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: AMBER, marginTop: 6 }}>
                      Refund due: {money(refundDue)}
                    </div>
                    <button
                      type="button"
                      onClick={() => void processCancellation()}
                      style={{
                        width: "100%",
                        height: 36,
                        marginTop: 10,
                        borderRadius: 8,
                        border: `1px solid ${RED}`,
                        background: WHITE,
                        color: RED,
                        fontSize: 12,
                        fontWeight: 600,
                        fontFamily: FONT,
                        cursor: "pointer",
                      }}
                    >
                      Process cancellation
                    </button>
                  </div>
                )}
              </>
            )}

            {pricingType === "national_intensives" && (
              <>
                <Label>National Intensives</Label>
                <Field label="Total hours">
                  <input
                    inputMode="decimal"
                    value={hoursTotal}
                    onChange={(e) => setHoursTotal(e.target.value)}
                    placeholder="0"
                    style={inputStyle}
                  />
                </Field>
                <Field label="Total agreed amount (£)">
                  <input
                    inputMode="decimal"
                    value={niTotal}
                    onChange={(e) => setNiTotal(e.target.value)}
                    placeholder="0.00"
                    style={inputStyle}
                  />
                </Field>
                <Field label="NI reference">
                  <input
                    value={niRef}
                    onChange={(e) => setNiRef(e.target.value)}
                    placeholder="Reference"
                    style={inputStyle}
                  />
                </Field>
                <Field label="Who pays">
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                    {([
                      { k: "national_intensives" as const, label: "National Intensives" },
                      { k: "pupil" as const, label: "The pupil" },
                    ]).map((o) => {
                      const active = niPayer === o.k;
                      return (
                        <button
                          key={o.k}
                          type="button"
                          onClick={() => setNiPayer(o.k)}
                          style={{
                            height: 38,
                            borderRadius: 8,
                            border: `1px solid ${active ? GREEN : BORDER}`,
                            background: active ? GREEN_BG : WHITE,
                            color: active ? GREEN : BODY,
                            fontSize: 11,
                            fontWeight: 600,
                            fontFamily: FONT,
                            cursor: "pointer",
                          }}
                        >
                          {o.label}
                        </button>
                      );
                    })}
                  </div>
                </Field>
                {balance && (
                  <SummaryBar
                    cells={[
                      { label: "Hrs remaining", value: `${balance.hoursRemaining}h`, color: GREEN },
                      { label: "Received", value: money(balance.packagePaid), color: GREEN },
                      {
                        label: "Outstanding",
                        value: money(balance.packageOutstanding),
                        color: balance.packageOutstanding > 0 ? RED : GREEN,
                      },
                    ]}
                  />
                )}
              </>
            )}

            {pricingType === "standard" && (
              <div
                style={{
                  border: `1px solid ${BORDER}`,
                  borderRadius: 10,
                  padding: 12,
                  marginBottom: 12,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <span style={{ fontSize: 12, color: BODY }}>Hourly rate</span>
                  <span style={{ fontSize: 14, fontWeight: 600, color: MUTED }}>
                    {money(Number(instructor?.hourly_rate ?? 0))}
                  </span>
                </div>
                <div style={{ fontSize: 11, color: MUTED, marginTop: 6 }}>
                  Rate set in your instructor settings
                </div>
              </div>
            )}

            {pricingType === "custom" && (
              <>
                <Label>One-off payment</Label>

                <div style={{ position: "relative", marginBottom: 12 }}>
                  <span
                    style={{
                      position: "absolute",
                      left: 12,
                      top: 12,
                      fontSize: 20,
                      fontWeight: 700,
                      color: NAVY,
                    }}
                  >
                    £
                  </span>
                  <input
                    inputMode="decimal"
                    value={oneOffAmount}
                    onChange={(e) => {
                      const v = e.target.value.replace(/[^0-9.]/g, "");
                      if ((v.match(/\./g) ?? []).length > 1) return;
                      const parts = v.split(".");
                      if (parts[1] && parts[1].length > 2) return;
                      setOneOffAmount(v);
                    }}
                    placeholder="0.00"
                    style={{
                      ...inputStyle,
                      height: 52,
                      paddingLeft: 30,
                      fontSize: 22,
                      fontWeight: 700,
                    }}
                  />
                </div>

                <Field label="Reason (optional)">
                  <input
                    value={oneOffReason}
                    onChange={(e) => setOneOffReason(e.target.value)}
                    placeholder="e.g. cancellation fee, deposit, top-up..."
                    style={inputStyle}
                  />
                </Field>

                <Label>Payment method</Label>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(3, 1fr)",
                    gap: 6,
                    marginBottom: 12,
                  }}
                >
                  {[
                    { key: "cash" as const, Icon: Banknote, label: "Cash" },
                    { key: "bank_transfer" as const, Icon: Landmark, label: "Bank transfer" },
                    { key: "qr" as const, Icon: QrCode, label: "QR" },
                    { key: "link" as const, Icon: Link2, label: "Pay link" },
                  ].map(({ key, Icon, label }) => {
                    const active = oneOffMethod === key;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setOneOffMethod(key)}
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 4,
                          height: 54,
                          borderRadius: 8,
                          border: `1px solid ${active ? BLUE : BORDER}`,
                          background: active ? BLUE_BG : WHITE,
                          color: active ? BLUE : BODY,
                          fontSize: 11,
                          fontWeight: active ? 600 : 500,
                          fontFamily: FONT,
                          cursor: "pointer",
                        }}
                      >
                        <Icon size={15} color={active ? BLUE : MUTED} />
                        {label}
                      </button>
                    );
                  })}
                </div>

                <button
                  type="button"
                  onClick={() => void recordOneOffPayment()}
                  style={{
                    width: "100%",
                    height: 44,
                    borderRadius: 8,
                    border: "none",
                    background: BLUE,
                    color: WHITE,
                    fontSize: 13,
                    fontWeight: 600,
                    fontFamily: FONT,
                    cursor: "pointer",
                  }}
                >
                  Record one-off payment
                </button>
              </>
            )}
          </>
        )}
      </div>

      {/* QR full-screen overlay */}
      {qrFullscreen && qrUrl && (
        <div
          onClick={() => setQrFullscreen(false)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            backgroundColor: "rgba(0,0,0,0.95)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
            fontFamily: FONT,
          }}
        >
          <QRCodeSVG
            value={qrUrl}
            size={Math.min(window.innerWidth, window.innerHeight) - 80}
          />
          <div style={{ fontSize: 16, fontWeight: 600, color: WHITE, marginTop: 24 }}>
            Scan to pay {money(amountNum)}
          </div>
          <div
            style={{
              fontSize: 13,
              color: MUTED,
              marginTop: 8,
              animation: "ups-pulse 1.6s ease-in-out infinite",
            }}
          >
            ● Waiting for payment...
          </div>
          <div style={{ fontSize: 12, color: MUTED, marginTop: "auto", paddingBottom: 24 }}>
            Tap to close
          </div>
        </div>
      )}

      {/* Refund confirmation dialog */}
      <AlertDialog
        open={refundConfirmOpen}
        onOpenChange={(open) => {
          if (!refundProcessing) setRefundConfirmOpen(open);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm refund</AlertDialogTitle>
            <AlertDialogDescription>
              You are about to record a {money(refundRow?.amount ?? 0)} refund
              {refundRow?.method ? ` via ${refundRow.method}` : ""} for {pupil?.name ?? "this pupil"}.
              This will update their balance and cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={refundProcessing}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void confirmRefund()}
              disabled={refundProcessing}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {refundProcessing ? "Processing..." : "Confirm refund"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </BottomSheet>
  );
}

export default UnifiedPaymentSheet;
