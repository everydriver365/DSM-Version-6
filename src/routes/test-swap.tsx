import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  IconArrowsLeftRight,
  IconArrowsUpDown,
  IconPlus,
  IconCalendar,
  IconMapPin,
  IconClock,
  IconHourglass,
  IconChevronRight,
  IconFilter,
  IconPhone,
  IconTrash,
  IconCheck,
  IconSearch,
  IconMessage,
  IconX,
} from "@tabler/icons-react";
import { toast } from "sonner";
import DSMTopSheet from "@/components/dsm/DSMTopSheet";
import { EmptyState } from "@/components/dsm/EmptyState";
import { BottomSheet } from "@/components/dsm/BottomSheetV2";
import SegmentedTabs from "@/components/learn/shared/SegmentedTabs";
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
  transmission?: string | null;
  created_at: string | null;
  instructor_id?: string | null;
  instructor_name?: string | null;
  instructor_phone?: string | null;
};

type PupilRow = { id: string | number; name: string | null };
type CentreRow = { id: string | number; name: string | null; town?: string | null };

/** Display-time title-casing — the stored name is never modified. */
function displayName(name?: string | null): string {
  if (!name) return "Pupil";
  return name
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/** Calm status pill for swap requests (pending / matched / closed). */
function SwapStatusPill({ status }: { status?: string | null }) {
  const s = (status ?? "pending").toLowerCase();
  const conf =
    s === "matched"
      ? { bg: "#E7F4E7", color: "#3B8B3B", label: "Matched", icon: <IconCheck size={10} stroke={2.2} /> }
      : s === "closed"
        ? { bg: "#F2F2F4", color: "#6E6E73", label: "Closed", icon: <IconX size={10} stroke={2.2} /> }
        : { bg: "#FBF1DE", color: "#B8801F", label: "Pending", icon: <IconHourglass size={10} stroke={2.2} /> };
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        background: conf.bg,
        color: conf.color,
        fontSize: 10,
        fontWeight: 500,
        lineHeight: 1.2,
        padding: "3px 9px",
        borderRadius: 999,
        whiteSpace: "nowrap",
        flexShrink: 0,
        ...POPPINS,
      }}
    >
      {conf.icon}
      {conf.label}
    </span>
  );
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

