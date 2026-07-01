import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Plus,
  Tag,
  Copy,
  Share2,
  Trash2,
  X,
  Percent,
  PoundSterling,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "../lib/supabaseClient";

// -- SQL to run manually --
// create table if not exists public.discount_codes (
//   id uuid primary key default gen_random_uuid(),
//   instructor_id uuid references public.instructors(id) on delete cascade not null,
//   code text not null,
//   type text not null default 'percentage',
//   value numeric(8,2) not null,
//   max_uses integer,
//   uses_count integer default 0,
//   expires_at timestamptz,
//   active boolean default true,
//   description text,
//   created_at timestamptz default now(),
//   deleted_at timestamptz,
//   unique(instructor_id, code)
// );
// alter table public.discount_codes enable row level security;
// create policy "Instructors can manage own discount codes" on public.discount_codes for all to authenticated using (instructor_id = auth.uid()) with check (instructor_id = auth.uid());
// grant all on public.discount_codes to authenticated;

export const Route = createFileRoute("/discount-codes")({
  head: () => ({
    meta: [
      { title: "Discount codes — DSM by EveryDriver" },
      { name: "description", content: "Create and share discount codes with your pupils." },
    ],
  }),
  component: DiscountCodesPage,
});

const POPPINS = { fontFamily: "Poppins, sans-serif" } as const;

const SUGGESTIONS = ["SAVE10", "WELCOME", "FIRSTLESSON", "REFER5", "BLOCK10"];

type Discount = {
  id: string;
  instructor_id: string;
  code: string;
  type: "percentage" | "fixed";
  value: number;
  max_uses: number | null;
  uses_count: number;
  expires_at: string | null;
  active: boolean;
  description: string | null;
  created_at: string;
  deleted_at: string | null;
};

function fmtDate(d: string | null) {
  if (!d) return "No expiry";
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

function DiscountCodesPage() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [codes, setCodes] = useState<Discount[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      setUserId(data.user?.id ?? null);
    })();
  }, []);

  async function fetchCodes() {
    if (!userId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("discount_codes")
      .select("*")
      .eq("instructor_id", userId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });
    if (error) {
      console.error("[discount-codes] fetch error", error);
      toast.error(error.message);
    }
    setCodes((data ?? []) as Discount[]);
    setLoading(false);
  }

  useEffect(() => {
    if (userId) fetchCodes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  async function toggleActive(c: Discount) {
    const { error } = await supabase
      .from("discount_codes")
      .update({ active: !c.active })
      .eq("id", c.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    setCodes((cs) => cs.map((x) => (x.id === c.id ? { ...x, active: !c.active } : x)));
  }

  async function softDelete(id: string) {
    if (!confirm("Delete this discount code?")) return;
    const { error } = await supabase
      .from("discount_codes")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Deleted");
    fetchCodes();
  }

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Copied");
    } catch {
      toast.error("Copy failed");
    }
  }

  async function share(c: Discount) {
    const msg = `Use code ${c.code} for ${
      c.type === "percentage" ? `${c.value}%` : `£${c.value}`
    } off your driving lessons!`;
    if ((navigator as any).share) {
      try {
        await (navigator as any).share({ text: msg, title: `Discount code ${c.code}` });
        return;
      } catch {
        // fall through
      }
    }
    copy(msg);
  }

  return (
    <div className="min-h-screen bg-white pb-16" style={POPPINS}>
      {/* TOP BAR */}
      <div
        className="sticky top-0 z-40 h-[52px] px-4 flex items-center justify-between"
        style={{ backgroundColor: "#0F2044" }}
      >
        <button
          type="button"
          aria-label="Back"
          onClick={() => navigate({ to: "/settings" })}
          className="flex items-center justify-center"
          style={{ width: 40, height: 40 }}
        >
          <ArrowLeft size={22} color="#ffffff" />
        </button>
        <div className="text-white text-[15px] font-semibold">Discount codes</div>
        <button
          type="button"
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-1 text-white text-[13px] font-medium"
          style={{
            height: 32,
            padding: "0 10px",
            borderRadius: 8,
            backgroundColor: "rgba(255,255,255,0.15)",
          }}
        >
          <Plus size={16} /> New code
        </button>
      </div>

      {/* INTRO */}
      <div
        style={{
          margin: "16px 16px 0",
          padding: 16,
          borderRadius: 12,
          backgroundColor: "#F0F4FF",
          border: "0.5px solid #BFDBFE",
        }}
      >
        <div className="flex items-start gap-3">
          <Tag size={20} color="#1A52A0" />
          <div className="text-[13px] text-[#1E3A8A] leading-snug">
            Offer discounts to your pupils. Share a code and they'll get money off their
            booking.
          </div>
        </div>
      </div>

      {/* LIST */}
      <div style={{ marginTop: 12 }}>
        {loading ? (
          <div className="text-center text-[13px] text-[#6B7280] py-8">Loading…</div>
        ) : codes.length === 0 ? (
          <div className="text-center py-10 px-4">
            <div className="text-[14px] font-semibold text-[#0F2044]">No discount codes yet</div>
            <div className="text-[12px] text-[#6B7280] mt-1">
              Tap "New code" to create your first offer.
            </div>
          </div>
        ) : (
          codes.map((c) => (
            <CodeCard
              key={c.id}
              code={c}
              onCopy={() => copy(c.code)}
              onShare={() => share(c)}
              onToggle={() => toggleActive(c)}
              onDelete={() => softDelete(c.id)}
            />
          ))
        )}
      </div>

      {showAdd && userId && (
        <AddSheet
          userId={userId}
          onClose={() => setShowAdd(false)}
          onSaved={() => {
            setShowAdd(false);
            fetchCodes();
          }}
        />
      )}
    </div>
  );
}

