import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, X, Shield, Wrench, Circle, Receipt, Car } from "lucide-react";
import { toast } from "sonner";
import { Card } from "../components/dsm/Card";
import { SectionHeader } from "../components/dsm/SectionHeader";
import { Input } from "../components/dsm/Input";
import { Button } from "../components/dsm/Button";
import { supabase } from "../lib/supabaseClient";

export const Route = createFileRoute("/vehicle")({
  head: () => ({
    meta: [{ title: "Vehicle — DSM by EveryDriver" }],
  }),
  component: VehiclePage,
});

const POPPINS = { fontFamily: "Poppins, sans-serif" } as const;

type ReminderType = "MOT" | "Service" | "Tyres" | "Insurance" | "Tax";

const REMINDER_TYPES: ReminderType[] = ["MOT", "Service", "Tyres", "Insurance", "Tax"];

interface Vehicle {
  id?: string;
  make: string | null;
  model: string | null;
  year: number | null;
  registration: string | null;
  colour: string | null;
  fuel_type: string | null;
  transmission: string | null;
  mileage: number | null;
}

interface Reminder {
  id: string;
  reminder_type: string;
  due_date: string | null;
  notes: string | null;
}

const EMPTY_VEHICLE: Vehicle = {
  make: "",
  model: "",
  year: null,
  registration: "",
  colour: "",
  fuel_type: "",
  transmission: "",
  mileage: null,
};

function reminderStyle(type: string) {
  switch (type) {
    case "MOT":
      return { color: "#CC2229", Icon: Shield };
    case "Service":
      return { color: "#F59E0B", Icon: Wrench };
    case "Tyres":
      return { color: "#1A52A0", Icon: Circle };
    case "Insurance":
      return { color: "#16A34A", Icon: Shield };
    case "Tax":
      return { color: "#6B7280", Icon: Receipt };
    default:
      return { color: "#6B7280", Icon: Receipt };
  }
}

function daysUntil(ymd: string | null) {
  if (!ymd) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(`${ymd}T00:00:00`);
  return Math.round((target.getTime() - today.getTime()) / 86400000);
}

function dueColor(days: number | null) {
  if (days == null) return "#6B7280";
  if (days < 0) return "#CC2229";
  if (days <= 30) return "#F59E0B";
  return "#16A34A";
}

