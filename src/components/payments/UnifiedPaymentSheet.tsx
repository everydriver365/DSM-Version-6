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
  Pencil,
  QrCode,
  Search,
  Sparkles,
  CreditCard,
} from "lucide-react";
import { toast } from "sonner";
import { IconCircleCheck } from "@tabler/icons-react";
import { supabase } from "@/lib/supabaseClient";
import { BottomSheet } from "@/components/dsm/BottomSheetV2";
import { getPupilBalance, type PupilBalance } from "@/lib/payments";

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
  custom_rate: number | null;
  custom_rate_90: number | null;
  custom_rate_120: number | null;
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
  notes: string | null;
}

const PRICING_OPTIONS: { key: PricingType; label: string; Icon: typeof Package }[] = [
  { key: "block", label: "Block", Icon: Package },
  { key: "national_intensives", label: "National Intensives", Icon: Building2 },
  { key: "standard", label: "Standard", Icon: Clock },
  { key: "custom", label: "Custom rate", Icon: Pencil },
];

const METHOD_LABEL: Record<PayMethod, string> = {
  cash: "Cash",
  bank_transfer: "Bank transfer",
  qr: "QR code",
  link: "Pay link",
  klarna: "Klarna",
  clearpay: "Clearpay",
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
  const [paymentSuccess, setPaymentSuccess] = useState<{
    amount: number;
    method: string;
    pupilName: string;
  } | null>(null);

  // --- pricing tab state ---
  const [pricingType, setPricingType] = useState<PricingType>("standard");
  const [hoursTotal, setHoursTotal] = useState("");
  const [packagePrice, setPackagePrice] = useState("");
  const [packageMethod, setPackageMethod] = useState<PayMethod>("cash");
  const [niTotal, setNiTotal] = useState("");
  const [niRef, setNiRef] = useState("");
  const [niPayer, setNiPayer] = useState<"national_intensives" | "pupil">("national_intensives");
  const [rate60, setRate60] = useState("");
  const [rate90, setRate90] = useState("");
  const [rate120, setRate120] = useState("");
  const [savingPricing, setSavingPricing] = useState(false);

  const pupil = useMemo(() => pupils.find((p) => p.id === pupilId) ?? null, [pupils, pupilId]);
  const amountNum = Number(amount) || 0;
  const outstanding = balance?.outstanding ?? 0;

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
    if (!paymentSuccess) return;
    const t = setTimeout(() => handlePaymentDone(), 3000);
    return () => clearTimeout(t);
  }, [paymentSuccess, handlePaymentDone]);

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
    setPaymentSuccess(null);
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
            "id, name, phone, email, pricing_type, prepaid_hours, block_hours_total, prepaid_amount_paid, ni_amount_total, ni_amount_paid, ni_payer, ni_reference, account_balance, custom_rate, custom_rate_90, custom_rate_120",
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
        .select("id, lesson_cost, amount_paid, payment_method, created_at, notes")
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
          notes: string | null;
        }[]).map((r) => ({
          id: r.id,
          amount: Number(r.amount_paid ?? r.lesson_cost ?? 0),
          method: r.payment_method,
          created_at: r.created_at,
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
    setRate60(pupil.custom_rate != null ? String(pupil.custom_rate) : "");
    setRate90(pupil.custom_rate_90 != null ? String(pupil.custom_rate_90) : "");
    setRate120(pupil.custom_rate_120 != null ? String(pupil.custom_rate_120) : "");
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
        "id, name, phone, email, pricing_type, prepaid_hours, block_hours_total, prepaid_amount_paid, ni_amount_total, ni_amount_paid, ni_payer, ni_reference, account_balance, custom_rate, custom_rate_90, custom_rate_120",
      )
      .eq("id", pupilId)
      .maybeSingle();
    if (data) {
      const row = data as unknown as PupilRow;
      setPupils((prev) => prev.map((p) => (p.id === row.id ? row : p)));
    }
    await loadPupilData(pupilId);
  }, [pupilId, loadPupilData]);

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
  const applyPaymentToLessons = useCallback(
    async (amt: number, methodNorm: string, nowIso: string) => {
      if (!pupilId) return 0;
      let remaining = amt;
      const { data: unpaid } = await supabase
        .from("lessons")
        .select("id, amount_due, paid_amount")
        .eq("pupil_id", pupilId)
        .in("payment_status", ["unpaid", "partial"])
        .is("deleted_at", null)
        .order("lesson_date", { ascending: true });
      for (const l of (unpaid ?? []) as {
        id: string;
        amount_due: number | null;
        paid_amount: number | null;
      }[]) {
        if (remaining <= 0) break;
        const already = Number(l.paid_amount ?? 0);
        const due = Number(l.amount_due ?? 0) - already;
        if (due <= 0) continue;
        if (due <= remaining) {
          await supabase
            .from("lessons")
            .update({
              payment_status: "paid",
              payment_method: methodNorm,
              paid_at: nowIso,
              paid_amount: already + due,
            })
            .eq("id", l.id);
          remaining -= due;
        } else {
          await supabase
            .from("lessons")
            .update({
              payment_status: "partial",
              payment_method: methodNorm,
              paid_at: nowIso,
              paid_amount: already + remaining,
            })
            .eq("id", l.id);
          remaining = 0;
        }
      }
      return remaining;
    },
    [pupilId],
  );

  const recordPayment = useCallback(
    async (overrideMethod?: PayMethod) => {
      const m = overrideMethod ?? method;
      if (!m || amountNum <= 0) return;
      setSaving(true);
      try {
        const nowIso = new Date(`${paymentDate}T12:00:00`).toISOString();

        // 1) Audit row
        const { error: hErr } = await supabase.from("lesson_history").insert({
          instructor_id: instructorId,
          pupil_id: customMode ? null : pupilId,
          lesson_cost: amountNum,
          amount_paid: amountNum,
          payment_method: m,
          payment_status: "paid",
          lesson_date: paymentDate,
          notes: note.trim() || null,
          created_at: nowIso,
        });
        if (hErr) throw hErr;

        if (!customMode && pupilId) {
          const type = (pupil?.pricing_type ?? "standard") as PricingType;
          let overage = 0;

          // 2) Standard / custom — apply FIFO to lessons
          if (type === "standard" || type === "custom") {
            overage = await applyPaymentToLessons(amountNum, m, nowIso);
          }

          // 3) NI — track amount received from National Intensives
          if (type === "national_intensives" && (pupil?.ni_payer ?? "national_intensives") === "national_intensives") {
            await supabase
              .from("pupils")
              .update({
                ni_amount_paid: Number(pupil?.ni_amount_paid ?? 0) + amountNum,
                ni_payment_date: paymentDate,
              })
              .eq("id", pupilId);
          }

          // 5) Overpayment → account credit
          if (overage > 0) {
            await supabase
              .from("pupils")
              .update({ account_balance: Number(pupil?.account_balance ?? 0) + overage })
              .eq("id", pupilId);
          }

          // 6) Refresh summary
          await refreshPupil();
        }

        toast.success(customMode ? "Custom payment recorded" : "Payment recorded");
        if (typeof window !== "undefined") {
          window.dispatchEvent(new Event("dsm-payment-recorded"));
        }
        setPaymentSuccess({
          amount: amountNum,
          method: m,
          pupilName: pupil?.name ?? "Custom",
        });
        await refreshPupil();
        // Ready for the next payment — keep the pupil selected.
        setAmount("");
        setMethod("cash");
        setNote("");
        setPaymentDate(todayIso());
        setQrUrl(null);
        setPayUrl(null);
        setQrPaymentId(null);
        if (pupilId) {
          const freshBal = await getPupilBalance(pupilId);
          setBalance(freshBal);
        }
      } catch (e) {
        console.error("[UnifiedPaymentSheet] recordPayment", e);
        toast.error("Couldn't record payment");
      } finally {
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
      applyPaymentToLessons,
      refreshPupil,
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
          await recordPayment(method === "link" ? "link" : "qr");
          handleClose();
        }
      } catch (e) {
        console.warn("[UnifiedPaymentSheet] qr poll", e);
      }
    }, 5000);
    return () => clearInterval(t);
  }, [qrPaymentId, method, recordPayment, handleClose]);

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
    if (!refundRow || !pupilId) return;
    try {
      const nowIso = new Date().toISOString();
      const { error } = await supabase.from("lesson_history").insert({
        instructor_id: instructorId,
        pupil_id: pupilId,
        lesson_cost: -refundRow.amount,
        amount_paid: -refundRow.amount,
        payment_method: refundRow.method,
        payment_status: "refunded",
        notes: `Refund of ${money(refundRow.amount)}`,
        created_at: nowIso,
      });
      if (error) throw error;

      // Reverse the most recent paid lesson allocation where possible.
      const { data: paidLessons } = await supabase
        .from("lessons")
        .select("id, amount_due, paid_amount")
        .eq("pupil_id", pupilId)
        .in("payment_status", ["paid", "partial"])
        .is("deleted_at", null)
        .order("lesson_date", { ascending: false })
        .limit(20);
      let remaining = refundRow.amount;
      for (const l of (paidLessons ?? []) as {
        id: string;
        amount_due: number | null;
        paid_amount: number | null;
      }[]) {
        if (remaining <= 0) break;
        const paid = Number(l.paid_amount ?? 0);
        if (paid <= 0) continue;
        const take = Math.min(paid, remaining);
        const next = paid - take;
        await supabase
          .from("lessons")
          .update({
            paid_amount: next,
            payment_status: next <= 0 ? "unpaid" : "partial",
          })
          .eq("id", l.id);
        remaining -= take;
      }

      // Anything left came out of account credit.
      if (remaining > 0) {
        await supabase
          .from("pupils")
          .update({
            account_balance: Math.max(0, Number(pupil?.account_balance ?? 0) - remaining),
          })
          .eq("id", pupilId);
      }

      toast.success("Refund recorded");
      setRefundRow(null);
      await refreshPupil();
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("dsm-payment-recorded"));
      }
      onSaved?.();
    } catch (e) {
      console.error("[UnifiedPaymentSheet] confirmRefund", e);
      toast.error("Couldn't record refund");
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
    onSaved?.();
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
        patch = {
          custom_rate: rate60 === "" ? null : Number(rate60),
          custom_rate_90: rate90 === "" ? null : Number(rate90),
          custom_rate_120: rate120 === "" ? null : Number(rate120),
        };
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
          const { error: hErr } = await supabase.from("lesson_history").insert({
            instructor_id: instructorId,
            pupil_id: pupilId,
            amount_paid: newPrice,
            payment_method: packageMethod,
            lesson_date: new Date().toISOString().slice(0, 10),
            payment_status: "paid",
            notes: `Block package: ${hoursTotal} hrs at £${newPrice}`,
            created_at: new Date().toISOString(),
          });
          if (hErr) console.error("[UnifiedPaymentSheet] package history insert", hErr);
          await supabase
            .from("pupils")
            .update({ prepaid_hours: hoursTotal === "" ? 0 : Number(hoursTotal) })
            .eq("id", pupilId);
        }
      }

      toast.success(
        isNewPackage
          ? `Block package recorded — ${hoursTotal} hrs · ${money(newPrice)}`
          : "Pricing updated",
      );
      await refreshPupil();
      onSaved?.();
    } catch (e) {
      console.error("[UnifiedPaymentSheet] savePricing", e);
      toast.error("Couldn't save pricing");
    } finally {
      setSavingPricing(false);
    }
  };

  // Block cancellation calculator
  const unusedHrs = Number(pupil?.prepaid_hours ?? 0);
  const blockTotalHrs = Number(pupil?.block_hours_total ?? 0);
  const blockPrice = Number(pupil?.prepaid_amount_paid ?? 0);
  const refundDue = blockTotalHrs > 0 ? (unusedHrs / blockTotalHrs) * blockPrice : 0;

  const processCancellation = async () => {
    if (!pupilId) return;
    try {
      await supabase.from("pupils").update({ prepaid_hours: 0 }).eq("id", pupilId);
      await supabase.from("lesson_history").insert({
        instructor_id: instructorId,
        pupil_id: pupilId,
        lesson_cost: -refundDue,
        amount_paid: -refundDue,
        payment_method: "refund",
        payment_status: "refunded",
        notes: `Package cancellation — ${unusedHrs}h of ${blockTotalHrs}h unused`,
        created_at: new Date().toISOString(),
      });
      await supabase
        .from("pupils")
        .update({ account_balance: Math.max(0, Number(pupil?.account_balance ?? 0) - refundDue) })
        .eq("id", pupilId);
      toast.success("Cancellation processed");
      await refreshPupil();
      onSaved?.();
    } catch (e) {
      console.error("[UnifiedPaymentSheet] processCancellation", e);
      toast.error("Couldn't process cancellation");
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
    if (type === "custom") return `Custom rate · ${unpaidLessons.length} unpaid`;
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
    return void recordPayment();
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
    tab === "pricing" && !customMode ? (
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
      footer={paymentSuccess ? null : footer}
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
            <div style={{ display: "flex", gap: 12, marginTop: 24, width: "100%" }}>
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
                Record another payment
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
                    <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
                      <button
                        type="button"
                        onClick={() => void confirmRefund()}
                        style={{
                          flex: 1,
                          height: 34,
                          borderRadius: 8,
                          border: "none",
                          background: RED,
                          color: WHITE,
                          fontSize: 12,
                          fontWeight: 600,
                          fontFamily: FONT,
                          cursor: "pointer",
                        }}
                      >
                        Confirm refund
                      </button>
                      <button
                        type="button"
                        onClick={() => setRefundRow(null)}
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
                          {r.amount > 0 && (
                            <button
                              type="button"
                              onClick={() => setRefundRow(r)}
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
                              Refund
                            </button>
                          )}
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
              {PRICING_OPTIONS.map(({ key, label, Icon }) => {
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
                      gap: 6,
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
                <Label>Custom rates</Label>
                <Field label="60 min rate (£)">
                  <input
                    inputMode="decimal"
                    value={rate60}
                    onChange={(e) => setRate60(e.target.value)}
                    placeholder="0.00"
                    style={inputStyle}
                  />
                </Field>
                <Field label="90 min rate (£)">
                  <input
                    inputMode="decimal"
                    value={rate90}
                    onChange={(e) => setRate90(e.target.value)}
                    placeholder="0.00"
                    style={inputStyle}
                  />
                </Field>
                <Field label="120 min rate (£)">
                  <input
                    inputMode="decimal"
                    value={rate120}
                    onChange={(e) => setRate120(e.target.value)}
                    placeholder="0.00"
                    style={inputStyle}
                  />
                </Field>
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
    </BottomSheet>
  );
}

export default UnifiedPaymentSheet;
