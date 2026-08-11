import { supabase } from "./supabaseClient";

/**
 * Pending Square payments.
 *
 * A generated Square link/QR is a *request* for payment, not a payment. Each
 * one gets a `square_payment_intents` row so the UI can show "awaiting
 * payment" and the Square webhook (src/routes/api/public/square-webhook.ts)
 * can settle the ledger when the pupil actually pays.
 */

export interface SquareIntentInput {
  instructorId: string;
  pupilId?: string | null;
  lessonId?: string | null;
  amountPence: number;
  description?: string | null;
  paymentLinkId?: string | null;
  orderId?: string | null;
  checkoutUrl?: string | null;
}

export type SquareIntentStatus = "pending" | "paid" | "failed" | "cancelled";

/** Insert a pending intent. Returns its id, or null if the write failed —
 *  callers should still show the link rather than blocking the payment. */
export async function createSquareIntent(
  input: SquareIntentInput,
): Promise<string | null> {
  const { data, error } = await supabase
    .from("square_payment_intents")
    .insert({
      instructor_id: input.instructorId,
      pupil_id: input.pupilId ?? null,
      lesson_id: input.lessonId ?? null,
      amount_pence: input.amountPence,
      description: input.description ?? null,
      payment_link_id: input.paymentLinkId ?? null,
      order_id: input.orderId ?? null,
      checkout_url: input.checkoutUrl ?? null,
    })
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("[squareIntents] create", error);
    return null;
  }
  return (data as { id: string } | null)?.id ?? null;
}

/**
 * Watch an intent until it settles. Uses realtime with a poll safety net,
 * because the webhook writes from the server and the tab may be backgrounded.
 * Returns an unsubscribe function.
 */
export function watchSquareIntent(
  intentId: string,
  onChange: (status: SquareIntentStatus) => void,
): () => void {
  let stopped = false;

  const check = async () => {
    const { data } = await supabase
      .from("square_payment_intents")
      .select("status")
      .eq("id", intentId)
      .maybeSingle();
    const status = (data as { status?: SquareIntentStatus } | null)?.status;
    if (!stopped && status) onChange(status);
  };

  void check();
  const interval = window.setInterval(() => { void check(); }, 5000);

  const channel = supabase
    .channel(`square-intent-${intentId}`)
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "square_payment_intents",
        filter: `id=eq.${intentId}`,
      },
      (payload) => {
        const status = (payload.new as { status?: SquareIntentStatus } | null)?.status;
        if (!stopped && status) onChange(status);
      },
    )
    .subscribe();

  return () => {
    stopped = true;
    window.clearInterval(interval);
    void supabase.removeChannel(channel);
  };
}

/** Mark an intent as cancelled — e.g. the instructor closed the QR sheet. */
export async function cancelSquareIntent(intentId: string): Promise<void> {
  await supabase
    .from("square_payment_intents")
    .update({ status: "cancelled" })
    .eq("id", intentId)
    .eq("status", "pending");
}
