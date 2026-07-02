import { createFileRoute, useNavigate, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  BookOpen,
  Mail,
  MessageSquare,
  Phone,
  User as UserIcon,
} from "lucide-react";
import { supabase } from "../lib/supabaseClient";

export const Route = createFileRoute("/bookings/$id")({
  head: () => ({
    meta: [{ title: "Booking details — DSM by EveryDriver" }],
  }),
  component: BookingDetailPage,
  errorComponent: ({ error }) => (
    <div style={{ padding: 24, fontFamily: "Inter, sans-serif" }}>
      <p>Failed to load booking.</p>
      <p style={{ color: "#6B7280", fontSize: 13 }}>{error.message}</p>
    </div>
  ),
  notFoundComponent: () => (
    <div style={{ padding: 24, fontFamily: "Inter, sans-serif" }}>Booking not found.</div>
  ),
});

const POPPINS = { fontFamily: "Inter, sans-serif" } as const;

interface Course {
  name: string | null;
  course_type: string | null;
  total_hours: number | null;
  price: number | null;
  deposit_amount: number | null;
  start_date: string | null;
}

interface Booking {
  id: string;
  status: string | null;
  pupil_name: string | null;
  pupil_email: string | null;
  pupil_phone: string | null;
  pupil_address: string | null;
  pupil_postcode: string | null;
  amount_paid: number | null;
  instructor_courses: Course | null;
}

