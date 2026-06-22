import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Plus, X, FileSignature, FileText } from "lucide-react";
import { toast } from "sonner";
import { Button } from "../components/dsm/Button";
import { Card } from "../components/dsm/Card";
import { Input } from "../components/dsm/Input";
import { SectionHeader } from "../components/dsm/SectionHeader";
import { supabase } from "../lib/supabaseClient";

export const Route = createFileRoute("/waivers")({
  head: () => ({ meta: [{ title: "Waivers — DSM by EveryDriver" }] }),
  component: WaiversPage,
});

const POPPINS = { fontFamily: "Poppins, sans-serif" } as const;

type Template = {
  id: string;
  instructor_id: string;
  name: string;
  content: string;
  created_at: string;
};

type Signature = {
  id: string;
  template_id: string | null;
  pupil_id: string | null;
  pupil_name: string | null;
  status: string;
  signed_at: string | null;
  created_at: string;
  waiver_templates?: { name: string } | null;
  pupils?: { first_name: string | null; last_name: string | null } | null;
};

type Pupil = {
  id: string;
  first_name: string | null;
  last_name: string | null;
};

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function formatDate(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function WaiversPage() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [signatures, setSignatures] = useState<Signature[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [sendFor, setSendFor] = useState<Template | null>(null);
  const [detail, setDetail] = useState<Template | null>(null);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.auth.getUser();
      if (error) {
        console.error("[waivers] auth.getUser error", error);
        setLoading(false);
        return;
      }
      if (data.user) {
        setUserId(data.user.id);
      } else {
        console.warn("[waivers] no authenticated user");
        setLoading(false);
      }
    })();
  }, []);

  async function load(uid: string) {
    setLoading(true);
    const { data: tpl, error: tErr } = await supabase
      .from("waiver_templates")
      .select("*, waiver_signatures(count)")
      .eq("instructor_id", uid)
      .order("created_at", { ascending: false });

    if (tErr) {
      console.error("[waivers] templates fetch error", tErr);
      setTemplates([]);
    } else {
      const rows = (tpl ?? []) as Array<Template & { waiver_signatures?: { count: number }[] }>;
      setTemplates(rows);
      const c: Record<string, number> = {};
      rows.forEach((r) => {
        c[r.id] = r.waiver_signatures?.[0]?.count ?? 0;
      });
      setCounts(c);
    }

    const { data: sig, error: sErr } = await supabase
      .from("waiver_signatures")
      .select(
        "id, template_id, pupil_id, pupil_name, status, signed_at, created_at, waiver_templates(name), pupils(first_name, last_name)",
      )
      .eq("instructor_id", uid)
      .order("created_at", { ascending: false })
      .limit(20);

    if (sErr) {
      console.error("[waivers] signatures fetch error", sErr);
      setSignatures([]);
    } else {
      setSignatures((sig ?? []) as unknown as Signature[]);
    }

    setLoading(false);
  }

  useEffect(() => {
    if (userId) load(userId);
  }, [userId]);


  return (
    <div className="min-h-screen bg-white" style={POPPINS}>
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
        <div className="flex-1 text-center text-[15px] font-semibold text-white">Waivers</div>
        <button
          type="button"
          aria-label="Create waiver"
          onClick={() => setCreateOpen(true)}
          className="flex items-center justify-center"
          style={{ width: 40, height: 40 }}
        >
          <Plus size={22} color="#FFFFFF" />
        </button>
      </div>

      <div className="px-4 pb-12">
        <SectionHeader>WAIVER TEMPLATES</SectionHeader>
        {loading && templates.length === 0 && (
          <div className="text-[13px]" style={{ color: "#6B7280" }}>
            Loading…
          </div>
        )}
        {!loading && templates.length === 0 && (
          <Card className="flex flex-col items-center justify-center text-center" style={{ padding: 24 }}>
            <FileSignature size={36} color="#1A52A0" />
            <div className="mt-2 text-[13px]" style={{ color: "#6B7280" }}>
              No waiver templates yet
            </div>
          </Card>
        )}
        <div className="flex flex-col" style={{ gap: 8 }}>
          {templates.map((t) => (
            <Card
              key={t.id}
              className="cursor-pointer"
              onClick={() => setDetail(t)}
              style={{ padding: 12 }}
            >
              <div className="flex items-center" style={{ gap: 12 }}>
                <div
                  className="flex items-center justify-center rounded-full flex-shrink-0"
                  style={{ width: 36, height: 36, backgroundColor: "#EEF4FB" }}
                >
                  <FileText size={18} color="#1A52A0" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[14px] font-semibold truncate" style={{ color: "#0F2044" }}>
                    {t.name}
                  </div>
                  <div className="text-[12px]" style={{ color: "#6B7280" }}>
                    {counts[t.id] ?? 0} pupils signed
                  </div>
                </div>
                <Button
                  variant="ghost"
                  inline
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSendFor(t);
                  }}
                  className="h-9 px-3 text-[12px]"
                >
                  Send to pupil
                </Button>
              </div>
            </Card>
          ))}
        </div>

        <SectionHeader>RECENT SIGNATURES</SectionHeader>
        {!loading && signatures.length === 0 && (
          <div className="text-[13px]" style={{ color: "#6B7280" }}>
            No signatures yet
          </div>
        )}
        <div className="flex flex-col" style={{ gap: 8 }}>
          {signatures.map((s) => {
            const pupilName =
              s.pupils
                ? `${s.pupils.first_name ?? ""} ${s.pupils.last_name ?? ""}`.trim()
                : s.pupil_name ?? "Pupil";
            const templateName = s.waiver_templates?.name ?? "Waiver";
            const dateStr =
              s.signed_at
                ? formatDate(s.signed_at)
                : `Sent ${formatDate(s.created_at)}`;
            return (
              <Card key={s.id} style={{ padding: 12 }}>
                <div className="flex items-center" style={{ gap: 12 }}>
                  <div
                    className="flex items-center justify-center rounded-full flex-shrink-0 text-white text-[12px] font-semibold"
                    style={{ width: 36, height: 36, backgroundColor: "#1A52A0" }}
                  >
                    {initials(pupilName)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[14px] font-semibold truncate" style={{ color: "#0F2044" }}>
                      {pupilName}
                    </div>
                    <div className="text-[13px] truncate" style={{ color: "#6B7280" }}>
                      {templateName}
                    </div>
                  </div>
                  <div className="text-[11px] flex-shrink-0" style={{ color: "#6B7280" }}>
                    {dateStr}
                  </div>
                </div>
                <div
                  className="inline-block mt-2 text-[10px] font-medium"
                  style={{
                    backgroundColor: s.status === "signed" ? "#ECFDF5" : "#FEF3C7",
                    color: s.status === "signed" ? "#059669" : "#92400E",
                    padding: "2px 8px",
                    borderRadius: 999,
                  }}
                >
                  {s.status}
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {createOpen && userId && (
        <CreateWaiverSheet
          userId={userId}
          onClose={() => setCreateOpen(false)}
          onSaved={() => {
            setCreateOpen(false);
            if (userId) load(userId);
          }}
        />
      )}

      {sendFor && userId && (
        <SendToPupilSheet
          userId={userId}
          template={sendFor}
          onClose={() => setSendFor(null)}
          onSent={() => {
            setSendFor(null);
            if (userId) load(userId);
          }}
        />
      )}

      {detail && (
        <TemplateDetailSheet template={detail} onClose={() => setDetail(null)} />
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
      style={{ backgroundColor: "rgba(15,32,68,0.45)" }}
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
          fontFamily: "Poppins, sans-serif",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="sticky top-0 flex items-center justify-between bg-white"
          style={{ padding: "14px 16px", borderBottom: "0.5px solid #E2E6ED" }}
        >
          <div className="text-[15px] font-semibold" style={{ color: "#0F2044" }}>
            {title}
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="flex items-center justify-center"
            style={{ width: 36, height: 36 }}
          >
            <X size={20} color="#0F2044" />
          </button>
        </div>
        <div style={{ padding: 16 }}>{children}</div>
      </div>
    </div>
  );
}

function CreateWaiverSheet({
  userId,
  onClose,
  onSaved,
}: {
  userId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState("");
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!name.trim()) {
      toast.error("Template name is required");
      return;
    }
    if (!content.trim()) {
      toast.error("Waiver content is required");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("waiver_templates").insert({
      instructor_id: userId,
      name: name.trim(),
      content: content.trim(),
    });
    setSaving(false);
    if (error) {
      console.error("[waivers] insert template", error);
      toast.error("Couldn't save template");
      return;
    }
    toast.success("Waiver template saved");
    onSaved();
  }

  return (
    <SheetShell title="Create waiver" onClose={onClose}>
      <div className="flex flex-col" style={{ gap: 12 }}>
        <Input
          label="Template name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={120}
          placeholder="e.g. Standard pupil waiver"
        />
        <div>
          <label
            className="block mb-1 text-[12px] font-medium"
            style={{ color: "#6B7280" }}
          >
            Content
          </label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={8}
            className="w-full rounded-lg px-3 py-2 text-[14px] bg-white"
            style={{
              border: "0.5px solid #E2E6ED",
              color: "#1A1A2E",
              fontFamily: "Poppins, sans-serif",
              resize: "vertical",
            }}
          />
        </div>
        <Button onClick={save} disabled={saving} type="button">
          {saving ? "Saving…" : "Save"}
        </Button>
      </div>
    </SheetShell>
  );
}

function SendToPupilSheet({
  userId,
  template,
  onClose,
  onSent,
}: {
  userId: string;
  template: Template;
  onClose: () => void;
  onSent: () => void;
}) {
  const [pupils, setPupils] = useState<Pupil[]>([]);
  const [pupilId, setPupilId] = useState("");
  const [sending, setSending] = useState(false);
  const [link, setLink] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("pupils")
        .select("id, first_name, last_name")
        .eq("instructor_id", userId)
        .order("first_name", { ascending: true });
      if (error) {
        console.error("[waivers] pupils", error);
        return;
      }
      setPupils((data ?? []) as Pupil[]);
    })();
  }, [userId]);

  const selected = useMemo(
    () => pupils.find((p) => p.id === pupilId) ?? null,
    [pupils, pupilId],
  );

  async function send() {
    if (!pupilId) {
      toast.error("Pick a pupil");
      return;
    }
    setSending(true);
    const pupilName = selected
      ? `${selected.first_name ?? ""} ${selected.last_name ?? ""}`.trim()
      : null;
    const { data, error } = await supabase
      .from("waiver_signatures")
      .insert({
        instructor_id: userId,
        template_id: template.id,
        pupil_id: pupilId,
        pupil_name: pupilName,
        status: "pending",
      })
      .select("id")
      .single();
    setSending(false);
    if (error || !data) {
      console.error("[waivers] send", error);
      toast.error("Couldn't send waiver");
      return;
    }
    const origin =
      typeof window !== "undefined" ? window.location.origin : "";
    const signingLink = `${origin}/waivers/sign/${data.id}`;
    setLink(signingLink);
    toast.success("Waiver sent");
  }

  return (
    <SheetShell title={`Send: ${template.name}`} onClose={onClose}>
      <div className="flex flex-col" style={{ gap: 12 }}>
        <div>
          <label
            className="block mb-1 text-[12px] font-medium"
            style={{ color: "#6B7280" }}
          >
            Pupil
          </label>
          <select
            value={pupilId}
            onChange={(e) => setPupilId(e.target.value)}
            className="h-11 w-full rounded-lg px-3 text-[14px] bg-white"
            style={{
              border: "0.5px solid #E2E6ED",
              color: "#1A1A2E",
              fontFamily: "Poppins, sans-serif",
            }}
          >
            <option value="">Select pupil…</option>
            {pupils.map((p) => (
              <option key={p.id} value={p.id}>
                {`${p.first_name ?? ""} ${p.last_name ?? ""}`.trim() || "Unnamed"}
              </option>
            ))}
          </select>
        </div>

        {link && (
          <div
            style={{
              backgroundColor: "#EEF4FB",
              border: "0.5px solid #1A52A0",
              borderRadius: 12,
              padding: 12,
            }}
          >
            <div className="text-[12px] font-medium mb-1" style={{ color: "#0F2044" }}>
              Signing link
            </div>
            <div className="text-[12px] break-all" style={{ color: "#1A52A0" }}>
              {link}
            </div>
            <button
              type="button"
              className="mt-2 text-[12px] font-medium"
              style={{ color: "#1A52A0" }}
              onClick={() => {
                if (typeof navigator !== "undefined" && navigator.clipboard) {
                  navigator.clipboard.writeText(link);
                  toast.success("Link copied");
                }
              }}
            >
              Copy link
            </button>
          </div>
        )}

        <div className="flex" style={{ gap: 8 }}>
          {link ? (
            <Button type="button" onClick={onSent}>
              Done
            </Button>
          ) : (
            <Button type="button" onClick={send} disabled={sending}>
              {sending ? "Sending…" : "Send"}
            </Button>
          )}
        </div>
      </div>
    </SheetShell>
  );
}

function TemplateDetailSheet({
  template,
  onClose,
}: {
  template: Template;
  onClose: () => void;
}) {
  return (
    <SheetShell title={template.name} onClose={onClose}>
      <div
        className="text-[13px] whitespace-pre-wrap"
        style={{ color: "#0F2044", lineHeight: 1.5 }}
      >
        {template.content}
      </div>
    </SheetShell>
  );
}
