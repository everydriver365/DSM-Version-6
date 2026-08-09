import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { IconChevronRight, IconSearch } from "@tabler/icons-react";
import { PageHeader } from "@/components/dsm/PageHeader";
import { PageLoader } from "@/components/dsm/LoadingSpinner";
import { supabase } from "../lib/supabaseClient";

export const Route = createFileRoute("/bookings/")({
  head: () => ({
    meta: [
      { title: "All bookings — DSM by EveryDriver" },
      {
        name: "description",
        content:
          "View every course booking taken through your driving school, with pupil details, status and balance.",
      },
      { property: "og:title", content: "All bookings — DSM by EveryDriver" },
      {
        property: "og:description",
        content:
          "View every course booking taken through your driving school, with pupil details, status and balance.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: BookingsListPage,
});

const POPPINS = { fontFamily: "Poppins, sans-serif" } as const;

interface BookingRow {
  id: string;
  status: string | null;
  pupil_name: string | null;
  pupil_email: string | null;
  amount_paid: number | null;
  booked_at: string | null;
  instructor_courses: {
    name: string | null;
    price: number | null;
    course_type: string | null;
    total_hours: number | null;
    pickup_area: string | null;
  } | null;
}

function money(n: number | null | undefined) {
  const v = typeof n === "number" ? n : 0;
  return `£${v.toFixed(2)}`;
}

function fmtDate(d: string | null) {
  if (!d) return "—";
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return d;
  return dt.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function statusBadge(status: string | null) {
  const s = (status || "").toLowerCase();
  if (s === "confirmed" || s === "paid") return { label: "Confirmed", bg: "#E6F7EC", color: "#248A3D" };
  if (s === "cancelled" || s === "canceled") return { label: "Cancelled", bg: "#FDEDEC", color: "#FF3B30" };
  return { label: "Pending", bg: "#FFF6DC", color: "#B8860B" };
}

const FILTERS = [
  { key: "all", label: "All" },
  { key: "confirmed", label: "Confirmed" },
  { key: "pending", label: "Pending" },
  { key: "cancelled", label: "Cancelled" },
] as const;

function BookingsListPage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<BookingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["key"]>("all");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data: auth } = await supabase.auth.getUser();
      const userId = auth?.user?.id;
      if (!userId) {
        if (!cancelled) {
          setRows([]);
          setLoading(false);
        }
        return;
      }
      const { data, error } = await supabase
        .from("course_bookings")
        .select(
          "id, status, pupil_name, pupil_email, amount_paid, booked_at, instructor_courses(name, price, course_type, total_hours, pickup_area)",
        )
        .eq("instructor_id", userId)
        .order("booked_at", { ascending: false });
      if (cancelled) return;
      if (error) setError(error.message);
      setRows((data as unknown as BookingRow[]) ?? []);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      const s = (r.status || "").toLowerCase();
      if (filter === "confirmed" && !(s === "confirmed" || s === "paid")) return false;
      if (filter === "cancelled" && !(s === "cancelled" || s === "canceled")) return false;
      if (filter === "pending" && (s === "confirmed" || s === "paid" || s === "cancelled" || s === "canceled"))
        return false;
      if (!q) return true;
      return (
        (r.pupil_name || "").toLowerCase().includes(q) ||
        (r.pupil_email || "").toLowerCase().includes(q) ||
        (r.instructor_courses?.name || "").toLowerCase().includes(q)
      );
    });
  }, [rows, search, filter]);

  const totalPaid = useMemo(
    () => rows.reduce((sum, r) => sum + (typeof r.amount_paid === "number" ? r.amount_paid : 0), 0),
    [rows],
  );

  return (
    <div style={{ minHeight: "100vh", background: "#F6F8FB", ...POPPINS }}>
      <PageHeader
        title="All bookings"
        backTo="/home"
        right={
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: "50%",
              background: "#1877D6",
              color: "#fff",
              fontSize: 14,
              fontWeight: 800,
              boxShadow: "0 3px 0 #0F52A8",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {rows.length}
          </div>
        }
      />

      {/* Total taken */}
      <div style={{ padding: "16px 16px 0" }}>
        <div
          style={{
            background: "#fff",
            borderRadius: 20,
            padding: 16,
            boxShadow: "0 4px 0 #E4E4E8, 0 12px 28px rgba(0,0,0,0.06)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div>
            <div style={{ fontSize: 12.5, color: "#8A8A8E", fontWeight: 500 }}>Total received</div>
            <div style={{ fontSize: 28, fontWeight: 900, color: "#000", letterSpacing: "-0.5px" }}>
              {money(totalPaid)}
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 12.5, color: "#8A8A8E", fontWeight: 500 }}>Bookings</div>
            <div style={{ fontSize: 28, fontWeight: 900, color: "#000" }}>{rows.length}</div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div style={{ padding: "14px 16px 0" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            background: "#fff",
            borderRadius: 16,
            padding: "14px 16px",
            boxShadow: "0 4px 0 #E4E4E8, 0 10px 22px rgba(0,0,0,0.06)",
          }}
        >
          <IconSearch stroke={1.5} size={17} color="#8A8A8E" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search bookings..."
            style={{
              flex: 1,
              border: "none",
              outline: "none",
              background: "transparent",
              fontSize: 14.5,
              color: "#000",
              ...POPPINS,
            }}
          />
        </div>
      </div>

      {/* Filters */}
      <div
        className="dsm-hide-scrollbar"
        style={{
          display: "flex",
          gap: 8,
          padding: "14px 16px 0",
          overflowX: "auto",
          WebkitOverflowScrolling: "touch",
          scrollbarWidth: "none",
        }}
      >
        {FILTERS.map((f) => {
          const on = filter === f.key;
          return (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              style={{
                padding: "10px 18px",
                borderRadius: 24,
                border: "none",
                fontSize: 13.5,
                fontWeight: 700,
                whiteSpace: "nowrap",
                background: on ? "#0B1F3A" : "#fff",
                color: on ? "#fff" : "#0B1F3A",
                boxShadow: on ? "0 3px 0 #050D1C" : "0 3px 0 #E4E4E8",
                ...POPPINS,
              }}
            >
              {f.label}
            </button>
          );
        })}
      </div>
      <style>{`.dsm-hide-scrollbar::-webkit-scrollbar{display:none}`}</style>


      {/* List */}
      <div style={{ padding: "16px 16px 40px" }}>
        {loading ? (
          <PageLoader />
        ) : error ? (
          <div style={{ padding: 24, color: "#B42318", fontSize: 13.5 }}>{error}</div>
        ) : filtered.length === 0 ? (
          <div
            style={{
              background: "#fff",
              borderRadius: 20,
              padding: "40px 24px",
              textAlign: "center",
              boxShadow: "0 4px 0 #E4E4E8, 0 12px 28px rgba(0,0,0,0.06)",
            }}
          >
            <div style={{ fontSize: 16, fontWeight: 800, color: "#000" }}>No bookings yet</div>
            <div style={{ fontSize: 13.5, color: "#8A8A8E", marginTop: 6 }}>
              Course bookings taken through your public page will appear here.
            </div>
          </div>
        ) : (
          <div>
            {filtered.map((b) => {
              const badge = statusBadge(b.status);
              const price = b.instructor_courses?.price ?? 0;
              const paid = b.amount_paid ?? 0;
              const balance = Math.max(0, price - paid);
              const hours = b.instructor_courses?.total_hours;
              const meta = [
                hours != null ? `${hours} hrs` : null,
                b.instructor_courses?.pickup_area || null,
              ].filter(Boolean) as string[];
              return (
                <div
                  key={b.id}
                  onClick={() => navigate({ to: "/bookings/$id", params: { id: b.id } })}
                  style={{
                    background: "#fff",
                    borderRadius: 18,
                    padding: 16,
                    marginBottom: 12,
                    cursor: "pointer",
                    boxShadow: "0 4px 0 #E4E4E8, 0 12px 26px rgba(0,0,0,0.06)",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span
                          style={{
                            fontSize: 17,
                            fontWeight: 800,
                            color: "#000",
                            letterSpacing: "-0.2px",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {b.pupil_name || "Unnamed pupil"}
                        </span>
                        <span
                          style={{
                            padding: "4px 10px",
                            borderRadius: 20,
                            fontSize: 10,
                            fontWeight: 800,
                            background: badge.bg,
                            color: badge.color,
                            flexShrink: 0,
                          }}
                        >
                          {badge.label}
                        </span>
                      </div>
                      <div
                        style={{
                          fontSize: 13.5,
                          fontWeight: 500,
                          color: "#6B6B6F",
                          marginTop: 5,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {b.instructor_courses?.name || "Course booking"}
                      </div>
                    </div>

                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <div style={{ fontSize: 18, fontWeight: 800, color: "#000" }}>{money(paid)}</div>
                      {balance > 0 ? (
                        <div style={{ fontSize: 11.5, fontWeight: 700, color: "#FF3B30", marginTop: 2 }}>
                          {money(balance)} due
                        </div>
                      ) : null}
                    </div>
                  </div>

                  <div style={{ height: 1, background: "#F0F0F2", margin: "13px 0" }} />

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                    <div
                      style={{
                        fontSize: 12.5,
                        fontWeight: 500,
                        color: "#8A8A8E",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      <span style={{ color: "#1877D6", fontWeight: 700 }}>
                        {b.instructor_courses?.course_type || "Course"}
                      </span>
                      {meta.length ? ` · ${meta.join(" · ")}` : ""}
                    </div>
                    <div style={{ fontSize: 11.5, color: "#B0B0B5", flexShrink: 0 }}>
                      {fmtDate(b.booked_at)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>
    </div>
  );
}
