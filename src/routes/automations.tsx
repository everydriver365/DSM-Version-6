import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ChevronLeft, Plus, Zap, Edit2 } from "lucide-react";
import { Card } from "../components/dsm/Card";
import { SectionHeader } from "../components/dsm/SectionHeader";
import { Input } from "../components/dsm/Input";
import { Button } from "../components/dsm/Button";
import { supabase } from "../lib/supabaseClient";

export const Route = createFileRoute("/automations")({
  head: () => ({
    meta: [
      { title: "Automations — DSM by EveryDriver" },
      { name: "description", content: "Automated messages to pupils based on triggers." },
    ],
  }),
  component: AutomationsPage,
});

const POPPINS = { fontFamily: "Inter, sans-serif" } as const;

interface AutomationRow {
  id: string;
  name: string;
  trigger_type: string;
  message_template: string;
  is_active: boolean;
}

const TRIGGERS: { value: string; label: string }[] = [
  { value: "lesson_24h", label: "24 hours before lesson" },
  { value: "lesson_1h", label: "1 hour before lesson" },
  { value: "lesson_completed", label: "After lesson completed" },
  { value: "payment_overdue_7d", label: "When payment is overdue (7 days)" },
  { value: "birthday", label: "On pupil's birthday" },
  { value: "test_7d", label: "When test date is 7 days away" },
];

function triggerLabel(v: string) {
  return TRIGGERS.find((t) => t.value === v)?.label ?? v;
}

