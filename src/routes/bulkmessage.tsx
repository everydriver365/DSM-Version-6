import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { Card } from "../components/dsm/Card";
import { Button } from "../components/dsm/Button";
import { SectionHeader } from "../components/dsm/SectionHeader";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { supabase } from "../lib/supabaseClient";

export const Route = createFileRoute("/bulkmessage")({
  head: () => ({
    meta: [
      { title: "Bulk message — DSM" },
      { name: "description", content: "Send SMS messages to multiple pupils." },
    ],
  }),
  component: BulkMessagePage,
});

const POPPINS = { fontFamily: "Poppins, sans-serif" } as const;

type FilterKey =
  | "all"
  | "active"
  | "passed"
  | "outstanding"
  | "no_lesson_week"
  | "test_soon";

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "All pupils" },
  { key: "active", label: "Active only" },
  { key: "passed", label: "Passed" },
  { key: "outstanding", label: "Has outstanding balance" },
  { key: "no_lesson_week", label: "No lesson this week" },
  { key: "test_soon", label: "Test coming up" },
];

type TemplateKey = "lesson" | "payment" | "test" | "custom";

const TEMPLATES: Record<TemplateKey, { label: string; text: string }> = {
  lesson: {
    label: "Lesson reminder",
    text: "Hi! Just a reminder about your upcoming driving lesson. See you soon!",
  },
  payment: {
    label: "Payment reminder",
    text: "Hi! This is a friendly reminder that you have an outstanding balance. Please get in touch to settle. Thanks!",
  },
  test: {
    label: "Test reminder",
    text: "Hi! Your driving test is coming up. Make sure you're well rested and ready. Good luck!",
  },
  custom: { label: "Custom", text: "" },
};

type Pupil = {
  id: string;
  name: string | null;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  status: string | null;
  balance: number | null;
  test_date: string | null;
};

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  const a = parts[0]?.[0] ?? "";
  const b = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (a + b).toUpperCase() || "?";
}

