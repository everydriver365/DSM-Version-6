import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  X,
  Shield,
  FileText,
  Receipt,
  Wrench,
  Calendar,
  Circle,
  Gauge,
  Plus,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "../lib/supabaseClient";

export const Route = createFileRoute("/vehicle")({
  head: () => ({ meta: [{ title: "My vehicle — DSM by EveryDriver" }] }),
  component: VehiclePage,
});

const POPPINS = { fontFamily: "Inter, sans-serif" } as const;
const NAVY = "#0C2340";
const BORDER = "0.5px solid #EEF2F7";

type VehicleHealth = {
  id?: string;
  instructor_id?: string;
  mot_expiry: string | null;
  insurance_expiry: string | null;
  tax_expiry: string | null;
  last_service_date: string | null;
  next_service_due_date: string | null;
  next_service_due_miles: number | null;
  tyre_pressure_checked: string | null;
  current_odometer_miles: number | null;
};

const EMPTY: VehicleHealth = {
  mot_expiry: null,
  insurance_expiry: null,
  tax_expiry: null,
  last_service_date: null,
  next_service_due_date: null,
  next_service_due_miles: null,
  tyre_pressure_checked: null,
  current_odometer_miles: null,
};

type Journey = {
  id: string;
  trip_date: string | null;
  start_odometer: number | null;
  end_odometer: number | null;
  distance_miles: number | null;
  fuel_litres: number | null;
  fuel_cost: number | null;
  purpose: string | null;
};

type EditableDateField =
  | "mot_expiry"
  | "insurance_expiry"
  | "tax_expiry"
  | "last_service_date"
  | "next_service_due_date"
  | "tyre_pressure_checked";

const FIELD_LABEL: Record<EditableDateField, string> = {
  mot_expiry: "MOT expiry",
  insurance_expiry: "Insurance expiry",
  tax_expiry: "Road tax expiry",
  last_service_date: "Last service date",
  next_service_due_date: "Next service due date",
  tyre_pressure_checked: "Tyres last checked",
};

function daysUntil(ymd: string | null) {
  if (!ymd) return null;
  const t = new Date();
  t.setHours(0, 0, 0, 0);
  const d = new Date(`${ymd}T00:00:00`);
  return Math.round((d.getTime() - t.getTime()) / 86400000);
}

function daysSince(ymd: string | null) {
  const d = daysUntil(ymd);
  return d == null ? null : -d;
}

