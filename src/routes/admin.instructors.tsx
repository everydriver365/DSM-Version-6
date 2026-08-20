import { useEffect, useState } from "react";
import { tokens } from "@/lib/tokens";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { IconArchive, IconCalendar, IconChevronDown, IconChevronLeft, IconChevronUp, IconCurrencyPound, IconDotsVertical, IconId, IconMapPin, IconPencil, IconPhone, IconSearch, IconTrash } from "@tabler/icons-react";
import { PageHeader } from "@/components/dsm/PageHeader";
import { toast } from "sonner";
import { supabase } from "@/lib/supabaseClient";
import { BottomSheet, SheetGroup, SheetDivider, PrimaryButton, GhostButton } from "@/components/dsm/BottomSheetV2";
import { useAdminGate } from "./admin";

export const Route = createFileRoute("/admin/instructors")({
  component: AdminInstructorsPage,
});

const NAVY = "#0B1F3A";
const BLUE = "#1877D6";
const RED = "#CC2229";
const BORDER = "#E4E8EF";
const MUTED = "#6B7686";

function initials(name?: string | null) {
  if (!name) return "?";
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

function fmtDate(iso?: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function AdminInstructorsPage() {
  const navigate = useNavigate();
  const status = useAdminGate();

  const [instructors, setInstructors] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const [editInstructor, setEditInstructor] = useState<any>(null);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editPostcode, setEditPostcode] = useState("");
  const [editRate, setEditRate] = useState("");
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<any>(null);
  const [showArchive, setShowArchive] = useState(false);
  const [selectedInstructor, setSelectedInstructor] = useState<any>(null);
  const [instructorStats, setInstructorStats] = useState<{
    pupilCount: number;
    lessonCount: number;
    totalEarnings: number;
    joinedDate: string;
  } | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);

  async function fetchInstructors() {
    const BASE =
      "id, name, phone, created_at, home_postcode, hourly_rate, adi_grade, adi_licence_number, website_published, profile_image_url";
    let { data, error } = await supabase
      .from("instructors")
      .select(`${BASE}, deleted_at`)
      .order("created_at", { ascending: false });
    // Fall back when the deleted_at column hasn't been added yet (see db/046_instructors_deleted_at.sql)
    if (error && (error as any).code === "42703") {
      const retry = await supabase
        .from("instructors")
        .select(BASE)
        .order("created_at", { ascending: false });
      data = retry.data as any;
      error = retry.error as any;
    }
    if (error) {
      console.error("[admin/instructors] fetch error", error);
      toast.error("Couldn't load instructors");
      return;
    }
    setInstructors(data ?? []);
  }


  useEffect(() => {
    if (status !== "allowed") return;
    fetchInstructors();
  }, [status]);

  useEffect(() => {
    if (!selectedInstructor) return;
    setLoadingStats(true);
    (async () => {
      const [pupils, lessons] = await Promise.all([
        supabase
          .from("pupils")
          .select("id", { count: "exact", head: true })
          .eq("instructor_id", selectedInstructor.id)
          .is("deleted_at", null),
        supabase
          .from("lessons")
          .select("amount_due", { count: "exact" })
          .eq("instructor_id", selectedInstructor.id)
          .is("deleted_at", null),
      ]);

      const totalEarnings = (lessons.data ?? []).reduce((sum, l) => sum + (l.amount_due ?? 0), 0);

      setInstructorStats({
        pupilCount: pupils.count ?? 0,
        lessonCount: lessons.count ?? 0,
        totalEarnings,
        joinedDate: selectedInstructor.created_at
          ? new Date(selectedInstructor.created_at).toLocaleDateString("en-GB", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })
          : "Unknown",
      });
      setLoadingStats(false);
    })();
  }, [selectedInstructor]);

  const filtered = instructors.filter(
    (i) =>
      !search ||
      i.name?.toLowerCase().includes(search.toLowerCase()),
  );
  const active = filtered.filter((i) => !i.deleted_at);
  const archived = filtered.filter((i) => !!i.deleted_at);

  function openEdit(inst: any) {
    setMenuFor(null);
    setEditInstructor(inst);
    setEditName(inst.name ?? "");
    setEditPhone(inst.phone ?? "");
    setEditPostcode(inst.home_postcode ?? "");
    setEditRate(inst.hourly_rate != null ? String(inst.hourly_rate) : "");
  }

  async function saveEdit() {
    if (!editInstructor) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("instructors")
        .update({
          name: editName,
          phone: editPhone,
          home_postcode: editPostcode,
          hourly_rate: editRate ? Number(editRate) : null,
        })
        .eq("id", editInstructor.id);
      if (error) throw error;
      toast.success("Instructor updated");
      setEditInstructor(null);
      await fetchInstructors();
    } catch (e: any) {
      console.error("[admin/instructors] save error", e);
      toast.error(e?.message ?? "Couldn't save changes");
    } finally {
      setSaving(false);
    }
  }

  async function removeInstructor() {
    if (!confirmDelete) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("instructors")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", confirmDelete.id);
      if (error) throw error;
      toast.success("Instructor removed");
      setConfirmDelete(null);
      await fetchInstructors();
    } catch (e: any) {
      console.error("[admin/instructors] delete error", e);
      toast.error(e?.message ?? "Couldn't remove instructor");
    } finally {
      setSaving(false);
    }
  }

  if (status !== "allowed") return null;

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#F6F8FB", fontFamily: "Poppins, sans-serif" }}>
      <PageHeader
        title="Instructors"
        backTo="/admin"
        right={
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: "50%",
              backgroundColor: tokens.blue,
              color: "#fff",
              fontSize: tokens.fontSize.md,
              fontWeight: tokens.fontWeight.extrabold,
              boxShadow: "0 3px 0 #0F52A8",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {instructors.length}
          </div>
        }
      />

      {/* SEARCH */}
      <div style={{ padding: "16px 16px 0" }}>
        <div
          className="flex items-center gap-2"
          style={{
            backgroundColor: "#fff",
            borderRadius: 8,
            padding: "14px 16px",
            boxShadow: "0 4px 0 #E4E4E8, 0 10px 22px rgba(0,0,0,0.06)",
          }}
        >
          <IconSearch stroke={1.5} size={17} color="#8A8A8E" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name..."
            className="flex-1 bg-transparent outline-none"
            style={{ fontSize: 14.5, color: "#000" }}
          />
        </div>
      </div>

      {/* LIST */}
      <div style={{ padding: "16px 16px 0" }}>
        <div
          style={{
            backgroundColor: "#fff",
            borderRadius: 8,
            overflow: "hidden",
            boxShadow: "0 4px 0 #E4E4E8, 0 12px 28px rgba(0,0,0,0.06)",
          }}
        >
        {active.length === 0 && (
          <div style={{ padding: 24, textAlign: "center", fontSize: tokens.fontSize.base, color: MUTED }}>
            No instructors found
          </div>
        )}
        {active.map((inst, idx) => {
          const deleted = !!inst.deleted_at;
          return (
            <div
              key={inst.id}
              className="flex items-center relative"
              onClick={() => setSelectedInstructor(inst)}
              style={{
                gap: 13,
                padding: "15px 16px",
                borderTop: idx === 0 ? "none" : "1px solid #EFEFF2",
                cursor: "pointer",
              }}
            >
              <div
                className="flex items-center justify-center rounded-full shrink-0 overflow-hidden"
                style={{
                  width: 44,
                  height: 44,
                  backgroundColor: deleted ? BORDER : BLUE,
                  color: deleted ? "#9CA3AF" : "#fff",
                  fontSize: tokens.fontSize.md,
                  fontWeight: tokens.fontWeight.bold,
                }}
              >
                {inst.profile_image_url ? (
                  <img
                    src={inst.profile_image_url}
                    alt={inst.name ?? ""}
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                ) : (
                  initials(inst.name)
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span
                    style={{
                      fontSize: tokens.fontSize.lg,
                      fontWeight: tokens.fontWeight.extrabold,
                      letterSpacing: "-0.1px",
                      color: "#000",
                      textDecoration: deleted ? "line-through" : "none",
                    }}
                    className="truncate"
                  >
                    {inst.name || "Unnamed"}
                  </span>
                  {deleted && (
                    <span style={{ fontSize: 12, color: RED, fontWeight: 600 }}>(removed)</span>
                  )}
                </div>
                <div
                  className="truncate"
                  style={{
                    fontSize: tokens.fontSize.base,
                    fontWeight: tokens.fontWeight.medium,
                    color: inst.phone ? "#6B6B6F" : "#C7C7CC",
                    marginTop: 2,
                  }}
                >
                  {inst.phone || "No phone number"}
                </div>
                <div style={{ fontSize: 12, color: "#B0B0B5", marginTop: 2 }}>
                  Joined {fmtDate(inst.created_at)}
                </div>
              </div>

              <button
                type="button"
                aria-label="Actions"
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuFor(menuFor === inst.id ? null : inst.id);
                }}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <IconDotsVertical stroke={1.5} size={18} color="#8A8A8E" />
              </button>

              {menuFor === inst.id && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setMenuFor(null)} />
                  <div
                    className="absolute z-40 rounded-lg overflow-hidden bg-white"
                    style={{
                      right: 12,
                      top: 46,
                      minWidth: 180,
                      boxShadow: "0 6px 20px rgba(0,0,0,0.14)",
                      border: `1px solid ${BORDER}`,
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => openEdit(inst)}
                      className="flex items-center gap-2 w-full text-left px-3 py-3"
                      style={{ fontSize: tokens.fontSize.base, color: NAVY }}
                    >
                      <IconPencil stroke={1.5} size={15} color={NAVY} /> Edit details
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setMenuFor(null);
                        setConfirmDelete(inst);
                      }}
                      className="flex items-center gap-2 w-full text-left px-3 py-3"
                      style={{ fontSize: tokens.fontSize.base, color: RED, borderTop: `0.5px solid ${BORDER}` }}
                    >
                      <IconTrash stroke={1.5} size={15} color={RED} /> Remove instructor
                    </button>
                  </div>
                </>
              )}
            </div>
          );
        })}
        </div>
      </div>


      {/* ARCHIVE */}
      {archived.length > 0 && (
        <div style={{ margin: "16px 16px 0" }}>
          {/* Toggle header */}
          <div
            onClick={() => setShowArchive((v) => !v)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: 16,
              background: "#fff",
              borderRadius: 8,
              boxShadow: "0 4px 0 #E4E4E8, 0 10px 22px rgba(0,0,0,0.05)",
              cursor: "pointer",
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                background: "#F2F2F7",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <IconArchive size={17} color="#6B6B6F" />
            </div>
            <span style={{ flex: 1, fontSize: 15, fontWeight: tokens.fontWeight.bold, color: "#000", fontFamily: "Poppins, sans-serif" }}>
              Archive <span style={{ color: "#8A8A8E", fontWeight: 500 }}>({archived.length})</span>
            </span>

            {showArchive ? (
              <IconChevronUp size={16} color="#8A8A8E" />
            ) : (
              <IconChevronDown size={16} color="#8A8A8E" />
            )}
          </div>

          {/* Archived list */}
          {showArchive && (
            <div style={{ marginTop: 10, backgroundColor: "#fff", borderRadius: 8, boxShadow: "0 4px 0 #E4E4E8, 0 12px 28px rgba(0,0,0,0.06)", overflow: "hidden" }}>

              {archived.map((instructor) => (
                <div
                  key={instructor.id}
                  className="flex items-center gap-3 relative"
                  style={{ padding: "14px 16px", borderBottom: `0.5px solid ${BORDER}` }}
                >
                  {/* Avatar */}
                  <div
                    className="flex items-center justify-center rounded-full shrink-0 overflow-hidden"
                    style={{
                      width: 40,
                      height: 40,
                      backgroundColor: BORDER,
                      color: tokens.textMuted,
                      fontSize: tokens.fontSize.base,
                      fontWeight: tokens.fontWeight.semibold,
                    }}
                  >
                    {instructor.profile_image_url ? (
                      <img
                        src={instructor.profile_image_url}
                        alt={instructor.name ?? ""}
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      />
                    ) : (
                      (instructor.name ?? "X")
                        .split(" ")
                        .map((n: string) => n[0])
                        .join("")
                        .slice(0, 2)
                        .toUpperCase()
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div style={{ fontSize: tokens.fontSize.md, fontWeight: tokens.fontWeight.semibold, color: NAVY, textDecoration: "line-through" }} className="truncate">
                      {instructor.name ?? "Unknown"}
                    </div>
                    <div style={{ fontSize: 12, color: MUTED }}>
                      Removed{" "}
                      {new Date(instructor.deleted_at).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </div>
                  </div>

                  {/* Restore button */}
                  <button
                    type="button"
                    onClick={async () => {
                      const { error } = await supabase
                        .from("instructors")
                        .update({ deleted_at: null })
                        .eq("id", instructor.id);
                      if (error) {
                        toast.error("Couldn't restore instructor");
                        return;
                      }
                      setInstructors((prev) =>
                        prev.map((i) =>
                          i.id === instructor.id ? { ...i, deleted_at: null } : i
                        )
                      );
                      toast.success(`${instructor.name} restored`);
                    }}
                    style={{
                      background: "#E6F1FB",
                      color: tokens.blue,
                      border: "none",
                      borderRadius: 999,
                      padding: "4px 10px",
                      fontSize: 12,
                      fontWeight: tokens.fontWeight.semibold,
                      cursor: "pointer",
                      fontFamily: "Poppins, sans-serif",
                      flexShrink: 0,
                    }}
                  >
                    Restore
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* EDIT SHEET */}
      {editInstructor && (
        <BottomSheet
          title="Edit instructor"
          subtitle={editInstructor?.name ?? undefined}
          onClose={() => setEditInstructor(null)}
          footer={
            <PrimaryButton disabled={saving} onClick={saveEdit}>
              {saving ? "Saving..." : "Save changes"}
            </PrimaryButton>
          }
        >
          <SheetGroup>
            <Field label="Name" value={editName} onChange={setEditName} />
            <Field label="Phone" value={editPhone} onChange={setEditPhone} />
            <Field label="Home postcode" value={editPostcode} onChange={setEditPostcode} />
            <Field label="Hourly rate (£)" value={editRate} onChange={setEditRate} inputMode="decimal" last />
          </SheetGroup>

          <SheetGroup>
            <div className="flex items-center justify-between" style={{ padding: "15px 16px" }}>
              <div style={{ fontSize: tokens.fontSize.base, fontWeight: tokens.fontWeight.medium, color: MUTED }}>Account status</div>
              <div
                style={{
                  fontSize: tokens.fontSize.base,
                  fontWeight: tokens.fontWeight.bold,
                  color: editInstructor?.deleted_at ? RED : "#1A9B5C",
                }}
              >
                {editInstructor?.deleted_at ? "Archived" : "Active"}
              </div>
            </div>
          </SheetGroup>
        </BottomSheet>
      )}

      {/* REMOVE CONFIRM */}
      {confirmDelete && (
        <BottomSheet
          title="Remove instructor"
          subtitle={confirmDelete?.name ?? undefined}
          onClose={() => setConfirmDelete(null)}
          footer={
            <div className="flex flex-col gap-2">
              <PrimaryButton color={RED} disabled={saving} onClick={removeInstructor}>
                {saving ? "Removing..." : "Remove instructor"}
              </PrimaryButton>
              <GhostButton color={NAVY} bg="transparent" onClick={() => setConfirmDelete(null)}>
                Cancel
              </GhostButton>
            </div>
          }
        >
          <div
            className="mb-3"
            style={{
              padding: 14,
              borderRadius: 8,
              backgroundColor: "#FEF3C7",
              color: "#B45309",
              fontSize: tokens.fontSize.base,
              boxShadow: "0 1px 3px rgba(11,31,58,0.06)",
            }}
          >
            This will soft-delete the instructor's account. Their data is retained but they will no
            longer be able to log in.
          </div>

          <SheetGroup>
            <div className="flex items-center justify-between" style={{ padding: "15px 16px" }}>
              <div style={{ fontSize: tokens.fontSize.lg, fontWeight: tokens.fontWeight.semibold, color: RED }}>
                Remove {confirmDelete?.name}
              </div>
            </div>
          </SheetGroup>
        </BottomSheet>
      )}
      {/* DETAIL SHEET */}
      {selectedInstructor && (
        <div
          className="fixed inset-0 z-50"
          style={{ backgroundColor: "#F6F8FB", overflowY: "auto" }}
        >
          {/* Header */}
          <div
            className="flex items-center gap-3 px-3 py-3 sticky top-0 z-10"
            style={{ backgroundColor: NAVY }}
          >
            <button
              type="button"
              onClick={() => {
                setSelectedInstructor(null);
                setInstructorStats(null);
              }}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: 0,
                display: "flex",
              }}
              aria-label="Back"
            >
              <IconChevronLeft size={22} color="#fff" />
            </button>
            <div style={{ fontSize: 15, fontWeight: tokens.fontWeight.semibold, color: "#fff" }}>Instructor Record</div>
          </div>

          {/* Profile card */}
          <div
            className="mx-4 mt-4 rounded-lg p-4"
            style={{ backgroundColor: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}
          >
            {/* Avatar + name */}
            <div className="flex items-center gap-3 mb-4">
              <div
                className="flex items-center justify-center rounded-full shrink-0 overflow-hidden"
                style={{
                  width: 64,
                  height: 64,
                  backgroundColor: BLUE,
                  color: "#fff",
                  fontSize: 20,
                  fontWeight: tokens.fontWeight.semibold,
                }}
              >
                {selectedInstructor.profile_image_url ? (
                  <img
                    src={selectedInstructor.profile_image_url}
                    alt={selectedInstructor.name ?? ""}
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                ) : (
                  <span>
                    {(selectedInstructor.name ?? "X")
                      .split(" ")
                      .map((n: string) => n[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase()}
                  </span>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div
                  style={{ fontSize: tokens.fontSize.xl, fontWeight: tokens.fontWeight.bold, color: NAVY }}
                  className="truncate"
                >
                  {selectedInstructor.name ?? "Unknown"}
                </div>
                <div style={{ fontSize: tokens.fontSize.base, color: MUTED }}>
                  {selectedInstructor.adi_grade ? `Grade ${selectedInstructor.adi_grade} ADI` : "ADI"}
                </div>
              </div>
            </div>

            {/* Details grid */}
            {[
              { label: "Phone", value: selectedInstructor.phone ?? "Not set", icon: IconPhone },
              { label: "Home postcode", value: selectedInstructor.home_postcode ?? "Not set", icon: IconMapPin },
              { label: "Hourly rate", value: selectedInstructor.hourly_rate ? `£${selectedInstructor.hourly_rate}/hr` : "Not set", icon: IconCurrencyPound },
              { label: "ADI licence", value: selectedInstructor.adi_licence_number ?? "Not set", icon: IconId },
              { label: "Joined", value: instructorStats?.joinedDate ?? "—", icon: IconCalendar },
            ].map(({ label, value, icon: Icon }) => (
              <div
                key={label}
                className="flex items-center gap-3"
                style={{ padding: "12px 0", borderBottom: `0.5px solid ${BORDER}` }}
              >
                <div
                  className="flex items-center justify-center rounded-full shrink-0"
                  style={{ width: 32, height: 32, backgroundColor: "#E6F1FB" }}
                >
                  <Icon size={16} color={BLUE} />
                </div>
                <div className="flex-1 min-w-0">
                  <div style={{ fontSize: tokens.fontSize.sm, color: MUTED, fontWeight: 600 }}>{label}</div>
                  <div style={{ fontSize: tokens.fontSize.md, color: NAVY, fontWeight: 600 }} className="truncate">
                    {value}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Stats card */}
          <div
            className="mx-4 mt-4 rounded-lg p-4"
            style={{ backgroundColor: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}
          >
            <div style={{ fontSize: tokens.fontSize.md, fontWeight: tokens.fontWeight.bold, color: NAVY, marginBottom: 12 }}>
              Activity
            </div>

            {loadingStats ? (
              <div style={{ textAlign: "center", padding: 24, color: MUTED, fontSize: 13 }}>
                Loading...
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Pupils", value: instructorStats?.pupilCount ?? 0, color: tokens.blue, bg: "#E6F1FB" },
                  { label: "Lessons", value: instructorStats?.lessonCount ?? 0, color: "#7C3AED", bg: "#EFE7FB" },
                  { label: "Total revenue", value: `£${(instructorStats?.totalEarnings ?? 0).toFixed(2)}`, color: "#15803D", bg: "#DCFCE7" },
                  { label: "ADI grade", value: selectedInstructor.adi_grade ?? "—", color: tokens.red, bg: "#FCE9E9" },
                ].map(({ label, value, color, bg }) => (
                  <div
                    key={label}
                    className="rounded-lg p-3"
                    style={{ backgroundColor: bg }}
                  >
                    <div style={{ fontSize: tokens.fontSize.sm, color, fontWeight: tokens.fontWeight.semibold, marginBottom: 4 }}>
                      {label}
                    </div>
                    <div style={{ fontSize: tokens.fontSize.xl, color, fontWeight: 700 }}>{value}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="mx-4 mt-4 mb-6 flex flex-col gap-3">
            <button
              type="button"
              onClick={() => {
                setEditInstructor(selectedInstructor);
                setSelectedInstructor(null);
              }}
              style={{
                width: "100%",
                padding: 14,
                background: tokens.blue,
                color: "#fff",
                border: "none",
                borderRadius: 8,
                fontSize: tokens.fontSize.md,
                fontWeight: tokens.fontWeight.bold,
                cursor: "pointer",
                fontFamily: "Poppins, sans-serif",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
              }}
            >
              <IconPencil stroke={1.5} size={18} color="#fff" /> Edit details
            </button>
            <button
              type="button"
              onClick={() => {
                setConfirmDelete(selectedInstructor);
                setSelectedInstructor(null);
              }}
              style={{
                width: "100%",
                padding: 14,
                background: "#FCE9E9",
                color: tokens.red,
                border: "none",
                borderRadius: 8,
                fontSize: tokens.fontSize.md,
                fontWeight: tokens.fontWeight.bold,
                cursor: "pointer",
                fontFamily: "Poppins, sans-serif",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
              }}
            >
              <IconTrash stroke={1.5} size={18} color="#CC2229" /> Remove instructor
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  inputMode,
  last,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  inputMode?: "text" | "decimal";
  last?: boolean;
}) {
  return (
    <>
      <div className="flex items-center justify-between gap-3" style={{ padding: "15px 16px" }}>
        <div style={{ fontSize: tokens.fontSize.base, fontWeight: tokens.fontWeight.medium, color: MUTED, flexShrink: 0 }}>{label}</div>
        <input
          value={value}
          inputMode={inputMode}
          onChange={(e) => onChange(e.target.value)}
          className="text-right outline-none bg-transparent"
          style={{ fontSize: tokens.fontSize.lg, fontWeight: tokens.fontWeight.semibold, color: NAVY, minWidth: 0, flex: 1 }}
        />
      </div>
      {!last && <SheetDivider />}
    </>
  );
}
