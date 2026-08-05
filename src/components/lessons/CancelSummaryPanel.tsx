import { describeChargeOption, normalizePayState, type ChargeOption } from "@/lib/cancelCharge";

export function CancelSummaryPanel({
  reason,
  notes,
  chargeOption,
  cancelFee,
  amountDue,
  paymentStatus,
}: {
  reason: string;
  notes?: string;
  chargeOption: ChargeOption;
  cancelFee?: string | number;
  amountDue?: number | null;
  paymentStatus?: string | null;
}) {
  const payState = normalizePayState(paymentStatus);
  const outcomeText = describeChargeOption(chargeOption, {
    paymentStatus,
    amountDue,
    fee: cancelFee,
  }).outcomeText;



  const row = (label: string, value: string) => (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <span
        style={{
          fontFamily: "Poppins, sans-serif",
          fontSize: 11,
          color: "#6B7686",
          fontWeight: 500,
          textTransform: "uppercase",
          letterSpacing: 0.3,
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontFamily: "Poppins, sans-serif",
          fontSize: 13,
          color: "#0B1F3A",
          fontWeight: 500,
          lineHeight: 1.4,
        }}
      >
        {value || "None"}
      </span>
    </div>
  );

  return (
    <div
      style={{
        border: "1px solid #E4E8EF",
        borderRadius: 10,
        background: "#F8FAFC",
        padding: 12,
        marginTop: 12,
        marginBottom: 12,
      }}
    >
      <div
        style={{
          fontFamily: "Poppins, sans-serif",
          fontSize: 13,
          fontWeight: 600,
          color: "#0B1F3A",
          marginBottom: 10,
        }}
      >
        Cancellation summary
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {row("Reason", reason)}
        {row("Notes", notes?.trim() || "None")}
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <span
            style={{
              fontFamily: "Poppins, sans-serif",
              fontSize: 11,
              color: "#6B7686",
              fontWeight: 500,
              textTransform: "uppercase",
              letterSpacing: 0.3,
            }}
          >
            Outcome
          </span>
          <span
            style={{
              fontFamily: "Poppins, sans-serif",
              fontSize: 13,
              color: chargeOption === "none" && payState !== "unpaid"
                ? "#16A34A"
                : chargeOption === "full" || chargeOption === "fee"
                  ? "#CC2229"
                  : "#0B1F3A",
              fontWeight: 600,
              lineHeight: 1.4,
            }}
          >
            {outcomeText}
          </span>
        </div>
      </div>
    </div>
  );
}
