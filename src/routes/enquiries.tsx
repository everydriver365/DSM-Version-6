import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { toast } from "sonner";
import { EmptyState } from "@/components/dsm/EmptyState";
import { PageLoader } from "@/components/dsm/LoadingSpinner";
import InstructorTopBar from "@/components/dsm/InstructorTopBar";
import { IconMail, IconCheck, IconX, IconInbox, IconPhone } from "@tabler/icons-react";

export const Route = createFileRoute("/enquiries")({
  head: () => ({
    meta: [
      { title: "Enquiries — DSM by EveryDriver" },
      {
        name: "description",
        content:
          "Review, accept or decline new pupil enquiries and turn them into pupil records.",
      },
      { property: "og:title", content: "Enquiries — DSM by EveryDriver" },
      {
        property: "og:description",
        content: "Review, accept or decline new pupil enquiries.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: EnquiriesPage,
});

const POPPINS = { fontFamily: "Poppins, sans-serif" } as const;

interface EnquiryRow {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  course_interest: string | null;
  transmission: string | null;
  requested_hours: number | null;
  preferred_timing: string | null;
  preferred_start_date: string | null;
  postcode: string | null;
  notes: string | null;
  status: string | null;
  created_at: string | null;
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

function EnquiriesPage() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [enquiries, setEnquiries] = useState<EnquiryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [newPupilIds, setNewPupilIds] = useState<Record<string, string>>({});

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
        .from("enquiries")
        .select("*")
        .eq("instructor_id", user.id)
        .order("created_at", { ascending: false });

      setEnquiries((data as EnquiryRow[]) ?? []);
      setLoading(false);
    })();
  }, []);

  async function acceptEnquiry(enquiry: EnquiryRow) {
    if (!userId) return;
    setBusyId(enquiry.id);
    try {
      await supabase.from("enquiries").update({ status: "accepted" }).eq("id", enquiry.id);

      const { data: newPupil } = await supabase
        .from("pupils")
        .insert({
          instructor_id: userId,
          name: enquiry.name ?? "New pupil",
          email: enquiry.email ?? null,
          phone: enquiry.phone ?? null,
          postcode: enquiry.postcode ?? null,
          notes: [
            enquiry.course_interest ? `Course: ${enquiry.course_interest}` : null,
            enquiry.transmission ? `Transmission: ${enquiry.transmission}` : null,
            enquiry.requested_hours ? `Hours: ${enquiry.requested_hours}` : null,
            enquiry.preferred_timing ? `Timing: ${enquiry.preferred_timing}` : null,
            enquiry.notes ?? null,
          ]
            .filter(Boolean)
            .join("\n"),
          status: "enquiry",
        })
        .select("id")
        .single();

      const pupilId = (newPupil as { id?: string } | null)?.id ?? null;

      if (pupilId) {
        setNewPupilIds((prev) => ({ ...prev, [enquiry.id]: pupilId }));
      }

      setEnquiries((prev) =>
        prev.map((e) => (e.id === enquiry.id ? { ...e, status: "accepted" } : e)),
      );

      toast.success(pupilId ? "Enquiry accepted — pupil created" : "Enquiry accepted");
    } catch {
      toast.error("Couldn't accept enquiry");
    } finally {
      setBusyId(null);
    }
  }

  async function declineEnquiry(enquiry: EnquiryRow) {
    setBusyId(enquiry.id);
    try {
      await supabase.from("enquiries").update({ status: "declined" }).eq("id", enquiry.id);

      setEnquiries((prev) =>
        prev.map((e) => (e.id === enquiry.id ? { ...e, status: "declined" } : e)),
      );

      toast.success("Enquiry declined");
    } catch {
      toast.error("Couldn't decline");
    } finally {
      setBusyId(null);
    }
  }

  function EnquiryCard({ enquiry, isLast }: { enquiry: EnquiryRow; isLast: boolean }) {
    const status = enquiry.status ?? "new";
    const isNew = status === "new";
    const isAccepted = status === "accepted";
    const busy = busyId === enquiry.id;

    const iconBg = isNew ? "#EFF6FF" : isAccepted ? "#DCFCE7" : "#FCE9E9";
    const iconColor = isNew ? "#1877D6" : isAccepted ? "#15803D" : "#CC2229";
    const IconComp = isNew ? IconMail : isAccepted ? IconCheck : IconX;

    return (
      <div>
        <div style={{ display: "flex", gap: 12, padding: "14px 16px" }}>
          {/* Status icon */}
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              background: iconBg,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <IconComp size={18} stroke={2} color={iconColor} />
          </div>

          {/* Content */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: 15,
                fontWeight: 700,
                color: "#0B1F3A",
                marginBottom: 2,
                ...POPPINS,
              }}
            >
              {enquiry.name ?? "Unknown"}
            </div>

            {(enquiry.course_interest || enquiry.postcode) && (
              <div style={{ fontSize: 13, color: "#4A5568", marginBottom: 2, ...POPPINS }}>
                {[enquiry.course_interest, enquiry.postcode].filter(Boolean).join(" · ")}
              </div>
            )}

            {(enquiry.transmission || enquiry.requested_hours) && (
              <div style={{ fontSize: 12, color: "#6B7280", marginBottom: 4, ...POPPINS }}>
                {[
                  enquiry.transmission,
                  enquiry.requested_hours ? `${enquiry.requested_hours} hrs` : null,
                  enquiry.preferred_timing,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </div>
            )}

            {enquiry.phone && (
              <a
                href={`tel:${enquiry.phone}`}
                style={{
                  fontSize: 12,
                  color: "#1877D6",
                  fontFamily: "Poppins, sans-serif",
                  textDecoration: "none",
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  marginBottom: 4,
                }}
              >
                <IconPhone size={13} stroke={2} color="#1877D6" />
                {enquiry.phone}
              </a>
            )}

            {enquiry.notes && (
              <div
                style={{
                  fontSize: 12,
                  color: "#6B7280",
                  fontStyle: "italic",
                  marginBottom: 4,
                  ...POPPINS,
                }}
              >
                &ldquo;{enquiry.notes}&rdquo;
              </div>
            )}

            <div style={{ fontSize: 11, color: "#9CA3AF", ...POPPINS }}>
              {timeAgo(enquiry.created_at)}
            </div>

            {isNew && (
              <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => acceptEnquiry(enquiry)}
                  style={{
                    background: "#1877D6",
                    color: "#fff",
                    border: "none",
                    borderRadius: 20,
                    padding: "6px 16px",
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: busy ? "not-allowed" : "pointer",
                    fontFamily: "Poppins, sans-serif",
                    opacity: busy ? 0.6 : 1,
                  }}
                >
                  {busy ? "..." : "Accept"}
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => declineEnquiry(enquiry)}
                  style={{
                    background: "#EEF2F7",
                    color: "#CC2229",
                    border: "none",
                    borderRadius: 20,
                    padding: "6px 16px",
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: busy ? "not-allowed" : "pointer",
                    fontFamily: "Poppins, sans-serif",
                    opacity: busy ? 0.6 : 1,
                  }}
                >
                  Decline
                </button>
              </div>
            )}

            {isAccepted && newPupilIds[enquiry.id] && (
              <button
                type="button"
                onClick={() =>
                  navigate({
                    to: "/pupils/$id" as never,
                    params: { id: newPupilIds[enquiry.id] } as never,
                  })
                }
                style={{
                  background: "#1877D6",
                  color: "#fff",
                  border: "none",
                  borderRadius: 20,
                  padding: "6px 16px",
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: "pointer",
                  fontFamily: "Poppins, sans-serif",
                  marginTop: 6,
                }}
              >
                View pupil →
              </button>
            )}
          </div>
        </div>

        {/* Hairline */}
        {!isLast && <div style={{ height: 1, background: "#EEF2F7", marginLeft: 64 }} />}
      </div>
    );
  }

  function Section({ label, items }: { label: string; items: EnquiryRow[] }) {
    if (items.length === 0) return null;
    return (
      <div style={{ marginBottom: 20 }}>
        <div
          style={{
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: "0.06em",
            color: "#6B7280",
            textTransform: "uppercase",
            padding: "0 4px 8px",
            ...POPPINS,
          }}
        >
          {label} · {items.length}
        </div>
        <div
          style={{
            background: "#fff",
            borderRadius: 16,
            boxShadow: "0 1px 2px rgba(11,31,58,0.06), 0 8px 18px rgba(11,31,58,0.04)",
            overflow: "hidden",
          }}
        >
          {items.map((e, i) => (
            <EnquiryCard key={e.id} enquiry={e} isLast={i === items.length - 1} />
          ))}
        </div>
      </div>
    );
  }

  const newItems = enquiries.filter((e) => (e.status ?? "new") === "new");
  const acceptedItems = enquiries.filter((e) => e.status === "accepted");
  const declinedItems = enquiries.filter((e) => e.status === "declined");

  return (
    <div style={{ minHeight: "100vh", background: "#F3F8FF", ...POPPINS }}>
      <InstructorTopBar
        firstName=""
        pageTitle="Enquiries"
        onBack={() => navigate({ to: "/home" })}
        onBell={() => navigate({ to: "/notifications" as never })}
        onPhone={() => navigate({ to: "/enquiries" as never })}
        onLiveTrack={() => navigate({ to: "/live" as never })}
        onMenu={() => navigate({ to: "/more" as never })}
        onMicPress={() => toast.info("Voice commands coming soon!")}
      />
      <div style={{ height: "calc(60px + env(safe-area-inset-top, 0px))" }} />

      <div style={{ padding: "16px 16px 40px" }}>
        {loading ? (
          <PageLoader />
        ) : enquiries.length === 0 ? (
          <EmptyState
            icon={<IconInbox size={32} stroke={1.5} color="#9CA3AF" />}
            title="No enquiries yet"
            subtitle="Enquiries from EveryDriver will appear here"
          />
        ) : (
          <>
            <Section label="New" items={newItems} />
            <Section label="Accepted" items={acceptedItems} />
            <Section label="Declined" items={declinedItems} />
          </>
        )}
      </div>
    </div>
  );
}
