import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ChevronLeft, Pencil, Archive, Phone, MessageSquare, X, Loader2, MapPin, Clock, Sunrise, Sun, Moon, GraduationCap, Settings } from "lucide-react";

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

const RADIUS_OPTIONS = [1, 3, 5, 10, 15, 20, 30];

// SQL to run manually:
// alter table instructor_courses add column if not exists radius_miles integer default 10;
// alter table instructor_courses add column if not exists pickup_lat double precision;
// alter table instructor_courses add column if not exists pickup_lng double precision;
// alter table instructor_courses add column if not exists lesson_time_from time;
// alter table instructor_courses add column if not exists lesson_time_to time;

const UK_POSTCODE_RE = /^[A-Z]{1,2}[0-9][A-Z0-9]? ?[0-9][A-Z]{2}$/i;
const UK_OUTCODE_RE = /^[A-Z]{1,2}[0-9][A-Z0-9]?$/i;
function isValidUKPostcode(value: string): boolean {
  const v = value.trim();
  return UK_POSTCODE_RE.test(v) || UK_OUTCODE_RE.test(v);
}
const PICKUP_ERROR_MSG = "Please enter a valid UK postcode or outcode (e.g. SO22 or SO22 5DB)";
const PICKUP_EMPTY_MSG = "Pickup postcode is required";

