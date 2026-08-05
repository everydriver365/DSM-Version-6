export type ChargeOption = "none" | "fee" | "full";

export type PayState = "paid" | "partial" | "prepaid" | "unpaid";

/** Normalise the many payment_status strings used across the app. */
export function normalizePayState(status?: string | null): PayState {
  const s = (status ?? "").toLowerCase().trim();
  if (s === "paid") return "paid";
  if (s === "partial" || s === "part_paid" || s === "partially_paid") return "partial";
  if (s === "prepaid" || s === "block" || s === "national_intensives") return "prepaid";
  return "unpaid";
}

/** Which charge options make sense for this lesson's payment state. */
export function availableChargeOptions(status?: string | null): ChargeOption[] {
  const s = normalizePayState(status);
  if (s === "paid" || s === "partial") return ["none", "fee", "full"];
  // Prepaid and unpaid lessons have no cash payment to retain in full.
  return ["none", "fee"];
}

/** Keep a selected option valid for the current payment state. */
export function coerceChargeOption(
  option: ChargeOption,
  status?: string | null,
): ChargeOption {
  const allowed = availableChargeOptions(status);
  return allowed.includes(option) ? option : "none";
}

/** Max fee that can be charged — the lesson value, when there is one. */
export function feeCap(amountDue?: number | null): number | null {
  const due = Number(amountDue ?? 0);
  return due > 0 ? due : null;
}

/** Parse + clamp a fee input to the lesson value. */
export function clampFee(value: string | number | null | undefined, amountDue?: number | null): number {
  const raw = Number(value);
  if (!Number.isFinite(raw) || raw < 0) return 0;
  const cap = feeCap(amountDue);
  if (cap != null && raw > cap) return cap;
  return raw;
}

export type ChargeDescription = {
  /** Short line shown under the option title. */
  subtitle: string;
  /** Full outcome sentence for the summary panel / audit note. */
  outcomeText: string;
  /** Whether the cancellation can be confirmed with this option. */
  valid: boolean;
  /** Reason it can't be confirmed. */
  error?: string;
  /** Label for the confirm button. */
  confirmLabel: string;
};

export function describeChargeOption(
  option: ChargeOption,
  opts: { paymentStatus?: string | null; amountDue?: number | null; fee?: string | number | null },
): ChargeDescription {
  const state = normalizePayState(opts.paymentStatus);
  const due = Number(opts.amountDue ?? 0);
  const fee = clampFee(opts.fee, opts.amountDue);
  const money = (n: number) => `£${n.toFixed(2)}`;

  if (option === "none") {
    if (state === "paid" || state === "partial") {
      const text = `${money(due)} refunded as account credit`;
      return {
        subtitle: text,
        outcomeText: text,
        valid: true,
        confirmLabel: due > 0 ? `Cancel & refund ${money(due)}` : "Cancel lesson",
      };
    }
    if (state === "prepaid") {
      const text = "1 lesson returned to prepaid hours";
      return { subtitle: text, outcomeText: text, valid: true, confirmLabel: "Cancel & return hour" };
    }
    const text = "Nothing charged — no payment was taken";
    return { subtitle: text, outcomeText: text, valid: true, confirmLabel: "Cancel lesson" };
  }

  if (option === "fee") {
    if (state === "paid" || state === "partial") {
      const refund = Math.max(0, due - fee);
      const subtitle = fee > 0
        ? `${money(fee)} retained · ${money(refund)} refunded`
        : "Remainder refunded to account credit";
      const outcomeText = refund > 0
        ? `${money(fee)} cancellation fee retained; ${money(refund)} refunded as account credit`
        : `${money(fee)} cancellation fee retained; no refund due`;
      return {
        subtitle,
        outcomeText,
        valid: fee > 0,
        error: fee > 0 ? undefined : "Enter a fee amount",
        confirmLabel: fee > 0 ? `Cancel & charge ${money(fee)}` : "Cancel lesson",
      };
    }
    if (state === "prepaid") {
      const subtitle = "Hour consumed — not returned to the package";
      return {
        subtitle,
        outcomeText: "Cancellation fee applied; 1 prepaid hour consumed",
        valid: true,
        confirmLabel: "Cancel & consume hour",
      };
    }
    const subtitle = fee > 0 ? `${money(fee)} will be owed` : "Fee becomes the amount owed";
    return {
      subtitle,
      outcomeText: `${money(fee)} cancellation fee owed`,
      valid: fee > 0,
      error: fee > 0 ? undefined : "Enter a fee amount",
      confirmLabel: fee > 0 ? `Cancel & charge ${money(fee)}` : "Cancel lesson",
    };
  }

  // full
  const text = `${money(due)} full lesson charge retained; no refund`;
  return {
    subtitle: "No refund — full payment retained",
    outcomeText: text,
    valid: state === "paid" || state === "partial",
    error: state === "paid" || state === "partial" ? undefined : "Not available for this lesson",
    confirmLabel: `Cancel & charge ${money(due)}`,
  };
}
