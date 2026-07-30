import { useEffect, useState } from "react";
import { toast } from "sonner";

import { BottomSheet, PrimaryButton } from "@/components/dsm/BottomSheetV2";
import { Input } from "@/components/dsm/Input";
import { supabase } from "@/lib/supabaseClient";

interface LogMileageSheetProps {
  open: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

function ymd(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function LogMileageSheet({ open, onClose, onSaved }: LogMileageSheetProps) {
  const [userId, setUserId] = useState<string | null>(null);
  const [tripDate, setTripDate] = useState(ymd(new Date()));
  const [miles, setMiles] = useState("");
  const [description, setDescription] = useState("");
  const [purpose, setPurpose] = useState<"business" | "personal">("business");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setUserId(data.user.id);
    });
    setTripDate(ymd(new Date()));
    setMiles("");
    setDescription("");
    setPurpose("business");
  }, [open]);

  if (!open) return null;

  const handleSave = async () => {
    if (!userId) {
      toast.error("Not signed in");
      return;
    }
    const m = parseFloat(miles);
    if (!miles || isNaN(m) || m <= 0) {
      toast.error("Please enter a valid mileage amount.");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("mileage_logs").insert({
      instructor_id: userId,
      trip_date: tripDate,
      description: description.trim() || null,
      miles: m,
      purpose,
    });
    setSaving(false);
    if (error) {
      console.error("[LogMileageSheet] insert error", error);
      toast.error(error.message);
      return;
    }
    toast.success("Mileage logged");
    onSaved?.();
    onClose();
  };

  return (
    <BottomSheet
      title="Log mileage"
      subtitle="Add a trip"
      onClose={onClose}
      footer={
        <PrimaryButton onClick={handleSave} disabled={saving || !userId}>
          {saving ? "Saving…" : "Log mileage"}
        </PrimaryButton>
      }
    >
      <div className="flex flex-col gap-3">
        <div>
          <label
            className="block mb-1 text-[12px] font-medium text-[#6B7280]"
            style={{ fontFamily: "Inter, sans-serif" }}
          >
            Date
          </label>
          <input
            type="date"
            value={tripDate}
            onChange={(e) => setTripDate(e.target.value)}
            className="h-11 w-full rounded-lg px-3 text-[14px] text-[#0B1F3A] bg-white focus:border-[#1877D6] focus:outline-none"
            style={{
              fontFamily: "Inter, sans-serif",
              borderWidth: "0.5px",
              borderStyle: "solid",
              borderColor: "#EEF2F7",
            }}
          />
        </div>

        <Input
          label="Miles"
          type="number"
          step="0.1"
          placeholder="0.0"
          value={miles}
          onChange={(e) => setMiles(e.target.value)}
        />

        <Input
          label="Description"
          placeholder="e.g. Lesson – DT1 1GW"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

        <div>
          <label
            className="block mb-1 text-[12px] font-medium text-[#6B7280]"
            style={{ fontFamily: "Inter, sans-serif" }}
          >
            Purpose
          </label>
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => setPurpose("business")}
              className="flex-1 h-10 rounded-md text-[13px] font-medium transition-colors"
              style={{
                backgroundColor: purpose === "business" ? "#0B1F3A" : "transparent",
                color: purpose === "business" ? "#FFFFFF" : "#6B7280",
                fontFamily: "Inter, sans-serif",
                borderWidth: purpose === "business" ? 0 : "0.5px",
                borderStyle: "solid",
                borderColor: "#EEF2F7",
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
                fontFamily: "Inter, sans-serif",
                borderWidth: purpose === "personal" ? 0 : "0.5px",
                borderStyle: "solid",
                borderColor: "#EEF2F7",
              }}
            >
              Personal
            </button>
          </div>
        </div>
      </div>
    </BottomSheet>
  );
}

export default LogMileageSheet;
