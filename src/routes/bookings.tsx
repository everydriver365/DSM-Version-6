import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { toast } from "sonner";
import InstructorTopBar from "@/components/dsm/InstructorTopBar";
import { EmptyState } from "@/components/dsm/EmptyState";
import { PageLoader } from "@/components/dsm/LoadingSpinner";
import { BottomSheet } from "@/components/dsm/BottomSheetV2";
import {
  IconCalendar,
  IconChevronRight,
  IconCheck,
  IconUserPlus,
  IconPhone,
  IconX,
} from "@tabler/icons-react";

export const Route = createFileRoute("/bookings")({
  head: () => ({
    meta: [
      { title: "Bookings — DSM by EveryDriver" },
      {
        name: "description",
        content: "Course bookings taken through your driving school mini-site.",
      },
      { property: "og:title", content: "Bookings — DSM by EveryDriver" },
      {
        property: "og:description",
        content: "Course bookings taken through your driving school mini-site.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  validateSearch: (search: Record<string, unknown>): { selected?: string } => ({
    selected: typeof search.selected === "string" ? search.selected : undefined,
  }),
  component: BookingsPage,
});


const POPPINS = { fontFamily: "Poppins, sans-serif" } as const;

interface Booking {
  id: string;
  course_id: string | null;
  pupil_first_name: string | null;
  pupil_last_name: string | null;
  pupil_name: string | null;
  pupil_phone: string | null;
  pupil_email: string | null;
  pupil_address: string | null;
  pickup_address: string | null;
  special_needs: string | null;
  status: string | null;
  amount_paid: number | null;
  booked_at: string | null;
  deleted_at: string | null;
  course?: {
    name: string | null;
    course_type: string | null;
    total_hours: number | null;
    price: number | null;
  };
}

function pupilName(b: Booking) {
  return b.pupil_first_name
    ? `${b.pupil_first_name} ${b.pupil_last_name ?? ""}`.trim()
    : b.pupil_name ?? "Unknown";
}

function statusColour(status: string) {
  switch (status) {
    case "confirmed":
      return "#15803D";
    case "pending_payment":
      return "#F59E0B";
    case "cancelled":
      return "#CC2229";
    default:
      return "#6B7686";
  }
}

function statusLabel(status: string) {
  switch (status) {
    case "confirmed":
      return "Confirmed";
    case "pending_payment":
      return "Awaiting payment";
    case "cancelled":
      return "Cancelled";
    default:
      return status;
  }
}

function timeAgo(iso: string | null) {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function money(n: number | null | undefined) {
  const v = typeof n === "number" ? n : 0;
  return `£${v.toFixed(2)}`;
}

function BookingsPage() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const [userId, setUserId] = useState<string | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    if (search.selected) {
      setSelectedId(search.selected);
    }
  }, [search.selected]);

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
        .from("course_bookings")
        .select(
          "*, course:instructor_courses(name, course_type, total_hours, price)",
        )
        .eq("instructor_id", user.id)
        .is("deleted_at", null)
        .order("booked_at", { ascending: false });

      setBookings((data as unknown as Booking[]) ?? []);
      setLoading(false);
    })();
  }, []);


  async function confirmBooking(booking: Booking) {
    await supabase.from("course_bookings").update({ status: "confirmed" }).eq("id", booking.id);
    setBookings((prev) =>
      prev.map((b) => (b.id === booking.id ? { ...b, status: "confirmed" } : b)),
    );
    toast.success("Booking confirmed");
  }

  async function cancelBooking(booking: Booking) {
    await supabase.from("course_bookings").update({ status: "cancelled" }).eq("id", booking.id);
    setBookings((prev) =>
      prev.map((b) => (b.id === booking.id ? { ...b, status: "cancelled" } : b)),
    );
    toast.success("Booking cancelled");
  }

  async function convertToPupil(booking: Booking) {
    if (!userId) return;
    try {
      const { data: newPupil, error } = await supabase
        .from("pupils")
        .insert({
          instructor_id: userId,
          name: pupilName(booking),
          phone: booking.pupil_phone,
          email: booking.pupil_email,
          address: booking.pupil_address || booking.pickup_address,
          notes: [
            booking.course?.name ? `Course: ${booking.course.name}` : null,
            booking.special_needs ? `Notes: ${booking.special_needs}` : null,
          ]
            .filter(Boolean)
            .join("\n"),
          status: "active",
        })
        .select("id")
        .single();

      if (error) throw error;
      toast.success("Pupil record created");
      if (newPupil?.id) {
        navigate({
          to: "/pupils/$id" as never,
          params: { id: newPupil.id } as never,
        });
      }
    } catch (e: any) {
      toast.error(e.message ?? "Failed");
    }
  }

  const pending = bookings.filter((b) => b.status === "pending_payment");
  const confirmed = bookings.filter((b) => b.status === "confirmed");
  const cancelled = bookings.filter((b) => b.status === "cancelled");

  const totalReceived = bookings.reduce(
    (sum, b) => sum + (typeof b.amount_paid === "number" ? b.amount_paid : 0),
    0,
  );

  const selectedBooking = selectedId ? bookings.find((b) => b.id === selectedId) : null;

  return (
    <div style={{ minHeight: "100vh", background: "#F6F8FB", ...POPPINS }}>
      <InstructorTopBar
        firstName=""
        pageTitle="Bookings"
        onBack={() => navigate({ to: "/home" as never })}
        onBell={() => navigate({ to: "/notifications" as never })}
        onPhone={() => navigate({ to: "/enquiries" as never })}
        onLiveTrack={() => navigate({ to: "/live" as never })}
        onMenu={() => window.dispatchEvent(new Event("dsm-open-menu"))}
        onMicPress={() => toast.info("Voice commands coming soon!")}
      />
      <div style={{ height: "calc(60px + env(safe-area-inset-top, 0px))" }} />

      {loading ? (
        <PageLoader />
      ) : (
        <div style={{ padding: "16px 16px 40px" }}>
          {/* Summary */}
          <div
            style={{
              background: "#fff",
              borderRadius: 20,
              padding: 16,
              boxShadow: "0 4px 0 #E4E4E8, 0 12px 28px rgba(0,0,0,0.06)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 16,
            }}
          >
            <div>
              <div style={{ fontSize: 12.5, color: "#8A8A8E", fontWeight: 500 }}>Total received</div>
              <div style={{ fontSize: 28, fontWeight: 900, color: "#000", letterSpacing: "-0.5px" }}>
                {money(totalReceived)}
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 12.5, color: "#8A8A8E", fontWeight: 500 }}>Bookings</div>
              <div style={{ fontSize: 28, fontWeight: 900, color: "#000" }}>{bookings.length}</div>
            </div>
          </div>

          {bookings.length === 0 ? (
            <EmptyState
              icon={<IconCalendar size={32} color="#9CA3AF" stroke={1.5} />}
              title="No bookings yet"
              subtitle="Bookings from your mini-site will appear here"
            />
          ) : (
            <>
              {pending.length > 0 && <Section label="Awaiting payment" items={pending} onSelect={setSelectedId} />}
              {confirmed.length > 0 && <Section label="Confirmed" items={confirmed} onSelect={setSelectedId} />}
              {cancelled.length > 0 && <Section label="Cancelled" items={cancelled} onSelect={setSelectedId} />}
            </>
          )}
        </div>
      )}

      {/* Detail sheet */}
      {selectedBooking && (
        <BottomSheet
          title={pupilName(selectedBooking)}
          subtitle={selectedBooking.course?.name ?? "Course booking"}
          onClose={() => {
            setSelectedId(null);
            navigate({ to: "/bookings", search: {} });
          }}

        >

          <div style={{ display: "flex", flexDirection: "column", gap: 12, paddingBottom: 20 }}>
            {/* Status pill */}
            <div
              style={{
                alignSelf: "flex-start",
                padding: "6px 12px",
                borderRadius: 20,
                fontSize: 12,
                fontWeight: 700,
                background: `${statusColour(selectedBooking.status ?? "")}15`,
                color: statusColour(selectedBooking.status ?? ""),
              }}
            >
              {statusLabel(selectedBooking.status ?? "")}
            </div>

            {/* Pupil details */}
            <GroupedCard>
              <DetailRow label="Name" value={pupilName(selectedBooking)} />
              {selectedBooking.pupil_phone && <DetailRow label="Phone" value={selectedBooking.pupil_phone} href={`tel:${selectedBooking.pupil_phone}`} />}
              {selectedBooking.pupil_email && <DetailRow label="Email" value={selectedBooking.pupil_email} href={`mailto:${selectedBooking.pupil_email}`} />}
              {selectedBooking.pickup_address && <DetailRow label="Pickup" value={selectedBooking.pickup_address} />}
              {selectedBooking.special_needs && <DetailRow label="Notes" value={selectedBooking.special_needs} />}
            </GroupedCard>

            {/* Course details */}
            <GroupedCard>
              <DetailRow label="Course" value={selectedBooking.course?.name ?? "—"} />
              <DetailRow label="Type" value={selectedBooking.course?.course_type ?? "—"} />
              <DetailRow
                label="Hours"
                value={selectedBooking.course?.total_hours != null ? `${selectedBooking.course.total_hours} hrs` : "—"}
              />
              <DetailRow label="Price" value={money(selectedBooking.course?.price)} />
              <DetailRow label="Amount paid" value={money(selectedBooking.amount_paid)} />
              <DetailRow
                label="Booked"
                value={
                  selectedBooking.booked_at
                    ? new Date(selectedBooking.booked_at).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })
                    : "—"
                }
              />
            </GroupedCard>

            {/* Actions */}
            <GroupedCard>
              {selectedBooking.status === "pending_payment" && (
                <ActionRow
                  icon={<IconCheck size={20} color="#1877D6" />}
                  label="Confirm booking"
                  description="Mark as confirmed manually"
                  onClick={() => confirmBooking(selectedBooking)}
                />
              )}
              <ActionRow
                icon={<IconUserPlus size={20} color="#1877D6" />}
                label="Create pupil record"
                description="Add to your pupils list in DSM"
                onClick={() => convertToPupil(selectedBooking)}
              />
              {selectedBooking.pupil_phone && (
                <ActionRow
                  icon={<IconPhone size={20} color="#1877D6" />}
                  label="Call pupil"
                  description={selectedBooking.pupil_phone}
                  onClick={() => (window.location.href = `tel:${selectedBooking.pupil_phone}`)}
                />
              )}
              {selectedBooking.status !== "cancelled" && (
                <ActionRow
                  icon={<IconX size={20} color="#CC2229" />}
                  label="Cancel booking"
                  description="Cannot be undone"
                  onClick={() => cancelBooking(selectedBooking)}
                  destructive
                />
              )}
            </GroupedCard>
          </div>
        </BottomSheet>
      )}
    </div>
  );
}

