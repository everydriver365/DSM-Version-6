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
  chargeOption: "none" | "fee" | "full";
  cancelFee?: string | number;
  amountDue?: number | null;
  paymentStatus?: string | null;
}) {
  const due = Number(amountDue ?? 0);
  const normalized = (paymentStatus ?? "").toLowerCase();
  const fee = Number(cancelFee ?? 0);
  const refund = due - fee;

  let outcomeText = "";
  if (chargeOption === "none") {
    if (normalized === "paid" || normalized === "partial") {
      outcomeText = `£${due.toFixed(2)} refunded as account credit`;
    } else if (normalized === "prepaid") {
      outcomeText = "1 lesson returned to prepaid hours";
    } else {
      outcomeText = "No payment to refund";
    }
  } else if (chargeOption === "fee") {
    if (refund > 0) {
      outcomeText = `£${fee.toFixed(2)} cancellation fee retained; £${refund.toFixed(2)} refunded as account credit`;
    } else {
      outcomeText = `£${fee.toFixed(2)} cancellation fee retained; no refund due`;
    }
  } else if (chargeOption === "full") {
    outcomeText = `£${due.toFixed(2)} full lesson charge retained; no refund`;
  }

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
              color: chargeOption === "none" && (normalized === "paid" || normalized === "partial" || normalized === "prepaid")
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
