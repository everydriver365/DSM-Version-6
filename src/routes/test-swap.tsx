import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  IconArrowsLeftRight,
  IconPlus,
  IconCalendar,
  IconMapPin,
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

function TestSwapPage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<SwapRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [sheetOpen, setSheetOpen] = useState(false);

  async function load() {
    setLoading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setRows([]);
      setLoading(false);
      return;
    }
    // The swap board is shared across instructors and has no owner column,
    // so scope to this instructor's own pupils by name (same as the home tile).
    const { data: myPupils } = await supabase
      .from("pupils")
      .select("name")
      .eq("instructor_id", user.id);
    const names = (myPupils ?? []).map((p: { name: string | null }) => p.name).filter(Boolean) as string[];
    if (names.length === 0) {
      setRows([]);
      setLoading(false);
      return;
    }
    const { data, error } = await supabase
      .from("test_swap_requests")
      .select("*")
      .in("name", names)
      .order("created_at", { ascending: false });
    if (error) {
      toast.error("Could not load swap requests");
      setRows([]);
    } else {
      setRows((data ?? []) as SwapRequest[]);
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
            background: "rgba(255,255,255,0.14)",
            color: "#fff",
            border: "none",
            borderRadius: 999,
            padding: "8px 14px",
            fontSize: 13,
            fontWeight: tokens.fontWeight.bold,
            cursor: "pointer",
            ...POPPINS,
          }}
        >
          <IconPlus size={16} stroke={2.2} />
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
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {rows.map((r) => (
              <div
                key={String(r.id)}
                style={{
                  background: "#fff",
                  borderRadius: tokens.radiusCard,
                  boxShadow: "0 1px 3px rgba(11,31,58,0.06)",
                  padding: 16,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    justifyContent: "space-between",
                    gap: 12,
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div
                      style={{
                        color: tokens.navy,
                        fontSize: 16,
                        fontWeight: tokens.fontWeight.extrabold,
                        letterSpacing: "-0.2px",
                        ...SORA,
                      }}
                    >
                      {r.name || "Pupil"}
                    </div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        marginTop: 8,
                        color: tokens.textSecondary,
                        fontSize: 13,
                        ...POPPINS,
                      }}
                    >
                      <IconCalendar size={15} stroke={1.8} />
                      {formatDate(r.current_test_date)}
                      {r.current_test_time ? ` · ${String(r.current_test_time).slice(0, 5)}` : ""}
                    </div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        marginTop: 4,
                        color: tokens.textSecondary,
                        fontSize: 13,
                        ...POPPINS,
                      }}
                    >
                      <IconMapPin size={15} stroke={1.8} />
                      {r.test_centre || "No test centre"}
                    </div>
                  </div>
                  <DSMPill variant={statusVariant(r.status)}>
                    {(r.status ?? "pending").toUpperCase()}
                  </DSMPill>
                </div>
                {r.created_at && (
                  <div
                    style={{
                      marginTop: 12,
                      paddingTop: 12,
                      borderTop: "1px solid #E4E8EF",
                      color: "#8A93A3",
                      fontSize: 12,
                      ...POPPINS,
                    }}
                  >
                    Created {formatCreated(r.created_at)}
                  </div>
                )}
              </div>
            ))}
          </div>
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
      const pupilQuery = supabase
        .from("pupils")
        .select("id, name, email, phone")
        .order("name", { ascending: true });
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
    [pupilName, date, centre],
  );

  async function save() {
    if (!canSave || saving) return;
    setSaving(true);
    const selected = pupils.find((p) => (p.name ?? "") === pupilName);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const payload: Record<string, unknown> = {
      name: pupilName,
      // email is NOT NULL on this table — fall back to the instructor's address
      email: selected?.email || user?.email || "noreply@drivingschoolmanager.co.uk",
      phone: selected?.phone || null,
      current_test_date: date,
      current_test_time: time || null,
      test_centre: centre,
      notes: notes || null,
      status: "pending",
    };
    let { error } = await supabase.from("test_swap_requests").insert(payload);
    if (error && /notes/i.test(error.message)) {
      delete payload.notes;
      ({ error } = await supabase.from("test_swap_requests").insert(payload));
    }

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