function displayName(p: Pupil) {
  if (p.name && p.name.trim()) return p.name.trim();
  return `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim() || "Unnamed";
}

function BulkMessagePage() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [pupils, setPupils] = useState<Pupil[]>([]);
  const [lessonPupilIds, setLessonPupilIds] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<FilterKey>("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [template, setTemplate] = useState<TemplateKey>("custom");
  const [message, setMessage] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: auth, error: authErr } = await supabase.auth.getUser();
      if (authErr) console.error("[bulkmessage] auth error", authErr);
      const uid = auth.user?.id;
      if (!uid) return;
      setUserId(uid);

      const { data: ps, error: pErr } = await supabase
        .from("pupils")
        .select("id, name, first_name, last_name, phone, status, balance, test_date")
        .eq("instructor_id", uid)
        .is("deleted_at", null);
      if (pErr) console.error("[bulkmessage] pupils fetch error", pErr);
      setPupils((ps as Pupil[]) ?? []);

      const today = new Date();
      const day = today.getDay();
      const monday = new Date(today);
      monday.setDate(today.getDate() - ((day + 6) % 7));
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      const iso = (d: Date) => d.toISOString().slice(0, 10);

      const { data: ls, error: lErr } = await supabase
        .from("lessons")
        .select("pupil_id, lesson_date, status")
        .eq("instructor_id", uid)
        .gte("lesson_date", iso(monday))
        .lte("lesson_date", iso(sunday))
        .not("status", "in", "(cancelled)");
      if (lErr) console.error("[bulkmessage] lessons fetch error", lErr);
      const set = new Set<string>();
      (ls ?? []).forEach((l: { pupil_id: string | null }) => {
        if (l.pupil_id) set.add(l.pupil_id);
      });
      setLessonPupilIds(set);
    })();
  }, []);

  const filtered = useMemo(() => {
    const now = new Date();
    const in14 = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
    return pupils.filter((p) => {
      switch (filter) {
        case "all":
          return true;
        case "active":
          return (p.status ?? "").toLowerCase() === "active";
        case "passed":
          return (p.status ?? "").toLowerCase() === "passed";
        case "outstanding":
          return (p.balance ?? 0) > 0;
        case "no_lesson_week":
          return !lessonPupilIds.has(p.id);
        case "test_soon": {
          if (!p.test_date) return false;
          const td = new Date(p.test_date);
          return td >= now && td <= in14;
        }
      }
    });
  }, [pupils, filter, lessonPupilIds]);

  // Default-select all when filter changes
  useEffect(() => {
    setSelectedIds(new Set(filtered.map((p) => p.id)));
  }, [filter, pupils.length]); // eslint-disable-line react-hooks/exhaustive-deps

  function toggleSelected(id: string) {
    setSelectedIds((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function pickTemplate(k: TemplateKey) {
    setTemplate(k);
    if (k !== "custom") setMessage(TEMPLATES[k].text);
  }

  const selectedPupils = filtered.filter((p) => selectedIds.has(p.id));
  const selectedWithPhone = selectedPupils.filter((p) => p.phone && p.phone.trim());
  const sendCount = selectedWithPhone.length;

  async function confirmSend() {
    if (!userId || sendCount === 0 || !message.trim()) {
      setConfirmOpen(false);
      return;
    }
    setSending(true);
    const { error } = await supabase.from("bulk_messages").insert({
      instructor_id: userId,
      message_text: message,
      recipient_count: sendCount,
      recipient_ids: selectedWithPhone.map((p) => p.id),
      status: "queued",
    });
    setSending(false);
    setConfirmOpen(false);
    if (error) {
      console.error("[bulkmessage] insert error", error);
      setToast("Failed to queue messages");
      setTimeout(() => setToast(null), 3000);
      return;
    }
    setToast(`Messages queued for ${sendCount} pupils`);
    setTimeout(() => setToast(null), 3000);
    setMessage("");
    setTemplate("custom");
  }

  return (
    <div className="min-h-screen bg-white pb-32" style={POPPINS}>
      <div
        className="sticky top-0 z-40 flex items-center px-4"
        style={{ height: 52, backgroundColor: "#0F2044" }}
      >
        <button type="button" onClick={() => navigate({ to: "/home" })} aria-label="Back">
          <ArrowLeft size={22} color="#FFFFFF" />
        </button>
        <div className="flex-1 text-center text-[15px] font-semibold text-white" style={POPPINS}>
          Bulk message
        </div>
        <div style={{ width: 22 }} />
      </div>

      <div className="px-4">
        <SectionHeader>FILTER PUPILS</SectionHeader>
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => {
            const active = filter === f.key;
            return (
              <button
                key={f.key}
                type="button"
                onClick={() => setFilter(f.key)}
                className="px-3 py-2 rounded-full text-[13px]"
                style={{
                  backgroundColor: active ? "#1A52A0" : "#F8F9FB",
                  color: active ? "#FFFFFF" : "#0F2044",
                  borderWidth: "0.5px",
                  borderStyle: "solid",
                  borderColor: active ? "#1A52A0" : "#E2E6ED",
                  ...POPPINS,
                }}
              >
                {f.label}
              </button>
            );
          })}
        </div>

        <SectionHeader>SELECTED PUPILS ({selectedIds.size})</SectionHeader>
        <Card className="!p-0">
          {filtered.length === 0 ? (
            <div className="px-4 py-6 text-[13px] text-[#6B7280] text-center" style={POPPINS}>
              No pupils match this filter.
            </div>
          ) : (
            <div className="max-h-[320px] overflow-y-auto">
              {filtered.map((p, idx) => {
                const checked = selectedIds.has(p.id);
                const dn = displayName(p);
                const hasPhone = !!(p.phone && p.phone.trim());
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => toggleSelected(p.id)}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left"
                    style={idx === 0 ? undefined : { borderTopWidth: "0.5px", borderTopStyle: "solid", borderTopColor: "#E2E6ED" }}
                  >
                    <div
                      className="flex items-center justify-center rounded shrink-0"
                      style={{
                        width: 20,
                        height: 20,
                        backgroundColor: checked ? "#1A52A0" : "#FFFFFF",
                        borderWidth: "1px",
                        borderStyle: "solid",
                        borderColor: checked ? "#1A52A0" : "#9CA3AF",
                      }}
                    >
                      {checked && (
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                          <path d="M2 6.5L5 9.5L10 3" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </div>
                    <div
                      className="flex items-center justify-center rounded-full shrink-0 text-[12px] font-semibold"
                      style={{ width: 36, height: 36, backgroundColor: "#1A52A0", color: "#FFFFFF", ...POPPINS }}
                    >
                      {initials(dn)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[14px] text-[#0F2044] truncate" style={POPPINS}>{dn}</div>
                      <div
                        className="text-[13px] truncate"
                        style={{ color: hasPhone ? "#6B7280" : "#CC2229", ...POPPINS }}
                      >
                        {hasPhone ? p.phone : "No phone"}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </Card>

        <SectionHeader>MESSAGE</SectionHeader>
        <div className="flex flex-wrap gap-2 mb-2">
          {(Object.keys(TEMPLATES) as TemplateKey[]).map((k) => {
            const active = template === k;
            return (
              <button
                key={k}
                type="button"
                onClick={() => pickTemplate(k)}
                className="px-3 py-2 rounded-full text-[13px]"
                style={{
                  backgroundColor: active ? "#1A52A0" : "#F8F9FB",
                  color: active ? "#FFFFFF" : "#0F2044",
                  borderWidth: "0.5px",
                  borderStyle: "solid",
                  borderColor: active ? "#1A52A0" : "#E2E6ED",
                  ...POPPINS,
                }}
              >
                {TEMPLATES[k].label}
              </button>
            );
          })}
        </div>
        <textarea
          rows={5}
          value={message}
          onChange={(e) => {
            setMessage(e.target.value);
            if (template !== "custom") setTemplate("custom");
          }}
          placeholder="Type your message…"
          className="w-full rounded-lg p-3 text-[14px] text-[#0F2044] bg-white resize-none"
          style={{ borderWidth: "0.5px", borderStyle: "solid", borderColor: "#E2E6ED", ...POPPINS }}
        />
        <div className="text-right text-[13px] text-[#6B7280] mt-1" style={POPPINS}>
          {message.length} characters
        </div>

        <div className="mt-4">
          <button
            type="button"
            onClick={() => setConfirmOpen(true)}
            disabled={sendCount === 0 || !message.trim() || sending}
            className="w-full rounded-lg text-white text-[14px] font-medium disabled:opacity-50"
            style={{ height: 52, backgroundColor: "#1A52A0", ...POPPINS }}
          >
            Send to {sendCount} pupils
          </button>
        </div>
        <div className="mt-2 text-[12px] text-[#6B7280] text-center" style={POPPINS}>
          SMS sending via Twilio — messages will be queued and sent automatically
        </div>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title={`Send to ${sendCount} pupils?`}
        confirmLabel="Send"
        onConfirm={confirmSend}
        onCancel={() => setConfirmOpen(false)}
      />

      {toast && (
        <div
          className="fixed left-1/2 -translate-x-1/2 bottom-6 px-4 py-3 rounded-lg text-white text-[14px] z-50"
          style={{ backgroundColor: "#0F2044", ...POPPINS }}
        >
          {toast}
        </div>
      )}
    </div>
  );
}
