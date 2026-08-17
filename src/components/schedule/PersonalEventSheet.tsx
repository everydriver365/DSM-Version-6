import React, { useEffect, useMemo, useState } from "react";
import { IconX, IconTrash } from "@tabler/icons-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const navy = "#0B1F3A";
const blue = "#1877D6";
const red = "#CC2229";
const hairline = "#E4E8EF";
const subtle = "#6B7686";
const font = "Poppins, sans-serif";

export type PersonalEvent = {
  id: string;
  title: string | null;
  start_datetime: string;
  end_datetime: string;
  is_all_day?: boolean | null;
  location?: string | null;
  notes?: string | null;
  colour?: string | null;
  blocks_availability?: boolean | null;
  recurrence_group_id?: string | null;
};

const COLOURS = [
  { name: "Blue", value: "#1877D6" },
  { name: "Amber", value: "#E8B84B" },
  { name: "Green", value: "#2FA86A" },
  { name: "Purple", value: "#7C5CFC" },
  { name: "Red", value: "#CC2229" },
  { name: "Navy", value: "#0B1F3A" },
];

const REPEATS = [
  { label: "Does not repeat", value: "none" },
  { label: "Every day", value: "daily" },
  { label: "Every week", value: "weekly" },
  { label: "Every 2 weeks", value: "fortnightly" },
  { label: "Every month", value: "monthly" },
] as const;

type RepeatValue = (typeof REPEATS)[number]["value"];

const pad = (n: number) => String(n).padStart(2, "0");
const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const hhmm = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;

function addMinutes(date: string, time: string, mins: number) {
  const d = new Date(`${date}T${time}:00`);
  d.setMinutes(d.getMinutes() + mins);
  return { date: ymd(d), time: hhmm(d) };
}

const label: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 600,
  color: subtle,
  marginBottom: 6,
  display: "block",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  border: `1px solid ${hairline}`,
  borderRadius: 12,
  padding: "11px 12px",
  fontSize: 15,
  fontFamily: font,
  color: navy,
  background: "#fff",
  outline: "none",
};

