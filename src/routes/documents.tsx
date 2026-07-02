import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Plus,
  X,
  FolderOpen,
  AlertTriangle,
  BadgeCheck,
  ShieldCheck,
  Car,
  FileCheck,
  Receipt,
  FileText,
  Trash2,
  Upload,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { Card } from "../components/dsm/Card";
import { Input } from "../components/dsm/Input";
import { Button } from "../components/dsm/Button";
import { SectionHeader } from "../components/dsm/SectionHeader";
import { supabase } from "../lib/supabaseClient";

export const Route = createFileRoute("/documents")({
  head: () => ({
    meta: [{ title: "Documents — DSM by EveryDriver" }],
  }),
  component: DocumentsPage,
});

const POPPINS = { fontFamily: "Inter, sans-serif" } as const;

type DocType = "adi" | "insurance" | "mot" | "dbs" | "tax" | "other";

interface Doc {
  id: string;
  name: string;
  doc_type: string;
  expiry_date: string | null;
  notes: string | null;
  file_url: string | null;
  created_at: string;
}

const TYPES: { value: DocType; label: string; color: string; tint: string }[] = [
  { value: "adi", label: "ADI Badge", color: "#1A4A6E", tint: "#DBEAFE" },
  { value: "insurance", label: "Insurance", color: "#16A34A", tint: "#ECFDF5" },
  { value: "mot", label: "MOT", color: "#F59E0B", tint: "#FEF3C7" },
  { value: "dbs", label: "DBS Check", color: "#CC2229", tint: "#FEE2E2" },
  { value: "tax", label: "Tax", color: "#5B21B6", tint: "#EDE9FE" },
  { value: "other", label: "Other", color: "#6B7280", tint: "#F4F4F5" },
];

function typeMeta(t: string) {
  return TYPES.find((x) => x.value === t) ?? TYPES[5];
}

function TypeIcon({ type, size = 18 }: { type: string; size?: number }) {
  const meta = typeMeta(type);
  const Icon =
    type === "adi"
      ? BadgeCheck
      : type === "insurance"
      ? ShieldCheck
      : type === "mot"
      ? Car
      : type === "dbs"
      ? FileCheck
      : type === "tax"
      ? Receipt
      : FileText;
  return <Icon size={size} color={meta.color} />;
}

function daysUntil(iso: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const exp = new Date(iso);
  exp.setHours(0, 0, 0, 0);
  return Math.round((exp.getTime() - today.getTime()) / 86400000);
}

function formatShortDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function expiryColor(days: number | null) {
  if (days == null) return "#6B7280";
  if (days < 0) return "#CC2229";
  if (days <= 30) return "#F59E0B";
  return "#16A34A";
}

const docSchema = z.object({
  name: z.string().min(1, "Name required").max(120),
  doc_type: z.enum(["adi", "insurance", "mot", "dbs", "tax", "other"]),
  expiry_date: z.string().optional(),
  notes: z.string().max(2000).optional(),
});

