import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ChevronLeft, Plus, X, Pencil, Trash2, Users as UsersIcon, Camera } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { useAdminGate } from "./admin";

export const Route = createFileRoute("/admin/dsm-live")({
  component: AdminDsmLive,
});

const SUPABASE_URL = "https://bjpqxfrihwjcqprmoqfs.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJqcHF4ZnJpaHdqY3Fwcm1vcWZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE0NzQ4MjEsImV4cCI6MjA5NzA1MDgyMX0.HKlgx3dxP3uxX9wMRRUnfb0IPwaBpFcut_iUgT5XFeo";

const CATEGORIES = [
  "Standards Check Prep",
  "Business Coaching",
  "CPD Webinar",
  "New ADI Support",
  "Q&A Session",
];
const STATUSES = ["upcoming", "live", "completed", "cancelled"] as const;
const FREQUENCIES = [
  { value: "weekly", label: "Weekly", days: 7 },
  { value: "fortnightly", label: "Fortnightly", days: 14 },
  { value: "monthly", label: "Monthly", days: 0 /* month-based */ },
] as const;

type Frequency = typeof FREQUENCIES[number]["value"];

function generateOccurrences(startDate: string, until: string, freq: Frequency): string[] {
  const out: string[] = [];
  if (!startDate || !until) return out;
  const start = new Date(startDate + "T00:00:00");
  const end = new Date(until + "T00:00:00");
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) return [startDate];
  const cur = new Date(start);
  let guard = 0;
  while (cur <= end && guard < 500) {
    out.push(cur.toISOString().slice(0, 10));
    if (freq === "monthly") {
      cur.setMonth(cur.getMonth() + 1);
    } else {
      const days = freq === "fortnightly" ? 14 : 7;
      cur.setDate(cur.getDate() + days);
    }
    guard++;
  }
  return out;
}

type Session = {
  id: string;
  title: string;
  category: string | null;
  host_name: string | null;
  description: string | null;
  session_date: string | null;
  session_time: string | null;
  duration_minutes: number | null;
  max_spaces: number | null;
  spaces_taken: number | null;
  price_display: string | null;
  price_amount: number | null;
  free_for_plus_max: boolean | null;
  zoom_link: string | null;
  zoom_link_revealed_after_booking: boolean | null;
  image_url: string | null;
  image_position: string | null;
  status: string | null;
  deleted_at: string | null;
};

async function restFetch(path: string, init?: RequestInit) {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token || SUPABASE_ANON_KEY;
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
      ...(init?.headers || {}),
    },
  });
  if (!res.ok) throw new Error(await res.text());
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

function emptyForm(): Partial<Session> {
  return {
    title: "",
    category: CATEGORIES[0],
    host_name: "DSM by EveryDriver",
    description: "",
    session_date: "",
    session_time: "",
    duration_minutes: 60,
    max_spaces: 20,
    price_display: "",
    price_amount: 0,
    free_for_plus_max: true,
    zoom_link: "",
    zoom_link_revealed_after_booking: true,
    image_url: "",
    image_position: "center center",
    status: "upcoming",
  };
}

