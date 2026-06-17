import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ChevronLeft, Pencil, Archive, Phone, MessageSquare, X, Loader2 } from "lucide-react";
import { Card } from "../components/dsm/Card";
import { Input } from "../components/dsm/Input";
import { SectionHeader } from "../components/dsm/SectionHeader";
import { StatTile } from "../components/dsm/StatTile";
import { Button } from "../components/dsm/Button";
import { supabase } from "../lib/supabaseClient";

export const Route = createFileRoute("/courses/$id")({
  head: () => ({
    meta: [{ title: "Course — DSM by EveryDriver" }],
  }),
  component: CourseDetailPage,
});

const POPPINS = { fontFamily: "Poppins, sans-serif" } as const;
const LABEL = "#6B7280";
const VALUE = "#0F2044";

interface Course {
  id: string;
  instructor_id: string;
  course_type: string;
  name: string;
  total_hours: number;
  includes_test: boolean;
  description: string | null;
  max_spaces: number;
  spaces_taken: number;
  start_date: string | null;
  end_date: string | null;
  daily_hours: number | null;
  repeat_type: string;
  pickup_area: string | null;
  lesson_time_preference: string;
  price: number;
  deposit_amount: number;
  deposit_only_to_book: boolean;
  early_bird_discount: number;
  early_bird_expiry: string | null;
  publish_marketplace: boolean;
  publish_mini_website: boolean;
  status: string;
}

interface Booking {
  id: string;
  course_id: string;
  instructor_id: string;
  pupil_name: string;
  pupil_email: string | null;
  pupil_phone: string | null;
  status: string;
  amount_paid: number;
  booked_at: string;
}

