import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { toast } from "sonner";
import { EmptyState } from "@/components/dsm/EmptyState";
import { PageLoader } from "@/components/dsm/LoadingSpinner";
import InstructorTopBar from "@/components/dsm/InstructorTopBar";
import {
  IconMail,
  IconCheck,
  IconX,
  IconInbox,
  IconPhone,
  IconMessage,
  IconNotes,
  IconChevronRight,
  IconSend,
  IconBriefcase,
  IconArrowLeft,
} from "@tabler/icons-react";

export const Route = createFileRoute("/enquiries")({
  head: () => ({
    meta: [
      { title: "Enquiries — DSM by EveryDriver" },
      {
        name: "description",
        content:
          "Review, contact, accept or pass on new pupil enquiries and turn them into pupil records.",
      },
      { property: "og:title", content: "Enquiries — DSM by EveryDriver" },
      {
        property: "og:description",
        content: "Review, contact, accept or pass on new pupil enquiries.",
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
  contacted_at: string | null;
  instructor_notes: string | null;
  sent_to_jobs_at: string | null;
}

interface EnquiryActivity {
  id: string;
  enquiry_id: string;
  type: string;
  body: string | null;
  created_at: string;
}

function timeAgo(iso: string | null) {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${Math.max(mins, 0)}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function fullDate(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}


const STATUS_META: Record<
  string,
  { label: string; bg: string; color: string; Icon: typeof IconMail }
> = {
  new: { label: "New", bg: "#EFF6FF", color: "#1877D6", Icon: IconMail },
  contacted: { label: "Contacted", bg: "#FFF7E6", color: "#B45309", Icon: IconPhone },
  accepted: { label: "Accepted", bg: "#DCFCE7", color: "#15803D", Icon: IconCheck },
  declined: { label: "Declined", bg: "#FCE9E9", color: "#CC2229", Icon: IconX },
  on_jobs: { label: "On jobs board", bg: "#EEF2F7", color: "#0B1F3A", Icon: IconBriefcase },
};

function metaFor(status: string | null) {
  return STATUS_META[status ?? "new"] ?? STATUS_META["new"]!;
}

const CARD: React.CSSProperties = {
  background: "#fff",
  borderRadius: 16,
  boxShadow: "0 3px 0 #E4E4E8, 0 8px 18px rgba(0,0,0,0.04)",
  overflow: "hidden",
};

const SECTION_HEADER: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 700,
  letterSpacing: "0.5px",
  color: "#8A8A8E",
  textTransform: "uppercase",
  margin: "18px 4px 8px",
  ...POPPINS,
};


function EnquiriesPage() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [enquiries, setEnquiries] = useState<EnquiryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [newPupilIds, setNewPupilIds] = useState<Record<string, string>>({});
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activities, setActivities] = useState<Record<string, EnquiryActivity[]>>({});
  const [noteText, setNoteText] = useState("");
  const [savingNote, setSavingNote] = useState(false);

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

      setEnquiries((data as EnquiryRow[] | null) ?? []);
      setLoading(false);
    })();
  }, []);

  // Always refresh the activity log when a detail sheet opens
  useEffect(() => {
    if (!selectedId) return;
    let cancelled = false;
    void (async () => {
      const { data } = await supabase
        .from("enquiry_activities")
        .select("*")
        .eq("enquiry_id", selectedId)
        .order("created_at", { ascending: true });
      if (cancelled) return;
      setActivities((prev) => ({
        ...prev,
        [selectedId]: (data as EnquiryActivity[] | null) ?? [],
      }));
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  async function loadActivities(enquiryId: string) {
    if (activities[enquiryId]) return;
    const { data } = await supabase
      .from("enquiry_activities")
      .select("*")
      .eq("enquiry_id", enquiryId)
      .order("created_at", { ascending: true });
    setActivities((prev) => ({
      ...prev,
      [enquiryId]: (data as EnquiryActivity[] | null) ?? [],
    }));
  }

  function updateEnquiry(id: string, patch: Partial<EnquiryRow>) {
    setEnquiries((prev) => prev.map((e) => (e.id === id ? { ...e, ...patch } : e)));
  }

  async function logActivity(enquiryId: string, type: string, body: string, at: string) {
    const { data } = await supabase
      .from("enquiry_activities")
      .insert({
        enquiry_id: enquiryId,
        instructor_id: userId,
        type,
        body,
        created_at: at,
      })
      .select()
      .single();
    if (data) {
      setActivities((prev) => ({
        ...prev,
        [enquiryId]: [...(prev[enquiryId] ?? []), data as EnquiryActivity],
      }));
    }
    return (data as EnquiryActivity | null) ?? null;
  }

  async function removeActivity(enquiryId: string, activityId: string | undefined) {
    if (!activityId) return;
    await supabase.from("enquiry_activities").delete().eq("id", activityId);
    setActivities((prev) => ({
      ...prev,
      [enquiryId]: (prev[enquiryId] ?? []).filter((a) => a.id !== activityId),
    }));
  }

  async function markContacted(enquiry: EnquiryRow) {
    setBusyId(enquiry.id);
    try {
      const now = new Date().toISOString();
      await supabase
        .from("enquiries")
        .update({ status: "contacted", contacted_at: now })
        .eq("id", enquiry.id);

      const act = await logActivity(enquiry.id, "call", "Marked as contacted", now);

      updateEnquiry(enquiry.id, { status: "contacted", contacted_at: now });
      toast.success("Marked as contacted", {
        duration: 6000,
        action: {
          label: "Undo",
          onClick: () => {
            void (async () => {
              await supabase
                .from("enquiries")
                .update({ status: "new", contacted_at: null })
                .eq("id", enquiry.id);
              await removeActivity(enquiry.id, act?.id);
              updateEnquiry(enquiry.id, { status: "new", contacted_at: null });
              toast.success("Undone");
            })();
          },
        },
      });
    } catch {
      toast.error("Could not update");
    } finally {
      setBusyId(null);
    }
  }

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

      await logActivity(
        enquiry.id,
        "status_change",
        "Enquiry accepted — pupil record created",
        new Date().toISOString(),
      );

      if (pupilId) {
        setNewPupilIds((prev) => ({ ...prev, [enquiry.id]: pupilId }));
      }

      updateEnquiry(enquiry.id, { status: "accepted" });
      toast.success(pupilId ? "Accepted — pupil created" : "Enquiry accepted");
    } catch {
      toast.error("Couldn't accept");
    } finally {
      setBusyId(null);
    }
  }

  async function declineEnquiry(enquiry: EnquiryRow, sendToJobs: boolean) {
    if (!userId) return;
    setBusyId(enquiry.id);
    try {
      const now = new Date().toISOString();

      await supabase
        .from("enquiries")
        .update({
          status: sendToJobs ? "on_jobs" : "declined",
          sent_to_jobs_at: sendToJobs ? now : null,
        })
        .eq("id", enquiry.id);

      if (sendToJobs) {
        await supabase.from("job_offers").insert({
          created_by: userId,
          enquiry_id: enquiry.id,
          pupil_name: enquiry.name,
          pupil_phone: null,
          pupil_email: null,
          transmission: enquiry.transmission,
          course_hours: enquiry.requested_hours,
          preferred_timing: enquiry.preferred_timing ? [enquiry.preferred_timing] : null,
          preferred_start_date: enquiry.preferred_start_date,
          postcode_area: enquiry.postcode,
          status: "open",
          created_at: now,
        });
      }

      await logActivity(
        enquiry.id,
        "status_change",
        sendToJobs ? "Declined — sent to Jobs board" : "Enquiry declined",
        now,
      );

      updateEnquiry(enquiry.id, {
        status: sendToJobs ? "on_jobs" : "declined",
        sent_to_jobs_at: sendToJobs ? now : null,
      });

      toast.success(sendToJobs ? "Sent to Jobs board" : "Enquiry declined");
    } catch {
      toast.error("Couldn't decline");
    } finally {
      setBusyId(null);
    }
  }

  async function addNote(enquiryId: string) {
    if (!noteText.trim() || !userId) return;
    setSavingNote(true);
    try {
      await logActivity(enquiryId, "note", noteText.trim(), new Date().toISOString());
      setNoteText("");
      toast.success("Note added");
    } catch {
      toast.error("Couldn't add note");
    } finally {
      setSavingNote(false);
    }
  }

  /* ---------------- rows ---------------- */

  function formatPhone(raw: string) {
    if (/\s/.test(raw)) return raw;
    const digits = raw.replace(/[^\d+]/g, "");
    if (/^0\d{10}$/.test(digits)) return `${digits.slice(0, 5)} ${digits.slice(5)}`;
    if (/^0\d{9}$/.test(digits)) return `${digits.slice(0, 4)} ${digits.slice(4)}`;
    return raw;
  }

  function EnquiryRowItem({ enquiry }: { enquiry: EnquiryRow }) {
    return (
      <button
        type="button"
        onClick={() => {
          setSelectedId(enquiry.id);
          setNoteText("");
          void loadActivities(enquiry.id);
        }}
        className="w-full active:opacity-70"
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: 13,
          padding: 16,
          background: "#fff",
          border: "none",
          textAlign: "left",
          borderRadius: 16,
          marginBottom: 10,
          boxShadow: "0 3px 0 #E4E4E8, 0 8px 18px rgba(0,0,0,0.04)",
        }}
      >
        <div
          style={{
            width: 42,
            height: 42,
            borderRadius: 21,
            background: "#E7F1FC",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <IconMail size={18} stroke={2} color="#1877D6" />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 16.5, fontWeight: 800, color: "#0B1F3A", ...POPPINS }}>
            {enquiry.name ?? "Unknown"}
          </div>
          {enquiry.postcode && (
            <div
              style={{
                background: "#F2F2F7",
                color: "#6B6B6F",
                fontSize: 11,
                fontWeight: 700,
                padding: "3px 9px",
                borderRadius: 20,
                marginTop: 5,
                width: "fit-content",
                ...POPPINS,
              }}
            >
              {enquiry.postcode}
            </div>
          )}
          <div
            style={{
              marginTop: 9,
              display: "flex",
              alignItems: "center",
              gap: 10,
              flexWrap: "wrap",
              ...POPPINS,
            }}
          >
            <span style={{ color: "#B0B0B5", fontSize: 12, fontWeight: 500 }}>
              {timeAgo(enquiry.created_at)}
            </span>
            {enquiry.phone && (
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                  background: "#E7F1FC",
                  color: "#1877D6",
                  borderRadius: 20,
                  padding: "6px 12px",
                  fontSize: 12.5,
                  fontWeight: 800,
                }}
              >
                <IconPhone size={12} stroke={2} color="#1877D6" />
                {formatPhone(enquiry.phone)}
              </span>
            )}
          </div>
        </div>

        <IconChevronRight
          size={14}
          stroke={2}
          color="#C7C7CC"
          style={{ marginTop: 4, flexShrink: 0 }}
        />
      </button>
    );
  }

  function Section({ title, rows }: { title: string; rows: EnquiryRow[] }) {
    if (!rows.length) return null;
    return (
      <div>
        <div style={SECTION_HEADER}>
          {title} ·{" "}
          <span style={{ color: "#FF3B30", fontWeight: 800 }}>{rows.length}</span>
        </div>
        {rows.map((e) => (
          <EnquiryRowItem key={e.id} enquiry={e} />
        ))}
      </div>
    );
  }


  /* ---------------- detail sheet ---------------- */

  function DetailRow({
    label,
    value,
    href,
    onClick,
    color,
    isLast,
    Icon,
  }: {
    label: string;
    value?: string | null;
    href?: string;
    onClick?: () => void;
    color?: string;
    isLast?: boolean;
    Icon?: typeof IconMail;
  }) {
    const inner = (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "13px 16px",
          borderBottom: isLast ? "none" : "1px solid #F0F1F4",
        }}
      >
        {Icon && <Icon size={17} stroke={2} color={color ?? "#6B7280"} />}
        <div style={{ fontSize: 14.5, fontWeight: 600, color: color ?? "#0B1F3A", ...POPPINS }}>
          {label}
        </div>
        <div
          style={{
            marginLeft: "auto",
            fontSize: 14,
            color: "#6B7280",
            ...POPPINS,
            maxWidth: "55%",
            textAlign: "right",
          }}
        >
          {value}
        </div>
      </div>
    );

    if (href) {
      return (
        <a href={href} style={{ display: "block", textDecoration: "none" }}>
          {inner}
        </a>
      );
    }
    if (onClick) {
      return (
        <button
          type="button"
          onClick={onClick}
          className="w-full active:opacity-70"
          style={{ background: "transparent", border: "none", textAlign: "left", display: "block" }}
        >
          {inner}
        </button>
      );
    }
    return inner;
  }

  function ActionRow({
    label,
    Icon,
    chipBg,
    chipColor,
    labelColor,
    href,
    onClick,
    isFirst,
    value,
    description,
  }: {
    label: string;
    Icon: typeof IconMail;
    chipBg: string;
    chipColor: string;
    labelColor?: string;
    href?: string;
    onClick?: () => void;
    isFirst?: boolean;
    value?: string | null;
    description?: string;
  }) {
    const inner = (
      <div
        style={{
          padding: "14px 16px",
          borderTop: isFirst ? "none" : "1px solid #EFEFF2",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 9,
              background: chipBg,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <Icon size={17} stroke={2} color={chipColor} />
          </div>
          <div
            style={{
              fontSize: 14.5,
              fontWeight: 700,
              color: labelColor ?? "#0B1F3A",
              ...POPPINS,
            }}
          >
            {label}
          </div>
          <div
            style={{
              marginLeft: "auto",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            {value && (
              <span style={{ fontSize: 13, color: "#8A8A8E", ...POPPINS }}>{value}</span>
            )}
            <IconChevronRight size={13} stroke={2} color="#C7C7CC" />
          </div>
        </div>
        {description && (
          <div
            style={{
              marginTop: 6,
              marginLeft: 44,
              color: "#8A8A8E",
              fontSize: 11.5,
              fontWeight: 500,
              lineHeight: 1.4,
              ...POPPINS,
            }}
          >
            {description}
          </div>
        )}
      </div>
    );


    if (href) {
      return (
        <a href={href} style={{ display: "block", textDecoration: "none" }}>
          {inner}
        </a>
      );
    }
    if (onClick) {
      return (
        <button
          type="button"
          onClick={onClick}
          className="w-full active:opacity-70"
          style={{ background: "transparent", border: "none", textAlign: "left", display: "block" }}
        >
          {inner}
        </button>
      );
    }
    return inner;
  }


  function DetailSheet({ enquiry }: { enquiry: EnquiryRow }) {
    const meta = metaFor(enquiry.status);
    const status = enquiry.status ?? "new";
    const open = status === "new" || status === "contacted";
    const list = activities[enquiry.id] ?? [];
    const busy = busyId === enquiry.id;

    return (
      <div
        className="fixed inset-0 z-[3000] overflow-y-auto"
        style={{ background: "#F3F8FF", animation: "dsmSlideUp 0.24s ease-out" }}
      >
        <div
          style={{
            position: "sticky",
            top: 0,
            zIndex: 2,
            background: "#0B1F3A",
            padding: "calc(12px + env(safe-area-inset-top, 0px)) 16px 14px",
            borderRadius: "0 0 18px 18px",
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <button
            type="button"
            aria-label="Back"
            onClick={() => setSelectedId(null)}
            className="flex items-center justify-center active:opacity-70"
            style={{
              width: 30,
              height: 30,
              borderRadius: 15,
              background: "rgba(255,255,255,0.14)",
              border: "none",
            }}
          >
            <IconArrowLeft size={16} stroke={2} color="#fff" />
          </button>
          <div
            style={{
              flex: 1,
              minWidth: 0,
              color: "#fff",
              fontSize: 18,
              fontWeight: 800,
              letterSpacing: "-0.3px",
              ...POPPINS,
            }}
          >
            {enquiry.name ?? "Enquiry"}
          </div>
          <span
            style={{
              background: meta.bg,
              color: meta.color,
              borderRadius: 20,
              padding: "4px 10px",
              fontSize: 11.5,
              fontWeight: 800,
              ...POPPINS,
            }}
          >
            {meta.label}
          </span>
        </div>

        <div style={{ padding: "4px 16px 40px" }}>
          {(() => {
            const banner =
              status === "new"
                ? { dot: "#FF3B30", text: "New — not yet contacted" }
                : status === "contacted"
                  ? { dot: "#1877D6", text: "Contacted" }
                  : status === "accepted"
                    ? { dot: "#248A3D", text: "Accepted" }
                    : status === "on_jobs"
                      ? { dot: "#D68A1B", text: "Sent to Jobs board" }
                      : { dot: "#B0B0B5", text: "Declined" };
            const lastChange =
              (list.length ? list[list.length - 1]!.created_at : null) ??
              enquiry.sent_to_jobs_at ??
              enquiry.contacted_at ??
              enquiry.created_at;
            return (
              <div
                style={{
                  ...CARD,
                  padding: "14px 16px",
                  marginBottom: 16,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                  <span
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: 5,
                      background: banner.dot,
                      flexShrink: 0,
                    }}
                  />
                  <span style={{ color: "#0B1F3A", fontSize: 14.5, fontWeight: 800, ...POPPINS }}>
                    {banner.text}
                  </span>
                </div>
                <span style={{ color: "#8A8A8E", fontSize: 12, fontWeight: 500, ...POPPINS }}>
                  {timeAgo(lastChange)}
                </span>
              </div>
            );
          })()}

          {/* Enquiry details */}
          <div style={SECTION_HEADER}>Enquiry details</div>
          <div style={{ ...CARD, padding: 16 }}>
            {(() => {
              const rows: { label: string; value: string }[] = [];
              if (enquiry.course_interest)
                rows.push({ label: "Course type", value: enquiry.course_interest });
              if (enquiry.transmission)
                rows.push({ label: "Transmission", value: enquiry.transmission });
              if (enquiry.requested_hours)
                rows.push({ label: "Hours requested", value: `${enquiry.requested_hours} hrs` });
              if (enquiry.preferred_timing)
                rows.push({ label: "Preferred timing", value: enquiry.preferred_timing });
              if (enquiry.preferred_start_date)
                rows.push({
                  label: "Preferred start",
                  value: new Date(enquiry.preferred_start_date).toLocaleDateString("en-GB"),
                });
              if (enquiry.postcode) rows.push({ label: "Postcode", value: enquiry.postcode });
              if (enquiry.phone)
                rows.push({ label: "Phone", value: formatPhone(enquiry.phone) });
              if (enquiry.email) rows.push({ label: "Email", value: enquiry.email });
              if (enquiry.created_at)
                rows.push({
                  label: "Received",
                  value: fullDate(enquiry.created_at),
                });
              return rows.map((r, i) => (
                <div
                  key={r.label}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 12,
                    padding: "9px 0",
                    borderTop: i === 0 ? "none" : "1px solid #F0F0F2",
                  }}
                >
                  <span style={{ color: "#8A8A8E", fontSize: 13, fontWeight: 600, ...POPPINS }}>
                    {r.label}
                  </span>
                  <span
                    style={{
                      color: "#0B1F3A",
                      fontSize: 13.5,
                      fontWeight: 700,
                      textAlign: "right",
                      ...POPPINS,
                    }}
                  >
                    {r.value}
                  </span>
                </div>
              ));
            })()}

            {enquiry.notes && (
              <div style={{ marginTop: 14 }}>
                <div
                  style={{
                    color: "#8A8A8E",
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: "0.3px",
                    textTransform: "uppercase",
                    marginBottom: 6,
                    ...POPPINS,
                  }}
                >
                  Message
                </div>
                <div
                  style={{
                    background: "#F7F9FC",
                    padding: 12,
                    borderRadius: 10,
                    color: "#0B1F3A",
                    fontSize: 13.5,
                    fontWeight: 500,
                    lineHeight: 1.5,
                    ...POPPINS,
                  }}
                >
                  {enquiry.notes}
                </div>
              </div>
            )}
          </div>

          {/* Activity */}
          <div style={{ ...SECTION_HEADER, marginTop: 20 }}>Activity</div>
          <div style={{ ...CARD, padding: 16 }}>
            {(() => {
              const items: {
                title: string;
                at: string | null;
                pending?: boolean;
                type?: string;
              }[] = [];
              items.push({ title: "Enquiry received", at: enquiry.created_at });
              list.forEach((a) =>
                items.push({ title: a.body ?? a.type, at: a.created_at, type: a.type ?? undefined }),
              );
              if (status === "new") items.push({ title: "Awaiting contact", at: null, pending: true });
              return items.map((it, i) => {
                const last = i === items.length - 1;
                const isNote = it.type === "note";
                const dot = it.pending
                  ? "#D1D1D6"
                  : isNote
                    ? "#F59E0B"
                    : it.type === "call"
                      ? "#1877D6"
                      : it.type === "status_change"
                        ? "#15803D"
                        : "#1877D6";
                return (
                  <div key={`${it.title}-${i}`} style={{ display: "flex", gap: 12 }}>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                      <span
                        style={{
                          width: 9,
                          height: 9,
                          borderRadius: 5,
                          marginTop: 5,
                          background: dot,
                          flexShrink: 0,
                        }}
                      />
                      {!last && <span style={{ width: 1.5, flex: 1, background: "#E4E4E8" }} />}
                    </div>
                    <div style={{ flex: 1, minWidth: 0, paddingBottom: last ? 0 : 14 }}>
                      <div
                        style={{
                          color: it.pending ? "#B0B0B5" : "#0B1F3A",
                          fontSize: 13.5,
                          fontWeight: isNote ? 500 : 700,
                          fontStyle: isNote ? "italic" : "normal",
                          ...POPPINS,
                        }}
                      >
                        {it.title}
                      </div>
                      {it.at && (
                        <div style={{ color: "#8A8A8E", fontSize: 11.5, ...POPPINS }}>
                          {fullDate(it.at)}
                        </div>
                      )}
                    </div>
                  </div>
                );
              });
            })()}
          </div>

          {/* Actions */}
          <div style={{ ...SECTION_HEADER, marginTop: 20 }}>Actions</div>
          <div
            style={{
              background: "#fff",
              borderRadius: 16,
              overflow: "hidden",
              boxShadow: "0 3px 0 #E4E4E8, 0 8px 18px rgba(0,0,0,0.04)",
              opacity: busy ? 0.6 : 1,
            }}
          >
            {open && (
              <>
                <ActionRow
                  label="Mark contacted"
                  Icon={IconCheck}
                  chipBg="#F2F2F7"
                  chipColor="#6B6B6F"
                  isFirst
                  description="Logs that you've reached out (call, text, or in person) — updates status and records the time, but doesn't send anything automatically."
                  onClick={() => void markContacted(enquiry)}
                />
                <ActionRow
                  label="Send SMS"
                  Icon={IconMessage}
                  chipBg="#E7F1FC"
                  chipColor="#1877D6"
                  description="Sends a text message and automatically logs this as your first contact."
                  onClick={
                    enquiry.phone
                      ? () => {
                          void (async () => {
                            const first = enquiry.name?.split(" ")[0] ?? "";
                            const body = encodeURIComponent(
                              `Hi ${first}, thanks for your enquiry about driving lessons. I'd love to help — when would be a good time to chat?`,
                            );
                            window.location.href = `sms:${enquiry.phone}?&body=${body}`;
                            if (enquiry.status === "new") {
                              await markContacted(enquiry);
                            }
                          })();
                        }
                      : undefined
                  }

                />
                <ActionRow
                  label="Accept enquiry"
                  Icon={IconCheck}
                  chipBg="#E6F7EC"
                  chipColor="#248A3D"
                  labelColor="#248A3D"
                  description="Converts this enquiry into a pupil record so you can schedule their first lesson. This can't be undone from here."
                  onClick={() => void acceptEnquiry(enquiry)}
                />
                <ActionRow
                  label="Can't help — send to Jobs"
                  Icon={IconBriefcase}
                  chipBg="#FFF6DC"
                  chipColor="#D68A1B"
                  description="Posts to the Jobs board for another local instructor to pick up — moves to your On jobs board section, not deleted."
                  onClick={() => void declineEnquiry(enquiry, true)}
                />
                <ActionRow
                  label="Decline"
                  Icon={IconX}
                  chipBg="#FDEDEC"
                  chipColor="#FF3B30"
                  labelColor="#FF3B30"
                  description="Closes this enquiry with no further action. It's archived, not deleted — you can still find it under Declined."
                  onClick={() => void declineEnquiry(enquiry, false)}
                />
              </>
            )}

            {status === "accepted" && (
              <ActionRow
                label="View pupil profile"
                Icon={IconCheck}
                chipBg="#E6F7EC"
                chipColor="#248A3D"
                labelColor="#248A3D"
                isFirst
                onClick={() => {
                  const pid = newPupilIds[enquiry.id];
                  if (pid) {
                    navigate({
                      to: "/pupils/$id" as never,
                      params: { id: pid } as never,
                    });
                  } else {
                    navigate({ to: "/pupils" as never });
                  }
                }}
              />
            )}

            {status === "on_jobs" && (
              <ActionRow
                label="Sent to Jobs board"
                Icon={IconBriefcase}
                chipBg="#FFF6DC"
                chipColor="#D68A1B"
                value={timeAgo(enquiry.sent_to_jobs_at)}
                isFirst
              />
            )}

            {status === "declined" && (
              <ActionRow
                label="Enquiry declined"
                Icon={IconX}
                chipBg="#FDEDEC"
                chipColor="#FF3B30"
                labelColor="#FF3B30"
                isFirst
              />
            )}
          </div>


          {/* Add note */}
          <div style={SECTION_HEADER}>Add note</div>
          <div style={{ ...CARD, padding: 12, display: "flex", gap: 8, alignItems: "center" }}>
            <IconNotes size={17} stroke={2} color="#8A8A8E" />
            <input
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Write a note"
              style={{
                flex: 1,
                border: "none",
                outline: "none",
                fontSize: 14.5,
                color: "#0B1F3A",
                background: "transparent",
                ...POPPINS,
              }}
            />
            <button
              type="button"
              disabled={savingNote || !noteText.trim()}
              onClick={() => void addNote(enquiry.id)}
              className="flex items-center justify-center active:opacity-70"
              style={{
                background: noteText.trim() ? "#1877D6" : "#E5E5EA",
                color: "#fff",
                border: "none",
                borderRadius: 12,
                padding: "8px 12px",
                fontSize: 13,
                fontWeight: 700,
                display: "flex",
                gap: 6,
                alignItems: "center",
                ...POPPINS,
              }}
            >
              <IconSend size={14} stroke={2} color="#fff" />
              {savingNote ? "..." : "Add"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ---------------- render ---------------- */

  const byStatus = (s: string) => enquiries.filter((e) => (e.status ?? "new") === s);
  const selected = enquiries.find((e) => e.id === selectedId) ?? null;

  return (
    <div style={{ minHeight: "100vh", background: "#F3F8FF", paddingBottom: 90 }}>
      <InstructorTopBar
        firstName=""
        pageTitle="Enquiries"
        titleStyle={{
          fontSize: 24,
          fontWeight: 800,
          letterSpacing: "-0.4px",
          color: "#fff",
          textShadow: "none",
          mixBlendMode: "normal",
          filter: "none",
          WebkitTextStroke: "0",
          WebkitFontSmoothing: "antialiased",
          MozOsxFontSmoothing: "grayscale",
          fontFamily: "Sora, Poppins, sans-serif",
        }}

        onBack={() => navigate({ to: "/home" as never })}
        onBell={() => navigate({ to: "/notifications" as never })}
        onPhone={() => navigate({ to: "/enquiries" as never })}
        onLiveTrack={() => navigate({ to: "/live" as never })}
        onMenu={() => navigate({ to: "/more" as never })}
        onMicPress={() => toast.info("Voice commands coming soon!")}
      />
      <div style={{ height: "calc(60px + env(safe-area-inset-top, 0px))" }} />

      <div style={{ padding: "4px 16px 24px" }}>
        {loading ? (
          <PageLoader />
        ) : enquiries.length === 0 ? (
          <div style={{ marginTop: 32 }}>
            <EmptyState
              icon={IconInbox}
              title="No enquiries yet"
              description="New pupil enquiries from your website and listings will appear here."
            />
          </div>
        ) : (
          <>
            <Section title="New" rows={byStatus("new")} />
            <Section title="Contacted" rows={byStatus("contacted")} />
            <Section title="Accepted" rows={byStatus("accepted")} />
            <Section title="Declined" rows={byStatus("declined")} />
            <Section title="On jobs board" rows={byStatus("on_jobs")} />
          </>
        )}
      </div>

      {/* Called as a plain function, not <DetailSheet />, so the sheet's JSX is
          inlined into this component's tree and the note input keeps its
          identity (and focus) across re-renders. */}
      {selected && DetailSheet({ enquiry: selected })}
    </div>
  );
}
