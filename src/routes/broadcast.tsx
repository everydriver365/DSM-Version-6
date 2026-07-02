import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Users, MessageSquare, Mic, MicOff } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "../lib/supabaseClient";

export const Route = createFileRoute("/broadcast")({
  head: () => ({
    meta: [
      { title: "Broadcast — DSM by EveryDriver" },
      { name: "description", content: "Send a message to multiple pupils at once." },
    ],
  }),
  component: BroadcastPage,
});

const POPPINS = { fontFamily: "Inter, sans-serif" } as const;
const NAVY = "#0B1F3A";
const BORDER = "#EEF2F7";

type FilterKey = "all" | "week" | "outstanding" | "active" | "passed";
type SendMethod = "sms" | "email" | "both";

interface Pupil {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  status: string | null;
  prepaid_hours: number | null;
}

const TEMPLATES: { key: string; label: string; text: string }[] = [
  {
    key: "lesson",
    label: "Lesson reminder",
    text: "Hi {name}, just a reminder you have a driving lesson coming up. Please be ready at your usual pickup point. See you soon! {instructor_name}",
  },
  {
    key: "payment",
    label: "Payment reminder",
    text: "Hi {name}, just a friendly reminder that there is a payment outstanding for your driving lessons. Please let me know if you have any questions. {instructor_name}",
  },
  {
    key: "cancel",
    label: "Cancellation",
    text: "Hi {name}, unfortunately I need to cancel your upcoming lesson. I apologise for the inconvenience and will be in touch to rearrange. {instructor_name}",
  },
  {
    key: "holiday",
    label: "Holiday notice",
    text: "Hi {name}, I will be on holiday and unavailable for lessons from [DATE] to [DATE]. I'll be in touch to rearrange any affected lessons. {instructor_name}",
  },
  { key: "custom", label: "Custom", text: "" },
];

