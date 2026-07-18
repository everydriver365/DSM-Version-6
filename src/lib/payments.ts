import { supabase } from "./supabaseClient";

/**
 * Canonical payment reconciliation.
 *
 * Applies a payment to a pupil's unpaid lessons FIFO by lesson_date, marking
 * each lesson `paid` or `partial` and setting `paid_amount` / `paid_at` /
 * `payment_method`. Never writes `amount_due` — that is set at lesson
 * creation and is the source of truth for lesson value.
 *
 * Overpayment is added to `pupils.account_balance`. An audit row is written
 * to `lesson_history` and a legacy `payments` row is inserted for reporting.
 *
 * Callers MUST use this helper rather than performing payment writes
 * directly, so reconciliation logic lives in exactly one place.
 */

/** Base input — used by every payment-recording surface, including the
 *  pupils quick-actions sheet. Deliberately does NOT include `hoursBought`
 *  so glance-and-act surfaces cannot accidentally mint prepaid hours. */
export interface RecordPaymentInput {
  pupilId: string;
  amount: number;
  method: string;
  notes?: string | null;
  /** Current `pupils.account_balance` — passed in so we don't re-fetch. */
  currentAccountBalance?: number | null;
  /** Optional ISO timestamp — used for paid_at and the audit row's created_at.
   *  Defaults to now. Lets callers backdate a payment to a chosen date. */
  createdAt?: string;
}

/** Extended input for the full payments page, where "record payment" can
 *  also represent buying a package of prepaid hours. */
export interface RecordPaymentWithPackageInput extends RecordPaymentInput {
  hoursBought: number;
}

/** Everything a caller (e.g. the quick-actions sheet's StatRow) needs to
 *  update its optimistic UI without re-deriving reconciliation state. */
export interface RecordPaymentResult {
  /** Amount applied to unpaid lessons (excludes overpayment). */
  amountApplied: number;
  /** Amount that overflowed onto pupils.account_balance. */
  overpayment: number;
  /** Resulting pupils.account_balance after this payment. */
  newAccountBalance: number;
  /** Resulting pupils.prepaid_hours after this payment. */
  newPrepaidHours: number;
  /** Number of lessons transitioned to `paid`. */
  lessonsFullyPaid: number;
  /** 1 if a lesson was left in `partial`, else 0. */
  lessonsLeftPartial: number;
  /**
   * Delta to apply to a previously-known balance owed:
   *   newBalanceOwed = priorBalanceOwed - amountApplied
   * Provided so callers don't re-implement the sign.
   */
  balanceOwedDelta: number;
}

interface CoreOptions {
  hoursBought: number;
}