function AdminDsmLive() {
  const navigate = useNavigate();
  const status = useAdminGate();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);
  const [editing, setEditing] = useState<Session | null>(null);
  const [showSheet, setShowSheet] = useState(false);
  const [form, setForm] = useState<Partial<Session>>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [bookingsFor, setBookingsFor] = useState<Session | null>(null);
  const [bookings, setBookings] = useState<any[]>([]);
  const [isRecurring, setIsRecurring] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [cropFile, setCropFile] = useState<File | null>(null);
  const [cropDataUrl, setCropDataUrl] = useState<string | null>(null);
  const [cropPos, setCropPos] = useState<{ x: number; y: number }>({ x: 50, y: 50 });
  const cropDragRef = useRef<{ startX: number; startY: number; startPosX: number; startPosY: number; width: number; height: number } | null>(null);
  const [recurringFrequency, setRecurringFrequency] = useState<Frequency>("weekly");
  const [recurringUntil, setRecurringUntil] = useState<string>("");

  useEffect(() => {
    if (status === "denied") navigate({ to: "/home" });
  }, [status, navigate]);

  async function loadSessions() {
    setLoading(true);
    try {
      const data = await restFetch(
        "dsm_live_sessions?deleted_at=is.null&order=session_date.asc"
      );
      setSessions(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (status === "allowed") loadSessions();
  }, [status]);

  const stats = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    let upcoming = 0;
    let booked = 0;
    let past = 0;
    for (const s of sessions) {
      if (s.status === "upcoming") upcoming++;
      booked += s.spaces_taken || 0;
      if (s.session_date && s.session_date < today) past++;
    }
    return { upcoming, booked, past };
  }, [sessions]);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2000);
  }

  function openAdd() {
    setEditing(null);
    setForm(emptyForm());
    setIsRecurring(false);
    setRecurringFrequency("weekly");
    setRecurringUntil("");
    setShowSheet(true);
  }

  function openEdit(s: Session) {
    setEditing(s);
    setForm({ ...s });
    setIsRecurring(false);
    setRecurringFrequency("weekly");
    setRecurringUntil("");
    setShowSheet(true);
  }

  async function handleSave() {
    if (!form.title || !form.session_date || !form.session_time) {
      showToast("Title, date and time are required");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        title: form.title,
        category: form.category,
        host_name: form.host_name || "DSM by EveryDriver",
        description: form.description || null,
        session_date: form.session_date,
        session_time:
          form.session_time && form.session_time.length === 5
            ? `${form.session_time}:00`
            : form.session_time,
        duration_minutes: Number(form.duration_minutes) || 60,
        max_spaces: Number(form.max_spaces) || 20,
        price_display: form.price_display || null,
        price_amount: Number(form.price_amount) || 0,
        free_for_plus: !!form.free_for_plus_max,
        zoom_link: form.zoom_link || null,
        zoom_link_revealed_after_booking: !!form.zoom_link_revealed_after_booking,
        image_url: form.image_url || null,
        image_position: form.image_position || "center center",
        status: form.status || "upcoming",
      };
      if (editing) {
        console.log("[dsm-live] saving session (PATCH):", payload);
        await restFetch(`dsm_live_sessions?id=eq.${editing.id}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
        console.log("[dsm-live] save result: PATCH ok");
        showToast("Session updated");
      } else if (isRecurring && recurringUntil && form.session_date) {
        const groupId = crypto.randomUUID();
        const dates = generateOccurrences(form.session_date, recurringUntil, recurringFrequency);
        const rows = dates.map((d) => ({
          ...payload,
          session_date: d,
          is_recurring: true,
          recurring_frequency: recurringFrequency,
          recurring_group_id: groupId,
        }));
        console.log("[dsm-live] saving session (POST recurring):", rows);
        const data = await restFetch("dsm_live_sessions", {
          method: "POST",
          body: JSON.stringify(rows),
        });
        console.log("[dsm-live] save result: POST recurring", data);
        showToast(`Created ${rows.length} recurring sessions`);
      } else {
        console.log("[dsm-live] saving session (POST):", payload);
        const data = await restFetch("dsm_live_sessions", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        console.log("[dsm-live] save result: POST", data);
        showToast("Session added");
      }
      setShowSheet(false);
      loadSessions();
    } catch (e: any) {
      console.error("[dsm-live] save error:", e?.message || e);
      showToast(`Save failed: ${e?.message?.slice(0, 60) || "unknown"}`);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(s: Session) {
    return _handleDelete(s);
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setCropFile(file);
      setCropDataUrl(String(reader.result));
      setCropPos({ x: 50, y: 50 });
    };
    reader.readAsDataURL(file);
    if (imageInputRef.current) imageInputRef.current.value = "";
  }

  function cancelCrop() {
    setCropFile(null);
    setCropDataUrl(null);
  }

  async function confirmCrop() {
    if (!cropFile) return;
    setUploadingImage(true);
    try {
      const ext = cropFile.name.split(".").pop() || "jpg";
      const path = `sessions/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error: upErr } = await supabase
        .storage
        .from("dsm-live-images")
        .upload(path, cropFile, { contentType: cropFile.type, upsert: false });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("dsm-live-images").getPublicUrl(path);
      const positionStr = `${cropPos.x}% ${cropPos.y}%`;
      setForm((f) => ({ ...f, image_url: pub.publicUrl, image_position: positionStr }));
      showToast("Image uploaded");
      setCropFile(null);
      setCropDataUrl(null);
    } catch (err: any) {
      console.error("[dsm-live] image upload error:", err?.message || err);
      showToast(`Upload failed: ${err?.message?.slice(0, 60) || "unknown"}`);
    } finally {
      setUploadingImage(false);
    }
  }

  async function _handleDelete(s: Session) {
    if (!confirm(`Delete "${s.title}"?`)) return;
    try {
      await restFetch(`dsm_live_sessions?id=eq.${s.id}`, {
        method: "PATCH",
        body: JSON.stringify({ deleted_at: new Date().toISOString() }),
      });
      showToast("Deleted");
      loadSessions();
    } catch (e) {
      console.error(e);
      showToast("Delete failed");
    }
  }

  async function openBookings(s: Session) {
    setBookingsFor(s);
    setBookings([]);
    try {
      const data = await restFetch(
        `dsm_live_bookings?session_id=eq.${s.id}&select=*,instructors(name)`
      );
      setBookings(data || []);
    } catch (e) {
      console.error(e);
    }
  }

  if (status === "checking") {
    return (
      <div style={{ background: "#fff", minHeight: "100vh", padding: 24, fontFamily: "Inter, sans-serif", color: "#6B7280" }}>
        Checking access…
      </div>
    );
  }
  if (status === "denied") return null;

  return (
    <div style={{ background: "#fff", minHeight: "100vh", fontFamily: "Inter, sans-serif", paddingBottom: 40 }}>
      {/* Top bar */}
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 30,
          background: "#fff",
          borderBottom: "0.5px solid #E2E6ED",
          padding: "calc(env(safe-area-inset-top, 0px) + 12px) 16px 12px",
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}
      >
        <button
          type="button"
          onClick={() => navigate({ to: "/admin" })}
          aria-label="Back"
          style={{
            width: 32,
            height: 32,
            borderRadius: "50%",
            background: "#F3F4F6",
            border: "none",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            color: "#0B1F3A",
          }}
        >
          <ChevronLeft size={18} />
        </button>
        <div style={{ flex: 1, fontSize: 16, fontWeight: 600, color: "#0B1F3A" }}>DSM Live Sessions</div>
        <button
          type="button"
          onClick={openAdd}
          style={{
            background: "#CC2229",
            color: "#fff",
            border: "none",
            borderRadius: 10,
            padding: "8px 12px",
            fontSize: 13,
            fontWeight: 600,
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            cursor: "pointer",
          }}
        >
          <Plus size={14} /> Add session
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, padding: 16 }}>
        {[
          { label: "Upcoming", value: stats.upcoming },
          { label: "Total booked", value: stats.booked },
          { label: "Past", value: stats.past },
        ].map((s) => (
          <div
            key={s.label}
            style={{
              background: "#F9FAFB",
              border: "0.5px solid #E2E6ED",
              borderRadius: 12,
              padding: 12,
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: 20, fontWeight: 700, color: "#0B1F3A" }}>{s.value}</div>
            <div style={{ fontSize: 11, color: "#6B7280", marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Sessions list */}
      {loading ? (
        <div style={{ padding: 24, color: "#6B7280" }}>Loading…</div>
      ) : sessions.length === 0 ? (
        <div style={{ padding: 24, color: "#6B7280" }}>No sessions yet.</div>
      ) : (
        sessions.map((s) => (
          <div
            key={s.id}
            style={{
              background: "#fff",
              border: "0.5px solid #E2E6ED",
              borderRadius: 12,
              padding: 16,
              marginLeft: 16,
              marginRight: 16,
              marginBottom: 8,
            }}
          >
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 6, marginBottom: 6 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#0B1F3A", flex: "1 1 100%" }}>{s.title}</div>
              {s.category && (
                <span style={{ fontSize: 10, fontWeight: 600, background: "#EEF2F7", color: "#0B1F3A", padding: "2px 8px", borderRadius: 999 }}>
                  {s.category}
                </span>
              )}
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  padding: "2px 8px",
                  borderRadius: 999,
                  background:
                    s.status === "upcoming" ? "#DBEAFE" :
                    s.status === "live" ? "#FEE2E2" :
                    s.status === "completed" ? "#D1FAE5" : "#F3F4F6",
                  color:
                    s.status === "upcoming" ? "#1E40AF" :
                    s.status === "live" ? "#B91C1C" :
                    s.status === "completed" ? "#065F46" : "#374151",
                }}
              >
                {s.status}
              </span>
            </div>
            <div style={{ fontSize: 12, color: "#6B7280" }}>
              {s.session_date} · {s.session_time} · {s.duration_minutes} mins
            </div>
            <div style={{ fontSize: 12, color: "#6B7280", marginTop: 2 }}>
              {s.spaces_taken ?? 0}/{s.max_spaces ?? 0} booked · {s.price_display || (s.price_amount ? `£${s.price_amount}` : "Free")}
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
              <button
                type="button"
                onClick={() => openEdit(s)}
                style={actionBtn("#0B1F3A")}
              >
                <Pencil size={12} /> Edit
              </button>
              <button
                type="button"
                onClick={() => openBookings(s)}
                style={actionBtn("#1877D6")}
              >
                <UsersIcon size={12} /> Bookings
              </button>
              <button
                type="button"
                onClick={() => handleDelete(s)}
                style={actionBtn("#CC2229")}
              >
                <Trash2 size={12} /> Delete
              </button>
            </div>
          </div>
        ))
      )}

      {/* Add/Edit sheet */}
      {showSheet && (
        <Sheet onClose={() => setShowSheet(false)} title={editing ? "Edit session" : "Add session"}>
          <FormField label="Title *">
            <input style={inp} value={form.title || ""} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </FormField>
          <FormField label="Category">
            <select style={inp} value={form.category || ""} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </FormField>
          <FormField label="Host name">
            <input style={inp} value={form.host_name || ""} onChange={(e) => setForm({ ...form, host_name: e.target.value })} />
          </FormField>
          <FormField label="Description">
            <textarea style={{ ...inp, minHeight: 80, resize: "vertical" }} value={form.description || ""} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </FormField>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <FormField label="Date *">
              <input type="date" style={inp} value={form.session_date || ""} onChange={(e) => setForm({ ...form, session_date: e.target.value })} />
            </FormField>
            <FormField label="Time *">
              <input type="time" style={inp} value={form.session_time || ""} onChange={(e) => setForm({ ...form, session_time: e.target.value })} />
            </FormField>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <FormField label="Duration (mins)">
              <input type="number" style={inp} value={form.duration_minutes ?? 60} onChange={(e) => setForm({ ...form, duration_minutes: Number(e.target.value) })} />
            </FormField>
            <FormField label="Max spaces">
              <input type="number" style={inp} value={form.max_spaces ?? 20} onChange={(e) => setForm({ ...form, max_spaces: Number(e.target.value) })} />
            </FormField>
          </div>
          <FormField label="Price display">
            <input style={inp} placeholder="Free for Plus & Max" value={form.price_display || ""} onChange={(e) => setForm({ ...form, price_display: e.target.value })} />
          </FormField>
          <FormField label="Price amount (£, 0 = free)">
            <input type="number" style={inp} value={form.price_amount ?? 0} onChange={(e) => setForm({ ...form, price_amount: Number(e.target.value) })} />
          </FormField>
          <Toggle label="Free for Plus/Max" checked={!!form.free_for_plus_max} onChange={(v) => setForm({ ...form, free_for_plus_max: v })} />
          <FormField label="Zoom link">
            <input style={inp} placeholder="https://zoom.us/j/…" value={form.zoom_link || ""} onChange={(e) => setForm({ ...form, zoom_link: e.target.value })} />
          </FormField>
          <Toggle label="Reveal Zoom link after booking" checked={!!form.zoom_link_revealed_after_booking} onChange={(v) => setForm({ ...form, zoom_link_revealed_after_booking: v })} />
          <FormField label="Session image (optional)">
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              style={{ display: "none" }}
            />
            {form.image_url ? (
              <div style={{ position: "relative" }}>
                <div
                  onClick={() => imageInputRef.current?.click()}
                  style={{
                    width: "100%",
                    height: 120,
                    borderRadius: 10,
                    border: "1px solid #E2E6ED",
                    overflow: "hidden",
                    cursor: "pointer",
                    background: "#F3F4F6",
                  }}
                >
                  <img
                    src={form.image_url}
                    alt="Session"
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      objectPosition: form.image_position || "center center",
                      display: "block",
                    }}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, image_url: "" }))}
                  style={{
                    position: "absolute",
                    top: 8,
                    right: 8,
                    background: "rgba(11,31,58,0.85)",
                    color: "#fff",
                    border: "none",
                    borderRadius: 8,
                    padding: "4px 10px",
                    fontSize: 11,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Remove
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => imageInputRef.current?.click()}
                disabled={uploadingImage}
                style={{
                  width: "100%",
                  height: 120,
                  border: "1.5px dashed #CBD5E1",
                  borderRadius: 10,
                  background: "#F9FAFB",
                  color: "#6B7280",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                  cursor: uploadingImage ? "wait" : "pointer",
                  fontFamily: "Inter, sans-serif",
                  fontSize: 13,
                }}
              >
                <Camera size={22} />
                {uploadingImage ? "Uploading…" : "Tap to upload session image"}
              </button>
            )}
          </FormField>
          <FormField label="Status">
            <select style={inp} value={form.status || "upcoming"} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </FormField>
          {!editing && (
            <div style={{ marginTop: 8, padding: 12, background: "#F9FAFB", border: "0.5px solid #E2E6ED", borderRadius: 10 }}>
              <Toggle
                label="This is a recurring session"
                checked={isRecurring}
                onChange={setIsRecurring}
              />
              {isRecurring && (
                <div style={{ marginTop: 8 }}>
                  <FormField label="Frequency">
                    <select
                      style={inp}
                      value={recurringFrequency}
                      onChange={(e) => setRecurringFrequency(e.target.value as Frequency)}
                    >
                      {FREQUENCIES.map((f) => (
                        <option key={f.value} value={f.value}>{f.label}</option>
                      ))}
                    </select>
                  </FormField>
                  <FormField label="Repeat until">
                    <input
                      type="date"
                      style={inp}
                      value={recurringUntil}
                      onChange={(e) => setRecurringUntil(e.target.value)}
                    />
                  </FormField>
                  <div style={{ fontSize: 11, color: "#6B7280" }}>
                    Generates individual session entries for each occurrence.
                  </div>
                </div>
              )}
            </div>
          )}
          <button
            type="button"
            disabled={saving}
            onClick={handleSave}
            style={{
              width: "100%",
              background: "#CC2229",
              color: "#fff",
              border: "none",
              borderRadius: 10,
              padding: "12px 16px",
              fontSize: 14,
              fontWeight: 600,
              marginTop: 12,
              cursor: "pointer",
              opacity: saving ? 0.6 : 1,
              position: "sticky",
              bottom: 16,
              boxShadow: "0 -8px 16px rgba(255,255,255,0.9)",
            }}
          >
            {saving ? "Saving…" : "Save session"}
          </button>
          <div style={{ height: 100 }} />
        </Sheet>
      )}

      {/* Bookings sheet */}
      {bookingsFor && (
        <Sheet onClose={() => setBookingsFor(null)} title={`Bookings — ${bookingsFor.title}`}>
          {bookings.length === 0 ? (
            <div style={{ color: "#6B7280", fontSize: 13, padding: "8px 0" }}>No bookings yet.</div>
          ) : (
            bookings.map((b, i) => (
              <div key={b.id || i} style={{ padding: "10px 0", borderBottom: "0.5px solid #E2E6ED" }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#0B1F3A" }}>
                  {b.instructors?.name || b.instructor_name || "Instructor"}
                </div>
                <div style={{ fontSize: 12, color: "#6B7280" }}>{b.email || "—"}</div>
                <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 2 }}>
                  Booked {b.created_at ? new Date(b.created_at).toLocaleString() : "—"} · {b.status || "confirmed"}
                </div>
              </div>
            ))
          )}
          <button
            type="button"
            onClick={() => showToast("Coming soon")}
            style={{
              width: "100%",
              background: "#1877D6",
              color: "#fff",
              border: "none",
              borderRadius: 10,
              padding: "12px 16px",
              fontSize: 14,
              fontWeight: 600,
              marginTop: 12,
              cursor: "pointer",
            }}
          >
            Send Zoom link to all
          </button>
        </Sheet>
      )}

      {toast && (
        <div
          style={{
            position: "fixed",
            bottom: 24,
            left: "50%",
            transform: "translateX(-50%)",
            background: "#0B1F3A",
            color: "#fff",
            padding: "10px 16px",
            borderRadius: 10,
            fontSize: 13,
            zIndex: 60,
          }}
        >
          {toast}
        </div>
      )}
    </div>
  );
}

const inp: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 8,
  border: "1px solid #E2E6ED",
  fontSize: 14,
  fontFamily: "Inter, sans-serif",
  background: "#fff",
  color: "#0B1F3A",
  boxSizing: "border-box",
};

function actionBtn(color: string): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
    background: "#fff",
    color,
    border: `1px solid ${color}`,
    borderRadius: 8,
    padding: "6px 10px",
    fontSize: 12,
    fontWeight: 600,
    cursor: "pointer",
  };
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: "#0B1F3A", marginBottom: 4 }}>{label}</div>
      {children}
    </div>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0", cursor: "pointer" }}>
      <span style={{ fontSize: 13, color: "#0B1F3A" }}>{label}</span>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
    </label>
  );
}

function Sheet({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.4)",
        zIndex: 50,
        display: "flex",
        alignItems: "flex-end",
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#fff",
          width: "100%",
          maxHeight: "90vh",
          overflowY: "auto",
          borderTopLeftRadius: 16,
          borderTopRightRadius: 16,
          padding: 16,
          paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 24px)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#0B1F3A" }}>{title}</div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{ background: "#F3F4F6", border: "none", borderRadius: "50%", width: 32, height: 32, display: "inline-flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#0B1F3A" }}
          >
            <X size={16} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}