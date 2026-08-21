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
  IconChevronDown,
  IconFilter,
  IconPhone,
  IconTrash,
  IconCheck,
  IconSearch,
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
  transmission?: string | null;
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
  const av = avatarColor(r.name);
  const time = r.current_test_time ? String(r.current_test_time).slice(0, 5) : null;

  const [detailsOpen, setDetailsOpen] = useState(false);

  return (
    <div
      style={{
        background: "#fff",
        borderRadius: 18,
        boxShadow: "0 1px 4px rgba(11,31,58,0.07)",
        padding: 16,
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
          <IconHourglass size={11} stroke={2.5} />
          {(r.status ?? "pending").toUpperCase()}
        </DSMPill>
        <IconChevronRight size={18} color="#C3CAD6" stroke={2} style={{ flexShrink: 0 }} />
      </div>

      {/* Two columns with centre divider + swap icon */}
      <div
        style={{
          marginTop: 14,
          display: "grid",
          gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)",
          columnGap: 16,
          position: "relative",
        }}
      >
        {/* divider */}
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: 0,
            bottom: 0,
            width: 1,
            background: "#E4E8EF",
            transform: "translateX(-0.5px)",
          }}
        />
        {/* swap badge */}
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: "50%",
            transform: "translate(-50%,-50%)",
            width: 34,
            height: 34,
            borderRadius: "50%",
            background: "#fff",
            border: "1px solid #E4E8EF",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: tokens.blue,
            zIndex: 2,
          }}
        >
          <IconArrowsLeftRight size={16} stroke={2} />
        </div>

        {/* Current test */}
        <div style={{ minWidth: 0, paddingRight: 22, display: "flex", flexDirection: "column", gap: 8 }}>
          <div
            style={{
              color: tokens.blue,
              fontSize: 13,
              fontWeight: tokens.fontWeight.bold,
            }}
          >
            Current test
          </div>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
            <IconCalendar size={15} stroke={2} color={tokens.blue} style={{ flexShrink: 0, marginTop: 2 }} />
            <span
              style={{
                color: tokens.navy,
                fontSize: 14,
                fontWeight: tokens.fontWeight.bold,
                lineHeight: 1.35,
                ...SORA,
              }}
            >
              {formatDate(r.current_test_date)}
              {time ? ` · ${time}` : ""}
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
            <IconMapPin size={15} stroke={2} color={tokens.blue} style={{ flexShrink: 0, marginTop: 1 }} />
            <span style={{ color: "#6B7686", fontSize: 13, lineHeight: 1.35 }}>
              {r.test_centre || "No test centre"}
            </span>
          </div>
        </div>

        {/* Wants */}
        <div style={{ minWidth: 0, paddingLeft: 22, display: "flex", flexDirection: "column", gap: 8 }}>
          <div
            style={{
              color: tokens.purple,
              fontSize: 13,
              fontWeight: tokens.fontWeight.bold,
            }}
          >
            Wants
          </div>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
            <IconCalendar size={15} stroke={2} color={tokens.purple} style={{ flexShrink: 0, marginTop: 2 }} />
            <span
              style={{
                color: tokens.navy,
                fontSize: 14,
                fontWeight: tokens.fontWeight.bold,
                lineHeight: 1.35,
                ...SORA,
              }}
            >
              Any day, any time
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
            <IconMapPin size={15} stroke={2} color={tokens.purple} style={{ flexShrink: 0, marginTop: 1 }} />
            <span style={{ color: "#6B7686", fontSize: 13, lineHeight: 1.35 }}>Anywhere</span>
          </div>
        </div>
      </div>

      {detailsOpen && (
        <div
          style={{
            marginTop: 14,
            paddingTop: 12,
            borderTop: "1px solid #EEF1F6",
            display: "flex",
            flexDirection: "column",
            gap: 6,
            color: "#6B7686",
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

      {/* Footer */}
      <div
        style={{
          marginTop: 14,
          paddingTop: 12,
          borderTop: "1px solid #EEF1F6",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
          flexWrap: "wrap",
        }}
      >
        <span style={{ color: "#9CA3AF", fontSize: 13 }}>
          Created {formatCreated(r.created_at)}
        </span>

        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          {mode === "community" && r.instructor_phone && (
            <button
              type="button"
              onClick={() => {
                tapLight();
                handleContact();
              }}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                background: "#E6F1FB",
                color: tokens.blue,
                border: "none",
                borderRadius: 999,
                padding: "8px 14px",
                fontSize: 13,
                fontWeight: tokens.fontWeight.bold,
                cursor: "pointer",
                ...POPPINS,
              }}
            >
              <IconPhone size={14} stroke={2} />
              Contact
            </button>
          )}

          {mode === "mine" && isPending && (
            <button
              type="button"
              onClick={() => {
                tapLight();
                handleMarkMatched();
              }}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                background: "#DCFCE7",
                color: tokens.green,
                border: "none",
                borderRadius: 999,
                padding: "8px 14px",
                fontSize: 13,
                fontWeight: tokens.fontWeight.bold,
                cursor: "pointer",
                ...POPPINS,
              }}
            >
              <IconCheck size={14} stroke={2} />
              Mark matched
            </button>
          )}

          {mode === "mine" && (
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
                width: 34,
                height: 34,
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
          )}

          <button
            type="button"
            onClick={() => {
              tapLight();
              setDetailsOpen((v) => !v);
            }}
            style={{
              background: "#fff",
              color: tokens.blue,
              border: `1px solid ${tokens.blue}`,
              borderRadius: 12,
              padding: "9px 16px",
              fontSize: 13,
              fontWeight: tokens.fontWeight.bold,
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
  const [filterCentre, setFilterCentre] = useState("");
  const [filterCentreResults, setFilterCentreResults] = useState<any[]>([]);
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");
  const [filterTimeFrom, setFilterTimeFrom] = useState("");
  const [filterTimeTo, setFilterTimeTo] = useState("");
  const [moreOpen, setMoreOpen] = useState(false);
  const [tab, setTab] = useState<"all" | "mine" | "matches">("all");

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
    color: "#6B7686",
    fontSize: 13,
    marginBottom: 6,
    ...POPPINS,
  };

  const searchInput: React.CSSProperties = {
    width: "100%",
    background: "#fff",
    border: "1px solid #E4E8EF",
    borderRadius: 12,
    padding: "11px 12px",
    fontSize: 14,
    color: tokens.navy,
    boxSizing: "border-box",
    ...POPPINS,
  };

  const tabs = [
    { key: "all" as const, label: "All" },
    { key: "mine" as const, label: "My requests" },
    { key: "matches" as const, label: "Matches" },
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
            color: tokens.navy,
            fontSize: 17,
            fontWeight: tokens.fontWeight.bold,
            ...SORA,
          }}
        >
          Search swaps
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 12,
          }}
        >
          <div style={{ gridColumn: "1 / -1", position: "relative" }}>
            <div style={searchFieldLabel}>Test centre</div>
            <div style={{ position: "relative" }}>
              <IconMapPin
                size={16}
                stroke={2}
                color="#9CA3AF"
                style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }}
              />
              <input
                type="text"
                placeholder="All test centres"
                value={filterCentre}
                onChange={handleCentreSearch}
                style={{ ...searchInput, paddingLeft: 36 }}
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
                  borderRadius: 12,
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
                      borderBottom: "1px solid #E4E8EF",
                      cursor: "pointer",
                      fontSize: 14,
                      color: tokens.navy,
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

          <div>
            <div style={searchFieldLabel}>From date</div>
            <input
              type="date"
              value={filterFrom}
              onChange={(e) => setFilterFrom(e.target.value)}
              style={searchInput}
            />
          </div>

          <div>
            <div style={searchFieldLabel}>To date</div>
            <input
              type="date"
              value={filterTo}
              onChange={(e) => setFilterTo(e.target.value)}
              style={searchInput}
            />
          </div>
        </div>

        {moreOpen && (
          <div>
            <div
              style={{
                color: "#9CA3AF",
                fontSize: 11,
                fontWeight: 700,
                textTransform: "uppercase",
                marginBottom: 6,
                ...POPPINS,
              }}
            >
              TIME WINDOW
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <input
                type="time"
                value={filterTimeFrom}
                onChange={(e) => setFilterTimeFrom(e.target.value)}
                style={{ ...searchInput, flex: 1 }}
              />
              <span style={{ color: tokens.textSecondary, fontSize: 13, ...POPPINS }}>to</span>
              <input
                type="time"
                value={filterTimeTo}
                onChange={(e) => setFilterTimeTo(e.target.value)}
                style={{ ...searchInput, flex: 1 }}
              />
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
              gap: 8,
              background: "transparent",
              border: "none",
              padding: 0,
              color: tokens.blue,
              fontSize: 14,
              fontWeight: tokens.fontWeight.bold,
              cursor: "pointer",
              ...POPPINS,
            }}
          >
            <IconFilter size={16} stroke={2} />
            More filters
            {hasActiveFilters && (
              <span
                style={{
                  background: tokens.blue,
                  color: "#fff",
                  fontSize: 10,
                  fontWeight: 700,
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
                  fontWeight: tokens.fontWeight.bold,
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
                gap: 8,
                background: tokens.blue,
                color: "#fff",
                border: "none",
                borderRadius: 12,
                padding: "12px 18px",
                fontSize: 14,
                fontWeight: tokens.fontWeight.bold,
                cursor: "pointer",
                ...POPPINS,
              }}
            >
              <IconSearch size={16} stroke={2.2} />
              Search swaps
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div
        style={{
          background: "#fff",
          borderRadius: 16,
          boxShadow: "0 1px 4px rgba(11,31,58,0.06)",
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          overflow: "hidden",
        }}
      >
        {tabs.map((t) => {
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => {
                tapLight();
                setTab(t.key);
              }}
              style={{
                background: "transparent",
                border: "none",
                borderBottom: active ? `3px solid ${tokens.blue}` : "3px solid transparent",
                padding: "14px 6px",
                fontSize: 14,
                fontWeight: tokens.fontWeight.bold,
                color: active ? tokens.blue : "#6B7686",
                cursor: "pointer",
                ...POPPINS,
              }}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Lists */}
      {tab === "all" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {filtered.map((r) => (
            <SwapCard
              key={String(r.id)}
              request={r}
              mode={r.instructor_id === userId ? "mine" : "community"}
              onRefresh={onRefresh}
            />
          ))}
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
            matched.map((r) => (
              <SwapCard
                key={String(r.id)}
                request={r}
                mode={r.instructor_id === userId ? "mine" : "community"}
                onRefresh={onRefresh}
              />
            ))
          )}
        </div>
      )}

      {/* Footer prompt */}
      <div
        style={{
          background: "#F5F7FA",
          borderRadius: 16,
          padding: 16,
          display: "flex",
          alignItems: "center",
          gap: 14,
        }}
      >
        <div
          style={{
            width: 42,
            height: 42,
            borderRadius: "50%",
            background: "#E6F1FB",
            color: tokens.blue,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <IconSearch size={20} stroke={2} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              color: tokens.navy,
              fontSize: 14,
              fontWeight: tokens.fontWeight.bold,
              ...SORA,
            }}
          >
            Can’t find what you’re looking for?
          </div>
          <div style={{ color: "#6B7686", fontSize: 13, marginTop: 2, ...POPPINS }}>
            Try adjusting your search filters or create a new request.
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
      <div
        style={{
          padding: `20px ${tokens.pagePadding}px 40px`,
          background: "#F5F7FA",
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