function normalizeTime(value?: string | null): string | null {
  if (!value) return null;
  return value.slice(0, 5);
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

const AVATAR_COLORS = [
  { bg: "#E6F1FB", color: "#1877D6" },
  { bg: "#EDE9FE", color: "#7C3AED" },
  { bg: "#D8F3EC", color: "#0E9384" },
  { bg: "#FDE9E9", color: "#CC2229" },
  { bg: "#FEF3C7", color: "#B45309" },
];

function avatarColor(name?: string | null) {
  const key = (name || "?").toLowerCase();
  let sum = 0;
  for (let i = 0; i < key.length; i++) sum += key.charCodeAt(i);
  return AVATAR_COLORS[sum % AVATAR_COLORS.length];
}

function SwapCard({
  request: r,
  mode,
  onRefresh,
  onSelect,
}: {
  request: SwapRequest;
  mode: "mine" | "community";
  onRefresh: () => void;
  onSelect?: () => void;
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
  const av = avatarColor(r.name);
  const time = r.current_test_time ? String(r.current_test_time).slice(0, 5) : null;

  const [detailsOpen, setDetailsOpen] = useState(false);

  return (
    <div
      onClick={() => {
        if (mode === "community" && onSelect) {
          tapLight();
          onSelect();
        }
      }}
      style={{
        background: "#FFFFFF",
        border: "0.5px solid #E5E5EA",
        borderRadius: 14,
        padding: 14,
        cursor: mode === "community" && onSelect ? "pointer" : "default",
        ...POPPINS,
      }}
    >
      {/* Header row */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div
          style={{
            width: 38,
            height: 38,
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: av.bg,
            color: av.color,
            fontSize: 13,
            fontWeight: 500,
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
            color: "#000000",
            fontSize: 14,
            fontWeight: 500,
            letterSpacing: -0.1,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {displayName(r.name)}
        </div>
        <SwapStatusPill status={r.status} />
        <IconChevronRight size={13} color="#C7C7CC" stroke={2} style={{ flexShrink: 0 }} />
      </div>

      {/* Current test — stacked block */}
      <div
        style={{
          marginTop: 12,
          background: "#F8FAFB",
          border: "0.5px solid #E5E5EA",
          borderRadius: 10,
          padding: 12,
        }}
      >
        <div
          style={{
            fontSize: 11,
            fontWeight: 500,
            color: "#2B7BC8",
            textTransform: "uppercase",
            letterSpacing: 0.2,
            marginBottom: 8,
          }}
        >
          Current test
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
          <IconCalendar size={14} stroke={2} color="#2B7BC8" style={{ flexShrink: 0 }} />
          <span style={{ color: "#000000", fontSize: 13, fontWeight: 500, lineHeight: 1.35 }}>
            {formatDate(r.current_test_date)}
            {time ? ` · ${time}` : ""}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <IconMapPin size={14} stroke={2} color="#2B7BC8" style={{ flexShrink: 0 }} />
          <span style={{ color: "#6E6E73", fontSize: 13, lineHeight: 1.35 }}>
            {r.test_centre || "No test centre"}
          </span>
        </div>
      </div>

      {/* Vertical swap divider */}
      <div style={{ display: "flex", justifyContent: "center", margin: "4px 0" }}>
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: "50%",
            background: "#FFFFFF",
            border: "0.5px solid #E5E5EA",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <IconArrowsUpDown size={14} stroke={2} color="#6E6E73" />
        </div>
      </div>

      {/* Wants — stacked block */}
      <div
        style={{
          background: "#F8FAFB",
          border: "0.5px solid #E5E5EA",
          borderRadius: 10,
          padding: 12,
        }}
      >
        <div
          style={{
            fontSize: 11,
            fontWeight: 500,
            color: "#8A5BC9",
            textTransform: "uppercase",
            letterSpacing: 0.2,
            marginBottom: 8,
          }}
        >
          Wants
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
          <IconCalendar size={14} stroke={2} color="#8A5BC9" style={{ flexShrink: 0 }} />
          <span style={{ color: "#000000", fontSize: 13, fontWeight: 500, lineHeight: 1.35 }}>
            Any day, any time
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <IconMapPin size={14} stroke={2} color="#8A5BC9" style={{ flexShrink: 0 }} />
          <span style={{ color: "#6E6E73", fontSize: 13, lineHeight: 1.35 }}>Anywhere</span>
        </div>
      </div>

      {detailsOpen && (
        <div
          style={{
            marginTop: 12,
            paddingTop: 12,
            borderTop: "0.5px solid #E5E5EA",
            display: "flex",
            flexDirection: "column",
            gap: 6,
            color: "#6E6E73",
            fontSize: 13,
          }}
        >
          {r.transmission && <div>Transmission: {r.transmission}</div>}
          {r.notes && <div>Notes: {r.notes}</div>}
          {mode === "community" && r.instructor_name && (
            <div>Posted by: {r.instructor_name}</div>
          )}
          {!r.transmission && !r.notes && !r.instructor_name && <div>No extra details</div>}
        </div>
      )}

      {/* Footer — fully inside the card's 14px padding */}
      <div
        style={{
          marginTop: 12,
          paddingTop: 12,
          borderTop: "0.5px solid #E5E5EA",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
          flexWrap: "wrap",
        }}
      >
        <span style={{ color: "#C7C7CC", fontSize: 11 }}>
          Created {formatCreated(r.created_at)}
        </span>

        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          {mode === "community" && r.instructor_phone && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                tapLight();
                handleContact();
              }}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                background: "#E6F1FB",
                color: "#2B7BC8",
                border: "none",
                borderRadius: 8,
                padding: "7px 12px",
                fontSize: 12,
                fontWeight: 500,
                cursor: "pointer",
                ...POPPINS,
              }}
            >
              <IconPhone size={13} stroke={2} />
              Contact
            </button>
          )}

          {mode === "mine" && isPending && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                tapLight();
                handleMarkMatched();
              }}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                background: "#E7F4E7",
                color: "#3B8B3B",
                border: "none",
                borderRadius: 8,
                padding: "7px 12px",
                fontSize: 12,
                fontWeight: 500,
                cursor: "pointer",
                ...POPPINS,
              }}
            >
              <IconCheck size={13} stroke={2} />
              Mark matched
            </button>
          )}

          {mode === "mine" && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                tapLight();
                handleDelete();
              }}
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: 30,
                height: 30,
                background: "#FBEAEC",
                color: "#C8434F",
                border: "none",
                borderRadius: 8,
                cursor: "pointer",
              }}
              aria-label="Delete request"
            >
              <IconTrash size={14} stroke={2} />
            </button>
          )}

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              tapLight();
              setDetailsOpen((v) => !v);
            }}
            style={{
              background: "transparent",
              color: "#2B7BC8",
              border: "0.5px solid #E5E5EA",
              borderRadius: 8,
              padding: "7px 12px",
              fontSize: 12,
              fontWeight: 500,
              cursor: "pointer",
              ...POPPINS,
            }}
          >
            {detailsOpen ? "Hide details" : "More details"}
          </button>
        </div>
      </div>
    </div>
  );
}