function typeColor(t: string) {
  if (t === "intensive") return "#CC2229";
  if (t === "semi-intensive") return "#F59E0B";
  if (t === "weekly") return "#16A34A";
  return "#1A52A0";
}
function typeLabel(t: string) {
  if (t === "intensive") return "Intensive";
  if (t === "semi-intensive") return "Semi-intensive";
  if (t === "weekly") return "Weekly";
  return "Custom";
}
function statusColor(s: string) {
  if (s === "active" || s === "confirmed") return "#16A34A";
  if (s === "draft" || s === "pending") return "#F59E0B";
  if (s === "full" || s === "cancelled" || s === "archived") return "#CC2229";
  return "#6B7280";
}
function formatDate(d: string | null) {
  if (!d) return "—";
  return new Date(d + "T00:00:00").toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function CourseDetailPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();

  const [course, setCourse] = useState<Course | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  // Edit-mode form state mirrors Course shape
  const [form, setForm] = useState<Course | null>(null);

  async function load() {
    setLoading(true);
    const { data: c, error: cErr } = await supabase
      .from("instructor_courses")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (cErr) {
      console.error("[courses.$id] load course", cErr);
      setError(cErr.message);
    }
    if (c) {
      setCourse(c as Course);
      setForm(c as Course);
    }
    const { data: bs, error: bErr } = await supabase
      .from("course_bookings")
      .select("*")
      .eq("course_id", id)
      .order("booked_at", { ascending: false });
    if (bErr) console.error("[courses.$id] load bookings", bErr);
    setBookings((bs ?? []) as Booking[]);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function saveChanges() {
    if (!form) return;
    setSaving(true);
    setError(null);
    const { id: _id, instructor_id: _ii, ...patch } = form;
    const { error: upErr } = await supabase
      .from("instructor_courses")
      .update({
        ...patch,
        total_hours: Number(patch.total_hours) || 0,
        price: parseFloat(String(patch.price)) || 0,
        deposit_amount: parseFloat(String(patch.deposit_amount)) || 0,
        early_bird_discount: parseFloat(String(patch.early_bird_discount)) || 0,
        max_spaces: Number(patch.max_spaces) || 1,
        daily_hours: patch.daily_hours ? Number(patch.daily_hours) : null,
      })
      .eq("id", id);
    setSaving(false);
    if (upErr) {
      setError(upErr.message);
      toast.error(upErr.message);
      return;
    }
    toast.success("Course updated");
    setEditing(false);
    load();
  }

  async function archive() {
    if (!confirm("Archive this course? It will be hidden from your active list.")) return;
    const { error: upErr } = await supabase
      .from("instructor_courses")
      .update({ status: "archived" })
      .eq("id", id);
    if (upErr) {
      toast.error(upErr.message);
      return;
    }
    toast.success("Course archived");
    navigate({ to: "/courses" });
  }

  async function duplicate() {
    if (!course) return;
    const { id: _i, instructor_id, spaces_taken: _s, ...rest } = course;
    const copy = { ...rest, instructor_id, name: `${course.name} (copy)`, spaces_taken: 0, status: "draft" };
    const { data, error: insErr } = await supabase
      .from("instructor_courses")
      .insert(copy)
      .select()
      .single();
    if (insErr) {
      toast.error(insErr.message);
      return;
    }
    toast.success("Course duplicated");
    if (data?.id) navigate({ to: "/courses/$id", params: { id: data.id } });
  }

  async function markPaid(b: Booking) {
    if (!course) return;
    const amount = course.price;
    const { error: upErr } = await supabase
      .from("course_bookings")
      .update({ amount_paid: amount })
      .eq("id", b.id);
    if (upErr) {
      toast.error(upErr.message);
      return;
    }
    toast.success("Marked as paid");
    load();
  }

  const spacesLeft = course ? Math.max(0, (course.max_spaces ?? 0) - (course.spaces_taken ?? 0)) : 0;

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#F2F4F8", ...POPPINS, paddingBottom: 32 }}>
      {/* Top bar */}
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 10,
          backgroundColor: "#0F2044",
          padding: "14px 16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
        }}
      >
        <button
          onClick={() => navigate({ to: "/courses" })}
          style={{ background: "none", border: "none", cursor: "pointer", color: "#fff", display: "flex" }}
          aria-label="Back"
        >
          <ChevronLeft size={24} />
        </button>
        <h1
          style={{
            color: "#fff",
            fontSize: 15,
            fontWeight: 700,
            margin: 0,
            flex: 1,
            textAlign: "center",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {course?.name ?? "Course"}
        </h1>
        <div style={{ display: "flex", gap: 12 }}>
          <button
            onClick={() => {
              if (editing) {
                setEditing(false);
                setForm(course);
              } else {
                setEditing(true);
              }
            }}
            style={{ background: "none", border: "none", cursor: "pointer", color: "#fff", display: "flex" }}
            aria-label={editing ? "Cancel edit" : "Edit"}
          >
            {editing ? <X size={22} /> : <Pencil size={20} />}
          </button>
          <button
            onClick={archive}
            style={{ background: "none", border: "none", cursor: "pointer", color: "#fff", display: "flex" }}
            aria-label="Archive"
          >
            <Archive size={20} />
          </button>
        </div>
      </div>

      <div style={{ padding: "12px 16px" }}>
        {loading ? (
          <div style={{ color: "#6B7280", padding: 24, textAlign: "center" }}>Loading…</div>
        ) : !course || !form ? (
          <div style={{ color: "#CC2229", padding: 24, textAlign: "center" }}>
            Course not found.
          </div>
        ) : (
          <>
            {/* Badges */}
            <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
              <span
                style={{
                  background: typeColor(course.course_type),
                  color: "#fff",
                  fontSize: 10,
                  fontWeight: 700,
                  padding: "4px 8px",
                  borderRadius: 6,
                  textTransform: "uppercase",
                  letterSpacing: 0.4,
                }}
              >
                {typeLabel(course.course_type)}
              </span>
              <span
                style={{
                  background: statusColor(course.status),
                  color: "#fff",
                  fontSize: 10,
                  fontWeight: 700,
                  padding: "4px 8px",
                  borderRadius: 6,
                  textTransform: "uppercase",
                  letterSpacing: 0.4,
                }}
              >
                {course.status}
              </span>
            </div>

            {/* Stats */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
              <StatTile value={`${course.total_hours}h`} label="Total" />
              <StatTile value={`£${Number(course.price).toFixed(0)}`} label="Price" />
              <StatTile value={spacesLeft} label="Spaces left" />
            </div>

            {/* COURSE DETAILS */}
            <SectionHeader>COURSE DETAILS</SectionHeader>
            <Card style={{ padding: 0 }}>
              {editing ? (
                <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 10 }}>
                  <Input
                    label="Course name"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                  <Input
                    label="Total hours"
                    type="number"
                    value={form.total_hours}
                    onChange={(e) => setForm({ ...form, total_hours: Number(e.target.value) })}
                  />
                  <Input
                    label="Daily hours"
                    type="number"
                    value={form.daily_hours ?? ""}
                    onChange={(e) =>
                      setForm({ ...form, daily_hours: e.target.value ? Number(e.target.value) : null })
                    }
                  />
                  <Input
                    label="Start date"
                    type="date"
                    value={form.start_date ?? ""}
                    onChange={(e) => setForm({ ...form, start_date: e.target.value || null })}
                  />
                  <Input
                    label="End date"
                    type="date"
                    value={form.end_date ?? ""}
                    onChange={(e) => setForm({ ...form, end_date: e.target.value || null })}
                  />
                  <Input
                    label="Pickup area"
                    value={form.pickup_area ?? ""}
                    onChange={(e) => setForm({ ...form, pickup_area: e.target.value || null })}
                  />
                  <SelectRow
                    label="Lesson time"
                    value={form.lesson_time_preference}
                    options={[
                      ["flexible", "Flexible"],
                      ["morning", "Morning"],
                      ["afternoon", "Afternoon"],
                      ["evening", "Evening"],
                    ]}
                    onChange={(v) => setForm({ ...form, lesson_time_preference: v })}
                  />
                  <SelectRow
                    label="Repeat"
                    value={form.repeat_type}
                    options={[
                      ["one-off", "One-off"],
                      ["weekly", "Weekly"],
                      ["monthly", "Monthly"],
                    ]}
                    onChange={(v) => setForm({ ...form, repeat_type: v })}
                  />
                  <ToggleRow
                    label="Includes test"
                    value={form.includes_test}
                    onChange={(v) => setForm({ ...form, includes_test: v })}
                  />
                  <Input
                    label="Max spaces"
                    type="number"
                    value={form.max_spaces}
                    onChange={(e) => setForm({ ...form, max_spaces: Number(e.target.value) })}
                  />
                  <div>
                    <div style={{ fontSize: 12, color: LABEL, fontWeight: 500, marginBottom: 4 }}>
                      Description
                    </div>
                    <textarea
                      value={form.description ?? ""}
                      onChange={(e) => setForm({ ...form, description: e.target.value || null })}
                      rows={3}
                      style={{
                        width: "100%",
                        borderRadius: 8,
                        border: "0.5px solid #E2E6ED",
                        padding: 10,
                        fontFamily: "Poppins, sans-serif",
                        fontSize: 14,
                        color: "#1A1A2E",
                        resize: "vertical",
                      }}
                    />
                  </div>
                </div>
              ) : (
                <>
                  <DetailRow label="Start date" value={formatDate(course.start_date)} />
                  <DetailRow label="End date" value={formatDate(course.end_date)} />
                  <DetailRow label="Daily hours" value={course.daily_hours ? `${course.daily_hours}h` : "—"} />
                  <DetailRow label="Pickup area" value={course.pickup_area || "—"} />
                  <DetailRow
                    label="Lesson time"
                    value={course.lesson_time_preference || "flexible"}
                  />
                  <DetailRow label="Includes test" value={course.includes_test ? "Yes" : "No"} />
                  <DetailRow label="Repeat" value={course.repeat_type || "one-off"} />
                  <DetailRow label="Description" value={course.description || "—"} last />
                </>
              )}
            </Card>

            {/* PRICING */}
            <SectionHeader>PRICING</SectionHeader>
            <Card style={{ padding: 0 }}>
              {editing ? (
                <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 10 }}>
                  <Input
                    label="Price (£)"
                    type="number"
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: parseFloat(e.target.value) || 0 })}
                  />
                  <Input
                    label="Deposit (£)"
                    type="number"
                    value={form.deposit_amount}
                    onChange={(e) =>
                      setForm({ ...form, deposit_amount: parseFloat(e.target.value) || 0 })
                    }
                  />
                  <Input
                    label="Early bird discount (£)"
                    type="number"
                    value={form.early_bird_discount}
                    onChange={(e) =>
                      setForm({ ...form, early_bird_discount: parseFloat(e.target.value) || 0 })
                    }
                  />
                  <Input
                    label="Early bird expiry"
                    type="date"
                    value={form.early_bird_expiry ?? ""}
                    onChange={(e) => setForm({ ...form, early_bird_expiry: e.target.value || null })}
                  />
                  <ToggleRow
                    label="Full upfront payment"
                    value={!form.deposit_only_to_book}
                    onChange={(v) => setForm({ ...form, deposit_only_to_book: !v })}
                  />
                  <ToggleRow
                    label="Deposit + balance"
                    value={form.deposit_only_to_book || form.deposit_amount > 0}
                    onChange={(v) => setForm({ ...form, deposit_only_to_book: v })}
                  />
                </div>
              ) : (
                <>
                  <DetailRow label="Price" value={`£${Number(course.price).toFixed(2)}`} />
                  <DetailRow
                    label="Deposit"
                    value={course.deposit_amount > 0 ? `£${Number(course.deposit_amount).toFixed(2)}` : "—"}
                  />
                  <DetailRow
                    label="Early bird"
                    value={
                      course.early_bird_discount > 0
                        ? `£${Number(course.early_bird_discount).toFixed(2)} until ${formatDate(course.early_bird_expiry)}`
                        : "—"
                    }
                  />
                  <DetailRow
                    label="Payment options"
                    value={
                      course.deposit_only_to_book
                        ? "Deposit + balance"
                        : course.deposit_amount > 0
                        ? "Full or deposit + balance"
                        : "Full upfront"
                    }
                    last
                  />
                </>
              )}
            </Card>

            {/* BOOKINGS */}
            <SectionHeader>BOOKINGS ({bookings.length})</SectionHeader>
            {bookings.length === 0 ? (
              <Card>
                <div style={{ color: "#6B7280", fontSize: 13, textAlign: "center", padding: 8 }}>
                  No bookings yet
                </div>
              </Card>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {bookings.map((b) => (
                  <Card key={b.id} style={{ padding: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 600, color: VALUE }}>{b.pupil_name}</div>
                        {b.pupil_phone && (
                          <div style={{ fontSize: 13, color: LABEL, marginTop: 2 }}>{b.pupil_phone}</div>
                        )}
                      </div>
                      <span
                        style={{
                          background: statusColor(b.status),
                          color: "#fff",
                          fontSize: 10,
                          fontWeight: 700,
                          padding: "3px 7px",
                          borderRadius: 6,
                          textTransform: "uppercase",
                          letterSpacing: 0.4,
                        }}
                      >
                        {b.status}
                      </span>
                      <div style={{ fontSize: 14, fontWeight: 700, color: "#16A34A", marginLeft: 4 }}>
                        £{Number(b.amount_paid).toFixed(0)}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
                      {b.pupil_phone && (
                        <>
                          <a
                            href={`tel:${b.pupil_phone}`}
                            style={{ flex: 1, textDecoration: "none" }}
                          >
                            <Button variant="ghost" inline style={{ width: "100%", height: 36 }}>
                              <Phone size={14} style={{ marginRight: 6 }} />
                              Call
                            </Button>
                          </a>
                          <a
                            href={`sms:${b.pupil_phone}`}
                            style={{ flex: 1, textDecoration: "none" }}
                          >
                            <Button variant="ghost" inline style={{ width: "100%", height: 36 }}>
                              <MessageSquare size={14} style={{ marginRight: 6 }} />
                              Text
                            </Button>
                          </a>
                        </>
                      )}
                      {Number(b.amount_paid) === 0 && (
                        <Button
                          variant="primary"
                          inline
                          style={{ flex: 1, height: 36 }}
                          onClick={() => markPaid(b)}
                        >
                          Mark paid
                        </Button>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12 }}>
              <Button variant="ghost" onClick={() => setAddOpen(true)}>
                + Add booking
              </Button>
              <Button variant="ghost" onClick={duplicate}>
                Duplicate course
              </Button>
            </div>

            {/* EDIT actions */}
            {editing && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 16 }}>
                <Button variant="primary" onClick={saveChanges} disabled={saving}>
                  {saving ? (
                    <>
                      <Loader2 size={16} className="animate-spin" style={{ marginRight: 6 }} />
                      Saving…
                    </>
                  ) : (
                    "Save changes"
                  )}
                </Button>
                <Button variant="destructive" onClick={archive}>
                  Archive course
                </Button>
              </div>
            )}

            {error && (
              <div
                style={{
                  marginTop: 12,
                  color: "#CC2229",
                  fontSize: 13,
                  fontWeight: 500,
                  textAlign: "center",
                }}
              >
                {error}
              </div>
            )}
          </>
        )}
      </div>

      {addOpen && course && (
        <AddBookingSheet
          course={course}
          onClose={() => setAddOpen(false)}
          onSaved={() => {
            setAddOpen(false);
            load();
          }}
        />
      )}
    </div>
  );
}

