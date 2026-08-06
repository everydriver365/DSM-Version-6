import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ChevronLeft, MoreVertical, Pencil, Trash2, Search } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabaseClient";
import { BottomSheet } from "@/components/dsm/BottomSheetV2";
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

  async function fetchInstructors() {
    const { data, error } = await supabase
      .from("instructors")
      .select(
        "id, name, phone, created_at, home_postcode, hourly_rate, adi_grade, website_published, deleted_at",
      )
      .order("created_at", { ascending: false });
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

  const filtered = instructors.filter(
    (i) =>
      !search ||
      i.name?.toLowerCase().includes(search.toLowerCase()),
  );

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
      {/* HEADER */}
      <div
        className="flex items-center justify-between px-3 py-3 sticky top-0 z-20"
        style={{ backgroundColor: NAVY }}
      >
        <button
          type="button"
          onClick={() => navigate({ to: "/admin" as never })}
          className="p-1 -ml-1"
          aria-label="Back"
        >
          <ChevronLeft size={22} color="#fff" />
        </button>
        <div style={{ fontSize: 15, fontWeight: 600, color: "#fff" }}>Instructors</div>
        <div
          className="rounded-full px-2 py-0.5"
          style={{ backgroundColor: "rgba(255,255,255,0.14)", color: "#fff", fontSize: 12, fontWeight: 600 }}
        >
          {instructors.length}
        </div>
      </div>

      {/* SEARCH */}
      <div style={{ padding: "12px 16px", borderBottom: `0.5px solid ${BORDER}`, backgroundColor: "#fff" }}>
        <div className="flex items-center gap-2 rounded-xl px-3" style={{ backgroundColor: "#F1F4F9", height: 38 }}>
          <Search size={15} color={MUTED} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name..."
            className="flex-1 bg-transparent outline-none"
            style={{ fontSize: 13, color: NAVY }}
          />
        </div>
      </div>

      {/* LIST */}
      <div style={{ backgroundColor: "#fff" }}>
        {filtered.length === 0 && (
          <div style={{ padding: 24, textAlign: "center", fontSize: 13, color: MUTED }}>
            No instructors found
          </div>
        )}
        {filtered.map((inst) => {
          const deleted = !!inst.deleted_at;
          return (
            <div
              key={inst.id}
              className="flex items-center gap-3 relative"
              style={{ padding: "14px 16px", borderBottom: `0.5px solid ${BORDER}` }}
            >
              <div
                className="flex items-center justify-center rounded-full shrink-0"
                style={{
                  width: 40,
                  height: 40,
                  backgroundColor: deleted ? BORDER : BLUE,
                  color: deleted ? "#9CA3AF" : "#fff",
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                {initials(inst.name)}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span
                    style={{
                      fontSize: 14,
                      fontWeight: 600,
                      color: NAVY,
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
                <div className="truncate" style={{ fontSize: 12, color: MUTED }}>
                  {inst.phone || "—"}
                </div>
                <div style={{ fontSize: 11, color: "#9CA3AF" }}>Joined {fmtDate(inst.created_at)}</div>
              </div>

              <button
                type="button"
                aria-label="Actions"
                onClick={() => setMenuFor(menuFor === inst.id ? null : inst.id)}
                className="p-1"
              >
                <MoreVertical size={16} color="#D1D5DB" />
              </button>

              {menuFor === inst.id && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setMenuFor(null)} />
                  <div
                    className="absolute z-40 rounded-xl overflow-hidden bg-white"
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
                      style={{ fontSize: 13, color: NAVY }}
                    >
                      <Pencil size={15} color={NAVY} /> Edit details
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setMenuFor(null);
                        setConfirmDelete(inst);
                      }}
                      className="flex items-center gap-2 w-full text-left px-3 py-3"
                      style={{ fontSize: 13, color: RED, borderTop: `0.5px solid ${BORDER}` }}
                    >
                      <Trash2 size={15} color={RED} /> Remove instructor
                    </button>
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>

      {/* EDIT SHEET */}
      {editInstructor && (
        <BottomSheet
          title="Edit instructor"
          subtitle={editInstructor?.name ?? undefined}
          onClose={() => setEditInstructor(null)}
          footer={
            <button
              type="button"
              disabled={saving}
              onClick={saveEdit}
              className="w-full rounded-xl py-3"
              style={{ backgroundColor: BLUE, color: "#fff", fontSize: 14, fontWeight: 600, opacity: saving ? 0.6 : 1 }}
            >
              {saving ? "Saving..." : "Save changes"}
            </button>
          }
        >
          <div className="rounded-2xl bg-white p-4 mb-4" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
            <Field label="Name" value={editName} onChange={setEditName} />
            <Field label="Phone" value={editPhone} onChange={setEditPhone} />
            <Field label="Home postcode" value={editPostcode} onChange={setEditPostcode} />
            <Field label="Hourly rate (£)" value={editRate} onChange={setEditRate} inputMode="decimal" last />
          </div>
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
              <button
                type="button"
                disabled={saving}
                onClick={removeInstructor}
                className="w-full rounded-xl py-3"
                style={{ backgroundColor: RED, color: "#fff", fontSize: 14, fontWeight: 600, opacity: saving ? 0.6 : 1 }}
              >
                {saving ? "Removing..." : "Remove instructor"}
              </button>
              <button
                type="button"
                onClick={() => setConfirmDelete(null)}
                className="w-full rounded-xl py-3"
                style={{ backgroundColor: "#E4E8EF", color: NAVY, fontSize: 14, fontWeight: 600 }}
              >
                Cancel
              </button>
            </div>
          }
        >
          <div
            className="rounded-2xl p-4 mb-4"
            style={{ backgroundColor: "#FDECEC", border: `1px solid #F6C9CB`, fontSize: 13, color: "#8A1A1F" }}
          >
            This will soft-delete the instructor's account. Their data is retained but they will no
            longer be able to log in.
          </div>
        </BottomSheet>
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
    <div style={{ marginBottom: last ? 0 : 14 }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: MUTED, marginBottom: 5 }}>{label}</div>
      <input
        value={value}
        inputMode={inputMode}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl px-3 outline-none"
        style={{ height: 42, backgroundColor: "#F1F4F9", fontSize: 14, color: NAVY, border: `1px solid ${BORDER}` }}
      />
    </div>
  );
}
