import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "../components/dsm/Button";
import { Input } from "../components/dsm/Input";
import { supabase } from "../lib/supabaseClient";

export const Route = createFileRoute("/pipeline")({
  head: () => ({
    meta: [{ title: "Pipeline — DSM by EveryDriver" }],
  }),
  component: PipelinePage,
});

const POPPINS = { fontFamily: "Inter, sans-serif" } as const;

type Stage = "new" | "contacted" | "trial_booked" | "active_pupil" | "lost";

const STAGES: { key: Stage; label: string }[] = [
  { key: "new", label: "New" },
  { key: "contacted", label: "Contacted" },
  { key: "trial_booked", label: "Trial booked" },
  { key: "active_pupil", label: "Active pupil" },
  { key: "lost", label: "Lost" },
];

const SOURCES = [
  { key: "website", label: "Website" },
  { key: "referral", label: "Referral" },
  { key: "social", label: "Social media" },
  { key: "word_of_mouth", label: "Word of mouth" },
  { key: "other", label: "Other" },
];

type Lead = {
  id: string;
  instructor_id: string;
  name: string;
  phone: string | null;
  email: string | null;
  course_interest: string | null;
  source: string | null;
  stage: Stage;
  notes: string | null;
  stage_updated_at: string;
  created_at: string;
};

function daysSince(iso: string) {
  const then = new Date(iso).getTime();
  const now = Date.now();
  return Math.max(0, Math.floor((now - then) / 86400000));
}