function fmtDate(ymd: string | null) {
  if (!ymd) return "—";
  return new Date(`${ymd}T00:00:00`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function expiryBadge(ymd: string | null) {
  const d = daysUntil(ymd);
  if (d == null) return { label: "Not set", bg: "#F3F4F6", fg: "#6B7280" };
  if (d < 0) return { label: "EXPIRED", bg: "#FEE2E2", fg: "#CC2229" };
  if (d <= 30) return { label: "Due soon", bg: "#FEF3C7", fg: "#B45309" };
  return { label: "Valid", bg: "#DCFCE7", fg: "#15803D" };
}

function todayYmd() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function VehiclePage() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [vh, setVh] = useState<VehicleHealth>(EMPTY);
  const [odo, setOdo] = useState<string>("");
  const [journeys, setJourneys] = useState<Journey[]>([]);
  const [editField, setEditField] = useState<EditableDateField | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (data.user) setUserId(data.user.id);
    })();
  }, []);

  async function loadAll(uid: string) {
    const { data: row } = await supabase
      .from("vehicle_health")
      .select("*")
      .eq("instructor_id", uid)
      .maybeSingle();
    if (!row) {
      const { data: created } = await supabase
        .from("vehicle_health")
        .insert({ instructor_id: uid })
        .select("*")
        .maybeSingle();
      const v = (created as VehicleHealth | null) ?? { ...EMPTY, instructor_id: uid };
      setVh(v);
      setOdo(v.current_odometer_miles != null ? String(v.current_odometer_miles) : "");
    } else {
      const v = row as VehicleHealth;
      setVh(v);
      setOdo(v.current_odometer_miles != null ? String(v.current_odometer_miles) : "");
    }

    const { data: j } = await supabase
      .from("mileage_log")
      .select("id, trip_date, start_odometer, end_odometer, distance_miles, fuel_litres, fuel_cost, purpose")
      .eq("instructor_id", uid)
      .order("trip_date", { ascending: false })
      .limit(10);
    setJourneys((j ?? []) as Journey[]);
  }

  useEffect(() => {
    if (userId) loadAll(userId);
  }, [userId]);

  const alerts = useMemo(() => {
    const items: string[] = [];
    const check = (label: string, ymd: string | null) => {
      const d = daysUntil(ymd);
      if (d != null && d <= 30) items.push(label);
    };
    check("MOT", vh.mot_expiry);
    check("Insurance", vh.insurance_expiry);
    check("Road tax", vh.tax_expiry);
    check("Service", vh.next_service_due_date);
    return items;
  }, [vh]);

  async function saveField(field: EditableDateField, value: string | null) {
    if (!userId) return;
    const patch = { [field]: value || null, updated_at: new Date().toISOString() };
    const { error } = await supabase.from("vehicle_health").update(patch).eq("instructor_id", userId);
    if (error) {
      toast.error("Couldn't save");
      return;
    }
    setVh({ ...vh, [field]: value || null });
    toast.success("Saved");
  }

  async function saveOdo() {
    if (!userId) return;
    const n = odo ? parseInt(odo, 10) : null;
    const { error } = await supabase
      .from("vehicle_health")
      .update({ current_odometer_miles: n, updated_at: new Date().toISOString() })
      .eq("instructor_id", userId);
    if (error) {
      toast.error("Couldn't save mileage");
      return;
    }
    setVh({ ...vh, current_odometer_miles: n });
    toast.success("Mileage updated");
  }

  return (
    <div className="min-h-screen bg-white pb-24" style={POPPINS}>
      {/* Top bar */}
      <div
        className="sticky top-0 z-40 flex items-center justify-between px-2"
        style={{ height: 52, backgroundColor: NAVY }}
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
        <div className="flex-1 text-center text-[15px] font-semibold text-white">My vehicle</div>
        <div style={{ width: 40, height: 40 }} />
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div
          className="mx-4 mt-3 flex items-start"
          style={{
            gap: 8,
            backgroundColor: "#FEE2E2",
            border: "0.5px solid #FECACA",
            borderRadius: 12,
            padding: "10px 12px",
          }}
        >
          <AlertTriangle size={16} color="#CC2229" />
          <div className="text-[13px]" style={{ color: "#991B1B" }}>
            <span className="font-semibold">{alerts.length} vehicle check{alerts.length === 1 ? "" : "s"} due soon</span>
            <span className="ml-1">— {alerts.join(", ")}</span>
          </div>
        </div>
      )}

      {/* Status cards grid */}
      <div
        className="grid"
        style={{ gridTemplateColumns: "1fr 1fr", gap: 8, padding: 16 }}
      >
        <StatusCard
          icon={<Shield size={16} color={NAVY} />}
          label="MOT"
          value={fmtDate(vh.mot_expiry)}
          badge={expiryBadge(vh.mot_expiry)}
          onClick={() => setEditField("mot_expiry")}
        />
        <StatusCard
          icon={<FileText size={16} color={NAVY} />}
          label="Insurance"
          value={fmtDate(vh.insurance_expiry)}
          badge={expiryBadge(vh.insurance_expiry)}
          onClick={() => setEditField("insurance_expiry")}
        />
        <StatusCard
          icon={<Receipt size={16} color={NAVY} />}
          label="Road tax"
          value={fmtDate(vh.tax_expiry)}
          badge={expiryBadge(vh.tax_expiry)}
          onClick={() => setEditField("tax_expiry")}
        />
        <StatusCard
          icon={<Wrench size={16} color={NAVY} />}
          label="Last service"
          value={fmtDate(vh.last_service_date)}
          subtle={(() => {
            const d = daysSince(vh.last_service_date);
            return d == null ? "—" : `${d} day${d === 1 ? "" : "s"} ago`;
          })()}
          onClick={() => setEditField("last_service_date")}
        />
        <StatusCard
          icon={<Calendar size={16} color={NAVY} />}
          label="Next service"
          value={
            vh.next_service_due_date
              ? fmtDate(vh.next_service_due_date)
              : vh.next_service_due_miles != null
                ? `${vh.next_service_due_miles.toLocaleString("en-GB")} mi`
                : "—"
          }
          badge={(() => {
            const d = daysUntil(vh.next_service_due_date);
            if (d != null && d <= 30)
              return { label: d < 0 ? "Overdue" : "Due soon", bg: "#FEF3C7", fg: "#B45309" };
            return undefined;
          })()}
          onClick={() => setEditField("next_service_due_date")}
        />
        <StatusCard
          icon={<Circle size={16} color={NAVY} />}
          label="Tyres"
          value={fmtDate(vh.tyre_pressure_checked)}
          subtle={(() => {
            const d = daysSince(vh.tyre_pressure_checked);
            return d == null ? "Not checked" : `Checked ${d} day${d === 1 ? "" : "s"} ago`;
          })()}
          onClick={() => setEditField("tyre_pressure_checked")}
        />
      </div>

      {/* Odometer */}
      <div
        className="mx-4"
        style={{ backgroundColor: "#FFFFFF", border: BORDER, borderRadius: 12, padding: 16 }}
      >
        <div className="flex items-center" style={{ gap: 8 }}>
          <Gauge size={18} color={NAVY} />
          <div className="text-[14px] font-semibold" style={{ color: NAVY }}>
            Current mileage
          </div>
        </div>
        <div className="flex items-center mt-3" style={{ gap: 8 }}>
          <input
            type="number"
            inputMode="numeric"
            value={odo}
            onChange={(e) => setOdo(e.target.value)}
            placeholder="0"
            className="flex-1 px-3 bg-white"
            style={{
              height: 48,
              borderRadius: 10,
              border: BORDER,
              color: NAVY,
              fontSize: 22,
              fontWeight: 700,
              ...POPPINS,
            }}
          />
          <div className="text-[13px]" style={{ color: "#6B7280" }}>
            miles
          </div>
        </div>
        <div className="grid grid-cols-2 mt-3" style={{ gap: 8 }}>
          <button
            type="button"
            onClick={saveOdo}
            className="text-white text-[13px] font-semibold"
            style={{ height: 40, borderRadius: 10, backgroundColor: NAVY }}
          >
            Update mileage
          </button>
          <button
            type="button"
            onClick={() => setAddOpen(true)}
            className="text-[13px] font-semibold"
            style={{ height: 40, borderRadius: 10, backgroundColor: "#FFFFFF", border: BORDER, color: NAVY }}
          >
            Log journey
          </button>
        </div>
      </div>

      {/* Mileage log */}
      <div
        className="mx-4 mt-3"
        style={{ backgroundColor: "#FFFFFF", border: BORDER, borderRadius: 12, padding: 16 }}
      >
        <div className="text-[14px] font-semibold mb-2" style={{ color: NAVY }}>
          Recent journeys
        </div>
        {journeys.length === 0 ? (
          <div className="text-[13px] text-center py-3" style={{ color: "#6B7280" }}>
            No journeys logged yet
          </div>
        ) : (
          <div className="flex flex-col" style={{ gap: 8 }}>
            {journeys.map((j) => (
              <div
                key={j.id}
                className="flex items-center justify-between"
                style={{ border: BORDER, borderRadius: 10, padding: "10px 12px" }}
              >
                <div className="min-w-0">
                  <div className="text-[13px] font-semibold" style={{ color: NAVY }}>
                    {fmtDate(j.trip_date)} · {j.distance_miles ?? 0} mi
                  </div>
                  <div className="text-[12px]" style={{ color: "#6B7280" }}>
                    {j.purpose ?? "—"}
                  </div>
                </div>
                {j.fuel_cost != null && (
                  <div className="text-[12px] font-semibold" style={{ color: "#16A34A" }}>
                    £{Number(j.fuel_cost).toFixed(2)}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* FAB */}
      <button
        type="button"
        aria-label="Add journey"
        onClick={() => setAddOpen(true)}
        className="fixed flex items-center justify-center text-white"
        style={{
          right: 20,
          bottom: 24,
          width: 56,
          height: 56,
          borderRadius: 999,
          backgroundColor: NAVY,
          boxShadow: "0 6px 16px rgba(15,32,68,0.25)",
        }}
      >
        <Plus size={24} color="#FFFFFF" />
      </button>

      {editField && (
        <EditFieldModal
          label={FIELD_LABEL[editField]}
          value={vh[editField] as string | null}
          onClose={() => setEditField(null)}
          onSave={async (v) => {
            await saveField(editField, v);
            setEditField(null);
          }}
        />
      )}

      {addOpen && userId && (
        <AddJourneyModal
          userId={userId}
          currentOdo={vh.current_odometer_miles}
          onClose={() => setAddOpen(false)}
          onSaved={() => {
            setAddOpen(false);
            loadAll(userId);
          }}
        />
      )}
    </div>
  );
}

function StatusCard({
  icon,
  label,
  value,
  badge,
  subtle,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  badge?: { label: string; bg: string; fg: string };
  subtle?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-left"
      style={{
        backgroundColor: "#FFFFFF",
        border: BORDER,
        borderRadius: 12,
        padding: 12,
      }}
    >
      <div className="flex items-center" style={{ gap: 6 }}>
        {icon}
        <div className="text-[12px] font-semibold" style={{ color: "#6B7280" }}>
          {label}
        </div>
      </div>
      <div className="text-[14px] font-semibold mt-1" style={{ color: NAVY }}>
        {value}
      </div>
      {badge ? (
        <div
          className="inline-block mt-2 text-[10px] font-semibold"
          style={{
            backgroundColor: badge.bg,
            color: badge.fg,
            padding: "2px 8px",
            borderRadius: 999,
          }}
        >
          {badge.label}
        </div>
      ) : subtle ? (
        <div className="text-[11px] mt-1" style={{ color: "#6B7280" }}>
          {subtle}
        </div>
      ) : null}
    </button>
  );
}

function EditFieldModal({
  label,
  value,
  onClose,
  onSave,
}: {
  label: string;
  value: string | null;
  onClose: () => void;
  onSave: (v: string | null) => Promise<void>;
}) {
  const [v, setV] = useState<string>(value ?? "");
  const [saving, setSaving] = useState(false);

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
        style={{ borderTopLeftRadius: 16, borderTopRightRadius: 16, paddingBottom: 24 }}
      >
        <div className="flex items-center justify-between px-4 pt-4">
          <span className="text-[11px] font-semibold tracking-wider" style={{ color: "#6B7280" }}>
            EDIT {label.toUpperCase()}
          </span>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            style={{ width: 32, height: 32 }}
            className="flex items-center justify-center"
          >
            <X size={18} color="#6B7280" />
          </button>
        </div>
        <div className="px-4 pt-2">
          <label className="block mb-1 text-[12px] font-medium text-[#6B7280]">{label}</label>
          <input
            type="date"
            value={v}
            onChange={(e) => setV(e.target.value)}
            className="w-full px-3 bg-white"
            style={{ height: 44, borderRadius: 8, border: BORDER, color: NAVY, fontSize: 14, ...POPPINS }}
          />
          <div className="grid grid-cols-2 mt-4" style={{ gap: 8 }}>
            <button
              type="button"
              onClick={onClose}
              className="text-[13px] font-semibold"
              style={{ height: 40, borderRadius: 10, backgroundColor: "#FFFFFF", border: BORDER, color: NAVY }}
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={async () => {
                setSaving(true);
                await onSave(v || null);
                setSaving(false);
              }}
              className="text-white text-[13px] font-semibold"
              style={{ height: 40, borderRadius: 10, backgroundColor: NAVY, opacity: saving ? 0.7 : 1 }}
            >
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function AddJourneyModal({
  userId,
  currentOdo,
  onClose,
  onSaved,
}: {
  userId: string;
  currentOdo: number | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [date, setDate] = useState(todayYmd());
  const [start, setStart] = useState<string>(currentOdo != null ? String(currentOdo) : "");
  const [end, setEnd] = useState<string>("");
  const [fuelL, setFuelL] = useState<string>("");
  const [fuelCost, setFuelCost] = useState<string>("");
  const [purpose, setPurpose] = useState<string>("Lessons");
  const [saving, setSaving] = useState(false);

  const distance = useMemo(() => {
    const s = parseInt(start, 10);
    const e = parseInt(end, 10);
    if (Number.isFinite(s) && Number.isFinite(e) && e >= s) return e - s;
    return 0;
  }, [start, end]);

  async function save() {
    if (saving) return;
    if (!distance) {
      toast.error("Enter start and end odometer");
      return;
    }
    setSaving(true);
    const endN = parseInt(end, 10);
    const startN = parseInt(start, 10);
    const { error } = await supabase.from("mileage_log").insert({
      instructor_id: userId,
      trip_date: date,
      start_odometer: Number.isFinite(startN) ? startN : null,
      end_odometer: Number.isFinite(endN) ? endN : null,
      distance_miles: distance,
      fuel_litres: fuelL ? parseFloat(fuelL) : null,
      fuel_cost: fuelCost ? parseFloat(fuelCost) : null,
      purpose,
    });
    if (error) {
      setSaving(false);
      toast.error("Couldn't save journey");
      return;
    }
    if (Number.isFinite(endN)) {
      await supabase
        .from("vehicle_health")
        .update({ current_odometer_miles: endN, updated_at: new Date().toISOString() })
        .eq("instructor_id", userId);
    }
    setSaving(false);
    toast.success("Journey logged");
    onSaved();
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
            ADD JOURNEY
          </span>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            style={{ width: 32, height: 32 }}
            className="flex items-center justify-center"
          >
            <X size={18} color="#6B7280" />
          </button>
        </div>
        <div className="px-4 pt-2 flex flex-col" style={{ gap: 12 }}>
          <Field label="Date">
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 bg-white"
              style={inputStyle}
            />
          </Field>
          <div className="grid grid-cols-2" style={{ gap: 8 }}>
            <Field label="Start (mi)">
              <input
                type="number"
                inputMode="numeric"
                value={start}
                onChange={(e) => setStart(e.target.value)}
                className="w-full px-3 bg-white"
                style={inputStyle}
              />
            </Field>
            <Field label="End (mi)">
              <input
                type="number"
                inputMode="numeric"
                value={end}
                onChange={(e) => setEnd(e.target.value)}
                className="w-full px-3 bg-white"
                style={inputStyle}
              />
            </Field>
          </div>
          <Field label="Distance (auto)">
            <input
              readOnly
              value={`${distance} mi`}
              className="w-full px-3"
              style={{ ...inputStyle, backgroundColor: "#F3F4F6" }}
            />
          </Field>
          <div className="grid grid-cols-2" style={{ gap: 8 }}>
            <Field label="Fuel (L)">
              <input
                type="number"
                inputMode="decimal"
                step="0.01"
                value={fuelL}
                onChange={(e) => setFuelL(e.target.value)}
                className="w-full px-3 bg-white"
                style={inputStyle}
              />
            </Field>
            <Field label="Fuel cost (£)">
              <input
                type="number"
                inputMode="decimal"
                step="0.01"
                value={fuelCost}
                onChange={(e) => setFuelCost(e.target.value)}
                className="w-full px-3 bg-white"
                style={inputStyle}
              />
            </Field>
          </div>
          <Field label="Purpose">
            <select
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              className="w-full px-3 bg-white"
              style={inputStyle}
            >
              <option>Lessons</option>
              <option>Training</option>
              <option>Other</option>
            </select>
          </Field>
          <div className="grid grid-cols-2 mt-2" style={{ gap: 8 }}>
            <button
              type="button"
              onClick={onClose}
              className="text-[13px] font-semibold"
              style={{ height: 40, borderRadius: 10, backgroundColor: "#FFFFFF", border: BORDER, color: NAVY }}
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={save}
              className="text-white text-[13px] font-semibold"
              style={{ height: 40, borderRadius: 10, backgroundColor: NAVY, opacity: saving ? 0.7 : 1 }}
            >
              {saving ? "Saving…" : "Save journey"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  height: 44,
  borderRadius: 8,
  border: BORDER,
  color: NAVY,
  fontSize: 14,
  ...POPPINS,
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block mb-1 text-[12px] font-medium text-[#6B7280]">{label}</label>
      {children}
    </div>
  );
}