/* ------------ subcomponents ------------ */

function DetailRow({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        gap: 12,
        padding: "10px 12px",
        borderBottom: last ? "none" : "0.5px solid #E2E6ED",
      }}
    >
      <div style={{ fontSize: 13, color: LABEL }}>{label}</div>
      <div
        style={{
          fontSize: 13,
          color: VALUE,
          fontWeight: 600,
          textAlign: "right",
          maxWidth: "60%",
          wordBreak: "break-word",
        }}
      >
        {value}
      </div>
    </div>
  );
}

function ToggleRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <div style={{ fontSize: 13, color: VALUE, fontWeight: 500 }}>{label}</div>
      <button
        onClick={() => onChange(!value)}
        style={{
          width: 44,
          height: 26,
          borderRadius: 13,
          border: "none",
          background: value ? "#16A34A" : "#cbd2dc",
          position: "relative",
          cursor: "pointer",
        }}
        aria-label={label}
      >
        <span
          style={{
            position: "absolute",
            top: 3,
            left: value ? 21 : 3,
            width: 20,
            height: 20,
            background: "#fff",
            borderRadius: "50%",
            transition: "left 120ms",
          }}
        />
      </button>
    </div>
  );
}

function SelectRow({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: [string, string][];
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <div style={{ fontSize: 12, color: LABEL, fontWeight: 500, marginBottom: 4 }}>{label}</div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: "100%",
          height: 44,
          borderRadius: 8,
          border: "0.5px solid #E2E6ED",
          padding: "0 10px",
          background: "#fff",
          fontFamily: "Poppins, sans-serif",
          fontSize: 14,
          color: "#1A1A2E",
        }}
      >
        {options.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
    </div>
  );
}

