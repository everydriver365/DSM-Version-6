import { createFileRoute, useNavigate } from "@tanstack/react-router";
import InstructorTopBar from "@/components/dsm/InstructorTopBar";
import { useEffect, useState } from "react";
import {
  IconMail,
  IconCheck,
  IconX,
  IconInbox,
  IconChevronRight,
} from "@tabler/icons-react";
import { toast } from "sonner";
import { supabase } from "../lib/supabaseClient";
import { PageLayout } from "@/components/PageLayout";
import { EmptyState } from "@/components/dsm/EmptyState";

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

interface EnquiryNotification {
  id: string;
  title: string | null;
  body: string | null;
  type: string;
  read: boolean;
  created_at: string;
  reference_id: string | null;
}

interface EnquiryRow {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  course_interest: string | null;
  transmission: string | null;
  requested_hours: number | string | null;
  preferred_timing: string | null;
  preferred_start_date: string | null;
  postcode: string | null;
  notes: string | null;
  status: string | null;
  created_at: string | null;
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function EnquiriesPage() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [items, setItems] = useState<EnquiryNotification[]>([]);
  const [enquiryById, setEnquiryById] = useState<Record<string, EnquiryRow | null>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [newPupilIds, setNewPupilIds] = useState<Record<string, string>>({});

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (mounted) setUserId(data.session?.user?.id ?? null);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted) setUserId(session?.user?.id ?? null);
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  async function load(uid: string) {
    const { data, error } = await supabase
      .from("instructor_notifications")
      .select("id, title, body, type, read, created_at, reference_id")
      .eq("instructor_id", uid)
      .eq("type", "enquiry")
      .order("created_at", { ascending: false });
    if (error) {
      console.error("[enquiries] fetch error", error);
      toast.error(`Couldn't load enquiries: ${error.message}`);
    }
    const list = (data ?? []) as EnquiryNotification[];
    setItems(list);

    const refIds = list.map((n) => n.reference_id).filter((x): x is string => !!x);
    if (refIds.length > 0) {
      const { data: rows, error: e2 } = await supabase
        .from("enquiries")
        .select("*")
        .in("id", refIds);
      if (e2) {
        console.error("[enquiries] batch enquiry fetch error", e2);
      } else {
        const map: Record<string, EnquiryRow | null> = {};
        for (const id of refIds) map[id] = null;
        for (const r of (rows ?? []) as EnquiryRow[]) map[r.id] = r;
        setEnquiryById((prev) => ({ ...prev, ...map }));
      }
    }
  }

  useEffect(() => {
    if (userId) load(userId);
  }, [userId]);

  async function acceptEnquiry(enquiry: EnquiryRow) {
    if (!userId) return;
    setBusyId(enquiry.id);
    try {
      const { error: upErr } = await supabase
        .from("enquiries")
        .update({ status: "accepted" })
        .eq("id", enquiry.id);
      if (upErr) {
        console.error("[enquiries] accept error", upErr);
        toast.error("Couldn't accept enquiry");
        return;
      }

      const { data: newPupil, error: pupilErr } = await supabase
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
            enquiry.preferred_start_date ? `Start: ${enquiry.preferred_start_date}` : null,
            enquiry.notes ?? null,
          ]
            .filter(Boolean)
            .join("\n"),
          status: "enquiry",
          created_at: new Date().toISOString(),
        })
        .select("id")
        .single();

      if (pupilErr) {
        console.warn("[enquiries] pupil create error", pupilErr);
      }

      const newPupilId = (newPupil as { id?: string } | null)?.id ?? null;
      if (newPupilId) {
        setNewPupilIds((prev) => ({ ...prev, [enquiry.id]: newPupilId }));
      }

      setEnquiryById((prev) => ({ ...prev, [enquiry.id]: { ...enquiry, status: "accepted" } }));
      toast.success(newPupilId ? "Enquiry accepted — pupil created" : "Enquiry accepted");
    } finally {
      setBusyId(null);
    }
  }

  async function declineEnquiry(enquiry: EnquiryRow) {
    setBusyId(enquiry.id);
    try {
      const { error } = await supabase
        .from("enquiries")
        .update({ status: "declined" })
        .eq("id", enquiry.id);
      if (error) {
        console.error("[enquiries] decline error", error);
        toast.error("Couldn't decline enquiry");
        return;
      }
      setEnquiryById((prev) => ({ ...prev, [enquiry.id]: { ...enquiry, status: "declined" } }));
      toast.success("Enquiry declined");
    } finally {
      setBusyId(null);
    }
  }

  function statusOf(n: EnquiryNotification): string {
    const e = n.reference_id ? enquiryById[n.reference_id] : null;
    return (e?.status ?? "new").toLowerCase();
  }

  const newItems = items.filter((n) => statusOf(n) === "new");
  const acceptedItems = items.filter((n) => statusOf(n) === "accepted");
  const declinedItems = items.filter((n) => statusOf(n) === "declined");
  const isEmpty = items.length === 0;

  function renderSection(label: string, list: EnquiryNotification[], status: string) {
    if (list.length === 0) return null;
    return (
      <div style={{ marginBottom: 20 }}>
        <div
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: "#9CA3AF",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            margin: "0 16px 8px",
          }}
        >
          {label} · {list.length}
        </div>
        <div
          style={{
            background: "#fff",
            borderRadius: 16,
            boxShadow: "0 1px 3px rgba(11,31,58,0.06)",
            overflow: "hidden",
            margin: "0 16px 4px",
          }}
        >
          {list.map((n, i) => (
            <EnquiryRowItem
              key={n.id}
              n={n}
              enquiry={n.reference_id ? enquiryById[n.reference_id] ?? null : null}
              status={status}
              first={i === 0}
              busy={
                busyId != null && n.reference_id != null && busyId === enquiryById[n.reference_id]?.id
              }
              pupilId={
                n.reference_id ? newPupilIds[enquiryById[n.reference_id]?.id ?? ""] ?? null : null
              }
              onAccept={acceptEnquiry}
              onDecline={declineEnquiry}
              onViewPupil={(id) =>
                navigate({ to: "/pupils/$id" as never, params: { id } as never })
              }
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <PageLayout className="pb-8" style={POPPINS}>
      <InstructorTopBar
        firstName=""
        pageTitle="Enquiries"
        onBack={() => navigate({ to: "/home" as never })}
        onBell={() => navigate({ to: "/notifications" as never })}
        onPhone={() => navigate({ to: "/enquiries" as never })}
        onLiveTrack={() => navigate({ to: "/live" as never })}
        onMenu={() => navigate({ to: "/more" as never })}
        onMicPress={() => toast.info("Voice commands coming soon!")}
      />
      <div style={{ height: "calc(60px + env(safe-area-inset-top, 0px))" }} />

      <div className="mt-3">
        {isEmpty ? (
          <EmptyState
            icon={<IconInbox size={32} color="#9CA3AF" stroke={1.5} />}
            title="No enquiries yet"
            subtitle="Enquiries from EveryDriver will appear here"
          />
        ) : (
          <>
            {renderSection("New", newItems, "new")}
            {renderSection("Accepted", acceptedItems, "accepted")}
            {renderSection("Declined", declinedItems, "declined")}
          </>
        )}
      </div>
    </PageLayout>
  );
}

function StatusIcon({ status }: { status: string }) {
  const map: Record<string, { bg: string; node: React.ReactNode }> = {
    new: { bg: "#1877D6", node: <IconMail size={18} color="#FFFFFF" stroke={1.8} /> },
    accepted: { bg: "#DCFCE7", node: <IconCheck size={18} color="#15803D" stroke={2} /> },
    declined: { bg: "#FCE9E9", node: <IconX size={18} color="#CC2229" stroke={2} /> },
  };
  const conf = map[status] ?? map.new;
  return (
    <div
      style={{
        width: 36,
        height: 36,
        borderRadius: 18,
        background: conf.bg,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      {conf.node}
    </div>
  );
}

function EnquiryRowItem({
  n,
  enquiry,
  status,
  first,
  busy,
  pupilId,
  onAccept,
  onDecline,
  onViewPupil,
}: {
  n: EnquiryNotification;
  enquiry: EnquiryRow | null;
  status: string;
  first: boolean;
  busy: boolean;
  pupilId: string | null;
  onAccept: (e: EnquiryRow) => void;
  onDecline: (e: EnquiryRow) => void;
  onViewPupil: (id: string) => void;
}) {
  const name = enquiry?.name ?? n.title ?? "Enquiry";
  const meta = [enquiry?.course_interest, enquiry?.postcode].filter(Boolean).join(" · ");

  return (
    <div
      style={{
        padding: "14px 16px",
        display: "flex",
        gap: 12,
        alignItems: "flex-start",
        borderTop: first ? "none" : "1px solid #E4E8EF",
        marginLeft: 0,
      }}
    >
      <StatusIcon status={status} />
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: "#0B1F3A" }}>{name}</div>
        {meta && <div style={{ fontSize: 12, color: "#6B7686", marginTop: 2 }}>{meta}</div>}
        {enquiry?.phone && (
          <a
            href={`tel:${enquiry.phone}`}
            style={{ fontSize: 12, color: "#1877D6", display: "inline-block", marginTop: 2 }}
          >
            {enquiry.phone}
          </a>
        )}
        <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 2 }}>{timeAgo(n.created_at)}</div>
        {enquiry?.notes && (
          <div style={{ fontSize: 12, color: "#6B7686", fontStyle: "italic", marginTop: 4 }}>
            {enquiry.notes}
          </div>
        )}

        {status === "new" && (
          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
            <button
              type="button"
              disabled={!enquiry || busy}
              onClick={() => enquiry && onAccept(enquiry)}
              style={{
                background: "#1877D6",
                color: "#fff",
                border: "none",
                borderRadius: 20,
                padding: "8px 16px",
                fontSize: 12,
                fontWeight: 700,
                cursor: "pointer",
                opacity: enquiry && !busy ? 1 : 0.5,
                ...POPPINS,
              }}
            >
              Accept
            </button>
            <button
              type="button"
              disabled={!enquiry || busy}
              onClick={() => enquiry && onDecline(enquiry)}
              style={{
                background: "#EEF2F7",
                color: "#CC2229",
                border: "none",
                borderRadius: 20,
                padding: "8px 16px",
                fontSize: 12,
                fontWeight: 700,
                cursor: "pointer",
                opacity: enquiry && !busy ? 1 : 0.5,
                ...POPPINS,
              }}
            >
              Decline
            </button>
          </div>
        )}

        {status === "accepted" && pupilId && (
          <button
            type="button"
            onClick={() => onViewPupil(pupilId)}
            style={{
              background: "#1877D6",
              color: "#fff",
              border: "none",
              borderRadius: 20,
              padding: "8px 16px",
              fontSize: 12,
              fontWeight: 700,
              cursor: "pointer",
              fontFamily: "Poppins, sans-serif",
              marginTop: 8,
            }}
          >
            View pupil →
          </button>
        )}
      </div>
      {status === "accepted" && !pupilId && (
        <IconChevronRight size={16} color="#9CA3AF" stroke={1.8} />
      )}
    </div>
  );
}
