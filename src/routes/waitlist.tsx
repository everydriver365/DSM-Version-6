import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Plus, X, Clock, Send, Check, XCircle } from "lucide-react";
import { supabase } from "../lib/supabaseClient";

export const Route = createFileRoute("/waitlist")({
  head: () => ({
    meta: [
      { title: "Waiting List — DSM by EveryDriver" },
      { name: "description", content: "Manage your lesson waiting list and slot offers." },
    ],
  }),
  component: WaitlistPage,
});

const POPPINS = { fontFamily: "Inter, sans-serif" } as const;
const NAVY = "#0A2540";
const BLUE = "#0B7DDA";
const RED = "#CC2229";
const GREEN = "#16A34A";
const AMBER = "#D97706";
const GREY = "#6B7280";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const TIME_WINDOWS = ["Mornings", "Afternoons", "Evenings", "Weekends", "Anytime"];

interface PupilLite {
  id: string;
  name: string;
}

interface WaitlistRow {
  id: string;
  pupil_id: string;
  preferred_days: string[] | null;
  preferred_times: string | null;
  notes: string | null;
  status: string | null;
  created_at: string;
  pupil_name?: string;
}

interface OfferRow {
  id: string;
  pupil_id: string;
  offered_date: string;
  offered_time: string;
  duration_minutes: number | null;
  pupil_response: string | null;
  queue_position: number | null;
  expires_at: string | null;
  created_at: string;
  pupil_name?: string;
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase() || "?";
}