function SectionHeader({ label }: { label: string }) {
  return (
    <div className="mt-6 mb-2 flex items-center gap-2">
      <span
        aria-hidden
        style={{
          display: "inline-block",
          width: 3,
          height: 12,
          borderRadius: 2,
          backgroundColor: "#1877D6",
        }}
      />
      <span
        className="text-[11px] font-semibold uppercase"
        style={{
          letterSpacing: "0.12em",
          color: "#1877D6",
          fontFamily: "Poppins, sans-serif",
        }}
      >
        {label}
      </span>
    </div>
  );
}

function GroupedCard({ children }: { children: React.ReactNode }) {
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

function DetailRow({ label, value, href }: { label: string; value: string; href?: string }) {
  const content = (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 12,
        padding: "13px 16px",
        borderBottom: "1px solid #E4E8EF",
      }}
    >
      <span style={{ fontSize: 13, color: "#6B7686", fontWeight: 500 }}>{label}</span>
      <span
        style={{
          fontSize: 14,
          color: "#0B1F3A",
          fontWeight: 600,
          textAlign: "right",
          flex: 1,
          minWidth: 0,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {value || "—"}
      </span>
    </div>
  );
  return href ? (
    <a href={href} style={{ textDecoration: "none", display: "block" }} onClick={(e) => e.stopPropagation()}>
      {content}
    </a>
  ) : (
    content
  );
}

function ActionRow({
  icon,
  label,
  description,
  onClick,
  destructive,
}: {
  icon: React.ReactNode;
  label: string;
  description: string;
  onClick: () => void;
  destructive?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        width: "100%",
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "13px 16px",
        background: "transparent",
        border: "none",
        borderBottom: "1px solid #E4E8EF",
        cursor: "pointer",
        textAlign: "left",
        ...POPPINS,
      }}
    >
      <div style={{ flexShrink: 0 }}>{icon}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: destructive ? "#CC2229" : "#0B1F3A" }}>{label}</div>
        <div style={{ fontSize: 12, color: "#6B7686", marginTop: 2 }}>{description}</div>
      </div>
      <IconChevronRight size={18} color="#C7CDD6" />
    </button>
  );
}