function DocumentsPage() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [docs, setDocs] = useState<Doc[]>([]);
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<Doc | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (data.user) setUserId(data.user.id);
    })();
  }, []);

  async function load(uid: string) {
    const { data, error } = await supabase
      .from("documents")
      .select("id, name, doc_type, expiry_date, notes, file_url, created_at")
      .eq("instructor_id", uid)
      .order("created_at", { ascending: false });
    if (error) console.error("[documents] fetch error", error);
    setDocs((data ?? []) as unknown as Doc[]);
  }

  useEffect(() => {
    if (userId) load(userId);
  }, [userId]);

  const expiringSoon = useMemo(
    () =>
      docs.filter((d) => {
        if (!d.expiry_date) return false;
        const days = daysUntil(d.expiry_date);
        return days >= 0 && days <= 30;
      }).length,
    [docs],
  );

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
        <div
          className="flex-1 text-center text-[15px] font-semibold text-white"
          style={POPPINS}
        >
          Documents
        </div>
        <button
          type="button"
          aria-label="Add document"
          onClick={() => setAddOpen(true)}
          className="flex items-center justify-center"
          style={{ width: 40, height: 40 }}
        >
          <Plus size={22} color="#FFFFFF" />
        </button>
      </div>

      {expiringSoon > 0 && (
        <div
          className="mx-4 mt-3 flex items-center"
          style={{
            gap: 10,
            padding: 12,
            borderRadius: 10,
            backgroundColor: "#FEF3C7",
            border: "0.5px solid #F59E0B",
          }}
        >
          <AlertTriangle size={18} color="#92400E" />
          <span
            className="text-[13px] font-semibold"
            style={{ color: "#92400E" }}
          >
            {expiringSoon} document{expiringSoon === 1 ? "" : "s"} expiring soon
          </span>
        </div>
      )}

      <div className="px-4">
        <SectionHeader>MY DOCUMENTS</SectionHeader>
        {docs.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center text-[13px]"
            style={{ color: "#6B7280", padding: "32px 0" }}
          >
            <FolderOpen size={28} color="#6B7280" />
            <div className="mt-2">No documents stored</div>
          </div>
        ) : (
          <div className="flex flex-col" style={{ gap: 8 }}>
            {docs.map((d) => {
              const meta = typeMeta(d.doc_type);
              const days = d.expiry_date ? daysUntil(d.expiry_date) : null;
              const col = expiryColor(days);
              return (
                <Card key={d.id} className="bg-white">
                  <button
                    type="button"
                    onClick={() => setEditing(d)}
                    className="w-full text-left"
                  >
                    <div className="flex items-start" style={{ gap: 12 }}>
                      <div
                        className="flex items-center justify-center shrink-0"
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 18,
                          backgroundColor: meta.tint,
                        }}
                      >
                        <TypeIcon type={d.doc_type} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between" style={{ gap: 8 }}>
                          <div className="min-w-0">
                            <div
                              className="text-[14px] font-semibold truncate"
                              style={{ color: "#0C2340" }}
                            >
                              {d.name}
                            </div>
                            <div
                              className="text-[12px] mt-0.5"
                              style={{ color: "#6B7280" }}
                            >
                              {meta.label}
                            </div>
                          </div>
                          {d.expiry_date && (
                            <div className="text-right shrink-0">
                              <div
                                className="text-[13px] font-semibold"
                                style={{ color: col }}
                              >
                                {formatShortDate(d.expiry_date)}
                              </div>
                              <div
                                className="text-[12px] mt-0.5"
                                style={{ color: col }}
                              >
                                {days != null && days < 0
                                  ? `Expired ${Math.abs(days)} day${Math.abs(days) === 1 ? "" : "s"} ago`
                                  : `Expires in ${days} day${days === 1 ? "" : "s"}`}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                  {d.file_url && (
                    <a
                      href={d.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-flex items-center justify-center text-[12px] font-semibold"
                      style={{
                        gap: 6,
                        height: 32,
                        padding: "0 12px",
                        borderRadius: 8,
                        backgroundColor: "#F1F5F9",
                        color: "#1A4A6E",
                        border: "0.5px solid #CBD5E1",
                      }}
                    >
                      <ExternalLink size={13} color="#1A4A6E" /> View file
                    </a>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {addOpen && userId && (
        <DocSheet
          userId={userId}
          onClose={() => setAddOpen(false)}
          onSaved={() => {
            setAddOpen(false);
            load(userId);
          }}
        />
      )}
      {editing && userId && (
        <DocSheet
          userId={userId}
          doc={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            load(userId);
          }}
          onDeleted={() => {
            setEditing(null);
            load(userId);
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
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      style={POPPINS}
    >
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
          <span
            className="text-[11px] font-semibold tracking-wider"
            style={{ color: "#6B7280" }}
          >
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

function DocSheet({
  userId,
  doc,
  onClose,
  onSaved,
  onDeleted,
}: {
  userId: string;
  doc?: Doc;
  onClose: () => void;
  onSaved: () => void;
  onDeleted?: () => void;
}) {
  const [name, setName] = useState(doc?.name ?? "");
  const [type, setType] = useState<DocType>((doc?.doc_type as DocType) ?? "other");
  const [expiry, setExpiry] = useState(doc?.expiry_date ?? "");
  const [notes, setNotes] = useState(doc?.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [existingUrl] = useState<string | null>(doc?.file_url ?? null);

  const ACCEPT = "application/pdf,image/jpeg,image/png";
  const MAX_BYTES = 10 * 1024 * 1024;

  function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    if (!f) {
      setFile(null);
      return;
    }
    const okType = ["application/pdf", "image/jpeg", "image/png"].includes(f.type);
    if (!okType) {
      toast.error("Only PDF, JPG or PNG files allowed");
      e.target.value = "";
      return;
    }
    if (f.size > MAX_BYTES) {
      toast.error("File too large (max 10MB)");
      e.target.value = "";
      return;
    }
    setFile(f);
  }

  async function save() {
    if (saving) return;
    const parsed = docSchema.safeParse({
      name: name.trim(),
      doc_type: type,
      expiry_date: expiry || undefined,
      notes: notes.trim() || undefined,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Invalid input");
      return;
    }
    setSaving(true);

    let fileUrl: string | null | undefined = undefined;
    if (file) {
      const ext = file.name.split(".").pop() ?? "bin";
      const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("documents")
        .upload(path, file, { contentType: file.type, upsert: false });
      if (upErr) {
        console.error("[documents] upload error", upErr);
        toast.error("Couldn't upload file");
        setSaving(false);
        return;
      }
      const { data: pub } = supabase.storage.from("documents").getPublicUrl(path);
      fileUrl = pub.publicUrl;
    }

    const payload: Record<string, unknown> = {
      name: parsed.data.name,
      doc_type: parsed.data.doc_type,
      expiry_date: parsed.data.expiry_date ?? null,
      notes: parsed.data.notes ?? null,
    };
    if (fileUrl !== undefined) payload.file_url = fileUrl;

    const { error } = doc
      ? await supabase.from("documents").update(payload).eq("id", doc.id)
      : await supabase
          .from("documents")
          .insert({ ...payload, instructor_id: userId });
    setSaving(false);
    if (error) {
      console.error("[documents] save error", error);
      toast.error("Couldn't save document");
      return;
    }
    toast.success(doc ? "Document updated" : "Document added");
    onSaved();
  }

  async function remove() {
    if (!doc) return;
    if (!confirm("Delete this document?")) return;
    const { error } = await supabase.from("documents").delete().eq("id", doc.id);
    if (error) {
      console.error("[documents] delete error", error);
      toast.error("Couldn't delete");
      return;
    }
    toast.success("Document deleted");
    onDeleted?.();
  }

  return (
    <SheetShell title={doc ? "EDIT DOCUMENT" : "ADD DOCUMENT"} onClose={onClose}>
      <div className="flex flex-col" style={{ gap: 12 }}>
        <Input
          label="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. ADI badge 2026"
        />
        <div>
          <label
            className="block text-[11px] font-semibold tracking-wider mb-1"
            style={{ color: "#6B7280" }}
          >
            TYPE
          </label>
          <div className="grid grid-cols-3" style={{ gap: 8 }}>
            {TYPES.map((t) => {
              const active = type === t.value;
              return (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setType(t.value)}
                  className="flex items-center justify-center text-[12px] font-semibold"
                  style={{
                    height: 40,
                    borderRadius: 8,
                    backgroundColor: active ? t.tint : "#F8F9FB",
                    color: active ? t.color : "#0C2340",
                    border: active
                      ? `1px solid ${t.color}`
                      : "0.5px solid #EEF2F7",
                  }}
                >
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>
        <Input
          label="Expiry date"
          type="date"
          value={expiry}
          onChange={(e) => setExpiry(e.target.value)}
        />
        <div>
          <label
            className="block text-[11px] font-semibold tracking-wider mb-1"
            style={{ color: "#6B7280" }}
          >
            NOTES
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="w-full text-[14px]"
            style={{
              border: "0.5px solid #EEF2F7",
              borderRadius: 8,
              padding: 10,
              color: "#0C2340",
              outline: "none",
              resize: "vertical",
            }}
            placeholder="Optional notes…"
          />
        </div>
        <div>
          <label
            className="block text-[11px] font-semibold tracking-wider mb-1"
            style={{ color: "#6B7280" }}
          >
            FILE
          </label>
          <label
            className="flex items-center justify-center text-[13px] font-semibold cursor-pointer"
            style={{
              gap: 8,
              height: 44,
              borderRadius: 8,
              backgroundColor: "#F8F9FB",
              color: "#1A4A6E",
              border: "1px dashed #1A4A6E",
            }}
          >
            <Upload size={16} color="#1A4A6E" />
            Upload file
            <input
              type="file"
              accept={ACCEPT}
              onChange={onPickFile}
              className="hidden"
            />
          </label>
          {file ? (
            <div className="mt-1 text-[12px]" style={{ color: "#0C2340" }}>
              {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
            </div>
          ) : existingUrl ? (
            <div className="mt-1 text-[12px]" style={{ color: "#6B7280" }}>
              File already attached — choose a new file to replace it.
            </div>
          ) : (
            <div className="mt-1 text-[11px]" style={{ color: "#6B7280" }}>
              PDF, JPG or PNG — max 10MB
            </div>
          )}
        </div>
        <div className="mt-2 grid grid-cols-2" style={{ gap: 8 }}>
          <Button variant="ghost" onClick={onClose} type="button">
            Cancel
          </Button>
          <Button onClick={save} disabled={saving} type="button">
            {saving ? "Saving…" : "Save"}
          </Button>
        </div>
        {doc && (
          <button
            type="button"
            onClick={remove}
            className="flex items-center justify-center mt-1 text-[13px] font-semibold"
            style={{ gap: 6, color: "#CC2229", padding: 10 }}
          >
            <Trash2 size={14} color="#CC2229" /> Delete document
          </button>
        )}
      </div>
    </SheetShell>
  );
}
