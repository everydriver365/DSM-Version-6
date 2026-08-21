import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  IconArrowsLeftRight,
  IconPlus,
  IconCalendar,
  IconMapPin,
  IconClock,
  IconHourglass,
  IconChevronRight,
  IconPhone,
  IconTrash,
  IconCheck,
} from "@tabler/icons-react";
import { toast } from "sonner";
import DSMTopSheet from "@/components/dsm/DSMTopSheet";
import { EmptyState } from "@/components/dsm/EmptyState";
import { BottomSheet } from "@/components/dsm/BottomSheetV2";
import { DSMPill, type PillVariant } from "@/components/dsm/DSMPill";
import { tokens } from "@/lib/tokens";
import { tapLight } from "@/lib/haptics";
import { supabase } from "../lib/supabaseClient";

export const Route = createFileRoute("/test-swap")({
  head: () => ({
    meta: [
      { title: "Test Swap — Driving School Manager" },
      {
        name: "description",
        content:
          "Create and manage driving test swap requests to find another instructor to exchange test dates with.",
      },
      { property: "og:title", content: "Test Swap — Driving School Manager" },
      {
        property: "og:description",
        content:
          "Create and manage driving test swap requests to find another instructor to exchange test dates with.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TestSwapPage,
});

const POPPINS = { fontFamily: "Poppins, sans-serif" } as const;
const SORA = { fontFamily: "Sora, sans-serif" } as const;

type SwapRequest = {
  id: string | number;
  name: string | null;
  test_centre: string | null;
  current_test_date: string | null;
  current_test_time: string | null;
  status: string | null;
  notes?: string | null;
  created_at: string | null;
  instructor_id?: string | null;
  instructor_name?: string | null;
  instructor_phone?: string | null;
};

type PupilRow = { id: string | number; name: string | null };
type CentreRow = { id: string | number; name: string | null; town?: string | null };

function statusVariant(status?: string | null): PillVariant {
  switch ((status ?? "pending").toLowerCase()) {
    case "matched":
      return "success";
    case "closed":
      return "neutral";
    default:
      return "warning";
  }
}

function formatDate(value?: string | null): string {
  if (!value) return "No date";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatCreated(value?: string | null): string {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function initials(name?: string | null): string {
  if (!name) return "?";
  return name
    .split(" ")
    .map((w) => w[0]?.toUpperCase())
    .filter(Boolean)
    .slice(0, 2)
    .join("");
}

function SectionHeader({ title, count }: { title: string; count: number }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        ...POPPINS,
      }}
    >
      <h2
        style={{
          margin: 0,
          color: tokens.navy,
          fontSize: 16,
          fontWeight: tokens.fontWeight.bold,
          ...SORA,
        }}
      >
        {title}
      </h2>
      <span
        style={{
          color: tokens.textSecondary,
          fontSize: 13,
          fontWeight: tokens.fontWeight.medium,
        }}
      >
        {count}
      </span>
    </div>
  );
}

function SwapCard({
  request: r,
  mode,
  onRefresh,
}: {
  request: SwapRequest;
  mode: "mine" | "community";
  onRefresh: () => void;
}) {
  async function handleDelete() {
    const { error } = await supabase.from("test_swap_requests").delete().eq("id", r.id);
    if (error) {
      toast.error(error.message || "Could not delete request");
    } else {
      toast.success("Request deleted");
    }
    onRefresh();
  }

  async function handleMarkMatched() {
    const { error } = await supabase
      .from("test_swap_requests")
      .update({ status: "matched" })
      .eq("id", r.id);
    if (error) {
      toast.error(error.message || "Could not mark matched");
    } else {
      toast.success("Marked as matched");
    }
    onRefresh();
  }

  function handleContact() {
    if (r.instructor_phone) {
      window.open(`tel:${r.instructor_phone}`, "_blank");
    }
  }

  const isPending = (r.status ?? "pending").toLowerCase() === "pending";

  return (
    <div
      style={{
        background: "#fff",
        borderRadius: tokens.radiusCard,
        boxShadow: "0 1px 4px rgba(11,31,58,0.08)",
        padding: 16,
      }}
    >
      {/* Header row */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginBottom: 16,
        }}
      >
        <div
          style={{
            width: 42,
            height: 42,
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#E6F1FB",
            color: tokens.blue,
            fontSize: 15,
            fontWeight: tokens.fontWeight.bold,
            ...SORA,
            flexShrink: 0,
          }}
        >
          {initials(r.name)}
        </div>
        <div
          style={{
            flex: 1,
            minWidth: 0,
            color: tokens.navy,
            fontSize: 16,
            fontWeight: tokens.fontWeight.bold,
            ...SORA,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {r.name || "Pupil"}
        </div>
        <DSMPill variant={statusVariant(r.status)}>
          <IconHourglass size={12} stroke={2.5} />
          {(r.status ?? "pending").toUpperCase()}
        </DSMPill>
        <IconChevronRight size={20} color={tokens.textMuted} stroke={1.8} />
      </div>

      {/* Two-column swap card */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 10,
          position: "relative",
          alignItems: "stretch",
        }}
      >
        {/* Current test */}
        <div
          style={{
            background: "#F5F9FF",
            borderRadius: 14,
            padding: 14,
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: 8,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "#E6F1FB",
                color: tokens.blue,
              }}
            >
              <IconCalendar size={16} stroke={2} />
            </div>
            <span
              style={{
                color: tokens.blue,
                fontSize: 13,
                fontWeight: tokens.fontWeight.bold,
                ...POPPINS,
              }}
            >
              Current test
            </span>
          </div>
          <div
            style={{
              color: tokens.navy,
              fontSize: 18,
              fontWeight: tokens.fontWeight.bold,
              lineHeight: 1.25,
              ...SORA,
            }}
          >
            {formatDate(r.current_test_date)}
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              color: tokens.textSecondary,
              fontSize: 13,
              ...POPPINS,
            }}
          >
            <IconClock size={14} stroke={2} color={tokens.blue} />
            {r.current_test_time ? String(r.current_test_time).slice(0, 5) : "No time"}
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 6,
              marginTop: "auto",
              paddingTop: 10,
              borderTop: "1px solid rgba(24,119,214,0.12)",
              color: tokens.textSecondary,
              fontSize: 13,
              ...POPPINS,
            }}
          >
            <IconMapPin
              size={14}
              stroke={2}
              color={tokens.blue}
              style={{ flexShrink: 0, marginTop: 2 }}
            />
            <span style={{ lineHeight: 1.35 }}>{r.test_centre || "No test centre"}</span>
          </div>
        </div>

        {/* Swap icon */}
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: "50%",
            transform: "translate(-50%, -50%)",
            zIndex: 2,
            width: 36,
            height: 36,
            borderRadius: "50%",
            background: "#fff",
            boxShadow: "0 2px 8px rgba(11,31,58,0.12)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: tokens.blue,
          }}
        >
          <IconArrowsLeftRight size={18} stroke={2} />
        </div>

        {/* Wants */}
        <div
          style={{
            background: "#F7F5FF",
            borderRadius: 14,
            padding: 14,
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: 8,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "#EDE9FE",
                color: tokens.purple,
              }}
            >
              <IconCalendar size={16} stroke={2} />
            </div>
            <span
              style={{
                color: tokens.purple,
                fontSize: 13,
                fontWeight: tokens.fontWeight.bold,
                ...POPPINS,
              }}
            >
              Wants
            </span>
          </div>
          <div
            style={{
              color: tokens.navy,
              fontSize: 18,
              fontWeight: tokens.fontWeight.bold,
              lineHeight: 1.25,
              ...SORA,
            }}
          >
            Any day, any time
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 6,
              marginTop: "auto",
              paddingTop: 10,
              borderTop: "1px solid rgba(124,58,237,0.12)",
              color: tokens.textSecondary,
              fontSize: 13,
              ...POPPINS,
            }}
          >
            <IconMapPin
              size={14}
              stroke={2}
              color={tokens.purple}
              style={{ flexShrink: 0, marginTop: 2 }}
            />
            <span style={{ lineHeight: 1.35 }}>Anywhere</span>
          </div>
        </div>
      </div>

      {/* Community posted-by row */}
      {mode === "community" && r.instructor_name && (
        <div
          style={{
            marginTop: 14,
            paddingTop: 12,
            borderTop: "1px solid #E4E8EF",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 10,
            ...POPPINS,
          }}
        >
          <span style={{ color: tokens.textSecondary, fontSize: 13 }}>
            Posted by: {r.instructor_name}
          </span>
          {r.instructor_phone && (
            <button
              type="button"
              onClick={() => {
                tapLight();
                handleContact();
              }}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                background: "#E6F1FB",
                color: tokens.blue,
                border: "none",
                borderRadius: 999,
                padding: "6px 12px",
                fontSize: 12,
                fontWeight: tokens.fontWeight.bold,
                cursor: "pointer",
                ...POPPINS,
              }}
            >
              <IconPhone size={13} stroke={2} />
              Contact
            </button>
          )}
        </div>
      )}

      {/* Footer: created date + my request actions */}
      <div
        style={{
          marginTop: 14,
          paddingTop: 12,
          borderTop: mode === "community" && r.instructor_name ? "none" : "1px solid #E4E8EF",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
          ...POPPINS,
        }}
      >
        <span style={{ color: "#8A93A3", fontSize: 12 }}>
          Created {formatCreated(r.created_at)}
        </span>
        {mode === "mine" && (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {isPending && (
              <button
                type="button"
                onClick={() => {
                  tapLight();
                  handleMarkMatched();
                }}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  background: "#DCFCE7",
                  color: tokens.green,
                  border: "none",
                  borderRadius: 999,
                  padding: "6px 12px",
                  fontSize: 12,
                  fontWeight: tokens.fontWeight.bold,
                  cursor: "pointer",
                  ...POPPINS,
                }}
              >
                <IconCheck size={13} stroke={2} />
                Mark matched
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                tapLight();
                handleDelete();
              }}
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: 32,
                height: 32,
                background: "#FEE2E2",
                color: tokens.red,
                border: "none",
                borderRadius: "50%",
                cursor: "pointer",
              }}
              aria-label="Delete request"
            >
              <IconTrash size={16} stroke={2} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function SwapRequestList({
  rows,
  userId,
  onRefresh,
}: {
  rows: SwapRequest[];
  userId: string | null;
  onRefresh: () => void;
}) {
  const myRequests = rows.filter((r) => r.instructor_id === userId);
  const communityRequests = rows.filter((r) => r.instructor_id !== userId);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {myRequests.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <SectionHeader title="My requests" count={myRequests.length} />
          {myRequests.map((r) => (
            <SwapCard key={String(r.id)} request={r} mode="mine" onRefresh={onRefresh} />
          ))}
        </div>
      )}
      {communityRequests.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <SectionHeader title="Community requests" count={communityRequests.length} />
          {communityRequests.map((r) => (
            <SwapCard key={String(r.id)} request={r} mode="community" onRefresh={onRefresh} />
          ))}
        </div>
      )}
    </div>
  );
}