function Section({
  label,
  items,
  onSelect,
}: {
  label: string;
  items: Booking[];
  onSelect: (id: string) => void;
}) {
  return (
    <div>
      <SectionHeader label={label} />
      <GroupedCard>
        {items.map((booking, i) => (
          <button
            key={booking.id}
            type="button"
            onClick={() => onSelect(booking.id)}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "13px 16px",
              background: "transparent",
              border: "none",
              borderBottom: i < items.length - 1 ? "1px solid #E4E8EF" : "none",
              cursor: "pointer",
              textAlign: "left",
            }}
          >
            {/* Status dot */}
            <div
              style={{
                width: 10,
                height: 10,
                borderRadius: "50%",
                backgroundColor: statusColour(booking.status ?? ""),
                flexShrink: 0,
              }}
            />

            {/* Content */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: 15,
                  fontWeight: 700,
                  color: "#0B1F3A",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {pupilName(booking)}
              </div>
              <div style={{ fontSize: 12.5, color: "#6B7686", marginTop: 2 }}>
                {booking.course?.name ?? "Course"} · {timeAgo(booking.booked_at)}
              </div>
            </div>

            {/* Amount */}
            {booking.amount_paid != null && booking.amount_paid > 0 && (
              <div style={{ fontSize: 14, fontWeight: 700, color: "#0B1F3A", flexShrink: 0 }}>
                {money(booking.amount_paid)}
              </div>
            )}

            <IconChevronRight size={18} color="#C7CDD6" />
          </button>
        ))}
      </GroupedCard>
    </div>
  );
}