function AddBookingSheet({
  course,
  onClose,
  onSaved,
}: {
  course: Course;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [amount, setAmount] = useState<string>("");
  const [status, setStatus] = useState<"confirmed" | "pending" | "cancelled">("confirmed");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function save() {
    if (!name.trim()) {
      setErr("Pupil name is required");
      return;
    }
    setSaving(true);
    setErr(null);

    const { data: auth } = await supabase.auth.getUser();
    const uid = auth.user?.id;
    if (!uid) {
      setSaving(false);
      setErr("You must be signed in");
      return;
    }

    const { error: insErr } = await supabase.from("course_bookings").insert({
      course_id: course.id,
      instructor_id: uid,
      pupil_name: name.trim(),
      pupil_phone: phone.trim() || null,
      pupil_email: email.trim() || null,
      amount_paid: parseFloat(amount || "0") || 0,
      status,
    });

    if (insErr) {
      setSaving(false);
      setErr(insErr.message);
      return;
    }

    // Bump spaces_taken
    await supabase
      .from("instructor_courses")
      .update({ spaces_taken: (course.spaces_taken ?? 0) + 1 })
      .eq("id", course.id);

    // Auto-create first lesson for this booking
    const timeMap: Record<string, string> = {
      morning: "09:00",
      afternoon: "13:00",
      evening: "17:00",
      flexible: "09:00",
    };
    const lessonTime = timeMap[course.lesson_time_preference] ?? "09:00";
    const durationMinutes = course.daily_hours ? course.daily_hours * 60 : 60;

    if (course.start_date) {
      const { error: lessonErr } = await supabase.from("lessons").insert({
        instructor_id: uid,
        pupil_id: null,
        lesson_date: course.start_date,
        lesson_time: lessonTime,
        duration_minutes: durationMinutes,
        status: "confirmed",
        notes: `Course booking: ${course.name} — ${name.trim()}`,
      });
      if (lessonErr) console.error("[courses.$id] auto-create lesson", lessonErr);
    }

    // Notification
    await supabase.from("instructor_notifications").insert({
      instructor_id: uid,
      title: "New course booking",
      body: `${name.trim()} booked ${course.name}`,
      type: "payment",
    });

    setSaving(false);
    toast.success(
      course.start_date
        ? `Booking confirmed — first lesson added to schedule for ${formatDate(course.start_date)}`
        : "Booking confirmed",
    );
    onSaved();
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15,32,68,0.45)",
        zIndex: 50,
        display: "flex",
        alignItems: "flex-end",
        ...POPPINS,
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#fff",
          width: "100%",
          borderTopLeftRadius: 16,
          borderTopRightRadius: 16,
          padding: 16,
          maxHeight: "85vh",
          overflowY: "auto",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: VALUE, margin: 0 }}>Add booking</h2>
          <button
            onClick={onClose}
            style={{ background: "none", border: "none", cursor: "pointer", color: LABEL, display: "flex" }}
            aria-label="Close"
          >
            <X size={22} />
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <Input label="Pupil name" value={name} onChange={(e) => setName(e.target.value)} />
          <Input label="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
          <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Input
            label="Amount paid (£)"
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
          <SelectRow
            label="Status"
            value={status}
            options={[
              ["confirmed", "Confirmed"],
              ["pending", "Pending"],
              ["cancelled", "Cancelled"],
            ]}
            onChange={(v) => setStatus(v as typeof status)}
          />
        </div>

        {err && (
          <div style={{ marginTop: 10, color: "#CC2229", fontSize: 13, fontWeight: 500 }}>{err}</div>
        )}

        <div style={{ marginTop: 14 }}>
          <Button variant="primary" onClick={save} disabled={saving}>
            {saving ? (
              <>
                <Loader2 size={16} className="animate-spin" style={{ marginRight: 6 }} />
                Saving…
              </>
            ) : (
              "Save booking"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