function CodeCard({
  code,
  onCopy,
  onShare,
  onToggle,
  onDelete,
}: {
  code: Discount;
  onCopy: () => void;
  onShare: () => void;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const isPct = code.type === "percentage";
  const typeColor = isPct ? "#D97706" : "#1A52A0";
  const typeBg = isPct ? "#FEF3C7" : "#DBEAFE";
  const usesLabel = `${code.uses_count} / ${code.max_uses ?? "∞"} uses`;
  return (
    <div
      style={{
        margin: "0 16px 8px",
        padding: 16,
        borderRadius: 12,
        backgroundColor: "#FFFFFF",
        border: "0.5px solid #E2E6ED",
        opacity: code.active ? 1 : 0.6,
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <div
              className="text-[20px] font-bold text-[#0F2044] truncate"
              style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}
            >
              {code.code}
            </div>
            <button
              type="button"
              onClick={onCopy}
              aria-label="Copy code"
              style={{
                width: 28,
                height: 28,
                borderRadius: 6,
                backgroundColor: "#F3F4F6",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Copy size={14} color="#0F2044" />
            </button>
          </div>
          <div className="flex items-center gap-1.5 mt-2 flex-wrap">
            <span
              className="text-[10px] font-semibold uppercase tracking-wider"
              style={{
                color: typeColor,
                backgroundColor: typeBg,
                padding: "3px 8px",
                borderRadius: 6,
              }}
            >
              {isPct ? "% OFF" : "£ OFF"}
            </span>
            <span className="text-[13px] font-semibold text-[#0F2044]">
              {isPct ? `${code.value}% off` : `£${Number(code.value).toFixed(2)} off`}
            </span>
          </div>
        </div>
        <label className="flex items-center gap-2 cursor-pointer shrink-0">
          <span className="text-[11px] text-[#6B7280]">{code.active ? "On" : "Off"}</span>
          <div
            onClick={onToggle}
            style={{
              width: 36,
              height: 20,
              borderRadius: 999,
              backgroundColor: code.active ? "#16A34A" : "#D1D5DB",
              position: "relative",
              transition: "background 0.15s",
            }}
          >
            <div
              style={{
                position: "absolute",
                top: 2,
                left: code.active ? 18 : 2,
                width: 16,
                height: 16,
                borderRadius: 999,
                backgroundColor: "#FFFFFF",
                transition: "left 0.15s",
              }}
            />
          </div>
        </label>
      </div>

      <div className="mt-3 flex items-center justify-between text-[12px] text-[#6B7280]">
        <span>{usesLabel}</span>
        <span>{fmtDate(code.expires_at)}</span>
      </div>

      {code.description && (
        <div className="mt-2 text-[12px] text-[#374151]">{code.description}</div>
      )}

      <div className="flex gap-2 mt-3">
        <button
          type="button"
          onClick={onShare}
          className="flex-1 flex items-center justify-center gap-1 text-[12px] font-medium text-white"
          style={{ height: 34, borderRadius: 8, backgroundColor: "#1A52A0" }}
        >
          <Share2 size={13} /> Share
        </button>
        <button
          type="button"
          onClick={onDelete}
          aria-label="Delete"
          style={{
            width: 40,
            height: 34,
            borderRadius: 8,
            backgroundColor: "#FEF2F2",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Trash2 size={14} color="#CC2229" />
        </button>
      </div>
    </div>
  );
}

function AddSheet({
  userId,
  onClose,
  onSaved,
}: {
  userId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [code, setCode] = useState("");
  const [type, setType] = useState<"percentage" | "fixed">("percentage");
  const [value, setValue] = useState("10");
  const [maxUses, setMaxUses] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  const filteredSuggestions = useMemo(() => {
    const q = code.trim().toUpperCase();
    if (!q) return SUGGESTIONS;
    return SUGGESTIONS.filter((s) => s.startsWith(q) && s !== q);
  }, [code]);

  async function submit() {
    const trimmed = code.trim().toUpperCase().replace(/\s+/g, "");
    if (!trimmed) {
      toast.error("Code is required");
      return;
    }
    const v = Number(value);
    if (!isFinite(v) || v <= 0) {
      toast.error("Value must be greater than 0");
      return;
    }
    if (type === "percentage" && v > 100) {
      toast.error("Percentage cannot exceed 100");
      return;
    }
    setSaving(true);
    const payload: Record<string, unknown> = {
      instructor_id: userId,
      code: trimmed,
      type,
      value: v,
      max_uses: maxUses ? Number(maxUses) : null,
      expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
      description: description.trim() || null,
      active: true,
    };
    const { error } = await supabase.from("discount_codes").insert(payload);
    setSaving(false);
    if (error) {
      console.error("[discount-codes] insert error", error);
      if (error.code === "23505") {
        toast.error("You already have a code with that name");
      } else {
        toast.error(error.message);
      }
      return;
    }
    toast.success("Code created");
    onSaved();
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0,0,0,0.5)",
        zIndex: 50,
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: 520,
          maxHeight: "92vh",
          backgroundColor: "#FFFFFF",
          borderTopLeftRadius: 16,
          borderTopRightRadius: 16,
          overflowY: "auto",
          fontFamily: "Poppins, sans-serif",
        }}
      >
        <div
          className="sticky top-0 flex items-center justify-between px-4"
          style={{
            height: 52,
            backgroundColor: "#FFFFFF",
            borderBottom: "0.5px solid #E2E6ED",
          }}
        >
          <div className="text-[15px] font-semibold text-[#0F2044]">New discount code</div>
          <button type="button" onClick={onClose} aria-label="Close">
            <X size={20} color="#0F2044" />
          </button>
        </div>

        <div className="p-4 space-y-3">
          <Field label="Code *">
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="e.g. SAVE10"
              style={{
                ...inputStyle,
                fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                fontWeight: 600,
                letterSpacing: 0.5,
              }}
            />
            {filteredSuggestions.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {filteredSuggestions.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setCode(s)}
                    className="text-[11px] font-medium"
                    style={{
                      height: 26,
                      padding: "0 10px",
                      borderRadius: 999,
                      backgroundColor: "#F3F4F6",
                      color: "#0F2044",
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </Field>

          <Field label="Type">
            <div className="grid grid-cols-2 gap-2">
              <TypeBtn
                active={type === "percentage"}
                onClick={() => setType("percentage")}
                icon={<Percent size={14} />}
                label="Percentage"
              />
              <TypeBtn
                active={type === "fixed"}
                onClick={() => setType("fixed")}
                icon={<PoundSterling size={14} />}
                label="Fixed amount"
              />
            </div>
          </Field>

          <Field label={type === "percentage" ? "Value (%)" : "Value (£)"}>
            <input
              type="number"
              min="0"
              step={type === "percentage" ? "1" : "0.5"}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              style={inputStyle}
            />
          </Field>

          <Field label="Max uses (leave blank for unlimited)">
            <input
              type="number"
              min="1"
              step="1"
              value={maxUses}
              onChange={(e) => setMaxUses(e.target.value)}
              placeholder="Unlimited"
              style={inputStyle}
            />
          </Field>

          <Field label="Expiry date (optional)">
            <input
              type="date"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              style={inputStyle}
            />
          </Field>

          <Field label="Description (optional)">
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. For new pupils only"
              style={inputStyle}
            />
          </Field>

          <button
            type="button"
            disabled={saving}
            onClick={submit}
            className="w-full text-white text-[14px] font-semibold mt-2"
            style={{
              backgroundColor: "#1A52A0",
              height: 46,
              borderRadius: 10,
              opacity: saving ? 0.6 : 1,
            }}
          >
            {saving ? "Creating…" : "Create code"}
          </button>
          <div style={{ height: 12 }} />
        </div>
      </div>
    </div>
  );
}

function TypeBtn({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center justify-center gap-1.5 text-[13px] font-medium"
      style={{
        height: 40,
        borderRadius: 8,
        border: `0.5px solid ${active ? "#1A52A0" : "#E2E6ED"}`,
        backgroundColor: active ? "#EFF6FF" : "#FFFFFF",
        color: active ? "#1A52A0" : "#6B7280",
      }}
    >
      {icon} {label}
    </button>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  height: 40,
  padding: "0 12px",
  borderRadius: 8,
  border: "0.5px solid #E2E6ED",
  backgroundColor: "#FFFFFF",
  color: "#0F2044",
  fontSize: 14,
  fontFamily: "Poppins, sans-serif",
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