function WaitlistPage() {
  const [tab, setTab] = useState<"waiting" | "offers">("waiting");
  const [uid, setUid] = useState<string | null>(null);
  const [pupils, setPupils] = useState<PupilLite[]>([]);
  const [waiting, setWaiting] = useState<WaitlistRow[] | null>(null);
  const [offers, setOffers] = useState<OfferRow[] | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [offerOpen, setOfferOpen] = useState<WaitlistRow | null>(null);

  const pupilName = useMemo(() => {
    const m: Record<string, string> = {};
    pupils.forEach((p) => (m[p.id] = p.name));
    return m;
  }, [pupils]);

  const load = async () => {
    const { data: auth } = await supabase.auth.getUser();
    const id = auth?.user?.id ?? null;
    setUid(id);
    if (!id) return;

    const { data: pupilRows } = await supabase
      .from("pupils")
      .select("id, name, first_name, last_name")
      .eq("instructor_id", id)
      .is("deleted_at", null)
      .order("name", { ascending: true });
    const pl: PupilLite[] = (pupilRows ?? []).map((p: any) => ({
      id: p.id,
      name: p.name?.trim() || `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim() || "Unnamed",
    }));
    setPupils(pl);
    const nameMap: Record<string, string> = {};
    pl.forEach((p) => (nameMap[p.id] = p.name));

    const { data: wRows } = await supabase
      .from("lesson_waitlist")
      .select("*")
      .eq("instructor_id", id)
      .order("created_at", { ascending: true });
    setWaiting(((wRows ?? []) as WaitlistRow[]).map((r) => ({ ...r, pupil_name: nameMap[r.pupil_id] })));

    const { data: oRows } = await supabase
      .from("slot_offers")
      .select("*")
      .eq("instructor_id", id)
      .order("created_at", { ascending: false });
    setOffers(((oRows ?? []) as OfferRow[]).map((r) => ({ ...r, pupil_name: nameMap[r.pupil_id] })));
  };

  useEffect(() => {
    load();
  }, []);

  const removeWaiting = async (id: string) => {
    if (!confirm("Remove from waiting list?")) return;
    await supabase.from("lesson_waitlist").delete().eq("id", id);
    load();
  };

  const cancelOffer = async (id: string) => {
    await supabase.from("slot_offers").update({ pupil_response: "cancelled" }).eq("id", id);
    load();
  };

  return (
    <div className="min-h-screen pb-24 pb-safe" style={{ ...POPPINS, backgroundColor: "#F7F5EF" }}>
      {/* Header */}
      <div
        className="sticky top-0 z-30 flex items-center"
        style={{
          backgroundColor: NAVY,
          paddingTop: "calc(12px + env(safe-area-inset-top, 0px))",
          paddingBottom: 12,
          paddingLeft: 12,
          paddingRight: 12,
          gap: 8,
        }}
      >
        <Link to="/home" className="p-1 -ml-1">
          <ArrowLeft size={22} color="#FFFFFF" />
        </Link>
        <div className="text-[16px] font-semibold text-white" style={POPPINS}>
          Waiting List
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-white border-b border-[#E5E7EB]">
        {(["waiting", "offers"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="flex-1 py-3 text-[13px] font-semibold"
            style={{
              ...POPPINS,
              color: tab === t ? BLUE : GREY,
              borderBottom: tab === t ? `2px solid ${BLUE}` : "2px solid transparent",
            }}
          >
            {t === "waiting"
              ? `Waiting (${waiting?.length ?? 0})`
              : `Offers (${offers?.filter((o) => o.pupil_response === "pending").length ?? 0})`}
          </button>
        ))}
      </div>

      {/* Content */}
      {tab === "waiting" ? (
        <div>
          {waiting === null ? (
            <div className="p-8 text-center text-[13px]" style={{ color: GREY, ...POPPINS }}>
              Loading…
            </div>
          ) : waiting.length === 0 ? (
            <div className="p-10 text-center" style={POPPINS}>
              <Clock size={36} color="#9CA3AF" style={{ margin: "0 auto 12px" }} />
              <div className="text-[14px] font-semibold text-[#0A2540]">No pupils waiting</div>
              <div className="text-[12px] mt-1" style={{ color: GREY }}>
                Tap + to add a pupil to the waiting list.
              </div>
            </div>
          ) : (
            <div className="flex flex-col">
              {waiting.map((w, idx) => (
                <div key={w.id} className="bg-white">
                  <div className="flex items-stretch" style={{ gap: 12, padding: "12px 16px" }}>
                    <div
                      className="flex items-center justify-center rounded-full shrink-0 text-[13px] font-semibold self-center"
                      style={{ width: 40, height: 40, backgroundColor: BLUE, color: "#FFF", ...POPPINS }}
                    >
                      {initials(w.pupil_name || "?")}
                    </div>
                    <div className="min-w-0 flex-1 flex flex-col justify-center">
                      <div className="text-[14px] font-semibold text-[#0A2540] truncate" style={POPPINS}>
                        {w.pupil_name || "Unknown pupil"}
                      </div>
                      <div className="text-[12px] mt-0.5" style={{ color: GREY, ...POPPINS }}>
                        {(w.preferred_days ?? []).join(", ") || "Any day"}
                        {w.preferred_times ? ` · ${w.preferred_times}` : ""}
                      </div>
                      {w.notes && (
                        <div className="text-[12px] mt-0.5 truncate" style={{ color: "#374151", ...POPPINS }}>
                          {w.notes}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0 self-center">
                      <button
                        onClick={() => setOfferOpen(w)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-md text-[12px] font-semibold text-white"
                        style={{ backgroundColor: BLUE, ...POPPINS }}
                      >
                        <Send size={12} /> Offer
                      </button>
                      <button
                        onClick={() => removeWaiting(w.id)}
                        className="text-[11px]"
                        style={{ color: RED, ...POPPINS }}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                  {idx < waiting.length - 1 && (
                    <div style={{ height: 0.5, backgroundColor: "#F3F4F6", marginLeft: 68 }} />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div>
          {offers === null ? (
            <div className="p-8 text-center text-[13px]" style={{ color: GREY, ...POPPINS }}>
              Loading…
            </div>
          ) : offers.length === 0 ? (
            <div className="p-10 text-center" style={POPPINS}>
              <Send size={36} color="#9CA3AF" style={{ margin: "0 auto 12px" }} />
              <div className="text-[14px] font-semibold text-[#0A2540]">No slot offers yet</div>
              <div className="text-[12px] mt-1" style={{ color: GREY }}>
                Offer a slot to someone on the waiting list.
              </div>
            </div>
          ) : (
            <div className="flex flex-col">
              {offers.map((o, idx) => {
                const resp = (o.pupil_response || "pending").toLowerCase();
                const color =
                  resp === "accepted" ? GREEN : resp === "declined" || resp === "cancelled" ? RED : AMBER;
                return (
                  <div key={o.id} className="bg-white">
                    <div className="flex items-stretch" style={{ gap: 12, padding: "12px 16px" }}>
                      <div
                        className="shrink-0"
                        style={{ width: 3, borderRadius: 2, backgroundColor: color, alignSelf: "stretch" }}
                      />
                      <div className="min-w-0 flex-1 flex flex-col justify-center">
                        <div className="text-[14px] font-semibold text-[#0A2540] truncate" style={POPPINS}>
                          {o.pupil_name || "Unknown pupil"}
                        </div>
                        <div className="text-[12px] mt-0.5" style={{ color: "#374151", ...POPPINS }}>
                          {new Date(o.offered_date + "T00:00:00").toLocaleDateString("en-GB", {
                            weekday: "short",
                            day: "numeric",
                            month: "short",
                          })}{" "}
                          · {o.offered_time?.slice(0, 5)} · {o.duration_minutes ?? 60} min
                        </div>
                        <div
                          className="text-[11px] font-semibold mt-0.5 uppercase tracking-wide"
                          style={{ color, ...POPPINS }}
                        >
                          {resp}
                        </div>
                      </div>
                      {resp === "pending" && (
                        <button
                          onClick={() => cancelOffer(o.id)}
                          className="self-center text-[11px] px-2 py-1"
                          style={{ color: RED, ...POPPINS }}
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                    {idx < offers.length - 1 && (
                      <div style={{ height: 0.5, backgroundColor: "#F3F4F6", marginLeft: 16 }} />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* FAB */}
      {tab === "waiting" && (
        <button
          onClick={() => setAddOpen(true)}
          className="fixed flex items-center justify-center rounded-full shadow-lg"
          style={{
            bottom: "calc(96px + env(safe-area-inset-bottom, 0px))",
            right: 20,
            width: 56,
            height: 56,
            backgroundColor: RED,
            zIndex: 40,
          }}
          aria-label="Add to waiting list"
        >
          <Plus size={26} color="#FFFFFF" />
        </button>
      )}

      {addOpen && uid && (
        <AddWaitlistModal
          uid={uid}
          pupils={pupils}
          existingIds={new Set((waiting ?? []).map((w) => w.pupil_id))}
          onClose={() => setAddOpen(false)}
          onSaved={() => {
            setAddOpen(false);
            load();
          }}
        />
      )}

      {offerOpen && uid && (
        <OfferSlotModal
          uid={uid}
          waitlistRow={offerOpen}
          pupilName={pupilName[offerOpen.pupil_id] || "Pupil"}
          onClose={() => setOfferOpen(null)}
          onSaved={() => {
            setOfferOpen(null);
            setTab("offers");
            load();
          }}
        />
      )}
    </div>
  );
}

function AddWaitlistModal({
  uid,
  pupils,
  existingIds,
  onClose,
  onSaved,
}: {
  uid: string;
  pupils: PupilLite[];
  existingIds: Set<string>;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [pupilId, setPupilId] = useState("");
  const [days, setDays] = useState<string[]>([]);
  const [times, setTimes] = useState<string>("Anytime");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return pupils
      .filter((p) => !existingIds.has(p.id))
      .filter((p) => !q || p.name.toLowerCase().includes(q));
  }, [pupils, existingIds, query]);

  const toggleDay = (d: string) => {
    setDays((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]));
  };

  const save = async () => {
    if (!pupilId) return;
    setSaving(true);
    const { error } = await supabase.from("lesson_waitlist").insert({
      instructor_id: uid,
      pupil_id: pupilId,
      preferred_days: days.length ? days : null,
      preferred_times: times || null,
      notes: notes.trim() || null,
      status: "waiting",
    });
    setSaving(false);
    if (error) {
      alert(error.message);
      return;
    }
    onSaved();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      style={{ backgroundColor: "rgba(15,32,68,0.55)" }}
    >
      <div
        className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl overflow-hidden flex flex-col"
        style={{ maxHeight: "90vh" }}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#E5E7EB]">
          <div className="text-[15px] font-semibold text-[#0A2540]" style={POPPINS}>
            Add to waiting list
          </div>
          <button onClick={onClose} className="p-1">
            <X size={20} color={GREY} />
          </button>
        </div>

        <div className="overflow-y-auto p-4 flex-1">
          <label className="block text-[12px] font-semibold mb-1" style={{ color: GREY, ...POPPINS }}>
            Pupil
          </label>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search pupils…"
            className="w-full mb-2 px-3 py-2 border border-[#E5E7EB] rounded-md text-[14px]"
            style={POPPINS}
          />
          <div
            className="border border-[#E5E7EB] rounded-md mb-3 overflow-y-auto"
            style={{ maxHeight: 160 }}
          >
            {filtered.length === 0 ? (
              <div className="p-3 text-[12px]" style={{ color: GREY, ...POPPINS }}>
                No pupils available.
              </div>
            ) : (
              filtered.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setPupilId(p.id)}
                  className="w-full text-left px-3 py-2 text-[13px] border-b border-[#F3F4F6] last:border-b-0"
                  style={{
                    ...POPPINS,
                    backgroundColor: pupilId === p.id ? "#EEF4FB" : "transparent",
                    color: pupilId === p.id ? BLUE : "#0A2540",
                    fontWeight: pupilId === p.id ? 600 : 400,
                  }}
                >
                  {p.name}
                </button>
              ))
            )}
          </div>

          <label className="block text-[12px] font-semibold mb-1" style={{ color: GREY, ...POPPINS }}>
            Preferred days
          </label>
          <div className="flex flex-wrap gap-1.5 mb-3">
            {DAYS.map((d) => {
              const on = days.includes(d);
              return (
                <button
                  key={d}
                  onClick={() => toggleDay(d)}
                  className="px-2.5 py-1 rounded-full text-[12px] font-medium"
                  style={{
                    ...POPPINS,
                    backgroundColor: on ? BLUE : "#F3F4F6",
                    color: on ? "#FFF" : "#374151",
                  }}
                >
                  {d}
                </button>
              );
            })}
          </div>

          <label className="block text-[12px] font-semibold mb-1" style={{ color: GREY, ...POPPINS }}>
            Preferred times
          </label>
          <div className="flex flex-wrap gap-1.5 mb-3">
            {TIME_WINDOWS.map((t) => {
              const on = times === t;
              return (
                <button
                  key={t}
                  onClick={() => setTimes(t)}
                  className="px-2.5 py-1 rounded-full text-[12px] font-medium"
                  style={{
                    ...POPPINS,
                    backgroundColor: on ? BLUE : "#F3F4F6",
                    color: on ? "#FFF" : "#374151",
                  }}
                >
                  {t}
                </button>
              );
            })}
          </div>

          <label className="block text-[12px] font-semibold mb-1" style={{ color: GREY, ...POPPINS }}>
            Notes
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Any extra info…"
            className="w-full px-3 py-2 border border-[#E5E7EB] rounded-md text-[14px]"
            style={POPPINS}
          />
        </div>

        <div className="border-t border-[#E5E7EB] p-3 flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-md text-[14px] font-semibold"
            style={{ backgroundColor: "#F3F4F6", color: "#374151", ...POPPINS }}
          >
            Cancel
          </button>
          <button
            onClick={save}
            disabled={!pupilId || saving}
            className="flex-1 py-2.5 rounded-md text-[14px] font-semibold text-white disabled:opacity-50"
            style={{ backgroundColor: BLUE, ...POPPINS }}
          >
            {saving ? "Saving…" : "Add"}
          </button>
        </div>
      </div>
    </div>
  );
}

function OfferSlotModal({
  uid,
  waitlistRow,
  pupilName,
  onClose,
  onSaved,
}: {
  uid: string;
  waitlistRow: WaitlistRow;
  pupilName: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(today);
  const [time, setTime] = useState("10:00");
  const [duration, setDuration] = useState(60);
  const [expiresHours, setExpiresHours] = useState(24);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    const expiresAt = new Date(Date.now() + expiresHours * 3600 * 1000).toISOString();
    const { error } = await supabase.from("slot_offers").insert({
      instructor_id: uid,
      pupil_id: waitlistRow.pupil_id,
      offered_date: date,
      offered_time: time,
      duration_minutes: duration,
      pupil_response: "pending",
      queue_position: 0,
      expires_at: expiresAt,
    });
    setSaving(false);
    if (error) {
      alert(error.message);
      return;
    }
    onSaved();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      style={{ backgroundColor: "rgba(15,32,68,0.55)" }}
    >
      <div className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#E5E7EB]">
          <div className="text-[15px] font-semibold text-[#0A2540]" style={POPPINS}>
            Offer slot to {pupilName}
          </div>
          <button onClick={onClose} className="p-1">
            <X size={20} color={GREY} />
          </button>
        </div>

        <div className="p-4 space-y-3">
          <div>
            <label className="block text-[12px] font-semibold mb-1" style={{ color: GREY, ...POPPINS }}>
              Date
            </label>
            <input
              type="date"
              value={date}
              min={today}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 border border-[#E5E7EB] rounded-md text-[14px]"
              style={POPPINS}
            />
          </div>
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="block text-[12px] font-semibold mb-1" style={{ color: GREY, ...POPPINS }}>
                Time
              </label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full px-3 py-2 border border-[#E5E7EB] rounded-md text-[14px]"
                style={POPPINS}
              />
            </div>
            <div className="flex-1">
              <label className="block text-[12px] font-semibold mb-1" style={{ color: GREY, ...POPPINS }}>
                Duration
              </label>
              <select
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                className="w-full px-3 py-2 border border-[#E5E7EB] rounded-md text-[14px] bg-white"
                style={POPPINS}
              >
                {[60, 90, 120, 180].map((m) => (
                  <option key={m} value={m}>
                    {m} min
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-[12px] font-semibold mb-1" style={{ color: GREY, ...POPPINS }}>
              Offer expires in
            </label>
            <select
              value={expiresHours}
              onChange={(e) => setExpiresHours(Number(e.target.value))}
              className="w-full px-3 py-2 border border-[#E5E7EB] rounded-md text-[14px] bg-white"
              style={POPPINS}
            >
              {[2, 6, 12, 24, 48, 72].map((h) => (
                <option key={h} value={h}>
                  {h} hours
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="border-t border-[#E5E7EB] p-3 flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-md text-[14px] font-semibold"
            style={{ backgroundColor: "#F3F4F6", color: "#374151", ...POPPINS }}
          >
            Cancel
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="flex-1 py-2.5 rounded-md text-[14px] font-semibold text-white disabled:opacity-50"
            style={{ backgroundColor: BLUE, ...POPPINS }}
          >
            {saving ? "Sending…" : "Send offer"}
          </button>
        </div>
      </div>
    </div>
  );
}