export function PersonalEventSheet({
  open,
  defaultDate,
  event,
  onClose,
  onSaved,
}: {
  open: boolean;
  defaultDate?: string;
  event?: PersonalEvent | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState("");
  const [allDay, setAllDay] = useState(false);
  const [date, setDate] = useState(defaultDate ?? ymd(new Date()));
  const [startTime, setStartTime] = useState("09:00");
  const [endDate, setEndDate] = useState(defaultDate ?? ymd(new Date()));
  const [endTime, setEndTime] = useState("10:00");
  const [repeat, setRepeat] = useState<RepeatValue>("none");
  const [repeatUntil, setRepeatUntil] = useState("");
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");
  const [colour, setColour] = useState(COLOURS[1].value);
  const [busy, setBusy] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const editing = !!event;

  useEffect(() => {
    if (!open) return;
    setError(null);
    setSaving(false);
    if (event) {
      const s = new Date(event.start_datetime);
      const e = new Date(event.end_datetime);
      setTitle(event.title ?? "");
      setAllDay(!!event.is_all_day);
      setDate(ymd(s));
      setStartTime(hhmm(s));
      setEndDate(ymd(e));
      setEndTime(hhmm(e));
      setLocation(event.location ?? "");
      setNotes(event.notes ?? "");
      setColour(event.colour ?? COLOURS[1].value);
      setBusy(event.blocks_availability !== false);
      setRepeat("none");
      setRepeatUntil("");
    } else {
      const base = defaultDate ?? ymd(new Date());
      const now = new Date();
      const start = `${pad(now.getHours())}:00`;
      setTitle("");
      setAllDay(false);
      setDate(base);
      setStartTime(start);
      setEndDate(base);
      setEndTime(addMinutes(base, start, 60).time);
      setLocation("");
      setNotes("");
      setColour(COLOURS[1].value);
      setBusy(true);
      setRepeat("none");
      setRepeatUntil("");
    }
  }, [open, event, defaultDate]);

  // Keep the end after the start, the way Google shifts it for you.
  useEffect(() => {
    if (allDay) return;
    const s = new Date(`${date}T${startTime}:00`);
    const e = new Date(`${endDate}T${endTime}:00`);
    if (!(e > s)) {
      const nudged = addMinutes(date, startTime, 60);
      setEndDate(nudged.date);
      setEndTime(nudged.time);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, startTime, allDay]);

  const occurrences = useMemo(() => {
    if (repeat === "none" || !repeatUntil) return [date];
    const out: string[] = [];
    const until = new Date(`${repeatUntil}T00:00:00`);
    let cur = new Date(`${date}T00:00:00`);
    while (cur <= until && out.length < 200) {
      out.push(ymd(cur));
      const next = new Date(cur);
      if (repeat === "daily") next.setDate(next.getDate() + 1);
      else if (repeat === "weekly") next.setDate(next.getDate() + 7);
      else if (repeat === "fortnightly") next.setDate(next.getDate() + 14);
      else next.setMonth(next.getMonth() + 1);
      cur = next;
    }
    return out;
  }, [repeat, repeatUntil, date]);

  if (!open) return null;

  async function handleSave() {
    if (!title.trim()) {
      setError("Give your event a name");
      return;
    }
    setSaving(true);
    setError(null);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setError("You must be signed in");
      setSaving(false);
      return;
    }

    const dayOffset =
      (new Date(`${endDate}T00:00:00`).getTime() - new Date(`${date}T00:00:00`).getTime()) /
      86400000;

    const rowFor = (d: string) => {
      const endD = new Date(`${d}T00:00:00`);
      endD.setDate(endD.getDate() + Math.max(0, Math.round(dayOffset)));
      const start = allDay ? `${d}T00:00:00` : `${d}T${startTime}:00`;
      const end = allDay ? `${ymd(endD)}T23:59:00` : `${ymd(endD)}T${endTime}:00`;
      return {
        instructor_id: user.id,
        title: title.trim(),
        start_datetime: new Date(start).toISOString(),
        end_datetime: new Date(end).toISOString(),
        source: "personal",
        is_all_day: allDay,
        location: location.trim() || null,
        notes: notes.trim() || null,
        colour,
        blocks_availability: busy,
      };
    };

    if (editing && event) {
      const { error: updErr } = await supabase
        .from("calendar_blocks")
        .update(rowFor(date))
        .eq("id", event.id);
      if (updErr) {
        setError(updErr.message);
        setSaving(false);
        return;
      }
      toast.success("Event updated");
    } else {
      const groupId =
        occurrences.length > 1 && typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : null;
      const rows = occurrences.map((d) => ({
        ...rowFor(d),
        ...(groupId ? { recurrence_group_id: groupId } : {}),
      }));
      const { error: insErr } = await supabase.from("calendar_blocks").insert(rows);
      if (insErr) {
        setError(insErr.message);
        setSaving(false);
        return;
      }
      toast.success(rows.length > 1 ? `${rows.length} events added` : "Event added");
    }
    setSaving(false);
    onSaved();
    onClose();
  }

  async function handleDelete() {
    if (!event) return;
    setSaving(true);
    const { error: delErr } = await supabase
      .from("calendar_blocks")
      .delete()
      .eq("id", event.id);
    setSaving(false);
    if (delErr) {
      setError(delErr.message);
      return;
    }
    toast.success("Event deleted");
    onSaved();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ fontFamily: font }}>
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div
        className="relative w-full max-w-md"
        style={{
          background: "#fff",
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          maxHeight: "calc(100vh - 90px)",
          overflowY: "auto",
          paddingBottom: "calc(16px + 90px + env(safe-area-inset-bottom))",
        }}
      >
        {/* Header */}
        <div
          style={{
            position: "sticky",
            top: 0,
            background: "#fff",
            padding: "16px 16px 12px",
            borderBottom: `1px solid ${hairline}`,
            display: "flex",
            alignItems: "center",
            gap: 10,
            zIndex: 2,
          }}
        >
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 17, fontWeight: 700, color: navy, fontFamily: "Sora, sans-serif" }}>
              {editing ? "Edit private event" : "New private event"}
            </div>
            <div style={{ fontSize: 12, color: subtle }}>Only visible to you</div>
          </div>
          {editing && (
            <button
              type="button"
              onClick={handleDelete}
              aria-label="Delete event"
              style={{
                width: 34,
                height: 34,
                borderRadius: 17,
                background: "#FDECEC",
                border: "none",
                display: "grid",
                placeItems: "center",
              }}
            >
              <IconTrash size={17} color={red} stroke={1.7} />
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{
              width: 34,
              height: 34,
              borderRadius: 17,
              background: "#EEF2F7",
              border: "none",
              display: "grid",
              placeItems: "center",
            }}
          >
            <IconX size={17} color={navy} stroke={1.7} />
          </button>
        </div>

        <div style={{ padding: 16, display: "grid", gap: 14 }}>
          <div>
            <label style={label} htmlFor="pe-title">
              Event name
            </label>
            <input
              id="pe-title"
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Dentist, Car service, Family time"
              style={inputStyle}
            />
          </div>

          {/* All day */}
          <button
            type="button"
            onClick={() => setAllDay((v) => !v)}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              border: `1px solid ${hairline}`,
              borderRadius: 12,
              padding: "10px 12px",
              background: "#fff",
            }}
          >
            <span style={{ fontSize: 14, fontWeight: 600, color: navy }}>All day</span>
            <span
              style={{
                width: 44,
                height: 26,
                borderRadius: 13,
                background: allDay ? blue : "#D6DDE7",
                position: "relative",
                transition: "background 150ms",
              }}
            >
              <span
                style={{
                  position: "absolute",
                  top: 3,
                  left: allDay ? 21 : 3,
                  width: 20,
                  height: 20,
                  borderRadius: 10,
                  background: "#fff",
                  transition: "left 150ms",
                }}
              />
            </span>
          </button>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div>
              <label style={label} htmlFor="pe-date">
                Starts
              </label>
              <input
                id="pe-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={label} htmlFor="pe-start-time">
                {allDay ? " " : "Start time"}
              </label>
              {allDay ? (
                <div style={{ ...inputStyle, color: subtle }}>All day</div>
              ) : (
                <input
                  id="pe-start-time"
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  style={inputStyle}
                />
              )}
            </div>
            <div>
              <label style={label} htmlFor="pe-end-date">
                Ends
              </label>
              <input
                id="pe-end-date"
                type="date"
                value={endDate}
                min={date}
                onChange={(e) => setEndDate(e.target.value)}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={label} htmlFor="pe-end-time">
                {allDay ? " " : "End time"}
              </label>
              {allDay ? (
                <div style={{ ...inputStyle, color: subtle }}>All day</div>
              ) : (
                <input
                  id="pe-end-time"
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  style={inputStyle}
                />
              )}
            </div>
          </div>

          {!editing && (
            <div>
              <label style={label} htmlFor="pe-repeat">
                Repeat
              </label>
              <select
                id="pe-repeat"
                value={repeat}
                onChange={(e) => setRepeat(e.target.value as RepeatValue)}
                style={inputStyle}
              >
                {REPEATS.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
              {repeat !== "none" && (
                <div style={{ marginTop: 10 }}>
                  <label style={label} htmlFor="pe-repeat-until">
                    Repeat until
                  </label>
                  <input
                    id="pe-repeat-until"
                    type="date"
                    value={repeatUntil}
                    min={date}
                    onChange={(e) => setRepeatUntil(e.target.value)}
                    style={inputStyle}
                  />
                  <div style={{ fontSize: 11, color: subtle, marginTop: 6 }}>
                    {repeatUntil
                      ? `${occurrences.length} event${occurrences.length === 1 ? "" : "s"} will be created`
                      : "Choose an end date to create the series"}
                  </div>
                </div>
              )}
            </div>
          )}

          <div>
            <label style={label} htmlFor="pe-location">
              Location (optional)
            </label>
            <input
              id="pe-location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Add a place"
              style={inputStyle}
            />
          </div>

          <div>
            <label style={label} htmlFor="pe-notes">
              Description (optional)
            </label>
            <textarea
              id="pe-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Add notes"
              style={{ ...inputStyle, resize: "vertical" }}
            />
          </div>

          <div>
            <span style={label}>Colour</span>
            <div style={{ display: "flex", gap: 10 }}>
              {COLOURS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  aria-label={c.name}
                  onClick={() => setColour(c.value)}
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: 15,
                    background: c.value,
                    border: colour === c.value ? `3px solid ${navy}` : "2px solid #fff",
                    boxShadow: "0 1px 3px rgba(11,31,58,0.18)",
                  }}
                />
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={() => setBusy((v) => !v)}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              border: `1px solid ${hairline}`,
              borderRadius: 12,
              padding: "10px 12px",
              background: "#fff",
              textAlign: "left",
            }}
          >
            <span>
              <span style={{ display: "block", fontSize: 14, fontWeight: 600, color: navy }}>
                Show as busy
              </span>
              <span style={{ fontSize: 11, color: subtle }}>
                Blocks this time from free-slot suggestions
              </span>
            </span>
            <span
              style={{
                width: 44,
                height: 26,
                borderRadius: 13,
                background: busy ? blue : "#D6DDE7",
                position: "relative",
                flexShrink: 0,
              }}
            >
              <span
                style={{
                  position: "absolute",
                  top: 3,
                  left: busy ? 21 : 3,
                  width: 20,
                  height: 20,
                  borderRadius: 10,
                  background: "#fff",
                  transition: "left 150ms",
                }}
              />
            </span>
          </button>

          {error && (
            <div style={{ fontSize: 13, color: red, fontWeight: 600 }}>{error}</div>
          )}

          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            style={{
              width: "100%",
              padding: "13px 16px",
              borderRadius: 20,
              border: "none",
              background: saving ? "#8FB6E4" : blue,
              color: "#fff",
              fontSize: 15,
              fontWeight: 700,
              fontFamily: font,
            }}
          >
            {saving ? "Saving…" : editing ? "Save changes" : "Add event"}
          </button>
        </div>
      </div>
    </div>
  );
}