function MyRequestCard({
  request: r,
  onRefresh,
}: {
  request: SwapRequest;
  onRefresh: () => void;
}) {
  const status = (r.status ?? "pending").toLowerCase();
  const isPending = status === "pending";
  const isMatched = status === "matched";

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

  async function handleDelete() {
    const { error } = await supabase.from("test_swap_requests").delete().eq("id", r.id);
    if (error) {
      toast.error(error.message || "Could not delete request");
    } else {
      toast.success("Request removed");
    }
    onRefresh();
  }

  const statusPill = {
    pending: { bg: "#FEF3C7", color: "#D68A1B", text: "PENDING" },
    matched: { bg: "#DCFCE7", color: "#15803D", text: "MATCHED \u2713" },
    closed: { bg: "#EEF2F7", color: "#9CA3AF", text: "CLOSED" },
  }[status as "pending" | "matched" | "closed"] || {
    bg: "#FEF3C7",
    color: "#D68A1B",
    text: "PENDING",
  };

  return (
    <div style={{ marginBottom: 8 }}>
      <div
        style={{
          background: "#fff",
          borderRadius: 16,
          border: "1px solid #E4E8EF",
          padding: "14px 16px",
        }}
      >
        {/* Top row */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span
            style={{
              color: tokens.navy,
              fontSize: 14,
              fontWeight: tokens.fontWeight.bold,
              ...SORA,
            }}
          >
            {r.name || "Pupil"}
          </span>
          <span
            style={{
              background: statusPill.bg,
              color: statusPill.color,
              fontSize: 10,
              fontWeight: 700,
              borderRadius: 20,
              padding: "2px 8px",
              textTransform: "uppercase",
              ...POPPINS,
            }}
          >
            {statusPill.text}
          </span>
        </div>

        {/* Middle row */}
        <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 4 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <IconMapPin size={13} color="#9CA3AF" stroke={1.5} />
            <span style={{ color: "#6B7686", fontSize: 13, ...POPPINS }}>
              {r.test_centre || "No test centre"}
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <IconCalendar size={13} color="#9CA3AF" stroke={1.5} />
            <span style={{ color: "#6B7686", fontSize: 13, ...POPPINS }}>
              {formatDate(r.current_test_date)}
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <IconClock size={13} color="#9CA3AF" stroke={1.5} />
            <span style={{ color: "#6B7686", fontSize: 13, ...POPPINS }}>
              {r.current_test_time ? String(r.current_test_time).slice(0, 5) : "No time"}
            </span>
          </div>
        </div>

        {r.transmission && (
          <span
            style={{
              display: "inline-flex",
              marginTop: 8,
              background: "#EEF2F7",
              color: "#6B7686",
              fontSize: 10,
              fontWeight: 600,
              borderRadius: 20,
              padding: "2px 8px",
              textTransform: "capitalize",
              ...POPPINS,
            }}
          >
            {r.transmission}
          </span>
        )}

        {/* Bottom row */}
        <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
          {isPending && (
            <button
              type="button"
              onClick={() => {
                tapLight();
                handleMarkMatched();
              }}
              style={{
                background: "#DCFCE7",
                color: "#15803D",
                fontSize: 12,
                fontWeight: 700,
                borderRadius: 20,
                padding: "6px 14px",
                border: "none",
                cursor: "pointer",
                ...POPPINS,
              }}
            >
              Mark as matched
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              tapLight();
              handleDelete();
            }}
            style={{
              background: "#FEE2E2",
              color: "#CC2229",
              fontSize: 12,
              fontWeight: 700,
              borderRadius: 20,
              padding: "6px 14px",
              border: "none",
              cursor: "pointer",
              ...POPPINS,
            }}
          >
            Delete
          </button>
        </div>
      </div>

      {/* Matched banner */}
      {isMatched && (
        <div
          style={{
            background: "#DCFCE7",
            borderRadius: "0 0 16px 16px",
            padding: "8px 16px",
            fontSize: 12,
            color: "#15803D",
            ...POPPINS,
          }}
        >
          🎉 Swap matched — contact the other instructor to confirm
        </div>
      )}
    </div>
  );
}

function SwapRequestList({
  rows,
  userId,
  onRefresh,
  onNew,
}: {
  rows: SwapRequest[];
  userId: string | null;
  onRefresh: () => void;
  onNew: () => void;
}) {
  const navigate = useNavigate();
  const [filterCentre, setFilterCentre] = useState("");
  const [filterCentreResults, setFilterCentreResults] = useState<any[]>([]);
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");
  const [filterTimeFrom, setFilterTimeFrom] = useState("");
  const [filterTimeTo, setFilterTimeTo] = useState("");
  const [moreOpen, setMoreOpen] = useState(false);
  const [tab, setTab] = useState<"all" | "mine" | "matches">("all");
  const [selectedSwap, setSelectedSwap] = useState<any | null>(null);
  const [swapping, setSwapping] = useState(false);

  /** Register interest in a community swap, open a DM, notify the poster. */
  async function handleICanSwap() {
    if (!selectedSwap || swapping) return;
    const swap = selectedSwap;
    const otherId = swap.instructor_id as string | undefined;
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user || !otherId || otherId === user.id) return;

    setSwapping(true);
    try {
      // 1. Record the expression of interest (table is optional — ignore if absent).
      await supabase
        .from("swap_expressions")
        .insert({
          swap_request_id: swap.id,
          instructor_id: user.id,
          status: "interested",
        } as never);

      // 2. Reuse an existing instructor conversation or create one.
      let conversationId: string | null = null;
      const { data: existing } = await supabase
        .from("instructor_conversations")
        .select("id")
        .or(
          `and(instructor_a_id.eq.${user.id},instructor_b_id.eq.${otherId}),and(instructor_a_id.eq.${otherId},instructor_b_id.eq.${user.id})`,
        )
        .maybeSingle();
      if (existing) {
        conversationId = (existing as any).id;
      } else {
        const { data: created, error: convError } = await supabase
          .from("instructor_conversations")
          .insert({
            instructor_a_id: user.id,
            instructor_b_id: otherId,
            subject: `Test swap: ${swap.test_centre} on ${swap.current_test_date}`,
            swap_request_id: swap.id,
          } as never)
          .select("id")
          .single();
        if (convError || !created) {
          toast.error("Could not register interest");
          return;
        }
        conversationId = (created as any).id;
      }

      // 3. Send the opening message.
      const body = `Hi! I saw your test swap request for ${swap.test_centre ?? "your test centre"} on ${formatDate(swap.current_test_date)}. I may be able to help — can we arrange a swap?`;
      if (conversationId) {
        await supabase.from("instructor_messages").insert({
          conversation_id: conversationId,
          from_instructor_id: user.id,
          to_instructor_id: otherId,
          body,
        } as never);
        await supabase
          .from("instructor_conversations")
          .update({
            last_message: body,
            last_message_at: new Date().toISOString(),
          } as never)
          .eq("id", conversationId);
      }

      // 4. Push notification to the poster (best effort).
      try {
        await supabase.functions.invoke("send-push", {
          body: {
            instructor_id: otherId,
            title: "🔄 Test swap interest!",
            body: `An instructor is interested in your ${swap.test_centre ?? "test"} swap — tap to message them`,
            url: conversationId ? `/messages/instructor/${conversationId}` : "/messages",
            type: "swap_interest",
          },
        });
      } catch {
        /* non-fatal */
      }

      toast.success("Interest registered! Opening messages…");
      setSelectedSwap(null);
      if (conversationId) {
        navigate({
          to: "/messages/instructor/$conversationId" as never,
          params: { conversationId } as never,
        });
      } else {
        navigate({ to: "/messages" });
      }
    } finally {
      setSwapping(false);
    }
  }


  const myRequests = rows.filter((r) => r.instructor_id === userId);

  const filtered = rows.filter((r) => {
    if (filterCentre && !r.test_centre?.toLowerCase().includes(filterCentre.toLowerCase())) return false;
    if (filterFrom && r.current_test_date && r.current_test_date < filterFrom) return false;
    if (filterTo && r.current_test_date && r.current_test_date > filterTo) return false;
    const rTime = normalizeTime(r.current_test_time);
    if (filterTimeFrom && rTime && rTime < filterTimeFrom) return false;
    if (filterTimeTo && rTime && rTime > filterTimeTo) return false;
    return true;
  });

  const matched = rows.filter((r) => (r.status ?? "").toLowerCase() === "matched");

  const activeFilterCount = [filterCentre, filterFrom, filterTo, filterTimeFrom, filterTimeTo].filter(
    Boolean
  ).length;
  const hasActiveFilters = activeFilterCount > 0;

  function clearFilters() {
    setFilterCentre("");
    setFilterCentreResults([]);
    setFilterFrom("");
    setFilterTo("");
    setFilterTimeFrom("");
    setFilterTimeTo("");
  }

  async function handleCentreSearch(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value;
    setFilterCentre(value);
    if (value.length > 1) {
      const { data } = await supabase
        .from("test_centres")
        .select("id, name, town")
        .ilike("name", `%${value}%`)
        .limit(5);
      setFilterCentreResults(data ?? []);
    } else {
      setFilterCentreResults([]);
    }
  }

  function selectCentre(centre: any) {
    setFilterCentre(centre.name ?? "");
    setFilterCentreResults([]);
  }

  const searchFieldLabel: React.CSSProperties = {
    color: "#000000",
    fontSize: 12,
    fontWeight: 500,
    marginBottom: 5,
    ...POPPINS,
  };

  /** Bordered field shell: icon + input in a horizontal flex row. */
  const fieldBox: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: 8,
    background: "#FFFFFF",
    border: "0.5px solid #E5E5EA",
    borderRadius: 9,
    padding: "10px 12px",
    boxSizing: "border-box",
  };

  const searchInput: React.CSSProperties = {
    flex: 1,
    minWidth: 0,
    width: "100%",
    background: "transparent",
    border: "none",
    outline: "none",
    padding: 0,
    fontSize: 13,
    color: "#000000",
    boxSizing: "border-box",
    ...POPPINS,
  };

  const tabs: { id: "all" | "mine" | "matches"; label: string; count?: number }[] = [
    { id: "all", label: "All", count: filtered.length },
    { id: "mine", label: "My requests", count: myRequests.length },
    { id: "matches", label: "Matches", count: matched.length },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* Search swaps card */}
      <div
        style={{
          background: "#fff",
          borderRadius: "0 0 18px 18px",
          margin: `-20px -${tokens.pagePadding}px 0`,
          padding: `4px ${tokens.pagePadding}px 18px`,
          display: "flex",
          flexDirection: "column",
          gap: 14,
        }}
      >

        <div
          style={{
            color: "#000000",
            fontSize: 15,
            fontWeight: 500,
            letterSpacing: -0.2,
            ...POPPINS,
          }}
        >
          Search swaps
        </div>

        {/* Test centre */}
        <div style={{ position: "relative" }}>
          <div style={searchFieldLabel}>Test centre</div>
          <div style={fieldBox}>
            <IconMapPin size={15} stroke={2} color="#6E6E73" style={{ flexShrink: 0 }} />
            <input
              type="text"
              placeholder="All test centres"
              value={filterCentre}
              onChange={handleCentreSearch}
              style={searchInput}
            />
          </div>
          {filterCentreResults.length > 0 && (
            <div
              style={{
                position: "absolute",
                top: "100%",
                left: 0,
                right: 0,
                marginTop: 4,
                background: "#fff",
                borderRadius: 10,
                border: "0.5px solid #E5E5EA",
                boxShadow: "0 4px 12px rgba(11,31,58,0.12)",
                zIndex: 10,
                overflow: "hidden",
              }}
            >
              {filterCentreResults.map((c) => (
                <button
                  key={String(c.id)}
                  type="button"
                  onClick={() => selectCentre(c)}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    padding: "10px 12px",
                    border: "none",
                    background: "transparent",
                    borderBottom: "0.5px solid #E5E5EA",
                    cursor: "pointer",
                    fontSize: 13,
                    color: "#000000",
                    ...POPPINS,
                  }}
                >
                  {c.name}
                  {c.town ? ` — ${c.town}` : ""}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* From / To dates */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 10,
          }}
        >
          <div>
            <div style={searchFieldLabel}>From date</div>
            <div style={fieldBox}>
              <IconCalendar size={14} stroke={2} color="#C7C7CC" style={{ flexShrink: 0 }} />
              <input
                type="date"
                value={filterFrom}
                onChange={(e) => setFilterFrom(e.target.value)}
                style={{ ...searchInput, fontSize: 12, color: filterFrom ? "#000000" : "#C7C7CC" }}
              />
            </div>
          </div>

          <div>
            <div style={searchFieldLabel}>To date</div>
            <div style={fieldBox}>
              <IconCalendar size={14} stroke={2} color="#C7C7CC" style={{ flexShrink: 0 }} />
              <input
                type="date"
                value={filterTo}
                onChange={(e) => setFilterTo(e.target.value)}
                style={{ ...searchInput, fontSize: 12, color: filterTo ? "#000000" : "#C7C7CC" }}
              />
            </div>
          </div>
        </div>

        {moreOpen && (
          <div>
            <div style={searchFieldLabel}>Time window</div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ ...fieldBox, flex: 1 }}>
                <IconClock size={14} stroke={2} color="#C7C7CC" style={{ flexShrink: 0 }} />
                <input
                  type="time"
                  value={filterTimeFrom}
                  onChange={(e) => setFilterTimeFrom(e.target.value)}
                  style={searchInput}
                />
              </div>
              <span style={{ color: "#6E6E73", fontSize: 12, ...POPPINS }}>to</span>
              <div style={{ ...fieldBox, flex: 1 }}>
                <IconClock size={14} stroke={2} color="#C7C7CC" style={{ flexShrink: 0 }} />
                <input
                  type="time"
                  value={filterTimeTo}
                  onChange={(e) => setFilterTimeTo(e.target.value)}
                  style={searchInput}
                />
              </div>
            </div>
          </div>
        )}

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <button
            type="button"
            onClick={() => {
              tapLight();
              setMoreOpen((v) => !v);
            }}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              background: "transparent",
              border: "none",
              padding: 0,
              color: "#2B7BC8",
              fontSize: 12,
              fontWeight: 500,
              cursor: "pointer",
              ...POPPINS,
            }}
          >
            <IconFilter size={13} stroke={2} />
            More filters
            {hasActiveFilters && (
              <span
                style={{
                  background: "#2B7BC8",
                  color: "#fff",
                  fontSize: 10,
                  fontWeight: 500,
                  borderRadius: 999,
                  padding: "2px 6px",
                }}
              >
                {activeFilterCount}
              </span>
            )}
          </button>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearFilters}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#CC2229",
                  fontSize: 12,
                  fontWeight: 500,
                  cursor: "pointer",
                  padding: 0,
                  ...POPPINS,
                }}
              >
                Clear
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                tapLight();
                setTab("all");
              }}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                background: "#2B7BC8",
                color: "#FFFFFF",
                border: "none",
                borderRadius: 9,
                padding: "9px 16px",
                fontSize: 13,
                fontWeight: 500,
                cursor: "pointer",
                ...POPPINS,
              }}
            >
              <IconSearch size={14} stroke={2.2} />
              Search swaps
            </button>
          </div>
        </div>
      </div>

      {/* Tabs — shared segmented control */}
      <SegmentedTabs
        tabs={tabs}
        active={tab}
        onChange={(id) => {
          tapLight();
          setTab(id);
        }}
        style={{ margin: "2px 0 4px" }}
      />

      {/* Lists */}
      {tab === "all" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {filtered.map((r) => {
            const isMine = r.instructor_id === userId;
            return (
              <SwapCard
                key={String(r.id)}
                request={r}
                mode={isMine ? "mine" : "community"}
                onRefresh={onRefresh}
                onSelect={isMine ? undefined : () => setSelectedSwap(r)}
              />
            );
          })}
          {filtered.length === 0 && (
            <div
              style={{
                color: tokens.textSecondary,
                fontSize: 14,
                textAlign: "center",
                padding: "20px 0",
                ...POPPINS,
              }}
            >
              No swap requests match your search
            </div>
          )}
        </div>
      )}

      {tab === "mine" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {myRequests.length === 0 ? (
            <div style={{ padding: 16, textAlign: "center" }}>
              <div style={{ color: "#9CA3AF", fontSize: 13, ...POPPINS }}>No active swap requests</div>
              <div style={{ color: "#9CA3AF", fontSize: 13, marginTop: 4, ...POPPINS }}>
                Post a request to find a swap
              </div>
            </div>
          ) : (
            myRequests.map((r) => (
              <MyRequestCard key={String(r.id)} request={r} onRefresh={onRefresh} />
            ))
          )}
        </div>
      )}

      {tab === "matches" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {matched.length === 0 ? (
            <div
              style={{
                color: "#9CA3AF",
                fontSize: 13,
                textAlign: "center",
                padding: 16,
                ...POPPINS,
              }}
            >
              No matched swaps yet
            </div>
          ) : (
            matched.map((r) => {
              const isMine = r.instructor_id === userId;
              return (
                <SwapCard
                  key={String(r.id)}
                  request={r}
                  mode={isMine ? "mine" : "community"}
                  onRefresh={onRefresh}
                  onSelect={isMine ? undefined : () => setSelectedSwap(r)}
                />
              );
            })
          )}
        </div>
      )}

      {/* Tip banner */}
      <div
        style={{
          background: "#F2F6FC",
          borderRadius: 16,
          padding: 14,
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}
      >
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: "50%",
            background: tokens.blue,
            color: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            fontSize: 18,
            fontWeight: 700,
            ...SORA,
          }}
        >
          i
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              color: tokens.blue,
              fontSize: 13,
              fontWeight: tokens.fontWeight.bold,
              ...POPPINS,
            }}
          >
            Tip
          </div>
          <div style={{ color: "#6B7686", fontSize: 13, marginTop: 2, ...POPPINS }}>
            Set your test centre &amp; date filters to find swaps that match your availability.
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            tapLight();
            onNew();
          }}
          style={{
            background: "#fff",
            color: tokens.blue,
            border: `1px solid ${tokens.blue}`,
            borderRadius: 12,
            padding: "10px 14px",
            fontSize: 13,
            fontWeight: tokens.fontWeight.bold,
            cursor: "pointer",
            whiteSpace: "nowrap",
            ...POPPINS,
          }}
        >
          New request
        </button>
      </div>

      {/* More details bottom sheet for community swaps */}
      {selectedSwap && (
        <div
          onClick={() => setSelectedSwap(null)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 300,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "center",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#EEF2F7",
              borderRadius: "22px 22px 0 0",
              padding: "0 0 32px",
              width: "100%",
              maxWidth: 520,
              display: "flex",
              flexDirection: "column",
            }}
          >
            {/* Handle + X button row */}
            <div
              style={{
                position: "relative",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "12px 16px 0",
              }}
            >
              <div
                style={{
                  width: 36,
                  height: 5,
                  borderRadius: 3,
                  background: "#DADFE5",
                }}
              />
              <button
                type="button"
                onClick={() => setSelectedSwap(null)}
                aria-label="Close"
                style={{
                  position: "absolute",
                  right: 16,
                  top: 8,
                  width: 30,
                  height: 30,
                  borderRadius: "50%",
                  background: "#fff",
                  border: "none",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <IconX size={16} color="#6B7686" stroke={2} />
              </button>
            </div>

            {/* Header card */}
            <div
              style={{
                margin: 16,
                background: "linear-gradient(135deg, #14509E, #0B1F3A)",
                borderRadius: 16,
                padding: 16,
                ...POPPINS,
              }}
            >
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  background: "rgba(255,255,255,0.2)",
                  color: "#fff",
                  fontSize: 10,
                  fontWeight: 800,
                  borderRadius: 20,
                  padding: "3px 10px",
                  textTransform: "uppercase",
                }}
              >
                Test swap
              </div>
              <div
                style={{
                  fontSize: 20,
                  fontWeight: 800,
                  color: "#fff",
                  marginTop: 8,
                  ...SORA,
                }}
              >
                {selectedSwap.name || "Pupil"}
              </div>

              {/* Details grid */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 8,
                  marginTop: 14,
                }}
              >
                <div
                  style={{
                    background: "rgba(255,255,255,0.12)",
                    borderRadius: 10,
                    padding: "10px 12px",
                  }}
                >
                  <div style={{ fontSize: 9, color: "rgba(255,255,255,0.5)", fontWeight: 700, textTransform: "uppercase" }}>
                    Test centre
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#fff", marginTop: 4 }}>
                    {selectedSwap.test_centre || "—"}
                  </div>
                </div>
                <div
                  style={{
                    background: "rgba(255,255,255,0.12)",
                    borderRadius: 10,
                    padding: "10px 12px",
                  }}
                >
                  <div style={{ fontSize: 9, color: "rgba(255,255,255,0.5)", fontWeight: 700, textTransform: "uppercase" }}>
                    Date
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#fff", marginTop: 4 }}>
                    {formatDate(selectedSwap.current_test_date)}
                  </div>
                </div>
                <div
                  style={{
                    background: "rgba(255,255,255,0.12)",
                    borderRadius: 10,
                    padding: "10px 12px",
                  }}
                >
                  <div style={{ fontSize: 9, color: "rgba(255,255,255,0.5)", fontWeight: 700, textTransform: "uppercase" }}>
                    Time
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#fff", marginTop: 4 }}>
                    {selectedSwap.current_test_time
                      ? String(selectedSwap.current_test_time).slice(0, 5)
                      : "—"}
                  </div>
                </div>
                <div
                  style={{
                    background: "rgba(255,255,255,0.12)",
                    borderRadius: 10,
                    padding: "10px 12px",
                  }}
                >
                  <div style={{ fontSize: 9, color: "rgba(255,255,255,0.5)", fontWeight: 700, textTransform: "uppercase" }}>
                    Transmission
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#fff", marginTop: 4, textTransform: "capitalize" }}>
                    {selectedSwap.transmission || "—"}
                  </div>
                </div>
              </div>

              {selectedSwap.notes && (
                <div
                  style={{
                    background: "rgba(255,255,255,0.12)",
                    borderRadius: 10,
                    padding: "10px 12px",
                    marginTop: 8,
                  }}
                >
                  <div style={{ fontSize: 9, color: "rgba(255,255,255,0.5)", fontWeight: 700, textTransform: "uppercase" }}>
                    Notes
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: "#fff", marginTop: 4, lineHeight: 1.4 }}>
                    {selectedSwap.notes}
                  </div>
                </div>
              )}
            </div>

            {/* Posted by */}
            <div
              style={{
                margin: "0 16px 8px",
                fontSize: 13,
                color: "#6B7686",
                ...POPPINS,
              }}
            >
              Posted by {selectedSwap.instructor_name || "another instructor"}
            </div>

            {/* Action buttons */}
            <div
              style={{
                margin: "0 16px",
                display: "flex",
                flexDirection: "column",
                gap: 8,
              }}
            >
              {/* Primary: express interest + open a DM */}
              <button
                type="button"
                disabled={swapping}
                onClick={() => {
                  tapLight();
                  void handleICanSwap();
                }}
                style={{
                  background: "linear-gradient(135deg, #14509E, #0B1F3A)",
                  color: "#fff",
                  borderRadius: 20,
                  padding: 14,
                  fontSize: 14,
                  fontWeight: 800,
                  width: "100%",
                  border: "none",
                  cursor: swapping ? "default" : "pointer",
                  boxShadow: "0 4px 0 #091628",
                  opacity: swapping ? 0.6 : 1,
                  ...POPPINS,
                }}
              >
                {swapping ? "Sending…" : "I can swap this 🔄"}
              </button>

              <div style={{ display: "flex", gap: 8 }}>
                {selectedSwap.instructor_phone && (
                  <button
                    type="button"
                    onClick={() => {
                      tapLight();
                      window.open(`tel:${selectedSwap.instructor_phone}`, "_blank");
                    }}
                    style={{
                      flex: 1,
                      height: 44,
                      background: "#fff",
                      color: "#15803D",
                      border: "1px solid #E4E8EF",
                      borderRadius: 20,
                      fontSize: 13,
                      fontWeight: 700,
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 6,
                      ...POPPINS,
                    }}
                  >
                    <IconPhone size={15} stroke={2} />
                    Call
                  </button>
                )}
                {selectedSwap.instructor_phone && (
                  <button
                    type="button"
                    onClick={() => {
                      tapLight();
                      window.open(
                        `sms:${selectedSwap.instructor_phone}?body=${encodeURIComponent(
                          "Hi, I saw your test swap request on EDP. I may be able to help — can we chat?"
                        )}`,
                        "_blank"
                      );
                    }}
                    style={{
                      flex: 1,
                      height: 44,
                      background: "#fff",
                      color: "#1877D6",
                      border: "1px solid #E4E8EF",
                      borderRadius: 20,
                      fontSize: 13,
                      fontWeight: 700,
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 6,
                      ...POPPINS,
                    }}
                  >
                    <IconMessage size={15} stroke={2} />
                    Text
                  </button>
                )}
              </div>
            </div>


            {/* Dismiss button */}
            <button
              type="button"
              onClick={() => setSelectedSwap(null)}
              style={{
                margin: "12px 16px 0",
                background: "transparent",
                color: "#9CA3AF",
                fontSize: 13,
                border: "none",
                cursor: "pointer",
                ...POPPINS,
              }}
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

    </div>
  );
}


