import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "@/lib/toast";
import { supabase } from "@/lib/supabaseClient";
import { tokens } from "@/lib/tokens";
import { BottomSheet as BottomSheetV2, SheetGroup, PrimaryButton } from "@/components/dsm/BottomSheetV2";
import { AddressLookup } from "@/components/dsm/AddressLookup";
import { testStartTime, withTestTimeNote } from "@/lib/testDay";

const POPPINS = { fontFamily: "Poppins, sans-serif" } as const;

export interface EditableTest {
  pupilId: string;
  name: string;
  test_date: string | null;
  test_time: string | null;
  test_centre: string | null;
  test_status?: string | null;
}

export interface SavedTest {
  pupilId: string;
  previousPupilId: string;
  name: string;
  test_date: string | null;
  test_time: string | null;
  test_centre: string | null;
  test_status: string | null;
}

const STATUSES: { key: string; label: string }[] = [
  { key: "upcoming", label: "Upcoming" },
  { key: "passed", label: "Passed" },
  { key: "failed", label: "Failed" },
];

function labelStyle() {
  return {
    fontSize: tokens.fontSize.base,
    fontWeight: tokens.fontWeight.medium,
    color: tokens.textSecondary,
    marginBottom: 6,
    ...POPPINS,
  } as const;
}

const inputStyle = {
  width: "100%",
  fontSize: tokens.fontSize.lg,
  fontWeight: tokens.fontWeight.semibold,
  fontFamily: "Poppins, sans-serif",
  color: tokens.navy,
  border: "none",
  outline: "none",
  background: "transparent",
} as const;

