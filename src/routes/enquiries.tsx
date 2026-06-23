import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Inbox, ThumbsUp, ThumbsDown, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import { Card } from "../components/dsm/Card";
import { supabase } from "../lib/supabaseClient";

export const Route = createFileRoute("/enquiries")({
  head: () => ({
    meta: [{ title: "Enquiries — DSM by EveryDriver" }],
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

function formatShortDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function formatLongDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function EnquiriesPage() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [items, setItems] = useState<EnquiryNotification[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [enquiryById, setEnquiryById] = useState<Record<string, EnquiryRow | null>>({});
  const [loadingEnquiryId, setLoadingEnquiryId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [showDeclined, setShowDeclined] = useState(false);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data, error }) => {
      console.log("[enquiries] getSession", { user: data.session?.user?.id ?? null, error });
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

    // Batch-fetch all referenced enquiries so we can render status badges + filter declined
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

  async function markRead(n: EnquiryNotification) {
    if (n.read) return;
    setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
    const { error } = await supabase
      .from("instructor_notifications")
      .update({ read: true })
      .eq("id", n.id);
    if (error) {
      console.error("[enquiries] mark read error", error);
      setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, read: false } : x)));
    }
  }

  async function fetchEnquiry(refId: string) {
    if (enquiryById[refId] != null) return;
    setLoadingEnquiryId(refId);
    const { data, error } = await supabase
      .from("enquiries")
      .select("*")
      .eq("id", refId)
      .maybeSingle();
    if (error) {
      console.error("[enquiries] enquiry fetch error", error);
      toast.error("Couldn't load enquiry details");
    }
    setEnquiryById((prev) => ({ ...prev, [refId]: (data as EnquiryRow | null) ?? null }));
    setLoadingEnquiryId(null);
  }

  async function toggleExpand(n: EnquiryNotification) {
    const willExpand = expandedId !== n.id;
    setExpandedId(willExpand ? n.id : null);
    if (willExpand && n.reference_id) {
      void fetchEnquiry(n.reference_id);
    }
    if (willExpand && !n.read) {
      void markRead(n);
    }
  }

  async function getInstructorName(uid: string): Promise<string> {
    const { data } = await supabase
      .from("instructors")
      .select("name")
      .eq("id", uid)
      .maybeSingle();
    const name = (data as { name?: string | null } | null)?.name;
    return (name && name.trim()) || "An instructor";
  }

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

      const instructorName = await getInstructorName(userId);
      const message =
        `Instructor ${instructorName} has accepted the enquiry from ${enquiry.name ?? "(no name)"} ` +
        `for a ${enquiry.course_interest ?? "(no course)"} course near ${enquiry.postcode ?? "(no postcode)"}. ` +
        `Please contact the pupil to complete the booking.\n\n` +
        `Pupil: ${enquiry.name ?? ""}\n` +
        `Email: ${enquiry.email ?? ""}\n` +
        `Phone: ${enquiry.phone ?? ""}\n` +
        `Course: ${enquiry.course_interest ?? ""}\n` +
        `Hours: ${enquiry.requested_hours ?? ""}\n` +
        `Transmission: ${enquiry.transmission ?? ""}\n` +
        `Timing: ${enquiry.preferred_timing ?? ""}`;

      const { error: csErr } = await supabase.from("contact_submissions").insert({
        name: enquiry.name ?? "Enquiry",
        email: "admin@everydriver.co.uk",
        subject: "Instructor accepted enquiry — please book",
        message,
      });
      if (csErr) console.warn("[enquiries] contact_submissions insert error", csErr);

      const { error: adminErr } = await supabase.from("instructor_notifications").insert({
        instructor_id: null,
        type: "admin_enquiry_accepted",
        title: `Instructor accepted enquiry — ${enquiry.name ?? ""}`,
        body: message,
        reference_id: enquiry.id,
        read: false,
      });
      if (adminErr) console.warn("[enquiries] admin notification insert error", adminErr);

      setEnquiryById((prev) => ({ ...prev, [enquiry.id]: { ...enquiry, status: "accepted" } }));
      toast.success("Enquiry accepted — admin notified");
    } finally {
      setBusyId(null);
    }
  }

  async function declineEnquiry(enquiry: EnquiryRow, notificationId: string) {
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
      setExpandedId((cur) => (cur === notificationId ? null : cur));
      toast.success("Enquiry declined");
    } finally {
      setBusyId(null);
    }
  }

  function statusOf(n: EnquiryNotification): string {
    const e = n.reference_id ? enquiryById[n.reference_id] : null;
    return (e?.status ?? "new").toLowerCase();
  }

  const activeItems = items.filter((n) => statusOf(n) !== "declined");
  const declinedItems = items.filter((n) => statusOf(n) === "declined");

  return (
    <div className="min-h-screen bg-white pb-8" style={POPPINS}>
      <div
        className="sticky top-0 z-40 flex items-center justify-between px-2"
        style={{ height: 52, backgroundColor: "#072b47" }}
      >
        <button
          type="button"
          aria-label="Back"
          onClick={() => navigate({ to: "/home" })}
          className="flex items-center justify-center"
          style={{ width: 40, height: 40 }}
        >
          <ArrowLeft size={22} color="#FFFFFF" />
        </button>
        <div className="flex-1 text-center text-[15px] font-semibold text-white">Enquiries</div>
        <div style={{ width: 40, height: 40 }} />
      </div>

      <div className="px-4 mt-3">
        {activeItems.length === 0 && declinedItems.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center text-[13px]"
            style={{ color: "#6B7280", padding: "32px 0" }}
          >
            <Inbox size={24} color="#6B7280" />
            <div className="mt-2">No enquiries</div>
          </div>
        ) : (
          <>
            <div className="flex flex-col" style={{ gap: 8 }}>
              {activeItems.length === 0 ? (
                <div className="text-[13px]" style={{ color: "#6B7280", padding: "12px 0" }}>
                  No active enquiries.
                </div>
              ) : (
                activeItems.map((n) => (
                  <EnquiryCard
                    key={n.id}
                    n={n}
                    enquiry={n.reference_id ? enquiryById[n.reference_id] ?? null : null}
                    loading={loadingEnquiryId === n.reference_id}
                    expanded={expandedId === n.id}
                    busy={busyId != null && n.reference_id != null && busyId === enquiryById[n.reference_id]?.id}
                    onToggle={() => toggleExpand(n)}
                    onClose={() => setExpandedId(null)}
                    onAccept={(e) => acceptEnquiry(e)}
                    onDecline={(e) => declineEnquiry(e, n.id)}
                  />
                ))
              )}
            </div>

            {declinedItems.length > 0 && (
              <div className="mt-6">
                <button
                  type="button"
                  onClick={() => setShowDeclined((v) => !v)}
                  className="flex items-center justify-between w-full"
                  style={{
                    padding: "10px 12px",
                    borderRadius: 8,
                    backgroundColor: "#F3F4F6",
                    color: "#6B7280",
                    fontSize: 13,
                    fontWeight: 600,
                  }}
                >
                  <span>Declined ({declinedItems.length})</span>
                  {showDeclined ? (
                    <ChevronUp size={16} color="#6B7280" />
                  ) : (
                    <ChevronDown size={16} color="#6B7280" />
                  )}
                </button>
                {showDeclined && (
                  <div className="flex flex-col mt-2" style={{ gap: 8 }}>
                    {declinedItems.map((n) => (
                      <EnquiryCard
                        key={n.id}
                        n={n}
                        enquiry={n.reference_id ? enquiryById[n.reference_id] ?? null : null}
                        loading={loadingEnquiryId === n.reference_id}
                        expanded={expandedId === n.id}
                        busy={false}
                        onToggle={() => toggleExpand(n)}
                        onClose={() => setExpandedId(null)}
                        onAccept={(e) => acceptEnquiry(e)}
                        onDecline={(e) => declineEnquiry(e, n.id)}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "accepted") {
    return (
      <span
        className="text-[11px] font-semibold text-white"
        style={{ backgroundColor: "#16A34A", padding: "2px 8px", borderRadius: 999 }}
      >
        Accepted ✓
      </span>
    );
  }
  if (status === "declined") {
    return (
      <span
        className="text-[11px] font-semibold"
        style={{
          color: "#6B7280",
          backgroundColor: "#F3F4F6",
          padding: "2px 8px",
          borderRadius: 999,
        }}
      >
        Declined
      </span>
    );
  }
  return (
    <span
      className="text-[11px] font-semibold text-white"
      style={{ backgroundColor: "#F59E0B", padding: "2px 8px", borderRadius: 999 }}
    >
      New
    </span>
  );
}

function EnquiryCard({
  n,
  enquiry,
  loading,
  expanded,
  busy,
  onToggle,
  onClose,
  onAccept,
  onDecline,
}: {
  n: EnquiryNotification;
  enquiry: EnquiryRow | null;
  loading: boolean;
  expanded: boolean;
  busy: boolean;
  onToggle: () => void;
  onClose: () => void;
  onAccept: (e: EnquiryRow) => void;
  onDecline: (e: EnquiryRow) => void;
}) {
  const status = (enquiry?.status ?? "new").toLowerCase();
  const isDeclined = status === "declined";
  return (
    <div>
      <button type="button" onClick={onToggle} className="text-left w-full">
        <Card>
          <div className="flex items-start justify-between" style={{ gap: 8 }}>
            <div className="min-w-0 flex-1">
              <div
                className="text-[14px] font-semibold truncate"
                style={{ color: "#0F2044" }}
              >
                {n.title ?? "Enquiry"}
              </div>
              {n.body && !expanded && (
                <div
                  className="text-[13px] mt-0.5 truncate"
                  style={{ color: "#6B7280" }}
                >
                  {n.body}
                </div>
              )}
            </div>
            <div className="flex flex-col items-end" style={{ gap: 4 }}>
              <span className="text-[11px]" style={{ color: "#6B7280" }}>
                {formatShortDate(n.created_at)}
              </span>
              <StatusBadge status={status} />
            </div>
          </div>

          {expanded && (
            <div className="mt-3 pt-3" style={{ borderTop: "0.5px solid #E2E6ED" }}>
              {loading && enquiry == null ? (
                <div className="text-[13px]" style={{ color: "#6B7280" }}>
                  Loading…
                </div>
              ) : enquiry == null ? (
                <div className="text-[13px]" style={{ color: "#6B7280" }}>
                  Enquiry details unavailable.
                </div>
              ) : (
                <DetailGrid enquiry={enquiry} receivedAt={n.created_at} />
              )}

              {!isDeclined && (
                <div
                  className="mt-3 grid"
                  style={{ gridTemplateColumns: "1fr 1fr", gap: 8 }}
                >
                  <button
                    type="button"
                    disabled={!enquiry || busy || status === "accepted"}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (enquiry && status !== "accepted") onAccept(enquiry);
                    }}
                    className="inline-flex items-center justify-center gap-1 text-[13px] font-medium text-white"
                    style={{
                      height: 38,
                      borderRadius: 8,
                      backgroundColor: "#16A34A",
                      opacity: enquiry && !busy && status !== "accepted" ? 1 : 0.5,
                      ...POPPINS,
                    }}
                  >
                    <ThumbsUp size={14} color="#FFFFFF" />{" "}
                    {status === "accepted" ? "Accepted" : "Accept enquiry"}
                  </button>
                  <button
                    type="button"
                    disabled={!enquiry || busy}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (enquiry) onDecline(enquiry);
                    }}
                    className="inline-flex items-center justify-center gap-1 text-[13px] font-medium text-white"
                    style={{
                      height: 38,
                      borderRadius: 8,
                      backgroundColor: "#DC2626",
                      opacity: enquiry && !busy ? 1 : 0.5,
                      ...POPPINS,
                    }}
                  >
                    <ThumbsDown size={14} color="#FFFFFF" /> Decline
                  </button>
                </div>
              )}

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onClose();
                }}
                className="mt-2 inline-flex items-center justify-center w-full text-[12px] font-medium"
                style={{
                  height: 32,
                  borderRadius: 8,
                  backgroundColor: "#F3F4F6",
                  color: "#6B7280",
                  ...POPPINS,
                }}
              >
                Close
              </button>
            </div>
          )}
        </Card>
      </button>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string | null | undefined }) {
  const shown = value && String(value).trim().length > 0 ? String(value) : "—";
  return (
    <div className="flex items-start" style={{ gap: 8 }}>
      <div
        className="text-[12px] font-medium"
        style={{ color: "#6B7280", width: 116, flexShrink: 0 }}
      >
        {label}
      </div>
      <div className="text-[13px] flex-1" style={{ color: "#1A1A2E", wordBreak: "break-word" }}>
        {shown}
      </div>
    </div>
  );
}

function DetailGrid({ enquiry, receivedAt }: { enquiry: EnquiryRow; receivedAt: string }) {
  return (
    <div className="flex flex-col" style={{ gap: 6 }}>
      <DetailRow label="Name" value={enquiry.name} />
      <DetailRow label="Email" value={enquiry.email} />
      <DetailRow label="Phone" value={enquiry.phone} />
      <DetailRow label="Course" value={enquiry.course_interest} />
      <DetailRow label="Transmission" value={enquiry.transmission} />
      <DetailRow
        label="Hours requested"
        value={enquiry.requested_hours != null ? String(enquiry.requested_hours) : null}
      />
      <DetailRow label="Preferred timing" value={enquiry.preferred_timing} />
      <DetailRow
        label="Preferred start"
        value={enquiry.preferred_start_date ? formatLongDate(enquiry.preferred_start_date) : null}
      />
      <DetailRow label="Postcode" value={enquiry.postcode} />
      <DetailRow label="Notes" value={enquiry.notes} />
      <DetailRow label="Received" value={formatLongDate(receivedAt)} />
      {enquiry.status && <DetailRow label="Status" value={enquiry.status} />}
    </div>
  );
}
