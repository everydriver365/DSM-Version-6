import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Plus, X, Fuel } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { Card } from "../components/dsm/Card";
import { Input } from "../components/dsm/Input";
import { Button } from "../components/dsm/Button";
import { SectionHeader } from "../components/dsm/SectionHeader";
import { supabase } from "../lib/supabaseClient";

export const Route = createFileRoute("/fuel")({
  head: () => ({
    meta: [{ title: "Fuel log — DSM by EveryDriver" }],
  }),
  component: FuelPage,
});

const POPPINS = { fontFamily: "Poppins, sans-serif" } as const;

interface Entry {
  id: string;
  fill_date: string;
  litres: number;
  pence_per_litre: number;
  total_cost: number;
  mileage_at_fill: number | null;
}

function formatShortDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

const entrySchema = z.object({
  fill_date: z.string().min(1, "Date required"),
  litres: z.number().positive("Litres must be > 0").max(999),
  pence_per_litre: z.number().positive("PPL must be > 0").max(999),
  mileage_at_fill: z.number().int().nonnegative().max(9999999).optional(),
});

function FuelPage() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [addOpen, setAddOpen] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (data.user) setUserId(data.user.id);
    })();
  }, []);

  async function load(uid: string) {
    const { data, error } = await supabase
      .from("fuel_log")
      .select("id, fill_date, litres, pence_per_litre, total_cost, mileage_at_fill")
      .eq("instructor_id", uid)
      .order("fill_date", { ascending: false });
    if (error) console.error("[fuel] fetch error", error);
    setEntries((data ?? []) as unknown as Entry[]);
  }

  useEffect(() => {
    if (userId) load(userId);
  }, [userId]);

  const stats = useMemo(() => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEntries = entries.filter((e) => new Date(e.fill_date) >= monthStart);
    const monthLitres = monthEntries.reduce((s, e) => s + Number(e.litres), 0);
    const monthCost = monthEntries.reduce((s, e) => s + Number(e.total_cost), 0);
    const totalCost = entries.reduce((s, e) => s + Number(e.total_cost), 0);

    // Avg MPG calculated between fills with mileage_at_fill
    const sorted = [...entries]
      .filter((e) => e.mileage_at_fill != null)
      .sort(
        (a, b) =>
          new Date(a.fill_date).getTime() - new Date(b.fill_date).getTime(),
      );
    let totalMiles = 0;
    let totalLitres = 0;
    for (let i = 1; i < sorted.length; i++) {
      const m = (sorted[i].mileage_at_fill ?? 0) - (sorted[i - 1].mileage_at_fill ?? 0);
      if (m > 0) {
        totalMiles += m;
        totalLitres += Number(sorted[i].litres);
      }
    }
    // MPG (UK gallon) = miles / (litres / 4.54609)
    const avgMpg =
      totalLitres > 0 ? totalMiles / (totalLitres / 4.54609) : 0;

    return { monthLitres, monthCost, totalCost, avgMpg };
  }, [entries]);

  return (
    <div className="min-h-screen bg-white pb-8" style={POPPINS}>
      {/* Top bar */}
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
        <div
          className="flex-1 text-center text-[15px] font-semibold text-white"
          style={POPPINS}
        >
          Fuel log
        </div>
        <button
          type="button"
          aria-label="Add entry"
          onClick={() => setAddOpen(true)}
          className="flex items-center justify-center"
          style={{ width: 40, height: 40 }}
        >
          <Plus size={22} color="#FFFFFF" />
        </button>
      </div>

      {/* Summary card */}
      <div
        className="mx-4 mt-3"
        style={{ backgroundColor: "#0F2044", borderRadius: 12, padding: 16 }}
      >
        <div className="grid grid-cols-2" style={{ gap: 12 }}>
          <div>
            <div
              className="text-[11px] tracking-wider font-semibold"
              style={{ color: "#9CA3AF" }}
            >
              THIS MONTH
            </div>
            <div className="text-white font-bold mt-1" style={{ fontSize: 24 }}>
              {stats.monthLitres.toFixed(1)}L
            </div>
          </div>
          <div className="text-right">
            <div
              className="text-[11px] tracking-wider font-semibold"
              style={{ color: "#9CA3AF" }}
            >
              THIS MONTH COST
            </div>
            <div className="font-bold mt-1" style={{ fontSize: 24, color: "#F59E0B" }}>
              £{stats.monthCost.toFixed(2)}
            </div>
          </div>
          <div>
            <div
              className="text-[11px] tracking-wider font-semibold"
              style={{ color: "#9CA3AF" }}
            >
              AVG MPG
            </div>
            <div className="text-white mt-1" style={{ fontSize: 18, fontWeight: 600 }}>
              {stats.avgMpg > 0 ? stats.avgMpg.toFixed(1) : "—"}
            </div>
          </div>
          <div className="text-right">
            <div
              className="text-[11px] tracking-wider font-semibold"
              style={{ color: "#9CA3AF" }}
            >
              TOTAL SPENT
            </div>
            <div className="mt-1" style={{ fontSize: 18, fontWeight: 600, color: "#F59E0B" }}>
              £{stats.totalCost.toFixed(2)}
            </div>
          </div>
        </div>
      </div>

      <div className="px-4">
        <SectionHeader>FUEL LOG</SectionHeader>
        {entries.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center text-[13px]"
            style={{ color: "#6B7280", padding: "32px 0" }}
          >
            <Fuel size={28} color="#6B7280" />
            <div className="mt-2">No fuel entries yet</div>
          </div>
        ) : (
          <div className="flex flex-col" style={{ gap: 8 }}>
            {entries.map((e) => (
              <Card key={e.id} className="bg-white">
                <div className="flex items-start" style={{ gap: 12 }}>
                  <div
                    className="flex items-center justify-center shrink-0"
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 18,
                      backgroundColor: "#1A52A014",
                    }}
                  >
                    <Fuel size={18} color="#1A52A0" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between" style={{ gap: 8 }}>
                      <div>
                        <div
                          className="text-[14px] font-bold"
                          style={{ color: "#0F2044" }}
                        >
                          {Number(e.litres).toFixed(2)}L
                        </div>
                        <div className="text-[12px]" style={{ color: "#6B7280" }}>
                          {formatShortDate(e.fill_date)}
                        </div>
                      </div>
                      <div
                        className="text-[14px] font-bold shrink-0 text-right"
                        style={{ color: "#CC2229" }}
                      >
                        £{Number(e.total_cost).toFixed(2)}
                      </div>
                    </div>
                    <div className="mt-1 flex items-center justify-between">
                      <span className="text-[13px]" style={{ color: "#6B7280" }}>
                        {Number(e.pence_per_litre).toFixed(1)}p/L
                      </span>
                      {e.mileage_at_fill != null && (
                        <span className="text-[12px]" style={{ color: "#6B7280" }}>
                          {Number(e.mileage_at_fill).toLocaleString()} mi
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {addOpen && userId && (
        <AddEntrySheet
          userId={userId}
          onClose={() => setAddOpen(false)}
          onAdded={() => {
            setAddOpen(false);
            load(userId);
          }}
        />
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
      style={POPPINS}
    >
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
          <span
            className="text-[11px] font-semibold tracking-wider"
            style={{ color: "#6B7280" }}
          >
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
        <div className="px-4 pt-2">{children}</div>
      </div>
    </div>
  );
}

function AddEntrySheet({
  userId,
  onClose,
  onAdded,
}: {
  userId: string;
  onClose: () => void;
  onAdded: () => void;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const [fillDate, setFillDate] = useState(today);
  const [litres, setLitres] = useState("");
  const [ppl, setPpl] = useState("");
  const [mileage, setMileage] = useState("");
  const [saving, setSaving] = useState(false);

  const totalCost =
    Number(litres || 0) > 0 && Number(ppl || 0) > 0
      ? (Number(litres) * Number(ppl)) / 100
      : 0;

  async function save() {
    if (saving) return;
    const parsed = entrySchema.safeParse({
      fill_date: fillDate,
      litres: Number(litres),
      pence_per_litre: Number(ppl),
      mileage_at_fill: mileage ? Number(mileage) : undefined,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Invalid input");
      return;
    }
    setSaving(true);
    const v = parsed.data;
    const { error } = await supabase.from("fuel_log").insert({
      instructor_id: userId,
      fill_date: v.fill_date,
      litres: v.litres,
      pence_per_litre: v.pence_per_litre,
      total_cost: Number(((v.litres * v.pence_per_litre) / 100).toFixed(2)),
      mileage_at_fill: v.mileage_at_fill ?? null,
    });
    setSaving(false);
    if (error) {
      console.error("[fuel] insert error", error);
      toast.error("Couldn't save entry");
      return;
    }
    toast.success("Fuel entry added");
    onAdded();
  }

  return (
    <SheetShell title="ADD FUEL ENTRY" onClose={onClose}>
      <div className="flex flex-col" style={{ gap: 12 }}>
        <Input
          label="Date"
          type="date"
          value={fillDate}
          onChange={(e) => setFillDate(e.target.value)}
        />
        <Input
          label="Litres"
          type="number"
          inputMode="decimal"
          step="0.01"
          min="0"
          value={litres}
          onChange={(e) => setLitres(e.target.value)}
          placeholder="e.g. 45.2"
        />
        <Input
          label="Pence per litre"
          type="number"
          inputMode="decimal"
          step="0.1"
          min="0"
          value={ppl}
          onChange={(e) => setPpl(e.target.value)}
          placeholder="e.g. 148.9"
        />
        <Input
          label="Mileage at fill"
          type="number"
          inputMode="numeric"
          step="1"
          min="0"
          value={mileage}
          onChange={(e) => setMileage(e.target.value)}
          placeholder="e.g. 48230"
        />
        <div
          className="flex items-center justify-between"
          style={{
            padding: 12,
            borderRadius: 8,
            backgroundColor: "#F8F9FB",
            border: "0.5px solid #E2E6ED",
          }}
        >
          <span className="text-[13px]" style={{ color: "#6B7280" }}>
            Total cost
          </span>
          <span className="text-[18px] font-bold" style={{ color: "#0F2044" }}>
            £{totalCost.toFixed(2)}
          </span>
        </div>
        <div className="mt-2 grid grid-cols-2" style={{ gap: 8 }}>
          <Button variant="ghost" onClick={onClose} type="button">
            Cancel
          </Button>
          <Button onClick={save} disabled={saving} type="button">
            {saving ? "Saving…" : "Save"}
          </Button>
        </div>
      </div>
    </SheetShell>
  );
}
