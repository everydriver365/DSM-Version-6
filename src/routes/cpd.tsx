import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  Plus,
  Mic,
  MicOff,
  Upload,
  Download,
  X,
  Trash2,
  Pencil,
  Paperclip,
  GraduationCap,
} from "lucide-react";
import { toast } from "sonner";
import { BottomSheet } from "../components/dsm/BottomSheet";
import { supabase } from "../lib/supabaseClient";

// -- SQL to run manually in Supabase (commented for reference) --
// create table if not exists public.cpd_logs (
//   id uuid primary key default gen_random_uuid(),
//   instructor_id uuid references public.instructors(id) on delete cascade not null,
//   title text not null,
//   provider text,
//   category text,
//   hours numeric(4,1) not null,
//   date date not null,
//   notes text,
//   certificate_url text,
//   created_at timestamptz default now(),
//   deleted_at timestamptz
// );
// alter table public.cpd_logs enable row level security;
// create policy "Instructors can manage own CPD" on public.cpd_logs for all to authenticated using (instructor_id = auth.uid()) with check (instructor_id = auth.uid());
// grant all on public.cpd_logs to authenticated;

export const Route = createFileRoute("/cpd")({
  head: () => ({
    meta: [
      { title: "CPD log — DSM by EveryDriver" },
      { name: "description", content: "Log continuing professional development activities." },
    ],
  }),
  component: CpdPage,
});

const POPPINS = { fontFamily: "Inter, sans-serif" } as const;

const CATEGORIES = [
  "Standards check",
  "Business skills",
  "Pupil welfare",
  "Road safety",
  "Specialist",
  "Other",
] as const;

const CAT_COLORS: Record<string, string> = {
  "Standards check": "#1877D6",
  "Business skills": "#1877D6",
  "Pupil welfare": "#1877D6",
  "Road safety": "#1877D6",
  Specialist: "#0B1F3A",
  Other: "#6B7280",
};

type CpdLog = {
  id: string;
  instructor_id: string;
  title: string;
  provider: string | null;
  category: string | null;
  hours: number;
  date: string;
  notes: string | null;
  certificate_url: string | null;
  created_at: string;
  deleted_at: string | null;
};

function fmtDate(d: string) {
  try {
    return new Date(d).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return d;
  }
}