async function recordPaymentCore(
  input: RecordPaymentInput,
  opts: CoreOptions,
): Promise<RecordPaymentResult> {
  const { pupilId, amount, method, notes, currentAccountBalance } = input;
  const { hoursBought } = opts;

  if (!(amount > 0)) {
    throw new Error("recordPayment: amount must be > 0");
  }

  const { data: u } = await supabase.auth.getUser();
  const instructorId = u?.user?.id ?? null;
  const now = new Date().toISOString();
  const today = now.slice(0, 10);

  let remaining = amount;
  let lessonsFullyPaid = 0;
  let lessonsLeftPartial = 0;

  // 1. Apply to oldest unpaid lessons.
  const { data: unpaid } = await supabase
    .from("lessons")
    .select("id, amount_due")
    .eq("pupil_id", pupilId)
    .eq("payment_status", "unpaid")
    .is("deleted_at", null)
    .order("lesson_date", { ascending: true });

  for (const l of (unpaid ?? []) as { id: string; amount_due: number | null }[]) {
    if (remaining <= 0) break;
    const due = Number(l.amount_due ?? 0);
    if (due <= 0) continue;
    // NOTE: never write amount_due on payment — set at lesson creation.
    if (due <= remaining) {
      await supabase
        .from("lessons")
        .update({
          payment_status: "paid",
          payment_method: method,
          paid_at: now,
          paid_amount: due,
        })
        .eq("id", l.id);
      remaining -= due;
      lessonsFullyPaid += 1;
    } else {
      await supabase
        .from("lessons")
        .update({
          payment_status: "partial",
          payment_method: method,
          paid_at: now,
          paid_amount: remaining,
        })
        .eq("id", l.id);
      remaining = 0;
      lessonsLeftPartial = 1;
    }
  }

  const overpayment = remaining;
  const amountApplied = amount - overpayment;

  // 2. Overpayment → account credit.
  let newAccountBalance = Number(currentAccountBalance ?? 0);
  if (overpayment > 0) {
    newAccountBalance = Number(currentAccountBalance ?? 0) + overpayment;
    await supabase
      .from("pupils")
      .update({ account_balance: newAccountBalance })
      .eq("id", pupilId);
  }

  // 3. Audit row.
  if (instructorId) {
    const { error: hErr } = await supabase.from("lesson_history").insert({
      instructor_id: instructorId,
      pupil_id: pupilId,
      lesson_cost: amount,
      payment_status: "paid",
      payment_method: method,
      notes:
        (notes ?? "").trim() ||
        (hoursBought > 0 ? `${hoursBought}h package` : null),
      created_at: now,
    });
    if (hErr) console.error("[recordPayment] history insert", hErr);
  }

  // 4. Legacy payments row.
  const { error: payErr } = await supabase.from("payments").insert({
    instructor_id: instructorId,
    pupil_id: pupilId,
    amount,
    payment_method: method,
    payment_date: today,
    status: "completed",
  });
  if (payErr) console.error("[recordPayment] payments insert", payErr);

  // 5. Optional package top-up (full-page flow only).
  let newPrepaidHours = 0;
  if (hoursBought > 0) {
    const { data: pRow } = await supabase
      .from("pupils")
      .select("lesson_count, prepaid_hours")
      .eq("id", pupilId)
      .maybeSingle();
    const curLessons = Number(
      (pRow as { lesson_count?: number | null } | null)?.lesson_count ?? 0,
    );
    const curPrepaid = Number(
      (pRow as { prepaid_hours?: number | null } | null)?.prepaid_hours ?? 0,
    );
    newPrepaidHours = curPrepaid + hoursBought;
    const { error: puErr } = await supabase
      .from("pupils")
      .update({
        lesson_count: curLessons + hoursBought,
        prepaid_hours: newPrepaidHours,
      })
      .eq("id", pupilId);
    if (puErr) console.error("[recordPayment] pupil hours update", puErr);
  } else {
    // Fetch current prepaid_hours so the return value stays truthful.
    const { data: pRow } = await supabase
      .from("pupils")
      .select("prepaid_hours")
      .eq("id", pupilId)
      .maybeSingle();
    newPrepaidHours = Number(
      (pRow as { prepaid_hours?: number | null } | null)?.prepaid_hours ?? 0,
    );
  }

  return {
    amountApplied,
    overpayment,
    newAccountBalance,
    newPrepaidHours,
    lessonsFullyPaid,
    lessonsLeftPartial,
    balanceOwedDelta: -amountApplied,
  };
}

/**
 * Record a payment against a pupil. Use this from every surface that isn't
 * the full payments page — the quick-actions sheet, bulk payment flows, etc.
 * Cannot mint prepaid hours; that's intentional.
 */
export function recordPayment(
  input: RecordPaymentInput,
): Promise<RecordPaymentResult> {
  return recordPaymentCore(input, { hoursBought: 0 });
}

/**
 * Full payments page only — records a payment that also buys a package
 * of prepaid hours. Adds to `pupils.prepaid_hours` and `lesson_count`.
 */
export function recordPaymentWithPackage(
  input: RecordPaymentWithPackageInput,
): Promise<RecordPaymentResult> {
  return recordPaymentCore(input, { hoursBought: input.hoursBought });
}