function pupilDisplayName(p: { name?: string | null; first_name?: string | null; last_name?: string | null }) {
  if (p.name && p.name.trim()) return p.name;
  return `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim() || "Unnamed";
}

function BroadcastPage() {
  const navigate = useNavigate();
  const [pupils, setPupils] = useState<Pupil[]>([]);
  const [filter, setFilter] = useState<FilterKey>("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState("");
  const [method, setMethod] = useState<SendMethod>("sms");
  const [instructorName, setInstructorName] = useState("");
  const [weekIds, setWeekIds] = useState<Set<string>>(new Set());
  const [owedIds, setOwedIds] = useState<Set<string>>(new Set());
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth?.user?.id;
      if (!uid) return;

      const { data: inst } = await supabase
        .from("instructors")
        .select("name, first_name, last_name")
        .eq("id", uid)
        .maybeSingle();
      if (inst) {
        const n = (inst as any).name || `${(inst as any).first_name ?? ""} ${(inst as any).last_name ?? ""}`.trim();
        setInstructorName(n || "Your instructor");
      } else {
        setInstructorName("Your instructor");
      }

      const { data: rows } = await supabase
        .from("pupils")
        .select("id, name, first_name, last_name, phone, email, status, prepaid_hours, deleted_at")
        .eq("instructor_id", uid)
        .is("deleted_at", null)
        .not("status", "in", '("inactive","cancelled","deleted")')
        .order("name", { ascending: true });
      const normalized: Pupil[] = ((rows ?? []) as any[]).map((p) => ({
        id: p.id,
        name: pupilDisplayName(p),
        phone: p.phone,
        email: p.email,
        status: p.status,
        prepaid_hours: p.prepaid_hours,
      }));
      setPupils(normalized);

      const ids = normalized.map((p) => p.id);
      if (ids.length === 0) return;

      // Lessons this week
      const now = new Date();
      const day = now.getDay();
      const monday = new Date(now);
      monday.setDate(now.getDate() - ((day + 6) % 7));
      monday.setHours(0, 0, 0, 0);
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      sunday.setHours(23, 59, 59, 999);
      const { data: lw } = await supabase
        .from("lessons")
        .select("pupil_id, lesson_date")
        .in("pupil_id", ids)
        .gte("lesson_date", monday.toISOString().slice(0, 10))
        .lte("lesson_date", sunday.toISOString().slice(0, 10))
        .is("deleted_at", null);
      setWeekIds(new Set(((lw ?? []) as any[]).map((r) => r.pupil_id)));

      // Outstanding balances
      const { data: lb } = await supabase
        .from("lessons")
        .select("pupil_id, amount_due, payment_status")
        .in("pupil_id", ids)
        .is("deleted_at", null);
      const owed = new Set<string>();
      ((lb ?? []) as any[]).forEach((r) => {
        if (r.payment_status !== "paid" && Number(r.amount_due) > 0) owed.add(r.pupil_id);
      });
      // exclude prepaid pupils from owed
      normalized.forEach((p) => {
        if ((p.prepaid_hours ?? 0) > 0) owed.delete(p.id);
      });
      setOwedIds(owed);
    })();
  }, []);

  const filteredPupils = useMemo(() => {
    return pupils.filter((p) => {
      if (filter === "active") return (p.status ?? "active").toLowerCase() !== "passed";
      if (filter === "passed") return (p.status ?? "").toLowerCase() === "passed";
      if (filter === "week") return weekIds.has(p.id);
      if (filter === "outstanding") return owedIds.has(p.id);
      return true;
    });
  }, [pupils, filter, weekIds, owedIds]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const allSelectedInList = filteredPupils.length > 0 && filteredPupils.every((p) => selected.has(p.id));
  const toggleAll = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allSelectedInList) filteredPupils.forEach((p) => next.delete(p.id));
      else filteredPupils.forEach((p) => next.add(p.id));
      return next;
    });
  };

  const charCount = message.length;
  const overLimit = charCount > 160;

  const startDictation = () => {
    const SR: any = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      toast.error("Speech recognition not supported on this device");
      return;
    }
    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }
    const r = new SR();
    r.continuous = true;
    r.interimResults = false;
    r.lang = "en-GB";
    r.onresult = (e: any) => {
      let txt = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        txt += e.results[i][0].transcript;
      }
      setMessage((m) => (m ? m + " " : "") + txt.trim());
    };
    r.onend = () => setListening(false);
    r.onerror = () => setListening(false);
    recognitionRef.current = r;
    r.start();
    setListening(true);
  };

  const personalize = (template: string, pupilName: string) =>
    template.replace(/\{name\}/g, pupilName.split(" ")[0] || pupilName).replace(/\{instructor_name\}/g, instructorName);

  const sendNow = async () => {
    const recipients = pupils.filter((p) => selected.has(p.id));
    if (recipients.length === 0 || !message.trim()) return;

    const sendSms = method === "sms" || method === "both";
    const sendEmail = method === "email" || method === "both";

    for (let i = 0; i < recipients.length; i++) {
      const p = recipients[i];
      const body = personalize(message, p.name);
      if (sendSms && p.phone) {
        const url = `sms:${p.phone}?body=${encodeURIComponent(body)}`;
        window.location.href = url;
        await new Promise((r) => setTimeout(r, 500));
      }
      if (sendEmail && p.email) {
        const url = `mailto:${p.email}?subject=${encodeURIComponent("Message from your driving instructor")}&body=${encodeURIComponent(body)}`;
        window.location.href = url;
        await new Promise((r) => setTimeout(r, 500));
      }
    }

    toast.success(`Messages sent to ${recipients.length} pupil${recipients.length === 1 ? "" : "s"}`);
    setTimeout(() => navigate({ to: "/home" }), 600);
  };

  const cardStyle = {
    borderWidth: "0.5px",
    borderStyle: "solid" as const,
    borderColor: BORDER,
    borderRadius: 12,
    padding: 16,
    backgroundColor: "#FFFFFF",
  };

  const filters: { k: FilterKey; label: string }[] = [
    { k: "all", label: "All pupils" },
    { k: "week", label: "Lessons this week" },
    { k: "outstanding", label: "Outstanding balance" },
    { k: "active", label: "Active only" },
    { k: "passed", label: "Passed pupils" },
  ];

  const selCount = selected.size;
  const canSend = selCount > 0 && message.trim().length > 0;

  return (
    <div className="min-h-screen bg-white pb-32" style={POPPINS}>
      {/* Top bar */}
      <div
        className="sticky top-0 z-40 flex items-center px-4"
        style={{ height: 52, backgroundColor: NAVY }}
      >
        <button
          type="button"
          onClick={() => navigate({ to: "/home" })}
          aria-label="Back"
          className="flex items-center justify-center"
          style={{ width: 32, height: 32 }}
        >
          <ArrowLeft size={20} color="#FFFFFF" />
        </button>
        <span className="ml-2 text-[15px] font-semibold text-white" style={POPPINS}>
          Broadcast message
        </span>
      </div>

      {/* SECTION 1 — Audience */}
      <div style={{ ...cardStyle, marginLeft: 16, marginRight: 16, marginTop: 16 }}>
        <div className="flex items-center gap-2 mb-3">
          <Users size={16} color={NAVY} />
          <h2 className="text-[14px] font-semibold" style={{ color: NAVY }}>Who to send to</h2>
        </div>

        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as FilterKey)}
          style={{
            width: "100%",
            fontSize: 13,
            padding: "10px 12px",
            borderRadius: 10,
            backgroundColor: "#F8F9FB",
            color: NAVY,
            borderWidth: "0.5px",
            borderStyle: "solid",
            borderColor: BORDER,
            appearance: "none",
            backgroundImage:
              "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236B7280' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><polyline points='6 9 12 15 18 9'/></svg>\")",
            backgroundRepeat: "no-repeat",
            backgroundPosition: "right 12px center",
            paddingRight: 32,
            ...POPPINS,
          }}
        >
          {filters.map((f) => (
            <option key={f.k} value={f.k}>{f.label}</option>
          ))}
        </select>



        <div className="flex items-center justify-between mt-3 mb-2">
          <button
            type="button"
            onClick={toggleAll}
            className="text-[12px] font-medium"
            style={{ color: "#1877D6", ...POPPINS }}
          >
            {allSelectedInList ? "Deselect all" : "Select all"}
          </button>
          <span className="text-[12px]" style={{ color: "#6B7280", ...POPPINS }}>
            {filteredPupils.length} shown
          </span>
        </div>

        <div className="overflow-y-auto" style={{ maxHeight: 240, borderTop: `0.5px solid ${BORDER}` }}>
          {filteredPupils.length === 0 ? (
            <p className="text-[13px] py-6 text-center" style={{ color: "#6B7280", ...POPPINS }}>
              No pupils match this filter
            </p>
          ) : (
            filteredPupils.map((p) => {
              const checked = selected.has(p.id);
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => toggle(p.id)}
                  className="w-full flex items-center gap-3 py-2.5"
                  style={{ borderBottom: `0.5px solid #F3F4F6` }}
                >
                  <span
                    className="flex items-center justify-center rounded"
                    style={{
                      width: 18,
                      height: 18,
                      borderWidth: "1.5px",
                      borderStyle: "solid",
                      borderColor: checked ? NAVY : "#9CA3AF",
                      backgroundColor: checked ? NAVY : "transparent",
                      color: "#FFFFFF",
                      fontSize: 12,
                      lineHeight: 1,
                    }}
                  >
                    {checked ? "✓" : ""}
                  </span>
                  <span className="flex-1 text-left text-[13px] font-medium" style={{ color: NAVY, ...POPPINS }}>
                    {p.name}
                  </span>
                  <span
                    className="text-[10px] px-2 py-0.5 rounded-full"
                    style={{
                      backgroundColor:
                        (p.status ?? "active").toLowerCase() === "passed"
                          ? "#DBEAFE"
                          : (p.status ?? "active").toLowerCase() === "active"
                          ? "#DCFCE7"
                          : "#F3F4F6",
                      color:
                        (p.status ?? "active").toLowerCase() === "passed"
                          ? "#1877D6"
                          : (p.status ?? "active").toLowerCase() === "active"
                          ? "#16A34A"
                          : "#6B7280",
                      ...POPPINS,
                    }}
                  >
                    {(p.status ?? "active").toLowerCase()}
                  </span>
                </button>
              );
            })
          )}
        </div>

        <p className="mt-3 text-[12px] font-medium" style={{ color: NAVY, ...POPPINS }}>
          {selCount} pupil{selCount === 1 ? "" : "s"} selected
        </p>
      </div>

      {/* SECTION 2 — Message */}
      <div style={{ ...cardStyle, marginLeft: 16, marginRight: 16, marginTop: 12 }}>
        <div className="flex items-center gap-2 mb-3">
          <MessageSquare size={16} color={NAVY} />
          <h2 className="text-[14px] font-semibold" style={{ color: NAVY }}>Message</h2>
        </div>

        <select
          onChange={(e) => {
            const t = TEMPLATES.find((x) => x.key === e.target.value);
            if (t) setMessage(t.text);
            e.target.selectedIndex = 0;
          }}
          defaultValue=""
          style={{
            width: "100%",
            fontSize: 13,
            padding: "10px 12px",
            borderRadius: 10,
            backgroundColor: "#F8F9FB",
            color: NAVY,
            borderWidth: "0.5px",
            borderStyle: "solid",
            borderColor: BORDER,
            appearance: "none",
            backgroundImage:
              "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236B7280' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><polyline points='6 9 12 15 18 9'/></svg>\")",
            backgroundRepeat: "no-repeat",
            backgroundPosition: "right 12px center",
            paddingRight: 32,
            marginBottom: 12,
            ...POPPINS,
          }}
        >
          <option value="" disabled>Choose a template…</option>
          {TEMPLATES.map((t) => (
            <option key={t.key} value={t.key}>{t.label}</option>
          ))}
        </select>


        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type your message…"
          className="w-full rounded-lg p-3 text-[13px] focus:outline-none focus:border-[#1877D6]"
          style={{
            minHeight: 120,
            borderWidth: "0.5px",
            borderStyle: "solid",
            borderColor: BORDER,
            color: NAVY,
            ...POPPINS,
          }}
        />

        <div className="flex items-center justify-between mt-2">
          <button
            type="button"
            onClick={startDictation}
            className="flex items-center gap-1.5 px-3 h-8 rounded-full text-[12px] font-medium"
            style={{
              backgroundColor: listening ? "#DC2626" : "#F8F9FB",
              color: listening ? "#FFFFFF" : NAVY,
              borderWidth: "0.5px",
              borderStyle: "solid",
              borderColor: listening ? "#DC2626" : BORDER,
              ...POPPINS,
            }}
          >
            {listening ? <MicOff size={14} /> : <Mic size={14} />}
            {listening ? "Stop" : "Dictate"}
          </button>
          <span
            className="text-[12px]"
            style={{ color: overLimit ? "#D97706" : "#6B7280", ...POPPINS }}
          >
            {charCount} characters
          </span>
        </div>
      </div>

      {/* SECTION 3 — Send method */}
      <div style={{ ...cardStyle, marginLeft: 16, marginRight: 16, marginTop: 12 }}>
        <h2 className="text-[14px] font-semibold mb-3" style={{ color: NAVY }}>Send via</h2>
        <div className="flex gap-2">
          {([
            { k: "sms", label: "SMS" },
            { k: "email", label: "Email" },
            { k: "both", label: "Both" },
          ] as { k: SendMethod; label: string }[]).map((o) => {
            const active = method === o.k;
            return (
              <button
                key={o.k}
                type="button"
                onClick={() => setMethod(o.k)}
                className="flex-1 h-10 rounded-lg text-[13px] font-medium"
                style={{
                  backgroundColor: active ? NAVY : "#F8F9FB",
                  color: active ? "#FFFFFF" : "#6B7280",
                  borderWidth: "0.5px",
                  borderStyle: "solid",
                  borderColor: active ? NAVY : BORDER,
                  ...POPPINS,
                }}
              >
                {o.label}
              </button>
            );
          })}
        </div>
        <p className="mt-3 text-[11px]" style={{ color: "#6B7280", ...POPPINS }}>
          SMS will open your phone's messaging app for each recipient.
        </p>
      </div>

      {/* Sticky send button */}
      <div
        className="fixed left-0 right-0 px-4"
        style={{
          bottom: 0,
          paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 12px)",
          paddingTop: 12,
          backgroundColor: "#FFFFFF",
          borderTop: `0.5px solid ${BORDER}`,
        }}
      >
        <button
          type="button"
          disabled={!canSend}
          onClick={sendNow}
          className="w-full rounded-lg text-[14px] font-semibold"
          style={{
            height: 52,
            backgroundColor: canSend ? NAVY : "#9CA3AF",
            color: "#FFFFFF",
            ...POPPINS,
          }}
        >
          Send to {selCount} pupil{selCount === 1 ? "" : "s"} →
        </button>
      </div>
    </div>
  );
}