function TestSwapPage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<SwapRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    setUserId(user?.id ?? null);
    const { data, error } = await supabase
      .from("test_swap_requests")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      toast.error("Could not load swap requests");
      setRows([]);
    } else {
      const swapRows = (data ?? []) as SwapRequest[];
      const instructorIds = Array.from(
        new Set(
          swapRows
            .map((row) => row.instructor_id)
            .filter((id): id is string => Boolean(id))
        )
      );
      const contactsById = new Map<string, { name: string | null; phone: string | null }>();

      if (instructorIds.length > 0) {
        const { data: instructors } = await supabase
          .from("instructors")
          .select("id, name, phone")
          .in("id", instructorIds);

        for (const instructor of instructors ?? []) {
          contactsById.set(String(instructor.id), {
            name: instructor.name ?? null,
            phone: instructor.phone ?? null,
          });
        }
      }

      setRows(
        swapRows.map((row) => {
          const contact = row.instructor_id ? contactsById.get(row.instructor_id) : undefined;
          return {
            ...row,
            instructor_name: contact?.name ?? null,
            instructor_phone: contact?.phone ?? null,
          };
        })
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
            gap: 5,
            background: "#2B7BC8",
            color: "#FFFFFF",
            border: "none",
            borderRadius: 9,
            padding: "10px 14px",
            fontSize: 13,
            fontWeight: 500,
            cursor: "pointer",
            ...POPPINS,
          }}
        >
          <IconPlus size={15} stroke={2.2} />
          New request
        </button>
      }
    >
      <div
        style={{
          padding: `20px ${tokens.pagePadding}px 40px`,
          background: "#F4F6F8",
          minHeight: "100%",
          boxSizing: "border-box",
        }}
      >
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
          <SwapRequestList rows={rows} userId={userId} onRefresh={load} onNew={() => setSheetOpen(true)} />
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
