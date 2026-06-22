import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Plus, X, Inbox, Phone, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { Card } from "../components/dsm/Card";
import { Input } from "../components/dsm/Input";
import { Button } from "../components/dsm/Button";
import { supabase } from "../lib/supabaseClient";

export const Route = createFileRoute("/enquiries")({
  head: () => ({
    meta: [{ title: "Enquiries — DSM by EveryDriver" }],
  }),
  component: EnquiriesPage,
});

const POPPINS = { fontFamily: "Poppins, sans-serif" } as const;

type Status = "new" | "contacted" | "booked" | "lost";

interface Enquiry {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  course_interest: string | null;
  notes: string | null;
  status: Status;
  created_at: string;
}

const TABS: { key: Status; label: string }[] = [
  { key: "new", label: "New" },
  { key: "contacted", label: "Contacted" },
  { key: "booked", label: "Booked" },
  { key: "lost", label: "Lost" },
];

function statusColor(s: Status) {
  if (s === "new") return "#F59E0B";
  if (s === "contacted") return "#1A52A0";
  if (s === "booked") return "#16A34A";
  return "#CC2229";
}

function formatShortDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

const enquirySchema = z.object({
  name: z.string().trim().min(1, "Name required").max(100),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
  email: z.string().trim().email("Invalid email").max(255).optional().or(z.literal("")),
  course_interest: z.string().trim().max(120).optional().or(z.literal("")),
  notes: z.string().trim().max(1000).optional().or(z.literal("")),
});

