import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import {
  IconCreditCard,
  IconChevronLeft,
  IconCheck,
  IconExternalLink,
  IconAlertTriangle,
  IconUnlink,
  IconChevronRight,
} from "@tabler/icons-react";
import { toast } from "sonner";
import { PageLoader } from "@/components/dsm/LoadingSpinner";

export const Route = createFileRoute("/square")({
  head: () => ({
    meta: [
      { title: "Square Payments — DSM" },
      {
        name: "description",
        content:
          "Connect your Square account to take instant card payments from pupils.",
      },
      { property: "og:title", content: "Square Payments — DSM" },
      {
        property: "og:description",
        content:
          "Connect your Square account to take instant card payments from pupils.",
      },
    ],
  }),
  component: SquarePage,
});

const NAVY = "#0B1F3A";
const FONT = "Poppins, sans-serif";

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: 11,
        fontWeight: 600,
        color: "#9CA3AF",
        textTransform: "uppercase",
        letterSpacing: "0.08em",
        padding: "16px 4px 6px",
        fontFamily: FONT,
      }}
    >
      {children}
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        background: "#fff",
        borderRadius: 16,
        overflow: "hidden",
        boxShadow: "0 1px 3px rgba(11,31,58,0.06)",
      }}
    >
      {children}
    </div>
  );
}

function InfoRow({
  label,
  value,
  divider,
}: {
  label: string;
  value: string;
  divider?: boolean;
}) {
  return (
    <>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          padding: "13px 16px",
          fontFamily: FONT,
        }}
      >
        <span style={{ fontSize: 14, fontWeight: 500, color: NAVY }}>
          {label}
        </span>
        <span
          style={{
            fontSize: 13,
            color: "#6B7686",
            textAlign: "right",
            minWidth: 0,
          }}
        >
          {value}
        </span>
      </div>
      {divider ? (
        <div style={{ height: 1, background: "#E4E8EF", marginLeft: 16 }} />
      ) : null}
    </>
  );
}