function CpdPage() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [logs, setLogs] = useState<CpdLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("All");
  const [adiRenewal, setAdiRenewal] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<CpdLog | null>(null);
  const [openActionsId, setOpenActionsId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      const uid = data.user?.id ?? null;
      setUserId(uid);
      if (uid) {
        try {
          const { data: prof } = await supabase
            .from("instructors")
            .select("adi_renewal_date")
            .eq("id", uid)
            .maybeSingle();
          if (prof && (prof as any).adi_renewal_date) {
            setAdiRenewal((prof as any).adi_renewal_date);
          }
        } catch {
          // instructors table / column optional
        }
      }
    })();
  }, []);

  async function fetchLogs() {
    if (!userId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("cpd_logs")
      .select("*")
      .eq("instructor_id", userId)
      .is("deleted_at", null)
      .order("date", { ascending: false });
    if (error) {
      console.error("[cpd] fetch error", error);
      toast.error(error.message);
    }
    setLogs((data ?? []) as CpdLog[]);
    setLoading(false);
  }

  useEffect(() => {
    if (userId) fetchLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const now = new Date();
  const yearHours = useMemo(
    () =>
      logs
        .filter((l) => new Date(l.date).getFullYear() === now.getFullYear())
        .reduce((s, l) => s + Number(l.hours ?? 0), 0),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [logs],
  );
  const totalEntries = logs.length;
  const lastEntry = logs[0]?.date ?? null;

  const filtered = useMemo(
    () => (filter === "All" ? logs : logs.filter((l) => (l.category ?? "Other") === filter)),
    [logs, filter],
  );
  const grouped = useMemo(() => {
    const m = new Map<number, CpdLog[]>();
    for (const l of filtered) {
      const y = new Date(l.date).getFullYear();
      if (!m.has(y)) m.set(y, []);
      m.get(y)!.push(l);
    }
    return Array.from(m.entries()).sort((a, b) => b[0] - a[0]);
  }, [filtered]);

  const renewalDaysLeft = useMemo(() => {
    if (!adiRenewal) return null;
    const d = new Date(adiRenewal);
    return Math.floor((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adiRenewal]);

  function exportCsv() {
    const header = ["Date", "Title", "Provider", "Category", "Hours", "Notes", "Certificate"];
    const rows = logs.map((l) => [
      l.date,
      l.title,
      l.provider ?? "",
      l.category ?? "",
      String(l.hours ?? ""),
      (l.notes ?? "").replace(/\n/g, " "),
      l.certificate_url ?? "",
    ]);
    const csv = [header, ...rows]
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cpd-log-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  async function softDelete(id: string) {
    if (!confirm("Delete this CPD entry?")) return;
    const { error } = await supabase
      .from("cpd_logs")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Deleted");
    setOpenActionsId(null);
    fetchLogs();
  }

  return (
    <div className="min-h-screen bg-white pb-24" style={POPPINS}>
      {/* TOP BAR */}
      <div
        className="sticky top-0 z-40 h-[52px] px-4 flex items-center justify-between"
        style={{ backgroundColor: "#0B1F3A" }}
      >
        <button
          type="button"
          aria-label="Back"
          onClick={() => navigate({ to: "/home" })}
          className="flex items-center justify-center"
          style={{ width: 40, height: 40 }}
        >
          <ArrowLeft size={22} color="#ffffff" />
        </button>
        <div className="text-white text-[15px] font-semibold">CPD log</div>
        <button
          type="button"
          onClick={() => {
            setEditing(null);
            setShowAdd(true);
          }}
          className="flex items-center gap-1 text-white text-[13px] font-medium"
          style={{
            height: 32,
            padding: "0 10px",
            borderRadius: 8,
            backgroundColor: "rgba(255,255,255,0.15)",
          }}
        >
          <Plus size={16} /> Add CPD
        </button>
      </div>

      {/* STATS */}
      <div className="px-4 pt-4 grid grid-cols-3 gap-2">
        <StatCard label="This year" value={`${yearHours.toFixed(1)}h`} color="#1877D6" />
        <StatCard label="Entries" value={String(totalEntries)} color="#1877D6" />
        <StatCard label="Last entry" value={lastEntry ? fmtDate(lastEntry) : "—"} color="#0B1F3A" small />
      </div>

      {/* ADI RENEWAL BANNER */}
      {renewalDaysLeft !== null && (
        <div className="px-4 mt-3">
          <div
            style={{
              borderRadius: 12,
              padding: 14,
              backgroundColor:
                renewalDaysLeft > 90
                  ? "#F3F8FF"
                  : renewalDaysLeft >= 30
                    ? "#FFFBEB"
                    : "#FEF2F2",
              border: `0.5px solid ${
                renewalDaysLeft > 90 ? "#1877D6" : renewalDaysLeft >= 30 ? "#0B1F3A" : "#1877D6"
              }`,
            }}
          >
            <div className="flex items-center gap-2">
              <GraduationCap
                size={18}
                color={
                  renewalDaysLeft > 90 ? "#1877D6" : renewalDaysLeft >= 30 ? "#0B1F3A" : "#1877D6"
                }
              />
              <div
                className="text-[14px] font-semibold"
                style={{
                  color:
                    renewalDaysLeft > 90
                      ? "#166534"
                      : renewalDaysLeft >= 30
                        ? "#0B1F3A"
                        : "#991B1B",
                }}
              >
                {renewalDaysLeft} days until ADI renewal
              </div>
            </div>
            <div className="text-[11px] text-[#6B7280] mt-1">
              DVSA requires 3 CPD activities per licence period.
            </div>
          </div>
        </div>
      )}

      {/* CATEGORY FILTER */}
      <div className="mt-4 overflow-x-auto no-scrollbar">
        <div className="flex gap-2 px-4 pb-1" style={{ minWidth: "max-content" }}>
          {["All", ...CATEGORIES].map((c) => {
            const active = filter === c;
            return (
              <button
                key={c}
                type="button"
                onClick={() => setFilter(c)}
                className="text-[12px] font-medium whitespace-nowrap"
                style={{
                  height: 32,
                  padding: "0 12px",
                  borderRadius: 16,
                  backgroundColor: active ? "#0B1F3A" : "#F3F4F6",
                  color: active ? "#FFFFFF" : "#6B7280",
                }}
              >
                {c}
              </button>
            );
          })}
        </div>
      </div>

      {/* LIST */}
      <div className="px-4 mt-3">
        {loading ? (
          <div className="text-center text-[13px] text-[#6B7280] py-8">Loading…</div>
        ) : grouped.length === 0 ? (
          <div className="text-center py-10">
            <div className="text-[14px] font-semibold text-[#0B1F3A]">No CPD entries yet</div>
            <div className="text-[12px] text-[#6B7280] mt-1">
              Tap "Add CPD" to record your first activity.
            </div>
          </div>
        ) : (
          grouped.map(([year, entries]) => (
            <div key={year} className="mb-4">
              <div className="text-[15px] font-bold text-[#0B1F3A] mb-2">{year}</div>
              {entries.map((l) => (
                <EntryCard
                  key={l.id}
                  log={l}
                  open={openActionsId === l.id}
                  onToggle={() => setOpenActionsId(openActionsId === l.id ? null : l.id)}
                  onEdit={() => {
                    setEditing(l);
                    setShowAdd(true);
                    setOpenActionsId(null);
                  }}
                  onDelete={() => softDelete(l.id)}
                />
              ))}
            </div>
          ))
        )}
      </div>

      {/* EXPORT */}
      {logs.length > 0 && (
        <div className="px-4 pt-2 pb-6">
          <button
            type="button"
            onClick={exportCsv}
            className="w-full flex items-center justify-center gap-2 text-white text-[14px] font-semibold"
            style={{ backgroundColor: "#1877D6", height: 44, borderRadius: 10 }}
          >
            <Download size={16} /> Export CPD log
          </button>
          <div className="text-center text-[11px] text-[#6B7280] mt-2">
            Useful for DVSA submission.
          </div>
        </div>
      )}

      <BottomSheet
        open={showAdd}
        onOpenChange={(v) => {
          setShowAdd(v);
          if (!v) setEditing(null);
        }}
        title={editing ? "Edit CPD" : "Add CPD"}
      >
        {showAdd && (
          <AddSheet
            userId={userId!}
            editing={editing}
            onClose={() => {
              setShowAdd(false);
              setEditing(null);
            }}
            onSaved={() => {
              setShowAdd(false);
              setEditing(null);
              fetchLogs();
            }}
          />
        )}
      </BottomSheet>
    </div>
  );
}

function StatCard({
  label,
  value,
  color,
  small,
}: {
  label: string;
  value: string;
  color: string;
  small?: boolean;
}) {
  return (
    <div
      style={{
        backgroundColor: "#FFFFFF",
        border: "0.5px solid #EEF2F7",
        borderRadius: 12,
        padding: 12,
      }}
    >
      <div className="text-[10px] uppercase tracking-wider text-[#6B7280]">{label}</div>
      <div
        className="font-bold mt-1"
        style={{ color, fontSize: small ? 13 : 20, lineHeight: 1.2 }}
      >
        {value}
      </div>
    </div>
  );
}

function EntryCard({
  log,
  open,
  onToggle,
  onEdit,
  onDelete,
}: {
  log: CpdLog;
  open: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const cat = log.category ?? "Other";
  const color = CAT_COLORS[cat] ?? "#6B7280";
  return (
    <div
      className="mb-2"
      style={{
        backgroundColor: "#FFFFFF",
        border: "0.5px solid #EEF2F7",
        borderRadius: 12,
        padding: "14px 16px",
      }}
    >
      <button
        type="button"
        onClick={onToggle}
        className="w-full text-left"
        style={{ background: "transparent" }}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="text-[14px] font-semibold text-[#0B1F3A] truncate">{log.title}</div>
            {log.provider && (
              <div className="text-[12px] text-[#6B7280] truncate">{log.provider}</div>
            )}
            <div className="flex items-center gap-1.5 mt-2 flex-wrap">
              <span
                className="text-[10px] font-semibold uppercase tracking-wider"
                style={{
                  color,
                  backgroundColor: `${color}1A`,
                  padding: "3px 8px",
                  borderRadius: 6,
                }}
              >
                {cat}
              </span>
              <span
                className="text-[10px] font-semibold"
                style={{
                  color: "#0B1F3A",
                  backgroundColor: "#F3F4F6",
                  padding: "3px 8px",
                  borderRadius: 6,
                }}
              >
                {Number(log.hours).toFixed(1)}h
              </span>
            </div>
          </div>
          <div className="text-[11px] text-[#6B7280] whitespace-nowrap">{fmtDate(log.date)}</div>
        </div>
        {log.notes && (
          <div className="text-[12px] text-[#374151] mt-2 whitespace-pre-wrap">{log.notes}</div>
        )}
        {log.certificate_url && (
          <a
            href={log.certificate_url}
            target="_blank"
            rel="noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-1 mt-2 text-[12px] font-medium"
            style={{ color: "#1877D6" }}
          >
            <Paperclip size={12} /> Certificate
          </a>
        )}
      </button>

      {open && (
        <div className="flex gap-2 mt-3 pt-3" style={{ borderTop: "0.5px solid #EEF2F7" }}>
          <button
            type="button"
            onClick={onEdit}
            className="flex-1 flex items-center justify-center gap-1 text-[12px] font-medium"
            style={{
              height: 34,
              borderRadius: 8,
              backgroundColor: "#F3F4F6",
              color: "#0B1F3A",
            }}
          >
            <Pencil size={13} /> Edit
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="flex-1 flex items-center justify-center gap-1 text-[12px] font-medium"
            style={{
              height: 34,
              borderRadius: 8,
              backgroundColor: "#FEF2F2",
              color: "#1877D6",
            }}
          >
            <Trash2 size={13} /> Delete
          </button>
        </div>
      )}
    </div>
  );
}

function AddSheet({
  userId,
  editing,
  onClose,
  onSaved,
}: {
  userId: string;
  editing: CpdLog | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState(editing?.title ?? "");
  const [provider, setProvider] = useState(editing?.provider ?? "");
  const [category, setCategory] = useState<string>(editing?.category ?? CATEGORIES[0]);
  const [hours, setHours] = useState<string>(editing ? String(editing.hours) : "1");
  const [date, setDate] = useState<string>(editing?.date ?? new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState(editing?.notes ?? "");
  const [certificateUrl, setCertificateUrl] = useState<string | null>(editing?.certificate_url ?? null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  // speech-to-text
  const [listening, setListening] = useState(false);
  const recRef = useRef<any>(null);

  function toggleMic() {
    // Web Speech API (browser-native, no backend needed)
    const SR: any =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      toast.error("Voice input isn't supported on this browser.");
      return;
    }
    if (listening) {
      recRef.current?.stop?.();
      setListening(false);
      return;
    }
    const rec = new SR();
    rec.continuous = true;
    rec.interimResults = false;
    rec.lang = "en-GB";
    rec.onresult = (e: any) => {
      let txt = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) txt += e.results[i][0].transcript;
      }
      if (txt) setNotes((n) => (n ? `${n} ${txt}` : txt).trim());
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    recRef.current = rec;
    rec.start();
    setListening(true);
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const path = `${userId}/${Date.now()}-${file.name.replace(/[^a-z0-9.\-_]/gi, "_")}`;
      const { error } = await supabase.storage.from("cpd-certificates").upload(path, file, {
        cacheControl: "3600",
        upsert: false,
      });
      if (error) throw error;
      const { data } = supabase.storage.from("cpd-certificates").getPublicUrl(path);
      setCertificateUrl(data.publicUrl);
      toast.success("Certificate uploaded");
    } catch (err: any) {
      console.error("[cpd] upload error", err);
      toast.error(err?.message ?? "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function submit() {
    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }
    const h = Number(hours);
    if (!isFinite(h) || h <= 0) {
      toast.error("Hours must be greater than 0");
      return;
    }
    setSaving(true);
    const payload = {
      instructor_id: userId,
      title: title.trim(),
      provider: provider.trim() || null,
      category,
      hours: h,
      date,
      notes: notes.trim() || null,
      certificate_url: certificateUrl,
    };
    try {
      if (editing) {
        const { error } = await supabase.from("cpd_logs").update(payload).eq("id", editing.id);
        if (error) throw error;
        toast.success("CPD entry updated");
      } else {
        const { error } = await supabase.from("cpd_logs").insert(payload);
        if (error) throw error;
        toast.success("CPD entry added");
      }
      onSaved();
    } catch (err: any) {
      console.error("[cpd] save error", err);
      toast.error(err?.message ?? "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-3">
          <Field label="Title *">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Standards Check preparation course"
              style={inputStyle}
            />
          </Field>

          <Field label="Provider">
            <input
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
              placeholder="e.g. DIA"
              style={inputStyle}
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Category">
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                style={inputStyle}
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Hours">
              <input
                type="number"
                step="0.5"
                min="0"
                value={hours}
                onChange={(e) => setHours(e.target.value)}
                style={inputStyle}
              />
            </Field>
          </div>

          <Field label="Date">
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              style={inputStyle}
            />
          </Field>

          <Field label="Notes">
            <div style={{ position: "relative" }}>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
                placeholder="What did you learn?"
                style={{ ...inputStyle, paddingRight: 44, resize: "vertical" as const }}
              />
              <button
                type="button"
                onClick={toggleMic}
                aria-label={listening ? "Stop dictation" : "Start dictation"}
                style={{
                  position: "absolute",
                  right: 8,
                  top: 8,
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  backgroundColor: listening ? "#1877D6" : "#F3F4F6",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {listening ? (
                  <MicOff size={16} color="#FFFFFF" />
                ) : (
                  <Mic size={16} color="#0B1F3A" />
                )}
              </button>
            </div>
          </Field>

          <Field label="Certificate (optional)">
            {certificateUrl ? (
              <div className="flex items-center justify-between gap-2">
                <a
                  href={certificateUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[12px] font-medium truncate"
                  style={{ color: "#1877D6" }}
                >
                  View uploaded certificate
                </a>
                <button
                  type="button"
                  onClick={() => setCertificateUrl(null)}
                  className="text-[12px]"
                  style={{ color: "#1877D6" }}
                >
                  Remove
                </button>
              </div>
            ) : (
              <label
                className="flex items-center justify-center gap-2 text-[13px] font-medium cursor-pointer"
                style={{
                  height: 40,
                  borderRadius: 8,
                  border: "0.5px dashed #EEF2F7",
                  color: "#0B1F3A",
                }}
              >
                <Upload size={14} /> {uploading ? "Uploading…" : "Upload certificate"}
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={handleFile}
                  className="hidden"
                />
              </label>
            )}
          </Field>

          <button
            type="button"
            disabled={saving}
            onClick={submit}
            className="w-full text-white text-[14px] font-semibold mt-2"
            style={{
              backgroundColor: "#1877D6",
              height: 46,
              borderRadius: 10,
              opacity: saving ? 0.6 : 1,
            }}
          >
          {saving ? "Saving…" : editing ? "Save changes" : "Add CPD entry"}
          </button>
          <div style={{ height: 80 }} />
        </div>
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  height: 40,
  padding: "0 12px",
  borderRadius: 8,
  border: "0.5px solid #EEF2F7",
  backgroundColor: "#FFFFFF",
  color: "#0B1F3A",
  fontSize: 14,
  fontFamily: "Inter, sans-serif",
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[11px] font-semibold uppercase tracking-wider text-[#6B7280] mb-1.5">
        {label}
      </div>
      {children}
    </div>
  );
}