function TestSwapPage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<SwapRequest[]>([
    {
      id: 1,
      name: "dave bumsocket",
      test_centre: "Winchester Test Centre",
      current_test_date: "2026-09-01",
      current_test_time: "11:11:00",
      status: "pending",
      notes: null,
      created_at: "2026-08-21T06:00:00Z",
      instructor_id: "me",
      instructor_name: "Me",
      instructor_phone: null,
    },
    {
      id: 2,
      name: "dave farts",
      test_centre: "Winchester Test Centre",
      current_test_date: "2026-06-28",
      current_test_time: "11:11:00",
      status: "pending",
      notes: null,
      created_at: "2026-08-20T06:00:00Z",
      instructor_id: "someone-else",
      instructor_name: "Jane Smith",
      instructor_phone: "+441234567890",
    },
  ]);
  const [loading, setLoading] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [userId, setUserId] = useState<string | null>("me");

  async function load() {
    // Temporary: keep mock data for visual verification
    return;
    setLoading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    setUserId(user?.id ?? null);
    const { data, error } = await supabase
      .from("test_swap_requests")
      .select(
        "*, instructor:instructors!instructor_id(name, phone)"
      )
      .order("created_at", { ascending: false });
    if (error) {
      toast.error("Could not load swap requests");
      setRows([]);
    } else {
      setRows(
        ((data ?? []) as unknown[]).map((r: any) => ({
          ...r,
          instructor_name: r.instructor?.name ?? null,
          instructor_phone: r.instructor?.phone ?? null,
        })) as SwapRequest[]
      );
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <DSMTopSheet
      title="Test Swap"
      onBack={() => navigate({ to: "/more" })}
      right={
        <button
          type="button"
          onClick={() => {
            tapLight();
            setSheetOpen(true);
          }}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            background: tokens.blue,
            color: "#fff",
            border: "none",
            borderRadius: 999,
            padding: "10px 16px",
            fontSize: 14,
            fontWeight: tokens.fontWeight.bold,
            cursor: "pointer",
            ...POPPINS,
          }}
        >
          <IconPlus size={18} stroke={2.2} />
          New request
        </button>
      }
    >
      <div style={{ padding: `20px ${tokens.pagePadding}px 40px` }}>
        {loading ? (
          <div style={{ color: tokens.textSecondary, fontSize: 14, ...POPPINS }}>
            Loading swap requests…
          </div>
        ) : rows.length === 0 ? (
          <EmptyState
            icon={<IconArrowsLeftRight size={28} color={tokens.blue} />}
            title="No swap requests"
            subtitle="Create a request to find another instructor to swap test dates with"
            action={{ label: "New request", onClick: () => setSheetOpen(true) }}
          />
        ) : (
          <SwapRequestList rows={rows} userId={userId} onRefresh={load} />
        )}
      </div>

      {sheetOpen && (
        <NewSwapRequestSheet
          onClose={() => setSheetOpen(false)}
          onSaved={() => {
            setSheetOpen(false);
            load();
          }}
        />
      )}
    </DSMTopSheet>
  );
}