function AutomationsPage() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [rows, setRows] = useState<AutomationRow[]>([]);
  const [showSheet, setShowSheet] = useState(false);
  const [editing, setEditing] = useState<AutomationRow | null>(null);

  const [name, setName] = useState("");
  const [triggerType, setTriggerType] = useState(TRIGGERS[0].value);
  const [message, setMessage] = useState("");
  const [active, setActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sheetError, setSheetError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (data.user) setUserId(data.user.id);
    })();
  }, []);

  const fetchRows = async (uid: string) => {
    const { data, error } = await supabase
      .from("automations")
      .select("id, name, trigger_type, message_template, is_active")
      .eq("instructor_id", uid)
      .order("created_at", { ascending: false });
    if (error) console.error("[automations] fetch error", error);
    setRows((data ?? []) as unknown as AutomationRow[]);
  };

  useEffect(() => {
    if (!userId) return;
    fetchRows(userId);
  }, [userId]);

  const openAdd = () => {
    setEditing(null);
    setName("");
    setTriggerType(TRIGGERS[0].value);
    setMessage("");
    setActive(true);
    setSheetError(null);
    setShowSheet(true);
  };

  const openEdit = (r: AutomationRow) => {
    setEditing(r);
    setName(r.name);
    setTriggerType(r.trigger_type);
    setMessage(r.message_template);
    setActive(r.is_active);
    setSheetError(null);
    setShowSheet(true);
  };

  const save = async () => {
    if (!userId) return;
    if (!name.trim()) {
      setSheetError("Please enter a name.");
      return;
    }
    if (!message.trim()) {
      setSheetError("Please enter a message.");
      return;
    }
    setSaving(true);
    setSheetError(null);
    const payload = {
      name: name.trim(),
      trigger_type: triggerType,
      message_template: message.trim(),
      is_active: active,
    };
    const { error } = editing
      ? await supabase.from("automations").update(payload).eq("id", editing.id)
      : await supabase
          .from("automations")
          .insert({ ...payload, instructor_id: userId });
    setSaving(false);
    if (error) {
      console.error("[automations] save error", error);
      setSheetError(error.message);
      return;
    }
    setShowSheet(false);
    await fetchRows(userId);
  };

  const remove = async () => {
    if (!editing) return;
    const id = editing.id;
    setShowSheet(false);
    setRows((prev) => prev.filter((x) => x.id !== id));
    const { error } = await supabase.from("automations").delete().eq("id", id);
    if (error) {
      console.error("[automations] delete error", error);
      if (userId) await fetchRows(userId);
    }
  };

  const toggleActive = async (r: AutomationRow) => {
    const next = !r.is_active;
    setRows((prev) => prev.map((x) => (x.id === r.id ? { ...x, is_active: next } : x)));
    const { error } = await supabase
      .from("automations")
      .update({ is_active: next })
      .eq("id", r.id);
    if (error) {
      console.error("[automations] toggle error", error);
      setRows((prev) => prev.map((x) => (x.id === r.id ? { ...x, is_active: r.is_active } : x)));
    }
  };

  const insertVar = (v: string) => setMessage((m) => `${m}${v}`);

  return (
    <div className="min-h-screen bg-white pb-8" style={POPPINS}>
      {/* TOP BAR */}
      <div
        className="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] h-[52px] flex items-center px-3 z-50"
        style={{ background: "#0B1F3A" }}
      >
        <button
          type="button"
          onClick={() => navigate({ to: "/home" })}
          className="p-1"
          aria-label="Back"
        >
          <ChevronLeft size={24} color="#FFFFFF" />
        </button>
        <div className="absolute left-1/2 -translate-x-1/2 text-white text-[16px] font-semibold">
          Automations
        </div>
        <button
          type="button"
          onClick={openAdd}
          className="ml-auto p-1"
          aria-label="Add automation"
        >
          <Plus size={24} color="#FFFFFF" />
        </button>
      </div>

      <div className="pt-[52px]">
        <div className="mx-4 mt-4">
          {/* Info card */}
          <div
            style={{
              backgroundColor: "#EEF4FB",
              borderWidth: "0.5px",
              borderStyle: "solid",
              borderColor: "#1877D6",
              borderRadius: 12,
              padding: 16,
            }}
          >
            <div className="text-[13px]" style={{ color: "#0B1F3A" }}>
              Automations send messages to pupils automatically based on triggers. SMS
              requires Twilio integration.
            </div>
          </div>

          <SectionHeader>ACTIVE AUTOMATIONS</SectionHeader>

          {rows.length === 0 ? (
            <div
              className="flex flex-col items-center justify-center text-center py-12"
              style={{ gap: 10 }}
            >
              <div
                className="flex items-center justify-center rounded-full"
                style={{ width: 56, height: 56, backgroundColor: "#EEF4FB" }}
              >
                <Zap size={28} color="#1877D6" />
              </div>
              <div className="text-[14px] text-[#6B7280]">
                No automations set up yet
              </div>
            </div>
          ) : (
            <div className="flex flex-col" style={{ gap: 8 }}>
              {rows.map((r) => (
                <Card key={r.id} className="!py-3 !px-4">
                  <div className="flex items-center" style={{ gap: 12 }}>
                    {/* Toggle */}
                    <button
                      type="button"
                      onClick={() => toggleActive(r)}
                      aria-label={r.is_active ? "Turn off" : "Turn on"}
                      className="relative rounded-full transition-colors"
                      style={{
                        width: 36,
                        height: 20,
                        flexShrink: 0,
                        backgroundColor: r.is_active ? "#1877D6" : "#D1D5DB",
                      }}
                    >
                      <span
                        className="absolute top-[2px] rounded-full bg-white transition-all"
                        style={{
                          width: 16,
                          height: 16,
                          left: r.is_active ? 18 : 2,
                        }}
                      />
                    </button>

                    <div className="flex-1 min-w-0">
                      <div className="text-[14px] font-semibold text-[#0B1F3A] truncate">
                        {r.name}
                      </div>
                      <div className="text-[13px] text-[#6B7280] truncate">
                        {triggerLabel(r.trigger_type)}
                      </div>
                      <div
                        className="text-[12px] text-[#6B7280] truncate italic"
                        style={{ marginTop: 2 }}
                      >
                        {r.message_template}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => openEdit(r)}
                      aria-label="Edit"
                      className="flex items-center justify-center"
                      style={{ width: 32, height: 32, flexShrink: 0 }}
                    >
                      <Edit2 size={16} color="#6B7280" />
                    </button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ADD/EDIT SHEET */}
      {showSheet && (
        <div className="fixed inset-0 z-[60] flex flex-col justify-end">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setShowSheet(false)}
          />
          <div
            className="relative w-full max-w-[430px] mx-auto bg-white rounded-t-2xl px-4 pt-5 pb-8"
            style={{ animation: "slideUp 0.25s ease-out", maxHeight: "90vh", overflowY: "auto" }}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="text-[16px] font-semibold text-[#0B1F3A]">
                {editing ? "Edit automation" : "Add automation"}
              </div>
              <button
                type="button"
                onClick={() => setShowSheet(false)}
                className="text-[13px] text-[#6B7280]"
              >
                Cancel
              </button>
            </div>

            <div className="flex flex-col" style={{ gap: 12 }}>
              <Input
                label="Name"
                placeholder="e.g. Lesson reminder"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />

              <div className="w-full">
                <label
                  className="block mb-1 text-[12px] font-medium text-[#6B7280]"
                  style={POPPINS}
                >
                  Trigger
                </label>
                <select
                  value={triggerType}
                  onChange={(e) => setTriggerType(e.target.value)}
                  className="h-11 w-full rounded-lg px-3 text-[14px] text-[#0B1F3A] bg-white focus:border-[#1877D6] focus:outline-none"
                  style={{
                    fontFamily: "Inter, sans-serif",
                    borderWidth: "0.5px",
                    borderStyle: "solid",
                    borderColor: "#EEF2F7",
                  }}
                >
                  {TRIGGERS.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="w-full">
                <label
                  className="block mb-1 text-[12px] font-medium text-[#6B7280]"
                  style={POPPINS}
                >
                  Message
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={4}
                  placeholder="Hi [name], reminder of your lesson on [date] at [time]."
                  className="w-full rounded-lg px-3 py-2 text-[14px] text-[#0B1F3A] bg-white focus:border-[#1877D6] focus:outline-none"
                  style={{
                    fontFamily: "Inter, sans-serif",
                    borderWidth: "0.5px",
                    borderStyle: "solid",
                    borderColor: "#EEF2F7",
                    resize: "vertical",
                  }}
                />
                <div className="flex flex-wrap mt-2" style={{ gap: 6 }}>
                  {["[name]", "[date]", "[time]", "[amount]"].map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => insertVar(v)}
                      className="text-[11px] rounded-md px-2 py-1"
                      style={{
                        backgroundColor: "#EEF4FB",
                        color: "#1877D6",
                        fontFamily: "Inter, sans-serif",
                      }}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>

              <div
                className="flex items-center justify-between"
                style={{ marginTop: 4 }}
              >
                <span className="text-[14px] text-[#0B1F3A]">Active</span>
                <button
                  type="button"
                  onClick={() => setActive((a) => !a)}
                  aria-label={active ? "Set inactive" : "Set active"}
                  className="relative rounded-full transition-colors"
                  style={{
                    width: 44,
                    height: 24,
                    backgroundColor: active ? "#1877D6" : "#D1D5DB",
                  }}
                >
                  <span
                    className="absolute top-[2px] rounded-full bg-white transition-all"
                    style={{
                      width: 20,
                      height: 20,
                      left: active ? 22 : 2,
                    }}
                  />
                </button>
              </div>

              {sheetError && (
                <div className="text-[12px]" style={{ color: "#1877D6" }}>
                  {sheetError}
                </div>
              )}

              <Button onClick={save} disabled={saving || !userId}>
                {saving ? "Saving…" : editing ? "Update automation" : "Save automation"}
              </Button>

              {editing && (
                <button
                  type="button"
                  onClick={remove}
                  className="text-[13px] font-medium py-2"
                  style={{ color: "#1877D6" }}
                >
                  Delete automation
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