function SquarePage() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [squareConnected, setSquareConnected] = useState(false);
  const [squareConnectedAt, setSquareConnectedAt] = useState<string | null>(
    null,
  );
  const [squareMerchantId, setSquareMerchantId] = useState<string | null>(null);
  const [disconnecting, setDisconnecting] = useState(false);

  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }
      setUserId(user.id);

      const { data } = await supabase
        .from("instructors")
        .select("square_merchant_id, square_connected_at")
        .eq("id", user.id)
        .maybeSingle();

      setSquareConnected(!!data?.square_merchant_id);
      setSquareMerchantId(data?.square_merchant_id ?? null);
      setSquareConnectedAt(data?.square_connected_at ?? null);
      setLoading(false);
    })();
  }, []);

  // Handle return from Square OAuth
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("square_connected") === "1") {
      toast.success("Square connected!");
      window.history.replaceState({}, "", "/square");
    }
    if (params.get("square_error")) {
      toast.error("Could not connect Square");
      window.history.replaceState({}, "", "/square");
    }
  }, []);

  async function disconnect() {
    if (!userId) return;
    setDisconnecting(true);
    try {
      await supabase
        .from("instructors")
        .update({
          square_access_token: null,
          square_refresh_token: null,
          square_merchant_id: null,
          square_location_id: null,
          square_connected_at: null,
          square_token_expires_at: null,
        })
        .eq("id", userId);
      setSquareConnected(false);
      setSquareMerchantId(null);
      setSquareConnectedAt(null);
      toast.success("Square disconnected");
    } catch {
      toast.error("Could not disconnect");
    } finally {
      setDisconnecting(false);
    }
  }

  const connectedDate = squareConnectedAt
    ? new Date(squareConnectedAt).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : null;

  return (
    <div style={{ minHeight: "100dvh", background: "#EEF2F7", fontFamily: FONT }}>
      {/* Header */}
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 30,
          background: NAVY,
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "calc(env(safe-area-inset-top, 0px) + 12px) 16px 14px",
          borderRadius: "0 0 28px 28px",
        }}
      >
        <button
          type="button"
          aria-label="Back"
          onClick={() => navigate({ to: "/more" as never })}
          style={{
            background: "none",
            border: "none",
            padding: 0,
            display: "flex",
            alignItems: "center",
            cursor: "pointer",
          }}
        >
          <IconChevronLeft
            size={22}
            color="rgba(255,255,255,0.7)"
            stroke={1.8}
          />
        </button>
        <h1
          style={{
            margin: 0,
            fontSize: 18,
            fontWeight: 700,
            color: "#fff",
            fontFamily: FONT,
          }}
        >
          Square Payments
        </h1>
      </div>

      <div style={{ padding: 16 }}>
        {loading ? (
          <PageLoader />
        ) : squareConnected ? (
          <>
            <SectionHeader>Status</SectionHeader>
            <Card>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "14px 16px",
                }}
              >
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: "50%",
                    background: "#DCFCE7",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <IconCheck size={18} color="#16A34A" />
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: NAVY }}>
                    Square connected
                  </div>
                  {connectedDate ? (
                    <div style={{ fontSize: 12, color: "#6B7686", marginTop: 1 }}>
                      Connected {connectedDate}
                    </div>
                  ) : null}
                </div>
              </div>
            </Card>

            <SectionHeader>Account</SectionHeader>
            <Card>
              <InfoRow label="Merchant ID" value={squareMerchantId ?? "—"} />
            </Card>

            <SectionHeader>Fees</SectionHeader>
            <Card>
              <InfoRow label="DSM platform fee" value="1% per transaction" divider />
              <InfoRow label="Card processing" value="Square's standard rate" divider />
              <InfoRow label="Payout speed" value="Instant to your bank" />
            </Card>

            <SectionHeader>Danger zone</SectionHeader>
            <Card>
              <button
                type="button"
                onClick={disconnect}
                disabled={disconnecting}
                style={{
                  width: "100%",
                  background: "#fff",
                  border: "none",
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "14px 16px",
                  textAlign: "left",
                  cursor: disconnecting ? "default" : "pointer",
                  opacity: disconnecting ? 0.6 : 1,
                  fontFamily: FONT,
                }}
              >
                <IconUnlink size={18} color="#CC2229" />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "#CC2229" }}>
                    {disconnecting ? "Disconnecting…" : "Disconnect Square"}
                  </div>
                  <div style={{ fontSize: 12, color: "#9CA3AF", marginTop: 1 }}>
                    Card payments will be disabled
                  </div>
                </div>
              </button>
            </Card>
          </>
        ) : (
          <>
            {/* Hero banner */}
            <div
              style={{
                background: "linear-gradient(135deg, #F59E0B, #D97706)",
                borderRadius: 20,
                padding: 20,
                display: "flex",
                flexDirection: "column",
                gap: 12,
                color: "#fff",
                boxShadow: "0 6px 18px rgba(217,119,6,0.25)",
              }}
            >
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 14,
                  background: "rgba(255,255,255,0.2)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <IconCreditCard size={22} color="#fff" />
              </div>
              <div>
                <div style={{ fontSize: 18, fontWeight: 700 }}>
                  Accept card payments
                </div>
                <div
                  style={{
                    fontSize: 13,
                    color: "rgba(255,255,255,0.9)",
                    marginTop: 4,
                    lineHeight: 1.45,
                  }}
                >
                  Connect Square to take card payments from pupils instantly
                </div>
              </div>
            </div>

            <SectionHeader>Connect</SectionHeader>
            <Card>
              <button
                type="button"
                onClick={() =>
                  window.open(
                    `https://bjpqxfrihwjcqprmoqfs.supabase.co/functions/v1/square-oauth-start?instructor_id=${userId ?? ""}`,
                    "_blank",
                  )
                }
                style={{
                  width: "100%",
                  background: "#fff",
                  border: "none",
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "13px 16px",
                  textAlign: "left",
                  cursor: "pointer",
                  fontFamily: FONT,
                }}
              >
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: "50%",
                    background: "#FEF3C7",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <IconCreditCard size={18} color="#F59E0B" />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: NAVY }}>
                    Connect Square account
                  </div>
                  <div style={{ fontSize: 12, color: "#6B7686", marginTop: 1 }}>
                    Already have Square? Connect here
                  </div>
                </div>
                <IconChevronRight size={18} color="#C7D0DC" />
              </button>

              <div style={{ height: 1, background: "#E4E8EF", marginLeft: 64 }} />

              <button
                type="button"
                onClick={() =>
                  window.open("https://squareup.com/i/EVERYDRIVE", "_blank")
                }
                style={{
                  width: "100%",
                  background: "#fff",
                  border: "none",
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "13px 16px",
                  textAlign: "left",
                  cursor: "pointer",
                  fontFamily: FONT,
                }}
              >
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: "50%",
                    background: "#E0E7FF",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <IconExternalLink size={18} color="#4F46E5" />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: NAVY }}>
                    Create a Square account
                  </div>
                  <div style={{ fontSize: 12, color: "#6B7686", marginTop: 1 }}>
                    Free sign up via our partner link
                  </div>
                </div>
                <IconChevronRight size={18} color="#C7D0DC" />
              </button>
            </Card>

            <SectionHeader>Fees</SectionHeader>
            <Card>
              <InfoRow label="DSM platform fee" value="1% per transaction" divider />
              <InfoRow
                label="Card processing"
                value="Square's standard rate (~1.75%)"
                divider
              />
              <InfoRow label="Payout speed" value="Instant to your bank" divider />
              <InfoRow label="Without Square" value="Up to 2 days via EveryDriver" />
            </Card>

            {/* Amber warning */}
            <div
              style={{
                marginTop: 16,
                display: "flex",
                gap: 10,
                alignItems: "flex-start",
                background: "#FEF3C7",
                border: "1px solid #FDE68A",
                borderRadius: 14,
                padding: 14,
              }}
            >
              <IconAlertTriangle
                size={18}
                color="#D97706"
                style={{ flexShrink: 0, marginTop: 1 }}
              />
              <div style={{ fontSize: 12.5, color: "#92400E", lineHeight: 1.5 }}>
                Without Square, card payments take up to <strong>2 days</strong>{" "}
                to reach you via EveryDriver. Connect Square for instant payouts.
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