const labelStyle: React.CSSProperties = {
  display: "block",
  color: tokens.navy,
  fontSize: 12,
  fontWeight: 700,
  marginBottom: 6,
  letterSpacing: 0.2,
  fontFamily: "Poppins, sans-serif",
};

const fieldStyle: React.CSSProperties = {
  width: "100%",
  background: "#fff",
  border: "1px solid #E4E8EF",
  borderRadius: 12,
  padding: "12px 14px",
  fontSize: 15,
  color: tokens.navy,
  fontFamily: "Poppins, sans-serif",
  boxSizing: "border-box",
};

function NewSwapRequestSheet({
  onClose,
  onSaved,
}: {
  onClose: () => void;
  onSaved: () => void;
}) {
  const [pupils, setPupils] = useState<PupilRow[]>([]);
  const [centres, setCentres] = useState<CentreRow[]>([]);
  const [pupilName, setPupilName] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [centre, setCentre] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const pupilQuery = supabase.from("pupils").select("id, name").order("name", { ascending: true });
      if (user) pupilQuery.eq("instructor_id", user.id);
      const [{ data: p }, { data: c }] = await Promise.all([
        pupilQuery,
        supabase.from("test_centres").select("id, name, town").order("name", { ascending: true }),
      ]);
      if (cancelled) return;
      setPupils((p ?? []) as PupilRow[]);
      setCentres((c ?? []) as CentreRow[]);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const canSave = useMemo(
    () => pupilName.trim() !== "" && date !== "" && centre.trim() !== "",
    [pupilName, date, centre]
  );

  async function save() {
    if (!canSave || saving) return;
    setSaving(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const payload: Record<string, unknown> = {
      name: pupilName,
      current_test_date: date,
      current_test_time: time || null,
      test_centre: centre,
      notes: notes || null,
      status: "pending",
      instructor_id: user?.id ?? null,
    };
    let { error } = await supabase.from("test_swap_requests").insert(payload);
    if (error && /notes/i.test(error.message)) {
      delete payload.notes;
      ({ error } = await supabase.from("test_swap_requests").insert(payload));
    }
    setSaving(false);
    if (error) {
      toast.error(error.message || "Could not create swap request");
      return;
    }
    toast.success("Swap request created");
    onSaved();
  }

  return (
    <BottomSheet
      title="New swap request"
      subtitle="Find another instructor to swap test dates with"
      onClose={onClose}
      footer={
        <button
          type="button"
          onClick={save}
          disabled={!canSave || saving}
          style={{
            width: "100%",
            background: canSave ? tokens.blue : "#C7D2E0",
            color: "#fff",
            border: "none",
            borderRadius: 14,
            padding: "15px 16px",
            fontSize: 15,
            fontWeight: tokens.fontWeight.bold,
            cursor: canSave && !saving ? "pointer" : "default",
            ...POPPINS,
          }}
        >
          {saving ? "Saving…" : "Create request"}
        </button>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 14, paddingBottom: 8 }}>
        <div>
          <label style={labelStyle} htmlFor="swap-pupil">
            Pupil
          </label>
          <select
            id="swap-pupil"
            value={pupilName}
            onChange={(e) => setPupilName(e.target.value)}
            style={fieldStyle}
          >
            <option value="">Select a pupil</option>
            {pupils.map((p) => (
              <option key={String(p.id)} value={p.name ?? ""}>
                {p.name ?? "Unnamed"}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label style={labelStyle} htmlFor="swap-date">
            Current test date
          </label>
          <input
            id="swap-date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            style={fieldStyle}
          />
        </div>

        <div>
          <label style={labelStyle} htmlFor="swap-time">
            Current test time
          </label>
          <input
            id="swap-time"
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            style={fieldStyle}
          />
        </div>

        <div>
          <label style={labelStyle} htmlFor="swap-centre">
            Test centre
          </label>
          <select
            id="swap-centre"
            value={centre}
            onChange={(e) => setCentre(e.target.value)}
            style={fieldStyle}
          >
            <option value="">Select a test centre</option>
            {centres.map((c) => (
              <option key={String(c.id)} value={c.name ?? ""}>
                {c.name}
                {c.town ? ` — ${c.town}` : ""}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label style={labelStyle} htmlFor="swap-notes">
            Notes (optional)
          </label>
          <textarea
            id="swap-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Preferred dates, flexibility, anything useful"
            style={{ ...fieldStyle, resize: "vertical" }}
          />
        </div>
      </div>
    </BottomSheet>
  );
}