export function TestEditSheet({
  test,
  focusField,
  onClose,
  onSaved,
}: {
  test: EditableTest;
  focusField?: "centre" | "time" | null;
  onClose: () => void;
  onSaved?: (saved: SavedTest) => void;
}) {
  const [pupilId, setPupilId] = useState(test.pupilId);
  const [date, setDate] = useState(test.test_date ?? "");
  const [time, setTime] = useState((test.test_time ?? "").slice(0, 5));
  const [centre, setCentre] = useState(test.test_centre ?? "");
  const [status, setStatus] = useState(test.test_status || "upcoming");
  const [saving, setSaving] = useState(false);
  const [pupils, setPupils] = useState<Array<{ id: string; name: string }>>([]);
  const timeRef = useRef<HTMLInputElement>(null);
  const centreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id;
      if (!uid) return;
      const { data } = await supabase
        .from("pupils")
        .select("id, name, first_name")
        .eq("instructor_id", uid)
        .is("deleted_at", null)
        .order("name", { ascending: true });
      setPupils(
        ((data ?? []) as any[]).map((p) => ({ id: p.id, name: p.name || p.first_name || "Pupil" })),
      );
    })();
  }, []);

  useEffect(() => {
    if (focusField === "time") timeRef.current?.focus();
    if (focusField === "centre") centreRef.current?.scrollIntoView({ block: "center" });
  }, [focusField]);

  const selectedName = useMemo(
    () => pupils.find((p) => p.id === pupilId)?.name ?? test.name,
    [pupils, pupilId, test.name],
  );

  async function handleSave() {
    if (saving) return;
    setSaving(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id;
      const timeValue = time ? `${time.slice(0, 5)}:00` : null;

      // Move the test if the pupil changed.
      if (pupilId !== test.pupilId) {
        await supabase
          .from("pupils")
          .update({ test_date: null, test_time: null, test_centre: null, test_status: null })
          .eq("id", test.pupilId);
      }

      const { error } = await supabase
        .from("pupils")
        .update({
          test_date: date || null,
          test_time: timeValue,
          test_centre: centre.trim() || null,
          test_status: status,
        })
        .eq("id", pupilId);
      if (error) throw error;

      // Keep the underlying test-day lesson (if any) in step.
      if (uid && test.test_date) {
        const { data: lessonRows } = await supabase
          .from("lessons")
          .select("id, notes")
          .eq("instructor_id", uid)
          .eq("pupil_id", test.pupilId)
          .eq("lesson_type", "test")
          .eq("lesson_date", test.test_date)
          .limit(1);
        const lesson = (lessonRows ?? [])[0] as { id: string; notes: string | null } | undefined;
        if (lesson) {
          await supabase
            .from("lessons")
            .update({
              pupil_id: pupilId,
              lesson_date: date || test.test_date,
              ...(time ? { lesson_time: `${testStartTime(time) ?? time}:00` } : {}),
              pickup_location: centre.trim() || null,
              notes: time ? withTestTimeNote(lesson.notes ?? null, time) : lesson.notes,
            })
            .eq("id", lesson.id);
        }
      }

      toast.success("Test updated");
      onSaved?.({
        pupilId,
        previousPupilId: test.pupilId,
        name: selectedName,
        test_date: date || null,
        test_time: timeValue,
        test_centre: centre.trim() || null,
        test_status: status,
      });
      onClose();
    } catch (e: any) {
      console.error("[TestEditSheet] save failed", e);
      toast.error(e?.message ?? "Could not update the test");
    } finally {
      setSaving(false);
    }
  }

  return (
    <BottomSheetV2
      onClose={onClose}
      title="Edit test"
      subtitle={selectedName}
      footer={
        <PrimaryButton disabled={saving || !date} onClick={handleSave}>
          {saving ? "Saving..." : "Save changes"}
        </PrimaryButton>
      }
    >
      <SheetGroup>
        {/* Pupil */}
        <div style={{ padding: "13px 16px" }}>
          <label className="block" style={labelStyle()}>
            Pupil
          </label>
          <select
            value={pupilId}
            onChange={(e) => setPupilId(e.target.value)}
            style={{ ...inputStyle, appearance: "none" }}
          >
            {pupils.length === 0 && <option value={pupilId}>{test.name}</option>}
            {pupils.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        <div style={{ height: 1, backgroundColor: tokens.border }} />

        {/* Date */}
        <div style={{ padding: "13px 16px" }}>
          <label className="block" style={labelStyle()}>
            Test date
          </label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={inputStyle} />
        </div>

        <div style={{ height: 1, backgroundColor: tokens.border }} />

        {/* Time */}
        <div style={{ padding: "13px 16px" }}>
          <label className="block" style={labelStyle()}>
            Test time
          </label>
          <input
            ref={timeRef}
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            style={inputStyle}
          />
        </div>

        <div style={{ height: 1, backgroundColor: tokens.border }} />

        {/* Test centre */}
        <div style={{ padding: "13px 16px" }} ref={centreRef}>
          <label className="block" style={labelStyle()}>
            Test centre
          </label>
          <AddressLookup
            initialAddress={centre}
            onAddressFound={(r) => setCentre(r.address)}
            showSearchButton
          />
        </div>

        <div style={{ height: 1, backgroundColor: tokens.border }} />

        {/* Status */}
        <div style={{ padding: "13px 16px" }}>
          <label className="block" style={labelStyle()}>
            Status
          </label>
          <div style={{ display: "flex", gap: 8 }}>
            {STATUSES.map((s) => {
              const active = status === s.key;
              return (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => setStatus(s.key)}
                  style={{
                    flex: 1,
                    padding: "8px 0",
                    borderRadius: 10,
                    border: `1px solid ${active ? tokens.navy : tokens.border}`,
                    background: active ? tokens.navy : "transparent",
                    color: active ? "#FFFFFF" : tokens.textSecondary,
                    fontSize: 13,
                    fontWeight: 600,
                    ...POPPINS,
                  }}
                >
                  {s.label}
                </button>
              );
            })}
          </div>
        </div>
      </SheetGroup>
    </BottomSheetV2>
  );
}

export default TestEditSheet;
