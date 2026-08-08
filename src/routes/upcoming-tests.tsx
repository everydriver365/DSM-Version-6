import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { CalendarDays, MapPin, Clock, Bell } from "lucide-react";
import { IconDotsVertical, IconPencil, IconX } from "@tabler/icons-react";
import InstructorTopBar from "@/components/dsm/InstructorTopBar";
import { toast } from "sonner";
import { supabase } from "../lib/supabaseClient";
import { formatCountdown } from "@/lib/dateHelpers";
import { PageLayout } from "@/components/PageLayout";
import { BottomSheet as BottomSheetV2, SheetGroup, PrimaryButton, GhostButton } from "@/components/dsm/BottomSheetV2";
import { AddressLookup } from "@/components/dsm/AddressLookup";

export const Route = createFileRoute("/upcoming-tests")({
  head: () => ({
    meta: [
      { title: "Upcoming driving tests — DSM by EveryDriver" },
      { name: "description", content: "All upcoming driving tests for your pupils." },
      { property: "og:title", content: "Upcoming driving tests — DSM by EveryDriver" },
      { property: "og:description", content: "All upcoming driving tests for your pupils." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: UpcomingTestsPage,
});

const POPPINS = { fontFamily: "Poppins, sans-serif" } as const;

interface PupilTestRow {
  id: string;
  name: string;
  test_date: string;
  test_time: string | null;
  test_centre: string | null;
}

function todayYmd() {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

function initials(name: string) {
  const parts = (name ?? "").trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const second = parts[1]?.[0] ?? "";
  return (first + second).toUpperCase() || "?";
}

function formatDateLong(ymd: string) {
  const d = new Date(`${ymd}T00:00:00`);
  return d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

function formatTime(t: string | null) {
  return (t ?? "").slice(0, 5);
}

function daysUntil(ymd: string) {
  const today = new Date(`${todayYmd()}T00:00:00`);
  const target = new Date(`${ymd}T00:00:00`);
  const diff = Math.round((target.getTime() - today.getTime()) / 86400000);
  return diff;
}

function UpcomingTestsPage() {
  const navigate = useNavigate();
  const [tests, setTests] = useState<PupilTestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  const [editTest, setEditTest] = useState<PupilTestRow | null>(null);
  const [editDate, setEditDate] = useState("");
  const [editTime, setEditTime] = useState("");
  const [editCentre, setEditCentre] = useState("");
  const [cancelTest, setCancelTest] = useState<PupilTestRow | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id ?? null;
      setUserId(uid);
      if (!uid) {
        setLoading(false);
        return;
      }
      const { data, error } = await supabase
        .from("pupils")
        .select("id, name, first_name, test_date, test_time, test_centre")
        .eq("instructor_id", uid)
        .not("test_date", "is", null)
        .gte("test_date", todayYmd())
        .order("test_date", { ascending: true });
      if (error) {
        console.error("[upcoming-tests] fetch error", error);
        toast.error("Could not load upcoming tests");
      }
      setTests(
        ((data ?? []) as any[]).map((p) => ({
          id: p.id,
          name: p.name || p.first_name || "Pupil",
          test_date: p.test_date,
          test_time: p.test_time ?? null,
          test_centre: p.test_centre ?? null,
        })),
      );
      setLoading(false);
    })();
  }, []);

  return (
    <PageLayout className="pb-8" style={POPPINS}>
      {/* Header */}
      <InstructorTopBar
        firstName=""
        pageTitle="Upcoming tests"
        onBack={() => navigate({ to: "/home" } as never)}
        onBell={() => navigate({ to: "/notifications" as never })}
        onPhone={() => navigate({ to: "/enquiries" as never })}
        onLiveTrack={() => navigate({ to: "/live" as never })}
        onMenu={() => navigate({ to: "/more" as never })}
        onMicPress={() => toast.info("Voice commands coming soon!")}
      />
      <div style={{ height: "calc(60px + env(safe-area-inset-top, 0px))" }} />

      {/* Actions row */}
      <div className="flex justify-end px-4 pt-3">
        <button
          type="button"
          onClick={() => navigate({ to: "/tests" })}
          className="inline-flex items-center gap-2 text-[13px] font-semibold"
          style={{ height: 34, padding: "0 12px", borderRadius: 10, border: "1px solid #E2E8F0", background: "#FFFFFF", color: "#0B1F3A" }}
        >
          <Bell size={15} />
          Test reminders
        </button>
      </div>

      <div className="px-4 pt-4">
        {loading ? (
          <div className="py-8 text-center text-[13px]" style={{ color: "#6B7280", ...POPPINS }}>
            Loading upcoming tests…
          </div>
        ) : tests.length === 0 ? (
          <div
            className="py-8 text-center text-[13px]"
            style={{ color: "#6B7280", ...POPPINS }}
          >
            No upcoming tests. Add a test from the Driving tests page.
          </div>
        ) : (
          <div className="flex flex-col" style={{ gap: 10 }}>
            {tests.map((t) => (
              <TestRow
                key={t.id}
                test={t}
                onEdit={() => {
                  setEditDate(t.test_date);
                  setEditTime(t.test_time ?? "");
                  setEditCentre(t.test_centre ?? "");
                  setEditTest(t);
                }}
                onCancel={() => setCancelTest(t)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Edit sheet */}
      {editTest && (
        <BottomSheetV2
          onClose={() => setEditTest(null)}
          title="Edit test"
          subtitle={editTest?.name ?? undefined}
          footer={
            <PrimaryButton
              disabled={saving}
              onClick={async () => {
                if (!editTest) return;
                setSaving(true);
                await supabase.from("pupils").update({
                  test_date: editDate || null,
                  test_time: editTime || null,
                  test_centre: editCentre || null,
                }).eq("id", editTest.id);
                setTests((prev) =>
                  prev.map((t) =>
                    t.id === editTest.id
                      ? { ...t, test_date: editDate, test_time: editTime, test_centre: editCentre }
                      : t,
                  ),
                );
                toast.success("Test updated");
                setSaving(false);
                setEditTest(null);
              }}
            >
              {saving ? "Saving..." : "Save changes"}
            </PrimaryButton>
          }
        >
        <SheetGroup>
          {/* Date */}
          <div style={{ padding: "13px 16px" }}>
            <label className="block" style={{ fontSize: 13, fontWeight: 500, color: "#6B7686", marginBottom: 6, ...POPPINS }}>
              Test date
            </label>
            <input
              type="date"
              value={editDate}
              onChange={(e) => setEditDate(e.target.value)}
              style={{
                width: "100%",
                fontSize: 16,
                fontWeight: 600,
                fontFamily: "Poppins, sans-serif",
                color: "#0B1F3A",
                border: "none",
                outline: "none",
                background: "transparent",
              }}
            />
          </div>

          <div style={{ height: 1, backgroundColor: "#E4E8EF" }} />

          {/* Time */}
          <div style={{ padding: "13px 16px" }}>
            <label className="block" style={{ fontSize: 13, fontWeight: 500, color: "#6B7686", marginBottom: 6, ...POPPINS }}>
              Test time
            </label>
            <input
              type="time"
              value={editTime}
              onChange={(e) => setEditTime(e.target.value)}
              style={{
                width: "100%",
                fontSize: 16,
                fontWeight: 600,
                fontFamily: "Poppins, sans-serif",
                color: "#0B1F3A",
                border: "none",
                outline: "none",
                background: "transparent",
              }}
            />
          </div>

          <div style={{ height: 1, backgroundColor: "#E4E8EF" }} />

          {/* Test centre — searchable */}
          <div style={{ padding: "13px 16px" }}>
            <label className="block" style={{ fontSize: 13, fontWeight: 500, color: "#6B7686", marginBottom: 6, ...POPPINS }}>
              Test centre
            </label>
            <AddressLookup
              initialAddress={editCentre}
              onAddressFound={(r) => setEditCentre(r.address)}
              showSearchButton
            />
          </div>
        </SheetGroup>
      </BottomSheetV2>
      )}

      {/* Cancel sheet */}
      {cancelTest && (
        <BottomSheetV2
          onClose={() => {
            setCancelTest(null);
            setCancelReason("");
          }}
          title="Cancel test"
          subtitle={cancelTest?.name ?? undefined}
        >
        <div style={{ display: "flex", flexDirection: "column", gap: 16, padding: "0 4px 8px" }}>
          {/* Warning */}
          <div
            style={{
              display: "flex",
              gap: 12,
              padding: 14,
              background: "#FEF3C7",
              borderRadius: 10,
              color: "#92400E",
            }}
          >
            <span style={{ fontSize: 18, lineHeight: 1 }}>⚠️</span>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4, ...POPPINS }}>
                Cancel test for {cancelTest?.name}?
              </div>
              <div style={{ fontSize: 13, ...POPPINS }}>
                This will clear the test date, time and centre from the pupil&apos;s record.
              </div>
            </div>
          </div>

          {/* Reason */}
          <div>
            <label className="block" style={{ fontSize: 12, color: "#6B7280", marginBottom: 6, ...POPPINS }}>
              Reason (optional)
            </label>
            <textarea
              rows={3}
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              style={{
                width: "100%",
                padding: "10px 12px",
                border: "1px solid #E4E8EF",
                borderRadius: 8,
                fontSize: 13,
                fontFamily: "Poppins, sans-serif",
                color: "#0B1F3A",
                resize: "none",
              }}
            />
          </div>

          {/* Confirm cancel */}
          <button
            disabled={saving}
            onClick={async () => {
              if (!cancelTest) return;
              setSaving(true);
              await supabase.from("pupils").update({
                test_date: null,
                test_time: null,
                test_centre: null,
                test_status: "cancelled",
              }).eq("id", cancelTest.id);
              if (cancelReason.trim() && userId) {
                await supabase.from("lesson_history").insert({
                  instructor_id: userId,
                  pupil_id: cancelTest.id,
                  notes: `Test cancelled: ${cancelReason.trim()}`,
                  payment_status: "note",
                  created_at: new Date().toISOString(),
                });
              }
              setTests((prev) => prev.filter((t) => t.id !== cancelTest.id));
              toast.success("Test cancelled");
              setSaving(false);
              setCancelTest(null);
              setCancelReason("");
            }}
            style={{
              width: "100%",
              padding: 13,
              background: "#CC2229",
              color: "#fff",
              border: "none",
              borderRadius: 10,
              fontSize: 14,
              fontWeight: 700,
              cursor: "pointer",
              fontFamily: "Poppins, sans-serif",
            }}
          >
            {saving ? "Cancelling..." : "Confirm cancellation"}
          </button>

          {/* Keep test */}
          <button
            onClick={() => {
              setCancelTest(null);
              setCancelReason("");
            }}
            style={{
              width: "100%",
              padding: 13,
              background: "#F1F5F9",
              color: "#6B7686",
              border: "none",
              borderRadius: 10,
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: "Poppins, sans-serif",
            }}
          >
            Keep test
          </button>
        </div>
      </BottomSheetV2>
      )}
    </PageLayout>
  );
}

function TestRow({
  test,
  onEdit,
  onCancel,
}: {
  test: PupilTestRow;
  onEdit: () => void;
  onCancel: () => void;
}) {
  const days = daysUntil(test.test_date);
  const daysLabel = days === 0 ? "Today" : days === 1 ? "Tomorrow" : `${days} days away`;
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [menuOpen]);

  return (
    <div
      style={{
        position: "relative",
        background: "#FFFFFF",
        borderRadius: 18,
        border: "1px solid #E2E8F0",
        boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
        padding: "16px 18px",
      }}
    >
      <div className="flex items-start" style={{ gap: 12 }}>
        <div
          className="flex items-center justify-center text-white text-[13px] font-semibold shrink-0"
          style={{ width: 42, height: 42, borderRadius: 999, backgroundColor: "#1877D6", ...POPPINS }}
        >
          {initials(test.name)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between" style={{ gap: 8 }}>
            <div className="text-[15px] font-semibold truncate" style={{ color: "#0B1F3A", ...POPPINS }}>
              {test.name}
            </div>
            <span
              className="text-[11px] font-semibold shrink-0"
              style={{
                color: days === 0 ? "#CC2229" : "#1877D6",
                backgroundColor: days === 0 ? "#FCE9E9" : "#E6F1FB",
                padding: "3px 10px",
                borderRadius: 999,
                ...POPPINS,
              }}
            >
              {daysLabel}
            </span>
          </div>

          <div className="text-[13px] font-bold mt-1" style={{ color: "#0B1F3A", ...POPPINS }}>
            {formatDateLong(test.test_date)}
          </div>

          <div className="flex flex-wrap items-center gap-2 mt-2 text-[12px]" style={{ color: "#6B7280", ...POPPINS }}>
            <span className="inline-flex items-center gap-1">
              <Clock size={12} strokeWidth={2} color="#6B7280" />
              {formatTime(test.test_time) || "Time TBC"}
            </span>
            <span style={{ color: "#E2E8F0" }}>·</span>
            <span className="inline-flex items-center gap-1">
              <MapPin size={12} strokeWidth={2} color="#6B7280" />
              {test.test_centre || "Centre TBC"}
            </span>
          </div>

          <div className="text-[11px] font-medium mt-2" style={{ color: "#1877D6", ...POPPINS }}>
            <CalendarDays size={12} strokeWidth={2} className="inline mr-1" color="#1877D6" />
            {formatCountdown(test.test_date, test.test_time) ?? "Overdue"}
          </div>
        </div>
      </div>

      {/* Dots menu trigger */}
      <div ref={menuRef} style={{ position: "absolute", top: 12, right: 12 }}>
        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          style={{
            display: "grid",
            placeItems: "center",
            width: 28,
            height: 28,
            borderRadius: 8,
            background: "transparent",
            border: "none",
            cursor: "pointer",
          }}
        >
          <IconDotsVertical size={16} color="#9CA3AF" />
        </button>

        {menuOpen && (
          <div
            style={{
              position: "absolute",
              top: "100%",
              right: 0,
              marginTop: 4,
              minWidth: 150,
              background: "#fff",
              border: "1px solid #E2E8F0",
              borderRadius: 10,
              boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
              zIndex: 20,
              overflow: "hidden",
            }}
          >
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                onEdit();
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                width: "100%",
                padding: "10px 12px",
                background: "#fff",
                border: "none",
                fontSize: 13,
                fontWeight: 600,
                color: "#0B1F3A",
                cursor: "pointer",
                fontFamily: "Poppins, sans-serif",
                textAlign: "left",
              }}
            >
              <IconPencil size={14} color="#0B1F3A" />
              Edit test
            </button>
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                onCancel();
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                width: "100%",
                padding: "10px 12px",
                background: "#fff",
                border: "none",
                borderTop: "1px solid #F1F5F9",
                fontSize: 13,
                fontWeight: 600,
                color: "#CC2229",
                cursor: "pointer",
                fontFamily: "Poppins, sans-serif",
                textAlign: "left",
              }}
            >
              <IconX size={14} color="#CC2229" />
              Cancel test
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
