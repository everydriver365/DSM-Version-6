import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Search, X, Receipt } from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { PageLayout } from "@/components/PageLayout";
import { BottomSheet } from "@/components/dsm/BottomSheetV2";

export const Route = createFileRoute("/invoices")({
  head: () => ({
    meta: [
      { title: "Invoices — DSM by EveryDriver" },
      { name: "description", content: "View and search your invoiced lesson history." },
    ],
  }),
  component: InvoicesPage,
});

const POPPINS = { fontFamily: "Inter, sans-serif" } as const;
const NAVY = "#0B1F3A";
const GREEN = "#16A34A";
const RED = "#CC2229";
const AMBER = "#B45309";

interface HistoryRow {
  id: string;
  pupil_id: string;
  lesson_cost: number | null;
  created_at: string;
  payment_method: string | null;
  payment_status: string | null;
  notes: string | null;
  pupils: { name: string } | null;
}

function formatGBP(amount: number | null | undefined) {
  return `£${Math.abs(Number(amount ?? 0)).toFixed(2)}`;
}

function dateLabel(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" }).replace(/,/g, "");
}

function timeLabel(iso: string) {
  return new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

function statusBadge(status: string | null) {
  const s = (status ?? "").toLowerCase();
  if (s === "paid") {
    return { text: "Paid", color: GREEN, bg: "#E7F5EE" };
  }
  if (s === "refund") {
    return { text: "Refund", color: RED, bg: "#FEE9E9" };
  }
  return { text: "Pending", color: AMBER, bg: "#FEF3E2" };
}

function methodLabel(m: string | null | undefined) {
  if (!m) return "—";
  const map: Record<string, string> = {
    cash: "Cash",
    card: "Card",
    qr: "QR",
    bank_transfer: "Bank transfer",
    klarna: "Klarna",
    clearpay: "Clearpay",
    refund: "Refund",
  };
  return map[m] ?? m.charAt(0).toUpperCase() + m.slice(1);
}

function InvoicesPage() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryRow[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      setUserId(data.user?.id ?? null);
    })();
  }, []);

  async function fetchHistory() {
    if (!userId) return;
    const { data, error } = await supabase
      .from("lesson_history")
      .select("id, pupil_id, lesson_cost, created_at, payment_method, payment_status, notes, pupils(name)")
      .eq("instructor_id", userId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Failed to fetch invoices", error);
    }
    setHistory((data as unknown as HistoryRow[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    if (userId) fetchHistory();
  }, [userId]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (history ?? []).filter((r) => {
      if (!q) return true;
      const name = r.pupils?.name ?? "";
      return name.toLowerCase().includes(q);
    });
  }, [history, search]);

  const monthTotal = useMemo(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    return (history ?? []).reduce((sum, r) => {
      const t = new Date(r.created_at).getTime();
      return t >= start ? sum + Number(r.lesson_cost ?? 0) : sum;
    }, 0);
  }, [history]);

  const selectedRow = useMemo(() => filtered.find((r) => r.id === selectedId) ?? null, [filtered, selectedId]);

  return (
    <PageLayout className="pb-24 pb-safe relative" style={POPPINS}>
      {/* Header */}
      <div className="sticky top-0 z-40" style={{ backgroundColor: NAVY }}>
        <div className="flex items-center justify-between px-3" style={{ height: 52 }}>
          <button type="button" aria-label="Back" onClick={() => navigate({ to: "/home" })} className="flex items-center justify-center" style={{ width: 36, height: 36 }}>
            <ArrowLeft size={22} color="#fff" />
          </button>
          <div className="text-[16px] font-semibold text-white" style={POPPINS}>Invoices</div>
          <div style={{ width: 36 }} />
        </div>
      </div>

      {/* Summary */}
      <div style={{ background: "white", borderRadius: 14, boxShadow: "0 1px 3px rgba(0,0,0,0.06)", padding: 16, margin: 16 }}>
        <div style={{ fontSize: 12, color: "#6B7280", fontWeight: 600, letterSpacing: "0.05em" }}>INVOICED THIS MONTH</div>
        <div style={{ fontSize: 28, fontWeight: 700, color: NAVY, marginTop: 4 }}>{formatGBP(monthTotal)}</div>
        <div style={{ fontSize: 12, color: "#9CA3AF", marginTop: 2 }}>{filtered.length} record{filtered.length === 1 ? "" : "s"}</div>
      </div>

      {/* Search */}
      <div style={{ margin: "0 16px 12px" }}>
        <div style={{ background: "white", borderRadius: 12, padding: "10px 12px", boxShadow: "0 1px 3px rgba(0,0,0,0.06)", display: "flex", alignItems: "center", gap: 8 }}>
          <Search size={16} color="#9CA3AF" />
          <input
            type="text"
            placeholder="Search by pupil name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ flex: 1, border: "none", outline: "none", fontSize: 14, color: "#0B1F3A", background: "transparent", ...POPPINS }}
          />
          {search && (
            <button type="button" onClick={() => setSearch("")} style={{ background: "none", border: "none", padding: 0, cursor: "pointer" }} aria-label="Clear search">
              <X size={16} color="#9CA3AF" />
            </button>
          )}
        </div>
      </div>

      {/* List */}
      <div style={{ padding: "0 16px" }}>
        {loading ? (
          <div style={{ textAlign: "center", padding: 40, color: "#9CA3AF", fontSize: 13 }}>Loading…</div>
        ) : filtered.length === 0 ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "48px 24px", gap: 8 }}>
            <Receipt size={40} color="#D0D5DD" />
            <div style={{ fontSize: 14, color: "#6B7280" }}>No invoices found</div>
            <div style={{ fontSize: 12, color: "#9CA3AF" }}>{search ? "Try a different search" : "Invoice records will appear here"}</div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {filtered.map((row) => {
              const status = statusBadge(row.payment_status);
              return (
                <button
                  key={row.id}
                  type="button"
                  onClick={() => setSelectedId(row.id)}
                  style={{
                    background: "white",
                    borderRadius: 12,
                    boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
                    padding: 14,
                    border: "none",
                    textAlign: "left",
                    cursor: "pointer",
                    width: "100%",
                    ...POPPINS,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: NAVY, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {row.pupils?.name ?? "Unknown pupil"}
                      </div>
                      <div style={{ fontSize: 12, color: "#6B7280", marginTop: 2 }}>
                        {dateLabel(row.created_at)} · {timeLabel(row.created_at)}
                      </div>
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <div style={{ fontSize: 15, fontWeight: 700, color: NAVY }}>{formatGBP(row.lesson_cost)}</div>
                      <div style={{ fontSize: 11, fontWeight: 600, color: "#6B7280", marginTop: 2 }}>{methodLabel(row.payment_method)}</div>
                    </div>
                  </div>
                  <div style={{ marginTop: 8 }}>
                    <span
                      style={{
                        display: "inline-block",
                        fontSize: 11,
                        fontWeight: 700,
                        padding: "3px 9px",
                        borderRadius: 999,
                        color: status.color,
                        background: status.bg,
                      }}
                    >
                      {status.text}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Detail sheet */}
      {selectedRow && (
        <BottomSheet title="Invoice details" onClose={() => setSelectedId(null)}>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <div style={{ fontSize: 12, color: "#6B7280", fontWeight: 600, letterSpacing: "0.05em" }}>PUPIL</div>
              <div style={{ fontSize: 16, fontWeight: 600, color: NAVY, marginTop: 2 }}>{selectedRow.pupils?.name ?? "Unknown pupil"}</div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: "#6B7280", fontWeight: 600, letterSpacing: "0.05em" }}>DATE</div>
              <div style={{ fontSize: 16, fontWeight: 600, color: NAVY, marginTop: 2 }}>{dateLabel(selectedRow.created_at)}</div>
              <div style={{ fontSize: 13, color: "#6B7280", marginTop: 1 }}>{timeLabel(selectedRow.created_at)}</div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: "#6B7280", fontWeight: 600, letterSpacing: "0.05em" }}>AMOUNT</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: NAVY, marginTop: 2 }}>{formatGBP(selectedRow.lesson_cost)}</div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: "#6B7280", fontWeight: 600, letterSpacing: "0.05em" }}>METHOD</div>
              <div style={{ fontSize: 16, fontWeight: 600, color: NAVY, marginTop: 2 }}>{methodLabel(selectedRow.payment_method)}</div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: "#6B7280", fontWeight: 600, letterSpacing: "0.05em" }}>STATUS</div>
              <div style={{ marginTop: 4 }}>
                <span
                  style={{
                    display: "inline-block",
                    fontSize: 12,
                    fontWeight: 700,
                    padding: "4px 10px",
                    borderRadius: 999,
                    color: statusBadge(selectedRow.payment_status).color,
                    background: statusBadge(selectedRow.payment_status).bg,
                  }}
                >
                  {statusBadge(selectedRow.payment_status).text}
                </span>
              </div>
            </div>
            {selectedRow.notes && (
              <div>
                <div style={{ fontSize: 12, color: "#6B7280", fontWeight: 600, letterSpacing: "0.05em" }}>NOTES</div>
                <div style={{ fontSize: 14, color: "#374151", marginTop: 2, lineHeight: 1.4, whiteSpace: "pre-wrap" }}>{selectedRow.notes}</div>
              </div>
            )}
          </div>
        </BottomSheet>
      )}
    </PageLayout>
  );
}