function EnquiriesPage() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [tab, setTab] = useState<Status>("new");
  const [addOpen, setAddOpen] = useState(false);
  const [active, setActive] = useState<Enquiry | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (data.user) setUserId(data.user.id);
    })();
  }, []);

  async function load(uid: string) {
    const { data, error } = await supabase
      .from("enquiries")
      .select("id, name, phone, email, course_interest, notes, status, created_at")
      .eq("instructor_id", uid)
      .order("created_at", { ascending: false });
    if (error) console.error("[enquiries] fetch error", error);
    setEnquiries((data ?? []) as Enquiry[]);
  }

  useEffect(() => {
    if (userId) load(userId);
  }, [userId]);

  const filtered = enquiries.filter((e) => e.status === tab);

  return (
    <div className="min-h-screen bg-white pb-8" style={POPPINS}>
      <div
        className="sticky top-0 z-40 flex items-center justify-between px-2"
        style={{ height: 52, backgroundColor: "#072b47" }}
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
        <div className="flex-1 text-center text-[15px] font-semibold text-white">Enquiries</div>
        <button
          type="button"
          aria-label="Add enquiry"
          onClick={() => setAddOpen(true)}
          className="flex items-center justify-center"
          style={{ width: 40, height: 40 }}
        >
          <Plus size={22} color="#FFFFFF" />
        </button>
      </div>

      {/* Segmented control */}
      <div
        className="mx-4 mt-3 flex"
        style={{
          backgroundColor: "#F3F4F6",
          borderRadius: 10,
          padding: 4,
          gap: 4,
        }}
      >
        {TABS.map((t) => {
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className="flex-1 inline-flex items-center justify-center text-[12px] font-medium"
              style={{
                height: 32,
                borderRadius: 8,
                backgroundColor: active ? "#FFFFFF" : "transparent",
                color: active ? "#0F2044" : "#6B7280",
                boxShadow: active ? "0 1px 2px rgba(15,32,68,0.08)" : "none",
                ...POPPINS,
              }}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      <div className="px-4 mt-3">
        {filtered.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center text-[13px]"
            style={{ color: "#6B7280", padding: "32px 0" }}
          >
            <Inbox size={24} color="#6B7280" />
            <div className="mt-2">No {TABS.find((t) => t.key === tab)?.label.toLowerCase()} enquiries</div>
          </div>
        ) : (
          <div className="flex flex-col" style={{ gap: 8 }}>
            {filtered.map((e) => (
              <button
                key={e.id}
                type="button"
                onClick={() => setActive(e)}
                className="text-left"
              >
                <Card>
                  <div className="flex items-start justify-between" style={{ gap: 8 }}>
                    <div className="min-w-0 flex-1">
                      <div className="text-[14px] font-semibold truncate" style={{ color: "#0F2044" }}>
                        {e.name}
                      </div>
                      {e.phone && (
                        <div className="text-[13px]" style={{ color: "#6B7280" }}>
                          {e.phone}
                        </div>
                      )}
                      {e.course_interest && (
                        <div className="text-[12px]" style={{ color: "#6B7280" }}>
                          {e.course_interest}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col items-end" style={{ gap: 4 }}>
                      <span className="text-[11px]" style={{ color: "#6B7280" }}>
                        {formatShortDate(e.created_at)}
                      </span>
                      <span
                        className="text-[11px] font-semibold text-white capitalize"
                        style={{
                          backgroundColor: statusColor(e.status),
                          padding: "2px 8px",
                          borderRadius: 999,
                        }}
                      >
                        {e.status}
                      </span>
                    </div>
                  </div>
                </Card>
              </button>
            ))}
          </div>
        )}
      </div>

      {addOpen && userId && (
        <AddEnquirySheet
          userId={userId}
          onClose={() => setAddOpen(false)}
          onAdded={() => {
            setAddOpen(false);
            load(userId);
          }}
        />
      )}

      {active && (
        <DetailSheet
          enquiry={active}
          onClose={() => setActive(null)}
          onSaved={() => {
            setActive(null);
            if (userId) load(userId);
          }}
        />
      )}
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
    <div className="fixed inset-0 z-50 flex items-end justify-center" style={POPPINS}>
      <div
        className="absolute inset-0"
        style={{ backgroundColor: "rgba(15,32,68,0.5)" }}
        onClick={onClose}
        aria-hidden
      />
      <div
        className="relative w-full bg-white"
        style={{
          borderTopLeftRadius: 16,
          borderTopRightRadius: 16,
          maxHeight: "92vh",
          overflowY: "auto",
          paddingBottom: 24,
        }}
      >
        <div className="flex items-center justify-between px-4 pt-4">
          <span className="text-[11px] font-semibold tracking-wider" style={{ color: "#6B7280" }}>
            {title}
          </span>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="flex items-center justify-center"
            style={{ width: 32, height: 32 }}
          >
            <X size={18} color="#6B7280" />
          </button>
        </div>
        <div className="px-4 pt-2">{children}</div>
      </div>
    </div>
  );
}

function AddEnquirySheet({
  userId,
  onClose,
  onAdded,
}: {
  userId: string;
  onClose: () => void;
  onAdded: () => void;
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [course, setCourse] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  async function save() {
    if (saving) return;
    const parsed = enquirySchema.safeParse({
      name,
      phone,
      email,
      course_interest: course,
      notes,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Invalid input");
      return;
    }
    setSaving(true);
    const v = parsed.data;
    const { error } = await supabase.from("enquiries").insert({
      instructor_id: userId,
      name: v.name,
      phone: v.phone || null,
      email: v.email || null,
      course_interest: v.course_interest || null,
      notes: v.notes || null,
    });
    setSaving(false);
    if (error) {
      console.error("[enquiries] insert error", error);
      toast.error("Couldn't add enquiry");
      return;
    }
    toast.success("Enquiry added");
    onAdded();
  }

  return (
    <SheetShell title="ADD ENQUIRY" onClose={onClose}>
      <div className="flex flex-col" style={{ gap: 12 }}>
        <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} maxLength={100} />
        <Input label="Phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={30} />
        <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={255} />
        <Input label="Course interest" value={course} onChange={(e) => setCourse(e.target.value)} placeholder="e.g. Intensive - Winchester" maxLength={120} />
        <div>
          <label className="block mb-1 text-[12px] font-medium text-[#6B7280]">Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            maxLength={1000}
            className="w-full px-3 py-2 bg-white"
            style={{
              borderRadius: 8,
              border: "0.5px solid #E2E6ED",
              color: "#1A1A2E",
              fontSize: 14,
              resize: "none",
              ...POPPINS,
            }}
          />
        </div>
        <div className="mt-2 grid grid-cols-2" style={{ gap: 8 }}>
          <Button variant="ghost" onClick={onClose} type="button">Cancel</Button>
          <Button onClick={save} disabled={saving} type="button">
            {saving ? "Saving…" : "Save"}
          </Button>
        </div>
      </div>
    </SheetShell>
  );
}

function DetailSheet({
  enquiry,
  onClose,
  onSaved,
}: {
  enquiry: Enquiry;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [notes, setNotes] = useState(enquiry.notes ?? "");
  const [status, setStatus] = useState<Status>(enquiry.status);
  const [saving, setSaving] = useState(false);

  async function save() {
    if (saving) return;
    setSaving(true);
    const { error } = await supabase
      .from("enquiries")
      .update({ notes: notes.trim() || null, status })
      .eq("id", enquiry.id);
    setSaving(false);
    if (error) {
      console.error("[enquiries] update error", error);
      toast.error("Couldn't save");
      return;
    }
    toast.success("Saved");
    onSaved();
  }

  return (
    <SheetShell title="ENQUIRY" onClose={onClose}>
      <div className="flex flex-col" style={{ gap: 12 }}>
        <div className="rounded-[12px] p-3" style={{ backgroundColor: "#F3F4F6" }}>
          <div className="text-[14px] font-semibold" style={{ color: "#0F2044" }}>
            {enquiry.name}
          </div>
          {enquiry.phone && (
            <div className="text-[12px]" style={{ color: "#6B7280" }}>{enquiry.phone}</div>
          )}
          {enquiry.email && (
            <div className="text-[12px]" style={{ color: "#6B7280" }}>{enquiry.email}</div>
          )}
          {enquiry.course_interest && (
            <div className="text-[12px] mt-1" style={{ color: "#6B7280" }}>{enquiry.course_interest}</div>
          )}
        </div>

        <div className="grid grid-cols-2" style={{ gap: 8 }}>
          <a
            href={enquiry.phone ? `tel:${enquiry.phone}` : undefined}
            aria-label="Call"
            className="inline-flex items-center justify-center gap-1 text-[13px] font-medium text-white"
            style={{
              height: 40,
              borderRadius: 8,
              backgroundColor: enquiry.phone ? "#CC2229" : "#9CA3AF",
              pointerEvents: enquiry.phone ? "auto" : "none",
              ...POPPINS,
            }}
          >
            <Phone size={14} color="#FFFFFF" /> Call
          </a>
          <a
            href={enquiry.phone ? `sms:${enquiry.phone}` : undefined}
            aria-label="Text"
            className="inline-flex items-center justify-center gap-1 text-[13px] font-medium"
            style={{
              height: 40,
              borderRadius: 8,
              backgroundColor: "#F3F4F6",
              color: "#0F2044",
              pointerEvents: enquiry.phone ? "auto" : "none",
              opacity: enquiry.phone ? 1 : 0.6,
              ...POPPINS,
            }}
          >
            <MessageSquare size={14} color="#0F2044" /> Text
          </a>
        </div>

        <div>
          <label className="block mb-1 text-[12px] font-medium text-[#6B7280]">Status</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as Status)}
            className="w-full px-3 bg-white capitalize"
            style={{
              height: 44,
              borderRadius: 8,
              border: "0.5px solid #E2E6ED",
              color: "#1A1A2E",
              fontSize: 14,
              ...POPPINS,
            }}
          >
            {TABS.map((t) => (
              <option key={t.key} value={t.key}>{t.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block mb-1 text-[12px] font-medium text-[#6B7280]">Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
            maxLength={1000}
            className="w-full px-3 py-2 bg-white"
            style={{
              borderRadius: 8,
              border: "0.5px solid #E2E6ED",
              color: "#1A1A2E",
              fontSize: 14,
              resize: "none",
              ...POPPINS,
            }}
          />
        </div>

        <div className="mt-2 grid grid-cols-2" style={{ gap: 8 }}>
          <Button variant="ghost" onClick={onClose} type="button">Close</Button>
          <Button onClick={save} disabled={saving} type="button">
            {saving ? "Saving…" : "Save"}
          </Button>
        </div>
      </div>
    </SheetShell>
  );
}
