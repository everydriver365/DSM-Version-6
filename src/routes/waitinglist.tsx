import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Plus, X, Users, Hourglass } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { Card } from "../components/dsm/Card";
import { Input } from "../components/dsm/Input";
import { Button } from "../components/dsm/Button";
import { SectionHeader } from "../components/dsm/SectionHeader";
import { supabase } from "../lib/supabaseClient";

export const Route = createFileRoute("/waitinglist")({
  head: () => ({
    meta: [{ title: "Waiting list — DSM by EveryDriver" }],
  }),
  component: WaitingListPage,
});

const POPPINS = { fontFamily: "Inter, sans-serif" } as const;

interface Entry {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  course_interest: string | null;
  notes: string | null;
  created_at: string;
}

const entrySchema = z.object({
  name: z.string().trim().min(1, "Name required").max(100),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
  email: z.string().trim().email("Invalid email").max(255).optional().or(z.literal("")),
  course_interest: z.string().trim().max(120).optional().or(z.literal("")),
  notes: z.string().trim().max(1000).optional().or(z.literal("")),
});

function daysSince(iso: string) {
  const ms = Date.now() - new Date(iso).getTime();
  return Math.max(0, Math.floor(ms / 86400000));
}

function WaitingListPage() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [addOpen, setAddOpen] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState<Entry | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (data.user) setUserId(data.user.id);
    })();
  }, []);

  async function load(uid: string) {
    const { data, error } = await supabase
      .from("waiting_list")
      .select("id, name, phone, email, course_interest, notes, created_at")
      .eq("instructor_id", uid)
      .is("deleted_at", null)
      .order("created_at", { ascending: true });
    if (error) console.error("[waitinglist] fetch error", error);
    setEntries((data ?? []) as unknown as Entry[]);
  }

  useEffect(() => {
    if (userId) load(userId);
  }, [userId]);

  async function remove(id: string) {
    const { error } = await supabase
      .from("waiting_list")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id);
    if (error) {
      console.error("[waitinglist] remove error", error);
      toast.error("Couldn't remove");
      return;
    }
    toast.success("Removed from waiting list");
    if (userId) load(userId);
  }

  function bookIn(e: Entry) {
    navigate({
      to: "/pupils/new",
      search: { name: e.name, phone: e.phone ?? "" },
    });
  }

  return (
    <div className="min-h-screen bg-white pb-8" style={POPPINS}>
      {/* Top bar */}
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
        <div className="flex-1 text-center text-[15px] font-semibold text-white" style={POPPINS}>
          Waiting list
        </div>
        <button
          type="button"
          aria-label="Add entry"
          onClick={() => setAddOpen(true)}
          className="flex items-center justify-center"
          style={{ width: 40, height: 40 }}
        >
          <Plus size={22} color="#FFFFFF" />
        </button>
      </div>

      <div className="px-4">
        <SectionHeader>WAITING</SectionHeader>
        {entries.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center text-[13px]"
            style={{ color: "#6B7280", padding: "40px 0" }}
          >
            <Users size={28} color="#6B7280" />
            <div className="mt-2">No one on the waiting list</div>
          </div>
        ) : (
          <div className="flex flex-col" style={{ gap: 8 }}>
            {entries.map((e, idx) => {
              const days = daysSince(e.created_at);
              return (
                <Card key={e.id}>
                  <div className="flex items-start" style={{ gap: 12 }}>
                    <div
                      className="flex items-center justify-center shrink-0 font-bold"
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 18,
                        backgroundColor: "#00A3B414",
                        color: "#00A3B4",
                        fontSize: 18,
                        ...POPPINS,
                      }}
                    >
                      {idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between" style={{ gap: 8 }}>
                        <div className="min-w-0">
                          <div
                            className="text-[14px] font-semibold truncate"
                            style={{ color: "#0A2540", ...POPPINS }}
                          >
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
                        <span
                          className="shrink-0 text-[11px] font-semibold px-2 py-[3px]"
                          style={{
                            color: "#F59E0B",
                            backgroundColor: "#FEF3C7",
                            borderRadius: 6,
                          }}
                        >
                          {days} {days === 1 ? "day" : "days"}
                        </span>
                      </div>
                      <div className="mt-3 grid grid-cols-2" style={{ gap: 8 }}>
                        <Button variant="ghost" type="button" onClick={() => bookIn(e)}>
                          Book in
                        </Button>
                        <button
                          type="button"
                          onClick={() => setConfirmRemove(e)}
                          className="w-full text-[13px] font-semibold py-2"
                          style={{
                            color: "#CC2229",
                            border: "0.5px solid #EEF2F7",
                            borderRadius: 8,
                            backgroundColor: "white",
                            ...POPPINS,
                          }}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {addOpen && userId && (
        <AddEntrySheet
          userId={userId}
          onClose={() => setAddOpen(false)}
          onAdded={() => {
            setAddOpen(false);
            load(userId);
          }}
        />
      )}

      {confirmRemove && (
        <ConfirmSheet
          name={confirmRemove.name}
          onClose={() => setConfirmRemove(null)}
          onConfirm={() => {
            const id = confirmRemove.id;
            setConfirmRemove(null);
            remove(id);
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

function AddEntrySheet({
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
    const parsed = entrySchema.safeParse({
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
    const { error } = await supabase.from("waiting_list").insert({
      instructor_id: userId,
      name: v.name,
      phone: v.phone || null,
      email: v.email || null,
      course_interest: v.course_interest || null,
      notes: v.notes || null,
    });
    setSaving(false);
    if (error) {
      console.error("[waitinglist] insert error", error);
      toast.error("Couldn't add entry");
      return;
    }
    toast.success("Added to waiting list");
    onAdded();
  }

  return (
    <SheetShell title="ADD TO WAITING LIST" onClose={onClose}>
      <div className="flex flex-col" style={{ gap: 12 }}>
        <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} maxLength={100} />
        <Input label="Phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={30} />
        <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={255} />
        <Input
          label="Course interest"
          value={course}
          onChange={(e) => setCourse(e.target.value)}
          placeholder="e.g. Manual - weekly"
          maxLength={120}
        />
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
              border: "0.5px solid #EEF2F7",
              color: "#1A1A2E",
              fontSize: 14,
              resize: "none",
              ...POPPINS,
            }}
          />
        </div>
        <div className="mt-2 grid grid-cols-2" style={{ gap: 8 }}>
          <Button variant="ghost" onClick={onClose} type="button">
            Cancel
          </Button>
          <Button onClick={save} disabled={saving} type="button">
            {saving ? "Saving…" : "Save"}
          </Button>
        </div>
      </div>
    </SheetShell>
  );
}

function ConfirmSheet({
  name,
  onClose,
  onConfirm,
}: {
  name: string;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <SheetShell title="REMOVE FROM WAITING LIST" onClose={onClose}>
      <div className="flex flex-col" style={{ gap: 16 }}>
        <div className="flex items-center justify-center" style={{ paddingTop: 8 }}>
          <Hourglass size={28} color="#CC2229" />
        </div>
        <div className="text-[14px] text-center" style={{ color: "#0A2540" }}>
          Remove <span className="font-semibold">{name}</span> from the waiting list?
        </div>
        <div className="grid grid-cols-2" style={{ gap: 8 }}>
          <Button variant="ghost" onClick={onClose} type="button">
            Cancel
          </Button>
          <button
            type="button"
            onClick={onConfirm}
            className="w-full text-[14px] font-semibold py-2"
            style={{
              color: "white",
              backgroundColor: "#CC2229",
              borderRadius: 8,
              ...POPPINS,
            }}
          >
            Remove
          </button>
        </div>
      </div>
    </SheetShell>
  );
}
