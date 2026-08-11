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
  fontWeight: 800,
  letterSpacing: "0.6px",
  color: "#6B7280",
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
  }

  async function markContacted(enquiry: EnquiryRow) {
    setBusyId(enquiry.id);
    try {
      const now = new Date().toISOString();
      await supabase
        .from("enquiries")
        .update({ status: "contacted", contacted_at: now })
        .eq("id", enquiry.id);

      await logActivity(enquiry.id, "call", "Marked as contacted", now);

      updateEnquiry(enquiry.id, { status: "contacted", contacted_at: now });
      toast.success("Marked as contacted");
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

  function EnquiryRowItem({ enquiry, isLast }: { enquiry: EnquiryRow; isLast: boolean }) {
    const meta = metaFor(enquiry.status);
    const Icon = meta.Icon;
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
          alignItems: "center",
          gap: 12,
          padding: "14px 16px",
          background: "#fff",
          border: "none",
          textAlign: "left",
          borderBottom: isLast ? "none" : "1px solid #F0F1F4",
        }}
      >
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            background: meta.bg,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <Icon size={18} stroke={2} color={meta.color} />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: "#0B1F3A", ...POPPINS }}>
            {enquiry.name ?? "Unknown"}
          </div>
          {(enquiry.course_interest || enquiry.postcode) && (
            <div style={{ fontSize: 13, color: "#4A5568", marginTop: 1, ...POPPINS }}>
              {[enquiry.course_interest, enquiry.postcode].filter(Boolean).join(" · ")}
            </div>
          )}
          <div
            style={{
              fontSize: 11,
              color: "#9CA3AF",
              marginTop: 3,
              display: "flex",
              alignItems: "center",
              gap: 8,
              ...POPPINS,
            }}
          >
            <span>{timeAgo(enquiry.created_at)}</span>
            {enquiry.phone && (
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 3,
                  background: "#EFF6FF",
                  color: "#1877D6",
                  borderRadius: 20,
                  padding: "2px 8px",
                  fontWeight: 700,
                }}
              >
                <IconPhone size={11} stroke={2} color="#1877D6" />
                {enquiry.phone}
              </span>
            )}
          </div>
        </div>

        <IconChevronRight size={16} stroke={2} color="#C7C7CC" />
      </button>
    );
  }

  function Section({ title, rows }: { title: string; rows: EnquiryRow[] }) {
    if (!rows.length) return null;
    return (
      <div>
        <div style={SECTION_HEADER}>
          {title} · {rows.length}
        </div>
        <div style={CARD}>
          {rows.map((e, i) => (
            <EnquiryRowItem key={e.id} enquiry={e} isLast={i === rows.length - 1} />
          ))}
        </div>
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
          {/* Contact */}
          <div style={SECTION_HEADER}>Contact</div>
          <div style={CARD}>
            <DetailRow
              label="Phone"
              value={enquiry.phone ?? "—"}
              Icon={IconPhone}
              href={enquiry.phone ? `tel:${enquiry.phone}` : undefined}
            />
            <DetailRow
              label="Email"
              value={enquiry.email ?? "—"}
              Icon={IconMail}
              href={enquiry.email ? `mailto:${enquiry.email}` : undefined}
            />
            <DetailRow label="Postcode" value={enquiry.postcode ?? "—"} Icon={IconInbox} isLast />
          </div>

          {/* Course */}
          <div style={SECTION_HEADER}>Course details</div>
          <div style={CARD}>
            <DetailRow label="Course interest" value={enquiry.course_interest ?? "—"} />
            <DetailRow label="Transmission" value={enquiry.transmission ?? "—"} />
            <DetailRow
              label="Hours requested"
              value={enquiry.requested_hours ? `${enquiry.requested_hours} hrs` : "—"}
            />
            <DetailRow label="Preferred timing" value={enquiry.preferred_timing ?? "—"} />
            <DetailRow
              label="Preferred start"
              value={
                enquiry.preferred_start_date
                  ? new Date(enquiry.preferred_start_date).toLocaleDateString("en-GB")
                  : "—"
              }
              isLast
            />
          </div>

          {enquiry.notes && (
            <>
              <div style={SECTION_HEADER}>Their message</div>
              <div style={{ ...CARD, padding: "13px 16px" }}>
                <div style={{ fontSize: 14, color: "#4A5568", fontStyle: "italic", ...POPPINS }}>
                  &ldquo;{enquiry.notes}&rdquo;
                </div>
              </div>
            </>
          )}

          {/* Actions */}
          <div style={SECTION_HEADER}>Actions</div>
          <div style={{ ...CARD, opacity: busy ? 0.6 : 1 }}>
            {open && (
              <>
                <DetailRow
                  label="Mark contacted"
                  Icon={IconCheck}
                  onClick={() => void markContacted(enquiry)}
                />
                <DetailRow
                  label="Send SMS"
                  Icon={IconMessage}
                  href={enquiry.phone ? `sms:${enquiry.phone}` : undefined}
                />
                <DetailRow
                  label="Accept enquiry"
                  Icon={IconCheck}
                  color="#1877D6"
                  onClick={() => void acceptEnquiry(enquiry)}
                />
                <DetailRow
                  label="Can't help — send to Jobs"
                  Icon={IconBriefcase}
                  onClick={() => void declineEnquiry(enquiry, true)}
                />
                <DetailRow
                  label="Decline"
                  Icon={IconX}
                  color="#CC2229"
                  onClick={() => void declineEnquiry(enquiry, false)}
                  isLast
                />
              </>
            )}

            {status === "accepted" && (
              <DetailRow
                label="View pupil profile"
                Icon={IconChevronRight}
                color="#1877D6"
                isLast
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
              <DetailRow
                label="Sent to Jobs board"
                Icon={IconBriefcase}
                value={timeAgo(enquiry.sent_to_jobs_at)}
                isLast
              />
            )}

            {status === "declined" && (
              <DetailRow label="Enquiry declined" Icon={IconX} color="#CC2229" isLast />
            )}
          </div>

          {/* Activity */}
          <div style={SECTION_HEADER}>Activity</div>
          <div style={{ ...CARD, padding: list.length ? "14px 16px" : "18px 16px" }}>
            {list.length === 0 && (
              <div style={{ fontSize: 13.5, color: "#9CA3AF", ...POPPINS }}>No activity yet</div>
            )}
            {list.map((a) => {
              const dot =
                a.type === "note" ? "#1877D6" : a.type === "call" ? "#15803D" : "#CC2229";
              return (
                <div key={a.id} style={{ display: "flex", gap: 10, marginBottom: 12 }}>
                  <div
                    style={{
                      width: 9,
                      height: 9,
                      borderRadius: 5,
                      background: dot,
                      marginTop: 5,
                      flexShrink: 0,
                    }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, color: "#0B1F3A", fontWeight: 600, ...POPPINS }}>
                      {a.body}
                    </div>
                    <div style={{ fontSize: 11.5, color: "#9CA3AF", ...POPPINS }}>
                      {timeAgo(a.created_at)}
                    </div>
                  </div>
                </div>
              );
            })}
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
        titleStyle={{ fontSize: 26, fontWeight: 800, letterSpacing: "-0.5px", color: "#fff" }}
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

      {selected && <DetailSheet enquiry={selected} />}
    </div>
  );
}