function formatDate(d: string | null) {
  if (!d) return "—";
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return d;
  const dd = String(dt.getDate()).padStart(2, "0");
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${dt.getFullYear()}`;
}

function money(n: number | null | undefined) {
  const v = typeof n === "number" ? n : 0;
  return `£${v.toFixed(2)}`;
}

function statusBadge(status: string | null) {
  const s = (status || "").toLowerCase();
  if (s === "confirmed" || s === "paid")
    return { label: "Confirmed", bg: "#E8F6EE", color: "#1B7F3A" };
  if (s === "cancelled" || s === "canceled")
    return { label: "Cancelled", bg: "#FDE7E7", color: "#B42318" };
  return { label: "Pending", bg: "#EEF2F7", color: "#0B1F3A" };
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        background: "#fff",
        border: "0.5px solid #EEF2F7",
        borderRadius: 12,
        padding: 16,
        marginLeft: 16,
        marginRight: 16,
        marginTop: 12,
        ...POPPINS,
      }}
    >
      {children}
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "6px 0" }}>
      <span style={{ color: "#6B7280", fontSize: 13 }}>{label}</span>
      <span style={{ color: "#0B1F3A", fontSize: 14, fontWeight: 500, textAlign: "right" }}>
        {value || "—"}
      </span>
    </div>
  );
}

function BookingDetailPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const router = useRouter();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("course_bookings")
        .select(
          "*, instructor_courses(name, course_type, total_hours, price, deposit_amount, start_date)",
        )
        .eq("id", id)
        .maybeSingle();
      if (cancelled) return;
      if (error) setError(error.message);
      setBooking((data as unknown as Booking) ?? null);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const goPupil = async () => {
    const email = booking?.pupil_email?.trim();
    if (email) {
      const { data } = await supabase
        .from("pupils")
        .select("id")
        .eq("email", email)
        .maybeSingle();
      if (data?.id) {
        navigate({ to: "/pupils/$id", params: { id: data.id as string } });
        return;
      }
    }
    navigate({ to: "/pupils" });
  };

  const course = booking?.instructor_courses ?? null;
  const price = course?.price ?? 0;
  const paid = booking?.amount_paid ?? 0;
  const balance = Math.max(0, (price ?? 0) - (paid ?? 0));
  const badge = statusBadge(booking?.status ?? null);

  return (
    <div style={{ minHeight: "100vh", background: "#fff", ...POPPINS }}>
      {/* Top bar */}
      <div
        style={{
          background: "#0B1F3A",
          color: "#fff",
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "14px 16px",
        }}
      >
        <button
          onClick={() => router.history.back()}
          aria-label="Back"
          style={{ background: "transparent", border: 0, color: "#fff", cursor: "pointer" }}
        >
          <ArrowLeft size={22} />
        </button>
        <h1 style={{ fontSize: 17, fontWeight: 600, margin: 0 }}>Booking details</h1>
      </div>

      {loading ? (
        <div style={{ padding: 24, color: "#6B7280" }}>Loading…</div>
      ) : error ? (
        <div style={{ padding: 24, color: "#B42318" }}>{error}</div>
      ) : !booking ? (
        <div style={{ padding: 24, color: "#6B7280" }}>Booking not found.</div>
      ) : (
        <>
          {/* Reference */}
          <div style={{ textAlign: "center", padding: 24 }}>
            <div style={{ fontSize: 26, fontWeight: 700, color: "#0B1F3A", letterSpacing: 0.5 }}>
              ED-{booking.id.slice(0, 6).toUpperCase()}
            </div>
            <div style={{ marginTop: 10 }}>
              <span
                style={{
                  display: "inline-block",
                  padding: "4px 12px",
                  borderRadius: 999,
                  fontSize: 12,
                  fontWeight: 600,
                  background: badge.bg,
                  color: badge.color,
                }}
              >
                {badge.label}
              </span>
            </div>
          </div>

          {/* Pupil details */}
          <Card>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <UserIcon size={18} color="#0B1F3A" />
              <h2 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: "#0B1F3A" }}>
                Pupil details
              </h2>
            </div>
            <Row label="Name" value={booking.pupil_name} />
            <Row label="Email" value={booking.pupil_email} />
            <Row label="Phone" value={booking.pupil_phone} />
            <Row
              label="Address"
              value={
                [booking.pupil_address, booking.pupil_postcode]
                  .filter(Boolean)
                  .join(", ") || "—"
              }
            />
            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <a
                href={booking.pupil_phone ? `tel:${booking.pupil_phone}` : undefined}
                style={{
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                  padding: "10px 12px",
                  border: "1px solid #EEF2F7",
                  borderRadius: 10,
                  color: "#0B1F3A",
                  fontSize: 13,
                  fontWeight: 500,
                  textDecoration: "none",
                  opacity: booking.pupil_phone ? 1 : 0.5,
                  pointerEvents: booking.pupil_phone ? "auto" : "none",
                }}
              >
                <Phone size={15} /> Call
              </a>
              <a
                href={booking.pupil_email ? `mailto:${booking.pupil_email}` : undefined}
                style={{
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                  padding: "10px 12px",
                  border: "1px solid #EEF2F7",
                  borderRadius: 10,
                  color: "#0B1F3A",
                  fontSize: 13,
                  fontWeight: 500,
                  textDecoration: "none",
                  opacity: booking.pupil_email ? 1 : 0.5,
                  pointerEvents: booking.pupil_email ? "auto" : "none",
                }}
              >
                <Mail size={15} /> Email
              </a>
              <a
                href={booking.pupil_phone ? `sms:${booking.pupil_phone}` : undefined}
                style={{
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                  padding: "10px 12px",
                  border: "1px solid #EEF2F7",
                  borderRadius: 10,
                  color: "#0B1F3A",
                  fontSize: 13,
                  fontWeight: 500,
                  textDecoration: "none",
                  opacity: booking.pupil_phone ? 1 : 0.5,
                  pointerEvents: booking.pupil_phone ? "auto" : "none",
                }}
              >
                <MessageSquare size={15} /> Text
              </a>
            </div>
          </Card>

          {/* Course details */}
          <Card>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <BookOpen size={18} color="#0B1F3A" />
              <h2 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: "#0B1F3A" }}>
                Course details
              </h2>
            </div>
            <Row label="Course" value={course?.name} />
            <Row label="Type" value={course?.course_type} />
            <Row label="Hours" value={course?.total_hours ?? "—"} />
            <Row label="Start date" value={formatDate(course?.start_date ?? null)} />
            <Row label="Total price" value={money(price)} />
            <Row
              label="Deposit paid"
              value={<span style={{ color: "#1B7F3A" }}>{money(paid)}</span>}
            />
            {balance > 0 ? (
              <Row
                label="Balance due"
                value={<span style={{ color: "#B42318" }}>{money(balance)}</span>}
              />
            ) : null}
          </Card>

          {/* Actions */}
          <div style={{ padding: 16, marginTop: 12, display: "flex", flexDirection: "column", gap: 10 }}>
            <button
              onClick={goPupil}
              style={{
                background: "#0B1F3A",
                color: "#fff",
                border: 0,
                borderRadius: 10,
                padding: "12px 14px",
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
                ...POPPINS,
              }}
            >
              View pupil in DSM →
            </button>
            <button
              onClick={() => navigate({ to: "/schedule" })}
              style={{
                background: "transparent",
                color: "#0B1F3A",
                border: "1px solid #EEF2F7",
                borderRadius: 10,
                padding: "12px 14px",
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
                ...POPPINS,
              }}
            >
              View in schedule →
            </button>
          </div>
        </>
      )}
    </div>
  );
}