type PickupItem = { postcode: string; lat: number | null; lng: number | null };



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
  repeat_days: number[] | null;
  repeat_end_date: string | null;
  pickup_area: string | null;
  pickup_lat: number | null;
  pickup_lng: number | null;

  radius_miles: number | null;

  lesson_time_preference: string;
  lesson_time_from: string | null;
  lesson_time_to: string | null;
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
  const [pickupError, setPickupError] = useState<string | null>(null);

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
      const row = c as Course;
      setCourse(row);
      setForm(row);
    }

    const { data: bs, error: bErr } = await supabase
      .from("course_bookings")
      .select("*")
      .eq("course_id", id)
      .order("booked_at", { ascending: false });
    console.log("[courses.$id] bookings fetch result:", bs, bErr);
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
    if (!form.pickup_area || !isValidUKPostcode(form.pickup_area)) {
      const msg = !form.pickup_area ? PICKUP_EMPTY_MSG : PICKUP_ERROR_MSG;
      setPickupError(msg);
      setError(msg);
      toast.error(msg);
      return;
    }
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
        radius_miles: patch.radius_miles ? Number(patch.radius_miles) : 10,
        pickup_area: form.pickup_area,
        pickup_lat: form.pickup_lat,
        pickup_lng: form.pickup_lng,
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
                  <SelectRow
                    label="Course type"
                    value={form.course_type}
                    options={[
                      ["intensive", "Intensive"],
                      ["semi-intensive", "Semi-intensive"],
                      ["weekly", "Weekly"],
                      ["custom", "Custom"],
                    ]}
                    onChange={(v) => setForm({ ...form, course_type: v })}
                  />
                  <SelectRow
                    label="Status"
                    value={form.status}
                    options={[
                      ["active", "Active"],
                      ["draft", "Draft"],
                      ["full", "Full"],
                      ["archived", "Archived"],
                    ]}
                    onChange={(v) => setForm({ ...form, status: v })}
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
                  <div>
                    <div style={{ fontSize: 12, color: LABEL, fontWeight: 500, marginBottom: 4 }}>
                      Pickup postcode <span style={{ color: "#CC2229" }}>*</span>
                    </div>
                    <PostcodeAutocomplete
                      value={
                        form.pickup_area
                          ? { postcode: form.pickup_area, lat: form.pickup_lat, lng: form.pickup_lng }
                          : null
                      }
                      onChange={(v) =>
                        setForm({
                          ...form,
                          pickup_area: v?.postcode ?? null,
                          pickup_lat: v?.lat ?? null,
                          pickup_lng: v?.lng ?? null,
                        })
                      }
                      error={pickupError}
                      onErrorChange={setPickupError}
                    />
                  </div>


                  <div>
                    <div style={{ fontSize: 12, color: LABEL, fontWeight: 500, marginBottom: 4 }}>
                      Coverage radius
                    </div>
                    <select
                      value={form.radius_miles ?? 10}
                      onChange={(e) => setForm({ ...form, radius_miles: Number(e.target.value) })}
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
                      {RADIUS_OPTIONS.map((m) => (
                        <option key={m} value={m}>{m} mile{m === 1 ? "" : "s"}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <div style={{ fontSize: 12, color: LABEL, fontWeight: 500, marginBottom: 6 }}>
                      Lesson time
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                      {([
                        { key: "flexible", label: "Flexible", desc: "Any time of day", Icon: Clock, color: "#1A52A0", full: false },
                        { key: "morning", label: "Morning", desc: "08:00 – 12:00", Icon: Sunrise, color: "#F59E0B", full: false },
                        { key: "afternoon", label: "Afternoon", desc: "12:00 – 17:00", Icon: Sun, color: "#E8641A", full: false },
                        { key: "evening", label: "Evening", desc: "17:00 – 20:00", Icon: Moon, color: "#7C3AED", full: false },
                        { key: "daytime", label: "Daytime", desc: "08:00 – 17:00", Icon: Sun, color: "#16A34A", full: false },
                        { key: "school", label: "School hours", desc: "09:00 – 15:00", Icon: GraduationCap, color: "#1A52A0", full: false },
                        { key: "custom", label: "Custom", desc: "Set your own times", Icon: Settings, color: "#6B7280", full: true },
                      ] as Array<{ key: string; label: string; desc: string; Icon: typeof Clock; color: string; full: boolean }>).map(({ key, label, desc, Icon, color, full }) => {
                        const active = (form.lesson_time_preference || "flexible") === key;
                        return (
                          <button
                            key={key}
                            type="button"
                            onClick={() =>
                              setForm((prev) =>
                                prev ? { ...prev, lesson_time_preference: key } : prev,
                              )
                            }
                            style={{
                              gridColumn: full ? "1 / -1" : undefined,
                              display: "flex",
                              alignItems: "center",
                              gap: 10,
                              padding: "10px 12px",
                              borderRadius: 12,
                              border: `1.5px solid ${active ? color : "#E2E6ED"}`,
                              background: active ? `${color}10` : "#fff",
                              cursor: "pointer",
                              fontFamily: "Poppins, sans-serif",
                              textAlign: "left",
                            }}
                          >
                            <div style={{
                              width: 32, height: 32, borderRadius: 8,
                              background: `${color}1a`, color,
                              display: "flex", alignItems: "center", justifyContent: "center",
                              flexShrink: 0,
                            }}>
                              <Icon size={18} />
                            </div>
                            <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
                              <span style={{ fontSize: 13, fontWeight: 600, color: "#0F2044" }}>{label}</span>
                              <span style={{ fontSize: 11, color: "#6B7280" }}>{desc}</span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                    {form.lesson_time_preference === "custom" && (
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 10 }}>
                        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                          <span style={{ fontSize: 12, fontWeight: 500, color: LABEL, fontFamily: "Poppins, sans-serif" }}>From</span>
                          <input
                            type="time"
                            value={form.lesson_time_from ?? "09:00"}
                            onChange={(e) =>
                              setForm((prev) => (prev ? { ...prev, lesson_time_from: e.target.value || null } : prev))
                            }
                            style={{
                              height: 44, borderRadius: 10, border: "0.5px solid #E2E6ED",
                              padding: "0 10px", fontSize: 14, fontFamily: "Poppins, sans-serif",
                              color: "#1A1A2E", background: "#fff",
                            }}
                          />
                        </label>
                        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                          <span style={{ fontSize: 12, fontWeight: 500, color: LABEL, fontFamily: "Poppins, sans-serif" }}>To</span>
                          <input
                            type="time"
                            value={form.lesson_time_to ?? "17:00"}
                            onChange={(e) =>
                              setForm((prev) => (prev ? { ...prev, lesson_time_to: e.target.value || null } : prev))
                            }
                            style={{
                              height: 44, borderRadius: 10, border: "0.5px solid #E2E6ED",
                              padding: "0 10px", fontSize: 14, fontFamily: "Poppins, sans-serif",
                              color: "#1A1A2E", background: "#fff",
                            }}
                          />
                        </label>
                      </div>
                    )}
                  </div>
                  <div>
                    <div style={{ fontSize: 12, color: LABEL, fontWeight: 500, marginBottom: 6 }}>
                      Repeat
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 6 }}>
                      {([
                        ["one-off", "One-off"],
                        ["daily", "Daily"],
                        ["weekly", "Weekly"],
                        ["monthly", "Monthly"],
                      ] as const).map(([key, label]) => {
                        const active = form.repeat_type === key;
                        return (
                          <button
                            key={key}
                            type="button"
                            onClick={() =>
                              setForm((prev) =>
                                prev ? { ...prev, repeat_type: key } : prev,
                              )
                            }
                            style={{
                              height: 36,
                              borderRadius: 8,
                              border: `1px solid ${active ? "#0F2044" : "#E2E6ED"}`,
                              background: active ? "#0F2044" : "#fff",
                              color: active ? "#fff" : "#0F2044",
                              fontFamily: "Poppins, sans-serif",
                              fontSize: 12,
                              fontWeight: 600,
                              cursor: "pointer",
                            }}
                          >
                            {label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {form.repeat_type === "weekly" && (
                    <div>
                      <div style={{ fontSize: 12, color: LABEL, fontWeight: 500, marginBottom: 6 }}>
                        Repeat on
                      </div>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        {([
                          [1, "Mon"],
                          [2, "Tue"],
                          [3, "Wed"],
                          [4, "Thu"],
                          [5, "Fri"],
                          [6, "Sat"],
                          [0, "Sun"],
                        ] as const).map(([d, lbl]) => {
                          const days = form.repeat_days ?? [];
                          const active = days.includes(d);
                          return (
                            <button
                              key={d}
                              type="button"
                              onClick={() =>
                                setForm((prev) => {
                                  if (!prev) return prev;
                                  const cur = prev.repeat_days ?? [];
                                  const next = cur.includes(d)
                                    ? cur.filter((x) => x !== d)
                                    : [...cur, d].sort((a, b) => a - b);
                                  return { ...prev, repeat_days: next };
                                })
                              }
                              style={{
                                minWidth: 44,
                                height: 36,
                                padding: "0 10px",
                                borderRadius: 999,
                                border: `1px solid ${active ? "#0F2044" : "#E2E6ED"}`,
                                background: active ? "#0F2044" : "#fff",
                                color: active ? "#fff" : "#0F2044",
                                fontFamily: "Poppins, sans-serif",
                                fontSize: 12,
                                fontWeight: 600,
                                cursor: "pointer",
                              }}
                            >
                              {lbl}
                            </button>
                          );
                        })}
                      </div>
                      <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                        {([
                          ["Weekdays", [1, 2, 3, 4, 5]],
                          ["Weekends", [0, 6]],
                          ["All", [0, 1, 2, 3, 4, 5, 6]],
                        ] as const).map(([lbl, arr]) => (
                          <button
                            key={lbl}
                            type="button"
                            onClick={() =>
                              setForm((prev) =>
                                prev ? { ...prev, repeat_days: [...arr] } : prev,
                              )
                            }
                            style={{
                              height: 30,
                              padding: "0 12px",
                              borderRadius: 999,
                              border: "1px solid #E2E6ED",
                              background: "#fff",
                              color: "#0F2044",
                              fontFamily: "Poppins, sans-serif",
                              fontSize: 11,
                              fontWeight: 600,
                              cursor: "pointer",
                            }}
                          >
                            {lbl}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {form.repeat_type !== "one-off" && (
                    <Input
                      label="Repeat until"
                      type="date"
                      value={form.repeat_end_date ?? ""}
                      onChange={(e) =>
                        setForm({ ...form, repeat_end_date: e.target.value || null })
                      }
                    />
                  )}
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
                  <ToggleRow
                    label="Publish to marketplace"
                    value={form.publish_marketplace}
                    onChange={(v) => setForm({ ...form, publish_marketplace: v })}
                  />
                  <ToggleRow
                    label="Publish to mini-website"
                    value={form.publish_mini_website}
                    onChange={(v) => setForm({ ...form, publish_mini_website: v })}
                  />
                </div>
              ) : (
                <>
                  <DetailRow label="Start date" value={formatDate(course.start_date)} />
                  <DetailRow label="End date" value={formatDate(course.end_date)} />
                  <DetailRow label="Daily hours" value={course.daily_hours ? `${course.daily_hours}h` : "—"} />
                  <DetailRow
                    label="Pickup postcode"
                    value={course.pickup_area || "—"}
                  />

                  <DetailRow
                    label="Lesson time"
                    value={(() => {
                      const map: Record<string, string> = {
                        flexible: "Flexible (any time)",
                        morning: "Morning (08:00 – 12:00)",
                        afternoon: "Afternoon (12:00 – 17:00)",
                        evening: "Evening (17:00 – 20:00)",
                        daytime: "Daytime (08:00 – 17:00)",
                        school: "School hours (09:00 – 15:00)",
                      };
                      const k = course.lesson_time_preference || "flexible";
                      if (k === "custom") {
                        const f = (course.lesson_time_from ?? "09:00").slice(0, 5);
                        const t = (course.lesson_time_to ?? "17:00").slice(0, 5);
                        return `Custom (${f} – ${t})`;
                      }
                      return map[k] ?? k;
                    })()}
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

/* ---------- PostcodeAutocomplete ---------- */
type PostcodeSuggestion = { postcode: string; area: string };

function PostcodeAutocomplete(props: {
  value: PickupItem | null;
  onChange: (v: PickupItem | null) => void;
  error: string | null;
  onErrorChange: (e: string | null) => void;
}) {
  const { value, onChange, error, onErrorChange } = props;
  const [input, setInput] = useState(value?.postcode ?? "");
  const [suggestions, setSuggestions] = useState<PostcodeSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [focused, setFocused] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastValueRef = useRef<string>(value?.postcode ?? "");

  useEffect(() => {
    const pc = value?.postcode ?? "";
    if (pc !== lastValueRef.current) {
      lastValueRef.current = pc;
      setInput(pc);
    }
  }, [value?.postcode]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const q = input.trim();
    if (q.length < 2 || q.toUpperCase() === (value?.postcode ?? "").toUpperCase()) {
      setSuggestions([]);
      setOpen(false);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://api.postcodes.io/postcodes?q=${encodeURIComponent(q)}&limit=8`,
        );
        const json = await res.json();
        const items: PostcodeSuggestion[] = (json?.result ?? []).map((r: { postcode: string; admin_district: string }) => ({
          postcode: r.postcode,
          area: r.admin_district,
        }));
        setSuggestions(items);
        setOpen(items.length > 0);
        setActive(-1);
      } catch (err) {
        console.error("[postcode] lookup failed", err);
      }
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [input, value?.postcode]);

  async function commitText(raw: string) {
    const v = raw.trim().toUpperCase();
    if (!v) {
      onChange(null);
      lastValueRef.current = "";
      return;
    }
    if (!isValidUKPostcode(v)) {
      onErrorChange(PICKUP_ERROR_MSG);
      return;
    }
    let canonical = v;
    let lat: number | null = null;
    let lng: number | null = null;
    if (UK_POSTCODE_RE.test(v)) {
      try {
        const res = await fetch(
          `https://api.postcodes.io/postcodes/${encodeURIComponent(v)}`,
        );
        const json = await res.json();
        if (json?.status === 200 && json.result) {
          canonical = json.result.postcode;
          lat = json.result.latitude;
          lng = json.result.longitude;
        } else {
          onErrorChange(PICKUP_ERROR_MSG);
          return;
        }
      } catch {
        /* keep raw */
      }
    }
    onErrorChange(null);
    lastValueRef.current = canonical;
    onChange({ postcode: canonical, lat, lng });
    setInput(canonical);
    setOpen(false);
    setSuggestions([]);
  }

  async function selectSuggestion(s: PostcodeSuggestion) {
    setOpen(false);
    await commitText(s.postcode);
  }

  return (
    <div style={{ position: "relative" }}>
      <div style={{ position: "relative" }}>
        <MapPin
          size={16}
          color="#6B7280"
          style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}
        />
        <input
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            if (error) onErrorChange(null);
          }}
          onFocus={() => setFocused(true)}
          onBlur={() => {
            setFocused(false);
            setTimeout(() => setOpen(false), 150);
            const trimmed = input.trim();
            if (!trimmed) {
              onChange(null);
              lastValueRef.current = "";
              return;
            }
            if (trimmed.toUpperCase() !== (value?.postcode ?? "").toUpperCase()) {
              void commitText(trimmed);
            }
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              setOpen(false);
              return;
            }
            if (e.key === "Enter") {
              e.preventDefault();
              if (open && active >= 0 && suggestions[active]) void selectSuggestion(suggestions[active]);
              else void commitText(input);
              return;
            }
            if (!open || suggestions.length === 0) return;
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setActive((a) => Math.min(a + 1, suggestions.length - 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActive((a) => Math.max(a - 1, 0));
            }
          }}
          placeholder="e.g. SO22 5DB"
          style={{
            width: "100%",
            height: 44,
            border: `1.5px solid ${error ? "#CC2229" : focused ? "#1A52A0" : "#E2E6ED"}`,
            borderRadius: 8,
            padding: "0 12px 0 40px",
            fontFamily: "Poppins, sans-serif",
            fontSize: 14,
            color: "#1A1A2E",
            background: "#fff",
            outline: "none",
            boxSizing: "border-box",
          }}
        />
      </div>
      {error && (
        <div style={{ color: "#CC2229", fontSize: 12, marginTop: 4, fontFamily: "Poppins, sans-serif" }}>
          {error}
        </div>
      )}
      {open && suggestions.length > 0 && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            zIndex: 50,
            marginTop: 4,
            background: "#fff",
            border: "0.5px solid #E2E6ED",
            borderRadius: 8,
            boxShadow: "0 4px 16px rgba(0,0,0,0.1)",
            maxHeight: 240,
            overflowY: "auto",
          }}
        >
          {suggestions.map((s, i) => (
            <div
              key={s.postcode}
              onMouseDown={(e) => {
                e.preventDefault();
                void selectSuggestion(s);
              }}
              onMouseEnter={() => setActive(i)}
              style={{
                padding: "10px 12px",
                display: "flex",
                alignItems: "center",
                gap: 8,
                cursor: "pointer",
                background: active === i ? "#F8F9FB" : "#fff",
                fontFamily: "Poppins, sans-serif",
              }}
            >
              <MapPin size={14} color="#6B7280" />
              <span style={{ fontWeight: 700, color: "#0F2044", fontSize: 14 }}>{s.postcode}</span>
              <span style={{ color: "#6B7280", fontSize: 13 }}>{s.area}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

