import { IconPrinter, IconCheck, IconX } from "@tabler/icons-react";
import { useEffect } from "react";
import type { RecordPaymentResult } from "@/lib/payments";

const FONT = { fontFamily: "Poppins, sans-serif" } as const;

export interface PaymentReceiptProps {
  pupilName: string;
  lessonDate: string;
  startTime: string;
  durationMinutes: number;
  lessonCost: number;
  amountPaid: number;
  method: string;
  result: RecordPaymentResult | null;
  onClose?: () => void;
}

function formatMethod(method: string) {
  switch (method.toLowerCase()) {
    case "cash":
      return "Cash";
    case "bank":
    case "bank_transfer":
    case "bank transfer":
      return "Bank transfer";
    case "card":
    case "card_qr":
    case "card qr":
      return "Card (QR)";
    case "already_paid":
    case "already paid":
      return "Already paid";
    case "waived":
      return "Waived";
    default:
      return method.charAt(0).toUpperCase() + method.slice(1);
  }
}

function formatDate(iso: string) {
  try {
    const d = new Date(`${iso}T00:00:00`);
    return d.toLocaleDateString("en-GB", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

function formatToday() {
  return new Date().toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function PaymentReceipt({
  pupilName,
  lessonDate,
  startTime,
  durationMinutes,
  lessonCost,
  amountPaid,
  method,
  result,
  onClose,
}: PaymentReceiptProps) {
  useEffect(() => {
    if (typeof document === "undefined") return;
    document.body.classList.add("dsm-printing-receipt");
    return () => document.body.classList.remove("dsm-printing-receipt");
  }, []);

  const handlePrint = () => {
    if (typeof window === "undefined") return;
    window.print();
  };

  return (
    <div
      className="dsm-receipt"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 99999,
        backgroundColor: "#fff",
        ...FONT,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "flex-start",
        padding: "24px 16px",
        overflowY: "auto",
      }}
    >
      <div
        className="no-print"
        style={{
          width: "100%",
          maxWidth: 420,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
        }}
      >
        <button
          type="button"
          onClick={handlePrint}
          className="flex items-center gap-2"
          style={{
            padding: "8px 14px",
            borderRadius: 20,
            backgroundColor: "#1877D6",
            color: "#fff",
            border: "none",
            fontWeight: 600,
            fontSize: 14,
            cursor: "pointer",
          }}
        >
          <IconPrinter stroke={1.5} size={16} />
          Print receipt
        </button>
        <button
          type="button"
          onClick={onClose}
          className="flex items-center justify-center"
          style={{
            width: 32,
            height: 32,
            borderRadius: "50%",
            backgroundColor: "#F8F9FB",
            border: "0.5px solid #EEF2F7",
            cursor: "pointer",
          }}
          aria-label="Close receipt"
        >
          <IconX stroke={1.5} size={16} color="#6B7280" />
        </button>
      </div>

      <div
        style={{
          width: "100%",
          maxWidth: 420,
          background: "#fff",
          border: "1px dashed #E4E8EF",
          borderRadius: 12,
          padding: "24px 20px",
          boxShadow: "0 1px 3px rgba(11,31,58,0.06)",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: 20 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: "50%",
              backgroundColor: "#E6F1FB",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 10px",
            }}
          >
            <IconCheck stroke={1.5} size={24} color="#1877D6" />
          </div>
          <div style={{ fontSize: 20, fontWeight: 800, color: "#0B1F3A" }}>
            Payment received
          </div>
          <div style={{ fontSize: 12, color: "#6B7280", marginTop: 4 }}>
            {formatToday()}
          </div>
        </div>

        <div
          style={{
            borderTop: "1px solid #EEF2F7",
            borderBottom: "1px solid #EEF2F7",
            padding: "14px 0",
            marginBottom: 16,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: 13,
              padding: "4px 0",
            }}
          >
            <span style={{ color: "#6B7280" }}>Pupil</span>
            <span style={{ color: "#0B1F3A", fontWeight: 600, textAlign: "right" }}>
              {pupilName}
            </span>
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: 13,
              padding: "4px 0",
            }}
          >
            <span style={{ color: "#6B7280" }}>Lesson</span>
            <span style={{ color: "#0B1F3A", fontWeight: 600, textAlign: "right" }}>
              {formatDate(lessonDate)} · {startTime}
            </span>
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: 13,
              padding: "4px 0",
            }}
          >
            <span style={{ color: "#6B7280" }}>Duration</span>
            <span style={{ color: "#0B1F3A", fontWeight: 600, textAlign: "right" }}>
              {durationMinutes} minutes
            </span>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 16,
          }}
        >
          <span style={{ fontSize: 14, color: "#6B7280" }}>Lesson cost</span>
          <span style={{ fontSize: 18, color: "#0B1F3A", fontWeight: 700 }}>
            £{lessonCost.toFixed(2)}
          </span>
        </div>

        <div
          style={{
            backgroundColor: "#F8F9FB",
            borderRadius: 10,
            padding: "14px 16px",
            marginBottom: 16,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: 13,
              padding: "4px 0",
            }}
          >
            <span style={{ color: "#6B7280" }}>Amount paid</span>
            <span style={{ color: "#0B1F3A", fontWeight: 700 }}>
              £{amountPaid.toFixed(2)}
            </span>
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: 13,
              padding: "4px 0",
            }}
          >
            <span style={{ color: "#6B7280" }}>Method</span>
            <span style={{ color: "#0B1F3A", fontWeight: 600 }}>
              {formatMethod(method)}
            </span>
          </div>
          {result && (
            <>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 13,
                  padding: "4px 0",
                }}
              >
                <span style={{ color: "#6B7280" }}>Applied to lesson</span>
                <span style={{ color: "#0B1F3A", fontWeight: 600 }}>
                  £{result.amountApplied.toFixed(2)}
                </span>
              </div>
              {result.overpayment > 0 && (
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: 13,
                    padding: "4px 0",
                  }}
                >
                  <span style={{ color: "#6B7280" }}>Overpayment / credit</span>
                  <span style={{ color: "#0B1F3A", fontWeight: 600 }}>
                    £{result.overpayment.toFixed(2)}
                  </span>
                </div>
              )}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 13,
                  padding: "4px 0",
                }}
              >
                <span style={{ color: "#6B7280" }}>Account balance</span>
                <span style={{ color: "#0B1F3A", fontWeight: 600 }}>
                  {result.newAccountBalance >= 0 ? "+" : "−"}
                  £{Math.abs(result.newAccountBalance).toFixed(2)}
                  <span style={{ color: "#6B7280", fontWeight: 400, marginLeft: 4 }}>
                    {result.newAccountBalance > 0
                      ? "credit"
                      : result.newAccountBalance < 0
                        ? "owed"
                        : ""}
                  </span>
                </span>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 13,
                  padding: "4px 0",
                }}
              >
                <span style={{ color: "#6B7280" }}>Lessons fully paid</span>
                <span style={{ color: "#0B1F3A", fontWeight: 600 }}>
                  {result.lessonsFullyPaid}
                </span>
              </div>
              {result.lessonsLeftPartial > 0 && (
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: 13,
                    padding: "4px 0",
                  }}
                >
                  <span style={{ color: "#6B7280" }}>Left partially paid</span>
                  <span style={{ color: "#0B1F3A", fontWeight: 600 }}>
                    {result.lessonsLeftPartial}
                  </span>
                </div>
              )}
            </>
          )}
        </div>

        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 12, color: "#6B7280" }}>
            Thank you for your business
          </div>
          <div
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: "#0B1F3A",
              marginTop: 2,
            }}
          >
            DSM by EveryDriver
          </div>
        </div>
      </div>

      <style>{`
        @media print {
          body.dsm-printing-receipt * {
            visibility: hidden !important;
          }
          body.dsm-printing-receipt .dsm-receipt,
          body.dsm-printing-receipt .dsm-receipt * {
            visibility: visible !important;
          }
          body.dsm-printing-receipt .dsm-receipt {
            position: absolute !important;
            inset: 0 !important;
            background: #fff !important;
            display: flex !important;
            align-items: flex-start !important;
            justify-content: center !important;
            padding: 0 !important;
            overflow: visible !important;
          }
          .no-print {
            display: none !important;
          }
          @page {
            margin: 12mm;
          }
        }
      `}</style>
    </div>
  );
}
