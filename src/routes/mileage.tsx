import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, Plus, Car, Trash2 } from "lucide-react";
import { Card } from "../components/dsm/Card";
import { SectionHeader } from "../components/dsm/SectionHeader";
import { Input } from "../components/dsm/Input";
import { Button } from "../components/dsm/Button";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { supabase } from "../lib/supabaseClient";

export const Route = createFileRoute("/mileage")({
  head: () => ({
    meta: [
      { title: "Mileage — DSM by EveryDriver" },
      { name: "description", content: "Track your driving mileage and tax relief." },
    ],
  }),
  component: MileagePage,
});

const POPPINS = { fontFamily: "Poppins, sans-serif" } as const;
const TAX_RATE = 0.45;

interface MileageRow {
  id: string;
  trip_date: string;
  description: string | null;
  miles: number;
  purpose: string;
}

function ymd(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatDateLabel(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function MileagePage() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [logs, setLogs] = useState<MileageRow[]>([]);
  const [showSheet, setShowSheet] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<MileageRow | null>(null);

  const [tripDate, setTripDate] = useState(ymd(new Date()));
  const [description, setDescription] = useState("");
  const [miles, setMiles] = useState("");
  const [purpose, setPurpose] = useState<"business" | "personal">("business");
  const [saving, setSaving] = useState(false);
  const [sheetError, setSheetError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (data.user) setUserId(data.user.id);
    })();
  }, []);

  const fetchLogs = async (uid: string) => {
    const { data, error } = await supabase
      .from("mileage_logs")
      .select("id, trip_date, description, miles, purpose")
      .eq("instructor_id", uid)
      .is("deleted_at", null)
      .order("trip_date", { ascending: false });
    if (error) console.error("[mileage] fetch error", error);
    setLogs((data ?? []) as unknown as MileageRow[]);
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    const id = pendingDelete.id;
    setPendingDelete(null);
    setLogs((prev) => prev.filter((r) => r.id !== id));
    const { error } = await supabase
      .from("mileage_logs")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id);
    if (error) {
      console.error("[mileage] delete error", error);
      if (userId) await fetchLogs(userId);
    }
  };

  useEffect(() => {
    if (!userId) return;
    fetchLogs(userId);
  }, [userId]);

  const now = useMemo(() => new Date(), []);
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  const monthMiles = useMemo(() => {
    return logs
      .filter((l) => {
        const d = new Date(l.trip_date + "T00:00:00");
        return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
      })
      .reduce((s, l) => s + Number(l.miles), 0);
  }, [logs, currentYear, currentMonth]);

  const yearMiles = useMemo(() => {
    return logs
      .filter((l) => {
        const d = new Date(l.trip_date + "T00:00:00");
        return d.getFullYear() === currentYear;
      })
      .reduce((s, l) => s + Number(l.miles), 0);
  }, [logs, currentYear]);

  const totalMiles = useMemo(() => logs.reduce((s, l) => s + Number(l.miles), 0), [logs]);
  const taxRelief = totalMiles * TAX_RATE;

  const openSheet = () => {
    setTripDate(ymd(new Date()));
    setDescription("");
    setMiles("");
    setPurpose("business");
    setSheetError(null);
    setShowSheet(true);
  };

  const saveEntry = async () => {
    if (!userId) return;
    const m = parseFloat(miles);
    if (!miles || isNaN(m) || m <= 0) {
      setSheetError("Please enter a valid mileage amount.");
      return;
    }
    setSaving(true);
    setSheetError(null);
    const { error } = await supabase.from("mileage_logs").insert({
      instructor_id: userId,
      trip_date: tripDate,
      description: description.trim() || null,
      miles: m,
      purpose,
    });
    setSaving(false);
    if (error) {
      console.error("[mileage] insert error", error);
      setSheetError(error.message);
      return;
    }
    setShowSheet(false);
    await fetchLogs(userId);
  };

  return (
    <div className="min-h-screen bg-white pb-8" style={POPPINS}>
      {/* TOP BAR */}
      <div
        className="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] h-[52px] flex items-center px-3 z-50"
        style={{ background: "#072b47" }}
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
          Mileage
        </div>
        <button
          type="button"
          onClick={openSheet}
          className="ml-auto p-1"
          aria-label="Add mileage"
        >
          <Plus size={24} color="#FFFFFF" />
        </button>
      </div>

      <div className="pt-[52px]">
        {/* SUMMARY CARD */}
        <div
          className="mx-4 mt-3"
          style={{ backgroundColor: "#0F2044", borderRadius: 12, padding: 16 }}
        >
          <div className="flex">
            <div className="flex-1 pr-3">
              <div
                className="text-[10px] uppercase font-medium"
                style={{ color: "#9CA3AF", letterSpacing: "0.08em" }}
              >
                THIS MONTH
              </div>
              <div className="text-white text-[24px] font-bold mt-1">
                {monthMiles.toFixed(1)} mi
              </div>
            </div>
            <div style={{ width: "0.5px", backgroundColor: "rgba(255,255,255,0.2)" }} />
            <div className="flex-1 pl-3">
              <div
                className="text-[10px] uppercase font-medium"
                style={{ color: "#9CA3AF", letterSpacing: "0.08em" }}
              >
                THIS YEAR
              </div>
              <div className="text-white text-[24px] font-bold mt-1">
                {yearMiles.toFixed(1)} mi
              </div>
            </div>
          </div>
          <div
            className="mt-3 pt-3"
            style={{ borderTopWidth: "0.5px", borderTopStyle: "solid", borderTopColor: "rgba(255,255,255,0.2)" }}
          >
            <div
              className="text-[10px] uppercase font-medium"
              style={{ color: "#9CA3AF", letterSpacing: "0.08em" }}
            >
              EST. TAX RELIEF
            </div>
            <div className="text-[#F59E0B] text-[24px] font-bold mt-1">
              £{taxRelief.toFixed(2)}
            </div>
          </div>
        </div>

        {/* MILEAGE LOG */}
        <div className="mx-4">
          <SectionHeader>MILEAGE LOG</SectionHeader>
          {logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Car size={40} color="#6B7280" />
              <div className="mt-3 text-[13px] text-[#6B7280]">No mileage recorded</div>
            </div>
          ) : (
            <div className="flex flex-col" style={{ gap: 8 }}>
              {logs.map((log) => (
                <Card key={log.id} className="!py-3 !px-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[13px] text-[#6B7280]">
                      {formatDateLabel(log.trip_date)}
                    </span>
                    <div className="flex items-center" style={{ gap: 8 }}>
                      <span className="text-[14px] font-bold text-[#0F2044]">
                        {Number(log.miles).toFixed(1)} mi
                      </span>
                      <button
                        type="button"
                        onClick={() => setPendingDelete(log)}
                        aria-label="Delete entry"
                        className="flex items-center justify-center"
                        style={{ width: 24, height: 24 }}
                      >
                        <Trash2 size={14} color="#CC2229" />
                      </button>
                    </div>
                  </div>
                  <div className="mt-1 flex items-center justify-between">
                    <span className="text-[14px] font-semibold text-[#0F2044]">
                      {log.description || "Trip"}
                    </span>
                    <span
                      className="text-[10px] uppercase font-medium px-2 py-0.5 rounded-full"
                      style={{
                        color: log.purpose === "business" ? "#FFFFFF" : "#FFFFFF",
                        backgroundColor: log.purpose === "business" ? "#1A52A0" : "#6B7280",
                        letterSpacing: "0.05em",
                      }}
                    >
                      {log.purpose === "business" ? "Business" : "Personal"}
                    </span>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ADD ENTRY SHEET */}
      {showSheet && (
        <div className="fixed inset-0 z-[60] flex flex-col justify-end">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setShowSheet(false)}
          />
          <div
            className="relative w-full max-w-[430px] mx-auto bg-white rounded-t-2xl px-4 pt-5 pb-8"
            style={{
              animation: "slideUp 0.25s ease-out",
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="text-[16px] font-semibold text-[#0F2044]">Add mileage</div>
              <button
                type="button"
                onClick={() => setShowSheet(false)}
                className="text-[13px] text-[#6B7280]"
              >
                Cancel
              </button>
            </div>

            <div className="flex flex-col" style={{ gap: 12 }}>
              <div>
                <label
                  className="block mb-1 text-[12px] font-medium text-[#6B7280]"
                  style={{ fontFamily: "Poppins, sans-serif" }}
                >
                  Date
                </label>
                <input
                  type="date"
                  value={tripDate}
                  onChange={(e) => setTripDate(e.target.value)}
                  className="h-11 w-full rounded-lg px-3 text-[14px] text-[#0F2044] bg-white focus:border-[#1A52A0] focus:outline-none"
                  style={{
                    fontFamily: "Poppins, sans-serif",
                    borderWidth: "0.5px",
                    borderStyle: "solid",
                    borderColor: "#E2E6ED",
                  }}
                />
              </div>

              <Input
                label="Description"
                placeholder="e.g. Lesson – DT1 1GW"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />

              <Input
                label="Miles"
                type="number"
                step="0.1"
                placeholder="0.0"
                value={miles}
                onChange={(e) => setMiles(e.target.value)}
              />

              <div>
                <label
                  className="block mb-1 text-[12px] font-medium text-[#6B7280]"
                  style={{ fontFamily: "Poppins, sans-serif" }}
                >
                  Purpose
                </label>
                <div className="flex" style={{ gap: 4 }}>
                  <button
                    type="button"
                    onClick={() => setPurpose("business")}
                    className="flex-1 h-10 rounded-md text-[13px] font-medium transition-colors"
                    style={{
                      backgroundColor: purpose === "business" ? "#1A52A0" : "transparent",
                      color: purpose === "business" ? "#FFFFFF" : "#6B7280",
                      fontFamily: "Poppins, sans-serif",
                      borderWidth: purpose === "business" ? 0 : "0.5px",
                      borderStyle: "solid",
                      borderColor: "#E2E6ED",
                    }}
                  >
                    Business
                  </button>
                  <button
                    type="button"
                    onClick={() => setPurpose("personal")}
                    className="flex-1 h-10 rounded-md text-[13px] font-medium transition-colors"
                    style={{
                      backgroundColor: purpose === "personal" ? "#6B7280" : "transparent",
                      color: purpose === "personal" ? "#FFFFFF" : "#6B7280",
                      fontFamily: "Poppins, sans-serif",
                      borderWidth: purpose === "personal" ? 0 : "0.5px",
                      borderStyle: "solid",
                      borderColor: "#E2E6ED",
                    }}
                  >
                    Personal
                  </button>
                </div>
              </div>

              {sheetError && (
                <div className="text-[12px]" style={{ color: "#CC2229" }}>
                  {sheetError}
                </div>
              )}

              <Button onClick={saveEntry} disabled={saving || !userId}>
                {saving ? "Saving…" : "Save entry"}
              </Button>
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

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Delete this entry?"
        confirmLabel="Delete"
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