function formatDate(ymd: string | null) {
  if (!ymd) return "—";
  return new Date(`${ymd}T00:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function VehiclePage() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [vehicle, setVehicle] = useState<Vehicle>(EMPTY_VEHICLE);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [savingVehicle, setSavingVehicle] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<Reminder | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (data.user) setUserId(data.user.id);
    })();
  }, []);

  async function loadAll(uid: string) {
    const [{ data: v, error: vErr }, { data: r, error: rErr }] = await Promise.all([
      supabase
        .from("vehicles")
        .select("id, make, model, year, registration, colour, fuel_type, transmission, mileage")
        .eq("instructor_id", uid)
        .maybeSingle(),
      supabase
        .from("vehicle_reminders")
        .select("id, reminder_type, due_date, notes")
        .eq("instructor_id", uid)
        .order("due_date", { ascending: true }),
    ]);
    if (vErr) console.error("[vehicle] fetch error", vErr);
    if (rErr) console.error("[vehicle] reminders fetch error", rErr);
    setVehicle((v as Vehicle | null) ?? EMPTY_VEHICLE);
    setReminders((r ?? []) as Reminder[]);
  }

  useEffect(() => {
    if (userId) loadAll(userId);
  }, [userId]);

  async function saveVehicle() {
    if (!userId || savingVehicle) return;
    setSavingVehicle(true);
    const payload = {
      instructor_id: userId,
      make: vehicle.make || null,
      model: vehicle.model || null,
      year: vehicle.year ?? null,
      registration: vehicle.registration || null,
      colour: vehicle.colour || null,
      fuel_type: vehicle.fuel_type || null,
      transmission: vehicle.transmission || null,
      mileage: vehicle.mileage ?? null,
      updated_at: new Date().toISOString(),
    };
    const { error } = await supabase.from("vehicles").upsert(payload, { onConflict: "instructor_id" });
    setSavingVehicle(false);
    if (error) {
      console.error("[vehicle] upsert error", error);
      toast.error("Couldn't save vehicle");
      return;
    }
    toast.success("Vehicle saved");
  }

  const titleMake = [vehicle.make, vehicle.model].filter(Boolean).join(" ") || "Add your vehicle";

  return (
    <div className="min-h-screen bg-white pb-8" style={POPPINS}>
      <div
        className="sticky top-0 z-40 flex items-center justify-between px-2"
        style={{ height: 52, backgroundColor: "#0F2044" }}
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
        <div className="flex-1 text-center text-[15px] font-semibold text-white">Vehicle</div>
        <div style={{ width: 40, height: 40 }} />
      </div>

      {/* Hero card */}
      <div className="mx-4 mt-3" style={{ backgroundColor: "#0F2044", borderRadius: 12, padding: 16 }}>
        <div className="flex items-start justify-between" style={{ gap: 8 }}>
          <div className="text-white font-bold text-[18px] truncate">{titleMake}</div>
          <div className="text-white text-[14px] shrink-0">{vehicle.registration || "—"}</div>
        </div>
        <div className="text-[13px] mt-1" style={{ color: "#9CA3AF" }}>
          {vehicle.mileage != null ? `${vehicle.mileage.toLocaleString("en-GB")} miles` : "Mileage not set"}
        </div>
      </div>

      <div className="px-4">
        <SectionHeader>SERVICE REMINDERS</SectionHeader>
        {reminders.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center text-[13px]"
            style={{ color: "#6B7280", padding: "24px 0" }}
          >
            <Wrench size={24} color="#6B7280" />
            <div className="mt-2">No reminders yet</div>
          </div>
        ) : (
          <div className="flex flex-col" style={{ gap: 8 }}>
            {reminders.map((r) => {
              const { color, Icon } = reminderStyle(r.reminder_type);
              const days = daysUntil(r.due_date);
              const dCol = dueColor(days);
              const daysLabel =
                days == null
                  ? ""
                  : days < 0
                    ? `${Math.abs(days)} day${Math.abs(days) === 1 ? "" : "s"} overdue`
                    : days === 0
                      ? "Today"
                      : `${days} day${days === 1 ? "" : "s"} away`;
              return (
                <button key={r.id} type="button" onClick={() => setEditing(r)} className="text-left">
                  <Card>
                    <div className="flex items-center" style={{ gap: 12 }}>
                      <div
                        className="flex items-center justify-center shrink-0"
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: 999,
                          backgroundColor: `${color}14`,
                        }}
                      >
                        <Icon size={18} color={color} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[14px] font-semibold" style={{ color: "#0F2044" }}>
                          {r.reminder_type}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-[13px] font-semibold" style={{ color: dCol }}>
                          {formatDate(r.due_date)}
                        </div>
                        <div className="text-[12px]" style={{ color: "#6B7280" }}>
                          {daysLabel}
                        </div>
                      </div>
                    </div>
                  </Card>
                </button>
              );
            })}
          </div>
        )}

        <div className="mt-3">
          <Button variant="ghost" onClick={() => setAddOpen(true)} type="button">
            Add reminder
          </Button>
        </div>

        <SectionHeader>VEHICLE DETAILS</SectionHeader>
        <div className="flex flex-col" style={{ gap: 10 }}>
          <Input
            label="Make"
            value={vehicle.make ?? ""}
            onChange={(e) => setVehicle({ ...vehicle, make: e.target.value })}
            maxLength={40}
          />
          <Input
            label="Model"
            value={vehicle.model ?? ""}
            onChange={(e) => setVehicle({ ...vehicle, model: e.target.value })}
            maxLength={40}
          />
          <Input
            label="Year"
            type="number"
            inputMode="numeric"
            value={vehicle.year ?? ""}
            onChange={(e) => setVehicle({ ...vehicle, year: e.target.value ? parseInt(e.target.value, 10) : null })}
          />
          <Input
            label="Registration"
            value={vehicle.registration ?? ""}
            onChange={(e) => setVehicle({ ...vehicle, registration: e.target.value.toUpperCase() })}
            maxLength={10}
          />
          <Input
            label="Colour"
            value={vehicle.colour ?? ""}
            onChange={(e) => setVehicle({ ...vehicle, colour: e.target.value })}
            maxLength={30}
          />
          <div>
            <label className="block mb-1 text-[12px] font-medium text-[#6B7280]">Fuel type</label>
            <select
              value={vehicle.fuel_type ?? ""}
              onChange={(e) => setVehicle({ ...vehicle, fuel_type: e.target.value })}
              className="w-full px-3 bg-white"
              style={{ height: 44, borderRadius: 8, border: "0.5px solid #E2E6ED", color: "#1A1A2E", fontSize: 14, ...POPPINS }}
            >
              <option value="">Select…</option>
              <option>Petrol</option>
              <option>Diesel</option>
              <option>Hybrid</option>
              <option>Electric</option>
            </select>
          </div>
          <div>
            <label className="block mb-1 text-[12px] font-medium text-[#6B7280]">Transmission</label>
            <select
              value={vehicle.transmission ?? ""}
              onChange={(e) => setVehicle({ ...vehicle, transmission: e.target.value })}
              className="w-full px-3 bg-white"
              style={{ height: 44, borderRadius: 8, border: "0.5px solid #E2E6ED", color: "#1A1A2E", fontSize: 14, ...POPPINS }}
            >
              <option value="">Select…</option>
              <option>Manual</option>
              <option>Automatic</option>
            </select>
          </div>
          <Input
            label="Mileage"
            type="number"
            inputMode="numeric"
            value={vehicle.mileage ?? ""}
            onChange={(e) => setVehicle({ ...vehicle, mileage: e.target.value ? parseInt(e.target.value, 10) : null })}
          />
        </div>

        <div className="mt-4">
          <Button onClick={saveVehicle} disabled={savingVehicle} type="button">
            {savingVehicle ? "Saving…" : "Save vehicle"}
          </Button>
        </div>
      </div>

      {addOpen && userId && (
        <ReminderSheet
          title="ADD REMINDER"
          onClose={() => setAddOpen(false)}
          onSaved={() => {
            setAddOpen(false);
            loadAll(userId);
          }}
          onSubmit={async ({ type, due, notes }) => {
            const { error } = await supabase.from("vehicle_reminders").insert({
              instructor_id: userId,
              reminder_type: type,
              due_date: due || null,
              notes: notes || null,
            });
            if (error) {
              console.error("[vehicle] reminder insert error", error);
              toast.error("Couldn't add reminder");
              return false;
            }
            toast.success("Reminder added");
            return true;
          }}
        />
      )}

      {editing && userId && (
        <ReminderSheet
          title="EDIT REMINDER"
          initial={{
            type: editing.reminder_type as ReminderType,
            due: editing.due_date ?? "",
            notes: editing.notes ?? "",
          }}
          onClose={() => setEditing(null)}
          onDelete={async () => {
            const { error } = await supabase.from("vehicle_reminders").delete().eq("id", editing.id);
            if (error) {
              console.error("[vehicle] reminder delete error", error);
              toast.error("Couldn't delete");
              return;
            }
            toast.success("Reminder deleted");
            setEditing(null);
            loadAll(userId);
          }}
          onSaved={() => {
            setEditing(null);
            loadAll(userId);
          }}
          onSubmit={async ({ type, due, notes }) => {
            const { error } = await supabase
              .from("vehicle_reminders")
              .update({ reminder_type: type, due_date: due || null, notes: notes || null })
              .eq("id", editing.id);
            if (error) {
              console.error("[vehicle] reminder update error", error);
              toast.error("Couldn't save");
              return false;
            }
            toast.success("Reminder updated");
            return true;
          }}
        />
      )}
    </div>
  );
}

function ReminderSheet({
  title,
  initial,
  onClose,
  onSaved,
  onSubmit,
  onDelete,
}: {
  title: string;
  initial?: { type: ReminderType; due: string; notes: string };
  onClose: () => void;
  onSaved: () => void;
  onSubmit: (v: { type: ReminderType; due: string; notes: string }) => Promise<boolean>;
  onDelete?: () => void | Promise<void>;
}) {
  const [type, setType] = useState<ReminderType>(initial?.type ?? "MOT");
  const [due, setDue] = useState(initial?.due ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [saving, setSaving] = useState(false);

  async function save() {
    if (saving) return;
    setSaving(true);
    const ok = await onSubmit({ type, due, notes });
    setSaving(false);
    if (ok) onSaved();
  }

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

        <div className="px-4 pt-2 flex flex-col" style={{ gap: 12 }}>
          <div>
            <label className="block mb-1 text-[12px] font-medium text-[#6B7280]">Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as ReminderType)}
              className="w-full px-3 bg-white"
              style={{ height: 44, borderRadius: 8, border: "0.5px solid #E2E6ED", color: "#1A1A2E", fontSize: 14, ...POPPINS }}
            >
              {REMINDER_TYPES.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>

          <Input label="Due date" type="date" value={due} onChange={(e) => setDue(e.target.value)} />

          <div>
            <label className="block mb-1 text-[12px] font-medium text-[#6B7280]">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              maxLength={500}
              className="w-full px-3 py-2 bg-white"
              style={{
                borderRadius: 8,
                border: "0.5px solid #E2E6ED",
                color: "#1A1A2E",
                fontSize: 14,
                resize: "none",
                ...POPPINS,
              }}
            />
          </div>

          <div className="mt-2 grid grid-cols-2" style={{ gap: 8 }}>
            <Button variant="ghost" onClick={onClose} type="button">Cancel</Button>
            <Button onClick={save} disabled={saving} type="button">
              {saving ? "Saving…" : "Save"}
            </Button>
          </div>

          {onDelete && (
            <Button variant="destructive" onClick={onDelete} type="button">
              Delete reminder
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
