import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Search } from "lucide-react";
import { SectionHeader } from "../components/dsm/SectionHeader";
import { Button } from "../components/dsm/Button";
import { supabase } from "../lib/supabaseClient";

export const Route = createFileRoute("/reminder")({
  head: () => ({
    meta: [
      { title: "Send reminder — DSM by EveryDriver" },
      { name: "description", content: "Send SMS reminders to your pupils." },
    ],
  }),
  component: ReminderPage,
});

const POPPINS = { fontFamily: "Inter, sans-serif" } as const;

interface Pupil {
  id: string;
  name: string;
  phone: string | null;
}

const TEMPLATES: Record<string, { label: string; body: string }> = {
  lesson: {
    label: "Lesson reminder",
    body: "Hi [name], just a reminder you have a lesson tomorrow at [time]. See you then!",
  },
  payment: {
    label: "Payment reminder",
    body: "Hi [name], you have an outstanding balance of £[amount]. Please arrange payment at your earliest convenience.",
  },
  test: {
    label: "Test reminder",
    body: "Hi [name], your driving test is coming up on [date]. Make sure you get plenty of rest beforehand. Good luck!",
  },
};

function initials(name: string) {
  return name
    .split(/\s+/)
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function ReminderPage() {
  const navigate = useNavigate();
  const [pupils, setPupils] = useState<Pupil[]>([]);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState("");
  const [confirmation, setConfirmation] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from("pupils")
      .select("id, name, phone, status")
      .is("deleted_at", null)
      .order("name", { ascending: true })
      .then(({ data, error }) => {
        if (error) console.error("[reminder] fetch error", error);
        const rows = ((data ?? []) as (Pupil & { status: string | null })[]).filter(
          (p) => (p.status ?? "active").toLowerCase() === "active",
        );
        setPupils(rows);
      });
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return pupils;
    return pupils.filter((p) => p.name.toLowerCase().includes(q));
  }, [pupils, query]);

  const allVisibleSelected =
    filtered.length > 0 && filtered.every((p) => selected.has(p.id));

  function toggle(id: string) {
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected((s) => {
      const next = new Set(s);
      if (allVisibleSelected) filtered.forEach((p) => next.delete(p.id));
      else filtered.forEach((p) => next.add(p.id));
      return next;
    });
  }

  function send() {
    if (selected.size === 0 || !message.trim()) return;
    setConfirmation(
      `${selected.size} pupil${selected.size === 1 ? "" : "s"} will receive this message.`,
    );
  }

  return (
    <div className="min-h-screen bg-white pb-12" style={POPPINS}>
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
        <div className="text-white text-[15px] font-semibold">Send reminder</div>
        <div style={{ width: 40, height: 40 }} />
      </div>

      <div className="mx-4">
        <div className="flex items-center justify-between">
          <SectionHeader>SELECT PUPILS</SectionHeader>
          <button
            type="button"
            onClick={toggleAll}
            className="text-[12px] font-medium mt-4"
            style={{ color: "#1877D6" }}
          >
            {allVisibleSelected ? "Deselect all" : "Select all"}
          </button>
        </div>

        <div className="relative">
          <Search
            size={16}
            color="#6B7280"
            style={{ position: "absolute", left: 12, top: 14 }}
          />
          <input
            type="text"
            placeholder="Search pupils"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-11 w-full rounded-lg pl-9 pr-3 text-[14px] text-[#0B1F3A] bg-white focus:border-[#1877D6] focus:outline-none"
            style={{
              fontFamily: "Inter, sans-serif",
              borderWidth: "0.5px",
              borderStyle: "solid",
              borderColor: "#EEF2F7",
            }}
          />
        </div>

        <div className="mt-2 flex flex-col" style={{ gap: 8 }}>
          {filtered.length === 0 ? (
            <div className="text-[13px] text-[#6B7280] text-center py-6">
              No pupils found
            </div>
          ) : (
            filtered.map((p) => {
              const isSel = selected.has(p.id);
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => toggle(p.id)}
                  className="bg-white flex items-center text-left"
                  style={{
                    padding: 10,
                    borderRadius: 10,
                    gap: 10,
                    borderWidth: "0.5px",
                    borderStyle: "solid",
                    borderColor: isSel ? "#1877D6" : "#EEF2F7",
                  }}
                >
                  <span
                    className="flex items-center justify-center"
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: 4,
                      backgroundColor: isSel ? "#1877D6" : "#ffffff",
                      borderWidth: "0.5px",
                      borderStyle: "solid",
                      borderColor: isSel ? "#1877D6" : "#9CA3AF",
                      color: "#ffffff",
                      fontSize: 12,
                      lineHeight: 1,
                    }}
                  >
                    {isSel ? "✓" : ""}
                  </span>
                  <span
                    className="flex items-center justify-center text-white text-[12px] font-semibold"
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 999,
                      backgroundColor: "#1877D6",
                    }}
                  >
                    {initials(p.name)}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-[14px] text-[#0B1F3A] truncate">{p.name}</div>
                    <div className="text-[13px] text-[#6B7280] truncate">
                      {p.phone ?? "No phone"}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>

        <SectionHeader>MESSAGE</SectionHeader>
        <div className="flex" style={{ gap: 8, flexWrap: "wrap" }}>
          {Object.entries(TEMPLATES).map(([key, t]) => (
            <button
              key={key}
              type="button"
              onClick={() => setMessage(t.body)}
              className="text-[12px] font-medium"
              style={{
                padding: "8px 12px",
                borderRadius: 999,
                backgroundColor: "#F3F4F6",
                color: "#0B1F3A",
                borderWidth: "0.5px",
                borderStyle: "solid",
                borderColor: "#EEF2F7",
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        <textarea
          rows={5}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type your message..."
          className="mt-2 w-full rounded-lg p-3 text-[14px] text-[#0B1F3A] bg-white focus:border-[#1877D6] focus:outline-none resize-none"
          style={{
            fontFamily: "Inter, sans-serif",
            borderWidth: "0.5px",
            borderStyle: "solid",
            borderColor: "#EEF2F7",
          }}
        />
        <div className="mt-1 text-[12px] text-[#6B7280] text-right">
          {message.length} characters
        </div>

        <div className="mt-4">
          <Button
            onClick={send}
            disabled={selected.size === 0 || !message.trim()}
          >
            Send via SMS ({selected.size} {selected.size === 1 ? "pupil" : "pupils"})
          </Button>
        </div>

        {confirmation && (
          <div
            className="mt-3 text-[13px]"
            style={{
              padding: 12,
              borderRadius: 8,
              backgroundColor: "#ECFDF5",
              color: "#065F46",
            }}
          >
            {confirmation}
          </div>
        )}

        <div className="mt-3 text-[12px] text-[#6B7280] text-center">
          SMS sending requires Twilio integration. Messages will be queued.
        </div>
      </div>
    </div>
  );
}