function PipelinePage() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [detail, setDetail] = useState<Lead | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (data.user) setUserId(data.user.id);
    })();
  }, []);

  async function load(uid: string) {
    setLoading(true);
    const { data, error } = await supabase
      .from("pipeline_leads")
      .select("*")
      .eq("instructor_id", uid)
      .order("stage_updated_at", { ascending: false });
    setLoading(false);
    if (error) {
      console.error("[pipeline] fetch error", error);
      toast.error("Couldn't load pipeline");
      return;
    }
    setLeads((data ?? []) as Lead[]);
  }

  useEffect(() => {
    if (userId) load(userId);
  }, [userId]);

  return (
    <div className="min-h-screen bg-white" style={POPPINS}>
      <div
        className="sticky top-0 z-40 flex items-center justify-between px-2"
        style={{ height: 52, backgroundColor: "#0B1F3A" }}
      >
        <button
          type="button"
          aria-label="Back"
          onClick={() => navigate({ to: "/home" })}
          className="flex items-center justify-center"
          style={{ width: 40, height: 40 }}
        >
          <ArrowLeft size={22} color="#FFFFFF" />
        </button>
        <div className="flex-1 text-center text-[15px] font-semibold text-white" style={POPPINS}>
          Pipeline
        </div>
        <button
          type="button"
          aria-label="Add lead"
          onClick={() => setAddOpen(true)}
          className="flex items-center justify-center"
          style={{ width: 40, height: 40 }}
        >
          <Plus size={22} color="#FFFFFF" />
        </button>
      </div>

      <div
        className="overflow-x-auto pipeline-scroll"
        style={{ paddingBottom: 24 }}
      >
        <div className="flex" style={{ gap: 12, padding: 12, minWidth: "100%" }}>
          {STAGES.map((s) => {
            const items = leads.filter((l) => l.stage === s.key);
            return (
              <div
                key={s.key}
                style={{ width: 240, flexShrink: 0 }}
              >
                <div
                  className="sticky top-[52px] z-10 flex items-center justify-between"
                  style={{
                    backgroundColor: "#F8F9FB",
                    border: "0.5px solid #EEF2F7",
                    borderRadius: 10,
                    padding: "8px 12px",
                    marginBottom: 8,
                  }}
                >
                  <span className="text-[13px] font-semibold" style={{ color: "#0B1F3A" }}>
                    {s.label}
                  </span>
                  <span
                    className="text-[11px] font-medium"
                    style={{
                      backgroundColor: "#EEF2F7",
                      color: "#0B1F3A",
                      padding: "2px 8px",
                      borderRadius: 999,
                    }}
                  >
                    {items.length}
                  </span>
                </div>
                <div className="flex flex-col" style={{ gap: 8 }}>
                  {loading && items.length === 0 && (
                    <div className="text-[12px]" style={{ color: "#6B7280", padding: 4 }}>
                      Loading…
                    </div>
                  )}
                  {!loading && items.length === 0 && (
                    <div
                      className="text-[12px] text-center"
                      style={{
                        color: "#9CA3AF",
                        padding: "16px 8px",
                        border: "0.5px dashed #EEF2F7",
                        borderRadius: 10,
                      }}
                    >
                      No leads
                    </div>
                  )}
                  {items.map((lead) => (
                    <button
                      key={lead.id}
                      type="button"
                      onClick={() => setDetail(lead)}
                      className="text-left bg-white"
                      style={{
                        border: "0.5px solid #EEF2F7",
                        borderRadius: 10,
                        padding: 12,
                      }}
                    >
                      <div className="text-[14px] font-semibold" style={{ color: "#0B1F3A" }}>
                        {lead.name}
                      </div>
                      {lead.phone && (
                        <div className="text-[13px] mt-0.5" style={{ color: "#6B7280" }}>
                          {lead.phone}
                        </div>
                      )}
                      {lead.course_interest && (
                        <div className="text-[12px] mt-1" style={{ color: "#0B1F3A" }}>
                          {lead.course_interest}
                        </div>
                      )}
                      <div
                        className="inline-block mt-2 text-[10px] font-medium"
                        style={{
                          backgroundColor: "#EEF4FB",
                          color: "#1877D6",
                          padding: "2px 8px",
                          borderRadius: 999,
                        }}
                      >
                        {daysSince(lead.stage_updated_at)}d in stage
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {addOpen && userId && (
        <AddLeadSheet
          userId={userId}
          onClose={() => setAddOpen(false)}
          onSaved={() => {
            setAddOpen(false);
            if (userId) load(userId);
          }}
        />
      )}

      {detail && userId && (
        <LeadDetailSheet
          lead={detail}
          userId={userId}
          onClose={() => setDetail(null)}
          onChanged={() => {
            setDetail(null);
            if (userId) load(userId);
          }}
        />
      )}

      <style>{`
        .pipeline-scroll::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
}

function SheetShell({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      style={{ backgroundColor: "rgba(11,31,58,0.45)" }}
      onClick={onClose}
    >
      <div
        className="bg-white w-full"
        style={{
          maxWidth: 520,
          borderTopLeftRadius: 16,
          borderTopRightRadius: 16,
          maxHeight: "90vh",
          overflowY: "auto",
          fontFamily: "Inter, sans-serif",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="sticky top-0 flex items-center justify-between bg-white"
          style={{
            padding: "14px 16px",
            borderBottom: "0.5px solid #EEF2F7",
          }}
        >
          <div className="text-[15px] font-semibold" style={{ color: "#0B1F3A" }}>
            {title}
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="flex items-center justify-center"
            style={{ width: 36, height: 36 }}
          >
            <X size={20} color="#0B1F3A" />
          </button>
        </div>
        <div style={{ padding: 16 }}>{children}</div>
      </div>
    </div>
  );
}

function AddLeadSheet({
  userId,
  onClose,
  onSaved,
}: {
  userId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [course, setCourse] = useState("");
  const [source, setSource] = useState("other");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("pipeline_leads").insert({
      instructor_id: userId,
      name: name.trim(),
      phone: phone.trim() || null,
      email: email.trim() || null,
      course_interest: course.trim() || null,
      source,
      notes: notes.trim() || null,
      stage: "new",
    });
    setSaving(false);
    if (error) {
      console.error("[pipeline] insert error", error);
      toast.error("Couldn't save lead");
      return;
    }
    toast.success("Lead added");
    onSaved();
  }

  return (
    <SheetShell title="Add lead" onClose={onClose}>
      <div className="flex flex-col" style={{ gap: 12 }}>
        <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} maxLength={100} />
        <Input label="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={30} />
        <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={255} />
        <Input
          label="Course interest"
          value={course}
          onChange={(e) => setCourse(e.target.value)}
          maxLength={120}
          placeholder="e.g. Manual, Intensive 30hr"
        />
        <div>
          <label
            className="block mb-1 text-[12px] font-medium"
            style={{ color: "#6B7280" }}
          >
            Source
          </label>
          <select
            value={source}
            onChange={(e) => setSource(e.target.value)}
            className="h-11 w-full rounded-lg px-3 text-[14px] bg-white"
            style={{
              border: "0.5px solid #EEF2F7",
              color: "#0B1F3A",
              fontFamily: "Inter, sans-serif",
            }}
          >
            {SOURCES.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label
            className="block mb-1 text-[12px] font-medium"
            style={{ color: "#6B7280" }}
          >
            Notes
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            maxLength={1000}
            rows={4}
            className="w-full rounded-lg px-3 py-2 text-[14px] bg-white"
            style={{
              border: "0.5px solid #EEF2F7",
              color: "#0B1F3A",
              fontFamily: "Inter, sans-serif",
              resize: "vertical",
            }}
          />
        </div>
        <Button onClick={save} disabled={saving} type="button">
          {saving ? "Saving…" : "Save lead"}
        </Button>
      </div>
    </SheetShell>
  );
}

function LeadDetailSheet({
  lead,
  userId,
  onClose,
  onChanged,
}: {
  lead: Lead;
  userId: string;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [name, setName] = useState(lead.name);
  const [phone, setPhone] = useState(lead.phone ?? "");
  const [email, setEmail] = useState(lead.email ?? "");
  const [notes, setNotes] = useState(lead.notes ?? "");
  const [stage, setStage] = useState<Stage>(lead.stage);
  const [busy, setBusy] = useState(false);

  async function save() {
    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }
    setBusy(true);
    const stageChanged = stage !== lead.stage;
    const { error } = await supabase
      .from("pipeline_leads")
      .update({
        name: name.trim(),
        phone: phone.trim() || null,
        email: email.trim() || null,
        notes: notes.trim() || null,
        stage,
        ...(stageChanged ? { stage_updated_at: new Date().toISOString() } : {}),
      })
      .eq("id", lead.id)
      .eq("instructor_id", userId);
    setBusy(false);
    if (error) {
      console.error("[pipeline] update error", error);
      toast.error("Couldn't update lead");
      return;
    }
    toast.success("Saved");
    onChanged();
  }

  async function convertToPupil() {
    if (busy) return;
    setBusy(true);
    const trimmed = name.trim();
    const parts = trimmed.split(/\s+/);
    const first = parts[0] ?? trimmed;
    const last = parts.slice(1).join(" ") || "";
    const { error: pErr } = await supabase.from("pupils").insert({
      instructor_id: userId,
      first_name: first,
      last_name: last,
      phone: phone.trim() || null,
      email: email.trim() || null,
      status: "active",
    });
    if (pErr) {
      setBusy(false);
      console.error("[pipeline] convert insert error", pErr);
      toast.error("Couldn't create pupil");
      return;
    }
    const { error: dErr } = await supabase
      .from("pipeline_leads")
      .delete()
      .eq("id", lead.id)
      .eq("instructor_id", userId);
    setBusy(false);
    if (dErr) {
      console.error("[pipeline] convert delete error", dErr);
      toast.error("Pupil created but lead remains");
      return;
    }
    toast.success("Converted to pupil");
    onChanged();
  }

  return (
    <SheetShell title="Lead details" onClose={onClose}>
      <div className="flex flex-col" style={{ gap: 12 }}>
        <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} maxLength={100} />
        <Input label="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={30} />
        <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={255} />
        <div>
          <label
            className="block mb-1 text-[12px] font-medium"
            style={{ color: "#6B7280" }}
          >
            Stage
          </label>
          <select
            value={stage}
            onChange={(e) => setStage(e.target.value as Stage)}
            className="h-11 w-full rounded-lg px-3 text-[14px] bg-white"
            style={{
              border: "0.5px solid #EEF2F7",
              color: "#0B1F3A",
              fontFamily: "Inter, sans-serif",
            }}
          >
            {STAGES.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label
            className="block mb-1 text-[12px] font-medium"
            style={{ color: "#6B7280" }}
          >
            Notes
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            maxLength={1000}
            rows={4}
            className="w-full rounded-lg px-3 py-2 text-[14px] bg-white"
            style={{
              border: "0.5px solid #EEF2F7",
              color: "#0B1F3A",
              fontFamily: "Inter, sans-serif",
              resize: "vertical",
            }}
          />
        </div>
        <Button onClick={save} disabled={busy} type="button">
          {busy ? "Saving…" : "Save changes"}
        </Button>
        <Button onClick={convertToPupil} disabled={busy} type="button" variant="ghost">
          Convert to pupil
        </Button>
      </div>
    </SheetShell>
  );
}
